// Chapter 2's puzzles (Driftwood Harbor, docs/story/chapter2-script.md): the
// clock tower, Hal's totals, the baker's recipe, the fog signs, Rivet's
// schedule and supper, the field notes, the tide table and the words that
// wake Beaconwing. The same shape as chapter 1's (puzzles.js), built at the
// grade of whoever's turn it is: a younger player sets the clock to the half
// hour or reads a simpler scale, and gives a compound word its other half.
// The recorded lines never say a number or a word: every one is made here.

import { genMulDiv, equationText, diagnoseMulDiv } from "../learn/muldiv.js";
import { mulDivHint } from "../learn/hints.js";
import { genTime, timeText, timeAnswerText, checkTime, diagnoseTime, timeHint, genMeasure, measureEquation, measureVisual, diagnoseMeasure, measureHint } from "../learn/measure.js";
import { heuristicJudge, isOwnSentence } from "../learn/writing.js";
import { LADDERS } from "../learn/skills.js";
import { PATTERNS, WORDS, parseWord } from "../content/words.js";

const tierSkill = (mastery, ladder, tier, rng) => mastery.pickTiers(ladder, rng)[tier === 1 ? 1 : 2];
const gradeIn = (mastery, track) => mastery?.gradeOf?.(track) ?? 3;

// ---------------------------------------------------------------- telling time

/** A clock-setting problem: the face starts where `from` says, he sets it to the answer. */
function clockQuestion(p, { title, ask, from, tutorAsk = ask }) {
  return {
    skill: p.skill,
    tier: 2,
    problem: p,
    panel: { kind: "clock", title, ask, clock: { start: from }, equation: timeAnswerText(p).replace(/\d/g, "?") },
    answerText: timeAnswerText(p),
    grade: (v) => {
      const correct = checkTime(p, v);
      return { correct, code: correct ? null : diagnoseTime(p, v)?.code || "other" };
    },
    hint: (v) => timeHint(p, v),
    tutor: { prompt: tutorAsk, equation: p.op === "end" ? `${timeText(p.start)} + ${p.mins} minutes` : `set the clock to ${timeAnswerText(p)}`, answer: timeAnswerText(p) },
  };
}

/** The time skill to set a clock with: his rung on the ladder, but never "elapsed" (that's not reading a clock). */
function readSkill(mastery, tier, rng) {
  const { skill } = tierSkill(mastery, LADDERS.time, tier, rng);
  return skill === "time.elapsed" ? "time.minute" : skill;
}

/** The harbor's clock tower: set it from the tide board, chalked by hand (3.MD.1, to the minute). */
export function clockPuzzle({ mastery, rng, tier = 2 }) {
  const p = genTime(readSkill(mastery, tier, rng), rng);
  const ask = `The tide board says the tide turned at ${timeText(p.time)}. Set the clock tower's hands to match.`;
  // the scrambled hands point at each other: the long hand on the 12, the short one near the 6
  const q = clockQuestion(p, { title: "The Clock Tower", ask, from: { h: 6, m: 0 } });
  return { ...q, tier };
}

/**
 * Rivet's feeding schedule: how long since it ate (elapsed time, 3.MD.1). A
 * younger player sets the clock to its supper time instead.
 */
export function feedPuzzle({ mastery, rng, tier = 2 }) {
  if (gradeIn(mastery, "time") < 3) {
    const p = genTime(readSkill(mastery, tier, rng), rng);
    const ask = `Rivet eats supper at ${timeText(p.time)}. Set the menagerie clock to supper time.`;
    return { ...clockQuestion(p, { title: "Rivet's Feeding Schedule", ask, from: { h: 12, m: 0 } }), tier };
  }
  const p = genTime("time.elapsed", rng, { op: "between" });
  const ask = `The schedule says it ate at ${timeText(p.start)}. The clock says it's ${timeText(p.end)} now. How many minutes since it ate?`;
  return {
    skill: p.skill,
    tier,
    problem: p,
    panel: { kind: "number", title: "Rivet's Feeding Schedule", ask, equation: "minutes", support: { kind: "clocks", clocks: [{ ...p.start, label: "It ate" }, { ...p.end, label: "Now" }] } },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = checkTime(p, v);
      return { correct, code: correct ? null : diagnoseTime(p, v)?.code || "other" };
    },
    hint: (v) => timeHint(p, v),
    tutor: { prompt: ask, equation: `${timeText(p.start)} to ${timeText(p.end)}`, answer: p.answer },
  };
}

