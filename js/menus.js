/* =========================================================
   MENÚS: enrutador sencillo que pinta cada pantalla en
   #menuRoot. El estado vive en menuState.
   ========================================================= */
var menuState = { screen: 'home', params: {} };
var deckSwap = null; // carta elegida para entrar al mazo

function showScreen(id) {
  ['menuRoot', 'gameScreen'].forEach(function (sid) { var el = $(sid); if (el) el.hidden = sid !== id; });
}
function go(screen, params) {
  menuState = { screen: screen, params: params || {} };
  if (screen !== 'deck') deckSwap = null;
  closeModal();
  showScreen('menuRoot');
  renderMenu();
  $('menuRoot').scrollTop = 0;
  if (screen === 'expMap') setTimeout(scrollExpMap, 30);
}
function rerenderMenu() {
  if ($('menuRoot').hidden) return;
  var st = $('menuRoot').scrollTop;
  renderMenu();
  $('menuRoot').scrollTop = st;
}
function renderMenu() {
  var fn = SCREENS[menuState.screen] || SCREENS.home;
  $('menuRoot').innerHTML = '<div class="menu-card screen-' + menuState.screen + '">' + fn(menuState.params) + '</div>';
}
function topBar(title, back) {
  return '<div class="topbar">' +
    '<button class="menu-back" onclick="go(\'' + (back || 'home') + '\')">&larr;</button>' +
    '<h2>' + title + '</h2>' +
    '<div class="gem-chip">💎 ' + fmt(meta.gems) + '</div></div>';
}
function badge(n) { return n ? '<span class="badge">' + n + '</span>' : ''; }

/* ---------- modal genérico ---------- */
function openModal(html) {
  var m = $('modal');
  m.innerHTML = '<div class="modal-card">' + html + '</div>';
  m.hidden = false;
}
function closeModal() {
  var m = $('modal');
  if (!m) return;
  m.hidden = true;
  // Si era el aviso de salir de la partida, se reanuda el juego.
  if (m.onQuitClose) { var f = m.onQuitClose; m.onQuitClose = null; f(); }
}

var SCREENS = {};

/* ---------- INICIO ---------- */
SCREENS.home = function () {
  var saved = loadSavedRun();
  var lv = accountLevel(), xpNow = (meta.xp || 0) - xpForLevel(lv), xpNeed = xpForLevel(lv + 1) - xpForLevel(lv);
  var h = HEROES[meta.hero];
  var tiles = [
    ['deck', '🃏', 'Mazo', '', 0],
    ['heroes', '🦸', 'Héroes', '', 0],
    ['chests', '🎁', 'Cofres', freeChestAvailable() ? '¡Gratis!' : '', freeChestAvailable() ? 1 : 0],
    ['upgrades', '⬆️', 'Mejoras', '', 0],
    ['profile', '🏅', 'Logros', '', claimableAchievements()],
    ['guide', '📖', 'Guía', '', 0],
    ['news', '📰', 'Novedades', '', meta.seenVersion !== APP_VERSION ? 1 : 0],
    ['others', '⚙️', 'Ajustes', '', 0]
  ];
  var cont = '';
  if (saved) {
    cont += '<button class="menu-btn continue-btn" onclick="continueSavedGame()">▶ Continuar<small>' + MODES[saved.mode].icon + ' ' + MODES[saved.mode].name + ' · ' + (saved.mode === 'survival' ? 'Ola ' + saved.wave : 'Nivel ' + saved.level + ' · Ola ' + saved.wave) + '</small></button>';
  } else if (expRun) {
    cont += '<button class="menu-btn continue-btn" onclick="go(\'expMap\')">🗺️ Seguir la expedición<small>❤️ ' + expRun.lives + ' · 🪙 ' + expRun.gold + ' · ' + expRun.boons.length + ' bendiciones</small></button>';
  }
  return '' +
    '<div class="home-top">' +
    '<button class="profile-chip" onclick="go(\'profile\')"><img src="assets/heroes/' + meta.hero + '.svg" alt="" style="--hc:' + h.color + '"><span><b>' + escapeHtml(meta.name) + '</b><small>Nivel ' + lv + '</small><i class="xpbar"><i style="width:' + Math.round(xpNow / xpNeed * 100) + '%"></i></i></span></button>' +
    '<div class="gem-chip big">💎 ' + fmt(meta.gems) + '</div></div>' +
    '<div class="logo-wrap"><img class="logo" src="assets/logo.svg" alt="Rush Royale Roguelike"></div>' +
    cont +
    '<button class="play-btn" onclick="go(\'modes\')"><span>⚔️ Jugar</span><small>7 modos de juego</small></button>' +
    '<div class="tile-grid">' + tiles.map(function (t) {
      return '<button class="tile" onclick="go(\'' + t[0] + '\')"><span class="tile-ic">' + t[1] + '</span><span>' + t[2] + '</span>' + (t[3] ? '<small>' + t[3] + '</small>' : '') + badge(t[4]) + '</button>';
    }).join('') + '</div>' +
    '<p class="footer">v' + APP_VERSION + ' · Fan game no oficial inspirado en Rush Royale. Sin anuncios ni compras.</p>';
};

