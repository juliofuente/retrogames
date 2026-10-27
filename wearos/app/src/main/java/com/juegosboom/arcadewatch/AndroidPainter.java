package com.juegosboom.arcadewatch;

import android.graphics.Bitmap;
import android.graphics.BlendMode;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/** Pinta las órdenes del canvas falso en un android.graphics.Canvas. */
final class AndroidPainter implements Painter {
    private Canvas c;
    private float base = 1;
    private final Matrix cur = new Matrix();                 // matriz actual (para setTransform y el tamaño de los emojis)
    private final ArrayList<Matrix> mstack = new ArrayList<>();
    private final Path path = new Path();
    private final Paint fillP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint strokeP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textP = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
    private final Paint measureP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint emojiP = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint emojiDraw = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rf = new RectF();
    private final Paint.FontMetrics fm = new Paint.FontMetrics();
    private final float[] mv = new float[9];
    /** caché de emojis ya pintados (mapa de bits por emoji y tamaño en píxeles) */
    private final LinkedHashMap<String, Bitmap> emojis = new LinkedHashMap<String, Bitmap>(128, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, Bitmap> e) { return size() > 260; }
    };

    AndroidPainter() {
        fillP.setStyle(Paint.Style.FILL);
        strokeP.setStyle(Paint.Style.STROKE);
        emojiDraw.setTextAlign(Paint.Align.CENTER);
    }

    void setCanvas(Canvas canvas) { c = canvas; }

    @Override public void beginFrame(float scale) {
        base = scale; cur.reset(); cur.setScale(scale, scale); mstack.clear();
        c.scale(scale, scale);
    }
    @Override public void save() { c.save(); mstack.add(new Matrix(cur)); }
    @Override public void restore() { if (mstack.isEmpty()) return; c.restore(); cur.set(mstack.remove(mstack.size() - 1)); }
    @Override public void translate(float x, float y) { c.translate(x, y); cur.preTranslate(x, y); }
    @Override public void rotate(float rad) { float d = (float) Math.toDegrees(rad); c.rotate(d); cur.preRotate(d); }
    @Override public void scale(float sx, float sy) { c.scale(sx, sy); cur.preScale(sx, sy); }
    @Override public void setTransform(float a, float b, float cc, float d, float e, float f) {
        Matrix want = new Matrix(); want.setValues(new float[]{a, cc, e, b, d, f, 0, 0, 1}); want.postScale(base, base);
        Matrix delta = new Matrix(); if (!cur.invert(delta)) return;
        delta.preConcat(want);   // delta = cur⁻¹ · want: lo que hay que añadir a la matriz actual para llegar a la pedida
        c.concat(delta); cur.set(want);
    }
    @Override public void transform(float a, float b, float cc, float d, float e, float f) {
        Matrix m = new Matrix(); m.setValues(new float[]{a, cc, e, b, d, f, 0, 0, 1});
        c.concat(m); cur.preConcat(m);
    }

    @Override public void beginPath() { path.reset(); }
    @Override public void closePath() { path.close(); }
    @Override public void moveTo(float x, float y) { path.moveTo(x, y); }
    @Override public void lineTo(float x, float y) { path.lineTo(x, y); }
    @Override public void arc(float cx, float cy, float rx, float ry, float start, float sweep, float rot, boolean connect) {
        if (rot != 0) {   // elipse girada: se aproxima con segmentos
            int n = Math.max(8, (int) (Math.abs(sweep) / (Math.PI * 2) * 48));
            double cr = Math.cos(rot), sr = Math.sin(rot);
            for (int i = 0; i <= n; i++) {
                double a = start + sweep * i / n, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
                float x = (float) (cx + px * cr - py * sr), y = (float) (cy + px * sr + py * cr);
                if (i == 0 && !connect) path.moveTo(x, y); else path.lineTo(x, y);
            }
            return;
        }
        rf.set(cx - rx, cy - ry, cx + rx, cy + ry);
        float s = (float) Math.toDegrees(start), w = (float) Math.toDegrees(sweep);
        if (Math.abs(w) >= 359.99f) { path.arcTo(rf, s, w / 2, !connect); path.arcTo(rf, s + w / 2, w / 2, false); }
        else path.arcTo(rf, s, w, !connect);
    }
    @Override public void rect(float x, float y, float w, float h) { path.addRect(Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h), Path.Direction.CW); }
    @Override public void roundRect(float x, float y, float w, float h, float r) { rf.set(Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h)); path.addRoundRect(rf, r, r, Path.Direction.CW); }
    @Override public void quadTo(float cx, float cy, float x, float y) { path.quadTo(cx, cy, x, y); }
    @Override public void cubicTo(float a, float b, float cc, float d, float x, float y) { path.cubicTo(a, b, cc, d, x, y); }

    /* ---------- estilo → Paint ---------- */
    private static Shader shader(Ops.Grad g) {
        if (g.cache instanceof Shader) return (Shader) g.cache;
        int n = g.colors.length;
        int[] cols = n >= 2 ? g.colors : new int[]{g.colors.length > 0 ? g.colors[0] : 0, g.colors.length > 0 ? g.colors[0] : 0};
        float[] pos = n >= 2 ? g.offsets : new float[]{0, 1};
        Shader s;
        if (g.kind == 0) s = new LinearGradient(g.x0, g.y0, g.x1, g.y1, cols, pos, Shader.TileMode.CLAMP);
        else {
            float r1 = Math.max(0.01f, g.r1);
            boolean simple = g.r0 <= 0.001f && Math.abs(g.x0 - g.x1) < 0.01f && Math.abs(g.y0 - g.y1) < 0.01f;
            if (!simple && Build.VERSION.SDK_INT >= 31) {
                long[] lc = new long[cols.length]; for (int i = 0; i < cols.length; i++) lc[i] = Color.pack(cols[i]);
                s = new RadialGradient(g.x0, g.y0, Math.max(0, g.r0), g.x1, g.y1, r1, lc, pos, Shader.TileMode.CLAMP);
            } else {   // aproximación: un solo círculo, con los cortes ajustados al radio interior
                float[] p2 = new float[pos.length];
                for (int i = 0; i < pos.length; i++) p2[i] = Math.max(0, Math.min(1, (g.r0 + pos[i] * (r1 - g.r0)) / r1));
                s = new RadialGradient(g.x1, g.y1, r1, cols, p2, Shader.TileMode.CLAMP);
            }
        }
        g.cache = s;
        return s;
    }
    private static void blend(Paint p, int comp) {
        BlendMode m = null;
        switch (comp) {
            case 1: m = BlendMode.PLUS; break;
            case 2: m = BlendMode.DST_OUT; break;
            case 3: m = BlendMode.MULTIPLY; break;
            case 4: m = BlendMode.SCREEN; break;
            case 5: m = BlendMode.SRC_ATOP; break;
            case 6: m = BlendMode.DST_IN; break;
            case 7: m = BlendMode.DST_OVER; break;
            case 8: m = BlendMode.XOR; break;
        }
        p.setBlendMode(m);
    }
    private static void style(Paint p, int color, Ops.Grad g, Ops.Style s) {
        if (g != null) { p.setShader(shader(g)); p.setColor(0xFF000000); p.setAlpha(Math.round(255 * s.alpha)); }
        else { p.setShader(null); p.setColor(CssColor.withAlpha(color, s.alpha)); }
        if ((s.shadowBlur > 0 || s.shadowX != 0 || s.shadowY != 0) && (s.shadowColor >>> 24) != 0)
            p.setShadowLayer(Math.max(0.01f, s.shadowBlur / 2f), s.shadowX, s.shadowY, CssColor.withAlpha(s.shadowColor, s.alpha));
        else p.clearShadowLayer();
        blend(p, s.composite);
    }
    private void strokeStyle(Ops.Style s) {
        style(strokeP, s.strokeColor, s.strokeGrad, s);
        strokeP.setStrokeWidth(s.lineWidth);
        strokeP.setStrokeCap(s.lineCap == 1 ? Paint.Cap.ROUND : s.lineCap == 2 ? Paint.Cap.SQUARE : Paint.Cap.BUTT);
        strokeP.setStrokeJoin(s.lineJoin == 1 ? Paint.Join.ROUND : s.lineJoin == 2 ? Paint.Join.BEVEL : Paint.Join.MITER);
        strokeP.setPathEffect(s.dash != null && s.dash.length >= 2 ? new DashPathEffect(s.dash, s.dashPhase()) : null);
    }

    @Override public void fill(Ops.Style s, boolean evenOdd) {
        path.setFillType(evenOdd ? Path.FillType.EVEN_ODD : Path.FillType.WINDING);
        style(fillP, s.fillColor, s.fillGrad, s);
        c.drawPath(path, fillP);
    }
    @Override public void stroke(Ops.Style s) { strokeStyle(s); c.drawPath(path, strokeP); }
    @Override public void clip(boolean evenOdd) { path.setFillType(evenOdd ? Path.FillType.EVEN_ODD : Path.FillType.WINDING); c.clipPath(path); }
    @Override public void fillRect(float x, float y, float w, float h, Ops.Style s) {
        style(fillP, s.fillColor, s.fillGrad, s);
        c.drawRect(Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h), fillP);
    }
    @Override public void strokeRect(float x, float y, float w, float h, Ops.Style s) {
        strokeStyle(s);
        c.drawRect(Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h), strokeP);
    }
    @Override public void clearRect(float x, float y, float w, float h) {
        fillP.setShader(null); fillP.clearShadowLayer(); fillP.setBlendMode(null); fillP.setColor(0xFF000000);
        c.drawRect(x, y, x + w, y + h, fillP);
    }

    /* ---------- textos ---------- */
    static Typeface typeface(FontSpec f) {
        if (f.cache instanceof Typeface) return (Typeface) f.cache;
        Typeface base;
        switch (f.family) {
            case FontSpec.SERIF: base = Typeface.SERIF; break;
            case FontSpec.MONO: base = Typeface.MONOSPACE; break;
            case FontSpec.CONDENSED: base = Typeface.create("sans-serif-condensed", Typeface.NORMAL); break;
            default: base = Typeface.SANS_SERIF;
        }
        Typeface t = Typeface.create(base, Math.max(100, Math.min(1000, f.weight)), f.italic);
        f.cache = t;
        return t;
    }
    private void font(Paint p, FontSpec f) { p.setTypeface(typeface(f)); p.setTextSize(Math.max(1, f.size)); }

    @Override public void text(String t, float x, float y, float maxW, boolean stroke, Ops.Style s) {
        Paint p = textP;
        font(p, s.font);
        if (stroke) {
            style(p, s.strokeColor, s.strokeGrad, s); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(s.lineWidth);
            p.setStrokeJoin(s.lineJoin == 1 ? Paint.Join.ROUND : s.lineJoin == 2 ? Paint.Join.BEVEL : Paint.Join.MITER);
        } else { style(p, s.fillColor, s.fillGrad, s); p.setStyle(Paint.Style.FILL); }
        p.setTextAlign(s.textAlign == 1 ? Paint.Align.CENTER : s.textAlign == 2 ? Paint.Align.RIGHT : Paint.Align.LEFT);
        p.getFontMetrics(fm);
        float dy;
        switch (s.textBaseline) {
            case 1: dy = -fm.ascent; break;                          // top
            case 2: dy = -(fm.ascent + fm.descent) / 2f; break;      // middle
            case 3: dy = -fm.descent; break;                         // bottom
            default: dy = 0;                                         // alphabetic
        }
        float w = maxW > 0 ? p.measureText(t) : 0;
        if (maxW > 0 && w > maxW) {
            c.save(); c.translate(x, y); c.scale(maxW / w, 1); c.drawText(t, 0, dy, p); c.restore();
        } else c.drawText(t, x, y + dy, p);
    }

    /* ---------- emojis: mapa de bits en caché, del tamaño real en pantalla ---------- */
    @Override public void emoji(String e, float x, float y, float size, Ops.Style s) {
        cur.getValues(mv);
        float k = (float) Math.sqrt(Math.abs(mv[Matrix.MSCALE_X] * mv[Matrix.MSCALE_Y] - mv[Matrix.MSKEW_X] * mv[Matrix.MSKEW_Y]));
        int px = Math.max(8, Math.round(size * k));
        px = px <= 48 ? (px + 1) / 2 * 2 : px <= 128 ? (px + 3) / 4 * 4 : (px + 15) / 16 * 16;   // menos tamaños distintos
        String key = e + '|' + px;
        Bitmap b = emojis.get(key);
        if (b == null) {
            int side = (int) Math.ceil(px * 1.35);
            b = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888);
            Canvas bc = new Canvas(b);
            emojiP.setTextSize(px); emojiP.setTextAlign(Paint.Align.CENTER);
            Paint.FontMetrics m = emojiP.getFontMetrics();
            bc.drawText(e, side / 2f, side / 2f - (m.ascent + m.descent) / 2f + px * 0.07f, emojiP);
            emojis.put(key, b);
        }
        float w = size * 1.35f;
        rf.set(x - w / 2, y - w / 2, x + w / 2, y + w / 2);
        emojiDraw.setAlpha(Math.round(255 * Math.max(0, Math.min(1, s.alpha))));
        blend(emojiDraw, s.composite);
        c.drawBitmap(b, null, rf, emojiDraw);
    }

    @Override public float measure(String text, FontSpec f) { font(measureP, f); return measureP.measureText(text); }
    @Override public boolean hasGlyph(String text) { return measureP.hasGlyph(text); }
}
