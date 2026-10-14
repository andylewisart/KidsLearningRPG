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

