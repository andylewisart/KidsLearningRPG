// Chapter 2 of the adventure, Driftwood Harbor (docs/story/chapter2-script.md):
// the harbor and the places off it, Tamsin's pets, and which fiends jump out
// where. Every place is a painting (art wave 08) with its things painted in,
// so each hotspot here is a painted object (world/painted.js moves it onto
// its measured box); `area`, x, y and approach are stand-ins for the boxes.
// data.js adds these to chapter 1's SCENES, ITEMS and MAP.

import { FIENDS } from "../battle/data.js";

/**
 * A chapter 2 fight. One with a fast fiend waits until the Beastkeeper has
 * joined (`needs`): nobody else can pin it down, so before then it would
 * dodge every hit there is (battle/engine.js, missReason).
 */
const foes = (fiends, weight = 1, extra = {}) => ({ fiends, weight, minParty: 3, ...(fiends.some((f) => FIENDS[f]?.fast) ? { needs: ["beastkeeper"] } : {}), ...extra });

/** A painted thing he can click: its stand-in box and ground, for when the painting isn't there. */
const thing = (id, name, verb, [x0, y0, x1, y1], [x, y], extra = {}) => ({ id, name, verb, area: [x0, y0, x1, y1], x, y, approach: [0, 60], ...extra });

/** Pockets, in his own tricorn with Kit's good one stacked on top (field_twohats), sitting on something painted. */
const pockets = (on, at, scale = 0.62) => ({ id: "monkey", name: "Pockets the monkey", verb: "Look at", sprite: "monkey", twoHats: true, x: 0, y: 0, size: [96, 110], approach: [0, 60], paintedPerch: { on, at, scale } });

const WALK = (top) => [
  [-150, top],
  [1430, top],
  [1450, 676],
  [-170, 676],
];

