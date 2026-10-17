"""Wave 12: side-by-side review strips for art/review/wave-12.md.

python tools/art/wave12-review.py
For each hero writes art/review/wave-12/<hero>_battle.webp (as found, step 1,
step 2 stacked) and <hero>_walk.webp, plus the hero's two weapon icons, on a
grey ground so the transparent sheets read.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
OUT = ROOT / "art/review/wave-12"
HEROES = ["knight", "gunner", "spellwright", "titancaller", "beastkeeper"]
ICONS = ["ally_knight_1", "ally_knight_2", "ally_gunner_1", "ally_gunner_2",
         "ally_spellwright_1", "ally_spellwright_2", "ally_titancaller_1",
         "ally_titancaller_2", "ally_beastkeeper_1", "ally_beastkeeper_2"]


def strip(paths, width=1200):
    ims = [Image.open(p).convert("RGBA") for p in paths if p.exists()]
    if not ims:
        return None
    w, h = ims[0].size
    out = Image.new("RGBA", (w, h * len(ims) + 12 * (len(ims) - 1)), (72, 72, 78, 255))
    for i, im in enumerate(ims):
        out.alpha_composite(im, (0, i * (h + 12)))
    return out.resize((width, round(out.height * width / w)), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icons = Image.open(A / "icons/weapons_ch2.webp").convert("RGBA")
    for hero in HEROES:
        d = A / f"characters/ally_{hero}"
        for sheet in ("battle", "walk"):
            s = strip([d / f"{sheet}.webp", d / f"{sheet}_1.webp", d / f"{sheet}_2.webp"])
            if s:
                s.convert("RGB").save(OUT / f"{hero}_{sheet}.webp", quality=82)
        row = Image.new("RGBA", (512, 256), (72, 72, 78, 255))
        for k in (1, 2):
            i = ICONS.index(f"ally_{hero}_{k}")
            row.alpha_composite(icons.crop((i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256)), ((k - 1) * 256, 0))
        row.convert("RGB").save(OUT / f"{hero}_icons.webp", quality=86)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
