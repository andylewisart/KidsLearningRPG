// Voice in and out.
// Out: OpenAI text-to-speech when a key is set (cached per line), otherwise
//      the browser's built-in voice. Lines play one at a time, in order.
// In:  push-to-talk. Hold the button (or Space), talk, let go; OpenAI
//      turns it into text, and Claude answers in writing and out loud.

import { speakOpenAI, transcribe } from "./openai.js";
import { getSave, spendUsage } from "../store/save.js";

const cache = new Map(); // "style|text" -> object URL
let queue = Promise.resolve();
let generation = 0;
let playing = null;

export function stopSpeaking() {
  generation += 1;
  if (playing) playing.pause();
  playing = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

/** Say a line in one of the game's voices (droid, trailer, spelling, narrator). */
export function speak(text, style = "droid", { force = false } = {}) {
  const settings = getSave()?.settings;
  if (!text || !String(text).trim() || (!force && settings && !settings.voice)) return Promise.resolve();
  const gen = generation;
  queue = queue.then(() => (gen === generation ? playLine(String(text), style, gen) : null)).catch(() => {});
  return queue;
}

async function playLine(text, style, gen) {
  const key = getSave()?.settings.openaiKey;
  if (key) {
    const id = `${style}|${text}`;
    try {
      let url = cache.get(id);
      if (!url && spendUsage("speech", 400)) {
        url = URL.createObjectURL(await speakOpenAI(key, text, style));
        cache.set(id, url);
      }
      if (url) {
        if (gen === generation) await playUrl(url);
        return;
      }
    } catch {
      /* fall back to the browser voice below */
    }
  }
  if (gen === generation) await browserSpeak(text, style);
}

function playUrl(url) {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    playing = audio;
    audio.onended = audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function browserSpeak(text, style) {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = style === "spelling" ? 0.8 : style === "trailer" ? 0.85 : 1;
    u.pitch = style === "trailer" ? 0.5 : style === "droid" ? 0.85 : 1;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

/** Feed a streaming reply in; each finished sentence is spoken as soon as it's complete. */
export function sentenceSpeaker(style = "droid") {
  let buf = "";
  return {
    push(delta) {
      buf += delta;
      let m;
      while ((m = buf.match(/^([\s\S]*?[.!?])\s+/))) {
        if (m[1].trim().length > 1) speak(m[1].trim(), style);
        buf = buf.slice(m[0].length);
      }
    },
    done() {
      if (buf.trim()) speak(buf.trim(), style);
      buf = "";
    },
  };
}

// ---------------------------------------------------------------- listening

export const canListen = () =>
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

/** Start recording. Returns { stop(): Promise<Blob>, cancel() }. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());
  return {
    async stop() {
      const stopped = new Promise((resolve) => (rec.onstop = resolve));
      rec.stop();
      await stopped;
      release();
      return new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
    },
    cancel() {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      release();
    },
  };
}

/** Recording → text. Throws AIError on failure. */
export async function listen(blob) {
  const key = getSave().settings.openaiKey;
  if (!spendUsage("listen", 150)) throw Object.assign(new Error("limit"), { code: "limit" });
  return transcribe(key, blob);
}
