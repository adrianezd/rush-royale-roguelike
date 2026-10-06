/* =========================================================
   META: progreso permanente (gemas, mejoras, cartas, héroes,
   cofres, logros, estadísticas, perfil y códigos)
   ========================================================= */
var META_KEY = 'rushRoyaleRogue_meta_v1';

var UPGRADE_DEFS = [
  { id: 'mana',  icon: '💧', name: 'Maná inicial',         desc: '+15 maná al empezar cada partida.', maxLevel: 5, cost: function (lv) { return 3 + lv * 3; } },
  { id: 'lives', icon: '❤️', name: 'Vidas extra',          desc: '+2 vidas al empezar cada partida.', maxLevel: 5, cost: function (lv) { return 3 + lv * 3; } },
  { id: 'regen', icon: '✨', name: 'Regeneración de maná', desc: '+0,6 maná por segundo durante las olas.', maxLevel: 5, cost: function (lv) { return 4 + lv * 4; } },
  { id: 'gems',  icon: '💎', name: 'Buscador de gemas',    desc: '+10% de gemas al terminar la partida.', maxLevel: 5, cost: function (lv) { return 4 + lv * 4; } },
  { id: 'crit',  icon: '💢', name: 'Puntería',             desc: '+2% de probabilidad de crítico.', maxLevel: 5, cost: function (lv) { return 8 + lv * 6; } },
  { id: 'hero',  icon: '🦸', name: 'Entrenamiento heroico', desc: 'La habilidad del héroe recarga un 5% más rápido.', maxLevel: 5, cost: function (lv) { return 8 + lv * 6; } }
];

var CARD_MAX_LEVEL = 10;
var CARD_COPIES = [0, 2, 4, 8, 12, 20, 30, 45, 60, 80];
function cardUpgradeGems(lv) { return 5 + lv * 5; }
function cardDmgMult(lv) { return 1 + 0.08 * (Math.max(1, lv) - 1); }

var CHEST_TYPES = {
  madera: { name: 'Cofre de madera', cost: 25,  cards: 6,  guaranteed: null,         heroChance: 0,    boost: 1 },
  plata:  { name: 'Cofre de plata',  cost: 60,  cards: 14, guaranteed: 'epica',      heroChance: 0.05, boost: 2 },
  real:   { name: 'Cofre real',      cost: 150, cards: 30, guaranteed: 'legendaria', heroChance: 0.15, boost: 4 }
};
var CHEST_ORDER = ['madera', 'plata', 'real'];

var CODE_REWARDS = {
  'dd542a58246fbc952cbc42e514757ea8fa9b294e7dcfe31a3fa19c4cce8b6b62': { gems: 100, label: '100 gemas' },
  '15b50cb7a482d3859f62b2ba3b2f1b156f127d9687dbf561fcd3d575e8eaffeb': { chest: 'real', label: 'un Cofre real' },
  '1460afe10f79b8fc35ddb6851ecc0b91299f1f575dcf318b0220136f888bfeec': { hero: 'leon', label: 'el héroe León' },
  'd764e62a89aa17284d8a542a9a775d578887fa69627acd331e976d42702e9fa4': { gems: 50, label: '50 gemas' }
};

