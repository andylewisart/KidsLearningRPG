# Wave 09: Section A review

Section A only, on `claude/project-thread-ftrlee`. Generated with the built-in image tool; **flagged draft / replace**, pending parent review. Sections B–E were outside this run.

## tutor_droid — field_cozy.webp — flagged

![Base (left) and cozy field sprite (right), same canvas scale](wave-09/tutor_droid-base-and-cozy.jpg)

| Original base | Cozy field sprite |
|---|---|
| ![Original](../../public/assets/characters/tutor_droid/base.webp) | ![Cozy](../../public/assets/characters/tutor_droid/field_cozy.webp) |

![Cozy reference](../../public/assets/characters/tutor_droid/portraits_cozy.webp)

![Light-background edge check](wave-09/tutor_droid-cozy-light.jpg)

**Attempt 3 selected, of 3.** Faded rust, cream and blue knit stripes, cream pom-pom and crooked fit match the cozy reference. Original tricorn, emblem and feathers removed. Full sprite; no text, scenery, shadow or guide marks. Alpha inspected on dark and light backgrounds: no visible matte fringe; intended cyan jet glow retained.

**Flag:** all three edits changed non-hat details and moved the body upward. Attempt 3 is the closest review candidate, but does **not** meet the exact hat-only preservation requirement: body plates, fins and jet shapes differ, and the eye/body registration is visibly higher than the base. No fourth attempt or alternate design. Manifest variant marked `replace`; do not treat it as approved.

901×1024; 199,970 bytes (195.3 KiB); WebP quality 86, alpha retained. Anchor copied exactly from base: **[451, 986]**. The generator returned 1176×1337; processing resized the entire canvas to 901×1024 without trimming, padding or recentering. Alpha noise at values 1–8 cleared before resizing. All four corners and the entire exported border have alpha 0. Source base and cozy portraits unchanged; only the new manifest variant was added.

Raw attempts: `art/raw/wave-09/tutor_droid/field_cozy-attempt-{1,2,3}.png` (ignored).
Processing: `node tools/art/wave09-a-process.mjs 3` (initial export).
QA record: [wave09-a-record.json](../../tools/art/wave09-a-record.json).

<details><summary>Selected prompt and references</summary>

```text
ART STYLE: Lush, luminous digital painting in the spirit of a premium early-2000s Japanese RPG remastered in HD. Semi-realistic, anime-influenced characters with expressive faces and stylish asymmetrical adventure outfits: layered belts, buckles, straps, zippers, one-sleeved jackets, flowing scarves. Sun-drenched tropical environments painted in rich detail: saturated turquoise seas, white sand, emerald jungle, and ancient sandstone ruins carved with softly glowing glyphs. Golden-hour sunlight, with bioluminescent blue-green motes of light drifting through the air. Cinematic, epic and adventurous, with a mischievous sense of humor: witty, characterful expressions and small comedic details hidden in the scene. Mature and cool, never babyish or chibi.

This is an isolated game sprite: render ONLY the subject on a fully transparent background (PNG with alpha). No scenery, no ground, no cast shadow, no frame. Lit from the upper left with a soft rim light, crisp readable silhouette, full body with nothing cropped and clear empty space around it.

Edit target: the attached droid sprite. Keep everything exactly as it is (the round white-and-brass body, the big cyan eye, the arms, the jets, the pose, the size and the framing) and change only its hat: replace the navy tricorn with the knitted tea cozy from the second reference, in the same faded stripes with the cream pom-pom, pulled down over the top of its head and sitting slightly crooked, as the tricorn did. Transparent background, no shadow.

Image 1 is the edit target base.webp; Image 2 is portraits_cozy.webp, reference ONLY for the hat. Images 3 and 4 are painting-style anchors only. Match the attached reference character exactly: same face, outfit, colors and weapon. Change only the hat; keep the body, eye, arms, jets and every non-hat detail at the identical pixel position and size. Keep the 901x1024 canvas and anchor [451,986], with no trimming, recentering or scaling. Use the faded cream, rust and blue knitted stripes and cream pom-pom from Image 2. Remove all tricorn brim, emblem and feathers. No additional characters or objects. Highest quality, actual transparent alpha with all borders transparent.

LAST ATTEMPT: This is a localized inpainting task, not a redraw. Copy the first image exactly and edit only the tricorn mask above the ceramic head. Do not change one pixel of the eye, body, arms, crystal or jets. Retain the original idle eye shutter angle (nearly horizontal, slightly downward to the right), circular body, and exact extent of both original fins and original jets. The hat should be shorter than the old feathers and leave MORE empty space at the top; do not use that space to enlarge or move the body. Critical correction: do NOT reposition or shrink the body to fit the hat. The first reference is the immutable edit target. Preserve its EXACT silhouette below the hat. On the 901x1024 target the large eye center is approximately (330,500), left fin reaches x38 and y650, right fin reaches x861 and y500, main jet ends near y986. Keep these positions. Put the new knit hat ONLY in the old hat area at the top; body must not follow the smaller portrait proportions. All non-hat pixels should remain unchanged. Replace the old tricorn including feathers with the cozy; adapt the cozy to the existing head, never adapt the head/body to the cozy.

Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes. Fierce and intense is great; no blood, gore or wounds. Every character is dressed for an all-ages game: modest clothing, no bare midriffs, no low necklines or cleavage, no revealing or tight-fitting costumes, and nothing sexualized in pose or proportion.

```

