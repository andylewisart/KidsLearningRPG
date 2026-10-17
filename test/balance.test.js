// Battle balance, checked by simulation with the real engine and the real
// damage numbers. The parent's playtest: "I could win every fight without
// losing anyone even by only choosing the weakest attack every time." So:
// ★ moves alone should win wild fights only at a real cost in health, mixing
// in harder moves should keep the party healthy, and the Geode Titan should
// need more than ★ spam. Each player answers right at a typical rate for the
// tier, retries a miss for half damage most of the time, and uses Overdrive
// when it's full. Health carries across a run of fights, as in the adventure.
// Chapter 2 adds Tamsin (the Beastkeeper): her Slow does no damage but
// holds a fiend so the others hit it harder (and pins a fast one), her
// Feed pours a tonic for whoever's worst off, and each hero's pet acts after
// their right answer. Five heroes: three fight, two wait on the bench. And
// the Crystal Grid and the forge make the heroes stronger as the chapter
// goes (world/grid.js, boosts), paid for with the glimmer each right answer
// leaves (more for a harder one: glimmerFor): a party with the Grid progress
// its own play earns should still have to work for a win, and one that never
// touched it can still win.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/battle/engine.js";
import { CLASSES, FIENDS, TITANS } from "../src/battle/data.js";
import { GUN_BASE, LASH_BASE, SLOW_BASE } from "../src/battle/questions.js";
import { WILD_SCALE, PARTY_ORDER } from "../src/world/data.js";
import { SCENES2, PETS, BOSS_FIGHT2, DOCK_FIGHT } from "../src/world/data2.js";
import { lineup, checkpoint } from "../src/world/state.js";
import { boosts, petPower, spendTypically, glimmerFor, NODES, SEED_CAP } from "../src/world/grid.js";
import { FORGE_COST } from "../src/world/forge.js";
import { createRng } from "../src/util/rng.js";

const ACC = { 1: 0.95, 2: 0.85, 3: 0.65 };
const SPELL_BASE = { 1: 30, 2: 110, 3: 260 }; // spellDamage() for a 6-letter word is base x 1.5
const uni = (rng, a, b) => a + rng.next() * (b - a);

/** A hit's damage. `power`: how much harder the hero hits with the Crystal Grid and their weapon (the Knight's is in his strike's numbers). */
function damage(cls, tier, f, rng, power = 1) {
  const eff = E.effectiveness(cls, f.type);
  if (cls === "knight") return uni(rng, ...E.strikeBand(tier, f, "knight", power));
  if (cls === "gunner") {
    const answer = tier === 1 ? uni(rng, 4, 20) : tier === 2 ? uni(rng, 12, 56) : Math.min(100, uni(rng, 40, 120));
    return (GUN_BASE[tier] + answer * 2) * eff * power;
  }
  if (cls === "spellwright") return SPELL_BASE[tier] * 1.5 * eff * power;
  if (cls === "beastkeeper") return SLOW_BASE[tier] * eff * power; // only when she's the last one standing (snareHurts)
  return LASH_BASE[tier] * eff * power;
}

const TIER = {
  star1: () => 1,
  mixed: (rng) => (rng.chance(0.5) ? 1 : 2),
  strong: (rng) => (rng.chance(0.2) ? 3 : 2),
};

/**
 * The Drain Engine's last bar: the keeper reaches the lens, the Titan Caller
 * comes onto the field with her Overdrive full (wakeTitan), and he binds
 * Beaconwing with true words about the storm, whose entrance takes the last
 * bar whole (ui/battle.js, lensPause).
 */
function bindTitan(b) {
  const titan = b.fiends.find((f) => f.phase === "lens" && !f.ko);
  const finisher = FIENDS[titan.id].finisher;
  const caller = E.wakeTitan(b, finisher);
  E.spendOverdrive(b, caller);
  b.binding = null;
  // a Spark at least, written at ★★★, double against anything colossal
  E.hit(b, caller, titan.uid, TITANS[finisher].atk * 1.6 * 1.3 * 2, { tier: 3, titan: finisher });
  E.checkOver(b);
}

