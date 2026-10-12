# Story bible

The reference for Crystal Titans' story: the premise, the cast, the chapter outlines and the continuity. Read it before writing a line, and update it whenever a story change ships.

The shipped game is the truth for what plays today (`src/world/story.js`, `src/content/barks.js`, `src/ui/explore.js`). The parent approved the chapter 1 proposal (`docs/story/chapter1-proposal.md`) in full on 12 October, and the script follows it. Anything marked **(pending)** still waits on art or a film; **(idea)** marks a thought nobody has approved yet. The setting's history is in `docs/world.md`.

**A line isn't finished until it has its delivery tag.** Every recorded line is performed with an expression tag at its start, like `[warmly]`, `[dryly]` or `[determined]`. Without one, a line falls flat.
- **Where tags live:** `tools/audio/direction.json`, keyed by speaker and the line's exact text. They're never shown on screen.
- **How many:** usually one, at most two, chosen from the scene and the character's mood, and never fighting the words.
- **Tags to avoid:** on the Eleven v4 voices, `[softly]`, `[gravely]` and `[seriously]` turn into a whisper that leveling then makes loud. Tender lines get `[gently]`, `[wistfully]`, `[sadly]` or `[fondly]`; warnings get `[urgently]`.
- **Ellipses:** an ellipsis hushes the words after it, so use one only where you want a hush.
- **Changing a line:** the new text gets its tag, and the old entry comes out (a test fails on tags for lines that no longer exist).

## The feel

- **Wit.** Characters are funny because of who they are: confident timing, absurd logic played straight, villains who are ridiculous and still a real threat. A joke is never explained.
- **Heart.** Sincere stakes: memory, home, loss, friendship, music. Quiet moments are earned and given room.
- **The bar is Maren's song.** It's a private grief and hope, carried by music, discovered rather than explained. Every chapter needs moments at that level, and the humor around them should make them land harder.
- **Kid-safe and never babyish.** Jokes land on Kit, the fiends or the villains, never on the player. No franchise names. The repo is public: the cast is fictional, and no real person's details go anywhere.

## The premise: the Forgetting (approved 12 October)

- **The isles.** The Sundered Isles are a hundred islands in the Glimmering Sea, once one land until the Leviathan broke it. Each island has a Lore Crystal.
- **An island remembers what its crystal knows.** As a crystal dims, its island forgets, newest things first: how to count change, read a tide chart and spell its own street names; later its recipes, its stories and the words to its songs. People can tell something's missing, but not what. Nobody forgets the people they love; they lose the words for things.
- **Nothing forgotten is gone.** It waits in the dark, and a lit crystal brings it back. What you know by heart, the dark takes last of all.
- **A new crystal learns from whoever carries it.** Every true thing worked out near it (a subtraction, a word spelled right, a sentence that paints a picture) is light it keeps. Guesses light nothing, and neither does someone else shouting out the answer (Wren, on the deck). The brighter it shines, the more its island remembers. This is why math, spelling and writing matter in the world.
- **The Order.** The Order of Crystal Knights carries new crystals, and tutor droids keep them learning on the way. Kit was teaching this one its times tables, through Cade, when Jumble struck.
- **Fiends** are what the dark makes of forgotten things. When one bursts into glowing motes, that's what it swallowed, going home.
- **Captain Jumble** wants the isles to forget: in a world that forgets, nobody remembers who failed the Sage exams. He speeds it along by scrambling signs and wrecking crystals.
- **The Iron Dominion** drains crystals to control the Leviathan, and a drained island forgets fast. Its drones sniff out crystal shards.
- **Unchanged from `docs/world.md`:** the Sages, the Sundering, the Titans and Titan Callers, and the Leviathan.
- **Retired:** letters falling off signs and numbers wandering off price tags. The signs Jumble scrambles are his own mischief.

## The cast

The grown-ups corner can rename the cast, but recorded lines use these names.

### Cade, the Crystal Knight

- **Who:** the newest knight of the Order, on his first mission: carrying the new crystal to Driftwood Isle. Silver hair, crimson scarf, shark-fin pauldron, tower shield, and no helmet. The player walks as him.
- **Wants:** to be a true knight: bring the crystal home and keep everyone safe, by the Code.
- **Fears:** failing the people counting on him. He nearly failed his knight's test (he forgot rule twelve) and came back the next day to say all four hundred rules. He tells Kit at the lair's mouth.
- **Voice:** deep, warm, formal and earnest. He narrates his own legend, quotes the Crystal Code, tells terrible jokes and laughs hardest at everyone else's. Now and then he says something sincere that lands better than he expects. His new voice is on Eleven v4.
- **Tags that suit him:** `[earnestly]`, `[determined]`, `[solemnly]`, `[delighted]`, `[warmly]`, `[proudly]`, `[sheepishly]`.

