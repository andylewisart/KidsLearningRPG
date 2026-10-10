# Wave05: Polish

All assets are **draft**, pending parent and child review. Visual flags below remain separate from dimensions, file budgets and manifest checks.

2 selected draft outputs. Stop at the final gate for parent and child review; unresolved flags are recorded in each entry.

## story_ram/base — draft

![Selected image](../../public/assets/scenes/story_ram.webp)

![Story-card guide at35 percent](wave-05/story_ram-guide.jpg)

**Review flags:** Upper pennant extends into the cropped top strip; collision, faces and all four shards remain visible above the narration box.

<details><summary>Exact generation prompt and references</summary>

```text
ART STYLE: Lush, luminous digital painting in the spirit of a premium early-2000s Japanese RPG remastered in HD. Semi-realistic, anime-influenced characters with expressive faces and stylish asymmetrical adventure outfits: layered belts, buckles, straps, zippers, one-sleeved jackets, flowing scarves. Sun-drenched tropical environments painted in rich detail: saturated turquoise seas, white sand, emerald jungle, and ancient sandstone ruins carved with softly glowing glyphs. Golden-hour sunlight, with bioluminescent blue-green motes of light drifting through the air. Cinematic, epic and adventurous, with a mischievous sense of humor: witty, characterful expressions and small comedic details hidden in the scene. Mature and cool, never babyish or chibi.

This is a background painting for a 2D game: no characters or creatures unless the prompt asks for them, no user interface. Rich depth, clear foreground, midground and background.

The instant of impact, at night above the Glimmering Sea: the ghostly pirate galleon from the attached reference, translucent sea-green hull and tattered glowing rune-sails, smashes its prow into the side of the sky-pirate airship Brass Albatross from the other reference. A burst of green ghost-sparks, flying splinters and loose brass bolts where the hulls meet; the Albatross tips sideways, its patched balloon buckling. Beneath it, the huge glowing Lore Crystal in its cradle cracks apart into exactly four big teal shards flying off in four directions, trailing light. On the galleon's prow, Captain Jumble from the attached reference cackles with delight, hat brim flapping. Tumbling off the airship's deck, small in the frame: a young knight in silver armor with a crimson scarf, a red-haired sky-pirate captain, and a round white tutor droid whose tiny pirate hat is flying off. Storm clouds and moonlight; green ghost-light against teal crystal light. Thrilling and funny, like a classic adventure-game cutscene; nobody looks hurt, nothing scary.

The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.
Exactly1536x1024. Collision and four crystal shards above the narration strip, whole ships readable. Exactly four large shards.

Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes. Fierce and intense is great; no blood, gore or wounds.
EDIT FIRST CANDIDATE ONLY: preserve the collision, ships, three travelers, Jumble and three other shards. Move the upper-left large teal shard DOWN to center(390,175), so its entire solid shape lies below y100 and above y260. Exactly four large shards total. Keep all important subjects within y100â€“690. Preserve clear space around whole ships, lower third only sea/cliffs/clouds. No guide text or lines.
```

References: `C:\Users\AndyLewis\.codex\generated_images\01a1224c-a831-7292-b516-5c44e2310ce8\exec-c18947e6-5cdd-4f76-91a1-ef3989e04cd0.png`, `public/assets/scenes/story_galleon.webp`, `public/assets/scenes/story_albatross.webp`, `public/assets/characters/npc_jumble/base.webp`, `art/guides/story_card.png`

</details>

## title_art/base — draft

![Selected image](../../public/assets/scenes/title_art.webp)

Original key art left / edited title right:

![Title comparison](wave-05/title-old-new.jpg)

**Review flags:** Three localized edits attempted; foreground remains visually close but pixel-exact preservation was not achieved. Original key-art anchor is unchanged. leftHero: 41.9% of sampled protected pixels differ by more than12 RGB levels; exact invariance failed. gunner: 43.4% of sampled protected pixels differ by more than12 RGB levels; exact invariance failed. monkey: 43.1% of sampled protected pixels differ by more than12 RGB levels; exact invariance failed.

<details><summary>Exact generation prompt and references</summary>

```text
ART STYLE: Lush, luminous digital painting in the spirit of a premium early-2000s Japanese RPG remastered in HD. Semi-realistic, anime-influenced characters with expressive faces and stylish asymmetrical adventure outfits: layered belts, buckles, straps, zippers, one-sleeved jackets, flowing scarves. Sun-drenched tropical environments painted in rich detail: saturated turquoise seas, white sand, emerald jungle, and ancient sandstone ruins carved with softly glowing glyphs. Golden-hour sunlight, with bioluminescent blue-green motes of light drifting through the air. Cinematic, epic and adventurous, with a mischievous sense of humor: witty, characterful expressions and small comedic details hidden in the scene. Mature and cool, never babyish or chibi.

This is a background painting for a 2D game: no characters or creatures unless the prompt asks for them, no user interface. Rich depth, clear foreground, midground and background.

Edit the first image. Keep every character, the airship, the monkey, the light and the framing exactly the same. Add Maren, the Titan Caller from the attached reference, in the middle distance on the right: standing on a sea-stack rock in the surf, between the hooded scholar and the monkey's post but farther back, seen from three-quarters behind as she faces the giant crystal-backed Titan in the background. Her storm-crystal staff is raised high; a spiralling column of sea-spray and glowing teal glyph-light rises from her staff to the Titan. The Titan answers: its eyes blaze teal, water roars from its jaws, and the sea churns at its feet. She is smaller than the heroes in front, clearly part of the scene, dramatic and powerful.

Exactly1536x1024. Edit only Maren, her summoning light and the Titan response; preserve original pixels everywhere else.

Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes. Fierce and intense is great; no blood, gore or wounds.
Use a tightly localized insertion edit. The original foreground heroes and monkey and original airship must remain pixel-identical. Do not regenerate any existing face, outfit, pose, silhouette, rock, framing or lighting. Paint Maren behind the scholar and monkey and her spell/Titan response only; reuse the original image outside this local insertion.
```

References: `public/assets/anchors/key_art.webp`, `public/assets/characters/ally_titancaller/base.webp`, `public/assets/titans/titan_starter/base.webp`

</details>

