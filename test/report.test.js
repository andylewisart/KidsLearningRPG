// The grown-ups' play report (src/store/report.js) and what the answer log keeps.

import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, skillRowsBySubject } from "../src/store/report.js";
import { freshSave } from "../src/store/save.js";
import { askedText, givenText } from "../src/battle/questions.js";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 10, 18, 0);
const env = {
  now: T0 + DAY,
  build: "test",
  screen: "1280×720 at 1x",
  browser: "node",
  when: (t) => new Date(t).toISOString().slice(0, 16).replace("T", " "),
  day: (t) => new Date(t).toISOString().slice(0, 10),
};
const fight = (t, title, outcome, extra = {}) => ({ t, title, outcome, minutes: 6.5, active: true, right: 4, total: 5, hints: 1, tiers: { 1: 0, 2: 3, 3: 2 }, swaps: 1, potions: 0, overdrives: 1, summons: 0, captures: 0, ...extra });
const answer = (t, extra = {}) => ({ t, skill: "sub.3d.regroup", tier: 2, correct: true, hinted: false, ms: 9000, mistake: null, given: "171", answer: "171", ...extra });

function playedSave() {
  const s = freshSave();
  // more than the old report's 12 fights and 30 answers, over two days
  for (let i = 0; i < 15; i++) s.battles.push(fight(T0 + i * 60000, `Ambush! The Tide Grotto`, "won"));
  s.battles.push(fight(T0 + DAY, "The Geode Titan", "won", { minutes: 213.6, active: undefined }));
  for (let i = 0; i < 50; i++) s.log.push(answer(T0 + i * 1000, i === 3 ? { correct: false, mistake: "unknown", given: "59", asked: "230 − 59" } : {}));
  s.log.push(answer(T0 + DAY, { where: "adventure", skill: "mul.34", given: "36", answer: "36", asked: "4 × 9" }));
  return s;
}

test("the report covers everything saved, day by day, and every fight", () => {
  const text = buildReport(playedSave(), [], env);
  assert.match(text, /Play by day \(everything saved: 16 fights, 51 answers\):/);
  assert.match(text, /- 2026-10-10 · 15 fights \(15 won\) · 50 answers, 98% right first try/);
  assert.match(text, /- 2026-10-11 · 1 fight \(1 won\) · 1 answers \(1 in puzzles\), 100% right first try/);
  assert.match(text, /Fights \(newest first, all 16 saved\):/);
  assert.equal(text.match(/Ambush! The Tide Grotto · won/g).length, 15);
  // a fight from before the play-time clock says its minutes include breaks
  assert.match(text, /The Geode Titan · won · 213.6 min \(clock time, breaks included\)/);
  assert.match(text, /Ambush! The Tide Grotto · won · 6.5 min ·/);
  // answers say what was asked, and where (a puzzle out exploring)
  assert.match(text, /asked 4 × 9 · right · 9.0s · gave 36 · answer 36/);
  assert.match(text, /mul.34 ★2 · puzzle · asked 4 × 9/);
});

test("a fight saved mid-way shows in the report", () => {
  const s = playedSave();
  s.fight = { v: 1, t: T0 + DAY, encounter: { title: "The Geode Titan" }, b: { fiends: [{ boss: true, bar: 2, bars: 3, ko: false }] }, stats: { total: 9 } };
  assert.match(buildReport(s, [], env), /Saved mid-fight: The Geode Titan, the boss on HP bar 2 of 3, 9 answers in so far/);
});

test("skills are grouped by subject, easiest first, so addition and subtraction can't be mixed up", () => {
  const row = (id, track, label) => ({ id, track, label, standard: "3.NBT.2", level: "learning", correct: 1, attempts: 2 });
  const skills = [row("add.2d.regroup", "add", "2-digit with regrouping"), row("sub.3d", "sub", "3-digit subtraction"), row("sub.2d.regroup", "sub", "2-digit with regrouping"), row("mul.34", "mul", "× 3 and × 4")];
  const text = buildReport(freshSave(), skills, env);
  const at = (s) => text.indexOf(s);
  assert.ok(at("Subtraction:") < at("- 2-digit with regrouping") && at("- 2-digit with regrouping") < at("- 3-digit subtraction") && at("- 3-digit subtraction") < at("Addition:"));
  assert.ok(at("Addition:") < at("Multiplying and dividing:"));
  const rows = skillRowsBySubject(skills);
  assert.deepEqual(rows.map((r) => r.heading || r.id), ["Subtraction", "sub.2d.regroup", "sub.3d", "Addition", "add.2d.regroup", "Multiplying and dividing", "mul.34"]);
});

test("the log keeps the question, and a filled-in word as the whole word", () => {
  // ★ spelling: he types just the missing letters of "fishhook"
  const q = { task: { kind: "missing", word: "fishhook", before: "fis", focus: "hh", after: "ook" }, tutor: { equation: "" } };
  assert.equal(askedText(q), "fis__ook");
  assert.equal(givenText(q, "HH"), "fishhook");
  assert.equal(givenText(q, "h"), "fishook", "a slip shows as the word he made");
  // tiles and dictation already give the whole word
  assert.equal(givenText({ task: { kind: "tiles", word: "magnet" } }, "magnet"), "magnet");
  assert.equal(askedText({ tutor: { equation: "532 − 218" }, panel: { equation: "532 − 218" } }), "532 − 218");
  assert.equal(askedText({ tutor: { equation: "8 × ? = 48" }, panel: { equation: "?" } }), "8 × ? = 48");
  assert.equal(askedText({ panel: {} }), null);
  assert.equal(givenText({ panel: {} }, "36"), "36");
});
