# Wave 03: Exploring Driftwood Isle

The game is becoming an open-world adventure. He walks the Knight around Driftwood Isle, finds things, talks to people and gets ambushed by fiends, like a classic comedic pirate adventure game with turn-based battles. This wave paints what that needs:
- the characters of the story
- walk cycles
- the objects he can look at, open and pick up
- item and interface icons
- illustrated cards for the opening and the ending

The story is in [`../../docs/world.md`](../../docs/world.md), so read its Driftwood Isle section before you start.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" section.

**Run the whole wave straight through.** There is one review gate, at the end.

**Every asset uses these references unless it says otherwise:**
- `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style.
- The guide named in the asset's entry, from `art/guides/`. Add the guide sentence from PRODUCTION.md, and QA every result for leftover guide lines, colors or words.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. Until it lands, the game draws simple stand-ins for every object here, so nothing is blocked.

---

## Section A: The story's characters

### ☑ `npc_jumble` (Captain Jumble): base image

**Who he is:**
- Captain Jumble is the villain of the whole game: a ghost-pirate sorcerer.
- Three hundred years ago he failed the Sage exam by one spelling word. He has been scrambling signs and numbers across the isles ever since.
- He is loud, vain, theatrical and secretly insecure. He loves anagrams.
- He should be funny and a little spooky, never frightening. Think of a grand stage villain who trips over his own cape.

**Specs:**
- **Output:** `characters/npc_jumble/base.webp`. Generate at `1024x1536`, Sprite block, then trim like the other bases.
- **Candidates:** generate 2 and keep the better one.
- **Manifest:** `"npc_jumble": { "kind": "npc", "base": { …, "anchor": […] } }`.

```text
Captain Jumble, a ghost-pirate sorcerer, full body, striking a grand theatrical pose with one gloved hand flung up dramatically and a smug grin. His whole body is a translucent, softly glowing sea-green ghost, and his legs fade into a curl of mist instead of feet. He wears an enormous battered purple tricorn hat with a crooked, oversized white plume, a long tattered crimson-and-gold captain's coat embroidered all over with jumbled, glowing magical rune-glyphs that look like letters thrown in a blender, a ruffled collar, and far too many rings. He has a huge curled mustache, bushy eyebrows and a sharp pointed beard. He holds a rolled-up scroll that he uses as a spyglass. Vain, comedic and a little spooky, never scary. Lit from the upper left with a soft rim light.
```

### ☑ `npc_jumble`: expression sheet

- **Output:** `characters/npc_jumble/portraits.webp`, `1536x1024`. Use the Sprite block and the **expression sheet** template.
- **References:** the finished `npc_jumble` base (match it exactly), plus `guides/expression_sheet.png`.
- **Manifest:** `"portraits": { …, "frames": { "neutral": 0, "laughing": 1, "angry": 2, "shocked": 3, "smug": 4, "worried": 5 } }`, the same as the heroes.
- **Asset prompt:** "Captain Jumble from the attached reference: the same translucent sea-green ghost face, huge plumed purple tricorn hat, curled mustache and pointed beard. Big theatrical stage-villain acting: (2) a head-thrown-back villain laugh, (3) furious and puffed up, (4) jaw dropped with the hat jumping off his head, (5) twirling his mustache, (6) sweating and nervous."

### ☑ `mascot_monkey`: field sheet

The three-eyed monkey is the island's running joke:
- He steals shiny things.
- He loves squeaky things.
- He turns up in every scene.

In the story he steals the Gunner's power cell, and gives it back in trade for a squeaky rubber fish.

- **Output:** `characters/mascot_monkey/field.webp`, `1024x1024`. Use the Sprite block and the **fiend battle sheet** template, but replace the template's pose list with the one below.
- **References:** `characters/mascot_monkey/base.webp` (match it exactly: three eyes, tiny captain's hat), plus `guides/creature_sheet_2x2.png`.
- **Manifest:** `"field": { "src": …, "cell": [512, 512], "cols": 2, "rows": 2, "frames": { "idle": 0, "hold": 1, "raspberry": 2, "run": 3 }, "facing": "right" }` on `mascot_monkey`.

```text
The same three-eyed monkey in a tiny captain's hat as the attached reference, shown 4 times, facing RIGHT. Top row: (1) sitting and grinning mischievously, tail curled; (2) hugging a glowing brass power-cell canister to his chest like a treasure, eyes gleaming. Bottom row: (3) blowing a cheeky raspberry with his tongue out and all three eyes squeezed shut; (4) scampering away on all fours in delight, squeezing a bright orange rubber squeaky-toy fish.
```

---

## Section B: Walk cycles

He walks the party around the island, so each hero needs a walk cycle.

- **Outputs:** `characters/<id>/walk.webp` for `ally_knight`, `ally_gunner`, `ally_spellwright` and `ally_titancaller`. Each is `1536x1024`, Sprite block, using the **walk cycle** template from PRODUCTION.md (8 frames, 384×512 cells, walking right).
- **References:** the hero's own `base.webp` and `battle.webp` (match them exactly), plus `guides/walk_cycle.png`.
- **Manifest:** `"walk": { "src": …, "cell": [384, 512], "cols": 4, "rows": 2, "frames": 8, "fps": 10, "anchor": [192, 481], "facing": "right" }` on each hero.
- **QA:** the eight frames must read as one smooth loop: the same size and baseline, legs alternating, and no frame facing the wrong way. Flag any sheet where a frame pops.

| ☐ | Asset | How they walk (add to the template) |
|---|---|---|
| ☑ | `ally_knight` | A confident, upright march, greatsword resting on his right shoulder, shield on his left arm, crimson scarf trailing behind. |
| ☑ | `ally_gunner` | A cocky, bouncy swagger, one blaster twirling in her brass hand, braid swinging. |
| ☑ | `ally_spellwright` | Small, quick shuffling steps under the long hooded robe, the spellbook floating along at shoulder height, rune-letters orbiting. |
| ☑ | `ally_titancaller` | A calm, graceful glide, staff planted with every other step, long wave-patterned sleeves flowing. |

---

## Section C: Things on Driftwood Isle

These are the objects he looks at, opens, picks up and talks around. Each one is a single isolated object.

**Specs for every object:**
- Generate at the listed size with the Sprite block. Process it like a single image: trim it, add the 4% margin, and record `anchor` at the center of its base, where it touches the ground.
- **Output:** `props/<id>.webp`.
- **Manifest:** `"<id>": { "kind": "prop", "base": { "src", "w", "h", "anchor" } }`.

**References for every object:**
- `guides/prop_view.png`, for the camera angle and to keep the base flat on the ground.
- The background of the place it belongs to, for lighting and palette only. Never copy its scenery.

**Add this to every object prompt:** "Seen from a slightly raised three-quarter front view, as if from a person's standing eye height a few steps away. Lit like the attached background: same sun direction, color and warmth. Only the object, standing on nothing: no ground patch, no scenery, no cast shadow."

### Shipwreck Cove (light reference: `backgrounds/battle/bg_shipwreck_cove.webp`)

| ☐ | Asset | Size | The object |
|---|---|---|---|
| ☑ | `prop_signpost` | `1024x1536` | A weathered driftwood signpost with two blank wooden arrow-boards, one pointing left and one pointing right, a frayed rope wound around the post, barnacles at its foot and a seagull feather stuck in a crack. The boards are completely blank: the game writes on them. |
| ☑ | `prop_chest` | `1024x1024` | A barnacle-crusted wooden sea chest with brass corners, closed tight, with a big round brass combination dial on the front (notches only, no numbers) and a strand of seaweed draped over the lid. |
| ☑ | `prop_chest_open` | `1024x1024` | The same chest as `prop_chest` (pass it as a reference and match it exactly), lid thrown open, empty except a little sand and a soft teal glow rising from inside. |
| ☑ | `prop_tide_pool` | `1536x1024` | A small rocky tide pool lying flat on the ground: clear turquoise water in a ring of barnacled dark rocks, a red starfish, a small crab peeking out with a judgmental look. Wide and low, seen mostly from above at the guide's flat angle. |
| ☑ | `prop_bottle` | `1024x1024` | A green glass bottle lying on its side, half-buried in a little mound of sand, corked, with a rolled parchment note visible inside. |
| ☑ | `prop_sage_gate` | `1024x1536` | An ancient sandstone archway gate overgrown with vines, every stone carved with softly glowing teal Sage glyphs, the opening sealed by a shimmering curtain of teal light with a large glowing glyph-lock in its center. |
| ☑ | `prop_sage_gate_open` | `1024x1536` | The same archway as `prop_sage_gate` (pass it as a reference and match it exactly) with the curtain of light gone, the glyphs glowing calmly. Through the arch, only a hint of a sunlit path. |

### The Temple Ruins (light reference: `backgrounds/battle/bg_jungle_ruins.webp`)

| ☐ | Asset | Size | The object |
|---|---|---|---|
| ☑ | `prop_word_cage` | `1024x1536` | A tall, round magical cage like an ornate birdcage, made of glowing violet energy bars. Each bar is a twisting ribbon of scrambled magical rune-glyphs, and a heavy rune-padlock hangs on the front. **The inside is completely empty, and the gaps between the bars are fully transparent**, because the game puts a character inside. |
| ☑ | `prop_glyph_wall` | `1536x1024` | A broken section of ancient temple wall in mossy sandstone, carved with rows of softly glowing teal Sage glyphs, with ferns and a red jungle flower at its base and a crack running through it. |
| ☑ | `prop_stone_frog` | `1024x1024` | A mossy stone statue of a fat, wide-grinning frog sitting on a little plinth, with one round, polished nose that is obviously a button and a small blank plaque at its feet. Funny and a little smug. |
| ☑ | `prop_pillar` | `1024x1536` | A tall, cracked sandstone pillar leaning slightly, wrapped in vines, with carved glyph bands and a flat broken top big enough for a monkey to sit on. |

### The Crystal Canyon (light reference: `backgrounds/battle/bg_crystal_canyon.webp`)

| ☐ | Asset | Size | The object |
|---|---|---|---|
| ☑ | `prop_airship_wreck` | `1536x1024` | The crashed sky-pirate airship *Brass Albatross*, broken on the ground: a split brass-and-wood hull lying on its side, a torn, patched balloon slumped over it, one bent propeller, spilled crates and rope, and its crystal engine still sputtering teal sparks. Sad but not tragic, like a beloved old car with a flat tire. |
| ☑ | `prop_crystal_ledge` | `1024x1024` | A cluster of large violet-and-blue crystals growing out of a rock, forming a flat-topped ledge about as tall as a person, with small crystals sprouting around its base. |
| ☑ | `prop_shrine` | `1024x1536` | A sacred sea shrine: a tall teal-white crystal growing from a carved stone pedestal shaped like a curling wave, with a shallow stone basin of softly glowing seawater in front and seashell offerings on its steps. |
| ☑ | `prop_lair` | `1536x1024` | The mouth of a huge cave in dark canyon rock, rimmed with jagged violet crystals like teeth, half-chewed crystal crumbs scattered at the entrance, and a deep violet glow and wisps of steam coming from the darkness inside. Ominous but kid-safe: no eyes, no bones. |
| ☑ | `prop_crystal_shard` | `1024x1024` | One shard of a Lore Crystal: a jagged, faceted teal-white crystal fragment glowing from within, with tiny motes of light drifting off it. This is the quest item he collects four of. |

---

## Section D: Icons

### ☑ `icons_items` (item icons)

- **Output:** `icons/icons_items.webp`, `1024x1024`, transparent. Use the Sprite block and the icon-sheet template, but replace "glowing crystal emblem set in a dark metal rim" with "a painted inventory item on a soft circular glow, no rim".
- **Guide:** `guides/icon_sheet.png`.
- **Manifest:** `"sheet": { …, "names": [the 16 names below, in order] }`.

The icons, in reading order:

> **fish**: a bright orange rubber squeaky-toy fish · **cell**: a glowing brass power-cell canister · **note**: a rolled parchment note tied with a purple ribbon and a wax seal · **shard**: a jagged teal-white Lore Crystal shard · **banana**: a ripe banana · **coin**: a gold doubloon · **key**: an ornate brass key · **chart**: a rolled sea chart · **spyglass**: a brass spyglass · **rope**: a coil of rope · **shovel**: a small shovel · **lantern**: a crystal lantern · **biscuit**: a round, salty sea biscuit · **magnet**: a red-and-blue horseshoe magnet · **shell**: a spiral seashell horn · **feather**: a long white quill feather

### ☑ `ui_icons_explore` (exploring icons)

- **Output:** `ui/ui_icons_explore.webp`, `1024x1024`, transparent. Use the Sprite block and the icon-sheet template, in the same style as `ui_icons_commands` (pass it as a reference).
- **Guide:** `guides/icon_sheet.png`.
- **Manifest:** `"sheet": { …, "names": [the 16 names below, in order] }`.

The icons, in reading order:

> **look**: an eye · **talk**: a speech bubble · **take**: an open hand reaching · **use**: a hand holding a gear · **walk**: a pair of footprints · **left**: a bold arrow pointing left · **right**: a bold arrow pointing right · **bag**: a leather satchel · **map**: a folded island map · **journal**: a leather journal with a crystal clasp · **shard_empty**: the outline of a crystal shard, dim and empty · **shard_full**: a crystal shard glowing brightly · **monkey**: a cheeky three-eyed monkey face in a tiny hat · **sound**: a speaker with sound waves · **close**: a bold X · **sparkle**: a four-pointed twinkle of light

---

## Section E: Story cards

Illustrations for the opening and the ending. The game shows each one full screen, with narration in a box along the bottom.

- **Output:** `scenes/<id>.webp`, `1536x1024`, Scene block, opaque.
- **References:** `anchors/key_art.webp`, `anchors/cast_lineup.webp` (match the heroes when they appear), plus `guides/story_card.png` (keep the subject out of the strips the screen cuts off and above the narration box).
- **Manifest:** `"<id>": { "kind": "scene", "base": { "src", "w", "h" } }`.

| ☐ | Asset | The card |
|---|---|---|
| ☑ | `story_albatross` | Night flight over the Glimmering Sea: the sky-pirate airship *Brass Albatross*, a patched balloon over a brass-and-wood hull with spinning propellers, carries a huge glowing Lore Crystal in a cradle slung beneath it. Moonlit clouds, a sea full of small islands far below, glowing motes in the air. |
| ☑ | `story_galleon` | A ghostly pirate galleon bursts out of a storm cloud: translucent sea-green hull, tattered glowing sails embroidered with jumbled rune-glyphs, lanterns burning green. On the prow stands Captain Jumble, a sea-green ghost pirate in a huge plumed purple tricorn hat, pointing dramatically. Match the attached `npc_jumble` reference. The galleon is about to ram the small airship in the foreground. Thrilling and theatrical, not scary. |
| ☑ | `story_crash` | Dawn over Driftwood Isle, seen from high above: a green tropical island with a white-sand cove and an old shipwreck, a jungle temple, and a canyon full of giant crystals. A smoking airship spirals down toward the canyon, and four glowing teal trails of light streak down from the sky to four different places on the island. |
| ☑ | `story_ending` | Sunrise on a cliff above Driftwood Harbor, a pirate port built from old shipwrecks, with a lighthouse topped by a glowing crystal. The four heroes and the floating droid, seen from behind and small in the frame, look out at the harbor. The knight holds up a mended, glowing Lore Crystal. Hidden in a palm tree: the three-eyed monkey in his tiny captain's hat. Warm, triumphant, full of promise. |

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-03.md` in the same format as wave 02:
   - Show each walk cycle as an animated GIF.
   - Show each object composited small over the background of its place, with a hero beside it for scale, so the review shows they belong together.
