// input.js — one clear job: keyboard + mouse, nothing else.
// WASD / arrows move, Shift sneaks, E grabs / cracks, 1-2-3 use tools,
// Space uses the selected tool, click walks to a spot (or taps a HUD button),
// P pauses, M mutes, R restarts after a bust, Enter starts.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    moveX: 0,
    moveY: 0,
    sneak: false,
    interactHeld: false,
    click: null, // { x, y } in canvas pixels, consumed by the game loop
    toolKey: 0, // 1 = coin, 2 = smoke, 3 = emp, set by a keypress
    useTool: false, // Space pressed: use the selected tool
    pressed: new Set(), // edge-triggered keys, consumed by the game loop
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function updateMove() {
    let x = 0;
    let y = 0;
    if (keys.has('left')) x -= 1;
    if (keys.has('right')) x += 1;
    if (keys.has('up')) y -= 1;
    if (keys.has('down')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    state.moveX = x;
    state.moveY = y;
    state.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.interactHeld = keys.has('KeyE');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    const dir = KEYMAP[event.code];
    if (dir) keys.add(dir);
    if (event.code === 'Digit1') state.toolKey = 1;
    if (event.code === 'Digit2') state.toolKey = 2;
    if (event.code === 'Digit3') state.toolKey = 3;
    if (event.code === 'Space') state.useTool = true;
    state.pressed.add(event.code);
    updateMove();
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    const dir = KEYMAP[event.code];
    if (dir) keys.delete(dir);
    updateMove();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    updateMove();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    state.click = { x, y };
  });

  return state;
}
