export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.keysJustPressed = {};
    this.dialDelta = 0;
    this.touchStartX = null;
    this.mouseDown = false;
    this.lastMouseX = null;

    // When true, keyboard game controls are disabled (player is typing)
    this.textInputActive = false;

    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Don't capture game keys while typing in the text input
      if (this.textInputActive) return;

      if (!this.keys[e.code]) {
        this.keysJustPressed[e.code] = true;
      }
      this.keys[e.code] = true;

      // Prevent default for game keys
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (this.textInputActive) return;
      this.keys[e.code] = false;
    });

    // Mouse drag
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.lastMouseX = e.clientX;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown && this.lastMouseX !== null) {
        this.dialDelta += (e.clientX - this.lastMouseX) * 0.01;
        this.lastMouseX = e.clientX;
      }
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.lastMouseX = null;
    });

    // Scroll wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dialDelta += e.deltaY * -0.005;
    }, { passive: false });

    // Touch drag
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchStartX = e.touches[0].clientX;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.touchStartX !== null) {
        const x = e.touches[0].clientX;
        this.dialDelta += (x - this.touchStartX) * 0.015;
        this.touchStartX = x;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
      this.touchStartX = null;
    });
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  wasJustPressed(code) {
    return !!this.keysJustPressed[code];
  }

  clearJustPressed() {
    this.keysJustPressed = {};
  }

  consumeDialDelta() {
    if (this.keys['ArrowRight']) this.dialDelta += 0.02;
    if (this.keys['ArrowLeft']) this.dialDelta -= 0.02;

    const delta = this.dialDelta;
    this.dialDelta = 0;
    return delta;
  }

  getDecodeInput() {
    let delta = 0;
    if (this.keys['ArrowUp']) delta += 15;
    if (this.keys['ArrowDown']) delta -= 15;
    return delta;
  }
}
