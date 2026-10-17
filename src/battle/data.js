// Heroes, fiends, Titans and the set battles. Each hero has a name (hero)
// and a class (name, short); the cast is in docs/world.md.

export const CLASSES = {
  knight: {
    hero: "Cade",
    name: "Crystal Knight",
    short: "Knight",
    track: "sub",
    command: "⚔ Strike",
    hp: 520,
    speed: 8,
    color: "#7fd8ff",
    counters: "armored",
    moves: { 1: "Quick Edge", 2: "Crystal Edge", 3: "Glacier Breaker" },
    overdrive: "Chain Strike",
    cry: "Hold the line!",
    blurb: "Subtraction: works out the fiend's HP after every strike. Cracks armored fiends.",
  },
  gunner: {
    hero: "Wren",
    name: "Sky-Pirate Gunner",
    short: "Gunner",
    track: "mul",
    command: "🔫 Fire",
    hp: 380,
    speed: 12,
    color: "#ffb347",
    counters: "flier",
    moves: { 1: "Pop Shot", 2: "Volley", 3: "Bullet Squall" },
    overdrive: "Bullet Storm",
    cry: "Nobody move! Especially you.",
    blurb: "Multiplication and division: volleys of bolts. Shoots fliers out of the sky.",
  },
  spellwright: {
    hero: "Knox",
    name: "Spellwright",
    short: "Spellwright",
    track: "spell",
    command: "✨ Cast",
    hp: 300,
    speed: 10,
    color: "#c9a2ff",
    counters: "slime",
    moves: { 1: "Spark", 2: "Arc Bolt", 3: "Rune Storm" },
    overdrive: "Word Storm",
    cry: "Spelled it. Felt it.",
    blurb: "Spelling: casts spells by spelling them. Melts slimes.",
  },
  titancaller: {
    hero: "Maren",
    name: "Titan Caller",
    short: "Titan Caller",
    track: "write",
    command: "📜 Word Lash",
    hp: 340,
    speed: 9,
    color: "#5ff3c9",
    counters: "colossal",
    moves: { 1: "Word Lash", 2: "Power Lash", 3: "Story Lash" },
    overdrive: "Grand Summon",
    cry: "Rise!",
    blurb: "Writing: summons Titans by writing their entrance. Topples colossal fiends.",
  },
  // Chapter 2's fifth hero. Her move is Slow (elapsed time on a clock face):
  // it does no damage, but holds a fiend so it acts less often and the others
  // hit it harder, and pins a fast one to its own speed so everyone can hit
  // it (`slows`; engine.js, slow). Her second command is Feed (`feeds`: grams and milliliters): a
  // tonic heals a hero, a meal calms a fiend (engine.js, feed).
  beastkeeper: {
    hero: "Tamsin",
    name: "Beastkeeper",
    short: "Beastkeeper",
    track: "time",
    command: "🦴 Slow",
    hp: 360,
    speed: 11,
    color: "#ffd36b",
    counters: "fast",
    moves: { 1: "Crook Snag", 2: "Slow Snare", 3: "Time Trap" },
    overdrive: "Stampede",
    cry: "Nobody bursts anything.",
    blurb: "Time and measuring: slows fiends down so the others hit harder, weighs out meals that heal or calm. Remembers fiends into friends.",
    slows: true,
    feeds: true,
  },
};

// hint: what it is and who counters it (Kit says it, and the Bestiary shows
// it); bounce: just what it is, for when that hero isn't there to help. Fast
// fiends have neither spoken: Kit's chapter 2 lines cover them (reachFast).
export const FIEND_TYPES = {
  normal: { label: "Beast", hint: "Anyone can hit it." },
  armored: { label: "Armored", hint: "Shrugs off most attacks. The Knight's strikes crack it.", bounce: "Shrugs off most attacks." },
  flier: { label: "Flier", hint: "Out of sword range. The Gunner's volleys bring it down.", bounce: "Out of sword range." },
  slime: { label: "Slime", hint: "Weapons splash right through. Spells melt it.", bounce: "Weapons splash right through." },
  colossal: { label: "Colossal", hint: "Too big for swords and spells. The Titan Caller's Titan topples it." },
  fast: { label: "Fast", hint: "Acts twice a round and dodges. The Beastkeeper's Slow pins it down." },
};

