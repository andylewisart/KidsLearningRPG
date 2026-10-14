// The Crystal Grid's screen (chapter 2; the rules are world/grid.js): the
// Sage chart on its night-blue board (art wave 08, Section H: ui/grid_board,
// the node sheet ui/grid_nodes and the hero tokens ui/grid_tokens). Each
// hero's road of nodes, the lit ones tinted in that hero's color, and their
// token on the last node they lit. He picks a node (a click, or the arrow
// keys) and the panel says what it does in plain words; Enter or the button
// lights it with glimmer, and the token walks there. Tab or 1 to 5 picks a
// hero, Z shows the whole chart, Esc closes. Kit's lines come through
// api.say; nothing here is ever timed.

import { h, onKeys, wait } from "./dom.js";
import { uiIcon } from "./icons.js";
import { assetUrl } from "./sprites.js";
import { sfx } from "./audio.js";
import { CLASSES } from "../battle/data.js";
import { PARTY_ORDER } from "../world/data.js";
import { PETS } from "../world/data2.js";
import { NODES, HERO_NODES, ICONS, about, nodeState, lightNode, openGates, gateOpen, gateProgress, nextUp, tokenAt, route, progressOf, anyReady, gridOf, isLit } from "../world/grid.js";
import { weaponStep } from "../world/forge.js";

const HALF = 1000; // the chart layer is 2000 px square, its middle at the chart's (0, 0)
const FOCUS = [450, 384]; // where the picked node sits on screen (the middle of the space left of the panel)
const CLOSE = 1; // the view's zoom up close, and for the whole chart
const WHOLE = 0.4;
const TOKENS = { knight: "cade", gunner: "wren", spellwright: "knox", titancaller: "maren", beastkeeper: "tamsin" };
// stand-ins for the node pictures while ui/grid_nodes isn't painted
const PLAIN = { start: "✦", health: "♥", strength: "⚔", move: "»", pet_slot: "🐾", weapon: "🗡", skill_gate: "🔒", calm_seas: "〰" };

/** A node's picture: its sheet cell (lit in white-gold, tinted by CSS), or a stand-in. */
function nodeIcon(icon, lit) {
  const art = uiIcon(`${icon}${lit ? "_lit" : ""}`, "grid_nodes");
  if (!art) return h("span.grid-plain", {}, PLAIN[icon] || "•");
  art.classList.add("grid-icon");
  if (!lit) return art;
  // the hero's color over the white-gold, only where the picture is
  const tint = h("span.grid-tint");
  for (const [k, v] of [["maskImage", art.style.backgroundImage], ["maskSize", art.style.backgroundSize], ["maskPosition", art.style.backgroundPosition]]) {
    tint.style[k] = v;
    tint.style[`webkit${k[0].toUpperCase()}${k.slice(1)}`] = v;
  }
  return h("span.grid-icon-wrap", {}, art, tint);
}

/** A hero's token: their face on the token sheet, or a stand-in in their color. */
function tokenFace(cls, name) {
  const art = uiIcon(TOKENS[cls], "grid_tokens");
  if (art) return art;
  return h("span.grid-plain-token", { style: { background: CLASSES[cls].color } }, (name || "?")[0]);
}

const lightMote = () => uiIcon("light", "grid_tokens") || h("span.grid-plain-mote", {}, "✦");
const fmt = (n) => Math.round(n).toLocaleString("en-US");

/**
 * Open the Grid over `layer` (the explore screen). Resolves when he closes it.
 *   world   the adventure's save data (its grid changes as he lights nodes)
 *   api     { say(id): a conversation, save(): keep the world }
 *   kids    each child's mastery, for the gates (world/grid.js, gateProgress)
 *   names   the save's names for the heroes
 *   first   the first visit, straight after the chart appears on the ceiling
 */