### Captain Wren, the Sky-Pirate Gunner

- **Who:** captain of the airship *Brass Albatross*, hired to fly the crystal. Copper-red braid, goggles, brass arm, twin blasters.
- **Wants:** her ship flying again, and, secretly, a crew that sticks.
- **Fears:** being grounded, and being the one who lost the family ship. The Albatross was her grandma's, then her mom's, and Wren is the first one who ever crashed her. She tells Cade at the wreck.
- **Voice:** bright, quick and cocky. She nicknames everyone (Shiny Boots, Hat-Bot, Clanky McGee, Forgettable Fred), brags about her aim, cheers loudest, and covers feelings with bravado.
- **Tags that suit her:** `[cocky]`, `[teasingly]`, `[eagerly]`, `[playfully]`, `[fiercely]`, and, rarely, `[wistfully]` or `[fondly]`.

### Kit

- **Who:** the Order's tutor droid, a floating sphere with a crystal heart and a tiny tricorn hat (won in a card game, and, Kit insists, intimidating). It taught Cade through his knight training and was teaching the new crystal when Jumble struck. Now it coaches him through every problem.
- **Wants:** to teach well, to keep Cade safe, and to be taken seriously (the hat).
- **Fears:** being unnecessary ("Right again. I'm starting to feel unnecessary."). A good tutor works itself out of a job, and Kit knows it: "Unofficially, you hardly needed me. I'm choosing to be proud of that." That's its arc through the year.
- **Voice:** calm, dry, deadpan, all understatement. Warmth leaks out at the ends of lines and is denied at once.
- **Tags that suit it:** `[dryly]`, `[deadpan]`, `[matter-of-factly]`, `[suspiciously]`, `[helpfully]`, and, rarely, `[warmly]`.

### Knox, the Spellwright

- **Who:** three hundred years old, the last Spellwright of the Sage school. Tiny and hooded, with glowing gold eyes and a floating spellbook. The K in Knox is silent, and it's his favorite letter. Jumble caged him in the Hall of Glyphs.
- **Wants:** the old words kept alive, and Jumble's overdue library book back (*Rocks That Talk*, volume ten). Underneath, to make peace with Jumble, who was his study partner. He still saves Jumble's seat in the library. He tells Cade at the mural.
- **Fears:** being the last one who remembers, and that he could have helped his friend more.
- **Voice:** whispery, creaky, grand and polite, until a word gets interesting ("Ooh! A silent E!").
- **Tags that suit him:** `[grandly]`, `[delighted]`, `[wryly]`, `[fondly]`, `[kindly]`, `[wistfully]`, and `[urgently]` for warnings.

### Maren, the Titan Caller

- **Who:** keeper of the sea shrines. Shell-braided hair, sea-foam white and coral, a storm-crystal staff. The crystals send her dreams, and they showed her the party. She sings to the tide in the Tide Grotto.
- **Wants:** to keep her island's song alive until she can bring it home. She tells Kit at the sea.
- **Fears:** that the song ends with her.
- **Voice:** warm, calm and poetic, a big sister. She's grand when she summons ("Rise!") and has a small dry humor ("I am mostly patient.").
- **Tags that suit her:** `[warmly]`, `[calmly]`, `[gently]`, `[fondly]`, `[wistfully]`, `[in awe]`, and `[grandly]` for summons.
- **Her song** (`music_maren_song`) is the chapter's heart. From its first notes to her hello, nobody jokes.

### Captain Jumble

- **Who:** a ghost-pirate sorcerer who sails the ghost galleon *Misspelled*. Sea-green, with a plumed purple tricorn and a red coat. Three hundred years ago he failed the Sage exams by one silent letter (the word was KNIGHT, and he wrote NIGHT), and he has been scrambling the isles ever since.
- **Wants:** to be thought brilliant; failing that, a world that forgets, so nobody remembers who failed.
- **Fears:** being corrected, being laughed at, and silent letters.
- **Voice:** loud, vain and theatrical. He loves anagrams, says silent letters out loud on purpose ("kuh-NIGHT"), and is terrible at sums too ("Ninety-nine? Hold on."). At the end of chapter 1 he lets slip why he wants the isles to forget: "Not even who failed the Sage exams!"
- **Tags that suit him:** `[theatrically]`, `[mockingly]`, `[gloating]`, `[sarcastic]`, `[shouting]`, `[delighted]`.
- **The rule for him:** funny and a real threat. He wrecks things that matter; the joke is how he explains it.

