// Things on the island: painted art from the manifest when Codex has made it
// (art/waves/wave-03-exploration.md, ids "prop_<name>"), and until then a
// hand-drawn SVG stand-in, so the game always runs. Item icons work the same
// way (the "icons_items" sheet).

import { h } from "./dom.js";
import { assetInfo } from "./sprites.js";

let uid = 0;

/** A prop's picture, filling its box with its base at the bottom. state: e.g. { open: true }. */
export function propArt(name, state = {}) {
  const id = paintedId(name, state);
  const a = id && assetInfo(id);
  if (a?.base?.src) {
    const img = h("img.prop-img", { src: `assets/${a.base.src}`, alt: "", draggable: false });
    return img;
  }
  const draw = SVGS[name];
  const holder = h("div.prop-svg");
  holder.innerHTML = draw ? draw(state, `p${++uid}`) : "";
  return holder;
}

/** Painted art ids for each prop and state (wave 03). */
function paintedId(name, state) {
  if (name === "chest") return state.open ? "prop_chest_open" : "prop_chest";
  if (name === "sage_gate") return state.open ? "prop_sage_gate_open" : "prop_sage_gate";
  if (name === "word_cage") return state.bars >= 3 ? null : "prop_word_cage";
  return `prop_${name}`;
}

/** Is there painted art for this prop yet? (Painted signs need their words drawn on top.) */
export const isPainted = (name, state = {}) => Boolean(assetInfo(paintedId(name, state) || "")?.base?.src);

const ITEM_ICONS = ["fish", "cell", "note", "shard", "banana", "coin", "key", "chart", "spyglass", "rope", "shovel", "lantern", "biscuit", "magnet", "shell", "feather"];

/** An inventory icon: a cell of the painted item sheet, or an SVG stand-in. */
export function itemIcon(icon) {
  const sheet = assetInfo("icons_items")?.sheet;
  const i = sheet?.names ? sheet.names.indexOf(icon) : ITEM_ICONS.indexOf(icon);
  if (sheet?.src && i >= 0) {
    const cols = sheet.cols || 4;
    const rows = sheet.rows || 4;
    return h("div.item-icon", {
      style: {
        backgroundImage: `url("assets/${sheet.src}")`,
        backgroundSize: `${cols * 100}% ${rows * 100}%`,
        backgroundPosition: `${((i % cols) / (cols - 1)) * 100}% ${(Math.floor(i / cols) / (rows - 1)) * 100}%`,
      },
    });
  }
  const holder = h("div.item-icon");
  holder.innerHTML = (ICON_SVGS[icon] || ICON_SVGS.shard)(`i${++uid}`);
  return holder;
}

// ---------------------------------------------------------------- SVG stand-ins
// Each takes (state, uid) and returns SVG markup that fills its box
// (preserveAspectRatio keeps the base on the bottom edge).

