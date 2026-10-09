// Picture models the hints and the droid can draw. Each takes a plain spec
// (see learn/hints.js and ai/prompts.js) and returns an element.
// They show the thinking, not the answer: blocks to count, jumps to count.

import { h, esc } from "./dom.js";

const ones = (n) => n % 10;
const tens = (n) => Math.floor(n / 10) % 10;
const hundreds = (n) => Math.floor(n / 100) % 10;

export function renderVisual(spec) {
  switch (spec?.kind) {
    case "base_ten":
      return stepper(spec.op === "sub" ? subSteps(spec.a, spec.b) : addSteps(spec.a, spec.b), drawBlocks);
    case "number_line":
      return wrap(numberLine(spec));
    case "array":
      return wrap(array(spec));
    case "share":
      return wrap(share(spec));
    case "tens_groups":
      return wrap(tensGroups(spec));
    case "word":
      return wrap(word(spec));
    default:
      return null;
  }
}

const wrap = (svg, caption = "") => {
  const el = h("div.visual");
  el.innerHTML = svg;
  if (caption) el.append(h("div.steps", {}, caption));
  return el;
};

// ---------------------------------------------------------------- base ten

export function subSteps(a, b) {
  let H = hundreds(a);
  let T = tens(a);
  let O = ones(a);
  const bh = hundreds(b);
  const bt = tens(b);
  const bo = ones(b);
  const steps = [{ text: `Start with ${a}: ${H} hundreds, ${T} tens, ${O} ones.`, s: { H, T, O } }];
  if (O < bo) {
    if (T === 0) {
      H -= 1;
      T += 10;
      steps.push({ text: "Not enough ones, and no tens to trade. Trade 1 hundred for 10 tens first.", s: { H, T, O }, flash: "t" });
    }
    T -= 1;
    O += 10;
    steps.push({ text: `Now trade 1 ten for 10 ones. That makes ${O} ones.`, s: { H, T, O }, flash: "o" });
  }
  if (T < bt) {
    H -= 1;
    T += 10;
    steps.push({ text: `Not enough tens. Trade 1 hundred for 10 tens. That makes ${T} tens.`, s: { H, T, O }, flash: "t" });
  }
  steps.push({ text: `Take away ${b}: ${bh} hundreds, ${bt} tens, ${bo} ones.`, s: { H, T, O }, removed: { H: bh, T: bt, O: bo } });
  steps.push({ text: "Count what's left. That's your answer.", s: { H: H - bh, T: T - bt, O: O - bo } });
  return steps;
}

export function addSteps(a, b) {
  let H = hundreds(a) + hundreds(b);
  let T = tens(a) + tens(b);
  let O = ones(a) + ones(b);
  const steps = [{ text: `Put ${a} and ${b} together: ${H} hundreds, ${T} tens, ${O} ones.`, s: { H, T, O } }];
  if (O >= 10) {
    O -= 10;
    T += 1;
    steps.push({ text: "10 ones make a new ten. Trade them in.", s: { H, T, O }, flash: "t" });
  }
  if (T >= 10) {
    T -= 10;
    H += 1;
    steps.push({ text: "10 tens make a new hundred. Trade them in.", s: { H, T, O }, flash: "h" });
  }
  steps.push({ text: "Count them up. That's your answer.", s: { H, T, O } });
  return steps;
}

