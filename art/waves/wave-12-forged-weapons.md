# Wave 12: Forged weapons in the heroes' hands

The Sword Master forges each hero's signature weapon up two steps (`src/world/forge.js`, `WEAPONS`), and wave 08 painted an icon for every step (`icons/weapons_ch2.webp`). The heroes' own pictures still hold the weapon they started with, so a forged weapon shows on the party window and the move button but never in their hands. On 17 October the parent asked for the new weapon to show on the hero.

This wave repaints each hero's battle sheet and walk cycle twice, once per forged step. The game already picks them up (`weaponSheet()` in `src/ui/sprites.js`): a fight uses the new battle sheet as soon as it's painted; the adventure switches a hero once both the battle sheet (whose idle frame he stands in) and the walk for that step are painted, so the weapon doesn't change hands as he starts and stops walking. Until then, the hero keeps the old pictures.

Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: ready, written 17 October.**

**Work on `claude/weapons-on-heroes-n4hkux` only.** Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**Don't edit game code** (`src/`, `styles/`, `index.html`).

---

## How to edit

Every sheet is an edit of `characters/ally_<hero>/battle.webp` (1536×1024, 3 × 2 cells of 512 px, facing left: idle, attack, cast, hurt, ko, victory), saved as a new file beside it. Change the weapon and nothing else.

- **One cell at a time:** crop the cell, edit it, paste it back in the same place, so every frame keeps its position and the anchors still line up.
- **References for every request:** the cell being edited, the hero's `base.webp`, and the weapon's icon cropped out of `icons/weapons_ch2.webp` (256 px cells, 4 across: the names are in its manifest entry). For the step 2 sheet, also pass the finished step 1 cell, so the two steps match in size and grip.
- **Same grip, same pose:** the new weapon sits where the old one was, held the same way, about the same size against the hero. Effects that come off the weapon (Cade's slash arc, Knox's book glow, Maren's water ribbons, Tamsin's lantern swirl) keep their shape and take the new weapon's colors.
- **Check:** canvas and cells unchanged, transparent corners and cell edges, feet within 2 px of the old cells, and the hero (face, clothes, hair, body) unchanged.

Every prompt starts with:

```text
Change only the weapon this hero is holding, so it is exactly the weapon in the weapon reference: same design, colors and details. Keep it in the same hand, at the same angle and grip, about the same size against the hero as the weapon it replaces. Keep everything else exactly as it is: the hero's face and expression, pose, size and framing, clothes, hair and body, the transparent background, and any magic effect around them (recolored to match the new weapon where it comes from it).
```

---

## Section A: The battle sheets

Save each as `characters/ally_<hero>/battle_<step>.webp`, and add it to the hero's manifest entry as `battle_1` or `battle_2`: a copy of the entry's `battle` object with the new `src` (same `cell`, `cols`, `rows`, `frames`, `anchor` and `facing`).

| ☐ | Sheet | Weapon (icon in `weapons_ch2`) | Notes |
|---|---|---|---|
| ☐ | `ally_knight/battle_1.webp` | Shard Sword (`ally_knight_1`) | Cade's sword is already a glowing blue blade; this step gives it the icon's gold crossguard, round blue gem and dangling charm. Keep the shield as it is. |
| ☐ | `ally_knight/battle_2.webp` | Sharkfin Blade (`ally_knight_2`) | A broad, jagged blue-and-steel blade with a red streamer. The slash arc in the attack cell stays blue. |
| ☐ | `ally_gunner/battle_1.webp` | Brass-Fin Blasters (`ally_gunner_1`) | Wren holds a blaster in each hand: both become this one. Her brass left arm stays. |
| ☐ | `ally_gunner/battle_2.webp` | Storm Blasters (`ally_gunner_2`) | Longer double-barreled blasters with blue feather tassels. |
| ☐ | `ally_spellwright/battle_1.webp` | Gold-Clasp Spellbook (`ally_spellwright_1`) | The floating book becomes the navy-and-gold one with the glowing clasp. Knox's wand-torch stays. |
| ☐ | `ally_spellwright/battle_2.webp` | Book of Flying Pages (`ally_spellwright_2`) | The same book, wreathed in loose glowing pages. |
| ☐ | `ally_titancaller/battle_1.webp` | Coral Crown Staff (`ally_titancaller_1`) | Maren's staff gets the red coral crown around its blue orb and the white-and-blue streamers. |
| ☐ | `ally_titancaller/battle_2.webp` | Living Tide Staff (`ally_titancaller_2`) | A swirling blue water orb in gold, with shells and wave-patterned streamers. |
| ☐ | `ally_beastkeeper/battle_1.webp` | Amber Crook (`ally_beastkeeper_1`) | Tamsin's crook gets the amber lantern, green feathers and shells. |
| ☐ | `ally_beastkeeper/battle_2.webp` | Greenwood Crook (`ally_beastkeeper_2`) | A leafy crook with white flowers and a small teal sea-dragon head at the hook. |

Do Cade's two first and check them in the game (below) before the rest.

**Checking in the game:** `npm run dev`, then open `http://localhost:8000/?battle=h1&weapon=1` (or `&weapon=2`): every hero fights with that step. Heroes whose sheet isn't painted yet keep the old one.

---

## Section B: The walk cycles

The same edit on each hero's `characters/ally_<hero>/walk.webp` (1536×1024, 4 × 2 cells of 384×512, eight frames, facing right), saved as `walk_1.webp` and `walk_2.webp` beside it and added to the manifest as `walk_1` and `walk_2`: a copy of the entry's `walk` object with the new `src`. References: the cell, the hero's finished `battle_<step>.webp` idle cell (so the weapon matches the fight) and the icon. The weapon must sit at the same place in the hand in all eight frames.

| ☐ | Walk | Weapon |
|---|---|---|
| ☐ | `ally_knight/walk_1.webp` | Shard Sword |
| ☐ | `ally_knight/walk_2.webp` | Sharkfin Blade |
| ☐ | `ally_gunner/walk_1.webp` | Brass-Fin Blasters |
| ☐ | `ally_gunner/walk_2.webp` | Storm Blasters |
| ☐ | `ally_spellwright/walk_1.webp` | Gold-Clasp Spellbook |
| ☐ | `ally_spellwright/walk_2.webp` | Book of Flying Pages |
| ☐ | `ally_titancaller/walk_1.webp` | Coral Crown Staff |
| ☐ | `ally_titancaller/walk_2.webp` | Living Tide Staff |
| ☐ | `ally_beastkeeper/walk_1.webp` | Amber Crook |
| ☐ | `ally_beastkeeper/walk_2.webp` | Greenwood Crook |

**Cade's walk:** start from the repainted `ally_knight/walk.webp` (wave 11, "Cade walks with both legs", now in the game), not an older copy, so his forged walks keep the new steps.

**Play each walk's eight frames in a row** to check them. If the walk entry is `"aligned"` and the body now jumps between frames, run `python3 tools/art/align_walks.py` on the new sheets as wave 10 did.

---

## ⛔ Gate: review at the end

Commit after each section, and write `art/review/wave-12.md` with each hero's three battle sheets and three walks (as found, step 1, step 2) side by side, and the weapon icons beside them. Then tell the parent what to review.

## Not in this wave

Wren's and Maren's talking poses in the adventure (`field.webp`) and the portraits still show the first weapons. The portraits barely show them; the field poses would need four more sheets.

## Notes

(Add a line here for anything flagged or skipped.)
