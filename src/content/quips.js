// The droid's lines. Deadpan, a little smug, always on his side.
// Jokes land on the droid or the fiends, never on him.

export const QUIPS = {
  right: [
    "Correct. I'd clap, but I'm mostly sphere.",
    "That's the stuff. The fiend has regrets.",
    "Textbook. Possibly a better textbook than the one I'm built from.",
    "Clean hit. The math checks out, and so does the fiend.",
    "Right again. I'm starting to feel unnecessary.",
  ],
  crit: [
    "Three stars. That hit had paperwork.",
    "That was so big, the holo-simulator flickered.",
    "Massive. I'm updating my threat charts. Yours, not theirs.",
  ],
  miss: [
    "It dodged. Happens to the best of us. Mostly to the worst of us.",
    "Missed. In fairness, it cheated by moving.",
    "The fiend got lucky. Let's take that luck away.",
  ],
  capture: ["Data trapped. That one's yours now.", "Captured. It's in your Monster Arena, looking embarrassed.", "Into the crystal it goes. Collect them all. I'm contractually obligated to say that."],
  brave: ["Brave try. Three stars is where heroes get made.", "Missed the big one, but your Overdrive noticed the guts."],
  heroHurt: ["Ouch. I felt that, and I don't have nerves.", "Shake it off. I'll file a complaint with the fiend."],
  swapHint: ["Wrong tool for this fiend. Try Swap.", "That matchup is ugly. The bench is warm, by the way."],
  victory: [
    "Simulation cleared. My hat and I are proud.",
    "Victory. I'll pretend I was never worried.",
    "Every fiend down. Somebody tell the fiends.",
  ],
  defeat: ["Simulation over. Nobody actually got hurt, except my feelings.", "We lost this one. The simulator resets; so do we."],
  noKey: [
    "My chat circuits aren't connected yet. A grown-up can turn them on in the grown-ups corner. Here's the built-in walkthrough instead.",
  ],
};

export function quip(kind, rng) {
  const list = QUIPS[kind] || [""];
  return rng ? rng.pick(list) : list[Math.floor(Math.random() * list.length)];
}
