<?php
/* Arcade Perdido · web SEO (PHP + SQLite, sin dependencias externas)
   ─────────────────────────────────────────────────────────────────────────────
   Rutas (español sin prefijo · inglés bajo /en/):
     /                         /en/                        portada
     /juegos                   /en/games                   todos los juegos (A–Z)
     /juego/{id}               /en/game/{slug}             ficha de un juego
     /{id}                                                 el juego en sí (pwa/{id}.html servido con <base>); idioma automático
     /{id}/es  /{id}/en                                    el juego con el idioma forzado
     /jugar/{id} /en/play/{slug} /pwa/{id}.html            URLs antiguas → 301 a /{id}
     /api/play  (POST)                                     guarda tiempo de juego en data/stats.sqlite (rankings)
     /api/fav   (POST)                                     marca/desmarca un favorito (cuenta personas por juego)
     /coleccion/{slug}         /en/collection/{slug}       colección (Arcade Perdido / Arcade Pro)
     /categoria/{slug}         /en/category/{slug}         categoría
     /control/{slug}           /en/control/{slug}          juegos por tipo de control
     /asignatura/{slug}        /en/subject/{slug}          juegos educativos por asignatura (mates, lengua…)
     /edad/{slug}              /en/age/{slug}              juegos educativos por edad (3-a-6-anos…)
     /tv                       /en/tv                      juegos para jugar con mando en la tele
     /buscar?q=                /en/search?q=               búsqueda (noindex)
     /icono/{id}.svg                                       icono del juego (emoji)
     /sitemap.xml  /robots.txt
   Datos: data/arcade.sqlite (se genera con herramientas/mkdb.py).                       */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');

/* ---------- base URL ---------- */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$BASE = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/');   // '' o '/subcarpeta'
$ORIGIN = ($https ? 'https' : 'http') . '://' . $host;
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rawurldecode($path);
if ($BASE !== '' && strpos($path, $BASE) === 0) $path = substr($path, strlen($BASE));
if ($path === '' || $path === false) $path = '/';

function starts(string $h, string $n): bool { return strncmp($h, $n, strlen($n)) === 0; }
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(string $p = '/'): string { global $BASE; return $BASE . $p; }
function abs_url(string $p = '/'): string { global $ORIGIN, $BASE; return $ORIGIN . $BASE . $p; }
function redirect(string $to, int $code = 301): void { header('Location: ' . $to, true, $code); exit; }

/* normalización de URLs */
if ($path === '/index.php' || $path === '/index.html') redirect(url('/'));
if ($path === '/en') redirect(url('/en/'));
if ($path !== '/' && $path !== '/en/' && substr($path, -1) === '/') redirect(url(rtrim($path, '/')) . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : ''));

/* ---------- datos ---------- */
$dbFile = __DIR__ . '/data/arcade.sqlite';
if (!is_file($dbFile) || !class_exists('PDO')) { http_response_code(503); header('Content-Type: text/plain; charset=utf-8'); echo "Falta data/arcade.sqlite o la extensión pdo_sqlite.\n"; exit; }
try {
  $db = new PDO('sqlite:' . $dbFile, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (Throwable $e) { http_response_code(503); echo 'DB error'; exit; }
$META = [];
foreach ($db->query('SELECT key, value FROM meta') as $r) $META[$r['key']] = $r['value'];
$COLS = []; foreach ($db->query('SELECT * FROM collections ORDER BY sort') as $r) $COLS[$r['id']] = $r;
$CATS = []; foreach ($db->query('SELECT * FROM categories ORDER BY sort') as $r) $CATS[$r['id']] = $r;
$CTRLS = []; foreach ($db->query('SELECT * FROM controls') as $r) $CTRLS[$r['id']] = $r;
$SUBJS = []; foreach ($db->query('SELECT * FROM subjects ORDER BY sort') as $r) $SUBJS[$r['id']] = $r;
$AGES = []; foreach ($db->query('SELECT * FROM age_groups ORDER BY sort') as $r) $AGES[$r['id']] = $r;
$GAMES = []; foreach ($db->query('SELECT * FROM games ORDER BY sort') as $r) { $r['based'] = []; $r['ages'] = []; $GAMES[$r['id']] = $r; }
foreach ($db->query('SELECT * FROM game_age_groups') as $r) if (isset($GAMES[$r['game_id']])) $GAMES[$r['game_id']]['ages'][] = $r['age_group_id'];
foreach ($db->query('SELECT * FROM based_on ORDER BY game_id, sort') as $r) if (isset($GAMES[$r['game_id']])) $GAMES[$r['game_id']]['based'][] = $r;
$VERSION = $META['version'] ?? '';
$LASTMOD = $META['generated'] ?? date('Y-m-d');
$SITE = 'Arcade Perdido';

/* ---------- idioma ---------- */
$L = 'es';
if ($path === '/en/' || starts($path, '/en/')) { $L = 'en'; }
function T(string $es, string $en): string { global $L; return $L === 'en' ? $en : $es; }
function f(array $row, string $field): string { global $L; return (string)($row[$field . '_' . $L] ?? $row[$field . '_es'] ?? ''); }
function home_url(?string $lang = null): string { global $L; return url(($lang ?? $L) === 'en' ? '/en/' : '/'); }
function game_path(array $g, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/game/' . $g['slug_en'] : '/juego/' . $g['id']; }
function play_path(array $g, ?string $lang = null): string { global $L; return '/' . $g['id'] . (($lang ?? $L) === 'en' ? '/en' : ''); }
function cat_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/category/' . $c['slug_en'] : '/categoria/' . $c['slug_es']; }
function col_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/collection/' . $c['slug_en'] : '/coleccion/' . $c['slug_es']; }
function ctrl_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/control/' . $c['slug_en'] : '/control/' . $c['slug_es']; }
function subj_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/subject/' . $c['slug_en'] : '/asignatura/' . $c['slug_es']; }
function age_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/age/' . $c['slug_en'] : '/edad/' . $c['slug_es']; }
function is_edu(array $g): bool { return $g['collection_id'] === 'edu'; }
function edu_games(): array { global $GAMES; return array_values(array_filter($GAMES, 'is_edu')); }
function arcade_count(): int { global $GAMES; return count($GAMES) - count(edu_games()); }
function ages_label(array $g): string { return $g['age_min'] . '–' . $g['age_max'] . ' ' . T('años', 'years'); }
function langs_label(array $g): string {
  $n = ['es' => T('Español', 'Spanish'), 'en' => T('inglés', 'English'), 'fr' => T('francés', 'French')];
  $o = array_map(function ($x) use ($n) { return $n[$x] ?? $x; }, explode(',', (string)$g['langs']));
  return ucfirst(implode(', ', $o));
}
function list_path(string $k, ?string $lang = null): string {
  global $L; $en = ($lang ?? $L) === 'en';
  $m = ['games' => ['/juegos', '/en/games'], 'tv' => ['/tv', '/en/tv'], 'search' => ['/buscar', '/en/search']];
  return $m[$k][$en ? 1 : 0];
}
function game_file_url(array $g, bool $tv = false): string { return url(play_path($g)) . ($tv ? '?tv=1' : ''); }
/* un educativo en /{id}: su HTML servido con <base href> a su carpeta (sin .html ni index.html en la URL) */
function serve_edu(array $g, ?string $force): void {
  global $SITE;
  $u = parse_url('/' . $g['url']);
  $path = ltrim((string)$u['path'], '/');
  if ($path === '' || substr($path, -1) === '/') $path .= 'index.html'; elseif (!preg_match('/\.html$/', $path)) $path .= '.html';
  $html = @file_get_contents(__DIR__ . '/' . $path);
  if ($html === false || strpos(realpath(__DIR__ . '/' . $path) ?: '', realpath(__DIR__ . '/educativos')) !== 0) { page_404(); return; }
  parse_str((string)($u['query'] ?? ''), $q);
  $lang = $force ?: guess_lang();
  if ($q) $q['lang'] = $lang;   // Brain Academy: minijuego, edad e idioma
  $p = '/' . $g['id'] . ($force ? '/' . $force : '');
  $title = ($lang === 'en' ? $g['title_en'] : $g['title_es']) . ' · ' . $SITE;
  $desc = cut($lang === 'en' ? $g['desc_en'] : $g['desc_es'], 160);
  $head = '<base href="' . h(url('/' . dirname($path) . '/')) . '">'
    . '<link rel="canonical" href="' . h(abs_url($p)) . '"><meta name="description" content="' . h($desc) . '">'
    . '<meta property="og:title" content="' . h($title) . '"><meta property="og:url" content="' . h(abs_url($p)) . '">'
    . '<script>window.ARCADE_EDU=' . json_encode(['id' => $g['id'], 'q' => http_build_query($q), 'home' => url('/')], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ';</script>';
  $html = preg_replace('/<head[^>]*>/i', '$0' . "\n" . $head, $html, 1);
  $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . h($title) . '</title>', $html, 1);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-cache');
  echo $html;
  exit;
}
function guess_lang(): string {
  $c = $_COOKIE['arc_lang'] ?? '';
  if ($c === 'es' || $c === 'en') return $c;
  return preg_match('/^\s*(es|ca|gl|eu)\b/i', (string)($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'es')) ? 'es' : 'en';
}
function icon_url(array $g): string { return url('/icono/' . $g['id'] . '.svg'); }
function safe_help(?string $html): string { return strip_tags((string)$html, '<b><strong><i><em><br>'); }
function plain(?string $html): string { return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string)$html), ENT_QUOTES, 'UTF-8'))); }
function cut(string $s, int $n): string { if (mb_strlen($s) <= $n) return $s; $s = mb_substr($s, 0, $n - 1); $p = mb_strrpos($s, ' '); return ($p > $n * 0.6 ? mb_substr($s, 0, $p) : $s) . '…'; }
function find_by(array $arr, string $field, string $val): ?array { foreach ($arr as $r) if ((string)$r[$field] === $val) return $r; return null; }
function tv_label(?string $tv): string { return $tv === 'cursor' ? T('Sí, con cursor (cruceta + OK)', 'Yes, with a cursor (D-pad + OK)') : ($tv === 'cruceta' ? T('Sí, con la cruceta', 'Yes, with the D-pad') : T('No (necesita pantalla táctil)', 'No (needs a touch screen)')); }
function levels_label(array $g): string {
  if ($g['levels'] === 'infinite') return T('Infinitos, con dificultad creciente', 'Endless, with rising difficulty');
  if ($g['levels'] === 'endless') return T('Partida sin fin (récord)', 'Endless run (high score)');
  return $g['levels'] . T(' niveles, con la dificultad repartida de menos a más · modos fácil, normal y difícil', ' levels, difficulty spread from easy to hard · easy, normal and hard modes');
}
function based_text(array $g): string {
  $o = [];
  foreach ($g['based'] as $b) $o[] = $b['name'] . ($b['publisher'] || $b['year'] ? ' (' . trim(($b['publisher'] ?? '') . ($b['publisher'] && $b['year'] ? ', ' : '') . ($b['year'] ?? '')) . ')' : '');
  return implode(' · ', $o);
}

