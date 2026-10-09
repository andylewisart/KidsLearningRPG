// The story of Driftwood Isle, chapter 1 (docs/world.md): every line anyone
// says, and what happens when he looks at, talks to or uses something.
//
// Lines are plain data so the sound pack can record each one ahead of time
// (tools/audio/lines.mjs). Nobody says a hero's name out loud: he picks the
// names, and a recording can't know them. Voices: narrator, kit, knight,
// gunner, spellwright, titancaller, jumble.
//
// Scripts get an `api` from the explore screen (src/ui/explore.js):
//   world, save()          the adventure's save data; call save() after changing it
//   say(id), line(who, mood, text), choose([...]) → index
//   give(item), take(item), has(item), shard(id), join(cls)
//   puzzle(kind, opts) → true (solved) | false (missed) | null (he stepped away)
//   battle(encounter) → { won, quit }
//   sfx(id), wait(ms), shake(power, ms), flash(color), tip(text)
//   monkeyFlee(hotspotId), refresh(), ending()
// Exits (a hotspot with `exit` in data.js) are walked through by the explore
// screen itself; EXITS can stop him with a line first.

import { BOSS_FIGHT } from "./data.js";

const L = (who, mood, text) => ({ who, mood, text });

export const CONVOS = {
  // ---------------------------------------------------------------- prologue
  prologue: [
    L("narrator", "neutral", "The Sundered Isles. A hundred islands in the Glimmering Sea. On every island stands a Lore Crystal that remembers everything anyone has ever learned."),
    L("narrator", "neutral", "When a crystal dims, its island starts to forget. Letters fall off signs. Numbers wander off price tags. And fiends crawl out of the gaps."),
    L("narrator", "neutral", "Tonight, the airship Brass Albatross is carrying a brand-new Lore Crystal to Driftwood Isle, where the old one is flickering."),
    L("narrator", "neutral", "On board: Captain Wren of the sky-pirates, Cade, the newest knight of the Crystal Order, and Kit, a tutor droid in a tiny pirate hat."),
    L("jumble", "laughing", "Ahoy, crystal carriers! Captain Jumble, at your service! Well, mostly at MY service. Fire the anagrams!"),
    L("narrator", "neutral", "A ghost galleon burst out of a cloud and rammed the Albatross. The crystal shattered into four shards, and everyone fell. Some of them fell on each other."),
  ],
  wake: [
    L("kit", "smug", "Good news, Cade. You broke my fall."),
    L("knight", "worried", "Kit! Are you hurt? The Crystal Code says a knight checks on his companions first."),
    L("kit", "neutral", "I'm fine. My hat is fine. That's the important thing."),
    L("knight", "shocked", "The crystal! The airship! Captain Wren!"),
    L("kit", "neutral", "Scanning. The Albatross came down in the Crystal Canyon, east of here. The crystal broke into four shards, and they're scattered all over this island."),
    L("knight", "angry", "Then we find all four. Rule eleven of the Code: never leave a crystal behind."),
    L("kit", "smug", "Rule twelve: always finish your vegetables. I've read the Code. It's very long."),
    L("kit", "neutral", "Have a look around. Fiends hide in the sand around here, so stay sharp."),
  ],

  // ---------------------------------------------------------------- Shipwreck Cove
  wreck: [
    L("knight", "shocked", "A shipwreck! Is that ours?"),
    L("kit", "neutral", "No. That one's two hundred years old. Ours is worse."),
  ],
  wreckAgain: [L("kit", "neutral", "Still not ours. Still worse.")],
  monkeyCove: [
    L("kit", "shocked", "A three-eyed monkey. They steal anything shiny."),
    L("knight", "neutral", "He looks friendly."),
    L("kit", "worried", "He's looking at your armor the way I look at a fully charged battery."),
  ],
  monkeyCoveGone: [L("kit", "smug", "And he's gone. Keep your shiny things close.")],
  sign: [
    L("knight", "shocked", "The sign says PELMET. What's a pelmet?"),
    L("kit", "neutral", "A pelmet is a fancy curtain thing. It is not a place. This is Captain Jumble's work. He scrambles every sign he sails past."),
    L("kit", "neutral", "Unscramble it, and we'll know where the path goes."),
  ],
  signSolved: [
    L("knight", "laughing", "TEMPLE! The path west goes to the Temple Ruins."),
    L("knight", "neutral", "And the other arrow says NYCOAN."),
    L("kit", "smug", "That's 'canyon'. Jumble got lazy with that one."),
  ],
  signAgain: [L("kit", "neutral", "Temple to the west, canyon to the east. Signs are much more useful when they're spelled right.")],
  signMissed: [L("kit", "worried", "Not quite. The letters are still a bit scrambled. Let's look at it again.")],
  westLocked: [
    L("knight", "worried", "Which way is which? I can't tell where this path goes."),
    L("kit", "neutral", "Neither can I. Let's fix that sign first."),
  ],
  pool: [
    L("knight", "shocked", "There's a fish in the tide pool! It's... squeaking."),
    L("kit", "neutral", "That's not a fish. That's a rubber squeaky toy shaped like a fish."),
    L("kit", "smug", "Somebody dropped it overboard. Probably on purpose."),
  ],
  poolEmpty: [L("kit", "neutral", "Just crabs now. They're judging us.")],
  bottle: [
    L("knight", "neutral", "A message in a bottle!"),
    L("kit", "neutral", "It says: Dear whoever. I have scrambled your signs. Ha! Love, Captain Jumble. Spelled correctly, by a professional."),
    L("knight", "angry", "He signed it 'love'?"),
    L("kit", "neutral", "Villains are confusing."),
  ],
  chest: [
    L("knight", "shocked", "A treasure chest! It has a number dial on the lock."),
    L("kit", "neutral", "There's a clue carved on the lid. Work out where the dial stops, and it should open."),
  ],
  chestMissed: [L("kit", "worried", "The lock didn't budge. The dial spun back. Let's try it again.")],
  chestOpen: [
    L("knight", "laughing", "A crystal shard! It's warm. It's... humming."),
    L("kit", "neutral", "That's the island's memory in there. One shard down, three to go."),
  ],
  chestEmpty: [L("kit", "neutral", "Empty. Unless you count the sand. Nobody counts the sand.")],
  gateLocked: [
    L("knight", "neutral", "A stone gate, covered in glowing writing."),
    L("kit", "neutral", "Sage glyphs. They're older than me, older than my hat, and I can't read them."),
    L("kit", "neutral", "We need someone who studied at a Sage school. Maybe the temple has answers."),
  ],
  gateOpen: [
    L("spellwright", "laughing", "Sage glyphs! Delightful. It says: Speak the password."),
    L("spellwright", "neutral", "And underneath, in very small letters: The password is on the back."),
    L("knight", "neutral", "What's on the back?"),
    L("spellwright", "smug", "One word. Ahem. PLEASE!"),
  ],
  gateOpened: [L("kit", "neutral", "Manners. The oldest magic there is.")],

  // ---------------------------------------------------------------- the Temple Ruins
  templeArrive: [L("kit", "neutral", "The Temple Ruins. Watch your step. And your spelling.")],
  spellwright: [
    L("spellwright", "laughing", "Ah! Rescuers! Or very lost tourists. Either way, welcome!"),
    L("knight", "shocked", "You're in a cage!"),
    L("spellwright", "smug", "I am Knox, the last Spellwright of the Sage school. The K is silent. It's my favorite letter."),
    L("spellwright", "angry", "And this is a cage of scrambled words, courtesy of Captain Jumble. We went to Sage school together, three hundred years ago."),
    L("kit", "neutral", "He failed the spelling exam by one word."),
    L("spellwright", "smug", "By one silent letter. Some people never forgive a letter for being quiet."),
    L("spellwright", "neutral", "Each bar of this cage is a scrambled word. Spell them right, and the bars will shatter."),
  ],
  cageBack: [L("spellwright", "neutral", "Back for more bars? Splendid. Spell them right and they'll shatter.")],
  cageBar1: [L("spellwright", "laughing", "Splendid! Two more!")],
  cageBar2: [L("spellwright", "laughing", "Marvelous! One left!")],
  cageMissed: [L("spellwright", "worried", "A tricky one. Never mind, here's another bar.")],
  cageWait: [L("spellwright", "neutral", "I'll be right here. Not that I have a choice.")],
  spellwrightFree: [
    L("spellwright", "laughing", "Free! I could hug you. I won't. I'm three hundred years old and my back clicks."),
    L("spellwright", "neutral", "This fell through the temple roof last night. A crystal shard! Shiny things always find me."),
  ],
  spellwrightJoins: [L("spellwright", "smug", "I'm coming with you. Captain Jumble still owes me a library book, and it is very, very late.")],
  glyphs: [L("kit", "neutral", "Sage writing. I can only read one word: Caution. Which is not encouraging.")],
  glyphsRead: [
    L("spellwright", "neutral", "It says: Knowledge is a lantern. Carry it carefully."),
    L("spellwright", "smug", "And underneath: No running in the temple. I wrote that one myself, a very long time ago."),
  ],
  frog: [
    L("knight", "neutral", "A stone frog with a sign: Press nose for jokes."),
    L("kit", "neutral", "It's playing a recording. Why did the crystal go to school? To get a little brighter."),
    L("knight", "laughing", "Ha! Brighter! Because crystals glow!"),
    L("kit", "neutral", "He's going to be laughing about that for a while."),
  ],
  frog2: [
    L("kit", "neutral", "What's a pirate's favorite letter? You'd think it's R. But a pirate's true love is the sea."),
    L("knight", "laughing", "The C! Ha!"),
  ],
  frog3: [
    L("kit", "neutral", "Why are fish so smart? Because they swim in schools."),
    L("knight", "laughing", "Schools! I love this frog."),
  ],
  frog4: [
    L("kit", "neutral", "Why don't skeletons fight fiends? They don't have the guts."),
    L("knight", "laughing", "No guts! Because they're skeletons!"),
    L("kit", "smug", "I'm putting this frog on my list of enemies."),
  ],
  monkeyTemple: [
    L("kit", "shocked", "That monkey again. Is he following us?"),
    L("knight", "neutral", "Maybe he likes us."),
    L("kit", "worried", "He likes your helmet, Cade. There's a difference."),
  ],

  // ---------------------------------------------------------------- the Crystal Canyon
  canyonArrive: [
    L("knight", "shocked", "The Crystal Canyon! And there's the airship!"),
    L("kit", "neutral", "And there's the Captain, yelling at a monkey."),
  ],
  gunner: [
    L("gunner", "laughing", "Well, if it isn't Shiny Boots and the Hat-Bot! You made it!"),
    L("knight", "laughing", "Captain Wren! You're all right!"),
    L("gunner", "smug", "Me? Never better. My ship's in pieces, my blaster's dead, and Pockets just stole my power cell. Best day ever."),
    L("kit", "neutral", "Pockets?"),
    L("gunner", "angry", "The three-eyed monkey! Everything shiny goes in his pockets. He doesn't even have pockets."),
    L("kit", "neutral", "She's being sarcastic about the day. Not about the monkey."),
    L("gunner", "smug", "Get that cell back from the little thief, and I'm all yours."),
  ],
  gunnerWaiting: [L("gunner", "angry", "Pockets is up on that crystal, giggling at me. I can hear him giggling.")],
  monkeyThief: [
    L("knight", "neutral", "Pockets, please give back the power cell. The Crystal Code says stealing is wrong."),
    L("kit", "neutral", "He doesn't follow the Code. He follows shiny things. And squeaky things."),
  ],
  monkeyNoFish: [L("kit", "neutral", "Did we see anything squeaky on the beach?")],
  monkeyTrade: [
    L("knight", "neutral", "Want to trade? One genuine squeaky fish."),
    L("kit", "smug", "A fair trade. I think he's in love."),
  ],
  gunnerCell: [
    L("gunner", "laughing", "My power cell! You beautiful, shiny-booted genius!"),
    L("gunner", "neutral", "Now the blaster needs calibrating. Every row of crystal cells has to count out exactly right, or it goes fizz instead of BANG."),
    L("gunner", "smug", "You count, I'll tune. Three rows. Go!"),
  ],
  gunnerBack: [L("gunner", "neutral", "Back to calibrating! You count, I'll tune.")],
  calibrate1: [L("gunner", "laughing", "That's one!")],
  calibrate2: [L("gunner", "laughing", "Two! She's warming up!")],
  calibrateMissed: [L("gunner", "worried", "Fizz. Close, though! New row.")],
  calibrateWait: [L("gunner", "neutral", "Take your time. The blaster's not going anywhere. Neither am I.")],
  gunnerJoins: [
    L("gunner", "laughing", "Listen to her hum! Okay, team, I'm in."),
    L("gunner", "neutral", "Oh, and this fell out of the sky and bonked me on the head. Yours?"),
  ],
  threeShards: [L("kit", "neutral", "Three shards. One to go.")],
  airship: [L("kit", "neutral", "That's our airship. Told you. Worse.")],
  airshipSad: [L("gunner", "worried", "My poor Albatross. Don't look at her. She's embarrassed.")],
  ledge: [L("kit", "neutral", "A crystal ledge. Nice view. Terrible chairs.")],
  shrine: [L("kit", "neutral", "A shrine of living crystal. It's humming, like it's waiting for something.")],
  shrineQuiet: [L("kit", "neutral", "The shrine is quiet now. It said what it needed to say.")],
  callerEarly: [
    L("titancaller", "neutral", "The crystals told me you would come. They also told me: not yet."),
    L("titancaller", "neutral", "Help Captain Wren first. Then come back to me."),
  ],
  caller: [
    L("titancaller", "neutral", "I am Maren, keeper of the sea shrines. The crystals sent me a dream: a knight, a scholar, a sky-captain, and a droid in a very small hat."),
    L("kit", "angry", "It's a normal-sized hat. For a hat."),
    L("titancaller", "worried", "The Geode Titan is awake. It is guarding the last shard, and it is hungry. Steel and spells alone won't stop it."),
    L("titancaller", "neutral", "We need a Titan of our own. The shrine wakes for words. Write one true sentence about the sea, and it will answer."),
  ],
  callerBack: [L("titancaller", "neutral", "The shrine is still listening. One true sentence about the sea.")],
  callerMissed: [L("titancaller", "neutral", "The shrine heard you, but it wants to see the sea. A color, a sound, what it's like. Try again.")],
  callerWait: [L("titancaller", "neutral", "Take your time. The sea is patient. I am mostly patient.")],
  callerJoins: [
    L("titancaller", "laughing", "Do you hear that? Tidebreaker answers. The sea remembers your words."),
    L("titancaller", "smug", "I will walk with you. When the Titan gauge is full, I will call the Titan, and you will write how it rises."),
  ],
  lairLocked: [L("kit", "worried", "Something huge is crunching crystals in there. We'll want every hero we can find first.")],
  lairReady: [L("kit", "worried", "The Geode Titan is in there with the last shard. Are we ready?")],
  lairGo: [L("knight", "angry", "Rule one of the Code: protect the crystals. Let's go!")],
  lairWon: [L("knight", "laughing", "We did it! The last shard!")],
  lairLost: [L("kit", "worried", "We fell back. It's very big, and we're very stubborn. We'll try again.")],
  lairDone: [L("kit", "neutral", "Just an empty cave now, and some very chewed crystals.")],
  ending: [
    L("spellwright", "laughing", "The four shards remember each other. Listen!"),
    L("narrator", "neutral", "The shards clicked together, and Driftwood Isle remembered: every word, every number, every story."),
    L("gunner", "smug", "Great. Now we just need a ship. And a harbor. And a nap."),
    L("kit", "neutral", "Driftwood Harbor is north of here. There's a café called the Salty Biscuit."),
    L("knight", "laughing", "Rule forty of the Code: never say no to a biscuit."),
    L("jumble", "angry", "You may have saved ONE island, crystal carriers! But I have ninety-nine more to scramble! Ha! Is that right? Ninety-nine? Hold on."),
    L("titancaller", "neutral", "He is still out there. Then so are we."),
  ],

  // ---------------------------------------------------------------- fights and odds and ends
  wildRaptor: [L("kit", "shocked", "Scrap Raptor! It's made of junk and bad decisions.")],
  wildBeetle: [L("kit", "shocked", "Magnet Beetle! Its shell shrugs off most hits, but sword strikes crack it.")],
  wildSlime: [L("kit", "shocked", "Ink Slime! Swords splash right through it. Spells melt it.")],
  wildJelly: [L("kit", "shocked", "Volt Jelly! It floats out of sword range. The Captain's volleys bring it down.")],
  wildDrone: [L("kit", "shocked", "A Dominion drone! It's sniffing for crystal shards. Shoot it down.")],
  wildMany: [L("kit", "shocked", "Fiends! A whole crowd of them. Pick your targets.")],
  noUse: [L("kit", "neutral", "I don't think that goes there.")],
  noUse2: [L("kit", "neutral", "Interesting idea. No.")],
  noUseFish: [L("kit", "smug", "Not everything needs to squeak.")],
  fellBack: [L("kit", "worried", "That didn't go our way. We regrouped back here. Everyone's patched up and ready.")],
};

