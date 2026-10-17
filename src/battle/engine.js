// The battle rules, with no drawing and no problems in here. The screen
// asks the engine who acts next, runs the problem, then tells the engine
// what happened. Everything is plain data so it's easy to test and save.
//
// Turn order works like Final Fantasy X: every fighter has a "next turn"
// time, faster fighters come around more often, and the order is shown.

import { CLASSES, FIENDS } from "./data.js";

const TIME = 100; // a fighter with speed s acts every TIME / s ticks

// Who hits whom hard. 1.5 for a counter, under 1 for a bad matchup.
const COUNTER = { knight: "armored", gunner: "flier", spellwright: "slime", titancaller: "colossal", beastkeeper: "fast" };
const RESIST = {
  armored: { gunner: 0.4, spellwright: 0.5, titancaller: 0.6, beastkeeper: 0.5 },
  flier: { knight: 0.4, titancaller: 0.7 },
  slime: { knight: 0.3, gunner: 0.3 },
  colossal: { knight: 0.6, gunner: 0.6, spellwright: 0.6, beastkeeper: 0.6 },
};

export function effectiveness(cls, fiendType) {
  if (COUNTER[cls] === fiendType) return 1.5;
  return RESIST[fiendType]?.[cls] ?? 1;
}

/** The hero class who counters a type of fiend, or null (beasts: anyone hits them). */
export const counterOf = (fiendType) => Object.keys(COUNTER).find((cls) => COUNTER[cls] === fiendType) || null;

// Hard misses: matchups that can't land at all, rather than landing soft.
// The Knight's sword can't reach a flier. A fast fiend dodges everyone but
// the Beastkeeper until she's Slowed it (a class with `slows` in data.js).
const OUT_OF_REACH = { knight: ["flier"] };

/**
 * Why `heroKey`'s attack on fiend `f` would miss: "reach" (out of reach),
 * "quick" (too quick: a fast fiend nobody has Slowed), or null when it lands.
 * Decided before any problem opens, so a right answer never whiffs. A fight
 * he can't win is worse than a soft hit, so a miss only counts while someone
 * still standing can land a hit on that fiend (or Slow it first).
 */
export function missReason(b, heroKey, f) {
  const h = unit(b, heroKey);
  if (!h || !f) return null;
  const blocked = (cls) => (OUT_OF_REACH[cls]?.includes(f.type) ? "reach" : f.fast && !f.slowed && !CLASSES[cls]?.slows ? "quick" : null);
  const why = blocked(h.cls);
  if (!why) return null;
  const standing = b.heroes.filter((x) => !x.ko);
  const answer = why === "quick" ? standing.some((x) => CLASSES[x.cls]?.slows) : standing.some((x) => !blocked(x.cls));
  return answer ? why : null;
}

/** The fiends `heroKey` can land a hit on right now. */
export const reachable = (b, heroKey) => livingFiends(b).filter((f) => !missReason(b, heroKey, f));

/**
 * How much harder everyone else hits a Slowed fiend, by the stars of the Slow
 * holding it: stuck in her snare, it can't dodge or brace (hit, strikeBand).
 */
export const SLOW_EXPOSE = { 1: 1.25, 2: 1.5, 3: 1.75 };
/** A Slowed fiend that wasn't fast acts this much as often (a fast one drops to its own speed). */
export const SLOW_DRAG = 0.75;
/** The extra a hit on `f` lands for being Slowed (×1 when it isn't). */
export const slowBonus = (f) => (f?.slowed ? SLOW_EXPOSE[f.slowTier] || 1 : 1);
/** Her snare can't hold a boss (the Drain Engine is a Titan's job): she Feeds the party there instead. */
export const slowHolds = (f) => Boolean(f && !f.ko && !f.boss);

/**
 * Tamsin's Slow, at `tier` stars (a retry after help counts as ★): it does no
 * damage. A fast fiend acts at its own speed, once a round, and everyone can
 * hit it; any other fiend acts less often. Either way the rest of the party
 * hits it harder (SLOW_EXPOSE) for the rest of the fight. A stronger Slow
 * replaces a weaker one. Returns true when this slowed it or held it tighter.
 */
