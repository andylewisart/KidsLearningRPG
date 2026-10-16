# Handoff: work in progress

For whichever Claude session picks this up next. Read `CLAUDE.md` first.

## Start here (12 October)

**Where it is.** Chapter 1 is finished, live and loved: the kids played it through to the end.

**What changed on 12 October** (each is detailed in "The parent's fifth notes" and "The chapter 1 rewrite" below):
- **The story was rewritten:** the Forgetting premise, a new opening, four moments with heart and a banter pass.
- **Every character's voice** moved to ElevenLabs' Eleven v4, with an expression tag on every line.
- **The opening** got stand-in paintings and films.
- **Fights save as they go.**

**Grade levels per child (13 October, on `claude/per-child-grade-levels-cy5vlr`, not merged):** a learning profile per child with a grade per subject, co-op that swaps children every hero turn, and grade 1 and 2 rungs on every ladder. See "Younger players" in `docs/curriculum.md`. The 64 new spelling words are recorded.

**Waiting on the parent:**
1. **Codex art wave 07** (`art/waves/wave-07-opening.md`): repaints of `story_deck` and `story_galleon_night`, which are Kling-made stand-ins for now, and a new `story_fall`. When it lands:
   - set `CRYSTAL_AT.story_deck` in `src/ui/explore.js` from its review notes;
   - play the opening from a fresh save (`?explore&debug&calm`);
   - push.
2. **Films are the parent's to make.**
   - Their Kling credits recharge on 20 October (27 are left until then).
   - They also found Runway credits. The last session had no Runway connector, and they hadn't said whether Runway is for them or for an agent: ask before making anything with it.
   - Wire in what they hand over: the charge's `film` and `to`, and the ram's `src`, `impact` and `at`, in `OPENING` (`src/ui/explore.js`).
   - The current Kling films stay until then; that was the parent's choice.
3. **Listening the parent hasn't done yet:**
   - **Jumble's eight re-recorded lines.** Stability 0.15 and similarity 0.35 were a guess at their "low and low".
   - **"kuh-NIGHT"** in Jumble's "A kuh-NIGHT? Ha!" and Kit's "That explains 'kuh-night'." It couldn't be checked without hearing it.
   - **Cade's "There, past the shrine. That's who's been singing."** (`knight_aae6b5ad`, `[softly]`) came out a whisper. Re-tag it if they want it louder.

**Rules that bite:**
- **Every push to this branch redeploys the game the kids play** (`.github/workflows/pages.yml`, which runs the tests first). Push only finished states: a script with its recordings, staging with its lines.
- **Stills come only from Codex, films only from the parent** (CLAUDE.md, "Pictures and films").
- **Every recorded line needs its expression tag** in `tools/audio/direction.json`; a test fails otherwise.
  - A line can also be a performance, with tags inside it, like Jumble's.
  - `[gravely]`, `[seriously]`, `[softly]` and ellipses tend to whisper. Warnings get `[urgently]`.
- **ElevenLabs costs the parent money.** Dry-run first and report characters and credits.
  - Eleven v4's launch price is over: it costs 1 credit a character (measured 14 October), and Kit's and Knox's library voices about 1.9.
  - The key is speech-only: it can't list voices or transcribe.
- **Use the agents** in `.claude/agents/`:
  - `screenwriter` for story, dialogue and staging. It proposes first, and the parent approves.
  - `voice` for recording. It dry-runs first and doesn't commit.
- **The repo is public.** No personal details.

**Good next work** (ask the parent which):
- **Chapter 2, Driftwood Harbor,** is built on its own branch (see "Chapter 2" below). It's recorded and scored (Kit's last 77 lines and a new Lantern Song take came on 15 October), and waits on the parent's playtest.
- **A true-peak limiter in `tools/audio/level_voices.mjs`.** v4 takes overshoot after MP3 encoding, and 10 were fixed by hand.
- **The proposal's optional late-afternoon Tide Grotto.** It's reached after the canyon's sunset but painted at midday. It needs a Codex wave.

## Chapter 2: Driftwood Harbor (14 October, on `claude/project-thread-ftrlee`, not merged)

Built from the approved proposal and script (`docs/story/chapter2-proposal.md`, `docs/story/chapter2-script.md`). A save with chapter 1 finished picks up in the harbor. Pushing this branch doesn't touch the kids' game; merging it does.

**What's built:**
- **A, the adventure:**
  - eleven painted places with their hotspots, rest crystals and fights (`src/world/data2.js`);
  - every line of the script (`lines2.js`), each tagged in `direction.json`;
  - the beats as scripts with story cards (`chapter2.js`);
  - telling-time and mass-and-volume puzzles at each child's grade (`src/learn/puzzles2.js`, 3.MD.1 and 3.MD.2);
  - Tamsin as the fifth hero, with the pets (`src/world/pets.js`);
  - Kit's nudges when he's stuck, and "Where next?" in the pause menu.
- **B, the battles:**
  - the harbor's seven fiends: fast ones act twice and dodge everyone but Tamsin until she Slows them;
  - her Feed (a meal in grams, a tonic in milliliters) and Stampede;
  - pets that act after right answers and grow at her nests;
  - the Drain Engine, with the keeper's lens scene inside the fight and Beaconwing to finish it.
