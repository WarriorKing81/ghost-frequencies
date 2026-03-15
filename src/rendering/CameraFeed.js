/**
 * Draws the player's camera feed as a small picture-in-picture box
 * on the game canvas. Uses the same video stream as LightSensor.
 */
export class CameraFeed {
  constructor(lightSensor) {
    this.lightSensor = lightSensor;
    this.visible = true;

    // PiP dimensions and position (bottom-left corner)
    this.pipWidth = 120;
    this.pipHeight = 90;
    this.margin = 15;

    // Glitch effect state
    this.glitchTimer = 0;
    this.glitchActive = false;
    this.glitchIntensity = 0;
  }

  setGlitch(intensity) {
    this.glitchIntensity = intensity;
  }

  draw(ctx, w, h) {
    if (!this.visible || !this.lightSensor.active) return;

    const video = this.lightSensor.video;
    if (!video || video.readyState < 2) return;

    const x = this.margin;
    const y = h - this.pipHeight - this.margin - 60; // above the dial

    ctx.save();

    // Border glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff41';
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, this.pipWidth + 2, this.pipHeight + 2);

    // Draw the video feed
    ctx.globalAlpha = 0.7;

    // Apply green tint by drawing video then overlaying
    ctx.drawImage(video, x, y, this.pipWidth, this.pipHeight);

    // Green/night-vision tint overlay
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#40ff60';
    ctx.fillRect(x, y, this.pipWidth, this.pipHeight);
    ctx.globalCompositeOperation = 'source-over';

    // Scanlines on the PiP
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    for (let sy = y; sy < y + this.pipHeight; sy += 3) {
      ctx.fillRect(x, sy, this.pipWidth, 1);
    }
    ctx.globalAlpha = 1.0;

    // Glitch effect — displacement and color aberration
    if (this.glitchIntensity > 0 && Math.random() < this.glitchIntensity * 0.3) {
      const sliceH = 5 + Math.random() * 15;
      const sliceY = y + Math.random() * (this.pipHeight - sliceH);
      const offset = (Math.random() - 0.5) * 20 * this.glitchIntensity;

      ctx.globalAlpha = 0.8;
      ctx.drawImage(
        video,
        0, (sliceY - y) / this.pipHeight * video.videoHeight,
        video.videoWidth, sliceH / this.pipHeight * video.videoHeight,
        x + offset, sliceY,
        this.pipWidth, sliceH
      );

      // Red aberration strip
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * this.glitchIntensity})`;
      ctx.fillRect(x + offset, sliceY, this.pipWidth, sliceH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }

    // Corner brackets (tactical camera look)
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    const bl = 10; // bracket length

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + bl); ctx.lineTo(x, y); ctx.lineTo(x + bl, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + this.pipWidth - bl, y); ctx.lineTo(x + this.pipWidth, y); ctx.lineTo(x + this.pipWidth, y + bl);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + this.pipHeight - bl); ctx.lineTo(x, y + this.pipHeight); ctx.lineTo(x + bl, y + this.pipHeight);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + this.pipWidth - bl, y + this.pipHeight); ctx.lineTo(x + this.pipWidth, y + this.pipHeight); ctx.lineTo(x + this.pipWidth, y + this.pipHeight - bl);
    ctx.stroke();

    // "REC" indicator
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#ff3333';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ff0000';
    const blink = Math.sin(Date.now() * 0.003) > 0;
    if (blink) {
      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('REC', x + 17, y + 15);
    }

    ctx.restore();
  }
}
