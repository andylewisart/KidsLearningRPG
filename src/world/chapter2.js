// The story of chapter 2, Driftwood Harbor (docs/story/chapter2-script.md):
// what happens when he looks at, talks to or uses something in the harbor
// and the places off it, and in chapter 1's places once they've changed.
// The lines are in lines2.js; story.js adds everything here to its own
// tables, so the explore screen sees one story.
//
// Besides chapter 1's tools (story.js), a chapter 2 script's `api` has:
//   card(id, opts) → a story card over the scene (null when it isn't painted:
//                    the lines play over the scene instead); card.close(),
//                    card.write(text) draws words on it, card.stamp(text) stamps them
//   travel(sceneId, at)    on to another place now (the party runs there)
//   hide(cls, hidden)      a hero ducks out of sight (Knox, while Jumble's about)
//   enter(hotId, { from }) someone comes on for a scene (a `cameo` hotspot): walking in
//                          from that edge, or appearing in ghost light where they stand
//   vanish(hotId)          a ghost fades away where he floats
//   walkOff(hotId)         someone in the scene walks away and is gone
//   petPop(petId)          a remembered pet's welcome card, then it appears beside its hero
//   playSong(id, opts)     a song (the Lantern Song); false when the track isn't in the pack.
//                          opts.from names a cue in the track (its chorus) to start at,
//                          opts.once plays it through to its end
//   songAt(cue), songEnd() until the song reaches that cue, or its end (false: none playing)
//   songLevel(v)           the song steps back (under words read out) or forward again
//   hideLines()            the talking box goes (it stays up after a conversation until something else happens)
//   stopSong(), holdMusic(on)   the music steps out (and stays out) or comes back
//   given                  what he wrote in the last puzzle (field notes, the binding)
//   captures               the fiends he's captured (save.collection.captures)
//   trailer(text)          his words read out in the movie-trailer voice
//   ending2()              the chapter's last moments (explore.js)
//   lookUp()               the view tilts up to the lamp room's ceiling (and stays up until grid())
//   grid({ first })        the Crystal Grid (ui/grid.js): the view looks up at the
//                          lamp room's ceiling and the chart opens; resolves when he
//                          closes it, and the view comes back down
//   forge()                the Sword Master's forge window (ui/forge.js): resolves with
//                          the hero whose weapon he wants forged next, or null when he's done
//   forged(cls)            the hammer comes down on that hero's weapon (its new step is in the save)
//   gotParts(n, what)      parts for the forge, counted on screen

import { BOSS_FIGHT2, DOCK_FIGHT, PETS } from "./data2.js";
import { hatchPet, growPet, rememberable } from "./pets.js";
import { forge, forgeDone, forgeReady, addParts, HAL_BITS } from "./forge.js";

/** The story cards (art wave 08, Section J): the conversation → its painting. */
export const CARDS = {
  harborArrive: "story_harbor_arrival",
  clampArrives: "story_clamp_meets_jumble",
  tamsinMeets: "story_tamsin_meets", // wave 09
  keeperClimbs: "story_keeper_climbs",
  logbook: "story_logbook",
  jumbleAudit: "story_jumble_audit",
  engineArrives: "story_engine_arrives",
  beaconwingRises: "story_beaconwing_wakes",
  endingLens: "story_crystal_lit",
  endingThanks2: "story_gallery_dawn", // wave 09
  endingHat: "story_ch2_ending",
  endingJumble2: "story_jumble_smoke",
};

/** The music the chapter needs (docs/story/chapter2-script.md, Music): until it's made, Maren's song stands in. */
export const LANTERN_SONG = "music_lantern_song";
export const KEEPER_HUM = "music_keeper_hum";
export const SONG_STAND_IN = "music_maren_song";

/**
 * Lines that belong in fights (Tamsin's commands, captures, pets in fights,
 * the Drain Engine's own fight: ui/battle.js says them), and Kit's camp call
 * (the play timer). They're in CONVOS so they're recorded with the rest;
 * nothing in the adventure says them. (The Crystal Grid's lines are said by
 * its screen, ui/grid.js.)
 */
export const BATTLE_CONVOS = [
  "tamsinFirstFight", "firstFast", "slowLesson", "slowLanded", "feedLesson", "calmCapture", "firstCaptureCh2", "odLesson_beastkeeper", "firstPet",
  "reachArmored", "reachFlier", "reachSlime", "reachFast", "reachColossal", "reachAgain",
  "wildBrute", "wildMoth", "wildFog", "wildMimic", "wildGoblins", "wildEel", "wildCaged", "engineIntro", "engineTitan",
];
export const LATER_CONVOS = ["campSoon1", "campSoon2", "campAfterFight"];

/** Kit's line when a wild fight starts, for chapter 2's fiends. */
export const WILD_INTRO2 = {
  barnacle_brute: "wildBrute",
  wick_moth: "wildMoth",
  fog_glob: "wildFog",
  tick_mimic: "wildMimic",
  crumb_goblin: "wildGoblins",
  riptide_eel: "wildEel",
  caged_drone: "wildCaged",
};

const f = (w, ...flags) => flags.every((x) => w.flags[x]);
const ch2 = (w) => Boolean(w.flags.ch2);
const has = (w, cls) => w.party.includes(cls);
/** Is Pockets still about, in both hats? (Until the gallery at dawn.) */
const pocketsHere = (w, scene) => ch2(w) && !w.monkeys[scene] && !w.flags.ch2Done;

