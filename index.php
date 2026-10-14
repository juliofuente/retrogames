<?php
/* Arcade Perdido · web SEO (PHP + SQLite, sin dependencias externas)
   ─────────────────────────────────────────────────────────────────────────────
   Rutas (español sin prefijo · inglés bajo /en/):
     /                         /en/                        portada
     /juegos                   /en/games                   todos los juegos (A–Z)
     /juego/{id}               /en/game/{slug}             ficha de un juego
     /jugar/{id}               /en/play/{slug}             redirige al juego (pwa/{id}.html)
     /coleccion/{slug}         /en/collection/{slug}       colección (Arcade Perdido / Arcade Pro)
     /categoria/{slug}         /en/category/{slug}         categoría
     /control/{slug}           /en/control/{slug}          juegos por tipo de control
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
$GAMES = []; foreach ($db->query('SELECT * FROM games ORDER BY sort') as $r) { $r['based'] = []; $GAMES[$r['id']] = $r; }
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
function play_path(array $g, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/play/' . $g['slug_en'] : '/jugar/' . $g['id']; }
function cat_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/category/' . $c['slug_en'] : '/categoria/' . $c['slug_es']; }
function col_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/collection/' . $c['slug_en'] : '/coleccion/' . $c['slug_es']; }
function ctrl_path(array $c, ?string $lang = null): string { global $L; return ($lang ?? $L) === 'en' ? '/en/control/' . $c['slug_en'] : '/control/' . $c['slug_es']; }
function list_path(string $k, ?string $lang = null): string {
  global $L; $en = ($lang ?? $L) === 'en';
  $m = ['games' => ['/juegos', '/en/games'], 'tv' => ['/tv', '/en/tv'], 'search' => ['/buscar', '/en/search']];
  return $m[$k][$en ? 1 : 0];
}
function game_file_url(array $g, bool $tv = false): string { global $L; return url('/pwa/' . $g['file']) . '?lang=' . $L . ($tv ? '&tv=1' : ''); }
function icon_url(array $g): string { return url('/icono/' . $g['id'] . '.svg'); }
function safe_help(?string $html): string { return strip_tags((string)$html, '<b><strong><i><em><br>'); }
function plain(?string $html): string { return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string)$html), ENT_QUOTES, 'UTF-8'))); }
function cut(string $s, int $n): string { if (mb_strlen($s) <= $n) return $s; $s = mb_substr($s, 0, $n - 1); $p = mb_strrpos($s, ' '); return ($p > $n * 0.6 ? mb_substr($s, 0, $p) : $s) . '…'; }
function find_by(array $arr, string $field, string $val): ?array { foreach ($arr as $r) if ((string)$r[$field] === $val) return $r; return null; }
function tv_label(?string $tv): string { return $tv === 'cursor' ? T('Sí, con cursor (cruceta + OK)', 'Yes, with a cursor (D-pad + OK)') : ($tv === 'cruceta' ? T('Sí, con la cruceta', 'Yes, with the D-pad') : T('No (necesita pantalla táctil)', 'No (needs a touch screen)')); }
function levels_label(array $g): string {
  if ($g['levels'] === 'infinite') return T('Infinitos, con dificultad creciente', 'Endless, with rising difficulty');
  if ($g['levels'] === 'endless') return T('Partida sin fin (récord)', 'Endless run (high score)');
  return $g['levels'];
}
function based_text(array $g): string {
  $o = [];
  foreach ($g['based'] as $b) $o[] = $b['name'] . ($b['publisher'] || $b['year'] ? ' (' . trim(($b['publisher'] ?? '') . ($b['publisher'] && $b['year'] ? ', ' : '') . ($b['year'] ?? '')) . ')' : '');
  return implode(' · ', $o);
}

/* ---------- JSON-LD ---------- */
function org_ld(): array {
  global $SITE;
  return ['@type' => 'Organization', '@id' => abs_url('/#org'), 'name' => $SITE, 'url' => abs_url('/'), 'logo' => ['@type' => 'ImageObject', 'url' => abs_url('/pwa/icons/icon-512.png'), 'width' => 512, 'height' => 512]];
}
function website_ld(): array {
  global $SITE, $L;
  return ['@type' => 'WebSite', '@id' => abs_url('/#website'), 'name' => $SITE, 'url' => abs_url('/'), 'inLanguage' => ['es', 'en'], 'publisher' => ['@id' => abs_url('/#org')],
    'description' => T('Juegos HTML5 gratis para móvil y TV: mecánicas de arcade clásicas y éxitos de móvil, rehechos con emojis.', 'Free HTML5 games for phone and TV: classic arcade mechanics and mobile hits, remade with emojis.'),
    'potentialAction' => ['@type' => 'SearchAction', 'target' => ['@type' => 'EntryPoint', 'urlTemplate' => abs_url(list_path('search')) . '?q={search_term_string}'], 'query-input' => 'required name=search_term_string']];
}
function app_ld(): array {
  global $SITE, $VERSION, $GAMES;
  return ['@type' => ['MobileApplication', 'WebApplication'], '@id' => abs_url('/#app'), 'name' => $SITE, 'url' => abs_url('/pwa/index.html'), 'installUrl' => abs_url('/pwa/index.html'),
    'applicationCategory' => 'GameApplication', 'applicationSubCategory' => T('Recopilatorio de juegos arcade', 'Arcade game collection'),
    'operatingSystem' => 'Android, iOS, Windows, macOS, Linux, Android TV, Fire TV', 'browserRequirements' => T('Requiere un navegador moderno con JavaScript', 'Requires a modern browser with JavaScript'),
    'softwareVersion' => $VERSION, 'inLanguage' => ['es', 'en'], 'isAccessibleForFree' => true, 'image' => abs_url('/pwa/icons/icon-512.png'),
    'description' => T('PWA instalable y sin conexión con ' . count($GAMES) . ' juegos táctiles y para mando de TV.', 'Installable offline PWA with ' . count($GAMES) . ' touch and TV-remote games.'),
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
function faq_ld(array $qa, string $p): array {
  return ['@type' => 'FAQPage', '@id' => abs_url($p) . '#faq', 'mainEntity' => array_map(function ($x) { return ['@type' => 'Question', 'name' => $x[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $x[1]]]; }, $qa)];
}

/* ---------- plantilla ---------- */
function card(array $g): string {
  global $CTRLS;
  $c = $CTRLS[$g['control_id']];
  return '<li><a class="card" href="' . h(url(game_path($g))) . '" style="--c:' . h($g['color']) . '">'
    . '<span class="ic" aria-hidden="true" style="background:linear-gradient(135deg,' . h($g['bg1'] ?: $g['color']) . ',' . h($g['bg2'] ?: '#111') . ')">' . h($g['emoji']) . '</span>'
    . '<span class="tx"><b>' . h(f($g, 'title')) . '</b><span class="tg">' . h(f($g, 'tag')) . '</span>'
    . '<span class="ch"><span>' . h(f($c, 'name')) . '</span>' . ($g['tv'] ? '<span title="' . h(T('Se puede jugar con mando', 'Playable with a remote')) . '">📺</span>' : '') . '</span></span></a></li>';
}
function grid(array $games): string { return '<ul class="grid">' . implode('', array_map('card', $games)) . '</ul>'; }
function crumbs_html(array $items): string {
  $o = []; $n = count($items);
  foreach ($items as $i => [$name, $p]) $o[] = $i < $n - 1 ? '<a href="' . h(url($p)) . '">' . h($name) . '</a>' : '<span aria-current="page">' . h($name) . '</span>';
  return '<nav class="crumbs" aria-label="' . h(T('Migas de pan', 'Breadcrumb')) . '">' . implode(' <span aria-hidden="true">›</span> ', $o) . '</nav>';
}

function render(array $o): void {
  global $L, $SITE, $CATS, $COLS, $CTRLS, $GAMES, $VERSION;
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
.ic{flex:none;width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.tx{display:flex;flex-direction:column;min-width:0}.tx b{font-size:17px}
.tg{color:var(--mu);font-size:13.5px;line-height:1.35}
.ch{display:flex;gap:6px;margin-top:4px;font-size:12px}.ch span{background:rgba(255,255,255,.08);border-radius:999px;padding:1px 8px}
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
    <?php foreach ($CTRLS as $c): ?><a href="<?= h(url(ctrl_path($c))) ?>"><?= h(T('Control: ', 'Control: ') . f($c, 'name')) ?></a><?php endforeach; ?>
  </div>
  <p><?= h($SITE) ?> · <?= count($GAMES) ?> <?= h(T('juegos gratis, sin anuncios y sin conexión', 'free games, no ads, works offline')) ?> · v<?= h($VERSION) ?> · <a href="<?= h(url('/sitemap.xml')) ?>">Sitemap</a></p>
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
  $new = array_values(array_filter($GAMES, function ($g) { return $g['added_version'] !== null; }));
  ob_start(); ?>
  <h1><?= h(T('Juegos arcade gratis para móvil y TV', 'Free arcade games for phone and TV')) ?></h1>
  <p class="lead"><?= h(T(count($GAMES) . ' juegos HTML5 hechos con emojis: mecánicas de recreativa olvidadas y los grandes éxitos de móvil. Sin anuncios, sin descargas, con niveles infinitos y funcionan sin conexión. Se juegan con el dedo o con el mando de la tele.', count($GAMES) . ' HTML5 games made with emojis: forgotten arcade mechanics and the big mobile hits. No ads, no downloads, endless levels and they work offline. Play with your finger or with the TV remote.')) ?></p>
  <h2><?= h(T('Colecciones', 'Collections')) ?></h2>
  <div class="cols">
    <?php foreach ($COLS as $c): ?>
    <a class="col" href="<?= h(url(col_path($c))) ?>"><div class="e" aria-hidden="true"><?= $c['id'] === 'pro' ? '✨' : '🕹️' ?></div><h3><?= h(f($c, 'name')) ?></h3><p><?= h(f($c, 'desc')) ?></p><b><?= count($byCol[$c['id']] ?? []) ?> <?= h(T('juegos', 'games')) ?> ▶</b></a>
    <?php endforeach; ?>
    <a class="col" href="<?= h(url(list_path('tv'))) ?>"><div class="e" aria-hidden="true">📺</div><h3><?= h(T('Para la tele', 'For your TV')) ?></h3><p><?= h(T('Android TV y Fire TV: juega con el mando, hasta 4 jugadores por turnos.', 'Android TV and Fire TV: play with the remote, up to 4 players taking turns.')) ?></p><b><?= count(array_filter($GAMES, function ($g) { return (bool)$g['tv']; })) ?> <?= h(T('juegos', 'games')) ?> ▶</b></a>
  </div>
  <h2><?= h(T('Categorías', 'Categories')) ?></h2>
  <ul class="tiles">
    <?php foreach ($CATS as $c): ?><li><a class="tile" href="<?= h(url(cat_path($c))) ?>"><span class="e" aria-hidden="true"><?= h($c['emoji']) ?></span><span><b><?= h(f($c, 'name')) ?></b><small><?= count($byCat[$c['id']] ?? []) ?> <?= h(T('juegos', 'games')) ?></small></span></a></li><?php endforeach; ?>
  </ul>
  <?php if ($new): ?><h2><?= h(T('Novedades', 'New games')) ?></h2><?= grid($new) ?><?php endif; ?>
  <?php foreach ($CATS as $c): if (empty($byCat[$c['id']])) continue; ?>
    <h2><a href="<?= h(url(cat_path($c))) ?>" style="text-decoration:none"><?= h($c['emoji'] . ' ' . f($c, 'name')) ?></a></h2>
    <?= grid(array_slice($byCat[$c['id']], 0, 6)) ?>
    <?php if (count($byCat[$c['id']]) > 6): ?><p><a href="<?= h(url(cat_path($c))) ?>"><?= h(T('Ver los ' . count($byCat[$c['id']]) . ' juegos de ' . mb_strtolower(f($c, 'name')), 'See all ' . count($byCat[$c['id']]) . ' ' . mb_strtolower(f($c, 'name')) . ' games')) ?> →</a></p><?php endif; ?>
  <?php endforeach; ?>
  <?php $body = ob_get_clean();
  $title = T('Arcade Perdido · ' . count($GAMES) . ' juegos arcade gratis para móvil y TV', 'Arcade Perdido · ' . count($GAMES) . ' free arcade games for phone and TV');
  $desc = T('Juega gratis y sin anuncios a ' . count($GAMES) . ' juegos HTML5 con emojis: puzles, arcade, un toque, física y estrategia. Para móvil, PC y Android TV, también sin conexión.', 'Play ' . count($GAMES) . ' free, ad-free HTML5 emoji games: puzzles, arcade, one-tap, physics and strategy. For phone, PC and Android TV, even offline.');
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => ['/', '/en/'], 'body' => $body,
    'ld' => [app_ld(), page_ld('CollectionPage', $p, $title, $desc, ['about' => ['@id' => abs_url('/#app')], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), itemlist_ld($p, T('Todos los juegos', 'All games'), array_values($GAMES))]]);
}

function page_list(string $p, array $alt, string $h1, string $lead, array $games, array $crumbs, string $title, string $desc, array $extraBody = []): void {
  ob_start(); ?>
  <?= crumbs_html($crumbs) ?>
  <h1><?= h($h1) ?></h1>
  <p class="lead"><?= h($lead) ?></p>
  <?= $extraBody['before'] ?? '' ?>
  <?= grid($games) ?>
  <?= $extraBody['after'] ?? '' ?>
  <?php $body = ob_get_clean();
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => $alt, 'body' => $body,
    'ld' => [page_ld('CollectionPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), crumbs_ld($crumbs), itemlist_ld($p, $h1, $games)]]);
}

function page_collection(array $c): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['collection_id'] === $c['id']; }));
  $p = col_path($c); $n = f($c, 'name');
  $play = '<div class="btns" style="margin-bottom:18px"><a class="btn pri" href="' . h(url('/pwa/' . $c['index_file'])) . '?lang=' . T('es', 'en') . '">▶ ' . h(T('Abrir la app de ' . $n, 'Open the ' . $n . ' app')) . '</a></div>';
  page_list($p, [col_path($c, 'es'), col_path($c, 'en')], $n, f($c, 'desc'), $games, [[T('Inicio', 'Home'), home_path()], [$n, $p]],
    T($n . ': ' . count($games) . ' juegos gratis para móvil y TV', $n . ': ' . count($games) . ' free games for phone and TV') . ' · ' . $SITE, f($c, 'desc'), ['before' => $play]);
}
function home_path(): string { return T('/', '/en/'); }

