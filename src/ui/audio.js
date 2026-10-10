// The game's sound: sampled sound effects, music and ambience from the
// ElevenLabs sound pack (public/assets/audio/, made by tools/audio/generate.mjs),
// with the old Web Audio synth sounds as the fallback for anything missing.
//
//   sfx.<name>()      a random sampled variant of sfx_<name>, else the synth sound
//   sfx.play(id)      any sampled sound effect by id; returns false if it isn't loaded
//   music.play(id)    loop a track (crossfades in, and over its own loop point)
//   music.sting(id)   play a one-shot over the ducked loop (victory, defeat, summon)
//   ambience.play(id) a quiet background loop under the music

import { getSave } from "../store/save.js";

let ctx = null;
let out = null; // everything → out → speakers
let sfxBus = null; // sampled and synth sound effects
let musicBus = null; // music loops and stings
let ambBus = null; // ambience
let duckGain = null; // music loop and ambience pass through this, so stings can duck them
let loopBus = null; // the music loop's level, in front of duckGain
let master = null; // the synth's own level, into sfxBus
let songBus = null; // a song heard in the world (Maren singing), with its own level
let songFilter = null; // ...and a low-pass, so it can sound far away

const settings = () => getSave()?.settings || {};
const on = () => settings().sound !== false;
const vol = (field, dflt) => {
  const v = Number(settings()[field]);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : dflt;
};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(out);
    duckGain = ctx.createGain();
    duckGain.connect(out);
    musicBus = ctx.createGain();
    musicBus.connect(out);
    loopBus = ctx.createGain();
    loopBus.connect(duckGain);
    ambBus = ctx.createGain();
    ambBus.connect(duckGain);
    songFilter = ctx.createBiquadFilter();
    songFilter.type = "lowpass";
    songFilter.frequency.value = 18000;
    songFilter.connect(duckGain);
    songBus = ctx.createGain();
    songBus.gain.value = 0;
    songBus.connect(songFilter);
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(sfxBus);
    applyVolumes();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// ------------------------------------------------------------------ the sound pack

let manifest = { sounds: {}, voices: {}, lines: {} };
const buffers = new Map(); // sound id -> [AudioBuffer]
let decoding = null;
const lastVariant = new Map();
const AUDIO_BASE = "assets/audio/";

/** Load public/assets/audio/manifest.json (no decoding yet; that waits for a click). */
export async function loadAudioManifest() {
  try {
    const res = await fetch(`${AUDIO_BASE}manifest.json`, { cache: "no-cache" });
    if (res.ok) manifest = { sounds: {}, voices: {}, lines: {}, ...(await res.json()) };
  } catch {
    /* no sound pack: synth sounds and live voices only */
  }
  return manifest;
}
export const audioManifest = () => manifest;
export const audioUrl = (file) => AUDIO_BASE + file;

