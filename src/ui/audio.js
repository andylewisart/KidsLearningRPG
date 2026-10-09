// Sound effects made on the fly with the Web Audio API (no files to load).

import { getSave } from "../store/save.js";

let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const on = () => getSave()?.settings.sound !== false;

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

export const sfx = {
  select: () => on() && tone({ freq: 880, type: "square", dur: 0.05, vol: 0.12 }),
  back: () => on() && tone({ freq: 440, to: 330, type: "square", dur: 0.07, vol: 0.12 }),
  key: () => on() && tone({ freq: 1200, type: "square", dur: 0.025, vol: 0.06 }),
  right: () => on() && notes([660, 990], { type: "triangle", step: 0.07, dur: 0.12, vol: 0.3 }),
  wrong: () => on() && (tone({ freq: 220, to: 150, type: "sawtooth", dur: 0.22, vol: 0.18 }), noise({ dur: 0.15, vol: 0.12, freq: 400 })),
  slash: () => on() && (noise({ dur: 0.18, vol: 0.5, freq: 3000, to: 600, q: 0.6 }), tone({ freq: 140, to: 60, type: "sine", dur: 0.18, vol: 0.5, delay: 0.05 })),
  shot: () => on() && [0, 0.07, 0.14].forEach((d) => noise({ dur: 0.08, vol: 0.4, freq: 2400, to: 900, delay: d })),
  spell: () => on() && (notes([523, 659, 784, 1046], { type: "sine", step: 0.05, dur: 0.25, vol: 0.22 }), noise({ dur: 0.4, vol: 0.15, freq: 5000, q: 3, delay: 0.1 })),
  hit: () => on() && (tone({ freq: 160, to: 50, type: "sine", dur: 0.2, vol: 0.6 }), noise({ dur: 0.12, vol: 0.35, freq: 900 })),
  crit: () => on() && (tone({ freq: 200, to: 40, type: "square", dur: 0.3, vol: 0.4 }), noise({ dur: 0.3, vol: 0.5, freq: 1500, to: 300 }), tone({ freq: 1568, type: "triangle", dur: 0.25, vol: 0.2, delay: 0.05 })),
  hurt: () => on() && (tone({ freq: 300, to: 120, type: "sawtooth", dur: 0.2, vol: 0.2 }), noise({ dur: 0.15, vol: 0.3, freq: 700 })),
  miss: () => on() && noise({ dur: 0.3, vol: 0.3, freq: 500, to: 2500, q: 1.5 }),
  heal: () => on() && notes([523, 659, 784, 1046, 1318], { type: "sine", step: 0.06, dur: 0.3, vol: 0.2 }),
  ko: () => on() && (notes([880, 740, 587, 440, 330], { type: "triangle", step: 0.06, dur: 0.18, vol: 0.18 }), noise({ dur: 0.6, vol: 0.15, freq: 4000, q: 4 })),
  capture: () => on() && (notes([392, 523, 659, 784, 1046, 1568], { type: "square", step: 0.07, dur: 0.16, vol: 0.12 }), noise({ dur: 0.5, vol: 0.2, freq: 6000, q: 6, delay: 0.3 })),
  bar: () => on() && (tone({ freq: 90, to: 40, type: "square", dur: 0.5, vol: 0.45 }), noise({ dur: 0.5, vol: 0.4, freq: 600, to: 120 })),
  overdrive: () => on() && notes([392, 494, 587, 784, 988], { type: "sawtooth", step: 0.05, dur: 0.14, vol: 0.14 }),
  summon: () =>
    on() &&
    (tone({ freq: 55, to: 110, type: "sawtooth", dur: 1.6, vol: 0.35, attack: 0.4 }),
    noise({ dur: 1.6, vol: 0.25, freq: 200, to: 2000, q: 0.7 }),
    notes([0, 0, 0, 0, 0, 0, 0, 0, 262, 330, 392, 523], { type: "triangle", step: 0.12, dur: 0.4, vol: 0.25 })),
  quake: () => on() && (tone({ freq: 50, to: 30, type: "sawtooth", dur: 0.8, vol: 0.5 }), noise({ dur: 0.8, vol: 0.5, freq: 200 })),
  victory: () =>
    on() &&
    notes([523, 523, 523, 523, 0, 415, 0, 466, 0, 523, 0, 466, 523], { type: "square", step: 0.11, dur: 0.16, vol: 0.14 }),
  defeat: () => on() && notes([392, 370, 349, 330, 262], { type: "triangle", step: 0.22, dur: 0.4, vol: 0.2 }),
};

/** Browsers only allow audio after a click; call this from the first click. */
export const unlockAudio = () => ac();
