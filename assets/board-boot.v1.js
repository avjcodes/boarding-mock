/* Runs in the head before first paint: marks the page as scripted and decides whether the boarding gate shows.
   The age answer lasts for one visit. The gate shows again whenever a visit starts: a new tab or browser session,
   arriving from another site, or typing the address. A reload asks again too (the review build, so the gate can be
   shown in a meeting). Moving between pages of the site does not ask again. */
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  var ok = 0;
  try { ok = Number(sessionStorage.getItem('sw-age-ok') || 0); } catch (e) { ok = 0; }
  try { localStorage.removeItem('sw-age-ok'); } catch (e) { /* the old 30-day memory, retired */ }
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var type = nav ? nav.type : (performance.navigation && performance.navigation.type === 1 ? 'reload' : 'navigate');
  var fromHere = false;
  try { fromHere = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { fromHere = false; }
  if (type === 'reload' || !ok || (type === 'navigate' && !fromHere)) html.classList.add('gate-pending');
  /* the inner pages' Motion button: "off" holds here too */
  var mo = null;
  try { mo = localStorage.getItem('sw-motion'); } catch (e) { mo = null; }
  if (mo === 'off') html.classList.add('motion-off');

  /* page transitions: coming in from an inner page is the browser's short crossfade; going out is skipped,
     because the door push-in is already the move (and the client asked for less animation) */
  var hush = function (vt) {
    vt.ready.catch(function () {}); vt.finished.catch(function () {});
    if (vt.updateCallbackDone) vt.updateCallbackDone.catch(function () {});
  };
  addEventListener('pageswap', function (e) { if (e.viewTransition) { hush(e.viewTransition); e.viewTransition.skipTransition(); } });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    hush(e.viewTransition);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('gate-pending')) e.viewTransition.skipTransition();
  });
})();
