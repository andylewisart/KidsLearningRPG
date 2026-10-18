# Wave 13: Distant views for the harbor places

**Why:** the parent's note after playing the depth update: "Why do I not feel the depth on anything but the foreground?" In a painted place the game slides the floor in rows, near ground faster than far, but everything from the back of the floor up (the camp's fire and crystal, the sea, the cliffs, the moon) slides as one flat picture. The cove, canyon and grotto already fix this with a distant view painted on its own (wave 05, Section E), which the game moves at about half speed behind the rest. The harbor places never got one.

Camp goes first, to prove it in the game before the other open-air places.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md). **Don't edit game code.** Claude wires the art in.

---

## Section A: Camp's distant view

**Edit the finished scene; don't paint a new picture.** Give Codex `public/assets/scenes/explore/scene_camp.webp` as the image to edit, with the brief below. **Any change to the kept parts shows up in the game as a mistake**, so they must stay identical: same framing, light, colours and details.

```text
Edit this image. Keep every pixel of the night sky, the stars, the clouds and the full moon; the distant island cliffs with their jungle, ruined towers, glowing blue crystals, stone arch and waterfalls; the sea stacks; the open sea with its moonlit reflection and surf; the rocks standing in the water; and the wrecked ship in the water on the right, exactly the same: same framing, light, colours and details. Remove the whole beach camp: all the sand, the campfire and its ring of stones, the tall glowing crystal, the cooking tripod and pot, the tree stumps, the canvas shelter and its poles, the lantern posts and lanterns, the crates, chests, rugs and jugs, the little monkey, the flags on the right post, the driftwood logs, the plants and flowers along the bottom, and the palm trees and fronds in both top corners. Where they were, continue the distant view naturally: the sea and its rocks and surf continue down to the bottom of the picture, as if looking out over open water from a boat, and the sky, cliffs and moonlit sea continue behind where the palms, crystal and posts stood. No people, no text, no new objects. Landscape 1536x1024.
```

- **Make three attempts.** Save each one resized to exactly 1536x1024 as PNG: `art/review/wave-13/raw/scene_camp_far_1.png`, `_2.png`, `_3.png`.
- **QA (Claude checks, before wiring in):**
  - Nothing near is left behind: no sand, stumps, posts, leaves, flags or bits of the crystal.
  - Behind where the crystal, the shelter and the right-hand post stood, the cliffs, sea and sky continue naturally for at least 150 px in from their edges (the game slides the camp that far aside and shows what's behind).
  - The kept parts line up with the painting: the moon, the arch, the sea stacks and the wreck sit in the same places.
- **Output (Claude):** `public/assets/scenes/explore/scene_camp_far.webp`, `1536x1024`, opaque, at most 500 KB, and `"far": { "src", "w", "h" }` in the scene's manifest entry. Draft until the parent approves it in the game.

## Notes

- Section A run on the parent's PC (three attempts in `art/review/wave-13/raw/`); attempt 2 lines up best, 1 and 3 reframed the cliffs. **Not used in the game.** Before it was wired in, the parent asked whether the back could simply be moved by its depth map instead of split into more layers. It can: the camp now bends by its depth map (`tools/art/scene_depthmap.py`, `src/ui/projection.js`), with no extra painting. A first try that tore the painting at depth edges and showed this attempt through the gaps shredded the fire, rocks and tripod, because Codex's fill is open sea where sand and the crystal's base should be. Bending the camp as one picture then smeared the sea and rocks beside the crystal, so the camp is now split into layers where its depth jumps (the back, the sea rocks, the shelter and crystal, the palm trunk), and what each layer hides is healed from the painting's own pixels (a shift-map fill, like content-aware fill), still with no extra painting. Kept here in case a scene needs a real fill later.
