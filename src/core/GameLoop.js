const TICK_RATE = 60;
const TIME_STEP = 1000 / TICK_RATE;
const MAX_FRAME_TIME = 250;

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.update = updateFn;
    this.render = renderFn;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.frameId = null;

    this._frame = this._frame.bind(this);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (this.running) {
        this.resume();
      }
    });
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this._frame);
  }

  pause() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  resume() {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameId = requestAnimationFrame(this._frame);
  }

  _frame(currentTime) {
    let delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    delta = Math.min(delta, MAX_FRAME_TIME);
    this.accumulator += delta;

    while (this.accumulator >= TIME_STEP) {
      this.update(TIME_STEP / 1000);
      this.accumulator -= TIME_STEP;
    }

    const alpha = this.accumulator / TIME_STEP;
    this.render(alpha);

    this.frameId = requestAnimationFrame(this._frame);
  }
}
