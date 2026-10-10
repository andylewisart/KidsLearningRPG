# Wave 05: Polish from the second playthrough

The parent played the whole chapter on the wave 04 art. His art notes:
- **The opening skips the big moment.** The narrator says a ghost galleon rammed the Albatross, but there's no picture of it. Paint the collision (Section A).
- **The title screen is missing Maren.** The key art is great, but the fourth hero isn't in it. She should be summoning the Titan in the background (Section B).
- **Wren looks excited to meet him, and Maren isn't singing.** In the canyon Wren is furious with the monkey who stole her power cell, but the only art the game has for her is her battle stance: blasters drawn, grinning. In the grotto Maren sings to the tide until the party walks up. Both need a few exploring poses (Section C).
- **Tidebreaker's attack is cut off.** Its breath beam stops in a hard straight edge at the side of the picture (Section D).
- **The 3D effect stops short of the horizon.** As he walks, the game slides the floor in perspective, near ground faster than far. At the temple, where everything behind the floor is a wall, it looks right. At the cove, the canyon and the grotto, the open view (the sea, the sky, the far cliffs) slides along with the back of the beach, so it looks like a flat picture. The game needs the distant view as its own picture, so it can move it slower (Section E).

The story is in [`../../docs/world.md`](../../docs/world.md). Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" section.

**Run the whole wave straight through.** There is one review gate, at the end.

