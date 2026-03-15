import { eventBus } from '../core/EventBus.js';

/**
 * Manages the case file display and state.
 * When open, the screen shows a realistic manila folder with paper inside —
 * no static, no waveform. Creepy music plays instead.
 */
export class CaseFile {
  constructor() {
    this.currentCase = null;
    this.isOpen = false;
    this.openProgress = 0;
    this.scrollY = 0;
    this.revealedClues = [];

    // Paper texture noise (generated once)
    this._paperCanvas = null;
    this._folderCanvas = null;
  }

  loadCase(caseData) {
    this.currentCase = caseData;
    this.isOpen = true;
    this.openProgress = 0;
    this.scrollY = 0;
    this.revealedClues = [];
  }

  toggle() { this.isOpen = !this.isOpen; }
  open() { this.isOpen = true; }
  close() { this.isOpen = false; }

  revealClue(clueId) {
    if (!this.revealedClues.includes(clueId)) {
      this.revealedClues.push(clueId);
      eventBus.emit('case:clueRevealed', { clueId });
    }
  }

  isClueRevealed(clueId) {
    return this.revealedClues.includes(clueId);
  }

  allCluesRevealed() {
    if (!this.currentCase) return false;
    return this.currentCase.questions.every(q =>
      this.revealedClues.includes(q.id)
    );
  }

  update(dt) {
    const target = this.isOpen ? 1 : 0;
    this.openProgress += (target - this.openProgress) * dt * 4;
    if (Math.abs(this.openProgress - target) < 0.01) {
      this.openProgress = target;
    }
  }

  _ensureTextures(w, h) {
    // Generate paper texture once
    if (!this._paperCanvas || this._paperCanvas.width !== w) {
      this._paperCanvas = document.createElement('canvas');
      this._paperCanvas.width = w;
      this._paperCanvas.height = h;
      const pctx = this._paperCanvas.getContext('2d');

      // Paper grain
      const imageData = pctx.createImageData(w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const grain = Math.random() * 15;
        d[i] = 235 + grain;     // R
        d[i + 1] = 225 + grain; // G
        d[i + 2] = 200 + grain; // B
        d[i + 3] = 255;
      }
      pctx.putImageData(imageData, 0, 0);
    }
  }

  draw(ctx, w, h) {
    if (!this.currentCase || this.openProgress < 0.01) return;

    this._ensureTextures(w, h);

    const c = this.currentCase;
    const alpha = this.openProgress;

    // ── FULL BLACK BACKGROUND (no static behind) ──
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);

