import { FrequencyMatchPuzzle } from '../puzzles/FrequencyMatchPuzzle.js';
import { MessageDecodePuzzle } from '../puzzles/MessageDecodePuzzle.js';
import { eventBus } from '../core/EventBus.js';

export class PuzzleRunner {
  constructor() {
    this.activePuzzle = null;
    this.puzzleConfig = null;
  }

  loadPuzzle(config) {
    this.puzzleConfig = config;

    switch (config.type) {
      case 'frequency-match':
        this.activePuzzle = new FrequencyMatchPuzzle(config);
        break;
      case 'message-decode':
        this.activePuzzle = new MessageDecodePuzzle(config);
        break;
      default:
        console.warn('Unknown puzzle type:', config.type);
        this.activePuzzle = null;
    }
  }

  update(dt, proximity, decodeInput) {
    if (!this.activePuzzle) return;

    const wasSolved = this.activePuzzle.isSolved();

    // MessageDecodePuzzle takes decode input; FrequencyMatchPuzzle ignores it
    if (this.activePuzzle instanceof MessageDecodePuzzle) {
      this.activePuzzle.update(dt, proximity, decodeInput);
    } else {
      this.activePuzzle.update(dt, proximity);
    }

    if (!wasSolved && this.activePuzzle.isSolved()) {
      eventBus.emit('puzzle:solved', {
        config: this.puzzleConfig,
      });
    }

    // First approach event (for horror sting)
    if (this.activePuzzle.isFirstApproach && this.activePuzzle.isFirstApproach()) {
      if (!this._firstApproachEmitted) {
        this._firstApproachEmitted = true;
        eventBus.emit('puzzle:firstApproach', {
          config: this.puzzleConfig,
        });
      }
    }
  }

  getCaptureProgress() {
    if (!this.activePuzzle) return 0;
    return this.activePuzzle.getCaptureProgress();
  }

  getDecodeInfo() {
    if (this.activePuzzle instanceof MessageDecodePuzzle) {
      return {
        value: this.activePuzzle.getDecodeValue(),
        proximity: this.activePuzzle.getDecodeProximity(),
      };
    }
    return null;
  }

  isDecodePuzzle() {
    return this.activePuzzle instanceof MessageDecodePuzzle;
  }

  isSolved() {
    return this.activePuzzle && this.activePuzzle.isSolved();
  }

  clear() {
    this.activePuzzle = null;
    this.puzzleConfig = null;
    this._firstApproachEmitted = false;
  }
}