export const SCENES2 = {
  harbor: {
    name: "Driftwood Harbor",
    backgrounds: ["bg_harbor_docks"],
    battleBackground: ["bg_harbor_docks"],
    painted: "scene_harbor",
    music: "music_cove",
    ambience: "amb_cove",
    walk: WALK(552),
    start: [300, 620],
    fromMap: [-40, 620],
    hotspots: [
      thing("hal", "Honest Hal's Previously Plundered Goods", "Go into", [-184, 171, 121, 521], [59, 520], { exit: { to: "hal_shop", at: [140, 560] } }),
      thing("tower", "clock tower", "Look at", [379, -207, 550, 271], [468, 268]),
      thing("tideboard", "tide board", "Read", [619, 274, 788, 517], [707, 515]),
      thing("biscuit", "the Salty Biscuit", "Go into", [1191, 210, 1480, 550], [1348, 545], { exit: { to: "biscuit", at: [1240, 560] } }),
      thing("water", "the harbor", "Look at", [205, 347, 1225, 540], [715, 540]),
      thing("rest", "rest crystal", "Rest at", [889, 346, 1032, 537], [960, 532]),
      pockets("tower", [0.5, 0.86]),
      // the fog's street signs, drawn by the game on painted walls (fogSign: which painted thing, and where on it)
      { id: "fog1", name: "foggy sign", verb: "Read", fogSign: { on: "hal", at: [0.62, 0.1, 0.98, 0.24] }, x: 60, y: 520, size: [110, 50], approach: [0, 60] },
      { id: "fog2", name: "foggy sign", verb: "Read", fogSign: { on: "tideboard", at: [0.08, 0.04, 0.92, 0.2] }, x: 707, y: 515, size: [110, 50], approach: [0, 60] },
      { id: "fog3", name: "foggy sign", verb: "Read", fogSign: { on: "biscuit", at: [0.02, 0.06, 0.4, 0.2] }, x: 1260, y: 545, size: [110, 50], approach: [0, 60] },
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 620, size: [120, 220], map: true },
    ],
    // before Tamsin joins, only the fog and the moths (the first afternoon)
    encounters: [
      foes(["fog_glob", "crumb_goblin"], 3),
      foes(["crumb_goblin", "crumb_goblin"], 2),
      foes(["wick_moth", "fog_glob"], 2),
      foes(["fog_glob", "fog_glob"], 1),
      foes(["tick_mimic", "crumb_goblin", "fog_glob"], 1),
    ],
  },
  hal_shop: {
    name: "Honest Hal's",
    backgrounds: ["bg_harbor_docks"],
    battleBackground: ["bg_harbor_docks"],
    painted: "scene_hal_shop",
    music: "music_cove",
    walk: WALK(424),
    start: [140, 560],
    hotspots: [
      thing("board", "price board", "Read", [310, -27, 456, 154], [383, 154]),
      thing("counter", "the counter", "Look at", [437, 188, 900, 412], [669, 408]),
      thing("rack", "rack of blades", "Look at", [1023, -49, 1274, 420], [1148, 415]),
      thing("cozy", "admiral's hat", "Look at", [1338, -24, 1482, 340], [1409, 335]),
      thing("rest", "rest crystal", "Rest at", [-150, 205, 18, 442], [-66, 438]),
      { id: "hal", name: "Honest Hal", verb: "Talk to", sprite: "hal", x: 900, y: 486, size: [150, 238], approach: [-150, 30], face: "left" },
      pockets("rack", [0.55, 0.4], 0.7),
      { id: "out", name: "door to the harbor", verb: "Go out", edge: "left", hidden: true, x: -150, y: 600, size: [120, 220], exit: { to: "harbor", at: [170, 600] } },
    ],
    encounters: [],
  },
  biscuit: {
    name: "The Salty Biscuit",
    backgrounds: ["bg_harbor_docks"],
    battleBackground: ["bg_harbor_docks"],
    painted: "scene_biscuit",
    // the painting's camera stands close, at a grown-up's eye height: heads near its horizon
    people: { eyeY: 140, scale: 2.1 },
    music: "music_cove",
    // behind the corner table at the left (it's drawn in front of whoever is behind it), never in front of it
    walk: [
      [-150, 432],
      [1430, 432],
      [1450, 640],
      [120, 640],
      [-170, 590],
    ],
    // the corner table, its stools and the barrel are nearer than this row, so they're drawn in front of the people
    inFrontFrom: 590,
    start: [140, 600],
    hotspots: [
      thing("sacks", "flour sacks", "Look at", [61, 225, 306, 439], [176, 436]),
      thing("book", "recipe book", "Read", [503, 194, 692, 257], [597, 449]),
      thing("oven", "the oven", "Look at", [844, -73, 1232, 420], [1040, 417]),
      thing("rest", "rest crystal", "Rest at", [1303, 113, 1477, 477], [1376, 468]),
      { id: "baker", name: "the baker", verb: "Talk to", sprite: "baker", x: 820, y: 506, size: [120, 190], approach: [-210, 30], face: "left" },
      pockets("sacks", [0.5, 0.12], 0.7),
      { id: "out", name: "door to the harbor", verb: "Go out", edge: "left", hidden: true, x: -150, y: 600, size: [120, 220], exit: { to: "harbor", at: [1230, 600] } },
    ],
    encounters: [],
  },
  sword_dock: {
    name: "The Sword Master's Dock",
    backgrounds: ["bg_harbor_docks"],
    battleBackground: ["bg_harbor_docks"],
    painted: "scene_sword_dock",
    music: "music_cove",
    ambience: "amb_cove",
    walk: WALK(482),
    start: [120, 620],
    fromMap: [-40, 620],
    hotspots: [
      thing("platform", "dueling platform", "Look at", [728, 109, 1454, 413], [1091, 413]),
      thing("forge", "the forge", "Use", [-215, -56, 195, 465], [20, 456]),
      thing("chair", "armchair", "Look at", [256, 74, 734, 477], [512, 473]),
      thing("rest", "rest crystal", "Rest at", [1212, 228, 1471, 629], [1330, 617]),
      { id: "swordmaster", name: "the Sword Master", verb: "Talk to", sprite: "swordmaster", x: 1000, y: 560, size: [150, 238], approach: [-150, 20], face: "left" },
      pockets("chair", [0.3, 0.2], 0.7),
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 620, size: [120, 220], map: true },
    ],
    encounters: [foes(["barnacle_brute", "riptide_eel"], 2), foes(["riptide_eel", "riptide_eel"], 1), foes(["barnacle_brute", "fog_glob"], 1), foes(["barnacle_brute", "crumb_goblin", "riptide_eel"], 1)],
  },
  menagerie: {
    name: "Tamsin's Menagerie",
    backgrounds: ["bg_harbor_docks"],
    battleBackground: ["bg_harbor_docks"],
    painted: "scene_menagerie",
    music: "music_cove",
    walk: WALK(452),
    start: [80, 600],
    fromMap: [-40, 600],
    hotspots: [
      thing("hammocks", "hammocks", "Look at", [232, -231, 1480, 128], [856, 128]),
      thing("tanks", "tanks", "Look at", [-220, -189, 406, 450], [111, 440]),
      thing("nests", "nests", "Look at", [799, 348, 1488, 610], [1118, 601]),
      thing("rest", "rest crystal", "Rest at", [1215, 144, 1431, 431], [1334, 420]),
      { id: "beastkeeper", name: "Tamsin", verb: "Talk to", sprite: "beastkeeper", x: 660, y: 560, size: [150, 196], approach: [-150, 20], face: "left" },
      pockets("tanks", [0.6, 0.6], 0.7),
      // the baby Wick Moth from the cage, on the glass jar by the tanks (nobody's pet yet); it shows once wave 09 paints it
      { id: "moth", name: "the baby Wick Moth", verb: "Look at", sprite: "pet_moth_1", ifPainted: true, x: 0, y: 0, size: [70, 70], approach: [0, 60], paintedPerch: { on: "tanks", at: [0.25, 0.7], scale: 0.75 } },
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 600, size: [120, 220], map: true },
    ],
    encounters: [],
  },
  lighthouse: {
    name: "The Lighthouse",
    backgrounds: ["bg_lighthouse_rocks"],
    battleBackground: ["bg_lighthouse_rocks"],
    painted: "scene_lighthouse",
    music: "music_canyon",
    ambience: "amb_cove",
    walk: WALK(482),
    start: [100, 620],
    fromMap: [-40, 620],
    hotspots: [
      thing("tower", "the lighthouse", "Look at", [811, -276, 1017, 161], [919, 153]),
      thing("barricade", "barricade", "Read", [375, 113, 939, 460], [642, 447]),
      thing("rest", "rest crystal", "Rest at", [191, 187, 351, 477], [267, 467]),
      pockets("barricade", [0.2, 0.45]),
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 620, size: [120, 220], map: true },
    ],
    encounters: [foes(["caged_drone", "wick_moth"], 2), foes(["wick_moth", "wick_moth"], 1), foes(["caged_drone", "barnacle_brute", "wick_moth"], 1)],
  },
  lamp_room: {
    name: "The Lamp Room",
    backgrounds: ["bg_lighthouse_rocks"],
    battleBackground: ["bg_lighthouse_rocks"],
    painted: "scene_lamp_room",
    music: "music_temple",
    walk: WALK(490),
    start: [1290, 610],
    hotspots: [
      // the Sage chart across the ceiling (once the old crystal throws it there): it's above the screen, so the top of the screen takes its clicks (lookUp)
      thing("ceiling", "the Sage chart", "Look at", [-41, -308, 1292, 90], [626, 90], { lookUp: 90 }),
      thing("desk", "the logbook", "Read", [-6, 252, 493, 486], [242, 476]),
      thing("lens", "the great lens", "Look at", [462, -91, 997, 424], [732, 414]),
      thing("chair", "the keeper's chair", "Look at", [965, 185, 1218, 459], [1082, 452]),
      thing("rest", "rest crystal", "Rest at", [-156, 121, 39, 486], [-61, 480]),
      { id: "keeper", name: "the keeper", verb: "Look at", sprite: "keeper", x: 960, y: 505, size: [150, 238], approach: [-150, 40], face: "left" },
      // down the stairs: to the cellar and the tunnel, or (once the harbor remembers) the front door (EXITS in story)
      { id: "stairs", name: "stairs down", verb: "Go down", edge: "right", hidden: true, x: 1430, y: 610, size: [120, 220], exit: { to: "sea_cave", at: [1100, 600] } },
    ],
    encounters: [],
  },
  sea_cave: {
    name: "The Smugglers' Cave",
    backgrounds: ["bg_tide_grotto", "bg_harbor_docks"],
    battleBackground: ["bg_tide_grotto", "bg_harbor_docks"],
    painted: "scene_sea_cave",
    music: "music_cove",
    ambience: "amb_cove",
    walk: WALK(492),
    start: [60, 610],
    hotspots: [
      thing("kelp", "glow-kelp", "Look at", [100, -308, 1247, 372], [674, 372]),
      thing("chest", "smugglers' chest", "Open", [427, 292, 631, 432], [534, 429]),
      thing("rest", "rest crystal", "Rest at", [793, 175, 1017, 465], [901, 453]),
      thing("steps", "steps up", "Climb", [1008, -72, 1499, 469], [1147, 466], { exit: { to: "lamp_room", at: [1250, 610] } }),
      pockets("chest", [0.5, 0.06], 0.7),
      { id: "out", name: "the cove", verb: "Go out", edge: "left", hidden: true, x: -150, y: 610, size: [120, 220], exit: { to: "cove", at: [520, 600] } },
    ],
    encounters: [foes(["riptide_eel", "fog_glob"], 2), foes(["fog_glob", "barnacle_brute"], 1), foes(["barnacle_brute", "riptide_eel"], 1)],
  },
  sage_library: {
    name: "The Sage Library",
    backgrounds: ["bg_temple_hall", "bg_jungle_ruins"],
    battleBackground: ["bg_temple_hall", "bg_jungle_ruins"],
    painted: "scene_sage_library",
    music: "music_temple",
    ambience: "amb_temple",
    walk: WALK(484),
    start: [60, 610],
    hotspots: [
      thing("shelves", "shelves of books", "Look at", [194, -176, 1482, 438], [838, 438]),
      thing("seat", "an empty seat", "Look at", [544, 225, 838, 469], [696, 465]),
      thing("lectern", "lectern", "Read", [899, 158, 1183, 492], [1045, 487]),
      thing("rest", "rest crystal", "Rest at", [191, 200, 400, 478], [306, 474]),
      { id: "out", name: "the Hall of Glyphs", verb: "Go out", edge: "left", hidden: true, x: -150, y: 610, size: [120, 220], exit: { to: "temple_hall", at: [658, 520] } },
    ],
    encounters: [foes(["fog_glob", "fog_glob"], 1)],
  },
  lair_deep: {
    name: "The Deep Lair",
    backgrounds: ["bg_crystal_canyon"],
    battleBackground: ["bg_crystal_canyon"],
    painted: "scene_lair_deep",
    music: "music_canyon",
    ambience: "amb_canyon",
    walk: WALK(494),
    start: [60, 610],
    hotspots: [
      thing("heart", "glittering crystals", "Look at", [713, -17, 1142, 465], [928, 460]),
      thing("rest", "rest crystal", "Rest at", [239, 198, 472, 479], [359, 473]),
      { id: "out", name: "the canyon", verb: "Go out", edge: "left", hidden: true, x: -150, y: 610, size: [120, 220], exit: { to: "canyon", at: [1060, 600] } },
    ],
    encounters: [],
  },
  camp: {
    name: "Camp",
    backgrounds: ["bg_shipwreck_cove"],
    battleBackground: ["bg_shipwreck_cove"],
    painted: "scene_camp",
    music: "music_title",
    ambience: "amb_cove",
    walk: WALK(530),
    start: [380, 610],
    hotspots: [
      thing("fire", "campfire", "Sit by", [472, 293, 821, 524], [644, 520]),
      thing("rest", "rest crystal", "Rest at", [650, 55, 809, 355], [734, 350]),
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 620, size: [120, 220], map: true },
    ],
    encounters: [],
  },
};

