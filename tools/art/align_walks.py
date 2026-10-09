"""Steady the walk cycles: line every frame's upper body up sideways.

Art wave 03's walk cycles were painted frame by frame, and the upper body
lands in a different place in each one, up to 45 px apart. Played at 10 fps,
the hero lurches back and forth as he walks. This pass measures where each
frame's head and shoulders sit (phase correlation on the top half of the
figure), then slides each frame sideways so they all sit at their average
place. Nothing moves up or down, so the feet stay on the ground line.

    python3 tools/art/align_walks.py            align the walk sheets the manifest lists (once each)
    python3 tools/art/align_walks.py --check    report the offsets only

The manifest records "aligned" on each sheet it fixed, so running it again
does nothing. Needs Pillow and numpy.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
TAG = "tools/art/align_walks.py"
MIN_FIX = 6  # px: leave a sheet alone when every frame is already this close


def cells(img, walk):
    cw, ch = walk["cell"]
    cols = walk.get("cols", 4)
    return [(i, ((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch)) for i in range(walk.get("frames", 8))]


def upper_body(cell):
    """The top half of the figure as a brightness image, centered on zero."""
    a = cell[:, :, 3] / 255.0
    lum = (cell[:, :, :3] @ np.array([0.3, 0.59, 0.11])) / 255.0
    rows = np.nonzero(a.max(axis=1) > 0.5)[0]
    top, bottom = rows.min(), rows.max()
    g = lum * a
    g[int(top + 0.5 * (bottom - top)) :] = 0
    return g - g[g > 0].mean() * (g > 0)


def offset_x(ref, img):
    """How far (px) `img` must slide sideways to sit on `ref`, by phase correlation."""
    r = np.fft.fft2(ref) * np.conj(np.fft.fft2(img))
    r = np.fft.ifft2(r / (np.abs(r) + 1e-9)).real
    _, dx = np.unravel_index(np.argmax(r), r.shape)
    return dx - ref.shape[1] if dx > ref.shape[1] // 2 else dx


def main():
    check = "--check" in sys.argv
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    changed = False
    for key, entry in manifest["assets"].items():
        walk = entry.get("walk") if isinstance(entry, dict) else None
        if not walk or not walk.get("src"):
            continue
        if walk.get("aligned") == TAG:
            print(f"{key}: already aligned")
            continue
        path = ASSETS / walk["src"]
        img = Image.open(path).convert("RGBA")
        arr = np.asarray(img).astype(np.float64)
        boxes = cells(img, walk)
        bodies = [upper_body(arr[b[1] : b[3], b[0] : b[2]]) for _, b in boxes]
        dx = np.array([offset_x(bodies[0], g) for g in bodies], dtype=np.float64)
        shifts = np.round(dx - dx.mean()).astype(int)
        print(f"{key}: frame offsets {shifts.tolist()}")
        if np.abs(shifts).max() < MIN_FIX or check:
            continue
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        for (_, box), s in zip(boxes, shifts):
            cell = img.crop(box)
            moved = Image.new("RGBA", cell.size, (0, 0, 0, 0))
            moved.paste(cell, (int(s), 0))
            lost = np.asarray(cell)[:, : max(0, -s), 3].max(initial=0) if s < 0 else np.asarray(cell)[:, cell.width - s :, 3].max(initial=0)
            if lost > 24:
                print(f"  ! frame at {box[:2]} loses a few pixels at its edge")
            out.paste(moved, box[:2])
        out.save(path, "WEBP", quality=90, method=6, exact=True)
        walk["aligned"] = TAG
        changed = True
    if changed:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
