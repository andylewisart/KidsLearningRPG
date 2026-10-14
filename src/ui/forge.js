// The Sword Master's forge window (chapter 2, beat 8; the rules are
// world/forge.js): every hero's weapon as it is now, its next step with what
// that costs in parts, and a Forge button for each. It stays open while he
// forges one weapon after another (the story script plays the Sword Master's
// lines between), and closes when he steps away. The Legendary Weapons wait
// at the bottom, a seed for later: each needs a crest from a hidden boss, and
// the crest map from the Sage library points to the first.

import { h, onKeys } from "./dom.js";
import { uiIcon, MOVE_ICON } from "./icons.js";
import { sfx } from "./audio.js";
import { CLASSES } from "../battle/data.js";
import { PARTY_ORDER } from "../world/data.js";
import { WEAPONS, weaponOf, nextStep, forgeOf } from "../world/forge.js";

const pct = (x) => `${Math.round(x * 100)}%`;

/** A forged weapon's picture (icons/weapons_ch2); as they found it, the hero's move icon. Or a stand-in. */
function weaponPic(icon, cls) {
  const art = icon ? uiIcon(icon, "weapons_ch2") : uiIcon(MOVE_ICON[cls]);
  if (art) {
    art.classList.add("forge-pic");
    return art;
  }
  return h("span.forge-plain", {}, "🗡");
}

/**
 * The forge window over `layer`. Returns { pick(), forged(cls), close() }:
 * pick() resolves with the hero whose weapon he wants forged next (null when
 * he steps away, and the window closes); forged(cls) shows the hammer coming
 * down on the new step (already in the save).
 */
export function createForge(layer, { world: w, names = {} }) {
  const heroes = PARTY_ORDER.filter((c) => w.party.includes(c));
  const nameOf = (cls) => names[cls] || CLASSES[cls].hero;
  let sel = Math.max(0, heroes.findIndex((c) => nextStep(w, c)));
  let waiting = null; // the pick he's being asked for
  let calmUntil = 0; // the key that sent the Sword Master's line on shouldn't also forge

  const parts = h("div.forge-parts");
  const rows = h("div.forge-rows");
  const legend = h("div.forge-legend");
  const win = h("div.window.forge", {}, h("div.forge-head", {}, h("h2", {}, "The Sword Master's Forge"), parts), rows, legend, h("div.forge-help", {}, "↑↓ pick a hero · Enter: forge · Esc: step away"), h("button.btn.ghost.forge-close", { onclick: () => answer(null) }, "✕ Step away (Esc)"));
  const dim = h("div.dimmer.forge-dim");
  layer.append(dim, win);
  win.animate([{ opacity: 0, transform: "translate(-50%, -46%)" }, { opacity: 1, transform: "translate(-50%, -50%)" }], { duration: 400, easing: "ease-out" });
  const rowEls = {};

  function draw() {
    parts.replaceChildren(h("span.forge-gear", {}, "⚙"), h("b", {}, String(forgeOf(w).parts)), " parts");
    rows.replaceChildren(
      ...heroes.map((cls, i) => {
        const now = weaponOf(w, cls);
        const next = nextStep(w, cls);
        const short = next && next.cost > forgeOf(w).parts;
        // the pointer picks a row only when it moves: a row drawn under a resting pointer doesn't steal the pick
        const row = h(
          `div.forge-row${i === sel ? ".sel" : ""}${next ? "" : ".done"}`,
          { onclick: () => ((sel = i), draw()), onmousemove: () => sel !== i && ((sel = i), mark()) },
          h("div.forge-who", {}, nameOf(cls)),
          h("div.forge-now", {}, weaponPic(now.icon, cls), h("span", {}, now.name || `${nameOf(cls)}'s ${WEAPONS[cls].now}`)),
          next
            ? h("div.forge-next", {}, h("span.forge-arrow", {}, "→"), weaponPic(next.icon, cls), h("div", {}, h("b", {}, next.name), h("small", {}, `Hits land ${pct(next.power)} harder`)))
            : h("div.forge-next.forge-max", {}, "Fully forged"),
          next ? h(`div.forge-cost${short ? ".short" : ""}`, {}, `⚙ ${next.cost}`) : h("div.forge-cost"),
          next ? h("button.btn.gold.forge-btn", { onclick: (e) => (e.stopPropagation(), (sel = i), answer(cls)) }, "⚒ Forge") : h("span"),
        );
        row.style.setProperty("--tint", CLASSES[cls].color);
        rowEls[cls] = row;
        return row;
      }),
    );
    // the season's hunt, seeded: a Legendary Weapon for each hero, behind a crest
    legend.replaceChildren(
      h("span.forge-legend-lock", {}, "🔒"),
      h("span", {}, w.items.includes("crest_map") ? "Legendary Weapons: each needs a crest from a hidden boss. Your crest map points to the first." : "Legendary Weapons: each needs a crest from a hidden boss. Somewhere, a Sage crest map points to the first."),
    );
  }
  const mark = () => heroes.forEach((c, i) => rowEls[c]?.classList.toggle("sel", i === sel));

  function answer(cls) {
    if (!waiting) return;
    const d = waiting;
    waiting = null;
    sfx.select();
    if (cls === null) close();
    d(cls);
  }

  const off = onKeys((e) => {
    if (!waiting || performance.now() < calmUntil) {
      // Enter and Space are the forge's while it's open: a Forge button he clicked mustn't take them either
      if (e.key === "Enter" || e.key === " ") e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : heroes.length - 1)) % heroes.length;
      sfx.select();
      mark();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (nextStep(w, heroes[sel])) answer(heroes[sel]);
      else sfx.back();
    } else if (e.key === "Escape") answer(null);
  });

  function close() {
    off();
    win.remove();
    dim.remove();
  }

  draw();
  return {
    pick() {
      draw();
      calmUntil = performance.now() + 400;
      return new Promise((resolve) => (waiting = resolve));
    },
    /** The hammer comes down: a clang, a flash, and the new weapon in its row. */
    async forged(cls) {
      draw();
      const row = rowEls[cls];
      const pic = row?.querySelector(".forge-now");
      sfx.clang();
      setTimeout(() => sfx.clang(), 260);
      setTimeout(() => sfx.play("sfx_puzzle_solved") || sfx.right(), 620);
      row?.animate([{ filter: "brightness(2.2)" }, { filter: "brightness(1)" }], { duration: 900, easing: "ease-out" });
      await pic?.animate([{ transform: "scale(1.6) rotate(-8deg)", opacity: 0.2 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 700, easing: "cubic-bezier(.2,.9,.3,1.3)" }).finished;
    },
    close() {
      if (waiting) answer(null);
      else if (win.isConnected) close();
    },
  };
}
