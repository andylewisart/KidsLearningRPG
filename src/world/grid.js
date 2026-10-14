// The Crystal Grid (chapter 2, beat 7; docs/story/chapter2-proposal.md): the
// Sage chart the old crystal throws across the lamp room's ceiling, the
// game's take on FFX's Sphere Grid. Each hero has a road of nodes out from
// their start. Light lights them: the glimmer from every fight (more for a
// harder right answer, more still for a capture: glimmerFor) collects here,
// and each node it lights makes that hero a little stronger, opens a pet
// slot, or earns quieter walking (Calm Seas). Nothing on a road is ever
// locked, so every fight moves something forward. Off each road are two side
// roads: a gate, which opens only when a skill on that hero's track is truly
// learned (learn/mastery.js, "on track"), with the best nodes behind it; and
// the hero's weapon, whose nodes light at the Sword Master's forge (forge.js,
// for parts and glimmer).
//
// Pure, so it's tested (test/grid.test.js). The save keeps it in world.grid:
// { light: glimmer to spend, lit: [node ids], gates: [gate ids seen open],
// at: { cls: the node their token sits on }, seen: the light there was when
// he last closed it }. state.js turns it into each fight's start (boosts),
// pets.js asks it about pet slots, and ui/grid.js draws it.

import { CLASSES } from "../battle/data.js";
import { SKILLS, LADDERS } from "../learn/skills.js";
import { PARTY_ORDER } from "./data.js";
import { PETS } from "./data2.js";
import { WEAPONS, FORGE_COST, FORGE_GLIMMER, WEAPON_POWER, weaponStep, weaponPower, forge, addParts } from "./forge.js";

// ---------------------------------------------------------------- the chart

/** Where each hero's road leaves the middle of the chart (degrees, clockwise from east). */
const ARMS = { knight: -90, gunner: -18, titancaller: 54, beastkeeper: 126, spellwright: 198 };
const R0 = 120; // the start's distance from the middle (chart pixels)
const STEP = 96; // from one node to the next along a road
const TWIST = 5; // each step turns a little, so the roads curl like a spiral's arms

/**
 * The glimmer a right answer leaves, by the tier of the problem he picked
 * (★, ★★, ★★★): the harder the answer, the brighter the glimmer. Steep on
 * purpose: ★ moves alone take far more answers to win a fight (an
 * Overdrive's quick answers are ★ too), so mixing in ★★ and ★★★ has to earn
 * at least as much a fight as that (test/balance.test.js). A capture leaves
 * CAPTURE_GLIMMER more.
 */
export const GLIMMER = { 1: 2, 2: 12, 3: 20 };
export const CAPTURE_GLIMMER = 25;

/**
 * A fight's glimmer, from its stats (ui/battle.js): right answers, first try
 * and no hint, by tier (rightByTier), and captures. Every fight counts it
 * this way, in either chapter, on an adventure or in a quick battle. A right
 * answer whose tier wasn't kept (a fight saved mid-way before tiers were
 * counted) counts as ★.
 */
export function glimmerFor(stats = {}) {
  const by = stats.rightByTier || {};
  let counted = 0;
  let glimmer = 0;
  for (const tier of [1, 2, 3]) {
    const n = Math.max(0, by[tier] || 0);
    counted += n;
    glimmer += n * GLIMMER[tier];
  }
  glimmer += Math.max(0, (stats.right || 0) - counted) * GLIMMER[1];
  return glimmer + (stats.captures?.length || 0) * CAPTURE_GLIMMER;
}

/**
 * What a node costs to light, by how many steps it is from the hero's start.
 * A fight leaves about 35 glimmer with ★ moves alone and 50 or more with
 * harder ones mixed in, so after the first visit a node comes every two
 * fights or so for a player who mixes tiers, with the forge's glimmer paid
 * too (test/balance.test.js).
 */
export const COST = [0, 40, 65, 100, 140, 180, 230, 290, 350, 410];

/** The tracks behind each hero's gate: the skills their moves practice (battle/data.js, CLASSES[cls].track). */
export const GATE_TRACKS = { knight: ["sub"], gunner: ["mul"], spellwright: ["spell"], titancaller: ["write"], beastkeeper: ["time", "measure"] };

