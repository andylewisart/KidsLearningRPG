// Voice in and out.
// Out: a pre-recorded line from the sound pack when the text matches exactly
//      (free and instant). Otherwise a live voice: ElevenLabs, OpenAI or the
//      browser, in the order settings.voiceProvider picks (providers.js), each
//      falling back to the next. Lines play one at a time, in order.
// In:  push-to-talk. Hold the button (or Space), talk, let go; ElevenLabs or
//      OpenAI turns it into text, and Claude answers in writing and out loud.

import { speakOpenAI, transcribe } from "./openai.js";
import { speakEleven, transcribeEleven } from "./elevenlabs.js";
import { providerOrder, listenOrder, elevenVoiceFor, recordedLine } from "./providers.js";
import { AIError } from "./claude.js";
import { audioManifest, audioUrl } from "../ui/audio.js";
import { getSave, spendUsage } from "../store/save.js";

const cache = new Map(); // "style|text" -> object URL
const loaded = new Map(); // recorded file -> object URL, fetched ahead (preloadLines)
let queue = Promise.resolve();
let generation = 0;
let playing = null;
let lineDone = null; // finishes the line that's playing now
let pending = 0; // lines queued or playing

/** Is the droid (or a trailer/spelling voice) talking, or about to? */
export const isSpeaking = () => pending > 0;

export function stopSpeaking() {
  generation += 1;
  if (playing) playing.pause();
  playing = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  // a paused line never fires "ended": finish it now, or the next line waits in the queue behind it
  lineDone?.();
}

/**
 * Fetch the recordings for lines that are about to be said (a conversation),
 * so each one starts the moment it's needed. [{ style, text }]
 */
export function preloadLines(lines) {
  const recorded = audioManifest().lines;
  for (const { style, text } of lines) {
    const file = recordedLine(recorded, style, text);
    if (!file || loaded.has(file)) continue;
    loaded.set(file, null);
    fetch(audioUrl(file))
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return loaded.delete(file);
        loaded.set(file, URL.createObjectURL(blob));
        // keep the last few dozen
        if (loaded.size > 60) {
          const [oldest, url] = loaded.entries().next().value;
          if (url) URL.revokeObjectURL(url);
          loaded.delete(oldest);
        }
      })
      .catch(() => loaded.delete(file));
  }
}

/** Say a line in one of the game's voices (droid, trailer, spelling, narrator). */
export function speak(text, style = "droid", { force = false } = {}) {
  const settings = getSave()?.settings;
  if (!text || !String(text).trim() || (!force && settings && !settings.voice)) return Promise.resolve();
  const gen = generation;
  pending += 1;
  queue = queue
    .then(() => (gen === generation ? playLine(String(text), style, gen) : null))
    .catch(() => {})
    .finally(() => (pending = Math.max(0, pending - 1)));
  return queue;
}

async function playLine(text, style, gen) {
  const recorded = recordedLine(audioManifest().lines, style, text);
  if (recorded) {
    if (gen === generation) await playUrl(loaded.get(recorded) || audioUrl(recorded));
    return;
  }
  const settings = getSave()?.settings || {};
  for (const provider of providerOrder(settings)) {
    if (gen !== generation) return;
    if (provider === "browser") return browserSpeak(text, style);
    try {
      const url = await liveLine(provider, settings, text, style);
      if (url) {
        if (gen === generation) await playUrl(url);
        return;
      }
    } catch {
      /* fall through to the next provider */
    }
  }
}

/** A live line from ElevenLabs or OpenAI, cached per provider, voice and text. */
async function liveLine(provider, settings, text, style) {
  const voice = provider === "elevenlabs" ? elevenVoiceFor(style, settings, audioManifest().voices) : null;
  const id = `${provider}|${voice?.id || style}|${text}`;
  let url = cache.get(id);
  if (url) return url;
  if (!spendUsage("speech", 400)) return null;
  const blob = provider === "elevenlabs" ? await speakEleven(settings.elevenKey, text, voice) : await speakOpenAI(settings.openaiKey, text, style);
  url = URL.createObjectURL(blob);
  cache.set(id, url);
  return url;
}

// Every line resolves eventually, even if the "ended" event never comes
// (it sometimes doesn't), so one stuck line can't silence the rest of the session.
function settleWithin(ms, start) {
  return new Promise((resolve) => {
    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    start(finish);
  });
}

/** A voice line: stopSpeaking() can finish it early. */
function settleLine(ms, start) {
  return settleWithin(ms, (done) => {
    const finish = () => {
      if (lineDone === finish) lineDone = null;
      done();
    };
    lineDone = finish;
    start(finish);
  });
}

function playUrl(url) {
  return settleLine(30_000, (done) => {
    const audio = new Audio(url);
    playing = audio;
    audio.onended = audio.onerror = done;
    audio.play().catch(done);
  });
}

function browserSpeak(text, style) {
  if (typeof speechSynthesis === "undefined") return Promise.resolve();
  return settleLine(Math.max(4000, text.length * 120), (done) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = style === "spelling" ? 0.8 : style === "trailer" ? 0.85 : 1;
    u.pitch = style === "trailer" ? 0.5 : style === "droid" ? 0.85 : 1;
    u.onend = u.onerror = done;
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

/** Can push-to-talk turn speech into text (an ElevenLabs or OpenAI key is set)? */
export const canTranscribe = () => listenOrder(getSave()?.settings).length > 0;

/** Recording → text, trying ElevenLabs and OpenAI in order. Throws AIError on failure. */
export async function listen(blob) {
  const settings = getSave().settings;
  const order = listenOrder(settings);
  if (!order.length) throw new AIError("no_key");
  if (!spendUsage("listen", 150)) throw Object.assign(new Error("limit"), { code: "limit" });
  let lastErr = null;
  for (const provider of order) {
    try {
      return provider === "elevenlabs" ? await transcribeEleven(settings.elevenKey, blob) : await transcribe(settings.openaiKey, blob);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------- hero barks

let barkAudio = null;
let barkDone = null;

/**
 * Play a hero's pre-recorded bark (heroes have no live voice). Resolves when
 * it ends; resolves at once if there's no recording.
 */
export function playBark(who, text) {
  const file = recordedLine(audioManifest().lines, who, text);
  if (!file) return Promise.resolve(false);
  stopBark();
  return settleWithin(12_000, (done) => {
    const audio = new Audio(audioUrl(file));
    barkAudio = audio;
    barkDone = done;
    audio.onended = audio.onerror = done;
    audio.play().catch(done);
  }).then(() => true);
}

export function stopBark() {
  if (barkAudio) barkAudio.pause();
  barkAudio = null;
  barkDone?.();
  barkDone = null;
}