/* ---------- tiempo de juego (data/stats.sqlite, aparte de arcade.sqlite para que regenerar el catálogo no lo borre) ---------- */
function stats_db(bool $create = false): ?PDO {
  static $db = false;
  if ($db !== false && ($db || !$create)) return $db ?: null;
  $f = __DIR__ . '/data/stats.sqlite';
  if (!$create && !is_file($f)) return $db = null;
  try {
    $db = new PDO('sqlite:' . $f, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout = 3000');
    $db->exec('CREATE TABLE IF NOT EXISTS play (uid TEXT NOT NULL, game_id TEXT NOT NULL, seconds INTEGER NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 0, first_at TEXT, last_at TEXT, PRIMARY KEY (uid, game_id))');
    $db->exec('CREATE INDEX IF NOT EXISTS play_game ON play(game_id)');
    $db->exec('CREATE TABLE IF NOT EXISTS fav (uid TEXT NOT NULL, game_id TEXT NOT NULL, at TEXT, PRIMARY KEY (uid, game_id))');
    $db->exec('CREATE INDEX IF NOT EXISTS fav_game ON fav(game_id)');
  } catch (Throwable $e) { $db = null; }
  return $db;
}
function my_uid(): ?string { $u = (string)($_COOKIE['arc_uid'] ?? ''); return preg_match('/^[a-f0-9]{24}$/', $u) ? $u : null; }
/* ['all' => [id => [s, p, u]], 'me' => [id => [s, p]]] */
function stats(): array {
  static $S = null;
  if ($S !== null) return $S;
  $S = ['all' => [], 'me' => [], 'favs' => [], 'myfav' => []];
  $db = stats_db();
  if (!$db) return $S;
  try {
    foreach ($db->query('SELECT game_id, SUM(seconds) s, SUM(plays) p, COUNT(*) u FROM play GROUP BY game_id') as $r) $S['all'][$r['game_id']] = ['s' => (int)$r['s'], 'p' => (int)$r['p'], 'u' => (int)$r['u']];
    if ($u = my_uid()) { $st = $db->prepare('SELECT game_id, seconds s, plays p FROM play WHERE uid = ?'); $st->execute([$u]); foreach ($st as $r) $S['me'][$r['game_id']] = ['s' => (int)$r['s'], 'p' => (int)$r['p']]; }
    foreach ($db->query('SELECT game_id, COUNT(*) n FROM fav GROUP BY game_id') as $r) $S['favs'][$r['game_id']] = (int)$r['n'];
    if ($u) { $st = $db->prepare('SELECT game_id, at FROM fav WHERE uid = ? ORDER BY at DESC'); $st->execute([$u]); foreach ($st as $r) $S['myfav'][$r['game_id']] = $r['at']; }
  } catch (Throwable $e) {}
  return $S;
}
function fmt_time(int $s): string {
  if ($s < 60) return T('menos de 1 min', 'under 1 min');
  $m = intdiv($s, 60); if ($m < 60) return $m . ' min';
  $h = intdiv($m, 60); $m %= 60; return $h . ' h' . ($m ? ' ' . $m . ' min' : '');
}
/* los juegos de $games ordenados por tiempo jugado ('all' o 'me'), solo los que tienen tiempo */
function top_games(array $games, string $who, int $n): array {
  $st = stats()[$who];
  $games = array_values(array_filter($games, function ($g) use ($st) { return ($st[$g['id']]['s'] ?? 0) >= 30; }));
  usort($games, function ($a, $b) use ($st) { return $st[$b['id']]['s'] <=> $st[$a['id']]['s']; });
  return array_slice($games, 0, $n);
}
function played_rows(array $g): string {
  $st = stats(); $a = $st['all'][$g['id']] ?? null; $m = $st['me'][$g['id']] ?? null; $o = '';
  if ($a) $o .= '<dt>' . h(T('Jugado (todos)', 'Played (everyone)')) . '</dt><dd>' . h(fmt_time($a['s']) . ' · ' . $a['p'] . T(' partidas', ' games') . ' · ' . $a['u'] . T(' jugadores', ' players')) . '</dd>';
  if ($m) $o .= '<dt>' . h(T('Jugado (tú)', 'Played (you)')) . '</dt><dd>' . h(fmt_time($m['s']) . ' · ' . $m['p'] . T(' partidas', ' games')) . '</dd>';
  if ($f = $st['favs'][$g['id']] ?? 0) $o .= '<dt>' . h(T('Favorito', 'Favourite')) . '</dt><dd>❤️ ' . h($f . T($f === 1 ? ' persona' : ' personas', $f === 1 ? ' person' : ' people') . (isset($st['myfav'][$g['id']]) ? T(' (tú también)', ' (you too)') : '')) . '</dd>';
  return $o;
}
function rank_html(array $games, int $n = 6, string $what = ''): string {
  $o = ''; $st = stats();
  $ids = array_column($games, null, 'id');
  $mine = array_values(array_filter(array_map(function ($id) use ($ids) { return $ids[$id] ?? null; }, array_keys($st['myfav']))));
  if ($mine) { $o .= '<h2>' . h(T('❤️ Tus favoritos', '❤️ Your favourites')) . '</h2><ul class="grid">'; foreach (array_slice($mine, 0, 12) as $g) $o .= card($g, '', url(play_path($g))); $o .= '</ul>'; }
  foreach ([['me', T('🕹️ Tus más jugados', '🕹️ Your most played')], ['all', T('🔥 Los más jugados', '🔥 Most played')]] as [$who, $title]) {
    $top = top_games($games, $who, $who === 'me' ? min($n, 6) : $n);
    if (!$top) continue;
    $o .= '<h2>' . h($title . ($what !== '' ? ' · ' . $what : '')) . '</h2><ol class="grid rank">';
    foreach ($top as $i => $g) {
      $x = $st[$who][$g['id']];
      $chip = '<span>⏱ ' . h(fmt_time($x['s'])) . '</span>' . ($who === 'all' && $x['u'] > 1 ? '<span>👥 ' . $x['u'] . '</span>' : '');
      $o .= card($g, $chip, $who === 'me' ? url(play_path($g)) : null, $i + 1);
    }
    $o .= '</ol>';
  }
  $fv = array_values(array_filter($games, function ($g) use ($st) { return ($st['favs'][$g['id']] ?? 0) > 0; }));
  usort($fv, function ($a, $b) use ($st) { return $st['favs'][$b['id']] <=> $st['favs'][$a['id']]; });
  if ($fv) {
    $o .= '<h2>' . h(T('💖 Los favoritos de la gente', '💖 Everyone\'s favourites')) . '</h2><ol class="grid rank">';
    foreach (array_slice($fv, 0, $n) as $i => $g) $o .= card($g, '<span>❤️ ' . $st['favs'][$g['id']] . '</span>', null, $i + 1);
    $o .= '</ol>';
  }
  return $o;
}

/* ---------- JSON-LD ---------- */
function org_ld(): array {
  global $SITE;
  return ['@type' => 'Organization', '@id' => abs_url('/#org'), 'name' => $SITE, 'url' => abs_url('/'), 'logo' => ['@type' => 'ImageObject', 'url' => abs_url('/pwa/icons/icon-512.png'), 'width' => 512, 'height' => 512]];
}
function website_ld(): array {
  global $SITE, $L;
  return ['@type' => 'WebSite', '@id' => abs_url('/#website'), 'name' => $SITE, 'url' => abs_url('/'), 'inLanguage' => ['es', 'en'], 'publisher' => ['@id' => abs_url('/#org')],
    'description' => T('Juegos HTML5 gratis para móvil y TV: mecánicas de arcade clásicas y éxitos de móvil rehechos con emojis, y juegos educativos para niños.', 'Free HTML5 games for phone and TV: classic arcade mechanics and mobile hits remade with emojis, plus educational games for kids.'),
    'potentialAction' => ['@type' => 'SearchAction', 'target' => ['@type' => 'EntryPoint', 'urlTemplate' => abs_url(list_path('search')) . '?q={search_term_string}'], 'query-input' => 'required name=search_term_string']];
}
function app_ld(): array {
  global $SITE, $VERSION, $GAMES;
  return ['@type' => ['MobileApplication', 'WebApplication'], '@id' => abs_url('/#app'), 'name' => $SITE, 'url' => abs_url('/pwa/index.html'), 'installUrl' => abs_url('/pwa/index.html'),
    'applicationCategory' => 'GameApplication', 'applicationSubCategory' => T('Recopilatorio de juegos arcade', 'Arcade game collection'),
    'operatingSystem' => 'Android, iOS, Windows, macOS, Linux, Android TV, Fire TV', 'browserRequirements' => T('Requiere un navegador moderno con JavaScript', 'Requires a modern browser with JavaScript'),
    'softwareVersion' => $VERSION, 'inLanguage' => ['es', 'en'], 'isAccessibleForFree' => true, 'image' => abs_url('/pwa/icons/icon-512.png'),
    'description' => T('PWA instalable y sin conexión con ' . arcade_count() . ' juegos táctiles y para mando de TV.', 'Installable offline PWA with ' . arcade_count() . ' touch and TV-remote games.'),
    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR', 'availability' => 'https://schema.org/InStock'],
    'publisher' => ['@id' => abs_url('/#org')]];
}
function crumbs_ld(array $items): array {
  $l = []; $i = 1;
  foreach ($items as [$name, $p]) $l[] = ['@type' => 'ListItem', 'position' => $i++, 'name' => $name, 'item' => abs_url($p)];
  return ['@type' => 'BreadcrumbList', '@id' => abs_url($items[count($items) - 1][1]) . '#breadcrumb', 'itemListElement' => $l];
}
function itemlist_ld(string $p, string $name, array $games): array {
  $l = []; $i = 1;
  foreach ($games as $g) $l[] = ['@type' => 'ListItem', 'position' => $i++, 'url' => abs_url(game_path($g)), 'name' => f($g, 'title')];
  return ['@type' => 'ItemList', '@id' => abs_url($p) . '#list', 'name' => $name, 'numberOfItems' => count($games), 'itemListOrder' => 'https://schema.org/ItemListUnordered', 'itemListElement' => $l];
}
function page_ld(string $type, string $p, string $title, string $desc, array $extra = []): array {
  global $L;
  return array_merge(['@type' => $type, '@id' => abs_url($p) . '#webpage', 'url' => abs_url($p), 'name' => $title, 'description' => $desc, 'inLanguage' => $L, 'isPartOf' => ['@id' => abs_url('/#website')]], $extra);
}
function game_ld(array $g): array {
  global $COLS, $CATS, $CTRLS, $VERSION;
  $c = $CATS[$g['category_id']]; $p = game_path($g);
  $based = [];
  foreach ($g['based'] as $b) { $x = ['@type' => 'VideoGame', 'name' => $b['name']]; if ($b['publisher']) $x['publisher'] = ['@type' => 'Organization', 'name' => $b['publisher']]; if ($b['year']) $x['datePublished'] = (string)$b['year']; $based[] = $x; }
  $ld = ['@type' => ['VideoGame', 'MobileApplication'], '@id' => abs_url($p) . '#game', 'name' => f($g, 'title'), 'alternateName' => T($g['title_en'], $g['title_es']),
    'url' => abs_url($p), 'description' => f($g, 'desc'), 'disambiguatingDescription' => f($g, 'tag'),
    'image' => [abs_url('/pwa/icons/icon-512.png'), abs_url('/icono/' . $g['id'] . '.svg')],
    'genre' => [f($c, 'name'), $c['genre'], 'Arcade'], 'gamePlatform' => array_values(array_filter(['Web browser', 'Android', 'iOS', $g['tv'] ? 'Android TV' : null, $g['tv'] ? 'Fire TV' : null])),
    'applicationCategory' => 'GameApplication', 'operatingSystem' => 'Android, iOS, Windows, macOS, Linux' . ($g['tv'] ? ', Android TV, Fire TV' : ''),
    'playMode' => $g['tv'] ? ['SinglePlayer', 'MultiPlayer'] : 'SinglePlayer',
    'numberOfPlayers' => ['@type' => 'QuantitativeValue', 'minValue' => 1, 'maxValue' => $g['tv'] ? 4 : 1],
    'inLanguage' => ['es', 'en'], 'isAccessibleForFree' => true, 'softwareVersion' => $VERSION,
    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR', 'availability' => 'https://schema.org/InStock', 'url' => abs_url(play_path($g))],
    'gameTip' => ['@type' => 'CreativeWork', 'name' => T('Cómo se juega', 'How to play'), 'text' => plain(f($g, 'help'))],
    'keywords' => implode(', ', array_filter([f($g, 'title'), f($c, 'name'), f($CTRLS[$g['control_id']], 'name'), $g['origin'], T('juego gratis', 'free game'), T('sin conexión', 'offline'), 'HTML5'])),
    'isPartOf' => ['@type' => 'CreativeWorkSeries', 'name' => f($COLS[$g['collection_id']], 'name'), 'url' => abs_url(col_path($COLS[$g['collection_id']]))],
    'publisher' => ['@id' => abs_url('/#org')],
    'potentialAction' => ['@type' => 'PlayAction', 'target' => ['@type' => 'EntryPoint', 'urlTemplate' => abs_url(play_path($g)), 'actionPlatform' => ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform']]],
    'mainEntityOfPage' => ['@id' => abs_url($p) . '#webpage']];
  if ($based) $ld['isBasedOn'] = count($based) === 1 ? $based[0] : $based;
  if ($g['added_version']) $ld['version'] = $g['added_version'];
  return $ld;
}
function edu_ld(array $g): array {
  global $SUBJS, $COLS;
  $s = $SUBJS[$g['subject_id']]; $p = game_path($g);
  $langs = explode(',', (string)$g['langs']);
  return ['@type' => ['VideoGame', 'MobileApplication', 'LearningResource'], '@id' => abs_url($p) . '#game', 'name' => f($g, 'title'), 'alternateName' => T($g['title_en'], $g['title_es']),
    'url' => abs_url($p), 'description' => f($g, 'desc'), 'image' => abs_url('/icono/' . $g['id'] . '.svg'),
    'genre' => [T('Educativo', 'Educational'), f($s, 'name')], 'gamePlatform' => ['Web browser', 'Android', 'iOS'],
    'applicationCategory' => 'EducationalApplication', 'applicationSubCategory' => f($s, 'name'), 'operatingSystem' => 'Android, iOS, Windows, macOS, Linux',
    'playMode' => 'SinglePlayer', 'numberOfPlayers' => ['@type' => 'QuantitativeValue', 'minValue' => 1, 'maxValue' => 1],
    'learningResourceType' => T('Juego educativo', 'Educational game'), 'educationalUse' => T('Práctica', 'Practice'), 'interactivityType' => 'active',
    'teaches' => f($s, 'name'), 'about' => ['@type' => 'Thing', 'name' => f($s, 'name')],
    'typicalAgeRange' => $g['age_min'] . '-' . $g['age_max'],
    'audience' => ['@type' => 'PeopleAudience', 'audienceType' => T('Niños', 'Children'), 'suggestedMinAge' => (int)$g['age_min'], 'suggestedMaxAge' => (int)$g['age_max']],
    'inLanguage' => count($langs) === 1 ? $langs[0] : $langs, 'isAccessibleForFree' => true, 'isFamilyFriendly' => true,
    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR', 'availability' => 'https://schema.org/InStock', 'url' => abs_url(play_path($g))],
    'keywords' => implode(', ', [f($g, 'title'), f($s, 'name'), T('juego educativo', 'educational game'), ages_label($g), $g['app'], T('gratis', 'free')]),
    'isPartOf' => ['@type' => 'CreativeWorkSeries', 'name' => $g['app'], 'url' => abs_url(col_path($COLS['edu']))],
    'publisher' => ['@id' => abs_url('/#org')],
    'potentialAction' => ['@type' => 'PlayAction', 'target' => ['@type' => 'EntryPoint', 'urlTemplate' => abs_url(play_path($g)), 'actionPlatform' => ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform']]],
    'mainEntityOfPage' => ['@id' => abs_url($p) . '#webpage']];
}
function faq_ld(array $qa, string $p): array {
  return ['@type' => 'FAQPage', '@id' => abs_url($p) . '#faq', 'mainEntity' => array_map(function ($x) { return ['@type' => 'Question', 'name' => $x[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $x[1]]]; }, $qa)];
}

/* ---------- plantilla ---------- */
function card(array $g, string $extra = '', ?string $href = null, int $pos = 0): string {
  global $CTRLS, $SUBJS;
  if (is_edu($g)) $chips = '<span>' . h($SUBJS[$g['subject_id']]['emoji'] . ' ' . f($SUBJS[$g['subject_id']], 'name')) . '</span><span>' . h(ages_label($g)) . '</span>';
  else $chips = '<span>' . h(f($CTRLS[$g['control_id']], 'name')) . '</span>' . ($g['tv'] ? '<span title="' . h(T('Se puede jugar con mando', 'Playable with a remote')) . '">📺</span>' : '');
  return '<li><a class="card" href="' . h($href ?? url(game_path($g))) . '" style="--c:' . h($g['color']) . '">' . ($pos ? '<span class="pos">' . $pos . '</span>' : '')
    . '<span class="ic" aria-hidden="true" style="background:linear-gradient(135deg,' . h($g['bg1'] ?: $g['color']) . ',' . h($g['bg2'] ?: '#111') . ')">' . h($g['emoji']) . '</span>'
    . '<span class="tx"><b>' . h(f($g, 'title')) . '</b><span class="tg">' . h(f($g, 'tag')) . '</span>'
    . '<span class="ch">' . $chips . $extra . '</span></span></a></li>';
}
function grid(array $games): string { return '<ul class="grid">' . implode('', array_map('card', $games)) . '</ul>'; }
function crumbs_html(array $items): string {
  $o = []; $n = count($items);
  foreach ($items as $i => [$name, $p]) $o[] = $i < $n - 1 ? '<a href="' . h(url($p)) . '">' . h($name) . '</a>' : '<span aria-current="page">' . h($name) . '</span>';
  return '<nav class="crumbs" aria-label="' . h(T('Migas de pan', 'Breadcrumb')) . '">' . implode(' <span aria-hidden="true">›</span> ', $o) . '</nav>';
}

function render(array $o): void {
  global $L, $SITE, $CATS, $COLS, $CTRLS, $GAMES, $VERSION, $SUBJS, $AGES;
  $status = $o['status'] ?? 200;
  http_response_code($status);
  header('Content-Type: text/html; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  $title = $o['title']; $desc = cut($o['desc'], 160); $p = $o['path'];
  $alt = $o['alt'] ?? null; // [es_path, en_path]
  $ld = ['@context' => 'https://schema.org', '@graph' => array_merge([org_ld(), website_ld()], $o['ld'] ?? [])];
  $other = $alt ? ($L === 'en' ? $alt[0] : $alt[1]) : ($L === 'en' ? '/' : '/en/');
  ?><!doctype html>
<html lang="<?= $L ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title><?= h($title) ?></title>
<script>try{localStorage.setItem('arc_lang','<?= $L ?>');document.cookie='arc_lang=<?= $L ?>;path=/;max-age=63072000;SameSite=Lax';<?php if (!empty($o['back'])): ?>sessionStorage.setItem('arc_back',location.pathname+location.search);<?php endif; ?>}catch(e){}</script>
<meta name="description" content="<?= h($desc) ?>">
<?php if (!empty($o['noindex'])): ?><meta name="robots" content="noindex,follow">
<?php else: ?><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="<?= h(abs_url($p)) ?>">
<?php endif; ?>
<?php if ($alt): ?><link rel="alternate" hreflang="es" href="<?= h(abs_url($alt[0])) ?>">
<link rel="alternate" hreflang="en" href="<?= h(abs_url($alt[1])) ?>">
<link rel="alternate" hreflang="x-default" href="<?= h(abs_url($alt[0])) ?>">
<?php endif; ?>
<meta name="theme-color" content="<?= h($o['theme'] ?? '#120f26') ?>">
<meta name="application-name" content="<?= h($SITE) ?>">
<meta name="apple-mobile-web-app-title" content="<?= h($SITE) ?>">
<meta property="og:type" content="<?= h($o['ogtype'] ?? 'website') ?>">
<meta property="og:site_name" content="<?= h($SITE) ?>">
<meta property="og:title" content="<?= h($o['ogtitle'] ?? $title) ?>">
<meta property="og:description" content="<?= h($desc) ?>">
<meta property="og:url" content="<?= h(abs_url($p)) ?>">
<meta property="og:image" content="<?= h(abs_url('/pwa/icons/icon-512.png')) ?>">
<meta property="og:image:width" content="512"><meta property="og:image:height" content="512">
<meta property="og:locale" content="<?= $L === 'en' ? 'en_GB' : 'es_ES' ?>">
<meta property="og:locale:alternate" content="<?= $L === 'en' ? 'es_ES' : 'en_GB' ?>">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="<?= h($o['ogtitle'] ?? $title) ?>">
<meta name="twitter:description" content="<?= h($desc) ?>">
<link rel="icon" href="<?= h($o['icon'] ?? url('/pwa/icons/icon-192.png')) ?>">
<link rel="apple-touch-icon" href="<?= h(url('/pwa/icons/icon-192.png')) ?>">
<link rel="manifest" href="<?= h(url('/pwa/manifest.webmanifest')) ?>">
<link rel="sitemap" type="application/xml" href="<?= h(url('/sitemap.xml')) ?>">
<script type="application/ld+json"><?= json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<style>
:root{--bg:#120f26;--bg2:#1d1840;--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--tx:#f1f0ff;--mu:#b9b4e0;--ac:#ffd43b;--r:18px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(120% 60% at 50% 0,#2a2160,var(--bg) 70%) fixed,var(--bg);color:var(--tx);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:inherit}img{max-width:100%}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
header.top{position:sticky;top:0;z-index:5;background:rgba(18,15,38,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;align-items:center;gap:12px;min-height:58px;flex-wrap:wrap;padding-top:6px;padding-bottom:6px}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none;font-weight:900;font-size:19px;white-space:nowrap}
.brand span{font-size:26px}
nav.main{display:flex;gap:4px;flex-wrap:wrap;flex:1}
nav.main a,.lang{text-decoration:none;padding:6px 10px;border-radius:999px;font-size:14px;color:var(--mu)}
nav.main a:hover,nav.main a[aria-current]{background:var(--card);color:var(--tx)}
.lang{border:1px solid var(--line);color:var(--tx)}
form.search{display:flex;gap:6px;margin:0}
form.search input{width:150px;max-width:40vw;background:rgba(0,0,0,.25);border:1px solid var(--line);color:var(--tx);border-radius:999px;padding:7px 12px;font-size:14px}
form.search button{background:var(--card);border:1px solid var(--line);color:var(--tx);border-radius:999px;padding:6px 10px;cursor:pointer}
main{padding:22px 0 40px}
h1{font-size:clamp(28px,5.5vw,46px);line-height:1.1;margin:.2em 0 .3em}
h2{font-size:clamp(21px,3.4vw,28px);margin:1.6em 0 .6em}
.lead{color:var(--mu);font-size:18px;max-width:760px;margin:0 0 10px}
.crumbs{font-size:14px;color:var(--mu);margin-bottom:8px}.crumbs a{color:var(--mu)}
.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.card{display:flex;gap:12px;align-items:center;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:12px;height:100%;transition:transform .12s,border-color .12s}
.card:hover,.card:focus-visible{transform:translateY(-2px);border-color:var(--c);outline:none}
.card{position:relative}.pos{position:absolute;top:-8px;left:-8px;min-width:28px;height:28px;border-radius:999px;background:var(--ac);color:#1b1500;font-weight:900;display:grid;place-items:center;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,.3)}
ol.rank{counter-reset:none}
.ic{flex:none;width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.tx{display:flex;flex-direction:column;min-width:0}.tx b{font-size:17px}
.tg{color:var(--mu);font-size:13.5px;line-height:1.35}
.ch{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:4px;font-size:12px}.ch span{background:rgba(255,255,255,.08);border-radius:999px;padding:1px 8px;white-space:nowrap}
.tiles{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.tile{display:flex;gap:10px;align-items:center;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px}
.tile:hover{border-color:var(--ac)}.tile .e{font-size:28px}.tile small{display:block;color:var(--mu)}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.col{display:block;text-decoration:none;border-radius:22px;padding:22px;border:1px solid var(--line);background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.02))}
.col .e{font-size:44px}.col h3{margin:.2em 0;font-size:24px}.col p{color:var(--mu);margin:0 0 8px}.col b{color:var(--ac)}
.hero{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center}
.big{width:150px;height:150px;border-radius:36px;display:grid;place-items:center;font-size:88px;box-shadow:0 18px 50px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.15)}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 20px;border:1px solid var(--line);background:var(--card)}
.btn.pri{background:var(--ac);color:#1b1500;border-color:transparent;font-size:18px;padding:13px 26px}
.btn:hover{filter:brightness(1.08)}
.box{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px}
.how{font-size:17px}.how b{color:#fff}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:8px 18px;margin:0}
dl.facts dt{color:var(--mu)}dl.facts dd{margin:0}
.two{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
details.faq{border-bottom:1px solid var(--line);padding:10px 0}details.faq summary{cursor:pointer;font-weight:700}details.faq p{color:var(--mu);margin:.5em 0 0}
.pager{display:flex;justify-content:space-between;gap:10px;margin-top:24px}
.az{columns:3 220px;padding:0;list-style:none}.az li{break-inside:avoid;padding:3px 0}.az a{text-decoration:none}.az a:hover{text-decoration:underline}
footer{border-top:1px solid var(--line);color:var(--mu);font-size:14px;padding:26px 0 40px}
footer .links{display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:12px}footer a{color:var(--mu)}
@media (max-width:720px){header.top{position:static}header.top .wrap{gap:8px}.brand{flex:1}nav.main{order:3;flex:0 0 100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -6px}nav.main a{white-space:nowrap}form.search{order:4;flex:0 0 100%}form.search input{flex:1;max-width:none;width:auto}.hero{grid-template-columns:1fr}.big{width:110px;height:110px;font-size:64px;border-radius:28px}.two{grid-template-columns:1fr}main{padding-top:14px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="<?= h(home_url()) ?>"><span aria-hidden="true">🕹️</span><?= h($SITE) ?></a>
  <nav class="main" aria-label="<?= h(T('Principal', 'Main')) ?>">
    <?php foreach ($COLS as $c): ?><a href="<?= h(url(col_path($c))) ?>"<?= $p === col_path($c) ? ' aria-current="page"' : '' ?>><?= h(f($c, 'name')) ?></a><?php endforeach; ?>
    <a href="<?= h(url(list_path('games'))) ?>"<?= $p === list_path('games') ? ' aria-current="page"' : '' ?>><?= h(T('Todos', 'All games')) ?></a>
    <a href="<?= h(url(list_path('tv'))) ?>"<?= $p === list_path('tv') ? ' aria-current="page"' : '' ?>>📺 TV</a>
  </nav>
  <form class="search" action="<?= h(url(list_path('search'))) ?>" method="get" role="search">
    <input type="search" name="q" value="<?= h($o['q'] ?? '') ?>" placeholder="<?= h(T('Buscar juego…', 'Search games…')) ?>" aria-label="<?= h(T('Buscar', 'Search')) ?>">
    <button type="submit" aria-label="<?= h(T('Buscar', 'Search')) ?>">🔎</button>
  </form>
  <a class="lang" href="<?= h(url($other)) ?>" hreflang="<?= $L === 'en' ? 'es' : 'en' ?>" lang="<?= $L === 'en' ? 'es' : 'en' ?>"><?= $L === 'en' ? '🇪🇸 Español' : '🇬🇧 English' ?></a>
</div></header>
<main class="wrap">
<?= $o['body'] ?>
</main>
<footer><div class="wrap">
  <div class="links">
    <?php foreach ($CATS as $c): ?><a href="<?= h(url(cat_path($c))) ?>"><?= h($c['emoji'] . ' ' . f($c, 'name')) ?></a><?php endforeach; ?>
  </div>
  <div class="links">
    <?php foreach ($SUBJS as $c): ?><a href="<?= h(url(subj_path($c))) ?>"><?= h($c['emoji'] . ' ' . T('Educativos de ', 'Educational ') . f($c, 'name')) ?></a><?php endforeach; ?>
    <?php foreach ($AGES as $c): ?><a href="<?= h(url(age_path($c))) ?>"><?= h(f($c, 'name')) ?></a><?php endforeach; ?>
  </div>
  <div class="links">
    <?php foreach ($CTRLS as $c): ?><a href="<?= h(url(ctrl_path($c))) ?>"><?= h(T('Control: ', 'Control: ') . f($c, 'name')) ?></a><?php endforeach; ?>
  </div>
  <p><?= h($SITE) ?> · <?= count($GAMES) ?> <?= h(T('juegos gratis y sin anuncios', 'free games, no ads')) ?> · v<?= h($VERSION) ?> · <a href="<?= h(url('/sitemap.xml')) ?>">Sitemap</a></p>
</div></footer>
</body>
</html>
<?php
}

/* ---------- páginas ---------- */
function page_home(): void {
  global $COLS, $CATS, $GAMES, $L, $SITE;
  $p = $L === 'en' ? '/en/' : '/';
  $byCol = []; foreach ($GAMES as $g) $byCol[$g['collection_id']][] = $g;
  $byCat = []; foreach ($GAMES as $g) $byCat[$g['category_id']][] = $g;
  $new = array_values(array_filter($GAMES, function ($g) { return $g['added_version'] !== null && !is_edu($g); }));
  $na = arcade_count(); $ne = count($GAMES) - $na;
  ob_start(); ?>
  <h1><?= h(T('Juegos arcade y educativos gratis para móvil y TV', 'Free arcade and educational games for phone and TV')) ?></h1>
  <p class="lead"><?= h(T($na . ' juegos HTML5 hechos con emojis: mecánicas de recreativa olvidadas y los grandes éxitos de móvil. Sin anuncios, sin descargas, con hasta 120 niveles, tres modos de dificultad y funcionan sin conexión. Se juegan con el dedo o con el mando de la tele. Y además ' . $ne . ' juegos educativos de mates, lengua, lógica e inglés para niños de 3 a 16 años.', $na . ' HTML5 games made with emojis: forgotten arcade mechanics and the big mobile hits. No ads, no downloads, up to 120 levels, three difficulty modes and they work offline. Play with your finger or with the TV remote. Plus ' . $ne . ' educational games for maths, language, logic and English for kids aged 3 to 16.')) ?></p>
  <?= rank_html(array_values($GAMES), 12) ?>
  <h2><?= h(T('Colecciones', 'Collections')) ?></h2>
  <div class="cols">
    <?php foreach ($COLS as $c): ?>
    <a class="col" href="<?= h(url(col_path($c))) ?>"><div class="e" aria-hidden="true"><?= h($c['emoji']) ?></div><h3><?= h(f($c, 'name')) ?></h3><p><?= h(f($c, 'desc')) ?></p><b><?= count($byCol[$c['id']] ?? []) ?> <?= h(T('juegos', 'games')) ?> ▶</b></a>
    <?php endforeach; ?>
    <a class="col" href="<?= h(url(list_path('tv'))) ?>"><div class="e" aria-hidden="true">📺</div><h3><?= h(T('Para la tele', 'For your TV')) ?></h3><p><?= h(T('Android TV y Fire TV: juega con el mando, hasta 4 jugadores por turnos.', 'Android TV and Fire TV: play with the remote, up to 4 players taking turns.')) ?></p><b><?= count(array_filter($GAMES, function ($g) { return (bool)$g['tv']; })) ?> <?= h(T('juegos', 'games')) ?> ▶</b></a>
  </div>
  <h2><?= h(T('Categorías', 'Categories')) ?></h2>
  <ul class="tiles">
    <?php foreach ($CATS as $c): ?><li><a class="tile" href="<?= h(url(cat_path($c))) ?>"><span class="e" aria-hidden="true"><?= h($c['emoji']) ?></span><span><b><?= h(f($c, 'name')) ?></b><small><?= count($byCat[$c['id']] ?? []) ?> <?= h(T('juegos', 'games')) ?></small></span></a></li><?php endforeach; ?>
  </ul>
  <h2><?= h(T('🎓 Juegos educativos por asignatura y edad', '🎓 Educational games by subject and age')) ?></h2>
  <?= edu_tiles() ?>
  <?php if ($new): ?><h2><?= h(T('Novedades', 'New games')) ?></h2><?= grid($new) ?><?php endif; ?>
  <?php foreach ($CATS as $c): if (empty($byCat[$c['id']])) continue; ?>
    <h2><a href="<?= h(url(cat_path($c))) ?>" style="text-decoration:none"><?= h($c['emoji'] . ' ' . f($c, 'name')) ?></a></h2>
    <?= grid(array_slice($byCat[$c['id']], 0, 6)) ?>
    <?php if (count($byCat[$c['id']]) > 6): ?><p><a href="<?= h(url(cat_path($c))) ?>"><?= h(T('Ver los ' . count($byCat[$c['id']]) . ' juegos de ' . mb_strtolower(f($c, 'name')), 'See all ' . count($byCat[$c['id']]) . ' ' . mb_strtolower(f($c, 'name')) . ' games')) ?> →</a></p><?php endif; ?>
  <?php endforeach; ?>
  <?php $body = ob_get_clean();
  $title = T('Arcade Perdido · ' . $na . ' juegos arcade y ' . $ne . ' educativos gratis', 'Arcade Perdido · ' . $na . ' arcade and ' . $ne . ' educational games, free');
  $desc = T('Juega gratis y sin anuncios a ' . $na . ' juegos HTML5 con emojis (puzles, arcade, un toque, física y estrategia) y a ' . $ne . ' juegos educativos de mates, lengua, lógica e inglés para niños. Para móvil, PC y Android TV.', 'Play ' . $na . ' free, ad-free HTML5 emoji games (puzzles, arcade, one-tap, physics, strategy) and ' . $ne . ' educational maths, language, logic and English games for kids. For phone, PC and Android TV.');
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => ['/', '/en/'], 'body' => $body, 'back' => true,
    'ld' => [app_ld(), page_ld('CollectionPage', $p, $title, $desc, ['about' => ['@id' => abs_url('/#app')], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), itemlist_ld($p, T('Todos los juegos', 'All games'), array_values($GAMES))]]);
}

function edu_tiles(?string $skip = null): string {
  global $SUBJS, $AGES;
  $edu = edu_games(); $o = '<ul class="tiles">';
  if ($skip !== 'subj') foreach ($SUBJS as $c) { $n = count(array_filter($edu, function ($g) use ($c) { return $g['subject_id'] === $c['id']; }));
    $o .= '<li><a class="tile" href="' . h(url(subj_path($c))) . '"><span class="e" aria-hidden="true">' . h($c['emoji']) . '</span><span><b>' . h(f($c, 'name')) . '</b><small>' . $n . ' ' . h(T('juegos', 'games')) . '</small></span></a></li>'; }
  if ($skip !== 'age') foreach ($AGES as $c) { $n = count(array_filter($edu, function ($g) use ($c) { return in_array($c['id'], $g['ages'], true); }));
    if ($n) $o .= '<li><a class="tile" href="' . h(url(age_path($c))) . '"><span class="e" aria-hidden="true">' . h($c['emoji']) . '</span><span><b>' . h(f($c, 'name')) . '</b><small>' . $n . ' ' . h(T('juegos', 'games')) . '</small></span></a></li>'; }
  return $o . '</ul>';
}

function page_list(string $p, array $alt, string $h1, string $lead, array $games, array $crumbs, string $title, string $desc, array $extraBody = []): void {
  ob_start(); ?>
  <?= crumbs_html($crumbs) ?>
  <h1><?= h($h1) ?></h1>
  <p class="lead"><?= h($lead) ?></p>
  <?php $rk = rank_html($games, 6); echo $rk; ?>
  <?= $extraBody['before'] ?? '' ?>
  <?php if ($rk && empty($extraBody['before'])): ?><h2><?= h(T('Todos los juegos', 'All games')) ?> <small style="color:var(--mu);font-size:.6em"><?= count($games) ?></small></h2><?php endif; ?>
  <?= grid($games) ?>
  <?= $extraBody['after'] ?? '' ?>
  <?php $body = ob_get_clean();
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => $alt, 'body' => $body, 'back' => true,
    'ld' => [page_ld('CollectionPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), crumbs_ld($crumbs), itemlist_ld($p, $h1, $games)]]);
}

function page_collection(array $c): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['collection_id'] === $c['id']; }));
  $p = col_path($c); $n = f($c, 'name');
  $play = '<div class="btns" style="margin-bottom:18px"><a class="btn pri" href="' . h(url('/' . $c['index_file'])) . '">▶ ' . h(T('Abrir ' . $n, 'Open ' . $n)) . '</a></div>';
  if ($c['id'] === 'edu') $play = edu_tiles() . '<h2>' . h(T('Todos los juegos educativos', 'All educational games')) . '</h2>';   // sin portada aparte: esta es su portada
  page_list($p, [col_path($c, 'es'), col_path($c, 'en')], $c['id'] === 'edu' ? T('🎓 Juegos educativos', '🎓 Educational games') : $n, f($c, 'desc'), $games, [[T('Inicio', 'Home'), home_path()], [$n, $p]],
    ($c['id'] === 'edu' ? T('Juegos educativos para niños: ' . count($games) . ' juegos gratis de mates, lengua, lógica e inglés', 'Educational games for kids: ' . count($games) . ' free maths, language, logic and English games')
      : T($n . ': ' . count($games) . ' juegos gratis para móvil y TV', $n . ': ' . count($games) . ' free games for phone and TV')) . ' · ' . $SITE, f($c, 'desc'), ['before' => $play]);
}
function home_path(): string { return T('/', '/en/'); }

function page_category(array $c): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['category_id'] === $c['id']; }));
  $p = cat_path($c); $n = f($c, 'name');
  page_list($p, [cat_path($c, 'es'), cat_path($c, 'en')], $c['emoji'] . ' ' . T('Juegos de ', '') . mb_strtolower($n, 'UTF-8') . T('', ' games'), f($c, 'desc'), $games,
    [[T('Inicio', 'Home'), home_path()], [$n, $p]], T('Juegos de ' . mb_strtolower($n, 'UTF-8') . ' gratis online (' . count($games) . ')', 'Free online ' . mb_strtolower($n, 'UTF-8') . ' games (' . count($games) . ')') . ' · ' . $SITE, f($c, 'desc'));
}

function page_subject(array $c): void {
  global $GAMES, $SITE, $COLS;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['subject_id'] === $c['id']; }));
  $p = subj_path($c); $n = f($c, 'name'); $edu = f($COLS['edu'], 'name');
  page_list($p, [subj_path($c, 'es'), subj_path($c, 'en')], $c['emoji'] . ' ' . T('Juegos educativos de ' . mb_strtolower($n, 'UTF-8'), 'Educational ' . $n . ' games'), f($c, 'desc'), $games,
    [[T('Inicio', 'Home'), home_path()], [$edu, col_path($COLS['edu'])], [$n, $p]],
    T('Juegos de ' . mb_strtolower($n, 'UTF-8') . ' para niños gratis (' . count($games) . ')', 'Free ' . $n . ' games for kids (' . count($games) . ')') . ' · ' . $SITE, f($c, 'desc'),
    ['before' => '<h2 style="margin-top:.4em">' . h(T('Por edad', 'By age')) . '</h2>' . edu_tiles('subj') . '<h2>' . h(T('Juegos', 'Games')) . '</h2>']);
}

function page_age(array $c): void {
  global $GAMES, $SITE, $COLS;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return in_array($c['id'], $g['ages'], true); }));
  usort($games, function ($a, $b) { return strcmp($a['subject_id'], $b['subject_id']) ?: $a['sort'] - $b['sort']; });
  $p = age_path($c); $n = f($c, 'name'); $edu = f($COLS['edu'], 'name');
  $lead = T('Juegos educativos gratis para niños ' . mb_strtolower($n, 'UTF-8') . ': mates, lengua, lógica e inglés con la dificultad pensada para su edad.', 'Free educational games for kids aged ' . $n . ': maths, language, logic and English with difficulty made for their age.');
  page_list($p, [age_path($c, 'es'), age_path($c, 'en')], $c['emoji'] . ' ' . T('Juegos educativos ' . mb_strtolower($n, 'UTF-8'), 'Educational games for ' . $n), $lead, $games,
    [[T('Inicio', 'Home'), home_path()], [$edu, col_path($COLS['edu'])], [$n, $p]],
    T('Juegos educativos ' . mb_strtolower($n, 'UTF-8') . ' (' . count($games) . ')', 'Educational games for ' . $n . ' (' . count($games) . ')') . ' · ' . $SITE, $lead,
    ['before' => '<h2 style="margin-top:.4em">' . h(T('Por asignatura', 'By subject')) . '</h2>' . edu_tiles('age') . '<h2>' . h(T('Juegos', 'Games')) . '</h2>']);
}

