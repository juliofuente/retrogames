# Genera versiones autónomas (CSS y JS comunes incrustados) en ../arcade-perdido-html/
import os, glob, re
import os.path as _p
SRC=_p.dirname(_p.abspath(__file__))+'/'; OUT=_p.join(SRC, '..', 'autonomos')+'/'
os.makedirs(OUT, exist_ok=True)
css=open(SRC+'common.css').read(); js=open(SRC+'common.js').read(); gj=open(SRC+'games.js').read(); cj=open(SRC+'config.js').read(); pj=open(SRC+'phys.js').read()
assert '</script' not in js and '</script' not in gj and '</script' not in cj
for f in sorted(glob.glob(SRC+'*.html')):
    s=open(f).read()
    s=re.sub(r'<link rel="stylesheet" href="common\.css(\?v=[0-9a-f]*)?">', lambda m: '<style>\n'+css+'</style>', s)
    for name, code in (('common.js', js), ('games.js', gj), ('config.js', cj), ('phys.js', pj)):
        s=re.sub(r'<script src="'+re.escape(name)+r'(\?v=[0-9a-f]*)?"></script>', lambda m, c=code: '<script>\n'+c+'</script>', s)
    assert not re.search(r'(href|src)="(common\.css|common\.js|config\.js|games\.js|phys\.js)', s), f
    open(OUT+os.path.basename(f),'w').write(s)
print(len(glob.glob(OUT+'*.html')), 'archivos')
