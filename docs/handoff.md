# Handoff: work in progress

For whichever Claude session picks this up next. Read `CLAUDE.md` first.

## Where things stand

- **Branch:** `claude/busy-einstein-52yr07`. Codex is generating art wave 02 (`art/waves/wave-02-ui-and-depth.md`) on the same branch, so `git pull --rebase` before you push.
- **Done:**
  - The playable battles with Codex's wave 01 art.
  - The pause menu (Esc → Quit to title).
  - The play report: grown-ups corner → "Copy report for Claude".
  - The perspective guides (`art/guides/`, drawn by `tools/art/make_guides.py` from `src/ui/stage-layout.json`).
- **The parent's feedback still to address** (from his own playthrough):
  1. The UI is boring: emoji for moves.
  2. Sprites need idle animation.
  3. Backgrounds need parallax.
  4. The Titan summon looks cheesy: it just appears over the screen and wobbles.

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

### 4. ElevenLabs (the parent has a key)

The environment should have `api.elevenlabs.io` allowed and the key in `ELEVENLABS_API_KEY`. If it isn't there, don't ask for the key in chat: point him to the environment settings.

**Sound pack:**
- `tools/audio/sounds.json` lists every sound: id, prompt, duration and loop. `tools/audio/generate.mjs` (Node 22 `fetch`) writes the files to `public/assets/audio/` and merges `sfx` and `music` entries into the manifest.
- Sound effects endpoint: `POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128`, header `xi-api-key`, body `{ text, duration_seconds (0.5–30), prompt_influence (0–1, default 0.3), loop (v2 only), model_id: "eleven_text_to_sound_v2" }`.
- Music endpoint: `POST https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128`, body `{ prompt, music_length_ms (3000–600000), force_instrumental: true, model_id: "music_v1" }`.
- Wanted sounds:
  - The game's existing `sfx` names (see `src/ui/audio.js`).
  - Element spells: fire, ice, lightning.
  - Fiend attacks: raptor screech, jelly zap, beetle charge, slime splat, drone whir.
  - Titan roar, tidal wave, splash.
  - Ambience loops: jungle, canyon, cove.
  - Music: title, battle, boss, victory sting, defeat sting, summon swell.
- Never name franchises in prompts.

**Game audio:** `src/ui/audio.js` loads and decodes the files after the first click, plays a random variant, and falls back to the current synth sounds. Music crossfades and loops, and `setMusicMuted` already has a stub.

**Kit's voice:**
- Add an ElevenLabs provider next to OpenAI: `POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128` with `{ text, model_id: "eleven_flash_v2_5" }` for Kit, and `eleven_multilingual_v2` for the trailer and spelling voices.
- Push-to-talk: `POST /v1/speech-to-text` (multipart, `model_id: "scribe_v1"`).
- Voices for the pickers: `GET /v1/voices`.
- The key goes in the grown-ups corner, saved in the browser and left out of backups.
- Whether the browser can call ElevenLabs directly (CORS) is unconfirmed, so fall back to OpenAI or the browser voice on any failure, and show the result of "Save & check".

## Tools in the scratchpad (recreate if missing)

There are Playwright scripts that play the game in headless Chromium (`/opt/pw-browsers/chromium-*`):
- a full playtest that solves problems and screenshots each screen
- a fake streaming-Claude test for the tutor chat
- a summon probe
- an effect probe

They're quick to rewrite: drive `?battle=t1…t4&debug` (which exposes `window.__battle`) and read the equations off `.problem .equation`.
