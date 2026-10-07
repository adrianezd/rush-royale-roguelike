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

  // En móvil el panel de la torre flota sobre el tablero para no quitarle sitio.
  var mobileQuery = window.matchMedia('(max-width: 819px), (max-height: 519px)');
  function placePanel() {
    var panel = $('panelInfo');
    if (mobileQuery.matches) boardWrap.appendChild(panel);
    else $('actionRow').insertBefore(panel, $('actionRow').firstChild);
  }
  placePanel();
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', placePanel);
  else if (mobileQuery.addListener) mobileQuery.addListener(placePanel);
  window.addEventListener('resize', onResize);
  // El hueco del tablero cambia cuando crece el panel inferior o la barra del
  // navegador del móvil aparece o desaparece: se recoloca el tablero entero.
  if (window.ResizeObserver) {
    var lastBox = '';
    new ResizeObserver(function () {
      var box = boardWrap.clientWidth + 'x' + boardWrap.clientHeight;
      if (box === lastBox) return;
      lastBox = box;
      onResize();
    }).observe(boardWrap);
  }
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 200); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !$('gameScreen').hidden && !game.ended && !game.paused && $('boonOverlay').hidden) togglePause(true);
  });
  document.addEventListener('keydown', function (e) {
    if ($('gameScreen').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); startWave(); }
    else if (e.key === 'Escape' || e.key === 'p') togglePause();
    else if (e.key === 'x') confirmQuit();
    else if (e.key === 'h' || e.key === 'q') useHero();
    else if (e.key === 'i' && game.fusion) summonTower();
    else if (e.key === 'u' && !game.fusion) quickUpgrade();
    else if (e.key >= '1' && e.key <= '5') {
      var t = game.deck[+e.key - 1];
      if (t) game.fusion ? powerUpType(t) : selectTower(t);
    }
  });
  $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  $('hudSound').textContent = soundOn ? '🔊' : '🔇';
  go('home');
})();