/** The smugglers' tide table: when does low tide end? (elapsed time, 3.MD.1). A younger player sets the clock to low tide. */
export function tidePuzzle({ mastery, rng, tier = 2 }) {
  if (gradeIn(mastery, "time") < 3) {
    const p = genTime(readSkill(mastery, tier, rng), rng);
    const ask = `The tide table, cut in the rock: "Low tide: ${timeText(p.time)}." Set the clock to low tide.`;
    return { ...clockQuestion(p, { title: "The Tide Table", ask, from: { h: 12, m: 0 } }), tier };
  }
  const p = genTime("time.elapsed", rng, { op: "end" });
  const ask = `The tide table, cut in the rock: "Low tide at ${timeText(p.start)}. It lasts ${p.mins} minutes." Set the clock to when we have to be out.`;
  return { ...clockQuestion(p, { title: "The Tide Table", ask, from: p.start }), tier };
}

// ---------------------------------------------------------------- Hal's totals

/** Hal's shop, and what's for sale. */
const HAL_ITEMS = [
  ["the admiral's tea cozy", "payments"],
  ["tins of pet food", "tins"],
  ["bags of blade bits", "bags"],
  ["jars of pickled kelp", "jars"],
  ["\"genuine\" treasure maps", "maps"],
];

/**
 * Catch Hal's sum: his board totals a sale, always wrong in his favor, and he
 * works out the true total (multiples of 10 and ×6 to ×9, 3.OA.7, 3.NBT.3).
 * `item` 0 is the tea cozy, the first sale.
 */
export function halPuzzle({ mastery, rng, tier = 2, item = null }) {
  let { skill, support } = tierSkill(mastery, LADDERS.mul, tier, rng);
  // a shop has prices, not shares: division and skip counting become their times fact
  skill = { "div.easy": "mul.easy", "div.34": "mul.34", "div.hard": "mul.69", "mul.unknown": "mul.78", "mul.skip": "mul.groups", "mul.count10": "mul.groups" }[skill] || skill;
  let p = genMulDiv(skill, rng);
  for (let i = 0; i < 20 && (p.a < 2 || p.b < 2); i++) p = genMulDiv(skill, rng);
  // Hal's board is always high: a whole price too many, or a ten, or a few coins
  const over = rng.pick([p.b, 10, rng.int(2, 9)].filter((n) => n > 0));
  const wrong = p.answer + over;
  const [what, unit] = HAL_ITEMS[item ?? rng.int(1, HAL_ITEMS.length - 1)];
  const ask = item === 0 ? `Hal's board: the admiral's tea cozy, in ${p.a} easy payments of ${p.b} gold. TOTAL: ${wrong} gold. What's the true total?` : `Hal's board: ${p.a} ${what}, ${p.b} gold each. TOTAL: ${wrong} gold. What's the true total?`;
  const equation = p.op === "groups" ? equationText(p) : `${p.a} × ${p.b}`;
  return {
    skill: p.skill,
    tier,
    problem: { ...p, wrong, unit },
    panel: { kind: "number", title: "Catch Hal's Sum", ask, equation, support: (support || p.op === "groups") && p.a <= 10 && p.b <= 10 ? { kind: "array", rows: p.a, cols: p.b } : null },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : Number(v) === wrong ? "trusted_hal" : diagnoseMulDiv(p, v)?.code };
    },
    hint: (v) => (Number(v) === wrong ? { text: `That's Hal's number. Work it out yourself: ${p.a} lots of ${p.b}.`, visual: p.a <= 10 && p.b <= 10 ? { kind: "array", rows: p.a, cols: p.b } : null } : mulDivHint(p, v)),
    tutor: { prompt: ask, equation, answer: p.answer },
  };
}

// ---------------------------------------------------------------- scales and jugs

