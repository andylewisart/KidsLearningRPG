"""Export and register selected wave 08 jobs, keeping review/checkpoint state."""
import json,sys,shutil,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets'
JOBS=ROOT/'tools/art/wave08-bk-jobs.json'
RECORDS=ROOT/'tools/art/wave08-bk-records.json'
REVIEW=ROOT/'art/review/wave-08.md'
def read(p,default=None): return json.loads(p.read_text(encoding='utf8')) if p.exists() else default
def write(p,value): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,indent=2)+'\n',encoding='utf8')
def save(im,p,budget):
    p.parent.mkdir(parents=True,exist_ok=True)
    for q in [90,86,82,78,74,70,65,60,55,50]:
        im.save(p,'WEBP',quality=q,method=6)
        if p.stat().st_size<=budget: return q
    raise ValueError('File budget exceeded: '+str(p))
def clean(im):
    a=np.array(im.convert('RGBA'));a[a[:,:,3]<=8,3]=0
    return Image.fromarray(a)
def border_hits(im):
    a=np.array(im.getchannel('A'));return int(np.count_nonzero(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]])))
def gallery(records,jobs):
    original=REVIEW.read_text(encoding='utf8').split('\n<!-- WAVE08 BK START -->')[0]
    sections=['\n<!-- WAVE08 BK START -->','\n# Sections B–K: production review\n','New outputs remain **draft**. Approved Section A bases are retained. Each asset includes its recorded production prompt and QA flags. Earlier targeted correction wording is summarized in visual notes where it was not retained verbatim.\n']
    lookup={j['key']:j for j in jobs}
    selected={r['key']:r for r in records if r.get('selected')}
    for section in 'BCDEFGHIJK':
        items=[selected[j['key']] for j in jobs if j['section']==section and j['key'] in selected]
        if not items:continue
        sections.append(f'\n## Section {section}\n')
        for r in items:
            j=lookup[r['key']];src=r.get('review_src','../../public/assets/'+j['dest'])
            sections += [f'\n### {j["id"]} / {j["slot"]} — draft\n',f'![{j["key"]}]({src})\n',f'{r["w"]}×{r["h"]}; {r["bytes"]/1024:.1f} KiB. Attempt {r["attempt"]}.\n']
            comparison=ROOT/'art/review/wave-08'/f"{j['id']}-candidates.jpg"
            if j['slot']=='base' and comparison.exists():
                sections.append(f"![Base candidates](wave-08/{comparison.name})\n")
            measured=ROOT/'art/review/wave-08'/f"{j['id']}-objects.jpg"
            if j['kind']=='explore' and j['slot']=='base' and measured.exists():
                sections.append(f"![Measured objects](wave-08/{measured.name})\n")
            if r.get('patch_review'):
                sections.append(f"![Before and patched after]({r['patch_review']})\n")
            if j.get('video'):
                sections.append(f"[1920×1080 film first frame](../video-refs/frames/{j['id']}-16x9.jpg)\n")
            sections += ['- FLAG: '+f+'\n' for f in r.get('flags',[])]
            sections += [r.get('visual_notes','')+'\n','<details><summary>Prompt and references</summary>\n','```text\n'+r.get('prompt',j['prompt'])+'\n```\n','References: '+', '.join(r.get('references',j['references']))+'\n','</details>\n']
    REVIEW.write_text(original+'\n'.join(sections),encoding='utf8')
