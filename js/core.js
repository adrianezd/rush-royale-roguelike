/* =========================================================
   NÚCLEO: versión, novedades y utilidades compartidas
   Todos los scripts son clásicos y comparten el scope global.
   ========================================================= */
var APP_VERSION = '2.1.0';
var APP_PATCH_NOTES = [
  {
    v: '2.1.0', fecha: '7 oct 2026', titulo: 'Torres nuevas y mejoras cómodas',
    notas: [
      'Todas las torres rediseñadas: cada nivel cambia el edificio (madera, piedra, almenas, mármol con banderas y obsidiana con aura y corona).',
      'Mejorar es más fácil: toca una torre seleccionada otra vez para subirla de nivel.',
      'Flecha verde sobre cada torre que puedes mejorar y etiqueta con el coste encima de la seleccionada.',
      'Botón «Mejorar» que sube de nivel tu torre más barata con un solo toque (tecla U).',
      'El maná ya no se desperdicia: el que no cabe carga la habilidad del héroe.',
      'Más espacio para el maná (200 al empezar y +40 por nivel) y aviso cuando está lleno.'
    ]
  },
  {
    v: '2.0.0', fecha: '6 oct 2026', titulo: 'La gran actualización',
    notas: [
      'Seis héroes con habilidad especial y pasiva propia. Se eligen antes de cada partida.',
      'Mazo de 5 torres y colección de cartas con rarezas y niveles permanentes.',
      'Cofres de madera, plata y real, y un cofre gratis cada día.',
      'Tres torres legendarias nuevas: Dragón, Cronomante y Alquimista.',
      'Siete jefes con mecánicas propias: se dividen, invocan, se blindan, congelan torres, vuelan o se teletransportan.',
      'Bendiciones roguelike al terminar cada nivel, con rarezas y una tirada extra por partida.',
      'Modos nuevos: Expedición con mapa de caminos, Supervivencia infinita, Fusión al estilo Rush Royale, Desafío diario y Jefes.',
      'Aventura con estrellas y niveles que se desbloquean uno tras otro.',
      'Ocho biomas con decorado propio, números de daño, críticos, temblor de pantalla y pausa.',
      'Prioridad de disparo por torre, oleadas automáticas y panel de estadísticas.',
      'Perfil con nivel de cuenta, logros con recompensa, guía de torres y enemigos, novedades y códigos.'
    ]
  },
  {
    v: '1.5.0', fecha: 'sep 2026', titulo: 'Tower Defense renovado',
    notas: [
      'Nueve torres y nueve enemigos con dibujo propio.',
      'Mejoras permanentes con gemas, sonido sintetizado y guardado entre olas.'
    ]
  }
];

function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function key(c, r) { return c + ',' + r; }

var rng = Math.random;
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rand(a, b) { return a + rng() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function seededRand(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function shuffle(arr, r) {
  r = r || Math.random;
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function pickOne(arr, r) { return arr[Math.floor((r || Math.random)() * arr.length)]; }
function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function weightedPick(entries, r) {
  // entries: [[valor, peso], ...]
  r = r || Math.random;
  var total = 0;
  entries.forEach(function (e) { total += e[1]; });
  var x = r() * total;
  for (var i = 0; i < entries.length; i++) { x -= entries[i][1]; if (x <= 0) return entries[i][0]; }
  return entries[entries.length - 1][0];
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function lsGet(k, def) {
  try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : def; } catch (e) { return def; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

function shadeColor(hex, amt) {
  var n = parseInt(hex.slice(1), 16);
  var r = clamp(((n >> 16) & 255) + amt, 0, 255);
  var g = clamp(((n >> 8) & 255) + amt, 0, 255);
  var b = clamp((n & 255) + amt, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function hexA(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function showToast(msg, ms) {
  var t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(function () { t.classList.remove('show'); }, ms || 1600);
}
function showBigBanner(msg, sub) {
  var el = $('bigBannerText');
  if (!el) return;
  el.innerHTML = escapeHtml(msg) + (sub ? '<small>' + escapeHtml(sub) + '</small>' : '');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
function fmt(n) { return Math.round(n).toLocaleString('es-ES'); }