**Every asset uses these references unless it says otherwise:** `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style, plus the guide named in the asset's entry. Add the guide sentence from PRODUCTION.md, and QA every result for leftover guide lines, colors or words.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps working without it.

---

## Section A: The ram

A new story card, shown on the narrator's line "A ghost galleon burst out of a cloud and rammed the Albatross."

- **Output:** `scenes/story_ram.webp`, `1536x1024`, Scene block, opaque.
- **References, in this order:** the style anchors, `scenes/story_galleon.webp` and `scenes/story_albatross.webp` (the same two ships: match them exactly), `characters/npc_jumble/base.webp`, then `guides/story_card.png` (keep the subject out of the strips the screen cuts off and above the narration box).
- **Manifest:** `"story_ram": { "kind": "scene", "base": { "src", "w", "h" } }`.

```text
The instant of impact, at night above the Glimmering Sea: the ghostly pirate galleon from the attached reference, translucent sea-green hull and tattered glowing rune-sails, smashes its prow into the side of the sky-pirate airship Brass Albatross from the other reference. A burst of green ghost-sparks, flying splinters and loose brass bolts where the hulls meet; the Albatross tips sideways, its patched balloon buckling. Beneath it, the huge glowing Lore Crystal in its cradle cracks apart into exactly four big teal shards flying off in four directions, trailing light. On the galleon's prow, Captain Jumble from the attached reference cackles with delight, hat brim flapping. Tumbling off the airship's deck, small in the frame: a young knight in silver armor with a crimson scarf, a red-haired sky-pirate captain, and a round white tutor droid whose tiny pirate hat is flying off. Storm clouds and moonlight; green ghost-light against teal crystal light. Thrilling and funny, like a classic adventure-game cutscene; nobody looks hurt, nothing scary.
```

---

## Section B: The title screen with Maren

The key art is the title screen's background, and it already has everything but Maren. **Edit it**; don't paint a new picture.

- **Output:** `scenes/title_art.webp`, `1536x1024`, Scene block, opaque. Leave `anchors/key_art.webp` exactly as it is: it's the style anchor for every other asset.
- **References:** `anchors/key_art.webp` as the image to edit, then `characters/ally_titancaller/base.webp` (Maren: match her exactly) and `titans/titan_starter/base.webp` (Tidebreaker).
- **Manifest:** `"title_art": { "kind": "scene", "base": { "src", "w", "h" } }`.
- **QA:** everything except Maren, her spell and the Titan's response is unchanged: the same framing, characters, airship, monkey and light. The game's menu sits in the middle of the screen, over the lower half of Wren and Knox, so don't put Maren there.

```text
Edit the first image. Keep every character, the airship, the monkey, the light and the framing exactly the same. Add Maren, the Titan Caller from the attached reference, in the middle distance on the right: standing on a sea-stack rock in the surf, between the hooded scholar and the monkey's post but farther back, seen from three-quarters behind as she faces the giant crystal-backed Titan in the background. Her storm-crystal staff is raised high; a spiralling column of sea-spray and glowing teal glyph-light rises from her staff to the Titan. The Titan answers: its eyes blaze teal, water roars from its jaws, and the sea churns at its feet. She is smaller than the heroes in front, clearly part of the scene, dramatic and powerful.
```

---

## Section C: Wren and Maren, exploring

Like the monkey's field sheet: a few poses for when the party meets them on the island. The game picks a pose for each moment of the scene.

- **Outputs:** `characters/ally_gunner/field.webp` and `characters/ally_titancaller/field.webp`, each `1024x1024`, Sprite block, using the **hero battle sheet** template from PRODUCTION.md but with the 2×2 grid and the pose list below.
- **References:** the hero's own `base.webp` and `battle.webp` (match her exactly: same outfit, colors, weapon and **the same size in the cell** as on her battle sheet, so the game can swap between the two), plus `guides/creature_sheet_2x2.png`.
- **Manifest:** `"field": { "src", "cell": [512, 512], "cols": 2, "rows": 2, "frames": { … }, "anchor": [256, 481], "facing": "right" }` on `ally_gunner` and `ally_titancaller`, with the frame names below.
- **QA:** every pose faces the way it says, the feet sit on the same baseline as on the battle sheet, and nothing touches the cell's edges. Run `clean_sheets.py` as usual.

### `ally_gunner` (Captain Wren): frames `angry`, `shout`, `talk`, `pleased`

Her airship has crashed, and the three-eyed monkey has run off with its power cell. She is standing beside the crystal ledge where he sits, yelling up at him.

```text
The same red-haired sky-pirate captain as the attached reference, shown 4 times, facing RIGHT. Top row: (1) angry: both blasters holstered, fists on her hips, scowling and glaring up and to the right; (2) shout: leaning forward, one arm thrust out pointing up and to the right, mouth open mid-yell, the other fist clenched. Bottom row: (3) talk: turned three-quarters toward the viewer, one eyebrow raised, exasperated, one palm turned up as if to say "can you believe this monkey?"; (4) pleased: a cocky grin, spinning one blaster on her finger, the other hand on her hip.
```

### `ally_titancaller` (Maren): frames `sing`, `sing2`, `greet`, `listen`

She stands on the wet sand of the sea cave, singing to the tide, until the party walks up.

```text
The same Titan Caller as the attached reference, shown 4 times. Top row: (1) sing: seen from three-quarters behind, facing away toward the sea, chin raised, one hand lifted palm-up, her staff in the other hand, hair and sea-shell ornaments stirring in a breeze, faint teal motes rising; (2) sing2: the same view, both arms spread wider and her head tipped back, mid-note. Bottom row: (3) greet: turned toward the viewer and to the right, a calm warm smile, staff planted beside her, one hand raised in greeting; (4) listen: facing RIGHT in profile, eyes open, one hand over her heart, listening to the sea.
```

---

## Section D: Tidebreaker's attack, whole

`titans/titan_starter/attack.webp` stops its breath beam with a hard vertical edge at the left side of the picture.

- **Output:** replace `titans/titan_starter/attack.webp` with a `1024x1024` picture, transparent, Sprite block. Keep the old one as `art/review/wave-05/titan_starter_attack_old.webp`.
- **References:** the current `attack.webp`, `base.webp` and `roar.webp` (match the Titan exactly: the same body, size and position against the right and bottom edges as now).
- **Manifest:** update `poses.attack` on `titan_starter`: `w`, `h`, and `anchor` (the point where its body meets the water, as now, measured on the new picture).
- **QA:** the beam bursts into spray and mist that fades out completely before it reaches any edge; no straight cut anywhere.

```text
The same sea Titan as the attached reference, in the same attack pose, on a wider transparent canvas: the Titan in the same place on the right, its jaws open, a roaring beam of glowing sea water bursting from them toward the left, which breaks up into spray, foam and mist and fades away to nothing well before the left edge of the picture. Nothing touches any edge.
```

---

## Section E: The distant view, on its own

For each place with an open view, paint **the same scene with everything near removed**: only the distant view stays, continued across the whole picture. The game compares this picture with the scene to cut the near things out, then moves the distant view slower than the ground as he walks, so the place gets real depth all the way to the horizon.

**Edit the finished scene; don't paint a new picture.** Pass `scenes/explore/<scene>.webp` as the image to edit and say: "Keep every pixel of <the kept parts> exactly the same: same framing, light, colors and details. Remove <the removed parts> and paint the distant view continuing behind where they were." **Any change to the kept parts shows up in the game as a mistake**, so keep them identical.

- **Outputs:** `scenes/explore/<scene>_far.webp`, `1536x1024`, opaque, Scene block, at most 500 KB.
- **Manifest:** add `"far": { "src", "w", "h" }` to the scene's existing entry.
- **QA:**
  - Write `art/review/wave-05/<scene>-far.jpg`: the scene, the far picture and the difference between them, side by side. The difference must show only the removed parts: no speckle, color shift or blur in the sky and sea that stayed.
  - Where the near things were, the continued view looks natural for at least 150 px in from their edges (the game slides the near things aside that far and shows what's behind).
  - Nothing near is left behind: no stray sand, rocks, leaves or object fragments.

| ☐ | Scene | Keep exactly | Remove, and continue the distant view behind |
|---|---|---|---|
| ☐ | `scene_cove` | The sky, clouds and setting sun; the distant cliffs, waterfalls and sea stacks; the open sea and its surf; the rocks in the water; the old shipwreck in the surf. | The whole beach (all the sand, wet and dry); the signpost, sea chest, rest crystal, bottle, and the tide pool with its rocks; the Sage gate with its rocky outcrop and plants on the right; the jungle hillside, palms, plants and sandy path on the left; the palm fronds in the top corners. Continue the sea and surf down to the bottom of the picture, as if looking out over open water. |
| ☐ | `scene_canyon` | The sky and sunset; the clouds and mist; the distant cliffs with their waterfalls and ruins; the floating crystal rocks; the misty depths beyond the chasm. | The cracked stone floor and the crystals and rocks on it; the crashed airship; the crystal ledge; the rest crystal; the lair mound and its cave mouth; the chasm's near edge with the wooden post and the rope; the chasm's far rim where the rope is tied, with its waterfall; the rocks in the bottom corners. Continue the mist, clouds and distant cliffs down to the bottom, as if looking out over the canyon's depths. |
| ☐ | `scene_grotto` | The sky and clouds; the open sea and its waves; the distant sea stacks and ruins, all as seen through the cave mouth. | The entire cave: the rock ceiling, the hanging shells and crystals, the walls, the stairs and rocks on the left, the rocks on the right, the sand floor, the tide pools, the shrine and the rest crystal. Continue the sky, sea and distant sea stacks across the whole picture, as if standing on the shore outside. |

---

## Section F: The ride down to the grotto (added after the gate)

The parent's note after playing: the party zips down the rope on the island map, and the Tide Grotto just opens. He'd like to see them descend. So after the map ride, the game shows this painting full screen for about five seconds, drifting slowly toward the cave while Maren's song (heard faintly since the canyon) grows clearer. Then the grotto opens and they find her singing. It's the quiet moment before they meet her: wonder, not danger. Nobody speaks over it.

Run this section on its own, then add it to the review page (step 2 of the gate) and tell the parent.

- **Output:** `scenes/story_descent.webp`, `1536x1024`, Scene block, opaque.
- **References, in this order:** the style anchors; `scenes/explore/scene_canyon.webp` (the canyon at sunset, the chasm, and the old rope on its wooden post: match them); `scenes/explore/scene_grotto.webp` (the sea cave's mouth, its sand and the open sea: match them); the four travelers, `characters/ally_knight/base.webp`, `characters/ally_gunner/base.webp`, `characters/ally_spellwright/base.webp` and `characters/tutor_droid/base.webp` (match them exactly); then `guides/story_card.png` (keep the travelers and the cave mouth inside the part a 16:9 screen shows; there is no narration box on this card, so the bottom strip may hold sea and rocks).
- **Manifest:** `"story_descent": { "kind": "scene", "base": { "src", "w", "h" } }`.
- **QA:**
  - All four travelers are there and match their references: the knight's silver armor and crimson scarf, the sky-pirate's red hair and coat, the scholar's hood and glowing book, the droid's tiny pirate hat.
  - The rope runs unbroken from the top of the picture down to the cave.
  - It reads as exciting and beautiful, never scary: they ride and hold on; nobody dangles or slips.
  - The game zooms in about 8% toward the cave over five seconds, so keep the travelers and the cave mouth away from the edges.

```text
Sunset over the Crystal Canyon, with the same golden-pink light, mist, waterfalls and crystal outcrops as the attached canyon scene. We look down the length of the old rope from just behind and above the travelers as it plunges from the chasm's edge toward the mouth of a sea cave at the foot of the sea cliffs far below, the same cave as the attached grotto scene, where turquoise waves roll onto pale sand. Four travelers ride down the rope together on one brass rigging pulley, small in the frame and sliding away from us: the young knight in silver armor gripping the pulley's handle with both hands, his crimson scarf streaming behind him; the red-haired sky-pirate captain holding on beside him, one arm flung out in delight; the hooded scholar in deep blue robes holding on with one hand and clutching a glowing spellbook with the other; and the round white tutor droid floating alongside, holding its tiny pirate hat on. Soft teal motes of light drift up from the cave mouth along the rope toward them, like a song you can almost see. Sea spray and mist rise up the cliff face. A breathtaking, peaceful view full of wonder; nothing scary.
```

---

## Section E2: The canyon's distant view, again (added after the gate)

The cove's and the grotto's far pictures work in the game: their sea, sky and sea stacks now slide slower than the ground. The canyon's doesn't yet. Where the chasm's near edge, the wooden post, the rope and the far rim were, the far picture has new cliffs, ruins and waterfalls in much the same colors, so the game can't tell what's near there. As he walked, the rope would come loose from its post. The game keeps the canyon as it was until this lands.

- **Output:** replace `scenes/explore/scene_canyon_far.webp` (`1536x1024`, opaque, at most 500 KB). Keep the current one as `art/review/wave-05/scene_canyon_far_old.webp`.
- **How:** the same as the canyon's row in Section E, with one change. **Over the chasm, in about x 380–850 and y 380–610 of the picture, paint only open mist, clouds and sky: no cliffs, ruins, posts, ropes or waterfalls there.** The distant cliffs and the sky above that stay as they are.
- **QA:** in the side-by-side difference (`art/review/wave-05/scene_canyon-far.jpg`, made again), the post, the rope and both edges of the chasm show bright; the sky and the distant cliffs above stay dark.

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-05.md` in the same format as wave 04:
   - the ram card
   - the title art next to the old key art
   - each field sheet next to the hero's battle sheet
   - the new attack pose next to the old one
   - each far picture's side-by-side from Section E
