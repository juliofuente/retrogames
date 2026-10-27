package com.juegosboom.arcadewatch;

import java.util.Locale;

/** Una fuente CSS ('900 22px "Arial Rounded MT Bold", sans-serif') reducida a lo que puede pintar el reloj. Sin Android. */
public final class FontSpec {
    public static final int SANS = 0, SERIF = 1, MONO = 2, CONDENSED = 3, ROUNDED = 4, EMOJI = 5;
    public final float size;
    public final int weight;
    public final boolean italic;
    public final int family;
    public Object cache;   // la fuente ya preparada por quien pinta (Typeface, java.awt.Font…)

    public FontSpec(float size, int weight, boolean italic, int family) { this.size = size; this.weight = weight; this.italic = italic; this.family = family; }

    public static FontSpec parse(String css) {
        float size = 10; int weight = 400; boolean italic = false; int fam = SANS;
        if (css != null) {
            String s = css.trim();
            int px = s.indexOf("px");
            if (px > 0) {
                int a = px - 1;
                while (a >= 0 && (Character.isDigit(s.charAt(a)) || s.charAt(a) == '.')) a--;
                try { size = Float.parseFloat(s.substring(a + 1, px)); } catch (NumberFormatException ignored) { }
                String pre = s.substring(0, a + 1).toLowerCase(Locale.ROOT);
                for (String w : pre.trim().split("\\s+")) {
                    if (w.equals("bold") || w.equals("bolder")) weight = 700;
                    else if (w.equals("italic") || w.equals("oblique")) italic = true;
                    else if (w.matches("\\d{3}")) weight = Integer.parseInt(w);
                }
                String famStr = s.substring(px + 2).toLowerCase(Locale.ROOT);
                int slash = famStr.indexOf('/');   // «15px/1.2 sans-serif»
                if (slash >= 0 && famStr.trim().startsWith("/")) famStr = famStr.substring(famStr.indexOf(' ', slash) + 1);
                fam = familyOf(famStr);
            }
        }
        return new FontSpec(size, weight, italic, fam);
    }

    private static int familyOf(String f) {
        if (f.contains("emoji") && !f.contains("sans")) return EMOJI;
        if (f.contains("courier") || f.contains("mono") || f.contains("consolas") || f.contains("menlo")) return MONO;
        if (f.contains("impact") || f.contains("narrow")) return CONDENSED;
        if (f.contains("rounded") || f.contains("nunito") || f.contains("varela") || f.contains("comic")) return ROUNDED;
        if ((f.contains("georgia") || f.contains("palatino") || f.contains("serif")) && !f.contains("sans-serif")) return SERIF;
        return SANS;
    }
}
