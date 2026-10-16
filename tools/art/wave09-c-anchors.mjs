import sharp from 'sharp';
const paths=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp'];
const inputs=await Promise.all(paths.map(async(p,i)=>({input:await sharp(p).resize(1536,1024,{fit:'contain'}).png().toBuffer(),left:0,top:i*1024})));
await sharp({create:{width:1536,height:2048,channels:3,background:'#777777'}}).composite(inputs).png().toFile('art/raw/wave-09/references/style-anchors.png');
