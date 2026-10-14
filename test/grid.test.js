// The Crystal Grid and the Sword Master's forge (chapter 2, beats 7 and 8;
// src/world/grid.js and forge.js): every hero's road of nodes, lighting them
// with glimmer, the skill gates that open by learning, what it all does in a
// fight, pets' slots, Calm Seas, the weapons, and saves from before them.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PARTY_ORDER, SCENES } from "../src/world/data.js";
import { SPARKLE, VISIBLE } from "../src/world/story.js";
import { nextGoal } from "../src/world/chapter2.js";
import { checkpoint, freshWorld, upgradeWorld, battleStart, heroState, rest, battlePets, CHECKPOINT_LIGHT } from "../src/world/state.js";
import { paintedLayout } from "../src/world/painted.js";
import {
  NODES,
  HERO_NODES,
  ICONS,
  COST,
  SEED_CAP,
  CALM_SEAS,
  QUIET,
  gridOf,
  seedLight,
  earnLight,
  isLit,
  nodeState,
  lightNode,
  tokenAt,
  route,
  nextUp,
  anyReady,
  progressOf,
  gateProgress,
  openGates,
  boosts,
  maxHpOf,
  petSlotOpen,
  petPower,
  calmSeas,
  quietPlace,
  encounterPace,
  about,
  spendTypically,
} from "../src/world/grid.js";
import { WEAPONS, FORGE_COST, WEAPON_POWER, PARTS, partsFor, addParts, forge, forgeOf, forgeReady, forgeDone, weaponOf, nextStep } from "../src/world/forge.js";
import { createMastery } from "../src/learn/mastery.js";
import { CLASSES, FIENDS } from "../src/battle/data.js";
import { SKILLS } from "../src/learn/skills.js";

const ASSETS = JSON.parse(fs.readFileSync(new URL("../public/assets/manifest.json", import.meta.url))).assets;
const LAYOUT = JSON.parse(fs.readFileSync(new URL("../src/ui/stage-layout.json", import.meta.url)));
const DAY = 86400000;

/** A world with the Grid found and `light` to spend (the second morning). */
function found(light = 0) {
  const w = checkpoint("day2");
  w.grid.light = light;
  return w;
}

/** A child for the gates, with answers given on `days` different days (`clean`: right with no hint). */
function kid({ name = "", grade = 3, answers = {} } = {}) {
  let t = Date.UTC(2026, 9, 1);
  const m = createMastery({}, { now: () => t, gradeOf: () => grade });
  for (const [skill, list] of Object.entries(answers)) {
    for (const [day, correct, hinted = false] of list) {
      t = Date.UTC(2026, 9, 1) + day * DAY;
      m.record(skill, { correct, tier: 2, hinted, ms: 4000 });
    }
  }
  return { name, gradeOf: () => grade, level: (id) => m.level(id), evidence: (id) => m.evidence(id) };
}
/** Ten answers over three days, all right with no hints: "on track". */
const learned = () => Array.from({ length: 10 }, (_, i) => [i % 3, true]);

test("the chart: a road for every hero, a weapon's side road and a gate's, all on the board", () => {
  for (const cls of PARTY_ORDER) {
    const ids = HERO_NODES[cls];
    assert.equal(NODES[`${cls}.0`].kind, "start");
    assert.ok(ids.includes(`${cls}.w1`) && ids.includes(`${cls}.w2`) && ids.includes(`${cls}.gate`) && ids.includes(`${cls}.g1`) && ids.includes(`${cls}.g2`), cls);
    for (const id of ids) {
      const node = NODES[id];
      assert.equal(node.cls, cls);
      if (node.from) assert.equal(NODES[node.from].cls, cls, `${id} hangs off its own hero's road`);
      // costs grow along a road
      if (node.cost && NODES[node.from]?.cost) assert.ok(node.cost > NODES[node.from].cost, id);
      // inside the 2000 px chart, with room for the node and its cost
      assert.ok(Math.abs(node.at[0]) < 940 && Math.abs(node.at[1]) < 940, `${id} at ${node.at}`);
    }
  }
  // Tamsin's road is short ("Mine's short.")
  assert.ok(HERO_NODES.beastkeeper.length < HERO_NODES.knight.length);
  // no two nodes on top of each other
  const all = Object.values(NODES);
  for (const a of all) for (const b of all) if (a !== b) assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 70, `${a.id} and ${b.id}`);
  // the painted node sheet has every kind, lit and unlit; the token sheet every hero; the weapon sheet every step
  const nodes = ASSETS.grid_nodes.sheet.names;
  for (const icon of new Set(Object.values(ICONS))) assert.ok(nodes.includes(icon) && nodes.includes(`${icon}_lit`), icon);
  assert.equal(ASSETS.grid_tokens.sheet.names.length, PARTY_ORDER.length + 1);
  for (const cls of PARTY_ORDER) for (const step of [1, 2]) assert.ok(ASSETS.weapons_ch2.sheet.names.includes(WEAPONS[cls].steps[step].icon));
  assert.ok(ASSETS.grid_board.base.src);
});

