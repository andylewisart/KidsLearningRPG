// ElevenLabs: voices for live lines, and push-to-talk listening, straight
// from the browser. If the browser can't reach it (or the key can't do
// something), voice.js falls back to OpenAI or the browser's own voice.

import { AIError } from "./claude.js";

const API = "https://api.elevenlabs.io";

async function call(key, path, init = {}) {
  if (!key) throw new AIError("no_key");
  let res;
  try {
    res = await fetch(API + path, { ...init, headers: { "xi-api-key": key, ...(init.headers || {}) } });
  } catch (err) {
    throw new AIError("network", err?.message); // includes the browser blocking the request (CORS)
  }
  if (res.ok) return res;
  let detail = {};
  try {
    detail = (await res.json())?.detail || {};
  } catch {
    /* not JSON */
  }
  const msg = typeof detail === "string" ? detail : detail.message || `${res.status}`;
  if (detail.status === "missing_permissions") throw new AIError("missing_permissions", msg);
  if (res.status === 401 || res.status === 403) throw new AIError(/quota|credit/i.test(msg) ? "rate_limited" : "bad_key", msg);
  if (res.status === 429) throw new AIError("rate_limited", msg);
  throw new AIError("default", msg);
}

/** Speak `text` with an ElevenLabs voice. Returns MP3 bytes as a Blob. */
export async function speakEleven(key, text, { id, model = "eleven_flash_v2_5" }) {
  const res = await call(key, `/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: String(text).slice(0, 2500), model_id: model }),
  });
  return new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
}

/** Turn a push-to-talk recording into text (Scribe). */
export async function transcribeEleven(key, blob) {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "en");
  form.append("file", new File([blob], `speech.${ext}`, { type: blob.type || "audio/webm" }));
  const res = await call(key, "/v1/speech-to-text", { method: "POST", body: form });
  const data = await res.json();
  return String(data.text || "").trim();
}

/**
 * "Save & check": ok | bad | unreachable. A key that works but isn't allowed
 * to read the account (a restricted key) still counts as ok.
 */
export async function checkElevenKey(key) {
  try {
    await call(key, "/v1/user");
    return "ok";
  } catch (err) {
    if (err.code === "missing_permissions") return "ok";
    return err.code === "bad_key" || err.code === "no_key" ? "bad" : "unreachable";
  }
}

/** The voices in the grown-up's library: [{ id, name, about, preview }]. Throws if the key can't list them. */
export async function listElevenVoices(key) {
  const res = await call(key, "/v1/voices");
  const data = await res.json();
  return (data.voices || []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    about: [v.labels?.description, v.labels?.accent, v.labels?.age].filter(Boolean).join(", "),
    preview: v.preview_url || null,
  }));
}
