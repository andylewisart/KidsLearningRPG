"""Split a painted scene into layers by depth and heal what each one hides, so the game can move the back of the scene by depth.

The game slides a painted scene's floor in rows, near ground faster than far.
Everything above the pin row used to slide as one flat piece; now the game
(src/ui/projection.js) moves each point of it at the speed of the floor as near
as it is: the camp's crystal with the fire, the sea slower, the cliffs and sky
slowest.

Bending one picture that way smears it wherever the depth jumps (the crystal
against the sea): there's nothing painted behind the crystal, so the painting
stretches to cover the gap. So the picture is split where its depth jumps:

  - the things standing well in front of what's beside or above them (the
    crystal, the shelter, the palm), cut along the painting's own edges
    (GrabCut snaps the depth model's blurred edge to the painting's) and split
    where their depth jumps;
  - stacked in up to three near layers by how fast they move, the splits put
    where they part the most of the things that touch or slide over each other
    at different speeds (camp: the sea rocks, then the shelter, crystal and
    fire, then the palm trunk);
  - under them the back: the rest, with what the near things hide healed from
    its own surroundings (a shift-map fill, like content-aware fill: it copies
    the painting's own sea, rocks and sand in, nothing new is painted);
  - each near layer carried on behind the layers in front of it as far as the
    camera can ever slide them apart, healed the same way.

Each layer bends by its own depth: the back smoothly, each near thing nearly
whole (an upright thing is about as far all over). What a near thing slides
off is painted, not smeared. At the camera's start the layers put together are
the painting, but for a few pixels of healed back round each near thing.

    python3 tools/art/scene_depthmap.py scene_camp

Each pixel's depth is the depth model's guess, lined up with the open floor
(scene_depth.near_rows). Above the pin the farthest thing (the sky) is put at
the horizon row, where it moves as slowly as a distant view does (about half
the camera's speed), and everything between is spread evenly.

The layers take in the painting's sides (sides.left/right, or the plate's when
the near things are cards), so the picture is the painting plus a side's width
each way. Writes, in public/assets/scenes/explore/:
  - <scene>__back.webp, then <scene>__layer1.webp, __layer2... (see-through)
  - <scene>__depth.png: each layer's depth at half size, one under the other,
    back first; 0 and 255 stand for the stage rows lo and hi
and depth.map: { src, lo, hi, layers: [back, layer1, ...] } in the manifest.
Run scene_depth.py first when the painting changes: the layers are made from
its plate, the painting the game draws behind the cards. Needs Pillow, numpy,
scipy, onnxruntime and opencv-contrib-python (cv2.ximgproc, cv2.xphoto).
"""

import argparse
import itertools
import json

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

from scene_depth import ASSETS, EDGE, FLOOR_LIFT, JUMP, LAYOUT, LAYOUT_H, MANIFEST, MODEL, SETTINGS, SMALL, game_scenes, grow, matte, model_depth, near_rows

FAR_PHYS = 0.22  # how near the sky sits, as a share of the way from the eye row to the reference row (the cove's distant view moves at this)
DAMP = 0.7  # how much of the real parallax a painted scene uses (FITS.painted in src/ui/scene.js)
LAYERS = 3  # near layers over the back, at most
REACH = 120  # painting pixels: how far to each side a thing is compared with what's beside it
UP = 150  # painting pixels: how far above it, for a thing standing up against what's behind it
HOLE = 6  # painting pixels: how far past a near thing's edge the back is healed (the soft edge and the model's blur)
SEAM = 48  # painting pixels: where the painting's own depth hands over to its sides'
SMOOTH = 8  # painting pixels: how smoothly the back bends
WHOLE = 40  # painting pixels: how gently a big near thing bends
BLEND = 6  # painting pixels: how wide the bend between two things in one layer is
STAGE_W = 1280  # stage pixels
SLACK = 1.3  # how much further than its widest pan the camera may slide two layers apart (zoomed in, it goes further)


def speed(y, eye):
    """How fast the floor at stage row y moves with the camera (floorSpeed in src/ui/scene.js)."""
    return 1 + DAMP * (np.maximum(0.2, (y - eye) / (LAYOUT["refY"] - eye)) - 1)


