import { test } from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, WORDS, parseWord } from "../src/content/words.js";

// Pattern id → Utah standard it covers (docs/curriculum.md, "Spelling and word study").
const EXPECTED_PATTERNS = {
  closed: "3.R.3.b",
  open: "3.R.3.b",
  vce: "3.R.3.b",
  vteam: "3.R.3.b",
  rcontrolled: "3.R.3.b",
  cle: "3.R.3.b",
  prefix: "3.R.3.c",
  suffix_ing_ed: "3.R.3.c",
  suffix_es_ies: "3.R.3.c",
  suffix_er_est: "3.R.3.c",
  suffix_tion: "3.R.3.c",
  suffix_ful_less: "3.R.3.c",
  schwa: "3.R.3.d",
  irregular: "3.R.3.e",
  compound: "2.R.3",
  digraph_review: "2.R.3",
  silent_review: "2.R.3",
  diphthong_review: "2.R.3",
};
const STANDARDS = new Set(["3.R.3.b", "3.R.3.c", "3.R.3.d", "3.R.3.e", "2.R.3"]);
const MIN_PER_PATTERN = 16;
const MAX_SENTENCE_WORDS = 14;
const WELL_FORMED = /^[a-z]*\[[a-z]{1,4}\][a-z]*$/;

// Entries whose w is well formed, already split. Malformed ones fail the format
// test; leaving them out here lets the other tests still report their own problems.
const parsed = WORDS.filter((e) => typeof e.w === "string" && WELL_FORMED.test(e.w)).map((e) => ({
  ...e,
  ...parseWord(e.w),
}));

// Collect every failure so one run lists all the bad entries, not just the first.
function expectNoFailures(failures) {
  assert.deepEqual(failures, []);
}