/** What each hero brings into a fight: their health and Overdrive from the last one, and their stats with the Grid (`grid`: cls → boosts). */
const withGrid = (start, grid) => (grid ? Object.fromEntries(Object.entries(grid).map(([cls, x]) => [cls, { ...x, ...(start?.[cls] || {}) }])) : start);

/**
 * One fight. Returns the battle when it's over, with its right answers by
 * tier (b.rightBy) for its glimmer: a move's at the tier he picked, an
 * Overdrive's quick ones and a potion's at ★, Tamsin's Feed at ★★, a
 * Titan's entrance at ★★ (★ for a ★-only player), and Beaconwing's binding
 * at ★★★ (ui/battle.js). `slows: false` makes Tamsin's move a plain hit instead of a Slow.
 */
function fight({ party, reserve = null, fiends, scale = null, policy, rng, start = null, pets = null, slows = true, grid = null }) {
  const b = E.createBattle({ party, reserve, fiends, rng, scale, start: withGrid(start, grid), pets });
  b.rightBy = { 1: 0, 2: 0, 3: 0 };
  for (let turns = 0; !b.over && turns < 600; turns++) {
    const key = E.nextTurn(b);
    const h = b.heroes.find((x) => x.key === key);
    if (!h) {
      E.fiendTurn(b, key);
      E.endTurn(b);
      continue;
    }
    const foes = E.livingFiends(b);
    const low = E.livingHeroes(b).find((x) => x.hp / x.maxHp < 0.3);
    const quake = foes.some((f) => f.boss && (f.turns + 1) % 3 === 0);
    // chapter 2: Tamsin pours a tonic for whoever's worst off, and goes after anything too quick for the others
    const keeper = CLASSES[h.cls].slows;
    const hurt = keeper ? E.livingHeroes(b).filter((x) => x.hp / x.maxHp < 0.35).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0] : null;
    const pin = (t, tier) => keeper && slows && !t.ko && E.slow(b, t.uid, tier);
    let phase = null; // a boss's story phase, reached this turn (the Drain Engine's lens)
    const landed = (ev) => (phase ||= ev?.phase || null);
    if (E.overdriveReady(b, h.key)) {
      E.spendOverdrive(b, h.key);
      if (h.cls === "titancaller") {
        // the Titan's entrance: a decent sentence, Grand Summon (stronger with the Grid's Titan Bond)
        b.rightBy[policy === "star1" ? 1 : 2] += 1;
        for (const f of E.livingFiends(b)) landed(E.hit(b, h.key, f.uid, 220 * 1.4 * (f.type === "colossal" ? 2 : 1) * 1.6 * h.summon, { tier: 2 }));
      } else {
        for (let i = 0; i < E.comboLength(h) && E.livingFiends(b).length && rng.next() < 0.9; i++) {
          const targets = E.reachable(b, h.key);
          if (!targets.length) break;
          const t = rng.pick(targets);
          b.rightBy[1] += 1; // each hit of the chain is a quick ★ answer
          landed(E.hit(b, h.key, t.uid, E.odHitDamage(h.cls, i, h.power) * E.effectiveness(h.cls, t.type), { tier: 2 }));
          pin(t, 2); // Stampede pins as it goes
        }
      }
    } else if (hurt && policy !== "star1") {
      // Feed: a tonic, poured in milliliters, heals a third of a hero's health (ui/battle.js, TONIC)
      if (rng.next() < ACC[2]) {
        b.rightBy[2] += 1;
        E.heal(b, hurt.key, hurt.maxHp * 0.35);
      }
    } else if (policy !== "star1" && low && b.items.potion > 0) {
      b.items.potion -= 1;
      b.rightBy[1] += 1; // mixing the potion: a ★ sum
      E.heal(b, low.key, 160);
    } else if (policy === "strong" && quake) {
      E.defend(b, h.key);
    } else if (keeper && slows && !E.snareHurts(b, h.key) && !foes.some(E.slowHolds)) {
      // nothing here her snare can hold (the Drain Engine): she guards (★ only: she picks Slow, and it can't hold it)
      if (policy !== "star1") E.defend(b, h.key);
    } else if (!E.reachable(b, h.key).length && foes.some((f) => E.missReason(b, h.key, f) === "quick")) {
      // all that's left is too quick for this hero until Tamsin Slows it: guard (★ only: swing and miss)
      if (policy !== "star1") E.defend(b, h.key);
    } else {
      const tier = TIER[policy](rng);
      // the weakest fiend he can reach (a sword can't reach a flier: that's a miss); Tamsin goes for a fast one first, then one her Slow could hold tighter
      const inReach = E.reachable(b, h.key);
      const loose = keeper && slows ? foes.filter((f) => f.fast && !f.slowed) : [];
      const looser = keeper && slows ? foes.filter((f) => f.slowTier < tier) : [];
      const pool = loose.length ? loose : looser.length ? looser : inReach.length ? inReach : foes;
      const t = pool.reduce((a, f) => (f.hp < a.hp ? f : a), pool[0]);
      const right = rng.next() < ACC[tier];
      const retried = !right && rng.chance(0.7);
      // her Slow does no damage, unless nobody else is left to hit (engine.js, snareHurts)
      let dmg = E.missReason(b, h.key, t) || (keeper && slows && !E.snareHurts(b, h.key)) ? 0 : damage(h.cls, tier, t, rng, h.power);
      if (!right) dmg = retried ? dmg / 2 : 0;
      // the Knight's strike already has a Slowed fiend's extra in its numbers (strikeBand)
      if (dmg > 0) landed(E.hit(b, h.key, t.uid, dmg, { tier, exposed: h.cls !== "knight" }));
      if (right || retried) pin(t, right ? tier : 1);
      if (right) {
        b.rightBy[tier] += 1;
        E.reward(b, h.key, { correct: true, tier });
        landed(E.petAct(b, h.key, t.uid, tier)?.hit); // the hero's pet joins in
      }
    }
    E.endTurn(b);
    if (phase === "lens" && !b.over) {
      b.rightBy[3] += 1; // true words about the storm
      bindTitan(b);
    }
  }
  return b;
}

