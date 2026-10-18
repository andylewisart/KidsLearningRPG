"""Empty-handed walks, second pass: the free arm swings low instead of staying up in a fist (Cade, Wren).

python tools/art/walk-arms.py fit <hero> <dir> [out.png]   fit Codex's cN/<out.png> onto walk_bare's cells -> art/raw/wave-12/<hero>_walk_arms/cN.png
python tools/art/walk-arms.py assemble <hero>             write the fitted cells into characters/ally_<hero>/walk_bare.webp
Briefs, references and Codex's raw output were made per cell (one edit of each walk_bare cell, run on the parent's PC).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
fit = __import__("wave12-fit")

ROOT = Path(__file__).resolve().parents[2]
HERO = sys.argv[2]
SHEET = ROOT / f"public/assets/characters/ally_{HERO}/walk_bare.webp"
OUT = ROOT / f"art/raw/wave-12/{HERO}_walk_arms"


def do_fit(src, name="out.png"):
    sheet = Image.open(SHEET).convert("RGBA")
    for c in range(8):
        old = sheet.crop(fit.cell_box("walk", c))
        w, h = old.size
        g = Image.open(Path(src) / f"c{c}/{name}").convert("RGBA")
        if g.size != (1024, 1024):
            g = g.resize((1024, 1024), Image.LANCZOS)
        best = (1e9, 1.0, 0, 0)
        for s in np.arange(0.90, 1.101, 0.02):
            for dx in range(-28, 29, 4):
                for dy in range(-28, 29, 4):
                    best = min(best, (fit.score(old, fit.place(g, w, h, s, dx, dy)), s, dx, dy))
        for _ in range(2):
            _, s0, x0, y0 = best
            for s in np.arange(s0 - 0.015, s0 + 0.016, 0.005):
                for dx in range(x0 - 3, x0 + 4):
                    for dy in range(y0 - 3, y0 + 4):
                        best = min(best, (fit.score(old, fit.place(g, w, h, s, dx, dy)), s, dx, dy))
        v, s, dx, dy = best
        fd = fit.feet(fit.place(g, w, h, s, dx, dy)) - fit.feet(old)
        if abs(fd) > 1:
            dy -= fd
        arr = np.asarray(fit.place(g, w, h, s, dx, dy)).copy()
        arr[arr[..., 3] < 10] = 0
        arr[:2], arr[-2:], arr[:, :2], arr[:, -2:] = 0, 0, 0, 0
        new = Image.fromarray(arr)
        OUT.mkdir(parents=True, exist_ok=True)
        new.save(OUT / f"c{c}.png")
        print(c, json.dumps({"scale": round(float(s), 3), "dx": int(dx), "dy": int(dy), "score": round(v, 4),
                             "feet_old": fit.feet(old), "feet_new": fit.feet(new)}))


def do_assemble():
    out = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    for c in range(8):
        out.paste(Image.open(OUT / f"c{c}.png").convert("RGBA"), fit.cell_box("walk", c)[:2])
    out.save(SHEET, "WEBP", quality=86, method=6)
    print(SHEET.relative_to(ROOT), SHEET.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    do_fit(*sys.argv[3:5]) if sys.argv[1] == "fit" else do_assemble()
