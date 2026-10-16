// Who's playing. One shared adventure save, and a learning profile per
// child: a name, a grade per subject, and their own mastery. Playing
// together, the children swap after every hero's turn (and every puzzle),
// so each one gets every hero and every subject; a balancer evens it out
// when the swaps leave one child short on a subject. Pure, so it's tested.

import { createMastery } from "./mastery.js";

/** The subjects a grown-up sets a grade for, and the hero tracks in each. */
export const SUBJECTS = {
  addsub: { label: "Adding and subtracting", tracks: ["add", "sub"] },
  mul: { label: "Multiplying and dividing", tracks: ["mul"] },
  spell: { label: "Spelling and reading", tracks: ["spell"] },
  write: { label: "Writing", tracks: ["write"] },
  measure: { label: "Time and measuring", tracks: ["time", "measure"] },
};

/** Kindergarten (0) to 4th grade. */
export const GRADES = [0, 1, 2, 3, 4];
export const gradeName = (g) => (g === 0 ? "Kindergarten" : `${["", "1st", "2nd", "3rd", "4th"][g]} grade`);
export const DEFAULT_GRADE = 3;

/** Badge colors, by place in the list. */
export const PLAYER_COLORS = ["#ffd36b", "#7fd8ff", "#ff9dc4", "#9dffb0"];

export const subjectOf = (track) => Object.keys(SUBJECTS).find((k) => SUBJECTS[k].tracks.includes(track)) || null;

/** A new child's profile. The first one carries any mastery from before profiles existed. */
export function freshPlayer(id, { name = "", grade = DEFAULT_GRADE, mastery = null } = {}) {
  return {
    id,
    name,
    grades: Object.fromEntries(Object.keys(SUBJECTS).map((k) => [k, grade])),
    mastery: mastery || { skills: {} },
  };
}

/** A free id for the next child: p1, p2, … */
export const nextPlayerId = (players) => {
  for (let i = 1; ; i++) if (!players.some((p) => p.id === `p${i}`)) return `p${i}`;
};

/** What a player is called on screen: their name, or "Player 2". */
export function playerName(players, id) {
  const i = players.findIndex((p) => p.id === id);
  return players[i]?.name?.trim() || `Player ${i + 1}`;
}

/** A player's grade for a hero track (sub, add, mul, spell, write). */
export function gradeFor(player, track) {
  const g = player?.grades?.[subjectOf(track)];
  return GRADES.includes(g) ? g : DEFAULT_GRADE;
}

/**
 * The save's players, playing list and turn record, made whole: a save from
 * before profiles gets one player who keeps its mastery (so Chapter 1's
 * progress carries over), and the playing list only names real players.
 */
export function normalizePlayers(save) {
  if (!Array.isArray(save.players) || !save.players.length) save.players = [freshPlayer("p1", { mastery: save.mastery })];
  for (const p of save.players) {
    const fresh = freshPlayer(p.id);
    p.name = typeof p.name === "string" ? p.name : "";
    p.grades = { ...fresh.grades, ...(p.grades || {}) };
    p.mastery = p.mastery?.skills ? p.mastery : fresh.mastery;
  }
  const ids = save.players.map((p) => p.id);
  const playing = (Array.isArray(save.playing) ? save.playing : []).filter((id, i, all) => ids.includes(id) && all.indexOf(id) === i);
  save.playing = playing.length ? playing : [ids[0]];
  const t = save.turns && typeof save.turns === "object" ? save.turns : {};
  save.turns = { last: ids.includes(t.last) ? t.last : null, counts: t.counts && typeof t.counts === "object" ? t.counts : {} };
  return save;
}

const EVEN_OUT = 2; // a child this many turns ahead on a subject gives the next one up
const MAX_GAP = 3; // and the count never lets one child fall further behind than this

/**
 * Whose turn it is. Alone: always theirs. Together: the next child after
 * whoever went last, unless that child is already EVEN_OUT turns ahead on
 * this subject, in which case the child who's behind takes it.
 *   counts: { [id]: { [track]: turns } }
 */
