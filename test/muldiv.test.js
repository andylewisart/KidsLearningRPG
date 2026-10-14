import { test } from "node:test";
import assert from "node:assert/strict";
import { genMulDiv, diagnoseMulDiv, equationText } from "../src/learn/muldiv.js";
import { LADDERS } from "../src/learn/skills.js";
import { createRng } from "../src/util/rng.js";

test("every multiplication-track skill makes valid problems for its grade", () => {
  const rng = createRng(42);
  for (const skill of LADDERS.mul) {
    for (let i = 0; i < 60; i++) {
      const p = genMulDiv(skill, rng);
      if (p.op === "skip") {
        // counting by tens within 120 (1.NBT.1), skip counting within 1,000 (2.NBT.2)
        assert.equal(p.answer, p.seq[p.seq.length - 1] + p.step);
        assert.ok(p.seq.every((x, j) => j === 0 || x - p.seq[j - 1] === p.step));
        assert.ok(p.seq[0] >= 0 && p.answer <= (skill === "mul.count10" ? 120 : 1000), `${skill}: ${p.answer}`);
        assert.ok(skill === "mul.count10" ? p.step === 10 : [2, 5, 10, 100].includes(p.step));
      } else if (p.op === "groups") {
        // equal groups up to 5 × 5 (2.OA.4)
        assert.equal(p.answer, p.a * p.b);
        assert.ok(p.a >= 2 && p.a <= 5 && p.b >= 1 && p.b <= 5);
      } else if (p.op === "mul") {
        assert.equal(p.answer, p.a * p.b);
        if (skill !== "mul.tens") assert.ok(p.a <= 10 && p.b <= 10, `${skill}: ${p.a}×${p.b}`);
        else assert.ok(p.b % 10 === 0 && p.b >= 10 && p.b <= 90);
      } else if (p.op === "div") {
        assert.ok(Number.isInteger(p.answer), "no remainders in grade 3");
        assert.equal(p.answer * p.b, p.a);
        assert.ok(p.a <= 100);
      } else {
        assert.equal(p.a * p.answer, p.c);
        assert.ok(p.c <= 100);
      }
    }
  }
});

test("division families match their skill", () => {
  const rng = createRng(1);
  for (let i = 0; i < 40; i++) {
    assert.ok([2, 5, 10].includes(genMulDiv("div.easy", rng).b));
    assert.ok([6, 7, 8, 9].includes(genMulDiv("div.hard", rng).b));
  }
});

test("equations read naturally", () => {
  assert.equal(equationText({ op: "mul", a: 7, b: 8 }), "7 × 8");
  assert.equal(equationText({ op: "div", a: 56, b: 8 }), "56 ÷ 8");
  assert.equal(equationText({ op: "unknown", a: 8, c: 48 }), "8 × ? = 48");
});

test("classic multiplication and division mistakes are recognized", () => {
  const m = { skill: "mul.78", op: "mul", a: 7, b: 8, answer: 56 };
  assert.equal(diagnoseMulDiv(m, 56), null);
  assert.equal(diagnoseMulDiv(m, 15).code, "added");
  assert.equal(diagnoseMulDiv(m, 49).code, "off_by_group");
  assert.equal(diagnoseMulDiv(m, 54).code, "neighbor_fact");
  assert.equal(diagnoseMulDiv({ skill: "mul.69", op: "mul", a: 9, b: 6, answer: 54 }, 45).code, "off_by_group");
  assert.equal(diagnoseMulDiv({ skill: "mul.easy", op: "mul", a: 7, b: 0, answer: 0 }, 7).code, "zero_rule");
  assert.equal(diagnoseMulDiv({ skill: "mul.easy", op: "mul", a: 7, b: 1, answer: 7 }, 8).code, "one_rule");
  assert.equal(diagnoseMulDiv({ skill: "mul.tens", op: "mul", a: 5, b: 60, answer: 300 }, 30).code, "dropped_zero");
  assert.equal(diagnoseMulDiv({ skill: "mul.tens", op: "mul", a: 5, b: 60, answer: 300 }, 3000).code, "extra_zero");
  assert.equal(diagnoseMulDiv({ skill: "div.34", op: "div", a: 12, b: 3, answer: 4 }, 9).code, "subtracted_once");
  assert.equal(diagnoseMulDiv({ skill: "mul.unknown", op: "unknown", a: 8, c: 48, answer: 6 }, 384).code, "multiplied_visible");
});

test("skip counts and equal groups read the way a 2nd grader sees them", () => {
  assert.equal(equationText({ op: "skip", seq: [5, 10, 15] }), "5, 10, 15, ?");
  assert.equal(equationText({ op: "groups", a: 3, b: 4 }), "4 + 4 + 4");
  assert.equal(diagnoseMulDiv({ op: "skip", step: 5, seq: [5, 10, 15], answer: 20 }, 16).code, "counted_one");
  assert.equal(diagnoseMulDiv({ op: "groups", a: 3, b: 4, answer: 12 }, 7).code, "added");
});
