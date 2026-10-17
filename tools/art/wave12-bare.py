"""Wave 12 Section B: the heroes without a weapon, for exploring.

python tools/art/wave12-bare.py gen <hero> walk|stand <cell> [attempt]
python tools/art/wave12-bare.py fit <hero> walk|stand <cell> <attempt>
python tools/art/wave12-bare.py assemble <hero> walk|stand

walk:  an edit of walk.webp, 8 cells of 384x512 -> walk_bare.webp, manifest walk_bare
stand: the battle sheet's idle (cell 0) and ko (cell 1) -> stand.webp (1024x512),
       manifest stand
Raw work goes to art/raw/wave-12/<hero>_<walk|stand>_bare/c<cell>/.
"""
import copy
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
gen = __import__("wave12-gen")
fit = __import__("wave12-fit")

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"

LEAD = ("Remove every weapon from this hero, so they carry nothing: nothing in their hands, nothing floating beside "
        "them, nothing on their back. Their hands hang or swing empty and natural for the pose. Keep everything else "
        "exactly as it is: the hero's face and expression, pose, legs and feet, size and framing, clothes, hair and "
        "body, and the transparent background.")
REMOVE = {
    "knight": "Remove his sword completely (blade, hilt and any glow). His shield stays exactly as it is on his arm: it is not a weapon to remove.",
    "gunner": "Remove both blasters completely, from her hands and from any holster (the holsters are left empty). Her brass mechanical left arm stays exactly as it is: it is her arm, not a weapon.",
    "spellwright": "Remove the floating spellbook and the glowing wand-torch completely, with their glow and any sparkles coming from them.",
    "titancaller": "Remove her staff completely, with any water ribbons or glow coming from it.",
    "beastkeeper": "Remove her shepherd's crook completely, with its lantern and any glow or swirl coming from it.",
}


def old_cell(hero, kind, c):
    d = A / f"characters/ally_{hero}"
    if kind == "walk":
        return Image.open(d / "walk.webp").convert("RGBA").crop(fit.cell_box("walk", c))
    return Image.open(d / "battle.webp").convert("RGBA").crop(fit.cell_box("battle", [0, 4][c]))


