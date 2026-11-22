[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/tranquilnaturevista-code/gilded-hour-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/tranquilnaturevista-code/gilded-hour-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# The Gilded Hour — a heist game

One night, one gallery, one getaway car. Sneak through the Halcyon Gallery
past patrolling guards and sweeping CCTV cameras, steal the art, crack the
vault, and slip out the south door before the alarm meter hits 100%.

**Entry for the [make.fun bounty "Make the best heist game"](https://make.fun/bounty/best-heist-game-20261122-0559)** ($50, 10 places, closes 2026-11-22 17:59 UTC).

## How to play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open http://localhost:8080). No network, no install, no build step.

- **Move:** WASD or arrow keys — or click anywhere to walk there.
- **Sneak:** hold Shift — slower and quieter, and much harder for guards to spot.
- **Goal:** steal loot up to the floor's quota ($9,000 / $14,000 / $18,000). The exit opens only once the quota is met; reach it to clear the floor.
- **Guards** patrol fixed routes and watch with vision cones. Crates and walls block their sight; plants hide you inside them (unless a guard gets very close). Running makes noise they can hear — a guard that hears footsteps comes to look.
- **Cameras** sweep back and forth. Being fully seen by one raises the alarm and sends nearby guards to investigate.
- **Alarm meter:** climbs while anyone sees you, falls while you stay hidden. At 100% the gallery locks down and every guard hunts you.
- **Spotted:** the ring above a guard fills while he sees you. Fill it and he gives chase. Break line of sight and stay hidden until he gives up.
- **Caught:** a chasing guard that reaches you costs a life. You have 3.
- **Vault:** stand beside it and hold E to crack it (3 seconds) — $6,000 inside.
- **Tools:** `1` throws a coin to distract guards, `2` drops a smoke cloud, `3` fires an EMP that blinds the cameras. `P` pauses, `M` mutes.

Three floors — **The Halcyon Gallery**, **The Vault Floor**, **The Director's Wing** — each with more guards, more cameras, and tighter patrols. Finish a floor fast and without ever raising the alarm for time and ghost bonuses.

## Files

- `game/` — the playable game: `index.html` plus its ES modules under `game/src/` (no libraries, no network requests).
  - `config.js` — every tunable number and colour.
  - `random.js` — the seeded RNG (deterministic scenes).
  - `levels.js` — the three floors: maps, guard patrols, cameras.
  - `world.js` — the rules: movement and collision, guard patrol / investigate / chase, vision cones with line of sight, cameras, alarm, loot, vault, tools, lives and score.
  - `render.js` — everything drawn on one canvas, including the HUD alarm meter.
  - `input.js` — keyboard + mouse.
  - `audio.js` — all sound, synthesized with WebAudio, no files.
  - `shots.js` — the staged screenshot scenes (real play states, steered by `?shot=`).
  - `main.js` — the game loop and the screen state machine.
- `screenshots/` — 4 real renders of the game's own code (`shots.json` lists the `?shot=` scene behind each one; the first by name is the cover).
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