function page_category(array $c): void {
  global $GAMES, $SITE;
  $games = array_values(array_filter($GAMES, function ($g) use ($c) { return $g['category_id'] === $c['id']; }));
  $p = cat_path($c); $n = f($c, 'name');
  page_list($p, [cat_path($c, 'es'), cat_path($c, 'en')], $c['emoji'] . ' ' . T('Juegos de ', '') . mb_strtolower($n, 'UTF-8') . T('', ' games'), f($c, 'desc'), $games,
    [[T('Inicio', 'Home'), home_path()], [$n, $p]], T('Juegos de ' . mb_strtolower($n, 'UTF-8') . ' gratis online (' . count($games) . ')', 'Free online ' . mb_strtolower($n, 'UTF-8') . ' games (' . count($games) . ')') . ' · ' . $SITE, f($c, 'desc'));
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
  $btn = '<div class="btns" style="margin-bottom:18px"><a class="btn pri" href="' . h(url('/pwa/indextv.html')) . '?tv=1&amp;lang=' . T('es', 'en') . '">📺 ' . h(T('Abrir la portada para TV', 'Open the TV home screen')) . '</a></div>';
  page_list($p, [list_path('tv', 'es'), list_path('tv', 'en')], T('Juegos para la tele con mando', 'TV games you play with the remote'), $lead, $games,
    [[T('Inicio', 'Home'), home_path()], ['TV', $p]], T(count($games) . ' juegos para Android TV y Fire TV gratis', count($games) . ' free games for Android TV and Fire TV') . ' · ' . $SITE, $lead, ['before' => $btn]);
}

