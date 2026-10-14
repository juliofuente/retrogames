# Juega cada juego en inglés y recoge todos los textos dibujados en el canvas y en los menús
import asyncio, random, glob, os, re, sys
from playwright.async_api import async_playwright
NEWG='esquiva astro dardos gloton trepamuros carrera planetita globo carretera torreta'.split()
OUT=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','autonomos')+'/'; SP=sys.argv[1]
GAMES=[g for g in sorted(os.path.basename(f)[:-5] for f in glob.glob(OUT+'*.html')) if g in NEWG]
HOOK="""(() => { window.__tx = new Set(); const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { if (this.canvas.id === 'c') window.__tx.add(String(t)); return f.call(this, t, ...r); }; })();"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':390,'height':780},has_touch=True,locale='en-US')
    await ctx.add_init_script(HOOK)
    allt={}
    for gname in GAMES:
      pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:150]))
      await pg.goto(f'file://{OUT}{gname}.html'); await pg.wait_for_timeout(300)
      menu=await pg.evaluate("document.querySelector('.ov').innerText")
      if gname in ('lazo','galletas','murallas'): await pg.screenshot(path=f'{SP}/en_m_{gname}.png')
      await pg.click('[data-act=play]'); await pg.wait_for_timeout(400)
      for i in range(25):
        x=random.randint(30,360); y=random.randint(120,740)
        await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.move(x+random.randint(-90,90),y+random.randint(-90,90),steps=3); await pg.mouse.up()
        if i%3==0: await pg.mouse.click(random.randint(30,360),random.randint(120,740))
        await pg.wait_for_timeout(70)
      await pg.wait_for_timeout(600)
      ov=await pg.evaluate("document.querySelector('.ov').innerText + ' ' + document.querySelector('.hud').innerText")
      tx=await pg.evaluate("[...window.__tx]")
      allt[gname]=(menu, ov, tx); print(gname, 'errs' if errs else '', errs[:1], flush=True)
      await pg.close()
    await b.close()
    SPAN=re.compile(r"[áéíóúñ¡¿]|\b(de|el|la|los|las|para|con|Nivel|Quedan|Puntos|Toca|Ronda|Oleada|Jugar|Menú|Sonido|Música|Fallos|Cambios|Movimientos|Líneas|Siguiente|Construye|Batalla|altura)\b")
    for g,(m,o,tx) in allt.items():
      bad=[t for t in tx if SPAN.search(t)]
      badm=[l for l in (m+'\n'+o).split('\n') if SPAN.search(l)]
      if bad or badm: print('SPANISH?', g, bad[:8], badm[:4])
asyncio.run(main())
