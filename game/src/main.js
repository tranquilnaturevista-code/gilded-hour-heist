// main.js — one clear job: the game loop and the screen state machine.
// title -> playing -> paused / caught / cleared / busted, across 3 floors.
// `?shot=start|play|alert|win&seed=N` stages a deterministic scene for the
// screenshots and renders it without waiting for a keypress.
import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, updateWorld, scoreWorld } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';
import { mulberry32 } from './random.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1');

const screen = { mode: 'title' }; // title | playing | paused | caught | cleared | busted
let world = createWorld(0, mulberry32(seed));
let totalScore = 0;
let last = performance.now();
let time = 0;

function startFloor(index, keepScore) {
  world = createWorld(index, mulberry32(seed + index));
  if (!keepScore) totalScore = 0;
  screen.mode = 'playing';
  audio.unlock();
  audio.startMusic();
}

function restartFloor() {
  // A caught thief keeps what he already stole on this floor — the run
  // continues, only the alarm and the guards reset. Loot order is
  // deterministic, so the taken flags copy across by index.
  const old = world;
  world = createWorld(world.levelIndex, mulberry32(seed + world.levelIndex));
  world.lootValue = old.lootValue;
  world.lootCount = old.lootCount;
  world.lives = old.lives;
  world.time = old.time;
  world.vault.open = old.vault.open;
  old.loot.forEach((item, i) => { world.loot[i].taken = item.taken; });
  screen.mode = 'playing';
  audio.startMusic();
}

function advance() {
  if (!world.scored) {
    totalScore += scoreWorld(world);
    world.scored = true;
  }
  if (world.levelIndex + 1 < 3) {
    startFloor(world.levelIndex + 1, true);
  } else {
    screen.mode = 'cleared';
  }
}

function handleKeys() {
  for (const code of input.pressed) {
    if (code === 'Enter') {
      if (screen.mode === 'title') {
        startFloor(0, false);
        audio.click();
      } else if (screen.mode === 'cleared') {
        if (world.levelIndex + 1 < 3) advance();
        else startFloor(0, false);
      }
    }
    if (code === 'KeyR') {
      if (screen.mode === 'caught') restartFloor();
      else if (screen.mode === 'busted') startFloor(0, false);
    }
    if (code === 'KeyP' && (screen.mode === 'playing' || screen.mode === 'paused')) {
      screen.mode = screen.mode === 'playing' ? 'paused' : 'playing';
    }
    if (code === 'KeyM') {
      const muted = audio.toggleMute();
      if (!muted && screen.mode === 'playing') audio.startMusic();
    }
  }
  input.pressed.clear();
  if (screen.mode === 'title' && input.click) {
    input.click = null;
    startFloor(0, false);
  }
  if (screen.mode === 'cleared' && input.click) {
    input.click = null;
    if (world.levelIndex + 1 < 3) advance();
    else startFloor(0, false);
  }
  if ((screen.mode === 'caught' || screen.mode === 'busted') && input.click) {
    input.click = null;
    if (screen.mode === 'caught') restartFloor();
    else startFloor(0, false);
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  handleKeys();
  if (screen.mode === 'playing') {
    updateWorld(world, input, dt, audio);
    if (world.status === 'caught') screen.mode = 'caught';
    else if (world.status === 'busted') screen.mode = 'busted';
    else if (world.status === 'cleared') screen.mode = 'cleared';
  } else if (screen.mode === 'cleared' || screen.mode === 'caught' || screen.mode === 'busted') {
    world.statusTimer += dt;
  }
  render(ctx, world, screen, time);
  requestAnimationFrame(frame);
}

// Screenshot mode: stage the scene, then render it live (no keypress needed).
if (shot) {
  screen.mode = 'playing';
  applyShot(world, shot, seed, input, audio);
  if (shot === 'win') screen.mode = 'playing';
  if (shot === 'start') screen.mode = 'title';
  document.title = `The Gilded Hour — shot ${shot}`;
}
requestAnimationFrame(frame);
