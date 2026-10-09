/**
 * Placeholder sprites for anything without painted art yet.
 *
 * Every hero, fiend and Titan that has no painted sprite is drawn as a glowing
 * hologram: a hand-built SVG silhouette with a vertical fade, a bright edge
 * line, scanlines clipped to the silhouette and a soft outer glow. Painted art
 * from public/assets/ replaces them one by one.
 *
 * placeholderSvg(id, uid) returns standalone SVG markup (no XML prolog). Every
 * id inside it (gradients, filters, patterns, clip paths) is prefixed with the uid,
 * so many sprites can share one page without their defs colliding. The SVG
 * fills its parent element (width/height 100%) and keeps its feet on the
 * bottom edge (preserveAspectRatio="xMidYMax meet").
 */

const THEMES = {
  hero: { main: '#5ff3ff', light: '#d2fdff', accent: '#ffffff', deep: '#03202b' },
  droid: { main: '#bffcff', light: '#f2ffff', accent: '#5dffe6', deep: '#062a30' },
  fiend: { main: '#ff4d8d', light: '#ffc2d8', accent: '#fff27a', deep: '#2c0516' },
  boss: { main: '#b26bff', light: '#e6ceff', accent: '#ffc95e', deep: '#1a0735' },
  titan: { main: '#ffd36b', light: '#fff2c9', accent: '#ffffff', deep: '#2e2003' },
  monkey: { main: '#ffb347', light: '#ffe4bd', accent: '#fff7e6', deep: '#2e1803' },
};

// ---------------------------------------------------------------------------
// Geometry helpers (all return SVG path data)
// ---------------------------------------------------------------------------

const n = (v) => Math.round(v * 100) / 100;

/** Circle as path data. */
const circle = (cx, cy, r) =>
  `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0Z`;

/** Axis-aligned ellipse as path data. */
const ellipse = (cx, cy, rx, ry) =>
  `M${n(cx - rx)} ${n(cy)}a${rx} ${ry} 0 1 0 ${n(2 * rx)} 0a${rx} ${ry} 0 1 0 ${n(-2 * rx)} 0Z`;

/** Closed polygon from a flat list of numbers: poly(x1, y1, x2, y2, ...). */
const poly = (...p) => {
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return `${d}Z`;
};

/** Open polyline from a flat list of numbers. */
const line = (...p) => {
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return d;
};

/**
 * Tapered capsule between two points, for limbs, tails and tendrils.
 * r1 / r2 are the half-widths at each end.
 */
const limb = (x1, y1, x2, y2, r1, r2 = r1) => {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = -(y2 - y1) / L;
  const py = (x2 - x1) / L;
  const pt = (x, y, r, s) => `${n(x + s * px * r)} ${n(y + s * py * r)}`;
  return (
    `M${pt(x1, y1, r1, 1)}L${pt(x2, y2, r2, 1)}A${r2} ${r2} 0 0 0 ${pt(x2, y2, r2, -1)}` +
    `L${pt(x1, y1, r1, -1)}A${r1} ${r1} 0 0 0 ${pt(x1, y1, r1, 1)}Z`
  );
};

/**
 * Smooth curve through points (Catmull-Rom as cubic Beziers).
 * pts: flat list x1, y1, x2, y2, ...  A point given as a string "x,y" is a
 * sharp corner. closed=true closes the outline.
 */
const spline = (pts, closed = true) => {
  const P = [];
  for (let i = 0; i < pts.length; i++) {
    if (typeof pts[i] === 'string') {
      const [x, y] = pts[i].split(',').map(Number);
      P.push({ x, y, sharp: true });
    } else {
      P.push({ x: pts[i], y: pts[i + 1], sharp: false });
      i++;
    }
  }
  const m = P.length;
  const at = (i) => (closed ? P[(i + m) % m] : P[Math.max(0, Math.min(m - 1, i))]);
  const tan = (i) => {
    const p = at(i);
    if (p.sharp) return { x: 0, y: 0 };
    const a = at(i - 1);
    const b = at(i + 1);
    return { x: (b.x - a.x) / 6, y: (b.y - a.y) / 6 };
  };
  let d = `M${n(P[0].x)} ${n(P[0].y)}`;
  const segs = closed ? m : m - 1;
  for (let i = 0; i < segs; i++) {
    const a = at(i);
    const b = at(i + 1);
    const ta = tan(i);
    const tb = tan(i + 1);
    d += `C${n(a.x + ta.x)} ${n(a.y + ta.y)} ${n(b.x - tb.x)} ${n(b.y - tb.y)} ${n(b.x)} ${n(b.y)}`;
  }
  return closed ? `${d}Z` : d;
};

/**
 * Horseshoe-magnet outline: closed end centered at (cx, cy), prongs of
 * length len pointing right. R / r are the outer / inner radii.
 */
const horseshoe = (cx, cy, R, r, len) =>
  `M${cx + len} ${cy - R}H${cx}A${R} ${R} 0 0 0 ${cx} ${cy + R}H${cx + len}V${cy + r}` +
  `H${cx}A${r} ${r} 0 0 1 ${cx} ${cy - r}H${cx + len}Z`;

/** Points along a centerline offset sideways by r (+1 = right of travel). */
const offsetPts = (c, radii, side) => {
  const out = [];
  const m = c.length / 2;
  for (let i = 0; i < m; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(m - 1, i + 1);
    const tx = c[2 * b] - c[2 * a];
    const ty = c[2 * b + 1] - c[2 * a + 1];
    const L = Math.hypot(tx, ty) || 1;
    out.push(n(c[2 * i] - (ty / L) * radii[i] * side), n(c[2 * i + 1] + (tx / L) * radii[i] * side));
  }
  return out;
};

/** Smooth closed outline around a centerline (flat x, y list) with per-point half-widths. */
const tube = (c, radii) => {
  const left = offsetPts(c, radii, 1);
  const right = offsetPts(c, radii, -1);
  const pts = [];
  for (let i = 0; i < left.length; i += 2) {
    const sharp = i === 0 || i === left.length - 2;
    if (sharp) pts.push(`${left[i]},${left[i + 1]}`);
    else pts.push(left[i], left[i + 1]);
  }
  for (let i = right.length - 2; i >= 0; i -= 2) {
    const sharp = i === 0 || i === right.length - 2;
    if (sharp) pts.push(`${right[i]},${right[i + 1]}`);
    else pts.push(right[i], right[i + 1]);
  }
  return spline(pts);
};

const rotate = (deg, cx, cy) => `rotate(${deg} ${cx} ${cy})`;
/** Mirror horizontally around the vertical line x = cx. */
const mirror = (cx) => `matrix(-1 0 0 1 ${2 * cx} 0)`;

// ---------------------------------------------------------------------------
// The hologram renderer
// ---------------------------------------------------------------------------

function safeUid(uid) {
  return String(uid).replace(/[^A-Za-z0-9_-]/g, '_') || 'x';
}

/**
 * A tiny drawing kit. Shapes are painted in call order (painter's algorithm),
 * and every silhouette shape is also added to the scanline clip path.
 */
function makeKit(ids, theme, sw) {
  const out = [];
  const clip = [];
  const tf = (o) => (o.tf ? ` transform="${o.tf}"` : '');
  const wrap = (o, s) => (o.op != null ? `<g opacity="${o.op}">${s}</g>` : s);

  const k = {
    /** A solid piece of the silhouette: dark backing, theme fade fill, bright edge. */
    body(d, o = {}) {
      const t = tf(o);
      const stroke = o.stroke ?? theme.main;
      out.push(
        wrap(
          o,
          `<path d="${d}"${t} fill="url(#${ids.base})"/>` +
            `<path d="${d}"${t} fill="url(#${ids.fill})" stroke="${stroke}" stroke-width="${o.sw ?? sw}" stroke-linejoin="round" stroke-linecap="round"/>`,
        ),
      );
      if (!o.noClip) clip.push(`<path d="${d}"${t}/>`);
      return k;
    },
    /** A piece on the far side of the body: same as body() but dimmer. */
    far(d, o = {}) {
      return k.body(d, { op: 0.6, ...o });
    },
    /** Interior detail line (seams, folds, plates). */
    line(d, o = {}) {
      out.push(
        wrap(
          o,
          `<path d="${d}"${tf(o)} fill="none" stroke="${o.color ?? theme.light}" stroke-width="${o.sw ?? n(sw * 0.7)}" stroke-opacity="${o.so ?? 0.85}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`,
        ),
      );
      return k;
    },
    /** Shadowed area inside the silhouette (a hood's darkness, an open mouth). */
    shade(d, o = {}) {
      out.push(wrap(o, `<path d="${d}"${tf(o)} fill="${theme.deep}" fill-opacity="${o.fo ?? 0.92}"/>`));
      return k;
    },
    /** Flat translucent fill in the theme color, for plates and panels. */
    tint(d, o = {}) {
      out.push(
        wrap(
          o,
          `<path d="${d}"${tf(o)} fill="${o.color ?? theme.main}" fill-opacity="${o.fo ?? 0.35}"${o.edge ? ` stroke="${theme.light}" stroke-width="${n(sw * 0.6)}" stroke-opacity="0.8" stroke-linejoin="round"` : ''}/>`,
        ),
      );
      return k;
    },
    /**
     * A hot glowing accent (eyes, crystal cores). The glow filter is sized to
     * the shape's bounding box, so glow() and beam() shapes must not be a
     * single perfectly horizontal or vertical line (a zero-height box hides it).
     */
    glow(d, o = {}) {
      out.push(
        wrap(
          o,
          `<path d="${d}"${tf(o)} fill="${o.color ?? theme.accent}"${o.fo != null ? ` fill-opacity="${o.fo}"` : ''} filter="url(#${ids.hot})"/>`,
        ),
      );
      return k;
    },
    /** A hot glowing stroke (energy edges, lightning, runes). */
    beam(d, o = {}) {
      out.push(
        wrap(
          o,
          `<path d="${d}"${tf(o)} fill="none" stroke="${o.color ?? theme.accent}" stroke-width="${o.sw ?? sw}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${ids.hot})"/>`,
        ),
      );
      return k;
    },
    /** Small rivets or sparks. */
    dots(pts, r = 1.6, o = {}) {
      let d = '';
      for (let i = 0; i < pts.length; i += 2) d += circle(pts[i], pts[i + 1], r);
      out.push(wrap(o, `<path d="${d}"${tf(o)} fill="${o.color ?? theme.light}"/>`));
      return k;
    },
    raw(s) {
      out.push(s);
      return k;
    },
  };
  return { k, out, clip };
}

