# Pinta un emoji con Noto Color Emoji (la misma fuente que Android) en <carpeta>/<códigos>.png,
# en un cuadrado de 1,35 × el tamaño de letra y centrado como en la web.
# Uso: python3 emoji.py carpeta 1f34e   (códigos en hexadecimal separados por _, p. ej. 2764_fe0f para ❤️)
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, codes = sys.argv[1], sys.argv[2]
ch = ''.join(chr(int(h, 16)) for h in codes.split('_'))
os.makedirs(out, exist_ok=True)
name = codes + '.png'
F = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 109)   # Noto Color Emoji solo existe a 109 px
side = int(109 * 1.35 + 0.5)
im = Image.new('RGBA', (side, side), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
try: d.text((side / 2, side / 2 + 109 * 0.07), ch, font=F, embedded_color=True, anchor='mm')
except Exception: pass
im.save(os.path.join(out, name))
