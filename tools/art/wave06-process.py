"""Prepare reference inputs and export Wave 06 without touching game code."""
import json, re, shutil, sys
from pathlib import Path
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT/'art/raw/wave-06'
TOOLS = ROOT/'tools/art'
IDS = ['ally_knight','ally_gunner','ally_spellwright','ally_titancaller','tutor_droid','mascot_monkey','npc_jumble']
WHO = ['Cade, the young Crystal Knight','Captain Wren, the red-haired sky-pirate','Knox, the tiny hooded scholar','Maren, the Titan Caller','Kit, the round white tutor droid in a tiny pirate hat','Pockets, the three-eyed monkey','Captain Jumble, the ghost-pirate sorcerer']
SLOTS = [['base','battle'],['base','battle','field'],['base','battle'],['base','battle','field'],['base','portraits'],['base','field'],['base','portraits']]
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf8')
def board(paths,dest):
    cols=2; rows=(len(paths)+1)//2
    out=Image.new('RGB',(1536,768*rows),(35,39,48))
    for n,path in enumerate(paths):
        im=Image.open(ROOT/path).convert('RGBA'); im.thumbnail((720,720),Image.Resampling.LANCZOS)
        x=n%2*768+(768-im.width)//2; y=n//2*768+(768-im.height)//2
        out.paste(im,(x,y),im)
    dest.parent.mkdir(parents=True,exist_ok=True);out.save(dest)
def prepare():
    style=(ROOT/'art/STYLE.md').read_text(encoding='utf8')
    blocks=re.findall(r'```text\n(.*?)\n```',style,re.S)
    master,sprite,scene,fx,rules=blocks
    jobs=[]
    for id,who,slots in zip(IDS,WHO,SLOTS):
        refs=['public/assets/anchors/cast_lineup.webp']+[f'public/assets/characters/{id}/{s}.webp' for s in slots]
        board(refs,RAW/id/'references.png')
        for view in ['front','left','right']:
            if view=='front':
                asset=f'Character reference for animation: {who}, the same character as the attached reference images, exactly: same outfit, colors, proportions, hair and gear. Full body from head to feet, standing in a relaxed neutral pose with the arms slightly away from the body, facing the viewer and looking at the viewer.'
            else:
                asset=f'The same character as the attached front view, exactly, now in a full side profile facing the {view.upper()} edge of the picture: body turned 90 degrees, full body from head to feet, relaxed neutral standing pose, same size and position as the front view. Keep anatomical left and right gear on the same body sides; rotate the character, do not mirror.'
            asset+=' For this animation reference, override the sprite transparency and lighting instructions: OPAQUE plain flat light gray background (#e4e6ea), soft even studio lighting, a faint shadow under the feet only. No scenery, no text, no other characters. Portrait 1024x1536. Center one full character with generous margins around head, feet, tail and gear. Keep the same on-model body scale in all three views. Own gear only: Cade sword and shield; Wren two blasters HOLSTERED; Knox spellbook; Maren staff; Kit pirate hat; Pockets no added gear; Jumble hat and coat. Only show the named character. Neutral child-friendly expression, no action pose, no added props.'
            jobs.append({'id':id,'view':view,'dest':f'art/video-refs/{id}/{view}.jpg','size':[1024,1536],'quality':90,'refs':refs,'prompt':'\n\n'.join([master,sprite,asset,rules])})
    write(TOOLS/'wave06-jobs.json',jobs)
    if not (TOOLS/'wave06-records.json').exists():write(TOOLS/'wave06-records.json',[])
    print('Prepared 21 reference jobs and seven inspection boards.')
