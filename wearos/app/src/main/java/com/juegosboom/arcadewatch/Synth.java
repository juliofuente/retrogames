package com.juegosboom.arcadewatch;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import java.util.ArrayList;
import java.util.Random;

/**
 * Sonidos de los juegos, generados al momento como en la web (Arcade.tone y Arcade.noise con Web Audio):
 * osciladores cuadrado / sierra / triángulo / seno con deslizamiento de tono, ruido con filtro de banda y un poco de eco.
 * Un hilo mezcla las voces activas y las manda a un AudioTrack en continuo. También hace vibrar el reloj.
 */
final class Synth {
    private static final int RATE = 22050;
    private static final int CHUNK = 256;   // ≈ 12 ms por bloque

    private static final class Voice {
        int kind;                 // 0 tono · 1 ruido
        int wave;                 // 0 square 1 sawtooth 2 triangle 3 sine
        double f0, f1, dur, vol, start, phase, echo;
        // filtro de banda (ruido)
        double bf0, b1, b2, a1, a2, x1, x2, y1, y2;
        boolean filtered;
    }

    private final ArrayList<Voice> pending = new ArrayList<>();
    private final ArrayList<Voice> voices = new ArrayList<>();
    private final Random rnd = new Random();
    private final Vibrator vibrator;
    private AudioTrack track;
    private Thread thread;
    private volatile boolean running;
    private long frame;          // muestras ya generadas
    private final float[] echoBuf = new float[(int) (RATE * 0.13)];
    private int echoPos;
    private volatile double echoWet = 0.15;
    volatile boolean muted;

