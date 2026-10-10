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
import { createDialogue } from "./dialogue.js";
import { iconLabel, uiIcon } from "./icons.js";
import { askPuzzle } from "./ask.js";
import { runBattle } from "./battle.js";
import { sfx, music, ambience, song, setMusicMuted, applyVolumes } from "./audio.js";
import { speak, stopSpeaking, preloadLines } from "../ai/voice.js";
import { SCENES, ITEMS, ENCOUNTER_GRACE, POTIONS, MAP } from "../world/data.js";
import { CONVOS, SCRIPTS, USES, EXITS, ARRIVE, VISIBLE, SPARKLE, PAINTED } from "../world/story.js";
import { paintedReady, paintedLayout, activeStates } from "../world/painted.js";
import { PUZZLES } from "../world/puzzles.js";
import { freshWorld, hasItem, giveItem, takeItem, addShard, joinParty, wildEncounter, encounterOptions, walkFor, grace, stepToward, clampTo, freePoint, findPath, inside, checkpoint, heroState, battleStart, afterBattle, rest, partyHealth, reachable, routeTo, placeOf, trailOpen, SHARDS } from "../world/state.js";
import { TRAINING, CLASSES } from "../battle/data.js";
import { getSave, update } from "../store/save.js";

const K = LAYOUT.explore.spriteScale; // people and things are drawn a little smaller than in battle
const WALK_SPEED = 300; // stage px per second at the reference depth
const REACH = 150; // how close he must stand to use something with E
const HERO_SIZE = LAYOUT.sizes.hero;
const KIT_SIZE = [96, 96];
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

/** Fill in anything an older save is missing. */
function ensureWorld() {
  update((s) => {
    const fresh = freshWorld();
    s.world = { ...fresh, ...(s.world || {}) };
    s.world.flags = { ...(s.world.flags || {}) };
    s.world.monkeys = { ...(s.world.monkeys || {}) };
    s.world.heroes = { ...(s.world.heroes || {}) };
    s.world.lessons = { ...(s.world.lessons || {}) };
    if (!SCENES[s.world.scene]) s.world.scene = fresh.scene;
    // a save from before the temple hall, the pulley and the grotto (version 1): keep what he'd already done
    const wd = s.world;
    if ((wd.version || 1) < 2) {
      if (wd.party.includes("spellwright")) Object.assign(wd.flags, { doorOpen: true, doorSeen: true, seenHall: true });
      if (wd.party.includes("gunner") && !wd.items.includes("pulley")) wd.items.push("pulley");
      if (wd.party.includes("titancaller")) Object.assign(wd.flags, { zipDone: true, seenGrotto: true });
      if (wd.started) for (const c of wd.party) wd.lessons[c] = true; // they've met already
      wd.version = 2;
    }
  });
}

/** The point `back` pixels behind the newest end of a trail of points. */
function trailPointFrom(trail, back) {
  let need = back;
  for (let i = trail.length - 1; i > 0; i--) {
    const [x1, y1] = trail[i];
    const [x0, y0] = trail[i - 1];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg >= need) {
      const t = need / seg;
      return [x1 + (x0 - x1) * t, y1 + (y0 - y1) * t];
    }
    need -= seg;
  }
  return trail[0];
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
  if (jump && SCENES[jump]) {
    update((s) => {
      Object.assign(s.world, { started: true, scene: jump, pos: [...SCENES[jump].start], onMap: false });
      s.world.flags.woke = true;
    });
  }
  if (!world().started) {
    await prologue(app);
    update((s) => (s.world.started = true));
  }
  for (;;) {
    const r = world().onMap ? await runMap(app, { rng }) : await runScene(app, { mastery, rng });
    if (r === "quit") {
      stopSpeaking();
      music.stop?.(0.8);
      ambience.stop?.();
      return;
    }
  }
}

// ---------------------------------------------------------------- the island map

