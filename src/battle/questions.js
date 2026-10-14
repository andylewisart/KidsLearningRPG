// Turns "this hero, this tier, this target" into a question: what the
// problem window shows, how to grade it, what help to offer, what to tell
// the tutor, and how hard the hit lands.

import { CLASSES, FIENDS } from "./data.js";
import { effectiveness, strikeBand } from "./engine.js";
import { genStrike, genSub, genAdd, classifySub } from "../learn/arith.js";
import { genMulDiv, equationText, diagnoseMulDiv } from "../learn/muldiv.js";
import { pickWord, buildSpellTask, gradeSpelling, spellDamage } from "../learn/spelling.js";
import { arithHint, mulDivHint, spellingHint, mulDivVisual } from "../learn/hints.js";
import { diagnoseArith } from "../learn/arith.js";
import { heuristicJudge, isFinished, isOwnSentence } from "../learn/writing.js";
import { POWER_WORDS, PLAIN_SENTENCES, PICK_WORDS, FINISH_STARTS, isPowerWord } from "../content/lash.js";
import { LADDERS, SKILLS } from "../learn/skills.js";
import { genTime, timeText, timeAnswerText, checkTime, diagnoseTime, timeHint, genMeasure, measureEquation, measureVisual, diagnoseMeasure, measureHint } from "../learn/measure.js";

/** What a question asked, short, for the play report: "532 − 218", "8 × ? = 48", "fis__ook" (null for writing). */
export function askedText(q) {
  const t = q?.task;
  if (t?.kind === "missing") return t.before + "_".repeat(t.focus.length) + t.after;
  return q?.tutor?.equation || q?.panel?.equation || null;
}

/** His answer the way he saw it: filling in a word's missing letters makes the whole word. */
export function givenText(q, v) {
  const t = q?.task;
  if (t?.kind === "missing" && v != null) return t.before + String(v).toLowerCase() + t.after;
  return v ?? null;
}

const STARS = (n) => "★".repeat(n);
/** "1 bolt", "6 bolts". */
const count = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
export const GUN_BASE = { 1: 30, 2: 120, 3: 300 };
export const LASH_BASE = { 1: 45, 2: 150, 3: 340 };
export const SLOW_BASE = { 1: 45, 2: 150, 3: 340 };

/**
 * ctx: { rng, schoolWords, recentWords, missedWords, grades }
 *   grades: the player's grade per track (learn/players.js); without it, 3rd grade.
 * Below 3rd grade the stars set how hard a hit lands, not the size of the
 * numbers, so a 1st grader's ★★★ hits as hard as a 3rd grader's.
 * Returns null if a question can't be made (e.g. no words for a pattern).
 */
