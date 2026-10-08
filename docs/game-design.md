# Game design

*Working title: **Crystal Titans**. He gets to name the real thing.*

## The pitch

A Final Fantasy–style RPG where every attack, spell and summon is a piece of 3rd grade.

He leads a party of four through a world of crystals, airships and Titans the size of skyscrapers:

- The **Knight's** sword strikes are subtraction. He works out the enemy's new HP, and the bar drops to exactly his answer.
- The **Gunner** fires volleys, and a volley is multiplication: 4 bursts of 7 shots.
- The **Spellwright** casts spells by spelling them.
- The **Titan Caller** summons the creatures *he* invented by writing their entrance. The better he writes, the harder the Titan hits.

He picks the difficulty of every move. Harder problems mean bigger attacks.

**The player:** a Utah 3rd grader in the 2026–27 school year. He loves Godzilla, the powerful legendary-tier Pokémon, Star Wars, and the Creature Lab in Story Quest. He's learning multiplication right now. His weak spots are subtraction, spelling and creative writing.

## Design pillars

1. **Fun first, and the learning *is* the game.** No quiz pop-ups standing between him and the fun. The math is the HP bar, the volley count, the shop price. Spelling is the spell. Writing is the summon.
2. **Cool, not cute.** Cinematic art, kaiju-scale Titans, a real villain, real stakes, real jokes. Never babyish.
3. **He chooses the challenge.** Every move has tiers. Harder hits harder, and trying the hard one earns something even when he misses.
4. **Mistakes are part of the fight.** A wrong answer means the enemy dodged. The tutor shows how, and he tries again. There are no timers and no shame screens.
5. **His ideas become the world.** His Titans, his hero, his battle cry, his journal, his names.
6. **All of Utah's 3rd grade, tracked against the state standards.** Every problem is tagged with the Utah standard it practices (see [`curriculum.md`](curriculum.md)).
7. **Short sessions, strong hooks.** About 15–20 minutes that end on a cliffhanger.

## Why Final Fantasy fits him

Final Fantasy already blends everything he likes. Magic and machines, airships, and an evil empire against a band of rebels (Final Fantasy VI is basically Star Wars with magic). Summons that are giant monsters fighting each other (the Final Fantasy XVI summon battles are straight-up kaiju fights). And monster collecting.

So the setting is **techno-fantasy with kaiju Titans**. Every name and design is original. The repo is public, and OpenAI's image models refuse lookalikes anyway (Story Quest already hit this with Godzilla).

## World and story (a sketch he can reshape)

- **The world runs on Lore Crystals.** They power airships and cities, and they hold the world's knowledge. When a crystal dims, knowledge fades with it: signs lose their letters, numbers scramble, and creatures go wild.
- **The Iron Dominion**, an empire with masked commanders and drone armies, is draining the crystals to wake ancient Titans as war machines.
- **The Jumbler** is a chaotic trickster who scrambles words and numbers for fun. He's a Kefka-style wild card who works for the Dominion until he doesn't. His secret: he was once a brilliant scholar who quit after failing. The heroes are the ones who keep trying. That's the theme, never the lecture.
- **One region and one crystal per chapter**, roughly one chapter a month. New Job Crystals arrive when his class reaches those topics.
- **The party gets an airship around winter break.** That's a huge Final Fantasy moment, and the world map opens up.
- **The finale lands in May**, when 3rd grade ends. Then 4th grade becomes the sequel: a new continent.

## The party: four classes, four core subjects

He picks which class his own hero is (in the Hero Forge, [art batch 01](../art/batches/batch-01-first-battle.md)). The other three become companions he names. All four fight in every battle, so all four subjects get practice without him having to choose them.

