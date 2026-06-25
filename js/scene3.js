// ── SCENE 3 — AFTERNOON ──────────────────────────────────────────────────────
// Memory Match + Ring Toss. Both stamps earned → continue unlocks.

const PROGRESS_KEY = 'allenCarnivalAfternoonProgress';
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
const musicClient = window.CarnivalMusicClient || null;
const usesShellMusic = Boolean(musicClient?.isEmbedded);
const musicToggle = document.getElementById('musicToggle');
const musicLabel = document.getElementById('musicLabel');
const bgMusic = usesShellMusic ? null : new Audio('media/scene1.mp3');
if (bgMusic) {
  bgMusic.loop = true;
  bgMusic.preload = 'auto';
}
let musicEnabled = true;
let musicFadeId = null;

try {
  musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off';
} catch {}

function saveMusicPreference() {
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, musicEnabled ? 'on' : 'off');
  } catch {}
}

function updateMusicButton() {
  musicToggle.setAttribute('aria-pressed', String(musicEnabled));
  musicToggle.setAttribute(
    'aria-label',
    musicEnabled ? 'Turn carnival music off' : 'Turn carnival music on'
  );
  musicLabel.textContent = musicEnabled ? 'Music on' : 'Music off';
}

function clearMusicFade() {
  if (!musicFadeId) return;
  window.clearInterval(musicFadeId);
  musicFadeId = null;
}

function startMusic() {
  if (!musicEnabled) return;

  if (usesShellMusic) {
    musicClient.startMusic();
    return;
  }

  clearMusicFade();
  bgMusic.volume = Math.min(bgMusic.volume || 0, 0.5);

  bgMusic.play()
    .then(() => {
      musicFadeId = window.setInterval(() => {
        if (bgMusic.volume < 0.48) {
          bgMusic.volume = Math.min(0.5, bgMusic.volume + 0.02);
        } else {
          bgMusic.volume = 0.5;
          clearMusicFade();
        }
      }, 100);
    })
    .catch(() => updateMusicButton());
}

function startMusicAfterFirstGesture() {
  if (usesShellMusic) {
    if (musicEnabled) musicClient.startMusic();
    return;
  }

  if (!musicEnabled || !bgMusic.paused) return;
  startMusic();
}

function tryAutoplayMusic() {
  updateMusicButton();
  if (!musicEnabled) return;

  startMusic();
  window.addEventListener('pointerdown', startMusicAfterFirstGesture, { once: true });
  window.addEventListener('keydown', startMusicAfterFirstGesture, { once: true });
}

function stopMusic() {
  if (usesShellMusic) {
    musicClient.stopMusic();
    return;
  }

  clearMusicFade();

  if (bgMusic.paused) return;

  musicFadeId = window.setInterval(() => {
    if (bgMusic.volume > 0.03) {
      bgMusic.volume = Math.max(0, bgMusic.volume - 0.03);
    } else {
      clearMusicFade();
      bgMusic.pause();
    }
  }, 70);
}

