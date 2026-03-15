export class WaveformDrawer {
  constructor() {
    this.ghostTrail = null;
    this.trailDelay = 3; // frames of delay for the ghost trail
    this.frameBuffer = [];
  }

  draw(ctx, w, h, analyserData, proximity) {
    if (!analyserData) return;

    // Color shifts: red/dim (no signal) → amber (close) → green (locked)
    const r = Math.floor(200 * (1 - proximity) + 50);
    const g = Math.floor(255 * proximity + 30);
    const color = `rgb(${r}, ${g}, 50)`;

    // Store frame for ghost trail
    this.frameBuffer.push(new Uint8Array(analyserData));
    if (this.frameBuffer.length > this.trailDelay) {
      this.ghostTrail = this.frameBuffer.shift();
    }

    // Draw ghost trail (faded duplicate, slightly offset)
    if (this.ghostTrail) {
      ctx.globalAlpha = 0.15;
      this._drawLine(ctx, w, h, this.ghostTrail, color, 1);
      ctx.globalAlpha = 1.0;
    }

    // Main waveform with glow
    ctx.shadowBlur = 12 + proximity * 25;
    ctx.shadowColor = color;
    this._drawLine(ctx, w, h, analyserData, color, 2);

    // Bright center pass (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 4;
    this._drawLine(ctx, w, h, analyserData, `rgba(255, 255, 255, ${0.2 + proximity * 0.3})`, 1);
    ctx.restore();
  }

  _drawLine(ctx, w, h, data, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const sliceWidth = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * sliceWidth, y);
    }
    ctx.stroke();
  }
}
