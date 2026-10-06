/* =========================================================
   MODOS: Desafío diario y Expedición (mapa roguelike)
   ========================================================= */

/* ---------- Desafío diario ---------- */
function dailySetup() {
  var dk = todayKey();
  var seed = hashStr('rr-daily-' + dk);
  var r = mulberry32(seed);
  var hero = HERO_ORDER[Math.floor(r() * HERO_ORDER.length)];
  var aa = TOWER_ORDER.filter(function (t) { return TOWER_TYPES[t].antiAir; });
  var first = aa[Math.floor(r() * aa.length)];
  var rest = shuffle(TOWER_ORDER.filter(function (t) { return t !== first; }), r).slice(0, 4);
  var mod = DAILY_MODS[Math.floor(r() * DAILY_MODS.length)];
  return { date: dk, seed: seed, hero: hero, deck: [first].concat(rest), mod: mod };
}

/* ---------- Expedición ---------- */
var EXP_KEY = 'rushRoyaleRogue_exp_v1';
var EXP_ROWS = 10;
var expRun = lsGet(EXP_KEY, null);
function saveExp() { if (expRun) lsSet(EXP_KEY, expRun); }
function clearExpedition() { expRun = null; lsDel(EXP_KEY); }

var EXP_NODE_INFO = {
  combat:   { icon: '⚔️', name: 'Combate',  color: '#e94560' },
  elite:    { icon: '💀', name: 'Élite',    color: '#ff8f3c' },
  shop:     { icon: '🛒', name: 'Tienda',   color: '#4ecdc4' },
  event:    { icon: '❓', name: 'Evento',   color: '#c9a2ff' },
  rest:     { icon: '🔥', name: 'Hoguera',  color: '#ffb020' },
  treasure: { icon: '🎁', name: 'Tesoro',   color: '#ffd166' },
  boss:     { icon: '👑', name: 'Jefe',     color: '#ff2e63' }
};

function genExpMap(seed) {
  var r = mulberry32(seed);
  var rows = [];
  for (var row = 0; row < EXP_ROWS; row++) {
    var n = row === EXP_ROWS - 1 ? 1 : row === 0 ? 3 : 2 + Math.floor(r() * 3);
    var nodes = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? 0.5 : 0.14 + (0.72 * i / (n - 1)) + (r() - 0.5) * 0.08;
      var type;
      if (row === 0) type = 'combat';
      else if (row === EXP_ROWS - 1) type = 'boss';
      else if (row === EXP_ROWS - 2) type = 'rest';
      else if (row === 4 && i === Math.floor(n / 2)) type = 'treasure';
      else {
        var w = [['combat', 45], ['event', 22]];
        if (row >= 2) w.push(['shop', 13]);
        if (row >= 3) w.push(['elite', 13]);
        if (row >= 3 && row <= 6) w.push(['rest', 7]);
        type = weightedPick(w, r);
      }
      nodes.push({ id: row + '-' + i, row: row, i: i, x: clamp(x, 0.08, 0.92), type: type, next: [] });
    }
    rows.push(nodes);
  }
  for (var rr = 0; rr < EXP_ROWS - 1; rr++) {
    var cur = rows[rr], nxt = rows[rr + 1];
    cur.forEach(function (node) {
      var sorted = nxt.slice().sort(function (a, b) { return Math.abs(a.x - node.x) - Math.abs(b.x - node.x); });
      node.next.push(sorted[0].id);
      if (sorted[1] && r() < 0.45) node.next.push(sorted[1].id);
    });
    nxt.forEach(function (nn) {
      var hasIn = cur.some(function (c) { return c.next.indexOf(nn.id) !== -1; });
      if (!hasIn) {
        var nearest = cur.slice().sort(function (a, b) { return Math.abs(a.x - nn.x) - Math.abs(b.x - nn.x); })[0];
        nearest.next.push(nn.id);
      }
    });
  }
  return rows;
}
function expNode(id) {
  if (!expRun || !id) return null;
  var row = +id.split('-')[0];
  return expRun.map[row] ? expRun.map[row].find(function (n) { return n.id === id; }) : null;
}
function expAvailable() {
  if (!expRun) return [];
  if (!expRun.pos) return expRun.map[0].map(function (n) { return n.id; });
  if (expRun.cleared.indexOf(expRun.pos) === -1) return [];
  var n = expNode(expRun.pos);
  return n ? n.next.slice() : [];
}
function expInProgressCombat() {
  if (!expRun || !expRun.pos || expRun.cleared.indexOf(expRun.pos) !== -1) return false;
  var n = expNode(expRun.pos);
  return n && (n.type === 'combat' || n.type === 'elite' || n.type === 'boss');
}