function toggleMusic() {
  if (usesShellMusic) {
    musicClient.toggleMusic();
    return;
  }

  musicEnabled = !musicEnabled;
  saveMusicPreference();
  updateMusicButton();

  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

window.addEventListener('carnival:music-state', event => {
  if (!usesShellMusic || !event.detail) return;
  musicEnabled = event.detail.enabled;
  updateMusicButton();
});

// ── Progress ─────────────────────────────────────────────────────────────────
let progress = loadProgress();
const huntCount = document.getElementById('huntCount');
const vadapavs = document.querySelectorAll('.hidden-vadapav');

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
  catch {}
}
function earnStamp(name) {
  if (progress[name]) return;
  progress[name] = true;
  saveProgress();
  renderProgress();
}
function renderProgress() {
  const matchStamp = document.getElementById('matchStamp');
  const tossStamp  = document.getElementById('tossStamp');
  const continueBtn = document.getElementById('continueBtn');

  if (progress.match) matchStamp.classList.add('is-earned');
  if (progress.toss)  tossStamp.classList.add('is-earned');

  const allDone = progress.match && progress.toss;
  continueBtn.disabled = !allDone;
  continueBtn.classList.toggle('is-ready', allDone);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function getFoundVadapavs() {
  try {
    const saved = JSON.parse(localStorage.getItem(VADAPAV_STORAGE_KEY) || '[]');
    return Array.isArray(saved)
      ? saved.filter(id => ACTIVE_VADAPAV_IDS.includes(id))
      : [];
  } catch {
    return [];
  }
}

function saveFoundVadapavs(found) {
  try {
    localStorage.setItem(VADAPAV_STORAGE_KEY, JSON.stringify(found));
  } catch {}
}

function updateHuntCounter(found = getFoundVadapavs()) {
  huntCount.textContent = `${found.length} / ${TOTAL_VADAPAVS}`;
}

function collectVadapav(event) {
  const vadapav = event.currentTarget;
  const id = vadapav.dataset.vadapavId;
  const found = getFoundVadapavs();
  if (found.includes(id)) return;

  found.push(id);
  saveFoundVadapavs(found);
  vadapav.classList.add('is-found');
  vadapav.setAttribute('aria-hidden', 'true');
  updateHuntCounter(found);
  showToast(found.length >= TOTAL_VADAPAVS
    ? 'All current vadapavs found. The chutney ledger will reopen later.'
    : `Afternoon vadapav found. ${TOTAL_VADAPAVS - found.length} still hiding.`);
  window.setTimeout(() => vadapav.hidden = true, 760);
}

function restoreCollectedVadapavs() {
  const found = getFoundVadapavs();
  updateHuntCounter(found);

  vadapavs.forEach(vadapav => {
    if (found.includes(vadapav.dataset.vadapavId)) {
      vadapav.hidden = true;
    }
  });
}

// ── Dust motes atmosphere ─────────────────────────────────────────────────────
function spawnMotes() {
  const container = document.getElementById('dustMotes');
  for (let i = 0; i < 28; i++) {
    const mote = document.createElement('div');
    mote.className = 'mote';
    const size = Math.random() * 4 + 2;
    mote.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${Math.random() * 100}%;
      bottom:${Math.random() * 40}%;
      animation-duration:${Math.random() * 8 + 6}s;
      animation-delay:${Math.random() * -12}s;
      opacity:${Math.random() * .6 + .2};
    `;
    container.appendChild(mote);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY MATCH
// ═══════════════════════════════════════════════════════════════════════════════

// 8 emoji pairs — online friendship / birthday / warm vibes themed
const EMOJI_PAIRS = [
  '🌙', '💬', '🎂', '✨',
  '🎮', '🌸', '🍊', '🎈'
];

let matchCards   = [];   // array of { emoji, id, el }
let flipped      = [];   // currently face-up (unmatched) cards
let matchLocked  = false;
let moves        = 0;
let pairsFound   = 0;
const TOTAL_PAIRS = EMOJI_PAIRS.length;

function buildMatchDeck() {
  // Each emoji appears twice → shuffle
  const deck = [...EMOJI_PAIRS, ...EMOJI_PAIRS]
    .map((emoji, i) => ({ emoji, id: i % EMOJI_PAIRS.length }))
    .sort(() => Math.random() - .5);
  return deck;
}

function renderMatchGrid() {
  const grid = document.getElementById('matchGrid');
  grid.innerHTML = '';
  matchCards = [];
  flipped = [];
  matchLocked = false;
  moves = 0;
  pairsFound = 0;
  updateMatchMeta();
  document.getElementById('matchResult').textContent = '';

  buildMatchDeck().forEach((card, slotIdx) => {
    const el = document.createElement('button');
    el.className = 'card';
    el.type = 'button';
    el.setAttribute('aria-label', `Card ${slotIdx + 1}, face down`);
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">${card.emoji}</div>
      </div>`;
    el.addEventListener('click', () => onCardClick(slotIdx));
    grid.appendChild(el);
    matchCards.push({ ...card, el, slotIdx, matched: false });
  });
}

function updateMatchMeta() {
  document.getElementById('moveCount').textContent = moves;
  document.getElementById('pairCount').textContent = pairsFound;
}

function onCardClick(slotIdx) {
  if (matchLocked) return;
  const card = matchCards[slotIdx];
  if (card.matched || flipped.includes(slotIdx)) return;
  if (flipped.length >= 2) return;

  // Flip card
  card.el.classList.add('is-flipped');
  card.el.setAttribute('aria-label', `Card ${slotIdx + 1}, ${card.emoji}`);
  flipped.push(slotIdx);

  if (flipped.length === 2) {
    moves++;
    updateMatchMeta();
    checkMatchPair();
  }
}

function checkMatchPair() {
  matchLocked = true;
  const [a, b] = flipped.map(i => matchCards[i]);

  if (a.id === b.id) {
    // Match!
    [a, b].forEach(c => {
      c.matched = true;
      c.el.classList.add('is-matched');
      c.el.disabled = true;
    });
    pairsFound++;
    updateMatchMeta();
    flipped = [];
    matchLocked = false;

    if (pairsFound === TOTAL_PAIRS) {
      onMatchSolved();
    }
  } else {
    // No match — shake and flip back
    [a, b].forEach(c => c.el.classList.add('is-wrong'));
    setTimeout(() => {
      [a, b].forEach(c => {
        c.el.classList.remove('is-flipped', 'is-wrong');
        c.el.setAttribute('aria-label', `Card ${c.slotIdx + 1}, face down`);
      });
      flipped = [];
      matchLocked = false;
    }, 900);
  }
}

