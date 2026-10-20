import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlayers, freshPlayer, normalizePlayers, pickTurn, countTurn, gradeFor, playerName } from "../src/learn/players.js";
import { createMastery } from "../src/learn/mastery.js";
import { LADDERS, SKILLS, STARTING_GUESS, startingGuess } from "../src/learn/skills.js";
import { makeQuestion, GUN_BASE, youngPotion } from "../src/battle/questions.js";
import { spellDamage } from "../src/learn/spelling.js";
import { createRng } from "../src/util/rng.js";

const DAY = 86400000;
const saveWith = (players, playing = players.map((p) => p.id)) => normalizePlayers({ players, playing });

test("every skill knows its grade, and the new rungs sit at the bottom of each ladder", () => {
  for (const [id, s] of Object.entries(SKILLS)) assert.ok([1, 2, 3].includes(s.grade), `${id}: ${s.grade}`);
  for (const [track, ladder] of Object.entries(LADDERS)) {
    const first3 = ladder.findIndex((id) => SKILLS[id].grade === 3);
    assert.ok(first3 > 0, `${track} has rungs below 3rd grade`);
    assert.ok(ladder.slice(0, first3).every((id) => SKILLS[id].grade < 3), `${track}: lower rungs come first`);
  }
});

test("a 3rd grader starts exactly where he did before grades existed", () => {
  for (const [id, p] of Object.entries(STARTING_GUESS)) assert.equal(startingGuess(id, 3), p, id);
  const before = createMastery({}, { now: () => 0 });
  for (const ladder of Object.values(LADDERS)) {
    const t = before.pickTiers(ladder);
    assert.equal(SKILLS[t[2].skill].grade, 3, `${t[2].skill}: ★★ stays on a 3rd-grade rung`);
  }
  assert.equal(before.pickTiers(LADDERS.sub)[2].skill, "sub.2d.regroup");
});

test("a grade per subject sets where ★★ starts", () => {
  const at = (track, grade) => createMastery({}, { now: () => 0, gradeOf: () => grade }).pickTiers(LADDERS[track])[2].skill;
  assert.equal(at("sub", 1), "sub.10");
  assert.equal(at("add", 2), "add.facts");
  assert.equal(at("mul", 1), "mul.count10");
  assert.equal(at("mul", 2), "mul.skip");
  assert.equal(at("spell", 1), "spell.short");
  assert.equal(at("spell", 2), "spell.compound");
  assert.equal(at("write", 1), "write.pick");
  assert.equal(at("write", 2), "write.own");
  assert.equal(at("sub", 0), "sub.10", "kindergarten starts at the very bottom");
  assert.equal(SKILLS[at("mul", 4)].grade, 3, "a 4th grader starts high on the 3rd-grade rungs");
  assert.ok(LADDERS.mul.indexOf(at("mul", 4)) > LADDERS.mul.indexOf("mul.easy"));
});

test("she still climbs above her grade when she's ahead", () => {
  let clock = 0;
  const m = createMastery({}, { now: () => clock, gradeOf: () => 1 });
  for (let i = 0; i < 40; i++) {
    const s = m.pickTiers(LADDERS.add)[2].skill;
    clock += DAY / 4;
    m.record(s, { correct: true, tier: 2, ms: 1500 });
  }
  assert.ok(SKILLS[m.pickTiers(LADDERS.add)[2].skill].grade >= 2);
});

test("★ never reviews rungs a 3rd grader has only been assumed to know", () => {
  const m = createMastery({}, { now: () => 0 });
  for (let seed = 1; seed < 40; seed++) {
    const t = m.pickTiers(LADDERS.mul, createRng(seed));
    assert.ok(!["mul.count10", "mul.skip", "mul.groups"].includes(t[1].skill), t[1].skill);
  }
});

test("a save from before players keeps his progress as the first player", () => {
  const skills = { "sub.2d": { a: [[0, 1, 2, 0, 900]], n: 1, k: 1 } };
  const s = normalizePlayers({ mastery: { skills } });
  assert.equal(s.players.length, 1);
  assert.deepEqual(s.players[0].mastery.skills, skills);
  assert.deepEqual(s.playing, [s.players[0].id]);
  assert.equal(gradeFor(s.players[0], "sub"), 3);
  assert.equal(playerName(s.players, s.players[0].id), "Player 1");
  // a stale playing list falls back to someone real
  assert.deepEqual(normalizePlayers({ players: [freshPlayer("p1")], playing: ["p9"] }).playing, ["p1"]);
});

