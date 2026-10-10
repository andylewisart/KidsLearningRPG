# Wave 06: The end of chapter 1, and pictures for videos

The parent makes short videos for the game with an image-to-video tool. Each clip is at most 15 seconds and starts from one picture (its first frame). To keep the cast on-model, the tool also takes a few reference pictures of each character: a plain front view and side profiles. The game plays three clips when the Geode Titan falls and chapter 1 ends:

1. **The crystal remade:** in the Geode Titan's cave, the four shards rise, spin together into the Lore Crystal, and a wave of light washes over the island. *(new first frame, Section B)*
2. **Driftwood Harbor:** the party on the cliff above the harbor at sunset, the lighthouse crystal flickering (it is dying, which is why they must go there next), and Pockets snatching Kit's hat and running off toward the town. *(first frame: the existing `scenes/story_ending.webp`)*
3. **Jumble's next move:** night, his ghost galleon sliding out of the fog toward the harbor, scrambled letters streaming off his fingers. *(new first frame, Section B)*

Without the videos, the game shows the first frames as still pictures, so every picture here is also a game asset or a reference, never a throwaway.

The story is in [`../../docs/world.md`](../../docs/world.md). Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" section.

**Run the whole wave straight through.** There is one review gate, at the end.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps working without it.

---

## Section A: Character references for the video tool

Three pictures per character: a **front view**, a **left profile** and a **right profile**. They are not game assets: the parent uploads them to the video tool, which needs them clean and simple to keep each character the same from clip to clip.

- **Outputs:** `art/video-refs/<id>/front.jpg`, `art/video-refs/<id>/left.jpg` and `art/video-refs/<id>/right.jpg`, each `1024x1536` (portrait), JPEG quality 90, at most 700 KB.
- **Characters** (`<id>`: who, and the references to pass):

| ☐ | `<id>` | Who | References |
|---|---|---|---|
| ☐ | `ally_knight` | Cade, the young Crystal Knight | `characters/ally_knight/base.webp`, `battle.webp` |
| ☐ | `ally_gunner` | Captain Wren, the red-haired sky-pirate | `characters/ally_gunner/base.webp`, `battle.webp`, `field.webp` |
| ☐ | `ally_spellwright` | Knox, the tiny hooded scholar | `characters/ally_spellwright/base.webp`, `battle.webp` |
| ☐ | `ally_titancaller` | Maren, the Titan Caller | `characters/ally_titancaller/base.webp`, `battle.webp`, `field.webp` |
| ☐ | `tutor_droid` | Kit, the round white tutor droid in a tiny pirate hat | `characters/tutor_droid/base.webp`, `portraits.webp` |
| ☐ | `mascot_monkey` | Pockets, the three-eyed monkey | `characters/mascot_monkey/base.webp`, `field.webp` |
| ☐ | `npc_jumble` | Captain Jumble, the ghost-pirate sorcerer | `characters/npc_jumble/base.webp`, `portraits.webp` |

- **References, in this order:** `anchors/cast_lineup.webp`, then the character's own pictures above (match them exactly: outfit, colors, proportions, hair, face, gear). Generate the front view first, then pass it as an extra reference for both profiles, so all three match each other.
- **QA:**
  - The whole body shows, head to feet (or the whole droid), with a margin all around, centered, at the same size in all three views.
  - A plain flat light-gray background (about `#e4e6ea`), even soft light, only a faint shadow under the feet. Nothing else in the picture: no scenery, no text, no other characters, no frame or border.
  - The profiles really are profiles: the body turned 90 degrees, facing the left or the right edge of the picture.
  - Their own gear and nothing else: Cade's crystal sword and shield, Wren's two blasters (holstered), Knox's spellbook, Maren's staff, Kit's pirate hat, Jumble's hat and coat.
  - Kid-friendly, neutral expression (a slight smile is fine), relaxed standing pose with the arms a little away from the body.
- Write `art/review/wave-06/<id>-refs.jpg` for each: the three views side by side.