test("lighting a node: next to a lit one, with glimmer enough, and the token walks there", () => {
  const w = found(COST[1] + COST[2] - 1);
  assert.equal(nodeState(w, "knight.0"), "lit");
  assert.equal(nodeState(w, "knight.1"), "ready");
  assert.equal(nodeState(w, "knight.2"), "far");
  assert.equal(nodeState(w, "knight.gate"), "shut");
  assert.equal(nodeState(w, "knight.w1"), "forge");
  assert.deepEqual(lightNode(w, "knight.2"), { ok: false, why: "far" });
  assert.equal(nextUp(w, "knight"), "knight.1");
  assert.ok(lightNode(w, "knight.1").ok);
  assert.equal(w.grid.light, COST[2] - 1);
  assert.equal(tokenAt(w, "knight"), "knight.1");
  assert.equal(nodeState(w, "knight.2"), "short", "next, but a little short");
  assert.deepEqual(lightNode(w, "knight.2"), { ok: false, why: "short" });
  assert.deepEqual(lightNode(w, "knight.1"), { ok: false, why: "lit" });
  earnLight(w, 1);
  assert.ok(lightNode(w, "knight.2").ok);
  assert.equal(w.grid.light, 0);
  assert.ok(!anyReady(w));
  assert.deepEqual(progressOf(w, "knight"), { lit: 2, of: HERO_NODES.knight.filter((id) => NODES[id].cost > 0).length });
  // the token's way between nodes goes back along the road and out again
  assert.deepEqual(route("knight.2", "knight.0"), ["knight.2", "knight.1", "knight.0"]);
  assert.deepEqual(route("knight.1", "knight.w2"), ["knight.1", "knight.2", "knight.w1", "knight.w2"]);
  assert.deepEqual(route("knight.4", "knight.g1"), ["knight.4", "knight.gate", "knight.g1"]);
  // what Kit has for a node: a pet slot, Calm Seas
  const v = found(9999);
  assert.deepEqual(lightNode(v, "gunner.1").said, ["petSlot"]);
  lightNode(v, "beastkeeper.1");
  lightNode(v, "beastkeeper.2");
  assert.deepEqual(lightNode(v, "beastkeeper.3").said, ["gridCalmSeas"]);
});

test("every fight pays: glimmer waits for the Grid, up to a first visit's worth until it's found", () => {
  const w = freshWorld();
  assert.equal(earnLight(w, 900), 900);
  assert.equal(earnLight(w, 900), SEED_CAP, "waiting: a first visit's shopping trip at most");
  w.flags.gridSeen = true;
  assert.equal(earnLight(w, 90), SEED_CAP + 90, "found: every fight adds up");
  assert.equal(earnLight(w, -5), SEED_CAP + 90);
  // a playtest checkpoint has a first visit's worth from the lamp room on
  assert.equal(checkpoint("lamp").grid.light, CHECKPOINT_LIGHT);
  assert.equal(checkpoint("causeway").grid.light, 0);
  // the cheapest node anywhere first: every hero moves along
  const typical = spendTypically(found(), SEED_CAP);
  for (const cls of PARTY_ORDER) assert.ok(progressOf(typical, cls).lit >= 2, cls);
});

test("saves from before the Grid and the forge still load, with his glimmer waiting", () => {
  // a chapter 1 save (version 2): no Grid, no forge
  const old = { ...freshWorld(), version: 2, started: true, party: ["knight", "gunner"], flags: { woke: true }, items: [], shards: ["cove"] };
  delete old.grid;
  delete old.forge;
  const w = upgradeWorld(old, { glimmer: 840 });
  assert.equal(w.version, 3);
  assert.deepEqual(w.grid, { light: 840, lit: [], gates: [], at: {}, seen: 0 });
  assert.deepEqual(w.forge, { parts: 0, steps: {} });
  assert.deepEqual(w.party, ["knight", "gunner"]);
  assert.equal(upgradeWorld({ ...old }, { glimmer: 99999 }).grid.light, SEED_CAP);
  // already version 3: nothing more waits, whatever he's earned
  assert.equal(upgradeWorld({ ...w, grid: { ...w.grid, light: 10 } }, { glimmer: 5000 }).grid.light, 10);
  // a save from before versions (1): what he'd done carries across, and the glimmer waits
  const v1 = { started: true, scene: "temple", party: ["knight", "gunner", "spellwright"], items: [], shards: ["cove", "temple"], flags: {} };
  const u = upgradeWorld(v1, { glimmer: 200 });
  assert.equal(u.version, 3);
  assert.ok(u.flags.doorOpen && u.items.includes("pulley") && u.lessons.spellwright);
  assert.equal(u.grid.light, 200);
  // a new game
  assert.deepEqual(upgradeWorld(null), freshWorld());
  // and a broken Grid is made whole in place
  const broken = { grid: { light: "lots", lit: null }, forge: { parts: -3 } };
  assert.deepEqual(gridOf(broken), { light: 0, lit: [], gates: [], at: {}, seen: 0 });
  assert.equal(forgeOf(broken).parts, 0);
  assert.equal(seedLight(broken, 50), 50);
});

