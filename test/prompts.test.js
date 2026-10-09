import { test } from "node:test";
import assert from "node:assert/strict";
import { validateVisual, tutorContext, tutorSystem, JUDGE_SCHEMA, SHOW_VISUAL_TOOL } from "../src/ai/prompts.js";

test("visuals the droid asks for are checked before drawing", () => {
  assert.deepEqual(validateVisual({ kind: "base_ten", op: "sub", a: 403, b: 156 }), { kind: "base_ten", op: "sub", a: 403, b: 156 });
  assert.equal(validateVisual({ kind: "base_ten", op: "sub", a: 100, b: 156 }), null, "no negative answers");
  assert.equal(validateVisual({ kind: "base_ten", op: "add", a: 900, b: 200 }), null, "sums stay within 1,000");
  assert.equal(validateVisual({ kind: "array", rows: 40, cols: 3 }), null, "arrays stay small");
  assert.equal(validateVisual({ kind: "array", rows: 7, cols: 8, split: 5 }).split, 5);
  assert.equal(validateVisual({ kind: "array", rows: 7, cols: 8, split: 9 }).split, null);
  assert.equal(validateVisual({ kind: "share", total: 25, groups: 4 }), null, "no remainders in grade 3");
  const line = validateVisual({ kind: "number_line", start: 0, end: 100, jumps: [{ from: 0, to: 40, label: "+40" }, { from: 40, to: 500 }] });
  assert.equal(line.jumps.length, 1, "jumps off the line are dropped");
  assert.equal(validateVisual({ kind: "launch_missiles" }), null);
  assert.equal(validateVisual(null), null);
});

test("the tutor gets the problem, his tries and the secret answer", () => {
  const ctx = tutorContext({ heroName: "Knight", prompt: "Beetle has 500 HP…", equation: "500 − 187", answer: 313, attempts: ["487"], mistake: "smaller_from_larger", skillLabel: "Subtracting across zeros", standard: "3.NBT.2", level: "learning" });
  assert.match(ctx, /500 − 187/);
  assert.match(ctx, /Correct answer \(secret\): 313/);
  assert.match(ctx, /487/);
  assert.match(ctx, /3\.NBT\.2/);
});

test("the droid's rules include the safety lines", () => {
  const s = tutorSystem("Kit");
  assert.match(s, /KIT/);
  assert.match(s, /personal information/);
  assert.match(s, /trusted grown-up/);
  assert.match(s, /does NOT require the standard borrow-and-carry/);
});

test("the judge schema is strict enough for structured output", () => {
  assert.equal(JUDGE_SCHEMA.additionalProperties, false);
  assert.deepEqual(JUDGE_SCHEMA.required.sort(), ["fuzzy", "moves", "praise", "tip"]);
  assert.equal(JUDGE_SCHEMA.properties.moves.items.additionalProperties, false);
  assert.equal(SHOW_VISUAL_TOOL.name, "show_visual");
});
