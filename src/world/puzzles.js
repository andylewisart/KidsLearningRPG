// The adventure's puzzles, as problems: what the problem window shows, how
// to grade it, and what help to give (the same shape as battle questions,
// so the same window and help flow run them). Every one is tagged with a
// skill from learn/skills.js and stays inside the Utah grade-3 limits,
// because the problems come from the same generators the battles use.

import { genSub, diagnoseArith } from "../learn/arith.js";
import { genMulDiv, equationText, diagnoseMulDiv } from "../learn/muldiv.js";
import { arithHint, mulDivHint, spellingHint } from "../learn/hints.js";
import { pickWord, buildSpellTask, gradeSpelling } from "../learn/spelling.js";
import { heuristicJudge } from "../learn/writing.js";
import { LADDERS } from "../learn/skills.js";
import { WORDS, parseWord } from "../content/words.js";

/** Tier 2 is his working edge; tier 1 is review (used after a miss). */
const tierSkill = (mastery, ladder, tier, rng) => mastery.pickTiers(ladder, rng)[tier === 1 ? 1 : 2];

/** The chest's number dial: subtraction within 1,000 (3.NBT.2). */
export function dialPuzzle({ mastery, rng, tier = 2 }) {
  const { skill } = tierSkill(mastery, LADDERS.sub, tier, rng);
  const p = genSub(skill, rng);
  const ask = `The dial shows ${p.a}. Carved on the lid: "Turn it back ${p.b}." What number does the dial stop on?`;
  const equation = `${p.a} − ${p.b}`;
  return {
    skill: p.skill,
    tier,
    problem: p,
    panel: { kind: "number", title: "The Chest's Dial", ask, equation },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : diagnoseArith(p, v)?.code };
    },
    hint: (v) => arithHint(p, v),
    tutor: { prompt: ask, equation, answer: p.answer },
  };
}

/** The Captain's blaster: multiplication and division within 100 (3.OA). */
export function calibratePuzzle({ mastery, rng, tier = 2, row = 1 }) {
  const { skill, support } = tierSkill(mastery, LADDERS.mul, tier, rng);
  const p = genMulDiv(skill, rng);
  let ask;
  if (p.op === "div") ask = `Row ${row}: share ${p.a} crystal cells equally into ${p.b} slots. How many cells go in each slot?`;
  else if (p.op === "unknown") ask = `Row ${row}: how many rows of ${p.a} cells make ${p.c} cells?   ${p.a} × ? = ${p.c}`;
  else if (p.skill === "mul.tens") ask = `Row ${row}: ${p.a} tubes with ${p.b} sparks in each. How many sparks in all?`;
  else ask = `Row ${row}: ${p.a} rows of crystal cells, ${p.b} in each row. How many cells?`;
  const equation = p.op === "unknown" ? "?" : equationText(p);
  const showArray = support && p.op === "mul" && p.skill !== "mul.tens" && p.a > 0 && p.b > 0;
  return {
    skill: p.skill,
    tier,
    problem: p,
    panel: { kind: "number", title: "Calibrate the Blaster", ask, equation, support: showArray ? { kind: "array", rows: p.a, cols: p.b } : null },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : diagnoseMulDiv(p, v)?.code };
    },
    hint: (v) => mulDivHint(p, v),
    tutor: { prompt: ask, equation: p.op === "unknown" ? `${p.a} × ? = ${p.c}` : equationText(p), answer: p.answer },
  };
}

function spellQuestion(task, skill, { title, ask, tier }) {
  return {
    skill,
    tier,
    task,
    word: task.word,
    panel: { kind: task.kind, title, ask, task },
    answerText: task.word,
    grade: (v) => {
      const g = gradeSpelling(task, v);
      return { correct: g.correct, code: g.correct ? null : g.focusError ? "pattern" : "other", attempt: g.attempt };
    },
    hint: (v) => spellingHint(task, gradeSpelling(task, v)),
    tutor: {
      prompt: `Unscramble the letters to spell the word. Sentence: ${task.sentence || "none"}. Pattern rule: ${task.rule}`,
      equation: "",
      answer: task.word,
    },
  };
}

/** One bar of the Spellwright's cage: a scrambled word to put back in order (3.R.3). */
export function cagePuzzle({ mastery, rng, tier = 2, bar = 1, recent = [], missed = [], schoolWords = [] }) {
  const { skill } = tierSkill(mastery, LADDERS.spell, tier, rng);
  const entry = pickWord(skill, rng, { recent, missed }) || pickWord("spell.closed", rng, { recent });
  const task = buildSpellTask(entry, 2, rng); // letter tiles: the cage's scrambled letters
  return spellQuestion(task, skill, {
    tier,
    title: `Cage Bar ${bar} of 3`,
    ask: "This bar is a scrambled word. Put the letters in order to break it. Two of the letters are decoys!",
  });
}

/** Jumble's scrambled signpost: one exact word, in his exact scramble (no decoys). */
export function signPuzzle({ word = "temple", scramble = "pelmet", rng }) {
  const entry = WORDS.find((e) => parseWord(e.w).word === word);
  const task = { ...buildSpellTask(entry, 2, rng), tiles: scramble.split(""), decoys: [] };
  return spellQuestion(task, "spell." + entry.p, {
    tier: 2,
    title: "Jumble's Signpost",
    ask: `Captain Jumble scrambled the sign: ${scramble.toUpperCase()}. Put the letters back in order to fix it.`,
  });
}

/** The crystal shrine wakes for one vivid sentence about the sea (3.W.3). */
export function shrinePuzzle() {
  const ask = "Write one sentence about the sea. Help the reader SEE it or HEAR it: a color, a sound, what it's like.";
  return {
    skill: "write.sentence",
    tier: 3,
    panel: { kind: "text", title: "Wake the Shrine", ask, placeholder: "The sea…", minWords: 5, submitLabel: "Speak to the shrine (Ctrl+Enter)" },
    answerText: "a sentence with at least one detail a reader can see or hear",
    grade: (v) => {
      const r = heuristicJudge(v);
      return { correct: r.moves.length >= 1, code: r.moves.length ? null : "no_detail", judge: r };
    },
    hint: (v) => ({ text: heuristicJudge(v).tip, visual: null }),
    tutor: { prompt: ask, equation: "", answer: "any sentence about the sea with a specific detail a reader can see or hear" },
  };
}

export const PUZZLES = { dial: dialPuzzle, calibrate: calibratePuzzle, cage: cagePuzzle, sign: signPuzzle, shrine: shrinePuzzle };
