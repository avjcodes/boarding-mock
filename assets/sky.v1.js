(() => {
  'use strict';
  const canvas = document.querySelector('canvas.sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const html = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOn = () => !html.classList.contains('motion-off') && !calm.matches;
  const covered = document.body.classList.contains('page-home');
  const SEED = 20150521;
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const phone = !fine.matches || innerWidth < 700;
  const LAYERS = phone ? [[110, 0.7, 1.0, 0.4, 0.65, 0.25], [48, 1.1, 1.5, 0.55, 0.85, 0.55], [14, 1.7, 2.3, 0.75, 1.0, 1.0]]
    : [[220, 0.7, 1.0, 0.4, 0.65, 0.25], [90, 1.1, 1.5, 0.55, 0.85, 0.55], [26, 1.7, 2.3, 0.75, 1.0, 1.0]];
  const COLOURS = ['236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '155,220,247', '155,220,247', '255,233,196'];
  const stars = [];
  const rnd = mulberry(SEED);
  LAYERS.forEach(([n, s0, s1, a0, a1, depth], li) => {
    for (let i = 0; i < n; i++) {
      stars.push({ x: rnd(), y: rnd(), r: s0 + rnd() * (s1 - s0), a: a0 + rnd() * (a1 - a0), d: depth, c: COLOURS[Math.floor(rnd() * COLOURS.length)], ph: rnd() * 6.283, tw: rnd() < 0.34, li });
    }
  });
  let W = 0, H = 0, dpr = 1, glow = null;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glow = document.createElement('canvas'); glow.width = glow.height = 32;
    const g = glow.getContext('2d'); const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(236,241,246,1)'); grad.addColorStop(0.35, 'rgba(236,241,246,0.55)'); grad.addColorStop(1, 'rgba(236,241,246,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    dirty = true;
  };
  let lastW = 0;
  const onResize = () => { if (innerWidth !== lastW) { lastW = innerWidth; size(); } };
  let dirty = true, running = false, raf = 0;
  let px = 0, py = 0, tx = 0, ty = 0;          // pointer parallax, current and target (-1..1)
  let scroll = 0, lastScroll = 0, vel = 0;
  let warp = 0, warpStart = 0;                   // 1 -> 0 over 1400 ms
  let vanish = [0.72, 0.5];
  let density = 1, frozen = false, ema = 16, slowFor = 0, lastT = 0;
  let shoot = null, nextShoot = 0;
  let twTick = 0, now = 0;
  const draw = () => {
    if (!glow) return;   // nothing to draw with until the first fit has made the sprite
    ctx.clearRect(0, 0, W, H);
    const sx = px * 18, sy = py * 12;
    const streak = covered || phone ? 0 : Math.min(Math.abs(vel), 60) / 60;
    const sc = covered ? 0 : scroll;
    for (const s of stars) {
      if (density < 1 && s.li === 0 && s.ph > 3.1) continue;
      const depth = s.d;
      let x = (s.x * 1.2 - 0.1) * W + sx * depth;
      let y = ((s.y * 1.3 - 0.15) * H - (sc * 0.2 * depth) % (H * 1.3)) ;
      if (y < -20) y += H * 1.3; else if (y > H + 20) y -= H * 1.3;
      let a = s.a;
      if (s.tw) a *= 0.78 + 0.22 * Math.sin(s.ph + now / 900);
      if (warp > 0) {
        const vx = vanish[0] * W, vy = vanish[1] * H;
        const dx = x - vx, dy = y - vy, len = warp * warp * 0.18 * depth;
        ctx.strokeStyle = `rgba(${s.c},${(a * (1 - warp * 0.4)).toFixed(3)})`;
        ctx.lineWidth = s.r;
        ctx.beginPath(); ctx.moveTo(x - dx * len, y - dy * len); ctx.lineTo(x, y); ctx.stroke();
        continue;
      }
      if (streak > 0.1 && depth > 0.3) {
        ctx.strokeStyle = `rgba(${s.c},${(a * 0.8).toFixed(3)})`;
        ctx.lineWidth = s.r;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - Math.max(-200, Math.min(200, vel)) * 0.55 * depth); ctx.stroke();
        continue;
      }
      if (s.r >= 1.5) {
        ctx.globalAlpha = a;
        const d = s.r * 5;
        ctx.drawImage(glow, x - d / 2, y - d / 2, d, d);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
        ctx.fillRect(Math.round(x), Math.round(y), s.r, s.r);
      }
    }
    if (shoot) {
      const t = (now - shoot.t0) / 700;
      if (t >= 1) shoot = null;
      else {
        const e = 1 - Math.pow(1 - t, 3);
        const x = shoot.x + shoot.dx * e, y = shoot.y + shoot.dy * e;
        const grad = ctx.createLinearGradient(x - shoot.dx * 0.12, y - shoot.dy * 0.12, x, y);
        grad.addColorStop(0, 'rgba(236,241,246,0)'); grad.addColorStop(1, `rgba(236,241,246,${(0.9 * (1 - t)).toFixed(3)})`);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - shoot.dx * 0.12, y - shoot.dy * 0.12); ctx.lineTo(x, y); ctx.stroke();
      }
    }
  };
  const frame = (t) => {
    raf = 0;
    now = t;
    const dt = lastT ? t - lastT : 16; lastT = t;
    if (!running) return;
    ema = ema * 0.9 + dt * 0.1;
    if (!covered && ema > 20) { slowFor += dt; if (slowFor > 1000) { if (density === 1) { density = 0.5; slowFor = 0; } else if (ema > 24) { frozen = true; draw(); return; } } } else slowFor = 0;
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    if (!covered && (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002)) dirty = true;
    if (warp > 0) { const w = 1 - Math.min(1, (t - warpStart) / 1400); warp = w * w * w; dirty = true; if (warp < 0.02) warp = 0; }
    vel *= 0.82; if (Math.abs(vel) > 0.5) dirty = true; else vel = 0;
    if (t - twTick > (covered ? 250 : 50)) { twTick = t; dirty = true; }
    if (!shoot && t > nextShoot && !phone) { const r = Math.random; shoot = { t0: t, x: W * (0.1 + r() * 0.5), y: H * (0.05 + r() * 0.4), dx: W * (0.18 + r() * 0.12), dy: H * (0.08 + r() * 0.1) }; nextShoot = t + 20000 + r() * 20000; }
    if (shoot) dirty = true;
    if (dirty) { draw(); dirty = false; }
    if (!phone || t - twTick < 34) raf = requestAnimationFrame(frame); else setTimeout(() => { raf = requestAnimationFrame(frame); }, 18);
  };
  const start = () => { if (running || frozen) return; running = true; lastT = 0; if (!raf) raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  const still = () => { stop(); warp = 0; vel = 0; px = py = 0; draw(); };
  const sync = () => { if (motionOn() && !document.hidden) start(); else still(); };
  onResize();
  addEventListener('resize', onResize, { passive: true });
  if (fine.matches) addEventListener('pointermove', (e) => { tx = (e.clientX / W - 0.5) * 2; ty = (e.clientY / H - 0.5) * 2; }, { passive: true });
  if (!covered) addEventListener('scroll', () => { const y = scrollY; vel = vel * 0.5 + (y - lastScroll) * 0.5; lastScroll = y; scroll = y; dirty = true; }, { passive: true });
  document.addEventListener('visibilitychange', sync);
  calm.addEventListener('change', sync);
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
  window.sky = {
    warp(fromX, fromY) { if (!motionOn()) return; if (fromX != null) vanish = [fromX, fromY]; warp = 1; warpStart = performance.now(); start(); },
    pause: stop, resume: sync, still,
  };
  scroll = scrollY; lastScroll = scroll;
  sync();
})();
