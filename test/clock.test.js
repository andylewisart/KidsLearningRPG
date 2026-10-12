// The play-time clock (src/ui/clock.js): only time someone is playing counts.

import test from "node:test";
import assert from "node:assert/strict";
import { createActiveClock, IDLE_CAP } from "../src/ui/clock.js";

const S = 1000;
const MIN = 60 * S;

test("steady play counts in full", () => {
  const c = createActiveClock({ now: () => 0 });
  const start = c.read(0);
  for (let t = 2 * S; t <= 10 * MIN; t += 2 * S) c.input(t);
  assert.equal(c.read(10 * MIN) - start, 10 * MIN);
});

test("walking away for hours counts as one short pause", () => {
  const c = createActiveClock({ now: () => 0 });
  const start = c.read(0);
  c.input(5 * MIN); // 5 minutes of nothing: capped
  for (let t = 5 * MIN + 2 * S; t <= 8 * MIN; t += 2 * S) c.input(t); // 3 minutes of play
  c.input(8 * MIN + 3.5 * 60 * MIN); // back after dinner
  const played = c.read(8 * MIN + 3.5 * 60 * MIN) - start;
  assert.equal(played, IDLE_CAP + 3 * MIN + IDLE_CAP);
});

test("a hidden page and the pause menu don't count, even overlapping", () => {
  const c = createActiveClock({ now: () => 0 });
  c.input(10 * S);
  c.stop(10 * S); // paused
  c.stop(20 * S); // and the tab is hidden too
  c.go(40 * S); // tab back
  assert.equal(c.read(45 * S), 10 * S, "still paused");
  c.go(50 * S); // resumed
  c.input(53 * S);
  assert.equal(c.read(53 * S), 13 * S);
  c.go(60 * S); // an extra go does nothing
  assert.equal(c.read(60 * S), 20 * S);
});

test("an answer's time is the time he spent on it", () => {
  const c = createActiveClock({ now: () => 0 });
  c.input(100 * S);
  const asked = c.read(101 * S); // the problem window opens
  c.input(103.2 * S); // "2"
  c.input(103.5 * S); // "4"
  c.input(104 * S); // Enter
  assert.equal(c.read(104 * S) - asked, 3 * S);
  // one he left on screen while he went for a snack counts at most a minute
  const asked2 = c.read(200 * S);
  c.input(200 * S + 20 * MIN);
  assert.ok(c.read(200 * S + 20 * MIN) - asked2 <= IDLE_CAP);
});
