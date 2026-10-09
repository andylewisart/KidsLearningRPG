"""Remove soft-alpha remnants of neighboring poses after normal sheet cleanup."""
import json,runpy
from pathlib import Path
import numpy as np
from PIL import Image
import clean_sheets
try:
    import cv2
except ImportError:
    cv2=None
ROOT=Path(__file__).resolve().parents[2]
export=runpy.run_path(str(ROOT/'tools/art/wave04-process.py'))['export']
records=json.loads((ROOT/'tools/art/wave04-records.json').read_text())
for r in records:
    if r['section']!='D' or not r.get('selected'):continue
    im=Image.open(ROOT/r['dest']).convert('RGBA');out=Image.new('RGBA',im.size)
    for i in range(6):
        tile=im.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512));data=np.array(tile)
        data[:,:,3]=np.where(data[:,:,3]<4,0,data[:,:,3])
        if not (r['id']=='ally_spellwright' and i==3):
            mask=(data[:,:,3]>=4).astype(np.uint8)
            if cv2:
                count,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
                sizes=stats[:,cv2.CC_STAT_AREA].tolist();sizes[0]=0
            else:
                labels,sizes,_=clean_sheets.label(mask.astype(bool));count=len(sizes)
            biggest=max(sizes[1:]);ys,xs=np.nonzero(mask)
            for k in range(1,count):
                if sizes[k]>=biggest*.04:continue
                cy,cx=np.nonzero(labels==k)
                if cy.min()<=ys.min()+1 or cy.max()>=ys.max()-1 or cx.min()<=xs.min()+1 or cx.max()>=xs.max()-1:
                    data[:,:,3][labels==k]=0
        tile=Image.fromarray(data,'RGBA')
        b=tile.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
        out.alpha_composite(tile,(i%3*512,i//3*512+481-(b[3]-1)))
    export(out,r['dest'],budget=700*1024)
    print(r['id'],'soft fragment cleanup complete')
