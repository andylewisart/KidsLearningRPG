"""Wave 12: ask Codex to repaint the weapon in one cell of a hero sheet.

python tools/art/wave12-gen.py <hero> <sheet> <step> <cell> [attempt]
  hero  knight | gunner | spellwright | titancaller | beastkeeper
  sheet battle | walk
  step  1 | 2
Writes art/raw/wave-12/<hero>_<sheet>_<step>/c<cell>/a<attempt>/ with the brief,
the references and Codex's PNG.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "public/assets"
RAW = ROOT / "art/raw/wave-12"
ICONS = ["ally_knight_1", "ally_knight_2", "ally_gunner_1", "ally_gunner_2",
         "ally_spellwright_1", "ally_spellwright_2", "ally_titancaller_1",
         "ally_titancaller_2", "ally_beastkeeper_1", "ally_beastkeeper_2"]
WEAPON = {
    ("knight", 1): "the Shard Sword: a glowing blue crystal blade with a gold star-shaped crossguard, a round blue gem at its center and a small gold charm dangling from the pommel",
    ("knight", 2): "the Sharkfin Blade: a broad, jagged, curved blue-and-steel blade with fin-like teeth along its back, a gold-wrapped hilt and a red streamer",
    ("gunner", 1): "the Brass-Fin Blasters: chunky double-barreled brass blasters with glowing orange crystal chambers and dark wood grips (one in each hand)",
    ("gunner", 2): "the Storm Blasters: longer double-barreled brass blasters with glowing orange chambers, small gold charms and blue feather tassels hanging from the grips (one in each hand)",
    ("spellwright", 1): "the Gold-Clasp Spellbook: a navy-blue book bound in ornate gold with a glowing golden clasp emblem on the cover, a ribbon bookmark and a small gold compass charm",
    ("spellwright", 2): "the Book of Flying Pages: the same navy-and-gold book, open, wreathed in loose glowing golden pages flying around it",
    ("titancaller", 1): "the Coral Crown Staff: a slender gold-and-wood staff topped with a glowing blue orb ringed by a crown of red coral, with small shells and white-and-blue streamers",
    ("titancaller", 2): "the Living Tide Staff: a gold staff topped with a large swirling blue water orb held in gold claws, with hanging shells and white streamers patterned with blue waves",
    ("beastkeeper", 1): "the Amber Crook: a twisted wooden shepherd's crook with a glowing amber lantern hanging from the hook, green feathers and small shells tied along it",
    ("beastkeeper", 2): "the Greenwood Crook: a leafy wooden shepherd's crook wound with green leaves and small white flowers, a small teal sea-dragon head carved at the hook, and hanging shells",
}
OLD_WEAPON = {
    "knight": "his glowing blue sword (held in his right hand; the shield in his other arm stays exactly as it is)",
    "gunner": "her two orange blasters (one in each hand; her brass mechanical left arm stays exactly as it is)",
    "spellwright": "the floating spellbook (his wand-torch stays exactly as it is)",
    "titancaller": "her staff",
    "beastkeeper": "her shepherd's crook",
}
EFFECT = {
    "knight": "His slash arc or magic swirl, where there is one, keeps its exact shape and stays blue.",
    "gunner": "Muzzle flashes and glow keep their shape.",
    "spellwright": "Any glow or orbiting runes around the book keep their shape and take the new book's gold colors.",
    "titancaller": "Any water ribbons or glow coming off the staff keep their shape and take the new staff's colors.",
    "beastkeeper": "Any lantern swirl or glow coming off the crook keeps its shape and takes the new crook's colors.",
}

LEAD = ("Change only the weapon this hero is holding, so it is exactly the weapon in the weapon reference: "
        "same design, colors and details. Keep it in the same hand, at the same angle and grip, about the same "
        "size against the hero as the weapon it replaces. Keep everything else exactly as it is: the hero's face "
        "and expression, pose, size and framing, clothes, hair and body, the transparent background, and any magic "
        "effect around them (recolored to match the new weapon where it comes from it).")
SPRITE = ("This is an isolated game sprite: render ONLY the subject on a fully transparent background (PNG with alpha). "
          "No scenery, no ground, no cast shadow, no frame.")
RULES = ("Rules: completely original designs; never imitate an existing franchise, character, creature, logo or emblem. "
         "No text, letters, numbers, logos, watermarks, signatures, borders or user interface. Fierce and intense is great; "
         "no blood, gore or wounds. Every character is dressed for an all-ages game: modest clothing, nothing revealing.")


def cell_box(sheet, c):
    if sheet == "battle":
        return (c % 3 * 512, c // 3 * 512, c % 3 * 512 + 512, c // 3 * 512 + 512)
    return (c % 4 * 384, c // 4 * 512, c % 4 * 384 + 384, c // 4 * 512 + 512)


def codex_exe():
    loc = subprocess.run(["powershell", "-NoProfile", "-c", "(Get-AppxPackage OpenAI.Codex).InstallLocation"],
                         capture_output=True, text=True).stdout.strip()
    if not loc:
        sys.exit("Codex app not installed")
    return loc + r"\app\resources\codex.exe"


def main():
    hero, sheet, step, c = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    attempt = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    d = A / f"characters/ally_{hero}"
    src = Image.open(d / ("walk_src.webp" if sheet == "walk" and (d / "walk_src.webp").exists() else f"{sheet}.webp")).convert("RGBA")
    out = RAW / f"{hero}_{sheet}_{step}/c{c}/a{attempt}"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    # The cell, scaled up 2x onto a square canvas (Codex returns squares), and the other references.
    cell = src.crop(cell_box(sheet, c))
    w, h = cell.size
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    big = cell.resize((w * 2, h * 2), Image.LANCZOS)
    canvas.paste(big, ((1024 - w * 2) // 2, 0))
    canvas.save(out / "cell.png")
    Image.open(d / "base.webp").save(out / "hero.png")
    i = ICONS.index(f"ally_{hero}_{step}")
    icons = Image.open(A / "icons/weapons_ch2.webp")
    icons.crop((i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256)).resize((512, 512), Image.LANCZOS).save(out / "weapon.png")
    refs = ["cell.png", "weapon.png", "hero.png"]
    extra = ""
    if sheet == "battle" and step == 2:
        p1 = RAW / f"{hero}_battle_1/c{c}/final.png"
        if (A / f"characters/ally_{hero}/battle_1.webp").exists() or p1.exists():
            s1 = Image.open(d / "battle_1.webp").convert("RGBA").crop(cell_box("battle", c)).resize((1024, 1024), Image.LANCZOS)
            s1.save(out / "step1.png")
            refs.append("step1.png")
            extra = ("Image 4 is the same frame with the previous weapon upgrade already painted in: make the new weapon "
                     "match it in size, position and grip.\n\n")
    if sheet == "walk":
        bs = d / f"battle_{step}.webp"
        if bs.exists():
            Image.open(bs).convert("RGBA").crop(cell_box("battle", 0)).resize((1024, 1024), Image.LANCZOS).save(out / "battle_idle.png")
            refs.append("battle_idle.png")
            extra = ("Image 4 shows the same hero holding the new weapon in battle: the weapon must look exactly like "
                     "that one.\n\n")

    note = os.environ.get("NOTE", "")
    note = note + "\n\n" if note else ""
    frame = "battle animation frame" if sheet == "battle" else "walk-cycle frame (walking toward the right)"
    brief = f"""Generate 1 image with your image generation tool (edit mode, using the attached images as references) and save it as a PNG named `out.png` in the current folder. Actually generate and save the image; don't just describe it.

