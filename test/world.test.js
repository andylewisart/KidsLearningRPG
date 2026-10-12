import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SCENES, ITEMS, PARTY_ORDER, BOSS_FIGHT, WILD_SCALE, MAP, POTIONS } from "../src/world/data.js";
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
  heroState,
  battleStart,
  afterBattle,
  rest,
  partyHealth,
  overdriveLesson,
  reachable,
  routeTo,
  placeOf,
  SHARDS,
} from "../src/world/state.js";
import { CONVOS, SCRIPTS, USES, EXITS, ARRIVE, VISIBLE, SPARKLE, WILD_INTRO, storyLines } from "../src/world/story.js";
import { dialPuzzle, doorPuzzle, calibratePuzzle, cagePuzzle, signPuzzle, shrinePuzzle } from "../src/world/puzzles.js";
import { createMastery } from "../src/learn/mastery.js";
import { SKILLS } from "../src/learn/skills.js";
import { FIENDS, CLASSES } from "../src/battle/data.js";
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
    // arriving from the island map: walkable, and not standing in an edge exit
    if (s.fromMap) {
      assert.ok(inside(s.fromMap, s.walk), `${id}.fromMap`);
      for (const e of s.hotspots.filter((x) => x.edge)) {
        const near = e.edge === "left" ? s.fromMap[0] < e.x + 40 : s.fromMap[0] > e.x - 40;
        assert.ok(!near, `${id}.fromMap arrives on ${e.id}`);
      }
    }
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
  assert.ok(VISIBLE["temple_hall.spellwright"](temple) && VISIBLE["temple_hall.cage"](temple), "Knox is still caged in the hall");
  const canyon = checkpoint("canyon");
  assert.deepEqual(canyon.party, ["knight", "spellwright"]);
  assert.ok(canyon.flags.gateOpen && !canyon.shards.includes("canyon"));
  const maren = checkpoint("maren");
  assert.deepEqual(maren.party, ["knight", "spellwright", "gunner"]);
  assert.equal(maren.scene, "grotto");
  assert.ok(VISIBLE["grotto.titancaller"](maren) && SPARKLE["grotto.titancaller"](maren), "Maren waits by her shrine, glowing");
  assert.ok(!SPARKLE["canyon.lair"](maren), "the lair doesn't glow until she joins");
  const lair = checkpoint("lair");
  assert.deepEqual(lair.party, PARTY_ORDER);
  assert.deepEqual(lair.shards, ["cove", "temple", "canyon"]);
  assert.ok(SPARKLE["canyon.lair"](lair), "the lair glows: it's what to do next");
  const wren = checkpoint("wren");
  assert.equal(wren.scene, "canyon");
  assert.deepEqual(wren.party, ["knight", "spellwright"]);
  assert.ok(wren.flags.gotCell && wren.flags.calibrated === 2 && !hasItem(wren, "power_cell") && !hasItem(wren, "rubbery_fish"));
  const ending = checkpoint("ending");
  assert.equal(ending.scene, "canyon");
  assert.deepEqual(ending.shards, ["cove", "temple", "canyon", "lair"]);
  assert.ok(!ending.finished, "the ending hasn't played yet");
  for (const w of [temple, canyon, wren, maren, lair, ending]) assert.ok(inside(w.pos, SCENES[w.scene].walk), w.scene);
});

/**
 * Plays a hotspot's script with a stand-in for the explore screen; returns what happened, in order.
 * `pick` is the choice he makes whenever he's given one (0: the first).
 */
async function playScript(key, w, { solve = () => true, won = true, resuming = false, pick = 0 } = {}) {
  const log = [];
  const api = {
    world: w,
    resumingFight: resuming,
    has: (id) => hasItem(w, id),
    say: async (id) => log.push(`say ${id}`),
    puzzle: async (id) => (log.push(`puzzle ${id}`), solve()),
    save() {},
    take: (id) => takeItem(w, id),
    give: async (id) => (giveItem(w, id), log.push(`give ${id}`)),
    shard: async (id) => (addShard(w, id), log.push(`shard ${id}`)),
    join: async (id) => (joinParty(w, id), log.push(`join ${id}`)),
    ambush: async (fiends) => (log.push(`ambush ${fiends.join("+")}`), { won }),
    zipMap: async (from, to) => log.push(`zip ${from}>${to}`),
    choose: async () => pick,
    battle: async () => (log.push("battle"), { won }),
    ending: async () => log.push("ending"),
    wait: async () => {},
    sfx() {},
    flash() {},
  };
  await SCRIPTS[key](api);
  return log;
}

