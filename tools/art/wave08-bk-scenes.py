"""Apply measured boxes and cut only Wave 08 states, preserving older patches."""
import json,sys,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
import scene_patches as patches
import importlib.util

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets'
REVIEW=ROOT/'art/review/wave-08'
JOBS=ROOT/'tools/art/wave08-bk-jobs.json'
RECORDS=ROOT/'tools/art/wave08-bk-records.json'
spec=importlib.util.spec_from_file_location('wave08_process',ROOT/'tools/art/wave08-bk-process.py')
processor=importlib.util.module_from_spec(spec);spec.loader.exec_module(processor)

def main():
    jobs=json.loads(JOBS.read_text()); records=json.loads(RECORDS.read_text())
    manifest=json.loads((ASSETS/'manifest.json').read_text())
    chosen={r['key']:r for r in records if r.get('selected')}
    targets=set(sys.argv[1:])
    g=[j for j in jobs if j['section']=='G' and j['kind']=='explore' and (not targets or j['id'] in targets)]
    for j in g:
        if j['key'] not in chosen:continue
        entry=manifest['assets'][j['id']]
        if j['slot']=='base':
            # Jobs' object boxes are measured on the selected painting before this step.
            entry['objects']=j['objects']
            im=Image.open(ASSETS/j['dest']).convert('RGB');draw=ImageDraw.Draw(im)
            for n,(name,obj) in enumerate(j['objects'].items()):
                color=['#ffe27a','#67edff','#ff8bba','#a5ff88'][n%4]
                draw.rectangle(obj['box'],outline=color,width=3)
                draw.text((obj['box'][0]+4,obj['box'][1]+4),name,fill=color,stroke_width=1,stroke_fill='#151a26')
                if 'ground' in obj:
                    x,y=obj['ground'];draw.line((x-8,y,x+8,y),fill=color,width=3);draw.line((x,y-8,x,y+8),fill=color,width=3)
            REVIEW.mkdir(parents=True,exist_ok=True);im.save(REVIEW/f"{j['id']}-objects.jpg",quality=88)
        elif j.get('variant'):
            entry.setdefault('objects',{}).update(j.get('additional_objects',{}))
            obj=j.get('state_object') or next(x for x in jobs if x['id']==j['id'] and x['slot']=='base')['states'][j['slot']]['object']
            if j.get('patch_box'):
                entry.setdefault('objects',{})[obj]={'box':j['patch_box']}
            entry.setdefault('states',{}).setdefault(j['slot'],{})['object']=obj
            if j.get('patch_margin') is not None:entry['states'][j['slot']]['patchMargin']=j['patch_margin']
    (ASSETS/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    scenes={j['id'] for j in g if j.get('variant') and j['key'] in chosen}
    for scene in sorted(scenes):
        states=[j['slot'] for j in g if j['id']==scene and j.get('variant') and j['key'] in chosen]
        result=subprocess.run([sys.executable,str(ROOT/'tools/art/scene_patches.py'),scene,'--states',','.join(states),'--review-dir',str(REVIEW)],capture_output=True,text=True)
        print(result.stdout,end='')
        if result.stderr:print(result.stderr,end='')
    manifest=json.loads((ASSETS/'manifest.json').read_text())
    for j in g:
        if not j.get('variant') or j['key'] not in chosen:continue
        r=chosen[j['key']];entry=manifest['assets'][j['id']];st=entry['states'][j['slot']]
        if not st.get('src'):continue
        p=ASSETS/st['src']; im=Image.open(p).convert('RGBA')
        quality=processor.save(im,p,500*1024)
        base=patches.load_rgb(ASSETS/entry['base']['src']);var=patches.load_rgb(ROOT/'art/scenes'/j['id']/(j['slot']+'.webp'))
        _,_,_,info=patches.extract(base,var,entry['objects'][st['object']]['box'],st.get('patchMargin',patches.MARGIN))
        r['patch']={'src':st['src'],'bytes':p.stat().st_size,'quality':quality,'changed':info['changed'],'border':info['border']}
        r['review_src']=f"../scenes/{j['id']}/{j['slot']}.webp"
        r['patch_review']=f"wave-08/{j['id']}__{j['slot']}.jpg"
        r['flags']=[f for f in r.get('flags',[]) if not f.startswith('Patch:')]
        if info['border']>.35:r['flags'].append('Patch: significant changes reach the extraction area border; inspect before/after for drift or clipping')
        if info['changed']<.002:r['flags'].append('Patch: almost no visible change detected')
    RECORDS.write_text(json.dumps(records,indent=2)+'\n');processor.gallery(records,jobs)

if __name__=='__main__':main()
