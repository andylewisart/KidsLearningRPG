"""Check the wave's delivered files and manifest registrations before Gate B."""
import json
from pathlib import Path
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
assets=ROOT/'public/assets'
jobs=json.loads((ROOT/'tools/art/wave08-bk-jobs.json').read_text())
records=json.loads((ROOT/'tools/art/wave08-bk-records.json').read_text())
manifest=json.loads((assets/'manifest.json').read_text())['assets']
selected={r['key']:r for r in records if r.get('selected')}
errors=[]
for j in jobs:
    key=j['key']
    if key not in selected:
        errors.append(key+': missing selected output');continue
    p=assets/j['dest'];r=selected[key]
    if not p.exists():
        errors.append(key+': missing file');continue
    im=Image.open(p)
    if im.size!=(r['w'],r['h']):errors.append(key+': record dimensions differ')
    budget=(300 if j['kind'] in ['icons','ui'] and j.get('grid') else 700 if j.get('grid') else 500 if not j['transparent'] else 400)*1024
    if p.stat().st_size>budget:errors.append(key+': file over budget')
    a=np.asarray(im.convert('RGBA'))[:,:,3]
    if j['transparent']:
        if a.min()!=0:errors.append(key+': missing transparency')
        if j.get('grid'):
            cols,rows=j['grid'];cw,ch=im.width//cols,im.height//rows
            for n in range(j.get('count',cols*rows)):
                cell=a[n//cols*ch:(n//cols+1)*ch,n%cols*cw:(n%cols+1)*cw]
                if not np.any(cell>16):errors.append(key+f': empty cell {n}')
            for n in range(j.get('count',cols*rows),cols*rows):
                if np.any(a[n//cols*ch:(n//cols+1)*ch,n%cols*cw:(n%cols+1)*cw]>16):errors.append(key+f': unused cell {n} populated')
    elif a.min()!=255:errors.append(key+': opaque output has transparency')
    entry=manifest.get(j['id'],{})
    if j['kind']=='explore':
        for name,obj in entry.get('objects',{}).items():
            x0,y0,x1,y1=obj['box']
            if not (0<=x0<x1<=1536 and 0<=y0<y1<=1024):errors.append(key+': invalid object box '+name)
    if j['slot']=='fg':
        if np.any(a[200:850,600:1000]>0):errors.append(key+': foreground obscures central stage')
    if j.get('variant') and not j.get('map_variant'):
        st=entry.get('states',{}).get(j['slot'],{})
        if not st.get('src') or not (assets/st['src']).exists():errors.append(key+': missing state patch')
        if not entry.get('objects',{}).get(st.get('object'),{}).get('box'):errors.append(key+': missing measured state object')
    else:
        desc=(entry.get('variants',{}) if j.get('map_variant') else entry.get('poses',{}) if j.get('pose') else entry).get(j['slot'],{})
        if desc.get('src')!=j['dest']:errors.append(key+': manifest source differs')
        if j.get('grid') and (desc.get('cols'),desc.get('rows'))!=tuple(j['grid']):errors.append(key+': incorrect manifest grid')
    if j['section']=='J' and im.width*9!=im.height*16:errors.append(key+': story card is not 16:9')
    if j.get('video'):
        fp=ROOT/'art/video-refs/frames'/f"{j['id']}-16x9.jpg"
        if not fp.exists() or Image.open(fp).size!=(1920,1080):errors.append(key+': film first frame missing/wrong size')
report={'expected':len(jobs),'selected':len(selected),'errors':errors,'visual_flags':{k:r['flags'] for k,r in selected.items() if r.get('flags')}}
(ROOT/'art/review/wave-08-qa.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(bool(errors))