    Synth(Context ctx) {
        Vibrator v;
        if (Build.VERSION.SDK_INT >= 31) { VibratorManager vm = (VibratorManager) ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE); v = vm != null ? vm.getDefaultVibrator() : null; }
        else v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        vibrator = v;
    }

    void start() {
        if (running) return;
        int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        try {
            track = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                .setAudioFormat(new AudioFormat.Builder().setSampleRate(RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                .setBufferSizeInBytes(Math.max(min, CHUNK * 2 * 4))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build();
            track.play();
        } catch (RuntimeException e) { track = null; return; }   // relojes sin altavoz
        running = true;
        thread = new Thread(this::loop, "ArcadeSynth");
        thread.setPriority(Thread.MAX_PRIORITY);
        thread.start();
    }

    void stop() {
        running = false;
        if (thread != null) { try { thread.join(300); } catch (InterruptedException ignored) { } thread = null; }
        if (track != null) { try { track.stop(); } catch (RuntimeException ignored) { } track.release(); track = null; }
        synchronized (pending) { pending.clear(); }
        voices.clear();
    }

    /** Sonidos de JsEngine.takeSounds(): grupos de 8 números [tipo, a, b, c, d, e, f, eco]. */
    void play(float[] s, int n) {
        for (int i = 0; i + 7 < n; i += 8) {
            int kind = (int) s[i];
            if (kind == 2) { vibrate((long) s[i + 1]); continue; }
            if (muted || !running) continue;
            Voice v = new Voice();
            v.kind = kind; v.echo = s[i + 7];
            if (kind == 0) {
                v.f0 = s[i + 1]; v.dur = Math.max(0.01, s[i + 2]); v.wave = (int) s[i + 3]; v.vol = s[i + 4];
                double slide = s[i + 5]; v.f1 = slide != 0 ? Math.max(30, v.f0 + slide) : v.f0;
                v.start = s[i + 6];
            } else {
                v.dur = Math.max(0.01, s[i + 1]); v.vol = s[i + 2]; v.bf0 = s[i + 3]; v.start = s[i + 4];
                v.filtered = v.bf0 > 0;
            }
            synchronized (pending) { pending.add(v); }
        }
    }

    private void vibrate(long ms) {
        if (vibrator == null || ms <= 0 || muted) return;
        try { vibrator.vibrate(VibrationEffect.createOneShot(Math.min(600, ms), VibrationEffect.DEFAULT_AMPLITUDE)); } catch (RuntimeException ignored) { }
    }

    private void loop() {
        short[] out = new short[CHUNK];
        float[] mix = new float[CHUNK];
        while (running) {
            synchronized (pending) {
                for (Voice v : pending) { v.start = frame / (double) RATE + v.start; voices.add(v); if (v.echo > 0) echoWet = v.echo; }
                pending.clear();
            }
            java.util.Arrays.fill(mix, 0f);
            for (int vi = voices.size() - 1; vi >= 0; vi--) {
                Voice v = voices.get(vi);
                boolean alive = render(v, mix);
                if (!alive) voices.remove(vi);
            }
            // eco: retardo de 0,13 s con realimentación 0,28 (como en la web)
            for (int i = 0; i < CHUNK; i++) {
                float d = echoBuf[echoPos];
                float dry = mix[i];
                echoBuf[echoPos] = dry + d * 0.28f;
                echoPos = (echoPos + 1) % echoBuf.length;
                float y = dry + (float) (d * echoWet);
                y = y / (1f + Math.abs(y) * 0.6f);   // compresor suave
                out[i] = (short) Math.max(-32767, Math.min(32767, y * 30000));
            }
            frame += CHUNK;
            AudioTrack t = track;
            if (t == null) break;
            t.write(out, 0, CHUNK);
        }
    }

    /** Mezcla un bloque de una voz. Devuelve false cuando la voz ha terminado. */
    private boolean render(Voice v, float[] mix) {
        double t0 = frame / (double) RATE, dt = 1.0 / RATE;
        if (v.start > t0 + CHUNK * dt) return true;   // aún no empieza
        for (int i = 0; i < CHUNK; i++) {
            double t = t0 + i * dt - v.start;
            if (t < 0) continue;
            if (t > v.dur + 0.02) return false;
            double k = Math.min(1, t / v.dur);
            // envolvente exponencial: subida de 6 ms y caída hasta casi cero al final
            double env = v.kind == 0 ? (t < 0.006 ? v.vol * Math.pow(t / 0.006, 2) : v.vol * Math.pow(0.0001 / v.vol, (t - 0.006) / Math.max(0.001, v.dur - 0.006)))
                                     : v.vol * Math.pow(0.0001 / Math.max(0.0002, v.vol), k);
            double s;
            if (v.kind == 0) {
                double f = v.f0 == v.f1 ? v.f0 : v.f0 * Math.pow(v.f1 / v.f0, k);
                v.phase += f * dt; v.phase -= Math.floor(v.phase);
                double p = v.phase;
                switch (v.wave) {
                    case 0: s = p < 0.5 ? 0.6 : -0.6; break;
                    case 1: s = (2 * p - 1) * 0.7; break;
                    case 2: s = (p < 0.5 ? 4 * p - 1 : 3 - 4 * p) * 0.9; break;
                    default: s = Math.sin(p * Math.PI * 2);
                }
            } else {
                s = rnd.nextDouble() * 2 - 1;
                if (v.filtered) {
                    double fc = v.bf0 * Math.pow(0.25, k);   // la frecuencia del filtro baja hasta 1/4, como en la web
                    if (i % 32 == 0) setBand(v, Math.max(60, fc), 1.2);
                    double y = v.b1 * s + v.b2 * v.x2 - v.a1 * v.y1 - v.a2 * v.y2;   // b0 = b1 (forma simplificada) · b2 = -b0
                    v.x2 = v.x1; v.x1 = s; v.y2 = v.y1; v.y1 = y;
                    s = y * 2.5;
                }
            }
            mix[i] += (float) (s * env);
        }
        return true;
    }

    /** Filtro paso banda (RBJ, ganancia constante en la cresta) */
    private static void setBand(Voice v, double f, double q) {
        double w = 2 * Math.PI * Math.min(f, RATE * 0.45) / RATE, alpha = Math.sin(w) / (2 * q), a0 = 1 + alpha;
        v.b1 = alpha / a0; v.b2 = -alpha / a0; v.a1 = -2 * Math.cos(w) / a0; v.a2 = (1 - alpha) / a0;
    }
}
