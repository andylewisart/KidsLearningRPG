import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicJudge, powerFromMoves, fillFrame, FRAMES, inflects } from "../src/learn/writing.js";
import { speakable } from "../src/content/pronounce.js";

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

test("every form of a word counts: crash, crashes, crashed, crashing", () => {
  for (const w of ["crash", "crashes", "crashed", "crashing"]) assert.ok(inflects(w, "crash"), w);
  for (const [w, base] of [["snapping", "snap"], ["snapped", "snap"], ["sizzling", "sizzle"], ["sizzled", "sizzle"], ["cries", "cry"], ["roaring", "roar"]]) assert.ok(inflects(w, base), `${w} is ${base}`);
  assert.ok(!inflects("crate", "crash") && !inflects("cr", "crash"));
  // the parent's example: "waves crashing" is a sound, just like "waves crash"
  for (const t of ["The waves crash on the rocks.", "The waves crashing on the rocks."]) {
    assert.ok(heuristicJudge(t).moves.some((m) => m.id === "sound"), t);
  }
});

test("comparisons with like, but not liking things", () => {
  assert.ok(heuristicJudge("The sea was snapping like bacon.").moves.some((m) => m.id === "likea"));
  assert.ok(heuristicJudge("The sea was as blue as a sapphire.").moves.some((m) => m.id === "likea"));
  assert.ok(!heuristicJudge("I like the sea a lot.").moves.some((m) => m.id === "likea"));
});

test("the voices say Geode right, and the screen still spells it Geode", () => {
  assert.equal(speakable("The Geode Titan's lair"), "The Jee-ode Titan's lair");
  assert.equal(speakable("No change here."), "No change here.");
});
