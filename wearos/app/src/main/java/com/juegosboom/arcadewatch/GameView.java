package com.juegosboom.arcadewatch;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.util.Log;
import android.view.Choreographer;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;

/**
 * La pantalla del juego: en cada fotograma del sistema avanza el motor JS, pinta sus órdenes y toca sus sonidos.
 * Pasa al JS los toques (en coordenadas lógicas), la corona/bisel y el gesto de volver (deslizar desde el borde izquierdo).
 */
public final class GameView extends View implements Choreographer.FrameCallback, JsEngine.Host {
    /** Tamaño lógico del lienzo: los juegos ven un lienzo de 300 × 300 sea cual sea el reloj. */
    static final int LOGICAL = 300;
    /** Desplazamiento de la corona (en píxeles de scroll) que cuenta como un paso a izquierda o derecha. */
    private static final float ROTARY_STEP = 64f;
    private static final String TAG = "ArcadeWatch";

    interface Exit { void exit(); }

    private final AndroidPainter painter = new AndroidPainter();
    private final Ops ops = new Ops();
    private final SharedPreferences prefs;
    private final HashMap<String, FontSpec> fontCache = new HashMap<>();
    private final Synth synth;
    private JsEngine js;
    private int nCmd;
    private boolean running;
    private long lastNs;
    private float scale = 1, offX, offY;
    private float rotaryAcc;
    private final float scrollFactor;
    private Exit onExit;
    // gesto de volver: deslizar a la derecha desde el borde izquierdo
    private int edgeId = -1; private float edgeX, edgeY; private long edgeT;
    private long statT; private int statFrames; private double statJs, statDraw;
    private String fatal;

    public GameView(Context ctx) {
        super(ctx);
        setFocusable(true); setFocusableInTouchMode(true);
        prefs = ctx.getSharedPreferences("arcade", Context.MODE_PRIVATE);
        scrollFactor = ViewConfiguration.get(ctx).getScaledVerticalScrollFactor();
        synth = new Synth(ctx);
        try { boot(); } catch (RuntimeException e) { fatal = e.getMessage(); Log.e(TAG, "arranque", e); }
    }

    void setOnExit(Exit e) { onExit = e; }

    private String asset(String path) {
        try (InputStream in = getContext().getAssets().open(path)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[16384]; int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return new String(b.toByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) { throw new RuntimeException("Falta " + path, e); }
    }

    /** Carga el motor y los juegos de assets/games (en el orden de assets/games/lista.txt). */
    private void boot() {
        js = new JsEngine(this);
        js.eval(asset("js/canvas.js"), "canvas.js");
        js.eval(asset("js/core.js"), "core.js");
        String lang = Locale.getDefault().getLanguage();
        js.callS("__init", "es,ca,gl,eu".contains(lang) ? "es" : "en", LOGICAL);
        boolean phys = false;
        for (String line : asset("games/lista.txt").split("\n")) {
            String id = line.trim();
            if (id.isEmpty() || id.startsWith("#")) continue;
            try {
                String src = asset("games/" + id + ".js");
                if (src.contains("@phys") && !phys) { js.eval(asset("js/phys.js"), "phys.js"); phys = true; }   // motor de física 2D
                js.eval(src, id + ".js");
            }
            catch (RuntimeException e) { Log.e(TAG, "No se pudo cargar " + id + ": " + e.getMessage()); }
        }
        js.call("__start");
    }

    /* ---------- bucle ---------- */
    void resume() {
        if (running || js == null) return;
        running = true; lastNs = 0;
        synth.muted = "true".equals(storeGet("arc_muted"));
        synth.start();
        requestFocus();
        Choreographer.getInstance().postFrameCallback(this);
    }
    void pause() {
        if (!running) return;
        running = false;
        Choreographer.getInstance().removeFrameCallback(this);
        if (js != null) js.call("__pause");
        synth.stop();
    }
    void destroy() { pause(); if (js != null) { js.close(); js = null; } }

    @Override public void doFrame(long ns) {
        if (!running || js == null) return;
        Choreographer.getInstance().postFrameCallback(this);
        double ms = lastNs == 0 ? 16.7 : (ns - lastNs) / 1e6;
        lastNs = ns;
        long t0 = System.nanoTime();
        nCmd = js.frame(ms);
        ops.addStrings(js.newStrings());
        int ns2 = js.takeSounds();
        if (ns2 > 0) synth.play(js.sounds(), ns2);
        statJs += (System.nanoTime() - t0) / 1e6;
        invalidate();
        // la pantalla solo se queda encendida mientras se juega
        if (statFrames % 30 == 0) setKeepScreenOn("play".equals(js.callS("__state")));
    }

    @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
        float s = Math.min(w, h);
        scale = s / LOGICAL; offX = (w - s) / 2f; offY = (h - s) / 2f;
    }

