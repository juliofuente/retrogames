<?php
/* Arcade Perdido · herramienta de construcción (solo PHP + SQLite)
   ─────────────────────────────────────────────────────────────────────────────
   TODA la configuración vive en data/arcade.sqlite: juegos, colecciones, categorías, controles, asignaturas,
   edades, apps educativas y ajustes (versión, portada, modo TV, idioma…). Se edita desde el CMS (/cms) o con
   «set»/«ajuste» aquí. Este script NO crea la base de datos: la lee y genera los archivos que necesita la web.

   Uso (desde cualquier carpeta):
     php herramientas/arcade.php todo                       comprueba y genera todo (lo normal tras cualquier cambio; captura los juegos que no tengan)
     php herramientas/arcade.php juegos [id …]              src/<id>.js → pwa/<id>.html (sin ids: todos)
     php herramientas/arcade.php sincronizar [id …]         copia a la base de datos lo que sale del código del juego
                                                            (cómo se juega, mando, vidas, niveles, colores, adornos)
     php herramientas/arcade.php nuevo <id> campo=valor …   da de alta un juego de src/ en la base de datos
                                                            (p. ej. coleccion=pro categoria=puzles control=Tocar tv=cursor
                                                             desc_es="…" desc_en="…"); título, emoji, color… salen del juego
     php herramientas/arcade.php set <id> campo=valor …     cambia campos de un juego (columnas de la tabla games)
     php herramientas/arcade.php ajuste [clave [valor]]     ve o cambia los ajustes (versión, portada, modo, idioma…)
     php herramientas/arcade.php catalogo                   genera pwa/games.js y pwa/config.js desde la base de datos
     php herramientas/arcade.php huellas                    pone ?v=<huella> en los .js/.css que cargan las páginas
     php herramientas/arcade.php autonomos [--solo [id,id…]]   versiones con todo incrustado en autonomos/
     php herramientas/arcade.php capturas [id …] [--faltan] [--t=6]  capturas de cada juego (pwa/capturas/) con Chrome/Chromium sin ventana
     php herramientas/arcade.php comprobar                  revisa la base de datos y src/ sin escribir nada
   Necesita PHP 7.4+ con pdo_sqlite (y mbstring).                                                                    */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', 'stderr');

const HERE = __DIR__;
define('ROOT', dirname(__DIR__));
define('PWA', ROOT . '/pwa');

function fail(string $m): void { throw new RuntimeException($m); }
function say(string $m): void { if (!defined('ARCADE_QUIET')) echo $m, "\n"; }
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

