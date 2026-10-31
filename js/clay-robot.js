/* eslint-disable */
// Clay Robot — Originkit (Full Port with Transparent Alpha & Corner Footer Wandering)

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.createClayRobot = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const REF_W = 1200;
  const REF_H = 900;
  const REF_ASPECT = REF_W / REF_H;

  const DEFAULT_COLORS = {
    clay: "#B5A1FF",
    visor: "#0A0814",
    eyes: "#00F5FF",
  };

  const DEFAULT_RESPONSE = {
    track: "page",
    headTurn: 7,
    eyeTravel: 6,
    followSpeed: 6,
    hop: 6,
  };

  const DEFAULT_ADVANCED = {
    cameraDistance: 30,
    sunAngle: 90,
    sunElevation: 25,
    sunStrength: 1,
    skyStrength: 1,
    shadowSoftness: 6,
    occlusion: 1,
    eyeGlow: 2.5,
    gradientCurve: 1.3,
  };

  const DEFAULTS = {
    walk: true,
    walkSpeed: 5,
    wave: true,
    scale: 100,
    animate: false,
    delay: 0.2,
    glance: 5,
    blink: true,
  };

  const CAM_Y = 3.33;
  const FRAME_UNITS = REF_H / 100;
  const ROLL_CY = 2.95 - CAM_Y;
  const HEAD_Y = 4.08;
  const PIVOT_Y = 2.55;
  const LOOK_Z = 7;
  const BODY_SHARE = 0.28;
  const HEAD_ROLL = -0.16;
  const EYE_X = 0.62;
  const EYE_UP = 0.46;
  const EYE_DOWN = 0.2;
  const BLINK_S = 0.17;
  const HOP_CROUCH = 0.09;
  const HOP_AIR = 0.46;
  const LAND_S = 0.55;
  const JOY_S = 0.95;
  const DROP_S = 0.62;
  const DROP_FROM = 9.5;
  const STRIDE = 0.62;
  const STEP_LIFT = 0.17;
  const WADDLE = 0.075;
  const BOB = 0.05;
  const ARM_SWING = 0.5;
  const WALK_TURN = 0.5;
  const WALK_MARGIN = 3.05;
  const WALK_START = 0.6;
  const ARM_REST = 0.28;
  const WAVE_UP = 0.35;
  const WAVE_HOLD = 1.5;
  const WAVE_DOWN = 0.4;
  const WAVE_RAISE = 2.0;
  const WAVE_SWAY = 0.3;
  const WAVE_HZ = 2.3;

  const SKY = [0.456, 0.52, 0.541];
  const SKY_UP = [0.03, 0.019, 0.011];
  const SKY_SIDE = [0.01, 0.052, 0.081];
  const SKY_AWAY = [-0.151, -0.124, -0.087];
  const SUN = [0.293, 0.227, 0.17];

  const DPR_CAP = 2;
  const PIXEL_BUDGET = 2.6e6;
  const LEVELS = [1, 0.85, 0.72, 0.6];

  const colorCache = new Map();

  function toRGB(input, fallback) {
    const key = input || fallback;
    const hit = colorCache.get(key);
    if (hit) return hit;
    let s = String(key).trim();
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
    let out = null;
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4)
        h = h.slice(0, 3).split("").map((c) => c + c).join("");
      out = [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    } else {
      const m = /rgba?\(([^)]+)\)/i.exec(s);
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
        if (p.length >= 3) out = [p[0] / 255, p[1] / 255, p[2] / 255];
      }
    }
    if (!out) out = key === fallback ? [0.5, 0.5, 0.5] : toRGB(fallback, fallback);
    colorCache.set(key, out);
    return out;
  }

  const lin = (c) => Math.pow(c, 2.2);
  const CLAY_LIN = [0xee, 0xef, 0xeb].map((c) => lin(c / 255));

  const VERT = `#version 300 es
  in vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  // Fragment Shader from Originkit — with transparent background alpha
  const FRAG = `#version 300 es
  precision highp float;
  precision highp int;

  uniform vec2 uRes;
  uniform float uS;
  uniform vec2 uOff;
  uniform vec2 uRoll;
  uniform float uD;
  uniform mat3 uW2S;
  uniform float uScale;
  uniform float uHop;
  uniform vec2 uSq;
  uniform mat3 uBody;
  uniform mat3 uHead;
  uniform vec4 uEye;
  uniform vec3 uBoxMin;
  uniform vec3 uBoxMax;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uSky;
  uniform vec3 uSkyUp;
  uniform vec3 uSkySide;
  uniform vec3 uSkyAway;
  uniform float uSoft;
  uniform float uAO;
  uniform vec3 uShadowCol;
  uniform float uShDepth;
  uniform vec3 uClay;
  uniform vec3 uVisor;
  uniform vec3 uEyeCol;
  uniform float uGlow;
  uniform float uWalkX;
  uniform vec2 uFeet;
  uniform vec4 uArms;
  uniform vec2 uArmExt;
  uniform vec4 uBodyBox;
  uniform int uSamples;

  out vec4 fragColor;

  #define CAM_Y ${CAM_Y.toFixed(3)}
  #define FRAME_UNITS ${FRAME_UNITS.toFixed(3)}
  #define ROLL_CY ${ROLL_CY.toFixed(3)}
  #define HEAD_C vec3(0.0, ${HEAD_Y.toFixed(3)}, 0.0)
  #define PIVOT vec3(0.0, ${PIVOT_Y.toFixed(3)}, 0.0)

  float smin(float a, float b, float k) {
      float h = max(k - abs(a - b), 0.0) / k;
      return min(a, b) - h * h * k * 0.25;
  }
  float smax(float a, float b, float k) { return -smin(-a, -b, k); }

  float sdRR(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdSlab(vec3 p, vec2 b, float rc, float hz, float re) {
      float d = sdRR(p.xy, b, rc);
      vec2 w = vec2(d + re, abs(p.z) - hz + re);
      return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - re;
  }
  float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  float sdRBox(vec3 p, vec3 b, float r) {
      vec3 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
  }
  float sdEll(vec3 p, vec3 r) {
      float k0 = length(p / r);
      float k1 = length(p / (r * r));
      return k0 * (k0 - 1.0) / k1;
  }
  float sdCap(vec3 p, vec3 a, vec3 b, float r) {
      vec3 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h) - r;
  }
  float sdArc(vec2 p, vec2 sc, float ra, float rb) {
      p.x = abs(p.x);
      return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
  }
  float sdEll2(vec2 p, vec2 r) {
      float k0 = length(p / r);
      float k1 = max(length(p / (r * r)), 1e-4);
      return k0 * (k0 - 1.0) / k1;
  }
  float extrude(float d2, float z, float hz, float re) {
      vec2 w = vec2(d2 + re, abs(z) - hz + re);
      return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - re;
  }

  vec2 head(vec3 p, bool fine) {
      float sh = extrude(sdEll2(p.xy, vec2(2.5, 2.3)), p.z, 0.95, 0.8);
      vec2 v = p.xy - vec2(0.0, -0.1);
      sh = smax(sh, -extrude(sdEll2(v, vec2(2.02, 1.8)), p.z - 0.95, 0.3, 0.05), 0.16);

      vec3 e = vec3(abs(p.x) - 2.6, p.y, p.z + 0.05);
      vec2 we = vec2(length(e.yz) - 0.42, abs(e.x) - 0.06);
      float ear = min(max(we.x, we.y), 0.0) + length(max(we, 0.0)) - 0.2;
      sh = smin(sh, ear, 0.05);
      if (!fine) return vec2(sh, 1.0);

      vec2 n = v / vec2(1.98, 1.76);
      float sz = p.z - 0.62 + 0.12 * dot(n, n);
      float scr = extrude(sdEll2(v, vec2(1.98, 1.76)), sz, 0.34, 0.17) * 0.9;
      return sh < scr ? vec2(sh, 1.0) : vec2(scr, 2.0);
  }

  #define SHOULDER vec3(1.017, 1.62, 0.05)

  float body(vec3 p) {
      float lift = mix(uFeet.x, uFeet.y, smoothstep(-0.3, 0.3, p.x));
      vec3 q = p;
      q.y -= lift * (1.0 - smoothstep(0.0, 1.0, q.y));
      float d = sdRBox(q - vec3(0.0, 1.05, 0.0), vec3(0.99, 1.05, 0.72), 0.5);
      vec2 ta = vec2(abs(q.x), q.y + 0.06);
      float tri = max(dot(ta, vec2(0.33, 0.944)) - 0.3 * 0.944, -ta.y);
      d = smax(d, -max(tri, abs(q.z) - 1.4), 0.17);
      d *= 1.0 - 1.1 * max(uFeet.x, uFeet.y);

      vec2 arm = p.x > 0.0 ? uArms.zw : uArms.xy;
      float ext = p.x > 0.0 ? uArmExt.y : uArmExt.x;
      vec3 a = p;
      a.x = abs(a.x);
      a -= SHOULDER;
      float c1 = cos(arm.y), s1 = sin(arm.y);
      a.yz = mat2(c1, s1, -s1, c1) * a.yz;
      float c2 = cos(arm.x), s2 = sin(arm.x);
      a.xy = vec2(a.x * c2 + a.y * s2, -a.x * s2 + a.y * c2);
      a.y += 0.3 + 0.5 * ext;
      return smin(d, sdEll(a, vec3(0.24 - 0.03 * ext, 0.37 + 0.5 * ext, 0.25 - 0.03 * ext)), 0.06);
  }

  vec3 toBody(vec3 ps) {
      vec3 pr = ps;
      pr.x -= uWalkX;
      pr.y -= uHop;
      pr /= vec3(uSq.x, uSq.y, uSq.x);
      return uBody * pr;
  }
  vec3 toHead(vec3 pr) { return uHead * (pr - PIVOT) + PIVOT - HEAD_C; }

  #define HEAD_B vec3(2.9, 2.32, 1.0)
  #define BODY_C vec3(0.0, uBodyBox.x, 0.0)
  #define BODY_B uBodyBox.yzw
  #define REACH 1.5

  vec2 sceneD(vec3 ps, bool fine) {
      float kq = min(uSq.x, uSq.y);
      vec3 pr = toBody(ps);
      vec3 ph = toHead(pr);
      float bh = sdBox(ph, HEAD_B) * kq;
      float bb = sdBox(pr - BODY_C, BODY_B) * kq;
      float far = min(bh, bb);
      if (far > REACH) return vec2(far, 1.0);
      vec2 res = vec2(1e5, 1.0);
      if (bh < bb) {
          res = head(ph, fine);
          res.x *= kq;
          if (bb < res.x) {
              float d = body(pr) * kq;
              if (d < res.x) res = vec2(d, 1.0);
          }
      } else {
          res = vec2(body(pr) * kq, 1.0);
          if (bh < res.x) {
              vec2 h = head(ph, fine);
              h.x *= kq;
              if (h.x < res.x) res = h;
          }
      }
      return res;
  }

  float mapD(vec3 p) { return sceneD(uW2S * p, true).x * uScale; }
  float mapC(vec3 p) { return sceneD(uW2S * p, false).x * uScale; }

  vec3 calcN(vec3 p, float d0, float e) {
      return normalize(vec3(
          mapD(p + vec3(e, 0.0, 0.0)),
          mapD(p + vec3(0.0, e, 0.0)),
          mapD(p + vec3(0.0, 0.0, e))) - d0);
  }

  vec2 boxT(vec3 ro, vec3 rd) {
      vec3 o = uW2S * ro;
      vec3 d = uW2S * rd;
      vec3 inv = 1.0 / d;
      vec3 t0 = (uBoxMin - o) * inv;
      vec3 t1 = (uBoxMax - o) * inv;
      vec3 lo = min(t0, t1), hi = max(t0, t1);
      return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
  }

  vec2 slab(vec3 o, vec3 d, vec3 c, vec3 b) {
      vec3 inv = 1.0 / d;
      vec3 t0 = (c - b - o) * inv;
      vec3 t1 = (c + b - o) * inv;
      vec3 lo = min(t0, t1), hi = max(t0, t1);
      return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
  }
  vec2 spanWith(vec2 s, vec2 b) {
      return b.y > max(b.x, 0.0) ? vec2(min(s.x, b.x), max(s.y, b.y)) : s;
  }

  float softShadow(vec3 ro, vec3 rd) {
      vec2 bt = boxT(ro, rd);
      if (bt.y <= max(bt.x, 0.0)) return 1.0;
      float t = max(bt.x, 0.03 * uScale);
      float res = 1.0;
      for (int i = 0; i < 20; i++) {
          float h = mapC(ro + rd * t);
          res = min(res, uSoft * h / t);
          t += clamp(h, 0.04 * uScale, 0.8 * uScale);
          if (res < 0.003 || t > bt.y) break;
      }
      res = clamp(res, 0.0, 1.0);
      return res * res * (3.0 - 2.0 * res);
  }

  float calcAO(vec3 p, vec3 n) {
      float occ = 0.0, sc = 1.0;
      for (int i = 0; i < 5; i++) {
          float h = (0.03 + 0.14 * float(i)) * uScale;
          occ += (h - mapD(p + n * h)) * sc;
          sc *= 0.72;
      }
      return mix(0.3, 1.0, clamp(1.0 - uAO * 1.5 * occ / uScale, 0.0, 1.0));
  }

  float skyVis(vec3 p, vec3 n) {
      vec3 dir = normalize(n + vec3(0.0, 1.0, 0.0));
      float occ = 0.0;
      for (int i = 0; i < 3; i++) {
          float h = (0.4 + 0.5 * float(i)) * uScale;
          occ += clamp(1.0 - mapC(p + dir * h) / h, 0.0, 1.0);
      }
      return 1.0 - uAO * 0.5 * occ / 3.0;
  }

  float eyeSD(vec2 p) {
      vec2 q = p - vec2(uEye.x, -0.48 + uEye.y);
      q.x = abs(q.x) - 0.52;
      float hy = max(0.44 * uEye.z, 0.045);
      float rect = sdRR(q, vec2(0.45, hy), min(0.16, hy));
      float arc = sdArc(q + vec2(0.0, 0.15), vec2(0.906, 0.423), 0.30, 0.09);
      return mix(rect, arc, uEye.w);
  }

  float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
      vec3 ro = vec3(0.0, CAM_Y, uD);
      float pxk = FRAME_UNITS / (uS * uD);
      vec3 os = uW2S * ro;
      vec3 sqv = vec3(uSq.x, uSq.y, uSq.x);
      vec3 ob = uBody * ((os - vec3(uWalkX, uHop, 0.0)) / sqv);
      vec3 ohd = uHead * (ob - PIVOT) + PIVOT - HEAD_C;
      float kq = min(uSq.x, uSq.y);

      vec4 acc = vec4(0.0);
      float cnt = 0.0;
      bool edge = false;
      vec4 colC = vec4(0.0), colO = vec4(0.0);
      bool hitC = false, haveO = false;
      float idC = 0.0, tWarm = 0.0;

      for (int s = 0; s < uSamples; s++) {
          if (s > 0 && !edge) break;
          float a = 0.4636 + float(s - 1) * 1.5708;
          vec2 off = s == 0 ? vec2(0.0) : 0.395 * vec2(cos(a), sin(a));
          vec2 fc = gl_FragCoord.xy + off - 0.5 * uRes - uOff;
          vec2 q = fc / uS * FRAME_UNITS - vec2(0.0, ROLL_CY);
          q = mat2(uRoll.x, uRoll.y, -uRoll.y, uRoll.x) * q + vec2(0.0, ROLL_CY);
          vec3 rd = normalize(vec3(q, -uD));
          float tf = rd.y < 0.0 ? -ro.y / rd.y : 1e9;

          vec3 ds = uW2S * rd;
          vec3 db = uBody * (ds / sqv);
          vec2 span = vec2(1e9, -1e9);
          span = spanWith(span, slab(ohd, uHead * db, vec3(0.0), HEAD_B + 0.02));
          span = spanWith(span, slab(ob, db, BODY_C, BODY_B + 0.02));
          bool hit = false;
          float t = max(max(span.x, 0.0), tWarm);
          float tEnd = min(span.y, tf);
          float hitAt = s == 0 ? 0.25 : 0.4;
          int steps = s == 0 ? 96 : 40;
          float rmin = 1e9, near = 1e9, prevR = 1e9;
          vec2 hitD = vec2(0.0, 1.0);

          if (tEnd > t) {
              float w = 1.4, lastD = 0.0, step = 0.0;
              for (int i = 0; i < 96; i++) {
                  if (i >= steps) break;
                  vec2 dd = sceneD(uW2S * (ro + rd * t), true);
                  float d = dd.x * uScale;
                  bool fail = w > 1.0 && d + lastD < step;
                  if (fail) {
                      step -= w * step;
                      w = 1.0;
                  } else {
                      float fp = pxk * t;
                      if (d < hitAt * fp) { hit = true; hitD = vec2(d, dd.y); break; }
                      float r = d / fp;
                      if (s == 0 && r < 1.5 && rmin >= 1.5) tWarm = t;
                      rmin = min(rmin, r);
                      if (r > prevR) near = min(near, prevR);
                      prevR = r;
                      step = d * w;
                  }
                  lastD = d;
                  t += step;
                  if (t > tEnd) break;
              }
              if (s == 0 && hit && rmin >= 1.5) tWarm = t;
          }

          bool same = s > 0 && hit == hitC && (!hit || abs(hitD.y - idC) < 0.5);
          vec4 col = same ? colC : colO;
          if (s == 0 || (!same && !haveO)) {
              col = vec4(0.0);
              vec3 n = vec3(0.0, 1.0, 0.0);
              vec3 p = ro + rd * t;
              vec3 pf = ro + rd * min(tf, 1e4);
              float ao = 1.0;
              float ndl = 0.0;
              if (hit) {
                  n = calcN(p, hitD.x, max(pxk * t * 0.5, 0.0015 * uScale));
                  ao = calcAO(p, n) * skyVis(p, n);
                  ndl = dot(n, uSun);
              }
              bool wantSh = hit ? ndl > 0.03 : tf < 1e8;
              float sh = wantSh ? softShadow(hit ? p + n * 0.01 * uScale : pf, uSun) : (hit ? 0.0 : 1.0);
              if (hit) sh = mix(1.0, sh, uShDepth);

              if (hit) {
                  float id = hitD.y;
                  vec3 alb = id > 1.5 ? uVisor : uClay;
                  vec2 sxz = normalize(uSun.xz + 1e-5);
                  float side = dot(n.xz, sxz);
                  vec3 lit = (uSky + uSkyUp * n.y + uSkySide * max(side, 0.0) + uSkyAway * max(-side, 0.0)) * ao
                           + uSunCol * max(ndl, 0.0) * sh;
                  vec3 rgb = pow(max(alb * lit, 0.0), vec3(1.0 / 2.2));
                  if (id > 1.5 && id < 2.5) {
                      vec3 ph = toHead(toBody(uW2S * p));
                      float eD = eyeSD(ph.xy);
                      float eW = 0.85 * pxk * t / (uScale * kq);
                      float eye = 1.0 - smoothstep(-eW, eW, eD);
                      float front = smoothstep(0.15, 0.38, ph.z);
                      float halo = uGlow * exp(-max(eD, 0.0) * 6.5) * (1.0 - eye);
                      // Extra bright & crisp glowing eyes
                      rgb += uEyeCol * halo * 0.7 * front;
                      rgb = mix(rgb, uEyeCol * 1.6, eye * front);
                  }
                  col = vec4(rgb, 1.0);
                  if (s == 0) edge = near < 1.5 || dot(n, -rd) < 0.3;
              } else {
                  // 100% Transparent background everywhere outside the robot!
                  col = vec4(0.0, 0.0, 0.0, 0.0);
                  if (s == 0) {
                      if (tf <= span.y) rmin = min(rmin, mapD(pf) / (pxk * tf));
                      edge = rmin < 1.5;
                  }
              }
              if (s == 0) {
                  colC = col;
                  hitC = hit;
                  idC = hitD.y;
              } else {
                  colO = col;
                  haveO = true;
              }
          }
          acc += col;
          cnt += 1.0;
      }
      vec4 finalCol = acc / cnt;
      if (finalCol.a > 0.01) {
          finalCol.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
      }
      fragColor = finalCol;
  }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function rotX(a, o) {
    const c = Math.cos(a), s = Math.sin(a);
    o[0] = 1; o[1] = 0; o[2] = 0;
    o[3] = 0; o[4] = c; o[5] = -s;
    o[6] = 0; o[7] = s; o[8] = c;
    return o;
  }
  function rotY(a, o) {
    const c = Math.cos(a), s = Math.sin(a);
    o[0] = c; o[1] = 0; o[2] = s;
    o[3] = 0; o[4] = 1; o[5] = 0;
    o[6] = -s; o[7] = 0; o[8] = c;
    return o;
  }
  function rotZ(a, o) {
    const c = Math.cos(a), s = Math.sin(a);
    o[0] = c; o[1] = -s; o[2] = 0;
    o[3] = s; o[4] = c; o[5] = 0;
    o[6] = 0; o[7] = 0; o[8] = 1;
    return o;
  }
  function mul3(a, b, out) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }

  function stepSpring(s, target, T, dt) {
    const w = 5.8 / Math.max(T, 0.02);
    let left = dt;
    while (left > 0) {
      const h = Math.min(left, 0.004);
      const a = w * w * (target - s.x) - 2 * w * s.v;
      s.v += a * h;
      s.x += s.v * h;
      left -= h;
    }
  }

  function makeRandom(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hopPose(h, height) {
    if (h < HOP_CROUCH) {
      return { lift: 0, squash: 0.13 * Math.sin((Math.PI / 2) * (h / HOP_CROUCH)), done: false };
    }
    const a = h - HOP_CROUCH;
    if (a < HOP_AIR) {
      const u = a / HOP_AIR;
      return { lift: 4 * height * u * (1 - u), squash: -0.09 * (1 - 2 * u) * (1 - 2 * u) + 0.13 * Math.max(0, 1 - a / 0.06), done: false };
    }
    return landPose(a - HOP_AIR);
  }

  function landPose(l) {
    if (l > LAND_S) return { lift: 0, squash: 0, done: true };
    const env = Math.exp(-l * 7) * (1 - l / LAND_S);
    return { lift: 0, squash: 0.16 * env * Math.cos(l * 19), done: false };
  }

  // --- Factory ---
  return function createClayRobot(host, canvas, userOptions) {
    if (!host || !canvas) return null;

    const opts = Object.assign({
      scale: 100,
      walk: true,
      walkSpeed: 5,
      wave: true,
      glance: 5,
      blink: true,
      colors: Object.assign({}, DEFAULT_COLORS),
      response: Object.assign({}, DEFAULT_RESPONSE),
      advanced: Object.assign({}, DEFAULT_ADVANCED),
      placement: { x: 0, y: 0, angle: 0, tilt: 0 },
    }, userOptions || {});

    let disposed = false;
    let raf = 0;
    let gl = null;
    let program = null;
    let buffer = null;
    let vao = null;
    const uni = {};

    let layoutW = 1, layoutH = 1, shown = 1, needResize = true;
    let onScreen = true, pageVisible = true, reduceMotion = false;

    let ptrX = 0, ptrY = 0, ptrNew = false, ptrInFrame = false, ptrInPage = false, ptrSeen = false;
    let touchUntil = 0, scrolled = false, ptrU = 0.5, ptrV = 0.5;

    const yaw = { x: 0, v: 0 };
    const pitch = { x: 0, v: 0 };
    const bodyYaw = { x: 0, v: 0 };
    const eyeX = { x: 0, v: 0 };
    const eyeY = { x: 0, v: 0 };
    let tYaw = 0, tPitch = 0, tEyeX = 0, tEyeY = 0;
    let clock = 0;
    let hopAt = -1, joyAt = -1, blinkAt = -1;
    let nextBlink = 2.2, nextGlance = 1.6;
    let glanceYaw = 0, glancePitch = 0;
    let dropAt = -1, dropDone = true;

    let walkX = 0, walkV = 0, walkGoal = 0, gait = 0, walkAmt = 0;
    let ptrFloorX = 0;
    let lastActive = -1e9, wasActive = false;
    let waveAt = -1, waveSide = 1, greet = false;
    let isContinuousWaving = false;
    const rand = makeRandom(0x5eed);

    let level = 0, drawn = 0, rectCheck = 0;

    const mHead = new Float32Array(9);
    const mBody = new Float32Array(9);
    const mW2S = new Float32Array(9);
    const tmp = new Float32Array(9);
    const tA = new Float32Array(9);
    const tB = new Float32Array(9);

    function initGL() {
      gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        preserveDrawingBuffer: true, // Prevents disappearing/glitching
      });
      if (!gl) return false;

      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;

      const prog = gl.createProgram();
      if (!prog) return false;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, "aPos");
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

      program = prog;
      gl.useProgram(prog);
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const names = [
        "uRes", "uS", "uOff", "uRoll", "uD", "uW2S", "uScale", "uHop", "uSq",
        "uBody", "uHead", "uEye", "uBoxMin", "uBoxMax", "uSun", "uSunCol", "uSky",
        "uSkyUp", "uSkySide", "uSkyAway", "uSoft", "uAO", "uShadowCol", "uShDepth", "uClay",
        "uVisor", "uEyeCol", "uGlow", "uSamples", "uWalkX", "uFeet", "uArms", "uArmExt", "uBodyBox",
      ];
      for (const n of names) uni[n] = gl.getUniformLocation(prog, n);

      needResize = true;
      return true;
    }

    function applySize() {
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      let k = dpr * Math.min(Math.max(shown, 1), 2);
      const area = layoutW * layoutH * k * k;
      if (area > PIXEL_BUDGET) k *= Math.sqrt(PIXEL_BUDGET / area);
      k *= LEVELS[level];
      const w = Math.max(1, Math.round(layoutW * k));
      const h = Math.max(1, Math.round(layoutH * k));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      needResize = false;
    }

    let cachedHostRect = null;
    function measureShown() {
      if (!cachedHostRect) {
        cachedHostRect = host.getBoundingClientRect();
        if (layoutW > 0 && cachedHostRect.width > 0) {
          const s = cachedHostRect.width / layoutW;
          if (Math.abs(s - shown) / shown > 0.05) {
            shown = s;
            needResize = true;
          }
        }
      }
      return cachedHostRect;
    }

    function aimAt(u, v) {
      const W = layoutW, H = layoutH;
      const S = Math.min(H, W / REF_ASPECT);
      const ang = (opts.placement.angle * Math.PI) / 180;
      const fx = u * W - W / 2 - (opts.placement.x / 100) * W;
      const fy = H / 2 - v * H + (opts.placement.y / 100) * H;
      let qx = (fx / S) * FRAME_UNITS;
      let qy = (fy / S) * FRAME_UNITS - ROLL_CY;
      const c = Math.cos(ang), s = Math.sin(ang);
      const rx = c * qx - s * qy;
      const ry = s * qx + c * qy + ROLL_CY;
      qx = rx;
      qy = ry;
      ptrFloorX = qx / (opts.scale / 100);
      const D = opts.advanced.cameraDistance;
      const len = Math.hypot(qx, qy, D);
      const dx = qx / len, dy = qy / len, dz = -D / len;
      const tt = (LOOK_Z - D) / dz;
      let Tx = dx * tt, Ty = CAM_Y + dy * tt, Tz = D + dz * tt;
      const k = opts.scale / 100;
      Tx /= k; Ty /= k; Tz /= k;
      const tl = (-opts.placement.tilt * Math.PI) / 180;
      const ct = Math.cos(tl), st = Math.sin(tl);
      const sy = ct * Ty + st * Tz;
      const sz = -st * Ty + ct * Tz;
      const ox = Tx - walkX, oy = sy - HEAD_Y, oz = sz;
      const yawRaw = Math.atan2(ox, Math.max(oz, 0.5));
      const pitchRaw = Math.atan2(oy, Math.hypot(ox, oz));
      setAim(yawRaw, pitchRaw);
    }

    function setAim(yawRaw, pitchRaw) {
      const maxYaw = (opts.response.headTurn / 10) * 0.87;
      const maxPitch = maxYaw * 0.55;
      tYaw = maxYaw > 0 ? maxYaw * Math.tanh(yawRaw / maxYaw) : 0;
      tPitch = maxPitch > 0 ? maxPitch * Math.tanh(pitchRaw / maxPitch) : 0;
      const et = opts.response.eyeTravel / 10;
      tEyeX = et * EYE_X * Math.tanh(yawRaw / 0.55);
      const py = Math.tanh(pitchRaw / 0.4);
      tEyeY = et * (py > 0 ? EYE_UP : EYE_DOWN) * py;
    }

    function startWave(continuous) {
      if (!opts.wave || reduceMotion) return;
      waveAt = clock;
      waveSide = 1;
      isContinuousWaving = !!continuous;
    }

    function stopWave() {
      isContinuousWaving = false;
    }

    function triggerHop() {
      if (reduceMotion || opts.response.hop <= 0) return;
      const h = hopAt >= 0 ? clock - hopAt : 1e9;
      if (h > HOP_CROUCH + HOP_AIR) hopAt = clock;
      joyAt = clock;
    }

    function setWalkingAnim(walking, speed) {
      if (walking) {
        // speed can be positive (right) or negative (left)
        walkV = (typeof speed === "number") ? speed : 0.65;
        walkAmt = 1.0;
      } else {
        walkV = 0;
        walkAmt = 0;
      }
    }

    function waveUp(w) {
      const ease = (x) => x * x * (3 - 2 * x);
      if (w < WAVE_UP) return ease(w / WAVE_UP);
      if (w < WAVE_UP + WAVE_HOLD) return 1;
      if (w < WAVE_UP + WAVE_HOLD + WAVE_DOWN) return 1 - ease((w - WAVE_UP - WAVE_HOLD) / WAVE_DOWN);
      return 0;
    }

    function draw() {
      if (!gl || !program) return;
      if (needResize) applySize();
      const W = canvas.width, H = canvas.height;
      const bs = W / layoutW;
      const S = Math.min(layoutH, layoutW / REF_ASPECT) * bs;

      let lift = 0;
      let squash = 0;
      const hopH = (opts.response.hop / 10) * 1.6;
      if (hopAt >= 0) {
        const hp = hopPose(clock - hopAt, hopH);
        lift += hp.lift;
        squash += hp.squash;
        if (hp.done) hopAt = -1;
      }
      let joy = 0;
      if (joyAt >= 0) {
        const j = clock - joyAt;
        joy = j < 0.08 ? j / 0.08 : j < JOY_S ? 1 : Math.max(0, 1 - (j - JOY_S) / 0.15);
        if (j > JOY_S + 0.15) joyAt = -1;
      }

      const gs = Math.sin(gait);
      lift += walkAmt * BOB * Math.abs(gs);
      const roll = -walkAmt * WADDLE * gs;
      const liftL = walkAmt * STEP_LIFT * Math.max(0, gs);
      const liftR = walkAmt * STEP_LIFT * Math.max(0, -gs);
      let armL = ARM_REST, armR = ARM_REST;
      let swingL = walkAmt * ARM_SWING * gs;
      let swingR = -swingL;
      let extL = 0, extR = 0;

      if (waveAt >= 0) {
        const w = clock - waveAt;
        let up = 0;
        if (isContinuousWaving) {
          up = Math.min(1.0, w / WAVE_UP);
          const sway = WAVE_SWAY * Math.sin(w * Math.PI * 2 * WAVE_HZ);
          armR = ARM_REST + (WAVE_RAISE - ARM_REST) * up + sway;
          swingR *= 1 - up;
          extR = up;
          joy = Math.max(joy, up);
        } else {
          up = waveUp(w);
          const sway = WAVE_SWAY * up * up * Math.sin((w - WAVE_UP) * Math.PI * 2 * WAVE_HZ);
          const raise = ARM_REST + (WAVE_RAISE - ARM_REST) * up + sway;
          armR = raise;
          swingR *= 1 - up;
          extR = up;
          joy = Math.max(joy, up);
          if (w > WAVE_UP + WAVE_HOLD + WAVE_DOWN) waveAt = -1;
        }
      }

      let open = 1;
      if (blinkAt >= 0) {
        const b = (clock - blinkAt) / BLINK_S;
        if (b >= 1) blinkAt = -1;
        else open = 1 - 0.94 * Math.sin(Math.PI * b);
      }

      const k = opts.scale / 100;
      const tilt = (-opts.placement.tilt * Math.PI) / 180;
      rotX(tilt, mW2S);
      for (let i = 0; i < 9; i++) mW2S[i] /= k;
      const hy = yaw.x - bodyYaw.x;
      mul3(rotY(hy, tA), rotX(-pitch.x, tB), tmp);
      mul3(tmp, rotZ(HEAD_ROLL * hy, tA), mHead);
      mul3(rotY(bodyYaw.x, tA), rotZ(roll, tB), mBody);

      const az = (opts.advanced.sunAngle * Math.PI) / 180;
      const el = (opts.advanced.sunElevation * Math.PI) / 180;
      const sunX = Math.sin(az) * Math.cos(el);
      const sunY = Math.sin(el);
      const sunZ = Math.cos(az) * Math.cos(el);

      const shc = toRGB("#2E4D6A", "#2E4D6A");
      const clay = toRGB(opts.colors.clay, DEFAULT_COLORS.clay);
      const visor = toRGB(opts.colors.visor, DEFAULT_COLORS.visor);
      const eyes = toRGB(opts.colors.eyes, DEFAULT_COLORS.eyes);
      const ss = opts.advanced.sunStrength;
      const sk = opts.advanced.skyStrength;

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform2f(uni.uRes, W, H);
      gl.uniform1f(uni.uS, S);
      gl.uniform2f(uni.uOff, (opts.placement.x / 100) * W, (-opts.placement.y / 100) * H);
      const ang = (opts.placement.angle * Math.PI) / 180;
      gl.uniform2f(uni.uRoll, Math.cos(ang), Math.sin(ang));
      gl.uniform1f(uni.uD, opts.advanced.cameraDistance);
      gl.uniformMatrix3fv(uni.uW2S, false, mW2S);
      gl.uniform1f(uni.uScale, k);
      gl.uniform1f(uni.uHop, lift);
      const sq = Math.max(-0.3, Math.min(0.4, squash));
      gl.uniform2f(uni.uSq, 1 + sq * 0.5, 1 - sq);
      gl.uniformMatrix3fv(uni.uBody, false, mBody);
      gl.uniformMatrix3fv(uni.uHead, false, mHead);
      gl.uniform4f(uni.uEye, eyeX.x, eyeY.x, open, joy);
      gl.uniform3f(uni.uBoxMin, walkX - 3.25, -0.05, -2.7);
      gl.uniform3f(uni.uBoxMax, walkX + 3.25, 6.55 + lift + Math.max(0, -sq) * 6, 2.7);
      gl.uniform3f(uni.uSun, sunX, sunY, sunZ);
      gl.uniform3f(uni.uSunCol, SUN[0] * ss, SUN[1] * ss, SUN[2] * ss);
      gl.uniform3f(uni.uSky, SKY[0] * sk, SKY[1] * sk, SKY[2] * sk);
      gl.uniform3f(uni.uSkyUp, SKY_UP[0] * sk, SKY_UP[1] * sk, SKY_UP[2] * sk);
      gl.uniform3f(uni.uSkySide, SKY_SIDE[0] * sk, SKY_SIDE[1] * sk, SKY_SIDE[2] * sk);
      gl.uniform3f(uni.uSkyAway, SKY_AWAY[0] * sk, SKY_AWAY[1] * sk, SKY_AWAY[2] * sk);
      gl.uniform1f(uni.uSoft, opts.advanced.shadowSoftness);
      gl.uniform1f(uni.uAO, opts.advanced.occlusion);
      gl.uniform3f(uni.uShadowCol, shc[0], shc[1], shc[2]);
      gl.uniform1f(uni.uShDepth, 0.45);
      gl.uniform3f(uni.uClay, lin(clay[0]) / CLAY_LIN[0], lin(clay[1]) / CLAY_LIN[1], lin(clay[2]) / CLAY_LIN[2]);
      gl.uniform3f(uni.uVisor, lin(visor[0]) / CLAY_LIN[0], lin(visor[1]) / CLAY_LIN[1], lin(visor[2]) / CLAY_LIN[2]);
      gl.uniform3f(uni.uEyeCol, eyes[0], eyes[1], eyes[2]);
      gl.uniform1f(uni.uGlow, opts.advanced.eyeGlow);
      gl.uniform1f(uni.uWalkX, walkX);
      gl.uniform2f(uni.uFeet, liftL, liftR);
      gl.uniform4f(uni.uArms, armL, swingL, armR, swingR);
      gl.uniform2f(uni.uArmExt, extL, extR);
      if (extL + extR > 0) gl.uniform4f(uni.uBodyBox, 1.48, 3.0, 1.55, 0.9);
      else gl.uniform4f(uni.uBodyBox, 1.05, 1.45, 1.12, 0.85);
      gl.uniform1i(uni.uSamples, 5);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawn++;
    }

    let lastTick = 0;
    function loop(now) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min((lastTick ? now - lastTick : 16.7) / 1000, 0.05);
      lastTick = now;
      if (!onScreen || !pageVisible) return;
      clock += dt;
      const rm = reduceMotion;

      // Pointer aim
      if (ptrSeen) {
        const r = measureShown();
        if (r.width > 0 && r.height > 0) {
          ptrU = (ptrX - r.left) / r.width;
          ptrV = (ptrY - r.top) / r.height;
        }
        aimAt(ptrU, ptrV);
        nextGlance = clock + 2.5;
      } else if (opts.glance > 0 && !rm) {
        if (clock >= nextGlance) {
          const home = rand() < 0.3;
          glanceYaw = home ? 0 : (rand() * 2 - 1) * 0.5;
          glancePitch = home ? 0 : (rand() * 1.1 - 0.4) * 0.3;
          nextGlance = clock + (1.4 + rand() * 2.6) * (10 / (4 + opts.glance * 1.2));
        }
        setAim(glanceYaw, glancePitch);
      } else {
        setAim(0, 0);
      }

      // Blink
      if (opts.blink && !rm) {
        if (blinkAt < 0 && clock >= nextBlink) {
          blinkAt = clock;
          nextBlink = clock + (rand() < 0.2 ? 0.28 : 2.2 + rand() * 3.6);
        }
      } else {
        blinkAt = -1;
      }

      // Gait update
      if (walkAmt > 0.01) {
        gait += (Math.abs(walkV) * dt * Math.PI) / STRIDE;
        gait %= (Math.PI * 2);
      }

      const faceT = tYaw * BODY_SHARE + Math.sign(walkV) * WALK_TURN * walkAmt;
      const T = 0.5 - (opts.response.followSpeed / 10) * 0.42;

      stepSpring(yaw, tYaw, T, dt);
      stepSpring(pitch, tPitch, T, dt);
      stepSpring(bodyYaw, faceT, T * 1.7, dt);
      stepSpring(eyeX, tEyeX, T * 0.45, dt);
      stepSpring(eyeY, tEyeY, T * 0.45, dt);

      if (++rectCheck >= 30) {
        rectCheck = 0;
        measureShown();
      }

      draw();
    }

    if (!initGL()) return null;

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entries) => {
          const e = entries[0];
          if (!e) return;
          layoutW = Math.max(1, e.contentRect.width);
          layoutH = Math.max(1, e.contentRect.height);
          measureShown();
          needResize = true;
        })
      : null;
    if (ro) ro.observe(host);
    layoutW = Math.max(1, host.clientWidth);
    layoutH = Math.max(1, host.clientHeight);

    const onVisibility = () => {
      pageVisible = document.visibilityState !== "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onWinMove = (e) => {
      ptrX = e.clientX;
      ptrY = e.clientY;
      ptrSeen = true;
    };
    window.addEventListener("pointermove", onWinMove, { passive: true });

    raf = requestAnimationFrame(loop);

    return {
      opts: opts,
      wave: startWave,
      stopWave: stopWave,
      hop: triggerHop,
      setWalking: setWalkingAnim,
      destroy: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onWinMove);
        if (gl) {
          if (buffer) gl.deleteBuffer(buffer);
          if (vao) gl.deleteVertexArray(vao);
          if (program) gl.deleteProgram(program);
        }
      }
    };
  };
}));
