// Multiplication and division within 100 (Utah 3.OA), multiples of 10
// (3.NBT.3) and missing factors (3.OA.4). Whole-number answers only:
// remainders wait until 4th grade. Underneath, for a younger player:
// counting by tens (1.NBT.5), skip counting (2.NBT.2) and equal groups as
// repeated addition (2.OA.4, up to 5 groups of 5).

const FAMILIES = {
  "mul.easy": [2, 5, 10, 2, 5, 10, 0, 1], // 0 and 1 show up, just less often
  "mul.34": [3, 4],
  "mul.69": [6, 9],
  "mul.78": [7, 8],
  "div.easy": [2, 5, 10],
  "div.34": [3, 4],
  "div.hard": [6, 7, 8, 9],
};

/**
 * One problem for a multiplication-track skill.
 *   op "mul":     a × b = ?          (a groups of b)
 *   op "div":     a ÷ b = ?          (a shared into b equal groups)
 *   op "unknown": a × ? = c, answer b
 *   op "skip":    a count by `step`: seq is what's shown, answer the next one
 *   op "groups":  a groups of b, written as b + b + … (a times)
 */
export function genMulDiv(skill, rng) {
  if (skill === "mul.count10" || skill === "mul.skip") {
    // counting by tens stays within 120 (1.NBT.1); skip counting by 100s within 1,000 (2.NBT.2)
    const step = skill === "mul.count10" ? 10 : rng.pick([2, 5, 10, 2, 5, 100]);
    const last = step === 100 ? 9 : step === 10 ? 11 : 10; // how many steps the count may reach
    const n = rng.int(3, last); // the answer is step × n
    const shown = 3;
    const seq = Array.from({ length: shown }, (_, i) => step * (n - shown + i));
    return { skill, op: "skip", a: step, b: n, step, seq, answer: step * n };
  }
  if (skill === "mul.groups") {
    const a = rng.int(2, 5);
    const b = rng.int(1, 5);
    return { skill, op: "groups", a, b, answer: a * b };
  }
  if (skill === "mul.tens") {
    const a = rng.int(2, 9);
    const b = rng.int(1, 9) * 10;
    return { skill, op: "mul", a, b, answer: a * b };
  }
  if (skill === "mul.unknown") {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return { skill, op: "unknown", a, b, c: a * b, answer: b };
  }
  if (skill.startsWith("div.")) {
    const divisor = rng.pick(FAMILIES[skill]);
    const quotient = rng.int(2, divisor === 10 ? 9 : 10);
    return { skill, op: "div", a: divisor * quotient, b: divisor, answer: quotient };
  }
  const f = rng.pick(FAMILIES[skill]);
  const g = f <= 1 ? rng.int(2, 9) : rng.int(rng.chance(0.15) ? 1 : 2, 9);
  // show the family number first about half the time (order shouldn't matter)
  const [a, b] = rng.chance(0.5) ? [f, g] : [g, f];
  return { skill, op: "mul", a, b, answer: a * b };
}

/** The equation as text, e.g. "7 × 8", "56 ÷ 8", "8 × ? = 48". */
export function equationText(p) {
  if (p.op === "mul") return `${p.a} × ${p.b}`;
  if (p.op === "skip") return `${p.seq.join(", ")}, ?`;
  if (p.op === "groups") return Array(p.a).fill(p.b).join(" + ");
  if (p.op === "div") return `${p.a} ÷ ${p.b}`;
  return `${p.a} × ? = ${p.c}`;
}

/**
 * Why a ×/÷ answer is wrong, if it matches a known pattern (from the
 * Utah Core Guides and common 3rd-grade errors). Returns { code } or null.
 */
export function diagnoseMulDiv(p, answer) {
  const n = Number(answer);
  if (!Number.isFinite(n)) return { code: "not_a_number" };
  if (n === p.answer) return null;
  if (p.op === "skip") {
    if (n === p.seq[p.seq.length - 1] + 1) return { code: "counted_one" };
    if (Math.abs(n - p.answer) === p.step) return { code: "skip_off" };
    return { code: "unknown" };
  }
  if (p.op === "groups") {
    if (n === p.a + p.b) return { code: "added" };
    if (Math.abs(n - p.answer) === p.b) return { code: "off_by_group" };
    return { code: "unknown" };
  }
  if (p.op === "mul") {
    const { a, b } = p;
    if (p.skill === "mul.tens") {
      const fact = a * (b / 10);
      if (n === fact) return { code: "dropped_zero" };
      if (n === fact * 100) return { code: "extra_zero" };
    }
    if ((a === 0 || b === 0) && (n === a || n === b) && n !== 0) return { code: "zero_rule" };
    if ((a === 1 || b === 1) && n === Math.max(a, b) + 1) return { code: "one_rule" };
    if (n === a + b) return { code: "added" };
    if (n === a * (b + 1) || n === a * (b - 1) || n === (a + 1) * b || n === (a - 1) * b) return { code: "off_by_group" };
    if (isNeighborFact(n, a, b)) return { code: "neighbor_fact" };
    if (String(n).split("").reverse().join("") === String(p.answer) && n >= 10) return { code: "reversed_digits" };
    return { code: "unknown" };
  }
  if (p.op === "div") {
    if (n === p.a - p.b) return { code: "subtracted_once" };
    if (Math.abs(n - p.answer) === 1) return { code: "off_by_one" };
    if (n === p.a * p.b) return { code: "multiplied" };
    return { code: "unknown" };
  }
  // missing factor: the ? is a factor, not the answer
  if (n === p.a * p.c) return { code: "multiplied_visible" };
  if (n === p.c - p.a || n === p.c + p.a) return { code: "used_visible" };
  if (Math.abs(n - p.answer) === 1) return { code: "off_by_one" };
  return { code: "unknown" };
}

/** True when n is a product from the times table next door (7 × 8 → 54, 48, 63). */
function isNeighborFact(n, a, b) {
  for (let x = Math.max(0, a - 1); x <= a + 1; x++) {
    for (let y = Math.max(0, b - 1); y <= b + 1; y++) {
      if ((x !== a || y !== b) && x * y === n) return true;
    }
  }
  return false;
}