/** Kit's line when a wild fight starts, by the first fiend. */
export const WILD_INTRO = {
  scrap_raptor: "wildRaptor",
  magnet_beetle: "wildBeetle",
  ink_slime: "wildSlime",
  volt_jelly: "wildJelly",
  dominion_drone: "wildDrone",
};

/** Which hotspots show right now. Anything not listed always shows. */
export const VISIBLE = {
  "cove.monkey": (w) => !w.monkeys.cove,
  "cove.bottle": (w) => !w.flags.bottle,
  "temple.cage": (w) => !w.flags.cageOpen,
  "temple.spellwright": (w) => !w.party.includes("spellwright"),
  "temple.monkey": (w) => !w.monkeys.temple,
  "canyon.monkey": (w) => !w.flags.traded,
  "canyon.gunner": (w) => !w.party.includes("gunner"),
  "canyon.titancaller": (w) => !w.party.includes("titancaller"),
};

/** Which hotspots glow as "something to do here" (the rest are just for looking). */
export const SPARKLE = {
  "cove.sign": (w) => !w.flags.signFixed,
  "cove.chest": (w) => !w.shards.includes("cove"),
  "cove.pool": (w) => !w.flags.fish,
  "cove.bottle": () => true,
  "cove.gate": (w) => w.party.includes("spellwright") && !w.flags.gateOpen,
  "temple.spellwright": () => true,
  "temple.cage": () => true,
  "canyon.gunner": () => true,
  "canyon.monkey": () => true,
  "canyon.titancaller": (w) => w.party.includes("gunner"),
  "canyon.lair": (w) => w.party.includes("titancaller") && !w.shards.includes("lair"),
};