/**
 * Wraps the drawn shapes in the shared hologram treatment.
 * spec: { w, h, theme, sw, base (ground y or null), pad / padX (ground ring),
 *         top / bottom (gradient range), band (flicker band y fraction),
 *         tf (transform for the whole drawing), draw(k) }
 */
function hologram(spec, rawUid, label) {
  const { w, h } = spec;
  const theme = THEMES[spec.theme];
  const u = safeUid(rawUid);
  const ids = {
    fill: `ph-${u}-fill`,
    base: `ph-${u}-base`,
    scan: `ph-${u}-scan`,
    band: `ph-${u}-band`,
    glow: `ph-${u}-glow`,
    hot: `ph-${u}-hot`,
    clip: `ph-${u}-clip`,
    pad: `ph-${u}-pad`,
  };
  const scale = h / 300;
  const sw = spec.sw ?? 2;
  const { k, out, clip } = makeKit(ids, theme, sw);
  spec.draw(k);

  const top = spec.top ?? 0;
  const bottom = spec.bottom ?? h;
  const gap = n(Math.max(2.6, 3.2 * scale));
  const bandY = n(top + (bottom - top) * (spec.band ?? 0.36));
  const bandH = n(14 * scale);
  const blur1 = n(1.6 * scale);
  const blur2 = n(5.5 * scale);

  let ground = '';
  if (spec.base != null) {
    const rx = spec.pad ?? w * 0.3;
    const ry = n(Math.max(3, rx * 0.09));
    const cx = spec.padX ?? w / 2;
    ground =
      `<ellipse cx="${cx}" cy="${spec.base}" rx="${rx}" ry="${ry}" fill="url(#${ids.pad})"/>` +
      `<ellipse cx="${cx}" cy="${spec.base}" rx="${rx}" ry="${ry}" fill="none" stroke="${theme.main}" stroke-opacity="0.45" stroke-width="${n(sw * 0.6)}" stroke-dasharray="${n(6 * scale)} ${n(4 * scale)}"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${label} (hologram)">` +
    '<defs>' +
    `<linearGradient id="${ids.fill}" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}">` +
    `<stop offset="0" stop-color="${theme.main}" stop-opacity="0.62"/>` +
    `<stop offset="0.55" stop-color="${theme.main}" stop-opacity="0.36"/>` +
    `<stop offset="1" stop-color="${theme.main}" stop-opacity="0.2"/>` +
    '</linearGradient>' +
    `<linearGradient id="${ids.base}" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}">` +
    `<stop offset="0" stop-color="${theme.deep}" stop-opacity="0.7"/>` +
    `<stop offset="1" stop-color="${theme.deep}" stop-opacity="0.35"/>` +
    '</linearGradient>' +
    `<linearGradient id="${ids.band}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${theme.light}" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="${theme.light}" stop-opacity="0.22"/>` +
    `<stop offset="1" stop-color="${theme.light}" stop-opacity="0"/>` +
    '</linearGradient>' +
    `<radialGradient id="${ids.pad}">` +
    `<stop offset="0" stop-color="${theme.main}" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="${theme.main}" stop-opacity="0"/>` +
    '</radialGradient>' +
    `<pattern id="${ids.scan}" width="8" height="${gap}" patternUnits="userSpaceOnUse">` +
    `<rect width="8" height="${n(gap * 0.38)}" fill="${theme.light}" fill-opacity="0.2"/>` +
    `<rect y="${n(gap * 0.5)}" width="8" height="${n(gap * 0.32)}" fill="#000" fill-opacity="0.16"/>` +
    '</pattern>' +
    `<filter id="${ids.glow}" filterUnits="userSpaceOnUse" x="${-w * 0.1}" y="${-h * 0.1}" width="${w * 1.2}" height="${h * 1.2}" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur2}" result="wide"/>` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur1}" result="near"/>` +
    '<feMerge><feMergeNode in="wide"/><feMergeNode in="near"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    `<filter id="${ids.hot}" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${n(2.2 * scale)}" result="b"/>` +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    `<clipPath id="${ids.clip}"${spec.tf ? ` transform="${spec.tf}"` : ''}>${clip.join('')}</clipPath>` +
    '</defs>' +
    `<g filter="url(#${ids.glow})">` +
    ground +
    (spec.tf ? `<g transform="${spec.tf}">${out.join('')}</g>` : out.join('')) +
    `<g clip-path="url(#${ids.clip})">` +
    `<rect width="${w}" height="${h}" fill="url(#${ids.scan})"/>` +
    `<rect y="${n(bandY - bandH / 2)}" width="${w}" height="${bandH}" fill="url(#${ids.band})"/>` +
    '</g>' +
    '</g>' +
    '</svg>'
  );
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const SPRITES = {};

/** Fallback: a generic glowing crystal diamond. */
const DIAMOND = {
  w: 200,
  h: 200,
  theme: 'droid',
  base: 186,
  pad: 46,
  draw(k) {
    k.body(poly(100, 18, 150, 92, 100, 170, 50, 92));
    k.line(line(50, 92, 150, 92)).line(line(100, 18, 82, 92, 100, 170, 118, 92, 100, 18));
    k.line(line(70, 60, 130, 60), { so: 0.5 });
    k.glow(poly(100, 70, 110, 92, 100, 116, 90, 92), { fo: 0.9 });
  },
};

// ----- Tutor droid ----------------------------------------------------------
SPRITES.droid = {
  label: 'Tutor droid',
  w: 200,
  h: 200,
  theme: 'droid',
  top: 24,
  bottom: 196,
  base: 190,
  pad: 34,
  band: 0.42,
  draw(k) {
    // Thruster flare (behind the shell).
    k.glow('M87 142 Q100 192 113 142 Z', { fo: 0.32 });
    k.glow('M93 142 Q100 174 107 142 Z', { fo: 0.75 });
    k.line(ellipse(100, 164, 12, 2.6), { so: 0.35 });
    // Steering fins: small, angular, swept back, each on a joint.
    const fin = 'M58 86 L34 72 L26 74 L32 92 L42 108 L58 100 Z';
    for (const tf of [undefined, mirror(100)]) {
      k.body(fin, { tf });
      k.line('M34 79 L52 92 M38 99 L54 96', { tf, so: 0.55 });
      k.body(circle(54, 93, 5), { tf });
    }
    // Thruster nozzle.
    k.body('M86 134 L114 134 L110 148 L90 148 Z');
    k.line('M88 141 L112 141', { so: 0.6 });
    // The shell, with panel seams.
    k.body(circle(100, 92, 50), { sw: 2.4 });
    k.line('M52 104 Q100 126 148 104', { so: 0.7 });
    k.line('M64 58 Q100 46 136 58', { so: 0.45 });
    k.line('M72 131 Q100 140 128 131', { so: 0.4 });
    k.line('M140 66 Q150 82 148 100 M60 66 Q50 82 52 100', { so: 0.4 });
    // Core window, lower right.
    k.body(circle(126, 118, 9));
    k.glow(poly(126, 111, 131, 118, 126, 126, 121, 118), { fo: 0.95 });
    k.line(circle(126, 118, 6.5), { so: 0.5, sw: 1 });
    // Big lens-eye: housing, glowing lens, camera iris.
    k.body(circle(98, 88, 30), { sw: 2.6 });
    k.glow(circle(98, 88, 23), { fo: 0.28 });
    k.line(circle(98, 88, 23), { so: 0.95 });
    k.line(circle(98, 88, 16), { so: 0.5, sw: 1.1 });
    k.shade(circle(98, 92, 10), { fo: 0.8 });
    k.glow(circle(98, 92, 4.6));
    k.line('M68 88 L75 88 M121 88 L128 88 M98 112 L98 118', { so: 0.6, sw: 1.2 });
    // Eyelid shutter: a flat, unimpressed half-close over the lens.
    const lid = 'M69.6 79 A30 30 0 0 1 126.4 79 L127 85 Q98 80 69 88 Z';
    k.shade(lid, { fo: 1 });
    k.body(lid, { sw: 2.4 });
    k.line('M74 71 L122 68 M71 78 L125 75', { so: 0.55, sw: 1.1 });
    k.beam('M70 87.5 Q98 80 126.5 85', { sw: 1.8 });
    // Tiny crooked captain's hat (it thinks this looks intimidating).
    const hat = rotate(13, 110, 44);
    k.body(
      'M76 30 C88 44 100 48 110 48 C120 48 132 44 144 30 C137 31 130 30 126 27 C121 11 99 11 94 27 C90 30 83 31 76 30 Z',
      { tf: hat },
    );
    k.line('M84 37 C98 45 122 45 136 37', { tf: hat, so: 0.8 });
    k.line(`${circle(110, 28, 3.4)}M105 36 L115 32 M105 32 L115 36`, { tf: hat, sw: 1.1 });
  },
};

