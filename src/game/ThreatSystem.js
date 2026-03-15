import { eventBus } from '../core/EventBus.js';

/**
 * The haunting ghost — an unseen entity that lurks in the static.
 *
 * If the player lingers in the static too long (not tuned to a signal),
 * the ghost attacks with a jump scare, captures a photo of the player's
 * face, and FAILS the mission. The time threshold is randomized per case
 * so the player can never predict when it will strike.
 */
export class ThreatSystem {
  constructor(audioEngine, lightSensor) {
    this.engine = audioEngine;
    this.lightSensor = lightSensor;

    // ── STATIC TIMER ─────────────────────────────────────────
    // Counts up while player is in static (low proximity / no signal)
    this.staticTimer = 0;
    // Randomized per case — always > 10 seconds
    this.staticThreshold = this._randomThreshold();

    // Threat level (0-1) for visual warnings
    this.threatLevel = 0;

    // ── JUMP SCARE STATE ─────────────────────────────────────
    this.scareActive = false;
    this.scareTimer = 0;
    this.scareDuration = 4.0; // total scare + fail screen duration

    // ── FAIL STATE ───────────────────────────────────────────
    this.failed = false;
    this.failTimer = 0;
    this.failDuration = 6.0; // how long the fail screen shows
    this.capturedPhoto = null; // canvas snapshot of player's face
    this.laughPlayed = false;

    // ── WARNING STATE ────────────────────────────────────────
    this.warningActive = false;

    // ── VISUAL STATE ─────────────────────────────────────────
    this.flashIntensity = 0;
    this.distortionAmount = 0;
    this.entityAlpha = 0;

    // Reduce static timer when player answers correctly
    eventBus.on('question:answered', () => {
      this.staticTimer = Math.max(0, this.staticTimer - 5);
    });

    // Reset static timer when player asks a question
    eventBus.on('question:asked', () => {
      this.staticTimer = Math.max(0, this.staticTimer - 3);
    });
  }

  /** Generate a random threshold: 15-45 seconds (always > 10) */
  _randomThreshold() {
    return 15 + Math.random() * 30;
  }

  reset() {
    this.staticTimer = 0;
    this.staticThreshold = this._randomThreshold();
    this.threatLevel = 0;
    this.scareActive = false;
    this.scareTimer = 0;
    this.failed = false;
    this.failTimer = 0;
    this.capturedPhoto = null;
    this.laughPlayed = false;
    this.warningActive = false;
    this.flashIntensity = 0;
    this.distortionAmount = 0;
    this.entityAlpha = 0;
  }

  update(dt, proximity, isListening) {
    // Don't update during fail screen
    if (this.failed) {
      this.failTimer += dt;
      if (this.failTimer >= this.failDuration) {
        // Emit fail event — LevelManager will handle restart
        eventBus.emit('threat:missionFailed', {});
        // Full reset so the scare doesn't re-trigger during the transition
        this.reset();
      }
      return;
    }

    // Handle active jump scare animation
    if (this.scareActive) {
      this.scareTimer += dt;
      this._updateScare(dt);
      if (this.scareTimer >= this.scareDuration) {
        this._endScare();
      }
      return;
    }

    // ── STATIC TIMER ─────────────────────────────────────────
    // Counts up when the player is in static (proximity < 0.2)
    // Resets when they're tuned into a signal
    if (proximity < 0.2) {
      this.staticTimer += dt;
    } else {
      // Tuned in — slowly drain the timer
      this.staticTimer = Math.max(0, this.staticTimer - dt * 2);
    }

    // Calculate threat level from how close to threshold
    if (this.staticThreshold > 0) {
      this.threatLevel = Math.min(1, this.staticTimer / this.staticThreshold);
    }

    // ── WARNING PHASE (threat > 0.6) ─────────────────────────
    if (this.threatLevel > 0.6) {
      if (!this.warningActive) {
        this.warningActive = true;
        eventBus.emit('threat:warning', {});
      }
    } else {
      this.warningActive = false;
    }

    // ── TRIGGER SCARE ────────────────────────────────────────
    if (this.staticTimer >= this.staticThreshold) {
      this._triggerScare();
    }

    // Ambient distortion based on threat
    this.distortionAmount = this.threatLevel * 0.3;
  }

  // ── SCARE SEQUENCE ───────────────────────────────────────────

  _triggerScare() {
    this.scareActive = true;
    this.scareTimer = 0;
    this.flashIntensity = 1.0;
    this.entityAlpha = 1.0;

    // Capture the player's face right NOW
    this._capturePhoto();

    // Play the scream sound
    this._playScareSound();

    eventBus.emit('threat:jumpscare', {});
  }

