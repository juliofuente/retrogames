# Genera ../data/arcade.sqlite con todos los juegos, colecciones y categorías.
# Uso: python3 mkdb.py   (necesita Node.js: lee la definición real de cada juego con extract.js)
# Al añadir un juego nuevo: créalo como siempre (src → mk.py → mkgames.py) y añade su id a CAT abajo.
# Los juegos educativos salen de mkedu.py (asignatura, edades y URL); no tienen «cómo se juega».
import json, os, re, sqlite3, subprocess, sys, unicodedata, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mkedu

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
DB = os.path.join(ROOT, 'data', 'arcade.sqlite')

COLLECTIONS = [  # id, slug es, slug en, nombre es, nombre en, portada (desde la raíz), descripción es, descripción en, emoji
    ('main', 'arcade-perdido', 'lost-arcade', 'Arcade Perdido', 'Lost Arcade', 'pwa/',
     'Mecánicas de arcade de los 80 y 90 que fueron un éxito y nadie volvió a usar, rehechas para jugar con el dedo en el móvil o con el mando en la tele.',
     'Arcade mechanics from the 80s and 90s that were hits and nobody reused, remade to play with your finger on a phone or with the remote on a TV.', '🕹️'),
    ('pro', 'arcade-pro', 'arcade-pro', 'Arcade Pro', 'Arcade Pro', 'pwa/indexpro',
     'Los grandes éxitos de los juegos de móvil hechos con emojis, de 60 a 120 niveles con tres modos de dificultad y sin anuncios.',
     'The big mobile game hits made with emojis, 60 to 120 levels with three difficulty modes and no ads.', '✨'),
    ('edu', 'educativos', 'educational', 'Educativos', 'Educational', 'coleccion/educativos',
     'Juegos para aprender jugando, de 3 a 16 años: mates (también con método ABN), lengua y vocabulario, lógica e inglés. Organizados por asignatura y por edad.',
     'Games to learn through play, ages 3 to 16: maths (including the ABN method), language and vocabulary, logic and English. Organised by subject and age.', '🎓'),
]

CATEGORIES = [
    # id, slug es, slug en, nombre es, nombre en, emoji, género schema.org, descripción es, descripción en
    ('puzles', 'puzles', 'puzzles', 'Puzles', 'Puzzles', '🧩', 'Puzzle',
     'Juegos de lógica para pensar con calma: empujar cajas, encontrar caminos, ordenar piezas y resolver tableros que siempre tienen solución.',
     'Logic games to think them through: push boxes, find paths, arrange pieces and solve boards that always have a solution.'),
    ('combinar', 'combinar-y-encajar', 'match-and-merge', 'Combinar y encajar', 'Match and merge', '💎', 'Puzzle',
     'Juegos de juntar iguales, fusionar y encajar piezas que caen: tres en línea, 2048, bloques, burbujas y cadenas de colores.',
     'Games about matching, merging and fitting falling pieces: match-three, 2048, blocks, bubbles and colour chains.'),
    ('accion', 'arcade-y-accion', 'arcade-action', 'Arcade y acción', 'Arcade and action', '👾', 'Arcade',
     'Acción de recreativa pura: esquivar, disparar, atrapar y sobrevivir con reflejos rápidos.',
     'Pure arcade action: dodge, shoot, catch and survive with quick reflexes.'),
    ('untoque', 'un-toque', 'one-tap', 'Un toque', 'One tap', '👆', 'Casual',
     'Juegos de un solo botón donde todo es el momento justo: tocar o mantener en el instante preciso.',
     'One-button games where everything is timing: tap or hold at exactly the right moment.'),
    ('plataformas', 'plataformas', 'platformers', 'Plataformas', 'Platformers', '🏃', 'Platform',
     'Correr, saltar, trepar y caer: plataformas clásicas y corredores infinitos.',
     'Run, jump, climb and fall: classic platformers and endless runners.'),
    ('fisica', 'fisica', 'physics', 'Física', 'Physics', '🪀', 'Physics',
     'Torres que se tambalean, tirachinas, balanzas y bolas que ruedan: juegos con física real.',
     'Wobbly towers, slingshots, scales and rolling balls: games with real physics.'),
    ('estrategia', 'estrategia', 'strategy', 'Estrategia', 'Strategy', '🏰', 'Strategy',
     'Defensa de torres, conquistas y duelos por turnos: piensa antes de actuar.',
     'Tower defence, conquest and turn-based duels: think before you act.'),
    ('tablero', 'tablero-cartas-y-palabras', 'board-cards-and-words', 'Tablero, cartas y palabras', 'Board, cards and words', '🃏', 'Board game',
     'Clásicos de mesa contra la máquina: cartas, palabras, fichas y juegos de memoria.',
     'Table-top classics against the machine: cards, words, tiles and memory games.'),
    ('deportes', 'deportes-y-carreras', 'sports-and-racing', 'Deportes y carreras', 'Sports and racing', '🏁', 'Sports',
     'Billar, minigolf, tiro con arco, esquí y circuitos de carreras.',
     'Pool, mini golf, archery, skiing and racing circuits.'),
    ('educativos', 'educativos', 'educational', 'Educativos', 'Educational', '🎓', 'Educational',
     'Juegos educativos para niños de 3 a 16 años: mates, lengua, lógica e inglés, con la dificultad adaptada a cada edad.',
     'Educational games for kids aged 3 to 16: maths, language, logic and English, with difficulty adapted to each age.'),
]

