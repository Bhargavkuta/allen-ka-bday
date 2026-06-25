(() => {
  const isEmbedded = window.parent !== window;
  let stateRequestAttempts = 0;

  function getShellMusic() {
    if (!isEmbedded) return null;

    try {
      return window.parent.CarnivalShellMusic || null;
    } catch {
      return null;
    }
  }

  function dispatchState(state) {
    if (!state) return;

    window.dispatchEvent(new CustomEvent('carnival:music-state', {
      detail: state
    }));
  }

  function postCommand(action, payload = {}) {
    if (!isEmbedded) return null;

    window.parent.postMessage({
      type: 'carnival:music-command',
      action,
      ...payload
    }, '*');

    return null;
  }

  function callShell(action, payload = {}) {
    const shellMusic = getShellMusic();
    const commandNames = {
      setMusicEnabled: 'set',
      startMusic: 'start',
      stopMusic: 'stop',
      toggleMusic: 'toggle'
    };

    if (shellMusic) {
      const result = shellMusic[action](payload);
      dispatchState(result);
      return result;
    }

    if (action === 'setMusicEnabled') {
      return postCommand(commandNames[action], { enabled: payload });
    }

    return postCommand(commandNames[action], payload);
  }

  function requestState() {
    const shellMusic = getShellMusic();

    if (shellMusic) {
      dispatchState(shellMusic.requestState());
      return;
    }

    if (isEmbedded) {
      window.parent.postMessage({ type: 'carnival:music-request-state' }, '*');
      stateRequestAttempts++;
      if (stateRequestAttempts < 20) {
        window.setTimeout(requestState, 50);
      }
    }
  }

  window.addEventListener('message', event => {
    const data = event.data || {};
    if (data.type === 'carnival:music-state') {
      dispatchState(data.state);
    }
  });

  window.CarnivalMusicClient = {
    isEmbedded,
    requestState,
    setMusicEnabled(enabled) {
      return callShell('setMusicEnabled', enabled);
    },
    startMusic() {
      return callShell('startMusic');
    },
    stopMusic(options) {
      return callShell('stopMusic', options || {});
    },
    toggleMusic() {
      return callShell('toggleMusic');
    }
  };

  if (isEmbedded) {
    window.requestAnimationFrame(requestState);
  }
})();
