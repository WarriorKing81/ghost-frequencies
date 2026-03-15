export class SoundBank {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.buffers = new Map();
  }

  async load(key, url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.engine.getContext().decodeAudioData(arrayBuffer);
    this.buffers.set(key, audioBuffer);
    return audioBuffer;
  }

  async loadAll(manifest) {
    const promises = Object.entries(manifest).map(([key, url]) => this.load(key, url));
    await Promise.all(promises);
  }

  play(key, { bus = 'sfx', loop = false, volume = 1.0 } = {}) {
    const buffer = this.buffers.get(key);
    if (!buffer) return null;

    const ctx = this.engine.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.engine.getBus(bus));
    source.start();

    return { source, gain };
  }

  has(key) {
    return this.buffers.has(key);
  }
}