export function makeQuestion({ cls, tier, skill, support, target, fiends, ctx }) {
  const moveName = CLASSES[cls].moves[tier];
  const title = `${moveName} ${STARS(tier)}`;
  const eff = (f) => effectiveness(cls, f.type);
  const { rng } = ctx;

  if (cls === "knight") {
    // below 3rd grade the fiend's HP is too big to subtract from: a plain problem, damage by the stars
    if ((ctx.grades?.sub ?? 3) < 3 && (SKILLS[skill]?.grade ?? 3) < 3) return freeStrike({ cls, tier, skill, target, title, moveName, rng });
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
    if (p.op === "skip") ask = `${moveName}: the cannons fire counting by ${p.step}s. What number comes next?`;
    else if (p.op === "groups") ask = `${moveName}: ${count(p.a, "burst")} of ${count(p.b, "bolt")}. How many bolts in all?`;
    else if (p.op === "div") ask = `Split Shot! ${count(p.a, "bolt")} split into ${count(p.b, "equal burst")}. How many bolts in each burst? (Hits every fiend.)`;
    else if (p.op === "unknown") ask = `Reload! How many volleys of ${p.a} make ${p.c}?   ${p.a} × ? = ${p.c}`;
    else if (p.skill === "mul.tens") ask = `${moveName}: ${count(p.a, "cannon")} fire ${count(p.b, "bolt")} each. How many bolts in all?`;
    else ask = `${moveName}: ${count(p.a, "burst")} of ${count(p.b, "bolt")}. How many bolts?`;
    const showArray = support && ["mul", "groups"].includes(p.op) && p.skill !== "mul.tens" && p.a > 0 && p.b > 0;
    // a 3rd grader's bigger products hit a little harder; below that, a typical one's worth
    const sized = (SKILLS[p.skill]?.grade ?? 3) < 3 ? 30 : Math.min(p.answer, 100);
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
      damageTo: (f, { half }) => (GUN_BASE[tier] + sized * 2) * eff(f) * (half ? 0.5 : 1),
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

  if (cls === "beastkeeper") return slowQuestion({ cls, tier, skill, target, title, moveName, rng, eff });

  // Titan Caller: Word Lash. For a 3rd grader the stars pick the kind of lash;
  // below 3rd grade in writing, the skill on the ladder does (pick a word, finish
  // a sentence, write one of her own), and the stars set the damage.
  const kind = (ctx.grades?.write ?? 3) < 3 ? skill : { 1: "write.choose", 2: "write.words", 3: "write.sentence" }[tier];
  const fiendName = FIENDS[target?.id]?.name || "fiend"; // "the Scrap Raptor", not "the Scrap Raptor B"
  if (kind === "write.pick") {
    const item = rng.pick(PICK_WORDS);
    const choices = rng.shuffle(item.choices);
    const ask = `Which word fits? "${item.sentence}"`;
    return {
      cls,
      tier,
      skill: kind,
      target,
      panel: { kind: "choice", title, ask, choices },
      answerText: item.best,
      grade: (v) => ({ correct: v === item.best, code: v === item.best ? null : "weak_word" }),
      hint: () => ({ text: `Read it with each word. Which one makes a picture in your head? "${item.best}" does.`, visual: null }),
      tutor: { prompt: ask + ` Choices: ${item.choices.join(", ")}`, equation: "", answer: item.best },
      damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    };
  }
  if (kind === "write.finish") {
    const start = rng.pick(FINISH_STARTS).replace("the fiend", `the ${fiendName}`).replace("The fiend", `The ${fiendName}`);
    const ask = `Finish the sentence: "${start}…"`;
    return {
      cls,
      tier,
      skill: kind,
      target,
      panel: { kind: "text", title, ask, placeholder: "…", minWords: 1, submitLabel: "Lash! (Ctrl+Enter)" },
      answerText: "any ending that makes sense",
      grade: (v) => {
        const ok = isFinished(v);
        return { correct: ok, code: ok ? null : "too_short" };
      },
      hint: () => ({ text: `Say the start out loud: "${start}…" What comes next? Type the words you'd say.`, visual: null }),
      tutor: { prompt: ask, equation: "", answer: "any words that finish the sentence" },
      damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    };
  }
  if (kind === "write.own") {
    const ask = `Write a sentence about the ${fiendName}. What does it look like, or do?`;
    return {
      cls,
      tier,
      skill: kind,
      target,
      panel: { kind: "text", title, ask, placeholder: `The ${fiendName}…`, minWords: 3, submitLabel: "Lash! (Ctrl+Enter)" },
      answerText: "a sentence of three words or more",
      grade: (v) => {
        const ok = isOwnSentence(v);
        return { correct: ok, code: ok ? null : "too_short" };
      },
      hint: () => ({ text: `Start with "The ${fiendName}", then say one thing it does. Does it stomp? Wobble? Snap?`, visual: null }),
      tutor: { prompt: ask, equation: "", answer: "any sentence of three or more words about the fiend" },
      damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    };
  }
  if (kind === "write.choose") {
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
      damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    };
  }
  if (kind === "write.words") {
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
      damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    };
  }
  const name = fiendName;
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
    damageTo: (f, { half }) => LASH_BASE[tier] * eff(f) * (half ? 0.5 : 1),
  };
}

/**
 * The Beastkeeper's Slow: a time problem on a clock face (3.MD.1). Her snare
 * springs at a time he sets on the clock, or holds for a stretch he works
 * out (elapsed time, in minutes). The ladder scales it to the player: hours
 * and half hours, five minutes, the minute, then elapsed time; below 3rd
 * grade the stars set how hard it lands. Any hit of hers pins a fast fiend
 * (`slows`; engine.js, slow).
 */