// ----- Heroes (face left, feet at y=290) -----------------------------------
SPRITES.knight = {
  label: 'Crystal Knight',
  w: 200,
  h: 300,
  theme: 'hero',
  top: 10,
  base: 290,
  pad: 70,
  draw(k) {
    // Forward leg (the far one), mostly behind the shield.
    k.far('M94 156 L114 160 L97 216 L84 228 L80 272 L86 290 L42 290 Q44 280 58 276 L64 270 L70 224 L76 212 Z');
    k.line('M76 212 L97 216 M70 224 L84 228 M64 270 L80 272', { op: 0.6 });
    // Tattered crimson scarf streaming back in the wind.
    k.body(spline(['114,72', 134, 68, 154, 76, 174, 70, '196,74', '186,81', '197,88', '183,90', '190,99', 170, 94, 150, 92, 132, 86, '114,86']));
    k.body(spline(['118,86', 136, 98, 154, 104, 170, 102, '186,110', '174,113', '181,121', 162, 116, 144, 112, '120,98']));
    k.line(spline([124, 78, 146, 80, 166, 82, 182, 82], false), { so: 0.45 });
    // Torso and armored skirt.
    k.body('M90 86 Q110 80 134 86 Q142 118 130 158 L92 160 Q86 120 90 86 Z');
    k.body('M90 150 L134 147 L144 180 L122 174 L106 182 L86 176 Z');
    k.line('M90 151 L134 146 M92 159 L136 153 M106 158 L112 180 M122 156 L124 174', { so: 0.7 });
    k.line('M96 96 Q112 92 128 98 M100 118 Q114 124 130 116', { so: 0.6 });
    k.body('M106 145 L116 144 L117 154 L107 155 Z', { sw: 1.4 });
    // Back leg (the near one), planted.
    k.body('M112 172 L134 168 L152 210 L157 226 L160 270 L172 284 L172 290 L134 290 Q134 282 146 278 L148 272 L142 228 L134 214 Z');
    k.body('M138 206 L156 204 L160 226 L146 232 Z', { sw: 1.6 });
    k.line('M147 240 L156 270 M140 280 L170 280', { so: 0.6 });
    // Sword arm (far side) raised over the shield.
    k.far('M88 88 L102 96 L90 122 L76 116 Z');
    k.body('M77 118 L90 116 L82 98 L68 101 Z');
    // Greatsword: plasma-edged blade pointing at the enemy.
    k.body(poly(70.5, 87.2, 24.1, 18.8, 14, 12, 16.5, 24, 62.1, 92.8), { sw: 1.8 });
    k.line('M63.7 86.1 L24.5 27.6', { so: 0.6 });
    k.beam('M70 86 L24 18.5 L14 12', { sw: 1.5 });
    k.body(poly(77.7, 83.6, 79.9, 87, 58.3, 101.4, 56.1, 98), { sw: 1.6 });
    k.body(circle(73, 101, 6), { sw: 1.6 });
    // Head: short storm-gray hair, scarred brow, steady eye.
    k.body('M100 62 L116 64 L118 84 L100 86 Z');
    k.body('M90 44 Q92 26 110 26 Q128 28 126 50 Q124 62 116 68 Q106 72 98 68 L94 62 L90 61 L92 57 L88 55 L91 50 Z');
    k.body('M87 43 L92 27 L99 30 L103 18 L110 26 L118 15 L120 27 L131 23 L127 35 L136 40 L127 45 L125 55 Q122 41 110 37 Q98 37 89 47 Z', { sw: 1.8 });
    k.line('M93 43 L104 41 M97 37 L101 46 M92 61 L99 62 M114 47 Q118 51 114 56', { sw: 1.3 });
    k.glow('M95 48 L102 47 L101 49.5 L96 50 Z');
    // Scarf wrapped at the neck.
    k.body('M97 70 Q108 80 122 72 L124 84 Q108 92 95 81 Z');
    // Shark-fin pauldron on the near shoulder.
    k.body('M122 92 Q126 58 160 28 Q146 62 156 98 Z');
    k.line('M130 88 Q134 66 150 46', { so: 0.6 });
    k.body('M114 92 Q132 80 154 90 Q160 100 154 108 Q134 102 116 106 Z');
    k.dots([122, 98, 134, 94, 146, 96]);
    // Near arm behind the shield, then the tower shield with its crystal core.
    k.body(limb(136, 104, 140, 138, 8, 6.5));
    k.body(limb(140, 138, 100, 152, 6.5, 6));
    k.line('M122 138 L126 152 M114 141 L118 155', { so: 0.8 });
    k.body('M92 112 L101 117 L105 228 L96 228 Z');
    k.body('M24 118 Q56 106 92 112 L96 228 Q78 252 58 268 Q38 252 22 228 Z', { sw: 2.4 });
    k.line('M32 126 Q56 117 84 120 L88 222 Q74 242 58 256 Q42 242 30 222 Z', { so: 0.6 });
    k.line('M57 120 L57 160 M57 200 L57 256 M31 180 L41 180 M73 180 L87 180', { so: 0.7 });
    k.line(circle(57, 180, 17), { so: 0.9 });
    k.glow(poly(57, 163, 67, 180, 57, 197, 47, 180));
    k.dots([36, 132, 78, 128, 36, 220, 80, 218]);
  },
};

SPRITES.gunner = {
  label: 'Sky-Pirate Gunner',
  w: 200,
  h: 300,
  theme: 'hero',
  top: 24,
  base: 290,
  pad: 66,
  draw(k) {
    // Long coat tails flaring out behind, patched.
    k.body(spline(['112,94', 132, 92, 146, 130, 160, 172, 174, 206, '190,240', '174,235', '178,248', '160,238', 140, 232, 120, 228, '104,226', '104,160']));
    k.line(spline([136, 118, 150, 168, 168, 214], false), { so: 0.45 });
    k.line(poly(150, 204, 163, 202, 165, 215, 152, 217), { so: 0.7, dash: '2 2', sw: 1.1 });
    // Copper braid swinging out behind her.
    k.body(limb(119, 60, 131, 72, 5.5, 5));
    k.body(limb(131, 72, 139, 86, 5, 4.5));
    k.body(limb(139, 86, 143, 100, 4.5, 3.8));
    k.line('M118 66 L126 60 M128 77 L136 70 M135 90 L143 85 M139 99 L146 95', { so: 0.75, sw: 1.1 });
    k.body(spline(['140,101', '147,100', 150, 108, '146,116', 144, 110, '140,115', 139, 107]), { sw: 1.6 });
    // Forward leg (far side) in a knee-high boot.
    k.far(limb(104, 160, 87, 214, 9, 7.5));
    k.far(limb(87, 214, 79, 268, 8, 6.5));
    k.far('M70 264 L88 266 L90 290 L54 290 Q54 282 64 278 Z');
    k.line('M78 222 L96 218 M73 250 L87 251', { op: 0.6 });
    // Back leg (near side), weight on it.
    k.body(limb(120, 162, 132, 214, 9.5, 8));
    k.body(limb(132, 214, 142, 268, 8.5, 6.5));
    k.body('M134 264 L150 266 L162 282 L162 290 L126 290 Q126 282 134 278 Z');
    k.line('M123 220 L141 214 M130 236 L146 233 M131 250 L147 248', { so: 0.6 });
    // Aiming arm in the intact coat sleeve, blaster pointed at the enemy.
    k.body(limb(98, 98, 72, 104, 8, 7.5));
    k.body(limb(73, 104, 59, 102, 7.5, 9));
    k.line('M62 93 L61 111', { so: 0.7 });
    k.body('M58 92 L31 92 L26 96 L26 102 L58 102 Z', { sw: 1.8 });
    k.body('M31 94.5 L12 94.5 L12 100.5 L31 100.5 Z', { sw: 1.6 });
    k.line('M16 94.5 L16 100.5 M34 97 L54 97', { sw: 1.1 });
    k.body('M44 102 L54 102 L56 116 L46 116 Z', { sw: 1.6 });
    k.glow(ellipse(43, 90.5, 7, 2.4));
    k.body(circle(51, 106, 6.5), { sw: 1.8 });
    // Torso: vest, crossed belts, bandolier of glowing cells.
    k.body(spline(['96,94', 112, 88, '130,94', 134, 122, '132,154', 116, 158, '99,156', 95, 124]));
    k.body(poly(95, 146, 135, 158, 134, 164, 94, 152), { sw: 1.4 });
    k.line('M96 161 L134 148', { sw: 1.6 });
    k.body(poly(124, 92, 131, 97, 104, 152, 97, 147), { sw: 1.4 });
    k.dots([122.5, 105, 117, 116, 111.5, 127, 106, 138], 2.4, { color: '#ffffff' });
    // Coat front panels and popped collar. The near sleeve is torn off.
    k.body(spline(['91,96', '102,93', 104, 150, '106,208', '88,214', 87, 150]));
    k.body(spline(['124,91', '139,96', 145, 150, '154,228', '128,226', 125, 150]));
    k.line('M130 104 L131 116 M131 128 L132 140 M100 110 L101 122', { so: 0.5 });
    k.line('M127 93 L131 99 L134 94 L138 100', { sw: 1.2 });
    k.body(poly(91, 97, 97, 74, 108, 90));
    k.body(poly(122, 91, 129, 75, 136, 97));
    // Head: bandana, goggles pushed up, trouble-making grin.
    k.body(limb(104, 78, 110, 94, 6));
    k.body(spline([106, 40, 120, 46, 125, 58, 121, 70, 111, 79, '99,81', 95, 76, '92,71', 94, 68, '89,64', 93, 57, 96, 46]));
    k.body(spline([92, 53, 97, 41, 110, 36, 123, 42, 127, 54, '124,61', 117, 51, 105, 49, '94,56']));
    k.body(spline(['124,50', 134, 47, '143,49', 137, 55, '144,62', 132, 60, '124,58']), { sw: 1.6 });
    k.line('M93 54 Q92 59 94 61 M103 51 Q102 56 104 58', { sw: 1.1 });
    k.body(circle(111, 45, 5.5), { sw: 1.6 });
    k.glow(circle(111, 45, 2.8), { fo: 0.6 });
    k.body(circle(99, 47, 6), { sw: 1.6 });
    k.glow(circle(99, 47, 3.2), { fo: 0.75 });
    k.line('M116.5 45 L124 50', { sw: 1.4 });
    k.glow('M94 61.5 L100.5 60.5 L100 63 L95 63.5 Z');
    k.line('M93 57 L101 54.5 M94 71 Q100 75 106 70 M115 61 Q119 65 115 69', { sw: 1.2 });
    // Brass mechanical arm, raised, second blaster pointed at the sky.
    k.body(limb(136, 100, 160, 128, 6.5, 6));
    k.body(limb(160, 128, 162, 92, 6, 5.5));
    k.line('M157 120 L158 98 M165 120 L166 98', { so: 0.55, sw: 1 });
    k.body(circle(136, 100, 7.5));
    k.line(circle(136, 100, 3.2), { sw: 1 });
    k.body(circle(160, 128, 7));
    k.line(`${circle(160, 128, 3)}M160 119 L160 121 M160 135 L160 137 M151 128 L153 128 M167 128 L169 128`, { sw: 1 });
    k.body('M155 80 L155 54 L159 50 L169 50 L169 80 Z', { sw: 1.8 });
    k.body('M158 50 L158 30 L166 30 L166 50 Z', { sw: 1.6 });
    k.line('M158 34 L166 34 M162 54 L162 76', { sw: 1.1 });
    k.glow(ellipse(170.5, 65, 2.4, 7));
    k.body(circle(162, 86, 6.5), { sw: 1.8 });
  },
};

