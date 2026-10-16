import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const jobs=JSON.parse(await fs.readFile('tools/art/wave09-c-jobs.json','utf8'));
const records=JSON.parse(await fs.readFile('tools/art/wave09-c-records.json','utf8'));
const manifestPath='public/assets/manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const originals=structuredClone(manifest.assets);
for(const r of records){
 const dest=`public/assets/scenes/${r.id}.webp`;
 const meta=await sharp(r.raw).metadata();
 // Center crop corresponds to story_card's top/bottom screen cutoffs.
 await sharp(r.raw).resize(1536,864,{fit:'cover',position:'centre'}).removeAlpha().webp({quality:86}).toFile(dest);
 const bytes=(await fs.stat(dest)).size;
 assert(bytes<=500*1024,'Scene exceeds size budget');
 const shipped=await sharp(dest).metadata();assert.equal(shipped.width,1536);assert.equal(shipped.height,864);
 Object.assign(r,{sourceDimensions:[meta.width,meta.height],dimensions:[1536,864],bytes,quality:86,src:`scenes/${r.id}.webp`});
 manifest.assets[r.id]={...(manifest.assets[r.id]??{}),kind:'scene',wave:9,status:r.flags.length?'replace':'draft',base:{src:r.src,w:1536,h:864},source:{wave_file:'art/waves/wave-09-harbor-finish.md',model:'built-in image_gen (identifier not exposed)',date:'2026-10-14'}};
}
for(const [id,entry] of Object.entries(originals))if(!records.some(r=>r.id===id))assert.deepEqual(manifest.assets[id],entry,`Changed unrelated asset ${id}`);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile('tools/art/wave09-c-records.json',JSON.stringify(records,null,2)+'\n');
let review=await fs.readFile('art/review/wave-09.md','utf8');
assert(!review.includes('<!-- WAVE09 C START -->'),'Section C already appended');
let block='\n\n<!-- WAVE09 C START -->\n\n# Section C: story cards\n\nBuilt-in image generation on `claude/project-thread-ftrlee`. Both cards pending parent approval. Sections A and B review entries and Notes preserved.\n\n';
for(const r of records){const j=jobs.find(j=>j.id===r.id);block+=`## ${r.id} — ${r.flags.length?'flagged draft / replace':'draft'}\n\n![${r.id}](../../public/assets/${r.src})\n\n1536×864; **${r.bytes.toLocaleString('en-US')} bytes**, WebP quality 86, opaque. Attempt ${r.attempt} selected. Raw source ${r.sourceDimensions.join('×')} center-cropped to 16:9; raw outputs in \`art/raw/wave-09/${r.id}/\` (ignored).\n\n${r.qa}\n\nFlags: ${r.flags.length?r.flags.join(' '):'none observed in the exported card.'}\n\n<details><summary>Selected prompt and references</summary>\n\n\`\`\`text\n${r.prompt??j.prompt}\n\`\`\`\n\nReferences:\n${j.references.map(p=>'- `'+p+'`').join('\n')}\n\nThe tool accepts at most five input images. All references passed via the two separate anchors, a five-hero reference board, an asset-specific reference board, and the separate layout guide. Boards preserve source images and contain no added text.\n\n</details>\n\n`;}
block+='Review the story action and clothing, the gallery architecture beside [the ending card](../../public/assets/scenes/story_ch2_ending.webp), and narration overlap in the game. No game/runtime visual acceptance claimed.\n\n[All attempt prompts](../../tools/art/wave09-c-prompts.json) · [Processing and QA record](../../tools/art/wave09-c-records.json). Selected edits also include their previous raw attempt as the edit target and combine both anchors into a single board to respect the five-image tool limit.\n\nValidation: `npm test` — **268 passed, 0 failed**, without installing anything. No commit attempted and no push.\n';
await fs.writeFile('art/review/wave-09.md',review+block);
let wave=await fs.readFile('art/waves/wave-09-harbor-finish.md','utf8');
for(const r of records){wave=wave.replace(`| ☐ | \`${r.id}\``,`| ☑ | \`${r.id}\``);if(r.flags.length)wave+=`\n- 2026-10-14, Section C: ${r.id} flagged after ${r.attempt} attempts: ${r.flags.join(' ')} See art/review/wave-09.md.\n`;}
await fs.writeFile('art/waves/wave-09-harbor-finish.md',wave);
console.log(JSON.stringify(records.map(({id,dimensions,bytes,flags})=>({id,dimensions,bytes,flags})),null,2));
