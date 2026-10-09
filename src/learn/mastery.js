// Tracks how he does on every skill, decides what ★ / ★★ / ★★★ mean for
// him right now, and reports Utah-style levels to the grown-ups corner.
//
// Two different numbers on purpose:
// - estimate(): a quick-moving guess used to pick problems mid-battle.
// - level(): the slower, evidence-based label from docs/curriculum.md
//   (needs 10+ attempts over 3+ days before it says "on track").

import { SKILLS, STARTING_GUESS, MEMORY_SKILLS } from "./skills.js";

const DAY = 24 * 60 * 60 * 1000;
const KEEP = 30; // attempts remembered per skill
const SECURE = 0.85; // estimate at which a skill counts as solid for tier picking
const PRIOR_WEIGHT = 2; // the starting guess counts like two attempts
const DECAY = 0.85; // older attempts count a little less each step back
const FACT_MS = 3000; // "from memory" means about 3 seconds

export const LEVELS = ["new", "learning", "practicing", "ontrack", "mastered"];

// Attempt tuples keep saves small: [time, correct, tier, hinted, ms].
const T = 0;
const C = 1;
const TIER = 2;
const H = 3;
const MS = 4;

export function createMastery(saved = {}, { now = () => Date.now() } = {}) {
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
    const prior = STARTING_GUESS[id] ?? 0.5;
    const recent = skills[id]?.a.slice(-12) ?? [];
    let weight = PRIOR_WEIGHT;
    let score = prior * PRIOR_WEIGHT;
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
    const solid = ladder.slice(0, edge).filter((_, i) => est[i] >= SECURE);
    const t = now();
    const review = solid.length
      ? rng
        ? rng.weighted(solid, (id) => 1 + (t - lastSeen(id)) / DAY)
        : solid[solid.length - 1]
      : ladder[edge];
    const top = Math.min(edge + 1, ladder.length - 1);
    return {
      1: { skill: review, support: solid.length === 0 },
      2: { skill: ladder[edge], support: false },
      3: { skill: ladder[top], support: false, stretch: allSolid || top === edge },
    };
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

  return { record, estimate, level, lastSeen, pickTiers, summary, toJSON: () => ({ skills }) };
}

function median(list) {
  const s = list.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
