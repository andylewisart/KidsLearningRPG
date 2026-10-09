import json, html, shutil, zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

root = Path(__file__).resolve().parents[2]
out = root.parents[1] / 'outputs' / 'CrystalTitans-Art'
out.mkdir(parents=True, exist_ok=True)
qa = json.loads((root/'art/review/qa.json').read_text(encoding='utf8'))
assert len(qa) == 45
manifest = json.loads((root/'public/assets/manifest.json').read_text(encoding='utf8'))
def sources(value):
    if isinstance(value,dict):
        if 'src' in value: yield value['src']
        for v in value.values(): yield from sources(v)
    elif isinstance(value,list):
        for v in value: yield from sources(v)
assert set(sources(manifest)) == {r['dest'] for r in qa}
assert all(a['status']=='draft' for a in manifest['assets'].values())
validation = []
for r in qa:
    p = root/'public/assets'/r['dest']
    im = Image.open(p).convert('RGBA')
    assert im.size == (r['w'], r['h']), p
    budget = (300 if r['kind']=='icons' else 400 if r['kind']=='fx' else 700 if r.get('grid') else 500 if r['kind'] in ['background','anchor'] or r['slot']=='splash' else 400)*1024
    assert p.stat().st_size <= budget, p
    if r['transparent']:
        a = im.getchannel('A'); w,h=im.size
        assert all(c.getextrema()==(0,0) for c in [a.crop((0,0,w,1)),a.crop((0,h-1,w,h)),a.crop((0,0,1,h)),a.crop((w-1,0,w,h))]), p
    if r.get('grid'):
        assert im.size == tuple(map(int,r['size'].split('x'))), p
    if r['kind']=='fx':
        assert max(ImageStat.Stat(im.crop((768,768,1024,1024)).convert('RGB')).extrema[i][1] for i in range(3))<=3, p
    validation.append({'file':r['dest'],'dimensions':list(im.size),'bytes':p.stat().st_size,'passed':True})

for wave in [0,1]:
    f=root/('art/waves/wave-00-anchors.md' if wave==0 else 'art/waves/wave-01-first-battle.md')
    text=f.read_text(encoding='utf8')
    lines=[]
    for line in text.splitlines():
        if '☐' in line and '`' in line and 'hero_main' not in line:
            line=line.replace('☐','☑')
        lines.append(line)
    notes='Generation completed on 2026-10-08 at the user\'s request to proceed with all image generation. Approval gates were deferred; every asset remains draft. Checkboxes record generation, not approval. See art/review for prompts and flags.'
    if wave==1:
        notes+=' Hero Forge is blank, so hero_main was skipped as instructed. Remaining flags after up to three sheet attempts: '+', '.join(r['id']+'/'+r['slot'] for r in qa if r['flags'])+'.'
    text='\n'.join(lines).split('## Notes')[0]+'## Notes\n\n'+notes+'\n'
    f.write_text(text,encoding='utf8')

esc=html.escape
cards=[]
for i,r in enumerate(qa):
    src='public/assets/'+r['dest']
    flags=''.join('<li>'+esc(f)+'</li>' for f in r['flags'])
    canvas=f'<canvas class="fx" width="256" height="256" data-src="{src}"></canvas>' if r['kind']=='fx' else ''
    cards.append(f'<article data-kind="{r["kind"]}" data-flag="{bool(flags)}"><h2>{esc(r["id"])} / {esc(r["slot"])}</h2><a href="{src}"><img loading="lazy" src="{src}" alt="{esc(r["id"])}"></a>{canvas}<p>Draft · {r["w"]} × {r["h"]} · {round(r["bytes"]/1024)} KB · candidate {r["variant"]}</p><ul>{flags}</ul><details><summary>Prompt and export notes</summary><pre>{esc(r["prompt"])}</pre><p>{esc(" ".join(r["notes"]))}</p></details></article>')