function page_control(array $c): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['control_id'] === $c['id']; }));
  $p = ctrl_path($c); $n = f($c, 'name');
  $lead = T('Juegos táctiles que se controlan con un solo gesto: ' . mb_strtolower($n, 'UTF-8') . '. Ideales para jugar con una mano en el móvil.', 'Touch games played with a single gesture: ' . mb_strtolower($n, 'UTF-8') . '. Perfect for playing one-handed on your phone.');
  page_list($p, [ctrl_path($c, 'es'), ctrl_path($c, 'en')], T('Juegos para ' . mb_strtolower($n, 'UTF-8'), mb_convert_case($n, MB_CASE_TITLE, 'UTF-8') . ' games'), $lead, $games,
    [[T('Inicio', 'Home'), home_path()], [T('Control: ', 'Control: ') . $n, $p]], T('Juegos de ' . mb_strtolower($n, 'UTF-8') . ' para móvil', mb_convert_case($n, MB_CASE_TITLE, 'UTF-8') . ' games for mobile') . ' · ' . $SITE, $lead);
}

function page_tv(): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) { return (bool)$g['tv']; }));
  $p = list_path('tv');
  $lead = T('Juegos que se juegan con el mando de Android TV, Google TV o Fire TV (cruceta + OK). Abre la web en el navegador de la tele y juega solo o hasta con 4 jugadores por turnos.', 'Games you can play with an Android TV, Google TV or Fire TV remote (D-pad + OK). Open the site in your TV browser and play alone or with up to 4 players taking turns.');
  $btn = '<div class="btns" style="margin-bottom:18px"><a class="btn pri" href="' . h(url('/pwa/indextv')) . '?tv=1">📺 ' . h(T('Abrir la portada para TV', 'Open the TV home screen')) . '</a></div>';
  page_list($p, [list_path('tv', 'es'), list_path('tv', 'en')], T('Juegos para la tele con mando', 'TV games you play with the remote'), $lead, $games,
    [[T('Inicio', 'Home'), home_path()], ['TV', $p]], T(count($games) . ' juegos para Android TV y Fire TV gratis', count($games) . ' free games for Android TV and Fire TV') . ' · ' . $SITE, $lead, ['before' => $btn]);
}

