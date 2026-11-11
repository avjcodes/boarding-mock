// Space Weed age gate. Same rules as the WordPress plan (age-gate/INSTALL.md): asked once, Yes
// remembered for 30 days, No shows one line, everything behind the gate is inert while it is open.
// Runs in the visitor's browser, so search engines and link previews read the page itself.
//
// Markup expected on every page, first inside <body>:
// <div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-q" hidden>
//   <div class="gate__panel">
//     <img class="gate__mark" src="assets/img/logo-space-weed-white.png" alt="Space Weed" width="160" height="88">
//     <h2 class="gate__q" id="gate-q">Are you 21 or older?</h2>
//     <div class="gate__buttons">
//       <button class="button gate__yes" type="button" data-gate="yes">Yes</button>
//       <button class="button button--quiet gate__no" type="button" data-gate="no">No</button>
//     </div>
//     <p class="gate__legal">Keep out of reach of children. For use only by adults 21 years of age or older.</p>
//     <p class="gate__denied" hidden>This site is for adults 21 and older.</p>
//   </div>
// </div>
(() => {
  const KEY = 'sw-age-ok';
  const DAYS = 30;
  const gate = document.getElementById('gate');
  if (!gate) return;
  const behind = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
  const read = () => { try { return Number(localStorage.getItem(KEY) || 0); } catch { return 0; } };
  const write = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode: ask again next time */ } };
  const okUntil = read() + DAYS * 864e5;
  if (okUntil > Date.now()) return;            // answered Yes within 30 days: no gate

  const open = () => {
    gate.hidden = false;
    document.documentElement.classList.add('gate-open');
    behind.forEach((el) => { el.inert = true; });
    const yes = gate.querySelector('[data-gate="yes"]');
    if (yes) yes.focus();
  };
  const close = () => {
    gate.hidden = true;
    document.documentElement.classList.remove('gate-open');
    behind.forEach((el) => { el.inert = false; });
  };
  gate.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gate]');
    if (!b) return;
    if (b.dataset.gate === 'yes') { write(); close(); return; }
    // No: the question and buttons go, the one line stays. Nothing else to do here.
    gate.querySelector('.gate__q').hidden = true;
    gate.querySelector('.gate__buttons').hidden = true;
    const denied = gate.querySelector('.gate__denied');
    denied.hidden = false;
    denied.tabIndex = -1;
    denied.focus();
  });
  gate.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); }); // no way round it with Esc
  open();
})();
