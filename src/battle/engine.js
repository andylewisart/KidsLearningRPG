// The battle rules, with no drawing and no problems in here. The screen
// asks the engine who acts next, runs the problem, then tells the engine
// what happened. Everything is plain data so it's easy to test and save.
//
// Turn order works like Final Fantasy X: every fighter has a "next turn"
// time, faster fighters come around more often, and the order is shown.

import { CLASSES, FIENDS } from "./data.js";

const TIME = 100; // a fighter with speed s acts every TIME / s ticks

// Who hits whom hard. 1.5 for a counter, under 1 for a bad matchup.
const COUNTER = { knight: "armored", gunner: "flier", spellwright: "slime", titancaller: "colossal" };
const RESIST = {
  armored: { gunner: 0.4, spellwright: 0.5, titancaller: 0.6 },
  flier: { knight: 0.4, titancaller: 0.7 },
  slime: { knight: 0.3, gunner: 0.3 },
  colossal: { knight: 0.6, gunner: 0.6, spellwright: 0.6 },
};

export function effectiveness(cls, fiendType) {
  if (COUNTER[cls] === fiendType) return 1.5;
  return RESIST[fiendType]?.[cls] ?? 1;
}

/** Damage bands for the Knight's strikes, as fractions of the fiend's max HP. */
export const STRIKE_BANDS = { 1: [0.1, 0.22], 2: [0.28, 0.45], 3: [0.55, 0.95] };

export function strikeBand(tier, fiend, cls = "knight") {
  const [lo, hi] = STRIKE_BANDS[tier];
  const eff = effectiveness(cls, fiend.type);
  const clamp = (x) => Math.max(1, Math.min(999, Math.round(x)));
  return [clamp(fiend.maxHp * lo * eff), clamp(fiend.maxHp * hi * eff)];
}

export const OVERDRIVE_GAIN = { right: { 1: 12, 2: 18, 3: 28 }, braveMiss: 15 };
export const TITAN_GAIN = { 1: 6, 2: 8, 3: 12 };

/**
 * scale (optional) tunes the fiends for a smaller party, e.g. { hp: 0.85, atk: 0.65 }
 * when the Knight is exploring alone.
 */
export function createBattle({ party, reserve, fiends, rng, titan = null, scale = null }) {
  const hpK = scale?.hp ?? 1;
  const atkK = scale?.atk ?? 1;
  const heroes = [...party, ...(reserve ? [reserve] : [])].map((cls, i) => ({
    key: cls,
    cls,
    name: CLASSES[cls].hero || CLASSES[cls].short,
    hp: CLASSES[cls].hp,
    maxHp: CLASSES[cls].hp,
    speed: CLASSES[cls].speed,
    od: 0,
    defending: false,
    ko: false,
    active: i < party.length,
  }));
  const counts = {};
  const foes = fiends.map((id) => {
    const f = FIENDS[id];
    counts[id] = (counts[id] || 0) + 1;
    const many = fiends.filter((x) => x === id).length > 1;
    return {
      uid: `${id}#${counts[id]}`,
      id,
      name: many ? `${f.name} ${String.fromCharCode(64 + counts[id])}` : f.name,
      type: f.type,
      boss: Boolean(f.boss),
      bars: f.bars || 1,
      bar: 1,
      hp: 0,
      maxHp: messyHp(f.hp * hpK, rng),
      speed: f.speed,
      atk: Math.max(1, Math.round(f.atk * atkK)),
      ko: false,
      captured: false,
      turns: 0,
    };
  });
  for (const f of foes) f.hp = f.maxHp;
  const clock = {};
  for (const h of heroes) clock[h.key] = (TIME / h.speed) * (0.4 + rng.next() * 0.6);
  for (const f of foes) clock[f.uid] = (TIME / f.speed) * (0.6 + rng.next() * 0.6);
  return { heroes, fiends: foes, clock, now: 0, titan, titanGauge: 0, items: { potion: 3 }, over: null, rng, turn: null };
}

/**
 * A fiend's HP, a little off its listed value and never a round number:
 * the Knight subtracts from it, and 300 − 100 practices nothing.
 */
export function messyHp(base, rng) {
  let hp = Math.round(base * (0.94 + rng.next() * 0.1));
  if (hp % 10 === 0) hp += rng.int(1, 9);
  if (hp >= 100 && hp % 100 < 10) hp -= 10 * rng.int(1, 3); // a real tens digit too: 301 → 281
  return Math.min(999, hp);
}

const unit = (b, key) => b.heroes.find((h) => h.key === key) || b.fiends.find((f) => f.uid === key);
const canAct = (u) => u && !u.ko && (u.uid || u.active);

export const activeHeroes = (b) => b.heroes.filter((h) => h.active);
export const livingHeroes = (b) => activeHeroes(b).filter((h) => !h.ko);
export const livingFiends = (b) => b.fiends.filter((f) => !f.ko);
export const reserveHero = (b) => b.heroes.find((h) => !h.active);

/** Advance to the next fighter's turn. Returns its key. */
export function nextTurn(b) {
  let best = null;
  for (const [key, t] of Object.entries(b.clock)) {
    if (!canAct(unit(b, key))) continue;
    if (best === null || t < b.clock[best]) best = key;
  }
  b.now = b.clock[best];
  b.turn = best;
  const u = unit(b, best);
  if (u.cls) u.defending = false; // a guard lasts until the hero's next turn
  return best;
}

