# Wave 04: Painted places, and heroes who face the fight

The parent played through chapter 1. Four of his notes are art:
- **The objects look plopped on top of the backgrounds.** The chest, the gate and the cage were painted on their own (wave 03) and set on top of backgrounds that were painted as battle arenas. This wave paints each place as one picture **with its objects painted in**, in the same light. When an object changes (the chest opens, the gate's light goes out), you paint a copy of the picture with only that change, and a script cuts the change out as a small patch. So every state is made of the painting's own pixels.
- **He wanted to go inside the temple, and to meet Wren and Maren in different places.** Two new places: the Hall of Glyphs inside the temple, where Knox is caged, and the Tide Grotto, a sea cave where Maren keeps her shrine.
- **In battle, the heroes look away from the fiends.** The battle sheets face left, but in the idle and victory poses several heroes turn their heads to the right, away from the enemy. Repaint the four hero battle sheets so every pose looks at the foe.
- **He wants to travel the island on a map,** like a classic pirate adventure game: a painted map of Driftwood Isle where he clicks a place to go there. Some places are only worth visiting once he has found something elsewhere, and places for later chapters show on the map as teasers. Paint the map (Section E).

The story is in [`../../docs/world.md`](../../docs/world.md) (the Driftwood Isle section has the new places). Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" section and the new "Painted exploration scenes" section.

**Run the whole wave straight through.** There is one review gate, at the end.

**Every asset uses these references unless it says otherwise:** `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style, plus the guide named in the asset's entry. Add the guide sentence from PRODUCTION.md, and QA every result for leftover guide lines, colors or words.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps using the wave 03 art until these land.

---

## Section A: Painted exploration scenes

He walks the party around each place, clicks things to look at them, and uses them. Each place is **one painting with its objects painted in**, like a classic point-and-click adventure game.

**How the game shows a scene** (so you know what matters):
- The painting is scaled up and seen through a 16:9 window that **pans left and right** as he walks. It never moves up or down: the top and bottom strips marked on the guide are never on screen.
- Characters are drawn **on top of** the painting. So nothing painted can ever stand in front of a character. That's why tall objects stand at the **back** of the ground he walks on, and the game keeps him from walking behind the low ones.
- The game adds the characters, the glow on the rest crystal and the words on the signpost. **Don't paint people, creatures, or any text.**

**Specs for every scene:**
- **Output:** `public/assets/scenes/explore/<id>.webp`, `1536x1024`, opaque, Scene block, at most 500 KB.
- **References, in this order:**
  1. the style anchors
  2. the place's battle background, if it has one (the "Same place as" column): match its landmarks, light direction, time of day and palette
  3. the wave 03 props named in the scene's table, so each painted object matches the one he already knows
  4. `guides/explore_<name>.png`, for where everything goes
- **Add this to every scene prompt:** "A wide exploration scene for a 2D adventure game, seen from standing eye height, like a beautifully painted point-and-click adventure background. The ground the party walks on fills the lower part of the picture, open and walkable. Every object listed stands exactly where the attached layout guide marks it, at the size the guide's figures show, with its base resting on the ground and a soft contact shadow, lit by the same light as everything around it, so it clearly belongs in this place. Tall objects stand at the back edge of the ground. No people or creatures. No text."
- **The rest crystal,** in every scene: "a waist-high, softly glowing teal crystal growing from a small carved stone base, with a little pool of teal light on the ground around it". Paint it the same way in every place.
- **Manifest:**
  - `"<id>": { "kind": "explore", "base": { "src", "w", "h" }, "battle": "<the arena id>", "objects": { … }, "states": { … } }`
  - **objects:** start from the boxes in `art/guides/explore-layouts.json`, then correct each one to where the object actually is in your painting: `"chest": { "box": [x0, y0, x1, y1], "ground": [x, y] }` in painting pixels, the box hugging the object and the ground point where its base meets the ground. Include the backdrop things and the rest crystal, but not the "keep" spots.
  - **The signpost** also gets `"boards"`: one entry per blank board, `{ "center": [x, y], "width": w, "height": h, "tilt": degrees }`. Measure the flat, clear wood the game can write on, and use a positive tilt when the board rises to the right.
  - **states:** for each state in the scene's table, `"<state>": { "object": "<object id>" }`. The script in Section B fills in the rest.
- **QA:**
  - Every object sits within about 40 px of its guide box, at a matching size.
  - The "keep clear" spots and the walkable ground are open: no rocks, logs or puddles bigger than a shoe, except the listed objects.
  - Nothing stands in front of the walkable ground's back edge except the listed objects.
  - No people, creatures, text, guide lines or guide colors.

| ☐ | Scene | Guide | Same place as | Wave 03 props to match | States |
|---|---|---|---|---|---|
| ☑ | `scene_cove` | `explore_cove.png` | `bg_shipwreck_cove` | `prop_chest`, `prop_signpost`, `prop_tide_pool`, `prop_bottle`, `prop_sage_gate` | `chest_open`, `bottle_gone`, `fish_gone`, `gate_open` |
| ☑ | `scene_temple` | `explore_temple.png` | `bg_jungle_ruins` | `prop_glyph_wall`, `prop_stone_frog`, `prop_pillar` | `door_open` |
| ☑ | `scene_temple_hall` | `explore_temple_hall.png` | none: a new place, so this painting sets its look | `prop_word_cage`, plus `characters/ally_spellwright/base.webp` | `cage_open` |
| ☑ | `scene_canyon` | `explore_canyon.png` | `bg_crystal_canyon` | `prop_airship_wreck`, `prop_crystal_ledge`, `prop_lair` | none |
| ☑ | `scene_grotto` | `explore_grotto.png` | none: a new place, so this painting sets its look | `prop_shrine` | `shrine_awake` |

### `scene_cove`: Shipwreck Cove

```text
Shipwreck Cove at golden hour: a wide white-sand beach on a tropical island, turquoise surf rolling in behind it. Along the shore in the background lies the huge, ancient hulk of a wooden shipwreck crusted with glowing blue crystals, the landmark of this place. Sea stacks and waterfall cliffs in the far distance. Painted into the scene where the guide marks them: on the left, a barnacle-crusted wooden sea chest with brass corners and a big round brass combination dial on its front, closed tight, half-sunk in the sand with a strand of seaweed over the lid; near the middle, a weathered driftwood signpost with two completely BLANK wooden arrow boards, one pointing left and one pointing right, a frayed rope wound around the post; in the sand toward the front, a green glass bottle lying half-buried with a rolled note inside; toward the front right, a small rocky tide pool lying flat in the sand, clear turquoise water ringed with barnacled rocks, with a bright orange rubber squeaky-toy fish bobbing in it and a small crab watching it suspiciously; at the right, an ancient vine-covered sandstone archway set into the cliff, every stone carved with softly glowing teal glyphs, its opening sealed by a shimmering curtain of teal light with a large glowing glyph-lock in its center; near the back on the left, the rest crystal. At the far left edge, a sandy path leads off into the jungle.
```

| State | The change (and nothing else) |
|---|---|
| `chest_open` | The chest's lid is thrown open; it's empty except a little sand, and a soft teal glow rises from inside. |
| `bottle_gone` | The bottle is gone, leaving a small dent in the sand. |
| `fish_gone` | The orange rubber fish is gone from the tide pool; the crab is still there, looking relieved. |
| `gate_open` | The curtain of light and the glyph-lock are gone; the glyphs glow calmly, and through the arch a sunlit path leads on. |

### `scene_temple`: The Temple Ruins

```text
The courtyard of a Sage temple swallowed by jungle, in warm afternoon light: cracked, mossy flagstones; giant ferns, red jungle flowers and hanging vines; the sea glimpsed through ruins at the right. Across the back stands the temple's grand carved sandstone facade, and in its middle-left is a great doorway sealed by a huge round stone door carved with rings of softly glowing teal glyphs and a ring of number dials. Painted into the scene where the guide marks them: on the left, a broken wall section covered in rows of glowing glyphs, ferns at its base and a crack running through it; at the right, a tall, cracked sandstone pillar wrapped in vines, with a flat broken top big enough for a monkey to sit on; in front of it, a mossy stone statue of a fat, wide-grinning, slightly smug frog on a little plinth, its round nose polished like a button; at the back on the left, the rest crystal. At the far right edge, a path leads back toward the beach.
```

| State | The change |
|---|---|
| `door_open` | The round stone door has rolled aside into the wall. The doorway is open onto a dim hall with warm torchlight and drifting glyph-motes inside. |

### `scene_temple_hall`: The Hall of Glyphs (inside the temple)

```text
Inside the Sage temple: a vast, dim hall of carved sandstone pillars, with shafts of golden light falling from cracks in the high ceiling and dust and glyph-motes drifting in the beams. The walls are covered in softly glowing teal glyphs. Painted into the scene where the guide marks them: on the left, tall shelves of carved stone tablets, an ancient library, a few tablets toppled on the floor; on the right, a huge glowing wall mural of glyphs and wise robed scholars; in the middle, on a low round stone dais, a tall ornate magical cage like a giant birdcage made of glowing violet energy bars, each bar a twisting ribbon of scrambled rune-glyphs, with a heavy rune-padlock. Inside the cage sits the tiny hooded scholar from the attached ally_spellwright reference, arms crossed and very annoyed: small, in a deep-indigo hooded robe, his face hidden in shadow except two glowing golden eyes, his spellbook floating beside him. Near the back on the left, the rest crystal. At the far left edge, the doorway back outside, bright with daylight.
```

| State | The change |
|---|---|
| `cage_open` | The cage has burst open: its bars are broken and dissolving into drifting violet glyph-motes, the padlock lies on the dais, and the cage is **empty** (the scholar is gone; the game shows him walking with the party). |

### `scene_canyon`: The Crystal Canyon

```text
The floor of the Crystal Canyon at dusk: cracked, glittering grey stone between towering cliffs studded with giant violet and blue crystals; waterfalls, ruined stone bridges and mist in the distance. Painted into the scene where the guide marks them: on the left, the crashed sky-pirate airship from the attached reference, lying broken on its side, its patched balloon slumped over it, its crystal engine sputtering teal sparks; at the back, between the airship and the middle, a narrow cliff path that ends at the edge of a deep, misty chasm: a crooked old wooden post stands at the near edge with a single frayed rope line tied to it, stretched taut across the chasm to the far side, where the path carries on and winds down out of sight toward a glimpse of turquoise sea; in the middle, a cluster of large violet-and-blue crystals growing out of a rock to form a flat-topped ledge about as tall as a person; at the right, the mouth of a huge cave in a crystal mound, rimmed with jagged violet crystals like teeth, half-chewed crystal crumbs at its entrance and a deep violet glow inside (ominous but kid-safe: no eyes, no bones); between the ledge and the cave, the rest crystal. At the far left edge, the way back toward the beach.
```

No states: the party crosses the chasm by zipping along the rope (the game animates it). In `objects.chasm`, also record `"rope": [[x, y], [x, y]]`, the rope's two ends (at the post, and where it disappears on the far side) in painting pixels.

### `scene_grotto`: The Tide Grotto

```text
A sea cave glowing turquoise, below the cliffs: a floor of pale wet sand and smooth stone; the cave's wide mouth at the back opens onto the bright sea, with gentle waves washing in; a shaft of sunlight falls through a hole in the cave roof; rippling turquoise reflections dance across the rock walls; strings of shells hang from the rock. Painted into the scene where the guide marks them: toward the front left, a group of shallow tide pools lying flat in the sand, glowing with coral and anemones; at the center-right, a sacred sea shrine: a tall teal-white crystal growing from a carved stone pedestal shaped like a curling wave, with a shallow stone basin of seawater in front of it and seashell offerings on its steps. The shrine is asleep: its crystal is dim and dull, the basin dark. At the back on the left, the rest crystal. At the far left edge, a path climbs back up toward the canyon.
```

| State | The change |
|---|---|
| `shrine_awake` | The shrine has woken: its crystal blazes with teal-white light, the basin glows, and swirls of light-motes ripple across the cave walls around it. |

---

## Section B: State patches

Each state is the scene's painting with **one** thing changed.

1. **Paint the variant by editing the finished scene,** not by painting a new picture: pass the scene as the image to edit, and say "Change only the <object>: <the change>. Keep every other pixel of the picture exactly the same: same framing, light, colors and details." If your tool takes a mask, mask the object's box from `objects` (plus a little margin) and use it.
2. Save it at `art/scenes/<scene id>/<state>.webp`, `1536x1024`, the same size as the scene. These full variants are only for the script, so they stay out of `public/`.
3. When a scene's variants are all done, run:

   ```
   python3 tools/art/scene_patches.py <scene id>
   ```

   It cuts each change out as `public/assets/scenes/explore/<scene id>__<state>.webp`, fills in `states.<state>` in the manifest (`src`, `x`, `y`, `w`, `h`), and writes a before/after picture to `art/review/wave-04/`. It needs Pillow and numpy (`pip install pillow numpy`).
4. **QA:**
   - Look at each before/after picture: only the object changed, and there is no visible box, seam or color step around the patch.
   - If the script prints "the change runs into the edge of the object's area", the variant moved more than the object. Paint it again (at most 3 attempts), then flag it.

---

## Section C: Battle arenas for the new places

Fights in the new places need their own arenas.

- **Output:** `public/assets/backgrounds/battle/<id>.webp`, `1536x1024`, Scene block, plus its foreground layer `<id>_fg.webp` (transparent).
- **References:** the style anchors, `guides/battle_stage.png` for the arena and `guides/battle_foreground.png` for the foreground, plus the place's exploration scene from Section A (the same place, so match it).
- **The foreground** follows the rule in PRODUCTION.md's guide table: every piece runs off the image's edge, and is cut out along its own outline.
- **Manifest:** `"<id>": { "kind": "background", "base": { "src", "w", "h" }, "fg": { "src", "w", "h" } }`, plus `floorEdge` if the floor's back edge isn't on the guide's orange line.

| ☐ | Asset | The arena | Its foreground |
|---|---|---|---|
| ☐ | `bg_temple_hall` | A battle arena inside a vast, dim temple hall: carved sandstone floor tiles, pillars, shafts of golden light from the ceiling, walls of glowing teal glyphs, toppled stone tablets. Mysterious and magical. | The edges of two great carved pillars on the far left and far right, running off the top and bottom, and hanging vines in the top corners, softly out of focus. |
| ☐ | `bg_tide_grotto` | A battle arena in a turquoise sea cave: wet sand and smooth stone floor, glowing tide pools at the edges, the cave mouth opening onto the bright sea at the back, a shaft of sunlight, reflections dancing on the walls. | Dripping rock and hanging shells in the top corners, and dark rock with glowing coral in the bottom corners, running off the edges, softly out of focus. |

---

## Section D: Hero battle sheets that face the fight

In battle the heroes stand on the right and the fiends on the left. The sheets face left, but in some poses the heroes turn their heads to the right, away from the fiends (look at Maren's and Wren's idle and victory poses). And the knocked-out poses lie high in their cells, so a downed hero floats in the air.

- **Outputs:** replace `characters/<id>/battle.webp` for `ally_knight`, `ally_gunner`, `ally_spellwright` and `ally_titancaller`. Same grid, size and manifest entry as before (`1536x1024`, 3 × 2, 512 px cells, `anchor` [256, 481], `facing` "left"). Keep the old sheet as `art/review/wave-04/<id>_battle_old.webp` for the review.
- **References:** the hero's `base.webp`, their current `battle.webp` (match the character exactly: same outfit, colors, weapon and size in the cell), plus `guides/hero_battle_sheet.png`.
- **Add this to the hero battle sheet template:** "In EVERY pose the hero faces LEFT, toward an enemy off to the left: body turned left, head turned left, eyes on the enemy, never looking at the viewer or to the right. The knocked-out pose lies flat on the ground at the bottom of its cell, on the same baseline as the feet in the other poses."
- **QA:** every pose looks left, the KO pose's lowest point is on the baseline, and the standing poses are the same size as on the old sheet (the game lines them up by it). Run `clean_sheets.py` as usual.

| ☐ | Asset | Pose notes (add to the template) |
|---|---|---|
| ☐ | `ally_knight` | Idle: tower shield raised on his left arm, greatsword ready, eyes narrowed at the foe. Victory: sword raised high, grinning at the defeated enemy on the left. |
| ☐ | `ally_gunner` | Idle: both blasters aimed left, a cocky grin. Victory: blowing smoke off one blaster, smirking at the enemy on the left. |
| ☐ | `ally_spellwright` | Idle: spellbook open toward the left, rune-letters swirling at the foe. Victory: a smug little bow toward the left. |
| ☐ | `ally_titancaller` | Idle: storm-crystal staff angled toward the left, calm and focused on the foe. Victory: staff raised, sea-spray swirling, looking left. |

---

## Section E: The island map

He travels between places on a map: walking off the edge of a scene opens it, and he clicks where to go next. A tiny version of the party walks along the trails, and each place opens its scene. Places for later chapters are on the map too, as teasers he can see but not visit yet.

The game draws the place names, the red X marks, the dotted trail lines and the little walking party. So **the painting has no text, marks or lines of any kind**: only the island, its landmarks and the trails themselves.

| ☐ | Asset | Size | Guide |
|---|---|---|---|
| ☐ | `map_driftwood` | `1536x1024`, opaque, Scene block | `guides/map_island.png` |

- **Output:** `public/assets/scenes/map/map_driftwood.webp`, at most 500 KB.
- **References:** the style anchors, `guides/map_island.png`, plus `scenes/story_crash.webp` (the island seen from above in the prologue: match its look) and the five exploration scenes from Section A, so each landmark matches its place.
- **Manifest:**
  - `"map_driftwood": { "kind": "map", "base": { "src", "w", "h" }, "places": { … }, "trails": { … } }`
  - **places:** the center of each landmark in painting pixels, for every place on the guide: `"cove": [x, y]`, and the same for `temple`, `canyon`, `grotto`, `harbor`, `volcano`, `monkeyhead`, `observatory` and `watchtower`.
  - **trails:** for each trail on the guide, 5 to 10 points along the painted trail, from one place to the other: `"cove-temple": [[x, y], …]`, and the same for `cove-canyon`, `canyon-grotto`, `cove-harbor` and `temple-volcano`. The little party walks along these points.
- **QA:** every landmark sits within about 60 px of its circle on the guide, and every trail is visible on the painting. Nothing important sits in the dark strips or under the covered corners. No text, letters, X marks or dotted lines anywhere.

```text
A painted map of Driftwood Isle, seen from high above at a slight angle, as if from a sky-pirate airship: a lush tropical island in a glittering turquoise sea, painted in rich detail like a beautiful adventure-game island map. White beaches, emerald jungle, cliffs, waterfalls and a canyon of giant glowing crystals. Its landmarks, each where the attached guide marks it, small but clear and easy to tell apart: on the south coast, Shipwreck Cove, a white-sand bay with the hulk of a huge old shipwreck; in the western jungle, an ancient sandstone temple half-swallowed by trees; in the east, the Crystal Canyon, a gash of giant violet and blue crystals with a thin trail of smoke rising from a crashed airship; on the eastern cliffs above the sea, the dark mouth of a sea cave glowing turquoise; on the north coast, a little pirate port built from old ships, with a lighthouse topped by a glowing crystal; in the north-west, a smoking volcano; on a north-eastern headland, a giant stone head of a three-eyed monkey carved into the cliff, wearing a stone pirate hat; on a sea stack off the south-west coast, an old domed observatory tower; on the far eastern cape, a sinister mechanical watchtower with a red searchlight. Visible trails link the places: a jungle trail from the cove to the temple, a pass through a stone archway in the cliffs from the cove to the canyon, a cliff path from the canyon down to the sea cave, a coast road from the cove north to the port, and a mountain trail from the temple up the volcano. Far out at sea, a tiny ghostly galleon with green sails. Small details to find: seabirds, a whale spout, a turtle on a beach. No text, no labels, no X marks, no dotted lines, no compass letters.
```

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-04.md` in the same format as wave 03:
   - each scene, then the same scene with its guide laid over it at 35% opacity, so the review shows the objects landed in their spots
   - each state's before/after picture from `art/review/wave-04/`
   - each arena with its foreground composited over it
   - each new battle sheet next to the old one
   - the map, then the map with its guide laid over it at 35% opacity
3. Tell the parent which review page to open. Everything stays `draft` until he and his son approve it.

## Notes

- Section A completed 2026-10-09: five paintings exported with measured object boxes, sign boards and rope ends. All retain guide-layout deviations after three attempts; see wave-04 review overlays and QA. Everything draft.

- Section B completed: seven full-scene state edits and extracted patches; before/after comparisons reviewed. Shrine retry2 selected after retry1 changed the rest crystal. Chest patch uses a per-state 60% margin so its raised lid is not clipped; click box still measures the closed chest.