function page_all(): void {
  global $GAMES, $SITE, $L, $SUBJS;
  $games = array_values($GAMES);
  usort($games, function ($a, $b) { return strcoll(f($a, 'title'), f($b, 'title')); });
  $p = list_path('games');
  ob_start(); ?>
  <?= crumbs_html([[T('Inicio', 'Home'), home_path()], [T('Todos los juegos', 'All games'), $p]]) ?>
  <h1><?= h(T('Todos los juegos de la A a la Z', 'All games from A to Z')) ?></h1>
  <p class="lead"><?= h(T('La lista completa de los ' . count($games) . ' juegos, con el clásico en el que se inspira cada uno (o la asignatura y la edad, en los educativos).', 'The full list of all ' . count($games) . ' games, with the classic each one is inspired by (or the subject and age, for educational ones).')) ?></p>
  <ul class="az">
  <?php foreach ($games as $g): ?><li><a href="<?= h(url(game_path($g))) ?>"><?= h($g['emoji'] . ' ' . f($g, 'title')) ?></a> <small style="color:var(--mu)">— <?= h(is_edu($g) ? '🎓 ' . f($SUBJS[$g['subject_id']], 'name') . ', ' . ages_label($g) : cut($g['origin'], 40)) ?></small></li><?php endforeach; ?>
  </ul>
  <?php $body = ob_get_clean();
  $title = T('Todos los juegos (' . count($games) . ') de la A a la Z', 'All ' . count($games) . ' games from A to Z') . ' · ' . $SITE;
  $desc = T('Índice alfabético de los ' . count($games) . ' juegos gratis de Arcade Perdido, Arcade Pro y los juegos educativos.', 'Alphabetical index of all ' . count($games) . ' free Arcade Perdido, Arcade Pro and educational games.');
  $crumbs = [[T('Inicio', 'Home'), home_path()], [T('Todos los juegos', 'All games'), $p]];
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => [list_path('games', 'es'), list_path('games', 'en')], 'body' => $body, 'back' => true,
    'ld' => [page_ld('CollectionPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), crumbs_ld($crumbs), itemlist_ld($p, T('Todos los juegos', 'All games'), $games)]]);
}

function page_search(): void {
  global $GAMES, $SITE, $SUBJS;
  $q = trim((string)($_GET['q'] ?? ''));
  $q = mb_substr($q, 0, 60);
  $norm = function (string $s): string { $s = mb_strtolower($s, 'UTF-8'); return strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']); };
  $res = [];
  if ($q !== '') {
    $nq = $norm($q);
    foreach ($GAMES as $g) {
      $hay = $norm(implode(' ', [$g['title_es'], $g['title_en'], $g['tag_es'], $g['tag_en'], $g['desc_es'], $g['desc_en'], $g['origin'],
        is_edu($g) ? 'educativo educational ' . $g['app'] . ' ' . $SUBJS[$g['subject_id']]['name_es'] . ' ' . $SUBJS[$g['subject_id']]['name_en'] : '']));
      if (strpos($hay, $nq) !== false) $res[] = $g;
    }
  }
  $p = list_path('search');
  ob_start(); ?>
  <h1><?= h($q === '' ? T('Buscar juegos', 'Search games') : T('Resultados para «' . $q . '»', 'Results for “' . $q . '”')) ?></h1>
  <p class="lead"><?= h($q === '' ? T('Escribe el nombre de un juego, una mecánica o un clásico (por ejemplo: Tetris, Zuma, 2048).', 'Type a game name, a mechanic or a classic (for example: Tetris, Zuma, 2048).') : count($res) . ' ' . T('juegos encontrados', 'games found')) ?></p>
  <?= $res ? grid($res) : ($q !== '' ? '<p>' . h(T('No hay resultados. Prueba con otra palabra o mira todas las ', 'No results. Try another word or browse all ')) . '<a href="' . h(url(list_path('games'))) . '">' . h(T('categorías y juegos', 'categories and games')) . '</a>.</p>' : '') ?>
  <?php $body = ob_get_clean();
  render(['path' => $p, 'title' => T('Buscar', 'Search') . ($q !== '' ? ': ' . $q : '') . ' · ' . $SITE, 'desc' => T('Busca entre todos los juegos de Arcade Perdido.', 'Search all Arcade Perdido games.'), 'noindex' => true, 'q' => $q, 'back' => true,
    'alt' => [list_path('search', 'es'), list_path('search', 'en')], 'body' => $body, 'ld' => [page_ld('SearchResultsPage', $p, T('Buscar', 'Search'), '')]]);
}

function page_game_edu(array $g): void {
  global $COLS, $SUBJS, $AGES, $GAMES, $SITE;
  $s = $SUBJS[$g['subject_id']]; $col = $COLS['edu'];
  $p = game_path($g); $t = f($g, 'title');
  $crumbs = [[T('Inicio', 'Home'), home_path()], [f($col, 'name'), col_path($col)], [f($s, 'name'), subj_path($s)], [$t, $p]];
  $related = array_values(array_filter($GAMES, function ($x) use ($g) { return is_edu($x) && $x['subject_id'] === $g['subject_id'] && $x['id'] !== $g['id'] && array_intersect($x['ages'], $g['ages']); }));
  $related = array_slice($related, 0, 6);
  $bands = array_map(function ($a) use ($AGES) { return '<a href="' . h(url(age_path($AGES[$a]))) . '">' . h(f($AGES[$a], 'name')) . '</a>'; }, $g['ages']);
  $faq = [
    [T('¿Para qué edad es ' . $t . '?', 'What age is ' . $t . ' for?'), T('Está pensado para niños de ' . $g['age_min'] . ' a ' . $g['age_max'] . ' años', 'It is designed for kids aged ' . $g['age_min'] . ' to ' . $g['age_max']) . ($g['levels'] === 'infinite' ? T(': la dificultad sube poco a poco con cada nivel y se adapta a la edad del perfil.', ': difficulty rises little by little with each level and adapts to the profile age.') : '.')],
    [T('¿Qué se aprende con ' . $t . '?', 'What do kids learn with ' . $t . '?'), f($s, 'name') . ': ' . f($g, 'desc')],
    [T('¿Es gratis?', 'Is it free?'), T('Sí. Es gratis, sin anuncios ni compras, y no hace falta registrarse: se juega en el navegador del móvil, la tablet o el ordenador.', 'Yes. It is free, with no ads or purchases, and no sign-up: play in the browser on a phone, tablet or computer.')],
    [T('¿En qué idiomas está?', 'Which languages is it in?'), langs_label($g) . '.'],
  ];
  ob_start(); ?>
  <?= crumbs_html($crumbs) ?>
  <article>
  <div class="hero">
    <div class="big" aria-hidden="true" style="background:linear-gradient(135deg,<?= h($g['bg1']) ?>,<?= h($g['bg2']) ?>)"><?= h($g['emoji']) ?></div>
    <div>
      <h1><?= h($t) ?></h1>
      <p class="lead"><?= h(f($g, 'desc')) ?></p>
      <div class="btns"><a class="btn pri" href="<?= h(url(play_path($g))) ?>">▶ <?= h(T('Jugar gratis', 'Play for free')) ?></a></div>
    </div>
  </div>
  <section class="box" style="margin-top:22px">
    <h2 style="margin-top:0"><?= h(T('Ficha del juego', 'Game details')) ?></h2>
    <dl class="facts">
      <dt><?= h(T('Asignatura', 'Subject')) ?></dt><dd><a href="<?= h(url(subj_path($s))) ?>"><?= h($s['emoji'] . ' ' . f($s, 'name')) ?></a></dd>
      <dt><?= h(T('Edad', 'Age')) ?></dt><dd><?= h(ages_label($g)) ?> · <?= implode(' · ', $bands) ?></dd>
      <dt><?= h(T('Forma parte de', 'Part of')) ?></dt><dd><?= h($g['app']) ?></dd>
      <dt><?= h(T('Niveles', 'Levels')) ?></dt><dd><?= h($g['levels'] === 'infinite' ? T('Infinitos, la dificultad sube poco a poco', 'Endless, difficulty rises gradually') : T('Por niveles', 'Level-based')) ?></dd>
      <dt><?= h(T('Idiomas', 'Languages')) ?></dt><dd><?= h(langs_label($g)) ?></dd>
      <dt><?= h(T('Plataformas', 'Platforms')) ?></dt><dd><?= h(T('Navegador (móvil, tablet, PC)', 'Browser (phone, tablet, PC)')) ?></dd>
      <dt><?= h(T('Precio', 'Price')) ?></dt><dd><?= h(T('Gratis, sin anuncios', 'Free, no ads')) ?></dd>
      <?= played_rows($g) ?>
    </dl>
  </section>
  </article>
  <h2><?= h(T('Preguntas frecuentes', 'FAQ')) ?></h2>
  <?php foreach ($faq as $qa): ?><details class="faq"><summary><?= h($qa[0]) ?></summary><p><?= h($qa[1]) ?></p></details><?php endforeach; ?>
  <?php if ($related): ?><h2><?= h(T('Más juegos de ', 'More ') . mb_strtolower(f($s, 'name'), 'UTF-8') . T('', ' games')) ?></h2><?= grid($related) ?><?php endif; ?>
  <?php $body = ob_get_clean();
  $title = T($t . ': juego educativo de ' . mb_strtolower(f($s, 'name'), 'UTF-8') . ' (' . ages_label($g) . ')', $t . ': educational ' . f($s, 'name') . ' game (' . ages_label($g) . ')') . ' · ' . $SITE;
  $desc = f($g, 'desc') . ' ' . T('Juego educativo gratis para niños de ' . $g['age_min'] . ' a ' . $g['age_max'] . ' años.', 'Free educational game for kids aged ' . $g['age_min'] . ' to ' . $g['age_max'] . '.');
  render(['path' => $p, 'title' => $title, 'ogtitle' => $t . ' · ' . $SITE, 'desc' => $desc, 'alt' => [game_path($g, 'es'), game_path($g, 'en')], 'body' => $body, 'theme' => $g['color'],
    'icon' => icon_url($g), 'ld' => [page_ld('ItemPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#game'], 'primaryImageOfPage' => abs_url('/icono/' . $g['id'] . '.svg')]),
      crumbs_ld($crumbs), edu_ld($g), faq_ld($faq, $p)]]);
}

function page_game(array $g): void {
  global $COLS, $CATS, $CTRLS, $GAMES, $SITE, $L;
  if (is_edu($g)) { page_game_edu($g); return; }
  $c = $CATS[$g['category_id']]; $col = $COLS[$g['collection_id']]; $ct = $CTRLS[$g['control_id']];
  $p = game_path($g); $t = f($g, 'title');
  $crumbs = [[T('Inicio', 'Home'), home_path()], [f($col, 'name'), col_path($col)], [f($c, 'name'), cat_path($c)], [$t, $p]];
  $related = array_values(array_filter($GAMES, function ($x) use ($g) { return $x['category_id'] === $g['category_id'] && $x['id'] !== $g['id'] && !is_edu($x); }));
  usort($related, function ($a, $b) use ($g) { return ($a['collection_id'] === $g['collection_id'] ? 0 : 1) - ($b['collection_id'] === $g['collection_id'] ? 0 : 1) ?: $a['sort'] - $b['sort']; });
  $related = array_slice($related, 0, 6);
  $ids = array_keys(array_filter($GAMES, function ($x) { return !is_edu($x); })); $i = array_search($g['id'], $ids, true);
  $prev = $i > 0 ? $GAMES[$ids[$i - 1]] : null; $next = $i < count($ids) - 1 ? $GAMES[$ids[$i + 1]] : null;
  $based = based_text($g);
  $lives = (int)$g['lives'] === 0 ? T('Sin vidas: puedes reintentar siempre', 'No lives: retry as often as you like') : $g['lives'];
  $faq = [
    [T('¿Cómo se juega a ' . $t . '?', 'How do you play ' . $t . '?'), plain(f($g, 'help'))],
    [T('¿' . $t . ' es gratis?', 'Is ' . $t . ' free?'), T('Sí. Es gratis, no tiene anuncios ni compras y no hace falta registrarse ni descargar nada: se juega en el navegador.', 'Yes. It is free, with no ads or purchases, and you do not need to sign up or download anything: it runs in your browser.')],
    [T('¿Se puede jugar sin conexión?', 'Can I play offline?'), T('Necesita conexión para cargarse; una vez abierto, la partida sigue aunque se corte internet.', 'It needs a connection to load; once open, the game keeps running even if the connection drops.')],
    [T('¿Se puede jugar en la tele con el mando?', 'Can I play it on a TV with the remote?'), $g['tv'] ? T('Sí, en Android TV, Google TV o Fire TV. ', 'Yes, on Android TV, Google TV or Fire TV. ') . plain(f($g, 'tvhelp')) . T(' Pueden jugar hasta 4 personas por turnos.', ' Up to 4 people can play taking turns.') : T('No: este juego necesita pantalla táctil.', 'No: this game needs a touch screen.')],
  ];
  if ($based) $faq[] = [T('¿En qué juego se inspira ' . $t . '?', 'What game is ' . $t . ' inspired by?'), T('Recrea la mecánica de ', 'It recreates the mechanics of ') . $based . T(', con gráficos de emojis, hasta 120 niveles con modos fácil, normal y difícil y controles táctiles.', ', with emoji graphics, up to 120 levels with easy, normal and hard modes and touch controls.')];
  ob_start(); ?>
  <?= crumbs_html($crumbs) ?>
  <article>
  <div class="hero">
    <div class="big" aria-hidden="true" style="background:linear-gradient(135deg,<?= h($g['bg1'] ?: $g['color']) ?>,<?= h($g['bg2'] ?: '#111') ?>)"><?= h($g['emoji']) ?></div>
    <div>
      <h1><?= h($t) ?></h1>
      <p class="lead" style="margin-bottom:4px"><strong><?= h(f($g, 'tag')) ?></strong></p>
      <p class="lead"><?= h(f($g, 'desc')) ?></p>
      <div class="btns">
        <a class="btn pri" href="<?= h(url(play_path($g))) ?>">▶ <?= h(T('Jugar gratis', 'Play for free')) ?></a>
        <?php if ($g['tv']): ?><a class="btn" href="<?= h(game_file_url($g, true)) ?>">📺 <?= h(T('Modo TV', 'TV mode')) ?></a><?php endif; ?>
      </div>
    </div>
  </div>
  <div class="two" style="margin-top:22px">
    <section class="box how">
      <h2 style="margin-top:0"><?= h(T('Cómo se juega', 'How to play')) ?></h2>
      <p><?= safe_help(f($g, 'help')) ?></p>
      <?php if ($g['tv'] && f($g, 'tvhelp')): ?><h3><?= h(T('Con el mando de la tele', 'With the TV remote')) ?></h3><p>🎮 <?= h(plain(f($g, 'tvhelp'))) ?></p><?php endif; ?>
    </section>
    <section class="box">
      <h2 style="margin-top:0"><?= h(T('Ficha del juego', 'Game details')) ?></h2>
      <dl class="facts">
        <dt><?= h(T('Colección', 'Collection')) ?></dt><dd><a href="<?= h(url(col_path($col))) ?>"><?= h(f($col, 'name')) ?></a></dd>
        <dt><?= h(T('Categoría', 'Category')) ?></dt><dd><a href="<?= h(url(cat_path($c))) ?>"><?= h($c['emoji'] . ' ' . f($c, 'name')) ?></a></dd>
        <dt><?= h(T('Control', 'Controls')) ?></dt><dd><a href="<?= h(url(ctrl_path($ct))) ?>"><?= h(f($ct, 'name')) ?></a></dd>
        <dt><?= h(T('Niveles', 'Levels')) ?></dt><dd><?= h(levels_label($g)) ?></dd>
        <dt><?= h(T('Vidas', 'Lives')) ?></dt><dd><?= h((string)$lives) ?></dd>
        <dt><?= h(T('Mando de TV', 'TV remote')) ?></dt><dd><?= h(tv_label($g['tv'])) ?></dd>
        <dt><?= h(T('Jugadores', 'Players')) ?></dt><dd><?= h($g['tv'] ? T('1 (táctil) · 1–4 por turnos (TV)', '1 (touch) · 1–4 taking turns (TV)') : '1') ?></dd>
        <dt><?= h(T('Idiomas', 'Languages')) ?></dt><dd><?= h(T('Español, inglés', 'Spanish, English')) ?></dd>
        <dt><?= h(T('Plataformas', 'Platforms')) ?></dt><dd><?= h(T('Navegador (móvil, tablet, PC)', 'Browser (phone, tablet, PC)') . ($g['tv'] ? ', Android TV, Fire TV' : '')) ?></dd>
        <dt><?= h(T('Precio', 'Price')) ?></dt><dd><?= h(T('Gratis, sin anuncios', 'Free, no ads')) ?></dd>
        <?= played_rows($g) ?>
        <?php if ($based): ?><dt><?= h(T('Inspirado en', 'Inspired by')) ?></dt><dd><?= h($based) ?></dd><?php endif; ?>
      </dl>
    </section>
  </div>
  </article>
  <h2><?= h(T('Preguntas frecuentes', 'FAQ')) ?></h2>
  <?php foreach ($faq as $qa): ?><details class="faq"><summary><?= h($qa[0]) ?></summary><p><?= h($qa[1]) ?></p></details><?php endforeach; ?>
  <?php if ($related): ?><h2><?= h(T('Más juegos de ', 'More ') . mb_strtolower(f($c, 'name'), 'UTF-8') . T('', ' games')) ?></h2><?= grid($related) ?><?php endif; ?>
  <nav class="pager" aria-label="<?= h(T('Otros juegos', 'Other games')) ?>">
    <?php if ($prev): ?><a class="btn" rel="prev" href="<?= h(url(game_path($prev))) ?>">← <?= h($prev['emoji'] . ' ' . f($prev, 'title')) ?></a><?php else: ?><span></span><?php endif; ?>
    <?php if ($next): ?><a class="btn" rel="next" href="<?= h(url(game_path($next))) ?>"><?= h($next['emoji'] . ' ' . f($next, 'title')) ?> →</a><?php endif; ?>
  </nav>
  <?php $body = ob_get_clean();
  $title = T($t . ': juego gratis online', $t . ': free online game') . ' (' . ($based ? cut($g['based'][0]['name'], 30) . ', ' : '') . T('móvil y TV', 'phone & TV') . ') · ' . $SITE;
  $desc = f($g, 'desc') . ' ' . T('Gratis, sin anuncios y sin conexión.', 'Free, no ads, works offline.') . ($based ? ' ' . T('Inspirado en ', 'Inspired by ') . $g['based'][0]['name'] . '.' : '');
  render(['path' => $p, 'title' => $title, 'ogtitle' => $t . ' · ' . $SITE, 'desc' => $desc, 'alt' => [game_path($g, 'es'), game_path($g, 'en')], 'body' => $body, 'theme' => $g['theme_color'] ?: $g['color'],
    'icon' => icon_url($g), 'ogtype' => 'website',
    'ld' => [page_ld('ItemPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#game'], 'primaryImageOfPage' => abs_url('/icono/' . $g['id'] . '.svg')]),
      crumbs_ld($crumbs), game_ld($g), faq_ld($faq, $p)]]);
}

