// Every skill the game tracks, with the Utah standard it practices.
// Ladders list each hero's skills from easiest to hardest; the mastery
// model walks up them as he improves (see mastery.js).

import { PATTERNS } from "../content/words.js";

export const SKILLS = {
  // Knight: subtract within 1,000 (3.NBT.2), with grade 1 and 2 rungs underneath
  // for a younger player (players.js sets each player's grade per subject).
  "sub.10": { track: "sub", label: "Taking away within 10", standard: "1.OA.6", example: "9 − 4" },
  "sub.tens": { track: "sub", label: "Taking away tens", standard: "1.NBT.6", example: "70 − 30" },
  "sub.facts": { track: "sub", label: "Subtraction facts to 20", standard: "2.OA.2", example: "14 − 6" },
  "sub.2d1d": { track: "sub", label: "2-digit minus 1-digit", standard: "2.NBT.5", example: "47 − 5" },
  "sub.2d": { track: "sub", label: "2-digit subtraction", standard: "3.NBT.2", example: "68 − 23" },
  "sub.2d.regroup": { track: "sub", label: "2-digit with regrouping", standard: "3.NBT.2", example: "52 − 27" },
  "sub.3d": { track: "sub", label: "3-digit subtraction", standard: "3.NBT.2", example: "586 − 243" },
  "sub.3d.regroup": { track: "sub", label: "3-digit, regroup once", standard: "3.NBT.2", example: "532 − 218" },
  "sub.3d.regroup2": { track: "sub", label: "3-digit, regroup twice", standard: "3.NBT.2", example: "645 − 378" },
  "sub.3d.zeros": { track: "sub", label: "Subtracting across zeros", standard: "3.NBT.2", example: "403 − 156" },

  // Healing: add within 1,000 (3.NBT.2), with grade 1 and 2 rungs underneath.
  "add.10": { track: "add", label: "Adding within 10", standard: "1.OA.6", example: "6 + 3" },
  "add.tens": { track: "add", label: "Adding tens", standard: "1.NBT.4", example: "40 + 30" },
  "add.facts": { track: "add", label: "Addition facts to 20", standard: "2.OA.2", example: "8 + 7" },
  "add.2d1d": { track: "add", label: "2-digit plus 1-digit", standard: "2.NBT.5", example: "36 + 7" },
  "add.2d": { track: "add", label: "2-digit addition", standard: "3.NBT.2", example: "34 + 25" },
  "add.2d.regroup": { track: "add", label: "2-digit with regrouping", standard: "3.NBT.2", example: "47 + 38" },
  "add.3d": { track: "add", label: "3-digit addition", standard: "3.NBT.2", example: "312 + 245" },
  "add.3d.regroup": { track: "add", label: "3-digit, regroup once", standard: "3.NBT.2", example: "356 + 228" },
  "add.3d.regroup2": { track: "add", label: "3-digit, regroup twice", standard: "3.NBT.2", example: "478 + 265" },

  // Gunner: multiply and divide within 100 (3.OA), multiples of 10 (3.NBT.3).
  // Underneath, 2nd grade's road into multiplying: counting by tens, skip
  // counting, and equal groups as repeated addition.
  "mul.count10": { track: "mul", label: "Counting by tens", standard: "1.NBT.5", example: "30, 40, 50, ?" },
  "mul.skip": { track: "mul", label: "Skip counting by 2s, 5s, 10s", standard: "2.NBT.2", example: "5, 10, 15, ?" },
  "mul.groups": { track: "mul", label: "Equal groups (adding)", standard: "2.OA.4", example: "4 + 4 + 4" },
  "mul.easy": { track: "mul", label: "× 0, 1, 2, 5, 10", standard: "3.OA.7.b", example: "5 × 7" },
  "mul.34": { track: "mul", label: "× 3 and × 4", standard: "3.OA.7.b", example: "4 × 6" },
  "div.easy": { track: "mul", label: "÷ 2, 5, 10", standard: "3.OA.7.a", example: "35 ÷ 5" },
  "mul.69": { track: "mul", label: "× 6 and × 9", standard: "3.OA.7.b", example: "9 × 7" },
  "div.34": { track: "mul", label: "÷ 3 and ÷ 4", standard: "3.OA.7.a", example: "24 ÷ 3" },
  "mul.78": { track: "mul", label: "× 7 and × 8", standard: "3.OA.7.b", example: "7 × 8" },
  "mul.tens": { track: "mul", label: "× multiples of 10", standard: "3.NBT.3", example: "6 × 40" },
  "div.hard": { track: "mul", label: "÷ 6, 7, 8, 9", standard: "3.OA.7.a", example: "56 ÷ 8" },
  "mul.unknown": { track: "mul", label: "Missing factor", standard: "3.OA.4", example: "8 × ? = 48" },

  // Spellwright: one skill per spelling pattern (see content/words.js).
  "spell.short": { track: "spell", pattern: "short", label: "Short vowels", standard: "1.R.3" },
  "spell.digraph": { track: "spell", pattern: "digraph", label: "sh, ch, th, wh, ck", standard: "1.R.3" },
  "spell.blend": { track: "spell", pattern: "blend", label: "Blends", standard: "1.R.3" },
  "spell.sight": { track: "spell", pattern: "sight", label: "Sight words", standard: "1.R.3" },
  "spell.compound": { track: "spell", pattern: "compound", label: "Compound words", standard: "2.R.3" },
  "spell.closed": { track: "spell", pattern: "closed", label: "Closed syllables", standard: "3.R.3.b" },
  "spell.vce": { track: "spell", pattern: "vce", label: "Silent-e syllables", standard: "3.R.3.b" },
  "spell.open": { track: "spell", pattern: "open", label: "Open syllables", standard: "3.R.3.b" },
  "spell.vteam": { track: "spell", pattern: "vteam", label: "Vowel teams", standard: "3.R.3.b" },
  "spell.rcontrolled": { track: "spell", pattern: "rcontrolled", label: "Vowel + r", standard: "3.R.3.b" },
  "spell.digraph_review": { track: "spell", pattern: "digraph_review", label: "ph, ch, tch, dge", standard: "2.R.3" },
  "spell.silent_review": { track: "spell", pattern: "silent_review", label: "Silent letters", standard: "2.R.3" },
  "spell.diphthong_review": { track: "spell", pattern: "diphthong_review", label: "oi, oy, ou, ow, au, aw", standard: "2.R.3" },
  "spell.cle": { track: "spell", pattern: "cle", label: "Consonant + le", standard: "3.R.3.b" },
  "spell.suffix_es_ies": { track: "spell", pattern: "suffix_es_ies", label: "Plurals: -es, -ies", standard: "3.R.3.c" },
  "spell.suffix_ing_ed": { track: "spell", pattern: "suffix_ing_ed", label: "Adding -ing and -ed", standard: "3.R.3.c" },
  "spell.suffix_er_est": { track: "spell", pattern: "suffix_er_est", label: "Adding -er and -est", standard: "3.R.3.c" },
  "spell.prefix": { track: "spell", pattern: "prefix", label: "Prefixes", standard: "3.R.3.c" },
  "spell.suffix_ful_less": { track: "spell", pattern: "suffix_ful_less", label: "-ful, -less, -ly, -ness", standard: "3.R.3.c" },
  "spell.suffix_tion": { track: "spell", pattern: "suffix_tion", label: "-tion", standard: "3.R.3.c" },
  "spell.schwa": { track: "spell", pattern: "schwa", label: "Hidden-sound syllables", standard: "3.R.3.d" },
  "spell.irregular": { track: "spell", pattern: "irregular", label: "Wild words", standard: "3.R.3.e" },
  "spell.school": { track: "spell", pattern: "school", label: "This week's school list", standard: "3.R.3" },

  // Titan Caller: word choice (3.R.8) and narrative writing (3.W.3). Underneath,
  // for a younger player: pick the word that fits, finish a sentence, then
  // write a sentence of her own.
  "write.pick": { track: "write", label: "Picking the word that fits", standard: "1.R.8" },
  "write.finish": { track: "write", label: "Finishing a sentence", standard: "1.W.3" },
  "write.own": { track: "write", label: "A sentence of my own", standard: "2.W.3" },
  "write.choose": { track: "write", label: "Picking the power word", standard: "3.R.8" },
  "write.words": { track: "write", label: "Power words (strong verbs)", standard: "3.R.8" },
  "write.sentence": { track: "write", label: "Vivid sentences", standard: "3.W.3" },
  "write.entrance": { track: "write", label: "Titan entrances (descriptive writing)", standard: "3.W.3" },
};

