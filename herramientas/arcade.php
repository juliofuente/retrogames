<?php
/* Arcade Perdido · herramienta de construcción (solo PHP + JSON + SQLite)
   ─────────────────────────────────────────────────────────────────────────────
   Uso (desde cualquier carpeta):
     php herramientas/arcade.php todo                 lo hace todo, en orden (es lo normal tras cualquier cambio)
     php herramientas/arcade.php juegos [id id …]     src/<id>.js → pwa/<id>.html (sin ids: todos)
     php herramientas/arcade.php catalogo             pwa/games.js y data/arcade.sqlite desde datos/*.json + src/*.js
     php herramientas/arcade.php huellas              pone ?v=<huella> en los .js/.css que cargan las páginas
     php herramientas/arcade.php autonomos [--solo [id,id…]]   versiones con todo incrustado en autonomos/
     php herramientas/arcade.php comprobar            revisa datos/*.json y src/ sin escribir nada

   De dónde sale cada cosa:
     src/<id>.js              el juego (JavaScript). Su Arcade.game({…}) da título, emoji, color, ayuda es/en, vidas…
     datos/juegos.json        colección, categoría, control, mando de TV, descripción es/en y versión de cada juego
                              (el orden del archivo es el orden de las portadas)
     datos/catalogo.json      versión de la PWA, colecciones, categorías, controles y orden de la portada de mesa
     datos/educativos.json    asignaturas, edades, apps y juegos educativos (más los de educativos/brain-academy/data/games.json)
   Necesita PHP 7.4+ con pdo_sqlite (y mbstring).                                                                    */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', 'stderr');

const HERE = __DIR__;
define('ROOT', dirname(__DIR__));
define('PWA', ROOT . '/pwa');

function fail(string $m): void { fwrite(STDERR, "✗ $m\n"); exit(1); }
function say(string $m): void { echo $m, "\n"; }
function rjson(string $f) { $j = json_decode((string)file_get_contents($f), true); if (!is_array($j)) fail("JSON no válido: $f (" . json_last_error_msg() . ')'); return $j; }
function slugify(string $t): string {   // como el de siempre: quita tildes y lo que no sea ASCII («1–6» → «16»)
  if (class_exists('Normalizer')) $t = (string)Normalizer::normalize($t, Normalizer::FORM_KD);
  else $t = strtr($t, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n', 'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u', 'â' => 'a', 'ê' => 'e', 'î' => 'i', 'ô' => 'o', 'û' => 'u', 'ç' => 'c', 'ï' => 'i', 'ë' => 'e', 'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N', 'Ü' => 'U', 'Ç' => 'C']);
  $t = strtolower((string)preg_replace('/[^\x00-\x7F]/', '', $t));
  return trim((string)preg_replace('/[^a-z0-9]+/', '-', $t), '-');
}
function jenc($v, bool $pretty = false): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | ($pretty ? JSON_PRETTY_PRINT : 0)); }

/* ═════════════ lector del objeto Arcade.game({…}) de cada juego ═════════════
   Lee los valores literales (textos, números, listas, objetos) y se salta el código (funciones, expresiones). */
