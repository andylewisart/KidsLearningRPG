// The adventure's save data and the rules around it, with no drawing in
// here, so it's easy to test: who's in the party, what he's carrying,
// which shards he's found, and when fiends jump out.

import { PARTY_ORDER, SCENES, WILD_SCALE, ENCOUNTER_GAP, ENCOUNTER_GRACE } from "./data.js";
import { WILD_INTRO } from "./story.js";

export const SHARDS = ["cove", "temple", "canyon", "lair"];

export function freshWorld() {
  return {
    version: 1,
    started: false, // the prologue has played
    scene: "cove",
    pos: null, // [x, y] where he stands; null means the scene's start
    party: ["knight"],
    items: [],
    shards: [],
    flags: {},
    monkeys: {}, // three-eyed monkey sightings, by scene
    toNext: null, // walking left before fiends jump out
    finished: false, // chapter 1 is done
  };
}

export const hasItem = (w, id) => w.items.includes(id);

export function giveItem(w, id) {
  if (!hasItem(w, id)) w.items.push(id);
}

export function takeItem(w, id) {
  w.items = w.items.filter((x) => x !== id);
}

export function addShard(w, id) {
  if (SHARDS.includes(id) && !w.shards.includes(id)) w.shards.push(id);
}

/** A hero joins (kept in joining order). */
export function joinParty(w, cls) {
  if (!PARTY_ORDER.includes(cls) || w.party.includes(cls)) return;
  w.party = PARTY_ORDER.filter((c) => c === cls || w.party.includes(c));
}

/**
 * Who fights: up to three heroes, the rest on the bench. The Titan Caller
 * starts on the bench in wild fights (swap her in for anything colossal).
 */
export function lineup(w) {
  const party = PARTY_ORDER.filter((c) => w.party.includes(c));
  const active = party.filter((c) => c !== "titancaller").slice(0, 3);
  if (active.length < 3 && party.includes("titancaller")) active.push("titancaller");
  const reserve = party.find((c) => !active.includes(c)) || null;
  return { party: active, reserve };
}

/** The fights a scene can throw at this party (single fiends only while he's alone). */
export function encounterOptions(sceneId, w) {
  const size = w.party.length;
  return (SCENES[sceneId]?.encounters || []).filter(
    (e) => (e.needs || []).every((c) => w.party.includes(c)) && size >= (e.minParty || 1) && (size > 1 || e.fiends.length === 1),
  );
}

/** A surprise fight in this scene, ready for runBattle (minus the background, which the screen picks). */
export function wildEncounter(sceneId, w, rng) {
  const options = encounterOptions(sceneId, w);
  if (!options.length) return null;
  const pick = rng.weighted(options, (e) => e.weight || 1);
  const { party, reserve } = lineup(w);
  const intro = pick.fiends.length > 2 ? "wildMany" : WILD_INTRO[pick.fiends[0]] || "wildMany";
  return {
    id: `wild-${sceneId}`,
    title: `Ambush! ${SCENES[sceneId].name}`,
    fiends: [...pick.fiends],
    party,
    reserve,
    scale: WILD_SCALE[Math.min(3, party.length)],
    introLine: intro,
  };
}

/**
 * He walked `dist` stage pixels in a scene with fiends. Returns true when
 * fiends jump out (and starts counting toward the next time).
 */
export function walkFor(w, dist, rng) {
  if (w.toNext == null) w.toNext = rng.int(ENCOUNTER_GAP[0], ENCOUNTER_GAP[1]);
  w.toNext -= dist;
  if (w.toNext > 0) return false;
  w.toNext = rng.int(ENCOUNTER_GAP[0], ENCOUNTER_GAP[1]);
  return true;
}

/** No fiends for a little while (after a fight, a scene change or a story moment). */
export function grace(w, rng, at = ENCOUNTER_GRACE) {
  w.toNext = Math.max(w.toNext ?? rng.int(ENCOUNTER_GAP[0], ENCOUNTER_GAP[1]), at);
}

// ---------------------------------------------------------------- walking

/** Is the point inside the polygon? (Ray casting.) */
export function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The nearest point inside the polygon (the point itself if it's already inside). */
export function clampTo(p, poly) {
  if (inside(p, poly)) return p;
  let best = null;
  let bestD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const q = nearestOnSegment(p, poly[j], poly[i]);
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  // nudge a hair inside, so the next step starts in bounds
  const c = centroid(poly);
  const dx = c[0] - best[0];
  const dy = c[1] - best[1];
  const len = Math.hypot(dx, dy) || 1;
  return [best[0] + (dx / len) * 0.5, best[1] + (dy / len) * 0.5];
}

function nearestOnSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return [ax + t * dx, ay + t * dy];
}

function centroid(poly) {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}

/**
 * One walking step from `from` toward `to`, at most `step` long, staying
 * in the walkable area (sliding along its edge when it can't go straight).
 * Returns { pos, arrived }.
 */
export function stepToward(from, to, step, poly) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return { pos: clampTo(to, poly), arrived: true };
  const next = [from[0] + (dx / dist) * step, from[1] + (dy / dist) * step];
  if (inside(next, poly)) return { pos: next, arrived: false };
  // slide: try moving along just one axis
  const sx = [from[0] + Math.sign(dx) * Math.min(step, Math.abs(dx)), from[1]];
  if (Math.abs(dx) > 0.5 && inside(sx, poly)) return { pos: sx, arrived: false };
  const sy = [from[0], from[1] + Math.sign(dy) * Math.min(step, Math.abs(dy))];
  if (Math.abs(dy) > 0.5 && inside(sy, poly)) return { pos: sy, arrived: false };
  return { pos: clampTo(from, poly), arrived: true }; // stuck against the edge
}
