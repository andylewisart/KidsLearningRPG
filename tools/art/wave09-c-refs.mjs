import fs from 'node:fs/promises';
import sharp from 'sharp';
const jobs=JSON.parse(await fs.readFile('tools/art/wave09-c-jobs.json','utf8'));
await fs.mkdir('art/raw/wave-09/references',{recursive:true});
async function board(paths,name,cols,w,h){
 const inputs=await Promise.all(paths.map(async (p,i)=>({input:await sharp(p).resize(w,h,{fit:'contain',background:'#777777'}).png().toBuffer(),left:(i%cols)*w,top:Math.floor(i/cols)*h})));
 const dest=`art/raw/wave-09/references/${name}.png`;
 await sharp({create:{width:w*cols,height:h*Math.ceil(paths.length/cols),channels:3,background:'#777777'}}).composite(inputs).png().toFile(dest);return dest;
}
for(const j of jobs){
 const heroes=await board(j.references.slice(2,7),'hero-bases',5,512,768);
 const scene=await board(j.references.slice(7,-1),j.id,2,768,512);
 j.toolReferences=[...j.references.slice(0,2),heroes,scene,j.references.at(-1)];
 j.prompt=j.prompt.replace('Images 3–7 are the approved character bases, in order:', 'Image 3 is a reference board of the five approved character bases from LEFT TO RIGHT:').replace('Use subsequent named scene/creature/Kit references','Image 4 is a scene/creature/Kit reference board in reading order; use these named references').replace('Image 8 is','Image 4 TOP LEFT is').replace('Image 9 is','Image 4 TOP RIGHT is').replace('Image 10 is','Image 4 BOTTOM LEFT is').replace('Image 11 is','Image 4 BOTTOM RIGHT is');
 j.prompt+='';
}
await fs.writeFile('tools/art/wave09-c-jobs.json',JSON.stringify(jobs,null,2)+'\n');
