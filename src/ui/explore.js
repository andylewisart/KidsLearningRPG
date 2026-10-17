// Exploring Driftwood Isle (chapter 1): walk around, look at things, talk to
// people, pick things up and use them, and get ambushed by fiends. The places
// and things are in world/data.js and the story in world/story.js; this file
// draws them and runs the input.
//
// Controls: click the ground to walk (or arrow keys / WASD); click something
// to walk over and use it (or E when standing next to it); click an item in
// the bag, then something in the scene, to use the item on it. Esc pauses.

import { h, wait, deferred, onKeys } from "./dom.js";
import LAYOUT from "./stage-layout.json";
import { createStage, profileFor } from "./scene.js";
import { makeSprite, setPose, assetInfo, assetUrl, artFor, setSheetFrame, preloadSheet, portraitFor } from "./sprites.js";
import { propArt, itemIcon, shardIcon, isPainted } from "./props.js";
import { createDialogue, speakerName, speakerFace } from "./dialogue.js";
import { iconLabel, uiIcon } from "./icons.js";
import { askPuzzle } from "./ask.js";
import { runBattle } from "./battle.js";
import { openGrid } from "./grid.js";
import { createForge, preloadForge } from "./forge.js";
import { sfx, music, ambience, song, setMusicMuted, applyVolumes, audioManifest, filmSound } from "./audio.js";
import { speak, stopSpeaking, preloadLines } from "../ai/voice.js";
import { SCENES, ITEMS, ENCOUNTER_GRACE, POTIONS, MAP } from "../world/data.js";
import { CONVOS, SCRIPTS, USES, EXITS, ARRIVE, VISIBLE, SPARKLE, PAINTED } from "../world/story.js";
import { CARDS, LANTERN_SONG, SONG_STAND_IN, afterArrive, onMap, nudge, nextGoal, glintAt, trailGoal, openChapter2 } from "../world/chapter2.js";
import { PETS } from "../world/data2.js";
import { earnLight, gridOf, anyReady, quietPlace, encounterPace, glimmerFor } from "../world/grid.js";
import { partsFor, addParts, forgeOf } from "../world/forge.js";
import { paintedReady, paintedLayout, activeStates } from "../world/painted.js";
import { PUZZLES, PUZZLE_TRACK } from "../world/puzzles.js";
import { upgradeWorld, hasItem, giveItem, takeItem, addShard, joinParty, wildEncounter, encounterOptions, walkFor, grace, stepToward, clampTo, freePoint, findPath, inside, checkpoint, heroState, battleStart, afterBattle, battlePets, rest, partyHealth, reachable, routeTo, placeOf, trailOpen, isTeaser, trailPointFrom, followStep, walkingNow, SHARDS } from "../world/state.js";
import { TRAINING, CLASSES, TITANS } from "../battle/data.js";
import { POWERS } from "../learn/writing.js";
import { getSave, update } from "../store/save.js";
import { gradeFor, playerName } from "../learn/players.js";
import { playtimeState, campSoonDue, markCampSoon, campNow, takeMorning } from "./playtimer.js";

const K = LAYOUT.explore.spriteScale; // people and things are drawn a little smaller than in battle
const WALK_SPEED = 300; // stage px per second at the reference depth
const REACH = 150; // how close he must stand to use something with E
const HERO_SIZE = LAYOUT.sizes.hero;
const KIT_SIZE = [96, 96];
const PET_SIZE = [92, 92];
const FOLLOW_GAP = 95; // trail distance between party members

// Sounds that might not be in the sound pack yet, and what to play instead.
const FALLBACK = {
  sfx_squeak: () => sfx.select(),
  sfx_pickup: () => sfx.right(),
  sfx_chest: () => sfx.heal(),
  sfx_door_stone: () => sfx.quake(),
  sfx_monkey: () => sfx.miss(),
  sfx_puzzle_solved: () => sfx.capture(),
  sfx_encounter: () => sfx.bar(),
  sfx_summon_rise: () => sfx.summon(),
  sfx_join: () => sfx.capture(),
};
const play = (id) => sfx.play(id) || FALLBACK[id]?.();
const SONG = "music_maren_song"; // Maren singing to the tide (tools/audio/sounds.json)
/** Sliding down the rope toward her song (she hasn't been met yet): it carries on from the canyon into the grotto. */
const followingSong = (w) => w.mapRide?.to === "grotto" && !w.flags.metCaller;

// What the people met on the island do with their exploring sheets (art wave
// 05: frames named in the manifest). idle: while waiting (a list cycles, e.g.
// singing); a mood: while saying a line in that mood (moods from story.js).
// A pose the sheet doesn't have falls back to its idle frame.
// idle: the poses she cycles through; after: [world flag, the idle poses from then on]
const NPC_POSES = {
  // furious at the monkey until she has her power cell back, then pleased with herself
  gunner: { idle: ["angry"], after: ["gotCell", ["pleased"]], angry: "shout", smug: "talk", neutral: "talk", worried: "talk", shocked: "talk", laughing: "pleased" },
  // singing to the tide until she's met, then calm and listening
  titancaller: { idle: ["sing", "sing2"], after: ["metCaller", ["listen"]], any: "greet" },
};

const world = () => getSave().world;
/** The voice style a speaker's lines are recorded under (Kit is "droid"). */
const voiceOf = (who) => (who === "kit" ? "droid" : who);
// For automated playtests: ?debug exposes the world and the current puzzle; ?calm turns ambushes off.
const PARAMS = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const DEBUG = PARAMS.has("debug");
const CALM = PARAMS.has("calm");
const saveWorld = () => update(() => {});

/** Fill in anything an older save is missing (state.js, upgradeWorld). */
function ensureWorld() {
  update((s) => (s.world = upgradeWorld(s.world, { glimmer: s.progress?.shards })));
}

const firstArt = (ids) => ids.find((id) => assetInfo(id)?.base?.src) || ids[ids.length - 1];

/** The adventure: runs scene after scene until he quits to the title. */
export async function runAdventure(app, { mastery, rng }) {
  ensureWorld();
  // For playtests: ?explore&debug&scene=temple starts in a scene, skipping the
  // opening; &at=lair starts as if he had played up to there (state.js,
  // checkpoint), and the two combine
  const at = DEBUG && checkpoint(PARAMS.get("at"));
  if (at) update((s) => (s.world = at));
  const jump = DEBUG && PARAMS.get("scene");
  if (at || jump) update((s) => (s.fight = null)); // a playtest jump starts clean
  if (jump && SCENES[jump]) {
    update((s) => {
      Object.assign(s.world, { started: true, scene: jump, pos: [...SCENES[jump].start], onMap: false });
      s.world.flags.woke = true;
    });
  }
  if (!world().started) {
    await prologue(app, { mastery, rng });
    update((s) => (s.world.started = true));
  }
  for (;;) {
    // chapter 1 is over: on into chapter 2 (a save from before chapter 2 picks up here too)
    if (world().finished && !world().flags.ch2) {
      update((s) => openChapter2(s.world));
      await chapterTitle(app, 2, "Driftwood Harbor", "story_harbor_arrival");
    }
    const r = world().onMap ? await runMap(app, { rng }) : await runScene(app, { mastery, rng });
    if (r === "quit" || r === "camp") {
      stopSpeaking();
      music.stop?.(0.8);
      ambience.stop?.();
      return;
    }
  }
}

/**
 * A chapter's title over its first painting: "Chapter 2", its name. A click
 * or a key moves on, and it never waits more than a few seconds.
 */
async function chapterTitle(app, n, name, art) {
  const screen = h("div.screen.chapter-title");
  const src = assetUrl(art);
  if (src && (await imageReady(src))) screen.append(h("div.chapter-art", { style: { backgroundImage: `url("${src}")` } }));
  const card = h("div.chapter-card", {}, h("div.chapter-n", {}, `Chapter ${n}`), h("h1", {}, name));
  screen.append(card);
  app.replaceChildren(screen);
  music.play("music_title");
  card.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 1200, easing: "ease-out", fill: "both" });
  const go = deferred();
  const off = onKeys((e) => ["Enter", " ", "Escape"].includes(e.key) && go.resolve());
  screen.addEventListener("click", () => go.resolve());
  await Promise.race([wait(5200), go.promise]);
  off();
  await screen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" }).finished;
}

// ---------------------------------------------------------------- the island map

// The map painting (art wave 04, "map_driftwood") is 1536 x 1024, scaled to
// cover the 1280 x 720 stage: the strips above and below are cut off.
const MAP_W = 1536;
const MAP_H = 1024;
const MAP_S = 1280 / MAP_W;
const MAP_DY = (720 - MAP_H * MAP_S) / 2;
const onStage = ([x, y]) => [x * MAP_S, y * MAP_S + MAP_DY];

/** The map painting: from chapter 2 on, the one with the harbor opened up (variant harbor_open). */
function mapArt(w) {
  const art = assetInfo("map_driftwood");
  const open = w?.flags?.ch2 ? art?.variants?.harbor_open : null;
  return open?.src ? { ...art, ...open, base: { src: open.src } } : art;
}
/** Where things are on the map: the painting's own numbers when it has them, else ours. */
function mapPlaces(w) {
  const art = mapArt(w);
  return Object.fromEntries(Object.entries(MAP.places).map(([id, p]) => [id, { ...p, at: art?.places?.[id] || p.at }]));
}
/** A chapter 2 place shows on the map once a trail to it is open. */
const onMapNow = (w, id, p) => !p.chapter || MAP.trails.some((t) => (t.a === id || t.b === id) && trailOpen(w, t));
function trailPoints(t, places, w) {
  const art = mapArt(w)?.trails;
  const pts = art?.[`${t.a}-${t.b}`] || art?.[`${t.b}-${t.a}`]?.slice().reverse();
  return pts?.length ? pts : [places[t.a].at, places[t.b].at];
}

/** A stand-in map until the painting lands: sea, an island and its landmarks, drawn in SVG. */
function standInMap(places) {
  const blob = "M240,520 C250,410 330,350 520,300 C620,250 650,170 820,165 C960,160 1000,260 1120,300 C1250,340 1420,470 1415,620 C1410,760 1260,850 1100,880 C930,910 760,915 600,870 C430,830 300,760 260,640 Z";
  const marks = Object.entries(places)
    .map(([, p]) => `<circle cx="${p.at[0]}" cy="${p.at[1]}" r="${p.teaser ? 30 : 42}" fill="${p.teaser ? "#2f5a3a" : "#3d7a45"}" opacity=".55"/>`)
    .join("");
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="mapsea" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1f8fb0"/><stop offset="1" stop-color="#0b3a63"/></radialGradient></defs><rect width="${MAP_W}" height="${MAP_H}" fill="url(#mapsea)"/><path d="${blob}" fill="#e9d79b" transform="translate(-14 10) scale(1.02)" opacity=".85"/><path d="${blob}" fill="#4f9a4a"/><path d="M980 470 l40 -60 l30 50 l35 -70 l25 60 l40 -40 l10 90 Z" fill="#8f7fc8" opacity=".55"/><path d="M500 360 l40 -70 l40 70 Z" fill="#7a5a4a" opacity=".6"/>${marks}</svg>`;
}

/** Rope lines on the map: from one place down to another (the canyon's chasm to the grotto), once ridden. */
const ROPES = [{ a: "canyon", b: "grotto", needs: "zipDone" }];
const ropeFor = (from, to) => ROPES.find((r) => r.a === from && r.b === to);

/** A sagging rope from one map point to another (stage pixels): a point at t in [0, 1]. */
function ropePoint([x0, y0], [x1, y1], t) {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + 28; // it sags below the lower end's height, like a real line
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}

/** The island map: click a place to travel there along the open trails. Resolves "next" or "quit". */
async function runMap(app, { rng }) {
  const w = world();
  const places = mapPlaces(w);
  const here = placeOf(w.scene);
  const open = reachable(w, w.scene);
  const screen = h("div.screen.map-screen");
  const artInfo = mapArt(w);
  const art = artInfo?.base?.src ? `assets/${artInfo.base.src}` : null;
  const backdrop = h("div.map-art");
  if (art) backdrop.style.backgroundImage = `url("${art}")`;
  else backdrop.innerHTML = standInMap(places);
  const trails = h("div.map-trails");
  const svgParts = MAP.trails
    .filter((t) => onMapNow(w, t.a, places[t.a]) && onMapNow(w, t.b, places[t.b]))
    .map((t) => {
      const pts = trailPoints(t, places, w).map(onStage);
      const on = trailOpen(w, t);
      return `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" class="${on ? "open" : t.teaser ? "teaser" : "closed"}"/>`;
    })
    .join("");
  const ropes = ROPES.filter((r) => w.flags[r.needs] || w.mapRide)
    .map((r) => {
      const [a, b] = [onStage(places[r.a].at), onStage(places[r.b].at)];
      const pts = Array.from({ length: 21 }, (_, i) => ropePoint(a, b, i / 20).map((v) => v.toFixed(1)).join(","));
      return `<polyline points="${pts.join(" ")}" class="rope"/>`;
    })
    .join("");
  trails.innerHTML = `<svg viewBox="0 0 1280 720">${svgParts}${ropes}</svg>`;
  const title = h("div.place-name", {}, "Driftwood Isle");
  const hint = h("div.map-hint", {}, "Click a place to go there.");
  const token = h("div.map-token", {}, ...(assetInfo("knight")?.portraits?.src ? [portraitFor("knight", "neutral")] : []));
  const fade = h("div.fade");
  screen.append(backdrop, trails, title, hint);
  const dialogue = createDialogue(screen);
  const d = deferred();
  let busy = false;
  const off = onKeys((e) => {
    if (busy) return;
    if (e.key === "Escape") pick(here); // back where he came from
  });

  // Kit has marked the way (a nudge, strength 4): the place to go glows
  const goal = trailGoal(w) && placeOf(trailGoal(w));
  for (const [id, p] of Object.entries(places)) {
    if (!onMapNow(w, id, p)) continue;
    const [x, y] = onStage(p.at);
    const teaser = isTeaser(w, p);
    const can = !teaser && open.has(id);
    const btn = h(`button.map-place${teaser ? ".teaser" : can ? ".open" : ".locked"}${id === here ? ".here" : ""}${id === goal ? ".goal" : ""}${p.nameAbove ? ".name-above" : ""}`, { style: { left: `${x}px`, top: `${y}px` }, title: p.name }, h("span.map-x", {}, "✕"), h("span.map-name", {}, teaser ? `${p.name}?` : p.name));
    btn.addEventListener("click", () => pick(id));
    screen.append(btn);
  }
  const [tx, ty] = onStage(places[here]?.at || [768, 512]);
  Object.assign(token.style, { left: `${tx}px`, top: `${ty}px` });
  screen.append(token, fade);
  app.replaceChildren(screen);
  const songRide = followingSong(w);
  if (songRide) {
    music.stop(0.6);
    song.play(SONG, { volume: 0.3, muffled: true });
  } else music.play("music_journey");
  ambience.stop?.();
  fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });

  const say = async (id) => {
    for (const line of CONVOS[id] || []) await dialogue.say(line);
    dialogue.hide();
  };
  /** The party token slides down a rope from one place to another, picking up speed. */
  async function ride(from, to) {
    const [a, b] = [onStage(places[from].at), onStage(places[to].at)];
    play("sfx_swap") || sfx.swap();
    token.classList.add("riding");
    const t0 = performance.now();
    const ms = 1700;
    await new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        const t = k * k * (1.6 - 0.6 * k); // a slow start off the edge, then faster and faster
        const [x, y] = ropePoint(a, b, t);
        Object.assign(token.style, { left: `${x}px`, top: `${y}px`, transform: `rotate(${Math.sin(k * Math.PI * 3) * 8}deg)` });
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    token.classList.remove("riding");
    token.style.transform = "";
  }

  /**
   * The ride down to the grotto, painted (art wave 05 F): a few seconds of it,
   * drifting toward the cave while the song grows, before the grotto opens.
   * A click or a key moves on. Nothing happens until the painting exists.
   */
  async function descent() {
    if (!assetInfo("story_descent")?.base?.src) return;
    const src = assetUrl("story_descent");
    const ready = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    if (!ready) return;
    const art = h("div.story-art.descent", { style: { backgroundImage: `url("${src}")` } });
    fade.before(art);
    art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: "ease-out", fill: "forwards" });
    art.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }], { duration: 6000, easing: "ease-in-out", fill: "forwards" });
    const skip = deferred();
    art.addEventListener("click", () => skip.resolve());
    const offSkip = onKeys((e) => ["Enter", " ", "Escape"].includes(e.key) && skip.resolve());
    await Promise.race([wait(5400), skip.promise]);
    offSkip();
  }

  /** Into a place on the island, from the map. */
  async function enter(sceneId) {
    play("sfx_step_sand");
    w.scene = sceneId;
    w.pos = SCENES[sceneId].fromMap || null;
    w.onMap = false;
    w.mapRide = null;
    saveWorld();
    await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: "forwards" }).finished;
    off();
    dialogue.close();
    d.resolve("next");
  }

  // straight off a zip line: ride it, then into the place at the bottom
  if (w.mapRide && places[w.mapRide.from] && places[w.mapRide.to]) {
    busy = true;
    const { from, to } = w.mapRide;
    await wait(500);
    if (songRide) song.level(0.42, false, 0.7); // clearer as they slide down toward it (about as loud as it is where they land)
    await ride(from, to);
    await wait(250);
    const into = places[to].scene;
    if (into === "grotto") await descent();
    if (into) return enter(into).then(() => d.promise);
  }

  if (!w.flags.mapSeen) {
    w.flags.mapSeen = true;
    saveWorld();
    busy = true;
    await wait(700);
    await say("mapFirst");
    busy = false;
  }
  // chapter 2: the first time after the lamp room, the old places glint (beat 10)
  if (w.flags.ch2) {
    busy = true;
    await onMap({ world: w, save: saveWorld, say });
    busy = false;
  }

  async function pick(id) {
    if (busy) return;
    const p = places[id];
    sfx.select();
    if (isTeaser(w, p)) {
      busy = true;
      // once chapter 1 is over, a teaser can have something new to say ("mapHarborAfter")
      await say(w.finished && CONVOS[`${p.teaser}After`] ? `${p.teaser}After` : p.teaser);
      busy = false;
      return;
    }
    if (!open.has(id)) {
      // the trail that would lead there, and why it's shut
      const t = MAP.trails.find((x) => !x.teaser && (x.a === id || x.b === id) && !trailOpen(w, x));
      busy = true;
      await say(t?.locked || "mapGrottoLocked");
      busy = false;
      return;
    }
    busy = true;
    const route = routeTo(w, here, id) || [here, id];
    // the little party walks the trails
    for (let i = 1; i < route.length; i++) {
      // down a zip line: ride it instead of walking the cliff path
      if (ropeFor(route[i - 1], route[i]) && w.flags[ropeFor(route[i - 1], route[i]).needs]) {
        await ride(route[i - 1], route[i]);
        continue;
      }
      const t = MAP.trails.find((x) => (x.a === route[i - 1] && x.b === route[i]) || (x.b === route[i - 1] && x.a === route[i]));
      let pts = trailPoints(t, places, w);
      if (t.a !== route[i - 1]) pts = pts.slice().reverse();
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = onStage(pts[j - 1]);
        const [x1, y1] = onStage(pts[j]);
        const ms = Math.max(120, Math.hypot(x1 - x0, y1 - y0) * 3.2);
        await token.animate([{ left: `${x0}px`, top: `${y0}px` }, { left: `${x1}px`, top: `${y1}px` }], { duration: ms, fill: "forwards", easing: "linear" }).finished;
        Object.assign(token.style, { left: `${x1}px`, top: `${y1}px` });
      }
    }
    await enter(p.scene);
  }

  return d.promise;
}

