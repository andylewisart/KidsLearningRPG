// Heroes, fiends, Titans and the training encounters. Names here are the
// defaults; he renames the heroes and the droid himself later.

export const CLASSES = {
  knight: {
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
};

export const FIEND_TYPES = {
  normal: { label: "Beast", hint: "Anyone can hit it." },
  armored: { label: "Armored", hint: "Shrugs off most attacks. The Knight's strikes crack it." },
  flier: { label: "Flier", hint: "Out of sword range. The Gunner's volleys bring it down." },
  slime: { label: "Slime", hint: "Weapons splash right through. Spells melt it." },
  colossal: { label: "Colossal", hint: "Too big to fight alone. Call a Titan." },
};

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
    hp: 900,
    speed: 9, // a boss acts about as often as a hero
    atk: 70,
    attack: "Club Tail",
    special: "Crystal Quake",
    joke: "It has waited a thousand years to be the center of attention. Today is its day.",
    fact: "Real fact: geodes form when minerals in water slowly build crystals inside a hollow rock, over a very long time.",
    standard: "SEEd 3.2",
  },
};

export const TITANS = {
  titan_starter: {
    name: "Tidebreaker",
    atk: 220,
    description: "A colossal sea titan with glowing crystal reefs on its back, rising out of the waves.",
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
      "That's a Geode Titan. Three health bars, one bad attitude. Right answers fill the Titan gauge. When it's full, your Titan Caller can write something enormous.",
  },
];
