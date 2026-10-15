/* ============================================================
   Scroll Reveal — IntersectionObserver + stagger delays
   - Only targets elements that ALREADY have class="reveal"
   - Assigns data-reveal-delay per sibling group (same parent)
   - Adds is-visible once, then unobserves (one-shot)
   - Also re-attaches skill-progress bar animation
     (old inline engine is disabled by __skipOldReveal guard)
   ============================================================ */
(function () {
  'use strict';

  /* Tell the old inline reveal engine to skip (guard added in index.html) */
  window.__skipOldReveal = true;

  /* Respect reduced-motion: show everything immediately, no observer */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Assign stagger delays: index within the SAME parent --- */
  var parents = new Map();
  document.querySelectorAll('.reveal').forEach(function (el) {
    var parent = el.parentElement;
    if (!parents.has(parent)) parents.set(parent, []);
    parents.get(parent).push(el);
  });
  parents.forEach(function (children) {
    children.forEach(function (el, i) {
      /* Cap at 4 → delays 0s, 0.25s, 0.5s, 0.75s, 1s */
      el.setAttribute('data-reveal-delay', String(Math.min(i, 4)));
    });
  });

  if (reduceMotion) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    /* --- IntersectionObserver: one-shot reveal --- */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); /* one-shot */
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* --- Skill progress bars (moved here from disabled old engine) --- */
  var skillObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.skill-progress').forEach(function (bar) {
          bar.style.width = bar.getAttribute('data-width') + '%';
        });
        skillObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.skill-progress').forEach(function (bar) {
    var host = bar.closest('.skill-item') || bar.closest('section');
    if (host) skillObs.observe(host);
  });
})();
