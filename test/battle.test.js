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
  missReason,
  reachable,
  counterOf,
  slow,
  snapshot,
  restore,
  feed,
  canEat,
  petAct,
  wakeTitan,
  benchHeroes,
  reserveHero,
  livingHeroes,
  PET_POWER,
  PET_MEND,
  PET_TIER,
} from "../src/battle/engine.js";
import { createRng } from "../src/util/rng.js";
import { CLASSES, FIENDS, TITANS } from "../src/battle/data.js";
import { makeQuestion, feedQuestion, overdriveQuestion, SLOW_BASE } from "../src/battle/questions.js";
import { LADDERS, SKILLS } from "../src/learn/skills.js";
import { timeAnswerText } from "../src/learn/measure.js";

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

test("the Knight can't reach a flier: the miss is known before any problem opens", () => {
  const b = make(["dominion_drone", "magnet_beetle"]);
  const [drone, beetle] = b.fiends;
  assert.equal(missReason(b, "knight", drone), "reach");
  assert.equal(missReason(b, "knight", beetle), null);
  assert.equal(missReason(b, "gunner", drone), null);
  assert.equal(missReason(b, "spellwright", drone), null, "everyone else lands a hit, soft or not");
  assert.deepEqual(reachable(b, "knight").map((f) => f.id), ["magnet_beetle"]);
  assert.equal(counterOf("flier"), "gunner");
  assert.equal(counterOf("armored"), "knight");
  assert.equal(counterOf("normal"), null);
});

test("a miss never leaves a fight he can't win", () => {
  const b = createBattle({ party: ["knight", "gunner"], fiends: ["volt_jelly"], rng: createRng(2) });
  const jelly = b.fiends[0];
  assert.equal(missReason(b, "knight", jelly), "reach");
  b.heroes.find((x) => x.cls === "gunner").ko = true;
  assert.equal(missReason(b, "knight", jelly), null, "alone with a flier, the sword lands soft hits instead");
});

test("a fast fiend dodges until it's Slowed, and only when someone can Slow it", () => {
  const b = make(["scrap_raptor"]);
  const f = b.fiends[0];
  f.fast = true;
  assert.equal(missReason(b, "gunner", f), null, "nobody in the party can Slow it, so it can't be a miss");
  CLASSES.slower = { slows: true }; // stands in for chapter 2's hero who Slows
  b.heroes[0].cls = "slower";
  try {
    assert.equal(missReason(b, "gunner", f), "quick");
    slow(b, f.uid);
    assert.equal(missReason(b, "gunner", f), null);
  } finally {
    delete CLASSES.slower;
  }
});

// ---------------------------------------------------------------- chapter 2: the Beastkeeper, pets and the Drain Engine

/** A chapter 2 fight: five heroes, three on the field and two on the bench. */
const harbor = (fiends, { party = ["knight", "gunner", "beastkeeper"], reserve = ["spellwright", "titancaller"], pets = null, seed = 1 } = {}) =>
  createBattle({ party, reserve, fiends, rng: createRng(seed), pets });

/** How many turns each fighter gets in the next n. */
function turnCounts(b, n) {
  const c = {};
  for (let i = 0; i < n; i++) {
    const k = nextTurn(b);
    c[k] = (c[k] || 0) + 1;
    endTurn(b);
  }
  return c;
}

test("chapter 2's fiends: a kind each, and every kind has its hero", () => {
  const kinds = { barnacle_brute: "armored", wick_moth: "flier", fog_glob: "slime", tick_mimic: "fast", crumb_goblin: "fast", riptide_eel: "fast", caged_drone: "flier", drain_engine: "colossal" };
  for (const [id, type] of Object.entries(kinds)) {
    assert.equal(FIENDS[id].type, type, id);
    assert.equal(FIENDS[id].chapter, 2, id);
    assert.equal(Boolean(FIENDS[id].fast), type === "fast", id);
  }
  assert.equal(counterOf("fast"), "beastkeeper");
  assert.equal(effectiveness("beastkeeper", "fast"), 1.5);
  assert.equal(effectiveness("beastkeeper", "armored"), 0.5);
  assert.equal(effectiveness("beastkeeper", "colossal"), 0.6, "the Engine is a Titan's job");
  assert.equal(effectiveness("titancaller", "colossal"), 1.5);
  // chapter 1's matchups are as they were
  assert.equal(effectiveness("gunner", "armored"), 0.4);
  assert.equal(effectiveness("knight", "slime"), 0.3);
});

