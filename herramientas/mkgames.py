import os
import re, json
D = {
 'cinta': ('Fichas de colores bajan por una cinta. Atrápalas con la pala y suéltalas en el contenedor para hacer filas de tres.', 'Arrastrar', 'Colored tiles tumble down a conveyor. Catch them with the paddle and drop them in the bin to make rows of three.', 'Drag', 'cruceta'),
 'puente': ('Mantén para estirar un palo y que llegue justo al siguiente pilar. Ni corto ni largo.', 'Mantener', 'Hold to grow a stick that reaches exactly the next pillar. Not too short, not too long.', 'Hold', 'cruceta'),
 'torre': ('Los bloques van y vienen: suéltalos encima. Lo que sobresale se corta y la torre se estrecha.', 'Tocar', 'Blocks slide back and forth: drop them on top. Whatever overhangs is cut off and the tower gets narrower.', 'Tap', 'cruceta'),
 'fusion': ('Desliza el tablero: dos emojis iguales se fusionan en el siguiente. Del huevo a la corona.', 'Deslizar', 'Swipe the board: two equal emojis merge into the next one. From egg to crown.', 'Swipe', 'cruceta'),
 'lenador': ('Corta el tronco a izquierda o derecha sin que te caiga una rama encima. El tiempo corre.', 'Tocar', 'Chop the trunk left or right without a branch landing on your head. The clock is ticking.', 'Tap', 'cruceta'),
 'rebotes': ('Apunta y dispara una ráfaga de bolas que rebotan y rompen bloques numerados antes de que bajen.', 'Arrastrar', 'Aim and fire a volley of bouncing balls that break numbered blocks before they reach the bottom.', 'Drag', 'cruceta'),
 'candado': ('La aguja gira sin parar: toca justo cuando pase por el punto para abrir el candado.', 'Tocar', 'The needle spins nonstop: tap right when it crosses the dot to open the padlock.', 'Tap', 'cruceta'),
 'orbita': ('Dos bolas giran una alrededor de la otra. Toca para cambiar de eje y sigue el camino.', 'Tocar', 'Two balls orbit each other. Tap to switch pivot and follow the path.', 'Tap', 'cruceta'),
 'pinchos': ('Un pájaro rebota de pared a pared. Aletea para esquivar los pinchos que aparecen.', 'Tocar', 'A bird bounces from wall to wall. Flap to dodge the spikes that keep appearing.', 'Tap', 'cruceta'),
 'saltacolor': ('Sube saltando y atraviesa solo las partes de tu color de los anillos que giran.', 'Tocar', 'Jump upwards and pass only through the parts of spinning rings that match your colour.', 'Tap', 'cruceta'),
 'sandia': ('Suelta frutas en el bote: dos iguales se fusionan. ¡Llega hasta la sandía sin desbordar!', 'Arrastrar', 'Drop fruit into the jar: two equal ones merge. Reach the melon without overflowing!', 'Drag', 'cruceta'),
 'grupos': ('Toca grupos de frutas iguales para quitarlos. Cuanto más grandes, muchos más puntos.', 'Tocar', 'Tap groups of matching fruit to clear them. The bigger the group, the more points.', 'Tap', 'cursor'),
 'atasco': ('Desliza coches y camiones en el atasco hasta abrir paso al coche rojo.', 'Arrastrar', 'Slide cars and trucks in the jam until the red car can get out.', 'Drag', 'cursor'),
 'columnas': ('Caen columnas de tres joyas: rota el orden y junta tres iguales en cualquier dirección.', 'Arrastrar', 'Columns of three jewels fall: cycle their order and line up three in any direction.', 'Drag', 'cruceta'),
 'memoria': ('Da la vuelta a las cartas de dos en dos y encuentra todas las parejas.', 'Tocar', 'Turn the cards over two at a time and find every pair.', 'Tap', 'cursor'),
 'arquero': ('Tensa el arco, calcula la curva y el viento, y acierta en dianas cada vez más pequeñas.', 'Arrastrar', 'Draw the bow, judge the arc and the wind, and hit ever smaller targets.', 'Drag', 'cruceta'),
 'minigolf': ('Golpea la bola como un tirachinas entre paredes, arena, agua y molinos. Cada hoyo, un par.', 'Arrastrar', 'Hit the ball like a slingshot past walls, sand, water and windmills. Every hole has a par.', 'Drag', 'cruceta'),
 'cientos': ('Mantén pulsados los círculos para que crezcan hasta sumar 100… sin que se toquen.', 'Mantener', 'Hold the circles to grow them until they add up to 100… without touching.', 'Hold', False),
 'puntos': ('Une puntos del mismo color; cierra un cuadrado y desaparecen todos los de ese color.', 'Arrastrar', 'Join dots of the same colour; close a square and all dots of that colour vanish.', 'Drag', False),
 'emojidoku': ('Sudoku con emojis: 4×4, 6×6 y 9×9. Cada fila, columna y caja, sin repetir.', 'Tocar', 'Sudoku with emojis: 4×4, 6×6 and 9×9. Every row, column and box, no repeats.', 'Tap', 'cursor'),
 'esquiva': ('Mueve el punto para coger cuadrados mientras los enemigos rebotan por todas partes.', 'Arrastrar', 'Move the dot to grab squares while enemies bounce everywhere.', 'Drag', 'cruceta'),
 'astro': ('Dispara a los alienígenas saltarines: cada impacto los divide en dos.', 'Arrastrar', 'Shoot the bouncing aliens: every hit splits them in two.', 'Drag', 'cruceta'),
 'dardos': ('Lanza dardos que atraviesan globos: alinéalos para ahorrar tiros.', 'Tocar', 'Throw darts that pierce balloons: line them up to save throws.', 'Tap', 'cursor'),
 'gloton': ('Vuela comiendo sin parar para no quedarte sin energía.', 'Arrastrar', 'Fly and eat non-stop so you never run out of energy.', 'Drag', 'cruceta'),
 'trepamuros': ('Salta de pared a pared trepando y esquiva pinchos y pájaros.', 'Tocar', 'Jump wall to wall as you climb, dodging spikes and birds.', 'Tap', 'cruceta'),
 'carrera': ('Corredor infinito: salta lo bajo y agáchate de lo alto.', 'Deslizar', 'Endless runner: jump the low stuff and duck the high stuff.', 'Swipe', 'cruceta'),
 'planetita': ('Da vueltas a un planeta diminuto saltando sus obstáculos.', 'Tocar', 'Run round a tiny planet jumping over its obstacles.', 'Tap', 'cruceta'),
 'globo': ('Mueve el escudo para apartar todo lo que cae sobre tu globo.', 'Arrastrar', 'Move the shield to push away everything falling on your balloon.', 'Drag', 'cruceta'),
 'carretera': ('Avanza y frena en el momento justo para cruzar vías y carreteras.', 'Mantener', 'Drive and brake at just the right moment to cross railways and roads.', 'Hold', 'cruceta'),
 'torreta': ('El cañón gira solo: dispara justo cuando apunte a los monstruos.', 'Tocar', 'The cannon spins by itself: fire right when it points at the monsters.', 'Tap', 'cruceta'),
 'reaccion': ('Un solo toque: provoca una explosión en cadena que revienta las burbujas.', 'Tocar', 'Just one tap: set off a chain reaction that pops the bubbles.', 'Tap', 'cursor'),
 'estallido': ('Carga una explosión circular y suéltala cuando haya muchos bichos dentro.', 'Mantener', 'Charge a circular blast and release it when lots of bugs are inside.', 'Hold', 'cruceta'),
 'punteria': ('Dispara tu punto hacia arriba justo cuando pase el blanco.', 'Tocar', 'Fire your dot upwards right when the target passes.', 'Tap', 'cruceta'),
 'reflejos': ('Espera al rojo y toca lo más rápido que puedas. No te dejes engañar.', 'Tocar', 'Wait for red and tap as fast as you can. Do not get fooled.', 'Tap', 'cruceta'),
 'relojes': ('Dispara un reloj y encadena los demás con el ángulo de sus agujas.', 'Tocar', 'Set off a clock and chain the rest with the angle of their hands.', 'Tap', 'cursor'),
 'golpecolor': ('Dispara a la rueda que gira y acierta en la sección de tu mismo color.', 'Tocar', 'Shoot at the spinning wheel and hit the section of your colour.', 'Tap', 'cruceta'),
 'encaje': ('Haz crecer el cuadrado justo lo necesario para que encaje en el hueco.', 'Mantener', 'Grow the square just enough to fit in the gap.', 'Hold', 'cruceta'),
 'pezgordo': ('Come peces pequeños para crecer y huye de los que son más grandes que tú.', 'Arrastrar', 'Eat small fish to grow and flee from the ones bigger than you.', 'Drag', 'cruceta'),
 'sumas': ('Cálculo mental contrarreloj: elige el resultado correcto.', 'Tocar', 'Mental maths against the clock: pick the right result.', 'Tap', 'cursor'),
 'destellos': ('Memoriza las casillas que se iluminan y repítelas.', 'Tocar', 'Memorise the squares that light up and repeat them.', 'Tap', 'cursor'),
 'saltarin': ('Tu héroe corre solo: tú decides cuándo saltar para llegar a la puerta.', 'Tocar', 'Your hero runs on their own: you decide when to jump to reach the door.', 'Tap', 'cruceta'),
 'volteo': ('No puedes saltar: invierte la gravedad para esquivar pinchos y agujeros.', 'Tocar', 'You cannot jump: flip gravity to dodge spikes and holes.', 'Tap', 'cruceta'),
 'resorte': ('Carga el muelle y salta de pilar en pilar sin quedarte corto ni pasarte.', 'Mantener', 'Charge the spring and jump from pillar to pillar without falling short or overshooting.', 'Hold', 'cruceta'),
 'escaleras': ('Sube la escalera en zigzag: un botón para subir y otro para girar.', 'Tocar', 'Climb the zigzag staircase: one button to climb and one to turn.', 'Tap', 'cruceta'),
 'tambaleante': ('Suelta bloques desde la grúa y construye una torre que no se caiga.', 'Tocar', 'Drop blocks from the crane and build a tower that does not topple.', 'Tap', 'cruceta'),
 'balanza': ('Haz crecer pesos y déjalos caer manteniendo la balanza nivelada.', 'Mantener', 'Grow weights and drop them while keeping the scale level.', 'Hold', 'cruceta'),
 'montana': ('Baja la montaña casilla a casilla antes de que se derrumbe.', 'Tocar', 'Hop down the mountain tile by tile before it crumbles.', 'Tap', 'cruceta'),
 'esqui': ('Baja esquiando entre las banderas y esquiva árboles y rocas.', 'Arrastrar', 'Ski down between the flags and dodge trees and rocks.', 'Drag', 'cruceta'),
 'teeter': ('Sube cada extremo de la barra para guiar la bola hasta el agujero verde.', 'Mantener', 'Raise each end of the bar to guide the ball into the green hole.', 'Hold', 'cruceta'),
 'circuito': ('Da vueltas al circuito cambiando de carril para esquivar el tráfico.', 'Tocar', 'Lap the circuit switching lanes to dodge the traffic.', 'Tap', 'cruceta'),
 'tirachinas': ('Lanza pájaros con el tirachinas y derriba las torres de los cerditos.', 'Arrastrar', 'Fling birds with the slingshot and knock down the piggies\' towers.', 'Drag', 'cruceta'),
 'derribo': ('Quita los bloques de madera sin que el ídolo toque el suelo.', 'Tocar', 'Remove the wooden blocks without letting the idol touch the ground.', 'Tap', 'cursor'),
 'gravedad': ('Curva tus disparos alrededor de los planetas para alcanzar a los alienígenas.', 'Arrastrar', 'Bend your shots around planets to hit the aliens.', 'Drag', 'cruceta'),
 'artilleria': ('Duelo de tanques por turnos con viento, montañas y cráteres.', 'Arrastrar', 'Turn-based tank duel with wind, hills and craters.', 'Drag', 'cruceta'),
 'alas': ('Pégate a las bajadas y suelta en las subidas para volar más lejos.', 'Mantener', 'Hug the downhills and let go on the rises to fly further.', 'Hold', 'cruceta'),
 'agua': ('Cava túneles en la tierra para llevar el agua hasta la bañera.', 'Arrastrar', 'Dig tunnels through the dirt to bring the water to the bath.', 'Drag', 'cursor'),
 'huerto': ('Planta girasoles, cactus y cocos para frenar la invasión zombi.', 'Tocar', 'Plant sunflowers, cacti and coconuts to stop the zombie invasion.', 'Tap', 'cursor'),
 'torres': ('Construye y mejora torres junto al camino para defender el castillo.', 'Tocar', 'Build and upgrade towers along the path to defend the castle.', 'Tap', 'cursor'),
 'supervivientes': ('Muévete entre hordas de monstruos: tus armas atacan solas.', 'Arrastrar', 'Move through hordes of monsters: your weapons attack on their own.', 'Drag', 'cruceta'),
 'celulas': ('Envía unidades de tus células para conquistar las del rival.', 'Arrastrar', 'Send units from your cells to conquer the enemy ones.', 'Drag', 'cursor'),
 'helicoptero': ('Mantén para subir y suelta para bajar: atraviesa la cueva sin rozar nada.', 'Mantener', 'Hold to rise and release to fall: fly through the cave without touching anything.', 'Hold', 'cruceta'),
 'treses': ('Desliza las cartas: 1+2 hacen 3 y las iguales se doblan. Consigue la carta objetivo.', 'Deslizar', 'Slide the cards: 1+2 make 3 and equal cards double up. Make the target card.', 'Swipe', 'cruceta'),
 'palabra': ('Adivina la palabra de cinco letras en seis intentos con pistas de colores.', 'Tocar', 'Guess the five-letter word in six tries with coloured clues.', 'Tap', 'cursor'),
 'almacen': ('Empuja las cajas hasta las dianas sin dejarlas atascadas en una esquina.', 'Deslizar', 'Push the boxes onto the targets without getting them stuck in a corner.', 'Swipe', 'cruceta'),
 'buscaminas': ('Descubre las casillas sin pisar minas: los números te dicen cuántas hay alrededor.', 'Tocar', 'Uncover the squares without stepping on mines: the numbers tell you how many are around.', 'Tap', 'cursor'),
 'billar': ('Tira del taco y mete todas las bolas en las troneras con pocos tiros.', 'Arrastrar', 'Pull the cue and pot every ball in as few shots as possible.', 'Drag', 'cruceta'),
 'poker': ('Póker de máquina: guarda las cartas buenas, cambia el resto y suma fichas.', 'Tocar', 'Video poker: keep the good cards, swap the rest and pile up chips.', 'Tap', 'cursor'),
 'enraya': ('Tres en raya, cuatro en raya y gomoku contra la máquina.', 'Tocar', 'Noughts and crosses, four in a row and gomoku against the machine.', 'Tap', 'cursor'),
 'laberinto': ('Guía al ratón por el laberinto hasta el queso lo más rápido posible.', 'Arrastrar', 'Guide the mouse through the maze to the cheese as fast as you can.', 'Drag', 'cruceta'),
 'puzle': ('Arrastra las piezas a su sitio hasta completar el dibujo.', 'Arrastrar', 'Drag the pieces into place until the picture is complete.', 'Drag', 'cursor'),
 'aleteo': ('Toca para aletear y pasa entre los cactus sin tocarlos. Cada vez más estrechos.', 'Tocar', 'Tap to flap and fly between the cacti without touching them. They keep getting narrower.', 'Tap', 'cruceta'),
 'cruce': ('Cruza carreteras, ríos y vías saltando casilla a casilla sin que te pillen.', 'Deslizar', 'Cross roads, rivers and railways hopping square by square without getting hit.', 'Swipe', 'cruceta'),
 'ladrillos': ('La pala, la bola y un muro de ladrillos. Coge los poderes que caen.', 'Arrastrar', 'Paddle, ball and a wall of bricks. Catch the power-ups that fall.', 'Drag', 'cruceta'),
 'gemas': ('Intercambia gemas vecinas para hacer líneas de tres. Con 4 y 5, gemas especiales.', 'Deslizar', 'Swap neighbouring gems to make lines of three. Lines of 4 and 5 create special gems.', 'Swipe', 'cursor'),
 'bloques': ('Gira y encaja las piezas que caen para completar líneas.', 'Arrastrar', 'Rotate and fit the falling pieces to complete lines.', 'Drag', 'cruceta'),
 'rosario': ('Dispara bolas a la cadena que avanza en espiral: tres iguales explotan.', 'Tocar', 'Shoot balls into the chain spiralling inwards: three of a colour burst.', 'Tap', 'cruceta'),
 'helice': ('Gira la torre para que la bola caiga por los huecos sin tocar lo rojo.', 'Arrastrar', 'Spin the tower so the ball falls through the gaps without touching the red.', 'Drag', 'cruceta'),
 'inundacion': ('Cambia de color tu zona para tragarte el tablero en pocos movimientos.', 'Tocar', 'Change the colour of your area to swallow the board in few moves.', 'Tap', 'cursor'),
 'minero': ('Lanza la garra y saca oro y diamantes antes de que se acabe el tiempo.', 'Tocar', 'Throw the claw and haul up gold and diamonds before time runs out.', 'Tap', 'cruceta'),
 'doscoches': ('Dos coches a la vez: recoge lo redondo y esquiva lo cuadrado.', 'Tocar', 'Two cars at once: catch the round things and dodge the squares.', 'Tap', 'cruceta'),
 'salto': ('El cubo corre solo: salta al ritmo para esquivar pinchos y subir a los bloques.', 'Tocar', 'The cube runs on its own: jump to the beat to dodge spikes and hop onto blocks.', 'Tap', 'cruceta'),
}
def get(src, key):
    m = re.search(r"\b" + key + r": '((?:[^'\\]|\\.)*)'", src); return m.group(1).replace("\\'", "'") if m else None