  _updateScare(dt) {
    // Flash decays quickly
    this.flashIntensity = Math.max(0, 1 - this.scareTimer * 2);

    // Entity fades in then out
    if (this.scareTimer < 0.3) {
      this.entityAlpha = this.scareTimer / 0.3;
    } else if (this.scareTimer > this.scareDuration - 0.8) {
      this.entityAlpha = (this.scareDuration - this.scareTimer) / 0.8;
    }

    // Distortion peaks during scare
    this.distortionAmount = 1.0 - this.scareTimer / this.scareDuration;
  }

  _endScare() {
    this.scareActive = false;
    this.scareTimer = 0;
    this.flashIntensity = 0;
    this.entityAlpha = 0;
    this.distortionAmount = 0;

    // Transition to fail state
    this.failed = true;
    this.failTimer = 0;
    this.laughPlayed = false;
  }

  // ── PHOTO CAPTURE ────────────────────────────────────────────

  _capturePhoto() {
    if (!this.lightSensor || !this.lightSensor.active) return;

    const video = this.lightSensor.video;
    if (!video || video.readyState < 2) return;

    // Snap a frame from the camera
    const snap = document.createElement('canvas');
    snap.width = 320;
    snap.height = 240;
    const sCtx = snap.getContext('2d');
    sCtx.drawImage(video, 0, 0, snap.width, snap.height);
    this.capturedPhoto = snap;
  }

  // ── AUDIO ────────────────────────────────────────────────────

