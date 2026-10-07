/* =========================================================
   PARTIDA: estado, olas, héroes, fusión, bendiciones,
   entrada, bucle principal y guardado entre olas
   ========================================================= */
var START_MANA = 55;
var START_LIVES = 16;
var PASSIVE_MANA_PER_SEC = 4;
var TWO_LANE_ENEMY_MULT = 1.4;
var POWER_COSTS = [0, 60, 130, 230, 360];
var BASE_MAX_MANA = 200;
var MAX_MANA_PER_LEVEL = 40;
// El maná que no cabe no se pierde: carga la habilidad del héroe.
var OVERFLOW_MANA_PER_HERO = 120;
var TD_SAVE_KEY = 'rushRoyaleRogue_save_v2';
var gameSpeed = 1;

function freshMods() {
  return { dmg: 1, speed: 1, range: 1, manaKill: 0, regen: 0, cost: 1, crit: 0, bossDmg: 1, interest: 0, slow: 0, dot: 1, execute: 0, heroCd: 1, chain: 0, splash: 1, phoenix: false, manaMult: 1, typeDmg: {} };
}
function newGameState() {
  return {
    mode: 'classic', opts: {}, level: 1, maxLevel: 8, wave: 1, maxWaves: 3,
    lives: START_LIVES, startLives: START_LIVES, mana: START_MANA, maxMana: BASE_MAX_MANA, manaFullTime: 0,
    hero: 'aria', heroCharge: 0, deck: STARTER_TOWERS.slice(), cardLevels: {}, boons: [], rerolls: 1, phoenixUsed: false,
    mods: freshMods(), enemyMods: { hp: 1, speed: 1, armor: 0, count: 1 }, dailyMod: null,
    fusion: false, typePower: {}, summonCost: 20,
    towers: [], enemies: [], particles: [], shots: [], projectiles: [], rings: [], texts: [],
    isWaveActive: false, spawnQueue: [], spawnAccum: 0, spawnInterval: 0.8,
    selectedTower: null, selectedPlaced: null,
    ended: false, paused: false, time: 0, shake: 0,
    kills: 0, bossKills: 0, damageDealt: 0, wavesCleared: 0,
    overchargeUntil: 0, pendingBoon: false, cfgIndex: 0, stage: null, autoTimer: 0,
    runId: ++RUN_SEQ
  };
}
var game = newGameState();
var RUN_SEQ = 0;
// Los temporizadores de fin de partida solo actúan sobre la partida que los creó.
function laterForRun(fn, ms) {
  var id = game.runId;
  setTimeout(function () { if (game.runId === id) fn(); }, ms);
}

function recomputeMods() {
  var m = freshMods();
  m.crit += metaUpgradeLevel('crit') * 0.02;
  m.heroCd *= 1 - metaUpgradeLevel('hero') * 0.05;
  if (game.hero === 'volt') m.speed *= 1.08;
  if (game.hero === 'leon') m.bossDmg *= 1.2;
  if (game.hero === 'morga') m.manaKill += 1;
  var dm = game.dailyMod;
  if (dm === 'escaso') m.manaMult *= 0.7;
  if (dm === 'gigantes') m.manaMult *= 2;
  if (dm === 'cristal') m.dmg *= 1.4;
  if (dm === 'heroico') m.heroCd *= 0.5;
  game.boons.forEach(function (id) { var b = getBoonDef(id); if (b && b.apply) b.apply(m); });
  game.mods = m;
}

/* ---------- dificultad ---------- */
function updateCfgIndex() {
  if (game.mode === 'survival') game.cfgIndex = Math.min(7, Math.floor((game.wave - 1) / 3));
  else if (game.mode === 'bossrush') game.cfgIndex = Math.min(7, game.wave);
  else if (game.mode === 'expedition' && game.stage) game.cfgIndex = game.stage.cfgIndex;
  else game.cfgIndex = clamp(game.level - 1, 0, 7);
}
function currentCfg() { return LEVEL_CONFIGS[clamp(game.cfgIndex, 0, 7)]; }
function hpScale() {
  var s = game.enemyMods.hp;
  if (game.mode === 'survival') {
    s *= 1 + ((game.wave - 1) % 3) * 0.08;
    if (game.wave > 24) s *= Math.pow(1.14, game.wave - 24);
  } else if (game.mode === 'bossrush') {
    s *= 1;
  } else {
    s *= 1 + (game.wave - 1) * 0.03;
  }
  if (game.stage && game.stage.hpMult) s *= game.stage.hpMult;
  return s;
}
function gainMana(n) {
  var room = Math.max(0, game.maxMana - game.mana);
  if (n <= room) { game.mana += n; return; }
  game.mana = game.maxMana;
  var extra = n - room;
  if (game.heroCharge < 1) game.heroCharge = Math.min(1, game.heroCharge + extra / OVERFLOW_MANA_PER_HERO);
}
function manaIsFull() { return game.mana >= game.maxMana - 0.5; }

function isBossWave() {
  if (game.mode === 'survival') return game.wave % 5 === 0;
  if (game.mode === 'bossrush') return true;
  if (game.mode === 'expedition') return !!(game.stage && game.stage.bossKind) && game.wave === game.maxWaves;
  return game.wave === game.maxWaves;
}
function bossKindForWave() {
  if (game.mode === 'survival') return BOSS_ORDER[(Math.floor(game.wave / 5) - 1) % BOSS_ORDER.length];
  if (game.mode === 'bossrush') return BOSS_ORDER[(game.wave - 1) % BOSS_ORDER.length];
  if (game.mode === 'expedition') return game.stage.bossKind;
  return LEVEL_BOSS[clamp(game.level - 1, 0, 7)];
}

/* ---------- olas ---------- */
function buildSpawnQueue() {
  var cfg = currentCfg();
  var laneMult = grid.lanes.length > 1 ? TWO_LANE_ENEMY_MULT : 1;
  var n = Math.round(cfg.enemies * laneMult * game.enemyMods.count);
  if (game.mode === 'bossrush') n = Math.round(n * 0.45);
  if (game.mode === 'survival') n = Math.round(n * (1 + Math.min(0.6, game.wave * 0.012)));
  var mix = cfg.mix;
  if (game.mode === 'survival' && game.wave > 24) mix = ['goblin', 'brute', 'bat', 'healer', 'shade', 'rusher', 'golem'];
  var q = [];
  for (var i = 1; i <= n; i++) q.push({ type: pickOne(mix), elite: i % ELITE_EVERY === 0 });
  if (game.stage && game.stage.kind === 'elite' && game.wave === game.maxWaves) {
    for (var e = 0; e < 3; e++) q.push({ type: pickOne(mix), elite: true });
  }
  if (isBossWave()) {
    var pos = game.mode === 'bossrush' ? Math.min(2, q.length) : q.length;
    q.splice(pos, 0, { type: 'boss', bossKind: bossKindForWave() });
  }
  return q;
}
function spawnFromSpec(spec) {
  var cfg = currentCfg(), sc = hpScale();
  var lane = Math.floor(Math.random() * grid.lanes.length);
  var hp, speed;
  if (spec.type === 'boss') {
    var b = BOSS_TYPES[spec.bossKind];
    hp = cfg.health * b.hpMult * sc * (game.stage && game.stage.bossHp ? game.stage.bossHp : 1);
    speed = cfg.speed * b.speedMult * game.enemyMods.speed;
  } else {
    var d = ENEMY_TYPES[spec.type];
    hp = cfg.health * d.healthMult * sc * (spec.elite ? ELITE_HEALTH_MULT : 1);
    speed = cfg.speed * d.speedMult * (spec.elite ? ELITE_SPEED_MULT : 1) * game.enemyMods.speed;
  }
  var en = new Enemy({ type: spec.type, lane: lane, elite: spec.elite, bossKind: spec.bossKind, hp: hp, speed: speed });
  game.enemies.push(en);
  if (en.isBoss) {
    sfxBossSpawn();
    shake(8);
    showBigBanner(en.boss.name, en.boss.desc);
    $('bossName').textContent = '👑 ' + en.boss.name;
  }
}
function startWave() {
  if (game.isWaveActive || game.ended || game.pendingBoon) return;
  actx();
  game.isWaveActive = true;
  game.selectedPlaced = null;
  game.autoTimer = 0;
  updateCfgIndex();
  game.spawnQueue = buildSpawnQueue();
  var cfg = currentCfg();
  game.spawnInterval = cfg.spawnMs / 1000 * (game.mode === 'bossrush' ? 1.4 : 1) / (game.enemyMods.count > 1 ? 1.2 : 1);
  game.spawnAccum = game.spawnInterval;
  $('startBtn').disabled = true;
  sfxWaveStart();
  showToast(waveTitle());
  refreshPanel();
}
function waveTitle() {
  if (game.mode === 'survival') return 'Ola ' + game.wave + (isBossWave() ? ' · ¡Jefe!' : '');
  if (game.mode === 'bossrush') return 'Jefe ' + game.wave + ' de ' + game.maxWaves;
  return 'Ola ' + game.wave + ' de ' + game.maxWaves + (isBossWave() ? ' · ¡Jefe!' : '');
}