/* el juego en /{id}: el HTML de pwa/ con <base href="/pwa/"> y window.ARCADE_SITE (portada, idioma, API de tiempo) */
function serve_game(array $g, ?string $force): void {
  global $SITE;
  $html = @file_get_contents(__DIR__ . '/pwa/' . $g['file']);
  if ($html === false) { page_404(); return; }
  $p = '/' . $g['id'] . ($force ? '/' . $force : '');
  $lang = $force ?: 'es';
  $site = ['id' => $g['id'], 'lang' => $force, 'play' => url('/' . $g['id']), 'api' => url('/api/play'), 'fav' => url('/api/fav'),
    'home' => ['es' => url('/'), 'en' => url('/en/')], 'tv' => ['es' => url('/tv'), 'en' => url('/en/tv')]];
  $title = ($lang === 'en' ? $g['title_en'] : $g['title_es']) . ' · ' . $SITE;
  $desc = cut(($lang === 'en' ? $g['desc_en'] : $g['desc_es']), 160);
  $head = '<base href="' . h(url('/pwa/')) . '">'
    . '<link rel="canonical" href="' . h(abs_url($p)) . '">'
    . '<link rel="alternate" hreflang="es" href="' . h(abs_url('/' . $g['id'] . '/es')) . '">'
    . '<link rel="alternate" hreflang="en" href="' . h(abs_url('/' . $g['id'] . '/en')) . '">'
    . '<link rel="alternate" hreflang="x-default" href="' . h(abs_url('/' . $g['id'])) . '">'
    . '<meta name="description" content="' . h($desc) . '">'
    . '<meta property="og:title" content="' . h($title) . '"><meta property="og:description" content="' . h($desc) . '">'
    . '<meta property="og:url" content="' . h(abs_url($p)) . '"><meta property="og:image" content="' . h(abs_url('/pwa/icons/icon-512.png')) . '">'
    . '<script>window.ARCADE_SITE=' . json_encode($site, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ';</script>';
  $html = preg_replace('/<head>/i', '<head>' . "\n" . $head, $html, 1);
  $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . h($title) . '</title>', $html, 1);
  if ($force) $html = preg_replace('/<html lang="[a-z]+"/i', '<html lang="' . $force . '"', $html, 1);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-cache');
  echo $html;
  exit;
}

