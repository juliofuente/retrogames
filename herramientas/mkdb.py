# Genera ../data/arcade.sqlite con todos los juegos, colecciones y categorías.
# Uso: python3 mkdb.py   (necesita Node.js: lee la definición real de cada juego con extract.js)
# Al añadir un juego nuevo: créalo como siempre (src → mk.py → mkgames.py) y añade su id a CAT abajo.
import json, os, re, sqlite3, subprocess, unicodedata, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
DB = os.path.join(ROOT, 'data', 'arcade.sqlite')

COLLECTIONS = [
    ('main', 'arcade-perdido', 'lost-arcade', 'Arcade Perdido', 'Lost Arcade', 'index.html',
     'Mecánicas de arcade de los 80 y 90 que fueron un éxito y nadie volvió a usar, rehechas para jugar con el dedo en el móvil o con el mando en la tele.',
     'Arcade mechanics from the 80s and 90s that were hits and nobody reused, remade to play with your finger on a phone or with the remote on a TV.'),
    ('pro', 'arcade-pro', 'arcade-pro', 'Arcade Pro', 'Arcade Pro', 'indexpro.html',
     'Los grandes éxitos de los juegos de móvil (los que recrea Emanuele Feronato en su blog) hechos con emojis, niveles infinitos y sin anuncios.',
     'The big mobile game hits (the ones Emanuele Feronato recreates on his blog) made with emojis, endless levels and no ads.'),
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
]

CAT = {
    'puzles': 'vias bumeran dados parejas domino hielo avalancha expande portales sumacamino losas relojes sumas destellos agua almacen buscaminas laberinto puzle inundacion cientos atasco emojidoku',
    'combinar': 'cambio cuadra galletas centro sombreros burbujas cinta hexagonos lumina deslizaheroes mazmorra fusionabolas cadenaroja treses gemas bloques rosario sandia fusion grupos columnas puntos',
    'accion': 'lazo pivote tuberia balancin cubos camarero mariquita piramide pinguino castillos hamburguesa fontanero cerditos justa ratonera desplazado campanas tunel monociclo esquiva astro dardos gloton globo pezgordo supervivientes cruce ladrillos rebotes',
    'untoque': 'trepamuros planetita carretera torreta reaccion estallido punteria reflejos golpecolor encaje resorte escaleras montana helicoptero aleteo helice minero doscoches salto puente torre lenador saltacolor pinchos orbita candado',
    'plataformas': 'escalador trampolin agujeros carrera saltarin volteo',
    'fisica': 'barra fantasma tambaleante balanza teeter tirachinas derribo gravedad alas',
    'estrategia': 'murallas centinela artilleria huerto torres celulas',
    'tablero': 'ishido palabra poker enraya memoria',
    'deportes': 'esqui circuito billar arquero minigolf',
}
CTRL = {  # control (como en games.js) → slug es, slug en, nombre en
    'Tocar': ('tocar', 'tap', 'Tap'), 'Arrastrar': ('arrastrar', 'drag', 'Drag'), 'Deslizar': ('deslizar', 'swipe', 'Swipe'),
    'Mantener': ('mantener', 'hold', 'Hold'), 'Dos dedos': ('dos-dedos', 'two-fingers', 'Two fingers'), 'Dos pulgares': ('dos-pulgares', 'two-thumbs', 'Two thumbs'),
}
ADDED = {'expande': '2.5.0', 'portales': '2.5.0', 'hexagonos': '2.5.0', 'lumina': '2.5.0', 'deslizaheroes': '2.5.0', 'sumacamino': '2.5.0',
         'mazmorra': '2.5.0', 'fusionabolas': '2.5.0', 'cadenaroja': '2.5.0', 'losas': '2.5.0'}


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
    CREATE TABLE collections (id TEXT PRIMARY KEY, slug_es TEXT UNIQUE, slug_en TEXT UNIQUE, name_es TEXT, name_en TEXT, index_file TEXT, desc_es TEXT, desc_en TEXT, sort INTEGER);
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
      lives INTEGER, levels TEXT,          -- levels: 'infinite' | 'endless' | número
      cap INTEGER, physics INTEGER, added_version TEXT, sort INTEGER
    );
    CREATE TABLE based_on (game_id TEXT REFERENCES games(id), sort INTEGER, name TEXT, publisher TEXT, year INTEGER);
    CREATE INDEX games_cat ON games(category_id);
    CREATE INDEX games_col ON games(collection_id);
    CREATE INDEX games_ctrl ON games(control_id);
    CREATE INDEX based_game ON based_on(game_id);
    ''')
    db.executemany('INSERT INTO meta VALUES (?,?)', [('version', version), ('generated', datetime.datetime.now().strftime('%Y-%m-%d')), ('total', str(len(games)))])
    for i, c in enumerate(COLLECTIONS):
        db.execute('INSERT INTO collections VALUES (?,?,?,?,?,?,?,?,?)', (c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], i))
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
        lv = 'endless' if g['levels'] is None else 'infinite' if g['levels'] == 0 else str(g['levels'])
        bg = g.get('bg') or [None, None]
        db.execute('INSERT INTO games VALUES (' + ','.join('?' * 31) + ')', (
            g['id'], se, g['collection'], cat_of[g['id']], CTRL[g['ctrl']][0], g['file'], g['emoji'], g['color'], g['theme'], bg[0], bg[1], g.get('font'),
            json.dumps(g.get('deco') or [], ensure_ascii=False),
            g['title'], g['en']['title'], g['tag'], g['en']['tag'], g['desc'], g['en']['desc'], g['help_es'], g['help_en'], g.get('tvhelp_es'), g.get('tvhelp_en'),
            g['tv'] or None, g['origin'], g['lives'], lv, g.get('cap'), int(g['phys']), ADDED.get(g['id']), g['order']))
        for k, (n, w, y) in enumerate(based_on(g['origin'])):
            db.execute('INSERT INTO based_on VALUES (?,?,?,?,?)', (g['id'], k, n, w, y))
    db.commit()
    db.execute('VACUUM')
    db.close()
    print('data/arcade.sqlite:', len(games), 'juegos · v' + version)


if __name__ == '__main__':
    main()
