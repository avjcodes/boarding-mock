/* The Classified room: the signup (approved wording of 13 October), the Space Cadet ID card and File 001.
   A mockup: nothing is sent anywhere. The answers stay in this browser until "Clear them". */
(() => {
  'use strict';
  const KEY = 'sw-cadet';
  const form = document.getElementById('signup');
  const cadet = document.getElementById('cadet');
  const file = document.getElementById('file');
  if (!form || !cadet || !file) return;
  const { name } = form.elements;
  const clear = document.querySelector('[data-clear]');
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* this visit only */ } };
  const put = (sel, text) => { const el = cadet.querySelector(sel); if (el) el.textContent = text; };

  const show = (c, fresh) => {
    put('[data-card-name]', c.name || c.no);
    put('[data-card-no]', c.no);
    put('[data-card-issued]', c.issued);
    const card = cadet.querySelector('.card');
    if (card) card.setAttribute('aria-label', `Space Cadet ID card${c.name ? `, ${c.name}` : ''}, Cadet No. ${c.no}, issued ${c.issued}`);
    form.hidden = true;
    cadet.hidden = false;
    file.classList.add('is-open');
    if (clear) clear.hidden = false;
    if (fresh) cadet.querySelector('.cadet__in').focus();
  };

  /* the browser checks the required email and the 21+ box (the cleared wording has no messages of its own) */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new Date();
    const c = {
      name: name.value.trim().slice(0, 24),
      no: `${d.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      issued: `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`,
    };
    write(c);   // the email itself is not kept
    show(c, true);
  });

  if (clear) clear.addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ }
    form.reset();
    cadet.hidden = true;
    form.hidden = false;
    file.classList.remove('is-open');
    clear.hidden = true;
    form.elements.email.focus();
  });

  const saved = read();
  if (saved && saved.no) show(saved, false);
})();
