<?php
/* Arcade Perdido · webs por subdominio (tabla «sites» de data/arcade.sqlite, se edita en el CMS → 🌐 Webs)
   ─────────────────────────────────────────────────────────────────────────────
   Cada fila es una web: arcadeplus.juegosboom.com, educativos.juegosboom.com, tv.juegosboom.com…
     host         subdominio («arcadeplus»: vale para cualquier dominio) o el host entero («arcadeplus.juegosboom.com»).
                  «*» es la web por defecto: la que sale con cualquier otro host (el dominio sin subdominio, localhost…).
     collections  colecciones que enseña, separadas por comas («pro», «mesa,soli»), o «*» para todas.
     tv           1 → web para la tele: solo los juegos que se juegan con mando, siempre en modo TV y con la portada de TV.
                  0 → nunca hay modo TV (ni detección automática, ni botón 📺, ni ?tv=1).
     name_*, emoji, tag_*, desc_*   nombre, emoji y textos de la portada.
     font, c_*    su aspecto: fuente de Google Fonts y colores (fondo, tarjetas, texto, texto suave, acento y texto sobre el acento).
   Desde una web no se puede pasar a otra: los juegos, colecciones, categorías y portadas de la PWA que no son suyos dan 404. */

const SITE_COLS = ['id', 'host', 'name_es', 'name_en', 'emoji', 'tag_es', 'tag_en', 'desc_es', 'desc_en', 'collections', 'tv', 'font', 'c_bg', 'c_surface', 'c_text', 'c_muted', 'c_accent', 'c_ink', 'sort'];

