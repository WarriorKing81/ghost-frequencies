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
    // Frequency readout
    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = '#00ff41';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff41';
    ctx.textAlign = 'center';
    ctx.fillText(`${frequency.toFixed(1)} MHz`, w / 2, h - 40);

    // Dial bar
    const dialW = w * 0.6;
    const dialX = (w - dialW) / 2;
    const dialY = h - 70;

    ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dialX, dialY);
    ctx.lineTo(dialX + dialW, dialY);
    ctx.stroke();

    // Tick marks
    for (let f = 80; f <= 108; f += 2) {
      const t = (f - 80) / 28;
      const x = dialX + t * dialW;
      ctx.beginPath();
      ctx.moveTo(x, dialY - 3);
      ctx.lineTo(x, dialY + 3);
      ctx.stroke();
    }

    // Dial marker
    const t = (frequency - 80) / 28;
    ctx.fillStyle = '#00ff41';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(dialX + t * dialW, dialY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Proximity indicator (top-right)
    if (proximity > 0.05) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${proximity})`;
      ctx.textAlign = 'right';
      ctx.fillText(`SIGNAL ${Math.floor(proximity * 100)}%`, w - 20, 30);
    }

    // Capture progress ring (center)
    if (captureProgress > 0) {
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
    }

    // Intro text (fades out)
    if (this.introAlpha > 0) {
      ctx.font = '18px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${this.introAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(0, 255, 65, ${this.introAlpha})`;
      ctx.fillText(this.introText, w / 2, h / 3);
    }

    // Notification (e.g., "GHOST CAPTURED!")
    if (this.notification) {
      const alpha = Math.min(1, this.notificationTimer);
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#00ff41';
      ctx.fillText(this.notification, w / 2, h / 2 - 20);
    }
  }
}
