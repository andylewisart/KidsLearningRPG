# Wave 12: Forged weapons in the heroes' hands

The Sword Master forges each hero's signature weapon up two steps (`src/world/forge.js`, `WEAPONS`), and wave 08 painted an icon for every step (`icons/weapons_ch2.webp`). The heroes' own pictures still hold the weapon they started with, so a forged weapon shows on the party window and the move button but never in their hands. On 17 October the parent asked for the new weapon to show on the hero.

This wave paints the weapons in only where they're used: each hero's battle sheet, twice, once per forged step (`battle_1`, `battle_2`). Exploring, the heroes carry no weapon at all (the parent's call, 17 October), so one weaponless stand and one weaponless walk per hero cover every step, now and for the Legendary Weapons later.

The game already picks them up: a fight uses a hero's new battle sheet as soon as it's painted (`weaponSheet()` in `src/ui/sprites.js`), and the adventure switches a hero to the weaponless pair once both their `stand` and `walk_bare` are painted (`addMember()` in `src/ui/explore.js`). Until then, a hero keeps the old pictures.

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
| ☑ | `ally_knight/battle_1.webp` | Shard Sword (`ally_knight_1`) | Cade's sword is already a glowing blue blade; this step gives it the icon's gold crossguard, round blue gem and dangling charm. Keep the shield as it is. |
| ☑ | `ally_knight/battle_2.webp` | Sharkfin Blade (`ally_knight_2`) | A broad, jagged blue-and-steel blade with a red streamer. The slash arc in the attack cell stays blue. |
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

## Section B: Exploring without a weapon

Two pictures per hero, both with **no weapon anywhere**: nothing in the hands, nothing floating beside them, nothing slung on the back. Their hands hang or swing empty and natural. Everything else stays: face, hair, clothes, belts, armor.

- **Cade:** no sword. His shield stays on his near arm (it isn't forged).
- **Wren:** no blasters, in her hands or her holsters (the holsters are empty). Her brass left arm stays.
- **Knox:** no floating spellbook and no glowing wand-torch.
- **Maren:** no staff.
- **Tamsin:** no crook (its lantern goes with it).

Prompts start with:

```text
Remove every weapon from this hero, so they carry nothing: nothing in their hands, nothing floating beside them, nothing on their back. Their hands hang or swing empty and natural for the pose. Keep everything else exactly as it is: the hero's face and expression, pose, legs and feet, size and framing, clothes, hair and body, and the transparent background.
```

References for every request: the cell being edited and the hero's `base.webp`. For the stand, also pass a finished walk frame (and for the walk, the finished first frame), so the empty hands match.

### The walks: `characters/ally_<hero>/walk_bare.webp`

An edit of `walk.webp` (1536×1024, 4 × 2 cells of 384×512, eight frames, facing right), one cell at a time. Add it to the manifest as `walk_bare`: a copy of the entry's `walk` object with the new `src`. The legs and the step don't change, so its `stride`, `scale` and `anchor` stay as they are.

**Cade's walk:** start from the repainted `ally_knight/walk.webp` (wave 11, "Cade walks with both legs", now in the game), not an older copy.

**Play each walk's eight frames in a row** to check them. If the walk entry is `"aligned"` and the body now jumps between frames, run `python3 tools/art/align_walks.py` on the new sheet as wave 10 did.

### The stands: `characters/ally_<hero>/stand.webp`

1024×512, two 512 px cells, facing left, transparent: the battle sheet's **idle** cell and its **ko** cell (from `battle.webp`), with the weapon removed. For the idle cell, the arms may move to rest empty (a relaxed stand, not a fighting crouch around a missing weapon), but the feet stay where they are. Add to the manifest as `stand`: `{ "src": "characters/ally_<hero>/stand.webp", "cell": [512, 512], "cols": 2, "rows": 1, "frames": { "idle": 0, "ko": 1 }, "anchor": <the battle entry's anchor>, "facing": "left" }`. (The adventure uses ko once: Cade flat on the beach at the very start.)

| ☐ | Hero | `walk_bare.webp` | `stand.webp` |
|---|---|---|---|
| ☐ | Cade (`ally_knight`) | ☐ | ☐ |
| ☐ | Wren (`ally_gunner`) | ☐ | ☐ |
| ☐ | Knox (`ally_spellwright`) | ☐ | ☐ |
| ☐ | Maren (`ally_titancaller`) | ☐ | ☐ |
| ☐ | Tamsin (`ally_beastkeeper`) | ☐ | ☐ |

**Checking in the game:** `?explore&scene=harbor` (chapter 2 has all five), walk him around and stop: the heroes should never hold a weapon, walking or standing.

---

## ⛔ Gate: review at the end

Commit after each section, and write `art/review/wave-12.md` with each hero's three battle sheets (as found, step 1, step 2) side by side with the weapon icons, and their old and weaponless walk and stand. Then tell the parent what to review.

## Not in this wave

Wren's and Maren's talking poses (`field.webp`) keep their weapons: the game only shows them when he meets the two in chapter 1, before they join and before there's a forge. The portraits and the story cards stay as they are.

## Notes

(Add a line here for anything flagged or skipped.)
