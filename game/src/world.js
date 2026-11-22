// world.js — one clear job: the rules of the heist.
// Movement and collision, guard patrol / investigate / chase, vision cones
// with line of sight, cameras, the alarm meter, loot, the vault, tools
// (coin, smoke, EMP), lives and score. Rendering lives in render.js.
import {
  TILE, COLS, ROWS, THIEF_SPEED, THIEF_SNEAK, GUARD_SPEED, GUARD_CHASE_SPEED,
  GUARD_FOV, GUARD_RANGE, CAMERA_RANGE, CAMERA_FOV, DETECT_RATE, DETECT_SNEAK,
  ALARM_ON_SPOT, ALARM_DECAY, ALARM_CAMERA_SPOT, NOISE_RUN_RADIUS,
  NOISE_COIN_RADIUS, CATCH_DIST, VAULT_CRACK_TIME, SMOKE_TIME, EMP_TIME,
  COIN_COOLDOWN,
} from './config.js';
import { LEVELS, LOOT_VALUE, VAULT_VALUE, validateLevel } from './levels.js';

export const TILE_WALKABLE = new Set(['.', ',', 'r', 'B', 'T', 'E', 'V', 'd', 'p', 'g']);
export const TILE_SIGHT_BLOCK = new Set(['#', 'C']);

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}
export function isWalkable(level, tx, ty) {
  return TILE_WALKABLE.has(tileAt(level, tx, ty));
}
export function blocksSight(level, tx, ty) {
  return TILE_SIGHT_BLOCK.has(tileAt(level, tx, ty));
}
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// Line of sight on the tile grid: sample the segment, stop at a sight blocker.
// A thief hiding inside a plant ('B') is invisible unless the watcher is close.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((ax + dx * t) / TILE);
    const ty = Math.floor((ay + dy * t) / TILE);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveWithCollision(level, body, dx, dy) {
  const r = body.radius;
  const tryMove = (nx, ny) => {
    const minTx = Math.floor((nx - r) / TILE);
    const maxTx = Math.floor((nx + r) / TILE);
    const minTy = Math.floor((ny - r) / TILE);
    const maxTy = Math.floor((ny + r) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isWalkable(level, tx, ty)) return false;
      }
    }
    body.x = nx;
    body.y = ny;
    return true;
  };
  if (!tryMove(body.x + dx, body.y)) {
    // Slide along the wall: try each axis on its own.
    tryMove(body.x + dx, body.y);
    tryMove(body.x, body.y + dy);
  } else {
    tryMove(body.x, body.y + dy);
  }
}

export function createWorld(levelIndex, rng) {
  const level = LEVELS[levelIndex];
  const errors = validateLevel(level);
  if (errors.length) throw new Error(`level ${levelIndex}: ${errors.join('; ')}`);

  const loot = [];
  let thiefStart = { x: TILE * 2, y: TILE * 2 };
  let exit = { x: 0, y: 0 };
  let vault = { x: 0, y: 0 };
  level.map.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const c = tileCenter(tx, ty);
      if (ch === 'T') thiefStart = c;
      if (ch === 'E') exit = c;
      if (ch === 'V') vault = c;
      if (ch === 'd' || ch === 'p' || ch === 'g') {
        loot.push({ kind: ch, x: c.x, y: c.y, taken: false, bob: rng() * Math.PI * 2 });
      }
    });
  });

  const guards = level.guards.map((g) => {
    const [sx, sy] = g.waypoints[0];
    const start = tileCenter(sx, sy);
    const waypoints = g.waypoints.map(([tx, ty]) => tileCenter(tx, ty));
    return {
      x: start.x, y: start.y, radius: 13,
      angle: 0, waypoints, wp: 1, pause: 0,
      state: 'patrol', // patrol | investigate | chase | return
      detect: 0, lastSeen: null, loseTimer: 0, investigate: null,
      heard: null, speed: GUARD_SPEED,
    };
  });

  const cameras = level.cameras.map((c) => {
    const p = tileCenter(c.x, c.y);
    return {
      x: p.x, y: p.y, baseAngle: c.angle, sweep: c.sweep,
      angle: c.angle, t: rng() * Math.PI * 2, disabled: 0, spotted: 0,
    };
  });

  return {
    levelIndex,
    level,
    thief: {
      x: thiefStart.x, y: thiefStart.y, radius: 13,
      angle: -Math.PI / 2, moving: false, sneaking: false,
      walkTarget: null, hidden: false,
    },
    guards,
    cameras,
    loot,
    exit,
    vault: { ...vault, open: false, progress: 0 },
    alarm: 0,
    lootValue: 0,
    lootCount: 0,
    quota: level.quota,
    lives: 3,
    time: 0,
    coins: 999, // coins are free; the cost is the cooldown
    coinCooldown: 0,
    smoke: 2,
    emp: 1,
    smokes: [], // { x, y, ttl }
    coin: null, // flying / ringing coin { x, y, ttl }
    selectedTool: 1,
    vaultCracking: false,
    exitOpen: false,
    spottedFlash: 0,
    status: 'playing', // playing | caught | cleared | busted
    statusTimer: 0,
    ghost: true, // never spotted so far (bonus)
    spottedCount: 0,
    noises: [], // expanding rings for the renderer { x, y, r, max }
  };
}

