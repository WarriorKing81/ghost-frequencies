/**
 * Case files for the game.
 * Each case contains:
 *  - Background info for the player to read
 *  - Questions they can ask the ghost
 *  - Each question has keywords that match player input
 *  - Each question has a hidden frequency where the answer is whispered
 *  - Solving all questions reveals who/what/where
 */

export const CASES = [
  {
    id: 'harlow-house',
    caseNumber: '1974-0091',
    classification: 'COLD CASE — UNSOLVED HOMICIDE',
    victimName: 'Eleanor Voss',
    date: 'November 3, 1974',
    location: 'Harlow House, 14 Wychwood Lane',

    description:
      'Eleanor Voss, age 34, was found dead in the upstairs study of Harlow House ' +
      'on the morning of November 3rd, 1974. Cause of death: blunt force trauma to ' +
      'the back of the skull. No forced entry. The front door was locked from inside. ' +
      'Her husband, Thomas Voss, discovered the body at 7:15 AM after returning from ' +
      'a business trip. Three other people had keys to the house. The murder weapon ' +
      'was never recovered. Eleanor\'s diary was found open on her desk, the last ' +
      'entry torn out.',

    knownFacts: [
      'No sign of forced entry — killer had a key',
      'Husband Thomas was in Philadelphia (hotel records confirm)',
      'Housekeeper Margaret Cole had a key — alibied by her sister',
      'Neighbor Harold Finch had a spare key for emergencies',
      'Eleanor\'s brother, David Marsh, had a key — no alibi',
      'A crystal ashtray was missing from the study',
      'Eleanor\'s diary last entry was torn out',
    ],

    questions: [
      {
        id: 'who-killed',
        label: 'Who killed you?',
        questionText: 'Eleanor... who did this to you?',
        answer: 'He said he loved me... Harold.',
        answerFrequency: 91.7,
        bandwidth: 3.5,
        tolerance: 0.35,
        keywords: ['who', 'kill', 'killed', 'murder', 'murdered', 'hurt', 'did this', 'attacker', 'responsible'],
      },
      {
        id: 'weapon',
        label: 'What was the murder weapon?',
        questionText: 'What were you struck with?',
        answer: 'The crystal ashtray... he took it with him.',
        answerFrequency: 96.3,
        bandwidth: 3.0,
        tolerance: 0.3,
        keywords: ['weapon', 'struck', 'hit', 'ashtray', 'object', 'what was used', 'instrument', 'crystal', 'blunt'],
      },
      {
        id: 'motive',
        label: 'Why did they do it?',
        questionText: 'Why would someone hurt you?',
        answer: 'I was going to tell Thomas... about the affair.',
        answerFrequency: 103.1,
        bandwidth: 3.0,
        tolerance: 0.3,
        keywords: ['why', 'motive', 'reason', 'purpose', 'affair', 'secret', 'thomas', 'husband', 'tell'],
      },
      {
        id: 'diary',
        label: 'What was in the torn diary page?',
        questionText: 'What did you write that night?',
        answer: 'I wrote that I was ending it with Harold... he found it first.',
        answerFrequency: 87.4,
        bandwidth: 3.5,
        tolerance: 0.35,
        keywords: ['diary', 'page', 'wrote', 'write', 'writing', 'torn', 'entry', 'book', 'journal', 'last words'],
      },
      {
        id: 'evidence',
        label: 'Where is the evidence hidden?',
        questionText: 'Where can we find proof?',
        answer: 'Under his garden shed... the ashtray and my diary page.',
        answerFrequency: 99.8,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['where', 'evidence', 'proof', 'hidden', 'find', 'buried', 'shed', 'garden', 'body', 'location'],
      },
    ],

    ghost: {
      id: 'eleanor-voss',
      name: 'Eleanor Voss',
      color: '#00ff41',
      voiceTone: 440,
      voiceType: 'whisper',
      lore: 'Murdered in her own study. The truth died with her — until now.',
      bonusType: 'wider-band',
      bonusValue: 1.5,
    },

    resolution:
      'Harold Finch, the neighbor, had been having an affair with Eleanor for two years. ' +
      'When Eleanor decided to end it and confess to her husband Thomas, Harold panicked. ' +
      'He used his spare key to enter the house, found her diary entry, tore it out, and ' +
      'struck her with the crystal ashtray. He buried both items under his garden shed. ' +
      'Case closed.',
  },

  // ════════════════════════════════════════════════════════════════
  // CASE 2 — THE RAUDIVE TAPES (Real case: 1964-1974)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'raudive-tapes',
    caseNumber: '1971-EVP',
    classification: 'ANOMALOUS AUDIO — ELECTRONIC VOICE PHENOMENA',
    victimName: 'Margarete Petrautzki',
    date: 'Recordings: 1964-1974  |  Pye Records test: 1971',
    location: 'Bad Krozingen, Germany / Pye Records Laboratory, England',

    description:
      'In 1964, Latvian psychologist Konstantin Raudive began recording voices from ' +
      'radio static. Using a germanium diode receiver tuned to dead frequencies between ' +
      'stations, he captured over 100,000 voice fragments. The voices were brief — a word, ' +
      'a name, a phrase — often in mixed languages. In 1971, engineers at Pye Records ' +
      'in England conducted a controlled test: shielded room, no stray signals, Raudive ' +
      'forbidden from touching equipment. In 18 minutes of silence, they found over 200 ' +
      'voices on the tape. One called Raudive by his nickname. Another was identified as ' +
      'his deceased colleague, Margarete Petrautzki. She is still on the frequency.',

    knownFacts: [
      'Over 100,000 voice recordings catalogued by Raudive',
      'Voices appeared on empty frequencies between radio stations',
      'The Pye Records test was conducted in a shielded laboratory',
      'Engineers heard 200+ voices on an 18-minute tape',
      'One voice called Raudive "Kosti" — his childhood nickname',
      'Margarete Petrautzki died shortly before the first recordings',
      'Raudive\'s diode method used the weakest possible radio signal',
      'Voices often spoke in mixed languages within a single phrase',
    ],

    questions: [
      {
        id: 'raudive-identity',
        label: 'Who are you?',
        questionText: 'Margarete... is that you?',
        answer: 'Va dormir... Margarete... go to sleep.',
        answerFrequency: 82.3,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['who', 'name', 'yourself', 'identity', 'hello', 'margarete', 'there', 'you', 'introduce', 'speaking'],
      },
      {
        id: 'raudive-alive',
        label: 'Are you alive?',
        questionText: 'Are you still there? Can you hear us?',
        answer: 'We are not dead... we are not dead.',
        answerFrequency: 89.1,
        bandwidth: 3.0,
        tolerance: 0.35,
        keywords: ['alive', 'dead', 'exist', 'living', 'hear', 'real', 'still there', 'conscious', 'aware', 'listen'],
      },
      {
        id: 'raudive-how',
        label: 'How do you speak through the radio?',
        questionText: 'How are you doing this? How can we hear you?',
        answer: 'The diode... the weakest signal... that is where we live.',
        answerFrequency: 95.7,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['how', 'speak', 'radio', 'static', 'signal', 'diode', 'frequency', 'voice', 'communicate', 'method', 'work'],
      },
      {
        id: 'raudive-kosti',
        label: 'Do you know Raudive?',
        questionText: 'Do you know the man who recorded you? Konstantin?',
        answer: 'Kosti... he listened when no one else would... Kosti.',
        answerFrequency: 101.4,
        bandwidth: 3.0,
        tolerance: 0.35,
        keywords: ['raudive', 'kosti', 'konstantin', 'know', 'recorded', 'man', 'doctor', 'psychologist', 'scientist', 'him'],
      },
      {
        id: 'raudive-message',
        label: 'What is your message?',
        questionText: 'What are you trying to tell us?',
        answer: 'Between the stations... between the silence... we wait for you to listen.',
        answerFrequency: 106.2,
        bandwidth: 2.0,
        tolerance: 0.25,
        keywords: ['message', 'tell', 'want', 'say', 'trying', 'meaning', 'purpose', 'need', 'us', 'world', 'help'],
      },
    ],

    ghost: {
      id: 'margarete-petrautzki',
      name: 'Margarete Petrautzki',
      color: '#c8a0ff',
      voiceTone: 380,
      voiceType: 'evp',
      lore: 'Recorded 100,000 times in the static. She never stopped whispering.',
      bonusType: 'whisper-hint',
      bonusValue: true,
    },

    resolution:
      'Margarete Petrautzki was a colleague and close friend of Konstantin Raudive who ' +
      'died in the early 1960s. Her voice was among the first he identified on his recordings — ' +
      'whispering "Va dormir, Margarete" ("Go to sleep, Margaret") on a tape made in a silent room. ' +
      'Raudive spent ten years documenting over 100,000 such voices using his diode method, recording ' +
      'the faintest signals on empty frequencies. He published his findings in 1968 as "Breakthrough." ' +
      'He died in 1974, still listening. The tapes remain in the archives of the Society for ' +
      'Psychical Research. Margarete\'s voice was never explained. Case filed.',
  },

  // ════════════════════════════════════════════════════════════════
  // CASE 3 — THE ENFIELD POLTERGEIST (Real case: 1977-1979)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'enfield-poltergeist',
    caseNumber: '1977-ENF',
    classification: 'ACTIVE HAUNTING — POLTERGEIST MANIFESTATION',
    victimName: 'Bill Wilkins',
    date: 'August 1977 — 1979',
    location: '284 Green Street, Enfield, London, England',

    description:
      'In August 1977, single mother Peggy Hodgson called police to report furniture ' +
      'moving on its own and loud knocking at 284 Green Street, Enfield. Police constable ' +
      'Carolyn Heeps witnessed a chair slide across the floor. The Society for Psychical ' +
      'Research sent investigators Maurice Grosse and Guy Lyon Playfair, who documented the ' +
      'case for 18 months — over 200 hours of audio tape. The disturbances centered on ' +
      '11-year-old Janet Hodgson. In December 1977, strange sounds began — whistles, barking, ' +
      'guttural bursts — evolving into a deep, gravelly voice unlike any child\'s. The voice ' +
      'identified itself as Bill Wilkins. When the recordings were played on LBC radio, ' +
      'a listener called in: the voice was his father. He had died in that house.',

    knownFacts: [
      'Police constable Carolyn Heeps saw a chair move on its own',
      'Over 30 witnesses reported unexplained phenomena',
      '200+ hours of audio tape recorded by SPR investigators',
      'Sounds evolved: whistles, then barks, then a deep male voice',
      'The voice identified itself as "Bill" and later "Bill Wilkins"',
      'Janet Hodgson was 11 years old when the voice manifested',
      'A listener identified the voice on LBC radio as his dead father',
      'William Charles Wilkins died at the house on June 20, 1963',
    ],

    questions: [
      {
        id: 'enfield-identity',
        label: 'Who are you?',
        questionText: 'Who is speaking? Tell us your name.',
        answer: 'Bill... just Bill... Bill Wilkins.',
        answerFrequency: 84.6,
        bandwidth: 3.5,
        tolerance: 0.35,
        keywords: ['who', 'name', 'yourself', 'hello', 'bill', 'there', 'speaking', 'you', 'introduce', 'identify'],
      },
      {
        id: 'enfield-death',
        label: 'How did you die?',
        questionText: 'What happened to you, Bill?',
        answer: 'I went blind... then I had a haemorrhage... and I fell asleep and I died in the chair in the corner.',
        answerFrequency: 91.2,
        bandwidth: 3.0,
        tolerance: 0.3,
        keywords: ['die', 'died', 'death', 'dead', 'happen', 'happened', 'kill', 'killed', 'cause', 'end', 'pass', 'passed'],
      },
      {
        id: 'enfield-where',
        label: 'Where did you die?',
        questionText: 'Where were you when it happened?',
        answer: 'Downstairs... in the corner... the chair... I never got up.',
        answerFrequency: 97.8,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['where', 'place', 'room', 'chair', 'downstairs', 'corner', 'house', 'location', 'spot', 'position'],
      },
      {
        id: 'enfield-why',
        label: 'Why are you still here?',
        questionText: 'Why haven\'t you moved on, Bill?',
        answer: 'This is my house... I lived here... I died here... I never left.',
        answerFrequency: 103.5,
        bandwidth: 3.0,
        tolerance: 0.35,
        keywords: ['why', 'still', 'here', 'stay', 'leave', 'move', 'haunt', 'remain', 'stuck', 'purpose', 'reason', 'go'],
      },
      {
        id: 'enfield-girl',
        label: 'Why do you speak through the girl?',
        questionText: 'Why Janet? Why does your voice come from her?',
        answer: 'She can hear me... the others can\'t... I just want someone to know I\'m here.',
        answerFrequency: 86.9,
        bandwidth: 2.5,
        tolerance: 0.25,
        keywords: ['girl', 'janet', 'child', 'voice', 'through', 'speak', 'her', 'daughter', 'kid', 'possess', 'chosen', 'use'],
      },
    ],

    ghost: {
      id: 'bill-wilkins',
      name: 'Bill Wilkins',
      color: '#ff6b4a',
      voiceTone: 180,
      voiceType: 'poltergeist',
      lore: 'Died in the corner chair. His voice came through a child.',
      bonusType: 'wider-band',
      bonusValue: 1.4,
    },

    resolution:
      'William Charles Wilkins, age 72, died of a brain haemorrhage on June 20, 1963, in a ' +
      'chair in the downstairs corner of 284 Green Street, Enfield. He had gone blind before ' +
      'his death. Fourteen years later, his voice emerged from 11-year-old Janet Hodgson — first ' +
      'as whistles, then barks, then gravelly speech describing his own death in exact detail. ' +
      'His son confirmed every detail after hearing the recordings on LBC radio. The haunting ' +
      'continued for 18 months. Over 30 witnesses, including police, confirmed unexplained events. ' +
      'The Enfield case remains one of the most documented hauntings in history. ' +
      'The SPR audio archive was published in 2019 by Melvyn Willin. Bill\'s voice was never explained. Case filed.',
  },

  // ════════════════════════════════════════════════════════════════
  // CASE 4 — THE SPIRICOM (Real case: 1979-1982)
  // ════════════════════════════════════════════════════════════════
  {
    id: 'spiricom',
    caseNumber: '1982-SPC',
    classification: 'ANOMALOUS COMMUNICATION — SPIRIT TECHNOLOGY',
    victimName: 'Dr. George Jeffries Mueller',
    date: '1979-1982  |  Announced: April 6, 1982',
    location: 'Philadelphia, PA / National Press Club, Washington, D.C.',

    description:
      'In 1979, retired engineer George Meek invested half a million dollars into building ' +
      'a device he called the Spiricom — a spirit communication machine. Working with electronics ' +
      'engineer William O\'Neil, the device used 13 audio tone generators spanning 21 Hz to 701 Hz ' +
      'and a transceiver operating at 29-131 MHz. When activated, it produced a constant, ' +
      'mechanical buzzing drone. Through this drone, a voice emerged: Dr. George Jeffries Mueller, ' +
      'a real scientist who had died on May 31, 1967. Over 20 hours of two-way conversation were ' +
      'recorded. Mueller\'s voice was mechanical, vibrating — as if speech was being constructed ' +
      'from the tones themselves. On April 6, 1982, Meek announced his findings at the National ' +
      'Press Club and released the complete Spiricom schematics to the public. No one has ever ' +
      'replicated the results.',

    knownFacts: [
      'George Meek invested $500,000+ through his Metascience Foundation',
      'The Spiricom used 13 tone generators covering 21-701 Hz',
      'The transceiver operated in the 29-131 MHz range',
      'The device produced a constant buzzing/droning sound when active',
      'Dr. George Jeffries Mueller died May 31, 1967',
      'Over 20 hours of two-way conversation were recorded',
      'Mueller allegedly helped improve the device from the other side',
      'Full schematics were released publicly — no one could replicate it',
      'Only 25% of the spirit speech was clearly intelligible',
    ],

    questions: [
      {
        id: 'spiricom-identity',
        label: 'Who is speaking?',
        questionText: 'Identify yourself. Who are we communicating with?',
        answer: 'Mueller... Doctor George Jeffries Mueller.',
        answerFrequency: 83.4,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['who', 'name', 'yourself', 'hello', 'identify', 'mueller', 'speaking', 'you', 'there', 'introduce'],
      },
      {
        id: 'spiricom-how',
        label: 'How does this device work?',
        questionText: 'How are you speaking through this machine?',
        answer: 'The frequencies... for want of a better word... the tones give us a scaffold to shape.',
        answerFrequency: 93.6,
        bandwidth: 3.0,
        tolerance: 0.3,
        keywords: ['how', 'device', 'machine', 'work', 'spiricom', 'technology', 'function', 'operate', 'tones', 'mechanism'],
      },
      {
        id: 'spiricom-lips',
        label: 'How do spirits produce speech?',
        questionText: 'How do you form words without a body?',
        answer: 'The movement of the lips... necessary to produce in the mind... the conditions, the frequencies.',
        answerFrequency: 99.1,
        bandwidth: 2.5,
        tolerance: 0.25,
        keywords: ['lips', 'words', 'form', 'speech', 'body', 'sound', 'produce', 'talk', 'speak', 'voice', 'mouth'],
      },
      {
        id: 'spiricom-replicate',
        label: 'Why can\'t anyone else hear you?',
        questionText: 'Others built your machine. Why does it only work here?',
        answer: 'The operator... must be attuned... the machine is not enough... the living must listen.',
        answerFrequency: 104.7,
        bandwidth: 2.5,
        tolerance: 0.3,
        keywords: ['others', 'replicate', 'copy', 'else', 'anyone', 'nobody', 'only', 'alone', 'unique', 'operator', 'rebuild', 'fail'],
      },
      {
        id: 'spiricom-death',
        label: 'What is death?',
        questionText: 'What is it like on the other side?',
        answer: 'There is no death... only a change in frequency... you are already broadcasting.',
        answerFrequency: 88.5,
        bandwidth: 2.0,
        tolerance: 0.25,
        keywords: ['death', 'die', 'dead', 'other side', 'afterlife', 'beyond', 'heaven', 'hell', 'like', 'feel', 'experience', 'cross'],
      },
    ],

    ghost: {
      id: 'dr-mueller',
      name: 'Dr. George Jeffries Mueller',
      color: '#4af0ff',
      voiceTone: 280,
      voiceType: 'spiricom',
      lore: 'A dead scientist who helped build the machine that reached him.',
      bonusType: 'static-filter',
      bonusValue: 0.4,
    },

    resolution:
      'Dr. George Jeffries Mueller died on May 31, 1967. Twelve years later, his voice ' +
      'emerged through the Spiricom device — a buzzing, mechanical tone describing the mechanics ' +
      'of spirit communication. He held 20+ hours of two-way conversation with the living, ' +
      'explaining that spirits need specific frequencies as a scaffold to shape their speech, and ' +
      'that the operator\'s psychic attunement was as essential as the hardware. George Meek released ' +
      'the full schematics to the world at the National Press Club on April 6, 1982. Hundreds of ' +
      'engineers attempted to rebuild the Spiricom. None succeeded. An artificial larynx was later ' +
      'found among O\'Neil\'s possessions, but the original recordings remain unexplained. ' +
      'Mueller\'s final recorded words: "There is no death." Case filed.',
  },
];
