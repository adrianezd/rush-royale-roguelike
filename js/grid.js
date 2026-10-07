/* =========================================================
   TABLERO: generación de caminos, disposición y fondo
   ========================================================= */
var canvas, ctx, boardWrap;
var grid = null;
var GRID_SIZE = 9;
var PATH_LATERAL_BIAS = 0.72;

function chooseGridDims(forceLanes) {
  return {
    cols: GRID_SIZE, rows: GRID_SIZE,
    vertical: rng() < 0.5,
    reverse: rng() < 0.5,
    laneCount: forceLanes || (rng() < 0.5 ? 1 : 2)
  };
}

function generatePathAttempt(cols, rows, vertical, nodeCap, lateralBias, preOccupied) {
  var priLen = vertical ? rows : cols;
  var secLen = vertical ? cols : rows;
  var pathSet = {};
  if (preOccupied) { for (var k in preOccupied) pathSet[k] = true; }
  function keyOf(row, col) { return row + ',' + col; }
  function occupied(row, col) { return !!pathSet[keyOf(row, col)]; }
  function inBounds(cell) {
    var p = vertical ? cell.row : cell.col;
    var s = vertical ? cell.col : cell.row;
    return p >= 0 && p < priLen && s >= 0 && s < secLen;
  }
  function wouldViolateRow(row, col) {
    var l1 = occupied(row, col - 1), l2 = occupied(row, col - 2);
    var r1 = occupied(row, col + 1), r2 = occupied(row, col + 2);
    return (l1 && l2) || (r1 && r2) || (l1 && r1);
  }
  function primaryOf(cell) { return vertical ? cell.row : cell.col; }

  var startSec = randInt(1, secLen - 2);
  var start = vertical ? { row: 0, col: startSec } : { row: startSec, col: 0 };
  if (occupied(start.row, start.col)) return { cells: [start], ok: false };
  var cells = [start];
  pathSet[keyOf(start.row, start.col)] = true;
  var nodes = 0;

  function step() {
    nodes++;
    if (nodes > nodeCap) return false;
    var cur = cells[cells.length - 1];
    if (primaryOf(cur) >= priLen - 1) return true;
    var primaryStep = vertical ? { row: cur.row + 1, col: cur.col } : { row: cur.row, col: cur.col + 1 };
    var lateralDir = rng() < 0.5 ? -1 : 1;
    var lateralStep = vertical ? { row: cur.row, col: cur.col + lateralDir } : { row: cur.row + lateralDir, col: cur.col };
    var altLateralStep = vertical ? { row: cur.row, col: cur.col - lateralDir } : { row: cur.row - lateralDir, col: cur.col };
    var candidates = rng() < lateralBias ? [lateralStep, primaryStep, altLateralStep] : [primaryStep, lateralStep, altLateralStep];
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (!inBounds(cand) || occupied(cand.row, cand.col) || wouldViolateRow(cand.row, cand.col)) continue;
      cells.push(cand);
      pathSet[keyOf(cand.row, cand.col)] = true;
      if (step()) return true;
      cells.pop();
      delete pathSet[keyOf(cand.row, cand.col)];
    }
    return false;
  }
  return { cells: cells, ok: step() };
}

function trimSingleCellEntrance(cells, vertical) {
  function primaryOf(c) { return vertical ? c.row : c.col; }
  if (cells.length >= 2 && primaryOf(cells[0]) === primaryOf(cells[1])) return cells.slice(1);
  return cells;
}

function generatePathFallback(cols, rows, vertical, lateralBias, preOccupied) {
  var priLen = vertical ? rows : cols;
  var secLen = vertical ? cols : rows;
  function mk(p, s) { return vertical ? { col: s, row: p } : { col: p, row: s }; }
  var pathSet = {};
  if (preOccupied) { for (var k in preOccupied) pathSet[k] = true; }
  function keyOf(row, col) { return row + ',' + col; }
  function occupied(row, col) { return !!pathSet[keyOf(row, col)]; }
  function wouldViolateRow(row, col) {
    var l1 = occupied(row, col - 1), l2 = occupied(row, col - 2);
    var r1 = occupied(row, col + 1), r2 = occupied(row, col + 2);
    return (l1 && l2) || (r1 && r2) || (l1 && r1);
  }
  var sec = randInt(1, secLen - 2);
  for (var tries = 0; tries < secLen && occupied(mk(0, sec).row, mk(0, sec).col); tries++) sec = randInt(1, secLen - 2);
  var pri = 0;
  var cells = [mk(pri, sec)];
  pathSet[keyOf(cells[0].row, cells[0].col)] = true;
  while (pri < priLen - 1) {
    var canLateralNow = pri > 0 && pri < priLen - 2;
    var straightLanding = mk(pri + 1, sec);
    var mustDivert = canLateralNow && wouldViolateRow(straightLanding.row, straightLanding.col);
    if (canLateralNow && (mustDivert || rng() < lateralBias)) {
      var dir = rng() < 0.5 ? -1 : 1;
      var order = [sec + dir, sec - dir];
      for (var i = 0; i < order.length; i++) {
        var next = order[i];
        if (next < 0 || next >= secLen) continue;
        var cand = mk(pri, next);
        if (occupied(cand.row, cand.col) || wouldViolateRow(cand.row, cand.col)) continue;
        sec = next;
        cells.push(cand);
        pathSet[keyOf(cand.row, cand.col)] = true;
        break;
      }
    }
    pri++;
    var landing = mk(pri, sec);
    cells.push(landing);
    pathSet[keyOf(landing.row, landing.col)] = true;
  }
  return cells;
}

