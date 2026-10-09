# Wave 01: The first battle

Everything the first playable battle needs. Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md). **Wave 00 must be approved first.**

**Every asset uses these references unless it says otherwise:** `anchors/key_art.webp` and `anchors/cast_lineup.webp`.

---

## Hero Forge (the parent fills this in with him)

His own hero. The rule is the Creature Lab's: *the artist draws only what you write*, so let him write it. Spelling doesn't matter.

```text
Name:
Class (Crystal Knight / Sky-Pirate Gunner / Spellwright / Titan Caller):
What they look like (hair, eyes, face, how tall, how old):
What they wear, and what colors:
Their weapon (what it looks like, what it does):
One special detail nobody else has:
Battle cry:
```

**Codex:**
- **If this block is still empty,** skip `hero_main`. The four allies are the default party.
- **If it's filled in,** generate `hero_main`. The party is then his hero plus the three allies of the *other* classes. The ally who shares his class becomes a rival character, who still gets a base and portraits but no battle sheet.

---

## Section A: character bases

Sprite block. `1024x1536` for people, `1024x1024` for the droid and the monkey. Generate **2 candidates** each and keep the more faithful one. Faces and outfits must match `cast_lineup`.

### ☐ `hero_main`

- **Output:** `characters/hero_main/base.webp`
- **Prompt:**

```text
Character design of the main hero of the game, standing in a ready battle stance, three-quarter view. An 8-year-old player designed this hero. Follow his description closely and keep every detail he wrote. Fill in anything he didn't mention so it fits the style and looks heroic and cool: a teenager or young adult, not a little kid, not cartoonish. Read misspellings the way he meant them.
Class: [from the Hero Forge]
His description:
"""
[paste the Hero Forge answers]
"""
```

### ☑ `ally_knight`

- **Output:** `characters/ally_knight/base.webp`
- **Prompt:**

```text
Character design of a hero, standing in a guarding battle stance, three-quarter view: THE CRYSTAL KNIGHT, a tall, stoic young man about 17 with short storm-gray hair and a scar through one eyebrow; sea-weathered steel armor over a sleeveless navy tunic; one oversized pauldron shaped like a shark's dorsal fin on his left shoulder, a bare right arm with a leather bracer; layered leather belts with brass buckles; a tattered crimson scarf. He carries a tower shield with a glowing ice-blue crystal core and a greatsword whose edge glows ice-blue like plasma. Calm and protective, with a dry glint of humor in his eyes.
```

### ☑ `ally_gunner`

- **Output:** `characters/ally_gunner/base.webp`
- **Prompt:**

```text
Character design of a hero, mid-swagger with both blasters raised, three-quarter view: THE SKY-PIRATE GUNNER, a cocky young woman about 16 with a messy copper-red braid, a teal bandana and flight goggles pushed up on her forehead; a long patched brown coat with the left sleeve torn off, revealing a brass mechanical arm with visible gears; a cropped vest, crossed belts and holsters, a bandolier of glowing orange ammunition cells, buckled knee-high boots. Twin crystal blaster pistols glowing orange. A wide, trouble-making grin.
```

### ☑ `ally_spellwright`

- **Output:** `characters/ally_spellwright/base.webp`
- **Prompt:**

```text
Character design of a hero, mid-incantation, three-quarter view: THE SPELLWRIGHT, a small, mysterious spellcaster about the height of a 10-year-old, in a deep-indigo hooded robe embroidered with silver circuit-like patterns and fastened with many buckled straps, with oversized sleeves and pointed boots. The face is completely hidden in shadow except for two glowing golden eyes. A spellbook floats open beside them, and glowing golden rune-letters orbit one raised hand (the runes may be abstract glyphs); the other hand holds a crystal-tipped wand. Robes stirring in a magical wind.
```

### ☑ `ally_titancaller`

- **Output:** `characters/ally_titancaller/base.webp`
- **Prompt:**

```text
Character design of a hero, staff raised as if calling something enormous, three-quarter view: THE TITAN CALLER, a fearless young woman about 15 with dark brown skin and long black hair braided with small seashells; a white wrap top with long detached sleeves patterned with blue wave motifs, a coral sash, a split skirt over leggings, bone-white armor plates on her left shoulder and hip. A tall staff topped with a crystal holding a tiny trapped lightning storm. A glowing teal tattoo of a coiled titan runs up her right arm.
```

### ☑ `tutor_droid`

- **Output:** `characters/tutor_droid/base.webp`, `1024x1024`
- **Prompt:**

