# Genera ../educativos/juegos.js: el catálogo de juegos educativos (window.EDU).
# Lo usan educativos/index.html, la portada (index.html) y mkdb.py (base de datos de la web PHP).
# Uso: python3 mkedu.py
#
# Los juegos educativos son apps hechas aparte (no usan pwa/common.js): cada una vive en su carpeta
# dentro de educativos/ y aquí solo se describen.
#   · Emoji Brain Academy: se leen sus minijuegos de educativos/brain-academy/data/games.json
#     y se enlazan uno a uno con index.html?juego=<id>&edad=<3|6|9>.
#   · El resto: añade una entrada a EXTRA (y copia su carpeta en educativos/).
import json, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
OUT = os.path.join(ROOT, 'educativos', 'juegos.js')

SUBJECTS = [  # id, slug es, slug en, nombre es, nombre en, emoji, color, descripción es, descripción en
    ('mates', 'mates', 'maths', 'Mates', 'Maths', '🔢', '#ff9f43',
     'Juegos de matemáticas para niños: contar, sumar, restar, multiplicar y dividir (también con el método ABN), relojes, dinero, recta numérica, geometría y cálculo mental.',
     'Maths games for kids: counting, adding, subtracting, multiplying and dividing (also with the ABN method), clocks, money, the number line, geometry and mental maths.'),
    ('lengua', 'lengua', 'language', 'Lengua', 'Language', '📖', '#3cc36e',
     'Juegos de lectura y vocabulario: sílabas, comprensión lectora, frases con huecos y palabras nuevas según la edad.',
     'Reading and vocabulary games: syllables, reading comprehension, gap-fill sentences and new words for every age.'),
    ('logica', 'logica', 'logic', 'Lógica', 'Logic', '🧩', '#9b5cff',
     'Juegos de razonamiento: series, reglas secretas, balanzas, pistas de detective, simetrías y programar caminos de robots.',
     'Reasoning games: sequences, secret rules, balances, detective clues, symmetry and programming robot paths.'),
    ('ingles', 'ingles', 'english', 'Inglés', 'English', '🇬🇧', '#4dabf7',
     'Juegos para aprender inglés desde el español: montar frases, tiempos verbales y preguntas.',
     'Games to learn English for Spanish speakers: building sentences, verb tenses and questions.'),
]
BANDS = [  # id, slug es, slug en, nombre es, nombre en, edad mín, edad máx, emoji
    ('3-6', '3-a-6-anos', '3-to-6-years', 'De 3 a 6 años', '3 to 6 years', 3, 6, '🐣'),
    ('7-12', '7-a-12-anos', '7-to-12-years', 'De 7 a 12 años', '7 to 12 years', 7, 12, '🚀'),
    ('13-16', '13-a-16-anos', '13-to-16-years', 'De 13 a 16 años', '13 to 16 years', 13, 16, '🧠'),
]
APPS = [  # id, nombre, emoji, url (desde la raíz), idiomas, descripción es, descripción en
    ('brain', 'Emoji Brain Academy', '🧠', 'educativos/brain-academy/', ['es', 'en', 'fr'],
     '69 minijuegos de mates, lectura y lógica para 3 a 12 años, con perfiles y niveles que suben poco a poco.',
     '69 maths, reading and logic mini-games for ages 3 to 12, with profiles and gradually rising levels.'),
    ('abn', 'Emoji Brain Academy · ABN', '🧮', 'educativos/brain-academy/indexinnovabn', ['es', 'en', 'fr'],
     'Solo los juegos de mates manipulativas y método ABN: doble recta, saltos en la recta, detracción, haces y palillos, problemas, regletas, base 10…',
     'Only the hands-on maths and ABN-method games: double number line, number-line jumps, take-away, bundles and sticks, word problems, rods, base 10…'),
    ('aventura', 'Aventura de Palabras', '🎮', 'educativos/aventura-palabras/juego_vocabulario_infinito', ['es'],
     'Vocabulario en español para 7 a 14 años: más de 800 palabras con definición, ejemplo y situaciones.',
     'Spanish vocabulary for ages 7 to 14: 800+ words with definition, example and situations.'),
    ('problemas', 'Problemas de mates', '📝', 'educativos/problemas-primaria/', ['es'],
     'Problemas de matemáticas de 1.º a 6.º de Primaria con datos, operaciones y resultado: 30 fichas por curso.',
     'Maths word problems for Spanish primary years 1 to 6 with data, operations and result: 30 worksheets per year.'),
    ('fabrica', 'Fábrica de Frases', '🏭', 'educativos/fabrica-frases/', ['es'],
     'Monta frases en inglés pieza a pieza: presente, negativas, preguntas, pasado, futuro y más.',
     'Build English sentences piece by piece: present, negatives, questions, past, future and more.'),
    ('arcade', 'Arcade Perdido', '🕹️', 'pwa/', ['es', 'en'],
     'Juegos arcade de números de Arcade Perdido y Arcade Pro que también sirven para practicar mates.',
     'Number arcade games from Arcade Perdido and Arcade Pro that are also good maths practice.'),
]
# Juegos arcade (pwa/) que también salen en los educativos: ref = id del juego en pwa/games.js.
# No son copias: el enlace lleva al juego de siempre.
ARCADE_EDU = [  # ref, asignatura, edades, título es/en, descripción es/en
    ('sumas', 'mates', (6, 12), ('Sumas', 'Sums'),
     ('Cálculo mental contrarreloj: elige el resultado correcto de cada suma antes de que se acabe el tiempo.', 'Mental maths against the clock: pick the right answer to each sum before time runs out.')),
    ('sumacamino', 'mates', (7, 14), ('Sumacamino', 'Sum Path'),
     ('Dibuja caminos por números vecinos que sumen exactamente el objetivo: sumas de varias cifras sin parar.', 'Draw paths through neighbouring numbers that add up exactly to the target: non-stop multi-number sums.')),
    ('treses', 'mates', (7, 16), ('Treses', 'Threes'),
     ('Desliza las cartas: 1 + 2 hacen 3 y las iguales se suman (3, 6, 12, 24…). Practica sumas y dobles.', 'Slide the cards: 1 + 2 make 3 and equal cards add up (3, 6, 12, 24…). Practise sums and doubles.')),
    ('cambio', 'mates', (6, 12), ('Cambio', 'Change'),
     ('Cinco monedas de 1 hacen 5, dos de 5 hacen 10…: cambia monedas y aprende cómo se combinan los valores del dinero.', 'Five 1 coins make 5, two 5s make 10…: change coins and learn how money values combine.')),
    ('cientos', 'mates', (7, 12), ('Cientos', 'Hundreds'),
     ('Haz crecer los círculos hasta que sus números sumen 100, sin que se toquen: calcula cuánto falta para llegar.', 'Grow the circles until their numbers add up to 100 without touching: work out how much is left.')),
    ('dados', 'mates', (6, 10), ('Dados', 'Dice'),
     ('Haz rodar los dados y junta tantos como indica su número (tres 3, cuatro 4…): contar y agrupar.', 'Roll the dice and group as many as their number says (three 3s, four 4s…): counting and grouping.')),
    ('expande', 'mates', (7, 14), ('Expande', 'Expand'),
     ('Cada número se estira tantas casillas como indica: cuenta casillas y planea para llegar a la meta.', 'Each number stretches as many squares as it shows: count squares and plan your way to the goal.')),
    ('fusionabolas', 'mates', (7, 14), ('Fusiona bolas', 'Fuse Balls'),
     ('Bolas numeradas que se fusionan al tocarse iguales: 2 + 2 = 4, 4 + 4 = 8… dobles y potencias de 2.', 'Numbered balls that merge when equal ones touch: 2 + 2 = 4, 4 + 4 = 8… doubles and powers of 2.')),
    ('hanoi', 'logica', (7, 16), ('Torres de Hanói', 'Tower of Hanoi'),
     ('El rompecabezas de los discos: planifica los movimientos para llevar la torre sin poner un disco grande sobre uno pequeño.', 'The disc puzzle: plan your moves to carry the tower without putting a big disc on a smaller one.')),
    ('clavijas', 'logica', (8, 16), ('Clavijas', 'Peg Solitaire'),
     ('El solitario de clavijas: piensa varios saltos por delante para dejar una sola en el tablero.', 'Peg solitaire: think several jumps ahead to leave just one on the board.')),
    ('apagon', 'logica', (7, 16), ('Apagón', 'Lights Out'),
     ('Cada interruptor cambia su luz y las vecinas: descubre el orden para apagarlas todas.', 'Each switch flips its light and its neighbours: find the order that switches them all off.')),
    ('casallena', 'logica', (6, 14), ('Casa llena', 'Full House'),
     ('La bola rueda hasta chocar: planifica el recorrido para pintar todas las casillas.', 'The ball rolls until it bumps: plan the route to paint every square.')),
    ('jarras', 'mates', (8, 16), ('Jarras', 'Jugs'),
     ('Mide litros exactos con jarras sin marcas: sumas, restas y razonamiento con capacidades.', 'Measure exact litres with unmarked jugs: adding, subtracting and reasoning with capacities.')),
    ('ranas', 'logica', (6, 14), ('Ranas', 'Frogs'),
     ('Ranas y tortugas se cambian de lado sin retroceder: un clásico de planificación paso a paso.', 'Frogs and turtles swap sides without going back: a classic step-by-step planning puzzle.')),
    ('nim', 'mates', (8, 16), ('Nim', 'Nim'),
     ('Filas de cerillas: descubre la estrategia ganadora pensando en parejas y en números pares e impares.', 'Rows of matches: discover the winning strategy by thinking in pairs and odd and even numbers.')),
    ('liebre', 'logica', (6, 14), ('Liebre y perros', 'Hare and Hounds'),
     ('Tres perros acorralan a una liebre: anticipa sus salidas y avanza sin dejar huecos.', 'Three hounds corner a hare: predict its escapes and advance without leaving gaps.')),
    ('tres', 'logica', (6, 14), ('Molino de tres', 'Three Men\'s Morris'),
     ('El tres en raya que se mueve: anticipa las jugadas de la máquina para hacer línea.', 'Noughts and crosses that moves: think ahead of the machine to make a line.')),
]
EXTRA_ARCADE = [dict(id=r, ref=r, app='arcade', subject=sj, emoji=None, ages=a, langs=['es', 'en'], url='pwa/' + r, title=t, desc=d) for r, sj, a, t, d in ARCADE_EDU]
# Juegos sueltos (los de Brain Academy se añaden solos). ages = (mín, máx).
EXTRA = [
    dict(id='aventura-de-palabras', app='aventura', subject='lengua', emoji='📚', ages=(7, 14), langs=['es'],
         url='educativos/aventura-palabras/juego_vocabulario_infinito',
         title=('Aventura de Palabras', 'Word Adventure'),
         desc=('Lee la definición y el ejemplo y elige en qué situación se usa la palabra. Más de 800 palabras por edades (7 a 14 años).',
               'Read the definition and example and pick the situation where the word fits. 800+ Spanish words by age (7 to 14).')),
    dict(id='palabras-por-repeticion', app='aventura', subject='lengua', emoji='🎓', ages=(7, 14), langs=['es'],
         url='educativos/aventura-palabras/juego_aprendizaje_repeticion',
         title=('Palabras por repetición', 'Words by Repetition'),
         desc=('Aprende vocabulario repasando: las palabras que fallas vuelven hasta que las dominas, con progreso por niveles.',
               'Learn vocabulary by reviewing: the words you miss come back until you master them, with progress by level.')),
    dict(id='problemas-primaria', app='problemas', subject='mates', emoji='📝', ages=(6, 12), langs=['es'],
         url='educativos/problemas-primaria/',
         title=('Problemas de mates (1.º a 6.º de Primaria)', 'Maths Word Problems (Years 1–6)'),
         desc=('Problemas de matemáticas por cursos, de 1.º a 6.º de Primaria: lee, saca los datos, haz las operaciones y escribe el resultado. Con pistas y solución.',
               'Maths word problems by school year, from 1st to 6th of Spanish Primary: read, find the data, do the operations and write the result. With hints and solutions.')),
    dict(id='fabrica-de-frases', app='fabrica', subject='ingles', emoji='🏭', ages=(7, 12), langs=['es'],
         url='educativos/fabrica-frases/',
         title=('Fábrica de Frases', 'Sentence Factory'),
         desc=('Monta frases en inglés pieza a pieza: sujeto, verbo y complemento, negativas, preguntas, pasado, futuro y presente continuo.',
               'Build English sentences piece by piece: subject, verb and object, negatives, questions, past, future and present continuous.')),
]
BRAIN_SUBJECT = {'math': 'mates', 'reading': 'lengua', 'logic': 'logica'}
BRAIN_AGES = {3: (3, 5), 6: (6, 8), 9: (9, 12)}


