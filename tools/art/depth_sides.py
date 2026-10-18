"""Give a painted scene its sides: Codex's strips painted on past its left and right edges.

At the end of a pan a painted scene's near floor rows run past the painting's
edges (they slide faster than its back). The game draws these strips there
(createStage's `sides`); without them it mirrors the rows.

Codex paints each side as its own job (art/review/wide/BRIEF.md) and returns a
288x1024 strip: 256 new columns plus 32 that overlap the painting. Here each
strip's colour is matched to the painting along that overlap, fading out away
from the seam, so the join doesn't show; a layered scene's strip takes its near
layer's cut-out from the edge column, so the distant view shows through above
the ground as it does in the painting.

    python3 tools/art/depth_sides.py scene_camp
    python3 tools/art/depth_sides.py --all

Writes public/assets/scenes/explore/<scene>__side_{left,right}.webp (and
__plate_side_* from the plate's strips) and assets[scene].sides in the manifest.
Run scene_depth.py afterwards: a card at a side is cut from the wider painting.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
STRIPS = ROOT / "art" / "review" / "wide"
PAD = 256  # painting pixels painted on each side
OVERLAP = 32  # of them, how many overlap the painting
FADE = 160  # how far from the seam the colour match fades out


def side(strip, edge, which, alpha_edge=None):
    """The `which` ("left"/"right") side from Codex's strip, colour-matched to the painting's `edge` columns."""
    s = np.asarray(strip.convert("RGB").resize((PAD + OVERLAP, edge.shape[0]), Image.LANCZOS), np.float32)
    if which == "left":
        new, over = s[:, :PAD], s[:, PAD:]
        dist = np.arange(PAD)[::-1]  # columns from the seam
    else:
        new, over = s[:, OVERLAP:], s[:, :OVERLAP]
        dist = np.arange(PAD)
    # per row, the overlap's difference from the painting (smoothed down the rows)
    diff = ndimage.uniform_filter1d((edge - over).mean(axis=1), 15, axis=0)
    fade = np.clip(1 - dist / FADE, 0, 1) ** 2
    out = np.clip(new + diff[:, None, :] * fade[None, :, None], 0, 255)
    if alpha_edge is not None:
        out = np.dstack([out, np.repeat(alpha_edge[:, None], PAD, axis=1)])
    return Image.fromarray((out + 0.5).astype(np.uint8))


def make(scene, manifest):
    entry = manifest["assets"][scene]
    sides = {"pad": PAD}
    sources = [("", entry["base"]["src"])]
    plate = entry.get("depth", {}).get("plate")
    if plate:
        sources.append(("plate", plate))
    # a layered scene's near layer: its cut-out goes on into the sides
    near = np.asarray(Image.open(ASSETS / entry["near"]["src"]).convert("RGBA"))[..., 3] if entry.get("near") else None
    for tag, src in sources:
        pic = np.asarray(Image.open(ASSETS / src).convert("RGB"), np.float32)
        for which in ("left", "right"):
            path = STRIPS / f"{scene}_{'plate' if tag else 'paint'}_{which}.jpg"
            if not path.exists():
                print(f"{scene}: no {path.name}")
                return
            edge = pic[:, :OVERLAP] if which == "left" else pic[:, -OVERLAP:]
            alpha = None if near is None else (near[:, 0] if which == "left" else near[:, -1])
            img = side(Image.open(path), edge, which, alpha)
            out = entry["base"]["src"].rsplit(".", 1)[0] + f"__{tag + '_' if tag else ''}side_{which}.webp"
            img.save(ASSETS / out, quality=90, method=6)
            sides[(tag + which.title()) if tag else which] = out
    entry["sides"] = sides
    print(f"{scene}: sides {', '.join(k for k in sides if k != 'pad')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes", nargs="*")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    scenes = sorted({p.name.rsplit("_", 2)[0] for p in STRIPS.glob("scene_*.jpg")}) if args.all else args.scenes
    for scene in scenes:
        make(scene, manifest)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