/* ---------- MODOS ---------- */
SCREENS.modes = function () {
  var h = HEROES[meta.hero];
  var advStars = 0; for (var k in meta.adventure) advStars += meta.adventure[k];
  var extra = {
    classic: stat('classicWins') ? '🏆 ' + stat('classicWins') + ' victorias' : '',
    adventure: '⭐ ' + advStars + '/24',
    survival: stat('bestSurvival') ? 'Récord: ola ' + stat('bestSurvival') : '',
    fusion: stat('bestRank') ? 'Mejor rango: ' + stat('bestRank') : '',
    daily: meta.daily && meta.daily.date === todayKey() ? (meta.daily.done ? '✅ Hecho hoy · ' : '') + 'Récord ' + fmt(meta.daily.best || 0) : 'Nuevo reto hoy',
    expedition: expRun ? '🗺️ En curso' : (stat('expeditionWins') ? '🏆 ' + stat('expeditionWins') : ''),
    bossrush: stat('bossrushWins') ? '🏆 ' + stat('bossrushWins') : ''
  };
  return topBar('Elige modo') +
    '<button class="loadout" onclick="go(\'deck\')">' +
    '<img class="loadout-hero" src="assets/heroes/' + meta.hero + '.svg" alt="" style="--hc:' + h.color + '">' +
    '<span class="loadout-info"><b>' + h.name + '</b><small>' + h.ability.icon + ' ' + h.ability.name + '</small></span>' +
    '<span class="loadout-deck">' + meta.deck.map(function (t) { return '<img src="' + towerIconURL(t, 1) + '" alt="">'; }).join('') + '</span>' +
    '<span class="loadout-edit">Cambiar</span></button>' +
    '<div class="mode-list">' + MODE_ORDER.map(function (id, i) {
      var m = MODES[id];
      var action = id === 'adventure' ? "go('adventure')" : id === 'daily' ? "go('daily')" : id === 'expedition' ? (expRun ? "go('expMap')" : 'startExpedition()') : "startGame({ mode: '" + id + "' })";
      return '<button class="mode-card" style="--mc:' + m.color + ';animation-delay:' + (i * 0.04) + 's" onclick="' + action + '">' +
        '<span class="mode-ic">' + m.icon + '</span>' +
        '<span class="mode-txt"><b>' + m.name + '</b><small>' + m.desc + '</small>' + (extra[id] ? '<em>' + extra[id] + '</em>' : '') + '</span></button>';
    }).join('') + '</div>';
};

/* ---------- AVENTURA ---------- */
SCREENS.adventure = function () {
  return topBar('Aventura', 'modes') +
    '<p class="menu-hint">Cada nivel tiene su mapa fijo y su jefe. Termina sin perder vidas para llevarte las tres estrellas.</p>' +
    '<div class="adventure-levels">' + ADVENTURE_LEVELS.map(function (lv) {
      var cfg = LEVEL_CONFIGS[lv.level - 1];
      var stars = meta.adventure[lv.level] || 0;
      var unlocked = lv.level === 1 || meta.adventure[lv.level - 1];
      var boss = BOSS_TYPES[LEVEL_BOSS[lv.level - 1]];
      return '<button class="adventure-level-btn' + (unlocked ? '' : ' locked') + '" style="--bc:' + BIOMES[LEVEL_BIOME[lv.level - 1]].edge + '" ' +
        (unlocked ? 'onclick="startGame({ mode: \'adventure\', level: ' + lv.level + ' })"' : 'onclick="showToast(\'Supera el nivel anterior\')"') + '>' +
        '<span class="adventure-level-num">' + (unlocked ? lv.level : '🔒') + '</span>' +
        '<span class="adventure-level-text"><strong>' + lv.name + '</strong>' +
        '<span>' + BIOMES[LEVEL_BIOME[lv.level - 1]].name + ' · ' + cfg.enemies + ' enemigos · 👑 ' + boss.name + '</span></span>' +
        '<span class="lvl-stars">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= stars ? 'on' : '') + '">★</i>'; }).join('') + '</span>' +
        '</button>';
    }).join('') + '</div>';
};

/* ---------- DESAFÍO DIARIO ---------- */
SCREENS.daily = function () {
  var d = dailySetup();
  var h = HEROES[d.hero];
  var today = meta.daily && meta.daily.date === todayKey() ? meta.daily : { best: 0, done: false };
  return topBar('Desafío diario', 'modes') +
    '<div class="daily-card">' +
    '<div class="daily-date">📅 ' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>' +
    '<div class="daily-mod-big"><span>' + d.mod.icon + '</span><b>' + d.mod.name + '</b><small>' + d.mod.desc + '</small></div>' +
    '<div class="daily-row"><img class="hero-mini" src="assets/heroes/' + d.hero + '.svg" style="--hc:' + h.color + '" alt=""><div><b>' + h.name + '</b><small>' + h.ability.icon + ' ' + h.ability.name + '</small></div></div>' +
    '<div class="daily-deck">' + d.deck.map(function (t) { return '<div class="mini-card r-' + TOWER_TYPES[t].rarity + '"><img src="' + towerIconURL(t, 1) + '" alt=""><span>' + TOWER_TYPES[t].name + '</span></div>'; }).join('') + '</div>' +
    '<p class="menu-hint">Cinco niveles. Todas las cartas a nivel 3 para que sea justo. La primera vez que lo completes cada día ganas 40 💎.</p>' +
    '<div class="daily-score">Récord de hoy: <b>' + fmt(today.best || 0) + '</b>' + (today.done ? ' · ✅ Completado' : '') + '</div>' +
    '<button class="menu-btn menu-btn-primary" onclick="startGame({ mode: \'daily\' })">Jugar el reto</button>' +
    '</div>';
};

