# Clean plates for painted places (Codex)

Each painted place below has near things the game now slides as cut-out cards
(`tools/art/scene_depth.py`). Behind them it needs a clean plate: the same
painting with those things taken out, so the strip a card uncovers as the
camera pans is painted, not doubled.

For each scene: give Codex the painting (`public/assets/scenes/explore/<scene>.webp`,
as PNG) as the first image and `art/review/depth/<scene>-near.jpg` (the same
painting with the parts to remove tinted magenta) as the second, with this brief,
the scene's line filled in:

> Edit the first image. Keep the exact same camera, framing, perspective,
> lighting and painterly style, landscape 1536x1024. Remove only what the second
> image tints magenta: {remove}. Paint what would be behind them: {behind}.
> Everything else stays exactly where it is, unchanged. No people, no new
> objects, no text.

Save as `art/review/depth/plate/<scene>_plate_1.png`, exactly 1536x1024.

| scene | remove | behind |
|---|---|---|
| scene_temple | the big leafy plants with red flowers in the bottom-left and bottom-right corners | the same cracked paving stones continuing to the corners |
| scene_canyon | the rocks and crystals in the bottom-right corner | the same cracked stone floor continuing to the corner |
| scene_hal_shop | the stacked crates, chests and the glowing crystal at the left edge, and the crates and potted palm in the bottom-right corner | the shop's stone floor and rug, the open side with the sea view at the left, and the floor continuing at the bottom right |
| scene_sword_dock | the crates, rope coils, plants and crystals at the right edge | the wooden dock planks, posts and sea continuing to the right edge |
| scene_menagerie | the tall glass tank, lanterns, cabinets and crates along the left side, and the straw nests, cushions and sleeping creatures along the right side with the crates in the bottom-right corner | the wooden floor, stairs and walls continuing on both sides |
| scene_lighthouse | the cliff with plants along the left edge, and the crates and lantern at the right edge | the stone path, sea and rocks continuing to both edges |
| scene_lamp_room | the plant in the bottom-right corner | the same tiled floor and rug continuing to the corner |
| scene_sea_cave | the barrels and rope at the bottom left, and the crates, diving helmet and rope at the right edge | the wet stone floor, water and cave wall continuing to both edges |
| scene_sage_library | the leafy plants in the bottom-left and bottom-right corners | the same marble floor with its gold inlay continuing to the corners |
| scene_lair_deep | the carved stone pillar, plants and crystals along the left side, and the crystals at the right edge | the stone floor, water and waterfalls continuing to both edges |
| scene_camp | the palm fronds, crates, lantern and rope along the left and right edges | the sandy beach, rocks and night sea continuing to both edges |