- **C, the Crystal Grid and the forge:**
  - **The Grid** (rules in `src/world/grid.js`, the screen in `src/ui/grid.js`). Each hero has a road of nodes: health, strength, speed, a longer Overdrive, stronger Titans or pets, pet slots, and Tamsin's Calm Seas (fewer ambushes where nothing new is left to find). Glimmer lights nodes, which cost 40 to 410. What's saved up before the Grid is found is capped at 200, a node a hero.
  - **Glimmer:** a right answer (first try, no hint) leaves 2 at ★, 12 at ★★ and 20 at ★★★, and a capture 25. It's one function, `glimmerFor()` in `grid.js`, for every fight: both chapters' and the quick battles'. In chapter 1 only the glimmer score changes.
  - **Where it opens:** on the lamp room's ceiling the first time; after that from the ceiling, the pause menu, or the glimmer counter at the top right.
  - **A skill gate on each road.** It opens when one of that hero's skills is truly learned by either child, at their own grade. That means on track: 10 answers, 9 of the last 10 with no hint, over 3 days. It never closes again, and its panel says in kid words which skill is nearest.
  - **The forge** (`src/world/forge.js`, `src/ui/forge.js`). The Sword Master forges each hero's weapon twice, for 6 parts and 50 glimmer, then 12 parts and 100 glimmer. Short of either, he says forgeShort. The window shows both costs and dims what's short, and the forge glints only when both are there. Its pictures load as the dock opens, and the window waits for them (a moment and a half at most), so no row opens empty.
    - **Parts:** every chapter 2 fight leaves them, 1 a fiend, 2 from a big one and 6 from a boss. Once the dock is won, Hal sells a bag of 3 for catching his sum.
    - **What a forged weapon does:** its hero's hits land 10% or 20% harder, it lights that weapon's node on the Grid, and it shows beside the hero's name and on their move in battle.
    - **The Legendary Weapons:** the window's bottom line is their seed, with the crest map from the Sage library.
  - **Saves** are world version 3 (`upgradeWorld()` in `state.js`). Older saves load, and their past glimmer becomes light, up to the cap.
  - **Balance** (`test/balance.test.js`, three harbor fights in a row, and the Engine). Each way of playing gets the Grid progress its own fights earn: 17 fights from the first visit to the Engine, with every weapon's first step forged on the way.
    - A fight leaves about 35 glimmer with ★ moves alone, 52 mixing tiers and 56 playing strong. ★ spam answers far more problems a fight, many of them an Overdrive's quick ★ ones, which is why the tiers are so far apart.
    - By the Engine, ★-only play has 10 nodes lit and mixing tiers 13, a node about every two fights.
    - ★-only play still loses 17% of the party's health a fight (18% without the Grid).
    - It wins the Engine 53% of the time, about as often as it beats chapter 1's Geode Titan (49%). With every pet along, more than ★ play can win, it's 90%, but only 16% of runs end with nobody knocked out.
    - Mixing tiers wins every time, with or without the Grid.

**How to reach it** (`npm run dev`, http://localhost:8000):
- **The story:** `?explore&debug&calm&at=` with `ch2`, `harbor`, `tamsin`, `menagerie`, `causeway`, `lamp`, `day2`, `audit`, `dusk` or `ending2`. Add `&scene=<place>` to start somewhere (CLAUDE.md lists the places).
- **The Grid's first visit:** `?explore&debug&calm&at=lamp&scene=lamp_room`, then the keeper's desk. From `day2` on, it's in the pause menu.
- **The forge:** `?explore&debug&calm&at=audit&scene=sword_dock` (18 parts and 200 glimmer, enough for three first steps), then the forge.
- **Fights:** `?battle=h1` … `h4` and `?battle=engine`. For wild ones, use `?explore&debug&at=day2&scene=harbor` (or `sword_dock`, `lighthouse`, `sea_cave`).

**Still missing:**
- **Recordings:** none. Kit's last 77 lines (his lessons, nudges, Grid, camp and wild-fight lines, the hat chase and the time hints) were recorded on 15 October for 9,925 credits, his voice's library fee included. `UNRECORDED` in `tools/audio/lines.mjs` is empty, so every fixed line in chapter 2 plays recorded.
- **Music: the keeper's hum doesn't match the new Lantern Song.**
  - The song was made again on 15 October, for 2,254 credits. A soft harp and low strings now play under Maren the whole way. "Goodnight" comes in softly after a 4-second settle, and the harp's last chord rings out to silence. The keeper's sung layer is gone.
  - That take hummed nothing in its closing section, so `music_keeper_hum` is still the 14 October hum, with the old take's tune.
  - Any new composition brings a new tune, so a matching hum would have to come out of this take: for example, her verse lifted out with ElevenLabs' audio isolation (if the key allows it) and filtered toward a hum.
  - The script's "What the recording run did (15 October)" has the details.
- **Sounds:** the new fiends borrow chapter 1's, pitched.
- **Art:**
  - Wave 09 (`art/waves/wave-09-harbor-finish.md`) is painted and in the game: Kit's tea cozy on the field, the baby moth by the menagerie's tanks, Tamsin's and the gallery's story cards, the harbor's places and trails on the map, and the two arenas' foregrounds kept clear of the fighters (the docks' painted a second time, with mooring posts, barrels and lantern beams). It waits on the parent's review (`art/review/wave-09.md`). Its Notes flag Kit's cozy sitting a few pixels off the tricorn's place, the moth's big wings and faint hurt pose, and Cade's lowered sword in Tamsin's card.
  - Wave 10 (`art/waves/wave-10-wren-dressed.md`) is painted and in the game: every picture of Wren now wears chapter 2's covered look (a teal collared shirt, dark trousers), from her sheets and the title art to four story cards, the anchors and her video references. It waits on the parent's review (`art/review/wave-10.md`). The chapter 1 ending's crystal film still shows her old outfit until the parent remakes it from the new first frame.

**Staged differently from the script:**
- **Adventure:**
  - The drone crash and the cage are sound and screen shake.
  - The fog signs are drawn plaques.
  - Tamsin's meeting at the market plays over its story card (`story_tamsin_meets`): she and the freed moth aren't on stage.
  - The market opens after the clock and the cozy, not after the recipe.
  - Hal's pet food is a purchase he can repeat.
  - The logbook's dates read "Night N".
  - The Lantern Song jumps to its chorus as Beaconwing's card opens, the card closes on her goodnight (the song's `chorus` and `goodnight` cues in the audio manifest), and the scene holds with no lines to the last chord.
  - The ending's town card is the harbor painting with its patches laid over it.
- **Battles:**
  - The Engine has four bars: three to fight through, and Beaconwing's.
  - The lens scene plays inside the fight, or after it if Maren is down.
  - The Caged Drone can't be fed or captured, and its Kit line plays in the street.
  - Before the Engine's big drain, Kit warns with a pair of its own (`engineCharging`, `engineChargingAgain` in `kitLines.js`), written after the script was approved. They're recorded (15 October).
- **Grid and forge:**
  - The view tilts up to the ceiling on Knox's "A Sage chart", and the Grid opens after the conversation.
  - The dock's "parts and gold" is parts and glimmer. When he's short of glimmer, not parts, the forge window says so and shakes the glimmer cost; the Sword Master's "Not enough parts." is only for parts.
  - Hal's blade bits are a third choice in his shop, as plain UI text.
  - Pets after Rivet each need their hero's slot on the Grid.

## Where things stand

- **Branch:** `claude/busy-einstein-52yr07`. Codex pushes art to the same branch, so `git pull --rebase` before you push. Every push redeploys the kids' game.
- **Done:**
  - **The adventure, chapter 1** (`docs/game-design.md`, "Exploring"). Driftwood Isle with the cove, the temple and its Hall of Glyphs, the canyon and the Tide Grotto, joined by the island map. Surprise fights, puzzles, rest crystals, the party joining one by one, the Geode Titan and the ending.
  - **The real setting** (`docs/world.md`). The cast has names: Cade, Captain Wren, Knox, Maren, Kit and Pockets.
  - **Battles on the living stage** (`src/ui/scene.js`): a camera that drifts and pushes in, depth parallax, and breathing sprites. Fiend attacks land visibly, and the Geode Titan warns before Crystal Quake.
  - **The Titan summon is a cinematic.** It's timed to the summon music's cues, and Enter/Space/Esc skips it.
  - **Wave 02's interface art:** command icons, the window frame, the cursor, the logo and turn-order faces (`src/ui/icons.js`).
  - **Earlier:** the pause menu, the play report (it includes adventure progress), the perspective guides, and the ElevenLabs sound pack (step 4 below).
  - **Art wave 03 is in the game** (`art/waves/wave-03-exploration.md`): the island's objects, walk cycles, Captain Jumble, the monkey's poses, icons and story cards. Codex flagged 10 drafts in `art/review/wave-03-qa.json`. Checked in the game:
    - Walk cycles: `tools/art/align_walks.py` lined up each frame's upper body sideways (it lurched up to 45 px). `tools/art/even_walks.py` then gave the knight's frames one size (he was about 13% smaller in frames 4 and 5, so he shrank and grew as he walked), drew the walk at his standing picture's size (`walk.scale`, so he no longer pops bigger when he stops) and stepped the frames by his measured stride (`walk.stride`, so his feet don't skate). His passing frames still lift the knee high, and swords and capes change shape between frames; only a repaint fixes that. The other three walks are within about 5% and haven't been evened.
    - The signpost's words are fitted to the painted boards (`SIGN_BOARDS` in `explore.js`).
    - Knox shows inside the cage: a solid copy of the cage stands behind him and a see-through one in front.
    - Story cards, Jumble's portraits, item and HUD icons look right. Use `?explore&debug&scene=temple` (or `cove`, `canyon`) to jump straight to a scene, or `&at=maren` / `&at=lair` to start partway through the chapter.
  - **The Geode Titan's lair is easy to find now.** A playtester got stuck with four heroes and three shards: the lair sat at the canyon's far edge, half off screen and behind the foreground pillar, and nothing pointed to it. It's moved in (a test keeps every hotspot where the camera can show it whole). When Maren joins, the lair rumbles and glows, and she says where it is. The foreground layer also fades while it covers the hero, so he never disappears behind a pillar.
  - **Every fixed line is recorded**, story included: the narrator, Captain Jumble (now a pirate on Eleven v4, see the fifth notes; his voice is under `voices.jumble` in `tools/audio/sounds.json`), Kit's built-in hints and all 315 spelling dictations. Live voices are left for Claude's words, school-list words and hints with numbers in them.
  - **The foreground layers are repaired** (`tools/art/fix_fg.py`). Wave 02 cut every post, pillar and canopy with one feathered rectangle, so they dissolved in mid-air. They now run off the screen's edges, and `scene.js` never lets their edges slide into view.

