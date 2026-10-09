// Every skill the game tracks, with the Utah standard it practices.
// Ladders list each hero's skills from easiest to hardest; the mastery
// model walks up them as he improves (see mastery.js).

import { PATTERNS } from "../content/words.js";

export const SKILLS = {
  // Knight: subtract within 1,000 (3.NBT.2), with the grade-2 facts underneath.
  "sub.facts": { track: "sub", label: "Subtraction facts to 20", standard: "2.OA.2", example: "14 − 6" },
  "sub.2d": { track: "sub", label: "2-digit subtraction", standard: "3.NBT.2", example: "68 − 23" },
  "sub.2d.regroup": { track: "sub", label: "2-digit with regrouping", standard: "3.NBT.2", example: "52 − 27" },
  "sub.3d": { track: "sub", label: "3-digit subtraction", standard: "3.NBT.2", example: "586 − 243" },
  "sub.3d.regroup": { track: "sub", label: "3-digit, regroup once", standard: "3.NBT.2", example: "532 − 218" },
  "sub.3d.regroup2": { track: "sub", label: "3-digit, regroup twice", standard: "3.NBT.2", example: "645 − 378" },
  "sub.3d.zeros": { track: "sub", label: "Subtracting across zeros", standard: "3.NBT.2", example: "403 − 156" },

  // Healing: add within 1,000 (3.NBT.2).
  "add.facts": { track: "add", label: "Addition facts to 20", standard: "2.OA.2", example: "8 + 7" },
  "add.2d": { track: "add", label: "2-digit addition", standard: "3.NBT.2", example: "34 + 25" },
  "add.2d.regroup": { track: "add", label: "2-digit with regrouping", standard: "3.NBT.2", example: "47 + 38" },
  "add.3d": { track: "add", label: "3-digit addition", standard: "3.NBT.2", example: "312 + 245" },
  "add.3d.regroup": { track: "add", label: "3-digit, regroup once", standard: "3.NBT.2", example: "356 + 228" },
  "add.3d.regroup2": { track: "add", label: "3-digit, regroup twice", standard: "3.NBT.2", example: "478 + 265" },

  // Gunner: multiply and divide within 100 (3.OA), multiples of 10 (3.NBT.3).
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

  // Titan Caller: word choice (3.R.8) and narrative writing (3.W.3).
  "write.choose": { track: "write", label: "Picking the power word", standard: "3.R.8" },
  "write.words": { track: "write", label: "Power words (strong verbs)", standard: "3.R.8" },
  "write.sentence": { track: "write", label: "Vivid sentences", standard: "3.W.3" },
  "write.entrance": { track: "write", label: "Titan entrances (descriptive writing)", standard: "3.W.3" },
};

// Spelling skills show the word bank's pattern names, so every screen agrees.
for (const skill of Object.values(SKILLS)) if (skill.pattern && PATTERNS[skill.pattern]) skill.label = PATTERNS[skill.pattern].label;

export const LADDERS = {
  sub: ["sub.facts", "sub.2d", "sub.2d.regroup", "sub.3d", "sub.3d.regroup", "sub.3d.regroup2", "sub.3d.zeros"],
  add: ["add.facts", "add.2d", "add.2d.regroup", "add.3d", "add.3d.regroup", "add.3d.regroup2"],
  mul: ["mul.easy", "mul.34", "div.easy", "mul.69", "div.34", "mul.78", "mul.tens", "div.hard", "mul.unknown"],
  spell: [
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
  write: ["write.choose", "write.words", "write.sentence"],
};

// Where a typical Utah 3rd grader is in October, so the first battle
// starts close to the right level. Real answers take over quickly.
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

/** Skills whose standard says "from memory": speed matters for mastery. */
export const MEMORY_SKILLS = new Set(["mul.easy", "mul.34", "mul.69", "mul.78", "sub.facts", "add.facts"]);
