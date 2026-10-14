// Telling time and measuring (Utah 3.MD.1, 3.MD.2): chapter 2's harbor runs
// on clocks, tide tables, scales and jugs. Time is to the minute, with
// elapsed time in minutes (never more than an hour, so it stays a 3rd-grade
// interval). Mass is in grams and liquid volume in milliliters, read off a
// scale or a jug, and the word problems are one step in the same units.
// Underneath, for a younger player: hours and half hours (1.MD.3), five
// minutes at a time (2.MD.7), and reading a scale like a number line (2.MD.6).
// Pure, so it's tested (test/measure.test.js).

// ---------------------------------------------------------------- time

/** A time on a 12-hour clock face: { h: 1..12, m: 0..59 }. "3:05". */
export const timeText = ({ h, m }) => `${h}:${String(m).padStart(2, "0")}`;

/** Minutes after 12:00 on the face (12:00 is 0, 11:59 is 719). */
const onFace = ({ h, m }) => (h % 12) * 60 + m;
const fromFace = (n) => {
  const x = ((n % 720) + 720) % 720;
  return { h: Math.floor(x / 60) || 12, m: x % 60 };
};

/** Add minutes to a time, round the face. */
export const addMinutes = (t, mins) => fromFace(onFace(t) + mins);
/** Minutes from one time to a later one (round the face, so 11:50 to 12:10 is 20). */
export const minutesBetween = (a, b) => (((onFace(b) - onFace(a)) % 720) + 720) % 720;

/** What he typed or set ("3:05", "305", "3 05"), as a time; null if it isn't one. */
export function parseTime(v) {
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})\s*[:.\s]\s*(\d{2})$/) || s.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 1 || h > 12 || mm > 59) return null;
  return { h, m: mm };
}

const sameTime = (a, b) => Boolean(a && b) && a.h === b.h && a.m === b.m;

/** How finely each time skill reads the minute hand. */
const STEP = { "time.half": 30, "time.five": 5, "time.minute": 1 };

/**
 * One time problem.
 *   op "read":    set (or read) the clock to `time`; the answer is the time
 *   op "between": it was `start`, it's `end` now: how many minutes? (answer: a number)
 *   op "end":     it starts at `start` and lasts `mins`: when does it end? (answer: a time)
 * Elapsed problems cross the hour about two times in three (the hard part),
 * and never run past an hour.
 */
export function genTime(skill, rng, { op = null } = {}) {
  if (skill === "time.elapsed") {
    const kind = op === "end" || op === "between" ? op : rng.pick(["between", "end"]);
    const crossing = rng.chance(0.67);
    let start;
    let mins;
    for (let i = 0; i < 50; i++) {
      start = { h: rng.int(1, 11), m: rng.int(1, 11) * 5 };
      mins = rng.chance(0.75) ? rng.int(2, 12) * 5 : rng.int(7, 58);
      if (crossing === start.m + mins > 60) break;
    }
    const end = addMinutes(start, mins);
    return kind === "end" ? { skill, op: "end", start, mins, answer: end } : { skill, op: "between", start, end, mins, answer: mins };
  }
  const step = STEP[skill] || 1;
  let m = rng.int(0, Math.floor(59 / step)) * step;
  // a minute-skill time is a real "to the minute" one most of the time
  if (step === 1 && m % 5 === 0 && rng.chance(0.7)) m = Math.min(59, m + rng.int(1, 4));
  const time = { h: rng.int(1, 12), m };
  return { skill, op: "read", time, answer: time };
}

/** The answer as he'd write it: "4:05", or a number of minutes. */
export const timeAnswerText = (p) => (p.op === "between" ? String(p.answer) : timeText(p.answer));

/** Is this the right answer? (Times compare on the face; minutes as a number.) */
export function checkTime(p, v) {
  if (p.op === "between") return Number(String(v).trim()) === p.answer;
  return sameTime(parseTime(v), p.answer);
}

/**
 * Why a wrong time answer might be wrong (docs/curriculum.md, mistakes):
 *   hour_hand      right minutes, an hour out (2:50 read as 3:50: the hour hand is *near* 3)
 *   hands_swapped  the hour and minute hands read the wrong way round
 *   base_ten_time  worked like a 100-minute hour (9:45 + 30 → 9:75, or 4:20 − 3:45 → 75)
 *   forgot_hour    crossed the hour, but the hour didn't move on (8:15 + 50 → 8:05)
 */
