import asyncio, random, sys
from playwright.async_api import async_playwright
OUT=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','autonomos')+'/'; games=sys.argv[1].split(','); SP=sys.argv[2]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for pl in (1,2):
      ctx=await b.new_context(viewport={'width':960,'height':540})
      pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:160]))
      for gname in games:
        errs.clear()
        await pg.goto(f'file://{OUT}{gname}.html?tv=1&lang=es'); await pg.evaluate(f"localStorage.setItem('arc_players','{pl}')"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        if pl==2: await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        for i in range(60):
          k=random.choice(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Enter',' '])
          if random.random()<0.3:
            await pg.keyboard.down(k); await pg.wait_for_timeout(random.randint(100,500)); await pg.keyboard.up(k)
          else: await pg.keyboard.press(k)
          await pg.wait_for_timeout(40)
        if pl==1: await pg.screenshot(path=f'{SP}/shots/{gname}_tv.png')
        st=await pg.evaluate('Arcade.current.state+" lv="+Arcade.current.level+" score="+Arcade.current.score')
        print(pl, gname, st, errs[:2], flush=True)
      await ctx.close()
    await b.close()
asyncio.run(main())