/** Which hotspots show right now (added to story.js VISIBLE). */
export const VISIBLE2 = {
  "harbor.monkey": (w) => pocketsHere(w, "harbor"),
  "hal_shop.monkey": (w) => pocketsHere(w, "hal_shop"),
  "biscuit.monkey": (w) => pocketsHere(w, "biscuit"),
  "sword_dock.monkey": (w) => pocketsHere(w, "sword_dock"),
  "menagerie.monkey": (w) => pocketsHere(w, "menagerie"),
  "lighthouse.monkey": (w) => pocketsHere(w, "lighthouse"),
  "sea_cave.monkey": (w) => pocketsHere(w, "sea_cave"),
  "menagerie.beastkeeper": (w) => !has(w, "beastkeeper"),
  // the keeper sits by the lens on the first night until he goes down, and is there again at the end
  "lamp_room.keeper": (w) => !w.flags.keeperLeft || Boolean(w.flags.beaconwing),
  // the Sage chart across the ceiling, while the old crystal throws it there: the Crystal Grid opens from it
  "lamp_room.ceiling": (w) => Boolean(w.flags.gridSeen) && !w.flags.beaconwing,
  "cove.bottle2": (w) => Boolean(w.flags.tideOut) && !w.flags.bottle2,
};

/** The painted changes (wave 08 state patches): "scene.state" → when it shows. */
export const PAINTED2 = {
  "harbor.clock_fixed": (w) => Boolean(w.flags.clockFixed),
  "harbor.remembered": (w) => Boolean(w.flags.ch2Done),
  "hal_shop.cozy_sold": (w) => Boolean(w.flags.cozy),
  "biscuit.recipes_back": (w) => Boolean(w.flags.recipeBack),
  "sword_dock.dock_won": (w) => Boolean(w.flags.dockWon),
  "lighthouse.after": (w) => Boolean(w.flags.engineWon),
  "lamp_room.grid": (w) => Boolean(w.flags.gridSeen) && !w.flags.beaconwing,
  "lamp_room.lit": (w) => Boolean(w.flags.beaconwing),
};

/** Where something waits to be done (added to story.js SPARKLE). */
export const SPARKLE2 = {
  "harbor.tower": (w) => !w.flags.clockFixed,
  "harbor.fog1": (w) => Boolean(w.flags.sealed) && !w.flags.fog1,
  "harbor.fog2": (w) => Boolean(w.flags.sealed) && !w.flags.fog2,
  "harbor.fog3": (w) => Boolean(w.flags.sealed) && !w.flags.fog3,
  "harbor.hal": (w) => Boolean(w.flags.sealed) && !w.flags.cozy,
  "harbor.biscuit": (w) => Boolean(w.flags.sealed) && !w.flags.recipeBack,
  "hal_shop.hal": (w) => !w.flags.cozy || (Boolean(w.flags.lampSeen) && !w.flags.songHal),
  "biscuit.baker": (w) => !w.flags.recipeBack || (Boolean(w.flags.lampSeen) && !w.flags.songBaker),
  "menagerie.beastkeeper": () => true,
  "menagerie.nests": (w) => Boolean(w.flags.dayTwo) && (!w.flags.tamsinGrows || Object.values(w.pets || {}).some((p) => p.ready)),
  "lighthouse.barricade": (w) => !w.flags.causewaySeen || (Boolean(w.flags.dusk) && !w.flags.engineWon),
  "lighthouse.tower": (w) => Boolean(w.flags.engineWon) && !w.flags.beaconwing,
  "cove.cave": (w) => Boolean(w.flags.tideOut) && !w.flags.tideSolved,
  "cove.bottle2": () => true,
  "sea_cave.chest": (w) => !w.flags.petFood,
  "sea_cave.steps": (w) => !w.flags.tideSolved,
  "lamp_room.desk": (w) => !w.flags.logbook,
  "sword_dock.swordmaster": (w) => !w.flags.dockWon,
  "sword_dock.forge": (w) => Boolean(w.flags.dockWon) && forgeReady(w, w.party),
  "sage_library.seat": (w) => !w.flags.librarySeat,
  "sage_library.lectern": (w) => !w.flags.crestMap,
  "canyon.propeller": (w) => !w.flags.albatrossParts,
  "canyon.figurehead": (w) => !w.flags.albatrossParts,
};

// `quiet`: a quiet moment (api.hush): the music steps back and the view leans in on `quiet.hot`
const once = async (api, flag, first, after, quiet = null) => {
  if (!api.world.flags[flag]) {
    api.world.flags[flag] = true;
    api.save();
    const back = quiet ? api.hush?.(quiet.hot, quiet) : null;
    try {
      if (first) await api.say(first);
    } finally {
      back?.();
    }
  } else if (after) await api.say(after);
};

const set = (api, ...flags) => {
  for (const x of flags) api.world.flags[x] = true;
  api.save();
};

/** A rest crystal: everyone healed. */
async function restAt(api) {
  api.rest();
  if (!api.world.flags.rested) {
    set(api, "rested");
    await api.say("restFirst");
  } else await api.say("restAgain");
}

/**
 * What a line's `cue` does on screen (lines2.js). `card` is the
 * conversation's story card, if it has one, and `state` carries what the
 * cues opened (a card) to whoever closes it.
 */
export function cueFor(api, line, state = {}) {
  const w = api.world;
  switch (line.cue) {
    case "hide":
      api.hide?.("spellwright", true);
      break;
    case "fine":
    case "stamp":
      api.sfx("sfx_stamp") || api.sfx("sfx_hit");
      api.shake(6, 260);
      if (line.cue === "stamp") {
        // the stamp lands, and the music goes out completely until the paperwork flies
        api.holdMusic?.(true);
        state.card?.stamp?.("IRRELEVANT");
      }
      break;
    case "chitter":
    case "crunch":
      api.sfx("sfx_monkey");
      break;
    case "papers":
      state.card?.close?.();
      state.card = null;
      api.holdMusic?.(false);
      api.sfx("sfx_swap");
      break;
    case "cozy":
      // Kit puts on the tea cozy: from here, Kit's portraits are the cozy ones
      w.flags.cozy = true;
      w.flags.kitHat = false;
      api.save();
      api.refresh();
      break;
    case "hatOn":
      w.flags.kitHat = true;
      api.save();
      break;
    case "bells":
      api.sfx("sfx_bell") || api.sfx("sfx_heal");
      break;
    case "write":
      api.sfx("sfx_puzzle_solved");
      break;
    case "cage":
      api.sfx("sfx_door_stone");
      api.shake(4, 200);
      break;
    case "hatch":
      api.flash("#fff3c4");
      api.sfx("sfx_summon_rise");
      break;
    case "grid":
      // the old crystal's last light: the chart across the ceiling, and the view looks up at it
      api.flash("#cfe8ff");
      set(api, "gridSeen");
      api.refresh();
      api.lookUp?.();
      break;
    case "lens":
      api.sfx("sfx_quake");
      api.shake(6, 900);
      break;
    case "card":
      // handled by the script (it knows which card)
      break;
    default:
  }
}

