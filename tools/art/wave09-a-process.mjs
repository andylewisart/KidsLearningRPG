import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const rawDir = path.join(root, 'art/raw/wave-09/tutor_droid');
const attempt = Number(process.argv[2]);
assert([1, 2, 3].includes(attempt), 'Select an attempt from 1 to 3');
const input = path.join(rawDir, `field_cozy-attempt-${attempt}.png`);
const manifestPath = path.join(root, 'public/assets/manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const before = structuredClone(manifest);
delete before.assets.tutor_droid.field_cozy;
const base = manifest.assets.tutor_droid.base;
assert.deepEqual([base.w, base.h], [901, 1024]);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let removedAlphaNoise = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] > 0 && data[i] <= 8) { data[i] = 0; removedAlphaNoise++; }
}
// Keep the full input canvas: no alpha trimming, padding, or recentering.
const sized = await sharp(data, { raw: info }).resize(base.w, base.h, { fit: 'fill' }).png().toBuffer();
const outputPath = path.join(root, 'public/assets/characters/tutor_droid/field_cozy.webp');
await sharp(sized).webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(outputPath);
const { data: pixels, info: exported } = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let borderHits = 0;
for (let y = 0; y < exported.height; y++) for (let x = 0; x < exported.width; x++) {
  if (x === 0 || y === 0 || x === exported.width - 1 || y === exported.height - 1) {
    if (pixels[(y * exported.width + x) * 4 + 3]) borderHits++;
  }
}
assert.equal(borderHits, 0, 'Export must have a fully transparent border');
const bytes = (await fs.stat(outputPath)).size;
assert(bytes <= 400 * 1024, 'Base size budget');
manifest.assets.tutor_droid.field_cozy = { src: 'characters/tutor_droid/field_cozy.webp', w: base.w, h: base.h, anchor: [...base.anchor], status: 'replace' };
const unchanged = structuredClone(manifest);
delete unchanged.assets.tutor_droid.field_cozy;
assert.deepEqual(unchanged, before, 'Preserve all prior manifest entries and metadata');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const reviewDir = path.join(root, 'art/review/wave-09');
await fs.mkdir(reviewDir, { recursive: true });
const tiles = await Promise.all([path.join(root, 'public/assets', base.src), outputPath].map(p => sharp(p).resize({ height: 640 }).png().toBuffer()));
await sharp({ create: { width: 1126, height: 640, channels: 4, background: '#29353f' } }).composite(tiles.map((input, i) => ({ input, left: i * 563, top: 0 }))).jpeg({ quality: 90 }).toFile(path.join(reviewDir, 'tutor_droid-base-and-cozy.jpg'));
await sharp(outputPath).flatten({ background: '#f4f0e8' }).jpeg({ quality: 90 }).toFile(path.join(reviewDir, 'tutor_droid-cozy-light.jpg'));
const record = { id: 'tutor_droid.field_cozy', status: 'replace', selectedAttempt: attempt, sourceDimensions: [info.width, info.height], dimensions: [exported.width, exported.height], anchor: base.anchor, bytes, quality: 86, borderHits, removedAlphaNoise, model: 'built-in image_gen (identifier not exposed)', flags: ['Hat-only preservation failed after three attempts: body details, fins and jets were redrawn; visible body placement shifts upward relative to base.'] };
await fs.writeFile(path.join(root, 'tools/art/wave09-a-record.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record));
