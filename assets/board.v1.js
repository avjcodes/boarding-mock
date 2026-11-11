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

  /* where the hatch is in each picture, as a share of its width and height */
  const HATCH = { wide: [0.714, 0.506], tall: [0.734, 0.49] };
  const RAMP = { wide: [0.5, 0.36], tall: [0.51, 0.42] };

  function originOf(img, pts) {
    if (!img || !img.naturalWidth) return null;
    const [fx, fy] = /tall/.test(img.currentSrc || img.src) ? pts.tall : pts.wide;
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    const pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    const px = Number.isFinite(pos[0]) ? pos[0] / 100 : 0.5;
    const py = Number.isFinite(pos[1]) ? pos[1] / 100 : 0.5;
    return [((r.width - w) * px + fx * w) / r.width * 100, ((r.height - h) * py + fy * h) / r.height * 100];
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

  /* Yes: push in toward the hatch, the ramp takes over, then the room. About 1.9 s, once per answer. */
  function board(done) {
    if (!moving()) { done(); return; }
    const scene = gate.querySelector('.gate__scene img');
    const ramp = gate.querySelector('.gate__ramp img');
    const h = originOf(scene, HATCH);
    const r = originOf(ramp, RAMP);
    if (h) { gate.style.setProperty('--hx', h[0].toFixed(2) + '%'); gate.style.setProperty('--hy', h[1].toFixed(2) + '%'); }
    if (r) { gate.style.setProperty('--rx', r[0].toFixed(2) + '%'); gate.style.setProperty('--ry', r[1].toFixed(2) + '%'); }
    void gate.offsetWidth;   // start the transitions from the resting frame
    html.classList.add('is-boarding');
    /* the room shows once its picture is ready, never earlier than 1.25 s and never later than 3 s */
    const ready = roomImg && roomImg.decode ? roomImg.decode().catch(() => {}) : Promise.resolve();
    const atLeast = new Promise((res) => setTimeout(res, 1250));
    const atMost = new Promise((res) => setTimeout(res, 3000));
    Promise.race([Promise.all([ready, atLeast]), atMost]).then(() => {
      html.classList.add('is-arriving');
      setTimeout(done, 600);
      setTimeout(() => html.classList.remove('is-arriving'), 1150);
    });
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

  /* a door: the room pushes toward it for 400 ms, then its page opens */
  stage.addEventListener('click', (e) => {
    const door = e.target.closest('a.door');
    if (!door) return;
    if (clickGuard) { e.preventDefault(); return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!moving() || room.classList.contains('is-leaving')) return;
    e.preventDefault();
    const hit = door.querySelector('.door__hit');
    const ox = (hit.offsetLeft + hit.offsetWidth / 2) / stage.offsetWidth * 100;
    const oy = (hit.offsetTop + hit.offsetHeight * 0.4) / stage.offsetHeight * 100;
    stage.style.setProperty('--ox', ox.toFixed(2) + '%');
    stage.style.setProperty('--oy', oy.toFixed(2) + '%');
    room.classList.add('is-leaving');
    setTimeout(() => { location.href = door.href; }, 400);
  });
  /* Back from the next page restores this one from the cache: open the room again */
  addEventListener('pageshow', (e) => { if (e.persisted) room.classList.remove('is-leaving'); });

  let raf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(centre);
  });
  onChange(strip, () => { syncDoors(); touched = false; centre(); });
  syncDoors();
  centre();
})();