/* juego de una petición de la API: id propio o 'brain:<minijuego>' de Emoji Brain Academy */
function api_game(string $gid): ?array {
  global $GAMES;
  if (strncmp($gid, 'brain:', 6) === 0) {
    $b = substr($gid, 6);
    if (preg_match('/^[a-z0-9]+$/', $b)) foreach ($GAMES as $x) if (is_edu($x) && strpos((string)$x['url'], 'juego=' . $b . '&') !== false) return $x;
    return null;
  }
  return $GAMES[$gid] ?? null;
}
function api_fav(): void {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  $fail = function (int $c) { http_response_code($c); echo '{"ok":false}'; exit; };
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') $fail(405);
  $d = json_decode((string)file_get_contents('php://input', false, null, 0, 1000), true);
  if (!is_array($d)) $d = $_POST;
  $u = (string)($d['u'] ?? ''); $g = api_game((string)($d['g'] ?? ''));
  if (!preg_match('/^[a-f0-9]{24}$/', $u)) $fail(400);
  if (!$g) $fail(404);
  $db = stats_db(true);
  if (!$db) $fail(503);
  try {
    if (!empty($d['on'])) $db->prepare('INSERT OR IGNORE INTO fav (uid, game_id, at) VALUES (?, ?, ?)')->execute([$u, $g['id'], gmdate('Y-m-d H:i:s')]);
    else $db->prepare('DELETE FROM fav WHERE uid = ? AND game_id = ?')->execute([$u, $g['id']]);
  } catch (Throwable $e) { $fail(503); }
  echo '{"ok":true}';
  exit;
}

