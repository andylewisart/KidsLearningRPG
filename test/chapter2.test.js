// Chapter 2, Driftwood Harbor (docs/story/chapter2-script.md): the chapter
// boundary, its checkpoints, the story's beats played through with a stand-in
// for the explore screen, Kit's nudges, and every line ready to record.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SCENES, MAP, PARTY_ORDER, WILD_SCALE } from "../src/world/data.js";
import { checkpoint, freshWorld, inside, trailOpen, isTeaser, reachable, rememberable, hatchPet, growPet, petGrowth, battlePets, afterBattle, lineup, encounterOptions, wildEncounter, kitHat, CHAPTER2, PET_GROWTH } from "../src/world/state.js";
import { CONVOS, CONVOS1, SCRIPTS, ARRIVE, EXITS, VISIBLE, SPARKLE } from "../src/world/story.js";
import { CONVOS2 } from "../src/world/lines2.js";
import { nextGoal, noteArrival, glintAt, trailGoal, afterArrive, onMap, openChapter2, STUCK_AFTER, CARDS } from "../src/world/chapter2.js";
import { PETS, BOSS_FIGHT2, DOCK_FIGHT, HARBOR_TRIALS } from "../src/world/data2.js";
import { FIENDS, CLASSES } from "../src/battle/data.js";
import { ENGINE_BARKS, BARKS } from "../src/content/barks.js";
import { createRng } from "../src/util/rng.js";
import { lightNode, NODES } from "../src/world/grid.js";
import { HAL_BITS, FORGE_GLIMMER } from "../src/world/forge.js";

const DIRECTION = JSON.parse(fs.readFileSync(new URL("../tools/audio/direction.json", import.meta.url)));
const ASSETS = JSON.parse(fs.readFileSync(new URL("../public/assets/manifest.json", import.meta.url))).assets;

/**
 * Plays a script (a hotspot's, an arrival or an exit) with a stand-in for the
 * explore screen: returns what happened, in order. Puzzles are solved, fights
 * won and the first choice picked unless told otherwise.
 */
async function play(fn, w, { solve = () => true, won = true, fight = {}, pick = 0, captures = {}, resuming = false, forgePicks = [], songs = null } = {}) {
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
    choose: async (options) => (typeof pick === "function" ? pick(options) : pick),
    puzzle: async (kind, opts) => {
      log.push(`puzzle ${kind}`);
      const r = solve(kind, opts);
      if (r && kind === "fog" && opts.sign) w.flags[opts.sign] = "unlock";
      return r;
    },
    battle: async (enc) => (log.push(`battle ${enc.id}`), { won, ...fight }),
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
    enter: async (id, opts) => log.push(`enter ${id}${opts?.from ? ` from ${opts.from}` : ""}`),
    vanish: async (id) => log.push(`vanish ${id}`),
    walkOff: async (id) => log.push(`walkOff ${id}`),
    petPop: (id) => log.push(`pet ${id}`),
    // the song's moves, when asked: "top" or the cue it starts at, and "stop"
    playSong: (id, opts) => (songs?.push(opts?.from || "top"), false),
    stopSong: () => songs?.push("stop"),
    holdMusic() {},
    trailer: async () => {},
    night: async () => {},
    lookUp() {},
    grid: async (opts) => log.push(opts?.first ? "grid first" : "grid"),
    // the forge window: the heroes he picks, in order, then he steps away
    forge: async () => {
      const cls = forgePicks.shift() ?? null;
      log.push(`forge ${cls}`);
      return cls;
    },
    forged: async (cls) => log.push(`forged ${cls}`),
    forgeShort: async (cls) => log.push(`short ${cls}`),
    gotParts: (n) => log.push(`parts ${n}`),
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
  // five heroes: three fight and two wait, and the ones who counter the fiends start on the field
  const c = checkpoint("causeway");
  assert.equal(lineup(c).party.length, 3);
  assert.deepEqual(lineup(c).reserve, ["titancaller", "beastkeeper"]);
  assert.deepEqual(lineup(c, { fiends: ["crumb_goblin", "fog_glob"] }), { party: ["knight", "spellwright", "beastkeeper"], reserve: ["gunner", "titancaller"] });
  assert.deepEqual(lineup(c, { fiends: ["wick_moth", "barnacle_brute"] }).party, ["knight", "spellwright", "gunner"]);
  // her first fight shows off her Overdrive, and Kit's line about her opens it
  const first = wildEncounter("harbor", c, createRng(4));
  assert.equal(first.odLesson, "beastkeeper");
  assert.ok(first.party.includes("beastkeeper"));
  assert.equal(first.introLine, "tamsinFirstFight");
  assert.ok(CONVOS.tamsinFirstFight);
  // Rivet fights beside Cade
  assert.deepEqual(first.pets, { knight: { id: "rivet", species: "raptor", stage: 1 } });
  assert.equal(first.chapter, 2);
});

