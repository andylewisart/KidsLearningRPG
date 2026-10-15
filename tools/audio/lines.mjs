// Every fixed line the game can say, for pre-recording: [{ who, text }].
// who: "kit" for the droid, a hero class (knight, gunner, spellwright, titancaller,
// beastkeeper), "narrator", "jumble", chapter 2's people (clamp, who also speaks the
// Drain Engine's barks, keeper, hal, baker, swordmaster), or "spelling" (the voice
// that reads spelling words).
// Lines with ${…} in the source are built at runtime and stay live.

import { QUIPS } from "../../src/content/quips.js";
import { TRAINING, FIEND_TYPES } from "../../src/battle/data.js";
import { KIT_LINES } from "../../src/content/kitLines.js";
import { BARKS, BANTER, ENGINE_BARKS } from "../../src/content/barks.js";
import { WORDS, parseWord } from "../../src/content/words.js";
import { storyLines } from "../../src/world/story.js";
import { CONVOS2 } from "../../src/world/lines2.js";
import { FIXED_HINT_LINES } from "../../src/learn/hints.js";
import { TIME_HINT_LINES } from "../../src/learn/measure.js";
import { dictationLine } from "../../src/learn/spelling.js";

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
  // Kit's matchup hints come in two parts: the fiend type's, then a quip (battle.js, matchupHint)
  Object.values(FIEND_TYPES).forEach((f) => f.bounce && (add("kit", f.hint), add("kit", f.bounce)));
  BARKS.forEach((b) => add(b.who, b.text));
  ENGINE_BARKS.forEach((b) => add(b.who, b.text));
  BANTER.forEach((ex) => ex.lines.forEach((l) => add(l.who, l.text)));
  // the adventure: everyone's dialogue, the narrator and Captain Jumble
  storyLines().forEach((l) => add(l.who, l.text));
  // Kit's built-in help (the lines with no numbers in them), and chapter 2's for telling time
  FIXED_HINT_LINES.forEach((t) => add("kit", t));
  Object.values(TIME_HINT_LINES).forEach((t) => add("kit", t));
  // spelling dictation: the word, its sentence, the word again
  WORDS.forEach((e) => add("spelling", dictationLine(parseWord(e.w).word, e.s)));
  return out;
}

/**
 * Kit's lines that aren't recorded yet, which play as text until they are.
 * Empty: the 77 that waited after the run of 14 October (his chapter 2
 * lessons, nudges, Grid, camp and wild-fight lines, the hat chase and the
 * time hints) were recorded on 15 October. When a run has to stop short
 * again, name what's left by where it lives: a CONVOS2 conversation (every
 * Kit line in it), a KIT_LINES key or a TIME_HINT_LINES key. Record them,
 * then take them off this list.
 */
export const UNRECORDED = {
  convos: [],
  kitLines: [],
  timeHints: [],
};

/** The lines UNRECORDED names, as "who|text" keys (a name that no longer exists throws). */
export function unrecordedLines() {
  const named = (table, key, what) => {
    if (!(key in table)) throw new Error(`UNRECORDED names a ${what} that doesn't exist: ${key}`);
    return table[key];
  };
  const lines = [
    ...UNRECORDED.convos.flatMap((k) => named(CONVOS2, k, "conversation").filter((l) => l.who === "kit")),
    ...UNRECORDED.kitLines.map((k) => ({ who: "kit", text: named(KIT_LINES, k, "Kit line") })),
    ...UNRECORDED.timeHints.map((k) => ({ who: "kit", text: named(TIME_HINT_LINES, k, "time hint") })),
  ];
  return new Set(lines.map((l) => `${l.who}|${l.text}`));
}
