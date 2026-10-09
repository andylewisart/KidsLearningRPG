// The adventure's save data and the rules around it, with no drawing in
// here, so it's easy to test: who's in the party, what he's carrying,
// which shards he's found, and when fiends jump out.

import { PARTY_ORDER, SCENES, WILD_SCALE, ENCOUNTER_GAP, ENCOUNTER_GRACE, MAP, POTIONS } from "./data.js";
import { CLASSES } from "../battle/data.js";
import { WILD_INTRO } from "./story.js";

export const SHARDS = ["cove", "temple", "canyon", "lair"];

export function freshWorld() {
  return {
    version: 2, // 2: the temple hall, the grotto, health between fights and Overdrive lessons
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
    heroes: {}, // health and Overdrive between fights: { cls: { hp, od } } (missing = fresh)
    potions: POTIONS.start,
    lessons: {}, // heroes whose Overdrive has been shown off: { cls: true }
    onMap: false, // he's looking at the island map (where he left off)
  };
}

// ---------------------------------------------------------------- health between fights

/** A hero's health and Overdrive right now (fresh if they haven't fought yet). */
export function heroState(w, cls) {
  const max = CLASSES[cls].hp;
  const st = w.heroes?.[cls];
  return { hp: st && Number.isFinite(st.hp) ? Math.max(0, Math.min(max, st.hp)) : max, od: st?.od || 0, max };
}

/** What a fight starts with: { cls: { hp, od } } for everyone in the party. */
export function battleStart(w) {
  const out = {};
  for (const c of w.party) {
    const st = heroState(w, c);
    out[c] = { hp: st.hp, od: st.od };
  }
  return out;
}

/**
 * After a fight. A win keeps the party's health and Overdrive as they are
 * (anyone knocked out gets up with a tenth of their health); a loss sends
 * them back to rest, all healed. res: { won, carry: { cls: { hp, od } }, potions }.
 */
export function afterBattle(w, res) {
  if (!res || res.quit) return;
  if (!res.won) return rest(w);
  w.heroes ||= {};
  for (const [cls, st] of Object.entries(res.carry || {})) {
    if (!w.party.includes(cls)) continue;
    const max = CLASSES[cls].hp;
    w.heroes[cls] = { hp: st.hp > 0 ? st.hp : Math.max(1, Math.round(max * 0.1)), od: st.od || 0 };
  }
  if (Number.isFinite(res.potions)) w.potions = Math.max(0, res.potions);
  w.flags.firstWin = true;
}

/** A rest crystal: everyone healed and back on their feet, potions topped up. Overdrive stays. */
export function rest(w) {
  w.heroes ||= {};
  for (const c of w.party) w.heroes[c] = { hp: CLASSES[c].hp, od: heroState(w, c).od };
  w.potions = Math.max(w.potions ?? 0, POTIONS.rest);
}

/** How healthy the party is, 0 to 1 (for Kit's "we should rest" nudges). */
export function partyHealth(w) {
  let hp = 0;
  let max = 0;
  for (const c of w.party) {
    const st = heroState(w, c);
    hp += st.hp;
    max += st.max;
  }
  return max ? hp / max : 1;
}

/**
 * The hero whose Overdrive gets shown off in the next fight, if any: the
 * newest one who hasn't had their lesson (and can fight). The Knight waits
 * until he's won a fight, so the very first ambush only teaches the basics.
 */
export function overdriveLesson(w) {
  return [...w.party].reverse().find((c) => !w.lessons?.[c] && (c !== "knight" || w.flags.firstWin) && heroState(w, c).hp > 0) || null;
}

// ---------------------------------------------------------------- the island map

/** Is this trail open? A trail is { a, b, needs } and needs is a world flag. */
export const trailOpen = (w, t) => !t.teaser && (!t.needs || Boolean(w.flags[t.needs]));

