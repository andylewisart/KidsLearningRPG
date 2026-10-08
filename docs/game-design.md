# Game design

*Working title: **Crystal Titans**. He gets to name the real thing.*

## The pitch

A turn-based RPG with the **art of Final Fantasy X** and the **humor of The Secret of Monkey Island**, where every attack, spell and summon is a piece of Utah 3rd grade.

- The **Knight's** strikes are subtraction. He works out the enemy's new HP, and the bar drops to exactly his answer.
- The **Gunner's** volleys are multiplication.
- The **Spellwright** casts spells by spelling them.
- The **Titan Caller** summons the giant creatures *he* invented by writing their entrance.

He picks how hard each move is, and harder hits harder. Between fights, he explores painted islands Monkey Island–style: talking his way past pirates, out-insulting swordsmen, and catching a shady shopkeeper's math "mistakes."

**The player:** a Utah 3rd grader in the 2026–27 school year who loves Godzilla, the powerful legendary-tier Pokémon, Star Wars and Story Quest's Creature Lab, and who collects everything. He's learning multiplication now. His weak spots are subtraction, spelling and creative writing. He's a warrior: enemies die (in a burst of light), and that's the fun.

## Inspirations

| From Final Fantasy X | In this game |
|---|---|
| A lush tropical world, ancient ruins, glowing pyreflies | **The Sundered Isles.** Defeated fiends burst into glowing motes. Satisfying, never gory. |
| A turn order you can see | The same, and no clock ever runs while he's thinking |
| Swapping party members mid-battle; each fiend type has a hero who counters it | Three heroes fight and one waits. Armored fiends call for the Knight, fliers for the Gunner, slimes for the Spellwright, giants for the Titan Caller. Subject variety comes from strategy, not chores. |
| Overdrives | **Overdrives:** chains of quick problems where every right answer is another hit |
| Aeons | **Titans:** his own creatures, summoned by writing |
| The Sphere Grid | **The Crystal Grid:** every node is a real skill, and it lights up as he masters it |
| Celestial Weapons | **Legendary Weapons:** each needs a crest from a hidden boss *and* a mastery sigil. The Gunner's sigil is "every times-table fact from memory," the state's year-end goal. |
| Monster Arena captures | Finish a fiend with a ★★★ move to **capture** it. Full sets unlock secret Arena bosses. |
| Al Bhed Primers | **Lost Primers:** each one teaches a spelling rule and decodes more of the ancient script on the ruins |
| Sin, the colossal menace | **The Leviathan:** a sea titan the size of a mountain range that rises every few years and wrecks a city |

| From The Secret of Monkey Island | In this game |
|---|---|
| Insult sword fighting | **Wit Duels:** match the comeback to the taunt (word meanings, similes, puns), collect comebacks, beat the Sword Master |
| Stan the salesman | **Honest Hal's Previously Plundered Goods.** His totals are "accidentally" wrong. Catch the mistake and get the discount. |
| Point-and-click exploration and item puzzles | Towns and ruins are painted scenes. Tap to look, talk, take and use. |
| Jokes everywhere | Every item, fiend and townsperson has a joke. The tutor is a deadpan droid. A three-eyed monkey hides in every scene. |
| LeChuck | **Captain Jumble:** a ghost-pirate sorcerer with an enormous ego who scrambles words and numbers wherever he sails |

## Design pillars

1. **Fun first, and the learning *is* the game.** No quiz pop-ups. The math is the HP bar, the volley and the shop price. Spelling is the spell. Writing is the summon.
2. **Epic art, funny writing.** FFX-grade spectacle, with Monkey Island wit in every line. Cool, never babyish.
3. **He's a real warrior.** Fiends die, bosses are fierce, the party wins by fighting. (No gore: the dead burst into light.)
4. **He chooses the challenge.** Every move has tiers. Harder hits harder, and trying the hard one earns something even when he misses.
5. **Mistakes are part of the fight.** A wrong answer means the fiend dodged. The tutor shows how, and he tries again. No timers, no shame screens.
6. **Everything is collectible.** Abilities, Titans, captured fiends, words, comebacks, weapons and secrets, all in one Compendium with completion percentages.
7. **All of Utah's 3rd grade, tracked against the state standards.** See [`curriculum.md`](curriculum.md).
8. **Short sessions, strong hooks.** About 15–20 minutes that end on a cliffhanger.

