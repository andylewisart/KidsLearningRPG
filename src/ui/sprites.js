// Sprites. Real art comes from public/assets/manifest.json (made by Codex,
// see art/PRODUCTION.md); anything not painted yet falls back to the
// holo-training hologram placeholders, so the game always runs.

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
  const src = manifest.assets[id]?.[key]?.src;
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
    if (a.poses) img._poses = { idle: a.base.src, ...Object.fromEntries(Object.entries(a.poses).map(([k, v]) => [k, v.src])) };
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
  const cols = Number(el.dataset.cols);
  const rows = Number(el.dataset.rows);
  const x = cols > 1 ? ((i % cols) / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (Math.floor(i / cols) / (rows - 1)) * 100 : 0;
  el.style.backgroundPosition = `${x}% ${y}%`;
}

/** Switch a sprite's pose (only sheets have real poses; holograms just animate). */
export function setPose(spriteEl, pose) {
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
  const el = h(
    `div.sprite.${side}`,
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