CAT = {
    'puzles': 'nim jarras ranas apagon clavijas casallena hanoi empujon vias bumeran dados parejas domino hielo avalancha expande portales sumacamino losas relojes sumas destellos agua almacen buscaminas laberinto puzle inundacion cientos atasco emojidoku',
    'combinar': 'hextris lineas racimo cambio cuadra galletas centro sombreros burbujas cinta hexagonos lumina deslizaheroes mazmorra fusionabolas cadenaroja treses gemas bloques rosario sandia fusion grupos columnas puntos',
    'accion': 'serpiente luz pasarela lazo pivote tuberia balancin cubos camarero mariquita piramide pinguino excavador castillos hamburguesa fontanero cerditos justa ratonera desplazado campanas tunel monociclo esquiva astro dardos gloton globo pezgordo supervivientes cruce ladrillos rebotes',
    'untoque': 'honda gancho trepamuros planetita carretera torreta reaccion estallido punteria reflejos golpecolor encaje resorte escaleras montana helicoptero aleteo helice minero doscoches salto puente torre lenador saltacolor pinchos orbita candado',
    'plataformas': 'bote escalador trampolin agujeros carrera saltarin volteo',
    'fisica': 'elastico barra fantasma tambaleante balanza teeter tirachinas derribo gravedad alas',
    'estrategia': 'murallas centinela artilleria huerto torres celulas',
    'tablero': 'backgammon chinas halma abalone hex quarto tafl zorro liebre puentes damas molino ataxx arana torreslibres huecos reversi cuatro mancala solitario ishido palabra poker enraya memoria',
    'deportes': 'esqui circuito billar arquero minigolf',
}
CTRL = {  # control (como en games.js) → slug es, slug en, nombre en
    'Tocar': ('tocar', 'tap', 'Tap'), 'Arrastrar': ('arrastrar', 'drag', 'Drag'), 'Deslizar': ('deslizar', 'swipe', 'Swipe'),
    'Mantener': ('mantener', 'hold', 'Hold'), 'Dos dedos': ('dos-dedos', 'two-fingers', 'Two fingers'), 'Dos pulgares': ('dos-pulgares', 'two-thumbs', 'Two thumbs'),
}
ADDED = {'expande': '2.5.0', 'portales': '2.5.0', 'hexagonos': '2.5.0', 'lumina': '2.5.0', 'deslizaheroes': '2.5.0', 'sumacamino': '2.5.0',
         'mazmorra': '2.5.0', 'fusionabolas': '2.5.0', 'cadenaroja': '2.5.0', 'losas': '2.5.0',
         'honda': '2.16.0', 'gancho': '2.16.0', 'empujon': '2.16.0', 'racimo': '2.16.0', 'bote': '2.16.0', 'luz': '2.16.0', 'elastico': '2.16.0', 'pasarela': '2.16.0',
         'excavador': '2.17.0', **{k: '2.19.0' for k in 'reversi cuatro mancala solitario lineas apagon clavijas casallena hanoi serpiente'.split()}, **{k: '2.20.0' for k in 'damas molino arana torreslibres huecos jarras ranas ataxx hextris'.split()}, **{k: '2.21.0' for k in 'backgammon chinas halma abalone hex quarto tafl zorro liebre puentes nim'.split()}}


