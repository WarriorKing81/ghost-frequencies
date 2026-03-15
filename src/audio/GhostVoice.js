/**
 * GhostVoice — synthesizes a unique audio signature for each ghost.
 *
 * Each ghost type creates a different signal chain that replaces
 * the default sine wave in the RadioTuner. The voice only becomes
 * audible as the player tunes closer to the correct frequency.
 *
 * Voice types:
 *  - 'whisper'     (Eleanor Voss)   — trembling sine with vibrato, fragile
 *  - 'evp'         (Margarete)      — faint syllable-like AM pulses, barely there
 *  - 'poltergeist' (Bill Wilkins)   — deep gravelly growl with knocking rhythm
 *  - 'spiricom'    (Dr. Mueller)    — mechanical buzzing drone, layered tones
 *  - 'default'                      — basic sine wave
 */
export class GhostVoice {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.nodes = [];    // all created nodes (for cleanup)
    this.output = null; // final output node to connect to tuner's signal gain
    this.active = false;
  }

  /**
   * Build the voice signal chain and connect to the destination.
   * @param {string} voiceType - one of the voice types above
   * @param {number} baseTone - base frequency in Hz from ghost data
   * @param {GainNode} destination - the tuner's signal gain node
   */
  build(voiceType, baseTone, destination) {
    this.stop(); // clean up any previous voice

    switch (voiceType) {
      case 'whisper':
        this._buildWhisper(baseTone, destination);
        break;
      case 'evp':
        this._buildEVP(baseTone, destination);
        break;
      case 'poltergeist':
        this._buildPoltergeist(baseTone, destination);
        break;
      case 'spiricom':
        this._buildSpiricom(baseTone, destination);
        break;
      default:
        this._buildDefault(baseTone, destination);
        break;
    }

    this.active = true;
  }

  stop() {
    for (const node of this.nodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    }
    this.nodes = [];
    this.output = null;
    this.active = false;
  }

  // ── ELEANOR VOSS — Trembling whisper ──────────────────────────

  _buildWhisper(baseTone, dest) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Main tone — sine, soft
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseTone;

    // Vibrato LFO — slow trembling (4-6 Hz)
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 4.5;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 8; // ±8 Hz wobble
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(now);

    // Amplitude tremor — very slow breathing effect
    const tremor = ctx.createOscillator();
    tremor.type = 'sine';
    tremor.frequency.value = 1.2;
    const tremorGain = ctx.createGain();
    tremorGain.gain.value = 0.3;
    tremor.connect(tremorGain);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.7;
    tremorGain.connect(voiceGain.gain);
    tremor.start(now);

    // Gentle high-pass to thin it out (whisper-like)
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 300;
    hpf.Q.value = 0.5;

    osc.connect(hpf);
    hpf.connect(voiceGain);
    voiceGain.connect(dest);
    osc.start(now);

    this.nodes.push(osc, vibrato, vibratoGain, tremor, tremorGain, voiceGain, hpf);
    this.output = voiceGain;
  }

  // ── MARGARETE PETRAUTZKI — EVP fragments ──────────────────────

  _buildEVP(baseTone, dest) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Very faint primary tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseTone;

    // Second oscillator slightly detuned — creates beating/interference
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseTone + 3; // 3 Hz detuning = slow beat

    const mixGain = ctx.createGain();
    mixGain.gain.value = 0.4;

    // AM modulation — creates syllable-like bursts
    // Irregular rhythm simulating fragmented speech
    const amLfo = ctx.createOscillator();
    amLfo.type = 'square'; // sharp on/off
    amLfo.frequency.value = 2.5; // ~2.5 syllables per second

    // Soften the square wave with a filter
    const amFilter = ctx.createBiquadFilter();
    amFilter.type = 'lowpass';
    amFilter.frequency.value = 6;
    amLfo.connect(amFilter);

    const amGain = ctx.createGain();
    amGain.gain.value = 0.4;
    amFilter.connect(amGain);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.3; // very quiet — buried in static
    amGain.connect(voiceGain.gain);

    // Second AM at slower rate — creates phrase-level gaps
    const phraseLfo = ctx.createOscillator();
    phraseLfo.type = 'sine';
    phraseLfo.frequency.value = 0.4; // phrases every ~2.5 seconds
    const phraseGain = ctx.createGain();
    phraseGain.gain.value = 0.35;
    phraseLfo.connect(phraseGain);
    phraseGain.connect(voiceGain.gain);

    osc.connect(mixGain);
    osc2.connect(mixGain);
    mixGain.connect(voiceGain);
    voiceGain.connect(dest);

    osc.start(now);
    osc2.start(now);
    amLfo.start(now);
    phraseLfo.start(now);

    this.nodes.push(osc, osc2, mixGain, amLfo, amFilter, amGain, voiceGain, phraseLfo, phraseGain);
    this.output = voiceGain;
  }

  // ── BILL WILKINS — Poltergeist growl ──────────────────────────

  _buildPoltergeist(baseTone, dest) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low, aggressive sawtooth (gravelly)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = baseTone; // ~180 Hz — deep male voice

    // Heavy distortion — makes it sound gravelly
    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1;
      curve[i] = Math.tanh(x * 4);
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    // Low-pass to tame the harshness but keep the grit
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 600;
    lpf.Q.value = 3;

    // Sub-harmonic — one octave below for weight
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = baseTone / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.3;

    // Knocking rhythm — amplitude pattern like banging on walls
    const knockLfo = ctx.createOscillator();
    knockLfo.type = 'square';
    knockLfo.frequency.value = 1.8; // irregular-feeling knocks

    const knockFilter = ctx.createBiquadFilter();
    knockFilter.type = 'lowpass';
    knockFilter.frequency.value = 4;
    knockLfo.connect(knockFilter);

    const knockGain = ctx.createGain();
    knockGain.gain.value = 0.25;
    knockFilter.connect(knockGain);

    // Slow pitch wobble — unstable, like the voice is struggling
    const pitchLfo = ctx.createOscillator();
    pitchLfo.type = 'sine';
    pitchLfo.frequency.value = 0.6;
    const pitchGain = ctx.createGain();
    pitchGain.gain.value = 12; // ±12 Hz
    pitchLfo.connect(pitchGain);
    pitchGain.connect(osc.frequency);
    pitchGain.connect(sub.frequency);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.6;
    knockGain.connect(voiceGain.gain);

    osc.connect(distortion);
    distortion.connect(lpf);
    lpf.connect(voiceGain);
    sub.connect(subGain);
    subGain.connect(voiceGain);
    voiceGain.connect(dest);

    osc.start(now);
    sub.start(now);
    knockLfo.start(now);
    pitchLfo.start(now);

    this.nodes.push(osc, distortion, lpf, sub, subGain, knockLfo, knockFilter, knockGain, pitchLfo, pitchGain, voiceGain);
    this.output = voiceGain;
  }

  // ── DR. MUELLER — Spiricom mechanical buzz ────────────────────

  _buildSpiricom(baseTone, dest) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // The Spiricom used 13 tone generators — we'll simulate with
    // a harmonic stack of oscillators creating a buzzing drone

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.5;

    // Build harmonic stack (subset of the 13 Spiricom tones)
    const harmonics = [1, 1.5, 2, 2.5, 3, 4, 5.3]; // frequency ratios
    const harmonicGains = [0.3, 0.15, 0.2, 0.1, 0.12, 0.08, 0.05];

    harmonics.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      // Alternate waveforms for texture
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.value = baseTone * ratio;

      const gain = ctx.createGain();
      gain.gain.value = harmonicGains[i] || 0.05;

      osc.connect(gain);
      gain.connect(voiceGain);
      osc.start(now);

      this.nodes.push(osc, gain);
    });

    // Ring modulator effect — creates the metallic Spiricom buzz
    const ringOsc = ctx.createOscillator();
    ringOsc.type = 'sine';
    ringOsc.frequency.value = 60; // power hum frequency

    const ringGain = ctx.createGain();
    ringGain.gain.value = 0.2;
    ringOsc.connect(ringGain);
    ringGain.connect(voiceGain.gain); // AM modulates the voice

    // Speech-like envelope — slow amplitude shaping
    const speechLfo = ctx.createOscillator();
    speechLfo.type = 'sine';
    speechLfo.frequency.value = 0.8; // ~0.8 Hz — word-length patterns
    const speechGain = ctx.createGain();
    speechGain.gain.value = 0.2;
    speechLfo.connect(speechGain);
    speechGain.connect(voiceGain.gain);

    // Bandpass to give it that telephone/mechanical quality
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 800;
    bpf.Q.value = 2;

    voiceGain.connect(bpf);
    bpf.connect(dest);

    ringOsc.start(now);
    speechLfo.start(now);

    this.nodes.push(voiceGain, ringOsc, ringGain, speechLfo, speechGain, bpf);
    this.output = voiceGain;
  }

  // ── DEFAULT — Basic sine wave ─────────────────────────────────

  _buildDefault(baseTone, dest) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseTone;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);

    this.nodes.push(osc, gain);
    this.output = gain;
  }
}
