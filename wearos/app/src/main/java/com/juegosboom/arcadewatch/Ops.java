package com.juegosboom.arcadewatch;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * Lee el búfer de órdenes que deja canvas.js y se las da a un Painter. Guarda la tabla de cadenas y la pila de estilos
 * (fillStyle, lineWidth, font… con save/restore como el canvas del navegador). Sin Android.
 * Los números de orden tienen que coincidir con OP en assets/js/canvas.js.
 */
public final class Ops {
    public static final int SAVE = 1, RESTORE = 2, TRANSLATE = 3, ROTATE = 4, SCALE = 5, SET_TRANSFORM = 6, TRANSFORM = 7,
        BEGIN = 10, CLOSE = 11, MOVE = 12, LINE = 13, ARC = 14, RECT = 15, RRECT = 16, QUAD = 17, BEZIER = 18,
        FILL = 20, STROKE = 21, CLIP = 22, FILL_RECT = 23, STROKE_RECT = 24, CLEAR_RECT = 25,
        FILL_TEXT = 26, STROKE_TEXT = 27, EMOJI = 28,
        FILL_COLOR = 30, STROKE_COLOR = 31, FILL_GRAD = 32, STROKE_GRAD = 33,
        LINE_WIDTH = 34, LINE_CAP = 35, LINE_JOIN = 36, ALPHA = 37, FONT = 38, TEXT_ALIGN = 39, TEXT_BASELINE = 40,
        SHADOW_COLOR = 41, SHADOW_BLUR = 42, SHADOW_OFFSET = 43, LINE_DASH = 44, DASH_OFFSET = 45, COMPOSITE = 46;

    /** Degradado lineal (kind 0) o radial (kind 1). */
    public static final class Grad {
        public int kind;
        public float x0, y0, r0, x1, y1, r1;
        public float[] offsets;
        public int[] colors;
        public Object cache;   // el Shader/Paint ya creado por quien pinta
    }

    /** Estado de estilo del canvas (lo que guarda y recupera save/restore). */
    public static final class Style {
        public int fillColor = 0xFF000000, strokeColor = 0xFF000000;
        public Grad fillGrad, strokeGrad;
        public float lineWidth = 1, alpha = 1;
        public int lineCap, lineJoin;            // 0 butt/miter · 1 round · 2 square/bevel
        public FontSpec font = FontSpec.parse("10px sans-serif");
        public int textAlign, textBaseline;      // align: 0 left 1 center 2 right · baseline: 0 alphabetic 1 top 2 middle 3 bottom
        public int shadowColor; public float shadowBlur, shadowX, shadowY;
        public float[] dash; public float dashOffset;
        public int composite;                    // 0 source-over 1 lighter 2 destination-out 3 multiply 4 screen …
        /** Desfase de la línea discontinua entre 0 y la longitud del patrón (el canvas admite negativos). */
        public float dashPhase() {
            if (dash == null) return 0;
            float sum = 0; for (float d : dash) sum += d;
            return sum > 0 ? ((dashOffset % sum) + sum) % sum : 0;
        }
        Style copy() {
            Style s = new Style();
            s.fillColor = fillColor; s.strokeColor = strokeColor; s.fillGrad = fillGrad; s.strokeGrad = strokeGrad;
            s.lineWidth = lineWidth; s.alpha = alpha; s.lineCap = lineCap; s.lineJoin = lineJoin; s.font = font;
            s.textAlign = textAlign; s.textBaseline = textBaseline; s.shadowColor = shadowColor; s.shadowBlur = shadowBlur;
            s.shadowX = shadowX; s.shadowY = shadowY; s.dash = dash; s.dashOffset = dashOffset; s.composite = composite;
            return s;
        }
    }

    private final ArrayList<String> strings = new ArrayList<>();
    private final HashMap<Integer, Integer> colors = new HashMap<>();
    private final HashMap<Integer, FontSpec> fonts = new HashMap<>();
    private final ArrayList<Style> stack = new ArrayList<>();
    private Style st = new Style();
    private boolean hasPoint;
    public int lastOps;   // órdenes del último fotograma (para estadísticas)

    /** Añade las cadenas nuevas de un fotograma (JsEngine.newStrings). \u0002 = vaciar la tabla. */
    public void addStrings(String joined) {
        if (joined == null || joined.isEmpty()) return;
        int start = 0;
        while (true) {
            int k = joined.indexOf('\u0001', start);
            String s = k < 0 ? joined.substring(start) : joined.substring(start, k);
            if (s.equals("\u0002")) { strings.clear(); colors.clear(); fonts.clear(); }
            else strings.add(s);
            if (k < 0) break;
            start = k + 1;
        }
    }

    private String str(float id) { int i = (int) id; return i >= 0 && i < strings.size() ? strings.get(i) : ""; }
    private int color(float id) {
        int i = (int) id; Integer c = colors.get(i);
        if (c == null) { c = CssColor.parse(str(id)); colors.put(i, c); }
        return c;
    }
    private FontSpec font(float id) {
        int i = (int) id; FontSpec f = fonts.get(i);
        if (f == null) { f = FontSpec.parse(str(id)); fonts.put(i, f); }
        return f;
    }

