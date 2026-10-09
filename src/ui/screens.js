// Title, results, the Compendium (his collections) and the grown-ups corner.

import { h, deferred, onKeys, esc } from "./dom.js";
import { sfx, unlockAudio } from "./audio.js";
import { artFor, assetUrl } from "./sprites.js";
import { CLASSES, FIENDS, FIEND_TYPES, TRAINING } from "../battle/data.js";
import { LADDERS, SKILLS } from "../learn/skills.js";
import { LEVELS } from "../learn/mastery.js";
import { WORDS, PATTERNS, parseWord } from "../content/words.js";
import { POWERS } from "../learn/writing.js";
import { getSave, update, exportSave, importSave } from "../store/save.js";
import { checkClaudeKey } from "../ai/claude.js";
import { checkOpenAIKey } from "../ai/openai.js";
import { speak } from "../ai/voice.js";

// ------------------------------------------------------------------ title

export function titleScreen(app) {
  const save = getSave();
  const d = deferred();
  const canvas = h("canvas", { width: 1280, height: 720 });
  const started = save.progress.training > 0 || save.log.length > 0;
  const stage = Math.min(save.progress.training, TRAINING.length);
  const playLabel = !started ? "Begin Training" : stage >= TRAINING.length ? "Free Training" : `Continue: ${TRAINING[stage].title.split(": ")[1]}`;
  const go = (v) => {
    unlockAudio();
    sfx.select();
    stop();
    off();
    d.resolve(v);
  };
  const keyArt = assetUrl("key_art");
  const screen = h(
    "div.screen.title-screen",
    {},
    keyArt ? h("div.key-art", { style: { backgroundImage: `url("${keyArt}")` } }) : null,
    canvas,
    h("div.logo", {}, "CRYSTAL TITANS"),
    h("div.tagline", {}, "THE SUNDERED ISLES"),
    h(
      "div.title-menu",
      {},
      h("button.btn.gold", { onclick: () => go("play") }, playLabel),
      h("button.btn", { onclick: () => go("compendium") }, "📖 Compendium"),
      h("button.btn.ghost", { onclick: () => go("grownups") }, "🔒 Grown-ups corner"),
    ),
    h("div.title-foot", {}, "Holo-training build · math, spelling and writing for Utah 3rd grade"),
  );
  app.replaceChildren(screen);
  const off = onKeys((e) => e.key === "Enter" && go("play"));
  const stop = motes(canvas);
  return d.promise;
}

function motes(canvas) {
  const g = canvas.getContext("2d");
  const dots = Array.from({ length: 90 }, () => ({ x: Math.random() * 1280, y: Math.random() * 720, r: 1 + Math.random() * 2.6, v: 0.2 + Math.random() * 0.6, p: Math.random() * 6 }));
  let alive = true;
  (function frame(t) {
    if (!alive) return;
    g.clearRect(0, 0, 1280, 720);
    for (const d of dots) {
      d.y -= d.v;
      d.x += Math.sin(t / 1400 + d.p) * 0.3;
      if (d.y < -10) {
        d.y = 730;
        d.x = Math.random() * 1280;
      }
      g.globalAlpha = 0.35 + 0.35 * Math.sin(t / 600 + d.p);
      g.fillStyle = d.p > 4 ? "#ffd36b" : "#7dffe3";
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fill();
    }
    requestAnimationFrame(frame);
  })(0);
  return () => (alive = false);
}

// ------------------------------------------------------------------ results

