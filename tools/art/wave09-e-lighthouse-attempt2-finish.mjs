import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const id='bg_lighthouse_rocks_fg',dir=`art/raw/wave-09/${id}`;
const hash=async p=>crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
const harbor='public/assets/backgrounds/battle/bg_harbor_docks_fg.webp';
assert.equal(await hash(harbor),'2bb83595198a6c515704c2eec722066678cd8aa95e031e85f606773069242ea2');
const job=JSON.parse(await fs.readFile('tools/art/wave09-e-lighthouse-attempt2.json','utf8'));
const record=JSON.parse(await fs.readFile('tools/art/wave09-e-lighthouse-attempt2-record.json','utf8'));
assert.equal(record.redAreaNonzeroAlpha,0);assert.equal(record.outsideRequestedZonesNonzeroAlpha,0);
assert(record.corners.every(a=>a===0));assert(Object.values(record.edgeAttachmentPixels).every(n=>n>0));
// Save the accepted asset first, before review bookkeeping.
await fs.copyFile(`${dir}/attempt-2.webp`,`public/assets/backgrounds/battle/${id}.webp`);
await fs.copyFile(`art/review/wave-09/${id}-before.png`,`art/review/wave-09/${id}-original-before.png`);
await fs.copyFile(`${dir}/attempt1-over-arena.png`,`art/review/wave-09/${id}-before.png`);
await fs.copyFile(`${dir}/attempt2-over-arena.png`,`art/review/wave-09/${id}-after.png`);
const manifestPath='public/assets/manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')),original=structuredClone(manifest);
const entry=manifest.assets.bg_lighthouse_rocks;
entry.fg={...entry.fg,src:`backgrounds/battle/${id}.webp`,w:1536,h:1024};
entry.sourceWave09={...entry.sourceWave09,attempt:2,status:'draft'};
for(const [key,value] of Object.entries(original.assets))if(key!=='bg_lighthouse_rocks')assert.deepEqual(manifest.assets[key],value);
assert.deepEqual(entry.source,original.assets.bg_lighthouse_rocks.source);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const recordPath='tools/art/wave09-e-records.json',records=JSON.parse(await fs.readFile(recordPath,'utf8'));
const index=records.findIndex(r=>r.id===id);assert(index>=0);
record.supersededAttempts=[{...records[index],flags:['Parent flagged short floating clusters; superseded by attempt 2.']}];
records[index]=record;
await fs.writeFile(recordPath,JSON.stringify(records,null,2)+'\n');
const promptsPath='tools/art/wave09-e-prompts.json',prompts=JSON.parse(await fs.readFile(promptsPath,'utf8'));
assert(!prompts.some(p=>p.id===id&&p.attempt===2));prompts.push(job);
await fs.writeFile(promptsPath,JSON.stringify(prompts,null,2)+'\n');
const reviewPath='art/review/wave-09.md',review=await fs.readFile(reviewPath,'utf8');
const marker=`<!-- WAVE09 E ${id} -->`,start=review.indexOf(marker);
assert(start>=0);
const end=review.indexOf('\n\n\nSection E validation:',start);assert(end>=0);
const section=`${marker}

## Section E: ${id} — draft, attempt 2 selected

| Before: attempt 1 over arena | After: attempt 2 over arena |
|---|---|
| ![Attempt 1 ${id}](wave-09/${id}-before.png) | ![Attempt 2 ${id}](wave-09/${id}-after.png) |

Shipped: [${id}.webp](../../public/assets/backgrounds/battle/${id}.webp), **1536×1024**, ${record.bytes.toLocaleString('en-US')} bytes, WebP quality 86 with alpha preserved. **Attempt 2 of 3 selected** using built-in image_gen (model identifier not exposed). Raw: \`art/raw/wave-09/${id}/attempt-2.png\` (ignored). Attempt 3 was not used.

Attempt 1's small floating clusters are superseded. Attempt 2 has asymmetric tall wet stone pillars with kelp continuing off the bottom edge, and separate foliage hanging from the top edge. Sunset highlights from the left and blue reflections match the arena. The full vertical scale is preserved. Both complete side arrangements were translated outward **108 px** and cropped only by the actual canvas edges; no clipping or fading at an internal guide border, and no reduction into small clusters. Near-invisible alpha noise (1–8) removed; the four exact corner pixels were cleared. No guide lines, text, matte or visible halos found on visual inspection.

Exported WebP QA: **0 nontransparent pixels in the red fighter rectangle** (x=123–1390, y=337–774), **0 outside the requested lateral bands**, corner alpha **[0,0,0,0]**. Top attachment: left ${record.edgeAttachmentPixels.topLeft}, right ${record.edgeAttachmentPixels.topRight} visible pixels; bottom attachment: left ${record.edgeAttachmentPixels.bottomLeft}, right ${record.edgeAttachmentPixels.bottomRight}. The user's top/bottom edge-attachment request explicitly extends the green bands through y=0–122 and y=806–1023, so this is not a claim of zero alpha outside the original green rectangles. Empty central space remains transparent.

Raw-generation layout flag: initially too wide (22,535 visible pixels in red; bottom corners nonzero), corrected by outward translation and corner cleanup during processing. Exported asset flags: none; parent visual/in-game approval pending. [Original pre-wave foreground over arena](wave-09/${id}-original-before.png). Harbor foreground remains byte-for-byte unchanged, at its existing attempt 3.

<details><summary>Selected attempt 2 prompt and references</summary>

\`\`\`text
${job.prompt}
\`\`\`

References:
${job.references.map(p=>'- `'+p+'`').join('\n')}

Both style anchors passed together as the existing unlabelled reference board. Reference 3 was the shipped attempt-1 foreground, backed up at \`art/raw/wave-09/${id}/selected-attempt-1.webp\` before replacement.

</details>

[All attempt prompts](../../tools/art/wave09-e-prompts.json) · [Processing and alpha QA](../../tools/art/wave09-e-records.json) · [Attempt 2 processor](../../tools/art/wave09-e-lighthouse-attempt2.mjs). No game/runtime acceptance claimed.
`;
const tail=review.slice(end).replace('Both foregrounds remain draft pending parent visual approval.','Lighthouse attempt 2 is selected; harbor attempt 3 remains unchanged. Both foregrounds remain draft pending parent visual approval.');
await fs.writeFile(reviewPath,review.slice(0,start)+section+tail);
const wavePath='art/waves/wave-09-harbor-finish.md';let wave=await fs.readFile(wavePath,'utf8');
assert(wave.includes('### ☑ `bg_harbor_docks_fg.webp` and `bg_lighthouse_rocks_fg.webp`, repainted'));
wave+='\n- 2026-10-14, Section E lighthouse follow-up only: attempt 2 of 3 selected and shipped, superseding attempt 1’s parent-flagged floating clusters. Tall asymmetric wet-stone/kelp pillars run off the bottom and fronds hang from the top. Raw was too wide; complete sides translated outward 108 px without shrinking, clipping or fading at guide borders; near-invisible alpha noise and exact corner pixels cleared. Export QA: red rectangle alpha pixels 0, outside requested edge bands 0, corner alpha [0,0,0,0], all four groups attached at top/bottom edges. Requested top/bottom extensions go beyond the guide’s original green y ranges. Harbor foreground left byte-for-byte unchanged (3 attempts already used); no third lighthouse attempt. Before/after review updated; parent approval pending. 268 tests passed without installation; no commit attempted or push.\n';
await fs.writeFile(wavePath,wave);
assert.equal(await hash(harbor),'2bb83595198a6c515704c2eec722066678cd8aa95e031e85f606773069242ea2');
console.log('Selected lighthouse attempt 2 saved; review, manifest provenance, Notes and records updated; harbor SHA256 unchanged.');
