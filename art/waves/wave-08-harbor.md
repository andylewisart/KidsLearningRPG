# Wave 08: Chapter 2, Driftwood Harbor

Chapter 2 takes the party into Driftwood Harbor, the pirate port where the new crystal belongs. It brings a fifth hero (Tamsin, the Beastkeeper), a new villain (Inspector Clamp of the Iron Dominion), pets that evolve, new fiends and a new boss, Maren's second Titan (Beaconwing), the Crystal Grid (the upgrade map), new places, and changes to old places that reward going back.

The story is in [`../../docs/story/chapter2-proposal.md`](../../docs/story/chapter2-proposal.md), and the cast is in [`../../docs/story/bible.md`](../../docs/story/bible.md). Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md), including the "Guides" and "Painted exploration scenes" sections.

**Status: approved by the parent as an overview (13 October). Not started.**

**Run it in order, and stop at each ⛔ gate.** Section A's bases come first, because every sheet, pet and story card after them uses them as references.

**Every asset uses these references unless it says otherwise:** `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style, plus the character's approved base for anything showing that character, plus the guide named in the asset's entry.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps working without it.

**Films stay the parent's.** Where a picture is also a film's first frame, it says so. Make the still; don't make the film.

---

## Section A: New characters (bases)

Each gets a `base.webp` (`1024x1536`, Sprite block, transparent, 2 candidates; keep the more faithful one). Save to `characters/<id>/base.webp`.

### ☑ `ally_beastkeeper`: Tamsin Hollow, the fifth hero

```text
A hero, full body, three-quarter view: a scrappy harbor girl of about twelve, clearly a girl at a glance: a friendly, freckled girl's face with bright eyes and a confident half-smile, and long dark curly hair worn in two thick braids, tied back under a knotted sea-green bandana with a small shell charm. Modestly dressed: a long-sleeved cream blouse buttoned to the collarbone, a sea-green waistcoat, and a long patched sailcloth coat with far too many pockets (a small creature's tail pokes out of one) worn over it, closed at the waist with a belt. A knee-length rust-colored skirt over leggings, and sturdy ankle boots. No bare midriff and no exposed skin beyond her face and hands. A satchel with fish tails sticking out. She holds a tall shepherd's crook carved from pale driftwood, with a glowing amber crystal set in the hook. A small friendly rebuilt creature (a little scrap-metal raptor with neat patched plates) peeks out from behind her coat. Palette: sea-green, sailcloth tan, rust, and an amber glow.
```

Palette row for STYLE.md's cast table: `ally_beastkeeper` | sea-green, sailcloth tan, rust, amber glow | Driftwood crook with an amber crystal, long braids under a sea-green bandana, patched many-pocket coat over a buttoned blouse and waistcoat, knee-length skirt over leggings, satchel of fish.

**Redo (parent's review, 13 October):** the first Tamsin read as a boy and showed a bare midriff. She must read clearly as a girl (her face, long braids, a skirt) and be fully covered: blouse to the collarbone, coat and waistcoat closed, no skin at the waist.

### ☑ `npc_clamp`: Inspector Clamp of the Iron Dominion (the villain)

```text
A villain, full body, three-quarter view: a tall, very upright inspector of an evil iron empire, perfectly still and polite. A smooth gunmetal face-mask with no mouth and one round glowing red lens over one eye like a monocle. A high-collared crimson-and-black greatcoat with brass buttons in perfectly straight rows, white gloves, and a clipboard of forms bolted to his left forearm. A large rubber stamp hangs in a holster on his hip where a weapon would be. A folded mechanical crab claw rests on his back. Cold, precise and menacing, and a little absurd in how tidy he is.
```

Match the Dominion drones' gunmetal and crimson (`fiends/fiend_dominion_drone/base.webp` as an extra reference).

### ☑ Townsfolk (`npc_hal`, `npc_keeper`, `npc_baker`, `npc_swordmaster`)

- **`npc_hal`, Honest Hal:**
  ```text
  A shopkeeper, full body: a lean, wiry pirate merchant in his thirties, quick and restless, mid-gesture as if halfway through a sales pitch, with a huge salesman's grin, a thin twirled mustache and slicked-back hair under a small battered tricorn. A shirt buttoned to the collar with a neat neckerchief, a well-fitted striped waistcoat, a coat with too many hidden inner pockets, an eyepatch, rings on every finger, and an abacus missing a few beads tucked under one arm. Slim build, nothing bulging or open.
  ```
  **Redo (parent's review, 13 October):** Hal's voice is light, quick and youngish, so he's no longer round: lean, wiry and restless, in his thirties. His shirt is buttoned to the collar.
- **`npc_keeper`, the old lighthouse keeper:**
  ```text
  An old man, full body: tall, thin and gentle, in a long yellow oilskin coat, with a white beard and kind, faraway eyes. He holds an old brass lantern, lit, as if he has forgotten why he carries it. Quiet and dignified; his face should carry tenderness.
  ```
- **`npc_baker`, the Salty Biscuit's baker:**
  ```text
  A baker, full body: a slim, bright young woman in her early twenties, quick and cheerful, with her hair tied up in a kerchief, in a high-necked, long-sleeved blouse with the sleeves rolled to the elbows and a full bib apron that covers her from the collarbone to the knees, flour on her forearms and a smudge on her cheek, holding an open recipe book whose pages are blank, looking at it in puzzlement. A modest neckline, no cleavage.
  ```
  **Redo (parent's review, 13 October):** the first baker showed too much cleavage, so her neckline must be high and modest. The second redo matches her voice, which is young and bright: a slim young woman, not a broad, motherly one. She runs the café her mother ran, which is why she remembers her mother singing over the dough.
- **`npc_swordmaster`, the Sword Master:**
  ```text
  An old swordmaster, full body: a grand, theatrical duelist with an enormous curled mustache, a faded plumed hat and a once-fine coat, a thin rapier at his hip, looking indignant.
  ```

## ⛔ Gate A: stop here

Commit, then ask the parent to review the six bases on `art/review/wave-08.md`. Continue only after approval.

---

## Section B: Sheets for the new characters

Use the sheet templates in `PRODUCTION.md`, with the approved base as the reference.

| ☐ | Asset | Battle sheet | Walk cycle | Expression sheet |
|---|---|---|---|---|
| ☐ | `ally_beastkeeper` | yes (faces the fiends, like wave 04's) | yes | yes |
| ☐ | `npc_clamp` | no (he fights from inside the Drain Engine) | no | yes: polite, stamping, offended, coldly furious, smug, flustered |
| ☐ | `npc_hal` | no | no | yes |
| ☐ | `npc_keeper` | no | no | yes |
| ☐ | `npc_baker` | no | no | yes |
| ☐ | `npc_swordmaster` | no | no | yes |
| ☐ | `tutor_droid`, **tea cozy** (`portraits_cozy.webp`) | no | no | yes. Kit wearing a knitted tea cozy in faded stripes with a pom-pom instead of its pirate hat, sitting slightly crooked like the old hat. Same moods as `portraits.webp` |
| ☐ | `mascot_monkey`, **two hats** (`field_twohats.webp`) | no | no | one pose: Pockets wearing his own tricorn with Kit's tricorn stacked on top, very pleased |

---

## Section C: Pets

Each pet is a friendly, rebuilt version of a fiend: the same parts, put back together with care (patched, polished), with a small crystal heart in its hero's signature color. It evolves in three stages that read as one creature growing up: **stage 1** small and a little goofy, **stage 2** sturdy and proud, **stage 3** bigger, glowing, legendary.

Each stage is a `creature_sheet_2x2.png` sheet (idle, act, happy, hurt), facing right, transparent: `characters/<line>_<stage>/battle.webp`. Make stage 1 first, then pass it as a reference for stages 2 and 3. Pass the original fiend's base as a reference too.

| ☐ | Line | Hero (glow) | From | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|---|---|
| ☐ | `pet_raptor` | Cade (ice-blue) | `fiend_scrap_raptor` | **Rivet:** a dog-sized raptor rebuilt with neat plates, a tiny tower shield strapped to one arm | A pony-sized raptor with a shark-fin crest like Cade's pauldron | A war-raptor in polished steel with a crystal shield-crest |
| ☐ | `pet_jelly` | Wren (orange) | `fiend_volt_jelly` | A jelly the size of a lantern with a little brass cap | A jelly with brass fins and goggles | A storm-jelly like a floating airship buoy, with an orange crystal bell and lightning tendrils |
| ☐ | `pet_slime` | Knox (gold) | `fiend_ink_slime` | A teacup-sized ink slime writing glowing letters in the air | A slime wearing a quill like a hat, with a page-shaped tail | A small ink dragon made of flowing script, with golden glyphs |
| ☐ | `pet_tide` | Maren (storm-violet) | (new) | A sea-glass hermit crab with a little shrine bell for a shell | A coral seahorse with a shell crest | A small tide-serpent with reef growth along its back |

---

## Section D: New fiends

Each gets a `base.webp` (`1024x1024`, Sprite block, facing right) and a `battle.webp` (fiend battle sheet template, the approved base as the reference). Save both to `fiends/<id>/`. Dangerous first, funny second.

### ☐ `fiend_barnacle_brute` (armored; Cade's prey)

```text
An enemy creature, facing right: a giant crab the size of a rowboat, crusted in barnacles and seaweed, wearing a stolen wooden front door as its shell, with a brass door knocker still on it. One enormous claw and one small one. Low, heavy and grumpy, ready to snap.
```

### ☐ `fiend_wick_moth` (flier; Wren's prey)

```text
An enemy creature, facing right: a moth as big as an umbrella, with wings like panes of old lantern glass in lead frames, a candle-flame glow in its fuzzy body, dusty antennae and huge sad dark eyes. Fluttering frantically, scattering glowing dust.
```

### ☐ `fiend_fog_glob` (slime; Knox's prey)

```text
An enemy creature, facing right: a waist-high blob of thick grey sea fog, with half-swallowed painted letters from street signs drifting inside it and blurring as they sink. Two round eyes glow inside it like lamps in fog. A wide, sly smile. Wisps trail off its edges.
```

### ☐ `fiend_tick_mimic` (fast; Tamsin's prey)

```text
An enemy creature, facing right: a wooden treasure chest that is secretly a clock: its lid is a cracked brass clock face, gear teeth line its open mouth, and a pendulum swings inside like a tongue. Little brass legs, mid-scuttle, too fast to trust.
```

### ☐ `fiend_crumb_goblin` (fast; Tamsin's prey)

```text
Enemy creatures, facing right: a gang of three knee-high goblins made of biscuit crumbs, sugar crystals and burnt edges, carrying stolen spoons as weapons. Mid-dash, crumbs flying off them, cackling.
```

### ☐ `fiend_riptide_eel` (fast; Tamsin's prey)

```text
An enemy creature, facing right: a lean silver eel as long as a rowboat, striped like a tide chart, with a crystal glint on its brow, coiling fast out of dark water, fins swept back with speed.
```

### ☐ `fiend_caged_drone` (flier, Dominion)

```text
An enemy war machine of an evil empire, facing right: the same wedge-shaped gunmetal and crimson drone as the reference, but its belly holds a small iron cage, and inside it a small frightened glowing creature presses against the bars.
```

Reference: `fiends/fiend_dominion_drone/base.webp`.

---

## Section E: The boss, `boss_drain_engine` (colossal; a Titan's prey)

Four `1024x1024` sprite images, facing right, like the Geode Titan: `base`, `attack`, `hurt`, `enraged` in `bosses/boss_drain_engine/`, plus a `portrait.webp`.

```text
A colossal war machine of an evil iron empire, facing right: a crab-legged siphon engine the size of a building, in gunmetal and crimson, standing on six heavy iron legs. One giant clamp-claw reaches forward. Thick pipes run from the claw into a row of glass tanks on its back, glowing with stolen white-gold crystal light. A small glass cockpit sits on top, with a tall masked inspector inside holding a clipboard. Cold, industrial and menacing.
```

Reference for the cockpit's pilot: `characters/npc_clamp/base.webp`.

---

## Section F: The second Titan, `titan_beaconwing`

Same format as Tidebreaker (`titans/titan_starter/`): `base`, `roar` and `attack` in `titans/titan_beaconwing/`.

```text
A colossal titan, facing right: a thunderbird as big as a lighthouse, made of storm and lamplight. Its feathers are tiers of lens-glass prisms throwing beams of white-gold light; a storm-violet glow runs through its wings; lightning crackles along the edges of its wings; a crystal lamp burns in its chest; its eyes are two sweeping lighthouse beams. Majestic, wild and kind.
```

---

## Section G: New places (painted scenes)

**⏸ These wait on Claude:** each place needs its layout in `explore-layouts.json` and its guide (`explore_<place>.png`) first, the same way wave 04's did. Skip this section until those are committed, then follow wave 04's method: one painting with its objects painted in, each change of state as a variant, measured objects in the manifest, a rest crystal, the monkey hidden somewhere, and figures at the 1.6× painted scale.

| ☐ | Scene | Time of day | What's in it | Variants |
|---|---|---|---|---|
| ☐ | `scene_harbor` | late morning | A pirate port built from shipwrecks: hulls for roofs, masts for lampposts. A bell tower with silent bells and a clock face whose hands are scrambled. Jumble's ghost galleon *Misspelled* moored at one end, Clamp's small gunmetal Dominion cutter at the other. Honest Hal's shop front, the Salty Biscuit's sign, the dock leading off. Too quiet: laundry hanging still, nobody about. | `clock_fixed` (the hands set right); `remembered` (bells swinging, people out, bunting up) |
| ☐ | `scene_hal_shop` | day, inside | Stacked junk, a counter, a price board (numbers drawn by the game), a weapon rack, a tea cozy on a hat stand | `cozy_sold` (the hat stand empty) |
| ☐ | `scene_biscuit` | day, inside | A cosy galley-kitchen café, an oven, flour sacks, a recipe book open on the counter with blank pages | `recipes_back` (the pages glowing with writing) |
| ☐ | `scene_sword_dock` | morning | A dueling platform on the water, a forge built into a ship's stove, a big crab sitting in the Sword Master's armchair | `dock_won` (the chair empty, the forge lit) |
| ☐ | `scene_menagerie` | afternoon, inside | The hold of a beached ship as a creature sanctuary: tanks, nests, hammocks, small rebuilt fiends asleep, warm lantern light | none |
| ☐ | `scene_lighthouse` | dusk | The lighthouse on a rocky point, its lamp dimming, the causeway barred with a Dominion "inspection" barricade | `after` (claw marks on the tower, barricade wrecked) |
| ☐ | `scene_lamp_room` | night, inside | A great crystal lens, the empty cradle where the new crystal goes, the keeper's chair, a desk with a logbook | `grid` (the old crystal's last light caught by the lens, throwing a web of glowing nodes and paths across the ceiling); `lit` (the new crystal in the cradle, blazing) |
| ☐ | `scene_sea_cave` | night | The smugglers' tunnel under the cove's old wreck, lit by glowing kelp, wet steps leading up | none |
| ☐ | `scene_sage_library` | day, inside | A small round reading room off the Hall of Glyphs, one empty carved seat with a cushion, a crest map on a lectern | none |
| ☐ | `scene_lair_deep` | inside | A deeper glittering chamber below the Geode Titan's lair | none |
| ☐ | `scene_camp` | night | A campfire on a beach under the stars, with room around it for the party and Kit (the game draws them) | none |

**Old places, changed** (variants of wave 04's paintings, cut with `tools/art/scene_patches.py`):
- ☐ `scene_cove`, `tide_out`: the sand runs further out, and a sea-cave mouth shows under the old wreck.
- ☐ `scene_temple_hall`, `library_open`: the tablets glow, and a sealed door stands open.
- ☐ `scene_canyon`, `parts`: a propeller and a brass figurehead from the Albatross, scattered where they can be found.

**Battle arenas** (battle-stage guide, plus foreground layers): ☐ `bg_harbor_docks`, ☐ `bg_lighthouse_rocks` (the boss arena, at dusk).

**The island map:** ☐ `map_driftwood`, `harbor_open`: the harbor painted as a real place with its trail, not a teaser.

---

## Section H: The Crystal Grid (the upgrade map)

- ☐ **`ui/grid_board.webp`** (`1536x1024`, opaque): deep night-blue space with faint constellation lines, like light thrown across a ceiling. **No nodes**: the game draws them.
- ☐ **`ui/grid_nodes.webp`** (`icon_sheet.png` guide, 4×4): strength, health, a new move, pet slot, weapon, locked skill gate (a crystal padlock), the start node, Calm Seas (a calm wave). Top two rows unlit, bottom two rows the same icons lit in white-gold (the game tints them per hero).
- ☐ **`ui/grid_tokens.webp`** (4×4 icon sheet): five round tokens, one with each hero's face (Cade, Wren, Knox, Maren, Tamsin), plus `light` (a small glowing mote, the light he spends).

## Section I: Weapons (forge upgrades)

☐ One 4×4 icon sheet, `icons/weapons_ch2.webp`: each hero's weapon at two upgrade steps.
- **Cade:** a sword with a crystal edge; then a sharkfin-crested blade.
- **Wren:** blasters with brass cooling fins; then twin long-barrel storm blasters.
- **Knox:** a spellbook with a gold clasp; then a book with pages orbiting it.
- **Maren:** a staff with a coral crown; then a staff with a living tide inside its crystal.
- **Tamsin:** her crook bound in brass with a bigger amber crystal; then a crook grown into a living branch with a creature-shaped crystal.

## Section J: Story cards

`story_card.png` guide, `scenes/story_<id>.webp`, 16:9.

| ☐ | Card | What it shows | Also a film's first frame? |
|---|---|---|---|
| ☐ | `story_harbor_arrival` | The party walking down into the silent harbor, morning | no |
| ☐ | `story_clamp_meets_jumble` | On the dock, Clamp calmly writing a parking fine beside the *Misspelled* while Jumble looms over him, outraged | no |
| ☐ | `story_keeper_climbs` | The old keeper climbing the lighthouse's spiral stairs at night with his lantern, small in the dark | no |
| ☐ | `story_logbook` | A close-up of an open logbook on the lamp-room desk, by lantern light: pages of the same short line in a shaky hand (unreadable squiggles; the game draws the words) | no |
| ☐ | `story_jumble_audit` | On the galleon's deck, Clamp stamping a file while Jumble stands still, his plume drooping, his face fallen. Quiet, not funny | no |
| ☐ | `story_engine_arrives` | Dusk: the Drain Engine climbing out of the harbor and clamping onto the lighthouse, its tanks glowing | yes |
| ☐ | `story_beaconwing_wakes` | Night: the thunderbird unfolding out of the great lens, beams sweeping the harbor, a storm breaking around it | yes |
| ☐ | `story_crystal_lit` | The new crystal blazing in the lens, light rolling over the harbor, the bells swinging | no |
| ☐ | `story_ch2_ending` | Dawn: Beaconwing flying away over the sea wearing Kit's tiny tricorn hat; on the lighthouse gallery, Kit in a tea cozy watching it go | yes |
| ☐ | `story_jumble_smoke` | Night: the *Misspelled* sailing toward a smoking volcano on the horizon | no |

## Section K: Props and icons

- ☐ **Props** (`prop_view.png` guide, `props/<id>.webp`): `prop_logbook` (on the desk), `prop_bottle_ch2` (a new Jumble bottle in green glass, on the sand), `prop_cozy` (the tea cozy on Hal's counter, with a price tag).
- ☐ **Item icons** (one 4×4 sheet, `icons/items_ch2.webp`): fish, measuring jug, scale with weights, clock key, Hal's receipt, Clamp's parking fine, crest map, the new bottle, pet food, biscuit, tea cozy, Kit's hat.

## ⛔ Gate B: review at the end

Commit, update `art/review/wave-08.md` with every asset (Section G's places may still be waiting on their guides), and tell the parent what to review.

## Notes

(Add a line here for anything flagged or skipped.)


- Section A delivered on `claude/project-thread-ftrlee`: all six bases draft. Tamsin and the baker remade under the revised all-ages clothing rules, with two new candidates and one targeted correction each. Earlier rejected versions kept only in ignored raw files. Review `art/review/wave-08.md` at Gate A. Clamp’s clipboard forearm mounting is partly hidden; confirm it at review. Sections B–K not started.

- Voice-matching revision: only `npc_hal` and `npc_baker` remade, two new candidates each. Hal candidate 4 and baker candidate 7 selected. Review page and comparison images updated; both remain draft at Gate A. Other four bases unchanged.
