import test from "node:test";
import assert from "node:assert/strict";
import { syllables } from "../src/learn/syllables.js";
import { spellingHint } from "../src/learn/hints.js";
import { WORDS, parseWord } from "../src/content/words.js";
import { buildSpellTask } from "../src/learn/spelling.js";
import { createRng } from "../src/util/rng.js";

const split = (w) => syllables(w).join("-");

test("classroom syllable rules", () => {
  const cases = {
    // two consonants split, one consonant goes on, blends and digraphs stay together
    rabbit: "rab-bit", basket: "bas-ket", tiger: "ti-ger", secret: "se-cret", father: "fa-ther", pocket: "pock-et",
    hundred: "hun-dred", monster: "mon-ster", pumpkin: "pump-kin", equal: "e-qual", between: "be-tween",
    // silent e, consonant-le, -ed
    cake: "cake", cupcake: "cup-cake", inside: "in-side", table: "ta-ble", little: "lit-tle", pickle: "pick-le",
    jumped: "jumped", smiled: "smiled", landed: "lan-ded", centipede: "cen-ti-pede", direction: "di-rec-tion",
    // vowel teams and w/y
    friend: "friend", seaweed: "sea-weed", tower: "tow-er", royal: "roy-al", crayon: "cray-on", highway: "high-way",
    // base words stay whole before endings
    wishes: "wish-es", boxes: "box-es", berries: "ber-ries", fastest: "fast-est", biggest: "big-gest",
    happier: "hap-pi-er", funniest: "fun-ni-est", careful: "care-ful", darkness: "dark-ness", powerful: "pow-er-ful",
    quickly: "quick-ly", safely: "safe-ly", nation: "na-tion", impossible: "im-pos-si-ble",
  };
  for (const [word, want] of Object.entries(cases)) assert.equal(split(word), want, word);
});

test("every bank word splits back into itself", () => {
  for (const e of WORDS) {
    const { word } = parseWord(e.w);
    assert.equal(syllables(word).join(""), word, e.w);
  }
});

test("compound parts glue back into the word", () => {
  const compounds = WORDS.filter((e) => e.p === "compound");
  assert.ok(compounds.length > 0);
  for (const e of compounds) {
    assert.ok(Array.isArray(e.parts) && e.parts.length === 2, e.w);
    assert.equal(e.parts.join(""), parseWord(e.w).word, e.w);
  }
});

test("hints name the parts for compounds and prefixes", () => {
  const rng = createRng(3);
  const moon = buildSpellTask(WORDS.find((e) => e.w.replace(/[[\]]/g, "") === "moonlight"), 3, rng);
  assert.match(spellingHint(moon, { focusError: false }).text, /moon \+ light/);
  const prefix = WORDS.find((e) => e.p === "prefix" && e.w.startsWith("["));
  const task = buildSpellTask(prefix, 3, rng);
  assert.match(spellingHint(task, { focusError: false }).text, new RegExp(`${task.focus} \\+ ${task.after}`));
  const plain = buildSpellTask({ w: "bas[k]et", p: "closed", s: "", lvl: 1 }, 3, rng);
  assert.match(spellingHint(plain, { focusError: false }).text, /bas · ket/);
});
