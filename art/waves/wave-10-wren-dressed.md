# Wave 10: Captain Wren, dressed for all ages

Wren's chapter 1 art shows her in a cropped blouse with a bare midriff and a low neckline, and in ripped shorts that leave one thigh bare. The all-ages rule in [`../STYLE.md`](../STYLE.md) ("tops reach the waistband, necklines sit at the collarbone") says no to all three. On 14 October the parent chose to cover her up.

Chapter 2 already dresses her that way: in `scenes/story_harbor_arrival.webp` (wave 08, approved) she wears a teal collared shirt and full dark trousers. The parent picked that look for both chapters and the films. This wave redoes every game picture of her and the references the parent's films start from. The intro video thread repaints its own keyframes to match.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: ready, written 14 October. Run it after wave 09.**

**Work on `claude/project-thread-ftrlee` only** (PR #3, chapter 2's branch). Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Every file keeps its path, canvas size and layout, so the game picks the new pictures up as they are.

**Besides what `PRODUCTION.md` allows,** this wave may write `art/video-refs/ally_gunner/` and the six files in `art/video-refs/frames/` that Section D names.

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

### ☑ `ally_gunner`, `base.webp`

The edit target is `characters/ally_gunner/base.webp` (681×1024). Keep the same canvas, the same `anchor`, and the transparent background with no shadow.

Everything after this uses it as a reference, so check it against the look reference before going on.

---

## Section B: Her sheets

Each one is an edit of the sheet at the same path, with the same canvas, cells, frame order and facing as its manifest entry. References: the sheet itself (the edit target), the look reference and the new `base.webp`.

| ☐ | Sheet | Layout |
|---|---|---|
| ☑ | `characters/ally_gunner/battle.webp` | 3 × 2 cells of 512 px, facing left: idle, attack, cast, hurt, ko, victory |
| ☑ | `characters/ally_gunner/portraits.webp` | 3 × 2 cells of 512 px: neutral, laughing, angry, shocked, smug, worried. The shirt's collar shows here most, so keep it buttoned to the collarbone in all six. |
| ☑ | `characters/ally_gunner/walk.webp` | 4 × 2 cells of 384 × 512, eight frames, facing right. The legs show the trousers best here. |
| ☑ | `characters/ally_gunner/field.webp` | 2 × 2 cells of 512 px, facing right: angry, shout, talk, pleased |

**The walk:** play the eight frames in a row to check them. If her upper body now jumps between frames, remove `"aligned"` from the walk entry and run `python3 tools/art/align_walks.py` again.

---

## Section C: The big pictures

Each of these is an edit of the picture at the same path, changing Wren's clothes and nothing else. References: the picture itself (the edit target), the look reference and the new `base.webp`. All are 1536×1024.

| ☐ | Picture | Where Wren is | Where the game shows it |
|---|---|---|---|
| ☑ | `scenes/title_art.webp` | left of center, aiming a blaster | the title screen |
| ☑ | `scenes/story_deck.webp` | at the ship's wheel, on the left | the opening, on the deck |
| ☑ | `scenes/story_fall.webp` | swinging on a rope, on the right | the opening, after the galleon rams the ship |
| ☑ | `scenes/story_descent.webp` | on the rope, between Cade and Knox | the ride down to the grotto |
| ☑ | `scenes/story_crystal_remade.webp` | second from the left, reaching up | the chapter 1 ending |
| ☑ | `anchors/key_art.webp` | the same as the title art | a fallback when a picture is missing, and every wave's style reference |
| ☑ | `anchors/cast_lineup.webp` | second from the left, beside Cade | every wave's style reference |
| ☑ | `anchors/battle_mock.webp` | right of center, firing | a style anchor (`STYLE.md`) |

- She is small in `story_descent`, so the edit there is mostly the shirt's color and her trousers.
- `story_deck`, `story_fall` and `story_crystal_remade` are also films' first frames: Section D exports them.

---

## Section D: For the parent's films

### ☐ `art/video-refs/ally_gunner/`: front, left and right

Wave 06's character references for the video tool (`wave-06-ending.md`, Section A): 1024×1536, JPEG quality 90, at most 700 KB each. Edit each of the three in place, same pose, size and plain light-gray background. Do the front first, then pass the new front as a reference for both profiles, so all three match.

### ☐ `art/video-refs/frames/`: the three cards' first frames

Export each of Section C's three film cards twice, overwriting the files that are there:
- `<id>.jpg`: the whole painting, 1536×1024, JPEG quality 92.
- `<id>-16x9.jpg`: its middle 16:9 (the part the game shows), at the existing file's size: 1920×1080 for `story_deck` and `story_fall`, 1536×864 for `story_crystal_remade`.

Leave `story_fall_first.jpg` and `story_ram_first.jpg` alone. They belong to the intro video thread.

---

## ⛔ Gate: review at the end

Commit, and write `art/review/wave-10.md` with every asset shown before and after, side by side. Show the walk as a strip of all eight frames, and the look reference beside the new base. Then tell the parent what to review.

## After this wave (the parent's, not Codex's)

- The chapter 1 ending's crystal film (`public/assets/video/ending_crystal.mp4`) starts from `story_crystal_remade`, so it shows her old outfit until it's remade. Use the new `frames/story_crystal_remade-16x9.jpg` and the prompt in `art/video-refs/ending-clips.md`.
- The intro's new films start from the intro video thread's repainted keyframes.

## Notes

(Add a line here for anything flagged or skipped.)
