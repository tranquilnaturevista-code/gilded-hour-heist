// render.js — one clear job: everything drawn on the one canvas.
// The look: a night gallery in deep violet and gold — marble floors, red rugs,
// gold loot that glows, warm guard cones, cold blue camera cones, and a big
// labelled ALARM meter across the top so one frame tells the whole heist.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, HUD_H, COLORS, GUARD_RANGE, GUARD_FOV, CAMERA_RANGE, CAMERA_FOV } from './config.js';
import { tileAt, tileCenter } from './world.js';
import { LOOT_NAME } from './levels.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawLoot(ctx, item, time) {
  const bob = Math.sin(time * 2 + item.bob) * 3;
  const glow = ctx.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 34);
  const color = item.kind === 'd' ? COLORS.lootGem : COLORS.loot;
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(item.x, item.y + bob, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  if (item.kind === 'd') {
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.kind === 'p') {
    ctx.fillRect(-11, -8, 22, 16);
    ctx.strokeRect(-11, -8, 22, 16);
    ctx.fillStyle = '#7a4a2b';
    ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-2, 4);
    ctx.lineTo(2, -6);
    ctx.lineTo(6, 4);
    ctx.lineTo(10, -6);
    ctx.lineTo(10, 7);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // Name tag on a dark pill so it stays readable over glow and neighbours.
  const label = LOOT_NAME[item.kind].toUpperCase();
  ctx.font = 'bold 10px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(10, 8, 18, 0.78)';
  roundRect(ctx, item.x - w / 2, item.y + 16 + bob, w, 15, 7);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(242, 234, 216, 0.95)';
  ctx.fillText(label, item.x, item.y + 27 + bob);
}

