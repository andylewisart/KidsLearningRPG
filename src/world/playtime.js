// The play timer a grown-up can set (grown-ups corner). Pure, so it's tested.
//
// No countdown is ever shown to him. The time counted is minutes actually
// played (ui/clock.js), and the day's allowance runs out like this:
//   playing: plenty left
//   soon:    under five minutes left; Kit says so once, at a calm moment
//   over:    time's up; at the next calm moment (never in a fight, a problem
//            or a conversation) the party makes camp and the game saves
//   closed:  camp's made; the game stays closed until tomorrow, or until a
//            grown-up enters the PIN and gives more time
//   off:     no timer set

export const SOON_MS = 5 * 60 * 1000;
/** The choices in the grown-ups corner, in minutes (0 is off). */
export const LIMIT_CHOICES = [0, 20, 30, 45, 60, 90, 120];
/** What a grown-up can add after camp, in minutes. */
export const EXTEND_CHOICES = [15, 30, 60];

/** The local calendar day, so "tomorrow" means after midnight where he lives. */
export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function freshPlaytime() {
  // played: ms today. extra: ms a grown-up added today. warned: the allowance Kit last warned about.
  // camped: the day camp was made ("" once he's been welcomed back, or a grown-up reopened it).
  return { day: "", played: 0, extra: 0, warned: 0, camped: "" };
}

/** A new day starts the count again (camped is kept: it's how tomorrow's welcome-back knows). */
export function rollDay(pt, now = Date.now()) {
  const today = dayKey(now);
  if (pt.day !== today) Object.assign(pt, { day: today, played: 0, extra: 0, warned: 0 });
  return pt;
}

const allowance = (limitMin, pt) => limitMin * 60000 + (pt.extra || 0);

/** Milliseconds of play left today (Infinity with no timer). */
export function timeLeft(limitMin, pt, now = Date.now()) {
  if (!limitMin) return Infinity;
  rollDay(pt, now);
  return allowance(limitMin, pt) - pt.played;
}

/** off | playing | soon | over | closed (see the top of this file). */
export function playState(limitMin, pt, now = Date.now()) {
  if (!limitMin) return "off";
  rollDay(pt, now);
  if (pt.camped === pt.day) return "closed";
  const left = timeLeft(limitMin, pt, now);
  if (left <= 0) return "over";
  if (left <= SOON_MS) return "soon";
  return "playing";
}

/** Count some play. */
export function addPlay(pt, ms, now = Date.now()) {
  rollDay(pt, now);
  pt.played += Math.max(0, ms);
  return pt;
}

/** Kit's heads-up is due: under five minutes left, and not yet said for this allowance. */
export function warnDue(limitMin, pt, now = Date.now()) {
  return playState(limitMin, pt, now) === "soon" && pt.warned !== allowance(limitMin, pt);
}

export function markWarned(limitMin, pt) {
  pt.warned = allowance(limitMin, pt);
  return pt;
}

/** Camp's made: closed for the rest of today. */
export function makeCamp(pt, now = Date.now()) {
  rollDay(pt, now);
  pt.camped = pt.day;
  return pt;
}

/** A grown-up gives `minutes` more from now (and opens the game if camp was made). */
export function extend(limitMin, pt, minutes, now = Date.now()) {
  rollDay(pt, now);
  const left = timeLeft(limitMin, pt, now); // below zero once time ran over
  pt.extra = (pt.extra || 0) + Math.max(0, minutes * 60000 - left);
  pt.camped = "";
  return pt;
}

/** Camp was made on an earlier day: Kit welcomes him back (then clear `camped`). */
export function morningDue(pt, now = Date.now()) {
  return Boolean(pt.camped) && pt.camped < dayKey(now);
}