| Class | Core skill | In battle |
|---|---|---|
| ⚔️ **Crystal Knight** | Addition and subtraction within 1000 | **Strike:** "The raptor has 342 HP. Crystal Edge hits for 187. HP left?" He types it, and the bar drops to exactly his answer. **Guard:** "The shield blocks 145 of the 400 damage. How much gets through?" Healing is addition. |
| 🔫 **Sky-Pirate Gunner** | Multiplication and division | **Volley:** "4 bursts × 7 bolts" is drawn as an array of glowing bolts at ★ and shown as bare numbers at ★★★. **Split Shot:** "Spread 24 damage evenly across 3 drones. How much does each take?" **Reload:** "How many volleys of 6 to deal 42?" (unknown factor) |
| 🔮 **Spellwright** | Spelling and word study | Spells are cast by spelling: ★ fill in the missing letters (fr _ _ nd), ★★ arrange letter tiles, ★★★ hear the word (in a sentence) and spell it from scratch, like the real test. **Affix runes** modify spells: *un-*, *re-*, *-ful*, *-less*. This week's school list becomes this week's spell scrolls. |
| 🐉 **Titan Caller** | Writing | **Summon:** pick one of his Titans and write its entrance. Story Quest's *picture test* sets the power, from 🕯️ Tiny to 🌋 MEGA. More on this under Titans below. |

## Job Crystals: the rest of 3rd grade

Each party member has one crystal slot, which adds a second command, like a Final Fantasy Tactics secondary skill set. Crystals unlock as school reaches each topic (you can unlock them early). That's how the game covers *all* of 3rd grade without twenty party members.

| Crystal | Utah 3rd-grade topic | How it plays |
|---|---|---|
| ⏳ **Time Mage** | Time to the minute; elapsed time | Haste and Slow show their duration on a clock face: "Haste lasts from 3:45 to 4:10. How many minutes?" |
| ⚗️ **Alchemist** | Fractions; liquid volume and mass | Fill a potion to 3/4. Which potion is stronger, 2/3 or 2/4 full? Forge with grams and kilograms, brew with liters. |
| 🐉 **Dragoon** | Number lines: rounding, fractions on a line | **Jump** lands on a point of a number line, like rounding 462 to the nearest hundred or landing on 5/8. |
| 🌋 **Geomancer** | Area, perimeter, shapes | Quake hits a rectangle of tiles (area). Raise stone walls around camp (perimeter). Seal a portal with "4 equal sides, no square corners." |
| 🏹 **Ranger** | Picture graphs, bar graphs, line plots | Scouting reports drawn as graphs: "How many more drones than raptors?" |
| 🔬 **Scholar** | Science (weather and climate, traits and survival, forces and magnets) | **Scan** reveals a monster's weakness when he answers a science question about it. Weather magic. Magnet and push-block puzzles. |
| ✨ **Cleric** | Grammar and conventions | Status ailments are broken sentences. *Silenced?* Fix the missing punctuation to cure it. *Confused?* Fix the verb tense. |
| 📜 **Sage** | Reading comprehension: fables, myths, informational text | Read a Legend Titan's myth and answer to bind it (a world serpent, a thunderbird, a kraken). Ancient tablets hold passages that lead to treasure. |
| 🗺️ **Envoy** | Social studies: communities, maps, economics, civics | Town quests, reading the world map, trading posts, and the town council. |

The exact standards behind each crystal are mapped in [`curriculum.md`](curriculum.md).

## Battles

**Turn-based with a visible turn order** (like Final Fantasy X). No clock ever runs while he's thinking.

**Commands:** each hero has their class command (tiered), their crystal command, Item and Guard.

**Tiers** use his original idea.

| Tier | What it is | Payoff |
|---|---|---|
| ★ Quick | Something he's mastered, often with a picture (array, number line) | Small hit, fast, builds the Limit gauge |
| ★★ Power | His current edge | About 3× the damage |
| ★★★ Ultimate | A stretch: bigger numbers, no picture, from memory | About 8× the damage, plus a bonus (stun, shield break) |

