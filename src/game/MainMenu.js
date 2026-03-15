import { CASES } from '../data/cases.js';
import { LEVELS } from '../data/levels.js';

const SAVE_KEY = 'ghost-frequency-progress';

export class MainMenu {
  constructor(ghostCollection) {
    this.ghostCollection = ghostCollection;
    this.active = true;

    // Menu items (INSTALL APP added dynamically when available)
    this.items = ['NEW GAME', 'CONTINUE', 'CASES', 'SETTINGS'];
    this.selectedIndex = 0;

    // PWA install prompt
    this.installPrompt = null;
    this.installAvailable = false;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.installAvailable = true;
      // Add install option if not already there
      if (!this.items.includes('INSTALL APP')) {
        this.items.push('INSTALL APP');
      }
    });
    window.addEventListener('appinstalled', () => {
      this.installAvailable = false;
      this.installPrompt = null;
      const idx = this.items.indexOf('INSTALL APP');
      if (idx !== -1) this.items.splice(idx, 1);
    });

    // Sub-menus
    this.subMenu = null; // 'cases' | 'settings' | null
    this.caseScrollY = 0;
    this.caseSelectedIndex = 0;

    // Settings state
    this.settings = this._loadSettings();
    this.settingsItems = ['Master Volume', 'Music Volume', 'SFX Volume', 'Camera', 'Back'];
    this.settingsIndex = 0;

    // Social links
    this.socialLinks = [
      { name: 'Facebook', icon: 'f', color: '#1877f2' },
      { name: 'Instagram', icon: 'ig', color: '#e4405f' },
      { name: 'X', icon: 'X', color: '#ffffff' },
      { name: 'TikTok', icon: 'tt', color: '#00f2ea' },
    ];

    // Touch/click support — store hit regions for menu items
    this.hitRegions = []; // [{ x, y, w, h, action }]
    this.pendingTapAction = null; // set by tap handler, consumed by handleInput

    // Animation state
    this.time = 0;
    this.titleGlow = 0;

    // Background silhouettes and trees
    this.silhouettes = this._generateSilhouettes();
    this.trees = this._generateTrees();

    // Static noise
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 128;
    this.noiseCanvas.height = 128;
    this.noiseCtx = this.noiseCanvas.getContext('2d');
    this.noiseFrame = 0;

    // Saved progress
    this.savedLevel = this._loadProgress();
  }

  _generateSilhouettes() {
    // Generate random ghostly figure positions — more visible
    const figures = [];
    for (let i = 0; i < 8; i++) {
      figures.push({
        x: 0.05 + Math.random() * 0.9,
        y: 0.3 + Math.random() * 0.5,
        scale: 0.6 + Math.random() * 1.0,
        alpha: 0.08 + Math.random() * 0.12,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.15 + Math.random() * 0.3,
        flickerRate: 0.5 + Math.random() * 2,
      });
    }
    return figures;
  }

  _generateTrees() {
    // Generate dark tree silhouettes for the background
    const trees = [];
    for (let i = 0; i < 14; i++) {
      const branches = [];
      const numBranches = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < numBranches; b++) {
        const subTwigs = [];
        for (let t = 0; t < 3; t++) {
          subTwigs.push({ offset: 0.2 + t * 0.15 });
        }
        branches.push({
          side: b % 2 === 0 ? -1 : 1,
          curveY: 0.3 + Math.random() * 0.2,
          subTwigs,
        });
      }
      trees.push({
        x: i / 14 + (Math.random() - 0.5) * 0.08,
        height: 0.4 + Math.random() * 0.35,
        width: 0.04 + Math.random() * 0.05,
        branches,
        lean: (Math.random() - 0.5) * 0.15,
      });
    }
    return trees;
  }

  _loadProgress() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) return JSON.parse(data).level || 0;
    } catch { /* ignore */ }
    return 0;
  }

  saveProgress(level) {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ level, timestamp: Date.now() }));
    this.savedLevel = level;
  }

  _loadSettings() {
    try {
      const data = localStorage.getItem('ghost-frequency-settings');
      if (data) return JSON.parse(data);
    } catch { /* ignore */ }
    return { masterVol: 0.8, musicVol: 0.7, sfxVol: 0.9, camera: true };
  }

  _saveSettings() {
    localStorage.setItem('ghost-frequency-settings', JSON.stringify(this.settings));
  }

  /**
   * Call once after canvas is available to enable touch/click on menu items.
   */
  enableTouch(canvas) {
    const handler = (e) => {
      if (!this.active) return;

      let clientX, clientY;
      if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Canvas might be scaled by devicePixelRatio but hit regions use CSS coords
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      for (const region of this.hitRegions) {
        if (x >= region.x && x <= region.x + region.w &&
            y >= region.y && y <= region.y + region.h) {
          this.pendingTapAction = region.action;
          break;
        }
      }
    };

    canvas.addEventListener('click', handler);
    canvas.addEventListener('touchstart', (e) => {
      // Only handle taps during menu phase
      if (!this.active) return;
      e.preventDefault();
      handler(e);
    }, { passive: false });
  }

  handleInput(inputManager) {
    if (!this.active) return null;

    // Process tap actions from touch/click
    if (this.pendingTapAction) {
      const action = this.pendingTapAction;
      this.pendingTapAction = null;
      return this._executeTapAction(action);
    }

    // Cases sub-menu
    if (this.subMenu === 'cases') {
      if (inputManager.wasJustPressed('ArrowUp')) {
        this.caseSelectedIndex = Math.max(0, this.caseSelectedIndex - 1);
      }
      if (inputManager.wasJustPressed('ArrowDown')) {
        this.caseSelectedIndex = Math.min(CASES.length - 1, this.caseSelectedIndex + 1);
      }
      if (inputManager.wasJustPressed('Escape') || inputManager.wasJustPressed('Backspace')) {
        this.subMenu = null;
      }
      if (inputManager.wasJustPressed('Enter') || inputManager.wasJustPressed('Space')) {
        // Start from selected case
        this.active = false;
        return { action: 'startLevel', level: this.caseSelectedIndex };
      }
      return null;
    }

    // Settings sub-menu
    if (this.subMenu === 'settings') {
      if (inputManager.wasJustPressed('ArrowUp')) {
        this.settingsIndex = Math.max(0, this.settingsIndex - 1);
      }
      if (inputManager.wasJustPressed('ArrowDown')) {
        this.settingsIndex = Math.min(this.settingsItems.length - 1, this.settingsIndex + 1);
      }
      if (inputManager.wasJustPressed('ArrowLeft')) {
        this._adjustSetting(-0.1);
      }
      if (inputManager.wasJustPressed('ArrowRight')) {
        this._adjustSetting(0.1);
      }
      if (inputManager.wasJustPressed('Enter') || inputManager.wasJustPressed('Space')) {
        if (this.settingsIndex === 3) {
          // Toggle camera
          this.settings.camera = !this.settings.camera;
          this._saveSettings();
        } else if (this.settingsIndex === 4) {
          // Back
          this.subMenu = null;
        }
      }
      if (inputManager.wasJustPressed('Escape') || inputManager.wasJustPressed('Backspace')) {
        this.subMenu = null;
      }
      return null;
    }

    // Main menu navigation
    if (inputManager.wasJustPressed('ArrowUp')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    }
    if (inputManager.wasJustPressed('ArrowDown')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    }
    if (inputManager.wasJustPressed('Enter') || inputManager.wasJustPressed('Space')) {
      return this._selectItem();
    }

    return null;
  }

  _adjustSetting(delta) {
    switch (this.settingsIndex) {
      case 0:
        this.settings.masterVol = Math.max(0, Math.min(1, this.settings.masterVol + delta));
        break;
      case 1:
        this.settings.musicVol = Math.max(0, Math.min(1, this.settings.musicVol + delta));
        break;
      case 2:
        this.settings.sfxVol = Math.max(0, Math.min(1, this.settings.sfxVol + delta));
        break;
    }
    this._saveSettings();
  }

  _selectItem() {
    const item = this.items[this.selectedIndex];
    switch (item) {
      case 'NEW GAME':
        this.ghostCollection.reset();
        localStorage.removeItem(SAVE_KEY);
        this.active = false;
        return { action: 'newGame' };
      case 'CONTINUE':
        if (this.savedLevel > 0 || this.ghostCollection.count() > 0) {
          this.active = false;
          return { action: 'continue', level: this.savedLevel };
        }
        return null; // No save to continue
      case 'CASES':
        this.subMenu = 'cases';
        this.caseSelectedIndex = 0;
        return null;
      case 'SETTINGS':
        this.subMenu = 'settings';
        this.settingsIndex = 0;
        return null;
      case 'INSTALL APP':
        this._triggerInstall();
        return null;
    }
    return null;
  }

  async _triggerInstall() {
    if (!this.installPrompt) return;
    this.installPrompt.prompt();
    const result = await this.installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      this.installAvailable = false;
      this.installPrompt = null;
      const idx = this.items.indexOf('INSTALL APP');
      if (idx !== -1) this.items.splice(idx, 1);
      if (this.selectedIndex >= this.items.length) {
        this.selectedIndex = this.items.length - 1;
      }
    }
  }

  _executeTapAction(action) {
    if (action.type === 'menuItem') {
      this.selectedIndex = action.index;
      return this._selectItem();
    }
    if (action.type === 'caseItem') {
      this.caseSelectedIndex = action.index;
      this.active = false;
      return { action: 'startLevel', level: action.index };
    }
    if (action.type === 'settingsToggle') {
      this.settingsIndex = action.index;
      if (action.index === 3) {
        this.settings.camera = !this.settings.camera;
        this._saveSettings();
      } else if (action.index === 4) {
        this.subMenu = null;
      }
      return null;
    }
    if (action.type === 'back') {
      this.subMenu = null;
      return null;
    }
    return null;
  }

  update(dt) {
    this.time += dt;
    this.titleGlow = 0.6 + Math.sin(this.time * 1.5) * 0.4;
  }

  draw(ctx, w, h) {
    if (!this.active) return;

    // Night sky base
    ctx.fillStyle = '#060d08';
    ctx.fillRect(0, 0, w, h);

    // Moon glow — bright spot behind the trees for silhouette contrast
    const moonX = w * 0.5;
    const moonY = h * 0.15;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.55);
    moonGlow.addColorStop(0, 'rgba(60, 120, 80, 0.5)');
    moonGlow.addColorStop(0.15, 'rgba(40, 90, 55, 0.35)');
    moonGlow.addColorStop(0.4, 'rgba(20, 50, 30, 0.2)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, w, h);

    // Static noise background
    this._drawStaticBg(ctx, w, h);

    // Dark woods background
    this._drawTrees(ctx, w, h);

    // Ghostly silhouettes among the trees
    this._drawSilhouettes(ctx, w, h);

    // Vignette — subtle, don't hide the trees
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.9);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (this.subMenu === 'cases') {
      this._drawCasesMenu(ctx, w, h);
    } else if (this.subMenu === 'settings') {
      this._drawSettingsMenu(ctx, w, h);
    } else {
      this._drawMainMenu(ctx, w, h);
    }

    // Faint scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  _drawStaticBg(ctx, w, h) {
    this.noiseFrame++;
    if (this.noiseFrame % 3 === 0) {
      const imgData = this.noiseCtx.createImageData(128, 128);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
      this.noiseCtx.putImageData(imgData, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.noiseCanvas, 0, 0, w, h);
    ctx.restore();
  }

  _drawSilhouettes(ctx, w, h) {
    ctx.save();
    for (const fig of this.silhouettes) {
      const flicker = Math.sin(this.time * fig.flickerRate) * 0.5 + 0.5;
      const alpha = (fig.alpha + 0.1) * (0.5 + flicker * 0.5);
      if (alpha < 0.02) continue;

      const fx = fig.x * w + Math.sin(this.time * fig.driftSpeed + fig.drift) * 20;
      const fy = fig.y * h;
      const scale = fig.scale;

      ctx.globalAlpha = alpha;

      // Ghostly glow behind the figure
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(100, 255, 120, 0.5)';

      // Head
      ctx.fillStyle = 'rgba(200, 230, 200, 0.8)';
      ctx.beginPath();
      ctx.ellipse(fx, fy - 60 * scale, 18 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body — tapered, flowing ghost shape
      ctx.beginPath();
      ctx.moveTo(fx - 20 * scale, fy - 40 * scale);
      ctx.lineTo(fx + 20 * scale, fy - 40 * scale);
      ctx.quadraticCurveTo(fx + 22 * scale, fy + 20 * scale, fx + 12 * scale, fy + 60 * scale);
      // Wispy bottom edge
      ctx.quadraticCurveTo(fx + 5 * scale, fy + 50 * scale, fx, fy + 65 * scale);
      ctx.quadraticCurveTo(fx - 5 * scale, fy + 50 * scale, fx - 12 * scale, fy + 60 * scale);
      ctx.quadraticCurveTo(fx - 22 * scale, fy + 20 * scale, fx - 20 * scale, fy - 40 * scale);
      ctx.closePath();
      ctx.fill();

      // Dark hollow eyes
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.beginPath();
      ctx.ellipse(fx - 7 * scale, fy - 65 * scale, 5 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fx + 7 * scale, fy - 65 * scale, 5 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mouth — open, screaming
      ctx.beginPath();
      ctx.ellipse(fx, fy - 50 * scale, 5 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawTrees(ctx, w, h) {
    ctx.save();
    const groundY = h * 0.92;

    for (const tree of this.trees) {
      const tx = tree.x * w;
      const trunkH = tree.height * h;
      const trunkW = tree.width * w;
      const baseY = groundY;
      const topY = baseY - trunkH;

      // Trunk — solid black silhouette
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(tx - trunkW * 0.5 + tree.lean * trunkH, topY + trunkH * 0.15);
      ctx.lineTo(tx + trunkW * 0.5 + tree.lean * trunkH, topY + trunkH * 0.15);
      ctx.lineTo(tx + trunkW * 0.8, baseY);
      ctx.lineTo(tx - trunkW * 0.8, baseY);
      ctx.closePath();
      ctx.fill();

      // Branches — thick, gnarled, pre-computed
      ctx.strokeStyle = '#000';
      ctx.lineCap = 'round';
      const numBranches = tree.branches.length;

      for (let b = 0; b < numBranches; b++) {
        const br = tree.branches[b];
        const bRatio = b / numBranches;
        const bY = topY + trunkH * 0.05 + bRatio * trunkH * 0.45;
        const bX = tx + tree.lean * (baseY - bY);
        const length = trunkW * (3 + bRatio * 4);

        ctx.lineWidth = Math.max(3, trunkW * 0.35);
        ctx.beginPath();
        ctx.moveTo(bX, bY);
        const endX = bX + br.side * length;
        const endY = bY - length * br.curveY;
        ctx.quadraticCurveTo(
          bX + br.side * length * 0.5, bY - length * 0.4,
          endX, endY
        );
        ctx.stroke();

        // Sub-branches — twigs
        ctx.lineWidth = Math.max(1.5, trunkW * 0.15);
        for (const twig of br.subTwigs) {
          const sx = bX + (endX - bX) * twig.offset;
          const sy = bY + (endY - bY) * twig.offset;
          const tLen = length * 0.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + br.side * tLen * twig.offset, sy - tLen * 0.4);
          ctx.stroke();
        }
      }
    }

    // Ground fog — eerie green tint
    const fogGrad = ctx.createLinearGradient(0, groundY - h * 0.2, 0, groundY + 10);
    fogGrad.addColorStop(0, 'rgba(0, 20, 5, 0)');
    fogGrad.addColorStop(0.4, 'rgba(0, 25, 8, 0.12)');
    fogGrad.addColorStop(0.7, 'rgba(0, 20, 5, 0.25)');
    fogGrad.addColorStop(1, 'rgba(0, 10, 3, 0.5)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, groundY - h * 0.2, w, h * 0.2 + 10);

    // Ground
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.restore();
  }

  _drawMainMenu(ctx, w, h) {
    const cx = w / 2;

    // Clear hit regions for this frame
    this.hitRegions = [];

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30 + this.titleGlow * 20;
    ctx.shadowColor = '#00ff41';
    ctx.font = `bold ${Math.min(42, w * 0.065)}px "Courier New", monospace`;
    ctx.fillStyle = '#00ff41';
    ctx.fillText('GHOST FREQUENCY', cx, h * 0.18);

    // Subtitle
    ctx.shadowBlur = 10;
    ctx.font = `${Math.min(14, w * 0.025)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(0, 255, 65, 0.5)';
    ctx.fillText('PARANORMAL INVESTIGATION UNIT', cx, h * 0.23);

    // Horizontal rule
    const lineW = Math.min(300, w * 0.5);
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - lineW / 2, h * 0.26);
    ctx.lineTo(cx + lineW / 2, h * 0.26);
    ctx.stroke();

    // Menu items
    const menuStartY = h * 0.35;
    const itemSpacing = Math.min(55, h * 0.08);
    ctx.font = `${Math.min(22, w * 0.04)}px "Courier New", monospace`;

    this.items.forEach((item, i) => {
      const y = menuStartY + i * itemSpacing;
      // Register tap region for this menu item
      this.hitRegions.push({
        x: cx - 150, y: y - 22, w: 300, h: 44,
        action: { type: 'menuItem', index: i },
      });
      const y = menuStartY + i * itemSpacing;
      const isSelected = i === this.selectedIndex;
      const isContinueDisabled = item === 'CONTINUE' && this.savedLevel === 0 && this.ghostCollection.count() === 0;
      const isInstall = item === 'INSTALL APP';

      // Hover glow background
      if (isSelected) {
        const glowColor = isInstall ? 'rgba(65, 200, 255, 0.06)' : 'rgba(0, 255, 65, 0.06)';
        const borderColor = isInstall ? 'rgba(65, 200, 255, 0.3)' : 'rgba(0, 255, 65, 0.3)';
        ctx.fillStyle = glowColor;
        ctx.fillRect(cx - 150, y - 18, 300, 36);
        ctx.strokeStyle = borderColor;
        ctx.strokeRect(cx - 150, y - 18, 300, 36);
      }

      if (isContinueDisabled) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.shadowBlur = 0;
      } else if (isSelected && isInstall) {
        ctx.fillStyle = '#41c8ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#41c8ff';
      } else if (isSelected) {
        ctx.fillStyle = '#00ff41';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ff41';
      } else if (isInstall) {
        ctx.fillStyle = 'rgba(65, 200, 255, 0.5)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(0, 255, 65, 0.5)';
        ctx.shadowBlur = 0;
      }

      // Selection indicator + label
      let label = item;
      if (isInstall) label = '[+] ' + item;
      if (isSelected) label = '> ' + label + ' <';
      if (item === 'CONTINUE' && this.savedLevel > 0) {
        label = item + ` (Case ${this.savedLevel + 1})`;
        if (isSelected) label = '> ' + label + ' <';
      }

      ctx.fillText(label, cx, y + 6);
    });

    // Ghost count
    const ghosts = this.ghostCollection.count();
    if (ghosts > 0) {
      ctx.font = `${Math.min(13, w * 0.022)}px "Courier New", monospace`;
      ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#00ff41';
      ctx.fillText(`CAPTURED SPIRITS: ${ghosts}/${Object.keys(CASES).length}`, cx, menuStartY + this.items.length * itemSpacing + 20);
    }

    // Social links at bottom
    this._drawSocialLinks(ctx, w, h);

    // Controls hint
    ctx.font = `${Math.min(11, w * 0.02)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('[UP/DOWN] Navigate  [ENTER] Select', cx, h - 20);

    ctx.restore();
  }

  _drawCasesMenu(ctx, w, h) {
    const cx = w / 2;
    this.hitRegions = [];
    ctx.save();
    ctx.textAlign = 'center';

    // Back button region at bottom
    this.hitRegions.push({
      x: cx - 100, y: h - 45, w: 200, h: 35,
      action: { type: 'back' },
    });

    // Title
    ctx.font = `bold ${Math.min(28, w * 0.045)}px "Courier New", monospace`;
    ctx.fillStyle = '#00ff41';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff41';
    ctx.fillText('CASE FILES', cx, h * 0.1);

    // Cases list
    const startY = h * 0.18;
    const cardH = Math.min(90, h * 0.13);
    const cardW = Math.min(500, w * 0.85);
    const cardX = cx - cardW / 2;

    CASES.forEach((c, i) => {
      const y = startY + i * (cardH + 10);
      const isSelected = i === this.caseSelectedIndex;
      const isSolved = this.ghostCollection.has(c.ghost.id);

      // Register tap region for this case card
      this.hitRegions.push({
        x: cardX, y: y, w: cardW, h: cardH,
        action: { type: 'caseItem', index: i },
      });

      // Card background
      ctx.fillStyle = isSelected
        ? 'rgba(0, 255, 65, 0.08)'
        : 'rgba(20, 20, 20, 0.6)';
      ctx.fillRect(cardX, y, cardW, cardH);

      // Card border
      ctx.strokeStyle = isSelected
        ? 'rgba(0, 255, 65, 0.5)'
        : 'rgba(0, 255, 65, 0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(cardX, y, cardW, cardH);

      // Case number badge
      ctx.fillStyle = isSolved ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 60, 60, 0.1)';
      ctx.fillRect(cardX, y, 6, cardH);

      // Case number
      ctx.textAlign = 'left';
      ctx.font = `bold ${Math.min(11, w * 0.02)}px "Courier New", monospace`;
      ctx.fillStyle = isSolved ? '#00ff41' : '#ff4444';
      ctx.shadowBlur = 0;
      ctx.fillText(`CASE #${c.caseNumber}`, cardX + 15, y + 18);

      // Status badge
      ctx.textAlign = 'right';
      ctx.font = `bold ${Math.min(10, w * 0.018)}px "Courier New", monospace`;
      if (isSolved) {
        ctx.fillStyle = '#00ff41';
        ctx.fillText('CLOSED', cardX + cardW - 12, y + 18);
      } else {
        ctx.fillStyle = '#ff4444';
        ctx.fillText('OPEN', cardX + cardW - 12, y + 18);
      }

      // Victim name
      ctx.textAlign = 'left';
      ctx.font = `bold ${Math.min(16, w * 0.028)}px "Georgia", serif`;
      ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = isSelected ? 5 : 0;
      ctx.shadowColor = c.ghost.color;
      ctx.fillText(c.victimName, cardX + 15, y + 40);

      // Classification
      ctx.font = `${Math.min(10, w * 0.017)}px "Courier New", monospace`;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.shadowBlur = 0;
      ctx.fillText(c.classification, cardX + 15, y + 55);

      // Location & date
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.fillText(`${c.location}  |  ${c.date}`, cardX + 15, y + 70);

      // Ghost color accent dot
      ctx.beginPath();
      ctx.arc(cardX + cardW - 25, y + cardH / 2 + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = c.ghost.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = c.ghost.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
    });

    // Controls
    ctx.font = `${Math.min(11, w * 0.02)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillText('[UP/DOWN] Select Case  [ENTER] Investigate  [ESC] Back', cx, h - 20);

    ctx.restore();
  }

  _drawSettingsMenu(ctx, w, h) {
    const cx = w / 2;
    this.hitRegions = [];
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.font = `bold ${Math.min(28, w * 0.045)}px "Courier New", monospace`;
    ctx.fillStyle = '#00ff41';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff41';
    ctx.fillText('SETTINGS', cx, h * 0.15);

    const startY = h * 0.3;
    const spacing = Math.min(50, h * 0.075);
    ctx.font = `${Math.min(16, w * 0.03)}px "Courier New", monospace`;

    this.settingsItems.forEach((item, i) => {
      const y = startY + i * spacing;
      // Register tap region for each settings item
      this.hitRegions.push({
        x: cx - 160, y: y - 18, w: 320, h: 36,
        action: { type: 'settingsToggle', index: i },
      });
      const y = startY + i * spacing;
      const isSelected = i === this.settingsIndex;

      ctx.fillStyle = isSelected ? '#00ff41' : 'rgba(0, 255, 65, 0.4)';
      ctx.shadowBlur = isSelected ? 10 : 0;
      ctx.shadowColor = '#00ff41';

      if (i < 3) {
        // Volume sliders
        const vals = [this.settings.masterVol, this.settings.musicVol, this.settings.sfxVol];
        const val = vals[i];
        const barW = 150;
        const barX = cx - barW / 2 + 60;

        ctx.textAlign = 'right';
        ctx.fillText(item, cx - 20, y);

        // Slider track
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 255, 65, 0.15)';
        ctx.fillRect(barX, y - 8, barW, 10);

        // Slider fill
        ctx.fillStyle = isSelected ? '#00ff41' : 'rgba(0, 255, 65, 0.4)';
        ctx.fillRect(barX, y - 8, barW * val, 10);

        // Value text
        ctx.fillText(`${Math.round(val * 100)}%`, barX + barW + 10, y);
      } else if (i === 3) {
        // Camera toggle
        ctx.textAlign = 'center';
        ctx.fillText(`Camera: ${this.settings.camera ? 'ON' : 'OFF'}`, cx, y);
      } else {
        // Back
        ctx.textAlign = 'center';
        if (isSelected) {
          ctx.fillText('> BACK <', cx, y);
        } else {
          ctx.fillText('BACK', cx, y);
        }
      }
    });

    // Controls
    ctx.textAlign = 'center';
    ctx.font = `${Math.min(11, w * 0.02)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('[LEFT/RIGHT] Adjust  [ENTER] Toggle  [ESC] Back', cx, h - 20);

    ctx.restore();
  }

  _drawSocialLinks(ctx, w, h) {
    const cx = w / 2;
    const y = h * 0.78;
    const iconSize = 28;
    const spacing = 50;
    const totalW = (this.socialLinks.length - 1) * spacing;
    const startX = cx - totalW / 2;

    ctx.save();
    ctx.textAlign = 'center';

    // Section label
    ctx.font = `${Math.min(10, w * 0.018)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.shadowBlur = 0;
    ctx.fillText('SHARE YOUR REACTIONS', cx, y - 25);

    this.socialLinks.forEach((link, i) => {
      const x = startX + i * spacing;

      // Circle background
      ctx.beginPath();
      ctx.arc(x, y, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
      ctx.fill();
      ctx.strokeStyle = link.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon letter
      ctx.font = `bold ${Math.min(12, w * 0.022)}px "Courier New", monospace`;
      ctx.fillStyle = link.color;
      ctx.fillText(link.icon, x, y + 4);
    });

    ctx.restore();
  }
}
