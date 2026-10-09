"""Rebuild replacement battle sheets at the old standing scale and KO baseline."""
import json,statistics,runpy,shutil
from pathlib import Path
from PIL import Image
import clean_sheets
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
export=runpy.run_path(str(ROOT/'tools/art/wave04-process.py'))['export']
records=json.loads((ROOT/'tools/art/wave04-records.json').read_text(encoding='utf8'))
manifestpath=ROOT/'public/assets/manifest.json';manifest=json.loads(manifestpath.read_text(encoding='utf8'))
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
for r in records:
    if not r.get('selected') or r['section']!='D':continue
    im=Image.open(r['path']).convert('RGBA').resize((1536,1024),Image.Resampling.LANCZOS)
    old=Image.open(ROOT/f"art/review/wave-04/{r['id']}_battle_old.webp").convert('RGBA')
    cells=[im.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
    rawboxes=[bbox(c) for c in cells]
    # Remove loose neighboring fragments before their bounds influence scaling.
    for i,c in enumerate(cells):
        data=np.array(c);data[:,:,3]=np.where(data[:,:,3]<4,0,data[:,:,3])
        if not (r['id']=='ally_spellwright' and i==3):clean_sheets.clean_cell(data)
        cells[i]=Image.fromarray(data,'RGBA')
    oldboxes=[bbox(old.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512))) for i in range(6)]
    boxes=[bbox(c) for c in cells]
    target=statistics.median(b[3]-b[1] for i,b in enumerate(oldboxes) if b and i!=4)
    source=statistics.median(b[3]-b[1] for i,b in enumerate(boxes) if b and i!=4)
    out=Image.new('RGBA',(1536,1024));flags=r.setdefault('flags',[])
    for i,(c,b) in enumerate(zip(cells,boxes)):
        assert b is not None,(r['id'],i)
        rb=rawboxes[i]
        if min(rb[:2])<=1 or rb[2]>=511 or rb[3]>=511:flags.append(f'frame{i}: source content touches cell boundary; loose fragments cleaned, inspect crop')
        full=c.getchannel('A').point(lambda a:255 if a>=4 else 0).getbbox();tile=c.crop(full)
        scale=min((target/(b[3]-b[1]) if i!=4 else target/source),450/tile.width,450/tile.height)
        tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.LANCZOS)
        tb=bbox(tile);x=i%3*512+(512-tile.width)//2;y=i//3*512+481-(tb[3]-1)
        out.alpha_composite(tile,(x,y))
    export(out,r['dest'],budget=700*1024)
    desc=manifest['assets'][r['id']]['battle']
    notes=clean_sheets.clean_sheet(ROOT/r['dest'],desc,False,{3} if r['id']=='ally_spellwright' else set())
    # Align remaining visible geometry after removing loose fragments.
    cleaned=Image.open(ROOT/r['dest']).convert('RGBA');final=Image.new('RGBA',cleaned.size)
    for i in range(6):
        tile=cleaned.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512));b=bbox(tile)
        final.alpha_composite(tile,(i%3*512,i//3*512+481-(b[3]-1)))
    export(final,r['dest'],budget=700*1024)
    heights=[]
    for i in range(6):
        b=bbox(final.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512)))
        if i!=4:heights.append(b[3]-b[1])
    median=statistics.median(heights)
    if any(abs(h/median-1)>.08 for h in heights):flags.append('Standing frame bounds exceed the ±8% height tolerance after width fitting; review scale.')
    if abs(median/target-1)>.08:flags.append('New standing bounds differ from the old standing median by more than8%; review scale.')
    manifest['assets'][r['id']]['status']='draft'
    manifest['assets'][r['id']]['sourceWave04']=dict(wave_file='art/waves/wave-04-scenes.md',model='built-in image_gen (identifier not exposed)',date='2026-10-09')
    print(r['id'], 'old standing height',target,'cleanup:',notes)
manifestpath.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
(ROOT/'tools/art/wave04-records.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf8')
