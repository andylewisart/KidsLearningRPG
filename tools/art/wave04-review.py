"""Build the Wave04 review gallery, overlays and export verification."""
import json,re
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets'
OUT=ROOT/'art/review/wave-04';OUT.mkdir(parents=True,exist_ok=True)
records=json.loads((ROOT/'tools/art/wave04-records.json').read_text(encoding='utf8'))
manifest=json.loads((ASSETS/'manifest.json').read_text(encoding='utf8'))
selected=[r for r in records if r.get('selected')]
lines=['# Wave 04: Painted places','', 'All assets are **draft**, pending parent and child review. Built-in image generation; exact submitted prompts are included below. This gallery records export checks separately from visual acceptance. Guide overlays are 35% opacity.','']
qa=[]
for r in selected:
    p=ROOT/r['dest'];im=Image.open(p).convert('RGBA');w,h=im.size
    assert (w,h)==(1536,1024),str(p)
    budget=700*1024 if r['section']=='D' else 500*1024
    assert p.stat().st_size<=budget,str(p)
    flags=list(r.get('flags',[]));name=r['id']+('/'+r['slot'] if r.get('slot') else '')
    lines+=['## '+name+' — draft','']
    if r['section']=='B':
        st=manifest['assets'][r['scene']]['states'][r['state']]
        if st.get('src'):
            patch=ASSETS/st['src'];assert patch.exists()
            pi=Image.open(patch);assert pi.size==(st['w'],st['h'])
            lines+=['![Before and after](wave-04/'+r['id']+'.jpg)','',f"Patch: `{st['src']}`, at ({st['x']}, {st['y']}), {st['w']} × {st['h']} px.",'']
        else:flags.append('State patch missing.')
    else:
        lines+=['![Selected image](../../'+r['dest']+')','']
    if r['section']=='A' or r['section']=='E':
        guide=ROOT/'art/guides'/('map_island.png' if r['section']=='E' else 'explore_'+r['id'].removeprefix('scene_')+'.png')
        overlay=Image.blend(im,Image.open(guide).convert('RGBA'),.35)
        overlay.convert('RGB').save(OUT/(r['id']+'-guide.jpg'),quality=90)
        lines+=['![Guide at 35 percent](wave-04/'+r['id']+'-guide.jpg)','']
        if r['section']=='A':
            layout=json.loads((ROOT/'art/guides/explore-layouts.json').read_text(encoding='utf8'))[r['id']]['things']
            measured=im.copy();d=ImageDraw.Draw(measured)
            for k,o in r['objects'].items():
                d.rectangle(o['box'],outline='#ffda65',width=2);d.text((o['box'][0],o['box'][1]-14),k,fill='#ffda65')
                delta=max(abs(a-b) for a,b in zip(o['box'],layout[k]['box']))
                if delta>40:flags.append(f'{k}: largest box-edge deviation from guide is {delta}px (target about40px).')
            measured.convert('RGB').save(OUT/(r['id']+'-boxes.jpg'),quality=90)
            lines+=['![Measured click boxes](wave-04/'+r['id']+'-boxes.jpg)','']
    if r['section']=='C' and r.get('slot')=='fg':
        bg=Image.open(ASSETS/manifest['assets'][r['id']]['base']['src']).convert('RGBA');bg.alpha_composite(im)
        bg.convert('RGB').save(OUT/(r['id']+'-composite.jpg'),quality=90)
        lines+=['![Arena with foreground](wave-04/'+r['id']+'-composite.jpg)','']
    if r['section']=='D':
        old=OUT/(r['id']+'_battle_old.webp')
        lines+=['Old sheet:','', '![Old battle sheet](wave-04/'+old.name+')','']
        alpha=im.getchannel('A')
        assert all(alpha.getpixel(pt)==0 for pt in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)])
        metrics=[]
        for i in range(6):
            b=alpha.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512)).point(lambda a:255 if a>24 else 0).getbbox()
            assert b is not None
            metrics.append(dict(frame=i,box=b,baseline=b[3]-1))
            assert abs(b[3]-1-481)<=1,(r['id'],i,b)
        r['frameMetrics']=metrics
    lines+=['**Review flags:** '+(' '.join(flags) if flags else 'No visible guide marks; selected image passes the listed visual checks.'),'']
    lines+=['<details><summary>Generation prompt and references</summary>','', '```text',r['prompt'],'```','', 'References: '+', '.join('`'+s+'`' for s in r.get('refs',[])),'','</details>','']
    qa.append(dict(id=r['id'],slot=r.get('slot'),section=r['section'],bytes=p.stat().st_size,size=[w,h],flags=flags,frameMetrics=r.get('frameMetrics')))
(ROOT/'art/review/wave-04.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
(ROOT/'art/review/wave-04-qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf8')
print('Verified',len(qa),'selected image exports; visual flags on',sum(bool(r['flags']) for r in qa),'entries.')