function startExpedition() {
  var s = loadSavedRun();
  if (s && s.mode === 'expedition') clearSavedRun();
  var seed = Math.floor(Math.random() * 1e9);
  expRun = {
    seed: seed, map: genExpMap(seed), pos: null, cleared: [],
    lives: START_LIVES + metaUpgradeLevel('lives') * 2, gold: 0, boons: [], rerolls: 1, phoenixUsed: false,
    hero: meta.hero, deck: meta.deck.slice(),
    finalBoss: pickOne(['dragon', 'shadow', 'emperor'], mulberry32(seed + 7))
  };
  saveExp();
  go('expMap');
}

function stageForNode(node) {
  var row = node.row;
  var st = {
    row: row, kind: node.type, cfgIndex: Math.min(6, Math.floor(row * 0.72)), waves: 3, hpMult: 1,
    seed: hashStr(expRun.seed + ':' + node.id), biome: LEVEL_BIOME[Math.min(7, Math.floor(row * 0.8))],
    title: 'Combate', mana: START_MANA + metaUpgradeLevel('mana') * 15 + row * 110
  };
  if (node.type === 'elite') {
    st.hpMult = 1.2;
    st.bossKind = pickOne(['king', 'necro', 'colossus', 'witch'], mulberry32(st.seed));
    st.bossHp = 0.55;
    st.title = 'Élite: ' + BOSS_TYPES[st.bossKind].name;
  } else if (node.type === 'boss') {
    st.cfgIndex = 6;
    st.waves = 4;
    st.bossKind = expRun.finalBoss;
    st.bossHp = 1.1;
    st.biome = 'castillo';
    st.title = 'Jefe final: ' + BOSS_TYPES[st.bossKind].name;
  }
  return st;
}

function enterExpNode(id) {
  if (expAvailable().indexOf(id) === -1) return;
  var node = expNode(id);
  expRun.pos = id;
  saveExp();
  sfxPlace();
  if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
    clearSavedRun();
    startExpStage(node);
  } else if (node.type === 'shop') {
    if (!node.shop) node.shop = genShop(node);
    saveExp();
    go('expShop');
  } else if (node.type === 'event') {
    go('expEvent');
  } else if (node.type === 'rest') {
    go('expRest');
  } else if (node.type === 'treasure') {
    var gold = 40 + Math.floor(Math.random() * 31);
    expRun.gold += gold;
    markExpCleared();
    sfxChestOpen();
    showBoonPick({ holder: expRun, bias: 'elite', title: '🎁 ¡Tesoro! +' + gold + ' de oro', sub: 'Además, elige una bendición.', onPick: function (bid) { applyExpInstant(bid); saveExp(); go('expMap'); } });
  }
}
function startExpStage(node) {
  var st = stageForNode(node);
  startGame({ mode: 'expedition', stage: st });
}
function markExpCleared() {
  if (expRun.cleared.indexOf(expRun.pos) === -1) expRun.cleared.push(expRun.pos);
  saveExp();
}
function applyExpInstant(id) { if (id === 'muralla') expRun.lives += 4; }