function generatePathCells(cols, rows, vertical, preOccupied) {
  for (var attempt = 0; attempt < 20; attempt++) {
    var res = generatePathAttempt(cols, rows, vertical, 4000, PATH_LATERAL_BIAS, preOccupied);
    if (res.ok) return trimSingleCellEntrance(res.cells, vertical);
  }
  return generatePathFallback(cols, rows, vertical, PATH_LATERAL_BIAS, preOccupied);
}

function generateLanes(cols, rows, vertical, laneCount) {
  var lane1 = generatePathCells(cols, rows, vertical);
  if (laneCount < 2) return [lane1];
  var occupied1 = {};
  lane1.forEach(function (c) { occupied1[c.row + ',' + c.col] = true; });
  var lane2 = generatePathCells(cols, rows, vertical, occupied1);
  return [lane1, lane2];
}

function buildDecor(cols, rows, pathSet, biomeId) {
  var props = BIOMES[biomeId].props;
  var decor = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var isPath = !!pathSet[key(c, r)];
      var seed = c * 137.13 + r * 91.7 + hashStr(biomeId) % 97;
      var dots = [];
      var n = isPath ? 2 : 3;
      for (var i = 0; i < n; i++) {
        dots.push({ dx: seededRand(seed + i * 3.1) - 0.5, dy: seededRand(seed + i * 5.7) - 0.5, r: 0.05 + seededRand(seed + i * 7.3) * 0.06 });
      }
      var prop = null;
      if (!isPath && seededRand(seed * 1.7 + 11) < 0.22) prop = props[Math.floor(seededRand(seed + 4.4) * props.length)];
      decor.push({ col: c, row: r, isPath: isPath, variant: Math.round(seededRand(seed)), dots: dots, prop: prop });
    }
  }
  return decor;
}

function buildGrid(opts) {
  opts = opts || {};
  var dims = chooseGridDims(opts.lanes);
  var lanesCells = generateLanes(dims.cols, dims.rows, dims.vertical, dims.laneCount);
  if (dims.reverse) lanesCells = lanesCells.map(function (cells) { return cells.slice().reverse(); });
  var pathSet = {};
  lanesCells.forEach(function (cells) { cells.forEach(function (c) { pathSet[key(c.col, c.row)] = true; }); });
  var biome = opts.biome || 'pradera';
  grid = {
    cols: dims.cols, rows: dims.rows, vertical: dims.vertical, biome: biome,
    lanes: lanesCells.map(function (cells) { return { pathCells: cells, waypoints: [] }; }),
    pathSet: pathSet, decor: buildDecor(dims.cols, dims.rows, pathSet, biome),
    tileSize: 0, offsetX: 0, offsetY: 0
  };
  layoutGrid();
}
function buildGridFromSave(saved) {
  var pathSet = {};
  saved.lanes.forEach(function (lane) { lane.pathCells.forEach(function (c) { pathSet[key(c.col, c.row)] = true; }); });
  var biome = BIOMES[saved.biome] ? saved.biome : 'pradera';
  grid = {
    cols: saved.cols, rows: saved.rows, vertical: saved.vertical, biome: biome,
    lanes: saved.lanes.map(function (l) { return { pathCells: l.pathCells, waypoints: [] }; }),
    pathSet: pathSet, decor: buildDecor(saved.cols, saved.rows, pathSet, biome),
    tileSize: 0, offsetX: 0, offsetY: 0
  };
  layoutGrid();
}
function setGridBiome(biome) {
  if (!grid || grid.biome === biome) return;
  grid.biome = biome;
  grid.decor = buildDecor(grid.cols, grid.rows, grid.pathSet, biome);
  renderGridBackground();
}

function layoutGrid() {
  if (!grid) return;
  var w = boardWrap.clientWidth || 360;
  var h = boardWrap.clientHeight || 360;
  var dpr = window.devicePixelRatio || 1;
  // Se deja medio hueco de casilla arriba para lo que sobresale de las torres
  // de la primera fila (banderas, coronas, números).
  var TOP_ROOM = 0.45;
  var tileSize = Math.floor(Math.min(w / grid.cols, h / (grid.rows + TOP_ROOM)));
  tileSize = Math.max(18, tileSize);
  grid.tileSize = tileSize;
  grid.offsetX = Math.floor((w - tileSize * grid.cols) / 2);
  var spare = h - tileSize * grid.rows;
  grid.offsetY = Math.floor(Math.max(tileSize * TOP_ROOM * 0.8, spare / 2));
  if (grid.offsetY + tileSize * grid.rows > h) grid.offsetY = Math.max(0, h - tileSize * grid.rows);
  grid.w = w; grid.h = h; grid.dpr = dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  grid.lanes.forEach(function (lane) {
    lane.waypoints = lane.pathCells.map(function (c) { return tileCenter(c.col, c.row); });
  });
  renderGridBackground();
}