### Pockets, the three-eyed monkey

- **Who:** a three-eyed monkey in a tricorn just like Kit's (ship's-wheel badge, white feather), with a red neckerchief and a gold earring. He steals anything shiny, loves anything squeaky, and turns up in every scene (finding him is a collectible). Wren named him. He rode the Albatross as a stowaway ("He stowed away on my ship."): he's at its rail in `story_albatross`, on its deck in `story_galleon`, and in its rigging in `story_deck` **(pending)**.
- **Wants:** shiny things, squeaky things, and Kit's hat, to make a matching set.
- **Fears:** nothing he'll admit to. He respects rubber fish.
- **Voice:** no words: chitters, squeaks and raspberries.

### Tidebreaker

- **Who:** the first Titan, a colossal sea creature with glowing crystal reefs on its back. It answers Maren's shrine when he writes one true sentence about the sea. He can rename it.
- **Wants:** to be called with true words.
- **Fears:** being forgotten. A Titan nobody calls sinks back into the deep **(idea)**.
- **Voice:** no words, just the roar of surf. When it's summoned, his own sentence is read out in the movie-trailer voice.

## Chapter 1: Driftwood Isle (approved 12 October)

1. **The opening (night into dawn).** The conversation for each part is in brackets (`CONVOS` in `src/world/story.js`).
   - The cold open: a little airship carries a new crystal to an island that's forgetting (`prologue`).
   - On deck (`prologueDeck`): Kit quizzes the crystal ("Seven times eight."), Wren shouts out the answer, and Kit was asking the crystal. Then Kit gives Cade one: he answers it himself in the puzzle window, at his own level, and the crystal glows. Cade says it once: the more it learns, the brighter it shines, and the more Driftwood will remember. It did not glow for rule twelve. "Nothing catches the Albatross." A green cloud.
   - Captain Jumble (`prologueJumble`) bursts out of the cloud, wants Driftwood left forgetting, says "kuh-NIGHT", gets corrected by Kit, and rams them.
   - The ram, over its film (`prologueRam`): "The crystal!", Jumble flies off ("Good luck teaching it in pieces!"), and Wren catches a rope to ride her ship down.
   - The shards come down at dawn (`prologueShards`), and the knight comes down somewhere softer.
   - Sunrise at the cove (`wake`): Kit, its hover dented, lands on Cade. Driftwood keeps forgetting until the crystal's whole.
2. **Shipwreck Cove (sunrise).**
   - Jumble's scrambled signpost (TEMPLE, CANYON), the squeaky fish in the tide pool, and Jumble's bottle, with his door code on the back.
   - The chest with the number dial holds the first shard (subtraction). It fell in through a crack in the lid.
   - Pockets sits on the signpost, and the Sage gate is sealed.
3. **Temple Ruins (morning).** The round door opens with Jumble's code (addition): he just wanted someone to see how clever it was. The joke frog. Pockets again, in his matching hat.
4. **Hall of Glyphs (day).**
   - Knox is caged in scrambled words. Jumble went to school? Until he failed the final exam, by one silent letter ("That explains 'kuh-night'."). Three spelled bars free him, and the second shard.
   - Knox joins. **Knox's empty seat:** the first time he looks at the mural after Knox joins (`muralSeat`), Knox tells of the friend who should be up there, whose seat he still saves. Later looks get its first line.
5. **Back to the cove.** Knox reads the Sage gate open (the password is PLEASE).
6. **Crystal Canyon (late afternoon).**
   - The wrecked Albatross, Wren and Pockets the stowaway ("I thought nothing catches the Albatross." "Okay. One ghost ship. And one monkey."). Trade the squeaky fish for her power cell, then calibrate her blaster (multiplication and division) for the third shard.
   - Wren joins and gives the pulley off her ship ("She'd want to help").
   - Dominion drones attack (Bullet Storm), and then the singing rises from below, sung "all day".
