/* =========================================================
   DATOS: torres, enemigos, jefes, niveles, biomas, héroes,
   bendiciones, modos y reglas diarias.
   ========================================================= */

var RARITY = {
  comun:      { name: 'Común',      color: '#9fb3c8', weight: 70 },
  rara:       { name: 'Rara',       color: '#4ea8ff', weight: 24 },
  epica:      { name: 'Épica',      color: '#b06bff', weight: 5.4 },
  legendaria: { name: 'Legendaria', color: '#ffb020', weight: 0.6 }
};
var RARITY_ORDER = ['comun', 'rara', 'epica', 'legendaria'];

// antiAir: puede tocar a los voladores (el resto los ignora).
var TOWER_TYPES = {
  fire: {
    name: 'Fuego', symbol: '🔥', color: '#ff5b3c', color2: '#ffb020', rarity: 'comun',
    damage: 15, rangeTiles: 2.3, speed: 1.0, manaCost: 45,
    desc: 'Daño directo alto y fiable.', antiAir: false, shape: 'fire'
  },
  frost: {
    name: 'Hielo', symbol: '❄️', color: '#4ecdc4', color2: '#8fe9ff', rarity: 'comun',
    damage: 7, rangeTiles: 2.0, speed: 0.9, manaCost: 38,
    desc: 'Daño bajo, pero ralentiza al enemigo.', antiAir: false, shape: 'frost', slow: 0.55
  },
  nature: {
    name: 'Bosque', symbol: '🌿', color: '#44b78b', color2: '#8ee6b0', rarity: 'comun',
    damage: 10, rangeTiles: 3.2, speed: 1.15, manaCost: 52,
    desc: 'Alcance muy largo. Antiaérea: ataca primero a los voladores.', antiAir: true, shape: 'nature'
  },
  electric: {
    name: 'Rayo', symbol: '⚡', color: '#7c5cff', color2: '#ffe97c', rarity: 'rara',
    damage: 9, rangeTiles: 2.4, speed: 1.3, manaCost: 60,
    desc: 'Rebota entre hasta 3 enemigos. Alcanza a voladores.', antiAir: true, shape: 'electric', chain: 3
  },
  venom: {
    name: 'Veneno', symbol: '☠️', color: '#8b3fb5', color2: '#5cff9e', rarity: 'rara',
    damage: 4, rangeTiles: 2.1, speed: 1.05, manaCost: 55,
    desc: 'Envenena: el daño se acumula con el tiempo.', antiAir: false, shape: 'venom', poison: true
  },
  wind: {
    name: 'Viento', symbol: '🌪️', color: '#3aa6a6', color2: '#eaffff', rarity: 'rara',
    damage: 3, rangeTiles: 2.4, speed: 1.0, manaCost: 58,
    desc: 'Empuja al enemigo hacia atrás. Alcanza a voladores.', antiAir: true, shape: 'wind', knockback: 0.55
  },
  sniper: {
    name: 'Francotirador', symbol: '🎯', color: '#2c3e6b', color2: '#e94560', rarity: 'epica',
    damage: 55, rangeTiles: 4.2, speed: 0.35, manaCost: 70,
    desc: 'Muy lento, pero pega muy fuerte a distancia.', antiAir: false, shape: 'sniper'
  },
  cannon: {
    name: 'Cañón', symbol: '💣', color: '#6b5b45', color2: '#ff8f3c', rarity: 'epica',
    damage: 20, rangeTiles: 2.1, speed: 0.55, manaCost: 65,
    desc: 'Explota en área y daña a todos los que estén cerca.', antiAir: false, shape: 'cannon', splashTiles: 1.1
  },
  arcane: {
    name: 'Arcano', symbol: '🔮', color: '#3d2a6b', color2: '#c9a2ff', rarity: 'epica',
    damage: 6, rangeTiles: 2.6, speed: 0.85, manaCost: 68,
    desc: 'Maldice: el objetivo recibe un 30% más de daño de todas las torres.', antiAir: true, shape: 'arcane', curse: true
  },
  dragon: {
    name: 'Dragón', symbol: '🐉', color: '#c0262d', color2: '#ffcc33', rarity: 'legendaria',
    damage: 22, rangeTiles: 2.5, speed: 0.7, manaCost: 90,
    desc: 'Bolas de fuego en área que dejan quemaduras. Alcanza a voladores.', antiAir: true, shape: 'dragon', splashTiles: 0.9, burn: true
  },
  chrono: {
    name: 'Cronomante', symbol: '⏳', color: '#1f6f8b', color2: '#ffe6a8', rarity: 'legendaria',
    damage: 8, rangeTiles: 2.6, speed: 1.1, manaCost: 80,
    desc: 'Cada golpe puede detener el tiempo del enemigo un instante. Alcanza a voladores.', antiAir: true, shape: 'chrono', stunChance: 0.22
  },
  alchemist: {
    name: 'Alquimista', symbol: '⚗️', color: '#2e7d32', color2: '#ffd54f', rarity: 'legendaria',
    damage: 0, rangeTiles: 1.5, speed: 0, manaCost: 75,
    desc: 'No dispara: genera maná durante las olas y potencia un 15% a las torres de al lado.', antiAir: false, shape: 'alchemist', support: true, manaGen: 1.1, aura: 0.15
  }
};
var TOWER_ORDER = ['fire', 'frost', 'nature', 'electric', 'venom', 'wind', 'sniper', 'cannon', 'arcane', 'dragon', 'chrono', 'alchemist'];
var STARTER_TOWERS = ['fire', 'frost', 'nature', 'electric', 'venom'];
// Torres "físicas" a efectos de la resistencia de la Sombra.
var PHYSICAL_TOWER_TYPES = { fire: true, frost: true, nature: true, sniper: true, cannon: true, wind: true, dragon: true };