// One sentence: after dropping quote marks, the only . ! or ? is the last character.
const isOneSentence = (text) => /^[^.!?]+[.!?]$/.test(text.replace(/['"]/g, ""));

test("PATTERNS has every expected pattern with a label, a one-sentence rule and its standard", () => {
  assert.deepEqual(Object.keys(PATTERNS).sort(), Object.keys(EXPECTED_PATTERNS).sort());
  const failures = [];
  for (const [id, pattern] of Object.entries(PATTERNS)) {
    if (typeof pattern.label !== "string" || !pattern.label.trim()) failures.push(`${id}: missing label`);
    if (typeof pattern.rule !== "string" || !pattern.rule.trim()) failures.push(`${id}: missing rule`);
    else if (!isOneSentence(pattern.rule)) failures.push(`${id}: rule is not one sentence`);
    if (!STANDARDS.has(pattern.standard)) failures.push(`${id}: invalid standard ${pattern.standard}`);
    else if (pattern.standard !== EXPECTED_PATTERNS[id]) failures.push(`${id}: standard should be ${EXPECTED_PATTERNS[id]}`);
  }
  expectNoFailures(failures);
});

test("every w has one [bracket] of 1–4 lowercase letters and only lowercase letters outside", () => {
  const failures = WORDS.filter((e) => typeof e.w !== "string" || !WELL_FORMED.test(e.w)).map((e) => e.w);
  expectNoFailures(failures);
});

test("parseWord splits a word at its brackets and round-trips every entry", () => {
  assert.deepEqual(parseWord("fr[ie]nd"), { word: "friend", before: "fr", focus: "ie", after: "nd" });
  assert.deepEqual(parseWord("[kn]ight"), { word: "knight", before: "", focus: "kn", after: "ight" });
  for (const bad of ["friend", "fr[]nd", "fr[ie]n[d]", "fr[ie nd", "fr]ie[nd"]) {
    assert.throws(() => parseWord(bad), Error, bad);
  }
  const failures = [];
  for (const { w } of WORDS) {
    const { word, before, focus, after } = parseWord(w);
    if (`${before}[${focus}]${after}` !== w) failures.push(`${w}: does not round-trip`);
    if (word !== before + focus + after || word !== w.replace(/[[\]]/g, "")) failures.push(`${w}: wrong word ${word}`);
  }
  expectNoFailures(failures);
});

test("every p is a pattern in PATTERNS", () => {
  const failures = WORDS.filter((e) => !Object.hasOwn(PATTERNS, e.p)).map((e) => `${e.w}: ${e.p}`);
  expectNoFailures(failures);
});

test(`every pattern has at least ${MIN_PER_PATTERN} words`, () => {
  const counts = Object.fromEntries(Object.keys(PATTERNS).map((id) => [id, 0]));
  for (const e of WORDS) if (e.p in counts) counts[e.p] += 1;
  const failures = Object.entries(counts)
    .filter(([, n]) => n < MIN_PER_PATTERN)
    .map(([id, n]) => `${id}: ${n}`);
  expectNoFailures(failures);
});

test("no word appears twice in the bank", () => {
  const seen = new Map();
  const failures = [];
  for (const { w, word } of parsed) {
    if (seen.has(word)) failures.push(`${word}: ${seen.get(word)} and ${w}`);
    else seen.set(word, w);
  }
  expectNoFailures(failures);
});

test(`every sentence uses the exact word and has at most ${MAX_SENTENCE_WORDS} words`, () => {
  const failures = [];
  for (const { word, s } of parsed) {
    if (typeof s !== "string" || !new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(s)) {
      failures.push(`${word}: not in "${s}"`);
      continue;
    }
    const count = s.split(/\s+/).filter((token) => /[a-z0-9]/i.test(token)).length;
    if (count > MAX_SENTENCE_WORDS) failures.push(`${word}: ${count} words in "${s}"`);
  }
  expectNoFailures(failures);
});

test("every sentence is one sentence that starts with a capital letter", () => {
  const failures = WORDS.filter(({ s }) => typeof s !== "string" || !isOneSentence(s) || !/^['"]?[A-Z]/.test(s)).map(
    (e) => `${e.w}: ${e.s}`,
  );
  expectNoFailures(failures);
});

test("lvl is 1, 2 or 3", () => {
  const failures = WORDS.filter((e) => ![1, 2, 3].includes(e.lvl)).map((e) => `${e.w}: ${e.lvl}`);
  expectNoFailures(failures);
});

// How each pattern places its brackets (see the comments in words.js). Closed
// syllables, compounds and wild words mark whatever is trickiest in that word,
// so they have no fixed shape to check.
const sameLetter = (before, focus) => before.length > 0 && focus[0] === before[before.length - 1];
const BRACKET_SHAPES = {
  open: ({ focus }) => /^[aeiou]$/.test(focus),
  vce: ({ focus, after }) => /^[aeiou][a-z]e$/.test(focus) && after === "",
  vteam: ({ focus }) => ["ai", "ay", "ee", "ea", "oa", "ow", "ie", "igh"].includes(focus),
  rcontrolled: ({ focus }) => /^[aeiou]rr?$/.test(focus),
  cle: ({ focus, after }) => /^[b-df-hj-np-tv-z]le$/.test(focus) && after === "",
  prefix: ({ before, focus }) => before === "" && ["re", "un", "dis", "pre", "mis", "im", "in"].includes(focus),
  suffix_ing_ed: ({ word, before, focus }) =>
    /(ing|ed)$/.test(word) && (["ed", "ing"].includes(focus) || sameLetter(before, focus)),
  suffix_es_ies: ({ focus, after }) => ["es", "ies"].includes(focus) && after === "",
  suffix_er_est: ({ word, before, focus }) =>
    /(er|est)$/.test(word) && (["er", "est", "ie"].includes(focus) || sameLetter(before, focus)),
  suffix_tion: ({ focus, after }) => focus === "tion" && after === "",
  suffix_ful_less: ({ word, focus, after }) =>
    /(ful|less|ly|ness)$/.test(word) && (focus === "i" || (["ful", "less", "ly", "ness"].includes(focus) && after === "")),
  schwa: ({ focus }) => /^[aeiou]$/.test(focus),
  digraph_review: ({ focus }) => ["ph", "ch", "tch", "dge"].includes(focus),
  silent_review: ({ focus }) => ["kn", "wr", "mb", "gn"].includes(focus),
  diphthong_review: ({ focus }) => ["oi", "oy", "ou", "ow", "au", "aw", "oo"].includes(focus),
};

test("brackets follow each pattern's convention", () => {
  const failures = parsed.filter((e) => BRACKET_SHAPES[e.p] && !BRACKET_SHAPES[e.p](e)).map((e) => `${e.p}: ${e.w}`);
  expectNoFailures(failures);
});
