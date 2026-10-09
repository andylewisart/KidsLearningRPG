#!/usr/bin/env node
// Bring every recorded line to the same loudness, so no voice is much quieter
// than the others (the Spellwright's came out about 15 dB under the Knight's).
//
//   node tools/audio/level_voices.mjs            level every recorded line that's off target
//   node tools/audio/level_voices.mjs --check    report only
//
// Uses ffmpeg's two-pass loudnorm: measure, then one linear gain (or a gentle
// limiter when a big boost would clip), re-encoded at the generator's format.
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
  const filter = `loudnorm=I=${VOICE_LUFS}:TP=${PEAK}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const r = ffmpeg(["-y", "-i", file, "-af", filter, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", tmp]);
  if (r.status !== 0 || !fs.existsSync(tmp)) return null;
  fs.copyFileSync(tmp, file);
  fs.rmSync(tmp, { force: true });
  const after = Number(measure(file)?.input_i);
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
