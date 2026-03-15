export class UIOverlay {
  constructor() {
    this.introText = '';
    this.introAlpha = 0;
    this.captureProgress = 0; // 0-1, shown as ring
    this.notification = null;
    this.notificationTimer = 0;
  }

  showIntro(text) {
    this.introText = text;
    this.introAlpha = 1.0;
  }

  showNotification(text, duration = 3.0) {
    this.notification = text;
    this.notificationTimer = duration;
  }

  update(dt) {
    // Fade intro text
    if (this.introAlpha > 0) {
      this.introAlpha = Math.max(0, this.introAlpha - dt * 0.15);
    }

    // Notification timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.notification = null;
      }
    }
  }

  draw(ctx, w, h, frequency, proximity, captureProgress) {
    // Frequency readout — small, top-center (out of the way)
    ctx.save();
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + proximity * 0.7})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00ff41';
    ctx.textAlign = 'center';
    ctx.fillText(`${frequency.toFixed(1)} MHz`, w / 2, 20);
    ctx.restore();

    // Signal strength — top-right, below MIC bar area
    if (proximity > 0.05) {
      ctx.save();
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${proximity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff41';
      ctx.textAlign = 'right';
      ctx.fillText(`SIGNAL ${Math.floor(proximity * 100)}%`, w - 30, 110);
      ctx.restore();
    }

    // Capture progress ring (center)
    if (captureProgress > 0) {
      ctx.save();
      const cx = w / 2;
      const cy = h / 2;
      const radius = 50;

      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ff41';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * captureProgress);
      ctx.stroke();

      ctx.font = '16px "Courier New", monospace';
      ctx.fillStyle = '#00ff41';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAPTURING...', cx, cy);
      ctx.restore();
    }

    // Intro text (fades out)
    if (this.introAlpha > 0) {
      ctx.save();
      ctx.font = '18px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${this.introAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(0, 255, 65, ${this.introAlpha})`;
      ctx.fillText(this.introText, w / 2, h / 3);
      ctx.restore();
    }

    // Notification (e.g., "GHOST CAPTURED!")
    if (this.notification) {
      ctx.save();
      const alpha = Math.min(1, this.notificationTimer);
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#00ff41';
      ctx.fillText(this.notification, w / 2, h / 2 - 20);
      ctx.restore();
    }
  }
}