const health = (hp) => ({ kind: "health", hp });
const strength = (power = 0.05) => ({ kind: "strength", power });
const quick = () => ({ kind: "speed", speed: 1 });
const combo = () => ({ kind: "overdrive", combo: 1 });
const charge = (n = 0.2) => ({ kind: "charge", charge: n });
const bond = (n = 0.15) => ({ kind: "summon", summon: n });
const slot = () => ({ kind: "pet_slot" });
const whisper = (n = 0.15) => ({ kind: "pet_power", pets: n });
const calm = () => ({ kind: "calm_seas" });

/**
 * Each hero's road (out from the start, in order), where their weapon's side
 * road leaves it and where the gate's does, and what's behind the gate.
 * Cade's pet slot is open from the start: Rivet fights beside him before the
 * Grid is found. Tamsin's road is short ("Mine's short." "You got here this
 * afternoon."): she carries the party's pet nodes and Calm Seas instead.
 * Each node is a small step: the harbor's fights and the Drain Engine still
 * take work with the Grid partway lit (test/balance.test.js).
 */
const ROADS = {
  knight: { road: [health(40), strength(), combo(), health(40), quick(), strength(), charge()], weapon: 2, gate: 4, behind: [strength(0.08), health(60)], slotAtStart: true },
  gunner: { road: [slot(), strength(), health(25), charge(), combo(), strength(), quick()], weapon: 2, gate: 4, behind: [strength(0.08), combo()] },
  spellwright: { road: [slot(), health(20), strength(), charge(), health(20), combo(), strength()], weapon: 2, gate: 4, behind: [strength(0.08), health(40)] },
  titancaller: { road: [slot(), health(20), bond(), strength(), health(20), bond(), quick()], weapon: 2, gate: 4, behind: [bond(0.2), health(40)] },
  beastkeeper: { road: [whisper(), health(25), calm(), strength(), whisper()], weapon: 2, gate: 3, behind: [combo(), quick()] },
};

/** The picture on the node sheet (ui/grid_nodes, art wave 08 Section H) for each kind of node. */
export const ICONS = { start: "start", health: "health", strength: "strength", speed: "move", overdrive: "move", charge: "move", summon: "move", pet_slot: "pet_slot", pet_power: "pet_slot", calm_seas: "calm_seas", gate: "skill_gate", weapon: "weapon" };

const polar = (deg, r) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
const round = ([x, y]) => [Math.round(x), Math.round(y)];

/**
 * Every node on the chart, by id ("knight.3", "knight.w1", "knight.gate",
 * "knight.g1"): { id, cls, kind, icon, at: [x, y] from the chart's middle,
 * from: the node it hangs off, depth: steps from the start, cost (light; 0
 * for a gate, which opens by itself, and for a weapon node, forged instead),
 * and what it does (hp, power, speed, combo, charge, summon, pets; a gate's
 * need; a weapon node's step) }.
 */
export const NODES = {};
/** Each hero's nodes in order: the road, then the weapon's side road, then the gate's. */
export const HERO_NODES = {};

