// Chapter 2, Driftwood Harbor (docs/story/chapter2-script.md): the chapter
// boundary, its checkpoints, the story's beats played through with a stand-in
// for the explore screen, Kit's nudges, and every line ready to record.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SCENES, MAP, PARTY_ORDER } from "../src/world/data.js";
import { checkpoint, freshWorld, inside, trailOpen, isTeaser, reachable, rememberable, hatchPet, growPet, lineup, encounterOptions, CHAPTER2 } from "../src/world/state.js";
import { CONVOS, CONVOS1, SCRIPTS, ARRIVE, EXITS, VISIBLE, SPARKLE } from "../src/world/story.js";
import { CONVOS2 } from "../src/world/lines2.js";
import { nextGoal, noteArrival, glintAt, trailGoal, afterArrive, onMap, openChapter2, STUCK_AFTER, CARDS } from "../src/world/chapter2.js";
import { STAND_IN, PETS, BOSS_FIGHT2 } from "../src/world/data2.js";
import { FIENDS, CLASSES } from "../src/battle/data.js";
import { ENGINE_BARKS, BARKS } from "../src/content/barks.js";

const DIRECTION = JSON.parse(fs.readFileSync(new URL("../tools/audio/direction.json", import.meta.url)));
const ASSETS = JSON.parse(fs.readFileSync(new URL("../public/assets/manifest.json", import.meta.url))).assets;

/**
 * Plays a script (a hotspot's, an arrival or an exit) with a stand-in for the
 * explore screen: returns what happened, in order. Puzzles are solved, fights
 * won and the first choice picked unless told otherwise.
 */
async function play(fn, w, { solve = () => true, won = true, pick = 0, captures = {}, resuming = false } = {}) {
  const log = [];
  const api = {
    world: w,
    resumingFight: resuming,
    captures,
    given: "Rivet is a little raptor made of shiny plates, and he carries a tiny shield.",
    save() {},
    say: async (id, onLine) => {
      assert.ok(CONVOS[id], `no conversation "${id}"`);
      CONVOS[id].forEach((l, i) => onLine?.(l, i));
      log.push(`say ${id}`);
    },
    choose: async () => pick,
    puzzle: async (kind, opts) => {
      log.push(`puzzle ${kind}`);
      const r = solve(kind, opts);
      if (r && kind === "fog" && opts.sign) w.flags[opts.sign] = "unlock";
      return r;
    },
    battle: async (enc) => (log.push(`battle ${enc.id}`), { won }),
    ambush: async () => (log.push("ambush"), { won }),
    give: async (id) => (w.items.push(id), log.push(`give ${id}`)),
    take() {},
    has: (id) => w.items.includes(id),
    join: async (cls) => (w.party.push(cls), log.push(`join ${cls}`)),
    travel: async (to) => {
      w.scene = to;
      log.push(`travel ${to}`);
    },
    card: async (id) => (log.push(`card ${id}`), { close() {}, stamp() {}, write() {}, done: Promise.resolve() }),
    ending2: async () => log.push("ending2"),
    rest() {},
    sfx() {},
    wait: async () => {},
    shake() {},
    flash() {},
    refresh() {},
    beckon() {},
    hush: () => () => {},
    monkeyFlee: async () => log.push("flee"),
    hide() {},
    walkOff: async (id) => log.push(`walkOff ${id}`),
    petPop: (id) => log.push(`pet ${id}`),
    playSong: () => false,
    stopSong() {},
    holdMusic() {},
    trailer: async () => {},
    night: async () => {},
  };
  await fn(api);
  return log;
}

const script = (key) => (api) => SCRIPTS[key](api);
const arrive = (scene) => (api) => ARRIVE[scene](api);

test("chapter 1 over: the chapter boundary opens chapter 2 in the harbor, once", () => {
  const w = checkpoint("ending");
  w.finished = true;
  openChapter2(w);
  assert.ok(w.flags.ch2);
  assert.equal(w.scene, "harbor");
  assert.equal(w.onMap, false);
  w.scene = "cove";
  openChapter2(w);
  assert.equal(w.scene, "cove", "only the first time");
  // the harbor stops being a teaser, and the trail down to it opens
  const harbor = MAP.places.harbor;
  assert.ok(isTeaser(freshWorld(), harbor));
  assert.ok(!isTeaser(w, harbor));
  assert.ok(reachable(w, "cove").has("harbor"));
  assert.ok(!reachable(checkpoint("ending"), "cove").has("harbor"), "not before chapter 2");
});

