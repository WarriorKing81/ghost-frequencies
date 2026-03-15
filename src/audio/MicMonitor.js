import { eventBus } from '../core/EventBus.js';

/**
 * MicMonitor — always-on microphone listening during gameplay.
 *
 * Uses getUserMedia to capture the player's mic and an AnalyserNode
 * to monitor their audio level in real-time. Does NOT play audio back
 * through the speakers (that would cause feedback).
 *
 * The ghost can hear the player — loud noises (screaming, talking,
 * background noise) feed into the ThreatSystem and make the ghost
 * more aggressive.
 */
export class MicMonitor {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.active = false;
    this.stream = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;

    // Audio levels (0-1 normalized)
    this.noiseLevel = 0;      // smoothed RMS level
    this.peakLevel = 0;       // recent peak (decays slowly)
    this.rawLevel = 0;        // unsmoothed RMS

    // Thresholds
    this.quietThreshold = 0.05;   // below this = silence
    this.loudThreshold = 0.25;    // above this = ghost hears you
    this.screamThreshold = 0.55;  // above this = ghost attacks

    // State
    this.isLoud = false;
    this.isScreaming = false;
    this.loudDuration = 0;        // how long continuously loud (seconds)

    // Calibration — first few seconds establish a baseline
    this.calibrating = true;
    this.calibrationTimer = 0;
    this.calibrationDuration = 2.0; // seconds
    this.baselineNoise = 0;
    this.calibrationSamples = [];
  }

  async init() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // we WANT to detect noise
          autoGainControl: false,  // raw levels
        },
      });

      const ctx = this.engine.getContext();

      this.source = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.75;

      // Connect source → analyser (NOT to destination — no playback!)
      this.source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.active = true;
      this.calibrating = true;
      this.calibrationTimer = 0;
      this.calibrationSamples = [];

      console.log('MicMonitor: Microphone active — the ghost is listening...');
      return true;
    } catch (err) {
      console.warn('MicMonitor: Mic access denied —', err.message);
      this.active = false;
      return false;
    }
  }

  update(dt) {
    if (!this.active || !this.analyser) return;

    // Read time-domain data
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS amplitude (0-1)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    this.rawLevel = Math.sqrt(sum / this.dataArray.length);

    // Calibration phase — learn the room's ambient noise
    if (this.calibrating) {
      this.calibrationTimer += dt;
      this.calibrationSamples.push(this.rawLevel);

      if (this.calibrationTimer >= this.calibrationDuration) {
        // Set baseline as the average ambient noise
        const avg = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
        this.baselineNoise = avg;
        this.calibrating = false;
        console.log(`MicMonitor: Calibrated — baseline noise: ${(avg * 100).toFixed(1)}%`);
      }
      return;
    }

    // Subtract baseline noise (so quiet rooms don't trigger)
    const adjusted = Math.max(0, this.rawLevel - this.baselineNoise);

    // Smooth the level (exponential moving average)
    this.noiseLevel += (adjusted - this.noiseLevel) * 0.3;

    // Peak tracking (fast attack, slow release)
    if (adjusted > this.peakLevel) {
      this.peakLevel = adjusted;
    } else {
      this.peakLevel *= 0.97; // slow decay
    }

    // State detection
    const wasLoud = this.isLoud;
    this.isLoud = this.noiseLevel > this.loudThreshold;
    this.isScreaming = this.noiseLevel > this.screamThreshold;

    // Track duration of loudness
    if (this.isLoud) {
      this.loudDuration += dt;
    } else {
      this.loudDuration = Math.max(0, this.loudDuration - dt * 0.5);
    }

    // Emit events on state changes
    if (this.isLoud && !wasLoud) {
      eventBus.emit('mic:loud', { level: this.noiseLevel });
    }
    if (this.isScreaming) {
      eventBus.emit('mic:scream', { level: this.noiseLevel });
    }
  }

  /** Get normalized noise level (0-1), baseline-adjusted */
  getNoiseLevel() {
    return this.noiseLevel;
  }

  /** Get peak level (0-1) */
  getPeakLevel() {
    return this.peakLevel;
  }

  /** Is the player being loud enough for the ghost to hear? */
  getIsLoud() {
    return this.isLoud;
  }

  /** How long has the player been continuously loud (seconds)? */
  getLoudDuration() {
    return this.loudDuration;
  }

  stop() {
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.active = false;
    this.noiseLevel = 0;
    this.peakLevel = 0;
    this.isLoud = false;
  }
}