test("a fast fiend acts twice a round until it's Slowed, then once", () => {
  const b = harbor(["tick_mimic"]);
  const f = b.fiends[0];
  const before = turnCounts(b, 300);
  // speed 8, like the Knight: twice as often until it's pinned
  assert.ok(before[f.uid] / before.knight > 1.8, `${before[f.uid]} turns to the Knight's ${before.knight}`);
  assert.deepEqual(preview(b, 6).filter((k) => k === f.uid).length >= 2, true, "the turn order shows it");
  b.turn = "beastkeeper";
  assert.equal(slow(b, f.uid), true, "pinned");
  assert.equal(slow(b, f.uid), false, "only once");
  endTurn(b);
  const after = turnCounts(b, 300);
  assert.ok(Math.abs(after[f.uid] / after.knight - 1) < 0.1, `${after[f.uid]} turns to the Knight's ${after.knight}`);
});

test("a fast fiend dodges everyone but the Beastkeeper, until she's Slowed it", () => {
  const b = harbor(["crumb_goblin", "fog_glob"]);
  const [goblin, fog] = b.fiends;
  assert.equal(missReason(b, "knight", goblin), "quick");
  assert.equal(missReason(b, "gunner", goblin), "quick");
  assert.equal(missReason(b, "beastkeeper", goblin), null, "her Slow lands");
  assert.equal(missReason(b, "knight", fog), null, "a slime only splashes soft");
  assert.deepEqual(reachable(b, "gunner").map((f) => f.id), ["fog_glob"]);
  slow(b, goblin.uid);
  assert.equal(missReason(b, "knight", goblin), null);
  // on the bench she can still come in, so it's still a miss; knocked out, it isn't
  const c = harbor(["riptide_eel"], { party: ["knight", "gunner", "spellwright"], reserve: ["beastkeeper", "titancaller"] });
  assert.equal(missReason(c, "knight", c.fiends[0]), "quick");
  assert.equal(matchupAdvice(c, "knight", "fast").advice, "swap");
  c.heroes.find((x) => x.cls === "beastkeeper").ko = true;
  assert.equal(missReason(c, "knight", c.fiends[0]), null, "nobody can Slow it: soft hits instead of a fight he can't win");
});

test("Feed: a fiend eats instead of its next turn and stays calm, and a calm one can be captured", () => {
  const b = harbor(["barnacle_brute", "crumb_goblin", "caged_drone"]);
  const [brute, goblin, drone] = b.fiends;
  // chapter 2's fiends are wary: a ★★★ finish alone doesn't capture them
  assert.ok(FIENDS.crumb_goblin.wary);
  const wild = hit(b, "beastkeeper", goblin.uid, 999, { tier: 3 });
  assert.ok(wild.ko && !wild.captured);
  assert.ok(feed(b, brute.uid));
  assert.ok(brute.calm && brute.eating);
  const hpBefore = livingHeroes(b).map((x) => x.hp);
  assert.deepEqual(fiendTurn(b, brute.uid), { kind: "eat", hits: [] });
  assert.deepEqual(livingHeroes(b).map((x) => x.hp), hpBefore, "it ate instead");
  assert.ok(brute.calm && !brute.eating, "calm for the rest of the fight");
  assert.notEqual(fiendTurn(b, brute.uid).kind, "eat");
  const caught = hit(b, "knight", brute.uid, 999, { tier: 3 });
  assert.ok(caught.ko && caught.captured);
  // a machine doesn't eat, and is never captured; bosses don't eat either
  assert.ok(!canEat(drone) && !feed(b, drone.uid));
  assert.ok(!hit(b, "gunner", drone.uid, 999, { tier: 3 }).captured);
  const boss = harbor(["drain_engine"]);
  assert.ok(!feed(boss, boss.fiends[0].uid));
  // chapter 1's fiends are captured as they always were
  const old = make(["scrap_raptor"]);
  assert.ok(hit(old, "gunner", "scrap_raptor#1", 999, { tier: 3 }).captured);
});

