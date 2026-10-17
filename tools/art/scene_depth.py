"""Cut a painted scene's near things out as cards, so each moves whole.

The game slides a painted scene's floor in perspective as he walks: each floor
row at its own speed, near ground faster than far, and everything above the
pin row (the nearest painted thing at the back) as one piece. That's right for
the floor, but a table standing on near floor has its top painted up among the
far rows, so its top and its legs slid at different speeds and it sheared (the
bakery's tables, 2026-10-17).

So each near thing becomes a card: cut out of the painting with a soft edge,
it slides as one piece at the speed of the floor it stands on, and it sorts in
front of or behind the people by where it stands, like they do. Behind the
cards the game draws Codex's plate: the same painting with the near things
taken out, so what a card slides off is painted, not smeared.

How it finds them: a depth model (Depth Anything V2 small, ONNX) guesses the
painting's depth. That depth is only known up to scale and offset, so it is
lined up with a box of open floor, where it must match the floor row's own
depth. Each pixel then gets the stage row of the floor as near as it is.
Whatever stands nearer than the pin row (and nearer than its own row) is near;
it is split into things where its depth jumps, and each thing's edge is
matted to the painting's own edges (a guided filter), so it's soft and true.

    python3 tools/art/scene_depth.py scene_biscuit
    python3 tools/art/scene_depth.py --all

Each scene's settings are in tools/art/depth-scenes.json:
  floor   x0,y0,x1,y1: a box of open floor in the painting (painting pixels);
          the middle of where he walks if not given
  pin     where cards start (stage px): things standing nearer than this, plus MOVE.
          The game's own pin row (paintedLayout, via scene-pins.mjs) if not given.
          Set it at the base of a big thing at the back that would otherwise be
          cut off partway up (the bakery's counter); the finer row strips keep it whole.
  floorBoxes  [[x0,y0,x1,y1], ...]: open floor the depth model took for something
          standing (camp's sand), never cut (painting pixels)
  skip    true: leave this scene flat (nothing near enough to bother)
The model (--model, default ~/.cache/depth_anything_v2_vits.onnx) is
https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx

Outputs:
  - public/assets/scenes/explore/<scene>__near.webp: the cards, packed
  - assets[scene].depth: { near, cards: [{ cell: [x, y, w, h] in that picture,
    at: [x, y] where it sits in the painting, ground: the stage row it stands on }],
    plate (kept if it's there) }
  - art/review/depth/<scene>-near.jpg: the painting with the cards tinted, the
    brief's picture for Codex's plate
Run it again whenever the scene's picture changes; the plate needs repainting
if the cards change much. Needs Pillow, numpy, scipy, onnxruntime.
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
SETTINGS = ROOT / "tools" / "art" / "depth-scenes.json"
LAYOUT = json.loads((ROOT / "src" / "ui" / "stage-layout.json").read_text())["explore"]
LAYOUT_H = 720  # the stage's height
MODEL = Path.home() / ".cache" / "depth_anything_v2_vits.onnx"

LIFT = 10  # stage rows nearer than its own row before a pixel counts as standing up (the floor's own noise is about 2)
MOVE = 30  # stage rows nearer than the pin before something moves enough to need a card
EDGE = 10  # painting pixels: how far the model's blur of an edge reaches
JUMP = 40  # stage rows: a step in depth bigger than this is an edge between two things
SMALL = 600  # painting pixels: things smaller than this stay in the painting
FLOOR_LIFT = 60  # stage rows: walkable floor lifted less than this is still floor
MATTE = 4  # painting pixels: how far the soft edge may move to the painting's own edge
PAD = 2 * MATTE + 2


def model_depth(img, model):
    import onnxruntime as ort

    sess = ort.InferenceSession(str(model))
    name = sess.get_inputs()[0].name
    w, h = img.size
    x = np.asarray(img.resize((518, 518), Image.BICUBIC), np.float32) / 255
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    run = lambda a: sess.run(None, {name: np.ascontiguousarray(a.transpose(2, 0, 1)[None]).astype(np.float32)})[0][0]
    d = (run(x) + run(x[:, ::-1])[:, ::-1]) / 2  # and its mirror image: steadier edges
    return np.asarray(Image.fromarray(d.astype(np.float32)).resize((w, h), Image.BICUBIC))


def grow(a, r, pick=np.maximum):
    """Each pixel takes the largest value within r pixels (a square; `pick` np.minimum: the smallest)."""
    f = ndimage.maximum_filter if pick is np.maximum else ndimage.minimum_filter
    return f(a, size=2 * r + 1, mode="nearest")


def box(a, r):
    return ndimage.uniform_filter(a, size=2 * r + 1, mode="nearest")


def matte(guide, mask, r=MATTE, eps=2e-3):
    """A soft edge for the mask that follows the painting's own edges (a guided filter, He et al.)."""
    p = mask.astype(np.float32)
    mi = box(guide, r)
    mp = box(p, r)
    a = (box(guide * p, r) - mi * mp) / (box(guide * guide, r) - mi * mi + eps)
    b = mp - a * mi
    return np.clip(box(a, r) * guide + box(b, r), 0, 1)


