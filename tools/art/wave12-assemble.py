"""Wave 12: paste the fitted cells into the new sheet and register it.

python tools/art/wave12-assemble.py <hero> <sheet> <step>
Writes public/assets/characters/ally_<hero>/<sheet>_<step>.webp from
art/raw/wave-12/<hero>_<sheet>_<step>/c*/final.png (cells without one keep the old
picture, and are listed), and adds <sheet>_<step> to the hero's manifest entry: a
copy of the <sheet> object with the new src.
"""
import copy
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"
sys.path.insert(0, str(Path(__file__).parent))
fit = __import__("wave12-fit")


def main():
    hero, sheet, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
    src = Image.open(fit.source_sheet(hero, sheet)).convert("RGBA")
    n = 6 if sheet == "battle" else 8
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    kept = []
    for c in range(n):
        box = fit.cell_box(sheet, c)
        f = RAW / f"{hero}_{sheet}_{step}/c{c}/final.png"
        if f.exists():
            out.paste(Image.open(f).convert("RGBA"), box[:2])
        else:
            out.paste(src.crop(box), box[:2])
            kept.append(c)
    rel = f"characters/ally_{hero}/{sheet}_{step}.webp"
    out.save(A / rel, "WEBP", quality=86, method=6, exact=False)

    mp = A / "manifest.json"
    m = json.loads(mp.read_text(encoding="utf-8"))
    entry = m["assets"][f"ally_{hero}"]
    obj = copy.deepcopy(entry[sheet])
    obj["src"] = rel
    entry[f"{sheet}_{step}"] = obj
    entry.setdefault("sourceWave12", {"wave_file": "art/waves/wave-12-forged-weapons.md",
                                      "model": "Codex image generation (identifier not exposed)",
                                      "date": "2026-10-17"})
    mp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    size = (A / rel).stat().st_size // 1024
    print(rel, f"{size} KB", "old cells kept:" if kept else "", kept or "")


if __name__ == "__main__":
    main()
