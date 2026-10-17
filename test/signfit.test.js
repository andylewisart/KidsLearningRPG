import test from "node:test";
import assert from "node:assert/strict";
import { fitWord } from "../src/ui/signfit.js";
import { FOG_WORDS } from "../src/world/puzzles2.js";

// a heavy capital is about as wide as it is tall in the title font
const measure = (word) => (size) => word.length * size * 0.85;

test("a fog sign's word always fits on its board, however long", () => {
  const words = [...FOG_WORDS.map(([w]) => w), "lighthouse", "cannonball", "jellyfish"];
  for (const [width, height] of [[111, 46], [144, 39], [96, 37], [300, 120]]) {
    for (const w of words) {
      const size = fitWord({ width, height, measure: measure(w) });
      assert.ok(measure(w)(size) <= width * 0.86 + 1e-9, `${w} spills off a ${width}×${height} board`);
      assert.ok(size <= height * 0.62 + 1e-9, `${w} is taller than its board`);
      assert.ok(size > 0);
    }
  }
});

test("a short word keeps its full height", () => {
  assert.equal(fitWord({ width: 200, height: 50, measure: measure("un") }), 50 * 0.62);
});