/** A fight's glimmer (world/grid.js): its right answers by tier. Captures, more glimmer still, aren't played here. */
const fightGlimmer = (b) => glimmerFor({ right: b.rightBy[1] + b.rightBy[2] + b.rightBy[3], rightByTier: b.rightBy, captures: [] });

const POOLS = {
  1: { party: ["knight"], fights: [["scrap_raptor"], ["magnet_beetle"]] },
  3: {
    party: ["knight", "spellwright", "gunner"],
    reserve: "titancaller",
    // a full party meets two or three fiends at a time (encounterOptions)
    fights: [["dominion_drone", "magnet_beetle", "scrap_raptor"], ["volt_jelly", "ink_slime"], ["volt_jelly", "dominion_drone", "scrap_raptor"], ["volt_jelly", "volt_jelly"], ["scrap_raptor", "magnet_beetle", "scrap_raptor"]],
  },
};

/**
 * Runs of `n` fights in a row with health carried over (and knocked-out heroes
 * back at 10% after a win). next(rng, start): the next fight's setup.
 */
function runStreaks(policy, next, { runs = 300, n = 3, seed = 1, pets = null, grid = null } = {}) {
  const rng = createRng(seed);
  let defeats = 0;
  let lostShare = 0;
  let fights = 0;
  let played = 0;
  let glimmer = 0;
  for (let r = 0; r < runs; r++) {
    let start = null;
    for (let i = 0; i < n; i++) {
      const b = fight({ ...next(rng, start), policy, rng, start, pets, grid });
      played += 1;
      glimmer += fightGlimmer(b); // a lost fight pays too
      const total = b.heroes.reduce((s, h) => s + h.maxHp, 0);
      const before = start ? b.heroes.reduce((s, h) => s + (start[h.cls]?.hp ?? h.maxHp), 0) : total;
      if (b.over !== "victory") {
        defeats += 1;
        break;
      }
      start = E.carryOver(b);
      for (const h of b.heroes) if (h.ko) start[h.cls].hp = Math.round(h.maxHp * 0.1);
      lostShare += (before - Object.values(start).reduce((s, x) => s + x.hp, 0)) / total;
      fights += 1;
    }
  }
  return { defeatRate: defeats / runs, lostPerFight: lostShare / Math.max(1, fights), glimmerPerFight: glimmer / Math.max(1, played) };
}