test("beat 1: the harbor, the clock, and two villains", async () => {
  const w = checkpoint("ch2");
  w.flags.seenHarbor = false;
  assert.deepEqual(await play(arrive("harbor"), w), ["card story_harbor_arrival", "say harborArrive"]);
  assert.equal(nextGoal(w).id, "clock");
  const log = await play(script("harbor.tower"), w, { solve: (() => { let n = 0; return () => n++ > 0; })() });
  assert.deepEqual(log, ["say clockTower", "puzzle clock", "say clockMissed", "puzzle clock", "enter jumble", "say clockFixed", "enter clamp from right", "card story_clamp_meets_jumble", "say clampArrives", "vanish jumble", "walkOff clamp", "say lighthouseSealed"]);
  // they're on the dock while they talk, and gone after (a cameo is never saved)
  assert.ok(SCENES.harbor.hotspots.find((x) => x.id === "jumble").cameo && SCENES.harbor.hotspots.find((x) => x.id === "clamp").cameo);
  assert.ok(w.flags.clockFixed && w.flags.sealed);
  assert.deepEqual(await play(script("harbor.tower"), w), ["say clockAgain"]);
  // stepping away from the clock
  const w2 = checkpoint("ch2");
  assert.deepEqual(await play(script("harbor.tower"), w2, { solve: () => null }), ["say clockTower", "puzzle clock", "say clockWait"]);
});

test("Kit's hat: the tricorn, nothing from Pockets' theft to Hal's shop, then the cozy", () => {
  assert.equal(kitHat(checkpoint("lair")), "tricorn", "chapter 1, before the ending");
  const w = checkpoint("lair");
  w.flags.hatGone = true;
  assert.equal(kitHat(w), "none", "Pockets has it");
  const after = checkpoint("ending");
  after.finished = true;
  assert.equal(kitHat(after), "none", "back in the canyon after chapter 1");
  assert.equal(kitHat(checkpoint("ch2")), "none", "into the harbor");
  assert.equal(kitHat(checkpoint("harbor")), "none", "until Hal's tea cozy");
  assert.equal(kitHat(checkpoint("tamsin")), "cozy");
  const dawn = checkpoint("ending2");
  dawn.flags.kitHat = true;
  assert.equal(kitHat(dawn), "tricorn", "one line at dawn");
});

