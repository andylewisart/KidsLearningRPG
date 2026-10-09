import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[2]
wave=(root/'art/waves/wave-04-scenes.md').read_text(encoding='utf8')
style=(root/'art/STYLE.md').read_text(encoding='utf8')
blocks=re.findall(r'```text\n(.*?)\n```',style,re.S)
master,sprite,scene,effects,rules=blocks
guide='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
layout=json.loads((root/'art/guides/explore-layouts.json').read_text())
anchors=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
config=[('scene_cove','bg_shipwreck_cove',['chest','signpost','tide_pool','bottle','sage_gate']),('scene_temple','bg_jungle_ruins',['glyph_wall','stone_frog','pillar']),('scene_temple_hall',None,['word_cage']),('scene_canyon','bg_crystal_canyon',['airship_wreck','crystal_ledge','lair']),('scene_grotto',None,['shrine'])]
common=re.search(r'\*\*Add this to every scene prompt:\*\* "(.*?)"',wave).group(1)
jobs=[]
for id,bg,props in config:
 text=re.search(r'### `'+id+r'`:.*?```text\n(.*?)\n```',wave,re.S).group(1)
 refs=anchors+([f'public/assets/backgrounds/battle/{bg}.webp'] if bg else [])+[f'public/assets/props/prop_{p}.webp' for p in props]
 if id=='scene_temple_hall':refs+=['public/assets/characters/ally_spellwright/base.webp']
 refs+=['art/guides/explore_'+id.removeprefix('scene_')+'.png']
 specs='\nExact object positions in a 1536x1024 painting; obey these boxes, never draw the boxes: '+json.dumps({k:v['box'] for k,v in layout[id]['things'].items() if v['kind']!='keep'})
 specs+='\nAll keep-clear character spots stay empty. Foreground ground remains broad, flat and empty, with no large clutter. Do not paint a monkey cameo: the game adds the monkey as a sprite. The rest crystal is a waist-high, softly glowing teal crystal growing from a small carved stone base, with a little pool of teal light on the ground around it.'
 if id=='scene_temple_hall':specs+=' The only painted character is the explicitly requested tiny scholar INSIDE the cage; all other character spots are empty.'
 jobs.append(dict(id=id,section='A',dest=f'public/assets/scenes/explore/{id}.webp',refs=refs,transparent=False,prompt='\n\n'.join([master,scene,text,common,specs,guide,rules]),battle=bg or ('bg_temple_hall' if id=='scene_temple_hall' else 'bg_tide_grotto')))
(root/'tools/art/wave04-jobs.json').write_text(json.dumps(jobs,indent=2),encoding='utf8')
