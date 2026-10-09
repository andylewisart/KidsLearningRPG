// The battle screen: draws the fight and runs every turn.
// The rules live in battle/engine.js; the questions in battle/questions.js.

import { h, wait, deferred, onKeys } from "./dom.js";
import { createFx, floatNumber, banner } from "./fx.js";
import { sfx } from "./audio.js";
import { makeSprite, spriteCenter, lunge, recoil, dodge, vanish, artFor, setPose, assetUrl } from "./sprites.js";
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
import { getSave, update, spendUsage } from "../store/save.js";

const HERO_SLOTS = [
  [1010, 318],
  [1085, 412],
  [1010, 506],
];
const BENCH = [1222, 236];
const FIEND_SLOTS = {
  1: [[330, 498]],
  2: [
    [250, 380],
    [430, 500],
  ],
  3: [
    [210, 350],
    [430, 410],
    [250, 510],
  ],
};
const HERO_SIZE = [118, 177];
const FIEND_SIZE = [210, 210];
const BOSS_SIZE = [400, 400];
const TIER_MULT = { 1: 0.8, 2: 1, 3: 1.3 };
const OD_HIT = { knight: 95, gunner: 85, spellwright: 90 };

export async function runBattle(app, encounter, { mastery, rng }) {
  const save = getSave();
  const names = save.names;
  const heroName = (cls) => names[cls] || CLASSES[cls].short;
  const b = E.createBattle({ party: encounter.party, reserve: encounter.reserve, fiends: encounter.fiends, rng });
  b.heroes.forEach((x) => (x.name = heroName(x.cls)));
  if (new URLSearchParams(location.search).has("debug")) window.__battle = b; // for automated playtests
  const stats = { right: 0, total: 0, streak: 0, best: 0, captures: [], defeated: [], hints: 0 };

  // ------------------------------------------------------------ layout
  const screen = h("div.screen.battle");
  const field = h("div.battlefield");
  const bg = h("div.bg.holo");
  const bgUrl = encounter.background && assetUrl(encounter.background);
  if (bgUrl) {
    bg.classList.remove("holo");
    bg.style.backgroundImage = `url("${bgUrl}")`;
  }
  field.append(bg);
  const layer = h("div", { style: { position: "absolute", inset: "0" } });
  field.append(layer);
  const fx = createFx(field);
  const order = h("div.turn-order");
  const title = h("div.encounter-title", {}, encounter.title);
  const command = h("div.window.command");
  const party = h("div.window.party");
  const kitBubble = h("div.bubble", { style: { display: "none" } });
  const kit = h("div.kit", {}, h("div.droid", {}, artFor("droid")), kitBubble);
  screen.append(field, order, title, command, party, kit);
  app.replaceChildren(screen);

  const sprites = {};
  for (const hero of b.heroes) {
    sprites[hero.key] = makeSprite({ id: hero.cls, side: "hero", x: 0, y: 0, size: HERO_SIZE, label: h("div.tag", {}, hero.name) });
    layer.append(sprites[hero.key]);
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
  });

  // ------------------------------------------------------------ helpers
  const hero = (key) => b.heroes.find((x) => x.key === key);
  const fiend = (uid) => b.fiends.find((x) => x.uid === uid);
  const unitName = (key) => hero(key)?.name || fiend(key)?.name || key;
  layoutHeroes();
  refresh();

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
      ...next.map((key, i) => h(`div.chip${fiend(key) ? ".fiend" : ""}${i === 0 && b.turn ? ".now" : ""}`, {}, unitName(key))),
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
    const tg = b.titanGauge;
    rows.push(
      h(
        "div.titan-gauge",
        {},
        h("span", {}, "TITAN GAUGE"),
        h(`div.bar.titan${tg >= 100 ? ".full" : ""}`, {}, h("i", { style: { width: `${tg}%` } })),
        h("span", {}, tg >= 100 ? "READY!" : `${tg}%`),
      ),
    );
    party.replaceChildren(...rows);
    // fiend HP bars
    for (const f of b.fiends) {
      const el = sprites[f.uid];
      const bar = el.querySelector(".mini-hp i");
      if (bar) bar.style.width = `${(f.hp / f.maxHp) * 100}%`;
      const bars = el.querySelector(".bars");
      if (bars) bars.textContent = `HP bar ${f.bar} of ${f.bars}`;
    }
    for (const x of b.heroes) sprites[x.key].classList.toggle("acting", b.turn === x.key);
    for (const f of b.fiends) sprites[f.uid].classList.toggle("acting", b.turn === f.uid);
  }

  let kitTimer = null;
  let activePanel = null; // while a problem window is open, Kit talks inside it
  function kitSay(text, { voice = true, ms = 5200 } = {}) {
    if (!text) return;
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
  }
  /** Open a problem window (Kit's bubble moves into it). */
  function openPanel(opts) {
    kitHide();
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
      { id: "move", label: cls.command },
      { id: "item", label: `🧪 Potion ×${b.items.potion}`, disabled: b.items.potion <= 0 },
      { id: "swap", label: "🔄 Swap", disabled: !E.reserveHero(b) || E.reserveHero(b).ko },
      { id: "guard", label: "🛡 Guard" },
    ];
    if (E.overdriveReady(b, hr.key)) items.push({ id: "overdrive", label: `💥 ${cls.overdrive}`, cls: "od" });
    if (hr.cls === "titancaller" && E.titanReady(b)) items.push({ id: "summon", label: "🐉 SUMMON TITAN", cls: "summon" });
    let sel = items.findIndex((x) => x.cls) >= 0 ? items.findIndex((x) => x.cls) : 0;
    const buttons = items.map((it, i) =>
      h(`button${it.cls ? "." + it.cls : ""}`, { onclick: () => pick(i), disabled: it.disabled, onmouseenter: () => mark(i) }, it.label),
    );
    command.replaceChildren(h("div.who", {}, `${hr.name}'s turn`), h("div.menu", {}, ...buttons));
    const mark = (i) => {
      sel = i;
      buttons.forEach((bt, j) => bt.classList.toggle("sel", j === sel));
    };
    mark(sel);
    const off = onKeys((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= items.length) return pick(n - 1);
      if (["ArrowDown", "ArrowRight"].includes(e.key)) mark((sel + (e.key === "ArrowDown" ? 2 : 1)) % items.length);
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) mark((sel - (e.key === "ArrowUp" ? 2 : 1) + items.length * 2) % items.length);
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
    if (q.tier === 3) kitSay(quip("brave", rng), { voice: false, ms: 2600 });
    if (dodgeTarget && sprites[dodgeTarget.uid]) {
      sfx.miss();
      const c = spriteCenter(sprites[dodgeTarget.uid]);
      floatNumber(screen, c.x, c.y - 30, "MISS", "miss");
      dodge(sprites[dodgeTarget.uid], -50);
    }
    refresh();
    const canAsk = Boolean(save.settings.anthropicKey);
    const choice = await panel.chooseHelp({ droidName: names.droid || "Kit", canAsk });
    if (choice === "skip") {
      panel.close();
      kitSay(`It was ${q.answerText}. We'll get the next one.`, { ms: 4000 });
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
    kitSay(`It was ${q.answerText}. That one's going on my list for later.`, { ms: 4500 });
    return { outcome: "miss" };
  }

  // ------------------------------------------------------------ actions
  async function attackFx(hr, targets, cls) {
    const from = spriteCenter(sprites[hr.key]);
    if (cls === "knight") {
      setPose(sprites[hr.key], "attack");
      await lunge(sprites[hr.key], -90);
      sfx.slash();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        fx.slash(c.x, c.y);
      }
    } else if (cls === "gunner") {
      setPose(sprites[hr.key], "attack");
      lunge(sprites[hr.key], -24, 300);
      sfx.shot();
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        fx.bolts(from.x - 40, from.y, c.x, c.y, { count: 7 });
      }
      await wait(330);
    } else if (cls === "spellwright") {
      setPose(sprites[hr.key], "cast");
      sfx.spell();
      const color = rng.pick(["#c9a2ff", "#7fd8ff", "#ff9d5c", "#9dffea"]);
      for (const t of targets) {
        const c = spriteCenter(sprites[t.uid]);
        fx.spell(c.x, c.y, color);
      }
      await wait(380);
    } else {
      setPose(sprites[hr.key], "cast");
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
    floatNumber(screen, c.x, c.y - 20, String(ev.amount), crit ? "crit" : "dmg");
    recoil(el, -18);
    setPose(el, "hurt");
    setTimeout(() => setPose(el, "idle"), 400);
    if (crit) fx.shake(field, 14);
    refresh();
    if (ev.barBroken) {
      sfx.bar();
      fx.shake(field, 20, 500);
      await banner(screen, "HP BAR BROKEN!", "gold");
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
      fx.capture(c.x, c.y, c.x, c.y - 40);
      stats.captures.push(f.id);
      update((s) => (s.collection.captures[f.id] = Math.min(10, (s.collection.captures[f.id] || 0) + 1)));
      await vanish(el);
      el.classList.add("gone");
      await banner(screen, `CAPTURED! ${FIENDS[f.id].name} → Monster Arena`, "good", 1800);
      kitSay(quip("capture", rng), { ms: 3500 });
    } else {
      sfx.ko();
      fx.motes(c.x, c.y + 40);
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
    const skill = tiers[tier].skill;
    const aoe = cls === "gunner" && skill.startsWith("div.");
    let target = null;
    if (!aoe) {
      target = await chooseFrom(E.livingFiends(b), "Pick a target. Arrow keys, then Enter.");
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
    if (result.outcome === "miss") return "done";
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
      E.reward(b, hr.key, { correct: true, tier });
      if (crit && rng.chance(0.5)) kitSay(quip("crit", rng), { ms: 3000 });
      else if (rng.chance(0.18)) kitSay(quip("right", rng), { ms: 3000 });
    }
    const weak = target && E.effectiveness(cls, target.type) < 1;
    if (weak && !target.ko && rng.chance(0.6)) kitSay(`${FIEND_TYPES[target.type].hint} ${quip("swapHint", rng)}`, { ms: 6000 });
    refresh();
    return "done";
  }

  async function doPotion(hr) {
    const target = await chooseFrom(E.livingHeroes(b), "Who drinks the potion?");
    if (!target) return "back";
    const addSkill = mastery.pickTiers(LADDERS.add, rng)[2].skill;
    const p = genHeal(target.hp, target.maxHp, addSkill, rng, LADDERS.add);
    if (!p) {
      kitSay(`${target.name} is already at full health. Potions are for emergencies, not snacks.`);
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
    b.items.potion -= 1;
    const amount = r.outcome === "miss" ? Math.round(p.heal / 2) : p.heal;
    const ev = E.heal(b, target.key, amount);
    const c = spriteCenter(sprites[target.key]);
    sfx.heal();
    fx.heal(c.x, c.y + 40);
    floatNumber(screen, c.x, c.y - 20, `+${ev.healed}`, "heal");
    refresh();
    return "done";
  }

  async function doOverdrive(hr) {
    E.spendOverdrive(b, hr.key);
    sfx.overdrive();
    await banner(screen, `OVERDRIVE: ${CLASSES[hr.cls].overdrive}!`, "gold", 1500);
    if (hr.cls === "titancaller") return doSummon(hr, { grand: true });
    kitSay("Every right answer is another hit. Keep going, or press Esc to cash out.", { ms: 5000 });
    const tiers = mastery.pickTiers(LADDERS[CLASSES[hr.cls].track], rng);
    let hits = 0;
    for (let i = 0; i < 8 && E.livingFiends(b).length; i++) {
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
        kitSay(`It was ${q.answerText}. Combo over, but those hits count.`, { ms: 3500 });
        break;
      }
      panel.markRight();
      await wait(200);
      panel.close();
      const t = rng.pick(E.livingFiends(b));
      await attackFx(hr, [t], hr.cls);
      const ev = E.hit(b, hr.key, t.uid, OD_HIT[hr.cls] * (1 + i * 0.15) * E.effectiveness(hr.cls, t.type), { tier: i >= 4 ? 3 : 2 });
      hits += 1;
      await showHit(ev, { crit: i >= 4 });
    }
    if (hits) await banner(screen, `${hits}-HIT COMBO!`, "gold", 1500);
    return "done";
  }

  async function doSummon(hr, { grand = false } = {}) {
    const titan = TITANS.titan_starter;
    const titanName = names.titan || titan.name;
    const tier = await chooseSummonTier(titanName);
    if (!tier) {
      if (grand) hr.od = 100; // give the Overdrive back
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
      if (grand) hr.od = 100;
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
    if (grand) {
      /* Overdrive already spent */
    } else E.spendTitan(b);

    // the cinematic
    stopSpeaking();
    const dim = h("div.dimmer", { style: { background: "rgba(2,6,18,0.7)", zIndex: 74 } });
    const rise = h("div.titan-rise", {}, artFor("titan_starter"));
    const words = h("div.summon-words", {}, text);
    screen.append(dim, rise, words);
    sfx.summon();
    rise.animate(
      [
        { transform: "translate(-50%, 70%) scale(0.85)", opacity: 0 },
        { transform: "translate(-50%, 0) scale(1)", opacity: 1 },
      ],
      { duration: 1400, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" },
    );
    words.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards" });
    const narration = speak(text, "trailer", { force: true });
    await Promise.race([narration, wait(Math.min(9000, 1800 + text.length * 55))]);
    sfx.quake();
    fx.shake(field, 26, 700);
    for (const f of E.livingFiends(b)) {
      const c = spriteCenter(sprites[f.uid]);
      fx.burst(c.x, c.y, { color: "#ffd36b", count: 60, speed: 11, size: 5 });
    }
    rise.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" });
    words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" });
    await wait(500);
    dim.remove();
    for (const f of E.livingFiends(b)) {
      const amount = titan.atk * power.mult * TIER_MULT[tier] * (f.type === "colossal" ? 2 : 1) * (grand ? 1.6 : 1);
      await showHit(E.hit(b, hr.key, f.uid, amount, { tier }), { crit: true });
    }
    rise.remove();
    words.remove();
    if (judged.tip && judged.power !== "mega") kitSay(`${judged.praise} Next time: ${judged.tip}`, { ms: 9000 });
    refresh();
    return "done";
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

  // ------------------------------------------------------------ turns
  async function heroTurn(key) {
    let hr = hero(key);
    for (;;) {
      refresh();
      const cmd = await chooseCommand(hr);
      let r = "done";
      if (cmd === "move") r = await doMove(hr);
      else if (cmd === "item") r = await doPotion(hr);
      else if (cmd === "guard") {
        E.defend(b, hr.key);
        await banner(screen, `${hr.name} guards`, "", 900);
      } else if (cmd === "swap") {
        const inKey = E.swap(b, hr.key);
        if (inKey) {
          sfx.select();
          layoutHeroes();
          hr = hero(inKey);
          await banner(screen, `${hr.name} steps in!`, "good", 900);
          r = "back"; // the new hero takes this turn
        }
      } else if (cmd === "overdrive") r = await doOverdrive(hr);
      else if (cmd === "summon") r = await doSummon(hr);
      if (r !== "back") return;
    }
  }

  async function fiendTurnUI(uid) {
    const f = fiend(uid);
    refresh();
    await wait(450);
    const ev = E.fiendTurn(b, uid);
    if (ev.kind === "special") {
      sfx.quake();
      await banner(screen, `${f.name}: ${ev.name}!`, "bad", 1400);
      setPose(sprites[uid], "special");
      fx.shake(field, 22, 600);
    } else {
      setPose(sprites[uid], "attack");
      await lunge(sprites[uid], 80, 420);
    }
    setPose(sprites[uid], "idle");
    for (const hitEv of ev.hits) {
      const el = sprites[hitEv.target];
      const c = spriteCenter(el);
      sfx.hurt();
      recoil(el, 18);
      setPose(el, "hurt");
      setTimeout(() => setPose(el, hitEv.ko ? "ko" : "idle"), 450);
      floatNumber(screen, c.x, c.y - 20, String(hitEv.amount));
      if (hitEv.ko) {
        el.classList.add("ko");
        await banner(screen, `${hero(hitEv.target).name} is down!`, "bad", 1100);
      }
    }
    refresh();
    if (ev.swappedIn) {
      layoutHeroes();
      await banner(screen, `${hero(ev.swappedIn).name} jumps in!`, "good", 1000);
    }
    await wait(250);
  }

  // ------------------------------------------------------------ main loop
  await wait(400);
  kitSay(encounter.intro, { ms: 9000 });
  await wait(1200);
  while (!b.over) {
    const key = E.nextTurn(b);
    refresh();
    if (hero(key)) await heroTurn(key);
    else await fiendTurnUI(key);
    E.endTurn(b);
    layoutHeroes();
    refresh();
  }
  command.replaceChildren();
  const won = b.over === "victory";
  setTimeout(() => fx.stop(), 2500); // let the last sparks fade, then shut the canvas down
  if (won) {
    sfx.victory();
    b.heroes.filter((x) => x.active && !x.ko).forEach((x) => setPose(sprites[x.key], "victory"));
  } else sfx.defeat();
  kitSay(quip(won ? "victory" : "defeat", rng), { ms: 6000 });
  await wait(1200);
  return { won, stats, battle: b };
}
