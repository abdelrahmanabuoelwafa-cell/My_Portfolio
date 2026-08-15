// Neon Cursor Follower with glowing trail and smooth ring lerp
(function() {
  var canvas = document.createElement('canvas');
  canvas.id = 'neon-cursor-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var particles = [];
  var mouse = { x: -100, y: -100 };
  var ring = { x: -100, y: -100 };
  var dot = { x: -100, y: -100 };
  var colors = ['#A855F7', '#C084FC', '#E9D5FF', '#9333EA'];
  var rafId = null;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    for (var i = 0; i < 2; i++) {
      particles.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        alpha: 0.9,
        size: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    if (rafId === null && !reducedMotion) rafId = requestAnimationFrame(render);
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dot.x += (mouse.x - dot.x) * 0.4;
    dot.y += (mouse.y - dot.y) * 0.4;
    ring.x += (mouse.x - ring.x) * 0.15;
    ring.y += (mouse.y - ring.y) * 0.15;

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      p.size *= 0.96;

      if (p.alpha <= 0 || p.size <= 0.2) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (mouse.x >= 0 && mouse.y >= 0) {
      // Outer Neon Ring
      ctx.save();
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#A855F7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner Glowing Dot
      ctx.save();
      ctx.fillStyle = '#F8FAFC';
      ctx.shadowColor = '#C084FC';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var settled = particles.length === 0 &&
      Math.abs(dot.x - mouse.x) < 1 && Math.abs(dot.y - mouse.y) < 1 &&
      Math.abs(ring.x - mouse.x) < 1 && Math.abs(ring.y - mouse.y) < 1;
    if (settled) {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    rafId = requestAnimationFrame(render);
  }

  if (!reducedMotion) {
    render();
  }
})();
