const VADAPAV_STORAGE_KEY = 'allenCarnivalVadapavs';
const TOTAL_VADAPAVS = 5;
const ACTIVE_VADAPAV_IDS = [
  'dawn-sleepy',
  'morning-ticket-gremlin',
  'morning-flag-napper',
  'afternoon-sun-bather',
  'afternoon-wheel-peek'
];
const MUSIC_STORAGE_KEY = 'allenCarnivalMusic';
const MORNING_PROGRESS_KEY = 'allenCarnivalMorningProgress';

const musicClient = window.CarnivalMusicClient || null;
const usesShellMusic = Boolean(musicClient?.isEmbedded);
const bgMusic = usesShellMusic ? null : new Audio('media/scene1.mp3');
if(bgMusic){
  bgMusic.loop = true;
  bgMusic.preload = 'auto';
}

const musicToggle = document.getElementById('musicToggle');
const musicLabel = document.getElementById('musicLabel');
const huntCount = document.getElementById('huntCount');
const toast = document.getElementById('toast');
const vadapavs = document.querySelectorAll('.hidden-vadapav');

const complimentCard = document.getElementById('complimentCard');
const spinCompliment = document.getElementById('spinCompliment');
const scrambleWord = document.getElementById('scrambleWord');
const scrambleInput = document.getElementById('scrambleInput');
const checkScramble = document.getElementById('checkScramble');
const newScramble = document.getElementById('newScramble');
const scrambleResult = document.getElementById('scrambleResult');
const continueBtn = document.getElementById('continueBtn');

const stamps = {
  jigsaw: document.getElementById('jigsawStamp'),
  compliment: document.getElementById('complimentStamp'),
  scramble: document.getElementById('scrambleStamp')
};

const compliments = [
  'Allen has main-character-at-a-carnival energy.',
  'Allen is the kind of person who makes ordinary days feel decorated.',
  'Allen’s laugh probably deserves its own parade permit.',
  'Allen brings golden-hour vibes without needing the sun to cooperate.',
  'Allen is dangerously good at making people feel included.'
];

const scrambleBank = [
  { scrambled:'DLIEFRN', answer:'FRIEND', hint:'the real treasure, obviously' },
  { scrambled:'ESLIM', answer:'SMILE', hint:'the thing this carnival is trying to steal' },
  { scrambled:'YTBDARHI', answer:'BIRTHDAY', hint:'today’s whole excuse' }
];

let musicEnabled = true;
let musicFadeId = null;
let toastTimeoutId = null;
let currentScrambleIndex = 0;
let progress = loadProgress();

try{
  musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off';
}catch{}

function saveMusicPreference(){
  try{
    localStorage.setItem(MUSIC_STORAGE_KEY, musicEnabled ? 'on' : 'off');
  }catch{}
}

function updateMusicButton(){
  musicToggle.setAttribute('aria-pressed', String(musicEnabled));
  musicToggle.setAttribute(
    'aria-label',
    musicEnabled ? 'Turn carnival music off' : 'Turn carnival music on'
  );
  musicLabel.textContent = musicEnabled ? 'Music on' : 'Music off';
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
      musicFadeId = window.setInterval(() => {
        if(bgMusic.volume < 0.48){
          bgMusic.volume = Math.min(0.5, bgMusic.volume + 0.02);
        }else{
          bgMusic.volume = 0.5;
          clearMusicFade();
        }
      }, 100);
    })
    .catch(() => updateMusicButton());
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
  updateMusicButton();
  if(!musicEnabled) return;

  startMusic();
  window.addEventListener('pointerdown', startMusicAfterFirstGesture, { once:true });
  window.addEventListener('keydown', startMusicAfterFirstGesture, { once:true });
}

