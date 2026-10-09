"""Repair the cut-out edges of the battle backdrops' foreground layers.

Art wave 02 delivered each foreground layer (bg_*_fg.webp: the posts, pillars
and canopies that frame a scene and move fastest in the parallax) cut out with
one shared rectangle whose edges fade over about 48 px. In the game that fade
shows: posts and pillars dissolve into a smear a third of the way up the
screen, canopies end in a straight line, and the outer edge goes see-through.

This pass, per layer:
  1. divides the rectangle's fade back out of the alpha, so every piece is
     solid right up to the old cut;
  2. carries each piece past the cut, mirroring the last stretch of it and
     darkening and softening it as it goes (a post or canopy that close to
     the camera falls into shadow and out of focus), so the bottom of a post
     and the top of a canopy are always off screen;
  3. mirrors a few columns out to the left and right edges;
  4. erases the odd blurred smudge (ERASE below).

Only pieces that actually reach a cut are carried past it: a torn flag that
ends above the cut doesn't grow a mirrored twin.

    python3 tools/art/fix_fg.py            fix the layers the manifest lists (once each)
    python3 tools/art/fix_fg.py --check    report what it would do, and any straight cuts left

The manifest records "cleaned" on each fixed layer, so running it again does
nothing. Needs Pillow and numpy.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
TAG = "tools/art/fix_fg.py"

# The wave 02 cut, measured on all three layers (1536x1024): alpha ramps
# linearly from 0 to 1 over these spans.
RAMP_LEFT = (0.0, 24.0)
RAMP_RIGHT = (1536.0, 1512.0)
RAMP_TOP = (123.4, 172.0)
RAMP_BOTTOM = (806.1, 757.5)

AXIS_TOP = 140  # rows above this are rebuilt (carried upward)
AXIS_BOTTOM = 790  # rows below this are rebuilt (carried downward)
AXIS_LEFT = 8
AXIS_RIGHT = 1528

# How each cut is carried on. squash < 1 folds the mirror image closer to the
# cut, so a canopy reads as out-of-focus fronds rather than a kaleidoscope;
# shade is how much darker it gets at the far end, blur how soft.
BOTTOM = dict(squash=1.0, shade=0.55, span=190.0, blur=2.5)
TOP = dict(squash=0.35, shade=0.7, span=110.0, blur=6.0)

# Straight cuts inside the frame, where a piece was sliced off by the export
# rather than ending on its own: ("row", y, x0, x1) keeps what's above row y,
# ("col", x, y0, y1) keeps what's left of column x. Each becomes a ragged,
# soft edge (these pieces are out of focus anyway). Found with --check.
CUTS = {
    "bg_crystal_canyon": [("row", 340, 0, 1536), ("col", 81, 380, 760)],
    "bg_jungle_ruins": [("col", 82, 360, 650)],
}
RAGGED = 34  # how far (px) a ragged edge wanders back from the old cut
SOFT = 10  # px of soft edge

# Bits that were painted as an out-of-focus smudge rather than a shape, erased
# by hand (polygons in image pixels). Reviewed by eye.
ERASE = {
    "bg_shipwreck_cove": [
        # a blurred lump at the foot of the right-hand post
        [(1470, 636), (1501, 636), (1501, 830), (1430, 830), (1430, 712), (1456, 712), (1456, 690), (1470, 690)],
    ],
}


def ramp(v, zero, one):
    return np.clip((v - zero) / (one - zero), 0.0, 1.0)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def frame_fade(w, h):
    """The cut's fade across columns and down rows (it was applied as their product)."""
    xs = np.arange(w, dtype=np.float64) + 0.5
    ys = np.arange(h, dtype=np.float64) + 0.5
    rx = np.minimum(ramp(xs, *RAMP_LEFT), ramp(xs, *RAMP_RIGHT))
    ry = np.minimum(ramp(ys, *RAMP_TOP), ramp(ys, *RAMP_BOTTOM))
    return rx, ry