function drawBlocks({ s, removed = { H: 0, T: 0, O: 0 }, flash }) {
  const W = 660;
  const col = (i) => 20 + i * 220;
  let out = `<svg viewBox="0 0 ${W} 210" width="${W}" height="210" font-family="Nunito Sans, sans-serif">`;
  ["Hundreds", "Tens", "Ones"].forEach((label, i) => {
    const hot = flash && "hto"[i] === flash;
    out += `<rect x="${col(i) - 6}" y="2" width="206" height="204" rx="10" fill="${hot ? "rgba(255,211,107,0.14)" : "rgba(255,255,255,0.04)"}" stroke="${hot ? "#ffd36b" : "rgba(255,255,255,0.18)"}"/>`;
    out += `<text x="${col(i) + 97}" y="22" text-anchor="middle" fill="#a9bddc" font-size="15" font-weight="800">${label}</text>`;
  });
  const fade = (i, n, total) => (i >= total - n ? ` opacity="0.22"` : "");
  for (let i = 0; i < s.H; i++) {
    const x = col(0) + (i % 5) * 38;
    const y = 34 + Math.floor(i / 5) * 40;
    out += `<g${fade(i, removed.H, s.H)}><rect x="${x}" y="${y}" width="32" height="32" fill="#3d7bff" stroke="#bcd6ff" stroke-width="1.5"/>`;
    for (let k = 1; k < 4; k++) out += `<line x1="${x + k * 8}" y1="${y}" x2="${x + k * 8}" y2="${y + 32}" stroke="#bcd6ff" stroke-opacity="0.5"/><line x1="${x}" y1="${y + k * 8}" x2="${x + 32}" y2="${y + k * 8}" stroke="#bcd6ff" stroke-opacity="0.5"/>`;
    out += `</g>`;
  }
  for (let i = 0; i < s.T; i++) {
    const x = col(1) + (i % 10) * 19;
    const y = 34 + Math.floor(i / 10) * 84;
    out += `<g${fade(i, removed.T, s.T)}><rect x="${x}" y="${y}" width="12" height="76" fill="#3fd0a0" stroke="#d2fff0" stroke-width="1.5"/>`;
    for (let k = 1; k < 10; k++) out += `<line x1="${x}" y1="${y + k * 7.6}" x2="${x + 12}" y2="${y + k * 7.6}" stroke="#d2fff0" stroke-opacity="0.55"/>`;
    out += `</g>`;
  }
  for (let i = 0; i < s.O; i++) {
    const x = col(2) + (i % 6) * 30;
    const y = 36 + Math.floor(i / 6) * 30;
    out += `<rect x="${x}" y="${y}" width="22" height="22" rx="3" fill="#ffb347" stroke="#fff1d6" stroke-width="1.5"${fade(i, removed.O, s.O)}/>`;
  }
  return out + `</svg>`;
}

/** A step-by-step picture with Back / Next buttons. */
function stepper(steps, draw) {
  let i = 0;
  const pic = h("div");
  const text = h("div", { style: { fontSize: "18px", fontWeight: "700", minHeight: "26px" } });
  const back = h("button.btn.small.ghost", { onclick: () => go(-1) }, "◀ Back");
  const next = h("button.btn.small", { onclick: () => go(1) }, "Next ▶");
  const el = h("div.visual", {}, pic, h("div.steps", {}, back, text, next));
  function go(d) {
    i = Math.max(0, Math.min(steps.length - 1, i + d));
    pic.innerHTML = draw(steps[i]);
    text.textContent = steps[i].text;
    back.disabled = i === 0;
    next.disabled = i === steps.length - 1;
  }
  go(0);
  return el;
}

// ---------------------------------------------------------------- number line

function niceStep(span) {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200]) if (span / s <= 20) return s;
  return 250;
}

function numberLine({ start, end, jumps = [] }) {
  const W = 680;
  const x = (v) => 30 + ((v - start) / (end - start)) * (W - 60);
  const step = niceStep(end - start);
  let out = `<svg viewBox="0 0 ${W} 170" width="${W}" height="170" font-family="Nunito Sans, sans-serif">`;
  out += `<line x1="20" y1="120" x2="${W - 20}" y2="120" stroke="#dfe9ff" stroke-width="3"/>`;
  const first = Math.ceil(start / step) * step;
  for (let v = first; v <= end; v += step) out += `<line x1="${x(v)}" y1="112" x2="${x(v)}" y2="128" stroke="#dfe9ff" stroke-width="2"/>`;
  const labels = new Set([start, end, ...jumps.flatMap((j) => [j.from, j.to])]);
  for (const v of labels) out += `<text x="${x(v)}" y="150" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800">${v}</text>`;
  jumps.forEach((j, i) => {
    const x1 = x(j.from);
    const x2 = x(j.to);
    const top = 120 - Math.min(90, 26 + Math.abs(x2 - x1) * 0.35);
    out += `<path d="M ${x1} 118 Q ${(x1 + x2) / 2} ${top} ${x2} 118" fill="none" stroke="${i % 2 ? "#ffd36b" : "#7fd8ff"}" stroke-width="3"/>`;
    out += `<polygon points="${x2},118 ${x2 + (x2 > x1 ? -9 : 9)},110 ${x2 + (x2 > x1 ? -9 : 9)},124" fill="${i % 2 ? "#ffd36b" : "#7fd8ff"}"/>`;
    if (j.label) out += `<text x="${(x1 + x2) / 2}" y="${(118 + top) / 2 - 2}" text-anchor="middle" fill="#ffd36b" font-size="15" font-weight="800">${esc(j.label)}</text>`;
  });
  return out + `</svg>`;
}

