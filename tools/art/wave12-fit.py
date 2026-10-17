"""Wave 12: fit Codex's edited cell back onto the sheet.

python tools/art/wave12-fit.py <hero> <sheet> <step> <cell> <attempt>
Scales Codex's 1024 square back to the cell, finds the small shift and scale that
line it up with the old cell, clears stray haze, and writes final.png beside the
attempt (art/raw/wave-12/<hero>_<sheet>_<step>/c<cell>/final.png) plus a
before/after compare.jpg. Prints the alignment and the feet check.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"


def cell_box(sheet, c):
    if sheet == "battle":
        return (c % 3 * 512, c // 3 * 512, c % 3 * 512 + 512, c // 3 * 512 + 512)
    return (c % 4 * 384, c // 4 * 512, c % 4 * 384 + 384, c // 4 * 512 + 512)


def source_sheet(hero, sheet):
    d = A / f"characters/ally_{hero}"
    if sheet == "walk" and (d / "walk_src.webp").exists():
        return d / "walk_src.webp"
    return d / f"{sheet}.webp"


def place(gen, w, h, s, dx, dy):
    """Codex's square scaled by s about the cell's bottom center, shifted by dx, dy (cell px)."""
    region = gen.crop(((1024 - 2 * w) // 2, 0, (1024 - 2 * w) // 2 + 2 * w, 2 * h))
    sw, sh = round(w * s), round(h * s)
    small = region.resize((sw, sh), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(small, (round((w - sw) / 2 + dx), round(h - sh + dy)), small)
    return out


def premul(im):
    a = np.asarray(im, dtype=np.float32) / 255
    return a[..., :3] * a[..., 3:], a[..., 3]


def score(old, new):
    """Truncated difference, so the repainted weapon costs the same wherever it lands and the body decides."""
    (oc, oa), (nc, na) = premul(old), premul(new)
    return float(np.minimum(np.abs(oc - nc), 0.2).mean() + np.minimum(np.abs(oa - na), 0.2).mean())


def feet(im):
    a = np.asarray(im)[..., 3]
    rows = np.where((a > 128).sum(1) > 3)[0]
    return int(rows.max()) if len(rows) else -1


def main():
    hero, sheet, step, c, att = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    base = RAW / f"{hero}_{sheet}_{step}/c{c}"
    old = Image.open(source_sheet(hero, sheet)).convert("RGBA").crop(cell_box(sheet, c))
    w, h = old.size
    gen = Image.open(base / f"a{att}/out.png").convert("RGBA")
    if gen.size != (1024, 1024):
        gen = gen.resize((1024, 1024), Image.LANCZOS)

    # Coarse then fine search over scale and shift.
    best = (1e9, 1.0, 0, 0)
    for s in np.arange(0.90, 1.101, 0.02):
        for dx in range(-28, 29, 4):
            for dy in range(-28, 29, 4):
                v = score(old, place(gen, w, h, s, dx, dy))
                best = min(best, (v, s, dx, dy))
    for _ in range(2):
        _, s0, x0, y0 = best
        for s in np.arange(s0 - 0.015, s0 + 0.016, 0.005):
            for dx in range(x0 - 3, x0 + 4):
                for dy in range(y0 - 3, y0 + 4):
                    v = score(old, place(gen, w, h, s, dx, dy))
                    best = min(best, (v, s, dx, dy))
    v, s, dx, dy = best
    # Feet within 2 px of the old cell (the KO frame lies down, so it is left as fitted).
    if not (sheet == "battle" and c == 4):
        fo = feet(old)
        fd = feet(place(gen, w, h, s, dx, dy)) - fo
        if abs(fd) > 1:
            dy -= fd
    new = place(gen, w, h, s, dx, dy)

    # Clear faint haze and keep a transparent 2 px ring at the cell edge.
    arr = np.asarray(new).copy()
    arr[arr[..., 3] < 10] = 0
    arr[:2], arr[-2:], arr[:, :2], arr[:, -2:] = 0, 0, 0, 0
    new = Image.fromarray(arr)
    new.save(base / "final.png")

    edge = np.asarray(new)[..., 3]
    touch = int(max(edge[2].max(), edge[-3].max(), edge[:, 2].max(), edge[:, -3].max()))
    report = {"attempt": att, "scale": round(float(s), 3), "dx": int(dx), "dy": int(dy), "score": round(v, 4),
              "feet_old": feet(old), "feet_new": feet(new), "edge_alpha": touch}
    report["feet_ok"] = abs(report["feet_old"] - report["feet_new"]) <= 2 or c == 4 and sheet == "battle"
    (base / "fit.json").write_text(json.dumps(report))
    cmp = Image.new("RGBA", (w * 2 + 8, h), (60, 60, 60, 255))
    cmp.alpha_composite(old, (0, 0))
    cmp.alpha_composite(new, (w + 8, 0))
    cmp.convert("RGB").save(base / "compare.jpg", quality=88)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