export function diagnoseTime(p, v) {
  if (p.op === "between") {
    const n = Number(String(v).trim());
    if (!Number.isFinite(n)) return null;
    const base100 = p.end.h * 100 + p.end.m - (p.start.h * 100 + p.start.m);
    if (n === base100 && base100 !== p.answer) return { code: "base_ten_time" };
    if (Math.abs(n - p.answer) === 60) return { code: "hour_hand" };
    return null;
  }
  const raw = String(v ?? "").trim().match(/^(\d{1,2})\s*[:.\s]?\s*(\d{2})$/);
  if (p.op === "end" && raw && Number(raw[2]) === p.start.m + p.mins && Number(raw[2]) >= 60) return { code: "base_ten_time" };
  const t = parseTime(v);
  if (!t) return null;
  const want = p.answer;
  if (p.op === "end" && t.h === p.start.h && t.m === want.m && want.h !== p.start.h) return { code: "forgot_hour" };
  if (t.m === want.m && Math.abs(onFace(t) - onFace(want)) % 720 === 60) return { code: "hour_hand" };
  if (t.m === (want.h % 12) * 5 && Math.round(want.m / 5) % 12 === t.h % 12) return { code: "hands_swapped" };
  return null;
}

/** A hint for a time problem: { text, visual } (visual specs for ui/visuals.js). */
export function timeHint(p, v) {
  const d = v == null ? null : diagnoseTime(p, v);
  if (p.op === "read") {
    const t = p.answer;
    if (d?.code === "hour_hand") return { text: `Look where the short hand really is. Past ${t.h}, it's still ${t.h} o'clock until it reaches the next number.`, visual: { kind: "clock", ...t } };
    if (d?.code === "hands_swapped") return { text: "The short hand is the hour. The long hand is the minutes: count by fives round the numbers.", visual: { kind: "clock", ...t } };
    if (p.skill === "time.half") return { text: `${t.m === 30 ? "Half past" : "On the hour"}: the long hand points ${t.m === 30 ? "straight down, at the 6" : "straight up, at the 12"}. The short hand shows the hour.`, visual: { kind: "clock", ...t } };
    return { text: "The long hand counts minutes: 5 for every number it passes, then the little marks one at a time. The short hand is the hour.", visual: { kind: "clock", ...t } };
  }
  const { start } = p;
  const end = p.op === "end" ? p.answer : p.end;
  const toHour = 60 - start.m;
  const jumps = [];
  if (p.mins > toHour) jumps.push({ from: start, to: addMinutes(start, toHour), mins: toHour }, { from: addMinutes(start, toHour), to: end, mins: p.mins - toHour });
  else jumps.push({ from: start, to: end, mins: p.mins });
  const visual = { kind: "time_jumps", jumps: jumps.map((j) => ({ from: timeText(j.from), to: timeText(j.to), mins: j.mins })), hide: p.op === "end" ? "end" : "mins" };
  if (d?.code === "base_ten_time") return { text: "An hour has 60 minutes, not 100. Jump to the next o'clock first, then count on.", visual };
  if (d?.code === "forgot_hour") return { text: `Going past ${timeText({ h: start.h, m: 0 }).replace(":00", "")} o'clock moves the hour on by one.`, visual };
  if (p.op === "between") return { text: `Count on from ${timeText(start)}. Jump to the next o'clock if you can, then on to ${timeText(end)}. Add the jumps.`, visual };
  return { text: `Start at ${timeText(start)} and count on ${p.mins} minutes. Jump to the next o'clock first, if it's on the way.`, visual };
}

// ---------------------------------------------------------------- mass and liquid volume

/** A scale or jug: how far it goes, and its marks. Values sit on a mark. */
function dial(rng, skill) {
  if (skill === "measure.read") return { max: 100, major: 10, minor: 5 };
  return rng.pick([
    { max: 1000, major: 100, minor: 50 },
    { max: 500, major: 100, minor: 25 },
    { max: 1000, major: 200, minor: 50 },
  ]);
}

/**
 * One measuring problem, in grams ("g") or milliliters ("mL").
 *   op "read":  what does the scale (or jug) show? `dial` is its marks, `value` where it points
 *   op "more":  there's `a`, the recipe needs `b`: how much more?    (within 1,000)
 *   op "total": `a` and `b` together                                  (within 1,000)
 *   op "times": `a` scoops of `b` each                                 (within 100)
 *   op "share": `a` shared equally into `b`                            (within 100, no remainders)
 */
