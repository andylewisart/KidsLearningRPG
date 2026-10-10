// The Titan Caller's summon: he writes the Titan's entrance, and vivid,
// specific detail sets its power. Claude judges this when connected (see
// ai/claude.js); this file holds the tiers, the sentence frames, and an
// offline judge that works without any AI.
//
// The rule: a detail only counts if a reader can SEE or HEAR something
// specific. "Big" and "loud" don't count. Spelling never counts against him.

export const POWERS = {
  tiny: { label: "Tiny", icon: "🕯️", mult: 0.5 },
  spark: { label: "Spark", icon: "⚡", mult: 1 },
  blaze: { label: "Blaze", icon: "🔥", mult: 1.8 },
  mega: { label: "MEGA", icon: "🌋", mult: 3 },
};

export const MOVES = {
  sight: "what it looks like (colors, shapes, sizes)",
  sound: "a sound you can hear (KRAKOOM!)",
  senses: "a smell, taste, or feel",
  talk: "someone talking",
  feelings: "how someone feels inside",
  likea: "a comparison with like or as",
  power: "a strong action verb",
  twist: "a surprise",
};

/** Short chip names for the power card and the Titan Journal. */
export const MOVE_NAMES = {
  sight: "sight",
  sound: "sound",
  senses: "senses",
  talk: "talk",
  feelings: "feelings",
  likea: "comparison",
  power: "power verb",
  twist: "twist",
};

export function powerFromMoves(count) {
  if (count <= 0) return "tiny";
  if (count <= 2) return "spark";
  if (count <= 4) return "blaze";
  return "mega";
}

/** ★ sentence frames: he fills the blanks. */
export const FRAMES = [
  {
    text: "{titan} burst out of the {place}, its {part} glowing {color}.",
    blanks: { place: "where did it come from?", part: "which body part?", color: "what color?" },
  },
  {
    text: "With a {sound}, {titan} slammed its {part} into the {target}.",
    blanks: { sound: "what did it sound like?", part: "which body part?", target: "what did it hit?" },
  },
  {
    text: "{titan} rose from the {place}, as tall as a {comparison}, roaring {sound}.",
    blanks: { place: "where?", comparison: "as tall as what?", sound: "spell the roar!" },
  },
];

const FUZZY = ["big", "huge", "giant", "small", "little", "loud", "quiet", "cool", "awesome", "amazing", "scary", "good", "bad", "nice", "fast", "strong", "really", "very", "super"];
const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "violet", "pink", "black", "white", "gray", "grey", "silver", "gold", "golden", "crimson", "scarlet", "emerald", "turquoise", "teal", "glowing", "shimmering", "sparkling", "rusty", "striped", "spotted", "spiky", "jagged"];
const SOUNDS = ["boom", "kaboom", "crash", "bang", "roar", "rumble", "hiss", "crack", "zap", "whoosh", "thud", "screech", "splash", "crunch", "sizzle", "buzz", "clang", "snap", "pow", "wham", "thunk", "growl", "shriek", "howl", "rattle", "clank", "kraboom", "krakoom", "skreee", "thunder", "crackle", "whistle", "whisper", "murmur", "gurgle", "slosh", "swish", "plop", "drip", "chime", "jingle", "hum", "sing", "chirp", "squawk", "squeak", "caw", "moan", "groan", "sigh", "rush", "lap", "pound", "pop", "creak", "clatter", "tinkle", "gush", "bubble", "fizz", "rustle", "patter"];
const POWER_VERBS = ["smash", "slam", "crash", "explod", "blast", "roar", "thunder", "rip", "shatter", "erupt", "burst", "hurl", "snatch", "zoom", "rocket", "crush", "stomp", "lung", "slic", "whip", "scorch", "devour", "swallow", "charg", "toppl", "plung", "soar", "swoop", "pounc", "lash", "fling", "flung", "smack", "crumbl", "tore", "rammed", "ram", "spun", "spew", "flatten"];
const SENSES = ["smell", "smelled", "stink", "stank", "stench", "salty", "sour", "sweet", "bitter", "sticky", "slimy", "freezing", "icy", "burning", "scorching", "rough", "smooth", "damp", "soggy", "rotten", "fishy", "smoky", "taste", "tasted", "felt"];
const FEELINGS = ["scared", "afraid", "terrified", "nervous", "brave", "angry", "furious", "proud", "shocked", "excited", "worried", "panicked", "gasped", "trembled", "shaking", "shook", "heart pounded", "frozen in fear", "grinned", "cheered", "screamed"];
// "like" as a verb, not a comparison: "I like", "we'd like"
const LIKE_VERB = ["i", "we", "you", "they", "he", "she", "would", "i'd", "we'd", "you'd", "they'd", "don't", "didn't", "do", "does", "really", "also", "to", "not"];
const TWISTS = ["suddenly", "but then", "out of nowhere", "to everyone's surprise", "instead", "turned out", "nobody expected"];

