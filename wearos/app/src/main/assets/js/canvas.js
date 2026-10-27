/* Arcade Watch · canvas 2D falso
   Imita la API de CanvasRenderingContext2D que usan los juegos, pero en vez de pintar apunta cada orden en un
   Float32Array (__cmd). En cada fotograma Java lo lee y lo pinta con android.graphics.Canvas (Renderer.java).
   Los textos (colores, fuentes, emojis, letras) van por una tabla de cadenas: cada cadena nueva recibe un número y
   Java la recibe una sola vez (__newStrings). Los códigos de orden están repetidos en Renderer.java (clase Op). */
(function (G) {
  'use strict';
  const OP = {
    SAVE: 1, RESTORE: 2, TRANSLATE: 3, ROTATE: 4, SCALE: 5, SET_TRANSFORM: 6, TRANSFORM: 7,
    BEGIN: 10, CLOSE: 11, MOVE: 12, LINE: 13, ARC: 14, RECT: 15, RRECT: 16, QUAD: 17, BEZIER: 18,
    FILL: 20, STROKE: 21, CLIP: 22, FILL_RECT: 23, STROKE_RECT: 24, CLEAR_RECT: 25,
    FILL_TEXT: 26, STROKE_TEXT: 27, EMOJI: 28,
    FILL_COLOR: 30, STROKE_COLOR: 31, FILL_GRAD: 32, STROKE_GRAD: 33,
    LINE_WIDTH: 34, LINE_CAP: 35, LINE_JOIN: 36, ALPHA: 37, FONT: 38, TEXT_ALIGN: 39, TEXT_BASELINE: 40,
    SHADOW_COLOR: 41, SHADOW_BLUR: 42, SHADOW_OFFSET: 43, LINE_DASH: 44, DASH_OFFSET: 45, COMPOSITE: 46,
  };
  G.__OP = OP;

  /* ---------- búfer de órdenes y tabla de cadenas ---------- */
  let buf = new Float32Array(1 << 16), n = 0;
  const strId = new Map(); let newStr = [];
  function grow(k) { if (n + k <= buf.length) return; const nb = new Float32Array(Math.max(buf.length * 2, n + k + 1024)); nb.set(buf.subarray(0, n)); buf = nb; }
  function put1(a) { grow(1); buf[n++] = a; }
  function put(...a) { grow(a.length); for (let i = 0; i < a.length; i++) buf[n++] = a[i]; }
  function sid(s) {
    s = String(s); let id = strId.get(s);
    if (id === undefined) {
      if (strId.size > 20000) { strId.clear(); newStr.push('\u0002'); }   // tabla llena: Java también la vacía
      id = strId.size; strId.set(s, id); newStr.push(s);
    }
    return id;
  }
  G.__cmdReset = () => { n = 0; };
  G.__cmdLen = () => n;
  G.__cmdBuf = () => buf;
  G.__newStrings = () => { if (!newStr.length) return ''; const s = newStr.join('\u0001'); newStr = []; return s; };

  /* ---------- gradientes ---------- */
  class Gradient {
    constructor(kind, a) { this.kind = kind; this.a = a; this.stops = []; }
    addColorStop(o, c) { this.stops.push([+o, String(c)]); }
  }
  function putStyle(opColor, opGrad, v) {
    if (v instanceof Gradient) {
      put(opGrad, v.kind, ...v.a, v.stops.length);
      for (const [o, c] of v.stops) put(o, sid(c));
    } else put(opColor, sid(v));
  }

  /* ---------- medida de textos (la hace Java; se guarda en caché) ---------- */
  const mcache = new Map();
  function measure(font, text) {
    const k = font + '\u0001' + text; let w = mcache.get(k);
    if (w === undefined) { w = typeof G.__measure === 'function' ? G.__measure(String(text), font) : String(text).length * 8; if (mcache.size > 4000) mcache.clear(); mcache.set(k, w); }
    return w;
  }

  const CAPS = { butt: 0, round: 1, square: 2 }, JOINS = { miter: 0, round: 1, bevel: 2 };
  const ALIGNS = { left: 0, start: 0, center: 1, right: 2, end: 2 };
  const BASES = { alphabetic: 0, top: 1, hanging: 1, middle: 2, bottom: 3, ideographic: 3 };
  const COMPS = { 'source-over': 0, lighter: 1, 'destination-out': 2, multiply: 3, screen: 4, 'source-atop': 5, 'destination-in': 6, 'destination-over': 7, xor: 8 };

  class Ctx {
    constructor(canvas) {
      this.canvas = canvas;
      this._s = this._fresh(); this._stack = [];
    }
    _fresh() { return { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', shadowColor: 'rgba(0,0,0,0)', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, dash: [], lineDashOffset: 0, globalCompositeOperation: 'source-over', miterLimit: 10, filter: 'none', imageSmoothingEnabled: true }; }
    /* el motor empieza cada fotograma con un contexto limpio, igual que Java */
    _frameStart() { this._s = this._fresh(); this._stack = []; }

    get fillStyle() { return this._s.fillStyle; } set fillStyle(v) { if (v == null) return; this._s.fillStyle = v; putStyle(OP.FILL_COLOR, OP.FILL_GRAD, v); }
    get strokeStyle() { return this._s.strokeStyle; } set strokeStyle(v) { if (v == null) return; this._s.strokeStyle = v; putStyle(OP.STROKE_COLOR, OP.STROKE_GRAD, v); }
    get lineWidth() { return this._s.lineWidth; } set lineWidth(v) { v = +v; if (!(v > 0) || v === this._s.lineWidth) return; this._s.lineWidth = v; put(OP.LINE_WIDTH, v); }
    get lineCap() { return this._s.lineCap; } set lineCap(v) { if (!(v in CAPS) || v === this._s.lineCap) return; this._s.lineCap = v; put(OP.LINE_CAP, CAPS[v]); }
    get lineJoin() { return this._s.lineJoin; } set lineJoin(v) { if (!(v in JOINS) || v === this._s.lineJoin) return; this._s.lineJoin = v; put(OP.LINE_JOIN, JOINS[v]); }
    get globalAlpha() { return this._s.globalAlpha; } set globalAlpha(v) { v = +v; if (!(v >= 0)) return; if (v > 1) v = 1; if (v === this._s.globalAlpha) return; this._s.globalAlpha = v; put(OP.ALPHA, v); }
    get font() { return this._s.font; } set font(v) { v = String(v); if (v === this._s.font) return; this._s.font = v; put(OP.FONT, sid(v)); }
    get textAlign() { return this._s.textAlign; } set textAlign(v) { if (!(v in ALIGNS) || v === this._s.textAlign) return; this._s.textAlign = v; put(OP.TEXT_ALIGN, ALIGNS[v]); }
    get textBaseline() { return this._s.textBaseline; } set textBaseline(v) { if (!(v in BASES) || v === this._s.textBaseline) return; this._s.textBaseline = v; put(OP.TEXT_BASELINE, BASES[v]); }
    get shadowColor() { return this._s.shadowColor; } set shadowColor(v) { v = String(v); if (v === this._s.shadowColor) return; this._s.shadowColor = v; put(OP.SHADOW_COLOR, sid(v)); }
    get shadowBlur() { return this._s.shadowBlur; } set shadowBlur(v) { v = +v || 0; if (v === this._s.shadowBlur) return; this._s.shadowBlur = v; put(OP.SHADOW_BLUR, v); }
    get shadowOffsetX() { return this._s.shadowOffsetX; } set shadowOffsetX(v) { this._s.shadowOffsetX = +v || 0; put(OP.SHADOW_OFFSET, this._s.shadowOffsetX, this._s.shadowOffsetY); }
    get shadowOffsetY() { return this._s.shadowOffsetY; } set shadowOffsetY(v) { this._s.shadowOffsetY = +v || 0; put(OP.SHADOW_OFFSET, this._s.shadowOffsetX, this._s.shadowOffsetY); }
    get lineDashOffset() { return this._s.lineDashOffset; } set lineDashOffset(v) { this._s.lineDashOffset = +v || 0; put(OP.DASH_OFFSET, this._s.lineDashOffset); }
    get globalCompositeOperation() { return this._s.globalCompositeOperation; } set globalCompositeOperation(v) { if (!(v in COMPS) || v === this._s.globalCompositeOperation) return; this._s.globalCompositeOperation = v; put(OP.COMPOSITE, COMPS[v]); }
    get miterLimit() { return this._s.miterLimit; } set miterLimit(v) { this._s.miterLimit = +v || 10; }
    get filter() { return this._s.filter; } set filter(v) { this._s.filter = v; }   // no se usa en el reloj
    get imageSmoothingEnabled() { return true; } set imageSmoothingEnabled(v) {}

    save() { this._stack.push(Object.assign({}, this._s, { dash: this._s.dash.slice() })); put1(OP.SAVE); }
    restore() { if (!this._stack.length) return; this._s = this._stack.pop(); put1(OP.RESTORE); }
    translate(x, y) { if (x || y) put(OP.TRANSLATE, x, y); }
    rotate(a) { if (a) put(OP.ROTATE, a); }
    scale(x, y) { if (x !== 1 || y !== 1) put(OP.SCALE, x, y); }
    setTransform(a, b, c, d, e, f) { if (typeof a === 'object' && a) ({ a, b, c, d, e, f } = a); if (a === undefined) { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0; } put(OP.SET_TRANSFORM, a, b, c, d, e, f); }
    resetTransform() { this.setTransform(1, 0, 0, 1, 0, 0); }
    transform(a, b, c, d, e, f) { put(OP.TRANSFORM, a, b, c, d, e, f); }

    beginPath() { put1(OP.BEGIN); this._cx = this._cy = undefined; }
    closePath() { put1(OP.CLOSE); }
    moveTo(x, y) { put(OP.MOVE, x, y); this._cx = x; this._cy = y; this._sx = x; this._sy = y; }
    lineTo(x, y) { if (this._cx === undefined) return this.moveTo(x, y); put(OP.LINE, x, y); this._cx = x; this._cy = y; }
    rect(x, y, w, h) { put(OP.RECT, x, y, w, h); this._cx = x; this._cy = y; }
    roundRect(x, y, w, h, r) { let rr = Array.isArray(r) ? r[0] : r; rr = +rr || 0; put(OP.RRECT, x, y, w, h, Math.max(0, Math.min(rr, Math.abs(w) / 2, Math.abs(h) / 2))); this._cx = x; this._cy = y; }
    quadraticCurveTo(cx, cy, x, y) { if (this._cx === undefined) this.moveTo(cx, cy); put(OP.QUAD, cx, cy, x, y); this._cx = x; this._cy = y; }
    bezierCurveTo(a, b, c, d, x, y) { if (this._cx === undefined) this.moveTo(a, b); put(OP.BEZIER, a, b, c, d, x, y); this._cx = x; this._cy = y; }
    /* arco con la misma regla que el navegador para el ángulo recorrido */
    _arc(cx, cy, rx, ry, rot, a0, a1, ccw) {
      const T = Math.PI * 2; let sw = a1 - a0;
      if (!ccw) { if (sw >= T) sw = T; else { sw %= T; if (sw < 0) sw += T; } }
      else { if (sw <= -T) sw = -T; else { sw %= T; if (sw > 0) sw -= T; } }
      put(OP.ARC, cx, cy, rx, ry, a0, sw, rot || 0);
      const ae = a0 + sw, c = Math.cos(rot || 0), s = Math.sin(rot || 0), px = Math.cos(ae) * rx, py = Math.sin(ae) * ry;
      this._cx = cx + px * c - py * s; this._cy = cy + px * s + py * c;
    }
    arc(x, y, r, a0, a1, ccw) { if (!(r >= 0)) return; this._arc(x, y, r, r, 0, a0, a1, !!ccw); }
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) { if (!(rx >= 0 && ry >= 0)) return; this._arc(x, y, rx, ry, rot, a0, a1, !!ccw); }
    arcTo(x1, y1, x2, y2, r) {
      if (this._cx === undefined) this.moveTo(x1, y1);
      const x0 = this._cx, y0 = this._cy;
      const ax = x0 - x1, ay = y0 - y1, bx = x2 - x1, by = y2 - y1, la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const cross = ax * by - ay * bx;
      if (!r || la < 1e-9 || lb < 1e-9 || Math.abs(cross) < 1e-9) { this.lineTo(x1, y1); return; }
      const ang = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))), d = r / Math.tan(ang / 2);
      const t0x = x1 + ax / la * d, t0y = y1 + ay / la * d, t1x = x1 + bx / lb * d, t1y = y1 + by / lb * d;
      // centro: desde la esquina, por la bisectriz
      const ux = ax / la + bx / lb, uy = ay / la + by / lb, lu = Math.hypot(ux, uy), dc = r / Math.sin(ang / 2);
      const ccx = x1 + ux / lu * dc, ccy = y1 + uy / lu * dc;
      const a0 = Math.atan2(t0y - ccy, t0x - ccx), a1 = Math.atan2(t1y - ccy, t1x - ccx);
      this.lineTo(t0x, t0y);
      this._arc(ccx, ccy, r, r, 0, a0, a1, cross > 0);
    }
    fill(a, b) { const rule = (typeof a === 'string' ? a : b) === 'evenodd' ? 1 : 0; put(OP.FILL, rule); }
    stroke() { put1(OP.STROKE); }
    clip(a, b) { const rule = (typeof a === 'string' ? a : b) === 'evenodd' ? 1 : 0; put(OP.CLIP, rule); }
    fillRect(x, y, w, h) { put(OP.FILL_RECT, x, y, w, h); }
    strokeRect(x, y, w, h) { put(OP.STROKE_RECT, x, y, w, h); }
    clearRect(x, y, w, h) { put(OP.CLEAR_RECT, x, y, w, h); }
    fillText(t, x, y, mw) { t = String(t); if (!t) return; put(OP.FILL_TEXT, sid(t), x, y, mw > 0 ? mw : -1); }
    strokeText(t, x, y, mw) { t = String(t); if (!t) return; put(OP.STROKE_TEXT, sid(t), x, y, mw > 0 ? mw : -1); }
    measureText(t) { const w = measure(this._s.font, String(t)); const sz = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this._s.font) || [0, 10])[1]); return { width: w, actualBoundingBoxAscent: sz * 0.75, actualBoundingBoxDescent: sz * 0.25, fontBoundingBoxAscent: sz * 0.9, fontBoundingBoxDescent: sz * 0.25 }; }
    setLineDash(a) { a = Array.isArray(a) ? a.filter((x) => x >= 0) : []; if (a.length % 2) a = a.concat(a); this._s.dash = a; put(OP.LINE_DASH, a.length, ...a); }
    getLineDash() { return this._s.dash.slice(); }
    createLinearGradient(x0, y0, x1, y1) { return new Gradient(0, [x0, y0, 0, x1, y1, 0]); }
    createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Gradient(1, [x0, y0, r0, x1, y1, r1]); }
    createPattern() { return '#888'; }
    drawImage(img, ...a) { if (img && img.__emoji) { const [x, y, w] = a; this._emoji(img.__emoji, x + w / 2, y + w / 2, w / 1.35); } }
    isPointInPath() { return false; }
    getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }; }
    putImageData() {}
    /* emoji centrado en (x, y) con tamaño de letra «size» (lo pinta Java desde una caché de mapas de bits) */
    _emoji(ch, x, y, size) { put(OP.EMOJI, sid(ch), x, y, size); }
  }
  G.__Ctx = Ctx;
  G.__putRaw = put;
})(globalThis);
