package com.juegosboom.arcadewatch;

import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.LinearGradientPaint;
import java.awt.MultipleGradientPaint;
import java.awt.RadialGradientPaint;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.geom.AffineTransform;
import java.awt.geom.Arc2D;
import java.awt.geom.Path2D;
import java.awt.geom.Point2D;
import java.awt.geom.Rectangle2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import javax.imageio.ImageIO;

/**
 * Pruebas de escritorio: pinta las mismas órdenes que AndroidPainter, pero con Java2D en una imagen.
 * Los emojis salen de la misma fuente que usa Android (Noto Color Emoji), que pinta emoji.py en una carpeta de caché.
 */
final class AwtPainter implements Painter {
    final BufferedImage img;
    private Graphics2D g;
    private final ArrayList<Object[]> stack = new ArrayList<>();
    private Path2D.Float path = new Path2D.Float();
    private final HashMap<String, BufferedImage> emojis = new HashMap<>();
    private final File emojiDir;
    private final Graphics2D measureG;
    private final AffineTransform frameBase = new AffineTransform();

    AwtPainter(int px, File emojiDir) {
        img = new BufferedImage(px, px, BufferedImage.TYPE_INT_ARGB);
        this.emojiDir = emojiDir;
        measureG = new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB).createGraphics();
    }

    @Override public void beginFrame(float scale) {
        if (g != null) g.dispose();
        g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);
        g.setComposite(AlphaComposite.Src); g.setColor(Color.BLACK); g.fillRect(0, 0, img.getWidth(), img.getHeight());
        g.setComposite(AlphaComposite.SrcOver);
        g.scale(scale, scale);
        frameBase.setTransform(g.getTransform());
        stack.clear(); path = new Path2D.Float();
    }
    @Override public void save() { stack.add(new Object[]{g.getTransform(), g.getClip()}); }
    @Override public void restore() { if (stack.isEmpty()) return; Object[] o = stack.remove(stack.size() - 1); g.setTransform((AffineTransform) o[0]); g.setClip((Shape) o[1]); }
    @Override public void translate(float x, float y) { g.translate(x, y); }
    @Override public void rotate(float rad) { g.rotate(rad); }
    @Override public void scale(float sx, float sy) { g.scale(sx, sy); }
    @Override public void setTransform(float a, float b, float c, float d, float e, float f) { AffineTransform t = new AffineTransform(frameBase); t.concatenate(new AffineTransform(a, b, c, d, e, f)); g.setTransform(t); }
    @Override public void transform(float a, float b, float c, float d, float e, float f) { g.transform(new AffineTransform(a, b, c, d, e, f)); }

    @Override public void beginPath() { path = new Path2D.Float(); }
    @Override public void closePath() { if (path.getCurrentPoint() != null) path.closePath(); }
    @Override public void moveTo(float x, float y) { path.moveTo(x, y); }
    @Override public void lineTo(float x, float y) { if (path.getCurrentPoint() == null) path.moveTo(x, y); else path.lineTo(x, y); }
    @Override public void arc(float cx, float cy, float rx, float ry, float start, float sweep, float rot, boolean connect) {
        if (rot != 0) {
            int n = Math.max(8, (int) (Math.abs(sweep) / (Math.PI * 2) * 48));
            double cr = Math.cos(rot), sr = Math.sin(rot);
            for (int i = 0; i <= n; i++) {
                double a = start + sweep * i / n, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
                float x = (float) (cx + px * cr - py * sr), y = (float) (cy + px * sr + py * cr);
                if (i == 0 && (!connect || path.getCurrentPoint() == null)) path.moveTo(x, y); else path.lineTo(x, y);
            }
            return;
        }
        // Java2D: ángulos en grados y en sentido contrario al canvas (y hacia abajo)
        Arc2D.Double a = new Arc2D.Double(cx - rx, cy - ry, 2 * rx, 2 * ry, -Math.toDegrees(start), -Math.toDegrees(sweep), Arc2D.OPEN);
        path.append(a, connect && path.getCurrentPoint() != null);
    }
    @Override public void rect(float x, float y, float w, float h) { path.append(new Rectangle2D.Float(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h)), false); }
    @Override public void roundRect(float x, float y, float w, float h, float r) { path.append(new RoundRectangle2D.Float(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h), 2 * r, 2 * r), false); }
    @Override public void quadTo(float cx, float cy, float x, float y) { if (path.getCurrentPoint() == null) path.moveTo(cx, cy); path.quadTo(cx, cy, x, y); }
    @Override public void cubicTo(float a, float b, float c, float d, float x, float y) { if (path.getCurrentPoint() == null) path.moveTo(a, b); path.curveTo(a, b, c, d, x, y); }

    private static Color col(int argb, float alpha) { int c = CssColor.withAlpha(argb, alpha); return new Color(c, true); }
    private static java.awt.Paint paint(int color, Ops.Grad gr, float alpha) {
        if (gr == null || gr.colors.length == 0) return col(color, alpha);
        if (gr.colors.length == 1) return col(gr.colors[0], alpha);
        int n = gr.colors.length; float[] fr = new float[n]; Color[] cs = new Color[n];
        float prev = -1;
        for (int i = 0; i < n; i++) {
            float f = gr.kind == 1 ? (gr.r0 + gr.offsets[i] * (gr.r1 - gr.r0)) / Math.max(0.01f, gr.r1) : gr.offsets[i];
            f = Math.max(0, Math.min(1, f));
            if (f <= prev) f = Math.min(1, prev + 1e-4f);   // Java2D exige cortes crecientes
            if (f <= prev) { n = i; break; }
            fr[i] = f; prev = f; cs[i] = col(gr.colors[i], alpha);
        }
        if (n < 2) return cs[0];
        if (n < fr.length) { fr = java.util.Arrays.copyOf(fr, n); cs = java.util.Arrays.copyOf(cs, n); }
        try {
            if (gr.kind == 0) {
                if (Math.abs(gr.x0 - gr.x1) < 1e-3 && Math.abs(gr.y0 - gr.y1) < 1e-3) return cs[n - 1];
                return new LinearGradientPaint(new Point2D.Float(gr.x0, gr.y0), new Point2D.Float(gr.x1, gr.y1), fr, cs, MultipleGradientPaint.CycleMethod.NO_CYCLE);
            }
            return new RadialGradientPaint(new Point2D.Float(gr.x1, gr.y1), Math.max(0.01f, gr.r1), new Point2D.Float(gr.x0, gr.y0), fr, cs, MultipleGradientPaint.CycleMethod.NO_CYCLE);
        } catch (IllegalArgumentException e) { return cs[0]; }
    }
    private void comp(Ops.Style s) {
        if (s.composite == 2) g.setComposite(AlphaComposite.DstOut);
        else if (s.composite == 7) g.setComposite(AlphaComposite.DstOver);
        else if (s.composite == 6) g.setComposite(AlphaComposite.DstIn);
        else if (s.composite == 5) g.setComposite(AlphaComposite.SrcAtop);
        else g.setComposite(AlphaComposite.SrcOver);
    }
    private BasicStroke basicStroke(Ops.Style s) {
        int cap = s.lineCap == 1 ? BasicStroke.CAP_ROUND : s.lineCap == 2 ? BasicStroke.CAP_SQUARE : BasicStroke.CAP_BUTT;
        int join = s.lineJoin == 1 ? BasicStroke.JOIN_ROUND : s.lineJoin == 2 ? BasicStroke.JOIN_BEVEL : BasicStroke.JOIN_MITER;
        if (s.dash != null) return new BasicStroke(Math.max(0.01f, s.lineWidth), cap, join, 10f, s.dash, s.dashPhase());
        return new BasicStroke(Math.max(0.01f, s.lineWidth), cap, join, 10f);
    }

    @Override public void fill(Ops.Style s, boolean evenOdd) {
        path.setWindingRule(evenOdd ? Path2D.WIND_EVEN_ODD : Path2D.WIND_NON_ZERO);
        comp(s); g.setPaint(paint(s.fillColor, s.fillGrad, s.alpha)); g.fill(path); g.setComposite(AlphaComposite.SrcOver);
    }
    @Override public void stroke(Ops.Style s) { comp(s); g.setPaint(paint(s.strokeColor, s.strokeGrad, s.alpha)); g.setStroke(basicStroke(s)); g.draw(path); g.setComposite(AlphaComposite.SrcOver); }
    @Override public void clip(boolean evenOdd) { path.setWindingRule(evenOdd ? Path2D.WIND_EVEN_ODD : Path2D.WIND_NON_ZERO); g.clip(path); }
    @Override public void fillRect(float x, float y, float w, float h, Ops.Style s) { comp(s); g.setPaint(paint(s.fillColor, s.fillGrad, s.alpha)); g.fill(new Rectangle2D.Float(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h))); g.setComposite(AlphaComposite.SrcOver); }
    @Override public void strokeRect(float x, float y, float w, float h, Ops.Style s) { comp(s); g.setPaint(paint(s.strokeColor, s.strokeGrad, s.alpha)); g.setStroke(basicStroke(s)); g.draw(new Rectangle2D.Float(x, y, w, h)); g.setComposite(AlphaComposite.SrcOver); }
    @Override public void clearRect(float x, float y, float w, float h) { g.setPaint(Color.BLACK); g.fill(new Rectangle2D.Float(x, y, w, h)); }

    private Font font(FontSpec f) {
        if (f.cache instanceof Font) return (Font) f.cache;
        String fam = f.family == FontSpec.SERIF ? Font.SERIF : f.family == FontSpec.MONO ? Font.MONOSPACED : f.family == FontSpec.CONDENSED ? "DejaVu Sans Condensed" : "DejaVu Sans";
        Font ft = new Font(fam, (f.weight >= 600 ? Font.BOLD : Font.PLAIN) | (f.italic ? Font.ITALIC : 0), 12).deriveFont(Math.max(1f, f.size));
        f.cache = ft;
        return ft;
    }
    /* Java2D no pinta emojis en color dentro de un texto: se parte el texto en trozos de letras y de emojis */
    private static boolean emojiStart(String t, int i) {
        int cp = t.codePointAt(i), nx = i + Character.charCount(cp);
        if (cp >= 0x1F000) return true;
        if (nx < t.length() && t.charAt(nx) == 0xFE0F) return true;
        int[] set = {0x2B50, 0x2B55, 0x231A, 0x231B, 0x2705, 0x2728, 0x274C, 0x274E, 0x2757, 0x26A1, 0x26BD, 0x26BE, 0x2614, 0x2615, 0x267F, 0x2693, 0x26AA, 0x26AB, 0x2B1B, 0x2B1C};
        for (int v : set) if (cp == v) return true;
        return (cp >= 0x23E9 && cp <= 0x23F3) || (cp >= 0x23F8 && cp <= 0x23FA) || (cp >= 0x2753 && cp <= 0x2755) || (cp >= 0x2795 && cp <= 0x2797);
    }
    private static int emojiEnd(String t, int i) {
        int j = i + Character.charCount(t.codePointAt(i));
        while (j < t.length()) {
            int cp = t.codePointAt(j);
            if (cp == 0xFE0F || cp == 0x20E3 || (cp >= 0x1F3FB && cp <= 0x1F3FF) || (cp >= 0xE0020 && cp <= 0xE007F)) { j += Character.charCount(cp); continue; }
            if (cp == 0x200D && j + 1 < t.length()) { j++; j += Character.charCount(t.codePointAt(j)); continue; }
            break;
        }
        return j;
    }
    /** trozos: [texto, esEmoji] */
    private static java.util.List<Object[]> runs(String t) {
        java.util.List<Object[]> out = new ArrayList<>(); int i = 0, start = 0;
        while (i < t.length()) {
            if (emojiStart(t, i)) { if (i > start) out.add(new Object[]{t.substring(start, i), false}); int j = emojiEnd(t, i); out.add(new Object[]{t.substring(i, j), true}); i = start = j; }
            else i += Character.charCount(t.codePointAt(i));
        }
        if (start < t.length()) out.add(new Object[]{t.substring(start), false});
        return out;
    }
    private float runWidth(Object[] r, Font ft) { return (Boolean) r[1] ? ft.getSize2D() * 1.18f : (float) ft.getStringBounds((String) r[0], measureG.getFontRenderContext()).getWidth(); }

    @Override public void text(String t, float x, float y, float maxW, boolean strokeIt, Ops.Style s) {
        Font ft = font(s.font);
        FontMetrics m = measureG.getFontMetrics(ft);
        java.util.List<Object[]> rs = runs(t);
        float w = 0; for (Object[] r : rs) w += runWidth(r, ft);
        float dx = s.textAlign == 1 ? -w / 2 : s.textAlign == 2 ? -w : 0;
        float asc = m.getAscent(), desc = m.getDescent();
        float dy = s.textBaseline == 1 ? asc : s.textBaseline == 2 ? (asc - desc) / 2f : s.textBaseline == 3 ? -desc : 0;
        AffineTransform keep = g.getTransform();
        g.translate(x, y);
        if (maxW > 0 && w > maxW) g.scale(maxW / w, 1);
        comp(s);
        float cx = dx;
        for (Object[] r : rs) {
            float rw = runWidth(r, ft);
            if ((Boolean) r[1]) {
                if (!strokeIt) {
                    BufferedImage b = emojiImg((String) r[0]);
                    float sz = ft.getSize2D(), iw = sz * 1.35f;
                    if (b.getWidth() > 1) { AffineTransform at = new AffineTransform(); at.translate(cx + rw / 2 - iw / 2, dy - sz * 0.38f - iw / 2); at.scale(iw / b.getWidth(), iw / b.getHeight());
                        if (s.alpha < 1) g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, Math.max(0, Math.min(1, s.alpha)))); g.drawImage(b, at, null); comp(s); }
                }
            } else {
                Shape glyphs = ft.createGlyphVector(measureG.getFontRenderContext(), (String) r[0]).getOutline(cx, dy);
                if (strokeIt) { g.setPaint(paint(s.strokeColor, s.strokeGrad, s.alpha)); g.setStroke(basicStroke(s)); g.draw(glyphs); }
                else { g.setPaint(paint(s.fillColor, s.fillGrad, s.alpha)); g.fill(glyphs); }
            }
            cx += rw;
        }
        g.setComposite(AlphaComposite.SrcOver);
        g.setTransform(keep);
    }

    private BufferedImage emojiImg(String e) {
        BufferedImage b = emojis.get(e);
        if (b != null) return b;
        StringBuilder hex = new StringBuilder();
        e.codePoints().forEach(cp -> hex.append(hex.length() > 0 ? "_" : "").append(Integer.toHexString(cp)));
        File f = new File(emojiDir, hex + ".png");
        try {
            if (!f.exists()) new ProcessBuilder("python3", new File(emojiDir.getParentFile(), "emoji.py").getPath(), emojiDir.getPath(), hex.toString()).inheritIO().start().waitFor();
            b = ImageIO.read(f);
        } catch (Exception ex) { b = null; }
        if (b == null) b = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
        emojis.put(e, b);
        return b;
    }
    @Override public void emoji(String e, float x, float y, float size, Ops.Style s) {
        BufferedImage b = emojiImg(e);
        if (b.getWidth() <= 1) return;
        float w = size * 1.35f;   // como en la web: imagen de 1,35 × el tamaño de letra, con el dibujo centrado
        comp(s);
        if (s.alpha < 1) g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, Math.max(0, Math.min(1, s.alpha))));
        AffineTransform at = new AffineTransform(); at.translate(x - w / 2, y - w / 2); at.scale(w / b.getWidth(), w / b.getHeight());
        g.drawImage(b, at, null);
        g.setComposite(AlphaComposite.SrcOver);
    }

    @Override public float measure(String text, FontSpec f) { Font ft = font(f); float w = 0; for (Object[] r : runs(text)) w += runWidth(r, ft); return w; }
    @Override public boolean hasGlyph(String text) { return true; }
}
