// Who speaks and who listens: ElevenLabs, OpenAI or the browser. Pure, so
// it's tested (test/audio.test.js).

/** The voice roles a grown-up can pick a voice for. */
export const ROLES = ["droid", "trailer", "spelling", "narrator"];

/** The speakers with pre-recorded battle lines: Kit (the droid) and the four heroes. */
export const SPEAKERS = ["kit", "knight", "gunner", "spellwright", "titancaller"];

/** A speaking style → the speaker whose recordings and voice it uses. */
export const speakerFor = (style) => (style === "droid" ? "kit" : style);

/**
 * The order to try speech providers in. "auto" prefers ElevenLabs when its
 * key is set, then OpenAI, then the browser. A chosen provider still falls
 * back to the others (in that order) if it fails.
 */
export function providerOrder(settings = {}) {
  const has = { elevenlabs: Boolean(settings.elevenKey), openai: Boolean(settings.openaiKey), browser: true };
  const all = ["elevenlabs", "openai", "browser"];
  const pick = settings.voiceProvider;
  const first = all.includes(pick) && pick !== "auto" ? [pick] : [];
  return [...first, ...all.filter((p) => !first.includes(p))].filter((p) => has[p]);
}

/** Who turns push-to-talk into text: the same order, without the browser. */
export const listenOrder = (settings = {}) => providerOrder(settings).filter((p) => p !== "browser");

/** ElevenLabs' standard voices, for the pickers when the key can't list the library. */
export const PREMADE_VOICES = [
  { id: "Q8ZbQAANLFvLw8uPBR8d", name: "Robot", about: "Kit's recorded voice" },
  { id: "HIGUfNOdjuWQwwapnTRW", name: "Knight", about: "the Crystal Knight's recorded voice" },
  { id: "ouL9IsyrSnUkCmfnD02u", name: "Wizard", about: "the Spellwright's recorded voice" },
  { id: "4Vl3K2x290GidNvuaLm7", name: "Pirate", about: "Captain Jumble's recorded voice" },
  { id: "exsUS4vynmxd379XN4yO", name: "Beastkeeper", about: "Tamsin's recorded voice" },
  { id: "5AYcH1Cr8nW0XgDTtRI4", name: "Inspector", about: "Inspector Clamp's recorded voice" },
  { id: "NOpBlnGInO9m6vDvFkFC", name: "Keeper", about: "the lighthouse keeper's recorded voice" },
  { id: "wo6udizrrtpIxWGp2qJk", name: "Shopkeeper", about: "Honest Hal's recorded voice" },
  { id: "hbB2qXyS2GMyyZIZyhAH", name: "Baker", about: "the baker's recorded voice" },
  { id: "Bj9UqZbhQsanLzgalpEG", name: "Sword Master", about: "the Sword Master's recorded voice" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", about: "laid-back, dry, resonant" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", about: "deep, formal British" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", about: "bright, playful" },
  { id: "t0jbNlBVZ17f02VDIeMI", name: "Jessie", about: "raspy, old, theatrical" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", about: "warm, velvety British" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", about: "deep, resonant narrator" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", about: "clear, friendly" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", about: "warm British storyteller" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", about: "husky, mischievous" },
  { id: "z9fAnlkpzviPz146aGWa", name: "Glinda", about: "witchy, theatrical" },
];

/** Fallback voices if the audio manifest has none (same picks as tools/audio/sounds.json). */
const DEFAULT_VOICES = {
  kit: "Q8ZbQAANLFvLw8uPBR8d",
  trailer: "nPczCjzI2devNBz1zQrb",
  spelling: "XrExE9yKIg1WjnnlVkGX",
  narrator: "JBFqnCBsd6RMkjVDRZzb",
  knight: "HIGUfNOdjuWQwwapnTRW",
  gunner: "cgSgspJ2msm6clMCkdW9",
  spellwright: "ouL9IsyrSnUkCmfnD02u",
  titancaller: "pFZP5JQG7iQjIQuC4Bku",
  jumble: "4Vl3K2x290GidNvuaLm7",
  // chapter 2's cast (the Drain Engine's barks are Clamp's)
  beastkeeper: "exsUS4vynmxd379XN4yO",
  clamp: "5AYcH1Cr8nW0XgDTtRI4",
  keeper: "NOpBlnGInO9m6vDvFkFC",
  hal: "wo6udizrrtpIxWGp2qJk",
  baker: "hbB2qXyS2GMyyZIZyhAH",
  swordmaster: "Bj9UqZbhQsanLzgalpEG",
};

/**
 * The ElevenLabs voice, model and settings for a style. The grown-up's pick
 * wins, then the sound pack's choice, then the defaults. Live lines use the
 * model and settings the pack recorded that speaker with, so a line made on
 * the spot (a "Show me" hint) sounds like the recorded ones; without a pack,
 * Kit uses the fast model and the trailer, spelling and narrator voices the
 * richer one.
 */
export function elevenVoiceFor(style, settings = {}, manifestVoices = {}) {
  const who = speakerFor(style);
  const pack = manifestVoices[who] || {};
  const id = settings.elevenVoices?.[style] || pack.id || DEFAULT_VOICES[who] || DEFAULT_VOICES.kit;
  const model = pack.model || (style === "trailer" || style === "spelling" || style === "narrator" ? "eleven_multilingual_v2" : "eleven_flash_v2_5");
  return pack.settings ? { id, model, settings: pack.settings } : { id, model };
}

/** Whether a voice model performs audio tags like [warmly] (Eleven v3 and later), as in tools/audio/lib.mjs. */
export function readsTags(model) {
  const v = /^eleven_v(\d+)(?:_|$)/.exec(String(model || ""));
  return Boolean(v) && Number(v[1]) >= 3;
}

/** How a live line is performed when no one says otherwise: every line needs a tag, or it falls flat. */
const LIVE_TAGS = { droid: "[helpfully]", narrator: "[warmly]", trailer: "[booming epic movie-trailer announcer, slow and dramatic]" };

/**
 * The text a live line is sent as: its expression tag in front when the model
 * performs tags, and just the words when it would read the tag out loud.
 */
export function liveText(text, style, model, tag = LIVE_TAGS[style]) {
  return tag && readsTags(model) ? `${tag} ${text}` : text;
}

/**
 * Does this style have a voice to speak in live? The game's roles and the
 * cast with voices do (chapter 2's six were cast on 13 October). A speaker
 * with no voice of their own yet would play as text instead of in somebody
 * else's voice.
 */
export function hasVoice(style, settings = {}, manifestVoices = {}) {
  const who = speakerFor(style);
  return ROLES.includes(style) || Boolean(DEFAULT_VOICES[who] || manifestVoices[who]?.id || settings.elevenVoices?.[style]);
}

/** The pre-recorded file for a line, if there is one (exact text match). */
export function recordedLine(lines, style, text) {
  const t = String(text || "").trim();
  return lines?.[speakerFor(style)]?.[t] || null;
}
