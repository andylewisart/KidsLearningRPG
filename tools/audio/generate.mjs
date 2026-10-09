#!/usr/bin/env node
// Make the game's sounds, music, ambience and recorded lines with ElevenLabs.
//
//   ELEVENLABS_API_KEY=… node tools/audio/generate.mjs [flags]
//     --dry-run              list what would be made (and total seconds / characters)
//     --only sfx,music       only these kinds: sfx, music, ambience, voice
//     --ids sfx_hit,kit      only these sound ids, line ids or speakers (kit, knight, …)
//     --force                remake files that already exist
//
// Files go to public/assets/audio/, and public/assets/audio/manifest.json is
// updated after every file, so a run that stops halfway keeps what it made.
// Recorded lines are leveled to one loudness with ffmpeg (level_voices.mjs).
// In a cloud session, run with NODE_USE_ENV_PROXY=1 (Node's fetch ignores HTTPS_PROXY).
// The sound list is tools/audio/sounds.json; voices are under "voices" there.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateSoundList, planJobs, mergeManifest, soundFiles, lineFile, normalizeGain, TARGET_LUFS } from "./lib.mjs";
import { allLines } from "./lines.mjs";
import { levelVoice, hasFfmpeg } from "./level_voices.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "public/assets/audio");
const manifestPath = path.join(outDir, "manifest.json");
const API = "https://api.elevenlabs.io";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1]?.split(",").map((s) => s.trim()).filter(Boolean) : null;
};
const gainCache = new Map(); // file -> gain, so each file is measured once per run
const remade = new Set(); // files made this run (their loudness is measured afresh)
const dryRun = flag("dry-run");
const force = flag("force");
const only = opt("only");
const ids = opt("ids");

const list = JSON.parse(fs.readFileSync(path.join(root, "tools/audio/sounds.json"), "utf8"));
const problems = validateSoundList(list);
if (problems.length) {
  console.error("sounds.json has problems:\n  " + problems.join("\n  "));
  process.exit(1);
}
const voices = list.voices || {};
const lines = allLines();
for (const l of lines) if (!voices[l.who]) console.warn(`! no voice set for "${l.who}" in sounds.json; its lines will be skipped`);

const jobs = planJobs(list, lines.filter((l) => voices[l.who]), { only, ids });
const exists = (file) => fs.existsSync(path.join(outDir, file));
const todo = jobs.filter((j) => force || !exists(j.file));

const secs = todo.filter((j) => j.kind !== "voice").reduce((n, j) => n + j.seconds, 0);
const chars = todo.filter((j) => j.kind === "voice").reduce((n, j) => n + j.chars, 0);
console.log(`${jobs.length} files planned, ${jobs.length - todo.length} already made, ${todo.length} to make: ${secs.toFixed(1)} s of sound and music, ${chars} characters of speech.`);

if (dryRun) {
  for (const j of todo) console.log(`  [${j.kind}] ${j.file}  ${j.kind === "voice" ? `${j.chars} chars  "${j.text}"` : `${j.seconds}s  ${j.sound.prompt}`}`);
  writeManifest(); // refresh entries for files already on disk
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY isn't set. Nothing generated.");
  process.exit(1);
}

// ------------------------------------------------------------------ requests

class Fatal extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(urlPath, body) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(API + urlPath, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt >= 5) throw new Error(`network: ${err.message}`);
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return { bytes: Buffer.from(await res.arrayBuffer()), cost: Number(res.headers.get("character-cost")) || 0 };
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail?.message || j.detail?.status || JSON.stringify(j.detail ?? j);
    } catch {
      /* not JSON */
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2000 * 2 ** attempt;
      console.warn(`  … ${res.status} (${detail.slice(0, 120)}); retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (/quota|credits|insufficient/i.test(text)) throw new Fatal(`out of credits: ${detail}`);
    if (res.status === 401) throw new Fatal(`key refused: ${detail}`);
    throw new Error(`${res.status}: ${detail}`.slice(0, 400));
  }
}

function request(j) {
  if (j.kind === "voice") {
    const v = voices[j.who];
    return call(`/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, {
      text: j.text,
      model_id: v.model || "eleven_multilingual_v2",
      ...(v.settings ? { voice_settings: v.settings } : {}),
    });
  }
  const s = j.sound;
  if (s.kind === "music" && s.plan) {
    // a composition plan: sections, instruments and sounds to avoid (no lyrics)
    return call(`/v1/music?output_format=mp3_44100_128`, { composition_plan: s.plan, model_id: "music_v1" });
  }
  if (s.kind === "music") {
    return call(`/v1/music?output_format=mp3_44100_128`, {
      prompt: s.prompt,
      music_length_ms: Math.round(s.seconds * 1000),
      force_instrumental: true,
      model_id: "music_v1",
    });
  }
  return call(`/v1/sound-generation?output_format=mp3_44100_128`, {
    text: s.prompt,
    duration_seconds: s.seconds,
    prompt_influence: s.promptInfluence ?? list.defaults?.promptInfluence ?? 0.3,
    ...(s.loop ? { loop: true } : {}),
    model_id: "eleven_text_to_sound_v2",
  });
}

