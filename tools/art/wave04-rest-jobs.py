import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
style=re.findall(r'```text\n(.*?)\n```',(ROOT/'art/STYLE.md').read_text(encoding='utf8'),re.S)
master,sprite,scene,effects,rules=style
wave=(ROOT/'art/waves/wave-04-scenes.md').read_text(encoding='utf8')
prod=(ROOT/'art/PRODUCTION.md').read_text(encoding='utf8')
guide="The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text."
jobs=[]
for sid,states in [('scene_cove',['chest_open','bottle_gone','fish_gone','gate_open']),('scene_temple',['door_open']),('scene_temple_hall',['cage_open']),('scene_grotto',['shrine_awake'])]:
    section=wave.split('### `'+sid+'`:')[1].split('\n### ')[0].split('\n---')[0]
    for state in states:
        change=re.search(r'\| `'+state+r'` \| (.*?) \|',section).group(1).replace('**','')
        jobs.append(dict(id=sid+'__'+state,scene=sid,state=state,section='B',dest=f'art/scenes/{sid}/{state}.webp',transparent=False,refs=[f'public/assets/scenes/explore/{sid}.webp'],prompt='\n\n'.join([master,scene,'Edit the attached finished scene. Change only this one object: '+change+' Keep every other pixel of the picture exactly the same: same framing, light, colors and details. Do not move or resize the object. Keep the edit tightly confined to the object and its immediate shadow. OUTPUT1536x1024 opaque.',rules])))
for row in re.findall(r'\| ☐ \| `(bg_.*?)` \| (.*?) \| (.*?) \|',wave):
    id,arena,fg=row;sid='scene_temple_hall' if id=='bg_temple_hall' else 'scene_grotto'
    anchors=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
    for slot,text in [('base',arena),('fg',fg)]:
        refs=anchors+[f'public/assets/scenes/explore/{sid}.webp']
        if slot=='fg':refs+=[f'public/assets/backgrounds/battle/{id}.webp']
        refs+=['art/guides/battle_'+('stage' if slot=='base' else 'foreground')+'.png']
        extra='Large broad empty arena floor below y614.4, perspective horizon y471. No exploration props, characters, cage, shrine or rest crystals. No foreground obstacles. ' if slot=='base' else 'Transparent1536x1024 layer. All pieces are cut out along their own outline and run off the canvas edge. Central red region in guide completely transparent. Never use a rectangle mask or fade at the allowed-area boundary. '
        jobs.append(dict(id=id,slot=slot,section='C',dest=f'public/assets/backgrounds/battle/{id}'+('_fg' if slot=='fg' else '')+'.webp',transparent=slot=='fg',refs=refs,prompt='\n\n'.join([master,sprite if slot=='fg' else scene,text+'\n'+extra+guide+' OUTPUT1536x1024.',rules])))
template=next(t for t in re.findall(r'```text\n(.*?)\n```',prod,re.S) if t.startswith('A sprite sheet for a 2D turn-based battle game:'))
for id,notes in re.findall(r'\| ☐ \| `(ally_.*?)` \| (.*?) \|',wave):
    refs=[f'public/assets/characters/{id}/base.webp',f'art/review/wave-04/{id}_battle_old.webp','art/guides/hero_battle_sheet.png']
    extra='In EVERY pose the hero faces LEFT, toward an enemy off to the left: body turned left, head turned left, eyes on the enemy, never looking at the viewer or to the right. The knocked-out pose lies flat on the ground at the bottom of its cell, on the same baseline as the feet in the other poses. Whole weapons and limbs stay inside each cell with 30px gutters. Preserve the existing standing height from the old sheet. Baseline y481 in each512px cell. Exactly1536x1024 transparent.'
    jobs.append(dict(id=id,slot='battle',section='D',dest=f'public/assets/characters/{id}/battle.webp',transparent=True,refs=refs,prompt='\n\n'.join([master,sprite,template,notes+'\n'+extra+'\n'+guide,rules])))
maptext=re.findall(r'```text\n(.*?)\n```',wave,re.S)[-1]
jobs.append(dict(id='map_driftwood',section='E',dest='public/assets/scenes/map/map_driftwood.webp',transparent=False,refs=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp','public/assets/scenes/story_crash.webp','art/raw/wave-04/map-place-references.png','art/guides/map_island.png'],prompt='\n\n'.join([master,scene,maptext+'\n'+guide+' OUTPUT1536x1024. Landmark centers: cove760,820; temple380,580; canyon1040,540; grotto1320,740; harbor800,230; volcano540,330; monkeyhead1170,250; observatory180,720; watchtower1350,420. Five visible natural unmarked trails in guide. No dotted or dashed roads, no labels, no Xs. Reference board only shows location designs; do not copy its arrangement.',rules])))
(ROOT/'tools/art/wave04-rest-jobs.json').write_text(json.dumps(jobs,indent=2)+'\n',encoding='utf8')
print(len(jobs),'remaining image jobs')
