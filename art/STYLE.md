# Art direction

**The art of Final Fantasy X, the humor of The Secret of Monkey Island.** Lush, sunlit, painterly islands and ruins with glowing motes in the air. Stylish, expressive heroes. Fiends that are genuinely fierce. Small jokes hidden in the details. Never babyish.

Every prompt is put together from the blocks below plus the asset's own description. See [`PRODUCTION.md`](PRODUCTION.md) for how. **Never name a franchise in a prompt** (see "Words to avoid" at the end).

## Master style prompt

This is the style the parent tested in ChatGPT. Keep it word for word, so everything matches.

**Status:** waiting for the parent's verdict on the test image. If he asks for tweaks ("darker," "more anime"), edit this block and note the date.

```text
ART STYLE: Lush, luminous digital painting in the spirit of a premium early-2000s Japanese RPG remastered in HD. Semi-realistic, anime-influenced characters with expressive faces and stylish asymmetrical adventure outfits: layered belts, buckles, straps, zippers, one-sleeved jackets, flowing scarves. Sun-drenched tropical environments painted in rich detail: saturated turquoise seas, white sand, emerald jungle, and ancient sandstone ruins carved with softly glowing glyphs. Golden-hour sunlight, with bioluminescent blue-green motes of light drifting through the air. Cinematic, epic and adventurous, with a mischievous sense of humor: witty, characterful expressions and small comedic details hidden in the scene. Mature and cool, never babyish or chibi.
```

## Add-on blocks

Use **one** of these after the master style prompt, depending on the asset type.

**Sprite block** for characters, fiends, bosses, sheets and icons:

```text
This is an isolated game sprite: render ONLY the subject on a fully transparent background (PNG with alpha). No scenery, no ground, no cast shadow, no frame. Lit from the upper left with a soft rim light, crisp readable silhouette, full body with nothing cropped and clear empty space around it.
```

**Scene block** for battle backgrounds, adventure scenes and splash art:

```text
This is a background painting for a 2D game: no characters or creatures unless the prompt asks for them, no user interface. Rich depth, clear foreground, midground and background.
```

**Effects block** for animated spell and impact sheets:

```text
This is a visual-effects sprite sheet: only the glowing effect itself, on a pure black (#000000) background, so it can be blended additively. No characters, no scenery.
```

## Rules block (always appended last)

```text
Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes. Fierce and intense is great; no blood, gore or wounds.
```

## Character design language

These rules keep the cast looking like one game.

- **Asymmetry.** One big shoulder piece, one bare arm, one long sleeve, belts at angles. Every hero has a silhouette you could recognize in black.
- **Island and tech mix.** Woven fabrics, shells and sandstone next to brass gears, crystal cores and rivets.
- **Crystal glow.** Every weapon has a glowing crystal in that hero's signature color.
- **Faces that act.** Expressive brows and mouths. Comedy lives in the expression sheets (smug, deadpan, alarmed), the way Monkey Island's close-ups sold the jokes.
- **Fiends** are dangerous first and funny second. A slime can grin, but it still looks like it could eat you.

## Humor in the art

- **The three-eyed monkey** (`mascot_monkey`) hides somewhere in every scene. Finding it is a collectible.
- Background gags: the joke is in the details, never the main subject. A seagull stealing a crystal. A "No Kraken Parking" style sign drawn with glyphs instead of text. A pirate asleep in a crow's nest.
- The tutor droid's tiny pirate hat is always slightly crooked.

## Cast palettes (consistency anchors)

| Asset | Palette | Signature details |
|---|---|---|
| `ally_knight` | gunmetal steel, navy, crimson, ice-blue glow | Shark-fin pauldron on the left shoulder, tattered crimson scarf, tower shield with a crystal core, plasma-edged greatsword, scar through one eyebrow |
| `ally_gunner` | weathered brown leather, teal, brass, orange glow | Copper-red braid, teal bandana, goggles, one torn-off sleeve, brass mechanical left arm, twin orange blasters |
| `ally_spellwright` | deep indigo, silver, gold glow | Small, hooded, face in shadow except two glowing golden eyes, floating spellbook, orbiting rune-letters |
| `ally_titancaller` | sea-foam white, coral, deep teal, storm-violet glow | Shell-braided black hair, long detached wave-pattern sleeves, bone-white plates on one side, storm-crystal staff, glowing titan tattoo |
| `tutor_droid` | white ceramic, brushed steel, teal glow, battered navy hat | One big lens-eye with an eyelid shutter, two little fins, crooked pirate hat |
| `hero_main` | from his Hero Forge answers | from his Hero Forge answers |

## Approved anchors

Reference images for every generation, filled in as they're approved.

| Anchor | Path | Approved |
|---|---|---|
| Key art (the parent's test image) | `public/assets/anchors/key_art.webp` | ☐ |
| Battle mock | `public/assets/anchors/battle_mock.webp` | ☐ |
| Cast lineup | `public/assets/anchors/cast_lineup.webp` | ☐ |

## Words to avoid in prompts, and what to say instead

| Don't write | Write instead |
|---|---|
| Final Fantasy, FFX, Square Enix | "a premium early-2000s Japanese RPG remastered in HD" |
| Monkey Island, LucasArts | "a classic comedic pirate adventure game" (or just describe the joke) |
| Godzilla, kaiju names | "a colossal titan", plus an original twist (hammerhead skull, crystal reefs on its back) |
| Pokémon, Star Wars, lightsaber, droid names | "a creature", "a plasma blade", "a floating droid" |
| Any real artist's name | Describe the technique (ink washes, painterly lighting) |