## The world (a sketch he can reshape)

- **The Sundered Isles** are a tropical archipelago: pirate ports, jungle temples, crystal canyons, a neon harbor city, an ice island, a volcano. Lore Crystals power airships and cities and hold the world's knowledge. When a crystal dims, signs lose their letters, numbers scramble and fiends multiply.
- **The Leviathan** rises from the deep every few years and levels a city. Only a Titan Caller who has bound enough Titans can stand against it.
- **The Iron Dominion**, an empire of masked commanders and drone fleets, wants to *control* the Leviathan by draining the crystals.
- **Captain Jumble**, a ghost-pirate sorcerer, sabotages everyone for fun. He's loud, vain and secretly insecure: he once failed the Sage exams and swore revenge on reading. The heroes keep trying when they fail. That's the theme, never the lecture. His final defeat is a Wit Duel.
- **One island and one crystal per chapter**, about one chapter a month, following his class. The party gets a ship early and an **airship around winter break**. The finale against the Leviathan lands in May. 4th grade becomes the sequel: a new ocean.

## The party

He picks which class his own hero is (in the Hero Forge, [`art/waves/wave-01-first-battle.md`](../art/waves/wave-01-first-battle.md)). The other three become companions he names.

| Hero | Core skill (Utah) | Counters | Moves |
|---|---|---|---|
| ⚔️ **Crystal Knight** | Add and subtract within 1000 (3.NBT.2) | Armored fiends | **Strike:** "The beetle has 342 HP. Crystal Edge hits for 187. HP left?" The bar drops to his answer. **Guard:** "The shield blocks 145 of 400. How much gets through?" Healing is addition. **Overdrive, Chain Strike:** a chain of quick strikes. |
| 🔫 **Sky-Pirate Gunner** | Multiplication and division (3.OA) | Fliers | **Volley:** 4 bursts × 7 bolts, drawn as an array at ★ and bare numbers at ★★★. **Split Shot:** 24 damage spread evenly over 3 drones. **Reload:** "How many volleys of 6 make 42?" **Overdrive, Bullet Storm:** chained times-table facts, every right answer another shot. |
| 🔮 **Spellwright** | Spelling and word study (3.R.2–3) | Slimes and elementals | **Spells by spelling:** ★ fill in missing letters (fr _ _ nd), ★★ arrange letter tiles, ★★★ hear the word in a sentence and spell it. **Affix runes:** *un-*, *re-*, *dis-*, *-ful*, *-less* change a spell. His weekly school list becomes that week's spell scrolls. **Overdrive, Word Storm:** chained words, every one a bolt. |
| 🐉 **Titan Caller** | Writing (3.W.1–3) | Colossal fiends | **Summon:** write a Titan's entrance (see Titans). **Overdrive, Grand Summon:** two Titans at once, written as a tag-team entrance. |

## Battles

**Turn order:** the order is shown on screen, Final Fantasy X style. Three heroes fight and one waits. On a hero's turn, he can **swap** in the waiting hero, who acts immediately. Fiend types tell him whom to bring:

- armored fiends shrug off everything but the Knight;
- fliers dodge everything but the Gunner's volleys;
- slimes split when struck but melt under spells;
- colossal fiends need a Titan.

**Tiers** (his original idea) are on every move.

| Tier | What it is | Payoff |
|---|---|---|
| ★ Quick | Something he's mastered, often with a picture (array, number line) | Small hit, fast, builds Overdrive |
| ★★ Power | His current edge | About 3× the damage |
| ★★★ Ultimate | A stretch: bigger numbers, no picture, from memory | About 8× the damage plus a bonus (stun, armor break). **A ★★★ finishing blow captures the fiend.** |

- **The stars follow his skill, not a fixed list.** Each skill is tracked, and the three tiers move up as he improves. ★ never gets boring and ★★★ is never impossible.
- **Bravery counts.** A missed ★★★ still earns *Brave* points toward Overdrive.
- **Overdrive** fills from right answers, brave attempts and taking hits. It's a combo: he keeps answering as long as he dares, and each right answer is another hit. A miss ends it, but the damage stays.
- **Defeat:** fiends burst into a swirl of glowing motes with a satisfying sound. **Capture:** a ★★★ finisher pulls the motes into a crystal instead, sending the fiend to the Monster Arena (up to 10 of each kind).
- **When he misses,** the fiend dodges and the tutor offers "Want to see how?" He gets a quick visual walkthrough, then a retry for half damage. **Losing** sends the party back to the last camp with XP and items kept.
- **Juice:** hit-stop, screen shake, particles, big damage numbers, critical flashes, fanfares. Getting it right should *feel* great.