var ENEMY_TYPES = {
  slime:    { name: 'Gelatina',   shape: 'slime',    color: '#3ea6ff', healthMult: 1.0,  speedMult: 1.0,  flying: false, armor: 0,    healAura: 0, desc: 'El enemigo más básico. Bota que da gusto.' },
  goblin:   { name: 'Trasgo',     shape: 'goblin',   color: '#5fbf5f', healthMult: 0.85, speedMult: 1.2,  flying: false, armor: 0,    healAura: 0, desc: 'Rápido y un poco frágil.' },
  brute:    { name: 'Bruto',      shape: 'brute',    color: '#c9622b', healthMult: 1.9,  speedMult: 0.75, flying: false, armor: 0.3,  healAura: 0, desc: 'Lento, con armadura que reduce el daño un 30%.' },
  bat:      { name: 'Murciélago', shape: 'bat',      color: '#b57bff', healthMult: 0.55, speedMult: 1.45, flying: true,  armor: 0,    healAura: 0, desc: 'Vuela: solo lo alcanzan las torres antiaéreas, que lo atacan antes que a nadie.' },
  healer:   { name: 'Curandero',  shape: 'healer',   color: '#5cff9e', healthMult: 1.1,  speedMult: 0.9,  flying: false, armor: 0,    healAura: 5, desc: 'Cura a los enemigos que tiene cerca.' },
  golem:    { name: 'Gólem',      shape: 'golem',    color: '#8a8a9e', healthMult: 3.4,  speedMult: 0.55, flying: false, armor: 0.45, healAura: 0, desc: 'Una mole de piedra muy acorazada.' },
  shade:    { name: 'Sombra',     shape: 'shade',    color: '#4a2f6b', healthMult: 0.9,  speedMult: 1.3,  flying: false, armor: 0,    healAura: 0, physicalResist: 0.45, desc: 'Resiste el daño físico. Rayo, Veneno, Arcano y Cronomante la atraviesan.' },
  rusher:   { name: 'Corredor',   shape: 'rusher',   color: '#ffcf4d', healthMult: 0.4,  speedMult: 2.3,  flying: false, armor: 0,    healAura: 0, desc: 'Poca vida, velocidad endiablada.' },
  skeleton: { name: 'Esqueleto',  shape: 'skeleton', color: '#e8e2cf', healthMult: 0.6,  speedMult: 1.1,  flying: false, armor: 0,    healAura: 0, desc: 'Lo levanta el Nigromante de la nada.' },
  boss:     { name: 'Jefe',       shape: 'boss',     color: '#ff2e63', healthMult: 9,    speedMult: 0.7,  flying: false, armor: 0.15, healAura: 0, desc: '' }
};
var ENEMY_GUIDE_ORDER = ['slime', 'goblin', 'brute', 'bat', 'healer', 'shade', 'rusher', 'golem', 'skeleton'];

