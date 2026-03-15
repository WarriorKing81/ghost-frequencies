import { GameLoop } from './core/GameLoop.js';
import { EventBus, eventBus } from './core/EventBus.js';
import { Renderer } from './rendering/Renderer.js';
import { WaveformDrawer } from './rendering/WaveformDrawer.js';
import { UIOverlay } from './rendering/UIOverlay.js';
import { ScreenEffects } from './rendering/ScreenEffects.js';
import { CameraFeed } from './rendering/CameraFeed.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SoundBank } from './audio/SoundBank.js';
import { InputManager } from './core/InputManager.js';
import { RadioTuner } from './audio/RadioTuner.js';
import { Atmosphere } from './audio/Atmosphere.js';
import { GameState } from './game/GameState.js';
import { GhostCollection } from './game/GhostCollection.js';
import { LevelManager } from './game/LevelManager.js';
import { CaseFile } from './game/CaseFile.js';
import { QuestionSystem } from './game/QuestionSystem.js';
import { ThreatSystem } from './game/ThreatSystem.js';
import { ReactionRecorder } from './game/ReactionRecorder.js';
import { MainMenu } from './game/MainMenu.js';
import { LightSensor } from './camera/LightSensor.js';
import { FaceReaction } from './camera/FaceReaction.js';

// Systems (constructed immediately)
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const audioEngine = new AudioEngine();
const soundBank = new SoundBank(audioEngine);
const waveformDrawer = new WaveformDrawer();
const uiOverlay = new UIOverlay();
const screenEffects = new ScreenEffects();
const gameState = new GameState();
const ghostCollection = new GhostCollection();
const caseFile = new CaseFile();
const lightSensor = new LightSensor();
const cameraFeed = new CameraFeed(lightSensor);
const faceReaction = new FaceReaction(lightSensor);
const mainMenu = new MainMenu(ghostCollection);
mainMenu.enableTouch(canvas);

// Systems initialized after audio context (on user tap)
let inputManager = null;
let radioTuner = null;
let atmosphere = null;
let questionSystem = null;
let threatSystem = null;
let reactionRecorder = null;
let levelManager = null;

// Light penalty
let lightPenalty = 0;

// ── UPDATE ──────────────────────────────────────────────────────────
function update(dt) {
  if (!inputManager) return;

  // Main menu phase
  if (gameState.phase === 'menu') {
    mainMenu.update(dt);
    const action = mainMenu.handleInput(inputManager);
    if (action) {
      handleMenuAction(action);
    }
    inputManager.clearJustPressed();
    return;
  }

  // Handle input for menus BEFORE game logic
  handleMenuInput();

  // Don't update game logic during case file view or end
  if (gameState.phase === 'end') return;

  // Case file overlay — only update its animation
  if (gameState.phase === 'casefile') {
    caseFile.update(dt);
    if (atmosphere) atmosphere.update(dt);
    if (!caseFile.isOpen) {
      gameState.setPhase('playing');
      atmosphere.stopCreepyMusic();
    }
    return;
  }

  // Threat system — update even during scare/fail (it manages its own state)
  const proximity = radioTuner.getProximity();
  const isListening = questionSystem.isListening();
  threatSystem.update(dt, proximity, isListening);

  // During scare or fail screen, freeze all other game systems
  if (threatSystem.scareActive || threatSystem.failed) {
    inputManager.clearJustPressed();
    return;
  }

  // Input → tuner (only when not typing a question)
  if (!questionSystem.inputOpen) {
    const dialDelta = inputManager.consumeDialDelta();
    radioTuner.update(dt, dialDelta);
  }

  // Question system
  questionSystem.update(dt);

  // Reaction recorder
  reactionRecorder.update(dt);

  // Light sensor
  lightSensor.update(dt);
  if (lightSensor.active) {
    const targetPenalty = lightSensor.isTooLight() ? 1.0
      : lightSensor.getStatus() === 'warning' ? 0.5
      : 0;
    lightPenalty += (targetPenalty - lightPenalty) * dt * 2;
  }

  // Face reaction detection
  faceReaction.update(dt);

  // Camera feed glitch when threat is high
  cameraFeed.setGlitch(threatSystem.threatLevel);

  // Atmosphere
  if (atmosphere) atmosphere.update(dt);

  // UI + state
  uiOverlay.update(dt);
  caseFile.update(dt);
  gameState.update(dt);

  // Clear just-pressed keys at end of frame
  inputManager.clearJustPressed();
}

