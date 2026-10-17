"""Wave 12: fit Codex's edited cell back onto the sheet.

python tools/art/wave12-fit.py <hero> <sheet> <step> <cell> <attempt>
Scales Codex's 1024 square back to the cell, finds the small shift and scale that
line it up with the old cell, clears stray haze, and writes final.png beside the
attempt (art/raw/wave-12/<hero>_<sheet>_<step>/c<cell>/final.png) plus a
before/after compare.jpg. Prints the alignment and the feet check.
"""
import json
import os
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


def edges(im):
    """Gradient magnitude of the premultiplied brightness: the body's lines, which a new weapon covers only in part."""
    c, a = premul(im)
    l = c @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    gx = np.zeros_like(l)
    gy = np.zeros_like(l)
    gx[:, 1:-1] = l[:, 2:] - l[:, :-2]
    gy[1:-1] = l[2:] - l[:-2]
    return np.hypot(gx, gy)


def edge_score(old_e, new):
    return float(np.minimum(np.abs(old_e - edges(new)), 0.15).mean())


def glow_mask(im, hues):
    """1 where a pixel is bright, saturated and inside one of the hue ranges (degrees): the weapon and its glow."""
    a = np.asarray(im.convert("RGBA"), dtype=np.float32) / 255
    hsv = np.asarray(im.convert("RGB").convert("HSV"), dtype=np.float32)
    h, sat, val = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = np.zeros(h.shape, bool)
    for lo, hi in hues:
        m |= (h >= lo) & (h <= hi)
    m &= (sat > 0.45) & (val > 0.55) & (a[..., 3] > 0.05)
    # Grow it a little so soft glow edges go too.
    g = m.copy()
    for d in (1, 2, 3, 4):
        g[d:] |= m[:-d]; g[:-d] |= m[d:]; g[:, d:] |= m[:, :-d]; g[:, :-d] |= m[:, d:]
    return Image.fromarray((g * 255).astype(np.uint8))


def masked_score(old, keep_old, new, keep_new):
    (oc, oa), (nc, na) = premul(old), premul(new)
    keep = keep_old & keep_new
    d = np.minimum(np.abs(oc - nc), 0.2).mean(-1) + np.minimum(np.abs(oa - na), 0.2)
    return float(d[keep].mean()) if keep.any() else 1.0


def feet(im, cols=None):
    """Lowest row with some solid pixels (only in the given columns, if any)."""
    a = np.asarray(im)[..., 3]
    if cols is not None:
        a = a[:, cols]
    rows = np.where((a > 128).sum(1) > 3)[0]
    return int(rows.max()) if len(rows) else -1


def main():
    hero, sheet, step, c, att = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    base = RAW / f"{hero}_{sheet}_{step}/c{c}"
    old = Image.open(source_sheet(hero, sheet)).convert("RGBA").crop(cell_box(sheet, c))
    fit_cell(old, base, att, ko=sheet == "battle" and c == 4)


def fit_cell(old, base, att, ko=False):
    """Fit base/a<att>/out.png onto the old cell; writes base/final.png, fit.json, compare.jpg."""
    w, h = old.size
    gen = Image.open(base / f"a{att}/out.png").convert("RGBA")
    if gen.size != (1024, 1024):
        gen = gen.resize((1024, 1024), Image.LANCZOS)

    # Coarse then fine search over scale and shift (WAVE12_EDGES=1 matches the body's lines instead of its colors).
    hues = os.environ.get("WAVE12_MASK")
    if hues:
        # e.g. "170-260" or "20-60,170-260": weapon colors left out of the match.
        hues = [tuple(map(float, r.split("-"))) for r in hues.split(",")]
        keep_old = np.asarray(glow_mask(old, hues)) == 0
        gm = Image.merge("RGBA", [glow_mask(gen, hues)] * 4)
        def cost_at(s, dx, dy):
            keep_new = np.asarray(place(gm, w, h, s, dx, dy))[..., 0] < 128
            return masked_score(old, keep_old, place(gen, w, h, s, dx, dy), keep_new)
    elif os.environ.get("WAVE12_EDGES"):
        oe = edges(old)
        cost = lambda im: edge_score(oe, im)
    else:
        cost = lambda im: score(old, im)
    best = (1e9, 1.0, 0, 0)
    for s in np.arange(0.86, 1.141, 0.02):
        for dx in range(-40, 41, 4):
            for dy in range(-40, 41, 4):
                v = cost_at(s, dx, dy) if hues else cost(place(gen, w, h, s, dx, dy))
                best = min(best, (v, s, dx, dy))
    for _ in range(2):
        _, s0, x0, y0 = best
        for s in np.arange(s0 - 0.015, s0 + 0.016, 0.005):
            for dx in range(x0 - 3, x0 + 4):
                for dy in range(y0 - 3, y0 + 4):
                    v = cost_at(s, dx, dy) if hues else cost(place(gen, w, h, s, dx, dy))
                    best = min(best, (v, s, dx, dy))
    v, s, dx, dy = best
    # Feet within 2 px of the old cell (the KO frame lies down, so it is left as fitted).
    # Measured only in the old feet's columns, so a weapon that dips below the boots doesn't count.
    fo = feet(old)
    oa = np.asarray(old)[..., 3]
    cols = np.where((oa[max(fo - 20, 0):fo + 1] > 128).any(0))[0]
    if not ko and not os.environ.get("WAVE12_NOSNAP"):
        # Off for Section C: a big weapon glowing below the boots reads as feet and drags the hero up.
        fd = feet(place(gen, w, h, s, dx, dy), cols) - fo
        if 1 < abs(fd) <= 40:
            dy -= fd
    new = place(gen, w, h, s, dx, dy)

    # Clear faint haze and keep a transparent 2 px ring at the cell edge.
    arr = np.asarray(new).copy()
    arr[arr[..., 3] < 10] = 0
    # What reaches the cell edge (a raised blade's tip) fades out over the last 12 px instead of being cut.
    edge = arr[..., 3]
    touch = int(max(edge[2].max(), edge[-3].max(), edge[:, 2].max(), edge[:, -3].max()))
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.minimum.reduce([yy, h - 1 - yy, xx, w - 1 - xx]).astype(np.float32)
    ramp = np.clip((dist - 2) / 12, 0, 1)
    arr[..., 3] = (arr[..., 3] * ramp).astype(np.uint8)
    arr[arr[..., 3] == 0] = 0
    new = Image.fromarray(arr)
    new.save(base / "final.png")
    report = {"attempt": att, "scale": round(float(s), 3), "dx": int(dx), "dy": int(dy), "score": round(v, 4),
              "feet_old": fo, "feet_new": feet(new, cols), "edge_alpha": touch}
    report["feet_ok"] = abs(report["feet_old"] - report["feet_new"]) <= 2 or ko
    (base / "fit.json").write_text(json.dumps(report))
    cmp = Image.new("RGBA", (w * 2 + 8, h), (60, 60, 60, 255))
    cmp.alpha_composite(old, (0, 0))
    cmp.alpha_composite(new, (w + 8, 0))
    cmp.convert("RGB").save(base / "compare.jpg", quality=88)
    print(json.dumps(report))
    return report


if __name__ == "__main__":
    main()
