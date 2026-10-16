/* ============================================================
   Cinematic Scroll-Linked Motion — GSAP + ScrollTrigger (scrub)
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

  var SCRUB = mobile ? 1.2 : 1.8;          /* Heavy smoothing = slow-motion cinematic trail */
  var HDR_Y = mobile ? 110 : 200;          /* Dramatic header travel */
  var CARD_Y = mobile ? 90 : 140;          /* Dramatic card travel */
  var HDR_BLUR = mobile ? 10 : 16;         /* Deep blur for slow-motion focus pull */
  var CARD_BLUR = mobile ? 9 : 14;

  /* ============================================================
     HERO ENTRANCE — on page load (above the fold)
     Enhanced with glow and blur
     ============================================================ */
  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-top-image', { duration: mobile ? 0.8 : 1.4, opacity: 0, scale: 0.4, y: -60, filter: 'blur(20px)' })
    .from('.hero-name', { duration: mobile ? 0.7 : 1.2, opacity: 0, y: 70, scale: 0.85, filter: 'blur(16px)' }, '-=0.5')
    .from('.typing-container', { duration: mobile ? 0.6 : 1.0, opacity: 0, y: 50, scale: 0.9, filter: 'blur(12px)' }, '-=0.4')
    .from('.hero-badge', { duration: mobile ? 0.6 : 1.0, opacity: 0, y: 50, scale: 0.9, filter: 'blur(12px)' }, '-=0.3')
    .from('.hero-desc', { duration: mobile ? 0.6 : 1.0, opacity: 0, y: 50, scale: 0.9, filter: 'blur(12px)' }, '-=0.3')
    .from('.hero-buttons', { duration: mobile ? 0.6 : 1.0, opacity: 0, y: 50, scale: 0.9, filter: 'blur(12px)' }, '-=0.3')
    .from('.hero-scroll-cue', { duration: mobile ? 0.5 : 0.8, opacity: 0, y: 30, filter: 'blur(8px)' }, '-=0.3');

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
     SECTION HEADERS — long-range scrubbed rise-in
     Enhanced with blur for slow-motion effect
     ============================================================ */
  document.querySelectorAll('.section-header.reveal').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: HDR_Y, scale: 0.95, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 100%',
          end: 'top 40%',
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
        var startPct = Math.max(50, 96 - i * 7);
        var endPct = Math.max(10, startPct - 48);
        gsap.fromTo(el,
          { opacity: 0, y: CARD_Y, scale: scaleFrom, filter: 'blur(6px)' },
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

  scrubGroup('.about-content.reveal', 0.95);
  scrubGroup('.skills-tabs.reveal', 0.95);
  scrubGroup('.skill-category.reveal', 0.95);
  scrubGroup('.car-card.reveal', 0.92);
  scrubGroup('.stat-card.reveal', 0.90);
  scrubGroup('.premium-testimonial-card.reveal', 0.93);
  scrubGroup('.service-card.reveal', 0.92);
  scrubGroup('.price-card.reveal', 0.92);
  scrubGroup('.future-card.reveal', 0.92);
  scrubGroup('.pro-exp-card.reveal', 0.92);
  scrubGroup('.contact-info.reveal', 0.95);
  scrubGroup('.planner-box.reveal', 0.93);

  /* ============================================================
     FEATURED PROJECT CARDS — longest range
     Enhanced with image scale and blur
     ============================================================ */
  document.querySelectorAll('.project-card.reveal').forEach(function (el, idx) {
    var startPct = Math.max(55, 96 - idx * 4);

    gsap.fromTo(el,
      { opacity: 0, y: CARD_Y + 32, scale: 0.92, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top ' + startPct + '%',
          end: 'center 48%',
          scrub: SCRUB
        }
      }
    );

    var img = el.querySelector('.project-image img');
    if (img) {
      gsap.fromTo(img,
        { scale: 0.88, filter: 'blur(4px)' },
        {
          scale: 1,
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 110%',
            end: 'center 42%',
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
      { opacity: 0, yPercent: mobile ? 0 : -12, scale: 0.90, filter: 'blur(8px)' },
      {
        opacity: 1,
        yPercent: mobile ? 0 : 12,
        scale: 1,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: {
          trigger: aboutWrap,
          start: 'top 95%',
          end: 'bottom 25%',
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
          start: 'top 95%',
          end: 'top 48%',
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