test("chapter 2's checkpoints build on each other and stand somewhere he can walk", () => {
  for (const name of CHAPTER2) {
    const w = checkpoint(name);
    assert.ok(w, name);
    assert.ok(w.finished && w.flags.ch2, `${name}: chapter 1 is over`);
    assert.ok(SCENES[w.scene], `${name}: ${w.scene}`);
    assert.ok(inside(w.pos, SCENES[w.scene].walk), `${name}: standing in ${w.scene}`);
  }
  assert.ok(!checkpoint("menagerie").party.includes("beastkeeper"));
  assert.ok(checkpoint("causeway").party.includes("beastkeeper") && checkpoint("causeway").pets.rivet);
  // Tamsin waits out the fights until phase B: three fight, one waits, as before
  assert.deepEqual(lineup(checkpoint("causeway")).party.length, 3);
  assert.ok(!lineup(checkpoint("causeway")).party.includes("beastkeeper") && lineup(checkpoint("causeway")).reserve !== "beastkeeper");
});

test("beat 1: the harbor, the clock, and two villains", async () => {
  const w = checkpoint("ch2");
  w.flags.seenHarbor = false;
  assert.deepEqual(await play(arrive("harbor"), w), ["card story_harbor_arrival", "say harborArrive"]);
  assert.equal(nextGoal(w).id, "clock");
  const log = await play(script("harbor.tower"), w, { solve: (() => { let n = 0; return () => n++ > 0; })() });
  assert.deepEqual(log, ["say clockTower", "puzzle clock", "say clockMissed", "puzzle clock", "say clockFixed", "card story_clamp_meets_jumble", "say clampArrives", "say lighthouseSealed"]);
  assert.ok(w.flags.clockFixed && w.flags.sealed);
  assert.deepEqual(await play(script("harbor.tower"), w), ["say clockAgain"]);
  // stepping away from the clock
  const w2 = checkpoint("ch2");
  assert.deepEqual(await play(script("harbor.tower"), w2, { solve: () => null }), ["say clockTower", "puzzle clock", "say clockWait"]);
});

test("beat 2: Hal's tea cozy, the recipe, and the fog's signs", async () => {
  const w = checkpoint("harbor");
  assert.deepEqual(await play(script("hal_shop.hal"), w), ["say halIntro", "say halCheck", "puzzle hal", "say halCaught"]);
  assert.ok(w.flags.cozy, "Kit wears the cozy from here");
  assert.deepEqual(await play(script("hal_shop.hal"), w), ["say halAgain", "say halTotal1", "puzzle hal", "say halCaught1", "give pet_food"]);
  assert.deepEqual(await play(script("hal_shop.hal"), w, { pick: 1 }), ["say halAgain"]);
  const log = await play(script("biscuit.baker"), w);
  assert.deepEqual(log, ["say biscuitIntro", "puzzle recipe", "puzzle recipe", "say recipeSolved", "give biscuits"]);
  assert.deepEqual(await play(script("biscuit.book"), w), ["say recipeBookOne"]);
  assert.deepEqual(await play(script("harbor.fog2"), w), ["say fogSign", "puzzle fog", "say fogSignSolved1"]);
  assert.deepEqual(await play(script("harbor.fog1"), w), ["puzzle fog", "say fogSignSolved2"]);
  assert.deepEqual(await play(script("harbor.fog3"), w), ["puzzle fog", "say fogSignSolved3"]);
  assert.equal(w.flags.fog2, "unlock", "the sign keeps the word he gave back");
  assert.deepEqual(await play(script("harbor.fog2"), w), ["say fogSignSolved2"]);
});

