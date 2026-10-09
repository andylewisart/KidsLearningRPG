// Claude (Haiku 5.5) writes the droid's words: the tutor chat and the
// summon judge. Calls go straight from the browser with the key saved in
// the grown-ups corner, so set a monthly spend limit on that API key.

import Anthropic from "@anthropic-ai/sdk";
import { TUTOR_MODEL, tutorSystem, SHOW_VISUAL_TOOL, validateVisual, JUDGE_SYSTEM, JUDGE_SCHEMA } from "./prompts.js";
import { MOVES, powerFromMoves } from "../learn/writing.js";

export class AIError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

let cached = { key: null, client: null };

function client(key) {
  if (!key) throw new AIError("no_key");
  if (cached.key !== key) {
    cached = { key, client: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 }) };
  }
  return cached.client;
}

function wrap(err) {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.APIUserAbortError || err?.name === "AbortError") return new AIError("aborted");
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new AIError("bad_key", err.message);
  if (err instanceof Anthropic.RateLimitError) return new AIError("rate_limited", err.message);
  if (err instanceof Anthropic.APIConnectionError) return new AIError("network", err.message);
  if (err instanceof Anthropic.APIError) return new AIError("api", err.message);
  return new AIError("default", err?.message);
}

/**
 * One droid reply in a tutor chat, streamed. `messages` is the whole chat
 * so far (first message = the problem data) and is extended in place
 * (append-only). Calls onText(delta) as words arrive and onVisual(spec)
 * when the droid draws something.
 */
export async function tutorReply({ key, droidName, messages, onText, onVisual, signal }) {
  const c = client(key);
  let parseRetries = 0;
  try {
    for (let round = 0; round < 4; round++) {
      const stream = c.messages.stream(
        {
          model: TUTOR_MODEL,
          max_tokens: 1024,
          system: tutorSystem(droidName),
          tools: [SHOW_VISUAL_TOOL],
          messages,
          output_config: { effort: "low" },
        },
        { signal },
      );
      stream.on("text", (delta) => onText?.(delta));
      let message;
      try {
        message = await stream.finalMessage();
        parseRetries = 0;
      } catch (err) {
        // Only a tool input that couldn't be parsed at all is worth retrying;
        // API errors (including a cancel) go straight up.
        if (err instanceof Anthropic.APIError || err?.name === "AbortError" || parseRetries++ >= 1) throw err;
        continue;
      }
      if (message.stop_reason === "refusal") {
        onText?.("My circuits fizzled on that one. Ask me a different way?");
        return messages;
      }
      messages.push({ role: "assistant", content: message.content });
      const uses = message.content.filter((b) => b.type === "tool_use");
      if (message.stop_reason !== "tool_use" || !uses.length) return messages;
      const results = uses.map((u) => {
        const spec = u.name === "show_visual" ? validateVisual(u.input) : null;
        if (spec) onVisual?.(spec);
        return spec
          ? { type: "tool_result", tool_use_id: u.id, content: "Shown on his screen." }
          : { type: "tool_result", tool_use_id: u.id, is_error: true, content: "That picture couldn't be drawn. Explain in words instead." };
      });
      messages.push({ role: "user", content: results });
    }
    return messages;
  } catch (err) {
    throw wrap(err);
  }
}

/**
 * Judge a Titan entrance. Returns { power, moves, fuzzy, praise, tip }.
 * Power comes from how many writing moves passed, so it can't drift.
 */
export async function judgeEntrance({ key, titanName, tier, text, frame, blanks }) {
  const c = client(key);
  const payload = { titan: titanName, tier, writing: text };
  if (frame) Object.assign(payload, { frame, his_blank_words: blanks });
  let response;
  try {
    response = await c.messages.create({
      model: TUTOR_MODEL,
      max_tokens: 1024,
      system: JUDGE_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      output_config: { effort: "low", format: { type: "json_schema", schema: JUDGE_SCHEMA } },
    });
  } catch (err) {
    throw wrap(err);
  }
  if (response.stop_reason === "refusal") throw new AIError("refused");
  const textBlock = response.content.find((b) => b.type === "text");
  let data;
  try {
    data = JSON.parse(textBlock?.text || "");
  } catch {
    throw new AIError("bad_reply");
  }
  const seen = new Set();
  const moves = (Array.isArray(data.moves) ? data.moves : []).filter((m) => {
    if (!m || !MOVES[m.id] || seen.has(m.id) || typeof m.quote !== "string") return false;
    seen.add(m.id);
    return true;
  });
  let power = powerFromMoves(moves.length);
  if (tier === 1 && power === "mega") power = "blaze"; // frames cap at Blaze
  return {
    power,
    moves,
    fuzzy: (Array.isArray(data.fuzzy) ? data.fuzzy : []).filter((x) => typeof x === "string").slice(0, 3),
    praise: String(data.praise || ""),
    tip: String(data.tip || ""),
  };
}

/** A free check that the key works (listing models costs nothing). */
export async function checkClaudeKey(key) {
  try {
    await client(key).models.list();
    return "ok";
  } catch (err) {
    const e = wrap(err);
    return e.code === "bad_key" || e.code === "no_key" ? "bad" : "unreachable";
  }
}
