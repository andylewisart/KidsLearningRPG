// Every fixed line the game can say, for pre-recording: [{ who, text }].
// who: "kit" for the droid, or a hero class (knight, gunner, spellwright, titancaller).
// Lines with ${…} in the source are built at runtime and stay live.

import { QUIPS } from "../../src/content/quips.js";
import { TRAINING } from "../../src/battle/data.js";
import { KIT_LINES } from "../../src/content/kitLines.js";
import { BARKS, BANTER } from "../../src/content/barks.js";

export function allLines() {
  const out = [];
  const seen = new Set();
  const add = (who, text) => {
    const t = String(text || "").trim();
    if (!t || seen.has(`${who}|${t}`)) return;
    seen.add(`${who}|${t}`);
    out.push({ who, text: t });
  };
  for (const list of Object.values(QUIPS)) list.forEach((t) => add("kit", t));
  TRAINING.forEach((t) => add("kit", t.intro));
  Object.values(KIT_LINES).forEach((t) => add("kit", t));
  BARKS.forEach((b) => add(b.who, b.text));
  BANTER.forEach((ex) => ex.lines.forEach((l) => add(l.who, l.text)));
  return out;
}
