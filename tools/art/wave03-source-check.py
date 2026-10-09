import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
choices={}
for r in json.loads((root/'tools/art/wave03-records.json').read_text(encoding='utf8')):
    if r.get('selected',True):choices[r['dest']]=r
for r in choices.values():
    if not r['grid']:continue
    im=Image.open(r['path']).convert('RGBA').resize(tuple(map(int,r['size'].split('x'))))
    cols,rows=r['grid'];cw,ch=im.width//cols,im.height//rows;edges=[]
    for i in range(cols*rows):
        b=im.getchannel('A').crop((i%cols*cw,i//cols*ch,(i%cols+1)*cw,(i//cols+1)*ch)).point(lambda p:255 if p>16 else 0).getbbox()
        if b is None or b[0]<=1 or b[1]<=1 or b[2]>=cw-1 or b[3]>=ch-1:edges.append(i)
    print(r['id'],r['attempt'],edges)
