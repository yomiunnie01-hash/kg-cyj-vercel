/* DoraCura preview — motion rebuilt from ribbit.dk/process (ProcessBook, ProcessChapters,
   Linebyline, AspectMask, AnimInEl) with the same easings, durations and scroll math. */
(() => {
  'use strict';

  /* ---------- easing + tiny tween (stands in for gsap.to) ---------- */
  const E = {
    expo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),          // gsap "expo" (out)
    cubic: t => 1 - Math.pow(1 - t, 3),                             // gsap "cubic" (out)
    quadIn: t => t * t,
    linear: t => t,
  };
  const tweens = new Set();
  function tween(obj, props, { duration = 1, ease = E.cubic, delay = 0, onUpdate, onComplete } = {}) {
    for (const tw of tweens) if (tw.obj === obj && Object.keys(props).some(k => k in tw.props)) tweens.delete(tw);
    const from = {}; for (const k in props) from[k] = obj[k];
    const tw = { obj, props, from, start: performance.now() + delay * 1000, duration: duration * 1000, ease, onUpdate, onComplete };
    tweens.add(tw); return tw;
  }
  function tick(now) {
    for (const tw of tweens) {
      if (now < tw.start) continue;
      const p = Math.min(1, (now - tw.start) / tw.duration), e = tw.ease(p);
      for (const k in tw.props) tw.obj[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
      tw.onUpdate && tw.onUpdate();
      if (p === 1) { tweens.delete(tw); tw.onComplete && tw.onComplete(); }
    }
    lenis && lenis.raf(now);
    requestAnimationFrame(tick);
  }

  /* ---------- smooth scroller (ref: _smoothScroller) ---------- */
  let lenis = null;
  try { if (window.Lenis) lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true }); } catch (e) { lenis = null; }
  const scroller = {
    to(y, { time = 0.5, ease = E.cubic, lock = false } = {}) {
      if (lenis) lenis.scrollTo(y, { duration: time, easing: ease, lock, force: true });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    lock() { lenis && lenis.stop(); },
    unlock() { lenis && lenis.start(); },
  };
  requestAnimationFrame(tick);

  const vw = () => window.innerWidth, vh = () => window.innerHeight;
  const isMobile = () => vw() <= 900;
  const offsetY = el => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };

  /* ---------- intro gate: page motion waits for the loading intro ---------- */
  const introGate = new Promise(res => {
    if (window.__introDone || !document.getElementById('intro')) res();
    else window.addEventListener('intro:done', res, { once: true });
  });

  /* ---------- hero title: split words into letters (kept out of the line spans' selector) ---------- */
  document.querySelectorAll('.hero .title h2 > span, .hero .title h3 > span').forEach(line => {
    const t = line.textContent; line.textContent = ''; line.parentNode.setAttribute('aria-hidden', 'true');
    [...t].forEach((c, i) => { const ch = document.createElement('i'); ch.className = 'ch'; ch.textContent = c; ch.style.setProperty('--i', i); line.appendChild(ch); });
  });

  /* ---------- Linebyline (ref: y 90% → 0, 1.2s expo; opacity .4s cubic; stagger .1) ---------- */
  function lineByLine(root) {
    const spans = [...root.querySelectorAll(':scope h2 > span, :scope h3 > span')];
    const d = parseFloat(root.dataset.delay || '0');
    const st = spans.map(() => ({ y: 90, o: 0 }));
    const paint = i => { spans[i].style.transform = `translate3d(0,${st[i].y}%,0)`; spans[i].style.opacity = st[i].o; };
    spans.forEach((_, i) => paint(i));
    const go = () => spans.forEach((_, i) => {
      tween(st[i], { o: 1 }, { duration: 0.4, ease: E.cubic, delay: d + 0.1 * i, onUpdate: () => paint(i) });
      tween(st[i], { y: 0 }, { duration: 1.2, ease: E.expo, delay: d + 0.1 * i, onUpdate: () => paint(i) });
    });
    Promise.all([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), introGate]).then(go);
  }
  document.querySelectorAll('.line-by-line').forEach(lineByLine);
  introGate.then(() => document.querySelectorAll('.hero .fade').forEach(el => requestAnimationFrame(() => el.classList.add('in'))));

  /* ---------- ProcessBook ---------- */
  const book = document.querySelector('.book');
  const cover = book.querySelector('.p.left');
  const chapters = document.querySelector('.chapters');
  const bs = { introY: vh() / 2, hover: 0 };
  let R, G, S, I, H, K, N = 0, turned = false, armed = true, lockT;

  function bookMeasure() {
    R = 2 * book.offsetWidth;
    G = cover.offsetHeight;
    S = -book.offsetTop - 18;
    I = 0.5 * vw() - R / 4;
    H = 0.5 * vw() - I;
    K = vw() / R;
    const m = isMobile() ? 6 : 24;
    if (K * (G - m) < vh()) K = vh() / (G - m);
    K += 0.005; if (isMobile()) K += 0.05;
    bookUpdate();
  }
  function bookUpdate() {
    N = Math.min(1, window.scrollY / (vh() / 2));
    const O = N * N;
    let B = Math.min(180, 180 * O + bs.hover);
    if (B > 90) { if (!turned) { turned = true; cover.classList.add('turned'); } }
    else if (turned) { turned = false; cover.classList.remove('turned'); }
    const sc = Math.min(K, 1 + (K - 1) * N);
    const k = isMobile() ? 1 : 1.5;
    const x = I + H * Math.min(1, 1.5 * O);
    const y = S * Math.min(1, O * k) + bs.introY;
    book.style.transformOrigin = '0 0';
    book.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
    cover.style.transformOrigin = '0% 50%';
    cover.style.transform = `perspective(${vw()}px) rotateY(${-B}deg)`;

    if (N >= 0.95) {
      if (armed) {
        armed = false;
        chapters.classList.add('inview');
        scroller.to(0.5 * vh(), { time: 0.5, ease: E.cubic, lock: true });
        clearTimeout(lockT); lockT = setTimeout(scroller.unlock, 1000);
      }
    } else if (!armed) {
      armed = true;
      chapters.classList.remove('inview');
      scroller.unlock(); clearTimeout(lockT);
    }
  }
  book.addEventListener('mouseenter', () => { if (N <= 0.3) tween(bs, { hover: 6 }, { duration: 0.4, ease: E.cubic, onUpdate: bookUpdate }); });
  book.addEventListener('mouseleave', () => { if (N <= 0.3) tween(bs, { hover: 0 }, { duration: 0.8, ease: E.cubic, onUpdate: bookUpdate }); });
  book.addEventListener('click', () => { if (!turned) scroller.to(0.5 * vh(), { time: 0.5, ease: E.cubic }); });
  book.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); book.click(); } });

  /* ---------- ProcessChapters ---------- */
  const lSecs = [...chapters.querySelectorAll('.l .section')];
  const rSecs = [...chapters.querySelectorAll('.r .rsec')];
  const count = Math.min(lSecs.length, rSecs.length);
  let D = [], F = 0, half = 0, follow = true, followT;
  function chMeasure() { D = rSecs.map(offsetY); half = vh() / 2; }
  function chSet(b) {
    lSecs[F].classList.remove('open'); F = b; lSecs[F].classList.add('open');
    lSecs.forEach((s, i) => s.classList.toggle('moveup', i <= F));
  }
  function chScroll() {
    if (isMobile() || !follow) return;
    let best = 0, min = 1e4;
    for (let i = 0; i < count; i++) {
      const d = D[i] - (window.scrollY + half);
      if (d < 0 && Math.abs(d) < min) { min = Math.abs(d); best = i; }
    }
    if (best !== F) chSet(best);
  }
  lSecs.forEach((s, i) => s.querySelector('.section-btn').addEventListener('click', () => {
    if (i === F) return;
    chSet(i); follow = false; clearTimeout(followT); followT = setTimeout(() => (follow = true), 1000);
    const max = document.documentElement.scrollHeight - vh();
    scroller.to(Math.min(max, Math.max(0, D[i] - 100)), { time: 0.5, ease: E.quadIn });
  }));

  /* ---------- AspectMask: skewed clip-path with rounded corners ---------- */
  const masks = [...document.querySelectorAll('.mask')].map(el => ({ el, off: (el.dataset.offy || '0,0,0,0').split(',').map(parseFloat) }));
  function roundedPoly(pts, r) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const ra = Math.min(r, da / 2), rb = Math.min(r, db / 2);
      const p1 = [p[0] + (a[0] - p[0]) * ra / da, p[1] + (a[1] - p[1]) * ra / da];
      const p2 = [p[0] + (b[0] - p[0]) * rb / db, p[1] + (b[1] - p[1]) * rb / db];
      for (let s = 0; s <= 6; s++) {
        const t = s / 6, u = 1 - t;
        out.push([u * u * p1[0] + 2 * u * t * p[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * p[1] + t * t * p2[1]]);
      }
    }
    return 'polygon(' + out.map(q => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(',') + ')';
  }
  function maskMeasure() {
    const base = isMobile() ? 375 : 1600, f = vw() / base;
    masks.forEach(({ el, off }) => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const [a, b, c, d] = off.map(v => Math.round(v * f));
      // ref: polygon(0 a, 100% b, 100% 100%+c, 0 100%+d) — offsets clamped inside the box
      const pts = [[0, Math.max(0, a)], [w, Math.max(0, b)], [w, h + Math.min(0, c)], [0, h + Math.min(0, d)]];
      el.style.clipPath = roundedPoly(pts, 9);
      el.style.borderRadius = '0';
    });
  }

  /* ---------- Header: collapse to eyes + light/dark by section ---------- */
  const body = document.body;
  const colorEls = [...document.querySelectorAll('[data-color]')];
  function headerUpdate() {
    body.classList.toggle('scrolled', window.scrollY > 40);
    let mode = 'light-menu';
    colorEls.forEach(el => { const r = el.getBoundingClientRect(); if (r.top <= 48 && r.bottom > 48) mode = el.dataset.color; });
    if (!body.classList.contains(mode)) { body.classList.remove('light-menu', 'dark-menu'); body.classList.add(mode); }
  }
  const pupils = [...document.querySelectorAll('.site-header .eye span')];
  window.addEventListener('mousemove', e => {
    pupils.forEach(p => {
      const r = p.parentNode.getBoundingClientRect();
      const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      p.style.transform = `translate(${Math.cos(ang) * 4}px, ${Math.sin(ang) * 4}px)`;
    });
  }, { passive: true });

  /* ---------- Videos (from youtube.com/@doracura_en) ---------- */
  const VIDEOS = [
    ['w5CN1ecv0WY', '1:46', 'Baby Vampire Turned Into a Gummy Bear!'],
    ['UHA5ao26WAs', '1:49', 'The Swing Is Mine! Playground Song'],
    ['-p_QGq7UPEE', '1:43', 'Hungry Baby Vampire Is Crying! Bottle Feeding Song'],
    ['Oy4dSBV-X4U', '10:49', "Baby Vampire, Don't Eat the Rainbow Slime!"],
    ['GCHg_g5zT8g', '1:45', "Mom and Dad Only Love the Baby! I'm So Jealous"],
    ['da11TpTMjlA', '1:57', 'My Head is Stuck! Safety Song'],
  ];
  const grid = document.querySelector('.vid-grid');
  grid.innerHTML = VIDEOS.map(([id, dur, t]) =>
    `<a class="vid-card" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">
       <div class="th"><img loading="lazy" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt=""><span class="dur">${dur}</span></div>
       <p>${t}</p></a>`).join('');
  const feat = document.querySelector('.vid-feature');
  feat.addEventListener('click', () => {
    if (feat.querySelector('iframe')) return;
    feat.insertAdjacentHTML('beforeend', `<iframe src="https://www.youtube-nocookie.com/embed/${feat.dataset.id}?autoplay=1&rel=0" title="DoraCura video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`);
  });

  /* ---------- Footer in-view (ref: AnimInEl) ---------- */
  const footer = document.querySelector('.site-footer');
  new IntersectionObserver(es => es.forEach(e => footer.classList.toggle('in', e.isIntersecting)), { threshold: 0.25 }).observe(footer);
  new IntersectionObserver(es => es.forEach(e => body.classList.toggle('footer-in', e.isIntersecting)), { rootMargin: '0px 0px -92% 0px' }).observe(footer);

  /* ---------- Chapter 1: pose swapper (PDF pose sheets) ---------- */
  document.querySelectorAll('.poser').forEach(p => {
    const imgs = [...p.children];
    let i = 0, timer;
    const iv = +p.dataset.interval || 2300;
    const next = () => {
      const cur = imgs[i];
      cur.classList.remove('on'); cur.classList.add('out');
      setTimeout(() => cur.classList.remove('out'), 420);
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on');
    };
    const start = () => { clearInterval(timer); timer = setInterval(next, iv); };
    setTimeout(start, +p.dataset.offset || 0);
    p.closest('.panel').addEventListener('click', () => { next(); start(); });
  });

  /* ---------- Footer: banner-style string lights, bats, hopping cast ---------- */
  const lights = document.querySelector('.lights');
  const BULBS = ['#FF7BAC', '#FFE066', '#8CF08C', '#7FC4FF', '#FFFFFF', '#FFB36B'];
  function drawLights() {
    const W = lights.getBoundingClientRect().width || vw(), seg = W / 3;
    lights.setAttribute('viewBox', `0 0 ${W} 70`);
    lights.removeAttribute('preserveAspectRatio');
    let svg = '', n = 0;
    for (let s = 0; s < 3; s++) {
      const x0 = s * seg, x1 = x0 + seg, sag = 26;
      svg += `<path d="M${x0} 6 Q${x0 + seg / 2} ${6 + sag * 2} ${x1} 6" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>`;
      const count = Math.max(6, Math.round(seg / 42));
      for (let k = 1; k < count; k++) {
        const t = k / count, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * (x0 + seg / 2) + t * t * x1;
        const y = u * u * 6 + 2 * u * t * (6 + sag * 2) + t * t * 6;
        const c = BULBS[n % BULBS.length];
        svg += `<circle class="bulb" cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="5" fill="${c}" style="animation-delay:${(-(n * 0.37) % 1.6).toFixed(2)}s;filter:drop-shadow(0 0 6px ${c})"/>`;
        n++;
      }
    }
    lights.innerHTML = svg;
  }
  const batSky = document.querySelector('.bat-sky');
  const BAT = '<svg viewBox="0 0 64 32"><path d="M32 30c-2-4-5-6-9-5 1-4-1-7-5-8 0 3-2 5-5 5-3-3-7-4-12-2 6-5 9-12 9-18 3 5 8 7 13 6 3 4 7 6 9 6l1-4 1 4c2 0 6-2 9-6 5 1 10-1 13-6 0 6 3 13 9 18-5-2-9-1-12 2-3 0-5-2-5-5-4 1-6 4-5 8-4-1-7 1-9 5z"/></svg>';
  [[14, 30, 8], [30, 52, 10], [72, 26, 9], [86, 48, 11], [44, 70, 12], [60, 40, 7.5]].forEach(([x, y, t], k) => {
    batSky.insertAdjacentHTML('beforeend', BAT);
    const b = batSky.lastElementChild;
    b.style.cssText = `left:${x}%;top:${y}%;--t:${t}s;--dl:${-k * 1.3}s;width:${30 + (k % 3) * 12}px`;
  });
  document.querySelectorAll('.cast img:not(.family-big), .f-fly, .hanger img').forEach(img => {
    const hop = () => { img.classList.remove('hop'); void img.offsetWidth; img.classList.add('hop'); };
    img.addEventListener('mouseenter', hop);
    img.addEventListener('click', hop);
    img.addEventListener('animationend', e => { if (e.animationName === 'hop') img.classList.remove('hop'); });
  });

  /* ---------- Cursor buddies: 2D Dora & Cura faces follow the mouse ---------- */
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const still = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (fine && !still) {
    // flat, minimal 2D faces: solid black pupils only
    const eye = cx => `<g class="lid"><ellipse class="pupil" cx="${cx}" cy="66" rx="5.6" ry="7" fill="#1E1A24"/></g>`;
    const face = (hair, back = '') => `<svg viewBox="0 0 100 100" aria-hidden="true">
      ${back}
      <path d="M17 60 L4 50 Q8 66 19 70Z" fill="#AAB8EF"/><path d="M83 60 L96 50 Q92 66 81 70Z" fill="#AAB8EF"/>
      <circle cx="50" cy="62" r="34" fill="#C2CDF8"/>
      ${hair}
      ${eye(38)}${eye(62)}
      <ellipse cx="27" cy="77" rx="5" ry="3" fill="#FF9DBB" opacity=".7"/><ellipse cx="73" cy="77" rx="5" ry="3" fill="#FF9DBB" opacity=".7"/>
      <g class="mouth-smile"><path d="M43 79 Q50 85 57 79" stroke="#1E1A24" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M45.2 80.6 l1.4 3.2 l1.4-2.6Z M54.8 80.6 l-1.4 3.2 l-1.4-2.6Z" fill="#fff"/></g>
      <g class="mouth-open"><path d="M42 78 Q50 92 58 78Z" fill="#1E1A24"/><path d="M45 78.6 l1.6 3.4 l1.6-3.1Z M55 78.6 l-1.6 3.4 l-1.6-3.1Z" fill="#fff"/></g>
    </svg>`;
    const DORA = face(
      '<path d="M16 58 C14 34 30 26 50 26 C70 26 86 34 84 58 C76 48 64 44 56 46 L50 54 L44 46 C36 44 24 48 16 58Z" fill="#E3262F"/>',
      '<circle cx="21" cy="30" r="13" fill="#E3262F"/><circle cx="79" cy="30" r="13" fill="#E3262F"/>');
    const CURA = face(
      '<path d="M15 60 C11 36 26 24 40 24 L44 16 L50 24 L56 16 L60 24 C74 24 89 36 85 60 C78 50 66 45 58 46 L50 56 L42 46 C34 45 22 50 15 60Z" fill="#1E1A24"/>');

    const wrap = document.createElement('div');
    wrap.className = 'buddies';
    wrap.innerHTML = `<div class="buddy dora">${DORA}</div><div class="buddy cura">${CURA}</div>`;
    document.body.appendChild(wrap);
    const mk = (el, k, d, ox, oy) => ({ el, k, d, ox, oy, x: -200, y: -200, vx: 0, vy: 0, hop: 0, pupils: [...el.querySelectorAll('.pupil')] });
    const B = [mk(wrap.children[0], 0.14, 0.7, 30, 30), mk(wrap.children[1], 0.075, 0.74, 74, 40)];
    const m = { x: -200, y: -200, seen: false };
    window.addEventListener('mousemove', e => {
      m.x = e.clientX; m.y = e.clientY;
      if (!m.seen) { m.seen = true; B.forEach(b => { b.x = m.x + b.ox; b.y = m.y + b.oy; }); }
      wrap.classList.add('show');
    }, { passive: true });
    document.addEventListener('mouseleave', () => wrap.classList.remove('show'));
    const EXCITE = 'a, button, .book, .playful, .cast img, .f-fly, .vid-feature, .langs img, .hanger img';
    document.addEventListener('mouseover', e => wrap.classList.toggle('excited', !!(e.target.closest && e.target.closest(EXCITE))));
    const HEART = '<svg viewBox="0 0 24 24"><path fill="#FF4D6D" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.3 4.4 2.6.8-1.3 2.2-2.6 4.4-2.6 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
    const MINIBAT = '<svg viewBox="0 0 64 32"><path fill="#2B1B33" d="M32 30c-2-4-5-6-9-5 1-4-1-7-5-8 0 3-2 5-5 5-3-3-7-4-12-2 6-5 9-12 9-18 3 5 8 7 13 6 3 4 7 6 9 6l1-4 1 4c2 0 6-2 9-6 5 1 10-1 13-6 0 6 3 13 9 18-5-2-9-1-12 2-3 0-5-2-5-5-4 1-6 4-5 8-4-1-7 1-9 5z"/></svg>';
    window.addEventListener('mousedown', () => {
      B.forEach((b, bi) => {
        b.hop = 1;
        for (let k = 0; k < 3; k++) {
          const s = document.createElement('span');
          s.className = 'pop'; s.innerHTML = bi ? MINIBAT : HEART;
          s.style.left = b.x + 'px'; s.style.top = (b.y - 20) + 'px';
          s.style.setProperty('--dx', `${(k - 1) * 26 + (Math.random() * 10 - 5)}px`);
          s.style.setProperty('--rot', `${(k - 1) * 25}deg`);
          s.style.animationDelay = `${k * 0.05}s`;
          document.body.appendChild(s);
          setTimeout(() => s.remove(), 1200);
        }
      });
    });
    const blink = () => {
      B.forEach((b, i) => setTimeout(() => { b.el.classList.add('blink'); setTimeout(() => b.el.classList.remove('blink'), 140); }, i * 120));
      setTimeout(blink, 2200 + Math.random() * 3000);
    };
    setTimeout(blink, 1800);
    const loop = () => {
      B.forEach(b => {
        b.vx = (b.vx + (m.x + b.ox - b.x) * b.k) * b.d;
        b.vy = (b.vy + (m.y + b.oy - b.y) * b.k) * b.d;
        b.x += b.vx; b.y += b.vy;
        b.hop = Math.max(0, b.hop - 0.06);
        const hopY = -Math.sin(b.hop * Math.PI) * 18;
        const rot = Math.max(-24, Math.min(24, b.vx * 1.4));
        const sp = Math.min(1, Math.hypot(b.vx, b.vy) / 30);
        b.el.style.transform = `translate3d(${b.x}px, ${b.y + hopY}px, 0) rotate(${rot}deg) scale(${1 + sp * 0.08}, ${1 - sp * 0.08})`;
        const a = Math.atan2(m.y - b.y, m.x - b.x), r = Math.min(3.2, Math.hypot(m.x - b.x, m.y - b.y) / 12);
        b.pupils.forEach(p => p.setAttribute('transform', `translate(${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)})`));
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Preview notes ---------- */
  const nt = document.querySelector('.notes-toggle'), notes = document.querySelector('.notes');
  nt.addEventListener('click', () => { notes.hidden = !notes.hidden; nt.setAttribute('aria-expanded', String(!notes.hidden)); });
  const aiBox = document.querySelector('.ai-toggle input');
  const syncAI = () => body.classList.toggle('show-ai', aiBox.checked);
  aiBox.addEventListener('change', syncAI); syncAI();

  /* ---------- wiring ---------- */
  function onScroll() { bookUpdate(); chScroll(); headerUpdate(); }
  function onResize() { bookMeasure(); chMeasure(); maskMeasure(); drawLights(); onScroll(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(() => { chMeasure(); maskMeasure(); }).observe(chapters);

  onResize();
  // intro: book rises from vh/2 below (1.5s expo, .2s delay) and fades in (ref --delay:.1s)
  if (!window.__introDone && document.getElementById('intro')) { scroller.lock(); window.scrollTo(0, 0); }
  introGate.then(() => {
    scroller.unlock();
    book.style.setProperty('--delay', '.1s');
    requestAnimationFrame(() => book.classList.add('in'));
    tween(bs, { introY: 0 }, { duration: 1.5, ease: E.expo, delay: 0.2, onUpdate: bookUpdate });
    setTimeout(titleAlive, 1500);
  });

  /* ---------- hero title letters: idle bob, jelly on hover, sparkles on click ---------- */
  function titleAlive() {
    const hero = document.querySelector('.hero');
    hero.classList.add('alive');
    const jelly = ch => { ch.classList.remove('jelly'); void ch.offsetWidth; ch.classList.add('jelly'); };
    hero.querySelectorAll('.title .ch').forEach(ch => {
      ch.addEventListener('mouseenter', () => jelly(ch));
      ch.addEventListener('animationend', e => { if (e.animationName === 'jelly') ch.classList.remove('jelly'); });
      ch.addEventListener('click', e => {
        jelly(ch);
        for (let k = 0; k < 5; k++) {
          const s = document.createElement('span'); s.className = 'title-spark';
          s.style.left = (e.pageX + (Math.random() - 0.5) * 70) + 'px';
          s.style.top = (e.pageY + (Math.random() - 0.5) * 50) + 'px';
          s.style.animationDelay = (k * 0.05) + 's';
          document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
        }
      });
    });
    // every few seconds a "Mexican wave" of jelly runs through each name
    const words = [...hero.querySelectorAll('.title h2 > span')];
    let w = 0;
    setInterval(() => {
      if (window.scrollY > vh() * 0.4) return;
      [...words[w % words.length].querySelectorAll('.ch')].forEach((ch, i) => setTimeout(() => jelly(ch), i * 90));
      w++;
    }, 3800);
  }
})();
