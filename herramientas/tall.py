import asyncio, random, sys
from playwright.async_api import async_playwright
SP=sys.argv[1]; base=sys.argv[2]; games=sys.argv[3].split(',')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':390,'height':780},device_scale_factor=2,has_touch=True)
    pg=await ctx.new_page()
    errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)[:200]))
    for gname in games:
      errs.clear()
      await pg.goto(f'{base}/{gname}.html'); await pg.wait_for_timeout(400)
      await pg.screenshot(path=f'{SP}/shots/{gname}_menu.png')
      await pg.click('[data-act=play]'); await pg.wait_for_timeout(300)
      for i in range(30):
        x=random.randint(30,360); y=random.randint(120,740)
        await pg.mouse.move(x,y); await pg.mouse.down()
        for k in range(3):
          await pg.mouse.move(x+random.randint(-80,80),y+random.randint(-80,80)); await pg.wait_for_timeout(25)
        await pg.mouse.up()
        if i%3==0: await pg.mouse.click(random.randint(30,360),random.randint(120,740))
        await pg.wait_for_timeout(50)
      # forzar subir de nivel varias veces para probar niveles altos
      for k in range(3):
        await pg.evaluate("()=>{const g=Arcade.current; if(g.state==='play'){g.win();}}")
        await pg.wait_for_timeout(150)
        nx=await pg.query_selector('[data-act=next]')
        if nx: await nx.click(); await pg.wait_for_timeout(250)
      await pg.evaluate("()=>{const g=Arcade.current; if(g.def.levels){g.unlocked=40;}}")
      await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f'{SP}/shots/{gname}_play.png')
      st=await pg.evaluate('Arcade.current.state+" lv="+Arcade.current.level+" score="+Arcade.current.score')
      print(gname, st, errs[:2])
    await b.close()
asyncio.run(main())
