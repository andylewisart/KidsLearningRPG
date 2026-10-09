// Painted exploration scenes (art wave 04, art/waves/wave-04-scenes.md). Each
// place is one painting with its objects painted in, and each change (the
// chest opening, the gate's light going out) is a patch cut from a repainted
// copy. This file turns the painting's measurements (the manifest's `objects`
// and `states`) into the game's stage coordinates: where to click, where to
// stand, what's in the way, where the floor starts sliding in perspective, and
// where the monkey sits. Pure, so it's tested (test/painted.test.js).

const STAGE_W = 1280;

/** Painting pixels → stage pixels (camera at 0), for a fit like LAYOUT.explore. */
export function paintingToStage(fit, [imgW, imgH] = [1536, 1024]) {
  const left = (STAGE_W - imgW * fit.scale) / 2;
  const top = fit.floorEdgeStageY - fit.floorEdgeImage * imgH * fit.scale;
  const pt = ([x, y]) => [left + x * fit.scale, top + y * fit.scale];
  const box = ([x0, y0, x1, y1]) => [...pt([x0, y0]), ...pt([x1, y1])];
  return { pt, box, scale: fit.scale };
}

/** A painted scene the game can use: every change the story makes has its patch, or the painting would show the wrong thing. */
export function paintedReady(art) {
  return Boolean(art && art.kind === "explore" && art.base?.src && Object.values(art.states || {}).every((st) => st.src));
}

/** The painted changes showing for this world: the state names whose rule holds (rules: "scene.state" → (world) → bool). */
export function activeStates(art, sceneId, world, rules) {
  return Object.keys(art.states || {}).filter((st) => rules[`${sceneId}.${st}`]?.(world));
}

const APPROACH_GAP = 46; // how far beside something low he stands to use it
const FRONT = 34; // how far in front of the walkable ground's back edge he stands to use something behind it
const NARROW = 200; // things at the back narrower than this, he stands beside

/**
 * Lay a scene out on its painting.
 *   art    the manifest entry (kind "explore")
 *   scene  the SCENES entry: hotspots and walk
 *   fit    LAYOUT.explore
 * Returns:
 *   objects        { id: { box, ground, boards, rope } } in stage pixels
 *   pinY           the floor row the nearest standing painted thing stands on:
 *                  rows nearer than it slide in perspective (scene.js)
 *   place(hot, w)  a hotspot as it is in this painting right now (see below)
 *   blocks(ids)    rounded boxes he can't walk into, for these showing hotspots
 *
 * place() moves each hotspot onto the painting:
 *   - something painted in (the chest, the gate) becomes a click area over its
 *     box, with its ground point and a spot to stand computed from the box
 *   - a character painted in for now (Knox in his cage: `inPainting`) is an
 *     area too, until the world flag frees him; then a sprite in front of it
 *   - a sprite with a `paintedPerch` sits on that painted object (the monkey
 *     on the signpost), with its lift in stage pixels (`liftPx`), at
 *     `paintedPerch.scale` of its size
 *   - anything else is unchanged
 * The same hotspot in the same state is always the same object, so the
 * explore screen can tell when one has changed.
 */