References, in order:
- Edit target: `public/assets/characters/tutor_droid/base.webp`.
- Cozy design only: `public/assets/characters/tutor_droid/portraits_cozy.webp`.
- Style only: `public/assets/anchors/key_art.webp`.
- Style only: `public/assets/anchors/cast_lineup.webp`.

No guide is named for Section A.

</details>

Validation: `npm test` — 268 tests passed without installing game dependencies. Review the hat match and the flagged body drift beside the base before approving any game use.


<!-- WAVE09 B START -->

# Section B: baby Wick Moth review

Section B only, on `claude/project-thread-ftrlee`. Built-in image generation; **flagged draft / replace**, pending parent review. Section A entries and Notes retained; Sections C–E outside this run.

## pet_moth_1 — battle.webp — flagged

![Baby Wick Moth sheet](../../public/assets/characters/pet_moth_1/battle.webp)

| Species reference | Baby sheet |

|---|---|

| ![Giant Wick Moth](../../public/assets/fiends/fiend_wick_moth/base.webp) | ![Baby Wick Moth](../../public/assets/characters/pet_moth_1/battle.webp) |

![Light-background edge check](wave-09/pet_moth_1-light.jpg)

![Dark-background edge check](wave-09/pet_moth_1-dark.jpg)

**Attempt 3 selected, of 3.** Round, fluffy cream body, warm internal glow, dark shiny eyes, old amber/teal lantern-glass wings and shorter dusty antennae. No crystal heart, jewelry, scenery, text or guide marks. Poses in reading order: idle, act (glowing dust), happy, hurt. All face right; wings overlap in the three-quarter views. Full poses and dust remain inside their cells.

**Flags:**
- Wings remain larger than the tiny-wing baby brief after three attempts.
- Hurt internal glow is only slightly dimmer; stronger dimming remains for review.
- Hurt body reads larger after equal-height sheet normalization because its wings are folded.

1024×1024; **202,842 bytes (198.1 KiB)**. 2×2, 512×512 cells. WebP quality 86, alpha retained. Manifest shaped like pet_raptor_1, with wave 9 provenance and status replace; every prior manifest entry preserved.

QA: all four corner alphas = 0; outer border and all cell borders fully transparent. No empty cells, source edge contact or cell bleed. Each frame centered horizontally with bottom baseline 481; content heights 333 px. Alpha values 1–8 cleared (66963 pixels) before slicing to remove generation noise. Inspected on light and dark backgrounds: no visible matte fringe, intended act dust retained, no visible neighboring-frame strays. The existing Python stray-check tool could not run because Pillow is unavailable; no software installed. Hurt body-scale limitation noted above.

Generator canvas: 1254×1254. Equal 627×627 source cells sliced and rebuilt at 1024×1024. Raw attempts: `art/raw/wave-09/pet_moth_1/attempt-{1,2,3}.png` (ignored).

Processing: `node tools/art/wave09-b-process.mjs`. [QA record](../../tools/art/wave09-b-record.json). [All attempt prompts](../../tools/art/wave09-b-prompts.json).

<details><summary>Selected prompt and references</summary>