// Spelling skills show the word bank's pattern names, so every screen agrees.
for (const skill of Object.values(SKILLS)) if (skill.pattern && PATTERNS[skill.pattern]) skill.label = PATTERNS[skill.pattern].label;

// Each skill's grade comes from its Utah code: "2.NBT.5" is 2nd grade.
for (const skill of Object.values(SKILLS)) skill.grade = skill.standard.startsWith("K") ? 0 : parseInt(skill.standard, 10);

export const LADDERS = {
  sub: ["sub.10", "sub.tens", "sub.facts", "sub.2d1d", "sub.2d", "sub.2d.regroup", "sub.3d", "sub.3d.regroup", "sub.3d.regroup2", "sub.3d.zeros"],
  add: ["add.10", "add.tens", "add.facts", "add.2d1d", "add.2d", "add.2d.regroup", "add.3d", "add.3d.regroup", "add.3d.regroup2"],
  mul: ["mul.count10", "mul.skip", "mul.groups", "mul.easy", "mul.34", "div.easy", "mul.69", "div.34", "mul.78", "mul.tens", "div.hard", "mul.unknown"],
  spell: [
    "spell.short",
    "spell.digraph",
    "spell.blend",
    "spell.sight",
    "spell.compound",
    "spell.closed",
    "spell.vce",
    "spell.open",
    "spell.vteam",
    "spell.rcontrolled",
    "spell.digraph_review",
    "spell.silent_review",
    "spell.diphthong_review",
    "spell.cle",
    "spell.suffix_es_ies",
    "spell.suffix_ing_ed",
    "spell.suffix_er_est",
    "spell.prefix",
    "spell.suffix_ful_less",
    "spell.suffix_tion",
    "spell.schwa",
    "spell.irregular",
  ],
  write: ["write.pick", "write.finish", "write.own", "write.choose", "write.words", "write.sentence"],
};