test("a skill gate opens when one child truly learns a skill on that hero's track, and stays open", () => {
  const gate = NODES["knight.gate"];
  const w = found(9999);
  // he's practiced, but not on three days yet
  const close = kid({ name: "A", answers: { "sub.2d": Array.from({ length: 10 }, () => [0, true]) } });
  const p = gateProgress(gate, [close]);
  assert.ok(!p.open);
  assert.deepEqual({ skill: p.closest.skill, right: p.closest.right, of: p.closest.of, days: p.closest.days }, { skill: "sub.2d", right: 10, of: 10, days: 1 });
  assert.deepEqual(openGates(w, [close]), []);
  // a hint in the last ten holds it back too
  const hinted = kid({ answers: { "sub.2d": [...learned().slice(0, 9), [2, true, true]] } });
  assert.ok(!gateProgress(gate, [hinted]).open);
  // nine of ten right with no hints, on three different days
  const him = kid({ name: "A", answers: { "sub.2d": [[0, false], ...learned().slice(1)] } });
  assert.equal(him.level("sub.2d"), "ontrack");
  assert.ok(gateProgress(gate, [him]).open);
  // a 1st grader opens it with her own grade's subtraction; a 3rd grader's easy rungs don't count
  const sister = kid({ name: "B", grade: 1, answers: { "sub.10": learned() } });
  assert.ok(gateProgress(gate, [sister]).open);
  assert.ok(!gateProgress(gate, [kid({ answers: { "sub.10": learned() } })]).open);
  assert.equal(SKILLS["sub.10"].grade, 1);
  // either child playing opens it, and the gate opens on the save for good
  assert.deepEqual(openGates(w, [close, sister]), ["knight.gate"]);
  assert.deepEqual(openGates(w, [close]), [], "it never shuts again");
  // the nodes behind it light like any other, once the road reaches the gate
  assert.equal(nodeState(w, "knight.gate"), "far");
  assert.equal(nodeState(w, "knight.g1"), "far");
  for (const id of ["knight.1", "knight.2", "knight.3", "knight.4"]) assert.ok(lightNode(w, id).ok, id);
  assert.ok(isLit(w, "knight.gate"));
  assert.equal(nodeState(w, "knight.g1"), "ready");
  // Tamsin's gate takes clocks or measuring
  assert.ok(gateProgress(NODES["beastkeeper.gate"], [kid({ answers: { "measure.mass": learned() } })]).open);
  assert.ok(gateProgress(NODES["beastkeeper.gate"], [kid({ answers: { "time.elapsed": learned() } })]).open);
  // nobody's tried yet: no nearest skill to show
  assert.equal(gateProgress(NODES["gunner.gate"], [kid()]).closest.of, 0);
});

