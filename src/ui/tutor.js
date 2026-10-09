// "Ask Kit": the AI tutor chat. Claude writes every word (streamed, and
// spoken sentence by sentence); OpenAI only does the voice and, with
// push-to-talk, turns his speech into text. Pictures the droid draws
// appear right in the chat.

import { h, deferred, onKeys } from "./dom.js";
import { renderVisual } from "./visuals.js";
import { portraitFor } from "./sprites.js";
import { sfx } from "./audio.js";
import { tutorReply } from "../ai/claude.js";
import { sentenceSpeaker, stopSpeaking, canListen, canTranscribe, startRecording, listen } from "../ai/voice.js";
import { getSave, update, spendUsage } from "../store/save.js";

const SORRY = {
  no_key: "My chat circuits aren't connected. A grown-up can connect them in the grown-ups corner.",
  bad_key: "My chat key isn't working. Ask a grown-up to check the grown-ups corner.",
  rate_limited: "Too many questions at once, even for me. Give it a few seconds.",
  network: "Lost the signal. Check the internet and try again.",
  limit: "I've talked so much today my speaker is warm. Let's use the built-in hints until tomorrow.",
  default: "Something fizzled in my circuits. Try asking again.",
};

/**
 * Open the chat for one problem. `context` is the problem data (see
 * ai/prompts.js tutorContext). Resolves when he closes it.
 */
