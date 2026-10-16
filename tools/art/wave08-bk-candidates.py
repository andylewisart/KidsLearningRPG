"""Make base-candidate comparisons for the Wave 08 review gallery."""
import json
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
jobs=json.loads((ROOT/'tools/art/wave08-bk-jobs.json').read_text())
records=json.loads((ROOT/'tools/art/wave08-bk-records.json').read_text())
selected={r['key']:r['attempt'] for r in records if r.get('selected')}
out=ROOT/'art/review/wave-08';out.mkdir(parents=True,exist_ok=True)
for j in jobs:
    if j['slot']!='base' or not (j.get('candidates',1)>1 or j['id'] in ['scene_harbor','titan_beaconwing']):continue
    raw=ROOT/'art/raw/wave-08'/j['key']
    paths=sorted(raw.glob('[123].png'))
    if len(paths)<2:continue
    cw,ch=(512,390) if j['kind']=='explore' else (448,490)
    sheet=Image.new('RGB',(cw*len(paths),ch),(27,33,43));draw=ImageDraw.Draw(sheet)
    for n,p in enumerate(paths):
        im=Image.open(p).convert('RGBA');im.thumbnail((cw-24,ch-54),Image.Resampling.LANCZOS)
        sheet.paste(im,(n*cw+(cw-im.width)//2,36+(ch-54-im.height)//2),im)
        label=f"Attempt {p.stem}"+(' - selected' if int(p.stem)==selected[j['key']] else '')
        draw.text((n*cw+12,12),label,fill=(244,231,179))
    sheet.save(out/f"{j['id']}-candidates.jpg",quality=88)
    print(j['id'],len(paths),'attempts, selected',selected[j['key']])