- **The stars follow his skill, not a fixed list.** The game tracks each skill and moves all three tiers up as he improves, so ★ never gets boring and ★★★ is never impossible.
- **Bravery counts.** A missed ★★★ still earns *Brave* points toward his Limit Break.
- **Limit Break** is the "harder and harder" combo. When the gauge fills, he chains quick problems and every right answer is another slash. He keeps going as long as he dares. A miss ends the combo, but he keeps the damage.
- **When he misses,** the enemy dodges and the tutor offers "Want to see how?" He gets a quick visual walkthrough, then a retry for half damage.
- **Losing** sends the party back to the last camp with XP and items kept.
- **Enemies make him think:** weaknesses (Scan finds them), shields only ★★+ can break, groups that call for Split Shot, and bosses with a second phase.
- **Juice:** hit-stop, screen shake, particles, big damage numbers, critical-hit flashes, sound effects, and an original victory fanfare. Getting it right should *feel* great.

## Titans: his creatures, his writing

This is the feature to build around. He already loves the Creature Lab, and kaiju are his thing.

- **His Creature Lab creatures can be his Titans.** The RPG can live on the same site as Story Quest (`andylewisart.github.io`), so when both games run in the same browser, the RPG can read his creatures (art, stats, abilities) and bring them in. Nothing in Story Quest changes.
- **The Titan Forge** inside the RPG works like the Creature Lab (detail stars → rarity → painting) for new Titans.
- **Summoning is a writing moment.** Once per battle, when the Titan gauge is full, he writes the Titan's entrance:
  - ★ fill in a sentence frame: "___ burst out of the sea, its ___ glowing ___."
  - ★★ one sentence of his own.
  - ★★★ two or three sentences.

  Story Quest's picture test and spells (sound words, similes, power-words…) decide the power, from 🕯️ Tiny to ⚡ Spark to 🔥 Blaze to 🌋 MEGA. Then his Titan's painting slams onto the screen, the screen shakes, and **his own sentence is read out in a movie-trailer voice** while the damage lands.
- **Titans level up** through use and by revising their description (evolving), just like the Creature Lab.

## Outside battles

- **Explore:** a Final Fantasy–style world map, towns, and dungeons with puzzles (number patterns, magnets and forces, shapes).
- **Towns:** shops (prices and change are addition and subtraction), inns, and people to talk to (reading). Quests use opinion writing ("Convince the council to lend you the airship. Give two reasons.") and informative writing ("Write the bestiary entry for the monster you just beat.").
- **Story choices with tiers:** the defeated troll is crying. ★ finish "The troll was sad because ___", ★★ write what your hero says to him, ★★★ write the troll's side of the story, and the troll joins you.
- **Camp** ends every session. The heroes rest, he writes a few lines in the journal, and the next chapter's hook is teased. In May, print the journal as a real book.
- **Collections:** the Titan roster, the Spellbook (every word he masters), the Bestiary (each monster with a real science fact), and gear.

## The tutor

A "full tutor experience" works best in layers, starting with the fastest and cheapest. Most help never needs AI.

1. **Built-in hints (no AI).** Visual models drawn by the game: arrays, number lines, base-ten blocks, fraction bars, clock faces. Plus worked examples, and **mistake-specific mini-lessons.** For example, 52 − 27 = 35 means he took 2 from 7 instead of regrouping, so he gets the regrouping lesson, not a generic one. The common 3rd-grade misconceptions are cataloged per standard in [`curriculum.md`](curriculum.md).
2. **The Training Hall (no AI).** When a new skill or crystal unlocks, there's a short lesson first: *I do* (the tutor shows), *we do* (step by step together), *you do* (on his own). Then the ability unlocks.
3. **Ask the tutor (AI).** A button on any problem. The tutor sees the problem, his answer, the mistake pattern and his history with that skill. It asks one guiding question at a time instead of handing over the answer, and it can **drive the game's visuals**, for example opening a number line or building an array, so explanations are shown, not just told.
4. **Talk it out (AI voice).** Like Story Quest's voice coach. In math, he explains his thinking out loud, which is one of the best ways to learn it. In writing, he talks through ideas before typing.