7. **The rope down (sunset).** The zip line to the Tide Grotto, with the song growing.
8. **Tide Grotto.**
   - Maren sings, then stops and says hello. One true sentence about the sea wakes the shrine and Tidebreaker, and Maren joins.
   - The lair rumbles. **Maren's island:** the first time he looks at the sea after she joins (`seaStory`), she tells Kit of her island and why she sings. Later looks get the line about Jumble's galleon.
9. **Back in the canyon (sunset).**
   - **Wren's ship:** the first time he looks at the wreck after Maren joins (`airshipStory`), it was her grandma's ship, then her mom's. "Then you'll be the first one who ever fixed her." Before Maren joins, the wreck only gets "Don't look at her. She's embarrassed.", so the song's stretch stays quiet.
   - **Rule twelve:** the first time they go into the lair (`lairGo`), Cade tells Kit he forgot rule twelve on his knight's test and came back the next day. Every later try is one line (`lairAgain`): "We came back. That's what knights do." Then the Geode Titan and the fourth shard.
10. **The ending.**
    - The crystal remade: its light carries every true thing it learned, and the island begins to remember.
    - The thanks: Kit says "you hardly needed me", and Cade adds rule 401: never do it alone.
    - "Chapter 1 complete!", with his own words read back over Maren's song.
    - The harbor at sunset: the lighthouse is fading, Pockets takes Kit's hat ("But he already has a hat!" "Now he has a matching set."), and the harbor is too quiet, because it's forgetting. "Then we'll remind them."
    - Jumble at night lets slip why he wants it ("Not even who failed the Sage exams!"). Maren: "Then so are we." To be continued.