const once = async (api, flag, first, after) => {
  if (!api.world.flags[flag]) {
    api.world.flags[flag] = true;
    api.save();
    if (first) await api.say(first);
  } else if (after) await api.say(after);
};

/** What happens on arriving in a scene (first visits). */
export const ARRIVE = {
  temple: (api) => once(api, "seenTemple", "templeArrive"),
  canyon: (api) => once(api, "seenCanyon", "canyonArrive"),
};

/** A scene exit: return false to stay put. */
export const EXITS = {
  "cove.west": async (api) => {
    if (api.world.flags.signFixed) return true;
    await api.say("westLocked");
    return false;
  },
  "cove.gate": async (api) => {
    const w = api.world;
    if (w.flags.gateOpen) return true;
    if (!w.party.includes("spellwright")) {
      await api.say("gateLocked");
      return false;
    }
    await api.say("gateOpen");
    api.sfx("sfx_door_stone");
    api.shake(10, 900);
    w.flags.gateOpen = true;
    api.save();
    await api.wait(700);
    await api.say("gateOpened");
    return true;
  },
};

/** Clicking a hotspot. */
export const SCRIPTS = {
  // ---------------------------------------------------------------- the cove
  "cove.wreck": (api) => once(api, "wreck", "wreck", "wreckAgain"),
  "cove.monkey": async (api) => {
    await api.say("monkeyCove");
    await api.monkeyFlee("monkey");
    api.world.monkeys.cove = true;
    api.save();
    await api.say("monkeyCoveGone");
  },
  "cove.sign": async (api) => {
    const w = api.world;
    if (w.flags.signFixed) return api.say("signAgain");
    if (!w.flags.signSeen) {
      w.flags.signSeen = true;
      api.save();
      await api.say("sign");
    }
    for (;;) {
      const solved = await api.puzzle("sign", { word: "temple" });
      if (solved === null) return;
      if (solved) break;
      await api.say("signMissed");
    }
    w.flags.signFixed = true;
    api.save();
    api.refresh();
    await api.say("signSolved");
  },
  "cove.pool": async (api) => {
    if (api.world.flags.fish) return api.say("poolEmpty");
    api.sfx("sfx_squeak");
    await api.say("pool");
    api.world.flags.fish = true;
    await api.give("rubbery_fish");
  },
  "cove.bottle": async (api) => {
    api.world.flags.bottle = true;
    api.refresh();
    await api.say("bottle");
    await api.give("jumble_note");
  },
  "cove.chest": async (api) => {
    const w = api.world;
    if (w.shards.includes("cove")) return api.say("chestEmpty");
    if (!w.flags.chestSeen) {
      w.flags.chestSeen = true;
      api.save();
      await api.say("chest");
    }
    let tier = 2;
    for (;;) {
      const solved = await api.puzzle("dial", { tier });
      if (solved === null) return;
      if (solved) break;
      tier = 1; // a gentler dial next time
      await api.say("chestMissed");
    }
    api.sfx("sfx_chest");
    await api.wait(400);
    await api.shard("cove");
    await api.say("chestOpen");
  },

  // ---------------------------------------------------------------- the temple
  "temple.spellwright": (api) => freeSpellwright(api),
  "temple.cage": (api) => freeSpellwright(api),
  "temple.glyphs": (api) => api.say(api.world.party.includes("spellwright") ? "glyphsRead" : "glyphs"),
  "temple.frog": async (api) => {
    const w = api.world;
    const n = w.flags.frog || 0;
    w.flags.frog = n + 1;
    api.save();
    await api.say(["frog", "frog2", "frog3", "frog4"][n % 4]);
  },
  "temple.monkey": async (api) => {
    await api.say("monkeyTemple");
    await api.monkeyFlee("monkey");
    api.world.monkeys.temple = true;
    api.save();
  },

  // ---------------------------------------------------------------- the canyon
  "canyon.airship": (api) => api.say(api.world.party.includes("gunner") ? "airshipSad" : "airship"),
  "canyon.gunner": async (api) => {
    const w = api.world;
    if (api.has("power_cell")) return repairBlaster(api);
    if (!w.flags.metGunner) {
      w.flags.metGunner = true;
      api.save();
      return api.say("gunner");
    }
    return api.say("gunnerWaiting");
  },
  "canyon.monkey": async (api) => {
    if (!api.world.flags.metGunner) {
      api.world.flags.metGunner = true;
      api.save();
      await api.say("gunner");
      return;
    }
    api.sfx("sfx_monkey");
    await api.say("monkeyThief");
    if (!api.has("rubbery_fish")) await api.say("monkeyNoFish");
  },
  "canyon.ledge": (api) => api.say("ledge"),
  "canyon.shrine": (api) => api.say(api.world.party.includes("titancaller") ? "shrineQuiet" : "shrine"),
  "canyon.titancaller": (api) => wakeShrine(api),
  "canyon.lair": async (api) => {
    const w = api.world;
    if (w.shards.includes("lair")) return api.say("lairDone");
    if (!w.party.includes("titancaller")) return api.say("lairLocked");
    await api.say("lairReady");
    const pick = await api.choose(["Let's go!", "Not yet."]);
    if (pick !== 0) return;
    await api.say("lairGo");
    const r = await api.battle({ ...BOSS_FIGHT });
    if (r.quit) return;
    if (!r.won) return api.say("lairLost");
    await api.say("lairWon");
    await api.shard("lair");
    await api.ending();
  },
};