function streaks(size, policy, opts) {
  const pool = POOLS[size];
  return runStreaks(policy, (rng) => ({ party: pool.party, reserve: pool.reserve, fiends: rng.pick(pool.fights), scale: WILD_SCALE[size] }), opts);
}

function bossWins(policy, runs = 300) {
  const rng = createRng(7);
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    // the boss fight starts with the Titan Caller's Overdrive full (see BOSS_FIGHT)
    const b = fight({ party: ["knight", "gunner", "titancaller"], reserve: "spellwright", fiends: ["geode_titan"], policy, rng, start: { titancaller: { hp: CLASSES.titancaller.hp, od: 100 } } });
    wins += b.over === "victory";
  }
  return wins / runs;
}

test("★ moves alone still win a wild fight, but they cost health", () => {
  const solo = streaks(1, "star1");
  const team = streaks(3, "star1");
  assert.ok(solo.lostPerFight > 0.18, `alone: ${solo.lostPerFight.toFixed(2)} of his health per fight`);
  assert.ok(team.lostPerFight > 0.1, `the full party: ${team.lostPerFight.toFixed(2)} of its health per fight`);
  assert.ok(solo.defeatRate > 0.1, `three fights in a row without resting is risky: ${solo.defeatRate}`);
});

test("mixing in harder moves keeps the party healthy", () => {
  for (const size of [1, 3]) {
    const r = streaks(size, "mixed");
    assert.ok(r.defeatRate < 0.02, `party of ${size}: lost ${r.defeatRate} of runs`);
    assert.ok(r.lostPerFight < streaks(size, "star1").lostPerFight, `party of ${size}: harder moves should cost less health`);
  }
});

test("the Geode Titan needs more than ★ spam", () => {
  const lazy = bossWins("star1");
  const mixed = bossWins("mixed");
  const strong = bossWins("strong");
  assert.ok(lazy < 0.8, `★ only: won ${lazy}`);
  assert.ok(mixed > 0.93, `mixing tiers, with potions: won ${mixed}`);
  assert.ok(strong > 0.97, `strong play, guarding the quake: won ${strong}`);
});

// ---------------------------------------------------------------- chapter 2: Driftwood Harbor

/** Every wild fight chapter 2's places can throw (world/data2.js), with how often each comes up. */
const HARBOR = Object.values(SCENES2).flatMap((s) => s.encounters || []);

/** Every hero's pet at one stage. A ★-only player's pets never grow: they grow from ★★ and ★★★ answers (world/pets.js). */
const petsAt = (stage) => Object.fromEntries(Object.entries(PETS).map(([id, p]) => [p.owner, { id, species: p.species, stage }]));

/** Five heroes, three on the field: whoever counters what's there starts, as in the adventure (state.js, lineup). */
const lineUp = (fiends, start = null) => lineup({ party: PARTY_ORDER, flags: { ch2: true }, heroes: start || {} }, { fiends });

function harborStreaks(policy, opts) {
  const next = (rng, start) => {
    const { fiends } = rng.weighted(HARBOR, (e) => e.weight || 1);
    return { ...lineUp(fiends, start), fiends, scale: WILD_SCALE[3] };
  };
  return runStreaks(policy, next, { seed: 2, ...opts });
}

/** One fight from full health, again and again: how often it's lost, and the share of the party's health it costs. */
function fresh(setup, policy, { runs = 200, seed = 3, pets = null, slows = true } = {}) {
  const rng = createRng(seed);
  let defeats = 0;
  let lost = 0;
  for (let r = 0; r < runs; r++) {
    const b = fight({ ...setup, policy, rng, pets, slows });
    defeats += b.over !== "victory";
    lost += b.heroes.reduce((s, h) => s + h.maxHp - h.hp, 0) / b.heroes.reduce((s, h) => s + h.maxHp, 0);
  }
  return { defeatRate: defeats / runs, lost: lost / runs };
}