- **The parent's second playtest is handled** (wave 04 art aside):
  - **Overdrive is one gauge per hero.** The Titan gauge is gone: the Titan Caller's Overdrive *is* the Titan summon. Quick ★ answers fill it nearly as fast as hard ones, it carries between fights, and it sits in a full-width gold row at the top of the command menu (the menu used to spill off the screen). Each hero's first fight after joining starts with a full gauge, and Kit explains it (`overdriveLesson()` in `state.js`). The boss fight starts with Maren's Overdrive full.
  - **Kit's colossal hints say only what's true right now** (no caller, on the bench, charging, ready), once per fight, so he isn't told to summon before he can.
  - **Health carries over** on the island (`world.heroes`, `world.potions`), with a rest crystal in every place, a party bar at the top left, and Kit's nudge when the party is low. Losing a fight wakes the party at the rest crystal.
  - **Fights are harder** (`WILD_SCALE`, the boss at 1000 HP and 135 attack, smaller ★ damage). `test/balance.test.js` plays thousands of fights with the real engine to keep it that way.
  - **The chapter is longer.** The temple's round door opens with the code in Jumble's P.S. (an addition problem), and Knox is caged in the Hall of Glyphs inside. Wren gives Cade her rigging pulley, which rides the rope across the canyon's chasm down to the Tide Grotto, where Maren sings to the tide. `&at=maren` starts in the grotto.
  - **The island map** (`MAP` in `data.js`, `runMap()` in `explore.js`): walk off a place's edge to open it. Trails open with world flags, and five teaser places for later chapters answer with a line or two. It's an SVG stand-in until Codex paints `map_driftwood`.
  - **Battle staging:** knocked-out heroes lie on the ground line, and Kit floats at the top right, behind the party.
  - **Voice:** a skipped line no longer stalls the queue, lines are fetched before they're needed, and every line is leveled to -18 LUFS. All 65 new lines are recorded.
