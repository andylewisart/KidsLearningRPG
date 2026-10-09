// Driftwood Isle, chapter 1 of the adventure (docs/world.md): the places he
// walks through, the things he can look at, pick up and talk to, and which
// fiends jump out where. The story itself (who says what, what unlocks
// what) is in story.js.
//
// Positions are stage pixels on the ground with the camera centered. A
// scene is wider than the screen: x runs from about −150 to 1430, and y
// from about 455 (far away, drawn small) to 675 (close, drawn big).

/** The order heroes join in, which is also their battle order. */
export const PARTY_ORDER = ["knight", "spellwright", "gunner", "titancaller"];

export const ITEMS = {
  rubbery_fish: {
    name: "Rubbery Fish",
    icon: "fish",
    blurb: "It squeaks when you squeeze it. Nobody knows why it was in a tide pool.",
  },
  power_cell: {
    name: "Power Cell",
    icon: "cell",
    blurb: "The Captain's blaster battery. Slightly sticky. Smells like monkey.",
  },
  jumble_note: {
    name: "Jumble's Note",
    icon: "note",
    blurb: "A gloating note from Captain Jumble, signed with a lot of flourishes. There's a P.S. on the back about his door.",
  },
  pulley: {
    name: "Rigging Pulley",
    icon: "rope",
    blurb: "A brass pulley off the Albatross's rigging. Hook it on a rope, hold on tight, and wheee.",
  },
};

/** Potions carry between fights: he starts with this many, and a rest crystal tops them back up. */
export const POTIONS = { start: 3, rest: 3 };

/**
 * Fiend strength for a party of 1, 2 or 3+ heroes. Health carries from fight
 * to fight, so a fight should cost some: tuned with a simulation so that
 * winning on ★ moves alone is possible but costly, and mixing in harder
 * moves keeps the party healthy. Gentle while Cade is alone.
 */
export const WILD_SCALE = {
  1: { hp: 0.8, atk: 0.7 },
  2: { hp: 0.95, atk: 1 },
  3: { hp: 1.1, atk: 1.6 },
};

/**
 * Scenes: name, backgrounds (the first one with art is drawn), battleBackground,
 * painted (the art wave 04 painting with its objects painted in, used once it
 * lands), tint (a stand-in look until a new place has art), walk (where he can
 * go), start, fromMap (where he arrives from the island map), hotspots, encounters.
 *
 * Hotspots:
 *   id, name, verb   what the hover label says: "Look at old shipwreck"
 *   x, y             where it stands on the ground
 *   prop             a drawn object (props.js), or sprite: a character id
 *   size             [w, h] in stage pixels at the reference depth
 *   lift             drawn this far above its ground point (a monkey on a wreck)
 *   flat             lies on the ground (a tide pool): no shadow, no sorting above the hero
 *   approach         [dx, dy] where the hero stands to use it, relative to x, y
 *   exit             { to, at: [x, y] }: walking here leads to another scene
 *   map              walking here opens the island map
 *   edge             "left" | "right": an exit at the edge of the scene, shown as an arrow
 *   hidden           not drawn (an exit at the edge), but still clickable
 *   area             [x1, y1, x2, y2]: something painted in the background (no prop);
 *                    clicking inside the box uses it, and y is where it meets the ground
 * In a painted scene (art wave 04, world/painted.js) the painting's measured
 * boxes replace x, y, size and approach for everything painted in, and:
 *   paintedPerch     { on, at: [fx, fy], scale }: a sprite sits on that painted
 *                    thing, at that fraction of its box (the monkey on the
 *                    signpost), drawn at `scale` of its size
 *   inPainting       { inside, until, box }: a character painted in for now (Knox
 *                    in his cage) until that world flag; box is the fraction of
 *                    the holder's box he's clickable in
 * Anything that comes and goes (the cage, the monkey) is decided in story.js.
 */
