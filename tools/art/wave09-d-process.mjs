import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const raw = 'art/raw/wave-09/map_driftwood/harbor_open_selected.png';
const manifestPath = 'public/assets/manifest.json';
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const original = structuredClone(manifest);
const variant = manifest.assets.map_driftwood.variants.harbor_open;
const places = { menagerie: [674, 310], sword_dock: [937, 336], lighthouse: [814, 164] };
const trails = {
  'harbor-menagerie': [[790,255],[804,276],[780,287],[754,300],[737,308],[737,332],[729,341],[709,321],[694,310],[674,310]],
  'harbor-sword_dock': [[790,255],[804,276],[824,276],[850,284],[875,293],[891,302],[906,299],[906,319],[920,331],[937,336]],
  'harbor-lighthouse': [[790,255],[775,245],[765,230],[766,219],[778,215],[766,207],[779,200],[790,183],[802,172],[814,164]],
};
const source = await sharp(raw).metadata();
assert.deepEqual([source.width, source.height], [1536, 1024]);
let quality = 86;
let webp = await sharp(raw).removeAlpha().webp({ quality }).toBuffer();
while (webp.length > 500000 && quality > 70) {
  webp = await sharp(raw).removeAlpha().webp({ quality: --quality }).toBuffer();
}
assert(webp.length <= 500000, 'Scene exceeds 500 KB budget');
const shipped = await sharp(webp).metadata();
assert.deepEqual([shipped.width, shipped.height], [variant.w, variant.h]);
assert.equal(shipped.hasAlpha, false);
Object.assign(variant.places, places);
Object.assign(variant.trails, trails);
variant.sourceWave09 = {
  wave_file: 'art/waves/wave-09-harbor-finish.md',
  model: 'built-in image_gen (identifier not exposed)',
  date: '2026-10-14',
  attempt: 3,
};
for (const [key, points] of Object.entries(trails)) {
  assert(points.length >= 6 && points.length <= 10);
  assert.deepEqual(points[0], variant.places.harbor);
  assert.deepEqual(points.at(-1), places[key.slice('harbor-'.length)]);
  for (const [x, y] of points) assert(x >= 0 && x < 1536 && y >= 0 && y < 1024);
}
// Only the three requested places/routes and this variant's provenance may change.
const preserved = structuredClone(manifest);
const oldVariant = original.assets.map_driftwood.variants.harbor_open;
for (const key of Object.keys(places)) delete preserved.assets.map_driftwood.variants.harbor_open.places[key];
for (const key of Object.keys(trails)) delete preserved.assets.map_driftwood.variants.harbor_open.trails[key];
delete preserved.assets.map_driftwood.variants.harbor_open.sourceWave09;
for (const key of Object.keys(places)) delete oldVariant.places[key];
for (const key of Object.keys(trails)) delete oldVariant.trails[key];
delete oldVariant.sourceWave09;
assert.deepEqual(preserved, original, 'Unrelated manifest fields changed');

const colors = { 'harbor-menagerie': '#ff91d6', 'harbor-sword_dock': '#53f6f0', 'harbor-lighthouse': '#caff58' };
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024">';
for (const [key, points] of Object.entries(variant.trails)) {
  const poly = points.map(p => p.join(',')).join(' ');
  const color = colors[key] ?? '#ffe6a0';
  svg += `<polyline points="${poly}" fill="none" stroke="#111b2e" stroke-width="6" stroke-linejoin="round"/><polyline points="${poly}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`;
  for (const [x,y] of points) svg += `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#111b2e"/>`;
}
const labels = { menagerie: [554,359], sword_dock: [958,375], lighthouse: [831,111], harbor: [828,242], watchtower: [1180,415] };
for (const [id, [x,y]] of Object.entries(variant.places)) {
  svg += `<circle cx="${x}" cy="${y}" r="7" fill="white" stroke="#111b2e" stroke-width="3"/>`;
  const [tx,ty] = labels[id] ?? [x+12,y-12];
  svg += `<text x="${tx}" y="${ty}" fill="white" stroke="#111b2e" stroke-width="4" paint-order="stroke" font-family="sans-serif" font-size="16" font-weight="bold">${id} (${x},${y})</text>`;
}
svg += '<rect x="18" y="18" width="880" height="42" rx="7" fill="#111b2e" fill-opacity="0.9"/><text x="32" y="45" font-family="sans-serif" font-size="18" fill="white">REVIEW ONLY: pink menagerie / cyan sword dock / lime lighthouse / gold existing</text></svg>';
await fs.writeFile(`public/assets/${variant.src}`, webp);
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await sharp(webp).composite([{ input: Buffer.from(svg) }]).png().toFile('art/review/wave-09/map_driftwood-harbor-open-routes.png');
await fs.writeFile('tools/art/wave09-d-record.json', JSON.stringify({
  id: 'map_driftwood', variant: 'harbor_open', raw, attempt: 3, src: variant.src,
  dimensions: [1536,1024], bytes: webp.length, quality, places, trails,
  flags: ['Exact attempt-3 prompt was not saved by the interrupted run; earlier recorded prompts retained without inventing a replacement.', 'Minor repaint/texture changes outside the harbor; original landmarks and overall layout retained.'],
}, null, 2) + '\n');
console.log(JSON.stringify({ bytes: webp.length, quality, places, trails }, null, 2));
