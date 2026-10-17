// The battle screen: draws the fight and runs every turn.
// The rules live in battle/engine.js; the questions in battle/questions.js.

import { h, wait, deferred, onKeys } from "./dom.js";
import LAYOUT from "./stage-layout.json";
import { createFx, floatNumber, banner } from "./fx.js";
import { sfx, setMusicMuted, applyVolumes, music, song, ambience, AMBIENCE_FOR, audioManifest } from "./audio.js";
import { createBarker } from "./barks.js";
import { makeSprite, spriteCenter, lunge, recoil, dodge, vanish, artFor, setPose, assetUrl, assetInfo, artTop, playEffect, portraitFor, setMood } from "./sprites.js";
import { createDialogue, kitPortraits } from "./dialogue.js";
import { askPuzzle } from "./ask.js";
import { clockFace } from "./visuals.js";
import { createStage, profileFor } from "./scene.js";
import { iconLabel, uiIcon, MOVE_ICON } from "./icons.js";
import { ProblemPanel } from "./panels.js";
import { openTutor } from "./tutor.js";
import { CLASSES, FIENDS, FIEND_TYPES, TITANS } from "../battle/data.js";
import * as E from "../battle/engine.js";
import { makeQuestion, overdriveQuestion, feedQuestion, askedText, givenText, youngPotion } from "../battle/questions.js";
import { LADDERS, SKILLS } from "../learn/skills.js";
import { genHeal, genAdd, diagnoseArith } from "../learn/arith.js";
import { arithHint } from "../learn/hints.js";
import { FRAMES, POWERS, MOVE_NAMES, fillFrame, heuristicJudge } from "../learn/writing.js";
import { judgeEntrance } from "../ai/claude.js";
import { tutorContext } from "../ai/prompts.js";
import { speak, stopSpeaking } from "../ai/voice.js";
import { quip } from "../content/quips.js";
import { KIT_LINES } from "../content/kitLines.js";
import { banterFor } from "../content/barks.js";
import { CONVOS2 } from "../world/lines2.js";
import { PETS, BISCUITS } from "../world/data2.js";
import { bindPuzzle } from "../world/puzzles2.js";
import { LANTERN_SONG, SONG_STAND_IN } from "../world/chapter2.js";
import { getSave, update, spendUsage } from "../store/save.js";
import { activeNow, playClock } from "./clock.js";

// Where everyone stands. Shared with the art guides (tools/art/make_guides.py),
// so painted floors line up with the fighters' feet.
const HERO_SLOTS = LAYOUT.heroSlots;
const BENCH = LAYOUT.bench; // off-screen right: the reserve runs in when swapped
const FIEND_SLOTS = LAYOUT.fiendSlots;
const HERO_SIZE = LAYOUT.sizes.hero;
const FIEND_SIZE = LAYOUT.sizes.fiend;
const BOSS_SIZE = LAYOUT.sizes.boss;
const TIER_MULT = { 1: 0.8, 2: 1, 3: 1.3 };
const SUMMON_MULT = 1.6; // a summon is an Overdrive: it hits like one (test/balance.test.js assumes this)
const TONIC = 0.35; // the Beastkeeper's tonic heals this share of a hero's health
// Chapter 2's pets stand at their heroes' feet: an offset from the feet for each
// slot (the back hero's pet on its right, where there's room), and their size.
const PET_SPOTS = [[-84, 8], [80, 4], [-86, 4]];
const PET_SIZE = [96, 96];

/** A hero's forged weapon (world/forge.js), small, beside their name in the party window: nothing before it's forged. */
function weaponIcon(x) {
  const icon = x.weapon ? uiIcon(`ally_${x.cls}_${x.weapon}`, "weapons_ch2") : null;
  icon?.classList.add("weapon-icon");
  return icon;
}

// Each fiend's attack sound (sampled; silent if the pack doesn't have it).
// Chapter 2's fiends borrow chapter 1's sounds until theirs are made.
const FIEND_SFX = {
  scrap_raptor: "sfx_raptor",
  volt_jelly: "sfx_jelly",
  magnet_beetle: "sfx_beetle",
  ink_slime: "sfx_slime",
  dominion_drone: "sfx_drone",
  geode_titan: "sfx_geode_slam",
  barnacle_brute: "sfx_beetle",
  wick_moth: "sfx_fire",
  fog_glob: "sfx_slime",
  tick_mimic: "sfx_beetle",
  crumb_goblin: "sfx_raptor",
  riptide_eel: "sfx_splash",
  caged_drone: "sfx_drone",
  drain_engine: "sfx_geode_slam",
};
// And its own noises (sfx_<name>_cry, _hurt, _ko, _idle in tools/audio/sounds.json): a cry
// when the fight starts, a yelp when it's hit, a sound when it's beaten, and idle growls,
// clicks and gurgles while he thinks. The Geode Titan has hurt and idle (it roars on entry).
// Chapter 2's borrow a chapter 1 fiend's, pitched up or down (FIEND_PITCH).
const FIEND_NOISE = {
  scrap_raptor: "raptor",
  volt_jelly: "jelly",
  magnet_beetle: "beetle",
  ink_slime: "slime",
  dominion_drone: "drone",
  geode_titan: "geode",
  barnacle_brute: "beetle",
  wick_moth: "jelly",
  fog_glob: "slime",
  tick_mimic: "beetle",
  crumb_goblin: "raptor",
  riptide_eel: "slime",
  caged_drone: "drone",
  drain_engine: "drone",
};
const FIEND_PITCH = { barnacle_brute: 0.85, wick_moth: 1.2, fog_glob: 0.8, tick_mimic: 1.15, crumb_goblin: 1.35, riptide_eel: 1.1, caged_drone: 0.9, drain_engine: 0.6 };
// How each fiend's attack lands on a hero: the painted effect (canvas sparks
// if it's missing), the spark color, and how far it lunges. specialFx: its
// special's effect on every hero (the Geode Titan's crystals by default).
const FIEND_HIT = {
  scrap_raptor: { fx: "fx_slash", color: "#ffb35c", reach: 130 },
  volt_jelly: { fx: "fx_lightning", color: "#bfe6ff", reach: 40 },
  magnet_beetle: { fx: "fx_slash", color: "#d9b0ff", reach: 160 },
  ink_slime: { fx: null, color: "#8a6bff", reach: 90, drip: true },
  dominion_drone: { fx: "fx_slash", color: "#ff7d7d", reach: 110 },
  geode_titan: { fx: "fx_slash", color: "#ff9de6", reach: 150 },
  barnacle_brute: { fx: "fx_slash", color: "#e8c39a", reach: 150 },
  wick_moth: { fx: "fx_fire", color: "#ffd38a", reach: 50 },
  fog_glob: { fx: null, color: "#cfd8e6", reach: 90, drip: true },
  tick_mimic: { fx: "fx_slash", color: "#ffd36b", reach: 140 },
  crumb_goblin: { fx: null, color: "#d9a066", reach: 120 },
  riptide_eel: { fx: "fx_splash", color: "#8fd8ff", reach: 170 },
  caged_drone: { fx: "fx_slash", color: "#ff7d7d", reach: 110 },
  drain_engine: { fx: "fx_slash", color: "#ffe6a8", reach: 150, specialFx: "fx_lightning", specialColor: "#fff3c4" },
};

/** One of Kit's chapter 2 battle lines (world/lines2.js: recorded with the story's), or a chapter 1 one. */
const kitText = (key) => KIT_LINES[key] || CONVOS2[key]?.[0]?.text || "";
/** A fight's music: chapter 2 has its own battle and boss tracks, chapter 1's while those aren't in the sound pack. */
function fightMusic(boss, ch2) {
  const own = ch2 && (boss ? "music_boss_engine" : "music_battle_harbor");
  return own && audioManifest().sounds?.[own] ? own : boss ? "music_boss" : "music_battle";
}

/** One line per fight in the save, for the grown-ups' play report. */
function logBattle(encounter, outcome, stats, ms) {
  update((s) => {
    s.battles.push({
      t: Date.now(),
      id: encounter.id,
      title: encounter.title,
      outcome,
      minutes: Math.round(ms / 6000) / 10,
      active: true, // minutes of play (clock.js); older entries were clock time, breaks and all
      right: stats.right,
      total: stats.total,
      hints: stats.hints,
      best: stats.best,
      tiers: stats.tiers,
      swaps: stats.swaps,
      potions: stats.potions,
      guards: stats.guards,
      overdrives: stats.overdrives,
      summons: stats.summons,
      captures: stats.captures.length,
    });
    if (s.battles.length > 60) s.battles.splice(0, s.battles.length - 60);
  });
}

/**
 * A fight, start to finish. Options:
 *   saveAs  where the fight belongs ({ kind: "adventure", scene, script }): it's
 *           saved between turns (save.fight), so closing the game or leaving
 *           from the pause menu doesn't lose it; explore.js picks it up again.
 *           Without it (the set battles), leaving starts the fight over.
 *   resume  that saved fight, to pick up where it was.
 */
