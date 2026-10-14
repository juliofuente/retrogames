# Arcade Perdido

Recopilatorio de juegos HTML5 para móvil (táctil, sin cruceta en pantalla) basados en mecánicas clásicas poco replicadas. Es una PWA instalable y funciona sin conexión.

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Portada con todos los juegos (se genera desde `games.js`) |
| `games.js` | Lista de juegos y número de versión |
| `common.js` | Motor común: canvas responsive, toques/gestos, HUD, menús, niveles, récords, sonidos, partículas, emojis |
| `common.css` | Estilos comunes (HUD, menús, portada) |
| `sw.js` | Service worker: cachea todo para jugar offline |
| `manifest.webmanifest`, `icons/` | Instalación como app |
| `*.html` | Un archivo por juego |

## Añadir un juego nuevo

1. Copia cualquier juego (por ejemplo `cubos.html`) como `nuevo.html`.
2. Cambia el bloque `Arcade.game({ ... })`:
   - `id`, `title`, `emoji`, `color`, `origin`, `help`
   - `levels: 0` niveles infinitos (con `cap`: nivel a partir del cual la dificultad deja de subir; usa `g.lv` en las fórmulas de dificultad), `levels: 10` para un número fijo, o `levels: null` para modo sin niveles
   - Identidad: `tag` (lema), `deco` (6 emojis del título), `font` (round, serif, mono, impact, comic, wide, fancy), `bg` ([color1, color2]), `music` ({ mode, bpm, wave, style: arcade|drive|march|waltz|chill, root }), `voice` ({ wave, mul, echo }), `ambient` ({ e: [emojis], n, vy, vx, sway, alpha, twinkle, spin })
   - `lives` (0 = sin vidas), `lifeIcon`, `levelLabel` opcionales
   - `setup(g)` crea el estado en `g.s`; `layout(g)` recalcula tamaños al girar la pantalla
   - `update(g, dt)` y `draw(g, ctx)`
   - Entrada: `down/move/up(g, p)`, `tap(g, p)`, `swipe(g, dir, p)`, `key(g, tecla, pulsada)`
   - Efectos: `g.ring(x, y, color, radio)`, `g.flash(color)`, `g.confetti()`, `g.scenery([emojis], n, opciones)` para decorar el fondo
   - Ayudas: `g.addScore(n, x, y)`, `g.die()`, `g.win()`, `g.over()`, `g.burst(x, y, opts)`, `g.message(texto)`, `Arcade.emoji(ctx, '🎈', x, y, tamaño)`, `Arcade.sfx.coin()`…
3. Añade una línea en `games.js`.
4. Sube `ARCADE_VERSION` en `games.js` para que los móviles descarguen la versión nueva.

## Colección Pro (indexpro.html)

`indexpro.html` lista `GAMES_PRO` (en `games.js`): 20 éxitos de móvil (los que Emanuele Feronato recrea en Phaser) hechos con el mismo motor JS y emojis, con niveles infinitos.
Cada juego Pro lleva `home: 'indexpro.html'` en su definición para que «Todos los juegos» vuelva a esa portada (en modo TV vuelve a `indextv.html?sec=pro`).
La portada de TV tiene dos secciones (🕹️ Arcade Perdido / ✨ Arcade Pro); los juegos con `tv: false` (Cientos, Puntos) no aparecen en ella.
Para añadir un juego Pro: crea su `.html` y añade una línea a `GAMES_PRO`.

## Modo TV (Fire TV, Android TV…)

`config.js` tiene la variable `modo`:

| Valor | Qué hace |
|---|---|
| `'modonormal'` | Siempre táctil |
| `'modotv'` | Siempre modo TV (mando: cruceta, OK, Atrás, Play/Pausa) |
| `'seleccionable'` | Botón 📺/📱 en las portadas y menús; se recuerda en el dispositivo |
| `'automatico'` | Detecta la tele por el navegador (por defecto) |

En `seleccionable` y `automatico` se puede forzar con `?tv=1` / `?tv=0`. `indextv.html` es la portada para tele (solo juegos jugables con mando) y en `automatico` `index.html` redirige a ella si detecta una tele.

En modo TV se puede jugar **por turnos (1–4 jugadores)**: en juegos con niveles cada turno es un nivel (`rondasMultijugador` rondas); en el resto, cada jugador juega una partida completa. Al final sale la clasificación.

Para adaptar un juego al mando: `tvHelp` (texto de controles) y `tv`:
- sin `tv` → las flechas y OK (como espacio) llegan a `key(g, tecla, pulsada)`;
- `tv: false` → no se puede jugar con mando;
- `tv: { targets(g) → [{x, y, w, h, instant?}], mode: 'tap' | 'swipe' | 'drag', canArm(g, t) }` → cursor de casillas: la cruceta mueve el cursor y OK simula un toque (`tap`), agarra y desliza con una flecha (`swipe`) o arrastra a otra casilla (`drag`);
- `tv.actions: [{ label, run(g) }]` → acciones extra en el menú de pausa.

## Idiomas (español / inglés)

`config.js` → `idioma`: `'auto'` (detecta el idioma del dispositivo: español para es/ca/gl/eu, inglés para el resto, con botón 🇪🇸/🇬🇧 que se recuerda), `'es'` o `'en'` (fijo, sin botón). También `?lang=es|en`.

Cada juego lleva sus textos en inglés en `en: { title, tag, help, tvHelp, dict }`. `dict` traduce los textos que se dibujan en la partida (por trozos: `'Quedan ': 'Left '`); el motor traduce automáticamente todo lo que pasa por `Arcade.txt`, `g.float` y `g.message`. Para los textos del motor se usa `Arcade.T('español', 'english')`. En `games.js` cada juego tiene `en: { title, desc, tag, ctrl }` para las portadas.

## Versión autónoma

`build.py` (en la carpeta de trabajo) genera en `arcade-perdido-html/` cada juego con el CSS y el JS comunes incrustados: un solo archivo por juego que se abre sin nada más.

## Probar en local

```
python3 -m http.server 8000
```
y abre `http://localhost:8000`. Para instalarla en el móvil hay que servirla por HTTPS.
