# Batch 01: The first battle

**Goal:** everything the first playable battle needs: his hero, three companions, the tutor companion, four enemies, a boss and two battle backgrounds.
**Images:** 12 (13 if he can't choose between the two tutor options).
**Time:** about 45 minutes, best split into two sittings. Do the Hero Forge with him; you can paint the enemies and backgrounds on your own.
**Needs:** the style audition (batch 00) done and a winner picked.

## Step 1: Hero Forge (with him, on paper or on screen)

The rule is the same as Story Quest's Creature Lab: **the artist draws only what you write.** Let him write it himself. Spelling doesn't matter here, because ChatGPT reads it the way he meant it.

> **1. Pick your class.** The other three classes become your companions.
> - ⚔️ **Crystal Knight**: plasma greatsword and a giant shield, protects the team. *Fights with HP math (subtraction and addition).*
> - 🔫 **Sky-Pirate Gunner**: twin blasters that fire in volleys. *Fights with multiplication and division.*
> - 🔮 **Spellwright**: casts spells by spelling them. *Fights with spelling.*
> - 🐉 **Titan Caller**: summons giant Titans. *Fights by writing.*
>
> **2. Your hero's name:**
>
> **3. What does your hero look like?** Hair, eyes, face, how tall, how old (teenager? grown-up?).
>
> **4. What do they wear?** Armor, coat, helmet, mask… and what colors?
>
> **5. Their weapon.** What does it look like? What does it do?
>
> **6. One special detail nobody else has.** A glowing scar? A robot arm? A pet that rides on their shoulder?
>
> **7. Battle cry.** What do they shout when they attack? (The game will use it!)

Hold onto his answers. The name, class and battle cry go into the game too.

## Step 2: Setup message

Start a **new ChatGPT chat**. Attach his **winning audition image** as the style reference, then paste this. Replace the bracketed line with the winning style block from [`../style-bible.md`](../style-bible.md). After the audition, Claude fills it in for you.

```text
We're making the art for an original turn-based fantasy RPG, one image at a time. I'll send each image request separately, starting with its asset name.

Use this art style for every image:
[PASTE THE WINNING STYLE BLOCK HERE]

Rules for every image in this chat:
- Completely original designs. Never imitate an existing franchise, character, creature, logo or emblem.
- No text, letters, numbers, logos, watermarks, signatures, borders, frames or user interface, unless a prompt asks for glowing magic runes.
- Epic, fierce and intense is great (roaring monsters, glowing eyes, battle-ready poses), but no blood, gore, wounds or cruelty.
- Keep the art style identical across every image in this chat.
- Characters and creatures: full body with nothing cut off, centered with empty space around them, three-quarter view, lit from the upper left, on a fully transparent background (PNG).

The attached image is the style reference. Match its style, not its content. Reply "Ready" and wait for the first request.
```

## Step 3: The prompts, in this order

### 1. His hero

```text
hero_main. Tall portrait image (2:3), transparent background.
Character design of the main hero of the game, standing in a ready battle stance. The 8-year-old player designed this hero. Follow his description closely and keep every detail he wrote. Fill in anything he didn't mention so it fits the style and looks great. Read misspellings the way he meant them.
Class: [Crystal Knight / Sky-Pirate Gunner / Spellwright / Titan Caller]
His description:
"""
[paste his Hero Forge answers here]
"""
The hero should look heroic and cool: a teenager or young adult, not a little kid, and not cartoonish.
```

### 2–4. The companions (skip the one that matches his hero's class)

He gets to name them later.

```text
ally_knight. Tall portrait image (2:3), transparent background.
Character design of a hero: a tall young knight, about 17, in sleek dark-steel plate armor with glowing ice-blue crystal inlays along the seams, a short torn crimson cape, and a heavy tower shield with a glowing crystal core at its center. In the other hand, a greatsword whose edge glows like blue plasma. Calm, protective, battle-worn and proud. Standing in a guarding stance, shield forward.
```

```text
ally_gunner. Tall portrait image (2:3), transparent background.
Character design of a hero: a confident young sky-pirate sharpshooter, about 16, in a long weathered flight coat covered in patches, with flight goggles pushed up on their head and a mechanical brass left arm. They hold two crystal-powered blaster pistols glowing orange and wear a bandolier of glowing ammunition cells across their chest. Cocky grin, mid-spin, ready to fire.
```

```text
ally_spellwright. Tall portrait image (2:3), transparent background.
Character design of a hero: a mysterious spellcaster in a deep-blue hooded robe stitched with silver circuit-like patterns. The face is completely hidden in shadow except for two glowing golden eyes. One raised hand is wreathed in glowing golden rune-letters that spiral up from an open spellbook floating beside them; the other holds a short crystal-tipped wand. Small and slight but powerful, robes stirring in a magical wind.
```

```text
ally_titancaller. Tall portrait image (2:3), transparent background.
Character design of a hero: a fearless young summoner, about 15, in layered armor of dark leather and bone-white plates, with a horned crest helmet pushed back off their face. They hold a tall staff topped with a glowing crystal that has a tiny swirling storm trapped inside. A glowing tattoo of a coiled titan wraps up one arm. Standing tall, staff raised as if calling something enormous.
```

### 5. The tutor companion (let him pick one)

This character helps him when he's stuck, so he should like it a lot. *Want Sparky from Story Quest to be the tutor instead? Skip this and tell Claude.*

```text
tutor_droid. Square image (1:1), transparent background.
A small floating companion drone, about the size of a cat: a smooth round body of white ceramic and brushed steel, one large round lens-eye glowing soft teal, two small jointed fins for steering, a glowing crystal core visible through a little window in its chest, and faint blue thruster glow underneath. Clever, loyal and sleek, a high-tech sidekick. Cool, not cute or babyish.
```

```text
tutor_drake. Square image (1:1), transparent background.
A small dragon companion, about the size of a cat, hovering in the air: sleek obsidian scales with glowing teal crystal growths along its spine, wings like thin panes of stained glass, sharp clever golden eyes, and a tail that ends in a small glowing crystal. Smart, loyal and a little mischievous. Cool, not cute or babyish.
```

### 6–9. Enemies

```text
enemy_scrap_raptor. Square image (1:1), transparent background.
An enemy creature: a lean predator the size of a horse, shaped like a raptor dinosaur, with rusted scrap-metal plates bolted onto its hide, a glowing orange crystal embedded in its chest, long sickle claws and a jagged-toothed jaw. Crouched low, about to pounce.
```

```text
enemy_volt_jelly. Square image (1:1), transparent background.
An enemy creature: a floating crystal jellyfish as big as a car. Its bell is translucent blue crystal with lightning crackling inside, and dozens of long glowing tendrils hang below it, sparking with electricity. Hovering, menacing.
```

```text
enemy_magnet_beetle. Square image (1:1), transparent background.
An enemy creature: a heavy armored beetle the size of a small truck, with a shell of dark riveted iron plates and two huge horseshoe-magnet-shaped horns whose tips glow red and blue. Small chunks of scrap metal float in the air around it, pulled by its magnetism. Head lowered, ready to charge.
```

```text
enemy_dominion_drone. Square image (1:1), transparent background.
An enemy war machine of an evil empire: a wedge-shaped, dark gunmetal and crimson armored drone held aloft by two shielded rotor fans, with one red scanning eye glowing in a narrow slit visor and two folding blade-arms underneath. Cold, sinister, military.
```

### 10. The boss

```text
boss_geode_titan. Square image (1:1), transparent background.
A boss monster: a colossal titan beast with four massive legs, a hammerhead-shaped skull with six glowing amber eyes, and armor plates of cracked geode crystal glowing violet from within, with steam venting from the cracks. Its tail ends in a huge crystal club. Shown from a low angle so it feels enormous, mid-roar.
```

### 11–12. Battle backgrounds

```text
bg_crystal_canyon. Wide landscape image (3:2). No characters or creatures.
A battle background: a deep canyon of giant glowing violet and blue crystal formations at dusk, with a wrecked airship half-buried in the far cliffs, drifting dust and sparks, and a dramatic orange sky. Keep the lower third flat, open ground where fighters will stand.
```

```text
bg_kaiju_coast. Wide landscape image (3:2). No characters or creatures in the foreground.
A battle background: a ruined harbor city at night after a giant monster attack, with toppled cargo cranes, broken neon lights in teal and magenta, heavy rain, and waves crashing over the seawall. A colossal monster silhouette looms far away in the fog. Keep the lower third open, rain-slick pavement where fighters will stand.
```

## Quick fixes

| Problem | Reply with |
|---|---|
| Background isn't transparent | "Same image, but with a fully transparent background, as a PNG." |
| Feet, tail or weapon cut off | "Same image, zoomed out so the whole body fits with space around it." |
| Looks cartoony or cute | "Make it more mature and intense, like the reference image." |
| Style drifted | Paste the Setup message again, then repeat the request. |
| Too close to a famous monster (refused) | Change one big thing (color, head shape, a body part nobody has) and try again. |

## Step 4: Upload

Rename each file to its asset name (`hero_main.png`, `ally_gunner.png`, and so on). Upload them to `art/inbox/batch-01/` and tell Claude. Include:

- his Hero Forge answers (name, class, battle cry), typed out, and
- any names he gave the companions or the tutor.

## Checklist

| # | Asset | Shape | Done |
|---|---|---|---|
| 1 | `hero_main` | portrait | ☐ |
| 2–4 | `ally_knight` / `ally_gunner` / `ally_spellwright` / `ally_titancaller` (three of them) | portrait | ☐ ☐ ☐ |
| 5 | `tutor_droid` or `tutor_drake` | square | ☐ |
| 6 | `enemy_scrap_raptor` | square | ☐ |
| 7 | `enemy_volt_jelly` | square | ☐ |
| 8 | `enemy_magnet_beetle` | square | ☐ |
| 9 | `enemy_dominion_drone` | square | ☐ |
| 10 | `boss_geode_titan` | square | ☐ |
| 11 | `bg_crystal_canyon` | landscape | ☐ |
| 12 | `bg_kaiju_coast` | landscape | ☐ |
