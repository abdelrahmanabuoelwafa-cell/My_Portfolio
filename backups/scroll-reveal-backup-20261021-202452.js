/* ============================================================
   Cinematic Scroll-Linked Motion — GSAP + ScrollTrigger (scrub)
   - Content DESCENDS from above into place (cinematic sky-fall),
   - Motion progress is CONNECTED to scroll progress (scrub),
     not timed one-shot reveals.
   - Long scroll ranges + SMOOTHING for a cinematic feel.
   - Layered parallax: hero content, image ring, badges,
     project media, about image move at different speeds.
   - Enhanced slow-motion reveals with blur and scale
   - prefers-reduced-motion / no GSAP / no JS: content visible.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.innerWidth < 768;

  /* ---- No GSAP or reduced motion: show everything ---- */
  if (reduceMotion || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js-enabled');
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.querySelectorAll('.skill-progress[data-width]').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
    return;
  }

  document.documentElement.classList.add('js-enabled');
  gsap.registerPlugin(ScrollTrigger);

  var SCRUB = mobile ? 0.5 : 0.7;          /* Lighter smoothing for better performance */
  var HDR_Y = mobile ? 80 : 120;           /* Reduced header travel */
  var CARD_Y = mobile ? 60 : 100;          /* Reduced card travel */
  var HDR_BLUR = mobile ? 8 : 12;          /* Lighter blur */
  var CARD_BLUR = mobile ? 6 : 10;

  /* ============================================================
     HERO ENTRANCE — on page load (above the fold)
     Enhanced with glow and blur
     ============================================================ */
  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-top-image', { duration: mobile ? 0.5 : 0.8, opacity: 0, scale: 0.6, y: -30, filter: 'blur(8px)' })
    .from('.hero-name', { duration: mobile ? 0.4 : 0.7, opacity: 0, y: -35, scale: 0.95, filter: 'blur(6px)' }, '-=0.3')
    .from('.typing-container', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: -25, scale: 0.95, filter: 'blur(5px)' }, '-=0.2')
    .from('.hero-badge', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: -25, scale: 0.95, filter: 'blur(5px)' }, '-=0.2')
    .from('.hero-desc', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: -25, scale: 0.95, filter: 'blur(5px)' }, '-=0.2')
    .from('.hero-buttons', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: -25, scale: 0.95, filter: 'blur(5px)' }, '-=0.2')
    .from('.hero-scroll-cue', { duration: mobile ? 0.3 : 0.5, opacity: 0, y: -12, filter: 'blur(4px)' }, '-=0.2');

  /* ============================================================
     HERO SCROLL-OUT — layered scrubbed parallax
     Enhanced with longer ranges and smoother motion
     ============================================================ */
  var heroTrigger = {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom 8%',
    scrub: SCRUB
  };

  gsap.to('.hero-content', {
    yPercent: mobile ? -22 : -45,
    opacity: 0,
    scale: 0.9,
    ease: 'none',
    scrollTrigger: heroTrigger
  });

  if (!mobile) {
    gsap.to('.hero-top-image', {
      yPercent: -38,
      scale: 1.15,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 8%', scrub: SCRUB }
    });
    var ring = document.querySelector('.top-img-ring');
    if (ring) {
      gsap.to(ring, {
        rotate: 120,
        scale: 1.45,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 8%', scrub: SCRUB }
      });
    }
    var badge = document.querySelector('.floating-badge');
    if (badge) {
      gsap.to(badge, {
        yPercent: 130,
        rotate: 40,
        scale: 1.15,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 8%', scrub: SCRUB }
      });
    }
  }

  /* scroll cue fades out slowly */
  gsap.to(['.hero-scroll-cue', '.scroll-indicator'], {
    opacity: 0,
    scale: 0.8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '25% top', scrub: true }
  });

  /* ============================================================
     SECTION HEADERS — lightweight scrubbed rise-in
     Reduced blur and range for better performance
     ============================================================ */
  document.querySelectorAll('.section-header.reveal').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: -HDR_Y * 0.5, scale: 0.96, filter: 'blur(' + HDR_BLUR * 0.5 + 'px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 120%',
          end: 'top 15%',
          scrub: SCRUB
        }
      }
    );
  });

  /* ============================================================
     GENERIC CARDS / BLOCKS — staggered scrubbed ranges
     Enhanced with blur and scale for dramatic reveals
     ============================================================ */
  function scrubGroup(selector, scaleFrom) {
    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;

    var groups = {};
    els.forEach(function (el) {
      var key = el.parentElement;
      if (!groups[key]) groups[key] = { parent: key, items: [] };
      groups[key].items.push(el);
    });

    Object.keys(groups).forEach(function (k) {
      groups[k].items.forEach(function (el, i) {
        var startPct = Math.max(55, 98 - i * 6);
        var endPct = Math.max(8, startPct - 80);
        gsap.fromTo(el,
          { opacity: 0, y: -CARD_Y * 0.6, scale: scaleFrom, filter: 'blur(' + CARD_BLUR * 0.5 + 'px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top ' + startPct + '%',
              end: 'top ' + endPct + '%',
              scrub: SCRUB
            }
          }
        );
      });
    });
  }

  scrubGroup('.about-content.reveal', 0.90);
  scrubGroup('.skills-tabs.reveal', 0.92);
  scrubGroup('.skill-category.reveal', 0.92);
  scrubGroup('.car-card.reveal', 0.86);
  scrubGroup('.stat-card.reveal', 0.85);
  scrubGroup('.premium-testimonial-card.reveal', 0.88);
  scrubGroup('.service-card.reveal', 0.86);
  scrubGroup('.price-card.reveal', 0.86);
  scrubGroup('.future-card.reveal', 0.86);
  scrubGroup('.pro-exp-card.reveal', 0.86);
  scrubGroup('.contact-info.reveal', 0.90);
  scrubGroup('.planner-box.reveal', 0.88);

  /* ============================================================
     FEATURED PROJECT CARDS — longest range
     Enhanced with image scale and blur
     ============================================================ */
  document.querySelectorAll('.project-card.reveal').forEach(function (el, idx) {
    var startPct = Math.max(55, 98 - idx * 4);

    gsap.fromTo(el,
      { opacity: 0, y: -(CARD_Y + 40), scale: 0.85, filter: 'blur(16px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top ' + startPct + '%',
          end: 'center 35%',
          scrub: SCRUB
        }
      }
    );

    var img = el.querySelector('.project-image img');
    if (img) {
      gsap.fromTo(img,
        { scale: 0.72, filter: 'blur(10px)' },
        {
          scale: 1,
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 120%',
            end: 'center 30%',
            scrub: SCRUB
          }
        }
      );
    }
  });

  /* ============================================================
     ABOUT IMAGE — scroll-through parallax + scale
     Enhanced with longer range and blur
     ============================================================ */
  var aboutImg = document.querySelector('.about-image.reveal');
  if (aboutImg) {
    var aboutWrap = aboutImg.closest('.about-grid') || aboutImg;
    gsap.fromTo(aboutImg,
      { opacity: 0, yPercent: mobile ? 0 : -24, scale: 0.84, filter: 'blur(14px)' },
      {
        opacity: 1,
        yPercent: mobile ? 0 : 18,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: aboutWrap,
          start: 'top 105%',
          end: 'bottom 15%',
          scrub: SCRUB
        }
      }
    );
  }

  /* ============================================================
     SKILL PROGRESS BARS — width fills gradually with scroll
     Enhanced with longer range
     ============================================================ */
  document.querySelectorAll('.skill-progress[data-width]').forEach(function (bar) {
    var target = bar.getAttribute('data-width') || '0';
    var host = bar.closest('.skill-item') || bar.closest('.skill-category') || bar;
    gsap.fromTo(bar,
      { width: '0%' },
      {
        width: target + '%',
        ease: 'none',
        scrollTrigger: {
          trigger: host,
          start: 'top 100%',
          end: 'top 40%',
          scrub: SCRUB
        }
      }
    );
  });

  /* ============================================================
     SKILL TABS — refresh triggers when a panel is shown/hidden
     ============================================================ */
  document.querySelectorAll('.skill-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setTimeout(function () { ScrollTrigger.refresh(); }, 80);
    });
  });

  /* Recalculate positions once everything (images/fonts) is loaded */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ============================================================
     IDLE BREATHING — slow continuous motion so the page feels
     alive even when the user is not scrolling
     ============================================================ */
  if (!mobile) {
    gsap.to('.hero-scroll-cue', { y: 14, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.top-img-container', { scale: 1.035, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.hero-badge', { y: 8, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.4 });
  }


  /* ============================================================
     SERVICES CINEMA — slide-wipe sequence (GSAP demo style)
     Scroll-linked via sticky stage + scrub timeline.
     Desktop only; mobile / reduced-motion keep stacked fallback.
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
        scrub: 0.8,
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

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
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
          duration: 1.0,
          scrollTo: { y: target, offsetY: 80 },
          ease: 'power2.inOut'
        });
      }
    });
  });

})();