def main():
    key,path,attempt=sys.argv[1],Path(sys.argv[2]),int(sys.argv[3]);jobs=read(JOBS);j=next(x for x in jobs if x['key']==key)
    records=read(RECORDS,[]);raw=ROOT/'art/raw/wave-08'/j['key']/f'{attempt}.png';raw.parent.mkdir(parents=True,exist_ok=True)
    if raw.resolve()!=path.resolve():shutil.copy2(path,raw)
    im=Image.open(raw).convert('RGBA' if j['transparent'] else 'RGB');flags=[];source_size=im.size
    im=im.resize(tuple(j['size']),Image.Resampling.LANCZOS)
    desc={'src':j['dest']};cells=[]
    if j['transparent']:im=clean(im)
    if j.get('grid'):
        cols,rows=j['grid'];cw,ch=im.width//cols,im.height//rows
        for n in range(cols*rows):
            cell=im.crop((n%cols*cw,n//cols*ch,(n%cols+1)*cw,(n//cols+1)*ch));box=cell.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
            if not box and n<j.get('count',cols*rows):flags.append(f'Cell {n} empty')
            if box and (box[0]<=1 or box[1]<=1 or box[2]>=cw-1 or box[3]>=ch-1):flags.append(f'Cell {n} source touches cell edge; inspect cropping/bleed')
            cells.append((cell,box))
        portrait='portrait' in j['slot'];icons=j['kind'] in ['icons','ui']
        target_h=min([ch*.86]+[cw*.86*(b[3]-b[1])/(b[2]-b[0]) for n,(_,b) in enumerate(cells) if b and not (j['slot']=='battle' and j['kind']=='ally' and n==4)])
        out=Image.new('RGBA',im.size)
        for n,(cell,b) in enumerate(cells):
            if not b:continue
            if j.get('count') and n>=j['count']:continue
            tile=cell.crop(b);ko=j['slot']=='battle' and j['kind']=='ally' and n==4
            if j.get('mirror'):tile=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            scale=min(cw*.86/tile.width,ch*.86/tile.height) if icons or ko else target_h/tile.height
            tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.LANCZOS)
            x=n%cols*cw+(cw-tile.width)//2;y=n//cols*ch+((ch-tile.height)//2 if icons else round(ch*.94)-tile.height)
            out.alpha_composite(tile,(x,y))
        im=out;desc.update(cell=[cw,ch],cols=cols,rows=rows)
        if j.get('frames') is not None:desc['frames']=j['frames']
        if j.get('facing'):desc['facing']=j['facing']
        if j.get('fps'):desc['fps']=j['fps']
        if not icons and not portrait:desc['anchor']=[cw//2,round(ch*.94)]
        if j.get('names'):desc['names']=j['names']
    elif j['transparent'] and j['slot']!='fg':
        box=im.getchannel('A').getbbox()
        if not box:raise ValueError('Empty sprite '+key)
        if border_hits(im):flags.append('Source opacity reaches canvas edge; inspect crop')
        im=im.crop(box);margin=round(max(im.size)*.04);out=Image.new('RGBA',(im.width+2*margin,im.height+2*margin));out.alpha_composite(im,(margin,margin));out.thumbnail((1024,1024),Image.Resampling.LANCZOS);im=out
        desc['anchor']=[im.width//2,round(im.height*.963)]
    else: pass
    if j['section']=='J':
        # Generation canvas is 3:2; story cards use the centered 16:9 safe area.
        height=round(im.width*9/16); top=j.get('crop_top',(im.height-height)//2)
        im=im.crop((0,top,im.width,top+height))
        if j.get('video'):
            first=ROOT/'art/video-refs/frames'/f"{j['id']}-16x9.jpg"
            first.parent.mkdir(parents=True,exist_ok=True)
            im.convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS).save(first,quality=92)
    if j['transparent'] and border_hits(im):flags.append('Export has nonzero border alpha')
    if not j.get('grid'):desc.update(w=im.width,h=im.height)
    budget=(300 if j['kind'] in ['icons','ui'] and j.get('grid') else 700 if j.get('grid') else 500 if not j['transparent'] else 400)*1024
    output=ASSETS/j['dest'];quality=save(im,output,budget)
    manifest=read(ASSETS/'manifest.json');entry=manifest['assets'].setdefault(j['id'],{'kind':j['kind'],'wave':8,'status':'draft'})
    if j.get('variant'):
        if j.get('map_variant'):entry.setdefault('variants',{})[j['slot']]=desc
    elif j.get('pose'):entry.setdefault('poses',{})[j['slot']]=desc
    else:entry[j['slot']]=desc
    if j['kind']=='explore' and not j.get('variant'):
        entry.update(objects=j['objects'],states=j.get('states',{}),battle=j.get('battle','bg_harbor_docks'))
    if j.get('floorEdge'):entry['floorEdge']=j['floorEdge']
    if not j.get('variant'):
        source_key='sourceWave08' if entry.get('source',{}).get('wave_file') not in [None,'art/waves/wave-08-harbor.md'] else 'source'
        entry[source_key]={'wave_file':'art/waves/wave-08-harbor.md','model':'built-in image_gen (identifier not exposed)','date':'2026-10-13'}
    write(ASSETS/'manifest.json',manifest)
    for r in records:
        if r['key']==key:r['selected']=False
    record=dict(key=key,id=j['id'],slot=j['slot'],section=j['section'],attempt=attempt,selected=True,path=str(raw),source_size=source_size,w=im.width,h=im.height,bytes=output.stat().st_size,quality=quality,flags=flags,prompt=j['prompt'],references=j['references'])
    records.append(record);write(RECORDS,records);gallery(records,jobs)
    print(json.dumps(record))
if __name__=='__main__':main()