for (const cls of PARTY_ORDER) {
  const spec = ROADS[cls];
  const ids = [];
  const add = (node) => {
    NODES[node.id] = { cls, icon: ICONS[node.kind], cost: 0, ...node };
    ids.push(node.id);
  };
  const angle = (k) => ARMS[cls] + k * TWIST;
  const roadAt = (k) => round(polar(angle(k), R0 + k * STEP));
  add({ id: `${cls}.0`, kind: "start", at: roadAt(0), from: null, depth: 0, ...(spec.slotAtStart ? { slot: true } : {}) });
  spec.road.forEach((effect, i) => add({ id: `${cls}.${i + 1}`, at: roadAt(i + 1), from: `${cls}.${i}`, depth: i + 1, cost: COST[i + 1], ...effect }));
  // a side road leaves the road square to it, leaning outward a little
  const side = (k, dir, n) =>
    Array.from({ length: n }, (_, j) => {
      const [bx, by] = roadAt(k);
      const [sx, sy] = polar(angle(k) + dir * 90, STEP * 0.86 * (j + 1));
      const [ox, oy] = polar(angle(k), 20 * (j + 1));
      return round([bx + sx + ox, by + sy + oy]);
    });
  side(spec.weapon, 1, 2).forEach((at, j) => add({ id: `${cls}.w${j + 1}`, kind: "weapon", at, from: j ? `${cls}.w${j}` : `${cls}.${spec.weapon}`, depth: spec.weapon + j + 1, step: j + 1 }));
  const gateRoad = side(spec.gate, -1, 1 + spec.behind.length);
  add({ id: `${cls}.gate`, kind: "gate", at: gateRoad[0], from: `${cls}.${spec.gate}`, depth: spec.gate + 1, need: 1, tracks: GATE_TRACKS[cls] });
  spec.behind.forEach((effect, j) => add({ id: `${cls}.g${j + 1}`, at: gateRoad[j + 1], from: j ? `${cls}.g${j}` : `${cls}.gate`, depth: spec.gate + j + 2, cost: COST[spec.gate + j + 2], ...effect }));
  HERO_NODES[cls] = ids;
}

/** The hero whose road a node is on. */
export const heroOf = (id) => NODES[id]?.cls || null;

// ---------------------------------------------------------------- the save

/** `seen`: the light there was when he last closed the Grid (Kit mentions it when there's more). */
export function freshGrid() {
  return { light: 0, lit: [], gates: [], at: {}, seen: 0 };
}

/** The save's Grid, made whole in place (a save from before the Grid gets an empty one). */
export function gridOf(w) {
  const g = (w.grid ||= freshGrid());
  if (!Array.isArray(g.lit)) g.lit = [];
  if (!Array.isArray(g.gates)) g.gates = [];
  if (!g.at || typeof g.at !== "object") g.at = {};
  if (!Number.isFinite(g.light) || g.light < 0) g.light = 0;
  if (!Number.isFinite(g.seen)) g.seen = 0;
  return g;
}

/**
 * "Every true answer since the beach left light behind": the glimmer from
 * fights collects for the Grid from the very first one, and what's waiting
 * when he finds it is up to a first visit's shopping trip (a node for each
 * hero), so there's still plenty to earn in chapter 2.
 */
export const SEED_CAP = PARTY_ORDER.length * COST[1];

/** A save from before the Grid: everything he's earned so far (save.progress.shards, the glimmer counted after every fight) is waiting. */
export function seedLight(w, glimmer) {
  const g = gridOf(w);
  g.light = Math.max(g.light, Math.min(SEED_CAP, Math.max(0, Math.round(glimmer || 0))));
  return g.light;
}

/**
 * A fight's glimmer goes to the Grid (every fight pays). Until it's found,
 * up to SEED_CAP waits there (and light a save already had waiting stays).
 */
export function earnLight(w, glimmer) {
  const g = gridOf(w);
  const before = g.light;
  g.light += Math.max(0, Math.round(glimmer || 0));
  if (!w.flags?.gridSeen) g.light = Math.min(g.light, Math.max(SEED_CAP, before));
  return g.light;
}

// ---------------------------------------------------------------- lighting nodes

/** Has this gate opened? (Its skill is learned; the road may not have reached it yet.) */
export const gateOpen = (w, id) => Boolean(w.grid?.gates?.includes(id));

/**
 * Is this node lit? A start always is; a gate once it's open and the road
 * has reached it; a weapon node once the forge has made that step.
 */
export function isLit(w, id) {
  const node = NODES[id];
  if (!node) return false;
  if (node.kind === "start") return true;
  if (node.kind === "gate") return gateOpen(w, id) && isLit(w, node.from);
  if (node.kind === "weapon") return weaponStep(w, node.cls) >= node.step;
  return Boolean(w.grid?.lit?.includes(id));
}

/**
 * Where a node stands for him:
 *   lit     lit already
 *   ready   next to a lit node, and he has the light for it
 *   short   next to a lit node, but he needs more light
 *   shut    a gate that hasn't opened (the skill behind it isn't learned yet)
 *   forge   a weapon node: the Sword Master forges it
 *   far     not next to anything lit yet (an open gate the road hasn't reached)
 */
