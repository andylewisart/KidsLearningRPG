"""Wave 12 Section C: forged weapons that read at a glance.

python tools/art/wave12-c.py gen <hero> <step> <cell> [attempt]
python tools/art/wave12-c.py fit <hero> <step> <cell> <attempt>
python tools/art/wave12-c.py assemble <hero> <step>
python tools/art/wave12-c.py strip <hero>        128 px idle strip: as found, step 1, step 2

Each cell is an edit of battle.webp (the weapon as found), one look per step:
step 1 bright gold, about 1.3x; step 2 the hero's signature color, about 1.6x,
strong glow and sparkles. Raw work goes to art/raw/wave-12/<hero>_c<step>/c<cell>/.
The sheet replaces Section A's battle_<step>.webp; the manifest entry stays.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
gen = __import__("wave12-gen")
fit = __import__("wave12-fit")
bare = __import__("wave12-bare")

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"

STEP = {
    1: ("noticeably bigger, about 1.3 times the size of the weapon it replaces, with a clearly different shape",
        "Bright gold metal with amber/orange crystal or flame accents, and a steady warm gold glow around the weapon."),
    2: ("noticeably bigger, about 1.6 times the size of the weapon it replaces, the boldest shape",
        "The hero's signature color, saturated, with white-hot edges; a strong glow plus a few sparkles or motes floating off it."),
}
SHAPE = {
    ("knight", 1): "the Shard Sword: a broad gold longsword with amber crystal shards along the edge (no longer a thin blue blade)",
    ("knight", 2): "the Sharkfin Blade: a huge curved teal-and-white sharkfin greatsword crackling with white lightning, with a red streamer",
    ("gunner", 1): "the Brass-Fin Blasters: gold blasters with flared fins and glowing amber barrels (one in each hand)",
    ("gunner", 2): "the Storm Blasters: long double-barreled blasters in electric blue with crackling white muzzles (one in each hand)",
    ("spellwright", 1): "the Gold-Clasp Spellbook: a bigger gold-armored book, open, with a glowing amber sigil floating above it",
    ("spellwright", 2): "the Book of Flying Pages: a large book in violet-and-white light, its glowing pages flying around him in a ring",
    ("titancaller", 1): "the Coral Crown Staff: a gold staff topped with a big red-orange coral crown",
    ("titancaller", 2): "the Living Tide Staff: a tall staff topped with a huge swirling sea-blue water orb, white foam spiralling around it",
    ("beastkeeper", 1): "the Amber Crook: a gold shepherd's crook with a big glowing amber lantern hanging from the hook",
    ("beastkeeper", 2): "the Greenwood Crook: a tall leafy shepherd's crook in bright green, with white flowers and a teal sea-dragon head at the hook",
}
EFFECT = {
    "knight": "His slash arc or magic swirl, where there is one, keeps its shape and takes the new weapon's color.",
    "gunner": "Muzzle flashes and swirls keep their shape and take the new blasters' color.",
    "spellwright": "Any glow or orbiting runes around the book keep their shape and take the new book's color. His wand-torch stays exactly as it is.",
    "titancaller": "Any water ribbons or glow coming off the staff keep their shape and take the new staff's colors.",
    "beastkeeper": "Any lantern swirl or glow coming off the crook keeps its shape and takes the new crook's colors.",
}


def lead(step):
    return gen.LEAD.replace("about the same size against the hero as the weapon it replaces", STEP[step][0])


def raw(hero, step, c):
    return RAW / f"{hero}_c{step}/c{c}"


def do_gen(hero, step, c, attempt):
    d = A / f"characters/ally_{hero}"
    out = raw(hero, step, c) / f"a{attempt}"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    old = Image.open(d / "battle.webp").convert("RGBA").crop(fit.cell_box("battle", c))
    if os.environ.get("EDIT_FROM"):
        # Start from another finished cell of the same frame (e.g. step 1's), when edits of the old cell keep moving the hero.
        old = Image.open(os.environ["EDIT_FROM"]).convert("RGBA")
    bare.to_square(old).save(out / "cell.png")
    Image.open(d / "base.webp").save(out / "hero.png")
    refs = ["cell.png", "hero.png"]
    extra = ""
    s1 = raw(hero, 1, c) / "final.png"
    if step == 2 and s1.exists():
        bare.to_square(Image.open(s1).convert("RGBA")).save(out / "step1.png")
        refs.append("step1.png")
        extra = ("Image 3 is the same frame with the previous, gold upgrade: use it only for where the hand grips the "
                 "weapon. The new weapon is a different color and bigger than that one.\n\n")
    note = os.environ.get("NOTE", "")
    note = note + "\n\n" if note else ""
    brief = f"""Generate 1 image with your image generation tool (edit mode, using the attached images as references) and save it as a PNG named `out.png` in the current folder. Actually generate and save the image; don't just describe it.