/** Using an item on a hotspot. */
export const USES = {
  "canyon.monkey": {
    rubbery_fish: async (api) => {
      api.sfx("sfx_squeak");
      await api.say("monkeyTrade");
      api.take("rubbery_fish");
      api.world.flags.traded = true;
      api.world.monkeys.canyon = true;
      await api.monkeyFlee("monkey", { squeak: true });
      await api.give("power_cell");
    },
  },
  "canyon.gunner": {
    power_cell: (api) => repairBlaster(api),
  },
};

async function freeSpellwright(api) {
  const w = api.world;
  if (w.party.includes("spellwright")) return;
  if (!w.flags.metSpellwright) {
    w.flags.metSpellwright = true;
    api.save();
    await api.say("spellwright");
  } else await api.say("cageBack");
  let tier = 2;
  while ((w.flags.cageBars || 0) < 3) {
    const solved = await api.puzzle("cage", { tier, bar: (w.flags.cageBars || 0) + 1 });
    if (solved === null) return api.say("cageWait");
    if (!solved) {
      tier = 1;
      await api.say("cageMissed");
      continue;
    }
    w.flags.cageBars = (w.flags.cageBars || 0) + 1;
    api.save();
    api.sfx("sfx_puzzle_solved");
    api.refresh();
    if (w.flags.cageBars === 1) await api.say("cageBar1");
    if (w.flags.cageBars === 2) await api.say("cageBar2");
  }
  w.flags.cageOpen = true;
  api.save();
  api.flash("#e6d4ff");
  api.shake(8, 500);
  api.refresh();
  await api.say("spellwrightFree");
  await api.shard("temple");
  await api.say("spellwrightJoins");
  await api.join("spellwright");
}