def entry(n):
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'src',n+'.js')).read()
    en = src[src.index('en: {'):]
    d = D[n]
    o = dict(file=n+'.html', id=n, title=get(src,'title'), emoji=get(src,'emoji'), color=get(src,'color'), origin=get(src,'origin'), desc=d[0], ctrl=d[1], tv=d[4], tag=get(src,'tag'),
             en=dict(title=get(en,'title'), desc=d[2], tag=get(en,'tag'), ctrl=d[3]))
    # title/tag: the first 'title:' in src is the en one? ensure es title from id line
    m = re.search(r"id: '%s', title: '([^']*)', emoji: '([^']*)', color: '([^']*)', origin: (?:'((?:[^'\\]|\\.)*)'|\"([^\"]*)\")" % n, src)
    o['title'], o['emoji'], o['color'], o['origin'] = m.group(1), m.group(2), m.group(3), (m.group(4) or m.group(5)).replace("\\'", "'")
    o['tag'] = re.search(r"/\*THEME\*/[^\n]*?tag: '((?:[^'\\]|\\.)*)'", src).group(1).replace("\\'", "'")
    return '  ' + json.dumps(o, ensure_ascii=False) + ','
PRO = ['esquiva','astro','dardos','gloton','trepamuros','carrera','planetita','globo','carretera','torreta','reaccion','estallido','punteria','reflejos','relojes','golpecolor','encaje','pezgordo','sumas','destellos','saltarin','volteo','resorte','escaleras','tambaleante','balanza','montana','esqui','teeter','circuito','tirachinas','derribo','gravedad','artilleria','alas','agua','huerto','torres','supervivientes','celulas','helicoptero','treses','palabra','almacen','buscaminas','billar','poker','enraya','laberinto','puzle','aleteo','cruce','ladrillos','gemas','bloques','rosario','helice','inundacion','minero','doscoches','salto','sandia','fusion','puente','torre','lenador','saltacolor','pinchos','orbita','candado','rebotes','arquero','minigolf','grupos','columnas','puntos','cientos','atasco','memoria','emojidoku']
import sys
out = {'cinta': entry('cinta'), 'pro': '\n'.join(entry(n) for n in PRO)}
json.dump(out, open('gentries.json','w'), ensure_ascii=False)
import os; g=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','pwa','games.js'); t=open(g).read(); a=t.index('var GAMES_PRO = ['); t=t[:a]+'var GAMES_PRO = [\n'+out['pro']+'\n];\n'; open(g,'w').write(t)
print(len(PRO))