/** A conversation with its cues played. */
const talk = (api, id, state = {}) => api.say(id, (line) => line.cue && cueFor(api, line, state));

/** A conversation over its story card (or over the scene, while the card isn't painted). `from`: the line the card comes up on. */
async function overCard(api, id, { from = 0, keep = false, draw = null } = {}) {
  const state = { card: null };
  const open = async () => {
    state.card = (await api.card?.(CARDS[id], { draw })) || null;
  };
  if (from === 0) await open();
  await api.say(id, (line, i) => {
    if (from > 0 && i === from) open();
    if (line.cue && line.cue !== "card") cueFor(api, line, state);
  });
  if (!keep) state.card?.close?.();
  return state.card;
}

// ---------------------------------------------------------------- Kit's nudges (getting unstuck)

/**
 * What he should do next in chapter 2, with Kit's line pointing at it (a
 * direction, strength 2) and the hotspot that glints (strength 3). null
 * once there's nothing to point at.
 */
export function nextGoal(w) {
  if (!ch2(w) || w.flags.ch2Done) return null;
  const F = w.flags;
  if (!F.clockFixed) return { id: "clock", line: "stuckClock", hot: "harbor.tower" };
  if (!F.cozy) return { id: "hal", line: "stuckHal", hot: "harbor.hal" };
  if (!F.metTamsin) return { id: "market", line: "stuckMarket", hot: "harbor.water" };
  if (!F.tamsinJoined) return { id: "menagerie", line: null, hot: "menagerie.beastkeeper" };
  if (!F.causewaySeen) return { id: "causeway", line: "stuckCauseway", hot: "lighthouse.barricade" };
  if (!F.tideSolved) return { id: "tunnel", line: "stuckTunnel", hot: F.petFood ? "sea_cave.steps" : "cove.cave" };
  if (!F.logbook) return { id: "lamp", line: null, hot: "lamp_room.desk" };
  if (!F.dockWon) return { id: "dock", line: "stuckDock", hot: "sword_dock.swordmaster" };
  if (!F.songPieces) return { id: "song", line: "stuckSong", hot: F.songBaker ? "hal_shop.hal" : "biscuit.baker" };
  if (!F.auditDone) return { id: "audit", line: null, hot: "harbor.water" };
  return { id: "engine", line: "stuckEngine", hot: F.engineWon ? "lighthouse.tower" : "lighthouse.barricade" };
}

/** Places visited with no progress before Kit says something, for each strength. */
export const STUCK_AFTER = [4, 6, 8, 10];

/**
 * He's arrived somewhere: count it toward Kit's nudges. Returns the new
 * strength (1 to 4) when it just went up, else 0.
 */
export function noteArrival(w) {
  const goal = nextGoal(w);
  if (!goal) {
    w.stuck = null;
    return 0;
  }
  if (!w.stuck || w.stuck.goal !== goal.id) w.stuck = { goal: goal.id, visits: 0, strength: 0 };
  w.stuck.visits += 1;
  const strength = STUCK_AFTER.filter((n) => w.stuck.visits >= n).length;
  if (strength > w.stuck.strength) {
    w.stuck.strength = strength;
    return strength;
  }
  return 0;
}

/** The hotspot glinting as "start here" (strength 3 and up), as "scene.hotspot". */
export const glintAt = (w) => (w.stuck?.strength >= 3 && nextGoal(w)?.id === w.stuck.goal ? nextGoal(w).hot : null);

/** The map place to light up (strength 4). */
export const trailGoal = (w) => (w.stuck?.strength >= 4 && nextGoal(w)?.id === w.stuck.goal ? nextGoal(w).hot.split(".")[0] : null);

const NUDGES = ["stuck1a", "stuck1b", "stuck1c"];

/** Kit's nudge at a strength (the "Where next?" button asks for at least a direction). */
export async function nudge(api, strength) {
  const w = api.world;
  const goal = nextGoal(w);
  if (!goal) return;
  if (strength <= 1 || !goal.line) {
    const n = (w.flags.nudges || 0) % NUDGES.length;
    w.flags.nudges = n + 1;
    api.save();
    await api.say(NUDGES[n]);
    if (strength <= 1) return;
  } else await api.say(goal.line);
  if (strength >= 3) {
    if (goal.hot.startsWith(`${w.scene}.`)) api.beckon?.(goal.hot.split(".")[1]);
    await api.say("stuckGlint");
  }
  if (strength >= 4) await api.say("stuckTrail");
}

// ---------------------------------------------------------------- arriving

