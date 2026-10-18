"""Save a painted scene's depth map, so the game can move the back of the scene by it.

The game slides a painted scene's floor in rows, near ground faster than far.
Everything above the pin row used to slide as one flat piece; with a depth map
the game (src/ui/projection.js) bends the painting so each point of it slides
at the speed of the floor as near as it is: the camp's crystal with the fire,
the sea slower, the cliffs and sky slowest.

There's nothing painted behind anything, so where the depth jumps (the crystal
against the sea) the painting has to stretch somewhere. Each near thing's depth
reaches a little way out past its edge, and the depth is smoothed, so the near
thing moves whole and the stretch is a gentle bend in what's behind it (sea,
sky, a wall), where it doesn't show. The near things that move furthest are
cards (scene_depth.py) and don't bend at all.

    python3 tools/art/scene_depthmap.py scene_camp

Each pixel's depth is the depth model's guess, lined up with the open floor
(scene_depth.near_rows). Above the pin the farthest thing (the sky) is put at
the horizon row, where it moves as slowly as a distant view does (about half
the camera's speed), and everything between is spread evenly.

Writes public/assets/scenes/explore/<scene>__depth.png (grey: 0 and 255 stand
for the stage rows assets[scene].depth.map.lo and hi) and depth.map:
{ src, lo, hi }. Run scene_depth.py first when the painting changes: the map is
made from its plate, the painting the game draws behind the cards.
"""

import argparse
import json

import numpy as np
from PIL import Image
from scipy import ndimage

from scene_depth import ASSETS, LAYOUT, MANIFEST, MODEL, SETTINGS, game_scenes, grow, near_rows

FAR_PHYS = 0.22  # how near the sky sits, as a share of the way from the eye row to the reference row (the cove's distant view moves at this)
HOLD = 14  # painting pixels: how far out past a near thing's edge its depth reaches
BEND = 10  # painting pixels: how wide the bend between near and far is


def make(scene, settings, manifest, model, game):
    entry = manifest["assets"][scene]
    depth = entry.get("depth", {})
    src = depth.get("plate") if depth.get("cards") and depth.get("plate") else entry["base"]["src"]
    img = Image.open(ASSETS / src).convert("RGB")
    near, box, off = near_rows(img, settings, game, model)
    pin = settings.get("pin") or game["pin"]
    held = ndimage.gaussian_filter(grow(near, HOLD), BEND)

    # above the pin, the sky goes to the horizon and the rest spreads out between
    eye = game["eye"]
    horizon = eye + FAR_PHYS * (LAYOUT["refY"] - eye)
    sky = float(np.percentile(near, 0.5))
    k = (pin - horizon) / max(1.0, pin - sky)
    lo, hi = horizon, pin
    row = np.where(held < pin, pin - (pin - held) * k, held)
    out = entry["base"]["src"].rsplit(".", 1)[0] + "__depth.png"
    Image.fromarray((np.clip((row - lo) / (hi - lo), 0, 1) * 255 + 0.5).astype(np.uint8)).save(ASSETS / out, optimize=True)
    depth["map"] = {"src": out, "lo": round(float(lo), 1), "hi": round(float(hi), 1)}
    entry["depth"] = depth
    print(f"{scene}: {src}; floor {box} fit off by {off:.1f} rows; sky at row {sky:.0f} spread x{k:.2f} to the horizon {horizon:.0f}; wrote {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes", nargs="+")
    ap.add_argument("--model", default=MODEL)
    args = ap.parse_args()
    settings = json.loads(SETTINGS.read_text())
    manifest = json.loads(MANIFEST.read_text())
    games = game_scenes()
    for scene in args.scenes:
        make(scene, settings.get(scene, {}), manifest, args.model, games[scene])
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