test("the Riptide Eel snatches a potion first, and drops it when it's beaten", () => {
  const b = harbor(["riptide_eel"]);
  const eel = b.fiends[0];
  assert.equal(b.items.potion, 3);
  assert.equal(fiendTurn(b, eel.uid).kind, "steal");
  assert.equal(b.items.potion, 2);
  assert.equal(fiendTurn(b, eel.uid).kind, "attack", "just the once");
  const ev = hit(b, "beastkeeper", eel.uid, 999);
  assert.equal(ev.returned, 1);
  assert.equal(b.items.potion, 3);
  // nothing to snatch: it attacks
  const c = harbor(["riptide_eel"]);
  c.items.potion = 0;
  assert.equal(fiendTurn(c, c.fiends[0].uid).kind, "attack");
});

test("pets act after their hero's right answer: Rivet bites, Chime mends", () => {
  const pets = { knight: { id: "rivet", species: "raptor", stage: 2 }, titancaller: { id: "chime", species: "tide", stage: 3 } };
  const b = harbor(["barnacle_brute", "crumb_goblin"], { party: ["knight", "titancaller", "beastkeeper"], reserve: ["gunner", "spellwright"], pets });
  const [brute, goblin] = b.fiends;
  const hp = brute.hp;
  const bite = petAct(b, "knight", brute.uid);
  assert.equal(bite.pet, "rivet");
  assert.equal(bite.kind, "bite");
  assert.equal(bite.hit.target, brute.uid);
  assert.equal(hp - brute.hp, PET_POWER[2]);
  // the harder the answer, the harder it bites: a nibble after ★, more after ★★★
  for (const tier of [1, 3]) {
    const before = brute.hp;
    petAct(b, "knight", brute.uid, tier);
    assert.equal(before - brute.hp, PET_POWER[2] * PET_TIER[tier]);
  }
  assert.ok(PET_TIER[1] < PET_TIER[2] && PET_TIER[2] < PET_TIER[3]);
  // its hero can't reach the goblin (too quick), so neither can Rivet: it bites what he can
  assert.equal(petAct(b, "knight", goblin.uid).hit.target, brute.uid);
  // Chime's bell mends everyone on the field who's hurt
  assert.equal(petAct(b, "titancaller"), null, "nobody's hurt");
  for (const x of livingHeroes(b)) x.hp -= 100;
  const bell = petAct(b, "titancaller");
  assert.equal(bell.kind, "mend");
  assert.deepEqual(bell.heals.map((x) => x.healed), [PET_MEND[3], PET_MEND[3], PET_MEND[3]]);
  // no pet, a benched hero's pet or a knocked-out hero's pet: nothing
  assert.equal(petAct(b, "beastkeeper", brute.uid), null);
  b.heroes.find((x) => x.cls === "knight").ko = true;
  assert.equal(petAct(b, "knight", brute.uid), null);
  assert.ok(PET_POWER[1] < PET_POWER[2] && PET_POWER[2] < PET_POWER[3], "each form hits harder");
});

test("five heroes: two on the bench, and he picks who comes in", () => {
  const b = harbor(["fog_glob"]);
  assert.deepEqual(benchHeroes(b).map((x) => x.key), ["spellwright", "titancaller"]);
  b.turn = "gunner";
  assert.equal(swap(b, "gunner", "titancaller"), "titancaller");
  assert.equal(b.turn, "titancaller");
  assert.deepEqual(benchHeroes(b).map((x) => x.key), ["gunner", "spellwright"]);
  assert.equal(swap(b, "knight", "titancaller"), null, "she's already fighting");
  // a knocked-out hero on the bench is passed over for one who can fight
  b.heroes.find((x) => x.key === "gunner").ko = true;
  assert.equal(reserveHero(b).key, "spellwright");
  assert.equal(swap(b, "knight", "gunner"), null);
  // and when a hero on the field goes down, the next one up jumps in
  const c = harbor(["barnacle_brute"], { seed: 3 });
  for (const x of c.heroes.filter((x) => x.active)) x.hp = 1;
  const ev = fiendTurn(c, c.fiends[0].uid);
  assert.equal(ev.swappedIn, "spellwright");
});

