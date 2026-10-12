// Play time that only counts while someone's playing, for the grown-ups'
// report and the quiet fact-fluency timing. The gap between two things he
// does (a key, a click, the mouse) counts at most IDLE_CAP, and nothing counts
// while the page is hidden or the game is paused. A fight left open over
// dinner reports the minutes actually played, and an answer's time doesn't
// include the break.

export const IDLE_CAP = 60 * 1000;

/** The clock itself, pure (tested): feed it times; read() is the active milliseconds so far. */
export function createActiveClock({ cap = IDLE_CAP, now = () => Date.now() } = {}) {
  let active = 0;
  let last = now();
  let stops = 0; // a hidden page and the pause menu can overlap
  const gap = (t) => Math.min(Math.max(0, t - last), cap);
  return {
    /** He did something. */
    input(t = now()) {
      if (!stops) active += gap(t);
      last = t;
    },
    /** Stop counting (the page is hidden, the game is paused). */
    stop(t = now()) {
      if (!stops) active += gap(t);
      last = t;
      stops += 1;
    },
    /** Count again (one stop undone). */
    go(t = now()) {
      if (!stops) return;
      stops -= 1;
      last = t;
    },
    read(t = now()) {
      return stops ? active : active + gap(t);
    },
  };
}

/** The game's one clock, fed by the page. */
export const playClock = createActiveClock();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const poke = () => playClock.input();
  for (const ev of ["keydown", "pointerdown", "pointermove", "wheel", "touchstart"]) window.addEventListener(ev, poke, { capture: true, passive: true });
  let hidden = document.hidden;
  if (hidden) playClock.stop();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden === hidden) return;
    hidden = document.hidden;
    if (hidden) playClock.stop();
    else playClock.go();
  });
}

/** Active milliseconds so far: subtract two readings to time something. */
export const activeNow = () => playClock.read();
