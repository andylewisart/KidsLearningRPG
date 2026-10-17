# Wave 11: The fog signs

Driftwood Harbor has three street signs the fog has eaten (`fog1`, `fog2`, `fog3` in `src/world/data2.js`). Give a word its prefix or suffix back and the sign clears. Until now the game drew them itself: a blurry white box, then a flat tan box with the word spilling out of it. The parent said it looked nothing like the rest of the art. This wave paints the sign and the fog, and the game writes the word on the board.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: painted 17 October (take B of the sign, take A of the fog; all four takes in the project files, `fog-sign/takes/`), wired in, waiting on the parent's look.**

**References for both:** `anchors/key_art.webp` (style), `scenes/explore/scene_harbor.webp` (the street the signs hang in), and `props/prop_signpost.webp` (chapter 1's painted wood, so the boards match).

**Don't edit game code.** Claude wires the art in, and the game keeps working without it.

---

## ☑ `prop_fog_sign`

Master style prompt + sprite block + rules block, then:

```text
A blank wooden shop sign for a seaside harbor town, seen straight on: one wide plank of sun-bleached, sea-weathered driftwood, about three times as wide as it is tall, with rounded worn corners, a thin dark tarred rope border nailed around its edge, small rusty iron nail heads, a little green barnacle crust on one bottom corner, and a tiny brass anchor bracket at the top of each end. It hangs level from two short dark iron chains that rise from the top corners. The middle of the plank is a big smooth, light, evenly lit wooden face with NOTHING on it: no letters, carving or paint, because the game writes the word there. Painted in the same warm, detailed style and golden light as the attached harbor scene and signpost. Transparent background, no shadow.
```

Canvas `1536x640`, the plank filling the width with the chains above it. Save to `props/prop_fog_sign.webp`, and add it to the manifest like `prop_signpost`, plus `face: [x0, y0, x1, y1]`, the blank face's box in its pixels.

## ☑ `fx_fog_wisp`

Master style prompt + effects block + rules block, then:

```text
One soft, drifting bank of sea fog, wider than it is tall: pale silvery-blue, thick and creamy in the middle, feathering out into thin curling wisps at the edges, with a faint cool glow and two or three tiny blue-green motes of light caught in it. Painterly brush texture, like the mist in the attached harbor scene, not a photo and not a cartoon cloud.
```

Canvas `1024x512` on pure black (the game turns the black into transparency when it lands). Save to `fx/fx_fog_wisp.webp`.
