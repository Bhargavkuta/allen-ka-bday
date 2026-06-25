(() => {
  const MUSIC_STORAGE_KEY = 'allenCarnivalMusic';
  const MAX_VOLUME = 0.5;
  const frame = document.getElementById('sceneFrame');
  const bgMusic = new Audio('media/scene1.mp3');
  const DEFAULT_SCENE = 'scene1.html';

  bgMusic.loop = true;
  bgMusic.preload = 'auto';
  bgMusic.volume = 0;

  let musicEnabled = true;
  let musicFadeId = null;

  try {
    musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off';
  } catch {}

  function getState() {
    return {
      enabled: musicEnabled,
      playing: !bgMusic.paused
    };
  }

  function notifyScene() {
    if (!frame || !frame.contentWindow) return getState();

    frame.contentWindow.postMessage({
      type: 'carnival:music-state',
      state: getState()
    }, '*');

    return getState();
  }

  function saveMusicPreference() {
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, musicEnabled ? 'on' : 'off');
    } catch {}
  }

  function clearMusicFade() {
    if (!musicFadeId) return;
    window.clearInterval(musicFadeId);
    musicFadeId = null;
  }

  function fadeMusicTo(targetVolume, onDone) {
    clearMusicFade();

    musicFadeId = window.setInterval(() => {
      const nextVolume = bgMusic.volume < targetVolume
        ? Math.min(targetVolume, bgMusic.volume + 0.02)
        : Math.max(targetVolume, bgMusic.volume - 0.03);

      bgMusic.volume = nextVolume;

      if (Math.abs(bgMusic.volume - targetVolume) < 0.01) {
        bgMusic.volume = targetVolume;
        clearMusicFade();
        if (onDone) onDone();
      }
    }, targetVolume > bgMusic.volume ? 100 : 70);
  }

  function startMusic() {
    if (!musicEnabled) return notifyScene();

    clearMusicFade();
    bgMusic.volume = Math.min(bgMusic.volume || 0, MAX_VOLUME);

    bgMusic.play()
      .then(() => {
        fadeMusicTo(MAX_VOLUME, notifyScene);
        notifyScene();
      })
      .catch(() => {
        notifyScene();
      });

    return notifyScene();
  }

  function stopMusic({ reset = false } = {}) {
    clearMusicFade();

    if (bgMusic.paused) return notifyScene();

    fadeMusicTo(0, () => {
      bgMusic.pause();
      if (reset) bgMusic.currentTime = 0;
      notifyScene();
    });

    return notifyScene();
  }

  function setMusicEnabled(isEnabled) {
    musicEnabled = Boolean(isEnabled);
    saveMusicPreference();

    if (musicEnabled) {
      return startMusic();
    }

    return stopMusic();
  }

  function toggleMusic() {
    return setMusicEnabled(!musicEnabled);
  }

  window.CarnivalShellMusic = {
    getState,
    requestState: notifyScene,
    setMusicEnabled,
    startMusic,
    stopMusic,
    toggleMusic
  };

  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow) return;

    const data = event.data || {};
    if (data.type === 'carnival:music-request-state') {
      notifyScene();
      return;
    }

    if (data.type === 'carnival:music-command') {
      const action = data.action;

      if (action === 'start') startMusic();
      if (action === 'stop') stopMusic(data.options || {});
      if (action === 'toggle') toggleMusic();
      if (action === 'set') setMusicEnabled(data.enabled);
    }
  });

  function normalizeScenePath(path) {
    const rawPath = (path || DEFAULT_SCENE).replace(/^#/, '');
    const [pageWithQuery] = rawPath.split('#');
    const [page, query = ''] = pageWithQuery.split('?');
    const allowedScenes = ['scene1.html', 'scene2.html', 'scene3.html', 'scene4.html'];
    const safePage = allowedScenes.includes(page) ? page : DEFAULT_SCENE;
    const searchParams = new URLSearchParams(query);

    searchParams.set('shell', '1');

    return `${safePage}?${searchParams.toString()}`;
  }

  function loadSceneFromHash() {
    const sceneSrc = normalizeScenePath(window.location.hash.slice(1));
    if (frame.getAttribute('src') !== sceneSrc) {
      frame.setAttribute('src', sceneSrc);
    }
  }

  function syncHashFromFrame() {
    notifyScene();

    try {
      const framePath = frame.contentWindow.location.pathname.split('/').pop();
      const allowedScenes = ['scene1.html', 'scene2.html', 'scene3.html', 'scene4.html'];
      if (!allowedScenes.includes(framePath)) return;

      const nextHash = `#${framePath}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    } catch {}
  }

  frame.addEventListener('load', syncHashFromFrame);
  window.addEventListener('hashchange', loadSceneFromHash);
  loadSceneFromHash();
})();
