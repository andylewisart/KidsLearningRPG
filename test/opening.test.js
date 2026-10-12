import test from "node:test";
import assert from "node:assert/strict";
import { crystalPuzzle, PUZZLES } from "../src/world/puzzles.js";
import { createMastery } from "../src/learn/mastery.js";
import { SKILLS } from "../src/learn/skills.js";
import { createRng } from "../src/util/rng.js";

test("the opening's crystal asks one times fact he can already do", () => {
  const rng = createRng(5);
  assert.equal(PUZZLES.crystal, crystalPuzzle);
  // a new player gets the easiest facts, with the array to count on
  const fresh = crystalPuzzle({ mastery: createMastery({}), rng });
  assert.equal(fresh.skill, "mul.easy");
  assert.equal(fresh.panel.title, "Teach the Crystal");
  // whatever his level: a plain multiplication fact, tagged, within 10 × 10, gradable
  const strong = createMastery({});
  for (let i = 0; i < 40; i++) for (const id of ["mul.easy", "mul.34", "div.easy", "mul.69", "div.34", "mul.78"]) strong.record(id, { correct: true, tier: 2, hinted: false, ms: 2500 });
  for (const mastery of [createMastery({}), strong]) {
    for (let i = 0; i < 60; i++) {
      const q = crystalPuzzle({ mastery, rng });
      assert.ok(SKILLS[q.skill], q.skill);
      assert.ok(["mul.easy", "mul.34", "mul.69", "mul.78"].includes(q.skill), q.skill);
      assert.equal(q.problem.op, "mul");
      assert.ok(q.problem.a <= 10 && q.problem.b <= 10 && q.problem.answer === q.problem.a * q.problem.b);
      assert.notEqual(q.problem.answer, 56, "Wren already answered 7 × 8");
      assert.ok(q.grade(q.answerText).correct);
      assert.ok(!q.grade(String(q.problem.answer + 1)).correct);
      assert.match(q.panel.ask, /×/);
      assert.equal(q.hint(String(q.problem.answer + 1)).text.length > 0, true);
    }
  }
});
