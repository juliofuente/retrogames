<?php
/* Arcade Perdido · CMS
   ─────────────────────────────────────────────────────────────────────────────
   Panel para añadir, editar y borrar juegos, cambiarlos de categoría o colección, editar categorías y colecciones y
   cambiar los ajustes de la web (versión, portada, modo TV, idioma…). Se entra en /cms (o /cms.php). La primera vez
   pide crear la contraseña.

   Todo se guarda directamente en data/arcade.sqlite, que es donde vive toda la configuración del catálogo. Tras cada
   cambio se regeneran pwa/games.js y pwa/config.js (con herramientas/arcade.php) para que las portadas de la PWA y la
   tele lo vean al momento. La contraseña y el historial del CMS van aparte, en data/cms.sqlite (fuera de git).   */

declare(strict_types=1);
require_once __DIR__ . '/sites.php';

const CMS_INT = ['sort', 'lives', 'cap', 'physics', 'age_min', 'age_max'];
const CMS_KINDS = ['game' => 'games', 'category' => 'categories', 'collection' => 'collections'];
// lo que sale del código del juego (src/<id>.js): se copia solo con «arcade.php sincronizar» y no se edita aquí
const CMS_CODE = ['help_es', 'help_en', 'tvhelp_es', 'tvhelp_en', 'lives', 'levels', 'cap', 'physics', 'theme_color', 'bg1', 'bg2', 'font', 'deco'];

function cms_db(): PDO {   // solo contraseña, intentos de entrada e historial
  static $db = null; if ($db) return $db;
  $db = new PDO('sqlite:' . __DIR__ . '/data/cms.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $db->exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
  $db->exec('CREATE TABLE IF NOT EXISTS log (ts INTEGER, kind TEXT, id TEXT, action TEXT, summary TEXT)');
  $db->exec('CREATE TABLE IF NOT EXISTS logins (ip TEXT, ts INTEGER)');
  return $db;
}
function arcade_db(): PDO {
  static $db = null; if ($db) return $db;
  $f = __DIR__ . '/data/arcade.sqlite';
  if (!is_file($f)) { http_response_code(503); exit('Falta data/arcade.sqlite'); }
  $db = new PDO('sqlite:' . $f, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $db->exec('PRAGMA busy_timeout = 4000');
  return $db;
}
function cms_cast(array $row): array {
  foreach (CMS_INT as $k) if (array_key_exists($k, $row)) $row[$k] = $row[$k] === '' || $row[$k] === null ? null : (int)$row[$k];
  return $row;
}
/* migración: los cambios que guardaba la primera versión del CMS en data/cms.sqlite pasan a arcade.sqlite */
function cms_migrar(): void {
  $db = cms_db();
  if (!$db->query("SELECT COUNT(*) FROM sqlite_master WHERE name = 'overrides'")->fetchColumn()) return;
  $a = arcade_db(); $a->beginTransaction();
  foreach ($db->query('SELECT * FROM overrides') as $o) {
    $t = CMS_KINDS[$o['kind']] ?? null; if (!$t) continue; $d = json_decode((string)$o['data'], true) ?: [];
    $ages = $d['ages'] ?? null; unset($d['ages'], $d['_st'], $d['_was_new'], $d['based']);
    $cols = array_column($a->query("PRAGMA table_info($t)")->fetchAll(), 'name'); $d = array_intersect_key($d, array_flip($cols));
    $exists = (bool)$a->query("SELECT COUNT(*) FROM $t WHERE id = " . $a->quote($o['id']))->fetchColumn();
    if ($o['state'] === 'deleted') { if ($exists) $a->prepare("UPDATE $t SET deleted_at = ? WHERE id = ?")->execute([(int)$o['updated'], $o['id']]); continue; }
    if ($exists && $d) { $a->prepare("UPDATE $t SET " . implode(', ', array_map(function ($k) { return "$k = ?"; }, array_keys($d))) . ' WHERE id = ?')->execute(array_merge(array_values($d), [$o['id']])); }
    elseif (!$exists) { $d['id'] = $o['id']; $a->prepare("INSERT INTO $t (" . implode(',', array_keys($d)) . ') VALUES (' . implode(',', array_fill(0, count($d), '?')) . ')')->execute(array_values($d)); }
    if ($t === 'games' && is_array($ages)) { $a->prepare('DELETE FROM game_age_groups WHERE game_id = ?')->execute([$o['id']]); foreach ($ages as $g) $a->prepare('INSERT INTO game_age_groups VALUES (?, ?)')->execute([$o['id'], $g]); }
  }
  $a->commit(); $db->exec('DROP TABLE overrides');
}

ini_set('display_errors', '0');
$CMS_URL = $CMS_URL ?? ($_SERVER['SCRIPT_NAME'] ?? '/cms.php');
$SITE_URL = $SITE_URL ?? rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/';
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('arc_cms');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => $https]);
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

