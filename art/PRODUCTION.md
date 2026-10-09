# Art production guide (for Codex)

You're producing the art for **Crystal Titans**, a turn-based RPG for an 8-year-old. Generate every image listed in a wave file, process it to spec, save it at the exact path given, register it in the asset manifest, and build a review page. The game loads art **only** through the manifest, so paths and names matter as much as the pictures.

Read [`STYLE.md`](STYLE.md) first. It holds the style prompt, the rules and the cast palettes.

## How to run a wave

1. Open the wave file, for example [`waves/wave-01-first-battle.md`](waves/wave-01-first-battle.md). Work through its assets **in order**. Skip anything already checked off.
2. Before each asset, compose its prompt as described in "Composing a prompt" below.
3. Generate. Pass the listed **reference images** whenever the asset has them.
4. Save the raw output to `art/raw/<wave>/<asset_id>/<variant>.png`. `art/raw/` is git-ignored, so add it to `.gitignore` if it's missing.
5. Process it (see "Processing").
6. Check it against the QA list. If it fails, regenerate (at most 3 attempts per image), then flag it.
7. Update `public/assets/manifest.json` and the review page `art/review/<wave>.md`.
8. Tick the asset's checkbox in the wave file. Add a line under that wave's **Notes** for anything flagged or skipped.
9. **Stop at every ⛔ gate** in the wave file. Commit, then tell the user exactly what to review (the review page path). Continue only after they approve.

## Generation settings

