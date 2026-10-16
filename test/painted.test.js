// Painted exploration scenes (art wave 04): the paintings' measurements turned
// into places to click, stand and walk (src/world/painted.js), and walking
// around the things painted on the ground (src/world/state.js).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SCENES } from "../src/world/data.js";
import { PAINTED, VISIBLE } from "../src/world/story.js";
import { paintedReady, patchOnly, paintedLayout, paintingToStage, activeStates } from "../src/world/painted.js";
import { freshWorld, inside, inBlock, freePoint, findPath, stepToward, clearLine, trailPointFrom, followStep, walkingNow, STAND_AFTER } from "../src/world/state.js";

const ASSETS = JSON.parse(fs.readFileSync(new URL("../public/assets/manifest.json", import.meta.url))).assets;
const LAYOUT = JSON.parse(fs.readFileSync(new URL("../src/ui/stage-layout.json", import.meta.url)));
const painted = Object.entries(SCENES).filter(([, sc]) => sc.painted && ASSETS[sc.painted]);

const allVisible = (sceneId, w) => SCENES[sceneId].hotspots.filter((h) => (VISIBLE[`${sceneId}.${h.id}`] ? VISIBLE[`${sceneId}.${h.id}`](w) : true));

test("the explore guides and the game agree on where painting pixels land", () => {
  const map = paintingToStage(LAYOUT.explore);
  // the floor's back edge (60% down the painting) is at stage y 380, centered across
  const [x, y] = map.pt([768, 1024 * LAYOUT.explore.floorEdgeImage]);
  assert.ok(Math.abs(x - 640) < 0.01 && Math.abs(y - LAYOUT.explore.floorEdgeStageY) < 0.01);
});

test("every painted scene has a patch for every change, and a rule for when it shows", () => {
  assert.ok(painted.length >= 5, "the five chapter 1 places are painted");
  for (const [id, sc] of painted) {
    const art = ASSETS[sc.painted];
    assert.ok(paintedReady(art), `${id}: painting and every state patch present`);
    for (const st of Object.keys(art.states || {})) assert.ok(PAINTED[`${id}.${st}`], `${id}.${st} has a rule in story.js PAINTED`);
  }
  for (const key of Object.keys(PAINTED)) {
    const [id, st] = key.split(".");
    assert.ok(ASSETS[SCENES[id].painted]?.states?.[st], `PAINTED ${key} matches a state in the manifest`);
  }
});

test("everything painted in is a hotspot, and every drawn thing is painted", () => {
  for (const [id, sc] of painted) {
    const art = ASSETS[sc.painted];
    const ids = new Set(sc.hotspots.map((h) => h.id));
    for (const o of Object.keys(art.objects)) if (!patchOnly(art, o)) assert.ok(ids.has(o), `${id}: painted ${o} is something he can click`);
    // a `drawn` prop is drawn over the painting (chapter 2's bottle at the cove)
    for (const h of sc.hotspots) if ((h.prop && !h.drawn) || h.area) assert.ok(art.objects[h.id], `${id}: ${h.id} is in the painting`);
  }
});

test("a painted scene's states follow the story", () => {
  const w = freshWorld();
  const cove = ASSETS.scene_cove;
  assert.deepEqual(activeStates(cove, "cove", w, PAINTED), []);
  w.flags.bottle = true;
  w.shards.push("cove");
  assert.deepEqual(activeStates(cove, "cove", w, PAINTED).sort(), ["bottle_gone", "chest_open"]);
});

test("he can stand at, and walk to, everything in each painted scene", () => {
  for (const [id, sc] of painted) {
    const layout = paintedLayout(ASSETS[sc.painted], sc, LAYOUT.explore);
    const w = freshWorld();
    const shown = allVisible(id, w);
    const blocks = layout.blocks(shown.map((h) => h.id));
    const from = freePoint(sc.start, sc.walk, blocks);
    assert.ok(!blocks.some((b) => inBlock(from, b)), `${id}: the start is clear`);
    if (sc.fromMap) assert.ok(!blocks.some((b) => inBlock(freePoint(sc.fromMap, sc.walk, blocks), b)), `${id}: arriving from the map is clear`);
    for (const raw of shown) {
      if (raw.edge) continue;
      const hot = layout.place(raw, w);
      const [dx, dy] = hot.approach || [0, 60];
      const spot = freePoint([hot.x + dx, hot.y + dy], sc.walk, blocks);
      assert.ok(inside(spot, sc.walk) && !blocks.some((b) => inBlock(spot, b)), `${id}.${raw.id}: somewhere to stand`);
      const path = findPath(from, spot, sc.walk, blocks);
      const end = path[path.length - 1];
      assert.ok(Math.hypot(end[0] - spot[0], end[1] - spot[1]) < 1, `${id}.${raw.id}: reachable`);
      let prev = from;
      for (const p of path) {
        assert.ok(clearLine(prev, p, sc.walk, blocks, 3), `${id}.${raw.id}: the way there doesn't cross anything`);
        prev = p;
      }
      // a click area covers the painted thing, on screen at some camera position
      if (hot.area) {
        const [x0, y0, x1, y1] = hot.area;
        assert.ok(x1 > x0 && y1 > y0 && y1 > 60 && y0 < 700, `${id}.${raw.id}: its click area is on screen`);
      }
    }
  }
});

test("the floor slides only in front of everything standing", () => {
  for (const [id, sc] of painted) {
    const art = ASSETS[sc.painted];
    const layout = paintedLayout(art, sc, LAYOUT.explore);
    for (const h of sc.hotspots) {
      const o = layout.objects[h.id];
      if (!o || h.flat || h.area || !art.objects[h.id].ground) continue;
      assert.ok(o.ground[1] <= layout.pinY, `${id}.${h.id} stands behind the pin row (${Math.round(o.ground[1])} vs ${layout.pinY}), so it never leans`);
    }
  }
});

