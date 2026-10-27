package com.juegosboom.arcadewatch;

import java.util.HashMap;
import java.util.Locale;

/** Convierte colores CSS ('#ffcc33', 'rgba(0,0,0,.5)', 'hsl(200 80% 50%)', 'white'…) en ARGB. Sin Android. */
public final class CssColor {
    private CssColor() {}

    private static final HashMap<String, Integer> NAMES = new HashMap<>();
    static {
        String[] n = ("aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 "
            + "blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e "
            + "coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b "
            + "darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 "
            + "darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f "
            + "darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff "
            + "firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 "
            + "gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 "
            + "khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 "
            + "lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a "
            + "lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 "
            + "lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 "
            + "mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc "
            + "mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 "
            + "oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 "
            + "paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 "
            + "purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 "
            + "seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 "
            + "snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee "
            + "wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32").split(" ");
        for (int i = 0; i + 1 < n.length; i += 2) NAMES.put(n[i], 0xFF000000 | Integer.parseInt(n[i + 1], 16));
        NAMES.put("transparent", 0);
    }

    /** ARGB; si no se entiende el color, negro (como hace el navegador con el valor por defecto). */
    public static int parse(String s) {
        if (s == null) return 0xFF000000;
        String c = s.trim().toLowerCase(Locale.ROOT);
        try {
            if (c.startsWith("#")) return hex(c.substring(1));
            Integer named = NAMES.get(c);
            if (named != null) return named;
            int p = c.indexOf('(');
            if (p > 0 && c.endsWith(")")) {
                String fn = c.substring(0, p).trim();
                String[] parts = c.substring(p + 1, c.length() - 1).replace('/', ' ').replace(',', ' ').trim().split("\\s+");
                if (fn.startsWith("rgb")) {
                    int r = chan(parts[0]), g = chan(parts[1]), b = chan(parts[2]);
                    float a = parts.length > 3 ? alpha(parts[3]) : 1f;
                    return argb(a, r, g, b);
                }
                if (fn.startsWith("hsl")) {
                    float h = hue(parts[0]), sat = pct(parts[1]), l = pct(parts[2]);
                    float a = parts.length > 3 ? alpha(parts[3]) : 1f;
                    float q = l < 0.5f ? l * (1 + sat) : l + sat - l * sat, pp = 2 * l - q;
                    int r = Math.round(255 * hue2rgb(pp, q, h + 1f / 3)), g = Math.round(255 * hue2rgb(pp, q, h)), b = Math.round(255 * hue2rgb(pp, q, h - 1f / 3));
                    return argb(a, r, g, b);
                }
            }
        } catch (RuntimeException ignored) { }
        return 0xFF000000;
    }

    private static int hex(String h) {
        if (h.length() == 3 || h.length() == 4) {
            StringBuilder b = new StringBuilder();
            for (char ch : h.toCharArray()) b.append(ch).append(ch);
            h = b.toString();
        }
        if (h.length() == 6) return 0xFF000000 | Integer.parseInt(h, 16);
        if (h.length() == 8) { long v = Long.parseLong(h, 16); return (int) (((v & 0xFF) << 24) | (v >>> 8)); }
        return 0xFF000000;
    }
    private static int chan(String v) {
        float f = v.endsWith("%") ? Float.parseFloat(v.substring(0, v.length() - 1)) * 2.55f : Float.parseFloat(v);
        return Math.max(0, Math.min(255, Math.round(f)));
    }
    private static float alpha(String v) {
        float f = v.endsWith("%") ? Float.parseFloat(v.substring(0, v.length() - 1)) / 100f : Float.parseFloat(v);
        return Math.max(0f, Math.min(1f, f));
    }
    private static float pct(String v) { return Math.max(0f, Math.min(1f, Float.parseFloat(v.replace("%", "")) / 100f)); }
    private static float hue(String v) {
        float h;
        if (v.endsWith("deg")) h = Float.parseFloat(v.substring(0, v.length() - 3));
        else if (v.endsWith("turn")) h = Float.parseFloat(v.substring(0, v.length() - 4)) * 360f;
        else if (v.endsWith("rad")) h = (float) Math.toDegrees(Float.parseFloat(v.substring(0, v.length() - 3)));
        else h = Float.parseFloat(v);
        h = ((h % 360f) + 360f) % 360f;
        return h / 360f;
    }
    private static float hue2rgb(float p, float q, float t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1f / 6) return p + (q - p) * 6 * t;
        if (t < 1f / 2) return q;
        if (t < 2f / 3) return p + (q - p) * (2f / 3 - t) * 6;
        return p;
    }
    private static int argb(float a, int r, int g, int b) { return (Math.round(a * 255) << 24) | (r << 16) | (g << 8) | b; }

    /** Multiplica la transparencia de un color por a (0…1). */
    public static int withAlpha(int argb, float a) {
        int al = Math.round(((argb >>> 24) & 0xFF) * Math.max(0f, Math.min(1f, a)));
        return (al << 24) | (argb & 0xFFFFFF);
    }
}