// ------------------------------------------------------------------ manifest

/** Loudness (LUFS) and true peak (dBFS) of a file, via ffmpeg if it's installed. */
function measure(file) {
  const r = spawnSync("ffmpeg", ["-nostats", "-i", path.join(outDir, file), "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  return r.error ? null : parseLoudness(r.stderr || "");
}
function parseLoudness(out) {
  const summary = out.slice(out.lastIndexOf("Summary:"));
  const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  return Number.isFinite(lufs) ? { lufs, peak } : null;
}
function gainFor(file, kind, previous) {
  if (gainCache.has(file)) return gainCache.get(file);
  const m = previous ?? (() => {
    const l = measure(file);
    return l ? normalizeGain(l.lufs, l.peak, TARGET_LUFS[kind]) : 1;
  })();
  gainCache.set(file, m);
  return m;
}

/** Rebuild every entry from what's on disk, keeping anything else already in the manifest. */
function writeManifest() {
  const base = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const vol = list.defaults?.volume || {};
  const sounds = {};
  for (const s of list.sounds) {
    const files = soundFiles(s).filter(exists);
    if (!files.length) continue;
    const old = base.sounds?.[s.id];
    const gains = files.map((f) => {
      const i = old?.files?.indexOf(f) ?? -1;
      return gainFor(f, s.kind, i >= 0 && old.gains?.[i] != null && !remade.has(f) ? old.gains[i] : null);
    });
    sounds[s.id] = { kind: s.kind, files, gains, loop: Boolean(s.loop), volume: s.volume ?? vol[s.kind] ?? 1, ...(s.cues ? { cues: s.cues } : {}) };
  }
  const voiceInfo = {};
  for (const [who, v] of Object.entries(voices)) voiceInfo[who] = { id: v.id, name: v.name, model: v.model, why: v.why };
  const recorded = {};
  for (const l of lines) {
    const file = lineFile(l.who, l.text);
    if (exists(file)) (recorded[l.who] ||= {})[l.text] = file;
  }
  // Lines are rebuilt from scratch, so lines that were rewritten or removed drop out.
  const merged = mergeManifest({ ...base, lines: {} }, { sounds, voices: voiceInfo, lines: recorded });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 1) + "\n");
}

// ------------------------------------------------------------------ run

const canLevel = hasFfmpeg();
if (!canLevel) console.warn("! ffmpeg isn't installed: new lines won't be leveled (run tools/audio/level_voices.mjs later)");
let spent = 0;
let made = 0;
const failed = [];
let stop = null;
const started = Date.now();

async function worker(queue) {
  while (queue.length && !stop) {
    const j = queue.shift();
    try {
      const { bytes, cost } = await request(j);
      if (bytes.length < 1000) throw new Error(`suspiciously small file (${bytes.length} bytes)`);
      const dest = path.join(outDir, j.file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, bytes);
      // every voice at the same loudness (level_voices.mjs), so none is much quieter than the rest
      if (j.kind === "voice" && canLevel) levelVoice(dest);
      remade.add(j.file);
      gainCache.delete(j.file);
      spent += cost;
      made += 1;
      writeManifest();
      console.log(`✓ ${j.file}  (${(bytes.length / 1024).toFixed(0)} KB${cost ? `, ${cost} credits` : ""})`);
    } catch (err) {
      if (err instanceof Fatal) {
        stop = err.message;
        failed.push({ file: j.file, error: err.message });
        console.error(`✗ ${j.file}: ${err.message}. Stopping.`);
      } else {
        failed.push({ file: j.file, error: err.message });
        console.error(`✗ ${j.file}: ${err.message}`);
      }
    }
  }
}

// Music is slow and heavy, so it runs one at a time; everything else three at once.
const music = todo.filter((j) => j.kind === "music");
const rest = todo.filter((j) => j.kind !== "music");
await Promise.all([worker(music), worker(rest), worker(rest), worker(rest)]);
writeManifest();

console.log(`\nMade ${made} of ${todo.length} files in ${Math.round((Date.now() - started) / 1000)} s. Credits reported: ${spent} (music doesn't report its cost).`);
if (failed.length) {
  console.log(`${failed.length} failed:`);
  for (const f of failed) console.log(`  ${f.file}: ${f.error}`);
}
if (stop) console.log(`Stopped early: ${stop}`);
process.exit(failed.length ? 1 : 0);
