// input.js — keyboard + mouse input for SOL BAY.
// Pointer lock is OPTIONAL: if it fails or is refused, mouse-drag rotates
// the camera instead, so the game is fully playable without pointer lock.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    yawDelta: 0,
    pitchDelta: 0,
    mouseDown: false,
    clicked: false, // consumed by combat each frame
    pointerLocked: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  const keyName = (e) => (e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.code);

  window.addEventListener('keydown', (e) => {
    // BUG FIX (dealer repeat-buy): ignore OS key auto-repeat. Without this,
    // holding B re-adds 'b' to the Set after main.js deletes it, so buyCar()
    // fired every repeat tick. A held key must never re-trigger an action.
    if (e.repeat) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    input.keys.add(keyName(e));
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
    input.keys.delete(e.code);
  });
  window.addEventListener('blur', () => input.keys.clear());

  // Mouse: pointer lock when available, drag fallback always works.
  canvas.addEventListener('click', () => {
    if (!input.pointerLocked) {
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => { /* drag fallback stays active */ });
      } catch (err) { /* drag fallback stays active */ }
    }
  });
  document.addEventListener('pointerlockchange', () => {
    input.pointerLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener('pointerlockerror', () => { input.pointerLocked = false; });
  document.addEventListener('mousemove', (e) => {
    if (input.pointerLocked) {
      input.yawDelta -= e.movementX * 0.0026;
      input.pitchDelta -= e.movementY * 0.0022;
    } else if (input.dragging) {
      input.yawDelta -= (e.clientX - input.lastX) * 0.005;
      input.pitchDelta -= (e.clientY - input.lastY) * 0.004;
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.downX = e.clientX; input.downY = e.clientY; input.downTime = Date.now();
    if (!input.pointerLocked) {
      input.dragging = true;
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    }
  });
  window.addEventListener('mouseup', (e) => {
    // A short click with almost no drag counts as a shot; a drag rotates the camera.
    if (input.mouseDown && Math.hypot(e.clientX - (input.downX || 0), e.clientY - (input.downY || 0)) < 6) {
      input.clicked = true;
    }
    input.mouseDown = false; input.dragging = false;
  });

  input.isDown = (name) => input.keys.has(name) || input.keys.has('Key' + name.toUpperCase());
  input.consumeClick = () => { const c = input.clicked; input.clicked = false; return c; };
  input.consumeLook = () => {
    const d = { yaw: input.yawDelta, pitch: input.pitchDelta };
    input.yawDelta = 0; input.pitchDelta = 0;
    return d;
  };
  input.releasePointerLock = () => { if (document.pointerLockElement) document.exitPointerLock(); };
  return input;
}
