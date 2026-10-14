// The grown-ups' play report: plain text to paste into a chat with Claude.
// Pure, so it's tested: screens.js hands it the save, the skill summary and
// how to write dates and times on this laptop.

import { TRACK_NAMES, inTeachingOrder } from "../learn/skills.js";
import { SUBJECTS, gradeName } from "../learn/players.js";
import { TRAINING } from "../battle/data.js";

/**
 * save     the save file (store/save.js)
 * skills   mastery.summary()
 * env      { now, build, screen, browser, when(t) → "10/11/2026, 11:55 AM", day(t) → "2026-10-11",
 *            players: [{ id, name, grades, skills }] (optional: every child, each with their own summary) }
 */
export function buildReport(save, skills, env) {
  const s = save;
  const w = s.world;
  const lines = [
    `Crystal Titans report (${env.when(env.now)})`,
    `Build: ${env.build}. Screen: ${env.screen}. Browser: ${env.browser}`,
    `Battles won: ${s.progress.battlesWon}. Set battles cleared: ${s.progress.training}/${TRAINING.length}. Glimmer: ${s.progress.shards}.`,
    w?.started
      ? `Adventure: in ${w.scene}, party ${w.party.join(", ")}, crystal shards ${w.shards.length}/4${w.finished ? " (chapter 1 done)" : ""}, items ${w.items.join(", ") || "none"}, story flags ${Object.keys(w.flags).length}.`
      : "Adventure: not started yet.",
  ];
  if (s.fight?.encounter) {
    const foes = s.fight.b?.fiends || [];
    const boss = foes.find((f) => f.boss);
    const state = boss ? `the boss on HP bar ${boss.bar} of ${boss.bars}` : `${foes.filter((f) => !f.ko).length} of ${foes.length} fiends left`;
    lines.push(`Saved mid-fight: ${s.fight.encounter.title}, ${state}, ${s.fight.stats?.total ?? 0} answers in so far (saved ${env.when(s.fight.t)}). Continue picks it up.`);
  }
  lines.push(
    `Settings: sound ${s.settings.sound ? "on" : "off"}, read aloud ${s.settings.voice ? "on" : "off"}, voice ${s.settings.voiceProvider || "auto"}. Keys set: Claude ${s.settings.anthropicKey ? "yes" : "no"}, OpenAI ${s.settings.openaiKey ? "yes" : "no"}, ElevenLabs ${s.settings.elevenKey ? "yes" : "no"}.`,
    `AI use today (${s.usage.day || "none"}): tutor ${s.usage.tutor}, judge ${s.usage.judge}, speech ${s.usage.speech}, listen ${s.usage.listen}.`,
  );

  // ---------------------------------------------------------------- every day saved
  const days = new Map();
  const dayOf = (t) => {
    const d = env.day(t);
    if (!days.has(d)) days.set(d, { fights: 0, won: 0, lost: 0, quit: 0, answers: 0, clean: 0, puzzles: 0 });
    return days.get(d);
  };
  for (const x of s.battles) {
    const d = dayOf(x.t);
    d.fights += 1;
    if (x.outcome === "won") d.won += 1;
    else if (x.outcome === "lost") d.lost += 1;
    else d.quit += 1;
  }
  for (const x of s.log) {
    const d = dayOf(x.t);
    d.answers += 1;
    if (x.correct && !x.hinted) d.clean += 1;
    if (x.where === "adventure") d.puzzles += 1;
  }
  lines.push("", `Play by day (everything saved: ${s.battles.length} fights, ${s.log.length} answers):`);
  for (const [day, d] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    const fights = d.fights ? `${d.fights} fight${d.fights === 1 ? "" : "s"} (${[d.won && `${d.won} won`, d.lost && `${d.lost} lost`, d.quit && `${d.quit} left`].filter(Boolean).join(", ")})` : "no fights";
    const answers = d.answers ? `${d.answers} answers${d.puzzles ? ` (${d.puzzles} in puzzles)` : ""}, ${Math.round((100 * d.clean) / d.answers)}% right first try` : "no answers";
    lines.push(`- ${day} · ${fights} · ${answers}`);
  }

  // ---------------------------------------------------------------- fights
  lines.push("", `Fights (newest first, all ${s.battles.length} saved):`);
  for (const x of [...s.battles].reverse()) {
    // fights saved before the play-time clock counted breaks too
    const minutes = `${x.minutes} min${x.active ? "" : " (clock time, breaks included)"}`;
    lines.push(`- ${env.when(x.t)} · ${x.title} · ${x.outcome} · ${minutes} · ${x.right}/${x.total} right first try · hints ${x.hints} · stars ★${x.tiers[1]} ★★${x.tiers[2]} ★★★${x.tiers[3]} · swaps ${x.swaps} · potions ${x.potions} · overdrives ${x.overdrives} · summons ${x.summons} · captures ${x.captures}`);
  }

  // ---------------------------------------------------------------- skills, by subject
  const players = env.players?.length ? env.players : [{ name: "", grades: null, skills }];
  const many = players.length > 1;
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  if (many) lines.push("", `Players: ${players.map((p) => p.name).join(", ")}. Playing now: ${(s.playing || []).map((id) => names[id] || id).join(" and ")}${(s.playing || []).length > 1 ? ", taking turns" : ""}.`);
  for (const p of players) {
    const grades = p.grades ? Object.entries(SUBJECTS).map(([k, sub]) => `${sub.label.toLowerCase()} ${gradeName(p.grades[k])}`).join(", ") : "";
    lines.push("", `${many ? `${p.name}'s skills` : "Skills"} (Utah code, level, right/attempts), easiest first${grades ? `. Grades: ${grades}` : ""}:`);
    let track = null;
    for (const r of inTeachingOrder(p.skills)) {
      if (r.track !== track) {
        track = r.track;
        lines.push(`${TRACK_NAMES[track] || track}:`);
      }
      lines.push(`- ${r.label} (${r.standard}): ${r.level}, ${r.correct}/${r.attempts}`);
    }
  }

  const counts = {};
  for (const x of s.log) if (!x.correct && x.mistake) counts[x.mistake] = (counts[x.mistake] || 0) + 1;
  lines.push("", "Mistake patterns:", ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`));

  // ---------------------------------------------------------------- answers
  lines.push("", "Last 40 answers (oldest first):");
  for (const x of s.log.slice(-40)) {
    const parts = [env.when(x.t), `${x.skill} ★${x.tier}`];
    if (many && names[x.who]) parts.push(names[x.who]);
    if (x.where === "adventure") parts.push("puzzle");
    if (x.asked) parts.push(`asked ${x.asked}`);
    parts.push(`${x.correct ? "right" : "wrong"}${x.hinted ? " after help" : ""}`, `${(x.ms / 1000).toFixed(1)}s`, `gave ${x.given ?? ""}`, `answer ${x.answer ?? ""}`);
    if (x.mistake) parts.push(x.mistake);
    lines.push(`- ${parts.join(" · ")}`);
  }
  lines.push("", `Words to review: ${s.collection.missedWords.slice(0, 20).join(", ") || "none"}`);
  lines.push("", "Recent Titan entrances (his writing):", ...s.collection.entrances.slice(0, 5).map((e) => `- [${e.power}] ${e.text}`));
  lines.push("", "Errors (newest last):", ...(s.errors.length ? s.errors.slice(-15).map((e) => `- ${env.when(e.t)} · ${e.message} · ${e.where}`) : ["- none"]));
  return lines.join("\n");
}

/** The skill rows with a heading row where the subject changes, for the grown-ups' table. */
export function skillRowsBySubject(skills) {
  const out = [];
  let track = null;
  for (const r of inTeachingOrder(skills)) {
    if (r.track !== track) {
      track = r.track;
      out.push({ heading: TRACK_NAMES[track] || track });
    }
    out.push(r);
  }
  return out;
}

