import json,shutil,statistics,subprocess
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
records=json.loads((root/'tools/art/wave03-records.json').read_text(encoding='utf8'))
manifestpath=root/'public/assets/manifest.json'
manifest=json.loads(manifestpath.read_text(encoding='utf8'))
choices={}
for r in records:
    raw=root/'art/raw/wave-03'/r['id']/f"{r['slot']}-v{r['attempt']}.png"
    raw.parent.mkdir(parents=True,exist_ok=True)
    if Path(r['path']).exists():shutil.copyfile(r['path'],raw)
    if r.get('selected',True):choices[r['dest']]=dict(r,raw=str(raw.relative_to(root)))
qa=[]
previouspath=root/'art/review/wave-03-qa.json'
previous={r['dest']:r for r in json.loads(previouspath.read_text(encoding='utf8'))} if previouspath.exists() else {}
def box(im):return im.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox()
for r in choices.values():
    old=previous.get(r['dest'])
    if old and old['path']==r['path'] and old['prompt']==r['prompt'] and old.get('visualFlags')==r.get('visualFlags') and (root/'public/assets'/r['dest']).exists():
        old['guideCheck']=r.get('guideCheck',old.get('guideCheck','pending'))
        qa.append(old)
        continue
    im=Image.open(root/r['raw']).convert('RGBA')
    flags=list(r.get('visualFlags',[]));notes=list(r.get('visualNotes',[]))
    desc={'src':r['dest']}
    W,H=map(int,r['size'].split('x'))
    if r['grid']:
        im=im.resize((W,H),Image.Resampling.LANCZOS)
        cols,rows=r['grid'];cw,ch=W//cols,H//rows
        cells=[im.crop((i%cols*cw,i//cols*ch,(i%cols+1)*cw,(i//cols+1)*ch)) for i in range(cols*rows)]
        boxes=[box(c) for c in cells];out=Image.new('RGBA',(W,H))
        heights=[b[3]-b[1] for b in boxes if b]
        median=statistics.median(heights)
        metrics=[]
        for i,(cell,b) in enumerate(zip(cells,boxes)):
            if b is None:flags.append(f'frame {i}: empty');continue
            if b[0]<=1 or b[1]<=1 or b[2]>=cw-1 or b[3]>=ch-1:flags.append(f'frame {i}: source touches cell edge')
            tile=cell.crop(b)
            if r['mode']=='icons':scale=min(210/tile.width,210/tile.height)
            elif r['mode']=='walk':scale=min(410/tile.height,(cw-48)/tile.width)
            elif r['mode']=='portraits':scale=min(410/tile.height,(cw-48)/tile.width)
            else:scale=min(430/median,(cw-48)/tile.width,440/tile.height)
            tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.LANCZOS)
            x=i%cols*cw+(cw-tile.width)//2
            y=i//cols*ch+((ch-tile.height)//2 if r['mode']=='icons' else round(ch*.94)-tile.height)
            out.alpha_composite(tile,(x,y));metrics.append({'frame':i,'height':tile.height,'baseline':round(ch*.94)})
        im=out;desc.update(cell=[cw,ch],cols=cols,rows=rows)
        if r['mode']=='icons':desc['names']=r['names']
        else:desc['frames']=r['frames']
        if r['mode'] in ['walk','field']:desc.update(anchor=[cw//2,round(ch*.94)],facing='right')
        if r['mode']=='walk':
            desc['fps']=10
            med=statistics.median(m['height'] for m in metrics)
            if any(abs(m['height']/med-1)>.08 for m in metrics):flags.append('Standing frame scale exceeds ±8% after width fitting.')
        notes.append('Cells rebuilt separately with clear margins; shared 94% baseline for character sheets.')
        r['frameMetrics']=metrics
    elif r['mode']=='scene':im=im.resize((W,H),Image.Resampling.LANCZOS).convert('RGB')
    else:
        b=box(im)
        if b is None:raise ValueError('Empty '+r['id'])
        if b[0]<=1 or b[1]<=1 or b[2]>=im.width-1 or b[3]>=im.height-1:flags.append('Source reaches canvas edge; review cropping.')
        tile=im.crop(b);margin=round(max(tile.size)*.04)
        im=Image.new('RGBA',(tile.width+2*margin,tile.height+2*margin))
        im.alpha_composite(tile,(margin,margin));im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        desc['anchor']=[im.width//2,round(im.height*(tile.height+margin)/(tile.height+2*margin))]
    dest=root/'public/assets'/r['dest'];dest.parent.mkdir(parents=True,exist_ok=True)
    budget=(300 if r['mode']=='icons' else 700 if r['grid'] else 500 if r['mode']=='scene' else 400)*1024
    export=root/'art/raw/wave-03'/r['id']/(r['slot']+'-processed.png')
    im.save(export,format='PNG')
    quality=int(subprocess.check_output(['node',str(root/'tools/art/wave03-export.mjs'),str(export),str(dest),str(budget)],text=True))
    if dest.stat().st_size>budget:flags.append('File budget exceeded.')
    if not r['grid']:desc.update(w=im.width,h=im.height)
    if r['transparent']:
        alpha=im.getchannel('A')
        border=[alpha.crop((0,0,im.width,1)),alpha.crop((0,im.height-1,im.width,im.height)),alpha.crop((0,0,1,im.height)),alpha.crop((im.width-1,0,im.width,im.height))]
        if any(b.getextrema()[1]>0 for b in border):flags.append('Nontransparent border.')
    asset=manifest['assets'].setdefault(r['id'],dict(kind=r['kind'],wave=3,status='draft'))
    asset[r['slot']]=desc;asset['status']='draft'
    asset['sourceWave03']=dict(wave_file='art/waves/wave-03-exploration.md',model='built-in image_gen (model identifier not exposed)',date='2026-10-08')
    if asset['wave']==3:asset['source']=asset['sourceWave03']
    r.update(w=im.width,h=im.height,bytes=dest.stat().st_size,quality=quality,flags=flags,notes=notes)
    qa.append(r)
    print(r['id']+'/'+r['slot']+': '+str(len(flags))+' flags')
manifestpath.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
(root/'art/review/wave-03-qa.json').write_text(json.dumps(qa,indent=2),encoding='utf8')
