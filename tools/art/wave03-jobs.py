import re,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
wave=(root/'art/waves/wave-03-exploration.md').read_text(encoding='utf8')
style=re.findall(r'```text\n(.*?)\n```',(root/'art/STYLE.md').read_text(encoding='utf8'),re.S)
prod=(root/'art/PRODUCTION.md').read_text(encoding='utf8')
templates=re.findall(r'```text\n(.*?)\n```',prod,re.S)
guide='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
anchors=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
jobs=[]
def add(id,slot,dest,asset,size='1024x1024',kind='prop',refs=None,guidefile=None,grid=None,mode='single',names=None,frames=None,light=None):
    references=list(anchors if refs is None else refs)
    if guidefile:references.append('art/guides/'+guidefile+'.png');asset+='\n\n'+guide
    jobs.append(dict(id=id,slot=slot,dest=dest,size=size,kind=kind,refs=references,guide=guidefile,grid=grid,mode=mode,names=names,frames=frames,light=light,transparent=mode!='scene',prompt='\n\n'.join([style[0],style[2] if mode=='scene' else style[1],asset+'\n\nOUTPUT: '+size+'. '+('Opaque painting.' if mode=='scene' else 'Genuine transparent alpha background.'),style[4]])))
blocks=re.findall(r'```text\n(.*?)\n```',wave,re.S)
add('npc_jumble','base','characters/npc_jumble/base.webp',blocks[0],size='1024x1536',kind='npc')
expression=next(t for t in templates if t.startswith('An expression sheet'))
asset=re.search(r'- \*\*Asset prompt:\*\* "(.*?)"',wave).group(1)
add('npc_jumble','portraits','characters/npc_jumble/portraits.webp',asset+'\n\n'+expression,size='1536x1024',kind='npc',refs=['public/assets/characters/npc_jumble/base.webp'],guidefile='expression_sheet',grid=[3,2],mode='portraits',frames=dict(neutral=0,laughing=1,angry=2,shocked=3,smug=4,worried=5))
creature=next(t for t in templates if t.startswith('A sprite sheet for a 2D turn-based battle game: the SAME creature'))
creature=creature[:creature.index('Top row:')]+blocks[1]+' Match the attached creature reference exactly.'
add('mascot_monkey','field','characters/mascot_monkey/field.webp',creature,kind='mascot',refs=['public/assets/characters/mascot_monkey/base.webp'],guidefile='creature_sheet_2x2',grid=[2,2],mode='field',frames=dict(idle=0,hold=1,raspberry=2,run=3))
walk=next(t for t in templates if t.startswith('A side-view walk cycle'))
for id,desc in re.findall(r'\| ☐ \| `(ally_.*?)` \| (.*?) \|',wave):
    add(id,'walk',f'characters/{id}/walk.webp',desc+'\n\n'+walk,size='1536x1024',kind='ally',refs=[f'public/assets/characters/{id}/base.webp',f'public/assets/characters/{id}/battle.webp'],guidefile='walk_cycle',grid=[4,2],mode='walk',frames=8)
objaddon="Seen from a slightly raised three-quarter front view, as if from a person's standing eye height a few steps away. Lit like the attached background: same sun direction, color and warmth. Only the object, standing on nothing: no ground patch, no scenery, no cast shadow."
for section,bgid in [('Shipwreck Cove','bg_shipwreck_cove'),('The Temple Ruins','bg_jungle_ruins'),('The Crystal Canyon','bg_crystal_canyon')]:
    part=wave.split('### '+section)[1].split('\n---')[0].split('\n### ')[0]
    for id,size,desc in re.findall(r'\| ☐ \| `(prop_.*?)` \| `(.*?)` \| (.*?) \|',part):
        light='public/assets/backgrounds/battle/'+bgid+'.webp'
        refs=anchors+[light]
        if id in ['prop_chest_open','prop_sage_gate_open']:refs.append('public/assets/props/'+id.removesuffix('_open')+'.webp')
        add(id,'base','props/'+id+'.webp',desc+'\n\n'+objaddon,size=size,refs=refs,guidefile='prop_view',light=light)
icon=next(t for t in templates if t.startswith('A sheet of 16 game icons'))
for id in ['icons_items','ui_icons_explore']:
    part=wave.split('### ☐ `'+id+'`')[1].split('---')[0].split('### ☐')[0]
    listing=re.search(r'> (.*?)\n',part).group(1)
    names=re.findall(r'\*\*(.*?)\*\*:',listing)
    template=icon.replace('[the list from the wave file]',listing)
    if id=='icons_items':template=template.replace('glowing crystal emblem set in a dark metal rim','painted inventory item on a soft circular glow, no rim')
    refs=anchors+(['public/assets/ui/ui_icons_commands.webp'] if id=='ui_icons_explore' else [])
    add(id,'sheet',('icons/' if id=='icons_items' else 'ui/')+id+'.webp',template,kind='icons' if id=='icons_items' else 'ui',refs=refs,guidefile='icon_sheet',grid=[4,4],mode='icons',names=names)
for id,desc in re.findall(r'\| ☐ \| `(story_.*?)` \| (.*?) \|',wave):
    refs=anchors+(['public/assets/characters/npc_jumble/base.webp'] if id=='story_galleon' else [])
    add(id,'base','scenes/'+id+'.webp',desc,size='1536x1024',kind='scene',refs=refs,guidefile='story_card',mode='scene')
assert len(jobs)==29,len(jobs)
(root/'tools/art/wave03-jobs.json').write_text(json.dumps(jobs,indent=2),encoding='utf8')
print('\n'.join(j['id']+'/'+j['slot'] for j in jobs))