export function resultsScreen(app, { won, stats, title, hasNext }) {
  const d = deferred();
  const shards = stats.right * 10 + stats.captures.length * 25;
  const pct = stats.total ? Math.round((stats.right / stats.total) * 100) : 0;
  const pick = (v) => {
    off();
    sfx.select();
    d.resolve(v);
  };
  const win = h(
    "div.window.results",
    {},
    h("h2", {}, won ? "VICTORY!" : "SIMULATION OVER"),
    h("div", { style: { color: "#a9bddc" } }, title),
    h(
      "div.stat-grid",
      {},
      h("div.stat", {}, h("b", {}, `${stats.right}/${stats.total}`), "right first try"),
      h("div.stat", {}, h("b", {}, `${pct}%`), "accuracy"),
      h("div.stat", {}, h("b", {}, stats.best), "best streak"),
      h("div.stat", {}, h("b", {}, `+${shards}`), "lore shards"),
    ),
    stats.captures.length
      ? h(
          "div",
          {},
          h("div.section-title", {}, "Captured for your Monster Arena"),
          h("div.capture-row", {}, ...stats.captures.map((id) => h("div.cap", {}, h("div.pic", {}, artFor(id, { prefer: "base" })), FIENDS[id].name))),
        )
      : null,
    h(
      "div",
      { style: { display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" } },
      won && hasNext ? h("button.btn.gold", { onclick: () => pick("next") }, "Next battle (Enter)") : null,
      !won ? h("button.btn.gold", { onclick: () => pick("retry") }, "Try again (Enter)") : null,
      won && !hasNext ? h("button.btn.gold", { onclick: () => pick("next") }, "Free training (Enter)") : null,
      h("button.btn", { onclick: () => pick("compendium") }, "📖 Compendium"),
      h("button.btn.ghost", { onclick: () => pick("title") }, "Title"),
    ),
  );
  app.querySelector(".screen")?.append(h("div.dimmer", { style: { zIndex: 94 } }), win);
  const off = onKeys((e) => e.key === "Enter" && pick(won ? "next" : "retry"));
  return { promise: d.promise, shards };
}

// ------------------------------------------------------------------ compendium

export function compendiumScreen(app, mastery) {
  const save = getSave();
  const d = deferred();
  const body = h("div.page-body");
  const fiendIds = Object.keys(FIENDS);
  const captureable = fiendIds.filter((id) => !FIENDS[id].boss);
  const mastered = WORDS.filter((e) => {
    const w = save.collection.words[parseWord(e.w).word];
    return w && w.right >= 2 && w.right > w.wrong;
  });
  const gridLit = (track) => LADDERS[track].filter((id) => ["ontrack", "mastered"].includes(mastery.level(id))).length;
  const allNodes = Object.values(LADDERS).reduce((n, l) => n + l.length, 0) - LADDERS.add.length;
  const litNodes = ["sub", "mul", "spell", "write"].reduce((n, t) => n + gridLit(t), 0);
  const pct = (a, b) => `${b ? Math.round((a / b) * 100) : 0}%`;
  const tabs = [
    { id: "heroes", label: "Heroes & Crystal Grid", pct: pct(litNodes, allNodes), render: heroes },
    { id: "arena", label: "Monster Arena", pct: pct(captureable.filter((id) => save.collection.captures[id]).length, captureable.length), render: arena },
    { id: "bestiary", label: "Bestiary", pct: pct(fiendIds.filter((id) => save.collection.defeated[id]).length, fiendIds.length), render: bestiary },
    { id: "spellbook", label: "Spellbook", pct: pct(mastered.length, WORDS.length), render: spellbook },
    { id: "journal", label: "Titan Journal", pct: String(save.collection.entrances.length), render: journal },
  ];
  const tabBar = h("div.tabs");
  function show(id) {
    tabBar.replaceChildren(...tabs.map((t) => h(`button${t.id === id ? ".on" : ""}`, { onclick: () => (sfx.select(), show(t.id)) }, t.label, h("span.pct", {}, t.pct))));
    body.replaceChildren(tabs.find((t) => t.id === id).render());
  }

  function heroes() {
    const levelCls = (lv) => (lv === "mastered" ? "mastered" : lv === "ontrack" ? "ontrack" : lv === "practicing" ? "practicing" : lv === "learning" ? "learning" : "new");
    return h(
      "div",
      {},
      h("p.note", {}, "Every crystal is a real skill. Practicing lights it up; master it and it glows for good."),
      ...["knight", "gunner", "spellwright", "titancaller"].map((cls) => {
        const c = CLASSES[cls];
        const ladder = LADDERS[c.track];
        return h(
          "div.card",
          { style: { marginBottom: "12px", display: "grid", gridTemplateColumns: "110px 1fr", gap: "14px" } },
          h("div.pic", { style: { height: "150px" } }, artFor(cls, { prefer: "base" })),
          h(
            "div",
            {},
            h("h3", {}, `${save.names[cls] || c.name}`),
            h("div.meta", {}, c.blurb),
            h("p", {}, `Moves: ${c.moves[1]} ★ · ${c.moves[2]} ★★ · ${c.moves[3]} ★★★ · Overdrive: ${c.overdrive}`),
            h(
              "div.word-cloud",
              { style: { marginTop: "8px" } },
              ...ladder.map((id) => {
                const lv = mastery.level(id);
                return h(`span.level.${levelCls(lv)}`, { title: `${SKILLS[id].standard} · ${lv}` }, `💎 ${SKILLS[id].label}`);
              }),
            ),
            h("div.meta", { style: { marginTop: "6px" } }, `Crystal Grid: ${gridLit(c.track)} of ${ladder.length} lit`),
          ),
        );
      }),
    );
  }

  function arena() {
    return h(
      "div",
      {},
      h("p.note", {}, "Finish a fiend with a ★★★ move to capture it (up to 10 of each)."),
      h(
        "div.card-grid",
        {},
        ...captureable.map((id) => {
          const n = save.collection.captures[id] || 0;
          const f = FIENDS[id];
          return h(`div.card${n ? "" : ".locked"}`, {}, h("span.count", {}, `${n}/10`), h("div.pic", {}, artFor(id, { prefer: "base" })), h("h3", {}, n ? f.name : "???"), h("div.meta", {}, FIEND_TYPES[f.type].label));
        }),
      ),
    );
  }

  function bestiary() {
    return h(
      "div.card-grid",
      { style: { gridTemplateColumns: "repeat(3, 1fr)" } },
      ...fiendIds.map((id) => {
        const n = save.collection.defeated[id] || 0;
        const f = FIENDS[id];
        if (!n) return h("div.card.locked", {}, h("div.pic", {}, artFor(id, { prefer: "base" })), h("h3", {}, "???"), h("div.meta", {}, "Not defeated yet"));
        return h(
          "div.card",
          {},
          h("span.count", {}, `×${n}`),
          h("div.pic", {}, artFor(id, { prefer: "base" })),
          h("h3", {}, f.name),
          h("div.meta", {}, `${FIEND_TYPES[f.type].label} · ${FIEND_TYPES[f.type].hint}`),
          h("p", {}, f.joke),
          h("p", { style: { color: "#7dffe3" } }, f.fact),
        );
      }),
    );
  }

  function spellbook() {
    const byPattern = {};
    for (const e of mastered) (byPattern[e.p] ||= []).push(parseWord(e.w).word);
    const missed = save.collection.missedWords.slice(0, 20);
    return h(
      "div",
      {},
      h("p.note", {}, `${mastered.length} of ${WORDS.length} words mastered. A word counts once you've spelled it right twice and more often right than wrong.`),
      // Every pattern is a page to fill, like a card binder: found words, then how many are left.
      ...Object.keys(PATTERNS).map((p) => {
        const found = byPattern[p] || [];
        const total = WORDS.filter((e) => e.p === p).length;
        const left = total - found.length;
        return h(
          "div",
          {},
          h("div.section-title", {}, `${PATTERNS[p].label} · ${found.length}/${total}`),
          h(
            "div.word-cloud",
            {},
            ...found.map((w) => h("span.word-chip", {}, w)),
            left ? h("span.word-chip", { style: { opacity: 0.45 } }, `??? × ${left}`) : h("span.word-chip", { style: { color: "#ffd36b" } }, "★ complete"),
          ),
        );
      }),
      missed.length ? h("div", {}, h("div.section-title", {}, "Coming back for another round"), h("div.word-cloud", {}, ...missed.map((w) => h("span.word-chip", { style: { opacity: 0.7 } }, w)))) : null,
    );
  }

  function journal() {
    const list = save.collection.entrances;
    if (!list.length) return h("p.note", {}, "Summon a Titan in battle and your entrance writing will be saved here.");
    return h(
      "div",
      {},
      ...list.slice(0, 40).map((e) =>
        h(
          "div.card",
          { style: { marginBottom: "10px" } },
          h("span.count", {}, `${POWERS[e.power]?.icon || ""} ${POWERS[e.power]?.label || ""}`),
          h("h3", {}, e.titan),
          h("p", { style: { fontSize: "18px" } }, e.text),
          h("div.meta", {}, new Date(e.t).toLocaleDateString()),
          h("button.btn.small.ghost", { onclick: () => speak(e.text, "trailer", { force: true }), style: { marginTop: "6px" } }, "🔊 Read it like a movie trailer"),
        ),
      ),
    );
  }

  const back = () => {
    off();
    sfx.back();
    d.resolve();
  };
  app.replaceChildren(h("div.screen.page", {}, h("div.page-head", {}, h("h1", {}, "📖 Compendium"), h("button.btn.small", { onclick: back }, "Back (Esc)")), tabBar, body));
  const off = onKeys((e) => e.key === "Escape" && back());
  show("heroes");
  return d.promise;
}

// ------------------------------------------------------------------ grown-ups

export async function grownupsScreen(app, mastery) {
  const ok = await pinGate(app);
  if (!ok) return;
  const save = getSave();
  const d = deferred();
  const body = h("div.page-body", { style: { top: "84px" } });

  const keyRow = (label, field, check, help) => {
    const input = h("input", { type: "password", value: save.settings[field], placeholder: "paste key", autocomplete: "off", spellcheck: false });
    const status = h("span.note");
    const saveBtn = h(
      "button.btn.small",
      {
        onclick: async () => {
          await update((s) => (s.settings[field] = input.value.trim()));
          status.textContent = "Checking…";
          const r = input.value.trim() ? await check(input.value.trim()) : "none";
          status.className = r === "ok" ? "status-ok" : "status-bad";
          status.textContent = { ok: "✓ Connected", bad: "✗ Key not accepted", unreachable: "? Couldn't reach the service", none: "Removed" }[r];
        },
      },
      "Save & check",
    );
    return h("div", {}, h("div.form-row", {}, h("b", {}, label), input, saveBtn), h("div.note", { style: { margin: "-4px 0 8px 232px" } }, help, " ", status));
  };

  const toggle = (label, field) =>
    h(
      "label.form-row",
      { style: { gridTemplateColumns: "220px auto 1fr" } },
      h("b", {}, label),
      h("input", { type: "checkbox", checked: save.settings[field], onchange: (e) => update((s) => (s.settings[field] = e.target.checked)) }),
      h("span"),
    );

  const nameInputs = ["knight", "gunner", "spellwright", "titancaller", "droid", "titan"].map((k) =>
    h(
      "div.form-row",
      { style: { gridTemplateColumns: "220px 260px 1fr" } },
      h("b", {}, { knight: "Crystal Knight", gunner: "Sky-Pirate Gunner", spellwright: "Spellwright", titancaller: "Titan Caller", droid: "Tutor droid", titan: "Starter Titan" }[k]),
      h("input", { type: "text", value: save.names[k], placeholder: k === "droid" ? "Kit" : k === "titan" ? "Tidebreaker" : "(class name)", maxlength: 18, onchange: (e) => update((s) => (s.names[k] = e.target.value.trim())) }),
      h("span"),
    ),
  );

  const school = h("textarea.school", { placeholder: "One word per line, e.g.\nbecause\nfriend\nthrough", value: save.settings.schoolWords.join("\n") });
  const schoolStatus = h("span.note");

  const rows = mastery
    .summary()
    .sort((a, b) => (a.track + a.id).localeCompare(b.track + b.id))
    .map((r) =>
      h(
        "tr",
        {},
        h("td", {}, r.label),
        h("td", {}, r.standard),
        h("td", {}, h(`span.level.${r.level}`, {}, r.level === "ontrack" ? "on track" : r.level)),
        h("td", {}, `${r.correct}/${r.attempts}`),
        h("td", {}, r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : ""),
      ),
    );

  const misses = save.log
    .filter((x) => !x.correct)
    .slice(-20)
    .reverse()
    .map((x) => h("tr", {}, h("td", {}, new Date(x.t).toLocaleString()), h("td", {}, SKILLS[x.skill]?.label || x.skill), h("td", {}, String(x.given ?? "")), h("td", {}, x.answer ?? ""), h("td", {}, x.mistake || "")));

  const chats = save.tutorLog
    .slice(-8)
    .reverse()
    .map((c) =>
      h(
        "div.card",
        { style: { marginBottom: "8px" } },
        h("div.meta", {}, `${new Date(c.t).toLocaleString()} · ${c.recap}`),
        ...c.transcript.map((m) => h("p", {}, h("b", {}, m.who === "kid" ? "Him: " : `${save.names.droid || "Kit"}: `), m.text)),
      ),
    );

  const reportBtn = h("button.btn.small", { onclick: () => copyReport(mastery, reportBtn) }, "📋 Copy report for Claude");
  const fileInput = h("input", {
    type: "file",
    accept: "application/json",
    style: { display: "none" },
    onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        await importSave(await f.text());
        alert("Backup restored. The game will reload.");
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    },
  });

  body.append(
    h("div.section-title", {}, "AI connections"),
    h(
      "p.note",
      {},
      "Claude (Haiku 5.5) writes everything the tutor droid says and judges his writing. OpenAI gives the droid its voice and hears him through push-to-talk. Keys are saved only in this browser on this laptop. Set a monthly spending limit on both accounts. Without keys the game still works, with built-in hints and the browser's voice.",
    ),
    keyRow("Claude API key", "anthropicKey", checkClaudeKey, "From console.anthropic.com → API keys."),
    keyRow("OpenAI API key", "openaiKey", checkOpenAIKey, "From platform.openai.com → API keys. A ChatGPT subscription doesn't include API use."),
    h("div.section-title", {}, "Sound"),
    toggle("Read things aloud", "voice"),
    toggle("Sound effects", "sound"),
    h("div.section-title", {}, "Names (do this one with him)"),
    ...nameInputs,
    h("div.section-title", {}, "This week's spelling list"),
    h("p.note", {}, "Type the school's words here (one per line). The Spellwright mixes them into ★★ and ★★★ spells."),
    school,
    h(
      "div",
      { style: { marginTop: "6px" } },
      h(
        "button.btn.small",
        {
          onclick: async () => {
            const words = school.value
              .split(/[\n,]+/)
              .map((w) => w.trim().toLowerCase())
              .filter((w) => /^[a-z']{2,20}$/.test(w));
            await update((s) => (s.settings.schoolWords = words));
            schoolStatus.textContent = ` Saved ${words.length} words.`;
          },
        },
        "Save list",
      ),
      schoolStatus,
    ),
    h("div.section-title", {}, "Progress against Utah standards"),
    h("p.note", {}, "Levels follow docs/curriculum.md: on track = 90%+ over the last 10 tries, across 3+ days, without hints. Mastered = still there two weeks later."),
    rows.length
      ? h("table.skills", {}, h("tr", {}, h("th", {}, "Skill"), h("th", {}, "Utah"), h("th", {}, "Level"), h("th", {}, "Right"), h("th", {}, "Last practiced")), ...rows)
      : h("p.note", {}, "No practice yet."),
    h("div.section-title", {}, "Recent mistakes"),
    misses.length
      ? h("table.skills", {}, h("tr", {}, h("th", {}, "When"), h("th", {}, "Skill"), h("th", {}, "His answer"), h("th", {}, "Correct"), h("th", {}, "Pattern")), ...misses)
      : h("p.note", {}, "None yet."),
    h("div.section-title", {}, "Tutor chats"),
    chats.length ? h("div", {}, ...chats) : h("p.note", {}, "No chats yet."),
    h("div.section-title", {}, "Backup"),
    h(
      "div",
      { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
      reportBtn,
      h("button.btn.small", { onclick: () => download(`crystal-titans-backup-${new Date().toISOString().slice(0, 10)}.json`, exportSave()) }, "⬇ Back up progress"),
      h("button.btn.small.ghost", { onclick: () => fileInput.click() }, "⬆ Restore a backup"),
      fileInput,
    ),
    h("p.note", {}, "Safari can clear a website's data if it isn't opened for about a week, so back up now and then. Backups never include the API keys."),
  );

  const back = () => {
    off();
    d.resolve();
  };
  app.replaceChildren(h("div.screen.page", {}, h("div.page-head", {}, h("h1", {}, "🔒 Grown-ups corner"), h("button.btn.small", { onclick: back }, "Back")), body));
  const off = onKeys((e) => e.key === "Escape" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT" && back());
  return d.promise;
}

function pinGate(app) {
  const save = getSave();
  const d = deferred();
  const setting = !save.settings.pin;
  let entered = "";
  let first = "";
  const dots = h("div.pin-dots");
  const msg = h("div.note", {}, setting ? "Choose a 4-digit PIN for the grown-ups corner." : "Enter the grown-ups PIN.");
  const show = () => (dots.textContent = "●".repeat(entered.length) + "○".repeat(4 - entered.length));
  const press = async (k) => {
    if (k === "⌫") entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    show();
    if (entered.length < 4) return;
    if (setting) {
      if (!first) {
        first = entered;
        entered = "";
        msg.textContent = "Type it again to confirm.";
      } else if (entered === first) {
        await update((s) => (s.settings.pin = entered));
        finish(true);
      } else {
        first = "";
        entered = "";
        msg.textContent = "Those didn't match. Choose a PIN again.";
      }
    } else if (entered === save.settings.pin) finish(true);
    else {
      entered = "";
      msg.textContent = "Not quite. Try again.";
      sfx.wrong();
    }
    show();
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"];
  const pad = h("div.numpad", { style: { gridTemplateColumns: "repeat(3, 72px)" } }, ...keys.map((k) => h("button", { onclick: () => press(k) }, k)));
  app.replaceChildren(
    h(
      "div.screen.page",
      {},
      h("div.window.pin-pad", {}, h("h2", {}, "🔒 Grown-ups corner"), msg, dots, pad, h("button.btn.small.ghost", { onclick: () => finish(false), style: { marginTop: "12px" } }, "Back (Esc)")),
    ),
  );
  const off = onKeys((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    if (e.key === "Backspace") press("⌫");
    if (e.key === "Escape") finish(false);
  });
  function finish(v) {
    off();
    d.resolve(v);
  }
  show();
  return d.promise;
}

function download(name, text) {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
}

/** A plain-text progress report to paste into a chat with Claude. */
function copyReport(mastery, btn) {
  const s = getSave();
  const lines = [`Crystal Titans progress report (${new Date().toLocaleDateString()})`, `Battles won: ${s.progress.battlesWon}. Training stage: ${s.progress.training}/${TRAINING.length}.`, "", "Skills (Utah code, level, right/attempts):"];
  for (const r of mastery.summary()) lines.push(`- ${r.label} (${r.standard}): ${r.level}, ${r.correct}/${r.attempts}`);
  const counts = {};
  for (const x of s.log) if (!x.correct && x.mistake) counts[x.mistake] = (counts[x.mistake] || 0) + 1;
  lines.push("", "Mistake patterns:", ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`));
  lines.push("", `Words to review: ${s.collection.missedWords.slice(0, 20).join(", ") || "none"}`);
  lines.push("", "Recent Titan entrances (his writing):", ...s.collection.entrances.slice(0, 5).map((e) => `- [${e.power}] ${e.text}`));
  navigator.clipboard?.writeText(lines.join("\n")).then(
    () => (btn.textContent = "✓ Copied"),
    () => (btn.textContent = "Couldn't copy"),
  );
}

export { esc, LEVELS };
