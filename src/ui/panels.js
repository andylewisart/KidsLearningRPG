// The problem window: where he answers. One panel per question, with a
// keyboard-friendly input for each kind (he plays on a laptop):
//   number    equation + number pad (digits, Backspace, Enter)
//   missing   fill the missing letters of a word
//   tiles     build the word from letter tiles
//   dictation hear it, spell it
//   choice    pick one (1, 2, 3)
//   text      write a sentence or two
//   frame     fill the blanks of a sentence frame

import { h, deferred, onKeys } from "./dom.js";
import { sfx } from "./audio.js";
import { renderVisual } from "./visuals.js";
import { speak } from "../ai/voice.js";
import { iconLabel } from "./icons.js";
import { heuristicJudge } from "../learn/writing.js";
import { dictationLine } from "../learn/spelling.js";

export class ProblemPanel {
  constructor(layer, opts) {
    this.layer = layer;
    this.opts = opts;
    this.el = h("div.window.problem");
    this.body = h("div.p-body");
    // The help column: hints and pictures. With something in it, the window
    // widens into two columns so tall pictures never run off the screen.
    this.helpBox = h("div.p-help");
    this.kitLine = h("div.kit-note", { style: { display: "none" } });
    this.el.append(h("div.move-name", {}, opts.title || ""), h("div.ask", {}, opts.ask || ""), this.kitLine, this.body, this.helpBox);
    if (opts.support) {
      const v = renderVisual(opts.support);
      if (v) {
        this.helpBox.append(v);
        this.el.classList.add("wide");
      }
    }
    this.dimmer = h("div.dimmer");
    layer.append(this.dimmer, this.el);
    this.offKeys = null;
    this.build();
  }

  build() {
    const k = this.opts.kind;
    if (k === "number") this.buildNumber();
    else if (k === "missing") this.buildMissing();
    else if (k === "tiles") this.buildTiles();
    else if (k === "dictation") this.buildDictation();
    else if (k === "choice") this.buildChoice();
    else if (k === "text") this.buildText();
    else if (k === "frame") this.buildFrame();
    if (this.opts.allowCancel) {
      this.foot = h(
        "div.foot",
        {},
        h("span", {}, this.opts.footNote || ""),
        h("button.btn.small.ghost", { onclick: () => this.finish(null) }, "Back (Esc)"),
      );
      this.el.append(this.foot);
    }
  }

  /** Wait for his answer. Resolves { value, ms } or null if he backed out. */
  answer() {
    this.waiting = deferred();
    this.started = performance.now();
    this.locked = false;
    this.focus?.();
    return this.waiting.promise;
  }

  finish(value) {
    if (!this.waiting || this.locked) return;
    if (value === null && !this.opts.allowCancel) return;
    this.locked = true;
    const ms = performance.now() - this.started;
    const d = this.waiting;
    this.waiting = null;
    d.resolve(value === null ? null : { value, ms });
  }

  markRight() {
    this.box?.classList.add("right");
    sfx.right();
  }

  markWrong() {
    // Let the help row's 1/2/3 keys work instead of typing into a text box.
    if (document.activeElement && this.el.contains(document.activeElement)) document.activeElement.blur();
    if (this.box) {
      this.box.classList.remove("wrong");
      void this.box.offsetWidth;
      this.box.classList.add("wrong");
    }
    sfx.wrong();
  }

  /** After a miss: Show me / Ask the droid / Skip. Resolves "show" | "ask" | "skip". */
  chooseHelp({ droidName = "Kit", canAsk = true } = {}) {
    const d = deferred();
    const pick = (v) => {
      off();
      row.remove();
      sfx.select();
      d.resolve(v);
    };
    const row = h(
      "div.help-row",
      {},
      h("button.btn.gold", { onclick: () => pick("show") }, ...iconLabel("hint", "💡 Show me (1)")),
      h("button.btn", { onclick: () => pick("ask"), title: canAsk ? "" : "Needs Claude connected in the grown-ups corner" }, ...iconLabel("talk", `🤖 Ask ${droidName} (2)`)),
      h("button.btn.ghost", { onclick: () => pick("skip") }, "Skip (3)"),
    );
    this.helpBox.append(row);
    const off = onKeys((e) => {
      if (e.key === "1") pick("show");
      if (e.key === "2") pick("ask");
      if (e.key === "3" || e.key === "Escape") pick("skip");
    });
    return d.promise;
  }

  showHint(text, visual) {
    this.helpBox.replaceChildren(h("div.hint-text", {}, text));
    const v = visual ? (visual instanceof Node ? visual : renderVisual(visual)) : null;
    if (v) this.helpBox.append(v);
    this.el.classList.toggle("wide", Boolean(v));
  }

  clearHint() {
    this.helpBox.replaceChildren();
    this.el.classList.remove("wide");
  }