    /** Pinta un fotograma completo. scale = píxeles por unidad lógica. */
    public void run(float[] b, int n, Painter p, float scale) {
        st = new Style(); stack.clear(); hasPoint = false;
        p.beginFrame(scale);
        int i = 0, count = 0;
        try {
            while (i < n) {
                int op = (int) b[i++]; count++;
                switch (op) {
                    case SAVE: stack.add(st.copy()); p.save(); break;
                    case RESTORE: if (!stack.isEmpty()) { st = stack.remove(stack.size() - 1); p.restore(); } break;
                    case TRANSLATE: p.translate(b[i], b[i + 1]); i += 2; break;
                    case ROTATE: p.rotate(b[i]); i += 1; break;
                    case SCALE: p.scale(b[i], b[i + 1]); i += 2; break;
                    case SET_TRANSFORM: p.setTransform(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4], b[i + 5]); i += 6; break;
                    case TRANSFORM: p.transform(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4], b[i + 5]); i += 6; break;
                    case BEGIN: p.beginPath(); hasPoint = false; break;
                    case CLOSE: p.closePath(); break;
                    case MOVE: p.moveTo(b[i], b[i + 1]); i += 2; hasPoint = true; break;
                    case LINE: p.lineTo(b[i], b[i + 1]); i += 2; hasPoint = true; break;
                    case ARC: p.arc(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4], b[i + 5], b[i + 6], hasPoint); i += 7; hasPoint = true; break;
                    case RECT: p.rect(b[i], b[i + 1], b[i + 2], b[i + 3]); i += 4; hasPoint = true; break;
                    case RRECT: p.roundRect(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4]); i += 5; hasPoint = true; break;
                    case QUAD: p.quadTo(b[i], b[i + 1], b[i + 2], b[i + 3]); i += 4; hasPoint = true; break;
                    case BEZIER: p.cubicTo(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4], b[i + 5]); i += 6; hasPoint = true; break;
                    case FILL: p.fill(st, b[i] == 1); i += 1; break;
                    case STROKE: p.stroke(st); break;
                    case CLIP: p.clip(b[i] == 1); i += 1; break;
                    case FILL_RECT: p.fillRect(b[i], b[i + 1], b[i + 2], b[i + 3], st); i += 4; break;
                    case STROKE_RECT: p.strokeRect(b[i], b[i + 1], b[i + 2], b[i + 3], st); i += 4; break;
                    case CLEAR_RECT: p.clearRect(b[i], b[i + 1], b[i + 2], b[i + 3]); i += 4; break;
                    case FILL_TEXT: case STROKE_TEXT: p.text(str(b[i]), b[i + 1], b[i + 2], b[i + 3], op == STROKE_TEXT, st); i += 4; break;
                    case EMOJI: p.emoji(str(b[i]), b[i + 1], b[i + 2], b[i + 3], st); i += 4; break;
                    case FILL_COLOR: st.fillColor = color(b[i]); st.fillGrad = null; i += 1; break;
                    case STROKE_COLOR: st.strokeColor = color(b[i]); st.strokeGrad = null; i += 1; break;
                    case FILL_GRAD: case STROKE_GRAD: {
                        Grad g = new Grad();
                        g.kind = (int) b[i]; g.x0 = b[i + 1]; g.y0 = b[i + 2]; g.r0 = b[i + 3]; g.x1 = b[i + 4]; g.y1 = b[i + 5]; g.r1 = b[i + 6];
                        int k = (int) b[i + 7]; i += 8;
                        g.offsets = new float[k]; g.colors = new int[k];
                        for (int j = 0; j < k; j++) { g.offsets[j] = Math.max(0, Math.min(1, b[i])); g.colors[j] = color(b[i + 1]); i += 2; }
                        if (op == FILL_GRAD) st.fillGrad = g; else st.strokeGrad = g;
                        break;
                    }
                    case LINE_WIDTH: st.lineWidth = b[i]; i += 1; break;
                    case LINE_CAP: st.lineCap = (int) b[i]; i += 1; break;
                    case LINE_JOIN: st.lineJoin = (int) b[i]; i += 1; break;
                    case ALPHA: st.alpha = b[i]; i += 1; break;
                    case FONT: st.font = font(b[i]); i += 1; break;
                    case TEXT_ALIGN: st.textAlign = (int) b[i]; i += 1; break;
                    case TEXT_BASELINE: st.textBaseline = (int) b[i]; i += 1; break;
                    case SHADOW_COLOR: st.shadowColor = color(b[i]); i += 1; break;
                    case SHADOW_BLUR: st.shadowBlur = b[i]; i += 1; break;
                    case SHADOW_OFFSET: st.shadowX = b[i]; st.shadowY = b[i + 1]; i += 2; break;
                    case LINE_DASH: {
                        int k = (int) b[i]; i += 1;
                        if (k <= 0) st.dash = null; else { float[] d = new float[k]; boolean any = false; for (int j = 0; j < k; j++) { d[j] = b[i + j]; if (d[j] > 0) any = true; } st.dash = any ? d : null; }
                        i += Math.max(0, k);
                        break;
                    }
                    case DASH_OFFSET: st.dashOffset = b[i]; i += 1; break;   // se normaliza en dashPhase()
                    case COMPOSITE: st.composite = (int) b[i]; i += 1; break;
                    default:
                        throw new IllegalStateException("Orden desconocida " + op + " en " + (i - 1));
                }
            }
        } finally {
            while (!stack.isEmpty()) { stack.remove(stack.size() - 1); p.restore(); }
            lastOps = count;
        }
    }
}
