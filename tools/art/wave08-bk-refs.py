"""Prepare reference boards within the image tool's five-input limit."""
import json,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
def board(paths,dest):
    im=Image.new('RGB',(1536,768*((len(paths)+1)//2)),(35,39,48))
    for n,p in enumerate(paths):
        src=Image.open(ROOT/p).convert('RGBA');src.thumbnail((736,736),Image.Resampling.LANCZOS)
        im.paste(src,(n%2*768+(768-src.width)//2,n//2*768+(768-src.height)//2),src)
    dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)
def main():
    jobs=json.loads((ROOT/'tools/art/wave08-bk-jobs.json').read_text(encoding='utf8'));j=next(j for j in jobs if j['key']==sys.argv[1]);refs=j['references']
    if len(refs)>5:
        out=ROOT/'art/raw/wave-08'/j['key'];anchors=out/'anchors.png';board(refs[:2],anchors)
        rest=refs[2:];guides=[p for p in rest if p.startswith('art/guides/')];subjects=[p for p in rest if p not in guides]
        if len(subjects)+len(guides)>4:
            subject_board=out/'references.png';board(subjects,subject_board);refs=[str(anchors),str(subject_board)]+[str(ROOT/p) for p in guides]
        else:refs=[str(anchors)]+[str(ROOT/p) for p in rest]
    else:refs=[str(ROOT/p) for p in refs]
    print(json.dumps(refs))
if __name__=='__main__':main()