/** The new bottle at the cove (prop_bottle_ch2), drawn over the painting; and the sea cave under the old wreck. */
export const COVE2 = {
  bottle2: { id: "bottle2", name: "green bottle", verb: "Pick up", prop: "bottle_ch2", drawn: true, x: 300, y: 640, size: [70, 54], flat: true, approach: [90, -6] },
  caveExit: { to: "sea_cave", at: [60, 610] },
  libraryDoor: { to: "sage_library", at: [60, 610] },
};

export const ITEMS2 = {
  pet_food: {
    name: "Pet Food",
    icon: "pet_food",
    blurb: "A smugglers' tin of fish and crunchy bits. Smells like fish and good intentions.",
  },
  biscuits: {
    name: "Salty Biscuits",
    icon: "biscuit",
    blurb: "Biscuits for the road, from the Salty Biscuit. They mend almost anything.",
  },
  jumble_note2: {
    name: "Jumble's Second Note",
    icon: "bottle",
    blurb: "\"I have scrambled your clock.\" Dated wrongly. Signed with even more flourishes.",
  },
  crest_map: {
    name: "Crest Map",
    icon: "crest_map",
    blurb: "A Sage crest map from the library. It points to a Legendary Weapon, somewhere.",
  },
};

/**
 * Tamsin's creatures: a captured fiend, given its name back (docs/story/chapter2-script.md,
 * beats 4 and 9). Each has a species (its pet_<species>_<stage> sheets, and what
 * it does in a fight: battle/engine.js, PET_KINDS), a hero it goes to and fights
 * beside, and the fiend it's remembered from (a capture in battle).
 */
