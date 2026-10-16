import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const dir='art/raw/wave-09/bg_lighthouse_rocks_fg';
const raw=`${dir}/attempt-2.png`;
const {data,info}=await sharp(raw).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(info.width,1536); assert.equal(info.height,1024);
let removed=0;
for(let i=0;i<data.length;i+=4) if(data[i+3]<=8){if(data[i+3])removed++;data.fill(0,i,i+4);}
// Move each complete side outward; only the actual canvas edge crops it.
// Preserve full vertical scale and every interior natural outline.
const translated=Buffer.alloc(data.length), shift=108;
for(let y=0;y<1024;y++)for(let x=0;x<1536;x++){
 const target=x<768?x-shift:x+shift;
 if(target>=0&&target<1536)data.copy(translated,(y*1536+target)*4,(y*1536+x)*4,(y*1536+x)*4+4);
}
let clearedCorners=0;
for(const i of [0,1535*4,1023*1536*4,(1024*1536-1)*4]){if(translated[i+3])clearedCorners++;translated.fill(0,i,i+4);}
const candidate=`${dir}/attempt-2.webp`;
await sharp(translated,{raw:info}).webp({quality:86,alphaQuality:100}).toFile(candidate);
const out=await sharp(candidate).ensureAlpha().raw().toBuffer();
let red=0,outside=0,visible=0; const edges={topLeft:0,topRight:0,bottomLeft:0,bottomRight:0};
for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)if(out[(y*1536+x)*4+3]){
 visible++;
 if(x>=123&&x<=1390&&y>=337&&y<=774)red++;
 // User-requested top/bottom attachment extends guide zones to canvas edges.
 const allowed=(y<=336&&(x<=416||x>=1244))||(y>=337&&(x<=111||x>=1401));
 if(!allowed)outside++;
 if(y===0)edges[x<768?'topLeft':'topRight']++;
 if(y===1023)edges[x<768?'bottomLeft':'bottomRight']++;
}
const corners=[out[3],out[1535*4+3],out[1023*1536*4+3],out[out.length-1]];
const record={id:'bg_lighthouse_rocks_fg',attempt:2,raw,dimensions:[1536,1024],bytes:(await fs.stat(candidate)).size,quality:86,alphaQuality:100,redAreaNonzeroAlpha:red,outsideRequestedZonesNonzeroAlpha:outside,corners,visiblePixels:visible,edgeAttachmentPixels:edges,removedNearInvisiblePixels:removed,outwardTranslationPixels:shift,clearedCornerPixels:clearedCorners,processing:'Full vertical scale retained; each complete side translated outward 108 px, cropped only at canvas edges. Alpha 1-8 noise removed; exact corner pixels cleared. No interior guide mask, shrinking or fading. Top/bottom extensions explicitly requested by user.',flags:[]};
await fs.writeFile('tools/art/wave09-e-lighthouse-attempt2-record.json',JSON.stringify(record,null,2)+'\n');
for(const [label,fg] of [['attempt1',`${dir}/selected-attempt-1.webp`],['attempt2',candidate]]){
 await sharp('public/assets/backgrounds/battle/bg_lighthouse_rocks.webp').composite([{input:fg}]).png().toFile(`${dir}/${label}-over-arena.png`);
}
await sharp(candidate).flatten({background:'#eeeeee'}).png().toFile(`${dir}/attempt-2-on-light.png`);
console.log(JSON.stringify(record,null,2));
assert.equal(red,0,'Red fighter area must be clear');
assert.equal(outside,0,'Content exceeds requested edge bands');
assert(corners.every(a=>a===0),'Corners must be transparent');
assert(Object.values(edges).every(n=>n>0),'All four groups must meet top/bottom canvas edges');
assert(record.bytes<=500*1024,'Background size budget');