/* ---------- MAZO Y COLECCIÓN ---------- */
function cardHTML(t, opts) {
  opts = opts || {};
  var d = TOWER_TYPES[t];
  var owned = ownsTower(t);
  var c = meta.cards[t];
  var lv = owned ? c.level : 0;
  var need = owned && lv < CARD_MAX_LEVEL ? CARD_COPIES[lv] : 0;
  var canUp = owned && lv < CARD_MAX_LEVEL && c.copies >= need;
  return '<button class="card r-' + d.rarity + (owned ? '' : ' locked') + (opts.inDeck ? ' in-deck' : '') + (opts.swapTarget ? ' swap-target' : '') + (canUp ? ' can-up' : '') + '" ' +
    'style="--rc:' + RARITY[d.rarity].color + '" onclick="' + (opts.onclick || ('openCard(\'' + t + '\')')) + '">' +
    '<span class="card-lv">' + (owned ? 'Nv ' + lv : '🔒') + '</span>' +
    (d.antiAir ? '<span class="card-aa" title="Antiaérea">✈</span>' : '') +
    '<img src="' + towerIconURL(t, 1) + '" alt="">' +
    '<span class="card-name">' + d.name + '</span>' +
    (owned && lv < CARD_MAX_LEVEL ? '<span class="card-bar"><i style="width:' + Math.min(100, c.copies / need * 100) + '%"></i><em>' + c.copies + '/' + need + '</em></span>' : (owned ? '<span class="card-bar max"><em>Máximo</em></span>' : '<span class="card-bar"><em>' + RARITY[d.rarity].name + '</em></span>')) +
    '</button>';
}
SCREENS.deck = function () {
  var h = HEROES[meta.hero];
  var hasAA = meta.deck.some(function (t) { return TOWER_TYPES[t].antiAir; });
  var swapping = deckSwap ? '<div class="swap-banner">Toca la carta del mazo que quieres cambiar por <b>' + TOWER_TYPES[deckSwap].name + '</b> <button class="ghost-btn" onclick="deckSwap=null;rerenderMenu()">Cancelar</button></div>' : '';
  return topBar('Mazo') +
    '<button class="hero-banner" style="--hc:' + h.color + '" onclick="go(\'heroes\')">' +
    '<img src="assets/heroes/' + meta.hero + '.svg" alt="">' +
    '<span><b>' + h.name + '</b><small>' + h.title + '</small><small>' + h.ability.icon + ' ' + h.ability.name + '</small></span><em>Cambiar</em></button>' +
    '<h3 class="section-title">Tu mazo</h3>' + swapping +
    '<div class="deck-slots">' + meta.deck.map(function (t, i) {
      return cardHTML(t, { inDeck: true, swapTarget: !!deckSwap, onclick: deckSwap ? 'swapDeckSlot(' + i + ')' : 'openCard(\'' + t + '\')' });
    }).join('') + '</div>' +
    (hasAA ? '' : '<p class="warn-line">⚠️ Tu mazo no tiene torres antiaéreas: los murciélagos pasarán sin que puedas tocarlos.</p>') +
    '<h3 class="section-title">Colección <small>' + Object.keys(meta.cards).length + '/' + TOWER_ORDER.length + '</small></h3>' +
    '<div class="card-grid">' + TOWER_ORDER.filter(function (t) { return meta.deck.indexOf(t) === -1; }).map(function (t) { return cardHTML(t); }).join('') + '</div>' +
    '<p class="menu-hint">Consigue copias en los cofres para subir de nivel tus cartas: cada nivel da un 8% más de daño.</p>';
};
function openCard(t) {
  var d = TOWER_TYPES[t];
  var owned = ownsTower(t);
  var c = meta.cards[t];
  var lv = owned ? c.level : 1;
  var need = owned && lv < CARD_MAX_LEVEL ? CARD_COPIES[lv] : 0;
  var gems = owned ? cardUpgradeGems(lv) : 0;
  var inDeck = meta.deck.indexOf(t) !== -1;
  var dmg = d.support ? '—' : fmt(d.damage * cardDmgMult(lv));
  var btns = '';
  if (owned && lv < CARD_MAX_LEVEL) btns += '<button class="menu-btn menu-btn-primary" ' + (c.copies >= need ? '' : 'disabled') + ' onclick="upgradeCard(\'' + t + '\'); openCard(\'' + t + '\')">Mejorar ' + gems + ' 💎</button>';
  if (owned && !inDeck) btns += '<button class="menu-btn" onclick="startDeckSwap(\'' + t + '\')">Al mazo</button>';
  openModal(
    '<button class="modal-x" onclick="closeModal()">✕</button>' +
    '<div class="card-detail r-' + d.rarity + '" style="--rc:' + RARITY[d.rarity].color + '">' +
    '<img src="' + towerIconURL(t, Math.min(5, lv)) + '" alt="">' +
    '<span class="rarity-tag">' + RARITY[d.rarity].name + '</span>' +
    '<h2>' + d.symbol + ' ' + d.name + '</h2>' +
    '<p>' + d.desc + '</p>' +
    '<div class="stat-grid">' +
    '<span>Daño<b>' + dmg + '</b></span>' +
    '<span>Velocidad<b>' + (d.support ? '—' : d.speed.toFixed(2) + '/s') + '</b></span>' +
    '<span>Alcance<b>' + d.rangeTiles.toFixed(1) + '</b></span>' +
    '<span>Coste<b>' + d.manaCost + ' 💧</b></span>' +
    '<span>Antiaérea<b>' + (d.antiAir ? 'Sí' : 'No') + '</b></span>' +
    '<span>Nivel<b>' + (owned ? lv + '/' + CARD_MAX_LEVEL : 'Bloqueada') + '</b></span>' +
    '</div>' +
    (owned ? (lv < CARD_MAX_LEVEL ? '<p class="muted">Copias: ' + c.copies + '/' + need + ' · Siguiente nivel: +8% de daño</p>' : '<p class="muted">¡Nivel máximo!</p>') : '<p class="muted">Consíguela en los cofres.</p>') +
    btns + '</div>');
}
function startDeckSwap(t) { deckSwap = t; closeModal(); rerenderMenu(); showToast('Elige qué carta sale del mazo'); }
function swapDeckSlot(i) {
  if (!deckSwap) return;
  meta.deck[i] = deckSwap;
  deckSwap = null;
  saveMeta();
  sfxPlace();
  rerenderMenu();
}