export function openTutor(layer, { context, recap }) {
  const save = getSave();
  const droidName = save.names.droid || "Kit";
  const done = deferred();
  const messages = [{ role: "user", content: context }];
  const transcript = [];
  let busy = false;
  let controller = null;

  const chat = h("div.chat");
  const voiceReady = () => canListen() && canTranscribe();
  const input = h("input", {
    type: "text",
    placeholder: voiceReady() ? `Type to ${droidName}, or hold Space to talk…` : `Ask ${droidName} something…`,
    autocomplete: "off",
    spellcheck: false,
  });
  const send = h("button.btn", { onclick: () => submit(input.value) }, "Send");
  const talk = h("button.btn.ptt", { title: "Hold to talk (or hold Space)" }, "🎙 Hold to talk");
  const status = h("span");
  const win = h(
    "div.window.tutor",
    {},
    h(
      "div.head",
      {},
      h("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, h("div", { style: { width: "56px", height: "56px" } }, portraitFor("droid", "neutral")), h("h2", {}, `Ask ${droidName}`)),
      h("button.btn.small.gold", { onclick: () => close() }, "Back to the fight (Esc)"),
    ),
    h("div.chat-wrap", {}, h("div.problem-recap", {}, recap), chat),
    h("div.ask-row", {}, input, talk, send),
    h("div.foot-row", {}, status, h("span", {}, `${droidName} runs on Claude. Grown-ups can read these chats.`)),
  );
  win.style.gridTemplateRows = "auto 1fr auto auto";
  const dim = h("div.dimmer", { style: { zIndex: 88 } });
  layer.append(dim, win);
  setTimeout(() => input.focus(), 50);

  function bubble(cls, text = "") {
    const el = h(`div.msg.${cls}`, {}, text);
    chat.append(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  async function reply() {
    busy = true;
    status.textContent = `${droidName} is thinking…`;
    let el = bubble("kit-msg", "…");
    let text = "";
    let shown = ""; // text in the current bubble; a picture starts a new one below it
    const voice = sentenceSpeaker("droid");
    controller = new AbortController();
    try {
      if (!spendUsage("tutor", 150)) throw Object.assign(new Error("limit"), { code: "limit" });
      await tutorReply({
        key: save.settings.anthropicKey,
        droidName,
        messages,
        signal: controller.signal,
        onText(delta) {
          if (!el) {
            el = bubble("kit-msg");
            delta = delta.trimStart();
          }
          text += delta;
          shown += delta;
          el.textContent = shown;
          chat.scrollTop = chat.scrollHeight;
          voice.push(delta);
        },
        onVisual(spec) {
          const v = renderVisual(spec);
          if (v) {
            if (el && !shown) el.remove();
            chat.append(v);
            chat.scrollTop = chat.scrollHeight;
            el = null; // words after the picture go under it
            shown = "";
          }
        },
      });
      voice.done();
      if (el && !shown) el.remove();
      transcript.push({ who: "droid", text });
    } catch (err) {
      if (err.code !== "aborted") {
        el ||= bubble("kit-msg");
        el.textContent = SORRY[err.code] || SORRY.default;
        transcript.push({ who: "droid", text: el.textContent, error: err.code });
      }
    } finally {
      busy = false;
      status.textContent = "";
      controller = null;
    }
  }

  function submit(raw) {
    const text = String(raw || "").trim();
    if (!text || busy) return;
    input.value = "";
    stopSpeaking();
    bubble("me", text);
    transcript.push({ who: "kid", text });
    messages.push({ role: "user", content: text });
    reply();
  }

  // Push-to-talk: hold the button, or Space (in an empty box or outside it).
  let recording = null;
  let starting = false;
  let holding = false; // still held down? (he may let go before the mic is ready)
  async function startTalk() {
    holding = true;
    if (recording || starting || busy) return;
    if (!voiceReady()) {
      status.textContent = canTranscribe() ? "No microphone found." : "Voice needs an ElevenLabs or OpenAI key (grown-ups corner). Type instead!";
      return;
    }
    starting = true;
    try {
      stopSpeaking();
      const rec = await startRecording();
      if (!holding) {
        rec.cancel(); // let go while the mic was starting: that's a tap, not a talk
        status.textContent = "Hold it down while you talk.";
        return;
      }
      recording = rec;
      talk.classList.add("on");
      talk.textContent = "🎙 Listening… let go to send";
      sfx.select();
    } catch {
      status.textContent = "I can't hear you. A grown-up needs to allow the microphone.";
    } finally {
      starting = false;
    }
  }
  async function endTalk() {
    holding = false;
    if (!recording) return;
    const rec = recording;
    recording = null;
    talk.classList.remove("on");
    talk.textContent = "🎙 Hold to talk";
    status.textContent = "Listening back…";
    try {
      const blob = await rec.stop();
      if (blob.size < 2000) {
        status.textContent = "That was too short. Hold the button while you talk.";
        return;
      }
      const text = await listen(blob);
      status.textContent = "";
      if (text) submit(text);
      else status.textContent = "I didn't catch that. Try again?";
    } catch (err) {
      status.textContent = SORRY[err.code] || "I couldn't hear that one.";
    }
  }
  talk.addEventListener("mousedown", startTalk);
  talk.addEventListener("mouseup", endTalk);
  talk.addEventListener("mouseleave", endTalk);
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.code === "Space" && !input.value && voiceReady()) {
      e.preventDefault(); // an empty box: Space means talk
      if (!e.repeat) startTalk();
      return;
    }
    if (e.key === "Enter") submit(input.value);
    if (e.key === "Escape") close();
  });
  const offKeys = onKeys((e) => {
    if (e.key === "Escape") close();
    if (e.code === "Space" && document.activeElement !== input && !e.repeat) {
      e.preventDefault();
      startTalk();
    }
  });
  const onKeyUp = (e) => {
    if (e.code === "Space") endTalk();
  };
  window.addEventListener("keyup", onKeyUp);

  function close() {
    controller?.abort();
    holding = false; // a mic that's still starting cancels itself
    recording?.cancel();
    stopSpeaking();
    offKeys();
    window.removeEventListener("keyup", onKeyUp);
    win.remove();
    dim.remove();
    if (transcript.length) {
      update((s) => s.tutorLog.push({ t: Date.now(), recap, transcript }));
    }
    done.resolve();
  }

  reply(); // the droid opens the conversation
  return done.promise;
}
