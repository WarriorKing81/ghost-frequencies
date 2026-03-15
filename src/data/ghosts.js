export const GHOSTS = {
  'the-whisper': {
    id: 'the-whisper',
    name: 'The Whisper',
    lore: 'A voice lost between stations, endlessly repeating its last words.',
    bonusType: 'wider-band',
    bonusValue: 1.5,
    color: '#00ff41',
  },
  'the-static': {
    id: 'the-static',
    name: 'The Static',
    lore: 'Born from dead air, it hides messages in the noise between channels.',
    bonusType: 'static-filter',
    bonusValue: 0.5,
    color: '#41c8ff',
  },
  'eleanor-voss': {
    id: 'eleanor-voss',
    name: 'Eleanor Voss',
    lore: 'Murdered in her own study. The truth died with her — until now.',
    bonusType: 'wider-band',
    bonusValue: 1.5,
    color: '#00ff41',
  },

  // ── REAL CASES ──────────────────────────────────────────────────
  'margarete-petrautzki': {
    id: 'margarete-petrautzki',
    name: 'Margarete Petrautzki',
    lore: 'Recorded 100,000 times in the static. She never stopped whispering.',
    bonusType: 'whisper-hint',
    bonusValue: true,
    color: '#c8a0ff',
  },
  'bill-wilkins': {
    id: 'bill-wilkins',
    name: 'Bill Wilkins',
    lore: 'Died in the corner chair. His voice came through a child.',
    bonusType: 'wider-band',
    bonusValue: 1.4,
    color: '#ff6b4a',
  },
  'dr-mueller': {
    id: 'dr-mueller',
    name: 'Dr. George Jeffries Mueller',
    lore: 'A dead scientist who helped build the machine that reached him.',
    bonusType: 'static-filter',
    bonusValue: 0.4,
    color: '#4af0ff',
  },
};