export async function runBattle(app, encounter, { mastery, rng, saveAs = null, resume = null }) {
  const save = getSave();
  const names = save.names;
  const heroName = (cls) => names[cls] || CLASSES[cls].hero || CLASSES[cls].short;
  const b = resume ? E.restore(resume.b, rng) : E.createBattle({ party: encounter.party, reserve: encounter.reserve, fiends: encounter.fiends, rng, scale: encounter.scale, start: encounter.start, pets: encounter.pets });
  if (!resume && Number.isFinite(encounter.potions)) b.items.potion = encounter.potions;
  if (!resume && Number.isFinite(encounter.biscuits)) b.items.biscuit = encounter.biscuits;
  b.items.biscuit ||= 0; // a fight saved before biscuits
  b.pets ||= {}; // a fight saved before pets
  // Chapter 2's fights: Kit's lines for the wrong hero, the new fiends' kinds, the Engine's phases
  const ch2 = encounter.chapter === 2 || b.fiends.some((f) => FIENDS[f.id]?.chapter === 2);
  // the Drain Engine (a boss only its own Titan can finish): Clamp drives it, until the keeper reaches the lens
  const engine = b.fiends.find((f) => FIENDS[f.id]?.finisher) || null;
  // A boss fight: the lair's crystals sing to the Titan, and the Titan Caller's
  // Overdrive fills right after the boss's entrance, where everyone can see it
  // (it used to just be full, which looked like a bug after she'd spent it).
  const bossCaller = encounter.boss ? b.heroes.find((x) => x.cls === "titancaller") : null;
  // the first fight after a hero joins shows off their Overdrive: it starts full
  const lesson = !resume && encounter.odLesson && b.heroes.find((x) => x.cls === encounter.odLesson && x.active && !x.ko);
  if (lesson) lesson.od = 100;
  b.heroes.forEach((x) => (x.name = heroName(x.cls)));
  if (new URLSearchParams(location.search).has("debug")) window.__battle = b; // for automated playtests
  // feeds, slows and pets: the Beastkeeper's commands and pets' turns; growth: each pet's ★★ and ★★★ right answers (state.js, afterBattle);
  // rightByTier: the right answers by tier, for the fight's glimmer (world/grid.js, glimmerFor)
  const stats = { right: 0, rightByTier: { 1: 0, 2: 0, 3: 0 }, total: 0, streak: 0, best: 0, captures: [], defeated: [], hints: 0, tiers: { 1: 0, 2: 0, 3: 0 }, swaps: 0, potions: 0, biscuits: 0, guards: 0, overdrives: 0, summons: 0, feeds: 0, slows: 0, pets: 0, growth: {}, ...(resume ? JSON.parse(JSON.stringify(resume.stats)) : {}) };
  stats.growth ||= {};
  /** A right answer, first try with no hint, at its tier. */
  const countRight = (tier) => {
    stats.right += 1;
    const t = Math.max(1, Math.min(3, tier || 1));
    stats.rightByTier[t] = (stats.rightByTier[t] || 0) + 1;
  };
  // minutes actually played (clock.js), counting the time before it was saved
  const startedAt = activeNow() - (resume?.activeMs || 0);

  // ------------------------------------------------------------ layout
  const screen = h("div.screen.battle");
  const field = h("div.battlefield");
  const bgUrl = encounter.background && assetUrl(encounter.background);
  if (!bgUrl) field.append(h("div.bg.holo")); // no painted arena yet: the hologram grid
  // The living stage: a drifting camera that pushes in on big moments, the
  // arena drawn with depth parallax, and sprites that breathe (scene.js).
  // Fighters, effects and damage numbers live in its world layer, so the
  // camera moves them all together.
  const stage = createStage(field, { background: bgUrl ? encounter.background : null, mode: "battle" });
  const layer = stage.world;
  const fx = createFx(stage.world);
  const order = h("div.turn-order");
  const title = h("div.encounter-title", {}, encounter.title);
  const command = h("div.window.command");
  const party = h("div.window.party");
  const kitBubble = h("div.bubble", { style: { display: "none" } });
  const kitFace = portraitFor("droid", "neutral", kitPortraits());
  const kit = h("div.kit", {}, h("div.droid", {}, kitFace), kitBubble);
  screen.append(field, order, title, command, party, kit);
  app.replaceChildren(screen);
  // a saved Engine fight past the lens picks up under the Lantern Song
  if (resume && b.binding) playLantern();
  else music.play(fightMusic(encounter.boss, ch2));
  if (AMBIENCE_FOR[encounter.background]) ambience.play(AMBIENCE_FOR[encounter.background]);
  else ambience.stop();

  const sprites = {};
  for (const hero of b.heroes) {
    const tag = h("div.tag", {}, hero.name);
    sprites[hero.key] = makeSprite({ id: hero.cls, side: "hero", x: 0, y: 0, size: HERO_SIZE, label: tag });
    layer.append(sprites[hero.key]);
    placeTag(sprites[hero.key], tag, 26);
  }
  // Chapter 2: each hero's pet, at their feet (layoutHeroes). Pets are painted facing right, so they're flipped to face the fiends.
  const petSprites = {};
  for (const hr of b.heroes) {
    const pet = b.pets[hr.key];
    if (!pet) continue;
    const id = `pet_${pet.species}_${pet.stage || 1}`;
    petSprites[hr.key] = makeSprite({ id, side: "pet", x: 0, y: 0, size: PET_SIZE });
    layer.append(petSprites[hr.key]);
    stage.live(petSprites[hr.key], profileFor(id), { flip: true });
  }
  const fiendSlots = FIEND_SLOTS[Math.min(3, b.fiends.length)];
  b.fiends.forEach((f, i) => {
    const [x, y] = fiendSlots[i];
    const size = f.boss ? BOSS_SIZE : FIEND_SIZE;
    // fiend-status: FAST, SLOWED, CALM (refresh)
    const tag = h("div.tag", {}, h("div", {}, f.name), h("div.mini-hp", {}, h("i", { style: { width: "100%" } })), f.boss ? h("div.bars") : null, h("div.fiend-status"));
    tag.style.top = f.boss ? "-40px" : "-34px";
    const el = makeSprite({ id: f.id, side: "fiend", x, y, size, label: tag });
    sprites[f.uid] = el;
    layer.append(el);
    placeTag(el, tag, f.boss ? 44 : 38);
  });

  for (const x of b.heroes) stage.live(sprites[x.key], "hero");
  for (const f of b.fiends) stage.live(sprites[f.uid], profileFor(f.id));

  // The foreground painting never hides a fighter: where it reaches over the
  // slots (the harbor's barrels, the lighthouse rocks), it fades while it
  // covers anyone standing there, as it does off him in the adventure.
  let fgCheck = 0;
  stage.onLayout((dt) => {
    if ((fgCheck -= dt) > 0) return;
    fgCheck = 0.3;
    const standing = [...Object.values(sprites), ...Object.values(petSprites)].filter((el) => !el.matches(".benched, .gone, .ko"));
    const covered = standing.some((el) => {
      const [x, y, w, tall] = ["left", "top", "width", "height"].map((k) => parseFloat(el.style[k]));
      return stage.fgCover([0.2, 0.5, 0.8].flatMap((k) => [-0.2, 0, 0.2].map((d) => [x + d * w, y - k * tall]))) > 0.35;
    });
    stage.fadeForeground(covered ? 0.28 : 1);
  });

  /** Lean the camera toward a point on the battlefield for a moment. */
  function pushToward(x, { zoom = 1.04, k = 0.08, inMs = 260, holdMs = 360, outMs = 650 } = {}) {
    stage.camera.push({ x: (x - 640) * k, y: -6, zoom, inMs, holdMs, outMs });
  }

  /** Move a name tag down to just above the painted art (holograms fill their box already). */
  function placeTag(el, tag, gap) {
    artTop(el).then((top) => {
      if (top != null && top > gap) tag.style.top = `${Math.round(top - gap)}px`;
    });
  }

  // ------------------------------------------------------------ helpers
  const hero = (key) => b.heroes.find((x) => x.key === key);
  const fiend = (uid) => b.fiends.find((x) => x.uid === uid);
  const lastYelp = new Map();
  let fiendsQuiet = false; // the Titan summon has the stage
  /** A fiend's own noise (cry, hurt, ko or idle), a little different in pitch each time. */
  function fiendNoise(f, kind, volume = 1) {
    const n = FIEND_NOISE[f?.id];
    if (!n) return false;
    if (kind === "hurt") {
      const now = performance.now();
      if (now - (lastYelp.get(f.uid) || 0) < 450) return true; // a volley of hits yelps once
      lastYelp.set(f.uid, now);
    }
    return sfx.play(`sfx_${n}_${kind}`, { volume, rate: (FIEND_PITCH[f.id] || 1) * (0.94 + Math.random() * 0.12) });
  }
  /** Every so often, one of the fiends fidgets out loud (softly), until the fight is over. */
  function fidget() {
    setTimeout(() => {
      if (b.over || !screen.isConnected) return;
      const alive = E.livingFiends(b);
      if (!fiendsQuiet && alive.length) fiendNoise(alive[Math.floor(Math.random() * alive.length)], "idle", 0.5);
      fidget();
    }, 7000 + Math.random() * 6000);
  }
  const unitName = (key) => hero(key)?.name || fiend(key)?.name || key;
  /** A small round face for the turn-order bar: hero portraits, fiend portraits (wave 02). */
  const faces = new Map();
  function chipFace(key) {
    if (!faces.has(key)) {
      const hr = hero(key);
      const f = fiend(key);
      let pic = null;
      if (hr && assetInfo(hr.cls)?.portraits?.src) pic = portraitFor(hr.cls, "neutral");
      else if (f) {
        const a = assetInfo(f.id);
        const src = a?.portrait?.src || a?.base?.src;
        if (src) pic = h("img", { src: `assets/${src}`, alt: "", draggable: false });
      }
      faces.set(key, pic ? h(`span.face${hr ? ".hero" : ""}`, {}, pic) : null);
    }
    const el = faces.get(key);
    return el ? el.cloneNode(true) : null;
  }
  const barker = createBarker({
    screen,
    rng,
    spriteFor: (cls) => {
      if (cls === "clamp") return engine && !engine.ko ? sprites[engine.uid] : null; // from the Engine's cockpit
      const x = b.heroes.find((y) => y.cls === cls && y.active);
      return x ? sprites[x.key] : null;
    },
    blocked: () => Boolean(activePanel) || Boolean(screen.querySelector(".window.tiers, .window.pause, .window.problem, .window.dialogue, .titan-rise")),
    // Clamp's face is the Engine's: him in its glass cockpit
    faceFor: (who) => {
      const src = who === "clamp" && assetUrl("drain_engine", "portrait");
      return src ? h("img", { src, alt: "", draggable: false }) : null;
    },
  });
  const activeHeroes = () => b.heroes.filter((x) => x.active && !x.ko);
  /** Someone on the field other than `notKey` (for cheering him on). */
  const otherHero = (notKey) => {
    const list = activeHeroes().filter((x) => x.key !== notKey);
    return list.length ? rng.pick(list) : null;
  };
  /** A Titan's name: Tidebreaker can be renamed in the grown-ups corner, Beaconwing can't (yet). */
  const titanName = (id) => (id === "titan_starter" ? names.titan || TITANS.titan_starter.name : TITANS[id]?.name || "the Titan");
  /** Who the Beastkeeper can feed: a hero who's hurt (a tonic), or a fiend that isn't calm yet (a meal; bosses and machines don't eat). */
  const feedable = () => [...E.livingHeroes(b).filter((x) => x.hp < x.maxHp), ...E.livingFiends(b).filter((f) => E.canEat(f) && !f.calm)];
  /** Once ever: a lesson or a first that Kit only says one time (save.progress). */
  const firstTime = (flag) => {
    if (getSave().progress[flag]) return false;
    update((s) => (s.progress[flag] = true));
    return true;
  };
  const lowWarned = new Set();
  let chargeWarned = false; // Kit explains the boss's charge-up once, then keeps it short
  // the Drain Engine's lens: a bar broke into its phase this turn (handled once the turn is over),
  // and from then on the fight is quiet (no Clamp, no jokes) until the Titan is bound
  let pendingPhase = null;
  let phaseTwo = Boolean(engine?.phase);
  let bound = null; // { titan, words }: the Titan he bound in this fight
  let clampLow = false; // Clamp's "more forms" line, once
  let engineDented = false; // Kit's line after Tidebreaker hits the Engine, once a fight
  layoutHeroes();
  refresh();
  requestAnimationFrame(() => field.classList.add("ready")); // from now on, swaps slide

  function layoutHeroes() {
    let i = 0;
    for (const hr of b.heroes) {
      const el = sprites[hr.key];
      const pet = petSprites[hr.key];
      if (hr.active) {
        const [x, y] = HERO_SLOTS[i];
        Object.assign(el.style, { left: `${x}px`, top: `${y}px`, zIndex: 11 + 2 * i });
        el.classList.remove("benched");
        if (pet) {
          // just in front of its hero (and of the hero behind)
          const [dx, dy] = PET_SPOTS[i];
          Object.assign(pet.style, { left: `${x + dx}px`, top: `${y + dy}px`, zIndex: 12 + 2 * i });
          pet.classList.remove("benched");
        }
        i += 1;
      } else {
        Object.assign(el.style, { left: `${BENCH[0]}px`, top: `${BENCH[1]}px`, zIndex: 5 });
        el.classList.add("benched");
        if (pet) {
          Object.assign(pet.style, { left: `${BENCH[0]}px`, top: `${BENCH[1]}px`, zIndex: 5 });
          pet.classList.add("benched");
        }
      }
      el.classList.toggle("ko", hr.ko);
      pet?.classList.toggle("ko", hr.ko);
    }
  }

  /** A fiend's state, over its health bar: FAST until it's Slowed, SLOWED (with her stars) once she has; CALM once it's fed (EATING first). */
  function fiendStatus(f) {
    const list = [];
    if (f.slowed) list.push(["slow", `Slowed ${"★".repeat(f.slowTier || 1)}`, "icons_elements_status:slow"]);
    else if (f.fast) list.push(["fast", "Fast", "icons_elements_status:haste"]);
    if (f.eating) list.push(["calm", "Eating", "icons_items:fish"]);
    else if (f.calm) list.push(["calm", "Calm", "icons_items:fish"]);
    return list;
  }

  function refresh() {
    // turn order
    const next = E.preview(b, 8);
    // the hero who counters a fiend on the field glows, so he knows who to use on it
    const counters = new Set(E.livingFiends(b).map((f) => E.counterOf(f.type)));
    const glows = (key) => Boolean(hero(key) && counters.has(hero(key).cls));
    order.replaceChildren(
      h("span.label", {}, "TURN ORDER"),
      ...next.map((key, i) => h(`div.chip${fiend(key) ? ".fiend" : ""}${glows(key) ? ".counter" : ""}${i === 0 && b.turn ? ".now" : ""}`, {}, chipFace(key), h("span", {}, unitName(key)))),
    );
    // party window
    const rows = b.heroes
      .filter((x) => x.active)
      .map((x) => {
        const low = x.hp / x.maxHp < 0.3;
        return h(
          `div.party-row${b.turn === x.key ? ".now" : ""}${x.ko ? ".down" : ""}`,
          {},
          h("span.name", {}, weaponIcon(x), x.name),
          h(`div.bar.hp${low ? ".low" : ""}`, {}, h("i", { style: { width: `${(x.hp / x.maxHp) * 100}%` } })),
          h("span.hpnum", {}, `${x.hp}/${x.maxHp}`),
          h("div.od-cell", {}, "OD", h(`div.bar.od${x.od >= 100 ? ".full" : ""}`, {}, h("i", { style: { width: `${x.od}%` } }))),
        );
      });
    // everyone on the bench: one with four heroes, two with five
    for (const bench of E.benchHeroes(b))
      rows.push(h(`div.party-row.bench${bench.ko ? ".down" : ""}${!bench.ko && glows(bench.key) ? ".counter" : ""}`, {}, h("span", {}, `${bench.name} (bench)`), h("span", {}, "Swap in on any hero's turn"), h("span.hpnum", {}, `${bench.hp}/${bench.maxHp}`), h("span")));
    party.replaceChildren(...rows);
    // fiend HP bars
    for (const f of b.fiends) {
      const el = sprites[f.uid];
      const bar = el.querySelector(".mini-hp i");
      if (bar) bar.style.width = `${(f.hp / f.maxHp) * 100}%`;
      const bars = el.querySelector(".bars");
      if (bars) bars.textContent = `HP bar ${f.bar} of ${f.bars}`;
      const status = el.querySelector(".fiend-status");
      const now = f.ko ? [] : fiendStatus(f);
      if (status && status.dataset.now !== String(now.map((x) => x[1]))) {
        status.dataset.now = String(now.map((x) => x[1]));
        status.replaceChildren(...now.map(([kind, label, icon]) => h(`span.st.${kind}`, {}, uiIcon(icon), label)));
      }
    }
    for (const x of b.heroes) {
      sprites[x.key].classList.toggle("acting", b.turn === x.key);
      sprites[x.key].classList.toggle("guarding", Boolean(x.defending) && !x.ko);
    }
    for (const f of b.fiends) sprites[f.uid].classList.toggle("acting", b.turn === f.uid);
  }

  let kitTimer = null;
  let activePanel = null; // while a problem window is open, Kit talks inside it
  function kitSay(text, { voice = true, ms = 5200, mood = "neutral" } = {}) {
    if (!text) return;
    barker.hush(); // never on top of Kit
    setMood(kitFace, mood);
    if (voice) speak(text, "droid", mood === "worried" ? { tag: "[gently]" } : {});
    if (activePanel) {
      kitHide();
      activePanel.note(names.droid || "Kit", text);
      return;
    }
    kitBubble.replaceChildren(h("span.name", {}, (names.droid || "Kit").toUpperCase()), text);
    kitBubble.style.display = "block";
    clearTimeout(kitTimer);
    kitTimer = setTimeout(kitHide, ms);
  }
  function kitHide() {
    clearTimeout(kitTimer);
    kitBubble.style.display = "none";
    setMood(kitFace, "neutral");
  }
  /** Open a problem window (Kit's bubble moves into it). */
  function openPanel(opts) {
    kitHide();
    barker.hush(); // he's thinking: no chatter
    const panel = new ProblemPanel(screen, { ...opts, player: mastery.badge?.() });
    activePanel = panel;
    const close = panel.close.bind(panel);
    panel.close = () => {
      if (activePanel === panel) activePanel = null;
      close();
    };
    return panel;
  }

  function persist(q, { correct, hinted, ms, code, given }) {
    stats.total += 1;
    if (correct && !hinted) {
      countRight(q.tier);
      stats.streak += 1;
      stats.best = Math.max(stats.best, stats.streak);
    } else stats.streak = 0;
    mastery.record(q.skill, { correct, tier: q.tier || 1, hinted, ms });
    update((s) => {
      if (mastery.saveInto) mastery.saveInto(s);
      else s.mastery = mastery.toJSON();
      s.log.push({ t: Date.now(), who: mastery.player?.id, skill: q.skill, tier: q.tier || 1, correct, hinted, ms: Math.round(ms || 0), mistake: code || null, given: givenText(q, given), answer: q.answerText, asked: askedText(q) });
      if (q.word) {
        const w = (s.collection.words[q.word] ||= { right: 0, wrong: 0 });
        if (correct) w.right += 1;
        else {
          w.wrong += 1;
          s.collection.missedWords = [q.word, ...s.collection.missedWords.filter((x) => x !== q.word)].slice(0, 40);
        }
      }
    });
  }

  // ------------------------------------------------------------ menus
  function chooseCommand(hr) {
    const d = deferred();
    const cls = CLASSES[hr.cls];
    const items = [
      // a forged weapon (world/forge.js) on the move's button
      { id: "move", label: cls.command, icon: hr.weapon && uiIcon(`ally_${hr.cls}_${hr.weapon}`, "weapons_ch2") ? `weapons_ch2:ally_${hr.cls}_${hr.weapon}` : MOVE_ICON[hr.cls] },
      // the Beastkeeper's second command: a tonic for a hero who's hurt, a meal for a fiend
      ...(cls.feeds ? [{ id: "feed", label: "🐟 Feed", icon: "icons_items:fish", disabled: !feedable().length }] : []),
      { id: "item", label: `🧪 Potion ×${b.items.potion}`, icon: "potion", disabled: b.items.potion <= 0 },
      // chapter 2: the baker's biscuits wake a knocked-out hero (only once he has some)
      ...(b.items.biscuit > 0 ? [{ id: "biscuit", label: `🍪 Biscuit ×${b.items.biscuit}`, icon: "icons_items:biscuit", disabled: !E.downedHeroes(b).length }] : []),
      { id: "swap", label: "🔄 Swap", icon: "swap", disabled: !E.benchHeroes(b).some((x) => !x.ko) },
      { id: "guard", label: "🛡 Guard", icon: "guard" },
    ];
    // a full Overdrive goes on its own row at the top, picked already
    const od = E.overdriveReady(b, hr.key);
    if (od) items.unshift({ id: "overdrive", label: hr.cls === "titancaller" ? `🐉 Summon ${titanName(b.binding || "titan_starter")}` : `💥 ${cls.overdrive}`, icon: hr.cls === "titancaller" ? "summon" : "overdrive", cls: hr.cls === "titancaller" ? "summon" : "od" });
    // where each item sits, for the arrow keys: [row, column]
    const cells = items.map((_, i) => (od ? (i === 0 ? [0, 0] : [1 + Math.floor((i - 1) / 2), (i - 1) % 2]) : [Math.floor(i / 2), i % 2]));
    let sel = 0;
    const buttons = items.map((it, i) =>
      h(`button${it.cls ? "." + it.cls : ""}`, { onclick: () => pick(i), disabled: it.disabled, onmouseenter: () => mark(i) }, ...iconLabel(it.icon, it.label)),
    );
    const menuBtn = h("button.menu-btn", { onclick: () => openPause(), title: "Pause (Esc)" }, ...iconLabel("menu", "⏸ Pause"));
    command.replaceChildren(h("div.who", {}, h("span", {}, `${hr.name}'s turn`, playerBadge()), menuBtn), h(`div.menu${od ? ".has-od" : ""}`, {}, ...buttons));
    let paused = false;
    async function openPause() {
      if (paused) return;
      paused = true;
      const choice = await pauseMenu();
      paused = false;
      if (choice === "quit") {
        off();
        b.quit = true;
        d.resolve("quit");
      }
    }
    const mark = (i) => {
      sel = i;
      buttons.forEach((bt, j) => bt.classList.toggle("sel", j === sel));
    };
    mark(sel);
    const off = onKeys((e) => {
      if (paused) return;
      if (e.key === "Escape") return openPause();
      const n = Number(e.key);
      if (n >= 1 && n <= items.length) return pick(n - 1);
      const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (move) {
        const [r, c] = cells[sel];
        const want = [r + move[0], c + move[1]];
        // the same column in the next row (or the only button in it), else stay put
        const row = cells.map((x, i) => [x, i]).filter(([x]) => x[0] === want[0]);
        const hit = row.find(([x]) => x[1] === want[1]) || (move[0] ? row[Math.min(row.length - 1, c)] : null);
        if (hit) mark(hit[1]);
      }
      if (e.key === "Enter") pick(sel);
    });
    function pick(i) {
      if (items[i].disabled) return;
      off();
      sfx.select();
      command.replaceChildren(h("div.who", {}, h("span", {}, `${hr.name}'s turn`, playerBadge())));
      d.resolve(items[i].id);
    }
    return d.promise;
  }

  /** Paused: resume, sound and voice switches, or leave the fight. Resolves "resume" | "quit". */
  function pauseMenu() {
    const d = deferred();
    const settings = () => getSave().settings;
    const label = (on, what) => `${what}: ${on ? "on" : "off"}`;
    const soundBtn = h("button.btn", { onclick: () => flip("sound") }, label(settings().sound, "🔊 Sound"));
    const voiceBtn = h("button.btn", { onclick: () => flip("voice") }, label(settings().voice, "🗣 Read aloud"));
    const heroBtn = h("button.btn", { onclick: () => flip("heroVoices") }, label(settings().heroVoices !== false, "🎭 Character voices"));
    const leave = saveAs ? "Leave for now? This fight is saved. Continue picks up right here." : "Leave this fight? His answers so far are saved. The fight starts fresh next time.";
    const confirmRow = h("div.pause-confirm", { style: { display: "none" } }, h("p", {}, leave), h("div.row", {}, h("button.btn.gold", { onclick: () => done("quit") }, "Leave (Y)"), h("button.btn", { onclick: () => showConfirm(false) }, "Stay (N)")));
    const quitBtn = h("button.btn.ghost", { onclick: () => showConfirm(true) }, saveAs ? "🏠 Save and quit" : "🏠 Quit to title");
    const win = h("div.window.pause", {}, h("h2", {}, "Paused"), h("div.pause-buttons", {}, h("button.btn.gold", { onclick: () => done("resume") }, "▶ Resume (Esc)"), soundBtn, voiceBtn, heroBtn, quitBtn), confirmRow);
    const dim = h("div.dimmer", { style: { zIndex: 92 } });
    screen.append(dim, win);
    playClock.stop(); // paused time isn't play time
    sfx.select();
    function flip(field) {
      update((s) => (s.settings[field] = s.settings[field] === false ? true : !s.settings[field]));
      soundBtn.textContent = label(settings().sound, "🔊 Sound");
      voiceBtn.textContent = label(settings().voice, "🗣 Read aloud");
      heroBtn.textContent = label(settings().heroVoices !== false, "🎭 Character voices");
      if (field === "voice" && !settings().voice) stopSpeaking();
      if (field === "heroVoices" && settings().heroVoices === false) barker.hush();
      if (field === "sound") {
        setMusicMuted(!settings().sound);
        applyVolumes();
      }
      sfx.select();
    }
    function showConfirm(on) {
      confirmRow.style.display = on ? "block" : "none";
      sfx[on ? "select" : "back"]();
    }
    const off = onKeys((e) => {
      e.stopImmediatePropagation();
      const confirming = confirmRow.style.display !== "none";
      if (confirming && (e.key === "y" || e.key === "Y" || e.key === "Enter")) return done("quit");
      if (confirming && (e.key === "n" || e.key === "N" || e.key === "Escape")) return showConfirm(false);
      if (e.key === "Escape") done("resume");
    });
    function done(v) {
      off();
      win.remove();
      dim.remove();
      playClock.go();
      sfx.back();
      d.resolve(v);
    }
    return d.promise;
  }

  function chooseTier(hr, tiers) {
    const d = deferred();
    const cls = CLASSES[hr.cls];
    const what = (t) => {
      const sk = SKILLS[tiers[t].skill];
      if (hr.cls === "spellwright") return { 1: "Fill in the missing letters", 2: "Build it from letter tiles", 3: "Hear it, spell it" }[t] + ` · ${sk?.label || ""}`;
      if (hr.cls === "titancaller") return { 1: "Pick the power word", 2: "Swap in a stronger word", 3: "Write a vivid sentence" }[t];
      const extra = tiers[t].support && hr.cls === "gunner" ? " · with a picture to count" : tiers[t].stretch ? " · a stretch!" : "";
      return `${sk.label}${sk.example ? ` · like ${sk.example}` : ""}${extra}`;
    };
    // her Slow does no damage: the stars set how much harder the others hit what it holds (engine.js, SLOW_EXPOSE)
    const keeper = cls.slows;
    const more = (t) => `${Math.round((E.SLOW_EXPOSE[t] - 1) * 100)}%`;
    const dmg = keeper ? { 1: `Slows it · team hits ${more(1)} harder`, 2: `Slows it · team hits ${more(2)} harder`, 3: `Slows it · team hits ${more(3)} harder` } : { 1: "Quick hit", 2: "Big hit (×3)", 3: "MASSIVE hit (×8)" };
    // chapter 2's fiends are wary: only a fed (calm) one comes quietly
    const wary = E.livingFiends(b).some((f) => FIENDS[f.id]?.wary && !f.calm);
    const win = h(
      "div.window.tiers",
      {},
      h("h3", {}, `${hr.name}: choose your power`),
      h(
        "div.tier-cards",
        {},
        ...[1, 2, 3].map((t) =>
          h(
            "button.tier-card",
            { onclick: () => pick(t) },
            h("div.stars", {}, "★".repeat(t) + "☆".repeat(3 - t)),
            h("div.move", {}, cls.moves[t]),
            h("div.what", {}, what(t)),
            h("div.hit-size", {}, dmg[t]),
            t === 3 && !keeper ? h("div.capture", {}, wary ? "Finish a calm (fed) fiend with this to capture it!" : "Finish a fiend with this to capture it!") : null,
          ),
        ),
      ),
      h("div.row", {}, h("span", {}, keeper ? "Press 1, 2 or 3. Harder holds tighter." : "Press 1, 2 or 3. Harder hits harder."), h("button.btn.small.ghost", { onclick: () => pick(null) }, "Back (Esc)")),
    );
    screen.append(win);
    const off = onKeys((e) => {
      if (["1", "2", "3"].includes(e.key)) pick(Number(e.key));
      if (e.key === "Escape") pick(null);
    });
    function pick(t) {
      off();
      win.remove();
      t ? sfx.select() : sfx.back();
      d.resolve(t);
    }
    return d.promise;
  }

  /**
   * Five heroes means two on the bench: which one steps in for `hr` (1 or 2,
   * or a click; Esc goes back). With one on the bench, it's them. Resolves a
   * hero's key, or null.
   */
  function chooseBench(hr) {
    const ready = E.benchHeroes(b).filter((x) => !x.ko);
    if (ready.length <= 1) return Promise.resolve(ready[0]?.key || null);
    const d = deferred();
    const counters = new Set(E.livingFiends(b).map((f) => E.counterOf(f.type)));
    const win = h(
      "div.window.tiers.bench-pick",
      {},
      h("h3", {}, `Who steps in for ${hr.name}?`),
      h(
        "div.tier-cards",
        {},
        ...ready.map((x, i) =>
          h(
            `button.tier-card${counters.has(x.cls) ? ".counter" : ""}`,
            { onclick: () => pick(x.key) },
            h("div.stars", {}, String(i + 1)),
            h("div.move", {}, heroBadge(x)),
            h("div.what", {}, CLASSES[x.cls].blurb),
            h("div.hit-size", {}, `${x.hp} / ${x.maxHp} HP`),
            counters.has(x.cls) ? h("div.capture", {}, "The right hero for a fiend here!") : null,
          ),
        ),
      ),
      h("div.row", {}, h("span", {}, "Press 1 or 2."), h("button.btn.small.ghost", { onclick: () => pick(null) }, "Back (Esc)")),
    );
    screen.append(win);
    const off = onKeys((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ready.length) pick(ready[n - 1].key);
      if (e.key === "Escape") pick(null);
    });
    function pick(key) {
      off();
      win.remove();
      key ? sfx.select() : sfx.back();
      d.resolve(key);
    }
    return d.promise;
  }

  /**
   * Pick one of `list`. With `hr` (a hero picking a fiend to hit), each fiend
   * shows what that hero would do to it (matchupTag), and a lone fiend he'd
   * miss is still shown before he commits.
   */
  function chooseFrom(list, prompt, { hr = null } = {}) {
    if (list.length === 1 && !(hr && E.missReason(b, hr.key, list[0]))) return Promise.resolve(list[0]);
    const d = deferred();
    let sel = 0;
    const keyOf = (u) => u.uid || u.key;
    if (hr)
      for (const u of list) {
        const tag = matchupTag(hr, u);
        if (tag) sprites[keyOf(u)].querySelector(".tag")?.append(tag);
      }
    const mark = () =>
      list.forEach((u, i) => {
        const el = sprites[keyOf(u)];
        el.classList.toggle("targetable", true);
        el.querySelector(".cursor")?.remove();
        if (i === sel) el.append(h("div.cursor", {}, "▼"));
      });
    const cleanup = () =>
      list.forEach((u) => {
        const el = sprites[keyOf(u)];
        el.classList.remove("targetable");
        el.querySelector(".cursor")?.remove();
        el.querySelector(".matchup")?.remove();
        el.onclick = null;
      });
    list.forEach((u, i) => (sprites[keyOf(u)].onclick = () => finish(list[i])));
    kitSay(prompt, { voice: false, ms: 2500 });
    mark();
    const off = onKeys((e) => {
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) sel = (sel - 1 + list.length) % list.length;
      if (["ArrowDown", "ArrowRight"].includes(e.key)) sel = (sel + 1) % list.length;
      if (e.key === "Enter") return finish(list[sel]);
      if (e.key === "Escape") return finish(null);
      mark();
    });
    function finish(u) {
      off();
      cleanup();
      kitHide();
      u ? sfx.select() : sfx.back();
      d.resolve(u);
    }
    return d.promise;
  }

  /** A small badge for a hero: their move's icon and their name, in their color. */
  function heroBadge(x) {
    const color = CLASSES[x.cls].color;
    return h("span.hero-badge", { style: { borderColor: color, color } }, uiIcon(MOVE_ICON[x.cls]) || CLASSES[x.cls].command.split(" ")[0], h("span", {}, x.name));
  }

  /**
   * Over a fiend while a hero picks a target: "Out of reach" when the hit
   * would miss, "Weak point!" when this hero counters it, and otherwise the
   * badge of the hero who counters it ("Tough" first when this hero hits it soft).
   */
  function matchupTag(hr, f) {
    const why = E.missReason(b, hr.key, f);
    if (why) return h("div.matchup.out", {}, why === "quick" ? "Too quick!" : "Out of reach");
    const cls = E.counterOf(f.type);
    if (cls === hr.cls) return h("div.matchup.weak", {}, heroBadge(hr), h("b", {}, "Weak point!"));
    const theirs = cls && b.heroes.find((x) => x.cls === cls);
    if (!theirs) return null;
    const soft = E.effectiveness(hr.cls, f.type) < 1;
    return h(`div.matchup${soft ? ".soft" : ""}`, {}, soft ? h("span", {}, "Tough") : null, heroBadge(theirs));
  }

  // ------------------------------------------------------------ asking
  /**
   * Ask a question with the full help loop: answer → (miss) dodge → Show me /
   * Ask the droid / Skip → one retry. Returns { outcome: "right"|"retry"|"miss"|"back" }.
   */
  async function ask(hr, q, { dodgeTarget } = {}) {
    if (new URLSearchParams(location.search).has("debug")) window.__question = q; // for automated playtests
    const panel = openPanel({ ...q.panel, allowCancel: true, footNote: "Esc to choose a different move" });
    const first = await panel.answer();
    if (!first) {
      panel.close();
      return { outcome: "back" };
    }
    panel.opts.allowCancel = false;
    panel.foot?.remove();
    const g = q.grade(first.value);
    if (g.correct) {
      panel.markRight();
      persist(q, { correct: true, hinted: false, ms: first.ms, given: first.value });
      await wait(380);
      panel.close();
      return { outcome: "right" };
    }
    panel.markWrong();
    persist(q, { correct: false, hinted: false, ms: first.ms, code: g.code, given: first.value });
    E.reward(b, hr.key, { correct: false, tier: q.tier });
    if (q.tier === 3) kitSay(quip("brave", rng), { voice: false, ms: 2600, mood: "worried" });
    if (dodgeTarget && sprites[dodgeTarget.uid]) {
      sfx.miss();
      const c = spriteCenter(sprites[dodgeTarget.uid]);
      floatNumber(stage.world, c.x, c.y - 30, "MISS", "miss");
      dodge(sprites[dodgeTarget.uid], -50);
    }
    refresh();
    const canAsk = Boolean(save.settings.anthropicKey);
    const choice = await panel.chooseHelp({ droidName: names.droid || "Kit", canAsk });
    if (choice === "skip") {
      panel.close();
      kitSay(`It was ${q.answerText}. We'll get the next one.`, { ms: 4000, mood: "worried" });
      return { outcome: "miss" };
    }
    stats.hints += 1;
    const hint = q.hint(first.value);
    if (choice === "ask" && canAsk) {
      const ctx = tutorContext({
        heroName: hr.name,
        prompt: q.tutor.prompt,
        equation: q.tutor.equation,
        answer: q.tutor.answer,
        attempts: [String(first.value)],
        mistake: g.code && g.code !== "unknown" ? `${g.code}: ${hint.text}` : "",
        skillLabel: SKILLS[q.skill]?.label || q.skill,
        standard: SKILLS[q.skill]?.standard || "",
        level: mastery.level(q.skill),
      });
      panel.el.style.visibility = "hidden";
      activePanel = null;
      await openTutor(screen, { context: ctx, recap: q.panel.ask });
      activePanel = panel;
      panel.el.style.visibility = "visible";
    } else {
      panel.showHint(hint.text, hint.visual);
      if (choice === "ask") kitSay(quip("noKey", rng), { ms: 6000 });
      else speak(hint.text, "droid", { tag: "[patiently]" });
    }
    // Spelling: look, then cover, then spell again.
    if (q.cls === "spellwright") {
      await wait(choice === "ask" ? 0 : 2600);
      panel.clearHint();
    }
    panel.retry(q.knight || q.whole ? "Your turn again." : "Your turn again. Half damage if you get it now.");
    const second = await panel.answer();
    const g2 = q.grade(second?.value ?? "");
    if (second && g2.correct) {
      panel.markRight();
      persist(q, { correct: true, hinted: true, ms: second.ms, given: second.value });
      await wait(380);
      panel.close();
      return { outcome: "retry" };
    }
    panel.markWrong();
    persist(q, { correct: false, hinted: true, ms: second?.ms || 0, code: g2.code, given: second?.value });
    await wait(500);
    panel.close();
    kitSay(`It was ${q.answerText}. That one's going on my list for later.`, { ms: 4500, mood: "worried" });
    return { outcome: "miss" };
  }

  // ------------------------------------------------------------ actions
  // The Spellwright's spells: a painted effect and a particle color for each.
  const SPELLS = [
    { fx: "fx_fire", sound: "sfx_fire", color: "#ff9d5c" },
    { fx: "fx_ice", sound: "sfx_ice", color: "#9fdcff" },
    { fx: "fx_lightning", sound: "sfx_lightning", color: "#c9e6ff" },
  ];

  /** A painted effect on a sprite (bigger fiends get bigger effects); falls back to nothing. */
  function effectOn(uid, id, { scale = 1.25, up = 0.5, ...opts } = {}) {
    const el = sprites[uid];
    const c = spriteCenter(el, { up });
    const size = Math.max(200, Math.min(520, parseFloat(el.style.width) * scale));
    return playEffect(stage.world, id, c.x, c.y, { size, ...opts });
  }

  async function attackFx(hr, targets, cls) {
    const from = spriteCenter(sprites[hr.key]);
    if (targets.length) pushToward(targets.reduce((sum, t) => sum + spriteCenter(sprites[t.uid]).x, 0) / targets.length);
    if (cls === "knight") {
      setPose(sprites[hr.key], "attack");
      await lunge(sprites[hr.key], -90);
      sfx.slash();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        // the painted slash arcs left-to-right; flip it so it cuts toward the fiend
        if (!effectOn(t.uid, "fx_slash", { flip: true, fps: 30 })) fx.slash(c.x, c.y);
        else fx.burst(c.x, c.y, { color: "#bff4ff", count: 14, speed: 6 });
      }
    } else if (cls === "gunner") {
      setPose(sprites[hr.key], "attack");
      lunge(sprites[hr.key], -24, 300);
      sfx.shot();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        fx.bolts(from.x - 40, from.y, c.x, c.y, { count: 7 });
        setTimeout(() => effectOn(t.uid, "fx_volley", { flip: true, scale: 1.1, fps: 30 }), 160);
      }
      await wait(330);
    } else if (cls === "spellwright") {
      setPose(sprites[hr.key], "attack");
      const spell = rng.pick(SPELLS);
      if (!sfx.play(spell.sound)) sfx.spell();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        if (!effectOn(t.uid, spell.fx, { up: 0.45 })) fx.spell(c.x, c.y, spell.color);
        else fx.burst(c.x, c.y, { color: spell.color, count: 18, speed: 7 });
      }
      await wait(420);
    } else if (cls === "beastkeeper") {
      // Slow: a snare like a clock face springs shut on it, its hands winding back
      setPose(sprites[hr.key], "attack");
      lunge(sprites[hr.key], -60, 340);
      if (!sfx.play("sfx_ice")) sfx.spell();
      for (const t of targets) snareFx(t);
      await wait(420);
    } else {
      setPose(sprites[hr.key], "attack");
      sfx.spell();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        fx.burst(c.x, c.y, { color: "#5ff3c9", count: 34, speed: 8 });
      }
      await wait(300);
    }
    setPose(sprites[hr.key], "idle");
  }

  /** The Beastkeeper's snare over a fiend: a clock face that snaps shut, hands winding back, and a gold ring. */
  function snareFx(f) {
    const c = spriteCenter(sprites[f.uid], { up: 0.45 });
    const size = Math.round(Math.min(220, Math.max(130, parseFloat(sprites[f.uid].style.width) * 0.6)));
    const el = h("div.snare-clock", { style: { left: `${c.x}px`, top: `${c.y}px`, width: `${size}px`, height: `${size}px` } });
    el.innerHTML = clockFace({ h: 12, m: 0, size });
    layer.append(el);
    el.animate(
      [
        { transform: "translate(-50%, -50%) scale(1.6) rotate(0deg)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1) rotate(-200deg)", opacity: 0.95, offset: 0.35 },
        { transform: "translate(-50%, -50%) scale(1) rotate(-240deg)", opacity: 0.9, offset: 0.75 },
        { transform: "translate(-50%, -50%) scale(0.7) rotate(-260deg)", opacity: 0 },
      ],
      { duration: 1100, easing: "ease-out", fill: "forwards" },
    ).onfinish = () => el.remove();
    fx.burst(c.x, c.y, { color: CLASSES.beastkeeper.color, count: 26, speed: 6 });
  }

  /** Stampede: one of her creatures charges in from the right, through a fiend, and off the field. */
  async function stampedeFx(f) {
    const species = rng.pick(["raptor", "jelly", "slime", "tide"]);
    const id = `pet_${species}_${rng.int(1, 3)}`;
    const feet = spriteCenter(sprites[f.uid], { up: 0 });
    const el = makeSprite({ id, side: "pet", x: 1380, y: Math.min(560, feet.y + 10), size: [120, 120] });
    el.classList.add("stampede");
    el.style.zIndex = 20;
    layer.append(el);
    stage.live(el, profileFor(id), { flip: true });
    setPose(el, "act");
    if (!sfx.play(`sfx_${species === "jelly" ? "jelly" : species === "slime" ? "slime" : "raptor"}_cry`, { volume: 0.7, rate: 1.2 })) sfx.swap();
    await el.animate([{ left: "1380px" }, { left: `${feet.x + 30}px` }], { duration: 520, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" }).finished;
    const c = spriteCenter(sprites[f.uid]);
    fx.burst(c.x, c.y, { color: CLASSES.beastkeeper.color, count: 30, speed: 9 });
    fx.shake(field, 10, 300);
    el.animate([{ left: `${feet.x + 30}px`, opacity: 1 }, { left: `${feet.x - 320}px`, opacity: 0 }], { duration: 480, easing: "ease-out", fill: "forwards" }).onfinish = () => el.remove();
  }

  /**
   * A hero's hit landing. With `hr`, the matchup shows: a counter hit is a
   * big gold number, WEAK POINT!, a burst in the hero's color and a heavier
   * shake; a soft hit is a dull grey number and a clang.
   */
  async function showHit(ev, { crit = false, hr = null, titan = false } = {}) {
    if (!ev) return;
    const el = sprites[ev.target];
    const c = spriteCenter(el);
    const f = fiend(ev.target);
    const eff = hr && f ? E.effectiveness(hr.cls, f.type) : 1;
    if (!ev.ko) fiendNoise(f, "hurt");
    if (ev.phase) pendingPhase = ev.phase; // the fight stops for it once this turn is over (lensPause)
    // Clamp, from the cockpit: a Titan, a big hit, now and then a dent
    if (f === engine && !ev.ko && !ev.phase) clampSays(titan ? "titan" : crit || eff > 1 ? "crit" : "hurt", { chance: titan || crit ? 1 : 0.3 });
    if (eff > 1) {
      sfx.crit();
      floatNumber(stage.world, c.x, c.y - 20, String(ev.amount), "weak");
      floatNumber(stage.world, c.x, c.y - 92, "WEAK POINT!", "od");
      fx.burst(c.x, c.y, { color: CLASSES[hr.cls].color, count: 44, speed: 10, size: 4.5 });
      fx.shake(field, crit ? 22 : 16, 480);
      pushToward(c.x, { zoom: 1.06 });
      // the Bestiary fills in a fiend's weak point once he's landed one
      if (!getSave().collection.counters?.[f.id]) update((s) => ((s.collection.counters ||= {})[f.id] = hr.cls));
    } else {
      (eff < 1 ? sfx.clang : crit ? sfx.crit : sfx.hit)();
      floatNumber(stage.world, c.x, c.y - 20, String(ev.amount), eff < 1 ? "soft" : crit ? "crit" : "dmg");
      if (crit) fx.shake(field, 14);
    }
    recoil(el, -18);
    setPose(el, "hurt");
    setTimeout(() => setPose(el, "idle"), 400);
    refresh();
    if (ev.barBroken) {
      sfx.bar();
      fx.shake(field, 20, 500);
      await banner(screen, "HP BAR BROKEN!", "gold");
      const f = fiend(ev.target);
      // (a bar that breaks into a story phase, the Engine's lens, stops the fight instead)
      if (f?.boss && f.bar === f.bars && !ev.ko && !ev.phase) {
        el.dataset.idle = "special"; // last bar: it stays enraged
        setPose(el, "idle");
        kitSay(KIT_LINES.lastBar, { ms: 4500, mood: "shocked" });
      }
    }
    // the last bar holds on: only its own Titan can tear it off
    if (ev.held) floatNumber(stage.world, c.x, c.y - 96, "IT WON'T LET GO!", "miss");
    if (f === engine && !engine.ko && !phaseTwo && engine.bar === engine.bars - 1 && engine.hp / engine.maxHp < 0.3 && !clampLow) {
      clampLow = true;
      clampSays("low", { wait: 2500 });
    }
    if (ev.ko) await defeatFiend(fiend(ev.target), ev.captured);
    // the Riptide Eel drops what it snatched
    if (ev.returned) {
      sfx.play("sfx_pickup") || sfx.heal();
      floatNumber(stage.world, c.x, c.y - 60, `+${ev.returned} 🧪`, "heal");
      await banner(screen, ev.returned > 1 ? "It dropped the potions!" : "It dropped the potion!", "good", 1200);
    }
  }

  /** Clamp says something from the Engine's cockpit, while he's still in charge of it (no Clamp once the keeper reaches the lens). */
  function clampSays(when, opts = {}) {
    if (!engine || engine.ko || engine.phase || phaseTwo) return;
    barker.say("clamp", when, opts);
  }

  async function defeatFiend(f, captured) {
    const el = sprites[f.uid];
    const c = spriteCenter(el);
    stats.defeated.push(f.id);
    update((s) => (s.collection.defeated[f.id] = (s.collection.defeated[f.id] || 0) + 1));
    if (f === engine) return engineFalls(f);
    if (captured) {
      sfx.capture();
      if (!effectOn(f.uid, "fx_capture", { scale: 1.1 })) fx.capture(c.x, c.y, c.x, c.y - 40);
      stats.captures.push(f.id);
      update((s) => (s.collection.captures[f.id] = Math.min(10, (s.collection.captures[f.id] || 0) + 1)));
      await vanish(el);
      el.classList.add("gone");
      await banner(screen, `CAPTURED! ${FIENDS[f.id].name} → Monster Arena`, "good", 1800);
      // chapter 2: the first capture with the Beastkeeper there, who can remember it into a friend
      if (b.heroes.some((x) => x.cls === "beastkeeper") && firstTime("firstCaptureCh2")) kitSay(kitText("firstCaptureCh2"), { ms: 5000, mood: "smug" });
      else kitSay(quip("capture", rng), { ms: 3500, mood: "smug" });
    } else {
      fiendNoise(f, "ko");
      sfx.ko();
      if (!effectOn(f.uid, "fx_defeat_motes", { scale: 1.3, up: 0.55 })) fx.motes(c.x, c.y + 40);
      await vanish(el);
      el.classList.add("gone");
    }
  }

  /** The Drain Engine, torn off the tower: it tips back and falls into the harbor, and a great splash goes up. */
  async function engineFalls(f) {
    const el = sprites[f.uid];
    const feet = spriteCenter(el, { up: 0 });
    setPose(el, "hurt");
    sfx.play("sfx_drone_ko", { rate: 0.6 }) || sfx.ko();
    fx.shake(field, 26, 1200);
    const fall = el.animate(
      [
        { transform: "translate(-50%, -100%) rotate(0deg)", opacity: 1 },
        { transform: "translate(-50%, calc(-100% - 40px)) rotate(-8deg)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, calc(-100% + 420px)) rotate(14deg)", opacity: 0 },
      ],
      { duration: 1500, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" },
    ).finished;
    setTimeout(() => {
      sfx.play("sfx_splash") || sfx.quake();
      playEffect(stage.world, "fx_splash", feet.x, feet.y - 60, { size: 620 });
      fx.burst(feet.x, feet.y - 40, { color: "#bffcff", count: 70, speed: 12, size: 5 });
    }, 900);
    await fall;
    el.classList.add("gone");
    await wait(500);
  }

  async function doMove(hr) {
    const cls = hr.cls;
    const track = CLASSES[cls].track;
    const tiers = mastery.pickTiers(LADDERS[track], rng);
    const tier = await chooseTier(hr, tiers);
    if (!tier) return "back";
    stats.tiers[tier] += 1;
    const skill = tiers[tier].skill;
    const aoe = cls === "gunner" && skill.startsWith("div.");
    let target = null;
    if (!aoe) {
      target = await chooseFrom(E.livingFiends(b), KIT_LINES.pickTarget, { hr });
      if (!target) return "back";
      // a hit that can't land misses before any problem opens
      const why = E.missReason(b, hr.key, target);
      if (why) return whiff(hr, target, why);
      // her snare can't hold a boss (unless she's the last one standing, when it squeezes)
      if (CLASSES[cls].slows && !E.snareHurts(b, hr.key) && !E.slowHolds(target)) return whiff(hr, target, "big");
    }
    const s = getSave();
    const q = makeQuestion({
      cls,
      tier,
      skill,
      power: hr.power || 1, // the Crystal Grid's strength and the forged weapon
      support: tiers[tier].support,
      target,
      ctx: {
        rng,
        schoolWords: s.settings.schoolWords,
        recentWords: s.log.slice(-12).map((x) => x.answer),
        missedWords: s.collection.missedWords,
        grades: mastery.grades?.(),
      },
    });
    if (!q) return "back";
    const result = await ask(hr, q, { dodgeTarget: target || E.livingFiends(b)[0] });
    if (result.outcome === "back") return "back";
    if (result.outcome === "miss") {
      const friend = otherHero(null);
      if (friend) barker.say(friend.cls, "encourage", { chance: 0.5, wait: 7000 });
      return "done";
    }
    const half = result.outcome === "retry";
    const targets = aoe ? E.livingFiends(b) : [target];
    await attackFx(hr, targets, cls);
    const crit = tier === 3 && !half;
    // the Beastkeeper's Slow does no damage: it holds the fiend so everyone else hits it harder,
    // the better the answer the tighter (a retry after help holds it at ★). With nobody else
    // left standing to do the hitting, the snare squeezes instead (engine.js, snareHurts).
    const snare = q.slows && !E.snareHurts(b, hr.key);
    if (snare) {
      for (const t of targets) pin(t, half ? 1 : tier);
    } else if (q.knight) {
      const p = q.problem;
      const ev = p.kind === "left" ? E.setFiendHp(b, target.uid, p.answer, { tier: half ? 0 : tier, heroKey: hr.key }) : E.hit(b, hr.key, target.uid, p.damage, { tier: half ? 0 : tier, exposed: false }); // a Slowed fiend's extra is in his numbers (strikeBand)
      await showHit(ev, { crit, hr });
    } else {
      for (const t of targets) {
        // a volley at everyone still can't touch a fiend that's too quick
        if (E.missReason(b, hr.key, t)) {
          missFx(t, "quick");
          continue;
        }
        const ev = E.hit(b, hr.key, t.uid, q.damageTo(t, { half }), { tier: half ? 0 : tier });
        await showHit(ev, { crit, hr });
        if (q.slows && !t.ko) pin(t, half ? 1 : tier);
      }
    }
    const weakPoint = targets.some((t) => E.effectiveness(cls, t.type) > 1);
    if (!half) {
      if (E.reward(b, hr.key, { correct: true, tier })) odFilled(hr);
      // a pet acts after its hero's right answer, and grows from the hard ones (state.js, afterBattle)
      const pet = b.pets[hr.key];
      if (pet && tier >= 2) stats.growth[pet.id] = (stats.growth[pet.id] || 0) + 1;
      await petTurn(hr, target, tier);
      // Barks: always on a three-star hit, about a third of the time otherwise,
      // and now and then a teammate cheers him on instead. Kit chimes in when they don't.
      let barked = false;
      if (!hr.ko && (crit || weakPoint || rng.chance(0.33))) {
        barker.say(hr.cls, crit || weakPoint ? "crit" : "attack");
        barked = true;
      } else if (rng.chance(0.15)) {
        const fan = otherHero(hr.key);
        if (fan) {
          barker.say(fan.cls, "cheer");
          barked = true;
        }
      }
      if (!barked && rng.chance(0.18)) kitSay(quip("right", rng), { ms: 3000, mood: "laughing" });
    }
    if (!snare && target && !target.ko && E.effectiveness(cls, target.type) < 1) matchupHint(target, hr);
    refresh();
    return "done";
  }

  /** A fiend dodging a hit that can't land: a flier zips up out of reach, a quick one sidesteps. */
  function missFx(f, why) {
    const el = sprites[f.uid];
    const c = spriteCenter(el);
    sfx.miss();
    if (why === "reach") {
      const up = "translate(-50%, calc(-100% - 110px))";
      el.animate([{ transform: "translate(-50%, -100%)" }, { transform: up, offset: 0.3 }, { transform: up, offset: 0.65 }, { transform: "translate(-50%, -100%)" }], { duration: 1000, easing: "ease-in-out" });
    } else if (why !== "big") dodge(el, 70);
    floatNumber(stage.world, c.x, c.y - 30, why === "big" ? "TOO BIG TO HOLD" : "MISS", "whiff");
  }

  /**
   * He attacked a fiend this hero can't hit (engine.js, missReason): the
   * swing, the dodge, MISS, and the turn passes. No problem opens, so a right
   * answer never whiffs. Kit says why, and the first time, who to bring.
   */
  async function whiff(hr, target, why) {
    stats.whiffs = (stats.whiffs || 0) + 1;
    pushToward(spriteCenter(sprites[target.uid]).x);
    setPose(sprites[hr.key], "attack");
    const swing = lunge(sprites[hr.key], hr.cls === "knight" ? -90 : -24);
    if (hr.cls === "knight") sfx.slash();
    await wait(180);
    missFx(target, why);
    await swing;
    setPose(sprites[hr.key], "idle");
    await wait(700);
    if (ch2) reachLine(target, hr); // chapter 2: Kit names who can reach it
    else if (why === "reach") {
      kitSay(KIT_LINES.outOfReach, { ms: 2600, mood: "smug" });
      // the first time each fight, who to bring instead
      if (!hinted.has(target.type)) setTimeout(() => !b.over && matchupHint(target, hr), 2600);
    }
    return "done";
  }

  /**
   * Chapter 2: the wrong hero attacked (a miss, or a soft hit). The first time
   * each fight, Kit says who can reach that kind of fiend; after that, if the
   * one who can is on the bench, "swap someone in" (once a fight).
   */
  const REACH = { armored: "reachArmored", flier: "reachFlier", slime: "reachSlime", fast: "reachFast", colossal: "reachColossal" };
  function reachLine(target, hr) {
    if (!REACH[target.type]) return;
    if (!hinted.has(target.type)) {
      hinted.add(target.type);
      kitSay(kitText(REACH[target.type]), { ms: 4200, mood: "worried" });
    } else if (!hinted.has("again") && E.matchupAdvice(b, hr.key, target.type).advice === "swap") {
      hinted.add("again");
      kitSay(kitText("reachAgain"), { ms: 3200 });
    }
  }

  /**
   * Her Slow landed (at `tier` stars): the fiend acts less often (a fast one at
   * its own speed, so everyone can hit it), and the others hit it harder
   * (engine.js, slow). One she's already holding as tight just stays slowed.
   */
  function pin(f, tier = 1) {
    if (f.ko) return;
    const el = sprites[f.uid];
    const c = spriteCenter(el);
    if (!E.slow(b, f.uid, tier)) {
      floatNumber(stage.world, c.x, c.y - 80, E.slowHolds(f) ? "STILL SLOWED" : "TOO BIG TO HOLD", "whiff");
      return;
    }
    stats.slows += 1;
    const feet = spriteCenter(el, { up: 0 });
    playEffect(stage.world, "fx_summon_circle", feet.x, feet.y - 10, { size: Math.max(200, parseFloat(el.style.width) * 0.9) });
    floatNumber(stage.world, c.x, c.y - 80, `SLOWED ${"★".repeat(f.slowTier)}`, "od");
    refresh();
    if (firstTime("slowLanded")) setTimeout(() => !b.over && kitSay(kitText("slowLanded"), { ms: 4200, mood: "smug" }), 700);
    else barker.say("beastkeeper", "slow", { chance: 0.5 });
  }

  /**
   * A hero's pet takes its turn after their right answer (engine.js, petAct):
   * Rivet bites, Fizz sparks and Blot splats ink on the hero's target (or on
   * anything the hero could reach), and Chime rings, mending everyone on the
   * field. The harder the answer (`tier`), the harder it acts.
   */
  const PET_FX = { bite: { fx: "fx_slash", color: "#ffb35c" }, spark: { fx: "fx_lightning", color: "#bfe6ff" }, ink: { fx: null, color: "#8a6bff" } };
  async function petTurn(hr, target, tier) {
    if (b.over || !b.pets[hr.key]) return;
    const ev = E.petAct(b, hr.key, target?.uid, tier);
    if (!ev) return;
    stats.pets += 1;
    const el = petSprites[hr.key];
    const name = PETS[ev.pet]?.name || "";
    await wait(250);
    setPose(el, "act");
    const from = spriteCenter(el);
    floatNumber(stage.world, from.x, from.y - 50, `${name.toUpperCase()}!`, "od");
    if (ev.kind === "mend") {
      // Chime's bell: a chime, and a little health for everyone on the field
      sfx.play("sfx_heal", { rate: 1.5 }) || sfx.heal();
      for (const x of ev.heals.filter(Boolean)) {
        const c = spriteCenter(sprites[x.target]);
        fx.heal(c.x, c.y + 30);
        floatNumber(stage.world, c.x, c.y - 20, `+${x.healed}`, "heal");
      }
      refresh();
    } else {
      const t = sprites[ev.hit.target];
      const look = PET_FX[ev.kind] || PET_FX.bite;
      const dx = spriteCenter(t).x - from.x;
      const swing = lunge(el, Math.max(-260, dx * 0.6), 420);
      await wait(170);
      const c = spriteCenter(t);
      if (!look.fx || !effectOn(ev.hit.target, look.fx, { scale: 0.8, fps: 30, flip: true })) fx.burst(c.x, c.y, { color: look.color, count: 18, speed: 6, gravity: ev.kind === "ink" ? 0.3 : 0.12 });
      await showHit(ev.hit);
      await swing;
    }
    setTimeout(() => setPose(el, "idle"), 500);
    if (firstTime("firstPet")) kitSay(kitText("firstPet"), { ms: 5200 });
  }

  /** "Overdrive ready!" over a hero whose gauge just filled (and from Kit, the first time each fight). */
  let odAnnounced = false;
  function odFilled(hr) {
    if (!hr.active || hr.ko) return;
    const c = spriteCenter(sprites[hr.key]);
    floatNumber(stage.world, c.x, c.y - 70, "OVERDRIVE!", "od");
    sfx.play("sfx_overdrive_ready") || sfx.select();
    refresh();
    if (!odAnnounced) {
      odAnnounced = true;
      setTimeout(() => kitSay(hr.cls === "titancaller" ? KIT_LINES.odReadyTitan : KIT_LINES.odReady, { ms: 6000, mood: "laughing" }), 900);
    }
  }

  /**
   * When a hero hits something their moves bounce off: what would work. Once
   * per kind of fiend each fight, so Kit doesn't nag. Swap only comes up when
   * the hero who'd do better is on the bench: with three heroes or fewer
   * there is no bench. Against a colossal fiend it's the Titan Caller's
   * summon, and only "summon now" when her Overdrive is actually full.
   */
  const hinted = new Set();
  function matchupHint(target, hr) {
    if (ch2) return reachLine(target, hr);
    if (hinted.has(target.type)) return;
    hinted.add(target.type);
    if (target.type !== "colossal") {
      const { advice, counter } = E.matchupAdvice(b, hr.key, target.type);
      const type = FIEND_TYPES[target.type];
      const what = counter ? type.hint : type.bounce || type.hint; // the hint names the hero who counters it
      const next = quip(advice === "swap" ? "swapHint" : advice, rng);
      kitSay(`${what} ${next}`, { ms: 6000, mood: "smug", voice: false });
      // two recorded lines, said one after the other
      speak(what, "droid");
      speak(next, "droid");
      return;
    }
    const caller = b.heroes.find((x) => x.cls === "titancaller" && !x.ko);
    const line = !caller ? KIT_LINES.colossalNoCaller : !caller.active ? KIT_LINES.colossalBench : caller.od >= 100 ? KIT_LINES.colossalReady : KIT_LINES.colossalCharge;
    kitSay(line, { ms: 7000, mood: "smug" });
  }

  async function doPotion(hr) {
    const target = await chooseFrom(E.livingHeroes(b), KIT_LINES.whoPotion);
    if (!target) return "back";
    const addSkill = mastery.pickTiers(LADDERS.add, rng)[2].skill;
    const young = (mastery.gradeOf?.("add") ?? 3) < 3 && SKILLS[addSkill].grade < 3; // a plain sum mixes it
    const p = young ? youngPotion(target.hp, target.maxHp, addSkill, rng) : genHeal(target.hp, target.maxHp, addSkill, rng, LADDERS.add);
    if (!p) {
      kitSay(`${target.name} is already at full health. Potions are for emergencies, not snacks.`, { mood: "smug" });
      return "back";
    }
    const q = {
      cls: "potion",
      tier: 1,
      skill: p.skill,
      panel: { kind: "number", title: "Potion", ask: p.mix ? `Mix the potion for ${target.name}: how many drops in all?` : `${target.name} has ${target.hp} HP. The potion heals ${p.heal}. What's the new HP?`, equation: `${p.a} + ${p.b}` },
      answerText: String(p.answer),
      grade: (v) => ({ correct: Number(v) === p.answer, code: Number(v) === p.answer ? null : diagnoseArith(p, v)?.code }),
      hint: (v) => arithHint(p, v),
      tutor: { prompt: p.mix ? `Mix the potion: ${p.a} + ${p.b} drops. How many in all?` : `${target.name} has ${target.hp} HP and the potion heals ${p.heal}. New HP?`, equation: `${p.a} + ${p.b}`, answer: p.answer },
      knight: true,
    };
    const r = await ask(hr, q);
    if (r.outcome === "back") return "back";
    stats.potions += 1;
    b.items.potion -= 1;
    const amount = r.outcome === "miss" ? Math.round(p.heal / 2) : p.heal;
    const ev = E.heal(b, target.key, amount);
    const c = spriteCenter(sprites[target.key]);
    sfx.heal();
    if (!effectOn(target.key, "fx_heal", { scale: 1.3, up: 0.45 })) fx.heal(c.x, c.y + 40);
    floatNumber(stage.world, c.x, c.y - 20, `+${ev.healed}`, "heal");
    if (target.hp / target.maxHp >= 0.3) lowWarned.delete(target.key);
    barker.say(target.cls, "healed", { chance: 0.7 });
    refresh();
    return "done";
  }

  /** Who gets a biscuit, when more than one hero is knocked out (they may be on the bench, out of sight). */
  function chooseDowned(list) {
    if (list.length === 1) return Promise.resolve(list[0]);
    const d = deferred();
    const win = h(
      "div.window.tiers.bench-pick",
      {},
      h("h3", {}, "Who gets the biscuit?"),
      h(
        "div.tier-cards",
        {},
        ...list.map((x, i) =>
          h(
            "button.tier-card",
            { onclick: () => pick(x) },
            h("div.stars", {}, String(i + 1)),
            h("div.move", {}, heroBadge(x)),
            h("div.what", {}, x.active ? "Knocked out" : "Knocked out, on the bench"),
          ),
        ),
      ),
      h("div.row", {}, h("span", {}, `Press 1 to ${list.length}.`), h("button.btn.small.ghost", { onclick: () => pick(null) }, "Back (Esc)")),
    );
    screen.append(win);
    const off = onKeys((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= list.length) pick(list[n - 1]);
      if (e.key === "Escape") pick(null);
    });
    function pick(x) {
      off();
      win.remove();
      x ? sfx.select() : sfx.back();
      d.resolve(x);
    }
    return d.promise;
  }

  /**
   * A Salty Biscuit (chapter 2): it wakes a knocked-out hero. He counts the
   * crumbs (a sum at his own adding level); right, the hero is back with
   * BISCUITS.wake of their health, and a miss still wakes them, with half that.
   */
  async function doBiscuit(hr) {
    const target = await chooseDowned(E.downedHeroes(b));
    if (!target) return "back";
    const p = genAdd(mastery.pickTiers(LADDERS.add, rng)[2].skill, rng);
    const said = `Break the biscuit for ${target.name}: ${p.a} crumbs and ${p.b} crumbs. How many crumbs in all?`;
    const q = {
      cls: "potion",
      tier: 1,
      skill: p.skill,
      panel: { kind: "number", title: "Salty Biscuit", ask: said, equation: `${p.a} + ${p.b}` },
      answerText: String(p.answer),
      grade: (v) => ({ correct: Number(v) === p.answer, code: Number(v) === p.answer ? null : diagnoseArith(p, v)?.code }),
      hint: (v) => arithHint(p, v),
      tutor: { prompt: said, equation: `${p.a} + ${p.b}`, answer: p.answer },
      knight: true,
    };
    const r = await ask(hr, q);
    if (r.outcome === "back") return "back";
    stats.biscuits += 1;
    b.items.biscuit -= 1;
    const ev = E.revive(b, target.key, r.outcome === "miss" ? BISCUITS.wake / 2 : BISCUITS.wake);
    if (!ev) return "done";
    const el = sprites[target.key];
    el.classList.remove("ko");
    setPose(el, "idle");
    sfx.heal();
    if (target.active) {
      const c = spriteCenter(el);
      if (!effectOn(target.key, "fx_heal", { scale: 1.3, up: 0.45 })) fx.heal(c.x, c.y + 40);
      floatNumber(stage.world, c.x, c.y - 20, `+${ev.hp}`, "heal");
    }
    lowWarned.delete(target.key);
    refresh();
    await banner(screen, `${target.name} is back up!`, "good", 1100);
    return "done";
  }

  /**
   * The Beastkeeper's Feed (questions.js, feedQuestion): a tonic, poured in
   * milliliters, for a hero who's hurt (it heals TONIC of their health), or a
   * meal, weighed in grams, for a fiend: it eats instead of its next turn and
   * stays calm, so a ★★★ finish captures it (engine.js, feed). A miss spills it.
   */
  async function doFeed(hr) {
    const target = await chooseFrom(feedable(), KIT_LINES.pickTarget);
    if (!target) return "back";
    const forHero = !target.uid;
    const q = feedQuestion({ target, forHero, skill: mastery.pickTiers(LADDERS.measure, rng)[2].skill, rng });
    const r = await ask(hr, q);
    if (r.outcome === "back") return "back";
    stats.feeds += 1;
    if (r.outcome === "miss") return "done";
    setPose(sprites[hr.key], "cast");
    if (forHero) {
      const ev = E.heal(b, target.key, Math.round(target.maxHp * TONIC));
      const c = spriteCenter(sprites[target.key]);
      sfx.heal();
      if (!effectOn(target.key, "fx_heal", { scale: 1.3, up: 0.45 })) fx.heal(c.x, c.y + 40);
      floatNumber(stage.world, c.x, c.y - 20, `+${ev?.healed || 0}`, "heal");
      if (target.hp / target.maxHp >= 0.3) lowWarned.delete(target.key);
    } else {
      E.feed(b, target.uid);
      const c = spriteCenter(sprites[target.uid]);
      sfx.play("sfx_pickup") || sfx.heal();
      fx.burst(c.x, c.y + 40, { color: "#e0b070", count: 26, speed: 4, gravity: 0.25 });
      floatNumber(stage.world, c.x, c.y - 60, "CALM", "heal");
      if (firstTime("calmCapture")) setTimeout(() => !b.over && kitSay(kitText("calmCapture"), { ms: 5000 }), 600);
    }
    if (!forHero) barker.say("beastkeeper", "feed", { chance: 0.6, wait: 1500 }); // her line weighs out a meal; a tonic is poured
    await wait(500);
    setPose(sprites[hr.key], "idle");
    refresh();
    return "done";
  }

  async function doOverdrive(hr) {
    // a combo needs something it can hit: keep the Overdrive for later
    if (hr.cls !== "titancaller" && !E.reachable(b, hr.key).length) {
      const f = E.livingFiends(b)[0];
      kitSay(FIEND_TYPES[f.type].bounce || KIT_LINES.pickTarget, { ms: 3200, mood: "smug" });
      return "back";
    }
    E.spendOverdrive(b, hr.key);
    sfx.overdrive();
    await banner(screen, `OVERDRIVE: ${hr.cls === "titancaller" ? `Summon ${titanName(b.binding || "titan_starter")}` : CLASSES[hr.cls].overdrive}!`, "gold", 1500);
    if (hr.cls === "titancaller") return doSummon(hr);
    kitSay(KIT_LINES.overdrive, { ms: 5000 });
    const tiers = mastery.pickTiers(LADDERS[CLASSES[hr.cls].track], rng);
    let hits = 0;
    const chain = E.comboLength(hr); // longer with the Grid's Overdrive nodes
    for (let i = 0; i < chain && E.reachable(b, hr.key).length; i++) {
      const q = overdriveQuestion(hr.cls, rng.chance(0.6) ? tiers[1].skill : tiers[2].skill, { rng, recentWords: getSave().log.slice(-12).map((x) => x.answer) });
      q.tier = 1;
      if (new URLSearchParams(location.search).has("debug")) window.__question = q; // for automated playtests
      const panel = openPanel({ ...q.panel, title: `${q.panel.title} · hit ${i + 1}`, allowCancel: i > 0, footNote: "Esc to cash out" });
      const res = await panel.answer();
      if (!res) {
        panel.close();
        break;
      }
      const ok = q.grade(res.value).correct;
      persist(q, { correct: ok, hinted: false, ms: res.ms, given: res.value });
      if (!ok) {
        panel.markWrong();
        await wait(500);
        panel.close();
        kitSay(`It was ${q.answerText}. Combo over, but those hits count.`, { ms: 3500, mood: "worried" });
        break;
      }
      panel.markRight();
      await wait(200);
      panel.close();
      const t = rng.pick(E.reachable(b, hr.key));
      // Stampede: every right answer, one of her creatures charges
      if (hr.cls === "beastkeeper") await stampedeFx(t);
      else await attackFx(hr, [t], hr.cls);
      const ev = E.hit(b, hr.key, t.uid, E.odHitDamage(hr.cls, i, hr.power || 1) * E.effectiveness(hr.cls, t.type), { tier: i >= chain - 1 ? 3 : 2 });
      hits += 1;
      await showHit(ev, { crit: i >= chain - 1, hr });
      if (CLASSES[hr.cls].slows && !t.ko) pin(t, 2);
    }
    if (hits) await banner(screen, `${hits}-HIT COMBO!`, "gold", 1500);
    return "done";
  }

  /** The Titan Caller's Overdrive: he writes the Titan's entrance. Backing out gives the Overdrive back. */
  async function doSummon(hr) {
    // a Titan waking in the middle of the fight (the Drain Engine's lens) is bound, not summoned
    if (b.binding) return bindTitan(hr);
    const titanId = "titan_starter";
    const titan = TITANS[titanId];
    const name = titanName(titanId);
    const tier = await chooseSummonTier(name);
    if (!tier) {
      hr.od = 100;
      return "back";
    }
    const frame = tier === 1 ? rng.pick(FRAMES) : null;
    const panel = openPanel({
      kind: tier === 1 ? "frame" : "text",
      title: `Summon ${name} ${"★".repeat(tier)}`,
      ask:
        tier === 1
          ? "Fill in the blanks. Specific words make it hit harder."
          : tier === 2
            ? `Write one sentence: how does ${name} enter the battle? Make the reader SEE and HEAR it.`
            : `Write ${name}'s entrance in 2 or 3 sentences. Sounds, colors, comparisons, feelings: every detail adds power.`,
      frame,
      titan: name,
      minWords: tier === 2 ? 5 : 12,
      placeholder: `${name}…`,
      submitLabel: "Summon! (Ctrl+Enter)",
      allowCancel: true,
    });
    const res = await panel.answer();
    if (!res) {
      panel.close();
      hr.od = 100;
      return "back";
    }
    const text = tier === 1 ? fillFrame(frame, name, res.value) : res.value;
    panel.foot?.remove(); // no backing out once it's written
    panel.body.replaceChildren(h("div.hint-text", {}, `${names.droid || "Kit"} is reading it…`));
    let judged = null;
    const key = getSave().settings.anthropicKey;
    if (key && spendUsage("judge", 60)) {
      try {
        judged = await judgeEntrance({ key, titanName: name, tier, text, frame: frame?.text, blanks: tier === 1 ? res.value : undefined });
      } catch {
        judged = null;
      }
    }
    if (!judged) {
      judged = heuristicJudge(tier === 1 ? Object.values(res.value).join(" ") : text);
      if (tier === 1 && judged.power === "mega") judged.power = "blaze";
    }
    const power = POWERS[judged.power];
    panel.body.replaceChildren(
      h(
        "div.power-card",
        {},
        h("div.power-badge", {}, `${power.icon} ${power.label}`),
        h("div.moves", {}, ...judged.moves.map((m) => h("span.move-chip", {}, h("b", {}, MOVE_NAMES[m.id] || m.id), `"${m.quote}"`))),
        judged.praise ? h("div.hint-text", {}, judged.praise) : null,
        judged.tip && judged.power !== "mega" ? h("div.live-hint", {}, `Next time: ${judged.tip}`) : null,
        h("div", { style: { marginTop: "10px" } }, h("button.btn.gold", { onclick: () => go.resolve() }, "Unleash! (Enter)")),
      ),
    );
    const go = deferred();
    const off = onKeys((e) => e.key === "Enter" && go.resolve());
    await go.promise;
    off();
    panel.close();
    const correct = judged.power !== "tiny";
    persist({ skill: "write.entrance", tier, answerText: "" }, { correct, hinted: false, ms: res.ms, given: text });
    update((s) => s.collection.entrances.unshift({ t: Date.now(), titan: name, text, power: judged.power, tier }));
    fiendsQuiet = true;
    try {
      await summonCinematic(hr, { text, titanId, titan, power, tier });
    } finally {
      fiendsQuiet = false;
    }
    setPose(sprites[hr.key], "idle");
    // the Drain Engine shrugs Tidebreaker off and keeps drinking, until the keeper reaches the lens
    if (engine && !engine.ko && !phaseTwo && !pendingPhase && !engineDented) {
      engineDented = true;
      kitSay(kitText("engineTitan"), { ms: 5000 });
    }
    else if (judged.tip && judged.power !== "mega") kitSay(`${judged.praise} Next time: ${judged.tip}`, { ms: 9000 });
    else barker.say(hr.cls, "crit", { wait: 3000 });
    refresh();
    return "done";
  }

  /**
   * Binding a Titan that woke in the middle of the fight (the Drain Engine's
   * lens: b.binding). He writes true words about the storm while the Lantern
   * Song plays (world/puzzles2.js, bindPuzzle; Claude reads them when it's
   * connected), and they become its entrance. A miss: the Titan Caller asks
   * again. Stepping away (Esc): the fight goes on, and her Overdrive stays full
   * to try again. Returns "done" once it's bound, or "back".
   */
  async function bindTitan(hr) {
    const titanId = b.binding;
    const q = bindPuzzle({ mastery });
    for (;;) {
      fiendsQuiet = true;
      const r = await askPuzzle(screen, q, { mastery, rng });
      fiendsQuiet = false;
      if (r === "back") {
        hr.od = 100;
        await storyLines([CONVOS2.bindWait[0]]);
        refresh();
        return "back";
      }
      stats.total += 1;
      if (r === "right") countRight(3); // true words about the storm: ★★★
      if (r === "right" || r === "retry") break;
      await storyLines([CONVOS2.bindMissed[0]]);
    }
    const words = String(q.given || "").trim();
    const judged = heuristicJudge(words);
    const power = POWERS[judged.power === "tiny" ? "spark" : judged.power];
    update((s) => s.collection.entrances.unshift({ t: Date.now(), titan: titanName(titanId), text: words, power: judged.power, tier: 3 }));
    b.binding = null;
    bound = { titan: titanId, words };
    fiendsQuiet = true;
    try {
      await summonCinematic(hr, { text: words, titanId, titan: TITANS[titanId], power, tier: 3 });
    } finally {
      fiendsQuiet = false;
    }
    setPose(sprites[hr.key], "idle");
    refresh();
    return "done";
  }

  /** Story lines in the middle of a fight, in the adventure's dialogue box (click, Space or Enter to go on). */
  async function storyLines(lines, onLine = null) {
    barker.hush();
    kitHide();
    const dlg = createDialogue(screen);
    try {
      for (const line of lines) {
        onLine?.(line);
        await dlg.say(line);
      }
    } finally {
      dlg.close();
    }
  }

  /**
   * The summon as a short film. When the sound pack has the Titan's music
   * (TITANS[id].music), its cues (seconds: rise, hit, fade) set the timing;
   * otherwise a quicker cut. Two looks (TITANS[id].look):
   *   1. The HUD fades, letterbox bars slide in, the scene darkens (to teal
   *      for the sea, to storm light for "light") and a summoning circle
   *      spins at the caller's feet.
   *   2. Spray bursts along the back of the arena and the Titan rises from
   *      behind it, behind the fighters, breathing (or lightning cracks and
   *      the Titan unfolds out of the light), as his sentence appears word by
   *      word and the camera tilts up to take it in.
   *   3. It roars (shockwave, shake), then blasts the fiends with a tidal
   *      torrent (or lightning) on the music's hit, and the damage lands.
   *   4. It sinks back (or fades into the light) and everything clears.
   * Enter, Space or Esc skips straight to the hit.
   */
  async function summonCinematic(hr, { text, titanId = "titan_starter", titan, power, tier }) {
    stopSpeaking();
    barker.hush();
    song.stop(1.2); // a song in the fight (the Lantern Song) gives way to the summon's music
    const light = titan.look === "light";
    // its own track, or Tidebreaker's while that isn't made (Beaconwing's)
    const track = [titan.music, "music_summon"].find((id) => id && audioManifest().sounds?.[id]) || "music_summon";
    const swell = music.sting(track);
    const cues = (swell && audioManifest().sounds?.[track]?.cues) || { rise: 0.9, hit: 5.4, fade: 7.8 };
    const t0 = performance.now();
    let skipped = false;
    const skip = deferred();
    const at = (sec) => (skipped ? Promise.resolve() : Promise.race([wait(Math.max(0, t0 + sec * 1000 - performance.now())), skip.promise]));
    const offSkip = onKeys((e) => {
      if (["Enter", " ", "Escape"].includes(e.key)) {
        skipped = true;
        skip.resolve();
      }
    });

    // 1. the stage turns
    screen.classList.add("cinematic");
    const bars = [h("div.letterbox.top"), h("div.letterbox.bottom")];
    const tint = h(`div.summon-tint${light ? ".light" : ""}`);
    screen.append(tint, ...bars);
    for (const bar of bars) bar.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 700, easing: "ease-out", fill: "forwards" });
    tint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" });
    setPose(sprites[hr.key], "cast");
    const feet = spriteCenter(sprites[hr.key], { up: 0 });
    playEffect(stage.world, "fx_summon_circle", feet.x, feet.y - 14, { size: 380 });
    if (!sfx.play("sfx_summon_rise", { volume: swell ? 0.6 : 1 }) && !swell) sfx.summon();
    stage.camera.yRange = [-90, 40];
    stage.camera.push({ x: (feet.x - 640) * 0.16, zoom: 1.1, inMs: 900, holdMs: Math.max(200, cues.rise * 1000 - 900), outMs: 900 });
    const rumble = setInterval(() => fx.shake(field, 5, 300), 700);

    // 2. the Titan, in a pit whose bottom edge is the back of the arena floor
    const edgeY = LAYOUT.background.floorEdgeStageY + 36;
    const TH = 600;
    const pit = h("div.titan-pit", { style: { top: "-700px", height: `${edgeY + 700}px` } });
    const sunk = 700 + edgeY + TH + 30; // feet below the edge: out of sight
    const risen = 700 + edgeY + 110; // feet hidden just below the edge, the rest towering above
    const titanEl = makeSprite({ id: titanId, side: "titan", x: 640, y: light ? risen : sunk, size: [Math.round(TH * 0.72), TH] });
    if (light) titanEl.style.opacity = "0"; // it unfolds out of the light where it stands
    pit.append(titanEl);
    const mist = h("div.titan-mist", { style: { top: `${edgeY - 90}px` } });
    layer.append(pit, mist);
    stage.live(titanEl, "titan");
    const words = h("div.summon-words.trailer", {}, ...text.split(/\s+/).map((wd) => h("span", {}, `${wd} `)));
    screen.append(words);

    await at(cues.rise);
    clearInterval(rumble);
    const riseMs = Math.max(1400, (cues.hit - cues.rise - 1.6) * 1000);
    const rise = light
      ? titanEl.animate(
          [
            { opacity: 0, filter: "brightness(3) blur(6px) drop-shadow(0 0 30px rgba(255, 236, 170, 0.75))", transform: "translate(-50%, -100%) scale(0.75)" },
            { opacity: 1, filter: "brightness(1) blur(0px) drop-shadow(0 0 30px rgba(255, 236, 170, 0.75))", transform: "translate(-50%, -100%) scale(1)" },
          ],
          { duration: riseMs, easing: "cubic-bezier(.25,.8,.3,1)", fill: "forwards" },
        )
      : titanEl.animate([{ top: `${sunk}px` }, { top: `${risen}px` }], { duration: riseMs, easing: "cubic-bezier(.25,.8,.3,1)", fill: "forwards" });
    mist.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
    if (!skipped) {
      if (light) {
        // lightning cracks across the sky, and the light gathers into wings
        sfx.play("sfx_lightning") || sfx.spell();
        [380, 640, 900].forEach((x, i) => setTimeout(() => playEffect(stage.world, "fx_lightning", x, edgeY - 260, { size: 460 }), i * 220));
        flash("#fff6c8", 0.5, 700);
      } else {
        sfx.play("sfx_splash");
        [460, 640, 820].forEach((x, i) => setTimeout(() => playEffect(stage.world, "fx_splash", x, edgeY - 120, { size: 420 }), i * 160));
      }
      fx.shake(field, 12, 600);
      stage.camera.push({ x: 0, y: -75, zoom: 0.98, inMs: 1600, holdMs: (cues.fade - cues.rise) * 1000 - 1200, outMs: 1300 });
      speak(text, "trailer", { force: true });
      // the words appear one by one through the rise
      const spans = [...words.children];
      const each = Math.max(90, Math.min(420, (riseMs - 300) / Math.max(1, spans.length)));
      spans.forEach((sp, i) => setTimeout(() => sp.classList.add("on"), 300 + i * each));
    }

    // 3. the roar, then the hit
    await at(cues.hit - 1.5);
    if (!skipped) {
      words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }); // read by now; let the roar fill the screen
      setPose(titanEl, "roar");
      sfx.play("sfx_titan_roar", { volume: 0.9 });
      playEffect(stage.world, "fx_roar", 640, edgeY - TH * 0.62, { size: 760 });
      fx.shake(field, 26, 900);
      stage.camera.push({ zoom: 1.04, inMs: 200, holdMs: 500, outMs: 600 });
    }
    await at(cues.hit);
    offSkip();
    rise.finish();
    if (skipped) stopSpeaking();
    for (const sp of words.children) sp.classList.add("on");
    setPose(titanEl, "attack");
    // the old attack picture (narrow, its beam cut off at the edge) fades the beam out instead; art wave 05 repaints it
    const atk = assetInfo(titanId)?.poses?.attack;
    if (atk && atk.w / atk.h < 0.8) titanEl.classList.add("beam-fade");
    const foes = E.livingFiends(b);
    const fx0 = foes.length ? foes.reduce((sum, f) => sum + spriteCenter(sprites[f.uid]).x, 0) / foes.length : 360;
    if (light) {
      // beams and lightning
      sfx.play("sfx_lightning") || sfx.quake();
      playEffect(stage.world, "fx_roar", fx0, edgeY - 40, { size: 760 });
      for (const f of foes) setTimeout(() => effectOn(f.uid, "fx_lightning", { scale: 1.8, up: 0.5 }), 120);
      flash("#fff6c8", 0.7, 600);
    } else {
      sfx.play("sfx_tidal") || sfx.quake();
      playEffect(stage.world, "fx_tidal", fx0 + 60, edgeY + 40, { size: 820 });
      for (const f of foes) setTimeout(() => effectOn(f.uid, "fx_splash", { scale: 1.6, up: 0.3 }), 180);
      flash("#ffffff", 0.55, 500);
    }
    fx.shake(field, 30, 800);
    for (const f of foes) {
      const c = spriteCenter(sprites[f.uid]);
      fx.burst(c.x, c.y, { color: light ? "#fff3c4" : "#bffcff", count: 60, speed: 11, size: 5 });
    }
    await wait(250);
    for (const f of E.livingFiends(b)) {
      // stronger with the Titan Bond nodes on her road (world/grid.js)
      const amount = titan.atk * SUMMON_MULT * power.mult * TIER_MULT[tier] * (f.type === "colossal" ? 2 : 1) * (hr.summon || 1);
      await showHit(E.hit(b, hr.key, f.uid, amount, { tier, titan: titanId }), { crit: true, titan: true });
    }

    // 4. it sinks back into the sea (or settles back into the light)
    await (skipped ? wait(400) : at(cues.fade));
    setPose(titanEl, "idle");
    mist.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1300, fill: "forwards" });
    if (light) {
      sfx.play("sfx_summon_rise", { volume: 0.5 });
      await titanEl.animate([{ opacity: 1, filter: "brightness(1)" }, { opacity: 0, filter: "brightness(3)" }], { duration: 1300, easing: "ease-in", fill: "forwards" }).finished;
    } else {
      sfx.play("sfx_splash");
      playEffect(stage.world, "fx_splash", 640, edgeY - 110, { size: 480 });
      await titanEl.animate([{ top: `${risen}px` }, { top: `${sunk}px` }], { duration: 1100, easing: "ease-in", fill: "forwards" }).finished;
    }
    words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
    tint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" });
    for (const bar of bars) bar.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 600, easing: "ease-in", fill: "forwards" });
    screen.classList.remove("cinematic");
    stage.camera.clearPushes();
    await wait(650);
    stage.camera.yRange = [-40, 40];
    pit.remove();
    mist.remove();
    words.remove();
    tint.remove();
    bars.forEach((bar) => bar.remove());
  }

  function chooseSummonTier(titanName) {
    const d = deferred();
    const win = h(
      "div.window.tiers",
      {},
      h("h3", {}, `Summon ${titanName}: how will you write it?`),
      h(
        "div.tier-cards",
        {},
        ...[
          [1, "Fill the blanks", "A sentence frame with three blanks. Caps at Blaze power."],
          [2, "One sentence", "Your own sentence. Detail decides the power."],
          [3, "2–3 sentences", "The full entrance. MEGA power is possible."],
        ].map(([t, name, what]) =>
          h("button.tier-card", { onclick: () => pick(t) }, h("div.stars", {}, "★".repeat(t) + "☆".repeat(3 - t)), h("div.move", {}, name), h("div.what", {}, what)),
        ),
      ),
      h("div.row", {}, h("span", {}, "Fuzzy words (big, loud, cool) don't add power. Specific ones do."), h("button.btn.small.ghost", { onclick: () => pick(null) }, "Back (Esc)")),
    );
    screen.append(win);
    const off = onKeys((e) => {
      if (["1", "2", "3"].includes(e.key)) pick(Number(e.key));
      if (e.key === "Escape") pick(null);
    });
    function pick(t) {
      off();
      win.remove();
      d.resolve(t);
    }
    return d.promise;
  }

  /** A boss walks in with its splash painting (any key skips); without one, its name over a quake. */
  async function bossEntrance() {
    const boss = b.fiends.find((f) => f.boss);
    if (!boss) return;
    const url = assetUrl(boss.id, "splash");
    if (!url) {
      if (!sfx.play(FIEND_SFX[boss.id] || "", { rate: 0.8 })) sfx.quake();
      fx.shake(field, 18, 900);
      pushToward(spriteCenter(sprites[boss.uid]).x, { zoom: 1.07, k: 0.12, holdMs: 1100 });
      await banner(screen, boss.name.toUpperCase(), "bad", 2200);
      await wait(900);
      return;
    }
    const splash = h("div.boss-splash", {}, h("img", { src: url, alt: "" }), h("div.boss-name", {}, boss.name));
    screen.append(splash);
    if (!sfx.play("sfx_geode_roar")) sfx.quake();
    const skip = deferred();
    const off = onKeys(() => skip.resolve());
    splash.addEventListener("click", () => skip.resolve());
    await Promise.race([wait(2800), skip.promise]);
    off();
    await splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" }).finished;
    splash.remove();
  }

  // ------------------------------------------------------------ turns
  /** Playing together: whose turn it is, in their color (nothing when one child plays). */
  function playerBadge() {
    const p = mastery.badge?.();
    return p ? h("span.player-badge", { style: { background: p.color } }, p.name) : null;
  }

  /** Kit teaches the Beastkeeper's two commands on her turns, once ever each: Slow while a fast fiend is about, then Feed. */
  function keeperLesson(hr) {
    if (E.overdriveReady(b, hr.key)) return; // her Overdrive lesson has the floor
    const quick = E.livingFiends(b).some((f) => f.fast && !f.slowed);
    if (quick && firstTime("slowLesson")) kitSay(kitText("slowLesson"), { ms: 7000 });
    else if (feedable().length && firstTime("feedLesson")) kitSay(kitText("feedLesson"), { ms: 7000 });
  }

  async function heroTurn(key) {
    let hr = hero(key);
    mastery.beginTurn?.(CLASSES[hr.cls].track); // playing together: the children swap every hero turn
    if (hr.cls === "beastkeeper") keeperLesson(hr);
    for (;;) {
      refresh();
      const cmd = await chooseCommand(hr);
      if (cmd === "quit") return;
      let r = "done";
      if (cmd === "move") r = await doMove(hr);
      else if (cmd === "feed") r = await doFeed(hr);
      else if (cmd === "item") r = await doPotion(hr);
      else if (cmd === "biscuit") r = await doBiscuit(hr);
      else if (cmd === "guard") {
        stats.guards += 1;
        E.defend(b, hr.key);
        sfx.guard();
        await banner(screen, `${hr.name} guards`, "", 900);
      } else if (cmd === "swap") {
        // with two on the bench (five heroes), he picks who comes in
        const pick = await chooseBench(hr);
        const inKey = pick && E.swap(b, hr.key, pick);
        if (!pick) r = "back";
        else if (inKey) {
          stats.swaps += 1;
          sfx.swap();
          layoutHeroes();
          hr = hero(inKey);
          barker.say(hr.cls, "swapIn");
          // the right hero for a fiend on the field: a short gold flash
          const right = E.livingFiends(b).some((f) => E.counterOf(f.type) === hr.cls);
          if (right) flash("#ffd36b", 0.3, 420);
          // Kit approves, the first time ever
          if (right && !getSave().progress.rightSwap) {
            update((s) => (s.progress.rightSwap = true));
            setTimeout(() => kitSay(KIT_LINES.rightSwap, { ms: 2000, mood: "smug" }), 900);
          }
          await banner(screen, `${hr.name} steps in!`, right ? "gold" : "good", 900);
          r = "back"; // the new hero takes this turn
        }
      } else if (cmd === "overdrive") {
        r = await doOverdrive(hr);
        if (r === "done") {
          stats.overdrives += 1;
          if (hr.cls === "titancaller") stats.summons += 1;
        }
      }
      if (r !== "back") return;
    }
  }

  /** A quick flash over the battlefield, for heavy hits and quakes. */
  function flash(color = "#fff", peak = 0.45, ms = 380) {
    const el = h("div.flash", { style: { background: color } });
    field.append(el);
    el.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: "ease-out" }).onfinish = () => el.remove();
  }

  /** One fiend hit landing on a hero: effect, sparks, number, recoil and shake. */
  function landHit(hitEv, style, { heavy = false, quake = false, quakeFx = null } = {}) {
    const el = sprites[hitEv.target];
    const victim = hero(hitEv.target);
    const c = spriteCenter(el, { up: quake ? 0.3 : 0.5 });
    const fxId = quake ? quakeFx || "fx_ice" : style.fx;
    // painted slashes arc left to right, which is already toward the heroes
    if (!fxId || !effectOn(hitEv.target, fxId, { scale: heavy ? 1.7 : 1.3, up: quake ? 0.3 : 0.5, fps: 30 })) fx.slash(c.x, c.y, style.color);
    fx.burst(c.x, c.y, { color: style.color, count: heavy ? 30 : 16, speed: heavy ? 9 : 6, gravity: style.drip ? 0.3 : 0.12 });
    if (victim?.defending) {
      sfx.guard();
      fx.burst(c.x, c.y, { color: "#9fe8ff", count: 18, speed: 4, gravity: 0 });
      floatNumber(stage.world, c.x, c.y - 74, "GUARD", "miss");
    }
    sfx.hurt();
    recoil(el, heavy ? 32 : 18);
    setPose(el, "hurt");
    setTimeout(() => setPose(el, hitEv.ko ? "ko" : "idle"), heavy ? 600 : 450);
    floatNumber(stage.world, c.x, c.y - 20, String(hitEv.amount));
    if (heavy) {
      fx.shake(field, 20, 480);
      flash("#ffffff", 0.32, 300);
    } else fx.shake(field, 7, 240);
  }

  async function fiendTurnUI(uid) {
    const f = fiend(uid);
    const el = sprites[uid];
    const style = FIEND_HIT[f.id] || FIEND_HIT.scrap_raptor;
    const heavy = Boolean(f.boss);
    refresh();
    await wait(heavy ? 300 : 450);
    const odBefore = new Map(b.heroes.map((x) => [x.key, x.od]));
    const ev = E.fiendTurn(b, uid);
    if (ev.kind === "eat") return eatFx(f);
    if (ev.kind === "steal") return stealFx(f);
    if (!ev.hits.length) return;
    if (f === engine && ev.kind === "attack") clampSays("attack", { chance: 0.45 });
    // taking hits charges Overdrive too: say so when it fills
    setTimeout(() => b.heroes.filter((x) => odBefore.get(x.key) < 100 && x.od >= 100).forEach(odFilled), 1400);
    el.classList.remove("charging");
    let lunged = null;
    if (ev.kind === "special") {
      // It rears up, the ground shakes, and crystals burst up under every hero
      // (the Drain Engine: light is pulled out of every hero, into its tanks).
      if (!sfx.play("sfx_geode_roar", { rate: f === engine ? 0.7 : 1 })) sfx.quake();
      else setTimeout(() => sfx.quake(), 900);
      setPose(el, "special");
      stage.camera.push({ x: (spriteCenter(el).x - 640) * 0.1, y: -12, zoom: 1.08, inMs: 500, holdMs: 1100, outMs: 900 });
      await banner(screen, `${f.name}: ${ev.name}!`, "bad", 1500);
      fx.shake(field, 30, 900);
      flash(style.specialColor || "#ffc8f0", 0.4, 520);
      await wait(260);
    } else {
      setPose(el, "attack");
      // every attack shows its name; the boss's waits for it
      if (heavy) await banner(screen, `${f.name}: ${ev.name}!`, "bad", 1100);
      else banner(screen, ev.name, "bad", 900);
      sfx.play(FIEND_SFX[f.id] || "");
      const victim = sprites[ev.hits[0].target];
      pushToward((spriteCenter(el).x + spriteCenter(victim).x) / 2, { zoom: heavy ? 1.06 : 1.03, holdMs: heavy ? 500 : 320 });
      const ms = heavy ? 620 : 440;
      lunged = lunge(el, style.reach, ms);
      await wait(ms * 0.4); // it connects at the far end of the lunge
    }
    let barked = false;
    for (const [i, hitEv] of ev.hits.entries()) {
      if (i) await wait(140);
      const victim = hero(hitEv.target);
      landHit(hitEv, style, { heavy, quake: ev.kind === "special", quakeFx: style.specialFx });
      if (hitEv.ko) {
        sprites[hitEv.target].classList.add("ko");
        barker.hush(); // a KO always gets its line
        barker.say(victim.cls, "ko");
        barked = true;
        await banner(screen, `${victim.name} is down!`, "bad", 1100);
      } else if (!barked && victim && victim.hp / victim.maxHp < 0.3 && !lowWarned.has(victim.key)) {
        lowWarned.add(victim.key);
        barker.say(victim.cls, "low");
        barked = true;
      } else if (!barked && victim) {
        barker.say(victim.cls, "hurt", { chance: 0.25 });
        barked = barker.busy;
      }
    }
    if (lunged) await lunged;
    await wait(heavy ? 300 : 150);
    setPose(el, "idle");
    // what it drank, it mends with (the Drain Engine, until the keeper reaches the lens)
    if (ev.drained) {
      const c = spriteCenter(el);
      for (const hitEv of ev.hits) {
        const from = spriteCenter(sprites[hitEv.target]);
        fx.bolts(from.x, from.y, c.x, c.y, { count: 4, color: "#fff3c4" });
      }
      await wait(250);
      sfx.heal();
      floatNumber(stage.world, c.x, c.y - 40, `+${ev.drained}`, "heal");
      clampSays("drain", { wait: 2000 });
    }
    refresh();
    if (ev.swappedIn) {
      layoutHeroes();
      sfx.swap();
      setTimeout(() => barker.say(hero(ev.swappedIn).cls, "swapIn", { wait: 2500 }), 900);
      await banner(screen, `${hero(ev.swappedIn).name} jumps in!`, "good", 1000);
    }
    // Its big move comes every third turn: warn him one turn ahead, so Guard matters.
    if (FIENDS[f.id].special && f.turns % 3 === 2 && E.livingHeroes(b).length) {
      el.classList.add("charging");
      pushToward(spriteCenter(el).x, { zoom: 1.05, k: 0.12, holdMs: 900 });
      const c = spriteCenter(el, { up: 0.35 });
      fx.motes(c.x, c.y + 80, { color: "#ff9de6", count: 40 });
      fx.shake(field, 6, 500);
      await banner(screen, `${f.name} is charging up!`, "bad", 1200);
      // the Drain Engine has tanks, not the Geode Titan's crystals: Kit warns with its own pair
      const engineWarn = f.id === "drain_engine";
      const warn = engineWarn ? [KIT_LINES.engineCharging, KIT_LINES.engineChargingAgain] : [KIT_LINES.bossCharging, KIT_LINES.bossChargingAgain];
      kitSay(chargeWarned ? warn[1] : warn[0], { ms: 7000, mood: engineWarn ? "worried" : "shocked" });
      chargeWarned = true;
    }
    await wait(250);
  }

  /** A fed fiend spends its turn eating: it munches, crumbs fly, and it's calm from now on. */
  async function eatFx(f) {
    const el = sprites[f.uid];
    const c = spriteCenter(el);
    sfx.play("sfx_pickup", { rate: 0.8 }) || sfx.select();
    el.animate(
      [{ transform: "translate(-50%, -100%) scaleY(1)" }, { transform: "translate(-50%, -100%) scaleY(0.92)" }, { transform: "translate(-50%, -100%) scaleY(1)" }],
      { duration: 360, iterations: 3 },
    );
    fx.burst(c.x, c.y + 30, { color: "#e0b070", count: 20, speed: 3, gravity: 0.3 });
    await banner(screen, `${f.name} is eating`, "good", 1300);
    await wait(700);
    refresh();
  }

  /** The Riptide Eel's first move: it darts at the party and snatches a potion (it drops it when it's beaten). */
  async function stealFx(f) {
    const el = sprites[f.uid];
    setPose(el, "attack");
    sfx.play("sfx_splash", { rate: 1.3 }) || sfx.miss();
    const dart = lunge(el, 520, 700);
    await wait(320);
    const c = spriteCenter(sprites[activeHeroes()[0]?.key] || el);
    floatNumber(stage.world, c.x - 80, c.y - 60, "−1 🧪", "miss");
    await dart;
    setPose(el, "idle");
    await banner(screen, `${f.name} snatched a potion!`, "bad", 1400);
    refresh();
  }

  /** The fight between turns, into the save (see runBattle's saveAs). */
  function saveFight() {
    if (!saveAs) return;
    const fight = { v: 1, t: Date.now(), where: saveAs, encounter, b: E.snapshot(b), stats, activeMs: activeNow() - startedAt, flags: { odAnnounced, chargeWarned, engineDented, clampLow } };
    update((s) => (s.fight = JSON.parse(JSON.stringify(fight))));
  }

  /** The Lantern Song (Maren's second song) in the fight; Maren's own song stands in until it's made. */
  function playLantern() {
    const has = (id) => Boolean(audioManifest().sounds?.[id]);
    const track = has(LANTERN_SONG) ? LANTERN_SONG : has(SONG_STAND_IN) ? SONG_STAND_IN : null;
    music.stop(1.2);
    if (track) song.play(track, { volume: 0.55 });
  }

  /**
   * The Drain Engine's last bar (its "lens" phase, docs/story/chapter2-script.md
   * beat 11): the fight stops, the view leans up the tower, and the keeper
   * reaches the lens. "Goodnight, bird." A Titan wakes in the light: the Titan
   * Caller comes onto the field (on her feet, Overdrive full), Maren sings,
   * and he binds Beaconwing with true words about the storm (bindTitan). From
   * here to the binding: no jokes, no Clamp. If he steps away from the words,
   * the fight goes on, and she can bind it from her Overdrive.
   */
  async function lensPause() {
    phaseTwo = true;
    barker.hush();
    kitHide();
    stopSpeaking();
    music.stop(1.6);
    command.replaceChildren();
    const finisher = FIENDS[engine.id].finisher;
    const callerKey = E.wakeTitan(b, finisher);
    layoutHeroes();
    refresh();
    // the view leans up the tower and holds there while they talk
    stage.camera.yRange = [-110, 40];
    const lean = { x: 140, y: -95, zoom: 1.04, t0: performance.now(), inMs: 2200, holdMs: 600000, outMs: 1600 };
    stage.camera.pushes.push(lean);
    fiendsQuiet = true;
    await wait(1800);
    const glow = h("div.lens-glow");
    try {
      await storyLines(CONVOS2.engineKeeper, (line) => {
        if (line.cue !== "lens") return;
        // a deep hum from the lens, like thunder a long way off: one prism lights
        field.append(glow);
        glow.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0.75 }], { duration: 2600, fill: "forwards" });
        flash("#fff6c8", 0.45, 900);
        sfx.quake();
        fx.shake(field, 8, 1600);
      });
    } finally {
      fiendsQuiet = false;
    }
    // Maren sings, and the keeper hums under her
    playLantern();
    lean.holdMs = Math.max(0, performance.now() - lean.t0 - lean.inMs);
    setTimeout(() => (stage.camera.yRange = [-40, 40]), lean.outMs + 200);
    glow.animate([{ opacity: 0.75 }, { opacity: 0.35 }], { duration: 1600, fill: "forwards" });
    const caller = hero(callerKey);
    if (!caller) return;
    mastery.beginTurn?.(CLASSES[caller.cls].track); // playing together: whoever's next writes the words
    E.spendOverdrive(b, caller.key);
    if ((await bindTitan(caller)) === "done") {
      stats.overdrives += 1;
      stats.summons += 1;
    }
    glow.remove();
    refresh();
  }

  // ------------------------------------------------------------ main loop
  if (resume) {
    // a saved fight: everyone where they were, the boss still enraged or charging up
    for (const f of b.fiends) {
      const el = sprites[f.uid];
      if (f.ko) el.classList.add("gone");
      else if (f.boss && f.bars > 1 && f.bar === f.bars) {
        el.dataset.idle = "special";
        setPose(el, "idle");
      }
      if (!f.ko && FIENDS[f.id].special && f.turns % 3 === 2) el.classList.add("charging");
    }
    for (const x of b.heroes) if (x.ko) setPose(sprites[x.key], "ko");
    odAnnounced = Boolean(resume.flags?.odAnnounced);
    chargeWarned = Boolean(resume.flags?.chargeWarned);
    engineDented = Boolean(resume.flags?.engineDented);
    clampLow = Boolean(resume.flags?.clampLow);
    fidget();
    await banner(screen, "Back to the fight!", "good", 1300);
  } else {
    if (encounter.boss) await bossEntrance();
    // the fiends announce themselves, a beat apart (two at most)
    else E.livingFiends(b).slice(0, 2).forEach((f, i) => setTimeout(() => !b.over && fiendNoise(f, "cry"), 250 + i * 700));
    fidget();
    if (bossCaller && bossCaller.od < 100) {
      bossCaller.od = 100;
      odAnnounced = true; // Kit's intro says so
      odFilled(bossCaller);
      await wait(700);
    } else if (bossCaller) odAnnounced = true;
    await wait(400);
    kitSay(encounter.intro, { ms: 9000 });
    if (lesson) {
      await wait(5200);
      kitSay(kitText(`odLesson_${lesson.cls}`), { ms: 9000, mood: "laughing" });
      refresh();
    }
    // the first fast fiend he ever meets: who can slow it down
    const keeper = b.heroes.some((x) => CLASSES[x.cls].slows && !x.ko);
    if (keeper && E.livingFiends(b).some((f) => f.fast) && firstTime("firstFast")) {
      await wait(5200);
      kitSay(kitText("firstFast"), { ms: 6000, mood: "shocked" });
    }
    // Once Kit's done: Clamp's greeting from the cockpit, a bit of banter between two heroes, or one hero's opening line.
    const present = activeHeroes().map((x) => x.cls);
    const exchanges = banterFor(present);
    if (engine) clampSays("start", { wait: 12000 });
    else if (exchanges.length && rng.chance(0.5)) barker.banter(rng.pick(exchanges), { wait: 15000 });
    else if (present.length) barker.say(rng.pick(present), "start", { wait: 15000 });
  }
  await wait(resume ? 400 : 1200);
  while (!b.over && !b.quit) {
    saveFight(); // between turns: the fight can pick up from here
    const key = E.nextTurn(b);
    refresh();
    if (hero(key)) await heroTurn(key);
    else await fiendTurnUI(key);
    if (b.quit) break;
    E.endTurn(b);
    // a boss's story phase starts once the turn that reached it is over (the Drain Engine's lens)
    if (pendingPhase && !b.over) {
      const phase = pendingPhase;
      pendingPhase = null;
      if (phase === "lens" && engine) await lensPause();
      E.checkOver(b); // Beaconwing may have ended it
    }
    layoutHeroes();
    refresh();
  }
  command.replaceChildren();
  if (b.quit && saveAs) {
    // left from the pause menu: the fight stays saved (with any swap made this turn), and Continue picks it up
    saveFight();
  } else {
    logBattle(encounter, b.quit ? "quit" : b.over === "victory" ? "won" : "lost", stats, activeNow() - startedAt);
    if (saveAs) update((s) => (s.fight = null)); // it's over: nothing to pick up
  }
  // what the adventure takes from it: each pet's hard answers (state.js, petGrowth),
  // the Titan bound in it, and whether the keeper reached the lens
  const after = { growth: { ...stats.growth }, bound, lens: Boolean(engine?.phase) };
  if (b.quit) {
    barker.hush();
    stopSpeaking();
    song.stop(1);
    fx.stop();
    return { won: false, quit: true, saved: Boolean(saveAs), stats, battle: b, carry: E.carryOver(b), potions: b.items.potion, biscuits: b.items.biscuit, ...after };
  }
  const won = b.over === "victory";
  setTimeout(() => fx.stop(), 2500); // let the last sparks fade, then shut the canvas down
  barker.hush();
  song.stop(1.5);
  // The loop gives way to the victory fanfare or the defeat sting. A bound
  // Titan: no fanfare and no jokes; the story takes it from here, quietly.
  if (won && bound) {
    b.heroes.filter((x) => x.active && !x.ko).forEach((x) => setPose(sprites[x.key], "victory"));
    await wait(1800);
  } else if (won) {
    if (!music.sting("music_victory", { stopLoop: true })) sfx.victory();
    b.heroes.filter((x) => x.active && !x.ko).forEach((x) => setPose(sprites[x.key], "victory"));
    const star = activeHeroes().length ? rng.pick(activeHeroes()) : null;
    if (star) await barker.say(star.cls, "victory", { wait: 1500 });
  } else if (!music.sting("music_defeat", { stopLoop: true })) sfx.defeat();
  if (!bound) kitSay(quip(won ? "victory" : "defeat", rng), { ms: 6000, mood: won ? "laughing" : "worried" });
  await wait(1200);
  return { won, stats, battle: b, carry: E.carryOver(b), potions: b.items.potion, biscuits: b.items.biscuit, ...after };
}
