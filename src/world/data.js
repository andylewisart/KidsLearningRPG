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
    blurb: "A gloating note from Captain Jumble, signed with a lot of flourishes.",
  },
};

/** Fiend strength for a party of 1, 2 or 3+ heroes (wild fights are a little gentler than set battles). */
export const WILD_SCALE = {
  1: { hp: 0.8, atk: 0.6 },
  2: { hp: 0.9, atk: 0.75 },
  3: { hp: 1, atk: 0.9 },
};

/**
 * Hotspots:
 *   id, name, verb   what the hover label says: "Look at old shipwreck"
 *   x, y             where it stands on the ground
 *   prop             a drawn object (props.js), or sprite: a character id
 *   size             [w, h] in stage pixels at the reference depth
 *   lift             drawn this far above its ground point (a monkey on a wreck)
 *   flat             lies on the ground (a tide pool): no shadow, no sorting above the hero
 *   approach         [dx, dy] where the hero stands to use it, relative to x, y
 *   exit             { to, at: [x, y] }: walking here leads to another scene
 *   edge             "left" | "right": an exit at the edge of the scene, shown as an arrow
 *   hidden           not drawn (an exit at the edge), but still clickable
 *   area             [x1, y1, x2, y2]: something painted in the background (no prop);
 *                    clicking inside the box uses it, and y is where it meets the ground
 * Anything that comes and goes (the cage, the monkey) is decided in story.js.
 */
export const SCENES = {
  cove: {
    name: "Shipwreck Cove",
    backgrounds: ["bg_shipwreck_cove", "bg_jungle_ruins"],
    battleBackground: ["bg_shipwreck_cove", "bg_jungle_ruins"],
    music: "music_cove",
    ambience: "amb_cove",
    walk: [
      [-150, 432],
      [1440, 432],
      [1460, 676],
      [-170, 676],
    ],
    start: [420, 600],
    hotspots: [
      { id: "wreck", name: "old shipwreck", verb: "Look at", area: [110, 40, 1300, 345], x: 700, y: 345, approach: [0, 130] },
      { id: "monkey", name: "three-eyed monkey", verb: "Look at", sprite: "monkey", x: 1085, y: 446, size: [96, 110], approach: [-150, 40] },
      { id: "sign", name: "signpost", verb: "Read", prop: "signpost", x: 640, y: 474, size: [150, 210], approach: [0, 70] },
      { id: "pool", name: "tide pool", verb: "Look in", prop: "tide_pool", x: 930, y: 628, size: [270, 84], flat: true, approach: [-160, -8] },
      { id: "chest", name: "old chest", verb: "Open", prop: "chest", x: 160, y: 560, size: [140, 110], approach: [120, 24] },
      { id: "bottle", name: "bottle", verb: "Pick up", prop: "bottle", x: 470, y: 656, size: [46, 64], approach: [76, -12] },
      { id: "west", name: "path to the Temple Ruins", verb: "Go to", edge: "left", hidden: true, x: -150, y: 560, size: [120, 220], exit: { to: "temple", at: [1190, 590] } },
      { id: "gate", name: "Sage gate", verb: "Go through", prop: "sage_gate", x: 1290, y: 500, size: [230, 330], approach: [-140, 70], exit: { to: "canyon", at: [70, 610] } },
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
    music: "music_temple",
    ambience: "amb_jungle",
    walk: [
      [-140, 428],
      [1430, 428],
      [1450, 676],
      [-160, 676],
    ],
    start: [1190, 590],
    hotspots: [
      { id: "glyphs", name: "temple of glowing glyphs", verb: "Read", area: [-220, 0, 470, 400], x: 120, y: 400, approach: [0, 66] },
      { id: "spellwright", name: "Knox the Spellwright", verb: "Talk to", sprite: "spellwright", x: 760, y: 470, size: [150, 196], approach: [170, 70] },
      { id: "cage", name: "cage of scrambled words", verb: "Look at", prop: "word_cage", x: 760, y: 474, size: [210, 270], approach: [170, 66] },
      { id: "frog", name: "stone frog", verb: "Look at", prop: "stone_frog", x: 1120, y: 600, size: [140, 130], approach: [-130, 14] },
      { id: "monkey", name: "three-eyed monkey", verb: "Look at", sprite: "monkey", x: 978, y: 409, size: [96, 110], lift: 186, approach: [-40, 80] },
      { id: "east", name: "path to Shipwreck Cove", verb: "Go to", edge: "right", hidden: true, x: 1430, y: 580, size: [120, 220], exit: { to: "cove", at: [-60, 580] } },
    ],
    encounters: [
      { fiends: ["scrap_raptor"], weight: 2 },
      { fiends: ["ink_slime"], needs: ["spellwright"], weight: 3 },
      { fiends: ["ink_slime", "scrap_raptor"], needs: ["spellwright"], minParty: 2, weight: 2 },
      { fiends: ["ink_slime", "ink_slime"], needs: ["spellwright"], minParty: 2, weight: 1 },
    ],
  },
  canyon: {
    name: "The Crystal Canyon",
    backgrounds: ["bg_crystal_canyon"],
    battleBackground: ["bg_crystal_canyon"],
    music: "music_canyon",
    ambience: "amb_canyon",
    walk: [
      [-150, 446],
      [1430, 446],
      [1450, 676],
      [-170, 676],
    ],
    start: [70, 610],
    hotspots: [
      { id: "airship", name: "wreck of the Brass Albatross", verb: "Look at", prop: "airship_wreck", x: 200, y: 470, size: [520, 300], approach: [220, 96] },
      { id: "gunner", name: "Captain Wren", verb: "Talk to", sprite: "gunner", x: 440, y: 590, size: [150, 196], approach: [150, 10] },
      { id: "ledge", name: "crystal ledge", verb: "Look at", prop: "crystal_ledge", x: 770, y: 470, size: [190, 160], approach: [-30, 100] },
      { id: "monkey", name: "Pockets the monkey", verb: "Talk to", sprite: "monkey", x: 770, y: 472, size: [96, 110], lift: 112, approach: [-30, 98] },
      { id: "shrine", name: "crystal shrine", verb: "Look at", prop: "shrine", x: 1065, y: 482, size: [190, 280], approach: [-120, 86] },
      { id: "titancaller", name: "Maren the Titan Caller", verb: "Talk to", sprite: "titancaller", x: 1185, y: 562, size: [150, 196], approach: [-150, 26] },
      { id: "lair", name: "the Geode Titan's lair", verb: "Go into", prop: "lair", x: 1420, y: 500, size: [280, 320], approach: [-170, 70] },
      { id: "west", name: "path to Shipwreck Cove", verb: "Go to", edge: "left", hidden: true, x: -150, y: 580, size: [120, 220], exit: { to: "cove", at: [1150, 600] } },
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