// ── MENU ACTIONS ────────────────────────────────────────────────────
function handleMenuAction(action) {
  stopMenuMusic();

  // Restore radio static + atmosphere drones for gameplay
  const ctx = audioEngine.getContext();
  radioTuner.noiseGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.3);
  atmosphere.droneGain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.5);
  atmosphere.subGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.5);

  // Apply settings to audio engine
  const s = mainMenu.settings;
  audioEngine.setMasterVolume(s.masterVol);

  switch (action.action) {
    case 'newGame':
      levelManager.loadLevel(0);
      break;
    case 'continue':
      levelManager.loadLevel(action.level || 0);
      break;
    case 'startLevel':
      levelManager.loadLevel(action.level);
      break;
  }
}

// ── MENU INPUT ──────────────────────────────────────────────────────
function handleMenuInput() {
  if (!inputManager) return;

  // Block all input during scare / fail screen
  if (threatSystem && (threatSystem.scareActive || threatSystem.failed)) return;

  // Tab — toggle case file
  if (inputManager.wasJustPressed('Tab')) {
    if (gameState.phase === 'casefile') {
      caseFile.close();
      atmosphere.stopCreepyMusic();
    } else if (gameState.phase === 'playing') {
      if (questionSystem.inputOpen) {
        questionSystem.closeInput();
      } else {
        caseFile.toggle();
        if (caseFile.isOpen) {
          atmosphere.startCreepyMusic();
        } else {
          atmosphere.stopCreepyMusic();
        }
      }
    }
  }

  // Q — open text input to ask the spirit a question
  if (inputManager.wasJustPressed('KeyQ') && gameState.phase === 'playing') {
    if (!caseFile.isOpen) {
      questionSystem.toggleInput();
    }
  }

  // V — voice input (speak your question)
  if (inputManager.wasJustPressed('KeyV') && gameState.phase === 'playing') {
    if (!caseFile.isOpen) {
      questionSystem.startVoice();
    }
  }

  // Reaction recording share controls
  if (reactionRecorder.showSharePrompt) {
    if (inputManager.wasJustPressed('KeyS')) reactionRecorder.shareReaction();
    if (inputManager.wasJustPressed('KeyD')) reactionRecorder.downloadReaction();
    if (inputManager.wasJustPressed('Escape')) reactionRecorder.showSharePrompt = false;
  }
}