function killEnemy(e, tower) {
  if (e.dead) return;
  e.dead = true;
  e.health = 0;
  if (tower) tower.kills++;
  game.kills++;
  var cfg = currentCfg();
  var reward = cfg.reward * (e.isBoss ? 6 : e.isElite ? 2 : 1) * (e.typeId === 'skeleton' ? 0.3 : 1);
  reward = reward * game.mods.manaMult + game.mods.manaKill;
  gainMana(reward);
  spawnParticles(e.x, e.y, e.isBoss ? e.boss.color : e.def.color, e.isBoss ? 34 : e.isElite ? 16 : 9, e.isBoss ? 180 : 110);
  if (e.isBoss) {
    game.bossKills++;
    shake(12);
    spawnRing(e.x, e.y, e.boss.color, grid.tileSize * 2.5, 0.6);
    spawnText(e.x, e.y - grid.tileSize * 0.6, '+' + Math.round(reward) + ' 💧', '#4ecdc4', true);
    sfxDeath(true);
    if (e.boss.ability === 'split') {
      for (var i = 0; i < 6; i++) {
        game.enemies.push(new Enemy({ type: 'slime', lane: e.laneIndex, hp: cfg.health * 1.3 * hpScale(), speed: cfg.speed * 1.15 * game.enemyMods.speed, progress: Math.max(0, e.progress - i * 0.25) }));
      }
      spawnText(e.x, e.y, '¡Se divide!', '#3ea6ff', true);
    }
  } else {
    if (e.isElite) spawnText(e.x, e.y - grid.tileSize * 0.4, '+' + Math.round(reward) + ' 💧', '#4ecdc4');
    sfxDeath(false);
  }
}

function onWaveCleared() {
  game.isWaveActive = false;
  game.wavesCleared++;
  game.projectiles = [];
  if (game.mods.interest > 0) {
    var gain = Math.round(game.mana * game.mods.interest);
    if (gain > 0) { gainMana(gain); showToast('Interés: +' + gain + ' 💧'); }
  }
  $('startBtn').disabled = false;
  if (game.mode === 'survival') {
    maxStat('bestSurvival', game.wave);
    game.wave++;
    updateCfgIndex();
    if ((game.wave - 1) % 5 === 0) {
      setGridBiome(LEVEL_BIOME[Math.floor((game.wave - 1) / 5) % LEVEL_BIOME.length]);
      showBigBanner('¡Ola ' + game.wave + '!');
      sfxLevelUp();
      offerRunBoon(game.wave > 20 ? 'elite' : null);
    }
  } else if (game.mode === 'bossrush') {
    if (game.wave >= game.maxWaves) { winRun(); return; }
    game.wave++;
    updateCfgIndex();
    sfxLevelUp();
    offerRunBoon('elite');
  } else if (game.wave < game.maxWaves) {
    game.wave++;
  } else {
    levelCleared();
    return;
  }
  saveRun();
  refreshPanel();
}
function levelCleared() {
  if (game.mode === 'adventure') { winRun(); return; }
  if (game.mode === 'expedition') { expeditionStageWon(); return; }
  if (game.level >= game.maxLevel) { winRun(); return; }
  game.level++;
  game.wave = 1;
  game.maxMana += MAX_MANA_PER_LEVEL;
  updateCfgIndex();
  if (game.hero === 'sylva') { game.lives += 1; showToast('Sylva: +1 vida'); }
  setGridBiome(LEVEL_BIOME[(game.level - 1) % LEVEL_BIOME.length]);
  var newBats = currentCfg().mix.indexOf('bat') !== -1 && LEVEL_CONFIGS[game.level - 2].mix.indexOf('bat') === -1;
  showBigBanner('¡Nivel ' + game.level + '!', newBats ? '¡Llegan los voladores! Solo las torres antiaéreas les dan' : BIOMES[grid.biome].name);
  sfxLevelUp();
  offerRunBoon(null);
  saveRun();
  refreshPanel();
}
function winRun() {
  game.isWaveActive = false;
  showBigBanner('¡VICTORIA!');
  sfxLevelUp();
  game.ended = true;
  laterForRun(function () { endRun(true); }, 1300);
}
function loseRun() {
  game.lives = 0;
  game.ended = true;
  game.isWaveActive = false;
  game.spawnQueue = [];
  showBigBanner('DERROTA');
  sfxGameOver();
  laterForRun(function () { endRun(false); }, 1300);
}

/* ---------- bendiciones ---------- */
function rollBoonChoices(owned, deck, bias) {
  var w = bias === 'elite' ? [['comun', 25], ['rara', 50], ['epica', 25]]
        : bias === 'epic' ? [['rara', 30], ['epica', 70]]
        : [['comun', 58], ['rara', 32], ['epica', 10]];
  var pool = Object.keys(BOONS).filter(function (id) { return !(BOONS[id].unique && owned.indexOf(id) !== -1); });
  deck.forEach(function (t) { if (!TOWER_TYPES[t].support) pool.push('esp_' + t); });
  var out = [];
  for (var tries = 0; out.length < 3 && tries < 60; tries++) {
    var r = weightedPick(w);
    var cands = pool.filter(function (id) { return getBoonDef(id).rarity === r && out.indexOf(id) === -1; });
    if (!cands.length) cands = pool.filter(function (id) { return out.indexOf(id) === -1; });
    if (!cands.length) break;
    out.push(pickOne(cands));
  }
  return out;
}
// holder: objeto con .boons y .rerolls (la partida o la expedición)
function showBoonPick(opts) {
  var holder = opts.holder;
  var choices = rollBoonChoices(holder.boons, holder.deck, opts.bias);
  var ov = $('boonOverlay');
  function render() {
    ov.innerHTML =
      '<div class="boon-wrap">' +
      '<h2>' + escapeHtml(opts.title || 'Elige una bendición') + '</h2>' +
      '<p class="menu-hint">' + escapeHtml(opts.sub || 'Se aplica durante el resto de la partida.') + '</p>' +
      '<div class="boon-list">' +
      choices.map(function (id, i) {
        var b = getBoonDef(id);
        var rr = RARITY[b.rarity];
        return '<button class="boon-card r-' + b.rarity + '" style="--rc:' + rr.color + ';animation-delay:' + (i * 0.08) + 's" data-boon="' + id + '">' +
          '<span class="boon-icon">' + b.icon + '</span>' +
          '<span class="boon-rarity">' + rr.name + '</span>' +
          '<strong>' + escapeHtml(b.name) + '</strong>' +
          '<span class="boon-desc">' + escapeHtml(b.desc) + '</span></button>';
      }).join('') +
      '</div>' +
      (holder.rerolls > 0 ? '<button class="ghost-btn" id="boonReroll">🎲 Cambiar opciones · quedan ' + holder.rerolls + '</button>' : '') +
      '</div>';
    ov.hidden = false;
    Array.prototype.forEach.call(ov.querySelectorAll('.boon-card'), function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-boon');
        holder.boons.push(id);
        var b = getBoonDef(id);
        ov.hidden = true;
        sfxBuy();
        showToast(b.icon + ' ' + b.name);
        if (opts.onPick) opts.onPick(id);
      };
    });
    var rb = $('boonReroll');
    if (rb) rb.onclick = function () {
      holder.rerolls--;
      choices = rollBoonChoices(holder.boons, holder.deck, opts.bias);
      sfxCard('rara');
      render();
    };
  }
  render();
}
function offerRunBoon(bias) {
  game.pendingBoon = true;
  game.pendingBias = bias;
  showBoonPick({
    holder: game, bias: bias,
    onPick: function (id) {
      var b = getBoonDef(id);
      if (b.instant) b.instant();
      recomputeMods();
      game.towers.forEach(applyTowerStats);
      game.pendingBoon = false;
      saveRun();
      refreshPanel();
    }
  });
}

