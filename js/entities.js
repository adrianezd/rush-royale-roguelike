/* =========================================================
   ENTIDADES: enemigos, torres, proyectiles y efectos
   ========================================================= */
var TOWER_MAX_LEVEL = 5;
var FUSION_MAX_RANK = 7;
var FUSION_DMG = [1, 1.9, 3.2, 5.0, 7.5, 11, 16];
var ELITE_EVERY = 6;
var ELITE_HEALTH_MULT = 1.9;
var ELITE_SPEED_MULT = 1.15;

/* ---------- efectos ---------- */
function spawnParticles(x, y, color, count, speedMax) {
  if (game.particles.length > 420) count = Math.min(count, 2);
  for (var i = 0; i < count; i++) {
    var ang = Math.random() * Math.PI * 2;
    var spd = 30 + Math.random() * (speedMax || 90);
    game.particles.push({ x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.35 + Math.random() * 0.25, maxLife: 0.6, color: color, r: 1.5 + Math.random() * 2 });
  }
}
function spawnRing(x, y, color, maxR, life) {
  game.rings.push({ x: x, y: y, r: 2, maxR: maxR, life: life || 0.35, maxLife: life || 0.35, color: color });
}
function spawnText(x, y, text, color, big) {
  if (!meta.settings.dmgNumbers && !big) return;
  if (game.texts.length > 60) game.texts.shift();
  game.texts.push({ x: x + (Math.random() - 0.5) * 10, y: y, text: text, color: color || '#fff', life: big ? 1.1 : 0.7, maxLife: big ? 1.1 : 0.7, big: !!big });
}
function shake(amount) { game.shake = Math.max(game.shake, amount); }
function updateEffects(dt) {
  game.particles = game.particles.filter(function (p) {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.9; p.vy *= 0.9;
    return true;
  });
  game.rings = game.rings.filter(function (r) { r.life -= dt; r.r = r.maxR * (1 - r.life / r.maxLife); return r.life > 0; });
  game.texts = game.texts.filter(function (t) { t.life -= dt; t.y -= dt * (t.big ? 22 : 34); return t.life > 0; });
  game.shots = game.shots.filter(function (s) { s.life -= dt; return s.life > 0; });
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 30);
}