/** The Drain Engine at the lighthouse, as the adventure stages it. */
function engineFights(policy, { runs = 300, pets = null, grid = null } = {}) {
  const rng = createRng(7);
  let wins = 0;
  let lens = 0;
  let kos = 0;
  let left = 0;
  let clean = 0;
  for (let r = 0; r < runs; r++) {
    // like the Geode Titan, it starts with the Titan Caller's Overdrive full (ui/battle.js, bossCaller)
    const b = fight({ party: BOSS_FIGHT2.party, reserve: BOSS_FIGHT2.reserve, fiends: BOSS_FIGHT2.fiends, policy, rng, pets, grid, start: { titancaller: { hp: grid?.titancaller?.maxHp ?? CLASSES.titancaller.hp, od: 100 } } });
    wins += b.over === "victory";
    lens += b.over === "victory" && b.fiends[0].phase === "lens";
    if (b.over === "victory") {
      kos += b.heroes.filter((h) => h.ko).length;
      left += b.heroes.reduce((s, h) => s + h.hp, 0) / b.heroes.reduce((s, h) => s + h.maxHp, 0);
      clean += b.heroes.every((h) => !h.ko);
    }
  }
  return { wins: wins / runs, throughLens: lens / Math.max(1, wins), kos: kos / Math.max(1, wins), left: left / Math.max(1, wins), clean: clean / runs };
}

const fmt = (r) => `lost ${r.defeatRate.toFixed(3)} of runs, ${(r.lostPerFight ?? r.lost).toFixed(3)} of the party's health per fight`;

test("chapter 2: ★ moves alone still win the harbor's fights, but they cost health", () => {
  // every pet along at its first form: the most help a ★-only player gets
  const lazy = harborStreaks("star1", { pets: petsAt(1) });
  assert.ok(lazy.lostPerFight > 0.15, `★ only: ${fmt(lazy)}`);
  assert.ok(lazy.defeatRate < 0.1, `★ only: ${fmt(lazy)}`);
});

test("chapter 2: mixing in harder moves keeps all five healthy, with or without pets", () => {
  const lazy = harborStreaks("star1", { pets: petsAt(1) });
  const mixed = harborStreaks("mixed");
  const strong = harborStreaks("strong", { pets: petsAt(3) });
  assert.ok(mixed.defeatRate < 0.02, `mixing tiers, no pets: ${fmt(mixed)}`);
  assert.ok(mixed.lostPerFight < lazy.lostPerFight, `harder moves should cost less health: ${fmt(mixed)}`);
  assert.ok(strong.defeatRate === 0 && strong.lostPerFight < mixed.lostPerFight, `strong play, grown pets: ${fmt(strong)}`);
});

test("chapter 2: Tamsin's Slow is what beats a fast fiend", () => {
  for (const e of HARBOR.filter((x) => x.fiends.some((id) => FIENDS[id].fast))) {
    const setup = { ...lineUp(e.fiends), fiends: e.fiends, scale: WILD_SCALE[3] };
    const pinned = fresh(setup, "mixed", { runs: 120 });
    const loose = fresh(setup, "mixed", { runs: 120, slows: false });
    assert.ok(loose.lost > pinned.lost * 1.3, `${e.fiends.join(" + ")}: Slowed, ${fmt(pinned)}; never Slowed, ${fmt(loose)}`);
  }
});

test("chapter 2: every wild fight is won from full health by mixing tiers", () => {
  let hardest = null;
  for (const e of HARBOR) {
    const setup = { ...lineUp(e.fiends), fiends: e.fiends, scale: WILD_SCALE[3] };
    const mixed = fresh(setup, "mixed");
    assert.ok(mixed.defeatRate < 0.02, `${e.fiends.join(" + ")}: ${fmt(mixed)}`);
    if (!hardest || mixed.lost > hardest.lost) hardest = { ...mixed, fiends: e.fiends };
  }
  assert.ok(hardest.lost < 0.3, `the hardest, ${hardest.fiends.join(" + ")}: ${fmt(hardest)}`);
  // and the crab in the Sword Master's chair (the dock fight), which he fights to win the sword back
  const dock = fresh({ party: DOCK_FIGHT.party, reserve: DOCK_FIGHT.reserve, fiends: DOCK_FIGHT.fiends, scale: DOCK_FIGHT.scale }, "mixed");
  assert.ok(dock.defeatRate < 0.02, `the dock fight: ${fmt(dock)}`);
});

