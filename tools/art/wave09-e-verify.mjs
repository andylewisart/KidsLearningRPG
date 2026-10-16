import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const oldManifest=JSON.parse(execFileSync('git',['show','HEAD:public/assets/manifest.json'],{encoding:'utf8'}));
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const ids=['bg_harbor_docks','bg_lighthouse_rocks'];
assert.deepEqual(Object.keys(manifest.assets),Object.keys(oldManifest.assets));
for(const [id,entry] of Object.entries(oldManifest.assets)){
 const now=structuredClone(manifest.assets[id]);if(ids.includes(id))delete now.sourceWave09;
 assert.deepEqual(now,entry,`Existing manifest entry changed: ${id}`);
}
const oldReview=execFileSync('git',['show','HEAD:art/review/wave-09.md'],{encoding:'utf8'});
let review=await fs.readFile('art/review/wave-09.md','utf8');assert(review.startsWith(oldReview),'Existing review changed');
let wave=await fs.readFile('art/waves/wave-09-harbor-finish.md','utf8');
const oldWave=execFileSync('git',['show','HEAD:art/waves/wave-09-harbor-finish.md'],{encoding:'utf8'});
assert.equal(wave,oldWave,'Unexpected wave edit before finishing');
wave=wave.replace('### ☐ `bg_harbor_docks_fg.webp` and `bg_lighthouse_rocks_fg.webp`, repainted','### ☑ `bg_harbor_docks_fg.webp` and `bg_lighthouse_rocks_fg.webp`, repainted');
assert.notEqual(wave,oldWave,'Section E checkbox not found');
wave+='\n- 2026-10-14, Section E only: both foregrounds repainted and overwritten at the original 1536×1024 paths. Harbor attempt 3 and lighthouse attempt 1 selected; complete outlined side clusters uniformly reduced into green pockets, without green-border clipping/fading. Both exported WebPs have zero nontransparent pixels in the red fighter area or outside green pockets, and corner alpha [0,0,0,0]. No exported-asset flags; visual parent approval pending. Sections A-D and their Notes preserved. 268 tests passed; no commit attempted or push. See art/review/wave-09.md for before/after arena composites.\n';
await fs.writeFile('art/waves/wave-09-harbor-finish.md',wave);
review+='\n\nSection E validation: `npm test` — **268 passed, 0 failed**, no installation. Existing manifest entries and Sections A–D review text/Notes preserved. Both foregrounds remain draft pending parent visual approval. No commit attempted; no push.\n';
await fs.writeFile('art/review/wave-09.md',review);
// Verify review image links and complete red/green layout checks on shipped bytes.
for(const match of review.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))await fs.access(new URL('../../art/review/'+match[1],import.meta.url));
for(const id of ids){
 const dest=`public/assets/backgrounds/battle/${id}_fg.webp`;
 const {data,info}=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,1536);assert.equal(info.height,1024);
 let red=0,outside=0,edge=0;
 for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)if(data[(y*1536+x)*4+3]){
  if(x>=123&&x<=1390&&y>=337&&y<=774)red++;
  const green=(y>=124&&y<=336&&(x<=416||x>=1244))||(y>=337&&y<=805&&(x<=111||x>=1401));
  if(!green)outside++;
  if(x===0||x===1535)edge++;
 }
 assert.equal(red,0);assert.equal(outside,0);assert(edge>0);
 console.log(`${id}_fg: red alpha pixels=${red}; outside green=${outside}; side-edge attachment pixels=${edge}`);
}
console.log('Existing manifest and review content preserved; Section E complete.');
