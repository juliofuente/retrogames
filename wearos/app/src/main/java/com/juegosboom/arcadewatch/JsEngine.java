package com.juegosboom.arcadewatch;

/**
 * Motor JavaScript (QuickJS, en libarcadejs.so) con los juegos dentro.
 * No usa nada de Android: la misma clase sirve para el reloj y para las pruebas de escritorio.
 * Todas las llamadas deben hacerse desde el mismo hilo.
 */
public final class JsEngine implements AutoCloseable {
    static { System.loadLibrary("arcadejs"); }

    /** Lo que el JavaScript pide a Java. */
    public interface Host {
        float measureText(String text, String font);
        boolean hasGlyph(String text);
        String storeGet(String key);
        void storeSet(String key, String value);   // value == null → borrar
        void log(String msg);
    }

    private long ptr;
    private final Host host;
    private float[] cmd = new float[1 << 16];
    private final float[] snd = new float[4096];

    public JsEngine(Host host) {
        this.host = host;
        ptr = nativeCreate(host);
        if (ptr == 0) throw new IllegalStateException("No se pudo crear el motor JS");
    }

    /** Ejecuta un script. Lanza una excepción con el error de JS si falla. */
    public void eval(String code, String fileName) {
        String err = nativeEval(ptr, code, fileName);
        if (err != null) throw new RuntimeException(fileName + ": " + err);
    }

    public double call(String fn, double... a) {
        return nativeCallN(ptr, fn, a.length, a.length > 0 ? a[0] : 0, a.length > 1 ? a[1] : 0, a.length > 2 ? a[2] : 0, a.length > 3 ? a[3] : 0);
    }

    public String callS(String fn) { return nativeCallS(ptr, fn, 0, null, 0); }
    public String callS(String fn, String s) { return nativeCallS(ptr, fn, 1, s, 0); }
    public String callS(String fn, String s, double n) { return nativeCallS(ptr, fn, 2, s, n); }

    /** Avanza un fotograma. Devuelve cuántos números hay en commands(). */
    public int frame(double ms) {
        int n = nativeFrame(ptr, ms, cmd);
        if (n < 0) {   // el búfer se ha quedado pequeño: se agranda y se copia otra vez
            cmd = new float[Math.max(-n, cmd.length * 2)];
            n = nativeCopyCommands(ptr, cmd);
            if (n < 0) n = 0;
        }
        return n;
    }

    public float[] commands() { return cmd; }

    /** Cadenas nuevas de este fotograma (colores, fuentes, textos…), separadas por \u0001. Vacío si no hay. */
    public String newStrings() { String s = callS("__newStrings"); return s == null ? "" : s; }

    /** Sonidos pedidos desde el último fotograma: grupos de 8 números (ver core.js). */
    public int takeSounds() { return nativeTakeSoundsInto(ptr, snd); }
    public float[] sounds() { return snd; }

    public Host host() { return host; }

    @Override public void close() { if (ptr != 0) { nativeDestroy(ptr); ptr = 0; } }

    private static native long nativeCreate(Host host);
    private static native void nativeDestroy(long ptr);
    private static native String nativeEval(long ptr, String code, String file);
    private static native double nativeCallN(long ptr, String fn, int argc, double a, double b, double c, double d);
    private static native String nativeCallS(long ptr, String fn, int argc, String s, double n);
    private static native int nativeFrame(long ptr, double ms, float[] out);
    private static native int nativeCopyCommands(long ptr, float[] out);
    private static native int nativeTakeSoundsInto(long ptr, float[] out);
}