// La llama game.js al superar la última ola de un combate de expedición.
function expeditionStageWon() {
  var node = expNode(expRun.pos);
  expRun.lives = game.lives;
  expRun.phoenixUsed = game.phoenixUsed;
  if (!node || node.type === 'boss') { winRun(); return; }
  addStat('kills', game.kills);
  addStat('bosses', game.bossKills);
  meta.xp = (meta.xp || 0) + game.kills + game.wavesCleared * 5;
  saveMeta();
  var gold = node.type === 'elite' ? 50 + node.row * 4 : 25 + node.row * 3;
  expRun.gold += gold;
  markExpCleared();
  clearSavedRun();
  game.ended = true;
  showBigBanner('¡Superado!', '+' + gold + ' de oro');
  sfxLevelUp();
  laterForRun(function () {
    showBoonPick({
      holder: expRun, bias: node.type === 'elite' ? 'elite' : null,
      title: 'Elige una bendición', sub: 'Te acompañará el resto de la expedición.',
      onPick: function (bid) { applyExpInstant(bid); saveExp(); go('expMap'); }
    });
  }, 1100);
}

/* ---------- tienda ---------- */
var SHOP_PRICES = { comun: 45, rara: 70, epica: 105 };
function genShop(node) {
  var ids = rollBoonChoices(expRun.boons, expRun.deck, 'elite');
  return { items: ids.map(function (id) { return { id: id, price: SHOP_PRICES[getBoonDef(id).rarity], sold: false }; }), heal: false };
}
function buyShopItem(i) {
  var node = expNode(expRun.pos);
  var it = node.shop.items[i];
  if (!it || it.sold) return;
  if (expRun.gold < it.price) { showToast('Te falta oro'); sfxBlocked(); return; }
  expRun.gold -= it.price;
  it.sold = true;
  expRun.boons.push(it.id);
  applyExpInstant(it.id);
  sfxBuy();
  saveExp();
  rerenderMenu();
}
function buyShopHeal() {
  var node = expNode(expRun.pos);
  if (node.shop.heal) return;
  if (expRun.gold < 30) { showToast('Te falta oro'); sfxBlocked(); return; }
  expRun.gold -= 30;
  expRun.lives += 5;
  node.shop.heal = true;
  sfxBuy();
  saveExp();
  rerenderMenu();
}
function leaveExpNode() { markExpCleared(); go('expMap'); }

/* ---------- hoguera ---------- */
function restChoice(kind) {
  if (kind === 'heal') {
    expRun.lives += 6;
    showToast('+6 vidas');
  } else {
    var types = expRun.deck.filter(function (t) { return !TOWER_TYPES[t].support; });
    var t = pickOne(types);
    expRun.boons.push('esp_' + t);
    showToast(TOWER_TYPES[t].symbol + ' Maestría ' + TOWER_TYPES[t].name);
  }
  sfxLevelUp();
  leaveExpNode();
}