function api_play(): void {
  global $GAMES;
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  $fail = function (int $c) { http_response_code($c); echo '{"ok":false}'; exit; };
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') $fail(405);
  $d = json_decode((string)file_get_contents('php://input', false, null, 0, 2000), true);
  if (!is_array($d)) $d = $_POST;
  $gid = (string)($d['g'] ?? ''); $s = (int)($d['s'] ?? 0); $p = (int)($d['p'] ?? 0); $u = (string)($d['u'] ?? '');
  if (!preg_match('/^[a-f0-9]{24}$/', $u) || $s < 0 || $s > 900 || $p < 0 || $p > 50 || ($s === 0 && $p === 0)) $fail(400);
  $g = api_game($gid);
  if (!$g) $fail(404);
  $db = stats_db(true);
  if (!$db) $fail(503);
  try {
    $now = gmdate('Y-m-d H:i:s');
    $db->prepare('INSERT INTO play (uid, game_id, seconds, plays, first_at, last_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid, game_id) DO UPDATE SET seconds = seconds + excluded.seconds, plays = plays + excluded.plays, last_at = excluded.last_at')
      ->execute([$u, $g['id'], $s, $p, $now, $now]);
  } catch (Throwable $e) { $fail(503); }
  echo '{"ok":true}';
  exit;
}

