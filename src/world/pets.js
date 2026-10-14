// Tamsin's creatures (chapter 2): fiends he's captured, remembered into
// friends (docs/story/chapter2-script.md, beats 4 and 9). Pure; the save
// keeps them in world.pets (state.js freshWorld).

import { PETS } from "./data2.js";
import { petSlotOpen, petPower } from "./grid.js";

/**
 * How a pet grows: it fights beside its hero, and each ★★ or ★★★ problem
 * that hero gets right first time, with the pet there, counts (ui/battle.js
 * reports them; afterBattle adds them up). Hard answers are the ones at his
 * edge, so a pet grows as its hero's skill does. At these totals it's ready
 * for its next form, which Tamsin brings out at her nests with a new field note.
 */
export const PET_GROWTH = { 2: 12, 3: 30 };

/**
 * The pets she can remember now: a captured fiend of the right kind, not yet
 * given its name back. `captures` is the save's collection.captures (fiend id → count).
 */
export function rememberable(w, captures = {}) {
  return Object.entries(PETS)
    .filter(([id, p]) => !w.pets?.[id] && id !== "rivet" && (captures[p.from] || 0) > 0)
    .map(([id]) => id);
}

/** A pet given its name back: it goes to its hero. `note` is his field note, read back in the ending. */
export function hatchPet(w, id, note = "") {
  if (!PETS[id] || w.pets?.[id]) return;
  w.pets ||= {};
  w.pets[id] = { owner: PETS[id].owner, stage: 1, notes: note ? [note] : [] };
}

/**
 * After a fight: each pet's hard answers (a battle result's `growth`, pet id →
 * count). A pet that reaches its next form's total is `ready`. Returns the
 * ids of pets that just became ready.
 */
export function petGrowth(w, growth = {}) {
  const ready = [];
  for (const [id, n] of Object.entries(growth || {})) {
    const p = w.pets?.[id];
    if (!p || !(n > 0)) continue;
    p.growth = (p.growth || 0) + n;
    const next = PET_GROWTH[(p.stage || 1) + 1];
    if (next && p.growth >= next && !p.ready) {
      p.ready = true;
      ready.push(id);
    }
  }
  return ready;
}

/** A pet grows a stage (once it's `ready`, at her nests); his new field note goes with it. */
export function growPet(w, id, note = "") {
  const p = w.pets?.[id];
  if (!p || p.stage >= 3) return;
  p.stage += 1;
  p.ready = false;
  if (note) p.notes.push(note);
  // already past the next form's total: ready again
  const next = PET_GROWTH[p.stage + 1];
  if (next && (p.growth || 0) >= next) p.ready = true;
}

/**
 * The pets in a fight: each one beside its hero, if that hero is in the
 * party and has a pet slot open on the Crystal Grid (Cade's comes with
 * Rivet). { cls: { id, species, stage, power } } for battle/engine.js
 * (createBattle); power, from Tamsin's nodes, only once it's past ×1.
 */
export function battlePets(w) {
  const out = {};
  const power = petPower(w);
  for (const [id, p] of Object.entries(w.pets || {})) {
    if (!PETS[id] || !w.party?.includes(p.owner) || out[p.owner] || !petSlotOpen(w, p.owner)) continue;
    out[p.owner] = { id, species: PETS[id].species, stage: Math.max(1, Math.min(3, p.stage || 1)), ...(power > 1 ? { power } : {}) };
  }
  return out;
}
