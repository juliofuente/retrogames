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
    ('brain', 'Emoji Brain Academy', '🧠', 'educativos/brain-academy/index.html', ['es', 'en', 'fr'],
     '69 minijuegos de mates, lectura y lógica para 3 a 12 años, con perfiles y niveles que suben poco a poco.',
     '69 maths, reading and logic mini-games for ages 3 to 12, with profiles and gradually rising levels.'),
    ('abn', 'Emoji Brain Academy · ABN', '🧮', 'educativos/brain-academy/indexinnovabn.html', ['es', 'en', 'fr'],
     'Solo los juegos de mates manipulativas y método ABN: doble recta, saltos en la recta, detracción, haces y palillos, problemas, regletas, base 10…',
     'Only the hands-on maths and ABN-method games: double number line, number-line jumps, take-away, bundles and sticks, word problems, rods, base 10…'),
    ('aventura', 'Aventura de Palabras', '🎮', 'educativos/aventura-palabras/juego_vocabulario_infinito.html', ['es'],
     'Vocabulario en español para 7 a 14 años: más de 800 palabras con definición, ejemplo y situaciones.',
     'Spanish vocabulary for ages 7 to 14: 800+ words with definition, example and situations.'),
    ('fabrica', 'Fábrica de Frases', '🏭', 'educativos/fabrica-frases/index.html', ['es'],
     'Monta frases en inglés pieza a pieza: presente, negativas, preguntas, pasado, futuro y más.',
     'Build English sentences piece by piece: present, negatives, questions, past, future and more.'),
]
# Juegos sueltos (los de Brain Academy se añaden solos). ages = (mín, máx).
EXTRA = [
    dict(id='aventura-de-palabras', app='aventura', subject='lengua', emoji='📚', ages=(7, 14), langs=['es'],
         url='educativos/aventura-palabras/juego_vocabulario_infinito.html',
         title=('Aventura de Palabras', 'Word Adventure'),
         desc=('Lee la definición y el ejemplo y elige en qué situación se usa la palabra. Más de 800 palabras por edades (7 a 14 años).',
               'Read the definition and example and pick the situation where the word fits. 800+ Spanish words by age (7 to 14).')),
    dict(id='palabras-por-repeticion', app='aventura', subject='lengua', emoji='🎓', ages=(7, 14), langs=['es'],
         url='educativos/aventura-palabras/juego_aprendizaje_repeticion.html',
         title=('Palabras por repetición', 'Words by Repetition'),
         desc=('Aprende vocabulario repasando: las palabras que fallas vuelven hasta que las dominas, con progreso por niveles.',
               'Learn vocabulary by reviewing: the words you miss come back until you master them, with progress by level.')),
    dict(id='fabrica-de-frases', app='fabrica', subject='ingles', emoji='🏭', ages=(7, 12), langs=['es'],
         url='educativos/fabrica-frases/index.html',
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



def build():
    d = json.load(open(os.path.join(ROOT, 'educativos', 'brain-academy', 'data', 'games.json'), encoding='utf-8'))
    games, seen = [], set()
    for g in d['games']:
        slug = slugify(g['name']['es'])
        lo, hi = min(BRAIN_AGES[a][0] for a in g['ages']), max(BRAIN_AGES[a][1] for a in g['ages'])
        mid = 6 if 6 in g['ages'] else g['ages'][0]
        games.append(dict(id=slug, app='brain', src=g['id'], subject=BRAIN_SUBJECT[g['cat']], emoji=g['emoji'], ages=[lo, hi],
                          brainAges=g['ages'], langs=g.get('langs') or ['es', 'en', 'fr'],
                          url='educativos/brain-academy/index.html?juego=%s&edad=%d' % (g['id'], mid),
                          title={'es': g['name']['es'], 'en': g['name']['en']}, desc={'es': g['desc']['es'], 'en': g['desc']['en']},
                          abn=bool(g.get('innovabn'))))
    for e in EXTRA:
        games.append(dict(id=e['id'], app=e['app'], subject=e['subject'], emoji=e['emoji'], ages=list(e['ages']), langs=e['langs'], url=e['url'],
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
