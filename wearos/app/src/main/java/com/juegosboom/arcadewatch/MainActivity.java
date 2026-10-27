package com.juegosboom.arcadewatch;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.window.OnBackInvokedDispatcher;

/** Única pantalla de la app: la vista del juego a pantalla completa. */
public final class MainActivity extends Activity {
    private GameView view;

    @Override protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        view = new GameView(this);
        view.setOnExit(this::finish);
        setContentView(view);
        if (Build.VERSION.SDK_INT >= 33)
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> view.back());
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { view.back(); }   // Android 12 y anteriores

    @Override protected void onResume() { super.onResume(); view.resume(); }
    @Override protected void onPause() { view.pause(); super.onPause(); }
    @Override protected void onDestroy() { view.destroy(); super.onDestroy(); }
}
