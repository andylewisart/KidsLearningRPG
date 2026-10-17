// The story of Driftwood Isle (docs/world.md): every line anyone says, and
// what happens when he looks at, talks to or uses something. This file is
// chapter 1; chapter 2 (Driftwood Harbor) is in lines2.js and chapter2.js,
// added to each table here.
//
// Lines are plain data so the sound pack can record each one ahead of time
// (tools/audio/lines.mjs), each performed with its expression tag from
// tools/audio/direction.json. Recorded lines say the cast's own names
// (docs/world.md): a grown-up can rename them on screen, but a recording
// can't know the new names. Voices: narrator, kit, knight, gunner,
// spellwright, titancaller, jumble. The story bible is docs/story/bible.md.
//
// Scripts get an `api` from the explore screen (src/ui/explore.js):
//   world, save()          the adventure's save data; call save() after changing it
//   say(id), line(who, mood, text), choose([...]) → index
//   give(item), take(item), has(item), shard(id), join(cls)
//   puzzle(kind, opts) → true (solved) | false (missed) | null (he stepped away)
//   battle(encounter) → { won, quit }; every adventure fight is saved as it goes, and
//   resumingFight is true while a script is re-run to pick its saved fight back
//   up (the game closed mid-fight): skip what leads up to the fight then
//   sfx(id), wait(ms), shake(power, ms), flash(color), tip(text)
//   monkeyFlee(hotspotId), pose(hotspotId, pose), beckon(hotspotId), refresh(), ending()
//   rest() (everyone healed), zip(hotspotId, sceneId) (ride a rope to another scene),
//   ambush(fiends) (they jump out now: resolves with the fight's result)
// Exits (a hotspot with `exit` in data.js) are walked through by the explore
// screen itself; EXITS can stop him with a line first.

import { BOSS_FIGHT } from "./data.js";
import { CONVOS2 } from "./lines2.js";
import { SCRIPTS2, USES2, ARRIVE2, EXITS2, VISIBLE2, PAINTED2, SPARKLE2, WILD_INTRO2 } from "./chapter2.js";

// A line: who says it, their face, the words, and extras:
//   song: "far"  Maren's song plays faintly under it, from somewhere below
//   cue          the ending sets something off on screen with it (ending() in explore.js)
//   ask          the opening: after this line he answers one problem for the crystal
//                (the puzzle window), and the next line waits until he has it right
//   glow         the opening: the crystal flares as this line comes up
const L = (who, mood, text, extra = {}) => ({ who, mood, text, ...extra });

