"""Export Wave 04 selected generations and record measured scene metadata."""
import json, shutil, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/'public/assets/manifest.json'
RECORDS=ROOT/'tools/art/wave04-records.json'
def export(im,path,budget=500*1024,lossless=False):
    path=ROOT/path;path.parent.mkdir(parents=True,exist_ok=True)
    for q in [90,86,82,78,74,70,65,60]:
        im.save(path,'WEBP',quality=q,method=6,lossless=lossless)
        if path.stat().st_size<=budget:return q
    raise ValueError('File budget exceeded: '+str(path))
def main():
    records=json.loads(RECORDS.read_text(encoding='utf8'))
    manifest=json.loads(MANIFEST.read_text(encoding='utf8'))
    for r in records:
        raw=ROOT/'art/raw/wave-04'/r['id']/('v'+str(r['attempt'])+'.png');raw.parent.mkdir(parents=True,exist_ok=True)
        if Path(r['path']).resolve()!=raw.resolve():shutil.copyfile(r['path'],raw)
        if not r.get('selected'):continue
        im=Image.open(r['path']).convert('RGBA' if r.get('transparent') else 'RGB').resize((1536,1024),Image.Resampling.LANCZOS)
        if r['section']=='D':continue
        export(im,r['dest'])
        if r['section']=='B':continue
        source=dict(wave_file='art/waves/wave-04-scenes.md',model='built-in image_gen (identifier not exposed)',date='2026-10-09')
        desc=dict(src=r['dest'].removeprefix('public/assets/'),w=1536,h=1024)
        if r['section']=='A':
            oldstates=manifest['assets'].get(r['id'],{}).get('states',{})
            states={k:{**oldstates.get(k,{}),**v} for k,v in r['states'].items()}
            manifest['assets'][r['id']]=dict(kind='explore',wave=4,status='draft',base=desc,battle=r['battle'],objects=r['objects'],states=states,source=source)
        elif r['section']=='C':
            entry=manifest['assets'].setdefault(r['id'],dict(kind='background',wave=4,status='draft',source=source))
            entry[r.get('slot','base')]=desc
            if r.get('floorEdge'):entry['floorEdge']=r['floorEdge']
        elif r['section']=='E':
            manifest['assets'][r['id']]=dict(kind='map',wave=4,status='draft',base=desc,places=r['places'],trails=r['trails'],source=source)
    MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
