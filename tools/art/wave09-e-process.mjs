import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const id=process.argv[2], attempt=Number(process.argv[3]);
assert(['bg_harbor_docks_fg','bg_lighthouse_rocks_fg'].includes(id));
const arena=id.replace(/_fg$/,'');
const upperPockets=id==='bg_harbor_docks_fg';
const pocketDescription=upperPockets?'upper green pockets':'thin side green pockets';
const raw=`art/raw/wave-09/${id}/attempt-${attempt}.png`;
const {data,info}=await sharp(raw).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(info.width,1536);assert.equal(info.height,1024);
// Remove near-invisible generated alpha noise, then uniformly scale complete
// connected side clusters into the ${pocketDescription}. No guide-border mask.
let removed=0;
for(let i=0;i<data.length;i+=4)if(data[i+3]<=8){if(data[i+3])removed++;data.fill(0,i,i+4);}
const parts=[];
for(const side of [0,1]){
 let minX=1536,minY=1024,maxX=-1,maxY=-1;
 for(let y=0;y<1024;y++)for(let x=side*768;x<(side+1)*768;x++)if(data[(y*1536+x)*4+3]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 assert(maxX>=minX);assert(side===0?minX===0:maxX===1535,'Cluster must connect to side edge');
 const width=maxX-minX+1,height=maxY-minY+1;
 const factor=Math.min(185/height,(upperPockets?(side===0?390:265):95)/width);
 const w=Math.floor(width*factor),h=Math.floor(height*factor);
 const input=await sharp(data,{raw:info}).extract({left:minX,top:minY,width,height}).resize(w,h,{fit:'fill'}).png().toBuffer();
 parts.push({input,left:side===0?0:1536-w,top:upperPockets?145:580});
}
const dest=`public/assets/backgrounds/battle/${id}.webp`;
await sharp({create:{width:1536,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).webp({quality:86,alphaQuality:100}).toFile(dest);
const shipped=await sharp(dest).ensureAlpha().raw().toBuffer();
let red=0,outsideGreen=0,visible=0;
for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)if(shipped[(y*1536+x)*4+3]){
 visible++;
 if(x>=124&&x<=1389&&y>=338&&y<=773)red++;
 const green=(y>=123&&y<=337&&(x<=417||x>=1243))||(y>=338&&y<=806&&(x<=112||x>=1400));
 if(!green)outsideGreen++;
}
assert.equal(red,0);assert.equal(outsideGreen,0);
const corners=[shipped[3],shipped[(1535)*4+3],shipped[(1023*1536)*4+3],shipped[shipped.length-1]];assert(corners.every(a=>a===0));
const bytes=(await fs.stat(dest)).size;assert(bytes<=500*1024);
await fs.mkdir('art/review/wave-09',{recursive:true});
for(const [label,fg] of [['before',`art/raw/wave-09/${id}/before.webp`],['after',dest]])await sharp(`public/assets/backgrounds/battle/${arena}.webp`).composite([{input:fg}]).png().toFile(`art/review/wave-09/${id}-${label}.png`);
await sharp(dest).flatten({background:'#eeeeee'}).png().toFile(`art/raw/wave-09/${id}/on-light.png`);
const manifestPath='public/assets/manifest.json',manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')),original=structuredClone(manifest.assets);
manifest.assets[arena].fg={...manifest.assets[arena].fg,src:`backgrounds/battle/${id}.webp`,w:1536,h:1024};
manifest.assets[arena].sourceWave09={wave_file:'art/waves/wave-09-harbor-finish.md',model:'built-in image_gen (identifier not exposed)',date:'2026-10-14',part:'fg',status:'draft'};
for(const [key,value] of Object.entries(original))if(key!==arena)assert.deepEqual(manifest.assets[key],value);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const recordPath='tools/art/wave09-e-records.json';let records=[];try{records=JSON.parse(await fs.readFile(recordPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const record={id,attempt,raw,dimensions:[1536,1024],bytes,quality:86,alphaQuality:100,redAreaNonzeroAlpha:red,outsideGreenNonzeroAlpha:outsideGreen,corners,visiblePixels:visible,removedNearInvisiblePixels:removed,clusters:parts.map(({left,top})=>({left,top})),processing:'Complete outlined side clusters uniformly reduced and placed inside '+pocketDescription+'; no green-border clipping or fading. Alpha values 1-8 removed as near-invisible noise.',flags:[]};
records=records.filter(r=>r.id!==id);records.push(record);await fs.writeFile(recordPath,JSON.stringify(records,null,2)+'\n');
const job=JSON.parse(await fs.readFile('tools/art/wave09-e-jobs.json','utf8')).find(j=>j.id===id);
const prompts=JSON.parse(await fs.readFile('tools/art/wave09-e-prompts.json','utf8'));
const prompt=prompts.find(p=>p.id===id&&p.attempt===attempt).prompt;
const reviewPath='art/review/wave-09.md';let review=await fs.readFile(reviewPath,'utf8');assert(!review.includes(`<!-- WAVE09 E ${id} -->`));
review+=`\n\n<!-- WAVE09 E ${id} -->\n\n## Section E: ${id} — draft\n\n| Before, foreground over arena | After, foreground over arena |\n|---|---|\n| ![Before ${id}](wave-09/${id}-before.png) | ![After ${id}](wave-09/${id}-after.png) |\n\nShipped: [${id}.webp](../../public/assets/backgrounds/battle/${id}.webp), **1536×1024**, ${bytes.toLocaleString('en-US')} bytes, WebP quality 86 with alpha preserved. Selected attempt ${attempt}. Raw outputs: \`art/raw/wave-09/${id}/\` (ignored).\n\nComplete generated side groupings were uniformly reduced into the ${pocketDescription}, keeping their natural outlines and side-edge attachment; no clipping or fading at green borders. Near-invisible alpha noise (values 1–8) removed. Original arena and previous manifest provenance preserved.\n\nPixel QA on exported WebP: **0 nontransparent pixels in the red fighter rectangle** (x=124–1389, y=338–773), **0 outside all green pockets**, corner alpha **[0,0,0,0]**. Flags: none in the exported asset; visual parent review pending.\n\n<details><summary>Selected prompt and references</summary>\n\n\`\`\`text\n${prompt}\n\`\`\`\n\nReferences:\n${job.references.map(p=>'- `'+p+'`').join('\n')}\n\nBoth style anchors passed together as an unlabelled reference board to fit the five-reference limit.\n\n</details>\n\n[All attempt prompts](../../tools/art/wave09-e-prompts.json) · [Processing and alpha QA](../../tools/art/wave09-e-records.json). No game/runtime acceptance claimed.\n`;
await fs.writeFile(reviewPath,review);console.log(JSON.stringify(record,null,2));
