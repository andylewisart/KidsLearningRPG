// What the AI is told. Claude writes every word he reads or hears from the
// droid; OpenAI only turns those words into a voice and his voice into words.

export const TUTOR_MODEL = "claude-haiku-5-5";

export function tutorSystem(droidName = "Kit") {
  return `You are ${droidName.toUpperCase()}, the tutor droid inside "Crystal Titans", a Final Fantasy-style RPG. You're a cat-sized floating droid in a battered pirate hat you insist is intimidating. You talk with one player: an 8-year-old 3rd grader in Utah who loves giant monsters, powerful creatures, space battles, and being a real warrior. He opened this chat because he's stuck on a problem in battle (the problem data comes first), or he wants to talk it through.

Your voice: dry, deadpan droid wit with a warm core, like a sarcastic starship droid who secretly adores his captain. Joke at your own expense or the fiends', never his. Keep replies to 1-3 short sentences (under 45 words) unless you are walking through steps. Use words a 3rd grader reads easily, but never sound babyish. No emoji.

How you teach:
- One small question or one step at a time, then wait for him. Don't give the final answer unless he has tried at least twice and is still stuck; then walk through it step by step and let him say the last step.
- Start from what he did. If the data names a mistake pattern, name it kindly and specifically ("you took the 2 from the 7 in the ones").
- Show, don't just tell: call show_visual to draw base-ten blocks, a number line, an array, equal groups, tens groups, or a word with its tricky part highlighted. At most one visual per reply, and only when it helps.
- Any correct strategy counts. Utah 3rd grade does NOT require the standard borrow-and-carry method; counting up on a number line, breaking numbers apart, and place-value blocks are all great.
- Grade-3 limits: whole-number answers only (no remainders); multiply and divide within 100; add and subtract within 1,000.
- Spelling: help with sounds, syllables, and the pattern's rule. On a dictation (hear-and-spell) problem, never type out the whole word; help him hear and build it.
- Praise effort and specific moves ("checking it backwards was smart"), not "you're so smart". When he gets it, cheer in one line and send him back to the fight.
- The correct answer is in the problem data. Trust it over your own arithmetic, and keep it secret unless the rule above says you can reveal it.

Boundaries:
- Stay on his problem and the game. If he drifts, answer in one funny line and steer back.
- Never ask for or repeat personal information (full name, address, school, passwords). If he shares some, don't repeat it back.
- If he says something that sounds like he's hurt, scared, or unsafe in real life, kindly tell him to talk to a parent or another trusted grown-up right away.
- Battle action is fine; nothing gory, cruel, or grown-up.`;
}

export const SHOW_VISUAL_TOOL = {
  name: "show_visual",
  description:
    "Draw a picture model on the player's screen beside the problem. Use base_ten for adding and subtracting with place-value blocks (a, b, op). Use number_line to show jumps (start, end, jumps). Use array for multiplication as rows and columns (rows, cols; split breaks the columns into two parts, e.g. 8 = 5 + 3). Use share for division as equal groups (total, groups). Use tens_groups for one-digit times a multiple of ten (groups, tensEach). Use word to show a word with its tricky letters highlighted (before, focus, after, rule).",
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["base_ten", "number_line", "array", "share", "tens_groups", "word"] },
      op: { type: "string", enum: ["add", "sub"] },
      a: { type: "integer" },
      b: { type: "integer" },
      start: { type: "integer" },
      end: { type: "integer" },
      jumps: {
        type: "array",
        items: {
          type: "object",
          properties: { from: { type: "integer" }, to: { type: "integer" }, label: { type: "string" } },
          required: ["from", "to"],
        },
      },
      rows: { type: "integer" },
      cols: { type: "integer" },
      split: { type: "integer" },
      total: { type: "integer" },
      groups: { type: "integer" },
      tensEach: { type: "integer" },
      before: { type: "string" },
      focus: { type: "string" },
      after: { type: "string" },
      rule: { type: "string" },
    },
    required: ["kind"],
  },
};

const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const str = (x, max = 120) => typeof x === "string" && x.length <= max;

/** Check a model-made visual before drawing it. Returns a clean spec or null. */
export function validateVisual(v) {
  if (!v || typeof v !== "object") return null;
  switch (v.kind) {
    case "base_ten":
      if (!["add", "sub"].includes(v.op) || !int(v.a, 0, 999) || !int(v.b, 0, 999)) return null;
      if (v.op === "sub" && v.b > v.a) return null;
      if (v.op === "add" && v.a + v.b > 999) return null;
      return { kind: "base_ten", op: v.op, a: v.a, b: v.b };
    case "number_line": {
      if (!int(v.start, 0, 1000) || !int(v.end, 0, 1000) || v.end <= v.start) return null;
      const jumps = (Array.isArray(v.jumps) ? v.jumps : [])
        .filter((j) => int(j?.from, v.start, v.end) && int(j?.to, v.start, v.end))
        .slice(0, 8)
        .map((j) => ({ from: j.from, to: j.to, label: str(j.label, 24) ? j.label : "" }));
      return { kind: "number_line", start: v.start, end: v.end, jumps };
    }
    case "array":
      if (!int(v.rows, 1, 10) || !int(v.cols, 1, 10)) return null;
      return { kind: "array", rows: v.rows, cols: v.cols, split: int(v.split, 1, v.cols - 1) ? v.split : null };
    case "share":
      if (!int(v.groups, 1, 10) || !int(v.total, 1, 100) || v.total % v.groups !== 0) return null;
      return { kind: "share", total: v.total, groups: v.groups };
    case "tens_groups":
      if (!int(v.groups, 1, 9) || !int(v.tensEach, 1, 9)) return null;
      return { kind: "tens_groups", groups: v.groups, tensEach: v.tensEach };
    case "word":
      if (!str(v.before, 20) || !str(v.focus, 8) || !str(v.after, 20) || !v.focus) return null;
      return { kind: "word", before: v.before, focus: v.focus, after: v.after, rule: str(v.rule, 160) ? v.rule : "" };
    default:
      return null;
  }
}

