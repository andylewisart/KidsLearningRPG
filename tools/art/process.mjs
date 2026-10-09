import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..');
const checkpoint=JSON.parse(await fs.readFile(path.join(root,'tools/art/checkpoint-all.json'),'utf8'));
const records=checkpoint.results;
const selected=checkpoint.selected;
const choices=new Map();
for(const r of records){
  const key=r.dest;
  const raw=path.join(root,'art/raw',r.kind==='anchor'?'wave-00':'wave-01',r.id,`${r.slot}-v${r.variant}.png`);
  await fs.mkdir(path.dirname(raw),{recursive:true});await fs.copyFile(r.path,raw);
  if(r.slot==='base'&&selected[r.id]&&r.path!==selected[r.id])continue;
  choices.set(key,r);
}
const manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/manifest.json'),'utf8'));
manifest.assets??={};
const report=[];
function bbox(data,w,h,alpha=true){let l=w,t=h,r=-1,b=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=(y*w+x)*4;const hit=alpha?data[k+3]>16:Math.max(data[k],data[k+1],data[k+2])>12;if(hit){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
 return r<0?null:{left:l,top:t,width:r-l+1,height:b-t+1};}
const transparent={r:0,g:0,b:0,alpha:0};
for(const j of choices.values()){
 const flags=[],notes=[];let raw=await sharp(j.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(j.kind==='ally'&&j.slot==='battle')flags.push('Visual review: some poses face forward or right; required uniform left-facing orientation is not fully met.');
 if(j.id==='boss_geode_titan'&&j.slot==='splash')flags.push('Visual review: scenery reads as coastal jungle rather than crystal canyon; check before approval.');
 if(j.id==='boss_geode_titan')flags.push('Visual review: confirm four legs, hammerhead skull, and six amber eyes; generated anatomy is not clearly faithful to all three requirements.');
 if(j.id==='titan_starter')flags.push('Visual review: head reads more as a long-snouted creature than a whale; confirm summon design before approval.');
 if(j.kind==='background')flags.push('Visual review: the hidden three-eyed monkey is not clearly identifiable in the scene.');
 const [wantedW,wantedH]=j.size.split('x').map(Number);
 let image;let descriptor={src:j.dest};
 if(j.grid){
  const [cols,rows]=j.grid,cw=wantedW/cols,ch=wantedH/rows;
  const normalized=await sharp(j.path).resize(wantedW,wantedH,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const cells=[];
  for(let i=0;i<cols*rows;i++){
   const cell=await sharp(normalized.data,{raw:normalized.info}).extract({left:i%cols*cw,top:Math.floor(i/cols)*ch,width:cw,height:ch}).raw().toBuffer();
   const box=bbox(cell,cw,ch,j.kind!=='fx');
   if(!box&&!(j.kind==='fx'&&i===15))flags.push(`frame ${i}: empty`);
   if(box&&(box.left<=1||box.top<=1||box.left+box.width>=cw-1||box.top+box.height>=ch-1))flags.push(`frame ${i}: source content touches cell edge`);
   cells.push({cell,box});
  }
  const standing=cells.filter((_,i)=>!(j.kind==='ally'&&j.slot==='battle'&&i===4)).map(c=>c.box?.height).filter(Boolean).sort((a,b)=>a-b);
  const median=standing[Math.floor(standing.length/2)]||ch*.8;
  const targetHeight=Math.min(ch*.86,...cells.filter((c,i)=>c.box&&!(j.kind==='ally'&&j.slot==='battle'&&i===4)).map(c=>cw*.86*c.box.height/c.box.width));
  const composite=[];
  for(let i=0;i<cells.length;i++){
   let {cell,box}=cells[i];if(!box)continue;
   let tile;
   if(j.kind==='fx'){
    if(i===15){notes.push('Final effect frame set to pure black for complete fade-out.');continue;}
    tile=await sharp(cell,{raw:{width:cw,height:ch,channels:4}}).flatten({background:'#000'}).resize(Math.round(cw*.9),Math.round(ch*.9)).png().toBuffer();
    composite.push({input:tile,left:i%cols*cw+Math.round(cw*.05),top:Math.floor(i/cols)*ch+Math.round(ch*.05)});continue;
   }
   const ko=j.kind==='ally'&&j.slot==='battle'&&i===4;
   const scale=ko||j.kind==='icons'?Math.min(cw*.86/box.width,ch*.86/box.height):targetHeight/box.height;
   const w=Math.max(1,Math.round(box.width*scale)),h=Math.max(1,Math.round(box.height*scale));
   let pipeline=sharp(cell,{raw:{width:cw,height:ch,channels:4}}).extract(box).resize(w,h,{fit:'fill'});
   if(j.mirror){pipeline=pipeline.flop();notes.push(`Frame ${i} mirrored to face left.`);}
   tile=await pipeline.png().toBuffer();
   const y=j.kind==='icons'||ko?Math.round((ch-h)/2):Math.round(ch*.94)-h;
   composite.push({input:tile,left:i%cols*cw+Math.round((cw-w)/2),top:Math.floor(i/cols)*ch+Math.max(0,y)});
  }
  image=sharp({create:{width:wantedW,height:wantedH,channels:4,background:j.kind==='fx'?{r:0,g:0,b:0,alpha:1}:transparent}}).composite(composite);
  descriptor={...descriptor,cell:[cw,ch],cols,rows};
  if(j.slot==='battle'){descriptor.frames=j.kind==='fiend'?{idle:0,attack:1,hurt:2,special:3}:{idle:0,attack:1,cast:2,hurt:3,ko:4,victory:5};descriptor.anchor=[cw/2,Math.round(ch*.94)];descriptor.facing=j.kind==='fiend'?'right':'left';}
  if(j.slot==='portraits')descriptor.frames={neutral:0,laughing:1,angry:2,shocked:3,smug:4,worried:5};
  if(j.kind==='fx')Object.assign(descriptor,{frames:16,fps:24,blend:'screen'});
  if(j.kind==='icons')descriptor.names=['fire','ice','lightning','water','earth','wind','light','shadow','silence','confusion','poison','sleep','haste','slow','protect','barrier'];
 }else if(j.transparent){
  const box=bbox(raw.data,raw.info.width,raw.info.height);
  if(!box)throw new Error(`Empty ${j.id}`);
  if(box.left<=1||box.top<=1||box.left+box.width>=raw.info.width-1||box.top+box.height>=raw.info.height-1)flags.push('Source subject touches canvas edge; possible cropping.');
  const margin=Math.round(Math.max(box.width,box.height)*.04);
  const padded=await sharp(raw.data,{raw:raw.info}).extract(box).extend({top:margin,bottom:margin,left:margin,right:margin,background:transparent}).png().toBuffer();
  image=sharp(padded).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true});
 }else{image=sharp(j.path).resize(wantedW,wantedH,{fit:'fill'}).flatten({background:'#000'});}
 let buffer;const budget=(j.kind==='icons'?300:j.kind==='fx'?400:j.grid?700:['background','anchor'].includes(j.kind)||j.slot==='splash'?500:400)*1024;
 const png=await image.png().toBuffer();let quality=86;
 for(;quality>=35;quality-=5){buffer=await sharp(png).webp({quality,alphaQuality:100,effort:5}).toBuffer();if(buffer.length<=budget)break;}
 if(buffer.length>budget)flags.push('File exceeds size budget.');
 const dest=path.join(root,'public/assets',j.dest);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,buffer);
 const meta=await sharp(buffer).metadata();
 if(!j.grid){descriptor.w=meta.width;descriptor.h=meta.height;if(j.transparent)descriptor.anchor=[Math.round(meta.width/2),Math.round(meta.height*.963)];}
 if(j.transparent){const decoded=await sharp(buffer).ensureAlpha().raw().toBuffer();let hits=0;for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++)if((x===0||y===0||x===meta.width-1||y===meta.height-1)&&decoded[(y*meta.width+x)*4+3]!==0)hits++;if(hits)flags.push(`${hits} border pixels are not transparent`);}
 const asset=manifest.assets[j.id]??={kind:j.kind,wave:j.kind==='anchor'?0:1,status:'draft'};
 Object.assign(asset,{kind:j.kind,wave:j.kind==='anchor'?0:1,status:'draft',source:{wave_file:`art/waves/${j.kind==='anchor'?'wave-00-anchors':'wave-01-first-battle'}.md`,model:'built-in image_gen (model identifier not exposed)',date:'2026-10-08'}});
 if(['attack','hurt','enraged'].includes(j.slot)){asset.poses??={};asset.poses[j.slot]=descriptor;}else asset[j.slot]=descriptor;
 const item={...j,flags,notes,bytes:buffer.length,w:meta.width,h:meta.height,quality};report.push(item);
 console.log(`${j.dest}: ${meta.width}x${meta.height}, ${Math.round(buffer.length/1024)} KB, ${flags.length} flags`);
}
await fs.writeFile(path.join(root,'public/assets/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.mkdir(path.join(root,'art/review'),{recursive:true});
await fs.writeFile(path.join(root,'art/review/qa.json'),JSON.stringify(report,null,2));
for(const wave of [0,1]){
 let md=`# Wave ${String(wave).padStart(2,'0')} art review\n\nGenerated with built-in image_gen on 2026-10-08. All assets remain draft. User authorized generation across both wave gates. Custom hero skipped because Hero Forge is blank.\n\n`;
 for(const r of report.filter(r=>(r.kind==='anchor'?0:1)===wave))md+=`## ${r.id} / ${r.slot} — draft\n\n![${r.id} ${r.slot}](../../public/assets/${r.dest})\n\n${r.w}×${r.h}; ${Math.round(r.bytes/1024)} KB. Candidate ${r.variant} selected.\n\n${r.flags.map(f=>'- FLAG: '+f).join('\n')}\n${r.notes.map(f=>'- '+f).join('\n')}\n\n<details><summary>Generation prompt</summary>\n\n\`\`\`text\n${r.prompt}\n\`\`\`\n\n</details>\n\n`;
 await fs.writeFile(path.join(root,`art/review/wave-${String(wave).padStart(2,'0')}.md`),md);
}