export function nodeState(w, id) {
  const node = NODES[id];
  if (isLit(w, id)) return "lit";
  if (node.kind === "gate") return gateOpen(w, id) ? "far" : "shut";
  if (node.kind === "weapon") return "forge";
  if (!isLit(w, node.from)) return "far";
  return (w.grid?.light || 0) >= node.cost ? "ready" : "short";
}

/**
 * Light a node with light. Returns { ok: true, said: [conversations Kit has
 * for it] } or { ok: false, why: "lit" | "far" | "short" | "shut" | "forge" }.
 * A health node heals its hero by as much as it raises their health.
 */
export function lightNode(w, id) {
  const node = NODES[id];
  if (!node) return { ok: false, why: "far" };
  const state = nodeState(w, id);
  if (state !== "ready") return { ok: false, why: state };
  const g = gridOf(w);
  g.light -= node.cost;
  g.lit.push(id);
  g.at[node.cls] = id;
  if (node.hp && w.heroes?.[node.cls] && Number.isFinite(w.heroes[node.cls].hp)) w.heroes[node.cls].hp += node.hp;
  const said = [];
  if (node.kind === "pet_slot") said.push("petSlot");
  if (node.kind === "calm_seas") said.push("gridCalmSeas");
  return { ok: true, said };
}

/** The node a hero's token sits on: the last one they lit (their start, before any). */
export function tokenAt(w, cls) {
  const at = w.grid?.at?.[cls];
  return at && isLit(w, at) && heroOf(at) === cls ? at : `${cls}.0`;
}

/** The way along lit nodes from one node to another on the same hero's roads (both included). */
export function route(from, to) {
  const up = (id) => {
    const out = [];
    for (let x = id; x; x = NODES[x]?.from) out.push(x);
    return out;
  };
  const a = up(from);
  const b = up(to);
  const meet = a.find((x) => b.includes(x));
  return [...a.slice(0, a.indexOf(meet) + 1), ...b.slice(0, b.indexOf(meet)).reverse()];
}

/** The cheapest node he could light next on a hero's roads (lit or not yet affordable), or null when there's none. */
export function nextUp(w, cls) {
  const open = HERO_NODES[cls].filter((id) => ["ready", "short"].includes(nodeState(w, id)));
  return open.sort((a, b) => NODES[a].cost - NODES[b].cost || NODES[a].depth - NODES[b].depth)[0] || null;
}

/** Is there a node anywhere he has the light for right now? */
export const anyReady = (w) => Object.keys(NODES).some((id) => nodeState(w, id) === "ready");

/** How far along a hero is: { lit, of } over the nodes light can light (gates and weapons apart). */
export function progressOf(w, cls) {
  const ids = HERO_NODES[cls].filter((id) => NODES[id].cost > 0);
  return { lit: ids.filter((id) => isLit(w, id)).length, of: ids.length };
}

// ---------------------------------------------------------------- gates

const LEARNED = new Set(["ontrack", "mastered"]);

/**
 * The skills that count for a child at a gate: the ones on its tracks at
 * their own grade for that subject (or above), so a 3rd grader opens Cade's
 * gate with 3rd-grade subtraction, and a 1st grader with her own.
 */
function gateSkills(gate, kid) {
  return gate.tracks.flatMap((track) => (LADDERS[track] || []).filter((id) => (SKILLS[id]?.grade ?? 3) >= Math.min(3, kid.gradeOf(track))));
}

/**
 * How far the children are toward a gate. kids: [{ name, gradeOf(track),
 * level(id), evidence(id) }], one for each child (learn/players.js; level and
 * evidence from learn/mastery.js). The gate opens when one child has `need`
 * of its skills truly learned. Returns { open, need, have, closest: { kid,
 * skill, label, right, of, days } | null }: closest is the unlearned skill
 * nearest to it, for the panel to show what to practice.
 */
