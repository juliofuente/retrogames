"""Dibuja las ecuaciones de cerillas del juego (herramientas/src/cerillas.js) como PNG para el libro.
Pensado para imprimir en blanco y negro: cerillas grises con cabeza negra; en las soluciones, las cerillas
que se mueven o añaden van en negro y las que se quitan, en línea de puntos."""
import json, re, os, sys
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(OUT, '..', 'src', 'cerillas.js')
SEGS = {0: [1,1,1,1,1,1,0], 1: [0,1,1,0,0,0,0], 2: [1,1,0,1,1,0,1], 3: [1,1,1,1,0,0,1], 4: [0,1,1,0,0,1,1],
        5: [1,0,1,1,0,1,1], 6: [1,0,1,1,1,1,1], 7: [1,1,1,0,0,0,0], 8: [1,1,1,1,1,1,1], 9: [1,1,1,1,0,1,1]}
SEGXY = [(0,0,1,0), (1,0,1,1), (1,1,1,2), (0,2,1,2), (0,1,0,2), (0,0,0,1), (0,1,1,1)]
L = 110            # largo de una cerilla en píxeles
GAP = int(L*0.42)  # espacio entre símbolos
M = int(L*0.35)    # margen
OPW = int(L*0.8)

def load():
    src = open(SRC, encoding='utf8').read()
    m = re.search(r'/\*PUZ\*/(\[.*?\]\]);', src)
    return json.loads(m.group(1))

def stick(d, x1, y1, x2, y2, mode='n'):
    """mode: n normal, new resaltada (movida/añadida), gone quitada (línea de puntos)"""
    t = L*0.075; head = L*0.085
    horiz = abs(y1-y2) < 1
    if horiz:
        box = [min(x1,x2), y1-t, max(x1,x2), y1+t]; hx, hy = max(x1,x2)-head*0.6, y1
    else:
        box = [x1-t, min(y1,y2), x1+t, max(y1,y2)]; hx, hy = x1, min(y1,y2)+head*0.6
    if mode == 'gone':
        # contorno de puntos
        x0, y0, xx, yy = box
        pts = []
        n = 14
        for i in range(n+1):
            f = i/n
            if horiz: pts += [(x0+(xx-x0)*f, y0), (x0+(xx-x0)*f, yy)]
            else: pts += [(x0, y0+(yy-y0)*f), (xx, y0+(yy-y0)*f)]
        for (px, py) in pts: d.ellipse([px-2.6, py-2.6, px+2.6, py+2.6], fill='#555')
        return
    body = '#1a1a1a' if mode == 'new' else '#cfcfcf'
    d.rounded_rectangle(box, radius=t, fill=body, outline='#1a1a1a', width=3)
    d.ellipse([hx-head, hy-head, hx+head, hy+head], fill='#000' if mode == 'n' else '#000', outline='#000')
    if mode == 'new':
        d.ellipse([hx-head*0.45, hy-head*0.45, hx+head*0.45, hy+head*0.45], fill='#fff')

def op(d, c, x, cy):
    w = 8; col = '#333'; half = OPW*0.38; cx = x + OPW/2
    line = lambda a, b, e, f: d.line([a, b, e, f], fill=col, width=w)
    if c in '+-': line(cx-half, cy, cx+half, cy)
    if c == '+': line(cx, cy-half, cx, cy+half)
    if c == '=': line(cx-half, cy-L*0.16, cx+half, cy-L*0.16); line(cx-half, cy+L*0.16, cx+half, cy+L*0.16)
    if c == '*':
        h = half*0.75; line(cx-h, cy-h, cx+h, cy+h); line(cx-h, cy+h, cx+h, cy-h)
    if c == '/':
        line(cx-half, cy, cx+half, cy); r = 7
        d.ellipse([cx-r, cy-L*0.22-r, cx+r, cy-L*0.22+r], fill=col); d.ellipse([cx-r, cy+L*0.22-r, cx+r, cy+L*0.22+r], fill=col)

def draw(eq, ref=None, path=None):
    """eq: ecuación a dibujar. ref: ecuación original (para resaltar diferencias en una solución)."""
    W = M*2 + sum((L if ch.isdigit() else OPW) for ch in eq) + GAP*(len(eq)-1)
    H = M*2 + 2*L
    im = Image.new('L', (W, H), 255); d = ImageDraw.Draw(im)
    x = M; y = M
    for i, ch in enumerate(eq):
        if ch.isdigit():
            on = SEGS[int(ch)]; was = SEGS[int(ref[i])] if ref else on
            for k, (a, b, c, e) in enumerate(SEGXY):
                pad = L*0.07
                x1, y1, x2, y2 = x+a*L, y+b*L, x+c*L, y+e*L
                if b == e: x1 += pad; x2 -= pad
                else: y1 += pad; y2 -= pad
                if on[k] and was[k]: stick(d, x1, y1, x2, y2, 'n')
                elif on[k] and not was[k]: stick(d, x1, y1, x2, y2, 'new')
                elif was[k] and not on[k]: stick(d, x1, y1, x2, y2, 'gone')
            x += L
        else:
            op(d, ch, x, y+L); x += OPW
        x += GAP
    if path: im.save(path, optimize=True)
    return im.size

if __name__ == '__main__':
    P = load()
    seen = set(); out = []
    for eq, kind, n, sols in P:
        key = (eq, kind, n)
        if key in seen: continue
        seen.add(key); out.append(dict(eq=eq, kind=kind, n=n, sols=sols))
    os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
    for i, p in enumerate(out, 1):
        p['img'] = 'img/p%03d.png' % i; p['size'] = draw(p['eq'], path=os.path.join(OUT, p['img']))
        p['simg'] = 'img/s%03d.png' % i; p['ssize'] = draw(p['sols'][0], ref=p['eq'], path=os.path.join(OUT, p['simg']))
    # chuleta de los números
    for dgt in range(10): draw(str(dgt), path=os.path.join(OUT, 'img/d%d.png' % dgt))
    draw('7+7=9', path=os.path.join(OUT, 'img/ej.png')); draw('1+7=8', ref='7+7=9', path=os.path.join(OUT, 'img/ejs.png'))
    json.dump(out, open(os.path.join(OUT, 'puzzles.json'), 'w'), ensure_ascii=False)
    print(len(out), 'retos')
