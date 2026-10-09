// The living stage, shared by exploring and battles:
//  - a camera that follows, drifts gently and pushes in on big moments;
//  - a painted backdrop drawn in thin rows so the floor moves with real
//    perspective (near rows faster than far ones) and far scenery lags;
//  - an optional foreground layer that moves faster still;
//  - living sprites: painted art redrawn every frame in thin strips, so it
//    breathes, sways and hovers while the feet stay planted.
// One requestAnimationFrame loop runs while the stage is on the page.

import LAYOUT from "./stage-layout.json";
import { h } from "./dom.js";
import { assetInfo, currentFrame } from "./sprites.js";

const TAU = Math.PI * 2;
const [STAGE_W, STAGE_H] = LAYOUT.stage;
const C = { x: STAGE_W / 2, y: STAGE_H / 2 };
const FG_ZOOM = 1.03; // the foreground layer is drawn a touch bigger, as if nearer the lens

// How each kind of creature moves when it isn't doing anything.
// breathe: vertical stretch; sway/wave: sideways drift that grows with height
// (or with depth below the top, for anchor "top"); hover: bob up and down;
// squish: squash-and-stretch; pulse: the top widens and narrows; tilt: rock.
export const PROFILES = {
  hero: { breathe: 0.011, breatheT: 3.4, sway: 1.3, swayT: 4.6, swayPow: 2.4, wave: 0.7, waveT: 1.9, waveK: 4 },
  droid: { hover: 5, hoverT: 2.4, tilt: 2.5, tiltT: 3.1 },
  monkey: { breathe: 0.016, breatheT: 2.2, sway: 1.2, swayT: 3.3, swayPow: 2 },
  beast: { breathe: 0.02, breatheT: 2.3, sway: 1.8, swayT: 3.4, swayPow: 1.8, wave: 1.0, waveT: 1.5, waveK: 4 },
  armored: { breathe: 0.013, breatheT: 3.1, sway: 0.7, swayT: 5.0, swayPow: 2 },
  slime: { squish: 0.035, squishT: 1.8, sway: 2.4, swayT: 2.6, swayPow: 1.2, wave: 1.8, waveT: 1.4, waveK: 6 },
  jelly: { hover: 9, hoverT: 3.2, pulse: 0.035, pulseT: 1.6, wave: 6, waveT: 2.2, waveK: 7, anchor: "top", swayPow: 1.6 },
  drone: { hover: 7, hoverT: 1.9, tilt: 1.4, tiltT: 2.7 },
  colossal: { breathe: 0.016, breatheT: 4.2, sway: 1.6, swayT: 6.0, swayPow: 2.2 },
  titan: { breathe: 0.012, breatheT: 4.6, sway: 2.5, swayT: 7.0, swayPow: 2 },
};

/** Which motion a game id uses. */
export function profileFor(id) {
  if (["knight", "gunner", "spellwright", "titancaller", "hero_main"].includes(id)) return "hero";
  return (
    {
      droid: "droid",
      monkey: "monkey",
      scrap_raptor: "beast",
      magnet_beetle: "armored",
      ink_slime: "slime",
      volt_jelly: "jelly",
      dominion_drone: "drone",
      geode_titan: "colossal",
      titan_starter: "titan",
    }[id] || "beast"
  );
}

/**
 * How the background sits on the stage in each mode.
 *  scale: background pixels → stage pixels
 *  edgeY: stage y of the back edge of the floor
 *  refY:  the floor row that moves exactly with the camera (where fighters stand)
 *  damp:  how much real perspective parallax to use (1 = all; small camera moves only)
 */
export const FITS = {
  battle: { scale: LAYOUT.background.scale, edgeY: LAYOUT.background.floorEdgeStageY, refY: 490, damp: 1, drift: [9, 3] },
  explore: { scale: 1.12, edgeY: 380, refY: 520, damp: 0.3, drift: [3, 2] },
};

