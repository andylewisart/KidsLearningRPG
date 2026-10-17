import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lineHash, lineFile, soundFiles, validateSoundList, mergeManifest, planJobs, normalizeGain, readsTags, directedText, validateDirection, lineRecord, staleReason, formatMade, untagged, isPerformance } from "../tools/audio/lib.mjs";
import { allLines, unrecordedLines } from "../tools/audio/lines.mjs";
import { speakable } from "../src/content/pronounce.js";
import { providerOrder, listenOrder, elevenVoiceFor, recordedLine, liveText } from "../src/ai/providers.js";
import { BARKS, BANTER, BARK_MOMENTS, pickBark, banterFor } from "../src/content/barks.js";

const SOUNDS = JSON.parse(fs.readFileSync(new URL("../tools/audio/sounds.json", import.meta.url), "utf8"));
const MANIFEST = JSON.parse(fs.readFileSync(new URL("../public/assets/audio/manifest.json", import.meta.url), "utf8"));
const DIRECTION = JSON.parse(fs.readFileSync(new URL("../tools/audio/direction.json", import.meta.url), "utf8"));
const MADE = JSON.parse(fs.readFileSync(new URL("../tools/audio/made.json", import.meta.url), "utf8"));

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

test("live lines sound like the recorded ones: the pack's model and settings, with a tag", () => {
  const settings = { stability: 0.3, similarity_boost: 0.8 };
  const pack = { kit: { id: "packKit", model: "eleven_v4", settings } };
  assert.deepEqual(elevenVoiceFor("droid", {}, pack), { id: "packKit", model: "eleven_v4", settings });
  assert.equal(elevenVoiceFor("droid", { elevenVoices: { droid: "mine" } }, pack).model, "eleven_v4");
  assert.equal(liveText("Count the tens first.", "droid", "eleven_v4"), "[helpfully] Count the tens first.");
  assert.equal(liveText("Count the tens first.", "droid", "eleven_v4", "[patiently]"), "[patiently] Count the tens first.");
  assert.equal(liveText("Count the tens first.", "droid", "eleven_flash_v2_5"), "Count the tens first.", "a model that would read the tag aloud gets none");
  assert.equal(liveText("T-R-E-E", "spelling", "eleven_multilingual_v2"), "T-R-E-E");
  assert.equal(liveText("Tidebreaker rises! KRAKOOM!", "trailer", "eleven_v4"), "[booming epic movie-trailer announcer, slow and dramatic] Tidebreaker rises! KRAKOOM!", "his Titan entrances are performed, not read flat");
});

test("the sound pack tells live lines how each speaker was recorded", () => {
  for (const [who, v] of Object.entries(SOUNDS.voices)) {
    const packed = MANIFEST.voices[who];
    if (!packed) continue;
    assert.equal(packed.model, v.model, who);
    assert.deepEqual(packed.settings, v.settings, who);
  }
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
  // only the lines named in UNRECORDED (Kit's, waiting for budget) may play as text
  const waiting = unrecordedLines();
  for (const l of allLines()) if (!waiting.has(`${l.who}|${l.text}`)) assert.ok(MANIFEST.lines[l.who]?.[l.text], `not recorded: ${l.who}: ${l.text}`);
  const files = [...Object.values(MANIFEST.sounds).flatMap((s) => s.files), ...Object.values(MANIFEST.lines).flatMap((m) => Object.values(m))];
  for (const f of files) assert.ok(fs.existsSync(new URL(`../public/assets/audio/${f}`, import.meta.url)), `missing ${f}`);
  for (const s of Object.values(MANIFEST.sounds)) assert.equal(s.gains.length, s.files.length);
});