3. Tell the parent which review page to open. Everything stays `draft` until he and his son approve it.

## Notes

Generated all 29 assets straight through. Everything remains draft. Review: art/review/wave-03.md. Built-in imagegen; all prescribed references and guides passed.

- npc_jumble/portraits: frame 4: source touches cell edge
- ally_knight/walk: After three attempts, walk phases and weapon/cloth continuity still pop. Review the 10 fps GIF before approval.; frame 0: source touches cell edge; frame 4: source touches cell edge; frame 5: source touches cell edge; frame 7: source touches cell edge; Standing frame scale exceeds ±8% after width fitting.
- ally_gunner/walk: After three attempts, walk phases and weapon/cloth continuity still pop. Review the 10 fps GIF before approval.; frame 0: source touches cell edge; frame 1: source touches cell edge; frame 2: source touches cell edge; frame 3: source touches cell edge; frame 4: source touches cell edge; frame 5: source touches cell edge; frame 6: source touches cell edge; frame 7: source touches cell edge
- ally_spellwright/walk: After three attempts, walk phases and weapon/cloth continuity still pop. Review the 10 fps GIF before approval.; frame 4: source touches cell edge
- ally_titancaller/walk: After three attempts, walk phases and weapon/cloth continuity still pop. Review the 10 fps GIF before approval.; frame 4: source touches cell edge; frame 5: source touches cell edge
- ui_icons_explore/sheet: frame 0: source touches cell edge; frame 1: source touches cell edge; frame 2: source touches cell edge; frame 3: source touches cell edge; frame 4: source touches cell edge; frame 5: source touches cell edge; frame 6: source touches cell edge; frame 7: source touches cell edge; frame 8: source touches cell edge; frame 9: source touches cell edge; frame 10: source touches cell edge; frame 11: source touches cell edge; frame 12: source touches cell edge; frame 13: source touches cell edge; frame 14: source touches cell edge; frame 15: source touches cell edge
- story_albatross/base: After three attempts, upper mast/flag enters the 16:9 top crop; balloon, hull and crystal remain visible.
- story_galleon/base: After three attempts, upper rigging and lower ghost-hull glow enter screen/narration crops; confrontation and Jumble remain visible.
- story_crash/base: After three attempts, some upper airship rigging and monkey body enter screen/narration crops. Review the screen preview.
- story_ending/base: Monkey cameo partly enters the top screen crop; its face remains visible.
