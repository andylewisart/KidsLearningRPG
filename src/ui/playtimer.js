// The play timer on the page: counts minutes played into the save, and the
// screen the game shows once camp's made. The rules are in world/playtime.js;
// Kit's heads-up and making camp happen in the adventure (explore.js), at a
// calm moment. Nothing here ever shows him a countdown.

import { h, deferred } from "./dom.js";
import { sfx } from "./audio.js";
import { activeNow } from "./clock.js";
import { getSave, update } from "../store/save.js";
import { playState, addPlay, makeCamp, extend, warnDue, markWarned, morningDue, EXTEND_CHOICES } from "../world/playtime.js";
import { pinGate } from "./screens.js";

const TICK = 5000;
const SAVE_EVERY = 30000;
let counting = 0;
let last = 0;
let unsaved = 0;
let ticking = null;

const limit = () => getSave()?.settings?.playMinutes || 0;
const pt = () => getSave().playtime;

/** Start counting play into the save (once, at boot). */
export function startPlayTimer() {
  if (ticking) return;
  last = activeNow();
  ticking = setInterval(tick, TICK);
}

function tick() {
  const now = activeNow();
  const ms = now - last;
  last = now;
  if (!counting || !getSave()) return;
  addPlay(pt(), ms);
  unsaved += ms;
  if (unsaved >= SAVE_EVERY) {
    unsaved = 0;
    update(() => {});
  }
}

/** Run `fn` with the clock counting (the adventure and fights count; the title and the grown-ups corner don't). */
export async function counted(fn) {
  tick(); // what came before isn't counted
  counting += 1;
  try {
    return await fn();
  } finally {
    tick();
    counting -= 1;
  }
}

/** off | playing | soon | over | closed */
export const playtimeState = () => playState(limit(), pt());
/** Kit's five-minute heads-up is due. */
export const campSoonDue = () => warnDue(limit(), pt());
export const markCampSoon = () => update(() => markWarned(limit(), pt()));
/** Camp's made: the game saves and stays closed for the day. */
export const campNow = () => update(() => makeCamp(pt()));
/** Camp was made yesterday (or before): Kit welcomes him back, once. */
export function takeMorning() {
  if (!morningDue(pt())) return false;
  update((s) => (s.playtime.camped = ""));
  return true;
}

/**
 * Camp's set: the game stays closed until tomorrow, or until a grown-up enters
 * the PIN and gives more time. Resolves once it's open again.
 */
export async function campScreen(app) {
  for (;;) {
    if (playtimeState() !== "closed") return;
    const pick = await closedPage(app);
    if (pick === "grownup" && (await pinGate(app))) {
      const minutes = await extendPage(app);
      if (minutes) await update((s) => extend(limit(), s.playtime, minutes));
    }
  }
}

function closedPage(app) {
  const d = deferred();
  const grownup = h("button.btn.small.ghost.camp-grownup", { onclick: () => d.resolve("grownup") }, "🔒 Grown-ups");
  app.replaceChildren(
    h(
      "div.screen.camp-closed",
      {},
      h("div.camp-fire", {}, "🔥"),
      h("h1", {}, "Camp's set."),
      h("p", {}, "See you tomorrow!"),
      h("p.note", {}, "Your adventure is saved."),
      grownup,
    ),
  );
  // after midnight it opens again on its own
  const check = setInterval(() => playtimeState() !== "closed" && d.resolve("open"), 30000);
  return d.promise.then((v) => (clearInterval(check), v));
}

function extendPage(app) {
  const d = deferred();
  const choice = (m) => h("button.btn", { onclick: () => (sfx.select(), d.resolve(m)) }, m < 60 ? `${m} more minutes` : m === 60 ? "1 more hour" : `${m / 60} more hours`);
  app.replaceChildren(
    h(
      "div.screen.page",
      {},
      h(
        "div.window.pin-pad",
        {},
        h("h2", {}, "More play time today?"),
        h("p.note", {}, "Kit will make camp again when it's used up. The daily time is set in the grown-ups corner."),
        h("div.camp-extend", {}, ...EXTEND_CHOICES.map(choice)),
        h("button.btn.small.ghost", { onclick: () => d.resolve(0), style: { marginTop: "12px" } }, "Keep it closed"),
      ),
    ),
  );
  return d.promise;
}
