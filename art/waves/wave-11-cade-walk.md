# Wave 11: Cade walks with both legs

Cade's walk cycle (`characters/ally_knight/walk.webp`, wave 03) doesn't alternate his feet. Six of its eight frames are nearly the same wide stance, and both "passing" frames (3 and 7) lift the same front knee high. Played in the game, he looks like he hitches up his left knee over and over instead of stepping left, right, left. Code can't fix that (`tools/art/even_walks.py` already evened out his size and stride), so this wave repaints the walk.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) ("Walk cycle") and [`../STYLE.md`](../STYLE.md).

**Status: ready, written 17 October.**

**Work on `claude/cade-walk-cycle-3rnd7l` only.** Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**Don't overwrite the game's picture or edit code.** Put candidates in `art/review/wave-11/` as below. Claude picks one, evens it out with the art tools and wires it in.

---

## References

Attach all three to every request:

1. `public/assets/characters/ally_knight/base.webp`: Cade himself (the look to match exactly).
2. `public/assets/characters/ally_knight/walk.webp`: the old walk, for his outfit and how he carries the sword on his shoulder and the shield on his near arm. **Not for the leg poses**, which are what's wrong with it.
3. `art/review/wave-11/walk_pose_guide.png`: the leg pose in each of the 8 frames, as a stick figure. **Red is his near leg (his left), blue is his far leg (his right).** Frames 1 to 4 are one step with the red leg landing in front; frames 5 to 8 are the same step with the blue leg in front. Don't copy the colors, lines, labels or gray body; it shows only where the legs go.

## The prompt

```text
A side-view walk cycle sprite sheet for a 2D game: the SAME armored young knight as in the first reference, in 8 frames in a grid of 4 columns and 2 rows of equal cells (1536x1024, each cell 384x512), on a fully transparent background, with no grid lines, labels or text. Full body, the same size and scale in every frame, feet on the same invisible baseline near the bottom of each cell, walking toward the RIGHT in a calm, steady, natural walk (not a march, no high knees). Match the first reference exactly: face, hair, red scarf and cape, blue-and-steel armor, the glowing blue sword resting on his far shoulder and the crystal shield on his near arm, held the same way in every frame. Only the legs (and a gentle sway of the cape) change between frames.

The legs follow the attached pose guide frame by frame. His two legs must alternate: in frames 1 to 4 his NEAR (left) leg steps forward, and in frames 5 to 8 his FAR (right) leg steps forward.
1 contact: near heel lands in front, far leg behind on its toes.
2 down: weight on the near leg, slightly bent; far foot lifts off behind.
3 passing: near leg straight under his hips; far leg swings forward past it, knee bent, foot just off the ground (low, not raised high).
4 up: near leg pushes off behind; far leg reaches forward, about to land.
5 contact: far heel lands in front, near leg behind on its toes.
6 down: weight on the far leg; near foot lifts off behind.
7 passing: far leg straight under him; near leg swings forward past it, foot just off the ground.
8 up: far leg pushes off behind; near leg reaches forward.
His head and body rise a little in frames 3-4 and 7-8 and dip a little in 2 and 6. The near leg is drawn in front of the far leg, and the far leg is a touch darker, so the two read as different legs.
```

## What to make

Run each up to twice if the first try fails the checks below.

### ☐ Candidate A: the whole sheet at once

The prompt above, with the three references. Save as `art/review/wave-11/walk_A.png` (1536x1024, transparent).

### ☐ Candidate B: one frame at a time

Eight requests, one per frame: the same prompt, but asking for **one** 384x512 frame (the cell of the pose guide for that frame, cropped, as the third reference; frame 1's result added as a fourth reference for frames 2 to 8, so they match it). Assemble them in order into `art/review/wave-11/walk_B.png` (1536x1024, 4 columns by 2 rows).

### Checks (each candidate)

- Transparent background, 1536x1024, 8 cells in reading order, nothing crossing into a neighbor's cell.
- In frames 1 and 5 the leg in front is a **different** leg (near in 1, far in 5). Frames 3 and 7 lift different legs, and neither lifts its knee above mid-thigh height.
- Same Cade in every frame: same size, sword on the shoulder, shield on the near arm.

Commit the candidates (and a line in `art/review/wave-11/notes.md` on which passed the checks) to `claude/cade-walk-cycle-3rnd7l` and push.
