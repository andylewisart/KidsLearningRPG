// The battle screen: draws the fight and runs every turn.
// The rules live in battle/engine.js; the questions in battle/questions.js.

import { h, wait, deferred, onKeys } from "./dom.js";
import LAYOUT from "./stage-layout.json";
import { createFx, floatNumber, banner } from "./fx.js";
import { sfx, setMusicMuted, applyVolumes, music, ambience, AMBIENCE_FOR, audioManifest } from "./audio.js";
import { createBarker } from "./barks.js";
import { makeSprite, spriteCenter, lunge, recoil, dodge, vanish, artFor, setPose, assetUrl, assetInfo, artTop, playEffect, portraitFor, setMood } from "./sprites.js";
import { createStage, profileFor } from "./scene.js";
import { iconLabel, MOVE_ICON } from "./icons.js";
import { ProblemPanel } from "./panels.js";
import { openTutor } from "./tutor.js";
import { CLASSES, FIENDS, FIEND_TYPES, TITANS } from "../battle/data.js";
import * as E from "../battle/engine.js";
import { makeQuestion, overdriveQuestion } from "../battle/questions.js";
import { LADDERS, SKILLS } from "../learn/skills.js";
import { genHeal, diagnoseArith } from "../learn/arith.js";
import { arithHint } from "../learn/hints.js";
import { FRAMES, POWERS, MOVE_NAMES, fillFrame, heuristicJudge } from "../learn/writing.js";
import { judgeEntrance } from "../ai/claude.js";
import { tutorContext } from "../ai/prompts.js";
import { speak, stopSpeaking } from "../ai/voice.js";
import { quip } from "../content/quips.js";
import { KIT_LINES } from "../content/kitLines.js";
import { banterFor } from "../content/barks.js";
import { getSave, update, spendUsage } from "../store/save.js";

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
// Each fiend's attack sound (sampled; silent if the pack doesn't have it).
const FIEND_SFX = { scrap_raptor: "sfx_raptor", volt_jelly: "sfx_jelly", magnet_beetle: "sfx_beetle", ink_slime: "sfx_slime", dominion_drone: "sfx_drone", geode_titan: "sfx_geode_slam" };
// How each fiend's attack lands on a hero: the painted effect (canvas sparks
// if it's missing), the spark color, and how far it lunges.
const FIEND_HIT = {
  scrap_raptor: { fx: "fx_slash", color: "#ffb35c", reach: 130 },
  volt_jelly: { fx: "fx_lightning", color: "#bfe6ff", reach: 40 },
  magnet_beetle: { fx: "fx_slash", color: "#d9b0ff", reach: 160 },
  ink_slime: { fx: null, color: "#8a6bff", reach: 90, drip: true },
  dominion_drone: { fx: "fx_slash", color: "#ff7d7d", reach: 110 },
  geode_titan: { fx: "fx_slash", color: "#ff9de6", reach: 150 },
};