test("beats 3 and 4: the Caged Drone, Tamsin, and Rivet", async () => {
  const w = checkpoint("tamsin");
  w.scene = "harbor";
  assert.deepEqual(await play(arrive("harbor"), w), ["say wildCagedFirst", "ambush", "say tamsinMeets", "say tamsinGrandpa", "travel menagerie"]);
  assert.ok(w.flags.metTamsin);
  assert.ok(trailOpen(w, MAP.trails.find((t) => t.b === "menagerie")), "the menagerie is on the map");
  // losing the drone fight: it comes back next time
  const lost = checkpoint("tamsin");
  assert.deepEqual(await play(arrive("harbor"), lost, { won: false }), ["say wildCagedFirst", "ambush"]);
  assert.ok(!lost.flags.metTamsin);

  const m = checkpoint("menagerie");
  assert.deepEqual(await play(arrive("menagerie"), { ...m, flags: { ...m.flags, menagerieSeen: false } }), ["say menagerieArrive"]);
  const log = await play(script("menagerie.beastkeeper"), m, { captures: { scrap_raptor: 2 } });
  assert.deepEqual(log, ["say raptorYours", "puzzle feed", "say feedSolved", "puzzle weigh", "say weighSolved", "puzzle note", "say rivetHatches", "pet rivet", "say tamsinJoins", "join beastkeeper"]);
  assert.equal(m.pets.rivet.owner, "knight");
  assert.match(m.pets.rivet.notes[0], /shield/, "his field note is kept for the ending");
  assert.ok(m.flags.tamsinJoined);
  const fresh = checkpoint("menagerie");
  assert.equal((await play(script("menagerie.beastkeeper"), fresh, { solve: () => null }))[0], "say raptorFresh", "no raptor caught: the one in the corner tank");
});

test("beats 6 and 7: the causeway, the tunnel, the lamp room, and camp", async () => {
  const w = checkpoint("causeway");
  w.flags.causewaySeen = false;
  w.flags.tideOut = false;
  assert.deepEqual(await play(arrive("lighthouse"), w), ["say causewayGuarded"]);
  assert.ok(w.flags.tideOut && VISIBLE["cove.cave"](w) && VISIBLE["cove.bottle2"](w));
  assert.deepEqual(await play(arrive("cove"), w), ["say coveTideOut"]);
  assert.deepEqual(CONVOS.coveTideOut.at(-1).text, CONVOS.wreckAgain[0].text, "Kit's reused line, word for word");
  assert.deepEqual(await play(script("cove.bottle2"), w), ["say bottleCh2", "give jumble_note2"]);
  assert.deepEqual(await play(script("sea_cave.chest"), w), ["say petFoodChest", "give pet_food"]);
  // the steps up: the tide table first
  const log = [];
  const ok = await play(async (api) => log.push(await EXITS["sea_cave.steps"](api)), w);
  assert.deepEqual(ok, ["say tideTable", "puzzle tide", "say tideSolved"]);
  assert.deepEqual(log, [true]);
  // the lamp room: the keeper climbs, hums, and goes
  assert.deepEqual(await play(arrive("lamp_room"), w), ["card story_keeper_climbs", "say keeperClimbs", "walkOff keeper", "say keeperHums"]);
  assert.ok(!VISIBLE["lamp_room.keeper"](w), "he's gone down");
  assert.ok(SPARKLE["lamp_room.desk"](w), "the logbook glints");
  assert.deepEqual(await play(script("lamp_room.desk"), w), ["card story_logbook", "say logbook", "say crystalGrid", "say lampDrones", "travel sea_cave"]);
  assert.ok(w.flags.gridSeen && w.flags.escaped);
  assert.deepEqual(await play(arrive("sea_cave"), w), ["say songResolve", "travel camp"]);
  assert.deepEqual(await play(arrive("camp"), w), ["say campNow", "say dayTwoMorning"]);
  assert.ok(w.flags.dayTwo);
  assert.ok(trailOpen(w, MAP.trails.find((t) => t.b === "sword_dock")), "the dock is on the map");
  // the next map: the island's remembering early
  assert.deepEqual(await play((api) => onMap(api), w), ["say mapRemembering"]);
  assert.ok(w.flags.libraryOpen && w.flags.partsFound && w.flags.lairDeepOpen);
  assert.deepEqual(await play((api) => onMap(api), w), []);
});