/** A measuring problem in grams or milliliters, for the recipe or Rivet's supper. */
function measureQuestion({ mastery, rng, tier, unit, title, asks }) {
  let { skill } = tierSkill(mastery, LADDERS.measure, tier, rng);
  // the same rung for the other unit: the flour is weighed, the milk is poured
  if (unit === "mL" && skill === "measure.mass") skill = "measure.volume";
  if (unit === "g" && skill === "measure.volume") skill = "measure.mass";
  const p = genMeasure(skill, rng, { unit });
  const ask = asks(p);
  const equation = measureEquation(p);
  return {
    skill: p.skill,
    tier,
    problem: p,
    panel: { kind: "number", title, ask, equation, support: measureVisual(p) },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : diagnoseMeasure(p, v)?.code || "other" };
    },
    hint: (v) => measureHint(p, v),
    tutor: { prompt: ask, equation, answer: `${p.answer} ${p.unit}` },
  };
}

/** The Salty Biscuit's recipe: flour on the scale (`part` "flour"), then milk in the jug ("milk") (3.MD.2). */
export function recipePuzzle({ mastery, rng, tier = 2, part = "flour" }) {
  const flour = part !== "milk";
  return measureQuestion({
    mastery,
    rng,
    tier,
    unit: flour ? "g" : "mL",
    title: flour ? "The Recipe: Flour" : "The Recipe: Milk",
    asks: (p) => {
      if (p.op === "read") return flour ? "She pours in flour until her hands say \"that's it.\" How many grams does the scale show?" : "She pours milk into the jug until it looks just right. How many milliliters are in the jug?";
      const u = p.unit;
      if (p.op === "more") return flour ? `There's ${p.a} ${u} of flour on the scale. The whole harbor remembers: the biscuits need ${p.b} ${u}. How many more grams?` : `There's ${p.a} ${u} of milk in the jug. The recipe needs ${p.b} ${u}. How many more milliliters?`;
      if (p.op === "total") return flour ? `One sack holds ${p.a} ${u} of flour, the other ${p.b} ${u}. She tips both onto the scale. How many grams?` : `She pours ${p.a} ${u} of milk, then ${p.b} ${u} more. How many milliliters in the jug?`;
      if (p.op === "times") return flour ? `${p.a} scoops of flour, ${p.b} ${u} in each scoop. How many grams?` : `${p.a} cups of milk, ${p.b} ${u} in each. How many milliliters?`;
      return flour ? `${p.a} ${u} of flour, shared equally into ${p.b} bowls. How many grams in each bowl?` : `${p.a} ${u} of milk, shared equally into ${p.b} cups. How many milliliters in each cup?`;
    },
  });
}

/** Rivet's supper: grams on the scale, exactly (3.MD.2). */
export function weighPuzzle({ mastery, rng, tier = 2 }) {
  return measureQuestion({
    mastery,
    rng,
    tier,
    unit: "g",
    title: "Rivet's Supper",
    asks: (p) => {
      if (p.op === "read") return "Tamsin tips the fish onto the scale. How many grams is Rivet's supper?";
      if (p.op === "more") return `The chart says a Scrap Raptor eats ${p.b} g. There's ${p.a} g on the scale. How many more grams?`;
      if (p.op === "total") return `${p.a} g of fish and ${p.b} g of crunchy bolts. How many grams of supper?`;
      if (p.op === "times") return `${p.a} sardines, ${p.b} g each. How many grams of supper?`;
      return `${p.a} g of fish, shared equally between ${p.b} raptor hatchlings. How many grams each?`;
    },
  });
}

// ---------------------------------------------------------------- the fog signs

/**
 * The fog's words: a prefix or a suffix eaten away, and two pieces that make
 * no word at all (so only one answer is right), from the word bank's prefix
 * and suffix words (3.R.3.c). For a younger reader, compound words lose their
 * second half (2.R.3).
 */
