package com.juegosboom.arcadewatch;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Locale;
import javax.imageio.ImageIO;

/**
 * Prueba de escritorio de Arcade Watch: carga los mismos archivos que la app (assets) en la misma librería
 * (libarcadejs.so compilada para Linux), juega con un bot y guarda capturas como se verían en un reloj redondo.
 * Uso: java -Djava.library.path=… com.juegosboom.arcadewatch.Prueba <carpeta del proyecto wearos> <carpeta de salida> [lado en px]
 */
public final class Prueba {
    static JsEngine js;
    static Ops ops = new Ops();
    static AwtPainter painter;
    static float scale;
    static File out;
    static int px, errors, frames, sounds;
    static double jsMs, drawMs;
    static final HashMap<String, String> store = new HashMap<>();
    static final double DT = 1000.0 / 60;

    public static void main(String[] a) throws Exception {
        File proj = new File(a[0]);
        out = new File(a[1]); out.mkdirs();
        px = a.length > 2 ? Integer.parseInt(a[2]) : 454;
        File assets = new File(proj, "app/src/main/assets");
        painter = new AwtPainter(px, new File(proj, "prueba-escritorio/cache-emoji"));
        scale = px / 300f;
        js = new JsEngine(new JsEngine.Host() {
            final HashMap<String, FontSpec> fc = new HashMap<>();
            public float measureText(String t, String f) { return painter.measure(t, fc.computeIfAbsent(f, FontSpec::parse)); }
            public boolean hasGlyph(String t) { return true; }
            public String storeGet(String k) { return store.get(k); }
            public void storeSet(String k, String v) { if (v == null) store.remove(k); else store.put(k, v); }
            public void log(String m) { System.out.println("[js] " + m); if (m.startsWith("JS:") || m.startsWith("ERROR")) errors++; }
        });
        js.eval(read(new File(assets, "js/canvas.js")), "canvas.js");
        js.eval(read(new File(assets, "js/core.js")), "core.js");
        js.callS("__init", "es", 300);
        boolean phys = false;
        for (String line : read(new File(assets, "games/lista.txt")).split("\n")) {
            String id = line.trim(); if (id.isEmpty() || id.startsWith("#")) continue;
            String src = read(new File(assets, "games/" + id + ".js"));
            if (src.contains("@phys") && !phys) { js.eval(read(new File(assets, "js/phys.js")), "phys.js"); phys = true; }
            js.eval(src, id + ".js");
        }
        js.eval(read(new File(proj, "prueba-escritorio/bot.js")), "bot.js");
        int n = (int) js.call("__start");
        System.out.println("Juegos cargados: " + n + " (" + js.callS("__gameIds") + ")");

        if (a.length > 3) { compat(a[3].split(","), new File(proj, "../herramientas/src")); return; }
        for (String id : js.callS("__gameIds").split(",")) playGame(id);

        // corona: el Leñador cortando solo con la corona
        js.callS("__select", "lenador"); run(10, false);
        tap(150, 150); run(10, false);
        js.eval("__botRotary = true", "x");
        double s0 = score();
        run(60 * 15, true);
        System.out.printf(Locale.ROOT, "Corona en el Leñador: %.0f → %.0f puntos (%s)%n", s0, score(), js.callS("__debug"));
        snap("lenador-corona");
        js.eval("__botRotary = false", "x");
        // volver: pausa y lista de juegos
        js.call("__back"); run(20, false); snap("pausa");
        js.call("__back"); run(20, false); snap("vuelta-lista");
        System.out.println("Volver desde la lista (0 = cerrar app): " + (int) js.call("__back"));

        System.out.printf(Locale.ROOT, "%nFotogramas: %d · JS %.3f ms/fotograma · dibujo Java2D %.3f ms · sonidos: %d · errores JS: %d%n",
            frames, jsMs / frames, drawMs / Math.max(1, frames / 3), sounds, errors);
        js.close();
    }

    static void playGame(String id) {
        System.out.println("\n== " + id);
        js.callS("__select", id);
        run(40, false); snap(id + "-1-lista");
        tap(150, 150); run(25, false); snap(id + "-2-ayuda");
        tap(150, 150); run(30, false); snap(id + "-3-empieza");
        int wins = 0, overs = 0; double best = 0; boolean shotPlay = false, shotWin = false, shotOver = false;
        for (int sec = 0; sec < 150; sec++) {
            run(60, true);
            String st = js.callS("__state");
            best = Math.max(best, score());
            if (!shotPlay && sec == 4 && "play".equals(st)) { snap(id + "-4-jugando"); shotPlay = true; }
            if ("win".equals(st) || "done".equals(st)) { wins++; run(40, false); if (!shotWin) { snap(id + "-5-nivel-superado"); shotWin = true; } tap(150, 140); run(30, false); }
            else if ("over".equals(st)) { overs++; run(40, false); if (!shotOver) { snap(id + "-6-fin"); shotOver = true; } tap(150, 140); run(30, false); }
            if (wins >= 3 && shotOver) break;
        }
        if (!shotPlay) snap(id + "-4-jugando");
        System.out.printf(Locale.ROOT, "%s: niveles superados %d · partidas perdidas %d · mejor puntuación %.0f · %s%n", id, wins, overs, best, js.callS("__debug"));
        js.call("__back"); run(5, false); js.call("__back"); run(5, false);
    }

