// Sprites. Real art comes from public/assets/manifest.json (made by Codex,
// see art/PRODUCTION.md); anything not painted yet falls back to the
// hologram placeholders, so the game always runs.

import { h } from "./dom.js";
import { placeholderSvg } from "./placeholders.js";

let manifest = { assets: {} };
let uid = 0;

export async function loadManifest() {
  try {
    const res = await fetch("assets/manifest.json", { cache: "no-cache" });
    if (res.ok) manifest = await res.json();
  } catch {
    /* no art yet: holograms it is */
  }
  manifest.assets ||= {};
  return manifest;
}

// Game ids → manifest ids (art/waves/*) and placeholder ids.
const ART_IDS = {
  knight: "ally_knight",
  gunner: "ally_gunner",
  spellwright: "ally_spellwright",
  titancaller: "ally_titancaller",
  droid: "tutor_droid",
  monkey: "mascot_monkey",
  geode_titan: "boss_geode_titan",
  titan_starter: "titan_starter",
};
const artId = (id) => ART_IDS[id] || `fiend_${id}`;

const BATTLE_FRAMES = { idle: 0, attack: 1, cast: 2, hurt: 3, ko: 4, victory: 5 };
// Bosses are separate images per pose (art/PRODUCTION.md); game poses map onto them.
const BOSS_POSES = { attack: "attack", hurt: "hurt", ko: "hurt", special: "enraged", cast: "enraged" };

/** URL of an asset's main image (backgrounds, splash art), or null if it isn't painted yet. */
export function assetUrl(id, key = "base") {
  const a = manifest.assets[id] || manifest.assets[artId(id)];
  const src = a?.[key]?.src;
  return src ? `assets/${src}` : null;
}
const FIEND_FRAMES = { idle: 0, attack: 1, hurt: 2, special: 3 };

/** The picture for one sprite: a sheet frame, a base image, or a hologram. */
export function artFor(id, { pose = "idle", prefer = "battle" } = {}) {
  const a = manifest.assets[artId(id)];
  const sheet = a?.[prefer];
  if (sheet?.src && sheet.cols && sheet.rows) {
    // Keep the cell's shape (square cells in a tall hero box), feet at the bottom.
    const [cw, ch] = sheet.cell || [1, 1];
    const el = h("div.sheet", {
      style: {
        height: "100%",
        aspectRatio: `${cw} / ${ch}`,
        flex: "none",
        backgroundImage: `url("assets/${sheet.src}")`,
        backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
        backgroundRepeat: "no-repeat",
      },
    });
    el.dataset.cols = sheet.cols;
    el.dataset.rows = sheet.rows;
    setFrame(el, frameIndex(sheet, pose));
    el._sheet = sheet;
    return el;
  }
  if (a?.base?.src) {
    const img = h("img", { src: `assets/${a.base.src}`, alt: "", draggable: false });
    if (a.poses) {
      img._poses = { idle: a.base.src, ...Object.fromEntries(Object.entries(a.poses).map(([k, v]) => [k, v.src])) };
      for (const src of Object.values(img._poses)) new Image().src = `assets/${src}`; // warm the cache so pose swaps don't flicker
    }
    return img;
  }
  if (manifest.assets[id]?.base?.src) return h("img", { src: `assets/${manifest.assets[id].base.src}`, alt: "", draggable: false });
  const holder = h("div.holo");
  holder.style.width = "100%";
  holder.style.height = "100%";
  holder.innerHTML = placeholderSvg(id, `s${++uid}`);
  return holder;
}

function frameIndex(sheet, pose) {
  if (sheet.frames && typeof sheet.frames === "object" && pose in sheet.frames) return sheet.frames[pose];
  return (sheet.cols >= 3 ? BATTLE_FRAMES : FIEND_FRAMES)[pose] ?? 0;
}