/* ---------- HÉROES ---------- */
SCREENS.heroes = function () {
  return topBar('Héroes', 'deck') +
    '<p class="menu-hint">Cada héroe tiene una habilidad que se carga durante las olas y una pasiva que siempre está activa.</p>' +
    '<div class="hero-list">' + HERO_ORDER.map(function (id) {
      var h = HEROES[id];
      var owned = meta.heroes[id], sel = meta.hero === id;
      var btn = sel ? '<span class="hero-sel">Elegido</span>'
        : owned ? '<button class="mini-btn upgrade" onclick="buyHero(\'' + id + '\')">Elegir</button>'
        : '<button class="mini-btn buy" onclick="buyHero(\'' + id + '\')" ' + (meta.gems < h.cost ? 'disabled' : '') + '>' + h.cost + ' 💎</button>';
      return '<div class="hero-card' + (owned ? '' : ' locked') + (sel ? ' selected' : '') + '" style="--hc:' + h.color + ';--rc:' + RARITY[h.rarity].color + '">' +
        '<img src="assets/heroes/' + id + '.svg" alt="">' +
        '<div class="hero-info"><b>' + h.name + ' <small class="rarity-tag">' + RARITY[h.rarity].name + '</small></b><span class="hero-title">' + h.title + '</span>' +
        '<span>' + h.ability.icon + ' <b>' + h.ability.name + '</b>: ' + h.ability.desc + ' <i>Recarga ' + h.ability.cd + ' s</i></span>' +
        '<span>✨ ' + h.passive + '</span></div>' + btn + '</div>';
    }).join('') + '</div>';
};

