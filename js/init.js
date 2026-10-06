/* =========================================================
   ARRANQUE
   ========================================================= */
(function init() {
  canvas = $('gameCanvas');
  ctx = canvas.getContext('2d');
  boardWrap = $('board-wrap');

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', function () { pointer.down = null; pointer.drag = null; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 200); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !$('gameScreen').hidden && !game.ended && !game.paused && $('boonOverlay').hidden) togglePause(true);
  });
  document.addEventListener('keydown', function (e) {
    if ($('gameScreen').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); startWave(); }
    else if (e.key === 'Escape' || e.key === 'p') togglePause();
    else if (e.key === 'h' || e.key === 'q') useHero();
    else if (e.key === 'i' && game.fusion) summonTower();
    else if (e.key >= '1' && e.key <= '5') {
      var t = game.deck[+e.key - 1];
      if (t) game.fusion ? powerUpType(t) : selectTower(t);
    }
  });
  $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  $('hudSound').textContent = soundOn ? '🔊' : '🔇';
  go('home');
})();