export const PETS = {
  rivet: { name: "Rivet", species: "raptor", owner: "knight", from: "scrap_raptor", convo: "rivetHatches" },
  fizz: { name: "Fizz", species: "jelly", owner: "gunner", from: "volt_jelly", convo: "petJelly" },
  blot: { name: "Blot", species: "slime", owner: "spellwright", from: "ink_slime", convo: "petSlime" },
  chime: { name: "Chime", species: "tide", owner: "titancaller", from: "barnacle_brute", convo: "petTide" },
};

/** The island map's chapter 2 places (on the harbor_open painting) and trails. `chapter: 2` places show once their trail opens. */
export const MAP2 = {
  places: {
    menagerie: { name: "The Menagerie", scene: "menagerie", at: [674, 310], chapter: 2 },
    sword_dock: { name: "Sword Master's Dock", scene: "sword_dock", at: [937, 336], chapter: 2 },
    // its name above, clear of the party's token at the harbor just below it
    lighthouse: { name: "The Lighthouse", scene: "lighthouse", scenes: ["lighthouse", "lamp_room"], at: [814, 164], chapter: 2, nameAbove: true },
  },
  trails: [
    { a: "harbor", b: "menagerie", needs: "metTamsin" },
    { a: "harbor", b: "sword_dock", needs: "dayTwo" },
    { a: "harbor", b: "lighthouse", needs: "tamsinJoined" },
  ],
};