/** The places he can travel to on the map from where he is (every place joined by open trails). */
export function reachable(w, from = w.scene) {
  const seen = new Set([placeOf(from)]);
  const queue = [placeOf(from)];
  while (queue.length) {
    const at = queue.shift();
    for (const t of MAP.trails) {
      if (!trailOpen(w, t)) continue;
      const next = t.a === at ? t.b : t.b === at ? t.a : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** The map place a scene belongs to (the temple's hall is at the temple). */
export const placeOf = (sceneId) => Object.entries(MAP.places).find(([, p]) => p.scene === sceneId || p.scenes?.includes(sceneId))?.[0] || sceneId;

/** The path along open trails from one place to another, as place ids (null if there's none). */
export function routeTo(w, from, to) {
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift();
    if (at === to) break;
    for (const t of MAP.trails) {
      if (!trailOpen(w, t)) continue;
      const next = t.a === at ? t.b : t.b === at ? t.a : null;
      if (next && !prev.has(next)) {
        prev.set(next, at);
        queue.push(next);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path = [];
  for (let p = to; p; p = prev.get(p)) path.unshift(p);
  return path;
}

/**
 * A world partway through chapter 1, as if he had played up to there, for
 * playtests (?explore&debug&at=lair): "temple" (the cove is done), "canyon"
 * (Knox has joined and the gate is open), "maren" (Wren has joined: three
 * shards, and Maren waits at her shrine) or "lair" (all four heroes, only the
 * Geode Titan left). Null for an unknown name.
 */
export function checkpoint(name) {
  const order = ["temple", "canyon", "maren", "lair"];
  const upTo = order.indexOf(name);
  if (upTo < 0) return null;
  const w = freshWorld();
  w.started = true;
  Object.assign(w.flags, { woke: true, fish: true, bottle: true, chestSeen: true, signSeen: true, signFixed: true, firstWin: true });
  w.items = ["rubbery_fish", "jumble_note"];
  w.shards = ["cove"];
  w.monkeys.cove = true;
  w.lessons.knight = true;
  if (upTo >= 1) {
    Object.assign(w.flags, { seenTemple: true, doorOpen: true, seenHall: true, metSpellwright: true, cageBars: 3, cageOpen: true, gateOpen: true });
    joinParty(w, "spellwright");
    addShard(w, "temple");
    w.monkeys.temple = true;
    w.lessons.spellwright = true;
  }
  if (upTo >= 2) {
    Object.assign(w.flags, { seenCanyon: true, metGunner: true, traded: true, gotCell: true, calibrated: 3, zipDone: true, seenGrotto: true });
    joinParty(w, "gunner");
    addShard(w, "canyon");
    w.items = ["jumble_note", "pulley"];
    w.monkeys.canyon = true;
    w.lessons.gunner = true;
  }
  if (upTo >= 3) {
    w.flags.metCaller = true;
    joinParty(w, "titancaller");
    w.lessons.titancaller = true;
  }
  w.scene = { temple: "temple", canyon: "canyon", maren: "grotto", lair: "canyon" }[name];
  w.pos = [...SCENES[w.scene].start];
  return w;
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
 * starts on the bench in wild fights (swap her in for anything colossal),
 * unless she's `featured` (her first fight shows off her Overdrive).
 * Heroes who are knocked out sit on the bench while someone fresh can fight.
 */
export function lineup(w, { featured = null } = {}) {
  const party = PARTY_ORDER.filter((c) => w.party.includes(c));
  const up = (c) => heroState(w, c).hp > 0;
  const order = [...party].sort((a, b) => (b === featured) - (a === featured) || up(b) - up(a) || (a === "titancaller") - (b === "titancaller") || party.indexOf(a) - party.indexOf(b));
  const active = order.slice(0, 3);
  const reserve = party.find((c) => !active.includes(c)) || null;
  return { party: PARTY_ORDER.filter((c) => active.includes(c)), reserve };
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
  // a hero who hasn't shown off their Overdrive yet fights in this one
  const lesson = overdriveLesson(w);
  const { party, reserve } = lineup(w, { featured: lesson });
  const intro = pick.fiends.length > 2 ? "wildMany" : WILD_INTRO[pick.fiends[0]] || "wildMany";
  return {
    id: `wild-${sceneId}`,
    title: `Ambush! ${SCENES[sceneId].name}`,
    fiends: [...pick.fiends],
    party,
    reserve,
    scale: WILD_SCALE[Math.min(3, w.party.length)],
    introLine: intro,
    start: battleStart(w),
    potions: w.potions ?? POTIONS.start,
    odLesson: lesson,
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

// ---------------------------------------------------------------- things in the way
// A painted scene has things lying on the walkable ground (a tide pool) and
// things standing on it (a chest): he walks around them, never over them,
// because a painted thing can't be drawn in front of him. Each is a rounded
// box, { cx, cy, rx, ry }: a superellipse, |dx/rx|^4 + |dy/ry|^4 < 1, which
// hugs a box's corners better than an ellipse does.

const ROUND = 4;
const norm = (p, b) => (Math.abs(p[0] - b.cx) / b.rx) ** ROUND + (Math.abs(p[1] - b.cy) / b.ry) ** ROUND;

/** Is the point inside it? */
export function inBlock(p, b) {
  return norm(p, b) < 1;
}

/** The point moved straight out to its edge (the point itself if it's outside). */
function pushOut(p, b) {
  const t = norm(p, b) ** (1 / ROUND);
  if (t >= 1) return p;
  if (t < 1e-6) return [b.cx, b.cy + b.ry * 1.002]; // dead center: out the front
  return [b.cx + ((p[0] - b.cx) / t) * 1.002, b.cy + ((p[1] - b.cy) / t) * 1.002];
}

/** The nearest point he can stand on: inside the walkable area and outside everything in the way. */
export function freePoint(p, poly, blocks = []) {
  let q = clampTo(p, poly);
  for (let i = 0; i < 3; i++) {
    const b = blocks.find((bb) => inBlock(q, bb));
    if (!b) return q;
    q = clampTo(pushOut(q, b), poly);
  }
  return q;
}

/** Can he walk straight from a to b (nothing in the way, inside the walkable area)? */
export function clearLine(a, b, poly, blocks = [], every = 6) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / every));
  for (let i = 1; i <= n; i++) {
    const p = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n];
    if (!inside(p, poly) || blocks.some((bb) => inBlock(p, bb))) return false;
  }
  return true;
}

/**
 * The way from `from` to `to` around everything in the way: a list of points
 * to walk to in turn, ending at the nearest free spot to `to`. A search over
 * a grid of the walkable area (A*), pulled tight so he walks in straight
 * lines between the corners. With nothing in the way it's just [to].
 */
export function findPath(from, to, poly, blocks = [], cell = 14) {
  const goal = freePoint(to, poly, blocks);
  if (!blocks.length || clearLine(from, goal, poly, blocks)) return [goal];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const gx0 = Math.min(...xs);
  const gy0 = Math.min(...ys);
  const W = Math.ceil((Math.max(...xs) - gx0) / cell) + 1;
  const H = Math.ceil((Math.max(...ys) - gy0) / cell) + 1;
  const at = (i) => [gx0 + (i % W) * cell, gy0 + Math.floor(i / W) * cell];
  const open = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = at(i);
    open[i] = inside(p, poly) && !blocks.some((b) => inBlock(p, b)) ? 1 : 0;
  }
  const nearestCell = (p) => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < W * H; i++) {
      if (!open[i]) continue;
      const q = at(i);
      const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
      if (d < bestD && clearLine(p, q, poly, blocks, 4)) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  const start = nearestCell(from);
  const end = nearestCell(goal);
  if (start < 0 || end < 0) return [goal];
  // A* with a small binary heap
  const g = new Float64Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const heap = [];
  const h = (i) => Math.hypot(at(i)[0] - at(end)[0], at(i)[1] - at(end)[1]);
  const push = (i, f) => {
    heap.push([f, i]);
    for (let k = heap.length - 1; k > 0; ) {
      const up = (k - 1) >> 1;
      if (heap[up][0] <= heap[k][0]) break;
      [heap[up], heap[k]] = [heap[k], heap[up]];
      k = up;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ; ) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  g[start] = 0;
  push(start, h(start));
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.length) {
    const [, i] = pop();
    if (i === end) break;
    const ci = i % W;
    const cj = Math.floor(i / W);
    for (const [di, dj] of steps) {
      const ni = ci + di;
      const nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      if (!open[n]) continue;
      if (di && dj && (!open[cj * W + ni] || !open[nj * W + ci])) continue; // no cutting corners
      const cost = g[i] + (di && dj ? Math.SQRT2 : 1) * cell;
      if (cost < g[n]) {
        g[n] = cost;
        came[n] = i;
        push(n, cost + h(n));
      }
    }
  }
  if (came[end] < 0 && end !== start) return [goal]; // no way round: walk as far as he can
  const cells = [];
  for (let i = end; i !== -1; i = came[i]) cells.unshift(at(i));
  // pull it tight: from each point, jump to the farthest one in a straight clear line
  const pts = [from, ...cells, goal];
  const out = [];
  let k = 0;
  while (k < pts.length - 1) {
    let far = k + 1;
    for (let m = pts.length - 1; m > k + 1; m--) {
      if (clearLine(pts[k], pts[m], poly, blocks)) {
        far = m;
        break;
      }
    }
    out.push(pts[far]);
    k = far;
  }
  return out;
}

/**
 * One walking step from `from` toward `to`, at most `step` long, staying
 * in the walkable area (sliding along its edge when it can't go straight)
 * and walking around anything in the way: he slides round it on the side
 * he's already on, and keeps going that way until he's past it (`memo`, an
 * object the caller keeps for each walker, remembers which way).
 * Returns { pos, arrived }.
 */
export function stepToward(from, to, step, poly, blocks = [], memo = null) {
  const free = (p) => inside(p, poly) && !blocks.some((b) => inBlock(p, b));
  if (blocks.length && !free(to)) to = freePoint(to, poly, blocks);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return { pos: blocks.length ? freePoint(to, poly, blocks) : clampTo(to, poly), arrived: true };
  const next = [from[0] + (dx / dist) * step, from[1] + (dy / dist) * step];
  if (free(next)) {
    if (memo) memo.block = null;
    return { pos: next, arrived: false };
  }
  // something in the way: slide round its edge
  const b = blocks.find((bb) => inBlock(next, bb));
  if (b) {
    const gx = (Math.sign(from[0] - b.cx) * Math.abs(from[0] - b.cx) ** (ROUND - 1)) / b.rx ** ROUND;
    const gy = (Math.sign(from[1] - b.cy) * Math.abs(from[1] - b.cy) ** (ROUND - 1)) / b.ry ** ROUND;
    const len = Math.hypot(gx, gy) || 1;
    const [tx, ty] = [-gy / len, gx / len]; // its edge, counterclockwise
    let k = memo && memo.block === b.id ? memo.k : 0;
    if (!k) {
      // round the side he's on (off the line from him to where he's going); dead center: the near side
      const [cx, cy] = [from[0] - b.cx, from[1] - b.cy];
      const along = (cx * dx + cy * dy) / dist;
      const [px, py] = [cx - (along * dx) / dist, cy - (along * dy) / dist];
      const dot = tx * px + ty * py;
      k = Math.abs(dot) > 0.5 ? Math.sign(dot) : ty >= 0 ? 1 : -1;
    }
    for (const kk of [k, -k]) {
      const p = pushOut([from[0] + kk * tx * step, from[1] + kk * ty * step], b);
      if (free(p)) {
        if (memo) Object.assign(memo, { block: b.id, k: kk });
        return { pos: p, arrived: false };
      }
    }
  }
  // slide: try moving along just one axis
  const sx = [from[0] + Math.sign(dx) * Math.min(step, Math.abs(dx)), from[1]];
  if (Math.abs(dx) > 0.5 && free(sx)) return { pos: sx, arrived: false };
  const sy = [from[0], from[1] + Math.sign(dy) * Math.min(step, Math.abs(dy))];
  if (Math.abs(dy) > 0.5 && free(sy)) return { pos: sy, arrived: false };
  return { pos: freePoint(from, poly, blocks), arrived: true }; // stuck against the edge
}