function e($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function cms_url(array $q = []): string { global $CMS_URL; return $CMS_URL . ($q ? '?' . http_build_query($q) : ''); }
function go(array $q = [], string $flash = ''): void { $w = cms_regen(); if ($w) $flash = trim($flash . ' ⚠️ ' . $w); if ($flash !== '') $_SESSION['flash'] = $flash; header('Location: ' . cms_url($q), true, 303); exit; }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . e(csrf()) . '">'; }
function check_csrf(): void { if (!hash_equals(csrf(), (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Sesión caducada: vuelve atrás y recarga la página.'); } }
function setting(string $k): ?string { $db = cms_db(); $s = $db->prepare('SELECT value FROM settings WHERE key = ?'); $s->execute([$k]); $v = $s->fetchColumn(); return $v === false ? null : (string)$v; }
function set_setting(string $k, string $v): void { cms_db()->prepare('REPLACE INTO settings (key, value) VALUES (?, ?)')->execute([$k, $v]); }
function cms_log(string $kind, string $id, string $action, string $summary = ''): void { cms_db()->prepare('INSERT INTO log VALUES (?, ?, ?, ?, ?)')->execute([time(), $kind, $id, $action, mb_substr($summary, 0, 300)]); }

function ages_of(string $id): array { $s = arcade_db()->prepare('SELECT age_group_id FROM game_age_groups WHERE game_id = ?'); $s->execute([$id]); return $s->fetchAll(PDO::FETCH_COLUMN); }
/* filas de una tabla (games/categories/collections), sin las de la papelera salvo que se pidan */
function rows(string $kind, bool $deleted = false): array {
  $t = CMS_KINDS[$kind]; $hasDel = $kind !== 'collection'; $out = [];
  $w = $hasDel ? ($deleted ? ' WHERE deleted_at IS NOT NULL' : ' WHERE deleted_at IS NULL') : '';
  foreach (arcade_db()->query("SELECT * FROM $t$w ORDER BY sort, id") as $r) { if ($kind === 'game') $r['ages'] = []; $out[$r['id']] = $r; }
  if ($kind === 'game' && $out) foreach (arcade_db()->query('SELECT * FROM game_age_groups') as $r) if (isset($out[$r['game_id']])) $out[$r['game_id']]['ages'][] = $r['age_group_id'];
  return $out;
}
function row(string $kind, string $id): ?array { $s = arcade_db()->prepare('SELECT * FROM ' . CMS_KINDS[$kind] . ' WHERE id = ?'); $s->execute([$id]); $r = $s->fetch(); if ($r && $kind === 'game') $r['ages'] = ages_of($id); return $r ?: null; }
/* guarda (crea o actualiza) y apunta en el historial qué ha cambiado */
function save_item(string $kind, string $id, array $row, string $action): void {
  $t = CMS_KINDS[$kind]; $a = arcade_db(); $old = row($kind, $id); $row = cms_cast($row);
  $ages = $row['ages'] ?? null; unset($row['ages'], $row['id']);
  $cols = array_column($a->query("PRAGMA table_info($t)")->fetchAll(), 'name'); $row = array_intersect_key($row, array_flip($cols));
  $a->beginTransaction();
  if ($old) {
    $diff = []; foreach ($row as $k => $v) if (($v === null ? '' : (string)$v) !== ($old[$k] === null ? '' : (string)$old[$k])) $diff[$k] = $v;
    if ($diff) $a->prepare("UPDATE $t SET " . implode(', ', array_map(function ($k) { return "$k = ?"; }, array_keys($diff))) . ' WHERE id = ?')->execute(array_merge(array_values($diff), [$id]));
    $chg = array_keys($diff);
  } else { $row['id'] = $id; $a->prepare("INSERT INTO $t (" . implode(',', array_keys($row)) . ') VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')')->execute(array_values($row)); $chg = []; }
  if ($kind === 'game' && is_array($ages)) { $x = $ages; $y = $old['ages'] ?? []; sort($x); sort($y); if ($x !== $y) { $a->prepare('DELETE FROM game_age_groups WHERE game_id = ?')->execute([$id]); foreach ($ages as $g) $a->prepare('INSERT INTO game_age_groups VALUES (?, ?)')->execute([$id, $g]); $chg[] = 'edades'; } }
  if ($kind === 'game' && isset($row['origin']) && (!$old || $row['origin'] !== $old['origin'])) { $a->prepare('DELETE FROM based_on WHERE game_id = ?')->execute([$id]); foreach (cms_based_on((string)$row['origin']) as $k => [$n, $w, $y2]) $a->prepare('INSERT INTO based_on VALUES (?,?,?,?,?)')->execute([$id, $k, $n, $w, $y2]); }
  $a->commit();
  cms_log($kind, $id, $action, $old ? (implode(', ', $chg) ?: 'sin cambios') : ''); if (!$old || $chg) cms_changed();
}
function patch_item(string $kind, string $id, array $changes, string $action): void { $r = row($kind, $id); if ($r) save_item($kind, $id, array_merge($r, $changes), $action); }
function delete_item(string $kind, string $id): void { $r = row($kind, $id); if (!$r) return; arcade_db()->prepare('UPDATE ' . CMS_KINDS[$kind] . ' SET deleted_at = ? WHERE id = ?')->execute([time(), $id]); cms_log($kind, $id, 'a la papelera', (string)($r['title_es'] ?? $r['name_es'] ?? '')); cms_changed(); }
function restore_item(string $kind, string $id): void { arcade_db()->prepare('UPDATE ' . CMS_KINDS[$kind] . ' SET deleted_at = NULL WHERE id = ?')->execute([$id]); cms_log($kind, $id, 'recuperado'); cms_changed(); }
function purge_item(string $kind, string $id): void {   // borrar para siempre (solo desde la papelera)
  $a = arcade_db(); $r = row($kind, $id); if (!$r || $r['deleted_at'] === null) return;
  $a->beginTransaction();
  if ($kind === 'game') { $a->prepare('DELETE FROM game_age_groups WHERE game_id = ?')->execute([$id]); $a->prepare('DELETE FROM based_on WHERE game_id = ?')->execute([$id]); }
  $a->prepare('DELETE FROM ' . CMS_KINDS[$kind] . ' WHERE id = ?')->execute([$id]); $a->commit(); cms_log($kind, $id, 'eliminado del todo');
}
function cms_based_on(string $origin): array {   // «Pac-Man (Namco, 1980) / Ms. Pac-Man» → [[nombre, empresa, año], …]
  $out = [];
  foreach (preg_split('/\s*\/\s*|\s*·\s*/u', $origin) as $part) {
    $part = trim($part); if ($part === '') continue; $name = $part; $who = null; $year = null;
    if (preg_match('/^(.*?)\s*\((.*)\)\s*$/su', $part, $m)) { $name = trim($m[1]); if (preg_match('/\b(19|20)\d\d\b/', $m[2], $y)) $year = (int)$y[0]; $who = trim((string)preg_replace('/,?\s*\b(19|20)\d\d\b/', '', $m[2]), ' ,') ?: null; }
    $out[] = [$name, $who, $year];
  }
  return $out;
}
function cms_ajustes(): array { $o = []; foreach (arcade_db()->query('SELECT * FROM settings ORDER BY sort') as $r) $o[$r['key']] = $r; return $o; }
/* tras cada cambio: fecha del catálogo y archivos de la PWA (games.js, config.js y huellas ?v=) al día */
function cms_changed(): void {
  arcade_db()->prepare("UPDATE settings SET value = ? WHERE key = 'actualizado'")->execute([date('Y-m-d')]);
  $GLOBALS['cms_regen'] = true;
}
function cms_regen(): ?string {
  if (empty($GLOBALS['cms_regen'])) return null; $GLOBALS['cms_regen'] = false;
  $tool = __DIR__ . '/herramientas/arcade.php'; if (!is_file($tool)) return 'no está herramientas/arcade.php: las portadas de la PWA no se han actualizado';
  try { if (!defined('ARCADE_LIB')) define('ARCADE_LIB', 1); if (!defined('ARCADE_QUIET')) define('ARCADE_QUIET', 1); require_once $tool; cmd_catalogo(); cmd_huellas(); return null; }
  catch (Throwable $e) { return 'Guardado, pero no se han podido regenerar los archivos de la PWA: ' . $e->getMessage(); }
}
function cms_slug(string $s): string { $s = mb_strtolower(trim($s)); $s = strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n', 'à' => 'a', 'è' => 'e', 'ç' => 'c']); $s = preg_replace('/[^a-z0-9]+/', '-', $s); return trim((string)$s, '-'); }
function client_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? '?'); }
function lists(): array { static $l = null; if ($l) return $l; $l = ['cat' => rows('category'), 'col' => rows('collection'), 'ctrl' => [], 'subj' => [], 'age' => []]; foreach (arcade_db()->query('SELECT * FROM controls') as $r) $l['ctrl'][$r['id']] = $r; foreach (arcade_db()->query('SELECT * FROM subjects ORDER BY sort') as $r) $l['subj'][$r['id']] = $r; foreach (arcade_db()->query('SELECT * FROM age_groups ORDER BY sort') as $r) $l['age'][$r['id']] = $r; return $l; }
function options(array $items, ?string $sel, string $label = 'name_es', bool $empty = false): string {
  $h = $empty ? '<option value="">—</option>' : '';
  foreach ($items as $id => $r) $h .= '<option value="' . e($id) . '"' . ((string)$sel === (string)$id ? ' selected' : '') . '>' . e(trim(($r['emoji'] ?? '') . ' ' . ($r[$label] ?? $id))) . '</option>';
  return $h;
}
function pwa_files(): array { $o = []; foreach (glob(__DIR__ . '/pwa/*.html') ?: [] as $f) { $b = basename($f); if (!preg_match('/^index/', $b)) $o[] = $b; } sort($o); return $o; }

/* ───────── página ───────── */
function page(string $title, string $body, string $tab = ''): void {
  global $SITE_URL; $flash = $_SESSION['flash'] ?? ''; unset($_SESSION['flash']); $logged = !empty($_SESSION['cms_ok']);
  $tabs = ['games' => '🎮 Juegos', 'cats' => '🗂️ Categorías', 'cols' => '📚 Colecciones', 'webs' => '🌐 Webs', 'ajustes' => '⚙️ Ajustes', 'trash' => '🗑️ Papelera', 'log' => '🕓 Historial', 'backup' => '💾 Copia'];
  header('Content-Type: text/html; charset=utf-8'); ?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title><?= e($title) ?> · CMS Arcade Perdido</title>
<style>
:root{--bg:#f4f1ea;--card:#fff;--ink:#1d1b26;--mut:#6b6778;--line:#e3ded2;--acc:#ff6b4a;--acc2:#2f6fdb;--ok:#2f9e44;--warn:#e8590c;--bad:#d6336c;--chip:#efeae0}
@media (prefers-color-scheme:dark){:root{--bg:#15131c;--card:#1f1c29;--ink:#f1eef8;--mut:#a39fb3;--line:#322e40;--chip:#2a2637}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--acc2)}header{background:var(--ink);color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
@media (prefers-color-scheme:dark){header{background:#0c0b11}}
header b{font-size:17px}header a{color:#fff;opacity:.85;text-decoration:none}header .sp{flex:1}
nav{display:flex;gap:4px;padding:8px 12px;background:var(--card);border-bottom:1px solid var(--line);overflow-x:auto}
nav a{padding:7px 12px;border-radius:999px;text-decoration:none;color:var(--ink);white-space:nowrap}nav a.on{background:var(--ink);color:var(--bg)}
main{max-width:1180px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 14px}h2{font-size:17px;margin:22px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:14px}
.flash{background:#d3f9d8;color:#0b3d17;border-radius:10px;padding:10px 14px;margin-bottom:14px}
.err{background:#ffe3e3;color:#5c0b0b}
.btn,button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;background:var(--chip);color:var(--ink);text-decoration:none}
.btn.pri,button.pri{background:var(--acc);color:#fff}.btn.blue{background:var(--acc2);color:#fff}.btn.sm,button.sm{padding:4px 9px;font-size:13px;border-radius:8px}.btn.bad,button.bad{background:var(--bad);color:#fff}
input,select,textarea{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:7px 9px;width:100%}
textarea{min-height:90px;resize:vertical}input[type=checkbox],input[type=radio]{width:auto}
label{display:block;font-size:13px;color:var(--mut);font-weight:600;margin-bottom:3px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px 14px}.grid .w2{grid-column:span 2}.grid .full{grid-column:1/-1}
@media (max-width:560px){.grid .w2{grid-column:1/-1}}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.bar>*{width:auto}.bar input[type=search]{flex:1;min-width:180px}
table{width:100%;border-collapse:collapse}th,td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}tr:hover td{background:color-mix(in srgb,var(--chip) 55%,transparent)}
td.em{font-size:24px;width:40px;text-align:center}.t b{display:block}.t small{color:var(--mut)}
td select{min-width:150px;padding:4px 6px}
.st{font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;white-space:nowrap}.st.edit{background:#fff3bf;color:#7a5a00}.st.new{background:#d3f9d8;color:#0b5a1f}.st.deleted{background:#ffe3e3;color:#7a0b0b}
.mut{color:var(--mut)}.right{text-align:right}.acts{white-space:nowrap;text-align:right}
.count{font-size:13px;color:var(--mut)}
@media (max-width:760px){table.resp thead{display:none}table.resp tr{display:grid;grid-template-columns:40px 1fr auto;gap:4px 8px;padding:10px 0;border-bottom:1px solid var(--line);align-items:center}table.resp tr:has(td.ck){grid-template-columns:26px 40px 1fr}table.resp td{border:0;padding:2px}table.resp td.hide-m{display:none}table.resp td.wide,table.resp td.acts{grid-column:2/-1;text-align:left}table.resp tr:not(:has(td.ck)) td.acts{grid-column:1/-1}table.resp td.wide select{width:100%}.bar select{flex:1}}
.login{max-width:360px;margin:9vh auto}.login .card{padding:24px}
.hint{font-size:13px;color:var(--mut);margin:6px 0 0}
.saved{color:var(--ok);font-weight:700;font-size:12px;margin-left:4px}
</style></head><body>
<header><b>🕹️ CMS · Arcade Perdido</b><span class="sp"></span><a href="<?= e($SITE_URL) ?>" target="_blank">Ver la web ↗</a><?php if ($logged): ?><a href="<?= e(cms_url(['p' => 'pass'])) ?>">🔑 Contraseña</a><form method="post" action="<?= e(cms_url(['p' => 'logout'])) ?>" style="margin:0"><?= csrf_field() ?><button class="sm">Salir</button></form><?php endif ?></header>
<?php if ($logged): ?><nav><?php foreach ($tabs as $k => $v): ?><a class="<?= $tab === $k ? 'on' : '' ?>" href="<?= e(cms_url(['p' => $k])) ?>"><?= $v ?></a><?php endforeach ?></nav><?php endif ?>
<main><?php if ($flash): ?><div class="flash"><?= e($flash) ?></div><?php endif ?><?= $body ?></main>
<script>
document.addEventListener('change', async (ev) => { // cambios rápidos desde la tabla (categoría, colección)
  const el = ev.target; if (!el.dataset.quick) return;
  const fd = new FormData(); fd.append('csrf', <?= json_encode(csrf()) ?>); fd.append('id', el.dataset.id); fd.append('field', el.dataset.quick); fd.append('value', el.value);
  el.disabled = true;
  try { const r = await fetch(<?= json_encode(cms_url(['p' => 'quick'])) ?>, { method: 'POST', body: fd }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
    let s = el.parentNode.querySelector('.saved'); if (!s) { s = document.createElement('span'); s.className = 'saved'; el.parentNode.appendChild(s); } s.textContent = '✓ guardado'; setTimeout(() => s.remove(), 1600);
    if (j.warn) alert(j.warn);
  } catch (e) { alert('No se ha podido guardar: ' + e.message); } finally { el.disabled = false; }
});
document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-confirm]'); if (b && !confirm(b.dataset.confirm)) ev.preventDefault(); });
const all = document.getElementById('selall'); if (all) all.addEventListener('change', () => document.querySelectorAll('input[name="ids[]"]').forEach((c) => { if (c.closest('tr').style.display !== 'none') c.checked = all.checked; }));
const q = document.getElementById('q'); if (q) q.addEventListener('input', () => { const t = q.value.toLowerCase().trim(); let n = 0; document.querySelectorAll('tbody tr[data-s]').forEach((tr) => { const on = !t || tr.dataset.s.includes(t); tr.style.display = on ? '' : 'none'; if (on) n++; }); const c = document.getElementById('cnt'); if (c) c.textContent = n; });
</script>
</body></html><?php
  exit;
}

/* ───────── acceso ───────── */
$p = (string)($_GET['p'] ?? 'games');
$hash = setting('password');

if ($hash === null) { // primera vez: crear contraseña
  $err = '';
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf(); $a = (string)($_POST['pass'] ?? ''); $b = (string)($_POST['pass2'] ?? '');
    if (mb_strlen($a) < 8) $err = 'La contraseña tiene que tener al menos 8 caracteres.'; elseif ($a !== $b) $err = 'Las dos contraseñas no coinciden.';
    else { set_setting('password', password_hash($a, PASSWORD_DEFAULT)); session_regenerate_id(true); $_SESSION['cms_ok'] = 1; cms_log('cms', '-', 'contraseña creada'); go([], 'Contraseña creada. ¡Bienvenido al CMS!'); }
  }
  page('Crear contraseña', '<div class="login"><div class="card"><h1>Crear contraseña</h1><p class="mut">Es la primera vez que entras. Elige la contraseña del CMS (mínimo 8 caracteres).</p>' . ($err ? '<div class="flash err">' . e($err) . '</div>' : '') . '<form method="post">' . csrf_field() . '<p><label>Contraseña</label><input type="password" name="pass" autocomplete="new-password" required autofocus></p><p><label>Repítela</label><input type="password" name="pass2" autocomplete="new-password" required></p><button class="pri">Crear y entrar</button></form></div></div>');
}

if (empty($_SESSION['cms_ok'])) {
  $err = '';
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf(); $db = cms_db(); $ip = client_ip();
    $db->prepare('DELETE FROM logins WHERE ts < ?')->execute([time() - 900]);
    $s = $db->prepare('SELECT COUNT(*) FROM logins WHERE ip = ?'); $s->execute([$ip]);
    if ((int)$s->fetchColumn() >= 6) $err = 'Demasiados intentos. Espera unos minutos.';
    elseif (password_verify((string)($_POST['pass'] ?? ''), $hash)) { $db->prepare('DELETE FROM logins WHERE ip = ?')->execute([$ip]); session_regenerate_id(true); $_SESSION['cms_ok'] = 1; go(); }
    else { $db->prepare('INSERT INTO logins VALUES (?, ?)')->execute([$ip, time()]); usleep(400000); $err = 'Contraseña incorrecta.'; }
  }
  page('Entrar', '<div class="login"><div class="card"><h1>Entrar</h1>' . ($err ? '<div class="flash err">' . e($err) . '</div>' : '') . '<form method="post">' . csrf_field() . '<p><label>Contraseña</label><input type="password" name="pass" autocomplete="current-password" required autofocus></p><button class="pri">Entrar</button></form></div></div>');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') check_csrf();
cms_migrar();

/* ───────── acciones ───────── */
if ($p === 'logout') { $_SESSION = []; session_destroy(); header('Location: ' . cms_url(), true, 303); exit; }

if ($p === 'pass') {
  $err = '';
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = (string)($_POST['pass'] ?? '');
    if (!password_verify((string)($_POST['old'] ?? ''), $hash)) $err = 'La contraseña actual no es correcta.'; elseif (mb_strlen($a) < 8) $err = 'Mínimo 8 caracteres.'; elseif ($a !== ($_POST['pass2'] ?? '')) $err = 'No coinciden.';
    else { set_setting('password', password_hash($a, PASSWORD_DEFAULT)); cms_log('cms', '-', 'contraseña cambiada'); go([], 'Contraseña cambiada.'); }
  }
  page('Contraseña', '<div class="login" style="margin-top:2vh"><div class="card"><h1>Cambiar contraseña</h1>' . ($err ? '<div class="flash err">' . e($err) . '</div>' : '') . '<form method="post">' . csrf_field() . '<p><label>Actual</label><input type="password" name="old" required></p><p><label>Nueva</label><input type="password" name="pass" required></p><p><label>Repite la nueva</label><input type="password" name="pass2" required></p><button class="pri">Guardar</button></form></div></div>');
}

if ($p === 'quick' && $_SERVER['REQUEST_METHOD'] === 'POST') { // cambio rápido desde la tabla
  header('Content-Type: application/json');
  $id = (string)($_POST['id'] ?? ''); $f = (string)($_POST['field'] ?? ''); $v = (string)($_POST['value'] ?? ''); $L = lists();
  $okv = ['category_id' => $L['cat'], 'collection_id' => $L['col']];
  if (!isset($okv[$f]) || !isset($okv[$f][$v]) || !isset(rows('game')[$id])) { echo json_encode(['ok' => false, 'error' => 'datos no válidos']); exit; }
  patch_item('game', $id, [$f => $v], $f === 'category_id' ? 'cambio de categoría' : 'cambio de colección');
  echo json_encode(['ok' => true, 'warn' => cms_regen()]); exit;
}

if ($p === 'bulk' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $ids = array_values(array_filter((array)($_POST['ids'] ?? []), 'is_string')); $do = (string)($_POST['do'] ?? ''); $L = lists(); $n = 0; $all = rows('game');
  foreach ($ids as $id) {
    if (!isset($all[$id])) continue;
    if ($do === 'cat' && isset($L['cat'][$_POST['cat'] ?? ''])) { patch_item('game', $id, ['category_id' => $_POST['cat']], 'cambio de categoría'); $n++; }
    elseif ($do === 'col' && isset($L['col'][$_POST['col'] ?? ''])) { patch_item('game', $id, ['collection_id' => $_POST['col']], 'cambio de colección'); $n++; }
    elseif ($do === 'delete') { delete_item('game', $id); $n++; }
  }
  go(['p' => 'games'] + array_intersect_key($_GET, ['cat' => 1, 'col' => 1, 'st' => 1]), $n ? "Hecho en $n juegos." : 'No se ha cambiado nada (¿has marcado algún juego y elegido el destino?).');
}

if (in_array($p, ['delete', 'restore', 'purge'], true) && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $kind = (string)($_POST['kind'] ?? 'game'); $id = (string)($_POST['id'] ?? ''); if (!isset(CMS_KINDS[$kind])) go();
  if ($p === 'delete' && $kind === 'category') {
    $to = (string)($_POST['to'] ?? ''); $cats = rows('category');
    if (!isset($cats[$to]) || $to === $id) go(['p' => 'cats'], 'Elige a qué categoría pasan sus juegos.');
    $n = 0; foreach (rows('game') as $gid => $g) if (($g['category_id'] ?? '') === $id) { patch_item('game', $gid, ['category_id' => $to], 'cambio de categoría (se borró «' . ($cats[$id]['name_es'] ?? $id) . '»)'); $n++; }
    delete_item('category', $id); go(['p' => 'cats'], "Categoría borrada. $n juegos pasan a «" . $cats[$to]['name_es'] . '».');
  }
  if ($p === 'delete') delete_item($kind, $id); elseif ($p === 'restore') restore_item($kind, $id); else purge_item($kind, $id);
  $msg = ['delete' => 'Enviado a la papelera (se puede recuperar).', 'restore' => 'Recuperado.', 'purge' => 'Eliminado del todo.'][$p];
  $back = (string)($_POST['back'] ?? ''); go($back === 'trash' ? ['p' => 'trash'] : ($kind === 'category' ? ['p' => 'cats'] : ($kind === 'collection' ? ['p' => 'cols'] : ['p' => 'games'])), $msg);
}

/* ───────── juegos: lista ───────── */
if ($p === 'games') {
  $L = lists(); $games = rows('game');
  $fc = (string)($_GET['cat'] ?? ''); $fl = (string)($_GET['col'] ?? ''); $fs = (string)($_GET['st'] ?? '');
  $list = array_filter($games, function ($g) use ($fc, $fl, $fs) { return ($fc === '' || $g['category_id'] === $fc) && ($fl === '' || $g['collection_id'] === $fl) && ($fs === '' || ($fs === 'ext' ? preg_match('#^https?://#', (string)$g['url']) : ($fs === 'edu' ? $g['collection_id'] === 'edu' : $g['collection_id'] !== 'edu'))); });
  $catsOpt = function ($sel) use ($L) { return options($L['cat'], $sel); };
  ob_start(); ?>
  <h1>Juegos <span class="count">(<span id="cnt"><?= count($list) ?></span> de <?= count($games) ?>)</span></h1>
  <form class="bar" method="get" action="<?= e(cms_url()) ?>"><input type="hidden" name="p" value="games">
    <input type="search" id="q" placeholder="🔎 Buscar por nombre o id…" autocomplete="off">
    <select name="col" onchange="this.form.submit()"><option value="">Todas las colecciones</option><?= options($L['col'], $fl) ?></select>
    <select name="cat" onchange="this.form.submit()"><option value="">Todas las categorías</option><?= options($L['cat'], $fc) ?></select>
    <select name="st" onchange="this.form.submit()"><option value="">Todos</option><option value="arc"<?= $fs === 'arc' ? ' selected' : '' ?>>Solo arcade</option><option value="edu"<?= $fs === 'edu' ? ' selected' : '' ?>>Solo educativos</option><option value="ext"<?= $fs === 'ext' ? ' selected' : '' ?>>Externos</option></select>
    <a class="btn pri" href="<?= e(cms_url(['p' => 'edit'])) ?>">＋ Añadir juego</a>
  </form>
  <form method="post" action="<?= e(cms_url(['p' => 'bulk'] + array_filter(['cat' => $fc, 'col' => $fl, 'st' => $fs]))) ?>">
  <?= csrf_field() ?>
  <div class="card" style="padding:10px 12px">
    <div class="bar" style="margin:0"><b>Con los marcados:</b>
      <select name="cat"><option value="">— categoría —</option><?= $catsOpt(null) ?></select><button class="sm" name="do" value="cat">Cambiar categoría</button>
      <select name="col"><option value="">— colección —</option><?= options($L['col'], null) ?></select><button class="sm" name="do" value="col">Cambiar colección</button>
      <button class="sm bad" name="do" value="delete" data-confirm="¿Mandar los juegos marcados a la papelera?">🗑️ Borrar</button>
    </div>
  </div>
  <div class="card" style="padding:4px 10px">
  <table class="resp"><thead><tr><th><input type="checkbox" id="selall"></th><th></th><th>Juego</th><th>Categoría</th><th>Colección</th><th>Orden</th><th></th></tr></thead><tbody>
  <?php foreach ($list as $id => $g): ?>
    <tr data-s="<?= e(mb_strtolower($id . ' ' . $g['title_es'] . ' ' . $g['title_en'])) ?>">
      <td class="ck"><input type="checkbox" name="ids[]" value="<?= e($id) ?>"></td>
      <td class="em"><?= e($g['emoji']) ?></td>
      <td class="t"><b><?= e($g['title_es']) ?></b><small><?= e($id) ?><?= $g['added_version'] ? ' · v' . e($g['added_version']) : '' ?></small></td>
      <td class="wide"><select data-quick="category_id" data-id="<?= e($id) ?>"><?= $catsOpt($g['category_id']) ?></select></td>
      <td class="hide-m"><select data-quick="collection_id" data-id="<?= e($id) ?>"><?= options($L['col'], $g['collection_id']) ?></select></td>
      <td class="hide-m mut"><?= e($g['sort']) ?><?= preg_match('#^https?://#', (string)$g['url']) ? ' <span class="st new">externo</span>' : '' ?></td>
      <td class="acts"><a class="btn sm" href="<?= e(cms_url(['p' => 'edit', 'id' => $id])) ?>">✏️ Editar</a> <a class="btn sm" target="_blank" href="<?= e($GLOBALS['SITE_URL'] . $id) ?>">▶</a></td>
    </tr>
  <?php endforeach ?>
  </tbody></table></div></form>
  <p class="hint">Los cambios de categoría y colección de la tabla se guardan solos. La web, las portadas de la PWA y la de la tele los muestran al momento.</p>
  <?php page('Juegos', (string)ob_get_clean(), 'games');
}

/* ───────── juegos: añadir / editar ───────── */
if ($p === 'edit') {
  $L = lists(); $id = (string)($_GET['id'] ?? ''); $games = rows('game'); $isNew = $id === ''; $err = '';
  if (!$isNew && !isset($games[$id])) go(['p' => 'games'], 'Ese juego no existe.');
  $hasSrc = !$isNew && is_file(__DIR__ . '/herramientas/src/' . $id . '.js'); $g = $isNew ? ['id' => '', 'slug_en' => '', 'collection_id' => 'pro', 'category_id' => array_key_first($L['cat']), 'control_id' => 'tocar', 'file' => '', 'url' => '', 'emoji' => '🎮', 'color' => '#ff6b6b', 'theme_color' => '#1a1033', 'bg1' => '#2b1a5c', 'bg2' => '#1a1033', 'font' => 'round', 'deco' => '[]', 'title_es' => '', 'title_en' => '', 'tag_es' => '', 'tag_en' => '', 'desc_es' => '', 'desc_en' => '', 'help_es' => '', 'help_en' => '', 'tvhelp_es' => '', 'tvhelp_en' => '', 'tv' => null, 'origin' => '', 'lives' => 3, 'levels' => 'endless', 'cap' => null, 'physics' => 0, 'added_version' => 'cms', 'sort' => 5000, 'subject_id' => null, 'age_min' => null, 'age_max' => null, 'langs' => 'es,en', 'app' => null, 'ages' => []] : $games[$id];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = $_POST; $row = $g;
    foreach (['title_es', 'title_en', 'tag_es', 'tag_en', 'desc_es', 'desc_en', 'help_es', 'help_en', 'tvhelp_es', 'tvhelp_en', 'origin', 'emoji', 'color', 'theme_color', 'bg1', 'bg2', 'levels', 'langs', 'app', 'added_version', 'tags'] as $k) if (isset($in[$k])) $row[$k] = trim((string)$in[$k]);
    if (isset($in['cats'])) { $row['cats'] = implode(',', array_values(array_filter(array_unique(array_map('trim', explode(',', (string)$in['cats']))), function ($c) use ($L, $row) { return isset($L['cat'][$c]) && $c !== ($row['category_id'] ?? ''); }))) ?: null; }
    foreach (['collection_id' => $L['col'], 'category_id' => $L['cat'], 'control_id' => $L['ctrl'], 'subject_id' => $L['subj']] as $k => $opts) if (isset($in[$k])) $row[$k] = isset($opts[$in[$k]]) ? (string)$in[$k] : null;
    $row['tv'] = in_array($in['tv'] ?? '', ['cursor', 'cruceta'], true) ? $in['tv'] : null;
    foreach (['sort', 'lives', 'cap', 'age_min', 'age_max'] as $k) if (isset($in[$k])) $row[$k] = $in[$k] === '' ? null : (int)$in[$k];
    $row['physics'] = !empty($in['physics']) ? 1 : 0;
    $row['ages'] = array_values(array_intersect((array)($in['ages'] ?? []), array_keys($L['age'])));
    if ($row['added_version'] === '') $row['added_version'] = null;
    if ($row['app'] === '') $row['app'] = null;
    if ($isNew) { $id = cms_slug((string)($in['id'] ?? '')); $row['slug_en'] = cms_slug((string)($in['slug_en'] ?? '')) ?: $id; }
    if ($isNew) { if ($id === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $id)) $err = 'El identificador solo puede tener letras minúsculas, números y guiones.'; elseif (row('game', $id) || in_array($id, ['cms', 'api', 'pwa', 'juego', 'juegos', 'categoria', 'coleccion', 'buscar', 'tv', 'en', 'icono', 'data', 'educativos', 'herramientas'], true)) $err = 'Ya hay un juego (o una página) con ese identificador.'; if (arcade_db()->query('SELECT COUNT(*) FROM games WHERE slug_en = ' . arcade_db()->quote($row['slug_en']))->fetchColumn()) $err = 'Ya hay un juego con ese nombre en inglés para la URL.'; }
    // dónde se juega: archivo de pwa/, archivo subido o dirección externa
    $src = (string)($in['src'] ?? 'file');
    if ($err) { /* nada */ } elseif ($src === 'upload' && !empty($_FILES['upload']['tmp_name']) && is_uploaded_file($_FILES['upload']['tmp_name'])) {
      $fn = ($id ?: 'juego') . '.html'; $okName = preg_match('/^[a-z0-9-]+\.html$/', $fn) && preg_match('/\.html?$/i', (string)$_FILES['upload']['name']);
      if (!$okName) $err = 'El archivo tiene que ser .html.'; elseif ($_FILES['upload']['size'] > 8 * 1024 * 1024) $err = 'El archivo es demasiado grande (máx. 8 MB).';
      elseif (is_file(__DIR__ . '/pwa/' . $fn) && !$isNew && $g['file'] !== $fn) $err = 'Ya existe pwa/' . $fn . '.';
      elseif (!@move_uploaded_file($_FILES['upload']['tmp_name'], __DIR__ . '/pwa/' . $fn)) $err = 'No se ha podido guardar el archivo en pwa/ (¿permisos de escritura?).';
      else { $row['file'] = $fn; $row['url'] = 'pwa/' . $fn; }
    } elseif ($src === 'url') { $u = trim((string)($in['ext'] ?? '')); if (!preg_match('#^https?://[^\s<>"]+$#', $u)) $err = 'La dirección externa tiene que empezar por http:// o https://'; else { $row['url'] = $u; $row['file'] = null; } }
    elseif ($src === 'file') { $f = (string)($in['file'] ?? ''); if ($f !== '' && in_array($f, pwa_files(), true)) { $row['file'] = $f; $row['url'] = 'pwa/' . $f; } elseif ($isNew || ($row['collection_id'] !== 'edu' && !$row['file'])) $err = 'Elige el archivo del juego, súbelo o pon una dirección.'; }
    if (!$err && $isNew && empty($row['file']) && !preg_match('#^https?://#', (string)$row['url'])) $err = 'Elige el archivo del juego, súbelo o pon una dirección.';
    if ($hasSrc) foreach (CMS_CODE as $k) $row[$k] = $g[$k];   // lo que manda el código del juego no se toca aquí
    if (!$err && $row['title_es'] === '') $err = 'Falta el título en español.';
    if (!$err) { if ($row['title_en'] === '') $row['title_en'] = $row['title_es']; save_item('game', $id, $row, $isNew ? 'creado' : 'editado');
      if ($isNew && is_file(__DIR__ . '/herramientas/src/' . $id . '.js')) { try { cms_regen(); $GLOBALS['cms_regen'] = true; cmd_sincronizar([$id]); } catch (Throwable $e) { /* se queda con lo del formulario */ } }
      go(['p' => 'edit', 'id' => $id], $isNew ? 'Juego creado.' : 'Cambios guardados.'); }
    $g = $row; $g['id'] = $id;
  }
  $src = preg_match('#^https?://#', (string)$g['url']) ? 'url' : 'file';
  $ro = function ($k) use ($hasSrc) { return $hasSrc && in_array($k, CMS_CODE, true) ? ' disabled title="Sale del código del juego"' : ''; };
  $t = function ($k, $label, $hint = '', $cls = '') use ($g, $ro) { return '<div class="' . $cls . '"><label>' . e($label) . '</label><input name="' . $k . '" value="' . e($g[$k] ?? '') . '"' . $ro($k) . '>' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  $ta = function ($k, $label, $hint = '') use ($g, $ro) { return '<div class="w2"><label>' . e($label) . '</label><textarea name="' . $k . '"' . $ro($k) . '>' . e($g[$k] ?? '') . '</textarea>' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  $n = function ($k, $label, $hint = '') use ($g, $ro) { return '<div><label>' . e($label) . '</label><input type="number" name="' . $k . '" value="' . e($g[$k] ?? '') . '"' . $ro($k) . '>' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  ob_start(); ?>
  <p><a href="<?= e(cms_url(['p' => 'games'])) ?>">← Juegos</a></p>
  <h1><?= $isNew ? 'Añadir juego' : e($g['emoji'] . ' ' . $g['title_es']) ?></h1>
  <?php if ($hasSrc): ?><p class="hint">Cómo se juega, controles con mando, vidas, niveles, fondo y física salen del código del juego (<code>herramientas/src/<?= e($id) ?>.js</code>) y se copian con <code>php herramientas/arcade.php sincronizar</code>: aquí solo se ven.</p><?php endif ?>
  <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif ?>
  <form method="post" enctype="multipart/form-data"><?= csrf_field() ?>
  <div class="card"><h2 style="margin-top:0">Lo básico</h2><div class="grid">
    <div><label>Identificador (URL en español)</label><input name="id" value="<?= e($g['id']) ?>" <?= $isNew ? 'required pattern="[a-z0-9][a-z0-9-]*" placeholder="mi-juego"' : 'readonly' ?>><p class="hint"><?= $isNew ? 'Minúsculas, números y guiones. Será la dirección /mi-juego.' : 'No se puede cambiar: rompería los enlaces.' ?></p></div>
    <div><label>Nombre en la URL inglesa</label><input name="slug_en" value="<?= e($g['slug_en']) ?>" <?= $isNew ? 'placeholder="my-game"' : 'readonly' ?>></div>
    <?= $t('title_es', 'Título (español)') ?><?= $t('title_en', 'Título (inglés)') ?>
    <div><label>Emoji</label><input name="emoji" value="<?= e($g['emoji']) ?>" maxlength="16"></div>
    <div><label>Color principal</label><input type="color" name="color" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['color']) ? $g['color'] : '#ff6b6b') ?>" style="height:40px;padding:3px"></div>
    <div><label>Colección</label><select name="collection_id"><?= options($L['col'], $g['collection_id']) ?></select></div>
    <div><label>Categoría</label><select name="category_id"><?= options($L['cat'], $g['category_id']) ?></select></div>
    <div><label>Control</label><select name="control_id"><?= options($L['ctrl'], $g['control_id'], 'name_es', true) ?></select></div>
    <div><label>Se juega en la tele</label><select name="tv"><option value="">No</option><option value="cursor"<?= $g['tv'] === 'cursor' ? ' selected' : '' ?>>Sí, con cursor</option><option value="cruceta"<?= $g['tv'] === 'cruceta' ? ' selected' : '' ?>>Sí, con la cruceta</option></select></div>
    <?= $n('sort', 'Orden', 'Número más bajo = sale antes en los listados.') ?>
    <?= $t('added_version', 'Versión en que se añadió', 'Los de la última versión salen como «Nuevos» en la portada.') ?>
  </div></div>
  <div class="card"><h2 style="margin-top:0">Dónde se juega</h2>
    <p><label style="display:inline-flex;gap:6px;align-items:center;margin-right:16px;color:var(--ink)"><input type="radio" name="src" value="file" <?= $src === 'file' ? 'checked' : '' ?>> Archivo que ya está en pwa/</label>
       <label style="display:inline-flex;gap:6px;align-items:center;margin-right:16px;color:var(--ink)"><input type="radio" name="src" value="upload"> Subir un .html</label>
       <label style="display:inline-flex;gap:6px;align-items:center;color:var(--ink)"><input type="radio" name="src" value="url" <?= $src === 'url' ? 'checked' : '' ?>> Dirección externa</label></p>
    <div class="grid">
      <div><label>Archivo de pwa/</label><select name="file"><option value="">—</option><?php foreach (pwa_files() as $f): ?><option<?= $f === $g['file'] ? ' selected' : '' ?>><?= e($f) ?></option><?php endforeach ?></select></div>
      <div><label>Subir .html</label><input type="file" name="upload" accept=".html,.htm"><p class="hint">Se guarda como pwa/&lt;identificador&gt;.html. Máx. 8 MB.</p></div>
      <div><label>Dirección externa</label><input name="ext" value="<?= e($src === 'url' ? $g['url'] : '') ?>" placeholder="https://…"><p class="hint">Al pulsar «Jugar» se abre esa dirección.</p></div>
    </div>
    <?php if ($g['collection_id'] === 'edu' && $src !== 'url'): ?><p class="hint">Educativo: se juega en <code><?= e($g['url']) ?></code>.</p><?php endif ?>
  </div>
  <div class="card"><h2 style="margin-top:0">Textos</h2><div class="grid">
    <?= $t('tag_es', 'Lema (español)', '', 'w2') ?><?= $t('tag_en', 'Lema (inglés)', '', 'w2') ?>
    <?= $ta('desc_es', 'Descripción (español)', 'Sale en las tarjetas y en Google.') ?><?= $ta('desc_en', 'Descripción (inglés)') ?>
    <?= $ta('help_es', 'Cómo se juega (español)', 'Puedes usar &lt;b&gt;negrita&lt;/b&gt;.') ?><?= $ta('help_en', 'Cómo se juega (inglés)') ?>
    <?= $t('tvhelp_es', 'Controles con mando (español)', '', 'w2') ?><?= $t('tvhelp_en', 'Controles con mando (inglés)', '', 'w2') ?>
    <?= $t('origin', 'Basado en', 'Juegos originales en los que se inspira.', 'full') ?>
    <?= $t('cats', 'Otras categorías', 'Además de la principal, separadas por comas (ids): ' . e(implode(', ', array_keys($L['cat']))) . '. Los de la etiqueta «hit» salen solos en «Éxitos de móvil».') ?>
    <?= $t('tags', 'Etiquetas', 'Separadas por comas. «hit» = sale también en la web Mobile Hits (y en cualquier web que tenga esa etiqueta).') ?>
  </div></div>
  <div class="card"><h2 style="margin-top:0">Detalles</h2><div class="grid">
    <?= $n('lives', 'Vidas') ?><?= $t('levels', 'Niveles', 'Un número, «endless» (por récord) o «infinite».') ?><?= $n('cap', 'Nivel máximo de dificultad') ?>
    <?= $t('langs', 'Idiomas', 'Separados por comas: es,en') ?>
    <div><label>Fondo (arriba / abajo)</label><div style="display:flex;gap:6px"><input type="color"<?= $ro('bg1') ?> name="bg1" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['bg1']) ? $g['bg1'] : '#2b1a5c') ?>" style="height:40px;padding:3px"><input type="color"<?= $ro('bg2') ?> name="bg2" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['bg2']) ? $g['bg2'] : '#1a1033') ?>" style="height:40px;padding:3px"><input type="color"<?= $ro('theme_color') ?> name="theme_color" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['theme_color']) ? $g['theme_color'] : '#1a1033') ?>" style="height:40px;padding:3px" title="Color de la barra del móvil"></div></div>
    <div><label style="display:flex;gap:8px;align-items:center;margin-top:24px;color:var(--ink)"><input type="checkbox" name="physics" value="1" <?= !empty($g['physics']) ? 'checked' : '' ?><?= $ro('physics') ?>> Usa física</label></div>
  </div>
  <h2>Solo educativos</h2><div class="grid">
    <div><label>Asignatura</label><select name="subject_id"><?= options($L['subj'], $g['subject_id'], 'name_es', true) ?></select></div>
    <?= $n('age_min', 'Edad mínima') ?><?= $n('age_max', 'Edad máxima') ?><?= $t('app', 'App', 'Ej.: Emoji Brain Academy') ?>
    <div class="w2"><label>Grupos de edad</label><?php foreach ($L['age'] as $aid => $a): ?><label style="display:inline-flex;gap:6px;align-items:center;margin-right:14px;color:var(--ink)"><input type="checkbox" name="ages[]" value="<?= e($aid) ?>" <?= in_array($aid, (array)$g['ages'], true) ? 'checked' : '' ?>> <?= e($a['emoji'] . ' ' . $a['name_es']) ?></label><?php endforeach ?></div>
  </div></div>
  <div class="bar"><button class="pri"><?= $isNew ? '＋ Crear juego' : '💾 Guardar cambios' ?></button><?php if (!$isNew): ?><a class="btn" target="_blank" href="<?= e($GLOBALS['SITE_URL'] . $g['id']) ?>">▶ Probar</a><?php endif ?></div>
  </form>
  <?php if (!$isNew): ?>
  <div class="bar" style="margin-top:20px">
    <form method="post" action="<?= e(cms_url(['p' => 'delete'])) ?>"><?= csrf_field() ?><input type="hidden" name="kind" value="game"><input type="hidden" name="id" value="<?= e($g['id']) ?>"><button class="bad" data-confirm="¿Mandar «<?= e($g['title_es']) ?>» a la papelera? Desaparecerá de la web (se puede recuperar).">🗑️ Borrar juego</button></form>
  </div>
  <?php endif ?>
  <?php page($isNew ? 'Añadir juego' : 'Editar ' . $g['title_es'], (string)ob_get_clean(), 'games');
}

/* ───────── categorías y colecciones ───────── */
if ($p === 'cats' || $p === 'cols') {
  $kind = $p === 'cats' ? 'category' : 'collection'; $items = rows($kind); $games = rows('game'); $field = $kind === 'category' ? 'category_id' : 'collection_id';
  $count = []; foreach ($games as $g) $count[$g[$field] ?? ''] = ($count[$g[$field] ?? ''] ?? 0) + 1;
  ob_start(); ?>
  <h1><?= $kind === 'category' ? 'Categorías' : 'Colecciones' ?></h1>
  <div class="card" style="padding:4px 10px"><table class="resp"><thead><tr><th></th><th>Nombre</th><th>URL</th><th class="right">Juegos</th><th class="right">Orden</th><th></th></tr></thead><tbody>
  <?php foreach ($items as $id => $c): ?>
    <tr><td class="em"><?= e($c['emoji']) ?></td><td class="t"><b><?= e($c['name_es']) ?></b><small><?= e($c['name_en']) ?></small></td><td class="hide-m mut">/<?= $kind === 'category' ? 'categoria' : 'coleccion' ?>/<?= e($c['slug_es']) ?></td>
      <td class="right"><a href="<?= e(cms_url(['p' => 'games', $kind === 'category' ? 'cat' : 'col' => $id])) ?>"><?= (int)($count[$id] ?? 0) ?></a></td><td class="right mut hide-m"><?= e($c['sort']) ?></td>
      <td class="acts"><a class="btn sm" href="<?= e(cms_url(['p' => 'item', 'kind' => $kind, 'id' => $id])) ?>">✏️ Editar</a></td></tr>
  <?php endforeach ?></tbody></table></div>
  <?php if ($kind === 'category'): ?><a class="btn pri" href="<?= e(cms_url(['p' => 'item', 'kind' => 'category'])) ?>">＋ Nueva categoría</a><?php else: ?><p class="hint">Las colecciones tienen su propia portada, por eso aquí solo se editan sus textos, emoji y orden.</p><?php endif ?>
  <?php page($kind === 'category' ? 'Categorías' : 'Colecciones', (string)ob_get_clean(), $p);
}

if ($p === 'item') {
  $kind = (string)($_GET['kind'] ?? 'category'); if (!in_array($kind, ['category', 'collection'], true)) go();
  $id = (string)($_GET['id'] ?? ''); $items = rows($kind); $isNew = $id === ''; $err = ''; $tab = $kind === 'category' ? 'cats' : 'cols';
  if ($isNew && $kind !== 'category') go(['p' => 'cols']);
  if (!$isNew && !isset($items[$id])) go(['p' => $tab], 'No existe.');
  $c = $isNew ? ['slug_es' => '', 'slug_en' => '', 'name_es' => '', 'name_en' => '', 'emoji' => '📁', 'genre' => 'Arcade', 'desc_es' => '', 'desc_en' => '', 'sort' => count($items)] : $items[$id];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $row = $c; foreach (['name_es', 'name_en', 'emoji', 'desc_es', 'desc_en', 'genre'] as $k) if (isset($_POST[$k])) $row[$k] = trim((string)$_POST[$k]);
    $row['sort'] = (int)($_POST['sort'] ?? 0); if ($kind === 'collection') unset($row['genre']);
    if ($isNew) { $row['slug_es'] = cms_slug((string)($_POST['slug_es'] ?? '') ?: $row['name_es']); $row['slug_en'] = cms_slug((string)($_POST['slug_en'] ?? '') ?: ($row['name_en'] ?: $row['name_es'])); $id = $row['slug_es']; foreach (arcade_db()->query('SELECT id, slug_es, slug_en FROM ' . CMS_KINDS[$kind]) as $o) if ($o['id'] === $id || $o['slug_es'] === $row['slug_es'] || $o['slug_en'] === $row['slug_en']) $err = 'Ya hay una categoría con ese nombre o esa URL.'; }
    if ($row['name_es'] === '') $err = 'Falta el nombre en español.';
    if (!$err) { if ($row['name_en'] === '') $row['name_en'] = $row['name_es']; save_item($kind, $id, $row, $isNew ? 'creada' : 'editada'); go(['p' => $tab], $isNew ? 'Categoría creada.' : 'Guardado.'); }
    $c = $row;
  }
  $others = array_filter(rows('category'), function ($k) use ($id) { return $k !== $id; }, ARRAY_FILTER_USE_KEY);
  ob_start(); ?>
  <p><a href="<?= e(cms_url(['p' => $tab])) ?>">← <?= $kind === 'category' ? 'Categorías' : 'Colecciones' ?></a></p>
  <h1><?= $isNew ? 'Nueva categoría' : e($c['emoji'] . ' ' . $c['name_es']) ?></h1>
  <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif ?>
  <form method="post" class="card"><?= csrf_field() ?><div class="grid">
    <div><label>Nombre (español)</label><input name="name_es" value="<?= e($c['name_es']) ?>" required></div>
    <div><label>Nombre (inglés)</label><input name="name_en" value="<?= e($c['name_en']) ?>"></div>
    <div><label>URL en español</label><input name="slug_es" value="<?= e($c['slug_es']) ?>" <?= $isNew ? 'placeholder="se crea sola con el nombre"' : 'readonly' ?>></div>
    <div><label>URL en inglés</label><input name="slug_en" value="<?= e($c['slug_en']) ?>" <?= $isNew ? 'placeholder="se crea sola con el nombre"' : 'readonly' ?>></div>
    <div><label>Emoji</label><input name="emoji" value="<?= e($c['emoji']) ?>" maxlength="16"></div>
    <div><label>Orden</label><input type="number" name="sort" value="<?= e($c['sort']) ?>"></div>
    <?php if ($kind === 'category'): ?><div><label>Género (para Google)</label><input name="genre" value="<?= e($c['genre'] ?? '') ?>" placeholder="Puzzle, Arcade, Board…"></div><?php endif ?>
    <div class="w2"><label>Descripción (español)</label><textarea name="desc_es"><?= e($c['desc_es']) ?></textarea></div>
    <div class="w2"><label>Descripción (inglés)</label><textarea name="desc_en"><?= e($c['desc_en']) ?></textarea></div>
  </div><p><button class="pri"><?= $isNew ? '＋ Crear' : '💾 Guardar' ?></button></p></form>
  <?php if (!$isNew): ?>
    <div class="bar">
    <?php if ($kind === 'category' && $others): ?>
      <form method="post" action="<?= e(cms_url(['p' => 'delete'])) ?>" class="bar" style="margin:0"><?= csrf_field() ?><input type="hidden" name="kind" value="category"><input type="hidden" name="id" value="<?= e($id) ?>">
        <span>Borrar y pasar sus juegos a</span><select name="to"><?= options($others, null) ?></select><button class="bad" data-confirm="¿Borrar esta categoría y mover sus juegos?">🗑️ Borrar categoría</button></form>
    <?php endif ?>
    </div>
  <?php endif ?>
  <?php page($isNew ? 'Nueva categoría' : $c['name_es'], (string)ob_get_clean(), $tab);
}

/* ───────── papelera ───────── */
if ($p === 'trash') {
  $del = []; foreach (['game', 'category'] as $k) foreach (rows($k, true) as $id => $r) $del[] = [$k, $id, $r];
  ob_start(); ?>
  <h1>Papelera</h1>
  <?php if (!$del): ?><div class="card mut">No hay nada en la papelera.</div><?php else: ?>
  <div class="card" style="padding:4px 10px"><table class="resp"><tbody>
  <?php foreach ($del as [$k, $id, $r]): ?>
    <tr><td class="em"><?= e($r['emoji'] ?? '') ?></td><td class="t"><b><?= e($r['title_es'] ?? $r['name_es'] ?? $id) ?></b><small><?= $k === 'game' ? 'Juego' : 'Categoría' ?> · <?= e($id) ?> · <?= e(date('d/m/Y', (int)$r['deleted_at'])) ?></small></td>
      <td class="acts">
        <form method="post" action="<?= e(cms_url(['p' => 'restore'])) ?>" style="display:inline"><?= csrf_field() ?><input type="hidden" name="kind" value="<?= e($k) ?>"><input type="hidden" name="id" value="<?= e($id) ?>"><input type="hidden" name="back" value="trash"><button class="sm blue">♻️ Recuperar</button></form>
        <form method="post" action="<?= e(cms_url(['p' => 'purge'])) ?>" style="display:inline"><?= csrf_field() ?><input type="hidden" name="kind" value="<?= e($k) ?>"><input type="hidden" name="id" value="<?= e($id) ?>"><input type="hidden" name="back" value="trash"><button class="sm bad" data-confirm="Se eliminará de la base de datos para siempre. ¿Seguro?">Eliminar del todo</button></form>
      </td></tr>
  <?php endforeach ?></tbody></table></div>
  <p class="hint">Lo que está aquí no sale en la web. «Eliminar del todo» lo quita de la base de datos (el archivo del juego en pwa/ no se borra).</p>
  <?php endif ?>
  <?php page('Papelera', (string)ob_get_clean(), 'trash');
}

/* ───────── webs por subdominio (tabla sites) ───────── */
if ($p === 'webs' || $p === 'web') {
  $a = arcade_db(); sites_ensure($a);
  $webs = []; foreach ($a->query('SELECT * FROM sites ORDER BY sort, id') as $r) $webs[$r['id']] = $r;
  $cols = rows('collection');
  if ($p === 'webs') {
    ob_start(); ?>
  <h1>Webs</h1>
  <p class="mut">Cada web es un subdominio (<code>arcadeplus.juegosboom.com</code>…) con sus colecciones y su aspecto. Desde una web no se puede pasar a otra: lo que no es suyo da 404. La web «*» sale con cualquier otro dominio (el principal, localhost…).</p>
  <div class="card" style="padding:4px 10px"><table class="resp"><thead><tr><th></th><th>Web</th><th>Subdominio</th><th>Colecciones</th><th>Tele</th><th></th></tr></thead><tbody>
  <?php foreach ($webs as $id => $w): ?>
    <tr><td class="em"><span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:<?= e($w['c_bg']) ?>;border:3px solid <?= e($w['c_accent']) ?>"><?= e($w['emoji']) ?></span></td><td class="t"><b><?= e($w['name_es']) ?></b><small><?= e($w['font']) ?></small></td>
      <td><code><?= e($w['host']) ?></code></td><td><?= e(trim(($w['collections'] === '*' ? 'Todas' : implode(', ', array_map(function ($c) use ($cols) { return $cols[$c]['name_es'] ?? $c; }, array_filter(explode(',', $w['collections']))))) . (($w['tags'] ?? '') !== '' ? ' + etiqueta «' . $w['tags'] . '»' : ''), ' +')) ?></td><td><?= $w['tv'] ? '📺 Sí' : 'No' ?></td>
      <td class="acts"><a class="btn sm" href="<?= e(cms_url(['p' => 'web', 'id' => $id])) ?>">✏️ Editar</a></td></tr>
  <?php endforeach ?></tbody></table></div>
  <a class="btn pri" href="<?= e(cms_url(['p' => 'web'])) ?>">＋ Nueva web</a>
  <?php page('Webs', (string)ob_get_clean(), 'webs');
  }
  $id = (string)($_GET['id'] ?? ''); $isNew = $id === ''; $err = '';
  if (!$isNew && !isset($webs[$id])) go(['p' => 'webs'], 'No existe.');
  $w = $isNew ? ['id' => '', 'host' => '', 'name_es' => '', 'name_en' => '', 'emoji' => '🎮', 'tag_es' => '', 'tag_en' => '', 'desc_es' => '', 'desc_en' => '', 'collections' => '*', 'tv' => 0, 'font' => 'Nunito', 'c_bg' => '#f6f4fb', 'c_surface' => '#ffffff', 'c_text' => '#1d1a2e', 'c_muted' => '#6c6884', 'c_accent' => '#ffce3a', 'c_ink' => '#2a2100', 'sort' => count($webs), 'tags' => ''] : $webs[$id];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_POST['delete']) && !$isNew) {
      if ($w['host'] === '*') go(['p' => 'web', 'id' => $id], 'La web «*» no se puede borrar: es la que sale por defecto.');
      $a->prepare('DELETE FROM sites WHERE id = ?')->execute([$id]); cms_log('cms', 'web ' . $id, 'borrada'); go(['p' => 'webs'], 'Web borrada.');
    }
    $row = $w; foreach (['host', 'name_es', 'name_en', 'emoji', 'tag_es', 'tag_en', 'desc_es', 'desc_en', 'tags', 'font', 'c_bg', 'c_surface', 'c_text', 'c_muted', 'c_accent', 'c_ink'] as $k) if (isset($_POST[$k])) $row[$k] = trim((string)$_POST[$k]);
    $row['host'] = strtolower($row['host']); $row['tv'] = empty($_POST['tv']) ? 0 : 1; $row['sort'] = (int)($_POST['sort'] ?? 0);
    $sel = array_values(array_intersect((array)($_POST['cols'] ?? []), array_keys($cols))); $row['tags'] = implode(',', array_filter(array_map(function ($x) { return preg_replace('/[^a-z0-9-]/', '', strtolower(trim($x))); }, explode(',', (string)$row['tags']))));
    $row['collections'] = !empty($_POST['all']) ? '*' : ($sel ? implode(',', $sel) : ($row['tags'] !== '' ? '' : '*'));
    if ($isNew) $row['id'] = cms_slug($row['host'] === '*' ? 'principal' : explode('.', $row['host'])[0]);
    if (!preg_match('/^(\*|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)*)$/', $row['host'])) $err = 'El subdominio solo puede llevar minúsculas, números, guiones y puntos (o «*»).';
    foreach ($webs as $o) if ($o['id'] !== $id && ($o['host'] === $row['host'] || ($isNew && $o['id'] === $row['id']))) $err = 'Ya hay una web con ese subdominio.';
    foreach (['c_bg', 'c_surface', 'c_text', 'c_muted', 'c_accent', 'c_ink'] as $k) if (!preg_match('/^#[0-9a-f]{6}$/i', $row[$k])) $err = 'Los colores tienen que ser del tipo #1a2b3c.';
    if ($row['font'] !== '' && !preg_match('/^[A-Za-z0-9 ]{2,40}$/', $row['font'])) $err = 'La fuente es el nombre tal cual sale en Google Fonts (p. ej. «Baloo 2»).';
    if ($row['name_es'] === '') $err = 'Falta el nombre.';
    if (!$err) {
      if ($row['name_en'] === '') $row['name_en'] = $row['name_es'];
      $vals = array_map(function ($k) use ($row) { return $row[$k]; }, SITE_COLS);
      if ($isNew) $a->prepare('INSERT INTO sites (' . implode(',', SITE_COLS) . ') VALUES (' . implode(',', array_fill(0, count(SITE_COLS), '?')) . ')')->execute($vals);
      else { $set = array_values(array_diff(SITE_COLS, ['id'])); $a->prepare('UPDATE sites SET ' . implode(', ', array_map(function ($k) { return "$k = ?"; }, $set)) . ' WHERE id = ?')->execute(array_merge(array_map(function ($k) use ($row) { return $row[$k]; }, $set), [$id])); }
      cms_log('cms', 'web ' . $row['id'], $isNew ? 'creada' : 'editada', $row['host']); go(['p' => 'webs'], $isNew ? 'Web creada.' : 'Guardado.');
    }
    $w = $row;
  }
  $on = $w['collections'] === '*' ? array_keys($cols) : explode(',', $w['collections']);
  $col = function ($k, $label) use ($w) { return '<div><label>' . e($label) . '</label><input type="color" name="' . $k . '" value="' . e($w[$k]) . '" style="width:100%;height:42px;padding:2px"></div>'; };
  $tx = function ($k, $label, $hint = '') use ($w) { return '<div><label>' . e($label) . '</label><input name="' . $k . '" value="' . e($w[$k] ?? '') . '">' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  ob_start(); ?>
  <p><a href="<?= e(cms_url(['p' => 'webs'])) ?>">← Webs</a></p>
  <h1><?= $isNew ? 'Nueva web' : e($w['emoji'] . ' ' . $w['name_es']) ?></h1>
  <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif ?>
  <form method="post" class="card"><?= csrf_field() ?>
  <div class="grid">
    <?= $tx('host', 'Subdominio', '«arcadeplus» vale para arcadeplus.cualquierdominio.com; también puedes poner el host entero. «*» = la web por defecto.') ?>
    <?= $tx('name_es', 'Nombre (español)') ?><?= $tx('name_en', 'Nombre (inglés)') ?><?= $tx('emoji', 'Emoji') ?>
    <?= $tx('tag_es', 'Lema (español)') ?><?= $tx('tag_en', 'Lema (inglés)') ?>
    <div class="w2"><label>Texto de la portada (español)</label><textarea name="desc_es" placeholder="Si lo dejas vacío, sale el de la colección"><?= e($w['desc_es']) ?></textarea></div>
    <div class="w2"><label>Texto de la portada (inglés)</label><textarea name="desc_en"><?= e($w['desc_en']) ?></textarea></div>
    <div class="full"><label>Colecciones</label><label style="display:inline-flex;gap:6px;margin-right:14px"><input type="checkbox" name="all" value="1"<?= $w['collections'] === '*' ? ' checked' : '' ?>> Todas</label>
      <?php foreach ($cols as $cid => $c): ?><label style="display:inline-flex;gap:6px;margin-right:14px"><input type="checkbox" name="cols[]" value="<?= e($cid) ?>"<?= in_array($cid, $on, true) && $w['collections'] !== '*' ? ' checked' : '' ?>> <?= e($c['emoji'] . ' ' . $c['name_es']) ?></label><?php endforeach ?></div>
    <?= $tx('tags', 'Etiquetas de juegos', 'Además de sus colecciones, enseña los juegos con estas etiquetas (p. ej. «hit»). Sin ninguna colección marcada y con etiqueta, solo esos juegos.') ?>
    <div class="full"><label style="display:inline-flex;gap:8px"><input type="checkbox" name="tv" value="1"<?= $w['tv'] ? ' checked' : '' ?>> 📺 Web para la tele</label><p class="hint">Marcada: solo juegos con mando, siempre en modo TV y la portada es la de la tele. Sin marcar: nunca hay modo TV.</p></div>
    <?= $tx('font', 'Fuente (Google Fonts)', 'Nunito, Rubik, Baloo 2, Lora, Fredoka, Playfair Display…') ?>
    <?= $col('c_bg', 'Fondo') ?><?= $col('c_surface', 'Tarjetas y cabecera') ?><?= $col('c_text', 'Texto') ?><?= $col('c_muted', 'Texto suave') ?><?= $col('c_accent', 'Acento (botones)') ?><?= $col('c_ink', 'Texto sobre el acento') ?>
    <div><label>Orden</label><input type="number" name="sort" value="<?= e($w['sort']) ?>"></div>
  </div><p><button class="pri"><?= $isNew ? '＋ Crear' : '💾 Guardar' ?></button></p></form>
  <?php if (!$isNew && $w['host'] !== '*'): ?><form method="post" class="bar"><?= csrf_field() ?><input type="hidden" name="delete" value="1"><button class="bad" data-confirm="¿Borrar esta web? Su subdominio pasará a mostrar la web por defecto.">🗑️ Borrar web</button></form><?php endif ?>
  <?php page($isNew ? 'Nueva web' : $w['name_es'], (string)ob_get_clean(), 'webs');
}

/* ───────── ajustes ───────── */
if ($p === 'ajustes') {
  $A = cms_ajustes(); $err = '';
  $valid = ['portada' => ['0', '1'], 'modo' => ['automatico', 'seleccionable', 'modonormal', 'modotv'], 'idioma' => ['auto', 'es', 'en'], 'jugadores_max' => ['1', '2', '3', '4']];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_POST['regen'])) { cms_changed(); go(['p' => 'ajustes'], 'Archivos de la PWA regenerados.'); }
    $new = []; foreach ($A as $k => $r) { if ($k === 'actualizado' || !isset($_POST[$k])) continue; $v = trim((string)$_POST[$k]); if (isset($valid[$k]) && !in_array($v, $valid[$k], true)) $err = "Valor no válido para «$k»."; if ($k === 'version' && !preg_match('/^\d+\.\d+\.\d+$/', $v)) $err = 'La versión tiene que ser del tipo 2.23.1'; if ($k === 'rondas_multijugador' && !ctype_digit($v)) $err = 'Las rondas tienen que ser un número.'; $new[$k] = $v; }
    if (!$err) { $chg = []; foreach ($new as $k => $v) if ($v !== $A[$k]['value']) { arcade_db()->prepare('UPDATE settings SET value = ? WHERE key = ?')->execute([$v, $k]); $chg[] = "$k = $v"; }
      if ($chg) { cms_log('cms', 'ajustes', 'cambiados', implode(', ', $chg)); cms_changed(); } go(['p' => 'ajustes'], $chg ? 'Ajustes guardados.' : 'No había nada que cambiar.'); }
  }
  $sel = function ($k, $opts) use ($A) { $h = '<select name="' . $k . '">'; foreach ($opts as $v => $t) $h .= '<option value="' . e($v) . '"' . ((string)$A[$k]['value'] === (string)$v ? ' selected' : '') . '>' . e($t) . '</option>'; return $h . '</select>'; };
  ob_start(); ?>
  <h1>Ajustes</h1>
  <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif ?>
  <form method="post" class="card"><?= csrf_field() ?><div class="grid">
    <div><label>Versión</label><input name="version" value="<?= e($A['version']['value']) ?>" pattern="\d+\.\d+\.\d+"><p class="hint">Súbela (p. ej. 2.23.1) cuando cambies juegos para que los móviles descarguen lo nuevo.</p></div>
    <div><label>Portada y listados</label><?= $sel('portada', ['1' => 'Sí: portada, categorías y colecciones', '0' => 'No: web solo de juegos (/<id>)']) ?></div>
    <div><label>Modo de pantalla</label><?= $sel('modo', ['automatico' => 'Automático (detecta la tele)', 'seleccionable' => 'Seleccionable (botón 📺 / 📱)', 'modonormal' => 'Siempre táctil', 'modotv' => 'Siempre tele (mando)']) ?><p class="hint">En la web manda cada subdominio (🌐 Webs): la de la tele siempre en modo TV y las demás nunca. Este ajuste vale para la PWA suelta y las apps.</p></div>
    <div><label>Idioma</label><?= $sel('idioma', ['auto' => 'Automático, con botón para cambiar', 'es' => 'Siempre español', 'en' => 'Siempre inglés']) ?></div>
    <div><label>Jugadores por turnos en la tele</label><?= $sel('jugadores_max', ['1' => '1', '2' => '2', '3' => '3', '4' => '4']) ?></div>
    <div><label>Rondas en partidas por turnos</label><input type="number" min="1" max="20" name="rondas_multijugador" value="<?= e($A['rondas_multijugador']['value']) ?>"></div>
  </div><p><button class="pri">💾 Guardar ajustes</button></p></form>
  <form method="post" class="card"><?= csrf_field() ?><b>Archivos de la PWA</b><p class="mut" style="margin:6px 0 10px">Se regeneran solos tras cada cambio (<code>pwa/games.js</code>, <code>pwa/config.js</code> y las huellas <code>?v=</code>). Último cambio del catálogo: <?= e($A['actualizado']['value'] ?? '') ?>.</p><button name="regen" value="1">🔄 Regenerar ahora</button></form>
  <?php page('Ajustes', (string)ob_get_clean(), 'ajustes');
}

