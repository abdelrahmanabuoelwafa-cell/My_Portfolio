/* ============================================================
   Cinematic & High-Performance Scroll Motion — GSAP + ScrollTrigger
   - Smooth entrance reveals with once: true
   - Individual triggers so cards animate as they appear
   - Locks is-visible class permanently upon completion
   - Cleans inline transforms so CSS hovers work flawlessly
   - Lightweight & 60fps buttery smooth performance
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.innerWidth < 768;

  /* ---- Reduced motion or no GSAP fallback ---- */
  if (reduceMotion || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js-enabled');
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.classList.add('is-visible');
    });
    document.querySelectorAll('.skill-progress[data-width]').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
    return;
  }

  document.documentElement.classList.add('js-enabled');
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ============================================================
     HERO ENTRANCE — Smooth, elegant, no glitches
     ============================================================ */
  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-top-image', { duration: mobile ? 0.5 : 0.7, opacity: 0, scale: 0.94, clearProps: 'all' })
    .from('.hero-name', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: -12 }, '-=0.35')
    .from('.hero-hook', { duration: 0.4, opacity: 0, y: -8 }, '-=0.25')
    .from('.typing-container', { duration: 0.4, opacity: 0, y: -8 }, '-=0.2')
    .from('.hero-badge', { duration: 0.4, opacity: 0, y: -8 }, '-=0.2')
    .from('.hero-desc', { duration: 0.4, opacity: 0, y: -8 }, '-=0.2')
    .from('.hero-buttons', { duration: 0.4, opacity: 0, y: -8 }, '-=0.2')
    .from('.hero-scroll-cue', { duration: 0.3, opacity: 0, y: -6 }, '-=0.15');

  /* Gentle hero cue fade out */
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.to(['.hero-scroll-cue', '.scroll-indicator'], {
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '20% top', scrub: true }
    });
  }

  /* Helper function to animate elements smoothly into view */
  function revealElement(el, yOffset, startThreshold) {
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: yOffset || 22, scale: 0.99 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        ease: 'power2.out',
        clearProps: 'transform',
        onComplete: function () {
          el.classList.add('is-visible');
        },
        scrollTrigger: {
          trigger: el,
          start: startThreshold || 'top 92%',
          once: true
        }
      }
    );
  }

  /* ============================================================
     SECTION HEADERS — Smooth rise-in
     ============================================================ */
  document.querySelectorAll('.section-header.reveal').forEach(function (el) {
    revealElement(el, 18, 'top 92%');
  });

  /* ============================================================
     CONTENT BLOCKS & CARDS — Each item triggers as it reaches view
     ============================================================ */
  var cardSelectors = [
    '.about-content.reveal',
    '.skills-tabs.reveal',
    '.skill-category.reveal',
    '.car-card.reveal',
    '.stat-card.reveal',
    '.premium-testimonial-card.reveal',
    '.testimonial-card.reveal',
    '.service-card.reveal',
    '.price-card.reveal',
    '.future-card.reveal',
    '.pro-exp-card.reveal',
    '.contact-info.reveal',
    '.planner-box.reveal'
  ];

  cardSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      revealElement(el, 24, 'top 90%');
    });
  });

  /* ============================================================
     PROJECT CARDS — Stable, smooth, 100% visible on hover
     ============================================================ */
  document.querySelectorAll('.project-card.reveal').forEach(function (card) {
    revealElement(card, 28, 'top 90%');
  });

  /* About Image Reveal */
  var aboutImg = document.querySelector('.about-image.reveal');
  if (aboutImg) {
    revealElement(aboutImg, 26, 'top 88%');
  }

  /* ============================================================
     SKILL PROGRESS BARS — Fill once when scrolled into view
     ============================================================ */
  document.querySelectorAll('.skill-progress[data-width]').forEach(function (bar) {
    var target = bar.getAttribute('data-width') || '0';
    var host = bar.closest('.skill-item') || bar.closest('.skill-category') || bar;
    gsap.fromTo(bar,
      { width: '0%' },
      {
        width: target + '%',
        duration: 0.85,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: host,
          start: 'top 92%',
          once: true
        }
      }
    );
  });

  /* Recalculate positions once everything is loaded */
  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });

  /* ============================================================
     SERVICES CINEMA — slide-wipe sequence (desktop only)
     ============================================================ */
  (function initServicesCinema() {
    var cinema = document.getElementById('svcCinema');
    if (!cinema) return;
    var slides = Array.prototype.slice.call(cinema.querySelectorAll('.slide'));
    var N = slides.length;
    if (N < 2) return;
    if (window.innerWidth < 768) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cinema.classList.add('cinema-ready');
    cinema.style.height = (N * 100) + 'vh';

    var outers = slides.map(function (s) { return s.querySelector('.slide__outer'); });
    var inners = slides.map(function (s) { return s.querySelector('.slide__inner'); });
    var heads = slides.map(function (s) { return s.querySelector('.slide__heading'); });
    var imgs = slides.map(function (s) { return s.querySelector('.slide__img'); });
    var countEl = cinema.querySelector('.cinema-count-num');

    slides.forEach(function (s, i) { gsap.set(s, { zIndex: i + 1 }); });
    gsap.set(outers, { xPercent: 100 });
    gsap.set(inners, { xPercent: -100 });
    gsap.set(outers[0], { xPercent: 0 });
    gsap.set(inners[0], { xPercent: 0 });
    gsap.set(imgs, { transformOrigin: '50% 50%' });
    heads.forEach(function (h, i) { if (h && i > 0) h.style.setProperty('--width', 800); });

    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: {
        trigger: cinema,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.35,
        onUpdate: function (self) {
          if (countEl) countEl.textContent = String(Math.min(N, 1 + Math.round(self.progress * (N - 1))));
        }
      }
    });

    for (var i = 1; i < N; i++) {
      var seg = i - 1;
      tl.fromTo(outers[i], { xPercent: 100 }, { xPercent: 0 }, seg)
        .fromTo(inners[i], { xPercent: -100 }, { xPercent: 0 }, seg)
        .fromTo(heads[i - 1], { '--width': 200, xPercent: 0 }, { '--width': 800, xPercent: 24 }, seg)
        .fromTo(heads[i], { '--width': 800, xPercent: -24 }, { '--width': 200, xPercent: 0 }, seg)
        .fromTo(imgs[i], { xPercent: 125, scaleX: 1.5, scaleY: 1.3 }, { xPercent: 0, scaleX: 1, scaleY: 1 }, seg)
        .fromTo(imgs[i - 1], { xPercent: 0, scaleX: 1, scaleY: 1 }, { xPercent: -125, scaleX: 1.5, scaleY: 1.3 }, seg);
    }
  })();

  /* ============================================================
     SMOOTH SCROLL for anchor links
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        gsap.to(window, {
          duration: 0.6,
          scrollTo: { y: target, offsetY: 80 },
          ease: 'power2.inOut'
        });
      }
    });
  });

})();
