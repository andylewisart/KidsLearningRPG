import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lineHash, lineFile, soundFiles, validateSoundList, mergeManifest, planJobs, normalizeGain } from "../tools/audio/lib.mjs";
import { allLines } from "../tools/audio/lines.mjs";
import { providerOrder, listenOrder, elevenVoiceFor, recordedLine } from "../src/ai/providers.js";
import { BARKS, BANTER, BARK_MOMENTS, pickBark, banterFor } from "../src/content/barks.js";

const SOUNDS = JSON.parse(fs.readFileSync(new URL("../tools/audio/sounds.json", import.meta.url), "utf8"));
const MANIFEST = JSON.parse(fs.readFileSync(new URL("../public/assets/audio/manifest.json", import.meta.url), "utf8"));

test("line hashes are short, stable and tell lines apart", () => {
  assert.match(lineHash("Hello."), /^[0-9a-f]{8}$/);
  assert.equal(lineHash("Hello."), lineHash("Hello."));
  assert.notEqual(lineHash("Hello."), lineHash("Hello!"));
  assert.equal(lineFile("kit", "Hello."), `voice/kit_${lineHash("Hello.")}.mp3`);
});

test("each variant of a sound gets its own file", () => {
  assert.deepEqual(soundFiles({ id: "sfx_hit", kind: "sfx", variants: 2 }), ["sfx/sfx_hit_1.mp3", "sfx/sfx_hit_2.mp3"]);
  assert.deepEqual(soundFiles({ id: "music_boss", kind: "music" }), ["music/music_boss.mp3"]);
  assert.deepEqual(soundFiles({ id: "amb_cove", kind: "ambience" }), ["ambience/amb_cove.mp3"]);
});

test("the sound list is valid, and bad entries are caught", () => {
  assert.deepEqual(validateSoundList(SOUNDS), []);
  assert.ok(validateSoundList({}).length);
  const bad = validateSoundList({
    sounds: [
      { id: "Bad Id", kind: "sfx", prompt: "x", seconds: 1 },
      { id: "a", kind: "sfx", prompt: "a sword like in Zelda", seconds: 1 },
      { id: "a", kind: "sfx", prompt: "x", seconds: 40 },
      { id: "m", kind: "music", prompt: "x", seconds: 1 },
      { id: "v", kind: "voice", prompt: "x", seconds: 1 },
    ],
  });
  assert.ok(bad.some((e) => /lower_snake_case/.test(e)));
  assert.ok(bad.some((e) => /franchise/.test(e)));
  assert.ok(bad.some((e) => /duplicate/.test(e)));
  assert.ok(bad.some((e) => /0\.5–30/.test(e)));
  assert.ok(bad.some((e) => /3–600/.test(e)));
  assert.ok(bad.some((e) => /kind must be/.test(e)));
});

test("merging the manifest keeps what's there and adds the new", () => {
  const base = { version: 1, sounds: { a: { files: ["a.mp3"] } }, voices: { kit: { id: "x" } }, lines: { kit: { "Hi.": "voice/kit_1.mp3" } } };
  const out = mergeManifest(base, { sounds: { b: { files: ["b.mp3"] } }, lines: { kit: { "Bye.": "voice/kit_2.mp3" }, knight: { "Hail.": "voice/knight_3.mp3" } } });
  assert.deepEqual(Object.keys(out.sounds), ["a", "b"]);
  assert.equal(out.voices.kit.id, "x");
  assert.deepEqual(Object.keys(out.lines.kit), ["Hi.", "Bye."]);
  assert.equal(out.lines.knight["Hail."], "voice/knight_3.mp3");
  assert.equal(base.lines.kit["Bye."], undefined, "the base isn't changed");
  assert.deepEqual(mergeManifest(undefined, {}), { version: 1, sounds: {}, voices: {}, lines: {} });
});

test("jobs run in credit order: effects, then music, then voices", () => {
  const jobs = planJobs(SOUNDS, [{ who: "knight", text: "Hail." }, { who: "kit", text: "Hi." }]);
  const kinds = jobs.map((j) => j.kind);
  assert.equal(kinds[0], "sfx");
  assert.ok(jobs.findIndex((j) => j.id === "music_battle") < jobs.findIndex((j) => j.id === "music_title"));
  assert.ok(kinds.lastIndexOf("music") < kinds.indexOf("voice"));
  assert.equal(jobs.at(-2).who, "kit", "Kit's lines before the heroes'");
  assert.equal(jobs.at(-1).who, "knight");
  assert.deepEqual(planJobs(SOUNDS, [], { ids: ["sfx_hurt_1"] }).map((j) => j.file), ["sfx/sfx_hurt_1.mp3"]);
  assert.ok(planJobs(SOUNDS, [], { only: ["music"] }).every((j) => j.kind === "music"));
});

