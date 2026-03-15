const CACHE_NAME = 'ghost-frequency-v13';
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
  '/src/audio/MicMonitor.js',
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
  '/src/camera/FaceReaction.js',
  '/src/audio/GhostVoice.js',
  '/assets/audio/menu-music.mp3',
  '/assets/audio/casefile-ambient.mp3',
  '/assets/audio/ghosts/harold-echo.mp3',
  '/assets/audio/ghosts/empty-ashtray.mp3',
];

// Install — cache all app shell assets, skip waiting to activate immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches and take control of all clients
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for JS/HTML (always get latest), cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first for JS, HTML, CSS — always try to get the latest code
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.css') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Update the cache with the fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback — serve from cache
          return caches.match(e.request);
        })
    );
    return;
  }

  // Cache-first for media assets (audio, images, etc.)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