test("the Drain Engine drinks what it drains, until its last bar stops the fight for the lens", () => {
  const b = harbor(["drain_engine"], { party: ["knight", "titancaller", "beastkeeper"], reserve: ["gunner", "spellwright"], seed: 4 });
  const engine = b.fiends[0];
  assert.equal(engine.bars, FIENDS.drain_engine.bars);
  assert.equal(FIENDS.drain_engine.phases[engine.bars], "lens", "its last bar is the lens");
  hit(b, "knight", engine.uid, 300);
  const dented = engine.hp;
  fiendTurn(b, engine.uid);
  fiendTurn(b, engine.uid);
  const special = fiendTurn(b, engine.uid);
  assert.equal(special.kind, "special");
  assert.equal(special.hits.length, 3, "it drains everyone on the field");
  const drank = Math.round(special.hits.reduce((sum, x) => sum + x.amount, 0) * FIENDS.drain_engine.drain);
  assert.equal(special.drained, Math.min(drank, engine.maxHp - dented));
  assert.equal(engine.hp, Math.min(engine.maxHp, dented + drank));
  // the bars before it break as any boss's do; the last one breaks into its story phase (the keeper reaches the lens)
  for (let bar = 1; bar < engine.bars - 1; bar++) {
    const ev = hit(b, "titancaller", engine.uid, 5000);
    assert.ok(ev.barBroken && !ev.phase);
  }
  const lens = hit(b, "titancaller", engine.uid, 5000);
  assert.ok(lens.barBroken);
  assert.equal(lens.phase, "lens");
  assert.equal(engine.phase, "lens");
  // from then on it doesn't mend
  hit(b, "knight", engine.uid, 300);
  const before = engine.hp;
  let last = null;
  for (let i = 0; i < 3; i++) last = fiendTurn(b, engine.uid);
  assert.equal(last.kind, "special");
  assert.ok(!last.drained);
  assert.equal(engine.hp, before, "nothing drained back once the keeper's at the lens");
});

test("only Beaconwing can tear the Engine off the tower, while the Titan Caller stands", () => {
  const b = harbor(["drain_engine"], { party: ["knight", "titancaller", "beastkeeper"], reserve: ["gunner", "spellwright"] });
  const engine = b.fiends[0];
  while (engine.bar < engine.bars) hit(b, "knight", engine.uid, 5000);
  // the last bar hangs on at 1 HP against anything else (Tidebreaker too)
  const held = hit(b, "knight", engine.uid, 5000, { tier: 3 });
  assert.ok(held.held && !held.ko);
  assert.equal(engine.hp, 1);
  assert.ok(hit(b, "titancaller", engine.uid, 5000, { titan: "titan_starter" }).held);
  // Beaconwing takes the last bar whole, however hard the summon was written
  const torn = hit(b, "titancaller", engine.uid, 10, { tier: 3, titan: "titan_beaconwing" });
  assert.ok(torn.ko && !torn.captured);
  assert.equal(TITANS.titan_beaconwing.look, "light");
  // with the Titan Caller down, anyone can finish it (a fight he can't win is worse)
  const c = harbor(["drain_engine"], { party: ["knight", "titancaller", "beastkeeper"], reserve: ["gunner", "spellwright"] });
  while (c.fiends[0].bar < c.fiends[0].bars) hit(c, "knight", c.fiends[0].uid, 5000);
  c.heroes.find((x) => x.cls === "titancaller").ko = true;
  assert.ok(hit(c, "knight", c.fiends[0].uid, 5000).ko);
});

test("the Titan wakes: the Titan Caller comes onto the field, on her feet, to bind it", () => {
  const b = harbor(["drain_engine"], { party: ["knight", "gunner", "beastkeeper"], reserve: ["spellwright", "titancaller"] });
  const caller = b.heroes.find((x) => x.cls === "titancaller");
  caller.ko = true;
  caller.hp = 0;
  b.heroes.find((x) => x.cls === "gunner").hp = 20; // the worst off steps back
  assert.equal(wakeTitan(b, "titan_beaconwing"), "titancaller");
  assert.ok(caller.active && !caller.ko && caller.hp > 0);
  assert.equal(caller.od, 100);
  assert.equal(b.binding, "titan_beaconwing");
  assert.deepEqual(activeHeroes(b).map((x) => x.key), ["knight", "beastkeeper", "titancaller"]);
  assert.equal(b.clock.titancaller, b.clock.gunner, "she takes the place of the hero she replaced");
  // already on the field: she stays where she is
  const c = harbor(["drain_engine"], { party: ["knight", "titancaller", "beastkeeper"] });
  assert.equal(wakeTitan(c, "titan_beaconwing"), "titancaller");
  assert.equal(activeHeroes(c).length, 3);
  // and it all saves with the fight
  const back = restore(snapshot(b), createRng(1));
  assert.equal(back.binding, "titan_beaconwing");
});