    @Override protected void onDraw(Canvas canvas) {
        canvas.drawColor(0xFF000000);
        if (fatal != null) { drawFatal(canvas); return; }
        long t0 = System.nanoTime();
        painter.setCanvas(canvas);
        int sc = canvas.save();
        canvas.translate(offX, offY);
        try { ops.run(js.commands(), nCmd, painter, scale); }
        catch (RuntimeException e) { Log.e(TAG, "pintar", e); }
        canvas.restoreToCount(sc);
        statDraw += (System.nanoTime() - t0) / 1e6;
        if (++statFrames >= 300) {   // cada ~5 s, tiempos medios en el registro (adb logcat -s ArcadeWatch)
            long now = System.nanoTime();
            double fps = statT > 0 ? statFrames / ((now - statT) / 1e9) : 0;
            Log.i(TAG, String.format(Locale.ROOT, "%.1f fps · JS %.2f ms · dibujo %.2f ms · %d órdenes", fps, statJs / statFrames, statDraw / statFrames, ops.lastOps));
            statT = now; statFrames = 0; statJs = 0; statDraw = 0;
        }
    }
    private void drawFatal(Canvas c) {
        android.graphics.Paint p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        p.setColor(0xFFFFFFFF); p.setTextSize(getWidth() / 20f); p.setTextAlign(android.graphics.Paint.Align.CENTER);
        c.drawText("Error al arrancar", getWidth() / 2f, getHeight() / 2f, p);
    }

    /* ---------- entrada ---------- */
    private float lx(float x) { return (x - offX) / scale; }
    private float ly(float y) { return (y - offY) / scale; }

    @Override public boolean onTouchEvent(MotionEvent ev) {
        if (js == null) return false;
        int a = ev.getActionMasked();
        switch (a) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: {
                int i = ev.getActionIndex(), id = ev.getPointerId(i);
                if (a == MotionEvent.ACTION_DOWN && ev.getX(i) < getWidth() * 0.12f) { edgeId = id; edgeX = ev.getX(i); edgeY = ev.getY(i); edgeT = ev.getEventTime(); }
                js.call("__input", 0, id, lx(ev.getX(i)), ly(ev.getY(i)));
                return true;
            }
            case MotionEvent.ACTION_MOVE:
                for (int i = 0; i < ev.getPointerCount(); i++) {
                    int id = ev.getPointerId(i);
                    if (id == edgeId && ev.getX(i) - edgeX > getWidth() * 0.28f && Math.abs(ev.getY(i) - edgeY) < getHeight() * 0.25f && ev.getEventTime() - edgeT < 600) {
                        edgeId = -1;
                        js.call("__input", 3, id, lx(ev.getX(i)), ly(ev.getY(i)));   // cancela ese toque en el juego
                        back();
                        return true;
                    }
                    js.call("__input", 1, id, lx(ev.getX(i)), ly(ev.getY(i)));
                }
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP: {
                int i = ev.getActionIndex(), id = ev.getPointerId(i);
                if (id == edgeId) edgeId = -1;
                js.call("__input", 2, id, lx(ev.getX(i)), ly(ev.getY(i)));
                return true;
            }
            case MotionEvent.ACTION_CANCEL:
                for (int i = 0; i < ev.getPointerCount(); i++) js.call("__input", 3, ev.getPointerId(i), lx(ev.getX(i)), ly(ev.getY(i)));
                edgeId = -1;
                return true;
        }
        return super.onTouchEvent(ev);
    }

    /** Corona o bisel giratorio: cada ROTARY_STEP de desplazamiento es un paso (horario = derecha). */
    @Override public boolean onGenericMotionEvent(MotionEvent ev) {
        if (js != null && ev.getAction() == MotionEvent.ACTION_SCROLL && ev.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            rotaryAcc += -ev.getAxisValue(MotionEvent.AXIS_SCROLL) * scrollFactor;
            while (rotaryAcc >= ROTARY_STEP) { rotaryAcc -= ROTARY_STEP; js.call("__rotary", 1); }
            while (rotaryAcc <= -ROTARY_STEP) { rotaryAcc += ROTARY_STEP; js.call("__rotary", -1); }
            return true;
        }
        return super.onGenericMotionEvent(ev);
    }

    /** Teclas (emulador con teclado, relojes con botones de dirección). */
    private static String keyName(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: return "ArrowLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "ArrowRight";
            case KeyEvent.KEYCODE_DPAD_UP: return "ArrowUp";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "ArrowDown";
            case KeyEvent.KEYCODE_SPACE: case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: return " ";
            default: return null;
        }
    }
    @Override public boolean onKeyDown(int code, KeyEvent ev) {
        String k = keyName(code);
        if (k != null && js != null) { if (ev.getRepeatCount() == 0) js.callS("__key", k, 1); return true; }
        return super.onKeyDown(code, ev);
    }
    @Override public boolean onKeyUp(int code, KeyEvent ev) {
        String k = keyName(code);
        if (k != null && js != null) { js.callS("__key", k, 0); return true; }
        return super.onKeyUp(code, ev);
    }

    /** Volver: primero lo intenta el juego (pausa, menú…); si ya está en la lista de juegos, se cierra la app. */
    void back() {
        if (js == null || js.call("__back") == 0) { if (onExit != null) onExit.exit(); }
    }

    /* ---------- JsEngine.Host ---------- */
    @Override public float measureText(String text, String font) {
        FontSpec f = fontCache.get(font);
        if (f == null) { f = FontSpec.parse(font); if (fontCache.size() > 200) fontCache.clear(); fontCache.put(font, f); }
        return painter.measure(text, f);
    }
    @Override public boolean hasGlyph(String text) { return painter.hasGlyph(text); }
    @Override public String storeGet(String key) { return prefs.getString(key, null); }
    @Override public void storeSet(String key, String value) {
        if (value == null) prefs.edit().remove(key).apply(); else prefs.edit().putString(key, value).apply();
        if ("arc_muted".equals(key)) synth.muted = "true".equals(value);
    }
    @Override public void log(String msg) { Log.i(TAG, msg); }
}
