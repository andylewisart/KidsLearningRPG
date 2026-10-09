// Hero barks in battle: a small speech bubble by the speaker, with their
// portrait in the line's mood, and their pre-recorded voice.
// Rules: one at a time; never while a problem window is open; never on top
// of Kit. With "Character voices" off the bubble still shows, silently.

import { h, wait } from "./dom.js";
import { portraitFor, spriteCenter } from "./sprites.js";
import { pickBark } from "../content/barks.js";
import { playBark, stopBark, isSpeaking } from "../ai/voice.js";
import { getSave } from "../store/save.js";

const STAGE_W = 1280;
const BUBBLE_W = 330;

/**
 * screen: the battle screen element; spriteFor(cls): that hero's sprite;
 * blocked(): true while a problem window (or anything else) needs quiet.
 */
export function createBarker({ screen, spriteFor, blocked, rng }) {
  let current = null; // { el, token }
  let token = 0;
  const recent = new Set();

  const quiet = () => blocked() || isSpeaking();

  function hide() {
    if (!current) return;
    const el = current.el;
    current = null;
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" }).finished.then(() => el.remove(), () => el.remove());
  }

  /** Stop any bark now (a problem window opened, or Kit is talking). */
  function hush() {
    token += 1;
    stopBark();
    hide();
  }

  /** Show and speak one line. Resolves when it's over (or was cut short). */
  async function show(cls, line) {
    const sprite = spriteFor(cls);
    if (!sprite || !line) return false;
    hush();
    const my = ++token;
    recent.add(line.text);
    if (recent.size > 24) recent.delete(recent.values().next().value);
    const c = spriteCenter(sprite, { up: 0.9 });
    const face = h("div.bark-face", {}, portraitFor(cls, line.mood || "neutral"));
    const el = h("div.hero-bark", {}, face, h("div.bark-text", {}, line.text));
    const left = Math.max(16, Math.min(STAGE_W - BUBBLE_W - 16, c.x - BUBBLE_W + 60));
    Object.assign(el.style, { left: `${left}px`, top: `${Math.max(70, c.y - 70)}px`, width: `${BUBBLE_W}px` });
    el.style.setProperty("--tail", `${Math.max(24, Math.min(BUBBLE_W - 24, c.x - left))}px`);
    screen.append(el);
    current = { el };
    el.animate([{ opacity: 0, transform: "translateY(8px) scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" });
    const voiced = getSave()?.settings.heroVoices !== false;
    const minShow = wait(Math.max(1800, line.text.length * 55));
    const spoken = voiced ? playBark(cls, line.text) : Promise.resolve(false);
    await Promise.all([minShow, spoken]);
    if (my === token) hide();
    return my === token;
  }

  /**
   * Maybe say something. opts.chance: how likely (default always);
   * opts.wait: how long (ms) to wait for quiet before giving up (default: don't wait).
   */
  async function say(cls, when, { chance = 1, wait: maxWait = 0, line = null } = {}) {
    if (chance < 1 && !(rng ? rng.chance(chance) : Math.random() < chance)) return false;
    if (current) return false; // one at a time
    const bark = line || pickBark(cls, when, rng, recent);
    if (!bark) return false;
    const until = Date.now() + maxWait;
    while (quiet()) {
      if (Date.now() >= until) return false;
      await wait(250);
    }
    if (current) return false;
    return show(cls, bark);
  }

  /** A two-line exchange; stops if anything interrupts it. */
  async function banter(exchange, { wait: maxWait = 0 } = {}) {
    const [first, ...rest] = exchange.lines;
    if (!(await say(first.who, null, { wait: maxWait, line: first }))) return false;
    for (const l of rest) {
      await wait(250);
      if (quiet() || !(await say(l.who, null, { line: l }))) return false;
    }
    return true;
  }

  return { say, banter, hush, get busy() {
    return Boolean(current);
  } };
}