function page_404(): void {
  global $SITE;
  ob_start(); ?>
  <h1>👾 <?= h(T('Página no encontrada', 'Page not found')) ?></h1>
  <p class="lead"><?= h(T('Este nivel no existe. Vuelve a la portada o busca un juego.', 'This level does not exist. Go back home or search for a game.')) ?></p>
  <div class="btns"><a class="btn pri" href="<?= h(home_url()) ?>">🏠 <?= h(T('Portada', 'Home')) ?></a><a class="btn" href="<?= h(url(list_path('games'))) ?>"><?= h(T('Todos los juegos', 'All games')) ?></a></div>
  <?php $body = ob_get_clean();
  render(['status' => 404, 'path' => home_path(), 'title' => T('No encontrado', 'Not found') . ' · ' . $SITE, 'desc' => T('Página no encontrada.', 'Page not found.'), 'noindex' => true, 'body' => $body]);
}

function out_svg(array $g): void {
  header('Content-Type: image/svg+xml; charset=utf-8');
  header('Cache-Control: public, max-age=604800');
  $a = h($g['bg1'] ?: $g['color']); $b = h($g['bg2'] ?: '#111111');
  echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' . $a . '"/><stop offset="1" stop-color="' . $b . '"/></linearGradient></defs>'
    . '<rect width="512" height="512" rx="112" fill="url(#g)"/><text x="256" y="300" font-size="300" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">' . h($g['emoji']) . '</text>'
    . '<title>' . h($g['title_es']) . '</title></svg>';
  exit;
}

function out_sitemap(): void {
  global $GAMES, $CATS, $COLS, $CTRLS, $LASTMOD, $SUBJS, $AGES;
  header('Content-Type: application/xml; charset=utf-8');
  $pairs = [['/', '/en/', '1.0'], [list_path('games', 'es'), list_path('games', 'en'), '0.7'], [list_path('tv', 'es'), list_path('tv', 'en'), '0.7']];
  foreach ($COLS as $c) $pairs[] = [col_path($c, 'es'), col_path($c, 'en'), '0.9'];
  foreach ($CATS as $c) $pairs[] = [cat_path($c, 'es'), cat_path($c, 'en'), '0.8'];
  foreach ($CTRLS as $c) $pairs[] = [ctrl_path($c, 'es'), ctrl_path($c, 'en'), '0.5'];
  foreach ($SUBJS as $c) $pairs[] = [subj_path($c, 'es'), subj_path($c, 'en'), '0.8'];
  foreach ($AGES as $c) $pairs[] = [age_path($c, 'es'), age_path($c, 'en'), '0.7'];
  foreach ($GAMES as $g) $pairs[] = [game_path($g, 'es'), game_path($g, 'en'), '0.8'];
  foreach ($GAMES as $g) if (!is_edu($g)) $pairs[] = ['/' . $g['id'] . '/es', '/' . $g['id'] . '/en', '0.7'];
  echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
  foreach ($pairs as [$es, $en, $pr]) foreach ([$es, $en] as $u) {
    echo '<url><loc>' . h(abs_url($u)) . '</loc><lastmod>' . h($LASTMOD) . '</lastmod><priority>' . $pr . '</priority>'
      . '<xhtml:link rel="alternate" hreflang="es" href="' . h(abs_url($es)) . '"/><xhtml:link rel="alternate" hreflang="en" href="' . h(abs_url($en)) . '"/><xhtml:link rel="alternate" hreflang="x-default" href="' . h(abs_url($es)) . '"/></url>' . "\n";
  }
  echo '</urlset>';
  exit;
}

function out_robots(): void {
  header('Content-Type: text/plain; charset=utf-8');
  echo "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /buscar\nDisallow: /en/search\nDisallow: /data/\nDisallow: /herramientas/\n\nSitemap: " . abs_url('/sitemap.xml') . "\n";
  exit;
}

/* ---------- router ---------- */
$r = $L === 'en' ? substr($path, 3) : $path;   // ruta sin el prefijo /en
if ($r === '') $r = '/';
$seg = array_values(array_filter(explode('/', $r), 'strlen'));
$k = $seg[0] ?? '';
$arg = $seg[1] ?? null;
$EN = $L === 'en';

if ($path === '/api/play') api_play();
if ($path === '/api/fav') api_fav();
if ($L === 'es' && $path === '/sitemap.xml') out_sitemap();
if ($L === 'es' && $path === '/robots.txt') out_robots();
if ($L === 'es' && $k === 'icono' && $arg && count($seg) === 2 && preg_match('/^([a-z0-9-]+)\.svg$/', $arg, $m) && isset($GAMES[$m[1]])) out_svg($GAMES[$m[1]]);

if ($r === '/' && count($seg) === 0) { page_home(); exit; }
if (count($seg) === 1 && $k === ($EN ? 'games' : 'juegos')) { page_all(); exit; }
if (count($seg) === 1 && $k === 'tv') { page_tv(); exit; }
if (count($seg) === 1 && $k === ($EN ? 'search' : 'buscar')) { page_search(); exit; }
if (count($seg) === 2) {
  if ($k === ($EN ? 'game' : 'juego')) { $g = $EN ? find_by($GAMES, 'slug_en', $arg) : ($GAMES[$arg] ?? null); if ($g) { page_game($g); exit; } }
  if ($k === ($EN ? 'play' : 'jugar')) { $g = $EN ? find_by($GAMES, 'slug_en', $arg) : ($GAMES[$arg] ?? null); if ($g) redirect(url(play_path($g)) . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '')); }
  if ($k === ($EN ? 'category' : 'categoria')) { $c = find_by($CATS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_category($c); exit; } }
  if ($k === ($EN ? 'collection' : 'coleccion')) { $c = find_by($COLS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_collection($c); exit; } }
  if ($k === ($EN ? 'subject' : 'asignatura')) { $c = find_by($SUBJS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_subject($c); exit; } }
  if ($k === ($EN ? 'age' : 'edad')) { $c = find_by($AGES, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_age($c); exit; } }
  if ($k === 'control') { $c = find_by($CTRLS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_control($c); exit; } }
  // URL del otro idioma con el prefijo equivocado → redirige a la buena
  if (!$EN && $k === 'game' && ($g = find_by($GAMES, 'slug_en', $arg))) redirect(url(game_path($g, 'en')));
  if ($EN && $k === 'juego' && isset($GAMES[$arg])) redirect(url(game_path($GAMES[$arg], 'en')));
}
// el juego: /{id} (idioma automático) o /{id}/es|en (forzado). Los educativos se sirven desde su carpeta.
if (!$EN && (count($seg) === 1 || (count($seg) === 2 && ($arg === 'es' || $arg === 'en'))) && isset($GAMES[$k])) {
  $g = $GAMES[$k];
  if (is_edu($g)) serve_edu($g, $arg);
  serve_game($g, $arg);
}
// URLs antiguas: /pwa/lazo.html?lang=en&tv=1 → /lazo/en?tv=1 · /lazo.html → /lazo
$old = null;
if (count($seg) === 2 && $k === 'pwa' && preg_match('/^([a-z0-9]+)(\.html)?$/', $arg, $m)) $old = $m[1];
if (count($seg) === 1 && preg_match('/^([a-z0-9]+)\.html$/', $k, $m)) $old = $m[1];
if ($old !== null && isset($GAMES[$old]) && !is_edu($GAMES[$old])) {
  parse_str((string)($_SERVER['QUERY_STRING'] ?? ''), $q);
  $lg = in_array($q['lang'] ?? '', ['es', 'en'], true) ? $q['lang'] : null; unset($q['lang']);
  redirect(url('/' . $old . ($lg ? '/' . $lg : '')) . ($q ? '?' . http_build_query($q) : ''));
}
page_404();