function guardSeesThief(world, guard, dt) {
  const { thief, level } = world;
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.angle)) > GUARD_FOV) return 0;
  if (!hasLineOfSight(world.level, guard.x, guard.y, thief.x, thief.y)) return 0;
  if (thief.hidden && dist > 55) return 0; // buried in a plant
  if (world.smokes.some((s) => {
    const d1 = Math.hypot(thief.x - s.x, thief.y - s.y);
    const d2 = Math.hypot(guard.x - s.x, guard.y - s.y);
    return d1 < 70 || (d2 < 70 && dist > 60);
  })) return 0;
  const closeness = 1 - (dist / GUARD_RANGE) * 0.55;
  const rate = DETECT_RATE * closeness * (thief.sneaking ? DETECT_SNEAK : 1);
  return rate * dt;
}

function cameraSeesThief(world, cam, dt) {
  const { thief } = world;
  if (cam.disabled > 0) return 0;
  const dx = thief.x - cam.x;
  const dy = thief.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, cam.angle)) > CAMERA_FOV) return 0;
  if (!hasLineOfSight(world.level, cam.x, cam.y, thief.x, thief.y)) return 0;
  if (thief.hidden && dist > 55) return 0;
  if (world.smokes.some((s) => Math.hypot(thief.x - s.x, thief.y - s.y) < 70)) return 0;
  return DETECT_RATE * 0.8 * dt;
}

function raiseAlarm(world, amount, x, y) {
  world.alarm = Math.min(100, world.alarm + amount);
  world.spottedFlash = 1;
  world.spottedCount += 1;
  world.ghost = false;
  if (x !== undefined) world.noises.push({ x, y, r: 10, max: 120 });
}

export function throwCoin(world) {
  if (world.coinCooldown > 0 || world.status !== 'playing') return false;
  const a = world.thief.angle;
  const x = world.thief.x + Math.cos(a) * 90;
  const y = world.thief.y + Math.sin(a) * 90;
  world.coin = { x, y, ttl: 2.2 };
  world.coinCooldown = COIN_COOLDOWN;
  world.noises.push({ x, y, r: 10, max: NOISE_COIN_RADIUS });
  for (const g of world.guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < NOISE_COIN_RADIUS && g.state !== 'chase') {
      g.state = 'investigate';
      g.investigate = { x, y };
      g.detect = Math.max(g.detect, 0.35);
    }
  }
  return true;
}

export function useSmoke(world) {
  if (world.smoke <= 0 || world.status !== 'playing') return false;
  world.smoke -= 1;
  world.smokes.push({ x: world.thief.x, y: world.thief.y, ttl: SMOKE_TIME });
  return true;
}

export function useEmp(world) {
  if (world.emp <= 0 || world.status !== 'playing') return false;
  world.emp -= 1;
  for (const cam of world.cameras) cam.disabled = EMP_TIME;
  return true;
}

