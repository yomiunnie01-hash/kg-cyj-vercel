/* DoraCura — game-style loading intro.
   Preloads the key images, shows a bat running along a candy loading bar,
   then a PLAY button; on start it bursts stars/hearts/bats and opens an iris
   onto the page. Fires `intro:done` (and sets window.__introDone) for main.js. */
(() => {
  'use strict';
  const intro = document.getElementById('intro');
  const done = () => {
    window.__introDone = true;
    window.dispatchEvent(new Event('intro:done'));
  };
  if (!intro) { done(); return; }

  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  window.scrollTo(0, 0);

  /* ----- stars & bats ----- */
  const stars = intro.querySelector('.i-stars');
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('i');
    if (i % 4 === 0) s.className = 'y';
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--s:${2 + Math.random() * 4}px;--t:${1.4 + Math.random() * 2.4}s;--d:${-Math.random() * 3}s`;
    stars.appendChild(s);
  }
  const BAT = '<svg viewBox="0 0 64 32"><path d="M32 30c-2-4-5-6-9-5 1-4-1-7-5-8 0 3-2 5-5 5-3-3-7-4-12-2 6-5 9-12 9-18 3 5 8 7 13 6 3 4 7 6 9 6l1-4 1 4c2 0 6-2 9-6 5 1 10-1 13-6 0 6 3 13 9 18-5-2-9-1-12 2-3 0-5-2-5-5-4 1-6 4-5 8-4-1-7 1-9 5z"/></svg>';
  const bats = intro.querySelector('.i-bats');
  [[18, 7, 0, 40], [62, 9, -3, 30], [34, 11, -6, 52], [78, 8, -1.5, 26]].forEach(([top, t, d, w]) => {
    bats.insertAdjacentHTML('beforeend', BAT);
    bats.lastElementChild.style.cssText = `top:${top}%;width:${w}px;--t:${t}s;--d:${d}s`;
  });

  /* ----- preload & progress ----- */
  const ASSETS = [
    'assets/logo_v.png', 'assets/logo_h.png', 'assets/cover_ai_simple.png',
    'assets/hd/twins_hug.webp', 'assets/hd/dora_wave.webp', 'assets/hd/cura_wave.webp', 'assets/hd/family_sit.webp',
    'assets/hd/kids_blocks.webp', 'assets/hd/family_cheer.webp', 'assets/hd/kids_fly.webp', 'assets/hd/bio_wave.webp',
    'assets/house1.jpg', 'assets/room_dora.jpg', 'assets/banner3.jpg', 'assets/banner2.jpg', 'assets/room_play.jpg',
  ];
  let loaded = 0;
  ASSETS.forEach(src => {
    const im = new Image();
    im.onload = im.onerror = () => { loaded++; };
    im.src = src;
  });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  let fontsOk = false; fontsReady.then(() => { fontsOk = true; });

  const fill = intro.querySelector('.i-fill');
  const runner = intro.querySelector('.i-runner');
  const pct = intro.querySelector('.i-pct');
  const tip = intro.querySelector('.i-tip');
  const TIPS = ['Waking up the bats…', 'Polishing tiny fangs…', "Warming up Bio's milk…", 'Tuning the nursery rhymes…', 'Fluffing the capes…', 'Almost there!'];
  let tipI = 0;
  const tipT = setInterval(() => {
    tip.style.opacity = 0;
    setTimeout(() => { tipI = Math.min(TIPS.length - 2, tipI + 1); tip.textContent = TIPS[tipI]; tip.style.opacity = 1; }, 250);
  }, 750);

  const MIN = still ? 300 : 2600, MAX = 9000;
  const t0 = performance.now();
  let shown = 0, ready = false;
  function step(now) {
    const el = now - t0;
    const real = (loaded + (fontsOk ? 1 : 0)) / (ASSETS.length + 1);
    const target = el > MAX ? 1 : Math.min(real, el / MIN);
    shown += (target - shown) * 0.12;
    if (target >= 1 && 1 - shown < 0.004) shown = 1;
    const p = shown * 100;
    fill.style.width = `calc(${p}% - 8px)`;
    runner.style.left = `calc(${p}% - ${p * 0.08}px)`;
    pct.textContent = `${Math.round(p)}%`;
    if (shown >= 1) return onReady();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  /* ----- ready → PLAY ----- */
  const startBtn = intro.querySelector('.i-start');
  let autoT;
  function onReady() {
    if (ready) return; ready = true;
    clearInterval(tipT); tip.textContent = TIPS[TIPS.length - 1];
    intro.classList.add('ready');
    if (still) return start();
    autoT = setTimeout(start, 6000);
  }

  /* ----- start: burst + iris reveal ----- */
  const HEART = '<svg viewBox="0 0 24 24"><path fill="#FF4D6D" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.3 4.4 2.6.8-1.3 2.2-2.6 4.4-2.6 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const STAR = c => `<svg viewBox="0 0 24 24"><path fill="${c}" d="M12 1.5l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.5l-6.3 3.4 1.3-7.1L1.8 8.9l7.1-.9z"/></svg>`;
  const DOT = c => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="${c}"/></svg>`;
  const SMALLBAT = BAT.replace('<svg ', '<svg fill="#1E1A24" ');
  const KINDS = [HEART, STAR('#FFD43F'), STAR('#FFFFFF'), DOT('#3C7BF0'), DOT('#FF9DBB'), SMALLBAT, STAR('#FFD43F'), HEART];
  function burst(x, y, n = 34) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'i-p';
      p.innerHTML = KINDS[i % KINDS.length];
      document.body.appendChild(p);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 120 + Math.random() * 260;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 60;
      const sc = 0.6 + Math.random() * 1.1, rot = (Math.random() - 0.5) * 540;
      p.animate([
        { transform: `translate(${x - 13}px, ${y - 13}px) scale(.2)`, opacity: 1 },
        { transform: `translate(${x - 13 + dx * 0.7}px, ${y - 13 + dy * 0.7}px) scale(${sc}) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x - 13 + dx}px, ${y - 13 + dy + 80}px) scale(${sc * 0.6}) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }).onfinish = () => p.remove();
    }
  }
  let started = false;
  function start(e) {
    if (started || !ready) return;
    started = true; clearTimeout(autoT);
    const r = startBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    intro.style.setProperty('--x', `${x}px`);
    intro.style.setProperty('--y', `${y}px`);
    if (!still) burst(x, y);
    intro.classList.add('leave');
    setTimeout(() => {
      intro.classList.add('reveal');
      root.classList.remove('intro-on');
      window.scrollTo(0, 0);
      setTimeout(done, 250);          // hero title + book begin while the iris opens
    }, still ? 0 : 380);
    setTimeout(() => { intro.classList.add('gone'); intro.setAttribute('aria-hidden', 'true'); }, still ? 500 : 1600);
  }
  intro.addEventListener('click', start);
  startBtn.addEventListener('click', e => { e.stopPropagation(); start(e); });
  window.addEventListener('keydown', e => { if (!started && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); start(e); } });
})();