// The map painting (art wave 04, "map_driftwood") is 1536 x 1024, scaled to
// cover the 1280 x 720 stage: the strips above and below are cut off.
const MAP_W = 1536;
const MAP_H = 1024;
const MAP_S = 1280 / MAP_W;
const MAP_DY = (720 - MAP_H * MAP_S) / 2;
const onStage = ([x, y]) => [x * MAP_S, y * MAP_S + MAP_DY];

/** Where things are on the map: the painting's own numbers when it has them, else ours. */
function mapPlaces() {
  const art = assetInfo("map_driftwood");
  return Object.fromEntries(Object.entries(MAP.places).map(([id, p]) => [id, { ...p, at: art?.places?.[id] || p.at }]));
}
function trailPoints(t, places) {
  const art = assetInfo("map_driftwood")?.trails;
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
  const places = mapPlaces();
  const here = placeOf(w.scene);
  const open = reachable(w, w.scene);
  const screen = h("div.screen.map-screen");
  const art = assetUrl("map_driftwood");
  const backdrop = h("div.map-art");
  if (art) backdrop.style.backgroundImage = `url("${art}")`;
  else backdrop.innerHTML = standInMap(places);
  const trails = h("div.map-trails");
  const svgParts = MAP.trails
    .map((t) => {
      const pts = trailPoints(t, places).map(onStage);
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

  for (const [id, p] of Object.entries(places)) {
    const [x, y] = onStage(p.at);
    const can = !p.teaser && open.has(id);
    const btn = h(`button.map-place${p.teaser ? ".teaser" : can ? ".open" : ".locked"}${id === here ? ".here" : ""}`, { style: { left: `${x}px`, top: `${y}px` }, title: p.name }, h("span.map-x", {}, "✕"), h("span.map-name", {}, p.teaser ? `${p.name}?` : p.name));
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

  async function pick(id) {
    if (busy) return;
    const p = places[id];
    sfx.select();
    if (p.teaser) {
      busy = true;
      await say(p.teaser);
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
      let pts = trailPoints(t, places);
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

// The picture behind each prologue line: the first of each list that has art.
// story_ram (art wave 05) is the galleon ramming the Albatross.
const PROLOGUE_CARDS = [["key_art"], ["key_art"], ["story_albatross"], ["story_albatross"], ["story_galleon"], ["story_ram", "story_galleon"], ["story_crash"]];

async function prologue(app) {
  const img = h("div.story-art");
  const textEl = h("div.story-text");
  const nameEl = h("div.story-name");
  const skip = h("div.story-skip", {}, "Click or Enter: next · Esc: skip");
  const screen = h("div.screen.story", {}, img, h("div.story-box", {}, nameEl, textEl), skip);
  app.replaceChildren(screen);
  music.play("music_title");
  let next = deferred();
  let skipped = false;
  const advance = () => next.resolve();
  screen.addEventListener("click", advance);
  const off = onKeys((e) => {
    if (e.key === "Escape") {
      skipped = true;
      advance();
    } else if (e.key === "Enter" || e.key === " ") advance();
  });
  const lines = CONVOS.prologue;
  preloadLines(lines.map((l) => ({ style: voiceOf(l.who), text: l.text })));
  for (let i = 0; i < lines.length && !skipped; i++) {
    const { who, text } = lines[i];
    const art = assetUrl(firstArt([...(PROLOGUE_CARDS[i] || []), "story_albatross", "key_art"]));
    if (art && img.dataset.src !== art) {
      img.dataset.src = art;
      img.style.backgroundImage = `url("${art}")`;
      img.animate([{ opacity: 0, transform: "scale(1.06)" }, { opacity: 1, transform: "scale(1)" }], { duration: 900, easing: "ease-out", fill: "forwards" });
    }
    nameEl.textContent = who === "jumble" ? "Captain Jumble" : "";
    screen.classList.toggle("ghost", who === "jumble");
    textEl.textContent = text;
    textEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
    stopSpeaking();
    speak(text, who);
    if (who === "jumble") music.play("music_jumble");
    else if (lines[i - 1]?.who === "jumble") music.play("music_title");
    if (i === lines.length - 1) {
      play("sfx_quake");
      screen.animate([{ transform: "translate(0,0)" }, { transform: "translate(-12px,6px)" }, { transform: "translate(10px,-8px)" }, { transform: "translate(0,0)" }], { duration: 500 });
    }
    next = deferred();
    await next.promise;
    sfx.select();
  }
  off();
  stopSpeaking();
  await screen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }).finished;
}

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
  screen.append(field, placeName, shardsEl, menuBtn, bag, partyHud, label, tipEl, cursorItem, fade);
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
  fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
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
  const visibleNow = (hot) => (VISIBLE[`${sceneId}.${hot.id}`] ? VISIBLE[`${sceneId}.${hot.id}`](w) : true);
  /** A hotspot as it is in this scene right now (moved onto the painting, if there is one). */
  const placed = (hot) => (layout ? layout.place(hot, w) : hot);
  const hotOf = (id) => byHot.get(id)?.hot || placed(scene.hotspots.find((x) => x.id === id));
  let blocks = []; // things in the way (painted scenes): see refreshHotspots

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
      const field = assetInfo(hot.sprite)?.field?.src;
      el = makeSprite({ id: hot.sprite, side: CLASSES[hot.sprite] ? "hero" : "npc", x: 0, y: 0, size: hot.size, prefer: field ? "field" : "battle" });
      el.classList.add("explore-sprite");
      e = { kind: "npc", hot, el, x: hot.x, y: hot.y, size: hot.size, lift: hot.liftPx != null ? hot.liftPx / (stage.scaleAt(hot.y) * SK) : hot.lift || 0 };
      e.rec = stage.live(el, profileFor(hot.sprite));
      // which way the sheet faces: exploring sheets face right, battle sheets face left
      e.sheetFaces = field ? assetInfo(hot.sprite).field.facing || "right" : CLASSES[hot.sprite] ? "left" : "right";
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
    }
    if (layout) {
      blocks = layout.blocks(scene.hotspots.filter((x) => byHot.has(x.id)).map((x) => x.id));
      paintStates();
    }
    for (const e of ents) {
      if (!e.hot) continue;
      const sp = SPARKLE[`${sceneId}.${e.hot.id}`];
      const on = Boolean(sp && sp(w));
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
  let busy = false; // a script, puzzle, dialogue or fight is running
  let held = null; // item picked from the bag to use on something
  let calmUntil = 0; // the key that closed a conversation shouldn't also start the next thing
  let quitting = false;
  let edgeCooldown = 0;
  let saveTimer = 0;
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
      if (!busy && !CALM && encounterOptions(sceneId, w).length && walkFor(w, dist / Math.max(0.5, s), rng)) ambush();
      if (!busy) checkEdges(vx);
    }
    // followers walk along his trail
    party.slice(1).forEach((m, i) => {
      const want = trailPoint(GAP * (i + 1));
      const fx = want[0] - m.x;
      const fy = want[1] - m.y;
      const d = Math.hypot(fx, fy);
      const fstep = Math.min(d, WALK_SPEED * 1.15 * Math.max(0.55, stage.scaleAt(m.y)) * pace * dt);
      if (d > 1) {
        m.x += (fx / d) * fstep;
        m.y += (fy / d) * fstep;
        // and never into a tide pool or through the chest: out to the nearest dry spot
        if (blocks.length) [m.x, m.y] = freePoint([m.x, m.y], scene.walk, blocks);
      }
      walkAnim(m, fx, d > 2 ? fstep : 0, dt);
    });
    // Kit floats beside him, a little behind
    const kx = hero.x - 95 * (hero.facing || -1) * stage.scaleAt(hero.y) * big;
    const ky = hero.y - 10;
    const kk = 1 - Math.exp(-dt * 2.5);
    kit.x += (kx - kit.x) * kk;
    kit.y += (ky - kit.y) * kk;
    if (Math.abs(kx - kit.x) > 2) kit.rec.flip = kx > kit.x;
    // the camera follows him (the floor slides at his depth's speed, so divide by it to keep him centered)
    stage.camera.follow((hero.x - 640) / stage.depthFactor(hero.y), 0);
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

  const trailPoint = (back) => trailPointFrom(trail, back);

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
    const walking = dist > 0.05;
    if (Math.abs(dx) > 0.3) m.facing = dx > 0 ? 1 : -1;
    if (m.walkArt) {
      const body = m.el.querySelector(".body");
      const want = walking ? m.walkArt : m.standArt;
      if (want && body.firstElementChild !== want) body.replaceChildren(want, ...[...body.children].filter((c) => c.classList.contains("living-canvas")));
      if (walking) {
        m.walkT += (dist / (Math.max(0.5, stage.scaleAt(m.y)) * big)) * 0.034; // about 10 frames a second at walking speed
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
  renderBag();
  renderShards();
  renderParty();

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
      } else await SCRIPTS[`${sceneId}.${hot.id}`]?.(api);
    } catch (err) {
      console.error(err);
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
    if (!ok) {
      edgeCooldown = 1.2;
      dialogue.hide();
      // step back from the edge so he isn't standing in the doorway
      const back = hot.edge === "left" ? 70 : hot.edge === "right" ? -70 : 0;
      if (back) goTo([hero.x + back, hero.y]);
      return;
    }
    play("sfx_step_sand");
    w.scene = hot.exit.to;
    w.pos = hot.exit.at;
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
    const bang = h("div.ambush-bang", {}, "!");
    stage.world.append(bang);
    Object.assign(bang.style, { left: `${stage.parallaxLeft(hero.x, hero.y)}px`, top: `${hero.y - HERO_SIZE[1] * scaleOf(hero.y) - 30}px`, zIndex: "3000" });
    bang.animate([{ transform: "translate(-50%, 0) scale(0.2)", opacity: 0 }, { transform: "translate(-50%, -14px) scale(1.25)", opacity: 1, offset: 0.4 }, { transform: "translate(-50%, -10px) scale(1)", opacity: 1 }], { duration: 420, fill: "forwards" });
    play("sfx_encounter");
    await wait(650);
    bang.remove();
    const r = await battle({ ...enc, intro: CONVOS[enc.introLine]?.[0]?.text || "" });
    if (!r.quit && !finished) busy = false;
  }

  async function battle(enc) {
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
    const fight = { ...enc, background, start: enc.start || battleStart(w), potions: enc.potions ?? w.potions ?? POTIONS.start };
    if (fight.odLesson) {
      w.lessons[fight.odLesson] = true; // shown once, whether or not he uses it
      saveWorld();
    }
    const res = await runBattle(app, fight, { mastery, rng });
    if (res.quit) {
      quitting = true;
      teardown();
      finish("quit");
      return res;
    }
    afterBattle(w, res);
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
    const glimmer = res.stats.right * 10 + res.stats.captures.length * 25;
    update((s) => {
      s.progress.shards += glimmer;
      if (res.won) s.progress.battlesWon += 1;
    });
    fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
    if (res.won) toast(glimmer > 0 ? `Victory! +${glimmer} glimmer` : "Victory!");
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
    async say(id) {
      const lines = CONVOS[id] || [];
      conversing = true;
      let farSong = false;
      preloadLines(lines.map((l) => ({ style: voiceOf(l.who), text: l.text })));
      // Captain Jumble brings his own theme; whatever was playing comes back after him
      const back = lines.some((l) => l.who === "jumble") ? music.current : null;
      try {
        for (const line of lines) {
          if (finished) return;
          if (back) music.play(line.who === "jumble" ? "music_jumble" : back);
          talking(line.who, line.mood);
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
      if (back) music.play(back);
    },
    line: (who, mood, text) => dialogue.say({ who, mood, text }),
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
      const q = PUZZLES[kind]({ mastery, rng, ...opts, recent: s.log.slice(-12).map((x) => x.answer), missed: s.collection.missedWords, schoolWords: s.settings.schoolWords });
      if (DEBUG) window.__puzzle = q;
      const r = await askPuzzle(screen, q, { mastery, rng });
      if (r === "back") return null;
      return r === "right" || r === "retry";
    },
    battle: (enc) => battle({ ...enc, intro: enc.intro || TRAINING.find((t) => t.id === "t4")?.intro || "" }),
    sfx: (id) => play(id),
    wait: (ms) => wait(ms),
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
  };

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
  async function ending() {
    const veil = h("div.ending-veil");
    const ring = h("div.ending-shards", {}, ...SHARDS.map(() => h("div.ending-shard", {}, shardIcon())));
    screen.append(veil, ring);
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
    music.play("music_journey"); // the sound pack's heroic theme, for the chapter's last moments
    play("sfx_summon_rise");
    ring.animate([{ transform: "translate(-50%,-50%) rotate(0deg) scale(1.6)", opacity: 0 }, { transform: "translate(-50%,-50%) rotate(360deg) scale(1)", opacity: 1 }], { duration: 2200, easing: "ease-out", fill: "forwards" });
    await wait(2300);
    ring.classList.add("fused");
    api.flash("#dffcff");
    await api.say("ending");
    dialogue.hide();
    w.finished = true;
    saveWorld();
    const endArt = assetUrl("story_ending");
    if (endArt) {
      const art = h("div.ending-art", { style: { backgroundImage: `url("${endArt}")` } });
      veil.append(art);
      art.animate([{ opacity: 0, transform: "scale(1.05)" }, { opacity: 1, transform: "scale(1)" }], { duration: 1600, fill: "forwards" });
    }
    const card = h(
      "div.window.tbc",
      {},
      h("div.tbc-small", {}, "Chapter 1 complete"),
      h("h2", {}, "To be continued…"),
      h("div.tbc-next", {}, "Next: Driftwood Harbor"),
      h("p", {}, "Fiends still roam Driftwood Isle, so keep exploring and practicing. And Pockets is still out there."),
      h("button.btn.gold", {}, "Keep exploring (Enter)"),
    );
    screen.append(card);
    const d = deferred();
    card.querySelector("button").addEventListener("click", () => d.resolve());
    const off = onKeys((e) => e.key === "Enter" && d.resolve());
    await d.promise;
    off();
    card.remove();
    ring.remove();
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).finished;
    veil.remove();
    playSceneAudio();
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
    const win = h("div.window.pause", {}, h("h2", {}, "Paused"), h("p.pause-where", {}, `${scene.name} · crystal shards ${w.shards.length} of 4`), h("div.pause-buttons", {}, resume, soundBtn, voiceBtn, quit));
    const dim = h("div.dimmer", { style: { zIndex: 92 } });
    screen.append(dim, win);
    sfx.select();
    const off = onKeys((e) => e.key === "Escape" && d.resolve("resume"));
    const pick = await d.promise;
    off();
    win.remove();
    dim.remove();
    sfx.select();
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
    if (sceneId === "cove" && !w.flags.woke) await wakeUp();
    else {
      await wait(500);
      await ARRIVE[sceneId]?.(api);
    }
    dialogue.hide();
    if (!finished) busy = false;
  })();

  /** The very start: the Knight is flat on the beach, and Kit lands on him. */
  async function wakeUp() {
    setPose(hero.el, "ko");
    hero.rec.walking = false;
    kit.lift = 900;
    await wait(900);
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
