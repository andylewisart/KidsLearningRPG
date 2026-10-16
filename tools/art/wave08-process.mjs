import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..');
const jobs=JSON.parse(await fs.readFile(path.join(root,'tools/art/wave08-jobs.json'),'utf8'));
const choices=JSON.parse(await fs.readFile(path.join(root,'tools/art/wave08-choices.json'),'utf8'));
const manifestPath=path.join(root,'public/assets/manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const transparent={r:0,g:0,b:0,alpha:0};
const report=[];
let review='# Wave 08: Gate A review\n\nSix new character bases, all **draft**. Two candidates per character; selected bases below, with comparisons and visual notes. Sections B–K wait for Gate A approval.\n\nGenerated on the chapter two branch `claude/project-thread-ftrlee` for PR #3. Raw inputs are 1024×1536; shipped sprites are trimmed, padded by 4%, and scaled to a maximum edge of 1024, following PRODUCTION.md.\n\n';
for(const job of jobs){
 const choice=choices[job.id];
 const input=path.join(root,`art/raw/wave-08/${job.id}/${choice.candidate}.png`);
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1,borderHits=0,removedAlphaNoise=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const offset=(y*info.width+x)*4+3;
  if(data[offset]>0&&data[offset]<=8){data[offset]=0;removedAlphaNoise++;}
  const alpha=data[offset];
  if((x===0||y===0||x===info.width-1||y===info.height-1)&&alpha!==0)borderHits++;
  if(alpha>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 }
 if(right<0||borderHits)throw new Error(`${job.id}: empty or nontransparent border (${borderHits})`);
 const width=right-left+1,height=bottom-top+1,margin=Math.round(Math.max(width,height)*.04);
 const padded=await sharp(data,{raw:info}).extract({left,top,width,height}).extend({top:margin,bottom:margin,left:margin,right:margin,background:transparent}).png().toBuffer();
 const png=await sharp(padded).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 let output,quality=86;
 do {output=await sharp(png).webp({quality,alphaQuality:100,effort:6}).toBuffer();if(output.length<=409600)break;quality-=3;}while(quality>=50);
 if(output.length>409600)throw new Error(`${job.id}: exceeds budget`);
 const dest=`characters/${job.id}/base.webp`;
 await fs.mkdir(path.dirname(path.join(root,'public/assets',dest)),{recursive:true});
 await fs.writeFile(path.join(root,'public/assets',dest),output);
 const meta=await sharp(output).metadata();
 const anchor=choice.sourceAnchor ? [Math.round((choice.sourceAnchor[0]-left+margin)*meta.width/(width+margin*2)),Math.round((choice.sourceAnchor[1]-top+margin)*meta.height/(height+margin*2))] : [Math.round(meta.width/2),Math.round(meta.height-margin*meta.height/(height+margin*2))];
 manifest.assets[job.id]={kind:job.id.startsWith('ally_')?'ally':'npc',wave:8,status:'draft',base:{src:dest,w:meta.width,h:meta.height,anchor},source:{wave_file:'art/waves/wave-08-harbor.md',model:'built-in image_gen (model identifier not exposed)',date:'2026-10-12'}};
 const tiles=[];
 for(const [index,n] of (choice.compare ?? [1,2]).entries()){
  const tile=await sharp(path.join(root,`art/raw/wave-08/${job.id}/${n}.png`)).resize(512,768,{fit:'contain',background:transparent}).png().toBuffer();
  tiles.push({input:tile,left:index*512,top:0});
 }
 const reviewDir=path.join(root,'art/review/wave-08');await fs.mkdir(reviewDir,{recursive:true});
 await sharp({create:{width:1024,height:768,channels:4,background:{r:45,g:49,b:58,alpha:1}}}).composite(tiles).flatten({background:'#2d313a'}).jpeg({quality:90}).toFile(path.join(reviewDir,`${job.id}-candidates.jpg`));
 report.push({id:job.id,selected:choice.candidate,sourceDimensions:[info.width,info.height],dimensions:[meta.width,meta.height],sourceBox:[left,top,right,bottom],anchor,bytes:output.length,quality,sourceBorderHits:borderHits,removedAlphaNoise,notes:choice.notes});
 review+=`## ${job.id} — draft\n\n![Selected base](../../public/assets/${dest})\n\n![Candidates ${(choice.compare ?? [1,2])[0]} (left) and ${(choice.compare ?? [1,2])[1]} (right)](wave-08/${job.id}-candidates.jpg)\n\n**Candidate ${choice.candidate} selected.** ${choice.notes}\n\n${meta.width}×${meta.height}; ${(output.length/1024).toFixed(1)} KiB; transparent.\n\n<details><summary>Prompt and references</summary>\n\n\`\`\`text\n${choice.selected_prompt ?? job.prompt}\n\`\`\`\n\nReferences: ${job.references.join(', ')}\n\n</details>\n\n`;
}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(root,'art/review/wave-08.md'),review);
await fs.writeFile(path.join(root,'art/review/wave-08-qa.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
