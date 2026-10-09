// Addition and subtraction within 1,000 (Utah 3.NBT.2): sorting problems
// into skills, making problems of a given skill, and recognizing the
// classic mistakes so the tutor can teach the right fix.

const ones = (n) => n % 10;
const tens = (n) => Math.floor(n / 10) % 10;
const hundreds = (n) => Math.floor(n / 100) % 10;

/** Which columns need a trade for a − b (a ≥ b). */
export function subTrades(a, b) {
  const onesTrade = ones(a) < ones(b);
  const tensTrade = tens(a) - (onesTrade ? 1 : 0) < tens(b);
  // Taking a ten for the ones when the tens place is 0 means going
  // through the hundreds: the classic "across zeros" problem.
  const acrossZero = onesTrade && a >= 100 && tens(a) === 0;
  return { onesTrade, tensTrade, acrossZero };
}

/** The skill a subtraction a − b practices. */
export function classifySub(a, b) {
  if (!(a >= b && b >= 0)) throw new RangeError(`not a subtraction: ${a} - ${b}`);
  if (a <= 20) return "sub.facts";
  const t = subTrades(a, b);
  if (a < 100) return t.onesTrade ? "sub.2d.regroup" : "sub.2d";
  if (t.acrossZero) return "sub.3d.zeros";
  if (t.onesTrade && t.tensTrade) return "sub.3d.regroup2";
  if (t.onesTrade || t.tensTrade) return "sub.3d.regroup";
  return "sub.3d";
}

/** The skill an addition a + b practices (sum within 1,000). */
export function classifyAdd(a, b) {
  const sum = a + b;
  if (sum > 999) throw new RangeError(`sum over 999: ${a} + ${b}`);
  if (sum <= 20) return "add.facts";
  const c1 = ones(a) + ones(b) >= 10 ? 1 : 0;
  const c2 = tens(a) + tens(b) + c1 >= 10 ? 1 : 0;
  if (sum < 100) return c1 ? "add.2d.regroup" : "add.2d";
  const carries = c1 + c2;
  return carries === 0 ? "add.3d" : carries === 1 ? "add.3d.regroup" : "add.3d.regroup2";
}

// Ranges to sample from for problems that aren't tied to an HP bar.
const SUB_RANGES = {
  "sub.facts": [[11, 18], [3, 9]],
  "sub.2d": [[25, 99], [10, 89]],
  "sub.2d.regroup": [[30, 99], [11, 89]],
  "sub.3d": [[200, 999], [100, 899]],
  "sub.3d.regroup": [[200, 999], [50, 899]],
  "sub.3d.regroup2": [[200, 999], [50, 899]],
  "sub.3d.zeros": [[200, 999], [50, 899]],
};
const ADD_RANGES = {
  "add.facts": [[3, 9], [3, 9]],
  "add.2d": [[11, 70], [11, 29]],
  "add.2d.regroup": [[15, 70], [15, 29]],
  "add.3d": [[100, 600], [100, 399]],
  "add.3d.regroup": [[100, 600], [30, 399]],
  "add.3d.regroup2": [[100, 600], [30, 399]],
};

/** A free-standing subtraction problem of the given skill. */
export function genSub(skill, rng) {
  const [[aMin, aMax], [bMin, bMax]] = SUB_RANGES[skill];
  for (let i = 0; i < 4000; i++) {
    let a = rng.int(aMin, aMax);
    if (skill === "sub.3d.zeros" && rng.chance(0.7)) a = hundreds(a) * 100 + ones(a); // put a 0 in the tens place
    const b = rng.int(bMin, Math.min(bMax, a));
    if (b <= a && classifySub(a, b) === skill) return { skill, a, b, answer: a - b, op: "sub" };
  }
  throw new Error(`could not make ${skill}`);
}

/** A free-standing addition problem of the given skill. */
export function genAdd(skill, rng) {
  const [[aMin, aMax], [bMin, bMax]] = ADD_RANGES[skill];
  for (let i = 0; i < 4000; i++) {
    const a = rng.int(aMin, aMax);
    const b = rng.int(bMin, bMax);
    if (a + b <= 999 && classifyAdd(a, b) === skill) return { skill, a, b, answer: a + b, op: "add" };
  }
  throw new Error(`could not make ${skill}`);
}

/**
 * The Knight's strike: the fiend has `hp`; the strike's damage d is chosen
 * so the HP math practices `skill`, preferring damage inside [lo, hi].
 *   d < hp → "left":     hp − d  (how much HP is left?)
 *   d > hp → "overkill": d − hp  (how much extra damage? It's a knockout.)
 * Falls back to the nearest skill on the ladder when the HP can't make
 * the asked-for kind of problem.
 */
// With 3-digit HP every strike is 3-digit math, so 2-digit skills become
// their 3-digit cousins (regrouping stays regrouping).
const THREE_DIGIT_COUSIN = { "sub.facts": "sub.3d", "sub.2d": "sub.3d", "sub.2d.regroup": "sub.3d.regroup" };

