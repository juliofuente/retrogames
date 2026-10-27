/* Bot de pruebas (solo para el escritorio, no va en la app): juega solo para comprobar que todo funciona.
   Usa demo(g) del juego si la tiene; si no, una estrategia sencilla según el juego. Lo llama Prueba.java en cada fotograma
   con __botTick(dt) y toca la pantalla con __input como lo haría un dedo. Con __botRotary = true, en el Leñador corta con
   la corona (__rotary) en vez de tocando. */
(function (G) {
  const B = { q: [], cur: null, hold: false };
  G.__botRotary = false;
  function policy(g) {
    const s = g.s, id = g.def.id;
    if (id === 'lenador') {
      if (s.dead || !s.segs) return { wait: 0.05 };
      const ok = (side) => s.segs[0].b !== side && s.segs[1] && s.segs[1].b !== side;
      const side = ok(s.side) ? s.side : -s.side;
      if (G.__botRotary) return { rotary: side, after: 0.16 };
      return { tap: [side < 0 ? g.W * 0.25 : g.W * 0.75, g.H * 0.6], after: 0.16 };
    }
    if (id === 'helicoptero') {
      if (s.dead || s.won) return { release: true, wait: 0.05 };
      const look = Math.floor((s.px + s.off) / s.cw) + 4, col = s.cols[Math.min(s.cols.length - 1, look)];
      let target = col ? (col.t + col.b) / 2 : s.mid;
      for (const b of s.blocks) if (b.x > s.px - 20 && b.x - s.px < 110) { const up = b.y - b.h / 2 - (col ? col.t : 0), down = (col ? col.b : g.H) - (b.y + b.h / 2); target = up > down ? (col.t + b.y - b.h / 2) / 2 : (b.y + b.h / 2 + col.b) / 2; }
      if (!s.started) return { press: true, wait: 0.05 };
      const yp = s.y + s.vy * 0.12;
      return { press: yp > target, wait: 0.016 };
    }
    return { tap: [g.W / 2, g.H * 0.6], after: 0.5 };
  }
  G.__botTick = (dt) => {
    const g = Arcade.current; if (!g || g.state !== 'play') { if (B.hold) { __input(2, 9, 150, 160); B.hold = false; } B.cur = null; B.q = []; return; }
    if (!B.cur) {
      if (!B.q.length) { let st = g.def.demo ? g.def.demo(g) : policy(g); if (!st) st = { wait: 0.25 }; B.q = Array.isArray(st) ? st.slice() : [st]; }
      const c = B.cur = B.q.shift(); c.t = 0; c.ph = 0;
    }
    const c = B.cur; c.t += dt;
    if (c.ph === 0) {
      c.ph = 2; c.t = 0; c.rest = c.wait ?? 0.3;
      if (c.tap) { __input(0, 9, c.tap[0], c.tap[1]); __input(2, 9, c.tap[0], c.tap[1]); c.rest = c.after ?? 0.45; }
      else if (c.rotary) { __rotary(c.rotary); c.rest = c.after ?? 0.2; }
      else if (c.hold) { __input(0, 9, c.hold[0], c.hold[1]); c.ph = 1; }
      else if (c.key) { __key(c.key, 1); c.ph = 1; }
      else if (c.press !== undefined) { if (c.press && !B.hold) { __input(0, 9, 150, 160); B.hold = true; } else if (!c.press && B.hold) { __input(2, 9, 150, 160); B.hold = false; } }
      else if (c.release && B.hold) { __input(2, 9, 150, 160); B.hold = false; }
      return;
    }
    if (c.ph === 1) {
      if (c.hold && c.t >= (c.dur || 0.6)) { __input(2, 9, c.hold[0], c.hold[1]); c.ph = 2; c.t = 0; c.rest = c.after ?? 0.35; }
      else if (c.key && c.t >= (c.dur || 0.12)) { __key(c.key, 0); c.ph = 2; c.t = 0; c.rest = c.after ?? 0.25; }
      return;
    }
    if (c.t >= c.rest) B.cur = null;
  };
})(globalThis);