function slowQuestion({ cls, tier, skill, target, title, moveName, rng, eff }) {
  const p = genTime(SKILLS[skill]?.track === "time" ? skill : "time.minute", rng);
  const who = FIENDS[target?.id]?.name || "fiend";
  const base = {
    cls,
    tier,
    skill: p.skill,
    target,
    problem: p,
    answerText: timeAnswerText(p),
    grade: (v) => {
      const correct = checkTime(p, v);
      return { correct, code: correct ? null : diagnoseTime(p, v)?.code || "other" };
    },
    hint: (v) => timeHint(p, v),
    damageTo: (f, { half }) => SLOW_BASE[tier] * eff(f) * (half ? 0.5 : 1),
    slows: true,
  };
  const hidden = timeAnswerText(p).replace(/\d/g, "?");
  if (p.op === "between") {
    const ask = `${moveName}: the snare holds the ${who} from ${timeText(p.start)} to ${timeText(p.end)}. How many minutes is it slowed?`;
    const clocks = [{ ...p.start, label: "Slow starts" }, { ...p.end, label: "It wears off" }];
    return { ...base, panel: { kind: "number", title, ask, equation: "minutes", support: { kind: "clocks", clocks } }, tutor: { prompt: ask, equation: `${timeText(p.start)} to ${timeText(p.end)}`, answer: p.answer } };
  }
  if (p.op === "end") {
    const ask = `${moveName}: the snare closes at ${timeText(p.start)} and holds for ${p.mins} minutes. Set the clock to when it lets go.`;
    return { ...base, panel: { kind: "clock", title, ask, clock: { start: p.start }, equation: hidden }, tutor: { prompt: ask, equation: `${timeText(p.start)} + ${p.mins} minutes`, answer: timeAnswerText(p) } };
  }
  const ask = `${moveName}: the snare springs at ${timeText(p.time)}. Set the clock to spring it.`;
  return { ...base, panel: { kind: "clock", title, ask, clock: { start: { h: 12, m: 0 } }, equation: hidden }, tutor: { prompt: ask, equation: `set the clock to ${timeText(p.time)}`, answer: timeText(p.time) } };
}

/**
 * The Beastkeeper's Feed (3.MD.2): a tonic poured in milliliters for a hero,
 * or a meal weighed in grams for a fiend. `skill` comes from the measuring
 * ladder; a jug measures volume and a scale mass, so the rung swaps to fit.
 * Right, a tonic heals and a meal calms the fiend (engine.js, feed); there's
 * no half measure, so a retry after help works in full (`whole`).
 */
export function feedQuestion({ target, forHero, skill, rng }) {
  const unit = forHero ? "mL" : "g";
  let s = SKILLS[skill]?.track === "measure" ? skill : "measure.mass";
  if (unit === "mL" && s === "measure.mass") s = "measure.volume";
  if (unit === "g" && s === "measure.volume") s = "measure.mass";
  const p = genMeasure(s, rng, { unit });
  const name = forHero ? target.name : `the ${FIENDS[target.id]?.name || "fiend"}`;
  const u = p.unit;
  const asks = forHero
    ? {
        read: `She pours a tonic for ${name}. How many milliliters are in the jug?`,
        more: `${name}'s tonic needs ${p.b} ${u}. There's ${p.a} ${u} in the jug. How many more milliliters?`,
        total: `${p.a} ${u} of kelp tea and ${p.b} ${u} of honey water. How many milliliters of tonic for ${name}?`,
        times: `${p.a} spoonfuls of tonic, ${p.b} ${u} in each. How many milliliters for ${name}?`,
        share: `${p.a} ${u} of tonic, shared equally into ${p.b} cups. How many milliliters in each cup?`,
      }
    : {
        read: `She weighs out a meal for ${name}. How many grams are on the scale?`,
        more: `The chart says ${name} eats ${p.b} ${u}. There's ${p.a} ${u} on the scale. How many more grams?`,
        total: `${p.a} ${u} of fish and ${p.b} ${u} of biscuit crumbs. How many grams of supper for ${name}?`,
        times: `${p.a} sardines, ${p.b} ${u} each. How many grams of supper for ${name}?`,
        share: `${p.a} ${u} of fish, shared equally into ${p.b} bowls. How many grams in each bowl?`,
      };
  const ask = asks[p.op];
  const equation = measureEquation(p);
  return {
    cls: "beastkeeper",
    tier: 2,
    skill: p.skill,
    target,
    forHero,
    problem: p,
    panel: { kind: "number", title: forHero ? "Feed: a Tonic" : "Feed: a Meal", ask, equation, support: measureVisual(p) },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : diagnoseMeasure(p, v)?.code || "other" };
    },
    hint: (v) => measureHint(p, v),
    tutor: { prompt: ask, equation, answer: `${p.answer} ${u}` },
    whole: true,
  };
}