def looks_cut(alpha):
    """Does this layer have the wave 02 cut? (Checks the bottom fade on solid columns.)"""
    a = alpha / 255.0
    solid = np.nonzero(a[740] > 0.95)[0]
    if len(solid) < 20:
        return False
    want = ramp(np.array([770.5, 780.5, 790.5]), *RAMP_BOTTOM)
    got = a[[770, 780, 790]][:, solid].mean(axis=1)
    return bool(np.all(np.abs(got - want) < 0.08))


def soft(rgb, alpha, radius):
    """A Gaussian blur that doesn't drag dark fringes in from transparent pixels."""
    pre = np.dstack([rgb * alpha[:, :, None], alpha * 255.0])
    chans = [np.asarray(Image.fromarray(pre[:, :, i].clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))).astype(np.float64) for i in range(4)]
    a = chans[3] / 255.0
    out = np.dstack(chans[:3]) / np.maximum(a, 1e-3)[:, :, None]
    return out.clip(0, 255), a


def carry(rgb, alpha, axis, direction, squash, shade, span, blur):
    """Carry every piece that reaches the cut at `axis` on past it (direction -1: up, +1: down)."""
    h, w = alpha.shape
    rows = np.arange(h)
    out_rows = rows[rows < axis] if direction < 0 else rows[rows > axis]
    dist = np.abs(out_rows - axis).astype(np.float64)
    # mirror the rows on the near side of the cut, folded closer by `squash`
    src_rows = np.clip(np.round(axis - direction * dist * squash).astype(int), 0, h - 1)
    # only columns where a piece reaches the cut carry on past it
    band = alpha[axis - 10 : axis + 1] if direction > 0 else alpha[axis : axis + 11]
    reach = band.max(axis=0)
    reach = np.asarray(Image.fromarray((reach * 255).astype(np.uint8)[None, :]).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3)))[0] / 255.0
    reach = smoothstep((reach - 0.2) / 0.6)
    ext_rgb = rgb[src_rows] * (1.0 - shade * smoothstep(dist / span))[:, None, None]
    ext_a = alpha[src_rows] * reach[None, :]
    # softer the further it goes, like something too close to the lens
    blur_rgb, blur_a = soft(ext_rgb, ext_a, blur)
    k = smoothstep(dist / 60.0)[:, None]
    rgb[out_rows] = ext_rgb * (1 - k[:, :, None]) + blur_rgb * k[:, :, None]
    alpha[out_rows] = ext_a * (1 - k) + blur_a * k
    # soften the fold line a little
    lo, hi = axis - 6, axis + 7
    seam_rgb, seam_a = soft(rgb[lo:hi], alpha[lo:hi], 1.2)
    rgb[lo:hi], alpha[lo:hi] = seam_rgb, seam_a


