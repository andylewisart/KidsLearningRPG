// Chapter 2's puzzles (src/world/puzzles2.js): real problems at each child's
// grade, tagged with Utah skills, inside the grade-3 limits.

import test from "node:test";
import assert from "node:assert/strict";
import { PUZZLES, PUZZLE_TRACK } from "../src/world/puzzles.js";
import { FOG_WORDS, halPuzzle, fogPuzzle } from "../src/world/puzzles2.js";
import { createMastery } from "../src/learn/mastery.js";
import { SKILLS } from "../src/learn/skills.js";
import { WORDS, parseWord } from "../src/content/words.js";
import { createRng } from "../src/util/rng.js";

const KINDS = ["clock", "feed", "tide", "hal", "recipe", "weigh", "fog", "note", "bind"];
// as the players object gives it (learn/players.js): their mastery, and their grade per track
const at = (grade) => ({ ...createMastery({}, { now: () => 0, gradeOf: () => grade }), gradeOf: () => grade });

test("every chapter 2 puzzle is a real problem with a Utah skill, its own answer right and a near miss wrong", () => {
  const rng = createRng(23);
  for (const grade of [1, 2, 3, 4]) {
    const mastery = at(grade);
    for (const kind of KINDS) {
      assert.ok(PUZZLE_TRACK[kind], `${kind} has a track`);
      for (let i = 0; i < 40; i++) {
        const q = PUZZLES[kind]({ mastery, rng, tier: 1 + (i % 2), part: i % 2 ? "milk" : "flour", item: i % 3 === 0 ? 0 : null });
        assert.ok(SKILLS[q.skill], `${kind}: ${q.skill}`);
        assert.ok(q.panel?.kind && q.panel.title && q.panel.ask, kind);
        assert.doesNotMatch(q.panel.ask, /undefined|NaN|\$\{/, q.panel.ask);
        assert.ok(q.hint(q.answerText === "" ? "x" : "1")?.text !== undefined, kind);
        if (["note", "bind"].includes(kind)) continue;
        assert.ok(q.grade(q.answerText).correct, `${kind}: ${q.answerText}`);
        if (q.panel.kind === "number") assert.ok(!q.grade(String(Number(q.answerText) + 1)).correct, kind);
      }
    }
  }
});

test("a younger player's time puzzles set the clock; a 3rd grader works out elapsed time", () => {
  const rng = createRng(4);
  for (const kind of ["feed", "tide"]) {
    const young = PUZZLES[kind]({ mastery: at(2), rng });
    assert.equal(young.panel.kind, "clock", kind);
    assert.ok(SKILLS[young.skill].grade <= 2, young.skill);
    const older = PUZZLES[kind]({ mastery: at(3), rng });
    assert.equal(older.skill, "time.elapsed", kind);
  }
  assert.equal(PUZZLES.feed({ mastery: at(3), rng }).panel.kind, "number");
  assert.equal(PUZZLES.tide({ mastery: at(3), rng }).panel.kind, "clock");
  assert.equal(PUZZLES.clock({ mastery: at(1), rng }).skill, "time.half");
});

test("Hal's board is always wrong, and always in his favor", () => {
  const rng = createRng(9);
  const mastery = at(3);
  for (let i = 0; i < 200; i++) {
    const q = halPuzzle({ mastery, rng, item: i % 2 ? 0 : null });
    assert.ok(q.problem.wrong > q.problem.answer);
    assert.equal(q.grade(String(q.problem.wrong)).code, "trusted_hal");
    assert.ok(q.problem.answer <= 100 || q.skill === "mul.tens", `${q.skill}: ${q.problem.answer}`);
    assert.ok(!q.skill.startsWith("div."), "Hal sells things: no sharing");
  }
});

test("the fog signs: the right piece makes a bank word, the other two make no word", () => {
  const bank = new Set(WORDS.map((e) => parseWord(e.w).word));
  const real = new Set(["relock", "unload", "review", "reheat", "careless", "fearful", "useful", "unbuild", "discharge", "refire", "reappear"]);
  for (const [word, piece, ...wrong] of FOG_WORDS) {
    assert.ok(bank.has(word), word);
    const prefix = word.startsWith(piece);
    const stem = prefix ? word.slice(piece.length) : word.slice(0, -piece.length);
    for (const x of wrong) assert.ok(!real.has(prefix ? x + stem : stem + x), `${word}: ${x}`);
  }
  const rng = createRng(2);
  const q = fogPuzzle({ mastery: at(3), rng, n: 0 });
  assert.equal(q.answerText, "un-");
  assert.ok(q.panel.choices.includes("un-") && q.panel.choices.length === 3);
  assert.ok(q.grade("un-").correct && !q.grade("dis-").correct);
  assert.match(q.panel.ask, /▒▒▒LOCK/);
  const young = fogPuzzle({ mastery: at(2), rng, n: 0 });
  assert.equal(young.skill, "spell.compound");
  assert.equal(young.answerText, "house");
});

test("a field note needs a true detail; the storm needs one too", () => {
  const note = PUZZLES.note({ mastery: at(3), pet: "Rivet" });
  assert.equal(note.skill, "write.inform");
  assert.ok(note.grade("Rivet has shiny silver plates and a tiny round shield on his arm.").correct);
  assert.ok(!note.grade("Rivet is nice and good and fine.").correct);
  const bind = PUZZLES.bind({ mastery: at(3) });
  assert.equal(bind.skill, "write.sentence");
  assert.ok(bind.grade("The thunder boomed and the wind screamed through the rigging.").correct);
  assert.equal(PUZZLES.note({ mastery: at(1), pet: "Rivet" }).skill, "write.own");
});