def slugify(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def bands_of(lo, hi):
    return [b[0] for b in BANDS if lo <= b[6] and hi >= b[5]]



def arcade_emojis():
    t = open(os.path.join(ROOT, 'pwa', 'games.js'), encoding='utf-8').read()
    return dict(re.findall(r"id: '([a-z0-9]+)',\s*title: '[^']*',\s*emoji: '([^']+)'", t)) | {m[0]: m[1] for m in re.findall(r'"id": "([a-z0-9]+)", "title": "[^"]*", "emoji": "([^"]+)"', t)}


def build():
    d = json.load(open(os.path.join(ROOT, 'educativos', 'brain-academy', 'data', 'games.json'), encoding='utf-8'))
    games, seen = [], set()
    for g in d['games']:
        slug = slugify(g['name']['es'])
        lo, hi = min(BRAIN_AGES[a][0] for a in g['ages']), max(BRAIN_AGES[a][1] for a in g['ages'])
        mid = 6 if 6 in g['ages'] else g['ages'][0]
        games.append(dict(id=slug, app='brain', src=g['id'], subject=BRAIN_SUBJECT[g['cat']], emoji=g['emoji'], ages=[lo, hi],
                          brainAges=g['ages'], langs=g.get('langs') or ['es', 'en', 'fr'],
                          url='educativos/brain-academy/?juego=%s&edad=%d' % (g['id'], mid),
                          title={'es': g['name']['es'], 'en': g['name']['en']}, desc={'es': g['desc']['es'], 'en': g['desc']['en']},
                          abn=bool(g.get('innovabn'))))
    for e in EXTRA:
        games.append(dict(id=e['id'], app=e['app'], subject=e['subject'], emoji=e['emoji'], ages=list(e['ages']), langs=e['langs'], url=e['url'],
                          title={'es': e['title'][0], 'en': e['title'][1]}, desc={'es': e['desc'][0], 'en': e['desc'][1]}))
    emo = arcade_emojis()
    for e in EXTRA_ARCADE:
        games.append(dict(id=e['id'], ref=e['ref'], app='arcade', subject=e['subject'], emoji=emo[e['ref']], ages=list(e['ages']), langs=e['langs'], url=e['url'],
                          title={'es': e['title'][0], 'en': e['title'][1]}, desc={'es': e['desc'][0], 'en': e['desc'][1]}))
    for g in games:
        assert g['id'] not in seen, 'id repetido ' + g['id']
        seen.add(g['id'])
        if 'brainAges' in g:  # Brain Academy (grupos 3–5, 6–8, 9–12): 3–5 → «3 a 6», 9–12 → «7 a 12»; 6–8 solo cuenta si va sin los otros
            a = g['brainAges']
            g['bands'] = (['3-6'] if 3 in a else []) + (['7-12'] if 9 in a else []) or ['3-6', '7-12']
        else:
            g['bands'] = bands_of(*g['ages'])
    return games


def main():
    games = build()
    data = {
        'subjects': [dict(id=s[0], slug={'es': s[1], 'en': s[2]}, name={'es': s[3], 'en': s[4]}, emoji=s[5], color=s[6]) for s in SUBJECTS],
        'bands': [dict(id=b[0], name={'es': b[3], 'en': b[4]}, min=b[5], max=b[6], emoji=b[7]) for b in BANDS],
        'apps': [dict(id=a[0], name=a[1], emoji=a[2], url=a[3], langs=a[4], desc={'es': a[5], 'en': a[6]}) for a in APPS],
        'games': games,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Generado por herramientas/mkedu.py · no editar a mano\nwindow.EDU = ')
        f.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
    print('educativos/juegos.js:', len(games), 'juegos educativos')


if __name__ == '__main__':
    main()