// ── RENDER ──────────────────────────────────────────────────────────
function render(alpha) {
  // Main menu takes over rendering entirely
  if (gameState.phase === 'menu') {
    renderer.render(alpha, [
      (ctx, w, h) => mainMenu.draw(ctx, w, h),
    ]);
    return;
  }

  const proximity = radioTuner ? radioTuner.getProximity() : 0;
  const caseFileUp = caseFile.isOpen && caseFile.openProgress > 0.5;

  renderer.render(alpha, [
    // Scanlines (hidden during case file)
    (ctx, w, h) => {
      if (!caseFileUp) screenEffects.drawScanlines(ctx, w, h);
    },

    // Waveform (hidden during case file)
    (ctx, w, h) => {
      if (radioTuner && !caseFileUp) {
        waveformDrawer.draw(ctx, w, h, radioTuner.getAnalyserData(), proximity);
      }
    },

    // UI overlay — frequency dial, signal %, capture ring (hidden during case file)
    (ctx, w, h) => {
      if (radioTuner && !caseFileUp) {
        const captureProgress = questionSystem.getAnswerProgress();
        uiOverlay.draw(ctx, w, h, radioTuner.getFrequency(), proximity, captureProgress);
      }
    },

    // Question system UI (hidden during case file)
    (ctx, w, h) => {
      if (questionSystem && !caseFileUp) questionSystem.draw(ctx, w, h);
    },

    // Camera feed PiP (hidden during case file)
    (ctx, w, h) => {
      if (!caseFileUp) cameraFeed.draw(ctx, w, h);
    },

    // Ghost collection count (hidden during case file)
    (ctx, w, h) => {
      if (caseFileUp) return;
      const count = ghostCollection.count();
      if (count > 0) {
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff41';
        ctx.textAlign = 'left';
        ctx.fillText(`GHOSTS: ${count}`, 20, 30);
      }
    },

    // Controls hint
    (ctx, w, h) => {
      if (gameState.phase !== 'playing' && gameState.phase !== 'casefile') return;
      if (caseFileUp) return; // case file has its own instructions
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('[Q] Type Question  [V] Speak  [TAB] Case File  [LEFT/RIGHT] Tune', w / 2, h - 12);
    },

    // Threat system visuals (hidden during case file)
    (ctx, w, h) => {
      if (threatSystem && !caseFileUp) threatSystem.draw(ctx, w, h);
    },

    // Transition effect
    (ctx, w, h) => {
      if (gameState.isTransitioning) {
        const p = gameState.getTransitionProgress();
        if (p < 0.3) {
          ctx.fillStyle = `rgba(0, 255, 65, ${p * 2})`;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = `rgba(0, 0, 0, ${(p - 0.3) * 1.4})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
    },

    // Case file (takes over entire screen when open)
    (ctx, w, h) => caseFile.draw(ctx, w, h),

    // End screen
    (ctx, w, h) => {
      if (gameState.phase === 'end') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, w, h);

        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = '#00ff41';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00ff41';
        ctx.textAlign = 'center';
        ctx.fillText('ALL CASES CLOSED', w / 2, h / 2 - 50);

        ctx.font = '16px "Courier New", monospace';
        ctx.shadowBlur = 10;
        const ghosts = ghostCollection.getAll();
        ghosts.forEach((ghost, i) => {
          ctx.fillStyle = ghost.color || '#00ff41';
          ctx.fillText(`${ghost.name} — CAPTURED`, w / 2, h / 2 + i * 30);
        });
      }
    },

    // Vignette (hidden during case file)
    (ctx, w, h) => {
      if (!caseFileUp) screenEffects.drawVignette(ctx, w, h);
    },

    // Static noise (hidden during case file)
    (ctx, w, h) => {
      if (caseFileUp) return;
      const baseNoise = 1 - proximity;
      const noisePenalty = baseNoise + lightPenalty * 0.6 + threatSystem.distortionAmount * 0.4;
      screenEffects.drawNoise(ctx, w, h, Math.min(1, noisePenalty));
    },

    // Light warning overlay (hidden during case file)
    (ctx, w, h) => {
      if (caseFileUp || !lightSensor.active) return;
      const status = lightSensor.getStatus();
      if (status === 'bright' || status === 'warning') {
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        const intensity = status === 'bright' ? 0.12 : 0.05;
        ctx.fillStyle = `rgba(255, 40, 40, ${intensity * pulse})`;
        ctx.fillRect(0, 0, w, h);

        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        if (status === 'bright') {
          ctx.fillStyle = `rgba(255, 60, 60, ${0.6 + pulse * 0.4})`;
          ctx.shadowColor = '#ff2828';
          ctx.fillText('TOO MUCH LIGHT — SPIRITS RETREATING', w / 2, 60);
        } else {
          ctx.fillStyle = `rgba(255, 180, 60, ${0.4 + pulse * 0.3})`;
          ctx.shadowColor = '#ffb43c';
          ctx.fillText('LIGHT DETECTED — FIND DARKNESS', w / 2, 60);
        }
      }
    },

    // Reaction recorder (share prompt)
    (ctx, w, h) => {
      if (reactionRecorder) reactionRecorder.draw(ctx, w, h);
    },

    // Flicker (hidden during case file)
    (ctx, w, h) => {
      if (!caseFileUp) screenEffects.drawFlicker(ctx, w, h);
    },
  ]);
}

// ── MENU MUSIC ──────────────────────────────────────────────────────
let menuMusicSource = null;
let menuMusicGain = null;

function startMenuMusic() {
  if (menuMusicSource) return; // already playing
  const ctx = audioEngine.getContext();
  const musicBus = audioEngine.getBus('music');

  // Load and play the menu track
  fetch('/assets/audio/menu-music.mp3')
    .then(r => r.arrayBuffer())
    .then(buf => ctx.decodeAudioData(buf))
    .then(decoded => {
      // Don't start if we've already left the menu
      if (gameState.phase !== 'menu') return;

      menuMusicGain = ctx.createGain();
      menuMusicGain.gain.value = 0;
      menuMusicGain.gain.setTargetAtTime(0.4, ctx.currentTime, 0.8);
      menuMusicGain.connect(musicBus);

      menuMusicSource = ctx.createBufferSource();
      menuMusicSource.buffer = decoded;
      menuMusicSource.loop = true;
      menuMusicSource.connect(menuMusicGain);
      menuMusicSource.start();
    })
    .catch(err => console.warn('Menu music failed to load:', err));
}

function stopMenuMusic() {
  if (!menuMusicSource) return;
  const ctx = audioEngine.getContext();
  if (menuMusicGain) {
    menuMusicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  }
  const src = menuMusicSource;
  menuMusicSource = null;
  setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 1500);
}

// ── BOOTSTRAP ───────────────────────────────────────────────────────
const loop = new GameLoop(update, render);
const warning = document.getElementById('headphone-warning');
const startBtn = document.getElementById('start-btn');

function startGame() {
  if (warning.classList.contains('hidden')) return; // prevent double-fire

  try {
  warning.classList.add('hidden');
  audioEngine.init();
  screenEffects.init();

  inputManager = new InputManager(canvas);
  radioTuner = new RadioTuner(audioEngine);
  radioTuner.init();

  // Quiet radio static on main menu — subtle background texture, not overpowering
  radioTuner.noiseGain.gain.value = 0.04;

  atmosphere = new Atmosphere(audioEngine);
  atmosphere.init();

  // Mute drones while on main menu (they auto-start in init)
  atmosphere.droneGain.gain.value = 0;
  atmosphere.subGain.gain.value = 0;

  reactionRecorder = new ReactionRecorder(lightSensor);
  questionSystem = new QuestionSystem(radioTuner, caseFile);
  threatSystem = new ThreatSystem(audioEngine, lightSensor);

  // Disable game keys while player is typing a question
  eventBus.on('input:textFocused', () => { inputManager.textInputActive = true; });
  eventBus.on('input:textBlurred', () => { inputManager.textInputActive = false; });

  // ── FACE REACTION EVENTS ─────────────────────────────────────
  // Player flinched — the ghost feeds on fear, threat builds faster
  eventBus.on('reaction:flinch', ({ intensity }) => {
    if (gameState.phase !== 'playing') return;
    // Ghost gets more aggressive when it senses fear
    if (threatSystem) {
      threatSystem.staticTimer += 3 * intensity;
    }
    // Brief camera glitch
    cameraFeed.setGlitch(Math.min(1, intensity + 0.3));
    // Whisper taunt
    uiOverlay.showNotification('It senses your fear...', 2.0);
  });

  // Player looked away — ghost taunts, radio drifts
  eventBus.on('reaction:lookaway', () => {
    if (gameState.phase !== 'playing') return;
    uiOverlay.showNotification("Don't look away...", 3.0);
    // Drift the radio off-station slightly
    if (radioTuner) {
      const drift = (Math.random() - 0.5) * 2;
      radioTuner.adjustFrequency(drift);
    }
  });

  // Player looked back — ghost acknowledges
  eventBus.on('reaction:return', () => {
    if (gameState.phase !== 'playing') return;
    uiOverlay.showNotification('I can see you again...', 2.0);
  });

  // Player covered face/camera — ghost mocks them
  eventBus.on('reaction:cover', () => {
    if (gameState.phase !== 'playing') return;
    uiOverlay.showNotification('Hiding won\'t save you...', 3.0);
    if (threatSystem) {
      threatSystem.staticTimer += 2;
    }
  });

  // Save progress when a level loads
  eventBus.on('level:loaded', ({ level }) => mainMenu.saveProgress(level));

  levelManager = new LevelManager(
    gameState, radioTuner, ghostCollection, uiOverlay,
    atmosphere, caseFile, questionSystem, threatSystem
  );

  // Start camera (non-blocking, respects settings)
  if (mainMenu.settings.camera) {
    lightSensor.init().then(ok => {
      if (ok) {
        console.log('Camera active — light sensing + face feed enabled');
        faceReaction.init();
      }
    });
  }

  // Show main menu with background music
  gameState.setPhase('menu');
  startMenuMusic();
  loop.start();

  } catch (err) {
    console.error('startGame failed:', err);
    // Show error on screen so we can debug on mobile
    warning.classList.remove('hidden');
    warning.querySelector('.warning-content').innerHTML =
      `<h1 style="color:red;font-size:1rem;">ERROR</h1><p style="font-size:0.8rem;">${err.message}</p>`;
  }
}

startBtn.addEventListener('click', startGame);
startBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  startGame();
});

export { audioEngine, soundBank, renderer, radioTuner, ghostCollection, lightSensor };
