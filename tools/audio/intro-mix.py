#!/usr/bin/env python3
"""Mix the intro film's soundtrack (art/video-refs/intro-v8/) from the stems in art/audio-intro/.

Every effect and line is placed on the film's clock, panned to where it
happens on screen and leveled; effects duck under the voices. The music is
not in here: the game plays Jumble's theme on its own music bus and ducks it
at the hit (OPENING in src/ui/explore.js).

  python3 tools/audio/intro-mix.py OUT.wav

Needs ffmpeg and numpy. The cue list below is the mix; times are seconds into the film.
"""
import subprocess
import sys

import numpy as np

SR = 48000
LENGTH = 21.8  # the film is cut here, after the thumbs-up has settled (it freezes from 21.5)
STEMS = "art/audio-intro/"

# (file, or a `path` from the repo root; at, gain dB, pan) — pan -1 left .. +1 right, or (from, to) to travel across
# the clip. Optional: start/end (seconds into the file), fade (out, seconds),
# keep_width (stereo beds stay wide), echo (a ghostly tail), duck (dips under voices).
SFX = [
    # night sky, the two ships side by side
    dict(f="wind_bed", at=0.0, end=12.3, gain=1, keep_width=True, fade=0.4),
    dict(f="propeller_hum", at=0.0, end=6.4, gain=-6, pan=-0.45, fade=0.8),
    dict(f="ghost_drone", at=0.0, end=7.6, gain=-5, pan=0.45, fade=0.4),
    # the hit (0.65 s), the hull grinding
    dict(f="impact_boom", at=0.62, gain=3, pan=0.12),
    dict(f="wood_groan", at=0.95, gain=-3, pan=(-0.3, 0.3)),
    # the crystal flares (2.45) and shatters (2.6), four shards fall away
    dict(f="crystal_flare", at=2.3, gain=-4, pan=-0.35),
    dict(f="crystal_shatter", at=2.42, start=1.12, gain=1, pan=-0.35),
    dict(f="chime_whoosh", at=2.95, gain=-5, pan=(-0.35, 0.0)),
    # cut to the deck (4.04): it heaves, Cade (left) skids, Kit (right) whirrs, Cade thrown (5.5)
    dict(f="deck_creak", at=4.04, gain=-3, pan=0.25),
    dict(f="boots_skid", at=4.3, gain=-4, pan=-0.35),
    dict(f="armour_clank", at=4.6, gain=-5, pan=-0.35),
    dict(f="droid_servo", at=4.55, gain=-7, pan=0.5),
    dict(f="cloth_whoosh", at=5.2, gain=-2, pan=(0.7, -0.7)),
    # low angle (6.125): the galleon dissolves, bursts into fog (7.5), Jumble streaks off right
    dict(f="galleon_dissolve", at=6.2, gain=-5, pan=0.35, echo=True),
    dict(f="fog_phoom", at=6.4, gain=-1, pan=0.3, echo=True),
    dict(f="comet_whoosh", at=7.6, gain=-2, pan=(0.0, 0.9)),
    # the fall (8.5): wind roar, the rope whips in from the right (9.55), Wren grabs it (10.4)
    dict(f="freefall_roar", at=8.5, gain=-1, keep_width=True, fade=0.25),
    dict(f="rope_crack", at=9.0, gain=-3, pan=(0.6, 0.0)),
    dict(f="rope_grab", at=10.35, gain=-3, pan=-0.1),
    dict(f="droid_servo", at=11.0, gain=-9, pan=0.6),
    # Cade through the clouds (12.04), the island rushing up
    dict(f="rising_whoosh", at=11.3, gain=-3, keep_width=True),
    dict(f="rising_whoosh", at=12.9, gain=-4, keep_width=True, fade=0.3, end=1.15),
    # hard cut to the jungle (14.04): leaves (15.3), the flower and vines, out of the bush (16.5)
    dict(path="public/assets/audio/ambience/amb_jungle.mp3", at=14.04, end=2.95, gain=-8, keep_width=True, fadein=0.05, fade=0.08),
    dict(f="canopy_crash", at=14.5, gain=-1, pan=0.05),
    dict(f="branch_snaps", at=14.9, gain=-1, pan=0.25),
    dict(f="vine_boing", at=16.15, gain=-6, pan=0.0),
    dict(f="branch_snaps", at=15.75, gain=-3, pan=0.3),
    # the beach (16.92): thud and skid, the sand settles, surf and gulls to the end
    dict(f="sand_skid", at=16.9, gain=0, pan=(-0.5, 0.0)),
    dict(f="sand_settle", at=17.5, gain=2, pan=0.0),
    dict(f="surf_gulls", at=16.92, gain=-7, keep_width=True, fadein=1.2),
    # the thumbs-up (19.6)
    dict(f="comic_ting", at=19.58, gain=-5, pan=0.3, duck=False),
]