Prompts (replace `<who>` with the character's description from the table):

```text
front.jpg — Character reference for animation: <who>, the same character as the attached reference images, exactly: same outfit, colors, proportions, hair and gear. Full body from head to feet, standing in a relaxed neutral pose with the arms slightly away from the body, facing the viewer and looking at the viewer. Plain flat light gray background, soft even studio lighting, a faint shadow under the feet only. No scenery, no text, no other characters.
```

```text
left.jpg — The same character as the attached front view, exactly, now in a full side profile facing the LEFT edge of the picture: body turned 90 degrees, full body from head to feet, relaxed neutral standing pose, same size and position as the front view. Plain flat light gray background, soft even studio lighting, a faint shadow under the feet only. No scenery, no text, no other characters.
```

```text
right.jpg — The same character as the attached front view, exactly, now in a full side profile facing the RIGHT edge of the picture: body turned 90 degrees, full body from head to feet, relaxed neutral standing pose, same size and position as the front view. Plain flat light gray background, soft even studio lighting, a faint shadow under the feet only. No scenery, no text, no other characters.
```

---

## Section B: First frames for the ending videos

Two new pictures. Each is the first frame of a clip, and the game shows it as a still when the clip isn't there yet. The video tool animates **from** the picture, so paint the moment just **before** the action, and leave room for it (noted per picture).

- **Outputs:** `scenes/story_crystal_remade.webp` and `scenes/story_jumble_next.webp`, each `1536x1024`, opaque, Scene block. Also a JPEG copy of each (quality 92) in `art/video-refs/frames/`, plus a JPEG copy of the existing `scenes/story_ending.webp` there (the second clip's first frame), so the parent can upload all three.
- **References:** the style anchors, the characters' own pictures (as in Section A), the scene references listed with each prompt, then `guides/story_card.png` (keep the action inside the part a 16:9 screen shows; there is no narration box over these pictures, but the bottom strip may get one later, so keep faces out of it).
- **Manifest:** `"story_crystal_remade"` and `"story_jumble_next"`, each `{ "kind": "scene", "base": { "src", "w", "h" } }`.
- **QA:** every character matches their references; nobody looks hurt or scared; the room for the coming action is there.

### `story_crystal_remade`: the crystal remade

Scene references: `bosses/boss_geode_titan/base.webp` (the crystals of its lair: purple, with teal light) and `scenes/explore/scene_canyon.webp` (the canyon's light at sunset). **Room for the action:** the top third stays open above the shards (in the clip they fuse into one tall crystal that rises there).

```text
Inside the Geode Titan's crystal cave, just after the battle, calm and hopeful. The five heroes from the attached references stand in a loose half circle, small to medium in the frame, all looking up in wonder: the young knight in silver armor with his crimson scarf, the red-haired sky-pirate captain, the tiny hooded scholar holding his glowing spellbook, the Titan Caller with her storm-crystal staff, and the round white tutor droid in its tiny pirate hat floating among them. Between them, at head height, four glowing teal crystal shards float in the air, beginning to drift toward each other, trailing threads of light. Giant purple crystals line the cave walls; dust and sparkles drift in a shaft of warm sunset light from a crack in the cave roof. The space above the shards is open and glowing softly. Triumphant, peaceful, full of wonder.
```

### `story_jumble_next`: Jumble's next move

Scene references: `scenes/story_galleon.webp` (the ghost galleon: match it), `characters/npc_jumble/base.webp` (match him), and `scenes/story_ending.webp` (the harbor town and its lighthouse: match them). **Room for the action:** clear sky and sea between the galleon and the harbor (in the clip, glowing letters stream across it toward the town).

```text
Night at sea outside a pirate harbor town built from old ships, the same town and lighthouse as the attached picture, seen from the water. On the left, the translucent sea-green ghost galleon from the attached reference glides out of a bank of glowing green fog, its tattered rune-sails lit from within. On its prow stands Captain Jumble from the attached reference, grinning mischievously, one hand raised with a few glowing green letters starting to swirl off his fingertips. On the right, far across the dark water, the harbor's lanterns twinkle and the crystal atop the lighthouse flickers weakly, dim and blue. Moonlight on the waves, green ghost-light against the warm harbor lights. Spooky-fun and mischievous, never scary.
```

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-06.md` in the same format as wave 05: each character's three views side by side, and the two new first frames.
3. Tell the parent which review page to open, and that the video references and frames are in `art/video-refs/`. Everything stays `draft` until he and his kids approve it.

## Notes