test("audio tags go only into what's sent to the voice, and only for models that perform them", () => {
  for (const m of ["eleven_v3", "eleven_v4", "eleven_v4_turbo"]) assert.ok(readsTags(m), m);
  for (const m of ["eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5", "eleven_v2_flash", undefined]) assert.equal(readsTags(m), false, String(m));
  const text = "Your song is beautiful.";
  assert.equal(directedText(text, "[warmly]", "eleven_v4"), "[warmly] Your song is beautiful.");
  assert.equal(directedText(text, "[warmly]", "eleven_multilingual_v2"), text, "an older model would read the tag out loud");
  assert.equal(directedText(text, undefined, "eleven_v4"), text);
  // the file and the manifest key still come from the real text, so the game finds the recording
  assert.equal(lineFile("knight", text), `voice/knight_${lineHash(text)}.mp3`);
});

test("direction.json problems are caught: stale lines, bad tags, missing tags", () => {
  const lines = [{ who: "knight", text: "Hail." }, { who: "knight", text: "Onward!" }, { who: "kit", text: "Hi." }];
  const voices = { knight: { model: "eleven_v4" }, kit: { model: "eleven_multilingual_v2" } };
  assert.deepEqual(validateDirection({ _about: "notes", knight: { "Hail.": "[proudly]", "Onward!": "[boldly] [laughs]" } }, lines, voices), []);
  const errors = validateDirection({ knight: { "Hail.": "proudly", "Old line.": "[warmly]" }, nobody: { "x": "[a]" } }, lines, voices);
  assert.ok(errors.some((e) => /no such line.*Old line/.test(e)), "a tag for a line that was rewritten or removed");
  assert.ok(errors.some((e) => /one or two \[tags\]/.test(e)), "a tag without brackets would be spoken");
  assert.ok(errors.some((e) => /nobody: no recorded lines/.test(e)));
  assert.ok(errors.some((e) => /no tag yet for "Onward!"/.test(e)), "a voice that performs tags needs one on every line");
  assert.ok(!errors.some((e) => /kit/.test(e)), "voices on older models don't need tags");
  assert.ok(validateDirection({ knight: { "Hail.": "[a] [b] [c]" } }, lines, voices).some((e) => /one or two/.test(e)), "at most two tags");
  assert.deepEqual(validateDirection({ knight: { "Hail.": "[angry menacing gravely sinister pirate]", "Onward!": "[boldly]" } }, lines, voices), [], "a tag can describe the voice");
});

// the parent's own performance of Jumble's ending line, as tested in ElevenLabs
const DIM = "Glued your little shards back together, crystal carriers? How adorable! But that charming harbor's lighthouse is looking a bit... dim.";
const DIM_PERFORMED = "[angry menacing gravely sinister pirate] Glued your little shards back together, crystal carriers? [scoffing] How adorable! But that charming harbor's lighthouse is looking a bit... [sinister] dim.";

test("a performance is the line with tags at its turns, sent as performed, with only its words respelled", () => {
  assert.ok(isPerformance(DIM_PERFORMED));
  assert.ok(!isPerformance("[warmly]") && !isPerformance("[relieved] [laughs]"), "tags alone go in front");
  assert.equal(untagged(DIM_PERFORMED), DIM, "every tag out and the spaces evened, it's the line");
  assert.equal(directedText(DIM, DIM_PERFORMED, "eleven_v4"), DIM_PERFORMED);
  assert.equal(directedText(DIM, DIM_PERFORMED, "eleven_multilingual_v2"), DIM, "an older model gets the plain words");
  assert.equal(directedText("Ahoy! Ha!", "  [booming pirate]   Ahoy!  [laughs]Ha! ", "eleven_v4"), "[booming pirate] Ahoy! [laughs]Ha!", "spaces evened out");
  // tricky names are respelled in the words, never in a tag (a tag isn't said)
  const geode = "The Geode Titan wakes.";
  assert.equal(directedText(geode, "[awed by the Geode] The Geode [roaring] Titan wakes.", "eleven_v4", speakable), "[awed by the Geode] The Jee-ode [roaring] Titan wakes.");
  assert.equal(directedText(geode, "[warmly]", "eleven_v4", speakable), "[warmly] The Jee-ode Titan wakes.");
  assert.equal(directedText(geode, "[warmly]", "eleven_multilingual_v2", speakable), "The Jee-ode Titan wakes.");
  assert.equal(directedText(geode, undefined, "eleven_v4", speakable), "The Jee-ode Titan wakes.");
  // the voice never says other words than the screen shows
  assert.throws(() => directedText(DIM, DIM_PERFORMED.replace("adorable", "cute"), "eleven_v4"), /aren't the line's/);
});