export function paintedLayout(art, scene, fit) {
  const map = paintingToStage(fit, [art.base.w || 1536, art.base.h || 1024]);
  const walkTop = Math.min(...scene.walk.map((p) => p[1]));
  const walkBottom = Math.max(...scene.walk.map((p) => p[1]));

  const objects = {};
  for (const [id, o] of Object.entries(art.objects || {})) {
    const box = map.box(o.box);
    const ground = o.ground ? map.pt(o.ground) : [(box[0] + box[2]) / 2, box[3]];
    const boards = (o.boards || []).map((b) => {
      const [cx, cy] = map.pt(b.center);
      return { center: [cx, cy], width: b.width * map.scale, height: b.height * map.scale, tilt: b.tilt || 0 };
    });
    const rope = o.rope ? o.rope.map(map.pt) : null;
    objects[id] = { box, ground, boards, rope };
  }

  const hotById = Object.fromEntries(scene.hotspots.map((h) => [h.id, h]));
  // he can't stand between a painted thing and the painting behind it, so the
  // floor rows behind the nearest standing thing don't slide: they're its backdrop
  const standing = Object.keys(objects).filter((id) => hotById[id] && !hotById[id].area && !hotById[id].flat && art.objects[id].ground);
  const grounds = standing.map((id) => objects[id].ground[1]);
  const pinY = Math.round((grounds.length ? Math.max(...grounds) : walkTop - 40) + 6);

  /**
   * Where he stands to use a painted thing: in front of something big at the
   * back (a door), beside something small at the back (the rest crystal, so he
   * doesn't hide it), and beside anything down on the walkable ground.
   */
  function approachFor(hot, o) {
    const [x0, , x1] = o.box;
    const [gx, gy] = o.ground;
    const side = Math.sign(hot.approach?.[0] || 0) || (gx < STAGE_W / 2 ? 1 : -1);
    const beside = side > 0 ? x1 + APPROACH_GAP : x0 - APPROACH_GAP;
    const low = hot.flat || gy > walkTop + 12;
    if (low) return [beside, Math.min(walkBottom - 10, Math.max(walkTop + 8, gy + 4))];
    if (x1 - x0 < NARROW) return [beside, walkTop + FRONT];
    return [Math.max(x0 + 24, Math.min(x1 - 24, gx)), walkTop + FRONT];
  }

  const cache = new Map();
  const remember = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };

  function place(hot, w) {
    // painted into the scene: a click area
    const o = objects[hot.id];
    if (o && !hot.sprite) {
      return remember(hot.id, () => {
        const [ax, ay] = approachFor(hot, o);
        const [gx, gy] = o.ground;
        const { prop, size, lift, ...rest } = hot;
        return { ...rest, area: o.box, x: gx, y: gy, approach: [ax - gx, ay - gy], painted: true };
      });
    }
    // a character painted in for now (Knox in his cage)
    const inP = hot.inPainting;
    if (inP && objects[inP.inside]) {
      const holder = objects[inP.inside];
      const [bx0, by0, bx1, by1] = holder.box;
      const [fx0, fy0, fx1, fy1] = inP.box || [0.2, 0.3, 0.8, 0.95];
      if (!w?.flags?.[inP.until]) {
        return remember(`${hot.id}:painted`, () => {
          const [gx, gy] = holder.ground;
          const [ax, ay] = approachFor(hotById[inP.inside] || hot, holder);
          const { sprite, size, lift, ...rest } = hot;
          const area = [bx0 + fx0 * (bx1 - bx0), by0 + fy0 * (by1 - by0), bx0 + fx1 * (bx1 - bx0), by0 + fy1 * (by1 - by0)];
          return { ...rest, area, x: gx, y: gy, approach: [ax - gx, ay - gy], painted: true, inner: true };
        });
      }
      // freed: he steps out in front of it
      return remember(`${hot.id}:free`, () => {
        const x = holder.ground[0];
        const y = Math.max(walkTop + 14, holder.ground[1]);
        return { ...hot, x, y, lift: 0, approach: [0, 28] };
      });
    }
    // a sprite perched on something painted (the monkey on the signpost)
    const perch = hot.paintedPerch;
    if (perch && objects[perch.on]) {
      return remember(`${hot.id}:perch`, () => {
        const [bx0, by0, bx1, by1] = objects[perch.on].box;
        const x = bx0 + perch.at[0] * (bx1 - bx0);
        const top = by0 + perch.at[1] * (by1 - by0);
        const y = objects[perch.on].ground[1];
        const [ax, ay] = approachFor(hotById[perch.on] || hot, objects[perch.on]);
        const size = perch.scale ? hot.size.map((v) => v * perch.scale) : hot.size;
        return { ...hot, x, y, size, liftPx: y - top, lift: 0, approach: [ax - x, ay - y] };
      });
    }
    return hot;
  }

  /** Rounded boxes he walks around (state.js): low things lying on the walkable ground, and the ground behind anything standing on it. */
  function blocks(ids) {
    const out = [];
    for (const id of ids) {
      const o = objects[id];
      const hot = hotById[id];
      if (!o || !hot || hot.area || hot.sprite) continue;
      const [x0, y0, x1, y1] = o.box;
      const gy = o.ground[1];
      if (hot.flat) {
        if (y1 < walkTop) continue;
        out.push({ id, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: ((x1 - x0) / 2) * 0.97, ry: ((y1 - y0) / 2) * 0.9 });
      } else if (gy > walkTop + 12) {
        // standing on the walkable ground: block it and the strip behind it, so he never walks "behind" painted pixels
        const top = walkTop - 40;
        const bottom = gy + 14;
        out.push({ id, cx: (x0 + x1) / 2, cy: (top + bottom) / 2, rx: (x1 - x0) / 2 + 12, ry: (bottom - top) / 2 });
      }
    }
    return out;
  }

  return { objects, pinY, place, blocks, walkTop };
}