/** Chapter 2 on arriving somewhere (after chapter 1's ARRIVE, if any). */
export const ARRIVE2 = {
  harbor: async (api) => {
    const w = api.world;
    if (!w.flags.seenHarbor) {
      set(api, "seenHarbor");
      await overCard(api, "harborArrive");
      return;
    }
    // beat 3: the market, once the clock is fixed and Kit has a hat
    if (f(w, "clockFixed", "cozy") && !w.flags.metTamsin) return market(api);
    // beat 9b: Clamp boards the Misspelled
    if (w.flags.dockWon && !w.flags.auditDone) return audit(api);
  },
  menagerie: (api) => once(api, "menagerieSeen", "menagerieArrive"),
  lighthouse: async (api) => {
    const w = api.world;
    if (!w.flags.causewaySeen) {
      set(api, "causewaySeen", "tideOut");
      await api.say("causewayGuarded");
    }
  },
  cove: async (api) => {
    const w = api.world;
    if (w.flags.tideOut && !w.flags.seenTideOut) {
      set(api, "seenTideOut");
      await api.wait(300);
      await api.say("coveTideOut");
    }
  },
  lamp_room: async (api) => {
    const w = api.world;
    if (w.flags.engineWon && !w.flags.ch2Done) return api.ending2();
    if (!w.flags.lampSeen) return keeper(api);
  },
  sea_cave: async (api) => {
    const w = api.world;
    // safe below, the night of the lamp room
    if (w.flags.escaped && !w.flags.songResolve) {
      set(api, "songResolve");
      await api.wait(600);
      await api.say("songResolve");
      await api.wait(500);
      return api.travel("camp");
    }
  },
  camp: async (api) => {
    const w = api.world;
    if (w.flags.escaped && !w.flags.campNight) {
      set(api, "campNight");
      await api.say("campNow");
      api.rest();
      await api.night?.();
      set(api, "dayTwo");
      await api.say("dayTwoMorning");
    }
  },
  temple_hall: async (api) => {
    if (api.world.flags.libraryOpen) await once(api, "hallGlowing", "hallGlowing");
  },
  sage_library: (api) => once(api, "libraryArrive", "libraryArrive"),
  lair_deep: async (api) => {
    const w = api.world;
    if (w.flags.lairDeepDone) return;
    if (!api.resumingFight) await api.say("lairDeep");
    const r = await api.ambush(["magnet_beetle", "scrap_raptor", "magnet_beetle"]);
    if (r.quit || !r.won) return;
    set(api, "lairDeepDone");
    await api.say("lairDeepDone");
  },
};

/** After the place's own arrival: dusk falls (beat 11), and Kit's nudges. */
export async function afterArrive(api) {
  const w = api.world;
  if (!ch2(w) || w.flags.ch2Done) return;
  if (f(w, "dockWon", "songPieces", "auditDone") && !w.flags.dusk) {
    set(api, "dusk");
    await api.wait(400);
    await api.say("duskFalls");
    return;
  }
  const strength = noteArrival(w);
  api.save();
  if (strength) {
    await api.wait(500);
    await nudge(api, strength);
  }
}

/** Map open: the first time after the lamp room, the island's remembering early (beat 10). */
export async function onMap(api) {
  const w = api.world;
  if (w.flags.gridSeen && !w.flags.mapRemembering) {
    set(api, "mapRemembering", "libraryOpen", "partsFound", "lairDeepOpen");
    await api.say("mapRemembering");
  }
}

// ---------------------------------------------------------------- exits

/** A chapter 2 exit: false to stay, or { to, at } to go somewhere other than its own `exit`. */
export const EXITS2 = {
  "sea_cave.steps": async (api) => {
    const w = api.world;
    if (w.flags.tideSolved) return true;
    await once(api, "tideSeen", "tideTable");
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("tide", { tier });
      if (solved === null) {
        await api.say("tideWait");
        return false;
      }
      if (solved) break;
      tier = 1;
      await api.say("tideMissed");
    }
    set(api, "tideSolved");
    api.sfx("sfx_puzzle_solved");
    await api.say("tideSolved");
    return true;
  },
  // down the stairs: the cellar and the tunnel, until the harbor remembers; then the front door
  "lamp_room.stairs": (api) => (api.world.flags.beaconwing ? { to: "lighthouse", at: [1000, 600] } : true),
};

// ---------------------------------------------------------------- the scripts

/** Pockets in both hats: Kit's line for the place, then he's off. */
const POCKETS = { harbor: "pocketsTwoHats", hal_shop: "pocketsHal", biscuit: "pocketsBiscuit", sword_dock: "pocketsDock", menagerie: "pocketsMenagerie", lighthouse: "pocketsLighthouse", sea_cave: "pocketsSeaCave" };
const pocketsScript = (scene) => async (api) => {
  const w = api.world;
  api.sfx("sfx_monkey");
  await api.say(POCKETS[scene]);
  // in the menagerie, with Tamsin about: she tries to register him
  if (scene === "menagerie" && w.flags.metTamsin) await talk(api, "pocketsNotAPet");
  await api.monkeyFlee("monkey");
  w.monkeys[scene] = true;
  api.save();
};

