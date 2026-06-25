 
 // scatter stars randomly across the upper sky
  const starsContainer = document.getElementById('stars');
  for(let i=0;i<90;i++){
    const s = document.createElement('div');
    s.className='star';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*55+'%';
    s.style.opacity = (Math.random()*0.6+0.3).toFixed(2);
    starsContainer.appendChild(s);
  }
 
  // Elements that participate in the dawn -> daylight transition
  const sky = document.getElementById('sky');
  const stars = document.getElementById('stars');
  const mist = document.getElementById('mist');
  const sun = document.getElementById('sun');
  const mountains = document.getElementById('mountains');
  const carnival = document.getElementById('carnivalSvg');
  const daylightOverlay = document.getElementById('daylightOverlay');
  const greeting = document.getElementById('greeting');
  const subtext = document.getElementById('subtext');
  const ticketBtn = document.getElementById('ticketBtn');
  const continueBtn = document.getElementById('continueBtn');
  const skipHint = document.getElementById('skipHint');
  const dawnVadapav = document.getElementById('dawnVadapav');
  const huntCount = document.getElementById('huntCount');
  const huntToast = document.getElementById('huntToast');
  const musicToggle = document.getElementById('musicToggle');
  const musicLabel = document.getElementById('musicLabel');

  const VADAPAV_STORAGE_KEY = 'allenCarnivalVadapavs';
  const TOTAL_VADAPAVS = 5;
  const ACTIVE_VADAPAV_IDS = [
    'dawn-sleepy',
    'morning-ticket-gremlin',
    'morning-flag-napper',
    'afternoon-sun-bather',
    'afternoon-wheel-peek'
  ];
  const musicClient = window.CarnivalMusicClient || null;
  const usesShellMusic = Boolean(musicClient?.isEmbedded);
  const bgMusic = usesShellMusic ? null : new Audio('media/scene1.mp3');
  if(bgMusic){
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
  }

  let musicEnabled = true;
  let musicFadeId = null;
  let toastTimeoutId = null;

  try{
    musicEnabled = localStorage.getItem('allenCarnivalMusic') !== 'off';
  }catch{}

  function saveMusicPreference(){
    try{
      localStorage.setItem('allenCarnivalMusic', musicEnabled ? 'on' : 'off');
    }catch{}
  }

  function updateMusicButton(isEnabled = musicEnabled){
    musicToggle.setAttribute('aria-pressed', String(isEnabled));
    musicToggle.setAttribute(
      'aria-label',
      isEnabled
        ? 'Turn carnival music off'
        : 'Turn carnival music on'
    );

    musicLabel.textContent = isEnabled
      ? 'Music on'
      : 'Music off';
  }

  function clearMusicFade(){
    if(!musicFadeId) return;
    window.clearInterval(musicFadeId);
    musicFadeId = null;
  }

  function startMusic(){
    if(!musicEnabled) return;

    if(usesShellMusic){
      musicClient.startMusic();
      return;
    }

    clearMusicFade();
    bgMusic.volume = Math.min(bgMusic.volume || 0, 0.5);

    bgMusic.play()
      .then(() => {
        updateMusicButton(musicEnabled);

        musicFadeId = window.setInterval(() => {
          if(bgMusic.volume < 0.48){
            bgMusic.volume = Math.min(0.5, bgMusic.volume + 0.02);
          }else{
            bgMusic.volume = 0.5;
            clearMusicFade();
          }
        }, 100);
      })
      .catch(() => {
        updateMusicButton(musicEnabled);
      });
  }

  function startMusicAfterFirstGesture(){
    if(usesShellMusic){
      if(musicEnabled) musicClient.startMusic();
      return;
    }

    if(!musicEnabled || !bgMusic.paused) return;
    startMusic();
  }

  function tryAutoplayMusic(){
    if(!musicEnabled) return;

    startMusic();
    window.addEventListener('pointerdown', startMusicAfterFirstGesture, { once: true });
    window.addEventListener('keydown', startMusicAfterFirstGesture, { once: true });
  }

  function stopMusic({ reset = false } = {}){
    if(usesShellMusic){
      musicClient.stopMusic({ reset });
      return;
    }

    clearMusicFade();

    if(bgMusic.paused){
      updateMusicButton(musicEnabled);
      return;
    }

    musicFadeId = window.setInterval(() => {
      if(bgMusic.volume > 0.03){
        bgMusic.volume = Math.max(0, bgMusic.volume - 0.03);
      }else{
        clearMusicFade();
        bgMusic.pause();
        if(reset) bgMusic.currentTime = 0;
        updateMusicButton(musicEnabled);
      }
    }, 70);
  }

  function toggleMusic(){
    if(usesShellMusic){
      musicClient.toggleMusic();
      return;
    }

    musicEnabled = !musicEnabled;
    saveMusicPreference();

    if(musicEnabled){
      startMusic();
    }else{
      stopMusic();
    }
  }

  updateMusicButton(musicEnabled);

  window.addEventListener('carnival:music-state', event => {
    if(!usesShellMusic || !event.detail) return;
    musicEnabled = event.detail.enabled;
    updateMusicButton(musicEnabled);
  });

  function getFoundVadapavs(){
    try{
      const saved = JSON.parse(localStorage.getItem(VADAPAV_STORAGE_KEY) || '[]');
      return Array.isArray(saved)
        ? saved.filter(id => ACTIVE_VADAPAV_IDS.includes(id))
        : [];
    }catch{
      return [];
    }
  }

  function updateHuntCounter(found = getFoundVadapavs()){
    huntCount.textContent = `${found.length} / ${TOTAL_VADAPAVS}`;
  }

  function showHuntToast(message){
    window.clearTimeout(toastTimeoutId);
    huntToast.textContent = message;
    huntToast.classList.add('is-visible');
    toastTimeoutId = window.setTimeout(() => huntToast.classList.remove('is-visible'), 3600);
  }

  function collectVadapav(event){
    const vadapav = event.currentTarget;
    const id = vadapav.dataset.vadapavId;
    const found = getFoundVadapavs();
    if(found.includes(id)) return;

    found.push(id);
    try{ localStorage.setItem(VADAPAV_STORAGE_KEY, JSON.stringify(found)); }catch{}
    vadapav.classList.add('is-found');
    vadapav.setAttribute('aria-hidden', 'true');
    updateHuntCounter(found);
    showHuntToast('Sleepy vadapav found! “Five more minutes… or one chutney.”');
    window.setTimeout(() => vadapav.hidden = true, 760);
  }

  const alreadyFound = getFoundVadapavs();
  updateHuntCounter(alreadyFound);
  if(alreadyFound.includes(dawnVadapav.dataset.vadapavId)) dawnVadapav.hidden = true;
 
  const risingElements = [sky, stars, mist, sun, mountains, carnival, daylightOverlay, greeting, subtext];
 
  // Read the rise duration straight from the CSS custom property rather than
  // hardcoding a second "6000" in JS — one source of truth, can't drift apart.
  const root = document.documentElement;
  const riseDurationStr = getComputedStyle(root).getPropertyValue('--rise-duration').trim();
  const RISE_DURATION_MS = parseFloat(riseDurationStr) * 1000;
  // Longest individual transition is the overlay (rise-duration + 0.8s + 0.4s delay),
  // so the continue button should wait for that, not just the base duration.
  const LONGEST_TRANSITION_MS = RISE_DURATION_MS + 800 + 400;
 
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 
  let riseTimeoutId = null;
  let isRising = false;
  let isComplete = false;
 
  function triggerSunrise(){
    if (isRising || isComplete) return;
    isRising = true;
    ticketBtn.disabled = true;
    startMusic();
    
    risingElements.forEach(el => el.classList.add('is-rising'));
    ticketBtn.classList.add('is-hidden');
 
    if (prefersReducedMotion){
      // Respect the user's OS-level preference: skip straight to end state,
      // no point offering a "skip" affordance for a transition that's already instant.
      finishRise();
      return;
    }
 
    skipHint.classList.add('is-visible');
    riseTimeoutId = window.setTimeout(finishRise, LONGEST_TRANSITION_MS);
  }
 
  function finishRise(){
    isRising = false;
    isComplete = true;
    skipHint.classList.remove('is-visible');
    continueBtn.classList.add('is-visible');
  }
 
  function skipAhead(){
    if (!isRising) return;
    // Cancel the pending natural finish and jump every transition to its end
    // state immediately by temporarily killing transition-duration, then
    // restoring it next frame (so future replays/elements aren't affected).
    window.clearTimeout(riseTimeoutId);
    risingElements.forEach(el => { el.style.transitionDuration = '0s'; el.style.animationDuration = '0s'; });
    // Force a reflow so the 0s duration is actually applied before we... well,
    // there's nothing left to change, the classes are already set — this just
    // collapses the remaining transition time to nothing.
    void document.body.offsetHeight;
    finishRise();
  }
 
  function goToCarnival(){
    window.location.href = 'scene2.html';
  }
 
  ticketBtn.addEventListener('click', triggerSunrise);
  continueBtn.addEventListener('click', goToCarnival);
  skipHint.addEventListener('click', skipAhead);
  dawnVadapav.addEventListener('click', collectVadapav);
  musicToggle.addEventListener('click', toggleMusic);

  tryAutoplayMusic();
