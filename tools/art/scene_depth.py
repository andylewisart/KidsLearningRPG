"""Make a painted scene's depth map, so the things standing in it move whole.

The game slides a painted scene's floor in perspective as he walks: each floor
row at its own speed, near ground faster than far, and everything above the
pin row (the nearest painted thing at the back) as one piece. That's right for
the floor, but a table standing on near floor has its top painted up among the
far rows, so its top and its legs slid at different speeds and it sheared (the
bakery's tables, 2026-10-17). A depth map says, for every pixel, how near it
really is, so the table moves at the speed of the floor it stands on.

A depth model (Depth Anything V2 small, ONNX) guesses the painting's depth.
Its depth is only known up to scale and offset, so this script lines it up
with the floor: on open floor, depth must match the floor row's own depth,
which is the row itself. Each pixel then gets the stage row of the floor that
is as near as it is. The map keeps that row (in steps of `unit` stage pixels)
only for what stands nearer than its own row; the floor itself, and anything
behind it, stay 0 and move as they always did.

    python3 tools/art/scene_depth.py scene_biscuit --floor 350,720,1150,1000 --model depth_anything_v2_vits.onnx

  --floor x0,y0,x1,y1   a box of open floor in the painting (painting pixels)
  --model path          the ONNX model, from
                        https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx

Outputs:
  - public/assets/scenes/explore/<scene>__depth.png: grey, 0 where nothing
    stands up, else the stage row of the floor as near as it is, / unit
  - assets[scene].depth: { src, unit }
  - art/review/depth/<scene>.jpg: the painting with what stands up tinted by how near

Run it again whenever the scene's picture changes. Needs Pillow, numpy, onnxruntime.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
LAYOUT = json.loads((ROOT / "src" / "ui" / "stage-layout.json").read_text())["explore"]

UNIT = 4  # stage rows per step in the map
LIFT = 10  # stage rows nearer than its own row before a pixel counts as standing up (the floor's own noise is about 2)
GROW = 3  # painting pixels: what stands up keeps a thin rim of what's behind it, so none of its own edge is left behind


def model_depth(img, model):
    import onnxruntime as ort

    sess = ort.InferenceSession(model)
    name = sess.get_inputs()[0].name
    w, h = img.size
    x = np.asarray(img.resize((518, 518), Image.BICUBIC), np.float32) / 255
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    run = lambda a: sess.run(None, {name: np.ascontiguousarray(a.transpose(2, 0, 1)[None]).astype(np.float32)})[0][0]
    d = (run(x) + run(x[:, ::-1])[:, ::-1]) / 2  # and its mirror image: steadier edges
    return np.asarray(Image.fromarray(d.astype(np.float32)).resize((w, h), Image.BICUBIC))


def grow(a, r):
    """Each pixel takes the largest value within r pixels (a square)."""
    h, w = a.shape
    p = np.pad(a, r, mode="edge")
    out = a.copy()
    for dy in range(2 * r + 1):
        for dx in range(2 * r + 1):
            out = np.maximum(out, p[dy : dy + h, dx : dx + w])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--floor", required=True)
    ap.add_argument("--model", required=True)
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    entry = manifest["assets"][args.scene]
    img = Image.open(ASSETS / entry["base"]["src"]).convert("RGB")
    w, h = img.size
    disp = model_depth(img, args.model)

    # painting row -> stage row (paintingToStage in src/world/painted.js)
    s = LAYOUT["scale"]
    top = LAYOUT["floorEdgeStageY"] - LAYOUT["floorEdgeImage"] * h * s
    rows = top + np.arange(h) * s

    # line the model's depth up with the open floor: there, it's the row's own
    x0, y0, x1, y1 = (int(v) for v in args.floor.split(","))
    med = np.median(disp[y0:y1, x0:x1], axis=1)
    a, b = np.polyfit(med, rows[y0:y1], 1)
    fit = a * med + b - rows[y0:y1]
    print(f"floor fit: stage row = {a:.2f} * depth + {b:.1f}; off by {np.abs(fit).max():.1f} rows at most")

    near = a * disp + b  # the stage row of the floor as near as each pixel
    near = np.where(near - rows[:, None] > LIFT, near, 0)
    near = grow(near, GROW)
    q = np.clip(np.round(near / UNIT), 0, 255).astype(np.uint8)

    src = entry["base"]["src"].rsplit(".", 1)[0] + "__depth.png"
    Image.fromarray(q, "L").save(ASSETS / src, optimize=True)
    entry["depth"] = {"src": src, "unit": UNIT}
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {src}: {np.count_nonzero(q) / q.size:.0%} of the painting stands up, the nearest as near as stage row {int(q.max()) * UNIT}")

    out = ROOT / "art" / "review" / "depth"
    out.mkdir(parents=True, exist_ok=True)
    tint = np.asarray(img, np.float32)
    k = np.clip((q.astype(np.float32) * UNIT - 400) / 400, 0.15, 1)[..., None] * (q > 0)[..., None]
    tint = tint * (1 - 0.6 * k) + np.array([255, 40, 160]) * 0.6 * k
    Image.fromarray(tint.astype(np.uint8)).save(out / f"{args.scene}.jpg", quality=82)


if __name__ == "__main__":
    main()
