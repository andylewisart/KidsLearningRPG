#!/usr/bin/env node
// Writes tools/placeholders-preview.html: every hologram placeholder sprite on
// the simulator's dark background, at full size and at small battle size.
//
//   node tools/placeholders-preview.mjs          writes the HTML
//   node tools/placeholders-preview.mjs --png    also screenshots it to
//                                                tools/placeholders-preview.png
//
// --png needs the "playwright" package, which is deliberately not a dependency
// of this repo: install it anywhere Node can find it (NODE_PATH works), and set
// CHROMIUM_PATH if Playwright should use a specific Chromium binary.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PLACEHOLDER_IDS, placeholderSvg } from '../src/ui/placeholders.js';

const SIZES = {
  knight: [200, 300],
  gunner: [200, 300],
  spellwright: [200, 300],
  titancaller: [200, 300],
  droid: [200, 200],
  scrap_raptor: [300, 300],
  volt_jelly: [300, 300],
  magnet_beetle: [300, 300],
  ink_slime: [300, 300],
  dominion_drone: [300, 300],
  geode_titan: [400, 400],
  titan_starter: [400, 400],
  monkey: [120, 120],
};
const FALLBACK = 'not_a_real_id';

let uid = 0;
const card = (id, scale, extraClass = '') => {
  const [w, h] = SIZES[id] ?? [200, 200];
  return `<figure class="card ${extraClass}">
  <div class="art" style="width:${Math.round(w * scale)}px;height:${Math.round(h * scale)}px">${placeholderSvg(id, `pv${uid++}`)}</div>
  <figcaption>${id}</figcaption>
</figure>`;
};

const full = [...PLACEHOLDER_IDS, FALLBACK].map((id) => card(id, 1)).join('\n');
// Battle size: heroes and fiends about 150px tall, the boss and Titan bigger.
const small = PLACEHOLDER_IDS.map((id) => {
  const h = (SIZES[id] ?? [200, 200])[1];
  const scale = id === 'monkey' ? 0.75 : h >= 400 ? 0.55 : h >= 300 ? 0.5 : 0.6;
  return card(id, scale, 'small');
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hologram placeholders</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #0b1020; color: #9fb6d8;
         font: 14px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 18px; color: #d8f6ff; letter-spacing: .04em; }
  h2 { margin: 28px 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: .12em; color: #6f86ad; }
  p { margin: 0 0 16px; }
  .grid { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }
  .card { margin: 0; padding: 12px 12px 8px; border: 1px solid #1c2747; border-radius: 10px;
          background: radial-gradient(ellipse at 50% 100%, #121c38 0%, #0b1020 70%); }
  .art { display: block; }
  .art svg { display: block; }
  figcaption { margin-top: 6px; text-align: center; font: 12px ui-monospace, Menlo, Consolas, monospace; color: #8fb3e0; }
  .small { padding: 8px 8px 6px; }
</style>
</head>
<body>
<h1>Crystal Titans: hologram placeholders</h1>
<p>Holo-training simulator stand-ins. Heroes face left, fiends face right. The last card is the fallback for an unknown id.</p>
<h2>Full size</h2>
<div class="grid">
${full}
</div>
<h2>Battle size</h2>
<div class="grid">
${small}
</div>
</body>
</html>
`;

const outPath = fileURLToPath(new URL('./placeholders-preview.html', import.meta.url));
writeFileSync(outPath, html);
console.log(`Wrote ${outPath}`);

if (process.argv.includes('--png')) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    try {
      playwright = createRequire(import.meta.url)('playwright'); // honors NODE_PATH
    } catch {
      console.error('--png needs the "playwright" package. Install it outside this repo and put it on NODE_PATH.');
      process.exit(1);
    }
  }
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await playwright.chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(pathToFileURL(outPath).href);
  const pngPath = fileURLToPath(new URL('./placeholders-preview.png', import.meta.url));
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
  console.log(`Wrote ${pngPath}`);
}