export function slow(b, uid, tier = 1) {
  const f = b.fiends.find((x) => x.uid === uid);
  if (!slowHolds(f) || (f.slowed && f.slowTier >= tier)) return false;
  const first = !f.slowed;
  f.slowed = true;
  f.slowTier = tier;
  // its next turn moves back to match
  if (first) b.clock[uid] = Math.max(b.clock[uid], b.now + TIME / speedOf(f));
  return true;
}

/**
 * Her Slow hurts only when nobody else is left to do the hitting: with every
 * other hero knocked out, the snare squeezes (questions.js, SLOW_BASE), since
 * a fight he can't win is worse than a soft rule.
 */
export const snareHurts = (b, heroKey) => !b.heroes.some((h) => h.key !== heroKey && !h.ko);

/**
 * The Beastkeeper's meal for a fiend: it spends its next turn eating, and
 * stays calm for the rest of the fight. A calm fiend can be captured even if
 * it's wary (chapter 2's fiends, see hit). Bosses and machines don't eat.
 * Returns true if it took it.
 */
export const canEat = (f) => Boolean(f && !f.ko && !f.boss && !FIENDS[f.id]?.machine);
export function feed(b, uid) {
  const f = b.fiends.find((x) => x.uid === uid);
  if (!canEat(f)) return false;
  f.calm = true;
  f.eating = true;
  return true;
}

/**
 * A hero's move just bounced off a fiend: who would hit it harder, and how to
 * bring them in. "swap" only when that hero is on the bench (with three heroes
 * or fewer, nobody is); "theirTurn" when the hero who counters it is already
 * fighting; "someoneElse" when a fighter does better without countering it;
 * "goBig" when nobody does. `counter`: the better hero is the one who counters it.
 */
export function matchupAdvice(b, heroKey, fiendType) {
  const eff = (x) => effectiveness(x.cls, fiendType);
  const mine = eff(b.heroes.find((x) => x.key === heroKey));
  const better = b.heroes.filter((x) => !x.ko && eff(x) > mine).sort((p, q) => eff(q) - eff(p))[0];
  if (!better) return { advice: "goBig", counter: false };
  const counter = eff(better) > 1;
  return { advice: !better.active ? "swap" : counter ? "theirTurn" : "someoneElse", counter, hero: better.key };
}

/**
 * Damage bands for the Knight's strikes, as fractions of the fiend's max HP.
 * ★ is a small hit: it mostly charges Overdrive. (Tuned with a simulation:
 * winning on ★ alone should cost health, not be free.)
 */
export const STRIKE_BANDS = { 1: [0.08, 0.16], 2: [0.28, 0.45], 3: [0.55, 0.95] };

/** `power`: how much harder this hero hits, with the Crystal Grid and their weapon (×1 without). */
export function strikeBand(tier, fiend, cls = "knight", power = 1) {
  const [lo, hi] = STRIKE_BANDS[tier];
  const eff = effectiveness(cls, fiend.type) * power * slowBonus(fiend);
  const clamp = (x) => Math.max(1, Math.min(999, Math.round(x)));
  return [clamp(fiend.maxHp * lo * eff), clamp(fiend.maxHp * hi * eff)];
}

/**
 * Overdrive charge. Quick ★ answers charge it nearly as fast as harder ones,
 * so steady play still earns the big moves; taking hits charges it too. The
 * gauge carries over between fights in the adventure. (The Titan Caller's
 * Overdrive is the Titan summon: there's no separate Titan gauge.)
 */
export const OVERDRIVE_GAIN = { right: { 1: 20, 2: 22, 3: 30 }, braveMiss: 20, hurt: 60 };

/** An Overdrive combo: up to this many quick hits, each a little harder than the last (more with the Grid's Overdrive nodes). */
export const OD_CHAIN = 5;
export const OD_HIT = { knight: 75, gunner: 65, spellwright: 70, beastkeeper: 70 };
export const odHitDamage = (cls, i, power = 1) => OD_HIT[cls] * (1 + i * 0.15) * power;
/** How many hits a hero's combo can go to. */
export const comboLength = (h) => OD_CHAIN + (h?.combo || 0);

