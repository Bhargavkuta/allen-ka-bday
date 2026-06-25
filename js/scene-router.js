(() => {
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = window.parent !== window;
  const isShellScene = params.get('shell') === '1';
  const isStandalone = params.get('standalone') === '1';

  if (isEmbedded || isShellScene || isStandalone) return;

  const scenePath = `${window.location.pathname.split('/').pop()}${window.location.search}${window.location.hash}`;
  window.location.replace(`index.html#${scenePath}`);
})();