function page_all(): void {
  global $GAMES, $SITE, $L;
  $games = array_values($GAMES);
  usort($games, function ($a, $b) { return strcoll(f($a, 'title'), f($b, 'title')); });
  $p = list_path('games');
  ob_start(); ?>
  <?= crumbs_html([[T('Inicio', 'Home'), home_path()], [T('Todos los juegos', 'All games'), $p]]) ?>
  <h1><?= h(T('Todos los juegos de la A a la Z', 'All games from A to Z')) ?></h1>
  <p class="lead"><?= h(T('La lista completa de los ' . count($games) . ' juegos, con el juego clásico en el que se inspira cada uno.', 'The full list of all ' . count($games) . ' games, with the classic each one is inspired by.')) ?></p>
  <ul class="az">
  <?php foreach ($games as $g): ?><li><a href="<?= h(url(game_path($g))) ?>"><?= h($g['emoji'] . ' ' . f($g, 'title')) ?></a> <small style="color:var(--mu)">— <?= h(cut($g['origin'], 40)) ?></small></li><?php endforeach; ?>
  </ul>
  <?php $body = ob_get_clean();
  $title = T('Todos los juegos (' . count($games) . ') de la A a la Z', 'All ' . count($games) . ' games from A to Z') . ' · ' . $SITE;
  $desc = T('Índice alfabético de los ' . count($games) . ' juegos gratis de Arcade Perdido y Arcade Pro, con su inspiración original.', 'Alphabetical index of all ' . count($games) . ' free Arcade Perdido and Arcade Pro games, with their original inspiration.');
  $crumbs = [[T('Inicio', 'Home'), home_path()], [T('Todos los juegos', 'All games'), $p]];
  render(['path' => $p, 'title' => $title, 'desc' => $desc, 'alt' => [list_path('games', 'es'), list_path('games', 'en')], 'body' => $body,
    'ld' => [page_ld('CollectionPage', $p, $title, $desc, ['breadcrumb' => ['@id' => abs_url($p) . '#breadcrumb'], 'mainEntity' => ['@id' => abs_url($p) . '#list']]), crumbs_ld($crumbs), itemlist_ld($p, T('Todos los juegos', 'All games'), $games)]]);
}