def frames():
    style=(ROOT/'art/STYLE.md').read_text(encoding='utf8')
    master,sprite,scene,fx,rules=re.findall(r'```text\n(.*?)\n```',style,re.S)
    wave=(ROOT/'art/waves/wave-06-ending.md').read_text(encoding='utf8')
    prompts=re.findall(r'```text\n(.*?)\n```',wave,re.S)[3:]
    jobs=json.loads((TOOLS/'wave06-jobs.json').read_text())
    board(['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp'],RAW/'style-anchors.png')
    own=[p for j in jobs if j['view']=='front' and j['id'] in IDS[:5] for p in j['refs'][1:]]
    board(own,RAW/'party-sources.png')
    board(['public/assets/bosses/boss_geode_titan/base.webp','public/assets/scenes/explore/scene_canyon.webp'],RAW/'crystal-scene-sources.png')
    board(['public/assets/characters/npc_jumble/base.webp','public/assets/characters/npc_jumble/portraits.webp','public/assets/characters/mascot_monkey/base.webp'],RAW/'jumble-sources.png')
    guide='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
    specs=[('story_crystal_remade',['art/raw/wave-06/style-anchors.png','art/raw/wave-06/party-sources.png','art/raw/wave-06/crystal-scene-sources.png','art/guides/story_card.png'], 'Image1 gives style, image2 gives all five character outfits, image3 gives purple lair crystals and sunset canyon light, image4 is layout only. EXACTLY FIVE main heroes, one of each: Cade, Wren, Knox, Maren and Kit. EXACTLY FOUR separate floating teal shards, not yet fused. The top third above them is empty atmospheric cave space for a future tall Lore Crystal, no giant crystal occupying that space. Keep all hero faces and all four shards inside y=160 to y=700 and the 16:9 crop y=80 to y=944. Whole heroes fit. No narration box. A single tiny three-eyed monkey may peek from behind a side-wall crystal as the subtle recurring background gag; no extra human or duplicate party member.'),('story_jumble_next',['art/raw/wave-06/style-anchors.png','art/raw/wave-06/jumble-sources.png','public/assets/scenes/story_galleon.webp','public/assets/scenes/story_ending.webp','art/guides/story_card.png'],'Image1 gives style, image2 gives Jumble and the monkey, image3 is the exact ghost-galleon design, image4 is the harbor and lighthouse design, image5 is layout only. Preserve distinctive reference ship silhouette and tattered rune sails, do not invent a different ship. EXACTLY ONE Jumble on the prow, his whole head and raised hand well inside the 16:9 crop y=80 to y=944 and above the bottom narration-safe strip. Keep a wide clear interval of open sea and sky between the ship on the left and the far harbor on the right. Only a FEW glowing scrambled letter-glyphs beginning at his fingers, not a completed stream reaching the town. These requested magical glyphs are the only exception to no letters. Lighthouse light faint dim blue, never bright triumphant beacon. Tiny Pockets can hide on a distant dock as an unobtrusive background gag. No narration box.')]
    jobs=[j for j in jobs if j['view']!='base']
    for prompt,(id,refs,extra) in zip(prompts,specs):
        jobs.append({'id':id,'view':'base','dest':f'public/assets/scenes/{id}.webp','size':[1536,1024],'quality':92,'refs':refs,'prompt':'\n\n'.join([master,scene,prompt+'\n\n'+extra+'\n\n'+guide+' Output1536x1024, opaque.',rules])})
    write(TOOLS/'wave06-jobs.json',jobs)
    print('Prepared two ending-frame jobs.')
def export():
    jobs=json.loads((TOOLS/'wave06-jobs.json').read_text())
    records=json.loads((TOOLS/'wave06-records.json').read_text())
    qa=[];page=['# Wave 06 review','','All outputs are **draft**, pending parent and child review. Generated with the built-in image tool. Video upload files are in `art/video-refs/`.','','21 character reference images, two new game frames, and three upload-ready frame JPEGs. [Technical and visual QA](wave-06-qa.json).','','**Remaining visual flag:** Pockets is not visible in the selected Jumble frame. The third attempt changed Jumble\'s face and brightened the lighthouse while adding the cameo, so it was rejected.','']
    for job in jobs:
        rr=[r for r in records if r['id']==job['id'] and r['view']==job['view']]
        if not rr:continue
        r=next((r for r in reversed(rr) if r.get('selected',True)),rr[-1])
        for attempt in rr:
            target=RAW/job['id']/f"{job['view']}-v{attempt['attempt']}.png"
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(attempt['path'],target)
        im=Image.open(r['path']).convert('RGB')
        assert im.width/im.height==job['size'][0]/job['size'][1],(job['id'],im.size)
        im=im.resize(tuple(job['size']),Image.Resampling.LANCZOS)
        dest=ROOT/job['dest'];dest.parent.mkdir(parents=True,exist_ok=True)
        if job['view']=='base':
            for q in range(92,49,-2):
                im.save(dest,'WEBP',quality=q,method=6)
                if dest.stat().st_size<=500*1024:break
            assert dest.stat().st_size<=500*1024
            jpg=ROOT/f"art/video-refs/frames/{job['id']}.jpg";jpg.parent.mkdir(parents=True,exist_ok=True);im.save(jpg,quality=92)
        else:
            im.save(dest,quality=90)
            assert dest.stat().st_size<=700000,(dest,dest.stat().st_size)
        qa.append({'id':job['id'],'view':job['view'],'size':job['size'],'bytes':dest.stat().st_size,'opaque':True,'attempt':r['attempt'],'visualChecks':r.get('visualChecks',{}),'flags':r.get('flags',[])})
    for id in IDS:
        selected=[r for r in qa if r['id']==id]
        if len(selected)!=3:continue
        strip=Image.new('RGB',(3072,1536),(228,230,234))
        for n,v in enumerate(['front','left','right']):strip.paste(Image.open(ROOT/f'art/video-refs/{id}/{v}.jpg'),(n*1024,0))
        dest=ROOT/f'art/review/wave-06/{id}-refs.jpg';dest.parent.mkdir(parents=True,exist_ok=True);strip.save(dest,quality=90)
        flags=[f for r in selected for f in r['flags']]
        page += [f'## {id} — draft','','Front / left profile / right profile.', '',f'![{id} reference views](wave-06/{id}-refs.jpg)','',('**Flags:** '+'; '.join(flags)) if flags else 'Visual QA: complete bodies and gear, neutral pose, correct facing and plain background.','']
        for job in [j for j in jobs if j['id']==id]:
            rr=[r for r in records if r['id']==id and r['view']==job['view']]
            r=next(r for r in reversed(rr) if r.get('selected',True))
            page += ['<details><summary>'+job['view']+' prompt and references</summary>','','```text',r['prompt'],'```','','References: '+', '.join('`'+p+'`' for p in r['refs']),'','</details>','']
    mp=ROOT/'public/assets/manifest.json';m=json.loads(mp.read_text())
    for job in [j for j in jobs if j['view']=='base']:
        if not any(q['id']==job['id'] for q in qa):continue
        m['assets'][job['id']]={'kind':'scene','wave':6,'status':'draft','base':{'src':job['dest'].removeprefix('public/assets/'),'w':1536,'h':1024},'source':{'wave_file':'art/waves/wave-06-ending.md','model':'built-in image_gen (identifier not exposed)','date':'2026-10-10'}}
        im=Image.open(ROOT/job['dest']);out=ROOT/'art/review/wave-06'
        im.crop((0,80,1536,944)).save(out/f"{job['id']}-16by9.jpg",quality=92)
        Image.blend(im.convert('RGB'),Image.open(ROOT/'art/guides/story_card.png').convert('RGB'),.35).save(out/f"{job['id']}-guide.jpg",quality=90)
        rr=[r for r in records if r['id']==job['id']];r=next(r for r in reversed(rr) if r.get('selected',True))
        page += [f"## {job['id']} — draft",'',f"![{job['id']}](../../{job['dest']})",'',f"![16:9 crop](wave-06/{job['id']}-16by9.jpg)",'',f"![Guide overlay at 35%](wave-06/{job['id']}-guide.jpg)",'','**Flags:** '+('; '.join(r.get('flags',[])) or 'None recorded.'),'','<details><summary>Prompt and references</summary>','','```text',r['prompt'],'```','','References: '+', '.join('`'+p+'`' for p in r['refs']),'','</details>','']
    if any(j['view']=='base' for j in jobs):
        dest=ROOT/'art/video-refs/frames/story_ending.jpg';dest.parent.mkdir(parents=True,exist_ok=True)
        Image.open(ROOT/'public/assets/scenes/story_ending.webp').convert('RGB').save(dest,quality=92)
        page += ['## story_ending — existing second clip frame','','JPEG copy exported unchanged from the existing game art.','','![Harbor ending](../video-refs/frames/story_ending.jpg)','']
    write(mp,m);write(ROOT/'art/review/wave-06-qa.json',qa)
    (ROOT/'art/review/wave-06.md').write_text('\n'.join(page),encoding='utf8')
    print(f'Exported {len(qa)} of {len(jobs)} generated outputs.')