  /** A line from the droid, shown inside the window. */
  note(name, text) {
    this.kitLine.replaceChildren(h("b", {}, `${name}: `), text);
    this.kitLine.style.display = "block";
  }

  /** Get ready for another try at the same question. */
  retry(note = "Try it again.") {
    this.locked = false;
    this.box?.classList.remove("wrong", "right");
    this.reset?.();
    if (note) this.body.append(h("div.live-hint.retry-note", {}, note));
  }

  close() {
    this.offKeys?.();
    this.el.remove();
    this.dimmer.remove();
  }

  // ------------------------------------------------------------ kinds

  buildNumber() {
    let value = "";
    const box = h("div.answer-box.empty");
    this.box = box;
    const show = () => {
      box.textContent = value;
      box.classList.toggle("empty", !value);
    };
    const press = (k) => {
      if (this.locked) return;
      if (k === "⌫") value = value.slice(0, -1);
      else if (k === "go") {
        if (value) this.finish(value);
        return;
      } else if (value.length < 4) value += k;
      sfx.key();
      show();
    };
    this.reset = () => {
      value = "";
      show();
    };
    const eq = this.opts.equation;
    this.body.append(h("div.equation", {}, h("span", {}, eq), h("span", {}, "="), box));
    const keys = ["1", "2", "3", "4", "5", "⌫", "6", "7", "8", "9", "0"];
    const pad = h("div.numpad", {}, ...keys.map((k) => h("button", { onclick: () => press(k) }, k)), h("button.go", { onclick: () => press("go") }, "Enter"));
    this.body.append(pad);
    this.offKeys = onKeys((e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") press("go");
      else if (e.key === "Escape") this.finish(null);
    });
    show();
  }

  buildMissing() {
    const t = this.opts.task;
    let typed = "";
    const slots = t.focus.split("").map(() => h("span.slot", {}, " "));
    const line = h(
      "div.word-line",
      {},
      ...t.before.split("").map((c) => h("span.fixed", {}, c)),
      ...slots,
      ...t.after.split("").map((c) => h("span.fixed", {}, c)),
    );
    this.box = line;
    // On-screen Backspace and Enter, for the mouse (the keys still work).
    const back = h("button.btn.small.ghost", { onclick: () => !this.locked && ((typed = typed.slice(0, -1)), show()) }, "⌫");
    const go = h("button.btn.gold.enter-btn", { onclick: () => !this.locked && typed.length === slots.length && this.finish(typed) }, "Enter ⏎");
    const show = () => {
      slots.forEach((s, i) => (s.textContent = typed[i] || " "));
      go.disabled = typed.length !== slots.length;
    };
    this.reset = () => {
      typed = "";
      show();
    };
    show();
    this.body.append(line, this.sentenceLine(t), this.hearButton(t), h("div.enter-row", {}, back, go));
    this.offKeys = onKeys((e) => {
      if (this.locked) return;
      if (/^[a-zA-Z]$/.test(e.key) && typed.length < slots.length) {
        typed += e.key.toLowerCase();
        sfx.key();
      } else if (e.key === "Backspace") typed = typed.slice(0, -1);
      else if (e.key === "Enter" && typed.length === slots.length) return this.finish(typed);
      else if (e.key === "Escape") return this.finish(null);
      show();
    });
  }