export function pickTurn({ playing, last = null, counts = {}, track }) {
  if (playing.length < 2) return playing[0];
  const i = playing.indexOf(last);
  const next = playing[(i + 1) % playing.length];
  const n = (id) => counts[id]?.[track] || 0;
  const behind = playing.reduce((a, b) => (n(b) < n(a) ? b : a));
  return n(next) - n(behind) >= EVEN_OUT ? behind : next;
}

/** Count one turn on a subject (together only), keeping the gap small. */
export function countTurn(counts, id, track, playing) {
  const row = (counts[id] ||= {});
  row[track] = (row[track] || 0) + 1;
  const low = Math.min(...playing.map((x) => counts[x]?.[track] || 0));
  for (const x of playing) if ((counts[x]?.[track] || 0) - low > MAX_GAP) counts[x][track] = low + MAX_GAP;
  return counts;
}

/**
 * The players, as the mastery the game passes around: every mastery call
 * (pickTiers, record, level…) goes to whoever's turn it is, so battles and
 * puzzles need no other change. getSave returns the live save.
 *   beginTurn(track)  a hero's turn (or a puzzle) starts: pick whose it is
 *   badge()           { name, color } of whose turn it is, or null when one child plays
 *   saveInto(save)    write every child's mastery back into the save
 */
export function createPlayers(getSave, { now } = {}) {
  const masteries = new Map();
  let activeId = null;
  const list = () => getSave().players;
  const byId = (id) => list().find((p) => p.id === id);
  const playing = () => {
    const ids = getSave().playing.filter((id) => byId(id));
    return ids.length ? ids : [list()[0].id];
  };
  const active = () => (playing().includes(activeId) ? byId(activeId) : byId(playing()[0]));
  function masteryOf(id) {
    if (!masteries.has(id)) masteries.set(id, createMastery(byId(id).mastery, { ...(now ? { now } : {}), gradeOf: (track) => gradeFor(byId(id), track) }));
    return masteries.get(id);
  }
  const m = () => masteryOf(active().id);

  return {
    record: (id, opts) => m().record(id, opts),
    estimate: (id) => m().estimate(id),
    level: (id) => m().level(id),
    evidence: (id) => m().evidence(id),
    lastSeen: (id) => m().lastSeen(id),
    pickTiers: (ladder, rng) => m().pickTiers(ladder, rng),
    summary: () => m().summary(),
    toJSON: () => m().toJSON(),
    masteryOf,
    get player() {
      return active();
    },
    get together() {
      return playing().length > 1;
    },
    /** The grade of whoever's turn it is, for a track. */
    gradeOf: (track) => gradeFor(active(), track),
    /** Grades by track, for building questions. */
    grades: () => Object.fromEntries(Object.values(SUBJECTS).flatMap((s) => s.tracks.map((t) => [t, gradeFor(active(), t)]))),
    beginTurn(track) {
      const ids = playing();
      const turns = getSave().turns;
      activeId = pickTurn({ playing: ids, last: turns.last, counts: turns.counts, track });
      if (ids.length > 1) {
        turns.last = activeId;
        countTurn(turns.counts, activeId, track, ids);
      }
      return active();
    },
    badge() {
      if (playing().length < 2) return null;
      const p = active();
      const i = list().indexOf(p);
      return { name: playerName(list(), p.id), color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
    },
    saveInto(save) {
      for (const [id, mastery] of masteries) {
        const p = save.players.find((x) => x.id === id);
        if (p) p.mastery = mastery.toJSON();
      }
      // a copy of the first player's, so an older build reading this save still finds his progress
      save.mastery = save.players[0].mastery;
    },
    /** Forget a player's cached mastery (after a grown-up removes or resets them). */
    forget: (id) => masteries.delete(id),
    /** Right answers across every child, for the chapter's ending. */
    totalRight: () => list().reduce((n, p) => n + Object.values(masteryOf(p.id).toJSON().skills).reduce((k, r) => k + (r.k || 0), 0), 0),
  };
}
