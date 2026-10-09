import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..');
const records=JSON.parse(await fs.readFile(path.join(root,'tools/art/wave02-records.json'),'utf8'));
const choices=new Map();
for(const r of records){
 const raw=path.join(root,'art/raw/wave-02',r.id,`${r.slot}-v${r.attempt}.png`);
 await fs.mkdir(path.dirname(raw),{recursive:true});
 try{await fs.copyFile(r.path,raw);}catch{await fs.access(raw);}
 if(r.selected!==false)choices.set(r.dest,{...r,path:raw});
}
const manifestPath=path.join(root,'public/assets/manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const report=[];const alpha0={r:0,g:0,b:0,alpha:0};
function bbox(data,w,h,alpha=true){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(alpha?data[k+3]>16:Math.max(data[k],data[k+1],data[k+2])>12){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}}return r<0?null:{left:l,top:t,width:r-l+1,height:b-t+1};}
for(const j of choices.values()){
 const flags=[...(j.visualFlags||[])],notes=[...(j.visualNotes||[])];
 const [W,H]=j.size.split('x').map(Number);
 let image,desc={src:j.dest};
 if(j.grid){
  const normalized=await sharp(j.path).resize(W,H,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const [cols,rows]=j.grid,cw=W/cols,ch=H/rows,composite=[];
  for(let i=0;i<cols*rows;i++){
   const cell=await sharp(normalized.data,{raw:normalized.info}).extract({left:i%cols*cw,top:Math.floor(i/cols)*ch,width:cw,height:ch}).raw().toBuffer();
   const box=bbox(cell,cw,ch,j.kind!=='fx');
   if(!box&&!(j.kind==='fx'&&i===15))flags.push(`frame ${i}: empty`);
   if(box&&(box.left<=1||box.top<=1||box.left+box.width>=cw-1||box.top+box.height>=ch-1))flags.push(`frame ${i}: source touches cell edge`);
   if(!box)continue;
   if(j.kind==='fx'){
    if(i===15){notes.push('Final effect frame set to black for complete fade-out.');continue;}
    const tile=await sharp(cell,{raw:{width:cw,height:ch,channels:4}}).flatten({background:'#000'}).resize(230,230).png().toBuffer();
    composite.push({input:tile,left:i%cols*cw+13,top:Math.floor(i/cols)*ch+13});
   }else{
    const tile=await sharp(cell,{raw:{width:cw,height:ch,channels:4}}).extract(box).resize(210,210,{fit:'inside'}).png().toBuffer();const m=await sharp(tile).metadata();
    composite.push({input:tile,left:i%cols*cw+Math.round((cw-m.width)/2),top:Math.floor(i/cols)*ch+Math.round((ch-m.height)/2)});
   }
  }
  image=sharp({create:{width:W,height:H,channels:4,background:j.kind==='fx'?{r:0,g:0,b:0,alpha:1}:alpha0}}).composite(composite);
  Object.assign(desc,{cell:[cw,ch],cols,rows});
  if(j.kind==='fx')Object.assign(desc,{frames:16,fps:24,blend:'screen'});else desc.names=j.names;
 }else if(j.mode==='scene')image=sharp(j.path).resize(W,H,{fit:'fill'}).flatten({background:'#000'});
 else if(['frame','foreground','portrait'].includes(j.mode)){
  const r=await sharp(j.path).resize(W,H,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(j.mode==='frame'){
   let n=0;for(let y=96;y<928;y++)for(let x=96;x<928;x++){const k=(y*W+x)*4;if(r.data[k+3]>16)n++;}
   if(n)flags.push(`${n} source pixels intrude into the 96px frame's transparent center after regeneration; small ornaments require review.`);
   for(let y=96;y<928;y++)for(let x=96;x<928;x++)r.data[(y*W+x)*4+3]=0;
   for(const p of [0,W-1,(H-1)*W,W*H-1])r.data[p*4+3]=0;
   notes.push('Center masked to exact alpha zero at x/y 96..927; full 1024px canvas retained for 9-slicing.');
  }
  if(j.mode==='foreground'){
   let n=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const ok=y>=123&&y<=338&&(x<=417||x>=1243)||y>=338&&y<=806&&(x<=112||x>=1400);
    const k=(y*W+x)*4;if(!ok){if(r.data[k+3]>16)n++;r.data[k+3]=0;}else{
      const regions=[[0,123,417,338],[1243,123,1536,338],[0,123,112,806],[1400,123,1536,806]];
      const fade=Math.max(0,...regions.map(([l,t,rr,b])=>x>=l&&x<=rr&&y>=t&&y<=b?Math.min(1,(x-l)/24,(rr-x)/24,(y-t)/48,(b-y)/48):0));
     r.data[k+3]=Math.round(r.data[k+3]*fade);
    }
   }
   if(n)notes.push(`${n} pixels outside guide-safe foreground regions masked to transparent; fixed canvas and fighter clearance preserved.`);
  }
  if(j.mode==='portrait'&&j.faceCenter){
   const side=Math.round(W*j.portraitScale);
   const scaled=await sharp(r.data,{raw:r.info}).resize(side,side).png().toBuffer();
   const l=Math.round(512-j.faceCenter[0]*side),t=Math.round(400-j.faceCenter[1]*side);
   const cropL=Math.max(0,-l),cropT=Math.max(0,-t);
   const tile=await sharp(scaled).extract({left:cropL,top:cropT,width:Math.min(side-cropL,W-Math.max(0,l)),height:Math.min(side-cropT,H-Math.max(0,t))}).png().toBuffer();
   image=sharp({create:{width:W,height:H,channels:4,background:alpha0}}).composite([{input:tile,left:Math.max(0,l),top:Math.max(0,t)}]);
   notes.push(`Guide registration: scale ${j.portraitScale}, offset (${l}, ${t}); facial center mapped to (512,400).`);
  }else image=sharp(r.data,{raw:r.info});
 }else{
  const r=await sharp(j.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});const box=bbox(r.data,r.info.width,r.info.height);
  if(!box)throw Error('Empty '+j.id);
  if((box.left<=1||box.top<=1||box.left+box.width>=r.info.width-1||box.top+box.height>=r.info.height-1)&&!(j.id==='titan_starter'&&j.slot==='attack'))flags.push('Source subject reaches canvas edge; review for cropping.');
  const margin=Math.round(Math.max(box.width,box.height)*.04);
  const padded=await sharp(r.data,{raw:r.info}).extract(box).extend({top:margin,bottom:margin,left:margin,right:margin,background:alpha0}).png().toBuffer();
  image=sharp(padded).resize(1024,1024,{fit:'inside',withoutEnlargement:true});
 }
 const png=await image.png().toBuffer();
 const budget=(j.mode==='icons'?300:j.kind==='fx'?400:j.grid?700:j.mode==='scene'||j.mode==='foreground'?500:400)*1024;
 let buffer,quality=86;for(;quality>=35;quality-=5){buffer=await sharp(png).webp({quality,alphaQuality:100,effort:5}).toBuffer();if(buffer.length<=budget)break;}
 if(buffer.length>budget)flags.push('Size budget exceeded.');
 const dest=path.join(root,'public/assets',j.dest);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,buffer);
 const meta=await sharp(buffer).metadata();if(!j.grid)Object.assign(desc,{w:meta.width,h:meta.height});
 if(j.mode==='single'&&j.transparent)desc.anchor=[Math.round(meta.width/2),Math.round(meta.height*.963)];
 const asset=manifest.assets[j.id]??={kind:j.kind,wave:2,status:'draft'};
 if(j.slot==='roar'||j.slot==='attack'){asset.poses??={};asset.poses[j.slot]=desc;}else asset[j.slot]=desc;
 asset.status='draft';asset.sourceWave02={wave_file:'art/waves/wave-02-ui-and-depth.md',model:'built-in image_gen (model identifier not exposed)',date:'2026-10-08'};
 if(asset.wave===2)asset.source=asset.sourceWave02;
 if(j.id==='ui_frame')asset.slice=96;
 if(j.id==='bg_shipwreck_cove')asset.floorEdge=.6;
 if(j.id==='ui_cursor'){
  const r=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let tipX=-1,ys=[];
  for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++)if(r.data[(y*meta.width+x)*4+3]>128){if(x>tipX){tipX=x;ys=[y];}else if(x===tipX)ys.push(y);}
  asset.hotspot=[tipX,Math.round(ys.reduce((a,b)=>a+b,0)/ys.length)];notes.push('Hotspot measured at the rightmost solid pointer tip.');
 }
 if(j.transparent){
  const r=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});const corners=[0,meta.width-1,(meta.height-1)*meta.width,meta.height*meta.width-1];if(corners.some(i=>r.data[i*4+3]!==0))flags.push('Nontransparent canvas corner.');
 }
 report.push({...j,path:undefined,raw:`art/raw/wave-02/${j.id}/${j.slot}-v${j.attempt}.png`,w:meta.width,h:meta.height,bytes:buffer.length,quality,flags,notes});
 console.log(`${j.dest}: ${meta.width}x${meta.height}, ${Math.round(buffer.length/1024)} KB, ${flags.length} flags`);
}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(root,'art/review/wave-02-qa.json'),JSON.stringify(report,null,2));
