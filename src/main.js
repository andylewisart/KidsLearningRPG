// Crystal Titans: boot, the stage, and the flow between screens.

import { loadSave, getSave, update, logError } from "./store/save.js";
import { askPersistence } from "./store/db.js";
import { createMastery } from "./learn/mastery.js";
import { createRng } from "./util/rng.js";
import { loadManifest } from "./ui/sprites.js";
import { runBattle } from "./ui/battle.js";
import { titleScreen, resultsScreen, compendiumScreen, grownupsScreen } from "./ui/screens.js";
import { TRAINING, FIENDS } from "./battle/data.js";
import { stopSpeaking } from "./ai/voice.js";

const app = document.getElementById("app");

// Anything that goes wrong is kept for the grown-ups' play report.
window.addEventListener("error", (e) => logError(e.message, `${(e.filename || "").split("/").pop()}:${e.lineno || ""}`));
window.addEventListener("unhandledrejection", (e) => logError(e.reason?.message || e.reason, "promise"));
const stage = document.getElementById("stage");

function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.setProperty("--scale", String(Math.max(0.4, s)));
}
window.addEventListener("resize", fit);
fit();

/** After the four training fights: random holo-fights, with the boss now and then. */
function freeEncounter(rng) {
  if (rng.chance(0.2)) return { ...TRAINING[3], id: "free-boss", title: "Free Training: Geode Titan" };
  const pool = Object.keys(FIENDS).filter((id) => !FIENDS[id].boss);
  const fiends = Array.from({ length: rng.int(2, 3) }, () => rng.pick(pool));
  return {
    id: "free",
    title: "Free Training",
    fiends,
    party: ["knight", "gunner", "spellwright"],
    reserve: "titancaller",
    background: rng.pick(["bg_jungle_ruins", "bg_crystal_canyon"]),
    intro: "Random simulation. Bring the right hero for each fiend.",
  };
}

async function play(mastery, rng) {
  for (;;) {
    const save = getSave();
    const stageIndex = save.progress.training;
    const training = stageIndex < TRAINING.length;
    const encounter = training ? TRAINING[stageIndex] : freeEncounter(rng);
    const { won, quit, stats } = await runBattle(app, encounter, { mastery, rng });
    if (quit) return; // back to the title
    const results = resultsScreen(app, { won, stats, title: encounter.title, hasNext: training && stageIndex + 1 < TRAINING.length });
    await update((s) => {
      s.progress.shards += results.shards;
      if (won) {
        s.progress.battlesWon += 1;
        if (training) s.progress.training = stageIndex + 1;
      }
    });
    const next = await results.promise;
    stopSpeaking();
    if (next === "title") return;
    if (next === "compendium") {
      await compendiumScreen(app, mastery);
      return;
    }
  }
}

async function main() {
  await loadSave();
  askPersistence();
  await loadManifest();
  const mastery = createMastery(getSave().mastery);
  const rng = createRng();
  // For testing art and fights: ?battle=t1 … t4 or ?battle=free jumps straight into one.
  const jump = new URLSearchParams(location.search).get("battle");
  const encounter = jump === "free" ? freeEncounter(rng) : TRAINING.find((t) => t.id === jump);
  if (encounter) {
    const { won, quit, stats } = await runBattle(app, encounter, { mastery, rng });
    if (!quit) await resultsScreen(app, { won, stats, title: encounter.title, hasNext: false }).promise;
    stopSpeaking();
  }
  for (;;) {
    const choice = await titleScreen(app);
    if (choice === "play") await play(mastery, rng);
    else if (choice === "compendium") await compendiumScreen(app, mastery);
    else if (choice === "grownups") await grownupsScreen(app, mastery);
  }
}

main().catch((err) => {
  console.error(err);
  logError(err.message, "main");
  app.textContent = `Something went wrong: ${err.message}`;
});
