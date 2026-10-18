"""Turn a walk sheet Codex painted in one go (over tools/art/walk_guide.py's poses) into a game walk sheet.

python3 tools/art/walk_sheet.py <ally_key> <sheet_key> <codex.png> <out.webp> [--write]

Clears the near-transparent haze, stands each frame's lowest foot on the feet line,
sizes the cycle to match the sheet it replaces (head to feet, median frame), lines the upper
bodies up sideways, and measures the stride. With --write it also saves over the
sheet's src and records the new stride in the manifest; otherwise it only writes <out.webp>.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import even_walks as ev  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/assets"


def specks(cell, keep=0.02):
    """Clear stray specks: solid blobs smaller than `keep` of the figure."""
    a = np.asarray(cell).copy()
    solid = a[..., 3] > 24
    seen = np.zeros_like(solid)
    blobs = []
    h, w = solid.shape
    for y0, x0 in zip(*np.nonzero(solid)):
        if seen[y0, x0]:
            continue
        stack, pts = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and solid[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    stack.append((yy, xx))
        blobs.append(pts)
    total = sum(map(len, blobs))
    for pts in blobs:
        if len(pts) < keep * total:
            ys, xs = zip(*pts)
            a[list(ys), list(xs)] = 0
    return Image.fromarray(a)


def main():
    write = "--write" in sys.argv
    key, sheet_key, src, out = [a for a in sys.argv[1:] if not a.startswith("--")]
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf8"))
    walk = manifest["assets"][key][sheet_key]
    foot = walk["anchor"][1]
    cw, ch = walk["cell"]
    img = Image.open(src).convert("RGBA").resize((cw * 4, ch * 2), Image.LANCZOS)
    a = np.asarray(img).copy()
    a[a[..., 3] < 24] = 0
    img = Image.fromarray(a)
    frames = [ev.ground(specks(f), foot) for f in ev.cells(img, walk)]
    old = [ev.ground(f, foot) for f in ev.cells(Image.open(ASSETS / walk["src"]).convert("RGBA"), walk)]
    # one size for the whole cycle (each frame to the cycle's average), then the cycle to the old sheet's size
    k = ev.frame_sizes(frames, foot)
    frames = [ev.rescale(f, s, foot) for f, s in zip(frames, k)]
    def height(f):
        return foot - np.nonzero(np.asarray(f)[..., 3].max(1) > 128)[0].min()

    to_old = float(np.median([height(o) for o in old]) / np.median([height(f) for f in frames]))  # head to feet
    frames = [ev.rescale(f, to_old, foot) for f in frames]
    bodies = [ev.upper(f, foot) for f in frames]
    dx = np.array([ev.match(bodies[0], g)[1] for g in bodies], dtype=np.float64)
    shifts = np.round(dx - dx.mean()).astype(int)
    # and centre the cycle in the cell as the old sheet was
    ox = np.mean([np.nonzero(np.asarray(o)[..., 3].max(0) > 128)[0].mean() for o in old])
    nx = np.mean([np.nonzero(np.asarray(f)[..., 3].max(0) > 128)[0].mean() for f in frames])
    shifts = shifts + int(round(ox - nx))
    sheet = Image.new("RGBA", img.size, (0, 0, 0, 0))
    for i, (f, s) in enumerate(zip(frames, shifts)):
        moved = Image.new("RGBA", f.size, (0, 0, 0, 0))
        moved.paste(f, (int(s), 0))
        e = np.asarray(moved).copy()
        e[:2], e[-2:], e[:, :2], e[:, -2:] = 0, 0, 0, 0
        sheet.paste(Image.fromarray(e), ((i % 4) * cw, (i // 4) * ch))
    stride = 2 * ev.step_length([sheet.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch)) for i in range(8)], foot)
    print(f"frame sizes {np.round(1 / k, 3).tolist()}, to old {to_old:.3f}, sideways {shifts.tolist()}, stride {stride} (was {walk.get('stride')})")
    sheet.save(out, "WEBP", quality=88, method=6)
    if write:
        sheet.save(ASSETS / walk["src"], "WEBP", quality=88, method=6)
        walk["stride"] = stride
        walk["painted"] = "one sheet over tools/art/walk_guide.py (tools/art/walk_sheet.py)"
        (ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