async function repairBlaster(api) {
  const w = api.world;
  if (w.party.includes("gunner")) return;
  if (!w.flags.gotCell) {
    w.flags.gotCell = true;
    api.take("power_cell");
    api.save();
    await api.say("gunnerCell");
  } else await api.say("gunnerBack");
  let tier = 2;
  while ((w.flags.calibrated || 0) < 3) {
    const solved = await api.puzzle("calibrate", { tier, row: (w.flags.calibrated || 0) + 1 });
    if (solved === null) return api.say("calibrateWait");
    if (!solved) {
      tier = 1;
      await api.say("calibrateMissed");
      continue;
    }
    w.flags.calibrated = (w.flags.calibrated || 0) + 1;
    api.save();
    api.sfx("sfx_puzzle_solved");
    if (w.flags.calibrated === 1) await api.say("calibrate1");
    if (w.flags.calibrated === 2) await api.say("calibrate2");
  }
  api.sfx("sfx_shot");
  api.flash("#ffe2b0");
  await api.say("gunnerJoins");
  await api.shard("canyon");
  await api.say("threeShards");
  await api.join("gunner");
}

async function wakeShrine(api) {
  const w = api.world;
  if (w.party.includes("titancaller")) return;
  if (!w.party.includes("gunner")) return api.say("callerEarly");
  if (!w.flags.metCaller) {
    w.flags.metCaller = true;
    api.save();
    await api.say("caller");
  } else await api.say("callerBack");
  for (;;) {
    const solved = await api.puzzle("shrine", {});
    if (solved === null) return api.say("callerWait");
    if (solved) break;
    await api.say("callerMissed");
  }
  api.sfx("sfx_summon_rise");
  api.flash("#b8fff0");
  api.shake(14, 900);
  await api.wait(600);
  await api.say("callerJoins");
  await api.join("titancaller");
}

/** Every line in the story, for pre-recording: [{ who, text }]. */
export function storyLines() {
  return Object.values(CONVOS).flatMap((lines) => lines.map(({ who, text }) => ({ who, text })));
}
