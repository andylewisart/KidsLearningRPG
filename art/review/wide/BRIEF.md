# Wider paintings (Codex)

The game slides a painted place's near floor faster than its back wall, so at
the end of a pan the near rows run past the painting's sides, where nothing is
painted (until now the game filled that with a mirror image). Each painting
needs 256 more pixels painted on its left and on its right.

Codex paints at 1536x1024, so each side is its own job:

1. Make the input canvas (1536x1024, PNG): fill it with pure magenta (255,0,255).
   - **left**: paste the source's columns 0-1279 at x=256 (the magenta strip is x 0-255).
   - **right**: paste the source's columns 256-1535 at x=0 (the magenta strip is x 1280-1535).
2. Give Codex that canvas with this brief:

> Edit this image. Paint over only the solid magenta strip on the {left|right}
> edge, continuing the scene outward naturally: the same floor, walls, sky,
> water and objects running on past the edge, in exactly the same painterly
> style, lighting, perspective and colours. Keep everything outside the magenta
> strip exactly as it is, unchanged, pixel for pixel. No people, no text, no
> new characters. Landscape 1536x1024.

3. From Codex's result (resized to exactly 1536x1024 if needed), keep the strip
   plus 32 pixels of overlap: **left** keeps columns 0-287, **right** keeps
   columns 1248-1535. Save it as JPEG quality 95 to
   `art/review/wide/<scene>_<source>_<side>.jpg` (288x1024).

The "plate" sources are the paintings with their near things taken out; give
them the same brief. 54 jobs:

| scene | source | file |
|---|---|---|
| scene_biscuit | paint | public/assets/scenes/explore/scene_biscuit.webp |
| scene_biscuit | plate | public/assets/scenes/explore/scene_biscuit__plate.webp |
| scene_camp | paint | public/assets/scenes/explore/scene_camp.webp |
| scene_camp | plate | public/assets/scenes/explore/scene_camp__plate.webp |
| scene_canyon | paint | public/assets/scenes/explore/scene_canyon.webp |
| scene_canyon | plate | public/assets/scenes/explore/scene_canyon__plate.webp |
| scene_cove | paint | public/assets/scenes/explore/scene_cove.webp |
| scene_grotto | paint | public/assets/scenes/explore/scene_grotto.webp |
| scene_hal_shop | paint | public/assets/scenes/explore/scene_hal_shop.webp |
| scene_hal_shop | plate | public/assets/scenes/explore/scene_hal_shop__plate.webp |
| scene_harbor | paint | public/assets/scenes/explore/scene_harbor.webp |
| scene_lair_deep | paint | public/assets/scenes/explore/scene_lair_deep.webp |
| scene_lair_deep | plate | public/assets/scenes/explore/scene_lair_deep__plate.webp |
| scene_lamp_room | paint | public/assets/scenes/explore/scene_lamp_room.webp |
| scene_lighthouse | paint | public/assets/scenes/explore/scene_lighthouse.webp |
| scene_lighthouse | plate | public/assets/scenes/explore/scene_lighthouse__plate.webp |
| scene_menagerie | paint | public/assets/scenes/explore/scene_menagerie.webp |
| scene_menagerie | plate | public/assets/scenes/explore/scene_menagerie__plate.webp |
| scene_sage_library | paint | public/assets/scenes/explore/scene_sage_library.webp |
| scene_sage_library | plate | public/assets/scenes/explore/scene_sage_library__plate.webp |
| scene_sea_cave | paint | public/assets/scenes/explore/scene_sea_cave.webp |
| scene_sea_cave | plate | public/assets/scenes/explore/scene_sea_cave__plate.webp |
| scene_sword_dock | paint | public/assets/scenes/explore/scene_sword_dock.webp |
| scene_sword_dock | plate | public/assets/scenes/explore/scene_sword_dock__plate.webp |
| scene_temple | paint | public/assets/scenes/explore/scene_temple.webp |
| scene_temple | plate | public/assets/scenes/explore/scene_temple__plate.webp |
| scene_temple_hall | paint | public/assets/scenes/explore/scene_temple_hall.webp |