final class JsDef {
  const CODE = ['__code' => true];
  private $s; private $i = 0; private $n;
  public static function read(string $src): array {
    $p = strpos($src, 'Arcade.game('); if ($p === false) throw new RuntimeException('no hay Arcade.game(');
    $o = new self(); $o->s = $src; $o->n = strlen($src); $o->i = $p + 12; $o->ws();
    if ($o->s[$o->i] !== '{') throw new RuntimeException('Arcade.game sin objeto');
    $v = $o->value(); return is_array($v) ? $v : [];
  }
  private function ws(): void {
    while ($this->i < $this->n) {
      $c = $this->s[$this->i];
      if ($c === ' ' || $c === "\n" || $c === "\t" || $c === "\r") { $this->i++; continue; }
      if ($c === '/' && ($this->s[$this->i + 1] ?? '') === '/') { $e = strpos($this->s, "\n", $this->i); $this->i = $e === false ? $this->n : $e; continue; }
      if ($c === '/' && ($this->s[$this->i + 1] ?? '') === '*') { $e = strpos($this->s, '*/', $this->i + 2); $this->i = $e === false ? $this->n : $e + 2; continue; }
      break;
    }
  }
  private function value() {
    $this->ws(); $c = $this->s[$this->i];
    if ($c === '{') return $this->obj();
    if ($c === '[') return $this->arr();
    if ($c === "'" || $c === '"') { $str = $this->str(); return $this->maybeMore($str); }
    if ($c === '`') { $start = $this->i; $t = $this->tpl(); return $t === null ? self::CODE : $this->maybeMore($t); }
    if (preg_match('/\G-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?(?![\w$.])/A', $this->s, $m, 0, $this->i)) { $this->i += strlen($m[0]); $num = strpos($m[0], '.') !== false || stripos($m[0], 'e') !== false ? (float)$m[0] : (int)$m[0]; return $this->maybeMore($num); }
    if (preg_match('/\G(true|false|null|undefined)(?![\w$])/A', $this->s, $m, 0, $this->i)) { $this->i += strlen($m[0]); $v = ['true' => true, 'false' => false, 'null' => null, 'undefined' => null][$m[1]]; return $this->maybeMore($v); }
    $this->skip(); return self::CODE;
  }
  // un literal seguido de un operador (p. ej. 'a' + b) ya no es literal
  private function maybeMore($v) { $this->ws(); $c = $this->s[$this->i] ?? ''; if ($c === ',' || $c === '}' || $c === ']' || $c === ')') return $v; $this->skip(); return self::CODE; }
  private function obj(): array {
    $this->i++; $out = [];
    while (true) {
      $this->ws(); $c = $this->s[$this->i];
      if ($c === '}') { $this->i++; break; }
      if ($c === ',') { $this->i++; continue; }
      if ($c === '.' && substr($this->s, $this->i, 3) === '...') { $this->i += 3; $this->skip(); continue; }
      if ($c === "'" || $c === '"') $k = $this->str();
      elseif ($c === '[') { $this->balanced('[', ']'); $k = null; }
      elseif (preg_match('/\G(?:async\s+|get\s+|set\s+|\*\s*)?([A-Za-z_$][\w$]*|\d+)/A', $this->s, $m, 0, $this->i)) { $this->i += strlen($m[0]); $k = $m[1]; }
      else throw new RuntimeException('clave rara en la posición ' . $this->i);
      $this->ws(); $c = $this->s[$this->i];
      if ($c === ':') { $this->i++; $v = $this->value(); }
      elseif ($c === '(') { $this->balanced('(', ')'); $this->ws(); if ($this->s[$this->i] === '{') $this->balanced('{', '}'); $v = self::CODE; }
      else $v = self::CODE;   // propiedad abreviada { a, b }
      if ($k !== null) $out[$k] = $v;
    }
    return $out;
  }
  private function arr(): array {
    $this->i++; $out = [];
    while (true) {
      $this->ws(); $c = $this->s[$this->i];
      if ($c === ']') { $this->i++; break; }
      if ($c === ',') { $this->i++; continue; }
      $out[] = $this->value();
    }
    return $out;
  }
  private function str(): string {
    $q = $this->s[$this->i++]; $out = '';
    while ($this->i < $this->n) {
      $c = $this->s[$this->i++];
      if ($c === $q) return $out;
      if ($c !== '\\') { $out .= $c; continue; }
      $e = $this->s[$this->i++];
      switch ($e) {
        case 'n': $out .= "\n"; break; case 't': $out .= "\t"; break; case 'r': $out .= "\r"; break; case 'b': $out .= "\x08"; break; case 'f': $out .= "\f"; break; case 'v': $out .= "\v"; break; case '0': $out .= "\0"; break;
        case "\n": break;
        case 'x': $out .= mb_chr(hexdec(substr($this->s, $this->i, 2)), 'UTF-8'); $this->i += 2; break;
        case 'u':
          if ($this->s[$this->i] === '{') { $e2 = strpos($this->s, '}', $this->i); $out .= mb_chr(hexdec(substr($this->s, $this->i + 1, $e2 - $this->i - 1)), 'UTF-8'); $this->i = $e2 + 1; break; }
          $cp = hexdec(substr($this->s, $this->i, 4)); $this->i += 4;
          if ($cp >= 0xD800 && $cp <= 0xDBFF && substr($this->s, $this->i, 2) === '\\u') { $lo = hexdec(substr($this->s, $this->i + 2, 4)); if ($lo >= 0xDC00 && $lo <= 0xDFFF) { $cp = 0x10000 + (($cp - 0xD800) << 10) + ($lo - 0xDC00); $this->i += 6; } }
          $out .= mb_chr($cp, 'UTF-8'); break;
        default: $out .= $e;
      }
    }
    throw new RuntimeException('texto sin cerrar');
  }
  /* plantilla `…`: devuelve el texto si no tiene ${…}; si lo tiene, se la salta y devuelve null */
  private function tpl(): ?string {
    $this->i++; $out = ''; $code = false;
    while ($this->i < $this->n) {
      $c = $this->s[$this->i++];
      if ($c === '`') return $code ? null : $out;
      if ($c === '\\') { $out .= $this->s[$this->i++]; continue; }
      if ($c === '$' && ($this->s[$this->i] ?? '') === '{') { $code = true; $this->i--; $this->balanced('$', '}'); continue; }
      $out .= $c;
    }
    throw new RuntimeException('plantilla sin cerrar');
  }
  /* salta un bloque que empieza en $this->i ( '(' '[' '{' o '${' ) hasta su cierre */
  private function balanced(string $open, string $close): void {
    if ($open === '$') $this->i += 2; else $this->i++;
    $this->scan(true);
    $this->i++; // el cierre
  }
  /* salta una expresión hasta la coma o el cierre del nivel actual */
  private function skip(): void { $this->scan(false); }
  private function scan(bool $toClose): void {
    $depth = 0; $last = '(';
    while ($this->i < $this->n) {
      $c = $this->s[$this->i];
      if ($c === "'" || $c === '"') { $this->str(); $last = 'a'; continue; }
      if ($c === '`') { $this->tpl(); $last = 'a'; continue; }
      if ($c === '/') {
        $nx = $this->s[$this->i + 1] ?? '';
        if ($nx === '/' || $nx === '*') { $this->ws(); continue; }
        if (strpos('(,=:[!&|?{};+-*%<>~^', $last) !== false) { $this->regex(); $last = 'a'; continue; }
        $this->i++; $last = '/'; continue;
      }
      if ($c === '(' || $c === '[' || $c === '{') { $depth++; $this->i++; $last = $c; continue; }
      if ($c === ')' || $c === ']' || $c === '}') { if ($depth === 0) return; $depth--; $this->i++; $last = ')'; continue; }
      if ($c === ',' && $depth === 0 && !$toClose) return;
      if (ctype_space($c)) { $this->i++; continue; }
      if (preg_match('/\G[A-Za-z_$][\w$]*/A', $this->s, $m, 0, $this->i)) { $this->i += strlen($m[0]); $last = in_array($m[0], ['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'else', 'do'], true) ? '(' : 'a'; continue; }
      $this->i++; $last = $c === '.' ? '.' : (ctype_alnum($c) ? 'a' : $c);
    }
  }
  private function regex(): void {
    $this->i++; $cls = false;
    while ($this->i < $this->n) {
      $c = $this->s[$this->i++];
      if ($c === '\\') { $this->i++; continue; }
      if ($c === '[') $cls = true; elseif ($c === ']') $cls = false;
      elseif ($c === '/' && !$cls) break;
      elseif ($c === "\n") throw new RuntimeException('expresión regular sin cerrar');
    }
    while ($this->i < $this->n && ctype_alpha($this->s[$this->i])) $this->i++;
  }
}
function lit($v) { return is_array($v) && isset($v['__code']) ? null : $v; }

/* ═════════════ datos ═════════════ */
function datos(): array {
  static $d = null; if ($d) return $d;
  $d = ['cat' => rjson(HERE . '/datos/catalogo.json'), 'juegos' => rjson(HERE . '/datos/juegos.json'), 'edu' => rjson(HERE . '/datos/educativos.json')];
  return $d;
}
/* lee del juego lo que no está en juegos.json */
function info_juego(string $id): array {
  static $cache = [];
  if (isset($cache[$id])) return $cache[$id];
  $f = HERE . "/src/$id.js"; if (!is_file($f)) fail("falta src/$id.js");
  $src = (string)file_get_contents($f);
  [$first] = explode("\n", $src, 2);
  if (!preg_match('#^//\s*(.+?)\|(\S+)#', $first, $m)) fail("src/$id.js: la primera línea tiene que ser // Título|#color");
  try { $d = JsDef::read($src); } catch (Throwable $e) { fail("src/$id.js: " . $e->getMessage()); }
  $en = is_array($d['en'] ?? null) ? $d['en'] : [];
  $i = [
    'id' => lit($d['id'] ?? null), 'title' => lit($d['title'] ?? null), 'emoji' => lit($d['emoji'] ?? null), 'color' => lit($d['color'] ?? null), 'origin' => lit($d['origin'] ?? null),
    'tag' => lit($d['tag'] ?? null), 'help' => lit($d['help'] ?? null), 'tvHelp' => lit($d['tvHelp'] ?? null) ?: null,
    'en' => ['title' => lit($en['title'] ?? null), 'tag' => lit($en['tag'] ?? null), 'help' => lit($en['help'] ?? null), 'tvHelp' => lit($en['tvHelp'] ?? null) ?: null],
    'lives' => array_key_exists('lives', $d) ? lit($d['lives']) : 3, 'levels' => array_key_exists('levels', $d) ? lit($d['levels']) : null, 'cap' => lit($d['cap'] ?? null) ?: null,
    'deco' => is_array(lit($d['deco'] ?? null)) ? $d['deco'] : [], 'font' => lit($d['font'] ?? null) ?: null, 'bg' => is_array(lit($d['bg'] ?? null)) ? $d['bg'] : null,
    'theme' => $m[2], 'name' => trim($m[1]), 'phys' => strpos($src, '@phys') !== false, 'body' => explode("\n", $src, 2)[1] ?? '',
  ];
  if ($i['id'] !== $id) fail("src/$id.js: el id del juego es «{$i['id']}»");
  foreach (['title', 'emoji', 'color', 'origin'] as $k) if (!is_string($i[$k]) || $i[$k] === '') fail("src/$id.js: falta $k");
  return $cache[$id] = $i;
}
function ctrl_en(string $es): string { foreach (datos()['cat']['controles'] as $c) if ($c['nombre']['es'] === $es) return $c['nombre']['en']; fail("control desconocido: $es"); return ''; }

/* ═════════════ juegos: src → pwa ═════════════ */
function cmd_juegos(array $ids): void {
  $ids = $ids ?: array_map(function ($f) { return basename($f, '.js'); }, glob(HERE . '/src/*.js'));
  sort($ids);
  foreach ($ids as $n) {
    $src = (string)file_get_contents(HERE . "/src/$n.js");
    [$first, $body] = explode("\n", $src, 2) + [1 => ''];
    [$title, $theme] = array_map('trim', explode('|', substr($first, 2)));
    $head = "<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no\">\n<title>$title · Arcade Perdido</title>\n<meta name=\"theme-color\" content=\"$theme\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n";
    $html = $head . "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n<link rel=\"icon\" href=\"icons/icon-192.png\">\n<link rel=\"apple-touch-icon\" href=\"icons/icon-192.png\">\n<link rel=\"stylesheet\" href=\"common.css\">\n</head>\n<body class=\"game\">\n<script src=\"config.js\"></script>\n<script src=\"common.js\"></script>\n"
      . (strpos($src, '@phys') !== false ? "<script src=\"phys.js\"></script>\n" : '') . "<script>\n" . $body . "</script>\n</body>\n</html>\n";
    file_put_contents(PWA . "/$n.html", $html);
  }
  say('juegos: ' . count($ids) . ' construidos en pwa/');
}

/* ═════════════ catálogo: games.js + arcade.sqlite ═════════════ */
function entrada(array $j): array {
  $i = info_juego($j['id']);
  // juegos.json puede cambiar lo que se ve en la portada (emoji, origen, lema) sin tocar el juego
  return ['file' => $j['id'] . '.html', 'id' => $j['id'], 'title' => $i['title'], 'emoji' => $j['emoji'] ?? $i['emoji'], 'color' => $i['color'], 'origin' => $j['origen'] ?? $i['origin'],
    'desc' => $j['desc']['es'], 'ctrl' => $j['control'], 'tv' => $j['tv'] ?: false, 'tag' => $j['tag']['es'] ?? $i['tag'],
    'en' => ['title' => $i['en']['title'], 'desc' => $j['desc']['en'], 'tag' => $j['tag']['en'] ?? $i['en']['tag'], 'ctrl' => ctrl_en($j['control'])]];
}
function cmd_games_js(): void {
  $D = datos(); $main = []; $pro = [];
  foreach ($D['juegos'] as $j) { $e = '  ' . jenc(entrada($j)) . ','; if ($j['coleccion'] === 'main') $main[] = $e; else $pro[] = $e; }
  $js = "/* Arcade Perdido · lista de juegos.\n   GENERADO por herramientas/arcade.php desde herramientas/datos/*.json y herramientas/src/*.js: no lo edites a mano.\n   La versión (ARCADE_VERSION) está en datos/catalogo.json: súbela cada vez que cambies archivos para que el móvil descargue la nueva. */\n"
    . "var ARCADE_VERSION = '" . $D['cat']['version'] . "';\nvar GAMES = [\n" . implode("\n", $main) . "\n];\n\n/* Colección Pro: mecánicas de los grandes éxitos de los juegos de móvil, hechas con JS y emojis. */\nvar GAMES_PRO = [\n" . implode("\n", $pro) . "\n];\n"
    . "// juegos de mesa por turnos (portada pwa/indexmesa y sección ♟️ de la portada de TV)\nvar GAMES_MESA = " . jenc($D['cat']['portada_mesa']) . ";\n";
  file_put_contents(PWA . '/games.js', $js);
  say('pwa/games.js: ' . count($main) . ' + ' . count($pro) . ' juegos · v' . $D['cat']['version']);
}
function based_on(string $origin): array {
  $out = [];
  foreach (preg_split('/\s*\/\s*|\s*·\s*/u', $origin) as $part) {
    $part = trim($part); if ($part === '') continue;
    $name = $part; $who = null; $year = null;
    if (preg_match('/^(.*?)\s*\((.*)\)\s*$/su', $part, $m)) {
      $name = trim($m[1]); $inner = $m[2];
      if (preg_match('/\b(19|20)\d\d\b/', $inner, $y)) $year = (int)$y[0];
      $who = trim((string)preg_replace('/,?\s*\b(19|20)\d\d\b/', '', $inner), ' ,'); if ($who === '') $who = null;
    }
    $out[] = [$name, $who, $year];
  }
  return $out;
}
function edu_juegos(): array {
  $E = datos()['edu']; $bands = $E['edades'];
  $bandsOf = function ($lo, $hi) use ($bands) { $o = []; foreach ($bands as $b) if ($lo <= $b['max'] && $hi >= $b['min']) $o[] = $b['id']; return $o; };
  $g = []; $brain = rjson(ROOT . '/educativos/brain-academy/data/games.json');
  foreach ($brain['games'] as $b) {
    $ages = $b['ages']; $lo = min(array_map(function ($a) use ($E) { return $E['brain']['edades'][(string)$a][0]; }, $ages)); $hi = max(array_map(function ($a) use ($E) { return $E['brain']['edades'][(string)$a][1]; }, $ages));
    $mid = in_array(6, $ages, true) ? 6 : $ages[0];
    $bd = array_merge(in_array(3, $ages, true) ? ['3-6'] : [], in_array(9, $ages, true) ? ['7-12'] : []) ?: ['3-6', '7-12'];
    $g[] = ['id' => slugify($b['name']['es']), 'app' => 'brain', 'subject' => $E['brain']['asignatura'][$b['cat']], 'emoji' => $b['emoji'], 'ages' => [$lo, $hi], 'langs' => $b['langs'] ?? ['es', 'en', 'fr'],
      'url' => sprintf('educativos/brain-academy/?juego=%s&edad=%d', $b['id'], $mid), 'title' => $b['name'], 'desc' => $b['desc'], 'bands' => $bd];
  }
  foreach ($E['sueltos'] as $e) $g[] = ['id' => $e['id'], 'app' => $e['app'], 'subject' => $e['asignatura'], 'emoji' => $e['emoji'], 'ages' => $e['edades'], 'langs' => $e['idiomas'], 'url' => $e['url'], 'title' => $e['titulo'], 'desc' => $e['desc'], 'bands' => $bandsOf(...$e['edades'])];
  foreach ($E['arcade'] as $e) $g[] = ['id' => $e['ref'], 'app' => 'arcade', 'subject' => $e['asignatura'], 'emoji' => info_juego($e['ref'])['emoji'], 'ages' => $e['edades'], 'langs' => ['es', 'en'], 'url' => 'pwa/' . $e['ref'], 'title' => $e['titulo'], 'desc' => $e['desc'], 'bands' => $bandsOf(...$e['edades'])];
  $seen = []; foreach ($g as $x) { if (isset($seen[$x['id']])) fail('id educativo repetido: ' . $x['id']); $seen[$x['id']] = 1; }
  return $g;
}
function cmd_db(): void {
  $D = datos(); $C = $D['cat']; $E = $D['edu'];
  $f = ROOT . '/data/arcade.sqlite'; $tmp = $f . '.nuevo'; @unlink($tmp);
  $db = new PDO('sqlite:' . $tmp, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $db->exec(<<<'SQL'
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
SQL);
  $edu = edu_juegos(); $db->beginTransaction();
  $ins = function (string $t, array $row) use ($db) { $db->prepare("INSERT INTO $t VALUES (" . implode(',', array_fill(0, count($row), '?')) . ')')->execute($row); };
  foreach ([['version', $C['version']], ['generated', date('Y-m-d')], ['total', (string)(count($D['juegos']) + count($edu))]] as $r) $ins('meta', $r);
  foreach ($C['colecciones'] as $k => $c) $ins('collections', [$c['id'], $c['slug']['es'], $c['slug']['en'], $c['nombre']['es'], $c['nombre']['en'], $c['portada'], $c['desc']['es'], $c['desc']['en'], $c['emoji'], $k]);
  foreach ($E['asignaturas'] as $k => $s) $ins('subjects', [$s['id'], $s['slug']['es'], $s['slug']['en'], $s['nombre']['es'], $s['nombre']['en'], $s['emoji'], $s['color'], $s['desc']['es'], $s['desc']['en'], $k]);
  foreach ($E['edades'] as $k => $b) $ins('age_groups', [$b['id'], $b['slug']['es'], $b['slug']['en'], $b['nombre']['es'], $b['nombre']['en'], $b['min'], $b['max'], $b['emoji'], $k]);
  foreach ($C['categorias'] as $k => $c) $ins('categories', [$c['id'], $c['slug']['es'], $c['slug']['en'], $c['nombre']['es'], $c['nombre']['en'], $c['emoji'], $c['genero'], $c['desc']['es'], $c['desc']['en'], $k]);
  $ctrl = []; foreach ($C['controles'] as $c) { $ctrl[$c['nombre']['es']] = $c['slug']['es']; $ins('controls', [$c['slug']['es'], $c['slug']['es'], $c['slug']['en'], $c['nombre']['es'], $c['nombre']['en']]); }
  $cats = array_column($C['categorias'], 'id'); $cols = array_column($C['colecciones'], 'id');
  $usedEn = []; $ids = [];
  foreach ($D['juegos'] as $order => $j) {
    $i = info_juego($j['id']); $e = entrada($j);
    if (!in_array($j['categoria'], $cats, true)) fail("{$j['id']}: categoría desconocida «{$j['categoria']}»");
    if (!in_array($j['coleccion'], $cols, true)) fail("{$j['id']}: colección desconocida «{$j['coleccion']}»");
    $se = slugify((string)$e['en']['title']) ?: $j['id']; if (isset($usedEn[$se])) $se .= '-' . $j['id']; $usedEn[$se] = 1;
    $cap = $i['cap'] ?: 20;
    $lv = $i['levels'] === null ? 'endless' : ($i['levels'] === 0 ? (string)($cap <= 16 ? 60 : ($cap <= 20 ? 80 : ($cap <= 25 ? 100 : 120))) : (string)$i['levels']);
    $bg = $i['bg'] ?: [null, null];
    $ins('games', [$j['id'], $se, $j['coleccion'], $j['categoria'], $ctrl[$j['control']], $j['id'] . '.html', $e['emoji'], $e['color'], $i['theme'], $bg[0], $bg[1], $i['font'],
      '[' . implode(', ', array_map('jenc', $i['deco'])) . ']', $e['title'], $e['en']['title'], $e['tag'], $e['en']['tag'], $e['desc'], $e['en']['desc'], $i['help'], $i['en']['help'], $i['tvHelp'], $i['en']['tvHelp'],
      $j['tv'] ?: null, $e['origin'], $i['lives'], $lv, $i['cap'], $i['phys'] ? 1 : 0, $j['version'] ?? null, $order, null, null, null, 'es,en', null, 'pwa/' . $j['id'] . '.html']);
    foreach (based_on($e['origin']) as $k => [$n, $w, $y]) $ins('based_on', [$j['id'], $k, $n, $w, $y]);
    $ids[$j['id']] = 1;
  }
  $subj = []; foreach ($E['asignaturas'] as $s) $subj[$s['id']] = $s; $apps = []; foreach ($E['apps'] as $a) $apps[$a['id']] = $a['nombre'];
  foreach ($edu as $k => $g) {
    $gid = isset($ids[$g['id']]) ? $g['id'] . '-' . $g['subject'] : $g['id']; $ids[$gid] = 1;
    $se = slugify($g['title']['en']) ?: $gid; if (isset($usedEn[$se])) $se .= '-' . $subj[$g['subject']]['slug']['en']; $usedEn[$se] = 1;
    $col = $subj[$g['subject']]['color'];
    $ins('games', [$gid, $se, 'edu', 'educativos', null, null, $g['emoji'], $col, $col, $col, '#101a2c', null, '[]', $g['title']['es'], $g['title']['en'], $g['desc']['es'], $g['desc']['en'], $g['desc']['es'], $g['desc']['en'],
      null, null, null, null, null, '', 0, $g['app'] === 'brain' ? 'infinite' : null, null, 0, '2.8.0', 10000 + $k, $g['subject'], $g['ages'][0], $g['ages'][1], implode(',', $g['langs']), $apps[$g['app']], $g['url']]);
    foreach ($g['bands'] as $b) $ins('game_age_groups', [$gid, $b]);
  }
  $db->commit(); $db->exec('VACUUM'); $db = null;
  rename($tmp, $f);
  say('data/arcade.sqlite: ' . count($D['juegos']) . ' juegos + ' . count($edu) . ' educativos · v' . $C['version']);
}

/* ═════════════ huellas ?v= ═════════════ */
function cmd_huellas(): void {
  $pages = array_merge(glob(PWA . '/*.html'), glob(ROOT . '/educativos/brain-academy/*.html'), glob(ROOT . '/educativos/brain-academy/games/*.html'), glob(ROOT . '/educativos/problemas-primaria/*.html'));
  $cache = []; $n = 0;
  foreach ($pages as $page) {
    if (!is_file($page)) continue;
    $s = (string)file_get_contents($page);
    $t = preg_replace_callback('/((?:src|href)=")([^"?#:]+\.(?:js|css))(?:\?v=[0-9a-f]*)?(")/', function ($m) use ($page, &$cache) {
      $target = realpath(dirname($page) . '/' . $m[2]); if (!$target || !is_file($target)) return $m[0];
      if (!isset($cache[$target])) $cache[$target] = substr(md5_file($target), 0, 10);
      return $m[1] . $m[2] . '?v=' . $cache[$target] . $m[3];
    }, $s);
    if ($t !== $s) { file_put_contents($page, $t); $n++; }
  }
  say("huellas: $n páginas actualizadas · " . count($cache) . ' recursos');
}

/* ═════════════ autónomos ═════════════ */
function cmd_autonomos(array $args): void {
  $out = ROOT . '/autonomos/'; @mkdir($out, 0775, true);
  $r = function ($f) { return (string)file_get_contents(PWA . '/' . $f); };
  $css = $r('common.css'); $codes = ['common.js' => $r('common.js'), 'games.js' => $r('games.js'), 'config.js' => $r('config.js'), 'phys.js' => $r('phys.js')];
  foreach (['common.js', 'games.js', 'config.js'] as $k) if (strpos($codes[$k], '</script') !== false) fail("$k contiene </script");
  $files = glob(PWA . '/*.html'); sort($files);
  foreach ($files as $f) {
    $s = (string)file_get_contents($f);
    $s = preg_replace_callback('/<link rel="stylesheet" href="common\.css(\?v=[0-9a-f]*)?">/', function () use ($css) { return "<style>\n" . $css . '</style>'; }, $s);
    foreach ($codes as $name => $code) $s = preg_replace_callback('/<script src="' . preg_quote($name, '/') . '(\?v=[0-9a-f]*)?"><\/script>/', function () use ($code) { return "<script>\n" . $code . '</script>'; }, $s);
    if (preg_match('/(href|src)="(common\.css|common\.js|config\.js|games\.js|phys\.js)/', $s)) fail('quedó una referencia sin incrustar en ' . basename($f));
    file_put_contents($out . basename($f), $s);
  }
  say('autonomos: ' . count(glob($out . '*.html')) . ' archivos');
  $k = array_search('--solo', $args, true);
  if ($k !== false) {
    $only = isset($args[$k + 1]) ? explode(',', $args[$k + 1]) : null; $solo = $out . 'solo/'; @mkdir($solo, 0775, true);
    foreach (glob($out . '*.html') as $f) {
      $n = basename($f); if (strpos($n, 'index') === 0 || ($only && !in_array(substr($n, 0, -5), $only, true))) continue;
      $s = preg_replace('/<head>/', "<head>\n<script>window.isSingleGame = true;</script>", (string)file_get_contents($f), 1);
      $s = preg_replace('/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?/', '', $s);
      file_put_contents($solo . $n, $s);
    }
    say('autonomos/solo: ' . count(glob($solo . '*.html')) . ' juegos sueltos');
  }
}

/* ═════════════ comprobar ═════════════ */
function cmd_comprobar(): void {
  $D = datos(); $err = 0; $ids = [];
  $cats = array_column($D['cat']['categorias'], 'id'); $cols = array_column($D['cat']['colecciones'], 'id'); $ctrls = array_map(function ($c) { return $c['nombre']['es']; }, $D['cat']['controles']);
  foreach ($D['juegos'] as $j) {
    $id = $j['id'] ?? '?';
    if (isset($ids[$id])) { say("✗ $id repetido en juegos.json"); $err++; } $ids[$id] = 1;
    foreach (['coleccion' => $cols, 'categoria' => $cats, 'control' => $ctrls] as $k => $ok) if (!in_array($j[$k] ?? null, $ok, true)) { say("✗ $id: $k «" . ($j[$k] ?? '') . '» no existe'); $err++; }
    if (!in_array($j['tv'] ?? null, [false, 'cursor', 'cruceta'], true)) { say("✗ $id: tv tiene que ser false, \"cursor\" o \"cruceta\""); $err++; }
    if (empty($j['desc']['es']) || empty($j['desc']['en'])) { say("✗ $id: falta la descripción es/en"); $err++; }
    info_juego($id);
  }
  foreach (glob(HERE . '/src/*.js') as $f) if (!isset($ids[basename($f, '.js')])) say('⚠ ' . basename($f) . ' no está en juegos.json (no saldrá en la web)');
  foreach ($D['cat']['portada_mesa'] as $id) if (($D['juegos'][array_search($id, array_column($D['juegos'], 'id'), true)]['coleccion'] ?? '') !== 'mesa') { say("✗ portada_mesa: $id no es de la colección mesa"); $err++; }
  edu_juegos();
  say($err ? "✗ $err problemas" : '✓ todo en orden: ' . count($ids) . ' juegos');
  if ($err) exit(1);
}

/* ═════════════ main ═════════════ */
if (defined('ARCADE_LIB')) return;
$args = array_slice($argv, 1); $cmd = array_shift($args) ?? 'ayuda';
if (!extension_loaded('pdo_sqlite') && in_array($cmd, ['todo', 'catalogo'], true)) fail('falta la extensión pdo_sqlite de PHP');
switch ($cmd) {
  case 'juegos': cmd_juegos($args); break;
  case 'catalogo': cmd_games_js(); cmd_db(); break;
  case 'huellas': cmd_huellas(); break;
  case 'autonomos': cmd_autonomos($args); break;
  case 'comprobar': cmd_comprobar(); break;
  case 'todo': cmd_comprobar(); cmd_juegos([]); cmd_games_js(); cmd_huellas(); cmd_db(); cmd_autonomos($args); break;
  default: echo preg_replace('/^.*?Uso/s', 'Uso', explode('*/', (string)file_get_contents(__FILE__), 2)[0] ?? ''), "\n";
}