/**
 * A potion for a player below 3rd grade in adding: a plain sum mixes it (a
 * hero's HP is too big to add to), and it heals what a 3rd grader's would.
 * Same shape as genHeal's; null when the hero is (nearly) full.
 */
export function youngPotion(hp, maxHp, skill, rng) {
  const room = maxHp - hp;
  if (room < 5) return null;
  return { ...genAdd(skill, rng), heal: Math.min(room, Math.max(60, Math.round(room * 0.6))), mix: true };
}

/** The Knight below 3rd grade: a plain subtraction, and the stars size the hit. */
function freeStrike({ cls, tier, skill, target, title, moveName, rng }) {
  const p = genSub(skill, rng);
  const [lo, hi] = strikeBand(tier, target); // the same band a 3rd grader's strike lands in
  const equation = `${p.a} − ${p.b}`;
  const ask = `${moveName}! Solve it to strike ${target.name}.`;
  return {
    cls,
    tier,
    skill: p.skill,
    target,
    problem: p,
    panel: { kind: "number", title, ask, equation },
    answerText: String(p.answer),
    grade: (v) => {
      const correct = Number(v) === p.answer;
      return { correct, code: correct ? null : diagnoseArith(p, v)?.code };
    },
    hint: (v) => arithHint(p, v),
    tutor: { prompt: ask, equation, answer: p.answer },
    damageTo: (f, { half }) => Math.round((lo + hi) / 2) * (half ? 0.5 : 1),
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
  if (cls === "beastkeeper") return stampedeQuestion(skill, rng);
  const entry = pickWord(skill && SKILLS[skill]?.track === "spell" ? skill : "spell.closed", rng, { recent: ctx.recentWords });
  const task = buildSpellTask(entry, 1, rng);
  return {
    skill,
    panel: { kind: "missing", title: "Word Storm", ask: "Fill in the letters. Every word is a bolt.", task },
    grade: (v) => ({ correct: gradeSpelling(task, v).correct }),
    answerText: task.word,
  };
}

/**
 * Stampede, the Beastkeeper's Overdrive: quick looks at a clock. How many
 * minutes past the hour the long hand says (or, on the hour, which hour),
 * at his reading rung; for elapsed time, a short count in fives that stays
 * inside one hour.
 */
function stampedeQuestion(skill, rng) {
  if (skill === "time.elapsed") {
    const start = { h: rng.int(1, 12), m: rng.int(0, 7) * 5 };
    const mins = rng.int(1, Math.min(6, (55 - start.m) / 5)) * 5;
    const end = { h: start.h, m: start.m + mins };
    return {
      skill,
      panel: { kind: "number", title: "Stampede", ask: "How many minutes from the first clock to the second? Every right answer, a creature charges.", equation: "minutes", support: { kind: "clocks", clocks: [{ ...start, label: "From" }, { ...end, label: "To" }] } },
      grade: (v) => ({ correct: Number(v) === mins }),
      answerText: String(mins),
    };
  }
  const p = genTime(SKILLS[skill]?.track === "time" ? skill : "time.five", rng);
  const t = p.time;
  const past = t.m > 0;
  return {
    skill: p.skill,
    panel: { kind: "number", title: "Stampede", ask: past ? `How many minutes past ${t.h} o'clock?` : "It's on the hour. Which hour?", equation: past ? `${t.h}:??` : "?:00", support: { kind: "clock", ...t } },
    grade: (v) => ({ correct: Number(v) === (past ? t.m : t.h) }),
    answerText: String(past ? t.m : t.h),
  };
}
