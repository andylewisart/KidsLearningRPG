// The Titan Caller's Word Lash: word choice as a weapon (Utah 3.R.8 word
// meanings, 3.W.3 descriptive writing).
//   ★   pick the strongest word for the sentence
//   ★★  swap a plain verb for a power word
//   ★★★ write one vivid sentence about the fiend

export const POWER_WORDS = [
  { sentence: "The titan ___ across the beach.", choices: ["went", "stomped", "moved"], best: "stomped" },
  { sentence: "The raptor ___ at the Knight.", choices: ["lunged", "went", "got"], best: "lunged" },
  { sentence: "Lightning ___ from the jelly's tendrils.", choices: ["came", "crackled", "was"], best: "crackled" },
  { sentence: "The beetle ___ into the stone wall.", choices: ["slammed", "went", "touched"], best: "slammed" },
  { sentence: "The airship ___ through the storm.", choices: ["went", "moved", "rocketed"], best: "rocketed" },
  { sentence: "The slime ___ down the temple steps.", choices: ["oozed", "went", "was"], best: "oozed" },
  { sentence: "The drone ___ over the jungle.", choices: ["screeched", "went", "got"], best: "screeched" },
  { sentence: "Waves ___ against the dock.", choices: ["were", "smashed", "went"], best: "smashed" },
  { sentence: "The volcano ___ into the night sky.", choices: ["erupted", "went", "did"], best: "erupted" },
  { sentence: "The Gunner ___ behind a crate.", choices: ["got", "dove", "went"], best: "dove" },
  { sentence: "The geode titan ___ its crystal club.", choices: ["swung", "moved", "had"], best: "swung" },
  { sentence: "The pirate ship ___ in the whirlpool.", choices: ["went", "spun", "was"], best: "spun" },
  { sentence: "A seagull ___ the droid's hat.", choices: ["got", "snatched", "took"], best: "snatched" },
  { sentence: "The ruins ___ under the titan's feet.", choices: ["crumbled", "went", "were"], best: "crumbled" },
  { sentence: "The Spellwright's runes ___ in the dark.", choices: ["blazed", "were", "went"], best: "blazed" },
  { sentence: "The kraken ___ the whole rowboat.", choices: ["swallowed", "got", "ate"], best: "swallowed" },
];

export const PLAIN_SENTENCES = [
  { sentence: "The raptor went toward the ship.", plain: "went" },
  { sentence: "The jelly moved closer to the heroes.", plain: "moved" },
  { sentence: "The titan got out of the sea.", plain: "got" },
  { sentence: "The beetle came at the Knight.", plain: "came" },
  { sentence: "The slime went over the treasure chest.", plain: "went" },
  { sentence: "The drone moved over the temple.", plain: "moved" },
  { sentence: "The waves hit the dock.", plain: "hit" },
  { sentence: "The titan made a noise.", plain: "made" },
  { sentence: "The airship went into the clouds.", plain: "went" },
  { sentence: "The Knight's sword went through the vine.", plain: "went" },
];

const PLAIN_VERBS = new Set(
  "went go goes going got get gets came come comes moved move moves did do does made make makes was is were be been had has have hit hits touched touch walked walk ran run said".split(" "),
);

/** ★★: is his replacement a real upgrade? One word, letters only, not another plain verb. */
export function isPowerWord(answer, plain) {
  const w = String(answer || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z]{3,16}$/.test(w)) return false;
  if (w === plain || PLAIN_VERBS.has(w)) return false;
  return true;
}