export const FOG_WORDS = [
  ["unlock", "un", "dis", "pre"],
  ["rebuild", "re", "dis", "mis"],
  ["reload", "re", "dis", "im"],
  ["unlucky", "un", "re", "dis"],
  ["preview", "pre", "un", "dis"],
  ["recharge", "re", "un", "im"],
  ["unknown", "un", "re", "dis"],
  ["disappear", "dis", "un", "pre"],
  ["dishonest", "dis", "un", "re"],
  ["preheat", "pre", "un", "dis"],
  ["misspell", "mis", "un", "dis"],
  ["misfire", "mis", "un", "dis"],
  ["invisible", "in", "un", "dis"],
  ["incorrect", "in", "un", "dis"],
  ["disobey", "dis", "un", "re"],
  ["misbehave", "mis", "un", "re"],
  ["impossible", "im", "un", "dis"],
  ["careful", "ful", "ly", "ness"],
  ["fearless", "less", "ly", "ness"],
  ["harmless", "less", "ly", "ness"],
  ["quickly", "ly", "ful", "less"],
  ["darkness", "ness", "ful", "less"],
  ["weakness", "ness", "ful", "less"],
  ["kindness", "ness", "ful", "less"],
  ["powerful", "ful", "ly", "ness"],
  ["boastful", "ful", "less", "ness"],
  ["useless", "less", "ly", "ness"],
  ["priceless", "less", "ful", "ly"],
  ["safely", "ly", "ful", "less"],
  ["finally", "ly", "ful", "less"],
  ["suddenly", "ly", "ful", "less"],
];
const FOG_COMPOUNDS = [
  ["lighthouse", "light", "house", "fish", "ball"],
  ["driftwood", "drift", "wood", "fire", "hook"],
  ["shipwreck", "ship", "wreck", "apple", "worm"],
  ["campfire", "camp", "fire", "glass", "worm"],
  ["moonlight", "moon", "light", "hook", "apple"],
  ["jellyfish", "jelly", "fish", "wood", "house"],
  ["spyglass", "spy", "glass", "fire", "ball"],
  ["cannonball", "cannon", "ball", "house", "worm"],
];

const entryFor = (word) => WORDS.find((e) => parseWord(e.w).word === word);

/** One fog sign: `n` picks which (so each sign keeps its word), the rest is shuffled. */
export function fogPuzzle({ mastery, rng, tier = 2, n = null, recent = [] }) {
  const young = gradeIn(mastery, "spell") < 3;
  if (young) {
    const [word, stem, piece, ...wrong] = n != null ? FOG_COMPOUNDS[n % FOG_COMPOUNDS.length] : rng.pick(FOG_COMPOUNDS);
    return fogQuestion({ rng, tier, word, piece, wrong, skill: "spell.compound", shown: `${stem.toUpperCase()}▒▒▒`, rule: "A compound word is two words stuck together. Which word finishes it?", sentence: entryFor(word)?.s });
  }
  const fresh = FOG_WORDS.filter(([w]) => !recent.includes(w));
  const [word, piece, ...wrong] = n != null ? FOG_WORDS[n % FOG_WORDS.length] : rng.pick(fresh.length ? fresh : FOG_WORDS);
  const prefix = word.startsWith(piece);
  const stem = prefix ? word.slice(piece.length) : word.slice(0, word.length - piece.length);
  const skill = prefix ? "spell.prefix" : "spell.suffix_ful_less";
  return fogQuestion({ rng, tier, word, piece, wrong, skill, shown: prefix ? `▒▒▒${stem.toUpperCase()}` : `${stem.toUpperCase()}▒▒▒`, prefix, rule: PATTERNS[prefix ? "prefix" : "suffix_ful_less"].rule, sentence: entryFor(word)?.s });
}

function fogQuestion({ rng, tier, word, piece, wrong, skill, shown, prefix = false, rule, sentence }) {
  const label = (x) => (skill === "spell.compound" ? x : prefix ? `${x}-` : `-${x}`);
  const choices = rng.shuffle([piece, ...wrong]).map(label);
  const blanked = sentence ? sentence.replace(new RegExp(`\\b${word}\\b`, "i"), "_____") : "";
  const ask = `The sign reads ${shown}. The fog ate part of it. Which piece gives the word back?${blanked ? ` (Like this: "${blanked}")` : ""}`;
  return {
    skill,
    tier,
    word,
    panel: { kind: "choice", title: "The Fog Sign", ask, choices },
    answerText: label(piece),
    grade: (v) => {
      const correct = v === label(piece);
      return { correct, code: correct ? null : "pattern" };
    },
    hint: () => ({ text: rule, visual: { kind: "word", before: prefix ? "" : word.slice(0, word.length - piece.length), focus: "?".repeat(piece.length), after: prefix ? word.slice(piece.length) : "", rule: "" } }),
    tutor: { prompt: ask, equation: "", answer: word },
  };
}

// ---------------------------------------------------------------- writing

