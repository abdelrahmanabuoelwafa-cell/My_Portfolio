/**
 * Vanilla JS Neon Border (Originkit Migration)
 * Author: Antigravity AI
 * Pure JavaScript equivalent of the React NeonBorder component.
 * Animates a conic-gradient glowing border with custom mask exclusion layers.
 */

(function () {
  const EDGE_COPIES = 2;
  const GLOW_LAYERS = [
    { blur: 8, opacity: 0.5, reach: 0.3 },
    { blur: 15, opacity: 0.3, reach: 0.6 },
    { blur: 57, opacity: 0.18, reach: 1 },
  ];
  const MAX_GLOW_BLUR = 57;
  const MAX_GLOW_REACH = 36;

  const SLOWEST_CYCLE = 30;
  const FASTEST_CYCLE = 4;
  const SLOWEST_STEP = 3;
  const FASTEST_STEP = 0.35;
  const STEP_EASE = [0.72, 0.16, 0.18, 1.05];
  const GLIDE_EASE = [0.65, 0, 0.35, 1];

  function withAlpha(input, alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    if (typeof input !== "string") return `rgba(0,0,0,${a})`;
    const s = input.trim();

    const hex = s.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) {
        h = h.split("").map((c) => c + c).join("");
      }
      const n = parseInt(h.slice(0, 6), 16);
      if (!Number.isFinite(n)) return `rgba(0,0,0,${a})`;
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    const rgb = s.match(/^rgba?\(([^)]+)\)/i);
    if (rgb) {
      const parts = rgb[1].split(",").map((v) => parseFloat(v));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
      }
    }
    return `rgba(0,0,0,${a})`;
  }

  function perimeterPoint(u, w, h) {
    const d = (((u % 1) + 1) % 1) * 2 * (w + h);
    if (d < w) return [d, 0];
    if (d < w + h) return [w, d - w];
    if (d < w * 2 + h) return [w - (d - w - h), h];
    return [0, h - (d - w * 2 - h)];
  }

  function cornerLap(k, w, h) {
    const p = 2 * (w + h);
    const at = [0, w / p, (w + h) / p, (w * 2 + h) / p];
    return Math.floor(k / 4) + at[((k % 4) + 4) % 4];
  }

  function perimeterAngle(u, w, h) {
    const [x, y] = perimeterPoint(u, w, h);
    return (Math.atan2(x - w / 2, h / 2 - y) * 180) / Math.PI;
  }

  const ARC_SAMPLES = 24;
  const MIN_ARC = 0.015;

  function buildArc(lap, lengthPct, w, h, color) {
    const fw = w > 0 ? w : 100;
    const fh = h > 0 ? h : 100;

    const len = Math.max(0, Math.min(100, lengthPct));
    const span = Math.max(MIN_ARC, (len / 100) * 0.5);
    const solidT = len / 100;

    const stops = [];
    let base = 0;
    let prev = 0;
    let acc = 0;

    for (let i = 0; i <= ARC_SAMPLES; i++) {
      const f = i / ARC_SAMPLES;
      const angle = perimeterAngle(lap + (f - 0.5) * span, fw, fh);
      if (i === 0) {
        base = angle;
      } else {
        let d = angle - prev;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        acc += d;
      }
      prev = angle;

      const t = Math.abs(f - 0.5) * 2;
      const k = solidT >= 1 ? 1 : t <= solidT ? 1 : 1 - (t - solidT) / (1 - solidT);
      stops.push(`${withAlpha(color, k * k * (3 - 2 * k))} ${acc.toFixed(2)}deg`);
    }

    const end = acc.toFixed(2);
    stops.push(`${withAlpha(color, 0)} ${end}deg`);
    stops.push(`${withAlpha(color, 0)} 360deg`);

    return `conic-gradient(from ${base.toFixed(2)}deg at 50% 50%, ${stops.join(", ")})`;
  }

  function makeEaseFn(pts) {
    const [x1, y1, x2, y2] = pts;
    if (x1 === y1 && x2 === y2) return (t) => t;
    const bez = (a, b, t) => {
      const u = 1 - t;
      return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
    };
    return (t) => {
      const x = Math.max(0, Math.min(1, t));
      let s = x;
      for (let i = 0; i < 8; i++) {
        const cx = bez(x1, x2, s) - x;
        const u = 1 - s;
        const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2);
        if (Math.abs(dx) < 1e-6) break;
        s -= cx / dx;
        s = Math.max(0, Math.min(1, s));
      }
      return bez(y1, y2, s);
    };
  }

  const stepEase = makeEaseFn(STEP_EASE);
  const glideEase = makeEaseFn(GLIDE_EASE);

  class VanillaNeonBorder {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        color: options.color || "#A855F7",
        rounded: options.rounded !== undefined ? options.rounded : 100, // Default perfect circle (100)
        thickness: options.thickness || 4,
        borderSize: options.borderSize || 50,
        glow: options.glow !== undefined ? options.glow : 100,
        movement: options.movement || "continuous",
        speed: options.speed || 16,
      };

      this.width = 0;
      this.height = 0;
      this.raf = null;
      this.ro = null;
      this.groupA = null;
      this.groupB = null;

      this.init();
    }

    init() {
      // Create root wrapper inside target
      this.root = document.createElement("div");
      this.root.className = "vanilla-neon-border-root";
      this.root.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: visible;
      `;
      this.element.appendChild(this.root);

      // Measure using ResizeObserver
      this.ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const rect = entry.contentRect;
          const w = rect.width || this.element.offsetWidth;
          const h = rect.height || this.element.offsetHeight;
          if (w === this.width && h === this.height) continue;
          this.width = w;
          this.height = h;
          this.rebuild();
        }
      });
      this.ro.observe(this.element);

      // Trigger first layout calculation if observer delays
      this.width = this.element.offsetWidth;
      this.height = this.element.offsetHeight;
      this.rebuild();

      // Start loop
      this.startLoop();
    }

    rebuild() {
      this.root.innerHTML = "";
      const radius = (Math.max(0, Math.min(100, this.options.rounded)) / 100) * (Math.min(this.width, this.height) / 2);
      this.root.style.borderRadius = `${radius}px`;

      this.groupA = this.createGlowGroup(0, radius);
      this.groupB = this.createGlowGroup(0.5, radius);

      this.root.appendChild(this.groupA);
      this.root.appendChild(this.groupB);
    }

    createGlowGroup(start, radius) {
      const groupDiv = document.createElement("div");
      groupDiv.style.cssText = `
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
      `;
      
      const thick = Math.max(1, Math.min(10, this.options.thickness));
      const amount = Math.max(0, Math.min(100, this.options.glow)) / 100;
      const ringAt = (share) => thick + amount * MAX_GLOW_REACH * share;
      const glowOuter = 10 + MAX_GLOW_REACH + MAX_GLOW_BLUR * 2;

      const band = (r, offset = 0) => {
        const div = document.createElement("div");
        div.className = "neon-border-band";
        div.style.cssText = `
          position: absolute;
          inset: ${offset - r}px;
          box-sizing: border-box;
          padding: ${r}px;
          border-radius: ${radius > 0 ? radius + r : 0}px;
          background: var(--arc);
          -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
          -webkit-mask-clip: content-box, border-box;
          -webkit-mask-composite: xor;
          mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
          mask-clip: content-box, border-box;
          mask-composite: exclude;
        `;
        return div;
      };

      const glowLayer = (r, blurPx, opacity) => {
        const div = document.createElement("div");
        div.style.cssText = `
          position: absolute;
          inset: -${glowOuter}px;
          box-sizing: border-box;
          padding: ${glowOuter}px;
          border-radius: ${radius > 0 ? radius + glowOuter : 0}px;
          opacity: ${opacity};
          mix-blend-mode: plus-lighter;
          filter: ${blurPx ? `blur(${blurPx.toFixed(1)}px)` : "none"};
          -webkit-filter: ${blurPx ? `blur(${blurPx.toFixed(1)}px)` : "none"};
          -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
          -webkit-mask-clip: content-box, border-box;
          -webkit-mask-composite: xor;
          mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
          mask-clip: content-box, border-box;
          mask-composite: exclude;
        `;
        div.appendChild(band(r, glowOuter));
        return div;
      };

      // Add Glow Layers
      if (amount > 0) {
        GLOW_LAYERS.forEach((l) => {
          groupDiv.appendChild(glowLayer(ringAt(l.reach), l.blur, l.opacity));
        });
      }

      // Add Edge Copies (Edge Strokes)
      for (let i = 0; i < EDGE_COPIES; i++) {
        const edgeWrapper = document.createElement("div");
        edgeWrapper.style.cssText = `
          position: absolute;
          inset: 0;
          mix-blend-mode: plus-lighter;
        `;
        edgeWrapper.appendChild(band(thick));
        groupDiv.appendChild(edgeWrapper);
      }

      return groupDiv;
    }

    startLoop() {
      let last = performance.now();
      let lap = 0;
      let corner = 0;
      let stepT = 0;

      const frame = (now) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;

        const s = Math.max(0, Math.min(20, this.options.speed));
        if (s > 0) {
          const step = this.options.movement === "step";
          const beat = step
            ? SLOWEST_STEP + ((FASTEST_STEP - SLOWEST_STEP) * (s - 1)) / 19
            : (SLOWEST_CYCLE + ((FASTEST_CYCLE - SLOWEST_CYCLE) * (s - 1)) / 19) / 4;

          stepT += dt / beat;
          while (stepT >= 1) {
            stepT -= 1;
            corner += 1;
          }
          const eased = step ? stepEase(Math.min(1, stepT * 2)) : glideEase(stepT);

          const w = this.width;
          const h = this.height;
          const fw = w > 0 ? w : 100;
          const fh = h > 0 ? h : 100;
          const from = cornerLap(corner, fw, fh);
          const to = cornerLap(corner + 1, fw, fh);
          lap = from + (to - from) * eased;

          if (this.groupA) {
            this.groupA.style.setProperty(
              "--arc",
              buildArc(lap, this.options.borderSize, w, h, this.options.color)
            );
          }
          if (this.groupB) {
            this.groupB.style.setProperty(
              "--arc",
              buildArc(lap + 0.5, this.options.borderSize, w, h, this.options.color)
            );
          }
        }

        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
    }
  }

  // Export to global scope
  window.VanillaNeonBorder = VanillaNeonBorder;
})();