function stopMusic(){
  if(usesShellMusic){
    musicClient.stopMusic();
    return;
  }

  clearMusicFade();

  if(bgMusic.paused) return;

  musicFadeId = window.setInterval(() => {
    if(bgMusic.volume > 0.03){
      bgMusic.volume = Math.max(0, bgMusic.volume - 0.03);
    }else{
      clearMusicFade();
      bgMusic.pause();
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
  updateMusicButton();

  if(musicEnabled){
    startMusic();
  }else{
    stopMusic();
  }
}

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

function saveFoundVadapavs(found){
  try{
    localStorage.setItem(VADAPAV_STORAGE_KEY, JSON.stringify(found));
  }catch{}
}

function updateHuntCounter(found = getFoundVadapavs()){
  huntCount.textContent = `${found.length} / ${TOTAL_VADAPAVS}`;
}

function showToast(message){
  window.clearTimeout(toastTimeoutId);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeoutId = window.setTimeout(() => toast.classList.remove('is-visible'), 3300);
}

function collectVadapav(event){
  const vadapav = event.currentTarget;
  const id = vadapav.dataset.vadapavId;
  const found = getFoundVadapavs();
  if(found.includes(id)) return;

  found.push(id);
  saveFoundVadapavs(found);
  vadapav.classList.add('is-found');
  vadapav.setAttribute('aria-hidden', 'true');
  updateHuntCounter(found);
  showToast('Morning vadapav secured. It was “helping” by hiding.');
  window.setTimeout(() => vadapav.hidden = true, 760);
}

function loadProgress(){
  try{
    return JSON.parse(localStorage.getItem(MORNING_PROGRESS_KEY)) || {};
  }catch{
    return {};
  }
}

function saveProgress(){
  try{
    localStorage.setItem(MORNING_PROGRESS_KEY, JSON.stringify(progress));
  }catch{}
}

function earnStamp(name){
  if(progress[name]) return;
  progress[name] = true;
  saveProgress();
  renderProgress();
}

function renderProgress(){
  Object.entries(stamps).forEach(([name, stamp]) => {
    stamp.classList.toggle('is-earned', Boolean(progress[name]));
  });

  const allDone = progress.jigsaw && progress.compliment && progress.scramble;
  continueBtn.classList.toggle('is-ready', allDone);
  continueBtn.textContent = allDone ? 'Head to Afternoon →' : 'Earn all 3 stamps first';
}

function spinCarousel(){
  const compliment = compliments[Math.floor(Math.random() * compliments.length)];
  complimentCard.classList.remove('is-spinning');
  void complimentCard.offsetWidth;
  complimentCard.classList.add('is-spinning');
  window.setTimeout(() => {
    complimentCard.textContent = compliment;
    earnStamp('compliment');
    showToast('Compliment stamp earned!');
  }, 220);
}

function renderScramble(){
  const current = scrambleBank[currentScrambleIndex];
  scrambleWord.textContent = current.scrambled;
  scrambleInput.value = '';
  scrambleInput.placeholder = `hint: ${current.hint}`;
  scrambleResult.textContent = '';
}

function checkScrambleAnswer(){
  const current = scrambleBank[currentScrambleIndex];
  const guess = scrambleInput.value.trim().toUpperCase();

  if(!guess){
    scrambleResult.textContent = 'Give it a guess first.';
    return;
  }

  if(guess === current.answer){
    scrambleResult.textContent = 'Unlocked. Your brain has entered the midway.';
    earnStamp('scramble');
    showToast('Word scramble stamp earned!');
    return;
  }

  scrambleResult.textContent = 'Almost. The letters are being tiny goblins.';
}

function nextScramble(){
  currentScrambleIndex = (currentScrambleIndex + 1) % scrambleBank.length;
  renderScramble();
}

function goToAfternoon(){
  if(!(progress.jigsaw && progress.compliment && progress.scramble)){
    showToast('Collect all three morning stamps before afternoon opens.');
    return;
  }

  window.location.href = 'scene3.html';
}

window.addEventListener('carnival:music-state', event => {
  if(!usesShellMusic || !event.detail) return;
  musicEnabled = event.detail.enabled;
  updateMusicButton();
});

function restoreCollectedVadapavs(){
  const found = getFoundVadapavs();
  updateHuntCounter(found);

  vadapavs.forEach(vadapav => {
    if(found.includes(vadapav.dataset.vadapavId)){
      vadapav.hidden = true;
    }
  });
}

musicToggle.addEventListener('click', toggleMusic);
vadapavs.forEach(vadapav => vadapav.addEventListener('click', collectVadapav));
spinCompliment.addEventListener('click', spinCarousel);
checkScramble.addEventListener('click', checkScrambleAnswer);
newScramble.addEventListener('click', nextScramble);
scrambleInput.addEventListener('keydown', event => {
  if(event.key === 'Enter') checkScrambleAnswer();
});
continueBtn.addEventListener('click', goToAfternoon);

restoreCollectedVadapavs();
renderScramble();
renderProgress();
tryAutoplayMusic();