const words = (text) => text.toLowerCase().match(/[a-z']+/g) || [];

/**
 * Is `w` a form of `base`? crash: crashes, crashed, crashing; snap: snapped,
 * snapping; sizzle: sizzled, sizzling; cry: cries, cried. (He wrote "waves
 * crashing" and the old list only knew "crash", "crashs" and "crashed".)
 */
export function inflects(w, base) {
  if (w === base) return true;
  if (!w.startsWith(base.slice(0, Math.max(2, base.length - 2)))) return false;
  const stems = [base];
  if (base.endsWith("e")) stems.push(base.slice(0, -1)); // sizzle → sizzl-ing
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(base)) stems.push(base + base.at(-1)); // snap → snapp-ed
  if (/[^aeiou]y$/.test(base)) stems.push(base.slice(0, -1) + "i"); // cry → cri-es
  return stems.some((st) => ["s", "es", "ed", "d", "ing", "er", "ers"].some((end) => w === st + end));
}
const isAny = (w, list) => list.some((base) => inflects(w, base));

/** Judge an entrance without AI. Returns { power, moves:[{id,quote}], fuzzy:[...], tip, praise }. */
export function heuristicJudge(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  const ws = words(raw);
  const found = [];
  const add = (id, quote) => {
    if (quote && !found.some((m) => m.id === id)) found.push({ id, quote: quote.trim().slice(0, 60) });
  };

  const caps = raw.match(/\b[A-Z]{3,}[A-Z!]*\b/);
  const stretched = raw.match(/\b\w*([a-zA-Z])\1\1+\w*\b/);
  const soundWord = ws.find((w) => isAny(w, SOUNDS));
  add("sound", caps?.[0] || stretched?.[0] || soundWord);

  const color = ws.find((w) => COLORS.includes(w));
  const count = lower.match(/\b(two|three|four|five|six|seven|eight|nine|ten|hundred|\d+)\s+[a-z]+/);
  add("sight", color ? phraseAround(raw, color) : count?.[0]);

  // "like bacon", "like a jet engine", "as tall as a lighthouse" (but not "I like the sea")
  const likeMatch = [...lower.matchAll(/\b([a-z']+)\s+like\s+((?:an?|the|some)\s+)?([a-z]+)/g)].find((m) => !LIKE_VERB.includes(m[1]));
  const asMatch = lower.match(/\bas [a-z]+ as (?:an? |the )?[a-z]+/);
  add("likea", likeMatch ? `like ${likeMatch[2] || ""}${likeMatch[3]}` : asMatch?.[0]);

  const verb = ws.find((w) => POWER_VERBS.some((v) => w.startsWith(v)) && w.length > 3);
  add("power", verb);

  const sense = ws.find((w) => isAny(w, SENSES));
  add("senses", sense && phraseAround(raw, sense));

  const quote = raw.match(/["“][^"”]{2,}["”]/);
  add("talk", quote?.[0]);

  const feeling = FEELINGS.find((f) => new RegExp(`\\b${f}\\b`).test(lower));
  add("feelings", feeling && phraseAround(raw, feeling));

  const twist = TWISTS.find((t) => lower.includes(t));
  add("twist", twist && phraseAround(raw, twist.split(" ")[0]));

  const fuzzy = [];
  ws.forEach((w, i) => {
    if (FUZZY.includes(w) && ws[i - 1] !== "as" && !fuzzy.includes(w)) fuzzy.push(w);
  });

  const power = powerFromMoves(found.length);
  return { power, moves: found, fuzzy, tip: tipFor(found, fuzzy), praise: praiseFor(found) };
}

function phraseAround(text, word) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return word;
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, i - 12)) + 1);
  const endSpace = text.indexOf(" ", i + word.length + 8);
  return text.slice(start, endSpace < 0 ? undefined : endSpace);
}

const TIPS = {
  sound: "What does it SOUND like when it lands? A KRA-KOOM that shakes the ruins, or a hiss like a giant kettle?",
  sight: "What color is it, exactly? Glowing green like poison, or black as a storm cloud?",
  likea: "What is it as big as? A lighthouse? An airship? A mountain?",
  power: "Pick a stronger action word: does it smash, crush, or erupt out of the ground?",
  feelings: "How do the heroes feel when they see it? Scared stiff, or grinning like maniacs?",
};

function tipFor(found, fuzzy) {
  if (fuzzy.length) return `"${fuzzy[0]}" is fuzzy. ${TIPS[found.some((m) => m.id === "sight") ? "likea" : "sight"]}`;
  const missing = ["sound", "sight", "likea", "power", "feelings"].find((id) => !found.some((m) => m.id === id));
  return missing ? TIPS[missing] : "That's MEGA writing. Can you top it next time with a twist nobody saw coming?";
}

function praiseFor(found) {
  if (!found.length) return "";
  const best = found.find((m) => m.id === "likea") || found.find((m) => m.id === "sound") || found[0];
  return `"${best.quote}" — that one hits hard.`;
}

/** Fill a frame with his blank answers. */
export function fillFrame(frame, titanName, answers) {
  return frame.text.replace(/\{(\w+)\}/g, (_, key) => (key === "titan" ? titanName : String(answers[key] || "___").trim()));
}
