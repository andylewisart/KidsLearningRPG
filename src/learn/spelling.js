// Spelling tasks for the Spellwright (Utah 3.R.3). Tiers change how much
// support he gets, not the word list:
//   ★   missing letters: fill in the tricky part (fr _ _ nd)
//   ★★  letter tiles: put the word's letters in order (plus two decoys)
//   ★★★ dictation: hear the word in a sentence and spell it from scratch

import { WORDS, PATTERNS, parseWord } from "../content/words.js";
import { SKILLS } from "./skills.js";

const VOWELS = "aeiou";

/** Words for one spelling skill. School-list words come from the grown-ups corner. */
export function wordsFor(skill, schoolList = []) {
  if (skill === "spell.school") return schoolList.map(schoolEntry).filter(Boolean);
  const pattern = SKILLS[skill]?.pattern;
  return WORDS.filter((e) => e.p === pattern);
}

/** Turn a plain school-list word into a word-bank style entry. */
export function schoolEntry(raw) {
  const word = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (word.length < 2) return null;
  return { w: autoBracket(word), p: "school", s: "", lvl: 2 };
}

/** Mark a likely-tricky span (the first vowel group after the first letter). */
export function autoBracket(word) {
  let i = 1;
  while (i < word.length && !VOWELS.includes(word[i])) i++;
  if (i >= word.length) i = Math.min(1, word.length - 1);
  let j = i + 1;
  while (j < word.length && j - i < 2 && VOWELS.includes(word[j])) j++;
  return `${word.slice(0, i)}[${word.slice(i, j)}]${word.slice(j)}`;
}

/**
 * Pick a word for a skill: words he missed come back first, and words he
 * just saw are skipped so the same one doesn't repeat back to back.
 */
export function pickWord(skill, rng, { schoolList = [], recent = [], missed = [] } = {}) {
  const pool = wordsFor(skill, schoolList);
  if (!pool.length) return null;
  const word = (e) => parseWord(e.w).word;
  const fresh = pool.filter((e) => !recent.includes(word(e)));
  const list = fresh.length ? fresh : pool;
  const again = list.filter((e) => missed.includes(word(e)));
  if (again.length && rng.chance(0.5)) return rng.pick(again);
  return rng.pick(list);
}

/** What the spelling voice reads: the word, its sentence, then the word again (pre-recorded per word). */
export const dictationLine = (word, sentence = "") => (sentence ? `${word}. ${sentence} ${word}.` : `${word}. ${word}.`);

export function buildSpellTask(entry, tier, rng) {
  const { word, before, focus, after } = parseWord(entry.w);
  const rule = PATTERNS[entry.p]?.rule || "Say it slowly and spell each sound you hear.";
  const base = { word, before, focus, after, pattern: entry.p, sentence: entry.s || "", rule, parts: entry.parts || null };
  if (tier === 1) {
    return { ...base, kind: "missing", answer: focus };
  }
  if (tier === 2) {
    const decoys = pickDecoys(word, focus, rng);
    const tiles = rng.shuffle([...word.split(""), ...decoys]);
    return { ...base, kind: "tiles", tiles, decoys, answer: word };
  }
  return { ...base, kind: "dictation", answer: word };
}

const CONFUSIONS = {
  a: "ei",
  e: "ai",
  i: "ey",
  o: "au",
  u: "oa",
  y: "ie",
  c: "ks",
  k: "c",
  s: "cz",
  f: "p",
  h: "w",
  l: "e",
  t: "d",
  n: "m",
};

/** Two decoy letters that a kid could plausibly confuse with the tricky part. */
function pickDecoys(word, focus, rng) {
  const alts = new Set();
  for (const ch of focus) for (const alt of CONFUSIONS[ch] || "") alts.add(alt);
  const filler = "bdgmprtw".split("").filter((c) => !word.includes(c));
  const out = rng.shuffle([...alts]).slice(0, 2);
  while (out.length < 2) out.push(rng.pick(filler.length ? filler : ["x"]));
  return out;
}

/**
 * Check a response. Missing-letter tasks compare just the blank; tiles and
 * dictation need the whole word. focusError says whether the slip landed
 * in the tricky part (so the pattern's rule is the right hint).
 */
export function gradeSpelling(task, response) {
  const attempt = String(response || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const correct = attempt === task.answer;
  let focusError = false;
  if (!correct) {
    focusError =
      task.kind === "missing" ||
      (attempt.startsWith(task.before) && attempt.endsWith(task.after) && attempt.length >= task.before.length + task.after.length);
  }
  return { correct, attempt, focusError };
}

/** Damage for a spell: tier sets the base, longer words hit a little harder. */
export function spellDamage(task, tier) {
  const base = { 1: 40, 2: 110, 3: 260 }[tier] || 40;
  return Math.round(base * (1 + task.word.length / 12));
}
