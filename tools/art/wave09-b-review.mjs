import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const record = JSON.parse(await fs.readFile(path.join(root, 'tools/art/wave09-b-record.json'), 'utf8'));
const prompts = JSON.parse(await fs.readFile(path.join(root, 'tools/art/wave09-b-prompts.json'), 'utf8'));
const job = JSON.parse(await fs.readFile(path.join(root, 'tools/art/wave09-b-job.json'), 'utf8'));
const extraFlag = 'Hurt body reads larger after equal-height sheet normalization because its wings are folded.';
if (!record.flags.includes(extraFlag)) record.flags.push(extraFlag);
await fs.writeFile(path.join(root, 'tools/art/wave09-b-record.json'), JSON.stringify(record, null, 2) + '\n');
const reviewPath = path.join(root, 'art/review/wave-09.md');
let review = await fs.readFile(reviewPath, 'utf8');
const marker = '\n<!-- WAVE09 B START -->';
if (review.includes(marker)) review = review.split(marker)[0];
const block = [
 marker,
 '# Section B: baby Wick Moth review',
 'Section B only, on `claude/project-thread-ftrlee`. Built-in image generation; **flagged draft / replace**, pending parent review. Section A entries and Notes retained; Sections C–E outside this run.',
 '## pet_moth_1 — battle.webp — flagged',
 '![Baby Wick Moth sheet](../../public/assets/characters/pet_moth_1/battle.webp)',
 '| Species reference | Baby sheet |',
 '|---|---|',
 '| ![Giant Wick Moth](../../public/assets/fiends/fiend_wick_moth/base.webp) | ![Baby Wick Moth](../../public/assets/characters/pet_moth_1/battle.webp) |',
 '![Light-background edge check](wave-09/pet_moth_1-light.jpg)',
 '![Dark-background edge check](wave-09/pet_moth_1-dark.jpg)',
 '**Attempt 3 selected, of 3.** Round, fluffy cream body, warm internal glow, dark shiny eyes, old amber/teal lantern-glass wings and shorter dusty antennae. No crystal heart, jewelry, scenery, text or guide marks. Poses in reading order: idle, act (glowing dust), happy, hurt. All face right; wings overlap in the three-quarter views. Full poses and dust remain inside their cells.',
 '**Flags:**\n' + record.flags.map(f => '- ' + f).join('\n'),
 record.dimensions.join('×') + '; **' + record.bytes.toLocaleString('en-US') + ' bytes (' + (record.bytes / 1024).toFixed(1) + ' KiB)**. 2×2, 512×512 cells. WebP quality 86, alpha retained. Manifest shaped like pet_raptor_1, with wave 9 provenance and status replace; every prior manifest entry preserved.',
 'QA: all four corner alphas = 0; outer border and all cell borders fully transparent. No empty cells, source edge contact or cell bleed. Each frame centered horizontally with bottom baseline 481; content heights 333 px. Alpha values 1–8 cleared (' + record.alphaNoiseRemoved + ' pixels) before slicing to remove generation noise. Inspected on light and dark backgrounds: no visible matte fringe, intended act dust retained, no visible neighboring-frame strays. The existing Python stray-check tool could not run because Pillow is unavailable; no software installed. Hurt body-scale limitation noted above.',
 'Generator canvas: 1254×1254. Equal 627×627 source cells sliced and rebuilt at 1024×1024. Raw attempts: `art/raw/wave-09/pet_moth_1/attempt-{1,2,3}.png` (ignored).',
 'Processing: `node tools/art/wave09-b-process.mjs`. [QA record](../../tools/art/wave09-b-record.json). [All attempt prompts](../../tools/art/wave09-b-prompts.json).',
 '<details><summary>Selected prompt and references</summary>',
 '```text\n' + prompts.attempt3 + '\n```',
 'References, in order:\n' + job.references.map(p => '- `' + p + '`').join('\n'),
 '</details>',
 'Validation: `npm test` — **268 passed, 0 failed**, without installing anything. No commit attempted and no push. Review the flagged wing proportions, hurt glow and body scale before approval.'
 ].join('\n\n') + '\n';
await fs.writeFile(reviewPath, review + block);
const wavePath = path.join(root, 'art/waves/wave-09-harbor-finish.md');
let wave = await fs.readFile(wavePath, 'utf8');
wave = wave.replace('### ☐ `pet_moth_1`', '### ☑ `pet_moth_1`');
const note = '- 2026-10-14, Section B only: pet_moth_1/battle.webp exported and registered as flagged draft/replace, attempt 3 of 3, 1024×1024, 202,842 bytes. Wings remain larger than the tiny-wing baby brief; hurt glow only slightly dimmed, and hurt body reads larger after equal-height normalization. Transparent corner/cell-border QA passed; 268 tests passed. Section A preserved; Sections C–E outside this run. See art/review/wave-09.md.';
if (!wave.includes(note)) wave += '\n' + note + '\n';
await fs.writeFile(wavePath, wave);