export async function openGrid(layer, { world: w, api, kids = [], names = {}, first = false }) {
  const g = gridOf(w);
  const heroes = PARTY_ORDER.filter((c) => w.party.includes(c));
  const nameOf = (cls) => names[cls] || CLASSES[cls].hero;
  const tint = (cls) => CLASSES[cls].color;
  let busy = false; // Kit's talking, or a node is lighting up
  let calmUntil = 0; // the key that sent Kit's line on shouldn't also light a node
  let hero = heroes.find((c) => nextUp(w, c) && nodeState(w, nextUp(w, c)) === "ready") || heroes[0];
  let sel = nextUp(w, hero) || tokenAt(w, hero);
  let zoom = CLOSE;
  const said = new Set(); // Kit's lines once a visit

  // ------------------------------------------------------------ the board
  const board = assetUrl("grid_board");
  const root = h("div.grid-screen");
  const sky = h("div.grid-sky", { style: board ? { backgroundImage: `url("${board}")` } : {} });
  const chart = h("div.grid-chart");
  const view = h("div.grid-view", {}, chart);
  const NS = "http://www.w3.org/2000/svg";
  const lines = document.createElementNS(NS, "svg");
  lines.setAttribute("class", "grid-lines");
  lines.setAttribute("viewBox", `0 0 ${HALF * 2} ${HALF * 2}`);
  chart.append(lines);
  const pos = (id) => [HALF + NODES[id].at[0], HALF + NODES[id].at[1]];

  const nodeEls = {};
  const lineEls = {};
  for (const cls of heroes) {
    for (const id of HERO_NODES[cls]) {
      const node = NODES[id];
      if (node.from) {
        const ln = document.createElementNS(NS, "line");
        const [x1, y1] = pos(node.from);
        const [x2, y2] = pos(id);
        Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => ln.setAttribute(k, v));
        ln.style.setProperty("--tint", tint(cls));
        lines.append(ln);
        lineEls[id] = ln;
      }
      const [x, y] = pos(id);
      const el = h(`div.grid-node.k-${node.kind}`, { style: { left: `${x}px`, top: `${y}px` }, title: about(id, nameOf).title, onclick: (e) => (e.stopPropagation(), clickNode(id)) });
      el.style.setProperty("--tint", tint(cls));
      chart.append(el);
      nodeEls[id] = el;
    }
  }
  const tokenEls = {};
  for (const cls of heroes) {
    const [x, y] = pos(tokenAt(w, cls));
    const el = h("div.grid-token", { style: { left: `${x}px`, top: `${y}px` }, title: nameOf(cls), onclick: (e) => (e.stopPropagation(), pickHero(cls)) }, tokenFace(cls, nameOf(cls)));
    el.style.setProperty("--tint", tint(cls));
    chart.append(el);
    tokenEls[cls] = el;
  }

  // ------------------------------------------------------------ the panel and the bar along the top
  const glimmer = h("div.grid-glimmer", { title: "Glimmer: every right answer in a fight leaves some" });
  const wholeBtn = h("button.btn.grid-whole", { onclick: () => toggleWhole() }, "🔭 Whole chart (Z)");
  const closeBtn = h("button.btn.ghost.grid-close", { onclick: () => close() }, "✕ Close (Esc)");
  const top = h("div.grid-top", {}, h("h2.grid-title", {}, "Crystal Grid"), glimmer, wholeBtn, closeBtn);
  const tabs = h("div.grid-tabs");
  const card = h("div.grid-card");
  const panel = h("div.window.grid-panel", {}, tabs, card);
  const help = h("div.grid-help", {}, first ? "Light a node next to a lit one. Glimmer from fights lights them." : "Arrows: pick a node · Enter: light it · Tab: next hero · Z: whole chart · Esc: close");
  root.append(sky, view, top, panel, help);
  layer.append(root);

  function drawNodes() {
    for (const [id, el] of Object.entries(nodeEls)) {
      const node = NODES[id];
      const state = nodeState(w, id);
      el.className = `grid-node k-${node.kind} s-${state}${id === sel ? " sel" : ""}${node.cls === hero ? " mine" : ""}`;
      const icon = nodeIcon(ICONS[node.kind], state === "lit");
      const cost = ["ready", "short"].includes(state) ? h("span.grid-cost", {}, fmt(node.cost)) : null;
      el.replaceChildren(icon, ...(cost ? [cost] : []));
    }
    for (const [id, ln] of Object.entries(lineEls)) {
      const node = NODES[id];
      const lit = isLit(w, id) && isLit(w, node.from);
      ln.setAttribute("class", `${lit ? "lit" : ""}${node.kind === "weapon" || node.kind === "gate" || NODES[node.from].kind === "gate" ? " side" : ""}`);
    }
  }

  function drawGlimmer() {
    glimmer.replaceChildren(lightMote(), h("b", {}, fmt(g.light)), h("span", {}, " glimmer"));
    glimmer.classList.toggle("ready", anyReady(w));
  }

  function drawTabs() {
    tabs.replaceChildren(
      ...heroes.map((cls, i) => {
        const p = progressOf(w, cls);
        const t = h(`button.grid-tab${cls === hero ? ".on" : ""}`, { onclick: () => pickHero(cls), title: `${nameOf(cls)} (${i + 1})` }, tokenFace(cls, nameOf(cls)), h("span.grid-tab-count", {}, `${p.lit}/${p.of}`), h("span.grid-tab-bar", {}, h("i", { style: { width: `${(p.lit / p.of) * 100}%` } })));
        t.style.setProperty("--tint", tint(cls));
        return t;
      }),
    );
  }

  /** What the picked node does, and what he can do about it. */
  function drawCard() {
    const node = NODES[sel];
    const state = nodeState(w, sel);
    const { title, text } = about(sel, nameOf);
    const need = node.cost - g.light;
    let status = null;
    let button = null;
    if (state === "lit") status = node.kind === "gate" ? "Open! The nodes behind it can be lit." : node.kind === "weapon" ? "Forged." : node.kind === "start" ? null : "Lit.";
    else if (state === "ready") button = h("button.btn.gold.grid-light-btn", { onclick: () => light(sel) }, lightMote(), `Light it: ${fmt(node.cost)} glimmer`);
    else if (state === "short") status = `It takes ${fmt(node.cost)} glimmer: ${fmt(need)} more. Every right answer in a fight leaves some.`;
    else if (state === "far") status = `${node.kind === "gate" && gateOpen(w, sel) ? "Open! " : ""}Light the node before it first (${about(node.from, nameOf).title}).`;
    else if (state === "forge") status = w.flags.dockWon ? "Bring parts to the Sword Master's forge, on his dock." : "The Sword Master forges these, once his dock is won back.";
    else if (state === "shut") status = gateWords(node);
    // a pet he's remembered for this hero, waiting for the slot
    const petId = node.kind === "pet_slot" ? Object.keys(PETS).find((k) => PETS[k].owner === node.cls && w.pets?.[k]) : null;
    const pet = petId ? PETS[petId] : null;
    const icon = h(`div.grid-card-icon.s-${state}`, {}, nodeIcon(ICONS[node.kind], state === "lit"));
    icon.style.setProperty("--tint", tint(node.cls));
    card.replaceChildren(
      ...[
        h("div.grid-card-head", {}, icon, h("div", {}, h("div.grid-card-who", {}, nameOf(node.cls)), h("h3", {}, title))),
        h("p.grid-card-text", {}, text),
        pet && state !== "lit" ? h("p.grid-card-note", {}, `${pet.name} is waiting for this slot.`) : null,
        node.kind === "weapon" && state !== "lit" && weaponStep(w, node.cls) + 1 < node.step ? h("p.grid-card-note", {}, "The step before it is forged first.") : null,
        status ? h("p.grid-card-status", {}, status) : null,
        button,
      ].filter(Boolean),
    );
  }

  /** A shut gate, in his words: what opens it, and the skill that's nearest. */
  function gateWords(node) {
    const p = gateProgress(node, kids);
    const c = p.closest;
    if (!c || !c.of) return "Answer this hero's problems in fights, on different days: the gate is watching.";
    const who = c.kid && kids.length > 1 ? `${c.kid}: ` : "";
    return `${who}nearest is ${c.label}: ${c.right} of the last ${c.of} right with no hints, on ${c.days} ${c.days === 1 ? "day" : "days"}.`;
  }

  function drawAll() {
    drawNodes();
    drawGlimmer();
    drawTabs();
    drawCard();
  }

  // ------------------------------------------------------------ the view
  let at = [0, 0];
  function transformFor([x, y], z) {
    return `translate(${FOCUS[0] - z * (HALF + x)}px, ${FOCUS[1] - z * (HALF + y)}px) scale(${z})`;
  }
  /** Glide the view to a chart point. */
  function focus(point, z = zoom, ms = 520) {
    const to = transformFor(point, z);
    const from = getComputedStyle(chart).transform;
    chart.getAnimations().forEach((a) => a.cancel());
    chart.style.transform = to;
    if (ms && from && from !== "none") chart.animate([{ transform: from }, { transform: to }], { duration: ms, easing: "cubic-bezier(.3,.7,.2,1)" });
    at = point;
    zoom = z;
  }
  const middle = () => {
    const pts = heroes.flatMap((c) => HERO_NODES[c].map((id) => NODES[id].at));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  };
  function toggleWhole() {
    if (zoom === WHOLE) focus(NODES[sel].at, CLOSE);
    else focus(middle(), WHOLE);
    wholeBtn.textContent = zoom === WHOLE ? "🔍 Close up (Z)" : "🔭 Whole chart (Z)";
    sfx.select();
  }
  /** Where a chart point is on the stage right now. */
  const onStage = ([x, y]) => [FOCUS[0] + zoom * (x - at[0]), FOCUS[1] + zoom * (y - at[1])];

  // ------------------------------------------------------------ picking
  function select(id, { glide = true } = {}) {
    sel = id;
    if (NODES[id].cls !== hero) hero = NODES[id].cls;
    if (glide && zoom === CLOSE) focus(NODES[id].at);
    drawAll();
    if (nodeState(w, id) === "shut" && !said.has("gridGate")) {
      said.add("gridGate");
      talk(() => api.say("gridGate"));
    }
  }

  function pickHero(cls) {
    if (busy || !heroes.includes(cls)) return;
    sfx.select();
    hero = cls;
    select(nextUp(w, cls) || tokenAt(w, cls));
  }

  function clickNode(id) {
    if (busy) return;
    // a second click on a node he can light lights it
    if (id === sel && nodeState(w, id) === "ready") return light(id);
    sfx.select();
    select(id);
  }

  /** The nearest of this hero's nodes in a direction (the arrow keys), or the next or last along the road. */
  function step(dx, dy) {
    const [fx, fy] = NODES[sel].at;
    let best = null;
    let bestScore = Infinity;
    for (const id of HERO_NODES[hero]) {
      if (id === sel) continue;
      const [x, y] = NODES[id].at;
      const d = Math.hypot(x - fx, y - fy);
      const cos = ((x - fx) * dx + (y - fy) * dy) / d;
      if (cos < 0.35) continue;
      const score = d / (cos * cos);
      if (score < bestScore) {
        best = id;
        bestScore = score;
      }
    }
    if (!best) {
      const list = HERO_NODES[hero];
      best = list[(list.indexOf(sel) + (dx + dy > 0 ? 1 : list.length - 1)) % list.length];
    }
    sfx.select();
    select(best);
  }

  // ------------------------------------------------------------ lighting a node
  async function light(id) {
    if (busy) return;
    const node = NODES[id];
    const from = tokenAt(w, node.cls);
    const r = lightNode(w, id);
    if (!r.ok) {
      sfx.back();
      return;
    }
    busy = true;
    api.save();
    try {
      // a mote of light flies from the glimmer to the node
      const [sx, sy] = onStage(node.at);
      const gr = glimmer.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      const k = rr.width / 1280;
      const mote = h("div.grid-fly", {}, lightMote());
      root.append(mote);
      drawGlimmer();
      await mote.animate(
        [
          { left: `${(gr.left - rr.left) / k + 20}px`, top: `${(gr.top - rr.top) / k + 18}px`, transform: "translate(-50%, -50%) scale(0.6)", opacity: 0.4 },
          { left: `${sx}px`, top: `${sy}px`, transform: "translate(-50%, -50%) scale(1.3)", opacity: 1 },
        ],
        { duration: 620, easing: "ease-in" },
      ).finished;
      mote.remove();
      sfx.play("sfx_heal") || sfx.heal();
      drawAll();
      nodeEls[id].animate([{ transform: "translate(-50%, -50%) scale(1.5)", filter: "brightness(2.4)" }, { transform: "translate(-50%, -50%) scale(1)", filter: "brightness(1)" }], { duration: 700, easing: "ease-out" });
      await walkToken(node.cls, route(from, id));
      if (r.said.includes("petSlot") && !said.has("petSlot")) {
        said.add("petSlot");
        await talk(() => api.say("petSlot"));
      }
      if (r.said.includes("gridCalmSeas")) await talk(() => api.say("gridCalmSeas"));
      // on to the next one he could light on this road, so the next Enter carries on
      const next = nextUp(w, node.cls);
      if (next && nodeState(w, next) === "ready") select(next);
      else drawAll();
    } finally {
      busy = false;
    }
  }

  /** A hero's token walks along the lit road to where it lit. */
  async function walkToken(cls, ids) {
    const el = tokenEls[cls];
    for (const id of ids.slice(1)) {
      const [x, y] = pos(id);
      await el.animate([{ left: el.style.left, top: el.style.top }, { left: `${x}px`, top: `${y}px` }], { duration: 230, easing: "ease-in-out" }).finished;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }

  /** Kit says something, with the chart waiting (and the keys left alone) until he's done. */
  async function talk(fn) {
    const was = busy;
    busy = true;
    try {
      await fn();
    } finally {
      busy = was;
      calmUntil = performance.now() + 400;
    }
  }

  // ------------------------------------------------------------ in, and out
  let done;
  const closed = new Promise((r) => (done = r));
  const off = onKeys((e) => {
    if (busy || root.closing || performance.now() < calmUntil) {
      // Enter and Space are the chart's while it's open: a button he clicked mustn't take them either
      if (e.key === "Enter" || e.key === " ") e.preventDefault();
      return;
    }
    const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    if (arrows[e.key]) {
      e.preventDefault();
      step(...arrows[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (nodeState(w, sel) === "ready") light(sel);
      else if (nodeState(w, sel) === "shut") {
        said.delete("gridGate");
        select(sel, { glide: false });
      } else sfx.back();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const i = heroes.indexOf(hero);
      pickHero(heroes[(i + (e.shiftKey ? heroes.length - 1 : 1)) % heroes.length]);
    } else if (/^[1-5]$/.test(e.key) && heroes[Number(e.key) - 1]) pickHero(heroes[Number(e.key) - 1]);
    else if (e.key === "z" || e.key === "Z") toggleWhole();
    else if (e.key === "Escape") close();
  });

  async function close() {
    if (busy || root.closing) return;
    root.closing = true;
    off();
    sfx.back();
    g.seen = g.light;
    api.save();
    await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }).finished;
    root.remove();
    done();
  }

  drawAll();
  focus(NODES[sel].at, CLOSE, 0);
  root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-out" });
  chart.animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "none" }], { duration: 1100, easing: "ease-out" });
  sfx.play("sfx_summon_rise", { volume: 0.4 }) || sfx.heal();
  await wait(800);
  // gates that opened since he last looked: the skill behind them is learned now
  const opened = openGates(w, kids);
  if (opened.length) {
    api.save();
    drawAll();
    for (const id of opened) nodeEls[id].animate([{ transform: "translate(-50%, -50%) scale(1.8)", filter: "brightness(3)" }, { transform: "translate(-50%, -50%) scale(1)", filter: "brightness(1)" }], { duration: 1100, easing: "ease-out" });
    await talk(() => api.say("gridGateOpen"));
  } else if (!first && anyReady(w) && g.light > (g.seen ?? 0)) await talk(() => api.say("gridAgain"));
  return closed;
}