/** Chapter 1's conversations, and the ones every chapter shares (like the play timer's camp). */
export const CONVOS1 = {
  // ---------------------------------------------------------------- the opening
  // Night into dawn, one picture per part (prologue() in explore.js): the cold
  // open over the airship, the deck, Captain Jumble and his charge, then the
  // intro film (the ram, the fall and Cade's landing), then sunrise on the beach
  // (wake). Faces before the crash; the premise shown (his answer lights the
  // crystal) before it's said.
  prologue: [L("narrator", "neutral", "Just before dawn, a little airship was carrying a brand-new crystal across the Glimmering Sea, to an island that was forgetting.")],
  prologueDeck: [
    L("kit", "neutral", "Seven times eight."),
    L("gunner", "smug", "Fifty-six! Easy."),
    L("kit", "smug", "I was asking the crystal."),
    // his turn: the problem is made at his level, so this line names no fact (and Wren's 7 × 8 is taken)
    L("kit", "neutral", "Cade. You carry it, so you teach it. Here's one.", { ask: true }),
    L("gunner", "laughing", "Look at it glow!", { glow: true }),
    L("knight", "neutral", "The more it learns, the brighter it shines. And the more Driftwood will remember."),
    L("kit", "smug", "He's been reading it the Crystal Code. It did not glow for rule twelve."),
    L("knight", "angry", "'Always finish your vegetables' is a very important rule."),
    L("gunner", "smug", "Relax, Shiny Boots. Nothing catches the Albatross."),
    L("kit", "worried", "Captain? Why is that cloud green?"),
  ],
  prologueJumble: [
    L("jumble", "laughing", "Ahoy, crystal carriers! Captain Jumble, at your service!"),
    L("jumble", "smug", "A brand-new crystal, for Driftwood? But they've nearly finished forgetting! And I've worked so hard."),
    L("knight", "angry", "Turn back, Jumble! This crystal is under the protection of a knight!"),
    L("jumble", "laughing", "A kuh-NIGHT? Ha!"),
    L("kit", "smug", "The K is silent."),
    L("jumble", "angry", "NOBODY CORRECTS CAPTAIN JUMBLE! RAMMING SPEED!"),
  ],
  // The intro film (art/video-refs/intro-v8/): the ram, the fall and Cade's landing,
  // 22 seconds. These lines are its voice track, mixed into the film's own sound
  // (tools/audio/intro-mix.py), so the story box only shows the words, on the film's
  // clock (OPENING in explore.js). `effort`: a yell, not words to read, so it gets
  // no story box. Nobody speaks on screen with their mouth shut: the landing is
  // just shown, so it has no lines.
  prologueFilm: [
    L("knight", "shocked", "The crystal!"), // 3.0 s: the crystal breaks into four
    L("knight", "shocked", "Whoaaaa!", { effort: true }), // 5.2 s: thrown over the rail
    L("jumble", "laughing", "Good luck teaching it in pieces!"), // 6.15 s: the galleon turns to fog
    L("jumble", "laughing", "Ha ha ha ha HAAA!", { effort: true }), // 8.5 s: his green streak shoots off
    L("gunner", "angry", "Hang on, Albatross! I'm not leaving you!"), // 8.55 s: she catches the rope
    L("knight", "shocked", "Aaaaaaah! Oof! Ow! Ow!", { effort: true }), // 14.0 s: through the palms, off screen
  ],
  // sunrise at the cove: Kit drops out of the sky onto him (wakeUp() in explore.js)
  wake: [
    L("kit", "smug", "Good news, Cade. You broke my fall."),
    L("knight", "worried", "Kit! Are you hurt?"),
    L("kit", "neutral", "My hover's dented. My hat is perfect. So, mostly good news."),
    L("knight", "shocked", "The crystal! The airship! Captain Wren!"),
    L("kit", "neutral", "Scanning. Wren rode her ship down into the Crystal Canyon, east of here. Loudly."),
    L("kit", "worried", "The shards are scattered all over the island. Until the crystal's whole again, Driftwood keeps forgetting."),
    L("knight", "angry", "Then we find all four. Rule eleven of the Code: never leave a crystal behind."),
    L("kit", "neutral", "Have a look around. Fiends hide in the sand around here, so stay sharp."),
  ],

  // ---------------------------------------------------------------- Shipwreck Cove
  wreck: [
    L("knight", "shocked", "A shipwreck! That's not the Albatross, is it?"),
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
  // ---------------------------------------------------------------- the island map
  mapFirst: [
    L("kit", "neutral", "The island map. Click a place, and we'll walk there."),
    L("knight", "laughing", "Every legend needs a map. Ours just got one."),
  ],
  mapTempleLocked: [
    L("knight", "worried", "Which path goes to the temple? I can't tell."),
    L("kit", "neutral", "Neither can I. Let's fix that scrambled signpost first."),
  ],
  mapCanyonLocked: [L("kit", "neutral", "The only way into the canyon is through the old Sage gate, and it's sealed with glyphs.")],
  mapGrottoLocked: [L("kit", "neutral", "There's a sea cave below the canyon cliffs. No path down. Not one for walking, anyway.")],
  mapHarbor: [
    L("kit", "worried", "Driftwood Harbor. Their crystal's nearly out. They've started forgetting things."),
    L("knight", "neutral", "Then that's where we go next. Rule six: one island at a time."),
  ],
  mapVolcano: [L("kit", "worried", "Smoke Mountain. It's a volcano. It's smoking. I'd like to not.")],
  mapMonkeyHead: [
    L("knight", "shocked", "A giant stone monkey head! With three eyes!"),
    L("kit", "smug", "Somebody carved a statue of Pockets. Or Pockets' great-great-grandfather. That explains a lot."),
  ],
  mapObservatory: [L("kit", "neutral", "An old Sage observatory, out on a sea stack. No bridge. Sages loved a dramatic entrance.")],
  mapWatchtower: [L("kit", "worried", "An Iron Dominion watchtower. That red light means they're watching. Let's not wave.")],
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
    L("kit", "neutral", "Villains are confusing. There's a P.S. on the back, too. Something about a door."),
  ],
  chest: [
    L("knight", "shocked", "A treasure chest! It has a number dial on the lock."),
    L("kit", "shocked", "Something in there is glowing. A shard fell in through a crack in the lid."),
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

  restFirst: [
    L("kit", "neutral", "A rest crystal. Touch it, and everyone gets patched up. Potions too."),
    L("knight", "neutral", "Thank you, crystal."),
    L("kit", "smug", "It's a rock, Cade. A glowing rock."),
    L("knight", "smug", "It's a very kind rock."),
  ],
  restAgain: [L("kit", "neutral", "All patched up. Fiends, you may try again.")],
  restNudge: [L("kit", "worried", "We're running on fumes. There's a rest crystal around here. Let's use it.")],

  // ---------------------------------------------------------------- the play timer's camp
  // A grown-up's play timer (src/world/playtime.js) never shows a countdown.
  // campSoon plays once, at a calm moment while exploring, about five minutes out.
  // When time's up, at the next calm moment: camp, then camp_<class> for each hero
  // in the party (knight, gunner, spellwright, titancaller, in that order), then
  // campEnd. campMorning greets him the first time he's back the next day.
  // Written to fit any scene and any point in chapter 1, Cade alone included.
  campSoon: [L("kit", "neutral", "Five more minutes, then we make camp. Heroes need sleep. Droids just need a good shelf.")],
  camp: [
    L("kit", "neutral", "That's enough adventure for one day. We make camp here."),
    L("kit", "smug", "I'll take first watch. Droids don't sleep. We dim, thoughtfully."),
  ],
  camp_knight: [L("knight", "neutral", "The Code says a knight rests, so he can be brave again tomorrow. I shall rest very bravely.")],
  camp_gunner: [L("gunner", "neutral", "Stars look better from a deck. Still. Not a bad fire, Shiny Boots.")],
  camp_spellwright: [L("spellwright", "laughing", "Ooh, campfire. Two small words, sharing one warm seat. Goodnight, all.")],
  camp_titancaller: [L("titancaller", "neutral", "Sleep now. The sea will keep the tune. It knows it by heart.")],
  campEnd: [L("kit", "neutral", "Camp's set. See you tomorrow.")],
  campMorning: [L("kit", "smug", "Morning. Everyone's rested, and nobody sat on my hat. Let's go.")],

  // ---------------------------------------------------------------- the Temple Ruins
  templeArrive: [L("kit", "neutral", "The Temple Ruins. Watch your step. And your spelling.")],
  door: [
    L("knight", "neutral", "A huge round door, with number dials all around it."),
    L("kit", "neutral", "A Sage lock. It wants one number, and there's no clue anywhere."),
  ],
  doorNoClue: [L("kit", "neutral", "We need the code. Jumble scrambles everything, but he can't help bragging. Maybe he wrote it down somewhere.")],
  doorClue: [
    L("kit", "shocked", "Wait. Jumble's note! The P.S. on the back is his door code."),
    L("kit", "smug", "He threw his secret code into the sea. He just wanted someone to see how clever it was."),
  ],
  doorMissed: [L("kit", "worried", "The dials spun back. Let's add it up again.")],
  doorWait: [L("kit", "neutral", "The door's not going anywhere. That's sort of its whole job.")],
  doorOpen: [
    L("knight", "laughing", "It's rolling open!"),
    L("kit", "neutral", "And somebody inside is yelling. Politely."),
  ],
  pillar: [L("kit", "neutral", "A broken pillar. The top is flat. Perfect for a monkey, or a very small throne.")],
  hallArrive: [
    L("knight", "shocked", "A library. Everyone whisper. Rule thirty."),
    L("kit", "neutral", "The Hall of Glyphs. And there's someone in that cage, waving at us."),
  ],
  tablets: [L("kit", "neutral", "Stone tablets. The Sage library. Heavy reading.")],
  tabletsRead: [
    L("spellwright", "smug", "My old library! Ah, Rocks That Talk, volume nine. A classic."),
    L("spellwright", "neutral", "Jumble borrowed volume ten three hundred years ago. Still overdue."),
  ],
  mural: [L("kit", "neutral", "A glowing mural: Sage scholars, reading by crystal light. One of them is very short.")],
  muralRead: [L("spellwright", "laughing", "That short one? That's me. I was having a good hair day. Under the hood.")],
  // the first look at the mural after Knox joins: the friend who should be up there (later looks: muralRead)
  muralSeat: [
    L("spellwright", "laughing", "That short one? That's me. I was having a good hair day. Under the hood."),
    L("spellwright", "neutral", "There should be one more of us up there. Tall. Loud. Hopeless at spelling."),
    L("knight", "worried", "Jumble?"),
    L("spellwright", "worried", "We studied together every night for that exam. I passed. He didn't. He never spoke to me again."),
    L("spellwright", "neutral", "I still save his seat in the library. Three hundred years is a long time to save a seat."),
  ],
  spellwright: [
    L("spellwright", "laughing", "Ah! Rescuers! Or very lost tourists. Either way, welcome!"),
    L("knight", "neutral", "Hold on, sir! A knight never leaves anyone in a cage."),
    L("spellwright", "smug", "I am Knox, the last Spellwright of the Sage school. The K is silent. It's my favorite letter."),
    L("spellwright", "angry", "And this is a cage of scrambled words, courtesy of Captain Jumble. We went to Sage school together, three hundred years ago."),
    L("knight", "shocked", "Jumble went to school?"),
    L("spellwright", "smug", "Until he failed the final exam. By one silent letter. Some people never forgive a letter for being quiet."),
    L("kit", "smug", "That explains 'kuh-night'."),
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
  spellwrightJoins: [
    L("spellwright", "smug", "I'm coming with you. Captain Jumble still owes me a library book, and it is very, very late."),
    L("spellwright", "neutral", "And when the moment comes, watch for my Word Storm. Every word, a lightning bolt."),
  ],
  glyphs: [L("kit", "neutral", "Sage writing. I can only read one word: Caution. Which is not encouraging.")],
  glyphsRead: [
    L("spellwright", "neutral", "It says: Knowledge is a lantern. Carry it carefully."),
    L("spellwright", "smug", "And underneath: No running in the temple. I wrote that one myself, a very long time ago."),
  ],
  frog: [
    L("knight", "neutral", "A stone frog with a sign: Press nose for jokes."),
    L("kit", "neutral", "It's playing a recording. Why did the crystal go to school? To get a little brighter."),
    L("knight", "laughing", "Oh, that's good. That's so good."),
    L("kit", "neutral", "He's going to be laughing about that for a while."),
  ],
  frog2: [
    L("kit", "neutral", "What's a pirate's favorite letter? You'd think it's R. But a pirate's true love is the sea."),
    L("knight", "laughing", "That one's going in my joke book."),
  ],
  frog3: [
    L("kit", "neutral", "Why are fish so smart? Because they swim in schools."),
    L("knight", "laughing", "I love this frog."),
  ],
  frog4: [
    L("kit", "neutral", "Why don't skeletons fight fiends? They don't have the guts."),
    L("knight", "laughing", "I'm telling that one at the Order."),
    L("kit", "smug", "I'm putting this frog on my list of enemies."),
  ],
  monkeyTemple: [
    L("kit", "shocked", "That monkey again. Is he following us?"),
    L("knight", "neutral", "Maybe he likes us."),
    L("kit", "worried", "He likes your shield, Cade. And he's wearing a hat just like mine. I don't trust him."),
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
    L("gunner", "angry", "The three-eyed monkey! He stowed away on my ship. Everything shiny goes in his pockets. He doesn't even have pockets."),
    L("kit", "smug", "I thought nothing catches the Albatross."),
    L("gunner", "worried", "Okay. One ghost ship. And one monkey."),
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
    L("gunner", "smug", "And wait till you see my Bullet Storm. Everyone loves Bullet Storm."),
  ],
  // a piece of her family's ship, given away
  threeShards: [
    L("kit", "neutral", "Three shards. One to go."),
    L("gunner", "neutral", "Here. Take the pulley off her rigging. That rope over the chasm runs down to the sea caves."),
    L("gunner", "neutral", "She'd want to help."),
  ],
  // her blaster's first test, with her Overdrive full (Kit shows it off in the fight)
  dronesIncoming: [L("gunner", "laughing", "Hear that buzzing? Perfect timing. Let's test this blaster!")],
  blasterTested: [L("gunner", "smug", "Told you. Everyone loves Bullet Storm.")],
  // Maren's song, from the moment they first hear it until she says hello: no jokes, just listening
  hearSong: [
    L("gunner", "neutral", "Shh. Listen. Somebody down there has been singing to the tide all day.", { song: "far" }),
    L("spellwright", "neutral", "Oh... That's beautiful."),
    L("knight", "neutral", "It's coming from below the chasm. Who could be singing all the way down there?"),
    L("kit", "neutral", "I don't know. But I'd like to hear it up close."),
    L("knight", "neutral", "Then let's find out. Down the rope!"),
  ],
  chasm: [
    L("knight", "neutral", "A rope across the chasm. Where does it go?"),
    L("kit", "neutral", "Down to the sea caves, by the look of it. Too thin to walk on. We'd need something to slide on."),
  ],
  chasmZip: [
    L("gunner", "neutral", "Hook the pulley on and hold tight. That singing is right below us."),
    L("spellwright", "neutral", "Then let's follow it down."),
  ],
  chasmAgain: [L("kit", "neutral", "Down the rope to the grotto?")],
  airship: [L("kit", "neutral", "That's our airship. Told you. Worse.")],
  airshipSad: [L("gunner", "worried", "My poor Albatross. Don't look at her. She's embarrassed.")],
  // the first look at the wreck after Maren joins (so the song's stretch stays quiet): whose ship it was
  airshipStory: [
    L("gunner", "worried", "My poor Albatross. Don't look at her. She's embarrassed."),
    L("gunner", "worried", "She was my grandma's ship. Then my mom's. Now she's mine. I'm the first one who ever crashed her."),
    L("knight", "neutral", "Then you'll be the first one who ever fixed her."),
    L("gunner", "smug", "Shiny Boots. That was almost a good line."),
  ],
  ledge: [L("kit", "neutral", "A crystal ledge. Nice view. Terrible chairs.")],
  // ---------------------------------------------------------------- the Tide Grotto
  grottoArrive: [
    L("knight", "neutral", "There, past the shrine. That's who's been singing."),
    L("spellwright", "neutral", "She's singing to the sea. Listen. The waves are keeping time."),
    L("gunner", "neutral", "Even prettier up close."),
    L("kit", "neutral", "Let's walk over quietly. I don't want to interrupt."),
  ],
  pools: [L("kit", "smug", "Glowing tide pools. One of the crabs is humming her song. Badly.")],
  poolsSong: [L("kit", "neutral", "Glowing tide pools. Even the little crabs have stopped to listen.")],
  sea: [L("kit", "neutral", "The open sea. Somewhere out there is Captain Jumble's ghost galleon. And a lot of fish.")],
  seaSong: [L("kit", "neutral", "The open sea. Her song carries all the way out over the water.")],
  // the first look at the sea after Maren joins: her island, and why she sings (later looks: sea)
  seaStory: [
    L("titancaller", "neutral", "My island is out there, past where the water turns gray."),
    L("titancaller", "worried", "Its crystal went dark when I was little. One by one, everyone forgot our song."),
    L("kit", "neutral", "But not you."),
    L("titancaller", "neutral", "I knew it by heart. The dark takes those things last."),
    L("titancaller", "smug", "So I sing it to the sea. The sea remembers what people forget."),
  ],
  shrine: [L("kit", "neutral", "A shrine of living crystal. It's humming, like it's waiting for something.")],
  shrineQuiet: [L("kit", "neutral", "The shrine is quiet now. It said what it needed to say.")],
  callerEarly: [
    L("titancaller", "neutral", "The crystals told me you would come. They also told me: not yet."),
    L("titancaller", "neutral", "Help Captain Wren first. Then come back to me."),
  ],
  caller: [
    L("titancaller", "laughing", "Oh! Hello there. Forgive me. When the tide is listening, I sing to it."),
    L("knight", "neutral", "Your song is beautiful. We followed it all the way down from the canyon."),
    L("titancaller", "neutral", "Then the tide carried it to the right ears. I am Maren, keeper of the sea shrines."),
    L("titancaller", "neutral", "The crystals sent me a dream of you: a knight, a scholar, a sky-captain, and a little droid in a pirate hat."),
    L("titancaller", "worried", "The Geode Titan is awake. It is guarding the last shard, and it is hungry. Steel and spells alone won't stop it."),
    L("titancaller", "neutral", "We need a Titan of our own. The shrine wakes for words. Write one true sentence about the sea, and it will answer."),
  ],
  callerBack: [L("titancaller", "neutral", "The shrine is still listening. One true sentence about the sea.")],
  callerMissed: [L("titancaller", "neutral", "The shrine heard you, but it wants to see the sea. A color, a sound, what it's like. Try again.")],
  callerWait: [L("titancaller", "neutral", "Take your time. The sea is patient. I am mostly patient.")],
  callerJoins: [
    L("titancaller", "laughing", "Do you hear that? Tidebreaker answers. The sea remembers your words."),
    L("titancaller", "smug", "I will walk with you. And when the moment comes, I will call the Titan, and you will write how it rises."),
  ],
  lairCall: [
    L("titancaller", "worried", "Do you hear that crunching, all the way down here? The Geode Titan's lair is up in the canyon, past the crystal ledge. The last shard is inside."),
    L("kit", "worried", "A cave full of crunching. I've seen friendlier welcome mats."),
  ],
  lairLocked: [L("kit", "worried", "Something huge is crunching crystals in there. We'll want every hero we can find first.")],
  lairReady: [L("kit", "worried", "The Geode Titan is in there with the last shard. Are we ready?")],
  // the first time they go in: Cade nearly failed his knight's test, and came back (later tries: lairAgain)
  lairGo: [
    L("knight", "worried", "Kit. On my knight's test, I forgot rule twelve."),
    L("kit", "smug", "The vegetables. I was there."),
    L("knight", "neutral", "I nearly failed. I came back the next day and said all four hundred."),
    L("kit", "laughing", "That's the difference between you and Jumble. You came back."),
    L("knight", "angry", "Then let's go get our shard."),
    L("titancaller", "neutral", "Listen. The crystals in there are singing to my Titan, and it is singing back."),
    L("kit", "shocked", "Maren's Overdrive is filling up all by itself! Save it for the big one."),
  ],
  lairAgain: [
    L("knight", "angry", "We came back. That's what knights do."),
    L("titancaller", "neutral", "Listen. The crystals in there are singing to my Titan, and it is singing back."),
    L("kit", "shocked", "Maren's Overdrive is filling up all by itself! Save it for the big one."),
  ],
  lairWon: [L("knight", "laughing", "We did it! The last shard!")],
  lairLost: [L("kit", "worried", "We fell back. It's very big, and we're very stubborn. We'll try again.")],
  lairDone: [L("kit", "neutral", "Just an empty cave now, and some very chewed crystals.")],

  // ---------------------------------------------------------------- the end of chapter 1
  // Four moments (src/ui/explore.js ending()): the crystal remade, everyone's
  // thanks, a look at the harbor (where the crystal has to go next), and
  // Captain Jumble on his way there. A `cue` sets off something on screen
  // with its line.
  endingCrystal: [
    L("spellwright", "laughing", "The four shards remember each other. Listen!"),
    L("narrator", "neutral", "The shards clicked together, and the new Lore Crystal blazed to life.", { cue: "fuse" }),
    L("narrator", "neutral", "Its light rolled across Driftwood Isle, carrying every true thing it had learned. And the island began to remember.", { cue: "wave" }),
  ],
  endingThanks: [
    L("titancaller", "neutral", "You found every shard, and your words woke a Titan. The sea will remember them."),
    L("spellwright", "laughing", "Three hundred years of students, and you are my finest. I shall write that in my book. In INK!"),
    L("gunner", "smug", "Not bad for a first mission, Shiny Boots. Okay, fine. It was amazing."),
    L("kit", "smug", "Officially, my report says you did very well. Unofficially, you hardly needed me. I'm choosing to be proud of that."),
    L("knight", "smug", "I'm adding a rule to the Code. Rule four hundred and one: never do it alone."),
  ],
  // the film rolls on line 3 ("Look at the lighthouse", ENDING in explore.js) and holds on Kit
  // without the hat; everything after the hat plays over that
  endingHarbor: [
    L("gunner", "smug", "Great. Now we just need a ship. And a harbor. And a nap."),
    L("kit", "neutral", "There's Driftwood Harbor. They have a café called the Salty Biscuit."),
    L("knight", "laughing", "Rule forty of the Code: never say no to a biscuit."),
    L("titancaller", "worried", "Look at the lighthouse. The island's old crystal is fading. Our new one belongs up there."),
    L("kit", "neutral", "Then we carry it down there. Very carefully."),
    L("kit", "shocked", "Hey! My hat!", { cue: "hat" }),
    L("gunner", "angry", "Pockets! Come back here, you furry little pickpocket!"),
    L("knight", "shocked", "But he already has a hat!"),
    L("kit", "smug", "Now he has a matching set."),
    L("kit", "worried", "He's heading into town with my hat. This is now personal."),
    L("titancaller", "worried", "Listen. No bells. No singing. A harbor that big should never be this quiet."),
    L("kit", "worried", "They're forgetting."),
    L("knight", "neutral", "Then we'll remind them."),
  ],
  endingJumble: [
    L("jumble", "laughing", "Glued your little shards back together, crystal carriers? How adorable! But that charming harbor's lighthouse is looking a bit... dim."),
    L("jumble", "smug", "Soon nobody down there will remember a single word. Not a song, not a sum. Not even who failed the Sage exams!"),
    L("jumble", "angry", "And even if you save ONE island, I have ninety-nine more to scramble! Ha! Is that right? Ninety-nine? Hold on."),
    L("titancaller", "neutral", "He is still out there. Then so are we.", { cue: "dark" }),
  ],
  // back to exploring after the ending: Pockets has the hat, and Kit has none until Hal's tea cozy
  endingAfter: [L("kit", "worried", "Nobody look at me. A droid with no hat is just a sad lamp.")],
  mapHarborAfter: [
    L("kit", "worried", "Driftwood Harbor. The lighthouse, the Salty Biscuit, and somewhere down there, my hat."),
    L("knight", "neutral", "We'll get it back, Kit. Rule six: one island at a time."),
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
  fellBack: [L("kit", "worried", "That didn't go our way. We regrouped at the rest crystal. Everyone's patched up and ready.")],
};

/** Every conversation: chapter 1's, then chapter 2's (lines2.js). A chapter 2 key never reuses a chapter 1 one (test/chapter2.test.js). */
export const CONVOS = { ...CONVOS1, ...CONVOS2 };

/** Kit's line when a wild fight starts, by the first fiend. */
export const WILD_INTRO = {
  scrap_raptor: "wildRaptor",
  magnet_beetle: "wildBeetle",
  ink_slime: "wildSlime",
  volt_jelly: "wildJelly",
  dominion_drone: "wildDrone",
  ...WILD_INTRO2,
};

/** Which hotspots show right now. Anything not listed always shows. */
export const VISIBLE = {
  "cove.monkey": (w) => !w.monkeys.cove,
  "cove.bottle": (w) => !w.flags.bottle,
  "temple.monkey": (w) => !w.monkeys.temple,
  "temple_hall.cage": (w) => !w.flags.cageOpen,
  "temple_hall.spellwright": (w) => !w.party.includes("spellwright"),
  "canyon.monkey": (w) => !w.flags.traded,
  "canyon.gunner": (w) => !w.party.includes("gunner"),
  "grotto.titancaller": (w) => !w.party.includes("titancaller"),
  // chapter 2's rewards for going back to chapter 1's places
  "cove.cave": (w) => Boolean(w.flags.tideOut),
  "temple_hall.door": (w) => Boolean(w.flags.libraryOpen),
  "canyon.propeller": (w) => Boolean(w.flags.partsFound),
  "canyon.figurehead": (w) => Boolean(w.flags.partsFound),
  ...VISIBLE2,
};

/**
 * The painted changes (art wave 04 state patches): "scene.state" → when it
 * shows. Each state is a patch cut from a repainted copy of the scene.
 */
export const PAINTED = {
  "cove.chest_open": (w) => w.shards.includes("cove"),
  "cove.bottle_gone": (w) => Boolean(w.flags.bottle),
  "cove.fish_gone": (w) => Boolean(w.flags.fish),
  "cove.gate_open": (w) => Boolean(w.flags.gateOpen),
  "temple.door_open": (w) => Boolean(w.flags.doorOpen),
  "temple_hall.cage_open": (w) => Boolean(w.flags.cageOpen),
  "grotto.shrine_awake": (w) => Boolean(w.flags.shrineAwake) || w.party.includes("titancaller"),
  "cove.tide_out": (w) => Boolean(w.flags.tideOut),
  "temple_hall.library_open": (w) => Boolean(w.flags.libraryOpen),
  "canyon.parts": (w) => Boolean(w.flags.partsFound),
  ...PAINTED2,
};

/** Which hotspots glow as "something to do here" (the rest are just for looking). */
export const SPARKLE = {
  "cove.sign": (w) => !w.flags.signFixed,
  "cove.chest": (w) => !w.shards.includes("cove"),
  "cove.pool": (w) => !w.flags.fish,
  "cove.bottle": () => true,
  "cove.gate": (w) => w.party.includes("spellwright") && !w.flags.gateOpen,
  "temple.door": (w) => !w.flags.doorOpen,
  "temple_hall.spellwright": () => true,
  "temple_hall.cage": () => true,
  "canyon.gunner": () => true,
  "canyon.monkey": () => true,
  "canyon.chasm": (w) => w.items.includes("pulley") && !w.flags.zipDone,
  "canyon.lair": (w) => w.party.includes("titancaller") && !w.shards.includes("lair"),
  "grotto.titancaller": () => true,
  // a glint where someone has a story to tell (the moments he finds by looking), until it's told
  "temple_hall.mural": (w) => w.party.includes("spellwright") && !w.flags.muralStory,
  "canyon.airship": (w) => w.party.includes("titancaller") && !w.flags.wrenStory,
  "grotto.sea": (w) => w.party.includes("titancaller") && !w.flags.marenStory,
  ...SPARKLE2,
};

// `quiet`: the first telling is a quiet moment (api.hush in explore.js): the
// music steps back and the view leans in on `quiet.hot`, and with `song`,
// Maren's song comes in softly under it.
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

/** What happens on arriving in a scene (first visits). */
export const ARRIVE = {
  temple: (api) => once(api, "seenTemple", "templeArrive"),
  temple_hall: (api) => once(api, "seenHall", "hallArrive"),
  canyon: (api) => {
    // the last shard is in, but the game closed before the ending was over: it plays now
    if (api.world.shards.includes("lair") && !api.world.finished) return api.ending();
    return once(api, "seenCanyon", "canyonArrive");
  },
  grotto: (api) => once(api, "seenGrotto", "grottoArrive"),
};
// chapter 2's arrivals come after chapter 1's (the canyon's ending first, if it's still to play)
for (const [id, more] of Object.entries(ARRIVE2)) {
  const first = ARRIVE[id];
  ARRIVE[id] = first ? async (api) => (await first(api), api.world.finished ? more(api) : undefined) : more;
}

/** A scene exit: return false to stay put. */
export const EXITS = {
  "temple.door": (api) => openDoor(api),
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
    api.refresh();
    await api.wait(700);
    await api.say("gateOpened");
    return true;
  },
  ...EXITS2,
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

  "cove.rest": (api) => restAt(api),

  // ---------------------------------------------------------------- the temple
  "temple.glyphs": (api) => api.say(api.world.party.includes("spellwright") ? "glyphsRead" : "glyphs"),
  "temple.pillar": (api) => api.say("pillar"),
  "temple.rest": (api) => restAt(api),
  "temple_hall.spellwright": (api) => freeSpellwright(api),
  "temple_hall.cage": (api) => freeSpellwright(api),
  "temple_hall.tablets": (api) => api.say(api.world.party.includes("spellwright") ? "tabletsRead" : "tablets"),
  // once Knox is with him: the friend who should be on the mural, told once
  "temple_hall.mural": (api) => {
    if (!api.world.party.includes("spellwright")) return api.say("mural");
    return once(api, "muralStory", "muralSeat", "muralRead", { hot: "mural" });
  },
  "temple_hall.rest": (api) => restAt(api),
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
  // Wren's family ship: her story waits until Maren has joined, so the song's stretch stays quiet
  "canyon.airship": (api) => {
    const w = api.world;
    if (w.party.includes("titancaller")) return once(api, "wrenStory", "airshipStory", "airshipSad", { hot: "airship" });
    return api.say(w.party.includes("gunner") ? "airshipSad" : "airship");
  },
  "canyon.gunner": async (api) => {
    const w = api.world;
    // with her power cell back, she calibrates (again, if he stepped away from it)
    if (api.has("power_cell") || w.flags.gotCell) return repairBlaster(api);
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
    api.pose("monkey", "raspberry");
    await api.say("monkeyThief");
    api.pose("monkey", "hold");
    if (!api.has("rubbery_fish")) await api.say("monkeyNoFish");
  },
  "canyon.ledge": (api) => api.say("ledge"),
  "canyon.rest": (api) => restAt(api),
  "canyon.chasm": (api) => crossChasm(api),

  // ---------------------------------------------------------------- the grotto
  "grotto.shrine": (api) => api.say(api.world.party.includes("titancaller") ? "shrineQuiet" : "shrine"),
  "grotto.titancaller": (api) => wakeShrine(api),
  // once she has joined: her island, told once
  "grotto.sea": (api) => {
    const w = api.world;
    if (w.party.includes("titancaller")) return once(api, "marenStory", "seaStory", "sea", { hot: "sea", song: true });
    return api.say(w.flags.metCaller ? "sea" : "seaSong");
  },
  "grotto.rest": (api) => restAt(api),
  // after chapter 2's lamp room: the tide pools' crab is practicing
  "grotto.pools": (api) => {
    const w = api.world;
    if (w.flags.gridSeen) return once(api, "grottoCrab", "grottoCrab", "pools");
    return api.say(w.flags.metCaller ? "pools" : "poolsSong");
  },
  "canyon.lair": async (api) => {
    const w = api.world;
    if (w.shards.includes("lair")) {
      // the chapter's over: he can watch the ending again (with the parent's films, once they're in)
      await api.say("lairDone");
      // and in chapter 2, once the island starts remembering, a deeper chamber opens
      const deeper = w.flags.lairDeepOpen ? ["Go deeper"] : [];
      const pick = await api.choose([...deeper, "Watch the ending again", "Not now"]);
      if (deeper.length && pick === 0) return api.travel("lair_deep");
      if (pick === deeper.length) await api.ending();
      return;
    }
    if (!w.party.includes("titancaller")) return api.say("lairLocked");
    // a fight picked back up (the game closed mid-fight) skips all the talk
    if (!api.resumingFight) {
      await api.say("lairReady");
      const pick = await api.choose(["Let's go!", "Not yet."]);
      if (pick !== 0) return;
      // the first time in, Cade's rule twelve; on later tries, one line
      await once(api, "lairTried", "lairGo", "lairAgain");
    }
    const r = await api.battle({ ...BOSS_FIGHT });
    if (r.quit) return;
    if (!r.won) return api.say("lairLost");
    await api.say("lairWon");
    await api.shard("lair");
    await api.ending();
  },
  ...SCRIPTS2,
};

/** Using an item on a hotspot. */
export const USES = {
  ...USES2,
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
  "canyon.chasm": {
    pulley: (api) => crossChasm(api),
  },
};

/** The temple's round door: the code is the P.S. on Jumble's note. Resolves true when he can go in. */
async function openDoor(api) {
  const w = api.world;
  if (w.flags.doorOpen) return true;
  if (!w.flags.doorSeen) {
    w.flags.doorSeen = true;
    api.save();
    await api.say("door");
  }
  if (!api.has("jumble_note")) {
    await api.say("doorNoClue");
    return false;
  }
  if (!w.flags.doorClue) {
    w.flags.doorClue = true;
    api.save();
    await api.say("doorClue");
  }
  let tier = 2;
  for (;;) {
    const solved = await api.puzzle("door", { tier });
    if (solved === null) {
      await api.say("doorWait");
      return false;
    }
    if (solved) break;
    tier = 1;
    await api.say("doorMissed");
  }
  api.sfx("sfx_door_stone");
  api.shake(10, 900);
  w.flags.doorOpen = true;
  api.save();
  api.refresh();
  await api.wait(600);
  await api.say("doorOpen");
  return true;
}

/** A rest crystal: everyone healed. */
async function restAt(api) {
  api.rest();
  if (!api.world.flags.rested) {
    api.world.flags.rested = true;
    api.save();
    await api.say("restFirst");
  } else await api.say("restAgain");
}

/** The rope over the canyon's chasm: with Wren's pulley, the party zips down to the Tide Grotto. */
async function crossChasm(api) {
  const w = api.world;
  if (!api.has("pulley")) return api.say("chasm");
  // they haven't stopped to listen yet (the drones' fight went badly): the singing first
  if (!w.flags.heardSong && !w.flags.metCaller) await api.say("hearSong");
  if (w.flags.zipDone) {
    await api.say("chasmAgain");
    if ((await api.choose(["Wheee!", "Not now."])) !== 0) return;
  } else await api.say("chasmZip");
  w.flags.zipDone = true;
  api.save();
  // the ride itself is on the island map: the party slides down the rope to the grotto
  await api.zipMap("canyon", "grotto");
}

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
  await api.give("pulley");
  await api.join("gunner");
  // drones come for the shard: her blaster gets a real test, Overdrive and all, before the quiet
  await api.say("dronesIncoming");
  const r = await api.ambush(["dominion_drone", "volt_jelly"]);
  if (r.quit || !r.won) return; // the song waits for the rope instead
  await api.say("blasterTested");
  await api.wait(1400);
  await api.say("hearSong");
}

async function wakeShrine(api) {
  const w = api.world;
  if (w.party.includes("titancaller")) return;
  if (!w.party.includes("gunner")) return api.say("callerEarly");
  if (!w.flags.metCaller) {
    // she stops singing and turns around
    w.flags.metCaller = true;
    api.save();
    api.refresh();
    await api.wait(900);
    await api.say("caller");
  } else await api.say("callerBack");
  for (;;) {
    const solved = await api.puzzle("shrine", {});
    if (solved === null) return api.say("callerWait");
    if (solved) break;
    await api.say("callerMissed");
  }
  w.flags.shrineAwake = true;
  api.save();
  api.sfx("sfx_summon_rise");
  api.flash("#b8fff0");
  api.shake(14, 900);
  api.refresh();
  await api.wait(600);
  await api.say("callerJoins");
  await api.join("titancaller");
  // and point him at the last shard: a rumble from the lair, which glows
  api.sfx("sfx_quake");
  api.shake(8, 800);
  api.beckon("lair");
  await api.wait(500);
  await api.say("lairCall");
}

/** Every line in the story, for pre-recording: [{ who, text }]. */
export function storyLines() {
  return Object.values(CONVOS).flatMap((lines) => lines.map(({ who, text }) => ({ who, text })));
}