export function gateProgress(gate, kids = []) {
  let have = 0;
  let closest = null;
  let best = null;
  for (const kid of kids) {
    const ids = gateSkills(gate, kid);
    have = Math.max(have, ids.filter((id) => LEARNED.has(kid.level(id))).length);
    for (const id of ids) {
      if (LEARNED.has(kid.level(id))) continue;
      const ev = kid.evidence?.(id) || { right: 0, of: 0, days: 0 };
      const score = Math.min(9, ev.right) * 10 + Math.min(3, ev.days) * 3 + Math.min(10, ev.of) / 10;
      if (best === null || score > best) {
        best = score;
        closest = { kid: kid.name || "", skill: id, label: SKILLS[id].label, right: ev.right, of: ev.of, days: ev.days };
      }
    }
  }
  return { open: have >= gate.need, need: gate.need, have, closest };
}

/**
 * Open every gate whose skill is learned now (it stays open, even if the
 * skill slips later: the Grid never takes anything back). Returns the gates
 * that just opened.
 */
export function openGates(w, kids = []) {
  const g = gridOf(w);
  const opened = [];
  for (const node of Object.values(NODES)) {
    if (node.kind !== "gate" || gateOpen(w, node.id)) continue;
    if (gateProgress(node, kids).open) {
      g.gates.push(node.id);
      opened.push(node.id);
    }
  }
  return opened;
}

// ---------------------------------------------------------------- what it all does in a fight

/** The extra hits in a combo, the faster charge, the stronger Titan, from a hero's lit nodes. */
function litEffects(w, cls) {
  const out = { hp: 0, power: 0, speed: 0, combo: 0, charge: 0, summon: 0 };
  for (const id of HERO_NODES[cls] || []) {
    const node = NODES[id];
    if (node.kind === "weapon" || !isLit(w, id)) continue;
    for (const k of Object.keys(out)) out[k] += node[k] || 0;
  }
  return out;
}

/**
 * A hero's stats with the Grid and their weapon, for a fight's start
 * (battle/engine.js, createBattle): { maxHp, speed, power (their hits ×),
 * combo (extra Overdrive hits), charge (Overdrive fills ×), summon (Titans
 * hit ×), weapon (its step, to show) }.
 */
export function boosts(w, cls) {
  const e = litEffects(w, cls);
  return {
    maxHp: CLASSES[cls].hp + e.hp,
    speed: CLASSES[cls].speed + e.speed,
    power: round2(1 + e.power + weaponPower(w, cls)),
    combo: e.combo,
    charge: round2(1 + e.charge),
    summon: round2(1 + e.summon),
    weapon: weaponStep(w, cls),
  };
}
const round2 = (x) => Math.round(x * 100) / 100;

/** A hero's most health, with the Grid's health nodes. */
export const maxHpOf = (w, cls) => CLASSES[cls].hp + litEffects(w, cls).hp;

/** Can this hero bring a pet into a fight? Cade's slot comes with Rivet; the others open on the Grid. */
export function petSlotOpen(w, cls) {
  return HERO_NODES[cls]?.some((id) => (NODES[id].kind === "pet_slot" || NODES[id].slot) && isLit(w, id)) || false;
}

/** How hard every pet hits and mends (Tamsin's nodes): ×1, more with each one lit. */
export function petPower(w) {
  let n = 1;
  for (const id of HERO_NODES.beastkeeper) if (NODES[id].kind === "pet_power" && isLit(w, id)) n += NODES[id].pets;
  return round2(n);
}

/** Calm Seas is lit: fewer fiends still where there's nothing new left. */
export const calmSeas = (w) => Object.values(NODES).some((n) => n.kind === "calm_seas" && isLit(w, n.id));

/** In a quiet place fiends jump out this many times less often, and with Calm Seas lit, CALM_SEAS times less. */
export const QUIET = 1.5;
export const CALM_SEAS = 3;

/**
 * A place with nothing new left: nothing in it glints (story.js, SPARKLE),
 * and Kit's next goal (chapter2.js, nextGoal) is somewhere else. The story's
 * tables come in as `story` ({ sparkle, visible, goal }) so this stays pure.
 */
export function quietPlace(w, sceneId, { sparkle = {}, visible = {}, goal = null } = {}) {
  if (!w.flags?.ch2) return false;
  if (goal?.hot?.split(".")[0] === sceneId) return false;
  return !Object.entries(sparkle).some(([key, rule]) => key.startsWith(`${sceneId}.`) && (visible[key]?.(w) ?? true) && rule(w));
}