/* ---------- héroe ---------- */
function heroCooldown() { return HEROES[game.hero].ability.cd * game.mods.heroCd; }
function useHero() {
  if (game.ended || game.paused) return;
  if (!game.isWaveActive) { showToast('Úsala durante una ola'); return; }
  if (game.heroCharge < 1) { showToast('Aún se está cargando'); sfxBlocked(); return; }
  var h = HEROES[game.hero];
  game.heroCharge = 0;
  sfxHero();
  shake(7);
  flashScreen(h.color);
  showBigBanner(h.ability.icon + ' ' + h.ability.name);
  var ts = grid.tileSize, cx = grid.offsetX + ts * grid.cols / 2, cy = grid.offsetY + ts * grid.rows / 2;
  spawnRing(cx, cy, h.color, ts * 6, 0.7);
  var cfg = currentCfg();
  var alive = game.enemies.filter(function (e) { return !e.dead; });
  if (game.hero === 'aria') {
    alive.forEach(function (e) { e.applyStun(3); spawnParticles(e.x, e.y, '#e6f8ff', 5, 60); });
  } else if (game.hero === 'brann') {
    var sorted = alive.slice().sort(function (a, b) { return b.progress - a.progress; });
    for (var i = 0; i < 6 && sorted.length; i++) {
      var t = sorted[i % sorted.length];
      (function (tx, ty, delay) {
        laterForRun(function () {
          if (game.ended) return;
          spawnRing(tx, ty, '#ff8f3c', ts * 1.2, 0.35);
          spawnParticles(tx, ty, '#ffb020', 16, 160);
          shake(4);
          game.enemies.slice().forEach(function (e) {
            if (!e.dead && Math.hypot(e.x - tx, e.y - ty) < ts * 1.2) {
              e.takeDamage(cfg.health * hpScale() * 1.8 * (e.isBoss ? 0.25 : 1), null, { show: true, color: '#ffb020' });
            }
          });
        }, delay);
      })(t.x, t.y, i * 120 / gameSpeed);
    }
  } else if (game.hero === 'sylva') {
    alive.forEach(function (e) { e.applyStun(3.5); spawnParticles(e.x, e.y, '#5fd38a', 5, 50); });
    game.lives += 2;
    showToast('+2 vidas');
  } else if (game.hero === 'volt') {
    game.overchargeUntil = game.time + 6;
  } else if (game.hero === 'morga') {
    alive.forEach(function (e) {
      if (e.isBoss) e.rawDamage(e.maxHealth * 0.08);
      else if (e.health / e.maxHealth < 0.3) { spawnText(e.x, e.y - 10, '💀', '#b06bff'); e.rawDamage(e.health + 1); }
    });
  } else if (game.hero === 'leon') {
    alive.forEach(function (e) {
      spawnParticles(e.x, e.y, '#ffd166', 6, 70);
      var d = e.maxHealth * (e.isBoss ? 0.10 : 0.20);
      spawnText(e.x, e.y - 12, fmt(d), '#ffd166');
      e.rawDamage(d);
    });
  }
}
function flashScreen(color) {
  var f = $('flash');
  if (!f) return;
  f.style.background = 'radial-gradient(circle, ' + hexA(color, 0.0) + ' 20%, ' + hexA(color, 0.45) + ')';
  f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
}

/* ---------- fusión ---------- */
function freeTiles() {
  var out = [];
  for (var r = 0; r < grid.rows; r++) for (var c = 0; c < grid.cols; c++) if (isBuildable(c, r) && !towerAt(c, r)) out.push({ col: c, row: r });
  return out;
}
function pathNeighbors(c, r) {
  var n = 0;
  for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) if (grid.pathSet[key(c + dc, r + dr)]) n++;
  return n;
}
function summonTower() {
  if (game.ended) return;
  var cost = game.summonCost;
  if (game.mana < cost) { showToast('Necesitas ' + cost + ' 💧'); sfxBlocked(); return; }
  var tiles = freeTiles();
  if (!tiles.length) { showToast('No queda sitio. Fusiona torres'); return; }
  // Primero las casillas pegadas al camino, que son las que llegan a disparar.
  var near = tiles.filter(function (t) { return pathNeighbors(t.col, t.row) > 0; });
  var tile = pickOne(near.length ? near : tiles);
  game.mana -= cost;
  game.summonCost += 8;
  var t = new Tower(tile.col, tile.row, pickOne(game.deck), 1);
  game.towers.push(t);
  spawnRing(t.x, t.y, t.def.color2, grid.tileSize * 0.8, 0.3);
  sfxPlace();
  saveRun();
}
function canMerge(a, b) { return a && b && a !== b && a.type === b.type && a.level === b.level && a.level < FUSION_MAX_RANK; }
function mergeTowers(a, b) {
  if (!canMerge(a, b)) { showToast('Solo se fusionan dos torres iguales del mismo rango'); sfxBlocked(); return false; }
  game.towers = game.towers.filter(function (t) { return t !== a; });
  var nt = pickOne(game.deck);
  b.type = nt; b.def = TOWER_TYPES[nt]; b.color = b.def.color;
  b.level++;
  b.spawnAnim = 1;
  b.frozenUntil = 0;
  applyTowerStats(b);
  maxStat('bestRank', b.level);
  game.selectedPlaced = null;
  spawnRing(b.x, b.y, '#ffd166', grid.tileSize * 1.2, 0.4);
  spawnParticles(b.x, b.y, '#ffd166', 18, 120);
  spawnText(b.x, b.y - grid.tileSize * 0.4, 'Rango ' + b.level, '#ffd166', true);
  sfxMerge();
  saveRun();
  refreshPanel();
  return true;
}
function powerUpType(type) {
  var lv = game.typePower[type] || 1;
  if (lv >= 5) { showToast('Potencia máxima'); return; }
  var cost = POWER_COSTS[lv];
  if (game.mana < cost) { showToast('Necesitas ' + cost + ' 💧'); sfxBlocked(); return; }
  game.mana -= cost;
  game.typePower[type] = lv + 1;
  game.towers.forEach(function (t) { if (t.type === type) { applyTowerStats(t); t.spawnAnim = 0.6; } });
  sfxLevelUp();
  showToast(TOWER_TYPES[type].name + ' potenciada a ' + (lv + 1));
  buildTowerRow();
  saveRun();
}