const svg = (w, hgt, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">${body}</svg>`;

const wood = (u, a = "#9a6a3c", b = "#5b3a1e") => `<linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const stone = (u, a = "#d9c49a", b = "#8f7a55") => `<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const glow = (u, color) => `<radialGradient id="${u}g"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const INK = 'stroke="#2a1a0c" stroke-opacity="0.55" stroke-width="2"';

const SVGS = {
  signpost: (st, u) =>
    svg(
      150,
      210,
      `<defs>${wood(u)}${wood(u + "b", "#c79a62", "#8a5f33")}</defs>
      <rect x="66" y="22" width="18" height="186" rx="4" fill="url(#${u}w)" ${INK}/>
      <path d="M66 150 q9 6 18 0 M66 158 q9 6 18 0 M66 166 q9 6 18 0" stroke="#d8c08c" stroke-width="3" fill="none"/>
      <path d="M8 40 L104 34 L112 50 L104 66 L10 70 Z" fill="url(#${u}bw)" ${INK}/>
      <path d="M142 84 L46 80 L38 96 L46 112 L140 114 Z" fill="url(#${u}bw)" ${INK}/>
      <circle cx="75" cy="52" r="3" fill="#3b2a18"/><circle cx="75" cy="97" r="3" fill="#3b2a18"/>
      <path d="M118 22 q8 -14 20 -10 q-6 6 -20 10z" fill="#f4f4f4" stroke="#aaa"/>`,
    ),

  chest: (st, u) =>
    st.open
      ? svg(
          140,
          120,
          `<defs>${wood(u)}${glow(u, "#7ff7ff")}</defs>
          <ellipse cx="70" cy="58" rx="56" ry="30" fill="url(#${u}g)"/>
          <path d="M14 30 L30 4 L114 4 L128 30 Z" fill="url(#${u}w)" ${INK}/>
          <rect x="12" y="52" width="116" height="62" rx="6" fill="url(#${u}w)" ${INK}/>
          <rect x="12" y="44" width="116" height="14" rx="4" fill="#3a2412"/>
          <rect x="12" y="52" width="10" height="62" fill="#c99a3b"/><rect x="118" y="52" width="10" height="62" fill="#c99a3b"/>
          <rect x="12" y="78" width="116" height="7" fill="#c99a3b" opacity="0.9"/>`,
        )
      : svg(
          140,
          110,
          `<defs>${wood(u)}<radialGradient id="${u}d"><stop offset="0" stop-color="#ffe6a0"/><stop offset="1" stop-color="#a87418"/></radialGradient></defs>
          <path d="M12 40 Q70 0 128 40 L128 104 L12 104 Z" fill="url(#${u}w)" ${INK}/>
          <path d="M12 40 Q70 0 128 40" fill="none" stroke="#c99a3b" stroke-width="6"/>
          <rect x="12" y="38" width="116" height="7" fill="#3a2412" opacity="0.8"/>
          <rect x="12" y="38" width="10" height="66" fill="#c99a3b"/><rect x="118" y="38" width="10" height="66" fill="#c99a3b"/>
          <circle cx="70" cy="70" r="17" fill="url(#${u}d)" stroke="#5e3d02" stroke-width="3"/>
          <g stroke="#5e3d02" stroke-width="2">${Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return `<line x1="${70 + Math.cos(a) * 12}" y1="${70 + Math.sin(a) * 12}" x2="${70 + Math.cos(a) * 16}" y2="${70 + Math.sin(a) * 16}"/>`;
          }).join("")}</g>
          <line x1="70" y1="70" x2="70" y2="58" stroke="#5e3d02" stroke-width="3"/>
          <path d="M24 30 q10 20 4 40 q8 -16 0 -40" fill="#3f7a3a" opacity="0.85"/>
          <circle cx="110" cy="96" r="4" fill="#e8e2d0"/><circle cx="102" cy="99" r="3" fill="#e8e2d0"/>`,
        ),

  tide_pool: (st, u) =>
    svg(
      270,
      84,
      `<defs><radialGradient id="${u}p" cx="0.5" cy="0.45"><stop offset="0" stop-color="#7ff0ee"/><stop offset="0.7" stop-color="#1fb3c4"/><stop offset="1" stop-color="#11708a"/></radialGradient></defs>
      <ellipse cx="135" cy="46" rx="130" ry="36" fill="#5b5248"/>
      <ellipse cx="135" cy="44" rx="112" ry="27" fill="url(#${u}p)"/>
      <path d="M40 40 q30 -10 70 -4 M150 36 q40 -6 70 6" stroke="#dffcff" stroke-width="2" opacity="0.7" fill="none"/>
      ${[20, 60, 200, 240, 100, 170].map((x, i) => `<ellipse cx="${x}" cy="${i % 2 ? 72 : 22}" rx="${14 + (i % 3) * 4}" ry="9" fill="#6e6457" stroke="#3d362e"/>`).join("")}
      <path d="M200 52 l6 -10 l4 10 l10 2 l-8 6 l2 10 l-8 -5 l-8 5 l2 -10 l-8 -6z" fill="#e8543c"/>
      ${
        st.fish
          ? `<g transform="translate(96 40) rotate(-12)"><ellipse cx="0" cy="0" rx="24" ry="11" fill="#ff9a2e" stroke="#9c4a00" stroke-width="2"/><path d="M22 0 l14 -10 l0 20z" fill="#ff9a2e" stroke="#9c4a00" stroke-width="2"/><circle cx="-12" cy="-3" r="3.5" fill="#fff"/><circle cx="-12" cy="-3" r="1.8" fill="#222"/><path d="M-4 -9 q6 9 0 18" stroke="#ffd18a" stroke-width="2" fill="none"/></g>`
          : ""
      }`,
    ),

  bottle: (st, u) =>
    svg(
      46,
      64,
      `<defs><linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fe0a0"/><stop offset="1" stop-color="#1f6b3a"/></linearGradient></defs>
      <ellipse cx="23" cy="58" rx="22" ry="6" fill="#d9c08a"/>
      <g transform="rotate(-58 23 40)"><rect x="12" y="20" width="22" height="38" rx="9" fill="url(#${u}b)" stroke="#123d22" stroke-width="2" opacity="0.92"/><rect x="18" y="8" width="10" height="16" rx="3" fill="url(#${u}b)" stroke="#123d22" stroke-width="2"/><rect x="18" y="3" width="10" height="7" rx="2" fill="#a0703c"/><rect x="17" y="30" width="12" height="20" rx="3" fill="#f0e2bc" opacity="0.9"/></g>`,
    ),

  sage_gate: (st, u) =>
    svg(
      230,
      330,
      `<defs>${stone(u)}<linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ffcff" stop-opacity="0.85"/><stop offset="1" stop-color="#2ee0d0" stop-opacity="0.35"/></linearGradient></defs>
      <path d="M10 330 L10 120 Q115 -20 220 120 L220 330 L176 330 L176 140 Q115 50 54 140 L54 330 Z" fill="url(#${u}s)" stroke="#5a4a30" stroke-width="3"/>
      ${[70, 110, 150, 190, 230, 270].map((y) => `<path d="M18 ${y} h28 M184 ${y} h28" stroke="#6b5a3a" stroke-width="2"/>`).join("")}
      <g fill="none" stroke="#5ff3e0" stroke-width="3" stroke-linecap="round" opacity="0.95">
        <path d="M24 160 l8 -10 l8 10 M26 200 c6 -12 14 12 20 0 M24 240 l16 0 l-8 -12z M188 170 c6 -10 14 10 20 0 M190 210 l8 12 l8 -12 M188 250 l16 -8 l-4 14"/>
        <path d="M80 54 q35 -24 70 0 M96 40 l8 -10 l8 10 l8 -10"/>
      </g>
      ${
        st.open
          ? `<path d="M56 330 L56 142 Q115 56 174 142 L174 330 Z" fill="#f6e3b4" opacity="0.18"/>`
          : `<path d="M56 330 L56 142 Q115 56 174 142 L174 330 Z" fill="url(#${u}c)"/>
             <circle cx="115" cy="210" r="30" fill="none" stroke="#e8ffff" stroke-width="4"/>
             <path d="M100 210 l15 -18 l15 18 l-15 18z" fill="none" stroke="#e8ffff" stroke-width="3"/>`
      }
      <path d="M12 300 q20 -40 10 -90 M214 290 q-16 -50 -6 -110" stroke="#3f8a3a" stroke-width="5" fill="none"/>`,
    ),

  word_cage: (st, u) => {
    const broken = st.bars || 0;
    const bars = [40, 70, 105, 140, 170];
    const glyphs = (x) =>
      Array.from({ length: 7 }, (_, i) => `<path d="M${x - 5} ${80 + i * 24} q5 -8 10 0 q-5 8 -10 0" fill="none" stroke="#f3e6ff" stroke-width="1.6" opacity="0.8"/>`).join("");
    return svg(
      210,
      270,
      `<defs>${glow(u, "#c58bff")}</defs>
      <ellipse cx="105" cy="258" rx="100" ry="26" fill="url(#${u}g)" opacity="0.7"/>
      <ellipse cx="105" cy="258" rx="92" ry="12" fill="none" stroke="#c58bff" stroke-width="6"/>
      <path d="M13 70 Q105 -30 197 70" fill="none" stroke="#c58bff" stroke-width="6"/>
      ${bars
        .map((x, i) => {
          const gone = i < broken * 2 && i !== 2;
          return gone ? "" : `<path d="M${x} ${i === 0 || i === 4 ? 70 : 40} L${x} 256" stroke="#b678ff" stroke-width="7" stroke-linecap="round"/>${glyphs(x)}`;
        })
        .join("")}
      <rect x="92" y="150" width="26" height="22" rx="4" fill="#7a3fc0" stroke="#f3e6ff" stroke-width="2"/>
      <path d="M97 150 v-8 a8 8 0 0 1 16 0 v8" fill="none" stroke="#f3e6ff" stroke-width="3"/>`,
    );
  },

  stone_frog: (st, u) =>
    svg(
      140,
      130,
      `<defs>${stone(u, "#a9b49a", "#5f6a55")}</defs>
      <rect x="18" y="100" width="104" height="28" rx="6" fill="#8a8470" stroke="#4d4a3e" stroke-width="2"/>
      <ellipse cx="70" cy="76" rx="54" ry="34" fill="url(#${u}s)" stroke="#3c4434" stroke-width="2"/>
      <circle cx="44" cy="44" r="17" fill="url(#${u}s)" stroke="#3c4434" stroke-width="2"/><circle cx="96" cy="44" r="17" fill="url(#${u}s)" stroke="#3c4434" stroke-width="2"/>
      <circle cx="44" cy="44" r="7" fill="#2b3125"/><circle cx="96" cy="44" r="7" fill="#2b3125"/>
      <path d="M30 80 Q70 112 110 80" fill="none" stroke="#2b3125" stroke-width="4" stroke-linecap="round"/>
      <circle cx="70" cy="66" r="7" fill="#e7d9a8" stroke="#6b5a3a" stroke-width="2"/>
      <path d="M26 64 q8 -4 12 2 M104 64 q-8 -4 -12 2" stroke="#4c7a3a" stroke-width="4" fill="none" opacity="0.8"/>
      <rect x="54" y="108" width="32" height="14" rx="2" fill="#c9b98a"/>`,
    ),

  airship_wreck: (st, u) =>
    svg(
      520,
      300,
      `<defs>${wood(u, "#a8743e", "#4a2c14")}<linearGradient id="${u}bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e3c2"/><stop offset="1" stop-color="#b59a6c"/></linearGradient>${glow(u, "#6ff6ff")}</defs>
      <path d="M40 120 Q200 10 400 70 Q470 100 430 170 Q300 210 120 190 Q30 170 40 120 Z" fill="url(#${u}bl)" stroke="#6b5434" stroke-width="3"/>
      <path d="M120 70 L150 190 M220 40 L230 200 M320 52 L300 200" stroke="#8d7550" stroke-width="2"/>
      <rect x="250" y="80" width="40" height="30" fill="#d8a85c" opacity="0.8"/><rect x="140" y="110" width="30" height="34" fill="#9c6b40" opacity="0.7"/>
      <path d="M30 230 Q240 300 500 236 L470 290 Q240 312 50 286 Z" fill="url(#${u}w)" stroke="#2a1a0c" stroke-width="3"/>
      <path d="M60 240 L470 244 M70 262 L460 266" stroke="#c99a3b" stroke-width="5"/>
      ${[110, 200, 290, 380].map((x) => `<circle cx="${x}" cy="270" r="9" fill="#2a3a4a" stroke="#c99a3b" stroke-width="3"/>`).join("")}
      <g transform="translate(470 210) rotate(25)"><rect x="-6" y="-6" width="12" height="40" fill="#8a6a3a"/><ellipse cx="0" cy="-30" rx="10" ry="34" fill="#b88a4a" stroke="#5e3d02" stroke-width="2"/><ellipse cx="0" cy="40" rx="10" ry="30" fill="#b88a4a" stroke="#5e3d02" stroke-width="2" transform="rotate(70)"/></g>
      <circle cx="180" cy="236" r="40" fill="url(#${u}g)"/>
      <rect x="380" y="270" width="40" height="28" fill="#8a5f33" stroke="#2a1a0c" stroke-width="2"/><rect x="20" y="276" width="34" height="24" fill="#9a6a3c" stroke="#2a1a0c" stroke-width="2"/>`,
    ),

  crystal_ledge: (st, u) =>
    svg(
      190,
      160,
      `<defs><linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c8ff"/><stop offset="0.5" stop-color="#9b6bff"/><stop offset="1" stop-color="#4b2aa8"/></linearGradient></defs>
      <path d="M10 160 L18 70 L60 40 L130 36 L176 64 L182 160 Z" fill="#3b3550" stroke="#1f1a30" stroke-width="3"/>
      <path d="M20 66 L60 36 L130 32 L174 60 L150 74 L46 78 Z" fill="#5a5274"/>
      ${[
        [22, 160, 34, 90, 48, 160],
        [140, 160, 160, 84, 178, 160],
        [60, 160, 74, 110, 88, 160],
        [118, 160, 128, 118, 140, 160],
      ]
        .map(([a, b, c, d, e, f]) => `<path d="M${a} ${b} L${c} ${d} L${e} ${f} Z" fill="url(#${u}c)" stroke="#2a1660" stroke-width="2"/>`)
        .join("")}
      <path d="M150 40 L162 4 L172 46 Z M26 64 L34 24 L46 62 Z" fill="url(#${u}c)" stroke="#2a1660" stroke-width="2"/>`,
    ),

  shrine: (st, u) =>
    svg(
      190,
      280,
      `<defs>${stone(u, "#d8d0bc", "#7d7562")}<linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ffff"/><stop offset="0.5" stop-color="#7ff7e6"/><stop offset="1" stop-color="#1aa7a0"/></linearGradient>${glow(u, "#8ffff0")}</defs>
      <ellipse cx="95" cy="100" rx="90" ry="100" fill="url(#${u}g)" opacity="${st.awake ? 0.9 : 0.45}"/>
      <path d="M28 280 L38 200 Q95 170 152 200 L162 280 Z" fill="url(#${u}s)" stroke="#4d4636" stroke-width="3"/>
      <path d="M46 214 q20 -18 40 0 q20 18 40 0" fill="none" stroke="#5ff3e0" stroke-width="3" opacity="0.8"/>
      <path d="M95 10 L124 70 L114 190 L76 190 L66 70 Z" fill="url(#${u}c)" stroke="#0f6a66" stroke-width="3"/>
      <path d="M95 10 L100 190 M66 70 L124 70" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
      <ellipse cx="95" cy="262" rx="60" ry="12" fill="#5ff3e0" opacity="0.75"/>`,
    ),

  lair: (st, u) =>
    svg(
      280,
      320,
      `<defs><radialGradient id="${u}m" cx="0.5" cy="0.7"><stop offset="0" stop-color="#7a3cc8"/><stop offset="0.5" stop-color="#240c40"/><stop offset="1" stop-color="#05020c"/></radialGradient><linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c8ff"/><stop offset="1" stop-color="#5a2fb8"/></linearGradient></defs>
      <path d="M0 320 L10 120 Q40 20 140 10 Q240 20 270 120 L280 320 Z" fill="#3a3346" stroke="#1a1522" stroke-width="3"/>
      <path d="M44 320 L52 160 Q80 80 140 76 Q200 80 228 160 L236 320 Z" fill="url(#${u}m)"/>
      ${[
        [58, 150, 70, 100, 84, 146],
        [96, 104, 110, 70, 122, 100],
        [150, 98, 166, 66, 178, 104],
        [196, 146, 212, 104, 222, 152],
        [50, 320, 64, 262, 78, 320],
        [200, 320, 216, 250, 232, 320],
      ]
        .map(([a, b, c, d, e, f]) => `<path d="M${a} ${b} L${c} ${d} L${e} ${f} Z" fill="url(#${u}c)" stroke="#2a1660" stroke-width="2"/>`)
        .join("")}
      <path d="M110 200 q10 -30 0 -60 M160 210 q-10 -30 4 -64" stroke="#d9c2ff" stroke-width="4" fill="none" opacity="0.35"/>`,
    ),
};

const ICON_SVGS = {
  fish: () =>
    svg(
      64,
      64,
      `<g transform="translate(32 32) rotate(-15)"><ellipse cx="-4" cy="0" rx="20" ry="11" fill="#ff9a2e" stroke="#9c4a00" stroke-width="2.5"/><path d="M14 0 l14 -11 l0 22z" fill="#ff9a2e" stroke="#9c4a00" stroke-width="2.5"/><circle cx="-14" cy="-3" r="4" fill="#fff"/><circle cx="-14" cy="-3" r="2" fill="#222"/><path d="M-4 -9 q6 9 0 18" stroke="#ffd18a" stroke-width="2.5" fill="none"/></g>`,
    ),
  cell: (u) =>
    svg(
      64,
      64,
      `<defs>${glow(u, "#ffcf5c")}</defs><circle cx="32" cy="32" r="28" fill="url(#${u}g)"/><rect x="20" y="12" width="24" height="42" rx="6" fill="#c99a3b" stroke="#5e3d02" stroke-width="2.5"/><rect x="25" y="18" width="14" height="30" rx="4" fill="#ffe08a"/><rect x="26" y="6" width="12" height="8" rx="2" fill="#8a6a3a"/>`,
    ),
  note: () =>
    svg(
      64,
      64,
      `<rect x="12" y="16" width="40" height="32" rx="3" fill="#f0e2bc" stroke="#8a7550" stroke-width="2.5" transform="rotate(-8 32 32)"/><path d="M18 26 h26 M18 33 h22 M18 40 h18" stroke="#8a7550" stroke-width="2" transform="rotate(-8 32 32)"/><circle cx="44" cy="44" r="7" fill="#b02a4a" stroke="#5e1020" stroke-width="2"/>`,
    ),
  shard: (u) =>
    svg(
      64,
      64,
      `<defs>${glow(u, "#8ffff0")}<linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#8ff3ff"/><stop offset="1" stop-color="#1aa7c0"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#${u}g)"/><path d="M32 4 L46 26 L40 58 L24 58 L18 24 Z" fill="url(#${u}c)" stroke="#0f6a7a" stroke-width="2.5"/><path d="M32 4 L32 58 M18 24 L46 26" stroke="#fff" stroke-width="1.5" opacity="0.7"/>`,
    ),
};

/** The crystal-shard picture for the HUD (painted icon when it exists). */
export const shardIcon = () => itemIcon("shard");
