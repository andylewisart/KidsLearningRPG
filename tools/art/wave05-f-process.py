"""Export Section F only and append its draft review without rebuilding earlier sections."""
import json,shutil,sys,re,runpy
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
job=json.loads((ROOT/'tools/art/wave05-f-job.json').read_text(encoding='utf8'))
records=json.loads((ROOT/'tools/art/wave05-f-records.json').read_text(encoding='utf8'))
chosen=int(sys.argv[1]);record=next(r for r in records if r['attempt']==chosen)
for r in records:
 raw=ROOT/'art/raw/wave-05/story_descent'/f"base-v{r['attempt']}.png"
 raw.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(r['path'],raw)
im=Image.open(record['path']).convert('RGB').resize((1536,1024),Image.Resampling.LANCZOS)
export=runpy.run_path(str(ROOT/'tools/art/wave04-process.py'))['export']
quality=export(im,job['dest'],budget=500*1024)
dest=ROOT/job['dest'];im=Image.open(dest).convert('RGBA')
assert im.size==(1536,1024) and im.getchannel('A').getextrema()==(255,255)
assert dest.stat().st_size<=500*1024
start=(0,80,1536,944);end=(57,122,1479,922)
boxes=record['subjectBoxes']
for name,(x0,y0,x1,y1) in boxes.items():
 assert end[0]<x0<x1<end[2] and end[1]<y0<y1<end[3],(name,'8% zoom crop')
out=ROOT/'art/review/wave-05'
pair=Image.new('RGB',(3072,864))
for i,box in enumerate([start,end]):pair.paste(im.crop(box).convert('RGB').resize((1536,864),Image.Resampling.LANCZOS),(1536*i,0))
pair.save(out/'story_descent-camera.jpg',quality=92)
overlay=Image.blend(im,Image.open(ROOT/'art/guides/story_card.png').convert('RGBA'),.35)
overlay.convert('RGB').save(out/'story_descent-guide.jpg',quality=90)
qa={'id':'story_descent','slot':'base','section':'F','size':[1536,1024],'bytes':dest.stat().st_size,'opaque':True,'quality':quality,'selectedAttempt':chosen,'subjectBoxes':boxes,'start16by9Crop':start,'end8PercentCrop':end,'cameraOrigin':[.5,.66],'visualChecks':record['visualChecks'],'flags':record.get('flags',[])}
(out/'story_descent-qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf8')
qaPath=ROOT/'art/review/wave-05-qa.json';qas=json.loads(qaPath.read_text(encoding='utf8'));qas=[r for r in qas if r['id']!='story_descent']+[qa];qaPath.write_text(json.dumps(qas,indent=2)+'\n',encoding='utf8')
mp=ROOT/'public/assets/manifest.json';m=json.loads(mp.read_text(encoding='utf8'));m['assets']['story_descent']={'kind':'scene','wave':5,'status':'draft','base':{'src':'scenes/story_descent.webp','w':1536,'h':1024},'source':{'wave_file':'art/waves/wave-05-polish.md','model':'built-in image_gen (identifier not exposed)','date':'2026-10-10'}}
mp.write_text(json.dumps(m,indent=2)+'\n',encoding='utf8')
page=ROOT/'art/review/wave-05.md';text=page.read_text(encoding='utf8')
heading='## story_descent/base — Section F, draft'
if heading in text:text=text[:text.index(heading)].rstrip()+'\n'
text=text.replace('8 selected draft outputs.','9 selected draft outputs.')
block=[heading,'','![The rope descent](../../public/assets/scenes/story_descent.webp)','','16:9 start left / final8% zoom right (camera origin50%66%):','','![Camera framing](wave-05/story_descent-camera.jpg)','','Story-card guide at35% opacity (this card has no narration box):','','![Construction guide overlay](wave-05/story_descent-guide.jpg)','','**Review:** '+(' '.join(qa['flags']) if qa['flags'] else 'Four distinct travelers, one of each; one shared brass pulley; continuous rope to the grotto; secure, joyful riding. No visible guide marks or text. All travelers and the cave mouth remain inside the16:9 view at8% zoom.'),'','Selected attempt'+str(chosen)+'. Technical QA:1536×1024, opaque, '+str(qa['bytes'])+' bytes. [Detailed QA](wave-05/story_descent-qa.json).','', 'Attempt notes: '+record['attemptNotes'],'','<details><summary>Exact prompt and references — built-in image generation</summary>','','```text',record['prompt'].rstrip(),'```','','Original references in requested order: '+', '.join('`'+r+'`' for r in job['originalRefs']), '', 'Tool inputs (style/traveler references grouped into boards): '+', '.join('`'+r+'`' for r in record['refs']),'','</details>','']
page.write_text('\n'.join(line.rstrip() for line in (text.rstrip()+'\n\n'+'\n'.join(block)).splitlines())+'\n',encoding='utf8')
print(json.dumps(qa,indent=2))