test("the Drain Engine needs more than ★ spam, and Beaconwing always ends it", () => {
  const lazy = engineFights("star1", { pets: petsAt(1) });
  const mixed = engineFights("mixed");
  const strong = engineFights("strong", { pets: petsAt(3) });
  assert.ok(lazy.wins < 0.8, `★ only: won ${lazy.wins}`);
  assert.ok(mixed.wins > 0.93, `mixing tiers, no pets: won ${mixed.wins}`);
  assert.ok(strong.wins > 0.97, `strong play, guarding the drain: won ${strong.wins}`);
  for (const r of [lazy, mixed, strong]) assert.equal(r.throughLens, 1, "every win goes through the lens");
});

// ---------------------------------------------------------------- chapter 2: the Crystal Grid and the forge

/** Every hero's pet at one stage, hitting and mending `power` × as hard (Tamsin's Pet Whisperer nodes). */
const petsWith = (stage, power = 1) => Object.fromEntries(Object.entries(petsAt(stage)).map(([cls, p]) => [cls, { ...p, power }]));

/**
 * The pets each way of playing has by the Engine. A pet is a captured fiend
 * (world/pets.js), only a ★★★ blow captures one, and a pet grows from ★★
 * and ★★★ answers: so a ★-only player has Rivet alone, as he came. One who
 * mixes tiers has every pet at its second form, and a strong one at its third.
 */
const PETS_FOR = {
  star1: (power = 1) => ({ knight: { ...petsAt(1).knight, power } }),
  mixed: (power = 1) => petsWith(2, power),
  strong: (power = 1) => petsWith(3, power),
};

/** The glimmer a fight leaves, each way of playing the harbor's fights (with that player's pets). */
const EARNED = {};
const earns = (policy) => (EARNED[policy] ??= harborStreaks(policy, { runs: 100, pets: PETS_FOR[policy]() }).glimmerPerFight);

/** About how many fights come between the Grid's first visit (the first night) and the Drain Engine (dusk on the second day). */
const DAY_TWO = 17;

/**
 * The party's stats with the Crystal Grid and the forge (world/grid.js,
 * boosts), from the second morning's checkpoint: the first visit's light
 * (SEED_CAP), `glimmer` more and `parts`, spent the usual way
 * (spendTypically: the forge first, then the cheapest node anywhere).
 * `weapon` sets every weapon's step instead, and `gates` opens the skill
 * gates. Returns { grid: cls → boosts, power: the pets' ×, lit, forged }.
 */
function gridParty({ glimmer = 0, parts = 0, weapon = null, gates = false } = {}) {
  const w = checkpoint("day2");
  if (gates) w.grid.gates = Object.keys(NODES).filter((id) => NODES[id].kind === "gate");
  if (weapon !== null) for (const cls of PARTY_ORDER) w.forge.steps[cls] = weapon;
  spendTypically(w, glimmer, { parts });
  return { grid: Object.fromEntries(PARTY_ORDER.map((cls) => [cls, boosts(w, cls)])), power: petPower(w), lit: w.grid.lit.length, forged: PARTY_ORDER.filter((cls) => w.forge.steps[cls] >= 1).length };
}

/**
 * A way of playing's own Grid progress when the Drain Engine comes: the
 * glimmer its fights since the first visit have left, and the parts for
 * every weapon's first step (about a dozen fights' worth), spent the usual way.
 */
const typical = (policy) => gridParty({ glimmer: DAY_TWO * earns(policy), parts: PARTY_ORDER.length * FORGE_COST[1] });

test("chapter 2: every fight pays on the Crystal Grid, harder answers more, and a node comes every two fights or so", () => {
  const earned = Object.fromEntries(["star1", "mixed", "strong"].map((p) => [p, earns(p)]));
  const say = Object.entries(earned).map(([p, g]) => `${p} ${g.toFixed(0)}`).join(", ");
  // ★ spam answers far more problems a fight (and an Overdrive's quick answers are ★ too), but mixing in harder ones pays at least as well
  assert.ok(earned.mixed >= earned.star1 && earned.strong >= earned.star1, `glimmer a fight: ${say}`);
  for (const g of Object.values(earned)) assert.ok(g > 25 && g < 90, `glimmer a fight: ${say}`);
  // the first visit: what's waited since chapter 1 lights a node for every hero
  const first = gridParty();
  assert.equal(SEED_CAP, checkpoint("day2").grid.light);
  assert.equal(first.lit, PARTY_ORDER.length, `the first visit lights ${first.lit} nodes`);
  // mixing tiers, a node every two fights or so, with every weapon's first step paid for at the forge too
  const later = typical("mixed");
  const every = DAY_TWO / (later.lit - first.lit);
  assert.equal(later.forged, PARTY_ORDER.length, "every weapon forged once");
  assert.ok(every >= 1.6 && every <= 2.6, `a node every ${every.toFixed(1)} fights (${later.lit - first.lit} in ${DAY_TWO})`);
});

