// The writing judge, for the game's screens: Claude reads what he wrote and
// names the writing moves he used (ai/claude.js, judgeWriting), with the
// offline word list (learn/writing.js) whenever there's no key, the day's
// allowance is used up, or the answer is slow. The word list alone misses
// things ("waves crashing"); Claude reads it the way a teacher would.

import { judgeWriting } from "./claude.js";
import { heuristicJudge } from "../learn/writing.js";
import { getSave, spendUsage } from "../store/save.js";

const CAPS = { judge: 60, live: 200 }; // calls a day: on submit, and while he types

/**
 * Claude's reading of his writing, or null (no key, over the day's
 * allowance, too slow, or an error): callers fall back to heuristicJudge.
 *   task   what he was asked to write
 *   live   true while he's still typing (its own, bigger allowance)
 */
export async function aiJudge({ task, text, live = false, timeoutMs = live ? 8000 : 7000, signal } = {}) {
  const key = getSave()?.settings?.anthropicKey;
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  if (!key || words < 2) return null;
  if (!spendUsage(live ? "live" : "judge", live ? CAPS.live : CAPS.judge)) return null;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeoutMs);
  signal?.addEventListener("abort", () => stop.abort());
  try {
    return await judgeWriting({ key, task, text, signal: stop.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The best judgment available: Claude's when it answers, else the word list's. */
export async function judgeBest({ task, text }) {
  return (await aiJudge({ task, text })) || heuristicJudge(text);
}
