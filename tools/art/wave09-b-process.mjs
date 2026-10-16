import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const raw = path.join(root, 'art/raw/wave-09/pet_moth_1/attempt-3.png');
const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let alphaNoiseRemoved = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] > 0 && data[i] <= 8) { data[i] = 0; alphaNoiseRemoved++; }
}
const cells = [];
const bounds = (pixels, w, h) => {
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (pixels[(y * w + x) * 4 + 3]) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); }
  }
  assert(r >= 0, 'Nonempty cell');
  return { left: l, top: t, width: r - l + 1, height: b - t + 1 };
};
const cw = info.width / 2, ch = info.height / 2;
assert(Number.isInteger(cw) && Number.isInteger(ch));
for (let n = 0; n < 4; n++) {
  const cell = await sharp(data, { raw: info }).extract({ left: n % 2 * cw, top: Math.floor(n / 2) * ch, width: cw, height: ch }).raw().toBuffer();
  const box = bounds(cell, cw, ch);
  assert(box.left > 0 && box.top > 0 && box.left + box.width < cw && box.top + box.height < ch, 'No source cell clipping or bleed');
  cells.push({ cell, box });
}
const targetHeight = Math.floor(Math.min(512 * .84, ...cells.map(({ box }) => 512 * .84 * box.height / box.width)));
const layers = [], frameQA = [];
for (let n = 0; n < 4; n++) {
  const { cell, box } = cells[n];
  const width = Math.round(box.width * targetHeight / box.height);
  const input = await sharp(cell, { raw: { width: cw, height: ch, channels: 4 } }).extract(box).resize(width, targetHeight).png().toBuffer();
  const left = Math.round((512 - width) / 2), top = 481 - targetHeight;
  layers.push({ input, left: n % 2 * 512 + left, top: Math.floor(n / 2) * 512 + top });
  frameQA.push({ frame: n, sourceBox: box, exportBox: [left, top, width, targetHeight], baseline: 481 });
}
const output = path.join(root, 'public/assets/characters/pet_moth_1/battle.webp');
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } }).composite(layers).webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(output);
const { data: pixels, info: shipped } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let borderHits = 0;
for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
  if ([0, 511, 512, 1023].includes(x) || [0, 511, 512, 1023].includes(y)) {
    if (pixels[(y * 1024 + x) * 4 + 3]) borderHits++;
  }
}
assert.equal(borderHits, 0, 'Transparent outside and cell borders');
const bytes = (await fs.stat(output)).size;
assert(bytes <= 700 * 1024);
const manifestPath = path.join(root, 'public/assets/manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert(!manifest.assets.pet_moth_1, 'New asset only');
const before = structuredClone(manifest);
const entry = structuredClone(manifest.assets.pet_raptor_1);
entry.wave = 9; entry.status = 'replace';
entry.battle.src = 'characters/pet_moth_1/battle.webp';
entry.source = { wave_file: 'art/waves/wave-09-harbor-finish.md', model: 'built-in image_gen (identifier not exposed)', date: '2026-10-14' };
manifest.assets.pet_moth_1 = entry;
const preserved = structuredClone(manifest); delete preserved.assets.pet_moth_1;
assert.deepEqual(preserved, before, 'Every prior manifest entry preserved');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const review = path.join(root, 'art/review/wave-09');
await fs.mkdir(review, { recursive: true });
for (const [name, background] of [['light', '#f4f0e8'], ['dark', '#29353f']]) {
  await sharp(output).flatten({ background }).jpeg({ quality: 92 }).toFile(path.join(review, 'pet_moth_1-' + name + '.jpg'));
}
const record = { id: 'pet_moth_1', selectedAttempt: 3, attempts: 3, sourceDimensions: [info.width, info.height], dimensions: [shipped.width, shipped.height], bytes, quality: 86, borderHits, cornerAlpha: [0, 0, 0, 0], alphaNoiseRemoved, frameQA, status: 'replace', flags: ['Wings remain larger than the tiny-wing baby brief after three attempts.', 'Hurt internal glow is only slightly dimmer; stronger dimming remains for review.'] };
await fs.writeFile(path.join(root, 'tools/art/wave09-b-record.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record));