var BOSS_TYPES = {
  king:     { name: 'Rey Gelatina',          color: '#3ea6ff', hpMult: 8,   speedMult: 0.7,  armor: 0.1,  ability: 'split',  desc: 'Al caer se divide en seis gelatinas.' },
  necro:    { name: 'Nigromante',            color: '#8b3fb5', hpMult: 8,   speedMult: 0.65, armor: 0.1,  ability: 'summon', every: 4, desc: 'Levanta esqueletos cada pocos segundos.' },
  colossus: { name: 'Coloso de Piedra',      color: '#8a8a9e', hpMult: 11,  speedMult: 0.55, armor: 0.35, ability: 'shield', every: 6, dur: 2, desc: 'Se blinda y no recibe daño durante dos segundos.' },
  witch:    { name: 'Bruja del Hielo',       color: '#7fd6ff', hpMult: 8.5, speedMult: 0.7,  armor: 0.1,  ability: 'freeze', every: 6, dur: 3, desc: 'Congela una de tus torres cada pocos segundos.' },
  dragon:   { name: 'Dragón Ancestral',      color: '#ff4b2b', hpMult: 9,   speedMult: 0.8,  armor: 0.15, ability: 'fly',    desc: 'Vuela alto: las torres no antiaéreas le hacen la mitad de daño.' },
  shadow:   { name: 'Señor de las Sombras',  color: '#4a2f6b', hpMult: 8,   speedMult: 0.75, armor: 0,    ability: 'blink',  every: 5, physicalResist: 0.35, desc: 'Se teletransporta hacia delante y resiste el daño físico.' },
  emperor:  { name: 'Emperador del Caos',    color: '#ff2e63', hpMult: 12,  speedMult: 0.65, armor: 0.2,  ability: 'chaos',  every: 5, dur: 2, desc: 'Alterna escudo, invocaciones y congelación.' }
};
var BOSS_ORDER = ['king', 'necro', 'colossus', 'witch', 'dragon', 'shadow', 'emperor'];
var LEVEL_BOSS = ['king', 'necro', 'colossus', 'witch', 'dragon', 'shadow', 'colossus', 'emperor'];

var LEVEL_CONFIGS = [
  { enemies: 8,  health: 31,  speed: 1.0,  reward: 9,  spawnMs: 900, mix: ['slime'] },
  { enemies: 11, health: 45,  speed: 1.15, reward: 10, spawnMs: 820, mix: ['slime', 'goblin'] },
  { enemies: 14, health: 62,  speed: 1.3,  reward: 11, spawnMs: 760, mix: ['slime', 'goblin', 'brute'] },
  { enemies: 18, health: 84,  speed: 1.5,  reward: 12, spawnMs: 690, mix: ['slime', 'goblin', 'brute', 'bat'] },
  { enemies: 22, health: 112, speed: 1.7,  reward: 13, spawnMs: 620, mix: ['goblin', 'brute', 'bat', 'healer', 'shade', 'rusher'] },
  { enemies: 26, health: 145, speed: 1.85, reward: 15, spawnMs: 560, mix: ['brute', 'bat', 'healer', 'shade', 'rusher', 'golem'] },
  { enemies: 30, health: 185, speed: 2.0,  reward: 17, spawnMs: 510, mix: ['brute', 'bat', 'healer', 'goblin', 'shade', 'golem'] },
  { enemies: 34, health: 230, speed: 2.15, reward: 20, spawnMs: 470, mix: ['brute', 'bat', 'healer', 'shade', 'rusher', 'golem'] }
];

