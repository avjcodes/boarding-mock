/* Boarding mock, 10 Nov 2026: the inner pages' scroll walks play by themselves.
   Before, 3 or 4 windows were spread over 5 to 6 screens of scrolling, so a visitor kept scrolling without knowing how
   much was left. Now the section is one screen. When it comes into view the camera moves to window 1, holds, and moves
   on to the next; the 01/02/03 tabs jump to a window, a sideways swipe or an arrow key steps, and pointing at the caption
   or the tabs pauses it. Choosing a window yourself stops the self-play.
   Loaded before site.v1.js (both deferred); everything that needs the draft's tabs waits for DOMContentLoaded. */
(() => {
  'use strict';
  // where each window holds in the draft's keyframes: `walk` (How it works, four stages) and `walk3` (the words walks)
  const PLAN = {
    // the draft's own resting points (.run__stop --at in line.v1.css): every window's effects are complete there
    walk: { holds: [[0.19, 0.19], [0.40, 0.40], [0.63, 0.63], [0.86, 0.86]], intro: 0.03, first: 900, hold: 4500 },
    walk3: { holds: [[0.25, 0.25], [0.50, 0.50], [0.75, 0.75]], intro: 0.04, first: 2400, hold: 6000 },
  };
  const runs = [...document.querySelectorAll('.run[data-run]')];
  if (!runs.length) return;
  // a one-screen walk has no scroll stops; the draft's scroll code must not find any
  runs.forEach((run) => {
    run.querySelectorAll('.run__stop').forEach((s) => s.remove());
    run.classList.add('is-auto');
  });
  document.addEventListener('DOMContentLoaded', () => runs.forEach(setup));

  function setup(run) {
    if (getComputedStyle(run).getPropertyValue('--live').trim() !== '1') return;   // the static walk keeps the draft's own tabs
    const words = run.classList.contains('run--words');
    const { holds: HOLDS, intro: INTRO, first: FIRST_MS, hold: HOLD_MS } = words ? PLAN.walk3 : PLAN.walk;
    const names = (run.dataset.stations || '').split(',').map((s) => s.trim()).filter(Boolean);
    const n = Math.min(names.length, HOLDS.length);
    const plates = words ? [...run.querySelectorAll('.run__words > .run__word')] : [];
    const opener = words ? run.querySelector('.run__open') : null;
    if (!n) return;
    const unit = run.dataset.unit || 'Stage';
    const line = run.querySelector('.gangway');
    const hud = line && line.querySelector('[data-hud]');
    const stages = [...run.querySelectorAll('[data-stages] .stage')];
    const stage = run.querySelector('.run__stage') || run;
    const buttons = () => [...run.querySelectorAll('.rail__btn')];
    const pad = (i) => String(i + 1).padStart(2, '0');
    let current = -1;
    let auto = true;
    let visible = false;
    let reading = false;
    let moving = false;
    let timer = 0;
    let raf = 0;

    const setOn = (i, plate = i) => {
      stages.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (opener) opener.classList.toggle('is-on', plate < 0);
      plates.forEach((w, k) => w.classList.toggle('is-on', k === plate));
      buttons().forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
      const word = window.swPhase && typeof window.swPhase.word === 'function' ? window.swPhase.word() : '';
      if (hud) hud.textContent = `${unit} ${pad(i)} of ${pad(n - 1)}${word ? ` · ${word}` : ''}`;
      const deck = document.getElementById('deck-stage');
      if (deck && names[i]) deck.textContent = `${pad(i)} ${names[i]}`;
    };

    /* the walk's position lives in an inline style that this script moves frame by frame. A CSS transition on it
       would not work: a custom property that is being transitioned may not drive animation-delay, so Chrome would
       drop it mid-move and cut instead of panning. */
    const pNow = () => parseFloat(run.style.getPropertyValue('--walk')) || INTRO;
    const setWalk = (v) => run.style.setProperty('--walk', v.toFixed(4));
    /* the How-it-works page also has a phase diagram that follows the walk (window.swPhase from site.v1.js) */
    const phase = () => {
      const sp = window.swPhase;
      if (!sp || typeof sp.set !== 'function') return;
      const st = sp.stops || [0, 0.33, 0.67, 1];
      const map = [[0, 0], [0.24, 0], [0.34, st[1]], [0.46, st[1]], [0.56, st[2]], [0.7, 1], [1, 1]];
      const p = pNow();
      let t = 1;
      for (let k = 1; k < map.length; k++) {
        if (p <= map[k][0]) {
          const [p0, t0] = map[k - 1];
          const [p1, t1] = map[k];
          t = t0 + (t1 - t0) * ((p - p0) / (p1 - p0 || 1));
          break;
        }
      }
      sp.set(Math.round(t * 2000) / 2000);
    };
    /* elapsed-time tween, so a slow or busy frame never changes the speed */
    const tweenTo = (a, b, ms, done) => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        setWalk(a + (b - a) * k);
        phase();
        if (k < 1) raf = requestAnimationFrame(step); else done();
      };
      setWalk(a);
      raf = requestAnimationFrame(step);
    };

    const stopHold = () => { clearTimeout(timer); run.classList.remove('is-holding'); };
    /* long captions get longer: about 200 ms a word, never less than the page's own hold and never more than 16 s
       (pointing at or touching the caption pauses it for anyone reading slower) */
    const holdFor = () => {
      const cap = words ? plates[current] : stages[current];
      const count = cap ? (cap.textContent || '').trim().split(/\s+/).length : 0;
      return Math.min(16000, Math.max(HOLD_MS, count * 200));
    };
    const hold = () => {
      stopHold();
      run.classList.remove('is-paused');
      if (!auto || current < 0 || current >= n - 1) return;
      if (!visible || reading || document.hidden) { run.classList.add('is-paused'); return; }
      const ms = holdFor();
      void run.offsetWidth;   // restart the bar
      run.style.setProperty('--hold-t', `${ms}ms`);
      run.classList.add('is-holding');
      timer = setTimeout(() => goTo(current + 1), ms);
    };

    let settle = 0;
    let swap = 0;
    const goTo = (target) => {
      if (target < 0 || target >= n || target === current) return;
      const from = current;
      const forward = target > from;
      const a = pNow();   // wherever the camera is, resting or mid-move
      const b = forward ? HOLDS[target][0] : HOLDS[target][1];
      const ms = Math.round(Math.min(3200, Math.max(900, Math.abs(b - a) * 6500)));
      stopHold();
      clearTimeout(settle);
      clearTimeout(swap);
      moving = true;
      current = target;
      swap = setTimeout(() => setOn(target), ms / 2);
      tweenTo(a, b, ms, () => { moving = false; setOn(current); phase(); hold(); });
    };

    /* the draft's tabs: same buttons, but they move the camera instead of scrolling the page */
    run.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.rail__btn');
      if (!b || !run.contains(b)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      auto = false;
      stopHold();
      goTo(buttons().indexOf(b));
    }, true);

    run.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (!e.target.closest || !e.target.closest('.rail__btn')) return;
      e.preventDefault();
      auto = false;
      const next = Math.max(0, Math.min(n - 1, current + (e.key === 'ArrowRight' ? 1 : -1)));
      goTo(next);
      const b = buttons()[next];
      if (b) b.focus();
    });

    let sx = 0;
    let sy = 0;
    let st = 0;
    stage.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = e.timeStamp; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && e.timeStamp - st < 900) {
        auto = false;
        goTo(Math.max(0, Math.min(n - 1, current + (dx < 0 ? 1 : -1))));
      }
    }, { passive: true });

    /* reading the caption or reaching for a tab pauses the self-play; touching it hands control to the visitor */
    const pauseEls = [...run.querySelectorAll('.run__cap, .run__aside, .run__words, .run__open')];
    for (const el of pauseEls) {
      el.addEventListener('click', () => { auto = false; stopHold(); });
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { reading = true; stopHold(); run.classList.add('is-paused'); } });
      el.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        reading = pauseEls.some((x) => x.matches(':hover'));
        if (!reading) hold();
      });
      el.addEventListener('focusin', () => { reading = true; stopHold(); });
      el.addEventListener('focusout', () => { reading = false; hold(); });
    }

    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      visible = e.isIntersecting && e.intersectionRatio >= 0.55;
      const whole = e.isIntersecting && e.intersectionRatio >= 0.85;   // play starts only with the whole scene and its caption on screen
      if (whole && current < 0) {
        setTimeout(() => { if (visible && current < 0 && !document.hidden) goTo(0); }, FIRST_MS);
        return;
      }
      if (visible) hold(); else stopHold();
    }, { threshold: [0, 0.55, 0.85] });
    io.observe(stage);

    /* a clean start: every walk animation held at its own start, so --walk alone decides the frame */
    run.getAnimations({ subtree: true }).forEach((an) => { try { an.currentTime = 0; } catch (err) { /* not a walk animation */ } });
    setWalk(INTRO);
    setOn(0, words ? -1 : 0);   // the words walks open on their heading plate ("Three ways in."), then window 1
    current = -1;
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopHold(); else hold(); });
  }
})();