/* ---------- eventos ---------- */
function grantRandomBoon(rarity) {
  var pool = Object.keys(BOONS).filter(function (id) { return BOONS[id].rarity === rarity && !(BOONS[id].unique && expRun.boons.indexOf(id) !== -1); });
  var id = pickOne(pool);
  expRun.boons.push(id);
  applyExpInstant(id);
  var b = getBoonDef(id);
  return b.icon + ' ' + b.name;
}
var EXP_EVENTS = [
  {
    id: 'fuente', icon: '⛲', title: 'La fuente encantada',
    text: 'Un manantial de agua brillante brota entre las rocas. Huele a magia antigua.',
    choices: [
      { label: 'Beber', desc: '+5 vidas', run: function () { expRun.lives += 5; return 'Te sientes renovado. +5 vidas.'; } },
      { label: 'Llenar frascos', desc: '+35 de oro', run: function () { expRun.gold += 35; return 'Un alquimista te los compra encantado. +35 de oro.'; } }
    ]
  },
  {
    id: 'mercader', icon: '🧙', title: 'El mercader errante',
    text: 'Un anciano encapuchado te ofrece una reliquia. No quiere oro: quiere parte de tu fuerza vital.',
    choices: [
      { label: 'Aceptar', desc: '−3 vidas · bendición épica', can: function () { return expRun.lives > 3; }, run: function () { expRun.lives -= 3; return 'La reliquia vibra en tus manos: ' + grantRandomBoon('epica') + '.'; } },
      { label: 'Marcharse', desc: 'Nada', run: function () { return 'El anciano se encoge de hombros y desaparece en la niebla.'; } }
    ]
  },
  {
    id: 'altar', icon: '🗿', title: 'El altar oscuro',
    text: 'Un altar cubierto de runas pide una ofrenda. A su lado, un cofre de oro sin vigilancia.',
    choices: [
      { label: 'Ofrenda', desc: '−40 de oro · bendición rara', can: function () { return expRun.gold >= 40; }, run: function () { expRun.gold -= 40; return 'Las runas se iluminan: ' + grantRandomBoon('rara') + '.'; } },
      { label: 'Saquear', desc: '+70 de oro · −3 vidas', can: function () { return expRun.lives > 3; }, run: function () { expRun.gold += 70; expRun.lives -= 3; return 'Una maldición te alcanza mientras huyes. +70 de oro, −3 vidas.'; } }
    ]
  },
  {
    id: 'herrero', icon: '⚒️', title: 'El herrero enano',
    text: 'Un enano de barba trenzada martillea junto al camino. Dice que puede mejorar una de tus torres.',
    choices: [
      { label: 'Forjar', desc: '−30 de oro · Maestría al azar', can: function () { return expRun.gold >= 30; }, run: function () {
        expRun.gold -= 30;
        var t = pickOne(expRun.deck.filter(function (x) { return !TOWER_TYPES[x].support; }));
        expRun.boons.push('esp_' + t);
        return '¡Obra maestra! Maestría ' + TOWER_TYPES[t].name + '.';
      } },
      { label: 'Charlar', desc: '+15 de oro', run: function () { expRun.gold += 15; return 'Te cuenta batallitas y te invita a una cerveza. +15 de oro.'; } }
    ]
  },
  {
    id: 'cofre', icon: '📦', title: 'El cofre misterioso',
    text: 'Un cofre cerrado tiembla ligeramente. ¿Tesoro o trampa?',
    choices: [
      { label: 'Abrir', desc: '50%: bendición rara · 50%: −4 vidas', run: function () {
        if (Math.random() < 0.5) return '¡Tesoro! ' + grantRandomBoon('rara') + '.';
        expRun.lives = Math.max(1, expRun.lives - 4);
        return '¡Era un mímico! Te muerde antes de escapar. −4 vidas.';
      } },
      { label: 'Ignorar', desc: 'Nada', run: function () { return 'Mejor no tentar a la suerte.'; } }
    ]
  },
  {
    id: 'viajero', icon: '🧳', title: 'El viajero perdido',
    text: 'Un comerciante se ha perdido y te pide ayuda para volver al camino real.',
    choices: [
      { label: 'Ayudar', desc: '−20 de oro · +15 gemas', can: function () { return expRun.gold >= 20; }, run: function () { expRun.gold -= 20; meta.gems += 15; saveMeta(); return 'Agradecido, te regala unas gemas brillantes. +15 💎.'; } },
      { label: 'Seguir', desc: 'Nada', run: function () { return 'Le indicas el norte y sigues tu camino.'; } }
    ]
  },
  {
    id: 'bardo', icon: '🎻', title: 'La bardo',
    text: 'Una bardo toca junto a una hoguera. Sus canciones dan ánimos a cualquiera.',
    choices: [
      { label: 'Escuchar', desc: 'Una tirada extra de bendición', run: function () { expRun.rerolls += 1; return 'Te sientes con suerte. +1 cambio de opciones.'; } },
      { label: 'Pagarle', desc: '−25 de oro · bendición común', can: function () { return expRun.gold >= 25; }, run: function () { expRun.gold -= 25; return 'Compone una balada en tu honor: ' + grantRandomBoon('comun') + '.'; } }
    ]
  }
];
function currentExpEvent() {
  var node = expNode(expRun.pos);
  var idx = hashStr(expRun.seed + ':' + node.id) % EXP_EVENTS.length;
  return EXP_EVENTS[idx];
}
var _expEventResult = null;
function chooseExpEvent(i) {
  var ev = currentExpEvent();
  var ch = ev.choices[i];
  if (ch.can && !ch.can()) { showToast('No puedes elegir eso'); sfxBlocked(); return; }
  _expEventResult = ch.run();
  markExpCleared();
  sfxBuy();
  rerenderMenu();
}
