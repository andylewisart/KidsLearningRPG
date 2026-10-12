# The new opening's pictures and films

This covers the opening the parent approved on 12 October (`docs/story/chapter1-proposal.md`, section 3). It needs two new paintings and three short films.

The budget is the last of the parent's Kling credits: 137. A film on Kling 3.0 at 720p costs about 6 credits a second. Today's ram film (`story_ram.mp4`, made from the `story_ram` painting with no character references) shows small, blurry figures and odd motion. The fixes:

- **Bigger characters.** The figures are large in frame.
- **One simple action per film.** Each film does one thing.
- **Character references.** The heroes are bound from `art/video-refs/<id>/` (front, left and right views).
- **Chaining.** Each film starts on the last frame of the one before.

The game plays every film muted (`OPENING` in `src/ui/explore.js`), and each picture is also the fallback when its film can't play.

## Paintings (Kling `image_to_image`, GPT-Image2, 3:2)

Each painting's prompt starts with the master style prompt in `art/STYLE.md`. The light is night under a full moon, the same moon as `story_albatross`. Faces stay out of the bottom quarter, where the story box sits (`art/guides/story_card.png`).

1. **`story_deck`** (beat 3, on deck).
   - References: `story_albatross` (the ship, the sky, the moon), and the front views of `ally_knight`, `ally_gunner`, `tutor_droid` and `mascot_monkey`.
   - Prompt: "The deck of the airship from image 1 at night, just before dawn, under the same full moon. In the middle of the deck, an open brass grate where a big faceted teal crystal glows up from its cradle below, lighting faces from beneath. At the big brass ship's wheel on the left, the red-haired sky-pirate captain from image 3, grinning. Beside the grate, the young knight from image 2 standing guard, earnest, one hand on his sword hilt. Floating at his shoulder, the round white droid from image 4 in its tiny pirate hat. Lanterns along the rail, the patched red-and-white balloon overhead, rigging. Far off over the sea, one cloud bank glows faintly green. Half hidden in the rigging, the small three-eyed monkey from image 5, eyeing the crystal. Keep every character exactly as in the references."
   - The crystal's position goes into `CRYSTAL_AT.story_deck` for its glow.
2. **`story_galleon_night`** (beat 4, Jumble). It's also the first frame of film 1.
   - References: `story_galleon` (the galleon), `npc_jumble`, `story_albatross`, and the front views of the knight, the captain and the droid.
   - Prompt: "From the stern deck of the airship at night, looking past the knight, the sky-pirate captain and the round droid (seen from behind, bracing), the translucent green ghost galleon from image 1 bursts bow-first out of a glowing green cloud straight at them, one second from impact. Captain Jumble from image 2 stands big on the prow, one arm flung forward, laughing. Same full moon and night sky as image 3. Keep every character exactly as in the references."

## Films (Kling `image_to_video`, Kling 3.0, 720p, no sound, 5 seconds each)

Each film binds Cade, Wren and Kit as elements made from their reference views. Each prompt ends with the negative prompt from `ending-clips.md`.

1. **`story_galleon_charge.mp4`**, from `story_galleon_night` (its 16:9 middle). It rolls on Jumble's last line, "RAMMING SPEED!". About 30 credits.
   - Prompt: "The ghost galleon surges out of the glowing green cloud straight at the camera, its rune-sails billowing with ghostly light. Captain Jumble on the prow throws back his head laughing and points at us. In the foreground the knight, the sky-pirate captain and the round droid brace on the deck, hair and scarf whipping in the wind. Steady camera with a slight shake. It ends a split second before the prow hits. Night, full moon."
2. **The ram**, from film 1's last frame. About 30 credits.
   - Prompt: "The galleon's prow smashes into the airship's deck in a burst of green light and splinters. The big teal crystal in its cradle cracks into four glowing shards that shoot off in four directions. The knight, the sky-pirate captain and the round droid are thrown off the deck into the night sky. The camera shakes, then pulls back."
3. **The fall**, from film 2's last frame. About 30 credits.
   - Prompt: "The knight, the sky-pirate captain and the round droid fall through the clouds toward a jungle island as dawn breaks, with four streaks of teal light falling ahead of them. The sky-pirate captain catches a rope trailing from her smoking airship and swings away with it. High behind them, the ghost galleon dissolves into green fog and a green streak flies off. The camera follows the falling knight and droid from above as the sky brightens."
   - Films 2 and 3 are joined into `story_ram.mp4`, which replaces today's.
   - The game then sets `OPENING`'s ram `from`, `to` and `at` so the three lines land on the impact, on Jumble flying off and on Wren's rope, and it whites out before anyone lands.

**Total:** about 90 credits for the films, plus the two paintings. That leaves room for one retake. A 5-second living deck film (about 30 credits) only comes if nothing needs redoing.
