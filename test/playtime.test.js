import test from "node:test";
import assert from "node:assert/strict";
import { freshPlaytime, playState, addPlay, warnDue, markWarned, makeCamp, extend, morningDue, timeLeft, dayKey, SOON_MS } from "../src/world/playtime.js";

const MIN = 60000;
const day1 = new Date(2026, 9, 13, 15, 0).getTime();
const day1Late = new Date(2026, 9, 13, 23, 59).getTime();
const day2 = new Date(2026, 9, 14, 0, 1).getTime();

test("no timer set: always off, nothing counts against him", () => {
  const pt = addPlay(freshPlaytime(), 600 * MIN, day1);
  assert.equal(playState(0, pt, day1), "off");
  assert.equal(timeLeft(0, pt, day1), Infinity);
  assert.equal(warnDue(0, pt, day1), false);
});

test("a day's allowance: playing, then a heads-up once, then over", () => {
  const pt = freshPlaytime();
  assert.equal(playState(30, pt, day1), "playing");
  addPlay(pt, 24 * MIN, day1);
  assert.equal(playState(30, pt, day1), "playing");
  addPlay(pt, 2 * MIN, day1);
  assert.equal(playState(30, pt, day1), "soon");
  assert.ok(warnDue(30, pt, day1));
  markWarned(30, pt);
  assert.ok(!warnDue(30, pt, day1), "Kit says it once");
  addPlay(pt, 4 * MIN, day1);
  assert.equal(playState(30, pt, day1), "over");
});

test("camp closes the game for the rest of the day, and tomorrow starts fresh with a welcome-back", () => {
  const pt = addPlay(freshPlaytime(), 31 * MIN, day1);
  makeCamp(pt, day1);
  assert.equal(playState(30, pt, day1Late), "closed");
  assert.ok(!morningDue(pt, day1Late));
  assert.equal(playState(30, pt, day2), "playing", "after midnight it opens again");
  assert.equal(pt.played, 0);
  assert.ok(morningDue(pt, day2));
});

test("a grown-up's extra time opens the game from now, and Kit warns again near its end", () => {
  const pt = addPlay(freshPlaytime(), 31 * MIN, day1);
  markWarned(30, pt);
  makeCamp(pt, day1);
  extend(30, pt, 15, day1);
  assert.equal(playState(30, pt, day1), "playing");
  assert.equal(timeLeft(30, pt, day1), 15 * MIN);
  assert.ok(!morningDue(pt, day1), "no welcome-back on the same day");
  addPlay(pt, 15 * MIN - SOON_MS + 1, day1);
  assert.ok(warnDue(30, pt, day1), "a new allowance gets its own heads-up");
});

test("extra time before it runs out tops up to that much from now, not on top", () => {
  const pt = addPlay(freshPlaytime(), 27 * MIN, day1);
  extend(30, pt, 15, day1);
  assert.equal(timeLeft(30, pt, day1), 15 * MIN);
});

test("extra time is for today only", () => {
  const pt = addPlay(freshPlaytime(), 31 * MIN, day1);
  extend(30, pt, 60, day1);
  assert.equal(timeLeft(30, pt, day2), 30 * MIN);
});

test("days are the local calendar's", () => {
  assert.equal(dayKey(day1), "2026-10-13");
  assert.equal(dayKey(day2), "2026-10-14");
});
