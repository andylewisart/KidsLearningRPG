# The chapter 1 ending's video clips

Three clips, one per moment of the ending (`ENDING` in `src/ui/explore.js`). Each one starts from its first frame below, which is also the painting the game shows when the clip isn't there. Up to 15 seconds each, 16:9. Sound doesn't matter: the game plays them muted.

**First frames:** upload the `-16x9.jpg` copies. They're the middle 16:9 of each painting, which is exactly the part the game shows, so a clip's first frame lines up with the painting it replaces. The full 3:2 paintings are next to them.

**On the Kling website or app** (the subscription's credits pay for it there; the API needs its own units): make each clip from its first frame and prompt below, download it, and put it in `public/assets/video/` under its file name.

**Character references:** if the video tool takes them along with the first frame, attach each listed character's `front.jpg` and one profile from `art/video-refs/<id>/`. The characters are already in the frame, so the frame alone works too.

**When a clip is done:** strip its sound (`ffmpeg -i in.mp4 -an -c:v copy out.mp4`), save it as its `public/assets/video/` file below, and set that moment's `film` in `ENDING`. A film starts rolling on its moment's `roll` line, and the ending waits for it to finish (a click hurries it). Probe with a VP9 copy: headless Chromium can't play H.264.

## 1. The crystal remade

- **First frame:** `frames/story_crystal_remade-16x9.jpg`
- **References:** `tutor_droid`, `ally_knight`, `ally_spellwright`, `ally_titancaller`, `ally_gunner`
- **File:** `public/assets/video/ending_crystal.mp4`. It rolls on Knox's "The four shards remember each other. Listen!", and the next two lines (the shards clicking together, the light rolling across the island) come over it.

```text
The four glowing teal crystal shards floating between the heroes drift toward each other, slowly at first and then faster, circling in a ring of light. Around five seconds in they click together in a bright flash and fuse into one tall, faceted crystal that rises into the open glowing space above the heroes, shining teal and white. A soft ring of light pulses out from the crystal and rolls across the whole cave, lighting up the purple crystal walls, with sparkles and dust swirling in the shaft of sunset light. The heroes watch in wonder and break into smiles: the knight's crimson scarf stirs in the gust, the hooded scholar lifts his glowing book, the Titan Caller raises her staff, the sky-pirate grins, and the round white droid in its tiny pirate hat bobs happily. Slow, steady camera push-in with a gentle tilt up to follow the rising crystal. End on the crystal shining above the smiling heroes. Keep every character exactly as in the first frame and the reference images. Hopeful, triumphant, magical.
```

## 2. Driftwood Harbor

- **First frame:** `frames/story_ending-16x9.jpg`
- **References:** `mascot_monkey`, `tutor_droid`, `ally_gunner`
- **File:** `public/assets/video/ending_harbor.mp4`. It rolls on Kit's "Then we carry it down there. Very carefully.", and "Hey! My hat!" comes right after, so the grab has to happen in the first two or three seconds.

```text
Sunset on a cliff above a pirate harbor town built from old ships. The heroes stand at the cliff edge taking in the view, and the crystal at the top of the lighthouse on the right flickers weakly, its blue light fading in and out. About two seconds in, the small three-eyed monkey in the palm tree at the top left swings down on a palm frond, snatches the tiny pirate hat off the round white droid, and scampers away along the cliff toward the town, waving the hat over his head. The droid spins around in surprise; the red-haired sky-pirate captain whirls and points after the monkey, shouting; the knight laughs. The monkey gets smaller and smaller as he runs down toward the harbor. Gentle camera drift following the monkey toward the town. Warm golden light, seagulls, sparkling water. Playful and funny. Keep every character exactly as in the first frame and the reference images.
```

## 3. Jumble's next move

- **First frame:** `frames/story_jumble_next-16x9.jpg`
- **References:** `npc_jumble`
- **File:** `public/assets/video/ending_jumble.mp4`. It rolls on Jumble's first line, and the picture dims on Maren's answer.

```text
Night at sea outside a pirate harbor town. The translucent sea-green ghost galleon glides forward out of the glowing green fog, its tattered rune-sails rippling with ghostly light. Captain Jumble stands on the prow, throws back his head in a big theatrical laugh, then sweeps his raised hand toward the harbor: a stream of glowing green letters spirals off his fingertips and flows across the night sky toward the distant town. As the letters reach it, the lighthouse crystal flickers and dims. The galleon keeps sliding toward the harbor, fog curling around its hull, moonlight on the waves. The camera starts close on Jumble, then pulls back and pans to follow the letters to the harbor. Spooky-fun and mischievous, never scary. Keep Jumble and his galleon exactly as in the first frame and the reference images.
```

## Negative prompt (all three)

It leaves out "text" on purpose: clip 3 needs its letters.

```text
subtitles, captions, watermark, logo, extra characters, extra limbs, distorted faces, characters changing clothes or colors, morphing, flicker, shaky camera, scary
```

## Through the Kling API

A cloud session can make these itself once the environment has the keys and can reach Kling:

- **Key:** Kling issues one API key, sent as `Authorization: Bearer <key>` (its older Access Key and Secret Key pair, signed into a JWT, is for legacy setups). It's read from the `KLING_API_KEY` environment variable, set in the environment's settings and never pasted into a chat or committed.
- **Network:** the environment's allowed domains need Kling's hosts, `*.klingai.com` and `*.kling.ai`: the API and wherever it serves the finished videos.
- **Billing:** the API spends its own balance: API resource packs (or a pay-as-you-go cash balance) bought on Kling's developer console, separate from the credits of the Kling app or website. With none, every request is refused with HTTP 429, `{"code":1102,"message":"Account balance not enough"}`, and nothing is charged (seen 2026-10-11).
- **What a session found in Kling's API docs** (snapshot dated 2026-09-20; check them again, since `kling.ai` itself isn't reachable from the environment, only `*.klingai.com`):
  - Host `https://api-singapore.klingai.com`.
  - A first frame plus character references: Kling 3.0 Omni, `POST /omni-video/kling-3.0-omni`. Its body:
    - `contents`: `{type: "prompt", text}`, `{type: "first_frame", url: <raw base64 or URL>, id: "image_1"}`, and `{type: "refer_image", url, id: "image_N"}`, with up to 7 images in all.
    - `settings`: `{resolution: "1080p", aspect_ratio: "16:9", duration: 15, audio: "off", multi_shot: false}`. Duration is any whole number from 3 to 15 seconds.
    - `options`: `{external_task_id, watermark_info: {enabled: false}}`.
  - There's no negative-prompt field, so it goes at the end of the prompt text as "Negative prompt: …".
  - Poll with `GET /tasks?task_ids=<id,id>`. Status goes submitted → processing → succeeded or failed; the video is at `data[].outputs[].url` (kept 30 days), and the cost at `data[].billing[]`.
  - Price: 0.8 units ($0.112) per second at 1080p without sound, so about 12 units ($1.68) per 15-second clip, about 36 units for all three. The game never shows more than 1080p, so 4K would be wasted.
  - Planned references: the five heroes' `front.jpg` for the crystal; `front.jpg` and `left.jpg` of `mascot_monkey`, `tutor_droid` and `ally_gunner` for the harbor; `npc_jumble`'s for Jumble. The first frames are a 1536x864 center crop of each painting (the part the game shows; the monkey stays in the harbor frame, top left).
