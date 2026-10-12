# Wave 07: The new opening's paintings

Chapter 1 has a new opening, approved by the parent on 12 October. The story is in [`../../docs/story/chapter1-proposal.md`](../../docs/story/chapter1-proposal.md), section 3; the setting is in [`../../docs/world.md`](../../docs/world.md). It plays as beats, each spoken over a story painting (`OPENING` in `src/ui/explore.js`):

1. **The cold open:** the airship at night. *(existing `story_albatross`)*
2. **On deck:** Cade, Wren and Kit, and the new crystal glowing below deck. Kit teaches it a times fact, and it flares when he answers. *(this wave: `story_deck`)*
3. **Captain Jumble:** his ghost galleon bursts out of a green cloud and charges them. *(this wave: `story_galleon_night`)*
4. **The ram and the fall:** the hit, the crystal shattering into four shards, the three thrown into the sky and falling toward the island at dawn, Wren grabbing a rope from her ship. *(existing `story_ram` for the hit; this wave: `story_fall`)*
5. **The shards come down:** the island from above at dawn. *(existing `story_crash`)*

`story_deck` and `story_galleon_night` are in the game now as stand-ins, painted with another tool. The parent wants every still from Codex, so this wave repaints both at the same paths and adds `story_fall`. The light runs one way through the opening: night on deck, the first gold of dawn during the fall, then sunrise on the beach.

Each picture is also the first frame the parent uses to make a film of that moment later, with the character references in `art/video-refs/`. So paint the moment just before the action, with the characters large and clear. Small, busy figures turned into blurry shapes in the last film.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" section. Use the Scene block, and give each picture the light named in its prompt instead of the master prompt's golden hour.

**Run the whole wave straight through.** There is one review gate, at the end.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps working without it.

---

## The pictures

- **Outputs:** `scenes/<id>.webp`, each `1536x1024`, opaque.
  - Also a JPEG of each (quality 92) at `art/video-refs/frames/<id>.jpg`.
  - Also its middle 16:9, `1920x1080`, at `art/video-refs/frames/<id>-16x9.jpg`. That's the part a 16:9 screen shows, and the parent's first frame.
- **References, in this order:**
  - the style anchors (`anchors/key_art.webp`, `anchors/cast_lineup.webp`);
  - each character's own pictures (`characters/<id>/base.webp`, plus `battle.webp` or `field.webp` where they exist). Match them exactly: outfit, colors, proportions, hair, face, gear;
  - the scene references listed with each prompt;
  - `guides/story_card.png`.
- **The story box.** A box covers the bottom strip that `guides/story_card.png` marks, from about 71% to 87% of the picture's height. Keep faces and the key action above it. The 16:9 screen also cuts about 8% off the top and bottom, so keep heads and hats inside that too.
- **Manifest:** `"story_deck"`, `"story_galleon_night"` and `"story_fall"`, each `{ "kind": "scene", "wave": 7, "status": "draft", "base": { "src", "w", "h" }, "source": { … } }`. Replace the two existing entries; keep every other entry as it is.
- **QA:**
  - Every character matches their references.
  - Nobody looks hurt or scared: it's an adventure, not a disaster.
  - The light matches the prompt (night, or the first gold of dawn).
  - The key action is above the story box and inside the 16:9 screen.
  - No text, letters, logos or borders anywhere.

| ☐ | `<id>` | Moment | Characters |
|---|---|---|---|
| ☐ | `story_deck` | On deck, before dawn | Cade, Wren, Kit, Pockets |
| ☐ | `story_galleon_night` | Jumble charges | Cade, Wren, Kit (from behind), Jumble |
| ☐ | `story_fall` | The fall at dawn | Cade, Wren, Kit |

### `story_deck`: on deck, before dawn

- **Characters:** `ally_gunner`, `ally_knight`, `tutor_droid`, `mascot_monkey`.
- **Scene references:**
  - `scenes/story_albatross.webp`: the airship, the night sky and the moon. Match them.
  - The stand-in currently at `scenes/story_deck.webp`, for its layout only. Repaint it in the house style.
- **The crystal must show.** In the stand-in, the crystal's grate sat at the bottom edge, under the story box, so the game has to tilt the view down to see it flare.
  - Put the open grate and its glowing crystal in the lower middle of the picture: its center about 50% across and 58% down, and its bottom no lower than about 70%.
  - In the game the crystal flares (a glow is laid over that spot) when he answers Kit's question. Write the crystal's center, in percent across and down, in the review notes.