{lead(step)}

{STEP[step][1]}

Image 1 (`cell.png`) is the picture to edit: one battle animation frame of a game sprite, 1024x1024 on a transparent background. Edit THIS picture. Keep the canvas 1024x1024 and keep the hero at exactly the same position, size and pose in the canvas, feet at the same height, so the edited frame lines up with the others. The bigger weapon must still fit entirely inside the canvas with a clear margin; nothing touches the edges.

The weapon to remove is {gen.OLD_WEAPON[hero]}. Replace it with {SHAPE[(hero, step)]}. It must look obviously different from the old weapon at a glance, even when the sprite is tiny. Image 2 (`hero.png`) is the hero's character reference, so the hero stays on-model (ignore the weapon in it). {EFFECT[hero]}

{extra}{note}{gen.SPRITE}

{gen.RULES}

Output: 1024x1024 PNG with a transparent background (alpha), no ground, no shadow. When done, reply with the filename you saved and one line describing it.
"""
    (out / "brief.md").write_text(brief, encoding="utf-8")
    cmd = [gen.codex_exe(), "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(out), "-o", str(out / "reply.txt")]
    for r in refs:
        cmd += ["-i", str(out / r)]
    cmd.append("-")
    with open(out / "log.txt", "w", encoding="utf-8") as log:
        r = subprocess.run(cmd, input=brief, text=True, encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, timeout=1500)
    print(out, "exit", r.returncode, "->", [p.name for p in out.glob("*.png") if p.name not in refs])


def do_fit(hero, step, c, att):
    old = Image.open(A / f"characters/ally_{hero}/battle.webp").convert("RGBA").crop(fit.cell_box("battle", c))
    fit.fit_cell(old, raw(hero, step, c), att, ko=c == 4)


def do_assemble(hero, step):
    d = A / f"characters/ally_{hero}"
    src = Image.open(d / "battle.webp").convert("RGBA")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    for c in range(6):
        f = raw(hero, step, c) / "final.png"
        if not f.exists():
            sys.exit(f"missing {f}")
        out.paste(Image.open(f).convert("RGBA"), fit.cell_box("battle", c)[:2])
    rel = d / f"battle_{step}.webp"
    out.save(rel, "WEBP", quality=86, method=6)
    print(rel.name, rel.stat().st_size // 1024, "KB")


def do_strip(hero):
    d = A / f"characters/ally_{hero}"
    cells = []
    for name in ("battle.webp", "battle_1.webp", "battle_2.webp"):
        cell = Image.open(d / name).convert("RGBA").crop((0, 0, 512, 512))
        cells.append(cell.resize((128, 128), Image.LANCZOS))
    strip = Image.new("RGBA", (3 * 128 + 2 * 16 + 32, 128 + 32), (72, 72, 78, 255))
    for i, cell in enumerate(cells):
        strip.alpha_composite(cell, (16 + i * 144, 16))
    p = ROOT / f"art/review/wave-12/{hero}_idle_strip.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    strip.save(p)
    print(p)


if __name__ == "__main__":
    op, hero = sys.argv[1], sys.argv[2]
    if op == "gen":
        do_gen(hero, int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 1)
    elif op == "fit":
        do_fit(hero, int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]))
    elif op == "assemble":
        do_assemble(hero, int(sys.argv[3]))
    else:
        do_strip(hero)
