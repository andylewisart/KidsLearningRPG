// A small seeded random number generator (mulberry32). The game uses a
// time-based seed; tests pass a fixed seed so results repeat exactly.

export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    /** Whole number from min to max, both included. */
    int,
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** Pick from `list` with probability proportional to weight(item). */
    weighted(list, weight) {
      const weights = list.map((item) => Math.max(0, weight(item)));
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) return list[Math.floor(next() * list.length)];
      let roll = next() * total;
      for (let i = 0; i < list.length; i++) {
        roll -= weights[i];
        if (roll < 0) return list[i];
      }
      return list[list.length - 1];
    },
  };
}