function defaultMeta() {
  return {
    v: 2, gems: 60, upgrades: {}, cards: {}, heroes: { aria: true }, hero: 'aria',
    deck: STARTER_TOWERS.slice(), stats: {}, adventure: {}, achievements: {},
    daily: {}, freeChestDate: '', codes: [], xp: 0, name: 'Jugador', seenVersion: '',
    settings: { dmgNumbers: true, autoWave: false }
  };
}
function loadMeta() {
  var d = lsGet(META_KEY, null);
  var m = defaultMeta();
  if (!d) {
    STARTER_TOWERS.forEach(function (t) { m.cards[t] = { level: 1, copies: 0 }; });
    return m;
  }
  if (d.v !== 2) {
    // Partida de la versión 1: conserva gemas y mejoras, y como ya tenía
    // las 9 torres originales desbloqueadas por nivel, se le regalan.
    m.gems = (d.gems || 0) + 60;
    m.upgrades = d.upgrades || {};
    ['fire', 'frost', 'nature', 'electric', 'venom', 'wind', 'sniper', 'cannon', 'arcane'].forEach(function (t) { m.cards[t] = { level: 1, copies: 0 }; });
    return m;
  }
  for (var k in m) if (d[k] === undefined) d[k] = m[k];
  d.settings = Object.assign({}, m.settings, d.settings || {});
  if (!d.deck || d.deck.length !== 5) d.deck = STARTER_TOWERS.slice();
  if (!d.heroes || !d.heroes[d.hero]) d.hero = 'aria';
  return d;
}
var meta = loadMeta();
function saveMeta() { lsSet(META_KEY, meta); }
saveMeta();

function metaUpgradeLevel(id) { return meta.upgrades[id] || 0; }
function stat(id) { return meta.stats[id] || 0; }
function addStat(id, n) { meta.stats[id] = (meta.stats[id] || 0) + (n === undefined ? 1 : n); }
function maxStat(id, v) { if (v > (meta.stats[id] || 0)) meta.stats[id] = v; }
function ownsTower(t) { return !!meta.cards[t]; }
function cardLevel(t) { return meta.cards[t] ? meta.cards[t].level : 1; }

function resetMeta() {
  meta = defaultMeta();
  STARTER_TOWERS.forEach(function (t) { meta.cards[t] = { level: 1, copies: 0 }; });
  saveMeta();
}

function buyUpgrade(id) {
  var def = UPGRADE_DEFS.find(function (d) { return d.id === id; });
  var lv = metaUpgradeLevel(id);
  if (!def || lv >= def.maxLevel) return;
  var cost = def.cost(lv);
  if (meta.gems < cost) { showToast('Te faltan gemas'); return; }
  meta.gems -= cost;
  meta.upgrades[id] = lv + 1;
  saveMeta();
  sfxBuy();
  rerenderMenu();
}

/* ---------- Cartas ---------- */
function upgradeCard(t) {
  var c = meta.cards[t];
  if (!c || c.level >= CARD_MAX_LEVEL) return;
  var need = CARD_COPIES[c.level], gems = cardUpgradeGems(c.level);
  if (c.copies < need) { showToast('Necesitas ' + need + ' copias'); return; }
  if (meta.gems < gems) { showToast('Te faltan gemas'); return; }
  c.copies -= need; meta.gems -= gems; c.level++;
  maxStat('maxCard', c.level);
  saveMeta();
  sfxLevelUp();
  showToast(TOWER_TYPES[t].name + ' sube a nivel ' + c.level);
  rerenderMenu();
}

/* ---------- Cofres ---------- */
function towersOfRarity(r) { return TOWER_ORDER.filter(function (t) { return TOWER_TYPES[t].rarity === r; }); }
function rollChest(kind) {
  var def = CHEST_TYPES[kind];
  var weights = RARITY_ORDER.map(function (r) {
    var w = RARITY[r].weight;
    if (r === 'epica') w *= def.boost;
    if (r === 'legendaria') w *= def.boost * 1.5;
    return [r, w];
  });
  var got = {};
  for (var i = 0; i < def.cards; i++) {
    var r = (i === def.cards - 1 && def.guaranteed) ? def.guaranteed : weightedPick(weights);
    var t = pickOne(towersOfRarity(r));
    got[t] = (got[t] || 0) + 1;
  }
  var results = [];
  Object.keys(got).forEach(function (t) {
    var isNew = !meta.cards[t];
    if (isNew) meta.cards[t] = { level: 1, copies: got[t] - 1 };
    else meta.cards[t].copies += got[t];
    results.push({ type: t, copies: got[t], isNew: isNew });
  });
  results.sort(function (a, b) { return RARITY_ORDER.indexOf(TOWER_TYPES[a.type].rarity) - RARITY_ORDER.indexOf(TOWER_TYPES[b.type].rarity); });
  var hero = null;
  if (def.heroChance && Math.random() < def.heroChance) {
    var missing = HERO_ORDER.filter(function (h) { return !meta.heroes[h]; });
    if (missing.length) { hero = pickOne(missing); meta.heroes[hero] = true; }
  }
  addStat('chests');
  saveMeta();
  return { kind: kind, cards: results, hero: hero };
}
function freeChestAvailable() { return meta.freeChestDate !== todayKey(); }
function buyChest(kind) {
  var def = CHEST_TYPES[kind];
  if (meta.gems < def.cost) { showToast('Te faltan gemas'); return; }
  meta.gems -= def.cost;
  playChestOpening(rollChest(kind));
}
function openFreeChest() {
  if (!freeChestAvailable()) return;
  meta.freeChestDate = todayKey();
  playChestOpening(rollChest('madera'));
}