var BIOMES = {
  pradera:  { name: 'Pradera',        grass: ['#2f7d4f', '#358555'], path: ['#a8957a', '#b09e83'], edge: '#f1e3b4', dots: 'rgba(0,40,20,0.22)', bg: '#0b1a12', props: ['tree', 'bush', 'flower', 'flower'] },
  otono:    { name: 'Bosque otoñal',  grass: ['#6f5a2c', '#776131'], path: ['#9c8566', '#a48d6e'], edge: '#ffb86b', dots: 'rgba(60,30,0,0.25)', bg: '#1a1208', props: ['autumn', 'mushroom', 'bush'] },
  desierto: { name: 'Desierto',       grass: ['#d2ab63', '#d9b36b'], path: ['#9a7646', '#a27e4d'], edge: '#fff0c2', dots: 'rgba(120,80,20,0.22)', bg: '#1f160a', props: ['cactus', 'rock', 'bones'] },
  pantano:  { name: 'Pantano',        grass: ['#3d5a3a', '#43613f'], path: ['#5e4c33', '#665338'], edge: '#9be37a', dots: 'rgba(10,30,10,0.3)', bg: '#0b140b', props: ['reed', 'mushroom', 'puddle'] },
  nieve:    { name: 'Tundra helada',  grass: ['#dbe7f1', '#e5eef6'], path: ['#7f93a8', '#899db1'], edge: '#ffffff', dots: 'rgba(90,120,160,0.18)', bg: '#0c1622', props: ['pine', 'snowrock', 'crystal'] },
  volcan:   { name: 'Volcán',         grass: ['#3a2626', '#422b2b'], path: ['#241717', '#2c1c1c'], edge: '#ff6a2a', dots: 'rgba(255,90,30,0.14)', bg: '#140707', props: ['lava', 'rock', 'ember'] },
  abismo:   { name: 'Abismo',         grass: ['#1d1838', '#221c40'], path: ['#3c315e', '#43376a'], edge: '#c9a2ff', dots: 'rgba(160,120,255,0.12)', bg: '#07051a', props: ['crystal', 'pillar', 'rune'] },
  castillo: { name: 'Castillo real',  grass: ['#4d5566', '#545d70'], path: ['#8c7a5c', '#958364'], edge: '#ffd166', dots: 'rgba(0,0,0,0.18)', bg: '#0b0e16', props: ['pillar', 'banner', 'rock'] }
};
var LEVEL_BIOME = ['pradera', 'otono', 'desierto', 'pantano', 'nieve', 'volcan', 'abismo', 'castillo'];

var HEROES = {
  aria: {
    name: 'Aria', title: 'Maga del Hielo', color: '#7fd6ff', rarity: 'comun', cost: 0,
    ability: { name: 'Ventisca', icon: '🌨️', desc: 'Congela a todos los enemigos durante 3 segundos.', cd: 28 },
    passive: 'Hielo y Cronomante ralentizan un 20% más.'
  },
  brann: {
    name: 'Brann', title: 'Artillero enano', color: '#ff8f3c', rarity: 'rara', cost: 80,
    ability: { name: 'Bombardeo', icon: '💥', desc: 'Seis explosiones sobre los enemigos más adelantados.', cd: 24 },
    passive: 'El daño de área de Cañón y Dragón sube un 20%.'
  },
  sylva: {
    name: 'Sylva', title: 'Druida del bosque', color: '#5fd38a', rarity: 'rara', cost: 80,
    ability: { name: 'Raíces', icon: '🌱', desc: 'Inmoviliza a todos 3,5 segundos y recupera 2 vidas.', cd: 32 },
    passive: 'Recuperas 1 vida al terminar cada nivel.'
  },
  volt: {
    name: 'Volt', title: 'Ingeniera chispa', color: '#ffe97c', rarity: 'epica', cost: 110,
    ability: { name: 'Sobrecarga', icon: '⚙️', desc: 'Tus torres disparan el doble de rápido durante 6 segundos.', cd: 30 },
    passive: 'Todas las torres disparan un 8% más rápido.'
  },
  morga: {
    name: 'Morga', title: 'Nigromante', color: '#b06bff', rarity: 'epica', cost: 130,
    ability: { name: 'Cosecha', icon: '💀', desc: 'Elimina a los enemigos por debajo del 30% de vida. Los jefes pierden un 8%.', cd: 30 },
    passive: 'Ganas 1 maná extra por cada baja.'
  },
  leon: {
    name: 'León', title: 'Paladín solar', color: '#ffb020', rarity: 'legendaria', cost: 160,
    ability: { name: 'Juicio', icon: '☀️', desc: 'Inflige el 20% de su vida máxima a todos los enemigos. A los jefes, el 10%.', cd: 34 },
    passive: 'Un 20% más de daño a jefes y élites.'
  }
};
var HERO_ORDER = ['aria', 'brann', 'sylva', 'volt', 'morga', 'leon'];

