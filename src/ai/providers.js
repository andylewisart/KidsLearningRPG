// Who speaks and who listens: ElevenLabs, OpenAI or the browser. Pure, so
// it's tested (test/audio.test.js).

/** The voice roles a grown-up can pick a voice for. */
export const ROLES = ["droid", "trailer", "spelling", "narrator"];

/** The speakers with pre-recorded lines: Kit (the droid) and the four heroes. */
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
  kit: "CwhRBWXzGAHq8TQ4Fs17",
  trailer: "nPczCjzI2devNBz1zQrb",
  spelling: "XrExE9yKIg1WjnnlVkGX",
  narrator: "JBFqnCBsd6RMkjVDRZzb",
  knight: "onwK4e9ZLuTAKqWW03F9",
  gunner: "cgSgspJ2msm6clMCkdW9",
  spellwright: "t0jbNlBVZ17f02VDIeMI",
  titancaller: "pFZP5JQG7iQjIQuC4Bku",
};

/**
 * The ElevenLabs voice and model for a style. The grown-up's pick wins, then
 * the sound pack's choice, then the defaults. Kit's live lines use the fast
 * model; the trailer and spelling voices use the richer one.
 */
export function elevenVoiceFor(style, settings = {}, manifestVoices = {}) {
  const who = speakerFor(style);
  const id = settings.elevenVoices?.[style] || manifestVoices[who]?.id || DEFAULT_VOICES[who] || DEFAULT_VOICES.kit;
  const model = style === "trailer" || style === "spelling" || style === "narrator" ? "eleven_multilingual_v2" : "eleven_flash_v2_5";
  return { id, model };
}

/** The pre-recorded file for a line, if there is one (exact text match). */
export function recordedLine(lines, style, text) {
  const t = String(text || "").trim();
  return lines?.[speakerFor(style)]?.[t] || null;
}