test("beats 8 to 10: the dock, the Lantern Song, old places, the pets", async () => {
  const w = checkpoint("day2");
  assert.deepEqual(await play(script("sword_dock.swordmaster"), w), ["say swordmasterIntro", "battle dock", "say dockWon"]);
  assert.ok(w.flags.dockWon);
  w.flags.dockWon = false;
  assert.deepEqual(await play(script("sword_dock.swordmaster"), w), ["battle dock", "say dockWon"]);
  assert.deepEqual(await play(script("sword_dock.forge"), w), ["say forgeFirst"]);
  // the song, piece by piece: the baker, then Hal, then Maren puts it together
  w.flags.recipeBack = true;
  assert.deepEqual(await play(script("biscuit.baker"), w), ["say songBaker"]);
  assert.deepEqual(await play(script("hal_shop.hal"), w), ["say songHal", "say songPieces"]);
  assert.ok(w.flags.songPieces);
  // old places
  assert.deepEqual(await play(script("sage_library.lectern"), w), ["say crestMap", "give crest_map"]);
  assert.deepEqual(await play(script("sage_library.seat"), w), ["say librarySeat"]);
  assert.deepEqual(await play(script("sage_library.seat"), w), ["say librarySeatAgain"]);
  assert.deepEqual(await play(script("canyon.propeller"), w), ["say albatrossParts"]);
  assert.deepEqual(await play(arrive("lair_deep"), w), ["say lairDeep", "ambush", "say lairDeepDone"]);
  // Tamsin remembers bigger fiends: a captured Volt Jelly becomes Fizz, for Wren
  assert.deepEqual(rememberable(w, {}), []);
  assert.deepEqual(rememberable(w, { volt_jelly: 1, magnet_beetle: 1 }).sort(), ["chime", "fizz"]);
  assert.deepEqual(await play(script("menagerie.nests"), w, { captures: { volt_jelly: 1 } }), ["say tamsinGrows", "pet fizz", "say petJelly"]);
  assert.equal(w.pets.fizz.owner, "gunner");
  // phase B says when a pet's ready to grow: a new form, a new field note
  w.pets.rivet.ready = true;
  assert.deepEqual(await play(script("menagerie.nests"), w), ["say petGrows", "say petGrowsNote", "puzzle note", "pet rivet"]);
  assert.equal(w.pets.rivet.stage, 2);
  assert.equal(w.pets.rivet.notes.length, 2);
  growPet(w, "rivet");
  growPet(w, "rivet");
  assert.equal(w.pets.rivet.stage, 3, "three stages at most");
  hatchPet(w, "nobody");
  assert.ok(!w.pets.nobody);
});