/** A field note on one of the menagerie's creatures: what it looks like and what it does (3.W.2). */
export function notePuzzle({ mastery, pet = "Rivet", grown = false } = {}) {
  const title = grown ? `${pet}'s New Field Note` : `Field Note: ${pet}`;
  if (gradeIn(mastery, "write") < 3) {
    const ask = grown ? `Write a sentence about ${pet} now. What's changed?` : `Write a sentence about ${pet}. What does it look like?`;
    return {
      skill: "write.own",
      tier: 3,
      panel: { kind: "text", title, ask, placeholder: `${pet}…`, minWords: 3, submitLabel: "Write it down (Ctrl+Enter)" },
      answerText: "a sentence about the creature",
      grade: (v) => {
        const ok = isOwnSentence(v);
        return { correct: ok, code: ok ? null : "too_short" };
      },
      hint: () => ({ text: `Start with "${pet} has", then say one thing you can see. A color? A shield?`, visual: null }),
      tutor: { prompt: ask, equation: "", answer: "any sentence of three or more words about the creature" },
    };
  }
  const ask = grown ? `Write ${pet}'s new field note. What's changed? What can it do now? Every true detail makes it stronger.` : `Write ${pet}'s field note: what it looks like, and what it does. If it's written down, the dark can't have it.`;
  return {
    skill: "write.inform",
    tier: 3,
    panel: { kind: "text", title, ask, placeholder: `${pet} is…`, minWords: 8, submitLabel: "Write it down (Ctrl+Enter)" },
    answerText: "a note with at least one true detail about how it looks or what it does",
    aiWriting: { task: `an informative field note about ${pet}, a small rebuilt creature, saying what it looks like and what it does` },
    grade: (v, ai = null) => {
      const r = ai || heuristicJudge(v);
      const ok = r.moves.length >= 1;
      return { correct: ok, code: ok ? null : "no_detail", judge: r };
    },
    hint: (v) => ({ text: heuristicJudge(v).tip || "Tell me more. What's it made of? What color? What does it do when it's happy?", visual: null }),
    tutor: { prompt: ask, equation: "", answer: "a few sentences with specific facts about how the creature looks and what it does" },
  };
}

/** Binding Beaconwing: true words about the storm, while Maren sings (3.W.3). */
export function bindPuzzle({ mastery } = {}) {
  const title = "Words for the Storm";
  if (gradeIn(mastery, "write") < 3) {
    const ask = "Write a sentence about a storm. What does it sound like?";
    return {
      skill: "write.own",
      tier: 3,
      panel: { kind: "text", title, ask, placeholder: "The storm…", minWords: 3, submitLabel: "Give it the words (Ctrl+Enter)" },
      answerText: "a sentence about a storm",
      grade: (v) => {
        const ok = isOwnSentence(v);
        return { correct: ok, code: ok ? null : "too_short" };
      },
      hint: () => ({ text: "Start with \"The storm\", then say what it does. Roar? Crash? Flash?", visual: null }),
      tutor: { prompt: ask, equation: "", answer: "any sentence of three or more words about a storm" },
    };
  }
  const ask = "Write true words about the storm: what it sounds like, what the wind does, what the light does in it.";
  return {
    skill: "write.sentence",
    tier: 3,
    panel: { kind: "text", title, ask, placeholder: "The storm…", minWords: 5, submitLabel: "Give it the words (Ctrl+Enter)" },
    answerText: "a sentence with at least one detail a reader can see or hear",
    aiWriting: { task: "true words about a storm at sea (its sound, the wind, the light) to wake a frightened thunderbird Titan in a lighthouse lens" },
    grade: (v, ai = null) => {
      const r = ai || heuristicJudge(v);
      return { correct: r.moves.length >= 1, code: r.moves.length ? null : "no_detail", judge: r };
    },
    hint: (v) => ({ text: heuristicJudge(v).tip || "Show it the storm: the sound, the wind, the light.", visual: null }),
    tutor: { prompt: ask, equation: "", answer: "any sentence about a storm with a specific detail a reader can see or hear" },
  };
}

/** Which hero track each chapter 2 puzzle practices (PUZZLE_TRACK in puzzles.js). */
export const PUZZLE2_TRACK = { clock: "time", feed: "time", tide: "time", hal: "mul", recipe: "measure", weigh: "measure", fog: "spell", note: "write", bind: "write" };

export const PUZZLES2 = { clock: clockPuzzle, feed: feedPuzzle, tide: tidePuzzle, hal: halPuzzle, recipe: recipePuzzle, weigh: weighPuzzle, fog: fogPuzzle, note: notePuzzle, bind: bindPuzzle };
