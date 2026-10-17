# Wave 11: Kit without a hat

At the end of chapter 1, Pockets steals Kit's tricorn ("Hey! My hat!"). Kit used to put on a spare, but on 17 October the parent dropped the spare: Kit is hatless from the theft until it buys Hal's tea cozy in chapter 2, which is why it goes looking for a hat at Hal's at all. This wave paints that look.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: painted 17 October through Codex on the parent's PC, and wired in. Waiting for the parent's look.**

**Work on `claude/hatless-kit-te8mqd` only.** Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**How to edit:** change Kit's head and nothing else. Every picture keeps its path, canvas, pose, size and framing, so the game can swap the hatless one for the hatted one.

## The bare dome

Every prompt in this wave uses this paragraph for what's under the hat:

```text
Where the hat was, show the top of Kit's round body: the same weathered white ceramic plating with brass seams and rivets, the panel lines continuing over the crown, and a small round brass cap at the very top. Around the crown, a slightly cleaner, paler ring where the hat always sat, like a tan line, so it looks freshly and a little embarrassingly hatless. Nothing on its head: no hat, no feathers, no cloth, no hair.
```

---

## Section A: Kit on the field

### ☑ `tutor_droid`, `field_hatless.webp`

An edit of `base.webp` (the edit target). Same canvas (`901x1024`) and anchor as `base`.

```text
Edit target: the attached droid sprite. Keep everything exactly as it is (the round white-and-brass body, the big cyan lens-eye, the crystal core, the two fins, the jets, the pose, the size, the framing, the lighting and the painted CG style) and change only its head: remove the navy tricorn and its feathers completely. [The bare dome.] Transparent background, no shadow.
```

Save to `characters/tutor_droid/field_hatless.webp`, and add `field_hatless` to `tutor_droid` in the manifest with `src`, `w`, `h` and the same `anchor` as `base`.

## Section B: Kit's faces

### ☑ `tutor_droid`, `portraits_hatless.webp`

An edit of `portraits.webp`, one cell at a time (crop the 512×512 cell, edit it, paste it back in the same place), with `field_hatless.webp` attached as the reference for the dome. Same moods and layout as `portraits.webp`.

```text
Edit target: the first image, one cell of Kit's expression sheet. Keep the lens-eye and its expression exactly, any little mood mark beside it, and the body, fins, jets, pose, size and framing. Remove the navy tricorn and its feathers, and show the top of its body as in the second image (Kit with no hat). [The bare dome.] Same background as the first image.
```

Save to `characters/tutor_droid/portraits_hatless.webp`, and add `portraits_hatless` to `tutor_droid` in the manifest with the same `cell`, `cols`, `rows` and `frames` as `portraits`.

## Section C: The harbor card

### ☑ `story_harbor_arrival`

The party walks into the harbor before Kit has the cozy, so Kit has no hat here. Edit only Kit: crop `x 896 to 1280, y 480 to 864`, edit the crop with `field_hatless.webp` as the reference, and paste it back, blending only around Kit's head.

```text
Edit target: the first image, a crop of a painted story card. Change only the little floating droid's head: remove its navy tricorn and feathers, and paint the top of its round body as in the second image (Kit with no hat). [The bare dome.] Keep everything else exactly as it is: the robe and sandals behind it, the steps, the docks, the sea, the light and the brushwork. Same framing and size.
```

---

## Notes

(Add a line here for anything flagged or skipped.)

- 2026-10-17: all eight Codex jobs (the field sprite, six faces, the harbor crop) passed on the first attempt. Codex returned bigger canvases (1176x1337, 1254x1254); Claude scaled each back and lined its body up with the original's (width and bottom edge) so the swap doesn't jump. The tan-line ring is faint or missing, and the bare crown comes out a little taller and egg-shaped, with a brass cap, the same in every picture. Originals on the parent's PC in `Downloads\codex-images\wave-11-kit-hatless\out`.
