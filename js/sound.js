/* =========================================================
   SONIDO: Web Audio sintetizado, sin archivos externos
   ========================================================= */
var soundOn = (function () { try { return localStorage.getItem('rushRoyaleRogue_sound') !== '0'; } catch (e) { return true; } })();
var _actx = null;
var _lastShotSfx = 0;
function actx() {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_actx) { try { _actx = new AC(); } catch (e) { return null; } }
  if (_actx.state === 'suspended') { try { _actx.resume(); } catch (e) {} }
  return _actx;
}
function tone(freq, startAt, dur, type, gain, slideTo) {
  if (!soundOn) return;
  var c = actx();
  if (!c) return;
  var osc = c.createOscillator(), g = c.createGain();
  osc.type = type || 'sine';
  var t0 = c.currentTime + (startAt || 0);
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function noise(startAt, dur, gain) {
  if (!soundOn) return;
  var c = actx();
  if (!c) return;
  var len = Math.floor(c.sampleRate * dur);
  var buf = c.createBuffer(1, len, c.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf;
  g.gain.value = gain || 0.1;
  src.connect(g); g.connect(c.destination);
  src.start(c.currentTime + (startAt || 0));
}
function sfxShoot(towerType) {
  // Con muchas torres a x8 el audio satura: como mucho un disparo cada 45 ms.
  var now = performance.now();
  if (now - _lastShotSfx < 45) return;
  _lastShotSfx = now;
  var f = { fire: 320, frost: 500, nature: 420, electric: 700, venom: 260, sniper: 180, cannon: 90, arcane: 600, wind: 450, dragon: 140, chrono: 880 }[towerType] || 400;
  tone(f, 0, 0.08, towerType === 'sniper' || towerType === 'cannon' || towerType === 'dragon' ? 'square' : 'triangle', 0.05);
}
function sfxDeath(isBoss) {
  tone(isBoss ? 140 : 220, 0, 0.12, 'sawtooth', isBoss ? 0.16 : 0.06);
  tone((isBoss ? 100 : 150), 0.06, 0.1, 'sawtooth', isBoss ? 0.12 : 0.04);
  if (isBoss) noise(0, 0.5, 0.18);
}
function sfxHit() { tone(700, 0, 0.05, 'square', 0.04); }
function sfxCrit() { tone(1200, 0, 0.06, 'square', 0.05, 1800); }
function sfxWaveStart() { [440, 550, 660].forEach(function (f, i) { tone(f, i * 0.07, 0.18, 'triangle', 0.12); }); }
function sfxLevelUp() { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.08, 0.3, 'triangle', 0.14); }); }
function sfxGameOver() { [300, 250, 200, 150].forEach(function (f, i) { tone(f, i * 0.15, 0.35, 'sawtooth', 0.14); }); }
function sfxBuy() { tone(880, 0, 0.08, 'triangle', 0.12); tone(1320, 0.07, 0.12, 'triangle', 0.12); }
function sfxPlace() { tone(330, 0, 0.07, 'square', 0.08); tone(495, 0.05, 0.08, 'triangle', 0.08); }
function sfxMerge() { [392, 523, 659, 880].forEach(function (f, i) { tone(f, i * 0.05, 0.16, 'triangle', 0.1); }); }
function sfxBossSpawn() { tone(110, 0, 0.8, 'sawtooth', 0.14, 55); tone(82, 0.1, 0.9, 'square', 0.08, 41); }
function sfxHero() { noise(0, 0.35, 0.12); [262, 392, 523, 784].forEach(function (f, i) { tone(f, i * 0.06, 0.4, 'sawtooth', 0.08); }); }
function sfxChestShake() { tone(160, 0, 0.08, 'square', 0.08); }
function sfxChestOpen() { noise(0, 0.25, 0.12); [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * 0.06, 0.35, 'triangle', 0.12); }); }
function sfxCard(r) { var f = { comun: 600, rara: 760, epica: 900, legendaria: 1100 }[r] || 600; tone(f, 0, 0.12, 'triangle', 0.1); tone(f * 1.5, 0.06, 0.18, 'triangle', 0.08); }
function sfxBlocked() { tone(180, 0, 0.12, 'square', 0.08, 120); }
function toggleSound() {
  soundOn = !soundOn;
  try { localStorage.setItem('rushRoyaleRogue_sound', soundOn ? '1' : '0'); } catch (e) {}
  var el = $('hudSound');
  if (el) el.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) sfxHit();
}
