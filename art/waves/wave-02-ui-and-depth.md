# Wave 02: Interface art, portraits, depth layers and the summon

Art that makes the game feel finished: painted menu icons and window frames instead of emoji, portraits for the turn-order bar, foreground layers for camera parallax, a third battle arena, and a proper Titan summon. Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), **including the new "Guides" section**.

**Run the whole wave straight through.** The parent asked for overnight generation, so there is one review gate, at the end.

**Every asset uses these references unless it says otherwise:**
- `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style.
- The **guide** named in the asset's own entry, from `art/guides/`. Guides are construction drawings. Pass them as an extra reference image and add the guide sentence from PRODUCTION.md. QA every result for leftover guide lines, colors or words.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires new art into the game. If something needs code to show up, write it under Notes.

---

## Section A: Interface art

### ☐ `ui_icons_commands` (icon sheet)

- **Output:** `ui/ui_icons_commands.webp`, `1024x1024`, Sprite block plus the icon-sheet template. Transparent.
- **Guide:** `guides/icon_sheet.png`. It shows the 4×4 cell layout and the safe circle. Draw only the icons.
- **Manifest:** `"sheet": { …, "names": [the 16 names below, in order] }`.

The icons, in reading order:

> **strike**: a crystal greatsword with an ice-blue glowing edge · **fire**: a brass steampunk blaster with an orange muzzle flash · **cast**: an open spellbook with golden rune-letters rising from it · **lash**: a glowing quill whose ink trail curls like a whip · **potion**: a round glass flask of glowing green-gold liquid with a cork · **swap**: two curved arrows chasing each other in a circle · **guard**: a tower shield with a glowing crystal core · **overdrive**: a burst of golden energy with sharp rays · **summon**: a sea titan's crested head rising out of a curling wave · **menu**: three short horizontal gold bars · **back**: a curved arrow pointing left · **hint**: a lit crystal lantern · **talk**: a round droid lens-eye inside a speech-bubble shape · **shard**: a small faceted teal lore-shard crystal · **capture**: a capture crystal with swirling light trapped inside · **star**: a five-pointed gold star

### ☐ `ui_frame` (window frame for menus)

- **Output:** `ui/ui_frame.webp`, `1024x1024`, Sprite block. Transparent.
- **Guide:** `guides/frame_9slice.png`. The game stretches this frame around every menu window: corners stay fixed and edges stretch. Keep everything inside the outer 96 px, and leave the center fully transparent.
- **Manifest:** `"base": { "src": "ui/ui_frame.webp", "w": 1024, "h": 1024 }, "slice": 96`.

```text
A decorative rectangular window frame for a fantasy RPG menu, seen perfectly straight on: a narrow band of polished silver-and-gold metal trim with a thin inner line of glowing ice-blue crystal, over a dark navy glass border. Small crystal-and-filigree ornaments sit in the four corners only. The straight edges between the corners are a plain, even band that can be stretched without looking wrong. The frame reaches the image edges, stays inside the outer 96 pixels, and the whole center is completely empty and transparent.
```

### ☐ `ui_cursor` (menu pointer)

- **Output:** `ui/ui_cursor.webp`, generated at `1024x1024`, then trimmed like a single image. Sprite block. Transparent.
- **Manifest:** `"base": { … }`, plus `"hotspot": [x, y]` at the pointer's tip.

```text
A menu cursor for a classic RPG: a sleek, sharp crystal shard set in an ornate gold cap, pointing to the RIGHT, glowing ice-blue from inside, with a tiny sparkle at its tip. One object, no hand.
```

### ☐ `ui_logo` (title logo)

- **Output:** `ui/ui_logo.webp`, `1536x1024`, Sprite block. Transparent.
- **Text exception:** this is the one asset that must contain text. Replace the rules block's "No text…" sentence with: "The only text is CRYSTAL TITANS and THE SUNDERED ISLES, spelled exactly like that."
- **QA:** check the spelling letter by letter, and regenerate if any letter is wrong.

```text
A video game title logo: the words CRYSTAL TITANS in huge, bold, chiseled letters of faceted ice-blue crystal with gold edges and a bright inner glow, with the silhouette of a colossal sea titan's crested head rising behind the letters, and THE SUNDERED ISLES in smaller, elegant gold capitals underneath. Centered, with clear empty space around it, on a fully transparent background.
```

---

## Section B: Portraits for the turn-order bar and the Bestiary

One portrait per fiend and one for the boss: head and shoulders, three-quarters toward the right. The turn-order bar shows only a small circle of each, so the face must fill the guide's circle.

- **Outputs:**
  - `fiends/fiend_scrap_raptor/portrait.webp`
  - `fiends/fiend_volt_jelly/portrait.webp`
  - `fiends/fiend_magnet_beetle/portrait.webp`
  - `fiends/fiend_ink_slime/portrait.webp`
  - `fiends/fiend_dominion_drone/portrait.webp`
  - `bosses/boss_geode_titan/portrait.webp`
- **Size:** each `1024x1024`, Sprite block, transparent.
- **References:** the creature's own `base.webp` (match it exactly), plus `guides/portrait.png`.
- **Manifest:** add `"portrait": { "src": …, "w": …, "h": … }` to the creature's existing entry.

| ☐ | Asset | Asset prompt (then the guide sentence) |
|---|---|---|
| ☐ | `fiend_scrap_raptor` | A head-and-shoulders portrait of this scrap-metal raptor, jaws half open, glowing orange chest crystal just visible, menacing glare. Match the attached creature reference exactly. |
| ☐ | `fiend_volt_jelly` | A close portrait of this crystal jellyfish's bell and upper tendrils, lightning crackling inside, its glowing eye-spots large and clear. Match the attached creature reference exactly. |
| ☐ | `fiend_magnet_beetle` | A head-on, three-quarter portrait of this armored beetle's head and horseshoe-magnet horns, red and blue tips glowing, little bits of scrap floating near it. Match the attached creature reference exactly. |
| ☐ | `fiend_ink_slime` | A portrait of this ink slime's face: big glowing amber eyes and a wide, mischievous drippy grin, glyph bubbles inside. Match the attached creature reference exactly. |
| ☐ | `fiend_dominion_drone` | A close three-quarter portrait of this war drone's front: the narrow visor with its single red scanning eye, armored plates, a rotor edge. Match the attached creature reference exactly. |
| ☐ | `boss_geode_titan` | A portrait of this colossal geode titan's hammerhead skull: six glowing amber eyes, steam venting from cracked violet crystal plates, roaring. Match the attached creature reference exactly. |

---

## Section C: Depth layers for camera parallax

The game's camera now drifts and pushes in on attacks. A **foreground layer** moves faster than the fighters, and the background slower, which makes the scene feel 3D. Foregrounds sit in front of the fighters, so they may only use the corners and edges.

### ☐ `bg_jungle_ruins` foreground

- **Output:** `backgrounds/battle/bg_jungle_ruins_fg.webp`, `1536x1024`, **transparent**.
- **Blocks:** use the Sprite block's transparency rule, not its "isolated subject" rule.
- **References:**
  - `backgrounds/battle/bg_jungle_ruins.webp`: match its lighting, palette and perspective.
  - `guides/battle_foreground.png`: paint only inside its green areas.
- **Manifest:** add `"fg": { "src": "backgrounds/battle/bg_jungle_ruins_fg.webp", "w": 1536, "h": 1024 }` to `bg_jungle_ruins`.

```text
A foreground layer for the attached jungle-ruins battle background, as if very close to the camera: giant fern fronds and palm leaves hanging down into the top-left and top-right corners, and the mossy edge of a broken sandstone pillar along the far left and far right sides. Lit by the same golden afternoon sun, softly out of focus like a shallow depth of field. Paint only inside the green areas of the attached guide. Everything else, including the whole middle where the fighters stand, is fully transparent.
```

### ☐ `bg_crystal_canyon` foreground

- **Output:** `backgrounds/battle/bg_crystal_canyon_fg.webp`, `1536x1024`, **transparent**.
- **References:** `backgrounds/battle/bg_crystal_canyon.webp`, plus `guides/battle_foreground.png`.
- **Manifest:** add `"fg"` to `bg_crystal_canyon`, as above.

```text
A foreground layer for the attached crystal-canyon battle background, as if very close to the camera: jagged violet-and-blue crystal clusters and dark rock edges in the top-left and top-right corners and along the far left and far right sides, and a torn red pennant hanging into the top-right corner. Same dusk lighting, softly out of focus. Paint only inside the green areas of the attached guide. Everything else is fully transparent.
```

### ☐ `bg_shipwreck_cove` (new arena) and its foreground

A third arena for free training, painted to the new **stage guide** from the start.

- **Outputs:**
  - `backgrounds/battle/bg_shipwreck_cove.webp`: `1536x1024`, Scene block, opaque.
  - `backgrounds/battle/bg_shipwreck_cove_fg.webp`: `1536x1024`, transparent, same rules as the other foregrounds.
- **References:**
  - The background: `guides/battle_stage.png`, plus `anchors/key_art.webp` for style.
  - The foreground: the finished `bg_shipwreck_cove.webp`, plus `guides/battle_foreground.png`.
- **Manifest:** `"bg_shipwreck_cove": { "kind": "background", "base": { … }, "fg": { … }, "floorEdge": 0.6 }`.

```text
A battle background: a wide, flat beach of packed golden sand at sunset, with the huge broken hull of a wrecked sky-pirate airship lying on its side behind the arena, glowing teal crystals growing out of its timbers, turquoise waves rolling in beyond it, and palm-covered cliffs at both sides. The sand floor is open, flat and evenly lit exactly where the guide marks the fighters, and the back edge of the floor meets the wreck and the surf on the guide's orange line. Hidden somewhere small: a three-eyed monkey in a tiny captain's hat sitting on the wreck.
```

```text
A foreground layer for the attached shipwreck-cove battle background, as if very close to the camera: drooping palm fronds in the top corners, a coil of old rope and a barnacled plank along the far left side, and a tilted wooden post with a frayed flag on the far right side. Same sunset light, softly out of focus. Paint only inside the green areas of the attached guide. Everything else is fully transparent.
```

---

## Section D: The Titan summon

The summon becomes a short movie:
1. The Titan rises from beyond the back edge of the arena floor.
2. It roars.
3. It blasts the fiends with a tidal torrent.

These poses and effects drive that sequence.

### ☐ `titan_starter` poses

- **Outputs:** `titans/titan_starter/roar.webp` and `titans/titan_starter/attack.webp`. Generate at `1024x1536` with the Sprite block, then trim like the base.
- **Reference:** `titans/titan_starter/base.webp`. Match it exactly.
- **Manifest:** add `"poses": { "roar": { "src": … }, "attack": { "src": … } }` to `titan_starter`.

```text
The same colossal sea titan as the attached reference, rearing up and roaring toward the upper left, jaws wide open, every crystal reef on its back blazing teal-white, seawater streaming off its shoulders and arms. Seen from below so it feels enormous. The lower body fades into churning white water at the bottom edge.
```

```text
The same colossal sea titan as the attached reference, facing LEFT, unleashing a massive torrent of glowing teal-and-white water from its open jaws. The torrent blasts out toward the left and leaves the frame on the left edge. Crystals blazing, spray everywhere, the lower body fading into churning water at the bottom edge.
```

### Effects

Each is `1024x1024`, Effects block plus the effect-sheet template, on pure black. Save to `fx/<id>.webp`.

| ☐ | Asset | The effect |
|---|---|---|
| ☐ | `fx_summon_circle` | A glowing teal summoning circle of interlocking rings and wave-shaped runes, seen from a low angle as a flat ellipse. It draws itself, spins, flares bright white, then fades |
| ☐ | `fx_tidal` | A massive surge of glowing teal-and-white water rushing from right to left across the frame, with a curling, foaming crest and thick spray |
| ☐ | `fx_splash` | A huge column of white water and spray bursting straight up from the bottom of the frame, then collapsing back down |
| ☐ | `fx_roar` | A shockwave ring of rippling air and glittering spray expanding outward from the center |

---

## ⛔ Gate: review at the end

1. Commit and push.
2. Write `art/review/wave-02.md` in the same format as wave 01. Put each foreground layer **composited over its background** next to the layer alone, so the review shows they line up.
3. Tell the parent which review page to open. Everything stays `draft` until he and his son approve it.

## Notes

*(Codex: log flagged or skipped assets here.)*