def blur(a, sigma):
    """A Gaussian blur; a wide one is done small and scaled back up."""
    k = int(max(1, min(sigma // 8, min(a.shape) // 8)))
    if k == 1:
        return cv2.GaussianBlur(a, (0, 0), sigma)
    small = cv2.resize(a, (a.shape[1] // k, a.shape[0] // k), interpolation=cv2.INTER_AREA)
    return cv2.resize(cv2.GaussianBlur(small, (0, 0), sigma / k), (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LINEAR)


def spread(d, mask, sigma):
    """d smoothed within the mask and carried on smoothly past it (a normalised blur, wider and wider where there's none)."""
    m = mask.astype(np.float32)
    out = None
    for s in (64 * sigma, 16 * sigma, 4 * sigma, sigma):
        num, den = blur(d * m, s), blur(m, s)
        v = num / np.maximum(den, 1e-6)
        sure = np.clip(den / 0.3, 0, 1)  # how much of this blur's reach is in the mask
        out = v if out is None else sure * v + (1 - sure) * out
    return out


def heal(rgb, keep):
    """Fill everything outside keep from the picture's own pieces inside it (OpenCV's shift-map inpainting)."""
    bgr = np.ascontiguousarray(rgb[..., ::-1])
    out = np.zeros_like(bgr)
    cv2.xphoto.inpaint(bgr, keep.astype(np.uint8) * 255, out, cv2.xphoto.INPAINT_SHIFTMAP)
    return np.where(keep[..., None], rgb, out[..., ::-1])


def picture(entry):
    """The picture to split: the plate when the near things are cards, else the painting, with its sides on; and the sides' width."""
    depth = entry.get("depth", {})
    cards = bool(depth.get("cards") and depth.get("plate"))
    img = Image.open(ASSETS / (depth["plate"] if cards else entry["base"]["src"])).convert("RGB")
    sides = entry.get("sides")
    if not sides:
        return img, img, 0
    pad = sides["pad"]
    w, h = img.size
    wide = Image.new("RGB", (w + 2 * pad, h))
    wide.paste(Image.open(ASSETS / sides["plateLeft" if cards else "left"]).convert("RGB").resize((pad, h)), (0, 0))
    wide.paste(img, (pad, 0))
    wide.paste(Image.open(ASSETS / sides["plateRight" if cards else "right"]).convert("RGB").resize((pad, h)), (pad + w, 0))
    return img, wide, pad


def standing(rgb, d, rows, lift, pin, seg, never):
    """What stands well in front of what's beside it, or above it: whole superpixels."""
    beside = ndimage.minimum_filter1d(d, 2 * REACH + 1, axis=1, mode="nearest")
    above = ndimage.minimum_filter1d(d, UP + 1, axis=0, mode="nearest", origin=UP // 2)
    px = ~never & (rows < pin + 20) & ((d > beside + JUMP) | ((d > above + JUMP) & (lift > FLOOR_LIFT)))
    vote = ndimage.mean(px.astype(np.float32), seg, np.arange(seg.max() + 1))
    front = ndimage.binary_closing(vote[seg] > 0.5, iterations=3)
    labels, k = ndimage.label(front)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, k + 1))
    front = np.isin(labels, [i + 1 for i in range(k) if sizes[i] >= SMALL])
    holes, k = ndimage.label(ndimage.binary_fill_holes(front) & ~front)  # the gaps between superpixels, not the sky between a palm's fronds
    sizes = ndimage.sum(np.ones_like(holes), holes, range(1, k + 1))
    front |= np.isin(holes, [i + 1 for i in range(k) if sizes[i] < SMALL])
    # the depth model blurs each edge over a dozen pixels: the cut goes to the painting's own edge near it (GrabCut)
    snapped = front.copy()
    for sl in ndimage.find_objects(ndimage.label(ndimage.binary_dilation(front, iterations=2 * EDGE))[0]):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        f = front[y0:y1, x0:x1]
        sure = ndimage.binary_erosion(f, iterations=EDGE // 2)
        if not sure.any():
            continue
        mask = np.full(f.shape, cv2.GC_BGD, np.uint8)
        mask[ndimage.binary_dilation(f, iterations=EDGE + EDGE // 2)] = cv2.GC_PR_BGD
        mask[f] = cv2.GC_PR_FGD
        mask[sure] = cv2.GC_FGD
        cv2.grabCut(np.ascontiguousarray(rgb[y0:y1, x0:x1, ::-1]), mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
        snapped[y0:y1, x0:x1] = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    return snapped & ~never & (rows < pin + 20)


def things(d, front):
    """The standing things, split where their depth jumps (the fire before the crystal): labels, and how near each is."""
    jumps = (grow(d, 1) - grow(d, 1, np.minimum)) > JUMP / 2
    labels, k = ndimage.label(front & ~jumps, structure=np.ones((3, 3)))
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, k + 1))
    labels[np.isin(labels, [i + 1 for i in range(k) if sizes[i] < SMALL])] = 0
    # the jumps and the crumbs go to the thing they touch
    _, (iy, ix) = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    labels = np.where(front, labels[iy, ix], 0)
    ids = np.unique(labels[labels > 0])
    labels = np.searchsorted(np.concatenate([[0], ids]), labels).astype(np.int32)
    nearness = np.array([0.0] + [np.percentile(d[sl][labels[sl] == j], 90) for j, sl in enumerate(ndimage.find_objects(labels), 1)])
    return labels, nearness


def stacked(labels, fast):
    """Which near layer each thing goes in (1 = just over the back): the things split into bands by how fast they move,
    the splits where they part the most of the things that touch or slide over each other moving at different speeds."""
    touch = {}
    for a, b in [(labels[:, :-dx], labels[:, dx:]) for dx in range(1, REACH // 2 + 1, 3)] + [(labels[:-dy], labels[dy:]) for dy in (1, 2, 3)]:
        pick = (a != b) & (a > 0) & (b > 0)  # side by side near enough to slide over each other, or one on the other
        pairs, count = np.unique(np.stack([np.minimum(a[pick], b[pick]), np.maximum(a[pick], b[pick])]), axis=1, return_counts=True)
        for (p, q), c in zip(pairs.T.tolist(), count.tolist()):
            touch[p, q] = touch.get((p, q), 0) + c
    order = np.sort(np.unique(fast[1:]))
    cuts = (order[1:] + order[:-1]) / 2
    best, pick = None, ()
    for many in range(min(LAYERS - 1, len(cuts)) + 1):
        for split in itertools.combinations(cuts, many):
            band = np.searchsorted(np.array(split), fast)
            left = sum(c * abs(fast[p] - fast[q]) for (p, q), c in touch.items() if band[p] == band[q])
            if best is None or left < best - 1e-9:
                best, pick = left, split
    layer = 1 + np.searchsorted(np.array(pick), fast)
    layer[0] = 0
    return layer


def make(scene, settings, manifest, model, game):
    entry = manifest["assets"][scene]
    img, wide, pad = picture(entry)
    w, h = img.size
    W = w + 2 * pad
    rgb = np.asarray(wide)
    s = LAYOUT["scale"]
    top = LAYOUT["floorEdgeStageY"] - LAYOUT["floorEdgeImage"] * h * s
    rows = np.broadcast_to((top + np.arange(h, dtype=np.float32) * s)[:, None], (h, W))
    pin = settings.get("pin") or game["pin"]
    eye = game["eye"]

    # each pixel's depth, as the stage row of the floor as near as it is; the sides' from the model run on the whole picture
    near, box, off = near_rows(img, settings, game, model)
    d = near
    if pad:
        disp = model_depth(wide, model)
        a, b = np.polyfit(disp[::4, pad + SEAM : pad + w - SEAM : 4].ravel(), near[::4, SEAM : w - SEAM : 4].ravel(), 1)
        d = a * disp + b
        t = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / SEAM, 0, 1)
        d[:, pad : pad + w] = t * near + (1 - t) * d[:, pad : pad + w]
    d = cv2.ximgproc.guidedFilter(rgb, d.astype(np.float32), 8, (0.02 * 255) ** 2)  # its edges on the painting's own
    lift = d - rows
    never = np.zeros((h, W), bool)
    for x0, y0, x1, y1 in settings.get("floorBoxes", []):  # floor the depth model took for something standing
        never[y0:y1, x0 + pad : x1 + pad] = True

    # the layers: the back, then the things standing in front of it, each in front of what's well behind it
    seg = cv2.ximgproc.createSuperpixelSLIC(cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB), cv2.ximgproc.SLICO, 20)
    seg.iterate(10)
    seg = seg.getLabels()
    front = standing(rgb, d, rows, lift, pin, seg, never)
    labels, nearness = things(d, front)
    # above the pin, depths are spread out to the horizon
    horizon = eye + FAR_PHYS * (LAYOUT["refY"] - eye)
    sky = float(np.percentile(near, 0.5))
    k = (pin - horizon) / max(1.0, pin - sky)
    row = lambda z: np.where(z < pin, pin - (pin - z) * k, z)
    layer = stacked(labels, speed(row(nearness), eye))
    on = layer[labels]
    own = [~front] + [(on == i) & front for i in np.unique(layer[1:])]  # each layer's own pixels
    n = len(own)
    covers = [np.logical_or.reduce(own[i:]) for i in range(n)] + [np.zeros((h, W), bool)]  # each layer and all in front of it

    # each layer's depth: the back's smooth, carried on behind what's in front of it; each thing's nearly whole (an
    # upright thing is about as far all over), the layer's things blended where they meet, carried on past its edges
    whole = np.zeros((h, W), np.float32)
    for j, sl in enumerate(ndimage.find_objects(labels), 1):
        part = labels[sl] == j
        far_v, near_v = np.percentile(d[sl][part], [10, 90])
        if part.sum() < 20000:
            whole[sl][part] = near_v
        else:  # a big one bends gently, never as far as its far bits
            whole[sl][part] = np.clip(spread(d[sl], part, WHOLE), far_v, near_v)[part]
    deep = []
    for i, m in enumerate(own):
        if i == 0:
            core = ndimage.binary_erosion(m & ~ndimage.binary_dilation(covers[1], iterations=2 * HOLE), iterations=3)
            z = spread(d, core, SMOOTH)
        else:
            z = spread(whole, m, BLEND)
        deep.append(row(z))
    lo = horizon
    hi = float(min(LAYOUT_H, max(pin, *(np.percentile(z[m], 99.5) for z, m in zip(deep, own)))))

    # how far the camera can slide two layers apart, in painting pixels
    pan = SLACK * (w * s - STAGE_W) / 2 / speed(pin, eye)
    guide = rgb.astype(np.float32).mean(axis=2) / 255
    I = rgb.astype(np.float32)

    pictures, alphas = [], []
    under = None  # the layers so far, put together
    for i in range(n):
        # the painting with what's in front of this layer healed away, from what's left
        healed = heal(rgb, ~ndimage.binary_dilation(covers[i + 1], iterations=HOLE)).astype(np.float32) if i + 1 < n else I
        if i == 0:
            pictures.append(healed)
            alphas.append(np.ones((h, W), np.float32))
            under = healed
            continue
        # carried on behind the things in front of it, as far as the camera can ever slide them apart
        reach = np.zeros((h, W), bool)
        if i + 1 < n:
            ahead = deep[i + 1] if i + 2 >= n else np.maximum(deep[i + 1], deep[n - 1])
            gap = np.where(own[i], (speed(ahead, eye) - speed(deep[i], eye)) * pan / s + 4, 0)
            for step in range(1, int(gap.max()) + 1):
                go = own[i] & (gap >= step)
                reach[:, step:] |= go[:, :-step]
                reach[:, :-step] |= go[:, step:]
            reach = (reach | ndimage.binary_dilation(own[i], iterations=HOLE)) & covers[i + 1] & ~own[i]
        color = np.where(reach[..., None], healed, I)
        # its soft edge, along the painting's own edges, and nothing of what's in front of it but what's carried on
        mine = ndimage.binary_dilation(own[i] | reach, iterations=HOLE)
        a = np.where(mine, matte(guide, covers[i]), 0.0)
        a[covers[i + 1]] = 0.0
        a[reach] = 1.0
        # unmixed from what's behind it, so that put together at the start it's the painting
        edge = (a > 0.02) & (a < 0.98) & ~covers[i + 1]
        color[edge] = np.clip((I[edge] - (1 - a[edge, None]) * under[edge]) / a[edge, None], 0, 255)
        under = a[..., None] * color + (1 - a[..., None]) * under
        pictures.append(color)
        alphas.append(a.astype(np.float32))

    stem = entry["base"]["src"].rsplit(".", 1)[0]
    names = []
    for i, (pic, a) in enumerate(zip(pictures, alphas)):
        name = f"{stem}__back.webp" if i == 0 else f"{stem}__layer{i}.webp"
        px = np.clip(pic + 0.5, 0, 255).astype(np.uint8)
        if i == 0:
            Image.fromarray(px).save(ASSETS / name, quality=90, method=6)
        else:
            Image.fromarray(np.dstack([px, np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)])).save(ASSETS / name, quality=90, alpha_quality=100, method=6)
        names.append(name)
    # the depths at half size, one layer under the other
    enc = [np.clip((z - lo) / (hi - lo), 0, 1) * 255 + 0.5 for z in deep]
    small = [cv2.resize(e.astype(np.float32), (W // 2, h // 2), interpolation=cv2.INTER_AREA) for e in enc]
    out = f"{stem}__depth.png"
    Image.fromarray(np.concatenate(small, 0).astype(np.uint8)).save(ASSETS / out, optimize=True)
    depth = entry.setdefault("depth", {})
    depth["map"] = {"src": out, "lo": round(float(lo), 1), "hi": round(float(hi), 1), "layers": names}
    sizes = ", ".join(f"layer {i} {m.mean() * 100:.0f}%" for i, m in enumerate(own[1:], 1))
    print(f"{scene}: floor {box} fit off by {off:.1f} rows; sky at row {sky:.0f} spread x{k:.2f} to the horizon {horizon:.0f}; {sizes}; wrote {out} and {len(names)} pictures")


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