export const SCENES = {
  cove: {
    name: "Shipwreck Cove",
    backgrounds: ["bg_shipwreck_cove", "bg_jungle_ruins"],
    battleBackground: ["bg_shipwreck_cove", "bg_jungle_ruins"],
    painted: "scene_cove",
    music: "music_cove",
    ambience: "amb_cove",
    walk: [
      [-150, 432],
      [1440, 432],
      [1460, 676],
      [-170, 676],
    ],
    start: [420, 600],
    fromMap: [-60, 580],
    hotspots: [
      { id: "wreck", name: "old shipwreck", verb: "Look at", area: [110, 40, 1300, 345], x: 700, y: 345, approach: [0, 130] },
      { id: "monkey", name: "three-eyed monkey", verb: "Look at", sprite: "monkey", x: 1085, y: 446, size: [96, 110], approach: [-150, 40], paintedPerch: { on: "sign", at: [0.5, 0.03], scale: 0.62 } },
      { id: "sign", name: "signpost", verb: "Read", prop: "signpost", x: 640, y: 474, size: [186, 260], approach: [0, 70] },
      { id: "pool", name: "tide pool", verb: "Look in", prop: "tide_pool", x: 930, y: 628, size: [270, 84], flat: true, approach: [-160, -8] },
      { id: "chest", name: "old chest", verb: "Open", prop: "chest", x: 160, y: 560, size: [140, 110], approach: [120, 24] },
      { id: "bottle", name: "bottle", verb: "Pick up", prop: "bottle", x: 470, y: 656, size: [46, 64], flat: true, approach: [76, -12] },
      { id: "rest", name: "rest crystal", verb: "Rest at", prop: "rest_crystal", x: 330, y: 455, size: [90, 150], approach: [70, 50] },
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 560, size: [120, 220], map: true },
      { id: "gate", name: "Sage gate", verb: "Go through", prop: "sage_gate", x: 1225, y: 500, size: [230, 330], approach: [-140, 70], exit: { to: "canyon", at: [70, 610] } },
    ],
    encounters: [
      { fiends: ["scrap_raptor"], weight: 3 },
      { fiends: ["magnet_beetle"], weight: 2 },
      { fiends: ["scrap_raptor", "scrap_raptor"], minParty: 2, weight: 2 },
      { fiends: ["magnet_beetle", "scrap_raptor"], minParty: 2, weight: 1 },
    ],
  },
  temple: {
    name: "The Temple Ruins",
    backgrounds: ["bg_jungle_ruins"],
    battleBackground: ["bg_jungle_ruins"],
    painted: "scene_temple",
    music: "music_temple",
    ambience: "amb_temple",
    walk: [
      [-140, 428],
      [1430, 428],
      [1450, 676],
      [-160, 676],
    ],
    start: [1190, 590],
    fromMap: [1190, 590],
    hotspots: [
      { id: "door", name: "round stone door", verb: "Look at", prop: "temple_door", x: 520, y: 432, size: [300, 330], approach: [0, 120], exit: { to: "temple_hall", at: [-40, 570] } },
      { id: "glyphs", name: "wall of glowing glyphs", verb: "Read", prop: "glyph_wall", x: 90, y: 440, size: [300, 230], approach: [40, 96] },
      { id: "frog", name: "stone frog", verb: "Look at", prop: "stone_frog", x: 1120, y: 600, size: [140, 130], approach: [-130, 14] },
      { id: "pillar", name: "broken pillar", verb: "Look at", prop: "pillar", x: 978, y: 420, size: [110, 200], approach: [-40, 90] },
      { id: "monkey", name: "three-eyed monkey", verb: "Look at", sprite: "monkey", x: 978, y: 409, size: [96, 110], lift: 186, approach: [-40, 80], paintedPerch: { on: "frog", at: [0.44, 0.06], scale: 0.75 } },
      { id: "rest", name: "rest crystal", verb: "Rest at", prop: "rest_crystal", x: 300, y: 446, size: [90, 150], approach: [70, 60] },
      { id: "east", name: "island map", verb: "Go to", edge: "right", hidden: true, x: 1430, y: 580, size: [120, 220], map: true },
    ],
    encounters: [
      { fiends: ["scrap_raptor"], weight: 2 },
      { fiends: ["ink_slime"], needs: ["spellwright"], weight: 3 },
      { fiends: ["ink_slime", "scrap_raptor"], needs: ["spellwright"], minParty: 2, weight: 2 },
      { fiends: ["ink_slime", "ink_slime"], needs: ["spellwright"], minParty: 2, weight: 1 },
    ],
  },
  temple_hall: {
    name: "The Hall of Glyphs",
    backgrounds: ["bg_temple_hall", "bg_jungle_ruins"],
    battleBackground: ["bg_temple_hall", "bg_jungle_ruins"],
    painted: "scene_temple_hall",
    tint: "hall", // until its own painting lands: the jungle ruins, darkened like a hall
    music: "music_temple",
    ambience: "amb_temple",
    walk: [
      [-140, 440],
      [1430, 440],
      [1450, 676],
      [-160, 676],
    ],
    start: [-40, 570],
    hotspots: [
      { id: "spellwright", name: "Knox the Spellwright", verb: "Talk to", sprite: "spellwright", x: 760, y: 470, size: [190, 248], lift: 22, approach: [170, 70], inPainting: { inside: "cage", until: "cageOpen", box: [0.22, 0.38, 0.78, 0.94] } },
      { id: "cage", name: "cage of scrambled words", verb: "Look at", prop: "word_cage", x: 760, y: 474, size: [210, 270], approach: [170, 66] },
      { id: "tablets", name: "shelves of stone tablets", verb: "Look at", prop: "tablets", x: 130, y: 452, size: [260, 210], approach: [60, 96] },
      { id: "mural", name: "glowing mural", verb: "Look at", prop: "mural", x: 1200, y: 444, size: [260, 230], approach: [-60, 110] },
      { id: "rest", name: "rest crystal", verb: "Rest at", prop: "rest_crystal", x: 430, y: 470, size: [90, 150], approach: [70, 56] },
      { id: "out", name: "doorway outside", verb: "Go out", edge: "left", hidden: true, x: -150, y: 570, size: [120, 220], exit: { to: "temple", at: [520, 560] } },
    ],
    encounters: [
      { fiends: ["scrap_raptor"], weight: 1 },
      { fiends: ["ink_slime"], needs: ["spellwright"], weight: 3 },
      { fiends: ["ink_slime", "ink_slime"], needs: ["spellwright"], minParty: 2, weight: 1 },
    ],
  },
  canyon: {
    name: "The Crystal Canyon",
    backgrounds: ["bg_crystal_canyon"],
    battleBackground: ["bg_crystal_canyon"],
    painted: "scene_canyon",
    music: "music_canyon",
    ambience: "amb_canyon",
    walk: [
      [-150, 446],
      [1430, 446],
      [1450, 676],
      [-170, 676],
    ],
    start: [70, 610],
    fromMap: [70, 610],
    hotspots: [
      { id: "airship", name: "wreck of the Brass Albatross", verb: "Look at", prop: "airship_wreck", x: 200, y: 470, size: [520, 300], approach: [220, 96] },
      { id: "gunner", name: "Captain Wren", verb: "Talk to", sprite: "gunner", x: 260, y: 612, size: [150, 196], approach: [150, 10] },
      { id: "chasm", name: "rope over the chasm", verb: "Look at", prop: "chasm_rope", x: 560, y: 446, size: [300, 220], approach: [0, 110] },
      { id: "ledge", name: "crystal ledge", verb: "Look at", prop: "crystal_ledge", x: 770, y: 470, size: [190, 160], approach: [-30, 100] },
      { id: "monkey", name: "Pockets the monkey", verb: "Talk to", sprite: "monkey", x: 770, y: 472, size: [96, 110], lift: 112, approach: [-30, 98], paintedPerch: { on: "ledge", at: [0.47, 0.16], scale: 0.8 } },
      { id: "rest", name: "rest crystal", verb: "Rest at", prop: "rest_crystal", x: 980, y: 470, size: [90, 150], approach: [-70, 70] },
      { id: "lair", name: "the Geode Titan's lair", verb: "Go into", prop: "lair", x: 1190, y: 466, size: [320, 300], approach: [-130, 84] },
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 580, size: [120, 220], map: true },
    ],
    encounters: [
      { fiends: ["scrap_raptor"], weight: 1 },
      { fiends: ["magnet_beetle"], weight: 1 },
      { fiends: ["volt_jelly"], needs: ["gunner"], weight: 3 },
      { fiends: ["dominion_drone"], needs: ["gunner"], weight: 2 },
      { fiends: ["volt_jelly", "ink_slime"], needs: ["gunner", "spellwright"], minParty: 3, weight: 2 },
      { fiends: ["dominion_drone", "magnet_beetle", "scrap_raptor"], needs: ["gunner"], minParty: 3, weight: 1 },
    ],
  },
  grotto: {
    name: "The Tide Grotto",
    backgrounds: ["bg_tide_grotto", "bg_shipwreck_cove"],
    battleBackground: ["bg_tide_grotto", "bg_shipwreck_cove"],
    painted: "scene_grotto",
    tint: "grotto", // until its own painting lands: the cove, tinted like a sea cave
    music: "music_cove",
    ambience: "amb_cove",
    walk: [
      [-150, 446],
      [1430, 446],
      [1450, 676],
      [-170, 676],
    ],
    start: [-40, 600],
    fromMap: [-40, 600],
    hotspots: [
      { id: "sea", name: "the sea", verb: "Look at", area: [480, 60, 1250, 360], x: 860, y: 446, approach: [0, 120] },
      { id: "shrine", name: "sea shrine", verb: "Look at", prop: "shrine", x: 900, y: 476, size: [190, 280], approach: [-120, 86] },
      { id: "titancaller", name: "Maren the Titan Caller", verb: "Talk to", sprite: "titancaller", x: 1060, y: 570, size: [150, 196], approach: [-150, 26] },
      { id: "pools", name: "glowing tide pools", verb: "Look in", prop: "tide_pool", x: 330, y: 628, size: [300, 90], flat: true, approach: [180, -6] },
      { id: "rest", name: "rest crystal", verb: "Rest at", prop: "rest_crystal", x: 150, y: 470, size: [90, 150], approach: [70, 60] },
      { id: "west", name: "island map", verb: "Go to", edge: "left", hidden: true, x: -150, y: 560, size: [120, 220], map: true },
    ],
    encounters: [
      { fiends: ["volt_jelly"], needs: ["gunner"], weight: 3 },
      { fiends: ["ink_slime", "volt_jelly"], needs: ["gunner", "spellwright"], minParty: 3, weight: 2 },
      { fiends: ["volt_jelly", "volt_jelly"], needs: ["gunner"], minParty: 3, weight: 1 },
    ],
  },
};