test("beat 2: Hal's tea cozy, the recipe, and the fog's signs", async () => {
  const w = checkpoint("harbor");
  assert.deepEqual(await play(script("hal_shop.hal"), w), ["say halIntro", "say halCheck", "puzzle hal", "say halCaught"]);
  assert.ok(w.flags.cozy, "Kit wears the cozy from here");
  assert.deepEqual(await play(script("hal_shop.hal"), w), ["say halAgain", "say halTotal1", "puzzle hal", "say halCaught1", "give pet_food"]);
  // a bag of blade bits: parts for the Sword Master's forge, for catching his sum (once the forge is his again)
  let offered = null;
  assert.deepEqual(await play(script("hal_shop.hal"), w, { pick: (options) => ((offered = options), options.length - 1) }), ["say halAgain"]);
  assert.deepEqual(offered, ["Buy pet food", "Just looking"], "no blade bits before the dock is won");
  w.flags.dockWon = true;
  const bits = (options) => options.indexOf("Buy blade bits");
  const items = [];
  assert.deepEqual(await play(script("hal_shop.hal"), w, { pick: bits, solve: (kind, opts) => items.push(opts.item) }), ["say halAgain", "say halTotal2", "puzzle hal", "say halCaught2", `parts ${HAL_BITS}`]);
  assert.deepEqual(items, [2], "his board totals bags of blade bits");
  assert.equal(w.forge.parts, HAL_BITS);
  assert.deepEqual(await play(script("hal_shop.hal"), w, { pick: bits, solve: () => null }), ["say halAgain", "say halTotal3", "puzzle hal"]);
  assert.equal(w.forge.parts, HAL_BITS, "no bits without catching the sum");
  assert.deepEqual(await play(script("hal_shop.hal"), w, { pick: (options) => options.indexOf("Just looking") }), ["say halAgain"]);
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
  assert.deepEqual(await play(arrive("harbor"), w), ["say wildCagedFirst", "ambush", "card story_tamsin_meets", "say tamsinMeets", "say tamsinGrandpa", "travel menagerie"]);
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
  assert.ok(!VISIBLE["lamp_room.ceiling"](w), "no chart on the ceiling yet");
  assert.deepEqual(await play(script("lamp_room.desk"), w), ["card story_logbook", "say logbook", "say crystalGrid", "grid first", "say lampDrones", "travel sea_cave"]);
  assert.ok(w.flags.gridSeen && w.flags.escaped);
  // the chart stays on the ceiling (until the new crystal goes in), and the Grid opens from it
  assert.ok(VISIBLE["lamp_room.ceiling"](w));
  assert.deepEqual(await play(script("lamp_room.ceiling"), w), ["grid"]);
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
  // the forge: parts from fights (and Hal) and glimmer, a weapon at a time
  w.forge = { parts: 6, steps: {} };
  w.grid.light = FORGE_GLIMMER[1] - 1;
  assert.ok(!SPARKLE["sword_dock.forge"](w), "parts alone don't make the forge glint: it takes glimmer too");
  w.grid.light = FORGE_GLIMMER[1];
  assert.ok(SPARKLE["sword_dock.forge"](w), "the forge glints when there's a step he has the parts and glimmer for");
  assert.deepEqual(await play(script("sword_dock.forge"), w, { forgePicks: ["knight", "gunner"] }), ["say forgeFirst", "forge knight", "forged knight", "say forgeUpgrade", "forge gunner", "say forgeShort", "forge null"]);
  assert.deepEqual(w.forge, { parts: 0, steps: { knight: 1 } });
  assert.equal(w.grid.light, 0);
  assert.ok(!SPARKLE["sword_dock.forge"](w));
  assert.deepEqual(await play(script("sword_dock.forge"), w), ["forge null"], "the Sword Master's welcome is once");
  // the parts without the glimmer: his line is about parts, so the window says it instead
  w.forge.parts = 6;
  assert.deepEqual(await play(script("sword_dock.forge"), w, { forgePicks: ["gunner"] }), ["forge gunner", "short gunner", "forge null"]);
  assert.deepEqual(w.forge, { parts: 6, steps: { knight: 1 } });
  // every weapon as good as he can make it
  w.forge = { parts: 12, steps: { knight: 1, gunner: 2, spellwright: 2, titancaller: 2, beastkeeper: 2 } };
  w.grid.light = FORGE_GLIMMER[2];
  assert.deepEqual(await play(script("sword_dock.forge"), w, { forgePicks: ["knight"] }), ["forge knight", "forged knight", "say forgeDone"]);
  assert.deepEqual(await play(script("sword_dock.forge"), w), ["say forgeDone"]);
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
  assert.deepEqual(rememberable(w, { volt_jelly: 1, barnacle_brute: 1 }).sort(), ["chime", "fizz"]);
  assert.deepEqual(rememberable(w, { magnet_beetle: 3 }), [], "Chime only comes from a Barnacle Brute now it's in the fights");
  assert.deepEqual(await play(script("menagerie.nests"), w, { captures: { volt_jelly: 1 } }), ["say tamsinGrows", "pet fizz", "say petJelly"]);
  assert.equal(w.pets.fizz.owner, "gunner");
  // a pet ready to grow (its hero's hard answers): a new form, a new field note
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
  assert.ok(SPARKLE["lighthouse.barricade"](w));
  const log = await play(script("lighthouse.barricade"), w);
  assert.deepEqual(log, ["card story_engine_arrives", "say engineArrives", "battle engine", "say engineKeeper", "puzzle bind", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  assert.ok(w.flags.engineWon && w.flags.beaconwing && w.bindWords);
  assert.deepEqual(await play(arrive("lamp_room"), w), ["ending2"]);
  // beaten by the Engine: back at the barricade, "Positions!" and straight in
  const again = checkpoint("dusk");
  await play(script("lighthouse.barricade"), again, { won: false });
  assert.deepEqual(await play(script("lighthouse.barricade"), again, { won: false }), ["battle engine"]);
  // stepping away from the binding: Maren waits, and the next click goes straight back to it
  const bind = checkpoint("dusk");
  assert.deepEqual((await play(script("lighthouse.barricade"), bind, { solve: () => null })).slice(-2), ["puzzle bind", "say bindWait"]);
  assert.deepEqual(await play(script("lighthouse.barricade"), bind), ["puzzle bind", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  // at dusk the tower is only looked at: the barricade is the way in, and it glints, not the tower
  const gate = checkpoint("dusk");
  assert.ok(SPARKLE["lighthouse.barricade"](gate) && !SPARKLE["lighthouse.tower"](gate));
  assert.equal(nextGoal(gate).hot, "lighthouse.barricade");
  assert.deepEqual(await play(script("lighthouse.tower"), gate), ["say lens"]);
  // after the fight, with the binding still to do, the tower takes him back to it too
  await play(script("lighthouse.barricade"), gate, { solve: () => null });
  assert.ok(gate.flags.engineWon && !gate.flags.beaconwing && SPARKLE["lighthouse.tower"](gate));
  assert.equal(nextGoal(gate).hot, "lighthouse.tower");
  assert.deepEqual((await play(script("lighthouse.tower"), gate)).slice(0, 1), ["puzzle bind"]);
  // bound in the fight (its last bar: the keeper at the lens, the song, his words): the story picks up at the chorus
  const fought = checkpoint("dusk");
  const words = "Thunder cracks over the black waves, and the wind howls like a wolf.";
  const bound = { titan: "titan_beaconwing", words };
  assert.deepEqual(await play(script("lighthouse.barricade"), fought, { fight: { lens: true, bound } }), ["card story_engine_arrives", "say engineArrives", "battle engine", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  assert.ok(fought.flags.engineWon && fought.flags.keeperLens && fought.flags.beaconwing);
  assert.equal(fought.bindWords, words);
  // the Engine fell while Maren was down: the binding happens at the lens instead (the keeper's lines were in the fight)
  const down = checkpoint("dusk");
  assert.deepEqual((await play(script("lighthouse.barricade"), down, { fight: { lens: true } })).slice(2), ["battle engine", "puzzle bind", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  // beaten after the lens: the next try is the whole fight again
  const lost = checkpoint("dusk");
  await play(script("lighthouse.barricade"), lost, { won: false, fight: { lens: true } });
  assert.ok(lost.flags.keeperLens && !lost.flags.engineWon);
  assert.deepEqual(await play(script("lighthouse.barricade"), lost, { fight: { lens: true, bound } }), ["battle engine", "card story_beaconwing_wakes", "say beaconwingRises", "travel lamp_room"]);
  // the boss is the Drain Engine, with Tamsin fighting for her grandpa's tower
  assert.deepEqual(BOSS_FIGHT2.fiends, ["drain_engine"]);
  assert.ok(FIENDS.drain_engine.boss && FIENDS.drain_engine.finisher === "titan_beaconwing");
  assert.ok(BOSS_FIGHT2.party.includes("titancaller") && BOSS_FIGHT2.party.includes("beastkeeper"));
  // after the ending, the lamp room's stairs go out the front door
  w.flags.ch2Done = true;
  assert.deepEqual(await play(async (api) => assert.deepEqual(EXITS["lamp_room.stairs"](api), { to: "lighthouse", at: [1000, 600] }), w), []);
});

test("the Lantern Song follows the binding: the verse under his words, the chorus as Beaconwing rises, then her goodnight", async () => {
  // bound at the lens: from the top while he writes, then the chorus (played through to its end)
  let songs = [];
  await play(script("lighthouse.barricade"), checkpoint("dusk"), { songs });
  assert.deepEqual(songs, ["top", "chorus", "stop"]);
  // bound in the fight, where the verse was sung: straight to the chorus
  songs = [];
  const bound = { titan: "titan_beaconwing", words: "The wind howls and the lightning cracks." };
  await play(script("lighthouse.barricade"), checkpoint("dusk"), { songs, fight: { lens: true, bound } });
  assert.deepEqual(songs, ["chorus", "stop"]);
  // the cues are in the song's manifest entry, in order (its plan checks they're inside the track)
  const audio = JSON.parse(fs.readFileSync(new URL("../public/assets/audio/manifest.json", import.meta.url)));
  const { chorus, goodnight } = audio.sounds.music_lantern_song.cues;
  assert.ok(chorus > 0 && goodnight > chorus, "the chorus, then her goodnight");
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
  // wave 09: Kit's tea cozy on the field, and the baby moth by the menagerie's tanks
  assert.ok(ASSETS.tutor_droid.field_cozy?.src, "Kit's field picture in the tea cozy");
  // wave 11: Kit with no hat, from Pockets' theft to Hal's shop
  assert.ok(ASSETS.tutor_droid.field_hatless?.src && ASSETS.tutor_droid.portraits_hatless?.src, "Kit with no hat");
  assert.ok(ASSETS.pet_moth_1?.battle?.src, "the baby Wick Moth");
});

test("chapter 2's places: painted, on the map, with fights for a full party", () => {
  for (const id of ["harbor", "hal_shop", "biscuit", "sword_dock", "menagerie", "lighthouse", "lamp_room", "sea_cave", "sage_library", "lair_deep", "camp"]) {
    const sc = SCENES[id];
    assert.ok(ASSETS[sc.painted]?.base?.src, `${id} is painted`);
    assert.ok(sc.hotspots.some((x) => x.id === "rest"), `${id} has a rest crystal`);
    for (const enc of sc.encounters) {
      for (const f of enc.fiends) assert.ok(FIENDS[f] && !FIENDS[f].boss, `${id}: ${f}`);
      // a fast fiend waits for the Beastkeeper: nobody else can pin it down
      if (enc.fiends.some((f) => FIENDS[f].fast)) assert.deepEqual(enc.needs, ["beastkeeper"], `${id}: ${enc.fiends}`);
    }
  }
  // fights jump out once the whole party's there; before Tamsin, nothing fast
  assert.ok(encounterOptions("harbor", checkpoint("causeway")).some((e) => e.fiends.some((f) => FIENDS[f].fast)));
  const early = encounterOptions("harbor", checkpoint("harbor"));
  assert.ok(early.length > 0 && early.every((e) => !e.fiends.some((f) => FIENDS[f].fast)));
  // Pockets is hiding in two hats in seven places
  assert.equal(Object.values(SCENES).filter((sc) => sc.hotspots.some((x) => x.twoHats)).length, 7);
  // the pets go to their heroes, painted at every stage
  for (const p of Object.values(PETS)) for (const n of [1, 2, 3]) assert.ok(PARTY_ORDER.includes(p.owner) && ASSETS[`pet_${p.species}_${n}`]);
  // she fights: Slow and Feed
  assert.ok(CLASSES.beastkeeper.slows && CLASSES.beastkeeper.feeds && !("fights" in CLASSES.beastkeeper));
});

test("pets grow from their heroes' hard answers, and fight beside them", () => {
  const w = checkpoint("day2");
  hatchPet(w, "fizz");
  // Fizz waits for Wren's pet slot on the Crystal Grid (Rivet's comes with him)
  assert.deepEqual(battlePets(w), { knight: { id: "rivet", species: "raptor", stage: 1 } });
  assert.ok(lightNode(w, "gunner.1").ok);
  assert.deepEqual(battlePets(w), { knight: { id: "rivet", species: "raptor", stage: 1 }, gunner: { id: "fizz", species: "jelly", stage: 1 } });
  // Tamsin's nodes make every pet hit harder
  assert.ok(lightNode(w, "beastkeeper.1").ok);
  assert.equal(battlePets(w).gunner.power, 1 + NODES["beastkeeper.1"].pets);
  w.grid.lit = w.grid.lit.filter((id) => id !== "beastkeeper.1");
  w.party = w.party.filter((c) => c !== "gunner");
  assert.deepEqual(Object.keys(battlePets(w)), ["knight"], "a pet only fights when its hero is in the party");
  // each fight's ★★ and ★★★ answers add up; at the next form's total it's ready (once)
  assert.deepEqual(petGrowth(w, { rivet: PET_GROWTH[2] - 1 }), []);
  assert.deepEqual(petGrowth(w, { rivet: 1, nobody: 5 }), ["rivet"]);
  assert.ok(w.pets.rivet.ready);
  assert.deepEqual(petGrowth(w, { rivet: 3 }), [], "ready already");
  growPet(w, "rivet", "Rivet's plates are bronze now.");
  assert.equal(w.pets.rivet.stage, 2);
  assert.ok(!w.pets.rivet.ready);
  assert.deepEqual(petGrowth(w, { rivet: PET_GROWTH[3] - w.pets.rivet.growth }), ["rivet"]);
  growPet(w, "rivet");
  assert.equal(w.pets.rivet.stage, 3);
  assert.deepEqual(petGrowth(w, { rivet: 50 }), [], "three forms at most");
  // won or lost, the answers count; leaving a fight doesn't end it
  const v = checkpoint("day2");
  assert.deepEqual(afterBattle(v, { won: false, growth: { rivet: PET_GROWTH[2] } }), ["rivet"]);
  const q = checkpoint("day2");
  assert.deepEqual(afterBattle(q, { quit: true, growth: { rivet: 99 } }), []);
  assert.ok(!q.pets.rivet.growth);
});

test("chapter 2's test fights and the dock match the adventure's", () => {
  for (const t of HARBOR_TRIALS) {
    assert.ok(t.fiends.every((f) => FIENDS[f]?.chapter === 2), t.id);
    assert.equal(t.party.length + t.reserve.length, 5, t.id);
    assert.ok(CONVOS[t.introLine], t.introLine);
    assert.equal(t.chapter, 2);
  }
  const wild = HARBOR_TRIALS.find((t) => t.id === "h1").scale;
  assert.deepEqual(wild, WILD_SCALE[3]);
  assert.equal(DOCK_FIGHT.scale.atk, WILD_SCALE[3].atk);
  assert.ok(Math.abs(DOCK_FIGHT.scale.hp - WILD_SCALE[3].hp * 1.5) < 1e-9, "half again a wild Brute's shell");
  assert.deepEqual(DOCK_FIGHT.fiends, ["barnacle_brute"]);
});
