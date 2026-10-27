#!/bin/sh
# Prueba de Arcade Watch en un PC con Linux (sin reloj ni Android): compila QuickJS + el puente JNI para Linux,
# compila las clases Java comunes de la app y las de prueba, juega con un bot y deja capturas en ./capturas.
# Uso: ./probar.sh [lado en px] [ids separados por comas para probar otros juegos de herramientas/src]
# Necesita gcc, un JDK (17 o más) y python3 con Pillow y la fuente Noto Color Emoji (para los emojis de las capturas).
set -e
cd "$(dirname "$0")"
P=$(pwd)
SRC=../app/src/main
OUT=build
mkdir -p $OUT/classes capturas
JAVA_HOME=${JAVA_HOME:-$(dirname "$(dirname "$(readlink -f "$(which javac)")")")}
if [ ! -f $OUT/libarcadejs.so ] || [ $SRC/cpp/arcade_jni.c -nt $OUT/libarcadejs.so ]; then
  echo "Compilando libarcadejs.so…"
  gcc -O2 -shared -fPIC -std=gnu11 -D_GNU_SOURCE -funsigned-char -w \
    -I"$JAVA_HOME/include" -I"$JAVA_HOME/include/linux" -I$SRC/cpp/quickjs \
    $SRC/cpp/arcade_jni.c $SRC/cpp/quickjs/quickjs.c $SRC/cpp/quickjs/libregexp.c $SRC/cpp/quickjs/libunicode.c $SRC/cpp/quickjs/dtoa.c \
    -lm -o $OUT/libarcadejs.so
fi
J=$SRC/java/com/juegosboom/arcadewatch
javac -encoding UTF-8 -d $OUT/classes $J/JsEngine.java $J/Ops.java $J/Painter.java $J/CssColor.java $J/FontSpec.java AwtPainter.java Prueba.java
java -Dstdout.encoding=UTF-8 -Djava.awt.headless=true -Djava.library.path=$OUT -cp $OUT/classes com.juegosboom.arcadewatch.Prueba .. capturas ${1:-454} $2
