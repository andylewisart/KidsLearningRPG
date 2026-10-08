# Wave 00: Style anchors

Three images that define the look. Every later image uses them as references, so they need the parent's approval before anything else is made. Follow [`../PRODUCTION.md`](../PRODUCTION.md) and [`../STYLE.md`](../STYLE.md).

Anchors use the **master style prompt + rules block** with no add-on block (they're full scenes). Save them to `public/assets/anchors/<id>.webp` with `"kind": "anchor"` in the manifest.

---

### ☐ `key_art`

- **Output:** `anchors/key_art.webp`, `1536x1024`, opaque, highest quality.
- **If the parent supplies their ChatGPT test image** (in `art/incoming/key_art.png`, or attached to your task), **process that instead of generating.** It's already approved.
- **Prompt:**

```text
Create a wide 3:2 key art image for an original fantasy role-playing game.

SCENE: On a crumbling stone pier at golden hour, three young heroes stand ready for battle:
- a stoic crystal knight in sea-weathered armor, a glowing blue greatsword resting on one shoulder;
- a grinning sky-pirate gunner with flight goggles, a patched long coat and two crystal-powered blaster pistols;
- a mysterious hooded spellcaster whose face is hidden in shadow except for two glowing eyes, with glowing rune-letters circling one hand.
Behind them, a colossal sea titan rises out of the turquoise ocean, taller than a lighthouse, its back crusted with glowing crystal reefs and seawater pouring off its armored hide. A battered sky-pirate airship with patched sails and spinning propellers banks overhead.
Comedic touch: on a pier post in the foreground, a smug three-eyed monkey in a tiny captain's hat eats a banana, completely unbothered by the giant monster.
```

### ☐ `battle_mock`

- **Output:** `anchors/battle_mock.webp`, `1536x1024`, opaque, highest quality.
- **References:** `anchors/key_art.webp`. The parent may also supply this one as `art/incoming/battle_mock.png`.
- **Prompt:**

```text
An in-game battle from this game, with no user interface. Side view on a jungle-ruin path: three heroes on the right facing left (a crystal knight with a glowing blue greatsword, a sky-pirate gunner with twin orange crystal blasters, a small hooded spellcaster with glowing golden eyes); on the left, a raptor-like beast armored in rusted scrap metal and a floating crystal jellyfish crackling with lightning. The knight's sword strike lands on the raptor in a burst of light, while a third creature that was just defeated dissolves into a swirl of glowing blue-green motes (no blood). Wide 3:2.
```

### ☐ `cast_lineup`

- **Output:** `anchors/cast_lineup.webp`, `1536x1024`, **plain light-gray studio background** (a model sheet, not a sprite), highest quality.
- **References:** `anchors/key_art.webp`.
- **Prompt:**

```text
A character lineup model sheet for the main cast of this game: all characters standing side by side in a row, full body, at true relative height, on a plain light-gray studio background, evenly lit, each one clearly separated. Left to right:
1. THE CRYSTAL KNIGHT: a tall, stoic young man about 17 with short storm-gray hair and a scar through one eyebrow; sea-weathered steel armor over a sleeveless navy tunic; one oversized pauldron shaped like a shark's dorsal fin on his left shoulder, a bare right arm with a leather bracer; layered leather belts with brass buckles; a tattered crimson scarf; a tower shield with a glowing ice-blue crystal core and a greatsword with an ice-blue plasma edge.
2. THE SKY-PIRATE GUNNER: a cocky young woman about 16 with a messy copper-red braid, a teal bandana and flight goggles pushed up on her forehead; a long patched brown coat with the left sleeve torn off, revealing a brass mechanical arm with visible gears; a cropped vest, crossed belts and holsters, a bandolier of glowing orange ammunition cells; twin crystal blaster pistols glowing orange.
3. THE SPELLWRIGHT: a small, mysterious spellcaster about the height of a 10-year-old, in a deep-indigo hooded robe embroidered with silver circuit-like patterns and fastened with many buckled straps; the face completely hidden in shadow except for two glowing golden eyes; a spellbook floating open beside them and glowing golden rune-letters orbiting one raised hand; a crystal-tipped wand.
4. THE TITAN CALLER: a fearless young woman about 15 with dark brown skin and long black hair braided with small seashells; a white wrap top with long detached sleeves patterned with blue wave motifs, a coral sash, a split skirt over leggings, bone-white armor plates on her left shoulder and hip; a tall staff topped with a crystal holding a tiny trapped lightning storm; a glowing teal tattoo of a coiled titan running up her right arm.
5. THE TUTOR DROID, floating at shoulder height: a cat-sized sphere of white ceramic and brushed steel with one large round teal lens-eye and an eyelid shutter, two small jointed fins, a little window showing a glowing crystal core, faint blue thrusters underneath, wearing a tiny battered navy pirate captain's hat, slightly crooked.
6. THE THREE-EYED MONKEY, sitting on the knight's shield: small, golden-brown fur, three eyes (the third in the middle of its forehead), a tiny navy captain's hat and a gold earring, holding a half-eaten banana, looking deeply unimpressed.
```

---

## ⛔ Gate: stop here

Commit, then ask the user to review `art/review/wave-00.md`. Once approved, set all three to `approved` in the manifest and tick them in the "Approved anchors" table in [`../STYLE.md`](../STYLE.md). This is the one time you may edit that file.

## Notes

*(Codex: log flagged or skipped assets here.)*