// A fiend with `fast: true` acts twice a round and dodges every hit but the
// Beastkeeper's until she Slows it (engine.js, missReason). Chapter 2's fiends
// (`chapter: 2`) are `wary`: only a calm one, fed by the Beastkeeper, is
// captured by a ★★★ finish. Chapter 1's are captured as they always were.
// A `machine` (the Caged Drone) never eats and is never captured.
export const FIENDS = {
  scrap_raptor: {
    name: "Scrap Raptor",
    type: "normal",
    hp: 300,
    speed: 12,
    atk: 36,
    attack: "Rusty Pounce",
    joke: "It bolted scrap metal onto itself for armor. It also bolted on a steering wheel. Nobody knows why.",
    fact: "Real fact: birds are living dinosaurs. A raptor's closest living relatives are birds, including chickens.",
    standard: "SEEd 3.2.1",
  },
  volt_jelly: {
    name: "Volt Jelly",
    type: "flier",
    hp: 250,
    speed: 10,
    atk: 32,
    attack: "Static Sting",
    joke: "It is 95% water and 5% grudge.",
    fact: "Real fact: jellyfish have no brain, no heart and no bones, and they've been around for more than 500 million years.",
    standard: "SEEd 3.2.4",
  },
  magnet_beetle: {
    name: "Magnet Beetle",
    type: "armored",
    hp: 500,
    speed: 6,
    atk: 46,
    attack: "Iron Charge",
    joke: "Every fork on the island has gone missing near its nest.",
    fact: "Real fact: two magnets can pull together or push apart without touching. Flip one around and the pull becomes a push.",
    standard: "SEEd 3.3.4",
  },
  ink_slime: {
    name: "Ink Slime",
    type: "slime",
    hp: 400,
    speed: 8,
    atk: 30,
    attack: "Splotch",
    joke: "Mostly harmless. Unless you count the stains.",
    fact: "Real fact: squid and octopuses squirt clouds of ink to escape predators. That trait helps them survive.",
    standard: "SEEd 3.2.4",
  },
  dominion_drone: {
    name: "Dominion Drone",
    type: "flier",
    hp: 350,
    speed: 11,
    atk: 42,
    attack: "Blade Sweep",
    joke: "Its manual is 400 pages long. Page one says: do not read the manual.",
    fact: "Real fact: a drone's rotors push air down. When the push up equals gravity's pull down, the forces balance and it hovers.",
    standard: "SEEd 3.3.1",
  },
  geode_titan: {
    name: "Geode Titan",
    type: "colossal",
    boss: true,
    bars: 3,
    hp: 1000,
    speed: 9, // a boss acts about as often as a hero
    atk: 135, // a real fight: guard against Crystal Quake, drink potions, and summon the Titan
    attack: "Club Tail",
    special: "Crystal Quake",
    joke: "It has waited a thousand years to be the center of attention. Today is its day.",
    fact: "Real fact: geodes form when minerals in water slowly build crystals inside a hollow rock, over a very long time.",
    standard: "SEEd 3.2",
  },

  // ---------------------------------------------------------------- chapter 2: Driftwood Harbor
  // (docs/story/chapter2-proposal.md, "The new fiends"). A fast fiend's attack
  // is lighter: it comes twice as often. A step up from chapter 1's: five
  // heroes line up to counter what's there, and pets join in (tuned with
  // test/balance.test.js, so ★ alone still costs health).
  barnacle_brute: {
    name: "Barnacle Brute",
    type: "armored",
    chapter: 2,
    wary: true,
    hp: 650,
    speed: 6,
    atk: 75,
    attack: "Door Slam",
    joke: "Its shell is somebody's lost front door. It still has the knocker. Nobody has dared to knock.",
    fact: "Real fact: a young barnacle swims free, then glues itself head-first to a rock for life and kicks food into its mouth with its feet.",
    standard: "SEEd 3.2.1",
  },
  wick_moth: {
    name: "Wick Moth",
    type: "flier",
    chapter: 2,
    wary: true,
    hp: 310,
    speed: 10,
    atk: 50,
    attack: "Ember Dust",
    joke: "Drawn to the fading lighthouse, and very upset about it. It has written a strongly worded complaint, in smoke.",
    fact: "Real fact: many moths steer by the moon at night. A bright lamp confuses them, so they circle it instead.",
    standard: "SEEd 3.2.4",
  },
  fog_glob: {
    name: "Fog Glob",
    type: "slime",
    chapter: 2,
    wary: true,
    hp: 500,
    speed: 7,
    atk: 45,
    attack: "Muffle",
    joke: "It swallows street signs. The words come out foggy, which it thinks is hilarious. It is the only one.",
    fact: "Real fact: fog is a cloud that touches the ground: tiny drops of water floating in cool, damp air.",
    standard: "SEEd 3.1.1",
  },
  tick_mimic: {
    name: "Tick Mimic",
    type: "fast",
    fast: true,
    chapter: 2,
    wary: true,
    hp: 400,
    speed: 8,
    atk: 40,
    attack: "Snap Lid",
    joke: "A clock pretending to be a treasure chest. Always seven minutes late, and very fast about it.",
    fact: "Real fact: some animals survive by looking like something else. A stick insect looks so much like a twig that birds walk right past it.",
    standard: "SEEd 3.2.4",
  },
  crumb_goblin: {
    name: "Crumb Goblin",
    type: "fast",
    fast: true,
    chapter: 2,
    wary: true,
    hp: 280,
    speed: 10,
    atk: 27,
    attack: "Crumb Toss",
    joke: "Small, many and crunchy. They raid the Salty Biscuit in shifts, and leave a trail a blind seagull could follow.",
    fact: "Real fact: some animals survive by living in groups. Ants share food and work together, so the whole colony does better.",
    standard: "SEEd 3.2.5",
  },
  riptide_eel: {
    name: "Riptide Eel",
    type: "fast",
    fast: true,
    chapter: 2,
    wary: true,
    steals: true, // its first turn: it snatches a potion, and drops it when it's beaten
    hp: 360,
    speed: 12,
    atk: 36,
    attack: "Undertow",
    joke: "Darts out of the dock's pilings, steals a potion and is gone before anyone's turn. It doesn't even drink them.",
    fact: "Real fact: eels are fish. Some hatch far out in the ocean and swim thousands of miles to live in rivers.",
    standard: "SEEd 3.2.1",
  },
  caged_drone: {
    name: "Caged Drone",
    type: "flier",
    chapter: 2,
    machine: true, // a Dominion machine: it doesn't eat, and it's brought down, not captured
    hp: 460,
    speed: 11,
    atk: 60,
    attack: "Cage Swipe",
    joke: "A Dominion drone built around a caged fiend. The fiend inside wants out more than anyone.",
    fact: "Real fact: to fly forward, a drone tilts. Its rotors push air back as well as down, and that push moves it along.",
    standard: "SEEd 3.3.1",
  },
  // The chapter's boss: Clamp's Drain Engine, clamped onto the lighthouse
  // (beat 11). Its special drains the party and mends it with what it drinks,
  // until its last bar: then the fight stops for the keeper at the lens
  // (`phases`), and only Beaconwing can tear it off the tower (`finisher`).
  // Three bars to fight through, as the Geode Titan had, and the fourth is
  // Beaconwing's. (Tuned with test/balance.test.js: ★ spam alone loses it
  // about half the time, as it does the Geode Titan; guarding its drain
  // halves what it drinks.)
  drain_engine: {
    name: "Drain Engine",
    type: "colossal",
    chapter: 2,
    boss: true,
    bars: 4,
    hp: 1000,
    speed: 9,
    atk: 135,
    attack: "Clamp Claw",
    special: "Light Drain",
    drain: 1, // its special mends it by this share of what it drained: all of it
    phases: { 4: "lens" },
    finisher: "titan_beaconwing",
    joke: "Six legs, three tanks and a clipboard holder. The clipboard holder is the best-built part.",
    fact: "Real fact: lighthouses warn ships away from rocks in storms and fog, when sailors can't see the shore.",
    standard: "SEEd 3.1.3",
  },
};