const RUNES = [
  'M-3 3L0 -3.5L3 3Z',
  'M0 -4V4M0 -1.5L3 -4M0 1L-3 -1.5',
  `${circle(0, 0, 3)}M0 -1V1`,
  'M0 -4L4 0L0 4L-4 0ZM0 -1.5V1.5',
  'M-3 -3H3L-3 3H3',
  'M-3 4V-4L3 0L-3 2',
];

SPRITES.spellwright = {
  label: 'Spellwright',
  w: 200,
  h: 300,
  theme: 'hero',
  top: 56,
  base: 290,
  pad: 64,
  draw(k) {
    // Pointed boots peeking out under the robe.
    k.body('M70 276 L90 278 L89 290 L58 290 Q48 290 45 281 Q52 286 59 284 Z', { sw: 1.6 });
    k.far('M110 280 L130 280 L130 290 L102 290 Z', { sw: 1.6 });
    // Robe stirring in a magical wind, with silver circuit embroidery and straps.
    k.body(spline(['92,146', 84, 196, 72, 244, '58,277', 76, 283, 96, 278, 116, 285, 138, 278, 160, 285, '184,270', 168, 236, 150, 196, 136, 160, '130,146']));
    k.line('M82 204 L96 204 L104 196 L120 196 M74 244 L92 244 L99 237 M154 232 L140 232 L133 224 L118 224 M110 262 L126 262 L132 256', { so: 0.65, sw: 1.1 });
    k.dots([120, 196, 99, 237, 118, 224, 132, 256, 82, 204], 1.8);
    k.line('M92 168 L134 164 M90 182 L140 177', { so: 0.8 });
    k.body('M108 162 L116 162 L116 170 L108 170 Z M110 175 L118 175 L118 183 L110 183 Z', { sw: 1.2, noClip: true });
    k.line(spline([102, 214, 110, 248, 106, 280], false), { so: 0.35 });
    // Near sleeve: oversized, hand hovering over the floating book.
    k.body(spline(['126,148', 140, 152, '154,158', '156,176', 150, 194, '142,214', 132, 196, 126, 172]));
    k.line('M138 162 Q142 186 141 206', { so: 0.5 });
    k.body(spline([154, 162, 162, 160, '168,165', 162, 170, '156,174']), { sw: 1.6 });
    // Hood: deep shadow inside, two glowing eyes, tip flopping back.
    k.body(spline(['86,128', 90, 110, 104, 98, 122, 97, '152,104', 138, 116, 134, 132, 132, 150, '90,152', 86, 140]));
    k.line('M106 101 Q124 103 142 107 M96 112 Q88 128 95 148', { so: 0.55 });
    k.shade(spline([88, 128, 92, 116, 102, 112, 111, 119, 112, 135, 103, 145, 92, 141]), { fo: 1 });
    k.glow('M89.5 128 L97 126.5 L96 129.6 L91 130.2 Z');
    k.glow('M100.5 127 L108.5 125.5 L107.6 129 L101.5 129.8 Z');
    // Raised hand with runes orbiting it; the huge sleeve droops below.
    k.body(spline(['98,148', 90, 126, 78, 108, '68,95', '54,107', 52, 132, 58, 156, '67,177', 80, 168, 92, 160]));
    k.line('M66 112 Q64 140 70 166 M80 116 Q78 140 84 160', { so: 0.5 });
    k.body(spline([66, 98, 58, 94, '53,86', 57, 84, '58,76', 62, 81, '65,74', 67, 81, '71,79', 70, 89, 69, 96]), { sw: 1.6 });
    const orbit = rotate(-12, 60, 84);
    k.line(ellipse(60, 84, 32, 11), { tf: orbit, so: 0.45, dash: '3 4', sw: 1 });
    RUNES.forEach((r, i) => {
      const a = (i / RUNES.length) * Math.PI * 2 + 0.4;
      const x = n(60 + 32 * Math.cos(a));
      const y = n(84 + 11 * Math.sin(a));
      k.beam(r, { tf: `${orbit} translate(${x} ${y})`, sw: 1.4 });
    });
    k.glow(circle(61, 85, 3), { fo: 0.8 });
    // The floating open spellbook.
    const BOOK = 'translate(164 198) scale(1.3) translate(-170 -190)';
    k.body('M150 190 Q160 184 170 194 L170 200 Q160 190 150 196 Z M170 194 Q180 182 192 186 L192 192 Q180 188 170 200 Z', { sw: 1.4, tf: BOOK });
    k.body('M150 186 Q160 180 170 190 Q180 178 192 182 L192 188 Q180 184 170 196 Q160 186 150 192 Z', { sw: 1.6, tf: BOOK });
    k.line('M154 187 L165 190 M155 191 L164 193 M175 187 L187 184 M175 191 L186 188', { sw: 0.9, so: 0.7, tf: BOOK });
    k.glow(ellipse(170, 182, 12, 3), { fo: 0.3, tf: BOOK });
    k.dots([156, 176, 172, 168, 164, 156, 182, 174, 176, 150], 1.4, { color: '#ffffff' });
  },
};

SPRITES.titancaller = {
  label: 'Titan Caller',
  w: 200,
  h: 300,
  theme: 'hero',
  top: 4,
  base: 290,
  pad: 68,
  draw(k) {
    // Long shell-braided hair streaming back.
    k.body(spline(['114,48', 128, 46, 144, 58, 158, 80, 168, 104, '182,132', '168,126', '172,142', '156,124', 144, 104, 132, 88, '118,76']));
    k.line('M128 60 Q148 84 162 112 M124 70 Q140 92 150 112', { so: 0.5 });
    k.dots([146, 78, 156, 96, 165, 116, 138, 92], 2.2, { color: '#ffffff' });
    // Near arm reaching back, its detached sleeve flowing in the wind.
    k.body(spline(['140,114', '158,124', 170, 148, 180, 176, '190,206', 174, 192, 160, 170, 148, 146, 138, 130]));
    k.line('M154 140 q5 -4 10 0 t10 0 M160 160 q5 -4 10 0 t10 0', { so: 0.6, sw: 1.1 });
    k.body(limb(128, 100, 146, 122, 6, 5));
    k.body(limb(146, 122, 163, 136, 5, 4.3));
    k.body(circle(166, 138, 4.6), { sw: 1.6 });
    // Legs in leggings, sandals.
    k.far(limb(108, 160, 90, 222, 8.5, 7));
    k.far(limb(90, 222, 80, 272, 7, 5.5));
    k.far('M72 268 L86 270 L88 290 L56 290 Q56 282 66 278 Z');
    k.body(limb(122, 162, 136, 222, 9, 7.5));
    k.body(limb(136, 222, 146, 272, 7, 5.5));
    k.body('M138 268 L152 270 L164 283 L164 290 L130 290 Q130 282 138 278 Z');
    // Split skirt with wave motifs, flowing back.
    k.body(spline(['98,148', 92, 184, '80,224', 96, 228, '112,218', 112, 182, '114,150']));
    k.body(spline(['112,150', 128, 148, 142, 176, 158, 204, '178,222', 156, 228, '134,228', 126, 192, '116,160']));
    k.line('M88 206 q4 -4 8 0 t8 0 M130 206 q4 -4 8 0 t8 0 t8 0', { so: 0.6, sw: 1.1 });
    // Torso: wrap top, coral sash with tails, bone-white plates on the near side.
    k.body(spline(['96,96', 112, 90, '130,96', 132, 124, '128,150', 114, 154, '100,152', 96, 124]));
    k.line('M100 98 Q110 110 116 120 M128 98 Q120 108 112 122 M98 134 Q114 138 130 134', { so: 0.6 });
    k.body(spline(['128,148', 146, 156, 162, 170, '178,186', '165,184', '170,196', 150, 176, '130,158']));
    k.body(poly(97, 143, 131, 143, 132, 154, 96, 155), { sw: 1.6 });
    k.body(spline(['120,93', 134, 89, '145,97', 141, 110, '126,108']));
    k.line('M124 101 Q134 98 142 103', { so: 0.7 });
    k.body(spline(['124,158', 138, 156, '147,166', 143, 182, '128,178']));
    k.line('M128 168 Q138 166 145 172', { so: 0.7 });
    // Head, with the crested horn helmet pushed back.
    k.body(limb(104, 80, 110, 94, 5.5));
    k.far(spline(['116,38', 122, 22, '134,8', 130, 26, '122,42']));
    k.body(spline([106, 44, 120, 50, 124, 62, 120, 72, 110, 81, '99,82', 95, 77, '92,72', 94, 69, '89,65', 93, 58, 96, 48]));
    k.body(spline([93, 56, 99, 45, 112, 42, 124, 48, 128, 60, '126,76', 120, 62, 110, 55, '98,60']));
    k.body(spline(['104,47', 107, 37, 119, 31, 131, 36, '136,47', 124, 45, '112,48']));
    k.body(spline(['124,40', 140, 26, '162,20', 148, 32, '132,47']));
    k.line('M108 44 Q120 36 133 41', { so: 0.7 });
    k.glow('M94.5 64 L101 63 L100.5 65.5 L95.5 66 Z');
    k.line('M93 60 L101 58.5 M95 74 L101 74 M115 64 Q119 68 115 71', { sw: 1.2 });
    // The staff: a storm crystal held high, ready to call something enormous.
    k.body(limb(40, 250, 63, 42, 2.6, 2.4), { sw: 1.6 });
    k.line('M61.5 42 Q50 34 54 16 M64.5 42 Q76 34 72 16', { sw: 1.8, so: 1 });
    k.body(poly(63, 1, 71, 22, 63, 43, 55, 22), { sw: 1.8 });
    k.beam('M61 9 L66 19 L60 24 L65 34', { sw: 1.4 });
    // Raised arm (glowing titan tattoo) with its long detached sleeve.
    k.body(spline(['94,102', 80, 108, '62,108', 58, 130, 62, 156, '67,188', 73, 180, '79,194', 85, 180, '91,188', 93, 158, 95, 128]));
    k.line('M69 114 Q65 150 70 182 M81 114 Q79 150 83 184', { so: 0.5 });
    k.line('M66 136 q4 -4 8 0 t8 0 M68 160 q4 -4 8 0 t8 0', { so: 0.6, sw: 1.1 });
    k.body(limb(96, 98, 76, 104, 6.5, 5.5));
    k.body(limb(76, 104, 58, 99, 5.5, 4.5));
    k.beam('M84 103 Q80 99 76 103 Q72 107 68 102 Q65 99 62 101', { sw: 1.2 });
    k.body(circle(55, 99, 5), { sw: 1.6 });
  },
};