/* ═════════════ base de datos ═════════════ */
function db(): PDO {
  static $db = null; if ($db) return $db;
  $f = ROOT . '/data/arcade.sqlite'; if (!is_file($f)) fail('falta data/arcade.sqlite');
  $db = new PDO('sqlite:' . $f, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  return $db;
}
function ajustes(): array { $o = []; foreach (db()->query('SELECT key, value FROM settings ORDER BY sort') as $r) $o[$r['key']] = $r['value']; return $o; }
function ajuste_set(string $k, string $v): void { $s = db()->prepare('UPDATE settings SET value = ? WHERE key = ?'); $s->execute([$v, $k]); if (!$s->rowCount()) fail("no existe el ajuste «$k»"); }
function tocado(): void { db()->prepare("UPDATE settings SET value = ? WHERE key = 'actualizado'")->execute([date('Y-m-d')]); }
/* juegos arcade (no educativos, no borrados) en orden */
function juegos_bd(): array { return db()->query("SELECT g.*, c.name_es AS ctrl_es, c.name_en AS ctrl_en FROM games g LEFT JOIN controls c ON c.id = g.control_id WHERE g.collection_id <> 'edu' AND g.deleted_at IS NULL ORDER BY g.sort, g.id")->fetchAll(); }
/* lee del código del juego (src/<id>.js) lo que no está en la base de datos */
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

/* ═════════════ catálogo: base de datos → games.js y config.js ═════════════ */
function entrada(array $g): array {
  return ['file' => $g['file'], 'id' => $g['id'], 'title' => $g['title_es'], 'emoji' => $g['emoji'], 'color' => $g['color'], 'origin' => (string)$g['origin'],
    'desc' => $g['desc_es'], 'ctrl' => $g['ctrl_es'], 'tv' => $g['tv'] ?: false, 'tag' => $g['tag_es'],
    'en' => ['title' => $g['title_en'], 'desc' => $g['desc_en'], 'tag' => $g['tag_en'], 'ctrl' => $g['ctrl_en']]];
}
function cmd_catalogo(): void {
  $A = ajustes(); $main = []; $pro = []; $mesa = [];
  foreach (juegos_bd() as $g) {
    if (!$g['file'] || !is_file(PWA . '/' . $g['file'])) continue;   // los externos y los que no tienen archivo no van a las portadas de la PWA
    $e = '  ' . jenc(entrada($g)) . ',';
    if ($g['collection_id'] === 'main') $main[] = $e; else $pro[] = $e;
    if ($g['collection_id'] === 'mesa') $mesa[] = $g['id'];
  }
  $js = "/* Arcade Perdido · lista de juegos.\n   GENERADO por herramientas/arcade.php desde data/arcade.sqlite: no lo edites a mano (usa el CMS en /cms).\n   La versión es el ajuste «version»: súbela cada vez que cambies archivos para que el móvil descargue la nueva. */\n"
    . "var ARCADE_VERSION = '" . $A['version'] . "';\nvar GAMES = [\n" . implode("\n", $main) . "\n];\n\n/* Colección Pro: mecánicas de los grandes éxitos de los juegos de móvil, hechas con JS y emojis. */\nvar GAMES_PRO = [\n" . implode("\n", $pro) . "\n];\n"
    . "// juegos de mesa por turnos (portada pwa/indexmesa y sección ♟️ de la portada de TV)\nvar GAMES_MESA = " . jenc($mesa) . ";\n";
  file_put_contents(PWA . '/games.js', $js);
  // ARCADE_CONFIG de config.js, con los ajustes de la base de datos
  $q = function ($v) { return "'" . addslashes((string)$v) . "'"; };
  $cfg = "var ARCADE_CONFIG = {\n  modo: " . $q($A['modo']) . ",\n  idioma: " . $q($A['idioma']) . ",\n  jugadoresMax: " . (int)$A['jugadores_max'] . ",\n  rondasMultijugador: " . (int)$A['rondas_multijugador'] . ",\n};";
  $c = (string)file_get_contents(PWA . '/config.js');
  $c2 = preg_replace('/var ARCADE_CONFIG = \{.*?\n\};/s', str_replace('$', '\$', $cfg), $c, 1);
  if ($c2 === null || strpos($c2, $cfg) === false) fail('no encuentro ARCADE_CONFIG en pwa/config.js');
  if ($c2 !== $c) file_put_contents(PWA . '/config.js', $c2);
  say('pwa/games.js: ' . count($main) . ' + ' . count($pro) . ' juegos · v' . $A['version'] . ' · config.js: ' . $A['modo'] . ', ' . $A['idioma']);
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
function guardar_based_on(string $id, string $origin): void {
  db()->prepare('DELETE FROM based_on WHERE game_id = ?')->execute([$id]);
  foreach (based_on($origin) as $k => [$n, $w, $y]) db()->prepare('INSERT INTO based_on VALUES (?,?,?,?,?)')->execute([$id, $k, $n, $w, $y]);
}
/* lo que manda el código del juego (no se edita en el CMS) */
function campos_codigo(array $i): array {
  $cap = $i['cap'] ?: 20;
  $lv = $i['levels'] === null ? 'endless' : ($i['levels'] === 0 ? (string)($cap <= 16 ? 60 : ($cap <= 20 ? 80 : ($cap <= 25 ? 100 : 120))) : (string)$i['levels']);
  $bg = $i['bg'] ?: [null, null];
  return ['help_es' => $i['help'], 'help_en' => $i['en']['help'], 'tvhelp_es' => $i['tvHelp'], 'tvhelp_en' => $i['en']['tvHelp'], 'lives' => $i['lives'], 'levels' => $lv, 'cap' => $i['cap'],
    'physics' => $i['phys'] ? 1 : 0, 'theme_color' => $i['theme'], 'bg1' => $bg[0], 'bg2' => $bg[1], 'font' => $i['font'], 'deco' => '[' . implode(', ', array_map('jenc', $i['deco'])) . ']'];
}
function upd(string $id, array $f): int {
  if (!$f) return 0; $set = implode(', ', array_map(function ($k) { return "$k = ?"; }, array_keys($f)));
  $s = db()->prepare("UPDATE games SET $set WHERE id = ?"); $s->execute(array_merge(array_values($f), [$id])); return $s->rowCount();
}
function cmd_sincronizar(array $ids): void {
  $rows = []; foreach (db()->query("SELECT * FROM games WHERE collection_id <> 'edu'") as $r) $rows[$r['id']] = $r;
  $ids = $ids ?: array_values(array_filter(array_keys($rows), function ($id) { return is_file(HERE . "/src/$id.js"); }));
  $n = 0;
  foreach ($ids as $id) {
    if (!isset($rows[$id])) fail("$id no está en la base de datos (usa «nuevo»)");
    $f = campos_codigo(info_juego($id)); $diff = [];
    foreach ($f as $k => $v) if ((string)$v !== (string)$rows[$id][$k] || ($v === null) !== ($rows[$id][$k] === null)) $diff[$k] = $v;
    if ($diff) { upd($id, $diff); $n++; }
  }
  if ($n) tocado();
  say("sincronizar: $n juegos actualizados desde su código (de " . count($ids) . ')');
}
function kv(array $args): array { $o = []; foreach ($args as $a) { if (!preg_match('/^([a-z_]+)=(.*)$/s', $a, $m)) fail("«$a» tiene que ser campo=valor"); $o[$m[1]] = $m[2]; } return $o; }
function cmd_nuevo(array $args): void {
  $id = (string)array_shift($args); if (!preg_match('/^[a-z0-9][a-z0-9-]*$/', $id)) fail('uso: nuevo <id> campo=valor …');
  if (db()->query('SELECT COUNT(*) FROM games WHERE id = ' . db()->quote($id))->fetchColumn()) fail("$id ya existe (usa «set» o «sincronizar»)");
  $o = kv($args); $i = info_juego($id);
  $alias = ['coleccion' => 'collection_id', 'categoria' => 'category_id', 'control' => 'control_id', 'version' => 'added_version'];
  foreach ($alias as $a => $c) if (isset($o[$a])) { $o[$c] = $o[$a]; unset($o[$a]); }
  if (isset($o['control_id'])) { $c = db()->prepare('SELECT id FROM controls WHERE id = ? OR name_es = ?'); $c->execute([$o['control_id'], $o['control_id']]); $o['control_id'] = $c->fetchColumn() ?: fail('control desconocido: ' . $o['control_id']); }
  $se = slugify((string)($i['en']['title'] ?: $id)) ?: $id; if (db()->query('SELECT COUNT(*) FROM games WHERE slug_en = ' . db()->quote($se))->fetchColumn()) $se .= '-' . $id;
  $row = array_merge(['id' => $id, 'slug_en' => $se, 'collection_id' => 'pro', 'category_id' => 'puzles', 'control_id' => 'tocar', 'file' => "$id.html", 'emoji' => $i['emoji'], 'color' => $i['color'],
    'title_es' => $i['title'], 'title_en' => $i['en']['title'] ?: $i['title'], 'tag_es' => $i['tag'], 'tag_en' => $i['en']['tag'] ?: $i['tag'], 'desc_es' => $i['tag'], 'desc_en' => $i['en']['tag'] ?: $i['tag'],
    'tv' => 'cursor', 'origin' => $i['origin'], 'added_version' => ajustes()['version'], 'sort' => -1 + (int)db()->query("SELECT MIN(sort) FROM games WHERE collection_id <> 'edu'")->fetchColumn(), 'langs' => 'es,en', 'url' => "pwa/$id.html"], campos_codigo($i), $o);
  if (($row['tv'] ?? '') === 'false' || ($row['tv'] ?? '') === '') $row['tv'] = null;
  $cols = array_keys($row);
  db()->prepare('INSERT INTO games (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')->execute(array_values($row));
  guardar_based_on($id, (string)$row['origin']); tocado();
  say("nuevo: $id en «{$row['collection_id']}» / «{$row['category_id']}» (sale el primero de la lista; cambia el orden con set $id sort=…)");
}
function cmd_set(array $args): void {
  $id = (string)array_shift($args); $o = kv($args); if (!$o) fail('uso: set <id> campo=valor …');
  $cols = array_column(db()->query('PRAGMA table_info(games)')->fetchAll(), 'name');
  foreach ($o as $k => $v) { if (!in_array($k, $cols, true) || $k === 'id') fail("campo desconocido: $k (columnas: " . implode(', ', $cols) . ')'); if ($v === 'null') $o[$k] = null; }
  if (!upd($id, $o)) fail("no existe el juego $id");
  if (isset($o['origin'])) guardar_based_on($id, (string)$o['origin']);
  tocado(); say("set: $id actualizado (" . implode(', ', array_keys($o)) . ')');
}
function cmd_ajuste(array $args): void {
  if (!$args) { foreach (db()->query('SELECT * FROM settings ORDER BY sort') as $r) say(str_pad($r['key'], 22) . str_pad($r['value'], 14) . '  ' . $r['label']); return; }
  if (count($args) === 1) { say(ajustes()[$args[0]] ?? fail("no existe el ajuste «{$args[0]}»")); return; }
  ajuste_set($args[0], $args[1]); say("ajuste: {$args[0]} = {$args[1]}");
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
  $err = []; $db = db();
  $sql = ["juegos con una categoría que no existe" => "SELECT id FROM games WHERE deleted_at IS NULL AND category_id NOT IN (SELECT id FROM categories WHERE deleted_at IS NULL)",
    "juegos con una colección que no existe" => "SELECT id FROM games WHERE deleted_at IS NULL AND collection_id NOT IN (SELECT id FROM collections)",
    "juegos con un control que no existe" => "SELECT id FROM games WHERE control_id IS NOT NULL AND control_id NOT IN (SELECT id FROM controls)",
    "educativos con una asignatura que no existe" => "SELECT id FROM games WHERE collection_id = 'edu' AND subject_id NOT IN (SELECT id FROM subjects)",
    "juegos con el modo de TV mal" => "SELECT id FROM games WHERE tv IS NOT NULL AND tv NOT IN ('cursor', 'cruceta')",
    "juegos sin título o sin descripción" => "SELECT id FROM games WHERE deleted_at IS NULL AND (title_es IS NULL OR title_es = '' OR desc_es IS NULL OR desc_es = '')"];
  foreach ($sql as $what => $q) { $ids = $db->query($q)->fetchAll(PDO::FETCH_COLUMN); if ($ids) $err[] = "$what: " . implode(', ', $ids); }
  foreach (['version', 'portada', 'modo', 'idioma', 'jugadores_max', 'rondas_multijugador'] as $k) if (!isset(ajustes()[$k])) $err[] = "falta el ajuste «$k»";
  if (!in_array(ajustes()['modo'] ?? '', ['automatico', 'seleccionable', 'modonormal', 'modotv'], true)) $err[] = 'el ajuste «modo» tiene que ser automatico, seleccionable, modonormal o modotv';
  if (!in_array(ajustes()['idioma'] ?? '', ['auto', 'es', 'en'], true)) $err[] = 'el ajuste «idioma» tiene que ser auto, es o en';
  $ids = [];
  foreach (juegos_bd() as $g) {
    $ids[$g['id']] = 1;
    if (is_file(HERE . "/src/{$g['id']}.js")) { try { info_juego($g['id']); } catch (Throwable $e) { $err[] = $e->getMessage(); } }
    elseif (!preg_match('#^https?://#', (string)$g['url']) && (!$g['file'] || !is_file(PWA . '/' . $g['file']))) $err[] = "{$g['id']}: no tiene src/{$g['id']}.js ni archivo en pwa/";
  }
  foreach (glob(HERE . '/src/*.js') as $f) if (!isset($ids[basename($f, '.js')])) say('⚠ ' . basename($f) . ' no está en la base de datos (no saldrá en la web): php herramientas/arcade.php nuevo ' . basename($f, '.js') . ' …');
  foreach ($err as $e) say("✗ $e");
  if ($err) fail(count($err) . ' problemas');
  say('✓ todo en orden: ' . count($ids) . ' juegos arcade');
}

/* capturas: pwa/capturas/<id>.webp (960×600) y <id>-sm.webp (400×250) para el listado y la ficha.
   Abre cada juego en Chromium sin ventana con ?shot=1 (el motor arranca la demo sin rótulos y adelanta 6 s). */
function chrome_bin(): string {
  $c = array_filter(array_merge([getenv('CHROME') ?: ''], glob('/opt/pw-browsers/chromium_headless_shell-*/*/headless_shell') ?: [], glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome') ?: [],
    ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']));
  foreach ($c as $b) if (is_file($b)) return $b;
  fail('no encuentro Chrome/Chromium: indica la ruta con la variable CHROME');
}
function cmd_capturas(array $args): void {
  if (!function_exists('imagewebp')) fail('falta la extensión gd de PHP (con WebP)');
  $faltan = in_array('--faltan', $args, true); $secs = ''; foreach ($args as $a) if (preg_match('/^--t=(\d+)$/', $a, $m)) $secs = '&t=' . $m[1]; $ids = array_values(array_filter($args, function ($a) { return $a[0] !== '-'; }));
  $bin = chrome_bin(); $dir = PWA . '/capturas'; if (!is_dir($dir)) mkdir($dir, 0775, true);
  $todo = [];
  foreach (db()->query("SELECT id, url, collection_id FROM games WHERE deleted_at IS NULL ORDER BY sort, id") as $g) {
    if ($ids && !in_array($g['id'], $ids, true)) continue;
    if (preg_match('#^https?://#', (string)$g['url'])) continue;                        // externos: no
    if ($faltan && is_file("$dir/{$g['id']}.webp")) continue;
    if ($g['collection_id'] !== 'edu') $path = '/' . $g['id'] . '?shot=1&lang=es' . $secs;
    elseif (strpos((string)$g['url'], 'pwa/') === 0) $path = '/' . preg_replace('/\.html$/', '', substr($g['url'], 4)) . '?shot=1&lang=es';
    else { $u = ltrim((string)$g['url'], '/'); $path = '/' . $u . (strpos($u, '?') === false ? '?' : '&') . 'lang=es'; }
    $todo[$g['id']] = $path;
  }
  if (!$todo) { say('capturas: nada que hacer'); return; }
  $port = 8790 + random_int(0, 150); $tmp = sys_get_temp_dir() . '/arcade-cap-' . getmypid(); @mkdir($tmp);
  $srv = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port", '-t', ROOT, HERE . '/router.php'], [['file', '/dev/null', 'r'], ['file', $tmp . '/srv.log', 'w'], ['file', $tmp . '/srv.log', 'a']], $pp);
  for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);
  $run = []; $ok = 0; $q = $todo; $par = max(1, (int)(getenv('PARALELO') ?: 4));
  while ($q || $run) {
    while ($q && count($run) < $par) {
      $id = array_key_first($q); $path = array_shift($q); $png = "$tmp/$id.png";
      $cmd = [$bin, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--lang=es-ES', '--force-prefers-reduced-motion', '--user-data-dir=' . "$tmp/p-$id",
        '--force-device-scale-factor=1.5', '--window-size=640,400', '--virtual-time-budget=' . (getenv('ESPERA') ?: 9000), '--screenshot=' . $png, "http://127.0.0.1:$port$path"];
      $run[$id] = [proc_open($cmd, [['file', '/dev/null', 'r'], ['file', '/dev/null', 'w'], ['file', '/dev/null', 'w']], $p2), $png, time()];
    }
    foreach ($run as $id => [$pr, $png, $t0]) {
      $st = proc_get_status($pr);
      if ($st['running'] && time() - $t0 < 60) continue;
      if ($st['running']) proc_terminate($pr, 9);
      proc_close($pr); unset($run[$id]);
      $im = is_file($png) ? @imagecreatefrompng($png) : false;
      if (!$im) { say("✗ $id: sin captura"); continue; }
      foreach ([['', 960, 600, 80], ['-sm', 400, 250, 74]] as [$suf, $w, $h, $qq]) {
        $o = imagecreatetruecolor($w, $h); imagecopyresampled($o, $im, 0, 0, 0, 0, $w, $h, imagesx($im), imagesy($im)); imagewebp($o, "$dir/$id$suf.webp", $qq); imagedestroy($o);
      }
      imagedestroy($im); @unlink($png); $ok++;
      if (!defined('ARCADE_QUIET') && $ok % 10 === 0) echo "  $ok/", count($todo), "\n";
    }
    usleep(150000);
  }
  proc_terminate($srv); proc_close($srv);
  exec('rm -rf ' . escapeshellarg($tmp));
  say("capturas: $ok de " . count($todo) . " en pwa/capturas/");
}

/* ═════════════ main ═════════════ */
if (defined('ARCADE_LIB')) return;
$args = array_slice($argv, 1); $cmd = array_shift($args) ?? 'ayuda';
try {
  if (!extension_loaded('pdo_sqlite')) fail('falta la extensión pdo_sqlite de PHP');
  switch ($cmd) {
    case 'juegos': cmd_juegos($args); break;
    case 'sincronizar': cmd_sincronizar($args); break;
    case 'nuevo': cmd_nuevo($args); break;
    case 'set': cmd_set($args); break;
    case 'ajuste': cmd_ajuste($args); break;
    case 'catalogo': cmd_catalogo(); break;
    case 'huellas': cmd_huellas(); break;
    case 'autonomos': cmd_autonomos($args); break;
    case 'comprobar': cmd_comprobar(); break;
    case 'capturas': cmd_capturas($args); break;
    case 'todo': cmd_comprobar(); cmd_juegos([]); cmd_sincronizar([]); cmd_catalogo(); cmd_huellas(); cmd_autonomos($args);
      try { cmd_capturas(['--faltan']); } catch (Throwable $e) { say('⚠ capturas: ' . $e->getMessage()); } break;
    default: echo preg_replace('/^.*?Uso/s', 'Uso', explode('*/', (string)file_get_contents(__FILE__), 2)[0] ?? ''), "\n";
  }
} catch (Throwable $e) { fwrite(STDERR, '✗ ' . $e->getMessage() . "\n"); exit(1); }