```text
ART STYLE: Lush, luminous digital painting in the spirit of a premium early-2000s Japanese RPG remastered in HD. Semi-realistic, anime-influenced characters with expressive faces and stylish asymmetrical adventure outfits: layered belts, buckles, straps, zippers, one-sleeved jackets, flowing scarves. Sun-drenched tropical environments painted in rich detail: saturated turquoise seas, white sand, emerald jungle, and ancient sandstone ruins carved with softly glowing glyphs. Golden-hour sunlight, with bioluminescent blue-green motes of light drifting through the air. Cinematic, epic and adventurous, with a mischievous sense of humor: witty, characterful expressions and small comedic details hidden in the scene. Mature and cool, never babyish or chibi.

This is an isolated game sprite: render ONLY the subject on a fully transparent background (PNG with alpha). No scenery, no ground, no cast shadow, no frame. Lit from the upper left with a soft rim light, crisp readable silhouette, full body with nothing cropped and clear empty space around it.

A small creature sheet, facing right: a baby Wick Moth no bigger than a teacup, round and very fuzzy, with four small wings like panes of old lantern glass in thin lead frames, a warm candle-flame glow inside its fuzzy body, short dusty antennae and huge dark shiny eyes. Shy, sweet and a little clumsy, not sad. The same species as the reference giant moth, but a baby: rounder and fluffier, with tiny wings. Four cells: idle (hovering, wings mid-beat), act (puffing out a brave little cloud of glowing dust), happy (wings spread wide, glowing brighter), hurt (wings folded, its glow dimmed).

A sprite sheet for a 2D turn-based battle game: the SAME creature shown 4 times in a grid of 2 columns and 2 rows of equal square cells, on a fully transparent background, with no grid lines, labels or text. Full body at the same size and scale in every cell, on the same invisible baseline, facing RIGHT. Top row: (1) idle, hovering, wings mid-beat, (2) act, puffing a brave little cloud of glowing dust toward the right. Bottom row: (3) happy, wings spread wide, glowing brighter, (4) hurt, wings folded, glow dimmed; no wounds. Match the attached creature reference's species exactly, adapted ONLY to the described baby proportions.

1024x1024 canvas, four 512x512 cells. Image 1 key art and Image 2 cast lineup are PAINTING STYLE ONLY, do not draw their characters or scenery. Image 3 is the giant Wick Moth SPECIES reference: cream fluffy body, old warm amber and muted teal lantern-glass wings in thin metal frames, dark shiny eyes. Make the baby rounder and very fuzzy, short dusty antennae and four tiny unbroken wings; no adult's tattered wing edges or long lantern abdomen. Image 4 jelly sheet shows FORMAT ONLY: four isolated consistent poses. Do NOT copy jelly features, jewelry or crystal hearts. The baby Wick Moth has NO crystal heart, no necklace and no hanging jewel. Image 5 guide is LAYOUT ONLY. The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text. Ignore its pose labels and follow idle/act/happy/hurt here. Every pose's head, gaze and body face right including happy and hurt. Keep all wings, antennae, feet and dust fully within each cell with generous clear transparent margins. Four anatomically consistent wings: two forewings and two smaller hindwings, visible paired roots, even if folded or overlapping. Same fluffy body scale in all four cells. Painterly detailed fur and glass, never a flat cartoon. Real transparent alpha, no black/white matte, no checkerboard, no ground shadows or ambient background haze. Internal glow stays within the body; only the act frame has a small discrete glowing dust cloud.

Final correction, attempt 3: Prior candidate kept adult-sized wings and long adult plumes. Baby design must have a plump round ball of fluffy fur larger than each wing, FOUR SMALL wings each at most ONE THIRD the fluffy body's height, like four little glass fins on a fuzzy ball, and TWO SHORT dusty antennae barely protruding from the head, not long feathery adult arcs. Antennae maximum one quarter head height, two stubby fuzzy nubs. Dominant silhouette is a fluffy rounded body, not enormous butterfly wings. Render the exact baby description; do not retain adult proportions. All four heads face three-quarter RIGHT, including happy (never frontal). Happy spreads its FOUR TINY wings without making them large. No extra floating sparkle trails in happy or idle; glow contained in the body. Preserve detailed painterly lantern-glass materials and cream fur. Hurt folds its four small wings visibly along the round body and dims the internal light. Four equal cells, correct ordering, completely transparent margins.

Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes. Fierce and intense is great; no blood, gore or wounds. Every character is dressed for an all-ages game: modest clothing, no bare midriffs, no low necklines or cleavage, no revealing or tight-fitting costumes, and nothing sexualized in pose or proportion.
```

References, in order:
- `public/assets/anchors/key_art.webp`
- `public/assets/anchors/cast_lineup.webp`
- `public/assets/fiends/fiend_wick_moth/base.webp`
- `public/assets/characters/pet_jelly_1/battle.webp`
- `art/guides/creature_sheet_2x2.png`

</details>

Validation: `npm test` — **268 passed, 0 failed**, without installing anything. No commit attempted and no push. Review the flagged wing proportions, hurt glow and body scale before approval.
