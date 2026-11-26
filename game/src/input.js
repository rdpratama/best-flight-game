// Merapi Sky Run — keyboard + mouse input. One shared input state object.

var MSR_INPUT = (function () {
  var keys = {};
  var state = {
    throttleUp: false, throttleDown: false,
    pitch: 0, roll: 0, yaw: 0,
    airbrake: false, gearToggle: false, flapsToggle: false,
    mousePitch: 0, mouseRoll: 0
  };
  var mouseActive = false;
  var lastMouseX = 0, lastMouseY = 0;
  var pressed = {}; // edge-triggered keys, consumed by the game loop

  function init(canvas) {
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      keys[e.code] = true;
      pressed[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () { keys = {}; });
    canvas.addEventListener('mousedown', function (e) {
      mouseActive = true;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
    });
    window.addEventListener('mouseup', function () { mouseActive = false; });
    window.addEventListener('mousemove', function (e) {
      if (!mouseActive) return;
      var dx = e.clientX - lastMouseX, dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
      state.mouseRoll = Math.max(-1, Math.min(1, state.mouseRoll + dx * 0.004));
      state.mousePitch = Math.max(-1, Math.min(1, state.mousePitch - dy * 0.004));
    });
  }

  function poll() {
    state.throttleUp = !!(keys.KeyW || keys.ShiftLeft || keys.ShiftRight);
    state.throttleDown = !!(keys.KeyS || keys.ControlLeft || keys.ControlRight);
    var pitchKeys = (keys.ArrowUp ? -1 : 0) + (keys.ArrowDown ? 1 : 0);
    var rollKeys = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    state.pitch = Math.max(-1, Math.min(1, pitchKeys + state.mousePitch));
    state.roll = Math.max(-1, Math.min(1, rollKeys + state.mouseRoll));
    state.yaw = (keys.KeyA ? -1 : 0) + (keys.KeyD ? 1 : 0);
    state.airbrake = !!keys.KeyB;
    // Edge-triggered toggles.
    state.gearToggle = consume('KeyG');
    state.flapsToggle = consume('KeyF');
    // Mouse stick relaxes toward centre when released.
    if (!mouseActive) {
      state.mousePitch *= 0.94;
      state.mouseRoll *= 0.94;
      if (Math.abs(state.mousePitch) < 0.02) state.mousePitch = 0;
      if (Math.abs(state.mouseRoll) < 0.02) state.mouseRoll = 0;
    }
    return state;
  }

  function consume(code) {
    if (pressed[code]) { pressed[code] = false; return true; }
    return false;
  }
  function wasPressed(code) { return consume(code); }
  function isDown(code) { return !!keys[code]; }
  function clearPressed() { pressed = {}; }

  return { init: init, poll: poll, wasPressed: wasPressed, isDown: isDown, clearPressed: clearPressed };
})();
