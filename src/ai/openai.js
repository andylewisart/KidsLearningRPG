// OpenAI is the droid's mouth and ears: text-to-speech and speech-to-text.
// (Codex also uses OpenAI to paint the game's art, outside the game.)
// The words themselves always come from the game or from Claude.

import OpenAI from "openai";
import { VOICES } from "./prompts.js";
import { AIError } from "./claude.js";

export const SPEECH_MODEL = "gpt-4o-mini-tts";
export const LISTEN_MODEL = "gpt-4o-mini-transcribe";

let cached = { key: null, client: null };

function client(key) {
  if (!key) throw new AIError("no_key");
  if (cached.key !== key) cached = { key, client: new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 }) };
  return cached.client;
}

function wrap(err) {
  if (err instanceof AIError) return err;
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) return new AIError("bad_key", err.message);
  if (err instanceof OpenAI.RateLimitError) return new AIError("rate_limited", err.message);
  if (err instanceof OpenAI.APIConnectionError) return new AIError("network", err.message);
  return new AIError("default", err?.message);
}

/** Speak `text` in one of the game's voices. Returns MP3 bytes as a Blob. */
export async function speakOpenAI(key, text, style = "droid") {
  const v = VOICES[style] || VOICES.droid;
  try {
    const res = await client(key).audio.speech.create({
      model: SPEECH_MODEL,
      voice: v.voice,
      input: String(text).slice(0, 3800),
      instructions: v.instructions,
      response_format: "mp3",
    });
    return new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
  } catch (err) {
    throw wrap(err);
  }
}

/** Turn a push-to-talk recording into text. */
export async function transcribe(key, blob) {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const file = new File([blob], `speech.${ext}`, { type: blob.type || "audio/webm" });
  try {
    const res = await client(key).audio.transcriptions.create({
      file,
      model: LISTEN_MODEL,
      language: "en",
      prompt: "A kid talking to a robot tutor in a fantasy math and spelling game: Knight, Gunner, Spellwright, Titan Caller, Titan, subtract, regroup, times, divided by.",
    });
    return String(res.text || "").trim();
  } catch (err) {
    throw wrap(err);
  }
}

export async function checkOpenAIKey(key) {
  try {
    await client(key).models.list();
    return "ok";
  } catch (err) {
    const e = wrap(err);
    return e.code === "bad_key" || e.code === "no_key" ? "bad" : "unreachable";
  }
}