The three stories he finds by looking glint from the moment they can be told until they have been: the mural once Knox has joined, the wreck and the sea once Maren has (`SPARKLE` in `story.js`). Each is told in full once (flags `muralStory`, `wrenStory`, `marenStory`; the lair's is `lairTried`), and later looks get one line (Knox's hair day, Wren's "She's embarrassed", Kit's galleon and fish).

## Continuity

### Time of day

Chapter 1 is one day, from the crash before dawn to Jumble's next move that night. Lines shouldn't name a time of day that disagrees with the picture behind them.

| Scene | Picture | Time of day |
|---|---|---|
| Title | `title_art` | golden evening (key art, outside the story) |
| Opening: the cold open | `story_albatross` | night, just before dawn |
| Opening: on deck | `story_deck` **(pending)** | night |
| Opening: Jumble | `story_galleon_night` **(pending)** | night |
| Opening: the ram and the fall | `story_ram.mp4` **(pending: a new film)** | night, paling |
| Opening: the shards come down | `story_crash` | dawn |
| Shipwreck Cove | `scene_cove` | sunrise |
| Temple Ruins | `scene_temple` | morning |
| Hall of Glyphs | `scene_temple_hall` | day |
| Crystal Canyon | `scene_canyon` | late afternoon into sunset |
| The rope down | `story_descent` | sunset |
| Tide Grotto | `scene_grotto` | painted at midday, though he reaches it after the canyon's sunset; lines here don't name the time |
| The crystal remade | `story_crystal_remade` | late light inside the lair |
| The harbor | `story_ending` | sunset |
| Jumble's next move | `story_jumble_next` | night |

The script follows this table. The two new paintings and the new ram film are on their way (`art/video-refs/intro-clips.md`); until they land, the opening shows what exists. Wren's singing line now says "all day".

### Who has met whom

- **Before the story:**
  - Kit has tutored Cade since his knight training, and was there when he forgot rule twelve.
  - Wren met Cade and Kit when the Order hired her to fly the crystal, a few days before: long enough for nicknames.
  - Pockets stowed away on the Albatross, and Wren named him.
  - Knox and Jumble were study partners at the Sage school, three hundred years ago.
  - Maren has dreamed of the party ("a knight, a scholar, a sky-captain, and a little droid in a pirate hat") but never met them.
  - Everyone knows Jumble by reputation.
- **The opening:** Cade, Wren and Kit meet Jumble face to face. Pockets is aboard, unseen.
- **The cove:** Cade and Kit see Pockets, but don't know his name yet.
- **The Hall of Glyphs:** Cade and Kit meet Knox.
- **The canyon:** Cade, Kit and Knox find Wren, and she tells them Pockets' name. Knox and Wren meet here.
- **The grotto:** everyone meets Maren, and Tidebreaker answers for the first time.
- **The lair:** the Geode Titan, woken by the crash.
- **The ending:** Jumble is seen from afar. He hasn't seen Knox in three hundred years and doesn't know Maren. Save Knox and Jumble's meeting for a big moment.

### Running gags and their payoffs

- **Rule twelve:** the deck (it doesn't glow for the vegetables), the lair (Cade's test), and the thanks (rule 401).
- **"Nothing catches the Albatross":** the deck, then the canyon ("Okay. One ghost ship. And one monkey.").
- **The silent K:**
  - Jumble's "kuh-NIGHT" and Kit's "The K is silent." (the prologue);
  - Knox's "The K is silent. It's my favorite letter.";
  - Cade's "A knight never leaves anyone in a cage." and Kit's "That explains 'kuh-night'." (the Hall of Glyphs);
  - the battle banter's "Ooh, the silent K!".
- **The hats:** Pockets wears one like Kit's in every picture. Kit is suspicious at the temple, Pockets takes Kit's at the harbor ("Now he has a matching set."), and Kit puts on a spare. Chapter 2 is the hunt.
- **"Ours is worse":** the cove's old wreck, and the Albatross in the canyon.
- **The joke frog:** four bad jokes, Cade's joke book, and Kit's list of enemies.
- **Said once only:** "Villains are confusing" (the bottle) and the judgmental crabs (the cove). In the grotto, after Maren joins, one crab is humming her song, badly.
- **"Everyone loves Bullet Storm."**
- **"The sea remembers":** the shrine, the sea and the ending's thanks.
- **Jumble's sums:** "Ninety-nine? Hold on."
- **Manners:** the Sage gate's password is PLEASE ("Manners. The oldest magic there is.").

### The Crystal Code: rules said out loud

The Code has four hundred rules. Keep the numbers straight.

- **1:** protect the crystals. (Not said out loud in chapter 1 any more: rule twelve and rule 401 carry the lair and the thanks.)
- **6:** one island at a time.
- **11:** never leave a crystal behind.
- **12:** always finish your vegetables.
- **30:** whisper in libraries.
- **40:** never say no to a biscuit.
- **401:** never do it alone. Cade adds it himself at the end of chapter 1.
- **Unnumbered:** stealing is wrong; a potion is permitted "at a time like this"; report for duty exactly on time.

### Small facts to keep straight

- **Cade** has no helmet.
- **Kit** hovers. The ram knocked its hover out for a moment, so it fell; it's dented, not broken ("My hover's dented. My hat is perfect.").
- **Wren** rode the Albatross down into the canyon, hanging from a rope.
- **The four shards:** the cove's chest (it fell in through a crack in the lid; a subtraction lock), Knox's (it fell through the temple roof "last night"), Wren's (it bonked her on the head), and the Geode Titan's lair.
- **Jumble's note** is a gloating letter signed "Love", with his door code on the back as a sum: "Nobody adds anymore! Ha!"
- **Jumble borrowed** *Rocks That Talk*, volume ten, three hundred years ago. It's still overdue.
- **Driftwood's old crystal** is in the harbor's lighthouse, and the new one belongs there (chapter 2).
- **Maren's island** is unnamed so far. Its crystal went dark when she was little, and its people forgot their song.

## Seeds for later chapters

- **Driftwood Harbor (chapter 2):** a town that's forgetting its songs and its sums. Honest Hal blames the dimming for his wrong totals, which only ever go wrong in his favor. The old lighthouse keeper still climbs to the lamp every night without remembering why. Maren's song is the thread, and may turn out to be the harbor's own.
- **The Albatross:** rebuilt as the airship the party gets around winter break.
- **Knox and Jumble:** they meet again, and Knox has saved him a seat. It leads to the final Wit Duel.
- **Maren's island:** relit, and its song comes home. A season-long arc.
- **Kit:** by May, the student hardly needs the tutor.
- **What if Jumble carries a crystal?** It learns from whoever carries it, so an island could end up remembering everything misspelled.
- **Pockets** may be a Driftwood monkey going home (the Monkey Head).

## Writing a line: a checklist

1. **Who wants what, right now?** The line comes from that.
2. **Could anyone else say it?** Then make it theirs, or cut it.
3. **Don't explain the joke.** The other character's reaction is the punchline.
4. **React to the screen; don't describe it.**
5. **Talk about the learning in the world's terms:** true answers, light, the crystal. Never "the correct answer" or "math".
6. **One idea, about fifteen words at most.** It's voiced, and he reads along.
7. **Check this bible:** the time of day, who has met whom, the Code's numbers, the running gags.
8. **Write the delivery tag.** A line isn't finished without it.
