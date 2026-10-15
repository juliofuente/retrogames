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

## Protagonista, enemigos y orientación (v2.6)

- **Caras del protagonista**: dibuja al héroe con `g.face()` en vez de un emoji fijo. La cara cambia sola: al azar cada pocos segundos (`A.FACES.idle`), se ríe al sumar puntos (`addScore`), se asusta o llora al perder una vida (`die`), celebra al ganar (`win`) y se entristece al acabar (`over`). Para forzar un estado: `g.mood('scared' | 'hurt' | 'laugh' | 'happy' | 'money' | 'win' | 'sad' | 'angry' | 'sick' | 'hot' | 'cold' | 'surprise' | 'effort', segundos)`. Los estados con más prioridad (daño, victoria) no se pisan con otros menores.
- **Enemigos comunes**: `Arcade.FOES` (calaveras, escorpiones, fantasmas, tiburones, zombis, vampiros, alienígenas…), `Arcade.FOES_SMALL`, `Arcade.FOES_BIG`; `Arcade.foe(n)` devuelve el enésimo y `Arcade.foeSet(k, semilla)` k distintos. Así los mismos enemigos se repiten entre juegos.
- **Orientación**: `Arcade.FACING` dice hacia dónde mira cada emoji tal cual se dibuja (las caras miran abajo, los animales y vehículos de perfil a la izquierda, 🚀/✈️ arriba a la derecha…). `Arcade.emojiTo(ctx, e, x, y, tamaño, dx, dy, opciones)` lo dibuja girado hacia su movimiento: los de perfil se voltean al ir de lado y giran al subir o bajar; las caras giran hacia donde van. Con `{ mode: 'flip' }` solo se voltea (las caras se inclinan), útil en plataformas. Si añades un emoji nuevo que se mueva, añádelo a `FACING` en `common.js`.

## Demo automática (v2.7)

En el menú de cada juego hay un botón **👀 Ver demo**: juega una partida sola con un dedo virtual 👆 que se ve tocar, arrastrar, deslizar, mantener o pulsar la cruceta, con frases cortas que explican lo que hace. No guarda récords ni desbloquea niveles; termina al tocar la pantalla (o pulsar una tecla), al ganar o perder, o a los 45 s (`demoTime` para cambiarlo).

Cada juego puede definir `demo(g)`, que devuelve el siguiente paso (o una lista de pasos, o `null` para esperar):

| Paso | Qué hace |
|---|---|
| `{ tap: [x, y] }` | mueve el dedo y toca |
| `{ drag: [[x, y], …], dur }` | arrastra por esos puntos en `dur` segundos |
| `{ swipe: [x, y, 'left'\|'right'\|'up'\|'down'], len }` | deslizamiento rápido |
| `{ hold: [x, y], dur }` | mantiene pulsado |
| `{ key: 'ArrowLeft'\|' ', dur }` | pulsa la cruceta / OK del pad (se ilumina) |
| `{ wait: s }` | espera |

Todos aceptan `say: 'texto'` (frase que aparece abajo) y `after: s` (pausa después). Los toques simulados llegan a `down/move/up/tap/swipe` con `p.type === 'demo'`, igual que los de un dedo real. `g.demoOn` indica que la demo está activa (sirve, por ejemplo, para que Vías vaya más despacio). Si un juego no define `demo`, se usa una demo genérica: pulsa el pad si el juego usa la cruceta, o hace toques y gestos sobre sus casillas.

Tienen demo propia (juega bien y suele ganar el nivel) todos los puzles, los de combinar y encajar y los de tablero.

## Pad virtual (táctil)

En el HUD aparece el botón 🎮 en todos los juegos que se pueden jugar con mando (`tv` no es `false`). Muestra una cruceta y un botón OK abajo, sin quitar el control táctil normal. Sale activado por defecto; si el jugador lo oculta, se recuerda en el dispositivo. En juegos con `tv.targets` el pad mueve el cursor de casillas igual que el mando de la tele; en el resto envía flechas y espacio a `key()`. Para quitarlo de un juego: `pad: false`.

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

## PWA y juego suelto (v2.12)

Cada página puede definir, **antes** de cargar `config.js` y `common.js`:

```html
<script>
  window.withpwa = true;       // activa la PWA: registra sw.js (red primero) y deja el manifest
  window.isSingleGame = true;  // juego solo: sin portada, favoritos ni estadísticas (para una app Android)
</script>
```

- Sin `withpwa` (o `false`) no hay PWA: se dan de baja el service worker de esa carpeta y las cachés antiguas.
- Con `isSingleGame` el motor oculta «Todos los juegos», el botón de favoritos y no envía estadísticas; el botón
  Atrás del mando no sale del juego. En el código: `Arcade.single`.
- `python3 build.py --solo pivote,gemas` (o `--solo` sin lista para todos) genera `../autonomos/solo/<id>.html`:
  el juego en un solo archivo con `window.isSingleGame = true`, listo para un WebView.

## Modos de dificultad y niveles (v2.11)

- `g.lv` (dificultad interna 1…`cap`) se reparte por 60–120 niveles según el modo (`g.mode`: easy/normal/hard).
- `g.speed` escala el `dt` que recibe `update` (empieza más lento y cada nivel arranca a medio gas).

## Probar en local

```
python3 -m http.server 8000
```
y abre `http://localhost:8000`. Para instalarla en el móvil hay que servirla por HTTPS.