def slugify(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def based_on(origin):
    out = []
    for part in re.split(r'\s*/\s*|\s*·\s*', origin):
        part = part.strip()
        if not part:
            continue
        m = re.match(r'^(.*?)\s*\((.*)\)\s*$', part)
        name, who, year = part, None, None
        if m:
            name, inner = m.group(1).strip(), m.group(2)
            y = re.search(r'\b(19|20)\d\d\b', inner)
            year = int(y.group(0)) if y else None
            who = re.sub(r',?\s*\b(19|20)\d\d\b', '', inner).strip(' ,') or None
        out.append((name, who, year))
    return out


def main():
    games = json.loads(subprocess.check_output(['node', os.path.join(HERE, 'extract.js')]))
    version = re.search(r"ARCADE_VERSION = '([^']+)'", open(os.path.join(ROOT, 'pwa', 'games.js')).read()).group(1)
    cat_of = {}
    for c, ids in CAT.items():
        for i in ids.split():
            assert i not in cat_of, 'repetido ' + i
            cat_of[i] = c
    missing = [g['id'] for g in games if g['id'] not in cat_of]
    assert not missing, 'sin categoría: %s (añádelos a CAT en mkdb.py)' % missing

    os.makedirs(os.path.dirname(DB), exist_ok=True)
    if os.path.exists(DB):
        os.remove(DB)
    db = sqlite3.connect(DB)
    db.executescript('''
    PRAGMA journal_mode = DELETE;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE collections (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT, index_file TEXT, desc_es TEXT, desc_en TEXT, emoji TEXT, sort INTEGER);
    CREATE TABLE subjects (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT, emoji TEXT, color TEXT, desc_es TEXT, desc_en TEXT, sort INTEGER);
    CREATE TABLE age_groups (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT, age_min INTEGER, age_max INTEGER, emoji TEXT, sort INTEGER);
    CREATE TABLE categories (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT, emoji TEXT, genre TEXT, desc_es TEXT, desc_en TEXT, sort INTEGER);
    CREATE TABLE controls (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT);
    CREATE TABLE games (
      id TEXT PRIMARY KEY,               -- también es el slug en español y el nombre del archivo
      slug_en TEXT UNIQUE,
      collection_id TEXT REFERENCES collections(id),
      category_id TEXT REFERENCES categories(id),
      control_id TEXT REFERENCES controls(id),
      file TEXT, emoji TEXT, color TEXT, theme_color TEXT, bg1 TEXT, bg2 TEXT, font TEXT, deco TEXT,
      title_es TEXT, title_en TEXT, tag_es TEXT, tag_en TEXT, desc_es TEXT, desc_en TEXT,
      help_es TEXT, help_en TEXT,          -- cómo se juega (HTML sencillo: <b>)
      tvhelp_es TEXT, tvhelp_en TEXT,      -- controles con mando de TV
      tv TEXT,                             -- 'cruceta' | 'cursor' | NULL (no se puede jugar con mando)
      origin TEXT,                         -- juegos en los que se basa (texto tal cual)
      lives INTEGER, levels TEXT,          -- levels: número de niveles | 'endless' (partida por récord) | 'infinite' (educativos)
      cap INTEGER, physics INTEGER, added_version TEXT, sort INTEGER,
      -- solo juegos educativos (colección 'edu'):
      subject_id TEXT REFERENCES subjects(id),
      age_min INTEGER, age_max INTEGER,  -- edad recomendada
      langs TEXT,                        -- idiomas de la interfaz, separados por comas
      app TEXT,                          -- app a la que pertenece (Emoji Brain Academy, Fábrica de Frases…)
      url TEXT                           -- dónde se juega, relativo a la raíz (para los demás: pwa/{file})
    );
    CREATE TABLE game_age_groups (game_id TEXT REFERENCES games(id), age_group_id TEXT REFERENCES age_groups(id));
    CREATE TABLE based_on (game_id TEXT REFERENCES games(id), sort INTEGER, name TEXT, publisher TEXT, year INTEGER);
    CREATE INDEX games_cat ON games(category_id);
    CREATE INDEX games_col ON games(collection_id);
    CREATE INDEX games_ctrl ON games(control_id);
    CREATE INDEX based_game ON based_on(game_id);
    CREATE INDEX games_subj ON games(subject_id);
    CREATE INDEX gag_age ON game_age_groups(age_group_id);
    ''')
    edu = mkedu.build()
    db.executemany('INSERT INTO meta VALUES (?,?)', [('version', version), ('generated', datetime.datetime.now().strftime('%Y-%m-%d')), ('total', str(len(games) + len(edu)))])
    for i, c in enumerate(COLLECTIONS):
        db.execute('INSERT INTO collections VALUES (?,?,?,?,?,?,?,?,?,?)', c + (i,))
    for i, s in enumerate(mkedu.SUBJECTS):
        db.execute('INSERT INTO subjects VALUES (?,?,?,?,?,?,?,?,?,?)', s + (i,))
    for i, b in enumerate(mkedu.BANDS):
        db.execute('INSERT INTO age_groups VALUES (?,?,?,?,?,?,?,?,?)', b + (i,))
    for i, c in enumerate(CATEGORIES):
        db.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?,?,?)', c + (i,))
    for es, (se, sn, en) in CTRL.items():
        db.execute('INSERT INTO controls VALUES (?,?,?,?,?)', (se, se, sn, es, en))
    used_en = set()
    for g in games:
        se = slugify(g['en']['title']) or g['id']
        if se in used_en:
            se = se + '-' + g['id']
        used_en.add(se)
        cap = g.get('cap') or 20   # mismo cálculo que common.js: los niveles «infinitos» pasan a 60–120 según el tope de dificultad
        lv = 'endless' if g['levels'] is None else str(60 if cap <= 16 else 80 if cap <= 20 else 100 if cap <= 25 else 120) if g['levels'] == 0 else str(g['levels'])
        bg = g.get('bg') or [None, None]
        db.execute('INSERT INTO games VALUES (' + ','.join('?' * 37) + ')', (
            g['id'], se, g['collection'], cat_of[g['id']], CTRL[g['ctrl']][0], g['file'], g['emoji'], g['color'], g['theme'], bg[0], bg[1], g.get('font'),
            json.dumps(g.get('deco') or [], ensure_ascii=False),
            g['title'], g['en']['title'], g['tag'], g['en']['tag'], g['desc'], g['en']['desc'], g['help_es'], g['help_en'], g.get('tvhelp_es'), g.get('tvhelp_en'),
            g['tv'] or None, g['origin'], g['lives'], lv, g.get('cap'), int(g['phys']), ADDED.get(g['id']), g['order'],
            None, None, None, 'es,en', None, 'pwa/' + g['file']))
        for k, (n, w, y) in enumerate(based_on(g['origin'])):
            db.execute('INSERT INTO based_on VALUES (?,?,?,?,?)', (g['id'], k, n, w, y))
    subj = {s[0]: s for s in mkedu.SUBJECTS}
    apps = {a[0]: a[1] for a in mkedu.APPS}
    ids = set(cat_of)
    for k, g in enumerate(edu):
        gid = g['id'] if g['id'] not in ids else g['id'] + '-' + g['subject']   # p. ej. relojes (Arcade Pro) → relojes-mates
        ids.add(gid)
        se = mkedu.slugify(g['title']['en']) or gid
        if se in used_en:
            se = se + '-' + subj[g['subject']][2]   # clocks → clocks-maths
        used_en.add(se)
        col = subj[g['subject']][6]
        db.execute('INSERT INTO games VALUES (' + ','.join('?' * 37) + ')', (
            gid, se, 'edu', 'educativos', None, None, g['emoji'], col, col, col, '#101a2c', None, '[]',
            g['title']['es'], g['title']['en'], g['desc']['es'], g['desc']['en'], g['desc']['es'], g['desc']['en'], None, None, None, None,
            None, '', 0, 'infinite' if g['app'] == 'brain' else None, None, 0, '2.8.0', 10000 + k,
            g['subject'], g['ages'][0], g['ages'][1], ','.join(g['langs']), apps[g['app']], g['url']))
        for b in g['bands']:
            db.execute('INSERT INTO game_age_groups VALUES (?,?)', (gid, b))
    db.commit()
    db.execute('VACUUM')
    db.close()
    print('data/arcade.sqlite:', len(games), 'juegos +', len(edu), 'educativos · v' + version)


if __name__ == '__main__':
    main()
