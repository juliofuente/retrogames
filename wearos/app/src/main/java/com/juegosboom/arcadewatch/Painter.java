package com.juegosboom.arcadewatch;

/**
 * Quien pinta de verdad las órdenes del canvas falso. En el reloj es AndroidPainter (android.graphics.Canvas);
 * en las pruebas de escritorio, AwtPainter (Java2D). El estilo (colores, grosor, fuente…) llega en cada orden de
 * dibujo dentro de Style; la matriz, el recorte y el trazo en curso los guarda quien pinta.
 */
public interface Painter {
    /** Al empezar cada fotograma: matriz identidad, sin recorte y escala lógica → píxeles. */
    void beginFrame(float scale);
    void save();
    void restore();
    void translate(float x, float y);
    void rotate(float rad);
    void scale(float sx, float sy);
    /** Matriz absoluta del canvas (a b c d e f), en unidades lógicas; quien pinta añade su escala. */
    void setTransform(float a, float b, float c, float d, float e, float f);
    void transform(float a, float b, float c, float d, float e, float f);

    void beginPath();
    void closePath();
    void moveTo(float x, float y);
    void lineTo(float x, float y);
    /** Arco de elipse; sweep en radianes con signo (ya ajustado como el navegador). connect = unir con una línea al punto actual. */
    void arc(float cx, float cy, float rx, float ry, float start, float sweep, float rot, boolean connect);
    void rect(float x, float y, float w, float h);
    void roundRect(float x, float y, float w, float h, float r);
    void quadTo(float cx, float cy, float x, float y);
    void cubicTo(float c1x, float c1y, float c2x, float c2y, float x, float y);

    void fill(Ops.Style s, boolean evenOdd);
    void stroke(Ops.Style s);
    void clip(boolean evenOdd);
    void fillRect(float x, float y, float w, float h, Ops.Style s);
    void strokeRect(float x, float y, float w, float h, Ops.Style s);
    void clearRect(float x, float y, float w, float h);
    void text(String t, float x, float y, float maxW, boolean stroke, Ops.Style s);
    /** Emoji centrado en (x, y) con tamaño de letra size (unidades lógicas). */
    void emoji(String e, float x, float y, float size, Ops.Style s);

    /** Ancho de un texto con una fuente (para measureText del JS). */
    float measure(String text, FontSpec font);
    boolean hasGlyph(String text);
}