/** Call when a fighter's turn is done. */
export function endTurn(b) {
  const u = unit(b, b.turn);
  if (u) b.clock[b.turn] += TIME / u.speed;
  b.turn = null;
  checkOver(b);
}

/** The next n turns, for the turn-order bar. Doesn't change the battle. */
export function preview(b, n = 8) {
  const clock = { ...b.clock };
  if (b.turn && clock[b.turn] !== undefined) clock[b.turn] = b.clock[b.turn];
  const out = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (const [key, t] of Object.entries(clock)) {
      if (!canAct(unit(b, key))) continue;
      if (best === null || t < clock[best]) best = key;
    }
    if (!best) break;
    out.push(best);
    clock[best] += TIME / unit(b, best).speed;
  }
  return out;
}

/**
 * Swap the reserve hero in for `outKey`. The incoming hero takes over this
 * turn and acts right away (Final Fantasy X style).
 */
export function swap(b, outKey) {
  const out = unit(b, outKey);
  const incoming = reserveHero(b);
  if (!out || !incoming || incoming.ko) return null;
  out.active = false;
  out.defending = false;
  incoming.active = true;
  b.clock[incoming.key] = b.clock[outKey];
  if (b.turn === outKey) b.turn = incoming.key;
  return incoming.key;
}

/**
 * Deal damage from a hero. Returns an event:
 * { target, amount, barBroken, ko, captured }
 * Boss health comes in bars; extra damage past a bar is lost, so one hit
 * can break at most one bar.
 */
export function hit(b, heroKey, targetUid, amount, { tier = 1 } = {}) {
  const t = unit(b, targetUid);
  if (!t || t.ko) return null;
  const dmg = Math.max(1, Math.round(amount));
  const ev = { target: targetUid, amount: dmg, barBroken: false, ko: false, captured: false, by: heroKey };
  t.hp = Math.max(0, t.hp - dmg);
  if (t.hp === 0) {
    if (t.bar < t.bars) {
      t.bar += 1;
      t.hp = t.maxHp;
      ev.barBroken = true;
    } else {
      t.ko = true;
      ev.ko = true;
      if (tier === 3 && !t.boss) {
        t.captured = true;
        ev.captured = true;
      }
    }
  }
  return ev;
}

/** Set a fiend's HP directly (the Knight's answer IS the new HP). */
export function setFiendHp(b, targetUid, newHp, { tier = 1, heroKey } = {}) {
  const t = unit(b, targetUid);
  return hit(b, heroKey, targetUid, t.hp - newHp, { tier });
}

export function heal(b, heroKey, amount) {
  const h = unit(b, heroKey);
  if (!h || h.ko) return null;
  const before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + Math.round(amount));
  return { target: heroKey, healed: h.hp - before };
}

export function defend(b, heroKey) {
  const h = unit(b, heroKey);
  if (h) h.defending = true;
}

/** Overdrive and Titan gauge gains after a hero answers. */
export function reward(b, heroKey, { correct, tier }) {
  const h = unit(b, heroKey);
  if (correct) {
    h.od = Math.min(100, h.od + OVERDRIVE_GAIN.right[tier]);
    b.titanGauge = Math.min(100, b.titanGauge + TITAN_GAIN[tier]);
  } else if (tier === 3) {
    h.od = Math.min(100, h.od + OVERDRIVE_GAIN.braveMiss); // brave points
  }
}

export const overdriveReady = (b, heroKey) => unit(b, heroKey)?.od >= 100;
export const titanReady = (b) => b.titanGauge >= 100 && activeHeroes(b).some((h) => h.cls === "titancaller" && !h.ko);

export function spendOverdrive(b, heroKey) {
  unit(b, heroKey).od = 0;
}
export function spendTitan(b) {
  b.titanGauge = 0;
}

/**
 * A fiend's turn: a normal attack on one hero, or the boss's special every
 * third turn. Returns { kind, name, hits: [{ target, amount, ko }], swappedIn }.
 */
export function fiendTurn(b, uid) {
  const f = unit(b, uid);
  const data = FIENDS[f.id];
  f.turns += 1;
  const targets = livingHeroes(b);
  if (!targets.length) return { kind: "idle", hits: [] };
  const roll = () => 0.85 + b.rng.next() * 0.3;
  const special = data.special && f.turns % 3 === 0;
  const hitList = special ? targets : [b.rng.pick(targets)];
  const enraged = f.boss && f.bar === f.bars;
  const hits = hitList.map((h) => {
    let amount = f.atk * roll() * (special ? 0.6 : 1) * (enraged ? 1.25 : 1);
    if (h.defending) amount *= 0.5;
    amount = Math.max(1, Math.round(amount));
    h.hp = Math.max(0, h.hp - amount);
    h.od = Math.min(100, h.od + Math.round((amount / h.maxHp) * 50));
    if (h.hp === 0) h.ko = true;
    return { target: h.key, amount, ko: h.ko };
  });
  // A knocked-out hero steps back and the reserve jumps in automatically.
  let swappedIn = null;
  for (const hitEv of hits) {
    if (!hitEv.ko) continue;
    const r = reserveHero(b);
    if (r && !r.ko) {
      const out = unit(b, hitEv.target);
      out.active = false;
      r.active = true;
      b.clock[r.key] = b.clock[out.key];
      swappedIn = r.key;
    }
  }
  return { kind: special ? "special" : "attack", name: special ? data.special : data.attack, hits, swappedIn };
}

function checkOver(b) {
  if (livingFiends(b).length === 0) b.over = "victory";
  else if (livingHeroes(b).length === 0) b.over = "defeat";
}

export { checkOver };