// ---------------------------------------------------------------- arrays and groups

function array({ rows, cols, split = null }) {
  // Smaller dots for big facts, so 10 × 10 still fits beside the question.
  const cell = Math.max(16, Math.min(30, Math.floor(300 / Math.max(1, rows)), Math.floor(500 / Math.max(1, cols))));
  const W = Math.max(260, cols * cell + 60);
  const H = rows * cell + (split ? 64 : 40);
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Nunito Sans, sans-serif">`;
  out += `<text x="${W / 2}" y="18" text-anchor="middle" fill="#a9bddc" font-size="15" font-weight="800">${rows} rows of ${cols}</text>`;
  const x0 = (W - cols * cell) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gold = split && c < split;
      out += `<circle cx="${x0 + c * cell + cell / 2}" cy="${30 + r * cell + cell / 2}" r="${Math.round(cell / 3)}" fill="${gold ? "#ffd36b" : "#7fd8ff"}" stroke="#fff" stroke-opacity="0.6"/>`;
    }
  }
  if (split) {
    const sx = x0 + split * cell;
    out += `<line x1="${sx}" y1="26" x2="${sx}" y2="${32 + rows * cell}" stroke="#fff" stroke-dasharray="5 4" stroke-width="2"/>`;
    out += `<text x="${x0 + (split * cell) / 2}" y="${H - 10}" text-anchor="middle" fill="#ffd36b" font-size="15" font-weight="800">${rows} × ${split}</text>`;
    out += `<text x="${sx + ((cols - split) * cell) / 2}" y="${H - 10}" text-anchor="middle" fill="#7fd8ff" font-size="15" font-weight="800">${rows} × ${cols - split}</text>`;
  }
  return out + `</svg>`;
}

function share({ total, groups }) {
  const each = total / groups;
  const perRow = Math.min(groups, 5);
  const gw = 120;
  const gh = 30 + Math.ceil(each / 4) * 22 + 10;
  const W = perRow * (gw + 12) + 20;
  const H = Math.ceil(groups / perRow) * (gh + 12) + 34;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Nunito Sans, sans-serif">`;
  out += `<text x="${W / 2}" y="18" text-anchor="middle" fill="#a9bddc" font-size="15" font-weight="800">${total} shared into ${groups} equal groups</text>`;
  for (let g = 0; g < groups; g++) {
    const gx = 10 + (g % perRow) * (gw + 12);
    const gy = 28 + Math.floor(g / perRow) * (gh + 12);
    out += `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="14" fill="rgba(127,216,255,0.08)" stroke="#7fd8ff"/>`;
    for (let i = 0; i < each; i++) out += `<circle cx="${gx + 20 + (i % 4) * 27}" cy="${gy + 22 + Math.floor(i / 4) * 22}" r="8" fill="#ffd36b"/>`;
  }
  return out + `</svg>`;
}

function tensGroups({ groups, tensEach }) {
  const gw = 20 + tensEach * 16;
  const W = Math.min(700, groups * (gw + 12) + 20);
  const perRow = Math.max(1, Math.floor((W - 20) / (gw + 12)));
  const H = Math.ceil(groups / perRow) * 110 + 30;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Nunito Sans, sans-serif">`;
  out += `<text x="${W / 2}" y="18" text-anchor="middle" fill="#a9bddc" font-size="15" font-weight="800">${groups} groups of ${tensEach} tens</text>`;
  for (let g = 0; g < groups; g++) {
    const gx = 10 + (g % perRow) * (gw + 12);
    const gy = 28 + Math.floor(g / perRow) * 110;
    out += `<rect x="${gx}" y="${gy}" width="${gw}" height="96" rx="10" fill="rgba(63,208,160,0.08)" stroke="#3fd0a0"/>`;
    for (let i = 0; i < tensEach; i++) out += `<rect x="${gx + 10 + i * 16}" y="${gy + 10}" width="10" height="76" fill="#3fd0a0" stroke="#d2fff0"/>`;
  }
  return out + `</svg>`;
}

function word({ before, focus, after, rule }) {
  const html = `<div style="font-size:56px;font-weight:900;letter-spacing:0.06em">${esc(before)}<span style="color:#ffd36b;text-decoration:underline;text-underline-offset:8px">${esc(focus)}</span>${esc(after)}</div>${rule ? `<div style="font-size:18px;color:#a9bddc;margin-top:6px">${esc(rule)}</div>` : ""}`;
  return html;
}