export function updateWorld(world, input, dt, audio) {
  if (world.status !== 'playing') {
    world.statusTimer += dt;
    return;
  }
  world.time += dt;
  const { thief, level } = world;

  // --- thief movement: keys, or click-to-walk ---
  let mx = input.moveX;
  let my = input.moveY;
  if (mx === 0 && my === 0 && thief.walkTarget) {
    const dx = thief.walkTarget.x - thief.x;
    const dy = thief.walkTarget.y - thief.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      thief.walkTarget = null;
    } else {
      mx = dx / d;
      my = dy / d;
    }
  }
  if (input.click) {
    const { x, y } = input.click;
    input.click = null;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (isWalkable(level, tx, ty) && y > 64) thief.walkTarget = { x, y };
  }
  thief.moving = mx !== 0 || my !== 0;
  thief.sneaking = input.sneak && thief.moving;
  if (thief.moving) {
    const speed = thief.sneaking ? THIEF_SNEAK : THIEF_SPEED;
    moveWithCollision(level, thief, mx * speed * dt, my * speed * dt);
    thief.angle = Math.atan2(my, mx);
    if (!thief.sneaking && world.time % 0.45 < dt) {
      // Running feet ring out: nearby guards come to look.
      for (const g of world.guards) {
        const d = Math.hypot(g.x - thief.x, g.y - thief.y);
        if (d < NOISE_RUN_RADIUS && g.state === 'patrol') {
          g.state = 'investigate';
          g.investigate = { x: thief.x, y: thief.y };
        }
      }
    }
  }
  const thiefTile = tileAt(level, Math.floor(thief.x / TILE), Math.floor(thief.y / TILE));
  thief.hidden = thiefTile === 'B';

  // --- tools ---
  if (input.toolKey) {
    world.selectedTool = input.toolKey;
    input.toolKey = 0;
  }
  if (input.useTool) {
    input.useTool = false;
    if (world.selectedTool === 1) { if (throwCoin(world)) audio.coin(); }
    if (world.selectedTool === 2) { if (useSmoke(world)) audio.smoke(); }
    if (world.selectedTool === 3) { if (useEmp(world)) audio.emp(); }
  }
  world.coinCooldown = Math.max(0, world.coinCooldown - dt);
  if (world.coin) {
    world.coin.ttl -= dt;
    if (world.coin.ttl <= 0) world.coin = null;
  }
  for (const s of world.smokes) s.ttl -= dt;
  world.smokes = world.smokes.filter((s) => s.ttl > 0);
  for (const n of world.noises) n.r += 260 * dt;
  world.noises = world.noises.filter((n) => n.r < n.max);

  // --- loot: walk over it, or press E beside the vault ---
  for (const item of world.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - thief.x, item.y - thief.y);
    if (d < 26) {
      item.taken = true;
      world.lootValue += LOOT_VALUE[item.kind];
      world.lootCount += 1;
      audio.pickup();
    }
  }
  const vaultDist = Math.hypot(world.vault.x - thief.x, world.vault.y - thief.y);
  world.vaultCracking = false;
  if (!world.vault.open && vaultDist < 52 && input.interactHeld) {
    world.vaultCracking = true;
    world.vault.progress += dt / VAULT_CRACK_TIME;
    if (world.vault.progress >= 1) {
      world.vault.open = true;
      world.lootValue += VAULT_VALUE;
      world.lootCount += 1;
      audio.vault();
    }
  } else if (!world.vault.open) {
    world.vault.progress = Math.max(0, world.vault.progress - dt * 0.5);
  }

  world.exitOpen = world.lootValue >= world.quota;
  if (world.exitOpen && Math.hypot(world.exit.x - thief.x, world.exit.y - thief.y) < 30) {
    world.status = 'cleared';
    world.statusTimer = 0;
    audio.win();
    audio.stopMusic();
    return;
  }

  // --- cameras sweep; a camera that fully spots you raises the alarm ---
  for (const cam of world.cameras) {
    cam.disabled = Math.max(0, cam.disabled - dt);
    cam.t += dt;
    cam.angle = cam.baseAngle + Math.sin(cam.t * 0.55) * cam.sweep;
    const seen = cameraSeesThief(world, cam, dt);
    if (seen > 0) {
      cam.spotted += seen;
      if (cam.spotted >= 1) {
        cam.spotted = 0;
        raiseAlarm(world, ALARM_CAMERA_SPOT, thief.x, thief.y);
        audio.spotted();
        for (const g of world.guards) {
          if (g.state === 'patrol') {
            g.state = 'investigate';
            g.investigate = { x: thief.x, y: thief.y };
          }
        }
      }
    } else {
      cam.spotted = Math.max(0, cam.spotted - dt * 0.5);
    }
  }

  // --- guards: patrol, investigate, chase, return ---
  let anyoneSees = false;
  for (const g of world.guards) {
    const seen = guardSeesThief(world, g, dt);
    if (seen > 0) {
      anyoneSees = true;
      const before = g.detect;
      g.detect = Math.min(1, g.detect + seen);
      if (before < 1 && g.detect >= 1) {
        raiseAlarm(world, ALARM_ON_SPOT, thief.x, thief.y);
        audio.spotted();
        g.state = 'chase';
        g.lastSeen = { x: thief.x, y: thief.y };
        g.loseTimer = 0;
      }
    } else {
      g.detect = Math.max(0, g.detect - dt * 0.4);
    }

    if (g.state === 'patrol') {
      if (g.pause > 0) {
        g.pause -= dt;
      } else {
        const target = g.waypoints[g.wp];
        const dx = target.x - g.x;
        const dy = target.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          g.wp = (g.wp + 1) % g.waypoints.length;
          g.pause = 1.2;
        } else {
          moveWithCollision(level, g, (dx / d) * GUARD_SPEED * dt, (dy / d) * GUARD_SPEED * dt);
          g.angle = Math.atan2(dy, dx);
        }
      }
    } else if (g.state === 'investigate') {
      const target = g.investigate || g.waypoints[g.wp];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        g.pause += dt;
        if (g.pause > 2.2) {
          g.state = 'return';
          g.pause = 0;
        }
      } else {
        g.pause = 0;
        moveWithCollision(level, g, (dx / d) * GUARD_SPEED * 1.25 * dt, (dy / d) * GUARD_SPEED * 1.25 * dt);
        g.angle = Math.atan2(dy, dx);
      }
    } else if (g.state === 'chase') {
      if (g.detect >= 1 || (g.lastSeen && Math.hypot(g.lastSeen.x - thief.x, g.lastSeen.y - thief.y) < 120)) {
        g.lastSeen = { x: thief.x, y: thief.y };
        g.loseTimer = 0;
      } else {
        g.loseTimer += dt;
      }
      if (g.loseTimer > 3) {
        g.state = 'investigate';
        g.investigate = g.lastSeen ? { ...g.lastSeen } : { x: g.x, y: g.y };
        g.detect = 0.4;
      } else {
        const target = g.lastSeen || { x: thief.x, y: thief.y };
        const dx = target.x - g.x;
        const dy = target.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          moveWithCollision(level, g, (dx / d) * GUARD_CHASE_SPEED * dt, (dy / d) * GUARD_CHASE_SPEED * dt);
          g.angle = Math.atan2(dy, dx);
        }
      }
      const catchD = Math.hypot(g.x - thief.x, g.y - thief.y);
      if (catchD < CATCH_DIST) {
        world.lives -= 1;
        world.status = world.lives <= 0 ? 'busted' : 'caught';
        world.statusTimer = 0;
        audio.caught();
        audio.stopMusic();
        return;
      }
    } else if (g.state === 'return') {
      const target = g.waypoints[g.wp];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        g.state = 'patrol';
        g.pause = 0.6;
      } else {
        moveWithCollision(level, g, (dx / d) * GUARD_SPEED * dt, (dy / d) * GUARD_SPEED * dt);
        g.angle = Math.atan2(dy, dx);
      }
    }
  }

  // --- the alarm meter: climbs when seen, falls when hidden ---
  if (!anyoneSees) world.alarm = Math.max(0, world.alarm - ALARM_DECAY * dt);
  world.spottedFlash = Math.max(0, world.spottedFlash - dt * 1.5);
  if (world.alarm >= 100) {
    world.alarm = 100;
    for (const g of world.guards) {
      g.state = 'chase';
      g.lastSeen = { x: thief.x, y: thief.y };
      g.loseTimer = 0;
    }
  }
  audio.setAlarmLevel(world.alarm);
}

export function scoreWorld(world) {
  const timeBonus = Math.max(0, 3000 - Math.floor(world.time) * 10);
  const ghostBonus = world.ghost ? 2500 : 0;
  return world.lootValue + timeBonus + ghostBonus;
}