// ----- Fiends (face right, bottom at y=290) --------------------------------
SPRITES.scrap_raptor = {
  label: 'Scrap Raptor',
  w: 300,
  h: 300,
  theme: 'fiend',
  top: 80,
  base: 290,
  pad: 100,
  padX: 150,
  tf: 'translate(8.3 16) scale(0.945)',
  draw(k) {
    // Far leg and far arm (dimmer).
    k.far(limb(140, 206, 114, 252, 8, 6));
    k.far(limb(114, 252, 124, 280, 5.5, 4.5));
    k.far(poly(118, 276, 158, 281, 160, 290, 112, 290));
    k.far(spline(['122,277', 118, 262, 128, 254, '140,256', 130, 261, 128, 270, '130,279']));
    k.far(limb(196, 162, 210, 188, 5, 4));
    k.far(limb(210, 188, 228, 196, 4, 3.5));
    k.far(spline(['226,192', 240, 190, '250,200', 238, 197, '228,200']));
    // Body, neck and stiff tail in one crouched, coiled line.
    k.body(spline(['6,96', 40, 104, 80, 112, 120, 116, 160, 120, 196, 124, 214, 116, '230,106', 238, 126, 232, 142, 214, 158, 196, 178, 160, 184, 124, 174, 90, 152, 50, 126, 20, 106]));
    k.line(spline([60, 118, 100, 136, 140, 150], false), { so: 0.35 });
    k.line('M176 150 Q182 164 178 178 M190 146 Q197 160 193 174 M162 154 Q168 166 165 180', { so: 0.4 });
    // Bolted-on scrap plates, jagged spines along the back.
    k.tint(poly(100, 112, 138, 108, 148, 128, 106, 134), { edge: true, fo: 0.3 });
    k.tint(poly(168, 118, 204, 116, 207, 138, 171, 143), { edge: true, fo: 0.3 });
    k.tint(poly(44, 104, 72, 110, 70, 124, 45, 117), { edge: true, fo: 0.3 });
    k.tint(poly(212, 118, 228, 108, 234, 124, 218, 134), { edge: true, fo: 0.3 });
    k.dots([104, 115, 135, 112, 144, 126, 109, 131, 172, 121, 201, 120, 203, 135, 174, 140, 48, 107, 68, 112, 214, 121, 230, 120], 1.5);
    k.body('M96 113 L104 98 L112 112 L120 96 L128 111 L138 94 L146 110 L156 98 L162 114 Z', { sw: 1.6 });
    k.body('M30 101 L36 90 L44 103 L52 92 L58 106 Z', { sw: 1.4 });
    // Glowing crystal set in the chest.
    k.body(poly(200, 146, 212, 157, 203, 174, 190, 160), { sw: 1.6 });
    k.glow(poly(200, 150, 208, 158, 202, 169, 194, 160));
    // Near leg: heavy thigh, crouched for the pounce, sickle claw raised.
    k.body(spline(['112,140', 144, 134, 172, 166, '172,206', 156, 216, 130, 192, '110,170']));
    k.tint(poly(130, 160, 158, 156, 164, 182, 134, 188), { edge: true, fo: 0.3 });
    k.dots([134, 163, 155, 160, 160, 179, 137, 184], 1.5);
    k.body(limb(164, 206, 138, 254, 9, 6.5));
    k.body(limb(138, 254, 150, 280, 6, 5));
    k.body(poly(144, 276, 186, 281, 190, 290, 138, 290));
    k.line('M162 283 L166 290 M176 283 L180 290', { so: 0.7 });
    k.body(spline(['144,278', 138, 258, 152, 242, '174,240', 158, 250, 152, 264, '156,279']));
    // Near arm with hooked sickle claws.
    k.body(limb(214, 166, 226, 186, 6, 5));
    k.body(limb(226, 186, 244, 191, 5, 4));
    k.body(spline(['240,184', 256, 182, '268,192', 254, 189, '242,192']), { sw: 1.6 });
    k.body(spline(['240,190', 254, 194, '262,206', 250, 199, '238,196']), { sw: 1.6 });
    // Head: jaws open, jagged teeth, angry eye.
    k.body(spline(['238,124', 262, 132, '290,140', 286, 148, 262, 151, '234,142']));
    k.shade(spline(['240,125', 266, 121, '288,121', '289,139', 262, 131, '239,129']), { fo: 0.95 });
    k.line('M245 126 L248 132 L252 125 L255 131 L259 124 L262 130 L266 123 L269 129 L273 122 L276 128 L280 122 L283 127 L286 122', { sw: 1.3, color: '#ffffff', so: 0.95 });
    k.line('M247 131 L251 126 L255 134 L259 128 L263 136 L267 130 L271 138 L275 132 L279 139 L283 133 L287 140', { sw: 1.3, color: '#ffffff', so: 0.95 });
    k.body(spline(['226,100', 242, 91, 262, 93, 282, 101, '298,113', '288,121', 266, 120, '240,126', 228, 122]));
    k.tint(poly(244, 93, 264, 94, 262, 104, 246, 104), { edge: true, fo: 0.25 });
    k.dots([248, 96, 260, 97], 1.4);
    k.line('M240 104 L258 108 M232 112 Q236 118 240 120', { so: 0.8, sw: 1.4 });
    k.glow('M243 109 L256 110 L253 114 L245 113 Z');
    k.dots([289, 108], 1.6);
  },
};

SPRITES.volt_jelly = {
  label: 'Volt Jelly',
  w: 300,
  h: 300,
  theme: 'fiend',
  top: 24,
  base: 290,
  pad: 70,
  padX: 140,
  band: 0.3,
  draw(k) {
    const tilt = rotate(8, 150, 90);
    // Long trailing tendrils, sparking.
    const tendrils = [
      [84, 136, 70, 180, 82, 220, 64, 262],
      [104, 142, 96, 186, 106, 226, 90, 276],
      [126, 146, 120, 196, 132, 236, 116, 282],
      [176, 146, 172, 194, 184, 232, 170, 280],
      [198, 142, 196, 186, 208, 222, 196, 268],
      [218, 134, 220, 176, 232, 206, 222, 246],
    ];
    for (const t of tendrils) {
      k.line(spline(t, false), { tf: tilt, color: '#ff4d8d', so: 0.9, sw: 2.2 });
      k.line(spline(t, false), { tf: tilt, so: 0.6, sw: 0.9 });
    }
    k.dots([66, 258, 92, 270, 118, 276, 172, 274, 196, 262, 222, 240, 84, 214, 186, 226], 2.2, { color: '#fff27a', tf: tilt });
    // Frilled oral arms.
    k.body(spline(['138,140', 128, 170, 140, 196, 130, 226, 142, 256, '136,282', 152, 254, 146, 226, 156, 196, 148, 168, '158,140']), { tf: tilt });
    k.body(spline(['156,140', 168, 168, 160, 198, 172, 228, '166,262', 182, 230, 176, 198, 182, 168, '172,140']), { tf: tilt });
    k.line('M138 160 L150 166 M136 190 L150 196 M140 220 L152 226 M164 162 L176 168 M164 192 L176 196 M168 222 L178 226', { tf: tilt, so: 0.55 });
    // The crystal bell, faceted, with a scalloped rim.
    k.body(spline([70, 132, 72, 92, 96, 52, 150, 30, 204, 52, 228, 92, '232,132', 218, 141, '204,136', 190, 145, '176,138', 162, 147, '150,140', 138, 147, '124,138', 110, 145, '96,136', 82, 142]), { tf: tilt, sw: 2.4 });
    k.line('M78 104 L104 84 L150 96 L196 84 L222 104 M104 84 L118 46 M150 96 L150 32 M196 84 L182 46 M104 84 L96 136 M150 96 L150 140 M196 84 L204 136 M78 104 L96 136 M222 104 L204 136', { tf: tilt, so: 0.55 });
    k.glow(ellipse(150, 100, 40, 22), { tf: tilt, fo: 0.18 });
    // Lightning trapped inside.
    k.beam('M118 58 L134 84 L122 90 L142 122', { tf: tilt, sw: 1.8 });
    k.beam('M184 56 L170 80 L184 86 L162 118', { tf: tilt, sw: 1.8 });
    k.beam('M150 44 L144 66 L156 70 L148 92', { tf: tilt, sw: 1.4 });
    // Glowing eye-spots around the rim.
    k.glow(`${ellipse(110, 128, 3.4, 2.4)}${ellipse(136, 132, 3.4, 2.4)}${ellipse(164, 132, 3.4, 2.4)}${ellipse(190, 128, 3.4, 2.4)}`, { tf: tilt });
  },
};