export const SCRIPTS2 = {
  // ---------------------------------------------------------------- the harbor
  "harbor.tower": async (api) => {
    const w = api.world;
    if (w.flags.clockFixed) return api.say("clockAgain");
    await once(api, "clockSeen", "clockTower");
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("clock", { tier });
      if (solved === null) return api.say("clockWait");
      if (solved) break;
      tier = 1;
      await api.say("clockMissed");
    }
    // CLONK: the hands drop into place, and Jumble wakes up
    set(api, "clockFixed");
    api.sfx("sfx_door_stone");
    api.shake(12, 700);
    api.refresh();
    await api.wait(700);
    // Jumble bursts out of the Misspelled at his first word, and floats over the water while he shouts
    const jumbleWakes = (line, i) => {
      if (i === 1) api.enter?.("jumble");
      if (line.cue) cueFor(api, line);
    };
    await api.say("clockFixed", jumbleWakes);
    api.hide?.("spellwright", false);
    await api.wait(500);
    // a flat foghorn, and Clamp walks up the dock from his cutter at the far end
    api.sfx("sfx_horn") || api.sfx("sfx_encounter");
    await api.enter?.("clamp", { from: "right" });
    await overCard(api, "clampArrives", { from: 3 });
    // Jumble sulks off to his ship with his fine; Clamp stays to close the lighthouse
    await api.vanish?.("jumble");
    await api.wait(300);
    const clampLeaves = (line) => line.cue === "leaves" && api.walkOff?.("clamp");
    await api.say("lighthouseSealed", clampLeaves);
    set(api, "sealed");
    api.refresh();
  },
  "harbor.tideboard": (api) => api.say(api.world.flags.clockFixed ? "clockAgain" : "clockTower"),
  "harbor.water": (api) => api.say(api.world.flags.sealed ? "barricade" : "clockTower"),
  "harbor.rest": (api) => restAt(api),
  "harbor.monkey": pocketsScript("harbor"),
  "harbor.fog1": (api) => fogSign(api, "fog1"),
  "harbor.fog2": (api) => fogSign(api, "fog2"),
  "harbor.fog3": (api) => fogSign(api, "fog3"),

  // ---------------------------------------------------------------- Honest Hal's
  "hal_shop.hal": (api) => hal(api),
  "hal_shop.board": (api) => api.say("halBoard"),
  "hal_shop.counter": (api) => api.say("halBoard"),
  "hal_shop.rack": (api) => (api.world.flags.halMet ? api.say("halAgain") : hal(api)),
  "hal_shop.cozy": (api) => (api.world.flags.cozy ? api.say("halBoard") : hal(api)),
  "hal_shop.rest": (api) => restAt(api),
  "hal_shop.monkey": pocketsScript("hal_shop"),

  // ---------------------------------------------------------------- the Salty Biscuit
  "biscuit.baker": (api) => baker(api),
  "biscuit.book": (api) => {
    const w = api.world;
    return api.say(w.flags.ch2Done ? "recipeBookFull" : w.flags.recipeBack ? "recipeBookOne" : "recipeBook");
  },
  "biscuit.oven": (api) => (api.world.flags.recipeBack ? api.say("recipeWait") : baker(api)),
  "biscuit.sacks": (api) => (api.world.flags.recipeBack ? api.say("recipeBookOne") : baker(api)),
  "biscuit.rest": (api) => restAt(api),
  "biscuit.monkey": pocketsScript("biscuit"),

  // ---------------------------------------------------------------- the menagerie
  "menagerie.beastkeeper": (api) => menagerie(api),
  "menagerie.tanks": (api) => api.say("tanks"),
  "menagerie.hammocks": (api) => api.say("tanks"),
  "menagerie.nests": (api) => nests(api),
  "menagerie.rest": (api) => restAt(api),
  "menagerie.monkey": pocketsScript("menagerie"),
  "menagerie.moth": (api) => api.say("tanks"),

  // ---------------------------------------------------------------- the lighthouse
  // at dusk the barricade is the way in: Clamp calls the inspection done and the Engine
  // clamps on (beat 11); the tower is only for the binding after the fight
  "lighthouse.barricade": (api) => {
    const F = api.world.flags;
    if (F.dusk && !F.beaconwing) return engine(api);
    return api.say(F.engineWon ? "lensAwake" : "barricade");
  },
  // a fight saved here before the barricade took it over still picks up here
  "lighthouse.tower": (api) => (api.world.flags.dusk && !api.world.flags.engineWon && !api.resumingFight ? api.say("lens") : engine(api)),
  "lighthouse.rest": (api) => restAt(api),
  "lighthouse.monkey": pocketsScript("lighthouse"),

  // ---------------------------------------------------------------- the cove at low tide, and the smugglers' cave
  "cove.bottle2": async (api) => {
    set(api, "bottle2");
    api.refresh();
    await api.say("bottleCh2");
    await api.give("jumble_note2");
  },
  "sea_cave.chest": async (api) => {
    const w = api.world;
    if (w.flags.petFood) return api.say("seaCaveKelp");
    set(api, "petFood");
    api.sfx("sfx_chest");
    await api.wait(300);
    await api.say("petFoodChest");
    await api.give("pet_food");
  },
  "sea_cave.kelp": (api) => api.say("seaCaveKelp"),
  "sea_cave.rest": (api) => restAt(api),
  "sea_cave.monkey": pocketsScript("sea_cave"),

  // ---------------------------------------------------------------- the lamp room
  "lamp_room.desk": (api) => logbook(api),
  "lamp_room.ceiling": (api) => api.grid?.(),
  "lamp_room.lens": (api) => api.say(api.world.flags.beaconwing ? "lensAwake" : "lens"),
  "lamp_room.chair": (api) => api.say(api.world.flags.logbook ? "logbookAgain" : "lens"),
  "lamp_room.keeper": (api) => api.say(api.world.flags.ch2Done ? "lensAwake" : "lens"),
  "lamp_room.rest": (api) => restAt(api),

  // ---------------------------------------------------------------- the Sword Master's dock
  "sword_dock.swordmaster": (api) => swordmaster(api),
  "sword_dock.chair": (api) => (api.world.flags.dockWon ? api.say("swordmasterAgain") : swordmaster(api)),
  "sword_dock.platform": (api) => (api.world.flags.dockWon ? api.say("swordmasterAgain") : swordmaster(api)),
  "sword_dock.forge": (api) => (api.world.flags.dockWon ? forgeVisit(api) : swordmaster(api)),
  "sword_dock.rest": (api) => restAt(api),
  "sword_dock.monkey": pocketsScript("sword_dock"),

  // ---------------------------------------------------------------- camp
  "camp.fire": (api) => api.say(api.world.flags.dayTwo ? "dayTwoMorning" : "campNow"),
  "camp.rest": (api) => restAt(api),

  // ---------------------------------------------------------------- old places, changed (beat 10)
  "sage_library.seat": (api) => once(api, "librarySeat", "librarySeat", "librarySeatAgain", { hot: "seat" }),
  "sage_library.lectern": async (api) => {
    if (api.world.flags.crestMap) return api.say("crestMap");
    set(api, "crestMap");
    await api.say("crestMap");
    await api.give("crest_map");
  },
  "sage_library.shelves": (api) => api.say("libraryArrive"),
  "sage_library.rest": (api) => restAt(api),
  "canyon.propeller": (api) => once(api, "albatrossParts", "albatrossParts", "albatrossPartsAgain", { hot: "propeller" }),
  "canyon.figurehead": (api) => once(api, "albatrossParts", "albatrossParts", "albatrossPartsAgain", { hot: "figurehead" }),
  "lair_deep.heart": (api) => api.say(api.world.flags.lairDeepDone ? "lairDeepDone" : "lairDeep"),
  "lair_deep.rest": (api) => restAt(api),
};

