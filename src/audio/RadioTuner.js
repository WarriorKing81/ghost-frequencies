import { GhostVoice } from './GhostVoice.js';

export class RadioTuner {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.ctx = null;

    // Frequency range (displayed as MHz)
    this.minFreq = 80.0;
    this.maxFreq = 108.0;
    this.currentFreq = 88.0;

    // Station config
    this.station = null;
    this.proximity = 0;

    // Audio nodes
    this.noiseSource = null;
    this.noiseGain = null;
    this.signalGain = null; // final gain before radio bus (ghost voice connects here)
    this.signalFilter = null;
    this.analyserData = null;

    // Ghost voice synthesizer (replaces the old single sine wave)
    this.ghostVoice = null;
  }

  init() {
    this.ctx = this.engine.getContext();
    const radioBus = this.engine.getBus('radio');

    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Noise source (loops forever)
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.5;

    this.noiseSource.connect(this.noiseGain);
    this.noiseGain.connect(radioBus);
    this.noiseSource.start();

    // Signal gain — the ghost voice output connects here
    // Proximity controls this gain (0 when far, ramps up when tuned in)
    this.signalGain = this.ctx.createGain();
    this.signalGain.gain.value = 0;

    // Bandpass filter on the signal for tuning feel
    this.signalFilter = this.ctx.createBiquadFilter();
    this.signalFilter.type = 'bandpass';
    this.signalFilter.frequency.value = 440;
    this.signalFilter.Q.value = 1;

    this.signalFilter.connect(this.signalGain);
    this.signalGain.connect(radioBus);

    // Ghost voice synthesizer
    this.ghostVoice = new GhostVoice(this.ctx);

    // Analyser data buffer
    const analyser = this.engine.getAnalyser();
    this.analyserData = new Uint8Array(analyser.frequencyBinCount);
  }

  /**
   * Set the station to tune to.
   * @param {object|null} config - { targetFrequency, bandwidth, voiceType, voiceTone, audioBuffer }
   */
  setStation(config) {
    this.station = config;

    if (!config) {
      // No station — silence the signal
      if (this.ghostVoice) this.ghostVoice.stop();
      this.proximity = 0;
      if (this.signalGain) {
        this.signalGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      return;
    }

    // Map the target frequency to an audible tone range
    const t = (config.targetFrequency - this.minFreq) / (this.maxFreq - this.minFreq);
    const fallbackTone = 200 + t * 600;
    const baseTone = config.voiceTone || fallbackTone;

    // Update the bandpass filter center
    if (this.signalFilter) {
      // For recorded voices, widen the filter so the full audio comes through
      if (config.voiceType === 'recorded') {
        this.signalFilter.frequency.setTargetAtTime(1200, this.ctx.currentTime, 0.01);
        this.signalFilter.Q.setTargetAtTime(0.3, this.ctx.currentTime, 0.01);
      } else {
        this.signalFilter.frequency.setTargetAtTime(baseTone, this.ctx.currentTime, 0.01);
      }
    }

    // Build the ghost's voice and connect it to the signal filter
    if (this.ghostVoice) {
      this.ghostVoice.build(
        config.voiceType || 'default',
        baseTone,
        this.signalFilter,
        config.audioBuffer || null
      );
    }
  }

  setFrequency(freq) {
    this.currentFreq = Math.max(this.minFreq, Math.min(this.maxFreq, freq));
    this._updateProximity();
  }

  adjustFrequency(delta) {
    this.setFrequency(this.currentFreq + delta);
  }

  _updateProximity() {
    if (!this.station) {
      this.proximity = 0;
      return;
    }

    const distance = Math.abs(this.currentFreq - this.station.targetFrequency);
    const bandwidth = this.station.bandwidth || 5.0;
    this.proximity = Math.max(0, 1 - distance / bandwidth);

    // Update audio based on proximity
    const t = this.ctx.currentTime;

    // Static fades as you get closer (baseNoiseLevel is set by main.js for each phase)
    const baseNoise = this._baseNoiseLevel || 0.3;
    this.noiseGain.gain.setTargetAtTime(baseNoise * (1 - this.proximity * 0.9), t, 0.05);

    // Signal gets louder
    this.signalGain.gain.setTargetAtTime(this.proximity * 0.6, t, 0.05);

    // Filter opens up as proximity increases
    this.signalFilter.Q.setTargetAtTime(1 + this.proximity * 15, t, 0.05);
  }

  getFrequency() {
    return this.currentFreq;
  }

  getProximity() {
    return this.proximity;
  }

  getAnalyserData() {
    const analyser = this.engine.getAnalyser();
    analyser.getByteTimeDomainData(this.analyserData);
    return this.analyserData;
  }

  update(dt, dialDelta) {
    if (dialDelta !== 0) {
      this.adjustFrequency(dialDelta);
    }
  }
}
