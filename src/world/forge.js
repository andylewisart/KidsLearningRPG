// The Sword Master's forge (chapter 2, beat 8; docs/story/chapter2-proposal.md):
// each hero's signature weapon, forged up in two steps for parts and glimmer
// ("fiend parts and gold", in his words). Beaten fiends leave parts behind (a
// big one leaves more), and Honest Hal sells bags of blade bits for the price
// of catching his sum. The glimmer is the Crystal Grid's light (grid.js), so
// he chooses between a weapon's next step and a node or two. A forged weapon
// makes every hit of its hero's land harder, and lights the weapon nodes on
// that hero's road on the Grid. The Legendary Weapons come later: each needs
// a crest from a hidden boss (the Sage library's crest map points to the
// first). Pure, so it's tested (test/grid.test.js); the save keeps it in
// world.forge: { parts, steps: { cls: 0, 1 or 2 } }, and the glimmer in
// world.grid.light.

import { FIENDS } from "../battle/data.js";
import { PARTY_ORDER } from "./data.js";

/**
 * Each hero's weapon (art wave 08, Section I: icons/weapons_ch2, a picture
 * for each step): what they fight with now, and its two forged steps.
 */
export const WEAPONS = {
  knight: { now: "sword", steps: [null, { name: "Shard Sword", icon: "ally_knight_1" }, { name: "Sharkfin Blade", icon: "ally_knight_2" }] },
  gunner: { now: "blasters", steps: [null, { name: "Brass-Fin Blasters", icon: "ally_gunner_1" }, { name: "Storm Blasters", icon: "ally_gunner_2" }] },
  spellwright: { now: "spellbook", steps: [null, { name: "Gold-Clasp Spellbook", icon: "ally_spellwright_1" }, { name: "Book of Flying Pages", icon: "ally_spellwright_2" }] },
  titancaller: { now: "staff", steps: [null, { name: "Coral Crown Staff", icon: "ally_titancaller_1" }, { name: "Living Tide Staff", icon: "ally_titancaller_2" }] },
  beastkeeper: { now: "crook", steps: [null, { name: "Amber Crook", icon: "ally_beastkeeper_1" }, { name: "Greenwood Crook", icon: "ally_beastkeeper_2" }] },
};

/**
 * What each step costs, in parts and in glimmer. The parts set the pace (a
 * step every few fights); the glimmer is about a fight's worth for the
 * first step and two for the second (grid.js, glimmerFor).
 */
export const FORGE_COST = { 1: 6, 2: 12 };
export const FORGE_GLIMMER = { 1: 50, 2: 100 };

/** How much harder a hero's hits land with each step (added to their strength from the Grid). */
export const WEAPON_POWER = { 0: 0, 1: 0.1, 2: 0.2 };

/** Parts a beaten fiend leaves behind: one, two from a big one (a Barnacle Brute's borrowed door), a pile from a boss. */
export const PARTS = { small: 1, big: 2, boss: 6 };
const BIG_HP = 600;

/** A bag of blade bits from Hal's shop (world/chapter2.js, hal): for catching his sum. */
export const HAL_BITS = 3;

export function freshForge() {
  return { parts: 0, steps: {} };
}

/** The save's forge, made whole in place (a save from before the forge gets an empty one). */
export function forgeOf(w) {
  const fg = (w.forge ||= freshForge());
  if (!fg.steps || typeof fg.steps !== "object") fg.steps = {};
  if (!Number.isFinite(fg.parts) || fg.parts < 0) fg.parts = 0;
  return fg;
}

/** The parts a fight's beaten fiends leave behind (a battle result's stats.defeated: fiend ids). */
export function partsFor(defeated = []) {
  let n = 0;
  for (const id of defeated) {
    const f = FIENDS[id];
    if (!f) continue;
    n += f.boss ? PARTS.boss : f.hp >= BIG_HP ? PARTS.big : PARTS.small;
  }
  return n;
}

export function addParts(w, n) {
  const fg = forgeOf(w);
  fg.parts += Math.max(0, Math.round(n || 0));
  return fg.parts;
}

/** How far a hero's weapon is forged: 0 (as they found it), 1 or 2. */
export const weaponStep = (w, cls) => Math.max(0, Math.min(2, w.forge?.steps?.[cls] || 0));

/** How much harder a hero's hits land with their weapon as it is. */
export const weaponPower = (w, cls) => WEAPON_POWER[weaponStep(w, cls)];

/** A hero's weapon as it is: { step, name, icon, power } (no name or icon before it's forged). */
export function weaponOf(w, cls) {
  const step = weaponStep(w, cls);
  const s = WEAPONS[cls]?.steps[step];
  return { step, name: s?.name || null, icon: s?.icon || null, power: WEAPON_POWER[step] };
}

/** The next step for a hero's weapon: { step, name, icon, parts, glimmer, power }, or null once it's fully forged. */
export function nextStep(w, cls) {
  const step = weaponStep(w, cls) + 1;
  const s = WEAPONS[cls]?.steps[step];
  return s ? { step, ...s, parts: FORGE_COST[step], glimmer: FORGE_GLIMMER[step], power: WEAPON_POWER[step] } : null;
}

/** The glimmer he has (the Crystal Grid's light: grid.js, gridOf). */
export const glimmerOf = (w) => Math.max(0, Number.isFinite(w.grid?.light) ? w.grid.light : 0);

/** How much more of each a step needs: { parts, glimmer } (0 when there's enough). */
function shortOf(w, next) {
  return { parts: Math.max(0, next.parts - (w.forge?.parts || 0)), glimmer: Math.max(0, next.glimmer - glimmerOf(w)) };
}

/**
 * The Sword Master forges a hero's next step, if there are parts and glimmer
 * enough. Returns { ok: true, step }, or { ok: false, why: "done" }, or
 * { ok: false, why: "short", parts, glimmer }: how much more of each it needs.
 */
export function forge(w, cls) {
  const next = WEAPONS[cls] && nextStep(w, cls);
  if (!next) return { ok: false, why: "done" };
  const fg = forgeOf(w);
  const short = shortOf(w, next);
  if (short.parts || short.glimmer) return { ok: false, why: "short", ...short };
  fg.parts -= next.parts;
  if (next.glimmer) w.grid.light -= next.glimmer;
  fg.steps[cls] = next.step;
  return { ok: true, step: next.step };
}

/** Is there a step he has the parts and glimmer for? (The forge glints.) */
export const forgeReady = (w, heroes = PARTY_ORDER) =>
  heroes.some((cls) => {
    const next = nextStep(w, cls);
    if (!next) return false;
    const short = shortOf(w, next);
    return !short.parts && !short.glimmer;
  });

/** Every hero's weapon is as good as he can make it ("I can do no more"). */
export const forgeDone = (w, heroes = PARTY_ORDER) => heroes.every((cls) => !nextStep(w, cls));
