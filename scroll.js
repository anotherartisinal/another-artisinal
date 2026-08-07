// ── Lenis inertial smooth-scroll engine (from the design hand-off) ───────────
// lerp 0.085, native touch momentum, reduced-motion fallback. Exposes
// window.lenisResize() and window.aaScrollTop() for the SPA to call after
// page/route/accordion changes (height shifts) so the driven scroll stays correct.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !window.Lenis) {
    window.lenisResize = function () {};
    window.aaScrollTop = function () { window.scrollTo(0, 0); };
    return;
  }

  var lenis = new window.Lenis({
    lerp: 0.085,          // per-frame interpolation; lower = longer glide
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false,     // keep native touch momentum on mobile
  });
  window.__lenis = lenis;

  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // Route in-page anchors through Lenis (never the browser).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    var el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(href, { offset: -8 });
  });

  window.addEventListener('load', function () { lenis.resize(); });
  // Recompute after any image finishes loading (layout shift).
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IMG') lenis.resize();
  }, true);

  window.lenisResize = function () { try { lenis.resize(); } catch (e) {} };
  window.aaScrollTop = function () { try { lenis.scrollTo(0, { immediate: true }); } catch (e) { window.scrollTo(0, 0); } };
})();
