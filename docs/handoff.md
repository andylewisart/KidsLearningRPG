# Handoff: work in progress

For whichever Claude session picks this up next. Read `CLAUDE.md` first.

## Where things stand

- **Branch:** `claude/busy-einstein-52yr07`. Codex (art) and another Claude session (audio) push to the same branch, so `git pull --rebase` before you push.
- **Done:**
  - The playable battles with Codex's art. Fiend attacks land visibly, and the Geode Titan warns before Crystal Quake.
  - The adventure, chapter 1 (`docs/game-design.md`, "Exploring"). Driftwood Isle with the cove, the temple and the canyon, surprise fights, puzzles, the party joining one by one, and the ending.
  - The real setting (`docs/world.md`). The holo-simulator framing is gone, and the cast has names: Cade, Wren, Knox, Maren, Kit and Pockets.
  - The pause menu, the play report, the perspective guides, and the ElevenLabs sound pack (step 4 below).
  - Art wave 02 has landed (UI art, portraits, foregrounds, the cove arena, summon art). The game doesn't use most of it yet: steps 1–3 below.
  - Art wave 03 (exploring art) is written for Codex: `art/waves/wave-03-exploration.md`. When it lands, `props.js`, `dialogue.js` and `explore.js` pick it up by id, but check the signpost's words and the cage.
- **The parent's feedback still to address:**
  1. The UI is boring: emoji for moves.
  2. Battle sprites need idle animation. Explore mode already has it.
  3. Battle backgrounds need parallax. Explore mode already has it.
  4. The Titan summon looks cheesy: it just appears over the screen and wobbles.
- **Story lines need recording.** `storyLines()` in `src/world/story.js` should go into `tools/audio/lines.mjs` once the parent okays the credits. Captain Jumble needs a voice.

## Next steps, in order

### 1. Camera, parallax and idle motion (no new art needed)

Add a scene module (e.g. `src/ui/scene.js`) with one `requestAnimationFrame` loop.

**Camera:**
- Wrap the battlefield contents in a `cam` div: background, sprite layer, fx canvas and fx sheets. Damage numbers should go there too: `floatNumber(cam, …)`.
- Shakes stay on the outer `field`, so they don't fight the camera transform.
- Movement: a slow idle drift (±10 px over about 25 s), a gentle push toward the target on attacks (zoom about 1.04, ease in about 380 ms, then out), and a very subtle mouse parallax.

**Backdrop:**
- Draw the background on a canvas, row strip by row strip, with horizontal parallax per row. Rows above the floor's back edge (`stage-layout.json` `floorEdgeStageY`) move slowly.
- Floor rows move in proportion to their distance below eye level (`eyeLevelImage`), which is correct perspective for a flat floor.
- Apply the fighters' depth factor through the `cam` transform, and draw rows relative to it.
- Draw the foreground layer (`fg` in the manifest, wave 02) on a canvas above the sprites, moving faster.

**Living sprites:**
- Give each painted sprite a canvas inside `.body` that redraws its current frame every animation frame as about 40 horizontal strips.
- Feet stay fixed. Strips sway more with height, and the whole sprite breathes (scaleY about 1.2%).
- Hide the original sheet or img with `visibility: hidden`, and keep it so `artTop` and `setPose` still work.
- `setPose` should record the frame index so the canvas draws the right cell. Boss poses swap the img src.
- Turn off the CSS bob on painted sprites.

Motion per creature:

| Who | Motion |
|---|---|
| Heroes | Calm breathing, slight cape and hair sway |
| Scrap Raptor | Faster breathing |
| Volt Jelly | Hovers; the tendrils wave more toward the bottom (anchored at the top) |
| Magnet Beetle | Heavy and slow |
| Ink Slime | Squash-and-stretch wobble |
| Drone | Hovers and tilts, with no warp |
| Geode Titan | Slow, heavy breathing |

### 2. The summon cinematic (replace `doSummon`'s current overlay)

1. Hide the HUD, slide in letterbox bars and duck the music.
2. The Titan Caller casts, and the camera pushes in on her over a summoning circle (`fx_summon_circle` once it exists).
3. The scene darkens and tints teal, with a rumble and small shakes.
4. The Titan rises from **behind the floor's back edge**: clip its container at `floorEdgeStageY`, with spray (`fx_splash`) along that line. It is huge (about 760 px tall), centered behind the fighters, with a slow dolly up and living-sprite breathing.
5. His sentence appears word by word in trailer style, timed with the trailer narration.
6. The Titan roars (`poses.roar`, the `fx_roar` shockwave, a heavy shake), then attacks (`poses.attack`, a `fx_tidal` sweep across the fiends, a white flash), and the damage numbers show.
7. The Titan sinks, the overlays clear and the HUD returns.
8. Enter, Space or Esc skips to the attack.

### 3. UI polish

- Show portrait chips in the turn-order bar: heroes use frame 0 of their portraits sheet; fiends use `portrait` (wave 02), falling back to their base image.
- Use the painted command icons (`ui_icons_commands` names), with hand-drawn SVG icons as the fallback until they land.
- Draw windows with `ui_frame` via `border-image` (slice 96), add the `ui_cursor` pointer on the selected command, and put `ui_logo` on the title screen.
- New backgrounds: `bg_shipwreck_cove` for free training. Read `floorEdge` from the manifest.

### 4. ElevenLabs: done

The sound pack is in `public/assets/audio/` with its own manifest (`public/assets/audio/manifest.json`; the art manifest is Codex's). It has:
- 56 sound-effect files across 34 sounds, including element spells, fiend attacks and the summon set
- 3 ambience loops
- 6 music tracks: title, battle, boss, victory, defeat and the summon swell
- 35 of Kit's lines and 144 hero lines (barks and banter)

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
- Sounds and prompts live in `tools/audio/sounds.json`.
- Fixed lines come from:
  - `src/content/quips.js`
  - the `TRAINING` intros in `src/battle/data.js`
  - `src/content/kitLines.js` (Kit's other fixed lines)
  - `src/content/barks.js`
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
- a full playtest that solves problems and screenshots each screen
- a fake streaming-Claude test for the tutor chat
- a summon probe
- an effect probe

They're quick to rewrite: drive `?battle=t1…t4&debug` (which exposes `window.__battle`) and read the equations off `.problem .equation`.
