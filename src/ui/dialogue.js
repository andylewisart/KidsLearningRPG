// The dialogue box for the adventure: who's talking (a portrait in the right
// mood, and their name), what they say (typed out, and read aloud in their
// voice), and sometimes a choice. Click, Space or Enter to go on; while a
// line is still typing, the first press shows all of it.

import { h, deferred, onKeys } from "./dom.js";
import { sfx } from "./audio.js";
import { portraitFor, assetInfo } from "./sprites.js";
import { speak, stopSpeaking } from "../ai/voice.js";
import { CLASSES } from "../battle/data.js";
import { getSave } from "../store/save.js";

const HEROES = ["knight", "gunner", "spellwright", "titancaller"];

/** The name shown for a speaker. */
export function speakerName(who) {
  const names = getSave()?.names || {};
  if (who === "kit") return names.droid || "Kit";
  if (HEROES.includes(who)) return names[who] || CLASSES[who].hero;
  if (who === "jumble") return "Captain Jumble";
  return "";
}

/** The voice a speaker uses (see ai/providers.js). */
const voiceFor = (who) => (who === "kit" ? "droid" : who);

function face(who, mood) {
  if (who === "kit") return portraitFor("droid", mood);
  if (HEROES.includes(who)) return portraitFor(who, mood);
  if (who === "jumble" && assetInfo("npc_jumble")?.portraits?.src) return portraitFor("jumble", mood);
  if (who === "jumble") {
    // a stand-in until Codex paints him: a ghostly hat and plume
    const el = h("div.face-svg");
    el.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><radialGradient id="jg"><stop offset="0" stop-color="#9fffe0" stop-opacity="0.9"/><stop offset="1" stop-color="#2fd6a8" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="56" r="40" fill="url(#jg)"/><path d="M14 46 Q50 20 86 46 Q70 40 50 44 Q30 40 14 46Z" fill="#6a3fa0" stroke="#e8d2ff" stroke-width="2"/><path d="M60 30 q18 -22 30 -6 q-14 -2 -30 6z" fill="#fff"/><ellipse cx="50" cy="64" rx="18" ry="20" fill="#bfffe9" opacity="0.85"/><circle cx="43" cy="60" r="3" fill="#123"/><circle cx="57" cy="60" r="3" fill="#123"/><path d="M36 72 q7 -6 14 0 q7 -6 14 0" stroke="#123" stroke-width="3" fill="none"/></svg>`;
    return el;
  }
  return null;
}

/**
 * Make a dialogue box on `layer`. Returns { say(line), choose(options), close() }.
 * A line is { who, mood, text }; who "narrator" has no face or name.
 */
export function createDialogue(layer) {
  const faceBox = h("div.dlg-face");
  const nameEl = h("div.dlg-name");
  const textEl = h("div.dlg-text");
  const choicesEl = h("div.dlg-choices");
  const more = h("div.dlg-more", {}, "▼");
  const box = h("div.window.dialogue", { style: { display: "none" } }, faceBox, h("div.dlg-body", {}, nameEl, textEl, choicesEl), more);
  layer.append(box);

  let typing = null;
  let advance = null;

  function onPress() {
    if (typing) {
      typing.finish();
      return;
    }
    if (advance) {
      const d = advance;
      advance = null;
      d.resolve();
    }
  }
  box.addEventListener("click", onPress);
  const off = onKeys((e) => {
    if (box.style.display === "none") return;
    if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
      e.preventDefault();
      onPress();
    }
  });

  function typeOut(text) {
    textEl.textContent = "";
    more.style.visibility = "hidden";
    let i = 0;
    return new Promise((resolve) => {
      const step = () => {
        i = Math.min(text.length, i + 2);
        textEl.textContent = text.slice(0, i);
        if (i >= text.length) return done();
        timer = setTimeout(step, 28);
      };
      const done = () => {
        clearTimeout(timer);
        textEl.textContent = text;
        typing = null;
        more.style.visibility = "visible";
        resolve();
      };
      let timer = setTimeout(step, 28);
      typing = { finish: done };
    });
  }

  async function say({ who, mood = "neutral", text }) {
    box.style.display = "flex";
    box.classList.toggle("narrator", who === "narrator");
    box.classList.toggle("ghost", who === "jumble");
    const f = who === "narrator" ? null : face(who, mood);
    faceBox.replaceChildren(...(f ? [f] : []));
    faceBox.style.display = f ? "block" : "none";
    nameEl.textContent = speakerName(who);
    nameEl.style.display = nameEl.textContent ? "block" : "none";
    choicesEl.replaceChildren();
    stopSpeaking();
    speak(text, voiceFor(who));
    sfx.play?.("sfx_talk_blip");
    await typeOut(text);
    const d = deferred();
    advance = d;
    await d.promise;
    sfx.select();
  }

  /** Show options (keys 1–4, or click). Resolves the picked index. */
  function choose(options) {
    box.style.display = "flex";
    more.style.visibility = "hidden";
    const d = deferred();
    const pick = (i) => {
      offChoice();
      choicesEl.replaceChildren();
      sfx.select();
      d.resolve(i);
    };
    choicesEl.replaceChildren(...options.map((o, i) => h("button.btn.dlg-choice", { onclick: (e) => (e.stopPropagation(), pick(i)) }, `${i + 1}. ${o}`)));
    const offChoice = onKeys((e) => {
      const n = Number(e.key) - 1;
      if (options[n] !== undefined) pick(n);
    });
    return d.promise;
  }

  function hide() {
    stopSpeaking();
    box.style.display = "none";
  }

  function close() {
    hide();
    off();
    box.remove();
  }

  return { say, choose, hide, close, el: box };
}