SPRITES.magnet_beetle = {
  label: 'Magnet Beetle',
  w: 300,
  h: 300,
  theme: 'fiend',
  top: 50,
  base: 290,
  pad: 116,
  padX: 148,
  tf: 'translate(-3.6 23.2) scale(0.92)',
  draw(k) {
    // Floating scrap pulled by its magnetism, with field lines.
    k.line('M254 64 Q290 100 270 152 M236 46 Q300 70 296 150', { so: 0.4, dash: '3 5' });
    k.body('M262 40 L272 36 L278 44 L274 53 L264 54 L258 47 Z', { sw: 1.4 });
    k.line(circle(268, 45, 3), { sw: 1 });
    k.body(poly(282, 92, 296, 88, 294, 100, 284, 102), { sw: 1.4 });
    k.body(limb(206, 40, 222, 30, 2.5), { sw: 1.4 });
    k.body(`${circle(286, 136, 7)}`, { sw: 1.4 });
    k.line(`${circle(286, 136, 3)}M286 126 V129 M286 143 V146 M276 136 H279 M293 136 H296`, { sw: 1 });
    k.body(poly(240, 18, 252, 16, 250, 24), { sw: 1.2 });
    // Far legs.
    k.far(limb(218, 198, 250, 206, 6, 5));
    k.far(limb(250, 206, 270, 284, 4.5, 3));
    k.far(limb(154, 212, 186, 216, 6, 5));
    k.far(limb(186, 216, 196, 284, 4.5, 3));
    k.far(limb(96, 212, 74, 222, 6, 5));
    k.far(limb(74, 222, 62, 284, 4.5, 3));
    // Riveted iron shell.
    k.body(spline(['34,216', 36, 168, 66, 116, 124, 86, 182, 92, 218, 120, '230,160', '224,206', 160, 222, 96, 224]), { sw: 2.4 });
    k.line('M48 160 Q120 126 222 150 M40 196 Q120 176 226 190', { so: 0.6 });
    k.line('M100 98 L94 140 M150 88 L150 134 M196 104 L198 146 M70 170 L66 206 M130 162 L132 200 M184 164 L186 202', { so: 0.5 });
    k.dots([60, 152, 84, 140, 112, 132, 140, 128, 168, 128, 196, 134, 214, 142, 56, 192, 92, 186, 128, 182, 164, 182, 200, 184], 2);
    // Head shield and lowered head.
    k.body(spline(['214,110', 236, 106, 254, 122, '262,150', 254, 176, '226,190', 218, 150]));
    k.body(spline(['244,170', 266, 168, 282, 182, '286,206', 272, 222, '248,216', 240, 196]));
    k.glow(ellipse(266, 186, 5, 3.4));
    k.body('M276 210 Q292 214 294 230 Q284 222 272 222 Z', { sw: 1.4 });
    // Two horseshoe-magnet horns, poles glowing.
    const hornA = rotate(-28, 232, 116);
    k.body(horseshoe(232, 116, 15, 6.5, 40), { tf: hornA, sw: 2.2 });
    k.glow(`M262 101H272V109.5H262ZM262 122.5H272V131H262Z`, { tf: hornA, fo: 0.9 });
    k.line('M262 101V109.5M262 122.5V131', { tf: hornA, sw: 1.4 });
    const hornB = rotate(8, 270, 192);
    k.body(horseshoe(270, 192, 11, 4.5, 26), { tf: hornB, sw: 2 });
    k.glow('M288 181H296V187.5H288ZM288 196.5H296V203H288Z', { tf: hornB, fo: 0.9 });
    // Near legs: spiked, segmented, braced to charge.
    for (const [x0, y0, kx, ky, fx, fy, dir] of [[206, 204, 240, 212, 258, 286, 1], [140, 214, 170, 222, 176, 286, 1], [80, 212, 54, 226, 40, 286, -1]]) {
      k.body(limb(x0, y0, kx, ky, 7.5, 6));
      k.body(limb(kx, ky, fx, fy, 5.5, 3.5));
      k.body(limb(fx, fy - 2, fx + dir * 12, fy + 2, 2.6, 2));
      const sx = (kx + fx) / 2;
      const sy = (ky + fy) / 2;
      k.body(poly(n(sx - dir * 4), sy - 8, n(sx - dir * 14), sy - 2, n(sx - dir * 5), sy + 2), { sw: 1.4 });
      k.body(poly(n(fx - dir * 3), fy - 22, n(fx - dir * 12), fy - 16, n(fx - dir * 4), fy - 12), { sw: 1.4 });
    }
  },
};

SPRITES.ink_slime = {
  label: 'Ink Slime',
  w: 300,
  h: 300,
  theme: 'fiend',
  top: 44,
  base: 290,
  pad: 128,
  draw(k) {
    // The blob: an ink drop that came alive, pooling on the floor.
    k.body(spline(['12,290', 34, 280, 44, 262, 40, 222, 46, 178, 62, 136, 92, 100, 122, 78, '138,44', 156, 74, 196, 80, 234, 104, 258, 144, 268, 196, 270, 244, 280, 276, '296,290']), { sw: 2.4 });
    k.line('M88 122 Q108 96 132 84', { so: 0.9, sw: 2.4 });
    k.line('M74 150 Q70 166 72 178', { so: 0.6, sw: 2 });
    // Drips crawling back up its sides.
    k.tint('M50 236 Q44 226 50 210 Q56 226 50 236 Z M262 236 Q256 222 262 206 Q268 222 262 236 Z M30 284 Q28 276 34 268 Q38 278 30 284 Z', { fo: 0.6, edge: true });
    // Glyph bubbles rising inside.
    const bubbles = [[92, 156, 12, 0], [64, 222, 10, 2], [118, 252, 13, 3], [116, 118, 8, 1], [158, 138, 7, 4], [86, 268, 7, 5]];
    for (const [x, y, r, g] of bubbles) {
      k.line(circle(x, y, r), { so: 0.75, sw: 1.2 });
      k.beam(RUNES[g], { tf: `translate(${x} ${y}) scale(${r / 8})`, sw: 1.2, color: '#ffc2d8' });
    }
    // Big glowing eyes, angled with mischief.
    k.glow('M156 124 Q172 114 192 122 Q194 142 176 146 Q158 146 156 124 Z', { fo: 0.95 });
    k.glow('M204 120 Q226 108 246 114 Q252 140 230 146 Q208 148 204 120 Z', { fo: 0.95 });
    k.shade(`${ellipse(182, 133, 5, 7)}${ellipse(236, 130, 6, 8)}`, { fo: 1 });
    k.line('M150 116 Q172 102 196 114 M200 110 Q226 96 252 106', { sw: 3, so: 0.95 });
    // Wide, toothy grin full of ink-drip teeth.
    k.shade(spline(['146,192', 180, 202, 222, 200, '266,180', 258, 212, 224, 238, 186, 234, 160, 216]), { fo: 1 });
    k.line(spline(['146,192', 180, 202, 222, 200, '266,180', 258, 212, 224, 238, 186, 234, 160, 216]), { so: 1, sw: 2 });
    let teeth = '';
    for (let i = 0; i < 7; i++) {
      const x = 154 + i * 15;
      const y = 196 + Math.sin((i / 6) * Math.PI) * 6 - i * 1.6;
      teeth += `M${n(x)} ${n(y)}Q${n(x + 4)} ${n(y + 17)} ${n(x + 9)} ${n(y)}Z`;
    }
    for (let i = 0; i < 4; i++) {
      const x = 176 + i * 17;
      const y = 234 - Math.sin(((i + 1) / 5) * Math.PI) * 4 - i * 2;
      teeth += `M${n(x)} ${n(y)}Q${n(x + 4)} ${n(y - 14)} ${n(x + 9)} ${n(y)}Z`;
    }
    k.raw(`<path d="${teeth}" fill="#ffe3ee" fill-opacity="0.92"/>`);
  },
};

