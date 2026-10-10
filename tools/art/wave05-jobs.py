"""Compose exact Wave05 prompts and reference lists from the production spec."""
import json,re
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
style=re.findall(r'```text\n(.*?)```',(ROOT/'art/STYLE.md').read_text(encoding='utf8'),re.S)
wave=(ROOT/'art/waves/wave-05-polish.md').read_text(encoding='utf8')
blocks=re.findall(r'```text\n(.*?)```',wave,re.S)
anchors=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
guide='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
out=ROOT/'art/raw/wave-05';out.mkdir(parents=True,exist_ok=True)
board=Image.new('RGB',(1536,1024))
for i,p in enumerate(anchors):board.paste(Image.open(ROOT/p).convert('RGB').resize((768,512)),(i*768,256))
board.save(out/'style-anchors.png')
jobs=[]
def add(id,section,dest,body,refs,sprite=False,size=(1536,1024),slot='base',toolrefs=None):
    prompt='\n\n'.join([style[0].strip(),style[1 if sprite else 2].strip(),body.strip(),style[4].strip()])
    jobs.append(dict(id=id,section=section,dest='public/assets/'+dest,slot=slot,size=list(size),transparent=sprite,prompt=prompt,refs=refs,toolRefs=toolrefs or refs))
refs=anchors+['public/assets/scenes/story_galleon.webp','public/assets/scenes/story_albatross.webp','public/assets/characters/npc_jumble/base.webp','art/guides/story_card.png']
add('story_ram','A','scenes/story_ram.webp',blocks[0]+'\n'+guide+'\nExactly1536x1024. Collision and four crystal shards above the narration strip, whole ships readable. Exactly four large shards.',refs,toolrefs=['art/raw/wave-05/style-anchors.png']+refs[2:])
add('title_art','B','scenes/title_art.webp',blocks[1]+'\nExactly1536x1024. Edit only Maren, her summoning light and the Titan response; preserve original pixels everywhere else.',[anchors[0],'public/assets/characters/ally_titancaller/base.webp','public/assets/titans/titan_starter/base.webp'])
template='A transparent sprite sheet with exactly four full-body poses in a2x2 grid of512px square cells. Output1024x1024. No grid, borders or labels. All limbs, weapons and effects contained inside their own cells with30px gutters. Match the old battle sheet standing size. Feet baseline481px inside each cell.'
for i,id in enumerate(['ally_gunner','ally_titancaller']):
    refs=anchors+[f'public/assets/characters/{id}/base.webp',f'public/assets/characters/{id}/battle.webp','art/guides/creature_sheet_2x2.png']
    add(id,'C',f'characters/{id}/field.webp',template+'\n'+blocks[2+i]+'\n'+guide,refs,True,(1024,1024),'field')
add('titan_starter','D','titans/titan_starter/attack.webp',blocks[4]+'\nOutput1024x1024, fully transparent. Body retains original relative size and position. The entire beam ends as scattered tiny droplets well before any edge, at least40px transparent margin around everything.', ['public/assets/titans/titan_starter/attack.webp','public/assets/titans/titan_starter/base.webp','public/assets/titans/titan_starter/roar.webp']+anchors,True,(1024,1024),'attack')
for id,keep,remove in re.findall(r'\| ☐ \| `(scene_\w+)` \| (.*?) \| (.*?) \|',wave):
    body=f'Edit the first attached finished scene. Keep every pixel of these kept parts EXACTLY unchanged: {keep} Remove these near parts and paint the distant view continuing behind where they were: {remove} Same framing, light, colors and details. No speckle, blur or color shift in kept parts. Continue cleanly at least150px behind removed edges. No near fragments left. Output1536x1024 opaque.'
    add(id,'E',f'scenes/explore/{id}_far.webp',body,[f'public/assets/scenes/explore/{id}.webp']+anchors,slot='far')
(ROOT/'tools/art/wave05-jobs.json').write_text(json.dumps(jobs,indent=2)+'\n',encoding='utf8')
print('Prepared',len(jobs),'Wave05 jobs')