  buildTiles() {
    const t = this.opts.task;
    let picked = []; // indexes into tiles
    const slotRow = h("div.word-line");
    const tileRow = h("div.tiles");
    this.box = slotRow;
    const tiles = t.tiles.map((ch, i) => h("button.tile", { onclick: () => add(i) }, ch));
    const render = () => {
      slotRow.replaceChildren(
        ...t.word.split("").map((_, i) =>
          h("span.slot", { onclick: () => picked[i] !== undefined && removeAt(i), style: { cursor: "pointer" } }, picked[i] !== undefined ? t.tiles[picked[i]] : " "),
        ),
      );
      tiles.forEach((el, i) => el.classList.toggle("used", picked.includes(i)));
    };
    const add = (i) => {
      if (this.locked || picked.includes(i) || picked.length >= t.word.length) return;
      picked.push(i);
      sfx.key();
      render();
      if (picked.length === t.word.length) setTimeout(() => this.finish(picked.map((j) => t.tiles[j]).join("")), 200);
    };
    const removeAt = (i) => {
      picked = picked.slice(0, i);
      render();
    };
    this.reset = () => {
      picked = [];
      render();
    };
    tileRow.append(...tiles);
    this.body.append(slotRow, tileRow, this.sentenceLine(t), this.hearButton(t));
    this.offKeys = onKeys((e) => {
      if (this.locked) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        const i = t.tiles.findIndex((ch, j) => ch === e.key.toLowerCase() && !picked.includes(j));
        if (i >= 0) add(i);
      } else if (e.key === "Backspace") removeAt(Math.max(0, picked.length - 1));
      else if (e.key === "Escape") this.finish(null);
    });
    render();
  }

  buildDictation() {
    const t = this.opts.task;
    const input = h("input.spell-input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: false, autocorrect: "off", maxlength: 24 });
    this.box = input;
    this.reset = () => {
      input.value = "";
      sync();
      input.focus();
    };
    this.focus = () => setTimeout(() => input.focus(), 50);
    const go = h("button.btn.gold.enter-btn", { onclick: () => !this.locked && input.value.trim() && this.finish(input.value.trim()) }, "Enter ⏎");
    const sync = () => (go.disabled = !input.value.trim());
    input.addEventListener("input", sync);
    sync();
    this.body.append(t.sentence ? this.sentenceLine(t) : h("div.sentence", {}, "Listen, then spell the word."), input, this.hearButton(t, true), h("div.enter-row", {}, go));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) this.finish(input.value.trim());
      if (e.key === "Escape") this.finish(null);
      e.stopPropagation();
    });
    this.say(t);
  }

  buildChoice() {
    const choices = this.opts.choices;
    const row = h(
      "div.choices",
      {},
      ...choices.map((c, i) => h("button.btn", { onclick: () => !this.locked && this.finish(c) }, `${c} (${i + 1})`)),
    );
    this.box = row;
    this.body.append(row);
    this.reset = () => {};
    this.offKeys = onKeys((e) => {
      const i = Number(e.key) - 1;
      if (choices[i] && !this.locked) this.finish(choices[i]);
      if (e.key === "Escape") this.finish(null);
    });
  }

  buildText() {
    const area = h("textarea.write-area", { spellcheck: false, autocorrect: "off", autocapitalize: "sentences", placeholder: this.opts.placeholder || "" });
    const live = h("div.live-hint");
    const go = h("button.btn.gold", { onclick: () => submit() }, this.opts.submitLabel || "Go! (Ctrl+Enter)");
    this.box = area;
    const min = this.opts.minWords || 1;
    const count = () => (area.value.trim().match(/\S+/g) || []).length;
    const submit = () => {
      if (count() >= min) this.finish(area.value.trim());
      else live.textContent = `A little more: at least ${min} words.`;
    };
    area.addEventListener("input", () => {
      const r = heuristicJudge(area.value);
      live.textContent = r.fuzzy.length ? `🔍 "${r.fuzzy[0]}" is fuzzy. Can you make it specific?` : r.moves.length ? `✨ ${r.moves.length} writing move${r.moves.length > 1 ? "s" : ""} so far` : "";
    });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
      if (e.key === "Escape") this.finish(null);
      e.stopPropagation();
    });
    this.reset = () => area.focus();
    this.focus = () => setTimeout(() => area.focus(), 50);
    this.body.append(area, live, h("div", { style: { textAlign: "right", marginTop: "8px" } }, go));
  }

  buildFrame() {
    const { frame, titan } = this.opts;
    const inputs = {};
    const parts = frame.text.split(/(\{\w+\})/).map((part) => {
      const m = part.match(/^\{(\w+)\}$/);
      if (!m) return part;
      if (m[1] === "titan") return h("b", { style: { color: "#5ff3c9" } }, titan);
      const hint = frame.blanks[m[1]] || "";
      const input = h("input", { type: "text", spellcheck: false, autocomplete: "off", placeholder: hint });
      // Wide enough for its hint, and it grows as he types.
      const fit = () => (input.size = Math.max(hint.length, input.value.length, 6) + 1);
      fit();
      input.addEventListener("input", fit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") this.finish(null);
        e.stopPropagation();
      });
      inputs[m[1]] = input;
      return input;
    });
    const live = h("div.live-hint");
    const submit = () => {
      const answers = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]));
      if (Object.values(answers).some((v) => !v)) {
        live.textContent = "Fill in every blank.";
        return;
      }
      this.finish(answers);
    };
    this.box = null;
    this.reset = () => {};
    this.focus = () => setTimeout(() => Object.values(inputs)[0]?.focus(), 50);
    this.body.append(h("div.frame-line", {}, ...parts), live, h("div", { style: { textAlign: "right", marginTop: "8px" } }, h("button.btn.gold", { onclick: submit }, "Summon! (Enter)")));
  }

  // ------------------------------------------------------------ spelling helpers

  sentenceLine(t) {
    if (!t.sentence) return h("div");
    const hidden = t.sentence.replace(new RegExp(`\\b${t.word}\\b`, "i"), "_____");
    return h("div.sentence", {}, hidden);
  }

  hearButton(t, big = false) {
    return h(`button.btn.listen-btn${big ? "" : ".small.ghost"}`, { onclick: () => this.say(t), style: { marginTop: "8px" } }, big ? "🔊 Hear it again" : "🔊 Hear it");
  }

  say(t) {
    speak(dictationLine(t.word, t.sentence), "spelling", { force: true });
  }
}