## Titans: his creatures, his writing

This is the feature to build around. He already loves the Creature Lab, and kaiju are his thing.

- **His Creature Lab creatures become Titans.** The RPG can live on the same site as Story Quest (`andylewisart.github.io`). When both run in the same browser, the RPG can read his creatures (paintings, stats, abilities) without changing Story Quest.
- **The Titan Forge** inside the RPG works like the Creature Lab for new Titans: detail stars → rarity → painting.
- **Summoning is a writing moment.** When the Titan gauge is full, he writes the entrance:
  - ★ fill in a frame: "___ burst out of the sea, its ___ glowing ___"
  - ★★ one sentence
  - ★★★ two or three sentences

  Story Quest's picture test and writing spells (sound words, similes, power-words…) set the power, from 🕯️ Tiny to 🌋 MEGA. His Titan's painting slams onto the screen, the camera shakes, and **his own sentence is read out in a movie-trailer voice** as the damage lands.
- **Titans level up** with use and by revising their description, just like evolving in the Creature Lab.

## Job Crystals: the rest of 3rd grade

Each hero has one crystal slot, which adds a second command (like a secondary skill set in Final Fantasy Tactics). Crystals unlock as his class reaches each topic; you can unlock them early. Exact standards are in [`curriculum.md`](curriculum.md).

| Crystal | Utah topic | How it plays |
|---|---|---|
| ⏳ **Time Mage** | Time to the minute, elapsed time (3.MD.1) | Haste and Slow durations on a clock face: "Haste lasts from 3:45 to 4:10. How many minutes?" |
| ⚗️ **Alchemist** | Fractions; mass and liquid volume (3.NF.1, 3.NF.3, 3.MD.2) | Fill a potion to 3/4. Which flask holds more, 2/3 or 2/6? Brew with milliliters and liters, forge with grams and kilograms. |
| 🔱 **Dragoon** | Number lines: rounding and fractions on a line (3.NBT.1, 3.NF.2) | **Jump** lands on a point of a number line, like rounding 462 to the nearest hundred or landing on 5/8. |
| 🌋 **Geomancer** | Area, perimeter, shapes (3.MD.5–8, 3.G.1–2) | Quake hits a rectangle of tiles (area). Raise walls around camp (perimeter). Seal a portal with "4 equal sides, no square corners." |
| 🏹 **Ranger** | Scaled graphs, line plots (3.MD.3–4) | Scouting reports drawn as graphs: "How many more drones than raptors?" |
| 🔬 **Scholar** | Science: weather, traits and survival, forces and magnets (SEEd 3.1–3.3) | **Scan** reveals a fiend's weakness when he answers a science question about it. Storm magic. Magnet and push-block puzzles. |
| ✨ **Cleric** | Sentences and conventions (3.W.1–3 b/c) | Status ailments are broken sentences: *Silenced?* Add the missing punctuation. **Restore** expands a sentence ("The beast roared." → when, where, why). |
| 📜 **Sage** | Reading (3.R.5–14) | Read a Legend Titan's myth and answer to bind it (a world serpent, a thunderbird, a kraken). Ancient tablets hold passages that lead to treasure. |
| 🗺️ **Envoy** | Social studies (Utah 3.1–3.4) | Island councils, maps and charts, governments compared (a monarchy isle, a pirate democracy, a merchant oligarchy), taxes (the tax collector is a fiend), and real-world missions about his own town done with you. |

## Exploring (the Monkey Island part)