/** Using an item on a chapter 2 hotspot. */
export const USES2 = {
  "menagerie.beastkeeper": {
    pet_food: (api) => api.say("tanks"),
  },
};

const HAL_TOTALS = ["halTotal1", "halTotal2", "halTotal3"];
const HAL_CAUGHT = ["halCaught1", "halCaught2", "halCaught3"];

/** Conversations these scripts pick from a table or build a name for (for the story's tests). */
export const PICKED = [
  ...Object.values(POCKETS),
  ...HAL_TOTALS,
  ...HAL_CAUGHT,
  ...NUDGES,
  "fogSignSolved1",
  "fogSignSolved2",
  "fogSignSolved3",
  "stuckClock", "stuckHal", "stuckMarket", "stuckCauseway", "stuckTunnel", "stuckDock", "stuckSong", "stuckEngine",
  ...Object.values(PETS).map((p) => p.convo),
];

// ---------------------------------------------------------------- beat 2: the fog's signs

async function fogSign(api, id) {
  const w = api.world;
  if (w.flags[id]) return api.say("fogSignSolved2");
  if (!w.flags.fogSeen) {
    set(api, "fogSeen");
    await api.say("fogSign");
  }
  let tier = 2;
  for (;;) {
    const solved = await api.puzzle("fog", { tier, sign: id });
    if (solved === null) return;
    if (solved) break;
    tier = 1;
    await api.say("fogSignMissed");
  }
  const n = ["fog1", "fog2", "fog3"].filter((x) => x !== id && w.flags[x]).length;
  w.flags[id] ||= true; // the explore screen keeps the word he gave back, to draw on the sign
  api.save();
  api.sfx("sfx_puzzle_solved");
  api.refresh();
  await api.say(`fogSignSolved${n + 1}`);
}

// ---------------------------------------------------------------- beat 2: Hal


async function hal(api) {
  const w = api.world;
  if (!w.flags.cozy) {
    if (!w.flags.halMet) {
      set(api, "halMet");
      await api.say("halIntro");
      await api.say("halCheck");
    } else await api.say("halTotal1");
    // the tea cozy, "easy payments"
    if (!(await catchHal(api, 0))) return;
    await talk(api, "halCaught");
    return;
  }
  // beat 9: Maren asks about the song
  if (w.flags.lampSeen && !w.flags.songHal && has(w, "titancaller")) {
    set(api, "songHal");
    await api.say("songHal");
    return songPieces(api);
  }
  await api.say("halAgain");
  // pet food, or (once the Sword Master's forge is his again) a bag of blade bits: parts for it
  const options = ["Buy pet food", ...(w.flags.dockWon ? ["Buy blade bits"] : []), "Just looking"];
  const what = options[await api.choose(options)];
  if (what !== "Buy pet food" && what !== "Buy blade bits") return;
  const bits = what === "Buy blade bits";
  const n = (w.flags.halSales || 0) % 3;
  w.flags.halSales = (w.flags.halSales || 0) + 1;
  api.save();
  await api.say(HAL_TOTALS[n]);
  if (!(await catchHal(api, bits ? 2 : 1))) return;
  await api.say(HAL_CAUGHT[n]);
  if (bits) {
    addParts(w, HAL_BITS);
    api.save();
    api.gotParts?.(HAL_BITS, "Blade bits");
  } else if (!api.has("pet_food")) await api.give("pet_food");
}

/** Hal's wrong total, caught: true once he's worked out the real one (null: he stepped away). */
async function catchHal(api, item) {
  let tier = 2;
  for (;;) {
    const solved = await api.puzzle("hal", { tier, item });
    if (solved === null) return false;
    if (solved) return true;
    tier = 1;
    await api.say("halMissed");
  }
}

// ---------------------------------------------------------------- beat 2: the baker

async function baker(api) {
  const w = api.world;
  if (w.flags.recipeBack) {
    if (w.flags.lampSeen && !w.flags.songBaker && has(w, "titancaller")) {
      set(api, "songBaker");
      await api.say("songBaker");
      if (!api.has("biscuits")) await api.give("biscuits");
      return songPieces(api);
    }
    return api.say("recipeWait");
  }
  if (!w.flags.recipeSeen) {
    set(api, "recipeSeen");
    await api.say("biscuitIntro");
  }
  // the flour on the scale, then the milk in the jug
  for (const part of ["flour", "milk"]) {
    if (w.flags[`recipe_${part}`]) continue;
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("recipe", { tier, part });
      if (solved === null) return api.say("recipeWait");
      if (solved) break;
      tier = 1;
      await api.say("recipeMissed");
    }
    set(api, `recipe_${part}`);
    api.sfx("sfx_puzzle_solved");
  }
  set(api, "recipeBack");
  api.refresh();
  await talk(api, "recipeSolved");
  await api.give("biscuits");
}

