/* ============================================================
   Cinematic Scroll-Linked Motion — GSAP + ScrollTrigger (scrub)
   - Motion progress is CONNECTED to scroll progress (scrub),
     not timed one-shot reveals.
   - Long scroll ranges + smoothing for a cinematic feel.
   - Layered parallax: hero content, image ring, badges,
     project media, about image move at different speeds.
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
    return;
  }

  document.documentElement.classList.add('js-enabled');
  gsap.registerPlugin(ScrollTrigger);

  var SCRUB = mobile ? 0.6 : 0.85;          /* smoothing */
  var HDR_Y = mobile ? 48 : 92;             /* section header travel */
  var CARD_Y = mobile ? 36 : 64;            /* card travel */

  /* ============================================================
     HERO ENTRANCE — on page load (above the fold)
     ============================================================ */
  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-top-image', { duration: mobile ? 0.6 : 1.0, opacity: 0, scale: 0.5, y: -40, filter: 'blur(10px)' })
    .from('.hero-name', { duration: mobile ? 0.6 : 0.9, opacity: 0, y: 50, scale: 0.9, filter: 'blur(8px)' }, '-=0.4')
    .from('.typing-container', { duration: mobile ? 0.5 : 0.7, opacity: 0, y: 30, scale: 0.95 }, '-=0.3')
    .from('.hero-badge', { duration: mobile ? 0.5 : 0.7, opacity: 0, y: 30, scale: 0.95 }, '-=0.2')
    .from('.hero-desc', { duration: mobile ? 0.5 : 0.7, opacity: 0, y: 30, scale: 0.95 }, '-=0.2')
    .from('.hero-buttons', { duration: mobile ? 0.5 : 0.7, opacity: 0, y: 30, scale: 0.95 }, '-=0.2')
    .from('.hero-scroll-cue', { duration: mobile ? 0.4 : 0.6, opacity: 0, y: 20 }, '-=0.2');

  /* ============================================================
     HERO SCROLL-OUT — layered scrubbed parallax
     (content, photo, ring and badge move at different speeds)
     ============================================================ */
  var heroTrigger = {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom 12%',
    scrub: SCRUB
  };

  gsap.to('.hero-content', {
    yPercent: mobile ? -10 : -22,
    opacity: 0.15,
    ease: 'none',
    scrollTrigger: heroTrigger
  });

  if (!mobile) {
    gsap.to('.hero-top-image', {
      yPercent: -14,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 12%', scrub: SCRUB }
    });
    var ring = document.querySelector('.top-img-ring');
    if (ring) {
      gsap.to(ring, {
        rotate: 45,
        scale: 1.12,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 12%', scrub: SCRUB }
      });
    }
    var badge = document.querySelector('.floating-badge');
    if (badge) {
      gsap.to(badge, {
        yPercent: 55,
        rotate: 18,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 12%', scrub: SCRUB }
      });
    }
  }

  /* scroll cue fades out quickly as motion begins */
  gsap.to(['.hero-scroll-cue', '.scroll-indicator'], {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '22% top', scrub: true }
  });

  /* ============================================================
     SECTION HEADERS — long-range scrubbed rise-in
     ============================================================ */
  document.querySelectorAll('.section-header.reveal').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: HDR_Y, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 97%',
          end: 'top 44%',
          scrub: SCRUB
        }
      }
    );
  });

  /* ============================================================
     GENERIC CARDS / BLOCKS — staggered scrubbed ranges
     (each sibling starts slightly later → cascade while scrolling)
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
        var startPct = Math.max(54, 94 - i * 6);
        var endPct = Math.max(14, startPct - 42);
        gsap.fromTo(el,
          { opacity: 0, y: CARD_Y, scale: scaleFrom },
          {
            opacity: 1,
            y: 0,
            scale: 1,
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

  scrubGroup('.about-content.reveal', 0.97);
  scrubGroup('.skills-tabs.reveal', 0.97);
  scrubGroup('.skill-category.reveal:not(.hidden)', 0.97);
  scrubGroup('.car-card.reveal', 0.95);
  scrubGroup('.stat-card.reveal', 0.93);
  scrubGroup('.premium-testimonial-card.reveal', 0.96);
  scrubGroup('.service-card.reveal', 0.95);
  scrubGroup('.price-card.reveal', 0.95);
  scrubGroup('.future-card.reveal', 0.95);
  scrubGroup('.pro-exp-card.reveal', 0.95);
  scrubGroup('.contact-info.reveal', 0.97);
  scrubGroup('.planner-box.reveal', 0.96);

  /* ============================================================
     FEATURED PROJECT CARDS — longest range
     card rises + media image scales 0.92 → 1.0 with scroll
     ============================================================ */
  document.querySelectorAll('.project-card.reveal').forEach(function (el, idx) {
    var startPct = Math.max(60, 96 - idx * 3);

    gsap.fromTo(el,
      { opacity: 0, y: CARD_Y + 24, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top ' + startPct + '%',
          end: 'center 52%',
          scrub: SCRUB
        }
      }
    );

    var img = el.querySelector('.project-image img');
    if (img) {
      gsap.fromTo(img,
        { scale: 0.92 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 100%',
            end: 'center 46%',
            scrub: SCRUB
          }
        }
      );
    }
  });

  /* ============================================================
     ABOUT IMAGE — scroll-through parallax + scale
     (drifts from -8% to +8% while passing through the section)
     ============================================================ */
  var aboutImg = document.querySelector('.about-image.reveal');
  if (aboutImg) {
    var aboutWrap = aboutImg.closest('.about-grid') || aboutImg;
    gsap.fromTo(aboutImg,
      { opacity: 0, yPercent: mobile ? 0 : -8, scale: 0.94 },
      {
        opacity: 1,
        yPercent: mobile ? 0 : 8,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: aboutWrap,
          start: 'top 92%',
          end: 'bottom 30%',
          scrub: SCRUB
        }
      }
    );
  }

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
     SMOOTH SCROLL for anchor links
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        gsap.to(window, {
          duration: 0.8,
          scrollTo: { y: target, offsetY: 80 },
          ease: 'power2.inOut'
        });
      }
    });
  });

})();