SPRITES.dominion_drone = {
  label: 'Dominion Drone',
  w: 300,
  h: 300,
  theme: 'fiend',
  top: 60,
  base: 290,
  pad: 84,
  padX: 160,
  band: 0.3,
  tf: 'rotate(5 170 160)',
  draw(k) {
    // Rear thruster wash.
    k.glow(ellipse(54, 146, 9, 16), { fo: 0.45 });
    // Far blade-arm, folded under the hull.
    k.far(limb(206, 176, 196, 210, 5.5, 4.5));
    k.far(limb(196, 210, 232, 222, 4.5, 4));
    k.far(spline(['230,214', 252, 212, 274, 220, '290,240', 270, 230, '232,228']));
    // Wedge hull: gunmetal plates, sharp nose.
    k.body(spline(['60,118', 120, 120, 180, 126, 240, 138, '288,150', 240, 170, 180, 182, 120, 186, '72,182', '58,166']), { sw: 2.4 });
    k.line('M62 146 L180 148 L286 151 M110 122 L106 184 M160 125 L158 184 M210 132 L210 176', { so: 0.55 });
    k.line('M74 156 L96 156 M74 164 L96 164 M74 172 L96 172', { so: 0.6, sw: 1.2 });
    k.body(poly(70, 120, 58, 96, 92, 120), { sw: 1.6 });
    k.dots([128, 176, 146, 177, 228, 166], 1.8, { color: '#ff2b4a' });
    // Narrow visor with a single red scanning eye.
    k.tint(poly(262, 147, 300, 132, 300, 164), { fo: 0.12, color: '#ff2b4a' });
    k.shade(poly(212, 140, 274, 146, 272, 153, 210, 149), { fo: 1 });
    k.glow(ellipse(248, 148, 11, 2.6), { color: '#ff2b4a' });
    k.glow(ellipse(248, 148, 4, 1.2), { color: '#ffffff' });
    // Two shielded rotor fans on pylons.
    for (const [cx, cy, rx] of [[112, 90, 44], [220, 100, 40]]) {
      k.body(limb(cx, cy + 10, cx + 8, cy + 30, 5, 6));
      k.body(`M${cx - rx} ${cy}V${cy + 9}A${rx} ${11} 0 0 0 ${cx + rx} ${cy + 9}V${cy}Z`);
      k.body(ellipse(cx, cy, rx, 11));
      k.shade(ellipse(cx, cy, rx - 7, 6.5), { fo: 0.9 });
      k.line(`M${cx - rx + 10} ${cy - 2}L${cx + rx - 10} ${cy + 2}M${cx - 12} ${cy - 5}L${cx + 12} ${cy + 5}`, { so: 0.5, sw: 1.2 });
      k.line(`M${cx - rx + 8} ${cy}H${cx + rx - 8}M${cx} ${cy - 6}V${cy + 6}`, { so: 0.8, sw: 1.2 });
    }
    // Near blade-arm, folded forward, edge glowing.
    k.body(limb(160, 184, 140, 220, 6, 5));
    k.body(limb(140, 220, 188, 236, 5, 4));
    k.body(circle(140, 220, 6));
    k.body(spline(['186,226', 214, 222, 246, 228, 272, 244, '288,270', 266, 254, 238, 242, '190,240']), { sw: 1.8 });
    k.beam('M192 240 Q240 244 286 268', { sw: 1.4, color: '#fff27a' });
    k.line('M200 230 L262 238', { so: 0.5 });
  },
};

// ----- Boss (faces right) --------------------------------------------------
const CRACK = '#f3e6ff';

SPRITES.geode_titan = {
  label: 'Geode Titan',
  w: 400,
  h: 400,
  theme: 'boss',
  top: 20,
  base: 390,
  pad: 176,
  padX: 196,
  sw: 2.6,
  tf: 'translate(6 15.6) scale(0.96)',
  draw(k) {
    // Tail raised behind, ending in a crystal club.
    k.body(spline(['104,158', 78, 146, 56, 124, '42,100', '60,96', 72, 122, 92, 150, '108,196']));
    k.line('M92 168 Q70 146 56 116', { so: 0.5 });
    k.body(poly(40, 106, 20, 74, 28, 44, 52, 30, 72, 50, 74, 84, 60, 106), { sw: 2.4 });
    k.body(poly(30, 66, 6, 52, 24, 44), { sw: 1.8 });
    k.body(poly(52, 34, 62, 10, 70, 38), { sw: 1.8 });
    k.body(poly(70, 66, 94, 58, 74, 84), { sw: 1.8 });
    k.line('M52 30 L46 68 L40 106 M28 44 L46 68 L74 84 M72 50 L46 68', { so: 0.55 });
    k.beam('M34 58 L44 64 L38 76 L50 84', { color: CRACK, sw: 1.6 });
    // Far legs.
    k.far(spline(['70,214', 118, 210, 132, 246, 124, 300, 122, 340, '140,384', '138,390', '66,390', '70,370', 76, 336, 76, 298, 66, 254]));
    k.far(spline(['210,212', 258, 208, 272, 248, 262, 300, 260, 340, '278,384', '276,390', '202,390', '206,370', 212, 336, 212, 298, 202, 254]));
    // The colossal body: humped shoulders, sagging armored belly.
    k.body(spline(['80,190', 96, 160, 140, 134, 200, 112, 256, 102, 298, 116, '326,140', 334, 176, '322,214', 300, 244, 250, 272, 180, 284, 116, 274, 84, 240]), { sw: 2.8 });
    k.line('M120 254 Q190 274 274 242 M138 268 Q196 284 254 262 M154 238 Q200 250 250 236', { so: 0.5 });
    k.line('M104 200 Q110 230 124 252 M300 176 Q296 210 282 236', { so: 0.4 });
    // Cracked geode plates along the back, venting steam.
    const shards = [
      [100, 160, 106, 120, 118, 98, 132, 124, 138, 146],
      [134, 140, 142, 98, 160, 62, 178, 98, 186, 124],
      [182, 120, 190, 76, 212, 38, 228, 76, 236, 110],
      [232, 108, 240, 70, 258, 48, 272, 80, 278, 106],
      [266, 114, 272, 90, 284, 78, 292, 98, 296, 118],
    ];
    for (const sh of shards) {
      k.body(poly(...sh), { sw: 2.2 });
      k.line(`M${sh[4]} ${sh[5]}L${(sh[0] + sh[8]) / 2} ${(sh[1] + sh[9]) / 2}M${sh[2]} ${sh[3]}L${sh[4]} ${sh[5]}L${sh[6]} ${sh[7]}`, { so: 0.5 });
    }
    k.beam('M114 108 L120 122 L112 130 L120 146', { color: CRACK, sw: 1.6 });
    k.beam('M158 74 L152 94 L164 104 L156 128', { color: CRACK, sw: 1.8 });
    k.beam('M210 52 L218 72 L204 84 L214 108', { color: CRACK, sw: 1.8 });
    k.beam('M256 60 L250 80 L262 88 L256 104', { color: CRACK, sw: 1.6 });
    k.line('M160 54 q-7 -10 0 -18 t0 -18 M212 30 q7 -9 0 -16 t0 -14 M258 40 q-6 -8 0 -15 t0 -14', { so: 0.45, sw: 2 });
    // Near legs: bent pillars, crystal knee plates, claws.
    k.body(spline(['98,212', 150, 204, 172, 242, 162, 298, 158, 340, '178,384', '176,390', '96,390', '100,370', 106, 336, 106, 298, 92, 252]), { sw: 2.8 });
    k.body(poly(118, 282, 132, 270, 150, 276, 150, 298, 134, 306, 118, 296), { sw: 2 });
    k.line('M132 270 L134 306 M118 289 L150 287', { so: 0.6 });
    k.body('M158 380 L174 382 L182 390 L156 390 Z M138 382 L152 384 L158 390 L134 390 Z', { sw: 1.8 });
    k.body(spline(['244,208', 296, 204, 312, 246, 300, 300, 298, 340, '318,384', '316,390', '236,390', '240,370', 246, 336, 246, 298, 236, 252]), { sw: 2.8 });
    k.body(poly(258, 280, 272, 268, 290, 274, 290, 296, 274, 304, 258, 294), { sw: 2 });
    k.line('M272 268 L274 304 M258 287 L290 285', { so: 0.6 });
    k.body('M298 380 L314 382 L322 390 L296 390 Z M278 382 L292 384 L298 390 L274 390 Z', { sw: 1.8 });
    k.line('M110 346 L156 342 M250 346 L296 342', { so: 0.4 });
    // Neck and roaring jaw.
    k.body(spline(['288,150', 316, 126, 344, 118, '360,140', 350, 176, '322,196', '298,192']));
    k.body(spline(['326,132', 350, 136, '376,130', 374, 168, 362, 194, '348,198', 332, 180]));
    k.shade(spline(['330,132', 352, 136, '372,130', 368, 162, 354, 182, '344,184', 334, 166]), { fo: 1 });
    k.line('M332 134 L336 144 L340 135 L344 146 L348 136 L352 147 L356 136 L360 146 L364 134 L368 143 L371 132', { sw: 1.4, color: '#ffffff', so: 0.95 });
    k.line('M340 178 L344 168 L348 180 L352 167 L356 178 L360 165', { sw: 1.4, color: '#ffffff', so: 0.95 });
    // Hammerhead skull, three glowing eyes on each end.
    k.body(spline(['300,112', 310, 98, 334, 104, 350, 100, 366, 104, 390, 96, '400,108', 400, 124, '392,136', 366, 128, 350, 132, 334, 128, '310,136', 300, 124]), { sw: 2.8 });
    k.body(poly(340, 103, 351, 80, 362, 101), { sw: 2 });
    k.line('M316 112 Q350 116 386 110 M316 126 Q350 120 386 126', { so: 0.45 });
    k.line('M302 104 L320 108 M380 106 L398 101', { sw: 2.4, so: 0.95 });
    k.glow(`${ellipse(306, 111, 3.8, 3)}${ellipse(307, 123, 3.8, 3)}${ellipse(316, 117, 3.4, 2.6)}${ellipse(394, 111, 3.8, 3)}${ellipse(393, 123, 3.8, 3)}${ellipse(384, 117, 3.4, 2.6)}`);
  },
};