/* ---------- interfaz de partida ---------- */
var _uiCache = {};
function setText(id, v) { if (_uiCache[id] === v) return; _uiCache[id] = v; var el = $(id); if (el) el.textContent = v; }
function hudLabel() {
  if (game.mode === 'survival') return 'Ola ' + game.wave;
  if (game.mode === 'bossrush') return 'Jefe ' + game.wave + '/' + game.maxWaves;
  if (game.mode === 'adventure') return 'Nivel ' + game.level + ' · Ola ' + game.wave + '/' + game.maxWaves;
  if (game.mode === 'expedition') return 'Piso ' + (game.stage.row + 1) + ' · Ola ' + game.wave + '/' + game.maxWaves;
  return 'Nv ' + game.level + '/' + game.maxLevel + ' · Ola ' + game.wave + '/' + game.maxWaves;
}
function towerCost(type) { return Math.round(TOWER_TYPES[type].manaCost * game.mods.cost); }
function buildTowerRow() {
  var row = $('towerRow');
  row.innerHTML = '';
  game.deck.forEach(function (id) {
    var t = TOWER_TYPES[id];
    var btn = document.createElement('button');
    btn.className = 'tower-chip r-' + t.rarity + (game.selectedTower === id && !game.fusion ? ' selected' : '');
    btn.dataset.tower = id;
    var sub = game.fusion
      ? ((game.typePower[id] || 1) >= 5 ? 'Máx' : '⬆ ' + POWER_COSTS[game.typePower[id] || 1] + ' 💧')
      : towerCost(id) + ' 💧';
    btn.innerHTML =
      '<img class="tower-icon" src="' + towerIconURL(id, 1) + '" alt="">' +
      (game.fusion ? '<span class="power-badge">' + (game.typePower[id] || 1) + '</span>' : '') +
      '<span class="tower-name">' + t.name + '</span>' +
      '<span class="tower-cost" id="cost_' + id + '">' + sub + '</span>';
    btn.onclick = function () { game.fusion ? powerUpType(id) : selectTower(id); };
    row.appendChild(btn);
  });
  $('summonBtn').hidden = !game.fusion;
  $('upgradeBtn').hidden = game.fusion;
}
function selectTower(type) {
  game.selectedTower = type;
  game.selectedPlaced = null;
  Array.prototype.forEach.call(document.querySelectorAll('.tower-chip'), function (b) { b.classList.toggle('selected', b.dataset.tower === type); });
  refreshPanel();
}
var TARGET_LABELS = { first: 'Primero', last: 'Último', strong: 'Más fuerte', close: 'Cercano' };
var TARGET_ORDER = ['first', 'strong', 'last', 'close'];
function refreshPanel() {
  var panel = $('panelInfo');
  var t = game.selectedPlaced;
  if (t && game.towers.indexOf(t) === -1) t = game.selectedPlaced = null;
  if (t) {
    var d = t.def;
    var stats = d.support
      ? 'Maná ' + (d.manaGen * (1 + 0.35 * (t.level - 1))).toFixed(1) + '/s · Aura +' + Math.round(d.aura * (1 + 0.25 * (t.level - 1)) * 100) + '%'
      : 'Daño ' + fmt(t.damage * game.mods.dmg * (game.mods.typeDmg[t.type] || 1)) + ' · ' + (t.speed * game.mods.speed).toFixed(2) + '/s · Alc ' + (t.rangeTiles * game.mods.range).toFixed(1);
    var btns = '';
    if (game.fusion) {
      btns += '<span class="hint">Arrastra o toca otra igual para fusionar</span>';
    } else {
      var maxed = t.level >= TOWER_MAX_LEVEL;
      btns += (maxed
        ? '<button class="mini-btn upgrade" disabled>⭐ Nivel máximo</button>'
        : '<button class="mini-btn upgrade big" id="panelUpgrade" data-cost="' + t.upgradeCost() + '" onclick="upgradeSelectedTower()">⬆ Nv ' + t.level + ' → ' + (t.level + 1) + ' · ' + t.upgradeCost() + ' 💧</button>') +
        '<button class="mini-btn sell" onclick="sellSelectedTower()"><span class="wide-only">Vender </span>' + t.sellValue() + ' 💧</button>';
    }
    if (!d.support) btns += '<button class="mini-btn target" onclick="cycleTargeting()" title="Prioridad de disparo">🎯<span class="wide-only"> ' + TARGET_LABELS[t.targeting] + '</span></button>';
    panel.classList.add('has-tower');
    panel.classList.toggle('at-top', t.row >= grid.rows / 2);
    panel.innerHTML =
      '<div class="tp-head"><img src="' + towerIconURL(t.type, Math.min(t.level, 5)) + '" alt=""><div><b>' + d.name + (game.fusion ? ' · Rango ' : ' · Nv ') + t.level + '</b>' +
      '<small>' + stats + ' · Bajas ' + t.kills + '</small></div></div>' +
      '<div class="tp-btns">' + btns + '</div>' +
      (!game.fusion && t.level < TOWER_MAX_LEVEL ? '<span class="tp-tip">💡 Toca la torre otra vez para mejorarla</span>' : '');
    return;
  }
  panel.classList.remove('has-tower', 'at-top');
  if (game.fusion) {
    panel.innerHTML = '<b>🧬 Fusión</b><br>Invoca torres al azar de tu mazo y junta dos iguales del mismo rango. Toca una carta para potenciar ese tipo.';
    return;
  }
  var s = TOWER_TYPES[game.selectedTower];
  if (!s) { panel.innerHTML = ''; return; }
  panel.innerHTML = '<div class="tp-head"><img src="' + towerIconURL(game.selectedTower, 1) + '" alt=""><div><b>' + s.name + ' · ' + towerCost(game.selectedTower) + ' 💧</b><small>' + s.desc + '</small></div></div>';
}
function upgradeTower(tower) {
  if (!tower) return false;
  if (tower.level >= TOWER_MAX_LEVEL) { showToast('Ya está al nivel máximo'); return false; }
  var cost = tower.upgradeCost();
  if (game.mana < cost) { showToast('Necesitas ' + cost + ' 💧'); sfxBlocked(); return false; }
  game.mana -= cost;
  tower.evolve();
  spawnRing(tower.x, tower.y, '#ffd166', grid.tileSize * 0.9, 0.3);
  spawnParticles(tower.x, tower.y, '#7dffb0', 10, 90);
  spawnText(tower.x, tower.y - grid.tileSize * 0.45, 'Nv ' + tower.level, '#7dffb0', true);
  sfxBuy();
  refreshPanel();
  saveRun();
  return true;
}
function upgradeSelectedTower() { upgradeTower(game.selectedPlaced); }
/** La torre mejorable más barata (para el botón de mejora rápida). */
function cheapestUpgradeable() {
  var best = null;
  game.towers.forEach(function (t) {
    if (t.level >= TOWER_MAX_LEVEL) return;
    if (!best || t.upgradeCost() < best.upgradeCost() || (t.upgradeCost() === best.upgradeCost() && t.dealt > best.dealt)) best = t;
  });
  return best;
}
function quickUpgrade() {
  if (game.fusion || game.ended) return;
  var t = cheapestUpgradeable();
  if (!t) { showToast(game.towers.length ? 'Todas tus torres están al máximo' : 'Coloca primero alguna torre'); return; }
  upgradeTower(t);
}
function sellSelectedTower() {
  var tower = game.selectedPlaced;
  if (!tower) return;
  gainMana(tower.sellValue());
  game.towers = game.towers.filter(function (t) { return t !== tower; });
  game.selectedPlaced = null;
  spawnParticles(tower.x, tower.y, '#ffd166', 10, 80);
  refreshPanel();
  saveRun();
}
function cycleTargeting() {
  var t = game.selectedPlaced;
  if (!t) return;
  t.targeting = TARGET_ORDER[(TARGET_ORDER.indexOf(t.targeting) + 1) % TARGET_ORDER.length];
  refreshPanel();
}
function updateUI() {
  setText('manaText', Math.floor(game.mana));
  setText('lives', game.lives);
  setText('hudLabel', hudLabel());
  setText('boardLabel', hudLabel());
  $('manaBar').style.width = clamp((game.mana / game.maxMana) * 100, 0, 100) + '%';
  setText('manaMax', '/' + Math.round(game.maxMana));
  var full = manaIsFull();
  $('manaBar').parentNode.classList.toggle('full', full);
  $('hudMana').classList.toggle('full', full);
  var pu = $('panelUpgrade');
  if (pu) pu.classList.toggle('poor', game.mana < +pu.dataset.cost);
  if (!game.fusion) {
    var cheap = cheapestUpgradeable();
    var ub = $('upgradeBtn');
    setText('upgradeCost', cheap ? cheap.upgradeCost() + ' 💧' : '—');
    ub.disabled = !cheap;
    ub.classList.toggle('poor', !cheap || game.mana < cheap.upgradeCost());
    ub.classList.toggle('urge', !!cheap && full && game.mana >= cheap.upgradeCost());
  }
  game.deck.forEach(function (id) {
    var chip = document.querySelector('.tower-chip[data-tower="' + id + '"]');
    if (!chip) return;
    var cost = game.fusion ? POWER_COSTS[game.typePower[id] || 1] || Infinity : towerCost(id);
    chip.classList.toggle('poor', game.mana < cost);
  });
  if (game.fusion) {
    var sb = $('summonBtn');
    setText('summonCost', game.summonCost);
    sb.classList.toggle('poor', game.mana < game.summonCost);
    sb.classList.toggle('urge', full && game.mana >= game.summonCost);
  }
  var hb = $('heroBtn');
  var pct = clamp(game.heroCharge, 0, 1);
  hb.style.setProperty('--charge', (pct * 360) + 'deg');
  hb.classList.toggle('ready', pct >= 1 && game.isWaveActive);
  var sbtn = $('startBtn');
  sbtn.disabled = game.isWaveActive || game.pendingBoon || game.ended;
  setText('startBtn', game.isWaveActive ? 'En curso' : (game.mode === 'bossrush' ? 'Siguiente jefe' : 'Iniciar ola'));
  var autoEl = $('hudAuto');
  if (autoEl) autoEl.classList.toggle('on', !!meta.settings.autoWave);
}

