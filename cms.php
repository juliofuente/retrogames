<?php
/* Arcade Perdido · CMS
   ─────────────────────────────────────────────────────────────────────────────
   Panel para añadir, editar y borrar juegos, cambiarlos de categoría y editar categorías y colecciones.
   Se entra en /cms (o /cms.php). La primera vez pide crear la contraseña.

   Los cambios NO se escriben en data/arcade.sqlite (ese archivo lo regenera herramientas/mkdb.py y se perderían):
   se guardan en data/cms.sqlite, y index.php los aplica encima del catálogo en cada visita. Así sobreviven a cada
   nueva versión del catálogo. data/cms.sqlite no se sube a git (.gitignore): haz copias desde «Copia de seguridad».

   Este archivo también lo incluye index.php (con CMS_LIB definido) solo para usar cms_overlay().            */

declare(strict_types=1);

const CMS_INT = ['sort', 'lives', 'cap', 'physics', 'age_min', 'age_max'];
const CMS_KINDS = ['game' => 'games', 'category' => 'categories', 'collection' => 'collections'];

function cms_file(): string { return __DIR__ . '/data/cms.sqlite'; }

function cms_db(bool $create = false): ?PDO {
  static $db = null; if ($db) return $db;
  $f = cms_file(); if (!$create && !is_file($f)) return null;
  $db = new PDO('sqlite:' . $f, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $db->exec('PRAGMA journal_mode=WAL');
  $db->exec('CREATE TABLE IF NOT EXISTS overrides (kind TEXT, id TEXT, state TEXT, data TEXT, updated INTEGER, PRIMARY KEY (kind, id))');
  $db->exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
  $db->exec('CREATE TABLE IF NOT EXISTS log (ts INTEGER, kind TEXT, id TEXT, action TEXT, summary TEXT)');
  $db->exec('CREATE TABLE IF NOT EXISTS logins (ip TEXT, ts INTEGER)');
  return $db;
}

/* state: 'edit' (cambios sobre uno del catálogo), 'new' (creado en el CMS), 'deleted' (en la papelera) */
function cms_overrides(): array {
  $db = cms_db(); if (!$db) return [];
  $out = [];
  foreach ($db->query('SELECT * FROM overrides') as $r) { $r['data'] = json_decode((string)$r['data'], true) ?: []; $out[$r['kind']][$r['id']] = $r; }
  return $out;
}

function cms_cast(array $row): array {
  foreach (CMS_INT as $k) if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '') $row[$k] = (int)$row[$k]; elseif (array_key_exists($k, $row) && $row[$k] === '') $row[$k] = null;
  return $row;
}

/* Aplica los cambios del CMS a los arrays que carga index.php */
function cms_overlay(array &$GAMES, array &$CATS, array &$COLS): void {
  try { $ov = cms_overrides(); } catch (Throwable $e) { return; }
  if (!$ov) return;
  foreach (['category' => 'CATS', 'collection' => 'COLS', 'game' => 'GAMES'] as $kind => $var) {
    $arr = &$$var;
    foreach ($ov[$kind] ?? [] as $id => $o) {
      if ($o['state'] === 'deleted') { unset($arr[$id]); continue; }
      $d = cms_cast($o['data']);
      if ($o['state'] === 'new') { $base = $kind === 'game' ? ['based' => [], 'ages' => []] : []; $arr[$id] = array_merge($base, $d, ['id' => $id]); }
      elseif (isset($arr[$id])) $arr[$id] = array_merge($arr[$id], $d);
    }
    uasort($arr, function ($a, $b) { return ((int)($a['sort'] ?? 0)) <=> ((int)($b['sort'] ?? 0)); });
    unset($arr);
  }
  $firstCat = array_key_first($CATS); $firstCol = array_key_first($COLS);
  foreach ($GAMES as $id => $g) {
    if (!isset($CATS[$g['category_id'] ?? ''])) $GAMES[$id]['category_id'] = $firstCat;
    if (!isset($COLS[$g['collection_id'] ?? ''])) $GAMES[$id]['collection_id'] = $firstCol;
    if (!is_array($GAMES[$id]['ages'] ?? null)) $GAMES[$id]['ages'] = [];
  }
}

if (defined('CMS_LIB')) return;