/** One line per fight in the save, for the grown-ups' play report. */
function logBattle(encounter, outcome, stats, ms) {
  update((s) => {
    s.battles.push({
      t: Date.now(),
      id: encounter.id,
      title: encounter.title,
      outcome,
      minutes: Math.round(ms / 6000) / 10,
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

export async function runBattle(app, encounter, { mastery, rng }) {
  const save = getSave();
  const names = save.names;
  const heroName = (cls) => names[cls] || CLASSES[cls].hero || CLASSES[cls].short;
  const b = E.createBattle({ party: encounter.party, reserve: encounter.reserve, fiends: encounter.fiends, rng, scale: encounter.scale, start: encounter.start });
  if (Number.isFinite(encounter.potions)) b.items.potion = encounter.potions;
  // a boss fight: the Titan Caller arrives with her Overdrive full (the Titan answers the call)
  if (encounter.boss) for (const x of b.heroes) if (x.cls === "titancaller") x.od = 100;
  // the first fight after a hero joins shows off their Overdrive: it starts full
  const lesson = encounter.odLesson && b.heroes.find((x) => x.cls === encounter.odLesson && x.active && !x.ko);
  if (lesson) lesson.od = 100;
  b.heroes.forEach((x) => (x.name = heroName(x.cls)));
  if (new URLSearchParams(location.search).has("debug")) window.__battle = b; // for automated playtests
  const stats = { right: 0, total: 0, streak: 0, best: 0, captures: [], defeated: [], hints: 0, tiers: { 1: 0, 2: 0, 3: 0 }, swaps: 0, potions: 0, guards: 0, overdrives: 0, summons: 0 };
  const startedAt = Date.now();

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
  const kitFace = portraitFor("droid", "neutral");
  const kit = h("div.kit", {}, h("div.droid", {}, kitFace), kitBubble);
  screen.append(field, order, title, command, party, kit);
  app.replaceChildren(screen);
  music.play(encounter.boss ? "music_boss" : "music_battle");
  if (AMBIENCE_FOR[encounter.background]) ambience.play(AMBIENCE_FOR[encounter.background]);
  else ambience.stop();

  const sprites = {};
  for (const hero of b.heroes) {
    const tag = h("div.tag", {}, hero.name);
    sprites[hero.key] = makeSprite({ id: hero.cls, side: "hero", x: 0, y: 0, size: HERO_SIZE, label: tag });
    layer.append(sprites[hero.key]);
    placeTag(sprites[hero.key], tag, 26);
  }
  const fiendSlots = FIEND_SLOTS[Math.min(3, b.fiends.length)];
  b.fiends.forEach((f, i) => {
    const [x, y] = fiendSlots[i];
    const size = f.boss ? BOSS_SIZE : FIEND_SIZE;
    const tag = h("div.tag", {}, h("div", {}, f.name), h("div.mini-hp", {}, h("i", { style: { width: "100%" } })), f.boss ? h("div.bars") : null);
    tag.style.top = f.boss ? "-40px" : "-34px";
    const el = makeSprite({ id: f.id, side: "fiend", x, y, size, label: tag });
    sprites[f.uid] = el;
    layer.append(el);
    placeTag(el, tag, f.boss ? 44 : 38);
  });

  for (const x of b.heroes) stage.live(sprites[x.key], "hero");
  for (const f of b.fiends) stage.live(sprites[f.uid], profileFor(f.id));

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
      const x = b.heroes.find((y) => y.cls === cls && y.active);
      return x ? sprites[x.key] : null;
    },
    blocked: () => Boolean(activePanel) || Boolean(screen.querySelector(".window.tiers, .window.pause, .titan-rise")),
  });
  const activeHeroes = () => b.heroes.filter((x) => x.active && !x.ko);
  /** Someone on the field other than `notKey` (for cheering him on). */
  const otherHero = (notKey) => {
    const list = activeHeroes().filter((x) => x.key !== notKey);
    return list.length ? rng.pick(list) : null;
  };
  const lowWarned = new Set();
  let chargeWarned = false; // Kit explains the boss's charge-up once, then keeps it short
  layoutHeroes();
  refresh();
  requestAnimationFrame(() => field.classList.add("ready")); // from now on, swaps slide

  function layoutHeroes() {
    let i = 0;
    for (const hr of b.heroes) {
      const el = sprites[hr.key];
      if (hr.active) {
        const [x, y] = HERO_SLOTS[i++];
        Object.assign(el.style, { left: `${x}px`, top: `${y}px`, zIndex: 10 + i });
        el.classList.remove("benched");
      } else {
        Object.assign(el.style, { left: `${BENCH[0]}px`, top: `${BENCH[1]}px`, zIndex: 5 });
        el.classList.add("benched");
      }
      el.classList.toggle("ko", hr.ko);
    }
  }

  function refresh() {
    // turn order
    const next = E.preview(b, 8);
    order.replaceChildren(
      h("span.label", {}, "TURN ORDER"),
      ...next.map((key, i) => h(`div.chip${fiend(key) ? ".fiend" : ""}${i === 0 && b.turn ? ".now" : ""}`, {}, chipFace(key), h("span", {}, unitName(key)))),
    );
    // party window
    const rows = b.heroes
      .filter((x) => x.active)
      .map((x) => {
        const low = x.hp / x.maxHp < 0.3;
        return h(
          `div.party-row${b.turn === x.key ? ".now" : ""}${x.ko ? ".down" : ""}`,
          {},
          h("span.name", {}, x.name),
          h(`div.bar.hp${low ? ".low" : ""}`, {}, h("i", { style: { width: `${(x.hp / x.maxHp) * 100}%` } })),
          h("span.hpnum", {}, `${x.hp}/${x.maxHp}`),
          h("div.od-cell", {}, "OD", h(`div.bar.od${x.od >= 100 ? ".full" : ""}`, {}, h("i", { style: { width: `${x.od}%` } }))),
        );
      });
    const bench = E.reserveHero(b);
    if (bench) rows.push(h(`div.party-row.bench${bench.ko ? ".down" : ""}`, {}, h("span", {}, `${bench.name} (bench)`), h("span", {}, "Swap in on any hero's turn"), h("span.hpnum", {}, `${bench.hp}/${bench.maxHp}`), h("span")));
    party.replaceChildren(...rows);
    // fiend HP bars
    for (const f of b.fiends) {
      const el = sprites[f.uid];
      const bar = el.querySelector(".mini-hp i");
      if (bar) bar.style.width = `${(f.hp / f.maxHp) * 100}%`;
      const bars = el.querySelector(".bars");
      if (bars) bars.textContent = `HP bar ${f.bar} of ${f.bars}`;
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
    if (voice) speak(text, "droid");
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
    const panel = new ProblemPanel(screen, opts);
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
      stats.right += 1;
      stats.streak += 1;
      stats.best = Math.max(stats.best, stats.streak);
    } else stats.streak = 0;
    mastery.record(q.skill, { correct, tier: q.tier || 1, hinted, ms });
    update((s) => {
      s.mastery = mastery.toJSON();
      s.log.push({ t: Date.now(), skill: q.skill, tier: q.tier || 1, correct, hinted, ms: Math.round(ms || 0), mistake: code || null, given: given ?? null, answer: q.answerText });
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
      { id: "move", label: cls.command, icon: MOVE_ICON[hr.cls] },
      { id: "item", label: `🧪 Potion ×${b.items.potion}`, icon: "potion", disabled: b.items.potion <= 0 },
      { id: "swap", label: "🔄 Swap", icon: "swap", disabled: !E.reserveHero(b) || E.reserveHero(b).ko },
      { id: "guard", label: "🛡 Guard", icon: "guard" },
    ];
    // a full Overdrive goes on its own row at the top, picked already
    const od = E.overdriveReady(b, hr.key);
    if (od) items.unshift({ id: "overdrive", label: hr.cls === "titancaller" ? `🐉 Summon ${names.titan || TITANS.titan_starter.name}` : `💥 ${cls.overdrive}`, icon: hr.cls === "titancaller" ? "summon" : "overdrive", cls: hr.cls === "titancaller" ? "summon" : "od" });
    // where each item sits, for the arrow keys: [row, column]
    const cells = items.map((_, i) => (od ? (i === 0 ? [0, 0] : [1 + Math.floor((i - 1) / 2), (i - 1) % 2]) : [Math.floor(i / 2), i % 2]));
    let sel = 0;
    const buttons = items.map((it, i) =>
      h(`button${it.cls ? "." + it.cls : ""}`, { onclick: () => pick(i), disabled: it.disabled, onmouseenter: () => mark(i) }, ...iconLabel(it.icon, it.label)),
    );
    const menuBtn = h("button.menu-btn", { onclick: () => openPause(), title: "Pause (Esc)" }, ...iconLabel("menu", "☰ Menu"));
    command.replaceChildren(h("div.who", {}, h("span", {}, `${hr.name}'s turn`), menuBtn), h(`div.menu${od ? ".has-od" : ""}`, {}, ...buttons));
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
      command.replaceChildren(h("div.who", {}, `${hr.name}'s turn`));
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
    const confirmRow = h("div.pause-confirm", { style: { display: "none" } }, h("p", {}, "Leave this fight? His answers so far are saved. The fight starts fresh next time."), h("div.row", {}, h("button.btn.gold", { onclick: () => done("quit") }, "Leave (Y)"), h("button.btn", { onclick: () => showConfirm(false) }, "Stay (N)")));
    const quitBtn = h("button.btn.ghost", { onclick: () => showConfirm(true) }, "🏠 Quit to title");
    const win = h("div.window.pause", {}, h("h2", {}, "Paused"), h("div.pause-buttons", {}, h("button.btn.gold", { onclick: () => done("resume") }, "▶ Resume (Esc)"), soundBtn, voiceBtn, heroBtn, quitBtn), confirmRow);
    const dim = h("div.dimmer", { style: { zIndex: 92 } });
    screen.append(dim, win);
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
    const dmg = { 1: "Quick hit", 2: "Big hit (×3)", 3: "MASSIVE hit (×8)" };
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
            t === 3 ? h("div.capture", {}, "Finish a fiend with this to capture it!") : null,
          ),
        ),
      ),
      h("div.row", {}, h("span", {}, "Press 1, 2 or 3. Harder hits harder."), h("button.btn.small.ghost", { onclick: () => pick(null) }, "Back (Esc)")),
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

  function chooseFrom(list, prompt) {
    if (list.length === 1) return Promise.resolve(list[0]);
    const d = deferred();
    let sel = 0;
    const keyOf = (u) => u.uid || u.key;
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

  // ------------------------------------------------------------ asking
  /**
   * Ask a question with the full help loop: answer → (miss) dodge → Show me /
   * Ask the droid / Skip → one retry. Returns { outcome: "right"|"retry"|"miss"|"back" }.
   */
  async function ask(hr, q, { dodgeTarget } = {}) {
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
      else speak(hint.text, "droid");
    }
    // Spelling: look, then cover, then spell again.
    if (q.cls === "spellwright") {
      await wait(choice === "ask" ? 0 : 2600);
      panel.clearHint();
    }
    panel.retry(q.knight ? "Your turn again." : "Your turn again. Half damage if you get it now.");
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

  async function showHit(ev, { crit = false } = {}) {
    if (!ev) return;
    const el = sprites[ev.target];
    const c = spriteCenter(el);
    sfx[crit ? "crit" : "hit"]();
    floatNumber(stage.world, c.x, c.y - 20, String(ev.amount), crit ? "crit" : "dmg");
    recoil(el, -18);
    setPose(el, "hurt");
    setTimeout(() => setPose(el, "idle"), 400);
    if (crit) fx.shake(field, 14);
    refresh();
    if (ev.barBroken) {
      sfx.bar();
      fx.shake(field, 20, 500);
      await banner(screen, "HP BAR BROKEN!", "gold");
      const f = fiend(ev.target);
      if (f?.boss && f.bar === f.bars && !ev.ko) {
        el.dataset.idle = "special"; // last bar: it stays enraged
        setPose(el, "idle");
        kitSay(KIT_LINES.lastBar, { ms: 4500, mood: "shocked" });
      }
    }
    if (ev.ko) await defeatFiend(fiend(ev.target), ev.captured);
  }

  async function defeatFiend(f, captured) {
    const el = sprites[f.uid];
    const c = spriteCenter(el);
    stats.defeated.push(f.id);
    update((s) => (s.collection.defeated[f.id] = (s.collection.defeated[f.id] || 0) + 1));
    if (captured) {
      sfx.capture();
      if (!effectOn(f.uid, "fx_capture", { scale: 1.1 })) fx.capture(c.x, c.y, c.x, c.y - 40);
      stats.captures.push(f.id);
      update((s) => (s.collection.captures[f.id] = Math.min(10, (s.collection.captures[f.id] || 0) + 1)));
      await vanish(el);
      el.classList.add("gone");
      await banner(screen, `CAPTURED! ${FIENDS[f.id].name} → Monster Arena`, "good", 1800);
      kitSay(quip("capture", rng), { ms: 3500, mood: "smug" });
    } else {
      sfx.ko();
      if (!effectOn(f.uid, "fx_defeat_motes", { scale: 1.3, up: 0.55 })) fx.motes(c.x, c.y + 40);
      await vanish(el);
      el.classList.add("gone");
    }
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
      target = await chooseFrom(E.livingFiends(b), KIT_LINES.pickTarget);
      if (!target) return "back";
    }
    const s = getSave();
    const q = makeQuestion({
      cls,
      tier,
      skill,
      support: tiers[tier].support,
      target,
      ctx: {
        rng,
        schoolWords: s.settings.schoolWords,
        recentWords: s.log.slice(-12).map((x) => x.answer),
        missedWords: s.collection.missedWords,
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
    if (q.knight) {
      const p = q.problem;
      const ev = p.kind === "left" ? E.setFiendHp(b, target.uid, p.answer, { tier: half ? 0 : tier, heroKey: hr.key }) : E.hit(b, hr.key, target.uid, p.damage, { tier: half ? 0 : tier });
      await showHit(ev, { crit });
    } else {
      for (const t of targets) {
        const ev = E.hit(b, hr.key, t.uid, q.damageTo(t, { half }), { tier: half ? 0 : tier });
        await showHit(ev, { crit });
      }
    }
    if (!half) {
      if (E.reward(b, hr.key, { correct: true, tier })) odFilled(hr);
      // Barks: always on a three-star hit, about a third of the time otherwise,
      // and now and then a teammate cheers him on instead. Kit chimes in when they don't.
      let barked = false;
      if (!hr.ko && (crit || rng.chance(0.33))) {
        barker.say(hr.cls, crit ? "crit" : "attack");
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
    if (target && !target.ko && E.effectiveness(cls, target.type) < 1) matchupHint(target);
    refresh();
    return "done";
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
   * per kind of fiend each fight, so Kit doesn't nag. Against a colossal
   * fiend it's the Titan Caller's summon, and only "summon now" when her
   * Overdrive is actually full.
   */
  const hinted = new Set();
  function matchupHint(target) {
    if (hinted.has(target.type)) return;
    hinted.add(target.type);
    if (target.type !== "colossal") return kitSay(`${FIEND_TYPES[target.type].hint} ${quip("swapHint", rng)}`, { ms: 6000, mood: "smug" });
    const caller = b.heroes.find((x) => x.cls === "titancaller" && !x.ko);
    const line = !caller ? KIT_LINES.colossalNoCaller : !caller.active ? KIT_LINES.colossalBench : caller.od >= 100 ? KIT_LINES.colossalReady : KIT_LINES.colossalCharge;
    kitSay(line, { ms: 7000, mood: "smug" });
  }

  async function doPotion(hr) {
    const target = await chooseFrom(E.livingHeroes(b), KIT_LINES.whoPotion);
    if (!target) return "back";
    const addSkill = mastery.pickTiers(LADDERS.add, rng)[2].skill;
    const p = genHeal(target.hp, target.maxHp, addSkill, rng, LADDERS.add);
    if (!p) {
      kitSay(`${target.name} is already at full health. Potions are for emergencies, not snacks.`, { mood: "smug" });
      return "back";
    }
    const q = {
      cls: "potion",
      tier: 1,
      skill: p.skill,
      panel: { kind: "number", title: "Potion", ask: `${target.name} has ${target.hp} HP. The potion heals ${p.heal}. What's the new HP?`, equation: `${p.a} + ${p.b}` },
      answerText: String(p.answer),
      grade: (v) => ({ correct: Number(v) === p.answer, code: Number(v) === p.answer ? null : diagnoseArith(p, v)?.code }),
      hint: (v) => arithHint(p, v),
      tutor: { prompt: `${target.name} has ${target.hp} HP and the potion heals ${p.heal}. New HP?`, equation: `${p.a} + ${p.b}`, answer: p.answer },
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

  async function doOverdrive(hr) {
    E.spendOverdrive(b, hr.key);
    sfx.overdrive();
    await banner(screen, `OVERDRIVE: ${hr.cls === "titancaller" ? `Summon ${names.titan || TITANS.titan_starter.name}` : CLASSES[hr.cls].overdrive}!`, "gold", 1500);
    if (hr.cls === "titancaller") return doSummon(hr);
    kitSay(KIT_LINES.overdrive, { ms: 5000 });
    const tiers = mastery.pickTiers(LADDERS[CLASSES[hr.cls].track], rng);
    let hits = 0;
    for (let i = 0; i < E.OD_CHAIN && E.livingFiends(b).length; i++) {
      const q = overdriveQuestion(hr.cls, rng.chance(0.6) ? tiers[1].skill : tiers[2].skill, { rng, recentWords: getSave().log.slice(-12).map((x) => x.answer) });
      q.tier = 1;
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
      const t = rng.pick(E.livingFiends(b));
      await attackFx(hr, [t], hr.cls);
      const ev = E.hit(b, hr.key, t.uid, E.odHitDamage(hr.cls, i) * E.effectiveness(hr.cls, t.type), { tier: i >= E.OD_CHAIN - 1 ? 3 : 2 });
      hits += 1;
      await showHit(ev, { crit: i >= E.OD_CHAIN - 1 });
    }
    if (hits) await banner(screen, `${hits}-HIT COMBO!`, "gold", 1500);
    return "done";
  }

  /** The Titan Caller's Overdrive: he writes the Titan's entrance. Backing out gives the Overdrive back. */
  async function doSummon(hr) {
    const titan = TITANS.titan_starter;
    const titanName = names.titan || titan.name;
    const tier = await chooseSummonTier(titanName);
    if (!tier) {
      hr.od = 100;
      return "back";
    }
    const frame = tier === 1 ? rng.pick(FRAMES) : null;
    const panel = openPanel({
      kind: tier === 1 ? "frame" : "text",
      title: `Summon ${titanName} ${"★".repeat(tier)}`,
      ask:
        tier === 1
          ? "Fill in the blanks. Specific words make it hit harder."
          : tier === 2
            ? `Write one sentence: how does ${titanName} enter the battle? Make the reader SEE and HEAR it.`
            : `Write ${titanName}'s entrance in 2 or 3 sentences. Sounds, colors, comparisons, feelings: every detail adds power.`,
      frame,
      titan: titanName,
      minWords: tier === 2 ? 5 : 12,
      placeholder: `${titanName}…`,
      submitLabel: "Summon! (Ctrl+Enter)",
      allowCancel: true,
    });
    const res = await panel.answer();
    if (!res) {
      panel.close();
      hr.od = 100;
      return "back";
    }
    const text = tier === 1 ? fillFrame(frame, titanName, res.value) : res.value;
    panel.foot?.remove(); // no backing out once it's written
    panel.body.replaceChildren(h("div.hint-text", {}, `${names.droid || "Kit"} is reading it…`));
    let judged = null;
    const key = getSave().settings.anthropicKey;
    if (key && spendUsage("judge", 60)) {
      try {
        judged = await judgeEntrance({ key, titanName, tier, text, frame: frame?.text, blanks: tier === 1 ? res.value : undefined });
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
    update((s) => s.collection.entrances.unshift({ t: Date.now(), titan: titanName, text, power: judged.power, tier }));
    await summonCinematic(hr, { text, titan, power, tier });
    setPose(sprites[hr.key], "idle");
    if (judged.tip && judged.power !== "mega") kitSay(`${judged.praise} Next time: ${judged.tip}`, { ms: 9000 });
    else barker.say(hr.cls, "crit", { wait: 3000 });
    refresh();
    return "done";
  }

  /**
   * The summon as a short film. When the sound pack has the summon music, its
   * cues (seconds: rise, hit, fade) set the timing; otherwise a quicker cut.
   *   1. The HUD fades, letterbox bars slide in, the scene darkens to teal and
   *      a summoning circle spins at the caller's feet.
   *   2. Spray bursts along the back of the arena and the Titan rises from
   *      behind it, behind the fighters, breathing, as his sentence appears
   *      word by word and the camera tilts up to take it in.
   *   3. It roars (shockwave, shake), then blasts the fiends with a tidal
   *      torrent on the music's hit, and the damage lands.
   *   4. It sinks back and everything clears.
   * Enter, Space or Esc skips straight to the hit.
   */
  async function summonCinematic(hr, { text, titan, power, tier }) {
    stopSpeaking();
    barker.hush();
    const swell = music.sting("music_summon");
    const cues = (swell && audioManifest().sounds?.music_summon?.cues) || { rise: 0.9, hit: 5.4, fade: 7.8 };
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
    const tint = h("div.summon-tint");
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
    const titanEl = makeSprite({ id: "titan_starter", side: "titan", x: 640, y: sunk, size: [Math.round(TH * 0.72), TH] });
    pit.append(titanEl);
    const mist = h("div.titan-mist", { style: { top: `${edgeY - 90}px` } });
    layer.append(pit, mist);
    stage.live(titanEl, "titan");
    const words = h("div.summon-words.trailer", {}, ...text.split(/\s+/).map((wd) => h("span", {}, `${wd} `)));
    screen.append(words);

    await at(cues.rise);
    clearInterval(rumble);
    const riseMs = Math.max(1400, (cues.hit - cues.rise - 1.6) * 1000);
    const rise = titanEl.animate([{ top: `${sunk}px` }, { top: `${risen}px` }], { duration: riseMs, easing: "cubic-bezier(.25,.8,.3,1)", fill: "forwards" });
    mist.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
    if (!skipped) {
      sfx.play("sfx_splash");
      [460, 640, 820].forEach((x, i) => setTimeout(() => playEffect(stage.world, "fx_splash", x, edgeY - 120, { size: 420 }), i * 160));
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
    sfx.play("sfx_tidal") || sfx.quake();
    const foes = E.livingFiends(b);
    const fx0 = foes.length ? foes.reduce((sum, f) => sum + spriteCenter(sprites[f.uid]).x, 0) / foes.length : 360;
    playEffect(stage.world, "fx_tidal", fx0 + 60, edgeY + 40, { size: 820 });
    for (const f of foes) setTimeout(() => effectOn(f.uid, "fx_splash", { scale: 1.6, up: 0.3 }), 180);
    flash("#ffffff", 0.55, 500);
    fx.shake(field, 30, 800);
    for (const f of foes) {
      const c = spriteCenter(sprites[f.uid]);
      fx.burst(c.x, c.y, { color: "#bffcff", count: 60, speed: 11, size: 5 });
    }
    await wait(250);
    for (const f of E.livingFiends(b)) {
      const amount = titan.atk * SUMMON_MULT * power.mult * TIER_MULT[tier] * (f.type === "colossal" ? 2 : 1);
      await showHit(E.hit(b, hr.key, f.uid, amount, { tier }), { crit: true });
    }

    // 4. it sinks back into the sea
    await (skipped ? wait(400) : at(cues.fade));
    sfx.play("sfx_splash");
    playEffect(stage.world, "fx_splash", 640, edgeY - 110, { size: 480 });
    setPose(titanEl, "idle");
    mist.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1300, fill: "forwards" });
    await titanEl.animate([{ top: `${risen}px` }, { top: `${sunk}px` }], { duration: 1100, easing: "ease-in", fill: "forwards" }).finished;
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

  /** A boss walks in with its splash painting (any key skips). */
  async function bossEntrance() {
    const boss = b.fiends.find((f) => f.boss);
    const url = boss && assetUrl(boss.id, "splash");
    if (!url) return;
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
  async function heroTurn(key) {
    let hr = hero(key);
    for (;;) {
      refresh();
      const cmd = await chooseCommand(hr);
      if (cmd === "quit") return;
      let r = "done";
      if (cmd === "move") r = await doMove(hr);
      else if (cmd === "item") r = await doPotion(hr);
      else if (cmd === "guard") {
        stats.guards += 1;
        E.defend(b, hr.key);
        sfx.guard();
        await banner(screen, `${hr.name} guards`, "", 900);
      } else if (cmd === "swap") {
        const inKey = E.swap(b, hr.key);
        if (inKey) {
          stats.swaps += 1;
          sfx.swap();
          layoutHeroes();
          hr = hero(inKey);
          barker.say(hr.cls, "swapIn");
          await banner(screen, `${hr.name} steps in!`, "good", 900);
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
  function landHit(hitEv, style, { heavy = false, quake = false } = {}) {
    const el = sprites[hitEv.target];
    const victim = hero(hitEv.target);
    const c = spriteCenter(el, { up: quake ? 0.3 : 0.5 });
    const fxId = quake ? "fx_ice" : style.fx;
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
    if (!ev.hits.length) return;
    // taking hits charges Overdrive too: say so when it fills
    setTimeout(() => b.heroes.filter((x) => odBefore.get(x.key) < 100 && x.od >= 100).forEach(odFilled), 1400);
    el.classList.remove("charging");
    let lunged = null;
    if (ev.kind === "special") {
      // It rears up, the ground shakes, and crystals burst up under every hero.
      if (!sfx.play("sfx_geode_roar")) sfx.quake();
      else setTimeout(() => sfx.quake(), 900);
      setPose(el, "special");
      stage.camera.push({ x: (spriteCenter(el).x - 640) * 0.1, y: -12, zoom: 1.08, inMs: 500, holdMs: 1100, outMs: 900 });
      await banner(screen, `${f.name}: ${ev.name}!`, "bad", 1500);
      fx.shake(field, 30, 900);
      flash("#ffc8f0", 0.4, 520);
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
      landHit(hitEv, style, { heavy, quake: ev.kind === "special" });
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
      kitSay(chargeWarned ? KIT_LINES.bossChargingAgain : KIT_LINES.bossCharging, { ms: 7000, mood: "shocked" });
      chargeWarned = true;
    }
    await wait(250);
  }

  // ------------------------------------------------------------ main loop
  if (encounter.boss) await bossEntrance();
  await wait(400);
  kitSay(encounter.intro, { ms: 9000 });
  if (lesson) {
    await wait(5200);
    kitSay(KIT_LINES[`odLesson_${lesson.cls}`], { ms: 9000, mood: "laughing" });
    refresh();
  }
  // Once Kit's done: a bit of banter between two heroes, or one hero's opening line.
  {
    const present = activeHeroes().map((x) => x.cls);
    const exchanges = banterFor(present);
    if (exchanges.length && rng.chance(0.5)) barker.banter(rng.pick(exchanges), { wait: 15000 });
    else if (present.length) barker.say(rng.pick(present), "start", { wait: 15000 });
  }
  await wait(1200);
  while (!b.over && !b.quit) {
    const key = E.nextTurn(b);
    refresh();
    if (hero(key)) await heroTurn(key);
    else await fiendTurnUI(key);
    if (b.quit) break;
    E.endTurn(b);
    layoutHeroes();
    refresh();
  }
  command.replaceChildren();
  logBattle(encounter, b.quit ? "quit" : b.over === "victory" ? "won" : "lost", stats, Date.now() - startedAt);
  if (b.quit) {
    barker.hush();
    stopSpeaking();
    fx.stop();
    return { won: false, quit: true, stats, battle: b, carry: E.carryOver(b), potions: b.items.potion };
  }
  const won = b.over === "victory";
  setTimeout(() => fx.stop(), 2500); // let the last sparks fade, then shut the canvas down
  barker.hush();
  // The loop gives way to the victory fanfare or the defeat sting.
  if (won) {
    if (!music.sting("music_victory", { stopLoop: true })) sfx.victory();
    b.heroes.filter((x) => x.active && !x.ko).forEach((x) => setPose(sprites[x.key], "victory"));
    const star = activeHeroes().length ? rng.pick(activeHeroes()) : null;
    if (star) await barker.say(star.cls, "victory", { wait: 1500 });
  } else if (!music.sting("music_defeat", { stopLoop: true })) sfx.defeat();
  kitSay(quip(won ? "victory" : "defeat", rng), { ms: 6000, mood: won ? "laughing" : "worried" });
  await wait(1200);
  return { won, stats, battle: b, carry: E.carryOver(b), potions: b.items.potion };
}
