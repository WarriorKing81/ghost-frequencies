export class ScreenEffects {
  constructor() {
    this.noiseCanvas = null;
    this.noiseCtx = null;
    this.noiseSize = 128;
    this.frameCount = 0;
    this.flickerAmount = 0;
  }

  init() {
    // Off-screen canvas for noise generation
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = this.noiseSize;
    this.noiseCanvas.height = this.noiseSize;
    this.noiseCtx = this.noiseCanvas.getContext('2d');
  }

  drawScanlines(ctx, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  drawVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, h * 0.3,
      w / 2, h / 2, h * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  drawNoise(ctx, w, h, intensity) {
    if (!this.noiseCtx || intensity < 0.01) return;

    this.frameCount++;
    // Only regenerate noise every 2-3 frames for performance
    if (this.frameCount % 2 === 0) {
      const imageData = this.noiseCtx.createImageData(this.noiseSize, this.noiseSize);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      this.noiseCtx.putImageData(imageData, 0, 0);
    }

    ctx.save();
    ctx.globalAlpha = intensity * 0.12;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.noiseCanvas, 0, 0, w, h);
    ctx.restore();
  }

  drawFlicker(ctx, w, h) {
    // Random subtle brightness variation
    this.flickerAmount = 0.02 + Math.random() * 0.03;
    ctx.fillStyle = `rgba(0, 0, 0, ${this.flickerAmount})`;
    ctx.fillRect(0, 0, w, h);
  }
}