test("together, the turn passes every time, and the balancer evens out a subject", () => {
  const playing = ["p1", "p2"];
  assert.equal(pickTurn({ playing: ["p1"], last: "p1", track: "sub" }), "p1", "alone, always yours");
  assert.equal(pickTurn({ playing, last: null, track: "sub" }), "p1");
  assert.equal(pickTurn({ playing, last: "p1", track: "sub" }), "p2");
  assert.equal(pickTurn({ playing, last: "p2", track: "sub" }), "p1");
  // p1 has had spelling twice more than p2: p2 gets it even though p1 is next
  assert.equal(pickTurn({ playing, last: "p2", counts: { p1: { spell: 4 }, p2: { spell: 2 } }, track: "spell" }), "p2");
  assert.equal(pickTurn({ playing, last: "p2", counts: { p1: { spell: 3 }, p2: { spell: 2 } }, track: "spell" }), "p1");
  const counts = {};
  for (let i = 0; i < 10; i++) countTurn(counts, "p1", "mul", playing);
  assert.equal(counts.p1.mul, 3, "never more than a few turns ahead");
});

test("three heroes and two children: over a fight, each child gets every subject", () => {
  const save = saveWith([freshPlayer("p1"), freshPlayer("p2", { grade: 1 })]);
  const players = createPlayers(() => save, { now: () => 0 });
  const got = { p1: new Set(), p2: new Set() };
  const order = ["sub", "mul", "spell"];
  for (let turn = 0; turn < 12; turn++) {
    const track = order[turn % 3];
    got[players.beginTurn(track).id].add(track);
  }
  assert.deepEqual([...got.p1].sort(), ["mul", "spell", "sub"]);
  assert.deepEqual([...got.p2].sort(), ["mul", "spell", "sub"]);
});

test("each child's answers go to their own mastery and their own grade", () => {
  const save = saveWith([freshPlayer("p1"), freshPlayer("p2", { grade: 1 })]);
  const players = createPlayers(() => save, { now: () => 0 });
  assert.equal(players.together, true);
  const him = players.beginTurn("sub");
  assert.equal(him.id, "p1");
  assert.equal(players.pickTiers(LADDERS.sub)[2].skill, "sub.2d.regroup");
  assert.equal(players.badge().name, "Player 1");
  players.record("sub.2d", { correct: true });
  const her = players.beginTurn("sub");
  assert.equal(her.id, "p2");
  assert.equal(players.pickTiers(LADDERS.sub)[2].skill, "sub.10");
  assert.equal(players.gradeOf("sub"), 1);
  players.record("sub.10", { correct: true });
  players.saveInto(save);
  assert.deepEqual(Object.keys(save.players[0].mastery.skills), ["sub.2d"]);
  assert.deepEqual(Object.keys(save.players[1].mastery.skills), ["sub.10"]);
  assert.equal(save.mastery, save.players[0].mastery, "older builds still find his progress");
  assert.equal(players.totalRight(), 2);
  // alone: no badge, and the turn never moves
  save.playing = ["p2"];
  assert.equal(players.badge(), null);
  assert.equal(players.beginTurn("mul").id, "p2");
  assert.equal(players.beginTurn("mul").id, "p2");
});

const ctx = (grades) => ({ rng: createRng(5), grades: { sub: grades, add: grades, mul: grades, spell: grades, write: grades } });
const fiend = { id: "scrap_raptor", uid: "f1", name: "Scrap Raptor", type: "normal", hp: 420, maxHp: 420 };

test("below 3rd grade the Knight gets a plain problem, and the stars size the hit", () => {
  const q = makeQuestion({ cls: "knight", tier: 3, skill: "sub.10", target: fiend, ctx: ctx(1) });
  assert.equal(q.skill, "sub.10");
  assert.ok(q.problem.a <= 10);
  assert.ok(!q.knight, "her answer isn't the fiend's HP");
  const low = makeQuestion({ cls: "knight", tier: 1, skill: "sub.10", target: fiend, ctx: ctx(1) });
  assert.ok(q.damageTo(fiend, { half: false }) > low.damageTo(fiend, { half: false }) * 2);
  // his strike is unchanged: the HP math itself
  assert.equal(makeQuestion({ cls: "knight", tier: 2, skill: "sub.3d", target: fiend, ctx: ctx(3) }).knight, true);
});