/**
 * scale (optional) tunes the fiends for a smaller party, e.g. { hp: 0.85, atk: 0.65 }
 * when the Knight is exploring alone. reserve: the hero on the bench, or a list
 * of them (five heroes: three fight, two wait). pets (chapter 2): each hero's
 * companion, { cls: { id, species, stage, power } } (petAct).
 * start: what each hero brings in, { cls: { hp, od } } from the last fight,
 * and in chapter 2 their stats with the Crystal Grid and their weapon
 * (world/grid.js, boosts): maxHp, speed, power (their hits ×), combo (extra
 * Overdrive hits), charge (Overdrive fills ×), summon (Titans hit ×), weapon.
 */
export function createBattle({ party, reserve, fiends, rng, titan = null, scale = null, start = null, pets = null }) {
  const hpK = scale?.hp ?? 1;
  const atkK = scale?.atk ?? 1;
  const heroes = [...party, ...[].concat(reserve || [])].map((cls, i) => ({
    key: cls,
    cls,
    name: CLASSES[cls].hero || CLASSES[cls].short,
    hp: CLASSES[cls].hp,
    maxHp: CLASSES[cls].hp,
    speed: CLASSES[cls].speed,
    power: 1,
    combo: 0,
    charge: 1,
    summon: 1,
    weapon: 0,
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
      fast: Boolean(f.fast), // acts twice a round and dodges every hit until it's Slowed (missReason)
      slowed: false,
      slowTier: 0, // how tight her Slow holds it (SLOW_EXPOSE)
      calm: false, // fed by the Beastkeeper: a ★★★ finish captures it, wary or not
      eating: false, // fed: it eats instead of its next turn
      stolen: 0, // potions it snatched (the Riptide Eel), dropped when it's beaten
      phase: null, // a boss's story phase, once a bar it names is reached (`phases` in data.js)
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
  // the adventure carries health and Overdrive from fight to fight: start = { cls: { hp, od } }.
  // A hero's stats with the Crystal Grid and their weapon come in the same way (world/grid.js, boosts).
  for (const h of heroes) {
    const st = start?.[h.cls];
    if (!st) continue;
    if (Number.isFinite(st.maxHp) && st.maxHp > 0) h.maxHp = h.hp = Math.round(st.maxHp);
    if (Number.isFinite(st.speed) && st.speed > 0) h.speed = st.speed;
    for (const k of ["power", "charge", "summon"]) if (Number.isFinite(st[k]) && st[k] > 0) h[k] = st[k];
    if (Number.isFinite(st.combo) && st.combo > 0) h.combo = Math.round(st.combo);
    if (Number.isFinite(st.weapon) && st.weapon > 0) h.weapon = st.weapon;
    if (Number.isFinite(st.hp)) h.hp = Math.max(0, Math.min(h.maxHp, Math.round(st.hp)));
    if (Number.isFinite(st.od)) h.od = Math.max(0, Math.min(100, Math.round(st.od)));
    h.ko = h.hp <= 0;
  }
  const clock = {};
  for (const h of heroes) clock[h.key] = (TIME / h.speed) * (0.4 + rng.next() * 0.6);
  for (const f of foes) clock[f.uid] = (TIME / speedOf(f)) * (0.6 + rng.next() * 0.6);
  const b = { heroes, fiends: foes, clock, now: 0, titan, items: { potion: 3, biscuit: 0 }, over: null, rng, turn: null, pets: { ...(pets || {}) }, binding: null };
  // a knocked-out hero can't start in the lineup: the reserve steps in
  for (const h of heroes.filter((x) => x.active && x.ko)) {
    const r = reserveHero(b);
    if (r && !r.ko) {
      h.active = false;
      r.active = true;
    }
  }
  return b;
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
/** How often a fighter acts: a fast fiend twice as often, until it's Slowed; any other Slowed fiend less often. */
const speedOf = (u) => u.speed * (u.fast ? (u.slowed ? 1 : 2) : u.slowed ? SLOW_DRAG : 1);

export const activeHeroes = (b) => b.heroes.filter((h) => h.active);
export const livingHeroes = (b) => activeHeroes(b).filter((h) => !h.ko);
export const livingFiends = (b) => b.fiends.filter((f) => !f.ko);
/** Everyone on the bench (one with four heroes, two with five). */
export const benchHeroes = (b) => b.heroes.filter((h) => !h.active);
/** The hero who'd come in next: the first one on the bench who can fight (or the first there at all). */
export const reserveHero = (b) => b.heroes.find((h) => !h.active && !h.ko) || b.heroes.find((h) => !h.active);

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
  if (u) b.clock[b.turn] += TIME / speedOf(u);
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
    clock[best] += TIME / speedOf(unit(b, best));
  }
  return out;
}

/**
 * Swap a hero from the bench in for `outKey`: `inKey`, or the next one up
 * (reserveHero). The incoming hero takes over this turn and acts right away
 * (Final Fantasy X style).
 */
export function swap(b, outKey, inKey = null) {
  const out = unit(b, outKey);
  const incoming = inKey ? unit(b, inKey) : reserveHero(b);
  if (!out || !incoming || incoming.active || incoming.ko) return null;
  out.active = false;
  out.defending = false;
  incoming.active = true;
  b.clock[incoming.key] = b.clock[outKey];
  if (b.turn === outKey) b.turn = incoming.key;
  return incoming.key;
}

/**
 * Deal damage from a hero. Returns an event:
 * { target, amount, barBroken, ko, captured }, and when they happen:
 *   phase     a bar broke into a boss's story phase (FIENDS[id].phases)
 *   held      its last bar hung on at 1 HP: only its `finisher` Titan can end it
 *   returned  potions it had snatched, dropped as it fell
 * Boss health comes in bars; extra damage past a bar is lost, so one hit
 * can break at most one bar. `titan`: the Titan landing this hit, if any.
 */
export function hit(b, heroKey, targetUid, amount, { tier = 1, titan = null, exposed = true } = {}) {
  const t = unit(b, targetUid);
  if (!t || t.ko) return null;
  const data = FIENDS[t.id];
  const last = t.bar === t.bars;
  // a Slowed fiend takes more (exposed: false when it's already in the number, as in the Knight's strike)
  let dmg = Math.max(1, Math.round(amount * (exposed ? slowBonus(t) : 1)));
  // a boss's finisher (Beaconwing tearing the Drain Engine off the tower) takes its last bar whole
  if (last && data?.finisher && titan === data.finisher) dmg = Math.max(dmg, t.hp);
  const ev = { target: targetUid, amount: dmg, barBroken: false, ko: false, captured: false, by: heroKey };
  const before = t.hp;
  t.hp = Math.max(0, t.hp - dmg);
  // ...and nothing else can, while the Titan Caller is standing to summon it
  if (t.hp === 0 && last && data?.finisher && titan !== data.finisher && b.heroes.some((h) => h.cls === "titancaller" && !h.ko)) {
    t.hp = 1;
    ev.amount = Math.max(0, before - 1);
    ev.held = true;
  }
  if (t.hp === 0) {
    if (t.bar < t.bars) {
      t.bar += 1;
      t.hp = t.maxHp;
      ev.barBroken = true;
      if (data?.phases?.[t.bar]) ev.phase = t.phase = data.phases[t.bar];
    } else {
      t.ko = true;
      ev.ko = true;
      // chapter 2's fiends are wary: only a calm one (fed) comes quietly; a machine never does
      if (tier === 3 && !t.boss && !data?.machine && (t.calm || !data?.wary)) {
        t.captured = true;
        ev.captured = true;
      }
      if (t.stolen) {
        b.items.potion += t.stolen;
        ev.returned = t.stolen;
        t.stolen = 0;
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

/**
 * A Salty Biscuit (chapter 2) gets a knocked-out hero back on their feet with
 * `share` of their health, on the field or on the bench. They wait a full
 * turn before acting, like anyone else. Returns { target, hp }, or null.
 */
export function revive(b, heroKey, share) {
  const h = unit(b, heroKey);
  if (!h || !h.ko) return null;
  h.ko = false;
  h.hp = Math.max(1, Math.round(h.maxHp * share));
  b.clock[h.key] = Math.max(b.clock[h.key] ?? 0, b.now + TIME / speedOf(h));
  return { target: h.key, hp: h.hp };
}

/** Heroes a biscuit can wake: anyone knocked out, on the field or the bench. */
export const downedHeroes = (b) => b.heroes.filter((h) => h.ko);

export function defend(b, heroKey) {
  const h = unit(b, heroKey);
  if (h) h.defending = true;
}

/**
 * Overdrive gains after a hero answers. Returns true when this answer filled
 * the gauge (so the screen can say so).
 */
export function reward(b, heroKey, { correct, tier }) {
  const h = unit(b, heroKey);
  const before = h.od;
  const k = h.charge || 1; // the Grid's Quick Charge
  if (correct) h.od = Math.min(100, h.od + Math.round(OVERDRIVE_GAIN.right[tier] * k));
  else if (tier === 3) h.od = Math.min(100, h.od + Math.round(OVERDRIVE_GAIN.braveMiss * k)); // brave points
  return before < 100 && h.od >= 100;
}

export const overdriveReady = (b, heroKey) => unit(b, heroKey)?.od >= 100;

export function spendOverdrive(b, heroKey) {
  unit(b, heroKey).od = 0;
}

/**
 * The fight between turns as plain data, for the save: everything but the
 * dice. A fight saved this way picks up on the same turn (restore).
 */
export function snapshot(b) {
  const { rng, quit, ...rest } = b;
  return JSON.parse(JSON.stringify({ ...rest, turn: null }));
}

/** A saved fight (snapshot) brought back, with dice to roll from here on. */
export function restore(snap, rng) {
  return { ...JSON.parse(JSON.stringify(snap)), rng, turn: null, over: null };
}

/** Health and Overdrive to carry into the next fight: { cls: { hp, od } }. */
export function carryOver(b) {
  const out = {};
  for (const h of b.heroes) out[h.cls] = { hp: h.hp, od: h.od };
  return out;
}

/**
 * A fiend's turn: a normal attack on one hero, or the boss's special every
 * third turn. Returns { kind, name, hits: [{ target, amount, ko }], swappedIn },
 * and `drained` when the special mended it (the Drain Engine). A fed fiend
 * eats instead (kind "eat"), and the Riptide Eel's first move snatches a
 * potion (kind "steal").
 */
export function fiendTurn(b, uid) {
  const f = unit(b, uid);
  const data = FIENDS[f.id];
  f.turns += 1;
  if (f.eating) {
    f.eating = false;
    return { kind: "eat", hits: [] };
  }
  const targets = livingHeroes(b);
  if (!targets.length) return { kind: "idle", hits: [] };
  if (data.steals && f.turns === 1 && b.items.potion > 0) {
    b.items.potion -= 1;
    f.stolen += 1;
    return { kind: "steal", hits: [] };
  }
  const roll = () => 0.85 + b.rng.next() * 0.3;
  const special = data.special && f.turns % 3 === 0;
  const hitList = special ? targets : [b.rng.pick(targets)];
  const enraged = f.boss && f.bar === f.bars;
  const hits = hitList.map((h) => {
    let amount = f.atk * roll() * (special ? 0.6 : 1) * (enraged ? 1.25 : 1);
    if (h.defending) amount *= 0.5;
    amount = Math.max(1, Math.round(amount));
    h.hp = Math.max(0, h.hp - amount);
    h.od = Math.min(100, h.od + Math.round((amount / h.maxHp) * OVERDRIVE_GAIN.hurt));
    if (h.hp === 0) h.ko = true;
    return { target: h.key, amount, ko: h.ko };
  });
  // the Drain Engine drinks what it drains, until its story phase begins
  let drained = 0;
  if (special && data.drain && !f.phase) {
    const before = f.hp;
    f.hp = Math.min(f.maxHp, f.hp + Math.round(hits.reduce((sum, x) => sum + x.amount, 0) * data.drain));
    drained = f.hp - before;
  }
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
  return { kind: special ? "special" : "attack", name: special ? data.special : data.attack, hits, swappedIn, ...(drained ? { drained } : {}) };
}

// ---------------------------------------------------------------- pets (chapter 2)

/** What each kind of pet does (PETS in world/data2.js): three hit a fiend, Chime mends the party. */
export const PET_KINDS = { raptor: "bite", jelly: "spark", slime: "ink", tide: "mend" };
/** A pet's hit by its stage (1 to 3), and Chime's mending for each hero on the field. */
export const PET_POWER = { 1: 30, 2: 50, 3: 80 };
export const PET_MEND = { 1: 20, 2: 35, 3: 55 };
/**
 * ...scaled by how hard its hero's answer was: a nibble after ★, its full
 * bite after ★★, more after ★★★. (Tuned with test/balance.test.js: at full
 * power after every ★, a pet doubled what ★ spam does, and ★ alone should
 * still cost health.)
 */
export const PET_TIER = { 1: 0.5, 2: 1, 3: 1.5 };

/**
 * A hero's pet acts, after its hero's right answer at `tier`: a bite, a spark
 * or an ink splat on the hero's target (or, if that's down, on something the
 * hero could reach), or Chime's bell mending everyone on the field. Returns
 * { pet, kind, hit } or { pet, kind, heals }, or null if it has nothing to do.
 */
export function petAct(b, heroKey, targetUid = null, tier = 2) {
  const pet = b.pets?.[heroKey];
  const h = unit(b, heroKey);
  if (!pet || !h || !h.active || h.ko) return null;
  const stage = Math.max(1, Math.min(3, pet.stage || 1));
  const kind = PET_KINDS[pet.species] || "bite";
  const k = (PET_TIER[tier] ?? 1) * (pet.power || 1); // Tamsin's nodes on the Grid make every pet stronger
  if (kind === "mend") {
    const heals = livingHeroes(b)
      .filter((x) => x.hp < x.maxHp)
      .map((x) => heal(b, x.key, PET_MEND[stage] * k));
    return heals.length ? { pet: pet.id, kind, heals } : null;
  }
  const options = reachable(b, heroKey);
  const t = options.find((f) => f.uid === targetUid) || (options.length ? b.rng.pick(options) : null);
  if (!t) return null;
  return { pet: pet.id, kind, hit: hit(b, heroKey, t.uid, PET_POWER[stage] * k, { tier: 1 }) };
}

// ---------------------------------------------------------------- a Titan wakes (the Drain Engine)

/**
 * A Titan wakes in the middle of a fight (the Drain Engine's last bar, when
 * the keeper reaches the lens). Its caller gets up if she's down, comes onto
 * the field in place of whoever is worst off, and her Overdrive fills to
 * summon it. b.binding holds the Titan until she does. Returns her key.
 */
export function wakeTitan(b, titan, cls = "titancaller") {
  const h = b.heroes.find((x) => x.cls === cls);
  if (!h) return null;
  if (h.ko) {
    h.ko = false;
    h.hp = Math.max(1, Math.round(h.maxHp * 0.4));
  }
  if (!h.active) {
    const out = activeHeroes(b).sort((p, q) => q.ko - p.ko || p.hp / p.maxHp - q.hp / q.maxHp)[0];
    if (out) {
      out.active = false;
      out.defending = false;
      b.clock[h.key] = b.clock[out.key];
      if (b.turn === out.key) b.turn = h.key;
    }
    h.active = true;
  }
  h.od = 100;
  b.binding = titan;
  return h.key;
}

function checkOver(b) {
  if (livingFiends(b).length === 0) b.over = "victory";
  else if (livingHeroes(b).length === 0) b.over = "defeat";
}

export { checkOver };