- **Art wave 04 is in the game** (`art/waves/wave-04-scenes.md`; the parent's review page is `art/review/wave-04.md`, everything still `draft`):
  - **Painted places** (A and B): each place is one painting with its objects painted in, and each change (the chest opening, the gate's light going out, Knox's cage, the shrine waking) is a patch faded in over it (`PAINTED` in `story.js`). `src/world/painted.js` turns the measured boxes into click areas, spots to stand (beside small things, in front of big ones) and things to walk around. Knox is painted in his cage until it opens (`inPainting`), and the monkeys sit on the signpost, the frog and the ledge (`paintedPerch`). `?unpainted` shows the old look.
  - **The 2.5D floor:** below the row where the nearest standing painted thing stands (`pinY`), each floor row slides at its own depth as the camera pans; everything above moves as one piece, so nothing painted leans. The camera keeps him centered at any depth, and floor rows that slide past the painting's sides are mirrored to fill the gap (`scene.js`, `FITS.painted`).
  - **Bigger people:** the paintings came out bigger than the guides, so people in painted scenes are drawn 1.6 times bigger, with a gentler depth curve (`stage-layout.json`, `explore.painted`). The parent's note: Cade looked about a foot tall next to Knox's cage.
  - **Walking around things:** a click finds a way round anything in the way (`findPath`, a small grid search in `state.js`); arrow keys slide along its edge.
  - **Battle arenas** for the hall and the grotto (C), **hero battle sheets** that face the fiends with knocked-out poses on the ground (D), and the **painted island map** with measured places and trails (E). Codex's flags on the sheets: Knox's hurt pose still turns right, Wren's victory pose doesn't blow smoke off the barrel, and a few sword, cape and effect tips are cropped flat.
  - Not checked by eye yet: the 2.5D floor in motion on a real laptop.
- **The parent's third playtest is handled** (some of it waits on art wave 05):
  - **Title:** the title music downloads while the title shows, so it starts on the first click (it used to wait behind every sound effect). The menu is a small row along the bottom (Continue, which says where he left off; New Adventure, with a check; Quick Battle), and the art isn't darkened. The title painting is now `title_art` (B, delivered): the key art with Maren summoning the Titan.
  - **The ram** *(superseded on 12 October by the new opening's `OPENING` in `explore.js`; the VP9 testing tip still holds)*: the narrator's "rammed the Albatross" line has its own card, `story_ram` (A, delivered), and over it plays the parent's 15-second video of the collision, the fall and Cade landing on the beach (`public/assets/video/story_ram.mp4`, made with an image-to-video tool from that card; its sound removed so the narrator and music stay clear; `PROLOGUE_FILM` in `explore.js`). It plays like a cutscene from the ram line: the narration moves to the last line when it cuts to the fall (`cue`), the words clear just before the landing (`landing`), and the screen fades into the cove as it ends, so the last frame never freezes; a click hurries each step. H.264, so the headless Chromium can't play it (real browsers can): test with a VP9 copy in a scratch build. Without the file, the cards carry on as before.
  - **Floating heroes:** the canyon arena's floor edge is measured (`floorEdge: 0.645` on `bg_crystal_canyon`), so Wren's fights and the Geode Titan stand on the stone.
  - **Fights grow with the party:** one fiend alone, one or two with two heroes, two or three with three or four (`encounterOptions` in `state.js`; every place has three-fiend fights).
  - **The Geode Titan:** Maren's Overdrive fills visibly after the Titan's entrance, and the party says why on the way in (the lair's crystals sing to her Titan). He'd seen it jump to full with no reason.
  - **"Geode":** the voices said it wrong. `src/content/pronounce.js` respells tricky names for every voice (live and recorded), and the affected lines are re-recorded.
  - **Wren** waits beside the crystal ledge, glaring up at the monkey, not next to Cade. **Maren** sings until the party reaches her. Both have mood-driven exploring poses from their field sheets (C, delivered; `NPC_POSES` in `explore.js`): Wren glares at the monkey until she has her power cell back, then grins and twirls her blaster; Maren sings with her back to you until she's met, then listens.
  - **Stepping away from Wren's calibrating stranded the chapter:** once she had her power cell, clicking her again only got a line about the monkey, so there was no third shard and no way down to the grotto. She picks it up again now (`test/world.test.js` plays it through). `&at=wren` starts one calibration row before she joins, so her line about the singing (with Maren's song, faintly) is one problem away.
  - **Never bigger than 1080p:** the stage scales to the window but stops at 1920×1080 real pixels, centered (on the parent's 4K monitor, filling the screen only made the paintings blurry). "Fill the window" in the grown-ups corner lifts the cap, saved per computer, for a small high-resolution laptop where 1080p looks small.
  - **Fiends make noise beyond their attacks** (`FIEND_NOISE` in `battle.js`; `sfx_<name>_cry`, `_hurt`, `_ko`, `_idle` in `tools/audio/sounds.json`): each fiend cries as the fight opens, yelps when hit (once per volley), makes its own sound when beaten, and now and then fidgets out loud, softly, while he thinks (never over the Titan summon). The Geode Titan has hurt grunts and idle crunching (it already roars on entry). ElevenLabs makes near-silent clips when a prompt says "quiet", so idle prompts don't. `?debug` exposes the current battle question as `window.__question` (its `answerText`), and `window.__audioLog = []` collects every sampled sound played.
  - **Music stuttered after a while** (sooner on the old laptop): every track change and every loop of the music, ambience and song made a new media element source, and none was ever disconnected, so Chrome pulled silence through hundreds of them in real time until the audio thread couldn't keep up. Faded-out tracks and finished stings now let go of their nodes (`releaseCopy` in `audio.js`), sound effects disconnect when they end, and Maren's song only changes its level when the level really changes. A browser probe that counts sources: after six trips between places, 17 made and 15 let go (the two left are what's playing).
  - **The camera never stands still** (`drift` and `zoomDrift` in `FITS`, `scene.js`): exploring, it sways up to 12 px and slowly leans in and out (up to 2%), so the depth layers drift against each other even when nobody moves. A slow laptop turns the camera's own drift off (it redraws the painting every frame), so there the whole stage breathes as one piece on the graphics card instead (`idleTransform`). The old drift was 3 px, and the headless browser showed it switched off entirely by the slow-laptop fallback, which is probably what the parent saw.
  - **The zip line rides on the island map** (`ROPES` in `explore.js`): the party token slides down a sagging rope from the canyon to the grotto. The in-scene ride had the wrong perspective and landed on the monkey's perch.
  - **Maren's song** (`music_maren_song`, an ElevenLabs vocal track on its own channel, `song` in `audio.js`): once Wren points it out, it drifts up in the canyon in place of the music (`heardSong`; louder by the rope), carries on down the rope on the map, and in the grotto grows as he walks toward her, until she stops and says hello. The parent loves it, so that stretch has no jokes: the party listens and wants to find the singer (`hearSong`, `chasmZip`, `grottoArrive`, `caller`, and `poolsSong` and `seaSong` while she sings). It comes after Wren's Overdrive gets its moment: when she joins, drones attack (`api.ambush(fiends)`, her first fight, so her gauge starts full), she brags, and only then the quiet (if that fight is lost, the singing waits for the rope).
  - **Writing moves:** the word lists know every form of a word ("waves crashing", not just "waves crash") and more comparisons ("like bacon"). Claude reads his sentence as he types and on the shrine (`src/ai/judge.js`, capped per day; it needs the Anthropic key in the grown-ups corner), and the word lists are the fallback.
  - **Tidebreaker's beam** now breaks into spray on its own (D, delivered). The stopgap fade switches itself off for the new, wider picture. That picture's Titan is painted smaller in its frame, and the square canvas was fitted into the sprite's tall box, so the body shrank to about 58% when it attacked. Pose pictures are now drawn at the base picture's scale, anchor on anchor (`currentFrame` in `sprites.js`, `drawLiving` in `scene.js`), with a per-pose `scale` in the manifest for art painted smaller (1.25 on this attack).
  - **The 3D floor stops short of the horizon** at the cove, the canyon and the grotto, because the far view slides with the back of the beach. The game can now draw a distant view as its own layer, sliding slower than everything on the ground (`far` in `scene.js`). It waits on E: for each scene Codex paints `<scene>_far.webp`, then run `python3 tools/art/scene_layers.py --all` to cut the near layer out (and near versions of the state patches), and check the review sheets it writes in `art/review/wave-05/`. A scene without them looks as before.
- **Art wave 05** (`art/waves/wave-05-polish.md`; Codex's review page is `art/review/wave-05.md`): A to D are in the game and checked: the ram card, Maren on the title, Wren's and Maren's exploring poses (`?explore&debug&at=canyon`, `at=wren` and `at=maren`), and Tidebreaker's whole beam in Maren's summon. E is in for the cove and the grotto: `tools/art/scene_layers.py` cut their near layers (it compares the pictures blurred, because the image model repaints even the parts it keeps, then sharpens the edges). The canyon's first far picture painted new cliffs where the chasm's edges were, so the cut couldn't separate them; its redo (E2, open mist over the chasm) is in too, and the rope stays tied to its post as the camera pans. All three places now slide their distant view slower than the ground. F (added after the gate) is in and checked: the party riding the rope down to the grotto (`story_descent`), shown full screen after the map ride for about five seconds, leaning in toward the cave while the song plays (`descent()` in `runMap`).

- **The end of chapter 1** (`ending()` in `explore.js`; the lines `endingCrystal` to `endingAfter` in `story.js`). The parent asked for an ending that leaves the kids proud of what they did and excited for what's next. After the Geode Titan falls:
  - the shards fuse into the new Lore Crystal, and its light rolls over the island;
  - every hero thanks him;
  - "Chapter 1 complete!" lists the four shards and what he did for each, counts up his problems solved, words spelled, fiends defeated and Titan summons, and reads back his own words while Maren's song plays: the sentence that woke the shrine (kept as `world.shrineWords` from now on) and his mightiest Titan entrance;
  - the harbor at sunset, where the crystal belongs (the lighthouse's old crystal is fading), and Pockets runs off with Kit's hat;
  - Captain Jumble sails for the same harbor;
  - "To be continued" lists what chapter 2 holds, and back in the canyon Kit puts on a spare hat.
  The exploring HUD steps aside for all of it. Afterwards the lair offers the ending again, the harbor on the map has new lines (`mapHarborAfter`), and the title says "Chapter 1 complete ✓". If the game closes before the ending is over, arriving in the canyon plays it. `?explore&debug&at=ending` starts it.
  - **The clips' prompts, references and Kling API notes** are in `art/video-refs/ending-clips.md`. The parent's Kling API key is in the environment (`KLING_API_KEY`) and Kling's hosts are allowed, but the first try (session `session_014AqexKaL3sHHsXASP6m9FB`) found no API balance on the account: Kling's API bills from its own resource packs, not the app's credits. Once the parent buys some, a session can make the three clips (about 36 units for all three at 1080p, 15 seconds each).
  - **The films, made through Kling's MCP connector** (subscription credits, Kling 3.0, 720p, no sound, one continuous shot): all three are in. The crystal remade (`ending_crystal.mp4`) is trimmed to 6.9 s so it ends before a stray cloud and holds the crystal standing tall; its crystal grows from the floor instead of forming in mid-air. The harbor (`ending_harbor.mp4`, 9.5 s, the second try) rolls a line earlier, on Maren's "Look at the lighthouse": Pockets drops from the palm, scampers along the cliff and leaps for Kit's hat about 6 seconds in, just before "Hey! My hat!", and it holds on Kit without the hat. (Kling's copyright filter refused one wording of its prompt, uncharged; "droid", "pirate" and "three-eyed monkey" together may be what tripped it.) Jumble's (`ending_jumble.mp4`, 10 s) is the best: the letters stream to the town and the lighthouse flickers right around his "a bit... dim". The first try, on 3.0 Turbo at 15 s, was static and lost a shard, and cost more (8 credits a second against 6). All five together cost 360 of the parent's subscription credits.
  - **Pictures and films** (`ENDING` in `explore.js`): each moment is a painting, slowly pushed in, or the parent's film of it once there is one: a clip made from that painting (its first frame), up to 15 seconds, muted. To add one, put it in `public/assets/video/ending_<crystal|harbor|jumble>.mp4` (strip its sound) and set that moment's `film`. A film rolls on its moment's line `roll` (the harbor's on "Very carefully.", so Pockets grabs the hat right after), and the ending waits for it to finish before moving on; a click hurries it. Probed with a VP9 stand-in, since headless Chromium can't play H.264.
  - **Art wave 06** (`art/waves/wave-06-ending.md`; Codex's review page is `art/review/wave-06.md`, all `draft`) is in the game: the crystal remade (the glow sits where its shards meet, `ENDING.crystal.glow`) and Jumble's next move. Without them, the shard ring and `story_galleon` stand in. Front and side references of the cast for the parent's video tool, and the three clips' first frames as JPEGs, are in `art/video-refs/`.

- **The parent's fourth notes:**
  - **"Hear it" piled up:** each press queued one more reading of the word. A press now stops whatever is being said and starts the word over (`hearButton` in `panels.js`), and in dictation the typing cursor goes back to the box. The Titan Journal's movie-trailer button works the same way.
  - **Kit suggested Swap with nobody on the bench** (with three heroes or fewer, everyone fights). `matchupAdvice()` in `engine.js` decides: Swap only when the hero who'd do better is on the bench; "save it for their turn" when they're already fighting; "go big" when nobody does better. Kit says the fiend type's hint and the advice as two recorded lines.
  - **A backspace key for spelling:** the letter tiles have on-screen ⌫ and Enter keys like the missing-letters panel, and the word waits for Enter instead of going in with the last tile, so a wrong last tile can be taken back. In dictation, letters and Backspace reach the box even after a click elsewhere.

- **The parent's fifth notes (the play report after the kids finished chapter 1):**
  - **Fights are saved as they go.** The kids walk away mid-boss, and leaving used to throw the fight away. Every adventure fight is now saved between turns (`save.fight`: the engine's snapshot from `snapshot()` in `engine.js`, the encounter, the stats so far, and where it belongs). The battle's ☰ Menu button is now "⏸ Pause"; its "Save and quit" keeps the fight, and so does simply closing the game. Continue goes straight back in ("Back to the fight!"), with the boss still enraged or charging if it was. A story fight picks up through its own script, so winning the Geode Titan still gives the last shard and the ending (`pickUpFight()` in `explore.js`, `api.resumingFight` in `story.js`); ambushes just resume. The title's Continue says "Back to the fight: …". New Adventure and the `?explore` jumps (`at`, `scene`) drop a saved fight. Set battles from the title still start over when left.
  - **Play time counts only play** (`src/ui/clock.js`): the gap between two inputs counts at most a minute, and a hidden page or the pause menu counts nothing. Fight minutes and answer times (the quiet fluency timing) use it. One rematch with the Geode Titan had read 213.6 minutes because the fight sat open over dinner.
  - **The report covers everything saved** (`src/store/report.js`, tested): a line per day (fights, answers, how many right first try), every saved fight (up to 60; fights from before the play-time clock say their minutes were clock time), skills grouped by subject (addition and subtraction share names like "2-digit with regrouping"), the last 40 answers with the question asked and where, and a line for a fight saved mid-way. A filled-in word is logged as the whole word (it said "gave hh, answer fishhook"). The grown-ups' skills table has subject headings too.
  - **Two agents for the specialist work** (`.claude/agents/`): `screenwriter` for the story, dialogue and staging, and `voice` for ElevenLabs recordings. Hand them that work rather than doing it inline. The screenwriter's first job, the parent's story notes on chapter 1, became the rewrite below.
  - **Cade's new voice, and expression tags on every line.** The kids found Cade's old voice odd, and the first replacement sounded dull. The parent picked `HIGUfNOdjuWQwwapnTRW` on `eleven_v4` after an audition.
    - Every recorded line is now performed with an audio tag in front of it (`[warmly]`, `[dryly]`, `[urgently]`…). The parent compared tagged and untagged takes of the same lines, and the untagged ones fell flat.
    - The tags live in `tools/audio/direction.json`, by speaker and the line's exact text. They're sent only to the voice and never shown (`directedText()` in `tools/audio/lib.mjs`). `validateDirection()` flags tags for lines that don't exist, and lines a tag-reading model would speak without one.
    - All 81 of Cade's lines are re-recorded. That cost 475 credits at v4's launch price of about 0.1 credit a character; the list price is 1.
    - The other six speakers' tagged auditions all beat their current takes, so all six moved to `eleven_v4` with tags after the chapter 1 rewrite. That's Kit, Wren, Knox, Maren, Jumble and the narrator, at stability 0.3 and similarity 0.8 (the narrator at 0.5).
    - Every line has its tag, except spelling dictation, which reads plainly on `eleven_multilingual_v2`.
    - That run made 412 files: 322 re-made for the new model, plus the rewrite's 90 new or changed lines. The approved audition takes were kept. It cost 2,841 credits at the launch price, about 0.1 a character; the list price would have been about 28,000.
    - `tools/audio/made.json` remembers each file's voice, model and tags (`staleReason()` in `lib.mjs`). A run re-makes only what changed, and `--dry-run` says why and what it costs.
    - Four lines came out whispered and got new tags:
      - Maren's knockout bark: `[faintly]` became `[wearily]`.
      - Cade's "Thank you, crystal.": `[solemnly]` became `[gratefully]`.
      - Knox's "Oh... That's beautiful.": `[in awe]` became `[warmly]`.
      - Knox's "Oof. My hood is crooked.": `[flustered]` became `[indignant]`.
    - No ElevenLabs transcription was available to check Jumble's "A kuh-NIGHT? Ha!" and Kit's "That explains 'kuh-night'." Their timing fits "kuh-nite"; listen to them once.
    - `level_voices.mjs` caps sample peaks only. Kit's v4 takes overshot between samples after MP3 encoding, so the voice agent re-limited 8 files by hand. A true-peak (oversampled) limiter in the tool would stop that recurring.
    - **Captain Jumble sounded like an American man, not a pirate.** The parent found the fix in ElevenLabs themselves:
      - a tag describing his voice: `[angry menacing gravely sinister pirate] Glued your little shards back together, crystal carriers? [scoffing] How adorable! But that charming harbor's lighthouse is looking a bit... [sinister] dim.`;
      - tags at the turns inside the line;
      - low stability and similarity, 0.15 and 0.35.
    - `direction.json` now takes such performances: the line's exact text with up to five tags in it, checked against the screen's words (`directionProblems()` in `tools/audio/lib.mjs`). All 8 of Jumble's lines are re-recorded this way (108 credits). His new "dim." lands as the lighthouse in `ending_jumble.mp4` goes dark.
    - For warnings, use `[urgently]`: `[gravely]`, `[seriously]` and `[softly]` come out hushed, and so can the words after an ellipsis.
    - Cade's "There, past the shrine. That's who's been singing." (`[softly]`, `knight_aae6b5ad`) came out a full whisper. Unless the parent likes it, give it a fuller tag before the next run, which then re-makes just that line.

- **The chapter 1 rewrite (approved 12 October).** The parent's story notes were that the banter felt artificial, the opening abrupt, Jumble's entrance awkward, the crash film clunky, the day and night out of order, and the crystal's premise childish. The screenwriter's `docs/story/chapter1-proposal.md` answered them, and the parent approved all of it, extras included. `docs/story/bible.md` keeps it straight from now on.
  - **The premise: the Forgetting** (`docs/world.md`). A dim crystal makes its island forget, newest things first: sums, then spelling, then its songs. A new crystal learns from whoever carries it, so every true answer is something an island gets back. Maren's song is the last copy of her island's song, and Jumble wants a world that forgets he failed the Sage exams.
  - **The new opening** (`OPENING` in `explore.js`). It plays the `CONVOS` keys `prologue`, `prologueDeck`, `prologueJumble` and `prologueFilm` as beats, each over its own picture. `prologueFilm` is the 24-second intro film (`story_intro.mp4`, from `art/video-refs/intro-v8/`): the ram, the fall and Cade's landing, with its own stereo soundtrack (effects and voices, mixed by `tools/audio/intro-mix.py` from `art/audio-intro/`). The story box only shows its lines' words on the film's clock, and Jumble's theme ducks at the hit, swells for the fall and fades before the jungle. To remix: edit the cue list in `intro-mix.py`, run it, and mux the WAV into the film (x264 CRF 21, AAC 160k). Headless Chromium can't play H.264, so a browser playtest serves a VP9/Opus copy in its place.
    - The story box shows every speaker's face and name.
    - On deck, Kit hands him the crystal's first lesson (`ask`), one times fact from `crystalPuzzle()` in `puzzles.js`. It never asks 7 × 8, since Wren just shouted that answer. The crystal then flares (`glow`, at `CRYSTAL_AT`).
    - The ram is a hard cut into the film, its lines on the film's clock (`ram.at`). It whites out before anyone lands, the shards come down at dawn, and the beach fades in from white before Kit drops onto Cade, the only time anyone lands on him.
    - The deck and Jumble's galleon have Kling-made stand-ins until Codex's wave 07 repaints them. Without them, `story_albatross` stands in for the deck, and `story_galleon` for the galleon, graded to night (`STAND_IN_GRADE`).
  - **Four moments with heart**, each set up by a joke earlier in the chapter:
    - Knox's empty seat at the mural (`muralSeat`).
    - Wren's family ship (`airshipStory`).
    - Maren's island (`seaStory`).
    - Cade's rule twelve before the boss (`lairGo` the first time in, `lairAgain` after).
    - The three he finds by looking sparkle until they're told, and play once (`once()` in `story.js`). They're quiet moments: `api.hush()` lets the music step back and the view lean in, and Maren's song plays softly under hers.
  - **The ending.** It adds a harbor gone quiet ("They're forgetting") and Jumble letting slip who failed the Sage exams. The recap counts "True things you taught the crystal".
  - **The banter pass** covers 37 lines that explained their own jokes, described the screen, read out the menu or could have been anyone's.
  - **Recorded:** 90 new or changed lines, in the same run that moved the other six voices to `eleven_v4` with tags (above).
  - **The opening's pictures and films.** The first ones were made on Kling: the paintings `story_deck` and `story_galleon_night`, the charge film `story_galleon_charge.mp4`, and a new ram-and-fall `story_ram.mp4`. `art/video-refs/intro-clips.md` has how. They used 110 of the parent's 137 credits.
    - The parent found the films poor, but chose to keep them in the game until their own films replace them. From now on, stills come only from Codex, and films only from the parent (CLAUDE.md, "Pictures and films"). Their Kling credits recharge on 20 October.
    - **Codex's art wave 07** (`art/waves/wave-07-opening.md`) repaints `story_deck` and `story_galleon_night`, and adds `story_fall` (the fall at dawn, under Wren's line). Each also becomes the parent's first frame for a film, with a 16:9 JPEG in `art/video-refs/frames/`.
    - When wave 07 lands, set `CRYSTAL_AT.story_deck` to the crystal position in its review notes. `crystalTilt()` then stops tilting by itself once the crystal is above the story box.
    - When the parent hands over new films, set the charge's `film` and `to` and the ram's `src`, `impact` and `at` in `OPENING`. Without a film, the ram's lines play over `story_ram` and then `story_fall`.
- **Every push to this branch redeploys the game the kids play** (`.github/workflows/pages.yml`). Push only finished states: a script without its recordings, or staging without its lines, shows up in their game.

## Ideas for next

1. **Chapter 2, Driftwood Harbor:** Honest Hal's shop (spot his wrong totals), the Wit Duels, the Salty Biscuit, the lighthouse crystal. It's already a teaser on the island map. Paint it the wave 04 way: one picture per place, with its objects painted in.
2. **His own hero (Hero Forge),** or does he stay Cade? Ask the parent.
3. **A sea chart** to sail between islands, each with its own map like Driftwood Isle's.
4. **Leveling and gear,** so wild fights add up to something beyond glimmer.

## Done earlier (kept for reference)

### 4. ElevenLabs: done

The sound pack is in `public/assets/audio/` with its own manifest (`public/assets/audio/manifest.json`; the art manifest is Codex's). It has:
- 56 sound-effect files across 34 sounds, including element spells, fiend attacks and the summon set
- 3 ambience loops
- 6 music tracks: title, battle, boss, victory, defeat and the summon swell
- 35 of Kit's lines and 144 hero lines (barks and banter)
- since then: the adventure's 151 story lines, Kit's 15 fixed hint lines, 315 spelling dictations, Captain Jumble's voice and theme (`music_jumble`), the temple ambience and the exploring sound effects

**In the game:**
- `src/ui/audio.js` loads the manifest and decodes the sound effects on the first click or key. `sfx.<name>()` plays a random variant, or the old synth sound if a file is missing. `sfx.play(id)` plays any sampled sound.
- Music loops crossfade over their own end. `music.sting()` plays victory, defeat and the summon swell over the ducked loop. Ambience follows the background (`AMBIENCE_FOR`).
- `src/ai/voice.js` plays a pre-recorded line when the text matches exactly. Otherwise it tries ElevenLabs, OpenAI, then the browser (`providers.js`). Push-to-talk tries ElevenLabs Scribe, then OpenAI.
- The heroes' barks: `src/content/barks.js` holds the lines and `src/ui/barks.js` the bubbles and rules. They're described in `docs/game-design.md` under "The cast".
- Grown-ups corner:
  - the ElevenLabs key, the live-voice provider and a voice picker per role
  - the music and sound-effect sliders, and the "Character voices" switch (also in the pause menu)

**Re-running the generator:**

```
node tools/audio/generate.mjs --dry-run          # what's missing, and how many seconds / characters
node tools/audio/generate.mjs                    # make everything missing (needs ELEVENLABS_API_KEY)
node tools/audio/generate.mjs --only voice       # just the recorded lines
node tools/audio/generate.mjs --ids sfx_hurt_1 --force   # remake one file (or a sound id, or a speaker: kit, knight, …)
```

- It skips files that are up to date (`tools/audio/made.json`: made with the speaker's current voice, model and direction), retries 429 and 5xx errors, stops on a quota error, and rewrites the manifest after every file. Each clip gets a loudness `gains` entry (measured with ffmpeg) so its variants match.
- In a cloud session, run it with `NODE_USE_ENV_PROXY=1`: Node's `fetch` ignores `HTTPS_PROXY` otherwise, and every request fails with "fetch failed".
- Every recorded line is leveled to -18 LUFS with ffmpeg as it's made (`tools/audio/level_voices.mjs`; run it alone to re-level everything). The Spellwright's voice came out about 15 dB quieter than the Knight's before this.
- Sounds and prompts live in `tools/audio/sounds.json`.
- Fixed lines come from (`tools/audio/lines.mjs`):
  - `src/content/quips.js`
  - the `TRAINING` intros in `src/battle/data.js`
  - `src/content/kitLines.js` (Kit's other fixed lines)
  - `src/content/barks.js`
  - `storyLines()` in `src/world/story.js`
  - `FIXED_HINT_LINES` in `src/learn/hints.js`
  - a dictation line per word in `src/content/words.js` (`dictationLine()` in `src/learn/spelling.js`, which the game uses too)
- Edit a line and re-run `--only voice`. New text gets a new file (`voice/<who>_<hash>.mp3`). Old files stay until you delete them.

**Changing a voice:**
- Kit's recorded voice and each hero's is under `voices` in `tools/audio/sounds.json` (id, model, settings). Change the id or model, then run `node tools/audio/generate.mjs --only voice`. Every line recorded with something else is re-made, and `--dry-run` shows which and what it costs. Settings aren't tracked, so after a settings change add `--force --ids <speaker>`.
- Live voices are picked in the grown-ups corner, per role. That doesn't change the recordings.

**The parent's key is restricted** to text to speech, sound effects and music (on purpose). `/v1/user` and `/v1/voices` are refused, so:
- the generator counts credits from each response's `character-cost` header. That header leaves out the Voice Library fee: Kit's and Knox's voices come from the library and cost about 1.9 credits a character in all. Music reports no cost (about 26.5 credits a second). `GET /v1/usage/character-stats` works with this key and gives the real total.
- it can't use the voice changer (speech to speech), so the keeper's hum isn't in his cast voice
- "Save & check" treats a restricted key as fine
- the voice pickers fall back to ElevenLabs' standard voices, plus "Paste a voice ID…"

ElevenLabs allows browser calls (CORS `*`).

**Listening:** the parent has heard the auditions, Cade's new voice and Jumble's test take, and the kids have played everything. Nobody has listened to every line; the voice agent checks takes by measurement (loudness, true peak, how much of a line is voiced).

## Tools in the scratchpad (recreate if missing)

There are Playwright scripts that play the game in headless Chromium (`/opt/pw-browsers/chromium-*`):
- **Battles:** a full playtest that solves problems and screenshots each screen, and a boss probe that guards every turn and screenshots the Titan's attacks and charge-up.
- **The summon:** a probe that screenshots the cinematic at timed points.
- **The adventure:**
  - a story probe that plays chapter 1 to the ending
  - an edge-case probe for wrong answers, stepping away, losing a fight, and quitting and continuing
  - an ambush probe
- **The rest:** a fake streaming-Claude test for the tutor chat, and an effect probe.

They're quick to rewrite:
- **Battles:** drive `?battle=t1…t4&debug`, which exposes `window.__battle`, and read the equations off `.problem .equation`.
- **The adventure:** drive `?explore&debug&calm`. `window.__world` is the save, `window.__puzzle.answerText` is the current puzzle's answer, and `calm` turns ambushes off. To end a fight, set every fiend's `ko` and `b.over = "victory"`, then pass the turn with Guard. On the island map, `window.__world.onMap` is true and each place is a `.map-place` button.
- **Painted scenes:** `window.__hero` is the walking hero (move him and the camera follows), and every painted thing is a `.hot-area.painted` with its `data-hot`.
- **A battle probe** starts at `&at=canyon`, clears `lessons`, walks into an ambush and checks the Overdrive lesson, the command menu's fit, health carried over and the rest crystal.
- **Moving elements:** click with `{ force: true }`, because they never stop moving.
- **The opening** (from a fresh save, `?explore&debug&calm`):
  - Press Enter through the lines and read `.story-text`, `.story-name` and the art in `.story-art`'s background.
  - When `.window.problem` appears, type `window.__puzzle.answerText` and press Enter.
  - The crystal's flare adds a `.crystal-glow`, and the beach comes up as `.screen.explore`.
  - To see the films play, copy them to VP9 inside `dist/` (`ffmpeg -c:v libvpx-vp9 -b:v 1M -deadline realtime -cpu-used 8 -an`) and don't press Enter while a film is rolling: its clock moves the lines.
  - Serve `dist/` with `python3 -m http.server`.
