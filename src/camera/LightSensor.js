import { eventBus } from '../core/EventBus.js';

/**
 * Uses the device camera feed to estimate ambient room brightness.
 * Emits events when the light level crosses thresholds so the game
 * can react (spirits retreat when it's too bright).
 */
export class LightSensor {
  constructor() {
    this.video = null;
    this.stream = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;
    this.canvas.height = 48;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Current brightness (0-255)
    this.brightness = 0;
    // Smoothed brightness to avoid flicker
    this.smoothBrightness = 0;

    // Status: 'dark' | 'dim' | 'warning' | 'bright'
    this.status = 'dark';
    this.prevStatus = 'dark';

    // How often to sample (in seconds)
    this.sampleInterval = 0.5;
    this.sampleTimer = 0;

    this.active = false;
  }

  // Thresholds (0-255 pixel brightness)
  static THRESHOLDS = {
    dark: 15,       // 0-15: ideal darkness
    dim: 35,        // 16-35: acceptable, faint light
    warning: 80,    // 36-80: getting too bright
    // 80+: too bright — spirits disturbed
  };

  async init() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 160 },
          height: { ideal: 120 },
        },
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.playsInline = true;
      this.video.muted = true;
      await this.video.play();

      this.active = true;
      // Take an initial reading
      this._sample();
      return true;
    } catch (err) {
      console.warn('LightSensor: Camera not available —', err.message);
      this.active = false;
      return false;
    }
  }

  update(dt) {
    if (!this.active) return;

    this.sampleTimer += dt;
    if (this.sampleTimer >= this.sampleInterval) {
      this.sampleTimer = 0;
      this._sample();
    }
  }

  _sample() {
    if (!this.video || this.video.readyState < 2) return;

    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const { data } = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    let sum = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      // BT.709 luminance
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    this.brightness = sum / count;

    // Smooth to avoid jumpy readings (exponential moving average)
    this.smoothBrightness += (this.brightness - this.smoothBrightness) * 0.3;

    // Determine status
    const b = this.smoothBrightness;
    const T = LightSensor.THRESHOLDS;
    if (b <= T.dark) {
      this.status = 'dark';
    } else if (b <= T.dim) {
      this.status = 'dim';
    } else if (b <= T.warning) {
      this.status = 'warning';
    } else {
      this.status = 'bright';
    }

    // Emit event on status change
    if (this.status !== this.prevStatus) {
      eventBus.emit('light:changed', {
        status: this.status,
        brightness: this.smoothBrightness,
      });
      this.prevStatus = this.status;
    }
  }

  /** 0 = pitch black, 1 = max brightness */
  getNormalized() {
    return Math.min(1, this.smoothBrightness / 255);
  }

  getStatus() {
    return this.status;
  }

  isTooLight() {
    return this.status === 'bright';
  }

  getStream() {
    return this.stream;
  }

  stop() {
    this.active = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
  }
}