export function createStage(field, { background = null, mode = "battle" } = {}) {
  const fit = { ...FITS[mode] };
  const info = background ? assetInfo(background) : null;
  const [imgW, imgH] = LAYOUT.background.image;
  const edgeFrac = info?.floorEdge ?? LAYOUT.background.floorEdgeImage;
  const eyeFrac = info?.eyeLevel ?? LAYOUT.background.eyeLevelImage;
  const imgLeft = (STAGE_W - imgW * fit.scale) / 2;
  const imgTop = fit.edgeY - edgeFrac * imgH * fit.scale;
  const eyeY = imgTop + eyeFrac * imgH * fit.scale;

  /** How fast the floor at stage row y moves compared with the camera (1 = with it). */
  function depthFactor(y) {
    const physAt = (yy) => (yy - eyeY) / (fit.refY - eyeY);
    let f;
    if (y >= fit.edgeY) f = physAt(y);
    else f = physAt(fit.edgeY) * (1 - 0.4 * Math.min(1, (fit.edgeY - y) / Math.max(1, fit.edgeY)));
    f = Math.max(0.2, Math.min(1.9, f));
    return 1 + fit.damp * (f - 1);
  }

  /** How big something standing at stage row y looks, relative to the reference row (perspective). */
  function scaleAt(y) {
    return Math.max(0.35, (y - eyeY) / (fit.refY - eyeY));
  }

  // ---------------------------------------------------------------- layers
  const back = h("canvas.stage-back");
  const world = h("div.stage-world");
  const front = h("canvas.stage-front");
  // The backdrop canvas sits inside the world layer (with the camera undone on
  // it), so effects in the world can blend with it ("screen" needs a backdrop
  // in the same stacking context).
  world.append(back);
  field.append(world, front);
  const bg = loadImage(info?.base?.src);
  const fg = loadImage(info?.fg?.src);
  if (!bg) back.classList.add("empty");

  // ---------------------------------------------------------------- camera
  const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    target: { x: 0, y: 0 },
    bounds: null,
    yRange: [-40, 40], // how far it may tilt up and down (cinematics widen it)
    pushes: [],
    mouse: { x: 0, y: 0 },
    /** Ease toward a point (explore: the hero). */
    follow(x, y = 0) {
      this.target.x = x;
      this.target.y = y;
    },
    /** Jump there now (entering a scene). */
    snap(x, y = 0) {
      this.target.x = this.base.x = x;
      this.target.y = this.base.y = y;
    },
    base: { x: 0, y: 0 },
    /** A short camera move: offset and zoom, eased in, held, eased out. Resolves after the hold. */
    push({ x = 0, y = 0, zoom = 1, inMs = 380, holdMs = 300, outMs = 600 } = {}) {
      const p = { x, y, zoom, t0: performance.now(), inMs, holdMs, outMs };
      this.pushes.push(p);
      return new Promise((r) => setTimeout(r, inMs + holdMs));
    },
    /** Release every push now. */
    clearPushes() {
      this.pushes = [];
    },
  };

  /** How far the camera may pan before the backdrop's edges show. */
  function panLimits() {
    const fNear = Math.max(depthFactor(STAGE_H), depthFactor(fit.edgeY - 300), 1);
    const z = camera.zoom;
    const lo = (imgLeft - C.x + C.x / z) / fNear;
    const hi = (imgLeft + imgW * fit.scale - C.x - (STAGE_W - C.x) / z) / fNear;
    return [Math.min(lo, 0), Math.max(hi, 0)];
  }

  // The foreground layer moves fastest, but never so far that its edge slides
  // into view at the end of a pan (the explore camera pans a long way).
  const fgFactor = (() => {
    const want = 1 + fit.damp * 0.9 + 0.25;
    const slack = C.x - C.x / FG_ZOOM - imgLeft;
    const [lo, hi] = panLimits();
    return Math.max(1, Math.min(want, slack / Math.max(-lo, hi, 1)));
  })();

  // ---------------------------------------------------------------- the foreground fades off him
  // The explore screen asks how much of the foreground layer covers the hero;
  // while it does, the layer fades, so he never walks out of sight behind a pillar.
  let fgRect = null; // where the layer was last drawn, in stage pixels
  let fgMask; // its alpha, coarse (undefined until the art loads, false if unreadable)
  let fgAlpha = 1;
  let fgWant = 1;

  function maskOf() {
    if (fgMask === undefined && fg?.ready) {
      try {
        const [mw, mh] = [96, 64];
        const c = h("canvas", { width: mw, height: mh });
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(fg.img, 0, 0, mw, mh);
        const d = g.getImageData(0, 0, mw, mh).data;
        const a = new Uint8Array(mw * mh);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
        fgMask = { w: mw, h: mh, a };
      } catch {
        fgMask = false; // can't read the pixels: never fade
      }
    }
    return fgMask || null;
  }

  /** How solidly the foreground layer covers any of these stage points (0 to 1). */
  function fgCover(points) {
    const m = maskOf();
    if (!m || !fgRect) return 0;
    let most = 0;
    for (const [px, py] of points) {
      const u = Math.floor(((px - fgRect.x) / fgRect.w) * m.w);
      const v = Math.floor(((py - fgRect.y) / fgRect.h) * m.h);
      if (u >= 0 && v >= 0 && u < m.w && v < m.h) most = Math.max(most, m.a[v * m.w + u] / 255);
    }
    return most;
  }

  function fadeStep(dt) {
    if (fgAlpha === fgWant) return;
    fgAlpha = Math.abs(fgWant - fgAlpha) < 0.01 ? fgWant : fgAlpha + (fgWant - fgAlpha) * Math.min(1, dt * 7);
    front.style.opacity = String(fgAlpha);
  }

  const onMouse = (e) => {
    const r = field.getBoundingClientRect();
    if (!r.width) return;
    camera.mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    camera.mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener("mousemove", onMouse);

  // ---------------------------------------------------------------- living sprites
  const living = new Set();
  const frameFns = new Set(); // game logic, before the camera moves
  const layoutFns = new Set(); // placing things, after the camera has moved

  function live(spriteEl, profile = "hero", { flip = false } = {}) {
    const body = spriteEl.querySelector(".body");
    if (!body || spriteEl._living) return spriteEl._living;
    const canvas = h("canvas.living-canvas");
    body.append(canvas);
    spriteEl.classList.add("living");
    const rec = {
      el: spriteEl,
      body,
      canvas,
      ctx: canvas.getContext("2d"),
      profile: PROFILES[profile] || PROFILES.hero,
      phase: Math.random() * 10,
      flip,
      walking: false,
      walkPhase: 0,
      size: [0, 0],
      dpr: 0,
    };
    spriteEl._living = rec;
    living.add(rec);
    return rec;
  }

  function sizeLiving(rec, dpr) {
    const W = parseFloat(rec.el.style.width) || 100;
    const H = parseFloat(rec.el.style.height) || 100;
    if (rec.size[0] === W && rec.size[1] === H && rec.dpr === dpr) return;
    rec.size = [W, H];
    rec.dpr = dpr;
    // Wider and taller than the box: sheet frames are square, and things sway and hover.
    const CW = Math.max(W, H) * 1.7;
    const CH = H * 1.3;
    rec.ox = (CW - W) / 2;
    rec.oy = CH - H;
    Object.assign(rec.canvas.style, { width: `${CW}px`, height: `${CH}px`, left: `${-rec.ox}px`, top: `${-rec.oy}px` });
    rec.canvas.width = Math.round(CW * dpr);
    rec.canvas.height = Math.round(CH * dpr);
  }

  function drawLiving(rec, t, dpr) {
    const { el, ctx, canvas } = rec;
    if (!el.isConnected) {
      living.delete(rec);
      return;
    }
    sizeLiving(rec, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (el.classList.contains("gone") || el.classList.contains("benched")) return;
    const f = currentFrame(el);
    if (!f) return;
    const [W, H] = rec.size;
    let dw, dh;
    if (f.kind === "sheet") {
      dh = H;
      dw = (H * f.sw) / f.sh;
    } else {
      const s = Math.min(W / f.sw, H / f.sh);
      dw = f.sw * s;
      dh = f.sh * s;
    }
    const p = rec.profile;
    const ko = el.classList.contains("ko");
    const k = (ko ? 0.2 : 1) * (REDUCED ? 0.35 : 1);
    const ph = rec.phase;
    const breath = Math.sin((TAU * t) / (p.breatheT || 3) + ph);
    let sY = 1 + (p.breathe || 0) * breath * k;
    let sX = 1 - (p.breathe || 0) * 0.45 * breath * k;
    if (p.squish) {
      const q = Math.sin((TAU * t) / p.squishT + ph) * k;
      sY = 1 + p.squish * q;
      sX = 1 - p.squish * q * 0.9;
    }
    let lift = p.hover ? p.hover * Math.sin((TAU * t) / p.hoverT + ph) * k : 0;
    let lean = 0;
    if (rec.walking) {
      const s = Math.sin(rec.walkPhase);
      lift += Math.abs(s) * H * 0.028;
      sY *= 1 - Math.abs(Math.cos(rec.walkPhase)) * 0.025;
      lean = s * 0.6;
    }
    const cx = rec.ox + W / 2;
    const base = rec.oy + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    if (rec.flip) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }
    const tilt = (p.tilt ? p.tilt * Math.sin((TAU * t) / p.tiltT + ph * 0.7) * k : 0) + lean;
    if (tilt) {
      const pivotY = base - dh * 0.5 - lift;
      ctx.translate(cx, pivotY);
      ctx.rotate((tilt * Math.PI) / 180);
      ctx.translate(-cx, -pivotY);
    }
    const N = quality.low ? 18 : 36;
    const sway = (p.sway || 0) * Math.sin((TAU * t) / (p.swayT || 4) + ph * 1.3) * k;
    for (let i = 0; i < N; i++) {
      const v = 1 - (i + 0.5) / N; // 1 at the top, 0 at the feet
      const w = Math.pow(p.anchor === "top" ? 1 - v : v, p.swayPow || 2);
      const wave = p.wave ? p.wave * Math.sin((TAU * t) / p.waveT + ph * 0.7 - p.waveK * v) * k : 0;
      const dx = (sway + wave) * w;
      const pulse = p.pulse ? 1 + p.pulse * Math.sin((TAU * t) / p.pulseT + ph) * v * v * k : 1;
      const stripW = dw * sX * pulse;
      const stripH = (dh * sY) / N;
      const y = base - dh * sY + i * stripH - lift;
      ctx.drawImage(f.image, f.sx, f.sy + (i / N) * f.sh, f.sw, f.sh / N, cx - stripW / 2 + dx, y, stripW, stripH + 0.8);
    }
  }

  // ---------------------------------------------------------------- the loop
  let last = performance.now();
  let drawn = null;
  let running = true;
  let suspended = false; // paused while a battle borrows the screen
  // Quality: if frames run slow (under ~40 a second) for a couple of seconds,
  // draw with fewer strips and stop the idle drift. It never switches back
  // within a scene, so it can't flicker between the two.
  const quality = { low: LOW_QUALITY.on, slow: 0 };
  function watchSpeed(raw) {
    if (quality.low || raw > 0.5) return; // a long gap is a hidden tab, not a slow laptop
    quality.slow = raw > 1 / 40 ? quality.slow + raw : Math.max(0, quality.slow - raw * 0.5);
    if (quality.slow > 2) {
      quality.low = LOW_QUALITY.on = true;
      drawn = null;
    }
  }

  function stageDpr() {
    const r = field.getBoundingClientRect();
    const k = r.width ? r.width / STAGE_W : 1;
    return Math.min(2, Math.max(1, k * (window.devicePixelRatio || 1)));
  }

  function ease(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  }

  function updateCamera(dt, t) {
    // follow, smoothly
    const k = 1 - Math.exp(-dt * 4);
    camera.base.x += (camera.target.x - camera.base.x) * k;
    camera.base.y += (camera.target.y - camera.base.y) * k;
    // the idle drift and mouse parallax are the first things a slow laptop gives up:
    // without them a still camera means the backdrop doesn't need redrawing
    const calm = quality.low ? 0 : 1;
    let x = camera.base.x + calm * (fit.drift[0] * Math.sin((TAU * t) / 23) + camera.mouse.x * 5);
    let y = camera.base.y + calm * (fit.drift[1] * Math.sin((TAU * t) / 31 + 1) + camera.mouse.y * 2);
    let zoom = 1;
    const now = performance.now();
    camera.pushes = camera.pushes.filter((p) => now - p.t0 < p.inMs + p.holdMs + p.outMs);
    for (const p of camera.pushes) {
      const e = now - p.t0;
      const a = e < p.inMs ? ease(e / p.inMs) : e < p.inMs + p.holdMs ? 1 : 1 - ease((e - p.inMs - p.holdMs) / p.outMs);
      x += p.x * a;
      y += p.y * a;
      zoom *= 1 + (p.zoom - 1) * a;
    }
    camera.zoom = zoom;
    const [lo, hi] = panLimits();
    camera.x = Math.max(lo, Math.min(hi, x));
    camera.y = Math.max(camera.yRange[0], Math.min(camera.yRange[1], y));
  }

  function drawBack(dpr) {
    const key = `${camera.x.toFixed(2)},${camera.y.toFixed(2)},${camera.zoom.toFixed(4)},${dpr},${bg?.ready},${fg?.ready}`;
    if (key === drawn) return;
    drawn = key;
    for (const canvas of [back, front]) {
      const w = Math.round(STAGE_W * dpr);
      const hh = Math.round(STAGE_H * dpr);
      if (canvas.width !== w || canvas.height !== hh) {
        canvas.width = w;
        canvas.height = hh;
      }
    }
    const z = camera.zoom;
    const s = fit.scale;
    // the backdrop, row strip by row strip
    const g = back.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg?.ready) {
      const strip = quality.low ? 8 : 4;
      for (let y0 = 0; y0 < imgH; y0 += strip) {
        const rowY = imgTop + (y0 + strip / 2) * s;
        const f = depthFactor(rowY);
        const sx = C.x + z * (imgLeft - C.x - camera.x * f);
        const sy = C.y + z * (imgTop + y0 * s - C.y - camera.y);
        const sh = strip * s * z;
        if (sy > STAGE_H || sy + sh < 0) continue;
        g.drawImage(bg.img, 0, y0, imgW, strip, sx, sy, imgW * s * z, sh + 0.6);
      }
    } else {
      g.clearRect(0, 0, STAGE_W, STAGE_H);
    }
    // the foreground, closer than everything, so it moves fastest
    const fgc = front.getContext("2d");
    fgc.setTransform(1, 0, 0, 1, 0, 0);
    fgc.clearRect(0, 0, front.width, front.height);
    if (fg?.ready) {
      fgc.setTransform(dpr, 0, 0, dpr, 0, 0);
      const zz = z * FG_ZOOM;
      const w = imgW * s * zz;
      const hh = imgH * s * zz;
      // its own edges never come on screen, even in a zoomed or tilted shot
      const sx = Math.min(0, Math.max(STAGE_W - w, C.x + zz * (imgLeft - C.x - camera.x * fgFactor)));
      const sy = Math.min(0, Math.max(STAGE_H - hh, C.y + zz * (imgTop - C.y - camera.y * 1.2)));
      fgc.drawImage(fg.img, sx, sy, w, hh);
      fgRect = { x: sx, y: sy, w, h: hh };
    }
  }

  function tick(now) {
    if (!running || suspended) return;
    if (!field.isConnected) return stop();
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    watchSpeed(raw);
    const t = now / 1000;
    for (const fn of frameFns) fn(dt, t);
    updateCamera(dt, t);
    for (const fn of layoutFns) fn(dt, t);
    const dpr = stageDpr();
    drawBack(dpr);
    fadeStep(dt);
    const z = camera.zoom;
    world.style.transform = `translate(${C.x}px, ${C.y}px) scale(${z}) translate(${-C.x - camera.x}px, ${-C.y - camera.y}px)`;
    back.style.transform = `translate(${C.x + camera.x}px, ${C.y + camera.y}px) scale(${1 / z}) translate(${-C.x}px, ${-C.y}px)`;
    for (const rec of living) drawLiving(rec, t, Math.min(2, dpr));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /** Pause the loop (the stage is about to leave the page for a while). */
  function suspend() {
    suspended = true;
  }

  /** Back on the page: start the loop again. */
  function resume() {
    if (!suspended || !running) return;
    suspended = false;
    last = performance.now();
    drawn = null;
    requestAnimationFrame(tick);
  }

  /** A point on the screen (stage pixels) → the ground point under it, in world coordinates. */
  function toFloor(sx, sy) {
    const z = camera.zoom;
    const y = (sy - C.y) / z + C.y + camera.y;
    const x = (sx - C.x) / z + C.x + camera.x * depthFactor(y);
    return [x, y];
  }

  /** Where a ground point shows on the screen right now (stage pixels). */
  function toScreen(x, y) {
    const z = camera.zoom;
    return [C.x + z * (x - C.x - camera.x * depthFactor(y)), C.y + z * (y - C.y - camera.y)];
  }

  function stop() {
    running = false;
    window.removeEventListener("mousemove", onMouse);
    living.clear();
    frameFns.clear();
    layoutFns.clear();
  }

  const stage = {
    world,
    camera,
    fit,
    depthFactor,
    scaleAt,
    eyeY,
    /** Where to put a world-space element so it moves with the floor at its own depth. */
    parallaxLeft: (x, y) => x + camera.x * (1 - depthFactor(y)),
    toFloor,
    toScreen,
    fgCover,
    /** Fade the foreground layer toward this opacity (1: solid). */
    fadeForeground: (alpha) => (fgWant = alpha),
    live,
    onFrame: (fn) => (frameFns.add(fn), () => frameFns.delete(fn)),
    onLayout: (fn) => (layoutFns.add(fn), () => layoutFns.delete(fn)),
    suspend,
    resume,
    stop,
  };
  // for automated playtests (?debug): steer the camera from outside
  if (typeof location !== "undefined" && new URLSearchParams(location.search).has("debug")) window.__stage = stage;
  return stage;
}

const REDUCED = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// Once a stage has found the laptop slow, later stages start in low quality too.
const LOW_QUALITY = { on: false };

const images = new Map();
function loadImage(src) {
  if (!src) return null;
  let rec = images.get(src);
  if (!rec) {
    const img = new Image();
    rec = { img, ready: false };
    img.onload = () => (rec.ready = true);
    img.src = `assets/${src}`;
    images.set(src, rec);
  }
  return rec;
}
