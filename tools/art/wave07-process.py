"""Reference boards and delivery exports for the opening paintings."""
import json, re, shutil, sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'art/raw/wave-07'
IDS = ['story_deck', 'story_galleon_night', 'story_fall']
def board(paths, target):
    out = Image.new('RGB', (1536, 768*((len(paths)+1)//2)), '#232730')
    for n, path in enumerate(paths):
        im = Image.open(ROOT/'public/assets'/path).convert('RGBA')
        im.thumbnail((744,744), Image.Resampling.LANCZOS)
        out.paste(im,(n%2*768+(768-im.width)//2,n//2*768+(768-im.height)//2),im)
    out.save(target)
def prepare():
    RAW.mkdir(parents=True, exist_ok=True)
    board(['anchors/key_art.webp','anchors/cast_lineup.webp'],RAW/'anchors.png')
    for id, chars, scenes in [
        ('story_deck',['ally_gunner','ally_knight','tutor_droid','mascot_monkey'],['story_albatross','story_deck']),
        ('story_galleon_night',['ally_knight','ally_gunner','tutor_droid','npc_jumble'],['story_galleon','story_albatross','story_galleon_night']),
        ('story_fall',['ally_knight','tutor_droid','ally_gunner'],['story_crash','story_albatross'])]:
        dest=RAW/id; dest.mkdir(exist_ok=True)
        board([f'characters/{c}/base.webp' for c in chars],dest/'characters.png')
        poses=[f'characters/{c}/{p}.webp' for c in chars for p in ['battle','field'] if (ROOT/'public/assets'/f'characters/{c}/{p}.webp').exists()]
        board(poses,dest/'poses.png')
        board([f'scenes/{s}.webp' for s in scenes],dest/'scenes.png')
        if id != 'story_fall':
            shutil.copy2(ROOT/'public/assets/scenes'/f'{id}.webp',dest/'stand-in.webp')
def deliver():
    jobs=json.loads((ROOT/'tools/art/wave07-jobs.json').read_text(encoding='utf8'))
    manifest_path=ROOT/'public/assets/manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf8'))
    review=['# Wave 07 review','', 'All three opening paintings are **draft**, pending parent and child approval. Made with the built-in image tool. Night flows into the first gold of dawn.', '', 'The clean full-frame and 1920×1080 JPEGs are in [video frames](../video-refs/frames/). The shaded review crops below mark the narration strip only; upload frames contain no overlay.', '']
    qa={}
    for job in jobs:
        id=job['id']; im=Image.open(RAW/id/'selected.png').convert('RGB').resize((1536,1024),Image.Resampling.LANCZOS)
        output=ROOT/'public/assets/scenes'/f'{id}.webp'
        quality=86
        while True:
            im.save(output,quality=quality,method=6)
            if output.stat().st_size<=500*1024: break
            quality-=2
            if quality<60: raise ValueError(f'{id}: exceeds budget')
        frames=ROOT/'art/video-refs/frames';frames.mkdir(parents=True,exist_ok=True)
        im.save(frames/f'{id}.jpg',quality=92)
        crop=im.crop((0,80,1536,944)).resize((1920,1080),Image.Resampling.LANCZOS)
        crop.save(frames/f'{id}-16x9.jpg',quality=92)
        overlay=Image.new('RGBA',crop.size,(0,0,0,0));draw=ImageDraw.Draw(overlay)
        top=round((.71*1024-80)*1.25); bottom=round((.87*1024-80)*1.25)
        draw.rectangle((0,top,1919,bottom),fill=(35,55,100,120),outline=(250,200,80,255),width=3)
        marked=Image.alpha_composite(crop.convert('RGBA'),overlay).convert('RGB')
        dest=ROOT/'art/review/wave-07';dest.mkdir(parents=True,exist_ok=True)
        marked.save(dest/f'{id}-story-box.jpg',quality=90)
        manifest['assets'][id]={'kind':'scene','wave':7,'status':'draft','base':{'src':f'scenes/{id}.webp','w':1536,'h':1024},'source':{'wave_file':'art/waves/wave-07-opening.md','model':'built-in image generation','date':'2026-10-12'}}
        qa[id]={'dimensions':[1536,1024],'opaque':True,'bytes':output.stat().st_size,'webp_quality':quality,'video_crop':[0,80,1536,944],'video_dimensions':[1920,1080],'visual_notes':job['qa']}
        review += [f'## {id} — draft','',f'![{id}](../../public/assets/scenes/{id}.webp)','',f'![16:9 crop with narration strip marked](wave-07/{id}-story-box.jpg)','',job['qa'],'']
        if id in IDS[:2]: review += [f'[Original stand-in for comparison](wave-07/{id}-stand-in.webp)','']
        if id=='story_deck': review += ['Crystal center: **45.3% across, 57% down** (approximately pixel 696, 584). Slightly left of the requested 50%; use this measured position for the glow. The grate bottom is approximately 65% down, above the narration strip.','']
        review += ['<details><summary>Selected prompt and reference boards</summary>','','```text',job.get('selected_prompt',job['prompt']),'```','','References: '+', '.join(job['references']), '', '</details>','']
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    (ROOT/'art/review/wave-07.md').write_text('\n'.join(review),encoding='utf8')
    (ROOT/'art/review/wave-07-qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf8')
    wave=ROOT/'art/waves/wave-07-opening.md';text=wave.read_text(encoding='utf8')
    for id in IDS: text=text.replace(f'| ☐ | `{id}`',f'| ☑ | `{id}`')
    text += '\n- 2026-10-12: All three paintings generated, exported, and registered as draft. See `art/review/wave-07.md` for framing QA and any visual flags. Original stand-ins preserved in the review folder for comparison.\n'
    wave.write_text(text,encoding='utf8')
    for id in IDS[:2]: shutil.copy2(RAW/id/'stand-in.webp',ROOT/'art/review/wave-07'/f'{id}-stand-in.webp')
    print(json.dumps(qa,indent=2))
if __name__ == '__main__':
    deliver() if 'deliver' in sys.argv else prepare()
