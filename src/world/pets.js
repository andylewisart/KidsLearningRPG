// Tamsin's creatures (chapter 2): fiends he's captured, remembered into
// friends (docs/story/chapter2-script.md, beats 4 and 9). Pure; the save
// keeps them in world.pets (state.js freshWorld).

import { PETS } from "./data2.js";

/**
 * The pets she can remember now: a captured fiend of the right kind, not yet
 * given its name back. `captures` is the save's collection.captures (fiend id → count).
 */
export function rememberable(w, captures = {}) {
  return Object.entries(PETS)
    .filter(([id, p]) => !w.pets?.[id] && id !== "rivet" && ((captures[p.from] || 0) > 0 || (p.standIn && (captures[p.standIn] || 0) > 0)))
    .map(([id]) => id);
}

/** A pet given its name back: it goes to its hero. `note` is his field note, read back in the ending. */
export function hatchPet(w, id, note = "") {
  if (!PETS[id] || w.pets?.[id]) return;
  w.pets ||= {};
  w.pets[id] = { owner: PETS[id].owner, stage: 1, notes: note ? [note] : [] };
}

/** A pet grows a stage (phase B decides when it's ready: pets[id].ready); his new field note goes with it. */
export function growPet(w, id, note = "") {
  const p = w.pets?.[id];
  if (!p || p.stage >= 3) return;
  p.stage += 1;
  p.ready = false;
  if (note) p.notes.push(note);
}