3. Tell the parent which review page to open. Everything stays `draft` until he and his son approve it.

## Notes

- Section A completed: third ram-card attempt selected. Collision, travelers and four crystal shards fit the visible story band; upper pennant reaches the top cropped strip (flagged). Draft.

- Section B completed: third title edit selected, Maren summoning in the right middle distance. Key-art anchor unchanged. Three edits failed pixel-exact foreground preservation; flagged with measured comparisons for review.

- Section C completed: Wren's first field sheet and Maren's third sheet selected. All eight poses sit at baseline481 with standing heights within the battle-sheet tolerance. Maren's singing mouths are subtle; raw edge artifacts remain recorded. Composited previews confirm full silhouettes without the apparent fringe colors shown by the raw RGBA viewer. Draft.

- Section D completed: second attack edit selected after three attempts. Old attack preserved for comparison. Composited preview confirms spray fading naturally without a straight cut or border contact. Smaller body framing remains flagged. New lower water-contact anchor measured at [748,939]. Draft.

- Section E completed (draft): cove attempt2, canyon attempt1 and grotto attempt2 selected after three edits each. Near parts removed and distant views continued. Every selected far layer fails pixel-exact preservation in retained regions, so these are not ready for clean difference-based extraction. Full scene/far/difference comparisons record the mismatch.

- Final gate: all eight outputs exported, registered and shown in art/review/wave-05.md. Dimensions, budgets, border alpha and manifest checks pass; visual/functional acceptance flags remain. All22 raw generation attempts are copied locally to art/raw/wave-05. Key-art anchor and finished source scenes remain byte-identical; old attack is preserved byte-identically.