/* ---------- Héroes ---------- */
function buyHero(id) {
  var h = HEROES[id];
  if (meta.heroes[id]) { meta.hero = id; saveMeta(); rerenderMenu(); return; }
  if (meta.gems < h.cost) { showToast('Te faltan gemas'); return; }
  meta.gems -= h.cost;
  meta.heroes[id] = true;
  meta.hero = id;
  saveMeta();
  sfxLevelUp();
  showToast('¡' + h.name + ' se une a ti!');
  rerenderMenu();
}

/* ---------- Cuenta ---------- */
function accountLevel() { return Math.floor(Math.sqrt((meta.xp || 0) / 60)) + 1; }
function xpForLevel(l) { return (l - 1) * (l - 1) * 60; }

/* ---------- Logros ---------- */
var ACHIEVEMENTS = [
  { id: 'kills100',   icon: '⚔️', name: 'Primera sangre',     desc: 'Derrota a 100 enemigos.',             goal: 100,  val: function () { return stat('kills'); }, gems: 15 },
  { id: 'kills1000',  icon: '🗡️', name: 'Exterminador',       desc: 'Derrota a 1.000 enemigos.',           goal: 1000, val: function () { return stat('kills'); }, gems: 40 },
  { id: 'kills5000',  icon: '☠️', name: 'Leyenda del muro',   desc: 'Derrota a 5.000 enemigos.',           goal: 5000, val: function () { return stat('kills'); }, gems: 100 },
  { id: 'bosses10',   icon: '👑', name: 'Matagigantes',       desc: 'Derrota a 10 jefes.',                 goal: 10,   val: function () { return stat('bosses'); }, gems: 30 },
  { id: 'bosses50',   icon: '🏆', name: 'Regicida',           desc: 'Derrota a 50 jefes.',                 goal: 50,   val: function () { return stat('bosses'); }, gems: 80 },
  { id: 'classic',    icon: '⚔️', name: 'Vencedor clásico',   desc: 'Gana una partida de Clásico.',        goal: 1,    val: function () { return stat('classicWins'); }, gems: 50 },
  { id: 'adv8',       icon: '🏰', name: 'Aventurero',         desc: 'Supera los 8 niveles de Aventura.',   goal: 8,    val: function () { return Object.keys(meta.adventure).length; }, gems: 40 },
  { id: 'adv24',      icon: '⭐', name: 'Perfeccionista',     desc: 'Consigue las 24 estrellas de Aventura.', goal: 24, val: function () { var s = 0; for (var k in meta.adventure) s += meta.adventure[k]; return s; }, gems: 100 },
  { id: 'surv15',     icon: '♾️', name: 'Superviviente',      desc: 'Llega a la ola 15 en Supervivencia.', goal: 15,   val: function () { return stat('bestSurvival'); }, gems: 30 },
  { id: 'surv30',     icon: '🌋', name: 'Inquebrantable',     desc: 'Llega a la ola 30 en Supervivencia.', goal: 30,   val: function () { return stat('bestSurvival'); }, gems: 80 },
  { id: 'expedition', icon: '🗺️', name: 'Explorador',         desc: 'Completa una Expedición.',            goal: 1,    val: function () { return stat('expeditionWins'); }, gems: 60 },
  { id: 'fusion5',    icon: '🧬', name: 'Alquimia de torres', desc: 'Fusiona una torre hasta rango 5.',    goal: 5,    val: function () { return stat('bestRank'); }, gems: 30 },
  { id: 'fusionWin',  icon: '🧪', name: 'Maestro fusionador', desc: 'Gana una partida de Fusión.',         goal: 1,    val: function () { return stat('fusionWins'); }, gems: 60 },
  { id: 'daily1',     icon: '📅', name: 'Cita diaria',        desc: 'Completa un Desafío diario.',         goal: 1,    val: function () { return stat('dailyWins'); }, gems: 20 },
  { id: 'daily7',     icon: '🗓️', name: 'Constancia',         desc: 'Completa 7 Desafíos diarios.',        goal: 7,    val: function () { return stat('dailyWins'); }, gems: 70 },
  { id: 'bossrush',   icon: '💀', name: 'Sin piedad',         desc: 'Supera el modo Jefes.',               goal: 1,    val: function () { return stat('bossrushWins'); }, gems: 80 },
  { id: 'chests10',   icon: '🎁', name: 'Coleccionista',      desc: 'Abre 10 cofres.',                     goal: 10,   val: function () { return stat('chests'); }, gems: 25 },
  { id: 'allcards',   icon: '🃏', name: 'Baraja completa',    desc: 'Consigue las 12 cartas.',             goal: 12,   val: function () { return Object.keys(meta.cards).length; }, gems: 80 },
  { id: 'card5',      icon: '📈', name: 'Veterana',           desc: 'Sube una carta a nivel 5.',           goal: 5,    val: function () { return stat('maxCard') || 1; }, gems: 40 },
  { id: 'heroes',     icon: '🦸', name: 'Liga de héroes',     desc: 'Consigue a los 6 héroes.',            goal: 6,    val: function () { return Object.keys(meta.heroes).length; }, gems: 100 }
];
function achievementState(a) {
  var v = Math.min(a.goal, a.val());
  return { value: v, done: v >= a.goal, claimed: meta.achievements[a.id] === 'claimed' };
}
function claimableAchievements() {
  return ACHIEVEMENTS.filter(function (a) { var s = achievementState(a); return s.done && !s.claimed; }).length;
}
function claimAchievement(id) {
  var a = ACHIEVEMENTS.find(function (x) { return x.id === id; });
  var s = achievementState(a);
  if (!s.done || s.claimed) return;
  meta.achievements[id] = 'claimed';
  meta.gems += a.gems;
  saveMeta();
  sfxBuy();
  showToast('+' + a.gems + ' 💎');
  rerenderMenu();
}

/* ---------- Códigos (huella SHA-256, nunca en texto) ---------- */
function redeemCode() {
  var input = $('codeInput');
  if (!input) return;
  var code = input.value.trim().toUpperCase();
  if (!code) return;
  if (!window.crypto || !crypto.subtle) { showToast('Tu navegador no permite canjear códigos aquí'); return; }
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)).then(function (buf) {
    var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    var rw = CODE_REWARDS[hex];
    if (!rw) { showToast('Código no válido'); return; }
    if (meta.codes.indexOf(hex) !== -1) { showToast('Ya canjeaste este código'); return; }
    meta.codes.push(hex);
    if (rw.gems) meta.gems += rw.gems;
    if (rw.hero) meta.heroes[rw.hero] = true;
    saveMeta();
    input.value = '';
    showToast('Has conseguido ' + rw.label);
    if (rw.chest) playChestOpening(rollChest(rw.chest));
    else rerenderMenu();
  });
}