test("chapter 2: with the Grid its own play earns, the harbor's fights still take work", () => {
  const lazyGrid = typical("star1");
  const mixedGrid = typical("mixed");
  // every pet along at its first form: the most help a ★-only player could have
  const lazy = harborStreaks("star1", { pets: petsWith(1, lazyGrid.power), grid: lazyGrid.grid });
  const mixed = harborStreaks("mixed", { pets: PETS_FOR.mixed(mixedGrid.power), grid: mixedGrid.grid });
  const without = harborStreaks("mixed", { pets: PETS_FOR.mixed() });
  assert.ok(lazy.lostPerFight > 0.12, `★ only: ${fmt(lazy)}`);
  assert.ok(mixed.defeatRate < 0.01 && mixed.lostPerFight > 0.05, `mixing tiers: ${fmt(mixed)}`);
  assert.ok(mixed.lostPerFight < without.lostPerFight * 0.95, `the Grid is felt: ${fmt(mixed)}, against ${fmt(without)} without it`);
  // even with every node lit and every weapon forged twice, ★ moves alone cost health
  const full = gridParty({ glimmer: 99999, weapon: 2, gates: true });
  const maxed = harborStreaks("star1", { pets: petsWith(1, full.power), grid: full.grid });
  assert.ok(maxed.lostPerFight > 0.08, `★ only, the whole Grid lit: ${fmt(maxed)}`);
});

test("chapter 2: with the Grid its own play earns, ★ spam beats the Drain Engine about as often as chapter 1's boss", () => {
  const geode = bossWins("star1");
  const lazyGrid = typical("star1");
  const lazy = engineFights("star1", { pets: PETS_FOR.star1(lazyGrid.power), grid: lazyGrid.grid });
  const won = `★ only, ${lazyGrid.lit} nodes lit and ${lazyGrid.forged} weapons forged: won ${lazy.wins.toFixed(2)} (the Geode Titan, ★ only: ${geode.toFixed(2)})`;
  assert.ok(lazy.wins > 0.4 && lazy.wins < 0.7, won);
  assert.ok(Math.abs(lazy.wins - geode) < 0.15, won);
  // even with every pet along (more than ★ play can win), most runs lose a hero or the fight: the parent's test was winning "without losing anyone"
  const helped = engineFights("star1", { pets: petsWith(1, lazyGrid.power), grid: lazyGrid.grid });
  assert.ok(helped.clean < 0.5, `★ only, every pet along: won ${helped.wins.toFixed(2)}, with nobody knocked out ${helped.clean.toFixed(2)}`);
  // mixing tiers, with its own Grid progress, wins nearly always, and nearly always with nobody knocked out
  const mixedGrid = typical("mixed");
  const mixed = engineFights("mixed", { pets: PETS_FOR.mixed(mixedGrid.power), grid: mixedGrid.grid });
  assert.ok(mixed.wins > 0.97 && mixed.clean > 0.9, `mixing tiers, ${mixedGrid.lit} nodes lit: won ${mixed.wins.toFixed(2)}, with nobody knocked out ${mixed.clean.toFixed(2)}`);
  // and a party that never touched the Grid or the forge still wins by mixing tiers
  const skipped = engineFights("mixed", { pets: PETS_FOR.mixed() });
  assert.ok(skipped.wins > 0.95, `mixing tiers, no Grid: won ${skipped.wins.toFixed(2)}`);
  for (const r of [lazy, helped, mixed, skipped]) assert.equal(r.throughLens, 1, "every win goes through the lens");
});