/* ---------- Bendiciones (mejoras roguelike de la partida) ---------- */
var BOONS = {
  afilado:    { name: 'Filo afilado',     icon: '🗡️', rarity: 'comun', desc: '+10% de daño a todas las torres.', apply: function (m) { m.dmg *= 1.10; } },
  cadencia:   { name: 'Cadencia',         icon: '🏹', rarity: 'comun', desc: '+8% de velocidad de ataque.', apply: function (m) { m.speed *= 1.08; } },
  vista:      { name: 'Vista de águila',  icon: '🦅', rarity: 'comun', desc: '+10% de alcance.', apply: function (m) { m.range *= 1.10; } },
  botin:      { name: 'Botín',            icon: '💰', rarity: 'comun', desc: '+2 de maná por cada baja.', apply: function (m) { m.manaKill += 2; } },
  manantial:  { name: 'Manantial',        icon: '⛲', rarity: 'comun', desc: '+1 de maná por segundo durante las olas.', apply: function (m) { m.regen += 1; } },
  muralla:    { name: 'Muralla',          icon: '🧱', rarity: 'comun', desc: '+4 vidas ahora mismo.', instant: function () { game.lives += 4; } },
  ahorro:     { name: 'Ahorro',           icon: '🪙', rarity: 'comun', desc: 'Torres y mejoras un 10% más baratas.', apply: function (m) { m.cost *= 0.9; } },
  critico:    { name: 'Golpe crítico',    icon: '💢', rarity: 'rara', desc: '+10% de probabilidad de crítico que hace el doble de daño.', apply: function (m) { m.crit += 0.10; } },
  cazador:    { name: 'Cazajefes',        icon: '🎖️', rarity: 'rara', desc: '+35% de daño a jefes y élites.', apply: function (m) { m.bossDmg *= 1.35; } },
  interes:    { name: 'Interés',          icon: '🏦', rarity: 'rara', desc: 'Al acabar cada ola ganas el 12% del maná que tengas.', apply: function (m) { m.interest += 0.12; } },
  escarcha:   { name: 'Escarcha eterna',  icon: '🧊', rarity: 'rara', desc: 'Las ralentizaciones son un 25% más fuertes.', apply: function (m) { m.slow += 0.25; } },
  toxina:     { name: 'Toxina',           icon: '🧪', rarity: 'rara', desc: 'Veneno y quemaduras hacen un 60% más de daño.', apply: function (m) { m.dot *= 1.6; } },
  verdugo:    { name: 'Verdugo',          icon: '🪓', rarity: 'epica', desc: 'Los enemigos normales con menos del 12% de vida mueren al instante.', apply: function (m) { m.execute = Math.max(m.execute, 0.12); } },
  meditacion: { name: 'Meditación',       icon: '🧘', rarity: 'epica', desc: 'La habilidad del héroe recarga un 35% más rápido.', apply: function (m) { m.heroCd *= 0.65; } },
  tormenta:   { name: 'Tormenta',         icon: '⛈️', rarity: 'epica', desc: 'Rayo rebota 2 veces más y las explosiones son un 30% más grandes.', apply: function (m) { m.chain += 2; m.splash *= 1.3; } },
  furia:      { name: 'Furia',            icon: '😤', rarity: 'epica', desc: '+25% de daño y +10% de velocidad.', apply: function (m) { m.dmg *= 1.25; m.speed *= 1.10; } },
  fenix:      { name: 'Fénix',            icon: '🔥', rarity: 'epica', desc: 'La primera vez que te quedes sin vidas, recuperas 6.', unique: true, apply: function (m) { m.phoenix = true; } }
};
// Especialista: bendición rara generada por tipo de torre (esp_fire, esp_frost...).
function getBoonDef(id) {
  if (BOONS[id]) return BOONS[id];
  if (id.indexOf('esp_') === 0) {
    var type = id.slice(4);
    var t = TOWER_TYPES[type];
    if (!t) return null;
    return {
      name: 'Maestría ' + t.name, icon: t.symbol, rarity: 'rara',
      desc: '+35% de daño para ' + t.name + '.',
      apply: function (m) { m.typeDmg[type] = (m.typeDmg[type] || 1) * 1.35; }
    };
  }
  return null;
}

