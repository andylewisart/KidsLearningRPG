# Handoff: work in progress

For whichever Claude session picks this up next. Read `CLAUDE.md` first.

## Where things stand

- **Branch:** `claude/busy-einstein-52yr07`. Codex (art) and another Claude session (audio) push to the same branch, so `git pull --rebase` before you push.
- **Done:**
  - **The adventure, chapter 1** (`docs/game-design.md`, "Exploring"). Driftwood Isle with the cove, the temple and its Hall of Glyphs, the canyon and the Tide Grotto, joined by the island map. Surprise fights, puzzles, rest crystals, the party joining one by one, the Geode Titan and the ending.
  - **The real setting** (`docs/world.md`). The cast has names: Cade, Captain Wren, Knox, Maren, Kit and Pockets.
  - **Battles on the living stage** (`src/ui/scene.js`): a camera that drifts and pushes in, depth parallax, and breathing sprites. Fiend attacks land visibly, and the Geode Titan warns before Crystal Quake.
  - **The Titan summon is a cinematic.** It's timed to the summon music's cues, and Enter/Space/Esc skips it.
  - **Wave 02's interface art:** command icons, the window frame, the cursor, the logo and turn-order faces (`src/ui/icons.js`).
  - **Earlier:** the pause menu, the play report (it includes adventure progress), the perspective guides, and the ElevenLabs sound pack (step 4 below).
  - **Art wave 03 is in the game** (`art/waves/wave-03-exploration.md`): the island's objects, walk cycles, Captain Jumble, the monkey's poses, icons and story cards. Codex flagged 10 drafts in `art/review/wave-03-qa.json`. Checked in the game:
    - Walk cycles: `tools/art/align_walks.py` lined up each frame's upper body sideways (it lurched up to 45 px). The knight still bobs a lot in frames 4 and 5, and swords and capes change shape between frames; only a repaint fixes that.
    - The signpost's words are fitted to the painted boards (`SIGN_BOARDS` in `explore.js`).
    - Knox shows inside the cage: a solid copy of the cage stands behind him and a see-through one in front.
    - Story cards, Jumble's portraits, item and HUD icons look right. Use `?explore&debug&scene=temple` (or `cove`, `canyon`) to jump straight to a scene, or `&at=maren` / `&at=lair` to start partway through the chapter.
  - **The Geode Titan's lair is easy to find now.** A playtester got stuck with four heroes and three shards: the lair sat at the canyon's far edge, half off screen and behind the foreground pillar, and nothing pointed to it. It's moved in (a test keeps every hotspot where the camera can show it whole). When Maren joins, the lair rumbles and glows, and she says where it is. The foreground layer also fades while it covers the hero, so he never disappears behind a pillar.
  - **Every fixed line is recorded**, story included: the narrator, Captain Jumble (Callum, a standard voice; swap it under `voices.jumble` in `tools/audio/sounds.json`), Kit's built-in hints and all 315 spelling dictations. Live voices are left for Claude's words, school-list words and hints with numbers in them.
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
- **Art wave 04 is half in** (`art/waves/wave-04-scenes.md`). Section A, the five painted scenes, landed in `public/assets/scenes/explore/` with measured object boxes, sign boards and the chasm's rope ends in the manifest (`kind: "explore"`). Still to come from Codex: B, the state patches (`tools/art/scene_patches.py` cuts them); C, the battle arenas for the hall and the grotto; D, hero battle sheets that face the fiends; E, the island map.

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

- It skips files that exist, retries 429 and 5xx errors, stops on a quota error, and rewrites the manifest after every file. Each clip gets a loudness `gains` entry (measured with ffmpeg) so its variants match.
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
- Kit's recorded voice and each hero's is under `voices` in `tools/audio/sounds.json` (id, model, settings). Change the id, then run `node tools/audio/generate.mjs --only voice --ids kit --force` (or `knight`, …).
- Live voices are picked in the grown-ups corner, per role. That doesn't change the recordings.

**The parent's key is restricted** to text to speech, sound effects and music (on purpose). `/v1/user` and `/v1/voices` are refused, so:
- the generator counts credits from each response's `character-cost` header
- "Save & check" treats a restricted key as fine
- the voice pickers fall back to ElevenLabs' standard voices, plus "Paste a voice ID…"

ElevenLabs allows browser calls (CORS `*`).

**Not done yet:** a listening pass by ear. Every choice was made from the prompts, loudness measurements and voice descriptions, without hearing the results.

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
- **A battle probe** starts at `&at=canyon`, clears `lessons`, walks into an ambush and checks the Overdrive lesson, the command menu's fit, health carried over and the rest crystal.
- **Moving elements:** click with `{ force: true }`, because they never stop moving.
