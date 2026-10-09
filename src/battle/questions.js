// Turns "this hero, this tier, this target" into a question: what the
// problem window shows, how to grade it, what help to offer, what to tell
// the tutor, and how hard the hit lands.

import { CLASSES, FIENDS } from "./data.js";
import { effectiveness, strikeBand } from "./engine.js";
import { genStrike, genSub, classifySub } from "../learn/arith.js";
import { genMulDiv, equationText, diagnoseMulDiv } from "../learn/muldiv.js";
import { pickWord, buildSpellTask, gradeSpelling, spellDamage } from "../learn/spelling.js";
import { arithHint, mulDivHint, spellingHint, mulDivVisual } from "../learn/hints.js";
import { diagnoseArith } from "../learn/arith.js";
import { heuristicJudge } from "../learn/writing.js";
import { POWER_WORDS, PLAIN_SENTENCES, isPowerWord } from "../content/lash.js";
import { LADDERS, SKILLS } from "../learn/skills.js";

const STARS = (n) => "★".repeat(n);
/** "1 bolt", "6 bolts". */
const count = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
export const GUN_BASE = { 1: 30, 2: 120, 3: 300 };
export const LASH_BASE = { 1: 45, 2: 150, 3: 340 };

/**
 * ctx: { rng, schoolWords, recentWords, missedWords }
 * Returns null if a question can't be made (e.g. no words for a pattern).
 */
export function makeQuestion({ cls, tier, skill, support, target, fiends, ctx }) {
  const moveName = CLASSES[cls].moves[tier];
  const title = `${moveName} ${STARS(tier)}`;
  const eff = (f) => effectiveness(cls, f.type);
  const { rng } = ctx;

  if (cls === "knight") {
    const band = strikeBand(tier, target);
    const p = genStrike(target.hp, skill, band, rng, LADDERS.sub);
    const ask =
      p.kind === "left"
        ? `${target.name} has ${p.hp} HP. ${moveName} hits for ${p.damage}. How much HP is left?`
        : `${target.name} has only ${p.hp} HP left. ${moveName} hits for ${p.damage}! How much extra damage is that?`;
    return {
      cls,
      tier,
      skill: p.skill,
      target,
      problem: p,
      panel: { kind: "number", title, ask, equation: `${p.a} − ${p.b}` },
      answerText: String(p.answer),
      grade: (v) => {
        const correct = Number(v) === p.answer;
        return { correct, code: correct ? null : diagnoseArith(p, v)?.code };
      },
      hint: (v) => arithHint(p, v),
      tutor: { prompt: ask, equation: `${p.a} − ${p.b}`, answer: p.answer },
      // The Knight's answer IS the new HP (or the overkill), so no half damage.
      knight: true,
    };
  }

  if (cls === "gunner") {
    const p = genMulDiv(skill, rng);
    const aoe = p.op === "div";
    let ask;
    if (p.op === "div") ask = `Split Shot! ${count(p.a, "bolt")} split into ${count(p.b, "equal burst")}. How many bolts in each burst? (Hits every fiend.)`;
    else if (p.op === "unknown") ask = `Reload! How many volleys of ${p.a} make ${p.c}?   ${p.a} × ? = ${p.c}`;
    else if (p.skill === "mul.tens") ask = `${moveName}: ${count(p.a, "cannon")} fire ${count(p.b, "bolt")} each. How many bolts in all?`;
    else ask = `${moveName}: ${count(p.a, "burst")} of ${count(p.b, "bolt")}. How many bolts?`;
    const showArray = support && p.op === "mul" && p.skill !== "mul.tens" && p.a > 0 && p.b > 0;
    return {
      cls,
      tier,
      skill: p.skill,
      target,
      aoe,
      problem: p,
      panel: {
        kind: "number",
        title: p.op === "div" ? `Split Shot ${STARS(tier)}` : p.op === "unknown" ? `Reload ${STARS(tier)}` : title,
        ask,
        equation: p.op === "unknown" ? "?" : equationText(p),
        support: showArray ? { kind: "array", rows: p.a, cols: p.b } : null,
      },
      answerText: String(p.answer),
      grade: (v) => {
        const correct = Number(v) === p.answer;
        return { correct, code: correct ? null : diagnoseMulDiv(p, v)?.code };
      },
      hint: (v) => mulDivHint(p, v),
      tutor: { prompt: ask, equation: p.op === "unknown" ? `${p.a} × ? = ${p.c}` : equationText(p), answer: p.answer },
      damageTo: (f, { half }) => (GUN_BASE[tier] + Math.min(p.answer, 100) * 2) * eff(f) * (half ? 0.5 : 1),
      visual: mulDivVisual(p),
    };
  }

  if (cls === "spellwright") {
    let useSkill = skill;
    if (ctx.schoolWords?.length && tier >= 2 && rng.chance(0.4)) useSkill = "spell.school";
    let entry = pickWord(useSkill, rng, { schoolList: ctx.schoolWords, recent: ctx.recentWords, missed: ctx.missedWords });
    if (!entry) {
      useSkill = skill;
      entry = pickWord(skill, rng, { recent: ctx.recentWords, missed: ctx.missedWords });
    }
    if (!entry) return null;
    const task = buildSpellTask(entry, tier, rng);
    const asks = {
      missing: "Fill in the missing letters to cast it.",
      tiles: "Put the letters in order. Watch out: two of them are decoys.",
      dictation: "Listen, then spell the word to cast it.",
    };
    return {
      cls,
      tier,
      skill: useSkill,
      target,
      task,
      panel: { kind: task.kind, title, ask: asks[task.kind], task },
      answerText: task.word,
      grade: (v) => {
        const g = gradeSpelling(task, v);
        return { correct: g.correct, code: g.correct ? null : g.focusError ? "pattern" : "other", grade: g, attempt: g.attempt };
      },
      hint: (v) => spellingHint(task, gradeSpelling(task, v)),
      tutor: {
        prompt: `Spell the word "${task.kind === "dictation" ? "(spoken aloud)" : task.before + "_".repeat(task.focus.length) + task.after}". Sentence: ${task.sentence || "none"}. Pattern rule: ${task.rule}`,
        equation: "",
        answer: task.word,
      },
      damageTo: (f, { half }) => spellDamage(task, tier) * eff(f) * (half ? 0.5 : 1),
      word: task.word,
    };
  }

  // Titan Caller: Word Lash
  if (tier === 1) {
    const item = rng.pick(POWER_WORDS);
    const choices = rng.shuffle(item.choices);
    const ask = `Pick the power word: "${item.sentence}"`;
    return {
      cls,
      tier,
      skill: "write.choose",
      target,
      panel: { kind: "choice", title, ask, choices },
      answerText: item.best,
      grade: (v) => ({ correct: v === item.best, code: v === item.best ? null : "weak_word" }),
      hint: () => ({ text: `Which word lets you SEE it happen? "${item.best}" paints a picture; plain words like "went" don't.`, visual: null }),
      tutor: { prompt: ask + ` Choices: ${item.choices.join(", ")}`, equation: "", answer: item.best },
      damageTo: (f, { half }) => LASH_BASE[1] * eff(f) * (half ? 0.5 : 1),
    };
  }
  if (tier === 2) {
    const item = rng.pick(PLAIN_SENTENCES);
    const ask = `Power up the plain word "${item.plain}": ${item.sentence} Type a stronger word for "${item.plain}".`;
    return {
      cls,
      tier,
      skill: "write.words",
      target,
      panel: { kind: "text", title, ask, placeholder: "one strong word", minWords: 1, submitLabel: "Lash! (Ctrl+Enter)" },
      answerText: "smashed, lunged, crept… (any strong action word)",
      grade: (v) => {
        const ok = isPowerWord(v, item.plain);
        return { correct: ok, code: ok ? null : "plain_word" };
      },
      hint: () => ({
        text: `"${item.plain}" is a plain word. What does it really DO? Does it creep, charge, stomp, rocket, slither? Pick a word you can see.`,
        visual: null,
      }),
      tutor: { prompt: ask, equation: "", answer: "any strong, specific action verb (not went/got/moved)" },
      damageTo: (f, { half }) => LASH_BASE[2] * eff(f) * (half ? 0.5 : 1),
    };
  }
  // "the Scrap Raptor", not "the Scrap Raptor B"
  const name = FIENDS[target?.id]?.name || "fiend";
  const ask = `Write one vivid sentence about the ${name}: what it looks like, sounds like, or does. A reader should be able to SEE it.`;
  return {
    cls,
    tier,
    skill: "write.sentence",
    target,
    panel: { kind: "text", title, ask, placeholder: `The ${name}…`, minWords: 5, submitLabel: "Lash! (Ctrl+Enter)" },
    answerText: "a sentence with at least one specific detail",
    grade: (v) => {
      const r = heuristicJudge(v);
      return { correct: r.moves.length >= 1, code: r.moves.length ? null : "no_detail", judge: r };
    },
    hint: (v) => ({ text: heuristicJudge(v).tip, visual: null }),
    tutor: { prompt: ask, equation: "", answer: "any sentence with a specific detail a reader can see or hear" },
    damageTo: (f, { half }) => LASH_BASE[3] * eff(f) * (half ? 0.5 : 1),
  };
}

