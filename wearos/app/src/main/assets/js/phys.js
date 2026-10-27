/* Arcade Perdido · motor de física 2D mínimo (cajas y círculos con rotación).
   Basado en la estructura de Box2D-Lite (Erin Catto): impulsos secuenciales con warm starting.
   Uso:  const w = new Arcade.Phys.World({ gy: 900 });
         const b = w.box(x, y, ancho, alto, { density, friction, static, angle });
         const c = w.circle(x, y, radio, { ... });
         w.step(dt);   // usa subpasos internos
         w.onImpact = (a, b, velocidad) => {};   // choques (velocidad de aproximación) */
(function () {
  const NO = 0, E1 = 1, E2 = 2, E3 = 3, E4 = 4;
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const V = (x, y) => ({ x, y });
  const rot = (a) => { const c = Math.cos(a), s = Math.sin(a); return { c1: V(c, s), c2: V(-s, c) }; };
  const mulMV = (m, v) => V(m.c1.x * v.x + m.c2.x * v.y, m.c1.y * v.x + m.c2.y * v.y);
  const mulMTV = (m, v) => V(dot(m.c1, v), dot(m.c2, v));
  const crossVV = (a, b) => a.x * b.y - a.y * b.x;
  const crossSV = (s, v) => V(-s * v.y, s * v.x);
  let IDS = 1;

  class Body {
    constructor(kind, x, y, o) {
      this.id = IDS++; this.kind = kind; this.p = V(x, y); this.a = o.angle || 0; this.v = V(0, 0); this.w = 0;
      this.f = V(0, 0); this.t = 0; this.friction = o.friction ?? 0.5; this.rest = o.restitution ?? 0; this.data = o.data || null;
      this.static = !!o.static; this.sensor = !!o.sensor;
    }
    setMass(m, I) { if (this.static || !isFinite(m)) { this.m = Infinity; this.im = 0; this.I = Infinity; this.iI = 0; } else { this.m = m; this.im = 1 / m; this.I = I; this.iI = I ? 1 / I : 0; } }
    impulse(px, py, wx, wy) { if (!this.im) return; this.v.x += px * this.im; this.v.y += py * this.im; if (wx != null) this.w += this.iI * crossVV(V(wx - this.p.x, wy - this.p.y), V(px, py)); }
    corners() { const R = rot(this.a), hw = this.hw, hh = this.hh; return [V(-hw, -hh), V(hw, -hh), V(hw, hh), V(-hw, hh)].map((c) => { const q = mulMV(R, c); return V(q.x + this.p.x, q.y + this.p.y); }); }
    contains(x, y) {
      if (this.kind === 'circle') return Math.hypot(x - this.p.x, y - this.p.y) <= this.r;
      const q = mulMTV(rot(this.a), V(x - this.p.x, y - this.p.y)); return Math.abs(q.x) <= this.hw && Math.abs(q.y) <= this.hh;
    }
  }

  /* ---------- colisiones ---------- */
  function incident(h, pos, R, n) {
    const nn = mulMTV(R, V(-n.x, -n.y)), ax = Math.abs(nn.x), ay = Math.abs(nn.y), c = [{ v: null, f: [NO, NO, NO, NO] }, { v: null, f: [NO, NO, NO, NO] }];
    if (ax > ay) {
      if (nn.x > 0) { c[0].v = V(h.x, -h.y); c[0].f = [NO, NO, E3, E4]; c[1].v = V(h.x, h.y); c[1].f = [NO, NO, E4, E1]; }
      else { c[0].v = V(-h.x, h.y); c[0].f = [NO, NO, E1, E2]; c[1].v = V(-h.x, -h.y); c[1].f = [NO, NO, E2, E3]; }
    } else {
      if (nn.y > 0) { c[0].v = V(h.x, h.y); c[0].f = [NO, NO, E4, E1]; c[1].v = V(-h.x, h.y); c[1].f = [NO, NO, E1, E2]; }
      else { c[0].v = V(-h.x, -h.y); c[0].f = [NO, NO, E2, E3]; c[1].v = V(h.x, -h.y); c[1].f = [NO, NO, E3, E4]; }
    }
    for (const k of c) { const q = mulMV(R, k.v); k.v = V(q.x + pos.x, q.y + pos.y); }
    return c;
  }
  function clip(vin, n, off, edge) {
    const out = [], d0 = dot(n, vin[0].v) - off, d1 = dot(n, vin[1].v) - off;
    if (d0 <= 0) out.push({ v: vin[0].v, f: vin[0].f.slice() });
    if (d1 <= 0) out.push({ v: vin[1].v, f: vin[1].f.slice() });
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1), v = V(vin[0].v.x + t * (vin[1].v.x - vin[0].v.x), vin[0].v.y + t * (vin[1].v.y - vin[0].v.y));
      let f; if (d0 > 0) { f = vin[0].f.slice(); f[0] = edge; f[2] = NO; } else { f = vin[1].f.slice(); f[1] = edge; f[3] = NO; }
      out.push({ v, f });
    }
    return out;
  }
  function boxBox(A, B) {
    const hA = V(A.hw, A.hh), hB = V(B.hw, B.hh), RA = rot(A.a), RB = rot(B.a);
    const dp = V(B.p.x - A.p.x, B.p.y - A.p.y), dA = mulMTV(RA, dp), dB = mulMTV(RB, dp);
    const C = { c1: mulMTV(RA, RB.c1), c2: mulMTV(RA, RB.c2) };
    const aC = { c1: V(Math.abs(C.c1.x), Math.abs(C.c1.y)), c2: V(Math.abs(C.c2.x), Math.abs(C.c2.y)) };
    const aCT = { c1: V(aC.c1.x, aC.c2.x), c2: V(aC.c1.y, aC.c2.y) };
    const t1 = mulMV(aC, hB), fA = V(Math.abs(dA.x) - hA.x - t1.x, Math.abs(dA.y) - hA.y - t1.y);
    if (fA.x > 0 || fA.y > 0) return [];
    const t2 = mulMV(aCT, hA), fB = V(Math.abs(dB.x) - t2.x - hB.x, Math.abs(dB.y) - t2.y - hB.y);
    if (fB.x > 0 || fB.y > 0) return [];
    const rel = 0.95, abs = 0.01;
    let axis = 0, sep = fA.x, n = dA.x > 0 ? RA.c1 : V(-RA.c1.x, -RA.c1.y);
    if (fA.y > rel * sep + abs * hA.y) { axis = 1; sep = fA.y; n = dA.y > 0 ? RA.c2 : V(-RA.c2.x, -RA.c2.y); }
    if (fB.x > rel * sep + abs * hB.x) { axis = 2; sep = fB.x; n = dB.x > 0 ? RB.c1 : V(-RB.c1.x, -RB.c1.y); }
    if (fB.y > rel * sep + abs * hB.y) { axis = 3; sep = fB.y; n = dB.y > 0 ? RB.c2 : V(-RB.c2.x, -RB.c2.y); }
    let fn, front, sn, negSide, posSide, negE, posE, inc;
    if (axis === 0) { fn = n; front = dot(A.p, fn) + hA.x; sn = RA.c2; const s = dot(A.p, sn); negSide = -s + hA.y; posSide = s + hA.y; negE = E3; posE = E1; inc = incident(hB, B.p, RB, fn); }
    else if (axis === 1) { fn = n; front = dot(A.p, fn) + hA.y; sn = RA.c1; const s = dot(A.p, sn); negSide = -s + hA.x; posSide = s + hA.x; negE = E2; posE = E4; inc = incident(hB, B.p, RB, fn); }
    else if (axis === 2) { fn = V(-n.x, -n.y); front = dot(B.p, fn) + hB.x; sn = RB.c2; const s = dot(B.p, sn); negSide = -s + hB.y; posSide = s + hB.y; negE = E3; posE = E1; inc = incident(hA, A.p, RA, fn); }
    else { fn = V(-n.x, -n.y); front = dot(B.p, fn) + hB.y; sn = RB.c1; const s = dot(B.p, sn); negSide = -s + hB.x; posSide = s + hB.x; negE = E2; posE = E4; inc = incident(hA, A.p, RA, fn); }
    let cp = clip(inc, V(-sn.x, -sn.y), negSide, negE); if (cp.length < 2) return [];
    cp = clip(cp, sn, posSide, posE); if (cp.length < 2) return [];
    const out = [];
    for (const c of cp) {
      const s = dot(fn, c.v) - front;
      if (s <= 0) { let f = c.f; if (axis >= 2) f = [f[1], f[0], f[3], f[2]]; out.push({ s, n, pos: V(c.v.x - s * fn.x, c.v.y - s * fn.y), key: f.join(''), Pn: 0, Pt: 0 }); }
    }
    return out;
  }
  function circleCircle(A, B) {
    const dx = B.p.x - A.p.x, dy = B.p.y - A.p.y, d = Math.hypot(dx, dy), s = d - A.r - B.r;
    if (s > 0) return [];
    const n = d > 1e-6 ? V(dx / d, dy / d) : V(0, 1);
    return [{ s, n, pos: V(A.p.x + n.x * (A.r + s / 2), A.p.y + n.y * (A.r + s / 2)), key: 'cc', Pn: 0, Pt: 0 }];
  }
  function boxCircle(Bx, C) { // normal de la caja hacia el círculo
    const R = rot(Bx.a), q = mulMTV(R, V(C.p.x - Bx.p.x, C.p.y - Bx.p.y));
    const cx = Math.max(-Bx.hw, Math.min(Bx.hw, q.x)), cy = Math.max(-Bx.hh, Math.min(Bx.hh, q.y));
    let nl, s, pl;
    if (cx === q.x && cy === q.y) { // centro dentro de la caja
      const dx = Bx.hw - Math.abs(q.x), dy = Bx.hh - Math.abs(q.y);
      if (dx < dy) { nl = V(Math.sign(q.x) || 1, 0); pl = V(nl.x * Bx.hw, q.y); s = -dx - C.r; } else { nl = V(0, Math.sign(q.y) || 1); pl = V(q.x, nl.y * Bx.hh); s = -dy - C.r; }
    } else {
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy); s = d - C.r; if (s > 0) return [];
      nl = V(dx / d, dy / d); pl = V(cx, cy);
    }
    const n = mulMV(R, nl), p = mulMV(R, pl);
    return [{ s, n, pos: V(p.x + Bx.p.x, p.y + Bx.p.y), key: 'bc', Pn: 0, Pt: 0 }];
  }
  function collide(A, B) {
    if (A.kind === 'box' && B.kind === 'box') return boxBox(A, B);
    if (A.kind === 'circle' && B.kind === 'circle') return circleCircle(A, B);
    if (A.kind === 'box') return boxCircle(A, B);
    const cs = boxCircle(B, A); for (const c of cs) { c.n = V(-c.n.x, -c.n.y); } return cs;
  }

  /* ---------- árbitros ---------- */
  class Arb {
    constructor(a, b) { this.a = a; this.b = b; this.c = []; this.fr = Math.sqrt(a.friction * b.friction); this.rest = Math.max(a.rest, b.rest); }
    update(nc) { for (const c of nc) { const o = this.c.find((x) => x.key === c.key); if (o) { c.Pn = o.Pn; c.Pt = o.Pt; } } this.c = nc; }
    pre(idt) {
      const A = this.a, B = this.b; this.vn = 0;
      for (const c of this.c) {
        c.r1 = V(c.pos.x - A.p.x, c.pos.y - A.p.y); c.r2 = V(c.pos.x - B.p.x, c.pos.y - B.p.y);
        const rn1 = dot(c.r1, c.n), rn2 = dot(c.r2, c.n);
        c.mn = 1 / (A.im + B.im + A.iI * (dot(c.r1, c.r1) - rn1 * rn1) + B.iI * (dot(c.r2, c.r2) - rn2 * rn2));
        const t = V(c.n.y, -c.n.x), rt1 = dot(c.r1, t), rt2 = dot(c.r2, t);
        c.mt = 1 / (A.im + B.im + A.iI * (dot(c.r1, c.r1) - rt1 * rt1) + B.iI * (dot(c.r2, c.r2) - rt2 * rt2));
        c.bias = -0.2 * idt * Math.min(0, c.s + 0.5);
        { const dv = V(B.v.x - B.w * c.r2.y - A.v.x + A.w * c.r1.y, B.v.y + B.w * c.r2.x - A.v.y - A.w * c.r1.x), vn = dot(dv, c.n); if (vn < this.vn) this.vn = vn; if (this.rest && vn < -60) c.bias = Math.max(c.bias, -this.rest * vn); }
        const P = V(c.Pn * c.n.x + c.Pt * t.x, c.Pn * c.n.y + c.Pt * t.y);
        A.v.x -= A.im * P.x; A.v.y -= A.im * P.y; A.w -= A.iI * crossVV(c.r1, P);
        B.v.x += B.im * P.x; B.v.y += B.im * P.y; B.w += B.iI * crossVV(c.r2, P);
      }
    }
    apply() {
      const A = this.a, B = this.b;
      for (const c of this.c) {
        let dv = V(B.v.x + crossSV(B.w, c.r2).x - A.v.x - crossSV(A.w, c.r1).x, B.v.y + crossSV(B.w, c.r2).y - A.v.y - crossSV(A.w, c.r1).y);
        const vn = dot(dv, c.n); let dPn = c.mn * (-vn + c.bias);
        const P0 = c.Pn; c.Pn = Math.max(P0 + dPn, 0); dPn = c.Pn - P0;
        let P = V(dPn * c.n.x, dPn * c.n.y);
        A.v.x -= A.im * P.x; A.v.y -= A.im * P.y; A.w -= A.iI * crossVV(c.r1, P);
        B.v.x += B.im * P.x; B.v.y += B.im * P.y; B.w += B.iI * crossVV(c.r2, P);
        dv = V(B.v.x + crossSV(B.w, c.r2).x - A.v.x - crossSV(A.w, c.r1).x, B.v.y + crossSV(B.w, c.r2).y - A.v.y - crossSV(A.w, c.r1).y);
        const t = V(c.n.y, -c.n.x), vt = dot(dv, t); let dPt = c.mt * -vt;
        const max = this.fr * c.Pn, T0 = c.Pt; c.Pt = Math.max(-max, Math.min(max, T0 + dPt)); dPt = c.Pt - T0;
        P = V(dPt * t.x, dPt * t.y);
        A.v.x -= A.im * P.x; A.v.y -= A.im * P.y; A.w -= A.iI * crossVV(c.r1, P);
        B.v.x += B.im * P.x; B.v.y += B.im * P.y; B.w += B.iI * crossVV(c.r2, P);
      }
    }
  }

  /* ---------- mundo ---------- */
  class World {
    constructor(o = {}) { this.gx = o.gx || 0; this.gy = o.gy ?? 900; this.bodies = []; this.arbs = new Map(); this.iter = o.iterations || 10; this.sub = o.substeps || 2; this.onImpact = null; this.filter = null; }
    box(x, y, w, h, o = {}) { const b = new Body('box', x, y, o); b.hw = w / 2; b.hh = h / 2; const m = (o.density ?? 1) * w * h / 1000; b.setMass(o.static ? Infinity : m, m * (w * w + h * h) / 12); this.bodies.push(b); return b; }
    circle(x, y, r, o = {}) { const b = new Body('circle', x, y, o); b.r = r; const m = (o.density ?? 1) * Math.PI * r * r / 1000; b.setMass(o.static ? Infinity : m, m * r * r / 2); this.bodies.push(b); return b; }
    remove(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); for (const [k, a] of this.arbs) if (a.a === b || a.b === b) this.arbs.delete(k); b.removed = true; }
    clear() { this.bodies = []; this.arbs.clear(); }
    aabb(b) { if (b.kind === 'circle') return [b.p.x - b.r, b.p.y - b.r, b.p.x + b.r, b.p.y + b.r]; const e = Math.abs(Math.cos(b.a)) * b.hw + Math.abs(Math.sin(b.a)) * b.hh, f = Math.abs(Math.sin(b.a)) * b.hw + Math.abs(Math.cos(b.a)) * b.hh; return [b.p.x - e, b.p.y - f, b.p.x + e, b.p.y + f]; }
    step(dt) { dt = Math.min(dt, 1 / 30); const h = dt / this.sub; for (let i = 0; i < this.sub; i++) this._step(h); }
    _step(dt) {
      const idt = dt > 0 ? 1 / dt : 0, B = this.bodies, bb = B.map((b) => this.aabb(b));
      const live = new Set();
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        let a = B[i], b = B[j]; if (!a.im && !b.im) continue;
        const p = bb[i], q = bb[j]; if (p[2] < q[0] || q[2] < p[0] || p[3] < q[1] || q[3] < p[1]) continue;
        if (this.filter && !this.filter(a, b)) continue;
        if (a.id > b.id) [a, b] = [b, a];
        const nc = collide(a, b), k = a.id + ':' + b.id;
        if (!nc.length) continue;
        if (a.sensor || b.sensor) { if (this.onSensor) this.onSensor(a, b); continue; }
        live.add(k);
        const ex = this.arbs.get(k); if (ex) ex.update(nc); else { const ar = new Arb(a, b); ar.c = nc; this.arbs.set(k, ar); }
      }
      for (const k of [...this.arbs.keys()]) if (!live.has(k)) this.arbs.delete(k);
      for (const b of B) { if (!b.im) continue; b.v.x += dt * (this.gx + b.im * b.f.x); b.v.y += dt * (this.gy + b.im * b.f.y); b.w += dt * b.iI * b.t; b.v.x *= 0.9995; b.v.y *= 0.9995; b.w *= 0.995; }
      for (const a of this.arbs.values()) a.pre(idt);
      for (let it = 0; it < this.iter; it++) for (const a of this.arbs.values()) a.apply();
      for (const b of B) { if (!b.im) continue; b.p.x += dt * b.v.x; b.p.y += dt * b.v.y; b.a += dt * b.w; b.f.x = b.f.y = 0; b.t = 0; }
      if (this.onImpact) for (const a of [...this.arbs.values()]) if (a.vn < -40) this.onImpact(a.a, a.b, -a.vn, a);
    }
    at(x, y) { for (let i = this.bodies.length - 1; i >= 0; i--) if (this.bodies[i].contains(x, y)) return this.bodies[i]; return null; }
    touching(b) { const o = []; for (const a of this.arbs.values()) { if (a.a === b) o.push(a.b); else if (a.b === b) o.push(a.a); } return o; }
  }
  /* dibuja una caja con un emoji/relleno repetido (ayuda para los juegos) */
  function drawBox(ctx, b, fill, stroke) {
    ctx.save(); ctx.translate(b.p.x, b.p.y); ctx.rotate(b.a);
    ctx.fillStyle = fill; ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(-b.hw + 1, -b.hh + 1, b.hw * 2 - 2, b.hh * 2 - 2); }
    ctx.restore();
  }
  Arcade.Phys = { World, drawBox, rot };
})();
