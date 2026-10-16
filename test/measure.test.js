// Telling time and measuring (src/learn/measure.js): chapter 2's clocks, tide
// tables, scales and jugs, inside the grade-3 limits (docs/curriculum.md).

import test from "node:test";
import assert from "node:assert/strict";
import { genTime, checkTime, diagnoseTime, timeHint, timeText, parseTime, addMinutes, minutesBetween, timeAnswerText, genMeasure, diagnoseMeasure, measureHint, measureEquation, measureVisual } from "../src/learn/measure.js";
import { SKILLS, LADDERS } from "../src/learn/skills.js";
import { createRng } from "../src/util/rng.js";

test("times read and add round the clock face", () => {
  assert.equal(timeText({ h: 3, m: 5 }), "3:05");
  assert.deepEqual(parseTime("3:05"), { h: 3, m: 5 });
  assert.deepEqual(parseTime("305"), { h: 3, m: 5 });
  assert.deepEqual(parseTime(" 12 40 "), { h: 12, m: 40 });
  assert.equal(parseTime("9:75"), null);
  assert.equal(parseTime("13:00"), null);
  assert.deepEqual(addMinutes({ h: 8, m: 15 }, 50), { h: 9, m: 5 });
  assert.deepEqual(addMinutes({ h: 12, m: 40 }, 30), { h: 1, m: 10 });
  assert.equal(minutesBetween({ h: 3, m: 45 }, { h: 4, m: 20 }), 35);
  assert.equal(minutesBetween({ h: 11, m: 50 }, { h: 12, m: 10 }), 20);
});

test("every time and measuring skill is a real Utah skill on its own ladder", () => {
  for (const id of LADDERS.time) assert.equal(SKILLS[id].track, "time");
  for (const id of LADDERS.measure) assert.equal(SKILLS[id].track, "measure");
  assert.equal(SKILLS["time.elapsed"].standard, "3.MD.1");
  assert.equal(SKILLS["measure.solve"].standard, "3.MD.2");
  assert.equal(SKILLS["write.inform"].standard, "3.W.2");
});

test("time problems stay to the minute, and elapsed time stays within an hour", () => {
  const rng = createRng(7);
  let crossed = 0;
  for (let i = 0; i < 300; i++) {
    for (const skill of LADDERS.time) {
      const p = genTime(skill, rng);
      assert.ok(checkTime(p, timeAnswerText(p)), `${skill}: its own answer is right`);
      if (p.op === "read") {
        assert.ok(p.time.h >= 1 && p.time.h <= 12 && p.time.m >= 0 && p.time.m <= 59);
        if (skill === "time.half") assert.ok([0, 30].includes(p.time.m));
        if (skill === "time.five") assert.equal(p.time.m % 5, 0);
      } else {
        assert.ok(p.mins > 0 && p.mins <= 60, `${p.mins} minutes`);
        assert.equal(minutesBetween(p.start, p.op === "end" ? p.answer : p.end), p.mins);
        if (p.start.m + p.mins > 60) crossed += 1;
      }
    }
  }
  assert.ok(crossed > 100, "most elapsed problems cross the hour");
});

test("the classic time mistakes are spotted", () => {
  // 9:45 + 30 minutes → 9:75
  const end = { skill: "time.elapsed", op: "end", start: { h: 9, m: 45 }, mins: 30, answer: { h: 10, m: 15 } };
  assert.equal(diagnoseTime(end, "9:75")?.code, "base_ten_time");
  assert.equal(diagnoseTime(end, "9:15")?.code, "forgot_hour");
  assert.ok(checkTime(end, "10:15") && !checkTime(end, "9:75"));
  // 3:45 to 4:20 worked as 420 − 345
  const between = { skill: "time.elapsed", op: "between", start: { h: 3, m: 45 }, end: { h: 4, m: 20 }, mins: 35, answer: 35 };
  assert.equal(diagnoseTime(between, "75")?.code, "base_ten_time");
  // 2:50 read as 3:50
  const read = { skill: "time.minute", op: "read", time: { h: 2, m: 50 }, answer: { h: 2, m: 50 } };
  assert.equal(diagnoseTime(read, "3:50")?.code, "hour_hand");
  assert.equal(timeHint(read, "3:50").visual.kind, "clock");
  assert.equal(timeHint(between, "75").visual.kind, "time_jumps");
  assert.match(timeHint(end, "9:75").text, /60 minutes/);
});

test("measuring problems: read on a mark, one step, the same units, inside the limits", () => {
  const rng = createRng(19);
  for (let i = 0; i < 300; i++) {
    for (const skill of LADDERS.measure) {
      for (const unit of ["g", "mL"]) {
        const p = genMeasure(skill, rng, { unit });
        assert.ok(Number.isInteger(p.answer) && p.answer > 0, `${skill}: ${p.answer}`);
        if (p.op === "read") {
          assert.equal(p.value % p.dial.minor, 0, "the pointer sits on a mark");
          assert.ok(p.value > 0 && p.value < p.dial.max);
          assert.ok(measureVisual(p), "a reading problem shows its scale or jug");
          if (skill === "measure.volume") assert.equal(p.unit, "mL");
          if (skill === "measure.mass") assert.equal(p.unit, "g");
        } else {
          assert.ok(["more", "total", "times", "share"].includes(p.op));
          if (p.op === "more" || p.op === "total") assert.ok(p.answer <= 1000 && p.a <= 1000 && p.b <= 1000);
          if (p.op === "times") assert.ok(p.answer <= 100);
          if (p.op === "share") assert.ok(p.a <= 100 && p.a % p.b === 0);
          assert.match(measureEquation(p), unit === "g" ? / g/ : / mL/);
        }
        assert.ok(measureHint(p, String(p.answer + 1)).text);
      }
    }
  }
  const scale = { skill: "measure.mass", op: "read", dial: { max: 1000, major: 100, minor: 50 }, value: 350, unit: "g", answer: 350 };
  assert.equal(diagnoseMeasure(scale, "7")?.code, "counted_marks");
  assert.equal(diagnoseMeasure(scale, "400")?.code, "next_mark");
  assert.equal(diagnoseMeasure({ op: "more", a: 150, b: 500, unit: "g", answer: 350 }, "650")?.code, "added");
});