export function genMeasure(skill, rng, { unit = "g" } = {}) {
  if (skill === "measure.solve") {
    const op = rng.pick(["more", "more", "total", "times", "share"]);
    if (op === "more") {
      const b = rng.int(3, 10) * 50;
      const a = rng.int(1, b / 25 - 1) * 25;
      return { skill, op, a, b, unit, answer: b - a };
    }
    if (op === "total") {
      const a = rng.int(2, 9) * (rng.chance(0.5) ? 50 : 10);
      const b = rng.int(2, 9) * (rng.chance(0.5) ? 50 : 10);
      return { skill, op, a, b, unit, answer: a + b };
    }
    const each = rng.pick([2, 5, 10, 10, 5, 4]);
    const n = rng.int(2, 9);
    if (op === "times") return { skill, op, a: n, b: each, unit, answer: n * each };
    return { skill, op, a: n * each, b: n, unit, answer: each };
  }
  const d = dial(rng, skill);
  const value = rng.int(1, d.max / d.minor - 1) * d.minor;
  // reading a jug is volume, even when the story asks about a scale
  const u = skill === "measure.volume" ? "mL" : skill === "measure.mass" ? "g" : unit;
  return { skill, op: "read", dial: d, value, unit: u, answer: value };
}

/** The problem as a number sentence, for the window and the grown-ups' log. */
export function measureEquation(p) {
  const u = ` ${p.unit}`;
  if (p.op === "more") return `${p.b}${u} − ${p.a}${u}`;
  if (p.op === "total") return `${p.a}${u} + ${p.b}${u}`;
  if (p.op === "times") return `${p.a} × ${p.b}${u}`;
  if (p.op === "share") return `${p.a}${u} ÷ ${p.b}`;
  return `?${u}`;
}

/** The picture the window shows for a reading problem (and as help for the rest). */
export const measureVisual = (p, { pointer = true } = {}) =>
  p.op === "read" ? { kind: p.unit === "mL" ? "jug" : "scale", ...p.dial, value: pointer ? p.value : null, unit: p.unit } : null;

/**
 * Why a wrong measuring answer might be wrong:
 *   counted_marks  counted the little marks as ones (a mark worth 50 read as 1)
 *   next_mark      one mark out
 *   added          added when it was "how much more"
 *   subtracted     took away when it was "together"
 */
export function diagnoseMeasure(p, v) {
  const n = Number(String(v).trim());
  if (!Number.isFinite(n)) return null;
  if (p.op === "read") {
    const marks = p.value / p.dial.minor;
    const below = Math.floor(p.value / p.dial.major) * p.dial.major;
    if (n === marks || n === below + (p.value - below) / p.dial.minor) return { code: "counted_marks" };
    if (Math.abs(n - p.value) === p.dial.minor) return { code: "next_mark" };
    return null;
  }
  if (p.op === "more" && n === p.a + p.b) return { code: "added" };
  if (p.op === "total" && n === Math.abs(p.a - p.b)) return { code: "subtracted" };
  return null;
}

/** A hint for a measuring problem: { text, visual }. */
export function measureHint(p, v) {
  const d = v == null ? null : diagnoseMeasure(p, v);
  const u = p.unit === "mL" ? "milliliters" : "grams";
  if (p.op === "read") {
    const visual = measureVisual(p);
    const per = p.dial.minor;
    if (d?.code === "counted_marks") return { text: `Each little mark isn't 1. Count the marks between two numbers: each one is ${per} ${u}.`, visual };
    return { text: `Find the last number before the pointer, then count on ${per} for each little mark.`, visual };
  }
  if (p.op === "more") return { text: d?.code === "added" ? `"How much more" is the gap from ${p.a} up to ${p.b}. Count on, or take away.` : `Count on from ${p.a} to ${p.b}. Jump to the next hundred if you can.`, visual: { kind: "number_line", start: p.a, end: p.b, jumps: [] } };
  if (p.op === "total") return { text: `Together means add: ${p.a} + ${p.b}. Hundreds first, then the rest.`, visual: null };
  if (p.op === "times") return { text: `${p.a} scoops of ${p.b} ${u}: count by ${p.b}s, ${p.a} times.`, visual: { kind: "array", rows: p.a, cols: Math.min(p.b, 10) } };
  return { text: `Share ${p.a} into ${p.b} equal parts. What times ${p.b} makes ${p.a}?`, visual: { kind: "share", total: p.a, groups: p.b } };
}