function tileCenter(col, row) {
  return { x: grid.offsetX + col * grid.tileSize + grid.tileSize / 2, y: grid.offsetY + row * grid.tileSize + grid.tileSize / 2 };
}
function pxToTile(x, y) {
  return { col: Math.floor((x - grid.offsetX) / grid.tileSize), row: Math.floor((y - grid.offsetY) / grid.tileSize) };
}
function inGrid(col, row) { return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows; }
function isBuildable(col, row) { return inGrid(col, row) && !grid.pathSet[key(col, row)]; }
function towerAt(col, row) {
  for (var i = 0; i < game.towers.length; i++) {
    if (game.towers[i].col === col && game.towers[i].row === row) return game.towers[i];
  }
  return null;
}

/* ---- fondo estático cacheado en un canvas aparte ---- */
function renderGridBackground() {
  if (!grid || !grid.tileSize) return;
  var b = BIOMES[grid.biome];
  var off = grid.bg || document.createElement('canvas');
  grid.bg = off;
  off.width = Math.round(grid.w * grid.dpr);
  off.height = Math.round(grid.h * grid.dpr);
  var c = off.getContext('2d');
  if (!c) return;
  c.setTransform(grid.dpr, 0, 0, grid.dpr, 0, 0);
  var bgGrad = c.createRadialGradient(grid.w / 2, grid.h * 0.35, 10, grid.w / 2, grid.h / 2, Math.max(grid.w, grid.h) * 0.75);
  bgGrad.addColorStop(0, shadeColor(b.bg, 18));
  bgGrad.addColorStop(1, b.bg);
  c.fillStyle = bgGrad;
  c.fillRect(0, 0, grid.w, grid.h);

  var ts = grid.tileSize;
  // marco del tablero
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(grid.offsetX - 4, grid.offsetY - 4, ts * grid.cols + 8, ts * grid.rows + 8);

  grid.decor.forEach(function (d) {
    var x = grid.offsetX + d.col * ts;
    var y = grid.offsetY + d.row * ts;
    var palette = d.isPath ? b.path : b.grass;
    c.fillStyle = palette[d.variant];
    c.fillRect(x, y, ts, ts);
    if (d.isPath) {
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(x + ts * 0.08, y + ts * 0.08, ts * 0.84, ts * 0.84);
    } else {
      // brillo sutil arriba a la izquierda para dar volumen a la casilla
      var g = c.createLinearGradient(x, y, x + ts, y + ts);
      g.addColorStop(0, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0.08)');
      c.fillStyle = g;
      c.fillRect(x, y, ts, ts);
    }
    c.fillStyle = d.isPath ? 'rgba(40,30,20,0.25)' : b.dots;
    d.dots.forEach(function (dot) {
      c.beginPath();
      c.arc(x + ts / 2 + dot.dx * ts, y + ts / 2 + dot.dy * ts, dot.r * ts, 0, Math.PI * 2);
      c.fill();
    });
  });

  // bordes del camino
  c.strokeStyle = b.edge;
  c.globalAlpha = 0.85;
  c.lineWidth = Math.max(2, ts * 0.06);
  c.lineCap = 'round';
  var neighbors = [[0, -1, 'top'], [0, 1, 'bottom'], [-1, 0, 'left'], [1, 0, 'right']];
  grid.decor.forEach(function (d) {
    if (!d.isPath) return;
    var x = grid.offsetX + d.col * ts;
    var y = grid.offsetY + d.row * ts;
    neighbors.forEach(function (nb) {
      var nc = d.col + nb[0], nr = d.row + nb[1];
      var open = nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows || !grid.pathSet[key(nc, nr)];
      if (!open) return;
      c.beginPath();
      if (nb[2] === 'top') { c.moveTo(x, y); c.lineTo(x + ts, y); }
      else if (nb[2] === 'bottom') { c.moveTo(x, y + ts); c.lineTo(x + ts, y + ts); }
      else if (nb[2] === 'left') { c.moveTo(x, y); c.lineTo(x, y + ts); }
      else { c.moveTo(x + ts, y); c.lineTo(x + ts, y + ts); }
      c.stroke();
    });
  });
  c.globalAlpha = 1;

  // flechas de dirección tenues a lo largo del camino
  c.fillStyle = 'rgba(255,255,255,0.13)';
  grid.lanes.forEach(function (lane) {
    for (var i = 1; i < lane.waypoints.length - 1; i += 2) {
      var a = lane.waypoints[i], n = lane.waypoints[i + 1];
      var ang = Math.atan2(n.y - a.y, n.x - a.x);
      c.save(); c.translate(a.x, a.y); c.rotate(ang);
      c.beginPath(); c.moveTo(ts * 0.12, 0); c.lineTo(-ts * 0.08, -ts * 0.09); c.lineTo(-ts * 0.08, ts * 0.09); c.closePath(); c.fill();
      c.restore();
    }
  });
}
