// Title, results, the Compendium (his collections) and the grown-ups corner.

import { h, deferred, onKeys, esc } from "./dom.js";
import { sfx, unlockAudio, music, ambience, applyVolumes, audioManifest } from "./audio.js";
import { artFor, assetUrl } from "./sprites.js";
import { iconLabel } from "./icons.js";
import { CLASSES, FIENDS, FIEND_TYPES, TRAINING } from "../battle/data.js";
import { SCENES } from "../world/data.js";
import { LADDERS, SKILLS } from "../learn/skills.js";
import { LEVELS } from "../learn/mastery.js";
import { WORDS, PATTERNS, parseWord } from "../content/words.js";
import { POWERS } from "../learn/writing.js";
import { getSave, update, exportSave, importSave } from "../store/save.js";
import { checkClaudeKey } from "../ai/claude.js";
import { checkOpenAIKey } from "../ai/openai.js";
import { checkElevenKey, listElevenVoices, speakEleven } from "../ai/elevenlabs.js";
import { ROLES, PREMADE_VOICES, elevenVoiceFor } from "../ai/providers.js";
import { speak } from "../ai/voice.js";

// ------------------------------------------------------------------ title

export function titleScreen(app) {
  const save = getSave();
  const d = deferred();
  const canvas = h("canvas", { width: 1280, height: 720 });
  const w = save.world;
  const adventuring = Boolean(w?.started);
  const stage = Math.min(save.progress.training, TRAINING.length);
  const playLabel = stage >= TRAINING.length || stage === 0 ? "Quick Battle" : `Quick Battle: ${TRAINING[stage].title}`;
  const go = (v) => {
    unlockAudio();
    sfx.select();
    stop();
    off();
    d.resolve(v);
  };
  const keyArt = assetUrl("title_art") || assetUrl("key_art"); // art wave 05 adds Maren summoning the Titan
  ambience.stop();
  music.play("music_title"); // starts now, or on his first click or key
  // a saved adventure: carry on where he left off, or start over (after a check)
  const adventureButtons = adventuring
    ? [
        h("button.btn.gold.continue", { onclick: () => go("adventure") }, h("span", {}, "Continue Adventure"), h("span.sub", {}, savedWhere(w))),
        h("button.btn", { onclick: () => askNew() }, "✦ New Adventure"),
      ]
    : [h("button.btn.gold", { onclick: () => go("newAdventure") }, "Begin Adventure")];
  const screen = h(
    "div.screen.title-screen",
    {},
    keyArt ? h("div.key-art", { style: { backgroundImage: `url("${keyArt}")` } }) : null,
    canvas,
    ...(assetUrl("ui_logo") ? [h("img.logo-img", { src: assetUrl("ui_logo"), alt: "Crystal Titans: The Sundered Isles" })] : [h("div.logo", {}, "CRYSTAL TITANS"), h("div.tagline", {}, "THE SUNDERED ISLES")]),
    h(
      "div.title-menu",
      {},
      ...adventureButtons,
      h("button.btn", { onclick: () => go("play") }, ...iconLabel("strike", `⚔ ${playLabel}`)),
      h("button.btn", { onclick: () => go("compendium") }, ...iconLabel("cast", "📖 Compendium")),
      h("button.btn.ghost", { onclick: () => go("grownups") }, "🔒 Grown-ups corner"),
    ),
    h("div.title-foot", {}, `Math, spelling and writing for Utah 3rd grade · build ${BUILD}`),
  );
  app.replaceChildren(screen);

  /** Starting over replaces the saved adventure, so check first. What he's learned and his Compendium stay. */
  let confirmBox = null;
  function askNew() {
    sfx.select();
    if (confirmBox) return;
    const keep = h("button.btn", { onclick: () => closeNew() }, "Keep my adventure");
    confirmBox = h(
      "div.title-confirm",
      {},
      h(
        "div.window.confirm-new",
        { role: "dialog", "aria-label": "Start a new adventure?" },
        h("h2", {}, "Start a new adventure?"),
        h("p", {}, `Your saved adventure (${savedWhere(w)}) will be replaced. Your Compendium and everything you've learned stay.`),
        h("div.confirm-buttons", {}, h("button.btn.gold", { onclick: () => go("newAdventure") }, "Start over"), keep),
      ),
    );
    screen.append(confirmBox);
    keep.focus();
  }
  function closeNew() {
    confirmBox?.remove();
    confirmBox = null;
  }
  const off = onKeys((e) => {
    if (confirmBox) {
      if (e.key === "Escape") closeNew();
      return;
    }
    if (e.key === "Enter") go(adventuring ? "adventure" : "newAdventure");
  });
  const stop = motes(canvas);
  return d.promise;
}

