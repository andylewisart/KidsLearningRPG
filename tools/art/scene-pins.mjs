// Each painted scene's pin row, as the game works it out (paintedLayout), and its walkable floor, for scene_depth.py.
import { readFileSync } from "node:fs";
import { SCENES } from "../../src/world/data.js";
import { SCENES2 } from "../../src/world/data2.js";
import { paintedLayout } from "../../src/world/painted.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const assets = read("../../public/assets/manifest.json").assets;
const layout = read("../../src/ui/stage-layout.json").explore;
const pins = {};
for (const scene of Object.values({ ...SCENES, ...SCENES2 })) {
  if (scene.painted && assets[scene.painted]) pins[scene.painted] = { pin: paintedLayout(assets[scene.painted], scene, layout).pinY, walk: scene.walk };
}
console.log(JSON.stringify(pins));
