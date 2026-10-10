// Words the voices get wrong, and how to spell them so they come out right.
// The game still shows the real spelling; only what's sent to a voice changes
// (recorded lines in tools/audio/generate.mjs, live lines in ai/voice.js).

export const SAY_AS = [
  [/\bGeode\b/g, "Jee-ode"], // the voices said "geed"
  [/\bgeode\b/g, "jee-ode"],
];

/** The text as a voice should read it. */
export const speakable = (text) => SAY_AS.reduce((t, [re, to]) => t.replace(re, to), String(text));