/* ---------- entrada: toques y arrastre ---------- */
var pointer = { down: null, drag: null };
function canvasPoint(ev) {
  var rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}
function onPointerDown(ev) {
  if (!grid || game.ended) return;
  var p = canvasPoint(ev);
  var tile = pxToTile(p.x, p.y);
  pointer.down = { x: p.x, y: p.y, tower: inGrid(tile.col, tile.row) ? towerAt(tile.col, tile.row) : null };
  pointer.drag = null;
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
}
function onPointerMove(ev) {
  if (!pointer.down) return;
  var p = canvasPoint(ev);
  if (game.fusion && pointer.down.tower && Math.hypot(p.x - pointer.down.x, p.y - pointer.down.y) > 12) {
    pointer.drag = { x: p.x, y: p.y, tower: pointer.down.tower };
  }
}
function onPointerUp(ev) {
  if (!pointer.down) return;
  var p = canvasPoint(ev);
  var drag = pointer.drag;
  pointer.down = null; pointer.drag = null;
  if (drag) {
    var tile = pxToTile(p.x, p.y);
    var other = inGrid(tile.col, tile.row) ? towerAt(tile.col, tile.row) : null;
    if (other && other !== drag.tower) mergeTowers(drag.tower, other);
    return;
  }
  handleTap(p.x, p.y);
}
function handleTap(x, y) {
  if (!grid || game.ended) return;
  actx();
  var tile = pxToTile(x, y);
  if (!inGrid(tile.col, tile.row)) { game.selectedPlaced = null; refreshPanel(); return; }
  var existing = towerAt(tile.col, tile.row);
  if (game.fusion) {
    if (existing) {
      var sel = game.selectedPlaced;
      if (sel && sel !== existing && canMerge(sel, existing)) { mergeTowers(sel, existing); return; }
      game.selectedPlaced = sel === existing ? null : existing;
      refreshPanel();
      return;
    }
    game.selectedPlaced = null;
    refreshPanel();
    if (isBuildable(tile.col, tile.row)) showToast('Pulsa Invocar para traer torres');
    return;
  }
  if (existing) {
    // Segundo toque sobre la torre seleccionada = mejorarla.
    if (game.selectedPlaced === existing) { upgradeTower(existing); return; }
    game.selectedPlaced = existing;
    refreshPanel();
    return;
  }
  if (!isBuildable(tile.col, tile.row)) { showToast('No se puede construir sobre el camino'); game.selectedPlaced = null; refreshPanel(); return; }
  var type = game.selectedTower;
  var cost = towerCost(type);
  if (game.mana < cost) { showToast('Necesitas ' + cost + ' 💧'); sfxBlocked(); return; }
  game.mana -= cost;
  var tw = new Tower(tile.col, tile.row, type, 1);
  tw.totalSpentMana = cost;
  game.towers.push(tw);
  game.selectedPlaced = null;
  spawnRing(tw.x, tw.y, tw.def.color2, grid.tileSize * 0.8, 0.3);
  spawnParticles(tw.x, tw.y, tw.def.color2, 8, 70);
  sfxPlace();
  refreshPanel();
  saveRun();
}

