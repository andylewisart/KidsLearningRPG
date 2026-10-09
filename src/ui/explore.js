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
import { makeSprite, setPose, assetInfo, assetUrl, artFor, setSheetFrame, preloadSheet } from "./sprites.js";
import { propArt, itemIcon, shardIcon, isPainted } from "./props.js";
import { createDialogue } from "./dialogue.js";
import { iconLabel, uiIcon } from "./icons.js";
import { askPuzzle } from "./ask.js";
import { runBattle } from "./battle.js";
import { sfx, music, ambience, setMusicMuted, applyVolumes } from "./audio.js";
import { speak, stopSpeaking } from "../ai/voice.js";
import { SCENES, ITEMS, ENCOUNTER_GRACE } from "../world/data.js";
import { CONVOS, SCRIPTS, USES, EXITS, ARRIVE, VISIBLE, SPARKLE } from "../world/story.js";
import { PUZZLES } from "../world/puzzles.js";
import { freshWorld, hasItem, giveItem, takeItem, addShard, joinParty, wildEncounter, encounterOptions, walkFor, grace, stepToward, clampTo, inside, checkpoint, SHARDS } from "../world/state.js";
import { TRAINING, CLASSES } from "../battle/data.js";
import { getSave, update } from "../store/save.js";

const K = 0.85; // people and things are drawn a little smaller than in battle
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

const world = () => getSave().world;
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
    if (!SCENES[s.world.scene]) s.world.scene = fresh.scene;
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
  // opening; &at=lair starts as if he had played up to there (state.js, checkpoint)
  const jump = DEBUG && PARAMS.get("scene");
  if (jump && SCENES[jump]) {
    update((s) => {
      Object.assign(s.world, { started: true, scene: jump, pos: [...SCENES[jump].start] });
      s.world.flags.woke = true;
    });
  }
  const at = DEBUG && checkpoint(PARAMS.get("at"));
  if (at) update((s) => (s.world = at));
  if (!world().started) {
    await prologue(app);
    update((s) => (s.world.started = true));
  }
  for (;;) {
    const r = await runScene(app, { mastery, rng });
    if (r === "quit") {
      stopSpeaking();
      music.stop?.(0.8);
      ambience.stop?.();
      return;
    }
  }
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