/**
 * The crab in the Sword Master's chair (beat 8): a big Barnacle Brute, Cade's
 * to crack, and Tamsin's to feed if he wants to keep it (Chime comes from one).
 */
export const DOCK_FIGHT = {
  id: "dock",
  title: "The crab in the chair",
  fiends: ["barnacle_brute"],
  party: ["knight", "spellwright", "beastkeeper"],
  reserve: ["gunner", "titancaller"],
  scale: { hp: 1.65, atk: 1.6 }, // a full party's wild fight (data.js, WILD_SCALE[3]), with half again the shell
  chapter: 2,
  introLine: "wildBrute",
};

/**
 * Chapter 2's fights to jump straight into, for checking art and rules
 * (?battle=h1 … h4, or ?battle=engine for the boss: src/main.js): all five
 * heroes, their pets at all three stages, and Kit's line from the script.
 * Between them, all seven of the chapter's fiends: h1 starts with Tamsin's
 * Overdrive full (her lesson); h2 throws two fast fiends at once, one that
 * steals a potion; h3 brings the Caged Drone to the lighthouse rocks; h4 is
 * the crab in the chair.
 */
export const HERO_PETS = { knight: { id: "rivet", species: "raptor", stage: 1 }, gunner: { id: "fizz", species: "jelly", stage: 2 }, spellwright: { id: "blot", species: "slime", stage: 3 }, titancaller: { id: "chime", species: "tide", stage: 1 } };
const WILD = { scale: { hp: 1.1, atk: 1.6 }, chapter: 2 }; // a full party's wild fight (data.js, WILD_SCALE[3])
export const HARBOR_TRIALS = [
  { ...WILD, id: "h1", title: "Crumb Raid", background: "bg_harbor_docks", fiends: ["crumb_goblin", "crumb_goblin", "fog_glob"], party: ["knight", "spellwright", "beastkeeper"], reserve: ["gunner", "titancaller"], odLesson: "beastkeeper", introLine: "tamsinFirstFight" },
  { ...WILD, id: "h2", title: "Low Tide", background: "bg_harbor_docks", fiends: ["tick_mimic", "riptide_eel", "barnacle_brute"], party: ["knight", "gunner", "beastkeeper"], reserve: ["spellwright", "titancaller"], introLine: "wildMimic" },
  { ...WILD, id: "h3", title: "Moths at the Lamp", background: "bg_lighthouse_rocks", fiends: ["caged_drone", "wick_moth", "fog_glob"], party: ["knight", "spellwright", "gunner"], reserve: ["titancaller", "beastkeeper"], introLine: "wildCaged" },
  { ...DOCK_FIGHT, id: "h4", background: "bg_harbor_docks" },
].map((t) => ({ ...t, pets: HERO_PETS }));

/**
 * The chapter's boss: Clamp's Drain Engine on the lighthouse (beat 11). Tamsin
 * fights for her grandpa's tower, the Titan Caller to summon (her Overdrive
 * fills after its entrance), Cade to hold the line; Wren and Knox wait on the
 * bench. Its last bar stops the fight for the keeper at the lens, and only
 * Beaconwing can finish it (battle/data.js, ui/battle.js lensPause).
 */
export const BOSS_FIGHT2 = {
  id: "engine",
  title: "The Drain Engine",
  fiends: ["drain_engine"],
  party: ["knight", "titancaller", "beastkeeper"],
  reserve: ["gunner", "spellwright"],
  boss: true,
  chapter: 2,
  background: "bg_lighthouse_rocks",
  introLine: "engineIntro",
};