- **Model:** the best OpenAI image model available to you. Story Quest uses `gpt-image-2.5-flare`. Use the image-generation tool you have, or the OpenAI Images API with `OPENAI_API_KEY`.
- **References:** when an asset lists references (style anchors, the character's approved base image), use the edit/reference mode and pass them as input images. Say "match the attached reference's character exactly: same face, outfit, colors and weapon."
- **Sizes:** only `1024x1024`, `1536x1024` or `1024x1536`. Each asset says which.
- **Background:** `transparent` for anything using the Sprite block. Opaque for scenes. Pure black for effects.
- **Quality:** highest for anchors, character bases, the boss and splash art. High for everything else.
- **Candidates:** for character bases and the boss, generate **2** and keep the one most faithful to the description and the style anchor. Note the choice in the review page.

## Composing a prompt

Every prompt is these blocks in order, separated by blank lines:

```text
[MASTER STYLE PROMPT from STYLE.md]
[ADD-ON BLOCK: Sprite, Scene, or Effects, whichever the asset says]
[ASSET PROMPT: the asset's own text from the wave file; for sheets, also the matching sheet template below]
[RULES BLOCK from STYLE.md]
```

Never add franchise names. Never drop the rules block.

## File layout

```
public/assets/
  manifest.json                     the only file the game reads to find art
  anchors/<id>.webp                 approved style anchors
  characters/<id>/base.webp         heroes, allies, tutor, mascot
  characters/<id>/battle.webp       battle sheet
  characters/<id>/portraits.webp    expression sheet
  characters/<id>/walk.webp         walk cycle (wave 2+)
  fiends/<id>/base.webp
  fiends/<id>/battle.webp
  bosses/<id>/<pose>.webp           base, attack, hurt, enraged
  bosses/<id>/splash.webp
  titans/<id>/base.webp             Titans he summons
  backgrounds/battle/<id>.webp
  scenes/<id>.webp                  point-and-click scenes (wave 2+)
  fx/<id>.webp                      effect sheets
  icons/<id>.webp                   icon sheets
art/review/<wave>.md                review gallery (GitHub renders it)
art/raw/...                         raw generations, git-ignored
tools/art/                          your processing scripts (own package.json)
```

Asset ids look like `ally_gunner`, `fiend_ink_slime`, `boss_geode_titan`, `bg_jungle_ruins` or `fx_slash`. Use lowercase with underscores, exactly as written in the wave file.

## Sheet templates

Append the matching template to the asset prompt. Cells are always equal squares, and there are **no grid lines, labels or borders**. The processing step finds the cells from these exact layouts.

### Hero battle sheet: `1536x1024`, 3 columns × 2 rows, 512 px cells, transparent

```text
A sprite sheet for a 2D turn-based battle game: the SAME character shown 6 times in a grid of 3 columns and 2 rows of equal square cells, on a fully transparent background, with no grid lines, borders, labels or text. Every pose shows the full body at the same size and scale, feet on the same invisible baseline near the bottom of each cell, the character facing LEFT, with clear empty space between poses. Top row, left to right: (1) idle battle stance, (2) attacking at the peak of the strike, (3) casting a special move with energy gathering in the hands or weapon. Bottom row, left to right: (4) hurt, recoiling from a hit, (5) knocked out, collapsed on the ground, (6) victory pose. Match the attached character reference exactly.
```

### Expression sheet: `1536x1024`, 3 × 2, 512 px cells, transparent

```text
An expression sheet for dialogue portraits: the SAME character's head and shoulders shown 6 times in a grid of 3 columns and 2 rows of equal square cells, on a fully transparent background, with no grid lines, labels or text. Identical framing and scale in every cell, facing three-quarters toward the right. Top row: (1) neutral, (2) laughing, (3) angry. Bottom row: (4) shocked, (5) smug, (6) worried. Big, readable, slightly comedic acting. Match the attached character reference exactly.
```

### Fiend battle sheet: `1024x1024`, 2 × 2, 512 px cells, transparent

```text
A sprite sheet for a 2D turn-based battle game: the SAME creature shown 4 times in a grid of 2 columns and 2 rows of equal square cells, on a fully transparent background, with no grid lines, labels or text. Full body at the same size and scale in every cell, standing on the same invisible baseline, facing RIGHT. Top row: (1) idle, menacing, (2) attacking. Bottom row: (3) hurt, recoiling, (4) special attack, glowing with power. Match the attached creature reference exactly.
```

### Walk cycle (wave 2+): `1536x1024`, 4 × 2, 384×512 px cells, transparent

```text
A side-view walk cycle sprite sheet: the SAME character in 8 frames in a grid of 4 columns and 2 rows of equal cells, on a fully transparent background, with no grid lines, labels or text. Full body, same size and scale in every frame, feet on the same invisible baseline, walking toward the RIGHT. The frames read left to right, top row then bottom row, as one smooth looping step cycle. Match the attached character reference exactly.
```

### Effect sheet: `1024x1024`, 4 × 4, 256 px cells, pure black

```text
A 16-frame animation sprite sheet of the effect described above, in a grid of 4 columns and 4 rows of equal square cells on a pure black (#000000) background, with no grid lines, labels or text. Frames read left to right, top row to bottom row. The effect starts small in frame 1, peaks around frames 6 to 9, and fades completely to black by frame 16. Each frame is centered in its cell with a margin and never crosses into a neighboring cell.
```

### Icon sheet: `1024x1024`, 4 × 4, 256 px cells, transparent

```text
A sheet of 16 game icons in a grid of 4 columns and 4 rows of equal square cells, on a fully transparent background, with no grid lines, labels or text. Every icon is a glowing crystal emblem set in a dark metal rim, in the same size, style and lighting, with a bold silhouette that reads at small size. Icons in reading order, left to right, top to bottom: [the list from the wave file].
```

## Processing

Write the tools once in `tools/art/`, with their own `package.json` (Node 22 + `sharp`). Don't touch the repo root's `package.json`.

1. **Transparency** (sprite assets only). Check the four corners and the border ring for alpha = 0.
   - If the image came back opaque on a flat color (all corners within a small color distance), key that color out with a soft edge.
   - Otherwise, regenerate.
2. **Single images.** Trim to the alpha bounding box. Add a 4% margin. Scale so the longest side is at most **1024 px**. Record the **anchor** (the center-bottom point where the feet meet the ground).
3. **Sheets.** Slice by the template's exact grid. For each cell:
   - Find the content's bounding box. **Flag the cell** if the content touches the cell edge (it's probably cropped or bleeding) or if the cell is empty.
   - Rebuild a clean sheet at the same grid. Center each frame horizontally, and put its bottom on a shared baseline at **94% of the cell height**. KO frames and effects are exempt from the baseline rule.
   - Scale frames so the heights of the standing poses are within ±8% of their median.
   - **Facing.** Heroes face **left**, fiends face **right**, walk cycles face **right**, portraits face three-quarters right. If a whole sheet faces the wrong way, mirror it. If only some frames are wrong, regenerate.
   - **Strays.** Slivers of a neighboring pose that bled into a cell (a sword tip, a muzzle flash, a strip of cape) end up floating beside the character in the game. `python3 tools/art/clean_sheets.py --dry-run` finds small loose pieces on the edge of each pose. Check them by eye: loose bits can be intended (floating scrap, ink drops, stars). Then add the sheet to `TARGETS` in that script, with any frames to skip, and run it without `--dry-run`.
4. **Export** WebP (quality about 86, alpha kept). Size budgets:

   | Asset | Max size |
   |---|---|
   | Base | 400 KB |
   | Sheet | 700 KB |
   | Background or scene | 500 KB |
   | Effect sheet | 400 KB |
   | Icon sheet | 300 KB |

   Effect sheets stay on black; the game blends them with `screen`.
5. **Manifest.** Write or merge the entry (schema below). Never delete entries you didn't create.
6. **Review page.** Append to `art/review/<wave>.md`:
   - each asset's id and status
   - its images (relative links, so GitHub renders them)
   - for sheets, a note of any flagged frames
   - the prompt that made it, in a collapsed `<details>` block

## Manifest schema: `public/assets/manifest.json`

Paths are relative to `public/assets/`. Frame indices count across rows, then down: 0 is top-left. `anchor` is in pixels within one cell, or within the image for single images.

