"""Cut the state changes of a painted exploration scene into small patches.

A painted exploration scene (art wave 04) has everything he uses painted into
it: the chest, the gate, the cage. When one of them changes (the chest opens,
the gate's light goes out), Codex paints a *variant*: the same painting with
only that one thing changed. This script finds what changed inside that
object's box, cuts it out with a soft edge, and saves it as a small patch the
game lays over the painting. So every state uses the painting's own pixels and
light, and nothing looks pasted on.

    python3 tools/art/scene_patches.py scene_cove        every state of one scene
    python3 tools/art/scene_patches.py --all             every scene in the manifest
    python3 tools/art/scene_patches.py --all --check     report only, write nothing

Inputs (see art/waves/wave-04-scenes.md):
  - the manifest entry: assets[scene].base.src, assets[scene].objects[<object>].box
    and assets[scene].states[<state>].object
  - the variant: art/scenes/<scene>/<state>.webp (or .png), the full painting with the change

Outputs:
  - public/assets/scenes/explore/<scene>__<state>.webp, the patch (transparent around it)
  - assets[scene].states[<state>]: { object, src, x, y, w, h }, x/y = its top-left in painting pixels
  - art/review/wave-04/<scene>__<state>.jpg, before | after, for the review page

Variants made by re-painting the whole picture drift a little: colors shift,
edges wobble. The script matches the variant's colors to the base around the
object first, and only takes pixels inside the object's box (plus a margin).
If the change runs into the edge of that area, it says so: the variant moved
more than the object, so paint it again (with a mask if the tool allows).

Single-pair mode, for testing:
    python3 tools/art/scene_patches.py --base B.webp --variant V.webp --box x0,y0,x1,y1 --out P.webp

Needs Pillow and numpy.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
VARIANTS = ROOT / "art" / "scenes"
REVIEW = ROOT / "art" / "review" / "wave-04"

THRESHOLD = 26  # how different (0-255, largest channel) a pixel must be to count as changed
MARGIN = 0.25  # how far past the object's box a change may reach, as a share of the box
RING = 48  # px around that area used to match the variant's colors to the base
FEATHER = 4  # px of soft edge on the patch


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def find_variant(scene, state):
    for ext in (".webp", ".png", ".jpg"):
        p = VARIANTS / scene / f"{state}{ext}"
        if p.exists():
            return p
    return None


def grow(box, by, w, h):
    x0, y0, x1, y1 = box
    return (max(0, int(x0 - by)), max(0, int(y0 - by)), min(w, int(x1 + by)), min(h, int(y1 + by)))


def match_colors(var, base, area, ring):
    """Fit var -> base per channel (gain and offset) on the ring around the area, where they should agree."""
    h, w = base.shape[:2]
    rx0, ry0, rx1, ry1 = grow(area, ring, w, h)
    sel = np.zeros((h, w), bool)
    sel[ry0:ry1, rx0:rx1] = True
    x0, y0, x1, y1 = area
    sel[y0:y1, x0:x1] = False
    out = var.copy()
    if sel.sum() < 200:
        return out, (1.0, 0.0)
    gains = []
    for c in range(3):
        v, b = var[..., c][sel], base[..., c][sel]
        keep = np.abs(v - b) < 40  # ignore pixels that genuinely differ
        if keep.sum() > 100:
            v, b = v[keep], b[keep]
        A = np.vstack([v, np.ones_like(v)]).T
        gain, offset = np.linalg.lstsq(A, b, rcond=None)[0]
        gain = float(np.clip(gain, 0.85, 1.15))
        offset = float(np.clip(offset, -25, 25))
        out[..., c] = np.clip(var[..., c] * gain + offset, 0, 255)
        gains.append((gain, offset))
    return out, gains


def blur(mask, radius):
    img = Image.fromarray(np.clip(mask * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255


def morph(mask, size, op):
    img = Image.fromarray((mask > 0.5).astype(np.uint8) * 255)
    f = ImageFilter.MaxFilter(size) if op == "grow" else ImageFilter.MinFilter(size)
    return np.asarray(img.filter(f)).astype(np.float32) / 255


def extract(base, var, box):
    """The patch for one change: (rgba array, x, y, report)."""
    h, w = base.shape[:2]
    bw, bh = box[2] - box[0], box[3] - box[1]
    area = grow(box, max(24, MARGIN * max(bw, bh)), w, h)
    matched, gains = match_colors(var, base, area, RING)
    x0, y0, x1, y1 = area
    diff = np.abs(matched[y0:y1, x0:x1] - base[y0:y1, x0:x1]).max(axis=2)
    changed = (diff > THRESHOLD).astype(np.float32)
    # drop specks, fill holes, then take in the soft edge around what changed
    changed = morph(morph(changed, 3, "shrink"), 3, "grow")
    changed = morph(morph(changed, 9, "grow"), 9, "shrink")
    changed = morph(changed, 9, "grow")
    alpha = blur(changed, FEATHER)
    # never a hard edge where the area ends
    ramp = 10
    yy, xx = np.mgrid[0 : y1 - y0, 0 : x1 - x0]
    edge = np.minimum.reduce([xx, yy, (x1 - x0 - 1) - xx, (y1 - y0 - 1) - yy]).astype(np.float32)
    alpha *= np.clip(edge / ramp, 0, 1)
    share = float((changed > 0.5).mean())
    border = np.concatenate([changed[0], changed[-1], changed[:, 0], changed[:, -1]])
    border_share = float((border > 0.5).mean())
    ys, xs = np.nonzero(alpha > 0.01)
    if not len(xs):
        return None, 0, 0, {"changed": 0.0, "border": 0.0, "gains": gains}
    cx0, cx1, cy0, cy1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgb = matched[y0:y1, x0:x1][cy0:cy1, cx0:cx1]
    a = alpha[cy0:cy1, cx0:cx1, None] * 255
    rgba = np.concatenate([rgb, a], axis=2).clip(0, 255).astype(np.uint8)
    return rgba, x0 + int(cx0), y0 + int(cy0), {"changed": share, "border": border_share, "gains": gains}


def review_image(base, rgba, x, y, box, out):
    """Before | after, cropped around the change, for the review page."""
    b = Image.fromarray(base.astype(np.uint8))
    after = b.copy().convert("RGBA")
    after.alpha_composite(Image.fromarray(rgba, "RGBA"), (x, y))
    pad = 60
    crop = (max(0, min(box[0], x) - pad), max(0, min(box[1], y) - pad), min(b.width, max(box[2], x + rgba.shape[1]) + pad), min(b.height, max(box[3], y + rgba.shape[0]) + pad))
    l, r = b.crop(crop), after.convert("RGB").crop(crop)
    sheet = Image.new("RGB", (l.width * 2 + 12, l.height), (20, 20, 28))
    sheet.paste(l, (0, 0))
    sheet.paste(r, (l.width + 12, 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=88)


def report(name, info):
    notes = []
    if info["changed"] < 0.002:
        notes.append("almost nothing changed: is this the right variant?")
    if info["border"] > 0.35:
        notes.append("the change runs into the edge of the object's area: the variant moved more than the object. Paint it again (with a mask if you can), or check the object's box")
    print(f"  {name}: {info['changed']:.1%} of the area changed" + ("".join(f"\n    ! {n}" for n in notes)))
    return not notes


def run_scene(manifest, scene, check):
    entry = manifest["assets"].get(scene)
    if not entry or entry.get("kind") != "explore":
        print(f"{scene}: no explore scene with that id in the manifest")
        return False
    base_path = ASSETS / entry["base"]["src"]
    base = load_rgb(base_path)
    ok = True
    print(f"{scene}:")
    for state, st in (entry.get("states") or {}).items():
        obj = (entry.get("objects") or {}).get(st.get("object"))
        if not obj or not obj.get("box"):
            print(f"  {state}: its object {st.get('object')!r} has no box in objects")
            ok = False
            continue
        vpath = find_variant(scene, state)
        if not vpath:
            print(f"  {state}: no variant at art/scenes/{scene}/{state}.webp")
            ok = False
            continue
        var = load_rgb(vpath)
        if var.shape != base.shape:
            print(f"  {state}: the variant is {var.shape[1]}x{var.shape[0]}, the painting {base.shape[1]}x{base.shape[0]}: they must match")
            ok = False
            continue
        rgba, x, y, info = extract(base, var, obj["box"])
        ok = report(state, info) and ok
        if rgba is None or check:
            continue
        rel = f"scenes/explore/{scene}__{state}.webp"
        (ASSETS / rel).parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba, "RGBA").save(ASSETS / rel, "WEBP", quality=90, method=6)
        st.update({"src": rel, "x": x, "y": y, "w": int(rgba.shape[1]), "h": int(rgba.shape[0])})
        review_image(base, rgba, x, y, obj["box"], REVIEW / f"{scene}__{state}.jpg")
    return ok


def main(argv):
    if "--base" in argv:
        get = lambda k: argv[argv.index(k) + 1]
        base, var = load_rgb(get("--base")), load_rgb(get("--variant"))
        box = [int(v) for v in get("--box").split(",")]
        rgba, x, y, info = extract(base, var, box)
        report("patch", info)
        if rgba is not None:
            Image.fromarray(rgba, "RGBA").save(get("--out"), "WEBP", quality=90)
            print(f"  wrote {get('--out')} at ({x}, {y}), {rgba.shape[1]}x{rgba.shape[0]}")
            if "--review" in argv:
                review_image(base, rgba, x, y, box, Path(get("--review")))
        return 0
    check = "--check" in argv
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    scenes = [k for k, v in manifest["assets"].items() if v.get("kind") == "explore"] if "--all" in argv else [a for a in argv if not a.startswith("--")]
    if not scenes:
        print(__doc__)
        return 1
    ok = all([run_scene(manifest, s, check) for s in scenes])
    if not check:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
