const CACHE_NAME = 'ghost-frequency-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/src/main.js',
  '/src/core/GameLoop.js',
  '/src/core/EventBus.js',
  '/src/core/InputManager.js',
  '/src/audio/AudioEngine.js',
  '/src/audio/RadioTuner.js',
  '/src/audio/SoundBank.js',
  '/src/audio/Atmosphere.js',
  '/src/rendering/Renderer.js',
  '/src/rendering/WaveformDrawer.js',
  '/src/rendering/UIOverlay.js',
  '/src/rendering/ScreenEffects.js',
  '/src/rendering/CameraFeed.js',
  '/src/game/GameState.js',
  '/src/game/GhostCollection.js',
  '/src/game/LevelManager.js',
  '/src/game/CaseFile.js',
  '/src/game/QuestionSystem.js',
  '/src/game/ThreatSystem.js',
  '/src/game/ReactionRecorder.js',
  '/src/game/MainMenu.js',
  '/src/game/PuzzleRunner.js',
  '/src/puzzles/FrequencyMatchPuzzle.js',
  '/src/puzzles/MessageDecodePuzzle.js',
  '/src/data/levels.js',
  '/src/data/cases.js',
  '/src/data/ghosts.js',
  '/src/camera/LightSensor.js',
  '/assets/audio/menu-music.mp3',
];

// Install — cache all app shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
