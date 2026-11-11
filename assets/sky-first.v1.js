/* Paints the still sky before first paint, so the page never shows an empty canvas while the deferred
   script loads. Same seed, layers and colours as src/sky.js. Own code. */
(function () {
  var c = document.querySelector('canvas.sky'); if (!c) return;
  var ctx = c.getContext('2d', { alpha: true }); if (!ctx) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var phone = !fine || innerWidth < 700;
  var dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
  var W = c.clientWidth, H = c.clientHeight;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var a = 20150521;
  var rnd = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  var L = phone ? [[110, 0.7, 1.0, 0.4, 0.65], [48, 1.1, 1.5, 0.55, 0.85], [14, 1.7, 2.3, 0.75, 1.0]] : [[220, 0.7, 1.0, 0.4, 0.65], [90, 1.1, 1.5, 0.55, 0.85], [26, 1.7, 2.3, 0.75, 1.0]];
  var C = ['236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '236,241,246', '155,220,247', '155,220,247', '255,233,196'];
  var sy = (scrollY || 0);
  for (var l = 0; l < L.length; l++) {
    var n = L[l][0], s0 = L[l][1], s1 = L[l][2], a0 = L[l][3], a1 = L[l][4], depth = [0.25, 0.55, 1.0][l];
    for (var i = 0; i < n; i++) {
      var x = rnd(), y = rnd(), r = s0 + rnd() * (s1 - s0), al = a0 + rnd() * (a1 - a0), col = C[Math.floor(rnd() * C.length)]; rnd(); rnd();
      var X = (x * 1.2 - 0.1) * W, Y = ((y * 1.3 - 0.15) * H - (sy * 0.12 * depth) % (H * 1.3));
      if (Y < -20) Y += H * 1.3; else if (Y > H + 20) Y -= H * 1.3;
      ctx.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
      ctx.fillRect(Math.round(X), Math.round(Y), r, r);
    }
  }
})();