/* ---------- COFRES ---------- */
SCREENS.chests = function () {
  var free = freeChestAvailable();
  return topBar('Cofres') +
    (free ? '<div class="free-chest"><img src="assets/chests/madera.svg" alt=""><div><b>¡Cofre diario gratis!</b><small>Vuelve mañana a por otro.</small></div><button class="menu-btn menu-btn-primary" onclick="openFreeChest()">Abrir</button></div>'
          : '<div class="free-chest used"><img src="assets/chests/madera.svg" alt=""><div><b>Cofre diario</b><small>Ya lo has abierto hoy. Mañana habrá otro.</small></div></div>') +
    '<div class="chest-list">' + CHEST_ORDER.map(function (k) {
      var c = CHEST_TYPES[k];
      return '<div class="chest-card ch-' + k + '">' +
        '<img src="assets/chests/' + k + '.svg" alt="">' +
        '<b>' + c.name + '</b>' +
        '<small>' + c.cards + ' cartas' + (c.guaranteed ? ' · 1 ' + RARITY[c.guaranteed].name.toLowerCase() + ' segura' : '') + (c.heroChance ? ' · ' + Math.round(c.heroChance * 100) + '% de héroe' : '') + '</small>' +
        '<button class="menu-btn menu-btn-primary" ' + (meta.gems < c.cost ? 'disabled' : '') + ' onclick="buyChest(\'' + k + '\')">' + c.cost + ' 💎</button></div>';
    }).join('') + '</div>' +
    '<p class="menu-hint">Las cartas repetidas sirven para subir su nivel en el Mazo. Gana gemas jugando, completando logros y con el cofre diario.</p>';
};
function playChestOpening(res) {
  var ov = $('chestOverlay');
  var step = 0;
  ov.hidden = false;
  ov.innerHTML = '<div class="chest-stage"><img class="chest-big shake" src="assets/chests/' + res.kind + '.svg" alt=""><p class="chest-tap">Toca para abrir</p></div>';
  var opened = false;
  function open() {
    if (opened) return;
    opened = true;
    sfxChestOpen();
    var cards = res.cards;
    ov.innerHTML = '<div class="chest-stage"><div class="chest-burst"></div><h2>' + CHEST_TYPES[res.kind].name + '</h2>' +
      '<div class="reveal-grid">' + cards.map(function (r, i) {
        var d = TOWER_TYPES[r.type];
        return '<div class="reveal-card r-' + d.rarity + '" style="--rc:' + RARITY[d.rarity].color + ';animation-delay:' + (0.25 + i * 0.18) + 's">' +
          (r.isNew ? '<span class="new-tag">¡Nueva!</span>' : '') +
          '<img src="' + towerIconURL(r.type, 1) + '" alt=""><b>' + d.name + '</b><small>×' + r.copies + '</small></div>';
      }).join('') + '</div>' +
      (res.hero ? '<div class="hero-reveal" style="animation-delay:' + (0.4 + cards.length * 0.18) + 's"><img src="assets/heroes/' + res.hero + '.svg" alt=""><b>¡Nuevo héroe: ' + HEROES[res.hero].name + '!</b></div>' : '') +
      '<button class="menu-btn menu-btn-primary chest-done" style="animation-delay:' + (0.5 + cards.length * 0.18) + 's" onclick="closeChest()">Genial</button></div>';
    cards.forEach(function (r, i) { setTimeout(function () { sfxCard(TOWER_TYPES[r.type].rarity); }, 250 + i * 180); });
  }
  var shakes = 0;
  var iv = setInterval(function () {
    if (opened) { clearInterval(iv); return; }
    sfxChestShake();
    if (++shakes >= 3) { clearInterval(iv); open(); }
  }, 450);
  ov.onclick = function (e) { if (!opened) { clearInterval(iv); open(); } };
}
function closeChest() { var ov = $('chestOverlay'); ov.hidden = true; ov.onclick = null; rerenderMenu(); }

