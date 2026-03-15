/**
 * Records the player's face via the camera right before and during
 * a jump scare, then lets them download/share the reaction clip.
 *
 * Uses MediaRecorder API to capture a short video from the camera stream.
 */
export class ReactionRecorder {
  constructor(lightSensor) {
    this.lightSensor = lightSensor;
    this.mediaRecorder = null;
    this.chunks = [];
    this.recording = false;
    this.lastReactionBlob = null;
    this.lastReactionUrl = null;

    // Show share prompt after recording
    this.showSharePrompt = false;
    this.sharePromptTimer = 0;
  }

  canRecord() {
    return this.lightSensor.active &&
      this.lightSensor.getStream() &&
      typeof MediaRecorder !== 'undefined';
  }

  /**
   * Start recording a few seconds before the scare.
   * Call this ~2 seconds BEFORE triggering the jump scare.
   */
  startRecording() {
    if (!this.canRecord() || this.recording) return;

    const stream = this.lightSensor.getStream();
    try {
      // Try to include game audio too
      const options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = ''; // let browser decide
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this.lastReactionBlob = new Blob(this.chunks, { type: 'video/webm' });
        this.lastReactionUrl = URL.createObjectURL(this.lastReactionBlob);
        this.recording = false;
        this.showSharePrompt = true;
        this.sharePromptTimer = 8; // show for 8 seconds
      };

      this.mediaRecorder.start(100); // collect data every 100ms
      this.recording = true;
    } catch (err) {
      console.warn('ReactionRecorder: Failed to start —', err.message);
    }
  }

  /**
   * Stop recording after the scare + reaction window.
   * Call this ~3 seconds AFTER the jump scare.
   */
  stopRecording() {
    if (!this.recording || !this.mediaRecorder) return;
    try {
      this.mediaRecorder.stop();
    } catch (err) {
      this.recording = false;
    }
  }

  /**
   * Download the reaction clip.
   */
  downloadReaction() {
    if (!this.lastReactionUrl) return;
    const a = document.createElement('a');
    a.href = this.lastReactionUrl;
    a.download = `ghost-frequency-reaction-${Date.now()}.webm`;
    a.click();
    this.showSharePrompt = false;
  }

  /**
   * Share the reaction clip using Web Share API (mobile).
   */
  async shareReaction() {
    if (!this.lastReactionBlob) return;

    if (navigator.share && navigator.canShare) {
      const file = new File(
        [this.lastReactionBlob],
        `ghost-frequency-reaction.webm`,
        { type: 'video/webm' }
      );

      try {
        await navigator.share({
          title: 'Ghost Frequency — My Reaction',
          text: 'I got jump scared in Ghost Frequency!',
          files: [file],
        });
      } catch (err) {
        // User cancelled or share failed — fall back to download
        this.downloadReaction();
      }
    } else {
      this.downloadReaction();
    }
    this.showSharePrompt = false;
  }

  update(dt) {
    if (this.sharePromptTimer > 0) {
      this.sharePromptTimer -= dt;
      if (this.sharePromptTimer <= 0) {
        this.showSharePrompt = false;
      }
    }
  }

  draw(ctx, w, h) {
    if (!this.showSharePrompt) return;

    const alpha = Math.min(1, this.sharePromptTimer / 2);

    // Share prompt box at bottom
    const boxW = Math.min(w * 0.8, 400);
    const boxH = 80;
    const boxX = (w - boxW) / 2;
    const boxY = h - boxH - 100;

    ctx.fillStyle = `rgba(10, 10, 10, ${0.9 * alpha})`;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = `rgba(255, 60, 60, ${0.6 * alpha})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = `rgba(255, 60, 60, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0000';
    ctx.fillText('REACTION CAPTURED!', w / 2, boxY + 25);

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = `rgba(200, 200, 200, ${0.8 * alpha})`;
    ctx.shadowBlur = 0;
    ctx.fillText('Press [S] to share  |  [D] to download  |  [ESC] to dismiss', w / 2, boxY + 50);

    // Recording indicator (blinking red dot)
    if (this.recording) {
      const blink = Math.sin(Date.now() * 0.005) > 0;
      if (blink) {
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(w - 30, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText('REC', w - 30, 50);
      }
    }
  }
}
