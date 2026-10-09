import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SCENES, ITEMS, PARTY_ORDER, BOSS_FIGHT, WILD_SCALE } from "../src/world/data.js";
import {
  freshWorld,
  joinParty,
  lineup,
  giveItem,
  takeItem,
  hasItem,
  addShard,
  encounterOptions,
  wildEncounter,
  walkFor,
  grace,
  inside,
  clampTo,
  stepToward,
  checkpoint,
  SHARDS,
} from "../src/world/state.js";
import { CONVOS, SCRIPTS, USES, EXITS, ARRIVE, VISIBLE, SPARKLE, WILD_INTRO, storyLines } from "../src/world/story.js";
import { dialPuzzle, calibratePuzzle, cagePuzzle, signPuzzle, shrinePuzzle } from "../src/world/puzzles.js";
import { createMastery } from "../src/learn/mastery.js";
import { SKILLS } from "../src/learn/skills.js";
import { FIENDS } from "../src/battle/data.js";
import { createRng } from "../src/util/rng.js";

const hotKeys = new Set(Object.entries(SCENES).flatMap(([id, s]) => s.hotspots.map((h) => `${id}.${h.id}`)));

test("the party joins in story order, and fights three at a time", () => {
  const w = freshWorld();
  assert.deepEqual(w.party, ["knight"]);
  assert.deepEqual(lineup(w), { party: ["knight"], reserve: null });
  joinParty(w, "gunner");
  joinParty(w, "spellwright");
  joinParty(w, "spellwright");
  assert.deepEqual(w.party, ["knight", "spellwright", "gunner"]);
  joinParty(w, "titancaller");
  assert.deepEqual(lineup(w), { party: ["knight", "spellwright", "gunner"], reserve: "titancaller" });
  joinParty(w, "nobody");
  assert.equal(w.party.length, 4);
  assert.deepEqual(PARTY_ORDER, ["knight", "spellwright", "gunner", "titancaller"]);
});

test("items and shards", () => {
  const w = freshWorld();
  giveItem(w, "rubbery_fish");
  giveItem(w, "rubbery_fish");
  assert.deepEqual(w.items, ["rubbery_fish"]);
  assert.ok(hasItem(w, "rubbery_fish"));
  takeItem(w, "rubbery_fish");
  assert.ok(!hasItem(w, "rubbery_fish"));
  for (const id of [...SHARDS, "cove", "bogus"]) addShard(w, id);
  assert.deepEqual(w.shards, SHARDS);
});

test("alone, the Knight only meets one fiend at a time, and only ones he can hurt", () => {
  const w = freshWorld();
  for (const id of Object.keys(SCENES)) {
    for (const e of encounterOptions(id, w)) {
      assert.equal(e.fiends.length, 1, `${id}: ${e.fiends}`);
      for (const f of e.fiends) assert.ok(!["slime", "flier"].includes(FIENDS[f].type), `${id}: the Knight alone vs ${f}`);
    }
  }
  assert.ok(encounterOptions("cove", w).length > 0, "the cove has fights from the start");
});

test("wild fights are scaled to the party and ready for battle", () => {
  const rng = createRng(3);
  const w = freshWorld();
  const solo = wildEncounter("cove", w, rng);
  assert.deepEqual(solo.party, ["knight"]);
  assert.deepEqual(solo.scale, WILD_SCALE[1]);
  assert.ok(CONVOS[solo.introLine], solo.introLine);
  joinParty(w, "spellwright");
  joinParty(w, "gunner");
  for (let i = 0; i < 40; i++) {
    const e = wildEncounter("canyon", w, rng);
    assert.ok(e.fiends.every((f) => FIENDS[f] && !FIENDS[f].boss));
    assert.ok(e.fiends.length <= 3);
    assert.deepEqual(e.scale, WILD_SCALE[3]);
  }
  for (const s of Object.values(SCENES)) for (const e of s.encounters) for (const f of e.fiends) assert.ok(FIENDS[f], f);
  assert.ok(FIENDS[BOSS_FIGHT.fiends[0]].boss);
});

