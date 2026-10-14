# Wave 09: Chapter 2, the last pictures

Chapter 2 is built on `claude/project-thread-ftrlee` (PR #3) with wave 08's art in it. Playing it through showed what's still missing: Kit's tea cozy on the field, the baby Wick Moth Tamsin rescues, two moments that play over the wrong picture, the harbor's new places on the island map, and the two new arenas' foregrounds, which cover the fighters.

The story is in [`../../docs/story/chapter2-script.md`](../../docs/story/chapter2-script.md). Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

**Status: ready, written 14 October from the chapter 2 build. Waiting for the parent to hand it to Codex.**

**Work on `claude/project-thread-ftrlee` only** (PR #3, chapter 2's branch). Never push to `claude/busy-einstein-52yr07` or `main`: a push there redeploys the game the kids play.

**Every asset uses these references unless it says otherwise:** `anchors/key_art.webp` and `anchors/cast_lineup.webp` for style, plus the approved base of every character it shows (wave 08's for the new cast), plus the guide named in its section.

**Don't edit game code** (`src/`, `styles/`, `index.html`). Claude wires the new art in. The game keeps working without it.

**All ages:** as in wave 08, nobody shows a bare midriff or revealing clothing.

---

## Section A: Kit in the tea cozy, on the field

Kit floats beside the party everywhere, drawn from `characters/tutor_droid/base.webp`, which wears the tricorn. From Hal's shop on, Kit wears the tea cozy instead, as `portraits_cozy.webp` already shows in the talking box, so the field picture needs it too.

### ☐ `tutor_droid`, `field_cozy.webp`

An edit of `base.webp` (the edit target), with `portraits_cozy.webp` as the reference for the cozy. Same canvas (`901x1024`), pose, size and framing, so the game can swap one for the other.

```text
Edit target: the attached droid sprite. Keep everything exactly as it is (the round white-and-brass body, the big cyan eye, the arms, the jets, the pose, the size and the framing) and change only its hat: replace the navy tricorn with the knitted tea cozy from the second reference, in the same faded stripes with the cream pom-pom, pulled down over the top of its head and sitting slightly crooked, as the tricorn did. Transparent background, no shadow.
```

Save to `characters/tutor_droid/field_cozy.webp`, and add `field_cozy` to `tutor_droid` in the manifest with `src`, `w`, `h` and the same `anchor` as `base`.

---

## Section B: The baby Wick Moth

Tamsin frees a baby Wick Moth from the Caged Drone's cage (script beat 3), and it stays with her: on her shoulder, then in a tank in the menagerie. It isn't anyone's pet in this chapter. A later chapter makes it one, and this sheet becomes its first stage, so it uses the pets' format (wave 08, Section C).

### ☐ `pet_moth_1`

`creature_sheet_2x2.png` guide: `1024x1024`, 2 × 2, 512 px cells (idle, act, happy, hurt), facing right, transparent. References: `fiends/fiend_wick_moth/base.webp` (the species) and `characters/pet_jelly_1/battle.webp` (the format).

```text
A small creature sheet, facing right: a baby Wick Moth no bigger than a teacup, round and very fuzzy, with four small wings like panes of old lantern glass in thin lead frames, a warm candle-flame glow inside its fuzzy body, short dusty antennae and huge dark shiny eyes. Shy, sweet and a little clumsy, not sad. The same species as the reference giant moth, but a baby: rounder and fluffier, with tiny wings. Four cells: idle (hovering, wings mid-beat), act (puffing out a brave little cloud of glowing dust), happy (wings spread wide, glowing brighter), hurt (wings folded, its glow dimmed).
```

Unlike the pets, it has no crystal heart yet. Save to `characters/pet_moth_1/battle.webp`, with a manifest entry shaped like `pet_raptor_1`'s.

---

## Section C: Story cards

`story_card.png` guide, `scenes/story_<id>.webp`, 16:9 (`1536x864`, like wave 08's).

| ☐ | Card | What it shows | Also a film's first frame? |
|---|---|---|---|
| ☐ | `story_tamsin_meets` | Afternoon in the harbor's market street: the beaten Caged Drone has crashed into a fish stall, fish everywhere, and the little cage in its belly is pried open. Tamsin, crook in hand, has just vaulted the stall and stands between the drone and Cade, as a baby Wick Moth flutters out of the cage onto her shoulder. Cade, sword half-raised, looks sheepish; Wren grins behind him; Knox and Maren lean in to see; Kit, in the tea cozy, hovers, unimpressed. | no |
| ☐ | `story_gallery_dawn` | Dawn on the lighthouse gallery: Cade, Wren, Knox, Maren and Tamsin at the stone rail, the harbor waking below (the first chimney smoke, boats heading out), the great lens glowing warm behind the gallery's glass. Kit in its tea cozy, and at the far end of the rail Pockets in both tricorns, very pleased with himself. No Titan in the sky, and no Rivet (it may be any of its three sizes by then). | no |

**References:**
- `story_tamsin_meets`: `scenes/explore/scene_harbor.webp` (the street), `fiends/fiend_caged_drone/base.webp`, `characters/pet_moth_1/battle.webp` once Section B is done, and `characters/tutor_droid/portraits_cozy.webp` for Kit.
- `story_gallery_dawn`: `scenes/story_ch2_ending.webp`, whose gallery (stone parapet, lantern, red banner) this must match, since the two play one after the other. Add `characters/mascot_monkey/field_twohats.webp` for Pockets, and the cozy portraits for Kit.

**In the game:** the first plays behind Tamsin's arrival, which is now lines over the empty street. The second plays behind the party's last talk and Kit's hat, which play in the lamp room now.

---

## Section D: The island map, the harbor's new places

Once chapter 2 starts, the map shows `map_driftwood`'s `harbor_open` variant. Three places off the harbor open on it during the chapter, but the variant has no spots or trails for them, so the game draws straight lines to its own guesses (in map painting pixels): `menagerie` at (640, 200), `sword_dock` at (930, 250) and `lighthouse` at (810, 130).

### ☐ `map_driftwood`, `harbor_open`: three places and their trails

- **The places:** `menagerie` (the hold of a beached ship), `sword_dock` (the Sword Master's dueling platform on the water) and `lighthouse` (the lighthouse on its rocky point).
- **Measure on the variant,** in map painting pixels (`1536x1024`), as its `cove-harbor` trail already is:
  - each place's point, into `variants.harbor_open.places.<id>`;
  - a trail of 6 to 10 points from `harbor` to it, following something walkable (a boardwalk, a beach, a path up the rocks), into `variants.harbor_open.trails["harbor-<id>"]`.
- **Paint in what's missing:** if the painting has no beached ship for the menagerie, or no walkable way to one of the places, edit the variant to add it. Keep everything else the same, and keep every place clear of the corners the game's buttons cover (`map_island.png` guide).
- **QA:** check that each trail reads as a path in the painting, not a line across open water.

---

## Section E: The chapter 2 arenas' foregrounds

The foreground layers of `bg_harbor_docks` (barrels, rope and flags) and `bg_lighthouse_rocks` (rocks and kelp) reach well into the area `battle_foreground.png` keeps transparent, where the fighters stand. The game fades a foreground whenever it covers someone, so in these two arenas it spends most of the fight faded. The chapter 1 arenas' foregrounds (`bg_shipwreck_cove_fg.webp`, for one) stay in the green areas, and look right.

### ☐ `bg_harbor_docks_fg.webp` and `bg_lighthouse_rocks_fg.webp`, repainted

- Repaint each so that it stays inside the guide's green areas.
- Every piece runs off the image's edge and is cut along its own outline, never cropped or faded at the green area's border (the guide's rule).
- Keep the same objects and light, so each still matches its arena.
- Overwrite the files at the same paths.

---

## ⛔ Gate: review at the end

Commit, write `art/review/wave-09.md` with every asset, and tell the parent what to review. Put Kit's field picture beside `base.webp`, the moth beside the giant moth, each foreground over its arena (before and after), and the map with its new trails drawn on.

## Notes

(Add a line here for anything flagged or skipped.)