test("stepping away from Wren's calibrating, then coming back, picks it up again", async () => {
  const w = checkpoint("canyon");
  Object.assign(w.flags, { metGunner: true, traded: true });
  giveItem(w, "power_cell");
  // he hands her the cell, then steps away from the first row
  assert.deepEqual(await playScript("canyon.gunner", w, { solve: () => null }), ["say gunnerCell", "puzzle calibrate", "say calibrateWait"]);
  assert.ok(w.flags.gotCell && !hasItem(w, "power_cell"));
  // clicking her again goes back to calibrating, and three rows later she joins
  const log = await playScript("canyon.gunner", w);
  assert.deepEqual(log.slice(0, 2), ["say gunnerBack", "puzzle calibrate"]);
  assert.ok(log.includes("say threeShards") && log.includes("join gunner"));
  assert.equal(log.filter((x) => x === "puzzle calibrate").length, 3);
  // the "wren" checkpoint is one row from the same ending
  const cp = checkpoint("wren");
  const quick = await playScript("canyon.gunner", cp);
  assert.equal(quick.filter((x) => x === "puzzle calibrate").length, 1);
  // she joins, drones test her blaster (her Overdrive's first fight), and only then the quiet: the singing
  const at = (x) => quick.indexOf(x);
  assert.ok(at("join gunner") < at("ambush dominion_drone+volt_jelly") && at("ambush dominion_drone+volt_jelly") < at("say hearSong"), quick.join(" > "));
  // lose that fight, and the singing waits for the rope
  const lost = await playScript("canyon.gunner", checkpoint("wren"), { won: false });
  assert.ok(!lost.includes("say hearSong"));
  const w2 = checkpoint("wren");
  await playScript("canyon.gunner", w2, { won: false });
  const rope = await playScript("canyon.chasm", w2);
  assert.equal(rope[0], "say hearSong");
});

test("the Geode Titan falls: the last shard, then the ending, which he can watch again", async () => {
  const w = checkpoint("lair");
  assert.deepEqual((await playScript("canyon.lair", w)).slice(-4), ["battle", "say lairWon", "shard lair", "ending"]);
  // the game closed before the ending was over: arriving in the canyon plays it
  const log = [];
  await ARRIVE.canyon({ world: checkpoint("ending"), ending: async () => log.push("ending"), say: async (id) => log.push(`say ${id}`), save() {} });
  assert.deepEqual(log, ["ending"]);
  // once it's over, the lair offers it again
  w.finished = true;
  assert.deepEqual(await playScript("canyon.lair", w), ["say lairDone", "ending"]);
  // and every line the ending times something to is there
  const cues = Object.values(CONVOS).flat().filter((l) => l.cue).map((l) => l.cue);
  assert.deepEqual(cues.sort(), ["dark", "fuse", "hat", "wave"]);
});

test("the game closed during the Geode Titan: Continue goes straight back into the fight, then on with the story", async () => {
  const w = checkpoint("lair");
  // the first time: Kit's warning, "Let's go!", then the fight
  assert.deepEqual((await playScript("canyon.lair", w, { won: false })).slice(0, 3), ["say lairReady", "say lairGo", "battle"]);
  // picked back up: no lead-up, and winning still gives the last shard and the ending
  assert.deepEqual(await playScript("canyon.lair", checkpoint("lair"), { resuming: true }), ["battle", "say lairWon", "shard lair", "ending"]);
});