```json
{
  "version": 1,
  "assets": {
    "ally_gunner": {
      "kind": "ally",
      "wave": 1,
      "status": "draft",
      "base": { "src": "characters/ally_gunner/base.webp", "w": 640, "h": 1024, "anchor": [318, 1004] },
      "battle": {
        "src": "characters/ally_gunner/battle.webp",
        "cell": [512, 512], "cols": 3, "rows": 2,
        "frames": { "idle": 0, "attack": 1, "cast": 2, "hurt": 3, "ko": 4, "victory": 5 },
        "anchor": [256, 481], "facing": "left"
      },
      "portraits": {
        "src": "characters/ally_gunner/portraits.webp",
        "cell": [512, 512], "cols": 3, "rows": 2,
        "frames": { "neutral": 0, "laughing": 1, "angry": 2, "shocked": 3, "smug": 4, "worried": 5 }
      },
      "source": { "wave_file": "art/waves/wave-01-first-battle.md", "model": "gpt-image-2.5-flare", "date": "2026-10-10" }
    },
    "boss_geode_titan": {
      "kind": "boss", "wave": 1, "status": "draft",
      "base": { "src": "bosses/boss_geode_titan/base.webp", "w": 1024, "h": 1024, "anchor": [512, 990] },
      "poses": {
        "attack": { "src": "bosses/boss_geode_titan/attack.webp" },
        "hurt": { "src": "bosses/boss_geode_titan/hurt.webp" },
        "enraged": { "src": "bosses/boss_geode_titan/enraged.webp" }
      },
      "splash": { "src": "bosses/boss_geode_titan/splash.webp", "w": 1536, "h": 1024 }
    },
    "titan_starter": {
      "kind": "titan", "wave": 1, "status": "draft",
      "base": { "src": "titans/titan_starter/base.webp", "w": 1024, "h": 1536 }
    },
    "bg_jungle_ruins": {
      "kind": "background", "wave": 1, "status": "draft",
      "base": { "src": "backgrounds/battle/bg_jungle_ruins.webp", "w": 1536, "h": 1024 }
    },
    "fx_slash": {
      "kind": "fx", "wave": 1, "status": "draft",
      "sheet": { "src": "fx/fx_slash.webp", "cell": [256, 256], "cols": 4, "rows": 4, "frames": 16, "fps": 24, "blend": "screen" }
    },
    "icons_elements_status": {
      "kind": "icons", "wave": 1, "status": "draft",
      "sheet": { "src": "icons/icons_elements_status.webp", "cell": [256, 256], "cols": 4, "rows": 4,
        "names": ["fire", "ice", "lightning", "water", "earth", "wind", "light", "shadow",
                  "silence", "confusion", "poison", "sleep", "haste", "slow", "protect", "barrier"] }
    }
  }
}
```

The `kind` values are `anchor`, `hero`, `ally`, `tutor`, `mascot`, `fiend`, `boss`, `titan`, `background`, `scene`, `fx` and `icons`.

The `status` values:
- `draft`: just generated
- `approved`: the parent said yes
- `replace`: needs another pass. Say why in the wave file's Notes.

## QA before you commit

- [ ] Every asset in this section of the wave file exists at its exact path and has a manifest entry.
- [ ] Sprites have truly transparent backgrounds (corners alpha = 0), with no leftover halos or matte fringes.
- [ ] No text, letters, numbers, watermarks or signatures anywhere (glowing rune-glyphs are fine where asked).
- [ ] Nothing cropped: full bodies, whole weapons, whole tails.
- [ ] Sheets have the right grid and frame count, nothing crossing cell borders, consistent scale and baseline, and correct facing.
- [ ] Each character matches its base image and the cast palette in `STYLE.md`.
- [ ] Nothing looks like a famous franchise character or creature.
- [ ] Kid-safe: fierce is fine, gore is not.
- [ ] Files are within the size budgets.
- [ ] The review page shows everything generated in this pass.

## Commits and boundaries

- **One commit per gate section**, with a message listing the assets made plus anything flagged or skipped.
- **You may create or change only:**
  - `public/assets/**`
  - `art/review/**`
  - `tools/art/**`
  - `.gitignore` (to ignore `art/raw/`)
  - checkboxes and **Notes** in `art/waves/*.md`
- **Don't touch:** game code, `docs/`, `STYLE.md` (unless the user asks you to record an approved anchor) or this file.
- If a prompt keeps failing (refusals, lookalike blocks, unusable sheets), **don't invent a different design**. Flag it in Notes with what went wrong, and move on.

## Waves

| Wave | What | Status |
|---|---|---|
| [00: Anchors](waves/wave-00-anchors.md) | Key art, a battle mock, the cast lineup: the references for everything else | Ready |
| [01: First battle](waves/wave-01-first-battle.md) | Heroes, the tutor droid, the monkey, 5 fiends, the boss, 2 backgrounds, 8 effects, icons | Ready after wave 00 |
| 02: Chapter 1, Driftwood Isle | Walk cycles, point-and-click scenes (dock, Honest Hal's shop, tavern, jungle temple, beach camp), townspeople (Honest Hal, the Sword Master, Captain Jumble), the sea chart, item icons, more fiends | Written when chapter 1 is designed |
