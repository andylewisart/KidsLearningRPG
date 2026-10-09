// Pure helpers for the audio generator (tested in test/audio.test.js).

export const KINDS = ["sfx", "ambience", "music", "voice"];

/** A short, stable hash of a line's text (FNV-1a, 32-bit, 8 hex chars). */
export function lineHash(text) {
  let h = 0x811c9dc5;
  const s = String(text).normalize("NFC");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Where a recorded line lives, relative to public/assets/audio/. */
export const lineFile = (who, text) => `voice/${who}_${lineHash(text)}.mp3`;

/** Where each variant of a sound lives, relative to public/assets/audio/. */
export function soundFiles(s) {
  const dir = s.kind === "sfx" ? "sfx" : s.kind === "music" ? "music" : "ambience";
  const n = s.variants || 1;
  return n === 1 ? [`${dir}/${s.id}.mp3`] : Array.from({ length: n }, (_, i) => `${dir}/${s.id}_${i + 1}.mp3`);
}

/** Problems with the sound list, as readable strings (empty when it's fine). */
export function validateSoundList(list) {
  const errors = [];
  if (!list || !Array.isArray(list.sounds)) return ["sounds.json needs a \"sounds\" array"];
  const seen = new Set();
  const banned = /\b(final fantasy|pokemon|pokémon|zelda|mario|monkey island|star wars|marvel|disney|nintendo)\b/i;
  for (const s of list.sounds) {
    const at = s?.id || JSON.stringify(s);
    if (!s.id || !/^[a-z][a-z0-9_]*$/.test(s.id)) errors.push(`${at}: id must be lower_snake_case`);
    if (seen.has(s.id)) errors.push(`${at}: duplicate id`);
    seen.add(s.id);
    if (!["sfx", "ambience", "music"].includes(s.kind)) errors.push(`${at}: kind must be sfx, ambience or music`);
    if (!s.prompt || typeof s.prompt !== "string") errors.push(`${at}: missing prompt`);
    else if (banned.test(s.prompt)) errors.push(`${at}: prompt names a franchise`);
    const sec = Number(s.seconds);
    if (s.kind === "music") {
      if (!(sec >= 3 && sec <= 600)) errors.push(`${at}: music must be 3–600 seconds`);
    } else if (!(sec >= 0.5 && sec <= 30)) errors.push(`${at}: sound effects must be 0.5–30 seconds`);
    if (s.variants != null && !(Number.isInteger(s.variants) && s.variants >= 1 && s.variants <= 5)) errors.push(`${at}: variants must be 1–5`);
    if (s.volume != null && !(s.volume > 0 && s.volume <= 1)) errors.push(`${at}: volume must be between 0 and 1`);
  }
  return errors;
}

/**
 * Merge new entries into an audio manifest without losing anything else.
 * `add` has the same shape: { sounds?, voices?, lines?: { who: { text: file } } }.
 */
export function mergeManifest(base, add = {}) {
  const out = {
    version: 1,
    sounds: { ...(base?.sounds || {}) },
    voices: { ...(base?.voices || {}) },
    lines: {},
  };
  for (const [who, map] of Object.entries(base?.lines || {})) out.lines[who] = { ...map };
  Object.assign(out.sounds, add.sounds || {});
  Object.assign(out.voices, add.voices || {});
  for (const [who, map] of Object.entries(add.lines || {})) out.lines[who] = { ...(out.lines[who] || {}), ...map };
  return out;
}

/** Which jobs to run, in the order credits should be spent. */
export function planJobs(list, lines, { only = null, ids = null } = {}) {
  const jobs = [];
  for (const s of list.sounds) {
    const kind = s.kind;
    soundFiles(s).forEach((file, i) => jobs.push({ kind, id: s.id, file, variant: i, sound: s, priority: s.priority ?? 9, seconds: s.seconds }));
  }
  for (const l of lines) {
    // Kit's lines first, then the heroes' barks.
    jobs.push({ kind: "voice", id: `${l.who}_${lineHash(l.text)}`, who: l.who, text: l.text, file: lineFile(l.who, l.text), priority: l.who === "kit" ? 6 : 7, chars: l.text.length });
  }
  return jobs
    .filter((j) => !only || only.includes(j.kind))
    .filter((j) => !ids || ids.includes(j.id) || ids.includes(j.who) || ids.includes(j.file.split("/").pop().replace(/\.mp3$/, "")))
    .sort((a, b) => a.priority - b.priority);
}

/** Loudness targets (LUFS) per kind, so clips from different prompts sit together. */
export const TARGET_LUFS = { sfx: -16, ambience: -24, music: -16 };

/**
 * A linear gain that brings a clip to the target loudness without clipping:
 * at most +12 dB, at least -12 dB, and the peak stays under -1 dBFS.
 */
export function normalizeGain(lufs, peakDb, target) {
  if (!Number.isFinite(lufs) || lufs < -70) return 1;
  let db = Math.max(-12, Math.min(12, target - lufs));
  if (Number.isFinite(peakDb)) db = Math.min(db, -1 - peakDb);
  return Math.round(10 ** (db / 20) * 1000) / 1000;
}
