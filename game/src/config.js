// config.js — one clear job: every tunable number and colour of The Gilded Hour.
// The game is a top-down heist in the Halcyon Gallery: one screen per floor, no scrolling,
// so a single frame can show the thief, a guard's vision cone, a camera, loot and the alarm.
export const TILE = 40; // px per map tile
export const COLS = 32; // map is 32 x 18 tiles = 1280 x 720, exactly the canvas
export const ROWS = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64; // translucent bar across the top of the canvas

export const THIEF_SPEED = 150; // px per second, walking
export const THIEF_SNEAK = 85; // px per second, sneaking (quiet, harder to spot)
export const GUARD_SPEED = 95;
export const GUARD_CHASE_SPEED = 165;
export const GUARD_FOV = 0.62; // radians, half-angle of a guard's vision cone
export const GUARD_RANGE = 205; // px, how far a guard can see
export const CAMERA_RANGE = 235;
export const CAMERA_FOV = 0.5;
export const DETECT_RATE = 1.5; // detection meter per second, point blank
export const DETECT_SNEAK = 0.45; // multiplier while the thief sneaks
export const ALARM_ON_SPOT = 22; // alarm added the moment a guard fully spots you
export const ALARM_DECAY = 2.5; // alarm per second while nobody sees you
export const ALARM_CAMERA_SPOT = 16;
export const NOISE_RUN_RADIUS = 130; // px, guards hear running feet this far
export const NOISE_COIN_RADIUS = 260; // px, a thrown coin rings this far
export const CATCH_DIST = 20; // px, a chasing guard this close catches the thief
export const VAULT_CRACK_TIME = 3.0; // seconds holding E beside the vault
export const SMOKE_TIME = 6; // seconds a smoke cloud blocks vision
export const EMP_TIME = 7; // seconds cameras stay dark after an EMP
export const COIN_COOLDOWN = 2.0;

export const COLORS = {
  floorA: '#2a2438',
  floorB: '#241f30',
  marbleA: '#3a324e',
  marbleB: '#332c44',
  rug: '#5b2333',
  rugEdge: '#8a6d3b',
  wall: '#241a35',
  wallTop: '#5a4d85',
  crate: '#6b4f2a',
  crateEdge: '#8a6d3b',
  bush: '#1e4d2e',
  bushEdge: '#2f7a44',
  thief: '#1c1c22',
  thiefTrim: '#f5c542',
  guard: '#2b3a67',
  guardTrim: '#7fa8ff',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  coneAlert: 'rgba(255, 70, 70, 0.30)',
  camCone: 'rgba(90, 200, 255, 0.16)',
  camConeEdge: 'rgba(90, 200, 255, 0.5)',
  loot: '#ffd94a',
  lootGem: '#7fe7ff',
  vault: '#4a4a55',
  vaultGold: '#f5c542',
  exit: '#37d67a',
  alarmLow: '#37d67a',
  alarmMid: '#f5a542',
  alarmHigh: '#ff4747',
  hudBg: 'rgba(10, 8, 18, 0.82)',
  text: '#f2ead8',
  dim: '#a99ec2',
};