function onMatchSolved() {
  const rating = moves <= 12 ? '🌟 Brilliant!' : moves <= 18 ? '✨ Nice work!' : '🎈 Got there!';
  document.getElementById('matchResult').textContent =
    `${rating} All pairs found in ${moves} moves.`;
  earnStamp('match');
  showToast('🃏 Memory Match stamp earned!');
}

// Init match
renderMatchGrid();
document.getElementById('matchRestart').addEventListener('click', () => {
  renderMatchGrid();
});

// ═══════════════════════════════════════════════════════════════════════════════
// RING TOSS
// ═══════════════════════════════════════════════════════════════════════════════

// Playful "Allen facts" — warm assumptions that feel personal even without specifics
const ALLEN_FACTS = [
  'Allen has a playlist for every mood, including one specifically for 2am.',
  'Allen has at least one parasocial attachment to a fictional character and it runs deep.',
  'Allen would 100% befriend a stray cat within five minutes. No hesitation.',
  'Allen has given genuinely great advice to someone while simultaneously being a mess themselves.',
  'Allen\'s laugh is probably contagious in a way that makes everyone in the room worse at keeping a straight face.'
];

let pegsLanded   = 0;   // how many pegs have a ring on them
let tossInFlight = false;
const TOTAL_PEGS = 5;

function buildPegs() {
  const row = document.getElementById('pegsRow');
  row.innerHTML = '';
  pegsLanded = 0;

  for (let i = 0; i < TOTAL_PEGS; i++) {
    const peg = document.createElement('div');
    peg.className = 'peg';
    peg.id = `peg-${i}`;
    peg.innerHTML = `
      <div class="peg-pole">
        <div class="peg-ring"></div>
      </div>
      <div class="peg-base"></div>`;
    row.appendChild(peg);
  }
}

function onToss() {
  if (tossInFlight || pegsLanded >= TOTAL_PEGS) return;

  const ring = document.getElementById('ring');
  const btn  = document.getElementById('tossBtn');
  btn.disabled = true;
  tossInFlight = true;

  // Determine hit/miss — 70% hit rate, always lands somewhere
  const targetPegIdx = pegsLanded; // always aim for the next peg
  const hit = Math.random() < 0.72;

  ring.classList.remove('is-landed-anim');
  ring.classList.add('is-throwing');

  setTimeout(() => {
    ring.classList.remove('is-throwing');

    if (hit) {
      landOnPeg(targetPegIdx);
    } else {
      // Miss — show miss message briefly
      showFactText('Almost! The ring bounced off. Try again!', false);
    }

    tossInFlight = false;
    btn.disabled = false;
    ring.style.borderColor = '';
  }, 580);
}

function landOnPeg(pegIdx) {
  const peg = document.getElementById(`peg-${pegIdx}`);
  peg.classList.add('is-landed');

  const ring = document.getElementById('ring');
  ring.classList.add('is-landed-anim');
  // Shift ring colour to teal to match landed peg
  ring.style.borderColor = 'var(--teal)';

  pegsLanded++;

  // Reveal fact
  const fact = ALLEN_FACTS[pegIdx];
  showFactText(fact, true);
  showToast(`🎯 Peg ${pegsLanded} of ${TOTAL_PEGS} — keep going!`);

  if (pegsLanded === TOTAL_PEGS) {
    onTossSolved();
  }
}

function showFactText(text, isNew) {
  const reveal = document.getElementById('factReveal');
  const factEl = document.getElementById('factText');

  reveal.classList.remove('is-new');
  void reveal.offsetWidth; // force reflow to re-trigger animation
  factEl.textContent = text;
  if (isNew) reveal.classList.add('is-new');
}

function onTossSolved() {
  document.getElementById('tossResult').textContent =
    '🎉 All 5 pegs landed! Allen confirmed legendary.';
  document.getElementById('tossBtn').disabled = true;
  earnStamp('toss');
  showToast('🎯 Ring Toss stamp earned!');
}

// Init toss
buildPegs();
document.getElementById('tossBtn').addEventListener('click', onToss);

// ── Continue ──────────────────────────────────────────────────────────────────
document.getElementById('continueBtn').addEventListener('click', () => {
  window.location.href = 'scene4.html';
});

// ── Boot ──────────────────────────────────────────────────────────────────────
spawnMotes();
musicToggle.addEventListener('click', toggleMusic);
vadapavs.forEach(vadapav => vadapav.addEventListener('click', collectVadapav));
restoreCollectedVadapavs();
renderProgress();
tryAutoplayMusic();
