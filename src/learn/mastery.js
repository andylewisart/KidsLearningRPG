// Tracks how he does on every skill, decides what ★ / ★★ / ★★★ mean for
// him right now, and reports Utah-style levels to the grown-ups corner.
//
// Two different numbers on purpose:
// - estimate(): a quick-moving guess used to pick problems mid-battle.
// - level(): the slower, evidence-based label from docs/curriculum.md
//   (needs 10+ attempts over 3+ days before it says "on track").

import { SKILLS, MEMORY_SKILLS, startingGuess } from "./skills.js";

const DAY = 24 * 60 * 60 * 1000;
const KEEP = 30; // attempts remembered per skill
const SECURE = 0.85; // estimate at which a skill counts as solid for tier picking
const PRIOR_WEIGHT = 2; // the starting guess counts like two attempts (older than any real one)
const DECAY = 0.85; // older attempts count a little less each step back
const FACT_MS = 3000; // "from memory" means about 3 seconds

const NO_FOCUS = new Set();
const FOCUS_SHARE = 0.5; // how often ★★ goes to a focus skill instead of his edge

export const LEVELS = ["new", "learning", "practicing", "ontrack", "mastered"];

// Attempt tuples keep saves small: [time, correct, tier, hinted, ms].
const T = 0;
const C = 1;
const TIER = 2;
const H = 3;
const MS = 4;

/**
 * gradeOf(track) is the player's grade in that subject (players.js); it sets
 * the starting guess and how far down ★ reviews reach. Without it, 3rd grade.
 * focus() is the skills a grown-up asked for more practice on (a Set of ids);
 * pickTiers leans on them.
 */
export function createMastery(saved = {}, { now = () => Date.now(), gradeOf = () => 3, focus = () => NO_FOCUS } = {}) {
  const skills = JSON.parse(JSON.stringify(saved.skills || {}));
  const rec = (id) => (skills[id] ??= { a: [], n: 0, k: 0 });

  function record(id, { correct, tier = 2, hinted = false, ms = 0 }) {
    const r = rec(id);
    r.a.push([now(), correct ? 1 : 0, tier, hinted ? 1 : 0, Math.max(0, Math.round(ms))]);
    if (r.a.length > KEEP) r.a.shift();
    r.n += 1;
    if (correct) r.k += 1;
    const lv = level(id);
    if ((lv === "ontrack" || lv === "mastered") && !r.ot) r.ot = now();
    if (lv !== "ontrack" && lv !== "mastered") delete r.ot; // slipped: the two-week clock restarts
  }

  /** Chance he gets the next one right, from recent answers plus the starting guess. */
  function estimate(id) {
    const prior = startingGuess(id, gradeOf(SKILLS[id]?.track));
    const recent = skills[id]?.a.slice(-12) ?? [];
    // the guess counts as the oldest answers, so it fades like them: a low
    // guess can't hold a skill below "solid" once the real answers are in
    const pw = PRIOR_WEIGHT * Math.pow(DECAY, recent.length);
    let weight = pw;
    let score = prior * pw;
    recent.forEach((x, i) => {
      const w = Math.pow(DECAY, recent.length - 1 - i);
      weight += w;
      score += w * (x[C] ? (x[H] ? 0.5 : 1) : 0);
    });
    return score / weight;
  }

  /** The grown-up-facing level, using the rules in docs/curriculum.md. */
  function level(id) {
    const r = skills[id];
    if (!r || r.a.length === 0) return "new";
    const last10 = r.a.slice(-10);
    const clean = last10.filter((x) => x[C] && !x[H]).length;
    const acc = clean / last10.length;
    if (acc < 0.7) return "learning";
    const days = new Set(last10.map((x) => Math.floor(x[T] / DAY))).size;
    const hinted = last10.some((x) => x[H]);
    if (acc < 0.9 || last10.length < 10 || days < 3 || hinted) return "practicing";
    if (MEMORY_SKILLS.has(id)) {
      const times = last10.filter((x) => x[C] && x[TIER] >= 2).map((x) => x[MS]);
      if (times.length < 5 || median(times) > FACT_MS) return "ontrack";
    }
    return r.ot && now() - r.ot >= 14 * DAY ? "mastered" : "ontrack";
  }

  /**
   * What level() is weighing, for a skill gate on the Crystal Grid to show
   * him how close he is: of his last ten answers, how many were right with no
   * hint, and on how many different days he gave them.
   */
  function evidence(id) {
    const last10 = skills[id]?.a.slice(-10) ?? [];
    return { level: level(id), right: last10.filter((x) => x[C] && !x[H]).length, of: last10.length, days: new Set(last10.map((x) => Math.floor(x[T] / DAY))).size };
  }

  function lastSeen(id) {
    const a = skills[id]?.a;
    return a?.length ? a[a.length - 1][T] : 0;
  }

  /**
   * What each tier means right now, for one ladder of skills.
   * ★★ is his edge (the easiest skill that isn't solid yet), ★★★ the next
   * one up, and ★ a solid skill he hasn't seen in a while (spaced review).
   */
  function pickTiers(ladder, rng) {
    const est = ladder.map((id) => estimate(id));
    let edge = est.findIndex((p) => p < SECURE);
    const allSolid = edge === -1;
    if (allSolid) edge = ladder.length - 1;
    // ★ reviews what's solid, but not rungs from long ago that the game has
    // only assumed (below their grade and never practiced here)
    const grade = gradeOf(SKILLS[ladder[0]]?.track);
    const reviewable = (id) => (SKILLS[id]?.grade ?? 3) >= grade || (lastSeen(id) > 0 && (SKILLS[id]?.grade ?? 3) >= grade - 1);
    const solid = ladder.slice(0, edge).filter((id, i) => est[i] >= SECURE && reviewable(id));
    const t = now();
    const review = solid.length
      ? rng
        ? rng.weighted(solid, (id) => 1 + (t - lastSeen(id)) / DAY)
        : solid[solid.length - 1]
      : ladder[edge];
    const top = Math.min(edge + 1, ladder.length - 1);
    const tiers = {
      1: { skill: review, support: solid.length === 0 },
      2: { skill: ladder[edge], support: false },
      3: { skill: ladder[top], support: false, stretch: allSolid || top === edge },
    };
    // A grown-up's focus skills: ★ always practices one (with the picture
    // help while it's shaky), and ★★ does half the time, so the climb up the
    // ladder still goes on. The one he's seen least lately comes first.
    const wanted = focus();
    const focused = ladder.filter((id) => wanted.has(id));
    if (focused.length) {
      const pick = () => (rng ? rng.weighted(focused, (id) => 1 + (t - lastSeen(id)) / DAY) : focused.reduce((a, b) => (lastSeen(b) < lastSeen(a) ? b : a)));
      const f = pick();
      tiers[1] = { skill: f, support: estimate(f) < SECURE, focus: true };
      if (rng?.chance(FOCUS_SHARE)) tiers[2] = { skill: pick(), support: false, focus: true };
    }
    return tiers;
  }

  /** One row per practiced skill, for the grown-ups corner and reports. */
  function summary() {
    return Object.keys(skills)
      .filter((id) => SKILLS[id])
      .map((id) => ({
        id,
        label: SKILLS[id].label,
        standard: SKILLS[id].standard,
        track: SKILLS[id].track,
        level: level(id),
        estimate: Math.round(estimate(id) * 100) / 100,
        attempts: skills[id].n,
        correct: skills[id].k,
        lastSeen: lastSeen(id),
      }));
  }

  return { record, estimate, level, evidence, lastSeen, pickTiers, summary, toJSON: () => ({ skills }) };
}

function median(list) {
  const s = list.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