/* ---------- dibujo del frame ---------- */
function drawEndpoints(now) {
  var ts = grid.tileSize;
  grid.lanes.forEach(function (lane) {
    if (!lane.waypoints.length) return;
    var s = lane.waypoints[0], e = lane.waypoints[lane.waypoints.length - 1];
    // portal de entrada
    ctx.save();
    ctx.translate(s.x, s.y);
    var pg = ctx.createRadialGradient(0, 0, 2, 0, 0, ts * 0.42);
    pg.addColorStop(0, 'rgba(201,162,255,0.9)'); pg.addColorStop(1, 'rgba(80,30,160,0.1)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(0, 0, ts * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e3c6ff'; ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, ts * (0.15 + i * 0.09), now / (300 + i * 120) + i, now / (300 + i * 120) + i + Math.PI * 1.2); ctx.stroke();
    }
    ctx.restore();
    // castillo de salida
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(10,14,26,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, ts * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = Math.round(ts * 0.45) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏰', 0, ts * 0.02);
    ctx.restore();
  });
}
function drawProjectiles() {
  game.projectiles.forEach(function (p) {
    var k = p.kind;
    for (var i = 0; i < p.trail.length; i++) {
      var tr = p.trail[i];
      ctx.globalAlpha = (i + 1) / p.trail.length * 0.35;
      ctx.fillStyle = p.color2;
      ctx.beginPath(); ctx.arc(tr.x, tr.y, p.size * (0.4 + i / p.trail.length * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (k === 'cannon') {
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8f3c'; ctx.beginPath(); ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'frost') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
      ctx.fillStyle = '#e6f8ff';
      ctx.beginPath(); ctx.moveTo(p.size * 1.8, 0); ctx.lineTo(-p.size, -p.size * 0.6); ctx.lineTo(-p.size, p.size * 0.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (k === 'nature') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
      ctx.fillStyle = '#8ee6b0';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (k === 'wind') {
      ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, game.time * 20, game.time * 20 + Math.PI * 1.4); ctx.stroke();
    } else {
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, p.color2); g.addColorStop(1, hexA(p.color.length === 7 ? p.color : '#ffffff', 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  });
}
function drawShots() {
  game.shots.forEach(function (s) {
    ctx.globalAlpha = clamp(s.life / s.maxLife, 0, 1);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    if (s.kind === 'bolt') {
      var segs = 5;
      for (var i = 1; i < segs; i++) {
        var t = i / segs;
        ctx.lineTo(s.x1 + (s.x2 - s.x1) * t + (Math.random() - 0.5) * 10, s.y1 + (s.y2 - s.y1) * t + (Math.random() - 0.5) * 10);
      }
    }
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    if (s.kind === 'beam') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}
function drawEffects() {
  game.rings.forEach(function (r) {
    ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1);
    ctx.strokeStyle = r.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  });
  game.particles.forEach(function (p) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  game.texts.forEach(function (t) {
    ctx.globalAlpha = clamp(t.life / t.maxLife * 1.5, 0, 1);
    ctx.font = 'bold ' + (t.big ? 16 : 11) + 'px "Segoe UI", Arial';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  });
  ctx.globalAlpha = 1;
}
function drawFrame(now) {
  if (!grid || !grid.bg) return;
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  ctx.drawImage(grid.bg, 0, 0, grid.w, grid.h);
  var ts = grid.tileSize;
  grid.decor.forEach(function (d) {
    if (d.prop && !towerAt(d.col, d.row)) drawProp(ctx, d.prop, grid.offsetX + d.col * ts + ts / 2, grid.offsetY + d.row * ts + ts / 2, ts, now);
  });
  drawEndpoints(now);
  var sel = game.selectedPlaced || (pointer.drag && pointer.drag.tower);
  game.towers.forEach(function (t) {
    var hl = game.fusion && sel && canMerge(sel, t);
    t.draw(t === game.selectedPlaced, now, hl);
  });
  var ens = game.enemies.slice().sort(function (a, b) { return a.y - b.y; });
  ens.forEach(function (e) { if (!e.dead) e.draw(now); });
  // etiqueta de mejora por encima de todo
  var selT = game.selectedPlaced;
  if (selT && !game.fusion && selT.level < TOWER_MAX_LEVEL && game.towers.indexOf(selT) !== -1) drawUpgradeCostTag(selT, ts);
  drawProjectiles();
  drawShots();
  drawEffects();
  if (pointer.drag) {
    ctx.globalAlpha = 0.65;
    var dt = pointer.drag.tower;
    drawTowerShape(ctx, { x: pointer.drag.x, y: pointer.drag.y, level: dt.level, aimAngle: -Math.PI / 2, recoil: 0, def: dt.def, color: dt.color }, ts, now);
    ctx.globalAlpha = 1;
  }
  if (game.overchargeUntil > game.time) {
    ctx.strokeStyle = hexA('#ffe97c', 0.5 + Math.sin(now / 80) * 0.3);
    ctx.lineWidth = 4;
    ctx.strokeRect(grid.offsetX, grid.offsetY, ts * grid.cols, ts * grid.rows);
  }
  ctx.restore();
}

/* ---------- bucle ---------- */
var lastTs = 0;
var loopStarted = false;
function tick(ts) {
  var rawDt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  var running = !game.ended && !game.paused && !$('gameScreen').hidden;
  if (running) {
    var steps = gameSpeed > 2 ? Math.ceil(gameSpeed / 2) : 1;
    var dt = rawDt * gameSpeed / steps;
    for (var s = 0; s < steps; s++) stepGame(dt);
    // oleada automática
    if (meta.settings.autoWave && !game.isWaveActive && !game.pendingBoon && !game.ended) {
      game.autoTimer += rawDt;
      if (game.autoTimer > 2.2) startWave();
    }
  }
  if (!$('gameScreen').hidden && grid) {
    drawFrame(ts);
    updateUI();
    var boss = null;
    for (var i = 0; i < game.enemies.length; i++) if (game.enemies[i].isBoss && !game.enemies[i].dead) { boss = game.enemies[i]; break; }
    var bossBar = $('bossBar');
    if (boss) {
      bossBar.classList.add('show');
      $('bossFill').style.width = clamp((boss.health / boss.maxHealth) * 100, 0, 100) + '%';
      bossBar.classList.toggle('shielded', !!boss.shielded);
    } else bossBar.classList.remove('show');
    $('boardLabel').style.visibility = boss ? 'hidden' : '';
  }
  requestAnimationFrame(tick);
}
function stepGame(dt) {
  game.time += dt;
  if (game.isWaveActive && game.spawnQueue.length) {
    game.spawnAccum += dt;
    while (game.spawnAccum >= game.spawnInterval && game.spawnQueue.length) {
      game.spawnAccum -= game.spawnInterval;
      spawnFromSpec(game.spawnQueue.shift());
    }
  }
  if (game.isWaveActive) {
    var regen = (PASSIVE_MANA_PER_SEC + metaUpgradeLevel('regen') * 0.6 + game.mods.regen) * game.mods.manaMult;
    gainMana(regen * dt);
    if (game.heroCharge < 1) game.heroCharge = Math.min(1, game.heroCharge + dt / heroCooldown());
  }
  game.towers.forEach(function (t) { t.update(dt); });
  for (var i = 0; i < game.enemies.length; i++) { var e = game.enemies[i]; if (!e.dead) e.update(dt); }
  updateProjectiles(dt);
  updateEffects(dt);

  var lost = 0;
  game.enemies.forEach(function (e) {
    if (!e.dead && e.reachedEnd()) {
      e.dead = true;
      lost += e.isBoss ? 2 : 1;
    }
  });
  game.enemies = game.enemies.filter(function (e) { return !e.dead; });
  if (lost > 0) {
    game.lives -= lost;
    shake(5);
    var lifeEl = $('hudLives');
    lifeEl.classList.remove('hit'); void lifeEl.offsetWidth; lifeEl.classList.add('hit');
    sfxBlocked();
  }
  if (game.lives <= 0 && !game.ended) {
    if (game.mods.phoenix && !game.phoenixUsed) {
      game.phoenixUsed = true;
      game.lives = 6;
      showBigBanner('🔥 ¡Fénix!', 'Recuperas 6 vidas');
      flashScreen('#ff8f3c');
      sfxHero();
    } else {
      loseRun();
      return;
    }
  }
  if (game.isWaveActive && game.enemies.length === 0 && game.spawnQueue.length === 0) onWaveCleared();
}

/* ---------- inicio de partida ---------- */
function resetBoard() {
  game.towers = []; game.enemies = []; game.particles = []; game.shots = [];
  game.projectiles = []; game.rings = []; game.texts = [];
  game.isWaveActive = false; game.spawnQueue = []; game.selectedPlaced = null;
  game.ended = false; game.paused = false; game.shake = 0; game.time = 0; game.overchargeUntil = 0;
  game.autoTimer = 0; game.pendingBoon = false;
}
function enterGameScreen() {
  showScreen('gameScreen');
  $('endOverlay').hidden = true;
  $('pauseOverlay').hidden = true;
  _uiCache = {};
  var h = HEROES[game.hero];
  $('heroImg').src = 'assets/heroes/' + game.hero + '.svg';
  $('heroBtn').style.setProperty('--hc', h.color);
  $('heroBtn').title = h.ability.name;
  // la disposición depende del tamaño real del tablero, que ya es visible
  layoutGrid();
  buildTowerRow();
  refreshPanel();
  if (!loopStarted) { loopStarted = true; requestAnimationFrame(tick); }
}
function startGame(opts) {
  opts = opts || {};
  var mode = opts.mode || 'classic';
  var g = newGameState();
  g.mode = mode;
  g.opts = opts;
  g.hero = meta.heroes[meta.hero] ? meta.hero : 'aria';
  g.deck = meta.deck.slice();
  TOWER_ORDER.forEach(function (t) { g.cardLevels[t] = cardLevel(t); });
  g.mana = START_MANA + metaUpgradeLevel('mana') * 15;
  g.lives = START_LIVES + metaUpgradeLevel('lives') * 2;
  game = g;
  resetBoard();
  var biome = 'pradera', seed = null, lanes = null;
  if (mode === 'classic') {
    g.maxLevel = 8;
  } else if (mode === 'fusion') {
    g.maxLevel = 8; g.fusion = true; g.maxMana = 400; g.mana = 70 + metaUpgradeLevel('mana') * 15;
    g.deck.forEach(function (t) { g.typePower[t] = 1; });
  } else if (mode === 'adventure') {
    g.level = opts.level || 1; g.maxLevel = g.level;
    // Empiezas con el tablero vacío, así que se da presupuesto para montar la defensa.
    g.mana += (g.level - 1) * 320;
    g.maxMana = Math.max(150 + (g.level - 1) * 30, g.mana);
    seed = ADVENTURE_SEED_BASE + g.level;
    biome = LEVEL_BIOME[g.level - 1];
  } else if (mode === 'survival') {
    g.maxWaves = Infinity;
  } else if (mode === 'bossrush') {
    g.maxWaves = BOSS_ORDER.length; g.mana = 420 + metaUpgradeLevel('mana') * 15; g.maxMana = 500;
    biome = 'castillo';
  } else if (mode === 'daily') {
    var d = dailySetup();
    g.maxLevel = 5; g.hero = d.hero; g.deck = d.deck; g.dailyMod = d.mod.id;
    TOWER_ORDER.forEach(function (t) { g.cardLevels[t] = 3; });
    seed = d.seed;
    if (d.mod.id === 'rapidos') g.enemyMods.speed = 1.25;
    if (d.mod.id === 'blindados') g.enemyMods.armor = 0.15;
    if (d.mod.id === 'enjambre') { g.enemyMods.count = 1.5; g.enemyMods.hp = 0.7; }
    if (d.mod.id === 'gigantes') g.enemyMods.hp = 1.45;
    if (d.mod.id === 'cristal') g.lives = Math.ceil(g.lives / 2);
  } else if (mode === 'expedition') {
    var st = opts.stage;
    g.stage = st;
    g.maxWaves = st.waves;
    g.lives = expRun.lives;
    g.boons = expRun.boons.slice();
    g.rerolls = 0;
    g.phoenixUsed = expRun.phoenixUsed;
    g.hero = expRun.hero; g.deck = expRun.deck.slice();
    g.mana = st.mana;
    g.maxMana = Math.max(150 + st.row * 30, st.mana);
    seed = st.seed;
    biome = st.biome;
  }
  g.startLives = g.lives;
  g.selectedTower = g.deck[0];
  recomputeMods();
  updateCfgIndex();
  if (seed !== null) rng = mulberry32(seed);
  buildGrid({ biome: biome, lanes: lanes });
  rng = Math.random;
  clearSavedRun();
  enterGameScreen();
  showBigBanner(MODES[mode].name, mode === 'expedition' ? opts.stage.title : BIOMES[grid.biome].name);
  if (mode === 'bossrush') offerRunBoon('elite');
  else saveRun();
}

/* ---------- pausa y salida ---------- */
function togglePause(force) {
  if (game.ended) return;
  game.paused = force !== undefined ? force : !game.paused;
  var ov = $('pauseOverlay');
  if (!game.paused) { ov.hidden = true; return; }
  var boons = game.boons.map(function (id) { var b = getBoonDef(id); return b ? '<span class="boon-chip" style="--rc:' + RARITY[b.rarity].color + '" title="' + escapeHtml(b.desc) + '">' + b.icon + ' ' + escapeHtml(b.name) + '</span>' : ''; }).join('');
  var h = HEROES[game.hero];
  var daily = game.dailyMod ? DAILY_MODS.find(function (m) { return m.id === game.dailyMod; }) : null;
  ov.innerHTML =
    '<div class="end-card pause-card">' +
    '<h2>⏸ Pausa</h2>' +
    '<p>' + MODES[game.mode].icon + ' ' + MODES[game.mode].name + ' · ' + hudLabel() + '</p>' +
    '<div class="pause-hero"><img src="assets/heroes/' + game.hero + '.svg" alt=""><div><b>' + h.name + '</b><small>' + h.ability.icon + ' ' + h.ability.name + ': ' + h.ability.desc + '</small><small>Pasiva: ' + h.passive + '</small></div></div>' +
    (daily ? '<p class="daily-mod">' + daily.icon + ' ' + daily.name + ': ' + daily.desc + '</p>' : '') +
    '<h3>Bendiciones</h3><div class="boon-chips">' + (boons || '<small class="muted">Aún ninguna</small>') + '</div>' +
    '<div class="pause-stats"><span>⚔️ ' + game.kills + ' bajas</span><span>👑 ' + game.bossKills + ' jefes</span><span>💥 ' + fmt(game.damageDealt) + ' daño</span></div>' +
    '<label class="toggle-row"><input type="checkbox" ' + (meta.settings.dmgNumbers ? 'checked' : '') + ' onchange="setSetting(\'dmgNumbers\', this.checked)"> Números de daño</label>' +
    '<label class="toggle-row"><input type="checkbox" ' + (soundOn ? 'checked' : '') + ' onchange="if (this.checked !== soundOn) toggleSound()"> Sonido</label>' +
    '<label class="toggle-row"><input type="checkbox" ' + (meta.settings.autoWave ? 'checked' : '') + ' onchange="setSetting(\'autoWave\', this.checked)"> Olas automáticas</label>' +
    '<button class="menu-btn menu-btn-primary" onclick="togglePause(false)">Continuar</button>' +
    '<button class="menu-btn" onclick="exitToMenu()">Guardar y salir</button>' +
    '<button class="menu-btn danger" onclick="abandonRun()">Abandonar</button>' +
    '</div>';
  ov.hidden = false;
}
function setSetting(k, v) { meta.settings[k] = v; saveMeta(); }
function toggleAutoWave() {
  meta.settings.autoWave = !meta.settings.autoWave;
  saveMeta();
  showToast(meta.settings.autoWave ? 'Olas automáticas activadas' : 'Olas automáticas desactivadas');
}
/** Botón ✕ de la barra superior: salir de la partida con confirmación. */
function confirmQuit() {
  if (game.ended) { go('home'); return; }
  var wasPaused = game.paused;
  game.paused = true;
  var m = $('modal');
  m.innerHTML =
    '<div class="end-card quit-card">' +
    '<h2>¿Salir de la partida?</h2>' +
    '<p>' + (game.isWaveActive ? 'La partida se guardó al empezar esta ola: si sales ahora, volverás a ese punto.' : 'Tu partida está guardada y podrás continuarla desde el menú.') + '</p>' +
    '<button class="menu-btn menu-btn-primary" id="quitStay">Seguir jugando</button>' +
    '<button class="menu-btn" id="quitSave">💾 Guardar y salir</button>' +
    '<button class="menu-btn danger" id="quitAbandon">🏳️ Abandonar partida</button>' +
    '</div>';
  m.hidden = false;
  m.onQuitClose = function () { game.paused = wasPaused; };
  $('quitStay').onclick = function () { closeModal(); };
  $('quitSave').onclick = function () { m.onQuitClose = null; m.hidden = true; exitToMenu(); };
  $('quitAbandon').onclick = function () { m.onQuitClose = null; m.hidden = true; game.paused = false; abandonRun(); };
}
function exitToMenu() {
  game.paused = false;
  $('pauseOverlay').hidden = true;
  if (game.isWaveActive) showToast('Se guardó al empezar la ola');
  game.isWaveActive = false;
  go(game.mode === 'expedition' ? 'expMap' : 'home');
}
function abandonRun() {
  if (!confirm('¿Abandonar la partida? Te llevas las gemas de lo que hayas conseguido.')) return;
  $('pauseOverlay').hidden = true;
  game.paused = false;
  game.ended = true;
  endRun(false);
}
var SPEED_STEPS = [1, 2, 4, 8];
function cycleGameSpeed() { setGameSpeed(SPEED_STEPS[(SPEED_STEPS.indexOf(gameSpeed) + 1) % SPEED_STEPS.length]); }
function setGameSpeed(mult) {
  gameSpeed = mult;
  Array.prototype.forEach.call(document.querySelectorAll('.speed-btn'), function (b) { b.classList.toggle('selected', +b.dataset.speed === mult); });
  var hs = $('hudSpeed');
  if (hs) { hs.textContent = 'x' + mult; hs.classList.toggle('on', mult > 1); }
}

/* ---------- fin de partida y recompensas ---------- */
function endRun(won) {
  if ($('endOverlay').hidden === false) return;
  game.ended = true;
  clearSavedRun();
  var mode = game.mode;
  var gems = 0, lines = [], title = won ? '¡Victoria!' : 'Fin de la partida', extra = '';
  var stars = 0;
  addStat('kills', game.kills);
  addStat('bosses', game.bossKills);
  addStat('runs');
  if (mode === 'classic' || mode === 'fusion') {
    gems = game.level * 4 + game.wave + Math.floor(game.kills / 25) + (won ? 40 : 0);
    lines.push(won ? 'Has superado los 8 niveles.' : 'Llegaste al nivel ' + game.level + ', ola ' + game.wave + '.');
    if (won) addStat(mode === 'fusion' ? 'fusionWins' : 'classicWins');
  } else if (mode === 'adventure') {
    if (won) {
      var lostL = game.startLives - game.lives;
      stars = lostL <= 0 ? 3 : game.lives >= game.startLives / 2 ? 2 : 1;
      var prev = meta.adventure[game.level] || 0;
      if (stars > prev) { gems += (stars - prev) * 8; meta.adventure[game.level] = stars; }
      gems += 4;
      lines.push('Nivel ' + game.level + ' superado.');
      extra = '<div class="stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? 'on' : '') + '" style="animation-delay:' + (i * 0.25) + 's">★</span>'; }).join('') + '</div>';
    } else {
      gems = 2;
      lines.push('Caíste en la ola ' + game.wave + ' del nivel ' + game.level + '.');
    }
  } else if (mode === 'survival') {
    var reached = game.wave - (won ? 0 : 1);
    maxStat('bestSurvival', reached);
    gems = reached * 2 + Math.floor(game.kills / 25);
    title = 'Has aguantado ' + reached + ' olas';
    lines.push('Tu récord: ' + stat('bestSurvival') + ' olas.');
  } else if (mode === 'bossrush') {
    var beaten = game.bossKills;
    gems = beaten * 8 + (won ? 40 : 0);
    lines.push(won ? '¡Has derrotado a los siete jefes!' : 'Jefes derrotados: ' + beaten + ' de ' + game.maxWaves + '.');
    if (won) addStat('bossrushWins');
  } else if (mode === 'daily') {
    var score = (game.level - 1 + (won ? 1 : 0)) * 1000 + game.lives * 25 + game.kills;
    var dk = todayKey();
    if (meta.daily.date !== dk) meta.daily = { date: dk, best: 0, done: false };
    var isBest = score > (meta.daily.best || 0);
    if (isBest) meta.daily.best = score;
    gems = game.level * 3;
    if (won && !meta.daily.done) { meta.daily.done = true; gems += 40; addStat('dailyWins'); lines.push('Desafío de hoy completado. +40 💎'); }
    lines.push('Puntuación: ' + fmt(score) + (isBest ? ' · ¡Récord de hoy!' : ' · Récord: ' + fmt(meta.daily.best)));
  } else if (mode === 'expedition') {
    var depth = game.stage ? game.stage.row + 1 : 1;
    gems = depth * 5 + Math.floor(game.kills / 25) + (won ? 60 : 0);
    lines.push(won ? '¡Has conquistado la expedición!' : 'Caíste en el piso ' + depth + '.');
    if (won) addStat('expeditionWins');
    clearExpedition();
  }
  gems = Math.round(gems * (1 + metaUpgradeLevel('gems') * 0.1));
  meta.gems += gems;
  var xp = game.kills + game.wavesCleared * 5 + (won ? 50 : 0);
  var lvBefore = accountLevel();
  meta.xp = (meta.xp || 0) + xp;
  var lvAfter = accountLevel();
  if (lvAfter > lvBefore) { meta.gems += 20 * (lvAfter - lvBefore); lines.push('¡Subes a nivel de cuenta ' + lvAfter + '! +' + (20 * (lvAfter - lvBefore)) + ' 💎'); }
  saveMeta();
  lines.push('⚔️ ' + game.kills + ' bajas · 👑 ' + game.bossKills + ' jefes · 💥 ' + fmt(game.damageDealt) + ' de daño');
  var best = game.towers.slice().sort(function (a, b) { return b.dealt - a.dealt; })[0];
  if (best && best.dealt > 0) lines.push('MVP: ' + best.def.symbol + ' ' + best.def.name + ' con ' + fmt(best.dealt) + ' de daño');
  var claim = claimableAchievements();
  if (claim) lines.push('🏅 Tienes ' + claim + (claim === 1 ? ' logro' : ' logros') + ' por reclamar');
  $('endTitle').textContent = title;
  $('endExtra').innerHTML = extra;
  $('endDesc').innerHTML = lines.map(function (l) { return '<p>' + escapeHtml(l) + '</p>'; }).join('');
  $('endGems').textContent = gems;
  $('endXp').textContent = xp;
  var again = $('endAgain');
  again.hidden = mode === 'daily';
  again.textContent = mode === 'adventure' && won && game.level < 8 ? 'Siguiente nivel' : 'Otra vez';
  again.onclick = function () {
    $('endOverlay').hidden = true;
    if (mode === 'adventure') startGame({ mode: 'adventure', level: won && game.level < 8 ? game.level + 1 : game.level });
    else if (mode === 'expedition') startExpedition();
    else startGame({ mode: mode });
  };
  $('endOverlay').hidden = false;
  won ? sfxLevelUp() : sfxGameOver();
}

/* ---------- guardado a medias (solo entre olas) ---------- */
function saveRun() {
  if (!grid || game.ended || game.isWaveActive) return;
  var data = {
    v: 2, mode: game.mode, opts: game.mode === 'expedition' ? { mode: 'expedition' } : game.opts,
    level: game.level, maxLevel: game.maxLevel, wave: game.wave, maxWaves: game.maxWaves === Infinity ? -1 : game.maxWaves,
    lives: game.lives, startLives: game.startLives, mana: game.mana, maxMana: game.maxMana,
    hero: game.hero, heroCharge: game.heroCharge, deck: game.deck, cardLevels: game.cardLevels,
    boons: game.boons, rerolls: game.rerolls, phoenixUsed: game.phoenixUsed, enemyMods: game.enemyMods, dailyMod: game.dailyMod,
    fusion: game.fusion, typePower: game.typePower, summonCost: game.summonCost,
    kills: game.kills, bossKills: game.bossKills, damageDealt: game.damageDealt, wavesCleared: game.wavesCleared,
    stage: game.stage, pendingBoon: game.pendingBoon, pendingBias: game.pendingBias || null,
    towers: game.towers.map(function (t) { return { col: t.col, row: t.row, type: t.type, level: t.level, totalSpentMana: t.totalSpentMana, targeting: t.targeting, dealt: t.dealt, kills: t.kills }; }),
    grid: { cols: grid.cols, rows: grid.rows, vertical: grid.vertical, biome: grid.biome, lanes: grid.lanes.map(function (l) { return { pathCells: l.pathCells }; }) }
  };
  lsSet(TD_SAVE_KEY, data);
}
function clearSavedRun() { lsDel(TD_SAVE_KEY); }
function loadSavedRun() { var s = lsGet(TD_SAVE_KEY, null); return s && s.v === 2 ? s : null; }
function continueSavedGame() {
  var s = loadSavedRun();
  if (!s) return;
  var g = newGameState();
  ['mode', 'opts', 'level', 'maxLevel', 'wave', 'lives', 'startLives', 'mana', 'maxMana', 'hero', 'heroCharge', 'deck', 'cardLevels', 'boons', 'rerolls', 'phoenixUsed', 'enemyMods', 'dailyMod', 'fusion', 'typePower', 'summonCost', 'kills', 'bossKills', 'damageDealt', 'wavesCleared', 'stage'].forEach(function (k) {
    if (s[k] !== undefined && s[k] !== null) g[k] = s[k];
  });
  g.maxWaves = s.maxWaves === -1 ? Infinity : s.maxWaves;
  g.selectedTower = g.deck[0];
  game = g;
  resetBoard();
  recomputeMods();
  updateCfgIndex();
  buildGridFromSave(s.grid);
  game.towers = s.towers.map(function (t) {
    var tw = new Tower(t.col, t.row, t.type, t.level);
    tw.totalSpentMana = t.totalSpentMana; tw.targeting = t.targeting || 'first'; tw.dealt = t.dealt || 0; tw.kills = t.kills || 0;
    tw.spawnAnim = 0;
    return tw;
  });
  enterGameScreen();
  if (s.pendingBoon) offerRunBoon(s.pendingBias);
}

function onResize() {
  if (!grid || $('gameScreen').hidden) return;
  layoutGrid();
  game.towers.forEach(function (t) { var p = tileCenter(t.col, t.row); t.x = p.x; t.y = p.y; });
}