test("beats 9b to 12: the audit, dusk, the Drain Engine, Beaconwing, the ending", async () => {
  const w = checkpoint("audit");
  w.scene = "harbor";
  assert.deepEqual(await play(arrive("harbor"), w), ["say auditSpotted", "card story_jumble_audit", "say jumbleAudit", "say auditAfter"]);
  assert.ok(w.flags.auditDone);
  // dusk falls wherever he is next
  assert.deepEqual(await play((api) => afterArrive(api), w), ["say duskFalls"]);
  assert.ok(SPARKLE["lighthouse.tower"](w));
  const log = await play(script("lighthouse.tower"), w);
  assert.deepEqual(log, ["card story_engine_arrives", "say engineArrives", "battle engine", "say engineKeeper", "puzzle bind", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  assert.ok(w.flags.engineWon && w.flags.beaconwing && w.bindWords);
  assert.deepEqual(await play(arrive("lamp_room"), w), ["ending2"]);
  // beaten by the Engine: back at the tower, "Positions!" and straight in
  const again = checkpoint("dusk");
  await play(script("lighthouse.tower"), again, { won: false });
  assert.deepEqual(await play(script("lighthouse.tower"), again, { won: false }), ["battle engine"]);
  // stepping away from the binding: Maren waits, and the next click goes straight back to it
  const bind = checkpoint("dusk");
  assert.deepEqual((await play(script("lighthouse.tower"), bind, { solve: () => null })).slice(-2), ["puzzle bind", "say bindWait"]);
  assert.deepEqual(await play(script("lighthouse.tower"), bind), ["puzzle bind", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  // the boss is the Drain Engine, fought by a stand-in until phase B
  assert.deepEqual(BOSS_FIGHT2.wants, ["drain_engine"]);
  assert.ok(FIENDS[BOSS_FIGHT2.fiends[0]]);
  // after the ending, the lamp room's stairs go out the front door
  w.flags.ch2Done = true;
  assert.deepEqual(await play(async (api) => assert.deepEqual(EXITS["lamp_room.stairs"](api), { to: "lighthouse", at: [1000, 600] }), w), []);
});

test("Kit's nudges: a nudge, a direction, a glint, then the trail on the map", async () => {
  const w = checkpoint("ch2");
  assert.equal(nextGoal(freshWorld()), null, "not in chapter 1");
  const strengths = [];
  for (let i = 1; i <= STUCK_AFTER.at(-1); i++) strengths.push(noteArrival(w));
  assert.deepEqual(strengths.filter(Boolean), [1, 2, 3, 4]);
  assert.equal(glintAt(w), "harbor.tower");
  assert.equal(trailGoal(w), "harbor");
  // progress starts the count again
  w.flags.clockFixed = true;
  assert.equal(noteArrival(w), 0);
  assert.equal(w.stuck.goal, "hal");
  assert.equal(glintAt(w), null);
  // every goal points somewhere real, with a line that's written
  const goals = new Set();
  const steps = ["clockFixed", "cozy", "metTamsin", "tamsinJoined", "causewaySeen", "tideSolved", "logbook", "dockWon", "songPieces", "auditDone", "engineWon"];
  const v = checkpoint("ch2");
  for (const flag of steps) {
    const g = nextGoal(v);
    goals.add(g.id);
    const [scene, hot] = g.hot.split(".");
    assert.ok(SCENES[scene]?.hotspots.some((x) => x.id === hot), g.hot);
    if (g.line) assert.ok(CONVOS[g.line], g.line);
    v.flags[flag] = true;
  }
  assert.equal(goals.size, steps.length - 1 + 1);
  v.flags.ch2Done = true;
  assert.equal(nextGoal(v), null);
});

test("chapter 2's conversations never take a chapter 1 key (one would silently replace the other)", () => {
  assert.deepEqual(Object.keys(CONVOS2).filter((id) => id in CONVOS1), []);
});

test("every chapter 2 line is approved text with a speaker, a portrait mood and an expression tag", () => {
  const moods = ["neutral", "laughing", "angry", "shocked", "smug", "worried"];
  let n = 0;
  for (const [id, lines] of Object.entries(CONVOS2)) {
    for (const l of lines) {
      n += 1;
      assert.ok(moods.includes(l.mood), `${id}: ${l.mood}`);
      assert.ok(DIRECTION[l.who]?.[l.text], `${id}: no tag for ${l.who}: "${l.text}"`);
    }
  }
  for (const b of [...BARKS.filter((x) => x.who === "beastkeeper"), ...ENGINE_BARKS]) assert.ok(DIRECTION[b.who]?.[b.text], `no tag for ${b.who}: "${b.text}"`);
  assert.ok(n > 330, `${n} lines`);
  // the script's numbers: 23 Tamsin barks (21 + her two commands) and 10 from the Engine's cockpit
  assert.equal(BARKS.filter((x) => x.who === "beastkeeper").length, 23);
  assert.equal(ENGINE_BARKS.length, 10);
  // the new speakers' portraits are painted
  for (const who of ["beastkeeper", "clamp", "keeper", "hal", "baker", "swordmaster"]) {
    const art = { beastkeeper: "ally_beastkeeper" }[who] || `npc_${who}`;
    assert.ok(ASSETS[art]?.portraits?.src, `${who}'s portraits`);
  }
  assert.ok(ASSETS.tutor_droid.portraits_cozy?.src, "Kit in the tea cozy");
  for (const id of Object.values(CARDS)) assert.ok(ASSETS[id]?.base?.src, `story card ${id}`);
});

test("chapter 2's places: painted, on the map, with fights for a full party", () => {
  for (const id of ["harbor", "hal_shop", "biscuit", "sword_dock", "menagerie", "lighthouse", "lamp_room", "sea_cave", "sage_library", "lair_deep", "camp"]) {
    const sc = SCENES[id];
    assert.ok(ASSETS[sc.painted]?.base?.src, `${id} is painted`);
    assert.ok(sc.hotspots.some((x) => x.id === "rest"), `${id} has a rest crystal`);
    for (const enc of sc.encounters) {
      for (const f of enc.fiends) assert.ok(FIENDS[f], `${id}: ${f} is a real fiend (a stand-in until phase B)`);
      for (const f of enc.wants) assert.ok(STAND_IN[f], `${id}: ${f} has a stand-in`);
    }
  }
  // fights jump out once the whole party's there
  assert.ok(encounterOptions("harbor", checkpoint("causeway")).length > 0);
  // Pockets is hiding in two hats in seven places
  assert.equal(Object.values(SCENES).filter((sc) => sc.hotspots.some((x) => x.twoHats)).length, 7);
  // the pets go to their heroes
  for (const p of Object.values(PETS)) assert.ok(PARTY_ORDER.includes(p.owner) && ASSETS[`pet_${p.species}_1`]);
  assert.equal(CLASSES.beastkeeper.fights, false, "she joins the fights in phase B");
});
