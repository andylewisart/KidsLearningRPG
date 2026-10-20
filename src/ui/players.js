// The grown-ups corner's "Players" section: each child's name and grade per
// subject, and who's playing now (one child, or everyone taking turns). The
// title screen has a quick switch for who's playing, so they needn't come here.

import { h } from "./dom.js";
import { getSave, update } from "../store/save.js";
import { SUBJECTS, GRADES, gradeName, freshPlayer, nextPlayerId, playerName, PLAYER_COLORS, focusChoices, subjectOf } from "../learn/players.js";
import { SKILLS, TRACK_NAMES } from "../learn/skills.js";

const MAX_PLAYERS = 4;

/** Who's playing, as choices: each child alone, then everyone taking turns. */
export function playingChoices(save = getSave()) {
  const ids = save.players.map((p) => p.id);
  const out = ids.map((id) => ({ ids: [id], label: `Just ${playerName(save.players, id)}` }));
  if (ids.length > 1) out.push({ ids, label: `${ids.length === 2 ? "Both" : "Everyone"}, taking turns (${ids.map((id) => playerName(save.players, id)).join(" & ")})` });
  return out;
}

/** A skill's name in the focus list; adding and subtracting share some names, so those say which. */
const skillName = (id) => (SUBJECTS[subjectOf(SKILLS[id].track)].tracks.length > 1 ? `${TRACK_NAMES[SKILLS[id].track]}: ${SKILLS[id].label}` : SKILLS[id].label);

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The title screen's short label for who's playing: "Sam", "Sam & Mia". */
export function playingLabel(save = getSave()) {
  return save.playing.map((id) => playerName(save.players, id)).join(" & ");
}

/** Step to the next who's-playing choice (the title screen's switch). */
export function cyclePlaying() {
  const choices = playingChoices();
  const i = choices.findIndex((c) => same(c.ids, getSave().playing));
  const next = choices[(i + 1) % choices.length];
  return update((s) => (s.playing = next.ids));
}

/**
 * The section itself. mastery: the players (learn/players.js), so a removed
 * child's cached progress is dropped too. onChange re-draws what depends on it.
 */
export function playersSection(mastery, onChange = () => {}) {
  const box = h("div.players");
  const open = new Set(); // which players' "practice more" lists are open, kept across redraws
  const changed = async (fn) => {
    await update(fn);
    draw();
    onChange();
  };

  /** "Practice more": skills a grown-up wants this child to see more of. */
  function focusBox(p) {
    const toggle = (id, on) =>
      changed((s) => {
        const x = s.players.find((q) => q.id === p.id);
        x.focus = on ? [...new Set([...(x.focus || []), id])] : (x.focus || []).filter((f) => f !== id);
      });
    const groups = Object.keys(SUBJECTS).map((key) => {
      const ids = focusChoices(p, key);
      return h(
        "div.focus-group",
        {},
        h("b", {}, SUBJECTS[key].label),
        h(
          "div.focus-skills",
          {},
          ...ids.map((id) =>
            h(
              "label.focus-skill",
              { title: `${SKILLS[id].standard}${SKILLS[id].example ? ` · e.g. ${SKILLS[id].example}` : ""}` },
              h("input", { type: "checkbox", checked: p.focus.includes(id), onchange: (e) => toggle(id, e.target.checked) }),
              skillName(id),
            ),
          ),
        ),
      );
    });
    const picked = p.focus.filter((id) => SKILLS[id] && focusChoices(p, subjectOf(SKILLS[id].track)).includes(id));
    return h(
      "details.focus",
      { open: open.has(p.id), ontoggle: (e) => (e.target.open ? open.add(p.id) : open.delete(p.id)) },
      h("summary", {}, picked.length ? `Practice more: ${picked.map(skillName).join(", ")}` : "Practice more (pick a weak spot)"),
      h("p.note", {}, "Ticked skills come up much more often for this child: every ★ question is one, and about half the ★★ ones. The rest of the time the game keeps climbing their ladder as usual. Untick a skill once it's solid."),
      ...groups,
    );
  }

  function draw() {
    const save = getSave();
    const choices = playingChoices(save);
    const playing = h(
      "select",
      { onchange: (e) => changed((s) => (s.playing = choices[Number(e.target.value)].ids)) },
      ...choices.map((c, i) => h("option", { value: i, selected: same(c.ids, save.playing) }, c.label)),
    );
    const cards = save.players.map((p, i) => {
      const grades = Object.entries(SUBJECTS).map(([key, subject]) =>
        h(
          "label.grade",
          {},
          h("span", {}, subject.label),
          h(
            "select",
            { onchange: (e) => changed((s) => (s.players.find((x) => x.id === p.id).grades[key] = Number(e.target.value))) },
            ...GRADES.map((g) => h("option", { value: g, selected: p.grades[key] === g }, gradeName(g))),
          ),
        ),
      );
      const remove =
        save.players.length > 1
          ? h(
            "button.btn.small.ghost",
            {
              onclick: () => {
                if (!confirm(`Remove ${playerName(save.players, p.id)}? Their progress against the standards goes too (the adventure stays).`)) return;
                mastery.forget?.(p.id);
                changed((s) => {
                  s.players = s.players.filter((x) => x.id !== p.id);
                  s.playing = s.playing.filter((id) => id !== p.id);
                  if (!s.playing.length) s.playing = [s.players[0].id];
                  delete s.turns.counts[p.id];
                  if (s.turns.last === p.id) s.turns.last = null;
                });
              },
            },
            "Remove",
          )
          : null;
      return h(
        "div.card.player-card",
        { style: { borderColor: PLAYER_COLORS[i % PLAYER_COLORS.length] } },
        h(
          "div.form-row",
          { style: { gridTemplateColumns: "220px 260px 1fr" } },
          h("b", {}, `Player ${i + 1}`),
          h("input", { type: "text", value: p.name, placeholder: `Player ${i + 1}`, maxlength: 18, onchange: (e) => changed((s) => (s.players.find((x) => x.id === p.id).name = e.target.value.trim())) }),
          h("span", {}, remove),
        ),
        h("div.grades", {}, ...grades),
        focusBox(p),
      );
    });
    const add =
      save.players.length < MAX_PLAYERS
        ? h(
          "button.btn.small",
          { onclick: () => changed((s) => s.players.push(freshPlayer(nextPlayerId(s.players), { grade: 1 }))) },
          "+ Add a player",
        )
        : null;
    box.replaceChildren(
      h(
        "p.note",
        {},
        "Each child keeps their own grade per subject and their own progress; the adventure is shared. A grade sets where they start on each hero's ladder, and the game still moves them up or down from there as they answer. Playing together, they take turns: a new child for every hero's turn and every puzzle, so both get every subject.",
      ),
      h("div.form-row", { style: { gridTemplateColumns: "220px 420px 1fr" } }, h("b", {}, "Who's playing"), playing, h("span")),
      ...cards,
      add,
    );
  }
  draw();
  return box;
}