/** Both pieces of the Lantern Song found: Maren puts them together (a quiet moment). */
async function songPieces(api) {
  const w = api.world;
  if (!f(w, "songBaker", "songHal") || w.flags.songPieces) return;
  await api.wait(600);
  await once(api, "songPieces", "songPieces", null, { hot: null });
}

// ---------------------------------------------------------------- beat 3: the market

async function market(api) {
  const w = api.world;
  if (!api.resumingFight) {
    await api.wait(400);
    await api.say("wildCagedFirst");
  }
  // the Caged Drone swoops down the street (Kit has said his line: none in the fight)
  const r = await api.ambush(["caged_drone"], { introLine: null });
  if (r.quit || !r.won) return; // it comes back next time he's in the harbor
  // it crashes into a fish stall; a girl with a crook gets there first
  api.sfx("sfx_quake");
  api.shake(10, 500);
  set(api, "metTamsin");
  await api.wait(600);
  await overCard(api, "tamsinMeets");
  await once(api, "tamsinGrandpa", "tamsinGrandpa", null, { hot: "tower" });
  await api.travel("menagerie", [300, 600]);
}

// ---------------------------------------------------------------- beat 4: the menagerie

async function menagerie(api) {
  const w = api.world;
  if (has(w, "beastkeeper")) return;
  // Rivet: the Scrap Raptor he caught in the canyon, or the one Clamp's drone dropped
  if (!w.flags.raptorTold) {
    set(api, "raptorTold");
    await api.say((api.captures?.scrap_raptor || 0) > 0 ? "raptorYours" : "raptorFresh");
  }
  if (!w.flags.fed) {
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("feed", { tier });
      if (solved === null) return api.say("feedWait");
      if (solved) break;
      tier = 1;
      await api.say("feedMissed");
    }
    set(api, "fed");
    await api.say("feedSolved");
  }
  if (!w.flags.weighed) {
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("weigh", { tier });
      if (solved === null) return api.say("feedWait");
      if (solved) break;
      tier = 1;
      await api.say("weighMissed");
    }
    set(api, "weighed");
    await api.say("weighSolved");
  }
  // his field note: what it looks like, what it does
  let note = "";
  for (;;) {
    const solved = await api.puzzle("note", { pet: PETS.rivet.name });
    if (solved === null) return api.say("noteWait");
    if (solved) {
      note = api.given || "";
      break;
    }
    await api.say("noteMissed");
  }
  hatchPet(w, "rivet", note);
  api.save();
  await talk(api, "rivetHatches");
  await api.petPop?.("rivet");
  await api.wait(400);
  await api.say("tamsinJoins");
  set(api, "tamsinJoined");
  await api.join("beastkeeper");
}

/** Beat 9: Tamsin remembers bigger fiends: one captured fiend at a time becomes a friend. */
async function nests(api) {
  const w = api.world;
  if (!has(w, "beastkeeper")) return api.say("tanks");
  if (!w.flags.dayTwo) return api.say("tanks");
  await once(api, "tamsinGrows", "tamsinGrows");
  // a pet ready to grow (its hero's hard answers: pets.js, petGrowth): a new form, a new field note
  const growing = Object.entries(w.pets || {}).find(([, p]) => p.ready);
  if (growing) {
    const [id] = growing;
    await api.say("petGrows");
    await api.say("petGrowsNote");
    for (;;) {
      const solved = await api.puzzle("note", { pet: PETS[id].name, grown: true });
      if (solved === null) return;
      if (solved) break;
      await api.say("petGrownMissed");
    }
    growPet(w, id, api.given || "");
    api.save();
    await api.petPop?.(id);
    return;
  }
  const [next] = rememberable(w, api.captures || {});
  if (!next) return;
  api.flash("#fff3c4");
  api.sfx("sfx_summon_rise");
  hatchPet(w, next);
  api.save();
  await api.petPop?.(next);
  await api.say(PETS[next].convo);
}

// ---------------------------------------------------------------- beat 7: the lamp room

async function keeper(api) {
  const w = api.world;
  set(api, "lampSeen");
  // the stairs: he climbs ahead of them, and doesn't notice
  await overCard(api, "keeperClimbs");
  await api.wait(800);
  // he hums the tune (the keeper's hum; nothing plays until it's made)
  const back = api.hush?.("keeper");
  try {
    if (api.playSong?.(KEEPER_HUM, { volume: 0.7 })) await api.wait(8000);
    else await api.wait(1500);
    await api.say("keeperHums", (line) => {
      if (line.cue === "leaves") {
        api.stopSong?.();
        set(api, "keeperLeft");
        api.walkOff?.("keeper");
      }
    });
  } finally {
    back?.();
  }
  api.beckon?.("desk");
}

async function logbook(api) {
  const w = api.world;
  if (w.flags.logbook) return api.say("logbookAgain");
  set(api, "logbook");
  // the open book by lantern light: the same line in the same shaky hand, page after page. No voice reads it.
  const back = api.hush?.("desk");
  try {
    const card = await api.card?.(CARDS.logbook, { draw: "logbook" });
    if (card) await card.done;
    card?.close?.();
    await api.wait(1200);
    await api.say("logbook");
    await api.wait(3000);
  } finally {
    back?.();
  }
  // the old crystal flares one last time: the Sage chart across the ceiling, and the Grid's first visit
  await talk(api, "crystalGrid");
  await api.grid?.({ first: true });
  await api.wait(600);
  api.flash("#ff4a4a");
  api.sfx("sfx_encounter");
  await api.say("lampDrones");
  set(api, "escaped");
  await api.travel("sea_cave", [1100, 610]);
}

// ---------------------------------------------------------------- beat 8: the Sword Master