/* ---------- ENEMIGO ---------- */
// spec: { type, lane, elite, bossKind, hp, speed, progress }
function Enemy(spec) {
  var def = ENEMY_TYPES[spec.type];
  this.typeId = spec.type;
  this.def = def;
  this.laneIndex = spec.lane || 0;
  this.isBoss = spec.type === 'boss';
  this.bossKind = spec.bossKind || null;
  this.boss = this.isBoss ? BOSS_TYPES[this.bossKind] : null;
  this.isElite = !!spec.elite && !this.isBoss;
  this.health = spec.hp;
  this.maxHealth = spec.hp;
  this.speed = spec.speed;
  this.slowFactor = 1;
  this.armor = (this.isBoss ? this.boss.armor : def.armor) + (game.enemyMods.armor || 0);
  this.physicalResist = this.isBoss ? (this.boss.physicalResist || 0) : (def.physicalResist || 0);
  this.flying = !this.isBoss && def.flying;
  this.poisonStacks = 0; this.poisonTimer = 0;
  this.burnTime = 0; this.burnDps = 0;
  this.curseUntil = 0; this.stunUntil = 0; this.shieldUntil = 0;
  this.knockbackCooldown = 0;
  this.incoming = 0;
  this.abilityTimer = 0; this.abilityStep = 0;
  this.bobPhase = Math.random() * Math.PI * 2;
  this.dir = 1;
  this.progress = 0;
  this.setProgress(spec.progress || 0);
}
Enemy.prototype.setProgress = function (p) {
  var wps = grid.lanes[this.laneIndex].waypoints;
  p = clamp(p, 0, wps.length - 1);
  this.progress = p;
  var i = Math.min(Math.floor(p), wps.length - 1);
  var t = p - i;
  var a = wps[i], b = wps[Math.min(i + 1, wps.length - 1)];
  var nx = a.x + (b.x - a.x) * t;
  if (Math.abs(nx - this.x) > 0.01) this.dir = nx >= this.x ? 1 : -1;
  this.x = nx;
  this.y = a.y + (b.y - a.y) * t;
};
Enemy.prototype.update = function (dt) {
  var now = game.time;
  this.bobPhase += dt * 6;
  this.stunned = this.stunUntil > now;
  this.cursed = this.curseUntil > now;
  this.shielded = this.shieldUntil > now;
  if (!this.stunned) {
    this.setProgress(this.progress + this.speed * this.slowFactor * dt);
  }
  this.slowFactor = Math.min(1, this.slowFactor + dt * 0.6);
  if (this.knockbackCooldown > 0) this.knockbackCooldown -= dt;

  // Veneno: tic cada 0,5 s, escala con las cargas.
  if (this.poisonStacks > 0) {
    this.poisonTimer -= dt;
    if (this.poisonTimer <= 0) {
      this.poisonTimer = 0.5;
      this.rawDamage(this.poisonStacks * 1.6 * cardDmgMult(game.cardLevels.venom || 1) * game.mods.dot, '#5cff9e');
      spawnParticles(this.x, this.y, '#5cff9e', 2, 30);
    }
  }
  if (this.burnTime > 0) {
    this.burnTime -= dt;
    this.rawDamage(this.burnDps * dt * game.mods.dot, null);
    if (Math.random() < dt * 8) spawnParticles(this.x, this.y - 4, '#ff8a3c', 1, 25);
  }
  if (this.def.healAura > 0 && !this.isBoss) {
    var rr = grid.tileSize * 1.6;
    for (var i = 0; i < game.enemies.length; i++) {
      var e = game.enemies[i];
      if (e === this || e.dead) continue;
      if (Math.abs(e.x - this.x) < rr && Math.abs(e.y - this.y) < rr && Math.hypot(e.x - this.x, e.y - this.y) < rr) {
        e.health = Math.min(e.maxHealth, e.health + this.def.healAura * dt * (1 + game.cfgIndex * 0.35));
      }
    }
  }
  if (this.isBoss) this.updateBoss(dt);
};
Enemy.prototype.updateBoss = function (dt) {
  var b = this.boss;
  if (!b.every) return;
  this.abilityTimer += dt;
  if (this.abilityTimer < b.every) return;
  this.abilityTimer = 0;
  var ab = b.ability;
  if (ab === 'chaos') { ab = ['shield', 'summon', 'freeze'][this.abilityStep % 3]; this.abilityStep++; }
  if (ab === 'summon') {
    for (var k = 0; k < 2; k++) {
      game.enemies.push(new Enemy({ type: 'skeleton', lane: this.laneIndex, hp: currentCfg().health * 0.6 * hpScale(), speed: currentCfg().speed * 1.1 * game.enemyMods.speed, progress: Math.max(0, this.progress - 0.3 - k * 0.4) }));
    }
    spawnRing(this.x, this.y, '#5cff9e', grid.tileSize * 1.2);
    spawnText(this.x, this.y - grid.tileSize * 0.6, '¡Alzaos!', '#5cff9e', true);
  } else if (ab === 'shield') {
    this.shieldUntil = game.time + (b.dur || 2);
    spawnRing(this.x, this.y, '#ffe680', grid.tileSize);
  } else if (ab === 'freeze') {
    var cands = game.towers.filter(function (t) { return !t.frozen; });
    if (cands.length) {
      cands.sort(function (a, c) { return Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(c.x - this.x, c.y - this.y); }.bind(this));
      var tw = cands[Math.floor(Math.random() * Math.min(3, cands.length))];
      tw.frozenUntil = game.time + (b.dur || 3);
      game.shots.push({ kind: 'beam', x1: this.x, y1: this.y, x2: tw.x, y2: tw.y, color: '#bff0ff', life: 0.35, maxLife: 0.35, width: 4 });
      spawnParticles(tw.x, tw.y, '#e6f8ff', 12, 80);
    }
  } else if (ab === 'blink') {
    var wps = grid.lanes[this.laneIndex].waypoints;
    var target = Math.min(this.progress + 1.6, wps.length - 2.2);
    if (target > this.progress) {
      spawnParticles(this.x, this.y, '#9b6bdf', 14, 90);
      this.setProgress(target);
      spawnParticles(this.x, this.y, '#9b6bdf', 14, 90);
    }
  }
};
Enemy.prototype.reachedEnd = function () {
  return this.progress >= grid.lanes[this.laneIndex].waypoints.length - 1;
};
// Daño sin armadura (veneno, quemaduras).
Enemy.prototype.rawDamage = function (amount, color) {
  if (this.dead || this.shielded) return;
  this.health -= amount;
  if (this.health <= 0) killEnemy(this, null);
};
// Devuelve el daño real infligido.
Enemy.prototype.takeDamage = function (dmg, towerType, opts) {
  if (this.dead) return 0;
  if (this.shielded) {
    if (Math.random() < 0.15) spawnText(this.x, this.y - 10, 'Bloqueado', '#ffe680');
    return 0;
  }
  var actual = dmg * (1 - clamp(this.armor, 0, 0.8));
  if (this.physicalResist && towerType && PHYSICAL_TOWER_TYPES[towerType]) actual *= (1 - this.physicalResist);
  if (this.cursed || this.curseUntil > game.time) actual *= 1.3;
  if (this.isBoss && this.boss.ability === 'fly' && towerType && TOWER_TYPES[towerType] && !TOWER_TYPES[towerType].antiAir) actual *= 0.5;
  this.health -= actual;
  if (opts && opts.crit) spawnText(this.x, this.y - grid.tileSize * 0.3, fmt(actual) + '!', '#ffd166', true);
  else if (opts && opts.show) spawnText(this.x, this.y - grid.tileSize * 0.3, fmt(actual), opts.color || '#fff');
  if (this.health > 0 && !this.isBoss && game.mods.execute > 0 && this.health / this.maxHealth < game.mods.execute) {
    spawnText(this.x, this.y - grid.tileSize * 0.3, 'Ejecutado', '#ff5c7a');
    this.health = 0;
  }
  if (this.health <= 0) killEnemy(this, opts && opts.tower);
  return actual;
};
Enemy.prototype.applySlow = function (factor) {
  var f = factor;
  var extra = game.mods.slow + (game.hero === 'aria' ? 0.2 : 0);
  f = 1 - (1 - f) * (1 + extra);
  if (this.isBoss) f = 1 - (1 - f) * 0.5;
  this.slowFactor = Math.max(0.25, this.slowFactor * f);
};
Enemy.prototype.applyStun = function (sec) {
  if (this.isBoss) sec *= 0.35;
  this.stunUntil = Math.max(this.stunUntil, game.time + sec);
};
Enemy.prototype.applyCurse = function (sec) { this.curseUntil = Math.max(this.curseUntil, game.time + sec); };
Enemy.prototype.applyKnockback = function (frac) {
  if (this.knockbackCooldown > 0 || this.isBoss) return;
  this.knockbackCooldown = 0.4;
  this.setProgress(Math.max(0, this.progress - frac));
};
Enemy.prototype.applyPoison = function () {
  this.poisonStacks = Math.min(5, this.poisonStacks + 1);
  if (this.poisonTimer <= 0) this.poisonTimer = 0.5;
};
Enemy.prototype.applyBurn = function (dps, sec) {
  this.burnDps = Math.max(this.burnDps * (this.burnTime > 0 ? 1 : 0), dps);
  this.burnTime = Math.max(this.burnTime, sec);
};
Enemy.prototype.draw = function (now) {
  var ts = grid.tileSize;
  var r = ts * 0.28 * (this.isBoss ? 1.4 : this.isElite ? 0.92 : 1);
  if (this.flying || (this.isBoss && this.boss.ability === 'fly')) {
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + ts * 0.34, ts * 0.22, ts * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
  }
  if (this.isElite) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, ts * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, ts * 0.05);
    ctx.stroke();
  }
  if (this.isBoss) {
    var pulse = 0.4 + Math.sin(now / 200) * 0.15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, ts * 0.66, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(this.boss.color, pulse);
    ctx.lineWidth = Math.max(2, ts * 0.06);
    ctx.stroke();
  }
  drawEnemyShape(ctx, this, ts, now);
  var hp = clamp(this.health / this.maxHealth, 0, 1);
  var barW = r * 2.1, by = this.y - r - (this.isBoss ? 18 : 12);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(this.x - barW / 2 - 1, by - 1, barW + 2, 6);
  ctx.fillStyle = this.shielded ? '#ffe680' : hp > 0.5 ? '#4ecdc4' : hp > 0.25 ? '#ffb454' : '#e94560';
  ctx.fillRect(this.x - barW / 2, by, barW * hp, 4);
};

