import re,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
wave=(root/'art/waves/wave-02-ui-and-depth.md').read_text(encoding='utf8')
style=re.findall(r'```text\n(.*?)\n```',(root/'art/STYLE.md').read_text(encoding='utf8'),re.S)
prod=(root/'art/PRODUCTION.md').read_text(encoding='utf8')
blocks=re.findall(r'```text\n(.*?)\n```',wave,re.S)
templates=re.findall(r'```text\n(.*?)\n```',prod,re.S)
guide='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
anchors=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
jobs=[]
def add(id,slot,dest,asset,size='1024x1024',kind='ui',refs=None,guidefile=None,grid=None,mode='single',names=None):
    addon=style[3] if kind=='fx' else style[2] if mode=='scene' else style[1]
    if mode=='foreground':addon='Render this foreground parallax layer on a fully transparent background (PNG with alpha). Preserve the full canvas; everything outside the designated edge regions stays transparent.'
    rules=style[4]
    if id=='ui_logo':rules=rules.replace('No text, letters, numbers, logos, watermarks, signatures, borders or user interface, unless the prompt asks for glowing magic runes.','The only text is CRYSTAL TITANS and THE SUNDERED ISLES, spelled exactly like that.')
    references=list(refs if refs is not None else anchors)
    if guidefile:references.append('art/guides/'+guidefile+'.png');asset+='\n\n'+guide
    extra='\n\nOUTPUT: '+size+'. '+('Opaque pure black background.' if kind=='fx' else 'Opaque painting.' if mode=='scene' else 'Genuine transparent alpha background.')
    jobs.append(dict(id=id,slot=slot,dest=dest,size=size,kind=kind,refs=references,guide=guidefile,grid=grid,mode=mode,names=names,transparent=kind!='fx' and mode!='scene',prompt='\n\n'.join([style[0],addon,asset+extra,rules])))
names=['strike','fire','cast','lash','potion','swap','guard','overdrive','summon','menu','back','hint','talk','shard','capture','star']
icons=re.search(r'> \*\*strike\*\*:(.*?)\n',wave).group(0).lstrip('> ')
icon_template=next(t for t in templates if t.startswith('A sheet of 16 game icons'))
fx_template=next(t for t in templates if t.startswith('A 16-frame animation'))
add('ui_icons_commands','sheet','ui/ui_icons_commands.webp',icon_template.replace('[the list from the wave file]',icons),guidefile='icon_sheet',grid=[4,4],mode='icons',names=names)
add('ui_frame','base','ui/ui_frame.webp',blocks[0],guidefile='frame_9slice',mode='frame')
add('ui_cursor','base','ui/ui_cursor.webp',blocks[1])
add('ui_logo','base','ui/ui_logo.webp',blocks[2],size='1536x1024')
for id,prompt in re.findall(r'\| ☐ \| `(fiend_[^`]+|boss_geode_titan)` \| (.*?) \|',wave):
    folder='bosses' if id.startswith('boss') else 'fiends'
    add(id,'portrait',f'{folder}/{id}/portrait.webp',prompt+' Head and shoulders, three-quarters toward the RIGHT; eyes and mouth centered around (512,400) inside the guide circle. No circles, guide marks or typography.',kind='boss' if folder=='bosses' else 'fiend',refs=[f'public/assets/{folder}/{id}/base.webp'],guidefile='portrait',mode='portrait')
for id,block in [('bg_jungle_ruins',3),('bg_crystal_canyon',4)]:
    add(id,'fg',f'backgrounds/battle/{id}_fg.webp',blocks[block],size='1536x1024',kind='background',refs=[f'public/assets/backgrounds/battle/{id}.webp'],guidefile='battle_foreground',mode='foreground')
add('bg_shipwreck_cove','base','backgrounds/battle/bg_shipwreck_cove.webp',blocks[5],size='1536x1024',kind='background',refs=anchors[:1],guidefile='battle_stage',mode='scene')
add('bg_shipwreck_cove','fg','backgrounds/battle/bg_shipwreck_cove_fg.webp',blocks[6],size='1536x1024',kind='background',refs=['public/assets/backgrounds/battle/bg_shipwreck_cove.webp'],guidefile='battle_foreground',mode='foreground')
for slot,block in [('roar',7),('attack',8)]:
    add('titan_starter',slot,f'titans/titan_starter/{slot}.webp',blocks[block],size='1024x1536',kind='titan',refs=['public/assets/titans/titan_starter/base.webp'])
for id,prompt in re.findall(r'\| ☐ \| `(fx_[^`]+)` \| (.*?) \|',wave):
    add(id,'sheet',f'fx/{id}.webp',prompt+'\n\n'+fx_template,kind='fx',grid=[4,4],mode='fx')
assert len(jobs)==20,len(jobs)
(root/'tools/art/wave02-jobs.json').write_text(json.dumps(jobs,indent=2),encoding='utf8')
print(json.dumps(jobs))