// ---------------------------------------------------------------- the signpost's words

// The clear wood on each painted board, in pixels of prop_signpost (686x1024),
// and the board's tilt. A word is squeezed or stretched to fill its board.
const SIGN_BOARDS = {
  left: { x: 90, y: 207, w: 256, h: 66, rot: -4 },
  right: { x: 335, y: 417, w: 250, h: 70, rot: -6 },
};

function signWord(side, word, painted) {
  if (!painted) return h(`div.sign-word.${side}`, {}, word); // the stand-in sign has room to spare
  const b = SIGN_BOARDS[side];
  const pct = (v, of) => `${(v / of) * 100}%`;
  const el = h("div.sign-word.board", { style: { left: pct(b.x, 686), top: pct(b.y, 1024), width: pct(b.w, 686), height: pct(b.h, 1024), transform: `rotate(${b.rot}deg)` } });
  el.innerHTML = `<svg viewBox="0 0 ${b.w} ${b.h}" preserveAspectRatio="none"><text x="${b.w / 2}" y="${b.h * 0.8}" text-anchor="middle" font-size="${b.h * 0.86}" textLength="${b.w - 16}" lengthAdjust="spacingAndGlyphs">${word}</text></svg>`;
  return el;
}

// ---------------------------------------------------------------- the opening

// The opening plays in beats (docs/story/chapter1-proposal.md, section 3).
// Each beat is a CONVOS key in story.js over its own picture: the first of
// `art` that exists. Until a beat's own painting lands, a stand-in painted in
// other light is graded to match (STAND_IN_GRADE), so the light runs one way:
// night on deck, dawn as the shards come down, sunrise on the beach.
//   film: a clip over the beat's picture, rolling on line `roll` (counted from
//         the end if negative); the beat moves on when it reaches `to` seconds
//         (a click hurries it). null until the parent has made it.
//   ram:  the ram and the fall, filmed. It plays from `from` to `to` seconds,
//         each line at its `at` (seconds after `from`), crashes at `impact`
//         (or as it starts), and fades to white. A film with `sound` has its
//         own soundtrack, the lines' voices in it: the story box only shows a
//         line's words, from its `at` to its `until` (none for a yell), clicks
//         don't hurry it, and `music` cues the music loop on its clock (duck,
//         swell, out). Without the film, its lines play over `stills`.
// A line with `glow` makes the new crystal flare (CRYSTAL_AT: where it sits in
// each painting); after a line with `ask`, he teaches the crystal one fact.
const OPENING = [
  { convo: "prologue", art: ["story_albatross", "key_art"], push: true },
  { convo: "prologueDeck", art: ["story_deck", "story_albatross"] },
  // the charge: it stops just before the prow hits (the ram's film starts on that frame)
  { convo: "prologueJumble", art: ["story_galleon_night", "story_galleon"], film: "assets/video/story_galleon_charge.mp4", roll: -1, to: 4.3, music: "music_jumble" },
  // the intro film (art/video-refs/intro-v8/, its sound from tools/audio/intro-mix.py): the
  // hit at 0.65 s, the crystal bursting (3.0, "The crystal!"), Cade thrown (5.2), the galleon
  // turning to fog (Jumble, 6.15), Wren catching the rope (8.55), the jungle (14.0), the beach
  // (16.9) and the thumbs-up (19.6), held a moment, with no lines, then white.
  // Jumble's theme ducks at the hit, swells for the fall and is gone before the jungle.
  // Without the film, the spoken lines play over stills: the hit, then the fall at dawn (art wave 07).
  {
    convo: "prologueFilm",
    art: ["story_ram"],
    stills: [null, null, null, null, ["story_fall"], null],
    ram: {
      src: "assets/video/story_intro.mp4",
      sound: true,
      from: 0,
      to: 21.0,
      impact: 0.65,
      at: [3.0, 5.2, 6.15, 8.5, 8.55, 14.0],
      until: [4.6, null, 8.55, null, 11.6, null],
      music: [[0.65, "duck"], [8.5, "swell"], [12.0, "out"]],
    },
  },
];
/** Stand-ins painted in other light, and the grade that makes them fit (styles/world.css). */
const STAND_IN_GRADE = { story_galleon: "night" };
/** Where the new crystal sits in each painting: percent across and down the whole picture. */
// (story_deck: the stand-in's grate; Codex's repaint, art wave 07, puts it near [50, 58])
const CRYSTAL_AT = { story_deck: [50, 84], story_albatross: [48, 44] };

/**
 * When the story box would cover the crystal (it sits low in the picture),
 * the view tilts down to it as it flares, and back on the next line: a
 * zoom about the screen's middle that lifts it above the box, never past
 * the picture's bottom edge. Null when the crystal is already in view.
 * The opening's paintings are laid out whole: 1280 x 853, from -67 to 787.
 */
function crystalTilt([, y]) {
  const at = (y / 100) * 853.33 - 66.67;
  if (at < 500) return null;
  const s = 1.5;
  const t = Math.max(430 - (360 + (at - 360) * s), 720 - (360 + 427 * s));
  return `translateY(${Math.round(t)}px) scale(${s})`;
}
/** The opening ends in white, and the beach fades in from it (runScene). */
let enterFromWhite = false;

/** A clip for the opening (muted, unless it brings its own `sound`): whether it can play, and a way to wait for a moment in it. */
function openingFilm(src, { sound = false } = {}) {
  const el = h("video.story-film", { muted: true, playsInline: true, preload: "auto", src });
  if (sound) filmSound(el);
  const ok = new Promise((resolve) => {
    el.addEventListener("canplay", () => resolve(true), { once: true });
    el.addEventListener("error", () => resolve(false), { once: true });
    setTimeout(() => resolve(el.readyState >= 3), 6000);
  });
  let rolling = false;
  /** Resolves once the clip has played to `t` seconds (never, if it isn't playing). */
  const at = (t) =>
    new Promise((resolve) =>
      (function check() {
        if (el.ended || el.currentTime >= t) resolve();
        else if (rolling) requestAnimationFrame(check);
      })(),
    );
  async function roll(from = 0) {
    el.currentTime = from;
    rolling = true;
    try {
      await el.play();
      return true;
    } catch {
      // a browser that won't start it with sound may still start it muted
      if (!el.muted) {
        el.muted = true;
        return roll(from);
      }
      rolling = false;
      return false;
    }
  }
  const stop = () => {
    rolling = false;
    el.pause();
  };
  return { el, ok, at, roll, stop };
}

async function prologue(app, { mastery, rng }) {
  // each painting is laid out whole (3:2), running past the top and bottom of the screen, so a tilt never runs out of picture
  const img = h("div.story-art.whole");
  const faceEl = h("div.story-face");
  const nameEl = h("div.story-name");
  const textEl = h("div.story-text");
  const box = h("div.story-box", {}, faceEl, h("div.story-words", {}, nameEl, textEl));
  const veil = h("div.story-veil");
  const skip = h("div.story-skip", {}, "Click or Enter: next · Esc: skip");
  const beats = OPENING.map((b) => ({ ...b, lines: CONVOS[b.convo] || [] })).filter((b) => b.lines.length);
  const films = new Map(beats.filter((b) => b.film || b.ram).map((b) => [b.convo, openingFilm(b.film || b.ram.src, { sound: Boolean(b.ram?.sound) })]));
  const screen = h("div.screen.story", {}, img, ...[...films.values()].map((f) => f.el), veil, box, skip);
  app.replaceChildren(screen);
  music.play("music_title");
  preloadLines(beats.flatMap((b) => (b.ram?.sound ? [] : b.lines)).map((l) => ({ style: voiceOf(l.who), text: l.text })));

  let next = deferred();
  let skipped = false;
  let asking = false; // while he teaches the crystal, the problem window has the keys
  const advance = () => next.resolve();
  screen.addEventListener("click", () => asking || advance());
  const off = onKeys((e) => {
    if (asking) return;
    if (e.key === "Escape") {
      skipped = true;
      advance();
    } else if (e.key === "Enter" || e.key === " ") advance();
  });
  /** Resolves on a click (or skip); `also` can end the wait sooner. Says which came first. */
  async function click(...also) {
    next = deferred();
    const how = await Promise.race([next.promise.then(() => "click"), ...also.map((p) => p.then(() => "film"))]);
    if (how === "click" && !skipped) sfx.select();
    return how;
  }
  const veilTo = (opacity, duration) => veil.animate([{ opacity: getComputedStyle(veil).opacity }, { opacity }], { duration, easing: "ease-in-out", fill: "forwards" }).finished;

  let shown = null;
  let tilted = false;
  /** Tilt the view (crystalTilt), or back to the whole picture. */
  function tilt(to) {
    const now = getComputedStyle(img).transform;
    img.animate([{ transform: now === "none" ? "none" : now }, { transform: to || "none" }], { duration: 1500, easing: "ease-in-out", fill: "forwards" });
    tilted = Boolean(to);
  }
  function showArt(ids, { push = false } = {}) {
    const id = firstArt([...ids, "story_albatross", "key_art"]);
    if (id === shown) return;
    shown = id;
    tilted = false;
    img.getAnimations().forEach((a) => a.cancel());
    img.replaceChildren();
    img.className = "story-art whole";
    const grade = id !== ids[0] && STAND_IN_GRADE[id];
    if (grade) img.classList.add(`grade-${grade}`);
    img.style.backgroundImage = `url("${assetUrl(id)}")`;
    img.animate([{ opacity: 0, transform: "scale(1.06)" }, { opacity: 1, transform: "scale(1)" }], { duration: 900, easing: "ease-out", fill: "forwards" });
    if (push) img.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }], { duration: 16000, delay: 900, easing: "linear", fill: "forwards" });
  }

  /** The new crystal flares where it sits in the picture. */
  function glow() {
    const at = CRYSTAL_AT[shown];
    if (!at) return;
    const [x, y] = at;
    const g = h("div.crystal-glow", { style: { left: `${x}%`, top: `${y}%` } });
    // its light washes up over everything near it (on deck, the grate sits low, under the words)
    const bloom = h("div.crystal-bloom", { style: { background: `radial-gradient(ellipse 70% 80% at ${x}% ${y}%, rgba(140, 240, 255, 0.55), rgba(80, 200, 255, 0.16) 45%, rgba(80, 200, 255, 0) 75%)` } });
    img.append(bloom, g);
    bloom.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.55 }], { duration: 2200, easing: "ease-out", fill: "forwards" });
    const tiltTo = crystalTilt(at);
    if (tiltTo) tilt(tiltTo);
    g.animate(
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.3)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1.35)", offset: 0.3 },
        { opacity: 0.75, transform: "translate(-50%, -50%) scale(1)" },
      ],
      { duration: 1800, easing: "ease-out", fill: "forwards" },
    );
    play("sfx_puzzle_solved");
  }

  /** A line in the story box, said aloud (unless the film it's in says it: `say` false). */
  function showLine(l, { say = true } = {}) {
    if (tilted && !l.glow) tilt(null); // back up to the people talking
    box.getAnimations().forEach((a) => a.cancel());
    const face = l.who === "narrator" ? null : speakerFace(l.who, l.mood);
    faceEl.replaceChildren(...(face ? [face] : []));
    faceEl.style.display = face ? "block" : "none";
    nameEl.textContent = speakerName(l.who);
    screen.classList.toggle("ghost", l.who === "jumble");
    box.style.opacity = "1";
    textEl.textContent = l.text;
    textEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" });
    if (say) {
      stopSpeaking();
      speak(l.text, voiceOf(l.who));
    }
    if (l.glow) glow();
  }
  /** The story box fades away. */
  function hideBox(ms = 300) {
    const from = getComputedStyle(box).opacity;
    box.getAnimations().forEach((a) => a.cancel());
    box.style.opacity = "0";
    if (ms) box.animate([{ opacity: from }, { opacity: 0 }], { duration: ms });
  }

  /** He teaches the crystal one fact (the problem window, with the usual help; no stepping away). */
  async function teach() {
    asking = true;
    box.style.opacity = "0";
    try {
      mastery.beginTurn?.("mul");
      const q = PUZZLES.crystal({ mastery, rng });
      if (DEBUG) window.__puzzle = q;
      await askPuzzle(screen, q, { mastery, rng, canStepAway: false });
    } finally {
      asking = false;
    }
  }

  /** The ram and the fall: a hard cut into the film, its lines on its clock, then white before the landing. */
  async function ram(beat) {
    const r = beat.ram;
    const f = films.get(beat.convo);
    /** The hit: a crash, a white flash and a shake (and Jumble's theme cut off, or ducked under a film's own sound). */
    const crash = () => {
      if (!(rolling && r.sound)) {
        music.stop?.(0.2);
        play("sfx_quake");
      }
      screen.animate([{ transform: "translate(0,0)" }, { transform: "translate(-14px,8px)" }, { transform: "translate(12px,-9px)" }, { transform: "translate(0,0)" }], { duration: 450 });
      veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: "ease-out" });
    };
    const rolling = (await f.ok) && (await f.roll(r.from));
    // the hit lands where the film has it (`impact`); a film without one, or none at all, starts on it
    if (rolling && r.impact != null) f.at(r.impact).then(() => !skipped && crash());
    else crash();
    if (rolling && r.sound) {
      await soundFilm(beat, f);
      return;
    }
    // the clip before it (the charge) gives way to it
    const others = () => [...films.values()].filter((o) => o !== f).forEach((o) => (o.stop(), o.el.getAnimations().forEach((a) => a.cancel()), (o.el.style.opacity = "0")));
    if (!rolling) {
      others();
      for (let i = 0; i < beat.lines.length && !skipped; i++) {
        if (beat.lines[i].effort) continue; // a yell needs the film under it
        showArt([...(beat.stills?.[i] || []), ...beat.art]);
        showLine(beat.lines[i]);
        await click();
      }
      return;
    }
    f.el.style.opacity = "1";
    others();
    for (let i = 0; i < beat.lines.length && !skipped; i++) {
      await Promise.race([f.at(r.from + (r.at[i] ?? 0)), next.promise]);
      showLine(beat.lines[i]);
      const until = i + 1 < beat.lines.length ? r.from + (r.at[i + 1] ?? 0) : r.to;
      await click(f.at(until));
    }
    box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    await veilTo(1, 500);
    f.stop();
    f.el.style.opacity = "0";
  }

  /**
   * A film with its own sound (the intro): it says its lines itself, so the box
   * only shows the words, each from its `at` to its `until`, and the music loop
   * follows its cues. Only Esc hurries it. Then white, as the surf rolls on.
   */
  async function soundFilm(beat, f) {
    const r = beat.ram;
    f.el.style.opacity = "1";
    [...films.values()].filter((o) => o !== f).forEach((o) => (o.stop(), o.el.getAnimations().forEach((a) => a.cancel()), (o.el.style.opacity = "0")));
    hideBox(0);
    const cue = { duck: () => music.duck(true), swell: () => music.duck(false), out: () => music.stop(2.5) };
    for (const [t, what] of r.music || []) f.at(r.from + t).then(() => !skipped && cue[what]?.());
    /** Wait for a moment in the film; a click doesn't hurry it, Esc ends the wait. */
    const until = async (t) => {
      while (!skipped && !f.el.ended && f.el.currentTime < t) {
        next = deferred();
        await Promise.race([f.at(t), next.promise]);
      }
    };
    let shownAt = -1;
    beat.lines.forEach((l, i) => {
      if (r.until?.[i] == null) return;
      f.at(r.from + r.at[i]).then(() => {
        if (skipped) return;
        shownAt = i;
        showLine(l, { say: false });
      });
      f.at(r.from + r.until[i]).then(() => !skipped && shownAt === i && hideBox());
    });
    await until(r.from + r.to);
    hideBox();
    if (!skipped) await veilTo(1, 600);
    f.stop();
    f.el.style.opacity = "0";
    music.duck(false); // whatever was ducked comes back for the beach
  }

  for (const beat of beats) {
    if (skipped) break;
    if (beat.ram) {
      await ram(beat);
      continue;
    }
    showArt(beat.art, { push: beat.push });
    if (beat.music) music.play(beat.music);
    if (Number(getComputedStyle(veil).opacity) > 0) veilTo(0, 1200); // out of the white, into the dawn
    const f = films.get(beat.convo);
    const rollAt = beat.film ? (beat.roll < 0 ? beat.lines.length + beat.roll : beat.roll) : -1;
    let filming = false;
    for (let i = 0; i < beat.lines.length && !skipped; i++) {
      const l = beat.lines[i];
      if (i === rollAt && f && (await f.ok) && (await f.roll(0))) {
        filming = true;
        f.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
      }
      showLine(l);
      const end = beat.to ?? (f?.el.duration || 10) - 0.05;
      await click(...(filming ? [f.at(end)] : []));
      if (l.ask && !skipped) await teach();
    }
    // a clip finishes before the story moves on (a click hurries it)
    if (filming && !skipped) await click(f.at(beat.to ?? (f.el.duration || 10) - 0.05));
    if (filming) f.stop();
  }
  off();
  stopSpeaking();
  for (const f of films.values()) f.stop();
  hideBox(400);
  await veilTo(1, 900);
  enterFromWhite = true;
}