gallery='''<!doctype html><html lang="en"><meta charset="utf-8"><title>Crystal Titans · Art review</title><style>body{font:16px system-ui;background:#101925;color:#e5edf5;margin:30px}h1{font-size:32px}header{max-width:900px}select{padding:10px;margin:12px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}article{background:#1c2938;padding:18px;border-radius:12px;min-width:0}h2{font-size:18px}img{width:100%;height:300px;object-fit:contain;background:repeating-conic-gradient(#263546 0% 25%,#314155 0% 50%) 0/20px 20px}canvas{display:block;background:#000;margin:auto}pre{white-space:pre-wrap;font-size:12px}li{color:#ffcf82}a{color:#8accff}summary{cursor:pointer}</style><header><h1>Crystal Titans · 45 draft assets</h1><p>Waves 00 and 01 generated with imagegen. All planned assets are included except hero_main: the Hero Forge description is blank. Check flagged sheets before approval; some poses and source edges still need art direction. Click an image to open its WebP. Effect previews loop 16 frames at 24 fps.</p><a href="art/review/wave-00.md">Wave 00 notes</a> · <a href="art/review/wave-01.md">Wave 01 notes</a> · <a href="public/assets/manifest.json">Manifest</a><p><select id="filter"><option value="all">All assets</option><option value="flags">Flagged assets</option>'''+''.join(f'<option>{k}</option>' for k in sorted(set(r['kind'] for r in qa)))+'''</select></p></header><main>'''+''.join(cards)+'''</main><script>document.querySelector('#filter').onchange=e=>document.querySelectorAll('article').forEach(a=>a.hidden=!(e.target.value==='all'||e.target.value==='flags'&&a.dataset.flag==='True'||a.dataset.kind===e.target.value));for(const c of document.querySelectorAll('canvas')){const im=new Image();im.src=c.dataset.src;im.onload=()=>{const ctx=c.getContext('2d');setInterval(()=>{const n=Math.floor(performance.now()*24/1000)%16;ctx.clearRect(0,0,256,256);ctx.drawImage(im,n%4*256,Math.floor(n/4)*256,256,256,0,0,256,256)},1000/24)}} </script></html>'''
(root/'art/review/index.html').write_text(gallery.replace('public/assets/','../../public/assets/').replace('art/review/wave-','wave-'),encoding='utf8')
(out/'index.html').write_text(gallery,encoding='utf8')
for rel in ['public/assets','art/review','art/waves']:
    shutil.copytree(root/rel,out/rel,dirs_exist_ok=True)
(out/'art/review/index.html').write_text((root/'art/review/index.html').read_text(encoding='utf8'),encoding='utf8')
shutil.copytree(root/'tools/art',out/'tools/art',dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','checkpoint-33.json','jobs-output.json','records.json','selected.json','__pycache__'))
(out/'validation.json').write_text(json.dumps(validation,indent=2),encoding='utf8')
(out/'README.md').write_text('# Crystal Titans art\n\nOpen index.html to review 45 draft WebP assets and their generation prompts. Copy public/assets into the game repository. No assets have been approved or pushed to GitHub. Hero Forge was blank, so hero_main was skipped. Flagged sheets are listed in art/review. Dimensions, transparency borders, file budgets, and final effect fade-out frames passed automated checks. Raw candidates are preserved in the separate originals archive.\n',encoding='utf8')
sheet=Image.new('RGB',(1500,((len(qa)+4)//5)*230),'#172332'); draw=ImageDraw.Draw(sheet)
for i,r in enumerate(qa):
    im=Image.open(root/'public/assets'/r['dest']).convert('RGBA');im.thumbnail((288,190))
    x=i%5*300;y=i//5*230;sheet.paste(im,(x+(300-im.width)//2,y+(190-im.height)//2),im)
    draw.text((x+6,y+193),r['id'],fill='white');draw.text((x+6,y+208),r['slot']+(' [FLAG]' if r['flags'] else ''),fill='#ffcd80')
sheet.save(out/'contact-sheet.jpg',quality=90)
pack=out.parent/'CrystalTitans-Art.zip'
with zipfile.ZipFile(pack,'w',zipfile.ZIP_DEFLATED) as z:
    for f in out.rglob('*'):
        if f.is_file():z.write(f,f.relative_to(out))
with zipfile.ZipFile(out.parent/'CrystalTitans-Originals.zip','w',zipfile.ZIP_STORED) as z:
    for f in (root/'art/raw').rglob('*.png'):z.write(f,f.relative_to(root))
print(json.dumps({'assets':len(qa),'flagged_assets':sum(bool(r['flags']) for r in qa),'originals':len(list((root/'art/raw').rglob('*.png'))),'package':str(pack),'validation':'passed'}))
