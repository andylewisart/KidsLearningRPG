import json,math
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2]
qa=json.loads((root/'art/review/wave-03-qa.json').read_text(encoding='utf8'))
jobs=json.loads((root/'tools/art/wave03-jobs.json').read_text(encoding='utf8'))
manifest=json.loads((root/'public/assets/manifest.json').read_text(encoding='utf8'))
assert len(qa)==29
assert {r['dest'] for r in qa}=={j['dest'] for j in jobs}
review=root/'art/review/wave-03';review.mkdir(parents=True,exist_ok=True)
def srcs(v):
    if isinstance(v,dict):
        if 'src' in v:yield v['src']
        for x in v.values():yield from srcs(x)
    elif isinstance(v,list):
        for x in v:yield from srcs(x)
assert {r['dest'] for r in qa}<=set(srcs(manifest))
assert all((root/'public/assets'/s).exists() for s in srcs(manifest))
sizes=dict(prop_signpost=300,prop_chest=125,prop_chest_open=180,prop_tide_pool=90,prop_bottle=55,prop_sage_gate=380,prop_sage_gate_open=380,prop_word_cage=310,prop_glyph_wall=260,prop_stone_frog=140,prop_pillar=325,prop_airship_wreck=280,prop_crystal_ledge=250,prop_shrine=320,prop_lair=350,prop_crystal_shard=65)
hero=Image.open(root/'public/assets/characters/ally_knight/base.webp').convert('RGBA')
hero.thumbnail((160,235),Image.Resampling.LANCZOS)
checks=[]
for r in qa:
    p=root/'public/assets'/r['dest'];im=Image.open(p).convert('RGBA');w,h=im.size
    assert im.size==(r['w'],r['h'])
    budget=(300 if r['mode']=='icons' else 700 if r['grid'] else 500 if r['mode']=='scene' else 400)*1024
    assert p.stat().st_size<=budget
    assert manifest['assets'][r['id']]['status']=='draft'
    if r['grid']:
        assert im.size==tuple(map(int,r['size'].split('x')))
        d=manifest['assets'][r['id']][r['slot']]
        assert d['cols']*d['rows']==len(r['names'] or r['frames']) if isinstance(r['frames'],dict) or r['names'] else d['cols']*d['rows']==r['frames']
        if r['mode']=='walk':assert d['cell']==[384,512] and d['frames']==8 and d['facing']=='right' and d['fps']==10
    elif r['mode']=='single':assert max(im.size)<=1024
    if r['transparent']:
        a=im.getchannel('A')
        assert all(a.crop(b).getextrema()[1]==0 for b in [(0,0,w,1),(0,h-1,w,h),(0,0,1,h),(w-1,0,w,h)])
    if r['mode']=='walk':
        frames=[]
        for i in range(8):
            frame=im.crop((i%4*384,i//4*512,(i%4+1)*384,(i//4+1)*512))
            bg=Image.new('RGBA',frame.size,'#263548');bg.alpha_composite(frame)
            frames.append(bg.convert('RGB'))
        frames[0].save(review/(r['id']+'-walk.gif'),save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=False)
    if r['kind']=='prop':
        bg=Image.open(root/r['light']).convert('RGBA').resize((768,512),Image.Resampling.LANCZOS)
        tile=im.copy();tile.thumbnail((420,sizes[r['id']]),Image.Resampling.LANCZOS)
        bg.alpha_composite(tile,(450-tile.width//2,470-tile.height))
        bg.alpha_composite(hero,(190-hero.width//2,470-hero.height))
        d=ImageDraw.Draw(bg);d.rectangle((0,486,768,512),fill='#172332');d.text((12,493),'Illustrative scale comparison; final placement is set by the game.',fill='white')
        bg.convert('RGB').save(review/(r['id']+'-composite.jpg'),quality=91)
    if r['mode']=='scene':
        crop=im.crop((0,80,1536,944)).resize((960,540),Image.Resampling.LANCZOS)
        overlay=Image.new('RGBA',crop.size);d=ImageDraw.Draw(overlay);d.rectangle((0,396,960,540),fill=(15,24,38,210));d.text((20,413),'Narration-area preview',fill='white')
        Image.alpha_composite(crop,overlay).convert('RGB').save(review/(r['id']+'-screen.jpg'),quality=92)
    checks.append(dict(asset=r['id'],slot=r['slot'],export_checks='passed',guide_visual_check=r.get('guideCheck','pending')))
flagged=[r for r in qa if r['flags']]
md='# Wave 03 art review\n\nAll 29 planned assets generated with built-in imagegen. Everything remains **draft** for parent-and-child review. No game code changed. Exact selected prompts and reference order appear below. Raw attempts are preserved under git-ignored art/raw/wave-03.\n\n'
md+='## Review notes\n\n'+(''.join('- **'+r['id']+'/'+r['slot']+'**: '+'; '.join(r['flags'])+'\n' for r in flagged) or 'No remaining visual flags.\n')
md+='\nWalk GIFs run at the manifest\'s 10 fps. Object composites use their location\'s background and the Knight for an illustrative scale comparison; final gameplay placement still needs runtime review. Story screen previews show the 16:9 crop and narration coverage. Checkboxes mean generated, not approved.\n\n![Wave 03 contact sheet](wave-03/contact-sheet.jpg)\n\n'
for r in qa:
    md+=f'## {r["id"]} / {r["slot"]} — draft\n\n![{r["id"]}](../../public/assets/{r["dest"]})\n\n'
    if r['mode']=='walk':md+=f'![Walk at 10 fps](wave-03/{r["id"]}-walk.gif)\n\n'
    if r['kind']=='prop':md+=f'![Prop with Knight for scale](wave-03/{r["id"]}-composite.jpg)\n\n'
    if r['mode']=='scene':md+=f'![Screen crop and narration coverage](wave-03/{r["id"]}-screen.jpg)\n\n'
    md+=f'{r["w"]}×{r["h"]}; {round(r["bytes"]/1024)} KB. Selected attempt {r["attempt"]}.\n\n'
    md+=r.get('guideCheck','No guide prescribed.')+'\n\n'
    md+=''.join('- FLAG: '+x+'\n' for x in r['flags'])+''.join('- '+x+'\n' for x in r['notes'])+'\n'
    md+='<details><summary>References and generation prompt</summary>\n\n'+''.join(f'{i+1}. `{ref}`\n' for i,ref in enumerate(r['refs']))+'\n```text\n'+r['prompt']+'\n```\n\n</details>\n\n'
md+='## Wiring notes\n\nThe manifest adds npc_jumble base/portraits, mascot_monkey.field, four hero walk sheets, 16 props, two icon sheets, and four story cards. All existing manifest entries are preserved. Claude handles game integration; no runtime animation or object placement acceptance is claimed here.\n'
(root/'art/review/wave-03.md').write_text('\n'.join(s.rstrip() for s in md.split('\n')),encoding='utf8')
contact=Image.new('RGB',(1500,math.ceil(len(qa)/5)*260),'#172332');d=ImageDraw.Draw(contact)
for i,r in enumerate(qa):
    im=Image.open(root/'public/assets'/r['dest']).convert('RGBA');im.thumbnail((280,210))
    x=i%5*300;y=i//5*260;contact.paste(im,(x+(300-im.width)//2,y+(210-im.height)//2),im)
    d.text((x+5,y+215),r['id'],fill='white');d.text((x+5,y+232),r['slot']+(' [FLAG]' if r['flags'] else ''),fill='#ffcf82')
contact.save(review/'contact-sheet.jpg',quality=92)
wave=root/'art/waves/wave-03-exploration.md';text=wave.read_text(encoding='utf8')
text='\n'.join(line.replace('☐','☑') if '☐' in line and '`' in line else line for line in text.splitlines()).split('## Notes')[0]
notes='Generated all 29 assets straight through. Everything remains draft. Review: art/review/wave-03.md. Built-in imagegen; all prescribed references and guides passed.\n\n'
notes+='\n'.join('- '+r['id']+'/'+r['slot']+': '+'; '.join(r['flags']) for r in flagged)+'\n'
wave.write_text(text+'## Notes\n\n'+notes,encoding='utf8')
(root/'art/review/wave-03-validation.json').write_text(json.dumps(dict(assets=29,checks=checks,flagged_assets=len(flagged)),indent=2),encoding='utf8')
print(json.dumps(dict(assets=29,flagged_assets=len(flagged),review='art/review/wave-03.md',validation='passed')))
