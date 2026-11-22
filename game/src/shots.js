// shots.js — one clear job: the staged scenes behind `?shot=`.
// Screenshots must be real renders of the game's own code, so each scene
// builds a real world, puts its actors where the shot needs them, and lets
// the normal update + render loop run. Nothing here draws anything itself.
//   ?shot=start  — the title screen over Floor 1.
//   ?shot=play   — the COVER: thief mid-room, a guard's cone sweeping onto
//                  him, a camera cone crossing the floor, loot glowing,
//                  the vault ahead and the alarm meter at 38%.
//   ?shot=alert  — a guard mid-chase, alarm at 71%, thief sprinting for cover.
//   ?shot=win    — the getaway: exit open, loot done, alarm fading.
import { createWorld, updateWorld } from './world.js';
import { tileCenter } from './world.js';
import { mulberry32 } from './random.js';
import { TILE } from './config.js';

function settle(world, seconds, input, audio) {
  // Run the world forward in fixed steps so patrols and cameras are mid-sweep.
  const step = 1 / 60;
  const quiet = { ...input, moveX: 0, moveY: 0, sneak: false, interactHeld: false, click: null, useTool: false, toolKey: 0 };
  for (let t = 0; t < seconds; t += step) updateWorld(world, quiet, step, audio);
}

export function applyShot(world, shot, seed, input, audio) {
  const rng = mulberry32(seed);
  void rng;
  if (shot === 'play') {
    // Cover frame: thief crossing the big hall, guard cone on him, camera
    // sweeping across, loot ahead, alarm already warm.
    world.thief.x = 15 * TILE + 20;
    world.thief.y = 11 * TILE + 20;
    world.thief.angle = Math.PI / 2;
    world.alarm = 38;
    world.lootValue = 7500; // painting $2,500 + diamond $5,000, both taken
    world.lootCount = 2;
    world.loot[0].taken = true; // painting, top-left room
    world.loot[1].taken = true; // diamond, top-middle room
    const guard = world.guards[3]; // the hall guard
    guard.x = 19 * TILE + 20;
    guard.y = 12 * TILE + 20;
    guard.angle = Math.PI; // facing the thief, cone on him
    guard.state = 'patrol';
    guard.detect = 0.55;
    const other = world.guards[1];
    other.x = 19 * TILE + 20;
    other.y = 4 * TILE + 20;
    other.angle = Math.PI / 2;
    settle(world, 0.4, input, audio);
    world.alarm = 38; // settle() decays it; pin it back for the shot
    guard.detect = 0.55;
  } else if (shot === 'alert') {
    // Chase frame: thief caught in the open, guard closing in, alarm high.
    world.thief.x = 10 * TILE + 20;
    world.thief.y = 10 * TILE + 20;
    world.thief.angle = 0;
    world.alarm = 71;
    world.lootValue = 10000; // painting + diamond + painting
    world.lootCount = 3;
    world.loot[0].taken = true;
    world.loot[1].taken = true;
    world.loot[3].taken = true;
    const guard = world.guards[3];
    guard.x = 7 * TILE + 20;
    guard.y = 10 * TILE + 20;
    guard.angle = 0;
    guard.state = 'chase';
    guard.detect = 1;
    guard.lastSeen = { x: world.thief.x, y: world.thief.y };
    world.spottedFlash = 0.7;
    settle(world, 0.25, input, audio);
    world.alarm = 71;
    guard.state = 'chase';
    guard.detect = 1;
  } else if (shot === 'win') {
    // Getaway frame: quota met, vault cracked, exit open, thief at the door.
    world.lootValue = 28000; // every piece on Floor 1 + the vault
    world.lootCount = 9;
    for (const item of world.loot) item.taken = true;
    world.vault.open = true;
    world.exitOpen = true;
    world.alarm = 12;
    world.thief.x = world.exit.x;
    world.thief.y = world.exit.y - 46;
    world.thief.angle = Math.PI / 2;
    const guard = world.guards[3];
    guard.x = 20 * TILE + 20;
    guard.y = 12 * TILE + 20;
    guard.angle = -Math.PI / 2;
    settle(world, 0.5, input, audio);
    world.alarm = 12;
    world.exitOpen = true;
  }
  // 'start' needs no staging: the title screen draws over the fresh world.
  void tileCenter;
  void createWorld;
}
