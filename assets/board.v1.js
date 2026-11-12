/* The boarding gate, the boarding move, and the main room (doors, the swipe strip on phones).
   No libraries. Only transform and opacity animate, and nothing moves under reduced motion. */
(() => {
  'use strict';
  const html = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const strip = matchMedia('(max-width: 999px), (max-aspect-ratio: 6/5)');
  const moving = () => !calm.matches && !html.classList.contains('motion-off');
  document.addEventListener('touchstart', () => {}, { passive: true });   // lets iOS show :active on a tap
  const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };

  /* ---------- the 21+ chip asks the question again ---------- */
  document.querySelectorAll('[data-again]').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.removeItem('sw-age-ok'); } catch (e) { /* storage off */ }
    try { sessionStorage.removeItem('sw-age-ok'); } catch (e) { /* storage off */ }
    location.reload();
  }));

  /* ---------- the gate ---------- */
  const gate = document.getElementById('gate');
  const roomImg = document.querySelector('.room__img, .cl__bg img');
  if (!gate) html.classList.remove('gate-pending');
  else if (html.classList.contains('gate-pending')) openGate();

  /* ---------- the scene: stars, the odd comet, the floating astronaut ---------- */
  const space = gate && gate.querySelector('.space');
  if (space) setupSpace(space);

  /* a repeatable random sequence, so the sky is the same on every visit */
  function seeded(seed) {
    let s = seed;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function setupSpace(sp) {
    const astro = sp.querySelector('.space__astro');
    const panel = gate.querySelector('.gate__panel');
    const ask = gate.querySelector('.gate__ask');
    const act = gate.querySelector('.gate__act');
    const upright = matchMedia('(max-aspect-ratio: 1/1)');

    /* he shows as a still first (13 KB, the loop's first frame) and starts floating once the loop (1.8 MB) is in;
       under reduced motion or the site's motion switch he stays still, and when the gate is not showing (back in the
       room from an inner page) the loop is not fetched at all */
    const loop = sp.querySelector('.space__loop');
    if (loop && loop.dataset.loop && moving() && html.classList.contains('gate-pending')) {
      const pre = new Image();
      if ('fetchPriority' in pre) pre.fetchPriority = 'high';
      pre.src = loop.dataset.loop;
      const swap = () => { if (moving()) loop.src = pre.src; };
      if (pre.decode) pre.decode().then(swap, () => {}); else pre.addEventListener('load', swap, { once: true });
    }

    /* stars: drawn once for the window's size, crisp at any pixel density, the same sky every time (seeded) */
    const canvas = sp.querySelector('.space__stars');
    const draw = () => {
      const w = sp.clientWidth;
      const h = sp.clientHeight;
      if (!w || !h || !canvas.getContext) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const rnd = seeded(1337);
      const count = Math.round((w * h) / 3600);
      for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const m = rnd();
        const r = m < 0.86 ? 0.35 + rnd() * 0.45 : m < 0.98 ? 0.8 + rnd() * 0.5 : 1.3 + rnd() * 0.5;
        const a = m < 0.86 ? 0.22 + rnd() * 0.35 : 0.55 + rnd() * 0.4;
        const tint = rnd();
        const c = tint < 0.12 ? '205,222,255' : tint < 0.2 ? '255,236,214' : '240,244,250';
        ctx.fillStyle = `rgba(${c},${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    /* the open sky: away from the words and from him (comets and the breathing stars stay in it) */
    const clear = (x, y, pad) => {
      const boxes = [astro.getBoundingClientRect()];
      if (upright.matches) boxes.push(ask.getBoundingClientRect(), act.getBoundingClientRect());
      else boxes.push(panel.getBoundingClientRect());
      return !boxes.some((r) => r.width && x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad);
    };

    /* a few brighter stars breathe slowly (a CSS animation, off under reduced motion and the motion switch) */
    const tw = sp.querySelector('.space__twinkles');
    const placeTwinkles = () => {
      if (!tw) return;
      tw.textContent = '';
      const w = sp.clientWidth;
      const h = sp.clientHeight;
      if (!w || !h) return;
      const rnd = seeded(4242);
      const want = Math.round(Math.min(18, Math.max(8, (w * h) / 70000)));
      for (let placed = 0, tries = 0; placed < want && tries < 300; tries++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const size = 1.6 + rnd() * 1.6;
        const dur = 2.6 + rnd() * 3.4;
        const lag = -rnd() * 6;
        if (!clear(x, y, 28)) continue;
        const s = document.createElement('i');
        s.className = 'twinkle';
        s.style.setProperty('--x', `${(x / w * 100).toFixed(2)}%`);
        s.style.setProperty('--y', `${(y / h * 100).toFixed(2)}%`);
        s.style.setProperty('--s', `${size.toFixed(1)}px`);
        s.style.setProperty('--d', `${dur.toFixed(2)}s`);
        s.style.setProperty('--dl', `${lag.toFixed(2)}s`);
        tw.appendChild(s);
        placed++;
      }
    };

    /* the arrival: the far point the ship drops out of the jump at (up and to the right, behind it), star streaks
       fanning out from that point, the flare and the light trail, the rings that climb the beam and the sparks at the
       hatch. All of it is positioned here and moved by board.v1.css once boarding starts. */
    const ship = sp.querySelector('.space__ship');
    const fx = document.createElement('div');
    fx.className = 'space__fx';
    const mk = (cls, parent) => { const el = document.createElement('i'); el.className = cls; (parent || fx).appendChild(el); return el; };
    const placeArrival = () => {
      if (!ship) return;
      fx.textContent = '';
      const w = sp.clientWidth;
      const h = sp.clientHeight;
      if (!w || !h) return;
      const tall = upright.matches;
      const vx = w * (tall ? 0.84 : 0.88);
      const vy = h * (tall ? 0.07 : 0.1);
      const cx = ship.offsetLeft + ship.offsetWidth / 2;
      const cy = ship.offsetTop + ship.offsetHeight / 2;
      sp.style.setProperty('--vx', `${vx.toFixed(1)}px`);
      sp.style.setProperty('--vy', `${vy.toFixed(1)}px`);
      sp.style.setProperty('--dx', `${(vx - cx).toFixed(1)}px`);
      sp.style.setProperty('--dy', `${(vy - cy).toFixed(1)}px`);
      sp.style.setProperty('--tl', `${Math.hypot(cx - vx, cy - vy).toFixed(1)}px`);
      sp.style.setProperty('--ta', `${(Math.atan2(cy - vy, cx - vx) * 180 / Math.PI).toFixed(2)}deg`);
      const rnd = seeded(9001);
      const reach = Math.hypot(w, h);
      const lines = tall ? 46 : 72;
      for (let i = 0; i < lines; i++) {
        const l = mk('warp');
        l.style.setProperty('--a', `${(rnd() * 360).toFixed(1)}deg`);
        l.style.setProperty('--r', `${(reach * (0.04 + rnd() * 0.3)).toFixed(0)}px`);
        l.style.setProperty('--len', `${(reach * (0.05 + rnd() * 0.16)).toFixed(0)}px`);
        l.style.setProperty('--th', `${(0.8 + rnd() * 1.4).toFixed(1)}px`);
        l.style.setProperty('--dl', `${(rnd() * 190).toFixed(0)}ms`);
      }
      mk('space__trail');
      mk('space__pop');
      for (let i = 0; i < 4; i++) mk('ring').style.setProperty('--dl', `${1620 + i * 130}ms`);
      const unit = Math.min(w, h);
      for (let i = 0; i < 14; i++) {
        const s = mk('spark');
        s.style.setProperty('--a', `${(i * (360 / 14) + rnd() * 16).toFixed(1)}deg`);
        s.style.setProperty('--r', `${(unit * (0.07 + rnd() * 0.09)).toFixed(0)}px`);
        s.style.setProperty('--len', `${(unit * (0.03 + rnd() * 0.04)).toFixed(0)}px`);
      }
    };
    if (ship) sp.insertBefore(fx, ship);

    let rz = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { draw(); placeTwinkles(); placeArrival(); }); });
    draw();
    placeTwinkles();
    placeArrival();

    /* comets: one every 6 to 10 s, far behind him, in open sky only. Wide screens: right of the words and above his
       helmet, falling right to left. Upright screens: across the band between the question and his helmet. */
    const layer = sp.querySelector('.space__comets');
    let timer = 0;
    const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(spawn, ms); };
    function spawn() {
      const live = html.classList.contains('gate-pending') && !html.classList.contains('is-boarding');
      if (!live) return;
      schedule(6000 + Math.random() * 4000);
      if (document.hidden || !moving() || !layer.animate) return;
      const w = sp.clientWidth;
      const him = astro.getBoundingClientRect();
      const len = 110 + Math.random() * 110;
      let x0; let y0; let x1; let y1;
      if (upright.matches) {
        const top = ask.getBoundingClientRect().bottom + 16;
        const bottom = him.top - 16;
        if (bottom - top < 24) return;
        const fromLeft = Math.random() < 0.5;
        y0 = top + Math.random() * (bottom - top) * 0.6;
        y1 = Math.min(bottom, y0 + (bottom - top) * (0.15 + Math.random() * 0.3));
        x0 = fromLeft ? -16 : w + 16 + len;
        x1 = fromLeft ? w + 16 + len : -16;
      } else {
        const left = panel.getBoundingClientRect().right + 48;
        const bottom = him.top - 24;
        if (w - left < 200 || bottom < 120) return;
        x0 = left + (w - left) * (0.45 + Math.random() * 0.6);
        y0 = bottom * Math.random() * 0.45 - 20;
        const slope = 0.3 + Math.random() * 0.3;
        const travel = Math.max(80, Math.min(x0 - left, (bottom - y0) / slope, w * 0.4));
        x1 = x0 - travel;
        y1 = y0 + travel * slope;
      }
      /* the line's right end is its head: shift by its length so the head runs x0,y0 to x1,y1 */
      const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
      const at = (x, y) => `translate(${(x - len).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
      const c = document.createElement('i');
      c.className = 'comet';
      c.style.setProperty('--len', `${len.toFixed(0)}px`);
      layer.appendChild(c);
      const anim = c.animate([
        { transform: at(x0, y0), opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { opacity: 1, offset: 0.72 },
        { transform: at(x1, y1), opacity: 0 },
      ], { duration: 1300 + Math.random() * 900, easing: 'linear' });
      anim.onfinish = () => c.remove();
    }
    if (html.classList.contains('gate-pending')) schedule(2200);
  }

  function openGate() {
    const behind = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
    behind.forEach((el) => { el.inert = true; });
    const q = gate.querySelector('.gate__q');
    const buttons = gate.querySelector('.gate__buttons');
    const denied = gate.querySelector('.gate__denied');
    const yes = gate.querySelector('[data-gate="yes"]');
    /* keyboard and mouse visitors start on Yes; on a touch screen the gate is simply the first thing on the page,
       so no focus ring appears under a finger */
    if (matchMedia('(hover: hover)').matches) yes.focus({ preventScroll: true });
    let boarding = false;   // the first Yes is the answer; the keyboard can still reach the buttons during the move
    gate.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); });
    gate.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gate]');
      if (!b || boarding) return;
      const what = b.dataset.gate;
      if (what === 'yes') {
        boarding = true;
        const stamp = String(Date.now());
        try { sessionStorage.setItem('sw-age-ok', stamp); } catch (err) { /* asked again on the next page */ }
        board(() => {
          const r = document.querySelector('.room');
          if (r) {
            r.classList.add('rest');
            addEventListener('pointermove', () => r.classList.remove('rest'), { once: true });
          }
          behind.forEach((el) => { el.inert = false; });
          html.classList.remove('gate-pending', 'is-boarding');
          const main = document.getElementById('main');
          if (main) main.focus({ preventScroll: true });
        });
        return;
      }
      if (what === 'back') {
        denied.hidden = true; q.hidden = false; buttons.hidden = false;
        yes.focus();
        return;
      }
      q.hidden = true; buttons.hidden = true; denied.hidden = false;
      denied.querySelector('p').focus();
    });
  }

  /* Yes: the stars streak, the ship drops out of the jump and brakes over him, the beam takes him up into the hatch,
     the hatch flashes, the room fades in. About 3.8 s;
     the timing lives in board.v1.css. */
  function board(done) {
    if (!moving()) { done(); return; }
    void gate.offsetWidth;   // start the transitions from the resting frame
    html.classList.add('is-boarding');
    let arrived = false;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); arrive(); } };
    function arrive() {
      if (arrived) return;
      arrived = true;
      gate.removeEventListener('pointerdown', arrive);
      removeEventListener('keydown', onKey, true);
      html.classList.add('is-arriving');
      setTimeout(done, 600);
      setTimeout(() => html.classList.remove('is-arriving'), 1150);
    }
    /* seen it already: a tap, a click or a key goes straight to the room (not in the first 0.6 s, so a double tap on
       Yes still shows the whole move) */
    setTimeout(() => {
      if (arrived) return;
      gate.addEventListener('pointerdown', arrive);
      addEventListener('keydown', onKey, true);
    }, 600);
    /* the room fades in once its picture is ready, never before the flash (3.25 s) and never later than 5 s */
    const ready = roomImg && roomImg.decode ? roomImg.decode().catch(() => {}) : Promise.resolve();
    const atLeast = new Promise((res) => setTimeout(res, 3250));
    const atMost = new Promise((res) => setTimeout(res, 5000));
    Promise.race([Promise.all([ready, atLeast]), atMost]).then(arrive);
  }

  /* ---------- the main room ---------- */
  const room = document.querySelector('.room');
  const view = room && room.querySelector('.room__view');
  const stage = room && room.querySelector('.room__stage');
  if (!room || !view || !stage) return;
  /* the signs carry their own panel color until the room picture is in */
  const lit = () => room.classList.add('is-lit');
  if (roomImg && roomImg.complete && roomImg.naturalWidth) lit();
  else if (roomImg) roomImg.addEventListener('load', lit, { once: true });
  const doorsNav = room.querySelector('.doors');
  const doorLinks = [...room.querySelectorAll('a.door')];
  const hint = room.querySelector('.pan-hint');

  /* each label is laid onto its lit panel's four corners (measured in the picture by tools/measure_signs.py),
     so it leans and narrows with the curved wall instead of sitting flat on it */
  const PANELS = {
    1: [[0.04106, 0.29753], [0.14862, 0.32943], [0.14862, 0.36979], [0.04215, 0.34505]],
    2: [[0.22783, 0.34961], [0.32013, 0.36263], [0.32158, 0.39648], [0.2282, 0.38411]],
    3: [[0.38881, 0.3724], [0.47311, 0.37435], [0.47384, 0.4043], [0.38917, 0.40169]],
    4: [[0.53815, 0.37435], [0.62209, 0.36979], [0.62209, 0.40104], [0.53779, 0.40495]],
    5: [[0.68714, 0.36328], [0.77798, 0.34831], [0.77725, 0.38477], [0.68714, 0.39583]],
    6: [[0.85465, 0.33073], [0.95894, 0.29818], [0.95821, 0.34635], [0.85392, 0.37109]],
  };
  const solve8 = (A, b) => {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = c + 1; r < 8; r++) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= 8; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(8).fill(0);
    for (let r = 7; r >= 0; r--) {
      let sum = M[r][8];
      for (let k = r + 1; k < 8; k++) sum -= M[r][k] * x[k];
      x[r] = sum / M[r][r];
    }
    return x;
  };
  const warpSigns = () => {
    const sw = stage.offsetWidth;
    const sh = stage.offsetHeight;
    if (!sw || !sh) return;
    room.querySelectorAll('a.door').forEach((door) => {
      const n = Number((door.className.match(/door--(\d)/) || [])[1]);
      const sign = door.querySelector('.door__sign');
      const q = PANELS[n];
      if (!sign || !q) return;
      const dst = q.map(([x, y]) => [x * sw, y * sh]);
      const len = (a, b) => Math.hypot(dst[a][0] - dst[b][0], dst[a][1] - dst[b][1]);
      const w = (len(0, 1) + len(3, 2)) / 2;
      const h = (len(0, 3) + len(1, 2)) / 2;
      const src = [[0, 0], [w, 0], [w, h], [0, h]];
      const A = [];
      const b = [];
      for (let i = 0; i < 4; i++) {
        const [x, y] = src[i];
        const [u, v] = dst[i];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
      }
      const m = solve8(A, b);
      if (!m.every(Number.isFinite)) return;
      sign.style.width = w.toFixed(2) + 'px';
      sign.style.height = h.toFixed(2) + 'px';
      sign.style.transform = `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
      sign.classList.add('is-warped');
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(warpSigns).observe(stage);
  warpSigns();

  /* in the strip the list under the headline carries the doors for screen readers and the keyboard */
  const syncDoors = () => {
    const s = strip.matches;
    if (s) doorsNav.setAttribute('aria-hidden', 'true'); else doorsNav.removeAttribute('aria-hidden');
    doorLinks.forEach((a) => { if (s) a.tabIndex = -1; else a.removeAttribute('tabindex'); });
  };

  /* the strip starts on the console and the bud */
  let touched = false;
  let startLeft = 0;
  const centre = () => {
    if (!strip.matches || touched) return;
    startLeft = Math.max(0, Math.min(view.scrollWidth - view.clientWidth, view.scrollWidth * 0.215));   // just left of the Products sign
    view.scrollLeft = startLeft;
  };
  const mark = () => { touched = true; };
  view.addEventListener('pointerdown', mark, { passive: true });
  view.addEventListener('touchstart', mark, { passive: true });
  view.addEventListener('wheel', mark, { passive: true });
  view.addEventListener('keydown', mark);
  view.addEventListener('scroll', () => {
    if (hint && touched && Math.abs(view.scrollLeft - startLeft) > 24) hint.classList.add('is-off');
  }, { passive: true });

  /* a mouse can drag the strip too (a narrow desktop window) */
  let drag = null;
  let clickGuard = false;
  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !strip.matches || !e.isPrimary) return;
    drag = { id: e.pointerId, x: e.clientX, left: view.scrollLeft, moved: false };
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; view.classList.add('is-dragging'); }
    if (drag.moved) view.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (drag && drag.moved) { clickGuard = true; setTimeout(() => { clickGuard = false; }, 0); }
    drag = null;
    view.classList.remove('is-dragging');
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  addEventListener('blur', endDrag);
  document.addEventListener('visibilitychange', endDrag);

  /* a door: its two leaves part at the seam and slide into the wall, the room pushes toward the light, then its
     page opens. The leaves are cut from the room picture itself (door__open is clipped to the slab's outline), so
     nothing is drawn until a door is used. */
  let opening = false;
  /* what shows through each doorway is a picture of the room behind it (tools/door_views.py); fetched once the room
     is up, so it is there before a door is used */
  const views = () => doorLinks.forEach((d) => {
    const n = (d.className.match(/door--([1-6])/) || [])[1];
    if (n) new Image().src = `assets/board/door-${n}.webp`;
  });
  if (moving()) { if ('requestIdleCallback' in window) requestIdleCallback(views, { timeout: 2500 }); else setTimeout(views, 1200); }
  const openDoor = (door) => {
    const src = roomImg && (roomImg.currentSrc || roomImg.src);
    const open = document.createElement('span');
    open.className = 'door__open';
    open.setAttribute('aria-hidden', 'true');
    const beyond = document.createElement('span');
    beyond.className = 'door__beyond';
    open.appendChild(beyond);
    const waits = [];
    ['l', 'r'].forEach((side) => {
      const leaf = document.createElement('span');
      leaf.className = `door__leaf door__leaf--${side}`;
      const pic = new Image();
      pic.alt = '';
      pic.draggable = false;
      pic.src = src;
      if (pic.decode) waits.push(pic.decode().catch(() => {}));
      leaf.appendChild(pic);
      open.appendChild(leaf);
    });
    door.insertBefore(open, door.firstChild);
    return Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 160))]).then(() => open);
  };
  stage.addEventListener('click', (e) => {
    const door = e.target.closest('a.door');
    if (!door) return;
    if (clickGuard) { e.preventDefault(); return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (opening || room.classList.contains('is-leaving')) { e.preventDefault(); return; }
    if (!moving()) return;
    e.preventDefault();
    opening = true;
    const hit = door.querySelector('.door__hit');
    const ox = (hit.offsetLeft + hit.offsetWidth / 2) / stage.offsetWidth * 100;
    const oy = (hit.offsetTop + hit.offsetHeight * 0.5) / stage.offsetHeight * 100;
    stage.style.setProperty('--ox', ox.toFixed(2) + '%');
    stage.style.setProperty('--oy', oy.toFixed(2) + '%');
    openDoor(door).then((open) => {
      void open.offsetWidth;
      door.classList.add('is-opening');
      setTimeout(() => room.classList.add('is-leaving'), 520);
      setTimeout(() => { location.href = door.href; }, 960);
    });
  });
  /* Back from the next page restores this one from the cache: shut the door and open the room again */
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    opening = false;
    room.classList.remove('is-leaving');
    room.querySelectorAll('.door.is-opening').forEach((d) => d.classList.remove('is-opening'));
    room.querySelectorAll('.door__open').forEach((el) => el.remove());
  });

  let raf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(centre);
  });
  onChange(strip, () => { syncDoors(); touched = false; centre(); });
  syncDoors();
  centre();
})();
