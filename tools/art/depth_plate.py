"""Set a painted scene's clean plate from Codex's repaint (see art/review/depth/plate/BRIEFS.md).

The plate is the painting itself everywhere but around the scene's cards,
where Codex's repaint fills in: so the room looks exactly as painted, and a
card that slides aside uncovers Codex's floor, not a second copy of itself.

    python3 tools/art/depth_plate.py scene_camp art/review/depth/plate/scene_camp_plate_1.png

Run scene_depth.py first. Writes public/assets/scenes/explore/<scene>__plate.webp
and sets depth.plate and depth.plateSource in the manifest.
"""

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
MANIFEST = ASSETS / "manifest.json"
REACH = 120  # painting pixels around a card where the repaint shows (more than any card slides)
FEATHER = 24  # and the blend into the painting


def main(scene, repaint):
    manifest = json.loads(MANIFEST.read_text())
    entry = manifest["assets"][scene]
    depth = entry["depth"]
    paint = np.asarray(Image.open(ASSETS / entry["base"]["src"]).convert("RGB"), np.float32)
    h, w = paint.shape[:2]
    fill = np.asarray(Image.open(repaint).convert("RGB").resize((w, h), Image.LANCZOS), np.float32)
    atlas = np.asarray(Image.open(ASSETS / depth["near"]))[..., 3] > 0
    mask = np.zeros((h, w), bool)
    for card in depth["cards"]:
        cx, cy, cw, ch = card["cell"]
        x, y = card["at"]
        mask[y : y + ch, x : x + cw] |= atlas[cy : cy + ch, cx : cx + cw]
    near = ndimage.distance_transform_edt(~mask)
    a = np.clip((REACH + FEATHER - near) / FEATHER, 0, 1)[..., None]
    plate = paint * (1 - a) + fill * a
    src = entry["base"]["src"].rsplit(".", 1)[0] + "__plate.webp"
    Image.fromarray((plate + 0.5).astype(np.uint8)).save(ASSETS / src, quality=90, method=6)
    depth["plate"] = src
    depth["plateSource"] = {"wave_file": str(Path(repaint).as_posix()), "model": "Codex built-in image_gen (identifier not exposed)", "date": str(date.today()), "blend": f"the painting, with Codex's repaint within {REACH}px of the cards"}
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"{scene}: plate {src}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
