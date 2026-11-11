/* Boarding mock, 10 Nov 2026: the original site's contact form on Mission Control (client note 4).
   Like the draft's form, it sends nothing itself: it opens the visitor's mail app with the message filled in. */
(() => {
  'use strict';
  const form = document.querySelector('form[data-contact]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const v = (k) => (d.get(k) || '').toString().trim();
    const name = [v('first'), v('last')].filter(Boolean).join(' ');
    const subject = v('about') ? `Space Weed: ${v('about')}` : 'Space Weed';
    const lines = [v('message'), '', name ? `From ${name}` : '', `Email: ${v('email')}`, v('phone') ? `Phone: ${v('phone')}` : ''];
    const body = lines.filter((l, i) => l || i === 1).join('\n').trim();
    location.href = `mailto:${form.dataset.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const note = form.querySelector('[data-form-note]');
    if (note) note.textContent = 'Your mail app should have opened with the message filled in. If it did not, write to info@spaceweedusa.com.';
  });
})();