async function swordmaster(api) {
  const w = api.world;
  if (w.flags.dockWon) return api.say("swordmasterAgain");
  if (!api.resumingFight) {
    if (!w.flags.metSwordmaster) {
      set(api, "metSwordmaster");
      await api.say("swordmasterIntro");
    } else if ((await api.choose(["Allow us.", "Not yet."])) !== 0) return;
  }
  // the crab in his chair: a big Barnacle Brute (DOCK_FIGHT)
  const r = await api.battle({ ...DOCK_FIGHT });
  if (r.quit || !r.won) return;
  set(api, "dockWon");
  api.refresh();
  await api.say("dockWon");
}

// ---------------------------------------------------------------- beat 8: the forge

/**
 * The Sword Master's forge, once his dock is won back: every hero's weapon,
 * forged up a step at a time for parts (forge.js). The forge window stays
 * open while he forges one weapon after another; each pick that the parts
 * cover gets the hammer and the Sword Master showing off.
 */
async function forgeVisit(api) {
  const w = api.world;
  if (forgeDone(w, w.party)) return api.say("forgeDone");
  if (!w.flags.forgeFirst) {
    set(api, "forgeFirst");
    await api.say("forgeFirst");
  }
  for (;;) {
    const cls = await api.forge?.();
    if (!cls) return;
    const r = forge(w, cls);
    api.save();
    if (!r.ok) {
      // "Not enough parts." is his line; when only the glimmer is short, the window says so
      if (r.why === "short") await (r.parts ? api.say("forgeShort") : api.forgeShort?.(cls));
      continue;
    }
    await api.forged?.(cls);
    if (forgeDone(w, w.party)) return api.say("forgeDone");
    await api.say("forgeUpgrade");
  }
}

// ---------------------------------------------------------------- beat 9b: Jumble's audit

async function audit(api) {
  const w = api.world;
  await api.wait(400);
  await api.say("auditSpotted");
  api.hide?.("spellwright", true);
  const state = { card: (await api.card?.(CARDS.jumbleAudit)) || null };
  await api.say("jumbleAudit", (line) => line.cue && cueFor(api, line, state));
  await api.wait(1500);
  await api.say("auditAfter", (line) => line.cue && cueFor(api, line, state));
  state.card?.close?.();
  api.holdMusic?.(false);
  api.hide?.("spellwright", false);
  set(api, "auditDone");
}

// ---------------------------------------------------------------- beat 11: the Drain Engine

async function engine(api) {
  const w = api.world;
  if (w.flags.beaconwing) return api.say("lensAwake");
  if (!w.flags.dusk) return api.say(w.flags.sealed ? "barricade" : "lens");
  // In the fight, its last bar stops everything: the keeper reaches the lens,
  // Maren sings, and he binds Beaconwing there (ui/battle.js, lensPause), so
  // the fight comes back with `lens` and `bound`. If it ended any other way
  // (Maren was down when the Engine fell), the binding happens here instead.
  let bound = null;
  if (!w.flags.engineWon) {
    if (!api.resumingFight) {
      if (!w.flags.engineArrived) {
        set(api, "engineArrived");
        await overCard(api, "engineArrives", { from: 1 });
      } else if ((await api.choose(["Positions!", "Not yet."])) !== 0) return;
    }
    const r = await api.battle({ ...BOSS_FIGHT2 });
    if (r.lens) set(api, "keeperLens");
    if (r.quit || !r.won) return;
    set(api, "engineWon");
    bound = r.bound || null;
    api.refresh();
  }
  // phase 2: the keeper reaches the lens. From here to the binding, no jokes and no Clamp.
  const back = api.hush?.("tower");
  try {
    let words = bound?.words || "";
    // Maren sings, the keeper hums under her, and he writes true words about the storm
    if (!bound && !w.flags.keeperLens) {
      set(api, "keeperLens");
      await talk(api, "engineKeeper");
    }
    // from the top: the verse and Hal's line under the writing (bound in the fight, it was sung there)
    if (!bound) api.playSong?.(LANTERN_SONG, { fallback: SONG_STAND_IN, volume: 0.55 });
    while (!bound) {
      const solved = await api.puzzle("bind", {});
      if (solved === null) {
        api.stopSong?.();
        return api.say("bindWait");
      }
      if (solved) {
        words = api.given || "";
        break;
      }
      await api.say("bindMissed");
    }
    w.bindWords = words;
    set(api, "beaconwing");
    // the chorus breaks: Beaconwing unfolds out of the lens, and his words are
    // read out over it (bound in the fight, they were read out as it rose)
    api.playSong?.(LANTERN_SONG, { fallback: SONG_STAND_IN, volume: 0.55, from: "chorus", once: true });
    const card = await api.card?.(CARDS.beaconwingRises);
    api.flash("#fff6c8");
    api.shake(14, 1200);
    api.sfx("sfx_summon_rise");
    api.songLevel?.(0.3); // the song steps back under his words and Clamp's
    if (words) {
      card?.write?.(words);
      if (!bound) await api.trailer?.(words);
    }
    await api.say("beaconwingRises");
    api.songLevel?.(0.55);
    api.hideLines?.();
    // the song's last line, alone (lanternLastLine): the card goes as she sings
    // "Goodnight", no lines, nobody explains. Hold to its last chord, then on.
    await api.songAt?.("goodnight", 30000);
    card?.close?.();
    if (!(await api.songEnd?.(40000))) await api.wait(4000);
    api.stopSong?.();
  } finally {
    back?.();
  }
  await api.wait(1200);
  await api.travel("lamp_room", [1100, 610]);
}

// ---------------------------------------------------------------- the chapter boundary

/**
 * Chapter 2 opens: chapter 1 is over (w.finished), and the party walks down
 * into the harbor. Pure: sets the world up; the explore screen shows the
 * title card and the harbor's own arrival plays the rest.
 */
export function openChapter2(w) {
  if (w.flags.ch2) return;
  w.flags.ch2 = true;
  w.scene = "harbor";
  w.pos = null;
  w.onMap = false;
  w.mapRide = null;
}