def to_square(cell):
    w, h = cell.size
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.paste(cell.resize((w * 2, h * 2), Image.LANCZOS), ((1024 - w * 2) // 2, 0))
    return canvas


def do_gen(hero, kind, c, attempt):
    d = A / f"characters/ally_{hero}"
    out = RAW / f"{hero}_{kind}_bare/c{c}/a{attempt}"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    to_square(old_cell(hero, kind, c)).save(out / "cell.png")
    Image.open(d / "base.webp").save(out / "hero.png")
    refs = ["cell.png", "hero.png"]
    extra = ""
    first = RAW / f"{hero}_walk_bare/c0/final.png"
    if not (kind == "walk" and c == 0) and first.exists():
        to_square(Image.open(first).convert("RGBA")).save(out / "empty_hands.png")
        refs.append("empty_hands.png")
        extra = ("Image 3 is a finished walking frame of the same hero with the weapon already removed: match how their "
                 "empty hands and arms look.\n\n")
    if kind == "walk":
        frame = "walk-cycle frame (walking toward the right)"
        pose = ""
    elif c == 0:
        frame = "battle idle frame (facing left)"
        pose = ("Since nothing is held any more, the arms may move to rest empty and relaxed at the sides: a relaxed "
                "stand, not a fighting crouch around a missing weapon. The feet and legs stay exactly where they are.\n\n")
    else:
        frame = "knocked-out frame (lying on the ground, facing left)"
        pose = "The empty hand lies relaxed on the ground. The body stays exactly where it is.\n\n"
    note = os.environ.get("NOTE", "")
    note = note + "\n\n" if note else ""
    brief = f"""Generate 1 image with your image generation tool (edit mode, using the attached images as references) and save it as a PNG named `out.png` in the current folder. Actually generate and save the image; don't just describe it.

{LEAD}

Image 1 (`cell.png`) is the picture to edit: one {frame} of a game sprite, 1024x1024 on a transparent background. Edit THIS picture. Keep the canvas 1024x1024 and keep the hero at exactly the same position, size and pose in the canvas, feet at the same height, so the edited frame lines up with the others.

{REMOVE[hero]} Image 2 (`hero.png`) is the hero's character reference, so the hero stays on-model (ignore the weapon in it).

{pose}{extra}{note}{gen.SPRITE}

{gen.RULES}

Output: 1024x1024 PNG with a transparent background (alpha), no ground, no shadow, no weapon anywhere. When done, reply with the filename you saved and one line describing it.
"""
    (out / "brief.md").write_text(brief, encoding="utf-8")
    cmd = [gen.codex_exe(), "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(out), "-o", str(out / "reply.txt")]
    for r in refs:
        cmd += ["-i", str(out / r)]
    cmd.append("-")
    with open(out / "log.txt", "w", encoding="utf-8") as log:
        r = subprocess.run(cmd, input=brief, text=True, encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, timeout=1500)
    print(out, "exit", r.returncode, "->", [p.name for p in out.glob("*.png") if p.name not in refs])


def do_fit(hero, kind, c, att):
    base = RAW / f"{hero}_{kind}_bare/c{c}"
    old = old_cell(hero, kind, c)
    w, h = old.size
    g = Image.open(base / f"a{att}/out.png").convert("RGBA")
    if g.size != (1024, 1024):
        g = g.resize((1024, 1024), Image.LANCZOS)
    best = (1e9, 1.0, 0, 0)
    for s in np.arange(0.90, 1.101, 0.02):
        for dx in range(-28, 29, 4):
            for dy in range(-28, 29, 4):
                best = min(best, (fit.score(old, fit.place(g, w, h, s, dx, dy)), s, dx, dy))
    for _ in range(2):
        _, s0, x0, y0 = best
        for s in np.arange(s0 - 0.015, s0 + 0.016, 0.005):
            for dx in range(x0 - 3, x0 + 4):
                for dy in range(y0 - 3, y0 + 4):
                    best = min(best, (fit.score(old, fit.place(g, w, h, s, dx, dy)), s, dx, dy))
    v, s, dx, dy = best
    ko = kind == "stand" and c == 1
    if not ko:
        fd = fit.feet(fit.place(g, w, h, s, dx, dy)) - fit.feet(old)
        if abs(fd) > 1:
            dy -= fd
    arr = np.asarray(fit.place(g, w, h, s, dx, dy)).copy()
    arr[arr[..., 3] < 10] = 0
    arr[:2], arr[-2:], arr[:, :2], arr[:, -2:] = 0, 0, 0, 0
    new = Image.fromarray(arr)
    new.save(base / "final.png")
    e = np.asarray(new)[..., 3]
    rep = {"attempt": att, "scale": round(float(s), 3), "dx": int(dx), "dy": int(dy), "score": round(v, 4),
           "feet_old": fit.feet(old), "feet_new": fit.feet(new),
           "edge_alpha": int(max(e[2].max(), e[-3].max(), e[:, 2].max(), e[:, -3].max()))}
    rep["feet_ok"] = ko or abs(rep["feet_old"] - rep["feet_new"]) <= 2
    (base / "fit.json").write_text(json.dumps(rep))
    cmp = Image.new("RGBA", (w * 2 + 8, h), (60, 60, 60, 255))
    cmp.alpha_composite(old, (0, 0))
    cmp.alpha_composite(new, (w + 8, 0))
    cmp.convert("RGB").save(base / "compare.jpg", quality=88)
    print(hero, kind, c, json.dumps(rep))


def do_assemble(hero, kind):
    n, cw, size = (8, 384, (1536, 1024)) if kind == "walk" else (2, 512, (1024, 512))
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    for c in range(n):
        f = RAW / f"{hero}_{kind}_bare/c{c}/final.png"
        im = Image.open(f).convert("RGBA") if f.exists() else Image.new("RGBA", (cw, 512))
        if not f.exists():
            print("MISSING cell", c)
        box = fit.cell_box("walk", c) if kind == "walk" else (c * 512, 0)
        out.paste(im, box[:2])
    name = "walk_bare" if kind == "walk" else "stand"
    rel = f"characters/ally_{hero}/{name}.webp"
    out.save(A / rel, "WEBP", quality=86, method=6)
    mp = A / "manifest.json"
    m = json.loads(mp.read_text(encoding="utf-8"))
    entry = m["assets"][f"ally_{hero}"]
    if kind == "walk":
        obj = copy.deepcopy(entry["walk"])
        obj["src"] = rel
    else:
        obj = {"src": rel, "cell": [512, 512], "cols": 2, "rows": 1, "frames": {"idle": 0, "ko": 1},
               "anchor": entry["battle"]["anchor"], "facing": "left"}
        if "scale" in entry["battle"]:
            obj["scale"] = entry["battle"]["scale"]
    entry[name] = obj
    entry.setdefault("sourceWave12", {"wave_file": "art/waves/wave-12-forged-weapons.md",
                                      "model": "Codex image generation (identifier not exposed)",
                                      "date": "2026-10-17"})
    mp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(rel, (A / rel).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    op, hero, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    if op == "gen":
        do_gen(hero, kind, int(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 1)
    elif op == "fit":
        do_fit(hero, kind, int(sys.argv[4]), int(sys.argv[5]))
    else:
        do_assemble(hero, kind)
