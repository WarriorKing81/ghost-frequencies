export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.buses = {};
    this.analyser = null;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master compressor to prevent clipping
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create buses
    this._createBus('music');   // ambient drones
    this._createBus('sfx');     // stingers, UI sounds
    this._createBus('radio');   // radio tuner output

    // Analyser on the radio bus for waveform visualization
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.buses.radio.connect(this.analyser);

    return this;
  }

  _createBus(name) {
    const gain = this.ctx.createGain();
    gain.connect(this.compressor);
    this.buses[name] = gain;
  }

  getBus(name) {
    return this.buses[name];
  }

  getAnalyser() {
    return this.analyser;
  }

  getContext() {
    return this.ctx;
  }

  setMasterVolume(v) {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
}
