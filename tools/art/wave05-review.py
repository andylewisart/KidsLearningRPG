"""Build Wave05 review comparisons and record technical/visual QA separately."""
import json,statistics
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops,ImageOps
import numpy as np
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'art/review/wave-05';OUT.mkdir(parents=True,exist_ok=True)
rs=json.loads((ROOT/'tools/art/wave05-records.json').read_text(encoding='utf8'));selected=[r for r in rs if r.get('selected')]
lines=['# Wave05: Polish','', 'All assets are **draft**, pending parent and child review. Visual flags below remain separate from dimensions, file budgets and manifest checks.',''];qa=[]
def triptych(id,paths):
 images=[Image.open(p).convert('RGBA') if isinstance(p,Path) else p.convert('RGBA') for p in paths]
 canvas=Image.new('RGBA',(1536*len(images),1024),(25,30,39,255))
 for i,im in enumerate(images):
  fitted=ImageOps.contain(im,(1536,1024));canvas.alpha_composite(fitted,(i*1536+(1536-fitted.width)//2,(1024-fitted.height)//2))
 canvas.convert('RGB').save(OUT/(id+'.jpg'),quality=92)
 return 'wave-05/'+id+'.jpg'
for r in selected:
 p=ROOT/r['dest'];im=Image.open(p).convert('RGBA');assert list(im.size)==r['size'];budget=(700 if r['section']=='C' else 400 if r['section']=='D' else 500)*1024
 assert p.stat().st_size<=budget;flags=list(r.get('flags',[]));metrics={}
 lines+=['## '+r['id']+'/'+r['slot']+' — draft','', '![Selected image](../../'+r['dest']+')','']
 if r['section']=='A':
  overlay=Image.blend(im,Image.open(ROOT/'art/guides/story_card.png').convert('RGBA'),.35);overlay.convert('RGB').save(OUT/'story_ram-guide.jpg',quality=90)
  lines+=['![Story-card guide at35 percent](wave-05/story_ram-guide.jpg)','']
 if r['section']=='B':
  src=ROOT/'public/assets/anchors/key_art.webp';link=triptych('title-old-new',[src,p]);lines+=['Original key art left / edited title right:','', '![Title comparison]('+link+')','']
  old=np.array(Image.open(src).convert('RGB')).astype(int);new=np.array(im.convert('RGB')).astype(int);difference=np.abs(old-new).max(axis=2)
  for name,box in r.get('keepChecks',{}).items():
   x0,y0,x1,y1=box;values=difference[y0:y1,x0:x1];fraction=float((values>12).mean());metrics[name]=dict(mean=float(values.mean()),fractionOver12=fraction)
   if fraction>.01:flags.append(f'{name}: {fraction:.1%} of sampled protected pixels differ by more than12 RGB levels; exact invariance failed.')
 if r['section']=='C':
  src=ROOT/f"public/assets/characters/{r['id']}/battle.webp";link=triptych(r['id']+'-battle-field',[src,p]);lines+=['Battle sheet left / exploring sheet right (comparison resized to fit):','', '![Pose comparison]('+link+')','']
  if r.get('sourceEdgeFlags'):lines+=['Raw cell-edge fragments were flagged during processing and removed by cell cleanup. Composited final poses were inspected for full bodies, whole weapons, and clear gutters.','']
  alpha=im.getchannel('A');heights=[];boxes=[]
  for i in range(4):
   b=alpha.crop((i%2*512,i//2*512,(i%2+1)*512,(i//2+1)*512)).point(lambda a:255 if a>24 else 0).getbbox();assert b;boxes.append(b);heights.append(b[3]-b[1]);assert abs(b[3]-1-481)<=1
  median=statistics.median(heights)
  if any(abs(h/median-1)>.08 for h in heights):flags.append('Standing heights exceed ±8% of their median.')
  if abs(median/r['standingTarget']-1)>.08:flags.append('Field standing median differs from battle sheet by more than8%.')
  metrics.update(boxes=boxes,heights=heights,battleMedian=r['standingTarget'])
 if r['section']=='D':
  link=triptych('titan-attack-old-new',[OUT/'titan_starter_attack_old.webp',p]);lines+=['Old attack left / new attack right:','', '![Attack comparison]('+link+')','']
 if r['transparent']:
  a=im.getchannel('A');w,h=im.size
  assert all(a.crop(b).getextrema()[1]==0 for b in [(0,0,w,1),(0,h-1,w,h),(0,0,1,h),(w-1,0,w,h)]),'Nontransparent image border'
 if r['section']=='E':
  base=Image.open(ROOT/f"public/assets/scenes/explore/{r['id']}.webp").convert('RGB');far=im.convert('RGB');delta=np.abs(np.array(base).astype(int)-np.array(far).astype(int)).max(axis=2)
  heat=np.zeros((1024,1536,3),dtype=np.uint8);heat[:,:,0]=np.minimum(delta*4,255);heat[:,:,1]=np.minimum(delta,100)
  link=triptych(r['id']+'-far',[base,far,Image.fromarray(heat)]);lines+=['Scene left / distant view middle / amplified difference right:','', '![Far comparison]('+link+')','']
  for name,box in r.get('keepChecks',{}).items():
   x0,y0,x1,y1=box;values=delta[y0:y1,x0:x1];fraction=float((values>12).mean());metrics[name]=dict(mean=float(values.mean()),fractionOver12=fraction)
   if fraction>.001:flags.append(f'{name}: {fraction:.1%} of sampled kept pixels differ by more than12 RGB levels; exact preservation failed.')
 lines+=['**Review flags:** '+(' '.join(flags) if flags else 'Selected image passes the listed visual checks.'),'', '<details><summary>Exact generation prompt and references</summary>','', '```text',r['prompt'],'```','', 'References: '+', '.join('`'+p+'`' for p in r['refs']),'','</details>','']
 qa.append(dict(id=r['id'],slot=r['slot'],section=r['section'],size=r['size'],bytes=p.stat().st_size,flags=flags,metrics=metrics))
lines[4:4]=[f'{len(selected)} selected draft outputs. Stop at the final gate for parent and child review; unresolved flags are recorded in each entry.','', '**Acceptance limits:** title and far edits did not preserve all protected pixels after three attempts. The far layers are not ready for clean difference-based extraction. Titan body framing changed; Maren has a subtle singing read and slight foot/staff baseline offset. No game or style-anchor files were changed by this art pass.','']
(ROOT/'art/review/wave-05.md').write_text('\n'.join(line.rstrip() for line in '\n'.join(lines).splitlines())+'\n',encoding='utf8');(ROOT/'art/review/wave-05-qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf8')
print('Verified',len(qa),'Wave05 outputs;',sum(bool(r['flags']) for r in qa),'entries flagged.')