/**
 * The island map (art/guides/map_island.png): where each place is, in map
 * painting pixels (1536 x 1024), and the trails between them. A trail opens
 * when its `needs` flag is set. Teasers are places for later chapters: he can
 * see them, click them for a word from Kit, but not go yet.
 */
export const MAP = {
  places: {
    cove: { name: "Shipwreck Cove", scene: "cove", at: [760, 820] },
    temple: { name: "Temple Ruins", scene: "temple", scenes: ["temple", "temple_hall"], at: [380, 580] },
    canyon: { name: "Crystal Canyon", scene: "canyon", at: [1040, 540] },
    grotto: { name: "Tide Grotto", scene: "grotto", at: [1320, 740] },
    harbor: { name: "Driftwood Harbor", teaser: "mapHarbor", at: [800, 230] },
    volcano: { name: "Smoke Mountain", teaser: "mapVolcano", at: [540, 330] },
    monkeyhead: { name: "The Monkey Head", teaser: "mapMonkeyHead", at: [1170, 250] },
    observatory: { name: "Sage Observatory", teaser: "mapObservatory", at: [180, 720] },
    watchtower: { name: "Iron Watchtower", teaser: "mapWatchtower", at: [1350, 420] },
  },
  trails: [
    { a: "cove", b: "temple", needs: "signFixed", locked: "mapTempleLocked" },
    { a: "cove", b: "canyon", needs: "gateOpen", locked: "mapCanyonLocked" },
    { a: "canyon", b: "grotto", needs: "zipDone", locked: "mapGrottoLocked" },
    { a: "cove", b: "harbor", teaser: true },
    { a: "temple", b: "volcano", teaser: true },
  ],
};

/** The boss fight at the end of the chapter. */
export const BOSS_FIGHT = {
  id: "lair",
  title: "The Geode Titan",
  fiends: ["geode_titan"],
  party: ["knight", "gunner", "titancaller"],
  reserve: "spellwright",
  boss: true,
};

/**
 * How far he walks between surprise fights: a random amount in this range,
 * in stage pixels at the reference depth. A scene is about 1,600 px across,
 * so that's a fight every one to two trips across it (about 8–14 seconds of
 * walking), leaving time to explore.
 */
export const ENCOUNTER_GAP = [2200, 3600];
/** After a fight or a scene change: at least this much fiend-free walking. */
export const ENCOUNTER_GRACE = 900;