def noise1d(n, seed, step=14):
    """Smooth 1-D noise in [0, 1]: two octaves of cosine-interpolated random knots."""
    rng = np.random.default_rng(seed)
    out = np.zeros(n)
    for amp, st in ((0.7, step), (0.3, max(3, step // 3))):
        knots = rng.random(n // st + 3)
        t = np.arange(n) / st
        i = t.astype(int)
        f = (1 - np.cos((t - i) * np.pi)) / 2
        out += amp * (knots[i] * (1 - f) + knots[i + 1] * f)
    return out


def ragged(alpha, cut, seed):
    """Turn a straight cut into a ragged soft edge, eating back up to RAGGED px from it."""
    kind, at, lo, hi = cut
    band = RAGGED + SOFT + 2  # only this strip before the cut changes
    edge = at - RAGGED * noise1d(hi - lo, seed)  # where the piece now ends, along the cut
    if kind == "row":
        ys = np.arange(at - band, at)[:, None]
        alpha[at - band : at, lo:hi] *= smoothstep((edge[None, :] - ys) / SOFT)
    else:
        xs = np.arange(at - band, at)[None, :]
        keep = smoothstep((edge[:, None] - xs) / SOFT)
        # ease the new edge in over 24 px at each end of the cut
        span = np.minimum(np.arange(hi - lo), np.arange(hi - lo)[::-1]) / 24.0
        w = smoothstep(span)[:, None]
        alpha[lo:hi, at - band : at] *= (1 - w) + w * keep


def hard_cuts(alpha):
    """Long straight edges where a piece goes from solid to clear in a few pixels."""
    found = []
    for y in range(150, 790):
        n = int(((alpha[y - 2] > 0.7) & (alpha[y + 2] < 0.04)).sum())
        if n > 25:
            found.append(f"row {y} ({n} px)")
    for x in range(30, 1506):
        n = int(((alpha[:, x - 2] > 0.7) & (alpha[:, x + 2] < 0.04)).sum())
        if n > 60:
            found.append(f"col {x} ({n} px)")
    return found


def erase(alpha, polygons):
    mask = Image.new("L", (alpha.shape[1], alpha.shape[0]), 0)
    draw = ImageDraw.Draw(mask)
    for poly in polygons:
        draw.polygon(poly, fill=255)
    m = np.asarray(mask.filter(ImageFilter.GaussianBlur(2))).astype(np.float64) / 255.0
    return alpha * (1 - m)


def fix(path, key=""):
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).astype(np.float64)
    rgb = arr[:, :, :3].copy()
    a8 = arr[:, :, 3]
    if not looks_cut(a8):
        return None
    h, w = a8.shape
    rx, ry = frame_fade(w, h)
    alpha = a8 / 255.0
    # divide the fade back out wherever it left enough to work with (the rest is rebuilt below)
    usable = (ry[:, None] > 0.3) & (rx[None, :] > 0.3)
    fade = np.maximum(ry[:, None] * rx[None, :], 1e-6)
    alpha = np.where(usable, np.minimum(1.0, alpha / fade), alpha)
    # the export never quite reached full alpha (252 of 255): make solid solid
    alpha = np.clip((alpha - 0.03) / 0.9, 0.0, 1.0)
    if key in ERASE:
        alpha = erase(alpha, ERASE[key])
    for i, cut in enumerate(CUTS.get(key, [])):
        ragged(alpha, cut, seed=7 + 31 * i + len(key))
    # the side edges: mirror a few columns out to the border
    for x in range(0, AXIS_LEFT):
        src = 2 * AXIS_LEFT - x
        rgb[:, x], alpha[:, x] = rgb[:, src], alpha[:, src]
    for x in range(AXIS_RIGHT + 1, w):
        src = 2 * AXIS_RIGHT - x
        rgb[:, x], alpha[:, x] = rgb[:, src], alpha[:, src]
    carry(rgb, alpha, AXIS_BOTTOM, +1, **BOTTOM)
    carry(rgb, alpha, AXIS_TOP, -1, **TOP)
    # a clean edge: drop the faintest haze, keep soft edges soft
    alpha = np.where(alpha < 0.04, 0.0, alpha)
    out = np.dstack([rgb, alpha * 255.0]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), alpha


def main():
    check = "--check" in sys.argv
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    changed = False
    for key, entry in manifest["assets"].items():
        fg = entry.get("fg") if isinstance(entry, dict) else None
        if not fg or not fg.get("src"):
            continue
        if fg.get("cleaned") == TAG:
            print(f"{key}: already fixed")
            continue
        path = ASSETS / fg["src"]
        result = fix(path, key)
        if result is None:
            print(f"{key}: no wave 02 cut found, left alone")
            continue
        img, alpha = result
        semi = float(((alpha > 0.04) & (alpha < 0.96)).mean())
        left = hard_cuts(alpha)
        print(f"{key}: fixed ({semi:.1%} of pixels soft-edged; straight cuts left: {', '.join(left) or 'none'})")
        if check:
            continue
        img.save(path, "WEBP", quality=92, method=6, exact=True)
        fg["cleaned"] = TAG
        changed = True
    if changed:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
