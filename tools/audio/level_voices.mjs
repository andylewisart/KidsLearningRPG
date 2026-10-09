#!/usr/bin/env node
// Bring every recorded line to the same loudness, so no voice is much quieter
// than the others (the Spellwright's came out about 15 dB under the Knight's).
//
//   node tools/audio/level_voices.mjs            level every recorded line that's off target
//   node tools/audio/level_voices.mjs --check    report only
//
// Measures each line with ffmpeg's loudnorm, then evens it out: a gentle
// compressor on the loudest syllables, one gain to the target and a true-peak
// limiter, re-measured and nudged until it lands within half a LU. (loudnorm's
// own second pass can't do short clips: under about 3 seconds it fell back to
// its dynamic mode, and some of Knox's lines stayed 5 to 11 dB too quiet.)
// Lines already within 1 LU of the target are left alone, so it's quick to
// run again. generate.mjs calls levelVoice() on every line it records.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const audioDir = path.join(root, "public/assets/audio");

export const VOICE_LUFS = -18;
const PEAK = -1.5;
const LRA = 11;

const ffmpeg = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 24 });
export const hasFfmpeg = () => !ffmpeg(["-version"]).error;

/** The loudnorm measurement of a file: { input_i, input_tp, input_lra, input_thresh, target_offset }. */
function measure(file) {
  const r = ffmpeg(["-i", file, "-af", `loudnorm=I=${VOICE_LUFS}:TP=${PEAK}:LRA=${LRA}:print_format=json`, "-f", "null", "-"]);
  const text = r.stderr || "";
  const json = text.slice(text.lastIndexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** compress the loudest syllables a little, bring the line to the target, and catch the peaks */
const chain = (loudness, gain) =>
  `acompressor=threshold=${(loudness + 8).toFixed(1)}dB:ratio=3:attack=6:release=120:knee=6,volume=${gain.toFixed(2)}dB,alimiter=limit=${PEAK}dB:attack=2:release=40:level=disabled`;

/**
 * Level one recorded line in place. Returns { before, after } in LUFS, or null
 * when it was already on target (or ffmpeg isn't there).
 */
export function levelVoice(file, { check = false } = {}) {
  const m = measure(file);
  if (!m) return null;
  const before = Number(m.input_i);
  if (!Number.isFinite(before) || Math.abs(before - VOICE_LUFS) <= 1) return null;
  if (check) return { before, after: null };
  const tmp = path.join(os.tmpdir(), `level-${process.pid}-${path.basename(file)}`);
  let gain = VOICE_LUFS - before;
  let after = before;
  // the compressor and limiter take a little loudness back, so nudge the gain and go again
  for (let pass = 0; pass < 4; pass++) {
    const r = ffmpeg(["-y", "-i", file, "-af", chain(before, gain), "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", tmp]);
    if (r.status !== 0 || !fs.existsSync(tmp)) return null;
    after = Number(measure(tmp)?.input_i);
    if (!Number.isFinite(after)) return null;
    if (Math.abs(after - VOICE_LUFS) <= 0.5) break;
    gain += VOICE_LUFS - after;
  }
  fs.copyFileSync(tmp, file);
  fs.rmSync(tmp, { force: true });
  return { before, after };
}

function main() {
  if (!hasFfmpeg()) {
    console.error("ffmpeg isn't installed, so nothing was leveled.");
    process.exit(1);
  }
  const check = process.argv.includes("--check");
  const manifest = JSON.parse(fs.readFileSync(path.join(audioDir, "manifest.json"), "utf8"));
  const files = [...new Set(Object.values(manifest.lines || {}).flatMap((m) => Object.values(m)))];
  let changed = 0;
  const bySpeaker = {};
  for (const rel of files) {
    const r = levelVoice(path.join(audioDir, rel), { check });
    if (!r) continue;
    changed += 1;
    const who = path.basename(rel).replace(/_[0-9a-f]+\.mp3$/, "");
    (bySpeaker[who] ||= []).push(r.before);
    console.log(`${check ? "would level" : "leveled"} ${rel}: ${r.before.toFixed(1)} → ${r.after == null ? VOICE_LUFS : r.after.toFixed(1)} LUFS`);
  }
  for (const [who, list] of Object.entries(bySpeaker)) {
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    console.log(`  ${who}: ${list.length} lines, averaging ${avg.toFixed(1)} LUFS before`);
  }
  console.log(`${changed} of ${files.length} lines ${check ? "are off target" : "leveled"} (target ${VOICE_LUFS} LUFS).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
