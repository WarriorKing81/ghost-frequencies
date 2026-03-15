import { eventBus } from '../core/EventBus.js';

/**
 * Manages the question-and-answer mechanic.
 *
 * The player asks questions by speaking out loud (Web Speech API) or typing.
 * Keywords in their question are matched against the case's question data.
 * If a match is found, the ghost's answer is hidden at a radio frequency —
 * the player must tune in to hear it.
 */
export class QuestionSystem {
  constructor(radioTuner, caseFile) {
    this.radioTuner = radioTuner;
    this.caseFile = caseFile;

    this.questions = [];         // questions for the current case
    this.activeQuestion = null;  // currently triggered question (player must tune to hear answer)

    // Answer tuning state
    this.answerLocked = false;
    this.answerHoldTimer = 0;
    this.answerHoldRequired = 2.5;

    // UI state
    this.inputOpen = false;      // is the input field visible?
    this.whisperText = '';
    this.whisperAlpha = 0;
    this.answerRevealAlpha = 0;
    this.noMatchText = '';
    this.noMatchAlpha = 0;

    // Voice recognition
    this.recognition = null;
    this.voiceSupported = false;
    this.voiceListening = false;
    this._initVoice();

    // DOM elements
    this.inputEl = document.getElementById('question-input');
    this._setupInput();

    // Legacy compat — the old list-based UI is gone
    this.showingQuestionList = false;
  }

  // ── VOICE RECOGNITION ─────────────────────────────────────────

