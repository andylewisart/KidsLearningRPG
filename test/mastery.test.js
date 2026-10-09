import { test } from "node:test";
import assert from "node:assert/strict";
import { createMastery } from "../src/learn/mastery.js";
import { LADDERS } from "../src/learn/skills.js";
import { createRng } from "../src/util/rng.js";

const DAY = 86400000;

test("tiers start near a typical October 3rd grader", () => {
  const m = createMastery({}, { now: () => 0 });
  const t = m.pickTiers(LADDERS.sub, createRng(1));
  assert.equal(t[2].skill, "sub.2d.regroup"); // first skill under 85%
  assert.equal(t[3].skill, "sub.3d");
  assert.ok(["sub.facts", "sub.2d"].includes(t[1].skill));
});

test("a run of right answers moves his edge up the ladder", () => {
  let clock = 0;
  const m = createMastery({}, { now: () => clock });
  const before = m.pickTiers(LADDERS.mul)[2].skill;
  for (let i = 0; i < 8; i++) {
    clock += 60000;
    m.record(before, { correct: true, tier: 2, ms: 2500 });
  }
  const after = m.pickTiers(LADDERS.mul)[2].skill;
  assert.notEqual(after, before);
  assert.ok(LADDERS.mul.indexOf(after) > LADDERS.mul.indexOf(before));
});

test("misses pull the estimate down", () => {
  const m = createMastery({}, { now: () => 0 });
  const start = m.estimate("sub.2d");
  m.record("sub.2d", { correct: false });
  m.record("sub.2d", { correct: false });
  assert.ok(m.estimate("sub.2d") < start);
});

test("levels follow the curriculum rules", () => {
  let clock = 10 * DAY;
  const m = createMastery({}, { now: () => clock });
  assert.equal(m.level("sub.3d"), "new");
  m.record("sub.3d", { correct: false });
  assert.equal(m.level("sub.3d"), "learning");

  // 10 clean answers over 3 days: on track
  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < 4; i++) {
      clock += 60000;
      m.record("sub.3d", { correct: true });
    }
    clock += DAY;
  }
  assert.equal(m.level("sub.3d"), "ontrack");

  // still clean two weeks later: mastered
  clock += 15 * DAY;
  m.record("sub.3d", { correct: true });
  assert.equal(m.level("sub.3d"), "mastered");
});

test("a hinted answer keeps a skill from counting as on track", () => {
  let clock = 0;
  const m = createMastery({}, { now: () => clock });
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < 3; i++) {
      clock += 1000;
      m.record("sub.2d", { correct: true, hinted: i === 0 && d === 3 });
    }
    clock += DAY;
  }
  assert.equal(m.level("sub.2d"), "practicing");
});

test("memory facts need speed as well as accuracy", () => {
  let clock = 0;
  const m = createMastery({}, { now: () => clock });
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < 3; i++) {
      clock += 1000;
      m.record("mul.78", { correct: true, tier: 2, ms: 9000 });
    }
    clock += DAY;
  }
  clock += 20 * DAY;
  m.record("mul.78", { correct: true, tier: 2, ms: 9000 });
  assert.equal(m.level("mul.78"), "ontrack"); // accurate but slow: not "from memory" yet
});

test("progress survives a save and load", () => {
  const m = createMastery({}, { now: () => 5 });
  m.record("mul.34", { correct: true, ms: 2000 });
  const again = createMastery(JSON.parse(JSON.stringify(m.toJSON())), { now: () => 6 });
  assert.equal(again.summary()[0].attempts, 1);
  assert.equal(again.estimate("mul.34"), m.estimate("mul.34"));
});
