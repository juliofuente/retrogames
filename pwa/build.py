# Genera versiones autónomas (CSS y JS comunes incrustados) en ../arcade-perdido-html/
import os, glob
import os.path as _p
SRC=_p.dirname(_p.abspath(__file__))+'/'; OUT=_p.join(SRC, '..', 'autonomos')+'/'
os.makedirs(OUT, exist_ok=True)
css=open(SRC+'common.css').read(); js=open(SRC+'common.js').read(); gj=open(SRC+'games.js').read(); cj=open(SRC+'config.js').read(); pj=open(SRC+'phys.js').read()
assert '</script' not in js and '</script' not in gj and '</script' not in cj
for f in sorted(glob.glob(SRC+'*.html')):
    s=open(f).read()
    s=s.replace('<link rel="stylesheet" href="common.css">', '<style>\n'+css+'</style>')
    s=s.replace('<script src="common.js"></script>', '<script>\n'+js+'</script>')
    s=s.replace('<script src="games.js"></script>', '<script>\n'+gj+'</script>')
    s=s.replace('<script src="config.js"></script>', '<script>\n'+cj+'</script>')
    s=s.replace('<script src="phys.js"></script>', '<script>\n'+pj+'</script>')
    assert 'href="common.css"' not in s and 'src="common.js"' not in s and 'src="config.js"' not in s, f
    open(OUT+os.path.basename(f),'w').write(s)
print(len(glob.glob(OUT+'*.html')), 'archivos')