/* ---------- TORRE ---------- */
function Tower(col, row, type, level) {
  this.col = col; this.row = row; this.type = type;
  this.level = level || 1;
  this.shootTimer = 0; this.recoil = 0; this.aimAngle = -Math.PI / 2;
  this.targeting = 'first';
  this.dealt = 0; this.kills = 0;
  this.frozenUntil = 0;
  this.spawnAnim = 1;
  var p = tileCenter(col, row);
  this.x = p.x; this.y = p.y;
  this.def = TOWER_TYPES[type];
  this.color = this.def.color;
  this.totalSpentMana = this.def.manaCost;
  applyTowerStats(this);
}
function applyTowerStats(t) {
  var d = t.def;
  var card = cardDmgMult(game.cardLevels[t.type] || 1);
  var lv = t.level - 1;
  if (game.fusion) {
    var power = 1 + 0.25 * ((game.typePower[t.type] || 1) - 1);
    t.damage = d.damage * card * FUSION_DMG[Math.min(lv, FUSION_DMG.length - 1)] * power;
    t.speed = d.speed * (1 + 0.06 * lv);
    t.rangeTiles = d.rangeTiles * (1 + 0.03 * lv);
  } else {
    t.damage = d.damage * card * Math.pow(1.32, lv);
    t.speed = d.speed * Math.pow(1.12, lv);
    t.rangeTiles = d.rangeTiles * Math.pow(1.06, lv);
  }
}
Tower.prototype.rangePx = function () { return this.rangeTiles * game.mods.range * grid.tileSize; };
Tower.prototype.auraMult = function () {
  var m = 1;
  for (var i = 0; i < game.towers.length; i++) {
    var o = game.towers[i];
    if (!o.def.support || o === this) continue;
    if (Math.abs(o.col - this.col) <= 1 && Math.abs(o.row - this.row) <= 1) m += o.def.aura * (1 + 0.25 * (o.level - 1));
  }
  return m;
};
Tower.prototype.update = function (dt) {
  if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
  if (this.spawnAnim > 0) this.spawnAnim = Math.max(0, this.spawnAnim - dt * 3);
  this.frozen = this.frozenUntil > game.time;
  if (this.frozen) return;
  if (this.def.support) {
    if (game.isWaveActive) {
      var gen = this.def.manaGen * (1 + 0.35 * (this.level - 1)) * game.mods.manaMult;
      gainMana(gen * dt);
      this.genAcc = (this.genAcc || 0) + gen * dt;
      if (this.genAcc >= 5) { this.genAcc -= 5; spawnText(this.x, this.y - grid.tileSize * 0.4, '+5 💧', '#4ecdc4'); }
    }
    return;
  }
  this.shootTimer += dt;
  var spd = this.speed * game.mods.speed * (game.overchargeUntil > game.time ? 2 : 1);
  if (this.shootTimer >= 1 / spd) {
    var target = this.findTarget();
    if (target) {
      this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
      this.shoot(target);
      this.shootTimer = 0;
      this.recoil = 1;
    } else {
      this.shootTimer = 1 / spd;
    }
  }
};
Tower.prototype.canHit = function (e) {
  if (e.dead) return false;
  return this.def.antiAir || !e.flying;
};
// Ignora a los enemigos que ya van a morir por proyectiles en vuelo
// (incoming >= vida) mientras haya otro objetivo, para no desperdiciar disparos.
Tower.prototype.findTarget = function () {
  var range = this.rangePx();
  var best = null, bestScore = -Infinity, doomed = null, doomedScore = -Infinity;
  for (var i = 0; i < game.enemies.length; i++) {
    var e = game.enemies[i];
    if (!this.canHit(e)) continue;
    var d = Math.hypot(e.x - this.x, e.y - this.y);
    if (d > range) continue;
    var score;
    if (this.targeting === 'first') score = e.progress;
    else if (this.targeting === 'last') score = -e.progress;
    else if (this.targeting === 'strong') score = e.health + (e.isBoss ? 1e7 : 0);
    else score = -d;
    // Las antiaéreas priorizan a los voladores: el resto de torres no puede tocarlos.
    if (e.flying && this.def.antiAir) score += 1e8;
    if (e.incoming >= e.health && !e.shielded) {
      if (score > doomedScore) { doomed = e; doomedScore = score; }
    } else if (score > bestScore) { best = e; bestScore = score; }
  }
  return best || doomed;
};
Tower.prototype.hitDamage = function (target) {
  var d = this.damage * game.mods.dmg * (game.mods.typeDmg[this.type] || 1) * this.auraMult();
  if (target && (target.isBoss || target.isElite)) d *= game.mods.bossDmg;
  var crit = Math.random() < game.mods.crit;
  if (crit) d *= 2;
  return { dmg: d, crit: crit };
};
Tower.prototype.deal = function (e, dmg, crit, show) {
  var dealt = e.takeDamage(dmg, this.type, { crit: crit, show: show, tower: this });
  this.dealt += dealt;
  game.damageDealt += dealt;
  if (crit) sfxCrit();
  return dealt;
};
Tower.prototype.shoot = function (target) {
  var self = this, d = this.def, ts = grid.tileSize;
  sfxShoot(this.type);
  if (this.type === 'electric') {
    var hitSet = [target], cur = target;
    var chains = d.chain - 1 + game.mods.chain;
    for (var c = 0; c < chains; c++) {
      var next = null, bestD = Infinity;
      for (var i = 0; i < game.enemies.length; i++) {
        var e = game.enemies[i];
        if (hitSet.indexOf(e) !== -1 || !this.canHit(e)) continue;
        var dd = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (dd < ts * 2.2 && dd < bestD) { next = e; bestD = dd; }
      }
      if (!next) break;
      hitSet.push(next);
      cur = next;
    }
    var px = this.x, py = this.y;
    hitSet.forEach(function (e, idx) {
      game.shots.push({ kind: 'bolt', x1: px, y1: py, x2: e.x, y2: e.y, color: d.color2, life: 0.16, maxLife: 0.16, width: 2.5 });
      px = e.x; py = e.y;
      var h = self.hitDamage(e);
      self.deal(e, h.dmg * (idx === 0 ? 1 : 0.6), h.crit, false);
      spawnParticles(e.x, e.y, d.color2, 3, 50);
    });
    return;
  }
  if (this.type === 'sniper') {
    game.shots.push({ kind: 'beam', x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: d.color2, life: 0.18, maxLife: 0.18, width: 3 });
    spawnParticles(target.x, target.y, d.color2, 6, 80);
    var hs = this.hitDamage(target);
    this.deal(target, hs.dmg, hs.crit, true);
    return;
  }
  // El resto lanza un proyectil de verdad que viaja hasta el objetivo.
  var hit = this.hitDamage(target);
  var expected = hit.dmg * (1 - clamp(target.armor, 0, 0.8));
  target.incoming = (target.incoming || 0) + expected;
  var proj = {
    hit: hit, expected: expected,
    x: this.x, y: this.y, target: target, tx: target.x, ty: target.y,
    speed: ts * (this.type === 'cannon' ? 6 : this.type === 'dragon' ? 7 : 10),
    color: d.color, color2: d.color2, kind: this.type, tower: this,
    size: ts * (this.type === 'cannon' || this.type === 'dragon' ? 0.12 : 0.08), trail: []
  };
  game.projectiles.push(proj);
};
function projectileHit(p) {
  if (p.target) p.target.incoming = Math.max(0, (p.target.incoming || 0) - p.expected);
  var t = p.tower, d = t.def, ts = grid.tileSize, target = p.target && !p.target.dead ? p.target : null;
  if (d.splashTiles) {
    var splashR = d.splashTiles * game.mods.splash * ts;
    var splashBoost = game.hero === 'brann' ? 1.2 : 1;
    var h = p.hit;
    spawnRing(p.x, p.y, d.color2, splashR, 0.3);
    spawnParticles(p.x, p.y, d.color2, 12, 140);
    var hits = 0;
    game.enemies.slice().forEach(function (e) {
      if (!t.canHit(e)) return;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= splashR) {
        hits++;
        t.deal(e, h.dmg * splashBoost, h.crit, false);
        if (d.burn && !e.dead) e.applyBurn(t.damage * 0.35, 3);
      }
    });
    if (hits >= 3) shake(2);
    return;
  }
  if (!target) return;
  var hd = p.hit;
  spawnParticles(target.x, target.y, d.color2, 4, 60);
  if (t.type === 'frost') { if (!target.dead) target.applySlow(d.slow); }
  else if (t.type === 'arcane') { if (!target.dead) target.applyCurse(2.6); }
  else if (t.type === 'wind') { if (!target.dead) target.applyKnockback(d.knockback); }
  else if (t.type === 'venom') { if (!target.dead) target.applyPoison(); }
  else if (t.type === 'chrono') {
    if (!target.dead && Math.random() < d.stunChance) {
      target.applyStun(1.2);
      spawnText(target.x, target.y - ts * 0.3, '⏳', '#ffe6a8');
      if (game.hero === 'aria') target.applySlow(0.7);
    }
  }
  t.deal(target, hd.dmg, hd.crit, false);
}
function updateProjectiles(dt) {
  game.projectiles = game.projectiles.filter(function (p) {
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
    var dx = p.tx - p.x, dy = p.ty - p.y;
    var dist = Math.hypot(dx, dy);
    var step = p.speed * dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();
    if (dist <= step || dist < 2) {
      p.x = p.tx; p.y = p.ty;
      projectileHit(p);
      return false;
    }
    p.x += dx / dist * step; p.y += dy / dist * step;
    return true;
  });
}
Tower.prototype.upgradeCost = function () { return Math.round(this.def.manaCost * 0.75 * this.level * game.mods.cost); };
Tower.prototype.sellValue = function () { return Math.round(this.totalSpentMana * 0.6); };
Tower.prototype.evolve = function () {
  if (this.level >= TOWER_MAX_LEVEL) return false;
  this.totalSpentMana += this.upgradeCost();
  this.level++;
  applyTowerStats(this);
  this.spawnAnim = 1;
  return true;
};
Tower.prototype.draw = function (isSelected, now, highlight) {
  var ts = grid.tileSize;
  var p = tileCenter(this.col, this.row);
  this.x = p.x; this.y = p.y;
  if (isSelected && !this.def.support) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.rangePx(), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (isSelected || highlight) {
    ctx.strokeStyle = highlight ? hexA('#ffd166', 0.55 + Math.sin(now / 150) * 0.35) : '#ffffff';
    ctx.lineWidth = 2.5;
    rrect(ctx, grid.offsetX + this.col * ts + 2, grid.offsetY + this.row * ts + 2, ts - 4, ts - 4, ts * 0.15);
    ctx.stroke();
  }
  if (this.def.support) {
    ctx.fillStyle = hexA('#ffd54f', 0.07 + Math.sin(now / 400) * 0.03);
    ctx.fillRect(grid.offsetX + (this.col - 1) * ts, grid.offsetY + (this.row - 1) * ts, ts * 3, ts * 3);
  }
  var sc = 1 + this.spawnAnim * 0.35;
  if (sc !== 1) { ctx.save(); ctx.translate(this.x, this.y); ctx.scale(sc, sc); ctx.translate(-this.x, -this.y); }
  drawTowerShape(ctx, this, ts, now);
  if (sc !== 1) ctx.restore();
  if (!game.fusion) {
    drawLevelPips(this, ts);
    if (this.level < TOWER_MAX_LEVEL && game.mana >= this.upgradeCost()) drawUpgradeBadge(this, ts, now);
    return;
  }
  if (game.fusion || this.level > 1) {
    ctx.font = 'bold ' + Math.round(ts * 0.22) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
    var lbl = String(this.level);
    var lx = grid.offsetX + this.col * ts + ts * 0.18, ly = grid.offsetY + this.row * ts + ts * 0.2;
    ctx.strokeText(lbl, lx, ly);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(lbl, lx, ly);
  }
};

