"""Export the selected E2 revision, preserve its history, and rebuild canyon review only."""
import json, shutil, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
job=json.loads((ROOT/'tools/art/wave05-e2-job.json').read_text(encoding='utf8'))
attempts=json.loads((ROOT/'tools/art/wave05-e2-records.json').read_text(encoding='utf8'))
chosen=int(sys.argv[1]); record=next(a for a in attempts if a['passAttempt']==chosen)
for r in attempts:
 raw=ROOT/'art/raw/wave-05/scene_canyon'/f"far-v{r['attempt']}.png"
 raw.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(r['path'],raw)
im=Image.open(record['path']).convert('RGB').resize((1536,1024),Image.Resampling.LANCZOS)
dest=ROOT/job['dest']
for quality in [86,82,78,74,70,65,60]:
 im.save(dest,'WEBP',quality=quality,method=6)
 if dest.stat().st_size<=500*1024:break
assert dest.stat().st_size<=500*1024
im=Image.open(dest).convert('RGB')
assert im.size==(1536,1024)
base=Image.open(ROOT/'public/assets/scenes/explore/scene_canyon.webp').convert('RGB')
delta=np.abs(np.array(base).astype(int)-np.array(im).astype(int)).max(axis=2)
checks={'sky':[700,60,950,230], 'upperLeftCliff':[200,150,370,300], 'upperRightCliff':[1150,180,1300,320], 'floatingRock':[575,45,685,185]}
near={'post':[558,450,594,510], 'rope':[600,470,755,493], 'nearEdge':[518,500,625,590], 'farRim':[760,490,825,596]}
def metrics(rects):
 result={}
 for name,(x0,y0,x1,y1) in rects.items():
  values=delta[y0:y1,x0:x1];result[name]={'mean':float(values.mean()),'fractionOver12':float((values>12).mean()),'fractionBrightHeat':float((values>=40).mean())}
 return result
kept=metrics(checks);changed=metrics(near)
flags=list(record.get('flags',[]))
for name,v in kept.items():
 if v['fractionOver12']>.001:flags.append(f"{name}: {v['fractionOver12']:.1%} of sampled protected pixels differ by more than12 RGB levels; exact preservation remains unresolved.")
out=ROOT/'art/review/wave-05'
heat=np.zeros((1024,1536,3),dtype=np.uint8);heat[:,:,0]=np.minimum(delta*4,255);heat[:,:,1]=np.minimum(delta,100)
canvas=Image.new('RGB',(4608,1024))
for i,panel in enumerate([base,im,Image.fromarray(heat)]):canvas.paste(panel,(1536*i,0))
canvas.save(out/'scene_canyon-far.jpg',quality=92)
old=Image.open(out/'scene_canyon_far_old.webp').convert('RGB')
pair=Image.new('RGB',(3072,1024));pair.paste(old,(0,0));pair.paste(im,(1536,0));pair.save(out/'scene_canyon-e2-old-new.jpg',quality=92)
qa={'id':'scene_canyon','slot':'far','section':'E2','size':[1536,1024],'bytes':dest.stat().st_size,'quality':quality,'flags':flags,'metrics':kept,'chasmDifference':changed,'openMistBox':[380,380,850,610],'selectedPassAttempt':chosen,'oldFarSHA256':hashlib.sha256((out/'scene_canyon_far_old.webp').read_bytes()).hexdigest()}
(out/'scene_canyon-e2-qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf8')
qaPath=ROOT/'art/review/wave-05-qa.json';allQA=json.loads(qaPath.read_text(encoding='utf8'));allQA=[qa if a['id']=='scene_canyon' and a['slot']=='far' else a for a in allQA];qaPath.write_text(json.dumps(allQA,indent=2)+'\n',encoding='utf8')
recordsPath=ROOT/'tools/art/wave05-records.json';records=[r for r in json.loads(recordsPath.read_text(encoding='utf8')) if r.get('revision')!='E2']
for r in records:
 if r['id']=='scene_canyon' and r['slot']=='far':r['selected']=False
known={(r['id'],r['slot'],r['attempt']) for r in records}
for r in attempts:
 r['selected']=r['passAttempt']==chosen;r['keepChecks']=checks
 if (r['id'],r['slot'],r['attempt']) not in known:records.append(r)
recordsPath.write_text(json.dumps(records,indent=2)+'\n',encoding='utf8')
mp=ROOT/'public/assets/manifest.json';manifest=json.loads(mp.read_text(encoding='utf8'))
e=manifest['assets']['scene_canyon'];e['status']='draft';e['far']={'src':'scenes/explore/scene_canyon_far.webp','w':1536,'h':1024};e['sourceWave05E2']={'wave_file':'art/waves/wave-05-polish.md','model':'built-in image_gen (identifier not exposed)','date':'2026-10-09'}
mp.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
review=ROOT/'art/review/wave-05.md';text=review.read_text(encoding='utf8');start=text.index('## scene_canyon/far');end=text.find('\n## ',start+1);end=len(text) if end<0 else end
block=['## scene_canyon/far — Section E2, draft','','![Revised distant view](../../public/assets/scenes/explore/scene_canyon_far.webp)','','Scene / new far / amplified difference:','','![Canyon difference](wave-05/scene_canyon-far.jpg)','','Previous far left / Section E2 right:','','![Old and new far](wave-05/scene_canyon-e2-old-new.jpg)','','[Preserved old far picture](wave-05/scene_canyon_far_old.webp)','','The chasm target is x380–850,y380–610: open mist and clouds, with no replacement cliffs, ruins, posts, rope or waterfalls. Check that the post, rope and both chasm edges are bright in the difference, while upper scenery remains dark.','','**Review flags:** '+(' '.join(flags) if flags else 'Listed visual and technical checks pass.'),'','Technical QA:1536×1024, opaque, '+str(dest.stat().st_size)+' bytes. [Region difference metrics](wave-05/scene_canyon-e2-qa.json).','','<details><summary>Exact E2 prompt and references</summary>','','```text',record['prompt'].rstrip(),'```','','References: '+', '.join('`'+p+'`' for p in record['refs']),'','</details>','']
text=text[:start]+'\n'.join(block)+'\n'+text[end:]
review.write_text('\n'.join(line.rstrip() for line in text.splitlines())+'\n',encoding='utf8')
print(json.dumps(qa,indent=2))