function sites_ensure(PDO $db): void {
  if ($db->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'sites'")->fetchColumn()) return;
  $db->exec("CREATE TABLE sites (id TEXT PRIMARY KEY, host TEXT NOT NULL UNIQUE, name_es TEXT NOT NULL, name_en TEXT, emoji TEXT, tag_es TEXT, tag_en TEXT, desc_es TEXT, desc_en TEXT,
    collections TEXT NOT NULL DEFAULT '*', tv INTEGER NOT NULL DEFAULT 0, font TEXT, c_bg TEXT, c_surface TEXT, c_text TEXT, c_muted TEXT, c_accent TEXT, c_ink TEXT, sort INTEGER DEFAULT 0)");
  $seed = [
    ['principal', '*', 'Arcade Perdido', 'Arcade Perdido', '🕹️', 'Juega un rato. Sin anuncios.', 'Play a little. No ads.', '', '', '*', 0, 'Nunito', '#f6f4fb', '#ffffff', '#1d1a2e', '#6c6884', '#ffce3a', '#2a2100', 0],
    ['arcade', 'arcade', 'Arcade Perdido', 'Lost Arcade', '🕹️', 'Las recreativas que nadie volvió a hacer.', 'The arcade games nobody made again.', '', '', 'main', 0, 'Rubik', '#120c24', '#1d1638', '#f4effe', '#a89fc9', '#ff3d9a', '#ffffff', 1],
    ['arcadeplus', 'arcadeplus', 'Arcade Pro', 'Arcade Pro', '✨', 'Los éxitos del móvil, hechos con emojis.', 'Mobile hits, made with emojis.', '', '', 'pro', 0, 'Baloo 2', '#0b1324', '#15213c', '#eef4ff', '#98a8c6', '#3de0ff', '#03252e', 2],
    ['mesa', 'mesa', 'Juegos de mesa', 'Board games', '♟️', 'Los clásicos de tablero, contra la máquina.', 'Board classics, against the machine.', '', '', 'mesa', 0, 'Lora', '#f4ecdf', '#fffaf1', '#2b1d10', '#7a6450', '#b5762c', '#ffffff', 3],
    ['solitarios', 'solitarios', 'Solitarios', 'Solitaire', '🃏', 'Cien solitarios con cartas grandes.', 'A hundred solitaires with big cards.', '', '', 'soli', 0, 'Playfair Display', '#0d3b26', '#145234', '#f3f7ef', '#a9c7b4', '#f2c14e', '#2b1d00', 4],
    ['educativos', 'educativos', 'Juegos educativos', 'Educational games', '🎓', 'Aprender jugando, de 3 a 16 años.', 'Learning through play, ages 3 to 16.', '', '', 'edu', 0, 'Fredoka', '#eef7ff', '#ffffff', '#14324a', '#5b7890', '#ff8a3d', '#ffffff', 5],
    ['tv', 'tv', 'Arcade TV', 'Arcade TV', '📺', 'Para jugar en la tele con el mando.', 'Play on your TV with the remote.', '', '', '*', 1, 'Nunito', '#0b0b14', '#17172a', '#f1f1fa', '#9a9ab8', '#7c5cff', '#ffffff', 6],
  ];
  $st = $db->prepare('INSERT INTO sites (' . implode(',', SITE_COLS) . ') VALUES (' . implode(',', array_fill(0, count(SITE_COLS), '?')) . ')');
  foreach ($seed as $r) $st->execute($r);
}

/* la web del host: primero el host exacto, luego el subdominio (primera parte del host) y si no, la de «*» */
function site_for_host(PDO $db, string $host): array {
  sites_ensure($db);
  $host = strtolower(preg_replace('/:\d+$/', '', $host));
  $rows = $db->query('SELECT * FROM sites ORDER BY sort')->fetchAll(PDO::FETCH_ASSOC);
  $label = explode('.', $host)[0];
  $hit = null;
  foreach ($rows as $r) if (strtolower($r['host']) === $host) $hit = $r;
  if (!$hit && strpos($host, '.') !== false) foreach ($rows as $r) if (strpos($r['host'], '.') === false && strtolower($r['host']) === $label) { $hit = $r; break; }
  if (!$hit) foreach ($rows as $r) if ($r['host'] === '*') { $hit = $r; break; }
  if (!$hit) $hit = ['id' => 'principal', 'host' => '*', 'name_es' => 'Arcade Perdido', 'name_en' => 'Arcade Perdido', 'emoji' => '🕹️', 'collections' => '*', 'tv' => 0];
  $hit['cols'] = trim((string)$hit['collections']) === '*' ? null : array_values(array_filter(array_map('trim', explode(',', (string)$hit['collections']))));
  $hit['tv'] = (int)$hit['tv'] === 1;
  return $hit;
}

/* colores: mezcla dos #rrggbb (t = 0 → a, 1 → b) */
function site_mix(string $a, string $b, float $t): string {
  $p = function ($h) { $h = ltrim($h, '#'); if (strlen($h) === 3) $h = $h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2]; return [hexdec(substr($h, 0, 2)), hexdec(substr($h, 2, 2)), hexdec(substr($h, 4, 2))]; };
  [$x, $y] = [$p($a), $p($b)]; $o = '#';
  for ($i = 0; $i < 3; $i++) $o .= str_pad(dechex((int)round($x[$i] + ($y[$i] - $x[$i]) * $t)), 2, '0', STR_PAD_LEFT);
  return $o;
}
function site_dark(string $hex): bool { $h = ltrim($hex, '#'); if (strlen($h) !== 6) return false; return (0.299 * hexdec(substr($h, 0, 2)) + 0.587 * hexdec(substr($h, 2, 2)) + 0.114 * hexdec(substr($h, 4, 2))) < 128; }
/* las variables CSS de la web a partir de sus seis colores */
function site_css(array $s): string {
  $ok = function ($v, $d) { return preg_match('/^#[0-9a-f]{6}$/i', (string)$v) ? strtolower($v) : $d; };
  $bg = $ok($s['c_bg'] ?? '', '#f6f4fb'); $sf = $ok($s['c_surface'] ?? '', '#ffffff'); $tx = $ok($s['c_text'] ?? '', '#1d1a2e');
  $mu = $ok($s['c_muted'] ?? '', '#6c6884'); $ac = $ok($s['c_accent'] ?? '', '#ffce3a'); $ink = $ok($s['c_ink'] ?? '', '#2a2100');
  $dark = site_dark($bg); [$r, $g, $b] = sscanf($sf, '#%02x%02x%02x');
  $v = ['--bg' => $bg, '--sf' => $sf, '--sf2' => site_mix($sf, $tx, $dark ? 0.08 : 0.05), '--line' => site_mix($sf, $tx, $dark ? 0.16 : 0.1), '--tx' => $tx, '--mu' => $mu,
    '--ac' => $ac, '--ac2' => site_mix($ac, $dark ? '#ffffff' : '#000000', 0.15), '--ink' => $ink, '--hd' => "rgba($r,$g,$b,.92)",
    '--chip' => site_mix($sf, $ac, $dark ? 0.22 : 0.2), '--chiptx' => $dark ? site_mix($tx, $ac, 0.25) : site_mix($tx, $ac, 0.15),
    '--feat' => $dark ? site_mix($sf, '#000000', 0.3) : $tx, '--feattx' => $dark ? $tx : $bg, '--featmu' => $dark ? $mu : site_mix($bg, $tx, 0.25),
    '--sh' => $dark ? '0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.35)' : '0 1px 2px rgba(29,26,46,.06),0 6px 20px rgba(29,26,46,.07)',
    '--sh2' => $dark ? '0 4px 10px rgba(0,0,0,.35),0 18px 40px rgba(0,0,0,.45)' : '0 4px 10px rgba(29,26,46,.10),0 18px 40px rgba(29,26,46,.14)'];
  $o = ':root{'; foreach ($v as $k => $x) $o .= "$k:$x;"; return $o . 'color-scheme:' . ($dark ? 'dark' : 'light') . '}';
}
function site_font(array $s): string { $f = trim((string)($s['font'] ?? '')); return preg_match('/^[A-Za-z0-9 ]{2,40}$/', $f) ? $f : 'Nunito'; }
