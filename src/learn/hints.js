// "Want to see how?" Built-in help that needs no AI: a short line from the
// droid that names the exact slip, plus a picture for the game to draw.
// Visual specs are plain data; ui/visuals.js draws them.

import { diagnoseArith, subTrades } from "./arith.js";
import { diagnoseMulDiv } from "./muldiv.js";
import { syllables } from "./syllables.js";

const ARITH_LINES = {
  added_instead: "That's adding. Taking HP away means subtracting. Same numbers, other direction.",
  subtracted_instead: "That's subtracting. A potion ADDS health. Same numbers, other direction.",
  smaller_from_larger:
    "You took the small digit from the big one in every column. When the top digit is too small, trade 1 ten for 10 ones first. Watch.",
  no_take_away: "Nice trade. But the ten you traded has to leave the tens place. Tens go down by one.",
  across_zero:
    "The zero in the middle is the trap. There are no tens to trade, so trade a hundred for 10 tens first, then a ten for 10 ones.",
  no_carry: "When a column adds up to 10 or more, those 10 become a new ten. Carry it over. Watch.",
  place_slip: "So close. You're off by exactly {absdiff}, which means one trade went sideways. Watch the blocks.",
  column_slip: "So close. You're off by exactly {absdiff}. One column slipped: check the {column} again, then the rest.",
  close: "Within {absdiff}. Your plan is right; one small slip. Let's check it column by column.",
  not_a_number: "I need a number for this one. Digits only. I'm a droid, not a poet.",
  unknown: "Let's look at it with blocks. Ones first, then tens, then hundreds.",
};

const MULDIV_LINES = {
  added: "That's {a} + {b}. Times means {a} groups of {b}. Counting the groups changes everything.",
  off_by_group: "Off by one group. Count the rows of bolts in the picture. One sneaked in or out.",
  neighbor_fact: "That's a neighbor from the times table, not this one. Break it apart: small facts you know, then add.",
  zero_rule: "Zero groups of anything is zero. Even zero groups of dragons. Especially that.",
  one_rule: "One group of {n} is just {n}. Times one changes nothing. It's very lazy that way.",
  reversed_digits: "Right digits, wrong order. Check which one goes in the tens place.",
  dropped_zero: "{a} × {b} means {a} groups of {tens} TENS. The answer is in tens, so it ends in zero.",
  extra_zero: "One zero too many. {a} groups of {tens} tens is {fact} tens, not {fact} hundreds.",
  subtracted_once: "Dividing is splitting into equal groups, not taking away once. Let's deal them out.",
  off_by_one: "One off. Check it backwards: does your answer times {b} make {a}?",
  multiplied: "That's multiplying. Dividing splits {a} into {b} equal groups. Much smaller.",
  multiplied_visible: "The ? is a missing factor. Ask: {a} times WHAT makes {c}?",
  used_visible: "The ? is how many groups of {a} make {c}. Skip-count by {a} until you hit {c}.",
  not_a_number: "Numbers only, please. My circuits can't add vibes.",
  unknown: "Let's draw it. Rows times columns. Count the rows, then count what's in each row.",
};

/** The help lines with no numbers filled in, so they can be pre-recorded (tools/audio/lines.mjs). */
export const FIXED_HINT_LINES = [...Object.values(ARITH_LINES), ...Object.values(MULDIV_LINES)].filter((t) => !t.includes("{"));

function hasTrade({ op, a, b }) {
  if (op === "sub") {
    const t = subTrades(a, b);
    return t.onesTrade || t.tensTrade;
  }
  const carry = (a % 10) + (b % 10) >= 10 ? 1 : 0;
  return carry === 1 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10;
}

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** Built-in help for an add/subtract problem. */
export function arithHint(problem, answer) {
  const d = diagnoseArith(problem, answer) || { code: "unknown" };
  const vars = { ...problem, absdiff: Math.abs(d.diff || 0), column: Math.abs(d.diff || 0) === 100 ? "hundreds" : "tens" };
  // "a trade went sideways" only makes sense when the problem has a trade in it
  if (d.code === "place_slip" && !hasTrade(problem)) d.code = "column_slip";
  return {
    code: d.code,
    text: fill(ARITH_LINES[d.code] || ARITH_LINES.unknown, vars),
    visual: { kind: "base_ten", op: problem.op, a: problem.a, b: problem.b },
  };
}

/** Built-in help for a multiply/divide problem. */
export function mulDivHint(problem, answer) {
  const d = diagnoseMulDiv(problem, answer) || { code: "unknown" };
  const vars = { ...problem, n: Math.max(problem.a, problem.b), tens: problem.b / 10, fact: problem.a * (problem.b / 10) };
  return { code: d.code, text: fill(MULDIV_LINES[d.code] || MULDIV_LINES.unknown, vars), visual: mulDivVisual(problem) };
}

export function mulDivVisual(p) {
  if (p.skill === "mul.tens") return { kind: "tens_groups", groups: p.a, tensEach: p.b / 10 };
  if (p.op === "div") return { kind: "share", total: p.a, groups: p.b };
  if (p.op === "unknown") {
    // Skip-count by the known factor up to the total; the jumps are the answer.
    const jumps = Array.from({ length: p.answer }, (_, i) => ({ from: i * p.a, to: (i + 1) * p.a, label: `+${p.a}` }));
    return { kind: "number_line", start: 0, end: p.c, jumps };
  }
  // Break apart big facts: 7 × 8 = 7 × 5 + 7 × 3.
  const split = p.b >= 6 ? 5 : null;
  return { kind: "array", rows: p.a, cols: p.b, split };
}

/** Built-in help for a spelling task. */
export function spellingHint(task, grade) {
  let text;
  if (grade.focusError) text = `The tricky part is "${task.focus}". Here's the rule for it:`;
  else if (task.parts?.length > 1) text = `It's two words stuck together: ${task.parts.join(" + ")}. Spell each one, then glue them.`;
  else if (task.pattern === "prefix" && !task.before) text = `It's a prefix plus a word: ${task.focus} + ${task.after}. Both parts keep every letter.`;
  else text = `Say it slowly: ${syllableHint(task.word)}. Spell each part you hear.`;
  return { code: grade.focusError ? "pattern" : "other", text, visual: { kind: "word", before: task.before, focus: task.focus, after: task.after, rule: task.rule } };
}

/** "bas · ket": the chunks to say slowly. */
export function syllableHint(word) {
  return syllables(word).join(" · ");
}