test("loudness gains lift quiet clips without clipping", () => {
  assert.equal(normalizeGain(-16, -10, -16), 1);
  assert.ok(normalizeGain(-30, -20, -16) > 1);
  assert.ok(normalizeGain(-30, -2, -16) <= 1.13, "the peak stays under -1 dBFS");
  assert.ok(normalizeGain(-6, 0, -16) < 0.5);
  assert.equal(normalizeGain(-Infinity, -100, -16), 1);
});

test("speech providers: auto prefers ElevenLabs, and everything falls back", () => {
  assert.deepEqual(providerOrder({}), ["browser"]);
  assert.deepEqual(providerOrder({ openaiKey: "o" }), ["openai", "browser"]);
  assert.deepEqual(providerOrder({ elevenKey: "e", openaiKey: "o" }), ["elevenlabs", "openai", "browser"]);
  assert.deepEqual(providerOrder({ elevenKey: "e", openaiKey: "o", voiceProvider: "openai" }), ["openai", "elevenlabs", "browser"]);
  assert.deepEqual(providerOrder({ elevenKey: "e", voiceProvider: "browser" }), ["browser", "elevenlabs"]);
  assert.deepEqual(providerOrder({ voiceProvider: "elevenlabs" }), ["browser"], "no key, no ElevenLabs");
  assert.deepEqual(listenOrder({ elevenKey: "e", openaiKey: "o" }), ["elevenlabs", "openai"]);
  assert.deepEqual(listenOrder({}), []);
});

test("ElevenLabs voices: his pick, then the pack's, with the right model", () => {
  const pack = { kit: { id: "packKit" }, trailer: { id: "packTrailer" } };
  assert.deepEqual(elevenVoiceFor("droid", {}, pack), { id: "packKit", model: "eleven_flash_v2_5" });
  assert.deepEqual(elevenVoiceFor("trailer", {}, pack), { id: "packTrailer", model: "eleven_multilingual_v2" });
  assert.equal(elevenVoiceFor("droid", { elevenVoices: { droid: "mine" } }, pack).id, "mine");
  assert.ok(elevenVoiceFor("spelling", {}, {}).id, "a default when the pack has none");
});

test("recorded lines are found by exact text", () => {
  const lines = { kit: { "Hi there.": "voice/kit_1.mp3" } };
  assert.equal(recordedLine(lines, "droid", "Hi there."), "voice/kit_1.mp3");
  assert.equal(recordedLine(lines, "droid", " Hi there. "), "voice/kit_1.mp3");
  assert.equal(recordedLine(lines, "droid", "Hi there!"), null);
  assert.equal(recordedLine(lines, "trailer", "Hi there."), null);
  assert.equal(recordedLine(undefined, "droid", "x"), null);
});

test("every hero has 2–4 lines for every moment, in a real mood, with no names", () => {
  const moods = ["neutral", "laughing", "angry", "shocked", "smug", "worried"];
  for (const who of ["knight", "gunner", "spellwright", "titancaller"]) {
    for (const when of BARK_MOMENTS) {
      const n = BARKS.filter((b) => b.who === who && b.when === when).length;
      assert.ok(n >= 2 && n <= 4, `${who} ${when}: ${n} lines`);
    }
  }
  const everything = [...BARKS, ...BANTER.flatMap((x) => x.lines)];
  for (const b of everything) {
    assert.ok(moods.includes(b.mood), `${b.text}: mood ${b.mood}`);
    assert.doesNotMatch(b.text, /\b(Kit|Tidebreaker|Crystal Knight|Sky-Pirate|Titan Caller|Spellwright)\b|\$\{/, b.text);
    assert.ok(b.text.length <= 110, `short enough for a bubble: ${b.text}`);
  }
  assert.ok(BANTER.every((x) => x.lines.length === 2));
});

test("bark picking avoids repeats while it can", () => {
  const all = BARKS.filter((b) => b.who === "gunner" && b.when === "crit");
  const recent = new Set(all.slice(1).map((b) => b.text));
  assert.equal(pickBark("gunner", "crit", null, recent).text, all[0].text);
  assert.ok(pickBark("gunner", "crit", null, new Set(all.map((b) => b.text))), "falls back to a repeat");
  assert.equal(pickBark("nobody", "crit"), null);
  assert.ok(banterFor(["knight", "gunner"]).every((x) => x.lines.every((l) => ["knight", "gunner"].includes(l.who))));
});

test("the audio manifest covers every fixed line, and every file exists", () => {
  for (const l of allLines()) assert.ok(MANIFEST.lines[l.who]?.[l.text], `not recorded: ${l.who}: ${l.text}`);
  const files = [...Object.values(MANIFEST.sounds).flatMap((s) => s.files), ...Object.values(MANIFEST.lines).flatMap((m) => Object.values(m))];
  for (const f of files) assert.ok(fs.existsSync(new URL(`../public/assets/audio/${f}`, import.meta.url)), `missing ${f}`);
  for (const s of Object.values(MANIFEST.sounds)) assert.equal(s.gains.length, s.files.length);
});
