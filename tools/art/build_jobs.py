import re,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
style=re.findall(r'```text\s*\n(.*?)```',(root/'art/STYLE.md').read_text(),re.S)
wave=(root/'art/waves/wave-01-first-battle.md').read_text()
prod=(root/'art/PRODUCTION.md').read_text()
templates=re.findall(r'```text\s*\n(.*?)```',prod,re.S)[1:]
jobs=[]
def add(id,slot,prompt,size,block=1,refs=None,candidates=1,grid=None):
    kind='ally' if id.startswith('ally') else 'tutor' if id=='tutor_droid' else 'mascot' if id=='mascot_monkey' else 'fiend' if id.startswith('fiend') else 'boss' if id.startswith('boss') else 'titan' if id.startswith('titan') else 'background' if id.startswith('bg_') else 'fx' if id.startswith('fx_') else 'icons'
    folder={'ally':'characters','tutor':'characters','mascot':'characters','fiend':'fiends','boss':'bosses','titan':'titans'}.get(kind)
    dest=f'{folder}/{id}/{slot}.webp' if folder else f'backgrounds/battle/{id}.webp' if kind=='background' else f'{kind}/{id}.webp'
    for v in range(1,candidates+1):
        jobs.append(dict(id=id,slot=slot,kind=kind,dest=dest,size=size,transparent=block==1,grid=grid,variant=v,refs=refs or ['key_art','cast_lineup'],prompt='\n\n'.join([style[0].strip(),style[block].strip(),prompt.strip(),f'Output dimensions: {size}. Highest quality. Reference images are identity/style guides, not edit targets. Match character details exactly; the written description controls colors and asymmetry. Keep a generous clear margin around each subject.',style[4].strip()])))
descs={}
for id in ['ally_knight','ally_gunner','ally_spellwright','ally_titancaller','tutor_droid','mascot_monkey']:
    sec=wave.split(f'`{id}`',1)[1]
    descs[id]=re.search(r'```text\s*\n(.*?)```',sec,re.S)[1]
    add(id,'base',descs[id],'1024x1024' if id in ['tutor_droid','mascot_monkey'] else '1024x1536',candidates=2)
for id in list(descs)[:-1]:
    if id!='tutor_droid':add(id,'battle',descs[id]+'\n'+templates[0],'1536x1024',refs=[id],grid=[3,2])
    extra=' Show the whole droid in each cell. Lens expressions: neutral; happy crescent; angry red; shocked wide; smug half-lidded; worried flickering.' if id=='tutor_droid' else ''
    add(id,'portraits',descs[id]+'\n'+templates[1]+extra,'1536x1024',refs=[id],grid=[3,2])
for id in ['fiend_scrap_raptor','fiend_volt_jelly','fiend_magnet_beetle','fiend_ink_slime','fiend_dominion_drone']:
    desc=re.search(r'```text\s*\n(.*?)```',wave.split(f'`{id}`',1)[1],re.S)[1]
    add(id,'base',desc,'1024x1024')
    add(id,'battle',desc+'\n'+templates[2],'1024x1024',refs=[id],grid=[2,2])
boss=re.search(r'```text\s*\n(.*?)```',wave.split('### The boss:',1)[1],re.S)[1].split('POSE:')[0]
for pose,action in [('base','standing, roaring'),('attack','tail club swinging down mid-strike'),('hurt','recoiling, cracks flaring bright'),('enraged','rearing up, every crystal blazing red-violet')]:
    add('boss_geode_titan',pose,boss+'\nPOSE: '+action,'1024x1024',refs=None if pose=='base' else ['boss_geode_titan'],candidates=2 if pose=='base' else 1)
add('boss_geode_titan','splash',boss+'\nThe titan bursting out of a crystal canyon wall in a shower of shards, three tiny heroes in foreground for scale. Hide a small three-eyed captain-hat monkey in the scene.','1536x1024',block=2,refs=['boss_geode_titan','key_art'])
desc=re.search(r'```text\s*\n(.*?)```',wave.split('### The starter Titan:',1)[1],re.S)[1]
add('titan_starter','base',desc,'1024x1536',candidates=2)
for id in ['bg_jungle_ruins','bg_crystal_canyon']:
    desc=re.search(r'```text\s*\n(.*?)```',wave.split(f'`{id}`',1)[1],re.S)[1]
    add(id,'base',desc,'1536x1024',block=2)
for id,desc in re.findall(r'\| ☐ \| `(fx_\w+)` \| ([^\n|]+) \|',wave):add(id,'sheet',desc+'\n'+templates[4],'1024x1024',block=3,grid=[4,4])
icons=wave.split('The icons, in reading order:',1)[1].split('\n> ',1)[1].split('\n',1)[0]
add('icons_elements_status','sheet',templates[5].replace('[the list from the wave file]',icons),'1024x1024',grid=[4,4])
(root/'tools/art/jobs.json').write_text(json.dumps(jobs,indent=2))
print(json.dumps(jobs))