  _playScareSound() {
    const ctx = this.engine.getContext();
    const sfxBus = this.engine.getBus('sfx');
    const now = ctx.currentTime;

    // SCREAM — piercing shriek
    const shriek = ctx.createOscillator();
    shriek.type = 'square';
    shriek.frequency.setValueAtTime(600, now);
    shriek.frequency.exponentialRampToValueAtTime(2500, now + 0.1);
    shriek.frequency.exponentialRampToValueAtTime(200, now + 1.5);

    const shriekGain = ctx.createGain();
    shriekGain.gain.setValueAtTime(0.45, now);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    shriek.connect(shriekGain);
    shriekGain.connect(sfxBus);
    shriek.start(now);
    shriek.stop(now + 1.5);

    // Low growl underneath
    const growl = ctx.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(90, now);
    growl.frequency.exponentialRampToValueAtTime(30, now + 2);

    const growlDist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 5);
    }
    growlDist.curve = curve;

    const growlGain = ctx.createGain();
    growlGain.gain.setValueAtTime(0.5, now);
    growlGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    growl.connect(growlDist);
    growlDist.connect(growlGain);
    growlGain.connect(sfxBus);
    growl.start(now);
    growl.stop(now + 2.5);

    // Noise explosion
    const bufSize = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    noise.connect(noiseGain);
    noiseGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 1.8);
  }

  _playLaugh() {
    const ctx = this.engine.getContext();
    const sfxBus = this.engine.getBus('sfx');
    const now = ctx.currentTime;

    // Ghostly laugh — descending staccato tones
    const laughFreqs = [400, 350, 300, 280, 400, 320, 260, 240];
    laughFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      // Slight distortion
      const dist = ctx.createWaveShaper();
      const c = new Float32Array(256);
      for (let j = 0; j < 256; j++) {
        const x = (j * 2) / 256 - 1;
        c[j] = Math.tanh(x * 3);
      }
      dist.curve = c;

      osc.connect(dist);
      dist.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  // ── DRAW ─────────────────────────────────────────────────────

  draw(ctx, w, h) {
    // ── FAIL SCREEN ──────────────────────────────────────────
    if (this.failed) {
      this._drawFailScreen(ctx, w, h);
      return;
    }

    // ── WARNING SIGNS ────────────────────────────────────────
    if (this.warningActive && !this.scareActive) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
      const warnIntensity = (this.threatLevel - 0.6) / 0.4; // 0-1 in warning range

      // Red tint creeping in from edges
      const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(80, 0, 0, ${warnIntensity * 0.15 * pulse})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Random glitch lines
      if (Math.random() < warnIntensity * 0.4) {
        const gy = Math.random() * h;
        const gw = 50 + Math.random() * 200;
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * w, gy, gw, 2 + Math.random() * 4);
      }
    }

    // ── JUMP SCARE VISUALS ───────────────────────────────────
    if (this.scareActive) {
      // White/red flash
      if (this.flashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 20, 20, ${this.flashIntensity * 0.8})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Entity — abstract horror face
      if (this.entityAlpha > 0) {
        this._drawEntity(ctx, w, h, this.entityAlpha);
      }

      // Screen tears
      if (this.scareTimer < 1.5) {
        const tears = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < tears; i++) {
          const ty = Math.random() * h;
          ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + Math.random() * 0.5})`;
          ctx.fillRect(0, ty, w, 3 + Math.random() * 8);
        }
      }
    }

    // ── AMBIENT THREAT ───────────────────────────────────────
    if (this.threatLevel > 0.3 && !this.scareActive) {
      const t = (this.threatLevel - 0.3) / 0.7;
      ctx.fillStyle = `rgba(60, 0, 0, ${t * 0.05})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _drawFailScreen(ctx, w, h) {
    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Play the laugh once
    if (!this.laughPlayed && this.failTimer > 0.5) {
      this.laughPlayed = true;
      this._playLaugh();
    }

    // Show the captured photo of the player's face (with glitch effect)
    if (this.capturedPhoto && this.failTimer > 0.3) {
      const photoAlpha = Math.min(1, (this.failTimer - 0.3) * 2);

      // Photo in center, with red tint and distortion
      const photoW = Math.min(w * 0.5, 320);
      const photoH = photoW * 0.75;
      const photoX = (w - photoW) / 2;
      const photoY = h * 0.15;

      ctx.save();
      ctx.globalAlpha = photoAlpha;

      // Draw the photo
      ctx.drawImage(this.capturedPhoto, photoX, photoY, photoW, photoH);

      // Red overlay on the photo
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(photoX, photoY, photoW, photoH);

      // Scanline effect on photo
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = photoY; y < photoY + photoH; y += 3) {
        ctx.fillRect(photoX, y, photoW, 1);
      }

      // Border
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() * 0.003) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Random glitch offset on photo (occasionally)
      if (Math.random() < 0.1) {
        const sliceY = photoY + Math.random() * photoH;
        const sliceH = 5 + Math.random() * 20;
        const offset = (Math.random() - 0.5) * 30;
        ctx.drawImage(
          this.capturedPhoto,
          0, (sliceY - photoY) / photoH * this.capturedPhoto.height,
          this.capturedPhoto.width, sliceH / photoH * this.capturedPhoto.height,
          photoX + offset, sliceY, photoW, sliceH
        );
      }

      ctx.restore();
    }

    // "MISSION FAILED" text
    if (this.failTimer > 1.0) {
      const textAlpha = Math.min(1, (this.failTimer - 1.0) * 2);

      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillStyle = `rgba(255, 30, 30, ${textAlpha})`;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#ff0000';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION FAILED', w / 2, h * 0.7);
      ctx.shadowBlur = 0;
    }

    // Ghost's taunt: "Ha ha. Maybe next time."
    if (this.failTimer > 2.5) {
      const tauntAlpha = Math.min(1, (this.failTimer - 2.5) * 1.5);
      const flicker = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;

      ctx.font = 'italic 20px "Courier New", monospace';
      ctx.fillStyle = `rgba(200, 60, 60, ${tauntAlpha * flicker})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('"Ha ha. Maybe next time."', w / 2, h * 0.8);
      ctx.shadowBlur = 0;
    }

    // "Restarting..." at the bottom
    if (this.failTimer > 4.5) {
      const restartAlpha = Math.min(1, (this.failTimer - 4.5));
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = `rgba(100, 100, 100, ${restartAlpha * 0.6})`;
      ctx.textAlign = 'center';
      ctx.fillText('Restarting case...', w / 2, h * 0.92);
    }
  }

  _drawEntity(ctx, w, h, alpha) {
    ctx.save();

    const cx = w / 2 + (Math.random() - 0.5) * 20;
    const cy = h / 2 + (Math.random() - 0.5) * 20;

    // Glowing eyes
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.9})`;

    // Left eye
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy - 20, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(cx + 35, cy - 20, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth — jagged gash (wider, more menacing)
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 30);
    for (let i = 0; i < 10; i++) {
      const px = cx - 50 + (i + 1) * 10;
      const py = cy + 30 + (i % 2 === 0 ? -10 : 10);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Dark aura
    const aura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200);
    aura.addColorStop(0, `rgba(20, 0, 0, ${alpha * 0.8})`);
    aura.addColorStop(0.5, `rgba(10, 0, 0, ${alpha * 0.3})`);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }
}
