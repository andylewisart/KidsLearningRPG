// Battle balance, checked by simulation with the real engine and the real
// damage numbers. The parent's playtest: "I could win every fight without
// losing anyone even by only choosing the weakest attack every time." So:
// ★ moves alone should win wild fights only at a real cost in health, mixing
// in harder moves should keep the party healthy, and the Geode Titan should
// need more than ★ spam. Each player answers right at a typical rate for the
// tier, retries a miss for half damage most of the time, and uses Overdrive
// when it's full. Health carries across a run of fights, as in the adventure.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/battle/engine.js";
import { CLASSES } from "../src/battle/data.js";
import { GUN_BASE, LASH_BASE } from "../src/battle/questions.js";
import { WILD_SCALE } from "../src/world/data.js";
import { createRng } from "../src/util/rng.js";

const ACC = { 1: 0.95, 2: 0.85, 3: 0.65 };
const SPELL_BASE = { 1: 30, 2: 110, 3: 260 }; // spellDamage() for a 6-letter word is base x 1.5
const uni = (rng, a, b) => a + rng.next() * (b - a);

function damage(cls, tier, f, rng) {
  const eff = E.effectiveness(cls, f.type);
  if (cls === "knight") return uni(rng, ...E.strikeBand(tier, f, "knight"));
  if (cls === "gunner") {
    const answer = tier === 1 ? uni(rng, 4, 20) : tier === 2 ? uni(rng, 12, 56) : Math.min(100, uni(rng, 40, 120));
    return (GUN_BASE[tier] + answer * 2) * eff;
  }
  if (cls === "spellwright") return SPELL_BASE[tier] * 1.5 * eff;
  return LASH_BASE[tier] * eff;
}

const TIER = {
  star1: () => 1,
  mixed: (rng) => (rng.chance(0.5) ? 1 : 2),
  strong: (rng) => (rng.chance(0.2) ? 3 : 2),
};

/** One fight. Returns the battle when it's over. */
function fight({ party, reserve = null, fiends, scale = null, policy, rng, start = null }) {
  const b = E.createBattle({ party, reserve, fiends, rng, scale, start });
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
    if (E.overdriveReady(b, h.key)) {
      E.spendOverdrive(b, h.key);
      if (h.cls === "titancaller") {
        // the Titan's entrance: a decent sentence, Grand Summon
        for (const f of E.livingFiends(b)) E.hit(b, h.key, f.uid, 220 * 1.4 * (f.type === "colossal" ? 2 : 1) * 1.6, { tier: 2 });
      } else {
        for (let i = 0; i < E.OD_CHAIN && E.livingFiends(b).length && rng.next() < 0.9; i++) {
          const t = rng.pick(E.livingFiends(b));
          E.hit(b, h.key, t.uid, E.odHitDamage(h.cls, i) * E.effectiveness(h.cls, t.type), { tier: 2 });
        }
      }
    } else if (policy !== "star1" && low && b.items.potion > 0) {
      b.items.potion -= 1;
      E.heal(b, low.key, 160);
    } else if (policy === "strong" && quake) {
      E.defend(b, h.key);
    } else {
      const tier = TIER[policy](rng);
      const t = foes.reduce((a, f) => (f.hp < a.hp ? f : a), foes[0]);
      const right = rng.next() < ACC[tier];
      let dmg = damage(h.cls, tier, t, rng);
      if (!right) dmg = rng.chance(0.7) ? dmg / 2 : 0;
      if (dmg > 0) E.hit(b, h.key, t.uid, dmg, { tier });
      if (right) E.reward(b, h.key, { correct: true, tier });
    }
    E.endTurn(b);
  }
  return b;
}

const POOLS = {
  1: { party: ["knight"], fights: [["scrap_raptor"], ["magnet_beetle"]] },
  3: {
    party: ["knight", "spellwright", "gunner"],
    reserve: "titancaller",
    // a full party meets two or three fiends at a time (encounterOptions)
    fights: [["dominion_drone", "magnet_beetle", "scrap_raptor"], ["volt_jelly", "ink_slime"], ["volt_jelly", "dominion_drone", "scrap_raptor"], ["volt_jelly", "volt_jelly"], ["scrap_raptor", "magnet_beetle", "scrap_raptor"]],
  },
};

/** Runs of `n` fights in a row with health carried over (and knocked-out heroes back at 10% after a win). */
function streaks(size, policy, { runs = 300, n = 3, seed = 1 } = {}) {
  const rng = createRng(seed);
  const pool = POOLS[size];
  let defeats = 0;
  let lostShare = 0;
  let fights = 0;
  for (let r = 0; r < runs; r++) {
    let start = null;
    for (let i = 0; i < n; i++) {
      const b = fight({ party: pool.party, reserve: pool.reserve, fiends: rng.pick(pool.fights), scale: WILD_SCALE[size], policy, rng, start });
      const total = b.heroes.reduce((s, h) => s + h.maxHp, 0);
      const before = start ? Object.values(start).reduce((s, x) => s + x.hp, 0) : total;
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
  return { defeatRate: defeats / runs, lostPerFight: lostShare / Math.max(1, fights) };
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
