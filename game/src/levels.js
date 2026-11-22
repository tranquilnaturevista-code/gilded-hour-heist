// levels.js — one clear job: the three floors of the Halcyon Gallery.
// Map legend: '#' wall, '.' floor, 'r' rug, 'C' crate (blocks move + sight),
// 'B' plant (hides the thief, blocks sight), 'T' thief start, 'E' exit,
// 'V' vault, 'd' diamond $5000, 'p' painting $2500, 'g' gold $1500.
// Guards and cameras live in data (tile coords), never in the map text, so a
// patrol route is always a straight walkable line between its waypoints.
export const LOOT_VALUE = { d: 5000, p: 2500, g: 1500 };
export const LOOT_NAME = { d: 'Diamond', p: 'Painting', g: 'Gold bars' };
export const VAULT_VALUE = 6000;

export const LEVELS = [
  {
    name: 'Floor 1 — The Halcyon Gallery',
    sub: 'Steal $9,000 of art, crack the vault if you dare, slip out the south door.',
    quota: 9000,
    map: [
      '################################',
      '#......rr......#........#......#',
      '#.T....rr..p...#...d....#..g...#',
      '#......rr......#........#......#',
      '#..C...rr..C...#....C...#...C..#',
      '#......rr......#........#......#',
      '#......rr......#........#......#',
      '#......rr......#........#......#',
      '###.######.########.######.#####',
      '#..............................#',
      '#.p....C.......B......C....p...#',
      '#..............................#',
      '#..C..........C........C.......#',
      '#..............................#',
      '#.g.....rr.......rr.......g....#',
      '#..C....rr...V...rr...C...d....#',
      '#.......rr.......rr............#',
      '##########.E.###################',
    ],
    guards: [
      { waypoints: [[3, 3], [11, 3]] },
      { waypoints: [[19, 2], [19, 6]] },
      { waypoints: [[26, 2], [26, 6]] },
      { waypoints: [[16, 12], [22, 12]] },
    ],
    cameras: [
      { x: 15, y: 9, angle: Math.PI / 2, sweep: 0.7 },
      { x: 30, y: 13, angle: Math.PI, sweep: 0.6 },
    ],
  },
  {
    name: 'Floor 2 — The Vault Floor',
    sub: 'More guards, more cameras, tighter rooms. The vault floor pays $14,000.',
    quota: 14000,
    map: [
      '################################',
      '#..d...#.....rr.....#.....g....#',
      '#......#.....rr.....#..........#',
      '#..C...#..T..rr..C..#....C.....#',
      '#......#.....rr.....#..........#',
      '#......#.....rr.....#.....p....#',
      '###.####.######.#####.####.#####',
      '#........C..........C..........#',
      '#..p..........B.........g......#',
      '#..............................#',
      '#....C.......rr......C....C....#',
      '#...........rr......d..........#',
      '####.########.######.#####.#####',
      '#......#.....V......#.....C....#',
      '#..C...#...........#...g.......#',
      '#......#....C.....#............#',
      '#..p...#..........#.....C......#',
      '##########.E.###################',
    ],
    guards: [
      { waypoints: [[5, 2], [5, 5]] },
      { waypoints: [[16, 1], [16, 5]] },
      { waypoints: [[24, 2], [28, 2]] },
      { waypoints: [[8, 9], [20, 9]] },
      { waypoints: [[24, 13], [24, 15]] },
    ],
    cameras: [
      { x: 15, y: 7, angle: Math.PI / 2, sweep: 0.8 },
      { x: 30, y: 10, angle: Math.PI, sweep: 0.6 },
      { x: 1, y: 13, angle: 0, sweep: 0.6 },
    ],
  },
  {
    name: 'Floor 3 — The Director\u2019s Wing',
    sub: 'The director keeps the best pieces upstairs. $18,000 and the whole wing watches.',
    quota: 18000,
    map: [
      '################################',
      '#.d....#....rr....#....g.......#',
      '#......#....rr....#............#',
      '#..T...#..C..rr..C.#.....C.....#',
      '#......#....rr....#............#',
      '#..p...#....rr....#....p.......#',
      '###.####.######.######.####.####',
      '#.....C.....B......C......C....#',
      '#..g..........C..........d.....#',
      '#..............................#',
      '#...C......rr.....C........C...#',
      '#.........rr......p............#',
      '####.#######.########.#####.####',
      '#....#....V.....#....g.........#',
      '#....#..........#..............#',
      '#..C.#....C.....#....C.........#',
      '#..p.#..........#......d.......#',
      '##########.E.###################',
    ],
    guards: [
      { waypoints: [[3, 2], [3, 5]] },
      { waypoints: [[15, 1], [15, 5]] },
      { waypoints: [[24, 2], [28, 2]] },
      { waypoints: [[5, 8], [13, 8]] },
      { waypoints: [[12, 13], [15, 13]] },
      { waypoints: [[24, 14], [28, 14]] },
    ],
    cameras: [
      { x: 15, y: 7, angle: Math.PI / 2, sweep: 0.8 },
      { x: 30, y: 10, angle: Math.PI, sweep: 0.6 },
      { x: 1, y: 13, angle: 0, sweep: 0.6 },
      { x: 16, y: 9, angle: -Math.PI / 2, sweep: 0.7 },
    ],
  },
];

// Validate a level's map at load: 18 rows, 32 columns, one thief, one exit,
// one vault, and every guard waypoint on a walkable tile.
export function validateLevel(level) {
  const errors = [];
  if (level.map.length !== 18) errors.push(`map has ${level.map.length} rows, want 18`);
  level.map.forEach((row, y) => {
    if (row.length !== 32) errors.push(`row ${y} has ${row.length} chars, want 32`);
  });
  const count = (ch) => level.map.join('').split('').filter((c) => c === ch).length;
  if (count('T') !== 1) errors.push(`want 1 thief start, found ${count('T')}`);
  if (count('E') !== 1) errors.push(`want 1 exit, found ${count('E')}`);
  if (count('V') !== 1) errors.push(`want 1 vault, found ${count('V')}`);
  const walkable = (tx, ty) => {
    const c = level.map[ty] && level.map[ty][tx];
    return c !== undefined && c !== '#' && c !== 'C';
  };
  level.guards.forEach((g, i) => {
    g.waypoints.forEach(([tx, ty]) => {
      if (!walkable(tx, ty)) errors.push(`guard ${i} waypoint (${tx},${ty}) is not walkable`);
    });
  });
  return errors;
}