test("fiends jump out after some walking, never right after a fight", () => {
  const rng = createRng(5);
  const w = freshWorld();
  let steps = 0;
  while (!walkFor(w, 10, rng)) steps += 1;
  assert.ok(steps * 10 >= 2200 && steps * 10 <= 3600, `${steps * 10} px`);
  grace(w, rng, 900);
  assert.ok(w.toNext >= 900);
  assert.equal(walkFor(w, 800, rng), false);
});

test("walking stays inside the walkable area", () => {
  const poly = SCENES.cove.walk;
  assert.ok(inside([600, 600], poly));
  assert.ok(!inside([600, 200], poly));
  const c = clampTo([600, 200], poly);
  assert.ok(inside(c, poly), `${c}`);
  let p = [600, 600];
  for (let i = 0; i < 200; i++) p = stepToward(p, [600, 100], 8, poly).pos;
  assert.ok(inside(p, poly) && p[1] < 445, `slid to the top edge: ${p}`);
  const r = stepToward([600, 600], [610, 600], 50, poly);
  assert.ok(r.arrived);
  for (const [id, s] of Object.entries(SCENES)) assert.ok(inside(s.start, s.walk) || inside(clampTo(s.start, s.walk), s.walk), id);
});

test("every exit leads somewhere real, and arrives somewhere walkable", () => {
  for (const [id, s] of Object.entries(SCENES)) {
    for (const h of s.hotspots) {
      if (!h.exit) continue;
      const to = SCENES[h.exit.to];
      assert.ok(to, `${id}.${h.id} → ${h.exit.to}`);
      assert.ok(inside(clampTo(h.exit.at, to.walk), to.walk));
      // arriving must not stand him inside the next scene's edge exit
      for (const e of to.hotspots.filter((x) => x.edge)) {
        const near = e.edge === "left" ? h.exit.at[0] < e.x + 40 : h.exit.at[0] > e.x - 40;
        assert.ok(!near, `${id}.${h.id} arrives on ${h.exit.to}.${e.id}`);
      }
    }
  }
});

test("everything he can click is somewhere the camera can show it", () => {
  // The explore camera shows the floor from about x -180 to 1460 when panned
  // all the way, and the foreground layer can cover the last 110 px at either
  // end, so a prop or person has to sit inside -70..1350 to be seen whole.
  // (The Geode Titan's lair once sat at 1420, half off screen behind a pillar.)
  for (const [id, s] of Object.entries(SCENES)) {
    for (const hot of s.hotspots) {
      if (hot.edge || hot.area) continue;
      const half = hot.size[0] / 2;
      assert.ok(hot.x - half >= -70 && hot.x + half <= 1350, `${id}.${hot.id} (${hot.x - half}..${hot.x + half}) is partly off screen`);
    }
  }
});

test("playtest checkpoints match the story", () => {
  assert.equal(checkpoint("nowhere"), null);
  const temple = checkpoint("temple");
  assert.equal(temple.scene, "temple");
  assert.deepEqual(temple.party, ["knight"]);
  assert.deepEqual(temple.shards, ["cove"]);
  assert.ok(VISIBLE["temple.spellwright"](temple) && VISIBLE["temple.cage"](temple));
  const canyon = checkpoint("canyon");
  assert.deepEqual(canyon.party, ["knight", "spellwright"]);
  assert.ok(canyon.flags.gateOpen && !canyon.shards.includes("canyon"));
  const maren = checkpoint("maren");
  assert.deepEqual(maren.party, ["knight", "spellwright", "gunner"]);
  assert.ok(VISIBLE["canyon.titancaller"](maren) && SPARKLE["canyon.titancaller"](maren), "Maren waits, glowing");
  assert.ok(!SPARKLE["canyon.lair"](maren), "the lair doesn't glow until she joins");
  const lair = checkpoint("lair");
  assert.deepEqual(lair.party, PARTY_ORDER);
  assert.deepEqual(lair.shards, ["cove", "temple", "canyon"]);
  assert.ok(SPARKLE["canyon.lair"](lair), "the lair glows: it's what to do next");
  for (const w of [temple, canyon, maren, lair]) assert.ok(inside(w.pos, SCENES[w.scene].walk), w.scene);
});