function drawGuard(ctx, g, time) {
  const alert = g.state === 'chase';
  drawCone(
    ctx, g.x, g.y, g.angle, GUARD_FOV, GUARD_RANGE,
    alert ? COLORS.coneAlert : COLORS.cone,
    alert ? 'rgba(255,70,70,0.7)' : COLORS.coneEdge,
  );
  // Body: navy uniform, cap, torch dot at the cone's tip direction.
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.fillStyle = '#0e1424';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardTrim;
  ctx.fillRect(4, -3, 9, 6);
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.arc(9, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Detection ring + state mark.
  if (g.detect > 0.05) {
    ctx.beginPath();
    ctx.arc(g.x, g.y - 22, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.detect);
    ctx.strokeStyle = g.detect >= 1 ? '#ff4747' : '#ffd65a';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (alert) {
    ctx.fillStyle = '#ff4747';
    ctx.fillText('!', g.x, g.y - 30);
  } else if (g.state === 'investigate') {
    ctx.fillStyle = '#ffd65a';
    ctx.fillText('?', g.x, g.y - 30);
  }
  void time;
}

function drawCamera(ctx, cam) {
  const disabled = cam.disabled > 0;
  drawCone(
    ctx, cam.x, cam.y, cam.angle, CAMERA_FOV, CAMERA_RANGE,
    disabled ? 'rgba(120,120,120,0.08)' : COLORS.camCone,
    disabled ? 'rgba(120,120,120,0.4)' : COLORS.camConeEdge,
  );
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.angle);
  ctx.fillStyle = disabled ? '#555' : '#20242e';
  ctx.fillRect(-6, -6, 16, 12);
  ctx.fillStyle = disabled ? '#333' : (cam.spotted > 0 ? '#ff4747' : '#ff5a5a');
  ctx.beginPath();
  ctx.arc(11, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = disabled ? '#888' : '#7fd4ff';
  ctx.fillText(disabled ? 'CAM OFF' : 'CAM', cam.x, cam.y + 24);
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(time * 14) * 1.5 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob);
  ctx.rotate(thief.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -0.9, 0.9);
  ctx.stroke();
  ctx.fillStyle = COLORS.thiefTrim;
  ctx.fillRect(5, -2.5, 8, 5);
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.arc(3, -4, 1.8, 0, Math.PI * 2);
  ctx.arc(3, 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Gold ring + YOU tag so the thief reads at a glance, even shrunk.
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.thiefTrim;
  ctx.fillText('YOU', thief.x, thief.y - 22);
  if (thief.hidden) {
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fe6a0';
    ctx.fillText('HIDDEN', thief.x, thief.y - 34);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = 'rgba(245, 197, 66, 0.5)';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  // Left: level name + lives.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(world.level.name, 16, 24);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#ff6b81';
  ctx.fillText('♥'.repeat(Math.max(0, world.lives)) + '♡'.repeat(Math.max(0, 3 - world.lives)), 16, 48);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`LIVES ${world.lives}/3`, 90, 46);

  // Centre: the ALARM meter — big, labelled, colour-coded.
  const mx = 430;
  const mw = 420;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('ALARM', mx, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(world.alarm)}%`, mx + mw, 20);
  ctx.fillStyle = '#1a1426';
  roundRect(ctx, mx, 28, mw, 18, 9);
  ctx.fill();
  const alarmColor = world.alarm < 35 ? COLORS.alarmLow : world.alarm < 70 ? COLORS.alarmMid : COLORS.alarmHigh;
  if (world.alarm > 1) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, mx + 2, 30, Math.max(10, (mw - 4) * (world.alarm / 100)), 14, 7);
    ctx.fill();
  }
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = world.alarm >= 70 ? '#ff8a8a' : COLORS.dim;
  ctx.textAlign = 'center';
  ctx.fillText(
    world.alarm >= 100 ? 'LOCKDOWN — EVERY GUARD IS HUNTING YOU' :
    world.alarm >= 70 ? 'ALARM HIGH — BREAK LINE OF SIGHT!' :
    world.alarm >= 35 ? 'SPOTTED — STAY OUT OF THE CONES' : 'UNSEEN — KEEP IT THAT WAY',
    mx + mw / 2, 60,
  );

  // Right: loot, tools, time.
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.loot;
  ctx.fillText(`LOOT $${world.lootValue.toLocaleString()} / $${world.quota.toLocaleString()}`, VIEW_W - 16, 24);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = world.exitOpen ? COLORS.exit : COLORS.dim;
  ctx.fillText(world.exitOpen ? 'EXIT OPEN — RUN!' : `${world.lootCount} pieces stolen`, VIEW_W - 16, 44);
  // Tool chips, right-aligned on one line under the loot.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(
    `[1] COIN${world.coinCooldown > 0 ? ' …' : ''}   [2] SMOKE ×${world.smoke}   [3] EMP ×${world.emp}`,
    VIEW_W - 16, 62,
  );
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 6, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 300 + i * 32);
  });
}

export function render(ctx, world, screen, time) {
  const { level } = world;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Floor: checker marble + rugs.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = tileAt(level, tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '#') continue;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === ',') {
        ctx.fillStyle = COLORS.marbleA;
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
      }
      if (ch === 'r') {
        ctx.fillStyle = COLORS.rug;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.rugEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
      if (ch === 'B') {
        ctx.fillStyle = COLORS.bush;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.bushEdge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Exit door and vault, under the actors.
  {
    const e = world.exit;
    ctx.fillStyle = world.exitOpen ? COLORS.exit : '#2c4a35';
    ctx.fillRect(e.x - 20, e.y - 14, 40, 28);
    ctx.strokeStyle = world.exitOpen ? '#b8ffce' : '#5a7a64';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 20, e.y - 14, 40, 28);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = world.exitOpen ? '#b8ffce' : '#9fc4a8';
    ctx.fillText(world.exitOpen ? 'EXIT ✓ OPEN' : 'EXIT — LOCKED', e.x, e.y - 20);
    const v = world.vault;
    ctx.fillStyle = COLORS.vault;
    ctx.fillRect(v.x - 19, v.y - 16, 38, 32);
    ctx.strokeStyle = COLORS.vaultGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(v.x - 19, v.y - 16, 38, 32);
    ctx.beginPath();
    ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.vaultGold;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(world.vault.open ? 'OPEN' : 'VAULT', v.x, v.y + 26);
    if (world.vaultCracking || (world.vault.progress > 0 && !world.vault.open)) {
      ctx.fillStyle = '#1a1426';
      ctx.fillRect(v.x - 19, v.y - 26, 38, 6);
      ctx.fillStyle = COLORS.vaultGold;
      ctx.fillRect(v.x - 19, v.y - 26, 38 * world.vault.progress, 6);
    }
  }

  // Walls and crates, drawn after the floor so they cast a hard edge.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = tileAt(level, tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }

  // Vision cones first (under the actors, over the floor).
  for (const cam of world.cameras) drawCamera(ctx, cam);
  for (const g of world.guards) drawGuard(ctx, g, time);

  // Loot, thief, smoke, coin, noise rings.
  for (const item of world.loot) {
    if (!item.taken) drawLoot(ctx, item, time);
  }
  for (const s of world.smokes) {
    ctx.fillStyle = 'rgba(200, 200, 210, 0.35)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 220, 230, 0.25)';
    ctx.beginPath();
    ctx.arc(s.x - 20, s.y + 10, 40, 0, Math.PI * 2);
    ctx.arc(s.x + 25, s.y - 12, 45, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.coin) {
    ctx.fillStyle = COLORS.loot;
    ctx.beginPath();
    ctx.arc(world.coin.x, world.coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const n of world.noises) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 214, 90, ${Math.max(0, 0.6 - n.r / n.max)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  drawThief(ctx, world.thief, time);

  // Alarm flash on the frame's edge when just spotted.
  if (world.spottedFlash > 0) {
    ctx.strokeStyle = `rgba(255, 71, 71, ${world.spottedFlash * 0.9})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
  }

  drawHud(ctx, world);

  if (screen.mode === 'title') {
    drawOverlay(ctx, 'THE GILDED HOUR', [
      'A heist at the Halcyon Gallery — steal the art, dodge the cones,',
      'crack the vault, and slip out before the alarm hits 100%.',
      '',
      'WASD / arrows — move    Shift — sneak    E — crack the vault',
      'Click — walk there    1 coin · 2 smoke · 3 EMP    P — pause',
      '',
      'Press ENTER or click to begin the heist.',
    ], '#f5c542');
  } else if (screen.mode === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['The gallery waits. Press P to keep stealing.'], '#f2ead8');
  } else if (screen.mode === 'caught') {
    drawOverlay(ctx, 'CAUGHT!', [
      `A guard got you. ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`,
      'Press R to try the floor again — the loot stays where it was.',
    ], '#ff4747');
  } else if (screen.mode === 'busted') {
    drawOverlay(ctx, 'BUSTED', [
      'The alarm hit 100% and the gallery locked down.',
      'Press R to start the heist over from Floor 1.',
    ], '#ff4747');
  } else if (screen.mode === 'cleared') {
    const next = world.levelIndex + 1 < 3;
    drawOverlay(ctx, next ? 'CLEAN GETAWAY!' : 'THE PERFECT HEIST!', [
      `Loot: $${world.lootValue.toLocaleString()}  ·  Ghost bonus: ${world.ghost ? 'yes (+$2,500)' : 'no'}`,
      next ? 'Press ENTER for the next floor.' : 'Every floor cleared. Press ENTER to play again.',
    ], '#37d67a');
  }
  void tileCenter;
}