{LEAD}

Image 1 (`cell.png`) is the picture to edit: one {frame} of a game sprite, 1024x1024 on a transparent background. Edit THIS picture. Keep the canvas 1024x1024 and keep the hero at exactly the same position, size and pose in the canvas, feet at the same height, so the edited frame lines up with the others.

The weapon to remove is {OLD_WEAPON[hero]}. Replace it with {WEAPON[(hero, step)]}. Image 2 (`weapon.png`) is the weapon reference: copy its design exactly. Image 3 (`hero.png`) is the hero's character reference, so the hero stays on-model. {EFFECT[hero]}

{extra}{note}{SPRITE}

{RULES}

Output: 1024x1024 PNG with a transparent background (alpha), no ground, no shadow. When done, reply with the filename you saved and one line describing it.
"""
    (out / "brief.md").write_text(brief, encoding="utf-8")
    cmd = [codex_exe(), "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(out), "-o", str(out / "reply.txt")]
    for r in refs:
        cmd += ["-i", str(out / r)]
    cmd.append("-")
    with open(out / "log.txt", "w", encoding="utf-8") as log:
        r = subprocess.run(cmd, input=brief, text=True, encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, timeout=1500)
    pngs = [p for p in out.glob("*.png") if p.name not in refs]
    print(out, "exit", r.returncode, "->", [p.name for p in pngs])


if __name__ == "__main__":
    main()
