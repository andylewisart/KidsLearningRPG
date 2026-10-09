import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicJudge, powerFromMoves, fillFrame, FRAMES } from "../src/learn/writing.js";

test("plain writing gets plain power", () => {
  const r = heuristicJudge("The monster came out and it was big and really loud.");
  assert.equal(r.power, "tiny");
  assert.ok(r.fuzzy.includes("big"));
  assert.ok(r.tip.length > 10);
});

test("vivid writing earns more power, quoting his words", () => {
  const r = heuristicJudge(
    'KRA-KOOM! Gravemaw smashed out of the sea, its scales glowing green like poison, as tall as a lighthouse. "Run!" yelled the knight.',
  );
  const ids = r.moves.map((m) => m.id);
  for (const id of ["sound", "power", "sight", "likea", "talk"]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.equal(r.power, "mega");
  assert.ok(r.praise.length > 0);
});

test("misspellings don't block credit", () => {
  const r = heuristicJudge("ROOOOAR! It smashd the dock with its glowing red tail");
  const ids = r.moves.map((m) => m.id);
  assert.ok(ids.includes("sound"));
  assert.ok(ids.includes("sight"));
});

test("power thresholds", () => {
  assert.equal(powerFromMoves(0), "tiny");
  assert.equal(powerFromMoves(2), "spark");
  assert.equal(powerFromMoves(4), "blaze");
  assert.equal(powerFromMoves(6), "mega");
});

test("frames fill in his answers", () => {
  const s = fillFrame(FRAMES[0], "Gravemaw", { place: "lagoon", part: "spine", color: "green" });
  assert.equal(s, "Gravemaw burst out of the lagoon, its spine glowing green.");
});