/** How much of each step he walks counts toward the next ambush: less in a quiet place, and less still once Calm Seas is lit. */
export const encounterPace = (w, quiet) => (!quiet ? 1 : calmSeas(w) ? 1 / CALM_SEAS : 1 / QUIET);

// ---------------------------------------------------------------- in his words

const pct = (x) => `${Math.round(x * 100)}%`;
const TRACK_WORDS = { sub: "subtraction", mul: "times-table", spell: "spelling", write: "writing", time: "clock", measure: "measuring" };

/**
 * What a node does, in words for him (the Grid's panel): { title, text }.
 * `name(cls)` gives a hero's name as the save has it.
 */
export function about(id, name = (cls) => CLASSES[cls].hero) {
  const node = NODES[id];
  const who = name(node.cls);
  switch (node.kind) {
    case "start":
      return { title: `${who}'s start`, text: node.slot ? `Where ${who}'s road begins. Rivet's slot is here: a pet fights beside ${who}.` : `Where ${who}'s road begins.` };
    case "health":
      return { title: `Health +${node.hp}`, text: `${who} can take more hits: ${node.hp} more health.` };
    case "strength":
      return { title: "Strength", text: `${who}'s hits land ${pct(node.power)} harder.` };
    case "speed":
      return { title: "Quick Step", text: `${who}'s turns come around sooner.` };
    case "overdrive":
      return { title: "Overdrive +1", text: `${who}'s Overdrive combo can go one hit longer.` };
    case "charge":
      return { title: "Quick Charge", text: `${who}'s Overdrive fills ${pct(node.charge)} faster.` };
    case "summon":
      return { title: "Titan Bond", text: `${who}'s Titans hit ${pct(node.summon)} harder.` };
    case "pet_slot": {
      const pet = Object.values(PETS).find((p) => p.owner === node.cls);
      return { title: "Pet slot", text: `A pet can fight beside ${who}${pet ? `, like ${pet.name}` : ""}.` };
    }
    case "pet_power":
      return { title: "Pet Whisperer", text: `Every pet bites, sparks and mends ${pct(node.pets)} harder.` };
    case "calm_seas":
      return { title: "Calm Seas", text: "Fewer fiends in places where there's nothing new left to find." };
    case "gate": {
      const words = node.tracks.map((t) => TRACK_WORDS[t]).join(" or ");
      return { title: "Skill gate", text: `Opens when one of ${who}'s ${words} skills is truly learned: 9 of the last 10 right with no hints, on 3 different days.` };
    }
    case "weapon": {
      const s = WEAPONS[node.cls].steps[node.step];
      return { title: s.name, text: `Forged at the Sword Master's dock for ${FORGE_COST[node.step]} parts and ${FORGE_GLIMMER[node.step]} glimmer. ${who}'s hits land ${pct(WEAPON_POWER[node.step])} harder.` };
    }
    default:
      return { title: "", text: "" };
  }
}

// ---------------------------------------------------------------- for tests and playtests

/**
 * Spend the way a player usually does, with `light` more glimmer and `parts`
 * more parts: every weapon's next step that they cover at the forge (each
 * hero's first step before anyone's second), then the cheapest node
 * anywhere, so every hero moves along (and nothing behind a shut gate). For
 * the balance tests' "typical Grid progress" and playtest checkpoints.
 */
export function spendTypically(w, light, { parts = 0 } = {}) {
  earnLight(w, light);
  addParts(w, parts);
  const heroes = PARTY_ORDER.filter((cls) => !w.party || w.party.includes(cls));
  for (const step of [1, 2]) for (const cls of heroes) if (weaponStep(w, cls) === step - 1) forge(w, cls);
  for (;;) {
    const ready = Object.keys(NODES).filter((id) => nodeState(w, id) === "ready");
    if (!ready.length) return w;
    ready.sort((a, b) => NODES[a].cost - NODES[b].cost || PARTY_ORDER.indexOf(heroOf(a)) - PARTY_ORDER.indexOf(heroOf(b)));
    lightNode(w, ready[0]);
  }
}
