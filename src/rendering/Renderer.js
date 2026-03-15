export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layers = [];

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  clear() {
    // Semi-transparent clear for phosphor persistence / trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  fullClear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  render(alpha, drawCallbacks) {
    this.clear();
    for (const cb of drawCallbacks) {
      this.ctx.save();
      cb(this.ctx, this.width, this.height, alpha);
      this.ctx.restore();
    }
  }
}
