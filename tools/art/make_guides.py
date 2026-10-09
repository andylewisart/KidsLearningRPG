"""Draw the composition guides that Codex passes to the image model as reference images.

Each guide shows where things must go (the horizon, the floor in perspective,
where fighters stand, what the game's menus cover, sprite baselines, icon
safe areas) so new art lines up with the game. They are construction
drawings only: prompts tell the model never to copy their lines or labels.

    python3 tools/art/make_guides.py        writes art/guides/*.png

The battle-stage numbers come from src/ui/stage-layout.json, the same file
the game reads, so if fighters move in the game, re-run this and the guides
move too. Needs Pillow.
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art" / "guides"
LAYOUT = json.loads((ROOT / "src" / "ui" / "stage-layout.json").read_text(encoding="utf8"))

BG = (32, 41, 58)
INK = (232, 240, 255)
DIM = (150, 165, 190)
YELLOW = (255, 214, 92)
RED = (255, 96, 110)
GREEN = (96, 230, 150)
CYAN = (110, 220, 255)
BLUE = (90, 140, 255)


def font(size, bold=False):
    names = ["DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"]
    for folder in ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation", "/usr/share/fonts/TTF", "/Library/Fonts", "C:/Windows/Fonts"]:
        for name in names:
            p = Path(folder) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def label(d, xy, text, size=22, fill=INK, bold=False, anchor="la"):
    d.text(xy, text, font=font(size, bold), fill=fill, anchor=anchor, stroke_width=3, stroke_fill=(10, 14, 24))


def dashed(d, a, b, fill, width=2, dash=14, gap=10):
    (x1, y1), (x2, y2) = a, b
    length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5 or 1
    ux, uy = (x2 - x1) / length, (y2 - y1) / length
    t = 0.0
    while t < length:
        e = min(t + dash, length)
        d.line([(x1 + ux * t, y1 + uy * t), (x1 + ux * e, y1 + uy * e)], fill=fill, width=width)
        t += dash + gap


def dashed_rect(d, box, fill, width=2):
    x1, y1, x2, y2 = box
    for a, b in [((x1, y1), (x2, y1)), ((x2, y1), (x2, y2)), ((x2, y2), (x1, y2)), ((x1, y2), (x1, y1))]:
        dashed(d, a, b, fill, width)


def shade(img, box, color, alpha):
    x1, y1, x2, y2 = box
    x1, x2 = max(0, x1), min(img.size[0], x2)
    y1, y2 = max(0, y1), min(img.size[1], y2)
    if x2 <= x1 or y2 <= y1:
        return
    box = (x1, y1, x2, y2)
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(over).rectangle(box, fill=color + (alpha,))
    img.alpha_composite(over)


# ---------------------------------------------------------------- stage mapping

STAGE_W, STAGE_H = LAYOUT["stage"]
IMG_W, IMG_H = LAYOUT["background"]["image"]
S = LAYOUT["background"]["scale"]
LEFT = (STAGE_W - IMG_W * S) / 2
TOP = LAYOUT["background"]["floorEdgeStageY"] - LAYOUT["background"]["floorEdgeImage"] * IMG_H * S
EYE = LAYOUT["background"]["eyeLevelImage"] * IMG_H  # true horizon, in image pixels
EDGE = LAYOUT["background"]["floorEdgeImage"] * IMG_H  # back edge of the arena floor
DRIFT = (40, 15)  # how far the camera drifts, in stage px


def to_img(x, y):
    """Stage pixels -> background-image pixels."""
    return ((x - LEFT) / S, (y - TOP) / S)


def stage_box(x1, y1, x2, y2):
    a, b = to_img(x1, y1), to_img(x2, y2)
    return (a[0], a[1], b[0], b[1])


def base_stage():
    img = Image.new("RGBA", (IMG_W, IMG_H), BG + (255,))
    d = ImageDraw.Draw(img)
    vx = IMG_W / 2
    # The arena floor in perspective: lines run toward the vanishing point on the
    # eye-level line, and depth lines bunch up toward it. The floor itself starts
    # at its back edge; above that are walls, steps, cliffs or sea.
    for i in range(-16, 17):
        x_far = vx + (vx + i * 170 - vx) * (EDGE - EYE) / (IMG_H + 400 - EYE)
        d.line([(x_far, EDGE), (vx + i * 170, IMG_H + 400)], fill=(70, 95, 130), width=2)
    for z in range(1, 30):
        y = EYE + 700 / z
        if EDGE <= y < IMG_H:
            d.line([(0, y), (IMG_W, y)], fill=(70, 95, 130), width=2)
    dashed(d, (0, EYE), (IMG_W, EYE), YELLOW, 3, 22, 12)
    d.ellipse([vx - 9, EYE - 9, vx + 9, EYE + 9], outline=YELLOW, width=3)
    d.line([(0, EDGE), (IMG_W, EDGE)], fill=(255, 160, 70), width=4)
    return img, d, EDGE


def fighters(img, d, show_labels=True):
    hero_h = LAYOUT["sizes"]["hero"][1] * 0.86 / S
    for x, y in LAYOUT["heroSlots"]:
        fx, fy = to_img(x, y)
        d.ellipse([fx - 55, fy - 12, fx + 55, fy + 12], outline=CYAN, width=3)
        d.rounded_rectangle([fx - 34, fy - hero_h, fx + 34, fy - 6], radius=30, outline=CYAN, width=3)
    fiend_h = LAYOUT["sizes"]["fiend"][1] * 0.8 / S
    for x, y in LAYOUT["fiendSlots"]["3"]:
        fx, fy = to_img(x, y)
        d.ellipse([fx - 80, fy - 15, fx + 80, fy + 15], outline=RED, width=3)
        d.rounded_rectangle([fx - 90, fy - fiend_h, fx + 90, fy - 6], radius=40, outline=RED, width=3)
    bx, by = to_img(*LAYOUT["fiendSlots"]["1"][0])
    boss_h = LAYOUT["sizes"]["boss"][1] * 0.9 / S
    boss_w = LAYOUT["sizes"]["boss"][0] * 0.9 / S
    dashed_rect(d, (bx - boss_w / 2, by - boss_h, bx + boss_w / 2, by), RED, 2)
    if show_labels:
        hx, hy_ = to_img(*LAYOUT["heroSlots"][0])
        label(d, (hx - 40, hy_ - hero_h - 46), "HEROES stand here, facing left", 22, CYAN, True)
        fx, fy = to_img(*LAYOUT["fiendSlots"]["3"][0])
        label(d, (fx - 60, fy - fiend_h - 46), "FIENDS stand here, facing right", 22, RED, True)
        label(d, (bx - boss_w / 2 + 8, by - boss_h + 8), "boss size", 20, RED)


def frames(img, d):
    vis = stage_box(0, 0, STAGE_W, STAGE_H)
    drift = stage_box(-DRIFT[0], -DRIFT[1], STAGE_W + DRIFT[0], STAGE_H + DRIFT[1])
    # outside the drift area is never seen
    for box in [(0, 0, IMG_W, drift[1]), (0, drift[3], IMG_W, IMG_H), (0, 0, drift[0], IMG_H), (drift[2], 0, IMG_W, IMG_H)]:
        shade(img, box, (0, 0, 0), 150)
    d = ImageDraw.Draw(img)
    dashed_rect(d, vis, INK, 3)
    dashed_rect(d, drift, DIM, 2)
    return d, vis


def battle_stage():
    img, d, hy = base_stage()
    top_bar = stage_box(0, 0, STAGE_W, LAYOUT["ui"]["topBarBottom"])
    hud = stage_box(0, LAYOUT["ui"]["hudTop"], STAGE_W, STAGE_H)
    shade(img, (0, top_bar[1], IMG_W, top_bar[3]), RED, 45)
    shade(img, (0, hud[1], IMG_W, IMG_H), BLUE, 70)
    keep = stage_box(110, LAYOUT["background"]["floorEdgeStageY"] + 18, 1220, LAYOUT["ui"]["hudTop"])
    shade(img, keep, GREEN, 28)
    d, vis = frames(img, d)
    fighters(img, d)
    d.rectangle(keep, outline=GREEN, width=3)
    label(d, (keep[0] + 12, keep[3] - 34), "OPEN, FLAT, EVENLY LIT FLOOR: no props, holes, steps or water where they stand", 21, GREEN, True)
    label(d, (24, EYE - 38), "EYE LEVEL (sea horizon): perspective lines meet here, about the fighters' head height", 22, YELLOW, True)
    label(d, (24, hy + 8), "BACK EDGE OF THE ARENA FLOOR: walls, steps, cliffs or sea begin here", 22, (255, 170, 90), True)
    label(d, (vis[0] + 14, top_bar[3] - 32), "turn-order bar covers this strip: keep it simple (sky, leaves)", 20, RED)
    label(d, (24, hud[1] + 16), "THE GAME'S MENUS COVER EVERYTHING BELOW THIS LINE: plain floor that continues the perspective", 22, (180, 205, 255), True)
    label(d, (24, 250), "SKY AND FAR SCENERY", 24, INK, True)
    label(d, (vis[0] + 14, vis[1] + 14), "white dashes = the screen; grey dashes = how far the camera drifts; black = never seen", 18, DIM)
    label(d, (IMG_W / 2, 24), "BATTLE STAGE GUIDE: composition only. Never draw these lines, colors, shapes or words.", 26, INK, True, "ma")
    return img


def battle_foreground():
    img, d, hy = base_stage()
    d, vis = frames(img, d)
    ok = [
        stage_box(-40, -15, 330, 175),
        stage_box(1060, -15, 1320, 175),
        stage_box(-40, 175, 60, LAYOUT["ui"]["hudTop"] + 60),
        stage_box(1200, 175, 1320, LAYOUT["ui"]["hudTop"] + 60),
    ]
    for box in ok:
        shade(img, box, GREEN, 70)
    d = ImageDraw.Draw(img)
    for box in ok:
        d.rectangle(box, outline=GREEN, width=3)
    clear = stage_box(70, 175, 1190, LAYOUT["ui"]["hudTop"] + 30)
    shade(img, clear, RED, 40)
    d = ImageDraw.Draw(img)
    d.rectangle(clear, outline=RED, width=3)
    fighters(img, d, show_labels=False)
    label(d, (ok[0][0] + 60, ok[0][3] - 40), "foreground OK", 24, GREEN, True)
    label(d, (ok[1][0] + 16, ok[1][3] - 40), "foreground OK", 24, GREEN, True)
    label(d, (clear[0] + 20, clear[1] + 16), "KEEP COMPLETELY CLEAR (transparent): the fighters are here", 24, RED, True)
    label(d, (IMG_W / 2, 24), "FOREGROUND LAYER GUIDE: paint only inside the green areas; everything else transparent.", 26, INK, True, "ma")
    label(d, (IMG_W / 2, 58), "Never draw these lines, colors, shapes or words.", 22, INK, False, "ma")
    return img


# ---------------------------------------------------------------- sheets, portraits, icons, frames


def cell_grid(cols, rows, cell, names, facing, baseline=0.94, head=0.086, title=""):
    """A sheet guide. cell is a size in px, or (width, height) for tall cells (walk cycles)."""
    cw, ch = (cell, cell) if isinstance(cell, int) else cell
    img = Image.new("RGBA", (cols * cw, rows * ch), BG + (255,))
    d = ImageDraw.Draw(img)
    for i, name in enumerate(names):
        x0, y0 = (i % cols) * cw, (i // cols) * ch
        d.rectangle([x0, y0, x0 + cw - 1, y0 + ch - 1], outline=DIM, width=2)
        if baseline is not None:
            base_y = y0 + ch * baseline
            d.line([(x0 + 10, base_y), (x0 + cw - 10, base_y)], fill=RED, width=3)
        dashed(d, (x0 + cw / 2, y0 + 10), (x0 + cw / 2, y0 + ch - 10), DIM, 2)
        if head is not None and "KO" not in name:
            dashed(d, (x0 + 20, y0 + ch * head), (x0 + cw - 20, y0 + ch * head), CYAN, 2)
        m = min(cw, ch) * 0.05
        dashed_rect(d, (x0 + m, y0 + m, x0 + cw - m, y0 + ch - m), (90, 110, 140), 1)
        label(d, (x0 + 14, y0 + 12), name, max(14, min(cw, ch) // 24), YELLOW, True)
        ax = x0 + cw / 2
        ay = y0 + ch * 0.6
        tip = -1 if facing == "left" else 1
        d.line([(ax - 50 * tip, ay), (ax + 50 * tip, ay)], fill=(120, 140, 170), width=4)
        d.polygon([(ax + 62 * tip, ay), (ax + 42 * tip, ay - 12), (ax + 42 * tip, ay + 12)], fill=(120, 140, 170))
    if title:
        label(d, (cols * cw / 2, rows * ch - 30), title, max(14, min(cw, ch) // 26), INK, True, "ma")
    return img


def expression_guide():
    """Expression sheets: the face sits in the same place in every cell."""
    names = ["1 neutral", "2 laughing", "3 angry", "4 shocked", "5 smug", "6 worried"]
    img = cell_grid(3, 2, 512, names, "right", baseline=None, head=None)
    d = ImageDraw.Draw(img)
    for i in range(6):
        x0, y0 = (i % 3) * 512, (i // 3) * 512
        cx, cy = x0 + 256, y0 + 214
        d.ellipse([cx - 120, cy - 120, cx + 120, cy + 120], outline=YELLOW, width=3)
        dashed(d, (x0 + 40, y0 + 60), (x0 + 472, y0 + 60), CYAN, 2)
        dashed(d, (x0 + 40, y0 + 440), (x0 + 472, y0 + 440), CYAN, 2)
    label(d, (768, 980), "face (eyes and mouth) inside the yellow circle · top of head near the top blue line · shoulders at the bottom one · same framing in all six", 18, INK, True, "ma")
    return img


def prop_view_guide():
    """Props: the camera angle, the ground they stand on, and a person for scale."""
    W, H = 1536, 1024
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    ground = 840
    # a 1 m grid on the ground, seen from standing eye height a few metres away
    for i in range(-10, 11):
        d.line([(W / 2 + i * 60, ground - 70), (W / 2 + i * 120, ground + 90)], fill=(70, 95, 130), width=2)
    for k, y in enumerate([ground - 70, ground - 40, ground - 5, ground + 40, ground + 90]):
        d.line([(0, y), (W, y)], fill=(70, 95, 130), width=2)
    # a circle on the ground looks like this flat ellipse from the game's camera
    d.ellipse([W / 2 - 330, ground - 70, W / 2 + 330, ground + 90], outline=YELLOW, width=4)
    label(d, (W / 2, ground + 100), "a circle on the ground looks this flat: the object's base and top surfaces follow it", 20, YELLOW, True, "ma")
    # a person for scale, standing on the line
    px = 210
    d.rounded_rectangle([px - 34, ground - 360, px + 34, ground - 8], radius=30, outline=CYAN, width=3)
    d.ellipse([px - 30, ground - 420, px + 30, ground - 360], outline=CYAN, width=3)
    label(d, (px, ground - 455), "a hero, for scale", 20, CYAN, True, "ma")
    d.line([(60, ground), (W - 60, ground)], fill=RED, width=4)
    label(d, (W - 70, ground - 34), "the object stands on this line; it touches the ground only at its base", 20, RED, True, "ra")
    label(d, (W / 2, 40), "PROP GUIDE: camera angle and scale only. Never draw these lines, colors, shapes or words.", 26, INK, True, "ma")
    label(d, (W / 2, 80), "seen from a person's standing eye height, a few steps away: a slightly raised three-quarter front view", 22, DIM, False, "ma")
    return img


def story_card_guide():
    """Story cards: what the 16:9 screen shows, and where the narration box covers."""
    W, H = 1536, 1024
    img = Image.new("RGBA", (W, H), BG + (255,))
    crop = (H - W * 9 / 16) / 2
    shade(img, (0, 0, W, crop), (0, 0, 0), 170)
    shade(img, (0, H - crop, W, H), (0, 0, 0), 170)
    shade(img, (0, H - crop - 230, W, H - crop), BLUE, 70)
    d = ImageDraw.Draw(img)
    dashed_rect(d, (8, crop, W - 8, H - crop), INK, 3)
    label(d, (W / 2, crop / 2), "cut off on screen", 22, DIM, True, "mm")
    label(d, (W / 2, H - crop / 2), "cut off on screen", 22, DIM, True, "mm")
    label(d, (W / 2, H - crop - 120), "THE NARRATION BOX COVERS THIS STRIP: keep faces and the main subject above it", 22, (180, 205, 255), True, "mm")
    label(d, (W / 2, crop + 40), "STORY CARD GUIDE: the main subject goes in the middle band. Never draw these lines, colors, shapes or words.", 22, INK, True, "ma")
    return img


def portrait_guide():
    img = Image.new("RGBA", (1024, 1024), BG + (255,))
    d = ImageDraw.Draw(img)
    d.ellipse([512 - 250, 400 - 250, 512 + 250, 400 + 250], outline=YELLOW, width=5)
    dashed(d, (60, 120), (964, 120), CYAN, 3)
    dashed(d, (60, 680), (964, 680), CYAN, 3)
    label(d, (512, 64), "PORTRAIT GUIDE: head and shoulders, three-quarters toward the right", 26, INK, True, "ma")
    label(d, (70, 128), "top of head (horns and crests may go higher)", 20, CYAN)
    label(d, (70, 688), "shoulders and chest below here; fade out or crop at the bottom edge", 20, CYAN)
    label(d, (512, 400), "the eyes and mouth must sit inside this circle", 22, YELLOW, True, "mm")
    label(d, (512, 430), "(the turn-order bar shows only the circle)", 18, YELLOW, False, "mm")
    label(d, (512, 990), "Never draw these lines, colors, shapes or words.", 22, INK, False, "ma")
    return img


def icon_guide(names):
    cell = 256
    img = Image.new("RGBA", (1024, 1024), BG + (255,))
    d = ImageDraw.Draw(img)
    for i, name in enumerate(names):
        x0, y0 = (i % 4) * cell, (i // 4) * cell
        d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], outline=DIM, width=2)
        cx, cy = x0 + cell / 2, y0 + cell / 2
        d.ellipse([cx - 104, cy - 104, cx + 104, cy + 104], outline=YELLOW, width=3)
        d.line([(cx - 12, cy), (cx + 12, cy)], fill=DIM, width=2)
        d.line([(cx, cy - 12), (cx, cy + 12)], fill=DIM, width=2)
        label(d, (cx, y0 + cell - 26), name, 18, INK, True, "ma")
    return img


def frame_guide(band=96):
    n = 1024
    img = Image.new("RGBA", (n, n), BG + (255,))
    shade(img, (0, 0, n, band), CYAN, 70)
    shade(img, (0, n - band, n, n), CYAN, 70)
    shade(img, (0, band, band, n - band), CYAN, 70)
    shade(img, (n - band, band, n, n - band), CYAN, 70)
    for x, y in [(0, 0), (n - band, 0), (0, n - band), (n - band, n - band)]:
        shade(img, (x, y, x + band, y + band), YELLOW, 110)
    d = ImageDraw.Draw(img)
    d.rectangle([band, band, n - band, n - band], outline=RED, width=3)
    label(d, (n / 2, n / 2 - 40), "CENTER: fully transparent", 30, RED, True, "mm")
    label(d, (n / 2, n / 2 + 4), "(the game puts text here)", 22, RED, False, "mm")
    label(d, (n / 2, band / 2), "EDGE: one straight band that can stretch", 22, INK, True, "mm")
    label(d, (band + 10, band + 12), "yellow = corner ornaments (never stretched)", 20, YELLOW)
    label(d, (n / 2, n - band - 40), f"the frame stays inside the outer {band}px; keep the edges the same width all round", 20, INK, False, "mm")
    label(d, (n / 2, n - 30), "Never draw these lines, colors, shapes or words.", 20, INK, False, "mm")
    return img


ICONS = ["strike", "fire", "cast", "lash", "potion", "swap", "guard", "overdrive", "summon", "menu", "back", "hint", "talk", "shard", "capture", "star"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    out = {
        "battle_stage.png": battle_stage(),
        "battle_foreground.png": battle_foreground(),
        "hero_battle_sheet.png": cell_grid(3, 2, 512, ["1 idle", "2 attack", "3 cast", "4 hurt", "5 KO (lying on the red line)", "6 victory"], "left", title="feet on the red line · head near the blue line · facing LEFT"),
        "portrait.png": portrait_guide(),
        "icon_sheet.png": icon_guide(ICONS),
        "frame_9slice.png": frame_guide(),
        "walk_cycle.png": cell_grid(4, 2, (384, 512), ["1 contact", "2 down", "3 passing", "4 up", "5 contact (other foot)", "6 down", "7 passing", "8 up"], "right", title="one looping step cycle · feet on the red line · head near the blue line · walking RIGHT"),
        "creature_sheet_2x2.png": cell_grid(2, 2, 512, ["1 idle", "2 holding", "3 raspberry", "4 running away"], "right", head=None, title="same size and baseline in every cell · facing RIGHT"),
        "expression_sheet.png": expression_guide(),
        "prop_view.png": prop_view_guide(),
        "story_card.png": story_card_guide(),
    }
    for name, img in out.items():
        img.convert("RGB").save(OUT / name, optimize=True)
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