test("direction.json performances are checked: the line's exact words, a tag at the start, up to five tags", () => {
  const text = "Ahoy, crystal carriers! Captain Jumble, at your service!";
  const lines = [{ who: "jumble", text }, { who: "jumble", text: DIM }];
  const voices = { jumble: { model: "eleven_v4" } };
  const check = (d) => validateDirection({ jumble: { [text]: d, [DIM]: DIM_PERFORMED } }, lines, voices);
  const fails = (d, re, why) => assert.ok(check(d).some((e) => re.test(e)), `${why}: ${JSON.stringify(check(d))}`);
  assert.deepEqual(check("[grand theatrical gravelly sinister pirate] Ahoy, crystal carriers! [pompously] Captain Jumble, at your service!"), []);
  assert.deepEqual(check("[booming]  Ahoy, crystal carriers!   [pompously]Captain Jumble, at your service! [laughs]"), [], "spaces even out, and a tag can close the line");
  assert.deepEqual(check("[a] Ahoy, [b] crystal [c] carriers! [d] Captain Jumble, [e] at your service!"), [], "five tags");
  fails("[a] Ahoy, [b] crystal [c] carriers! [d] Captain [e] Jumble, [f] at your service!", /at most 5 \[tags\]/, "six tags");
  fails("[pirate] Ahoy, crystal carriers! Captain Jumble, at your service, landlubbers!", /exact text.*landlubbers/, "an added word");
  fails("[pirate] Ahoy crystal carriers! Captain Jumble, at your service!", /exact text/, "a dropped comma");
  fails("[pirate] AHOY, crystal carriers! Captain Jumble, at your service!", /exact text/, "a changed letter");
  fails("[pirate] Ahoy, crystal carriers! Captain Jumble, at your service", /exact text/, "the last ! dropped");
  fails("[pirate] Ahoy, crystal carriers! [Captain Jumble,] at your service!", /exact text/, "words in a tag aren't said");
  fails("[pirate] Ahoy, crystal carriers! [pompously Captain Jumble, at your service!", /exact text/, "an unclosed bracket would be read out");
  fails("Ahoy, crystal carriers! [pompously] Captain Jumble, at your service!", /starts with a \[tag\]/, "a flat start");
  fails(text, /starts with a \[tag\]/, "the bare line");
  fails("[Ha!] Ahoy, crystal carriers! Captain Jumble, at your service!", /isn't a tag/, "spoken words aren't a tag");
  fails(`[${"very ".repeat(12)}menacing] ${text}`, /isn't a tag/, "a tag of more than 60 characters");
  fails("[] Ahoy, crystal carriers! Captain Jumble, at your service!", /isn't a tag/, "an empty tag");
});

test("made.json keeps the whole performance, so changing any tag in it makes the line again", () => {
  const v4 = { id: "voiceA", model: "eleven_v4" };
  const made = lineRecord(v4, DIM_PERFORMED);
  assert.equal(made.tags, DIM_PERFORMED);
  assert.equal(staleReason(made, v4, DIM_PERFORMED), "");
  assert.equal(staleReason(made, v4, ` ${DIM_PERFORMED.replace("[scoffing] ", "[scoffing]   ")} `), "", "evening out the spaces isn't a change");
  assert.equal(staleReason(made, v4, DIM_PERFORMED.replace("[sinister]", "[menacing]")), "tags changed", "a tag inside the line");
  assert.equal(staleReason(made, v4, DIM_PERFORMED.replace("angry menacing", "furious")), "tags changed", "the voice described");
  assert.equal(staleReason(lineRecord(v4, "[mockingly]"), v4, DIM_PERFORMED), "tags changed", "tags in front, now a performance");
  assert.equal(staleReason(made, v4, "[mockingly]"), "tags changed", "and back");
  assert.equal(lineRecord({ id: "voiceA", model: "eleven_multilingual_v2" }, DIM_PERFORMED).tags, "", "an older model performs no tags");
});

test("every tag points at a real line, and every line of a voice that performs tags has one", () => {
  const problems = validateDirection(DIRECTION, allLines(), SOUNDS.voices);
  assert.deepEqual(problems, [], `tools/audio/direction.json:\n  ${problems.join("\n  ")}`);
  assert.ok(Object.keys(DIRECTION.knight || {}).length > 0, "Cade's lines are directed");
});

test("a recorded line is made again only when its voice, model or tags changed, or it has no record", () => {
  const v4 = { id: "voiceA", model: "eleven_v4" };
  const v2 = { id: "voiceA", model: "eleven_multilingual_v2" };
  const made = lineRecord(v4, "[warmly]");
  assert.deepEqual(made, { voice: "voiceA", model: "eleven_v4", tags: "[warmly]" });
  assert.equal(staleReason(made, v4, "[warmly]"), "", "a matching record is skipped");
  assert.equal(staleReason(made, v4, "[dryly]"), "tags changed");
  assert.equal(staleReason(made, v4, undefined), "tags changed", "a tag taken away is made again without it");
  assert.equal(staleReason(made, { ...v4, id: "voiceB" }, "[warmly]"), "voice changed");
  assert.equal(staleReason(lineRecord(v2), v4, "[warmly]"), "model changed", "moving a voice to v4 makes its old lines again");
  assert.equal(staleReason(undefined, v4, "[warmly]"), "no record");
  // tags only count for a model that performs them
  assert.deepEqual(lineRecord(v2, "[warmly]"), { voice: "voiceA", model: "eleven_multilingual_v2", tags: "" });
  assert.equal(staleReason(lineRecord(v2), v2, "[warmly]"), "");
  // a take already performed with its tag is kept while the speaker's other lines are still on the old model
  assert.equal(staleReason(made, v2, "[warmly]"), "");
  assert.equal(staleReason(made, v2, "[dryly]"), "model changed", "but not once its tag has changed");
  assert.equal(staleReason({ voice: "voiceA", model: "eleven_v3", tags: "[warmly]" }, v4, "[warmly]"), "model changed", "moving a tagged voice to a newer model makes its lines again");
});

test("made.json reads back, and records every recorded line", () => {
  const sample = { lines: { "voice/b.mp3": { voice: "x", model: "eleven_v4", tags: "[a]" }, "voice/a.mp3": { voice: "y", model: "eleven_multilingual_v2", tags: "" } } };
  const back = JSON.parse(formatMade(sample));
  assert.deepEqual(back.lines, sample.lines);
  assert.deepEqual(Object.keys(back.lines), ["voice/a.mp3", "voice/b.mp3"], "sorted, one per line");
  assert.ok(back._about);
  for (const [who, map] of Object.entries(MANIFEST.lines))
    for (const [text, file] of Object.entries(map)) {
      const rec = MADE.lines[file];
      assert.ok(rec, `no record of how ${file} was made (${who}: ${text})`);
      assert.ok(rec.voice && rec.model && typeof rec.tags === "string", `${file}: incomplete record`);
    }
  for (const file of Object.keys(MADE.lines)) assert.ok(fs.existsSync(new URL(`../public/assets/audio/${file}`, import.meta.url)), `record for a missing file: ${file}`);
});
