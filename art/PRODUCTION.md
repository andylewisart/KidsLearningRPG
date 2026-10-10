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

## Guides

`art/guides/` holds construction drawings that show the image model where things go, so new art lines up with the game. `tools/art/make_guides.py` draws them from `src/ui/stage-layout.json`, the same numbers the game uses. Never edit the PNGs by hand. Re-run the script instead.

| Guide | Use it for | What it pins down |
|---|---|---|
| `battle_stage.png` | Battle backgrounds | Eye level (where perspective meets), the back edge of the arena floor, where heroes and fiends stand and how tall they are, what the turn-order bar and the menus cover, how far the camera drifts |
| `battle_foreground.png` | Foreground parallax layers | The only areas a foreground may use (green), and the area that must stay transparent (red). Each piece must run off the image's edge (a post off the bottom, a canopy off the top) and be cut out along its own outline. Never crop or fade it at the green area's border: the game moves this layer furthest, so a piece that ends in mid-air or fades out shows as a smear (wave 02's did; `tools/art/fix_fg.py` repaired them) |
| `hero_battle_sheet.png` | Hero battle sheets | Baseline, head height, cell margins, facing |
| `portrait.png` | Portraits | Where the eyes and mouth go (the turn-order bar shows only that circle) |
| `icon_sheet.png` | Icon sheets | The 4×4 cells and the safe circle |
| `frame_9slice.png` | Window frames | The 96 px border band, the fixed corners, the transparent center |
| `walk_cycle.png` | Walk cycles | The 4×2 grid of tall cells, baseline, head height, walking right |
| `creature_sheet_2x2.png` | Small creature sheets (the monkey) | The 2×2 grid, baseline, facing right |
| `expression_sheet.png` | Expression sheets | Where the face sits in each of the six cells |
| `prop_view.png` | Objects (props) | The camera angle (how flat a circle on the ground looks), the ground line, a hero for scale |
| `story_card.png` | Story cards | What a 16:9 screen cuts off, and the strip the narration box covers |
| `map_island.png` | The island map (wave 04) | Where each place's landmark and each trail goes, what a 16:9 screen cuts off, and the corners the game's buttons cover |
| `explore_<place>.png` | Painted exploration scenes (wave 04) | Where every object goes and how big it is, the ground he walks on, spots to leave clear for characters, the exits, and the strips the screen never shows. The same boxes are in `explore-layouts.json`. Drawn from the game's own coordinates |

**How to use a guide:**
- Pass it as an extra reference image, after the style anchors and any character reference.
- Add this sentence to the asset prompt: "The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text."
- **QA:** if any guide line, color block, dashed outline or word shows up in the result, regenerate (at most 3 attempts), then flag it.

## Painted exploration scenes (wave 04)

Each place he explores is **one painting with its objects painted in**: the chest, the gate, the cage. Objects painted on their own and set on top of a background never quite belong, so this is how the game gets them to look like one picture:

- **The painting** is the place with every object in its starting state (the chest closed, the gate sealed). Characters are sprites drawn on top, so nothing is painted in front of where they walk.
- **Each change of state** (the chest opens) is a **variant**: the same painting, edited so that only that object changes. `tools/art/scene_patches.py` compares it with the painting, cuts out just what changed, with a soft edge, and saves a small patch. The game lays the patch over the painting when that state is on.
- **The manifest records where each object is** (`objects`, measured on the finished painting), so the game knows what he clicked. You don't need pixel accuracy: within about 10 px is fine.
- **In the game** (`src/world/painted.js`): the measured boxes become click areas and spots to stand; things lying on the walkable ground (a tide pool) and standing on it (a chest) are walked around; and the floor in front of the nearest standing object slides in perspective as the camera pans, while everything standing moves as one piece. So objects at the back edge of the ground are best, and anything standing on the walkable ground needs room to walk round it.
- **Scale:** wave 04's paintings came out with objects about 1.5 to 2.5 times the guides' sizes, so the game draws people in painted scenes 1.6 times bigger than the guides' figures (`stage-layout.json`, `explore.painted`). The next place's guide should show the figures at that size, so new paintings match.

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
  ui/<id>.webp                      interface art: icon sheets, window frame, cursor, logo
  fiends/<id>/portrait.webp         portraits (also bosses/<id>/portrait.webp)
  backgrounds/battle/<id>_fg.webp   foreground parallax layers (transparent)
  titans/<id>/<pose>.webp           Titan poses (base, roar, attack)
  props/<id>.webp                   objects he finds while exploring (wave 3+)
  characters/npc_<id>/...           story characters: base, portraits (wave 3+)
  characters/mascot_monkey/field.webp  the monkey's story poses (wave 3)
  scenes/story_<id>.webp            illustrated story cards (wave 3+)
  scenes/explore/<id>.webp          painted exploration scenes (wave 4+)
  scenes/explore/<id>__<state>.webp their state patches, cut by tools/art/scene_patches.py
  scenes/map/<id>.webp              island maps (wave 4+)
art/scenes/<id>/<state>.webp        full-size state variants (input to the patch script; not shipped)
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

The `kind` values are `anchor`, `hero`, `ally`, `tutor`, `mascot`, `npc`, `fiend`, `boss`, `titan`, `background`, `scene`, `prop`, `fx`, `icons` and `ui`.

Fields added in wave 02:
- `portrait` on fiends and bosses: `{ "src", "w", "h" }`.
- `fg` on backgrounds: the transparent foreground layer, `{ "src", "w", "h" }`.
- `floorEdge` on backgrounds: where the back edge of the arena floor sits, as a fraction of the image height. It defaults to 0.6, the stage guide's orange line.
- `poses` on titans, like bosses: `{ "roar": { "src" }, "attack": { "src" } }`.
- `ui` assets:
  - Icon sheets use `sheet` with `names`.
  - The window frame is `base` plus `"slice": 96`.
  - The cursor is `base` plus `"hotspot": [x, y]`.
  - The logo is `base`.

Fields added in wave 03:
- `walk` on heroes: `{ "src", "cell": [384, 512], "cols": 4, "rows": 2, "frames": 8, "fps": 10, "anchor", "facing": "right" }`.
- `field` on `mascot_monkey`: a 2×2 sheet like a fiend's, with `frames` naming the poses.
- Props: `{ "kind": "prop", "base": { "src", "w", "h", "anchor" } }`, where the anchor is the center of the object's base.
- Story characters: `{ "kind": "npc", "base": { … }, "portraits": { … } }`, the same shapes as the heroes.
- Story cards: `{ "kind": "scene", "base": { "src", "w", "h" } }`.

Fields added in wave 04:
- **Painted exploration scenes:**

  ```json
  "scene_cove": {
    "kind": "explore", "wave": 4, "status": "draft",
    "base": { "src": "scenes/explore/scene_cove.webp", "w": 1536, "h": 1024 },
    "battle": "bg_shipwreck_cove",
    "objects": {
      "chest": { "box": [270, 680, 400, 778], "ground": [338, 775] },
      "sign": { "box": [700, 520, 830, 700], "ground": [768, 698],
                "boards": [ { "center": [745, 560], "width": 90, "height": 24, "tilt": 4 } ] },
      "wreck": { "box": [290, 300, 1360, 585] }
    },
    "states": {
      "chest_open": { "object": "chest", "src": "scenes/explore/scene_cove__chest_open.webp", "x": 262, "y": 640, "w": 150, "h": 140 }
    }
  }
  ```

  `objects` boxes and ground points are in painting pixels. `states` start as `{ "object" }`; the patch script adds `src`, `x`, `y`, `w` and `h`.
- **Island maps:** `"map_driftwood": { "kind": "map", "base": { "src", "w", "h" }, "places": { "cove": [x, y], … }, "trails": { "cove-temple": [[x, y], …], … } }`, in painting pixels.
- `kind` gains `explore` and `map`.

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
  - `art/scenes/**` (state variants, wave 04)
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
| [02: Interface and depth](waves/wave-02-ui-and-depth.md) | Command icons, window frame, cursor, logo, portraits, foreground layers, the cove arena, the Titan summon | Done, in review |
| [03: Exploring Driftwood Isle](waves/wave-03-exploration.md) | Captain Jumble, the monkey's story poses, walk cycles, the island's objects, item and exploring icons, story cards | Done, in review |
| [04: Painted places](waves/wave-04-scenes.md) | Five painted exploration scenes with their objects painted in (two new places: the temple's Hall of Glyphs and the Tide Grotto), state patches, two new battle arenas, hero battle sheets that face the fight, the island map | Done (draft) |
| [05: Polish](waves/wave-05-polish.md) | The galleon ramming the Albatross, the title screen with Maren, exploring poses for Wren and Maren, Tidebreaker's attack uncut, the distant views of the cove, canyon and grotto on their own (for depth to the horizon), and the party riding the rope down to the grotto | Done (draft) |
| 06: Driftwood Harbor | The harbor town, townspeople (Honest Hal, the Sword Master), more fiends | Written when chapter 2 is designed |