```text
Night just before dawn, cool blue moonlight with warm lantern glow, on the open deck of the patched airship from the attached picture, high above the sea, under the same full moon and stars. In the middle of the deck, an open round brass grate: a big faceted teal-blue crystal glows up through it from its cradle below, lighting the faces above from beneath. At the big brass ship's wheel on the left stands the red-haired sky-pirate captain from the attached references, grinning, her long red coat flapping. Beside the grate the young silver-haired knight from the attached references stands guard, earnest, one hand on his sword hilt, his red scarf stirring. Floating at his shoulder, the round white tutor droid in its tiny pirate hat. Lanterns along the rail, the patched red-and-white balloon overhead, ropes and rigging. Far off over the dark sea, one cloud bank glows faintly green. Half hidden up in the rigging, the small three-eyed monkey in a tricorn hat just like the droid's, eyeing the crystal. Calm before the storm, warm and a little mysterious.
```

### `story_galleon_night`: Jumble charges

- **Characters:** `ally_knight`, `ally_gunner`, `tutor_droid` (seen from behind), and `npc_jumble`.
- **Scene references:**
  - `scenes/story_galleon.webp`: the ghost galleon. Match it, but it was painted at sunset, and this is night.
  - `scenes/story_albatross.webp`: the airship and the night sky.
  - The stand-in currently at `scenes/story_galleon_night.webp`, for its layout only.
- **Keep all of Jumble on screen.** His whole hat and face sit well inside the 16:9 screen: in the stand-in the screen cut off his hat.
- **The heroes' heads** sit at about the middle height of the picture, above the story box.

```text
Night under a big full moon and stars, cool blue moonlight and eerie sea-green ghost light. We stand on the stern deck of the patched airship from the attached picture, looking out past three heroes seen from behind in the foreground, bracing against the wind: on the left the young silver-haired knight with his crimson scarf and glowing blue crystal shield, in the middle the red-haired sky-pirate captain in her long red coat, on the right the round white tutor droid in its tiny pirate hat. Bursting bow-first out of a glowing green storm cloud and charging straight at them, one second from impact, comes the translucent sea-green ghost galleon from the attached reference, its tattered rune-sails lit from within, chains and spray swirling around its hull. Standing big on its prow, one arm flung forward and pointing at the heroes, laughing, is Captain Jumble from the attached references: the ghost-pirate captain with a flowing green spectral beard, a red coat and a plumed tricorn hat. Dramatic and spooky-fun, never scary.
```

### `story_fall`: the fall at dawn

- **Characters:** `ally_knight`, `tutor_droid`, `ally_gunner`.
- **Scene references:**
  - `scenes/story_crash.webp`: the island from above at dawn, with its canyon, waterfalls and beaches, and the four light trails. The island below must be this island.
  - `scenes/story_albatross.webp`: the airship.
- **Continuity.** The crystal has just shattered: nothing hangs under the airship except its broken, empty cradle, with smoke trailing from the ship. The four pieces are the four streaks of teal light falling toward the island.
- **In the game,** this picture is under Wren's line "Hang on, Albatross! I'm not leaving you!"

```text
The last of the night turning to dawn: deep blue sky above, the first gold of sunrise along the horizon. High above the sea, three heroes fall through the clouds, large in the frame and close to the camera, as if the camera were falling with them. On the left, the young silver-haired knight tumbles head-first, his crimson scarf streaming, his glowing blue crystal shield on his arm, his face determined. In the middle, the round white tutor droid in its tiny pirate hat spins with its fins spread, one fin clamping its hat on. On the right, the red-haired sky-pirate captain reaches up and grabs a rope trailing down from her patched airship high above; the airship trails smoke, and only a broken, empty cradle hangs beneath it. Far below, the jungle island from the attached picture catches the dawn, and four streaks of teal light fall ahead of the heroes toward it. High in the sky, a green ghost ship dissolves into green fog. Thrilling and brave, never scary: nobody looks hurt.
```

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-07.md` in the same format as wave 06. Show each picture, its 16:9 crop with the story box's strip marked, and `story_deck`'s crystal position.
3. Tell the parent which review page to open. Everything stays `draft` until the parent and kids approve it.

## Notes