/* Nivel de la torre como estrellitas bajo la casilla. */
function drawLevelPips(t, ts) {
  var n = t.level;
  var r = Math.max(2.2, ts * 0.055);
  var gap = r * 2.6;
  var x0 = t.x - (n - 1) * gap / 2;
  var y = grid.offsetY + t.row * ts + ts - r * 1.6;
  for (var i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x0 + i * gap, y, r, 0, Math.PI * 2);
    ctx.fillStyle = n >= TOWER_MAX_LEVEL ? '#ff9ff3' : '#ffd166';
    ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
  }
}
/* Flecha verde que late cuando hay maná para mejorar la torre. */
function drawUpgradeBadge(t, ts, now) {
  var r = Math.max(6, ts * 0.17);
  var x = grid.offsetX + t.col * ts + ts - r * 0.9;
  var y = grid.offsetY + t.row * ts + r * 0.9 + Math.sin(now / 180 + t.col) * ts * 0.03;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2ecc71'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#eafff2'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x + r * 0.5, y + r * 0.05); ctx.lineTo(x + r * 0.2, y + r * 0.05);
  ctx.lineTo(x + r * 0.2, y + r * 0.5); ctx.lineTo(x - r * 0.2, y + r * 0.5); ctx.lineTo(x - r * 0.2, y + r * 0.05);
  ctx.lineTo(x - r * 0.5, y + r * 0.05); ctx.closePath(); ctx.fill();
}
/* Etiqueta con el coste encima de la torre seleccionada. */
function drawUpgradeCostTag(t, ts) {
  var cost = t.upgradeCost();
  var ok = game.mana >= cost;
  var label = '⬆ ' + cost + ' 💧';
  ctx.font = 'bold ' + Math.round(Math.max(11, ts * 0.24)) + 'px "Segoe UI", Arial';
  var w = ctx.measureText(label).width + 14, h = Math.max(18, ts * 0.36);
  var x = clamp(t.x - w / 2, 2, grid.w - w - 2), y = grid.offsetY + t.row * ts - h - 4;
  if (y < grid.offsetY) y = grid.offsetY + t.row * ts + ts + 4;
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = ok ? '#2ecc71' : 'rgba(30,30,40,0.9)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = ok ? '#eafff2' : '#ff8fa3'; ctx.stroke();
  ctx.fillStyle = ok ? '#06261a' : '#ff8fa3';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}