test("Knox is painted in his cage until it opens, then steps out in front of it", () => {
  const sc = SCENES.temple_hall;
  const layout = paintedLayout(ASSETS[sc.painted], sc, LAYOUT.explore);
  const knox = sc.hotspots.find((h) => h.id === "spellwright");
  const w = freshWorld();
  const caged = layout.place(knox, w);
  assert.ok(caged.area && caged.inner && !caged.sprite, "a click area inside the cage");
  assert.equal(layout.place(knox, w), caged, "the same object while nothing changes");
  w.flags.cageOpen = true;
  const free = layout.place(knox, w);
  assert.equal(free.sprite, "spellwright");
  assert.ok(free.y >= layout.walkTop, "he stands on the walkable ground");
});

test("the monkeys sit on painted things, on screen", () => {
  for (const [id, sc] of painted) {
    const layout = paintedLayout(ASSETS[sc.painted], sc, LAYOUT.explore);
    for (const h of sc.hotspots.filter((x) => x.paintedPerch)) {
      const p = layout.place(h, freshWorld());
      const [x0, y0, x1, y1] = layout.objects[h.paintedPerch.on].box;
      assert.ok(p.x > x0 && p.x < x1, `${id}.${h.id} sits over its ${h.paintedPerch.on}`);
      const top = p.y - p.liftPx;
      assert.ok(top >= y0 && top <= y1 && top > 110, `${id}.${h.id}: its seat is on the ${h.paintedPerch.on}, low enough to show (${Math.round(top)})`);
    }
  }
});

test("walking around something in the way: the way round, never through", () => {
  const poly = [[-150, 432], [1440, 432], [1460, 676], [-170, 676]];
  const pool = { cx: 957, cy: 478, rx: 250, ry: 64 };
  const path = findPath([600, 480], [1300, 480], poly, [pool]);
  assert.ok(path.length > 1, "it goes round");
  let prev = [600, 480];
  for (const p of path) {
    assert.ok(clearLine(prev, p, poly, [pool], 3));
    prev = p;
  }
  // a spot inside it moves to its edge
  const out = freePoint([957, 478], poly, [pool]);
  assert.ok(!inBlock(out, pool) && inside(out, poly));
  // stepping into it slides along its edge instead
  let p = [690, 478];
  for (let i = 0; i < 200; i++) {
    p = stepToward(p, [1300, 478], 8, poly, [pool]).pos;
    assert.ok(!inBlock(p, pool), "never inside");
  }
  assert.ok(p[0] > 1200, `got past it (${Math.round(p[0])})`);
  // with nothing in the way it's one straight walk
  assert.deepEqual(findPath([0, 500], [400, 600], poly, []), [[400, 600]]);
});

test("a spot on his trail is measured from where he stands now", () => {
  const trail = [[0, 0], [6, 0], [12, 0], [12, 6]];
  assert.deepEqual(trailPointFrom(trail, 3), [12, 3], "from the newest point");
  assert.deepEqual(trailPointFrom(trail, 3, [12, 10]), [12, 7], "from where he stands, past the newest point");
  assert.deepEqual(trailPointFrom(trail, 10, [12, 10]), [12, 0]);
  assert.deepEqual(trailPointFrom(trail, 100, [12, 10]), [0, 0], "a short trail: its oldest point");
  assert.deepEqual(trailPointFrom([[5, 5], [5, 5]], 0, [5, 5]), [5, 5], "repeated points");
});

test("the party walks his trail steadily at any frame rate, never flickering to standing", () => {
  const WALK = 300 * 0.55; // the slowest he walks, at the back of a scene, where the steps are smallest
  const GAP = 95;
  for (const fps of [30, 60, 144]) {
    const dt = 1 / fps;
    const trail = [];
    for (let x = -396; x <= 0; x += 6) trail.push([x, 0]); // ending where he stands, as the game lays it
    const hero = { x: 0, y: 0 };
    const party = [1, 2, 3].map((i) => {
      const [x, y] = trailPointFrom(trail, GAP * i);
      return { x, y };
    });
    const frames = 2 * fps; // he walks for two seconds, then stops
    for (let k = 0; k < frames + fps; k++) {
      const walking = k < frames;
      if (walking) hero.x += WALK * dt;
      const last = trail[trail.length - 1];
      if (Math.hypot(hero.x - last[0], hero.y - last[1]) > 6) trail.push([hero.x, hero.y]);
      party.forEach((m, i) => {
        const moved = followStep(m, trailPointFrom(trail, GAP * (i + 1), [hero.x, hero.y]), WALK * 1.15 * dt);
        const walks = walkingNow(m, moved, dt);
        if (walking) {
          assert.ok(walks, `${fps} fps, frame ${k}: follower ${i + 1} flickered to standing`);
          assert.ok(Math.abs(moved - WALK * dt) < 1e-6, `${fps} fps, frame ${k}: follower ${i + 1} stepped ${moved.toFixed(2)} px, not ${(WALK * dt).toFixed(2)}`);
        }
        if (k > frames + fps * STAND_AFTER + 1) assert.ok(!walks, `${fps} fps: follower ${i + 1} stands once he stops`);
      });
    }
    party.forEach((m, i) => assert.ok(Math.abs(hero.x - m.x - GAP * (i + 1)) < 0.01, `${fps} fps: follower ${i + 1} ends ${GAP * (i + 1)} px behind him`));
  }
});