export function genStrike(hp, skill, [lo, hi], rng, ladder) {
  if (hp >= 100 && THREE_DIGIT_COUSIN[skill]) skill = THREE_DIGIT_COUSIN[skill];
  const order = ladder ? nearestFirst(ladder, skill) : [skill];
  for (const s of order) {
    const options = [];
    for (let d = 1; d <= 999; d++) {
      if (d === hp) continue;
      const [a, b] = d < hp ? [hp, d] : [d, hp];
      if (classifySub(a, b) === s) options.push(d);
    }
    if (!options.length) continue;
    const inBand = options.filter((d) => d >= lo && d <= hi);
    const d = inBand.length ? rng.pick(inBand) : closestTo(options, (lo + hi) / 2, rng);
    const kind = d < hp ? "left" : "overkill";
    const [a, b] = kind === "left" ? [hp, d] : [d, hp];
    return { skill: s, a, b, answer: a - b, op: "sub", kind, damage: d, hp };
  }
  throw new Error(`no strike possible for hp ${hp}`);
}

/**
 * A potion heals `heal` HP: hp + heal = ? with the sum staying at or under maxHp.
 * Returns null when the hero is already (nearly) full.
 */
export function genHeal(hp, maxHp, skill, rng, ladder) {
  const room = maxHp - hp;
  if (room < 5) return null;
  const order = ladder ? nearestFirst(ladder, skill) : [skill];
  for (const s of order) {
    const options = [];
    for (let h = 5; h <= room; h++) if (classifyAdd(hp, h) === s) options.push(h);
    if (options.length) {
      const heal = closestTo(options, Math.min(room, Math.max(60, room * 0.6)), rng);
      return { skill: s, a: hp, b: heal, answer: hp + heal, op: "add", heal };
    }
  }
  return { skill: classifyAdd(hp, room), a: hp, b: room, answer: maxHp, op: "add", heal: room };
}

function nearestFirst(ladder, skill) {
  const i = Math.max(0, ladder.indexOf(skill));
  // the asked-for skill, then easier ones (closest first), then harder ones
  return [ladder[i], ...ladder.slice(0, i).reverse(), ...ladder.slice(i + 1)];
}

function closestTo(list, target, rng) {
  let best = Infinity;
  let picks = [];
  for (const x of list) {
    const d = Math.abs(x - target);
    if (d < best - 1e-9) {
      best = d;
      picks = [x];
    } else if (Math.abs(d - best) < 1e-9) picks.push(x);
  }
  // a little variety among near-ties so problems don't repeat
  const near = list.filter((x) => Math.abs(x - target) <= best + Math.max(3, target * 0.08));
  return rng.pick(near.length ? near : picks);
}

// ---------------------------------------------------------------- mistakes

const digitsOf = (n) => [ones(n), tens(n), hundreds(n)];
const fromDigits = ([o, t, h]) => h * 100 + t * 10 + o;

/** Each column's smaller digit taken from the bigger one (352 − 128 → 236). */
export function smallerFromLarger(a, b) {
  const A = digitsOf(a);
  const B = digitsOf(b);
  return fromDigits(A.map((d, i) => Math.abs(d - B[i])));
}

/** Traded ten ones in, but never took the ten away (352 − 128 → 234). */
export function tradeWithoutTakeAway(a, b) {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const out = A.map((d, i) => (d < B[i] ? d + 10 - B[i] : d - B[i]));
  return fromDigits(out);
}

/** Added each column but never carried (456 + 278 → 624). */
export function noCarry(a, b) {
  const A = digitsOf(a);
  const B = digitsOf(b);
  return fromDigits(A.map((d, i) => (d + B[i]) % 10));
}

/**
 * Why an add/subtract answer is wrong, if it matches a known pattern.
 * Returns { code, diff } or null when it's correct or unexplained.
 */
export function diagnoseArith({ a, b, op }, answer) {
  const n = Number(answer);
  if (!Number.isFinite(n)) return { code: "not_a_number" };
  const right = op === "sub" ? a - b : a + b;
  if (n === right) return null;
  const diff = n - right;
  if (op === "sub") {
    if (n === a + b) return { code: "added_instead", diff };
    const trades = subTrades(a, b);
    // Zeros in the middle trip kids up in many different ways, and the
    // across-zeros lesson is the one that fixes all of them.
    if (trades.acrossZero) return { code: "across_zero", diff };
    if ((trades.onesTrade || trades.tensTrade) && n === smallerFromLarger(a, b)) return { code: "smaller_from_larger", diff };
    if ((trades.onesTrade || trades.tensTrade) && n === tradeWithoutTakeAway(a, b)) return { code: "no_take_away", diff };
  } else {
    if (n === Math.abs(a - b)) return { code: "subtracted_instead", diff };
    if (n === noCarry(a, b)) return { code: "no_carry", diff };
  }
  if ([10, 100, -10, -100].includes(diff)) return { code: "place_slip", diff };
  if (Math.abs(diff) <= 2) return { code: "close", diff };
  return { code: "unknown", diff };
}