// ---------------------------------------------------------------- the end of chapter 1

// The ending's moments (story.js endingCrystal, endingHarbor, endingJumble).
// Each is a painting (art wave 06: the first of `art` that exists) or, once
// the parent has made one, a film of it: a clip made from that painting (its
// first frame), up to 15 seconds, muted, in public/assets/video/ (`film`,
// null until it's there). It starts rolling as line `roll` comes up. `glow`:
// where the shards meet in the painting (percent across, down).
const ENDING = {
  crystal: { art: ["story_crystal_remade"], film: "assets/video/ending_crystal.mp4", roll: 0, glow: [50, 45] },
  harbor: { art: ["story_ending"], film: "assets/video/ending_harbor.mp4", roll: 3 }, // rolls on "Look at the lighthouse": Pockets drops from the palm, and leaps for the hat about 6 s in, just before "Hey! My hat!"
  jumble: { art: ["story_jumble_next", "story_galleon"], film: "assets/video/ending_jumble.mp4", roll: 0 },
};
/** The shards he won, for the "Chapter 1 complete" card: where, and what he did there. */
const SHARD_DEEDS = {
  cove: ["Shipwreck Cove", () => "Cracked the sea chest's number lock"],
  temple: ["The Hall of Glyphs", () => `Unscrambled the word cage and freed ${speakerName("spellwright")}`],
  canyon: ["The Crystal Canyon", () => `Tuned Captain ${speakerName("gunner")}'s blaster, row by row`],
  lair: ["The Geode Titan's lair", () => "Beat the Geode Titan"],
};
/** What's waiting in chapter 2 (docs/world.md). */
const NEXT_UP = () => [
  "The lighthouse, and a harbor that's forgetting its songs",
  "Honest Hal's Previously Plundered Goods",
  "The Salty Biscuit café (no grog, very good biscuits)",
  "The Sword Master's dock",
  `${speakerName("kit")}'s hat. Pockets has it.`,
];
const POWER_RANK = { tiny: 0, spark: 1, blaze: 2, mega: 3 };

/** Resolves true once a picture has loaded (false if it can't). */
const imageReady = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

// ---------------------------------------------------------------- one scene

