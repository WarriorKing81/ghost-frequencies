import { GHOSTS } from '../data/ghosts.js';

const STORAGE_KEY = 'ghost-frequency-collection';

export class GhostCollection {
  constructor() {
    this.captured = [];
    this.activeBonus = null;
    this._load();
  }

  capture(ghostId) {
    if (this.has(ghostId)) return null;
    const ghost = GHOSTS[ghostId];
    if (!ghost) return null;
    this.captured.push({ ...ghost, capturedAt: Date.now() });
    this._save();
    return ghost;
  }

  has(ghostId) {
    return this.captured.some(g => g.id === ghostId);
  }

  getAll() {
    return this.captured;
  }

  count() {
    return this.captured.length;
  }

  setActiveBonus(ghostId) {
    const ghost = this.captured.find(g => g.id === ghostId);
    this.activeBonus = ghost || null;
  }

  getActiveBonus() {
    return this.activeBonus;
  }

  applyBonus(puzzleConfig) {
    if (!this.activeBonus) return puzzleConfig;
    const config = { ...puzzleConfig };

    switch (this.activeBonus.bonusType) {
      case 'wider-band':
        config.tolerance = (config.tolerance || 0.3) * this.activeBonus.bonusValue;
        config.bandwidth = (config.bandwidth || 5.0) * this.activeBonus.bonusValue;
        break;
      case 'static-filter':
        config.staticReduction = this.activeBonus.bonusValue;
        break;
      case 'whisper-hint':
        config.enableHints = true;
        break;
    }
    return config;
  }

  reset() {
    this.captured = [];
    this.activeBonus = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.captured));
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) this.captured = JSON.parse(data);
    } catch {
      this.captured = [];
    }
  }
}