test("the first walk into the lair is Cade's rule twelve; later tries say it in one line", async () => {
  const w = checkpoint("lair");
  // "Not yet." doesn't use up the first time
  assert.deepEqual(await playScript("canyon.lair", w, { pick: 1 }), ["say lairReady"]);
  // in for the first time, and beaten back
  assert.deepEqual(await playScript("canyon.lair", w, { won: false }), ["say lairReady", "say lairGo", "battle", "say lairLost"]);
  // the next try (and every one after): one line, then the fight
  assert.deepEqual(await playScript("canyon.lair", w, { won: false }), ["say lairReady", "say lairAgain", "battle", "say lairLost"]);
  assert.deepEqual(await playScript("canyon.lair", w), ["say lairReady", "say lairAgain", "battle", "say lairWon", "shard lair", "ending"]);
  // a fight picked back up after a first try skips the talk too
  const back = checkpoint("lair");
  back.flags.lairTried = true;
  assert.deepEqual((await playScript("canyon.lair", back, { resuming: true }))[0], "battle");
  // both ways in end on why Maren's Overdrive is already full when the fight starts
  assert.deepEqual(CONVOS.lairGo.slice(-2), CONVOS.lairAgain.slice(-2));
  assert.match(CONVOS.lairGo.at(-1).text, /Overdrive/);
  assert.match(CONVOS.lairGo[0].text, /rule twelve/, "it pays off the deck's rule twelve");
});

test("the stories he finds by looking are told in full once they can be, then in one line", async () => {
  // Knox's empty seat, at the mural
  const hall = checkpoint("temple");
  assert.deepEqual(await playScript("temple_hall.mural", hall), ["say mural"], "Knox is still in his cage: Kit has a look");
  assert.ok(!SPARKLE["temple_hall.mural"](hall));
  joinParty(hall, "spellwright");
  assert.ok(SPARKLE["temple_hall.mural"](hall), "the mural glints once Knox is with him");
  assert.deepEqual(await playScript("temple_hall.mural", hall), ["say muralSeat"]);
  assert.ok(!SPARKLE["temple_hall.mural"](hall), "told: no more glint");
  assert.deepEqual(await playScript("temple_hall.mural", hall), ["say muralRead"]);
  assert.deepEqual(await playScript("temple_hall.mural", hall), ["say muralRead"]);

  // Wren's ship: not before Maren joins, so the song's stretch stays quiet
  assert.deepEqual(await playScript("canyon.airship", checkpoint("canyon")), ["say airship"], "before Wren is found");
  const song = checkpoint("maren");
  assert.deepEqual(await playScript("canyon.airship", song), ["say airshipSad"]);
  assert.ok(!song.flags.wrenStory && !SPARKLE["canyon.airship"](song));
  const lair = checkpoint("lair");
  assert.ok(SPARKLE["canyon.airship"](lair));
  assert.deepEqual(await playScript("canyon.airship", lair), ["say airshipStory"]);
  assert.deepEqual(await playScript("canyon.airship", lair), ["say airshipSad"]);
  assert.ok(!SPARKLE["canyon.airship"](lair));

  // Maren's island, at the sea
  const grotto = checkpoint("maren");
  assert.deepEqual(await playScript("grotto.sea", grotto), ["say seaSong"], "while she sings, nobody jokes");
  grotto.flags.metCaller = true;
  assert.deepEqual(await playScript("grotto.sea", grotto), ["say sea"], "met, but she hasn't joined yet");
  assert.ok(!grotto.flags.marenStory);
  joinParty(grotto, "titancaller");
  assert.ok(SPARKLE["grotto.sea"](grotto));
  assert.deepEqual(await playScript("grotto.sea", grotto), ["say seaStory"]);
  assert.deepEqual(await playScript("grotto.sea", grotto), ["say sea"]);
  assert.ok(!SPARKLE["grotto.sea"](grotto));

  // the mural and the wreck open on the line their later looks repeat
  assert.equal(CONVOS.muralSeat[0].text, CONVOS.muralRead[0].text);
  assert.equal(CONVOS.airshipStory[0].text, CONVOS.airshipSad[0].text);
  // a playtest checkpoint hasn't heard any of them yet
  for (const cp of ["temple", "canyon", "wren", "maren", "lair", "ending"]) {
    const f = checkpoint(cp).flags;
    assert.ok(!f.muralStory && !f.wrenStory && !f.marenStory && !f.lairTried, cp);
  }
});

