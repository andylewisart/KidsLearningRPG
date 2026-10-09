import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySub, classifyAdd, genSub, genAdd, genStrike, genHeal, diagnoseArith } from "../src/learn/arith.js";
import { LADDERS } from "../src/learn/skills.js";
import { createRng } from "../src/util/rng.js";

test("subtraction problems are sorted into the right skill", () => {
  assert.equal(classifySub(14, 6), "sub.facts");
  assert.equal(classifySub(68, 23), "sub.2d");
  assert.equal(classifySub(52, 27), "sub.2d.regroup");
  assert.equal(classifySub(586, 243), "sub.3d");
  assert.equal(classifySub(532, 218), "sub.3d.regroup");
  assert.equal(classifySub(645, 378), "sub.3d.regroup2");
  assert.equal(classifySub(403, 156), "sub.3d.zeros");
  assert.equal(classifySub(500, 187), "sub.3d.zeros");
  assert.equal(classifySub(305, 10), "sub.3d.regroup"); // tens borrow from hundreds only
  assert.equal(classifySub(342, 7), "sub.3d.regroup");
  assert.throws(() => classifySub(5, 9));
});

test("addition problems are sorted into the right skill", () => {
  assert.equal(classifyAdd(8, 7), "add.facts");
  assert.equal(classifyAdd(34, 25), "add.2d");
  assert.equal(classifyAdd(47, 38), "add.2d.regroup");
  assert.equal(classifyAdd(312, 245), "add.3d");
  assert.equal(classifyAdd(356, 228), "add.3d.regroup");
  assert.equal(classifyAdd(478, 265), "add.3d.regroup2");
});

test("generators make problems of exactly the asked-for skill", () => {
  const rng = createRng(7);
  for (const skill of LADDERS.sub) {
    for (let i = 0; i < 40; i++) {
      const p = genSub(skill, rng);
      assert.equal(classifySub(p.a, p.b), skill);
      assert.equal(p.answer, p.a - p.b);
      assert.ok(p.a <= 999 && p.b >= 0);
    }
  }
  for (const skill of LADDERS.add) {
    for (let i = 0; i < 40; i++) {
      const p = genAdd(skill, rng);
      assert.equal(classifyAdd(p.a, p.b), skill);
      assert.ok(p.answer <= 999);
    }
  }
});

test("a Knight strike practices the asked-for skill and respects the HP", () => {
  const rng = createRng(11);
  const strike = genStrike(500, "sub.3d.zeros", [200, 450], rng, LADDERS.sub);
  assert.equal(strike.skill, "sub.3d.zeros");
  assert.equal(strike.kind, "left");
  assert.equal(strike.answer, 500 - strike.damage);
  assert.ok(strike.damage >= 200 && strike.damage <= 450);

  // Damage bigger than the HP becomes an "overkill" problem: d − hp.
  const finisher = genStrike(40, "sub.3d.regroup", [300, 600], rng, LADDERS.sub);
  assert.equal(finisher.kind, "overkill");
  assert.equal(finisher.answer, finisher.damage - 40);
  assert.equal(classifySub(finisher.a, finisher.b), finisher.skill);
});

test("a strike falls back to a nearby skill when the HP can't make the asked one", () => {
  const rng = createRng(3);
  // HP 12 with damage capped at 15: only facts are possible.
  const s = genStrike(12, "sub.3d.zeros", [1, 15], rng, LADDERS.sub);
  assert.equal(s.answer, s.a - s.b);
  assert.ok(LADDERS.sub.includes(s.skill));
});

test("potion heals never overflow max HP", () => {
  const rng = createRng(5);
  for (let i = 0; i < 50; i++) {
    const hp = rng.int(1, 500);
    const h = genHeal(hp, 520, "add.3d.regroup", rng, LADDERS.add);
    if (!h) continue;
    assert.ok(h.answer <= 520);
    assert.equal(h.answer, hp + h.heal);
  }
  assert.equal(genHeal(518, 520, "add.3d", rng, LADDERS.add), null);
});

test("classic subtraction mistakes are recognized", () => {
  assert.equal(diagnoseArith({ a: 352, b: 128, op: "sub" }, 224), null);
  assert.equal(diagnoseArith({ a: 352, b: 128, op: "sub" }, 236).code, "smaller_from_larger");
  assert.equal(diagnoseArith({ a: 352, b: 128, op: "sub" }, 234).code, "no_take_away");
  assert.equal(diagnoseArith({ a: 52, b: 27, op: "sub" }, 35).code, "smaller_from_larger");
  assert.equal(diagnoseArith({ a: 403, b: 156, op: "sub" }, 357).code, "across_zero");
  assert.equal(diagnoseArith({ a: 352, b: 128, op: "sub" }, 480).code, "added_instead");
  assert.equal(diagnoseArith({ a: 586, b: 243, op: "sub" }, 353).code, "place_slip");
});

test("classic addition mistakes are recognized", () => {
  assert.equal(diagnoseArith({ a: 456, b: 278, op: "add" }, 734), null);
  assert.equal(diagnoseArith({ a: 456, b: 278, op: "add" }, 624).code, "no_carry");
  assert.equal(diagnoseArith({ a: 456, b: 278, op: "add" }, 178).code, "subtracted_instead");
  assert.equal(diagnoseArith({ a: 456, b: 278, op: "add" }, "abc").code, "not_a_number");
});

test("an off-by-ten slip only blames a trade when there was one", async () => {
  const { arithHint } = await import("../src/learn/hints.js");
  assert.match(arithHint({ op: "sub", a: 250, b: 40, answer: 210 }, 220).text, /check the tens/);
  assert.match(arithHint({ op: "sub", a: 263, b: 48, answer: 215 }, 205).text, /trade went sideways/);
});