/** Decode every sound effect (small files) so they play instantly. */
function decodeAll() {
  if (decoding || !ctx) return decoding;
  const jobs = [];
  for (const [id, s] of Object.entries(manifest.sounds || {})) {
    if (s.kind !== "sfx") continue;
    s.files.forEach((file, i) => {
      jobs.push(
        fetch(audioUrl(file), { priority: "low" })
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${file}`))))
          .then((data) => ctx.decodeAudioData(data))
          .then((buf) => {
            buf.gain = s.gains?.[i] ?? 1;
            const list = buffers.get(id) || [];
            list.push(buf);
            buffers.set(id, list);
          })
          .catch(() => {}),
      );
    });
  }
  decoding = Promise.all(jobs);
  return decoding;
}

function playBuffer(id, { volume = 1, rate = 1 } = {}) {
  const list = buffers.get(id);
  if (!list?.length || !ac()) return false;
  // a random variant, never the same one twice in a row
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastVariant.get(id)) i = (i + 1) % list.length;
  lastVariant.set(id, i);
  const buf = list[i];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = (manifest.sounds[id]?.volume ?? 1) * (buf.gain ?? 1) * volume;
  src.connect(g).connect(sfxBus);
  src.start();
  if (typeof window !== "undefined" && window.__audioLog) window.__audioLog.push(id); // playtests: what played
  return true;
}

// ------------------------------------------------------------------ synth fallback

function tone({ freq = 440, to = null, type = "sine", dur = 0.15, vol = 0.5, delay = 0, attack = 0.005 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.4, freq = 1200, q = 0.8, to = null, delay = 0, type = "bandpass" }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const notes = (list, { type = "triangle", step = 0.1, dur = 0.18, vol = 0.35 } = {}) =>
  list.forEach((f, i) => f && tone({ freq: f, type, dur, vol, delay: i * step }));

const SYNTH = {
  select: () => tone({ freq: 880, type: "square", dur: 0.05, vol: 0.12 }),
  back: () => tone({ freq: 440, to: 330, type: "square", dur: 0.07, vol: 0.12 }),
  key: () => tone({ freq: 1200, type: "square", dur: 0.025, vol: 0.06 }),
  right: () => notes([660, 990], { type: "triangle", step: 0.07, dur: 0.12, vol: 0.3 }),
  wrong: () => (tone({ freq: 220, to: 150, type: "sawtooth", dur: 0.22, vol: 0.18 }), noise({ dur: 0.15, vol: 0.12, freq: 400 })),
  slash: () => (noise({ dur: 0.18, vol: 0.5, freq: 3000, to: 600, q: 0.6 }), tone({ freq: 140, to: 60, type: "sine", dur: 0.18, vol: 0.5, delay: 0.05 })),
  shot: () => [0, 0.07, 0.14].forEach((d) => noise({ dur: 0.08, vol: 0.4, freq: 2400, to: 900, delay: d })),
  spell: () => (notes([523, 659, 784, 1046], { type: "sine", step: 0.05, dur: 0.25, vol: 0.22 }), noise({ dur: 0.4, vol: 0.15, freq: 5000, q: 3, delay: 0.1 })),
  hit: () => (tone({ freq: 160, to: 50, type: "sine", dur: 0.2, vol: 0.6 }), noise({ dur: 0.12, vol: 0.35, freq: 900 })),
  crit: () => (tone({ freq: 200, to: 40, type: "square", dur: 0.3, vol: 0.4 }), noise({ dur: 0.3, vol: 0.5, freq: 1500, to: 300 }), tone({ freq: 1568, type: "triangle", dur: 0.25, vol: 0.2, delay: 0.05 })),
  hurt: () => (tone({ freq: 300, to: 120, type: "sawtooth", dur: 0.2, vol: 0.2 }), noise({ dur: 0.15, vol: 0.3, freq: 700 })),
  miss: () => noise({ dur: 0.3, vol: 0.3, freq: 500, to: 2500, q: 1.5 }),
  heal: () => notes([523, 659, 784, 1046, 1318], { type: "sine", step: 0.06, dur: 0.3, vol: 0.2 }),
  guard: () => (tone({ freq: 660, to: 520, type: "triangle", dur: 0.2, vol: 0.25 }), noise({ dur: 0.12, vol: 0.2, freq: 3000 })),
  swap: () => noise({ dur: 0.25, vol: 0.25, freq: 800, to: 3000, q: 1.2 }),
  ko: () => (notes([880, 740, 587, 440, 330], { type: "triangle", step: 0.06, dur: 0.18, vol: 0.18 }), noise({ dur: 0.6, vol: 0.15, freq: 4000, q: 4 })),
  capture: () => (notes([392, 523, 659, 784, 1046, 1568], { type: "square", step: 0.07, dur: 0.16, vol: 0.12 }), noise({ dur: 0.5, vol: 0.2, freq: 6000, q: 6, delay: 0.3 })),
  bar: () => (tone({ freq: 90, to: 40, type: "square", dur: 0.5, vol: 0.45 }), noise({ dur: 0.5, vol: 0.4, freq: 600, to: 120 })),
  overdrive: () => notes([392, 494, 587, 784, 988], { type: "sawtooth", step: 0.05, dur: 0.14, vol: 0.14 }),
  summon: () => (
    tone({ freq: 55, to: 110, type: "sawtooth", dur: 1.6, vol: 0.35, attack: 0.4 }),
    noise({ dur: 1.6, vol: 0.25, freq: 200, to: 2000, q: 0.7 }),
    notes([0, 0, 0, 0, 0, 0, 0, 0, 262, 330, 392, 523], { type: "triangle", step: 0.12, dur: 0.4, vol: 0.25 })
  ),
  quake: () => (tone({ freq: 50, to: 30, type: "sawtooth", dur: 0.8, vol: 0.5 }), noise({ dur: 0.8, vol: 0.5, freq: 200 })),
  victory: () => notes([523, 523, 523, 523, 0, 415, 0, 466, 0, 523, 0, 466, 523], { type: "square", step: 0.11, dur: 0.16, vol: 0.14 }),
  defeat: () => notes([392, 370, 349, 330, 262], { type: "triangle", step: 0.22, dur: 0.4, vol: 0.2 }),
};

export const sfx = {
  /** Play a sampled sound effect by id. Returns false (and plays nothing) if it isn't loaded. */
  play(id, opts) {
    if (!on()) return true; // sound is off: count it as handled, so no fallback plays either
    return playBuffer(id, opts);
  },
};
for (const name of Object.keys(SYNTH)) {
  sfx[name] = () => {
    if (!on()) return;
    if (!playBuffer(`sfx_${name}`)) SYNTH[name]();
  };
}
// The victory and defeat jingles are music stings when the pack has them.
sfx.victory = () => on() && (music.sting("music_victory") || SYNTH.victory());
sfx.defeat = () => on() && (music.sting("music_defeat") || SYNTH.defeat());

// ------------------------------------------------------------------ music and ambience

const LOOP_FADE = 3; // seconds of crossfade over a loop point
const FADE = 1.2; // seconds to fade between tracks

// Tracks fetched ahead of time, so they start the moment audio is allowed
// (browsers wait for his first click or key; the title music used to start
// downloading only then, behind every sound effect).
const preloaded = new Map(); // file -> <audio> already loading

/** Start downloading a track now (its first file), before anything can play. */
export function preloadMusic(id) {
  const file = manifest.sounds?.[id]?.files?.[0];
  if (!file || preloaded.has(file) || typeof Audio === "undefined") return;
  const el = new Audio(audioUrl(file));
  el.crossOrigin = "anonymous";
  el.preload = "auto";
  el.load();
  preloaded.set(file, el);
}

/** One playing copy of a streamed track (an <audio> element through a gain node). */
function startCopy(id, bus, { fadeIn = FADE, loop = false } = {}) {
  const info = manifest.sounds?.[id];
  if (!info?.files?.length || !ac()) return null;
  const file = info.files[Math.floor(Math.random() * info.files.length)];
  const el = preloaded.get(file) || new Audio(audioUrl(file));
  preloaded.delete(file); // an element feeds the audio graph only once; later loops reload from the cache
  el.crossOrigin = "anonymous";
  el.preload = "auto";
  const node = ctx.createMediaElementSource(el);
  const g = ctx.createGain();
  const level = (info.volume ?? 1) * (info.gains?.[info.files.indexOf(file)] ?? 1);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(level, t + Math.max(0.02, fadeIn));
  node.connect(g).connect(bus);
  const copy = { id, el, g, level, loop, handedOff: false, done: false };
  el.play().catch(() => {});
  return copy;
}

function fadeOutCopy(copy, secs = FADE) {
  if (!copy || copy.done) return;
  copy.done = true;
  const t = ctx.currentTime;
  copy.g.gain.cancelScheduledValues(t);
  copy.g.gain.setValueAtTime(copy.g.gain.value, t);
  copy.g.gain.linearRampToValueAtTime(0.0001, t + secs);
  setTimeout(() => {
    copy.el.pause();
    copy.el.removeAttribute("src");
    copy.el.load();
  }, secs * 1000 + 100);
}

/** A channel that keeps one track looping, crossfading over its own end. */
function channel(getBus) {
  let current = null;
  let wanted = null; // what should be playing (remembered until audio is unlocked)
  let timer = null;

  function tick() {
    if (!current || current.done) return;
    const { el } = current;
    if (!el.duration || !Number.isFinite(el.duration)) return;
    if (!current.handedOff && el.currentTime >= el.duration - LOOP_FADE) {
      current.handedOff = true;
      const old = current;
      current = startCopy(old.id, getBus(), { fadeIn: LOOP_FADE, loop: true });
      fadeOutCopy(old, LOOP_FADE);
    }
  }

  return {
    play(id) {
      wanted = id;
      if (!ctx || ctx.state !== "running" || !manifest.sounds?.[id]) return Boolean(manifest.sounds?.[id]);
      if (current && current.id === id && !current.done) return true;
      fadeOutCopy(current);
      current = startCopy(id, getBus(), { loop: true });
      clearInterval(timer);
      timer = setInterval(tick, 200);
      return Boolean(current);
    },
    stop(secs = FADE) {
      wanted = null;
      if (current) fadeOutCopy(current, secs);
      current = null;
      clearInterval(timer);
    },
    resume() {
      if (wanted && (!current || current.done)) this.play(wanted);
    },
    get id() {
      return current && !current.done ? current.id : null;
    },
  };
}

const loopChannel = channel(() => loopBus);
const ambChannel = channel(() => ambBus);
let stingCopy = null;
let unduckTimer = null;

function duck(on, secs = 0.6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  duckGain.gain.cancelScheduledValues(t);
  duckGain.gain.setValueAtTime(duckGain.gain.value, t);
  duckGain.gain.linearRampToValueAtTime(on ? 0.18 : 1, t + secs);
}

export const music = {
  /** Loop a music track (music_title, music_battle, music_boss). */
  play: (id) => loopChannel.play(id),
  /** Fade the music loop out. */
  stop: (secs) => loopChannel.stop(secs),
  /** A one-shot over the ducked loop. Returns false if the track isn't in the pack. */
  sting(id, { stopLoop = false } = {}) {
    const info = manifest.sounds?.[id];
    if (!info || !ac() || ctx.state !== "running") return false;
    if (stingCopy) fadeOutCopy(stingCopy, 0.4);
    if (stopLoop) loopChannel.stop(0.8);
    else duck(true);
    stingCopy = startCopy(id, musicBus, { fadeIn: 0.05 });
    if (!stingCopy) return false;
    const copy = stingCopy;
    clearTimeout(unduckTimer);
    copy.el.addEventListener("ended", () => {
      if (stingCopy === copy) stingCopy = null;
      duck(false, 1.5);
    });
    return true;
  },
  /** Duck the music and ambience (e.g. under a cinematic). */
  duck: (on) => duck(on),
  get current() {
    return loopChannel.id;
  },
};

export const ambience = {
  play: (id) => ambChannel.play(id),
  stop: (secs) => ambChannel.stop(secs),
};

const songChannel = channel(() => songBus);

/**
 * A song somebody is singing in the world (Maren, to the tide): louder as he
 * gets closer, muffled when it's far away. Under the music volume setting.
 */
export const song = {
  play(id, { volume = 1, muffled = false } = {}) {
    if (!ac()) return false;
    song.level(volume, muffled, 0.05);
    return songChannel.play(id);
  },
  /** Ease toward a level (0 to 1) and how far away it sounds. */
  level(volume, muffled = false, secs = 0.3) {
    if (!ctx || !songBus) return;
    const t = ctx.currentTime;
    songBus.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), t, secs);
    songFilter.frequency.setTargetAtTime(muffled ? 700 : 18000, t, secs);
  },
  stop: (secs = 1.2) => songChannel.stop(secs),
  get playing() {
    return songChannel.id;
  },
};

/** Which ambience goes with which background. */
export const AMBIENCE_FOR = { bg_jungle_ruins: "amb_jungle", bg_crystal_canyon: "amb_canyon", bg_shipwreck_cove: "amb_cove" };

// ------------------------------------------------------------------ levels and unlocking

/** Re-read the volume settings (call after changing them). */
export function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const sound = on();
  const m = sound && !musicMuted ? vol("musicVolume", 0.6) : 0;
  sfxBus.gain.setTargetAtTime(sound ? vol("sfxVolume", 0.8) : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(m, t, 0.1);
  loopBus.gain.setTargetAtTime(m, t, 0.1);
  ambBus.gain.setTargetAtTime(m, t, 0.1);
}

let musicMuted = false;
/** Mute or unmute the music and ambience (sound effects are separate). */
export function setMusicMuted(muted) {
  musicMuted = Boolean(muted);
  applyVolumes();
}

/** Browsers only allow audio after a click or key; call this from the first one. */
export function unlockAudio() {
  const c = ac();
  if (!c) return null;
  decodeAll();
  const resumed = c.state === "running" ? Promise.resolve() : c.resume();
  resumed.then(() => {
    loopChannel.resume();
    ambChannel.resume();
    songChannel.resume();
  }).catch(() => {});
  return c;
}

// Debug hook for automated checks (?debug): what loaded and what's playing.
if (typeof location !== "undefined" && new URLSearchParams(location.search).has("debug")) {
  window.__audio = {
    manifest: () => manifest,
    decoded: () => Object.fromEntries([...buffers].map(([id, list]) => [id, list.length])),
    state: () => ctx?.state,
    music: () => loopChannel.id,
    ambience: () => ambChannel.id,
    song: () => songChannel.id,
    ready: () => decoding,
  };
}