test("the opening: faces before the crash, his own answer lights the crystal, then sunrise", () => {
  const keys = ["prologue", "prologueDeck", "prologueJumble", "prologueRam", "prologueShards", "wake"];
  for (const k of keys) assert.ok(CONVOS[k]?.length, k);
  // a line of narration to open, and one as the shards come down
  for (const k of ["prologue", "prologueShards"]) assert.deepEqual(CONVOS[k].map((l) => l.who), ["narrator"], k);
  // on deck, Cade, Wren and Kit all speak before Jumble turns up
  const deck = CONVOS.prologueDeck;
  for (const who of ["knight", "gunner", "kit"]) assert.ok(deck.some((l) => l.who === who), who);
  assert.ok(deck.every((l) => l.who !== "jumble" && l.who !== "narrator"));
  // he answers one problem for the crystal, and it flares on the very next line
  const ask = deck.findIndex((l) => l.ask);
  assert.ok(ask > 0 && deck.filter((l) => l.ask).length === 1);
  assert.deepEqual(deck.flatMap((l, i) => (l.glow ? [i] : [])), [ask + 1]);
  // his problem is made at his level, so his turn names no fact
  assert.doesNotMatch(deck[ask].text, /\d|times|plus|minus|divided|equals/i, deck[ask].text);
  // only the opening asks or glows
  for (const [id, lines] of Object.entries(CONVOS)) if (id !== "prologueDeck") assert.ok(lines.every((l) => !l.ask && !l.glow), id);
  // Jumble names himself, and Kit's correction sets him off
  const jumble = CONVOS.prologueJumble;
  assert.equal(jumble[0].who, "jumble");
  assert.match(jumble[0].text, /Captain Jumble/);
  assert.ok(jumble.findIndex((l) => l.who === "kit") === jumble.length - 2 && jumble.at(-1).who === "jumble");
  // over the ram's film, in order: the impact, Jumble flying off, Wren catching the rope
  assert.deepEqual(CONVOS.prologueRam.map((l) => l.who), ["knight", "jumble", "gunner"]);
  // Kit lands on Cade once, on the beach, as its first line there
  assert.match(CONVOS.wake[0].text, /broke my fall/);
  for (const k of keys.slice(0, -1)) assert.ok(CONVOS[k].every((l) => !/fell on each other|broke my fall/.test(l.text)), k);
  // the old opening's lore and Jumble's anagrams are gone
  assert.ok(!storyLines().some((l) => /price tags|Fire the anagrams/.test(l.text)));
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
  // what the explore screen plays itself: the opening, the ending, and odds and ends
  const opening = ["prologue", "prologueDeck", "prologueJumble", "prologueRam", "prologueShards", "wake"];
  [...opening, "noUse", "noUse2", "noUseFish", "fellBack", "wildMany", "endingCrystal", "endingThanks", "endingHarbor", "endingJumble", "endingAfter"].forEach((id) => asked.add(id));
  for (const p of Object.values(MAP.places)) if (p.teaser) asked.add(p.teaser);
  for (const p of Object.values(MAP.places)) if (p.teaser && CONVOS[`${p.teaser}After`]) asked.add(`${p.teaser}After`); // once chapter 1 is over
  for (const t of MAP.trails) if (t.locked) asked.add(t.locked);
  ["mapFirst"].forEach((id) => asked.add(id));
  const flags = new Set([...src.matchAll(/once\(api, "(\w+)"/g)].map((m) => m[1]));
  for (const id of asked) if (!flags.has(id)) assert.ok(CONVOS[id], `missing conversation "${id}"`);
  // and the other way round: every conversation written is played somewhere
  for (const id of Object.keys(CONVOS)) assert.ok(asked.has(id), `conversation "${id}" is never played`);
  // every line of every conversation goes to the recording list (tools/audio/lines.mjs)
  const listed = new Set(storyLines().map((l) => `${l.who}|${l.text}`));
  for (const [id, lines] of Object.entries(CONVOS)) for (const l of lines) assert.ok(listed.has(`${l.who}|${l.text}`), `${id}: ${l.text}`);
});

test("the island map: every place is a real scene or a teaser, and trails open with the story", () => {
  for (const [id, p] of Object.entries(MAP.places)) {
    if (p.teaser) continue;
    assert.ok(SCENES[p.scene], `${id} → ${p.scene}`);
    assert.ok(SCENES[p.scene].fromMap, `${p.scene} needs a fromMap arrival`);
    for (const sc of p.scenes || []) assert.ok(SCENES[sc], sc);
  }
  for (const t of MAP.trails) assert.ok(MAP.places[t.a] && MAP.places[t.b], `${t.a}-${t.b}`);
  // every scene with a map edge is on the map
  for (const [id, s] of Object.entries(SCENES)) if (s.hotspots.some((x) => x.map)) assert.ok(placeOf(id) in MAP.places, id);
  assert.equal(placeOf("temple_hall"), "temple");
  const w = freshWorld();
  assert.deepEqual([...reachable(w, "cove")], ["cove"], "at first only the cove");
  w.flags.signFixed = true;
  assert.ok(reachable(w, "cove").has("temple"));
  assert.ok(!reachable(w, "cove").has("canyon"));
  w.flags.gateOpen = true;
  w.flags.zipDone = true;
  assert.deepEqual(routeTo(w, "temple", "grotto"), ["temple", "cove", "canyon", "grotto"]);
  assert.ok(!reachable(w, "cove").has("harbor"), "teasers stay shut in chapter 1");
});

test("health carries between fights; knocked-out heroes get up; a rest crystal heals", () => {
  const w = checkpoint("canyon");
  joinParty(w, "gunner");
  assert.equal(heroState(w, "knight").hp, CLASSES.knight.hp, "fresh until he fights");
  assert.deepEqual(battleStart(w).spellwright, { hp: CLASSES.spellwright.hp, od: 0 });
  afterBattle(w, { won: true, carry: { knight: { hp: 200, od: 60 }, spellwright: { hp: 0, od: 30 }, gunner: { hp: 300, od: 100 } }, potions: 1 });
  assert.equal(heroState(w, "knight").hp, 200);
  assert.equal(heroState(w, "knight").od, 60);
  assert.equal(heroState(w, "spellwright").hp, Math.round(CLASSES.spellwright.hp * 0.1), "back up with a little health");
  assert.equal(w.potions, 1);
  assert.ok(partyHealth(w) < 0.6);
  rest(w);
  assert.equal(heroState(w, "knight").hp, CLASSES.knight.hp);
  assert.equal(heroState(w, "gunner").od, 100, "resting keeps Overdrive");
  assert.equal(w.potions, POTIONS.rest);
  afterBattle(w, { won: true, carry: { knight: { hp: 10, od: 0 } }, potions: 0 });
  afterBattle(w, { won: false, carry: { knight: { hp: 0, od: 0 } }, potions: 0 });
  assert.equal(heroState(w, "knight").hp, CLASSES.knight.hp, "losing sends them back to rest, all healed");
  assert.equal(w.potions, POTIONS.rest);
});

test("each hero's Overdrive gets shown off once, in a fight they're in", () => {
  const w = freshWorld();
  assert.equal(overdriveLesson(w), null, "the very first fight only teaches the basics");
  w.flags.firstWin = true;
  assert.equal(overdriveLesson(w), "knight");
  w.lessons.knight = true;
  joinParty(w, "spellwright");
  joinParty(w, "gunner");
  joinParty(w, "titancaller");
  assert.equal(overdriveLesson(w), "titancaller", "the newest hero first");
  const rng = createRng(3);
  w.scene = "canyon";
  const enc = wildEncounter("canyon", w, rng);
  assert.equal(enc.odLesson, "titancaller");
  assert.ok(enc.party.includes("titancaller"), "she fights in her lesson, off the bench");
  assert.equal(enc.party.length, 3);
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
  for (let i = 0; i < 30; i++) {
    const q = doorPuzzle({ mastery, rng, tier: 1 + (i % 2) });
    assert.ok(SKILLS[q.skill] && q.skill.startsWith("add."), q.skill);
    assert.ok(q.problem.answer <= 999 && q.grade(String(q.problem.answer)).correct);
  }
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

test("fights grow with the party: one fiend for Cade alone, two or three for a full party", () => {
  for (const size of [1, 2, 3, 4]) {
    const w = freshWorld();
    w.party = PARTY_ORDER.slice(0, size);
    const [fewest, most] = size === 1 ? [1, 1] : size === 2 ? [1, 2] : [2, 3];
    for (const [id, sc] of Object.entries(SCENES)) {
      if (!sc.encounters?.length) continue;
      const opts = encounterOptions(id, w);
      for (const e of opts) assert.ok(e.fiends.length >= fewest && e.fiends.length <= most, `${id}, party of ${size}: ${e.fiends.join("+")}`);
      if (size >= 3) assert.ok(opts.length > 0, `${id} has fights for a full party`);
    }
  }
});
