import { eventBus } from '../core/EventBus.js';

/**
 * Manages the case file display and state.
 * When open, the screen shows a realistic manila folder with paper inside —
 * no static, no waveform. Background music continues from the level.
 */
export class CaseFile {
  constructor() {
    this.currentCase = null;
    this.isOpen = false;
    this.openProgress = 0;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.revealedClues = [];

    // Paper texture noise (generated once)
    this._paperCanvas = null;

    // Back to menu button bounds (set during draw)
    this._menuBtnBounds = null;

    // Touch scrolling state
    this._touchStartY = null;
    this._touchScrollStart = 0;
    this._scrollVelocity = 0;
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

  // Enable touch scrolling on the canvas
  enableTouch(canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (!this.isOpen) return;
      this._touchStartY = e.touches[0].clientY;
      this._touchScrollStart = this.scrollY;
      this._scrollVelocity = 0;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isOpen || this._touchStartY === null) return;
      const dy = this._touchStartY - e.touches[0].clientY;
      const scale = canvas.height / canvas.getBoundingClientRect().height;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this._touchScrollStart + dy * scale));
      this._scrollVelocity = dy * scale;
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this._touchStartY = null;
    }, { passive: true });

    // Mouse wheel scrolling
    canvas.addEventListener('wheel', (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + e.deltaY));
    }, { passive: false });
  }

  update(dt) {
    const target = this.isOpen ? 1 : 0;
    this.openProgress += (target - this.openProgress) * dt * 4;
    if (Math.abs(this.openProgress - target) < 0.01) {
      this.openProgress = target;
    }

    // Inertia scrolling
    if (this._touchStartY === null && Math.abs(this._scrollVelocity) > 0.5) {
      this.scrollY += this._scrollVelocity * dt;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY));
      this._scrollVelocity *= 0.92;
    }
  }

  _ensureTextures(w, h) {
    if (!this._paperCanvas || this._paperCanvas.width !== w) {
      this._paperCanvas = document.createElement('canvas');
      this._paperCanvas.width = w;
      this._paperCanvas.height = h;
      const pctx = this._paperCanvas.getContext('2d');
      const imageData = pctx.createImageData(w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const grain = Math.random() * 15;
        d[i] = 235 + grain;
        d[i + 1] = 225 + grain;
        d[i + 2] = 200 + grain;
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
    const isMobile = w < 500;

    // ── FULL BLACK BACKGROUND ──
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);

    // ── DESK SURFACE ──
    ctx.fillStyle = `rgba(35, 25, 18, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
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
    const folderW = isMobile ? w * 0.94 : Math.min(w * 0.88, 520);
    const folderH = h * (isMobile ? 0.84 : 0.82);
    const folderX = (w - folderW) / 2;
    const folderY = (h - folderH) / 2 + (1 - alpha) * 80 - (isMobile ? 10 : 0);

    // Folder shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
    ctx.fillRect(folderX + 6, folderY + 6, folderW, folderH);

    // Folder back panel
    ctx.fillStyle = `rgba(195, 170, 120, ${alpha})`;
    ctx.fillRect(folderX - 3, folderY - 3, folderW + 6, folderH + 6);

    // Folder tab
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

    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = `rgba(80, 60, 35, ${alpha})`;
    ctx.textAlign = 'left';
    ctx.fillText('CASE FILE', tabX + 18, tabY + 18);

    // Folder front panel
    ctx.fillStyle = `rgba(210, 185, 135, ${alpha})`;
    ctx.fillRect(folderX, folderY, folderW, folderH);

    // Folder texture
    ctx.globalAlpha = 0.06 * alpha;
    if (this._paperCanvas) {
      ctx.drawImage(this._paperCanvas, folderX, folderY, folderW, folderH);
    }
    ctx.globalAlpha = 1.0;

    // Crease line
    ctx.strokeStyle = `rgba(170, 145, 100, ${0.3 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(folderX, folderY + folderH * 0.02);
    ctx.lineTo(folderX + folderW, folderY + folderH * 0.02);
    ctx.stroke();

    // ── WHITE PAPER ──
    const paperMargin = isMobile ? 10 : 18;
    const paperX = folderX + paperMargin;
    const paperY = folderY + paperMargin + 5;
    const paperW = folderW - paperMargin * 2;
    const paperH = folderH - paperMargin * 2 - 5;

    // Paper shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 * alpha})`;
    ctx.fillRect(paperX + 2, paperY + 2, paperW, paperH);

    // Paper background
    ctx.fillStyle = `rgba(248, 243, 230, ${alpha})`;
    ctx.fillRect(paperX, paperY, paperW, paperH);

    // Paper texture
    ctx.globalAlpha = 0.03 * alpha;
    if (this._paperCanvas) {
      ctx.drawImage(this._paperCanvas, paperX, paperY, paperW, paperH);
    }
    ctx.globalAlpha = 1.0;

    // Red margin line (desktop only)
    if (!isMobile) {
      ctx.strokeStyle = `rgba(220, 120, 120, ${0.2 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paperX + 55, paperY);
      ctx.lineTo(paperX + 55, paperY + paperH);
      ctx.stroke();
    }

    // ── SCROLLABLE CONTENT AREA ──
    // Clip to paper bounds for scrolling
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperX, paperY, paperW, paperH);
    ctx.clip();

    // Apply scroll offset
    const scrollOffset = -this.scrollY;

    // Responsive font sizing
    const baseFontSize = isMobile ? 15 : 13;
    const headingSize = isMobile ? 28 : 22;
    const labelSize = isMobile ? 14 : 12;
    const smallSize = isMobile ? 13 : 11;
    const lineH = isMobile ? 22 : 18;

    const cx = paperX + (isMobile ? 12 : 65);
    let cy = paperY + 35 + scrollOffset;
    const maxW = paperW - (isMobile ? 20 : 80);

    // Faint ruled lines on paper
    ctx.strokeStyle = `rgba(180, 200, 220, ${0.15 * alpha})`;
    ctx.lineWidth = 0.5;
    for (let ly = paperY + 25 + (scrollOffset % 20); ly < paperY + paperH + 200; ly += 20) {
      ctx.beginPath();
      ctx.moveTo(paperX + 10, ly);
      ctx.lineTo(paperX + paperW - 10, ly);
      ctx.stroke();
    }

    // Red stamp: CLASSIFIED
    ctx.save();
    ctx.translate(paperX + paperW - 80, cy + 15);
    ctx.rotate(-0.15);
    ctx.font = `bold ${isMobile ? 20 : 16}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(200, 50, 50, ${0.5 * alpha})`;
    ctx.strokeStyle = `rgba(200, 50, 50, ${0.4 * alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-50, -16, 100, 28);
    ctx.textAlign = 'center';
    ctx.fillText('CLASSIFIED', 0, 4);
    ctx.restore();

    // Case number
    ctx.textAlign = 'left';
    ctx.font = `bold ${labelSize}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(200, 40, 40, ${alpha})`;
    ctx.fillText(`CASE #${c.caseNumber}`, cx, cy);
    cy += labelSize + 5;

    // Classification
    ctx.font = `${smallSize}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(160, 40, 40, ${0.9 * alpha})`;
    ctx.fillText(c.classification, cx, cy);
    cy += 28;

    // Victim name — big and bold
    ctx.font = `bold ${headingSize}px Georgia, serif`;
    ctx.fillStyle = `rgba(20, 15, 10, ${alpha})`;
    ctx.fillText(c.victimName, cx, cy);
    cy += headingSize + 5;

    // Date / location
    ctx.font = `${baseFontSize}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(40, 30, 20, ${0.9 * alpha})`;
    ctx.fillText(`${c.date}  |  ${c.location}`, cx, cy);
    cy += 28;

    // Separator
    ctx.strokeStyle = `rgba(50, 40, 30, ${0.35 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxW, cy);
    ctx.stroke();
    cy += 20;

    // Description
    ctx.font = `${baseFontSize}px "Courier New", monospace`;
    const descColor = `rgba(25, 20, 15, ${0.95 * alpha})`;
    cy = this._drawWrappedText(ctx, c.description, cx, cy, maxW, lineH, descColor);
    cy += 20;

    // Known facts
    if (c.knownFacts && c.knownFacts.length > 0) {
      ctx.font = `bold ${labelSize}px "Courier New", monospace`;
      ctx.fillStyle = `rgba(30, 25, 18, ${alpha})`;
      ctx.fillText('KNOWN FACTS:', cx, cy);
      cy += lineH + 2;

      ctx.font = `${labelSize}px "Courier New", monospace`;
      const factColor = `rgba(30, 25, 18, ${0.9 * alpha})`;
      c.knownFacts.forEach(fact => {
        cy = this._drawWrappedText(ctx, `\u2022 ${fact}`, cx + 10, cy, maxW - 15, lineH, factColor);
        cy += 4;
      });
      cy += 12;
    }

    // Evidence to uncover
    ctx.font = `bold ${labelSize}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(30, 25, 18, ${alpha})`;
    ctx.fillText('EVIDENCE TO UNCOVER:', cx, cy);
    cy += lineH + 2;

    c.questions.forEach((q) => {
      const revealed = this.revealedClues.includes(q.id);
      ctx.font = `${labelSize}px "Courier New", monospace`;

      if (revealed) {
        const revColor = `rgba(15, 120, 40, ${alpha})`;
        cy = this._drawWrappedText(ctx, `\u2713 ${q.label}: ${q.answer}`, cx + 10, cy, maxW - 15, lineH, revColor);
      } else {
        ctx.fillStyle = `rgba(35, 30, 22, ${0.8 * alpha})`;
        ctx.fillText(`\u25A1 ${q.label}: `, cx + 10, cy);
        const labelW = ctx.measureText(`\u25A1 ${q.label}: `).width;
        ctx.fillStyle = `rgba(15, 15, 15, ${0.8 * alpha})`;
        ctx.fillRect(cx + 10 + labelW, cy - 11, 100, 15);
        cy += lineH;
      }
      cy += 4;
    });

    // Calculate max scroll from content height
    const contentBottom = cy - scrollOffset - paperY;
    this.maxScrollY = Math.max(0, contentBottom - paperH + 30);

    ctx.restore(); // End clipping

    // Scroll indicator (if content overflows)
    if (this.maxScrollY > 0) {
      const scrollRatio = this.scrollY / this.maxScrollY;
      const trackH = paperH - 20;
      const thumbH = Math.max(30, trackH * (paperH / (paperH + this.maxScrollY)));
      const thumbY = paperY + 10 + scrollRatio * (trackH - thumbH);

      // Track
      ctx.fillStyle = `rgba(180, 160, 120, ${0.2 * alpha})`;
      ctx.fillRect(paperX + paperW - 6, paperY + 10, 4, trackH);

      // Thumb
      ctx.fillStyle = `rgba(140, 120, 80, ${0.5 * alpha})`;
      ctx.fillRect(paperX + paperW - 6, thumbY, 4, thumbH);

      // Scroll hint at bottom
      if (this.scrollY < this.maxScrollY - 10) {
        ctx.font = `${isMobile ? 12 : 10}px "Courier New", monospace`;
        ctx.fillStyle = `rgba(100, 80, 55, ${0.6 * alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC Scroll for more \u25BC', w / 2, paperY + paperH - 8);
      }
    }

    // Bottom instructions on the folder
    ctx.font = `${isMobile ? 11 : 10}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(100, 80, 55, ${0.5 * alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText(isMobile ? 'Swipe to scroll' : '[TAB] Close  |  [Q] Type  |  [V] Speak', w / 2, folderY + folderH - 8);

    // ── MAIN MENU BUTTON ──
    const btnW = isMobile ? 200 : 180;
    const btnH = isMobile ? 44 : 36;
    const btnX = (w - btnW) / 2;
    const btnY = folderY + folderH + 10;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * alpha})`;
    ctx.strokeStyle = `rgba(0, 255, 65, ${0.4 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = `bold ${isMobile ? 14 : 12}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(0, 255, 65, ${0.7 * alpha})`;
    ctx.fillText('\u25C0 MAIN MENU', w / 2, btnY + btnH / 2 + 5);
    ctx.textAlign = 'left';

    this._menuBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Paper clip
    this._drawPaperClip(ctx, paperX + paperW - 25, paperY - 5, alpha);
  }

  hitTestMenuButton(px, py) {
    if (!this._menuBtnBounds || !this.isOpen) return false;
    const b = this._menuBtnBounds;
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
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
