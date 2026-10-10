"""Export Wave05 art and merge only its manifest fields."""
import json,shutil,statistics,runpy
from pathlib import Path
import numpy as np
from PIL import Image
import clean_sheets
ROOT=Path(__file__).resolve().parents[2]
export=runpy.run_path(str(ROOT/'tools/art/wave04-process.py'))['export']
path=ROOT/'tools/art/wave05-records.json'
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
def main():
 rs=json.loads(path.read_text(encoding='utf8'));mp=ROOT/'public/assets/manifest.json';m=json.loads(mp.read_text(encoding='utf8'))
 for r in rs:
  raw=ROOT/'art/raw/wave-05'/r['id']/(r['slot']+'-v'+str(r['attempt'])+'.png');raw.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(r['path'],raw)
  if not r.get('selected'):continue
  im=Image.open(r['path']).convert('RGBA' if r['transparent'] else 'RGB').resize(r['size'],Image.Resampling.LANCZOS)
  flags=r.setdefault('flags',[])
  if r['transparent']:im.putalpha(im.getchannel('A').point(lambda a:0 if a<4 else a))
  if r['section']=='C':
   old=Image.open(ROOT/f"public/assets/characters/{r['id']}/battle.webp").convert('RGBA')
   heights=[bbox(old.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512))) for i in [0,1,2,3,5]]
   target=statistics.median(b[3]-b[1] for b in heights);result=Image.new('RGBA',im.size)
   for i in range(4):
    tile=im.crop((i%2*512,i//2*512,(i%2+1)*512,(i//2+1)*512));b=bbox(tile)
    if min(b[:2])<=1 or b[2]>=511 or b[3]>=511:flags.append(f'frame{i}: raw content touches cell edge; inspect crop')
    data=np.array(tile);clean_sheets.clean_cell(data);tile=Image.fromarray(data,'RGBA');b=bbox(tile)
    full=tile.getchannel('A').getbbox();tile=tile.crop(full)
    scale=min(target/(b[3]-b[1]),450/tile.width,450/tile.height);tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
    b=bbox(tile);result.alpha_composite(tile,(i%2*512+(512-tile.width)//2,i//2*512+481-(b[3]-1)))
   im=result;r['standingTarget']=target
  export(im,r['dest'],budget=(700 if r['section']=='C' else 400 if r['section']=='D' else 500)*1024)
  desc=dict(src=r['dest'].removeprefix('public/assets/'),w=r['size'][0],h=r['size'][1]);source=dict(wave_file='art/waves/wave-05-polish.md',model='built-in image_gen (identifier not exposed)',date='2026-10-09')
  if r['section'] in ['A','B']:m['assets'][r['id']]=dict(kind='scene',wave=5,status='draft',base=desc,source=source)
  else:
   entry=m['assets'][r['id']];entry['status']='draft';entry['sourceWave05']=source
   if r['section']=='C':
    names=['angry','shout','talk','pleased'] if r['id']=='ally_gunner' else ['sing','sing2','greet','listen']
    entry['field']=dict(src=desc['src'],cell=[512,512],cols=2,rows=2,frames={k:i for i,k in enumerate(names)},anchor=[256,481],facing='right')
    clean_sheets.clean_sheet(ROOT/r['dest'],entry['field'],False)
   elif r['section']=='D':desc['anchor']=r['anchor'];entry['poses']['attack']=desc
   else:entry['far']=desc
 for r in rs:
  if r.get('flags'):r['flags']=list(dict.fromkeys(r['flags']))
 mp.write_text(json.dumps(m,indent=2)+'\n',encoding='utf8');path.write_text(json.dumps(rs,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
