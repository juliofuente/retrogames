// Cerillas|#2b1a0e
(function () {
  const { clamp } = Arcade;
  const T = Arcade.T;
  /* [operación, acción (m = mover, r = quitar, a = añadir), cuántas cerillas, soluciones]. Ordenados de fácil a difícil;
     resueltos de antemano probando todas las combinaciones de dígitos (herramientas: generador en el historial de cerillas). */
  const PUZ = /*PUZ*/[["9+9=14","r",1,["5+9=14","9+5=14"]],["9+9=12","r",1,["3+9=12","9+3=12"]],["8+8=5+9","r",1,["6+8=5+9","8+6=5+9"]],["6+9-8=6","r",1,["5+9-8=6","6+9-9=6"]],["8+8-6=8","r",1,["6+8-6=8","8+6-6=8"]],["4-7=3","r",1,["4-1=3"]],["8/3=2","r",1,["6/3=2"]],["9*2=6","r",1,["3*2=6"]],["8-5=4","r",1,["9-5=4"]],["7-9=4","r",1,["7-3=4"]],["1+4=9","r",1,["1+4=5"]],["2+7=8","r",1,["2+7=9"]],["9-1=4","r",1,["5-1=4"]],["8*6=0","r",1,["0*6=0"]],["8-9=5","r",1,["8-3=5"]],["7-2=9","r",1,["7-2=5"]],["4-1=9","r",1,["4-1=3"]],["8-3=3","r",1,["6-3=3"]],["9-7=8","r",1,["9-1=8"]],["8-8=1","r",1,["9-8=1"]],["7*8=63","r",1,["7*9=63"]],["9+8=13","r",1,["5+8=13"]],["4+7=17","r",1,["4+7=11"]],["6*9=64","r",1,["6*9=54"]],["6+8=74","r",1,["6+8=14"]],["7+9=18","r",1,["7+9=16"]],["2+8=11","r",1,["2+9=11"]],["4*8=3*8","r",1,["4*6=3*8"]],["2/6=9/9","r",1,["2/6=3/9"]],["19-8=2+3","r",1,["13-8=2+3"]],["2*9=18/3","r",1,["2*3=18/3"]],["18-8=5+7","r",1,["18-6=5+7"]],["9-5=3","a",1,["8-5=3","9-6=3"]],["38+12=6*8","r",1,["36+12=6*8"]],["90/9=23-5","r",1,["90/5=23-5"]],["3-7=2","a",1,["9-7=2"]],["5-7=2","a",1,["9-7=2"]],["7-5=1","a",1,["7-6=1"]],["5-4=5","a",1,["9-4=5"]],["4+4=9","a",1,["4+4=8"]],["0+1=9","a",1,["8+1=9"]],["5-1=5","a",1,["6-1=5"]],["3-2=7","a",1,["9-2=7"]],["1/1=7","a",1,["7/1=7"]],["9-1=2","a",1,["9-7=2"]],["6-5=3","a",1,["8-5=3"]],["6-3=5","a",1,["8-3=5"]],["0-6=2","a",1,["8-6=2"]],["1*6=5","a",1,["1*6=6"]],["9/2=4","a",1,["8/2=4"]],["5/2=3","a",1,["6/2=3"]],["4*5=36","a",1,["4*9=36"]],["1*2=14","a",1,["7*2=14"]],["8+5=17","a",1,["8+9=17"]],["5+1=12","a",1,["5+7=12"]],["7*4=29","a",1,["7*4=28"]],["5+9=18","a",1,["9+9=18"]],["3*5=45","a",1,["9*5=45"]],["3+5=12","a",1,["3+9=12"]],["9+5=13","a",1,["8+5=13"]],["6*5=40","a",1,["8*5=40"]],["6*3=54","a",1,["6*9=54"]],["6*9=72","a",1,["8*9=72"]],["6+5=13","a",1,["8+5=13"]],["6+2=2*5","a",1,["8+2=2*5"]],["9-1+3=5","a",1,["9-7+3=5"]],["6+5+2=15","a",1,["8+5+2=15"]],["6+5+2=14","a",1,["6+6+2=14"]],["6+9-6=6","m",1,["5+9-6=8","5+9-8=6","6+6-6=6","6+9-6=9","6+9-9=6"]],["7+7=9","m",1,["1+7=8","7+1=8"]],["0/1=6","m",1,["0/1=0","6/1=6"]],["5/8=1","m",1,["6/6=1","9/9=1"]],["5/1=3","m",1,["3/1=3","5/1=5"]],["3+9=9","m",1,["3+5=8","3+6=9"]],["2*2=6","m",1,["2*3=6","3*2=6"]],["0+6=9","m",1,["0+6=6","0+9=9"]],["66-18=5*8","a",1,["66-18=6*8"]],["0-6=3","m",1,["8-5=3","9-6=3"]],["12*6-90=6","a",1,["12*8-90=6"]],["16-6=6+7","m",1,["18-5=6+7","18-6=5+7","19-6=6+7"]],["9*9=40","m",1,["5*8=40","8*5=40"]],["5*8=54","m",1,["6*9=54","9*6=54"]],["9*8=48","m",1,["6*8=48","8*6=48"]],["7+9=75","m",1,["7+8=15","7+9=16"]],["3*8=16","m",1,["2*8=16","3*6=18"]],["0*8=72","m",1,["8*9=72","9*8=72"]],["6*5=45","m",1,["5*9=45","9*5=45"]],["6*9=40","m",1,["5*8=40","8*5=40"]],["1+3=6-3","m",1,["1+2=6-3","1+3=6-2"]],["6-3=1","m",1,["6-5=1"]],["4/3=2","m",1,["4/2=2"]],["9+1=1","m",1,["0+1=1"]],["4+9=3","m",1,["4+5=9"]],["6-8=5","m",1,["6-0=6"]],["9*3=3","m",1,["3*3=9"]],["3+7=9","m",1,["2+7=9"]],["8-1=6","m",1,["9-1=8"]],["2+9=1","m",1,["2+5=7"]],["8/7=6","m",1,["8/1=8"]],["9/5=7","m",1,["9/9=1"]],["1+5=0","m",1,["1+5=6"]],["7*8=9","m",1,["1*8=8"]],["1-7=8","m",1,["7-7=0"]],["3/9=3","m",1,["9/3=3"]],["4+9=5","m",1,["4+5=9"]],["8+3=9","m",1,["0+9=9"]],["3+2=4","m",1,["2+2=4"]],["4-4=6","m",1,["4-4=0"]],["10+8=4*6","m",1,["16+8=4*6","18+6=4*6"]],["5+8+2=18","m",1,["6+8+2=16","9+8+2=19"]],["6+6+3=20","m",1,["5+6+9=20","6+5+9=20"]],["6*9=16","m",1,["6*3=18"]],["5*7=25","m",1,["5*7=35"]],["6+9=18","m",1,["9+9=18"]],["7*7=46","m",1,["7*7=49"]],["8*3=40","m",1,["8*5=40"]],["3+0=71","m",1,["3+8=11"]],["2+9=12","m",1,["3+9=12"]],["5*3=49","m",1,["5*9=45"]],["8+8=75","m",1,["8+8=16"]],["6+0=15","m",1,["6+9=15"]],["9*8=01","m",1,["9*9=81"]],["2+5=17","m",1,["2+9=11"]],["0*9=54","m",1,["6*9=54"]],["5*6=38","m",1,["6*6=36"]],["8*9=91","m",1,["9*9=81"]],["9+8=19","m",1,["9+9=18"]],["1+0+2=9","m",1,["1+6+2=9"]],["3*9=4*8","m",1,["3*8=4*6"]],["2*4=16/3","m",1,["2*4=16/2"]],["8/4=8","r",2,["0/4=0","8/1=8","8/4=2"]],["8/4=8","r",2,["0/4=0","8/1=8","8/4=2"]],["6+8=19","r",2,["5+8=13","6+8=14","6+9=15"]],["8/2=9","r",2,["6/2=3","8/2=4"]],["8-6=9","r",2,["8-5=3","9-6=3"]],["2+9=6","r",2,["2+3=5","2+4=6"]],["8-9=6","r",2,["8-3=5","9-3=6"]],["6+6=71","r",2,["5+6=11","6+5=11"]],["7+8=18","r",2,["7+8=15","7+9=16"]],["7-9=3","r",2,["7-4=3"]],["8+3=9","r",2,["0+3=3"]],["3-1=6","r",2,["7-1=6"]],["2+3=8","r",2,["2+3=5"]],["1+3=9","r",2,["1+3=4"]],["4-1=8","r",2,["4-1=3"]],["1+1=8","r",2,["1+1=2"]],["6-8=5","r",2,["5-0=5"]],["9/8=7","r",2,["9/9=1"]],["2+9=9","r",2,["2+3=5"]],["9-4=7","r",2,["5-4=1"]],["8-4=6","r",2,["9-4=5"]],["8*3=9","r",2,["3*3=9"]],["8/3=8","r",2,["0/3=0"]],["9-2=2","r",2,["4-2=2"]],["8-4=7","r",2,["8-1=7"]],["9/4=1","r",2,["4/4=1"]],["7*9=3","r",2,["1*3=3"]],["9*5=16","r",2,["3*5=15"]],["6+5=70","r",2,["5+5=10"]],["4+8=19","r",2,["4+9=13"]],["6+5=18","r",2,["5+5=10"]],["6+6=18","r",2,["6+6=12"]],["6*8=64","r",2,["6*9=54"]],["4*9=28","r",2,["4*5=20"]],["4*6=84","r",2,["4*6=24"]],["6*8=94","r",2,["6*9=54"]],["5*6=26","r",2,["5*5=25"]],["4+9=10","r",2,["1+9=10"]],["6+8=73","r",2,["5+8=13"]],["7*8=69","r",2,["7*9=63"]],["3*9=63","r",2,["7*9=63"]],["9+8=71","r",2,["3+8=11"]],["9+6=17","r",2,["5+6=11"]],["9+7=72","r",2,["5+7=12"]],["9*8=30","r",2,["5*6=30"]],["6+7=43","r",2,["6+7=13"]],["5+7=18","r",2,["5+7=12"]],["9-1=1","a",2,["8-1=7","8-7=1"]],["6+1+5=15","a",2,["6+1+8=15","6+1+9=16","6+4+5=15","8+1+6=15"]],["1+9=15","a",2,["7+8=15","7+9=16"]],["7+3=15","a",2,["7+8=15","7+9=16"]],["9+9=11","a",2,["8+9=17","9+8=17"]],["3-6=2","a",2,["8-6=2"]],["6-2=1","a",2,["6-2=4"]],["9-2=5","a",2,["8-2=6"]],["3+7=6","a",2,["3+3=6"]],["9-5=2","a",2,["8-6=2"]],["1-1=3","a",2,["4-1=3"]],["5-2=6","a",2,["8-2=6"]],["5-8=0","a",2,["8-8=0"]],["4-3=6","a",2,["9-3=6"]],["1+3=9","a",2,["1+8=9"]],["3/4=2","a",2,["8/4=2"]],["2-4=4","a",2,["8-4=4"]],["7-2=1","a",2,["3-2=1"]],["7*5=53","a",2,["7*9=63"]],["3+9=16","a",2,["9+9=18"]],["1*8=32","a",2,["4*8=32"]],["1*6=24","a",2,["4*6=24"]],["7*9=55","a",2,["7*8=56"]],["7*8=24","a",2,["3*8=24"]],["1*5=63","a",2,["7*9=63"]],["6*8=54","a",2,["8*8=64"]],["2*3=10","a",2,["2*9=18"]],["5+9=11","a",2,["5+9=14"]],["6+8=11","a",2,["6+8=14"]],["9-5=0","m",2,["8-5=3","9-3=6","9-6=3"]],["0+5=2","m",2,["0+2=2","0+3=3","0+5=5"]],["7+9=15","m",2,["1+9=10","7+3=10","7+6=13"]],["1+6=8+3","m",2,["1+9=8+2","4+5=6+3","7+8=8+7"]],["9+8=6+5","m",2,["3+8=8+3","5+8=5+8","5+9=6+8","5+9=8+6","6+6=6+6","6+8=5+9","6+8=9+5","6+9=6+9","8+5=8+5","8+6=5+9","8+6=9+5","9+0=0+9","9+5=6+8","9+5=8+6","9+6=9+6","9+9=9+9"]],["8/3=2*3","m",2,["0/3=0*3","0/3=2*0","8/2=2*2"]],["1+9=8+8","m",2,["4+9=5+8","4+9=8+5","7+8=6+9","7+8=9+6"]],["6/6=4","m",2,["8/2=4","8/8=1"]],["2/9=0","m",2,["0/3=0","0/5=0"]],["0-0=3","m",2,["8-5=3","9-6=3"]],["10+8=10+5","a",2,["10+8=10+8"]],["1+8=15","m",2,["1+9=10","7+6=13"]],["1*9=98","m",2,["4*9=36","7*8=56"]],["6*6=19","m",2,["3*6=18","6*3=18"]],["5+3=18","m",2,["5+8=13","6+9=15"]],["2+9=14","m",2,["5+9=14","9+5=14"]],["5*3=49","m",2,["6*3=18","9*5=45"]],["3*2=15","m",2,["3*5=15","5*3=15"]],["6-4=0","m",2,["5-5=0"]],["1+1=5","m",2,["1+1=2"]],["0-7=9","m",2,["9-1=8"]],["2*8=1","m",2,["2*2=4"]],["8/3=5","m",2,["0/3=0"]],["0+1=5","m",2,["5+1=6"]],["8+7=5","m",2,["2+3=5"]],["4-2=5","m",2,["4-2=2"]],["2+8=75","m",2,["2+8=10"]],["4+5=42","m",2,["4+8=12"]],["8*8=87","m",2,["8*8=64"]],["5+8=46","m",2,["8+8=16"]],["9*1=26","m",2,["4*7=28"]],["3+9=49","m",2,["9+9=18"]],["4*3=85","m",2,["4*9=36"]],["4*9=22","m",2,["4*5=20"]],["6*5=06","m",2,["6*6=36"]],["1+5=46","m",2,["7+9=16"]],["1+7=41","m",2,["4+7=11"]],["1*8=06","m",2,["7*8=56"]],["1*3=68","m",2,["7*9=63"]],["4*0=02","m",2,["4*8=32"]],["7*4=43","m",2,["7*7=49"]],["9*8=43","m",2,["5*8=40"]],["3*1=18","m",2,["3*4=12"]],["0*9=42","m",2,["8*9=72"]],["14+7-4=11","m",2,["11+7-4=14"]],["9+2=8","r",3,["3+2=5","4+2=6"]],["3/7=8","r",3,["3/1=3"]],["8/2=2","r",3,["4/2=2"]],["4+8=79","r",3,["4+9=13"]],["6*9=98","r",3,["6*5=30"]],["4+9=11","r",3,["4+7=11"]],["1-1=3","a",3,["7-4=3"]],["5-3=7","a",3,["6-3=3"]],["4-1=6","a",3,["9-1=8"]],["2*1=11","a",3,["2*7=14"]],["6*6=54","a",3,["8*8=64"]],["3*5=12","a",3,["3*6=18"]],["7+1=11","a",3,["7+7=14"]],["8+3=10","r",4,["3+7=10","7+3=10","8+3=11","9+1=10"]],["8*5=78","r",4,["2*5=10"]],["7-1=7","a",4,["7-0=7","7-4=3","7-7=0","8-1=7"]],["1*1=20","a",4,["4*7=28","7*4=28"]],["7+6=4","a",4,["3+6=9"]]];
  // dígitos de 7 segmentos: a arriba · b arriba dcha · c abajo dcha · d abajo · e abajo izq · f arriba izq · g centro
  const SEGS = { 0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1], 3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1], 6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1], 9: [1, 1, 1, 1, 0, 1, 1] };
  const SEGXY = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 1, 2], [0, 2, 1, 2], [0, 1, 0, 2], [0, 0, 0, 1], [0, 1, 1, 1]];   // x1,y1,x2,y2 en lados
  const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷', '=': '=' };

  const toks = (eq) => [...eq].map((c) => (/\d/.test(c) ? { d: 1, c } : { d: 0, c }));
  const segsOf = (tk) => tk.filter((t) => t.d).flatMap((t) => SEGS[t.c]);
  function read(tk, segs) {   // operación que forman las cerillas («?» si un dígito no existe)
    let o = 0, r = '';
    for (const t of tk) { if (!t.d) { r += t.c; continue; } const p = segs.slice(o, o + 7); o += 7; const d = Object.keys(SEGS).find((k) => SEGS[k].every((v, i) => v === p[i])); r += d == null ? '?' : d; }
    return r;
  }
  function correct(eq) {
    if (eq.includes('?') || /(^|[^0-9])0\d/.test(eq)) return false;
    const [l, r] = eq.split('='); try { const a = Function('"use strict";return(' + l + ')')(), b = Function('"use strict";return(' + r + ')')(); return isFinite(a) && isFinite(b) && Math.abs(a - b) < 1e-9; } catch (e) { return false; }
  }
  const pretty = (eq) => [...eq].map((c) => OPS[c] || c).join(' ');
  // plan de la solución: qué cerillas salen (from) y a qué huecos van (to), emparejadas por cercanía
  function plan(tk, sol) {
    const a = segsOf(tk), b = segsOf(toks(sol)), from = [], to = [];
    a.forEach((v, i) => { if (v && !b[i]) from.push(i); if (!v && b[i]) to.push(i); });
    return { from, to };
  }

  /* ---------- geometría ---------- */
  function geo(g) {
    const s = g.s, tk = s.tk, nd = tk.filter((t) => t.d).length, no = tk.length - nd;
    const W = g.W, top = g.top + 70, bot = g.bot - 150 - (g.demoOn ? 40 : 0);
    s.L = Math.min((W - 30) / (nd * 1.5 + no * 1.2), (bot - top) / 3.2, s.vL || 92); s.th = Math.max(5, s.L * 0.14);
    const total = nd * s.L + (nd - 1 + no) * 0.5 * s.L + no * 0.7 * s.L;
    let x = W / 2 - total / 2; s.cy = s.vcy || top + (bot - top) * 0.45; const y0 = s.cy - s.L;
    s.pos = []; s.opx = [];
    tk.forEach((t, i) => { if (i) x += 0.5 * s.L; if (t.d) { s.pos.push([x, y0]); x += s.L; } else { s.opx.push([x + 0.35 * s.L, t.c]); x += 0.7 * s.L; } });
    s.btn = ['undo', 'reset', 'hint'].map((k, i) => ({ k, x: W / 2 + (i - 1) * 112 - 50, y: g.bot - 70 - (g.demoOn ? 40 : 0), w: 100, h: 46 }));
  }
  function segEnds(s, i) { const d = (i / 7) | 0, k = i % 7, [x, y] = s.pos[d], [a, b, c, e] = SEGXY[k], L = s.L, pad = L * 0.06; const h = b === e; return h ? [x + a * L + pad, y + b * L, x + c * L - pad, y + e * L] : [x + a * L, y + b * L + pad, x + c * L, y + e * L - pad]; }
  function nearSeg(s, p, filter) {
    let best = -1, bd = s.th * 2.4;
    for (let i = 0; i < s.segs.length; i++) {
      if (filter && !filter(i)) continue;
      const [x1, y1, x2, y2] = segEnds(s, i), dx = x2 - x1, dy = y2 - y1, t = clamp(((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy), 0, 1), d = Math.hypot(p.x - x1 - dx * t, p.y - y1 - dy * t);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const mid = (s, i) => { const [x1, y1, x2, y2] = segEnds(s, i); return [(x1 + x2) / 2, (y1 + y2) / 2]; };

  /* ---------- jugar ---------- */
  function change(g, fn) { const s = g.s; s.hist.push(s.segs.slice()); fn(); s.left--; s.hintStep = 0; check(g); }
  function check(g) {
    const s = g.s, eq = read(s.tk, s.segs); s.eqNow = eq;
    if (correct(eq)) {
      s.done = true; Arcade.sfx.win(); g.confetti(80);
      const [x, y] = [g.W / 2, s.cy]; g.ring(x, y, '#69db7c', s.L * 3, 6);
      const t = (performance.now() - s.t0) / 1000, st = s.hints ? (s.hints > 1 ? 1 : 2) : t < 40 ? 3 : 2;
      g.addScore(100 + st * 50 + Math.max(0, 60 - Math.round(t)) * 2, x, y - s.L * 1.4);
      setTimeout(() => { if (g.state === 'play') g.win(st); }, 1500); return;
    }
    if (s.left <= 0) {
      s.bad = 1.2; Arcade.sfx.bad(); g.shake(0.25, 6);
      setTimeout(() => { if (g.state === 'play' && !s.done && s.left <= 0) reset(g, true); }, 1300);
    }
  }
  function reset(g, quiet) { const s = g.s; s.segs = s.orig.slice(); s.left = s.P[2]; s.hist = []; s.pick = -1; s.eqNow = read(s.tk, s.segs); if (!quiet) Arcade.tone(300, 0.06, 'triangle', 0.05); }
  function undo(g) { const s = g.s; if (!s.hist.length) return; s.segs = s.hist.pop(); s.left++; s.pick = -1; s.eqNow = read(s.tk, s.segs); Arcade.tone(380, 0.05, 'triangle', 0.05); }
  function hint(g) {
    const s = g.s; if (s.done) return;
    if (s.hist.length) { reset(g, true); }
    s.hintStep = Math.min(2, s.hintStep + 1); s.hints++; Arcade.sfx.up();
  }
  function tapAt(g, p) {
    const s = g.s; if (s.done || s.bad > 0) return;
    for (const b of s.btn) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.k === 'undo') undo(g); else if (b.k === 'reset') reset(g); else hint(g); return; }
    const act = s.P[1];
    if (s.left <= 0) { s.msgT = 1.4; s.msg = T('No quedan movimientos: deshaz o reinicia', 'No moves left: undo or reset'); Arcade.sfx.bad(); return; }
    if (act === 'a') { const i = nearSeg(s, p, (k) => !s.segs[k]); if (i < 0) return; change(g, () => { s.segs[i] = 1; }); s.flash[i] = 1; Arcade.sfx.coin(); return; }
    if (act === 'r') { const i = nearSeg(s, p, (k) => s.segs[k]); if (i < 0) return; const [x, y] = mid(s, i); s.fly.push({ x, y, h: segEnds(s, i)[1] === segEnds(s, i)[3], t: 0 }); change(g, () => { s.segs[i] = 0; }); Arcade.sfx.whoosh(); return; }
    // mover: primero se coge una cerilla y luego se toca un hueco
    if (s.pick >= 0) {
      const j = nearSeg(s, p, (k) => !s.segs[k] || k === s.pick);
      if (j === s.pick) { s.pick = -1; Arcade.tone(300, 0.05, 'sine', 0.04); return; }
      if (j >= 0) { const i = s.pick; s.pick = -1; change(g, () => { s.segs[i] = 0; s.segs[j] = 1; }); s.flash[j] = 1; Arcade.tone(560, 0.07, 'triangle', 0.06); return; }
      const k2 = nearSeg(s, p, (k) => s.segs[k]); if (k2 >= 0) { s.pick = k2; Arcade.tone(640, 0.04, 'square', 0.04); } else s.pick = -1;
      return;
    }
    const i = nearSeg(s, p, (k) => s.segs[k]); if (i >= 0) { s.pick = i; Arcade.tone(640, 0.04, 'square', 0.04); }
  }

  /* ---------- dibujo ---------- */
  function stick(ctx, x1, y1, x2, y2, th, o = {}) {
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.ghost) { ctx.strokeStyle = o.ghost; ctx.lineWidth = 2; ctx.setLineDash([th * 0.8, th * 0.6]); Arcade.rr(ctx, 0, -th / 2, len, th, th / 2); ctx.stroke(); ctx.restore(); return; }
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = th * 2.2; }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; Arcade.rr(ctx, 2, -th / 2 + 3, len, th, th / 2); ctx.fill();
    const gr = ctx.createLinearGradient(0, -th / 2, 0, th / 2); gr.addColorStop(0, o.burnt ? '#5c4a3a' : '#f3c98b'); gr.addColorStop(0.5, o.burnt ? '#4a3b2e' : '#d99a52'); gr.addColorStop(1, o.burnt ? '#3a2e24' : '#a8692e');
    ctx.fillStyle = gr; Arcade.rr(ctx, 0, -th * 0.38, len - th * 0.6, th * 0.76, th * 0.3); ctx.fill(); ctx.shadowBlur = 0;
    const hx = len - th * 0.75, hr = th * 0.62, hg = ctx.createRadialGradient(hx - hr * 0.3, -hr * 0.35, hr * 0.1, hx, 0, hr * 1.1);
    hg.addColorStop(0, '#ff8a6a'); hg.addColorStop(0.6, '#d9381e'); hg.addColorStop(1, '#8f1d0c'); ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(hx, 0, hr * 1.25, hr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawEq(g, ctx, segs, o = {}) {
    const s = g.s;
    for (const [x, c] of s.opx) Arcade.txt(ctx, OPS[c], x, s.cy + 2, s.L * 0.75, o.opCol || '#fff3d6', 'center', 900, 'rgba(0,0,0,.35)');
    for (let i = 0; i < segs.length; i++) {
      const [x1, y1, x2, y2] = segEnds(s, i);
      if (!segs[i]) { if (o.slots !== false) stick(ctx, x1, y1, x2, y2, s.th, { ghost: o.slotCol ? o.slotCol(i) : 'rgba(255,240,210,.18)' }); continue; }
      if (o.skip && o.skip(i)) continue;
      const lift = o.lift ? o.lift(i) : 0;
      stick(ctx, x1, y1 - lift, x2, y2 - lift, s.th, { glow: o.glow ? o.glow(i) : null });
    }
  }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Mueve una cerilla y que salga la cuenta', deco: ['🔥', '🪵', '➕', '➖', '🟰', '🧠'], font: 'round', bg: ['#4a2c17', '#2b1a0e'],
    music: { mode: 'dorian', bpm: 88, wave: 'triangle', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.1, echo: 0.35 },
    /*EN*/ en: { title: 'Matchsticks', tag: 'Move a match and fix the sum', help: 'The equation made of matchsticks is wrong. Fix it by moving, removing or adding the matchsticks it asks for (the number is at the top). Only the matchsticks in the digits can change; the signs stay as they are. To move: tap a match and then an empty slot. To remove: tap a match. To add: tap an empty slot. Below you see how the sum reads right now. ↩️ undoes, 🔄 starts again and 💡 shows which match to move.', tvHelp: 'D-pad to a match or a slot · OK.', dict: { 'Deshacer': 'Undo', 'Reiniciar': 'Reset', 'Pista': 'Hint', 'Coge una cerilla': 'Pick a match', 'Ahora toca un hueco': 'Now tap an empty slot', '¡Correcto!': 'Correct!' } },
    /*TV*/ tvHelp: 'Cruceta hasta una cerilla o un hueco · OK.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.segs || s.done) return []; const out = s.btn.slice(); const act = s.P[1]; for (let i = 0; i < s.segs.length; i++) { const want = act === 'a' ? !s.segs[i] : act === 'r' ? s.segs[i] : s.pick >= 0 ? !s.segs[i] || i === s.pick : s.segs[i]; if (!want) continue; const [x, y] = mid(s, i), h = segEnds(s, i)[1] === segEnds(s, i)[3], w = h ? s.L * 0.8 : s.th * 3, hh = h ? s.th * 3 : s.L * 0.8; out.push({ x: x - w / 2, y: y - hh / 2, w, h: hh }); } return out; } },
    id: 'cerillas', title: 'Cerillas', emoji: '🔥', color: '#ff922b', origin: 'Matchstick puzzles (acertijos de cerillas)', pad: false,
    help: 'La operación hecha con cerillas está mal. Arréglala moviendo, quitando o poniendo las cerillas que pide (lo pone arriba). Solo cambian las cerillas de los números; los signos se quedan como están. Para mover: toca una cerilla y luego un hueco vacío. Para quitar: toca una cerilla. Para poner: toca un hueco vacío. Debajo ves cómo se lee la cuenta en cada momento. ↩️ deshace, 🔄 empieza de nuevo y 💡 te enseña qué cerilla tocar.',
    lives: 0, levels: 269, cap: 20,   // = PUZ.length
    /*SC*/ demo(g) {
      const s = g.s; if (!s.segs || s.done || s.bad > 0) return { wait: 0.4 };
      const pl = plan(s.tk, s.P[3][0]), act = s.P[1], first = !s.said; s.said = 1;
      const say = (es, en) => (first ? T(es, en) : null);
      const cur = { from: pl.from.filter((i) => s.segs[i]), to: pl.to.filter((i) => !s.segs[i]) };
      if (act === 'a') { const i = cur.to[0]; if (i == null) return { wait: 0.4 }; const [x, y] = mid(s, i); return { tap: [x, y], after: 1.2, say: say('Pon una cerilla en el hueco justo', 'Put a match in the right slot') }; }
      if (act === 'r') { const i = cur.from[0]; if (i == null) return { wait: 0.4 }; const [x, y] = mid(s, i); return { tap: [x, y], after: 1.2, say: say('Quita la cerilla que sobra', 'Remove the extra match') }; }
      if (s.pick < 0) { const i = cur.from[0]; if (i == null) return { wait: 0.4 }; const [x, y] = mid(s, i); return { tap: [x, y], after: 0.8, say: say('Coge esta cerilla…', 'Pick up this match…') }; }
      const j = cur.to[0]; if (j == null) return { wait: 0.4 }; const [x, y] = mid(s, j); return { tap: [x, y], after: 1.2, say: say('…y ponla en este hueco', '…and put it in this slot') };
    },
    setup(g) {
      const P = PUZ[(Math.max(1, g.level || 1) - 1) % PUZ.length], tk = toks(P[0]);
      g.s = { P, tk, orig: segsOf(tk), segs: segsOf(tk), left: P[2], hist: [], pick: -1, done: false, bad: 0, hintStep: 0, hints: 0, fly: [], flash: {}, t0: performance.now(), msg: '', msgT: 0 };
      g.s.eqNow = read(tk, g.s.segs); geo(g);
    },
    layout(g) { if (g.s.segs) geo(g); },
    tap(g, p) { tapAt(g, p); },
    update(g, dt) {
      const s = g.s; if (!s.segs) return; geo(g);
      if (s.bad > 0) s.bad -= dt; if (s.msgT > 0) s.msgT -= dt;
      for (const f of s.fly) f.t += dt * 1.6; s.fly = s.fly.filter((f) => f.t < 1);
      for (const k in s.flash) { s.flash[k] -= dt * 1.5; if (s.flash[k] <= 0) delete s.flash[k]; }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createRadialGradient(W / 2, H * 0.42, 30, W / 2, H * 0.45, H * 0.8); bg.addColorStop(0, '#6b4226'); bg.addColorStop(1, '#22140a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y + Math.sin(y) * 4); ctx.lineTo(W, y + Math.cos(y) * 4); ctx.stroke(); }   // vetas de madera
      if (!s.segs) return;
      const act = s.P[1], n = s.P[2], verb = act === 'm' ? T('Mueve', 'Move') : act === 'r' ? T('Quita', 'Remove') : T('Añade', 'Add');
      // objetivo
      ctx.fillStyle = 'rgba(0,0,0,.35)'; Arcade.rr(ctx, 14, g.top + 8, W - 28, 50, 16); ctx.fill();
      Arcade.txt(ctx, verb + ' ' + n + ' ' + (n === 1 ? T('cerilla', 'match') : T('cerillas', 'matches')) + T(' para que la cuenta sea correcta', ' to make it true'), W / 2, g.top + 33, Math.min(17, (W - 40) / 26), '#ffe8cc', 'center', 900);
      // cerillas que quedan por usar
      for (let k = 0; k < n; k++) { const used = k >= s.left, x = W / 2 - (n - 1) * 15 + k * 30; stick(ctx, x - 1, g.top + 92, x - 1, g.top + 64, 7, { alpha: used ? 0.25 : 1 }); }
      // operación
      const pl = s.hintStep ? plan(s.tk, s.P[3][0]) : null;
      const pulse = 0.5 + 0.5 * Math.sin(g.rt * 6);
      drawEq(g, ctx, s.segs, {
        slotCol: (i) => (pl && s.hintStep >= 2 && pl.to.includes(i) ? 'rgba(105,219,124,' + (0.5 + 0.5 * pulse) + ')' : (act === 'a' || s.pick >= 0) ? 'rgba(255,224,102,' + (0.25 + 0.2 * pulse) + ')' : 'rgba(255,240,210,.16)'),
        lift: (i) => (i === s.pick ? s.L * 0.12 : 0),
        glow: (i) => (i === s.pick ? '#ffd43b' : s.flash[i] ? '#69db7c' : pl && pl.from.includes(i) && act !== 'a' ? 'rgba(255,107,107,' + pulse + ')' : null),
      });
      for (const f of s.fly) { const [x, y] = [f.x + f.t * W * 0.3, f.y - f.t * 160 + f.t * f.t * 300]; ctx.save(); ctx.translate(x, y); ctx.rotate(f.t * 6); stick(ctx, -s.L * 0.4, 0, s.L * 0.4, 0, s.th, { alpha: 1 - f.t }); ctx.restore(); }
      // cómo se lee ahora
      const eq = s.eqNow, ok = correct(eq), ry = s.cy + s.L * 1.55;
      ctx.fillStyle = ok ? 'rgba(47,158,68,.85)' : s.bad > 0 ? 'rgba(224,49,49,.85)' : 'rgba(0,0,0,.35)'; const rw = Math.min(W - 40, 60 + eq.length * 26); Arcade.rr(ctx, W / 2 - rw / 2, ry - 22, rw, 44, 22); ctx.fill();
      Arcade.txt(ctx, pretty(eq) + (ok ? '  ✓' : '  ✗'), W / 2, ry + 1, 22, '#fff', 'center', 900);
      // texto de ayuda
      const info = s.msgT > 0 ? s.msg : s.done ? T('¡Correcto!', 'Correct!') : s.hintStep === 1 ? T('💡 La cerilla roja es la que hay que tocar', '💡 The red match is the one to touch') : s.hintStep === 2 ? T('💡 …y el hueco verde es donde va', '💡 …and the green slot is where it goes') : act === 'm' ? (s.pick >= 0 ? 'Ahora toca un hueco' : 'Coge una cerilla') : act === 'r' ? T('Toca la cerilla que quieras quitar', 'Tap the match you want to remove') : T('Toca un hueco para poner una cerilla', 'Tap a slot to add a match');
      Arcade.txt(ctx, info, W / 2, ry + 46, 14, s.msgT > 0 ? '#ffa8a8' : '#ffe8cc', 'center', 800, 'rgba(0,0,0,.4)');
      // botones
      const lab = { undo: '↩️ ' + T('Deshacer', 'Undo'), reset: '🔄 ' + T('Reiniciar', 'Reset'), hint: '💡 ' + T('Pista', 'Hint') };
      for (const b of s.btn) { const on = b.k === 'undo' ? s.hist.length > 0 : b.k === 'reset' ? s.hist.length > 0 : !s.done; ctx.fillStyle = on ? (b.k === 'hint' ? '#f59f00' : 'rgba(255,255,255,.18)') : 'rgba(255,255,255,.07)'; Arcade.rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.fill(); Arcade.txt(ctx, lab[b.k], b.x + b.w / 2, b.y + b.h / 2 + 1, 14, on ? '#fff' : 'rgba(255,255,255,.4)', 'center', 900); }
    },

    /* ---------- vídeo de reto para TikTok (programa C# ArcadeRecorder --puzles): /cerillas/en?rec=1&quiz=N ---------- */
    recCount: PUZ.length,
    recScene(g, Q) {
      if (!Q.has('quiz')) return null;
      const n = clamp(+Q.get('quiz') || 1, 1, PUZ.length), wait = +(Q.get('wait') || 45), host = Q.get('site') || location.host;
      const P = PUZ[n - 1], tk = toks(P[0]), pl = plan(tk, P[3][0]), sol = P[3][0];
      const t1 = 2.5, t2 = t1 + wait, t3 = t2 + 4.5, t4 = t3 + 3, dur = t4 + 4;
      g.level = n; this.setup(g); const s = g.s; s.vcy = g.H * 0.47; s.vL = g.H * 0.105;
      const big = (ctx, txt, y, size, col, w) => Arcade.txt(ctx, txt, g.W / 2, y, Math.min(size, (g.W * 0.92) / Math.max(6, txt.length) * 1.6), col || '#fff', 'center', 900, w || 'rgba(0,0,0,.45)');
      const verb = { m: 'move', r: 'remove', a: 'add' }[P[1]], cnt = P[2] === 1 ? 'ONE match' : P[2] + ' matches';
      return {
        dur,
        frame(t, dt, ctx) {
          const W = g.W, H = g.H; g.rt = t; geo(g);
          const bg = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, H * 0.8); bg.addColorStop(0, '#6b4226'); bg.addColorStop(1, '#1a0f07'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          // cabecera
          big(ctx, '🔥 Matchstick puzzle #' + n, H * 0.1, 30, '#ffd8a8');
          big(ctx, 'How would you solve this?', H * 0.17, 34);
          big(ctx, 'You can ' + verb + ' ' + cnt, H * 0.225, 26, '#ffe066');
          // la operación: antes, durante la animación y después
          let segs = s.orig, k = 0;
          if (t >= t2) k = clamp((t - t2 - 0.8) / 1.6, 0, 1);
          const solved = t >= t2 + 2.6;
          if (t < t2 + 0.8 || !solved) {
            drawEq(g, ctx, segs, { skip: (i) => k > 0 && pl.from.includes(i), glow: (i) => (t >= t2 && t < t2 + 0.8 && pl.from.includes(i) ? 'rgba(255,107,107,' + (0.5 + 0.5 * Math.sin(t * 12)) + ')' : null), slotCol: (i) => (t >= t2 && pl.to.includes(i) ? 'rgba(105,219,124,.8)' : 'rgba(255,240,210,.16)') });
            if (k > 0) pl.from.forEach((fi, m) => {   // las cerillas viajan (mover), salen volando (quitar)…
              const [a1, b1, a2, b2] = segEnds(s, fi), ti = pl.to[m];
              if (ti != null) { const [c1, d1, c2, d2] = segEnds(s, ti), e = k * k * (3 - 2 * k), up = Math.sin(k * Math.PI) * s.L * 0.6; stick(ctx, a1 + (c1 - a1) * e, b1 + (d1 - b1) * e - up, a2 + (c2 - a2) * e, b2 + (d2 - b2) * e - up, s.th, { glow: '#ffd43b' }); }
              else { ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(0, -k * 120); stick(ctx, a1, b1, a2, b2, s.th); ctx.restore(); }
            });
            if (k > 0 && P[1] === 'a') pl.to.forEach((ti) => { const [c1, d1, c2, d2] = segEnds(s, ti); stick(ctx, c1, d1, c2, d2, s.th, { alpha: k, glow: '#69db7c' }); });
          } else drawEq(g, ctx, segsOf(toks(sol)), { glow: (i) => (pl.to.includes(i) ? '#69db7c' : null), slots: false });
          // cuenta atrás
          if (t >= t1 && t < t2) {
            const left = Math.ceil(t2 - t), f = (t2 - t) / wait, r = Math.min(W, H) * 0.11, cy = H * 0.74;
            ctx.lineWidth = r * 0.16; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = left <= 10 ? '#ff6b6b' : '#ffd43b'; ctx.beginPath(); ctx.arc(W / 2, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
            big(ctx, String(left), cy + 2, r * 1.05, left <= 10 ? '#ffa8a8' : '#fff');
            big(ctx, left > 30 ? 'Pause the video and think 🤔' : left > 10 ? 'Comment your answer 👇' : 'Solution coming…', H * 0.86, 22, '#ffe8cc');
          }
          if (t < t1) big(ctx, pretty(P[0]) + '  ✗', H * 0.74, 30, '#ffa8a8');
          if (t >= t2 && t < t3) { big(ctx, 'SOLUTION 👇', H * 0.72, 34, '#69db7c'); if (solved) big(ctx, pretty(sol) + '  ✓', H * 0.8, 34, '#fff', 'rgba(47,158,68,.9)'); }
          if (t >= t3 && t < t4) { big(ctx, pretty(sol) + '  ✓', H * 0.74, 34, '#fff', 'rgba(47,158,68,.9)'); big(ctx, 'Did you get it? 😎', H * 0.83, 28, '#ffe066'); }
          // cierre
          if (t >= t4) {
            const a = clamp((t - t4) / 0.5, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(20,10,4,.92)'; ctx.fillRect(0, 0, W, H);
            Arcade.emoji(ctx, '🔥', W / 2, H * 0.32, Math.min(W, H) * 0.22);
            big(ctx, 'Play ' + PUZ.length + ' puzzles like this', H * 0.48, 36);
            big(ctx, 'free, no ads, no download', H * 0.55, 24, '#ffe8cc');
            const url = host + '/cerillas', w = Math.min(W * 0.94, url.length * 17 + 60); ctx.fillStyle = '#ff922b'; Arcade.rr(ctx, W / 2 - w / 2, H * 0.62, w, 64, 32); ctx.fill();
            big(ctx, url, H * 0.62 + 33, 30, '#fff', 'rgba(0,0,0,.3)');
            ctx.globalAlpha = 1;
          }
        },
        info: { puzzle: n, total: PUZ.length, equation: pretty(P[0]), action: verb, count: P[2], solution: pretty(sol), url: 'https://' + host + '/cerillas' },
      };
    },
  });
})();