/* ---------- MEJORAS ---------- */
SCREENS.upgrades = function () {
  return topBar('Mejoras') +
    '<p class="menu-hint">Ganas gemas al terminar cada partida, más cuanto más lejos llegues. Las mejoras valen para todas las partidas.</p>' +
    '<div class="upgrade-list">' + UPGRADE_DEFS.map(function (def) {
      var lv = metaUpgradeLevel(def.id);
      var maxed = lv >= def.maxLevel;
      var cost = maxed ? 0 : def.cost(lv);
      return '<div class="upgrade-item' + (maxed ? ' maxed' : '') + '">' +
        '<div class="ic">' + def.icon + '</div>' +
        '<div class="info"><strong>' + def.name + '</strong><span>' + def.desc + '</span>' +
        '<span class="pips">' + Array.from({ length: def.maxLevel }, function (_, i) { return '<i class="' + (i < lv ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
        '<button ' + (maxed || meta.gems < cost ? 'disabled' : '') + ' onclick="buyUpgrade(\'' + def.id + '\')">' + (maxed ? 'Máx' : cost + ' 💎') + '</button></div>';
    }).join('') + '</div>';
};

/* ---------- PERFIL Y LOGROS ---------- */
SCREENS.profile = function () {
  var lv = accountLevel(), xpNow = (meta.xp || 0) - xpForLevel(lv), xpNeed = xpForLevel(lv + 1) - xpForLevel(lv);
  var stars = 0; for (var k in meta.adventure) stars += meta.adventure[k];
  var stats = [
    ['⚔️', 'Bajas', fmt(stat('kills'))], ['👑', 'Jefes', fmt(stat('bosses'))], ['🎮', 'Partidas', fmt(stat('runs'))],
    ['♾️', 'Récord supervivencia', stat('bestSurvival')], ['⭐', 'Estrellas', stars + '/24'], ['🧬', 'Mejor rango', stat('bestRank') || 0],
    ['🗺️', 'Expediciones', stat('expeditionWins')], ['📅', 'Diarios', stat('dailyWins')], ['🎁', 'Cofres', stat('chests')]
  ];
  var achs = ACHIEVEMENTS.map(function (a) {
    var s = achievementState(a);
    return '<div class="ach' + (s.claimed ? ' claimed' : s.done ? ' done' : '') + '">' +
      '<span class="ach-ic">' + a.icon + '</span>' +
      '<div class="ach-info"><b>' + a.name + '</b><small>' + a.desc + '</small><i class="xpbar"><i style="width:' + Math.round(s.value / a.goal * 100) + '%"></i></i><small>' + fmt(s.value) + '/' + fmt(a.goal) + '</small></div>' +
      (s.claimed ? '<span class="ach-ok">✓</span>' : s.done ? '<button class="mini-btn buy" onclick="claimAchievement(\'' + a.id + '\')">+' + a.gems + ' 💎</button>' : '<span class="ach-rw">' + a.gems + ' 💎</span>') +
      '</div>';
  }).join('');
  return topBar('Perfil') +
    '<div class="profile-card">' +
    '<img src="assets/heroes/' + meta.hero + '.svg" alt="" style="--hc:' + HEROES[meta.hero].color + '">' +
    '<div><input id="nameInput" maxlength="16" value="' + escapeHtml(meta.name) + '" onchange="setPlayerName(this.value)" aria-label="Nombre">' +
    '<small>Nivel de cuenta ' + lv + ' · ' + fmt(xpNow) + '/' + fmt(xpNeed) + ' XP</small><i class="xpbar"><i style="width:' + Math.round(xpNow / xpNeed * 100) + '%"></i></i>' +
    '<small>Cada nivel de cuenta regala 20 💎</small></div></div>' +
    '<div class="stat-tiles">' + stats.map(function (s) { return '<div><span>' + s[0] + '</span><b>' + s[2] + '</b><small>' + s[1] + '</small></div>'; }).join('') + '</div>' +
    '<h3 class="section-title">Logros <small>' + ACHIEVEMENTS.filter(function (a) { return achievementState(a).claimed; }).length + '/' + ACHIEVEMENTS.length + '</small></h3>' +
    '<div class="ach-list">' + achs + '</div>';
};
function setPlayerName(v) { meta.name = (v || '').trim().slice(0, 16) || 'Jugador'; saveMeta(); }

/* ---------- GUÍA ---------- */
SCREENS.guide = function (p) {
  var tab = p.tab || 'towers';
  var tabs = [['towers', 'Torres'], ['enemies', 'Enemigos'], ['bosses', 'Jefes'], ['tips', 'Consejos']];
  var body = '';
  if (tab === 'towers') {
    body = TOWER_ORDER.map(function (t) {
      var d = TOWER_TYPES[t];
      return '<div class="guide-row" style="--rc:' + RARITY[d.rarity].color + '"><img src="' + towerIconURL(t, 3) + '" alt=""><div><b>' + d.name + ' <small class="rarity-tag">' + RARITY[d.rarity].name + '</small></b><small>' + d.desc + '</small>' +
        '<small class="muted">Daño ' + (d.support ? '—' : d.damage) + ' · Vel ' + (d.support ? '—' : d.speed) + ' · Alcance ' + d.rangeTiles + ' · ' + d.manaCost + ' 💧' + (d.antiAir ? ' · ✈ antiaérea' : '') + '</small></div></div>';
    }).join('');
  } else if (tab === 'enemies') {
    body = ENEMY_GUIDE_ORDER.map(function (id) {
      var e = ENEMY_TYPES[id];
      return '<div class="guide-row"><img src="' + enemyIconURL(id) + '" alt=""><div><b>' + e.name + '</b><small>' + e.desc + '</small>' +
        '<small class="muted">Vida ×' + e.healthMult + ' · Velocidad ×' + e.speedMult + (e.armor ? ' · Armadura ' + Math.round(e.armor * 100) + '%' : '') + '</small></div></div>';
    }).join('') + '<p class="menu-hint">Los enemigos con aro dorado son élites: más vida, más rápidos y dan el doble de maná.</p>';
  } else if (tab === 'bosses') {
    body = BOSS_ORDER.map(function (id) {
      var b = BOSS_TYPES[id];
      return '<div class="guide-row boss" style="--rc:' + b.color + '"><img src="' + enemyIconURL('boss', id) + '" alt=""><div><b>' + b.name + '</b><small>' + b.desc + '</small><small class="muted">Vida ×' + b.hpMult + (b.armor ? ' · Armadura ' + Math.round(b.armor * 100) + '%' : '') + '</small></div></div>';
    }).join('');
  } else {
    body = '<ul class="tips">' + [
      'Coloca las torres en las curvas: el enemigo pasa más tiempo dentro de su alcance.',
      'El Arcano maldice: junto a torres de mucho daño multiplica la potencia del grupo.',
      'Las Sombras resisten el daño físico. Lleva Rayo, Veneno, Arcano o Cronomante.',
      'El Alquimista no dispara, pero rodeado de torres fuertes es la mejor inversión.',
      'Cambia la prioridad de disparo de cada torre: el Francotirador rinde más contra el más fuerte.',
      'Guarda la habilidad del héroe para el jefe o para una avalancha de enemigos.',
      'En Fusión, potenciar un tipo mejora todas sus torres, también las que invoques después.',
      'En la Expedición las vidas no se recuperan solas: las hogueras y la fuente son tus amigas.'
    ].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }
  return topBar('Guía') +
    '<div class="tabs">' + tabs.map(function (t) { return '<button class="' + (t[0] === tab ? 'on' : '') + '" onclick="go(\'guide\', { tab: \'' + t[0] + '\' })">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="guide-list">' + body + '</div>';
};

/* ---------- NOVEDADES ---------- */
SCREENS.news = function () {
  if (meta.seenVersion !== APP_VERSION) { meta.seenVersion = APP_VERSION; saveMeta(); }
  return topBar('Novedades') + APP_PATCH_NOTES.map(function (n) {
    return '<div class="news-card"><div class="news-head"><b>v' + n.v + ' · ' + n.titulo + '</b><small>' + n.fecha + '</small></div><ul>' +
      n.notas.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
  }).join('');
};

/* ---------- AJUSTES ---------- */
SCREENS.others = function () {
  return topBar('Ajustes') +
    '<div class="settings">' +
    '<label class="toggle-row"><input type="checkbox" ' + (soundOn ? 'checked' : '') + ' onchange="if(this.checked!==soundOn)toggleSound()"> Sonido</label>' +
    '<label class="toggle-row"><input type="checkbox" ' + (meta.settings.dmgNumbers ? 'checked' : '') + ' onchange="setSetting(\'dmgNumbers\', this.checked)"> Números de daño</label>' +
    '<label class="toggle-row"><input type="checkbox" ' + (meta.settings.autoWave ? 'checked' : '') + ' onchange="setSetting(\'autoWave\', this.checked)"> Olas automáticas</label>' +
    '</div>' +
    '<h3 class="section-title">Códigos</h3>' +
    '<div class="code-row"><input id="codeInput" placeholder="Escribe un código" maxlength="24" autocomplete="off"><button class="menu-btn menu-btn-primary" onclick="redeemCode()">Canjear</button></div>' +
    '<h3 class="section-title">Progreso</h3>' +
    '<button class="menu-btn danger" onclick="if(confirm(\'¿Borrar todo el progreso? Gemas, cartas, héroes y logros.\')){resetMeta();clearSavedRun();clearExpedition();go(\'home\');}">Borrar todo el progreso</button>' +
    '<p class="menu-hint">Rush Royale Roguelike es un fan game no oficial hecho por diversión. Funciona sin conexión a ningún servidor, sin anuncios y sin compras. Todo tu progreso se guarda en este navegador.</p>';
};

/* ---------- EXPEDICIÓN ---------- */
function expStatus() {
  var h = HEROES[expRun.hero];
  return '<div class="exp-status">' +
    '<img src="assets/heroes/' + expRun.hero + '.svg" alt="" style="--hc:' + h.color + '">' +
    '<span>❤️ <b>' + expRun.lives + '</b></span><span>🪙 <b>' + expRun.gold + '</b></span>' +
    '<button class="ghost-btn" onclick="showExpBoons()">✨ ' + expRun.boons.length + '</button></div>';
}
function showExpBoons() {
  var list = expRun.boons.map(function (id) { var b = getBoonDef(id); return '<div class="boon-line" style="--rc:' + RARITY[b.rarity].color + '"><span>' + b.icon + '</span><div><b>' + b.name + '</b><small>' + b.desc + '</small></div></div>'; }).join('');
  openModal('<button class="modal-x" onclick="closeModal()">✕</button><h2>Bendiciones</h2>' + (list || '<p class="muted">Aún no tienes ninguna.</p>'));
}
SCREENS.expMap = function () {
  if (!expRun) return topBar('Expedición', 'modes') + '<p class="menu-hint">No hay ninguna expedición en curso.</p><button class="menu-btn menu-btn-primary" onclick="startExpedition()">Empezar</button>';
  var avail = expAvailable();
  var ROW_H = 84, H = EXP_ROWS * ROW_H + 30;
  var lines = '';
  expRun.map.forEach(function (row) {
    row.forEach(function (n) {
      n.next.forEach(function (nid) {
        var m = expNode(nid);
        var active = expRun.cleared.indexOf(n.id) !== -1 && (expRun.pos === n.id) && avail.indexOf(nid) !== -1;
        var walked = expRun.cleared.indexOf(n.id) !== -1 && (expRun.cleared.indexOf(nid) !== -1 || expRun.pos === nid);
        lines += '<line x1="' + (n.x * 100) + '%" y1="' + (H - (n.row * ROW_H + 40)) + '" x2="' + (m.x * 100) + '%" y2="' + (H - (m.row * ROW_H + 40)) + '" class="' + (walked ? 'walked' : active ? 'active' : '') + '"/>';
      });
    });
  });
  var nodes = '';
  expRun.map.forEach(function (row) {
    row.forEach(function (n) {
      var info = EXP_NODE_INFO[n.type];
      var cls = 'exp-node t-' + n.type;
      if (expRun.cleared.indexOf(n.id) !== -1) cls += ' cleared';
      if (avail.indexOf(n.id) !== -1) cls += ' avail';
      if (expRun.pos === n.id) cls += ' current';
      nodes += '<button class="' + cls + '" style="left:' + (n.x * 100) + '%;bottom:' + (n.row * ROW_H + 40 - 24) + 'px;--nc:' + info.color + '" onclick="' + (avail.indexOf(n.id) !== -1 ? 'enterExpNode(\'' + n.id + '\')' : 'showToast(\'' + info.name + '\')') + '">' + info.icon + '</button>';
    });
  });
  var inCombat = expInProgressCombat();
  var resume = '';
  var posNode = expNode(expRun.pos);
  if (posNode && !inCombat && expRun.cleared.indexOf(posNode.id) === -1) {
    var scr = { shop: 'expShop', event: 'expEvent', rest: 'expRest' }[posNode.type];
    if (scr) resume = '<button class="menu-btn menu-btn-primary" onclick="go(\'' + scr + '\')">' + EXP_NODE_INFO[posNode.type].icon + ' Volver a ' + EXP_NODE_INFO[posNode.type].name + '</button>';
  }
  if (inCombat) {
    var saved = loadSavedRun();
    resume = '<button class="menu-btn menu-btn-primary" onclick="' + (saved && saved.mode === 'expedition' ? 'continueSavedGame()' : 'startExpStage(expNode(expRun.pos))') + '">⚔️ Continuar el combate</button>';
  }
  return topBar('Expedición', 'home') + expStatus() + resume +
    '<p class="menu-hint">' + (inCombat ? 'Tienes un combate a medias.' : avail.length ? 'Elige el siguiente paso. Los caminos solo van hacia arriba.' : '') + '</p>' +
    '<div class="exp-map" id="expMap" style="height:' + H + 'px"><svg class="exp-lines" width="100%" height="' + H + '">' + lines + '</svg>' + nodes + '</div>' +
    '<div class="exp-legend">' + Object.keys(EXP_NODE_INFO).map(function (k) { return '<span>' + EXP_NODE_INFO[k].icon + ' ' + EXP_NODE_INFO[k].name + '</span>'; }).join('') + '</div>' +
    '<button class="menu-btn danger" onclick="if(confirm(\'¿Abandonar la expedición? Perderás el progreso de este recorrido.\')){clearExpedition();clearSavedRun();go(\'modes\');}">Abandonar expedición</button>';
};
function scrollExpMap() {
  var map = $('expMap');
  if (!map || !expRun) return;
  var row = expRun.pos ? +expRun.pos.split('-')[0] : 0;
  var root = $('menuRoot');
  var nodeY = map.offsetTop + map.offsetHeight - (row * 84 + 40);
  root.scrollTop = Math.max(0, nodeY - root.clientHeight * 0.6);
}
SCREENS.expShop = function () {
  var node = expRun && expNode(expRun.pos);
  if (!node || node.type !== 'shop') return SCREENS.expMap();
  if (!node.shop) { node.shop = genShop(node); saveExp(); }
  var shop = node.shop;
  return topBar('Tienda', 'expMap').replace("go('expMap')", 'leaveExpNode()') + expStatus() +
    '<div class="shop-keeper">🧝 «¡Bienvenido, viajero! Echa un vistazo, que todo es de primera.»</div>' +
    '<div class="shop-list">' + shop.items.map(function (it, i) {
      var b = getBoonDef(it.id);
      return '<div class="shop-item' + (it.sold ? ' sold' : '') + '" style="--rc:' + RARITY[b.rarity].color + '"><span class="boon-icon">' + b.icon + '</span><div><b>' + b.name + '</b><small>' + b.desc + '</small></div>' +
        (it.sold ? '<span class="sold-tag">Vendido</span>' : '<button class="mini-btn buy" ' + (expRun.gold < it.price ? 'disabled' : '') + ' onclick="buyShopItem(' + i + ')">' + it.price + ' 🪙</button>') + '</div>';
    }).join('') +
    '<div class="shop-item' + (shop.heal ? ' sold' : '') + '" style="--rc:#ff6b7a"><span class="boon-icon">🧪</span><div><b>Poción de vida</b><small>+5 vidas</small></div>' +
    (shop.heal ? '<span class="sold-tag">Vendido</span>' : '<button class="mini-btn buy" ' + (expRun.gold < 30 ? 'disabled' : '') + ' onclick="buyShopHeal()">30 🪙</button>') + '</div>' +
    '</div><button class="menu-btn menu-btn-primary" onclick="leaveExpNode()">Seguir el camino</button>';
};
SCREENS.expEvent = function () {
  var node = expRun && expNode(expRun.pos);
  if (!node || node.type !== 'event') return SCREENS.expMap();
  var ev = currentExpEvent();
  var done = expRun.cleared.indexOf(node.id) !== -1;
  var body;
  if (done) {
    body = '<p class="event-result">' + escapeHtml(_expEventResult || 'Ya pasaste por aquí.') + '</p><button class="menu-btn menu-btn-primary" onclick="_expEventResult=null;go(\'expMap\')">Continuar</button>';
  } else {
    body = '<div class="event-choices">' + ev.choices.map(function (ch, i) {
      var ok = !ch.can || ch.can();
      return '<button class="menu-btn' + (i === 0 ? ' menu-btn-primary' : '') + '" ' + (ok ? '' : 'disabled') + ' onclick="chooseExpEvent(' + i + ')">' + ch.label + '<small>' + ch.desc + '</small></button>';
    }).join('') + '</div>';
  }
  return topBar('Evento', 'expMap') + expStatus() +
    '<div class="event-card"><div class="event-ic">' + ev.icon + '</div><h2>' + ev.title + '</h2><p>' + ev.text + '</p>' + body + '</div>';
};
SCREENS.expRest = function () {
  var node = expRun && expNode(expRun.pos);
  if (!node || node.type !== 'rest') return SCREENS.expMap();
  return topBar('Hoguera', 'expMap') + expStatus() +
    '<div class="event-card"><div class="event-ic flicker">🔥</div><h2>Una hoguera tranquila</h2><p>El fuego crepita. Puedes descansar o aprovechar para entrenar a tus torres.</p>' +
    '<div class="event-choices">' +
    '<button class="menu-btn menu-btn-primary" onclick="restChoice(\'heal\')">Descansar<small>+6 vidas</small></button>' +
    '<button class="menu-btn" onclick="restChoice(\'train\')">Entrenar<small>Maestría para una torre al azar de tu mazo</small></button>' +
    '</div></div>';
};
