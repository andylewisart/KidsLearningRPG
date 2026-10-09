import fs from 'node:fs/promises';
import sharp from 'sharp';
const [source,dest,budgetText]=process.argv.slice(2);
const budget=Number(budgetText);
let buffer,quality;
for(quality=86;quality>=31;quality-=5){
 buffer=await sharp(source).webp({quality,alphaQuality:100,effort:5}).toBuffer();
 if(buffer.length<=budget)break;
}
await fs.writeFile(dest,buffer);
process.stdout.write(String(quality));