VOICE = [
    dict(f="01_cade_the_crystal", at=3.0, gain=0, pan=-0.2),
    dict(f="02_cade_whoaaaa", at=5.2, gain=-1, pan=(0.3, -0.4)),
    dict(f="03_jumble_good_luck_teaching_it_in_pieces", at=6.15, gain=0, pan=0.3, echo=True),
    dict(f="04_jumble_laugh", at=8.5, start=1.95, gain=-7, pan=(0.55, 0.95), echo=True, fade=0.6),
    dict(f="05_wren_hang_on_albatross", at=8.55, gain=0, pan=0.0),
    dict(f="07_cade_aaaah_oof_ow_ow", at=14.0, gain=-1, pan=(0.0, 0.25)),
]


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def loud(x):
    """A clip's level: the 95th-percentile 50 ms RMS (so short hits and beds compare)."""
    m = x.mean(axis=1)
    n = int(SR * 0.05)
    frames = m[: len(m) // n * n].reshape(-1, n)
    rms = np.sqrt((frames**2).mean(axis=1) + 1e-12)
    return np.percentile(rms, 95)


def echo(x):
    out = x.copy()
    for ms, db in ((90, -10), (170, -14), (260, -18), (380, -23)):
        d = int(SR * ms / 1000)
        out[d:] += x[:-d] * 10 ** (db / 20)
    return out


def place(mix, cue, path, normalize):
    x = load(path)
    s = int(cue.get("start", 0) * SR)
    e = int(cue["end"] * SR) if "end" in cue else len(x)
    x = x[s:e]
    if normalize:
        x = x * (10 ** (-20 / 20) / loud(x))
    x = x * 10 ** (cue.get("gain", 0) / 20)
    n = len(x)
    if cue.get("fadein"):
        k = min(n, int(cue["fadein"] * SR))
        x[:k] *= np.linspace(0, 1, k)[:, None]
    k = min(n, int(cue.get("fade", 0.02) * SR))
    x[n - k :] *= np.linspace(1, 0, k)[:, None]
    if cue.get("echo"):
        x = echo(x)
    if not cue.get("keep_width"):
        p = cue.get("pan", 0)
        p0, p1 = p if isinstance(p, tuple) else (p, p)
        pan = np.linspace(p0, p1, n)
        ang = (pan + 1) * np.pi / 4
        mono = x.mean(axis=1)
        # constant power, with a little of the clip's own width kept
        x = np.stack([mono * np.cos(ang) * np.sqrt(2), mono * np.sin(ang) * np.sqrt(2)], axis=1) * 0.8 + x * 0.2
    a = int(cue["at"] * SR)
    b = min(len(mix), a + n)
    mix[a:b] += x[: b - a]


def envelope(x, attack=0.03, release=0.35):
    m = np.abs(x).max(axis=1)
    out = np.zeros_like(m)
    ka, kr = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    v = 0.0
    for i in range(0, len(m), 64):  # control rate
        peak = m[i : i + 64].max()
        k = ka if peak > v else kr
        v = k ** 64 * v + (1 - k ** 64) * peak
        out[i : i + 64] = v
    return out


def main(out):
    n = int(LENGTH * SR)
    fx, fx_free, voice = np.zeros((n, 2)), np.zeros((n, 2)), np.zeros((n, 2))
    for c in SFX:
        place(fx if c.get("duck", True) else fx_free, c, c.get("path") or f"{STEMS}sfx/{c['f']}.mp3", True)
    for c in VOICE:
        place(voice, c, f"{STEMS}voice/{c['f']}.mp3", False)
    # effects dip up to 7 dB while someone talks
    env = envelope(voice)
    duck = 10 ** (-7 * np.clip(env / 0.12, 0, 1) / 20)
    mix = fx * duck[:, None] + fx_free + voice * 1.15
    k = int(0.8 * SR)  # out with the fade to white
    mix[-k:] *= np.linspace(1, 0, k)[:, None]
    raw = mix.astype(np.float32).tobytes()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "alimiter=limit=0.89:attack=2:release=60:level=disabled", "-c:a", "pcm_s16le", out],
        input=raw,
        check=True,
    )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "intro-mix.wav")