function setFrame(el, i) {
  el._frame = i;
  const cols = Number(el.dataset.cols);
  const rows = Number(el.dataset.rows);
  const x = cols > 1 ? ((i % cols) / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (Math.floor(i / cols) / (rows - 1)) * 100 : 0;
  el.style.backgroundPosition = `${x}% ${y}%`;
}

/** The raw manifest entry for an id (game ids like "knight" work too). */
export function assetInfo(id) {
  return manifest.assets[id] || manifest.assets[artId(id)] || null;
}

const sheetImages = new Map();
function sheetImage(src) {
  let img = sheetImages.get(src);
  if (!img) {
    img = new Image();
    img.src = `assets/${src}`;
    sheetImages.set(src, img);
  }
  return img;
}

/**
 * What a sprite is showing right now, for the living-sprite renderer:
 * { image, sx, sy, sw, sh, kind: "sheet" | "image" }, or null for holograms
 * and for art that hasn't loaded yet.
 */
export function currentFrame(spriteEl) {
  const sheet = spriteEl.querySelector(".body > .sheet");
  if (sheet?._sheet) {
    const sh = sheet._sheet;
    const img = sheetImage(sh.src);
    if (!img.complete || !img.naturalWidth) return null;
    const cw = img.naturalWidth / sh.cols;
    const ch = img.naturalHeight / sh.rows;
    const i = sheet._frame || 0;
    return { image: img, sx: (i % sh.cols) * cw, sy: Math.floor(i / sh.cols) * ch, sw: cw, sh: ch, kind: "sheet" };
  }
  const img = spriteEl.querySelector(".body > img");
  if (img && img.complete && img.naturalWidth) return { image: img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight, kind: "image" };
  return null;
}

// ---------------------------------------------------------------- effect flipbooks

/**
 * Play a painted effect sheet (fx_slash, fx_fire, …) once at x,y (its
 * center), size px wide. Resolves when it's done. Returns null if that
 * effect isn't painted, so callers can fall back to particles.
 */
export function playEffect(layer, id, x, y, { size = 300, fps, flip = false, rotate = 0 } = {}) {
  const sheet = manifest.assets[id]?.sheet;
  if (!sheet?.src || !sheet.cols) return null;
  const frames = typeof sheet.frames === "number" ? sheet.frames : sheet.cols * sheet.rows;
  const el = h("div.fx-sheet", {
    style: {
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundImage: `url("assets/${sheet.src}")`,
      backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
      mixBlendMode: sheet.blend || "screen",
      transform: `translate(-50%, -50%)${flip ? " scaleX(-1)" : ""}${rotate ? ` rotate(${rotate}deg)` : ""}`,
    },
  });
  el.dataset.cols = sheet.cols;
  el.dataset.rows = sheet.rows;
  layer.append(el);
  const step = 1000 / (fps || sheet.fps || 24);
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (i >= frames || !el.isConnected) {
        el.remove();
        return resolve();
      }
      setFrame(el, i++);
      setTimeout(tick, step);
    };
    tick();
  });
}

/** Is this effect painted? */
export const hasEffect = (id) => Boolean(manifest.assets[id]?.sheet?.src);

// ---------------------------------------------------------------- portraits

/**
 * A character's face in a mood (neutral, laughing, angry, shocked, smug,
 * worried), from its expression sheet. Falls back to artFor.
 */
export function portraitFor(id, mood = "neutral") {
  const sheet = manifest.assets[artId(id)]?.portraits;
  if (!sheet?.src || !sheet.cols) return artFor(id);
  const el = h("div.sheet.portrait", {
    style: {
      width: "100%",
      height: "100%",
      backgroundImage: `url("assets/${sheet.src}")`,
      backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
      backgroundRepeat: "no-repeat",
    },
  });
  el.dataset.cols = sheet.cols;
  el.dataset.rows = sheet.rows;
  el._sheet = sheet;
  setMood(el, mood);
  return el;
}

/** Change a portrait's mood in place. */
export function setMood(el, mood) {
  const sheet = el?._sheet;
  if (!sheet) return;
  const i = sheet.frames?.[mood] ?? sheet.frames?.neutral ?? 0;
  setFrame(el, i);
}

// ---------------------------------------------------------------- measuring art

const tops = new Map();

/**
 * Fraction (0..1) of a frame's height above its painted body. It skips
 * thin bits that rise above the body (a raised blade, a staff tip, a
 * spark), so a label sits on the character, not on the tip of a sword.
 */
function frameTop(src, cell, frame, cols) {
  const key = `${src}#${frame}`;
  if (!tops.has(key)) {
    tops.set(
      key,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const [cw, ch] = cell || [img.naturalWidth, img.naturalHeight];
            const sx = cols ? (frame % cols) * cw : 0;
            const sy = cols ? Math.floor(frame / cols) * ch : 0;
            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            const g = canvas.getContext("2d", { willReadFrequently: true });
            g.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
            const data = g.getImageData(0, 0, cw, ch).data;
            // a row belongs to the body once it's at least 6% of the frame wide
            const need = Math.max(4, Math.round(cw * 0.06));
            for (let y = 0; y < ch; y++) {
              let run = 0;
              for (let x = 0; x < cw; x++) {
                if (data[(y * cw + x) * 4 + 3] > 40) run += 1;
              }
              if (run >= need) return resolve(y / ch);
            }
            resolve(0);
          } catch {
            resolve(0);
          }
        };
        img.onerror = () => resolve(0);
        img.src = `assets/${src}`;
      }),
    );
  }
  return tops.get(key);
}

