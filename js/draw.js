/* =========================================================
   DIBUJO VECTORIAL: torres, enemigos, jefes y decorado.
   Todas las funciones reciben el contexto "c" para poder
   pintar también iconos de cartas en canvas aparte.
   ========================================================= */

function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function drawEyes(c, spread, yOff, r, eyeColor) {
  c.fillStyle = eyeColor || '#1a1a2e';
  c.beginPath(); c.arc(-spread, yOff, r, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(spread, yOff, r, 0, Math.PI * 2); c.fill();
  if (!eyeColor || eyeColor === '#1a1a2e') {
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.arc(-spread + r * 0.35, yOff - r * 0.35, r * 0.35, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(spread + r * 0.35, yOff - r * 0.35, r * 0.35, 0, Math.PI * 2); c.fill();
  }
}
function drawPoly(c, cx, cy, r1, sides) {
  c.beginPath();
  for (var i = 0; i < sides; i++) {
    var a = (i / sides) * Math.PI * 2;
    var px = cx + Math.cos(a) * r1 * 0.7, py = cy + Math.sin(a) * r1 * 0.35;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); c.fill();
}
function drawCrown(c, x, y, w, col) {
  c.fillStyle = col || '#ffd166';
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w / 2, y - w * 0.4);
  c.lineTo(x - w / 4, y - w * 0.18);
  c.lineTo(x, y - w * 0.5);
  c.lineTo(x + w / 4, y - w * 0.18);
  c.lineTo(x + w / 2, y - w * 0.4);
  c.lineTo(x + w / 2, y);
  c.closePath(); c.fill();
  c.fillStyle = '#e94560';
  c.beginPath(); c.arc(x, y - w * 0.12, w * 0.07, 0, Math.PI * 2); c.fill();
}

/* ---------- TORRES ---------- */
// t: { x, y, level, aimAngle, recoil, def, color, frozen, rank }
// La torre se construye en dos partes: el edificio (que evoluciona con el
// nivel: madera → piedra → almenas → mármol con banderas → obsidiana con aura
// y corona) y el arma de su tipo, que se monta encima y apunta al objetivo.
var TOWER_TIERS = [
  null,
  { wall: '#8a6a45', wall2: '#5e4529', trim: '#c49a6c', h: 0.10, rim: 0 },
  { wall: '#8b93a7', wall2: '#5c6378', trim: '#b8c0d4', h: 0.2, rim: 0 },
  { wall: '#9aa3b8', wall2: '#626a82', trim: '#d6dcec', h: 0.3, rim: 1 },
  { wall: '#dfe4f0', wall2: '#9aa2ba', trim: '#ffd166', h: 0.38, rim: 1, flags: true },
  { wall: '#3d3460', wall2: '#1c1733', trim: '#ffd166', h: 0.46, rim: 1, flags: true, aura: true, crown: true, glowWin: true }
];
function towerTier(level) { return TOWER_TIERS[clamp(level, 1, 5)]; }

function drawTowerShape(c, t, ts, now) {
  var lv = Math.max(1, t.level);
  var tier = towerTier(lv);
  var extra = Math.max(0, lv - 5); // rangos de Fusión por encima de 5
  var s = ts * (0.66 + Math.min(lv, 7) * 0.03);
  var d = t.def;
  var bw = s * 0.42;              // semiancho del edificio
  var bh = s * tier.h;            // altura del edificio
  var baseY = ts * 0.2;           // suelo
  var topY = baseY - bh;          // tejado del edificio
  c.save();
  c.translate(t.x, t.y);

  // aura giratoria de los niveles altos
  if (tier.aura) {
    var ar = s * (0.62 + extra * 0.04);
    var ag = c.createRadialGradient(0, baseY, s * 0.1, 0, baseY, ar);
    ag.addColorStop(0, hexA(d.color2, 0.45)); ag.addColorStop(1, hexA(d.color2, 0));
    c.fillStyle = ag;
    c.beginPath(); c.ellipse(0, baseY, ar, ar * 0.45, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.translate(0, baseY); c.scale(1, 0.45);
    c.strokeStyle = hexA(d.color2, 0.85); c.lineWidth = Math.max(1.5, s * 0.03);
    c.setLineDash([s * 0.08, s * 0.06]); c.lineDashOffset = -now / 40;
    c.beginPath(); c.arc(0, 0, ar * 0.92, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  // sombra
  c.beginPath(); c.ellipse(0, baseY + s * 0.03, bw * 1.2, bw * 0.42, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(0,0,0,0.4)'; c.fill();

  // cimiento
  c.fillStyle = shadeColor(tier.wall2, -15);
  c.beginPath(); c.ellipse(0, baseY, bw * 1.08, bw * 0.38, 0, 0, Math.PI * 2); c.fill();

  // muro (cilindro)
  var wg = c.createLinearGradient(-bw, 0, bw, 0);
  wg.addColorStop(0, tier.wall2); wg.addColorStop(0.45, tier.wall); wg.addColorStop(1, shadeColor(tier.wall2, -10));
  c.fillStyle = wg;
  c.beginPath();
  c.moveTo(-bw, baseY - bw * 0.05);
  c.lineTo(-bw, topY);
  c.ellipse(0, topY, bw, bw * 0.34, 0, Math.PI, 0, false);
  c.lineTo(bw, baseY - bw * 0.05);
  c.ellipse(0, baseY - bw * 0.05, bw, bw * 0.34, 0, 0, Math.PI, false);
  c.closePath(); c.fill();

  // textura: tablas (nivel 1) o hileras de piedra
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1;
  if (lv === 1) {
    for (var px = -bw; px < bw; px += bw * 0.4) { c.beginPath(); c.moveTo(px, topY); c.lineTo(px, baseY + bw * 0.3); c.stroke(); }
  } else {
    var rowH = Math.max(3, s * 0.075);
    for (var ry = topY + rowH, k = 0; ry < baseY + bw * 0.3; ry += rowH, k++) {
      c.beginPath(); c.ellipse(0, ry, bw, bw * 0.34, 0, 0, Math.PI); c.stroke();
      for (var bx = -bw + (k % 2) * bw * 0.25; bx < bw; bx += bw * 0.5) {
        c.beginPath(); c.moveTo(bx, ry); c.lineTo(bx, ry - rowH); c.stroke();
      }
    }
  }
  c.restore();

  // ventana / puerta
  if (tier.crown) {
    // emblema de nivel máximo en la fachada
    drawCrown(c, 0, topY + bh * 0.78, s * 0.34, '#ffd166');
  } else if (lv >= 2) {
    var winY = topY + bh * 0.55;
    c.fillStyle = tier.glowWin ? hexA(d.color2, 0.6 + Math.sin(now / 300) * 0.3) : 'rgba(20,16,30,0.8)';
    rrect(c, -bw * 0.16, winY - s * 0.06, bw * 0.32, s * 0.12, s * 0.05); c.fill();
  }

  // franja de color del tipo y ribete
  c.strokeStyle = t.color; c.lineWidth = Math.max(2, s * 0.05);
  c.beginPath(); c.ellipse(0, topY + bh * 0.25 + s * 0.02, bw * 1.0, bw * 0.34, 0, 0.1, Math.PI - 0.1); c.stroke();
  if (lv >= 4) {
    c.strokeStyle = tier.trim; c.lineWidth = Math.max(1.5, s * 0.03);
    c.beginPath(); c.ellipse(0, baseY - bw * 0.05, bw, bw * 0.34, 0, 0.05, Math.PI - 0.05); c.stroke();
  }

  // tejado del muro
  c.fillStyle = shadeColor(tier.wall, -8);
  c.beginPath(); c.ellipse(0, topY, bw, bw * 0.34, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = tier.trim; c.lineWidth = Math.max(1.5, s * 0.035); c.stroke();

  // almenas
  if (tier.rim) {
    var merlons = 10;
    // primero las de atrás y luego las de delante, para que se solapen bien
    var order = [];
    for (var mi = 0; mi < merlons; mi++) order.push(mi);
    order.sort(function (i, j) { return Math.sin((i + 0.5) / merlons * Math.PI * 2) - Math.sin((j + 0.5) / merlons * Math.PI * 2); });
    for (var oi = 0; oi < merlons; oi++) {
      var m = order[oi];
      var ma = (m + 0.5) / merlons * Math.PI * 2;
      var mx = Math.cos(ma) * bw * 0.9, my = topY + Math.sin(ma) * bw * 0.3;
      c.fillStyle = m % 2 ? tier.wall : t.color;
      c.fillRect(mx - s * 0.05, my - s * 0.11, s * 0.1, s * 0.11);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;
      c.strokeRect(mx - s * 0.05, my - s * 0.11, s * 0.1, s * 0.11);
    }
  }

  // banderas
  if (tier.flags) {
    [-1, 1].forEach(function (side) {
      var fx = side * bw * 1.02, fy = topY + s * 0.02;
      c.strokeStyle = '#3a2a14'; c.lineWidth = Math.max(1.2, s * 0.025);
      c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - s * 0.4); c.stroke();
      var wave = Math.sin(now / 200 + side) * s * 0.04;
      c.fillStyle = side < 0 ? t.color : d.color2;
      c.beginPath();
      c.moveTo(fx, fy - s * 0.4);
      c.quadraticCurveTo(fx + side * s * 0.12, fy - s * 0.37 + wave, fx + side * s * 0.22, fy - s * 0.33);
      c.quadraticCurveTo(fx + side * s * 0.12, fy - s * 0.27 + wave, fx, fy - s * 0.26);
      c.closePath(); c.fill();
    });
  }

  // brillo bajo el arma, más intenso cuanto más nivel
  var glowR = s * (0.22 + lv * 0.04);
  var gg = c.createRadialGradient(0, topY, 1, 0, topY, glowR);
  gg.addColorStop(0, hexA(d.color2, 0.15 + lv * 0.08)); gg.addColorStop(1, hexA(d.color2, 0));
  c.fillStyle = gg;
  c.beginPath(); c.arc(0, topY, glowR, 0, Math.PI * 2); c.fill();

  // soporte metálico del arma: remaches desde el nivel 2 y gemas desde el 4
  var ws = s * (0.78 + lv * 0.05);
  if (lv >= 2 && !d.support) {
    var mr = bw * 0.62;
    c.fillStyle = shadeColor(tier.trim, -60);
    c.beginPath(); c.ellipse(0, topY, mr, mr * 0.4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = tier.trim; c.lineWidth = Math.max(1, s * 0.025); c.stroke();
    var studs = lv >= 4 ? 6 : 4;
    for (var st = 0; st < studs; st++) {
      var sa2 = st / studs * Math.PI * 2 + Math.PI / studs;
      c.fillStyle = lv >= 4 && st % 2 ? d.color2 : tier.trim;
      c.beginPath(); c.arc(Math.cos(sa2) * mr * 0.8, topY + Math.sin(sa2) * mr * 0.32, Math.max(1.2, s * (lv >= 4 && st % 2 ? 0.035 : 0.022)), 0, Math.PI * 2); c.fill();
    }
  }

  // arma del tipo, montada sobre el edificio
  c.save();
  c.translate(0, topY - s * 0.05);
  if (d.support) {
    drawAlchemist(c, t, ws, now);
  } else {
    c.rotate(t.aimAngle + Math.PI / 2);
    c.translate(0, t.recoil * ws * 0.08);
    drawTowerTop(c, t, ws, now);
  }
  c.restore();

  // corona y destellos del nivel máximo
  if (tier.crown) {
    for (var sp = 0; sp < 4 + extra; sp++) {
      var sa = now / 700 + sp * (Math.PI * 2 / (4 + extra));
      var sx = Math.cos(sa) * s * 0.55, sy = topY - s * 0.15 + Math.sin(sa) * s * 0.22;
      var sr = s * (0.035 + 0.02 * Math.sin(now / 150 + sp));
      c.fillStyle = sp % 2 ? '#fff6c4' : d.color2;
      c.beginPath();
      c.moveTo(sx, sy - sr * 2); c.lineTo(sx + sr * 0.6, sy); c.lineTo(sx, sy + sr * 2); c.lineTo(sx - sr * 0.6, sy);
      c.closePath(); c.fill();
    }
  }

  if (t.frozen) {
    c.fillStyle = 'rgba(160,220,255,0.55)';
    rrect(c, -s * 0.5, topY - s * 0.6, s * 1.0, baseY - topY + s * 0.75, s * 0.12); c.fill();
    c.strokeStyle = '#e6f8ff'; c.lineWidth = 2; c.stroke();
  }
  c.restore();
}

/* ---------- ARMAS DE LAS TORRES ----------
   Estilo «juego de móvil»: formas gruesas con contorno oscuro, degradados,
   brillo especular y animación. Se dibujan con el origen en el soporte y
   apuntando hacia arriba (-y), ya girados hacia el objetivo. */
var INK = 'rgba(12,10,24,0.85)';
function inkStroke(c, s, k) { c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = Math.max(1.4, s * (k || 0.045)); c.stroke(); }
function gloss(c, x, y, rx, ry, a) {
  c.fillStyle = 'rgba(255,255,255,' + (a || 0.45) + ')';
  c.beginPath(); c.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); c.fill();
}
function softGlow(c, x, y, r, color, a) {
  var g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a == null ? 0.7 : a)); g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
function vGrad(c, y1, y2, a, b) { var g = c.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function hGrad(c, x1, x2, a, b, mid) { var g = c.createLinearGradient(x1, 0, x2, 0); g.addColorStop(0, a); if (mid) g.addColorStop(0.45, mid); g.addColorStop(1, b); return g; }
function metalRing(c, s, r, col) {
  c.fillStyle = hGrad(c, -r, r, shadeColor(col, -50), shadeColor(col, -30), shadeColor(col, 40));
  c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.035);
}
function flamePath(c, w, h, wob) {
  c.beginPath();
  c.moveTo(0, -h);
  c.bezierCurveTo(w * 0.35 + wob, -h * 0.6, w, -h * 0.25, w * 0.75, 0);
  c.bezierCurveTo(w * 0.55, h * 0.3, -w * 0.55, h * 0.3, -w * 0.75, 0);
  c.bezierCurveTo(-w, -h * 0.25, -w * 0.35 + wob, -h * 0.6, 0, -h);
  c.closePath();
}

function drawTowerTop(c, t, s, now) {
  var d = t.def, sh = d.shape, i;
  if (sh === 'fire') {
    // brasero de hierro con llama en capas y brasas
    c.fillStyle = hGrad(c, -s * 0.34, s * 0.34, '#3a2a26', '#2a1c19', '#6b5148');
    c.beginPath(); c.moveTo(-s * 0.34, -s * 0.06); c.lineTo(s * 0.34, -s * 0.06); c.lineTo(s * 0.22, s * 0.16); c.lineTo(-s * 0.22, s * 0.16); c.closePath(); c.fill(); inkStroke(c, s);
    c.fillStyle = '#ffcf5a'; c.fillRect(-s * 0.35, -s * 0.1, s * 0.7, s * 0.06); c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.03); c.strokeRect(-s * 0.35, -s * 0.1, s * 0.7, s * 0.06);
    softGlow(c, 0, -s * 0.3, s * 0.55, '#ff7a1a', 0.55);
    var f = Math.sin(now / 80) * s * 0.03, f2 = Math.cos(now / 110) * s * 0.03;
    flamePath(c, s * 0.34, s * 0.72 + f, f2); c.fillStyle = vGrad(c, -s * 0.8, 0, '#ff3b1f', '#c81d0f'); c.fill(); inkStroke(c, s, 0.04);
    c.save(); c.translate(0, -s * 0.06); flamePath(c, s * 0.24, s * 0.56 - f, -f2); c.fillStyle = vGrad(c, -s * 0.6, 0, '#ffb020', '#ff6a00'); c.fill(); c.restore();
    c.save(); c.translate(0, -s * 0.1); flamePath(c, s * 0.13, s * 0.36 + f, f2 * 0.5); c.fillStyle = '#fff2a8'; c.fill(); c.restore();
    for (i = 0; i < 4; i++) {
      var ph = ((now / 900) + i / 4) % 1;
      c.globalAlpha = 1 - ph;
      c.fillStyle = i % 2 ? '#ffd166' : '#ff6a00';
      c.beginPath(); c.arc(Math.sin(i * 2.3 + now / 300) * s * 0.18, -s * 0.5 - ph * s * 0.5, s * 0.035 * (1 - ph * 0.5), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  } else if (sh === 'frost') {
    // racimo de cristales de hielo facetados
    softGlow(c, 0, -s * 0.3, s * 0.6, '#8fe9ff', 0.45);
    var crystal = function (x, y, w, h, rot) {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath(); c.moveTo(0, -h); c.lineTo(w, -h * 0.72); c.lineTo(w, 0); c.lineTo(0, h * 0.22); c.lineTo(-w, 0); c.lineTo(-w, -h * 0.72); c.closePath();
      c.fillStyle = hGrad(c, -w, w, '#5fc8e8', '#3a9fd0', '#e8fbff'); c.fill(); inkStroke(c, s, 0.035);
      c.beginPath(); c.moveTo(0, -h); c.lineTo(0, h * 0.22); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = Math.max(1, s * 0.02); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(-w * 0.7, -h * 0.68); c.lineTo(-w * 0.15, -h * 0.9); c.lineTo(-w * 0.15, -h * 0.35); c.lineTo(-w * 0.7, -h * 0.2); c.closePath(); c.fill();
      c.restore();
    };
    crystal(-s * 0.22, -s * 0.02, s * 0.1, s * 0.34, -0.45);
    crystal(s * 0.22, -s * 0.02, s * 0.1, s * 0.34, 0.45);
    crystal(0, -s * 0.06, s * 0.15, s * 0.6, 0);
    for (i = 0; i < 3; i++) {
      var a = now / 900 + i * 2.1;
      var sx = Math.cos(a) * s * 0.42, sy = -s * 0.3 + Math.sin(a) * s * 0.18, r = s * 0.06;
      c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, s * 0.022);
      for (var k = 0; k < 3; k++) { var aa = k * Math.PI / 3 + now / 500; c.beginPath(); c.moveTo(sx - Math.cos(aa) * r, sy - Math.sin(aa) * r); c.lineTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r); c.stroke(); }
    }
  } else if (sh === 'nature') {
    // árbol guardián con copa frondosa y arco tensado
    c.fillStyle = hGrad(c, -s * 0.09, s * 0.09, '#5a3a1e', '#4a2e16', '#8a5a30');
    c.beginPath(); c.moveTo(-s * 0.08, s * 0.12); c.lineTo(-s * 0.06, -s * 0.3); c.lineTo(s * 0.06, -s * 0.3); c.lineTo(s * 0.08, s * 0.12); c.closePath(); c.fill(); inkStroke(c, s, 0.035);
    var leaf = function (x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = vGrad(c, y - r, y + r, shadeColor(col, 35), shadeColor(col, -35)); c.fill(); inkStroke(c, s, 0.035); };
    var sway = Math.sin(now / 600) * s * 0.02;
    leaf(-s * 0.24 + sway, -s * 0.34, s * 0.18, t.color);
    leaf(s * 0.24 + sway, -s * 0.34, s * 0.18, t.color);
    leaf(sway, -s * 0.5, s * 0.24, t.color);
    gloss(c, -s * 0.07 + sway, -s * 0.6, s * 0.08, s * 0.045, 0.4);
    c.fillStyle = '#ff6b8a'; [[-0.25, -0.4], [0.2, -0.28], [0.06, -0.62]].forEach(function (p) { c.beginPath(); c.arc(p[0] * s + sway, p[1] * s, s * 0.035, 0, Math.PI * 2); c.fill(); });
    // arco
    c.strokeStyle = '#7a4a1e'; c.lineWidth = Math.max(2, s * 0.06);
    c.beginPath(); c.arc(0, -s * 0.05, s * 0.36, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.strokeStyle = '#f4ead0'; c.lineWidth = Math.max(1, s * 0.018);
    var bx = Math.cos(Math.PI * 1.15) * s * 0.36, by = -s * 0.05 + Math.sin(Math.PI * 1.15) * s * 0.36;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(0, -s * 0.02 + t.recoil * s * 0.1); c.lineTo(-bx, by); c.stroke();
    c.strokeStyle = '#e8d7a8'; c.lineWidth = Math.max(1.2, s * 0.03);
    c.beginPath(); c.moveTo(0, -s * 0.02); c.lineTo(0, -s * 0.5); c.stroke();
    c.fillStyle = '#c9d3e0'; c.beginPath(); c.moveTo(0, -s * 0.58); c.lineTo(s * 0.05, -s * 0.48); c.lineTo(-s * 0.05, -s * 0.48); c.closePath(); c.fill();
  } else if (sh === 'electric') {
    // bobina de Tesla con esfera cargada y arcos eléctricos
    c.fillStyle = hGrad(c, -s * 0.12, s * 0.12, '#3b3f5c', '#2a2d44', '#8a90b8');
    rrect(c, -s * 0.11, -s * 0.4, s * 0.22, s * 0.5, s * 0.05); c.fill(); inkStroke(c, s, 0.035);
    for (i = 0; i < 4; i++) {
      var ry = -s * 0.34 + i * s * 0.11;
      c.fillStyle = hGrad(c, -s * 0.2, s * 0.2, '#a0522d', '#7a3a1a', '#ffb070');
      c.beginPath(); c.ellipse(0, ry, s * (0.2 - i * 0.012), s * 0.05, 0, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.025);
    }
    var pulse = 0.85 + Math.sin(now / 120) * 0.15;
    softGlow(c, 0, -s * 0.58, s * 0.45 * pulse, '#b9a6ff', 0.75);
    var og = c.createRadialGradient(-s * 0.05, -s * 0.63, s * 0.02, 0, -s * 0.58, s * 0.17);
    og.addColorStop(0, '#ffffff'); og.addColorStop(0.5, d.color2); og.addColorStop(1, t.color);
    c.fillStyle = og; c.beginPath(); c.arc(0, -s * 0.58, s * 0.17, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.035);
    gloss(c, -s * 0.06, -s * 0.64, s * 0.05, s * 0.03, 0.8);
    c.strokeStyle = '#fff7b0'; c.lineWidth = Math.max(1, s * 0.022);
    for (i = 0; i < 3; i++) {
      var la = (Math.floor(now / 90) * 1.7 + i * 2.1);
      c.beginPath(); c.moveTo(Math.cos(la) * s * 0.17, -s * 0.58 + Math.sin(la) * s * 0.17);
      for (var sg = 1; sg <= 3; sg++) c.lineTo(Math.cos(la + sg * 0.25) * s * (0.17 + sg * 0.09) + Math.sin(la * 3 + sg) * s * 0.04, -s * 0.58 + Math.sin(la + sg * 0.25) * s * (0.17 + sg * 0.09));
      c.stroke();
    }
  } else if (sh === 'venom') {
    // matraz de veneno con boquilla que gotea y burbujas
    c.fillStyle = hGrad(c, -s * 0.07, s * 0.07, '#3a2a4a', '#2a1e36', '#7a6a96');
    rrect(c, -s * 0.07, -s * 0.72, s * 0.14, s * 0.3, s * 0.03); c.fill(); inkStroke(c, s, 0.035);
    c.fillStyle = '#5cff9e'; c.beginPath(); c.ellipse(0, -s * 0.74, s * 0.08, s * 0.03, 0, 0, Math.PI * 2); c.fill();
    var drip = (now / 700) % 1;
    c.globalAlpha = 1 - drip; c.fillStyle = '#5cff9e';
    c.beginPath(); c.arc(0, -s * 0.78 - drip * s * 0.12, s * 0.035, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(0, -s * 0.18, s * 0.3, 0, Math.PI * 2);
    c.fillStyle = 'rgba(200,170,255,0.25)'; c.fill(); inkStroke(c, s, 0.045);
    c.save(); c.beginPath(); c.arc(0, -s * 0.18, s * 0.27, 0, Math.PI * 2); c.clip();
    var lvl = -s * 0.2 + Math.sin(now / 400) * s * 0.02;
    c.fillStyle = vGrad(c, lvl, s * 0.12, '#7dffb5', '#1f9e57'); c.fillRect(-s * 0.3, lvl, s * 0.6, s * 0.5);
    for (i = 0; i < 4; i++) { var bp = ((now / 800) + i / 4) % 1; c.fillStyle = 'rgba(230,255,240,' + (0.8 - bp * 0.6) + ')'; c.beginPath(); c.arc(Math.sin(i * 1.9) * s * 0.14, s * 0.04 - bp * s * 0.24, s * 0.03 + i * s * 0.005, 0, Math.PI * 2); c.fill(); }
    c.restore();
    softGlow(c, 0, -s * 0.1, s * 0.4, '#5cff9e', 0.3);
    gloss(c, -s * 0.12, -s * 0.3, s * 0.07, s * 0.04, 0.6);
    // calavera
    c.fillStyle = '#efe6ff'; c.beginPath(); c.arc(0, -s * 0.06, s * 0.08, 0, Math.PI * 2); c.fill();
    c.fillRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.06);
    c.fillStyle = '#2a1e36'; c.beginPath(); c.arc(-s * 0.03, -s * 0.07, s * 0.022, 0, Math.PI * 2); c.arc(s * 0.03, -s * 0.07, s * 0.022, 0, Math.PI * 2); c.fill();
  } else if (sh === 'wind') {
    // turbina con aspas girando dentro de un anillo
    var rot = now / (t.recoil > 0 ? 60 : 160);
    c.beginPath(); c.arc(0, -s * 0.28, s * 0.4, 0, Math.PI * 2);
    c.fillStyle = 'rgba(234,255,255,0.12)'; c.fill();
    c.lineWidth = Math.max(3, s * 0.09); c.strokeStyle = hGrad(c, -s * 0.4, s * 0.4, '#2a7f7f', '#1f6060', '#8fe6e6'); c.stroke();
    c.lineWidth = Math.max(1, s * 0.025); c.strokeStyle = INK; c.beginPath(); c.arc(0, -s * 0.28, s * 0.45, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, -s * 0.28, s * 0.355, 0, Math.PI * 2); c.stroke();
    c.save(); c.translate(0, -s * 0.28); c.rotate(rot);
    for (i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.18, -s * 0.12, s * 0.06, -s * 0.33); c.quadraticCurveTo(-s * 0.06, -s * 0.18, 0, 0);
      c.fillStyle = vGrad(c, -s * 0.33, 0, '#ffffff', '#9ee8e8'); c.fill(); inkStroke(c, s, 0.025);
    }
    c.restore();
    c.fillStyle = '#ffd166'; c.beginPath(); c.arc(0, -s * 0.28, s * 0.07, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.025);
    c.strokeStyle = 'rgba(234,255,255,0.75)'; c.lineWidth = Math.max(1, s * 0.025);
    for (i = 0; i < 2; i++) { var wy = -s * 0.78 - i * s * 0.08 + ((now / 400) % 1) * s * 0.05; c.beginPath(); c.moveTo(-s * 0.18, wy); c.quadraticCurveTo(0, wy - s * 0.06, s * 0.18, wy); c.stroke(); }
  } else if (sh === 'sniper') {
    // fusil de precisión: carcasa blindada, mira telescópica y cañón largo
    c.fillStyle = hGrad(c, -s * 0.06, s * 0.06, '#2a3550', '#1a2238', '#6a7aa8');
    rrect(c, -s * 0.055, -s * 0.9, s * 0.11, s * 0.7, s * 0.03); c.fill(); inkStroke(c, s, 0.03);
    c.fillStyle = '#121828'; rrect(c, -s * 0.09, -s * 0.96, s * 0.18, s * 0.1, s * 0.03); c.fill(); inkStroke(c, s, 0.025);
    c.fillStyle = '#ffd166'; c.fillRect(-s * 0.06, -s * 0.6, s * 0.12, s * 0.035);
    c.fillStyle = hGrad(c, -s * 0.27, s * 0.27, '#3a4a70', '#24304c', '#7a8cc0');
    c.beginPath(); c.moveTo(-s * 0.27, s * 0.12); c.lineTo(-s * 0.2, -s * 0.24); c.lineTo(s * 0.2, -s * 0.24); c.lineTo(s * 0.27, s * 0.12); c.closePath(); c.fill(); inkStroke(c, s);
    // mira
    c.fillStyle = hGrad(c, s * 0.08, s * 0.2, '#1a1a1a', '#0a0a0a', '#555'); rrect(c, s * 0.08, -s * 0.46, s * 0.1, s * 0.3, s * 0.04); c.fill(); inkStroke(c, s, 0.025);
    c.fillStyle = d.color2; c.beginPath(); c.arc(s * 0.13, -s * 0.46, s * 0.04, 0, Math.PI * 2); c.fill();
    softGlow(c, s * 0.13, -s * 0.46, s * 0.12, d.color2, 0.6 + Math.sin(now / 200) * 0.3);
    gloss(c, -s * 0.1, -s * 0.12, s * 0.07, s * 0.03, 0.35);
    if (t.recoil > 0.3) softGlow(c, 0, -s * 1.0, s * 0.25, '#ffe9a0', 0.9);
  } else if (sh === 'cannon') {
    // mortero pesado de hierro con bandas doradas
    c.fillStyle = hGrad(c, -s * 0.16, s * 0.16, '#2b2b2f', '#1a1a1d', '#6a6a72');
    c.beginPath(); c.moveTo(-s * 0.15, -s * 0.05); c.lineTo(-s * 0.12, -s * 0.66); c.lineTo(s * 0.12, -s * 0.66); c.lineTo(s * 0.15, -s * 0.05); c.closePath(); c.fill(); inkStroke(c, s);
    c.fillStyle = hGrad(c, -s * 0.17, s * 0.17, '#b8862b', '#8a6418', '#ffe08a');
    rrect(c, -s * 0.16, -s * 0.72, s * 0.32, s * 0.1, s * 0.03); c.fill(); inkStroke(c, s, 0.03);
    rrect(c, -s * 0.155, -s * 0.4, s * 0.31, s * 0.06, s * 0.02); c.fill(); inkStroke(c, s, 0.025);
    c.fillStyle = '#0a0a0c'; c.beginPath(); c.ellipse(0, -s * 0.72, s * 0.1, s * 0.045, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    var cg = c.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.03, 0, 0, s * 0.3); cg.addColorStop(0, shadeColor(t.color, 60)); cg.addColorStop(1, shadeColor(t.color, -40));
    c.fillStyle = cg; c.fill(); inkStroke(c, s);
    c.fillStyle = '#ffd166';
    for (i = 0; i < 6; i++) { var ra = i / 6 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(ra) * s * 0.22, Math.sin(ra) * s * 0.22, s * 0.025, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = d.color2; c.beginPath(); c.arc(0, 0, s * 0.09, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.025);
    gloss(c, -s * 0.12, -s * 0.12, s * 0.08, s * 0.04, 0.35);
    if (t.recoil > 0.3) { softGlow(c, 0, -s * 0.8, s * 0.3, '#ff8f3c', 0.9); c.fillStyle = 'rgba(200,200,200,0.5)'; c.beginPath(); c.arc(-s * 0.1, -s * 0.85, s * 0.08, 0, Math.PI * 2); c.arc(s * 0.08, -s * 0.9, s * 0.06, 0, Math.PI * 2); c.fill(); }
  } else if (sh === 'arcane') {
    // cristal arcano flotante con círculo de runas
    var hover = Math.sin(now / 350) * s * 0.05;
    c.save(); c.translate(0, -s * 0.06); c.scale(1, 0.45); c.rotate(now / 1500);
    c.strokeStyle = hexA(d.color2, 0.9); c.lineWidth = Math.max(1.5, s * 0.035);
    c.beginPath(); c.arc(0, 0, s * 0.36, 0, Math.PI * 2); c.stroke();
    for (i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillStyle = d.color2; c.fillRect(s * 0.3, -s * 0.025, s * 0.06, s * 0.05); }
    c.restore();
    softGlow(c, 0, -s * 0.38 + hover, s * 0.5, d.color2, 0.55);
    c.save(); c.translate(0, -s * 0.38 + hover);
    c.beginPath(); c.moveTo(0, -s * 0.34); c.lineTo(s * 0.17, -s * 0.06); c.lineTo(0, s * 0.24); c.lineTo(-s * 0.17, -s * 0.06); c.closePath();
    c.fillStyle = hGrad(c, -s * 0.17, s * 0.17, '#5a2aa8', '#3a1a78', '#e6d0ff'); c.fill(); inkStroke(c, s, 0.04);
    c.beginPath(); c.moveTo(0, -s * 0.34); c.lineTo(0, s * 0.24); c.moveTo(-s * 0.17, -s * 0.06); c.lineTo(s * 0.17, -s * 0.06);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = Math.max(1, s * 0.018); c.stroke();
    gloss(c, -s * 0.06, -s * 0.14, s * 0.04, s * 0.08, 0.55);
    c.restore();
    for (i = 0; i < 3; i++) {
      var oa = (i / 3) * Math.PI * 2 + now / 450;
      var ox = Math.cos(oa) * s * 0.34, oy = -s * 0.38 + hover + Math.sin(oa) * s * 0.14;
      softGlow(c, ox, oy, s * 0.09, d.color2, 0.8);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ox, oy, s * 0.03, 0, Math.PI * 2); c.fill();
    }
  } else if (sh === 'dragon') {
    // cabeza de dragón con cuernos, alas, escamas y fuego en la boca
    var flap = Math.sin(now / 160) * s * 0.07;
    var wing = function (side) {
      c.beginPath(); c.moveTo(side * s * 0.12, -s * 0.05);
      c.quadraticCurveTo(side * s * 0.55, -s * 0.45 - flap, side * s * 0.62, s * 0.05 - flap * 0.5);
      c.quadraticCurveTo(side * s * 0.45, -s * 0.02, side * s * 0.4, s * 0.15);
      c.quadraticCurveTo(side * s * 0.28, s * 0.02, side * s * 0.12, s * 0.12); c.closePath();
      c.fillStyle = hGrad(c, -s * 0.6, s * 0.6, shadeColor(t.color, -50), shadeColor(t.color, -50), shadeColor(t.color, -10)); c.fill(); inkStroke(c, s, 0.035);
    };
    wing(-1); wing(1);
    c.beginPath(); c.moveTo(0, -s * 0.66);
    c.bezierCurveTo(s * 0.2, -s * 0.6, s * 0.26, -s * 0.2, s * 0.2, s * 0.12);
    c.lineTo(-s * 0.2, s * 0.12);
    c.bezierCurveTo(-s * 0.26, -s * 0.2, -s * 0.2, -s * 0.6, 0, -s * 0.66); c.closePath();
    c.fillStyle = vGrad(c, -s * 0.66, s * 0.12, shadeColor(t.color, 40), shadeColor(t.color, -30)); c.fill(); inkStroke(c, s);
    c.fillStyle = hexA('#000000', 0.18);
    for (i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -s * 0.05 - i * s * 0.12, s * 0.06, 0, Math.PI); c.fill(); }
    c.fillStyle = '#fff1d0';
    c.beginPath(); c.moveTo(-s * 0.14, -s * 0.32); c.quadraticCurveTo(-s * 0.32, -s * 0.5, -s * 0.3, -s * 0.66); c.quadraticCurveTo(-s * 0.2, -s * 0.48, -s * 0.06, -s * 0.38); c.closePath(); c.fill(); inkStroke(c, s, 0.025);
    c.beginPath(); c.moveTo(s * 0.14, -s * 0.32); c.quadraticCurveTo(s * 0.32, -s * 0.5, s * 0.3, -s * 0.66); c.quadraticCurveTo(s * 0.2, -s * 0.48, s * 0.06, -s * 0.38); c.closePath(); c.fill(); inkStroke(c, s, 0.025);
    softGlow(c, -s * 0.08, -s * 0.36, s * 0.07, '#ffe97c', 0.9); softGlow(c, s * 0.08, -s * 0.36, s * 0.07, '#ffe97c', 0.9);
    c.fillStyle = '#ffe97c'; c.beginPath(); c.ellipse(-s * 0.08, -s * 0.36, s * 0.035, s * 0.02, -0.3, 0, Math.PI * 2); c.ellipse(s * 0.08, -s * 0.36, s * 0.035, s * 0.02, 0.3, 0, Math.PI * 2); c.fill();
    softGlow(c, 0, -s * 0.66, s * (0.14 + (t.recoil > 0.2 ? 0.12 : 0) + Math.sin(now / 90) * 0.02), '#ff8a2a', 0.85);
    gloss(c, -s * 0.07, -s * 0.5, s * 0.04, s * 0.02, 0.4);
  } else if (sh === 'chrono') {
    // reloj de arena dorado sobre un engranaje que gira
    c.save(); c.translate(0, -s * 0.3); c.rotate(now / 2200);
    c.beginPath();
    for (i = 0; i < 12; i++) { var ga = i / 12 * Math.PI * 2; c.lineTo(Math.cos(ga) * s * 0.42, Math.sin(ga) * s * 0.42); c.lineTo(Math.cos(ga + 0.26) * s * 0.42, Math.sin(ga + 0.26) * s * 0.42); c.lineTo(Math.cos(ga + 0.3) * s * 0.34, Math.sin(ga + 0.3) * s * 0.34); c.lineTo(Math.cos(ga + 0.52) * s * 0.34, Math.sin(ga + 0.52) * s * 0.34); }
    c.closePath(); c.fillStyle = hexA(t.color, 0.85); c.fill(); inkStroke(c, s, 0.03);
    c.restore();
    softGlow(c, 0, -s * 0.3, s * 0.42, d.color2, 0.5);
    var frame = hGrad(c, -s * 0.22, s * 0.22, '#a07a2a', '#8a6418', '#ffe08a');
    c.fillStyle = frame; rrect(c, -s * 0.22, -s * 0.66, s * 0.44, s * 0.07, s * 0.03); c.fill(); inkStroke(c, s, 0.03);
    rrect(c, -s * 0.22, s * 0.0, s * 0.44, s * 0.07, s * 0.03); c.fill(); inkStroke(c, s, 0.03);
    c.fillRect(-s * 0.2, -s * 0.6, s * 0.035, s * 0.62); c.fillRect(s * 0.165, -s * 0.6, s * 0.035, s * 0.62);
    c.beginPath(); c.moveTo(-s * 0.15, -s * 0.59); c.lineTo(s * 0.15, -s * 0.59); c.quadraticCurveTo(s * 0.12, -s * 0.36, s * 0.025, -s * 0.3); c.quadraticCurveTo(s * 0.12, -s * 0.24, s * 0.15, s * 0.0); c.lineTo(-s * 0.15, s * 0.0); c.quadraticCurveTo(-s * 0.12, -s * 0.24, -s * 0.025, -s * 0.3); c.quadraticCurveTo(-s * 0.12, -s * 0.36, -s * 0.15, -s * 0.59); c.closePath();
    c.fillStyle = 'rgba(220,240,255,0.35)'; c.fill(); inkStroke(c, s, 0.03);
    var st = (now / 3000) % 1;
    c.fillStyle = d.color2;
    c.beginPath(); c.moveTo(-s * 0.12 * (1 - st), -s * 0.52 + st * s * 0.18); c.lineTo(s * 0.12 * (1 - st), -s * 0.52 + st * s * 0.18); c.lineTo(0, -s * 0.32); c.closePath(); c.fill();
    c.fillRect(-s * 0.008, -s * 0.32, s * 0.016, s * 0.3);
    c.beginPath(); c.moveTo(-s * 0.13 * (0.3 + st * 0.7), -s * 0.01); c.quadraticCurveTo(0, -s * 0.16 * st - s * 0.03, s * 0.13 * (0.3 + st * 0.7), -s * 0.01); c.closePath(); c.fill();
    gloss(c, -s * 0.08, -s * 0.48, s * 0.03, s * 0.08, 0.45);
  }
}
function drawAlchemist(c, t, s, now) {
  // matraz redondo burbujeante sobre trípode dorado
  var bob = Math.sin(now / 300) * s * 0.03, i;
  c.strokeStyle = '#b8862b'; c.lineWidth = Math.max(2, s * 0.05);
  c.beginPath(); c.moveTo(-s * 0.24, s * 0.1); c.lineTo(-s * 0.14, -s * 0.12); c.moveTo(s * 0.24, s * 0.1); c.lineTo(s * 0.14, -s * 0.12); c.stroke();
  softGlow(c, 0, -s * 0.24 + bob, s * 0.55, t.def.color2, 0.45);
  c.fillStyle = 'rgba(230,255,240,0.25)';
  c.beginPath(); c.arc(0, -s * 0.24 + bob, s * 0.28, 0, Math.PI * 2); c.fill(); inkStroke(c, s, 0.045);
  c.fillStyle = 'rgba(230,255,240,0.3)'; rrect(c, -s * 0.07, -s * 0.72 + bob, s * 0.14, s * 0.24, s * 0.03); c.fill(); inkStroke(c, s, 0.035);
  c.save(); c.beginPath(); c.arc(0, -s * 0.24 + bob, s * 0.25, 0, Math.PI * 2); c.clip();
  var lv = -s * 0.24 + bob + Math.sin(now / 350) * s * 0.02;
  c.fillStyle = vGrad(c, lv, s * 0.05, '#fff08a', '#e0a020'); c.fillRect(-s * 0.3, lv, s * 0.6, s * 0.4);
  for (i = 0; i < 4; i++) { var ph = ((now / 700) + i / 4) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.85 - ph * 0.6) + ')'; c.beginPath(); c.arc(Math.sin(i * 2 + now / 300) * s * 0.12, -s * 0.02 + bob - ph * s * 0.22, s * 0.03, 0, Math.PI * 2); c.fill(); }
  c.restore();
  gloss(c, -s * 0.1, -s * 0.36 + bob, s * 0.07, s * 0.04, 0.6);
  c.fillStyle = hGrad(c, -s * 0.09, s * 0.09, '#6b4220', '#5a3518', '#a8743e'); rrect(c, -s * 0.09, -s * 0.8 + bob, s * 0.18, s * 0.09, s * 0.03); c.fill(); inkStroke(c, s, 0.03);
  for (i = 0; i < 3; i++) {
    var p2 = ((now / 900) + i / 3) % 1;
    c.globalAlpha = 1 - p2; c.fillStyle = i % 2 ? '#ffd54f' : '#9cffb0';
    c.beginPath(); c.arc(Math.sin(i * 2.4 + now / 400) * s * 0.12, -s * 0.85 - p2 * s * 0.3 + bob, s * 0.035, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

/* ---------- ENEMIGOS ---------- */
// e: { x, y, bobPhase, def, isBoss, isElite, boss, shielded, typeId }
function drawEnemyShape(c, e, ts, now) {
  var size = ts * (e.isBoss ? 1.4 : e.isElite ? 0.92 : 0.72);
  var bob = Math.sin(e.bobPhase) * ts * 0.03;
  var col = e.isBoss ? e.boss.color : e.def.color;
  c.save();
  c.translate(e.x, e.y + bob);
  if (e.dir && !e.isBoss && e.def.shape !== 'bat') c.scale(e.dir, 1);

  var sh = e.isBoss ? 'boss_' + e.bossKind : e.def.shape;
  if (sh === 'slime') {
    var squash = 1 + Math.sin(e.bobPhase * 1.3) * 0.06;
    c.beginPath();
    c.ellipse(0, size * 0.08, size * 0.42 * squash, size * 0.34 / squash, 0, 0, Math.PI * 2);
    var g = c.createRadialGradient(-size * 0.12, -size * 0.1, size * 0.05, 0, 0, size * 0.45);
    g.addColorStop(0, shadeColor(col, 40)); g.addColorStop(1, col);
    c.fillStyle = g; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-size * 0.13, -size * 0.06, size * 0.1, size * 0.06, -0.4, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.09, -size * 0.02, size * 0.055);
  } else if (sh === 'goblin') {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, -size * 0.4); c.lineTo(size * 0.34, size * 0.18); c.lineTo(size * 0.2, size * 0.42);
    c.lineTo(-size * 0.2, size * 0.42); c.lineTo(-size * 0.34, size * 0.18);
    c.closePath(); c.fill();
    c.fillStyle = shadeColor(col, -30);
    c.beginPath(); c.moveTo(-size * 0.34, -size * 0.1); c.lineTo(-size * 0.5, -size * 0.28); c.lineTo(-size * 0.22, -size * 0.14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(size * 0.34, -size * 0.1); c.lineTo(size * 0.5, -size * 0.28); c.lineTo(size * 0.22, -size * 0.14); c.closePath(); c.fill();
    c.fillStyle = '#8b5a2b';
    c.fillRect(size * 0.22, -size * 0.05, size * 0.06, size * 0.4);
    drawEyes(c, size * 0.1, -size * 0.08, size * 0.05, '#ffcf4d');
    c.fillStyle = '#fff';
    c.fillRect(-size * 0.08, size * 0.08, size * 0.05, size * 0.06); c.fillRect(size * 0.03, size * 0.08, size * 0.05, size * 0.06);
  } else if (sh === 'brute') {
    c.fillStyle = shadeColor(col, -20);
    rrect(c, -size * 0.42, -size * 0.4, size * 0.84, size * 0.8, size * 0.14); c.fill();
    c.fillStyle = col;
    rrect(c, -size * 0.34, -size * 0.32, size * 0.68, size * 0.64, size * 0.1); c.fill();
    c.fillStyle = '#7a7f8c';
    rrect(c, -size * 0.36, -size * 0.44, size * 0.72, size * 0.18, size * 0.06); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = size * 0.04;
    c.beginPath(); c.moveTo(-size * 0.3, size * 0.1); c.lineTo(size * 0.3, size * 0.1); c.stroke();
    drawEyes(c, size * 0.13, -size * 0.12, size * 0.06, '#ff3b3b');
  } else if (sh === 'bat') {
    var flap = Math.sin(e.bobPhase * 2) * size * 0.3;
    c.fillStyle = col;
    c.beginPath(); c.ellipse(0, 0, size * 0.24, size * 0.28, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = shadeColor(col, -30);
    c.beginPath();
    c.moveTo(-size * 0.18, -size * 0.05);
    c.quadraticCurveTo(-size * 0.55, -size * 0.1 - flap, -size * 0.5, size * 0.15);
    c.quadraticCurveTo(-size * 0.3, size * 0.05, -size * 0.18, size * 0.1);
    c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(size * 0.18, -size * 0.05);
    c.quadraticCurveTo(size * 0.55, -size * 0.1 - flap, size * 0.5, size * 0.15);
    c.quadraticCurveTo(size * 0.3, size * 0.05, size * 0.18, size * 0.1);
    c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(-size * 0.15, -size * 0.2); c.lineTo(-size * 0.1, -size * 0.38); c.lineTo(-size * 0.03, -size * 0.22); c.fill();
    c.beginPath(); c.moveTo(size * 0.15, -size * 0.2); c.lineTo(size * 0.1, -size * 0.38); c.lineTo(size * 0.03, -size * 0.22); c.fill();
    drawEyes(c, size * 0.07, -size * 0.03, size * 0.04, '#ffe97c');
  } else if (sh === 'healer') {
    c.fillStyle = shadeColor(col, -35);
    c.beginPath(); c.moveTo(-size * 0.36, size * 0.4); c.lineTo(0, -size * 0.3); c.lineTo(size * 0.36, size * 0.4); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.arc(0, -size * 0.12, size * 0.26, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = size * 0.08;
    c.beginPath(); c.moveTo(-size * 0.12, size * 0.18); c.lineTo(size * 0.12, size * 0.18); c.moveTo(0, size * 0.06); c.lineTo(0, size * 0.3); c.stroke();
    drawEyes(c, size * 0.09, -size * 0.14, size * 0.04);
    c.strokeStyle = hexA('#5cff9e', 0.25 + Math.sin(now / 200) * 0.15); c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, ts * 1.6, 0, Math.PI * 2); c.stroke();
  } else if (sh === 'golem') {
    c.fillStyle = shadeColor(col, -25);
    rrect(c, -size * 0.4, -size * 0.15, size * 0.8, size * 0.55, size * 0.08); c.fill();
    c.fillStyle = col;
    [[-size * 0.24, -size * 0.32, size * 0.22], [size * 0.02, -size * 0.42, size * 0.26], [size * 0.28, -size * 0.3, size * 0.2]].forEach(function (k) {
      c.beginPath(); c.arc(k[0], k[1], k[2], 0, Math.PI * 2); c.fill();
    });
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = size * 0.025;
    c.beginPath(); c.moveTo(-size * 0.3, -size * 0.05); c.lineTo(-size * 0.1, size * 0.15); c.moveTo(size * 0.1, -size * 0.1); c.lineTo(size * 0.25, size * 0.1); c.stroke();
    c.fillStyle = '#5cc8ff';
    c.beginPath(); c.arc(0, size * 0.12, size * 0.06, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.1, -size * 0.32, size * 0.045, '#ffcf4d');
  } else if (sh === 'shade') {
    var sg = c.createRadialGradient(0, -size * 0.1, size * 0.05, 0, 0, size * 0.5);
    sg.addColorStop(0, shadeColor(col, 25)); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.85 + Math.sin(now / 150) * 0.1;
    c.fillStyle = sg;
    c.beginPath();
    c.moveTo(0, -size * 0.42);
    c.quadraticCurveTo(size * 0.4, -size * 0.1, size * 0.3, size * 0.3);
    c.lineTo(size * 0.14, size * 0.16); c.lineTo(0, size * 0.36); c.lineTo(-size * 0.14, size * 0.16); c.lineTo(-size * 0.3, size * 0.3);
    c.quadraticCurveTo(-size * 0.4, -size * 0.1, 0, -size * 0.42);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
    drawEyes(c, size * 0.08, -size * 0.1, size * 0.05, '#c9a2ff');
  } else if (sh === 'rusher') {
    var lean = size * 0.25;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-lean, -size * 0.32); c.lineTo(size * 0.3, 0); c.lineTo(-lean * 0.4, size * 0.34); c.lineTo(-size * 0.32, size * 0.1);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = size * 0.04;
    for (var sp = 0; sp < 3; sp++) {
      c.beginPath(); c.moveTo(-size * 0.45 - sp * size * 0.08, -size * 0.06 + sp * size * 0.1); c.lineTo(-size * 0.28 - sp * size * 0.08, -size * 0.02 + sp * size * 0.1); c.stroke();
    }
    drawEyes(c, 0, 0, size * 0.05, '#1a1a2e');
  } else if (sh === 'skeleton') {
    c.fillStyle = col;
    c.beginPath(); c.arc(0, -size * 0.12, size * 0.28, 0, Math.PI * 2); c.fill();
    rrect(c, -size * 0.16, size * 0.05, size * 0.32, size * 0.2, size * 0.05); c.fill();
    c.fillStyle = '#1a1a2e';
    c.beginPath(); c.arc(-size * 0.1, -size * 0.14, size * 0.07, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(size * 0.1, -size * 0.14, size * 0.07, 0, Math.PI * 2); c.fill();
    c.fillRect(-size * 0.1, size * 0.1, size * 0.03, size * 0.1); c.fillRect(-size * 0.015, size * 0.1, size * 0.03, size * 0.1); c.fillRect(size * 0.07, size * 0.1, size * 0.03, size * 0.1);
    c.fillStyle = '#b57bff';
    c.beginPath(); c.arc(-size * 0.1, -size * 0.14, size * 0.025, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(size * 0.1, -size * 0.14, size * 0.025, 0, Math.PI * 2); c.fill();
  } else if (sh === 'boss_king') {
    var sq = 1 + Math.sin(e.bobPhase * 1.2) * 0.05;
    c.beginPath(); c.ellipse(0, size * 0.1, size * 0.45 * sq, size * 0.36 / sq, 0, 0, Math.PI * 2);
    var kg = c.createRadialGradient(-size * 0.15, -size * 0.05, size * 0.05, 0, size * 0.05, size * 0.5);
    kg.addColorStop(0, '#bfe6ff'); kg.addColorStop(1, col);
    c.fillStyle = kg; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.ellipse(-size * 0.17, -size * 0.02, size * 0.1, size * 0.06, -0.4, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.12, size * 0.02, size * 0.06);
    drawCrown(c, 0, -size * 0.2, size * 0.4);
  } else if (sh === 'boss_necro') {
    c.fillStyle = '#2a1640';
    c.beginPath(); c.moveTo(-size * 0.42, size * 0.42); c.quadraticCurveTo(-size * 0.3, -size * 0.2, 0, -size * 0.48); c.quadraticCurveTo(size * 0.3, -size * 0.2, size * 0.42, size * 0.42); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(-size * 0.28, size * 0.42); c.quadraticCurveTo(0, -size * 0.1, size * 0.28, size * 0.42); c.closePath(); c.fill();
    c.fillStyle = '#e8e2cf';
    c.beginPath(); c.arc(0, -size * 0.16, size * 0.17, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.06, -size * 0.17, size * 0.04, '#5cff9e');
    c.strokeStyle = '#8b5a2b'; c.lineWidth = size * 0.05;
    c.beginPath(); c.moveTo(size * 0.42, size * 0.42); c.lineTo(size * 0.42, -size * 0.45); c.stroke();
    c.fillStyle = hexA('#5cff9e', 0.6 + Math.sin(now / 150) * 0.3);
    c.beginPath(); c.arc(size * 0.42, -size * 0.5, size * 0.09, 0, Math.PI * 2); c.fill();
  } else if (sh === 'boss_colossus') {
    c.fillStyle = shadeColor(col, -30);
    rrect(c, -size * 0.45, -size * 0.2, size * 0.9, size * 0.62, size * 0.1); c.fill();
    c.fillStyle = col;
    rrect(c, -size * 0.3, -size * 0.5, size * 0.6, size * 0.42, size * 0.1); c.fill();
    c.fillStyle = shadeColor(col, -50);
    c.fillRect(-size * 0.55, -size * 0.12, size * 0.16, size * 0.42); c.fillRect(size * 0.39, -size * 0.12, size * 0.16, size * 0.42);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = size * 0.03;
    c.beginPath(); c.moveTo(-size * 0.2, 0); c.lineTo(0, size * 0.2); c.lineTo(size * 0.15, size * 0.05); c.stroke();
    drawEyes(c, size * 0.11, -size * 0.32, size * 0.05, '#5cc8ff');
  } else if (sh === 'boss_witch') {
    c.fillStyle = '#1f4e7a';
    c.beginPath(); c.moveTo(-size * 0.38, size * 0.42); c.lineTo(0, -size * 0.05); c.lineTo(size * 0.38, size * 0.42); c.closePath(); c.fill();
    c.fillStyle = '#d9f3ff';
    c.beginPath(); c.arc(0, -size * 0.08, size * 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(-size * 0.36, -size * 0.14); c.lineTo(size * 0.36, -size * 0.14); c.lineTo(size * 0.06, -size * 0.7); c.closePath(); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(size * 0.06, -size * 0.7, size * 0.05, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.07, -size * 0.06, size * 0.035, '#1f4e7a');
    c.strokeStyle = hexA('#bff0ff', 0.6); c.lineWidth = 2;
    for (var f = 0; f < 4; f++) { var fa = now / 600 + f * Math.PI / 2; c.beginPath(); c.arc(Math.cos(fa) * size * 0.45, Math.sin(fa) * size * 0.3, size * 0.04, 0, Math.PI * 2); c.stroke(); }
  } else if (sh === 'boss_dragon') {
    var df = Math.sin(e.bobPhase * 1.6) * size * 0.25;
    c.fillStyle = shadeColor(col, -40);
    c.beginPath(); c.moveTo(-size * 0.15, -size * 0.05); c.quadraticCurveTo(-size * 0.75, -size * 0.35 - df, -size * 0.7, size * 0.2); c.quadraticCurveTo(-size * 0.4, size * 0.05, -size * 0.15, size * 0.15); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(size * 0.15, -size * 0.05); c.quadraticCurveTo(size * 0.75, -size * 0.35 - df, size * 0.7, size * 0.2); c.quadraticCurveTo(size * 0.4, size * 0.05, size * 0.15, size * 0.15); c.closePath(); c.fill();
    var dgr = c.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
    dgr.addColorStop(0, '#ff8a3c'); dgr.addColorStop(1, col);
    c.fillStyle = dgr;
    c.beginPath(); c.ellipse(0, size * 0.05, size * 0.22, size * 0.38, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, -size * 0.32, size * 0.17, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.moveTo(-size * 0.1, -size * 0.42); c.lineTo(-size * 0.2, -size * 0.6); c.lineTo(-size * 0.04, -size * 0.46); c.fill();
    c.beginPath(); c.moveTo(size * 0.1, -size * 0.42); c.lineTo(size * 0.2, -size * 0.6); c.lineTo(size * 0.04, -size * 0.46); c.fill();
    drawEyes(c, size * 0.07, -size * 0.34, size * 0.04, '#fff700');
  } else if (sh === 'boss_shadow') {
    var shg = c.createRadialGradient(0, -size * 0.1, size * 0.05, 0, 0, size * 0.6);
    shg.addColorStop(0, '#7a4fb0'); shg.addColorStop(1, 'rgba(20,8,40,0)');
    c.fillStyle = shg;
    c.beginPath();
    c.moveTo(0, -size * 0.55);
    c.quadraticCurveTo(size * 0.55, -size * 0.2, size * 0.42, size * 0.42);
    for (var z = 0; z < 5; z++) c.lineTo(size * (0.42 - (z + 1) * 0.168), size * (z % 2 ? 0.42 : 0.28));
    c.quadraticCurveTo(-size * 0.55, -size * 0.2, 0, -size * 0.55);
    c.fill();
    drawEyes(c, size * 0.1, -size * 0.15, size * 0.06, '#e3c6ff');
    drawCrown(c, 0, -size * 0.38, size * 0.3, '#9b6bdf');
  } else if (sh === 'boss_emperor') {
    c.fillStyle = shadeColor(col, -30);
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = (i / 10) * Math.PI * 2 + now / 1500;
      var rr = size * (i % 2 === 0 ? 0.52 : 0.36);
      var px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
    var eg = c.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.36);
    eg.addColorStop(0, '#ff9ab3'); eg.addColorStop(1, col);
    c.fillStyle = eg;
    c.beginPath(); c.arc(0, 0, size * 0.34, 0, Math.PI * 2); c.fill();
    drawEyes(c, size * 0.13, -size * 0.02, size * 0.07, '#fff700');
    drawCrown(c, 0, -size * 0.28, size * 0.42);
  } else {
    c.fillStyle = col;
    c.beginPath(); c.arc(0, 0, size * 0.35, 0, Math.PI * 2); c.fill();
  }

  // estados
  if (e.cursed) {
    c.strokeStyle = 'rgba(201,162,255,0.85)'; c.lineWidth = size * 0.05;
    c.setLineDash([size * 0.08, size * 0.06]);
    c.beginPath(); c.arc(0, 0, size * 0.56, now / 300, now / 300 + Math.PI * 2); c.stroke();
    c.setLineDash([]);
  }
  if (e.poisonStacks > 0) {
    c.fillStyle = 'rgba(92,255,158,' + Math.min(0.45, 0.12 + e.poisonStacks * 0.07) + ')';
    c.beginPath(); c.arc(0, 0, size * 0.5, 0, Math.PI * 2); c.fill();
  }
  if (e.burnTime > 0) {
    c.fillStyle = 'rgba(255,120,30,0.35)';
    c.beginPath(); c.arc(0, -size * 0.1, size * 0.45, 0, Math.PI * 2); c.fill();
  }
  if (e.stunned) {
    c.fillStyle = 'rgba(190,235,255,0.45)';
    c.beginPath(); c.arc(0, 0, size * 0.52, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e6f8ff'; c.lineWidth = 1.5; c.stroke();
  }
  if (e.shielded) {
    c.strokeStyle = 'rgba(255,230,120,0.9)'; c.lineWidth = size * 0.07;
    c.beginPath(); c.arc(0, 0, size * 0.62, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(255,230,120,0.15)'; c.fill();
  }
  c.restore();
}

/* ---------- Decorado del bioma ---------- */
function drawProp(c, kind, x, y, ts, now) {
  var s = ts;
  c.save();
  c.translate(x, y);
  if (kind === 'tree' || kind === 'autumn' || kind === 'pine') {
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(0, s * 0.28, s * 0.26, s * 0.08, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4a2b'; c.fillRect(-s * 0.04, s * 0.05, s * 0.08, s * 0.22);
    if (kind === 'pine') {
      c.fillStyle = '#2e6b4f';
      for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, -s * 0.36 + i * s * 0.12); c.lineTo(s * (0.16 + i * 0.05), s * 0.0 + i * s * 0.1); c.lineTo(-s * (0.16 + i * 0.05), s * 0.0 + i * s * 0.1); c.closePath(); c.fill(); }
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -s * 0.36); c.lineTo(s * 0.07, -s * 0.26); c.lineTo(-s * 0.07, -s * 0.26); c.fill();
    } else {
      var col = kind === 'autumn' ? '#d9822b' : '#2f9e5b';
      c.fillStyle = shadeColor(col, -25); c.beginPath(); c.arc(0, -s * 0.06, s * 0.22, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(-s * 0.05, -s * 0.11, s * 0.17, 0, Math.PI * 2); c.fill();
    }
  } else if (kind === 'bush') {
    c.fillStyle = '#2c8a4e'; c.beginPath(); c.arc(-s * 0.08, s * 0.1, s * 0.11, 0, Math.PI * 2); c.arc(s * 0.08, s * 0.1, s * 0.11, 0, Math.PI * 2); c.arc(0, s * 0.02, s * 0.12, 0, Math.PI * 2); c.fill();
  } else if (kind === 'flower') {
    ['#ff8fa3', '#ffd166', '#c9a2ff'].forEach(function (fc, i) {
      var fx = (i - 1) * s * 0.14, fy = (i % 2) * s * 0.08;
      c.fillStyle = fc; c.beginPath(); c.arc(fx, fy, s * 0.05, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff6c4'; c.beginPath(); c.arc(fx, fy, s * 0.02, 0, Math.PI * 2); c.fill();
    });
  } else if (kind === 'mushroom') {
    c.fillStyle = '#f2e8d5'; c.fillRect(-s * 0.03, 0, s * 0.06, s * 0.14);
    c.fillStyle = '#e94560'; c.beginPath(); c.arc(0, s * 0.02, s * 0.12, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * 0.04, -s * 0.03, s * 0.02, 0, Math.PI * 2); c.arc(s * 0.05, -s * 0.01, s * 0.015, 0, Math.PI * 2); c.fill();
  } else if (kind === 'cactus') {
    c.fillStyle = '#3f9b54';
    rrect(c, -s * 0.06, -s * 0.25, s * 0.12, s * 0.45, s * 0.06); c.fill();
    rrect(c, -s * 0.2, -s * 0.1, s * 0.08, s * 0.2, s * 0.04); c.fill();
    rrect(c, s * 0.12, -s * 0.16, s * 0.08, s * 0.2, s * 0.04); c.fill();
  } else if (kind === 'rock' || kind === 'snowrock' || kind === 'lava') {
    c.fillStyle = kind === 'lava' ? '#2a1a1a' : '#7d7f88';
    c.beginPath(); c.moveTo(-s * 0.22, s * 0.16); c.lineTo(-s * 0.14, -s * 0.06); c.lineTo(s * 0.05, -s * 0.12); c.lineTo(s * 0.2, s * 0.02); c.lineTo(s * 0.18, s * 0.16); c.closePath(); c.fill();
    if (kind === 'snowrock') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * 0.14, -s * 0.06); c.lineTo(s * 0.05, -s * 0.12); c.lineTo(s * 0.12, -s * 0.04); c.lineTo(-s * 0.1, 0); c.fill(); }
    if (kind === 'lava') { c.strokeStyle = 'rgba(255,' + Math.round(120 + Math.sin(now / 300) * 60) + ',40,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.1, s * 0.1); c.lineTo(0, -s * 0.02); c.lineTo(s * 0.1, s * 0.08); c.stroke(); }
  } else if (kind === 'bones') {
    c.strokeStyle = '#efe6d2'; c.lineWidth = s * 0.04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-s * 0.15, s * 0.1); c.lineTo(s * 0.15, -s * 0.05); c.moveTo(-s * 0.12, -s * 0.06); c.lineTo(s * 0.1, s * 0.12); c.stroke();
  } else if (kind === 'reed') {
    c.strokeStyle = '#7fae5a'; c.lineWidth = s * 0.03;
    for (var r = -1; r <= 1; r++) { c.beginPath(); c.moveTo(r * s * 0.08, s * 0.18); c.quadraticCurveTo(r * s * 0.12, 0, r * s * 0.1 + Math.sin(now / 500 + r) * s * 0.03, -s * 0.2); c.stroke(); }
    c.fillStyle = '#6b4a2b'; c.fillRect(-s * 0.02, -s * 0.22, s * 0.04, s * 0.1);
  } else if (kind === 'puddle') {
    c.fillStyle = 'rgba(80,140,120,0.6)'; c.beginPath(); c.ellipse(0, s * 0.05, s * 0.26, s * 0.12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, s * 0.05, s * 0.1 + (now / 40 % 10) / 100 * s, s * 0.05, 0, 0, Math.PI * 2); c.stroke();
  } else if (kind === 'crystal') {
    c.fillStyle = '#9ad7ff';
    c.beginPath(); c.moveTo(0, -s * 0.28); c.lineTo(s * 0.09, 0); c.lineTo(0, s * 0.16); c.lineTo(-s * 0.09, 0); c.closePath(); c.fill();
    c.fillStyle = '#c9a2ff';
    c.beginPath(); c.moveTo(s * 0.14, -s * 0.12); c.lineTo(s * 0.2, s * 0.04); c.lineTo(s * 0.13, s * 0.14); c.lineTo(s * 0.07, s * 0.03); c.closePath(); c.fill();
  } else if (kind === 'ember') {
    for (var k = 0; k < 3; k++) { var ph = ((now / 900) + k / 3) % 1; c.fillStyle = 'rgba(255,140,40,' + (1 - ph) + ')'; c.beginPath(); c.arc((k - 1) * s * 0.1, s * 0.15 - ph * s * 0.4, s * 0.03, 0, Math.PI * 2); c.fill(); }
  } else if (kind === 'pillar') {
    c.fillStyle = '#9aa0b4'; c.fillRect(-s * 0.08, -s * 0.24, s * 0.16, s * 0.42);
    c.fillStyle = '#c4c9d8'; c.fillRect(-s * 0.12, -s * 0.28, s * 0.24, s * 0.06); c.fillRect(-s * 0.12, s * 0.16, s * 0.24, s * 0.05);
  } else if (kind === 'rune') {
    c.strokeStyle = hexA('#c9a2ff', 0.45 + Math.sin(now / 400) * 0.25); c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, s * 0.18, 0, Math.PI * 2); c.moveTo(0, -s * 0.12); c.lineTo(s * 0.1, s * 0.08); c.lineTo(-s * 0.1, s * 0.08); c.closePath(); c.stroke();
  } else if (kind === 'banner') {
    c.fillStyle = '#6b4a2b'; c.fillRect(-s * 0.02, -s * 0.3, s * 0.04, s * 0.48);
    c.fillStyle = '#e94560'; c.beginPath(); c.moveTo(s * 0.02, -s * 0.28); c.lineTo(s * 0.22 + Math.sin(now / 300) * s * 0.02, -s * 0.2); c.lineTo(s * 0.02, -s * 0.1); c.fill();
  }
  c.restore();
}

/* ---------- Iconos de torre para cartas (canvas → dataURL, cacheado) ---------- */
var _towerIconCache = {};
function towerIconURL(type, level) {
  var k = type + '_' + (level || 1);
  if (_towerIconCache[k]) return _towerIconCache[k];
  var cv = document.createElement('canvas');
  cv.width = 120; cv.height = 120;
  var c = cv.getContext('2d');
  if (!c) return '';
  var d = TOWER_TYPES[type];
  drawTowerShape(c, { x: 60, y: 66, level: level || 1, aimAngle: -Math.PI / 2, recoil: 0, def: d, color: d.color }, 92, 1000);
  _towerIconCache[k] = cv.toDataURL();
  return _towerIconCache[k];
}
var _enemyIconCache = {};
function enemyIconURL(typeId, bossKind) {
  var k = typeId + '_' + (bossKind || '');
  if (_enemyIconCache[k]) return _enemyIconCache[k];
  var cv = document.createElement('canvas');
  cv.width = 120; cv.height = 120;
  var c = cv.getContext('2d');
  if (!c) return '';
  var e = { x: 60, y: 64, bobPhase: 0, def: ENEMY_TYPES[typeId], isBoss: !!bossKind, isElite: false, bossKind: bossKind, boss: bossKind ? BOSS_TYPES[bossKind] : null, poisonStacks: 0, burnTime: 0 };
  drawEnemyShape(c, e, bossKind ? 66 : 120, 1000);
  _enemyIconCache[k] = cv.toDataURL();
  return _enemyIconCache[k];
}