// The Titan Caller's Titans. look: how the summon plays (ui/battle.js,
// summonCinematic): "sea" rises out of the waves, "light" unfolds in a storm
// of light. music: the summon's track and its cues; while a Titan's own track
// isn't in the sound pack, Tidebreaker's (music_summon) plays in its place.
export const TITANS = {
  titan_starter: {
    name: "Tidebreaker",
    atk: 220,
    look: "sea",
    music: "music_summon",
    description: "A colossal sea titan with glowing crystal reefs on its back, rising out of the waves.",
  },
  // Maren's second Titan (chapter 2, beat 11): bound with his true words about the storm
  titan_beaconwing: {
    name: "Beaconwing",
    atk: 240,
    look: "light",
    music: "music_summon_beaconwing",
    description: "A thunderbird of light from the lighthouse lens: beams for eyes, prisms for feathers, lightning in its wings.",
  },
};

export const ITEMS = {
  potion: { name: "Potion", count: 3, blurb: "Heals one hero. You work out the new HP." },
};

/** Quick battles: four fights, each teaching one idea (the adventure has its own). */
export const TRAINING = [
  {
    id: "t1",
    background: "bg_jungle_ruins",
    title: "Raptor Ambush",
    fiends: ["scrap_raptor", "scrap_raptor"],
    party: ["knight", "gunner", "spellwright"],
    reserve: "titancaller",
    intro:
      "Scrap Raptors! Pick a move, pick how many stars, and solve it to hit. The harder the problem, the harder the hit.",
  },
  {
    id: "t2",
    background: "bg_jungle_ruins",
    title: "Wings and Shells",
    fiends: ["volt_jelly", "magnet_beetle"],
    party: ["knight", "gunner", "spellwright"],
    reserve: "titancaller",
    intro:
      "Fliers laugh at swords. Armor laughs at bullets. Bring the right hero: the Knight cracks armor, the Gunner shoots down fliers. You can Swap on any hero's turn.",
  },
  {
    id: "t3",
    background: "bg_crystal_canyon",
    title: "Ink and Iron",
    fiends: ["ink_slime", "dominion_drone", "scrap_raptor"],
    party: ["knight", "gunner", "spellwright"],
    reserve: "titancaller",
    intro:
      "Slimes splash right through weapons. Spells melt them. Finish a fiend with a three-star move and I can trap its data for your collection.",
  },
  {
    id: "t4",
    background: "bg_crystal_canyon",
    title: "The Geode Titan",
    fiends: ["geode_titan"],
    party: ["knight", "gunner", "titancaller"],
    reserve: "spellwright",
    boss: true,
    intro:
      "That's a Geode Titan. Three health bars, one bad attitude. The Titan Caller's Overdrive is full: pick it, and write the entrance of something enormous.",
  },
];