    // ── DESK SURFACE ──
    // Dark wood desk texture
    ctx.fillStyle = `rgba(35, 25, 18, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    // Wood grain lines
    for (let i = 0; i < 30; i++) {
      const gy = (i / 30) * h + Math.sin(i * 2.3) * 5;
      ctx.strokeStyle = `rgba(50, 35, 22, ${0.3 * alpha})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, gy + Math.sin(x * 0.01 + i) * 3);
      }
      ctx.stroke();
    }

    // ── MANILA FOLDER ──
    const folderW = Math.min(w * 0.88, 520);
    const folderH = h * 0.82;
    const folderX = (w - folderW) / 2;
    const folderY = (h - folderH) / 2 + (1 - alpha) * 80;

    // Folder shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
    ctx.fillRect(folderX + 6, folderY + 6, folderW, folderH);

    // Folder back panel (slightly wider, visible at top)
    ctx.fillStyle = `rgba(195, 170, 120, ${alpha})`;
    ctx.fillRect(folderX - 3, folderY - 3, folderW + 6, folderH + 6);

    // Folder tab (sticks up from the back)
    const tabW = 120;
    const tabH = 28;
    const tabX = folderX + 30;
    const tabY = folderY - tabH - 2;
    ctx.fillStyle = `rgba(195, 170, 120, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(tabX, tabY + tabH);
    ctx.lineTo(tabX + 5, tabY + 3);
    ctx.quadraticCurveTo(tabX + 8, tabY, tabX + 12, tabY);
    ctx.lineTo(tabX + tabW - 12, tabY);
    ctx.quadraticCurveTo(tabX + tabW - 8, tabY, tabX + tabW - 5, tabY + 3);
    ctx.lineTo(tabX + tabW, tabY + tabH);
    ctx.fill();

    // Tab label
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = `rgba(80, 60, 35, ${alpha})`;
    ctx.textAlign = 'left';
    ctx.fillText('CASE FILE', tabX + 18, tabY + 18);

    // Folder front panel (the actual folder face)
    ctx.fillStyle = `rgba(210, 185, 135, ${alpha})`;
    ctx.fillRect(folderX, folderY, folderW, folderH);

    // Folder texture — subtle fibrous look
    ctx.globalAlpha = 0.06 * alpha;
    if (this._paperCanvas) {
      ctx.drawImage(this._paperCanvas, folderX, folderY, folderW, folderH);
    }
    ctx.globalAlpha = 1.0;

    // Folder crease / wear lines
    ctx.strokeStyle = `rgba(170, 145, 100, ${0.3 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(folderX, folderY + folderH * 0.02);
    ctx.lineTo(folderX + folderW, folderY + folderH * 0.02);
    ctx.stroke();

    // ── WHITE PAPER inside the folder ──
    const paperMargin = 18;
    const paperX = folderX + paperMargin;
    const paperY = folderY + paperMargin + 5;
    const paperW = folderW - paperMargin * 2;
    const paperH = folderH - paperMargin * 2 - 5;

    // Paper shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 * alpha})`;
    ctx.fillRect(paperX + 2, paperY + 2, paperW, paperH);

    // Paper
    ctx.fillStyle = `rgba(248, 243, 230, ${alpha})`;
    ctx.fillRect(paperX, paperY, paperW, paperH);

    // Paper texture
    ctx.globalAlpha = 0.03 * alpha;
    if (this._paperCanvas) {
      ctx.drawImage(this._paperCanvas, paperX, paperY, paperW, paperH);
    }
    ctx.globalAlpha = 1.0;

    // Faint ruled lines on paper
    ctx.strokeStyle = `rgba(180, 200, 220, ${0.15 * alpha})`;
    ctx.lineWidth = 0.5;
    for (let ly = paperY + 25; ly < paperY + paperH - 10; ly += 20) {
      ctx.beginPath();
      ctx.moveTo(paperX + 10, ly);
      ctx.lineTo(paperX + paperW - 10, ly);
      ctx.stroke();
    }

    // Red margin line
    ctx.strokeStyle = `rgba(220, 120, 120, ${0.2 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paperX + 55, paperY);
    ctx.lineTo(paperX + 55, paperY + paperH);
    ctx.stroke();

    // ── CONTENT ON THE PAPER ──
    const cx = paperX + 65;
    let cy = paperY + 30;
    const maxW = paperW - 80;

    // Red stamp: CLASSIFIED
    ctx.save();
    ctx.translate(paperX + paperW - 80, paperY + 45);
    ctx.rotate(-0.15);
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = `rgba(200, 50, 50, ${0.35 * alpha})`;
    ctx.strokeStyle = `rgba(200, 50, 50, ${0.25 * alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-45, -15, 90, 25);
    ctx.textAlign = 'center';
    ctx.fillText('CLASSIFIED', 0, 3);
    ctx.restore();

    // Case number + classification
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = `rgba(180, 40, 40, ${alpha})`;
    ctx.fillText(`CASE #${c.caseNumber}`, cx, cy);
    cy += 14;
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = `rgba(140, 40, 40, ${0.8 * alpha})`;
    ctx.fillText(c.classification, cx, cy);
    cy += 25;

    // Victim name — handwritten style (larger, darker)
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = `rgba(30, 25, 20, ${alpha})`;
    ctx.fillText(c.victimName, cx, cy);
    cy += 22;

    // Date / location — typewriter style
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = `rgba(60, 50, 40, ${0.8 * alpha})`;
    ctx.fillText(`${c.date}  |  ${c.location}`, cx, cy);
    cy += 25;

    // Separator line
    ctx.strokeStyle = `rgba(60, 50, 40, ${0.2 * alpha})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxW, cy);
    ctx.stroke();
    cy += 18;

    // Description
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = `rgba(40, 35, 28, ${0.9 * alpha})`;
    cy = this._drawWrappedText(ctx, c.description, cx, cy, maxW, 17, `rgba(40, 35, 28, ${0.9 * alpha})`);
    cy += 15;

    // Known facts
    if (c.knownFacts && c.knownFacts.length > 0) {
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = `rgba(40, 35, 28, ${alpha})`;
      ctx.fillText('KNOWN FACTS:', cx, cy);
      cy += 16;

      ctx.font = '11px "Courier New", monospace';
      ctx.fillStyle = `rgba(50, 45, 35, ${0.85 * alpha})`;
      c.knownFacts.forEach(fact => {
        ctx.fillText(`\u2022 ${fact}`, cx + 8, cy);
        cy += 15;
      });
      cy += 12;
    }

    // Evidence to uncover
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = `rgba(40, 35, 28, ${alpha})`;
    ctx.fillText('EVIDENCE TO UNCOVER:', cx, cy);
    cy += 16;

    c.questions.forEach((q) => {
      const revealed = this.revealedClues.includes(q.id);
      ctx.font = '11px "Courier New", monospace';

      if (revealed) {
        // Green checkmark, handwritten-feel answer
        ctx.fillStyle = `rgba(20, 130, 50, ${alpha})`;
        ctx.fillText(`\u2713 ${q.label}: ${q.answer}`, cx + 8, cy);
      } else {
        // Redacted / blacked out
        ctx.fillStyle = `rgba(50, 45, 35, ${0.5 * alpha})`;
        ctx.fillText(`\u25A1 ${q.label}: `, cx + 8, cy);
        // Black redaction bar
        const labelW = ctx.measureText(`\u25A1 ${q.label}: `).width;
        ctx.fillStyle = `rgba(20, 20, 20, ${0.7 * alpha})`;
        ctx.fillRect(cx + 8 + labelW, cy - 9, 80 + Math.random() * 40, 12);
      }
      cy += 17;
    });

    // Bottom instructions — on the folder, below the paper
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = `rgba(100, 80, 55, ${0.5 * alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('Press [TAB] to close  |  [Q] Type or [V] Speak to the spirit', w / 2, folderY + folderH - 8);
    ctx.textAlign = 'left';

    // Paper clip in top-right corner
    this._drawPaperClip(ctx, paperX + paperW - 25, paperY - 5, alpha);
  }

  _drawPaperClip(ctx, x, y, alpha) {
    ctx.strokeStyle = `rgba(160, 160, 170, ${0.7 * alpha})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y + 40);
    ctx.quadraticCurveTo(x, y + 48, x + 8, y + 48);
    ctx.quadraticCurveTo(x + 16, y + 48, x + 16, y + 40);
    ctx.lineTo(x + 16, y + 10);
    ctx.quadraticCurveTo(x + 16, y, x + 8, y);
    ctx.quadraticCurveTo(x, y, x, y + 5);
    ctx.stroke();

    // Inner wire
    ctx.strokeStyle = `rgba(180, 180, 190, ${0.5 * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 8);
    ctx.lineTo(x + 4, y + 42);
    ctx.quadraticCurveTo(x + 4, y + 45, x + 8, y + 45);
    ctx.quadraticCurveTo(x + 12, y + 45, x + 12, y + 42);
    ctx.lineTo(x + 12, y + 8);
    ctx.stroke();
  }

  _drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, fillStyle) {
    const words = text.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillStyle = fillStyle;
        ctx.fillText(line.trim(), x, y);
        line = word + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillStyle = fillStyle;
    ctx.fillText(line.trim(), x, y);
    return y + lineHeight;
  }
}