test("the story only talks about things that exist", () => {
  for (const key of [...Object.keys(SCRIPTS), ...Object.keys(USES), ...Object.keys(EXITS), ...Object.keys(VISIBLE), ...Object.keys(SPARKLE)]) assert.ok(hotKeys.has(key), key);
  for (const id of Object.keys(ARRIVE)) assert.ok(SCENES[id], id);
  for (const uses of Object.values(USES)) for (const item of Object.keys(uses)) assert.ok(ITEMS[item], item);
  // every conversation the code asks for is written
  const src = fs.readFileSync(new URL("../src/world/story.js", import.meta.url), "utf8") + fs.readFileSync(new URL("../src/ui/explore.js", import.meta.url), "utf8");
  const asked = new Set();
  for (const m of src.matchAll(/(?:api\.say|once)\(([^;]*?)\)(?=;|\n|,\s*$)/gm)) {
    const args = m[1].replace(/(?:includes|has)\("\w+"\)|===? "\w+"/g, ""); // conditions, not conversation ids
    for (const q of args.matchAll(/"(\w+)"/g)) asked.add(q[1]);
  }
  for (const m of src.matchAll(/\[\s*"(noUse\w*)"/g)) asked.add(m[1]);
  for (const id of Object.values(WILD_INTRO)) asked.add(id);
  ["noUse", "noUse2", "noUseFish", "fellBack", "wildMany", "prologue", "wake", "ending"].forEach((id) => asked.add(id));
  const flags = new Set([...src.matchAll(/once\(api, "(\w+)"/g)].map((m) => m[1]));
  for (const id of asked) if (!flags.has(id)) assert.ok(CONVOS[id], `missing conversation "${id}"`);
});

test("every line has a known speaker and mood, and reads well aloud", () => {
  const speakers = ["narrator", "kit", "knight", "gunner", "spellwright", "titancaller", "jumble"];
  const moods = ["neutral", "laughing", "angry", "shocked", "smug", "worried"];
  for (const [id, lines] of Object.entries(CONVOS)) {
    assert.ok(lines.length, id);
    for (const l of lines) {
      assert.ok(speakers.includes(l.who), `${id}: ${l.who}`);
      assert.ok(moods.includes(l.mood), `${id}: ${l.mood}`);
      assert.ok(l.text.length <= 210, `${id}: too long for the box: ${l.text}`);
      assert.doesNotMatch(l.text, /\$\{|undefined/, l.text);
    }
  }
  assert.equal(storyLines().length, Object.values(CONVOS).reduce((n, l) => n + l.length, 0));
});

test("puzzles are real problems, tagged with Utah skills, inside grade-3 limits", () => {
  const rng = createRng(11);
  const mastery = createMastery({});
  for (let i = 0; i < 60; i++) {
    for (const tier of [1, 2]) {
      const d = dialPuzzle({ mastery, rng, tier });
      assert.ok(SKILLS[d.skill], d.skill);
      assert.ok(d.problem.a <= 999 && d.problem.b <= d.problem.a && d.problem.answer >= 0);
      assert.ok(d.grade(d.answerText).correct);
      assert.ok(!d.grade(String(d.problem.answer + 1)).correct);
      const c = calibratePuzzle({ mastery, rng, tier, row: 2 });
      assert.ok(SKILLS[c.skill], c.skill);
      assert.ok(c.grade(c.answerText).correct);
      assert.ok(c.problem.answer <= 100 || c.skill === "mul.tens", `${c.skill}: ${c.problem.answer}`);
      const g = cagePuzzle({ mastery, rng, tier, bar: 1 });
      assert.ok(SKILLS[g.skill], g.skill);
      assert.equal(g.panel.kind, "tiles");
      assert.ok(g.grade(g.answerText).correct);
      assert.deepEqual([...g.task.tiles].filter((ch) => !g.task.decoys.includes(ch) || g.task.word.includes(ch)).length >= g.task.word.length, true);
    }
  }
  const s = signPuzzle({ rng });
  assert.equal(s.answerText, "temple");
  assert.deepEqual(s.task.tiles, ["p", "e", "l", "m", "e", "t"]);
  assert.ok(SKILLS[s.skill], s.skill);
  assert.ok(s.grade("TEMPLE").correct);
  assert.ok(!s.grade("pelmet").correct);
  const sh = shrinePuzzle();
  assert.equal(sh.skill, "write.sentence");
  assert.ok(sh.grade("The turquoise sea roared like a giant lion against the rocks.").correct);
  assert.ok(!sh.grade("The sea is nice and big and good.").correct);
});
