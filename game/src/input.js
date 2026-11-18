// VELMARA HEAT — keyboard and mouse input. Tracks held keys, presses that
// happened this frame, and mouse-drag look deltas. The main loop calls
// endFrame() once per frame to clear the per-frame presses.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let lookX = 0;
  let lookY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let clicked = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    pressed.add(event.code);
    if (event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onMouseDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    clicked = true;
  }
  function onMouseMove(event) {
    if (!dragging) return;
    lookX += event.clientX - lastX;
    lookY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onMouseUp() {
    dragging = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    isHeld(code) {
      return held.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    // Mark a press handled so a later fixed step in the same frame does not
    // see it again (entering a car and stepping straight back out).
    consume(code) {
      pressed.delete(code);
    },
    // True when the left mouse button went down this frame.
    wasClicked() {
      return clicked;
    },
    // Accumulated drag deltas since the last frame, in pixels.
    takeLook() {
      const out = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return out;
    },
    // Forward axis: W/S or arrows, -1..1. Strafe axis: A/D, -1..1.
    axes() {
      const f = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      const s = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      return { forward: f, strafe: s };
    },
    sprinting() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    endFrame() {
      pressed.clear();
      clicked = false;
    },
  };
}
