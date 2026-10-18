"""Draw an 8-frame walk-cycle pose guide (a mannequin), for Codex to paint a hero over in one go.

python3 tools/art/walk_guide.py <out.png> [height] [--shield]

The sheet matches the walk sheets: 1536x1024, 4 x 2 cells of 384x512, facing right,
feet on y=481. Frame 1 is the contact pose with the near (light) leg forward; the
far limbs are dark, the near ones light, so the painter can tell them apart. --shield bends the near arm to hold a shield
(outlined in blue) in front of the body, swinging only a little.
The hips bob from the legs themselves: the lowest foot always stands on the line.
"""
import math
import sys

from PIL import Image, ImageDraw

W, H, GROUND = 384, 512, 481


def leg(hip, thigh_deg, knee_deg, L):
    t = math.radians(thigh_deg)
    knee = (hip[0] + L["thigh"] * math.sin(t), hip[1] + L["thigh"] * math.cos(t))
    s = math.radians(thigh_deg - knee_deg)
    ankle = (knee[0] + L["shin"] * math.sin(s), knee[1] + L["shin"] * math.cos(s))
    return knee, ankle


def pose(c, L):
    p = 2 * math.pi * c / 8
    legs = {}
    for side, ph in (("near", p), ("far", p + math.pi)):
        thigh = 24 * math.cos(ph)                      # + is forward (toward the right)
        # 0..1 while the leg swings forward, peaking early in the swing (just after toe-off)
        swing = max(0.0, -math.sin(ph - 0.35))
        knee = 6 + 40 * swing + 8 * max(0.0, math.sin(ph)) * (1 - abs(math.cos(ph)))
        legs[side] = (thigh, knee, swing)
    hip0 = (W / 2, 0.0)
    feet = {s: leg(hip0, *legs[s][:2], L)[1] for s in legs}
    # the lower of the two ankles stands on the ground (ankle sits L["ankle"] above the sole)
    hip_y = GROUND - L["ankle"] - max(f[1] for f in feet.values())
    return legs, hip_y, p


def draw_frame(d, ox, oy, c, L):
    legs, hip_y, p = pose(c, L)
    hip = (ox + W / 2, oy + hip_y)
    lean = math.radians(4)
    shoulder = (hip[0] + L["torso"] * math.sin(lean), hip[1] - L["torso"] * math.cos(lean))
    neck = (shoulder[0] + 3, shoulder[1] - L["neck"])
    head = (neck[0] + 4, neck[1] - L["head"] / 2)
    col = {"far": (70, 70, 80), "near": (205, 205, 215)}
    body = (140, 140, 150)

    def limb(a, b, w, fill):
        d.line([a, b], fill=fill, width=w)
        r = w / 2
        for q in (a, b):
            d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=fill)

    def foot(ankle, swing, fill):
        toe_up = 18 * swing                        # toes lift a little while swinging
        tip = (ankle[0] + L["foot"] * math.cos(math.radians(toe_up)), ankle[1] + L["ankle"] - L["foot"] * math.sin(math.radians(toe_up)) * 0.6)
        heel = (ankle[0] - 10, ankle[1] + L["ankle"])
        d.polygon([(ankle[0] - 8, ankle[1] - 6), (ankle[0] + 10, ankle[1] - 4), tip, (tip[0], tip[1] + 2), heel], fill=fill)

    def arm(side, fill):
        ph = p + (math.pi if side == "near" else 0)   # each arm swings with the opposite leg
        holds = side == "near" and SHIELD
        a = math.radians((5 if holds else 18) * math.cos(ph))
        sh = (shoulder[0] + (-6 if side == "far" else 4), shoulder[1] + 8)
        el = (sh[0] + L["upper"] * math.sin(a), sh[1] + L["upper"] * math.cos(a))
        f = a + math.radians(75 if holds else 14 + 10 * max(0, math.cos(ph)))
        hand = (el[0] + L["fore"] * math.sin(f), el[1] + L["fore"] * math.cos(f))
        limb(sh, el, 20, fill)
        limb(el, hand, 17, fill)
        d.ellipse([hand[0] - 11, hand[1] - 11, hand[0] + 11, hand[1] + 11], fill=fill)
        if holds:  # the shield's outline, strapped to the forearm, in front of the body
            mx, my = (el[0] + hand[0]) / 2 - 6, (el[1] + hand[1]) / 2 + 10
            w2, h2 = 44 * L["k"], 105 * L["k"]
            d.polygon([(mx - w2, my - h2 * 0.75), (mx + w2, my - h2 * 0.75), (mx + w2 * 0.9, my + h2 * 0.2), (mx, my + h2), (mx - w2 * 0.9, my + h2 * 0.2)],
                      outline=(40, 110, 220), width=4)

    # far side first
    knee, ankle = leg(hip, *legs["far"][:2], L)
    arm("far", col["far"])
    limb(hip, knee, 34, col["far"]); limb(knee, ankle, 28, col["far"]); foot(ankle, legs["far"][2], col["far"])
    # body
    limb(hip, shoulder, 58, body)
    d.ellipse([hip[0] - 34, hip[1] - 22, hip[0] + 34, hip[1] + 22], fill=body)
    limb(shoulder, neck, 18, body)
    r = L["head"] / 2
    d.ellipse([head[0] - r * 0.9, head[1] - r, head[0] + r * 0.9, head[1] + r], fill=body)
    d.polygon([(head[0] + r * 0.7, head[1] - 6), (head[0] + r * 1.15, head[1] + 4), (head[0] + r * 0.7, head[1] + 10)], fill=body)  # nose: facing right
    knee, ankle = leg(hip, *legs["near"][:2], L)
    limb(hip, knee, 36, col["near"]); limb(knee, ankle, 30, col["near"]); foot(ankle, legs["near"][2], col["near"])
    arm("near", col["near"])


SHIELD = False


def main():
    global SHIELD
    SHIELD = "--shield" in sys.argv
    sys.argv = [a for a in sys.argv if a != "--shield"]
    out = sys.argv[1]
    height = float(sys.argv[2]) if len(sys.argv) > 2 else 420
    k = height / 420
    L = {k2: v * k for k2, v in dict(thigh=102, shin=96, ankle=12, foot=40, torso=128, neck=14, head=60, upper=70, fore=62).items()}
    L["k"] = k
    sheet = Image.new("RGB", (W * 4, H * 2), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for c in range(8):
        ox, oy = (c % 4) * W, (c // 4) * H
        d.line([(ox + 10, oy + GROUND), (ox + W - 10, oy + GROUND)], fill=(225, 225, 225), width=2)
        draw_frame(d, ox, oy, c, L)
    sheet.save(out)


if __name__ == "__main__":
    main()
