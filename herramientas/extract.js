// Extrae la definición de cada juego (el script del juego dentro de pwa/<id>.html) a JSON: ayuda es/en, controles TV, vidas, niveles…
// Uso: node extract.js > juegos.json   (lo usa mkdb.py)
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), PWA = path.join(__dirname, '..', 'pwa');
const any = new Proxy(function () { return any; }, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : any), apply: () => any, construct: () => any });
const ctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, Symbol, Promise, parseInt, parseFloat, isNaN, Infinity, setTimeout: () => 0, performance: { now: () => 0 }, window: any, document: any, navigator: any, localStorage: any };
eval(fs.readFileSync(path.join(PWA, 'games.js'), 'utf8').replace(/^var /gm, 'ctx.'));
const out = [];
const list = [...ctx.GAMES.map((g) => ['main', g]), ...ctx.GAMES_PRO.map((g) => ['pro', g])];
list.forEach(([col, g], i) => {
  const html = fs.readFileSync(path.join(PWA, g.file), 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const src = blocks[blocks.length - 1];
  const first = fs.existsSync(path.join(SRC, g.id + '.js')) ? fs.readFileSync(path.join(SRC, g.id + '.js'), 'utf8').split('\n', 2).join('\n') : '';
  let def = null;
  const Arcade = new Proxy({ game: (d) => { def = d; }, ri: () => 0, rand: () => 0, clamp: (v) => v, pick: (a) => a && a[0], shuffle: (a) => a, lerp: () => 0, dist: () => 0, T: (a) => a }, { get: (t, k) => (k in t ? t[k] : any) });
  new Function('Arcade', 'window', 'document', 'navigator', 'performance', src)(Arcade, any, any, any, ctx.performance);
  const tv = def.tv === false ? false : def.tv && def.tv.targets ? 'cursor' : 'keys';
  out.push({
    collection: col, order: i, ...g, phys: /src="phys.js"/.test(html),
    help_es: def.help, help_en: def.en && def.en.help, tvhelp_es: def.tvHelp || null, tvhelp_en: (def.en && def.en.tvHelp) || null,
    lives: def.lives ?? 3, levels: def.levels === undefined ? null : def.levels, cap: def.cap || null, tvmode: tv,
    deco: def.deco || [], font: def.font || null, bg: def.bg || null, theme: ((/<meta name="theme-color" content="([^"]+)"/.exec(html) || [])[1] || g.color),
  });
});
process.stdout.write(JSON.stringify(out, null, 1));