    /** Compatibilidad: carga cada juego de la web en un motor nuevo, juega 40 s con el bot y apunta errores. */
    static void compat(String[] ids, File src) {
        js.close();
        StringBuilder res = new StringBuilder();
        File dir = new File(out, "compat"); dir.mkdirs();
        File assets = new File(out.getAbsoluteFile().getParentFile().getParentFile(), "app/src/main/assets");
        for (String id : ids) {
            errors = 0; String note = "";
            try {
                js = new JsEngine(js.host()); ops = new Ops();   // motor nuevo: tabla de cadenas nueva
                js.eval(read(new File(assets, "js/canvas.js")), "canvas.js");
                js.eval(read(new File(assets, "js/core.js")), "core.js");
                js.callS("__init", "es", 300);
                String code = read(new File(src, id + ".js"));
                if (code.contains("@phys")) js.eval(read(new File(assets, "js/phys.js")), "phys.js");
                js.eval(code, id + ".js");
                js.eval(read(new File(out.getAbsoluteFile().getParentFile(), "bot.js")), "bot.js");
                js.call("__start"); store.put("arc_seen_" + id, "true");
                run(10, false); tap(150, 150); run(10, false);
                double best = 0; int overs = 0, wins = 0;
                for (int sec = 0; sec < 40; sec++) {
                    run(60, true); best = Math.max(best, score());
                    if (sec == 6) snapTo(new File(dir, id + ".png"));
                    String st = js.callS("__state");
                    if ("over".equals(st)) { overs++; run(30, false); tap(150, 140); run(10, false); }
                    else if ("win".equals(st) || "done".equals(st)) { wins++; run(30, false); tap(150, 140); run(10, false); }
                    else if ("error".equals(st)) { note = js.callS("__debug"); break; }
                }
                note = String.format(Locale.ROOT, "niveles %d · perdidas %d · puntos %.0f %s", wins, overs, best, note);
            } catch (RuntimeException e) { errors++; note = "NO CARGA: " + e.getMessage().split("\n")[0]; }
            String line = String.format(Locale.ROOT, "%-14s %s · errores JS %d", id, note, errors);
            System.out.println(line); res.append(line).append('\n');
            js.close();
        }
        try { Files.write(new File(dir, "resultado.txt").toPath(), res.toString().getBytes(StandardCharsets.UTF_8)); } catch (IOException e) { throw new RuntimeException(e); }
    }

    static double score() { String d = js.callS("__debug"); int i = d.indexOf("\"score\":"); if (i < 0) return 0; int j = i + 8, k = j; while (k < d.length() && "-0123456789.".indexOf(d.charAt(k)) >= 0) k++; try { return Double.parseDouble(d.substring(j, k)); } catch (RuntimeException e) { return 0; } }

    static void tap(float x, float y) { js.call("__input", 0, 1, x, y); frame(false); js.call("__input", 2, 1, x, y); }

    static void run(int n, boolean bot) { for (int i = 0; i < n; i++) { if (bot) js.call("__botTick", DT / 1000); frame(i % 3 == 0); } }

    static void frame(boolean draw) {
        long t0 = System.nanoTime();
        int n = js.frame(DT);
        ops.addStrings(js.newStrings());
        sounds += js.takeSounds() / 8;
        jsMs += (System.nanoTime() - t0) / 1e6;
        frames++;
        if (draw) {
            long t1 = System.nanoTime();
            ops.run(js.commands(), n, painter, scale);
            drawMs += (System.nanoTime() - t1) / 1e6;
        }
        lastN = n;
    }
    static int lastN;

    static void snap(String name) { snapTo(new File(out, name + ".png")); }
    /** Captura del último fotograma con la forma de un reloj redondo. */
    static void snapTo(File file) {
        ops.run(js.commands(), lastN, painter, scale);
        BufferedImage im = new BufferedImage(px + 24, px + 24, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = im.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0x1b1b1f)); g.fill(new Ellipse2D.Float(0, 0, px + 24, px + 24));
        g.setClip(new Ellipse2D.Float(12, 12, px, px));
        g.drawImage(painter.img, 12, 12, null);
        g.dispose();
        try { ImageIO.write(im, "png", file); } catch (IOException e) { throw new RuntimeException(e); }
    }

    static String read(File f) { try { return new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8); } catch (IOException e) { throw new RuntimeException(e); } }
}