test("a chapter 2 fight saved between turns keeps its pets, its Slows and its meals", () => {
  const pets = { knight: { id: "rivet", species: "raptor", stage: 1 } };
  const b = harbor(["crumb_goblin", "riptide_eel", "barnacle_brute"], { pets });
  slow(b, b.fiends[0].uid);
  feed(b, b.fiends[2].uid);
  fiendTurn(b, b.fiends[1].uid);
  const back = restore(snapshot(b), createRng(2));
  assert.deepEqual(back.pets, pets);
  assert.ok(back.fiends[0].slowed && back.fiends[2].calm && back.fiends[2].eating);
  assert.equal(back.fiends[1].stolen, 1);
  // a fight saved before pets comes back with none
  const old = make();
  const snap = snapshot(old);
  delete snap.pets;
  assert.equal(petAct(restore(snap, createRng(1)), "knight"), null);
});

// ---------------------------------------------------------------- chapter 2's questions: Slow, Feed and Stampede

const ctx3 = { rng: createRng(8), grades: { time: 3, measure: 3 } };
const goblin = { id: "crumb_goblin", uid: "crumb_goblin#1", name: "Crumb Goblin", type: "fast", hp: 230, maxHp: 230 };

test("Slow is a time problem on the clock at his rung, and it lands by the stars", () => {
  for (const skill of LADDERS.time) {
    for (const tier of [1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        const q = makeQuestion({ cls: "beastkeeper", tier, skill, target: goblin, ctx: ctx3 });
        assert.equal(q.skill, skill);
        assert.equal(SKILLS[q.skill].track, "time");
        assert.ok(q.slows);
        assert.ok(q.grade(timeAnswerText(q.problem)).correct, `${skill}: its own answer`);
        assert.ok(!q.grade("99:99").correct);
        assert.equal(q.panel.kind, q.problem.op === "between" ? "number" : "clock");
        assert.equal(q.damageTo(goblin, { half: false }), SLOW_BASE[tier] * 1.5, "her counter: half again");
        assert.equal(q.damageTo({ type: "armored" }, { half: true }), SLOW_BASE[tier] * 0.5 * 0.5);
        assert.ok(q.hint(q.problem.op === "between" ? "0" : "1:00").text);
      }
    }
  }
  // the moves have their own names (her command is Slow)
  assert.deepEqual(CLASSES.beastkeeper.moves, { 1: "Crook Snag", 2: "Slow Snare", 3: "Time Trap" });
});

test("Feed pours a tonic in milliliters or weighs a meal in grams, inside the grade-3 limits", () => {
  const rng = createRng(9);
  const tamsin = { key: "beastkeeper", name: "Tamsin", hp: 100, maxHp: 360 };
  for (const skill of LADDERS.measure) {
    for (let i = 0; i < 40; i++) {
      const tonic = feedQuestion({ target: tamsin, forHero: true, skill, rng });
      assert.equal(tonic.problem.unit, "mL");
      assert.notEqual(tonic.skill, "measure.mass", "a jug holds volume");
      const meal = feedQuestion({ target: goblin, forHero: false, skill, rng });
      assert.equal(meal.problem.unit, "g");
      assert.notEqual(meal.skill, "measure.volume", "a scale weighs mass");
      for (const q of [tonic, meal]) {
        assert.equal(SKILLS[q.skill].track, "measure");
        assert.ok(q.whole, "no half measures: a retry after help works in full");
        assert.ok(q.grade(q.answerText).correct);
        assert.ok(q.problem.answer > 0 && q.problem.answer <= 1000);
        if (q.problem.op === "times" || q.problem.op === "share") assert.ok(q.problem.a <= 100 && q.problem.b <= 100);
      }
    }
  }
});

test("Stampede: quick looks at a clock, at his rung", () => {
  const rng = createRng(10);
  for (const skill of LADDERS.time) {
    for (let i = 0; i < 40; i++) {
      const q = overdriveQuestion("beastkeeper", skill, { rng });
      assert.equal(SKILLS[q.skill].track, "time");
      assert.ok(q.grade(q.answerText).correct);
      const n = Number(q.answerText);
      if (skill === "time.elapsed") assert.ok(n > 0 && n <= 30 && n % 5 === 0, `${n} minutes`);
      else assert.ok(n >= 0 && n <= 59);
    }
  }
});
