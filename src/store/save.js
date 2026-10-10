// The save file: progress, mastery, collections and settings. Kept in one
// object so "Back up progress" can export it as a single file.

import { dbGet, dbSet } from "./db.js";

const KEY = "save.v1";
const MAX_LOG = 2000;

export function freshSave() {
  return {
    version: 1,
    createdAt: Date.now(),
    progress: { training: 0, shards: 0, battlesWon: 0 },
    mastery: { skills: {} },
    collection: {
      captures: {}, // fiend id -> count (max 10 each)
      defeated: {}, // fiend id -> count
      words: {}, // word -> { right, wrong }
      missedWords: [], // most recent first
      moves: {}, // hero move name -> times used
      entrances: [], // his Titan entrance writing, newest first
      trophies: {},
    },
    names: { knight: "", gunner: "", spellwright: "", titancaller: "", droid: "Kit", titan: "" },
    settings: {
      anthropicKey: "",
      openaiKey: "",
      elevenKey: "",
      voiceProvider: "auto", // auto | elevenlabs | openai | browser
      elevenVoices: {}, // role (droid, trailer, spelling, narrator) -> ElevenLabs voice id
      sound: true,
      sfxVolume: 0.8,
      musicVolume: 0.6,
      heroVoices: true, // the heroes speak their barks
      voice: true, // read-aloud on
      fillWindow: false, // off: the stage is never shown bigger than 1080p (on: it fills the window, however big)
      pin: "",
      schoolWords: [],
    },
    usage: { day: "", tutor: 0, judge: 0, speech: 0, listen: 0 },
    log: [], // recent attempts: { t, skill, tier, correct, hinted, ms, mistake }
    tutorLog: [], // recent droid conversations for the grown-ups corner
    battles: [], // one line per fight, for the play report
    world: null, // the adventure (world/state.js freshWorld), made on first play
    errors: [], // anything that went wrong in the game, for the play report
  };
}

let current = null;
let saving = Promise.resolve();

export async function loadSave() {
  try {
    const stored = await dbGet(KEY);
    current = merge(freshSave(), stored || {});
  } catch {
    current = freshSave(); // storage blocked (private window): play without saving
  }
  return current;
}

export const getSave = () => current;

/** Change the save and write it out (writes are queued so they never overlap). */
export function update(fn) {
  fn(current);
  if (current.log.length > MAX_LOG) current.log.splice(0, current.log.length - MAX_LOG);
  if (current.tutorLog.length > 50) current.tutorLog.splice(0, current.tutorLog.length - 50);
  const snapshot = JSON.parse(JSON.stringify(current));
  saving = saving.then(() => dbSet(KEY, snapshot)).catch(() => {});
  return saving;
}

/** Back up: everything except the API keys (those stay on this laptop). */
export function exportSave() {
  const copy = JSON.parse(JSON.stringify(current));
  copy.settings.anthropicKey = "";
  copy.settings.openaiKey = "";
  copy.settings.elevenKey = "";
  return JSON.stringify(copy, null, 1);
}

export async function importSave(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== 1) throw new Error("That doesn't look like a Crystal Titans backup.");
  const keys = { anthropicKey: current.settings.anthropicKey, openaiKey: current.settings.openaiKey, elevenKey: current.settings.elevenKey };
  current = merge(freshSave(), data);
  Object.assign(current.settings, keys);
  await update(() => {});
  return current;
}

function merge(base, saved) {
  const out = { ...base, ...saved };
  for (const k of ["progress", "collection", "names", "settings", "usage"]) out[k] = { ...base[k], ...(saved[k] || {}) };
  out.mastery = saved.mastery || base.mastery;
  out.log = Array.isArray(saved.log) ? saved.log : [];
  out.tutorLog = Array.isArray(saved.tutorLog) ? saved.tutorLog : [];
  out.battles = Array.isArray(saved.battles) ? saved.battles : [];
  out.errors = Array.isArray(saved.errors) ? saved.errors : [];
  return out;
}

/** Remember an error for the play report (never throws). */
export function logError(message, where = "") {
  try {
    if (!current) return;
    update((s) => {
      s.errors.push({ t: Date.now(), message: String(message).slice(0, 300), where: String(where).slice(0, 200) });
      if (s.errors.length > 30) s.errors.splice(0, s.errors.length - 30);
    });
  } catch {
    /* reporting must never break the game */
  }
}

/** Count one use of an AI feature; returns false once today's cap is hit. */
export function spendUsage(kind, cap) {
  const today = new Date().toISOString().slice(0, 10);
  const u = current.usage;
  if (u.day !== today) Object.assign(u, { day: today, tutor: 0, judge: 0, speech: 0, listen: 0, live: 0 });
  if ((u[kind] || 0) >= cap) return false;
  u[kind] = (u[kind] || 0) + 1;
  update(() => {});
  return true;
}
