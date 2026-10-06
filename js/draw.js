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
function drawTowerShape(c, t, ts, now) {
  var s = ts * (0.62 + Math.min(t.level, 7) * 0.045);
  var d = t.def;
  c.save();
  c.translate(t.x, t.y);

  // sombra y peana
  c.beginPath(); c.ellipse(0, ts * 0.14, s * 0.52, s * 0.22, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(0,0,0,0.38)'; c.fill();
  var ped = c.createLinearGradient(0, -s * 0.1, 0, s * 0.3);
  ped.addColorStop(0, shadeColor(t.color, 35));
  ped.addColorStop(1, shadeColor(t.color, -45));
  c.fillStyle = ped;
  c.beginPath(); c.ellipse(0, ts * 0.08, s * 0.46, s * 0.2, 0, 0, Math.PI * 2); c.fill();

  if (d.support) {
    drawAlchemist(c, t, s, now);
  } else {
    c.save();
    c.rotate(t.aimAngle + Math.PI / 2);
    c.translate(0, t.recoil * s * 0.08);
    drawTowerTop(c, t, s, now);
    c.restore();
  }

  // marcas de nivel: estrellas doradas (rango en Fusión)
  var pips = t.level - 1;
  for (var i = 0; i < pips; i++) {
    var ang = (i / Math.max(4, pips)) * Math.PI - Math.PI;
    var px = Math.cos(ang) * s * 0.5, py = ts * 0.1 + Math.sin(ang) * s * 0.2 + s * 0.28;
    c.fillStyle = '#ffd166';
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1;
    c.beginPath(); c.arc(px, py, Math.max(1.6, s * 0.055), 0, Math.PI * 2); c.fill(); c.stroke();
  }
  if (t.frozen) {
    c.fillStyle = 'rgba(160,220,255,0.55)';
    rrect(c, -s * 0.45, -s * 0.55, s * 0.9, s * 0.95, s * 0.12); c.fill();
    c.strokeStyle = '#e6f8ff'; c.lineWidth = 2; c.stroke();
  }
  c.restore();
}

function drawTowerTop(c, t, s, now) {
  var d = t.def, sh = d.shape;
  if (sh === 'fire') {
    c.fillStyle = shadeColor(t.color, -25);
    drawPoly(c, 0, s * 0.05, s * 0.32 * 1.6, 6);
    var fg = c.createLinearGradient(0, s * 0.1, 0, -s * 0.55);
    fg.addColorStop(0, t.color); fg.addColorStop(1, d.color2);
    c.fillStyle = fg;
    var flick = Math.sin(now / 90) * s * 0.03;
    c.beginPath();
    c.moveTo(0, -s * 0.55 - flick);
    c.quadraticCurveTo(s * 0.3, -s * 0.1, s * 0.14, s * 0.15);
    c.quadraticCurveTo(0, s * 0.3, -s * 0.14, s * 0.15);
    c.quadraticCurveTo(-s * 0.3, -s * 0.1, 0, -s * 0.55 - flick);
    c.fill();
    c.fillStyle = '#fff3c4';
    c.beginPath(); c.ellipse(0, -s * 0.02, s * 0.06, s * 0.12, 0, 0, Math.PI * 2); c.fill();
  } else if (sh === 'frost') {
    c.fillStyle = shadeColor(t.color, -25);
    drawPoly(c, 0, s * 0.05, s * 0.32 * 1.6, 8);
    c.strokeStyle = d.color2; c.lineWidth = s * 0.07; c.lineCap = 'round';
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2 + now / 2000;
      c.beginPath(); c.moveTo(0, -s * 0.1); c.lineTo(Math.cos(a) * s * 0.42, -s * 0.1 + Math.sin(a) * s * 0.42); c.stroke();
    }
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(0, -s * 0.1, s * 0.12, 0, Math.PI * 2); c.fill();
  } else if (sh === 'nature') {
    c.fillStyle = '#6b4a2b';
    c.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.42);
    for (var lv = 0; lv < 3; lv++) {
      c.fillStyle = lv % 2 ? d.color2 : t.color;
      c.beginPath();
      c.ellipse(0, -s * 0.12 - lv * s * 0.17, s * (0.38 - lv * 0.07), s * 0.17, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffe97c';
    c.beginPath(); c.arc(0, -s * 0.62, s * 0.06, 0, Math.PI * 2); c.fill();
  } else if (sh === 'electric') {
    c.fillStyle = shadeColor(t.color, -25);
    drawPoly(c, 0, s * 0.05, s * 0.32 * 1.6, 5);
    c.strokeStyle = shadeColor(t.color, 30); c.lineWidth = s * 0.05;
    c.beginPath(); c.arc(0, -s * 0.18, s * 0.3, 0, Math.PI * 2); c.stroke();
    c.fillStyle = d.color2;
    c.beginPath();
    c.moveTo(-s * 0.08, -s * 0.55); c.lineTo(s * 0.12, -s * 0.2); c.lineTo(-s * 0.02, -s * 0.2);
    c.lineTo(s * 0.1, s * 0.15); c.lineTo(-s * 0.16, -s * 0.08); c.lineTo(-s * 0.02, -s * 0.08);
    c.closePath(); c.fill();
  } else if (sh === 'venom') {
    c.fillStyle = shadeColor(t.color, -25);
    drawPoly(c, 0, s * 0.05, s * 0.32 * 1.6, 7);
    c.fillStyle = t.color;
    rrect(c, -s * 0.2, -s * 0.2, s * 0.4, s * 0.32, s * 0.08); c.fill();
    c.fillStyle = d.color2;
    c.beginPath(); c.arc(0, -s * 0.28, s * 0.22, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.arc(-s * 0.07, -s * 0.35, s * 0.06, 0, Math.PI * 2); c.fill();
    c.fillStyle = shadeColor(t.color, -25);
    c.beginPath(); c.arc(-s * 0.08, -s * 0.26, s * 0.035, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.08, -s * 0.26, s * 0.035, 0, Math.PI * 2); c.fill();
  } else if (sh === 'sniper') {
    c.fillStyle = shadeColor(t.color, -20);
    rrect(c, -s * 0.24, -s * 0.08, s * 0.48, s * 0.42, s * 0.08); c.fill();
    c.fillStyle = shadeColor(t.color, 25);
    c.fillRect(-s * 0.06, -s * 0.72, s * 0.12, s * 0.7);
    c.fillStyle = '#111';
    c.fillRect(-s * 0.09, -s * 0.76, s * 0.18, s * 0.08);
    c.fillStyle = d.color2;
    c.beginPath(); c.arc(0, -s * 0.05, s * 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-s * 0.04, -s * 0.09, s * 0.04, 0, Math.PI * 2); c.fill();
  } else if (sh === 'cannon') {
    c.fillStyle = shadeColor(t.color, -15);
    c.beginPath(); c.arc(0, s * 0.02, s * 0.32, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b3b3b';
    rrect(c, -s * 0.12, -s * 0.58, s * 0.24, s * 0.58, s * 0.06); c.fill();
    c.fillStyle = '#1a1a1a';
    c.beginPath(); c.arc(0, -s * 0.58, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillStyle = d.color2;
    c.beginPath(); c.arc(0, 0, s * 0.1, 0, Math.PI * 2); c.fill();
  } else if (sh === 'arcane') {
    var ag = c.createRadialGradient(0, -s * 0.2, s * 0.03, 0, -s * 0.2, s * 0.42);
    ag.addColorStop(0, d.color2); ag.addColorStop(1, t.color);
    c.fillStyle = ag;
    drawPoly(c, 0, -s * 0.1, s * 0.36 * 1.6, 3);
    c.strokeStyle = d.color2; c.lineWidth = s * 0.03;
    c.beginPath(); c.arc(0, -s * 0.22, s * 0.14, 0, Math.PI * 2); c.stroke();
    c.fillStyle = d.color2;
    for (var orb = 0; orb < 3; orb++) {
      var oa = (orb / 3) * Math.PI * 2 + now / 400;
      c.beginPath(); c.arc(Math.cos(oa) * s * 0.28, -s * 0.22 + Math.sin(oa) * s * 0.28, s * 0.04, 0, Math.PI * 2); c.fill();
    }
  } else if (sh === 'wind') {
    c.fillStyle = shadeColor(t.color, -15);
    drawPoly(c, 0, s * 0.02, s * 0.3 * 1.6, 8);
    c.strokeStyle = d.color2; c.lineWidth = s * 0.06; c.lineCap = 'round';
    var sway = Math.sin(now / 250) * s * 0.04;
    for (var w = 0; w < 3; w++) {
      var yy = -s * 0.08 - w * s * 0.13;
      c.beginPath();
      c.moveTo(-s * (0.32 - w * 0.06) + sway, yy);
      c.quadraticCurveTo(s * 0.1, yy - s * 0.07, s * (0.32 - w * 0.1) - sway, yy);
      c.stroke();
    }
  } else if (sh === 'dragon') {
    // cabeza de dragón con cuernos mirando al objetivo
    c.fillStyle = shadeColor(t.color, -30);
    var flap = Math.sin(now / 160) * s * 0.06;
    c.beginPath(); c.moveTo(-s * 0.15, 0); c.quadraticCurveTo(-s * 0.6, -s * 0.15 - flap, -s * 0.55, s * 0.25); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(s * 0.15, 0); c.quadraticCurveTo(s * 0.6, -s * 0.15 - flap, s * 0.55, s * 0.25); c.closePath(); c.fill();
    var dg = c.createLinearGradient(0, s * 0.2, 0, -s * 0.6);
    dg.addColorStop(0, t.color); dg.addColorStop(1, shadeColor(t.color, 40));
    c.fillStyle = dg;
    c.beginPath();
    c.moveTo(0, -s * 0.62);
    c.quadraticCurveTo(s * 0.26, -s * 0.3, s * 0.22, s * 0.12);
    c.lineTo(-s * 0.22, s * 0.12);
    c.quadraticCurveTo(-s * 0.26, -s * 0.3, 0, -s * 0.62);
    c.fill();
    c.fillStyle = d.color2;
    c.beginPath(); c.moveTo(-s * 0.14, -s * 0.05); c.lineTo(-s * 0.3, s * 0.12); c.lineTo(-s * 0.08, s * 0.05); c.fill();
    c.beginPath(); c.moveTo(s * 0.14, -s * 0.05); c.lineTo(s * 0.3, s * 0.12); c.lineTo(s * 0.08, s * 0.05); c.fill();
    drawEyes(c, s * 0.09, -s * 0.2, s * 0.045, '#ffe97c');
  } else if (sh === 'chrono') {
    c.fillStyle = shadeColor(t.color, -20);
    drawPoly(c, 0, s * 0.05, s * 0.32 * 1.6, 6);
    // reloj de arena
    c.fillStyle = '#c8a24a';
    c.fillRect(-s * 0.22, -s * 0.6, s * 0.44, s * 0.06);
    c.fillRect(-s * 0.22, s * 0.02, s * 0.44, s * 0.06);
    c.fillStyle = 'rgba(220,240,255,0.75)';
    c.beginPath();
    c.moveTo(-s * 0.18, -s * 0.54); c.lineTo(s * 0.18, -s * 0.54); c.lineTo(s * 0.03, -s * 0.26);
    c.lineTo(s * 0.18, 0.02 * s); c.lineTo(-s * 0.18, 0.02 * s); c.lineTo(-s * 0.03, -s * 0.26);
    c.closePath(); c.fill();
    var sandT = (now / 3000) % 1;
    c.fillStyle = d.color2;
    c.beginPath(); c.moveTo(-s * 0.14 * (1 - sandT), -s * 0.5 + sandT * s * 0.2); c.lineTo(s * 0.14 * (1 - sandT), -s * 0.5 + sandT * s * 0.2); c.lineTo(0, -s * 0.28); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-s * 0.15 * sandT, 0); c.lineTo(s * 0.15 * sandT, 0); c.lineTo(0, -s * 0.2 * sandT); c.closePath(); c.fill();
  }
}
function drawAlchemist(c, t, s, now) {
  var bob = Math.sin(now / 300) * s * 0.03;
  c.fillStyle = shadeColor(t.color, -20);
  drawPoly(c, 0, s * 0.05, s * 0.5, 6);
  // matraz burbujeante
  c.fillStyle = 'rgba(230,255,240,0.35)';
  c.beginPath(); c.arc(0, -s * 0.12 + bob, s * 0.28, 0, Math.PI * 2); c.fill();
  c.fillRect(-s * 0.07, -s * 0.55 + bob, s * 0.14, s * 0.2);
  c.fillStyle = t.def.color2;
  c.beginPath(); c.arc(0, -s * 0.08 + bob, s * 0.22, 0, Math.PI); c.fill();
  c.fillStyle = '#8b5a2b';
  c.fillRect(-s * 0.09, -s * 0.6 + bob, s * 0.18, s * 0.07);
  for (var i = 0; i < 3; i++) {
    var ph = ((now / 700) + i / 3) % 1;
    c.fillStyle = 'rgba(255,240,150,' + (1 - ph) + ')';
    c.beginPath(); c.arc(Math.sin(i * 2 + now / 300) * s * 0.08, -s * 0.12 - ph * s * 0.55 + bob, s * 0.04, 0, Math.PI * 2); c.fill();
  }
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