/** Where a saved adventure is: "The Tide Grotto · 3 of 4 shards". */
function savedWhere(w) {
  if (w.finished) return `Chapter 1 complete · ${w.shards.length} of 4 shards`;
  const where = w.onMap ? "The island map" : SCENES[w.scene]?.name || "Driftwood Isle";
  return `${where} · ${w.shards.length} of 4 shards`;
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
    h("h2", {}, won ? "VICTORY!" : "RETREAT!"),
    h("div", { style: { color: "#a9bddc" } }, title),
    h(
      "div.stat-grid",
      {},
      h("div.stat", {}, h("b", {}, `${stats.right}/${stats.total}`), "right first try"),
      h("div.stat", {}, h("b", {}, `${pct}%`), "accuracy"),
      h("div.stat", {}, h("b", {}, stats.best), "best streak"),
      h("div.stat", {}, h("b", {}, `+${shards}`), "glimmer"),
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
      won && !hasNext ? h("button.btn.gold", { onclick: () => pick("next") }, "Quick battle (Enter)") : null,
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
            h("h3", {}, `${save.names[cls] || c.hero}, ${c.name}`),
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

  const keyRow = (label, field, check, help, messages = {}) => {
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
          status.textContent = { ok: "✓ Connected", bad: "✗ Key not accepted", unreachable: "? Couldn't reach the service", none: "Removed", ...messages }[r];
          onKeySaved?.(field);
        },
      },
      "Save & check",
    );
    return h("div", {}, h("div.form-row", {}, h("b", {}, label), input, saveBtn), h("div.note", { style: { margin: "-4px 0 8px 232px" } }, help, " ", status));
  };

  let onKeySaved = null;
  const toggle = (label, field) =>
    h(
      "label.form-row",
      { style: { gridTemplateColumns: "220px auto 1fr" } },
      h("b", {}, label),
      h("input", { type: "checkbox", checked: save.settings[field], onchange: (e) => update((s) => (s.settings[field] = e.target.checked)).then(applyVolumes) }),
      h("span"),
    );

  const slider = (label, field, dflt, after) =>
    h(
      "label.form-row",
      { style: { gridTemplateColumns: "220px 260px 1fr" } },
      h("b", {}, label),
      h("input", {
        type: "range",
        min: 0,
        max: 100,
        value: Math.round((save.settings[field] ?? dflt) * 100),
        onchange: async (e) => {
          await update((s) => (s.settings[field] = Number(e.target.value) / 100));
          applyVolumes();
          after?.();
        },
      }),
      h("span"),
    );

  const providerSelect = h(
    "select",
    { onchange: (e) => update((s) => (s.settings.voiceProvider = e.target.value)) },
    ...[
      ["auto", "Automatic (ElevenLabs, then OpenAI, then the browser)"],
      ["elevenlabs", "ElevenLabs"],
      ["openai", "OpenAI"],
      ["browser", "The browser's own voice (free)"],
    ].map(([v, label]) => h("option", { value: v, selected: (save.settings.voiceProvider || "auto") === v }, label)),
  );

  // One voice picker per role, filled from his ElevenLabs library when the key
  // can list it, otherwise from ElevenLabs' standard voices.
  const ROLE_LABELS = { droid: "Tutor droid", trailer: "Movie-trailer narrator", spelling: "Spelling reader", narrator: "Story narrator" };
  const SAMPLE = { droid: "Ahoy. Ready when you are.", trailer: "In a world of crystal and storm, one hero rises.", spelling: "Friend. My friend helped me. Friend.", narrator: "The tide rolled in over the shipwreck cove." };
  const voicesNote = h("span.note");
  const voiceRows = h("div");
  let previewAudio = null;
  async function preview(role, voice, btn) {
    previewAudio?.pause();
    const key = getSave().settings.elevenKey;
    btn.disabled = true;
    try {
      let url = voice.preview;
      if (!url) {
        if (!key) throw new Error("no key");
        url = URL.createObjectURL(await speakEleven(key, SAMPLE[role], elevenVoiceFor(role, { elevenVoices: { [role]: voice.id } })));
      }
      previewAudio = new Audio(url);
      await previewAudio.play();
    } catch {
      voicesNote.textContent = "Couldn't play that preview from this browser.";
    } finally {
      btn.disabled = false;
    }
  }
  async function fillVoices() {
    let list = PREMADE_VOICES;
    let from = "ElevenLabs' standard voices";
    const key = getSave().settings.elevenKey;
    if (key) {
      try {
        const mine = await listElevenVoices(key);
        if (mine.length) {
          list = mine;
          from = "your ElevenLabs library";
        }
      } catch {
        from = "ElevenLabs' standard voices (this key can't list your library; paste a voice ID to use one of yours)";
      }
    }
    voicesNote.textContent = `Voices from ${from}. Pre-recorded lines keep the sound pack's voices.`;
    const packVoices = audioManifest().voices || {};
    voiceRows.replaceChildren(
      ...ROLES.map((role) => {
        const current = elevenVoiceFor(role, getSave().settings, packVoices).id;
        const options = list.some((v) => v.id === current) ? list : [...list, { id: current, name: `Voice ${current.slice(0, 6)}…`, about: "" }];
        const select = h(
          "select",
          {
            onchange: async (e) => {
              let id = e.target.value;
              if (id === "__paste") {
                id = (prompt("Paste an ElevenLabs voice ID:") || "").trim();
                if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return fillVoices();
              }
              await update((s) => (s.settings.elevenVoices = { ...s.settings.elevenVoices, [role]: id }));
              fillVoices();
            },
          },
          ...options.map((v) => h("option", { value: v.id, selected: v.id === current }, v.about ? `${v.name}: ${v.about}` : v.name)),
          h("option", { value: "__paste" }, "Paste a voice ID…"),
        );
        const play = h("button.btn.small", { title: "Preview" }, "▶");
        play.onclick = () => preview(role, options.find((v) => v.id === select.value) || { id: select.value }, play);
        return h("div.form-row", { style: { gridTemplateColumns: "220px 360px auto 1fr" } }, h("b", {}, ROLE_LABELS[role]), select, play, h("span"));
      }),
    );
  }
  fillVoices();
  onKeySaved = (field) => field === "elevenKey" && fillVoices();

  const nameInputs = ["knight", "gunner", "spellwright", "titancaller", "droid", "titan"].map((k) =>
    h(
      "div.form-row",
      { style: { gridTemplateColumns: "220px 260px 1fr" } },
      h("b", {}, { knight: "Crystal Knight", gunner: "Sky-Pirate Gunner", spellwright: "Spellwright", titancaller: "Titan Caller", droid: "Tutor droid", titan: "Starter Titan" }[k]),
      h("input", { type: "text", value: save.names[k], placeholder: k === "droid" ? "Kit" : k === "titan" ? "Tidebreaker" : CLASSES[k].hero, maxlength: 18, onchange: (e) => update((s) => (s.names[k] = e.target.value.trim())) }),
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

  const topReportBtn = h("button.btn.small.gold", { onclick: () => copyReport(mastery, topReportBtn) }, "📋 Copy report for Claude");
  body.append(
    h("div.section-title", {}, "Report for Claude"),
    h("p.note", {}, "Copies his recent fights, answers, skills and any errors, ready to paste into a chat with Claude. It never includes the API keys."),
    topReportBtn,
    h("div.section-title", {}, "AI connections"),
    h(
      "p.note",
      {},
      "Claude (Haiku 5.5) writes everything the tutor droid says and judges his writing. The droid's fixed lines and the heroes' lines are pre-recorded and free. For live lines and push-to-talk, ElevenLabs or OpenAI gives the droid its voice and ears. Keys are saved only in this browser on this laptop. Set a monthly spending limit on every account. Without keys the game still works, with built-in hints and the browser's voice.",
    ),
    keyRow("Claude API key", "anthropicKey", checkClaudeKey, "From console.anthropic.com → API keys."),
    keyRow("OpenAI API key", "openaiKey", checkOpenAIKey, "From platform.openai.com → API keys. A ChatGPT subscription doesn't include API use."),
    keyRow("ElevenLabs API key", "elevenKey", checkElevenKey, "From elevenlabs.io → Settings → API keys. Needs Text to Speech (and Speech to Text for push-to-talk).", {
      unreachable: "? This browser can't reach ElevenLabs directly. The game will keep using OpenAI or the browser voice.",
    }),
    h("div.form-row", { style: { gridTemplateColumns: "220px 420px 1fr" } }, h("b", {}, "Live voice from"), providerSelect, h("span")),
    h("div.section-title", {}, "Voices (ElevenLabs)"),
    voicesNote,
    voiceRows,
    h("div.section-title", {}, "Sound"),
    toggle("Read things aloud", "voice"),
    toggle("Character voices", "heroVoices"),
    h("p.note", { style: { margin: "-4px 0 8px 232px" } }, "The heroes' battle lines. Off: their speech bubbles still show, silently."),
    toggle("Sound and music", "sound"),
    slider("Music volume", "musicVolume", 0.6),
    slider("Sound effects volume", "sfxVolume", 0.8, () => sfx.right()),
    h("div.section-title", {}, "Screen"),
    h(
      "label.form-row",
      { style: { gridTemplateColumns: "220px auto 1fr" } },
      h("b", {}, "Fill the window"),
      h("input", { type: "checkbox", checked: save.settings.fillWindow, onchange: (e) => update((s) => (s.settings.fillWindow = e.target.checked)).then(() => window.dispatchEvent(new Event("resize"))) }),
      h("span"),
    ),
    h("p.note", { style: { margin: "-4px 0 8px 232px" } }, "Off: the game is never shown bigger than 1080p, which keeps the paintings sharp on a big monitor. On: it fills the window, however big (handy on a small, sharp laptop screen, where 1080p can look small). Saved on this computer only."),
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

/** The build this is (set by scripts/build.mjs). */
export const BUILD = typeof __BUILD__ === "string" ? __BUILD__ : "dev";

/** A plain-text progress and play report to paste into a chat with Claude. */
function copyReport(mastery, btn) {
  const s = getSave();
  const when = (t) => new Date(t).toLocaleString();
  const lines = [
    `Crystal Titans report (${new Date().toLocaleString()})`,
    `Build: ${BUILD}. Screen: ${innerWidth}×${innerHeight} at ${devicePixelRatio}x. Browser: ${navigator.userAgent}`,
    `Battles won: ${s.progress.battlesWon}. Set battles cleared: ${s.progress.training}/${TRAINING.length}. Glimmer: ${s.progress.shards}.`,
    s.world?.started
      ? `Adventure: in ${s.world.scene}, party ${s.world.party.join(", ")}, crystal shards ${s.world.shards.length}/4${s.world.finished ? " (chapter 1 done)" : ""}, items ${s.world.items.join(", ") || "none"}, story flags ${Object.keys(s.world.flags).length}.`
      : "Adventure: not started yet.",
    `Settings: sound ${s.settings.sound ? "on" : "off"}, read aloud ${s.settings.voice ? "on" : "off"}, voice ${s.settings.voiceProvider || "auto"}. Keys set: Claude ${s.settings.anthropicKey ? "yes" : "no"}, OpenAI ${s.settings.openaiKey ? "yes" : "no"}, ElevenLabs ${s.settings.elevenKey ? "yes" : "no"}.`,
    `AI use today (${s.usage.day || "none"}): tutor ${s.usage.tutor}, judge ${s.usage.judge}, speech ${s.usage.speech}, listen ${s.usage.listen}.`,
    "",
    "Recent fights (newest first):",
    ...s.battles
      .slice(-12)
      .reverse()
      .map((x) => `- ${when(x.t)} · ${x.title} · ${x.outcome} · ${x.minutes} min · ${x.right}/${x.total} right first try · hints ${x.hints} · stars ★${x.tiers[1]} ★★${x.tiers[2]} ★★★${x.tiers[3]} · swaps ${x.swaps} · potions ${x.potions} · overdrives ${x.overdrives} · summons ${x.summons} · captures ${x.captures}`),
    "",
    "Skills (Utah code, level, right/attempts):",
  ];
  for (const r of mastery.summary()) lines.push(`- ${r.label} (${r.standard}): ${r.level}, ${r.correct}/${r.attempts}`);
  const counts = {};
  for (const x of s.log) if (!x.correct && x.mistake) counts[x.mistake] = (counts[x.mistake] || 0) + 1;
  lines.push("", "Mistake patterns:", ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`));
  lines.push(
    "",
    "Last 30 answers (oldest first):",
    ...s.log.slice(-30).map((x) => `- ${when(x.t)} · ${x.skill} ★${x.tier} · ${x.correct ? "right" : "wrong"}${x.hinted ? " after help" : ""} · ${(x.ms / 1000).toFixed(1)}s · gave ${x.given ?? ""} · answer ${x.answer ?? ""}${x.mistake ? ` · ${x.mistake}` : ""}`),
  );
  lines.push("", `Words to review: ${s.collection.missedWords.slice(0, 20).join(", ") || "none"}`);
  lines.push("", "Recent Titan entrances (his writing):", ...s.collection.entrances.slice(0, 5).map((e) => `- [${e.power}] ${e.text}`));
  lines.push("", "Errors (newest last):", ...(s.errors.length ? s.errors.slice(-15).map((e) => `- ${when(e.t)} · ${e.message} · ${e.where}`) : ["- none"]));
  navigator.clipboard?.writeText(lines.join("\n")).then(
    () => (btn.textContent = "✓ Copied"),
    () => (btn.textContent = "Couldn't copy"),
  );
}

export { esc, LEVELS };