```text
A small floating companion droid, about the size of a cat, three-quarter view: a smooth sphere of white ceramic and brushed steel with one large round lens-eye glowing soft teal and a mechanical eyelid shutter, two small jointed fins for steering, a little round window showing a glowing crystal core, and faint blue thruster glow underneath. It wears a tiny battered navy pirate captain's hat, slightly crooked, which it clearly believes makes it look intimidating. Deadpan, clever and loyal. Sleek and cool, not cute or babyish.
```

### ☑ `mascot_monkey`

- **Output:** `characters/mascot_monkey/base.webp`, `1024x1024`
- **Prompt:**

```text
A small monkey sitting and looking deeply unimpressed: golden-brown fur, three eyes (two normal eyes plus a third in the middle of its forehead), a tiny navy captain's hat and a single gold earring, holding a half-eaten banana. Smug, funny, a little mysterious. Small enough to hide in any scene.
```

## ⛔ Gate A: stop here

Commit, then ask the user to review `art/review/wave-01.md` (**show it to him; he's the art director**). After approval, set the bases to `approved` and continue.

---

## Section B: sheets, fiends, boss, backgrounds, effects, icons

### Character sheets

The asset prompt is the character's **Section A description**, followed by the template from `PRODUCTION.md`. The **reference** is that character's approved `base.webp`.

| ☑ | Asset | Battle sheet (`battle.webp`) | Expression sheet (`portraits.webp`) |
|---|---|---|---|
| ☐ | `hero_main` (if made) | yes | yes |
| ☑ | `ally_knight` | if in the party | yes |
| ☑ | `ally_gunner` | if in the party | yes |
| ☑ | `ally_spellwright` | if in the party | yes |
| ☑ | `ally_titancaller` | if in the party | yes |
| ☑ | `tutor_droid` | no | yes. The droid acts with its lens and eyelid: laughing = lens squeezed into a happy crescent, angry = lens glowing red, shocked = lens wide, smug = half-lidded, worried = lens flickering. Show the whole droid in each cell. |

### Fiends

Each fiend gets a `base.webp` (`1024x1024`, Sprite block, facing right) and then a `battle.webp` (fiend battle sheet template, with the approved base as the reference). Save both to `fiends/<id>/`.

#### ☑ `fiend_scrap_raptor` (a regular fiend)

```text
An enemy creature, facing right: a lean predator the size of a horse, shaped like a raptor dinosaur, with rusted scrap-metal plates bolted onto its scaly hide, a glowing orange crystal embedded in its chest, long sickle claws and a jagged-toothed jaw. Crouched low, about to pounce.
```

#### ☑ `fiend_volt_jelly` (a flier; Gunner's prey)

```text
An enemy creature, facing right: a floating crystal jellyfish as big as a car, its bell made of translucent blue crystal with lightning crackling inside, dozens of long glowing tendrils hanging below it and sparking with electricity. Hovering, menacing.
```

#### ☑ `fiend_magnet_beetle` (armored; Knight's prey)

```text
An enemy creature, facing right: a heavy armored beetle the size of a small truck, with a shell of dark riveted iron plates and two huge horseshoe-magnet-shaped horns whose tips glow red and blue. Small chunks of scrap metal float in the air around it, pulled by its magnetism. Head lowered, ready to charge.
```

#### ☑ `fiend_ink_slime` (a slime; Spellwright's prey)

```text
An enemy creature, facing right: a waist-high blob of glowing liquid ink, glossy violet-black, with shimmering glyph-shaped bubbles rising inside it, two big glowing amber eyes and a wide mischievous grin full of ink-drip teeth. Drips crawl back up into its body. Spilled magic ink that came alive: gross, funny and still dangerous.
```

#### ☑ `fiend_dominion_drone` (machina; flies)

```text
An enemy war machine of an evil empire, facing right: a wedge-shaped drone of dark gunmetal and crimson armor plates, held aloft by two shielded rotor fans, with one red scanning eye glowing in a narrow slit visor and two folding blade-arms underneath. Cold, sinister and military.
```

### The boss: ☑ `boss_geode_titan` (colossal; Titan Caller's prey)

Four separate `1024x1024` sprite images, all facing right, so the boss can be large and sharp:

- `bosses/boss_geode_titan/base.webp`
- `attack.webp`
- `hurt.webp`
- `enraged.webp`

Generate the base first (2 candidates). Each later pose uses the approved base as its reference. Then make `splash.webp` (`1536x1024`, Scene block, opaque): the boss's dramatic entrance shot.

```text
A colossal titan beast, a boss monster, facing right: four massive legs, a hammerhead-shaped skull with six glowing amber eyes, and armor plates of cracked geode crystal glowing violet from within, with steam venting from the cracks. Its tail ends in a huge crystal club. Seen from a low angle so it feels enormous.
POSE: base = standing, roaring | attack = tail club swinging down mid-strike | hurt = recoiling, cracks flaring bright | enraged = rearing up, every crystal blazing red-violet.
SPLASH: the titan bursting out of a crystal canyon wall in a shower of shards, three tiny heroes in the foreground for scale.
```

### The starter Titan: ☑ `titan_starter` (Tidebreaker)

The Titan he summons by writing. It rises huge behind the battlefield while his words appear on screen, so it must look awe-inspiring and clearly on the heroes' side. One `1024x1536` image, Sprite block, transparent. Generate **2 candidates** and keep the better one. Save to `titans/titan_starter/base.webp`.

```text
A colossal ancient sea titan, an ally summon, facing the viewer in three-quarter view and shown from the chest up as it rises out of churning white-capped waves: a vast whale-like head and shoulders armored in barnacled stone-blue hide, ridges of glowing teal and gold crystal reef growing along its back and shoulders, two huge webbed and clawed forelimbs streaming seawater, and calm, wise, glowing sea-green eyes. Majestic and protective rather than scary. The waves at the bottom fade out softly so it can rise from the bottom edge of the screen.
```

### Battle backgrounds

`1536x1024`, Scene block, opaque. Save to `backgrounds/battle/`.

#### ☑ `bg_jungle_ruins`

```text
A battle background: a jungle clearing in front of an overgrown sandstone temple carved with softly glowing glyphs, giant ferns and palms, shafts of golden afternoon light, glowing blue-green motes drifting in the air, and a glimpse of turquoise sea through the trees. Hidden somewhere small in the scene: a three-eyed monkey in a tiny captain's hat. Keep the lower third open, stone-paved ground where the fighters will stand.
```

#### ☑ `bg_crystal_canyon`

```text
A battle background: a deep canyon of giant glowing violet and blue crystal formations at dusk, with a wrecked sky-pirate airship half-buried in the far cliffs, drifting dust and sparks, and a dramatic orange sky. Hidden somewhere small in the scene: a three-eyed monkey in a tiny captain's hat. Keep the lower third flat, open ground where the fighters will stand.
```

### Effects

`1024x1024`, Effects block plus the effect-sheet template. Save to `fx/<id>.webp`.

| ☐ | Asset | The effect |
|---|---|---|
| ☑ | `fx_slash` | A sword slash: a crescent arc of ice-blue light trailing sparkling crystal shards |
| ☑ | `fx_volley` | A burst of blaster fire: several orange energy bolts streaking diagonally with small muzzle flashes |
| ☑ | `fx_fire` | A fire spell: a swirling column of flame erupting upward and bursting |
| ☑ | `fx_ice` | An ice spell: jagged ice crystals bursting up from the ground, then shattering |
| ☑ | `fx_lightning` | A lightning spell: a forked bolt striking down with a bright impact flash |
| ☑ | `fx_heal` | A healing spell: rising green-gold sparkles and soft expanding light rings |
| ☑ | `fx_defeat_motes` | A defeated creature dissolving: a body-shaped cloud of glowing blue-green motes swirling upward and fading |
| ☑ | `fx_capture` | A capture: glowing motes spiraling inward and condensing into a small bright crystal that flashes |

### Icons

#### ☑ `icons_elements_status`

`1024x1024`, Sprite block plus the icon-sheet template. Save to `icons/icons_elements_status.webp`. The icons, in reading order:

> fire, ice, lightning, water, earth, wind, light, shadow, silence (a crossed-out speech bubble made of runes), confusion (a spiral), poison (a dripping fang), sleep (a crescent moon), haste (a winged hourglass), slow (a snail-shell hourglass), protect (a shield), barrier (a hexagon dome)

## ⛔ Gate B: stop here

Commit, then ask the user to review the whole of `art/review/wave-01.md` with him. Mark approved assets `approved`, and anything he wants changed `replace` (with his words in the Notes).

## Notes

Generation completed on 2026-10-08 at the user's request to proceed with all image generation. Approval gates were deferred; every asset remains draft. Checkboxes record generation, not approval. See art/review for prompts and flags. Hero Forge is blank, so hero_main was skipped as instructed. Remaining flags after up to three sheet attempts: ally_knight/battle, ally_knight/portraits, ally_gunner/battle, ally_spellwright/battle, ally_titancaller/battle, boss_geode_titan/base, boss_geode_titan/attack, boss_geode_titan/hurt, boss_geode_titan/enraged, boss_geode_titan/splash, titan_starter/base, bg_jungle_ruins/base, bg_crystal_canyon/base, fx_fire/sheet.
