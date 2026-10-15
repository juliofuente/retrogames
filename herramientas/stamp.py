# Pone una «huella» (?v=<hash del contenido>) en las URLs de los .js y .css locales de todas las páginas, para que
# el navegador no mezcle nunca un HTML nuevo con un common.js viejo guardado en caché. Si el archivo no cambia, la
# URL tampoco, así que la caché sigue funcionando.
# Uso: python3 stamp.py   (ejecutarlo SIEMPRE al final, después de mk.py / mkgames.py / mkedu.py)
import glob, hashlib, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAGES = ['index.html', 'pwa/*.html', 'educativos/index.html', 'educativos/brain-academy/*.html', 'educativos/brain-academy/games/*.html', 'educativos/problemas-primaria/*.html']
REF = re.compile(r'''((?:src|href)=")([^"?#:]+\.(?:js|css))(?:\?v=[0-9a-f]*)?(")''')


def main():
    cache, n = {}, 0
    for pat in PAGES:
        for page in sorted(glob.glob(os.path.join(ROOT, pat))):
            s = open(page, encoding='utf-8').read()

            def fix(m):
                target = os.path.normpath(os.path.join(os.path.dirname(page), m.group(2)))
                if not os.path.isfile(target):
                    return m.group(0)
                if target not in cache:
                    cache[target] = hashlib.md5(open(target, 'rb').read()).hexdigest()[:10]
                return m.group(1) + m.group(2) + '?v=' + cache[target] + m.group(3)

            t = REF.sub(fix, s)
            if t != s:
                open(page, 'w', encoding='utf-8').write(t)
                n += 1
    print('stamp.py:', n, 'páginas actualizadas ·', len(cache), 'recursos')


if __name__ == '__main__':
    main()
