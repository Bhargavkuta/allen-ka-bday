// ── SCENE 5 — THE MIDNIGHT CARNIVAL (EPILOGUE) ─────────────────────────────
// Atmosphere shifts to a peaceful, reflective midnight state.
// Phases: intro → stargazing → letter → finale

(() => {
  // ═══ CONSTANTS ════════════════════════════════════════════════════════════
  const MUSIC_STORAGE_KEY = 'allenCarnivalMusic';

  const CONSTELLATIONS = [
    {
      id: 'orion',
      title: 'Orion',
      myth: 'The Hunter of the Night Sky',
      desc: 'A majestic figure standing tall among the stars, forever watching over the cosmic wilderness. Orion reminds us of strength and guidance in the darkest of nights.',
      stars: [
        { x: 30, y: 10 }, { x: 70, y: 15 }, // shoulders
        { x: 45, y: 50 }, { x: 50, y: 48 }, { x: 55, y: 46 }, // belt
        { x: 35, y: 90 }, { x: 75, y: 85 } // knees
      ],
      lines: [
        [0,2], [1,4], [2,3], [3,4], [2,5], [4,6]
      ]
    },
    {
      id: 'ursamajor',
      title: 'Ursa Major',
      myth: 'The Great Bear',
      desc: 'An ancient guardian wandering the northern sky. It contains the Big Dipper, pointing the way home for travelers and dreamers alike.',
      stars: [
        { x: 80, y: 20 }, { x: 65, y: 35 }, { x: 50, y: 45 }, { x: 35, y: 50 },
        { x: 20, y: 70 }, { x: 40, y: 85 }, { x: 60, y: 65 }
      ],
      lines: [
        [0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,3]
      ]
    },
    {
      id: 'cassiopeia',
      title: 'Cassiopeia',
      myth: 'The Seated Queen',
      desc: 'Forming a brilliant "W" in the sky, she is a symbol of beauty and pride, forever circling the celestial pole.',
      stars: [
        { x: 15, y: 30 }, { x: 35, y: 70 }, { x: 50, y: 40 },
        { x: 70, y: 80 }, { x: 85, y: 20 }
      ],
      lines: [
        [0,1], [1,2], [2,3], [3,4]
      ]
    },
    {
      id: 'cygnus',
      title: 'Cygnus',
      myth: 'The Celestial Swan',
      desc: 'Flying gracefully down the Milky Way, Cygnus represents transformation, elegance, and the calm pursuit of one\'s journey.',
      stars: [
        { x: 50, y: 10 }, { x: 50, y: 40 }, { x: 50, y: 70 }, { x: 50, y: 90 },
        { x: 20, y: 30 }, { x: 80, y: 50 }
      ],
      lines: [
        [0,1], [1,2], [2,3], [4,1], [1,5]
      ]
    }
  ];

  // ═══ STATE ════════════════════════════════════════════════════════════════
  let currentPhase = 'intro';
  let currentConstellation = 0;

  // ═══ DOM REFS ═════════════════════════════════════════════════════════════
  const $ = id => document.getElementById(id);
  const musicToggle = $('musicToggle');
  const musicLabel  = $('musicLabel');
  
  // ═══ MUSIC ════════════════════════════════════════════════════════════════
  const musicClient = window.CarnivalMusicClient || null;
  const usesShellMusic = Boolean(musicClient?.isEmbedded);
  
  // Use a calm music track if available. We will just use the standard tag for fallback.
  const bgMusic = usesShellMusic ? null : $('ambientMusic');
  if (bgMusic) { bgMusic.volume = 0; }

  let musicEnabled = true;
  let musicFadeId = null;

  try { musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off'; } catch {}

  function saveMusicPref() {
    try { localStorage.setItem(MUSIC_STORAGE_KEY, musicEnabled ? 'on' : 'off'); } catch {}
  }
  function updateMusicBtn() {
    musicToggle.setAttribute('aria-pressed', String(musicEnabled));
    musicLabel.textContent = musicEnabled ? 'Music on' : 'Music off';
  }
  function clearMusicFade() { if (musicFadeId) { clearInterval(musicFadeId); musicFadeId = null; } }

  function startMusic() {
    if (!musicEnabled) return;
    if (usesShellMusic) { musicClient.startMusic(); return; }
    clearMusicFade();
    bgMusic.play().then(() => {
      musicFadeId = setInterval(() => {
        if (bgMusic.volume < 0.38) { bgMusic.volume = Math.min(0.4, bgMusic.volume + 0.02); }
        else { bgMusic.volume = 0.4; clearMusicFade(); }
      }, 100);
    }).catch(() => updateMusicBtn());
  }
  function startMusicAfterGesture() {
    if (usesShellMusic) { if (musicEnabled) musicClient.startMusic(); return; }
    if (!musicEnabled || !bgMusic.paused) return;
    startMusic();
  }
  function tryAutoplayMusic() {
    updateMusicBtn();
    if (!musicEnabled) return;
    startMusic();
    window.addEventListener('pointerdown', startMusicAfterGesture, { once:true });
    window.addEventListener('keydown', startMusicAfterGesture, { once:true });
  }
  function stopMusic() {
    if (usesShellMusic) { musicClient.stopMusic(); return; }
    clearMusicFade();
    if (bgMusic.paused) return;
    musicFadeId = setInterval(() => {
      if (bgMusic.volume > 0.03) { bgMusic.volume = Math.max(0, bgMusic.volume - 0.03); }
      else { clearMusicFade(); bgMusic.pause(); }
    }, 70);
  }
  function toggleMusic() {
    if (usesShellMusic) { musicClient.toggleMusic(); return; }
    musicEnabled = !musicEnabled;
    saveMusicPref();
    updateMusicBtn();
    if (musicEnabled) startMusic(); else stopMusic();
  }

  window.addEventListener('carnival:music-state', e => {
    if (!usesShellMusic || !e.detail) return;
    musicEnabled = e.detail.enabled;
    updateMusicBtn();
  });

  // ═══ ATMOSPHERE ═══════════════════════════════════════════════════════════
  function spawnStars() {
    const c = $('skyStars');
    for (let i = 0; i < 150; i++) {
      const s = document.createElement('div');
      s.className = 'sky-star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.opacity = (Math.random() * 0.8 + 0.2).toFixed(2);
      s.style.animationDelay = (Math.random() * 5).toFixed(1) + 's';
      s.style.setProperty('--dur', (Math.random() * 3 + 2).toFixed(1) + 's');
      s.style.width = s.style.height = (Math.random() * 2 + 1).toFixed(1) + 'px';
      c.appendChild(s);
    }
  }

  function spawnFireflies() {
    const c = $('fireflies');
    for (let i = 0; i < 20; i++) {
      const f = document.createElement('div');
      f.className = 'firefly';
      const sz = Math.random() * 3 + 2;
      f.style.cssText = `
        width:${sz}px; height:${sz}px;
        left:${Math.random() * 100}%; bottom:${Math.random() * 40}%;
        --dx:${(Math.random()-.5)*100}px; --dy:${-Math.random()*80-20}px;
        animation-duration:${Math.random()*8+6}s;
        animation-delay:${Math.random()*-14}s;
      `;
      c.appendChild(f);
    }
  }

  function spawnShootingStar() {
    if (currentPhase !== 'finale' && currentPhase !== 'letter') return;
    const c = $('shootingStars');
    const s = document.createElement('div');
    s.className = 'shooting-star';
    s.style.top = (Math.random() * 30) + '%';
    s.style.right = (Math.random() * 50 - 20) + '%';
    c.appendChild(s);
    setTimeout(() => s.remove(), 2500);
    setTimeout(spawnShootingStar, Math.random() * 8000 + 4000);
  }

  // ═══ PHASE MANAGEMENT ═════════════════════════════════════════════════════
  function setPhase(phase) {
    currentPhase = phase;
    document.querySelectorAll('.phase').forEach(p => {
      p.hidden = true;
      p.classList.remove('is-active');
    });
    const el = $('phase' + phase.charAt(0).toUpperCase() + phase.slice(1));
    if (el) {
      el.hidden = false;
      void el.offsetWidth; // force reflow
      el.classList.add('is-active');
    }
  }

  // ═══ PHASE 1: INTRO ═══════════════════════════════════════════════════════
  function runIntro() {
    const l1 = $('introLine1');
    const l2 = $('introLine2');
    
    setTimeout(() => l1.classList.add('is-visible'), 2000);
    setTimeout(() => {
      l1.classList.remove('is-visible');
      l1.style.opacity = '0';
    }, 6000);

    setTimeout(() => l2.classList.add('is-visible'), 8000);
    setTimeout(() => {
      l2.classList.remove('is-visible');
      l2.style.opacity = '0';
    }, 12000);

    // Transition to stargazing
    setTimeout(() => {
      setPhase('stargazing');
      document.querySelector('.sky').classList.add('is-looking-up');
      initStargazing();
    }, 14000);
  }

  // ═══ PHASE 2: STARGAZING ══════════════════════════════════════════════════
  function initStargazing() {
    const dots = $('cDots');
    dots.innerHTML = '';
    CONSTELLATIONS.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = `c-dot ${i === 0 ? 'is-active' : ''}`;
      dots.appendChild(d);
    });

    renderConstellation(0);

    // Reveal UI
    setTimeout(() => {
      $('constellationInfo').classList.add('is-visible');
      document.querySelector('.c-controls').classList.add('is-visible');
    }, 1000);
  }

  function renderConstellation(idx) {
    const data = CONSTELLATIONS[idx];
    const container = $('constellationContainer');
    
    // Fade out old
    Array.from(container.children).forEach(c => {
      c.classList.remove('is-visible');
      setTimeout(() => c.remove(), 1500);
    });

    // Update info
    $('constellationInfo').classList.remove('is-visible');
    setTimeout(() => {
      $('cTitle').textContent = data.title;
      $('cMyth').textContent = data.myth;
      $('cDesc').textContent = data.desc;
      $('constellationInfo').classList.add('is-visible');
    }, 1000);

    // Update dots
    const dots = $('cDots').children;
    for(let i=0; i<dots.length; i++) {
      dots[i].classList.toggle('is-active', i === idx);
    }

    // Draw new
    setTimeout(() => {
      const starEls = [];
      data.stars.forEach(st => {
        const el = document.createElement('div');
        el.className = 'c-star';
        el.style.left = st.x + '%';
        el.style.top = st.y + '%';
        container.appendChild(el);
        starEls.push(el);
        setTimeout(() => el.classList.add('is-visible'), Math.random() * 800);
      });

      setTimeout(() => {
        data.lines.forEach(line => {
          const s1 = data.stars[line[0]];
          const s2 = data.stars[line[1]];
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;

          const l = document.createElement('div');
          l.className = 'c-line';
          l.style.width = dist + '%';
          l.style.left = s1.x + '%';
          l.style.top = s1.y + '%';
          l.style.transform = `rotate(${angle}deg)`;
          container.appendChild(l);
          
          setTimeout(() => l.classList.add('is-visible'), Math.random() * 1000);
        });
      }, 800);
    }, 1000);

    // If it's the last constellation, show the Finish button
    if (idx === CONSTELLATIONS.length - 1) {
      const btn = $('finishStarsBtn');
      setTimeout(() => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }, 3000);
    }
  }

  $('cNext').addEventListener('click', () => {
    if (currentConstellation < CONSTELLATIONS.length - 1) {
      currentConstellation++;
      renderConstellation(currentConstellation);
    }
  });

  $('cPrev').addEventListener('click', () => {
    if (currentConstellation > 0) {
      currentConstellation--;
      renderConstellation(currentConstellation);
    }
  });

  $('finishStarsBtn').addEventListener('click', () => {
    document.querySelector('.sky').classList.remove('is-looking-up');
    setPhase('letter');
    setTimeout(spawnShootingStar, 2000);
  });

  // ═══ PHASE 3: THE LETTER ══════════════════════════════════════════════════
  $('envelopeWrap').addEventListener('click', function() {
    if (this.classList.contains('is-opening')) return;
    this.classList.add('is-opening');
    
    // Animate opening
    setTimeout(() => {
      $('letterView').classList.add('is-visible');
    }, 2000);
  });

  $('closeLetterBtn').addEventListener('click', () => {
    $('letterView').classList.remove('is-visible');
    
    setTimeout(() => {
      setPhase('finale');
      runFinale();
    }, 1500);
  });

  // ═══ PHASE 4: FINALE ══════════════════════════════════════════════════════
  function runFinale() {
    const sky = document.querySelector('.sky');
    sky.classList.add('is-finale');
    $('carnivalBg').classList.add('is-hidden');
    $('hud').classList.add('is-hidden');

    const m1 = $('fMsg1');
    const m2 = $('fMsg2');
    const m3 = $('fMsg3');

    setTimeout(() => m1.classList.add('is-visible'), 2000);
    setTimeout(() => { m1.classList.remove('is-visible'); }, 6000);

    setTimeout(() => m2.classList.add('is-visible'), 8000);
    setTimeout(() => { m2.classList.remove('is-visible'); }, 12000);

    setTimeout(() => {
      m3.classList.add('is-visible');
      stopMusic(); // fade out music
    }, 15000);

    // Keep m3 visible and let the user soak in the atmosphere. No auto-redirect.
  }

  // ═══ BOOT ═════════════════════════════════════════════════════════════════
  spawnStars();
  spawnFireflies();
  musicToggle.addEventListener('click', toggleMusic);
  tryAutoplayMusic();

  // Start the cinematic sequence
  setTimeout(runIntro, 1000);

})();