/* ═════════════════════════════════════════ panel ═════════════════════════════════════════ */

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
function go(array $q = [], string $flash = ''): void { if ($flash !== '') $_SESSION['flash'] = $flash; header('Location: ' . cms_url($q), true, 303); exit; }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . e(csrf()) . '">'; }
function check_csrf(): void { if (!hash_equals(csrf(), (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Sesión caducada: vuelve atrás y recarga la página.'); } }
function setting(string $k): ?string { $db = cms_db(true); $s = $db->prepare('SELECT value FROM settings WHERE key = ?'); $s->execute([$k]); $v = $s->fetchColumn(); return $v === false ? null : (string)$v; }
function set_setting(string $k, string $v): void { cms_db(true)->prepare('REPLACE INTO settings (key, value) VALUES (?, ?)')->execute([$k, $v]); }
function cms_log(string $kind, string $id, string $action, string $summary = ''): void { cms_db(true)->prepare('INSERT INTO log VALUES (?, ?, ?, ?, ?)')->execute([time(), $kind, $id, $action, mb_substr($summary, 0, 300)]); }

function arcade_db(): PDO {
  static $db = null; if ($db) return $db;
  $f = __DIR__ . '/data/arcade.sqlite';
  if (!is_file($f)) { http_response_code(503); exit('Falta data/arcade.sqlite'); }
  return $db = new PDO('sqlite:' . $f, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
}
function base_rows(string $kind): array {
  $t = CMS_KINDS[$kind]; $out = [];
  foreach (arcade_db()->query("SELECT * FROM $t ORDER BY sort") as $r) { if ($kind === 'game') $r['ages'] = []; $out[$r['id']] = $r; }
  if ($kind === 'game') foreach (arcade_db()->query('SELECT * FROM game_age_groups') as $r) if (isset($out[$r['game_id']])) $out[$r['game_id']]['ages'][] = $r['age_group_id'];
  return $out;
}
function columns(string $kind): array { $c = []; foreach (arcade_db()->query('PRAGMA table_info(' . CMS_KINDS[$kind] . ')') as $r) $c[] = $r['name']; return $c; }
/* filas combinadas, con _st = orig | edit | new | deleted */
function rows(string $kind, bool $withDeleted = false): array {
  $base = base_rows($kind); $ov = cms_overrides()[$kind] ?? []; $out = [];
  foreach ($base as $id => $r) {
    $o = $ov[$id] ?? null;
    if ($o && $o['state'] === 'deleted') { if ($withDeleted) $out[$id] = $r + ['_st' => 'deleted']; continue; }
    $out[$id] = $o ? array_merge($r, cms_cast($o['data']), ['_st' => 'edit']) : $r + ['_st' => 'orig'];
  }
  foreach ($ov as $id => $o) {
    if (isset($base[$id])) continue;
    if ($o['state'] === 'new') $out[$id] = array_merge(['ages' => []], cms_cast($o['data']), ['id' => $id, '_st' => 'new']);
    elseif ($o['state'] === 'deleted' && $withDeleted) $out[$id] = array_merge(['ages' => []], cms_cast($o['data']), ['id' => $id, '_st' => 'deleted', '_was_new' => 1]);
  }
  uasort($out, function ($a, $b) { return ((int)($a['sort'] ?? 0)) <=> ((int)($b['sort'] ?? 0)); });
  return $out;
}
/* guarda un elemento: si es del catálogo solo se guarda la diferencia */
function save_item(string $kind, string $id, array $row, string $action): void {
  $db = cms_db(true); $base = base_rows($kind)[$id] ?? null; $row = cms_cast($row); unset($row['_st'], $row['id']);
  if ($base) {
    $diff = []; foreach ($row as $k => $v) { $b = $base[$k] ?? null; if (is_array($v) || is_array($b)) { $x = is_array($v) ? $v : []; $y = is_array($b) ? $b : []; sort($x); sort($y); if ($x !== $y) $diff[$k] = $v; } elseif (($v === null ? '' : (string)$v) !== ($b === null ? '' : (string)$b)) $diff[$k] = $v; }
    if (!$diff) $db->prepare('DELETE FROM overrides WHERE kind = ? AND id = ?')->execute([$kind, $id]);
    else $db->prepare('REPLACE INTO overrides VALUES (?, ?, ?, ?, ?)')->execute([$kind, $id, 'edit', json_encode($diff, JSON_UNESCAPED_UNICODE), time()]);
    cms_log($kind, $id, $action, implode(', ', array_keys($diff)) ?: 'sin cambios respecto al original');
  } else {
    $db->prepare('REPLACE INTO overrides VALUES (?, ?, ?, ?, ?)')->execute([$kind, $id, 'new', json_encode($row, JSON_UNESCAPED_UNICODE), time()]);
    cms_log($kind, $id, $action);
  }
}
function patch_item(string $kind, string $id, array $changes, string $action): void {
  $all = rows($kind); if (!isset($all[$id])) return; save_item($kind, $id, array_merge($all[$id], $changes), $action);
}
function delete_item(string $kind, string $id): void {
  $db = cms_db(true); $all = rows($kind, true); $r = $all[$id] ?? null; if (!$r) return;
  $isBase = isset(base_rows($kind)[$id]);
  $data = $isBase ? [] : $r; unset($data['_st']);
  $db->prepare('REPLACE INTO overrides VALUES (?, ?, ?, ?, ?)')->execute([$kind, $id, 'deleted', json_encode($data, JSON_UNESCAPED_UNICODE), time()]);
  cms_log($kind, $id, 'borrado', (string)($r['title_es'] ?? $r['name_es'] ?? ''));
}
function restore_item(string $kind, string $id): void {
  $db = cms_db(true); $s = $db->prepare('SELECT * FROM overrides WHERE kind = ? AND id = ?'); $s->execute([$kind, $id]); $o = $s->fetch(); if (!$o) return;
  if (isset(base_rows($kind)[$id])) $db->prepare('DELETE FROM overrides WHERE kind = ? AND id = ?')->execute([$kind, $id]);
  else $db->prepare('UPDATE overrides SET state = ?, updated = ? WHERE kind = ? AND id = ?')->execute(['new', time(), $kind, $id]);
  cms_log($kind, $id, 'recuperado');
}
function purge_item(string $kind, string $id): void { // borrar para siempre (solo los creados en el CMS)
  $db = cms_db(true); if (isset(base_rows($kind)[$id])) return;
  $db->prepare('DELETE FROM overrides WHERE kind = ? AND id = ?')->execute([$kind, $id]); cms_log($kind, $id, 'eliminado del todo');
}
function revert_item(string $kind, string $id): void { cms_db(true)->prepare("DELETE FROM overrides WHERE kind = ? AND id = ? AND state = 'edit'")->execute([$kind, $id]); cms_log($kind, $id, 'vuelve al original'); }
function slugify(string $s): string { $s = mb_strtolower(trim($s)); $s = strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n', 'à' => 'a', 'è' => 'e', 'ç' => 'c']); $s = preg_replace('/[^a-z0-9]+/', '-', $s); return trim((string)$s, '-'); }
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
  $tabs = ['games' => '🎮 Juegos', 'cats' => '🗂️ Categorías', 'cols' => '📚 Colecciones', 'trash' => '🗑️ Papelera', 'log' => '🕓 Historial', 'backup' => '💾 Copia'];
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
    const row = el.closest('tr'); if (row && row.querySelector('.stcell') && !row.querySelector('.st.new')) row.querySelector('.stcell').innerHTML = '<span class="st edit">editado</span>';
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
    check_csrf(); $db = cms_db(true); $ip = client_ip();
    $db->prepare('DELETE FROM logins WHERE ts < ?')->execute([time() - 900]);
    $s = $db->prepare('SELECT COUNT(*) FROM logins WHERE ip = ?'); $s->execute([$ip]);
    if ((int)$s->fetchColumn() >= 6) $err = 'Demasiados intentos. Espera unos minutos.';
    elseif (password_verify((string)($_POST['pass'] ?? ''), $hash)) { $db->prepare('DELETE FROM logins WHERE ip = ?')->execute([$ip]); session_regenerate_id(true); $_SESSION['cms_ok'] = 1; go(); }
    else { $db->prepare('INSERT INTO logins VALUES (?, ?)')->execute([$ip, time()]); usleep(400000); $err = 'Contraseña incorrecta.'; }
  }
  page('Entrar', '<div class="login"><div class="card"><h1>Entrar</h1>' . ($err ? '<div class="flash err">' . e($err) . '</div>' : '') . '<form method="post">' . csrf_field() . '<p><label>Contraseña</label><input type="password" name="pass" autocomplete="current-password" required autofocus></p><button class="pri">Entrar</button></form></div></div>');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') check_csrf();

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
  echo json_encode(['ok' => true]); exit;
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

if (in_array($p, ['delete', 'restore', 'purge', 'revert'], true) && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $kind = (string)($_POST['kind'] ?? 'game'); $id = (string)($_POST['id'] ?? ''); if (!isset(CMS_KINDS[$kind])) go();
  if ($p === 'delete' && $kind === 'category') {
    $to = (string)($_POST['to'] ?? ''); $cats = rows('category');
    if (!isset($cats[$to]) || $to === $id) go(['p' => 'cats'], 'Elige a qué categoría pasan sus juegos.');
    $n = 0; foreach (rows('game') as $gid => $g) if (($g['category_id'] ?? '') === $id) { patch_item('game', $gid, ['category_id' => $to], 'cambio de categoría (se borró «' . ($cats[$id]['name_es'] ?? $id) . '»)'); $n++; }
    delete_item('category', $id); go(['p' => 'cats'], "Categoría borrada. $n juegos pasan a «" . $cats[$to]['name_es'] . '».');
  }
  if ($p === 'delete') delete_item($kind, $id); elseif ($p === 'restore') restore_item($kind, $id); elseif ($p === 'purge') purge_item($kind, $id); else revert_item($kind, $id);
  $msg = ['delete' => 'Enviado a la papelera (se puede recuperar).', 'restore' => 'Recuperado.', 'purge' => 'Eliminado del todo.', 'revert' => 'Vuelve a estar como en el catálogo original.'][$p];
  $back = (string)($_POST['back'] ?? ''); go($back === 'trash' ? ['p' => 'trash'] : ($kind === 'category' ? ['p' => 'cats'] : ($kind === 'collection' ? ['p' => 'cols'] : ['p' => 'games'])), $msg);
}

/* ───────── juegos: lista ───────── */
if ($p === 'games') {
  $L = lists(); $games = rows('game');
  $fc = (string)($_GET['cat'] ?? ''); $fl = (string)($_GET['col'] ?? ''); $fs = (string)($_GET['st'] ?? '');
  $list = array_filter($games, function ($g) use ($fc, $fl, $fs) { return ($fc === '' || $g['category_id'] === $fc) && ($fl === '' || $g['collection_id'] === $fl) && ($fs === '' || $g['_st'] === $fs); });
  $catsOpt = function ($sel) use ($L) { return options($L['cat'], $sel); };
  ob_start(); ?>
  <h1>Juegos <span class="count">(<span id="cnt"><?= count($list) ?></span> de <?= count($games) ?>)</span></h1>
  <form class="bar" method="get" action="<?= e(cms_url()) ?>"><input type="hidden" name="p" value="games">
    <input type="search" id="q" placeholder="🔎 Buscar por nombre o id…" autocomplete="off">
    <select name="col" onchange="this.form.submit()"><option value="">Todas las colecciones</option><?= options($L['col'], $fl) ?></select>
    <select name="cat" onchange="this.form.submit()"><option value="">Todas las categorías</option><?= options($L['cat'], $fc) ?></select>
    <select name="st" onchange="this.form.submit()"><option value="">Todos</option><option value="edit"<?= $fs === 'edit' ? ' selected' : '' ?>>Editados</option><option value="new"<?= $fs === 'new' ? ' selected' : '' ?>>Creados aquí</option><option value="orig"<?= $fs === 'orig' ? ' selected' : '' ?>>Sin cambios</option></select>
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
  <table class="resp"><thead><tr><th><input type="checkbox" id="selall"></th><th></th><th>Juego</th><th>Categoría</th><th>Colección</th><th>Estado</th><th></th></tr></thead><tbody>
  <?php foreach ($list as $id => $g): ?>
    <tr data-s="<?= e(mb_strtolower($id . ' ' . $g['title_es'] . ' ' . $g['title_en'])) ?>">
      <td class="ck"><input type="checkbox" name="ids[]" value="<?= e($id) ?>"></td>
      <td class="em"><?= e($g['emoji']) ?></td>
      <td class="t"><b><?= e($g['title_es']) ?></b><small><?= e($id) ?><?= $g['added_version'] ? ' · v' . e($g['added_version']) : '' ?></small></td>
      <td class="wide"><select data-quick="category_id" data-id="<?= e($id) ?>"><?= $catsOpt($g['category_id']) ?></select></td>
      <td class="hide-m"><select data-quick="collection_id" data-id="<?= e($id) ?>"><?= options($L['col'], $g['collection_id']) ?></select></td>
      <td class="stcell"><?= $g['_st'] === 'edit' ? '<span class="st edit">editado</span>' : ($g['_st'] === 'new' ? '<span class="st new">creado aquí</span>' : '') ?></td>
      <td class="acts"><a class="btn sm" href="<?= e(cms_url(['p' => 'edit', 'id' => $id])) ?>">✏️ Editar</a> <a class="btn sm" target="_blank" href="<?= e($GLOBALS['SITE_URL'] . $id) ?>">▶</a></td>
    </tr>
  <?php endforeach ?>
  </tbody></table></div></form>
  <p class="hint">Los cambios de categoría y colección de la tabla se guardan solos. La web pública los muestra al momento.</p>
  <?php page('Juegos', (string)ob_get_clean(), 'games');
}

/* ───────── juegos: añadir / editar ───────── */
if ($p === 'edit') {
  $L = lists(); $id = (string)($_GET['id'] ?? ''); $games = rows('game'); $isNew = $id === ''; $err = '';
  if (!$isNew && !isset($games[$id])) go(['p' => 'games'], 'Ese juego no existe.');
  $base = isset(base_rows('game')[$id]); $g = $isNew ? ['id' => '', 'slug_en' => '', 'collection_id' => 'pro', 'category_id' => array_key_first($L['cat']), 'control_id' => 'tocar', 'file' => '', 'url' => '', 'emoji' => '🎮', 'color' => '#ff6b6b', 'theme_color' => '#1a1033', 'bg1' => '#2b1a5c', 'bg2' => '#1a1033', 'font' => 'round', 'deco' => '[]', 'title_es' => '', 'title_en' => '', 'tag_es' => '', 'tag_en' => '', 'desc_es' => '', 'desc_en' => '', 'help_es' => '', 'help_en' => '', 'tvhelp_es' => '', 'tvhelp_en' => '', 'tv' => null, 'origin' => '', 'lives' => 3, 'levels' => 'endless', 'cap' => null, 'physics' => 0, 'added_version' => 'cms', 'sort' => 5000, 'subject_id' => null, 'age_min' => null, 'age_max' => null, 'langs' => 'es,en', 'app' => null, 'ages' => [], '_st' => 'new'] : $games[$id];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = $_POST; $row = $g;
    foreach (['title_es', 'title_en', 'tag_es', 'tag_en', 'desc_es', 'desc_en', 'help_es', 'help_en', 'tvhelp_es', 'tvhelp_en', 'origin', 'emoji', 'color', 'theme_color', 'bg1', 'bg2', 'levels', 'langs', 'app', 'added_version'] as $k) if (isset($in[$k])) $row[$k] = trim((string)$in[$k]);
    foreach (['collection_id' => $L['col'], 'category_id' => $L['cat'], 'control_id' => $L['ctrl'], 'subject_id' => $L['subj']] as $k => $opts) if (isset($in[$k])) $row[$k] = isset($opts[$in[$k]]) ? (string)$in[$k] : null;
    $row['tv'] = in_array($in['tv'] ?? '', ['cursor', 'cruceta'], true) ? $in['tv'] : null;
    foreach (['sort', 'lives', 'cap', 'age_min', 'age_max'] as $k) if (isset($in[$k])) $row[$k] = $in[$k] === '' ? null : (int)$in[$k];
    $row['physics'] = !empty($in['physics']) ? 1 : 0;
    $row['ages'] = array_values(array_intersect((array)($in['ages'] ?? []), array_keys($L['age'])));
    if ($row['added_version'] === '') $row['added_version'] = null;
    if ($row['app'] === '') $row['app'] = null;
    if ($isNew) { $id = slugify((string)($in['id'] ?? '')); $row['slug_en'] = slugify((string)($in['slug_en'] ?? '')) ?: $id; }
    if ($isNew) { if ($id === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $id)) $err = 'El identificador solo puede tener letras minúsculas, números y guiones.'; elseif (isset(rows('game', true)[$id]) || in_array($id, ['cms', 'api', 'pwa', 'juego', 'juegos', 'categoria', 'coleccion', 'buscar', 'tv', 'en', 'icono', 'data', 'educativos', 'herramientas'], true)) $err = 'Ya hay un juego (o una página) con ese identificador.'; foreach (rows('game', true) as $o) if (($o['slug_en'] ?? '') === $row['slug_en']) $err = 'Ya hay un juego con ese nombre en inglés para la URL.'; }
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
    if (!$err && $row['title_es'] === '') $err = 'Falta el título en español.';
    if (!$err) { if ($row['title_en'] === '') $row['title_en'] = $row['title_es']; save_item('game', $id, $row, $isNew ? 'creado' : 'editado'); go(['p' => 'edit', 'id' => $id], $isNew ? 'Juego creado.' : 'Cambios guardados.'); }
    $g = $row; $g['id'] = $id;
  }
  $src = preg_match('#^https?://#', (string)$g['url']) ? 'url' : 'file';
  $t = function ($k, $label, $hint = '', $cls = '') use ($g) { return '<div class="' . $cls . '"><label>' . e($label) . '</label><input name="' . $k . '" value="' . e($g[$k] ?? '') . '">' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  $ta = function ($k, $label, $hint = '') use ($g) { return '<div class="w2"><label>' . e($label) . '</label><textarea name="' . $k . '">' . e($g[$k] ?? '') . '</textarea>' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  $n = function ($k, $label, $hint = '') use ($g) { return '<div><label>' . e($label) . '</label><input type="number" name="' . $k . '" value="' . e($g[$k] ?? '') . '">' . ($hint ? '<p class="hint">' . $hint . '</p>' : '') . '</div>'; };
  ob_start(); ?>
  <p><a href="<?= e(cms_url(['p' => 'games'])) ?>">← Juegos</a></p>
  <h1><?= $isNew ? 'Añadir juego' : e($g['emoji'] . ' ' . $g['title_es']) ?> <?= $g['_st'] === 'edit' ? '<span class="st edit">editado</span>' : ($g['_st'] === 'new' && !$isNew ? '<span class="st new">creado aquí</span>' : '') ?></h1>
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
  </div></div>
  <div class="card"><h2 style="margin-top:0">Detalles</h2><div class="grid">
    <?= $n('lives', 'Vidas') ?><?= $t('levels', 'Niveles', 'Un número, «endless» (por récord) o «infinite».') ?><?= $n('cap', 'Nivel máximo de dificultad') ?>
    <?= $t('langs', 'Idiomas', 'Separados por comas: es,en') ?>
    <div><label>Fondo (arriba / abajo)</label><div style="display:flex;gap:6px"><input type="color" name="bg1" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['bg1']) ? $g['bg1'] : '#2b1a5c') ?>" style="height:40px;padding:3px"><input type="color" name="bg2" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['bg2']) ? $g['bg2'] : '#1a1033') ?>" style="height:40px;padding:3px"><input type="color" name="theme_color" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', (string)$g['theme_color']) ? $g['theme_color'] : '#1a1033') ?>" style="height:40px;padding:3px" title="Color de la barra del móvil"></div></div>
    <div><label style="display:flex;gap:8px;align-items:center;margin-top:24px;color:var(--ink)"><input type="checkbox" name="physics" value="1" <?= !empty($g['physics']) ? 'checked' : '' ?>> Usa física</label></div>
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
    <?php if ($g['_st'] === 'edit'): ?><form method="post" action="<?= e(cms_url(['p' => 'revert'])) ?>"><?= csrf_field() ?><input type="hidden" name="kind" value="game"><input type="hidden" name="id" value="<?= e($g['id']) ?>"><button data-confirm="¿Deshacer todos los cambios y dejarlo como en el catálogo original?">↩️ Volver al original</button></form><?php endif ?>
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
      <td class="acts"><?= $c['_st'] === 'edit' ? '<span class="st edit">editada</span> ' : ($c['_st'] === 'new' ? '<span class="st new">nueva</span> ' : '') ?><a class="btn sm" href="<?= e(cms_url(['p' => 'item', 'kind' => $kind, 'id' => $id])) ?>">✏️ Editar</a></td></tr>
  <?php endforeach ?></tbody></table></div>
  <?php if ($kind === 'category'): ?><a class="btn pri" href="<?= e(cms_url(['p' => 'item', 'kind' => 'category'])) ?>">＋ Nueva categoría</a><?php else: ?><p class="hint">Las colecciones tienen su propia portada, por eso aquí solo se editan sus textos, emoji y orden.</p><?php endif ?>
  <?php page($kind === 'category' ? 'Categorías' : 'Colecciones', (string)ob_get_clean(), $p);
}

if ($p === 'item') {
  $kind = (string)($_GET['kind'] ?? 'category'); if (!in_array($kind, ['category', 'collection'], true)) go();
  $id = (string)($_GET['id'] ?? ''); $items = rows($kind); $isNew = $id === ''; $err = ''; $tab = $kind === 'category' ? 'cats' : 'cols';
  if ($isNew && $kind !== 'category') go(['p' => 'cols']);
  if (!$isNew && !isset($items[$id])) go(['p' => $tab], 'No existe.');
  $c = $isNew ? ['slug_es' => '', 'slug_en' => '', 'name_es' => '', 'name_en' => '', 'emoji' => '📁', 'genre' => 'Arcade', 'desc_es' => '', 'desc_en' => '', 'sort' => count($items), '_st' => 'new'] : $items[$id];
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $row = $c; foreach (['name_es', 'name_en', 'emoji', 'desc_es', 'desc_en', 'genre'] as $k) if (isset($_POST[$k])) $row[$k] = trim((string)$_POST[$k]);
    $row['sort'] = (int)($_POST['sort'] ?? 0); if ($kind === 'collection') unset($row['genre']);
    if ($isNew) { $row['slug_es'] = slugify((string)($_POST['slug_es'] ?? '') ?: $row['name_es']); $row['slug_en'] = slugify((string)($_POST['slug_en'] ?? '') ?: ($row['name_en'] ?: $row['name_es'])); $id = $row['slug_es']; foreach (rows($kind, true) as $oid => $o) if ($oid === $id || $o['slug_es'] === $row['slug_es'] || $o['slug_en'] === $row['slug_en']) $err = 'Ya hay una categoría con ese nombre o esa URL.'; }
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
    <?php if ($c['_st'] === 'edit'): ?><form method="post" action="<?= e(cms_url(['p' => 'revert'])) ?>"><?= csrf_field() ?><input type="hidden" name="kind" value="<?= e($kind) ?>"><input type="hidden" name="id" value="<?= e($id) ?>"><button data-confirm="¿Volver a los textos originales?">↩️ Volver al original</button></form><?php endif ?>
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
  $del = []; foreach (['game', 'category'] as $k) foreach (rows($k, true) as $id => $r) if ($r['_st'] === 'deleted') $del[] = [$k, $id, $r];
  ob_start(); ?>
  <h1>Papelera</h1>
  <?php if (!$del): ?><div class="card mut">No hay nada en la papelera.</div><?php else: ?>
  <div class="card" style="padding:4px 10px"><table class="resp"><tbody>
  <?php foreach ($del as [$k, $id, $r]): ?>
    <tr><td class="em"><?= e($r['emoji'] ?? '') ?></td><td class="t"><b><?= e($r['title_es'] ?? $r['name_es'] ?? $id) ?></b><small><?= $k === 'game' ? 'Juego' : 'Categoría' ?> · <?= e($id) ?></small></td>
      <td class="acts">
        <form method="post" action="<?= e(cms_url(['p' => 'restore'])) ?>" style="display:inline"><?= csrf_field() ?><input type="hidden" name="kind" value="<?= e($k) ?>"><input type="hidden" name="id" value="<?= e($id) ?>"><input type="hidden" name="back" value="trash"><button class="sm blue">♻️ Recuperar</button></form>
        <?php if (!empty($r['_was_new'])): ?><form method="post" action="<?= e(cms_url(['p' => 'purge'])) ?>" style="display:inline"><?= csrf_field() ?><input type="hidden" name="kind" value="<?= e($k) ?>"><input type="hidden" name="id" value="<?= e($id) ?>"><input type="hidden" name="back" value="trash"><button class="sm bad" data-confirm="Se eliminará para siempre. ¿Seguro?">Eliminar del todo</button></form><?php endif ?>
      </td></tr>
  <?php endforeach ?></tbody></table></div>
  <p class="hint">Los juegos del catálogo original solo se pueden recuperar; los creados aquí también se pueden eliminar del todo (su archivo en pwa/ no se borra).</p>
  <?php endif ?>
  <?php page('Papelera', (string)ob_get_clean(), 'trash');
}

/* ───────── historial ───────── */
if ($p === 'log') {
  $rows = cms_db(true)->query('SELECT * FROM log ORDER BY ts DESC LIMIT 300')->fetchAll(); $names = ['game' => '🎮', 'category' => '🗂️', 'collection' => '📚', 'cms' => '🔑'];
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
  if (($_GET['do'] ?? '') === 'export') {
    $data = ['app' => 'arcade-perdido-cms', 'version' => 1, 'exported' => date('c'), 'overrides' => cms_db(true)->query('SELECT kind, id, state, data, updated FROM overrides')->fetchAll()];
    header('Content-Type: application/json; charset=utf-8'); header('Content-Disposition: attachment; filename="cms-arcade-' . date('Ymd-His') . '.json"');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
  }
  $msg = '';
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['json']['tmp_name']) && is_uploaded_file($_FILES['json']['tmp_name'])) {
    $j = json_decode((string)file_get_contents($_FILES['json']['tmp_name']), true);
    if (!is_array($j) || ($j['app'] ?? '') !== 'arcade-perdido-cms' || !is_array($j['overrides'] ?? null)) $msg = 'Ese archivo no es una copia del CMS.';
    else {
      $db = cms_db(true); $db->beginTransaction(); if (!empty($_POST['replace'])) $db->exec('DELETE FROM overrides');
      $st = $db->prepare('REPLACE INTO overrides VALUES (?, ?, ?, ?, ?)'); $n = 0;
      foreach ($j['overrides'] as $o) { if (!isset(CMS_KINDS[$o['kind'] ?? '']) || !in_array($o['state'] ?? '', ['edit', 'new', 'deleted'], true) || !is_string($o['id'] ?? null)) continue; $st->execute([$o['kind'], $o['id'], $o['state'], is_string($o['data']) ? $o['data'] : json_encode($o['data'], JSON_UNESCAPED_UNICODE), (int)($o['updated'] ?? time())]); $n++; }
      $db->commit(); cms_log('cms', '-', 'copia importada', "$n cambios"); go(['p' => 'backup'], "Copia importada: $n cambios.");
    }
  }
  $n = (int)cms_db(true)->query('SELECT COUNT(*) FROM overrides')->fetchColumn();
  ob_start(); ?>
  <h1>Copia de seguridad</h1>
  <?php if ($msg): ?><div class="flash err"><?= e($msg) ?></div><?php endif ?>
  <div class="card"><h2 style="margin-top:0">Descargar</h2><p>Hay <b><?= $n ?></b> cambios guardados en el CMS. Descárgalos en un archivo para tener copia o llevarlos a otro servidor.</p><a class="btn blue" href="<?= e(cms_url(['p' => 'backup', 'do' => 'export'])) ?>">💾 Descargar copia (.json)</a></div>
  <div class="card"><h2 style="margin-top:0">Restaurar</h2><form method="post" enctype="multipart/form-data"><?= csrf_field() ?><p><input type="file" name="json" accept=".json,application/json" required></p><p><label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="replace" value="1"> Borrar antes los cambios actuales (si no, se mezclan)</label></p><button class="pri" data-confirm="¿Importar esta copia?">Importar</button></form></div>
  <div class="card mut"><b>Dónde se guarda:</b> en <code>data/cms.sqlite</code>, aparte del catálogo (<code>data/arcade.sqlite</code>), para que no se pierda al publicar juegos nuevos. Ese archivo no está en git: si subes la web desde cero, recuerda conservarlo o importar una copia.</div>
  <?php page('Copia de seguridad', (string)ob_get_clean(), 'backup');
}

go(['p' => 'games']);
