// ── SCENE 4 — THE BIRTHDAY CAKE CEREMONY ───────────────────────────────────
// Phase-based state machine: arrival → customize → assembly → ready →
// cutting → celebration → ending. Emotional climax of the carnival.

(() => {
  // ═══ CONSTANTS ════════════════════════════════════════════════════════════
  const VADAPAV_STORAGE_KEY = 'allenCarnivalVadapavs';
  const TOTAL_VADAPAVS = 5;
  const ACTIVE_VADAPAV_IDS = [
    'dawn-sleepy','morning-ticket-gremlin','morning-flag-napper',
    'afternoon-sun-bather','afternoon-wheel-peek'
  ];
  const MUSIC_STORAGE_KEY = 'allenCarnivalMusic';

  const FLAVOR_COLORS = {
    chocolate:    { body:'#5C3A1E', light:'#7B5B3A' },
    vanilla:      { body:'#FFF0D4', light:'#FFFAF0' },
    strawberry:   { body:'#FFB6C1', light:'#FFD1DC' },
    redvelvet:    { body:'#A41034', light:'#C41E3A' },
    butterscotch: { body:'#D4952A', light:'#E8B84A' }
  };
  const FROSTING_COLORS = {
    chocolate:  { frost:'#3E2215', light:'#5C3A2A' },
    vanilla:    { frost:'#FFFDD0', light:'#FFFFF0' },
    strawberry: { frost:'#FF9AAF', light:'#FFB3C6' },
    blueberry:  { frost:'#7B68EE', light:'#9890F0' },
    whitecream: { frost:'#FFFFFF', light:'#FFFFF5' }
  };
  const DECO_EMOJIS = {
    strawberries:'🍓', chocolatecurls:'🍫', macarons:'🧁', sprinkles:'🎊',
    candles:'🕯️', goldflakes:'⭐', roses:'🌹', pearls:'💎', stars:'🌟'
  };

  // ═══ STATE ════════════════════════════════════════════════════════════════
  let currentPhase = 'arrival';
  const cakeConfig = { flavor:null, shape:null, frosting:null, decorations:[] };

  // ═══ DOM REFS ═════════════════════════════════════════════════════════════
  const $ = id => document.getElementById(id);
  const musicToggle = $('musicToggle');
  const musicLabel  = $('musicLabel');
  const huntCount   = $('huntCount');
  const toast       = $('toast');

  // ═══ MUSIC ════════════════════════════════════════════════════════════════
  const musicClient = window.CarnivalMusicClient || null;
  const usesShellMusic = Boolean(musicClient?.isEmbedded);
  const bgMusic = usesShellMusic ? null : new Audio('media/scene1.mp3');
  if (bgMusic) { bgMusic.loop = true; bgMusic.preload = 'auto'; }

  const birthdayJingle = new Audio('media/birthday jingle.mp3');
  birthdayJingle.loop = true;
  birthdayJingle.preload = 'auto';
  birthdayJingle.volume = 0;

  let musicEnabled = true;
  let musicFadeId = null;
  let jingleFadeId = null;
  let toastTimer = null;

  try { musicEnabled = localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off'; } catch {}

  function saveMusicPref() {
    try { localStorage.setItem(MUSIC_STORAGE_KEY, musicEnabled ? 'on' : 'off'); } catch {}
  }
  function updateMusicBtn() {
    musicToggle.setAttribute('aria-pressed', String(musicEnabled));
    musicToggle.setAttribute('aria-label', musicEnabled ? 'Turn carnival music off' : 'Turn carnival music on');
    musicLabel.textContent = musicEnabled ? 'Music on' : 'Music off';
  }
  function clearMusicFade() { if (musicFadeId) { clearInterval(musicFadeId); musicFadeId = null; } }

  function startMusic() {
    if (!musicEnabled) return;
    if (usesShellMusic) { musicClient.startMusic(); return; }
    clearMusicFade();
    bgMusic.volume = Math.min(bgMusic.volume || 0, 0.5);
    bgMusic.play().then(() => {
      musicFadeId = setInterval(() => {
        if (bgMusic.volume < 0.48) { bgMusic.volume = Math.min(0.5, bgMusic.volume + 0.02); }
        else { bgMusic.volume = 0.5; clearMusicFade(); }
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

  // Birthday jingle fading
  function fadeInJingle() {
    if (jingleFadeId) clearInterval(jingleFadeId);
    birthdayJingle.volume = 0;
    birthdayJingle.play().then(() => {
      jingleFadeId = setInterval(() => {
        if (birthdayJingle.volume < 0.48) birthdayJingle.volume = Math.min(0.5, birthdayJingle.volume + 0.02);
        else { birthdayJingle.volume = 0.5; clearInterval(jingleFadeId); jingleFadeId = null; }
      }, 80);
    }).catch(() => {});
  }
  function fadeOutJingle(cb) {
    if (jingleFadeId) clearInterval(jingleFadeId);
    jingleFadeId = setInterval(() => {
      if (birthdayJingle.volume > 0.03) birthdayJingle.volume = Math.max(0, birthdayJingle.volume - 0.03);
      else { clearInterval(jingleFadeId); jingleFadeId = null; birthdayJingle.pause(); birthdayJingle.currentTime = 0; if (cb) cb(); }
    }, 70);
  }

  // ═══ VADAPAV HUNT ═════════════════════════════════════════════════════════
  function getFoundVadapavs() {
    try {
      const s = JSON.parse(localStorage.getItem(VADAPAV_STORAGE_KEY) || '[]');
      return Array.isArray(s) ? s.filter(id => ACTIVE_VADAPAV_IDS.includes(id)) : [];
    } catch { return []; }
  }
  function updateHuntCounter() {
    huntCount.textContent = `${getFoundVadapavs().length} / ${TOTAL_VADAPAVS}`;
  }

  // ═══ TOAST ════════════════════════════════════════════════════════════════
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  // ═══ ATMOSPHERE ═══════════════════════════════════════════════════════════
  function spawnStars() {
    const c = $('skyStars');
    for (let i = 0; i < 70; i++) {
      const s = document.createElement('div');
      s.className = 'sky-star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 40 + '%';
      s.style.opacity = (Math.random() * .6 + .2).toFixed(2);
      s.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
      s.style.width = s.style.height = (Math.random() * 2 + 1).toFixed(1) + 'px';
      c.appendChild(s);
    }
  }

  function spawnFireflies() {
    const c = $('fireflies');
    for (let i = 0; i < 18; i++) {
      const f = document.createElement('div');
      f.className = 'firefly';
      const sz = Math.random() * 4 + 2;
      f.style.cssText = `
        width:${sz}px; height:${sz}px;
        left:${Math.random() * 90 + 5}%; bottom:${Math.random() * 50 + 10}%;
        --fx:${(Math.random()-.5)*80}px; --fy:${-Math.random()*60-20}px;
        --fx2:${(Math.random()-.5)*120}px; --fy2:${-Math.random()*100-40}px;
        animation-duration:${Math.random()*8+6}s;
        animation-delay:${Math.random()*-14}s;
      `;
      c.appendChild(f);
    }
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
      el.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }

  // ═══ PHASE 1: ARRIVAL ═════════════════════════════════════════════════════
  $('beginBtn').addEventListener('click', () => {
    setPhase('customize');
    showToast('Design your dream cake ✨');
  });

  // ═══ PHASE 2: CUSTOMIZE ═══════════════════════════════════════════════════
  const STEPS = ['Flavor','Shape','Frosting','Deco'];
  const stepEls = STEPS.map(s => $('step' + s));

  function revealNextStep(currentIdx) {
    if (currentIdx + 1 < stepEls.length) {
      const next = stepEls[currentIdx + 1];
      next.hidden = false;
      void next.offsetWidth;
      next.classList.add('is-active');
      setTimeout(() => next.scrollIntoView({ behavior:'smooth', block:'center' }), 100);
    }
  }

  document.querySelectorAll('.card-row').forEach(row => {
    const cat = row.dataset.category;
    row.addEventListener('click', e => {
      const card = e.target.closest('.opt-card');
      if (!card) return;
      const val = card.dataset.value;

      if (cat === 'decoration') {
        // Multi-select
        card.classList.toggle('is-selected');
        const idx = cakeConfig.decorations.indexOf(val);
        if (idx >= 0) cakeConfig.decorations.splice(idx, 1);
        else cakeConfig.decorations.push(val);
      } else {
        // Single-select
        row.querySelectorAll('.opt-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        cakeConfig[cat] = val;

        // Reveal next step
        const stepIdx = cat === 'flavor' ? 0 : cat === 'shape' ? 1 : cat === 'frosting' ? 2 : -1;
        if (stepIdx >= 0) revealNextStep(stepIdx);
      }
    });
  });

  $('createBtn').addEventListener('click', () => {
    if (!cakeConfig.flavor || !cakeConfig.shape || !cakeConfig.frosting) {
      showToast('Please select a flavor, shape, and frosting first!');
      return;
    }
    if (cakeConfig.decorations.length === 0) {
      showToast('Pick at least one decoration to make it special ✨');
      return;
    }
    setPhase('assembly');
    runAssembly();
  });

  // ═══ PHASE 3: ASSEMBLY ════════════════════════════════════════════════════
  const narration = $('assemblyText');

  function narrate(text) {
    narration.style.opacity = '0';
    setTimeout(() => { narration.textContent = text; narration.style.opacity = '1'; }, 300);
  }

  function runAssembly() {
    const container = $('cakeContainer');
    container.innerHTML = '';

    const fc = FLAVOR_COLORS[cakeConfig.flavor] || FLAVOR_COLORS.chocolate;
    const frc = FROSTING_COLORS[cakeConfig.frosting] || FROSTING_COLORS.chocolate;
    const isTwoTier = cakeConfig.shape === 'twotier';
    const isHeart = cakeConfig.shape === 'heart';
    const isSquare = cakeConfig.shape === 'square';

    const radius = isSquare ? '16px' : isHeart ? '0' : '50%';
    container.style.setProperty('--cake-body', fc.body);
    container.style.setProperty('--frost', frc.frost);

    // Build voxel stack (returns the wrapper and the top voxel element for decorations)
    function makeVoxelStack(cls, w, thickness, bodyColor, topColor, shapeClass, zIndex, startY) {
      const wrapper = document.createElement('div');
      wrapper.className = `voxel-wrapper ${cls}`;
      wrapper.style.zIndex = zIndex;
      wrapper.style.left = `calc(50% - ${w/2}px)`;
      wrapper.style.top = `calc(50% - ${w/2}px)`;
      wrapper.style.width = w + 'px';
      wrapper.style.height = w + 'px';
      
      let topVoxel = null;

      for (let i = thickness; i >= 0; i -= 2) {
        const voxel = document.createElement('div');
        voxel.className = `voxel ${shapeClass} ${i === 0 ? 'top-voxel' : ''}`;
        voxel.style.width = w + 'px';
        voxel.style.height = w + 'px';
        
        // Darken side layers slightly for 3D depth
        voxel.style.setProperty('--layer-color', i === 0 ? topColor : bodyColor);
        if (i !== 0) voxel.style.filter = 'brightness(0.85)';
        
        const y = startY + i;
        voxel.style.transform = `translateY(${y}px) scaleY(0.6) ${shapeClass === 'shape-square' ? 'rotateZ(45deg)' : ''}`;
        
        wrapper.appendChild(voxel);
        if (i === 0) topVoxel = voxel;
      }
      return { wrapper, topVoxel };
    }

    const tiers = [];
    const shapeClass = isHeart ? 'shape-heart' : isSquare ? 'shape-square' : 'shape-round';
    
    // Purble Place metallic plate (silver/grey)
    const plateWidth = isTwoTier ? 260 : 240;
    const plate = makeVoxelStack('cake-plate', plateWidth, 12, '#A0A0A0', '#E8E8E8', 'shape-round', 1, 0);
    container.appendChild(plate.wrapper);

    if (isTwoTier) {
      const t1 = makeVoxelStack('cake-tier-1', 200, 36, fc.body, frc.frost, shapeClass, 2, -36);
      const t2 = makeVoxelStack('cake-tier-2', 120, 30, fc.body, frc.frost, shapeClass, 3, -66);
      tiers.push(t1, t2);
      container.appendChild(t1.wrapper);
      container.appendChild(t2.wrapper);
    } else {
      const t1 = makeVoxelStack('cake-tier-1', 200, 44, fc.body, frc.frost, shapeClass, 2, -44);
      tiers.push(t1);
      container.appendChild(t1.wrapper);
    }

    // ── Choreographed animation sequence ──
    let t = 0;
    narrate('Building your cake...');

    // Step 1: Show tiers rising
    setTimeout(() => plate.wrapper.classList.add('is-visible'), t);
    t += 400;

    tiers.forEach((tier, i) => {
      setTimeout(() => tier.wrapper.classList.add('is-visible'), t + i * 400);
    });
    t += tiers.length * 400 + 400;

    // Step 2: Frosting (Baked into top-down view, so we just announce it for effect)
    setTimeout(() => narrate('Adding the glossy frosting...'), t);
    t += 800;

    // Step 3: Decorations
    setTimeout(() => narrate('Placing your decorations...'), t);
    t += 500;

    const mainTier = tiers[0].topVoxel; // bottom (largest) tier

    // Add candles if selected
    if (cakeConfig.decorations.includes('candles')) {
      const candleTier = tiers[tiers.length - 1].topVoxel; // top tier
      const count = isTwoTier ? 4 : 6;
      for(let i=0; i<count; i++) {
        const candle = document.createElement('div');
        candle.className = 'cake-candle';
        // Place in a circle
        const angle = (i / count) * 2 * Math.PI;
        const radiusPercent = isTwoTier ? 25 : 35;
        candle.style.left = `${50 + radiusPercent * Math.cos(angle)}%`;
        candle.style.top = `${50 + radiusPercent * Math.sin(angle)}%`;
        
        if (isSquare) candle.style.setProperty('--unrot', 'rotateZ(-45deg)');
        
        candleTier.appendChild(candle);
        setTimeout(() => candle.classList.add('is-visible'), t + i * 150);
      }
      t += count * 150 + 300;
    }

    // Add sprinkles if selected
    if (cakeConfig.decorations.includes('sprinkles')) {
      const colors = ['#FF6B8A','#FFD700','#7B68EE','#00D4AA','#FF9248','#FDE68A'];
      tiers.forEach(tier => {
        const sprLayer = document.createElement('div');
        sprLayer.className = 'sprinkles-layer';
        for (let i = 0; i < 30; i++) {
          const sp = document.createElement('div');
          sp.className = 'sprinkle';
          // Random 2D coordinates clustered centrally
          const r = Math.random() * 40;
          const theta = Math.random() * 2 * Math.PI;
          const left = 50 + r * Math.cos(theta);
          const top = 50 + r * Math.sin(theta);
          
          sp.style.cssText = `
            left:${left}%; top:${top}%;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            --rot:${Math.random()*180}deg;
            animation-delay:${(Math.random()*.5).toFixed(2)}s;
          `;
          if (isSquare) sp.style.setProperty('--unrot', 'rotateZ(-45deg)');
          sprLayer.appendChild(sp);
          setTimeout(() => sp.classList.add('is-visible'), t + i * 20);
        }
        tier.topVoxel.appendChild(sprLayer);
      });
      t += 800;
    }

    // Other decorations as emoji items
    const otherDecos = cakeConfig.decorations.filter(d => d !== 'candles' && d !== 'sprinkles');
    otherDecos.forEach((deco, i) => {
      for(let j=0; j<3; j++) { // spawn 3 of each
        const el = document.createElement('div');
        el.className = 'cake-deco';
        el.textContent = DECO_EMOJIS[deco] || '✨';
        
        const r = 20 + Math.random() * 20; // 20-40% radius
        const angle = Math.random() * 2 * Math.PI;
        el.style.left = `${50 + r * Math.cos(angle)}%`;
        el.style.top = `${50 + r * Math.sin(angle)}%`;
        el.style.setProperty('--rot', `${(Math.random()-0.5)*40}deg`);
        if (isSquare) el.style.setProperty('--unrot', 'rotateZ(-45deg)');
        
        mainTier.appendChild(el);
        setTimeout(() => el.classList.add('is-visible'), t + (i*3+j) * 150);
      }
    });
    t += otherDecos.length * 3 * 150 + 500;

    // Step 4: Final sparkle + reveal
    setTimeout(() => narrate('Almost there...'), t);
    t += 1200;

    setTimeout(() => {
      narrate('');
      const ready = $('readyTitle');
      ready.hidden = false;

      // Add zoom class to spotlight
      $('cakeContainer').parentElement.classList.add('is-zoomed');

      setTimeout(() => {
        const btn = $('cutBtn');
        btn.hidden = false;
        btn.classList.add('is-active');
      }, 600);
      currentPhase = 'ready';
    }, t);
  }

  // ═══ PHASE 4-5: CUTTING ═══════════════════════════════════════════════════
  $('cutBtn').addEventListener('click', () => {
    if (currentPhase !== 'ready') return;
    currentPhase = 'cutting';
    $('cutBtn').hidden = true;
    $('readyTitle').hidden = true;

    // Show knife overlay
    const overlay = $('knifeOverlay');
    overlay.hidden = false;
    const knife = $('knife');
    const glow = $('cutGlow');

    // Spawn sparkles around the knife
    const sparklesLayer = $('knifeSparkles');
    if (sparklesLayer) {
      sparklesLayer.innerHTML = '';
      for (let i = 0; i < 24; i++) {
        const sp = document.createElement('div');
        sp.className = 'knife-sparkle';
        sp.style.left = '50%'; sp.style.top = '25%';
        sp.style.setProperty('--dx', (Math.random() - 0.5) * 160 + 'px');
        sp.style.setProperty('--dy', (Math.random() - 0.5) * 160 + 'px');
        sparklesLayer.appendChild(sp);
      }
    }

    // Step 1: Knife appears
    setTimeout(() => knife.classList.add('is-visible'), 100);

    // Step 1.5: Sparkles gather
    setTimeout(() => {
      if (sparklesLayer) {
        sparklesLayer.querySelectorAll('.knife-sparkle').forEach(sp => sp.classList.add('is-visible'));
      }
    }, 400);

    // Step 2: Cut glow line
    setTimeout(() => glow.classList.add('is-active'), 1000);

    // Step 3: Cut down
    setTimeout(() => {
      knife.classList.add('is-cutting');
      $('cakeContainer').classList.add('is-cutting');
    }, 1600);

    // Step 4: Split
    setTimeout(() => {
      const originalContainer = $('cakeContainer');
      const rightHalf = originalContainer.cloneNode(true);
      rightHalf.id = 'cakeContainerRight';
      rightHalf.className = originalContainer.className + ' cake-right-half';
      originalContainer.classList.add('cake-left-half');
      originalContainer.parentElement.appendChild(rightHalf);

      // Force layout to ensure transitions fire
      void originalContainer.offsetWidth;
      
      originalContainer.classList.add('is-split');
      rightHalf.classList.add('is-split');

      glow.classList.remove('is-active');
      glow.style.opacity = '0';
      setTimeout(() => knife.style.opacity = '0', 800);
    }, 2400);

    // Step 5: Celebration
    setTimeout(() => {
      // Fade out carnival music, start jingle
      stopMusic();
      setTimeout(() => fadeInJingle(), 800);

      overlay.hidden = true;

      startCelebration();
    }, 3600);
  });

  // ═══ PHASE 6: CELEBRATION ═════════════════════════════════════════════════
  let confettiEngine = null;
  let fireworkInterval = null;

  function startCelebration() {
    currentPhase = 'celebration';
    setPhase('celebration');
    showToast('🎉 Happy Birthday Allen! 🎉');

    document.body.classList.add('is-celebrating');

    // Start confetti
    confettiEngine = new ConfettiEngine($('confettiCanvas'));
    confettiEngine.burst(220);
    // Additional bursts
    setTimeout(() => confettiEngine.burst(100), 1500);
    setTimeout(() => confettiEngine.burst(80), 3000);

    // Start fireworks
    fireworkInterval = setInterval(spawnFirework, 600);

    // Spawn balloons
    spawnBalloons(12);

    // Spawn hearts and magical particles
    spawnHearts(18);
    spawnMagicalParticles(40);

    // Schedule ending
    setTimeout(() => {
      clearInterval(fireworkInterval);
      fireworkInterval = null;
      startEnding();
    }, 10000);
  }

  // ── Confetti Engine ──
  class ConfettiEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.running = false;
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
    }
    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
    burst(count) {
      const colors = ['#FFD700','#FF6B8A','#7B68EE','#00D4AA','#FF9248','#FFF5E4','#FF4567','#FDE68A','#99F6E4'];
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height * 0.35;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: cx + (Math.random() - .5) * 280,
          y: cy,
          vx: (Math.random() - .5) * 14,
          vy: Math.random() * -13 - 5,
          w: Math.random() * 8 + 3,
          h: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          rotV: (Math.random() - .5) * 12,
          gravity: .14 + Math.random() * .04,
          drag: .99
        });
      }
      if (!this.running) { this.running = true; this.animate(); }
    }
    animate() {
      if (!this.running) return;
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.particles = this.particles.filter(p => p.y < canvas.height + 30);
      for (const p of this.particles) {
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (this.particles.length > 0) requestAnimationFrame(() => this.animate());
      else this.running = false;
    }
    stop() {
      this.running = false;
      this.particles = [];
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      window.removeEventListener('resize', this._onResize);
    }
  }

  // ── Fireworks ──
  function spawnFirework() {
    const layer = $('fireworksLayer');
    const fw = document.createElement('div');
    fw.className = 'firework';
    fw.style.left = (Math.random() * 70 + 15) + '%';
    fw.style.setProperty('--hue', Math.floor(Math.random() * 360));
    layer.appendChild(fw);
    setTimeout(() => fw.remove(), 2200);
  }

  // ── Balloons ──
  function spawnBalloons(count) {
    const layer = $('balloonsLayer');
    const colors = ['#FF6B8A','#FFD700','#7B68EE','#00D4AA','#FF9248','#F472B6','#A78BFA','#99F6E4'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const b = document.createElement('div');
        b.className = 'balloon';
        const c = colors[Math.floor(Math.random() * colors.length)];
        b.style.cssText = `
          left:${Math.random()*85+5}%;
          background:${c}; color:${c};
          --dur:${Math.random()*5+6}s;
          --sway:${(Math.random()-.5)*40}px;
          --sway2:${(Math.random()-.5)*60}px;
          width:${Math.random()*12+24}px;
          height:${Math.random()*14+32}px;
        `;
        layer.appendChild(b);
        setTimeout(() => b.remove(), 12000);
      }, i * 350);
    }
  }

  // ── Hearts ──
  function spawnHearts(count) {
    const layer = $('heartsLayer');
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const h = document.createElement('div');
        h.className = 'heart-particle';
        h.textContent = '❤️';
        h.style.left = (Math.random() * 80 + 10) + '%';
        h.style.setProperty('--dur', (Math.random() * 4 + 5) + 's');
        h.style.setProperty('--rot1', (Math.random() * 50 - 25) + 'deg');
        h.style.setProperty('--rot2', (Math.random() * 50 - 25) + 'deg');
        layer.appendChild(h);
        setTimeout(() => h.remove(), 10000);
      }, i * 280);
    }
  }

  // ── Magical Particles ──
  function spawnMagicalParticles(count) {
    const layer = $('heartsLayer');
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = 'magic-particle';
        p.style.left = (Math.random() * 100) + '%';
        p.style.top = (Math.random() * 100) + '%';
        p.style.setProperty('--dur', (Math.random() * 3 + 2) + 's');
        p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
        p.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
        layer.appendChild(p);
        setTimeout(() => p.remove(), 6000);
      }, i * 150);
    }
  }

  // ═══ PHASE 7: ENDING ══════════════════════════════════════════════════════
  function startEnding() {
    currentPhase = 'ending';

    document.body.classList.remove('is-celebrating');
    document.body.classList.add('is-ending');

    // Clean up celebration effects
    if (confettiEngine) confettiEngine.stop();
    $('fireworksLayer').innerHTML = '';
    // Balloons auto-remove

    // Fade out jingle, resume carnival music
    fadeOutJingle(() => {
      if (musicEnabled) startMusic();
    });

    setPhase('ending');
    showToast('The carnival has one more surprise...');

    // Auto-navigate after 5 seconds
    setTimeout(() => {
      window.location.href = 'scene5.html';
    }, 5000);
  }

  // ═══ BOOT ═════════════════════════════════════════════════════════════════
  spawnStars();
  spawnFireflies();
  updateHuntCounter();
  musicToggle.addEventListener('click', toggleMusic);
  tryAutoplayMusic();
})();