// ----- Summoned Titan (faces right) ------------------------------------------
SPRITES.titan_starter = {
  label: 'Sea Titan',
  w: 400,
  h: 400,
  theme: 'titan',
  top: 10,
  base: 390,
  pad: 180,
  sw: 2.6,
  band: 0.4,
  draw(k) {
    // A second coil and the tail fin breaking the surface behind it.
    k.far(tube([238, 372, 262, 322, 304, 302, 342, 322, 360, 372], [20, 22, 22, 20, 18]));
    k.far(spline(['352,346', 368, 318, '394,296', 384, 326, '380,352']));
    // The great serpent body rearing out of the sea.
    const spine = [128, 392, 116, 330, 136, 268, 184, 222, 226, 182, 252, 140, 270, 104];
    const radii = [46, 42, 38, 34, 30, 26, 22];
    k.body(tube(spine, radii), { sw: 2.8 });
    // Belly plates along the front of the body.
    const belly = offsetPts(spine, radii.map((r) => r * 0.98), 1);
    const mid = offsetPts(spine, radii.map((r) => r * 0.35), 1);
    let plates = '';
    for (let i = 2; i < belly.length - 2; i += 2) plates += `M${mid[i]} ${mid[i + 1]}L${belly[i]} ${belly[i + 1]}`;
    k.line(plates, { so: 0.6 });
    k.line(spline(mid, false), { so: 0.5 });
    // Crystal reefs growing along its back.
    const back = offsetPts(spine, radii.map((r) => r * 0.9), -1);
    const reefs = [[0.6, 40], [1.2, 50], [1.8, 56], [2.4, 52], [3, 50], [3.6, 46], [4.2, 40], [4.8, 32], [5.4, 24]];
    for (const [t, len] of reefs) {
      const i = Math.floor(t);
      const f = t - i;
      const lerp = (arr, j) => arr[2 * i + j] + (arr[2 * i + 2 + j] - arr[2 * i + j]) * f;
      const x = lerp(back, 0);
      const y = lerp(back, 1);
      const nx = x - lerp(spine, 0);
      const ny = y - lerp(spine, 1);
      const base = Math.atan2(ny, nx);
      for (const [g, sp, w] of [[1, 0.1, 7], [0.6, 0.62, 5], [0.68, -0.48, 5]]) {
        const ang = base + sp;
        const tx = n(x + Math.cos(ang) * len * g);
        const ty = n(y + Math.sin(ang) * len * g);
        const px = -Math.sin(ang) * w;
        const py = Math.cos(ang) * w;
        k.body(poly(n(x + px), n(y + py), tx, ty, n(x - px), n(y - py)), { sw: 1.8 });
        k.line(`M${n(x)} ${n(y)}L${tx} ${ty}`, { so: 0.45, sw: 1 });
      }
      k.glow(circle(n(x + Math.cos(base + 0.1) * len * 0.55), n(y + Math.sin(base + 0.1) * len * 0.55), 2.4), { fo: 0.9 });
    }
    // Clawed forelimbs.
    k.far(limb(214, 210, 246, 238, 7, 6));
    k.far(limb(246, 238, 270, 222, 6, 5));
    k.far(spline(['266,214', 280, 208, '290,214', 280, 218, '268,228']));
    k.body(limb(236, 190, 270, 206, 8, 6.5));
    k.body(limb(270, 206, 294, 184, 6.5, 5.5));
    k.body(spline(['290,176', 306, 168, '318,172', 306, 178, '296,190']), { sw: 1.8 });
    k.body(spline(['294,186', 310, 186, '318,194', 304, 192, '292,194']), { sw: 1.8 });
    // Head: roaring, crowned with backswept crystal fins.
    k.body(poly(268, 66, 236, 30, 262, 46), { sw: 1.8 });
    k.body(poly(282, 58, 262, 16, 290, 44), { sw: 1.8 });
    k.body(poly(296, 54, 292, 10, 310, 46), { sw: 1.8 });
    k.body(spline(['290,96', 318, 100, '366,104', 356, 118, 326, 122, '298,116']));
    k.shade(spline(['296,94', 330, 92, '368,90', '364,104', 330, 102, '298,108']), { fo: 1 });
    k.line('M308 93 L311 100 L315 93 L318 101 L322 92 L325 100 L329 92 L332 100 L336 91 L339 99 L343 91 L346 98 L350 90 L353 97 L357 90', { sw: 1.4, color: '#ffffff', so: 0.95 });
    k.body(spline(['256,92', 262, 66, 290, 52, 330, 56, 366, 66, '384,80', 366, 88, '320,94', 290, 100, '264,108']), { sw: 2.6 });
    k.line('M296 64 Q324 62 350 72 M286 80 Q300 86 316 84', { so: 0.5 });
    k.glow('M310 70 L328 70 L324 76 L312 76 Z');
    k.line('M306 66 L330 64', { sw: 2.2, so: 0.95 });
    k.dots([376, 76], 2);
    k.line('M262 98 Q246 112 240 134 M270 106 Q262 122 262 140', { so: 0.6, sw: 2 });
    // The sea it rises from.
    k.line(spline([0, 372, 40, 362, 80, 372, 120, 360], false), { sw: 2.4, so: 0.8 });
    k.line(spline([150, 362, 200, 372, 240, 364, 280, 374, 330, 364, 400, 372], false), { sw: 2.4, so: 0.8 });
    k.line('M20 388 Q60 380 100 388 M190 388 Q240 380 290 388 M320 386 Q360 378 398 386', { so: 0.5, sw: 1.6 });
    k.body(spline(['84,372', 96, 352, '104,340', 110, 356, '120,366', 128, 346, '136,334', 142, 352, '150,366', 160, 350, '172,342', 168, 362, '180,374']), { sw: 1.8 });
    k.dots([70, 344, 186, 336, 60, 360, 196, 352, 230, 340, 92, 330], 2.2, { color: '#ffffff' });
  },
};

// ----- The three-eyed monkey -------------------------------------------------
SPRITES.monkey = {
  label: 'Three-eyed monkey',
  w: 120,
  h: 120,
  theme: 'monkey',
  top: 8,
  base: 114,
  pad: 40,
  sw: 1.6,
  band: 0.5,
  draw(k) {
    // Curly tail.
    k.body(tube([44, 106, 26, 106, 15, 96, 14, 82, 21, 74, 28, 79], [3.6, 3.4, 3, 2.6, 2.2, 1.8]));
    // Body, knees, feet.
    k.body(spline(['42,112', 38, 94, 46, 74, 60, 68, 74, 74, 82, 94, '80,112']));
    k.body(`${ellipse(44, 112, 8, 4)}${ellipse(76, 112, 8, 4)}`, { sw: 1.4 });
    k.body(circle(48, 100, 9), { sw: 1.4 });
    k.body(circle(72, 100, 9), { sw: 1.4 });
    k.tint(ellipse(60, 92, 9, 11), { fo: 0.25 });
    // Arm resting on a knee.
    k.body(limb(44, 76, 40, 96, 4.4, 3.8), { sw: 1.4 });
    k.body(circle(42, 98, 4), { sw: 1.4 });
    // The other arm holds up a half-eaten banana.
    k.body(limb(76, 78, 86, 92, 4.4, 3.8), { sw: 1.4 });
    const nana = rotate(12, 92, 88);
    k.body(spline(['88,84', 87, 72, '89,63', 91, 66, '93,62', 96, 66, '97,84']), { tf: nana, sw: 1.4, stroke: '#fff3c4' });
    k.body(spline(['87,84', '98,84', 98, 96, '93,106', 88, 96]), { tf: nana, sw: 1.4 });
    k.body(spline(['88,84', 82, 88, '78,98', 85, 93, '90,88']), { tf: nana, sw: 1.2 });
    k.body(spline(['97,84', 103, 88, '107,98', 100, 93, '95,88']), { tf: nana, sw: 1.2 });
    k.line('M90 72 Q92 70 95 72 M93 92 L93 102', { tf: nana, sw: 0.9, so: 0.7 });
    k.body(circle(88, 93, 4.2), { sw: 1.4 });
    // Head, ears (one gold earring), face mask.
    k.body(circle(37, 46, 7), { sw: 1.4 });
    k.body(circle(83, 46, 7), { sw: 1.4 });
    k.line(`${circle(37, 46, 3.5)}${circle(83, 46, 3.5)}`, { sw: 1, so: 0.6 });
    k.line(circle(83.5, 54.5, 2.2), { sw: 1.3, so: 1, color: '#fff3c4' });
    k.body(ellipse(60, 46, 21, 19));
    k.tint(spline([60, 40, 70, 34, 77, 42, 74, 54, 66, 62, 60, 64, 54, 62, 46, 54, 43, 42, 50, 34]), { fo: 0.3, edge: true });
    // Three unimpressed, half-lidded eyes.
    for (const [x, y] of [[53, 46], [67, 46], [60, 35]]) {
      k.glow(ellipse(x, y, 3.8, 3), { fo: 0.95 });
      k.shade(`M${x - 4.4} ${y - 3.4}H${x + 4.4}V${y - 0.2}H${x - 4.4}Z`, { fo: 1 });
      k.dots([x + 1.4, y + 1], 1.2, { color: '#2e1803' });
      k.line(`M${x - 4.4} ${y - 0.2}H${x + 4.4}`, { sw: 1.2, so: 1 });
    }
    k.line('M48 40 L57 40.5 M63 39 L72 37', { sw: 1.2 });
    // Muzzle and smirk.
    k.tint(ellipse(60, 56, 9, 6), { fo: 0.25 });
    k.line('M58 52 L59 53 M62 52 L61 53 M53 58 Q60 60.5 67 55.5', { sw: 1.3 });
    // Tiny crooked captain's hat.
    const hat = `translate(0 2) ${rotate(-12, 62, 22)}`;
    k.body('M42 18 C48 25 55 27 62 27 C69 27 76 25 82 18 C78 18 74 17 72 15 C69 5 55 5 52 15 C50 17 46 18 42 18 Z', { tf: hat, sw: 1.4 });
    k.line(`M47 21 C55 25 69 25 77 21${circle(62, 16, 1.8)}`, { tf: hat, sw: 0.9, so: 0.9 });
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const PLACEHOLDER_IDS = Object.freeze([
  'knight',
  'gunner',
  'spellwright',
  'titancaller',
  'droid',
  'scrap_raptor',
  'volt_jelly',
  'magnet_beetle',
  'ink_slime',
  'dominion_drone',
  'geode_titan',
  'titan_starter',
  'monkey',
]);

let counter = 0;

/**
 * SVG markup for a hologram placeholder sprite.
 * @param {string} id  One of PLACEHOLDER_IDS. Unknown ids get a glowing diamond.
 * @param {string} [uid] Unique string used to namespace every id in the SVG.
 * @returns {string}
 */
export function placeholderSvg(id, uid) {
  const spec = Object.hasOwn(SPRITES, id) ? SPRITES[id] : DIAMOND;
  const label = spec.label ?? 'Unknown';
  return hologram(spec, uid ?? `auto${++counter}`, label);
}
