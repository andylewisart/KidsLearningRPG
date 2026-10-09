"""Wave 03 only: reviewed loose-fragment cleanup; preserves intentional marks."""
import json,sys,subprocess
from pathlib import Path
from PIL import Image
from clean_sheets import clean_sheet
root=Path(__file__).resolve().parents[2]
qa_path=root/'art/review/wave-03-qa.json'
qa=json.loads(qa_path.read_text(encoding='utf8'))
manifest=json.loads((root/'public/assets/manifest.json').read_text(encoding='utf8'))
dry='--dry-run' in sys.argv
for r in qa:
    if r['mode']!='walk' or r['id']=='ally_spellwright':continue
    path=root/'public/assets'/r['dest']
    report=clean_sheet(path,manifest['assets'][r['id']][r['slot']],dry)
    print(r['id'],report or 'clean')
    if report and not dry:
        png=root/'art/raw/wave-03'/r['id']/'cleaned.png'
        Image.open(path).save(png)
        quality=subprocess.check_output(['node',str(root/'tools/art/wave03-export.mjs'),str(png),str(path),str(700*1024)],text=True).strip()
        r['bytes']=path.stat().st_size
        r['notes'].append('Removed detached edge fragments: '+'; '.join(report))
if not dry:qa_path.write_text(json.dumps(qa,indent=2),encoding='utf8')