- **Painted scenes.** Each town, beach and ruin is one painted scene. He taps to walk, look, talk, take and use. Item puzzles have fair clues he has to *read*. The jokes live in the descriptions: "A rubbery fish. It squeaks. You're not sure that's a feature."
- **Talking.** Dialogue trees with funny choices. That's reading practice, with read-aloud only when he asks for it.
- **Wit Duels** (Monkey Island insult sword fighting). A rival throws a taunt; he picks the comeback that fits:
  > "My grandma swings a sword better than you!" → "I know. She taught me, right after she finished beating *you*."
  >
  > "You're as slow as a sleepy snail!" → "Then how did I get here before your brain did?"

  Each comeback learned from a rival goes into the Compendium. The Sword Master only falls to the full set. Later, he writes his own taunts and comebacks, and the tutor judges whether they land. This covers similes, metaphors, word meanings and multiple-meaning words (3.R.8–9) plus respectful back-and-forth (3.SL.1).
- **Honest Hal's Previously Plundered Goods.** A fast-talking salesman whose totals and change are "accidentally" wrong. Spotting it ("3 potions at 45 gold is NOT 145!") earns a discount. This trains estimation and checking reasonableness (3.OA.8.c), plus add, subtract and multiply.
- **Story choices with tiers.** A defeated pirate sulks on the dock:
  - ★ finish "The pirate was angry because ___"
  - ★★ write what your hero says to him
  - ★★★ write his side of the story, and he joins your crew as a shopkeeper
- **Engineering quests** (science design loops): build a flood barrier for the harbor (SEEd 3.1.3), a magnetic latch for the treasure vault (3.3.5), a fix for a habitat after a change (3.2.6). The loop is design → test → improve.
- **Droid protocols:** program the tutor droid through a trap room with sequences, loops and if-then (Utah computer science 3.AP.1).
- **Camp** ends every session. The heroes rest, he writes a few lines in the journal, and the next hook is teased. In May, print the journal as a real book.
- **Travel:** a sea chart of the Isles. A ship at first, then the airship.

## The Compendium (his favorite page)

One place to see *everything* he's earned, with a completion percentage on every page.

| Page | What's in it |
|---|---|
| **Heroes and abilities** | Every move each hero knows, with its tier stars, Overdrives and crystal skills |
| **The Crystal Grid** | A glowing board where every node is a real skill ("×7 facts," "subtract across zeros," "vowel teams," "dialogue"). Nodes light up as he masters them and grant stats and abilities. It's also the curriculum map in disguise. |
| **Legendary Weapons** | One per hero. Each needs a crest (a hidden boss) and a sigil (a mastery milestone, like all times tables from memory) |
| **Titans** | His creatures, their levels and their entrance lines |
| **Monster Arena** | Captured fiends (up to 10 each). Completing an island's set unlocks a secret Arena boss. He can rematch any of them for practice. |
| **Bestiary** | Every fiend he's defeated: kill count, weaknesses, a real science fact and a joke |
| **Spellbook** | Every word he's mastered, grouped by spelling pattern |
| **Lost Primers** | Spelling rules found in the world, plus how much of the ancient script he can now read |
| **Comebacks** | Every Wit Duel line he's collected |
| **Treasures** | Key items and oddities, each with a funny description |
| **Trophies** | Achievements: "Beat a boss using only ★★★ moves," "1,000 volleys fired," "Found every monkey on Driftwood Isle" |
| **Journal** | Everything he's written |

## The tutor

A deadpan little droid in a battered pirate hat it insists is intimidating. It's funny, but never at his expense, and it's always on his side. Help comes in layers, fastest and cheapest first. Most help never needs AI.

1. **Built-in hints (no AI).** Visual models drawn by the game: arrays, number lines, base-ten blocks, fraction bars, clock faces. Plus **mistake-specific mini-lessons:** 52 − 27 = 35 means he took 2 from 7 instead of regrouping, so he gets the regrouping lesson, not a generic one. The mistake patterns come from Utah's Core Guides (see [`curriculum.md`](curriculum.md)).
2. **The Training Hall (no AI).** Each new skill or crystal opens with a short lesson: *I do* (the droid shows), *we do* (step by step), *you do* (on his own). Then the ability unlocks.
3. **Ask the droid (AI).** On any problem, it sees the problem, his answer, his mistake pattern and his history with that skill. It asks one guiding question at a time instead of handing over the answer, and it can **drive the game's visuals** (open a number line, build an array) to show rather than tell.
4. **Talk it out (AI voice),** like Story Quest's voice coach. In math, he explains his thinking out loud. In writing, he talks ideas through before typing.

