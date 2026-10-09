// Split a word into the chunks a 3rd grader would clap out, for "say it
// slowly" hints. These are the classroom rules (Utah 3.R.3.b), not a
// dictionary's: split between two consonants (rab-bit), before one
// consonant (ti-ger), keep digraphs and r/l blends together (se-cret),
// give a final consonant-le its own syllable (ta-ble), don't count a silent
// e, and keep a base word whole before -es, -est, -ful, -less, -ly, -ness
// and -ment. Without a pronunciation dictionary some splits are "open"
// where a dictionary says "closed" (le-mon), but the letters in each chunk
// are always right, which is what spelling needs.

const VOWELS = "aeiou";
const KEEP_BEFORE = ["ch", "sh", "th", "ph", "wh", "wr", "kn", "qu", "tw"]; // go with the next syllable: fa-ther, re-write, e-qual
const KEEP_AFTER = ["tch", "dge", "ght", "ck", "ng", "gh"]; // stay with this one: pock-et, sing-er, light-house
const BLENDS = new Set(["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr"]); // se-cret, a-pron
const ONSETS = new Set([...BLENDS, "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "squ", "str", "scr", "spr", "spl", "thr", "shr", ...KEEP_BEFORE]);
const SUFFIXES = ["ful", "less", "ly", "ness", "ment"];

const isVowel = (w, i) => (VOWELS.includes(w[i]) ? !(w[i] === "u" && w[i - 1] === "q") : w[i] === "y" && i > 0 && !VOWELS.includes(w[i - 1]));

/** The vowel sounds in a word, as [start, end) spans. */
function nuclei(w) {
  const out = [];
  for (let i = 0; i < w.length; ) {
    if (isVowel(w, i)) {
      let j = i + 1;
      while (j < w.length && isVowel(w, j)) j++;
      // happ-i-er, fun-ni-est: that "ie" is two sounds
      if (w.slice(i, j) === "ie" && /^(r|st)$/.test(w.slice(j)) && i > 0) {
        out.push([i, i + 1], [i + 1, j]);
      } else out.push([i, j]);
      i = j;
    } else i++;
  }
  return out.filter((n, k) => !silent(w, n, out[k - 1]));
}

/** A lone e that makes no sound of its own: cake, hope-ful, home-work, jumped. */
function silent(w, [s, e], prev) {
  if (!prev || e - s !== 1 || w[s] !== "e") return false;
  const rest = w.slice(e);
  const before = w.slice(prev[1], s);
  const stem = w.slice(0, s);
  if (rest === "") return before.length === 0 || !/[^aeiou]l$/.test(stem); // cake, but ta-ble
  if (rest === "d") return before.length > 0 && !/[td]$/.test(before) && !/[^aeiou]r$/.test(before); // jumped, but land-ed, hun-dred
  if (rest === "s") return before.length > 0 && !/(s|x|z|ch|sh|ge|ce)$/.test(stem); // cakes, but box-es
  // vowel-consonant-e inside a longer word: hope-ful, safe-ly, home-work,
  // but not cen-ti-pede, di-rec-tion or pow-er-ful
  if (before.length === 1 && prev[1] - prev[0] === 1 && w[prev[0]] !== "e" && !isVowel(w, e)) {
    if (SUFFIXES.includes(rest)) return true;
    return /^[^aeiouy][aeiouy]/.test(rest) && !/^[^aeiouy]e$/.test(rest);
  }
  return false;
}

/** Where to cut the consonants between two vowel sounds. Returns an index into w. */
function cut(w, startV, endV, nextV, last) {
  const cons = w.slice(endV, nextV); // may hold a silent e (hope-ful)
  if (last) {
    const tail = w.slice(nextV);
    if (nextV === w.length - 1 && /[^aeiou]le$/.test(w)) return cons.endsWith("ckl") ? nextV - 1 : nextV - 2; // ta-ble, lit-tle, pick-le
    if (tail === "es" && /(s|x|z|ch|sh)$/.test(w.slice(0, nextV))) return nextV; // wish-es, box-es
    if (tail === "est" && cons && !/^(.)\1$/.test(cons.replace(/(ll|ss|ff|zz)$/, "x"))) return nextV; // fast-est, small-est, but big-gest
    const suffix = SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length > endV && w.length - x.length <= nextV);
    if (suffix) return w.length - suffix.length; // dark-ness, care-ful, quick-ly
  }
  if (cons.length === 0) return endV; // li-on (when the vowels don't form a team)
  if (cons === "x") return nextV; // tax-i
  if (cons.length === 1) return /[wy]/.test(cons) && endV - startV === 1 ? nextV : endV; // ti-ger, but pow-er, roy-al (sea-weed stays)
  for (const d of KEEP_AFTER) if (cons.startsWith(d)) return endV + d.length; // pock-et, sing-er
  if (cons.length === 2) return KEEP_BEFORE.includes(cons) || BLENDS.has(cons) ? endV : endV + 1; // fa-ther, se-cret, rab-bit
  // three or more: the longest blend that can start a syllable goes to the next one (hun-dred, mon-ster)
  for (let k = Math.min(3, cons.length - 1); k >= 1; k--) {
    if (k === 1 || ONSETS.has(cons.slice(-k))) return nextV - k;
  }
  return endV + 1;
}

/** "basket" → ["bas", "ket"]. One-syllable words come back whole. */
export function syllables(word) {
  const w = String(word || "").toLowerCase();
  const ns = nuclei(w);
  if (ns.length <= 1) return [w];
  const parts = [];
  let from = 0;
  for (let k = 0; k < ns.length - 1; k++) {
    const at = Math.max(ns[k][1], Math.min(cut(w, ns[k][0], ns[k][1], ns[k + 1][0], k === ns.length - 2), ns[k + 1][0]));
    parts.push(w.slice(from, at));
    from = at;
  }
  parts.push(w.slice(from));
  return parts.filter(Boolean);
}
