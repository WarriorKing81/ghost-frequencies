import { eventBus } from '../core/EventBus.js';

export class Atmosphere {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.ctx = null;

    // Drone nodes
    this.droneOsc = null;
    this.droneGain = null;
    this.droneFilter = null;
    this.droneDistortion = null;

    // Sub-bass rumble
    this.subOsc = null;
    this.subGain = null;

    // Panner for unease
    this.panner = null;
    this.panPhase = 0;

    // Horror sting state
    this.stingPlayed = false;

    // Creepy music state (for case file)
    this.creepyMusicPlaying = false;
    this.creepyOscs = [];
    this.creepyGain = null;
    this.creepyNoteTimer = 0;
    this.creepyNoteIndex = 0;
  }

  init(config = {}) {
    this.ctx = this.engine.getContext();
    const musicBus = this.engine.getBus('music');

    // Panner for slow L/R sweep
    this.panner = this.ctx.createStereoPanner();
    this.panner.pan.value = 0;
    this.panner.connect(musicBus);

    // Drone oscillator — low sawtooth
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = config.droneFreq || 45;

    // Distortion for grit
    this.droneDistortion = this._createDistortion(config.distortion || 0.3);

    // Low-pass filter to tame the sawtooth
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 200;
    this.droneFilter.Q.value = 2;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.12;

    this.droneOsc.connect(this.droneDistortion);
    this.droneDistortion.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.panner);
    this.droneOsc.start();

    // Sub-bass sine for physical rumble (felt in headphones)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 30;

    this.subGain = this.ctx.createGain();
    this.subGain.gain.value = 0.08;

    this.subOsc.connect(this.subGain);
    this.subGain.connect(musicBus);
    this.subOsc.start();

    // Listen for first approach to play horror sting
    eventBus.on('puzzle:firstApproach', () => this._playHorrorSting());
  }

  _createDistortion(amount) {
    const node = this.ctx.createWaveShaper();
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount * 100) * x * 20 * deg) /
        (Math.PI + (amount * 100) * Math.abs(x));
    }
    node.curve = curve;
    node.oversample = '4x';
    return node;
  }

  _playHorrorSting() {
    if (this.stingPlayed) return;
    this.stingPlayed = true;

    const ctx = this.ctx;
    const sfxBus = this.engine.getBus('sfx');
    const now = ctx.currentTime;

    // Dissonant chord burst
    const freqs = [277, 311, 415]; // C#, D#, G# — unsettling cluster
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 1.5);
    });

    // Quick noise burst
    const bufferSize = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(noiseGain);
    noiseGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.8);
  }

  playCaptureSound() {
    const ctx = this.ctx;
    const sfxBus = this.engine.getBus('sfx');
    const now = ctx.currentTime;

    // Ascending tone sequence — success/capture
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  // ── CREEPY MUSIC (plays during case file) ──

  startCreepyMusic() {
    if (this.creepyMusicPlaying || !this.ctx) return;
    this.creepyMusicPlaying = true;
    this.creepyNoteTimer = 0;
    this.creepyNoteIndex = 0;

    // Mute the radio static while case file is up
    this.engine.getBus('radio').gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);

    // Create a gain node for creepy music
    this.creepyGain = this.ctx.createGain();
    this.creepyGain.gain.value = 0;
    this.creepyGain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.5);
    this.creepyGain.connect(this.engine.getBus('music'));
  }

  stopCreepyMusic() {
    if (!this.creepyMusicPlaying || !this.ctx) return;
    this.creepyMusicPlaying = false;

    // Fade out creepy music
    if (this.creepyGain) {
      this.creepyGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }

    // Restore radio static
    this.engine.getBus('radio').gain.setTargetAtTime(1, this.ctx.currentTime, 0.5);
  }

  _playCreepyNote() {
    if (!this.creepyGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Detuned music box / broken piano melody
    // Minor key, sparse, with slight detuning for unease
    const melody = [
      { freq: 261.6, dur: 1.5 },  // C4
      { freq: 311.1, dur: 1.2 },  // Eb4
      { freq: 293.7, dur: 1.8 },  // D4
      { freq: 246.9, dur: 2.0 },  // B3
      { freq: 277.2, dur: 1.4 },  // C#4
      { freq: 233.1, dur: 1.6 },  // Bb3
      { freq: 261.6, dur: 2.5 },  // C4
      { freq: 349.2, dur: 1.3 },  // F4
    ];

    const note = melody[this.creepyNoteIndex % melody.length];
    this.creepyNoteIndex++;

    // Slightly detuned for creepiness
    const detune = (Math.random() - 0.5) * 15;

    // Main tone — triangle wave (music box timbre)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = note.freq + detune;

    // Soft attack, long decay
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

    osc.connect(noteGain);
    noteGain.connect(this.creepyGain);
    osc.start(now);
    osc.stop(now + note.dur + 0.1);

    // Ghost harmonic (octave above, very quiet, slightly more detuned)
    const ghost = ctx.createOscillator();
    ghost.type = 'sine';
    ghost.frequency.value = note.freq * 2 + detune * 3;

    const ghostGain = ctx.createGain();
    ghostGain.gain.setValueAtTime(0, now + 0.1);
    ghostGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
    ghostGain.gain.exponentialRampToValueAtTime(0.001, now + note.dur * 0.7);

    ghost.connect(ghostGain);
    ghostGain.connect(this.creepyGain);
    ghost.start(now + 0.1);
    ghost.stop(now + note.dur);

    // Return the note duration for timing the next note
    return note.dur * (0.6 + Math.random() * 0.5); // slight randomness in spacing
  }

  update(dt) {
    if (!this.panner) return;

    // Slow, creepy stereo pan sweep
    this.panPhase += dt * 0.3;
    this.panner.pan.setTargetAtTime(
      Math.sin(this.panPhase) * 0.4,
      this.ctx.currentTime,
      0.1
    );

    // Subtle drone frequency modulation
    const wobble = Math.sin(this.panPhase * 0.7) * 3;
    this.droneOsc.frequency.setTargetAtTime(
      45 + wobble,
      this.ctx.currentTime,
      0.1
    );

    // Creepy music note scheduling
    if (this.creepyMusicPlaying) {
      this.creepyNoteTimer -= dt;
      if (this.creepyNoteTimer <= 0) {
        const nextDelay = this._playCreepyNote();
        this.creepyNoteTimer = nextDelay;
      }
    }
  }

  configure(config) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (config.droneFreq) {
      this.droneOsc.frequency.setTargetAtTime(config.droneFreq, t, 0.5);
    }
    if (config.distortion !== undefined) {
      this.droneDistortion = this._createDistortion(config.distortion);
    }

    this.stingPlayed = false;
  }
}
