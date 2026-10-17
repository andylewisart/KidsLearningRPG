"""Even out the walk cycles: one size in every frame, the same size standing, and a stride.

Art wave 03's walk cycles were painted frame by frame, and the figure isn't
the same size in each one: Cade is about 13% smaller in two frames of his
cycle, so he shrinks and grows as he walks. His standing picture (the battle
sheet) is also drawn about 10% bigger than the walk, so he pops bigger each
time he stops. This pass:

1. stands each frame's lowest foot on the feet line, then measures each frame's size against every other one (head, shoulders and
   shield, matched across scales) and rescales each frame about its feet to
   the cycle's average size, so the feet stay on the ground line;
2. lines the upper bodies up sideways again (as align_walks.py does);
3. measures how much bigger the standing picture is and records it as
   `walk.scale`, which the game draws the walk at (src/ui/scene.js);
4. measures the step (how far apart the toes are at the widest frame) and
   records `walk.stride`, the ground one whole cycle covers in cell pixels, so
   the game steps the frames as fast as he moves and his feet don't skate
   (src/ui/explore.js).

    python3 tools/art/even_walks.py ally_knight      even out these sheets (once each)
    python3 tools/art/even_walks.py --check ...      report only

The manifest records "evened" on each sheet it fixed, so running it again
does nothing. Needs Pillow and numpy.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
TAG = "tools/art/even_walks.py"
SCALES = np.arange(0.84, 1.22, 0.01)


def cells(img, walk):
    cw, ch = walk["cell"]
    cols = walk.get("cols", 4)
    return [img.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch)) for i in range(walk.get("frames", 8))]


def rescale(cell, s, foot):
    """The cell with its figure s times as big, about its middle and its feet line."""
    w, h = cell.size
    big = cell.resize((round(w * s), round(h * s)), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(big, (round(w / 2 - w * s / 2), round(foot - foot * s)))
    return out


def ground(cell, foot):
    """The cell moved up or down so its lowest foot stands on the feet line."""
    rows = np.nonzero(np.asarray(cell)[:, :, 3].max(axis=1) > 128)[0]
    out = Image.new("RGBA", cell.size, (0, 0, 0, 0))
    out.paste(cell, (0, int(foot - 1 - rows.max())))
    return out


def upper(cell, foot, share=0.45):
    """Brightness of the top `share` of the figure (head, shoulders, shield top)."""
    a = np.asarray(cell).astype(np.float64)
    alpha = a[:, :, 3] / 255.0
    g = (a[:, :, :3] @ np.array([0.3, 0.59, 0.11])) / 255.0 * alpha
    rows = np.nonzero(alpha.max(axis=1) > 0.5)[0]
    g[int(rows.min() + share * (foot - rows.min())) :] = 0
    return g


def match(ref, img):
    """(how alike, sideways offset) of two pictures at their best overlap, by phase correlation."""
    R, I = np.fft.fft2(ref), np.fft.fft2(img)
    r = np.fft.ifft2(R * np.conj(I)).real
    _, dx = np.unravel_index(np.argmax(r), r.shape)
    return r.max() / (np.linalg.norm(ref) * np.linalg.norm(img) + 1e-9), dx - ref.shape[1] if dx > ref.shape[1] // 2 else dx


def best_scale(ref, cell, foot, share=0.45):
    """How much `cell` must grow to match `ref` (an upper() picture)."""
    return max((match(ref, upper(rescale(cell, s, foot), foot, share))[0], s) for s in SCALES)[1]


def frame_sizes(frames, foot):
    """Each frame's factor to the cycle's average size, from every pair of frames (least squares in log)."""
    n = len(frames)
    rows, rhs = [], []
    for r in range(n):
        ref = upper(frames[r], foot)
        for j in range(n):
            if j != r:
                a = np.zeros(n)
                a[j], a[r] = 1, -1
                rows.append(a)
                rhs.append(np.log(best_scale(ref, frames[j], foot)))
    rows.append(np.ones(n) * 4)
    rhs.append(0)
    return np.exp(np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)[0])


def step_length(frames, foot):
    """Toe to toe at the widest frame: the feet's two blobs along the ground."""
    best = 0
    for cell in frames:
        band = np.asarray(cell)[foot - 26 : foot + 1, :, 3].max(axis=0) > 128
        xs = np.nonzero(band)[0]
        gaps = np.nonzero(np.diff(xs) > 8)[0]
        if len(gaps) == 1:  # two feet on the ground
            best = max(best, xs[-1] - xs[gaps[0]])
    return int(best)


def standing_scale(entry, walk, frames, foot):
    """How much bigger the standing picture (battle sheet, first frame) draws than the walk, by the head."""
    battle = entry.get("battle")
    if not battle or not battle.get("src"):
        return 1.0
    bw, bh = battle["cell"]
    cw, ch = walk["cell"]
    stand = Image.open(ASSETS / battle["src"]).convert("RGBA").crop((0, 0, bw, bh)).resize((round(bw * ch / bh), ch), Image.LANCZOS)
    if battle.get("facing") != walk.get("facing"):
        stand = ImageOps.mirror(stand)
    cell = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    cell.paste(stand, ((cw - stand.width) // 2, 0), stand)
    return float(np.median([1 / best_scale(upper(f, foot, 0.18), cell, foot, 0.18) for f in frames]))


def main():
    check = "--check" in sys.argv
    keys = [a for a in sys.argv[1:] if not a.startswith("--")]
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    changed = False
    for key in keys:
        entry = manifest["assets"][key]
        walk = entry["walk"]
        if walk.get("evened") == TAG:
            print(f"{key}: already evened")
            continue
        path = ASSETS / walk["src"]
        img = Image.open(path).convert("RGBA")
        foot = walk["anchor"][1]
        frames = [ground(f, foot) for f in cells(img, walk)]
        k = frame_sizes(frames, foot)
        print(f"{key}: frame sizes {np.round(1 / k, 3).tolist()}")
        frames = [rescale(f, s, foot) for f, s in zip(frames, k)]
        bodies = [upper(f, foot) for f in frames]
        dx = np.array([match(bodies[0], g)[1] for g in bodies], dtype=np.float64)
        shifts = np.round(dx - dx.mean()).astype(int)
        print(f"  sideways {shifts.tolist()}")
        frames2 = []
        for f, s in zip(frames, shifts):
            moved = Image.new("RGBA", f.size, (0, 0, 0, 0))
            moved.paste(f, (int(s), 0))
            frames2.append(moved)
        stride = 2 * step_length(frames2, foot)
        scale = round(standing_scale(entry, walk, frames2, foot), 2)
        print(f"  stride {stride} px a cycle, standing picture {scale}x the walk")
        if check:
            continue
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        cw, ch = walk["cell"]
        cols = walk.get("cols", 4)
        for i, f in enumerate(frames2):
            out.paste(f, ((i % cols) * cw, (i // cols) * ch))
        out.save(path, "WEBP", quality=90, method=6, exact=True)
        walk["scale"] = scale
        walk["stride"] = stride
        walk["evened"] = TAG
        changed = True
    if changed:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
