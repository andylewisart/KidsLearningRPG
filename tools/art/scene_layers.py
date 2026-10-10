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
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
REVIEW = ROOT / "art" / "review" / "wave-05"

# The far picture is an edit of the scene, and an image model repaints even the
# parts it keeps: the same sky and sea, but every wave and cloud a little
# different. So the two are compared blurred first, where repainted texture
# averages out (kept parts stay under COARSE; removed things are far over it),
# and only along the edges of what's near does the sharp difference decide.
BLUR_R = 5  # px: how much both pictures are blurred for the first comparison
COARSE = 18  # how different (0-255, largest channel) the blurred pictures must be to count as near
BAND = 8  # px either side of that first edge where the sharp difference decides
THRESHOLD = 45  # how different a (barely blurred) pixel must be to count as near, in that band (repainted waves reach about 35)
ISLAND = 0.004  # a stray patch of near or far smaller than this share of the picture joins its surroundings
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


def soften(img, radius):
    """A picture (h, w, 3), Gaussian-blurred channel by channel."""
    return np.stack([np.asarray(Image.fromarray(np.clip(img[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) for c in range(3)], axis=2)


def patches(mask):
    """The connected patches of True in a small boolean map: (pixel lists, touches the edge?)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            seen[y0, x0] = True
            todo, pixels, edge = deque([(y0, x0)]), [], False
            while todo:
                y, x = todo.popleft()
                pixels.append((y, x))
                edge = edge or y in (0, h - 1) or x in (0, w - 1)
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        todo.append((yy, xx))
            yield pixels, edge


STEP = 4  # the regions are worked out on a map this many times smaller, then scaled back up smoothly


def tidy(small):
    """Stray patches join their surroundings: far holes in the ground, near specks in the sky (unless they run off the picture's edge, like palm fronds)."""
    limit = ISLAND * small.size
    out = small.copy()
    for pixels, edge in patches(~small):
        if len(pixels) < limit:
            for y, x in pixels:
                out[y, x] = True
    for pixels, edge in patches(small):
        if len(pixels) < limit and not edge:
            for y, x in pixels:
                out[y, x] = False
    return out


def near_alpha(base, matched):
    """0..1: how much of each pixel is near (differs from the distant view, its colors matched)."""
    h, w = base.shape[:2]
    coarse = np.abs(soften(matched, BLUR_R) - soften(base, BLUR_R)).max(axis=2)
    hh, ww = h - h % STEP, w - w % STEP
    small = coarse[:hh, :ww].reshape(hh // STEP, STEP, ww // STEP, STEP).mean(axis=(1, 3)) > COARSE
    small = tidy(small)
    region = np.asarray(Image.fromarray(small.astype(np.uint8) * 255).resize((w, h), Image.BILINEAR)).astype(np.float32) > 127
    # along the edge of what's near, the sharp picture decides, so outlines stay crisp
    inner = morph(region.astype(np.float32), 2 * BAND + 1, "shrink") > 0.5
    outer = morph(region.astype(np.float32), 2 * BAND + 1, "grow") > 0.5
    sharp = np.abs(soften(matched, 1.2) - soften(base, 1.2)).max(axis=2) > THRESHOLD
    near = (inner | (outer & sharp)).astype(np.float32)
    near = morph(morph(near, 3, "shrink"), 3, "grow")  # drop specks
    near = morph(morph(near, 5, "grow"), 5, "shrink")  # fill pinholes
    near = fill_holes(near)
    return blur(near, FEATHER), float((coarse > COARSE).mean())


def fill_holes(near):
    """Small far patches left in the finished cut (the ground matching the view's colors by chance) are filled in: only the big distant view shows through."""
    h, w = near.shape
    hh, ww = h - h % STEP, w - w % STEP
    far_blocks = near[:hh, :ww].reshape(hh // STEP, STEP, ww // STEP, STEP).min(axis=(1, 3)) < 0.5
    limit = ISLAND * far_blocks.size
    fill = np.zeros_like(far_blocks)
    for pixels, edge in patches(far_blocks):
        if len(pixels) < limit:
            for y, x in pixels:
                fill[y, x] = True
    out = near.copy()
    out[np.pad(np.repeat(np.repeat(fill, STEP, axis=0), STEP, axis=1), ((0, h - hh), (0, w - ww)))] = 1
    return out


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