**Guardrails** (taken from Story Quest's rules):

- Kid-safe, never asks for personal information, and points him to a trusted grown-up if something sounds wrong in real life.
- Never mentions spelling during creative writing. Words he misspells there quietly become future spell scrolls.
- Daily limits, an API spending limit, and every tutor conversation readable in the grown-ups corner.

**Without AI** (no key, or offline), the game is still complete. Layers 1–2 are built in, the same idea as Story Quest's "practice magic."

**Which AI** is still open. The simplest path reuses Story Quest's OpenAI setup: the same key, already saved on the same site, plus the image model for Titans and the realtime voice. The tutor's text side could run on Claude instead, with its own API key.

## Measuring progress

The full mapping is in [`curriculum.md`](curriculum.md).

- **Every problem is tagged** with the Utah standard it practices.
- **Mastery is tracked per skill** from accuracy, how recently he practiced, and (for facts) answer speed. Speed is measured quietly and never shown as a timer.
- **The grown-ups corner** shows:
  - a Utah standards checklist (*not started → practicing → on track → mastered*)
  - his specific mistake patterns
  - words missed and words mastered
  - his writing
  - time played
  - a **Copy report for Claude** button, like Story Quest's, for tuning the game around how he actually plays
- **Boss fights double as unit checks.** In spring, the game adds practice in the *formats* of Utah's year-end RISE test (drag-and-drop, multi-select, typed answers), so the real test feels familiar.

## Rhythm

| Scale | What happens |
|---|---|
| **Session** (15–20 min) | Town → 3–5 battles → a story or writing moment → camp journal → cliffhanger |
| **Week** | Monday: new spell scrolls from his school list. Thursday: the Spell Boss (right before a Friday test). Weekend: a story event. |
| **Year** | About one chapter a month, following his class. The airship around winter break. Practice for the RISE test format in spring. The finale and a printed journal in May. |

## Tech plan

- **A static web app** in plain JavaScript modules, bundled with esbuild and tested with `node --test`. That's the same stack as Story Quest. A GitHub Actions workflow publishes it to **GitHub Pages at `andylewisart.github.io/KidsLearningRPG/`**, the same site as Story Quest. That's what makes creature import and key sharing possible.
- **Saves go in IndexedDB, not localStorage.** Both games share the site's roughly 5 MB of localStorage, and Story Quest drops old paintings when it fills up. The RPG must not crowd it.
- **Backups:** Safari can clear a site's data if it isn't opened for about a week, and an iPad home-screen app gets its own separate storage. So the grown-ups corner gets a **Back up progress** button, plus cloud save later if needed.
- **Rendering:** painted sprites in HTML/CSS with the Web Animations API (lunges, recoils, flashes, shakes), and a canvas layer for particles. That runs smoothly on an iPad or Chromebook.
- **Input:** a big in-game number pad and letter keyboard, so there's no autocorrect quietly fixing his spelling and no on-screen keyboard covering the battle.
- **Art:** ChatGPT batches ([`art/README.md`](../art/README.md)). **Audio:** original music and sound effects.
- **Content:** math problems are generated (unlimited and tagged to standards). Spelling, grammar, reading and science items are written ahead of time and reviewed before he sees them.

## Roadmap

| Phase | What ships | When |
|---|---|---|
| **0. Design** | This doc, the curriculum map, the style audition | Now |
| **1. First playable battle** | Four heroes, the Crystal Canyon, four enemies plus the Geode Titan boss. Tiered attacks for subtraction, multiplication and spelling. A Titan summon with writing. Built-in hints and saves. He plays it for a few days, then we tune. | Right after art batch 01 |
| **2. Chapter 1** | World map, a town, a dungeon, the story, leveling, gear, the weekly spelling list, grown-ups corner v1, and mastery tracking | November |
| **3. The tutor** | AI tutor and voice, Training Hall lessons, mistake detection | Late fall |
| **4+. Chapters** | About one chapter and crystal a month, following his class. RISE-format practice in spring. The finale in May. | December–May |

## Open questions

- Which art style did he pick? (batch 00)
- His hero: class, name, look, battle cry (Hero Forge)
- Tutor AI: reuse Story Quest's OpenAI setup, or run the tutor on Claude?
- Which device(s): iPad, Chromebook, laptop?
- Does his school send a weekly spelling list?
- Should Sparky make an appearance (as the tutor, or as a Titan)?