/* ───────── historial ───────── */
if ($p === 'log') {
  $rows = cms_db()->query('SELECT * FROM log ORDER BY ts DESC LIMIT 300')->fetchAll(); $names = ['game' => '🎮', 'category' => '🗂️', 'collection' => '📚', 'cms' => '🔑'];
  ob_start(); ?>
  <h1>Historial</h1>
  <div class="card" style="padding:4px 10px"><table><tbody>
  <?php foreach ($rows as $r): ?><tr><td class="mut" style="white-space:nowrap"><?= e(date('d/m/Y H:i', (int)$r['ts'])) ?></td><td><?= $names[$r['kind']] ?? '' ?> <b><?= e($r['id']) ?></b></td><td><?= e($r['action']) ?></td><td class="mut hide-m"><?= e($r['summary']) ?></td></tr><?php endforeach ?>
  <?php if (!$rows): ?><tr><td class="mut">Todavía no hay cambios.</td></tr><?php endif ?>
  </tbody></table></div>
  <?php page('Historial', (string)ob_get_clean(), 'log');
}

/* ───────── copia de seguridad ───────── */
if ($p === 'backup') {
  $f = __DIR__ . '/data/arcade.sqlite';
  if (($_GET['do'] ?? '') === 'export') {   // copia coherente aunque alguien esté escribiendo
    $tmp = tempnam(sys_get_temp_dir(), 'arc'); @unlink($tmp); arcade_db()->exec('VACUUM INTO ' . arcade_db()->quote($tmp));
    header('Content-Type: application/vnd.sqlite3'); header('Content-Disposition: attachment; filename="arcade-' . date('Ymd-His') . '.sqlite"'); header('Content-Length: ' . filesize($tmp));
    readfile($tmp); @unlink($tmp); exit;
  }
  $msg = '';
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['db']['tmp_name']) && is_uploaded_file($_FILES['db']['tmp_name'])) {
    $up = $_FILES['db']['tmp_name'];
    try { $t = new PDO('sqlite:' . $up, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); $tabs = $t->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN); $n = (int)$t->query('SELECT COUNT(*) FROM games')->fetchColumn(); $t = null; }
    catch (Throwable $e) { $tabs = []; $n = 0; }
    if (array_diff(['games', 'categories', 'collections', 'settings', 'controls'], $tabs)) $msg = 'Ese archivo no es una base de datos del Arcade (le faltan tablas).';
    else {
      @copy($f, __DIR__ . '/data/arcade.anterior.sqlite');   // por si acaso: la de antes se queda al lado
      if (!@move_uploaded_file($up, $f)) $msg = 'No se ha podido reemplazar data/arcade.sqlite (¿permisos de escritura?).';
      else { cms_log('cms', '-', 'base de datos restaurada', "$n juegos"); cms_changed(); go(['p' => 'backup'], "Base de datos restaurada: $n juegos. La anterior se ha guardado como data/arcade.anterior.sqlite."); }
    }
  }
  $n = (int)arcade_db()->query('SELECT COUNT(*) FROM games WHERE deleted_at IS NULL')->fetchColumn();
  ob_start(); ?>
  <h1>Copia de seguridad</h1>
  <?php if ($msg): ?><div class="flash err"><?= e($msg) ?></div><?php endif ?>
  <div class="card"><h2 style="margin-top:0">Descargar la base de datos</h2><p>Toda la configuración de la web (<b><?= $n ?></b> juegos, categorías, colecciones y ajustes) está en <code>data/arcade.sqlite</code>. Descárgala para tener copia o para llevarte al repositorio los cambios que hagas aquí.</p><a class="btn blue" href="<?= e(cms_url(['p' => 'backup', 'do' => 'export'])) ?>">💾 Descargar arcade.sqlite</a></div>
  <div class="card"><h2 style="margin-top:0">Restaurar</h2><form method="post" enctype="multipart/form-data"><?= csrf_field() ?><p><input type="file" name="db" accept=".sqlite,.db,application/vnd.sqlite3,application/octet-stream" required></p><p class="hint">Sustituye la base de datos entera por la que subas (la actual se guarda como data/arcade.anterior.sqlite).</p><p><button class="pri" data-confirm="¿Sustituir la base de datos por este archivo?">Restaurar</button></p></form></div>
  <div class="card mut"><b>Importante:</b> si publicas la web subiendo el repositorio, <code>data/arcade.sqlite</code> del repositorio sustituye a la del servidor. Antes de publicar, descarga aquí la del servidor si has hecho cambios en el CMS y ponla en el repositorio.</div>
  <?php page('Copia de seguridad', (string)ob_get_clean(), 'backup');
}

go(['p' => 'games']);
