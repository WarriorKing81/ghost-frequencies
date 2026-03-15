import { LEVELS } from '../data/levels.js';
import { CASES } from '../data/cases.js';
import { eventBus } from '../core/EventBus.js';

export class LevelManager {
  constructor(gameState, radioTuner, ghostCollection, uiOverlay, atmosphere, caseFile, questionSystem, threatSystem) {
    this.gameState = gameState;
    this.radioTuner = radioTuner;
    this.ghostCollection = ghostCollection;
    this.uiOverlay = uiOverlay;
    this.atmosphere = atmosphere;
    this.caseFile = caseFile;
    this.questionSystem = questionSystem;
    this.threatSystem = threatSystem;

    // Listen for case solved (all questions answered)
    eventBus.on('case:solved', () => this._onCaseSolved());

    // Listen for mission failed (ghost got the player)
    eventBus.on('threat:missionFailed', () => this._onMissionFailed());
  }

  loadLevel(index) {
    if (index >= LEVELS.length) {
      this._showEndScreen();
      return;
    }

    this.gameState.currentLevel = index;
    eventBus.emit('level:loaded', { level: index });
    const level = LEVELS[index];

    // Find the case file for this level
    const caseData = CASES.find(c => c.id === level.caseId);
    if (!caseData) {
      console.error('Case not found:', level.caseId);
      return;
    }

    // Load the case file (opens automatically)
    this.caseFile.loadCase(caseData);

    // Start creepy music while case file is showing
    if (this.atmosphere) this.atmosphere.startCreepyMusic();

    // Load questions into the question system (pass ghost voice config)
    this.questionSystem.loadQuestions(caseData.questions, caseData.ghost);

    // Reset threat system
    this.threatSystem.reset();

    // Set radio to static (no station until a question is asked)
    this.radioTuner.setStation(null);
    this.radioTuner.setFrequency(88.0);

    // Configure atmosphere
    if (this.atmosphere) {
      this.atmosphere.configure(level.atmosphere);
    }

    // Show intro
    this.uiOverlay.showIntro(level.intro);
    this.gameState.setPhase('casefile'); // show case file first
  }

  _onCaseSolved() {
    const level = LEVELS[this.gameState.currentLevel];
    const caseData = CASES.find(c => c.id === level.caseId);
    const ghost = caseData.ghost;

    // Capture the ghost
    this.ghostCollection.capture(ghost.id);

    this.gameState.setPhase('captured');

    // Play capture sound
    if (this.atmosphere) this.atmosphere.playCaptureSound();

    // Show resolution
    this.uiOverlay.showNotification(`CASE CLOSED: ${ghost.name} captured`, 5.0);

    // After a delay, transition to next level
    setTimeout(() => {
      this.gameState.startTransition(2.0, () => {
        this.loadLevel(this.gameState.currentLevel + 1);
      });
    }, 5000);
  }

  _onMissionFailed() {
    // Restart the same level — frequencies re-randomize, timer re-randomizes
    const currentLevel = this.gameState.currentLevel;
    this.gameState.startTransition(1.5, () => {
      this.loadLevel(currentLevel);
    });
  }

  _showEndScreen() {
    this.gameState.setPhase('end');
    const count = this.ghostCollection.count();
    this.uiOverlay.showNotification(`ALL CASES CLOSED (${count} ghosts captured)`, 999);
  }

  getCurrentCase() {
    const level = LEVELS[this.gameState.currentLevel];
    if (!level) return null;
    return CASES.find(c => c.id === level.caseId);
  }
}
