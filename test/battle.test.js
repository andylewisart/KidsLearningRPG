import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBattle,
  nextTurn,
  endTurn,
  preview,
  swap,
  hit,
  setFiendHp,
  heal,
  defend,
  reward,
  fiendTurn,
  effectiveness,
  strikeBand,
  overdriveReady,
  titanReady,
  livingFiends,
  activeHeroes,
  messyHp,
} from "../src/battle/engine.js";
import { createRng } from "../src/util/rng.js";

const make = (fiends = ["scrap_raptor", "scrap_raptor"], seed = 1) =>
  createBattle({ party: ["knight", "gunner", "spellwright"], reserve: "titancaller", fiends, rng: createRng(seed) });

test("fighters take turns by speed, and the preview matches what happens", () => {
  const b = make();
  const predicted = preview(b, 6);
  const actual = [];
  for (let i = 0; i < 6; i++) {
    actual.push(nextTurn(b));
    endTurn(b);
  }
  assert.deepEqual(actual, predicted);
  // The reserve hero never acts while benched.
  assert.ok(!actual.includes("titancaller"));
});

test("faster fighters act more often", () => {
  const b = make();
  const counts = {};
  for (let i = 0; i < 200; i++) {
    const k = nextTurn(b);
    counts[k] = (counts[k] || 0) + 1;
    endTurn(b);
  }
  assert.ok(counts.gunner > counts.knight, "speed 12 beats speed 8");
});

test("two of the same fiend get letters", () => {
  const b = make();
  assert.deepEqual(
    b.fiends.map((f) => f.name),
    ["Scrap Raptor A", "Scrap Raptor B"],
  );
});

test("swapping brings the reserve hero in to act this turn", () => {
  const b = make();
  b.turn = "knight";
  const incoming = swap(b, "knight");
  assert.equal(incoming, "titancaller");
  assert.equal(b.turn, "titancaller");
  assert.deepEqual(
    activeHeroes(b).map((h) => h.key),
    ["gunner", "spellwright", "titancaller"],
  );
});

test("counters hit harder and bad matchups hit softer", () => {
  assert.equal(effectiveness("knight", "armored"), 1.5);
  assert.equal(effectiveness("knight", "flier"), 0.4);
  assert.equal(effectiveness("gunner", "flier"), 1.5);
  assert.equal(effectiveness("spellwright", "slime"), 1.5);
  assert.equal(effectiveness("gunner", "normal"), 1);
  const b = make(["magnet_beetle"]);
  const [lo, hi] = strikeBand(3, b.fiends[0]);
  assert.ok(lo >= 400 && hi <= 999, `${lo}-${hi}`);
});

test("a three-star knockout captures the fiend; bosses can't be captured", () => {
  const b = make(["scrap_raptor", "volt_jelly"]);
  const ev = hit(b, "gunner", "scrap_raptor#1", 999, { tier: 3 });
  assert.ok(ev.ko && ev.captured);
  const ev2 = hit(b, "gunner", "volt_jelly#1", 999, { tier: 2 });
  assert.ok(ev2.ko && !ev2.captured);

  const boss = make(["geode_titan"]);
  let last;
  for (let i = 0; i < 3; i++) last = hit(boss, "gunner", "geode_titan#1", 5000, { tier: 3 });
  assert.ok(last.ko && !last.captured);
});

test("boss health comes in bars; one hit breaks at most one bar", () => {
  const b = make(["geode_titan"]);
  const t = b.fiends[0];
  const ev = hit(b, "gunner", t.uid, 5000, { tier: 3 });
  assert.ok(ev.barBroken && !ev.ko);
  assert.equal(t.bar, 2);
  assert.equal(t.hp, t.maxHp);
});

test("the Knight's answer sets the fiend's HP", () => {
  const b = make(["magnet_beetle"]);
  const start = b.fiends[0].hp;
  const ev = setFiendHp(b, "magnet_beetle#1", 313, { tier: 2, heroKey: "knight" });
  assert.equal(ev.amount, start - 313);
  assert.equal(b.fiends[0].hp, 313);
});

test("fiends start with messy HP, so subtraction has real digits", () => {
  const rng = createRng(11);
  for (let i = 0; i < 500; i++) {
    for (const base of [60, 250, 300, 500, 900]) {
      const hp = messyHp(base, rng);
      assert.ok(hp % 10 !== 0, `${hp} is round`);
      assert.ok(hp >= 100 ? Math.floor(hp / 10) % 10 !== 0 : true, `${hp} has no tens`);
      assert.ok(hp >= base * 0.9 && hp <= base * 1.2 && hp <= 999, `${hp} from ${base}`);
    }
  }
});

test("healing never goes past max HP", () => {
  const b = make();
  const k = b.heroes[0];
  k.hp = 500;
  heal(b, "knight", 300);
  assert.equal(k.hp, k.maxHp);
});

test("right answers fill Overdrive and the Titan gauge; brave misses still count", () => {
  const b = make();
  for (let i = 0; i < 4; i++) reward(b, "gunner", { correct: true, tier: 3 });
  assert.ok(overdriveReady(b, "gunner"));
  assert.ok(b.titanGauge >= 48);
  reward(b, "knight", { correct: false, tier: 3 });
  assert.equal(b.heroes[0].od, 15);
  reward(b, "knight", { correct: false, tier: 1 });
  assert.equal(b.heroes[0].od, 15);
  b.titanGauge = 100;
  assert.equal(titanReady(b), false, "Titan Caller is on the bench");
  swap(b, "knight");
  assert.equal(titanReady(b), true);
});

test("guarding halves damage; a knocked-out hero is replaced by the reserve", () => {
  const b = make(["magnet_beetle"], 3);
  const knight = b.heroes[0];
  for (const h of activeHeroes(b)) if (h.key !== "knight") h.ko = true; // force the target
  defend(b, "knight");
  const ev = fiendTurn(b, "magnet_beetle#1");
  assert.equal(ev.hits[0].target, "knight");
  assert.ok(ev.hits[0].amount <= Math.ceil(46 * 1.15 * 0.5));

  knight.hp = 1;
  knight.defending = false;
  const ev2 = fiendTurn(b, "magnet_beetle#1");
  assert.ok(ev2.hits[0].ko);
  assert.equal(ev2.swappedIn, "titancaller");
});

test("the boss uses its special every third turn and hits everyone", () => {
  const b = make(["geode_titan"], 9);
  fiendTurn(b, "geode_titan#1");
  fiendTurn(b, "geode_titan#1");
  const ev = fiendTurn(b, "geode_titan#1");
  assert.equal(ev.kind, "special");
  assert.equal(ev.hits.length, 3);
});

test("the battle ends in victory when every fiend is down", () => {
  const b = make();
  for (const f of livingFiends(b)) hit(b, "gunner", f.uid, 999);
  nextTurn(b);
  endTurn(b);
  assert.equal(b.over, "victory");
});
