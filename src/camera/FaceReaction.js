import { eventBus } from '../core/EventBus.js';

/**
 * FaceReaction — detects player reactions using canvas pixel analysis.
 *
 * No ML libraries needed. Uses frame differencing and brightness analysis
 * on a tiny downscaled canvas to detect:
 *
 *  - FLINCH:     Sudden large motion spike (player jumped/startled)
 *  - LOOK AWAY:  Face region loses skin-tone pixels (player turned away)
 *  - COVER:      Center brightness drops sharply (hands over face/camera)
 *
 * Events emitted:
 *  - 'reaction:flinch'    { intensity: 0-1 }
 *  - 'reaction:lookaway'  {}
 *  - 'reaction:return'    {} (player looked back)
 *  - 'reaction:cover'     {}
 */
export class FaceReaction {
  constructor(lightSensor) {
    this.lightSensor = lightSensor;

    // Downscaled analysis canvas (tiny for speed)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 48;
    this.canvas.height = 36;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Previous frame data for motion detection
    this.prevFrame = null;

    // State
    this.active = false;
    this.sampleTimer = 0;
    this.sampleInterval = 0.15; // ~7 FPS analysis

    // Motion detection
    this.motionLevel = 0;         // current frame-diff (0-1)
    this.motionBaseline = 0;      // running average of normal motion
    this.flinchThreshold = 0.12;  // spike above baseline to count as flinch
    this.flinchCooldown = 0;      // prevent rapid re-triggers

    // Face presence detection
    this.skinPixelRatio = 0;      // ratio of skin-tone pixels in center
    this.facePresent = true;
    this.faceGoneTimer = 0;       // how long face has been absent
    this.faceGoneThreshold = 1.0; // seconds before emitting lookaway

    // Cover detection
    this.centerBrightness = 128;
    this.brightnessBaseline = 128;
    this.coverThreshold = 0.4;    // brightness drop ratio to detect cover
    this.coverActive = false;
  }

  init() {
    this.active = this.lightSensor && this.lightSensor.active;
  }

  update(dt) {
    // Re-check if camera became active
    if (!this.active && this.lightSensor && this.lightSensor.active) {
      this.active = true;
    }
    if (!this.active) return;

    // Cooldown timers
    if (this.flinchCooldown > 0) this.flinchCooldown -= dt;

    this.sampleTimer += dt;
    if (this.sampleTimer < this.sampleInterval) return;
    this.sampleTimer = 0;

    this._analyze();
  }

  _analyze() {
    const video = this.lightSensor.video;
    if (!video || video.readyState < 2) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw current frame
    this.ctx.drawImage(video, 0, 0, w, h);
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // ── MOTION DETECTION (frame differencing) ────────────────
    if (this.prevFrame) {
      let diffSum = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i] - this.prevFrame[i]);
        const dg = Math.abs(data[i + 1] - this.prevFrame[i + 1]);
        const db = Math.abs(data[i + 2] - this.prevFrame[i + 2]);
        diffSum += (dr + dg + db) / 3;
      }

      this.motionLevel = diffSum / (pixelCount * 255);

      // Update baseline (slow exponential moving average)
      this.motionBaseline += (this.motionLevel - this.motionBaseline) * 0.05;

      // Detect flinch (sudden spike above baseline)
      const spike = this.motionLevel - this.motionBaseline;
      if (spike > this.flinchThreshold && this.flinchCooldown <= 0) {
        this.flinchCooldown = 2.0; // 2 second cooldown
        const intensity = Math.min(1, spike / 0.3);
        eventBus.emit('reaction:flinch', { intensity });
      }
    }

    // Save current frame for next comparison
    this.prevFrame = new Uint8ClampedArray(data);

    // ── FACE PRESENCE (skin-tone detection in center region) ──
    const cx = Math.floor(w * 0.25);
    const cy = Math.floor(h * 0.15);
    const cw = Math.floor(w * 0.5);
    const ch = Math.floor(h * 0.7);

    let skinPixels = 0;
    let centerPixels = 0;
    let centerBrightSum = 0;

    for (let y = cy; y < cy + ch; y++) {
      for (let x = cx; x < cx + cw; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        centerPixels++;
        centerBrightSum += (r + g + b) / 3;

        // Simple skin-tone detection (works across many skin tones)
        // Based on RGB ratio heuristics
        if (r > 60 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - b > 15) {
          skinPixels++;
        }
      }
    }

    this.skinPixelRatio = centerPixels > 0 ? skinPixels / centerPixels : 0;
    this.centerBrightness = centerPixels > 0 ? centerBrightSum / centerPixels : 128;

    // Update brightness baseline (slow)
    this.brightnessBaseline += (this.centerBrightness - this.brightnessBaseline) * 0.02;

    // Face presence check
    const wasFacePresent = this.facePresent;
    this.facePresent = this.skinPixelRatio > 0.08; // at least 8% skin pixels

    if (!this.facePresent) {
      this.faceGoneTimer += this.sampleInterval;
      if (this.faceGoneTimer >= this.faceGoneThreshold && wasFacePresent) {
        eventBus.emit('reaction:lookaway', {});
      }
    } else {
      if (!wasFacePresent && this.faceGoneTimer >= this.faceGoneThreshold) {
        eventBus.emit('reaction:return', {});
      }
      this.faceGoneTimer = 0;
    }

    // ── COVER DETECTION (sudden brightness drop in center) ────
    const brightnessDrop = 1 - (this.centerBrightness / Math.max(1, this.brightnessBaseline));
    const wasCovered = this.coverActive;

    if (brightnessDrop > this.coverThreshold && this.facePresent === false) {
      if (!this.coverActive) {
        this.coverActive = true;
        eventBus.emit('reaction:cover', {});
      }
    } else {
      this.coverActive = false;
    }
  }

  // ── GETTERS ──────────────────────────────────────────────────

  getMotionLevel() {
    return this.motionLevel;
  }

  isFacePresent() {
    return this.facePresent;
  }

  isCovering() {
    return this.coverActive;
  }
}