/**
 * Where the painted art starts inside a sprite box, in pixels from the box
 * top (null for holograms, which fill their box). Sheets fill the box
 * height; single images sit at the bottom, scaled to fit.
 */
export async function artTop(spriteEl) {
  const sheet = spriteEl.querySelector(".sheet");
  const boxH = parseFloat(spriteEl.style.height);
  const boxW = parseFloat(spriteEl.style.width);
  if (sheet?._sheet) {
    const sh = sheet._sheet;
    return boxH * (await frameTop(sh.src, sh.cell, frameIndex(sh, "idle"), sh.cols));
  }
  const img = spriteEl.querySelector("img");
  if (img) {
    if (!img.complete) await new Promise((r) => img.addEventListener("load", r, { once: true }));
    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const drawnH = img.naturalHeight * scale;
    const src = img.getAttribute("src").replace(/^assets\//, "");
    return boxH - drawnH + drawnH * (await frameTop(src, null, 0, 0));
  }
  return null;
}

/** Switch a sprite's pose (only sheets have real poses; holograms just animate). */
export function setPose(spriteEl, pose) {
  if (pose === "idle" && spriteEl.dataset.idle) pose = spriteEl.dataset.idle;
  const sheet = spriteEl.querySelector(".sheet");
  if (sheet?._sheet) return setFrame(sheet, frameIndex(sheet._sheet, pose));
  const img = spriteEl.querySelector("img");
  if (img?._poses) {
    const src = img._poses[pose] || img._poses[BOSS_POSES[pose]] || img._poses.idle;
    if (!img.src.endsWith(src)) img.src = `assets/${src}`;
  }
}

/** Build a positioned sprite. size = [width, height] in stage pixels; x,y = feet position. */
export function makeSprite({ id, side, x, y, size, label, flip = false }) {
  const art = artFor(id);
  if (flip) art.style.transform = "scaleX(-1)"; // on the art, since .body's bob animation owns its transform
  const body = h(`div.body${art.classList.contains("sheet") ? ".sheet-body" : ""}`, {}, art);
  const painted = !art.classList.contains("holo");
  const el = h(
    `div.sprite.${side}.${painted ? "painted" : "holo"}`,
    { style: { left: `${x}px`, top: `${y}px`, width: `${size[0]}px`, height: `${size[1]}px` } },
    h("div.shadow"),
    body,
  );
  if (label) el.append(label);
  // Out-of-sync bobbing looks alive.
  body.style.animationDelay = `${(-Math.random() * 2.8).toFixed(2)}s`;
  return el;
}

/** Center of a sprite in stage coordinates (for effects). */
export function spriteCenter(el, { up = 0.5 } = {}) {
  const x = parseFloat(el.style.left);
  const y = parseFloat(el.style.top) - parseFloat(el.style.height) * up;
  return { x, y };
}

// ---------------------------------------------------------------- motion

export function lunge(el, dx, ms = 360) {
  return el.animate(
    [
      { transform: "translate(-50%, -100%)" },
      { transform: `translate(calc(-50% + ${dx}px), -100%)`, offset: 0.4 },
      { transform: `translate(calc(-50% + ${dx}px), -100%)`, offset: 0.55 },
      { transform: "translate(-50%, -100%)" },
    ],
    { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)" },
  ).finished;
}

export function recoil(el, dx = 18) {
  el.animate(
    [
      { transform: "translate(-50%, -100%)", filter: "brightness(3)" },
      { transform: `translate(calc(-50% + ${dx}px), -100%)`, filter: "brightness(1.6)", offset: 0.3 },
      { transform: `translate(calc(-50% - ${dx / 2}px), -100%)`, offset: 0.6 },
      { transform: "translate(-50%, -100%)", filter: "brightness(1)" },
    ],
    { duration: 360 },
  );
}

export function dodge(el, dx = -50) {
  return el.animate(
    [
      { transform: "translate(-50%, -100%)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-100% - 10px))`, opacity: 0.6, offset: 0.4 },
      { transform: "translate(-50%, -100%)", opacity: 1 },
    ],
    { duration: 420, easing: "ease-out" },
  ).finished;
}

export function vanish(el) {
  return el.animate(
    [
      { transform: "translate(-50%, -100%) scale(1)", opacity: 1, filter: "brightness(1)" },
      { transform: "translate(-50%, -100%) scale(1.05)", opacity: 1, filter: "brightness(3)", offset: 0.2 },
      { transform: "translate(-50%, -100%) scale(0.85)", opacity: 0, filter: "brightness(4)" },
    ],
    { duration: 900, easing: "ease-in", fill: "forwards" },
  ).finished;
}
