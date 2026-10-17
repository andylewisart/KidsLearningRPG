"""Wave 12 Section C: the ten forged-weapon icons, redone to match the new sheets.

python tools/art/wave12-icons.py gen <hero> <step> [attempt]
python tools/art/wave12-icons.py build          paste every finished icon into icons/weapons_ch2.webp

Each icon is painted from the hero's finished battle_<step>.webp idle cell (the
weapon to draw) in the style of the old icon. Raw work: art/raw/wave-12/icon_<hero>_<step>/a<n>/.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
gen = __import__("wave12-gen")
c = __import__("wave12-c")

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"
SHEET = A / "icons/weapons_ch2.webp"


def icon_box(hero, step):
    i = gen.ICONS.index(f"ally_{hero}_{step}")
    return (i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256)


def do_gen(hero, step, attempt):
    out = RAW / f"icon_{hero}_{step}/a{attempt}"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    d = A / f"characters/ally_{hero}"
    Image.open(d / f"battle_{step}.webp").convert("RGBA").crop((0, 0, 512, 512)).resize((1024, 1024), Image.LANCZOS).save(out / "weapon_in_hand.png")
    Image.open(SHEET).convert("RGBA").crop(icon_box(hero, step)).resize((1024, 1024), Image.LANCZOS).save(out / "old_icon.png")
    refs = ["weapon_in_hand.png", "old_icon.png"]
    brief = f"""Generate 1 image with your image generation tool (using the attached images as references) and save it as a PNG named `out.png` in the current folder. Actually generate and save the image; don't just describe it.

A game inventory icon of one weapon on its own: {c.SHAPE[(hero, step)]}. {c.STEP[step][1]}

Image 1 (`weapon_in_hand.png`) shows a hero holding this exact weapon in battle: copy the weapon's design, shape, colors and glow exactly, so the icon and the battle sprite clearly show the same weapon. Draw only the weapon: no hand, no hero, no other objects.

Image 2 (`old_icon.png`) is the old icon in this slot: match its style (painterly, detailed, lit from the upper left), its diagonal composition and how much of the square it fills. The new weapon must look obviously different from the old icon at a glance.

The weapon is centered with a clear margin on every side and fully inside the picture, on a fully transparent background (PNG with alpha), no frame, no ground, no shadow, no text.

{gen.RULES}

Output: 1024x1024 PNG with a transparent background. When done, reply with the filename you saved and one line describing it.
"""
    (out / "brief.md").write_text(brief, encoding="utf-8")
    cmd = [gen.codex_exe(), "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(out), "-o", str(out / "reply.txt")]
    for r in refs:
        cmd += ["-i", str(out / r)]
    cmd.append("-")
    with open(out / "log.txt", "w", encoding="utf-8") as log:
        r = subprocess.run(cmd, input=brief, text=True, encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, timeout=1500)
    print(out, "exit", r.returncode, "->", [p.name for p in out.glob("*.png") if p.name not in refs])


def latest(hero, step):
    tries = sorted((RAW / f"icon_{hero}_{step}").glob("a*/out.png"), key=lambda p: int(p.parent.name[1:]))
    pick = RAW / f"icon_{hero}_{step}/pick.txt"
    if pick.exists():
        return RAW / f"icon_{hero}_{step}/a{pick.read_text().strip()}/out.png"
    return tries[-1] if tries else None


def fit_icon(path):
    """Trim to the weapon, scale it to fill the 256 cell with a 12 px margin, center it."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 16)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = 232 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    cell = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    cell.alpha_composite(im, ((256 - im.width) // 2, (256 - im.height) // 2))
    return cell


def do_build():
    sheet = Image.open(SHEET).convert("RGBA")
    for name in gen.ICONS:
        hero, step = name[5:-2], int(name[-1])
        p = latest(hero, step)
        if p is None:
            print("kept old", name)
            continue
        box = icon_box(hero, step)
        sheet.paste(Image.new("RGBA", (256, 256), (0, 0, 0, 0)), box[:2])
        sheet.paste(fit_icon(p), box[:2])
        print("icon", name, "<-", p.parent.name)
    sheet.save(SHEET, "WEBP", quality=90, method=6)
    print(SHEET.name, SHEET.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    if sys.argv[1] == "gen":
        do_gen(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]) if len(sys.argv) > 4 else 1)
    else:
        do_build()