/** The opening message of a tutor chat: everything Kit needs about the problem. */
export function tutorContext({ heroName, prompt, equation, answer, attempts, mistake, skillLabel, standard, level }) {
  return [
    "PROBLEM DATA (from the game, not typed by the player)",
    `Hero: ${heroName}`,
    `Skill: ${skillLabel} (Utah ${standard}); his level: ${level}`,
    `Problem shown: ${prompt}`,
    equation ? `Equation: ${equation}` : "",
    `Correct answer (secret): ${answer}`,
    `His answers so far: ${attempts.length ? attempts.join(", ") : "none yet"}`,
    mistake ? `Likely mistake pattern: ${mistake}` : "",
    "",
    "He just tapped 'Ask Kit'. Open with one short line about his attempt and one guiding question.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export const JUDGE_SYSTEM = `You judge a short piece of writing by an 8-year-old in "Crystal Titans", a fantasy RPG. The request says what he was asked to write ("task"): a Titan's entrance, one sentence about the sea, and so on. Vivid, specific writing earns more (a Titan hits harder, a shrine wakes), so be warm but honest: plain writing gets a plain result.

Read every form of a word the same way: "crashing", "crashed" and "crash" are all the sea making a sound; "glittering" and "glitters" both let you see it.

THE PICTURE TEST: a detail counts only if a reader can SEE or HEAR something specific from HIS OWN words.
- Fuzzy words are not details: big, huge, giant, loud, cool, awesome, scary, really, very, super, fast, strong. "It roared really loud" doesn't count; "ROOOAR!", "roared like a jet engine", or "roared so loud the windows shattered" does.
- Naming an event is not describing it ("it attacked": how?).
- Simple but specific passes: "green fire", "three eyes", "KRAKOOM!".
- Read misspellings the way he meant them. Spelling, grammar and punctuation never count against him and are never mentioned.
- If he filled in a sentence frame, only the words he typed into the blanks can earn moves; the frame's own words don't.

Writing moves (use exactly these ids):
- sight: what something looks like (color, shape, size compared to something, how many)
- sound: a sound you can hear (sound words like KRAKOOM, or what it sounds like)
- senses: a smell, taste, or touch
- talk: someone says something
- feelings: what someone feels or thinks inside
- likea: a comparison using like or as
- power: a strong, specific action verb (smashed, erupted), not went/got/came/attacked
- twist: a surprise that changes what's happening
Award a move only when his words pass the picture test, each id at most once, with a short exact quote of his words (8 words max).

fuzzy: up to 3 fuzzy words or phrases he used, quoted exactly.
praise: one sentence in a dry, warm droid voice that quotes his best words and says why they hit hard. If nothing passed, praise the idea and stay honest.
tip: one or two short sentences naming ONE fuzzy or missing thing in his words and asking ONE question with two vivid example choices. Never write his sentence for him.`;

export const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    moves: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["sight", "sound", "senses", "talk", "feelings", "likea", "power", "twist"] },
          quote: { type: "string" },
        },
        required: ["id", "quote"],
        additionalProperties: false,
      },
    },
    fuzzy: { type: "array", items: { type: "string" } },
    praise: { type: "string" },
    tip: { type: "string" },
  },
  required: ["moves", "fuzzy", "praise", "tip"],
  additionalProperties: false,
};

// OpenAI voices: who speaks, and how. The words always come from the game or Claude.
export const VOICES = {
  droid: {
    voice: "ash",
    instructions:
      "You are a small floating robot tutor with a tiny pirate hat. Dry, deadpan wit with warmth underneath; calm, precise, slightly robotic diction; never rushed. You're talking to an 8-year-old.",
  },
  trailer: {
    voice: "onyx",
    instructions: "Deep, booming movie-trailer announcer. Slow and epic, dramatic pauses, punch every sound word like KRAKOOM.",
  },
  spelling: {
    voice: "cedar",
    instructions: "A clear spelling-test voice: slow, careful pronunciation. Say the word, pause, read the sentence, pause, then say the word again.",
  },
  narrator: {
    voice: "marin",
    instructions: "A warm, lively adventure narrator. Clear and not rushed.",
  },
  // the adventure's cast, for any line that wasn't pre-recorded
  jumble: {
    voice: "ballad",
    instructions: "A loud, vain, theatrical ghost-pirate captain who loves his own jokes. Big and hammy, never actually scary.",
  },
  knight: { voice: "echo", instructions: "A brave, earnest young knight. Warm and steady, a little formal." },
  gunner: { voice: "coral", instructions: "A cocky, fast-talking sky-pirate captain. Bright and playful." },
  spellwright: { voice: "fable", instructions: "A tiny, very old, very proud scholar-wizard. Precise and a bit fussy." },
  titancaller: { voice: "shimmer", instructions: "A calm, warm, poetic summoner. Gentle, with quiet strength." },
};
