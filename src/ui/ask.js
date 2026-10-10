// A problem outside battle (the adventure's puzzles), with the same help as
// in a fight: a wrong answer offers "Show me", "Ask Kit" or "Skip", then one
// more try. Every answer is recorded for mastery and the grown-ups' report.
// No timers are shown; answer time is kept quietly, as in battles.

import { wait } from "./dom.js";
import { ProblemPanel } from "./panels.js";
import { openTutor } from "./tutor.js";
import { tutorContext } from "../ai/prompts.js";
import { speak } from "../ai/voice.js";
import { quip } from "../content/quips.js";
import { SKILLS } from "../learn/skills.js";
import { CLASSES } from "../battle/data.js";
import { getSave, update } from "../store/save.js";
import { aiJudge } from "../ai/judge.js";

/** Write one answer into mastery and the save (same log as battles). */
export function recordAnswer(mastery, q, { correct, hinted, ms, code, given }) {
  mastery.record(q.skill, { correct, tier: q.tier || 1, hinted, ms });
  update((s) => {
    s.mastery = mastery.toJSON();
    s.log.push({ t: Date.now(), skill: q.skill, tier: q.tier || 1, correct, hinted, ms: Math.round(ms || 0), mistake: code || null, given: given ?? null, answer: q.answerText, where: "adventure" });
    if (q.word) {
      const w = (s.collection.words[q.word] ||= { right: 0, wrong: 0 });
      if (correct) w.right += 1;
      else {
        w.wrong += 1;
        s.collection.missedWords = [q.word, ...s.collection.missedWords.filter((x) => x !== q.word)].slice(0, 40);
      }
    }
  });
}

/** For a writing puzzle: Claude's reading of it (null without a key: the puzzle's word list decides). */
function readWriting(q, value) {
  return q.aiWriting ? aiJudge({ task: q.aiWriting.task, text: value }) : null;
}

/**
 * Run one puzzle problem. Resolves:
 *   "right"  solved first time
 *   "retry"  solved after help
 *   "miss"   not solved (the story offers another go)
 *   "back"   he stepped away with Esc before answering
 */
export async function askPuzzle(layer, q, { mastery, rng }) {
  const save = getSave();
  const droid = save.names.droid || "Kit";
  const panel = new ProblemPanel(layer, { ...q.panel, allowCancel: true, footNote: "Esc to step away and come back later" });
  const first = await panel.answer();
  if (!first) {
    panel.close();
    return "back";
  }
  panel.opts.allowCancel = false;
  panel.foot?.remove();
  const g = q.grade(first.value, await readWriting(q, first.value));
  if (g.correct) {
    panel.markRight();
    recordAnswer(mastery, q, { correct: true, hinted: false, ms: first.ms, given: first.value });
    await wait(500);
    panel.close();
    return "right";
  }
  panel.markWrong();
  recordAnswer(mastery, q, { correct: false, hinted: false, ms: first.ms, code: g.code, given: first.value });
  const canAsk = Boolean(save.settings.anthropicKey);
  const choice = await panel.chooseHelp({ droidName: droid, canAsk });
  if (choice === "skip") {
    panel.close();
    return "miss";
  }
  const hint = q.hint(first.value);
  if (choice === "ask" && canAsk) {
    const ctx = tutorContext({
      heroName: save.names.knight || CLASSES.knight.hero,
      prompt: q.tutor.prompt,
      equation: q.tutor.equation,
      answer: q.tutor.answer,
      attempts: [String(first.value)],
      mistake: g.code && g.code !== "unknown" ? `${g.code}: ${hint.text}` : "",
      skillLabel: SKILLS[q.skill]?.label || q.skill,
      standard: SKILLS[q.skill]?.standard || "",
      level: mastery.level(q.skill),
    });
    panel.el.style.visibility = "hidden";
    await openTutor(layer, { context: ctx, recap: q.panel.ask, backLabel: "Back to the puzzle (Esc)" });
    panel.el.style.visibility = "visible";
  } else {
    panel.showHint(hint.text, hint.visual);
    if (choice === "ask") panel.note(droid, quip("noKey", rng));
    else speak(hint.text, "droid");
  }
  // Spelling: look at the rule, then cover it and spell again.
  if (q.task) {
    await wait(choice === "ask" ? 0 : 2600);
    panel.clearHint();
  }
  panel.retry("Your turn again.");
  const second = await panel.answer();
  const g2 = q.grade(second?.value ?? "", second ? await readWriting(q, second.value) : null);
  if (second && g2.correct) {
    panel.markRight();
    recordAnswer(mastery, q, { correct: true, hinted: true, ms: second.ms, given: second.value });
    await wait(500);
    panel.close();
    return "retry";
  }
  panel.markWrong();
  recordAnswer(mastery, q, { correct: false, hinted: true, ms: second?.ms || 0, code: g2.code, given: second?.value });
  panel.note(droid, `It was ${q.answerText}. We'll get the next one.`);
  await wait(2200);
  panel.close();
  return "miss";
}
