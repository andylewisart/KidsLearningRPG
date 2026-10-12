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
  carryOver,
  OVERDRIVE_GAIN,
  livingFiends,
  activeHeroes,
  messyHp,
  matchupAdvice,
  snapshot,
  restore,
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

test("right answers fill Overdrive, quick ones nearly as fast; brave misses still count", () => {
  const b = make();
  const filled = [];
  for (let i = 0; i < 5; i++) filled.push(reward(b, "gunner", { correct: true, tier: 1 }));
  assert.ok(overdriveReady(b, "gunner"), "five quick right answers fill it");
  assert.deepEqual(filled, [false, false, false, false, true], "it says so once, when it fills");
  assert.ok(OVERDRIVE_GAIN.right[1] >= OVERDRIVE_GAIN.right[3] * 0.6);
  reward(b, "knight", { correct: false, tier: 3 });
  assert.equal(b.heroes[0].od, OVERDRIVE_GAIN.braveMiss);
  reward(b, "knight", { correct: false, tier: 1 });
  assert.equal(b.heroes[0].od, OVERDRIVE_GAIN.braveMiss);
  assert.equal(b.titanGauge, undefined, "no separate Titan gauge: the Titan Caller's Overdrive is the summon");
});

test("health and Overdrive carry from fight to fight", () => {
  const start = { knight: { hp: 120, od: 100 }, gunner: { hp: 0, od: 40 } };
  const b = createBattle({ party: ["knight", "gunner", "spellwright"], reserve: "titancaller", fiends: ["scrap_raptor"], rng: createRng(4), start });
  const k = b.heroes.find((h) => h.cls === "knight");
  const g = b.heroes.find((h) => h.cls === "gunner");
  const m = b.heroes.find((h) => h.cls === "titancaller");
  assert.equal(k.hp, 120);
  assert.ok(overdriveReady(b, "knight"));
  assert.ok(g.ko && !g.active, "a knocked-out hero starts on the bench");
  assert.ok(m.active, "and the reserve takes her place");
  const out = carryOver(b);
  assert.deepEqual(out.knight, { hp: 120, od: 100 });
  assert.equal(out.gunner.hp, 0);
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

test("Kit only says Swap when the hero who'd do better is on the bench", () => {
  const rng = createRng(3);
  const fight = (party, reserve = null) => createBattle({ party, reserve, fiends: ["volt_jelly"], rng });
  // three heroes: nobody on the bench, and the Gunner is already fighting
  assert.deepEqual(matchupAdvice(fight(["knight", "gunner", "spellwright"]), "knight", "flier"), { advice: "theirTurn", counter: true, hero: "gunner" });
  // four: the Gunner on the bench is worth swapping in
  assert.equal(matchupAdvice(fight(["knight", "spellwright", "titancaller"], "gunner"), "knight", "flier").advice, "swap");
  // no Gunner yet: Knox's spells still do better than a sword, and he's fighting
  assert.deepEqual(matchupAdvice(fight(["knight", "spellwright"]), "knight", "flier"), { advice: "someoneElse", counter: false, hero: "spellwright" });
  // alone: no one to bring in
  assert.equal(matchupAdvice(fight(["knight"]), "knight", "slime").advice, "goBig");
  // a knocked-out counter doesn't count
  const b = fight(["knight", "gunner", "spellwright"]);
  b.heroes.find((x) => x.cls === "spellwright").ko = true;
  assert.equal(matchupAdvice(b, "knight", "slime").advice, "goBig");
  // with three heroes or fewer, never Swap
  for (const party of [["knight"], ["knight", "spellwright"], ["knight", "gunner", "spellwright"], ["knight", "spellwright", "titancaller"]])
    for (const type of ["armored", "flier", "slime"]) for (const who of party) assert.notEqual(matchupAdvice(fight(party), who, type).advice, "swap", `${party} ${who} ${type}`);
});

test("a fight saved between turns comes back exactly, and plays on the same way", () => {
  // play a few turns of a boss fight, then save it the way the game does
  const boss = () => createBattle({ party: ["knight", "gunner", "titancaller"], reserve: "spellwright", fiends: ["geode_titan"], rng: createRng(5) });
  const playTurns = (b, n) => {
    const order = [];
    for (let i = 0; i < n && !b.over; i++) {
      const key = nextTurn(b);
      order.push(key);
      if (b.fiends.some((f) => f.uid === key)) fiendTurn(b, key);
      else hit(b, key, b.fiends[0].uid, 60, { tier: 2 });
      endTurn(b);
    }
    return order;
  };
  const a = boss();
  playTurns(a, 7);
  const saved = JSON.parse(JSON.stringify(snapshot(a))); // through the save file and back
  assert.equal(saved.rng, undefined, "no dice in the save");
  assert.equal(saved.turn, null);
  // brought back, it's the same fight: health, bars, gauges, potions, the boss's turn count
  const b = restore(saved, createRng(99));
  for (const k of ["heroes", "fiends", "clock", "now", "items"]) assert.deepEqual(b[k], snapshot(a)[k], k);
  assert.equal(b.over, null);
  // and whose turn comes next doesn't depend on the dice
  assert.deepEqual(preview(b, 8), preview(a, 8));
  // a fresh copy of the original, with the same dice from here, plays the same as the restored one
  const c = restore(saved, createRng(7));
  const d = restore(saved, createRng(7));
  assert.deepEqual(playTurns(c, 6), playTurns(d, 6));
  assert.deepEqual(c.heroes, d.heroes);
  // a quit mid-turn isn't saved
  a.quit = true;
  assert.equal(snapshot(a).quit, undefined);
});