test("in a fight: health, strength, speed, Overdrive and Titans from the Grid, and the forged weapon", () => {
  const w = found(9999);
  const base = boosts(w, "knight");
  assert.deepEqual(base, { maxHp: CLASSES.knight.hp, speed: CLASSES.knight.speed, power: 1, combo: 0, charge: 1, summon: 1, weapon: 0 });
  w.heroes.knight = { hp: 300, od: 40 };
  for (const id of ["knight.1", "knight.2", "knight.3", "knight.4", "knight.5"]) assert.ok(lightNode(w, id).ok, id);
  const b = boosts(w, "knight");
  assert.equal(b.maxHp, CLASSES.knight.hp + NODES["knight.1"].hp + NODES["knight.4"].hp);
  assert.equal(b.power, 1 + NODES["knight.2"].power);
  assert.equal(b.combo, 1);
  assert.equal(b.speed, CLASSES.knight.speed + 1);
  // a health node heals as much as it raises his health
  assert.equal(heroState(w, "knight").hp, 300 + NODES["knight.1"].hp + NODES["knight.4"].hp);
  assert.equal(heroState(w, "knight").max, maxHpOf(w, "knight"));
  rest(w);
  assert.equal(w.heroes.knight.hp, b.maxHp);
  // the forge's weapon adds to his strength, and lights its nodes on the chart
  w.forge.steps.knight = 1;
  assert.equal(boosts(w, "knight").power, Math.round((1 + NODES["knight.2"].power + WEAPON_POWER[1]) * 100) / 100);
  assert.equal(boosts(w, "knight").weapon, 1);
  assert.ok(isLit(w, "knight.w1") && !isLit(w, "knight.w2"));
  // Maren's Titans and the charge
  for (const id of ["titancaller.1", "titancaller.2", "titancaller.3"]) lightNode(w, id);
  assert.equal(boosts(w, "titancaller").summon, 1 + NODES["titancaller.3"].summon);
  for (const id of ["gunner.1", "gunner.2", "gunner.3", "gunner.4"]) lightNode(w, id);
  assert.equal(boosts(w, "gunner").charge, 1 + NODES["gunner.4"].charge);
  // a fight's start carries it all in chapter 2, and chapter 1's fights are as they were
  const start = battleStart(w);
  assert.deepEqual(start.knight, { hp: b.maxHp, od: 40, ...boosts(w, "knight") });
  const ch1 = checkpoint("lair");
  assert.deepEqual(battleStart(ch1).knight, { hp: CLASSES.knight.hp, od: 0 });
});

test("pets: Cade's slot comes with Rivet, the others open on the Grid, and Tamsin's nodes make them all stronger", () => {
  const w = found(9999);
  assert.ok(petSlotOpen(w, "knight"));
  for (const cls of ["gunner", "spellwright", "titancaller"]) {
    assert.ok(!petSlotOpen(w, cls), cls);
    lightNode(w, `${cls}.1`);
    assert.ok(petSlotOpen(w, cls), cls);
  }
  assert.equal(petPower(w), 1);
  lightNode(w, "beastkeeper.1");
  assert.equal(petPower(w), 1 + NODES["beastkeeper.1"].pets);
  w.pets.fizz = { owner: "gunner", stage: 1, notes: [] };
  assert.equal(battlePets(w).gunner.power, petPower(w));
  assert.match(about("gunner.1").text, /fight beside/);
});

test("the forge: parts from fiends and Hal, two steps for every weapon", () => {
  assert.equal(partsFor(["scrap_raptor", "volt_jelly"]), 2 * PARTS.small);
  assert.equal(partsFor(["barnacle_brute"]), PARTS.big);
  assert.equal(partsFor(["drain_engine", "nobody"]), PARTS.boss);
  assert.ok(FIENDS.barnacle_brute.hp >= 600 && FIENDS.scrap_raptor.hp < 600);
  const w = found();
  w.forge.parts = 0;
  assert.equal(weaponOf(w, "knight").step, 0);
  assert.deepEqual(nextStep(w, "knight"), { step: 1, ...WEAPONS.knight.steps[1], cost: FORGE_COST[1], power: WEAPON_POWER[1] });
  assert.deepEqual(forge(w, "knight"), { ok: false, why: "short", need: FORGE_COST[1] });
  assert.ok(!forgeReady(w));
  addParts(w, FORGE_COST[1]);
  assert.ok(forgeReady(w));
  assert.deepEqual(forge(w, "knight"), { ok: true, step: 1 });
  assert.equal(w.forge.parts, 0);
  assert.equal(weaponOf(w, "knight").name, WEAPONS.knight.steps[1].name);
  assert.equal(nodeState(w, "knight.w1"), "lit");
  addParts(w, FORGE_COST[2]);
  assert.deepEqual(forge(w, "knight"), { ok: true, step: 2 });
  assert.deepEqual(forge(w, "knight"), { ok: false, why: "done" });
  assert.equal(nextStep(w, "knight"), null);
  assert.ok(!forgeDone(w));
  for (const cls of PARTY_ORDER) w.forge.steps[cls] = 2;
  assert.ok(forgeDone(w));
  // the party he has with him
  assert.ok(forgeDone({ forge: { steps: { knight: 2 } } }, ["knight"]));
});

test("in his words: every node says what it does, and a gate says what opens it", () => {
  for (const id of Object.keys(NODES)) {
    const { title, text } = about(id);
    assert.ok(title && text, id);
    assert.ok(text.length < 140, `${id}: ${text}`);
    assert.ok(!/undefined|NaN/.test(title + text), id);
  }
  assert.match(about("knight.gate").text, /subtraction skills is truly learned: 9 of the last 10 right with no hints, on 3 different days/);
  assert.match(about("beastkeeper.gate").text, /clock or measuring/);
  assert.match(about("knight.w1").text, /Sword Master/);
  // the save's names
  assert.match(about("knight.1", () => "Sir Testalot").text, /^Sir Testalot/);
});