/* ---------- Modos ---------- */
var MODES = {
  classic:    { name: 'Clásico',        icon: '⚔️', color: '#e94560', desc: 'Ocho niveles en el mismo tablero con bendiciones entre niveles.' },
  expedition: { name: 'Expedición',     icon: '🗺️', color: '#ffb020', desc: 'Elige tu camino por un mapa con combates, tiendas, eventos y un jefe final.' },
  adventure:  { name: 'Aventura',       icon: '🏰', color: '#4ecdc4', desc: 'Ocho niveles fijos. Consigue las tres estrellas en cada uno.' },
  survival:   { name: 'Supervivencia',  icon: '♾️', color: '#7c5cff', desc: 'Olas infinitas cada vez más duras. ¿Hasta dónde llegas?' },
  fusion:     { name: 'Fusión',         icon: '🧬', color: '#44b78b', desc: 'Invoca torres al azar y fusiona dos iguales para subir de rango.' },
  daily:      { name: 'Desafío diario', icon: '📅', color: '#ff8f3c', desc: 'Mismo mapa, héroe y mazo para todos, con una regla especial cada día.' },
  bossrush:   { name: 'Jefes',          icon: '👑', color: '#ff2e63', desc: 'Los siete jefes uno detrás de otro.' }
};
var MODE_ORDER = ['classic', 'expedition', 'adventure', 'survival', 'fusion', 'daily', 'bossrush'];

var DAILY_MODS = [
  { id: 'rapidos',   name: 'Prisa',        icon: '💨', desc: 'Los enemigos van un 25% más rápido.' },
  { id: 'blindados', name: 'Blindados',    icon: '🛡️', desc: 'Todos los enemigos tienen un 15% más de armadura.' },
  { id: 'escaso',    name: 'Maná escaso',  icon: '🏜️', desc: 'Un 30% menos de maná por bajas y por segundo.' },
  { id: 'enjambre',  name: 'Enjambre',     icon: '🐝', desc: 'Un 50% más de enemigos, pero con un 30% menos de vida.' },
  { id: 'gigantes',  name: 'Gigantes',     icon: '🦣', desc: 'Enemigos con un 45% más de vida, pero dan el doble de maná.' },
  { id: 'cristal',   name: 'Cañón de cristal', icon: '💎', desc: 'Tus torres hacen un 40% más de daño, pero empiezas con la mitad de vidas.' },
  { id: 'heroico',   name: 'Heroico',      icon: '🦸', desc: 'La habilidad del héroe recarga el doble de rápido.' }
];

var ADVENTURE_LEVELS = [
  { level: 1, name: 'Primeros pasos' },
  { level: 2, name: 'El bosque dorado' },
  { level: 3, name: 'Arenas ardientes' },
  { level: 4, name: 'Aguas turbias' },
  { level: 5, name: 'La tundra' },
  { level: 6, name: 'Corazón de lava' },
  { level: 7, name: 'El abismo' },
  { level: 8, name: 'Asalto al castillo' }
];
var ADVENTURE_SEED_BASE = 918273;
