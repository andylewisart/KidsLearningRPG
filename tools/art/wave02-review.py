import json, re, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

root=Path(__file__).resolve().parents[2]
review=root/'art/review/wave-02'
review.mkdir(parents=True,exist_ok=True)
qa=json.loads((root/'art/review/wave-02-qa.json').read_text(encoding='utf8'))
jobs=json.loads((root/'tools/art/wave02-jobs.json').read_text(encoding='utf8'))
manifest=json.loads((root/'public/assets/manifest.json').read_text(encoding='utf8'))
assert len(qa)==20
assert {r['dest'] for r in qa}=={r['dest'] for r in jobs}
def srcs(v):
    if isinstance(v,dict):
        if 'src' in v: yield v['src']
        for x in v.values():yield from srcs(x)
    elif isinstance(v,list):
        for x in v:yield from srcs(x)
assert {r['dest'] for r in qa}<=set(srcs(manifest))
assert all((root/'public/assets'/s).exists() for s in srcs(manifest))
checks=[]
for r in qa:
    p=root/'public/assets'/r['dest'];im=Image.open(p).convert('RGBA');w,h=im.size
    assert im.size==(r['w'],r['h'])
    budget=(300 if r['mode']=='icons' else 400 if r['kind']=='fx' else 700 if r.get('grid') else 500 if r['mode'] in ['scene','foreground'] else 400)*1024
    assert p.stat().st_size<=budget,p
    assert manifest['assets'][r['id']]['status']=='draft'
    if r.get('grid'):assert (w,h)==tuple(map(int,r['size'].split('x')))
    if r['transparent']:assert all(im.getpixel(xy)[3]==0 for xy in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]),p
    if r['mode']=='single':assert max(w,h)<=1024
    if r['mode']=='frame':assert im.getchannel('A').crop((96,96,928,928)).getextrema()==(0,0)
    if r['mode']=='foreground':
        assert im.size==(1536,1024)
        assert im.getchannel('A').crop((125,340,1388,773)).getextrema()==(0,0)
        bg=Image.open(root/'public/assets'/manifest['assets'][r['id']]['base']['src']).convert('RGBA')
        composite=Image.alpha_composite(bg,im)
        composite.convert('RGB').save(review/(r['id']+'-composite.jpg'),quality=91)
        checker=Image.new('RGBA',im.size,(38,49,66,255));d=ImageDraw.Draw(checker)
        for y in range(0,h,32):
            for x in range(0,w,32):
                if (x//32+y//32)%2:d.rectangle((x,y,x+31,y+31),fill=(65,78,95,255))
        Image.alpha_composite(checker,im).convert('RGB').save(review/(r['id']+'-layer.jpg'),quality=91)
    if r['mode']=='portrait':
        face=im.crop((262,150,762,650)).resize((256,256),Image.Resampling.LANCZOS)
        mask=Image.new('L',(256,256));ImageDraw.Draw(mask).ellipse((0,0,255,255),fill=255)
        face.putalpha(Image.composite(face.getchannel('A'),Image.new('L',(256,256)),mask))
        face.save(review/(r['id']+'-circle.png'))
    if r['kind']=='fx':
        assert max(v[1] for v in ImageStat.Stat(im.crop((768,768,1024,1024)).convert('RGB')).extrema)<=3
        frames=[im.crop((i%4*256,i//4*256,i%4*256+256,i//4*256+256)).convert('RGB') for i in range(16)]
        frames[0].save(review/(r['id']+'.gif'),save_all=True,append_images=frames[1:],duration=42,loop=0,optimize=False)
    checks.append({'asset':r['id'],'slot':r['slot'],'path':r['dest'],'passed':True,'guide_visual_check':'No visible guide lines, labels, color blocks or dashed construction outlines.' if r.get('guide') else 'No guide prescribed.'})
cursor=manifest['assets']['ui_cursor'];assert len(cursor['hotspot'])==2
assert 0<=cursor['hotspot'][0]<cursor['base']['w'] and 0<=cursor['hotspot'][1]<cursor['base']['h']
assert manifest['assets']['ui_frame']['slice']==96
assert manifest['assets']['bg_shipwreck_cove']['floorEdge']==.6
assert len(manifest['assets']['ui_icons_commands']['sheet']['names'])==16

md='# Wave 02 art review\n\nAll 20 planned assets generated with built-in imagegen. Everything stays **draft** for parent-and-child review. No game code changed. Guide references were passed in the order recorded below; no copied guide labels, grids, color blocks, or construction outlines were visible in the selected art. Each failed image received at most three attempts.\n\n'
md+='## Review notes\n\n'
flagged=[r for r in qa if r['flags']]
for r in flagged:md+='- **'+r['id']+' / '+r['slot']+'**: '+'; '.join(r['flags'])+'\n'
md+='\nForegrounds are shown alone on a checkerboard and composited over their own backgrounds. Portrait previews use the guide circle at (512,400), radius 250. Original selected WebPs are linked below each preview. Checkboxes in the wave mean generated, not approved.\n\n'
md+='![All wave 02 assets](wave-02/contact-sheet.jpg)\n\n'
for r in qa:
    md+=f'## {r["id"]} / {r["slot"]} — draft\n\n'
    src='../../public/assets/'+r['dest']
    if r['mode']=='foreground':
        md+=f'| Foreground alone | Over its battle background |\n|---|---|\n| ![Layer](wave-02/{r["id"]}-layer.jpg) | ![Composite](wave-02/{r["id"]}-composite.jpg) |\n\n[Transparent WebP]({src})\n\n'
    else:
        md+=f'![{r["id"]} {r["slot"]}]({src})\n\n'
        if r['mode']=='portrait':md+=f'Guide-circle preview: ![Turn-order crop](wave-02/{r["id"]}-circle.png)\n\n'
        if r['kind']=='fx':md+=f'Animation preview (24 fps): ![Effect](wave-02/{r["id"]}.gif)\n\n'
    md+=f'{r["w"]}×{r["h"]}; {round(r["bytes"]/1024)} KB. Selected attempt {r["attempt"]}.\n\n'
    if r.get('guide'):md+='Guide QA: no visible construction lines, labels, dashed outlines or colored guide blocks.\n\n'
    md+=''.join('- FLAG: '+f+'\n' for f in r['flags'])+''.join('- '+n+'\n' for n in r['notes'])+'\n'
    md+='<details><summary>References and generation prompt</summary>\n\nReferences, in order:\n\n'+''.join(f'{i+1}. `{p}`\n' for i,p in enumerate(r['refs']))+'\n```text\n'+r['prompt']+'\n```\n\n</details>\n\n'
md+='## Wiring notes for Claude\n\nNew assets and fields are registered in public/assets/manifest.json. Claude can wire the command sheet, 96px window frame, cursor hotspot, logo, six creature portraits, foreground layers, shipwreck arena, Titan poses, and four summon effects. Art processing preserves full foreground canvases and keeps the fighter region transparent. The shipwreck floor-edge mismatch is flagged above; the required manifest floorEdge remains 0.6. The game\'s animations and layout still need runtime review after wiring.\n'
(root/'art/review/wave-02.md').write_text('\n'.join(line.rstrip() for line in md.split('\n')),encoding='utf8')
wave=root/'art/waves/wave-02-ui-and-depth.md'
text=wave.read_text(encoding='utf8');lines=[]
for line in text.splitlines():
    if '☐' in line and '`' in line:line=line.replace('☐','☑')
    lines.append(line)
notes='Generated the full wave without gate pauses at the user\'s request. All 20 assets remain draft. Built-in imagegen used with the prescribed guide images; no visible guide-line contamination in selected results. Raw attempts are retained under art/raw/wave-02 (git-ignored). Review: art/review/wave-02.md.\n\n'
notes+='\n'.join('- '+r['id']+'/'+r['slot']+': '+'; '.join(r['flags']) for r in flagged)
notes+='\n\nClaude must wire the new manifest fields and assets into game code; runtime verification remains with that integration.\n'
wave.write_text('\n'.join(lines).split('## Notes')[0]+'## Notes\n\n'+notes,encoding='utf8')
sheet=Image.new('RGB',(1500,1250),'#172332');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(qa):
    im=Image.open(root/'public/assets'/r['dest']).convert('RGBA');im.thumbnail((280,205))
    x=i%5*300;y=i//5*310
    sheet.paste(im,(x+(300-im.width)//2,y+(205-im.height)//2),im)
    draw.text((x+5,y+210),r['id'],fill='white');draw.text((x+5,y+227),r['slot']+(' [FLAG]' if r['flags'] else ''),fill='#ffcf82')
sheet.save(review/'contact-sheet.jpg',quality=92)
portraits=[r for r in qa if r['mode']=='portrait']
sheet=Image.new('RGB',(6*260,270),'#172332');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(portraits):
    im=Image.open(review/(r['id']+'-circle.png')).convert('RGBA');sheet.paste(im,(i*260,0),im);draw.text((i*260+4,256),r['id'],fill='white')
sheet.save(review/'portrait-crops.jpg',quality=93)
(root/'art/review/wave-02-validation.json').write_text(json.dumps({'assets':20,'passed':checks,'flags':[{ 'id':r['id'],'slot':r['slot'],'flags':r['flags']} for r in flagged]},indent=2),encoding='utf8')
print(json.dumps({'assets':20,'flagged_assets':len(flagged),'validation':'passed','review':'art/review/wave-02.md'}))
