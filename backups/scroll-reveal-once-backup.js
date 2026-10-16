/* ============================================================
   Cinematic Scroll Animations — GSAP + ScrollTrigger
   (backup of the once:true one-shot version replaced by the
    scrub-linked cinematic version)
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.innerWidth < 768;

  if (reduceMotion || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js-enabled');
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
    return;
  }

  document.documentElement.classList.add('js-enabled');
  gsap.registerPlugin(ScrollTrigger);

  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTL
    .from('.hero-top-image', {
      duration: mobile ? 0.6 : 1.0,
      opacity: 0,
      scale: 0.5,
      y: -40,
      filter: 'blur(10px)'
    })
    .from('.hero-name', {
      duration: mobile ? 0.6 : 0.9,
      opacity: 0,
      y: 50,
      scale: 0.9,
      filter: 'blur(8px)'
    }, '-=0.4')
    .from('.typing-container', {
      duration: mobile ? 0.5 : 0.7,
      opacity: 0,
      y: 30,
      scale: 0.95
    }, '-=0.3')
    .from('.hero-badge', {
      duration: mobile ? 0.5 : 0.7,
      opacity: 0,
      y: 30,
      scale: 0.95
    }, '-=0.2')
    .from('.hero-desc', {
      duration: mobile ? 0.5 : 0.7,
      opacity: 0,
      y: 30,
      scale: 0.95
    }, '-=0.2')
    .from('.hero-buttons', {
      duration: mobile ? 0.5 : 0.7,
      opacity: 0,
      y: 30,
      scale: 0.95
    }, '-=0.2')
    .from('.hero-scroll-cue', {
      duration: mobile ? 0.4 : 0.6,
      opacity: 0,
      y: 20
    }, '-=0.2');

  document.querySelectorAll('.section-header.reveal').forEach(function (el) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        gsap.to(el, {
          duration: mobile ? 0.6 : 1.0,
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          ease: 'power2.out'
        });
      }
    });
  });

  var cardSelectors = [
    '.project-card.reveal',
    '.car-card.reveal',
    '.stat-card.reveal',
    '.service-card.reveal',
    '.price-card.reveal',
    '.future-card.reveal',
    '.premium-testimonial-card.reveal',
    '.pro-exp-card.reveal',
    '.skill-category.reveal',
    '.skills-tabs.reveal',
    '.about-content.reveal',
    '.about-image.reveal',
    '.contact-info.reveal',
    '.planner-box.reveal'
  ];

  cardSelectors.forEach(function (selector) {
    var els = document.querySelectorAll(selector);
    if (els.length === 0) return;

    var parentGroups = {};
    els.forEach(function (el) {
      var p = el.parentElement;
      if (!parentGroups[p]) parentGroups[p] = [];
      parentGroups[p].push(el);
    });

    Object.keys(parentGroups).forEach(function (parent) {
      var children = parentGroups[parent];
      var firstChild = children[0];

      ScrollTrigger.create({
        trigger: firstChild,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(children, {
            duration: mobile ? 0.5 : 0.8,
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            stagger: mobile ? 0.08 : 0.15,
            ease: 'power2.out'
          });
        }
      });
    });
  });

  document.querySelectorAll('.skill-progress').forEach(function (bar) {
    var target = bar.getAttribute('data-width') || '0';
    ScrollTrigger.create({
      trigger: bar.closest('.skill-item') || bar.closest('section') || bar,
      start: 'top 90%',
      once: true,
      onEnter: function () {
        gsap.to(bar, {
          duration: mobile ? 0.6 : 1.0,
          width: target + '%',
          ease: 'power2.out'
        });
      }
    });
  });

  if (!mobile) {
    document.querySelectorAll('.hero-bg, .hero').forEach(function (el) {
      gsap.to(el, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  document.querySelectorAll('.skill-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setTimeout(function () { ScrollTrigger.refresh(); }, 60);
    });
  });

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