/** What each track is called on the grown-ups' screens (addition and subtraction share some skill names). */
export const TRACK_NAMES = { sub: "Subtraction", add: "Addition", mul: "Multiplying and dividing", spell: "Spelling", write: "Writing" };

/** Skill summary rows (mastery.summary()) in teaching order: by track, easiest first. */
export function inTeachingOrder(rows) {
  const tracks = Object.keys(TRACK_NAMES);
  const rank = (r) => [tracks.indexOf(r.track) < 0 ? 99 : tracks.indexOf(r.track), (LADDERS[r.track] || []).indexOf(r.id)];
  return [...rows].sort((a, b) => {
    const [ta, la] = rank(a);
    const [tb, lb] = rank(b);
    return ta - tb || (la < 0 ? 99 : la) - (lb < 0 ? 99 : lb) || a.id.localeCompare(b.id);
  });
}

// Where a typical Utah 3rd grader is in October, so the first battle
// starts close to the right level. Real answers take over quickly.
// startingGuess() below moves it for a player set to another grade.
export const STARTING_GUESS = {
  "sub.facts": 0.85,
  "sub.2d": 0.85,
  "sub.2d.regroup": 0.6,
  "sub.3d": 0.7,
  "sub.3d.regroup": 0.4,
  "sub.3d.regroup2": 0.3,
  "sub.3d.zeros": 0.2,
  "add.facts": 0.9,
  "add.2d": 0.9,
  "add.2d.regroup": 0.75,
  "add.3d": 0.75,
  "add.3d.regroup": 0.5,
  "add.3d.regroup2": 0.4,
  "mul.easy": 0.7,
  "mul.34": 0.45,
  "div.easy": 0.4,
  "mul.69": 0.3,
  "div.34": 0.25,
  "mul.78": 0.2,
  "mul.tens": 0.2,
  "div.hard": 0.15,
  "mul.unknown": 0.15,
  "spell.compound": 0.85,
  "spell.closed": 0.75,
  "spell.vce": 0.7,
  "spell.open": 0.6,
  "spell.vteam": 0.5,
  "spell.rcontrolled": 0.5,
  "spell.digraph_review": 0.5,
  "spell.silent_review": 0.45,
  "spell.diphthong_review": 0.45,
  "spell.cle": 0.4,
  "spell.suffix_es_ies": 0.4,
  "spell.suffix_ing_ed": 0.35,
  "spell.suffix_er_est": 0.35,
  "spell.prefix": 0.35,
  "spell.suffix_ful_less": 0.3,
  "spell.suffix_tion": 0.25,
  "spell.schwa": 0.2,
  "spell.irregular": 0.3,
  "spell.school": 0.3,
  "write.choose": 0.6,
  "write.words": 0.4,
  "write.sentence": 0.3,
  "write.entrance": 0.3,
};

const BELOW = 0.95; // a rung below his grade: taken as known
const ABOVE = 0.15; // a rung above it: not yet
const LIFT = 0.35; // a 4th grader is that much surer of the 3rd-grade rungs

/**
 * Where a player starts on a skill, given their grade in its subject
 * (0 = kindergarten … 4). Rungs below the grade start solid, rungs above
 * start new, and the rungs of their own grade ramp down from just under
 * "solid", so ★★ starts on the first rung of their grade. A 3rd grader
 * keeps STARTING_GUESS, which was tuned for one.
 */
export function startingGuess(id, grade = 3) {
  const skill = SKILLS[id];
  if (!skill) return 0.5;
  if (grade === 3 && id in STARTING_GUESS) return STARTING_GUESS[id];
  if (skill.grade < grade) return grade === 4 && id in STARTING_GUESS ? Math.min(BELOW, STARTING_GUESS[id] + LIFT) : BELOW;
  if (skill.grade > grade) return ABOVE;
  const rungs = (LADDERS[skill.track] || []).filter((x) => SKILLS[x].grade === grade);
  const i = Math.max(0, rungs.indexOf(id));
  return 0.8 - (0.5 * i) / Math.max(1, rungs.length - 1);
}

/** Skills whose standard says "from memory": speed matters for mastery. */
export const MEMORY_SKILLS = new Set(["mul.easy", "mul.34", "mul.69", "mul.78", "sub.facts", "add.facts"]);