  _initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.voiceSupported = false;
      return;
    }

    this.voiceSupported = true;
    this.continuousMode = false; // always-on listening mode
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;  // keep listening
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      // Process the latest result (continuous mode may have multiple)
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        if (transcript) {
          console.log('Voice heard:', transcript);
          this._processQuestion(transcript);
        }
      }
    };

    this.recognition.onerror = (e) => {
      // Ignore 'no-speech' and 'aborted' — these are normal
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.warn('Speech recognition error:', e.error);
      this._stopVoice();
    };

    this.recognition.onend = () => {
      // If in continuous mode, automatically restart
      if (this.continuousMode && this.voiceListening) {
        try {
          setTimeout(() => {
            if (this.continuousMode && this.voiceListening) {
              this.recognition.start();
            }
          }, 300);
        } catch {}
      } else {
        this._stopVoice();
      }
    };
  }

  /** Start always-on voice listening (called when gameplay begins) */
  startContinuousListening() {
    if (!this.voiceSupported) return;
    this.continuousMode = true;
    this.voiceListening = true;

    try {
      this.recognition.start();
      console.log('Continuous voice listening started — speak to the ghost');
    } catch {
      // Already running, that's fine
    }
  }

  /** Stop always-on voice listening (called when leaving gameplay) */
  stopContinuousListening() {
    this.continuousMode = false;
    this.voiceListening = false;
    try {
      this.recognition.stop();
    } catch {}
  }

  /** Start one-shot voice input (from button press) */
  startVoice() {
    if (!this.voiceSupported || this.voiceListening) return;

    this.voiceListening = true;
    this.inputEl.value = '';
    this.inputEl.placeholder = 'Listening...';
    this.inputEl.classList.add('voice-active');

    try {
      this.recognition.start();
    } catch {
      this._stopVoice();
    }
  }

  _stopVoice() {
    this.voiceListening = false;
    this.continuousMode = false;
    if (this.inputEl) {
      this.inputEl.placeholder = 'Ask the spirit...';
      this.inputEl.classList.remove('voice-active');
    }
  }

  // ── TEXT INPUT ─────────────────────────────────────────────────

  _setupInput() {
    if (!this.inputEl) return;

    this.inputEl.addEventListener('keydown', (e) => {
      // Stop game keys from firing while typing
      e.stopPropagation();

      if (e.key === 'Enter') {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (text) {
          this._processQuestion(text);
          this.inputEl.value = '';
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeInput();
      }
    });

    // Prevent game input while focused
    this.inputEl.addEventListener('focus', () => {
      eventBus.emit('input:textFocused', {});
    });
    this.inputEl.addEventListener('blur', () => {
      eventBus.emit('input:textBlurred', {});
    });
  }

  openInput() {
    if (this.activeQuestion && !this.answerLocked) return; // busy tuning
    this.inputOpen = true;
    this.inputEl.classList.add('visible');
    this.inputEl.value = '';
    this.inputEl.focus();
  }

  closeInput() {
    this.inputOpen = false;
    this.inputEl.classList.remove('visible');
    this.inputEl.classList.remove('voice-active');
    this.inputEl.blur();
    this.voiceListening = false;
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
    }
  }

  toggleInput() {
    if (this.inputOpen) {
      this.closeInput();
    } else {
      this.openInput();
    }
  }

  // ── KEYWORD MATCHING ──────────────────────────────────────────

  _processQuestion(text) {
    const match = this._findBestMatch(text);

    if (!match) {
      // No keyword match — ghost doesn't respond
      this.noMatchText = '...the static shifts, but no voice answers...';
      this.noMatchAlpha = 1.0;
      this.closeInput();
      return;
    }

    // Matched a question — activate its frequency
    this.activeQuestion = match;
    this.answerLocked = false;
    this.answerHoldTimer = 0;

    // Check if this specific question has its own voice recording
    if (match.voiceFile) {
      this._loadAndSetStation(match);
    } else {
      // Use ghost-level voice config
      this.radioTuner.setStation({
        targetFrequency: match.answerFrequency,
        bandwidth: match.bandwidth || 3.0,
        voiceType: this.ghostVoiceType,
        voiceTone: this.ghostVoiceTone,
        audioBuffer: this.ghostAudioBuffer || null,
      });
    }

    eventBus.emit('question:asked', { question: match });

    // Show what the player asked (echo their words back, ghostly)
    this.whisperText = `"${text}"`;
    this.whisperAlpha = 1.0;

    this.closeInput();
  }

  _findBestMatch(text) {
    const words = text.toLowerCase().split(/\s+/);
    let bestScore = 0;
    let bestQuestion = null;

    for (const q of this.questions) {
      // Skip already-answered questions
      if (this.caseFile.isClueRevealed(q.id)) continue;
      if (!q.keywords || q.keywords.length === 0) continue;

      let score = 0;
      for (const keyword of q.keywords) {
        // Support multi-word keywords (e.g., "other side", "did this")
        if (keyword.includes(' ')) {
          if (text.toLowerCase().includes(keyword)) {
            score += 2; // multi-word match is worth more
          }
        } else {
          // Single word — check if any input word starts with or matches the keyword
          for (const word of words) {
            if (word === keyword || word.startsWith(keyword) || keyword.startsWith(word)) {
              score += 1;
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestQuestion = q;
      }
    }

    // Require at least 1 keyword hit
    return bestScore >= 1 ? bestQuestion : null;
  }

  // ── PER-QUESTION VOICE LOADING ───────────────────────────────

  /** Load a question-specific voice file and set the station once ready */
  async _loadAndSetStation(match) {
    // Check cache first
    if (!this._voiceCache) this._voiceCache = {};

    let buffer = this._voiceCache[match.voiceFile];
    if (!buffer) {
      try {
        const ctx = this.radioTuner.ctx;
        const response = await fetch(match.voiceFile);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await ctx.decodeAudioData(arrayBuffer);
        this._voiceCache[match.voiceFile] = buffer;
      } catch (err) {
        console.warn('Failed to load question voice:', match.voiceFile, err);
        // Fallback to ghost-level voice
        this.radioTuner.setStation({
          targetFrequency: match.answerFrequency,
          bandwidth: match.bandwidth || 3.0,
          voiceType: this.ghostVoiceType,
          voiceTone: this.ghostVoiceTone,
          audioBuffer: this.ghostAudioBuffer || null,
        });
        return;
      }
    }

    this.radioTuner.setStation({
      targetFrequency: match.answerFrequency,
      bandwidth: match.bandwidth || 3.0,
      voiceType: 'recorded',
      voiceTone: this.ghostVoiceTone,
      audioBuffer: buffer,
    });
  }

  // ── QUESTION LOADING ──────────────────────────────────────────

  loadQuestions(questions, ghostConfig) {
    this.questions = this._randomizeFrequencies(questions);
    // Store the ghost's voice info for passing to the radio tuner
    this.ghostVoiceType = ghostConfig?.voiceType || 'default';
    this.ghostVoiceTone = ghostConfig?.voiceTone || 440;
    this.ghostAudioBuffer = ghostConfig?.audioBuffer || null;
    this.activeQuestion = null;
    this.answerLocked = false;
    this.answerHoldTimer = 0;
    this.inputOpen = false;
    this.showingQuestionList = false;
    if (this.inputEl) {
      this.inputEl.classList.remove('visible');
      this.inputEl.classList.remove('voice-active');
    }
  }

  _randomizeFrequencies(questions) {
    const MIN_FREQ = 81;
    const MAX_FREQ = 107;
    const MIN_GAP = 4;
    const assigned = [];

    return questions.map(q => {
      const copy = { ...q };
      let freq;
      let attempts = 0;
      do {
        freq = MIN_FREQ + Math.random() * (MAX_FREQ - MIN_FREQ);
        freq = Math.round(freq * 10) / 10;
        attempts++;
      } while (
        attempts < 200 &&
        assigned.some(f => Math.abs(f - freq) < MIN_GAP)
      );
      assigned.push(freq);
      copy.answerFrequency = freq;
      return copy;
    });
  }

  // ── UPDATE ─────────────────────────────────────────────────────

  update(dt) {
    // Fade whisper text
    if (this.whisperAlpha > 0) {
      this.whisperAlpha = Math.max(0, this.whisperAlpha - dt * 0.2);
    }

    // Fade answer reveal
    if (this.answerRevealAlpha > 0) {
      this.answerRevealAlpha = Math.max(0, this.answerRevealAlpha - dt * 0.15);
    }

    // Fade no-match text
    if (this.noMatchAlpha > 0) {
      this.noMatchAlpha = Math.max(0, this.noMatchAlpha - dt * 0.3);
    }

    if (!this.activeQuestion || this.answerLocked) return;

    // Check if player is tuned to the answer frequency
    const proximity = this.radioTuner.getProximity();
    const tolerance = this.activeQuestion.tolerance || 0.3;

    if (proximity > (1 - tolerance)) {
      this.answerHoldTimer += dt;

      if (this.answerHoldTimer >= this.answerHoldRequired) {
        // Answer locked in!
        this.answerLocked = true;
        this.caseFile.revealClue(this.activeQuestion.id);

        // Show the ghost's answer
        this.whisperText = this.activeQuestion.answer;
        this.whisperAlpha = 1.0;
        this.answerRevealAlpha = 1.0;

        eventBus.emit('question:answered', {
          question: this.activeQuestion,
        });

        // Check if all clues are revealed
        if (this.caseFile.allCluesRevealed()) {
          eventBus.emit('case:solved', {});
        }

        this.activeQuestion = null;
      }
    } else {
      // Drift off — slowly lose progress
      this.answerHoldTimer = Math.max(0, this.answerHoldTimer - dt * 1.5);
    }
  }

  // ── GETTERS ────────────────────────────────────────────────────

  getAnswerProgress() {
    if (!this.activeQuestion || this.answerLocked) return 0;
    return Math.min(1, this.answerHoldTimer / this.answerHoldRequired);
  }

  isListening() {
    return this.activeQuestion !== null && !this.answerLocked;
  }

  getUnansweredCount() {
    return this.questions.filter(q => !this.caseFile.isClueRevealed(q.id)).length;
  }

  // ── DRAW ───────────────────────────────────────────────────────

  draw(ctx, w, h) {
    // "Ask the spirit" prompt when input is not open and no question is active
    if (!this.inputOpen && !this.activeQuestion && this.getUnansweredCount() > 0) {
      ctx.save();
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 255, 65, 0.35)';
      const voiceHint = this.voiceSupported ? '  [V] Speak' : '';
      ctx.fillText(
        `[Q] Type a question to the spirit${voiceHint}  —  ${this.getUnansweredCount()} answers remain`,
        w / 2, h - 100
      );
      ctx.restore();
    }

    // Player's question echo (fading)
    if (this.whisperAlpha > 0) {
      ctx.save();
      ctx.font = 'italic 16px "Courier New", monospace';
      ctx.textAlign = 'center';

      if (this.answerRevealAlpha > 0) {
        // Answer revealed — green glow
        ctx.fillStyle = `rgba(0, 255, 65, ${this.whisperAlpha})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff41';
      } else {
        // Question asked — dim, eerie
        ctx.fillStyle = `rgba(180, 160, 120, ${this.whisperAlpha * 0.7})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(180, 160, 120, 0.3)';
      }

      ctx.fillText(this.whisperText, w / 2, h / 3);
      ctx.restore();
    }

    // No match text
    if (this.noMatchAlpha > 0) {
      ctx.save();
      ctx.font = 'italic 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(120, 100, 80, ${this.noMatchAlpha * 0.6})`;
      ctx.fillText(this.noMatchText, w / 2, h / 3);
      ctx.restore();
    }

    // "Listening" indicator — tuning for the answer
    if (this.isListening()) {
      const progress = this.getAnswerProgress();
      const proximity = this.radioTuner.getProximity();

      ctx.save();
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + proximity * 0.7})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff41';

      if (proximity < 0.3) {
        ctx.fillText('The spirit stirs... tune the radio to find the answer...', w / 2, h / 3 + 30);
      } else if (proximity < 0.7) {
        ctx.fillText('A voice is forming in the static... keep tuning...', w / 2, h / 3 + 30);
      } else {
        ctx.fillText('Hold steady... the spirit is speaking...', w / 2, h / 3 + 30);
      }

      // Progress ring
      if (progress > 0) {
        const cx = w / 2;
        const cy = h / 2;
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
