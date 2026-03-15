export class MessageDecodePuzzle {
  constructor(config) {
    this.config = config;
    this.holdTimer = 0;
    this.solved = false;
    this.firstApproach = false;

    // Decode filter — second parameter the player must find
    this.decodeValue = 1200; // starting decode filter position (Hz)
    this.decodeTarget = config.decodeFilterTarget || 2400;
    this.decodeTolerance = config.decodeFilterTolerance || 200;
    this.decodeProximity = 0;
  }

  update(dt, proximity, decodeInput) {
    if (this.solved) return;

    // Track first approach
    if (!this.firstApproach && proximity > 0.8) {
      this.firstApproach = true;
    }

    // Update decode filter from up/down input
    if (decodeInput) {
      this.decodeValue = Math.max(200, Math.min(4000, this.decodeValue + decodeInput));
    }

    // Calculate decode proximity
    const decodeDist = Math.abs(this.decodeValue - this.decodeTarget);
    this.decodeProximity = Math.max(0, 1 - decodeDist / this.decodeTolerance);

    // Both frequency AND decode must be in range
    const freqTolerance = this.config.tolerance || 0.4;
    const freqInRange = proximity > (1 - freqTolerance);
    const decodeInRange = this.decodeProximity > 0.7;

    if (freqInRange && decodeInRange) {
      this.holdTimer += dt;
      if (this.holdTimer >= (this.config.holdTime || 2.0)) {
        this.solved = true;
      }
    } else {
      this.holdTimer = Math.max(0, this.holdTimer - dt * 2);
    }
  }

  getCaptureProgress() {
    return Math.min(1, this.holdTimer / (this.config.holdTime || 2.0));
  }

  getDecodeValue() {
    return this.decodeValue;
  }

  getDecodeProximity() {
    return this.decodeProximity;
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
    this.decodeValue = 1200;
    this.decodeProximity = 0;
  }
}
