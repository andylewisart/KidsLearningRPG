# Wave 10: Captain Wren, dressed for all ages

Wren's chapter 1 art shows her in a cropped blouse with a bare midriff and a low neckline, and in ripped shorts that leave one thigh bare. The all-ages rule in [`../STYLE.md`](../STYLE.md) ("tops reach the waistband, necklines sit at the collarbone") says no to all three. The parent chose to cover her up: Codex is repainting her in the intro films' frames, and this wave gives the game the same look.

Chapter 2 already dresses her this way: in `scenes/story_harbor_arrival.webp` (wave 08, approved) she wears a teal collared shirt and full dark trousers. That is the look, so chapter 1, chapter 2 and the films all match.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: ready, written 14 October. Run it after wave 09.**

**Work on `claude/project-thread-ftrlee` only** (PR #3, chapter 2's branch). Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Every file keeps its path, canvas size and layout, so the game picks the new pictures up as they are.

**Leave these alone:** `scenes/story_deck.webp`, `scenes/story_fall.webp` and `scenes/story_crystal_remade.webp`, and `art/video-refs/`. They are the films' first frames, and the intro video thread repaints them.

---

## The look

Every prompt in this wave starts with this paragraph:

```text
Change only Wren's clothes, so she is dressed for an all-ages game, exactly as in the look reference: her cropped white blouse and the dark top under it become one loose teal shirt with a collar, buttoned up to her collarbone and tucked in under her belts, so no skin shows between the shirt and the belts and nothing is low-cut. Her ripped shorts and torn stocking become full dark brown canvas trousers, with the same thigh straps, holsters, brass knee guard and buckled boots over them, so no bare thigh shows. Keep everything else exactly as it is: her face and expression, her pose, size and framing, her arms, the copper-red braid, teal bandana and goggles, the long patched rust-red coat, the brass mechanical left arm, the crossed belts and the bandolier of glowing orange cells, the twin orange blasters, and the background.
```

**The look reference:** crop Wren out of `scenes/story_harbor_arrival.webp` (x 420 to 780, y 120 to 864 in its 1536×864 pixels) and attach it to every request, next to the picture being edited.

**How to edit:** change her clothes and nothing else.
- **Sheets:** edit one cell at a time (crop the cell, edit it, paste it back in the same place), so every frame keeps its position and the anchors still line up.
- **Big pictures:** edit a crop around Wren and paste it back with a soft edge, so the rest of the picture stays exactly as it was.

---

## Section A: Her base

### ☐ `ally_gunner`, `base.webp`

The edit target is `characters/ally_gunner/base.webp` (681×1024). Keep the same canvas, the same `anchor`, and the transparent background with no shadow.

Section B uses this as its second reference, so check it against the look reference before going on.

---

## Section B: Her sheets

Each one is an edit of the sheet at the same path, with the same canvas, cells, frame order and facing as its manifest entry. References: the sheet itself (the edit target), the look reference and the new `base.webp`.

| ☐ | Sheet | Layout |
|---|---|---|
| ☐ | `characters/ally_gunner/battle.webp` | 3 × 2 cells of 512 px, facing left: idle, attack, cast, hurt, ko, victory |
| ☐ | `characters/ally_gunner/portraits.webp` | 3 × 2 cells of 512 px: neutral, laughing, angry, shocked, smug, worried. The shirt's collar shows here most, so keep it buttoned to the collarbone in all six. |
| ☐ | `characters/ally_gunner/walk.webp` | 4 × 2 cells of 384 × 512, eight frames, facing right. The legs show the trousers best here. |
| ☐ | `characters/ally_gunner/field.webp` | 2 × 2 cells of 512 px, facing right: angry, shout, talk, pleased |

**The walk:** play the eight frames in a row to check them. If her upper body now jumps between frames, remove `"aligned"` from the walk entry and run `python3 tools/art/align_walks.py` again.

---

## Section C: The big pictures

Each of these is an edit of the picture at the same path, changing Wren's clothes and nothing else. References: the picture itself (the edit target), the look reference and the new `base.webp`.

| ☐ | Picture | Where Wren is | Where the game shows it |
|---|---|---|---|
| ☐ | `scenes/title_art.webp` | left of center, aiming a blaster | the title screen |
| ☐ | `anchors/key_art.webp` | the same as the title art | a fallback when a picture is missing, and every wave's style reference |
| ☐ | `anchors/cast_lineup.webp` | second from the left, beside Cade | every wave's style reference |
| ☐ | `anchors/battle_mock.webp` | right of center, firing | a style anchor (`STYLE.md`) |
| ☐ | `scenes/story_descent.webp` | on the rope, between Cade and Knox | the ride down to the grotto |

She is small in `story_descent`, so the edit there is mostly the shirt's color and her trousers.

---

## ⛔ Gate: review at the end

Commit, and write `art/review/wave-10.md` with every asset shown before and after, side by side. Show the walk as a strip of all eight frames, and the look reference beside the new base. Then tell the parent what to review.

## Notes

(Add a line here for anything flagged or skipped.)
