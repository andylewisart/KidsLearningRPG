"""Cut a painted scene's near layer out, using its distant view (art wave 05).

As he walks, the game slides the floor of a painted scene in perspective, near
ground faster than far. Where a place has an open view (the sea at the cove,
the depths of the canyon, the sea through the grotto's mouth), the distant
view should move slower still. So Codex paints the same scene with everything
near removed (`<scene>_far.webp`), and this script compares the two: whatever
differs is near. The game draws the far picture, then the scene on top with
the distant view cut out of it.

    python3 tools/art/scene_layers.py scene_cove        one scene
    python3 tools/art/scene_layers.py --all             every scene with a far picture
    python3 tools/art/scene_layers.py --all --check     report only, write nothing

Inputs:
  - the manifest entry: assets[scene].base.src and assets[scene].far.src
Outputs:
  - public/assets/scenes/explore/<scene>_near.webp: the scene, transparent where
    the distant view shows through (soft edged)
  - assets[scene].near: { src, w, h }
  - for each state patch (tools/art/scene_patches.py): <patch>_near.webp and
    assets[scene].states[<state>].near: { src }, the patch without the bits
    that only repaint the distant view (they would slide along with the ground)
  - art/review/wave-05/<scene>-layers.jpg: the near layer over magenta, and the cut

Run it again whenever a scene's picture or its patches change.

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
REVIEW = ROOT / "art" / "review" / "wave-05"

THRESHOLD = 26  # how different (0-255, largest channel) a pixel must be to count as near
ADDS = 40  # how different a state patch's pixel must be from the distant view to count as something it adds there (a glow, sparkles)
FEATHER = 2  # px of soft edge


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def match_colors(far, base):
    """Fit far -> base per channel (gain and offset) over the pixels that look unchanged, so a slight color drift isn't read as 'near'."""
    out = far.copy()
    same = np.abs(far - base).max(axis=2) < 40
    if same.sum() < 1000:
        return out
    for c in range(3):
        v, b = far[..., c][same], base[..., c][same]
        A = np.vstack([v, np.ones_like(v)]).T
        gain, offset = np.linalg.lstsq(A, b, rcond=None)[0]
        out[..., c] = np.clip(far[..., c] * float(np.clip(gain, 0.85, 1.15)) + float(np.clip(offset, -25, 25)), 0, 255)
    return out


def morph(mask, size, op):
    img = Image.fromarray((mask > 0.5).astype(np.uint8) * 255)
    f = ImageFilter.MaxFilter(size) if op == "grow" else ImageFilter.MinFilter(size)
    return np.asarray(img.filter(f)).astype(np.float32) / 255


def blur(mask, radius):
    img = Image.fromarray(np.clip(mask * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255


def near_alpha(base, matched):
    """0..1: how much of each pixel is near (differs from the distant view, its colors matched)."""
    diff = np.abs(matched - base).max(axis=2)
    near = (diff > THRESHOLD).astype(np.float32)
    near = morph(morph(near, 5, "shrink"), 5, "grow")  # drop specks
    near = morph(morph(near, 15, "grow"), 15, "shrink")  # fill holes
    near = morph(near, 3, "grow")  # take in the halo along the edge
    return blur(near, FEATHER), float((diff > THRESHOLD).mean())


def cut_patch(state, p, far, alpha):
    """A state patch for the layered scene: kept where it lies on the near layer or adds something to the distant view (a glow, sparkles), dropped where it only repaints the view."""
    x, y, w, h = p["x"], p["y"], p["w"], p["h"]
    if x < 0 or y < 0 or x + w > alpha.shape[1] or y + h > alpha.shape[0]:
        print(f"  ! {state}: the patch runs off the picture, so it stays as it is")
        return
    img = Image.open(ASSETS / p["src"]).convert("RGBA")
    if img.size != (w, h):
        img = img.resize((w, h), Image.LANCZOS)
    patch = np.asarray(img).astype(np.float32)
    a = patch[..., 3] / 255
    adds = ((np.abs(patch[..., :3] - far[y:y + h, x:x + w]).max(axis=2) > ADDS) & (a > 0.1)).astype(np.float32)
    keep = np.maximum(alpha[y:y + h, x:x + w], blur(morph(adds, 3, "grow"), FEATHER))
    out = np.concatenate([patch[..., :3], (a * keep * 255)[..., None]], axis=2).clip(0, 255).astype(np.uint8)
    rel = p["src"].replace(".webp", "_near.webp")
    Image.fromarray(out, "RGBA").save(ASSETS / rel, "WEBP", quality=90, method=6)
    p["near"] = {"src": rel}
    dropped = float(((a > 0.5) & (a * keep <= 0.5)).sum()) / max(1, float((a > 0.5).sum()))
    print(f"  {state}: {dropped:.0%} of the patch only repainted the distant view, dropped")


def cut(scene, check=False):
    manifest = json.loads(MANIFEST.read_text())
    entry = manifest["assets"].get(scene)
    if not entry or not entry.get("far", {}).get("src"):
        print(f"{scene}: no far picture in the manifest (assets.{scene}.far.src)")
        return False
    base = load_rgb(ASSETS / entry["base"]["src"])
    far = load_rgb(ASSETS / entry["far"]["src"])
    if base.shape != far.shape:
        print(f"{scene}: the far picture is {far.shape[1]}x{far.shape[0]}, the scene {base.shape[1]}x{base.shape[0]}: they must match")
        return False
    matched = match_colors(far, base)
    alpha, raw = near_alpha(base, matched)
    share = float((alpha > 0.5).mean())
    print(f"{scene}: {share:.0%} of the picture is near ({raw:.0%} of pixels differed before cleaning)")
    if share > 0.92 or share < 0.15:
        print(f"  ! that looks wrong: the far picture should keep the distant view and remove the rest")
    if check:
        return True
    rgba = np.concatenate([base, alpha[..., None] * 255], axis=2).clip(0, 255).astype(np.uint8)
    rel = entry["base"]["src"].replace(".webp", "_near.webp")
    Image.fromarray(rgba, "RGBA").save(ASSETS / rel, "WEBP", quality=90, method=6)
    entry["near"] = {"src": rel, "w": int(base.shape[1]), "h": int(base.shape[0])}
    for state, patch in entry.get("states", {}).items():
        cut_patch(state, patch, matched, alpha)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    # the review picture: the near layer over magenta, and the cut in black and white
    REVIEW.mkdir(parents=True, exist_ok=True)
    over = Image.new("RGBA", (base.shape[1], base.shape[0]), (255, 0, 255, 255))
    over.alpha_composite(Image.fromarray(rgba, "RGBA"))
    mask = Image.fromarray((alpha * 255).astype(np.uint8)).convert("RGB")
    sheet = Image.new("RGB", (base.shape[1] * 2 + 16, base.shape[0]), (20, 20, 20))
    sheet.paste(over.convert("RGB"), (0, 0))
    sheet.paste(mask, (base.shape[1] + 16, 0))
    sheet.thumbnail((2400, 2400))
    sheet.save(REVIEW / f"{scene}-layers.jpg", quality=82)
    print(f"  wrote {rel} and art/review/wave-05/{scene}-layers.jpg")
    return True


def main(argv):
    check = "--check" in argv
    names = [a for a in argv if not a.startswith("--")]
    if "--all" in argv:
        manifest = json.loads(MANIFEST.read_text())
        names = [k for k, v in manifest["assets"].items() if v.get("kind") == "explore" and v.get("far", {}).get("src")]
    if not names:
        print(__doc__)
        return 1
    ok = all([cut(n, check) for n in names])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
