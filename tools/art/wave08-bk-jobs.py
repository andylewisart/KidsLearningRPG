"""Build ordered production jobs for wave 08 B–K."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
STYLE=re.findall(r'```text\n(.*?)\n```',(ROOT/'art/STYLE.md').read_text(encoding='utf8'),re.S)
MASTER,SPRITE,SCENE,FX,RULES=STYLE
GUIDE='The attached guide image is a construction drawing: use it only for layout (where the floor, horizon, characters or cells are). Do not reproduce any of its lines, colors, shapes, labels or text.'
ANCHORS=['public/assets/anchors/key_art.webp','public/assets/anchors/cast_lineup.webp']
jobs=[]
def add(section,id,slot,desc,size=(1024,1024),grid=None,guide=None,refs=(),kind='npc',dest=None,transparent=True,**extra):
    prompt='\n\n'.join([MASTER,SPRITE if transparent else SCENE,desc+f'\n\nCanvas {size[0]}x{size[1]}. '+(GUIDE if guide else '')+' Match the attached reference\'s character exactly: same face, outfit, colors and weapon. Keep all bodies and props entirely inside their cells or frame. No accidental text or extra figures.',RULES])
    jobs.append(dict(key=id+'__'+slot,section=section,id=id,slot=slot,prompt=prompt,size=list(size),grid=grid,guide=guide,references=ANCHORS+list(refs)+([f'art/guides/{guide}.png'] if guide else []),kind=kind,dest=dest or f'characters/{id}/{slot}.webp',transparent=transparent,**extra))
prod=(ROOT/'art/PRODUCTION.md').read_text(encoding='utf8')
def template(heading): return re.search(re.escape(heading)+r'.*?```text\n(.*?)\n```',prod,re.S).group(1)
hero=template('### Hero battle sheet');walk=template('### Walk cycle');portrait=template('### Expression sheet');fiend=template('### Fiend battle sheet')
base=lambda id:f'public/assets/characters/{id}/base.webp'
add('B','ally_beastkeeper','battle','Tamsin Hollow, in the exact approved modest costume and long braids. Only Tamsin and her crook, no companion raptor in these cells. '+hero+' Every standing pose faces LEFT; the KO pose lies flat with her body resting on the baseline near the bottom of its cell.',(1536,1024),[3,2],'hero_battle_sheet',[base('ally_beastkeeper')],kind='ally',frames=dict(idle=0,attack=1,cast=2,hurt=3,ko=4,victory=5),facing='left')
add('B','ally_beastkeeper','walk','Tamsin Hollow, exact approved modest clothing and long braids. Only Tamsin and her crook; no companion raptor. '+walk,(1536,1024),[4,2],'walk_cycle',[base('ally_beastkeeper')],kind='ally',facing='right',frames=8,fps=10)
for id in ['ally_beastkeeper','npc_clamp','npc_hal','npc_keeper','npc_baker','npc_swordmaster']:
    desc=portrait
    frames=dict(neutral=0,laughing=1,angry=2,shocked=3,smug=4,worried=5)
    if id=='npc_clamp':
        desc=desc.replace('(1) neutral, (2) laughing, (3) angry. Bottom row: (4) shocked, (5) smug, (6) worried','(1) polite, (2) stamping with his stamp visible beside his face, (3) offended. Bottom row: (4) coldly furious, (5) smug, (6) flustered')
        frames=dict(polite=0,stamping=1,offended=2,furious=3,smug=4,flustered=5)
    add('B',id,'portraits',desc,(1536,1024),[3,2],'expression_sheet',[base(id)],kind='ally' if id.startswith('ally_') else 'npc',frames=frames)
add('B','tutor_droid','portraits_cozy','Kit the same round white tutor robot, wearing a knitted tea cozy in faded stripes with a pom-pom INSTEAD OF the pirate hat; the cozy sits crooked. Exactly two ceramic fins and one lens eye, never human hands. '+portrait,(1536,1024),[3,2],'expression_sheet',[base('tutor_droid'),'public/assets/characters/tutor_droid/portraits.webp'],kind='tutor',frames=dict(neutral=0,laughing=1,angry=2,shocked=3,smug=4,worried=5))
add('B','mascot_monkey','field_twohats','ONE full-body Pockets, the small three-eyed monkey, wearing his own navy tricorn and Kit\'s matching tricorn stacked on top, very pleased. Exactly THREE eyes, same furry face and curled tail. Both complete hats and tail inside the canvas. No other characters.',refs=[base('mascot_monkey'),base('tutor_droid')],kind='mascot')
# C: each stage is generated after the preceding stage's export.
pet_lines={
 'pet_raptor':('ice-blue','fiend_scrap_raptor',['Rivet: a dog-sized scrap-metal raptor with neat patched plates and a tiny tower shield strapped to one arm','A pony-sized rebuilt raptor with a shark-fin crest like Cade\'s pauldron','A war-raptor in polished steel with a crystal shield-crest']),
 'pet_jelly':('orange','fiend_volt_jelly',['A friendly jelly the size of a lantern with a little brass cap','A friendly jelly with brass fins and goggles','A storm-jelly like a floating airship buoy, with an orange crystal bell and lightning tendrils']),
 'pet_slime':('gold','fiend_ink_slime',['A friendly teacup-sized ink slime writing glowing magical glyphs in the air','A friendly ink slime wearing a quill like a hat, with a page-shaped tail','A small friendly ink dragon made of flowing magical script, with golden glyphs']),
 'pet_tide':('storm-violet',None,['A friendly sea-glass hermit crab with a little shrine bell for a shell','A friendly coral seahorse with a shell crest','A small friendly tide-serpent with reef growth along its back'])}
for line,(glow,original,stages) in pet_lines.items():
    for stage,desc in enumerate(stages,1):
        refs=([f'public/assets/fiends/{original}/base.webp'] if original else [])+([f'public/assets/characters/{line}_1/battle.webp'] if stage>1 else [])
        add('C',f'{line}_{stage}','battle',desc+f'. Stage {stage} of one evolving pet line; rebuilt, polished and cared for, with a small crystal HEART glowing {glow}. Stage 1 small and goofy, stage 2 sturdy and proud, stage 3 bigger and legendary. '+fiend.replace('idle, menacing','idle, content').replace('(2) attacking','(2) acting, performing its friendly special action').replace('(3) hurt, recoiling, (4) special attack, glowing with power','(3) happy, joyful, (4) hurt, startled but uninjured'),grid=[2,2],guide='creature_sheet_2x2',refs=refs,kind='mascot',frames=dict(idle=0,act=1,happy=2,hurt=3),facing='right')
# D: new fiend bases and matching battle sheets.
wave=(ROOT/'art/waves/wave-08-harbor.md').read_text(encoding='utf8').replace('☑','☐')
dsection=wave.split('## Section D:')[1].split('## Section E:')[0]
for id,desc in re.findall(r'### ☐ `(.*?)`.*?```text\n(.*?)\n```',dsection,re.S):
    refs=['public/assets/fiends/fiend_dominion_drone/base.webp'] if id=='fiend_caged_drone' else []
    add('D',id,'base',desc,refs=refs,kind='fiend',dest=f'fiends/{id}/base.webp',candidates=2)
    add('D',id,'battle',desc+'\n'+fiend,grid=[2,2],guide='creature_sheet_2x2',refs=[f'public/assets/fiends/{id}/base.webp'],kind='fiend',dest=f'fiends/{id}/battle.webp',frames=dict(idle=0,attack=1,hurt=2,special=3),facing='right')
boss_desc=re.search(r'## Section E:.*?```text\n(.*?)\n```',wave,re.S).group(1)
for slot in ['base','attack','hurt','enraged','portrait']:
    extra={'base':'Neutral menacing full-body stance.','attack':'The huge forward clamp lunges and siphons stolen light; all six legs and pipes remain on screen.','hurt':'Recoiling, tanks flicker, no wreckage or injuries.','enraged':'Tanks flare with stolen white-gold light, legs spread aggressively; exactly six legs, whole claw.','portrait':'Head-and-cockpit portrait, inspector visible, facing three-quarters right; no giant body needed.'}[slot]
    add('E','boss_drain_engine',slot,boss_desc+' '+extra,guide='portrait' if slot=='portrait' else None,refs=[base('npc_clamp')]+(['public/assets/bosses/boss_drain_engine/base.webp'] if slot!='base' else []),kind='boss',dest=f'bosses/boss_drain_engine/{slot}.webp',pose=slot in ['attack','hurt','enraged'],candidates=2 if slot=='base' else 1)
titan_desc=re.search(r'## Section F:.*?```text\n(.*?)\n```',wave,re.S).group(1)
for slot in ['base','roar','attack']:
    desc=titan_desc+' '+{'base':'Full body, folded or partially opened wings, all feathers and tail inside the portrait frame.','roar':'Full body with wings spread, beak open in a majestic cry. Entire wing tips and tail inside canvas.','attack':'Full body sweeping white-gold lighthouse beams from its chest and eyes. Beams fan and end in radiant motes INSIDE the frame, no hard cutoff. Entire wings and tail visible.'}[slot]
    add('F','titan_beaconwing',slot,desc,size=(1024,1536) if slot=='base' else (1024,1024),refs=[] if slot=='base' else ['public/assets/titans/titan_beaconwing/base.webp'],kind='titan',dest=f'titans/titan_beaconwing/{slot}.webp',pose=slot!='base')
# G: scenes, exact-layout guides, state variants, arenas and map.
layouts=json.loads((ROOT/'art/guides/explore-layouts.json').read_text(encoding='utf8'))
gsection=wave.split('## Section G:')[1].split('## Section H:')[0]
state_objects={'scene_harbor':{'clock_fixed':'tower','remembered':'town'},'scene_hal_shop':{'cozy_sold':'cozy'},'scene_biscuit':{'recipes_back':'book'},'scene_sword_dock':{'dock_won':'chair'},'scene_lighthouse':{'after':'tower'},'scene_lamp_room':{'grid':'ceiling','lit':'lens'}}
for id,time,desc,variants in re.findall(r'\| ☐ \| `(scene_.*?)` \| (.*?) \| (.*?) \| (.*?) \|',gsection):
    objects={k:{'box':v['box'],**({'ground':v['ground']} if v.get('ground') else {})} for k,v in layouts[id]['things'].items() if v['kind']!='keep'}
    states={k:{'object':v} for k,v in state_objects.get(id,{}).items()}
    if id=='scene_harbor':objects['town']={'box':[145,280,1390,785]}
    if id=='scene_lighthouse' and 'tower' not in objects: states['after']['object']=next(k for k in objects if k!='rest')
    ref=['public/assets/characters/mascot_monkey/base.webp']
    if id=='scene_harbor':ref+=['public/assets/scenes/story_ending.webp','public/assets/scenes/story_galleon.webp']
    desc=f'{time}. {desc}. One unified painterly exploration scene with all objects PAINTED IN, starting state. No foreground people; game draws them. A rest crystal and a tiny hidden three-eyed monkey. Keep walkable floor and character slots empty. Match the attached construction guide objects and their sizes, with figures at the 1.6x painted scale.'+'\nLayout pixel boxes: '+json.dumps(layouts[id]['things'])
    add('G',id,'base',desc,size=(1536,1024),guide='explore_'+id.removeprefix('scene_'),refs=ref,kind='explore',dest=f'scenes/explore/{id}.webp',transparent=False,objects=objects,states=states,battle='bg_lighthouse_rocks' if id in ['scene_lighthouse','scene_lamp_room'] else 'bg_harbor_docks')
    for state,obj in state_objects.get(id,{}).items():
        state_desc={'clock_fixed':'Set the clock hands correctly, with no readable numbers.','remembered':'Bells swinging, townspeople outside in modest all-ages clothes, bunting up.','cozy_sold':'Remove only the tea cozy; its hat stand remains empty.','recipes_back':'The same recipe pages now glow with abstract magical writing, no readable words.','dock_won':'The big crab is gone from the chair; the forge is lit.','after':'Claw marks on the lighthouse and the inspection barricade wrecked.','grid':'The old crystal\'s last light is caught by the lens, throwing a web of glowing nodes and paths across the ceiling.','lit':'The new teal Lore Crystal stands in the same cradle, blazing.'}[state]
        add('G',id,state,'EDIT the attached base painting. Change ONLY this state: '+state_desc+' Preserve camera, layout, every other object, colors and geometry pixel for pixel. No other repainting.',size=(1536,1024),refs=[f'public/assets/scenes/explore/{id}.webp'],kind='explore',dest=f'../../art/scenes/{id}/{state}.webp',transparent=False,variant=True)
for id,state,desc,obj in [('scene_cove','tide_out','The tide is out: sand extends farther and a sea-cave mouth shows under the old wreck.','wreck'),('scene_temple_hall','library_open','The tablets glow and a sealed library door stands open.','door'),('scene_canyon','parts','A propeller and brass Albatross figurehead are scattered where they can be found.','wreck')]:
    add('G',id,state,'EDIT ONLY the requested state in the existing painted scene: '+desc+' Preserve all other layout, objects, colors and camera exactly.',size=(1536,1024),guide='explore_'+id.removeprefix('scene_'),refs=[f'public/assets/scenes/explore/{id}.webp'],kind='explore',dest=f'../../art/scenes/{id}/{state}.webp',transparent=False,variant=True,state_object=obj)
for id,desc in [('bg_harbor_docks','Late morning on harbor docks made from old shipwreck planks; hull roofs, mast lampposts, turquoise harbor beyond, open dueling deck.'),('bg_lighthouse_rocks','Dusk on the broad rocky causeway beneath Driftwood lighthouse, dim blue lamp overhead, sea spray and fading gold horizon. Boss battle arena with ample flat stone floor.')]:
    add('G',id,'base',desc+' No people; tiny hidden three-eyed monkey. Follow stage guide, perspective and floor edge precisely.',size=(1536,1024),guide='battle_stage',kind='background',dest=f'backgrounds/battle/{id}.webp',transparent=False,floorEdge=.6)
    add('G',id,'fg','Transparent foreground parallax layer matching the attached arena: isolated dock posts, ropes and timber on harbor or rocky ledges and kelp on lighthouse coast, ONLY along the guide\'s outer allowed regions. Clear central stage. Each object runs off the appropriate image edge, natural hard object outlines, never rectangular cutoffs or fades.',size=(1536,1024),guide='battle_foreground',refs=[f'public/assets/backgrounds/battle/{id}.webp'],kind='background',dest=f'backgrounds/battle/{id}_fg.webp')
add('G','map_driftwood','harbor_open','EDIT the attached island map ONLY at its harbor landmark: show Driftwood Harbor as the real shipwreck-built pirate port with its lighthouse and trail fully open, not a teaser. Keep all other places, shorelines and trails identical. No text.',size=(1536,1024),guide='map_island',refs=['public/assets/scenes/map/map_driftwood.webp'],kind='map',dest='scenes/map/map_driftwood__harbor_open.webp',transparent=False,variant=True,map_variant=True)
# H/I/J/K.
add('H','grid_board','base','Deep night-blue space with very faint constellation lines, like light thrown across a ceiling. NO NODES, no planets, no symbols, no text: game draws all upgrade nodes.',size=(1536,1024),kind='ui',dest='ui/grid_board.webp',transparent=False)
node_names=['strength','health','move','pet_slot','weapon','skill_gate','start','calm_seas']
add('H','grid_nodes','sheet','One 4x4 sheet of 16 upgrade icons, equal 256px cells. First eight icons, reading order: strength, health, new move, pet slot, weapon, locked skill gate as crystal padlock, start node, Calm Seas as calm wave; dark UNLIT. Last eight cells repeat the same symbols lit in white-gold. Bold silhouettes, no lettering.',grid=[4,4],guide='icon_sheet',kind='ui',dest='ui/grid_nodes.webp',names=node_names+[n+'_lit' for n in node_names])
hero_ids=['ally_knight','ally_gunner','ally_spellwright','ally_titancaller','ally_beastkeeper']
add('H','grid_tokens','sheet','4x4 icon sheet: first five cells hold round tokens with faces Cade, Wren, Knox, Maren, Tamsin in that order, sixth a small glowing light mote. Only first six cells populated; ten remaining cells EMPTY transparent. Match individual hero faces exactly.',grid=[4,4],guide='icon_sheet',refs=[base(id) for id in hero_ids],kind='ui',dest='ui/grid_tokens.webp',count=6,names=['cade','wren','knox','maren','tamsin','light'])
add('I','weapons_ch2','sheet','One 4x4 icon sheet. First TEN cells: Cade crystal-edged sword, Cade sharkfin-crested blade; Wren brass cooling-fin blasters, Wren twin long-barrel storm blasters; Knox gold-clasp spellbook, Knox book with orbiting pages; Maren coral-crowned staff, Maren staff with living tide in its crystal; Tamsin brass-bound amber crook, Tamsin living branch crook with creature-shaped crystal. Last six cells EMPTY transparent. Only weapon icons, no people, no letters.',grid=[4,4],guide='icon_sheet',refs=[base(id) for id in hero_ids],kind='icons',dest='icons/weapons_ch2.webp',count=10,names=[id+'_'+str(step) for id in hero_ids for step in [1,2]])
jsection=wave.split('## Section J:')[1].split('## Section K:')[0]
story_refs={
 'story_harbor_arrival':[base(id) for id in hero_ids[:4]]+[base('tutor_droid'),'public/assets/scenes/explore/scene_harbor.webp'],
 'story_clamp_meets_jumble':[base('npc_clamp'),base('npc_jumble'),'public/assets/scenes/explore/scene_harbor.webp','public/assets/scenes/story_galleon.webp'],
 'story_keeper_climbs':[base('npc_keeper'),'public/assets/scenes/explore/scene_lighthouse.webp'],
 'story_logbook':['public/assets/scenes/explore/scene_lamp_room.webp'],
 'story_jumble_audit':[base('npc_clamp'),base('npc_jumble'),'public/assets/scenes/story_galleon.webp'],
 'story_engine_arrives':['public/assets/bosses/boss_drain_engine/base.webp',base('npc_clamp'),'public/assets/scenes/explore/scene_lighthouse.webp'],
 'story_beaconwing_wakes':['public/assets/titans/titan_beaconwing/base.webp','public/assets/scenes/explore/scene_lamp_room.webp'],
 'story_crystal_lit':['public/assets/scenes/explore/scene_lamp_room.webp','public/assets/scenes/explore/scene_harbor.webp'],
 'story_ch2_ending':['public/assets/titans/titan_beaconwing/base.webp',base('tutor_droid'),'public/assets/characters/tutor_droid/portraits_cozy.webp','public/assets/scenes/explore/scene_lighthouse.webp'],
 'story_jumble_smoke':['public/assets/scenes/story_galleon.webp',base('npc_jumble')]}
for id,desc,film in re.findall(r'\| ☐ \| `(story_.*?)` \| (.*?) \| (.*?) \|',jsection):
    add('J',id,'base',desc+'. '+('Characters large and clear, moment just before action begins, suitable as a film\'s first frame. ' if film=='yes' else '')+'Paint 1536x1024 with all faces, hats and key action inside the middle 16:9 crop and ABOVE narration strip at 71%-87% image height. Use the named time of day rather than master golden hour. No readable text; squiggles in the logbook only. Tiny hidden three-eyed monkey where appropriate.',size=(1536,1024),guide='story_card',refs=story_refs[id],kind='scene',dest=f'scenes/{id}.webp',transparent=False,video=film=='yes')
for id,desc in [('prop_logbook','An old brass-bound lighthouse logbook, resting open on the lamp-room desk; unreadable squiggles only, no actual letters.'),('prop_bottle_ch2','A new Captain Jumble message bottle in sea-green glass, cork and rolled blank parchment inside, lying on sand; isolated bottle only.'),('prop_cozy','A knitted tea cozy in faded stripes with a pom-pom, on Hal\'s counter, with a BLANK price tag. Isolated cozy and tag only, no counter scenery.')]:
    add('K',id,'base',desc,guide='prop_view',kind='prop',dest=f'props/{id}.webp')
item_names=['fish','measuring_jug','scale','clock_key','receipt','parking_fine','crest_map','bottle','pet_food','biscuit','tea_cozy','kit_hat']
add('K','items_ch2','sheet','One 4x4 icon sheet. First TWELVE cells in order: fish, measuring jug, scale with weights, clock key, Hal\'s receipt with abstract marks, Clamp\'s parking fine with abstract marks, crest map with symbols but no words, sea-green bottle, pet food, biscuit, striped tea cozy with pom-pom, Kit\'s navy pirate tricorn with white feather. Last four cells EMPTY transparent. No readable text or numbers.',grid=[4,4],guide='icon_sheet',refs=[base('tutor_droid')],kind='icons',dest='icons/items_ch2.webp',count=12,names=item_names)
if __name__=='__main__':
    old_path=ROOT/'tools/art/wave08-bk-jobs.json'
    old={j['key']:j for j in json.loads(old_path.read_text(encoding='utf8'))} if old_path.exists() else {}
    for j in jobs:
        if j['key'] in old:
            for k in ['mirror','prompt','references','prompt_override','objects','states','state_object','patch_box','patch_margin','additional_objects','crop_top']:
                if k in old[j['key']]:j[k]=old[j['key']][k]
    (ROOT/'tools/art/wave08-bk-jobs.json').write_text(json.dumps(jobs,indent=2)+'\n',encoding='utf8')
    print(len(jobs),'ordered jobs')