def game_scenes():
    """Each scene's pin row, worked out the way the game does, and its walkable floor (tools/art/scene-pins.mjs)."""
    import subprocess

    return json.loads(subprocess.run(["node", str(ROOT / "tools" / "art" / "scene-pins.mjs")], capture_output=True, text=True, check=True).stdout)


def pack(sizes, width):
    """Shelf-pack (w, h) boxes into a picture this wide: their corners, and its height."""
    order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1])
    at = [None] * len(sizes)
    x = y = shelf = 0
    for i in order:
        w, h = sizes[i]
        if x + w > width:
            x, y, shelf = 0, y + shelf + 2, 0
        at[i] = (x, y)
        x += w + 2
        shelf = max(shelf, h)
    return at, y + shelf


def cut(scene, settings, manifest, model, game):
    entry = manifest["assets"][scene]
    img = Image.open(ASSETS / entry["base"]["src"]).convert("RGB")
    w, h = img.size
    rgb = np.asarray(img, np.float32) / 255
    s = LAYOUT["scale"]
    top = LAYOUT["floorEdgeStageY"] - LAYOUT["floorEdgeImage"] * h * s
    to_stage = lambda v: top + v * s
    rows = to_stage(np.arange(h, dtype=np.float32))
    pin = settings.get("pin") or game["pin"]

    # line the model's depth up with the open floor: there, it's the row's own
    disp = model_depth(img, model)
    if "floor" in settings:
        x0, y0, x1, y1 = settings["floor"]
    else:  # the middle of where he walks, below the pin
        wx, wy = np.array(game["walk"], np.float32).T
        left = (1280 - w * s) / 2  # the painting is centred on the stage
        to_img = lambda v, o: int(round((v - o) / s))
        sy0, sy1 = max(wy.min(), pin) + 15, min(wy.max(), 720) - 5
        mid, half = (wx.min() + wx.max()) / 2, (wx.max() - wx.min()) / 5
        x0, x1 = max(0, to_img(mid - half, left)), min(w, to_img(mid + half, left))
        y0, y1 = to_img(sy0, top), min(h, to_img(sy1, top))
    med = np.median(disp[y0:y1, x0:x1], axis=1)
    a, b = np.polyfit(med, rows[y0:y1], 1)
    off = np.abs(a * med + b - rows[y0:y1]).max()
    near = a * disp + b  # the stage row of the floor as near as each pixel

    # The model blurs each edge over a dozen pixels; the edge goes where the
    # slope is halfway, unless it's between two near things.
    lift = near - rows[:, None]
    hi, lo = grow(near, EDGE), grow(near, EDGE, np.minimum)
    edge = (hi - lo > JUMP) & (grow(lift, EDGE, np.minimum) <= LIFT)
    moving = (lift > LIFT) & (~edge | (near > (hi + lo) / 2)) & (near > pin + MOVE)
    patched = np.zeros((h, w), bool)
    for st in entry.get("states", {}).values():  # what a story change repaints stays in the painting
        patched[max(0, st["y"] - 3) : st["y"] + st["h"] + 3, max(0, st["x"] - 3) : st["x"] + st["w"] + 3] = True
    moving &= ~patched
    for x0k, y0k, x1k, y1k in settings.get("floorBoxes", []):  # floor the depth model took for something standing
        moving[y0k:y1k, x0k:x1k] = False
    moving[rows > LAYOUT_H + 40] = False  # below the screen, even with the camera tilted down: nothing to cut
    moving = ndimage.binary_closing(moving, iterations=3) & (near > pin + MOVE / 2)
    moving = ndimage.binary_fill_holes(moving)

    # split into things where the depth jumps
    jumps = (grow(near, 1) - grow(near, 1, np.minimum)) > JUMP / 2
    labels, n = ndimage.label(moving & ~jumps, structure=np.ones((3, 3)))
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    keep = [i + 1 for i in range(n) if sizes[i] >= SMALL]
    labels = np.where(np.isin(labels, keep), labels, 0)
    # the seams go back to the thing they touch
    dist, (iy, ix) = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    labels = np.where(moving & (dist <= 3), labels[iy, ix], 0)
    # A card only for what stands up well in front of the pin. Things lying on
    # the floor (a rug, a pool) are floor; things standing close to the pin
    # lean only a little in the painting, and cutting them partway up would tear
    # them; and a thing that runs into a story patch stays whole in the painting.
    def stands(k):
        m = labels == k
        ys = np.nonzero(m)[0]
        foot = m & (np.arange(h)[:, None] >= ys.max() - 6)
        return np.percentile(lift[m], 90) > 4 * LIFT and np.median(near[foot]) > pin + 2 * MOVE and not (m & ndimage.binary_dilation(patched, iterations=3)).any()

    # The walkable floor is floor: where a thing's cut-out runs onto it with
    # little lift (a sand rise, a ledge he stands on), that part stays in the
    # painting, or it would cover the party from behind.
    from PIL import ImageDraw

    left = (1280 - w * s) / 2
    walk = Image.new("L", (w, h))
    ImageDraw.Draw(walk).polygon([((x - left) / s, (y - top) / s) for x, y in game["walk"]], fill=1)
    floorish = (np.asarray(walk) > 0) & (lift < FLOOR_LIFT)
    walk_top, walk_bottom = min(y for _, y in game["walk"]), max(y for _, y in game["walk"])
    for k in keep:
        m = labels == k
        if (m & floorish).sum() > 0.1 * m.sum():
            labels[m & floorish] = 0
            part, n = ndimage.label(labels == k, structure=np.ones((3, 3)))
            if n > 1:  # only its biggest piece stays a card
                big = 1 + np.argmax(ndimage.sum(np.ones_like(part), part, range(1, n + 1)))
                labels[(part > 0) & (part != big)] = 0

    keep = [k for k in keep if (labels == k).sum() >= SMALL and stands(k)]
    labels = np.where(np.isin(labels, keep), labels, 0)

    guide = rgb.mean(axis=2)
    cards, pieces = [], []
    for k in keep:
        m = labels == k
        ys, xs = np.nonzero(m)
        if len(ys) < SMALL:
            continue
        # the model's depth fades at the painting's sides: a thing that reaches
        # nearly to a side reaches all the way (the game mirrors it there)
        if xs.min() <= PAD:
            c = xs.min() + 2
            m[:, :c] |= m[:, c : c + 1]
        if xs.max() >= w - 1 - PAD:
            c = xs.max() - 2
            m[:, c:] |= m[:, c - 1 : c]
        ys, xs = np.nonzero(m)
        bottom = ys.max()
        # it stands as near as its foot (its lowest pixels): a table at its legs, a vase where it sits on the table
        foot = ys >= bottom - 6
        ground = max(float(np.median(near[ys[foot], xs[foot]])), to_stage(bottom + 1) if bottom >= h - 4 else 0)
        # A thing whose foot is painted on the walkable floor stands on that row,
        # never much nearer: the depth model can take its foot for the floor in
        # front of it (the lair's pillar), and it would cover the party from behind.
        if walk_top <= to_stage(bottom + 1) <= walk_bottom:
            ground = min(ground, to_stage(bottom + 1) + 20)
        cy0, cy1 = max(0, ys.min() - PAD), min(h, bottom + PAD + 1)
        cx0, cx1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
        sub = m[cy0:cy1, cx0:cx1]
        alpha = matte(guide[cy0:cy1, cx0:cx1], sub)
        # never reach into another card, and never past the soft edge's reach
        alpha *= grow(sub.astype(np.float32), MATTE) * (1 - ((labels[cy0:cy1, cx0:cx1] != 0) & ~sub))
        alpha[sub & (alpha < 0.98) & (grow(sub.astype(np.uint8), 1, np.minimum) > 0)] = 1  # solid inside
        rgba = np.dstack([rgb[cy0:cy1, cx0:cx1], alpha])
        pieces.append(rgba)
        cards.append({"at": [int(cx0), int(cy0)], "ground": round(float(ground), 1), "size": [int(cx1 - cx0), int(cy1 - cy0)]})

    out = ROOT / "art" / "review" / "depth"
    out.mkdir(parents=True, exist_ok=True)
    tint = np.asarray(img, np.float32)
    any_card = labels > 0
    tint[any_card] = tint[any_card] * 0.35 + np.array([255, 0, 200]) * 0.65
    Image.fromarray(tint.astype(np.uint8)).save(out / f"{scene}-near.jpg", quality=88)

    depth = {k: v for k, v in entry.get("depth", {}).items() if k in ("plate", "plateSource")}
    if pieces:
        at, height = pack([c["size"] for c in cards], 2048)
        atlas = np.zeros((height, 2048, 4), np.float32)
        for c, p, (px, py) in zip(cards, pieces, at):
            atlas[py : py + p.shape[0], px : px + p.shape[1]] = p
            c["cell"] = [px, py, *c.pop("size")]
        src = entry["base"]["src"].rsplit(".", 1)[0] + "__near.webp"
        Image.fromarray((atlas * 255 + 0.5).astype(np.uint8), "RGBA").save(ASSETS / src, quality=92, alpha_quality=100, method=6)
        depth.update({"near": src, "cards": cards})
        for old in ("src", "unit", "plateFrom"):
            depth.pop(old, None)
        entry["depth"] = depth
    else:
        entry.pop("depth", None)
    grounds = ", ".join(f"{c['ground']:.0f}" for c in cards)
    print(f"{scene}: floor {[x0, y0, x1, y1]} fit off by {off:.1f} rows; pin {pin:.0f}; {len(cards)} cards standing at {grounds or '-'}")
    return cards


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--model", default=MODEL)
    args = ap.parse_args()
    settings = json.loads(SETTINGS.read_text())
    manifest = json.loads(MANIFEST.read_text())
    scenes = [k for k in game_scenes() if not settings.get(k, {}).get("skip")] if args.all else args.scenes
    game = game_scenes()
    for scene in scenes:
        cut(scene, settings.get(scene, {}), manifest, args.model, game[scene])
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