/** A quick Overdrive question: easy, fast, from his solid skills. */
export function overdriveQuestion(cls, skill, ctx) {
  const { rng } = ctx;
  if (cls === "knight") {
    const s = SKILLS[skill]?.track === "sub" ? skill : "sub.2d";
    const p = genSub(s, rng);
    return {
      skill: classifySub(p.a, p.b),
      panel: { kind: "number", title: "Chain Strike", ask: "Strike! Keep going as long as you dare.", equation: `${p.a} − ${p.b}` },
      grade: (v) => ({ correct: Number(v) === p.answer }),
      answerText: String(p.answer),
    };
  }
  if (cls === "gunner") {
    const s = skill && !skill.startsWith("div") && skill !== "mul.unknown" && skill !== "mul.tens" ? skill : "mul.easy";
    const p = genMulDiv(s, rng);
    return {
      skill: p.skill,
      panel: { kind: "number", title: "Bullet Storm", ask: "Fire! Every right answer is another shot.", equation: equationText(p) },
      grade: (v) => ({ correct: Number(v) === p.answer }),
      answerText: String(p.answer),
    };
  }
  const entry = pickWord(skill && SKILLS[skill]?.track === "spell" ? skill : "spell.closed", rng, { recent: ctx.recentWords });
  const task = buildSpellTask(entry, 1, rng);
  return {
    skill,
    panel: { kind: "missing", title: "Word Storm", ask: "Fill in the letters. Every word is a bolt.", task },
    grade: (v) => ({ correct: gradeSpelling(task, v).correct }),
    answerText: task.word,
  };
}