function page_search(): void {
  global $GAMES, $SITE;
  $q = trim((string)($_GET['q'] ?? ''));
  $q = mb_substr($q, 0, 60);
  $norm = function (string $s): string { $s = mb_strtolower($s, 'UTF-8'); return strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']); };
  $res = [];
  if ($q !== '') {
    $nq = $norm($q);
    foreach ($GAMES as $g) {
      $hay = $norm(implode(' ', [$g['title_es'], $g['title_en'], $g['tag_es'], $g['tag_en'], $g['desc_es'], $g['desc_en'], $g['origin']]));
      if (strpos($hay, $nq) !== false) $res[] = $g;
    }
  }
  $p = list_path('search');
  ob_start(); ?>
  <h1><?= h($q === '' ? T('Buscar juegos', 'Search games') : T('Resultados para «' . $q . '»', 'Results for “' . $q . '”')) ?></h1>
  <p class="lead"><?= h($q === '' ? T('Escribe el nombre de un juego, una mecánica o un clásico (por ejemplo: Tetris, Zuma, 2048).', 'Type a game name, a mechanic or a classic (for example: Tetris, Zuma, 2048).') : count($res) . ' ' . T('juegos encontrados', 'games found')) ?></p>
  <?= $res ? grid($res) : ($q !== '' ? '<p>' . h(T('No hay resultados. Prueba con otra palabra o mira todas las ', 'No results. Try another word or browse all ')) . '<a href="' . h(url(list_path('games'))) . '">' . h(T('categorías y juegos', 'categories and games')) . '</a>.</p>' : '') ?>
  <?php $body = ob_get_clean();
  render(['path' => $p, 'title' => T('Buscar', 'Search') . ($q !== '' ? ': ' . $q : '') . ' · ' . $SITE, 'desc' => T('Busca entre todos los juegos de Arcade Perdido.', 'Search all Arcade Perdido games.'), 'noindex' => true, 'q' => $q,
    'alt' => [list_path('search', 'es'), list_path('search', 'en')], 'body' => $body, 'ld' => [page_ld('SearchResultsPage', $p, T('Buscar', 'Search'), '')]]);
}

function page_game(array $g): void {
  global $COLS, $CATS, $CTRLS, $GAMES, $SITE, $L;
  $c = $CATS[$g['category_id']]; $col = $COLS[$g['collection_id']]; $ct = $CTRLS[$g['control_id']];
  $p = game_path($g); $t = f($g, 'title');
  $crumbs = [[T('Inicio', 'Home'), home_path()], [f($col, 'name'), col_path($col)], [f($c, 'name'), cat_path($c)], [$t, $p]];
  $related = array_values(array_filter($GAMES, function ($x) use ($g) { return $x['category_id'] === $g['category_id'] && $x['id'] !== $g['id']; }));
  usort($related, function ($a, $b) use ($g) { return ($a['collection_id'] === $g['collection_id'] ? 0 : 1) - ($b['collection_id'] === $g['collection_id'] ? 0 : 1) ?: $a['sort'] - $b['sort']; });
  $related = array_slice($related, 0, 6);
  $ids = array_keys($GAMES); $i = array_search($g['id'], $ids, true);
  $prev = $i > 0 ? $GAMES[$ids[$i - 1]] : null; $next = $i < count($ids) - 1 ? $GAMES[$ids[$i + 1]] : null;
  $based = based_text($g);
  $lives = (int)$g['lives'] === 0 ? T('Sin vidas: puedes reintentar siempre', 'No lives: retry as often as you like') : $g['lives'];
  $faq = [
    [T('¿Cómo se juega a ' . $t . '?', 'How do you play ' . $t . '?'), plain(f($g, 'help'))],
    [T('¿' . $t . ' es gratis?', 'Is ' . $t . ' free?'), T('Sí. Es gratis, no tiene anuncios ni compras y no hace falta registrarse ni descargar nada: se juega en el navegador.', 'Yes. It is free, with no ads or purchases, and you do not need to sign up or download anything: it runs in your browser.')],
    [T('¿Se puede jugar sin conexión?', 'Can I play offline?'), T('Sí. Si instalas la app (Añadir a pantalla de inicio) funciona sin internet. También hay una versión autónoma en un solo archivo HTML.', 'Yes. If you install the app (Add to Home screen) it works without internet. There is also a standalone single-file HTML version.')],
    [T('¿Se puede jugar en la tele con el mando?', 'Can I play it on a TV with the remote?'), $g['tv'] ? T('Sí, en Android TV, Google TV o Fire TV. ', 'Yes, on Android TV, Google TV or Fire TV. ') . plain(f($g, 'tvhelp')) . T(' Pueden jugar hasta 4 personas por turnos.', ' Up to 4 people can play taking turns.') : T('No: este juego necesita pantalla táctil.', 'No: this game needs a touch screen.')],
  ];
  if ($based) $faq[] = [T('¿En qué juego se inspira ' . $t . '?', 'What game is ' . $t . ' inspired by?'), T('Recrea la mecánica de ', 'It recreates the mechanics of ') . $based . T(', con gráficos de emojis, niveles infinitos y controles táctiles.', ', with emoji graphics, endless levels and touch controls.')];
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
        <a class="btn" href="<?= h(url('/autonomos/' . $g['file'])) ?>" download>📦 <?= h(T('Descargar HTML', 'Download HTML')) ?></a>
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
  global $GAMES, $CATS, $COLS, $CTRLS, $LASTMOD;
  header('Content-Type: application/xml; charset=utf-8');
  $pairs = [['/', '/en/', '1.0'], [list_path('games', 'es'), list_path('games', 'en'), '0.7'], [list_path('tv', 'es'), list_path('tv', 'en'), '0.7']];
  foreach ($COLS as $c) $pairs[] = [col_path($c, 'es'), col_path($c, 'en'), '0.9'];
  foreach ($CATS as $c) $pairs[] = [cat_path($c, 'es'), cat_path($c, 'en'), '0.8'];
  foreach ($CTRLS as $c) $pairs[] = [ctrl_path($c, 'es'), ctrl_path($c, 'en'), '0.5'];
  foreach ($GAMES as $g) $pairs[] = [game_path($g, 'es'), game_path($g, 'en'), '0.8'];
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
  echo "User-agent: *\nAllow: /\nDisallow: /buscar\nDisallow: /en/search\nDisallow: /data/\nDisallow: /herramientas/\n\nSitemap: " . abs_url('/sitemap.xml') . "\n";
  exit;
}

/* ---------- router ---------- */
$r = $L === 'en' ? substr($path, 3) : $path;   // ruta sin el prefijo /en
if ($r === '') $r = '/';
$seg = array_values(array_filter(explode('/', $r), 'strlen'));
$k = $seg[0] ?? '';
$arg = $seg[1] ?? null;
$EN = $L === 'en';

if ($L === 'es' && $path === '/sitemap.xml') out_sitemap();
if ($L === 'es' && $path === '/robots.txt') out_robots();
if ($L === 'es' && $k === 'icono' && $arg && count($seg) === 2 && preg_match('/^([a-z0-9-]+)\.svg$/', $arg, $m) && isset($GAMES[$m[1]])) out_svg($GAMES[$m[1]]);

if ($r === '/' && count($seg) === 0) { page_home(); exit; }
if (count($seg) === 1 && $k === ($EN ? 'games' : 'juegos')) { page_all(); exit; }
if (count($seg) === 1 && $k === 'tv') { page_tv(); exit; }
if (count($seg) === 1 && $k === ($EN ? 'search' : 'buscar')) { page_search(); exit; }
if (count($seg) === 2) {
  if ($k === ($EN ? 'game' : 'juego')) { $g = $EN ? find_by($GAMES, 'slug_en', $arg) : ($GAMES[$arg] ?? null); if ($g) { page_game($g); exit; } }
  if ($k === ($EN ? 'play' : 'jugar')) { $g = $EN ? find_by($GAMES, 'slug_en', $arg) : ($GAMES[$arg] ?? null); if ($g) redirect(game_file_url($g), 302); }
  if ($k === ($EN ? 'category' : 'categoria')) { $c = find_by($CATS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_category($c); exit; } }
  if ($k === ($EN ? 'collection' : 'coleccion')) { $c = find_by($COLS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_collection($c); exit; } }
  if ($k === 'control') { $c = find_by($CTRLS, $EN ? 'slug_en' : 'slug_es', $arg); if ($c) { page_control($c); exit; } }
  // URL del otro idioma con el prefijo equivocado → redirige a la buena
  if (!$EN && $k === 'game' && ($g = find_by($GAMES, 'slug_en', $arg))) redirect(url(game_path($g, 'en')));
  if ($EN && $k === 'juego' && isset($GAMES[$arg])) redirect(url(game_path($GAMES[$arg], 'en')));
}
// /lazo.html o /pwa/lazo → ficha del juego
if (count($seg) === 1 && preg_match('/^([a-z0-9]+)(\.html)?$/', $k, $m) && isset($GAMES[$m[1]])) redirect(url(game_path($GAMES[$m[1]])));
page_404();
