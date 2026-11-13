(() => {
  'use strict';
  const html = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOn = () => !html.classList.contains('motion-off') && !calm.matches;
  const launch = { fired: false, listeners: [] };
  const onLaunch = (fn) => { if (launch.fired) fn(); else launch.listeners.push(fn); };
  const put = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  const fireLaunch = () => { if (launch.fired) return; launch.fired = true; launch.listeners.forEach((fn) => fn()); launch.listeners = []; };
  (() => {
    const gate = document.getElementById('gate');
    if (!gate) { html.classList.remove('gate-pending'); fireLaunch(); return; }   // a copy built without the gate must not stay locked
    const chip = document.querySelector('.deck__item--age');
    if (chip && !chip.querySelector('button')) {
      const again = document.createElement('button');
      again.type = 'button'; again.className = 'deck__again'; again.textContent = chip.textContent.trim();
      again.tabIndex = -1;   // the strip is hidden from assistive tech and comes before the skip link; a keyboard visitor refreshes instead
      again.setAttribute('aria-label', `${again.textContent} · show the age check again`);
      chip.replaceChildren(again);
      again.addEventListener('click', () => {
        try { localStorage.removeItem('sw-age-ok'); } catch {  }
        try { sessionStorage.removeItem('sw-age-ok'); } catch {  }
        location.href = 'index.html';   // boarding mock: the age question is asked again outside the ship
      });
    }
    if (!html.classList.contains('gate-pending')) { fireLaunch(); return; }
    const behind = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
    const write = () => {
      const stamp = String(Date.now());
      try { sessionStorage.setItem('sw-age-ok', stamp); } catch {  }
    };
    const q = gate.querySelector('.gate__q');
    const buttons = gate.querySelector('.gate__buttons');
    const denied = gate.querySelector('.gate__denied');
    behind.forEach((el) => { el.inert = true; });
    gate.querySelector('[data-gate="yes"]')?.focus();
    let boarding = false;   // the first Yes is the answer: the keyboard can still reach these buttons while the beam runs
    gate.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gate]');
      if (!b || boarding) return;
      if (b.dataset.gate === 'yes') {
        boarding = true;
        write();
        const wake = () => {
          behind.forEach((el) => { el.inert = false; });
          gate.setAttribute('aria-hidden', 'true');
          document.getElementById('main')?.focus({ preventScroll: true });
        };
        if (motionOn()) {
          const status = gate.querySelector('[data-gate-status]');
          if (status) status.textContent = 'Transporter · energising';
          html.classList.add('gate-opening', 'gate-hold');
          setTimeout(() => html.classList.add('gate-arriving'), 1100);
          setTimeout(wake, 1160);   // the page's full style and layout, while the closed leaves hide it and nothing moves
          setTimeout(() => { html.classList.remove('gate-pending', 'gate-opening'); fireLaunch(); }, 1400);
          setTimeout(() => { html.classList.remove('gate-hold'); dispatchEvent(new Event('sw-aboard')); }, 1900);
          setTimeout(() => html.classList.remove('gate-arriving'), 2900);
        } else {
          wake();
          html.classList.remove('gate-pending');
          fireLaunch();
          dispatchEvent(new Event('sw-aboard'));
        }
        return;
      }
      if (b.dataset.gate === 'back') {
        denied.hidden = true; q.hidden = false; buttons.hidden = false;
        gate.querySelector('[data-gate="yes"]')?.focus();
        return;
      }
      q.hidden = true; buttons.hidden = true; denied.hidden = false;
      denied.querySelector('p').tabIndex = -1;
      denied.querySelector('p').focus();
    });
    gate.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); });
  })();
  (() => {
    const nav = document.getElementById('nav');
    const btn = document.querySelector('.menu-btn');
    if (!nav || !btn) return;
    nav.addEventListener('toggle', (e) => btn.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false'));
    nav.addEventListener('focusout', (e) => { if (nav.matches(':popover-open') && e.relatedTarget && !nav.contains(e.relatedTarget)) nav.hidePopover?.(); });
    if ('command' in HTMLButtonElement.prototype) return;
    document.querySelectorAll('[commandfor="nav"]').forEach((b) => {
      b.addEventListener('click', () => { if (b.getAttribute('command') === 'hide-popover') nav.hidePopover?.(); else nav.togglePopover?.(); });
    });
  })();
  (() => {
    const btns = [...document.querySelectorAll('.motion-btn')];
    if (!btns.length) return;
    const show = () => { const off = html.classList.contains('motion-off'); btns.forEach((btn) => { btn.setAttribute('aria-pressed', off ? 'false' : 'true'); btn.textContent = off ? 'Motion: off' : 'Motion: on'; }); };
    show();
    const keepPlace = (change) => {
      const line = innerHeight * 0.4;
      const at = [...document.querySelectorAll('main > section, main > .travel')].find((el) => el.getBoundingClientRect().bottom > line);
      const inTravel = at?.classList.contains('travel');
      const mark = inTravel ? at.nextElementSibling : at;
      const arrived = inTravel && mark?.getBoundingClientRect().top <= 0;
      const was = inTravel && !arrived ? 0 : mark?.getBoundingClientRect().top;
      change();
      if (mark) scrollTo({ top: scrollY + mark.getBoundingClientRect().top - was, behavior: 'instant' });
    };
    btns.forEach((btn) => btn.addEventListener('click', () => {
      const off = !html.classList.contains('motion-off');
      keepPlace(() => html.classList.toggle('motion-off', off));
      try { localStorage.setItem('sw-motion', off ? 'off' : 'on'); } catch {  }
      show();
      if (document.querySelector('.run.is-auto')) location.reload();   // boarding mock: the self-playing walk restarts in the new mode
    }));
  })();
  (() => {
    const pc = document.querySelector('canvas.sky-photo');
    if (!pc) return;
    const paint = () => {
      const img = new Image();
      img.src = 'assets/img/milky-way-1200.webp';
      img.decode().then(() => {
        const draw = () => {
          const W = pc.clientWidth, H = pc.clientHeight;
          pc.width = W; pc.height = H;
          const c = pc.getContext('2d');
          const s = Math.max(W / img.width, H / img.height);
          const w = img.width * s, h = img.height * s;
          c.globalAlpha = 0.22;
          c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          pc.classList.add('is-in');
        };
        draw();
        let lastW = innerWidth;
        addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; draw(); } }, { passive: true });
      }).catch(() => {});
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const later = () => setTimeout(() => idle(paint, { timeout: 2000 }), 1200);
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
  (() => {
    const voyage = document.getElementById('deck-voyage');
    const utc = document.getElementById('deck-utc');
    const stage = document.getElementById('deck-stage');
    if (!voyage) return;
    let raf = 0;
    const tick = () => { raf = 0; const max = document.documentElement.scrollHeight - innerHeight; put(voyage, String(Math.round(max > 0 ? scrollY / max * 100 : 0)).padStart(2, '0')); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    tick();
    const clock = () => { if (utc) utc.textContent = new Date().toISOString().slice(11, 16); };
    clock(); setInterval(clock, 20000);
    if (stage && !document.querySelector('.phase')) stage.closest('.deck__item').hidden = true;
  })();
  (() => {
    const main = document.getElementById('main');
    if (!main) return;
    const secs = [...main.querySelectorAll(':scope > section')];
    if (secs.length < 2) return;
    const nameOf = (s) => {
      if (s.dataset.deck) return s.dataset.deck;
      const h = document.getElementById(s.getAttribute('aria-labelledby') || '') || s.querySelector('h1, h2');
      const t = [...s.querySelectorAll('.tag')].find((el) => !el.closest('figure, form') && (!h || (el.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)));
      const raw = (t ? t.textContent : h ? h.textContent : '').trim();
      return raw.split('·')[0].replace(/[.?!]$/, '').trim();
    };
    const decks = secs.map((s, i) => ({ el: s, n: String(i + 1).padStart(2, '0'), name: nameOf(s) }));
    const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
    const scope = document.getElementById('scope');
    let blips = [], marker = null;
    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (scope) {
      marker = el('span', 'scope__marker');
      scope.append(el('span', 'scope__rail'), el('span', 'scope__ticks'), marker);
      blips = decks.map((d) => {
        const a = el('a', 'scope__blip');
        a.href = '#' + (d.el.getAttribute('aria-labelledby') || d.el.id);
        a.setAttribute('aria-label', `Deck ${d.n} · ${d.name}`);
        scope.append(a); return a;
      });
      const place = () => {
        const max = maxScroll(), H = scope.clientHeight || 1; let last = -Infinity;
        decks.forEach((d, i) => { let y = Math.min(1, d.el.offsetTop / max) * H; if (y < last + 28) y = last + 28; last = y; blips[i].style.top = `${Math.min(100, (y / H) * 100)}%`; });
      };
      place();
      addEventListener('resize', place, { passive: true });
      addEventListener('load', place, { once: true });
    }
    const where = document.getElementById('deck-where');
    const deckName = document.getElementById('deck-name');
    let cur = -1;
    const update = () => {
      if (marker) marker.style.top = `${Math.min(1, scrollY / maxScroll()) * 100}%`;
      const at = (d) => { const t = d.el.previousElementSibling; return t && t.classList.contains('travel') && t.offsetHeight > innerHeight ? t.offsetTop + 0.72 * (t.offsetHeight - innerHeight) : d.el.offsetTop - innerHeight * 0.4; };
      let k = 0; decks.forEach((d, i) => { if (scrollY >= at(d)) k = i; });
      if (k === cur) return; cur = k;
      if (where) where.textContent = decks[k].n;
      if (deckName && decks[k].el.dataset.deck) deckName.textContent = decks[k].el.dataset.deck;
      blips.forEach((b, i) => b.classList.toggle('is-here', i === k));
    };
    let raf = 0;
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
    update();
    const fields = document.querySelectorAll('.field--frost, .field--paper');
    if (fields.length && 'IntersectionObserver' in window) {
      [['lit-top', 5], ['lit-mid', 50], ['lit-bot', 95]].forEach(([cls, p]) => {
        const under = new Set();
        const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target))); html.classList.toggle(cls, under.size > 0); }, { rootMargin: `-${p}% 0px -${100 - p}% 0px` });
        fields.forEach((f) => io.observe(f));
      });
    }
  })();
  (() => {
    const r = document.querySelector('.reticle');
    if (!r || !fine.matches) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, on = false;
    const tick = () => {
      raf = 0;
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      r.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (e) => {
      if (!motionOn()) return;
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; r.classList.add('is-on'); }
      r.classList.toggle('is-aim', !!e.target.closest('a, button, input, [role="button"]'));
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { on = false; r.classList.remove('is-on'); });
    document.documentElement.addEventListener('mouseleave', () => { on = false; r.classList.remove('is-on'); });
  })();
  (() => {
    const hero = document.querySelector('.room--bridge'), first = document.querySelector('main > .travel--walk');
    if (!hero || !first) return;
    const crew = document.querySelector('.room--crew'), copy = first.querySelector('.travel__a');
    const pieces = [[hero.querySelector(':scope > .room__window'), copy.querySelector('.travel__pic')], [hero.querySelector(':scope > .shell'), copy.querySelector('.shell')], [hero.querySelector('.hero__pic'), copy.querySelector('.pass__flower')]];
    const place = () => {
      const top = hero.getBoundingClientRect().top + scrollY, run = first.getBoundingClientRect().top + scrollY;
      const boxes = pieces.map(([from]) => ({ left: `${from.offsetLeft}px`, top: `${top + from.offsetTop}px`, width: `${from.offsetWidth}px`, height: `${from.offsetHeight}px` }));
      const hang = top + pieces[0][0].offsetTop;   // the hull piece hangs from the window, and the window starts where the deck says
      const crewRun = crew ? Math.max(0, crew.offsetHeight - document.documentElement.clientHeight) : 0, crewTop = crew ? crew.querySelector('.crew').offsetTop : 0;
      html.style.setProperty('--hero-run', `${run}px`);
      html.style.setProperty('--crew-run', `${crewRun}px`);
      html.style.setProperty('--crew-top', `${crewTop}px`);   // a phone's deck has padding above the wall
      pieces.forEach(([, to], i) => Object.assign(to.style, boxes[i]));
      copy.querySelector('.fg').style.marginTop = `${hang}px`;
    };
    place();
    addEventListener('resize', place, { passive: true });
    addEventListener('load', place, { once: true });
  })();
  const arrives = (room) => !!room && getComputedStyle(room).animationName === 'deck-arrive';
  const whenArrived = (els, watch) => {
    const rooms = new Map();
    for (const el of els) {
      const room = el.closest('.travel + .room');
      if (!arrives(room)) { watch(el); continue; }
      if (!rooms.has(room)) rooms.set(room, []);
      rooms.get(room).push(el);
    }
    rooms.forEach((list, room) => {
      let done = false;
      const release = () => { if (done) return; done = true; io.disconnect(); removeEventListener('resize', check); list.forEach(watch); };
      const check = () => { if (!arrives(room)) release(); };   // a rotation or a short window: the deck is plain flow now
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) release(); }, { rootMargin: '0px 0px -90% 0px' });
      io.observe(room);
      room.addEventListener('focusin', release, { once: true });   // a keyboard reaches a deck before its arrival
      addEventListener('resize', check, { passive: true });
    });
  };
  (() => {
    document.querySelectorAll('.tag[data-type]').forEach((t) => t.style.setProperty('--n', String(t.textContent.trim().length)));
    const els = [...document.querySelectorAll('[data-reveal], .tag[data-type], .how__figure')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || !motionOn()) { els.forEach((el) => el.classList.add('is-in')); return; }
    const all = () => els.forEach((el) => el.classList.add('is-in'));
    const watch = () => {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
      const live = new Set();
      whenArrived(els, (el) => { live.add(el); io.observe(el); });
      let idle = 0;
      addEventListener('scroll', () => {
        clearTimeout(idle);
        idle = setTimeout(() => live.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('is-in'); io.unobserve(el); live.delete(el); } }), 200);
      }, { passive: true });
    };
    if (html.classList.contains('gate-pending')) addEventListener('sw-aboard', watch, { once: true }); else watch();
    addEventListener('beforeprint', all);
    addEventListener('resize', () => { if (innerHeight > 1800) all(); }, { passive: true });
    if (innerHeight > 1800) all();
  })();
  (() => {
    if (!motionOn() || !CSS.supports('selector(html:active-view-transition-type(door))')) return;
    const warm = () => {
      const narrow = matchMedia('(max-width: 700px)').matches;
      [narrow ? 'assets/img/airlock-leaves-tall-768.webp' : 'assets/img/airlock-leaves-1280.webp', 'assets/img/port-glass-320.webp', 'assets/img/frost-640.webp']
        .forEach((src) => { const im = new Image(); im.src = src; });
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const later = () => setTimeout(() => idle(warm, { timeout: 3000 }), 1400);
    if (html.classList.contains('gate-pending')) warm();   // the gate's arrival is through these leaves, within seconds
    else if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
  (() => {
    const els = [...document.querySelectorAll('.room, .travel, .intro, .section, .band, .run')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-near')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        e.target.classList.add('is-near');
        for (const im of e.target.querySelectorAll('.run .gangway img[loading="lazy"], .pass img[loading="lazy"], .travel__a img[loading="lazy"]')) im.loading = 'eager';
        io.unobserve(e.target);
      }
    }, { rootMargin: '150% 0px 150% 0px' });
    const watch = () => {
      const runs = els.filter((el) => el.matches('.run'));
      els.filter((el) => !el.matches('.run')).forEach((el) => io.observe(el));
      if (!runs.length) return;
      let started = false;
      const start = () => { if (started) return; started = true; runs.forEach((el) => io.observe(el)); };
      if (scrollY > 0 || location.hash) { start(); return; }
      addEventListener('scroll', start, { once: true, passive: true });
      setTimeout(start, 4000);
    };
    if (document.readyState === 'complete') watch(); else addEventListener('load', watch, { once: true });
  })();
  (() => {
    if (!CSS.supports('width', 'calc(sibling-index() * 1px)')) {
      document.querySelectorAll('.proof__facts, .engine__stages, .cargo__bays, .cargo__notes, .file__ledger').forEach((list) => {
        [...list.children].forEach((li, i) => li.style.setProperty('--i', String(i)));
      });
    }
    const plates = [...document.querySelectorAll('main .plate')];
    if (!plates.length) return;
    const on = (p) => p.classList.add('is-online');
    if (!('IntersectionObserver' in window) || !motionOn()) { plates.forEach(on); return; }
    const all = () => plates.forEach(on);
    const watch = () => {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { on(e.target); io.unobserve(e.target); }
      }, { threshold: 0.35 });
      const live = new Set();
      whenArrived(plates, (p) => { live.add(p); io.observe(p); });
      let idle = 0;
      addEventListener('scroll', () => {
        clearTimeout(idle);
        idle = setTimeout(() => live.forEach((p) => { if (p.getBoundingClientRect().top < innerHeight) { on(p); io.unobserve(p); live.delete(p); } }), 200);
      }, { passive: true });
    };
    if (html.classList.contains('gate-pending')) addEventListener('sw-aboard', watch, { once: true }); else watch();
    addEventListener('beforeprint', all);
    addEventListener('resize', () => { if (innerHeight > 1800) all(); }, { passive: true });
    if (innerHeight > 1800) all();
  })();
  onLaunch(() => {
    if (!motionOn() || !window.sky) return;
    const bud = document.querySelector('.hero__pic img');
    let fx = 0.72, fy = 0.5;
    if (bud) { const r = bud.getBoundingClientRect(); fx = (r.left + r.width / 2) / innerWidth; fy = (r.top + r.height / 2) / innerHeight; }
    window.sky.warp(fx, fy);
  });
  if (!document.querySelector('canvas.sky')) fireLaunch();
  addEventListener('load', () => { if (!html.classList.contains('gate-pending')) fireLaunch(); });
  (() => {
    if (!fine.matches) return;
    const hero = document.querySelector('.hero__pic');
    const buttons = [...document.querySelectorAll('.button')].map((b) => {
      const inner = b.querySelector('.button__in');
      return { b, inner, x: 0, y: 0, tx: 0, ty: 0, rect: null };
    });
    let raf = 0, mx = 0, my = 0;
    const measure = () => buttons.forEach((o) => { o.rect = o.b.getBoundingClientRect(); });
    const tick = () => {
      raf = 0;
      let busy = false;
      for (const o of buttons) {
        if (!o.inner) continue;
        o.x += (o.tx - o.x) * 0.16; o.y += (o.ty - o.y) * 0.16;
        if (Math.abs(o.tx - o.x) > 0.05 || Math.abs(o.ty - o.y) > 0.05) busy = true;
        o.inner.style.transform = `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px)`;
      }
      if (busy) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (hero) {
        const r = hero.getBoundingClientRect();
        if (my > r.top - 200 && my < r.bottom + 200) { hero.style.setProperty('--lx', `${((mx - r.left) / r.width * 100).toFixed(1)}%`); hero.style.setProperty('--ly', `${((my - r.top) / r.height * 100).toFixed(1)}%`); }
      }
      if (!motionOn()) return;
      for (const o of buttons) {
        if (!o.rect) continue;
        const r = o.rect;
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        const near = mx > r.left - 72 && mx < r.right + 72 && my > r.top - 72 && my < r.bottom + 72;
        if (near) {
          o.tx = Math.max(-10, Math.min(10, dx * 0.28)); o.ty = Math.max(-6, Math.min(6, dy * 0.28));
          o.b.style.setProperty('--mx', `${((mx - r.left) / r.width * 100).toFixed(1)}%`); o.b.style.setProperty('--my', `${((my - r.top) / r.height * 100).toFixed(1)}%`);
        } else { o.tx = 0; o.ty = 0; }
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    measure();
    addEventListener('resize', measure, { passive: true });
    addEventListener('scroll', () => { clearTimeout(measure._t); measure._t = setTimeout(measure, 120); }, { passive: true });
  })();
  (() => {
    if (!fine.matches || !('IntersectionObserver' in window)) return;
    const outside = (w) => [...w.querySelectorAll(':scope > img, :scope > video, :scope > .band__earth, :scope > .nugs, .travel__pic, .hold > picture > img')];
    const flower = document.querySelector('.hero__pic picture');   // nearer than the sky, so it moves further
    const seen = new Map();
    const release = (els) => els.forEach((el) => { el.style.transform = ''; el.style.willChange = ''; });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.set(e.target, outside(e.target));
        else if (seen.has(e.target)) { release(seen.get(e.target)); seen.delete(e.target); }
      }
    });
    document.querySelectorAll('.room__window, .hold, .travel__a, .travel__b').forEach((w) => io.observe(w));
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0;
    const tick = () => {
      raf = 0;
      x += (tx - x) * 0.1; y += (ty - y) * 0.1;
      const at = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      for (const els of seen.values()) for (const el of els) { el.style.willChange = 'transform'; el.style.transform = at; }
      if (flower) flower.style.transform = `translate(${(x * 1.8).toFixed(2)}px, ${(y * 1.8).toFixed(2)}px)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (e) => {
      if (!motionOn()) { tx = 0; ty = 0; } else { tx = (e.clientX / innerWidth - 0.5) * 24; ty = (e.clientY / innerHeight - 0.5) * 14; }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  })();
  (() => {
    const fields = [...document.querySelectorAll('.nugs')];
    if (!fields.length) return;
    if (!('IntersectionObserver' in window)) { html.classList.add('nugs-on'); return; }
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); }
      html.classList.toggle('nugs-on', seen.size > 0);
    });
    fields.forEach((f) => io.observe(f));
  })();
  (() => {
    const hall = document.querySelector('.corridor');
    if (!hall) return;
    if (!('IntersectionObserver' in window)) { html.classList.add('hall-on'); return; }
    new IntersectionObserver((entries) => { for (const e of entries) html.classList.toggle('hall-on', e.isIntersecting); }).observe(hall);
  })();
  (() => {
    const svg = document.querySelector('.phase');
    const route = document.getElementById('phase-route');
    const you = document.getElementById('phase-you');
    const halo = document.getElementById('phase-halo');
    const along = document.getElementById('phase-along');
    const word = document.getElementById('phase-state');
    const line = document.getElementById('phase-line');
    const chipRow = document.querySelector('.chips');
    const stages = [...document.querySelectorAll('.stage')];
    if (!svg || !route || !you || !along || !word || !line || !chipRow || !route.getTotalLength) return;
    const T0 = -60, T1 = 100, L0 = 0, L1 = 6, W = 1000, H = 660, ML = 150, MR = 48, MT = 64, MB = 110;
    const TT = 273.16, PT = 611.657;
    const tempOf = (x) => T0 + (x - ML) / (W - ML - MR) * (T1 - T0);
    const pressOf = (y) => Math.pow(10, L1 - (y - MT) / (H - MT - MB) * (L1 - L0));
    const pIce = (T) => Math.exp(9.550426 - 5723.265 / T + 3.53068 * Math.log(T) - 0.00728332 * T);
    const pLiq = (T) => Math.exp(54.842763 - 6763.22 / T - 4.210 * Math.log(T) + 0.000367 * T
      + Math.tanh(0.0415 * (T - 218.8)) * (53.878 - 1331.22 / T - 9.44523 * Math.log(T) + 0.014025 * T));
    const pMelt = (T) => { const th = T / TT; return PT * (1 - 0.626000e6 * (1 - Math.pow(th, -3)) + 0.197135e6 * (1 - Math.pow(th, 21.2))); };
    const region = (x, y) => {
      const T = tempOf(x) + 273.15, p = pressOf(y);
      if (T >= TT) return p >= pLiq(T) ? 'liquid' : 'vapour';
      if (p < PT) return p >= pIce(T) ? 'ice' : 'vapour';
      return p <= pMelt(T) ? 'ice' : 'liquid';
    };
    const pts = route.getAttribute('d').replace(/^M/, '').split(/\s*L\s*/).map((s) => s.split(',').map(Number));
    const total = route.getTotalLength();
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const stops = cum.map((c) => c / cum[cum.length - 1]);
    const words = { liquid: 'Liquid water', ice: 'Ice', vapour: 'Vapour' };
    const lines = {
      liquid: 'At harvest the water in the flower is liquid.',
      ice: 'Frozen within an hour of harvest, the water in the flower is ice.',
      vapour: 'Below the triple point, ice turns straight to vapour and is pulled out of the chamber. It does not melt.',
    };
    const legWords = { 2: { ice: 'Ice, drying' } };
    const legLines = { 2: { ice: 'Still ice. The pressure is now below the triple point, so as the flower warms the ice can only leave as vapour.' } };
    const names = stages.map((s) => s.querySelector('.stage__title')?.textContent.trim() || '');
    const step = Number(along.step) || 1;
    const chips = names.map((name, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = name;
      b.addEventListener('click', () => { along.value = Math.min(1000, Math.ceil((stops[i] ?? 1) * 1000 / step) * step); update(); svg.classList.add('is-drawn'); });
      chipRow.appendChild(b);
      return b;
    });
    const update = (tt) => {
      const t = typeof tt === 'number' ? tt : along.value / 1000;
      const p = route.getPointAtLength(t * total);
      you.setAttribute('cx', p.x.toFixed(1)); you.setAttribute('cy', p.y.toFixed(1));
      if (halo) { halo.setAttribute('cx', p.x.toFixed(1)); halo.setAttribute('cy', p.y.toFixed(1)); }
      let stage = 0;
      for (let i = 0; i < stops.length; i++) if (t >= stops[i] - 0.001) stage = i;
      stage = Math.min(stage, names.length - 1);
      const r = region(p.x, p.y);
      if (t >= 0.999) { put(word, 'Gone as vapour'); put(line, 'Over 80% of the water has left as vapour. The flower goes into the jar.'); }
      else { put(word, (legWords[stage] && legWords[stage][r]) || words[r]); put(line, (legLines[stage] && legLines[stage][r]) || lines[r]); }
      stages.forEach((li, i) => li.classList.toggle('is-on', i === stage));
      chips.forEach((b, i) => b.setAttribute('aria-pressed', i === stage ? 'true' : 'false'));
      const deck = document.getElementById('deck-stage');
      put(deck, `${String(stage + 1).padStart(2, '0')} ${names[stage]}`);
      along.setAttribute('aria-valuetext', `${names[stage]}: ${word.textContent.toLowerCase()}`);
    };
    along.addEventListener('input', () => update());
    update();
    window.swPhase = { stops, set(t) { along.value = String(Math.min(1000, Math.round(t * 1000 / step) * step)); update(t); svg.classList.add('is-drawn'); }, word: () => word.textContent };
  })();
  (() => {
    const hosts = [...document.querySelectorAll('[data-run], [data-poster]')];
    for (const host of hosts) {
      const line = host.querySelector('.gangway');
      const rail = host.querySelector('[data-rail]');
      if (!line || !rail) continue;
      const names = (host.dataset.stations || '').split(',').map((s) => s.trim()).filter(Boolean);
      const stages = [...host.querySelectorAll('[data-stages] .stage')];
      const hud = line.querySelector('[data-hud]');
      const track = host.querySelector('.run__track');
      const live = () => !!track && getComputedStyle(host).getPropertyValue('--live').trim() === '1';
      const pad = (i) => String(i + 1).padStart(2, '0');
      const stopEls = [...host.querySelectorAll('.run__stop')];
      const unit = host.dataset.unit;   // what this walk calls a stop; the tour's are stations, read as stages
      let current = -1;
      const buttons = names.map((name, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rail__btn';
        b.textContent = `${pad(i)} ${name}`;
        b.setAttribute('aria-label', `${unit || 'Station'} ${pad(i)} · ${name}`);
        b.addEventListener('click', () => go(i));
        rail.appendChild(b);
        return b;
      });
      const setOn = (i, state) => {
        if (i === current && !state) return;
        current = i;
        stages.forEach((s, k) => s.classList.toggle('is-on', k === i));
        buttons.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
        put(hud, `${unit || 'Stage'} ${pad(i)} of ${pad(names.length - 1)}${state ? ` · ${state}` : ''}`);
        const deck = document.getElementById('deck-stage');
        if (names[i]) put(deck, `${pad(i)} ${names[i]}`);
      };
      const aim = (i) => {
        line.classList.remove('gangway--go-1', 'gangway--go-2', 'gangway--go-3', 'gangway--go-4');
        line.classList.add(`gangway--go-${i + 1}`);
      };
      let wanted = -1;
      const go = (i) => {
        if (live()) {
          scrollTo({ top: stopEls[i].getBoundingClientRect().top + scrollY, behavior: motionOn() ? 'smooth' : 'auto' });
          return;
        }
        setOn(i);
        if (!line.querySelector('.gangway__poster') || line.classList.contains('gangway--awake')) { aim(i); return; }
        if (wanted < 0) {
          const pics = [...line.querySelectorAll('.gangway__world img')];
          pics.forEach((im) => { im.loading = 'eager'; });
          Promise.race([Promise.all(pics.map((im) => im.decode().catch(() => {}))), new Promise((done) => { setTimeout(done, 1500); })]).then(() => {
            line.classList.add('gangway--awake');
            requestAnimationFrame(() => requestAnimationFrame(() => aim(wanted)));
          });
        }
        wanted = i;
      };
      for (const read of host.querySelectorAll('.run__read')) read.addEventListener('click', () => {
        const on = read.closest('.run__plate').classList.toggle('is-open');
        read.setAttribute('aria-expanded', String(on));
        read.textContent = on ? 'Show less' : 'Read on';
      });
      if (!live()) { buttons.forEach((b) => b.setAttribute('aria-current', 'false')); continue; }
      const aside = host.querySelector('.run--words .run__aside');
      if (aside) {
        const fit = () => host.style.setProperty('--rail-w', `${aside.offsetWidth}px`);
        fit();
        addEventListener('resize', fit, { passive: true });
        document.fonts?.ready.then(fit);
      }
      const readout = document.querySelector('.readout[aria-live]');
      if (readout) readout.setAttribute('aria-live', 'off');
      const stops = window.swPhase?.stops || [0, 0.33, 0.67, 1];
      const map = [[0, 0], [0.24, 0], [0.34, stops[1]], [0.46, stops[1]], [0.56, stops[2]], [0.7, 1], [1, 1]];
      const tOf = (p) => {
        for (let k = 1; k < map.length; k++) {
          if (p <= map[k][0]) { const [p0, t0] = map[k - 1], [p1, t1] = map[k]; return t0 + (t1 - t0) * ((p - p0) / (p1 - p0 || 1)); }
        }
        return 1;
      };
      const ats = stopEls.map((s) => parseFloat(getComputedStyle(s).getPropertyValue('--at')));
      const halves = window.swPhase ? [0.29, 0.51, 0.75] : ats.slice(1).map((a, k) => (a + ats[k]) / 2);
      let raf = 0, lastT = -1;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = track.getBoundingClientRect();
          const span = track.offsetHeight - innerHeight;
          if (r.bottom < 0 || r.top > innerHeight || span <= 0) return;
          const p = Math.min(1, Math.max(0, -r.top / span));
          const i = halves.filter((h) => p >= h).length;
          const t = Math.round(tOf(p) * 2000) / 2000;
          if (window.swPhase && t !== lastT) { lastT = t; window.swPhase.set(t); }
          setOn(i, window.swPhase ? window.swPhase.word() : '');
        });
      };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
      onScroll();
    }
  })();
  (() => {
    const travels = [...document.querySelectorAll('main > .travel')];
    const track = document.querySelector('.run__track');
    const stops = track ? [...track.querySelectorAll('.run__stop')] : [];
    const plates = track ? [...track.querySelectorAll('.run__plate')] : [];
    if ((!travels.length && !stops.length) || !CSS.supports('animation-timeline: view()')) return;
    const pinnedMq = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 520px)');
    const live = () => pinnedMq.matches && !html.classList.contains('motion-off') && !html.classList.contains('gate-pending');
    const roomBefore = (t) => { let el = t.previousElementSibling; while (el && !el.classList.contains('room')) el = el.previousElementSibling; return el; };
    const roomAfter = (t) => { let el = t.nextElementSibling; while (el && !el.classList.contains('room')) el = el.nextElementSibling; return el; };
    const yOf = (el) => el.getBoundingClientRect().top + scrollY;
    const restY = (el) => (el.classList.contains('run__stop') ? yOf(el) : yOf(el) - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) - (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0));
    let riding = false, ridingIn = null, quiet = null, raf = 0, prevY = scrollY, lastDir = 0, touching = 0;
    let lastWheel = -Infinity, lastTouch = -Infinity, lastPress = -Infinity, lastWheelT = -Infinity, lastDy = 0, peak = 0, decay = 0, tail = false, lone = false;
    const zoneOf = (t) => { let a = t, z = t; while (a.previousElementSibling?.classList.contains('travel')) a = a.previousElementSibling; while (z.nextElementSibling?.classList.contains('travel')) z = z.nextElementSibling; return [yOf(a), yOf(z) + z.offsetHeight]; };
    const inZone = (t, y, vh) => { const [top, bottom] = zoneOf(t); return y > top - vh * 0.6 && y < bottom; };
    const stop = () => { riding = false; ridingIn = null; if (raf) cancelAnimationFrame(raf); raf = 0; html.classList.remove('is-riding'); };
    const handBack = () => { if (riding) { quiet = ridingIn; stop(); } };
    let swallowing = false;
    const swallow = (e) => { if (tail) e.preventDefault(); else { swallowing = false; removeEventListener('wheel', swallow); } };
    addEventListener('wheel', (e) => {
      const t = e.timeStamp, dy = e.deltaY, gap = t - lastWheelT;   // the event's own time: a busy thread delivers a stream late
      tail = e.deltaMode === 0 && Math.abs(dy) < 50 && gap < (swallowing ? 400 : 120) && Math.sign(dy) === Math.sign(lastDy) && Math.abs(dy) <= Math.abs(lastDy) * 1.25 + 2;
      decay = tail ? decay + 1 : 0;
      lone = gap > 120;
      peak = lone ? Math.abs(dy) : Math.max(peak, Math.abs(dy));
      lastDy = dy; lastWheelT = t; lastWheel = t;
      if (!tail) handBack();
    }, { passive: true });
    addEventListener('touchstart', (e) => { touching = e.touches.length; lastTouch = performance.now(); handBack(); }, { passive: true });
    addEventListener('touchmove', () => { lastTouch = performance.now(); }, { passive: true });
    const lift = (e) => { touching = e.touches.length; lastTouch = performance.now(); };
    addEventListener('touchend', lift, { passive: true });
    addEventListener('touchcancel', lift, { passive: true });
    addEventListener('keydown', (e) => {
      if (e.key === 'Home' || e.key === 'End' || ((e.ctrlKey || e.metaKey || e.altKey) && /^Arrow(Up|Down)$/.test(e.key))) { lastWheel = lastTouch = -Infinity; handBack(); return; }
      if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Escape| )$/.test(e.key)) { lastWheel = performance.now(); lastWheelT = -Infinity; handBack(); }
    });
    addEventListener('pointerdown', (e) => { lastPress = performance.now(); if (e.pointerType === 'mouse' && e.clientX > innerWidth - 24) handBack(); }, { passive: true });   // the scrollbar
    addEventListener('focusin', handBack);   // a focus move is the visitor's own, and it scrolls: the ride must not write over it
    document.addEventListener('click', (e) => { if (e.target.closest?.('a[href^="#"]')) { lastWheel = lastTouch = -Infinity; handBack(); } }, true);
    const ease = (p) => p + p * p - p * p * p;   // leaves at the page's own speed, peaks a third over the average, settles at rest
    const reading = (dir) => plates.some((p) => { const r = p.getBoundingClientRect(), vh = innerHeight; return r.height > vh - 70 && r.top < vh * 0.5 && (dir > 0 ? r.bottom > vh * 0.72 : r.top < 40 && r.bottom > vh * 0.5); });
    const ride = (t, room) => {
      stop();
      let from = scrollY, t0 = 0;
      const lead = restY(room) - yOf(room);   // the page's height can change under a ride, so the aim is the deck, not a number
      let to = yOf(room) + lead;
      const ms = Math.min(5600, Math.max(900, 700 + Math.abs(to - from) * 0.75));
      riding = true; ridingIn = t;
      window.swRideLast = { from, to, ms };   // read by tools/smooth.mjs and tools/ride.mjs
      html.classList.add('is-riding');
      swallowing = true;
      addEventListener('wheel', swallow, { passive: false });
      const step = (now) => {
        if (!riding) return;
        if (!live()) { stop(); return; }   // motion switched off, or the screen no longer pins the travels
        if (!t0) { t0 = now; from = scrollY; window.swRideLast.from = from; }   // from where the notch's own scroll has reached
        to = yOf(room) + lead; window.swRideLast.to = to;
        const p = Math.min(1, (now - t0) / ms);
        scrollTo({ top: from + (to - from) * ease(p), behavior: 'instant' });
        prevY = scrollY;
        if (p < 1) { raf = requestAnimationFrame(step); return; }
        stop();
        lastWheel = lastTouch = -Infinity;
      };
      raf = requestAnimationFrame(step);
    };
    const consider = (atRest) => {
      if (riding || touching || !live()) return;
      const now = performance.now();
      if (now - lastWheel > 400 && now - lastTouch > 4000) return;   // not the visitor's own scroll
      if (!atRest) {
        if (now - lastTouch < 4000) return;   // a fling: it finishes first, then scrollend brings us back here
        const notch = lone && Math.abs(lastDy) >= 50, spent = decay >= 3 && Math.abs(lastDy) < 12 && Math.abs(lastDy) <= peak * 0.5;
        if (!notch && !spent && now - lastWheelT < 80) return;   // a wheel stream under way: the hand keeps it
      }
      const y = scrollY, vh = innerHeight;
      if (quiet) { if (inZone(quiet, y, vh)) return; quiet = null; }
      if (stops.length) {   // the tour: on to the next window in the direction of the push; past the last, the page goes on by hand
        const top = yOf(track);
        if (y > top - vh * 0.7 && y < top + track.offsetHeight - vh) {
          if (reading(lastDir)) return;   // a plate taller than the screen stays in the hand until the reader has reached its end
          const next = lastDir > 0 ? stops.find((s) => yOf(s) > y + 12) : stops.findLast((s) => yOf(s) < y - 12);
          if (next) ride(track, next);
          return;
        }
      }
      for (const t of travels) {
        const top = yOf(t), bottom = top + t.offsetHeight;
        if (lastDir > 0 && y > top - vh * 0.6 && y < bottom - vh) { const next = roomAfter(t); if (next) ride(t, next); return; }
        if (lastDir < 0 && y < bottom - vh * 1.06 && y > top) { const prev = roomBefore(t); if (prev) ride(t, prev); return; }
      }
    };
    addEventListener('scroll', () => {
      const y = scrollY, dir = y > prevY ? 1 : y < prevY ? -1 : 0;
      prevY = y;
      if (!dir || riding) return;
      lastDir = dir;
      consider(false);
    }, { passive: true });
    const rescue = () => {
      if (riding || touching || quiet || !live() || window.swHold) return;
      const now = performance.now();
      if (now - lastWheel < 1500 || now - lastTouch < 4000 || now - lastPress < 1500) return;
      const y = scrollY;
      if (plates.length && y > yOf(track) && y < yOf(track) + track.offsetHeight - innerHeight && !reading(1) && !reading(-1) && !document.activeElement?.closest?.('.run__plate')) {
        const near = [track, ...stops].reduce((a, b) => (Math.abs(yOf(b) - y) < Math.abs(yOf(a) - y) ? b : a));
        if (Math.abs(yOf(near) - y) > 2) scrollTo({ top: yOf(near), behavior: 'instant' });
        return;
      }
      for (const t of travels) {
        const room = t.nextElementSibling;
        if (!arrives(room)) continue;
        const rest = restY(room);
        if (y > rest - innerHeight && y < rest - 2) { scrollTo({ top: rest, behavior: 'instant' }); return; }
      }
    };
    const atRest = () => { consider(true); rescue(); };
    if ('onscrollend' in window) addEventListener('scrollend', atRest);
    else { let idle = 0; addEventListener('scroll', () => { clearTimeout(idle); idle = setTimeout(atRest, 140); }, { passive: true }); }
  })();
  (() => {
    const clips = [...document.querySelectorAll('video[data-clip], video[data-sky]')];
    if (!clips.length) return;
    const inView = new Set();
    const held = new Set();
    let ready = false;   // no clip fetches a byte until the page has loaded and settled: the first picture comes first
    let readySky = false;   // the sky footage is the first window's largest paint: it starts at load, without the beat
    const tall = matchMedia('(max-aspect-ratio: 1/1)');   // a tall screen sees the sky through a strip of windscreen: the picture stands in and 1.5 MB stays unfetched
    const sync = (v) => {
      const ok = v.hasAttribute('data-sky') ? readySky && !tall.matches : ready;
      if (!ok || held.has(v) || !inView.has(v) || !motionOn()) { v.pause(); v.classList.remove('is-playing'); return; }
      v.play().then(() => v.classList.add('is-playing')).catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      const watch = new IntersectionObserver((entries) => { for (const e of entries) { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); sync(e.target); } }, { threshold: 0.2 });
      whenArrived(clips, (v) => watch.observe(v));   // a clip on a deck that arrives over its travel starts on the frame the stage was showing
    }
    const arm = () => { ready = true; clips.forEach(sync); };
    const armSky = () => { readySky = true; clips.forEach(sync); setTimeout(arm, 1200); };
    const slow = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    if (slow) {  }
    else if (document.readyState === 'complete') armSky();
    else addEventListener('load', armSky, { once: true });
    clips.forEach((v) => {
      const toggle = v.closest('figure, section')?.querySelector('[data-clip-toggle]');
      if (!toggle) return;
      const show = () => { const off = held.has(v) || !motionOn(); toggle.setAttribute('aria-pressed', off ? 'true' : 'false'); toggle.textContent = off ? 'Play the clip' : 'Pause the clip'; };
      toggle.hidden = false; show();
      toggle.addEventListener('click', () => {
        if (!motionOn() && !held.has(v)) { held.add(v); }
        if (held.has(v)) { held.delete(v); if (!motionOn()) { v.play().then(() => v.classList.add('is-playing')).catch(() => {}); toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = 'Pause the clip'; return; } }
        else held.add(v);
        show(); sync(v);
      });
    });
    const resync = () => clips.forEach(sync);
    calm.addEventListener('change', resync);
    new MutationObserver(resync).observe(html, { attributes: true, attributeFilter: ['class'] });
  })();
  (() => {
    document.querySelectorAll('[data-file]').forEach((fig) => {
      const sheets = [...fig.querySelectorAll('.sheet')];
      const rows = [...fig.querySelectorAll('.file__row')];
      const ticks = [...fig.querySelectorAll('.file__tick')];
      const n = sheets.length;
      if (!n) return;
      const front = (k) => {
        sheets.forEach((s, i) => { const pos = (i - k + n) % n; s.style.setProperty('--i', String(pos)); s.classList.toggle('is-front', pos === 0); });
        rows.forEach((r, i) => r.classList.toggle('is-front', i === k));
        ticks.forEach((t, i) => t.classList.toggle('is-front', i === k));
      };
      fig.addEventListener('click', (e) => { const b = e.target.closest('[data-sheet]'); if (!b) return; front(Number(b.dataset.sheet)); });
    });
  })();
  (() => {
    const form = document.querySelector('.form[data-mailto]:not([data-compose])');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const about = (data.get('about') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();
      const subject = about ? `Space Weed: ${about}` : 'Space Weed';
      const body = `${message}\n\n${name ? `From ${name}` : ''}`.trim();
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = form.querySelector('[data-form-note]');
      if (note) note.textContent = 'Your mail app should have opened with the message filled in. If it did not, write to info@spaceweedusa.com.';
    });
  })();
  (() => {
    const form = document.querySelector('form[data-compose]');
    if (!form) return;
    const store = form.querySelector('#c-store');
    const city = form.querySelector('#c-city');
    const entry = form.querySelector('[data-entry]');
    const note = form.querySelector('[data-compose-note]');
    const copy = form.querySelector('[data-copy]');
    if (!store || !city || !entry || !note) return;
    const fills = { store: [...form.querySelectorAll('[data-fill="store"]')], city: [...form.querySelectorAll('[data-fill="city"]')] };
    const blank = { store: 'your store’s name', city: 'your city' };
    const clean = (v) => v.replace(/\s+/g, ' ').trim();
    const render = () => {
      const s = clean(store.value), c = clean(city.value);
      fills.store.forEach((el) => { el.textContent = s || blank.store; el.classList.toggle('is-empty', !s); });
      fills.city.forEach((el) => { el.textContent = c || blank.city; el.classList.toggle('is-empty', !c); });
      entry.textContent = s ? (c ? `${s}, ${c}` : s) : 'Nothing written yet';
      form.classList.toggle('is-ready', !!s);   // the little hatch shuts once an entry is written; the caption says it is only written here
    };
    const letter = () => {
      const s = clean(store.value), c = clean(city.value);
      const lines = ['Hello Space Weed,', '', 'Here is a store for your list.', '', `Store: ${s}`];
      if (c) lines.push(`City: ${c}`);
      lines.push('', 'Thank you.');
      return lines.join('\r\n');
    };
    form.addEventListener('input', render);
    render();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent('A store for the Space Weed list')}&body=${encodeURIComponent(letter())}`;
      form.classList.add('is-filed');
      note.textContent = 'Your mail app should have opened with the message filled in. Nothing was sent from this page. If it did not open, write to info@spaceweedusa.com.';
    });
    if (copy) {
      copy.hidden = false;
      copy.addEventListener('click', async () => {
        if (!form.reportValidity()) return;
        const text = `To: info@spaceweedusa.com\r\nSubject: A store for the Space Weed list\r\n\r\n${letter()}`;
        try {
          await navigator.clipboard.writeText(text);
          form.classList.add('is-filed');
          note.textContent = 'Copied. Paste it into an email to info@spaceweedusa.com. Nothing was sent from this page.';
        } catch {
          const box = form.querySelector('.compose__letter');
          if (box && getSelection) getSelection().selectAllChildren(box);
          note.textContent = 'Copying was blocked, so the message is selected instead: press Ctrl+C, or Cmd+C on a Mac.';
        }
      });
    }
  })();
  (() => {
    if (!motionOn() || !('IntersectionObserver' in window)) return;
    const targets = [...document.querySelectorAll('main .head, main .statement')].filter((el) => !el.closest('.hero') && !el.closest('.intro') && el.getBoundingClientRect().top > innerHeight * 0.9);
    if (!targets.length) return;
    const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const go = async () => {
      try {
        await load('assets/vendor/gsap.min.js');
        await Promise.all([load('assets/vendor/ScrollTrigger.min.js'), load('assets/vendor/SplitText.min.js')]);
      } catch { return; }
      if (!window.gsap || !window.SplitText || !window.ScrollTrigger || !motionOn()) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      await document.fonts.ready;
      const tweens = [];
      const queue = targets.slice();
      let lastIn = 0;
      for (const ev of ['wheel', 'touchstart', 'keydown']) addEventListener(ev, () => { lastIn = performance.now(); }, { passive: true });
      const busy = () => html.classList.contains('is-riding') || performance.now() - lastIn < 500;
      const slice = () => {
        if (busy()) { idle(slice, { timeout: 800 }); return; }
        const batch = queue.splice(0, 1);
        const tops = batch.map((el) => el.getBoundingClientRect().top);
        const rooms = batch.map((el, i) => { const room = el.closest('.travel + .room'); return arrives(room) && tops[i] - room.getBoundingClientRect().top < innerHeight * 0.85 ? room : null; });
        batch.forEach((el, i) => {
          if (tops[i] < innerHeight * 0.85) return;
          el.classList.add('is-split');
          SplitText.create(el, {
            type: 'lines', mask: 'lines', aria: 'none', autoSplit: true,   
            onSplit: (self) => { const t = gsap.from(self.lines, { yPercent: 105, duration: 0.6, stagger: 0.06, ease: 'expo.out', scrollTrigger: rooms[i] ? { trigger: rooms[i], start: 'top 10%', once: true } : { trigger: el, start: 'top 96%', once: true } }); tweens.push(t); return t; },
          });
        });
        if (queue.length) idle(slice, { timeout: 800 }); else ScrollTrigger.refresh();
      };
      slice();
      const finish = () => tweens.forEach((t) => { if (t.progress() < 1) t.progress(1); });
      const settle = () => { if (motionOn()) return; queue.length = 0; tweens.forEach((t) => { t.scrollTrigger?.kill(); t.progress(1); }); };
      new MutationObserver(settle).observe(html, { attributes: true, attributeFilter: ['class'] });
      calm.addEventListener('change', settle);
      addEventListener('resize', () => { if (innerHeight > 1800) finish(); }, { passive: true });
      addEventListener('beforeprint', finish);
      if (innerHeight > 1800) finish();
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    const later = () => setTimeout(() => idle(go, { timeout: 1500 }), 1200);
    if (html.classList.contains('gate-pending')) addEventListener('sw-aboard', later, { once: true });
    else if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
  /* from Don's 11 Nov draft: Mission Control links open the contact form over the page */
  (() => {
    const dlg = document.getElementById('comms');
    const openers = [...document.querySelectorAll('a[data-comms]')];
    if (!dlg || typeof dlg.showModal !== 'function' || !openers.length) return;
    const own = document.querySelector('main .form[data-contact]');   // the page's own copy of the form, at its foot (Partner, Contact)
    const nav = document.getElementById('nav');
    const menuBtn = document.querySelector('.menu-btn');
    const note = dlg.querySelector('[data-form-note]');
    const menuOpen = () => { try { return !!nav && nav.matches(':popover-open'); } catch { return false; } };
    let opener = null;
    let topAtOpen = 0;   // where the page stood when the dialog opened
    const open = (from) => {
      if (dlg.open) return;
      opener = from;
      if (menuOpen()) { opener = menuBtn; nav.hidePopover(); }   // a link in the phone menu has no box once the menu closes: focus returns to the Menu button
      if (note) note.textContent = '';
      const barW = innerWidth - html.clientWidth;   // the width of the classic scrollbar on screen now (0 where scrollbars overlay), read at every open and kept nowhere
      topAtOpen = scrollY;
      if (barW > 0) html.style.setProperty('--comms-sbw', barW + 'px');   // the lock takes the scrollbar away: the page is padded by its width and the fixed layers keep clear of the edge (site.css), so nothing moves and the viewport units keep their value; --sbw is the gate's and is not touched
      html.classList.toggle('comms-bar', barW > 0);
      html.classList.add('comms-open');
      dlg.showModal();
      (fine.matches ? dlg.querySelector('input') : dlg.querySelector('.comms__title'))?.focus();   // a phone keeps its keyboard down until a field is touched
    };
    dlg.addEventListener('close', () => {
      html.classList.remove('comms-open', 'comms-bar');
      html.style.removeProperty('--comms-sbw');
      if (Math.abs(scrollY - topAtOpen) > 0.5) scrollTo({ top: topAtOpen, behavior: 'instant' });   // the scrollbar's return makes the browser lay the page out once without it, and a page resting at its foot is held to that shorter height: it goes back to where it was
      (opener && opener.getClientRects().length ? opener : document.getElementById('main'))?.focus({ preventScroll: true });
      opener = null;
    });
    const outside = (e) => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    let pressedOut = false;
    dlg.addEventListener('pointerdown', (e) => { pressedOut = outside(e); });
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-comms-close]') || (pressedOut && outside(e))) dlg.close();
      pressedOut = false;
    });
    for (const a of openers) {
      if (!own) a.setAttribute('aria-haspopup', 'dialog');
      a.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab asked for stays a new tab
        if (html.classList.contains('gate-arriving') || html.classList.contains('vt')) return;   // the airlock's leaves are still parting, or a door between pages is still closing (a modal would paint over either): the link goes to the contact page
        e.preventDefault();
        if (own) {   // this page carries the form: take the visitor to it, not to a second copy
          if (menuOpen()) nav.hidePopover();
          const head = document.getElementById(own.closest('section')?.getAttribute('aria-labelledby') || '');   // the form's section heading (tabindex -1 in the page)
          (head || own).scrollIntoView({ block: 'start', behavior: motionOn() ? 'smooth' : 'instant' });   // the top of the section, not the middle of a form taller than a phone
          (fine.matches ? own.querySelector('input') : head)?.focus({ preventScroll: true });   // a phone keeps its keyboard down until a field is touched
          return;
        }
        open(a);
      });
    }
    if (dlg.hasAttribute('data-comms-auto')) {
      let seen = false;
      try { seen = sessionStorage.getItem('sw-comms') === '1'; } catch {  }
      const nav0 = performance.getEntriesByType?.('navigation')?.[0];
      if (nav0 && nav0.type === 'reload') seen = false;   // the old site showed it again on a reload
      const roomy = matchMedia('(min-width: 700px) and (min-height: 640px)');   // a phone's first screen is not covered
      const arm = () => setTimeout(() => {
        if (dlg.open || !roomy.matches || html.classList.contains('vt') || html.classList.contains('is-riding') || menuOpen()) return;
        try { sessionStorage.setItem('sw-comms', '1'); } catch {  }
        open(null);
      }, 2000);
      if (!seen) {
        if (html.classList.contains('gate-pending')) addEventListener('sw-aboard', arm, { once: true });
        else if (document.readyState === 'complete') arm();
        else addEventListener('load', arm, { once: true });
      }
    }
  })();
})();
