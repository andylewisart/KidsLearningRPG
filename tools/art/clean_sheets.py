"""Remove stray fragments from sprite sheets.

Image models draw sheet poses that spill across cell lines, so a cell can
hold a sliver of its neighbor (a sword tip, a muzzle flash, a strip of
cape). In the game those slivers float next to the character. This pass
looks at each cell on its own and erases small loose pieces on the outer
edge of the pose. Sparkles inside the pose's area stay.

    python3 tools/art/clean_sheets.py            clean the sheets listed in TARGETS
    python3 tools/art/clean_sheets.py --dry-run  report only

Needs Pillow and numpy. Safe to run more than once.
"""

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
SOLID = 24  # alpha that counts as part of a shape

# Which sheets to clean, and frames to leave alone. Reviewed by eye: fiends
# keep their loose bits on purpose (the Magnet Beetle's floating scrap, the
# slime's ink drops), so do portraits with expression marks, and the
# Spellwright's hurt pose drops its staff and sees stars.
TARGETS = {
    ("ally_knight", "walk"): set(),
    ("ally_gunner", "walk"): set(),
    ("ally_titancaller", "walk"): set(),
    ("ally_knight", "battle"): set(),
    ("ally_knight", "portraits"): set(),
    ("ally_gunner", "battle"): set(),
    ("ally_spellwright", "battle"): {3},
    ("ally_titancaller", "battle"): set(),
}


def label(mask):
    """8-connected components of a boolean mask. Returns (labels, sizes, touches_border)."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes, border = [0], [False]
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if labels[sy, sx]:
            continue
        n = len(sizes)
        labels[sy, sx] = n
        q = deque([(sy, sx)])
        size, touches = 0, False
        while q:
            y, x = q.popleft()
            size += 1
            if y == 0 or x == 0 or y == h - 1 or x == w - 1:
                touches = True
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = n
                        q.append((ny, nx))
        sizes.append(size)
        border.append(touches)
    return labels, sizes, border


def dilate(mask, r):
    """Grow a mask by r pixels (no wrap-around at the edges)."""
    h, w = mask.shape
    padded = np.pad(mask, r)
    out = np.zeros_like(mask)
    for dy in range(2 * r + 1):
        for dx in range(2 * r + 1):
            out |= padded[dy : dy + h, dx : dx + w]
    return out


def clean_cell(rgba):
    """Erase small loose pieces at the outer edge of a pose. Returns pixels erased.

    The sheet processor scales each pose into the middle of its cell, so a
    sliver from a neighboring cell ends up as a small separate piece on the
    outside edge of the pose's bounding box. Erase pieces under 4% of the
    pose that sit on that edge, then look again (the edge moves in).
    """
    erased = 0
    for _ in range(4):
        alpha = rgba[:, :, 3]
        labels, sizes, _ = label(alpha > SOLID)
        if len(sizes) <= 2:
            break
        biggest = max(sizes[1:])
        ys, xs = np.nonzero(labels)
        top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
        drop = []
        for i in range(1, len(sizes)):
            if sizes[i] >= biggest * 0.04:
                continue
            cy, cx = np.nonzero(labels == i)
            if cy.min() <= top + 1 or cy.max() >= bottom - 1 or cx.min() <= left + 1 or cx.max() >= right - 1:
                drop.append(i)
        if not drop:
            break
        gone = np.isin(labels, drop)
        keep = (labels > 0) & ~gone
        # take the soft glow around each dropped piece too, without touching the pose
        erase = dilate(gone, 3) & ~dilate(keep, 2)
        erased += int(np.count_nonzero(erase & (alpha > 0)))
        rgba[:, :, 3] = np.where(erase, 0, alpha)
    return erased


def clean_sheet(path, sheet, dry_run, skip=()):
    im = Image.open(path).convert("RGBA")
    data = np.array(im)
    cw, ch = sheet["cell"]
    report = []
    for i in range(sheet["cols"] * sheet["rows"]):
        if i in skip:
            continue
        x0, y0 = (i % sheet["cols"]) * cw, (i // sheet["cols"]) * ch
        cell = data[y0 : y0 + ch, x0 : x0 + cw]
        erased = clean_cell(cell)
        if erased:
            report.append(f"frame {i}: erased {erased} px")
    if report and not dry_run:
        Image.fromarray(data, "RGBA").save(path, "WEBP", quality=92, method=6)
    return report


def main():
    dry_run = "--dry-run" in sys.argv
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf8"))
    for (asset_id, key), skip in TARGETS.items():
        sheet = manifest["assets"].get(asset_id, {}).get(key)
        if not sheet or not sheet.get("cols"):
            continue
        report = clean_sheet(ASSETS / sheet["src"], sheet, dry_run, skip)
        print(f"{asset_id}/{key}: " + ("; ".join(report) if report else "clean"))


if __name__ == "__main__":
    main()