def validate():
    jobs=json.loads((TOOLS/'wave06-jobs.json').read_text())
    records=json.loads((TOOLS/'wave06-records.json').read_text())
    qa=json.loads((ROOT/'art/review/wave-06-qa.json').read_text())
    assert len(jobs)==len(qa)==23
    assert len(list((ROOT/'art/video-refs').glob('*/front.jpg')))==7
    for job in jobs:
        selected=[r for r in records if r['id']==job['id'] and r['view']==job['view'] and r.get('selected',True)]
        assert len(selected)==1,(job['id'],job['view'],'selected count')
        assert max(r['attempt'] for r in records if r['id']==job['id'] and r['view']==job['view'])<=3
        path=ROOT/job['dest'];im=Image.open(path)
        assert im.size==tuple(job['size']) and im.mode=='RGB',(path,im.size,im.mode)
        assert path.stat().st_size<=(500*1024 if job['view']=='base' else 700000)
        if job['view']=='base':
            m=json.loads((ROOT/'public/assets/manifest.json').read_text())['assets'][job['id']]
            assert m['status']=='draft' and m['wave']==6 and m['base']['src']==job['dest'].removeprefix('public/assets/')
    for id in ['story_crystal_remade','story_ending','story_jumble_next']:
        assert Image.open(ROOT/f'art/video-refs/frames/{id}.jpg').size==(1536,1024)
    page=ROOT/'art/review/wave-06.md'
    for link in re.findall(r'\]\(([^)]+)\)',page.read_text(encoding='utf8')):
        assert (page.parent/link).resolve().exists(),link
    old=json.loads(__import__('subprocess').check_output(['git','show','8bc5401:public/assets/manifest.json'],cwd=ROOT))
    current=json.loads((ROOT/'public/assets/manifest.json').read_text())
    for id,entry in old['assets'].items():assert current['assets'][id]==entry,('preexisting manifest modified',id)
    out=Image.new('RGB',(1536,1792),(228,230,234))
    for n,id in enumerate(IDS):
        im=Image.open(ROOT/f'art/review/wave-06/{id}-refs.jpg').resize((512,256),Image.Resampling.LANCZOS)
        out.paste(im,(n%3*512,n//3*600))
    out.save(RAW/'refs-inspection.jpg',quality=90)
    print(f'PASS: 23 generated exports, 24 upload JPEGs, 7 triptychs, review links, draft scene entries and unchanged existing manifest. {len(records)} raw attempts retained.')
if __name__=='__main__':
    {'prepare':prepare,'frames':frames,'export':export,'validate':validate}[sys.argv[1]]()