test("a 1st grader's ★★★ hits as hard as a 3rd grader's", () => {
  const gun = makeQuestion({ cls: "gunner", tier: 3, skill: "mul.groups", target: fiend, ctx: ctx(2) });
  assert.equal(gun.panel.equation.split("+").length, gun.problem.a);
  assert.equal(gun.damageTo({ type: "x" }, { half: false }) >= GUN_BASE[3], true);
  const cat = { word: "cat", pattern: "short" };
  const castle = { word: "castle", pattern: "cle" };
  assert.ok(spellDamage(cat, 3) >= spellDamage(castle, 3));
});

test("below 3rd grade in writing, the ladder picks the kind of lash", () => {
  const pick = makeQuestion({ cls: "titancaller", tier: 1, skill: "write.pick", target: fiend, ctx: ctx(1) });
  assert.equal(pick.panel.kind, "choice");
  assert.equal(pick.panel.choices.length, 2);
  const finish = makeQuestion({ cls: "titancaller", tier: 2, skill: "write.finish", target: fiend, ctx: ctx(1) });
  assert.match(finish.panel.ask, /Scrap Raptor/);
  assert.equal(finish.grade("fast").correct, true);
  assert.equal(finish.grade("zzzz").correct, false);
  const own = makeQuestion({ cls: "titancaller", tier: 3, skill: "write.own", target: fiend, ctx: ctx(2) });
  assert.equal(own.grade("It is red").correct, true);
  assert.equal(own.grade("red").correct, false);
  // his stars still choose, whatever skill comes in
  assert.equal(makeQuestion({ cls: "titancaller", tier: 2, skill: "write.pick", target: fiend, ctx: ctx(3) }).skill, "write.words");
});

test("below 3rd grade a potion is mixed with a plain sum, and heals like his", () => {
  const p = youngPotion(100, 380, "add.10", createRng(3));
  assert.equal(p.skill, "add.10");
  assert.ok(p.answer <= 10 && p.heal >= 60 && p.heal <= 280);
  assert.equal(youngPotion(378, 380, "add.10", createRng(3)), null, "nearly full: no potion");
});

test("a grown-up's focus skills come up far more often, and only for that child", () => {
  const save = normalizePlayers({ players: [freshPlayer("p1"), freshPlayer("p2", { grade: 1 })], playing: ["p1"] });
  save.players[0].focus = ["sub.3d.regroup", "spell.prefix", "nope", "sub.3d.regroup"];
  normalizePlayers(save);
  assert.deepEqual(save.players[0].focus, ["sub.3d.regroup", "spell.prefix"]); // unknown ids and repeats dropped
  const players = createPlayers(() => save, { now: () => 0 });
  const rng = createRng(7);
  let star = 0;
  let twoStar = 0;
  for (let i = 0; i < 200; i++) {
    const t = players.pickTiers(LADDERS.sub, rng);
    if (t[1].skill === "sub.3d.regroup") star++;
    if (t[2].skill === "sub.3d.regroup") twoStar++;
  }
  assert.equal(star, 200);
  assert.ok(twoStar > 70 && twoStar < 130, `★★ about half the time, got ${twoStar}`);
  // other ladders and other children are untouched
  assert.notEqual(players.pickTiers(LADDERS.mul, createRng(7))[1].focus, true);
  save.playing = ["p2"];
  players.beginTurn("sub");
  assert.notEqual(players.pickTiers(LADDERS.sub, createRng(7))[1].skill, "sub.3d.regroup");
});

test("focus choices stop at the child's grade in that subject", async () => {
  const { focusChoices } = await import("../src/learn/players.js");
  const younger = freshPlayer("p2", { grade: 1 });
  assert.ok(focusChoices(younger, "addsub").every((id) => SKILLS[id].grade <= 1));
  assert.ok(focusChoices(younger, "addsub").includes("sub.10"));
  assert.ok(focusChoices(freshPlayer("p1"), "spell").includes("spell.prefix"));
  assert.ok(!focusChoices(younger, "spell").includes("spell.prefix"));
});