async function runScene(app, { mastery, rng }) {
  const w = world();
  if (DEBUG) window.__world = w;
  const sceneId = w.scene;
  const scene = SCENES[sceneId];
  const done = deferred();
  let finished = false;
  const finish = (v) => {
    if (finished) return;
    finished = true;
    done.resolve(v);
  };

  // ------------------------------------------------------------ layout
  const screen = h("div.screen.explore");
  const field = h("div.explore-field");
  const placeName = h("div.place-name", {}, scene.name);
  const label = h("div.action-label");
  const bag = h("div.bag");
  const shardsEl = h("div.shards");
  const menuBtn = h("button.menu-btn.explore-menu", { title: "Pause (Esc)" }, ...iconLabel("menu", "☰ Menu"));
  const tipEl = h("div.explore-tip", { style: { display: "none" } });
  const cursorItem = h("div.cursor-item", { style: { display: "none" } });
  const fade = h("div.fade");
  const partyHud = h("div.party-hud");
  const glimmerEl = h("button.grid-chip", { style: { display: "none" } });
  screen.append(field, placeName, shardsEl, glimmerEl, menuBtn, bag, partyHud, label, tipEl, cursorItem, fade);
  // at the Sword Master's dock, the forge window's pictures load while he walks up to it
  if (sceneId === "sword_dock" && w.flags.ch2) preloadForge();
  app.replaceChildren(screen);
  // A painted scene (art wave 04) is one picture with its objects painted in;
  // until a place has one (with every change patched), its battle backdrop and
  // separate props stand in. ?unpainted shows the old look, for comparing.
  const paintedArt = scene.painted && !PARAMS.has("unpainted") ? assetInfo(scene.painted) : null;
  const art = paintedReady(paintedArt) ? paintedArt : null;
  const layout = art ? paintedLayout(art, scene, LAYOUT.explore) : null;
  const bgId = firstArt(scene.backgrounds);
  // with its distant view on its own (art wave 05; tools/art/scene_layers.py cut the near layer), the view moves slower than the ground
  const layeredArt = Boolean(art?.far?.src && art?.near?.src);
  const stage = createStage(field, art ? { background: scene.painted, mode: "painted", pinY: layout.pinY, far: layeredArt ? art.far.src : null } : { background: bgId, mode: "explore" });
  if (art) field.classList.add("painted");
  // a new place borrowing another's painting until its own lands gets a mood of its own
  else if (scene.tint && bgId !== scene.backgrounds[0]) field.classList.add(`tint-${scene.tint}`);
  // people are drawn bigger in painted scenes, to match the painted things (stage-layout.json, explore.painted)
  const big = art ? LAYOUT.explore.painted.spriteScale / K : 1;
  const SK = K * big;
  const pace = Math.sqrt(big); // bigger people walk a little faster across the screen, not all the way: the scene would shrink
  const GAP = FOLLOW_GAP * (art ? 1.55 : 1);
  const dialogue = createDialogue(screen);
  // in from black, or from the white the opening ends in
  if (enterFromWhite) fade.classList.add("white");
  fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: enterFromWhite ? 1400 : 600, easing: "ease-in", fill: "forwards" });
  const fromWhite = enterFromWhite;
  enterFromWhite = false;
  placeName.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 300, fill: "backwards" });

  function playSceneAudio() {
    // while someone here is singing (Maren, until they meet), her song is the music;
    // in the canyon, once Wren has pointed it out, it drifts up from below
    if (singer()) {
      music.stop(1);
      song.play(SONG, { volume: songLevel() });
    } else if (farSinging()) {
      music.stop(1.5);
      song.play(SONG, { volume: farLevel(), muffled: true });
    } else music.play(scene.music);
    if (scene.ambience) ambience.play(scene.ambience);
  }

  // ------------------------------------------------------------ the people and things
  const ents = [];
  const byHot = new Map();
  const visibleNow = (hot) => {
    if (hot.ifPainted && !assetInfo(hot.sprite)) return false; // a sprite that waits for its art (the baby moth)
    return VISIBLE[`${sceneId}.${hot.id}`] ? VISIBLE[`${sceneId}.${hot.id}`](w) : true;
  };
  /** A hotspot as it is in this scene right now (moved onto the painting, if there is one). */
  const placed = (hot) => (layout ? layout.place(hot, w) : hot);
  const hotOf = (id) => byHot.get(id)?.hot || placed(scene.hotspots.find((x) => x.id === id));
  let blocks = []; // things in the way (painted scenes): see refreshHotspots
  let fiendPace = 1; // chapter 2: fiends jump out less often in a place with nothing new left (see refreshHotspots)

  function propState(hot) {
    const key = `${sceneId}.${hot.id}`;
    if (key === "cove.chest") return { open: w.shards.includes("cove") };
    if (key === "cove.gate") return { open: Boolean(w.flags.gateOpen) };
    if (key === "cove.pool") return { fish: !w.flags.fish };
    if (key === "cove.sign") return { fixed: Boolean(w.flags.signFixed) };
    if (key === "temple_hall.cage") return { bars: w.flags.cageBars || 0 };
    if (key === "temple.door") return { open: Boolean(w.flags.doorOpen) };
    if (key === "grotto.shrine") return { awake: w.party.includes("titancaller") };
    if (key === "grotto.pools") return { fish: false };
    return {};
  }

  function makeHotspot(raw) {
    const hot = placed(raw);
    let el;
    let e;
    if (hot.area) {
      el = h(`div.hot-area${hot.painted ? ".painted" : ""}${hot.inner ? ".inner" : ""}`);
      e = { kind: "area", hot, el, x: hot.x, y: hot.y };
      if (hot.painted) paintedExtras(e);
    } else if (hot.sprite) {
      // chapter 2's Pockets wears both tricorns (one picture: field_twohats)
      const twoHats = hot.twoHats && assetInfo(hot.sprite)?.field_twohats?.src;
      const field = !twoHats && assetInfo(hot.sprite)?.field?.src;
      el = makeSprite({ id: hot.sprite, side: CLASSES[hot.sprite] ? "hero" : "npc", x: 0, y: 0, size: hot.size, prefer: twoHats ? "field_twohats" : field ? "field" : "battle" });
      el.classList.add("explore-sprite");
      e = { kind: "npc", hot, el, x: hot.x, y: hot.y, size: hot.size, lift: hot.liftPx != null ? hot.liftPx / (stage.scaleAt(hot.y) * SK) : hot.lift || 0 };
      e.rec = stage.live(el, profileFor(hot.sprite));
      // which way the sheet faces: exploring sheets face right, battle sheets face left
      e.sheetFaces = field ? assetInfo(hot.sprite).field.facing || "right" : twoHats || !CLASSES[hot.sprite] ? "right" : "left";
      if (hot.face) e.rec.flip = hot.face !== e.sheetFaces;
      // Pockets clutches the stolen power cell until the trade
      if (field && hot.sprite === "monkey" && sceneId === "canyon" && !w.flags.traded) setPose(el, "hold");
      if (hot.poses) idlePose(e);
    } else if (hot.prop) {
      el = h("div.prop");
      e = { kind: "prop", hot, el, x: hot.x, y: hot.y, size: hot.size, flat: hot.flat, lift: hot.lift || 0 };
      renderProp(e);
    } else {
      el = h("div.hot-edge");
      e = { kind: "edge", hot, el, x: hot.x, y: hot.y };
    }
    el.dataset.hot = hot.id;
    if (hot.edge) {
      const arrow = h(`button.exit-arrow.${hot.edge}`, { onclick: (ev) => (ev.stopPropagation(), clickHot(hot)) }, h("span.arrow"), h("span.where", {}, hot.name.replace(/^path to (the )?/, "")));
      arrow.dataset.hot = hot.id;
      screen.append(arrow);
      e.arrow = arrow;
    }
    stage.world.append(el);
    ents.push(e);
    byHot.set(hot.id, e);
    return e;
  }

  function renderProp(e) {
    const st = propState(e.hot);
    const key = JSON.stringify(st);
    if (e.stateKey === key) return;
    e.stateKey = key;
    const art = propArt(e.hot.prop, st);
    const kids = [art];
    if (e.hot.prop === "signpost") {
      // the words on the boards are drawn by the game (painted boards are blank)
      const painted = isPainted("signpost");
      kids.push(signWord("left", st.fixed ? "TEMPLE" : "PELMET", painted), signWord("right", st.fixed ? "CANYON" : "NYCOAN", painted));
    }
    if (e.hot.prop === "word_cage") {
      e.el.classList.toggle("open", st.bars >= 3);
      const painted = isPainted("word_cage", st);
      const fade = 1 - 0.22 * Math.min(3, st.bars || 0);
      // Knox is tiny and the painted bars are thick: a solid copy of the cage
      // stands behind him and a see-through one in front, so he shows between the bars
      if (painted && !e.back) {
        e.back = h("div.prop.cage-back");
        stage.world.append(e.back);
      }
      if (e.back) {
        e.back.replaceChildren(...(painted ? [propArt(e.hot.prop, st)] : []));
        e.back.style.opacity = String(fade);
      }
      e.el.style.opacity = painted ? String(fade * 0.45) : "";
    }
    e.el.replaceChildren(...kids);
  }

  /** What a painted thing needs besides its click area: the signpost's words, the rest crystal's glow. */
  function paintedExtras(e) {
    if (e.hot.fog) return fogSign(e);
    const o = layout.objects[e.hot.id];
    if (!o) return; // a character painted in (Knox in his cage): just the click area
    const [x0, y0, x1, y1] = o.box;
    if (e.hot.id === "sign" && o.boards.length) {
      e.words = o.boards.slice(0, 2).map((b) => {
        const el = h("div.sign-word.board");
        Object.assign(el.style, { left: `${b.center[0] - b.width / 2 - x0}px`, top: `${b.center[1] - b.height / 2 - y0}px`, width: `${b.width}px`, height: `${b.height}px`, transform: `rotate(${-b.tilt}deg)` });
        e.el.append(el);
        return el;
      });
      renderSignWords(e);
    }
    if (e.hot.id === "rest") {
      e.glow = h("div.rest-glow");
      Object.assign(e.glow.style, { width: `${(x1 - x0) * 1.9}px`, height: `${(y1 - y0) * 1.5}px` });
      stage.world.append(e.glow);
    }
  }

  /** A street sign the fog has eaten half of (chapter 2): fog until he gives the word its piece back, then the word. */
  function fogSign(e) {
    const word = w.flags[e.hot.id];
    const el = h(`div.fog-sign${word ? ".clear" : ""}`, {}, typeof word === "string" ? word.toUpperCase() : "▒▒▒▒▒");
    e.el.replaceChildren(el);
    e.fogWord = word;
  }

  /** The signpost's two words: scrambled until he fixes it (painted boards are blank). */
  function renderSignWords(e) {
    const fixed = Boolean(w.flags.signFixed);
    const words = fixed ? ["TEMPLE", "CANYON"] : ["PELMET", "NYCOAN"];
    if (e.wordsFixed === fixed) return;
    e.wordsFixed = fixed;
    e.words.forEach((el, i) => {
      const bw = parseFloat(el.style.width);
      const bh = parseFloat(el.style.height);
      el.innerHTML = `<svg viewBox="0 0 ${bw} ${bh}" preserveAspectRatio="none"><text x="${bw / 2}" y="${bh * 0.8}" text-anchor="middle" font-size="${bh * 0.86}" textLength="${bw - 10}" lengthAdjust="spacingAndGlyphs">${words[i]}</text></svg>`;
    });
  }

  // ------------------------------------------------------------ the painting's changes (state patches)
  const patches = new Map(); // state → loaded Image
  let backdrop = null; // { canvas, base, shown: Set } once the painting has loaded
  let fading = null; // a change fading in: { state, t0 }
  if (art) {
    const load = (src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `assets/${src}`;
    });
    const patchesFor = (near) => Promise.all(Object.entries(art.states).map(([st, p]) => load((near && p.near?.src) || p.src).then((img) => img && patches.set(st, img))));
    // with its distant view on its own, the painting is the near layer, and goes in once the view behind it has loaded
    const painting = async () => {
      if (layeredArt) {
        const [near, far] = await Promise.all([load(art.near.src), stage.farLoaded(), patchesFor(true)]);
        if (near && far) return { base: near, layered: true };
      }
      const [base] = await Promise.all([load(art.base.src), patchesFor(false)]);
      return { base, layered: false };
    };
    painting().then(({ base, layered }) => {
      if (!base || finished) return;
      const canvas = h("canvas", { width: art.base.w || base.naturalWidth, height: art.base.h || base.naturalHeight });
      backdrop = { canvas, base, layered, shown: new Set() };
      paintStates(false);
    });
  }

  /** Lay the patches for the world's current state over the painting (a new change fades in). */
  function paintStates(animate = true) {
    if (!backdrop) return;
    const want = new Set(activeStates(art, sceneId, w, PAINTED));
    const added = [...want].filter((st) => !backdrop.shown.has(st));
    const same = added.length === 0 && [...backdrop.shown].every((st) => want.has(st));
    if (same && backdrop.drawnOnce) return;
    backdrop.shown = want;
    fading = animate && added.length ? { states: new Set(added), t0: performance.now() } : null;
    composeBackdrop(fading ? 0 : 1);
    if (!backdrop.drawnOnce) {
      backdrop.drawnOnce = true;
      stage.setBackdrop(backdrop.canvas, { layered: backdrop.layered });
    }
  }

  function composeBackdrop(k) {
    const g = backdrop.canvas.getContext("2d");
    g.globalAlpha = 1;
    g.clearRect(0, 0, backdrop.canvas.width, backdrop.canvas.height); // the near layer is see-through where the distant view shows
    g.drawImage(backdrop.base, 0, 0, backdrop.canvas.width, backdrop.canvas.height);
    for (const st of backdrop.shown) {
      const img = patches.get(st);
      const p = art.states[st];
      if (!img) continue;
      g.globalAlpha = fading?.states.has(st) ? k : 1;
      g.drawImage(img, p.x, p.y, p.w, p.h);
    }
    g.globalAlpha = 1;
    stage.redrawBackdrop();
  }

  stage.onFrame(() => {
    if (!fading) return;
    const k = Math.min(1, (performance.now() - fading.t0) / 700);
    composeBackdrop(k * k * (3 - 2 * k));
    if (k >= 1) fading = null;
  });

  function refreshHotspots() {
    for (const raw of scene.hotspots) {
      const show = visibleNow(raw);
      let e = byHot.get(raw.id);
      // a hotspot that changed shape in the painting (Knox stepping out of his cage) is made again
      if (show && e && e.hot !== placed(raw)) {
        removeEnt(e);
        makeHotspot(raw);
      } else if (show && !e) makeHotspot(raw);
      else if (!show && e) removeEnt(e);
      else if (e?.kind === "prop") renderProp(e);
      else if (e?.words) renderSignWords(e);
      else if (e?.hot.fog && e.fogWord !== w.flags[e.hot.id]) fogSign(e);
    }
    if (layout) {
      blocks = layout.blocks(scene.hotspots.filter((x) => byHot.has(x.id)).map((x) => x.id));
      paintStates();
    }
    // nothing glints here and Kit's next goal is elsewhere: fewer fiends (fewer still with Calm Seas lit on the Grid)
    fiendPace = encounterPace(w, quietPlace(w, sceneId, { sparkle: SPARKLE, visible: VISIBLE, goal: nextGoal(w) }));
    for (const e of ents) {
      if (!e.hot) continue;
      const sp = SPARKLE[`${sceneId}.${e.hot.id}`];
      // Kit's glint when he's been stuck a while (chapter 2): "There. Start there."
      const on = Boolean(sp && sp(w)) || glintAt(w) === `${sceneId}.${e.hot.id}`;
      if (on && !e.sparkle) {
        e.sparkle = h("div.sparkle");
        stage.world.append(e.sparkle);
      } else if (!on && e.sparkle) {
        e.sparkle.remove();
        e.sparkle = null;
      }
    }
  }

  function removeEnt(e) {
    e.el.remove();
    e.back?.remove();
    e.glow?.remove();
    e.arrow?.remove();
    e.sparkle?.remove();
    ents.splice(ents.indexOf(e), 1);
    if (e.hot) byHot.delete(e.hot.id);
  }

  // the party: the Knight leads, the others follow his trail, Kit floats nearby
  const blocksAtStart = layout ? layout.blocks(scene.hotspots.filter(visibleNow).map((x) => x.id)) : [];
  const start = freePoint(w.pos && inside(w.pos, scene.walk) ? w.pos : scene.start, scene.walk, blocksAtStart);
  const party = [];
  function addMember(cls, at = null) {
    const el = makeSprite({ id: cls, side: "hero", x: 0, y: 0, size: HERO_SIZE });
    el.classList.add("explore-sprite", "party");
    stage.world.append(el);
    const p = at || [start[0] - 60 * party.length, start[1] - 4 * party.length];
    const m = { kind: "member", cls, el, x: p[0], y: p[1], size: HERO_SIZE, lift: 0, facing: -1, walking: false };
    // a painted walk cycle (art wave 03) replaces the bob while walking
    if (assetInfo(cls)?.walk?.src) {
      m.standArt = el.querySelector(".body > .sheet");
      m.walkArt = artFor(cls, { prefer: "walk" });
      m.walkFrames = assetInfo(cls).walk.frames || 8;
      m.walkFps = assetInfo(cls).walk.fps || 10;
      m.walkT = 0;
      // Frames per stage px walked. With a measured stride (tools/art/even_walks.py) the
      // cycle covers exactly the ground he does, so his planted foot doesn't skate.
      const wk = assetInfo(cls).walk;
      m.walkRate = wk.stride ? m.walkFrames / ((wk.stride / wk.cell[1]) * HERO_SIZE[1] * K * (wk.scale || 1)) : 0.034;
      preloadSheet(assetInfo(cls).walk.src);
    }
    m.rec = stage.live(el, "hero");
    party.push(m);
    ents.push(m);
    return m;
  }
  // a trail behind him, so followers start in line instead of on top of him
  const trail = [];
  // The others trail back toward the nearer edge, the way the party came in;
  // near the edge there's no room for a line, so it angles back into the distance.
  const cameFrom = start[0] < 640 ? -1 : 1;
  const xs = scene.walk.map((p) => p[0]);
  const room = Math.abs((cameFrom < 0 ? Math.min(...xs) + 40 : Math.max(...xs) - 40) - start[0]);
  const rise = Math.max(0, start[1] - Math.min(...scene.walk.map((p) => p[1])) - 16);
  const length = GAP * 4;
  const far = room >= length ? [start[0] + cameFrom * length, start[1]] : [start[0] + cameFrom * room, start[1] - Math.min(rise, Math.sqrt(length * length - room * room))];
  const span = Math.hypot(far[0] - start[0], far[1] - start[1]);
  for (let d = span; d >= 0; d -= 6) trail.push(freePoint([start[0] + ((far[0] - start[0]) * d) / span, start[1] + ((far[1] - start[1]) * d) / span], scene.walk, blocksAtStart));
  if (!trail.length || trail[trail.length - 1][0] !== start[0]) trail.push(start);
  for (const cls of w.party) addMember(cls, party.length ? trailPointFrom(trail, GAP * party.length) : start);
  const hero = party[0];
  if (DEBUG) Object.assign(window, { __hero: hero, __party: party }); // for automated playtests: move him and the camera follows
  const kitEl = makeSprite({ id: "droid", side: "npc", x: 0, y: 0, size: KIT_SIZE });
  kitEl.classList.add("explore-sprite", "kit-sprite");
  stage.world.append(kitEl);
  const kit = { kind: "kit", el: kitEl, x: hero.x - 90, y: hero.y - 8, size: KIT_SIZE, lift: 150 };
  kit.rec = stage.live(kitEl, "droid");
  ents.push(kit);
  /** Kit's hat: from Hal's shop on (chapter 2), the tea cozy (wave 09's field_cozy, once it's painted); the tricorn again for one line at dawn. */
  function dressKit() {
    const art = assetInfo("droid");
    const src = (w.flags.cozy && !w.flags.kitHat && art?.field_cozy?.src) || art?.base?.src;
    const img = kitEl.querySelector(".body > img");
    if (src && img && img.dataset.src !== src) {
      img.dataset.src = src;
      img.src = `assets/${src}`;
    }
  }
  dressKit();
  // Tamsin's creatures (chapter 2) trot along at the back, each with its hero
  const pets = [];
  function addPet(id, at = null) {
    const p = w.pets[id];
    const art = `pet_${PETS[id].species}_${p.stage || 1}`;
    const el = makeSprite({ id: art, side: "npc", x: 0, y: 0, size: PET_SIZE });
    el.classList.add("explore-sprite", "pet");
    stage.world.append(el);
    const where = at || trailPointFrom(trail, GAP * (party.length + pets.length * 0.7), start);
    const m = { kind: "pet", id, el, x: where[0], y: where[1], size: PET_SIZE, lift: 0, facing: 1, stage: p.stage || 1 };
    m.rec = stage.live(el, "droid");
    pets.push(m);
    ents.push(m);
    return m;
  }
  for (const id of Object.keys(w.pets || {})) if (PETS[id] && w.party.includes(w.pets[id].owner)) addPet(id);

  for (const hot of scene.hotspots) if (visibleNow(hot)) makeHotspot(hot);
  refreshHotspots();
  playSceneAudio(); // after the people are in place: Maren's song depends on where she is
  stage.camera.snap((hero.x - 640) / stage.depthFactor(hero.y));
  const badgeEl = h("div.e-badge", { style: { display: "none" } }, "E");
  stage.world.append(badgeEl);
  const badge = { hot: null };

  // ------------------------------------------------------------ placing everything each frame
  const scaleOf = (y) => stage.scaleAt(y) * SK;
  stage.onLayout(() => {
    for (const e of ents) {
      const s = scaleOf(e.y);
      if (e.kind === "area") {
        const [x1, y1, x2, y2] = e.hot.area;
        const dx = stage.parallaxLeft(0, e.y);
        Object.assign(e.el.style, { left: `${x1 + dx}px`, top: `${y1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` });
        // smaller things painted inside bigger ones (Knox in his cage) take the click
        if (e.hot.painted) e.el.style.zIndex = e.hot.inner ? "3" : "2";
        if (e.glow) Object.assign(e.glow.style, { left: `${(x1 + x2) / 2 + dx}px`, top: `${y1 + (y2 - y1) * 0.55}px` });
        // a glint on the painted thing itself (its top can be off the top of the screen)
        if (e.sparkle) Object.assign(e.sparkle.style, { left: `${(x1 + x2) / 2 + dx}px`, top: `${Math.max(96, y1 + (y2 - y1) * 0.28)}px`, zIndex: "2000" });
        continue;
      }
      if (e.kind === "edge") {
        const [x, y] = [stage.parallaxLeft(e.x, e.y), e.y];
        Object.assign(e.el.style, { left: `${x - 60}px`, top: `${y - 160}px`, width: "120px", height: "200px" });
        continue;
      }
      const wpx = e.size[0] * s;
      const hpx = e.size[1] * s;
      const left = stage.parallaxLeft(e.x, e.y);
      const top = e.y - (e.lift || 0) * s + (e.bob || 0);
      e.el.style.left = `${left}px`;
      e.el.style.top = `${top}px`;
      e.el.style.width = `${wpx}px`;
      e.el.style.height = `${hpx}px`;
      e.el.style.zIndex = e.flat ? "1" : e.kind === "kit" ? String(Math.round(e.y) - 2) : String(Math.round(e.y + (e.lift ? 1 : 0)));
      if (e.back) Object.assign(e.back.style, { left: e.el.style.left, top: e.el.style.top, width: e.el.style.width, height: e.el.style.height, zIndex: String(Math.round(e.y) - 8) });
      if (e.kind === "prop" && e.hot.prop === "signpost" && !isPainted("signpost")) e.el.style.fontSize = `${Math.max(9, wpx * 0.115)}px`;
      if (e.sparkle) {
        e.sparkle.style.left = `${left}px`;
        e.sparkle.style.top = `${top - hpx * 1.02}px`;
        e.sparkle.style.zIndex = "2000";
      }
    }
    // he never walks out of sight behind a foreground pillar: it fades while it covers him
    const [fx, fy] = stage.toScreen(hero.x, hero.y);
    const tall = HERO_SIZE[1] * scaleOf(hero.y);
    const body = [0.15, 0.5, 0.85].flatMap((k) => [-0.15, 0, 0.15].map((d) => [fx + d * tall, fy - k * tall]));
    stage.fadeForeground(stage.fgCover(body) > 0.35 ? 0.28 : 1);
    if (badge.hot) {
      const e = byHot.get(badge.hot.id);
      if (e && e.el.style.left) {
        const s = scaleOf(e.y);
        const top = e.kind === "area" ? e.hot.area[1] + 30 : e.y - (e.lift || 0) * s - (e.size?.[1] || 100) * s - 20;
        const left = e.kind === "area" ? stage.parallaxLeft(e.x, e.y) : parseFloat(e.el.style.left);
        Object.assign(badgeEl.style, { left: `${left}px`, top: `${Math.max(70, top)}px`, display: "block" });
      }
    } else badgeEl.style.display = "none";
  });
  // ------------------------------------------------------------ walking
  let target = null; // where a click sent him
  let route = []; // the corners on his way there, around anything in the way (painted scenes)
  const slideMemo = {}; // which way round he's sliding past something in the way
  let conversing = false; // a conversation is on: people keep the pose of their last line
  /** Send him walking to a spot, the way round anything in the way. */
  const goTo = (p) => {
    route = findPath([hero.x, hero.y], p, scene.walk, blocks);
    target = route[route.length - 1];
  };
  let pending = null; // { hot, item } to use when he gets there
  let runningScript = null; // the story script running now ("canyon.lair"): a fight it starts is saved as part of it
  let resumeFight = null; // a saved fight its story script is about to pick up (pickUpFight)
  let busy = false; // a script, puzzle, dialogue or fight is running
  let held = null; // item picked from the bag to use on something
  let calmUntil = 0; // the key that closed a conversation shouldn't also start the next thing
  let quitting = false;
  let musicHeld = false; // the music has stepped out for a story moment (Jumble's audit), and stays out
  let lastGiven = ""; // what he wrote in the last puzzle (field notes, the binding)
  let edgeCooldown = 0;
  let saveTimer = 0;
  let timerCheck = 0;
  const keys = new Set();
  let moved = false;

  stage.onFrame((dt, t) => {
    if (finished) return;
    edgeCooldown = Math.max(0, edgeCooldown - dt);
    // where does he want to go?
    let vx = 0;
    let vy = 0;
    if (!busy) {
      if (keys.has("left")) vx -= 1;
      if (keys.has("right")) vx += 1;
      if (keys.has("up")) vy -= 1;
      if (keys.has("down")) vy += 1;
    }
    const s = stage.scaleAt(hero.y);
    const step = WALK_SPEED * Math.max(0.55, s) * pace * dt;
    const before = [hero.x, hero.y];
    if (vx || vy) {
      target = null;
      pending = null;
      const len = Math.hypot(vx, vy);
      const r = stepToward([hero.x, hero.y], [hero.x + (vx / len) * 400, hero.y + (vy / len) * 260], step, scene.walk, blocks, slideMemo);
      [hero.x, hero.y] = r.pos;
    } else if (target) {
      const r = stepToward([hero.x, hero.y], route[0] || target, step, scene.walk, blocks, slideMemo);
      [hero.x, hero.y] = r.pos;
      if (r.arrived && route.length > 1) route.shift();
      else if (r.arrived) {
        target = null;
        route = [];
        if (pending) {
          const p = pending;
          pending = null;
          arriveAt(p);
        }
      }
    }
    const dist = Math.hypot(hero.x - before[0], hero.y - before[1]);
    walkAnim(hero, hero.x - before[0], dist, dt);
    if (dist > 0.01) {
      moved = true;
      const last = trail[trail.length - 1];
      if (Math.hypot(hero.x - last[0], hero.y - last[1]) > 6) {
        trail.push([hero.x, hero.y]);
        if (trail.length > 400) trail.splice(0, trail.length - 400);
      }
      if (!busy && !CALM && encounterOptions(sceneId, w).length && walkFor(w, (dist / Math.max(0.5, s)) * fiendPace, rng)) ambush();
      if (!busy) checkEdges(vx);
    }
    // followers walk along his trail, each to a spot a set distance behind where he stands now
    party.slice(1).forEach((m, i) => {
      const want = trailPoint(GAP * (i + 1));
      const before = [m.x, m.y];
      // and never into a tide pool or through the chest: out to the nearest dry spot
      if (followStep(m, want, WALK_SPEED * 1.15 * Math.max(0.55, stage.scaleAt(m.y)) * pace * dt) && blocks.length) [m.x, m.y] = freePoint([m.x, m.y], scene.walk, blocks);
      walkAnim(m, want[0] - before[0], Math.hypot(m.x - before[0], m.y - before[1]), dt);
    });
    pets.forEach((m, i) => {
      const want = trailPoint(GAP * (party.length - 0.4 + i * 0.7));
      const bx = m.x;
      followStep(m, want, WALK_SPEED * 1.2 * Math.max(0.55, stage.scaleAt(m.y)) * pace * dt);
      if (Math.abs(m.x - bx) > 0.3) m.rec.flip = m.x < bx; // pet sheets face right
      m.rec.walking = Math.abs(m.x - bx) > 0.3;
    });
    // Kit floats beside him, a little behind
    const kx = hero.x - 95 * (hero.facing || -1) * stage.scaleAt(hero.y) * big;
    const ky = hero.y - 10;
    const kk = 1 - Math.exp(-dt * 2.5);
    kit.x += (kx - kit.x) * kk;
    kit.y += (ky - kit.y) * kk;
    if (Math.abs(kx - kit.x) > 2) kit.rec.flip = kx > kit.x;
    dressKit();
    // the camera follows him (the floor slides at his depth's speed, so divide by it to keep him centered)
    stage.camera.follow((hero.x - 640) / stage.depthFactor(hero.y), 0);
    // the play timer (playtimer.js): Kit's heads-up, then camp, only at a calm moment
    timerCheck += dt;
    if (timerCheck > 1 && !busy && !conversing && !held && performance.now() > calmUntil) {
      timerCheck = 0;
      if (playtimeState() === "over") makeCamp();
      else if (campSoonDue()) campSoon();
    }
    // what's within reach for E
    const near = nearestHot();
    badge.hot = !busy && near ? near : null;
    // save where he is now and then
    saveTimer += dt;
    if (moved && saveTimer > 3) {
      saveTimer = 0;
      moved = false;
      w.pos = [Math.round(hero.x), Math.round(hero.y)];
      saveWorld();
    }
  });

  const trailPoint = (back) => trailPointFrom(trail, back, [hero.x, hero.y]);

  // ------------------------------------------------------------ Maren's song
  /** Who is singing here right now: Maren, until the party meets her. */
  function singer() {
    if (w.flags.metCaller) return null;
    return ents.find((e) => e.kind === "npc" && e.hot.poses === "titancaller") || null;
  }
  /** Louder the closer he gets to her. */
  function songLevel() {
    const e = singer();
    if (!e || !party.length) return 0.4;
    const d = Math.hypot(hero.x - e.x, (hero.y - e.y) * 1.5);
    return Math.max(0.28, Math.min(1, 1.1 - d / 1250));
  }
  /** In the canyon, from when Wren points it out until they meet her: her song, drifting up from the sea caves below. */
  function farSinging() {
    return sceneId === "canyon" && Boolean(w.flags.heardSong) && !w.flags.metCaller;
  }
  /** Faint, and a little louder by the rope that leads down to her. */
  function farLevel() {
    const rope = hotOf("chasm");
    if (!rope || !party.length) return 0.34;
    const d = Math.hypot(hero.x - rope.x, (hero.y - rope.y) * 1.5);
    return Math.max(0.24, Math.min(0.5, 0.58 - d / 2000));
  }
  let sang = false;
  stage.onFrame(() => {
    if (finished) return;
    if (singer()) {
      sang = true;
      song.level(songLevel());
    } else if (farSinging()) {
      sang = true;
      if (!conversing) song.level(farLevel(), true);
    } else if (sang) {
      // met her: the song fades, and the place's own music comes back
      sang = false;
      song.stop(1.4);
      setTimeout(() => !finished && music.play(scene.music), 1500);
    }
  });

  /** A character's waiting pose, cycling every few seconds (Maren's two singing poses). */
  function idlePose(e) {
    const poses = NPC_POSES[e.hot.poses];
    if (!poses) return;
    const [flag, later] = poses.after || [];
    const list = (flag && w.flags[flag] && later) || poses.idle;
    setPose(e.el, list[Math.floor(performance.now() / 2600) % list.length]);
  }
  stage.onFrame(() => {
    for (const e of ents) if (e.kind === "npc" && e.hot.poses && !(e.talkingUntil > performance.now()) && !conversing) idlePose(e);
  });

  /** Walking: face the way he's going, and step (a painted walk cycle, or a bob without one). */
  function walkAnim(m, dx, dist, dt) {
    const walking = walkingNow(m, dist, dt);
    if (Math.abs(dx) > 0.3) m.facing = dx > 0 ? 1 : -1;
    if (m.walkArt) {
      const body = m.el.querySelector(".body");
      const want = walking ? m.walkArt : m.standArt;
      if (want && body.firstElementChild !== want) body.replaceChildren(want, ...[...body.children].filter((c) => c.classList.contains("living-canvas")));
      if (walking) {
        m.walkT += (dist / (Math.max(0.5, stage.scaleAt(m.y)) * big)) * m.walkRate; // 8 to 12 frames a second at walking speed
        setSheetFrame(m.walkArt, Math.floor(m.walkT) % m.walkFrames);
      }
      // walk cycles face right, battle sheets face left
      m.rec.flip = walking ? m.facing < 0 : m.facing > 0;
      m.rec.walking = false;
      return;
    }
    // hero sheets face left, so facing right means mirrored
    m.rec.flip = m.facing > 0;
    m.rec.walking = walking;
    if (walking) m.rec.walkPhase += (dist / (Math.max(0.5, stage.scaleAt(m.y)) * big)) * 0.024;
  }

  function nearestHot() {
    let best = null;
    let bestD = REACH;
    for (const e of ents) {
      if (!e.hot || e.hot.hidden) continue;
      const [ax, ay] = approachOf(e.hot);
      const d = Math.hypot(ax - hero.x, (ay - hero.y) * 1.6);
      if (d < bestD) {
        bestD = d;
        best = e.hot;
      }
    }
    return best;
  }

  function approachOf(hot) {
    const [dx, dy] = hot.approach || [0, 60];
    return freePoint([hot.x + dx, hot.y + dy], scene.walk, blocks);
  }

  function checkEdges(vx) {
    if (edgeCooldown > 0) return;
    for (const hot of scene.hotspots) {
      if (!hot.edge || !visibleNow(hot)) continue;
      const near = hot.edge === "left" ? hero.x < hot.x + 40 : hero.x > hot.x - 40;
      const toward = hot.edge === "left" ? vx < 0 || target === null : vx > 0 || target === null;
      if (near && toward) {
        target = null;
        useHot(hot);
        return;
      }
    }
  }

  // ------------------------------------------------------------ input
  function stagePoint(ev) {
    const r = field.getBoundingClientRect();
    return [((ev.clientX - r.left) / r.width) * 1280, ((ev.clientY - r.top) / r.height) * 720];
  }

  field.addEventListener("click", (ev) => {
    if (busy || finished) return;
    dismissTip();
    const hotEl = ev.target.closest("[data-hot]");
    if (hotEl) {
      const hot = hotOf(hotEl.dataset.hot);
      if (hot) return clickHot(hot);
    }
    if (held) setHeld(null);
    const [sx, sy] = stagePoint(ev);
    goTo(stage.toFloor(sx, sy));
    pending = null;
    ripple(target);
  });
  field.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    setHeld(null);
  });
  field.addEventListener("mousemove", (ev) => {
    const [sx, sy] = stagePoint(ev);
    if (held) Object.assign(cursorItem.style, { left: `${sx + 14}px`, top: `${sy + 10}px` });
    if (busy) return;
    const hotEl = ev.target.closest("[data-hot]");
    const hot = hotEl && hotOf(hotEl.dataset.hot);
    showLabel(hot);
    for (const e of ents) e.el.classList.toggle("hover", Boolean(hot && e.hot === hot));
  });
  field.addEventListener("mouseleave", () => showLabel(null));

  function showLabel(hot) {
    if (!hot) {
      label.textContent = held ? `Use ${ITEMS[held].name} with…` : "";
      return;
    }
    label.textContent = held ? `Use ${ITEMS[held].name} with ${hot.name}` : `${hot.verb} ${hot.name}`;
  }

  function clickHot(hot) {
    if (busy || finished) return;
    dismissTip();
    const item = held;
    setHeld(null);
    useHot(hot, item);
  }

  /** Walk over to something, then use it (or the held item on it). */
  function useHot(hot, item = null) {
    goTo(approachOf(hot));
    pending = { hot, item };
    if (Math.hypot(target[0] - hero.x, target[1] - hero.y) < 4) {
      target = null;
      pending = null;
      arriveAt({ hot, item });
    }
  }

  const offKeys = onKeys((e) => {
    if (finished) return;
    const k = keyName(e.key);
    if (k && !busy && !document.querySelector(".window.problem, .window.tutor")) {
      keys.add(k);
      dismissTip();
      e.preventDefault?.();
      return;
    }
    if (busy) return;
    if (e.key === "Escape") {
      if (held) setHeld(null);
      else openPause();
    } else if ((e.key === "e" || e.key === "E") && badge.hot && performance.now() > calmUntil) {
      e.preventDefault?.();
      useHot(badge.hot);
    }
  });
  const onKeyUp = (e) => {
    const k = keyName(e.key);
    if (k) keys.delete(k);
  };
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => keys.clear());
  menuBtn.addEventListener("click", () => !busy && openPause());

  function keyName(key) {
    return { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down" }[key] || null;
  }

  function ripple([x, y]) {
    const el = h("div.walk-ripple", { style: { left: `${stage.parallaxLeft(x, y)}px`, top: `${y}px`, zIndex: "1" } });
    stage.world.append(el);
    el.animate([{ transform: "translate(-50%,-50%) scale(0.3)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(1.4)", opacity: 0 }], { duration: 520, easing: "ease-out" }).onfinish = () => el.remove();
  }

  // ------------------------------------------------------------ the bag and the shards
  function renderBag() {
    bag.replaceChildren(
      ...w.items.map((id) => {
        const it = ITEMS[id];
        const b = h(`button.bag-item${held === id ? ".held" : ""}`, { title: `${it.name}: ${it.blurb}` }, itemIcon(it.icon));
        b.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (busy) return;
          sfx.select();
          setHeld(held === id ? null : id);
        });
        b.addEventListener("mouseenter", () => (label.textContent = `${it.name}: ${it.blurb}`));
        b.addEventListener("mouseleave", () => showLabel(null));
        return b;
      }),
    );
    bag.style.display = w.items.length ? "flex" : "none";
  }

  function setHeld(id) {
    held = id;
    cursorItem.replaceChildren(...(id ? [itemIcon(ITEMS[id].icon)] : []));
    cursorItem.style.display = id ? "block" : "none";
    field.classList.toggle("holding", Boolean(id));
    renderBag();
    showLabel(null);
  }

  function renderShards() {
    shardsEl.replaceChildren(
      h("span.shards-label", {}, "Crystal shards"),
      ...SHARDS.map((id) => {
        const got = w.shards.includes(id);
        const painted = uiIcon(got ? "shard_full" : "shard_empty", "ui_icons_explore");
        return h(`div.shard-slot${got ? ".got" : ""}${painted ? ".painted" : ""}`, {}, painted || shardIcon());
      }),
    );
  }
  /** The party's health and Overdrive between fights, and the potions in the bag. */
  function renderParty() {
    const names = getSave().names;
    partyHud.replaceChildren(
      ...w.party.map((cls) => {
        const st = heroState(w, cls);
        const pct = Math.round((st.hp / st.max) * 100);
        const face = assetInfo(cls)?.portraits?.src ? portraitFor(cls, st.hp / st.max < 0.3 ? "worried" : "neutral") : null;
        return h(
          `div.ph-row${pct < 30 ? ".low" : ""}`,
          { title: `${names[cls] || CLASSES[cls].hero}: ${st.hp} of ${st.max} health${st.od >= 100 ? ", Overdrive ready" : ""}` },
          h("span.ph-face", {}, ...(face ? [face] : [])),
          h(
            "div.ph-bars",
            {},
            h("div.ph-name", {}, names[cls] || CLASSES[cls].hero, h("span.ph-hp", {}, `${st.hp}/${st.max}`)),
            h("div.ph-bar.hp", {}, h("i", { style: { width: `${pct}%` } })),
            h(`div.ph-bar.od${st.od >= 100 ? ".full" : ""}`, {}, h("i", { style: { width: `${st.od}%` } })),
          ),
        );
      }),
      h("div.ph-potions", { title: "Potions (a rest crystal tops them up)" }, `🧪 × ${w.potions ?? POTIONS.start}`),
    );
  }
  /**
   * Chapter 2's corner, where the shards were: the glimmer waiting on the
   * Crystal Grid (it glows while there's a node he can light) and, once the
   * Sword Master's forge is open, the parts for it. A click opens the Grid.
   */
  function renderGlimmer() {
    const seen = Boolean(w.flags.gridSeen);
    glimmerEl.style.display = seen ? "" : "none";
    if (!seen) return;
    const ready = anyReady(w);
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    glimmerEl.replaceChildren(
      h("span.gc-light", {}, uiIcon("light", "grid_tokens") || "✦"),
      h("b", {}, fmt(gridOf(w).light)),
      h("span.gc-what", {}, "glimmer"),
      ...(w.flags.dockWon ? [h("span.gc-gear", {}, "⚙"), h("b", {}, String(forgeOf(w).parts)), h("span.gc-what", {}, "parts")] : []),
    );
    glimmerEl.classList.toggle("ready", ready);
    glimmerEl.title = ready ? "Crystal Grid: there's a node you can light" : "Crystal Grid";
  }
  glimmerEl.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    glimmerEl.blur(); // so a later Enter doesn't open it again
    if (busy || finished || !w.flags.gridSeen) return;
    busy = true;
    try {
      await gridScreen();
    } finally {
      if (!finished) {
        busy = false;
        calmUntil = performance.now() + 400;
      }
    }
  });
  renderBag();
  renderShards();
  renderParty();
  renderGlimmer();
  // the crystal is whole from chapter 2 on: no shards to count
  if (w.flags.ch2) shardsEl.style.display = "none";

  // ------------------------------------------------------------ tips
  function tip(text) {
    tipEl.textContent = text;
    tipEl.style.display = "block";
    tipEl.animate([{ opacity: 0, transform: "translate(-50%, -6px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { duration: 400, fill: "forwards" });
  }
  function dismissTip() {
    if (tipEl.style.display === "none") return;
    tipEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => (tipEl.style.display = "none");
  }

  // ------------------------------------------------------------ using things
  async function arriveAt({ hot, item }) {
    if (busy || finished) return;
    busy = true;
    showLabel(null);
    const e = byHot.get(hot.id);
    if (e && !hot.edge) {
      hero.facing = hot.x > hero.x ? 1 : -1;
      hero.rec.flip = hero.facing > 0;
    }
    try {
      if (hot.exit || hot.map) await tryExit(hot);
      else if (item) {
        const use = USES[`${sceneId}.${hot.id}`]?.[item];
        if (use) await use(api);
        else await api.say(item === "rubbery_fish" ? "noUseFish" : rng.pick(["noUse", "noUse2"]));
      } else {
        runningScript = `${sceneId}.${hot.id}`;
        await SCRIPTS[runningScript]?.(api);
      }
    } catch (err) {
      console.error(err);
    } finally {
      runningScript = null;
      forgeWin?.close();
      forgeWin = null;
    }
    dialogue.hide();
    if (!finished) {
      refreshHotspots();
      busy = false;
      calmUntil = performance.now() + 400;
    }
  }

  async function toMap() {
    play("sfx_step_sand");
    w.onMap = true;
    w.pos = null;
    saveWorld();
    await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: "forwards" }).finished;
    teardown();
    finish("next");
  }

  async function tryExit(hot) {
    if (hot.map) return toMap();
    const guard = EXITS[`${sceneId}.${hot.id}`];
    const ok = guard ? await guard(api) : true;
    // a guard can send him somewhere else ({ to, at }: the lamp room's stairs, once the harbor remembers)
    const dest = ok && typeof ok === "object" ? ok : hot.exit;
    if (!ok) {
      edgeCooldown = 1.2;
      dialogue.hide();
      // step back from the edge so he isn't standing in the doorway
      const back = hot.edge === "left" ? 70 : hot.edge === "right" ? -70 : 0;
      if (back) goTo([hero.x + back, hero.y]);
      return;
    }
    play("sfx_step_sand");
    w.scene = dest.to;
    w.pos = dest.at;
    grace(w, rng);
    saveWorld();
    await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: "forwards" }).finished;
    teardown();
    finish("next");
  }

  // ------------------------------------------------------------ fights
  async function ambush() {
    if (busy || finished) return;
    const enc = wildEncounter(sceneId, w, rng);
    if (!enc) return;
    busy = true;
    target = null;
    pending = null;
    keys.clear();
    const r = await jumpOut(enc);
    if (!r.quit && !finished) {
      refreshHotspots();
      busy = false;
    }
  }

  /** Fiends jump out at him: a "!" over his head, then the fight. Resolves with its result. */
  async function jumpOut(enc) {
    const bang = h("div.ambush-bang", {}, "!");
    stage.world.append(bang);
    Object.assign(bang.style, { left: `${stage.parallaxLeft(hero.x, hero.y)}px`, top: `${hero.y - HERO_SIZE[1] * scaleOf(hero.y) - 30}px`, zIndex: "3000" });
    bang.animate([{ transform: "translate(-50%, 0) scale(0.2)", opacity: 0 }, { transform: "translate(-50%, -14px) scale(1.25)", opacity: 1, offset: 0.4 }, { transform: "translate(-50%, -10px) scale(1)", opacity: 1 }], { duration: 420, fill: "forwards" });
    play("sfx_encounter");
    await wait(650);
    bang.remove();
    return battle({ ...enc, intro: CONVOS[enc.introLine]?.[0]?.text || "" });
  }

  /**
   * Into a fight and back. `resume` is a fight saved mid-way (save.fight) to
   * pick up; `script` is the story script it belongs to, so a saved fight
   * can go on with the story after it (pickUpFight).
   */
  async function battle(enc, resume = null, script = null) {
    stopSpeaking();
    dialogue.hide();
    // the world spins away into the fight
    const wipe = h("div.ambush-wipe");
    screen.append(wipe);
    const spin = field.animate([{ transform: "scale(1)", filter: "none" }, { transform: "scale(1.12) rotate(1.5deg)", filter: "blur(6px) brightness(1.8)" }], { duration: 650, easing: "ease-in", fill: "forwards" });
    await wipe.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: "ease-in", fill: "forwards" }).finished;
    stage.suspend();
    song.stop(0.5); // no singing over the fight (it comes back after, with the place's music)
    const background = firstArt(scene.battleBackground);
    // the story's own fights (the dock, the Engine) bring the pets too
    const fight = resume ? resume.encounter : { ...enc, background: enc.background || background, start: enc.start || battleStart(w), potions: enc.potions ?? w.potions ?? POTIONS.start, pets: enc.pets || battlePets(w), chapter: enc.chapter || (w.flags.ch2 ? 2 : 1) };
    if (!resume && fight.odLesson) {
      w.lessons[fight.odLesson] = true; // shown once, whether or not he uses it
      saveWorld();
    }
    const res = await runBattle(app, fight, { mastery, rng, saveAs: { kind: "adventure", scene: sceneId, script }, resume });
    if (res.quit) {
      quitting = true;
      teardown();
      finish("quit");
      return res;
    }
    // a pet whose hero got enough hard ones right is ready for its next form (at Tamsin's nests, from the second day)
    const ready = afterBattle(w, res);
    if (!res.won) {
      // back on his feet at the rest crystal
      const crystal = scene.hotspots.find((x) => x.id === "rest");
      if (crystal) {
        const spot = approachOf(placed(crystal));
        party.forEach((m, i) => Object.assign(m, { x: spot[0] - 50 * i, y: spot[1] }));
        trail.length = 0;
        trail.push([spot[0], spot[1]]);
      }
    }
    renderParty();
    // back to the island
    spin.cancel();
    wipe.remove();
    app.replaceChildren(screen);
    stage.resume();
    playSceneAudio();
    const glimmer = glimmerFor(res.stats); // more for a harder answer
    update((s) => {
      s.progress.shards += glimmer;
      if (res.won) s.progress.battlesWon += 1;
    });
    // the glimmer goes to the Crystal Grid, and in chapter 2 the beaten fiends leave parts for the Sword Master's forge
    earnLight(w, glimmer);
    const parts = w.flags.ch2 ? partsFor(res.stats.defeated) : 0;
    if (parts) addParts(w, parts);
    renderGlimmer();
    fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
    const loot = [glimmer > 0 ? `+${glimmer} glimmer` : null, parts && w.flags.dockWon ? `+${parts} ${parts === 1 ? "part" : "parts"}` : null].filter(Boolean);
    if (res.won) toast(loot.length ? `Victory! ${loot.join(" · ")}` : "Victory!");
    if (ready.length && w.flags.dayTwo) {
      const keeper = getSave().names.beastkeeper || CLASSES.beastkeeper.hero;
      const who = ready.map((id) => PETS[id].name).join(" and ");
      setTimeout(() => toast(`${who} ${ready.length > 1 ? "are" : "is"} ready to grow! ${keeper}'s nests.`), 2800);
    }
    grace(w, rng, ENCOUNTER_GRACE);
    saveWorld();
    if (!res.won) await api.say("fellBack");
    else if (partyHealth(w) < 0.35 && !w.flags.nudgedRest) {
      w.flags.nudgedRest = true; // once, until he rests
      saveWorld();
      await api.say("restNudge");
    }
    dialogue.hide();
    return res;
  }

  function toast(text, icon = null) {
    const el = h("div.explore-toast", {}, ...(icon ? [icon] : []), h("span", {}, text));
    screen.append(el);
    el.animate(
      [
        { opacity: 0, transform: "translate(-50%, 10px)" },
        { opacity: 1, transform: "translate(-50%, 0)", offset: 0.12 },
        { opacity: 1, transform: "translate(-50%, 0)", offset: 0.85 },
        { opacity: 0, transform: "translate(-50%, -6px)" },
      ],
      { duration: 2600, fill: "forwards" },
    ).onfinish = () => el.remove();
  }

  // ------------------------------------------------------------ the story's tools (see story.js)
  const api = {
    world: w,
    save: saveWorld,
    has: (id) => hasItem(w, id),
    /** A conversation; `onLine(line, i)` runs as each line comes up (the ending times things to them). */
    async say(id, onLine = null) {
      const lines = CONVOS[id] || [];
      conversing = true;
      let farSong = false;
      preloadLines(lines.map((l) => ({ style: voiceOf(l.who), text: l.text })));
      // Captain Jumble brings his own theme; whatever was playing comes back after him
      const back = lines.some((l) => l.who === "jumble") ? music.current : null;
      try {
        for (const [i, line] of lines.entries()) {
          if (finished) return;
          if (back && !musicHeld) music.play(line.who === "jumble" ? "music_jumble" : back);
          talking(line.who, line.mood);
          onLine?.(line, i);
          if (line.song === "far" && !singer()) {
            // they hear it for the first time: from now on it drifts up in the canyon until they find her
            farSong = true;
            w.flags.heardSong = true;
            saveWorld();
            music.stop(1.5);
            song.play(SONG, { volume: 0.34, muffled: true });
          }
          await dialogue.say(line);
        }
      } finally {
        conversing = false;
        if (farSong && !farSinging()) {
          song.stop(3);
          setTimeout(() => !finished && music.play(scene.music), 1500);
        }
      }
      if (back && !musicHeld) music.play(back);
    },
    line: (who, mood, text) => dialogue.say({ who, mood, text }),
    /** The talking box goes (it stays up after a conversation's last line until something else happens). */
    hideLines: () => dialogue.hide(),
    choose: (options) => dialogue.choose(options),
    async give(id) {
      giveItem(w, id);
      saveWorld();
      renderBag();
      play("sfx_pickup");
      toast(`You got the ${ITEMS[id].name}!`, itemIcon(ITEMS[id].icon));
      await wait(500);
    },
    take(id) {
      takeItem(w, id);
      if (held === id) setHeld(null);
      saveWorld();
      renderBag();
    },
    async shard(id) {
      addShard(w, id);
      saveWorld();
      dialogue.hide();
      play("sfx_puzzle_solved");
      const fly = h("div.shard-fly", {}, shardIcon());
      screen.append(fly);
      const [sx, sy] = stage.toScreen(hero.x, hero.y - HERO_SIZE[1] * scaleOf(hero.y));
      await fly.animate(
        [
          { left: `${sx}px`, top: `${sy}px`, transform: "translate(-50%,-50%) scale(0.4)", opacity: 0 },
          { left: `${sx}px`, top: `${sy - 60}px`, transform: "translate(-50%,-50%) scale(1.6)", opacity: 1, offset: 0.35 },
          { left: "1150px", top: "34px", transform: "translate(-50%,-50%) scale(0.6)", opacity: 1 },
        ],
        { duration: 1500, easing: "ease-in-out", fill: "forwards" },
      ).finished;
      fly.remove();
      renderShards();
      toast(`Crystal shard! ${w.shards.length} of 4`, shardIcon());
      await wait(400);
    },
    async join(cls) {
      joinParty(w, cls);
      w.pos = [Math.round(hero.x), Math.round(hero.y)];
      saveWorld();
      dialogue.hide();
      // the NPC standing in the scene becomes a follower
      const npc = ents.find((e) => e.kind === "npc" && e.hot.sprite === cls);
      const at = npc ? [npc.x, npc.y] : [hero.x - 80, hero.y];
      if (npc) removeEnt(npc);
      const m = addMember(cls, at);
      // keep the party in joining order behind the Knight
      party.sort((a, b) => w.party.indexOf(a.cls) - w.party.indexOf(b.cls));
      m.facing = hero.x > m.x ? 1 : -1;
      play("sfx_join");
      renderParty();
      toast(`${getSave().names[cls] || CLASSES[cls].hero} the ${CLASSES[cls].name} joins the party!`);
      await wait(900);
    },
    async puzzle(kind, opts = {}) {
      dialogue.hide();
      const s = getSave();
      mastery.beginTurn?.(PUZZLE_TRACK[kind]); // playing together: one puzzle each
      const q = PUZZLES[kind]({ mastery, rng, ...opts, recent: s.log.slice(-12).map((x) => x.answer), missed: s.collection.missedWords, schoolWords: s.settings.schoolWords });
      if (DEBUG) window.__puzzle = q;
      const r = await askPuzzle(screen, q, { mastery, rng });
      if (r === "back") return null;
      // the sentence that woke the shrine, for the chapter's ending to read back to him
      if (kind === "shrine" && typeof q.given === "string" && q.given.trim()) {
        w.shrineWords = q.given.trim();
        saveWorld();
      }
      lastGiven = typeof q.given === "string" ? q.given.trim() : "";
      const ok = r === "right" || r === "retry";
      // a fog sign keeps its word once he's given it back
      if (ok && kind === "fog" && opts.sign) w.flags[opts.sign] = q.word || true;
      return ok;
    },
    battle(enc) {
      const resume = resumeFight?.encounter?.id === enc.id ? resumeFight : null;
      resumeFight = null;
      return battle({ ...enc, intro: enc.intro || CONVOS[enc.introLine]?.[0]?.text || TRAINING.find((t) => t.id === "t4")?.intro || "" }, resume, runningScript);
    },
    /** True while a story script is being re-run to pick up its saved fight: skip what leads up to it. */
    get resumingFight() {
      return Boolean(resumeFight);
    },
    /** Fiends jump out now because the story says so (these ones, or the place's own; `extra` changes the fight, like its introLine). Resolves with the fight's result. */
    async ambush(fiends = null, extra = {}) {
      const enc = wildEncounter(sceneId, w, rng, fiends);
      return enc ? jumpOut({ ...enc, ...extra }) : { won: true, skipped: true };
    },
    sfx: (id) => play(id),
    wait: (ms) => wait(ms),
    /**
     * A quiet moment, for a story he found by looking: the place's music steps
     * back (with `song`, Maren's song comes in softly instead) and the view
     * leans in. Returns the way back.
     */
    hush(hotId = null, { song: sing = false } = {}) {
      const lean = { x: 0, y: 0, zoom: 1.07, t0: performance.now(), inMs: 2200, holdMs: 600000, outMs: 1600 };
      if (hotId && hotOf(hotId)) stage.camera.pushes.push(lean);
      music.stop(1.8);
      if (sing) song.play(SONG, { volume: 0.32 });
      return () => {
        lean.holdMs = Math.max(0, performance.now() - lean.t0 - lean.inMs); // ease back out from here
        if (sing) song.stop(2);
        setTimeout(() => finished || music.play(scene.music), sing ? 1400 : 400);
      };
    },
    shake(power = 10, ms = 400) {
      field.animate(
        Array.from({ length: 8 }, (_, i) => ({ transform: `translate(${(Math.random() - 0.5) * power * (1 - i / 8)}px, ${(Math.random() - 0.5) * power * (1 - i / 8)}px)` })).concat([{ transform: "none" }]),
        { duration: ms },
      );
    },
    flash(color = "#fff") {
      const el = h("div.explore-flash", { style: { background: color } });
      screen.append(el);
      el.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 500, easing: "ease-out" }).onfinish = () => el.remove();
    },
    tip,
    async monkeyFlee(hotId, { squeak = false } = {}) {
      const e = byHot.get(hotId);
      if (!e) return;
      dialogue.hide();
      play(squeak ? "sfx_squeak" : "sfx_monkey");
      const dir = e.x > hero.x ? 1 : -1;
      const fieldSheet = e.el.querySelector(".body > .sheet")?._sheet;
      if (fieldSheet?.frames?.run !== undefined) {
        setPose(e.el, "run");
        e.rec.flip = dir < 0; // the field sheet faces right
      } else e.rec.flip = dir > 0;
      const x0 = e.x;
      const y0 = e.y;
      const lift0 = e.lift || 0;
      const t0 = performance.now();
      await new Promise((resolve) => {
        const off = stage.onFrame(() => {
          const k = Math.min(1, (performance.now() - t0) / 1100);
          e.x = x0 + dir * 900 * k * k;
          e.lift = lift0 * (1 - k);
          e.y = y0 + 40 * k;
          e.bob = -Math.abs(Math.sin(k * Math.PI * 6)) * 26;
          if (k >= 1) {
            off();
            resolve();
          }
        });
      });
      removeEnt(e);
    },
    refresh: () => {
      refreshHotspots();
      renderShards();
      renderGlimmer();
    },
    /** A rest crystal: everyone healed, potions topped up. */
    rest() {
      rest(w);
      w.flags.nudgedRest = false;
      grace(w, rng, ENCOUNTER_GRACE);
      saveWorld();
      play("sfx_heal") || sfx.heal();
      api.flash("#9ff6e4");
      const e = byHot.get("rest");
      if (e?.glow) e.glow.animate([{ opacity: 0.55, transform: "translate(-50%, -50%) scale(1)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1.8)" }, { opacity: 0.55, transform: "translate(-50%, -50%) scale(1)" }], { duration: 1400, easing: "ease-out" });
      else if (e) e.el.animate([{ filter: "brightness(1)" }, { filter: "brightness(2.2) drop-shadow(0 0 30px #9ff6e4)" }, { filter: "brightness(1)" }], { duration: 1200 });
      for (const m of party) {
        const [x, y] = stage.toScreen(m.x, m.y - HERO_SIZE[1] * scaleOf(m.y) * 0.6);
        const plus = h("div.heal-float", { style: { left: `${x}px`, top: `${y}px` } }, "+");
        screen.append(plus);
        plus.animate([{ opacity: 0, transform: "translate(-50%, 0)" }, { opacity: 1, transform: "translate(-50%, -30px)", offset: 0.3 }, { opacity: 0, transform: "translate(-50%, -70px)" }], { duration: 1200, easing: "ease-out" }).onfinish = () => plus.remove();
      }
      renderParty();
      toast("Rested! Everyone's healed.");
    },
    /** Ride the rope from one place to another: on the island map, where the party slides down the line. */
    async zipMap(from, to) {
      dialogue.hide();
      play("sfx_swap") || sfx.swap();
      w.onMap = true;
      w.mapRide = { from, to };
      w.pos = null;
      grace(w, rng);
      saveWorld();
      await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: "forwards" }).finished;
      teardown();
      finish("next");
    },
    /** Draw the eye to something in the scene: it glows and pulses for a few seconds. */
    beckon(hotId) {
      const e = byHot.get(hotId);
      if (!e) return;
      e.el.classList.remove("beckon");
      void e.el.offsetWidth; // restart the pulse
      e.el.classList.add("beckon");
      setTimeout(() => e.el.classList.remove("beckon"), 4200);
    },
    /** Change a character's pose in the scene (the monkey's field sheet has idle, hold, raspberry, run). */
    pose(hotId, pose) {
      const e = byHot.get(hotId);
      if (e && e.kind === "npc") setPose(e.el, pose);
    },
    async ending() {
      await ending();
    },

    // ---------------------------------------------------------- chapter 2's tools (world/chapter2.js)
    /** What he wrote in the last puzzle (his field note, the words for the storm). */
    get given() {
      return lastGiven;
    },
    /** The fiends he's captured, by id. */
    get captures() {
      return getSave().collection.captures || {};
    },
    /** A story card over the scene; null when it isn't painted (the lines play over the scene instead). */
    card: (id, opts) => storyCard(id, opts),
    /** On to another place now. */
    async travel(to, at = null) {
      if (!SCENES[to] || finished) return;
      dialogue.hide();
      play("sfx_step_sand");
      w.scene = to;
      w.pos = at;
      w.onMap = false;
      grace(w, rng, ENCOUNTER_GRACE);
      saveWorld();
      await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 550, fill: "forwards" }).finished;
      teardown();
      finish("next");
    },
    /** A hero ducks out of sight (Knox, wherever Captain Jumble might see him). */
    hide(cls, hidden = true) {
      const m = party.find((p) => p.cls === cls);
      if (m) m.el.animate([{ opacity: hidden ? 0 : 1 }], { duration: 350, fill: "forwards" });
    },
    /** Someone walks off out of the scene, and is gone. */
    async walkOff(hotId) {
      const e = byHot.get(hotId);
      if (!e || e.kind !== "npc") return;
      const dir = e.x > 640 ? 1 : -1;
      if (e.rec) e.rec.flip = (dir > 0) !== (e.sheetFaces === "right");
      const x0 = e.x;
      const t0 = performance.now();
      await new Promise((resolve) => {
        const off = stage.onFrame(() => {
          const k = Math.min(1, (performance.now() - t0) / 2600);
          e.x = x0 + dir * 700 * k;
          e.el.style.opacity = String(1 - Math.max(0, k - 0.6) / 0.4);
          if (k >= 1) {
            off();
            resolve();
          }
        });
      });
      removeEnt(e);
    },
    /** A remembered pet appears beside its hero, with a pop. */
    petPop(id) {
      if (!w.pets?.[id]) return;
      // a pet that's grown (at Tamsin's nests): its new form takes the old one's place
      const had = pets.find((m) => m.id === id);
      if (had && had.stage === (w.pets[id].stage || 1)) return;
      if (had) {
        pets.splice(pets.indexOf(had), 1);
        ents.splice(ents.indexOf(had), 1);
        had.el.remove();
      }
      const owner = party.find((p) => p.cls === w.pets[id].owner) || hero;
      const m = addPet(id, had ? [had.x, had.y] : freePoint([owner.x + 70, owner.y + 10], scene.walk, blocks));
      m.el.animate([{ transform: "translate(-50%, -100%) scale(0.2)", opacity: 0 }, { transform: "translate(-50%, -100%) scale(1.15)", opacity: 1, offset: 0.6 }, { transform: "translate(-50%, -100%) scale(1)", opacity: 1 }], { duration: 700, easing: "ease-out" });
      play("sfx_join");
      toast(had ? `${PETS[id].name} grows into a new form!` : `${PETS[id].name} joins ${getSave().names[w.pets[id].owner] || CLASSES[w.pets[id].owner].hero}!`);
    },
    /**
     * A song over the scene (the Lantern Song): false if the track (and its
     * stand-in) isn't in the sound pack yet. `from` names one of the track's
     * cues (the chorus) to start at, and `once` plays it through to its end;
     * the stand-in has no cues and starts from the top.
     */
    playSong(id, { fallback = null, volume = 0.6, from = null, once = false } = {}) {
      const has = (x) => Boolean(audioManifest().sounds?.[x]);
      const track = has(id) ? id : fallback && has(fallback) ? fallback : null;
      if (!track) return false;
      music.stop(1.2);
      song.play(track, { volume, from: (from && audioManifest().sounds[track].cues?.[from]) || 0, once });
      return true;
    },
    stopSong() {
      song.stop(2);
      if (!musicHeld) setTimeout(() => finished || music.play(scene.music), 1600);
    },
    /** The song steps back (under words read out) or forward again. */
    songLevel(volume) {
      song.level(volume, false, 0.5);
    },
    /**
     * Until the song reaches one of its cues, ends, or `maxMs` passes. False
     * at once when no song is playing or it has no such cue.
     */
    async songAt(cue, maxMs = 30000) {
      const at = song.playing && audioManifest().sounds?.[song.playing]?.cues?.[cue];
      if (at == null) return false;
      const until = performance.now() + maxMs;
      while (song.playing && song.time < at && performance.now() < until) await wait(200);
      return true;
    },
    /** Until the song (played `once`) ends, or `maxMs` passes. False at once when none is playing. */
    async songEnd(maxMs = 30000) {
      if (!song.playing) return false;
      const until = performance.now() + maxMs;
      while (song.playing && performance.now() < until) await wait(200);
      return true;
    },
    /** The music steps out and stays out (true), or comes back (false). */
    holdMusic(on) {
      musicHeld = on;
      if (on) music.stop(0.5);
      else music.play(scene.music);
    },
    /** His words, read out in the movie-trailer voice (as a Titan's entrance is). */
    async trailer(text) {
      await Promise.race([speak(text, "trailer"), wait(14000)]);
    },
    /** The night passes at camp: the screen goes dark, and comes back up on morning. */
    async night() {
      dialogue.hide();
      await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, fill: "forwards" }).finished;
      await wait(1600);
      await fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1400, fill: "forwards" }).finished;
    },
    async ending2() {
      await ending2();
    },
    /** The view tilts up to the lamp room's ceiling, where the old crystal throws the Sage chart (the "grid" cue). api.grid brings it back down. */
    lookUp: () => lookUp(),
    /**
     * The Crystal Grid (ui/grid.js). In the lamp room the view looks up at the
     * chart on the ceiling first, and back down after. Resolves when he closes it.
     */
    async grid({ first = false } = {}) {
      dialogue.hide();
      if (sceneId === "lamp_room" && !lookingUp) {
        lookUp();
        await wait(1500);
      }
      await gridScreen({ first });
      if (lookingUp) {
        lookDown();
        await wait(900);
      }
    },
    /** The Sword Master's forge window (ui/forge.js): resolves with the hero whose weapon he picks to forge next, or null when he steps away. */
    async forge() {
      dialogue.hide();
      forgeWin ||= createForge(screen, { world: w, names: getSave().names });
      const cls = await forgeWin.pick();
      if (!cls) forgeWin = null;
      renderGlimmer();
      return cls;
    },
    /** He has the parts for a hero's next step but not the glimmer: the window shows it. */
    async forgeShort(cls) {
      await forgeWin?.short(cls);
    },
    /** The hammer comes down on a hero's weapon (its new step is in the save already). */
    async forged(cls) {
      renderGlimmer();
      await forgeWin?.forged(cls);
    },
    /** Parts for the forge from somewhere besides a fight (Hal's blade bits): a toast, and the count in the corner. */
    gotParts(n, what = "Parts") {
      play("sfx_pickup");
      toast(`${what}! +${n} parts`);
      renderGlimmer();
    },
  };
  let forgeWin = null; // the forge window, while he's at the Sword Master's forge

  // ------------------------------------------------------------ the Crystal Grid
  /** Each child's mastery, for the Grid's skill gates (world/grid.js, gateProgress): either child can open one. */
  function gridKids() {
    const s = getSave();
    if (!mastery.masteryOf || !Array.isArray(s.players)) return [{ name: "", gradeOf: (t) => mastery.gradeOf?.(t) ?? 3, level: (id) => mastery.level(id), evidence: (id) => mastery.evidence?.(id) }];
    return s.players.map((p) => {
      const m = mastery.masteryOf(p.id);
      return { name: playerName(s.players, p.id), gradeOf: (t) => gradeFor(p, t), level: (id) => m.level(id), evidence: (id) => m.evidence(id) };
    });
  }

  /** The Grid's screen over the scene. Resolves when he closes it. */
  async function gridScreen({ first = false } = {}) {
    dialogue.hide();
    const kitSays = async (id) => {
      await api.say(id);
      dialogue.hide();
    };
    await openGrid(screen, { world: w, api: { say: kitSays, save: saveWorld }, kids: gridKids(), names: getSave().names, first });
    // a health node raises (and heals) a hero's health; Calm Seas changes how often fiends come
    renderGlimmer();
    renderParty();
    refreshHotspots();
  }

  // The lamp room's ceiling is above the screen: the view tilts up to see the Sage chart, and stays up until lookDown.
  const LOOK_UP = 290; // stage px
  let lookingUp = null; // the camera push holding the view up
  function lookUp() {
    if (lookingUp || finished) return;
    lookingUp = { x: 0, y: -LOOK_UP, zoom: 1, t0: performance.now(), inMs: 1800, holdMs: 600000, outMs: 1400 };
    stage.camera.yRange = [-LOOK_UP - 20, 40];
    stage.camera.pushes.push(lookingUp);
  }
  function lookDown() {
    const p = lookingUp;
    if (!p) return;
    lookingUp = null;
    p.holdMs = Math.max(0, performance.now() - p.t0 - p.inMs); // ease back down from here
    setTimeout(() => lookingUp || (stage.camera.yRange = [-40, 40]), p.inMs + p.outMs);
  }

  /**
   * A story card (art wave 08, Section J) over the scene, under the dialogue
   * box. Resolves null when its painting isn't there, so the lines play over
   * the scene. `draw: "logbook"`: the keeper's logbook, its one line drawn page
   * after page (card.done resolves when the pages have turned). `states`: a
   * painted scene with its state patches laid over (the harbor, remembered).
   */
  async function storyCard(id, { draw = null, states = null } = {}) {
    const src = id && assetUrl(id);
    if (!src || !(await imageReady(src)) || finished) return null;
    const el = h(`div.story-card${draw ? `.${draw}` : ""}`);
    el.style.backgroundImage = `url("${src}")`;
    if (states) {
      // the painting with its changes laid over, on a canvas
      const info = assetInfo(id);
      const canvas = h("canvas", { width: info.base.w || 1536, height: info.base.h || 1024 });
      const g = canvas.getContext("2d");
      const load = (s2) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `assets/${s2}`;
      });
      const base = await load(info.base.src);
      if (base) g.drawImage(base, 0, 0, canvas.width, canvas.height);
      for (const st of states) {
        const p = info.states?.[st];
        const img = p && (await load(p.src));
        if (img) g.drawImage(img, p.x, p.y, p.w, p.h);
      }
      el.style.backgroundImage = "";
      el.append(canvas);
    }
    screen.append(el);
    screen.classList.add("cinematic");
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: "ease-out", fill: "forwards" });
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }], { duration: 40000, easing: "ease-out", fill: "forwards" });
    const handle = {
      el,
      done: Promise.resolve(),
      close() {
        if (!el.isConnected || el.closing) return;
        el.closing = true;
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" }).onfinish = () => {
          el.remove();
          if (!screen.querySelector(".story-card")) screen.classList.remove("cinematic");
        };
      },
      /** Words on the card (his words, as Beaconwing wakes). */
      write(text) {
        const q = h("div.card-words", {}, text);
        el.append(q);
        q.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 1200, easing: "ease-out", fill: "both" });
      },
      /** A stamp lands on the card (IRRELEVANT, on Jumble's file). */
      stamp(text) {
        const st = h("div.card-stamp", {}, text);
        el.append(st);
        st.animate([{ opacity: 0, transform: "translate(-50%, -50%) rotate(-12deg) scale(2.4)" }, { opacity: 1, transform: "translate(-50%, -50%) rotate(-12deg) scale(1)" }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "both" });
      },
    };
    if (draw === "logbook") handle.done = logbookPages(el);
    return handle;
  }

  /** The keeper's logbook: a date, then the same line in the same shaky hand, page after page. No voice reads it. */
  async function logbookPages(el) {
    const page = h("div.logbook-page");
    el.append(page);
    let skipped = false;
    const click = () => (skipped = true);
    el.addEventListener("click", click);
    screen.addEventListener("click", click);
    const offSkip = onKeys((e) => ["Enter", " ", "Escape"].includes(e.key) && click());
    const nights = 6;
    for (let i = 0; i < nights && !skipped; i++) {
      page.replaceChildren(h("div.logbook-date", {}, `Night ${400 + i * 61}`), h("div.logbook-line", {}, "Said goodnight to the bird."));
      page.animate([{ opacity: 0, transform: "rotateY(-12deg)" }, { opacity: 1, transform: "none" }], { duration: 900, easing: "ease-out", fill: "both" });
      play("sfx_page");
      for (let t = 0; t < (i === nights - 1 ? 3600 : 2200) && !skipped; t += 100) await wait(100);
    }
    el.removeEventListener("click", click);
    screen.removeEventListener("click", click);
    offSkip();
  }

  /** Whoever is talking hops a little, if they're in the scene; someone met on the island strikes a pose for the line. */
  function talking(who, mood = "neutral") {
    const m = party.find((p) => p.cls === who) || ents.find((e) => e.kind === "npc" && e.hot.sprite === who) || (who === "kit" ? kit : null);
    if (!m) return;
    m.el.animate([{ transform: "translate(-50%, -100%)" }, { transform: "translate(-50%, calc(-100% - 8px))" }, { transform: "translate(-50%, -100%)" }], { duration: 260, easing: "ease-out" });
    const poses = m.kind === "npc" && NPC_POSES[m.hot.poses];
    if (poses) {
      m.talkingUntil = performance.now() + 900; // the waiting pose comes back after the conversation
      setPose(m.el, poses[mood] || poses.any || (Array.isArray(poses.idle) ? poses.idle[0] : "idle"));
    }
  }

  // ------------------------------------------------------------ the chapter's ending
  /**
   * The end of chapter 1: the crystal remade, everyone's thanks, what he did
   * (counted up, with his own words read back), the harbor where the crystal
   * has to go next (and Pockets running off with Kit's hat), and Captain
   * Jumble heading there too. Then "To be continued", and back to exploring.
   * A painting or a film is behind each part (ENDING); clicks move the words on.
   */
  async function ending() {
    const films = Object.fromEntries(Object.entries(ENDING).map(([k, m]) => [k, loadFilm(m.film)]));
    const veil = h("div.ending-veil");
    screen.append(veil);
    screen.classList.add("cinematic"); // the HUD steps aside
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
    ambience.stop?.();
    music.play("music_journey"); // the sound pack's heroic theme, for the chapter's last moments
    play("sfx_overdrive");

    // the crystal remade (with no painting yet, the four shards spin together over the scene)
    let shot = await moment(veil, ENDING.crystal, films.crystal);
    let ring = null;
    if (!shot) {
      ring = h("div.ending-shards", {}, ...SHARDS.map(() => h("div.ending-shard", {}, shardIcon())));
      veil.append(ring);
      ring.animate([{ transform: "translate(-50%,-50%) rotate(0deg) scale(1.6)", opacity: 0 }, { transform: "translate(-50%,-50%) rotate(360deg) scale(1)", opacity: 1 }], { duration: 2200, easing: "ease-out", fill: "forwards" });
      await wait(2300);
    } else await wait(1000);
    const glowAt = shot ? ENDING.crystal.glow : [50, 34];
    await api.say("endingCrystal", (line, i) => {
      if (i === ENDING.crystal.roll) shot?.roll();
      if (shot?.film) return; // the film shows it all
      if (line.cue === "fuse") {
        ring?.classList.add("fused");
        light(shot?.el || veil, "glow", glowAt);
        play("sfx_puzzle_solved");
        api.flash("#dffcff");
      } else if (line.cue === "wave") {
        light(veil, "wave", glowAt);
        play("sfx_heal") || sfx.heal();
        api.flash("#e8fffb");
      }
    });
    await api.say("endingThanks");
    dialogue.hide();
    await shot?.played();
    await recap();

    // the harbor at sunset, where the crystal belongs (and Pockets)
    shot = (await moment(veil, ENDING.harbor, films.harbor)) || shot;
    await api.say("endingHarbor", (line, i) => {
      if (i === ENDING.harbor.roll) shot?.roll();
      if (line.cue === "hat" && !shot?.film) {
        play("sfx_monkey");
        api.shake(6, 300);
      }
    });
    dialogue.hide();
    await shot?.played();

    // Captain Jumble, sailing for the same harbor
    shot = (await moment(veil, ENDING.jumble, films.jumble)) || shot;
    await api.say("endingJumble", (line, i) => {
      if (i === ENDING.jumble.roll) shot?.roll();
      if (line.cue === "dark") shot?.el.animate([{ filter: "brightness(1)" }, { filter: "brightness(0.35)" }], { duration: 2600, fill: "forwards" });
    });
    dialogue.hide();

    await toBeContinued(veil);
    screen.classList.remove("cinematic");
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" }).finished;
    veil.remove();
    playSceneAudio();
    await wait(700);
    await api.say("endingAfter");
    dialogue.hide();
    // the first time through, on into chapter 2 (runAdventure opens it)
    if (!w.flags.ch2) {
      await fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" }).finished;
      teardown();
      finish("next");
    }
  }

  /**
   * The end of chapter 2 (docs/story/chapter2-script.md, beat 12): the new
   * crystal goes into the great lens and the harbor remembers, the keeper
   * says her name, the gallery at dawn and Kit's hat (back, and gone again),
   * "Chapter 2 complete" with his own words read back, and Captain Jumble
   * sailing for Smoke Mountain. Story cards behind the lines (CARDS); a card
   * that isn't painted (the gallery's, until wave 09) leaves the lines over
   * the lamp room.
   */
  async function ending2() {
    ambience.stop?.();
    const cards = [];
    const card = async (id, opts) => {
      const c = await storyCard(id, opts);
      if (c) cards.push(c);
      return c;
    };
    const closeCards = () => cards.splice(0).forEach((c) => c.close());
    // the crystal settles into the lens, and the lamp catches
    music.play("music_journey");
    play("sfx_overdrive");
    api.flash("#fff6c8");
    await wait(900);
    await api.say("endingLens", (line) => {
      if (line.cue === "card") {
        card(CARDS.endingLens);
        play("sfx_bell") || play("sfx_heal");
      }
    });
    // what comes back: the harbor, remembered (bells, bunting, the recipe book, Hal's board)
    await card("scene_harbor", { states: ["clock_fixed", "remembered"] });
    await api.say("endingTown");
    closeCards();
    dialogue.hide();
    await wait(800);
    // her name: nobody else speaks, and nothing funny happens anywhere near it
    const back = api.hush("keeper");
    try {
      await wait(1200);
      await api.say("endingKeeper");
      dialogue.hide();
      await wait(2200);
    } finally {
      back();
    }
    // the gallery at dawn (its card, once wave 09 paints it; until then, the lamp room)
    await card(CARDS.endingThanks2);
    await api.say("endingThanks2");
    await api.say("endingHat", (line) => {
      if (line.cue === "hatOn") {
        w.flags.kitHat = true;
        saveWorld();
      } else if (line.cue === "bells") play("sfx_bell") || play("sfx_heal");
      else if (line.cue === "card") card(CARDS.endingHat);
      else if (line.cue === "cozy") {
        w.flags.kitHat = false;
        saveWorld();
      }
    });
    closeCards();
    dialogue.hide();
    await recap2();
    // Captain Jumble, the next night, sailing for Smoke Mountain
    await card(CARDS.endingJumble2);
    await api.say("endingJumble2");
    dialogue.hide();
    w.flags.ch2Done = true;
    saveWorld();
    await toBeContinued2();
    closeCards();
    refreshHotspots();
    playSceneAudio();
  }

  /** "Chapter 2 complete": the harbor's numbers counted up, and his own words read back (Rivet's field note, the words that woke Beaconwing). */
  async function recap2() {
    const save = getSave();
    const col = save.collection;
    const sum = (o, f) => Object.values(o || {}).reduce((n, x) => n + (Number(f(x)) || 0), 0);
    const stats = [
      ["True things the crystal knows", mastery.totalRight ? mastery.totalRight() : sum(mastery.toJSON().skills, (r) => r.k)],
      ["Fiends defeated", sum(col.defeated, (n) => n)],
      ["Friends remembered", Object.keys(w.pets || {}).length],
    ].filter(([, n]) => n > 0);
    const note = w.pets?.rivet?.notes?.[0];
    const quotes = [note ? [`Your field note for ${PETS.rivet.name}`, note] : null, w.bindWords ? ["The words that woke Beaconwing", w.bindWords] : null].filter(Boolean);
    const tiles = stats.map(([label, n]) => h("div.recap-stat", {}, h("b", {}, String(n)), h("span", {}, label)));
    const quoteEls = quotes.map(([label, text]) => h("div.recap-quote", {}, h("span", {}, label), h("q", {}, text)));
    const btn = h("button.btn.gold", {}, "Continue (Enter)");
    const win = h("div.window.recap", {}, h("div.tbc-small", {}, "Driftwood Harbor"), h("h2", {}, "Chapter 2 complete!"), h("div.recap-body.one", {}, h("div.recap-side", {}, tiles.length ? h("div.recap-stats", {}, ...tiles) : null, ...quoteEls)), btn);
    screen.append(win);
    win.animate([{ opacity: 0, transform: "translate(-50%, -47%) scale(0.97)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 600, easing: "ease-out", fill: "forwards" });
    [...tiles, ...quoteEls].forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 700 + i * 900, easing: "ease-out", fill: "backwards" }));
    // the whole Lantern Song, for looking back (Maren's song until it's made)
    music.stop(1.5);
    api.playSong(LANTERN_SONG, { fallback: SONG_STAND_IN, volume: 0.7 });
    const go = deferred();
    btn.addEventListener("click", () => go.resolve());
    const off = onKeys((e) => (e.key === "Enter" || e.key === " ") && go.resolve());
    await go.promise;
    off();
    sfx.select();
    await win.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished;
    win.remove();
    song.stop(2.5);
  }

  /** "To be continued", after chapter 2. */
  async function toBeContinued2() {
    music.play("music_title");
    const btn = h("button.btn.gold", {}, "Keep exploring (Enter)");
    const win = h("div.window.tbc", {}, h("h2", {}, "To be continued…"), h("div.tbc-next", {}, "Captain Jumble is sailing for Smoke Mountain."), h("p", {}, "Fiends still roam Driftwood Isle. Keep exploring and practicing!"), btn);
    screen.append(win);
    win.animate([{ opacity: 0, transform: "translate(-50%, -46%)" }, { opacity: 1, transform: "translate(-50%, -50%)" }], { duration: 700, easing: "ease-out", fill: "forwards" });
    const d = deferred();
    btn.addEventListener("click", () => d.resolve());
    const off = onKeys((e) => e.key === "Enter" && d.resolve());
    await d.promise;
    off();
    sfx.select();
    win.remove();
  }

  /** Start loading a film of the ending (null: there isn't one yet). `ready` resolves true once it can play. */
  function loadFilm(src) {
    if (!src) return null;
    const el = h("video.ending-film", { muted: true, playsInline: true, preload: "auto", src });
    const ready = new Promise((resolve) => {
      el.addEventListener("canplay", () => resolve(true), { once: true });
      el.addEventListener("error", () => resolve(false), { once: true });
      setTimeout(() => resolve(el.readyState >= 3), 5000);
    });
    return { el, ready };
  }

  /**
   * One part of the ending, behind the words: its painting, pushed in slowly
   * so it's never a still frame, with its film (if the parent has made one)
   * ready to roll from that same picture. It fades in over whatever was
   * there, which then goes. Null when there's neither painting nor film.
   */
  async function moment(layer, m, film) {
    const id = m.art.find((a) => assetInfo(a)?.base?.src);
    const src = id ? assetUrl(id) : "";
    const [painted, filmed] = await Promise.all([src ? imageReady(src) : false, film ? film.ready : false]);
    if (!painted && !filmed) return null;
    const before = [...layer.children];
    const el = h("div.ending-moment", painted ? { style: { backgroundImage: `url("${src}")` } } : {});
    const video = filmed ? film.el : null;
    if (video) el.append(video);
    layer.append(el);
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }], { duration: 50000, easing: "ease-out", fill: "forwards" });
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: "ease-out", fill: "forwards" }).finished.then(() =>
      before.forEach((c) => {
        c.querySelector("video")?.pause();
        c.remove();
      }),
    );
    const ended = deferred();
    if (!video) ended.resolve();
    else video.addEventListener("ended", () => ended.resolve(), { once: true });
    let rolled = false;
    return {
      el,
      film: Boolean(video),
      roll() {
        if (!video || rolled) return;
        rolled = true;
        video.currentTime = 0;
        video
          .play()
          .then(() => video.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" }))
          .catch(() => ended.resolve());
      },
      /** Until its film has played out: a click or a key hurries it, and it never takes more than 16 seconds. */
      async played() {
        if (!video || !rolled) return;
        const hurry = deferred();
        const offHurry = onKeys((e) => ["Enter", " ", "Escape"].includes(e.key) && hurry.resolve());
        const click = () => hurry.resolve();
        screen.addEventListener("click", click);
        await Promise.race([ended.promise, hurry.promise, wait(16000)]);
        offHurry();
        screen.removeEventListener("click", click);
      },
    };
  }

  /** Light where the shards meet ("glow"), or a ring of it rolling out across the island ("wave"). */
  function light(layer, kind, [x, y]) {
    const el = h(`div.ending-${kind}`, { style: { left: `${x}%`, top: `${y}%` } });
    layer.append(el);
    if (kind === "glow") {
      el.animate([{ opacity: 0, transform: "translate(-50%, -50%) scale(0.2)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: 0.4 }, { opacity: 0.8, transform: "translate(-50%, -50%) scale(1.1)" }], { duration: 2600, easing: "ease-out", fill: "forwards" });
      el.animate([{ opacity: 0.8 }, { opacity: 0.55 }, { opacity: 0.8 }], { duration: 3200, delay: 2600, iterations: Infinity, easing: "ease-in-out" });
    } else {
      el.animate([{ opacity: 1, transform: "translate(-50%, -50%) scale(0.15)" }, { opacity: 0, transform: "translate(-50%, -50%) scale(4.5)" }], { duration: 2600, easing: "cubic-bezier(.2, .7, .3, 1)" }).onfinish = () => el.remove();
    }
  }

  /** "Chapter 1 complete": the four shards and how he won them, his numbers counted up, and his own words read back. */
  async function recap() {
    const save = getSave();
    const col = save.collection;
    const sum = (o, f) => Object.values(o || {}).reduce((n, x) => n + (Number(f(x)) || 0), 0);
    const stats = [
      ["True things you taught the crystal", mastery.totalRight ? mastery.totalRight() : sum(mastery.toJSON().skills, (r) => r.k)],
      ["Words spelled", sum(col.words, (x) => x.right)],
      ["Fiends defeated", sum(col.defeated, (n) => n)],
      ["Titan summons", col.entrances.length],
    ].filter(([, n]) => n > 0);
    // his best Titan entrance: the most powerful, then the longest
    const best = [...col.entrances].filter((e) => e?.text).sort((a, b) => (POWER_RANK[b.power] ?? 0) - (POWER_RANK[a.power] ?? 0) || b.text.length - a.text.length)[0];
    const power = best && POWERS[best.power];
    const quotes = [
      w.shrineWords ? ["The words that woke the shrine", w.shrineWords] : null,
      best ? [`Your mightiest ${save.names.titan || TITANS.titan_starter.name} entrance${power ? `: ${power.icon} ${power.label}` : ""}`, best.text] : null,
    ].filter(Boolean);
    const rows = SHARDS.filter((id) => w.shards.includes(id)).map((id) =>
      h("div.recap-row", {}, h("div.recap-icon", {}, uiIcon("shard_full", "ui_icons_explore") || shardIcon()), h("div", {}, h("b", {}, SHARD_DEEDS[id][0]), h("span", {}, SHARD_DEEDS[id][1]()))),
    );
    const tiles = stats.map(([label, n]) => ({ n, num: h("b", {}, "0"), label }));
    const tileEls = tiles.map((t) => h("div.recap-stat", {}, t.num, h("span", {}, t.label)));
    const quoteEls = quotes.map(([label, text]) => h("div.recap-quote", {}, h("span", {}, label), h("q", {}, text)));
    const btn = h("button.btn.gold", {}, "Continue (Enter)");
    const card = h(
      "div.window.recap",
      {},
      h("div.tbc-small", {}, "Driftwood Isle"),
      h("h2", {}, "Chapter 1 complete!"),
      h("div.recap-body", {}, h("div.recap-shards", {}, ...rows), h("div.recap-side", {}, tiles.length ? h("div.recap-stats", {}, ...tileEls) : null, ...quoteEls)),
      btn,
    );
    const parts = [...rows, ...tileEls, ...quoteEls, btn];
    for (const p of parts) p.style.opacity = "0";
    screen.append(card);
    card.animate([{ opacity: 0, transform: "translate(-50%, -47%) scale(0.97)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 600, easing: "ease-out", fill: "forwards" });
    // Maren's song, for looking back
    music.stop(1.5);
    song.play(SONG, { volume: 0.7 });

    // everything appears in turn (a click or a key shows the rest at once), then Continue
    let hurried = false;
    let shown = false;
    const hurry = deferred();
    const go = deferred();
    const press = () => {
      if (shown) go.resolve();
      else if (!hurried) {
        hurried = true;
        hurry.resolve();
      }
    };
    card.addEventListener("click", press);
    const offKey = onKeys((e) => (e.key === "Enter" || e.key === " ") && press());
    const step = (ms) => (hurried ? null : Promise.race([wait(ms), hurry.promise]));
    const show = (el) => {
      if (el.style.opacity === "1") return;
      el.style.opacity = "1";
      if (!hurried) el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "ease-out" });
    };
    const countUp = ({ n, num }) => {
      const t0 = performance.now();
      const tick = () => {
        const k = hurried ? 1 : Math.min(1, (performance.now() - t0) / 1100);
        num.textContent = String(Math.round(n * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      tick();
    };
    await step(800);
    for (const r of rows) {
      show(r);
      if (!hurried) play("sfx_pickup");
      await step(650);
    }
    for (const [i, t] of tiles.entries()) {
      show(tileEls[i]);
      countUp(t);
      await step(380);
    }
    await step(1200);
    for (const q of quoteEls) {
      show(q);
      await step(1400);
    }
    hurried = true;
    parts.forEach(show);
    shown = true;
    await go.promise;
    offKey();
    sfx.select();
    await card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished;
    card.remove();
    song.stop(2.5);
    music.play("music_journey");
  }

  /** "To be continued": what's waiting in chapter 2, over the harbor at dusk. */
  async function toBeContinued(layer) {
    const src = assetUrl(firstArt(["story_ending", "title_art", "key_art"]));
    if (src && (await imageReady(src))) {
      const before = [...layer.children];
      const bg = h("div.ending-moment.dim", { style: { backgroundImage: `url("${src}")` } });
      layer.append(bg);
      bg.animate([{ transform: "scale(1.04)" }, { transform: "scale(1.14)" }], { duration: 50000, easing: "ease-out", fill: "forwards" });
      bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1800, easing: "ease-in-out", fill: "forwards" }).finished.then(() => before.forEach((c) => c.remove()));
    }
    music.play("music_title");
    w.finished = true;
    saveWorld();
    await wait(1000);
    const items = NEXT_UP().map((t) => h("li", {}, t));
    // chapter 2 is here now: the first time through, the button goes on into it
    const btn = h("button.btn.gold", {}, w.flags.ch2 ? "Keep exploring (Enter)" : "On to Chapter 2 (Enter)");
    const card = h(
      "div.window.tbc",
      {},
      h("h2", {}, "To be continued…"),
      h("div.tbc-next", {}, "Next: Chapter 2, Driftwood Harbor"),
      h("ul.tbc-list", {}, ...items),
      w.flags.ch2 ? h("p", {}, "Fiends still roam Driftwood Isle. Keep exploring and practicing!") : null,
      btn,
    );
    screen.append(card);
    card.animate([{ opacity: 0, transform: "translate(-50%, -46%)" }, { opacity: 1, transform: "translate(-50%, -50%)" }], { duration: 700, easing: "ease-out", fill: "forwards" });
    items.forEach((li, i) => li.animate([{ opacity: 0, transform: "translateX(-14px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 700 + i * 280, easing: "ease-out", fill: "backwards" }));
    const d = deferred();
    btn.addEventListener("click", () => d.resolve());
    const off = onKeys((e) => e.key === "Enter" && d.resolve());
    await d.promise;
    off();
    sfx.select();
    card.remove();
  }

  // ------------------------------------------------------------ the play timer's camp
  /** About five minutes left: Kit says so, once. */
  async function campSoon() {
    busy = true;
    target = null;
    pending = null;
    markCampSoon();
    await api.say("campSoon");
    dialogue.hide();
    if (!finished) busy = false;
  }

  /** Time's up: the party makes camp where they stand, the game saves, and it's closed until tomorrow. */
  async function makeCamp() {
    busy = true;
    target = null;
    pending = null;
    route = [];
    w.pos = [Math.round(hero.x), Math.round(hero.y)];
    saveWorld();
    await api.say("camp");
    // dusk falls, and a fire glows where they stand (a stand-in until the camp has art)
    // the fire's light falls on him (where his sprite's feet are on the screen)
    const at = hero.el.getBoundingClientRect();
    const box = screen.getBoundingClientRect();
    const fireX = box.width ? ((at.left + at.width / 2 - box.left) / box.width) * 100 : 50;
    const fireY = box.height ? ((at.bottom - box.top) / box.height) * 100 : 75;
    const night = h("div.camp-night", { style: { "--fire-x": `${Math.round(fireX)}%`, "--fire-y": `${Math.round(fireY)}%` } });
    screen.append(night);
    night.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1800, fill: "forwards" });
    for (const m of party) setPose(m.el, "idle");
    // a fire-side line from each hero in the party, in the order they join
    for (const cls of ["knight", "gunner", "spellwright", "titancaller"]) {
      if (w.party.includes(cls) && !finished) await api.say({ knight: "camp_knight", gunner: "camp_gunner", spellwright: "camp_spellwright", titancaller: "camp_titancaller" }[cls]);
    }
    await campNow();
    await api.say("campEnd");
    dialogue.hide();
    fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" });
    await wait(1300);
    teardown();
    finish("camp");
  }

  // ------------------------------------------------------------ pause
  async function openPause() {
    if (busy) return;
    busy = true;
    const settings = () => getSave().settings;
    const lbl = (on, what) => `${what}: ${on ? "on" : "off"}`;
    const soundBtn = h("button.btn", {}, lbl(settings().sound, "🔊 Sound"));
    const voiceBtn = h("button.btn", {}, lbl(settings().voice, "🗣 Read aloud"));
    const d = deferred();
    const resume = h("button.btn.gold", { onclick: () => d.resolve("resume") }, "▶ Resume (Esc)");
    // chapter 2: Kit says where to go next (at least a direction; more if he's been stuck a while)
    const where = nextGoal(w) ? h("button.btn", { onclick: () => d.resolve("where") }, "🧭 Where next?") : null;
    // chapter 2: the Crystal Grid, from anywhere once he's found it
    const gridBtn = w.flags.gridSeen ? h(`button.btn${anyReady(w) ? ".grid-ready" : ""}`, { onclick: () => d.resolve("grid") }, "✦ Crystal Grid") : null;
    const quit = h("button.btn.ghost", { onclick: () => d.resolve("quit") }, "🏠 Save and quit to title");
    soundBtn.onclick = () => {
      update((s) => (s.settings.sound = !s.settings.sound));
      setMusicMuted(!settings().sound);
      applyVolumes();
      soundBtn.textContent = lbl(settings().sound, "🔊 Sound");
    };
    voiceBtn.onclick = () => {
      update((s) => (s.settings.voice = !s.settings.voice));
      if (!settings().voice) stopSpeaking();
      voiceBtn.textContent = lbl(settings().voice, "🗣 Read aloud");
    };
    const status = w.flags.ch2 ? scene.name : `${scene.name} · crystal shards ${w.shards.length} of 4`;
    const win = h("div.window.pause", {}, h("h2", {}, "Paused"), h("p.pause-where", {}, status), h("div.pause-buttons", {}, resume, where, gridBtn, soundBtn, voiceBtn, quit));
    const dim = h("div.dimmer", { style: { zIndex: 92 } });
    screen.append(dim, win);
    sfx.select();
    const off = onKeys((e) => e.key === "Escape" && d.resolve("resume"));
    const pick = await d.promise;
    off();
    win.remove();
    dim.remove();
    sfx.select();
    if (pick === "where") {
      await nudge(api, Math.max(2, w.stuck?.strength || 0));
      dialogue.hide();
      busy = false;
      return;
    }
    if (pick === "grid") {
      await gridScreen();
      if (!finished) busy = false;
      calmUntil = performance.now() + 400;
      return;
    }
    if (pick === "quit") {
      w.pos = [Math.round(hero.x), Math.round(hero.y)];
      saveWorld();
      teardown();
      finish("quit");
      return;
    }
    busy = false;
  }

  function teardown() {
    if (!followingSong(w)) song.stop(0.6);
    offKeys();
    window.removeEventListener("keyup", onKeyUp);
    dialogue.close();
    stage.stop();
  }

  // ------------------------------------------------------------ arriving
  (async () => {
    busy = true;
    const saved = getSave().fight;
    if (saved?.where?.kind === "adventure") await pickUpFight(saved);
    else if (sceneId === "cove" && !w.flags.woke) await wakeUp();
    else {
      await wait(500);
      await ARRIVE[sceneId]?.(api);
      // chapter 2: dusk falls when the day's done, and Kit nudges him when he's been stuck a while
      if (!finished) await afterArrive(api);
    }
    // the first walk back in after camp on an earlier day
    if (!finished && takeMorning()) await api.say("campMorning");
    dialogue.hide();
    if (!finished) busy = false;
  })();

  /** A fight saved mid-way (the game closed, or he left from the pause menu): straight back into it. */
  async function pickUpFight(saved) {
    if (saved.v !== 1 || !saved.b || !saved.encounter) {
      update((s) => (s.fight = null)); // from some older version: let it go
      return;
    }
    await wait(500);
    const script = saved.where.script;
    try {
      if (script && saved.where.scene === sceneId && SCRIPTS[script]) {
        // a story fight (the Geode Titan): its script skips ahead to the fight and carries on after it
        resumeFight = saved;
        runningScript = script;
        await SCRIPTS[script](api);
      } else await battle(saved.encounter, saved);
    } catch (err) {
      console.error(err);
    } finally {
      resumeFight = null;
      runningScript = null;
    }
    if (!finished) refreshHotspots();
  }

  /** The very start: the Knight is flat on the beach, and Kit lands on him. */
  async function wakeUp() {
    setPose(hero.el, "ko");
    hero.rec.walking = false;
    kit.lift = 900;
    await wait(fromWhite ? 1800 : 900); // a beat of waves and gulls first
    const t0 = performance.now();
    await new Promise((resolve) => {
      const off = stage.onFrame(() => {
        const k = Math.min(1, (performance.now() - t0) / 700);
        kit.lift = 900 * (1 - k * k) + 120 * k * k;
        if (k >= 1) {
          off();
          resolve();
        }
      });
    });
    play("sfx_hit");
    api.shake(10, 300);
    await wait(600);
    setPose(hero.el, "idle");
    kit.lift = 150;
    w.flags.woke = true;
    w.toNext = 700; // the first ambush comes soon, so he meets one early
    saveWorld();
    await api.say("wake");
    dialogue.hide();
    tip("Click the ground to walk, or use the arrow keys. Click on things to look at them, talk, or pick them up.");
  }

  return done.promise;
}
