# Construye cada juego desde src/<id>.js en dos versiones:
#   /home/claude/arcade-perdido/<id>.html  -> PWA (usa common.js / common.css)
#   /home/claude/sueltos/<id>.html         -> autónomo (todo incrustado, se abre solo)
import sys, os, glob
SP = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SP, '..', 'pwa'); ALONE = os.path.join(SP, 'sueltos_sin_config')
os.makedirs(ALONE, exist_ok=True)
CSS = open(f'{OUT}/common.css').read(); JS = open(f'{OUT}/common.js').read()
names = sys.argv[1:] or sorted(os.path.basename(p)[:-3] for p in glob.glob(f'{SP}/src/*.js'))
HEAD = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>{title} · Arcade Perdido</title>
<meta name="theme-color" content="{theme}">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
'''
for n in names:
    src = open(f'{SP}/src/{n}.js').read()
    first, body = src.split('\n', 1)
    title, theme = first[2:].strip().split('|')
    head = HEAD.format(title=title, theme=theme)
    pwa = head + '''<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="stylesheet" href="common.css">
</head>
<body class="game">
<script src="config.js"></script>
<script src="common.js"></script>
''' + ('<script src="phys.js"></script>\n' if '@phys' in src else '') + '''<script>
''' + body + '''</script>
</body>
</html>
'''
    alone = head + '<style>\n' + CSS + '</style>\n</head>\n<body class="game">\n<script>\n' + JS + '</script>\n<script>\n' + body + '</script>\n</body>\n</html>\n'
    open(f'{OUT}/{n}.html', 'w').write(pwa)
    open(f'{ALONE}/{n}.html', 'w').write(alone)
print('construidos', len(names))