**Guardrails** (from Story Quest's rules):

- Kid-safe, never asks for personal information, and points him to a trusted grown-up if something sounds wrong in real life.
- Never mentions spelling during creative writing. Words he misspells there quietly become future spell scrolls.
- Daily limits, an API spending limit, and every conversation readable in the grown-ups corner.

**Without AI** (no key, or offline), layers 1–2 still work, so the game is complete.

**Which AI** is still open. The simplest path reuses Story Quest's OpenAI setup: the same key, already saved on the same site, plus the image model for Titans and the realtime voice. The tutor could run on Claude instead, with its own API key.

## Measuring progress

The full mapping is in [`curriculum.md`](curriculum.md).

- **Every problem is tagged** with the Utah standard it practices (for example `3.OA.7.b`, `3.R.3.b`).
- **Mastery per skill** comes from accuracy, how recently he practiced, and (for facts) answer speed, measured quietly and never shown as a timer.
- **The grown-ups corner** shows:
  - a Utah standards checklist
  - his mistake patterns
  - words missed and mastered
  - his writing
  - time played
  - where he stands against Utah's own checkpoints (Acadience Reading in fall, winter and spring, and RISE in spring)
  - a **Copy report for Claude** button, like Story Quest's
- **Bosses double as unit checks.** In spring, the game adds practice in the *formats* of the RISE test (drag-and-drop, multi-select, typed answers) so the real test feels familiar.

## Rhythm

| Scale | What happens |
|---|---|
| **Session** (15–20 min) | Explore a scene → 3–5 battles → a story, duel or writing moment → camp journal → cliffhanger |
| **Week** | Monday: new spell scrolls from his school list. Thursday: the Spell Boss (before a Friday test). Weekend: a story event. |
| **Year** | About one island a month, following his class. The airship around winter break. RISE-format practice in spring. The Leviathan and a printed journal in May. |

## Tech plan

- **Stack:** a static web app in plain JavaScript modules, bundled with esbuild and tested with `node --test`, the same stack as Story Quest.
- **Hosting:** GitHub Actions publishes it to **GitHub Pages at `andylewisart.github.io/KidsLearningRPG/`**, the same site as Story Quest. That's what makes creature import and key sharing work.
- **Saves:** IndexedDB, not localStorage. The two games share the site's roughly 5 MB of localStorage, and Story Quest drops paintings when it fills up. Safari can clear site data after about a week without a visit, and iPad home-screen apps get separate storage. So there's a **Back up progress** button, and cloud save later if needed.
- **Battles:** painted sprite sheets animated in HTML/CSS (the Web Animations API), plus a canvas layer for particles. **Scenes:** painted backgrounds, invisible walkable areas and tappable hotspots defined in data.
- **Input:** a big in-game number pad and letter keyboard. No autocorrect quietly fixing his spelling, and no on-screen keyboard covering the fight.
- **Art:** Codex generates all of it and drops it into `public/assets/` with a manifest, following [`art/PRODUCTION.md`](../art/PRODUCTION.md). The game only ever loads art through that manifest.
- **Content:** math problems are generated (unlimited, each tagged with its standard). Spelling, reading, duel, grammar and science items are written ahead of time and reviewed.

## Roadmap

| Phase | What ships | Needs |
|---|---|---|
| **0. Design** | This doc, the curriculum map, the art direction | ✅ in progress |
| **1. First playable battle** | Four heroes and five fiends plus the Geode Titan boss. Tiers, swapping, Overdrives, capture, a Titan summon with writing, built-in hints, saves. He plays for a few days, then we tune. | Art wave 1 |
| **2. Chapter 1: Driftwood Isle** | Point-and-click port town and jungle ruins, Wit Duels, Honest Hal, story, leveling, Compendium v1, weekly spelling list, grown-ups corner v1 | Art wave 2 |
| **3. The tutor** | Ask-the-droid and voice, the Training Hall, mistake detection | — |
| **4+. One island a month** | New crystals following his class, RISE-format practice in spring, the Leviathan in May | Art wave per chapter |

## Open questions

- His hero: class, name, look, battle cry (Hero Forge)
- Tutor AI: reuse Story Quest's OpenAI setup, or run the tutor on Claude?
- Which device(s): iPad, Chromebook, laptop?
- Does his school send a weekly spelling list?
- Should Sparky make a cameo (as a Titan, or the droid's rival)?