const PROLOGUE_CARDS = ["key_art", "key_art", "story_albatross", "story_albatross", "story_galleon", "story_crash"];

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
  for (let i = 0; i < lines.length && !skipped; i++) {
    const { who, text } = lines[i];
    const art = assetUrl(PROLOGUE_CARDS[i]) || assetUrl(firstArt(["story_albatross", "key_art"]));
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
  screen.append(field, placeName, shardsEl, menuBtn, bag, label, tipEl, cursorItem, fade);
  app.replaceChildren(screen);
  const stage = createStage(field, { background: firstArt(scene.backgrounds), mode: "explore" });
  const dialogue = createDialogue(screen);
  playSceneAudio();
  fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  placeName.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 300, fill: "backwards" });

  function playSceneAudio() {
    music.play(scene.music);
    if (scene.ambience) ambience.play(scene.ambience);
  }

  // ------------------------------------------------------------ the people and things
  const ents = [];
  const byHot = new Map();
  const visibleNow = (hot) => (VISIBLE[`${sceneId}.${hot.id}`] ? VISIBLE[`${sceneId}.${hot.id}`](w) : true);

  function propState(hot) {
    const key = `${sceneId}.${hot.id}`;
    if (key === "cove.chest") return { open: w.shards.includes("cove") };
    if (key === "cove.gate") return { open: Boolean(w.flags.gateOpen) };
    if (key === "cove.pool") return { fish: !w.flags.fish };
    if (key === "cove.sign") return { fixed: Boolean(w.flags.signFixed) };
    if (key === "temple.cage") return { bars: w.flags.cageBars || 0 };
    if (key === "canyon.shrine") return { awake: w.party.includes("titancaller") };
    return {};
  }

  function makeHotspot(hot) {
    let el;
    let e;
    if (hot.area) {
      el = h("div.hot-area");
      e = { kind: "area", hot, el, x: hot.x, y: hot.y };
    } else if (hot.sprite) {
      const field = hot.sprite === "monkey" && assetInfo("monkey")?.field?.src;
      el = makeSprite({ id: hot.sprite, side: CLASSES[hot.sprite] ? "hero" : "npc", x: 0, y: 0, size: hot.size, prefer: field ? "field" : "battle" });
      el.classList.add("explore-sprite");
      e = { kind: "npc", hot, el, x: hot.x, y: hot.y, size: hot.size, lift: hot.lift || 0 };
      e.rec = stage.live(el, profileFor(hot.sprite));
      // Pockets clutches the stolen power cell until the trade
      if (field && sceneId === "canyon" && !w.flags.traded) setPose(el, "hold");
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

  function refreshHotspots() {
    for (const hot of scene.hotspots) {
      const show = visibleNow(hot);
      const e = byHot.get(hot.id);
      if (show && !e) makeHotspot(hot);
      else if (!show && e) removeEnt(e);
      else if (e?.kind === "prop") renderProp(e);
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
    e.arrow?.remove();
    e.sparkle?.remove();
    ents.splice(ents.indexOf(e), 1);
    if (e.hot) byHot.delete(e.hot.id);
  }

  // the party: the Knight leads, the others follow his trail, Kit floats nearby
  const start = w.pos && inside(w.pos, scene.walk) ? w.pos : clampTo(scene.start, scene.walk);
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
  for (let d = FOLLOW_GAP * 4; d >= 0; d -= 6) trail.push(clampTo([start[0] + d, start[1]], scene.walk));
  for (const cls of w.party) addMember(cls, party.length ? trailPointFrom(trail, FOLLOW_GAP * party.length) : start);
  const hero = party[0];
  const kitEl = makeSprite({ id: "droid", side: "npc", x: 0, y: 0, size: KIT_SIZE });
  kitEl.classList.add("explore-sprite", "kit-sprite");
  stage.world.append(kitEl);
  const kit = { kind: "kit", el: kitEl, x: hero.x - 90, y: hero.y - 8, size: KIT_SIZE, lift: 150 };
  kit.rec = stage.live(kitEl, "droid");
  ents.push(kit);

  for (const hot of scene.hotspots) if (visibleNow(hot)) makeHotspot(hot);
  refreshHotspots();
  stage.camera.snap(hero.x - 640);
  const badgeEl = h("div.e-badge", { style: { display: "none" } }, "E");
  stage.world.append(badgeEl);
  const badge = { hot: null };

  // ------------------------------------------------------------ placing everything each frame
  const scaleOf = (y) => stage.scaleAt(y) * K;
  stage.onLayout(() => {
    for (const e of ents) {
      const s = scaleOf(e.y);
      if (e.kind === "area") {
        const [x1, y1, x2, y2] = e.hot.area;
        const dx = stage.parallaxLeft(0, e.y);
        Object.assign(e.el.style, { left: `${x1 + dx}px`, top: `${y1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` });
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
    const step = WALK_SPEED * Math.max(0.55, s) * dt;
    const before = [hero.x, hero.y];
    if (vx || vy) {
      target = null;
      pending = null;
      const len = Math.hypot(vx, vy);
      const r = stepToward([hero.x, hero.y], [hero.x + (vx / len) * 400, hero.y + (vy / len) * 260], step, scene.walk);
      [hero.x, hero.y] = r.pos;
    } else if (target) {
      const r = stepToward([hero.x, hero.y], target, step, scene.walk);
      [hero.x, hero.y] = r.pos;
      if (r.arrived) {
        target = null;
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
      const want = trailPoint(FOLLOW_GAP * (i + 1));
      const fx = want[0] - m.x;
      const fy = want[1] - m.y;
      const d = Math.hypot(fx, fy);
      const fstep = Math.min(d, (WALK_SPEED * 1.15 * Math.max(0.55, stage.scaleAt(m.y)) * dt));
      if (d > 1) {
        m.x += (fx / d) * fstep;
        m.y += (fy / d) * fstep;
      }
      walkAnim(m, fx, d > 2 ? fstep : 0, dt);
    });
    // Kit floats beside him, a little behind
    const kx = hero.x - 95 * (hero.facing || -1) * stage.scaleAt(hero.y);
    const ky = hero.y - 10;
    const kk = 1 - Math.exp(-dt * 2.5);
    kit.x += (kx - kit.x) * kk;
    kit.y += (ky - kit.y) * kk;
    if (Math.abs(kx - kit.x) > 2) kit.rec.flip = kx > kit.x;
    // the camera follows him
    stage.camera.follow(hero.x - 640, 0);
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

  /** Walking: face the way he's going, and step (a painted walk cycle, or a bob without one). */
  function walkAnim(m, dx, dist, dt) {
    const walking = dist > 0.05;
    if (Math.abs(dx) > 0.3) m.facing = dx > 0 ? 1 : -1;
    if (m.walkArt) {
      const body = m.el.querySelector(".body");
      const want = walking ? m.walkArt : m.standArt;
      if (want && body.firstElementChild !== want) body.replaceChildren(want, ...[...body.children].filter((c) => c.classList.contains("living-canvas")));
      if (walking) {
        m.walkT += (dist / Math.max(0.5, stage.scaleAt(m.y))) * 0.034; // about 10 frames a second at walking speed
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
    if (walking) m.rec.walkPhase += (dist / Math.max(0.5, stage.scaleAt(m.y))) * 0.024;
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
    return clampTo([hot.x + dx, hot.y + dy], scene.walk);
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
      const hot = scene.hotspots.find((x) => x.id === hotEl.dataset.hot);
      if (hot) return clickHot(hot);
    }
    if (held) setHeld(null);
    const [sx, sy] = stagePoint(ev);
    const p = clampTo(stage.toFloor(sx, sy), scene.walk);
    target = p;
    pending = null;
    ripple(p);
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
    const hot = hotEl && scene.hotspots.find((x) => x.id === hotEl.dataset.hot);
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
    target = approachOf(hot);
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
  renderBag();
  renderShards();

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
      if (hot.exit) await tryExit(hot);
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

  async function tryExit(hot) {
    const guard = EXITS[`${sceneId}.${hot.id}`];
    const ok = guard ? await guard(api) : true;
    if (!ok) {
      edgeCooldown = 1.2;
      dialogue.hide();
      // step back from the edge so he isn't standing in the doorway
      const back = hot.edge === "left" ? 70 : hot.edge === "right" ? -70 : 0;
      if (back) target = clampTo([hero.x + back, hero.y], scene.walk);
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
    const background = firstArt(scene.battleBackground);
    const res = await runBattle(app, { ...enc, background }, { mastery, rng });
    if (res.quit) {
      quitting = true;
      teardown();
      finish("quit");
      return res;
    }
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
      // Captain Jumble brings his own theme; whatever was playing comes back after him
      const back = lines.some((l) => l.who === "jumble") ? music.current : null;
      for (const line of lines) {
        if (finished) return;
        if (back) music.play(line.who === "jumble" ? "music_jumble" : back);
        talking(line.who);
        await dialogue.say(line);
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

  /** Whoever is talking hops a little, if they're in the scene. */
  function talking(who) {
    const m = party.find((p) => p.cls === who) || ents.find((e) => e.kind === "npc" && e.hot.sprite === who) || (who === "kit" ? kit : null);
    if (!m) return;
    m.el.animate([{ transform: "translate(-50%, -100%)" }, { transform: "translate(-50%, calc(-100% - 8px))" }, { transform: "translate(-50%, -100%)" }], { duration: 260, easing: "ease-out" });
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
