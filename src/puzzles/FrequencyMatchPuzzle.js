export class FrequencyMatchPuzzle {
  constructor(config) {
    this.config = config;
    this.holdTimer = 0;
    this.solved = false;
    this.firstApproach = false;
  }

  update(dt, proximity) {
    if (this.solved) return;

    // Track first time player gets close (for horror sting trigger)
    if (!this.firstApproach && proximity > 0.8) {
      this.firstApproach = true;
    }

    // Check if within capture tolerance
    const tolerance = this.config.tolerance || 0.3;
    const inRange = proximity > (1 - tolerance);

    if (inRange) {
      this.holdTimer += dt;
      if (this.holdTimer >= (this.config.holdTime || 3.0)) {
        this.solved = true;
      }
    } else {
      // Reset timer if player drifts off
      this.holdTimer = Math.max(0, this.holdTimer - dt * 2);
    }
  }

  getCaptureProgress() {
    return Math.min(1, this.holdTimer / (this.config.holdTime || 3.0));
  }

  isSolved() {
    return this.solved;
  }

  isFirstApproach() {
    return this.firstApproach;
  }

  reset() {
    this.holdTimer = 0;
    this.solved = false;
    this.firstApproach = false;
  }
}
