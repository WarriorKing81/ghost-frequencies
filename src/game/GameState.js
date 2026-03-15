export class GameState {
  constructor() {
    this.currentLevel = 0;
    this.isPaused = false;
    this.isTransitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 0;
    this.phase = 'menu'; // menu, intro, playing, casefile, captured, transition, end
  }

  setPhase(phase) {
    this.phase = phase;
  }

  startTransition(duration, callback) {
    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.transitionDuration = duration;
    this._transitionCallback = callback;
    this.phase = 'transition';
  }

  update(dt) {
    if (this.isTransitioning) {
      this.transitionTimer += dt;
      if (this.transitionTimer >= this.transitionDuration) {
        this.isTransitioning = false;
        if (this._transitionCallback) {
          this._transitionCallback();
          this._transitionCallback = null;
        }
      }
    }
  }

  getTransitionProgress() {
    if (!this.isTransitioning) return 0;
    return this.transitionTimer / this.transitionDuration;
  }
}
