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

/**
 * Whether a voice model performs audio tags like [warmly] (Eleven v3, v4 and
 * later). Older models such as eleven_multilingual_v2 would read the tag out loud.
 */
export function readsTags(model) {
  const v = /^eleven_v(\d+)(?:_|$)/.exec(String(model || ""));
  return Boolean(v) && Number(v[1]) >= 3;
}

/**
 * The text sent to the voice: the line's direction (its audio tags, from
 * tools/audio/direction.json) in front, when the model performs tags. Only
 * the synthesis text changes. The file name and the manifest key still come
 * from the line's real text, which is what the game shows and looks up.
 */
export function directedText(text, tags, model) {
  const t = String(tags || "").trim();
  return t && readsTags(model) ? `${t} ${text}` : text;
}

/** One or two audio tags, like "[warmly]" or "[relieved] [laughs]", and nothing else. */
const TAGS = /^\[[^[\]]+\]( \[[^[\]]+\])?$/;

/**
 * Problems with tools/audio/direction.json, as readable strings (empty when it's
 * fine). Every tag must point at a real line of its speaker and be one or two
 * bracketed tags. Every line of a speaker whose voice model performs tags must
 * have one, since without it the line falls flat.
 */
export function validateDirection(direction, lines, voices = {}) {
  const errors = [];
  const bySpeaker = {};
  for (const l of lines) (bySpeaker[l.who] ||= new Set()).add(l.text);
  for (const [who, map] of Object.entries(direction || {})) {
    if (who.startsWith("_")) continue; // notes, like "_about"
    if (!bySpeaker[who]) {
      errors.push(`${who}: no recorded lines for this speaker`);
      continue;
    }
    for (const [text, tags] of Object.entries(map || {})) {
      if (!bySpeaker[who].has(text)) errors.push(`${who}: no such line (rewritten or removed?): "${text}"`);
      if (typeof tags !== "string" || !TAGS.test(tags)) errors.push(`${who}: "${text}": the direction must be one or two [tags], not ${JSON.stringify(tags)}`);
    }
  }
  for (const [who, texts] of Object.entries(bySpeaker)) {
    if (!readsTags(voices[who]?.model)) continue;
    for (const text of texts) if (!direction?.[who]?.[text]) errors.push(`${who}: no tag yet for "${text}"`);
  }
  return errors;
}

/** Credits per character at list price: Flash and Turbo models cost half. Launch offers can be lower. */
export const creditsPerChar = (model) => (/flash|turbo/.test(String(model || "")) ? 0.5 : 1);

/**
 * What a line is recorded with, as kept per file in tools/audio/made.json:
 * the voice id, the model and the tags (only for a model that performs them).
 */
export function lineRecord(voice = {}, tags) {
  const model = voice.model || "eleven_multilingual_v2";
  return { voice: voice.id, model, tags: readsTags(model) ? String(tags || "").trim() : "" };
}

/**
 * Why a recorded line should be made again, or "" when it's up to date. Up to
 * date means made with the speaker's current voice and model, with the same
 * tags when that model performs them. While a speaker is still on a model
 * that doesn't perform tags, a take already performed with exactly the line's
 * current tags is kept too, so early tagged takes survive until the whole
 * voice moves over. A changed tag, voice or model is made again.
 */
export function staleReason(record, voice = {}, tags) {
  if (!record) return "no record";
  if (record.voice !== voice.id) return "voice changed";
  const want = String(tags || "").trim();
  const had = String(record.tags || "").trim();
  const now = lineRecord(voice, tags);
  if (want && had === want && readsTags(record.model) && !readsTags(now.model)) return "";
  if (record.model !== now.model) return "model changed";
  if (readsTags(now.model) && had !== now.tags) return "tags changed";
  return "";
}

const MADE_ABOUT =
  "What each recorded line was made with: its voice id, model and tags (tools/audio/generate.mjs keeps this). A run without --force makes a line again when its record no longer matches its speaker's voice and model in sounds.json, or its tags in direction.json.";

/** tools/audio/made.json as text: one recording per line, sorted, so changes read well in a diff. */
export function formatMade(made = {}) {
  const lines = made.lines || {};
  const body = Object.keys(lines)
    .sort()
    .map((file) => `    ${JSON.stringify(file)}: ${JSON.stringify(lines[file])}`)
    .join(",\n");
  return `{\n  "_about": ${JSON.stringify(made._about || MADE_ABOUT)},\n  "lines": {\n${body}\n  }\n}\n`;
}

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
    if (s.plan) {
      const total = (s.plan.sections || []).reduce((n, x) => n + (x.duration_ms || 0), 0) / 1000;
      if (s.kind !== "music") errors.push(`${at}: only music takes a plan`);
      if (!s.plan.sections?.length) errors.push(`${at}: a plan needs sections`);
      else if (Math.abs(total - sec) > 1) errors.push(`${at}: plan sections add up to ${total}s, not ${sec}s`);
    }
    if (s.cues != null && !(typeof s.cues === "object" && Object.values(s.cues).every((t) => Number.isFinite(t) && t >= 0 && t <= sec)))
      errors.push(`${at}: cues must be times (seconds) inside the track`);
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
