"""Wave 12: red (old) / cyan (new) overlays of a hero's sheet, to check the body lines up.

python tools/art/wave12-overlay.py <hero> <new sheet file> <out.png>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
hero, new, out = sys.argv[1:4]
d = ROOT / f"public/assets/characters/ally_{hero}"
def lum(path):
    """Brightness of what shows (premultiplied, so color hidden in transparent pixels stays black)."""
    x = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255
    return (x[..., :3] @ np.array([0.3, 0.59, 0.11]) * x[..., 3] * 255).astype(np.uint8)


a = lum(d / "battle.webp")
b = lum(new)
Image.fromarray(np.stack([a, b, b], -1)).resize((1152, 768)).save(out)
