<?php
/**
 * gamevideo.php  v1
 * ---------------------------------------------------------------------------
 * Genera un vídeo vertical (1080x1920) «gancho» con un puzle de lógica aleatorio de un juego aleatorio
 * (sudoku, futoshiki, rascacielos, takuzu, kakurasu, star battle, nonograma, numberlink, hashi, slitherlink)
 * y publica rss.xml con los últimos vídeos (título, descripción y vídeo de cada uno).
 *
 * Todo en PHP: el puzle se genera aquí (con solución única en los de números, estrellas, kakurasu y nonograma),
 * cada fotograma se dibuja con GD y ffmpeg monta el vídeo con música, efectos y narración (edge-tts, opcional).
 *
 * Estructura del vídeo (~30 s):
 *   1. Gancho: «SOLO EL 1 % LO RESUELVE» + el tablero vacío (y la voz lo dice)
 *   2. Reglas del juego en un recuadro (la voz las lee)
 *   3. Cuenta atrás para pensarlo (10 s, con tictac)
 *   4. La solución, paso a paso, con las casillas nuevas resaltadas
 *   5. Resuelto: sello rojo 完 y la pregunta final («¿Lo has conseguido?»)
 *   6. Cierre: «Juega gratis» con la dirección del juego
 *
 * Textos: gancho, reto, título, descripción y pregunta final los escribe DeepSeek (si hay clave) en inglés o
 * español; si no hay clave o falla, se usan plantillas. Las reglas son fijas (para que sean correctas).
 *
 * Salida (en la carpeta del script):
 *   videos/AAAAMMDD-HHMMSS-<juego>-<n>.mp4   (se guardan los 'rss_items' últimos; los más viejos se borran)
 *   rss.xml                                  un item por vídeo, el más nuevo primero
 *   .gamevideo/                              log, lock, items.json y temporales (work/, se borran al acabar)
 *
 * Uso web (para el cron por URL; lanza la generación en segundo plano y responde al momento):
 *   gamevideo.php                 un puzle aleatorio de un juego aleatorio, idioma aleatorio (en/es)
 *   gamevideo.php?game=hashi      un juego concreto (sudoku futoshiki rascacielos takuzu kakurasu estrellas
 *                                 nonograma numberlink hashi slitherlink)
 *   gamevideo.php?lang=es         idioma (en | es)
 *   gamevideo.php?wait=8          segundos de cuenta atrás
 *   gamevideo.php?log=1           log (se refresca solo mientras genera)
 *   gamevideo.php?diag=1          diagnóstico: PHP, GD, ffmpeg, edge-tts, DeepSeek, permisos…
 *   gamevideo.php?fg=1            en primer plano (puede cortarlo el timeout del servidor)
 *   Cron (cada 6 horas):  0 0-23/6 * * * curl -s "https://tudominio/gamevideo/gamevideo.php" > /dev/null
 *
 * Uso CLI:
 *   php gamevideo.php [--game=id] [--lang=en|es] [--wait=10] [--seed=N] [--host=dominio] [--no-tts] [--no-ai]
 *                     [--keep] [--dry-run] [--diag] [--help]
 *   --dry-run  genera el puzle y los textos y deja tres fotogramas de muestra en .gamevideo/preview-*.png
 *
 * Clave de DeepSeek: variable de entorno DEEPSEEK_API_KEY, o fichero deepseek.key junto al script, o $CFG.
 * Fuentes: fonts/LilitaOne-Regular.ttf y fonts/LuckiestGuy-Regular.ttf (Google Fonts) si están; si no, DejaVu.
 *          Para el kanji del sello: una fuente CJK (fonts/NotoSansJP-Bold.ttf o la Noto CJK del sistema); si no, un ✓.
 * Requisitos: PHP 8.1+ (gd con FreeType, curl, mbstring), ffmpeg/ffprobe con libx264. edge-tts y DeepSeek opcionales.
 * ---------------------------------------------------------------------------
 */

declare(strict_types=1);
set_time_limit(0);
ini_set('memory_limit', '1024M');
mb_internal_encoding('UTF-8');

const STATE_DIR = __DIR__ . '/.gamevideo';
const LOG_FILE  = STATE_DIR . '/gamevideo.log';
const LOCK_FILE = STATE_DIR . '/gamevideo.lock';
const ITEMS_FILE = STATE_DIR . '/items.json';
@mkdir(STATE_DIR, 0775, true);
error_reporting(E_ALL);
ini_set('display_errors', PHP_SAPI === 'cli' ? 'stderr' : '0');
ini_set('log_errors', '1');

$extraPath = ['/usr/local/bin', '/usr/bin', '/bin', '/opt/homebrew/bin', '/snap/bin'];
if ($h = getenv('HOME')) $extraPath[] = "$h/.local/bin";
putenv('PATH=' . implode(PATH_SEPARATOR, array_unique(array_filter(array_merge(explode(PATH_SEPARATOR, (string)getenv('PATH')), $extraPath)))));
if (!getenv('HOME')) putenv('HOME=' . sys_get_temp_dir());

set_error_handler(function (int $no, string $msg, string $file, int $line): bool {
    if (!(error_reporting() & $no)) return false;
    logm(sprintf('PHP aviso (%d): %s en %s:%d', $no, $msg, basename($file), $line));
    return true;
});
set_exception_handler(function (Throwable $e): void { logm('✖ EXCEPCIÓN NO CAPTURADA: ' . fmtEx($e)); exit(1); });
register_shutdown_function(function (): void {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true))
        logm(sprintf('✖ ERROR FATAL: %s en %s:%d', $e['message'], basename($e['file']), $e['line']));
});

// ===========================================================================
// CONFIGURACIÓN
// ===========================================================================
$CFG = [
    'out'          => __DIR__,                       // rss.xml y videos/ se escriben aquí
    'videos_dir'   => 'videos',
    'host'         => 'juegosboom.com',              // dominio si no hay SERVER_NAME (cron/CLI)
    'scheme'       => 'https',
    'url_path'     => '/gamevideo/',                 // carpeta pública donde está este script
    'play_url'     => 'https://orientales.juegosboom.com/{id}',   // dónde se juega ({id} = juego)
    'play_label'   => 'juegosboom.com',              // lo que se lee en pantalla
    'rss_title'    => 'Logic puzzles — JuegosBoom',
    'rss_items'    => 20,                            // vídeos que se guardan (y salen en el RSS)
    'langs'        => ['en', 'es'],                  // idioma al azar entre estos (o ?lang=)
    'games'        => [],                            // [] = todos; o una lista de ids
    'wait'         => 10,                            // segundos de cuenta atrás
    'fonts_dir'    => __DIR__ . '/fonts',
    'ffmpeg'       => 'ffmpeg',
    'ffprobe'      => 'ffprobe',
    'edge_tts'     => 'edge-tts',                    // p. ej. '/opt/edge-tts/bin/edge-tts'
    'tts'          => true,
    'voices'       => ['en' => 'en-US-AndrewNeural', 'es' => 'es-ES-AlvaroNeural'],
    'tts_rate'     => '+6%',
    'music'        => __DIR__ . '/../mimusica',      // fichero o carpeta con mp3/m4a (una canción al azar)
    'music_vol'    => 0.16,
    'sfx'          => true,                          // tictac de la cuenta atrás y campanita de la solución
    'deepseek_key' => '',                            // o DEEPSEEK_API_KEY o deepseek.key
    'deepseek_model' => 'deepseek-chat',
    'deepseek_url' => 'https://api.deepseek.com/chat/completions',
    'ss'           => 2,                             // supermuestreo al dibujar (2 = bordes suaves)
    'fps'          => 30,
    'crf'          => 21,
    'preset'       => 'veryfast',
    'user_agent'   => 'Mozilla/5.0 (compatible; gamevideo/1.0)',
    'php_cli'      => '',
];
const W = 1080;
const H = 1920;

// ===========================================================================
// ENTRADA: CLI o web
// ===========================================================================
$isCli = PHP_SAPI === 'cli';
if ($isCli) {
    $opt = getopt('', ['game:', 'lang:', 'wait:', 'seed:', 'host:', 'scheme:', 'no-tts', 'no-ai', 'keep', 'dry-run', 'diag', 'help']);
} else {
    $opt = array_intersect_key($_GET, array_flip(['game', 'lang', 'wait', 'log', 'diag', 'fg']));
    $isDomain = fn(string $h) => (bool)preg_match('/^(?=.*[a-z])[a-z0-9.\-]+\.[a-z]{2,}$/i', $h);
    foreach ([(string)($_SERVER['SERVER_NAME'] ?? ''), (string)($_SERVER['HTTP_HOST'] ?? '')] as $h) {
        $h = preg_replace('/:\d+$/', '', $h);
        if ($isDomain($h)) { $opt['host'] = $h; break; }
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
    $opt['scheme'] = $https ? 'https' : 'http';
    if (!empty($_SERVER['SCRIPT_NAME'])) $CFG['url_path'] = rtrim(dirname((string)$_SERVER['SCRIPT_NAME']), '/') . '/';
}
if (isset($opt['help'])) { echo preg_replace('/^.*?\/\*\*|\*\/.*$/s', '', file_get_contents(__FILE__, false, null, 0, 5200)), "\n"; exit(0); }
if (!empty($opt['host']) && preg_match('/^[A-Za-z0-9.\-]+$/', (string)$opt['host'])) $CFG['host'] = (string)$opt['host'];
if (isset($opt['scheme']) && in_array($opt['scheme'], ['http', 'https'], true)) $CFG['scheme'] = (string)$opt['scheme'];
if (isset($opt['wait'])) $CFG['wait'] = max(3, min(30, (int)$opt['wait']));
if (isset($opt['no-tts'])) $CFG['tts'] = false;
if ($CFG['deepseek_key'] === '') $CFG['deepseek_key'] = (string)(getenv('DEEPSEEK_API_KEY') ?: (is_file(__DIR__ . '/deepseek.key') ? trim((string)file_get_contents(__DIR__ . '/deepseek.key')) : ''));
if (isset($opt['no-ai'])) $CFG['deepseek_key'] = '';
foreach (['ffmpeg', 'ffprobe', 'edge_tts'] as $k) if (!str_contains(trim($CFG[$k]), ' ') && ($p = whichCmd($CFG[$k]))) $CFG[$k] = $p;

if (!$isCli) webEntry($opt, $CFG);

// ===========================================================================
// UTILIDADES
// ===========================================================================
function logm(string $msg): void
{
    $line = '[' . date('Y-m-d H:i:s') . "] $msg\n";
    echo $line;
    @file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX);
    if (PHP_SAPI !== 'cli') @flush();
}
function fmtEx(Throwable $e): string
{
    return get_class($e) . ': ' . $e->getMessage() . "\n    en " . basename($e->getFile()) . ':' . $e->getLine() .
        "\n    Traza:\n      " . str_replace("\n", "\n      ", mb_substr($e->getTraceAsString(), 0, 2500));
}
function fnOk(string $f): bool
{
    if (!function_exists($f)) return false;
    return !in_array($f, array_map('trim', explode(',', (string)ini_get('disable_functions'))), true);
}
function whichCmd(string $cmd): ?string
{
    $bin = strtok(trim($cmd), ' ');
    if ($bin === false || $bin === '') return null;
    if (str_contains($bin, '/') || str_contains($bin, '\\')) return (@is_file($bin) && @is_executable($bin)) ? $bin : null;
    $exts = PHP_OS_FAMILY === 'Windows' ? ['.exe', '.bat', '.cmd', ''] : [''];
    foreach (explode(PATH_SEPARATOR, (string)getenv('PATH')) as $d) {
        if ($d === '') continue;
        foreach ($exts as $e) { $p = rtrim($d, '/\\') . DIRECTORY_SEPARATOR . $bin . $e; if (@is_file($p) && @is_executable($p)) return $p; }
    }
    return null;
}
function phpCli(array $CFG): ?string
{
    $c = [];
    if ($CFG['php_cli'] !== '') $c[] = $CFG['php_cli'];
    if (PHP_SAPI === 'cli') $c[] = PHP_BINARY;
    $v = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
    array_push($c, PHP_BINDIR . '/php', PHP_BINDIR . "/php$v", "/usr/bin/php$v", '/usr/bin/php', '/usr/local/bin/php', 'php', "php$v");
    foreach ($c as $cand) { $p = whichCmd($cand); if ($p && !preg_match('/fpm|cgi/i', basename($p))) return $p; }
    return null;
}
function isRunning(): bool
{
    if (!is_file(LOCK_FILE)) return false;
    $h = @fopen(LOCK_FILE, 'c'); if (!$h) return false;
    $free = flock($h, LOCK_EX | LOCK_NB); if ($free) flock($h, LOCK_UN); fclose($h);
    return !$free;
}
function tailLog(int $lines): string
{
    if (!is_file(LOG_FILE)) return "(log vacío)\n";
    return implode('', array_slice(file(LOG_FILE) ?: [], -$lines));
}
function run(string $cmd, ?string &$out = null): void
{
    $out = '';
    $p = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($p)) throw new RuntimeException("No se pudo ejecutar: $cmd");
    $out = stream_get_contents($pipes[1]); $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    $code = proc_close($p);
    if ($code !== 0) throw new RuntimeException("Comando falló (código $code)\n    Comando: " . mb_substr($cmd, 0, 1500) . "\n    Salida de error:\n      " . str_replace("\n", "\n      ", mb_substr(trim($err), -2000)));
}
function probeDuration(string $file): float
{
    global $CFG;
    run(escapeshellarg($CFG['ffprobe']) . ' -v error -show_entries format=duration -of csv=p=0 ' . escapeshellarg($file), $out);
    return (float)trim((string)$out);
}
function slugify(string $s): string
{
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
    return trim(substr(strtolower((string)preg_replace('/[^A-Za-z0-9]+/', '-', $s)), 0, 70), '-') ?: 'video';
}
function pickMusic(?string $path): ?string
{
    if (!$path) return null;
    if (is_file($path)) return $path;
    if (is_dir($path)) { $f = glob(rtrim($path, '/\\') . '/*.{mp3,m4a,wav,ogg}', GLOB_BRACE) ?: []; return $f ? $f[array_rand($f)] : null; }
    return null;
}
function rrmdir(string $dir): void
{
    if (!is_dir($dir)) return;
    foreach (scandir($dir) as $f) { if ($f === '.' || $f === '..') continue; $p = "$dir/$f"; is_dir($p) ? rrmdir($p) : @unlink($p); }
    @rmdir($dir);
}
function baseUrl(array $CFG): string { $p = trim((string)$CFG['url_path'], '/'); return $CFG['scheme'] . '://' . $CFG['host'] . '/' . ($p !== '' ? "$p/" : ''); }
function currentUser(): string
{
    if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) return (string)(posix_getpwuid(posix_geteuid())['name'] ?? '?');
    return (string)(getenv('USER') ?: get_current_user());
}
/** Quita emojis y símbolos que las fuentes de GD no pueden dibujar. */
function plain(string $s): string
{
    $s = (string)preg_replace('/[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}\x{200D}\x{20E3}]/u', '', $s);
    return trim((string)preg_replace('/\s+/u', ' ', $s));
}

// ===========================================================================
// AZAR (con semilla, para poder repetir un vídeo)
// ===========================================================================
function rf(): float { return mt_rand() / (mt_getrandmax() + 1); }
function ri(int $a, int $b): int { return mt_rand($a, $b); }
function pick(array $a) { $a = array_values($a); return $a[mt_rand(0, count($a) - 1)]; }
function shuf(array $a): array { $a = array_values($a); for ($i = count($a) - 1; $i > 0; $i--) { $j = mt_rand(0, $i); [$a[$i], $a[$j]] = [$a[$j], $a[$i]]; } return $a; }
function popc(int $m): int { $n = 0; while ($m) { $m &= $m - 1; $n++; } return $n; }
function n4(int $w, int $h, int $i): array { $x = $i % $w; $y = intdiv($i, $w); $o = []; if ($x > 0) $o[] = $i - 1; if ($x < $w - 1) $o[] = $i + 1; if ($y > 0) $o[] = $i - $w; if ($y < $h - 1) $o[] = $i + $w; return $o; }
function lkey(int $a, int $b): string { return $a < $b ? "{$a}_{$b}" : "{$b}_{$a}"; }

// ===========================================================================
// RESOLUTOR GENÉRICO (casillas con valores 1..n; cand($g, $i) = máscara de bits 1<<v)
// ===========================================================================
function solveCount(int $N, array $g, callable $cand, int $limit, int &$budget): int
{
    $best = -1; $bm = 0; $bc = 99;
    for ($i = 0; $i < $N; $i++) {
        if ($g[$i]) continue;
        $m = $cand($g, $i); $c = popc($m);
        if ($c === 0) return 0;
        if ($c < $bc) { $bc = $c; $best = $i; $bm = $m; if ($c === 1) break; }
    }
    if ($best < 0) return 1;
    $n = 0;
    for ($v = 1; ($bm >> $v) > 0; $v++) {
        if (!(($bm >> $v) & 1)) continue;
        if (--$budget < 0) return $limit;            // sin presupuesto: lo damos por «no único»
        $g[$best] = $v; $n += solveCount($N, $g, $cand, $limit - $n, $budget);
        if ($n >= $limit) return $n;
    }
    return $n;
}
function fillRandom(int $N, array $g, callable $cand, int &$budget): ?array
{
    $best = -1; $bm = 0; $bc = 99;
    for ($i = 0; $i < $N; $i++) {
        if ($g[$i]) continue;
        $m = $cand($g, $i); $c = popc($m);
        if ($c === 0) return null;
        if ($c < $bc) { $bc = $c; $best = $i; $bm = $m; }
    }
    if ($best < 0) return $g;
    $vals = []; for ($v = 1; ($bm >> $v) > 0; $v++) if (($bm >> $v) & 1) $vals[] = $v;
    foreach (shuf($vals) as $v) {
        if (--$budget < 0) return null;
        $g[$best] = $v; $r = fillRandom($N, $g, $cand, $budget); if ($r) return $r;
    }
    return null;
}
function isUnique(int $N, array $g, callable $cand, int $budget = 60000): bool { return solveCount($N, $g, $cand, 2, $budget) === 1; }
/** Quita pistas (casillas) mientras la solución siga siendo única. */
function reduceCells(array $sol, callable $cand, int $budget = 40000): array
{
    $N = count($sol); $fix = $sol;
    foreach (shuf(range(0, $N - 1)) as $i) { $v = $fix[$i]; $fix[$i] = 0; if (!isUnique($N, $fix, $cand, $budget)) $fix[$i] = $v; }
    return $fix;
}
/** Orden «razonado» de relleno: primero la casilla con menos posibilidades. */
function orderCells(array $fix, array $sol, callable $cand): array
{
    $g = $fix; $acts = [];
    while (true) {
        $best = -1; $bc = 99;
        foreach ($g as $i => $v) { if ($v) continue; $c = popc($cand($g, $i)); if ($c < $bc) { $bc = $c; $best = $i; } }
        if ($best < 0) break;
        $g[$best] = $sol[$best]; $acts[] = ['c' => $best, 'v' => $sol[$best]];
    }
    return $acts;
}
function latinOk(array $g, int $n, int $i): bool
{
    $v = $g[$i]; $x = $i % $n; $y = intdiv($i, $n);
    for ($k = 0; $k < $n; $k++) { if ($k !== $x && $g[$y * $n + $k] === $v) return false; if ($k !== $y && $g[$k * $n + $x] === $v) return false; }
    return true;
}
/** cand() a partir de una función ok($g, $i) que comprueba el valor puesto en $i. */
function candFromOk(int $vals, callable $ok): callable
{
    return function (array $g, int $i) use ($vals, $ok): int {
        $m = 0; for ($v = 1; $v <= $vals; $v++) { $g[$i] = $v; if ($ok($g, $i)) $m |= 1 << $v; } return $m;
    };
}

// ===========================================================================
// LIENZO (GD con supermuestreo)
// ===========================================================================
final class Cv
{
    public $im;
    public function __construct(public float $s = 2.0) { $this->im = imagecreatetruecolor((int)(W * $s), (int)(H * $s)); imagealphablending($this->im, true); }
    public function X(float $v): int { return (int)round($v * $this->s); }
    public function c(string $hex, float $a = 1.0): int
    {
        $h = ltrim($hex, '#'); if (strlen($h) === 3) $h = $h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2];
        return imagecolorallocatealpha($this->im, hexdec(substr($h, 0, 2)), hexdec(substr($h, 2, 2)), hexdec(substr($h, 4, 2)), (int)round(127 * (1 - max(0, min(1, $a)))));
    }
    public function rect(float $x, float $y, float $w, float $h, int $col): void { if ($w <= 0 || $h <= 0) return; imagefilledrectangle($this->im, $this->X($x), $this->X($y), $this->X($x + $w) - 1, $this->X($y + $h) - 1, $col); }
    public function rrect(float $x, float $y, float $w, float $h, float $r, int $col): void
    {
        $r = max(0, min($r, $w / 2, $h / 2)); if ($r < 1) { $this->rect($x, $y, $w, $h, $col); return; }
        $this->rect($x + $r, $y, $w - 2 * $r, $h, $col);
        $this->rect($x, $y + $r, $r, $h - 2 * $r, $col);
        $this->rect($x + $w - $r, $y + $r, $r, $h - 2 * $r, $col);
        $d = $this->X(2 * $r);
        foreach ([[$x + $r, $y + $r, 180, 270], [$x + $w - $r, $y + $r, 270, 360], [$x + $w - $r, $y + $h - $r, 0, 90], [$x + $r, $y + $h - $r, 90, 180]] as [$cx, $cy, $a, $b])
            imagefilledarc($this->im, $this->X($cx), $this->X($cy), $d, $d, $a, $b, $col, IMG_ARC_PIE);
    }
    public function circle(float $cx, float $cy, float $r, int $col): void { imagefilledellipse($this->im, $this->X($cx), $this->X($cy), $this->X(2 * $r), $this->X(2 * $r), $col); }
    /** Anillo (o arco) grueso: de a0 a a1 en grados (0 = arriba, sentido horario). */
    public function arc(float $cx, float $cy, float $r, float $th, int $col, float $a0 = 0, float $a1 = 360): void
    {
        $n = max(8, (int)(abs($a1 - $a0) / 4)); $ri = $r - $th / 2; $ro = $r + $th / 2;
        for ($k = 0; $k < $n; $k++) {
            $t0 = deg2rad($a0 + ($a1 - $a0) * $k / $n - 90); $t1 = deg2rad($a0 + ($a1 - $a0) * ($k + 1) / $n - 90);
            $p = [$cx + cos($t0) * $ro, $cy + sin($t0) * $ro, $cx + cos($t1) * $ro, $cy + sin($t1) * $ro, $cx + cos($t1) * $ri, $cy + sin($t1) * $ri, $cx + cos($t0) * $ri, $cy + sin($t0) * $ri];
            $this->poly($p, $col);
        }
    }
    public function poly(array $p, int $col): void { imagefilledpolygon($this->im, array_map(fn($v) => $this->X($v), $p), $col); }
    public function line(float $x1, float $y1, float $x2, float $y2, float $th, int $col, bool $caps = true): void
    {
        $dx = $x2 - $x1; $dy = $y2 - $y1; $l = sqrt($dx * $dx + $dy * $dy); if ($l < 0.01) { if ($caps) $this->circle($x1, $y1, $th / 2, $col); return; }
        $nx = -$dy / $l * $th / 2; $ny = $dx / $l * $th / 2;
        $this->poly([$x1 + $nx, $y1 + $ny, $x2 + $nx, $y2 + $ny, $x2 - $nx, $y2 - $ny, $x1 - $nx, $y1 - $ny], $col);
        if ($caps) { $this->circle($x1, $y1, $th / 2, $col); $this->circle($x2, $y2, $th / 2, $col); }
    }
    public function star(float $cx, float $cy, float $r, int $col): void
    {
        $p = []; for ($k = 0; $k < 10; $k++) { $a = deg2rad(-90 + $k * 36); $rr = $k % 2 ? $r * 0.45 : $r; $p[] = $cx + cos($a) * $rr; $p[] = $cy + sin($a) * $rr; }
        $this->poly($p, $col);
    }
    private function pt(float $px): float { return $px * $this->s * 0.75; }
    public function textW(string $t, float $px, string $font): float { $b = imagettfbbox($this->pt($px), 0, $font, $t); return abs($b[2] - $b[0]) / $this->s; }
    /** Texto de una línea centrado (en vertical por su caja) en x,y. align: center|left|right. */
    public function text(string $t, float $x, float $y, float $px, int $col, string $font, string $align = 'center', ?int $outline = null, float $ow = 0, float $angle = 0): void
    {
        if ($t === '') return;
        $pt = $this->pt($px); $b = imagettfbbox($pt, 0, $font, $t);
        $w = $b[2] - $b[0]; $top = min($b[5], $b[7]); $bot = max($b[1], $b[3]);
        $X = $this->X($x) - ($align === 'center' ? $w / 2 : ($align === 'right' ? $w : 0)) - $b[0];
        $Y = $this->X($y) - ($top + $bot) / 2;
        if ($outline !== null && $ow > 0) {
            $o = $ow * $this->s; $steps = 12;
            for ($k = 0; $k < $steps; $k++) { $a = 2 * M_PI * $k / $steps; imagettftext($this->im, $pt, $angle, (int)round($X + cos($a) * $o), (int)round($Y + sin($a) * $o), $outline, $font, $t); }
        }
        imagettftext($this->im, $pt, $angle, (int)round($X), (int)round($Y), $col, $font, $t);
    }
    /** Párrafo ajustado: el tamaño más grande que cabe en maxW con maxLines líneas. Devuelve la altura usada. */
    public function para(string $t, float $cx, float $cy, float $maxW, float $maxPx, float $minPx, int $maxLines, int $col, string $font, ?int $outline = null, float $ow = 0): float
    {
        $t = plain($t); if ($t === '') return 0;
        for ($px = $maxPx; $px >= $minPx; $px -= 2) { $lines = $this->wrap($t, $maxW, $px, $font); if (count($lines) <= $maxLines) break; }
        $lines = array_slice($lines, 0, $maxLines); $lh = $px * 1.18; $y0 = $cy - $lh * (count($lines) - 1) / 2;
        foreach ($lines as $k => $l) {
            // centrado vertical por la línea base común (no por la caja de cada línea)
            $b = imagettfbbox($this->pt($px), 0, $font, 'Hg'); $mid = (min($b[5], $b[7]) + max($b[1], $b[3])) / 2 / $this->s;
            $w = $this->textW($l, $px, $font); $X = $cx - $w / 2; $Y = $y0 + $k * $lh - $mid;
            if ($outline !== null && $ow > 0) for ($q = 0; $q < 12; $q++) { $a = 2 * M_PI * $q / 12; imagettftext($this->im, $this->pt($px), 0, $this->X($X + cos($a) * $ow), $this->X($Y + sin($a) * $ow), $outline, $font, $l); }
            imagettftext($this->im, $this->pt($px), 0, $this->X($X), $this->X($Y), $col, $font, $l);
        }
        return $lh * count($lines);
    }
    public function wrap(string $t, float $maxW, float $px, string $font): array
    {
        $out = []; $cur = '';
        foreach (preg_split('/\s+/u', $t) as $w) { $try = $cur === '' ? $w : "$cur $w"; if ($cur !== '' && $this->textW($try, $px, $font) > $maxW) { $out[] = $cur; $cur = $w; } else $cur = $try; }
        if ($cur !== '') $out[] = $cur;
        return $out;
    }
    public function save(string $path): void
    {
        if ($this->s != 1.0) { $d = imagecreatetruecolor(W, H); imagecopyresampled($d, $this->im, 0, 0, 0, 0, W, H, imagesx($this->im), imagesy($this->im)); imagepng($d, $path, 1); imagedestroy($d); }
        else imagepng($this->im, $path, 1);
    }
    public function copyFrom($src): void { imagecopy($this->im, $src, 0, 0, 0, 0, imagesx($src), imagesy($src)); }
}

// ===========================================================================
// FUENTES
// ===========================================================================
function fonts(array $CFG): array
{
    $d = $CFG['fonts_dir'];
    $first = function (array $c) { foreach ($c as $f) if ($f && is_file($f)) return $f; return null; };
    $sys = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'];
    $big = $first(array_merge(["$d/LuckiestGuy-Regular.ttf", "$d/LilitaOne-Regular.ttf", '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'], $sys));
    $num = $first(array_merge(["$d/LilitaOne-Regular.ttf", "$d/Fredoka-SemiBold.ttf", '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'], $sys));
    $txt = $first(array_merge(["$d/LilitaOne-Regular.ttf", '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'], $sys));
    $cjk = $first(["$d/NotoSansJP-Bold.ttf", "$d/NotoSerifJP-Bold.otf", '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc', '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf']);
    if (!$big) throw new RuntimeException("No encuentro ninguna fuente TTF: pon LilitaOne-Regular.ttf en $d");
    return ['big' => $big, 'num' => $num ?: $big, 'txt' => $txt ?: $big, 'cjk' => $cjk];
}

// ===========================================================================
// TEXTOS FIJOS
// ===========================================================================
$TXT = [
    'en' => ['puzzle' => 'PUZZLE', 'rules' => 'HOW TO PLAY', 'think' => 'THINK!', 'solution' => 'SOLUTION', 'play' => 'PLAY FREE', 'follow' => 'Follow for a new puzzle every day',
        'n_sol' => "Here's the solution.", 'seconds' => 'seconds', 'hooks' => ['ONLY 1% CAN SOLVE THIS', '99% GET THIS WRONG', 'GENIUS-LEVEL PUZZLE', 'CAN YOU BEAT THE CLOCK?', 'TEST YOUR BRAIN', 'NO GUESSING ALLOWED'],
        'challenge' => 'Can you solve it in %d seconds?', 'outro' => ['Did you get it?', 'How fast were you?', 'Did you solve it in time?'],
        'title' => '%s puzzle: can you solve it in %3$d seconds? 🧩 #shorts #puzzle', 'desc' => "Only real logic fans get this %s right. %s\nPlay free, no download: %s\n#puzzle #logic #brainteaser #%s #shorts"],
    'es' => ['puzzle' => 'PUZLE', 'rules' => 'CÓMO SE JUEGA', 'think' => '¡PIENSA!', 'solution' => 'SOLUCIÓN', 'play' => 'JUEGA GRATIS', 'follow' => 'Síguenos: un puzle nuevo cada día',
        'n_sol' => 'Aquí está la solución.', 'seconds' => 'segundos', 'hooks' => ['SOLO EL 1 % LO RESUELVE', 'EL 99 % FALLA ESTE', 'PUZLE NIVEL GENIO', '¿PUEDES CON EL RELOJ?', 'PON A PRUEBA TU CEREBRO', 'SIN ADIVINAR: SOLO LÓGICA'],
        'challenge' => '¿Lo resuelves en %d segundos?', 'outro' => ['¿Lo has conseguido?', '¿Cuánto has tardado?', '¿Te ha dado tiempo?'],
        'title' => 'Puzle de %s: ¿lo resuelves en %3$d segundos? 🧩 #shorts #puzle', 'desc' => "Solo los amantes de la lógica aciertan este %s. %s\nJuega gratis, sin descargas: %s\n#puzle #logica #acertijo #%s #shorts"],
];

// ===========================================================================
// JUEGOS: cada uno genera un puzle P (w, h, solución y pistas), sus jugadas de solución y se dibuja.
// Estado: ['c' => casillas, 'L' => enlaces 'a_b' => v, 'E' => bordes 'h…'/'v…' => 1]
// ===========================================================================
const C_PAPER = '#fbf6ea'; const C_INK = '#2b2233'; const C_GRID = '#cfc3ad'; const C_THICK = '#3a2f2a'; const C_USER = '#2f5aa8'; const C_SEAL = '#c92a2a';
const PASTEL = ['#ffd8d8', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff', '#ffe8cc', '#c3fae8', '#ffdeeb', '#e9ecef', '#d8f5a2'];
const LINKCOL = ['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5', '#0c8599', '#e64980', '#5f3dc4', '#a0522d', '#66a80f', '#495057', '#d9480f'];

function games(): array
{
    return [
        'sudoku' => ['name' => ['en' => 'Sudoku', 'es' => 'Sudoku'], 'kanji' => '数', 'bg' => ['#2d3561', '#151935'], 'tag' => 'sudoku',
            'rules' => ['en' => 'Fill the grid so every row, column and box has each number exactly once.', 'es' => 'Rellena la cuadrícula: cada fila, columna y caja lleva cada número una sola vez.']],
        'futoshiki' => ['name' => ['en' => 'Futoshiki', 'es' => 'Futoshiki'], 'kanji' => '不', 'bg' => ['#3b2a5c', '#1a1030'], 'tag' => 'futoshiki',
            'rules' => ['en' => 'Numbers 1 to %n, no repeats in any row or column. Obey every < and > sign.', 'es' => 'Números del 1 al %n sin repetir en filas ni columnas. Respeta cada signo < y >.']],
        'rascacielos' => ['name' => ['en' => 'Skyscrapers', 'es' => 'Rascacielos'], 'kanji' => '塔', 'bg' => ['#1f3b5c', '#0b1a2b'], 'tag' => 'skyscrapers',
            'rules' => ['en' => 'Buildings of height 1 to %n, no repeats in a row or column. Each clue says how many you can see from that side.', 'es' => 'Edificios de altura 1 a %n, sin repetir en filas ni columnas. Cada pista dice cuántos se ven desde ese lado.']],
        'takuzu' => ['name' => ['en' => 'Binary puzzle', 'es' => 'Takuzu'], 'kanji' => '二', 'bg' => ['#4d1f2a', '#200c12'], 'tag' => 'binairo',
            'rules' => ['en' => 'Fill with 0 and 1. Never three equal in a row, the same number of each in every line, and no two lines alike.', 'es' => 'Rellena con 0 y 1. Nunca tres iguales seguidos, mismos ceros que unos en cada línea y sin líneas repetidas.']],
        'kakurasu' => ['name' => ['en' => 'Kakurasu', 'es' => 'Kakurasu'], 'kanji' => '加', 'bg' => ['#1f2b5c', '#0c1229'], 'tag' => 'kakurasu',
            'rules' => ['en' => 'Paint cells. Each one is worth its grey number. Rows and columns must add up to the red sums.', 'es' => 'Pinta casillas. Cada una vale su número gris. Filas y columnas deben sumar los números rojos.']],
        'estrellas' => ['name' => ['en' => 'Star Battle', 'es' => 'Batalla de estrellas'], 'kanji' => '星', 'bg' => ['#2c2050', '#120c22'], 'tag' => 'starbattle',
            'rules' => ['en' => 'Place one star in every row, column and colored region. Stars never touch, not even diagonally.', 'es' => 'Pon una estrella en cada fila, columna y región de color. Las estrellas no se tocan, ni en diagonal.']],
        'nonograma' => ['name' => ['en' => 'Nonogram', 'es' => 'Nonograma'], 'kanji' => '絵', 'bg' => ['#4d1f35', '#220c17'], 'tag' => 'nonogram',
            'rules' => ['en' => 'Fill cells to reveal a picture. The numbers give, in order, the blocks of filled cells in each row and column.', 'es' => 'Rellena casillas para descubrir un dibujo. Los números dicen, en orden, los bloques rellenos de cada fila y columna.']],
        'numberlink' => ['name' => ['en' => 'Number Link', 'es' => 'Numberlink'], 'kanji' => '線', 'bg' => ['#16324f', '#08131f'], 'tag' => 'flowfree',
            'rules' => ['en' => 'Connect each pair of matching numbers. Paths never cross and must fill the whole board.', 'es' => 'Une cada pareja de números iguales. Los caminos no se cruzan y llenan todo el tablero.']],
        'hashi' => ['name' => ['en' => 'Bridges', 'es' => 'Hashi'], 'kanji' => '橋', 'bg' => ['#123a4f', '#06182a'], 'tag' => 'hashi',
            'rules' => ['en' => 'Connect the islands with straight bridges, one or two between a pair. Each number is its total of bridges, and all islands must link up.', 'es' => 'Une las islas con puentes rectos, uno o dos entre cada pareja. Cada número es su total de puentes y todas quedan unidas.']],
        'slitherlink' => ['name' => ['en' => 'Slitherlink', 'es' => 'Slitherlink'], 'kanji' => '環', 'bg' => ['#1d3b26', '#0b1a10'], 'tag' => 'slitherlink',
            'rules' => ['en' => 'Draw one closed loop along the dots. Each number tells how many of its four sides are part of the loop.', 'es' => 'Dibuja un único bucle cerrado entre los puntos. Cada número dice cuántos de sus cuatro lados forman parte del bucle.']],
    ];
}

// ---------- SUDOKU ----------
function gen_sudoku(): array
{
    $big = rf() < 0.45; $n = $big ? 9 : 6; $bh = $big ? 3 : 2; $bw = 3;
    $cand = function (array $g, int $i) use ($n, $bh, $bw): int {
        $y = intdiv($i, $n); $x = $i % $n; $m = 0; $by = $y - $y % $bh; $bx = $x - $x % $bw;
        for ($k = 0; $k < $n; $k++) { $m |= 1 << $g[$y * $n + $k]; $m |= 1 << $g[$k * $n + $x]; }
        for ($yy = $by; $yy < $by + $bh; $yy++) for ($xx = $bx; $xx < $bx + $bw; $xx++) $m |= 1 << $g[$yy * $n + $xx];
        return ((1 << ($n + 1)) - 2) & ~$m;
    };
    do { $b = 200000; $sol = fillRandom($n * $n, array_fill(0, $n * $n, 0), $cand, $b); } while (!$sol);
    $fix = reduceCells($sol, $cand, $n === 9 ? 20000 : 20000);
    // un poco más fácil que el mínimo: devuelve algunas pistas (para que se pueda en 10-15 s… casi)
    $empties = array_keys(array_filter($fix, fn($v) => !$v));
    foreach (array_slice(shuf($empties), 0, (int)round(count($empties) * ($n === 9 ? 0.25 : 0.2))) as $i) $fix[$i] = $sol[$i];
    return ['w' => $n, 'h' => $n, 'n' => $n, 'bh' => $bh, 'bw' => $bw, 'fix' => $fix, 'sol' => $sol, 'acts' => orderCells($fix, $sol, $cand), 'size' => "{$n}×{$n}"];
}
function draw_sudoku(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $g = geom($P['w'], $P['h']); paper($cv, $g); $n = $P['n'];
    hlCells($cv, $g, $P['w'], $hl);
    gridLines($cv, $g, $n, $n);
    for ($k = 0; $k <= $n; $k += $P['bw']) $cv->line($g['ox'] + $k * $g['cs'], $g['oy'], $g['ox'] + $k * $g['cs'], $g['oy'] + $n * $g['cs'], 5, $cv->c(C_THICK), false);
    for ($k = 0; $k <= $n; $k += $P['bh']) $cv->line($g['ox'], $g['oy'] + $k * $g['cs'], $g['ox'] + $n * $g['cs'], $g['oy'] + $k * $g['cs'], 5, $cv->c(C_THICK), false);
    nums($cv, $g, $P, $st['c'], $F);
    frame($cv, $g, $n, $n);
}

// ---------- FUTOSHIKI ----------
function gen_futoshiki(): array
{
    $n = rf() < 0.5 ? 5 : 6;
    for ($t = 0; $t < 20; $t++) {
        $b = 100000; $sol = fillRandom($n * $n, array_fill(0, $n * $n, 0), candFromOk($n, fn($g, $i) => latinOk($g, $n, $i)), $b); if (!$sol) continue;
        $rel = [];
        foreach (range(0, $n * $n - 1) as $i) { $x = $i % $n; foreach ([1, $n] as $d) { $j = $i + $d; if (($d === 1 && $x === $n - 1) || $j >= $n * $n) continue; if (rf() < 0.38) $rel[] = [$i, $j]; } }
        // las relaciones se guardan como «a < b» según la solución
        $R = []; foreach ($rel as [$a, $b]) $R[] = $sol[$a] < $sol[$b] ? [$a, $b] : [$b, $a];
        $ok = function (array $g, int $i) use ($n, $R): bool {
            if (!latinOk($g, $n, $i)) return false;
            foreach ($R as [$lo, $hi]) {
                if ($lo === $i) { if ($g[$i] === $n) return false; if ($g[$hi] && $g[$hi] <= $g[$i]) return false; }
                elseif ($hi === $i) { if ($g[$i] === 1) return false; if ($g[$lo] && $g[$lo] >= $g[$i]) return false; }
            }
            return true;
        };
        $cand = candFromOk($n, $ok);
        $fix = reduceCells($sol, $cand, 30000);
        return ['w' => $n, 'h' => $n, 'n' => $n, 'fix' => $fix, 'sol' => $sol, 'rel' => $R, 'acts' => orderCells($fix, $sol, $cand), 'size' => "{$n}×{$n}"];
    }
    throw new RuntimeException('futoshiki');
}
function draw_futoshiki(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $g = geom($P['w'], $P['h']); paper($cv, $g); $n = $P['n']; $cs = $g['cs'];
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n);
    foreach ($P['rel'] as [$lo, $hi]) {
        $a = min($lo, $hi); $b = max($lo, $hi); [$x1, $y1] = cxy($g, $n, $a); [$x2, $y2] = cxy($g, $n, $b);
        $mx = ($x1 + $x2) / 2 + $cs / 2; $my = ($y1 + $y2) / 2 + $cs / 2; $r = $cs * 0.2;
        $cv->circle($mx, $my, $r, $cv->c(C_PAPER)); $col = $cv->c(C_SEAL);
        $horiz = $b - $a === 1; $sign = ($a === $lo) ? '<' : '>';    // a izquierda/arriba
        $q = $r * 0.62; $th = max(4, $cs * 0.06);
        if ($horiz) { $dir = $sign === '<' ? 1 : -1; $cv->line($mx + $dir * $q, $my - $q, $mx - $dir * $q, $my, $th, $col); $cv->line($mx - $dir * $q, $my, $mx + $dir * $q, $my + $q, $th, $col); }
        else { $dir = $sign === '<' ? 1 : -1; $cv->line($mx - $q, $my + $dir * $q, $mx, $my - $dir * $q, $th, $col); $cv->line($mx, $my - $dir * $q, $mx + $q, $my + $dir * $q, $th, $col); }
    }
    nums($cv, $g, $P, $st['c'], $F);
    frame($cv, $g, $n, $n);
}

// ---------- RASCACIELOS ----------
function visible(array $line): int { $m = 0; $c = 0; foreach ($line as $v) if ($v > $m) { $m = $v; $c++; } return $c; }
function skyLines(int $n): array
{
    $L = [];   // [índices de casillas desde el lado de la pista] por cada pista: arriba, abajo, izquierda, derecha
    for ($k = 0; $k < $n; $k++) { $col = []; $row = []; for ($j = 0; $j < $n; $j++) { $col[] = $j * $n + $k; $row[] = $k * $n + $j; }
        $L["t$k"] = $col; $L["b$k"] = array_reverse($col); $L["l$k"] = $row; $L["r$k"] = array_reverse($row); }
    return $L;
}
function gen_rascacielos(): array
{
    $n = rf() < 0.6 ? 5 : 4; $L = skyLines($n);
    for ($t = 0; $t < 30; $t++) {
        $b = 100000; $sol = fillRandom($n * $n, array_fill(0, $n * $n, 0), candFromOk($n, fn($g, $i) => latinOk($g, $n, $i)), $b); if (!$sol) continue;
        $clues = []; foreach ($L as $k => $cells) $clues[$k] = visible(array_map(fn($i) => $sol[$i], $cells));
        $mk = function (array $clues) use ($n, $L): callable {
            return candFromOk($n, function (array $g, int $i) use ($n, $L, $clues): bool {
                if (!latinOk($g, $n, $i)) return false;
                $x = $i % $n; $y = intdiv($i, $n);
                foreach (["t$x", "b$x", "l$y", "r$y"] as $k) {
                    if (!isset($clues[$k])) continue; $vals = array_map(fn($q) => $g[$q], $L[$k]);
                    if (in_array(0, $vals, true)) { // parcial: si ya está el más alto delante, lo visible es definitivo
                        $pre = []; foreach ($vals as $v) { if (!$v) break; $pre[] = $v; } if ($pre && max($pre) === $n && visible($pre) !== $clues[$k]) return false; continue; }
                    if (visible($vals) !== $clues[$k]) return false;
                }
                return true;
            });
        };
        if (!isUnique($n * $n, array_fill(0, $n * $n, 0), $mk($clues), 120000)) continue;
        foreach (shuf(array_keys($clues)) as $k) { $v = $clues[$k]; unset($clues[$k]); if (!isUnique($n * $n, array_fill(0, $n * $n, 0), $mk($clues), 60000)) $clues[$k] = $v; }
        $fix = array_fill(0, $n * $n, 0);
        return ['w' => $n, 'h' => $n, 'n' => $n, 'fix' => $fix, 'sol' => $sol, 'clues' => $clues, 'acts' => orderCells($fix, $sol, $mk($clues)), 'size' => "{$n}×{$n}", 'm' => [1, 1, 1, 1]];
    }
    throw new RuntimeException('rascacielos');
}
function draw_rascacielos(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n, 1, 1, 1, 1); paper($cv, $g); $cs = $g['cs'];
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n);
    foreach ($P['clues'] as $k => $v) {
        $s = $k[0]; $j = (int)substr($k, 1);
        [$x, $y] = match ($s) { 't' => [$g['ox'] + ($j + .5) * $cs, $g['oy'] - .5 * $cs], 'b' => [$g['ox'] + ($j + .5) * $cs, $g['oy'] + ($n + .5) * $cs], 'l' => [$g['ox'] - .5 * $cs, $g['oy'] + ($j + .5) * $cs], default => [$g['ox'] + ($n + .5) * $cs, $g['oy'] + ($j + .5) * $cs] };
        $cv->circle($x, $y, $cs * 0.32, $cv->c('#ffe3e3')); $cv->text((string)$v, $x, $y, $cs * 0.42, $cv->c(C_SEAL), $F['num']);
    }
    // edificios: cuanto más alto, más oscuro el fondo
    foreach ($st['c'] as $i => $v) { if (!$v) continue; [$x, $y] = cxy($g, $n, $i); $cv->rrect($x + 6, $y + 6, $cs - 12, $cs - 12, 10, $cv->c('#4c6ef5', 0.08 + 0.13 * $v / $n)); }
    nums($cv, $g, $P, $st['c'], $F);
    frame($cv, $g, $n, $n);
}

// ---------- TAKUZU ----------
function takuzuOk(array $g, int $n, int $i): bool
{
    $v = $g[$i]; $x = $i % $n; $y = intdiv($i, $n);
    foreach ([[1, 0], [0, 1]] as [$dx, $dy]) {
        $line = []; for ($k = 0; $k < $n; $k++) $line[] = $dx ? $g[$y * $n + $k] : $g[$k * $n + $x];
        $p = $dx ? $x : $y;
        for ($s = max(0, $p - 2); $s <= min($n - 3, $p); $s++) if ($line[$s] && $line[$s] === $line[$s + 1] && $line[$s] === $line[$s + 2]) return false;
        if (count(array_keys($line, $v, true)) > $n / 2) return false;
        if (!in_array(0, $line, true)) {   // línea completa: no puede repetir otra completa
            for ($o = 0; $o < $n; $o++) { if ($o === ($dx ? $y : $x)) continue; $other = []; for ($k = 0; $k < $n; $k++) $other[] = $dx ? $g[$o * $n + $k] : $g[$k * $n + $o]; if ($other === $line) return false; }
        }
    }
    return true;
}
function gen_takuzu(): array
{
    $n = rf() < 0.6 ? 6 : 8; $cand = candFromOk(2, fn($g, $i) => takuzuOk($g, $n, $i));
    do { $b = 200000; $sol = fillRandom($n * $n, array_fill(0, $n * $n, 0), $cand, $b); } while (!$sol);
    $fix = reduceCells($sol, $cand, 30000);
    return ['w' => $n, 'h' => $n, 'n' => $n, 'fix' => $fix, 'sol' => $sol, 'acts' => orderCells($fix, $sol, $cand), 'size' => "{$n}×{$n}"];
}
function draw_takuzu(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n); paper($cv, $g); $cs = $g['cs'];
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n);
    foreach ($st['c'] as $i => $v) {
        if (!$v) continue; [$x, $y] = cxy($g, $n, $i); $giv = !empty($P['fix'][$i]);
        $col = $v === 1 ? '#e8590c' : '#2f5aa8'; $r = $cs * 0.4;
        $cv->rrect($x + $cs / 2 - $r, $y + $cs / 2 - $r, 2 * $r, 2 * $r, $r * 0.45, $cv->c($giv ? $col : $col, $giv ? 1 : 0.85));
        if (!$giv) $cv->rrect($x + $cs / 2 - $r + 5, $y + $cs / 2 - $r + 5, 2 * $r - 10, 2 * $r - 10, $r * 0.4, $cv->c('#ffffff', 0.85));
        $cv->text($v === 1 ? '0' : '1', $x + $cs / 2, $y + $cs / 2, $cs * 0.5, $cv->c($giv ? '#ffffff' : $col), $F['num']);
    }
    frame($cv, $g, $n, $n);
}

// ---------- KAKURASU ----------
function kakSums(int $n, array $c): array
{
    $rs = array_fill(0, $n, 0); $cs = array_fill(0, $n, 0);
    for ($y = 0; $y < $n; $y++) for ($x = 0; $x < $n; $x++) if ($c[$y * $n + $x] === 1) { $rs[$y] += $x + 1; $cs[$x] += $y + 1; }
    return [$rs, $cs];
}
function kakCount(int $n, array $rs, array $cs): int
{
    $opts = [];
    for ($y = 0; $y < $n; $y++) { $o = []; for ($m = 0; $m < (1 << $n); $m++) { $s = 0; for ($x = 0; $x < $n; $x++) if ($m >> $x & 1) $s += $x + 1; if ($s === $rs[$y]) $o[] = $m; } $opts[] = $o; }
    $cnt = 0; $col = array_fill(0, $n, 0);
    $rec = function (int $y) use (&$rec, &$cnt, &$col, $opts, $n, $cs): void {
        if ($cnt >= 2) return;
        if ($y === $n) { if ($col === $cs) $cnt++; return; }
        $rem = 0; for ($q = $y + 1; $q < $n; $q++) $rem += $q + 1;
        foreach ($opts[$y] as $m) {
            $ok = true; for ($x = 0; $x < $n; $x++) { $c = $col[$x] + (($m >> $x & 1) ? $y + 1 : 0); if ($c > $cs[$x] || $c + $rem < $cs[$x]) { $ok = false; break; } }
            if (!$ok) continue;
            for ($x = 0; $x < $n; $x++) if ($m >> $x & 1) $col[$x] += $y + 1;
            $rec($y + 1);
            for ($x = 0; $x < $n; $x++) if ($m >> $x & 1) $col[$x] -= $y + 1;
        }
    };
    $rec(0); return $cnt;
}
function gen_kakurasu(): array
{
    $n = rf() < 0.5 ? 5 : 6;
    for ($t = 0; $t < 3000; $t++) {
        $c = []; for ($i = 0; $i < $n * $n; $i++) $c[] = rf() < 0.45 ? 1 : 0;
        [$rs, $cs] = kakSums($n, $c); if (in_array(0, $rs, true) || in_array(0, $cs, true)) continue;
        if (kakCount($n, $rs, $cs) !== 1) continue;
        $acts = []; foreach ($c as $i => $v) if ($v) $acts[] = ['c' => $i, 'v' => 1];
        return ['w' => $n, 'h' => $n, 'n' => $n, 'rs' => $rs, 'cs' => $cs, 'sol' => $c, 'acts' => $acts, 'size' => "{$n}×{$n}"];
    }
    throw new RuntimeException('kakurasu');
}
function draw_kakurasu(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n, 1, 1, 1, 1); paper($cv, $g); $cs = $g['cs'];
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n);
    [$rs, $css] = kakSums($n, $st['c']);
    foreach ($st['c'] as $i => $v) if ($v === 1) { [$x, $y] = cxy($g, $n, $i); $cv->rrect($x + 6, $y + 6, $cs - 12, $cs - 12, 12, $cv->c('#2f5aa8')); $cv->rrect($x + 6, $y + 6, $cs - 12, ($cs - 12) * 0.35, 12, $cv->c('#ffffff', 0.12)); }
    for ($k = 0; $k < $n; $k++) {
        $cv->text((string)($k + 1), $g['ox'] + ($k + .5) * $cs, $g['oy'] - .5 * $cs, $cs * 0.36, $cv->c('#868e96'), $F['num']);
        $cv->text((string)($k + 1), $g['ox'] - .5 * $cs, $g['oy'] + ($k + .5) * $cs, $cs * 0.36, $cv->c('#868e96'), $F['num']);
        $cv->text((string)$P['rs'][$k], $g['ox'] + ($n + .5) * $cs, $g['oy'] + ($k + .5) * $cs, $cs * 0.44, $cv->c($rs[$k] === $P['rs'][$k] ? '#2b8a3e' : C_SEAL), $F['num']);
        $cv->text((string)$P['cs'][$k], $g['ox'] + ($k + .5) * $cs, $g['oy'] + ($n + .5) * $cs, $cs * 0.44, $cv->c($css[$k] === $P['cs'][$k] ? '#2b8a3e' : C_SEAL), $F['num']);
    }
    frame($cv, $g, $n, $n);
}

// ---------- STAR BATTLE ----------
function starCount(int $n, array $reg): int
{
    $cnt = 0;
    $rec = function (int $y, int $cols, int $regs, int $prev) use (&$rec, &$cnt, $n, $reg): void {
        if ($cnt >= 2) return; if ($y === $n) { $cnt++; return; }
        for ($x = 0; $x < $n; $x++) { if ($cols >> $x & 1) continue; if ($prev >= 0 && abs($x - $prev) <= 1) continue; $r = $reg[$y * $n + $x]; if ($regs >> $r & 1) continue; $rec($y + 1, $cols | 1 << $x, $regs | 1 << $r, $x); }
    };
    $rec(0, 0, 0, -1); return $cnt;
}
function gen_estrellas(): array
{
    $n = rf() < 0.5 ? 6 : 7;
    for ($t = 0; $t < 4000; $t++) {
        $p = shuf(range(0, $n - 1)); $ok = true; for ($y = 1; $y < $n; $y++) if (abs($p[$y] - $p[$y - 1]) <= 1) { $ok = false; break; } if (!$ok) continue;
        $reg = array_fill(0, $n * $n, -1); for ($y = 0; $y < $n; $y++) $reg[$y * $n + $p[$y]] = $y;
        $left = $n * $n - $n;
        while ($left > 0) {
            $fr = []; for ($i = 0; $i < $n * $n; $i++) if ($reg[$i] < 0) foreach (n4($n, $n, $i) as $j) if ($reg[$j] >= 0) $fr[] = [$i, $reg[$j]];
            [$i, $r] = $fr[mt_rand(0, count($fr) - 1)]; $reg[$i] = $r; $left--;
        }
        if (starCount($n, $reg) !== 1) continue;
        $sol = array_fill(0, $n * $n, 0); $acts = [];
        for ($y = 0; $y < $n; $y++) { $sol[$y * $n + $p[$y]] = 1; $acts[] = ['c' => $y * $n + $p[$y], 'v' => 1]; }
        return ['w' => $n, 'h' => $n, 'n' => $n, 'reg' => $reg, 'sol' => $sol, 'acts' => $acts, 'size' => "{$n}×{$n}"];
    }
    throw new RuntimeException('estrellas');
}
function draw_estrellas(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n); paper($cv, $g); $cs = $g['cs'];
    foreach ($P['reg'] as $i => $r) { [$x, $y] = cxy($g, $n, $i); $cv->rect($x, $y, $cs, $cs, $cv->c(PASTEL[$r % count(PASTEL)])); }
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n); regBorders($cv, $g, $n, $n, $P['reg']);
    foreach ($st['c'] as $i => $v) if ($v === 1) { [$x, $y] = cxy($g, $n, $i); $cv->star($x + $cs / 2 + 3, $y + $cs / 2 + 4, $cs * 0.36, $cv->c('#000000', 0.25)); $cv->star($x + $cs / 2, $y + $cs / 2, $cs * 0.36, $cv->c('#f59f00')); $cv->star($x + $cs / 2, $y + $cs / 2 - 2, $cs * 0.22, $cv->c('#ffe066')); }
    frame($cv, $g, $n, $n);
}

// ---------- NONOGRAMA ----------
function nonoRuns(array $a): array { $o = []; $k = 0; foreach ($a as $v) { if ($v) $k++; elseif ($k) { $o[] = $k; $k = 0; } } if ($k) $o[] = $k; return $o ?: [0]; }
function nonoLine(array $clue, array $k): array
{
    $n = count($k); $acc = array_fill(0, $n, -2); $cl = $clue[0] === 0 ? [] : $clue; $cur = array_fill(0, $n, 0);
    $rec = function (int $b, int $pos) use (&$rec, &$acc, &$cur, $cl, $k, $n): void {
        if ($b === count($cl)) { for ($i = $pos; $i < $n; $i++) if ($k[$i] === 1) return; for ($i = 0; $i < $n; $i++) { $v = $i < $pos ? $cur[$i] : 0; $acc[$i] = $acc[$i] === -2 ? $v : ($acc[$i] === $v ? $v : -1); } return; }
        for ($s = $pos; $s + $cl[$b] <= $n; $s++) {
            $ok = true; for ($i = $pos; $i < $s; $i++) if ($k[$i] === 1) { $ok = false; break; } if (!$ok) break;
            for ($i = $s; $i < $s + $cl[$b]; $i++) if ($k[$i] === 0) { $ok = false; break; }
            if ($ok && $s + $cl[$b] < $n && $k[$s + $cl[$b]] === 1) $ok = false;
            if (!$ok) continue;
            for ($i = $pos; $i < $s; $i++) $cur[$i] = 0; for ($i = $s; $i < $s + $cl[$b]; $i++) $cur[$i] = 1; if ($s + $cl[$b] < $n) $cur[$s + $cl[$b]] = 0;
            $rec($b + 1, min($n, $s + $cl[$b] + 1));
        }
    };
    $rec(0, 0); return $acc;
}
function gen_nonograma(): array
{
    $pics = ['.##..##.#########################.######...####.....##...', '...#.....###..#######.#####...###...##.##.#.....#', '...##.....####...######.##########..#.#..#..#.#..#..####..######',
        '...##.....####...######..######.########.......##......##.....####.', '#......###....####.##.###.######.##..##.########.######...####..', '........##.####.#######..######.#######.##.####.........',
        '#####..#####.#######..####.##..#####..###...#####', '....#.......##......###.....####...#.#.....#..##########.######.', '..####...######.##.##.#######..####.....##......##.....####.',
        '..#####..#...#..#...#..#...#.##..###.##.##.......'];
    $pw = [8, 7, 8, 8, 8, 8, 7, 8, 8, 7];
    for ($t = 0; $t < 400; $t++) {
        if (rf() < 0.6) {
            $k = mt_rand(0, count($pics) - 1); $w = $pw[$k]; $s = $pics[$k]; $h = (int)ceil(strlen($s) / $w); $n = max($w, $h, 8);
            $gr = array_fill(0, $n * $n, 0); $ox = intdiv($n - $w, 2); $oy = intdiv($n - $h, 2);
            for ($q = 0; $q < strlen($s); $q++) if ($s[$q] === '#') $gr[($oy + intdiv($q, $w)) * $n + $ox + $q % $w] = 1;
            if (rf() < 0.5) { $m = $gr; for ($i = 0; $i < $n * $n; $i++) $m[$i] = $gr[intdiv($i, $n) * $n + ($n - 1 - $i % $n)]; $gr = $m; }
        } else {
            $n = rf() < 0.5 ? 8 : 10; $gr = []; for ($i = 0; $i < $n * $n; $i++) $gr[] = rf() < 0.56 ? 1 : 0;
            for ($it = 0; $it < 2; $it++) { $m = $gr; for ($i = 0; $i < $n * $n; $i++) { $x = $i % $n; $y = intdiv($i, $n); $c = 0; for ($dy = -1; $dy <= 1; $dy++) for ($dx = -1; $dx <= 1; $dx++) { if (!$dx && !$dy) continue; $X = $x + $dx; $Y = $y + $dy; if ($X >= 0 && $Y >= 0 && $X < $n && $Y < $n && $gr[$Y * $n + $X]) $c++; } $m[$i] = $c >= 5 ? 1 : ($c <= 2 ? 0 : $gr[$i]); } $gr = $m; }
        }
        $rc = []; $cc = []; for ($k = 0; $k < $n; $k++) { $r = []; $c = []; for ($j = 0; $j < $n; $j++) { $r[] = $gr[$k * $n + $j]; $c[] = $gr[$j * $n + $k]; } $rc[] = nonoRuns($r); $cc[] = nonoRuns($c); }
        // ¿se resuelve solo por líneas? (entonces es única) — y de paso el orden de la solución
        $kn = array_fill(0, $n * $n, -1); $acts = []; $ch = true;
        while ($ch) {
            $ch = false;
            for ($q = 0; $q < 2 * $n; $q++) {
                $idx = []; for ($j = 0; $j < $n; $j++) $idx[] = $q < $n ? $q * $n + $j : $j * $n + ($q - $n);
                $r = nonoLine($q < $n ? $rc[$q] : $cc[$q - $n], array_map(fn($i) => $kn[$i], $idx));
                foreach ($idx as $j => $i) if ($kn[$i] < 0 && $r[$j] >= 0) { $kn[$i] = $r[$j]; $ch = true; if ($r[$j] === 1) $acts[] = ['c' => $i, 'v' => 1]; }
            }
        }
        if (in_array(-1, $kn, true) || array_sum($gr) < $n * 2) continue;
        return ['w' => $n, 'h' => $n, 'n' => $n, 'rc' => $rc, 'cc' => $cc, 'sol' => $gr, 'acts' => $acts, 'size' => "{$n}×{$n}",
            'ml' => max(array_map('count', $rc)), 'mt' => max(array_map('count', $cc))];
    }
    throw new RuntimeException('nonograma');
}
function draw_nonograma(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $ml = $P['ml'] * 0.6 + 0.3; $mt = $P['mt'] * 0.6 + 0.3;
    $g = geom($n, $n, $ml, $mt, 0, 0); paper($cv, $g); $cs = $g['cs'];
    hlCells($cv, $g, $n, $hl); gridLines($cv, $g, $n, $n);
    for ($k = 5; $k < $n; $k += 5) { $cv->line($g['ox'] + $k * $cs, $g['oy'], $g['ox'] + $k * $cs, $g['oy'] + $n * $cs, 3, $cv->c(C_THICK, 0.6), false); $cv->line($g['ox'], $g['oy'] + $k * $cs, $g['ox'] + $n * $cs, $g['oy'] + $k * $cs, 3, $cv->c(C_THICK, 0.6), false); }
    foreach ($st['c'] as $i => $v) if ($v === 1) { [$x, $y] = cxy($g, $n, $i); $cv->rrect($x + 3, $y + 3, $cs - 6, $cs - 6, 6, $cv->c('#212529')); }
    $step = $cs * 0.6; $f = $cs * 0.4;
    for ($k = 0; $k < $n; $k++) {
        $r = $P['rc'][$k]; foreach ($r as $q => $v) $cv->text((string)$v, $g['ox'] - (count($r) - $q - 0.5) * $step - 8, $g['oy'] + ($k + .5) * $cs, $f, $cv->c(C_INK), $F['num']);
        $c = $P['cc'][$k]; foreach ($c as $q => $v) $cv->text((string)$v, $g['ox'] + ($k + .5) * $cs, $g['oy'] - (count($c) - $q - 0.5) * $step - 8, $f, $cv->c(C_INK), $F['num']);
    }
    frame($cv, $g, $n, $n);
}

// ---------- NUMBERLINK ----------
function gen_numberlink(): array
{
    $n = rf() < 0.5 ? 6 : 7; $N = $n * $n;
    for ($t = 0; $t < 600; $t++) {
        $id = array_fill(0, $N, -1); $paths = [];
        foreach (shuf(range(0, $N - 1)) as $s) {
            if ($id[$s] >= 0) continue; $pi = count($paths); $p = [$s]; $id[$s] = $pi; $max = ri(3, $n + 2);
            while (count($p) < $max) {
                $e = $p[count($p) - 1]; $nb = [];
                foreach (n4($n, $n, $e) as $j) { if ($id[$j] >= 0) continue; $own = 0; foreach (n4($n, $n, $j) as $q) if ($id[$q] === $pi) $own++; if ($own === 1) $nb[] = $j; }
                if (!$nb) break; $j = $nb[mt_rand(0, count($nb) - 1)]; $id[$j] = $pi; $p[] = $j;
            }
            $paths[] = $p;
        }
        $ok = true;
        foreach (array_keys($paths) as $k) {
            $p = $paths[$k]; if ($p === null || count($p) >= 3) continue; $done = false;
            foreach ([[$p[count($p) - 1], 0], [$p[0], 1]] as [$end, $from]) {
                foreach (shuf(n4($n, $n, $end)) as $j) {
                    $q = $paths[$id[$j]] ?? null; if ($q === null || $id[$j] === $k) continue; $qi = $id[$j];
                    if ($q[count($q) - 1] === $j) { $add = $from ? $p : array_reverse($p); foreach ($add as $i) $id[$i] = $qi; $paths[$qi] = array_merge($q, $add); $done = true; }
                    elseif ($q[0] === $j) { $add = $from ? array_reverse($p) : $p; foreach ($add as $i) $id[$i] = $qi; $paths[$qi] = array_merge($add, $q); $done = true; }
                    if ($done) break;
                }
                if ($done) break;
            }
            if ($done) $paths[$k] = null; else { $ok = false; break; }
        }
        $ps = array_values(array_filter($paths)); if (!$ok || count($ps) > count(LINKCOL) || count($ps) < max(4, $n - 2)) continue;
        $end = array_fill(0, $N, 0); $acts = [];
        foreach ($ps as $k => $p) { $end[$p[0]] = $end[$p[count($p) - 1]] = $k + 1; for ($q = 1; $q < count($p); $q++) $acts[] = ['l' => lkey($p[$q - 1], $p[$q]), 'v' => 1, 'cells' => [$p[$q - 1], $p[$q]]]; }
        $col = []; foreach ($ps as $k => $p) foreach ($p as $i) $col[$i] = $k + 1;
        return ['w' => $n, 'h' => $n, 'n' => $n, 'end' => $end, 'col' => $col, 'acts' => $acts, 'size' => "{$n}×{$n}"];
    }
    throw new RuntimeException('numberlink');
}
function draw_numberlink(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n); paper($cv, $g); $cs = $g['cs'];
    $on = []; foreach ($st['L'] as $k => $v) { [$a, $b] = array_map('intval', explode('_', $k)); $on[$a] = $on[$b] = true; }
    foreach ($on as $i => $_) { [$x, $y] = cxy($g, $n, $i); $cv->rect($x, $y, $cs, $cs, $cv->c(LINKCOL[($P['col'][$i] - 1) % count(LINKCOL)], 0.16)); }
    gridLines($cv, $g, $n, $n);
    foreach ($st['L'] as $k => $v) { [$a, $b] = array_map('intval', explode('_', $k)); [$x1, $y1] = cxy($g, $n, $a); [$x2, $y2] = cxy($g, $n, $b); $cv->line($x1 + $cs / 2, $y1 + $cs / 2, $x2 + $cs / 2, $y2 + $cs / 2, $cs * 0.32, $cv->c(LINKCOL[($P['col'][$a] - 1) % count(LINKCOL)])); }
    foreach ($P['end'] as $i => $k) {
        if (!$k) continue; [$x, $y] = cxy($g, $n, $i); $c = LINKCOL[($k - 1) % count(LINKCOL)];
        $cv->circle($x + $cs / 2, $y + $cs / 2, $cs * 0.38, $cv->c('#ffffff')); $cv->circle($x + $cs / 2, $y + $cs / 2, $cs * 0.34, $cv->c($c));
        $cv->text((string)$k, $x + $cs / 2, $y + $cs / 2, $cs * 0.4, $cv->c('#ffffff'), $F['num']);
    }
    frame($cv, $g, $n, $n);
}

// ---------- HASHI ----------
function gen_hashi(): array
{
    $n = rf() < 0.5 ? 7 : 8; $N = $n * $n; $want = $n === 7 ? 11 : 14;
    for ($t = 0; $t < 400; $t++) {
        $occ = array_fill(0, $N, 0); $L = []; $list = [ri(0, $N - 1)]; $occ[$list[0]] = 1;
        for ($it = 0; $it < 600 && count($list) < $want; $it++) {
            $a = $list[mt_rand(0, count($list) - 1)]; [$dx, $dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); $d = ri(2, max(2, $n - 3));
            $ax = $a % $n; $ay = intdiv($a, $n); $bx = $ax + $dx * $d; $by = $ay + $dy * $d; if ($bx < 0 || $by < 0 || $bx >= $n || $by >= $n) continue;
            $b = $by * $n + $bx; if ($occ[$b]) continue; $ok = true; $mid = [];
            for ($q = 1; $q < $d; $q++) { $m = ($ay + $dy * $q) * $n + $ax + $dx * $q; if ($occ[$m]) { $ok = false; break; } $mid[] = $m; }
            if (!$ok) continue; foreach (n4($n, $n, $b) as $j) if ($occ[$j] === 1) { $ok = false; break; } if (!$ok) continue;
            $occ[$b] = 1; foreach ($mid as $m) $occ[$m] = 2; $list[] = $b; $L[lkey($a, $b)] = rf() < 0.4 ? 2 : 1;
        }
        if (count($list) < $want) continue;
        $isl = array_fill(0, $N, 0); foreach ($L as $k => $v) { [$a, $b] = array_map('intval', explode('_', $k)); $isl[$a] += $v; $isl[$b] += $v; }
        $acts = []; foreach ($L as $k => $v) { [$a, $b] = array_map('intval', explode('_', $k)); $acts[] = ['l' => $k, 'v' => $v, 'cells' => [$a, $b]]; }
        return ['w' => $n, 'h' => $n, 'n' => $n, 'isl' => $isl, 'acts' => shuf($acts), 'size' => "{$n}×{$n}"];
    }
    throw new RuntimeException('hashi');
}
function draw_hashi(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n); paper($cv, $g); $cs = $g['cs'];
    for ($y = 0; $y < $n; $y++) for ($x = 0; $x < $n; $x++) $cv->circle($g['ox'] + ($x + .5) * $cs, $g['oy'] + ($y + .5) * $cs, 2.5, $cv->c(C_GRID));
    $sum = array_fill(0, $n * $n, 0);
    foreach ($st['L'] as $k => $v) {
        [$a, $b] = array_map('intval', explode('_', $k)); $sum[$a] += $v; $sum[$b] += $v;
        [$x1, $y1] = cxy($g, $n, $a); [$x2, $y2] = cxy($g, $n, $b); $hz = abs($b - $a) < $n; $off = $v === 2 ? $cs * 0.12 : 0;
        $col = $cv->c(isset($hl[$k]) ? '#e8590c' : '#8a5a2b');
        foreach ($v === 2 ? [-1, 1] : [0] as $s) $hz ? $cv->line($x1 + $cs / 2, $y1 + $cs / 2 + $s * $off, $x2 + $cs / 2, $y2 + $cs / 2 + $s * $off, max(5, $cs * 0.08), $col) : $cv->line($x1 + $cs / 2 + $s * $off, $y1 + $cs / 2, $x2 + $cs / 2 + $s * $off, $y2 + $cs / 2, max(5, $cs * 0.08), $col);
    }
    foreach ($P['isl'] as $i => $v) {
        if (!$v) continue; [$x, $y] = cxy($g, $n, $i); $done = $sum[$i] === $v;
        $cv->circle($x + $cs / 2, $y + $cs / 2, $cs * 0.42, $cv->c(C_INK)); $cv->circle($x + $cs / 2, $y + $cs / 2, $cs * 0.42 - 4, $cv->c($done ? '#b2f2bb' : '#fffaf0'));
        $cv->text((string)$v, $x + $cs / 2, $y + $cs / 2, $cs * 0.46, $cv->c(C_INK), $F['num']);
    }
}

// ---------- SLITHERLINK ----------
function loopGen(int $W, int $H, float $frac): array
{
    $VW = $W + 1; $sq = array_fill(0, $W * $H, 0);
    $trace = function (array $sq) use ($W, $H, $VW): ?array {
        $in = fn($x, $y) => $x >= 0 && $y >= 0 && $x < $W && $y < $H && $sq[$y * $W + $x] === 1;
        $E = [];
        for ($y = 0; $y <= $H; $y++) for ($x = 0; $x < $W; $x++) if ($in($x, $y) !== $in($x, $y - 1)) $E[] = ['h' . ($y * $W + $x), $y * $VW + $x, $y * $VW + $x + 1];
        for ($y = 0; $y < $H; $y++) for ($x = 0; $x <= $W; $x++) if ($in($x, $y) !== $in($x - 1, $y)) $E[] = ['v' . ($y * $VW + $x), $y * $VW + $x, ($y + 1) * $VW + $x];
        $adj = []; foreach ($E as [, $a, $b]) { $adj[$a][] = $b; $adj[$b][] = $a; }
        foreach ($adj as $l) if (count($l) !== 2) return null;
        $s0 = $E[0][1]; $pts = [$s0]; $prev = -1; $cur = $s0;
        while (true) { $nx = $adj[$cur][0] !== $prev ? $adj[$cur][0] : $adj[$cur][1]; if ($nx === $s0) break; $pts[] = $nx; $prev = $cur; $cur = $nx; if (count($pts) > count($E)) return null; }
        return count($pts) === count($E) ? ['pts' => $pts, 'E' => $E] : null;
    };
    $s = ri(0, $W * $H - 1); $sq[$s] = 1; $cnt = 1; $fails = 0;
    while ($cnt < $W * $H * $frac && $fails < $W * $H * 4) {
        $fr = []; for ($i = 0; $i < $W * $H; $i++) if (!$sq[$i]) foreach (n4($W, $H, $i) as $j) if ($sq[$j]) { $fr[] = $i; break; }
        if (!$fr) break; $i = $fr[mt_rand(0, count($fr) - 1)]; $sq[$i] = 1;
        if ($trace($sq)) $cnt++; else { $sq[$i] = 0; $fails++; }
    }
    return $trace($sq);
}
function slSides(int $w, array $E, int $i): int
{
    $x = $i % $w; $y = intdiv($i, $w);
    return (int)!empty($E['h' . ($y * $w + $x)]) + (int)!empty($E['h' . (($y + 1) * $w + $x)]) + (int)!empty($E['v' . ($y * ($w + 1) + $x)]) + (int)!empty($E['v' . ($y * ($w + 1) + $x + 1)]);
}
function gen_slitherlink(): array
{
    $n = rf() < 0.5 ? 5 : 6; $lp = loopGen($n, $n, 0.5); $E = []; foreach ($lp['E'] as [$k]) $E[$k] = 1;
    $cl = array_fill(0, $n * $n, -1); foreach (array_slice(shuf(range(0, $n * $n - 1)), 0, (int)round($n * $n * 0.62)) as $i) $cl[$i] = slSides($n, $E, $i);
    // jugadas: los bordes en el orden del bucle
    $VW = $n + 1; $acts = []; $pts = $lp['pts'];
    for ($q = 0; $q < count($pts); $q++) {
        $a = $pts[$q]; $b = $pts[($q + 1) % count($pts)]; $ax = $a % $VW; $ay = intdiv($a, $VW); $bx = $b % $VW; $by = intdiv($b, $VW);
        $k = $ay === $by ? 'h' . ($ay * $n + min($ax, $bx)) : 'v' . (min($ay, $by) * $VW + $ax); $acts[] = ['e' => $k];
    }
    return ['w' => $n, 'h' => $n, 'n' => $n, 'cl' => $cl, 'acts' => $acts, 'size' => "{$n}×{$n}"];
}
function draw_slitherlink(Cv $cv, array $P, array $st, array $hl, array $F): void
{
    $n = $P['n']; $g = geom($n, $n); paper($cv, $g); $cs = $g['cs']; $VW = $n + 1;
    foreach ($P['cl'] as $i => $v) { if ($v < 0) continue; [$x, $y] = cxy($g, $n, $i); $k = slSides($n, $st['E'], $i); $cv->text((string)$v, $x + $cs / 2, $y + $cs / 2, $cs * 0.5, $cv->c($k === $v && $st['E'] ? '#adb5bd' : C_INK), $F['num']); }
    foreach ($st['E'] as $k => $_) {
        $m = (int)substr($k, 1);
        if ($k[0] === 'h') { $x = $m % $n; $y = intdiv($m, $n); $p = [$x, $y, $x + 1, $y]; } else { $x = $m % $VW; $y = intdiv($m, $VW); $p = [$x, $y, $x, $y + 1]; }
        $cv->line($g['ox'] + $p[0] * $cs, $g['oy'] + $p[1] * $cs, $g['ox'] + $p[2] * $cs, $g['oy'] + $p[3] * $cs, max(7, $cs * 0.11), $cv->c(isset($hl[$k]) ? '#e8590c' : C_INK));
    }
    for ($y = 0; $y <= $n; $y++) for ($x = 0; $x <= $n; $x++) $cv->circle($g['ox'] + $x * $cs, $g['oy'] + $y * $cs, max(4, $cs * 0.06), $cv->c(C_INK));
}

// ---------- ayudas de dibujo del tablero ----------
$BOX = [70, 470, 940, 930];          // zona del tablero (x, y, ancho, alto) en 1080x1920
function geom(int $w, int $h, float $ml = 0, float $mt = 0, float $mr = 0, float $mb = 0): array
{
    global $BOX; [$bx, $by, $bw, $bh] = $BOX; $pad = 34;
    $cs = floor(min(($bw - 2 * $pad) / ($w + $ml + $mr), ($bh - 2 * $pad) / ($h + $mt + $mb), 150));
    $W = $cs * ($w + $ml + $mr); $Hh = $cs * ($h + $mt + $mb);
    $x0 = $bx + ($bw - $W) / 2; $y0 = $by + ($bh - $Hh) / 2;
    return ['cs' => $cs, 'ox' => $x0 + $ml * $cs, 'oy' => $y0 + $mt * $cs, 'x0' => $x0, 'y0' => $y0, 'W' => $W, 'H' => $Hh];
}
function cxy(array $g, int $w, int $i): array { return [$g['ox'] + ($i % $w) * $g['cs'], $g['oy'] + intdiv($i, $w) * $g['cs']]; }
function paper(Cv $cv, array $g): void
{
    $x = $g['x0'] - 30; $y = $g['y0'] - 30; $w = $g['W'] + 60; $h = $g['H'] + 60;
    $cv->rrect($x + 8, $y + 14, $w, $h, 30, $cv->c('#000000', 0.35));
    $cv->rrect($x - 6, $y - 6, $w + 12, $h + 12, 34, $cv->c('#e9dcc0'));
    $cv->rrect($x, $y, $w, $h, 28, $cv->c(C_PAPER));
    mt_srand(7); for ($k = 0; $k < 160; $k++) { $px = $x + rf() * $w; $py = $y + rf() * $h; $cv->line($px, $py, $px + rf() * 18 - 9, $py + rf() * 6 - 3, 1.2, $cv->c('#b8a888', 0.25), false); }
    mt_srand($GLOBALS['SEED_NOW'] ?? (int)(microtime(true) * 1000) % 2147483647);
}
function gridLines(Cv $cv, array $g, int $w, int $h): void
{
    $c = $cv->c(C_GRID); $cs = $g['cs'];
    for ($x = 1; $x < $w; $x++) $cv->line($g['ox'] + $x * $cs, $g['oy'], $g['ox'] + $x * $cs, $g['oy'] + $h * $cs, 2, $c, false);
    for ($y = 1; $y < $h; $y++) $cv->line($g['ox'], $g['oy'] + $y * $cs, $g['ox'] + $w * $cs, $g['oy'] + $y * $cs, 2, $c, false);
}
function frame(Cv $cv, array $g, int $w, int $h): void
{
    $c = $cv->c(C_THICK); $cs = $g['cs']; $x1 = $g['ox']; $y1 = $g['oy']; $x2 = $x1 + $w * $cs; $y2 = $y1 + $h * $cs;
    foreach ([[$x1, $y1, $x2, $y1], [$x2, $y1, $x2, $y2], [$x2, $y2, $x1, $y2], [$x1, $y2, $x1, $y1]] as $l) $cv->line(...array_merge($l, [6, $c]));
}
function regBorders(Cv $cv, array $g, int $w, int $h, array $reg): void
{
    $c = $cv->c(C_THICK); $cs = $g['cs'];
    for ($y = 0; $y < $h; $y++) for ($x = 0; $x < $w; $x++) {
        $i = $y * $w + $x;
        if ($x < $w - 1 && $reg[$i] !== $reg[$i + 1]) $cv->line($g['ox'] + ($x + 1) * $cs, $g['oy'] + $y * $cs, $g['ox'] + ($x + 1) * $cs, $g['oy'] + ($y + 1) * $cs, 5, $c);
        if ($y < $h - 1 && $reg[$i] !== $reg[$i + $w]) $cv->line($g['ox'] + $x * $cs, $g['oy'] + ($y + 1) * $cs, $g['ox'] + ($x + 1) * $cs, $g['oy'] + ($y + 1) * $cs, 5, $c);
    }
}
function hlCells(Cv $cv, array $g, int $w, array $hl): void
{
    foreach ($hl as $i => $_) { if (!is_int($i)) continue; [$x, $y] = cxy($g, $w, $i); $cv->rect($x, $y, $g['cs'], $g['cs'], $cv->c('#ffd43b', 0.55)); }
}
function nums(Cv $cv, array $g, array $P, array $c, array $F): void
{
    $cs = $g['cs'];
    foreach ($c as $i => $v) { if (!$v) continue; [$x, $y] = cxy($g, $P['w'], $i); $giv = !empty($P['fix'][$i]); $cv->text((string)$v, $x + $cs / 2, $y + $cs / 2, $cs * 0.58, $cv->c($giv ? C_INK : C_USER), $F['num']); }
}

// ===========================================================================
// ESTADO Y JUGADAS
// ===========================================================================
function emptyState(array $P): array { return ['c' => $P['fix'] ?? array_fill(0, $P['w'] * $P['h'], 0), 'L' => [], 'E' => []]; }
function applyAct(array &$st, array $a): void
{
    if (isset($a['c'])) $st['c'][$a['c']] = $a['v'];
    elseif (isset($a['l'])) $st['L'][$a['l']] = $a['v'];
    elseif (isset($a['e'])) $st['E'][$a['e']] = 1;
}
function hlOf(array $acts): array
{
    $h = []; foreach ($acts as $a) { if (isset($a['c'])) $h[$a['c']] = 1; if (isset($a['l'])) { $h[$a['l']] = 1; foreach ($a['cells'] ?? [] as $i) $h[$i] = 1; } if (isset($a['e'])) $h[$a['e']] = 1; }
    return $h;
}

// ===========================================================================
// FONDO Y ELEMENTOS DE PANTALLA
// ===========================================================================
function background(array $game, float $ss)
{
    $cv = new Cv($ss); [$c1, $c2] = $game['bg'];
    $a = sscanf(ltrim($c1, '#'), '%2x%2x%2x'); $b = sscanf(ltrim($c2, '#'), '%2x%2x%2x'); $Hs = imagesy($cv->im); $Ws = imagesx($cv->im);
    for ($y = 0; $y < $Hs; $y++) { $t = $y / $Hs; imageline($cv->im, 0, $y, $Ws, $y, imagecolorallocate($cv->im, (int)($a[0] + ($b[0] - $a[0]) * $t), (int)($a[1] + ($b[1] - $a[1]) * $t), (int)($a[2] + ($b[2] - $a[2]) * $t))); }
    // olas seigaiha
    $wc = $cv->c('#ffffff', 0.055); imagesetthickness($cv->im, (int)max(1, 2 * $ss / 2)); $R = 54;
    for ($row = 0; $row * $R * 0.5 < H + $R; $row++) for ($col = -1; $col * $R * 2 < W + $R * 2; $col++) {
        $cx = $col * $R * 2 + ($row % 2 ? $R : 0); $cy = $row * $R * 0.5;
        for ($k = 1; $k <= 3; $k++) imagearc($cv->im, $cv->X($cx), $cv->X($cy), $cv->X($R * 2 * $k / 3), $cv->X($R * 2 * $k / 3), 180, 360, $wc);
    }
    imagesetthickness($cv->im, 1);
    // pétalos
    for ($k = 0; $k < 26; $k++) { $x = rf() * W; $y = rf() * H; $r = 6 + rf() * 9; imagefilledellipse($cv->im, $cv->X($x), $cv->X($y), $cv->X($r * 2.2), $cv->X($r * 1.3), $cv->c('#ffc9de', 0.35 + rf() * 0.3)); }
    // viñeta suave arriba y abajo
    for ($k = 0; $k < 60; $k++) { $cv->rect(0, $k * 4, W, 4, $cv->c('#000000', 0.006 * (60 - $k))); $cv->rect(0, H - ($k + 1) * 4, W, 4, $cv->c('#000000', 0.008 * (60 - $k))); }
    return $cv->im;
}
function pill(Cv $cv, string $t, float $cx, float $cy, float $px, string $bg, string $fg, string $font, float $padX = 26): void
{
    $t = plain($t); $w = $cv->textW($t, $px, $font) + 2 * $padX; $h = $px * 1.7;
    $cv->rrect($cx - $w / 2 + 4, $cy - $h / 2 + 6, $w, $h, $h / 2, $cv->c('#000000', 0.3));
    $cv->rrect($cx - $w / 2, $cy - $h / 2, $w, $h, $h / 2, $cv->c($bg)); $cv->text($t, $cx, $cy + 1, $px, $cv->c($fg), $font);
}
function seal(Cv $cv, float $cx, float $cy, float $r, string $kanji, ?string $cjk, float $rot = -0.18, float $alpha = 1.0): void
{
    $p = []; foreach ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [$dx, $dy]) { $x = $dx * $r; $y = $dy * $r; $p[] = $cx + $x * cos($rot) - $y * sin($rot); $p[] = $cy + $x * sin($rot) + $y * cos($rot); }
    $cv->poly($p, $cv->c(C_SEAL, $alpha));
    $q = []; foreach ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [$dx, $dy]) { $x = $dx * $r * 0.82; $y = $dy * $r * 0.82; $q[] = $cx + $x * cos($rot) - $y * sin($rot); $q[] = $cy + $x * sin($rot) + $y * cos($rot); }
    for ($k = 0; $k < 4; $k++) $cv->line($q[$k * 2], $q[$k * 2 + 1], $q[(($k + 1) % 4) * 2], $q[(($k + 1) % 4) * 2 + 1], max(2, $r * 0.05), $cv->c('#ffffff', 0.85 * $alpha));
    if ($cjk) $cv->text($kanji, $cx, $cy, $r * 1.15, $cv->c('#ffffff', $alpha), $cjk);
    else { $cv->line($cx - $r * 0.45, $cy, $cx - $r * 0.1, $cy + $r * 0.4, $r * 0.16, $cv->c('#ffffff', $alpha)); $cv->line($cx - $r * 0.1, $cy + $r * 0.4, $cx + $r * 0.5, $cy - $r * 0.4, $r * 0.16, $cv->c('#ffffff', $alpha)); }
}

/**
 * Dibuja un fotograma. $o: kind (hook|rules|count|sol|solved|cta), st, hl, sec, prog…
 */
function renderFrame(string $path, $bg, array $J, array $o): void
{
    global $CFG;
    $cv = new Cv((float)$CFG['ss']); $cv->copyFrom($bg); $F = $J['F']; $T = $J['T']; $game = $J['game']; $kind = $o['kind'];
    $white = $cv->c('#ffffff'); $dark = $cv->c('#1a1222', 0.85);
    // arriba: etiqueta del puzle
    pill($cv, preg_replace('#^https?://#', '', $J['playUrl']), W / 2, 120, 34, '#ffd43b', '#1b1033', $F['txt']);   // la dirección del juego, siempre arriba
    // titular
    $head = match ($kind) {
        'hook', 'count' => $J['texts']['hook'],
        'rules' => $T['rules'],
        'sol' => $T['solution'],
        'solved' => $J['texts']['outro'],
        default => $T['play'],
    };
    $cv->para(mb_strtoupper($head), W / 2, 300, 960, 104, 58, 2, $kind === 'sol' ? $cv->c('#ffe066') : $white, $F['big'], $dark, 7);
    // tablero
    $fn = 'draw_' . $J['id'];
    $fn($cv, $J['P'], $o['st'], $o['hl'] ?? [], $F);
    if ($kind === 'cta') { global $BOX; $cv->rrect($BOX[0] - 20, $BOX[1] - 20, $BOX[2] + 40, $BOX[3] + 40, 40, $cv->c('#000000', 0.62)); }
    if ($kind === 'solved') { global $BOX; seal($cv, $BOX[0] + $BOX[2] - 150, $BOX[1] + $BOX[3] - 150, 120, '完', $F['cjk'], -0.2, 0.93); }
    if ($kind !== 'cta') seal($cv, 92, 488, 34, $game['kanji'], $F['cjk'], -0.12);
    // abajo
    $by = 1525;
    if ($kind === 'hook') $cv->para($J['texts']['challenge'], W / 2, $by, 900, 64, 40, 2, $cv->c('#ffe066'), $F['big'], $dark, 5);
    elseif ($kind === 'rules') {
        $cv->rrect(80, $by - 115, 920, 230, 30, $cv->c('#fffaf0', 0.96)); $cv->rect(80, $by - 115, 14, 230, $cv->c(C_SEAL));
        $cv->para($J['rules'], W / 2 + 6, $by, 840, 46, 30, 4, $cv->c(C_INK), $F['txt']);
    } elseif ($kind === 'count') {
        $sec = $o['sec']; $tot = $o['tot']; $col = $sec <= 3 ? '#ff6b6b' : '#ffd43b';
        $cv->circle(W / 2, $by, 108, $cv->c('#1a1222', 0.8)); $cv->arc(W / 2, $by, 96, 16, $cv->c('#ffffff', 0.15)); $cv->arc(W / 2, $by, 96, 16, $cv->c($col), 0, 360 * $sec / $tot);
        $cv->text((string)$sec, W / 2, $by, 96, $cv->c($col), $F['big']);
        $cv->text($T['think'], W / 2 - 290, $by, 52, $white, $F['big'], 'center', $dark, 5);
        $cv->text($T['think'], W / 2 + 290, $by, 52, $white, $F['big'], 'center', $dark, 5);
    } elseif ($kind === 'sol') {
        $p = $o['prog']; $cv->rrect(140, $by - 18, 800, 36, 18, $cv->c('#ffffff', 0.2)); $cv->rrect(140, $by - 18, max(36, 800 * $p), 36, 18, $cv->c('#69db7c'));
        $cv->text((int)round($p * 100) . ' %', W / 2, $by + 62, 40, $white, $F['big'], 'center', $dark, 4);
    } elseif ($kind === 'solved') {
        $cv->para($J['texts']['comment'], W / 2, $by, 900, 56, 36, 2, $cv->c('#ffe066'), $F['big'], $dark, 5);
    } else {
        pill($cv, $J['playLabel'], W / 2, 905, 64, '#c92a2a', '#ffffff', $F['big'], 40);
        $cv->para($T['follow'], W / 2, 1060, 860, 54, 34, 2, $white, $F['big'], $dark, 5);
        $cv->para(mb_strtoupper($game['name'][$J['lang']]), W / 2, 700, 860, 90, 50, 1, $cv->c('#ffe066'), $F['big'], $dark, 6);
    }
    $cv->text($J['playLabel'], W / 2, 1700, 30, $cv->c('#ffffff', 0.75), $F['txt']);
    $cv->save($path);
    imagedestroy($cv->im);
}

// ===========================================================================
// TEXTOS (DeepSeek o plantillas)
// ===========================================================================
function httpPostJson(string $url, array $body, array $headers, int $timeout = 60): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE)]);
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($r === false || $code < 200 || $code >= 300) { logm("  ! DeepSeek HTTP $code $err " . mb_substr((string)$r, 0, 300)); return null; }
    return json_decode((string)$r, true) ?: null;
}
function makeTexts(array $CFG, array $game, string $lang, array $T, int $num, int $wait, string $playUrl, string $size): array
{
    $name = $game['name'][$lang];
    $def = [
        'hook' => pick($T['hooks']),
        'challenge' => sprintf($T['challenge'], $wait),
        'outro' => pick($T['outro']),
        'comment' => $lang === 'es' ? 'Escribe tu tiempo en los comentarios' : 'Comment your time below',
        'title' => sprintf($T['title'], $name, $num, $wait),
        'description' => sprintf($T['desc'], $name, $game['rules'][$lang] === '' ? '' : str_replace('%n', '', $game['rules'][$lang]), $playUrl, $game['tag']),
    ];
    if ($CFG['deepseek_key'] === '') return $def;
    $L = $lang === 'es' ? 'Spanish (Spain)' : 'English';
    $prompt = "You write copy for a viral YouTube Short / TikTok showing a logic puzzle: the viewer gets $wait seconds to solve it, then the solution is revealed.\n" .
        "Puzzle: $name ($size). Rules: " . str_replace('%n', '', $game['rules']['en']) . "\nPlay link: $playUrl\n" .
        "Write everything in $L. Return ONLY a JSON object with these keys:\n" .
        "hook: on-screen hook, max 5 words, punchy, curiosity or challenge (e.g. 'ONLY 1% CAN SOLVE THIS'), no emojis;\n" .
        "challenge: one short line daring the viewer to solve it in $wait seconds, max 9 words, no emojis;\n" .
        "outro: question shown when the solution appears, max 5 words, no emojis;\n" .
        "comment: call to comment their time or result, max 7 words, no emojis;\n" .
        "title: video title, max 90 characters, must include the puzzle name and #shorts, may have one emoji, never a puzzle number;\n" .
        "description: 2-3 short sentences hooking the viewer and inviting them to play free at the link (include the link), then 5-7 relevant hashtags on a new line.";
    $r = httpPostJson($CFG['deepseek_url'], ['model' => $CFG['deepseek_model'], 'temperature' => 1.1, 'response_format' => ['type' => 'json_object'],
        'messages' => [['role' => 'system', 'content' => 'You are a senior short-form video copywriter. Reply with valid JSON only.'], ['role' => 'user', 'content' => $prompt]]],
        ['Authorization: Bearer ' . $CFG['deepseek_key']]);
    $j = $r ? json_decode((string)($r['choices'][0]['message']['content'] ?? ''), true) : null;
    if (!is_array($j)) { logm('  ! DeepSeek no devolvió JSON válido: uso las plantillas'); return $def; }
    $out = $def;
    foreach (['hook' => 40, 'challenge' => 70, 'outro' => 40, 'comment' => 60, 'title' => 100, 'description' => 1500] as $k => $max) {
        $v = trim((string)($j[$k] ?? '')); if ($v !== '' && mb_strlen($v) <= $max) $out[$k] = $v;
    }
    if (!str_contains($out['description'], $playUrl)) $out['description'] .= "\n$playUrl";
    logm('  DeepSeek: «' . $out['hook'] . '» · ' . $out['title']);
    return $out;
}

// ===========================================================================
// VOZ
// ===========================================================================
function tts(array $CFG, string $lang, string $text, string $file): ?array
{
    if (!$CFG['tts'] || !whichCmd($CFG['edge_tts'])) return null;
    try {
        run(escapeshellarg($CFG['edge_tts']) . ' --voice ' . escapeshellarg($CFG['voices'][$lang] ?? 'en-US-AndrewNeural') . ' --rate=' . escapeshellarg($CFG['tts_rate']) .
            ' --text=' . escapeshellarg(plain($text)) . ' --write-media ' . escapeshellarg($file));
        if (is_file($file) && filesize($file) > 1000) return [$file, probeDuration($file)];
    } catch (Throwable $e) { logm('  ! edge-tts: ' . strtok($e->getMessage(), "\n")); }
    return null;
}

// ===========================================================================
// GENERAR EL VÍDEO
// ===========================================================================
function generate(array $CFG, array $opt, array $TXT): array
{
    $all = games(); $ids = $CFG['games'] ?: array_keys($all);
    $seed = isset($opt['seed']) ? (int)$opt['seed'] : random_int(1, 2_000_000_000); mt_srand($seed); $GLOBALS['SEED_NOW'] = $seed;
    $id = isset($opt['game']) && isset($all[(string)$opt['game']]) ? (string)$opt['game'] : $ids[mt_rand(0, count($ids) - 1)];
    $lang = isset($opt['lang']) && isset($TXT[(string)$opt['lang']]) ? (string)$opt['lang'] : $CFG['langs'][mt_rand(0, count($CFG['langs']) - 1)];
    $game = $all[$id]; $T = $TXT[$lang]; $num = 100 + $seed % 900; $wait = (int)$CFG['wait'];
    logm("Juego: $id · idioma: $lang · semilla: $seed");
    $t0 = microtime(true); $gen = 'gen_' . $id; $P = $gen(); mt_srand($seed + 1); $GLOBALS['SEED_NOW'] = $seed + 1;
    logm(sprintf('  Puzle %s generado en %.1f s · %d pasos de solución', $P['size'], microtime(true) - $t0, count($P['acts'])));
    $playUrl = str_replace('{id}', $id, $CFG['play_url']);
    $texts = makeTexts($CFG, $game, $lang, $T, $num, $wait, $playUrl, $P['size']);
    $rules = str_replace('%n', (string)($P['n'] ?? ''), $game['rules'][$lang]);
    $J = ['id' => $id, 'game' => $game, 'lang' => $lang, 'T' => $T, 'P' => $P, 'num' => $num, 'texts' => $texts, 'rules' => $rules, 'F' => fonts($CFG),
        'playLabel' => $CFG['play_label'], 'playUrl' => $playUrl, 'seed' => $seed, 'wait' => $wait];
    return $J;
}
function render(array $CFG, array $J, string $work, bool $previewOnly = false): array
{
    @mkdir($work, 0775, true);
    $bg = background($J['game'], (float)$CFG['ss']);
    $P = $J['P']; $st0 = emptyState($P); $wait = $J['wait']; $T = $J['T']; $lang = $J['lang'];
    // voz
    $v = [];
    if (!$previewOnly) {
        $v['hook'] = tts($CFG, $lang, $J['texts']['hook'] . '. ' . $J['texts']['challenge'], "$work/v_hook.mp3");
        $v['rules'] = tts($CFG, $lang, $J['rules'], "$work/v_rules.mp3");
        $v['sol'] = tts($CFG, $lang, $T['n_sol'], "$work/v_sol.mp3");
        $v['end'] = tts($CFG, $lang, $J['texts']['outro'] . ' ' . $J['texts']['comment'] . '.', "$work/v_end.mp3");
        logm('  Voz: ' . (array_filter($v) ? count(array_filter($v)) . ' frases con edge-tts' : 'sin voz (edge-tts no disponible o desactivado)'));
    }
    $d = fn($k, $min, $pad = 0.5) => max($min, ($v[$k][1] ?? 0) + $pad);
    $seq = []; $n = 0; $add = function (array $o, float $dur) use (&$seq, &$n, $bg, $J, $work) { $f = sprintf('%s/f%03d.png', $work, $n++); renderFrame($f, $bg, $J, $o); $seq[] = [$f, $dur]; };
    $tHook = $d('hook', 3.2, 0.4); $tRules = $d('rules', 4.5, 0.6);
    $add(['kind' => 'hook', 'st' => $st0], $tHook);
    if ($previewOnly) {
        $add(['kind' => 'count', 'st' => $st0, 'sec' => 7, 'tot' => $wait], 1);
        $st = $st0; foreach ($P['acts'] as $a) applyAct($st, $a); $add(['kind' => 'solved', 'st' => $st], 1);
        return $seq;
    }
    $add(['kind' => 'rules', 'st' => $st0], $tRules);
    for ($s = $wait; $s >= 1; $s--) $add(['kind' => 'count', 'st' => $st0, 'sec' => $s, 'tot' => $wait], 1.0);
    // solución por grupos
    $acts = $P['acts']; $na = count($acts); $K = max(1, min($na, 16)); $per = (int)ceil($na / $K); $tSol = max(5.0, min(9.0, $na * 0.22)); $groups = array_chunk($acts, $per);
    $st = $st0; foreach ($groups as $k => $grp) { foreach ($grp as $a) applyAct($st, $a); $add(['kind' => 'sol', 'st' => $st, 'hl' => hlOf($grp), 'prog' => ($k + 1) / count($groups)], $tSol / count($groups)); }
    $tSolved = $d('end', 3.0, 0.6);
    $add(['kind' => 'solved', 'st' => $st], $tSolved);
    $add(['kind' => 'cta', 'st' => $st], 3.2);
    imagedestroy($bg);
    $tl = ['hook' => 0, 'rules' => $tHook, 'count' => $tHook + $tRules, 'sol' => $tHook + $tRules + $wait, 'solved' => $tHook + $tRules + $wait + $tSol];
    $tl['end'] = $tl['solved'] + $tSolved + 3.2;
    return ['seq' => $seq, 'tl' => $tl, 'voice' => $v];
}
function encode(array $CFG, array $J, array $R, string $work, string $out): float
{
    $list = "ffconcat version 1.0\n"; foreach ($R['seq'] as [$f, $dur]) $list .= 'file ' . basename($f) . "\nduration " . number_format($dur, 3, '.', '') . "\n";
    $list .= 'file ' . basename($R['seq'][count($R['seq']) - 1][0]) . "\n"; file_put_contents("$work/list.txt", $list);
    $tl = $R['tl']; $D = $tl['end']; $fps = (int)$CFG['fps'];
    $in = ['-f concat -safe 0 -i ' . escapeshellarg("$work/list.txt")]; $fa = []; $mix = []; $k = 1;
    $music = pickMusic($CFG['music']);
    if ($music) { $in[] = '-stream_loop -1 -i ' . escapeshellarg($music); $fa[] = "[$k:a]volume={$CFG['music_vol']},afade=t=in:d=1,afade=t=out:st=" . number_format($D - 2, 2, '.', '') . ":d=2,atrim=0:" . number_format($D, 2, '.', '') . "[m]"; $mix[] = '[m]'; $k++; }
    foreach (['hook' => 0.15, 'rules' => 0.2, 'sol' => 0.1, 'end' => 0.25] as $name => $off) {
        if (empty($R['voice'][$name])) continue; $at = ($name === 'end' ? $tl['solved'] : $tl[$name]) + $off; $ms = (int)round($at * 1000);
        $in[] = '-i ' . escapeshellarg($R['voice'][$name][0]); $fa[] = "[$k:a]aresample=44100,adelay={$ms}|{$ms},volume=1.6[v$k]"; $mix[] = "[v$k]"; $k++;
    }
    if ($CFG['sfx']) {
        $w = $J['wait']; $ms = (int)round($tl['count'] * 1000);
        $in[] = '-f lavfi -i ' . escapeshellarg("aevalsrc=0.5*sin(2*PI*1100*t)*exp(-38*mod(t\\,1))*lt(mod(t\\,1)\\,0.12):s=44100:d=$w");
        $fa[] = "[$k:a]adelay={$ms}|{$ms},volume=0.8[t$k]"; $mix[] = "[t$k]"; $k++;
        $ms = (int)round($tl['sol'] * 1000);
        $in[] = '-f lavfi -i ' . escapeshellarg('aevalsrc=0.35*(sin(2*PI*880*t)+0.6*sin(2*PI*1320*t))*exp(-4*t):s=44100:d=1.2');
        $fa[] = "[$k:a]adelay={$ms}|{$ms}[d$k]"; $mix[] = "[d$k]"; $k++;
        $ms = (int)round($tl['solved'] * 1000);
        $in[] = '-f lavfi -i ' . escapeshellarg('aevalsrc=0.3*(sin(2*PI*523*t)*lt(t\\,0.15)+sin(2*PI*659*t)*between(t\\,0.15\\,0.3)+sin(2*PI*784*t)*between(t\\,0.3\\,0.9)*exp(-3*(t-0.3))):s=44100:d=1');
        $fa[] = "[$k:a]adelay={$ms}|{$ms}[e$k]"; $mix[] = "[e$k]"; $k++;
    }
    if (!$mix) { $in[] = '-f lavfi -i anullsrc=r=44100:cl=stereo'; $fa[] = "[$k:a]anull[s]"; $mix[] = '[s]'; }
    $Ds = number_format($D, 2, '.', '');
    $graph = "[0:v]fps=$fps,format=yuv420p,fade=t=in:d=0.3,fade=t=out:st=" . number_format($D - 0.4, 2, '.', '') . ":d=0.4[vv];" . implode(';', $fa) . ';' .
        implode('', $mix) . 'amix=inputs=' . count($mix) . ":normalize=0:duration=longest,atrim=0:$Ds,alimiter=limit=0.95[aa]";
    file_put_contents("$work/graph.txt", $graph);
    $cmd = escapeshellarg($CFG['ffmpeg']) . ' -y -v error ' . implode(' ', $in) . ' -filter_complex_script ' . escapeshellarg("$work/graph.txt") .
        " -map [vv] -map [aa] -t $Ds -c:v libx264 -preset {$CFG['preset']} -crf {$CFG['crf']} -pix_fmt yuv420p -c:a aac -b:a 160k -ar 44100 -movflags +faststart " . escapeshellarg($out);
    run($cmd);
    return probeDuration($out);
}

// ===========================================================================
// RSS DE SALIDA
// ===========================================================================
function writeRss(array $CFG, array $items): void
{
    $x = fn($s) => htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $cd = fn($s) => '<![CDATA[' . str_replace(']]>', ']]]]><![CDATA[>', (string)$s) . ']]>';
    $o = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">' . "\n<channel>\n";
    $o .= '  <title>' . $x($CFG['rss_title']) . "</title>\n  <link>" . $x(baseUrl($CFG)) . "</link>\n  <description>" . $x('Logic puzzle videos generated automatically by gamevideo.php') . "</description>\n";
    $o .= '  <lastBuildDate>' . date(DATE_RSS) . "</lastBuildDate>\n  <atom:link href=\"" . $x(baseUrl($CFG) . 'rss.xml') . "\" rel=\"self\" type=\"application/rss+xml\"/>\n";
    foreach ($items as $it) {
        $url = baseUrl($CFG) . trim($CFG['videos_dir'], '/') . '/' . $it['file'];
        $o .= "  <item>\n    <title>" . $x($it['title']) . "</title>\n    <link>" . $x($url) . "</link>\n    <guid isPermaLink=\"true\">" . $x($url) . "</guid>\n";
        $o .= '    <pubDate>' . date(DATE_RSS, (int)$it['date']) . "</pubDate>\n    <category>" . $x($it['game']) . "</category>\n";
        $o .= '    <description>' . $cd(nl2br(htmlspecialchars($it['description'], ENT_QUOTES, 'UTF-8'))) . "</description>\n";
        $o .= '    <enclosure url="' . $x($url) . '" length="' . (int)$it['bytes'] . "\" type=\"video/mp4\"/>\n";
        $o .= '    <media:content url="' . $x($url) . '" type="video/mp4" medium="video" width="' . W . '" height="' . H . '" duration="' . (int)round($it['duration']) . "\" lang=\"" . $x($it['lang']) . "\">\n";
        $o .= '      <media:title>' . $x($it['title']) . "</media:title>\n      <media:description>" . $x($it['description']) . "</media:description>\n";
        if (!empty($it['hashtags'])) $o .= '      <media:keywords>' . $x(implode(', ', $it['hashtags'])) . "</media:keywords>\n";
        $o .= "    </media:content>\n  </item>\n";
    }
    $o .= "</channel>\n</rss>\n";
    $tmp = STATE_DIR . '/rss.xml.tmp'; file_put_contents($tmp, $o);
    if (!@rename($tmp, $CFG['out'] . '/rss.xml')) throw new RuntimeException('No se pudo escribir rss.xml (¿permisos?)');
}

// ===========================================================================
// DIAGNÓSTICO Y WEB
// ===========================================================================
function preflight(array $CFG): array
{
    $r = []; $add = function (string $l, string $w, string $d = '') use (&$r) { $r[] = [$l, $w, $d]; };
    $add(version_compare(PHP_VERSION, '8.1.0', '>=') ? 'OK' : 'ERROR', 'PHP >= 8.1', PHP_VERSION . ' (' . PHP_SAPI . ')');
    foreach (['gd', 'curl', 'mbstring', 'iconv'] as $e) $add(extension_loaded($e) ? 'OK' : 'ERROR', "Extensión $e");
    if (function_exists('gd_info')) { $gi = gd_info(); $add(!empty($gi['FreeType Support']) ? 'OK' : 'ERROR', 'GD con FreeType'); }
    foreach (['proc_open', 'proc_close'] as $f) $add(fnOk($f) ? 'OK' : 'ERROR', "Función $f()");
    foreach (['ffmpeg', 'ffprobe'] as $b) { $p = whichCmd($CFG[$b]); $add($p ? 'OK' : 'ERROR', $b, $p ?: "no encontrado; pon la ruta en \$CFG['$b']"); }
    $e = whichCmd($CFG['edge_tts']); $add($e ? 'OK' : 'AVISO', 'edge-tts', $e ?: 'no encontrado: el vídeo saldrá sin voz (pip install edge-tts)');
    $add($CFG['deepseek_key'] !== '' ? 'OK' : 'AVISO', 'DeepSeek', $CFG['deepseek_key'] !== '' ? 'clave configurada' : 'sin clave: se usan plantillas de texto');
    try { $f = fonts($CFG); $add('OK', 'Fuentes', basename($f['big']) . ' · ' . basename($f['num']) . ' · kanji: ' . ($f['cjk'] ? basename($f['cjk']) : 'no (se dibuja un ✓)')); } catch (Throwable $ex) { $add('ERROR', 'Fuentes', $ex->getMessage()); }
    $m = pickMusic($CFG['music']); $add('OK', 'Música', $m ? basename($m) . ' (al azar de ' . $CFG['music'] . ')' : 'ninguna (pon mp3 en ' . $CFG['music'] . ')');
    @mkdir($CFG['out'] . '/' . $CFG['videos_dir'], 0775, true);
    $add(is_writable($CFG['out'] . '/' . $CFG['videos_dir']) ? 'OK' : 'ERROR', 'Carpeta de vídeos escribible', $CFG['out'] . '/' . $CFG['videos_dir']);
    $add(is_writable(STATE_DIR) ? 'OK' : 'ERROR', 'Carpeta .gamevideo escribible', STATE_DIR);
    $add('OK', 'URL pública', baseUrl($CFG) . 'rss.xml');
    if (PHP_SAPI !== 'cli') { $p = phpCli($CFG); $add($p ? 'OK' : 'AVISO', 'PHP CLI (segundo plano)', $p ?: "no encontrado; se ejecutará en primer plano (pon \$CFG['php_cli'])"); }
    return $r;
}
function preflightText(array $r): string { $o = ''; foreach ($r as [$l, $w, $d]) $o .= sprintf("[%-5s] %s%s\n", $l, $w, $d !== '' ? " — $d" : ''); return $o; }
function webEntry(array $opt, array $CFG): void
{
    header('Content-Type: text/plain; charset=utf-8'); header('Cache-Control: no-cache'); header('X-Accel-Buffering: no');
    @ini_set('zlib.output_compression', '0'); while (ob_get_level() > 0) @ob_end_flush(); ob_implicit_flush(true); ignore_user_abort(true);
    if (isset($opt['log'])) { if (isRunning()) { header('Refresh: 5'); echo "⏳ Generando… (se refresca cada 5 s)\n\n"; } echo tailLog(200); exit; }
    if (isset($opt['diag'])) { echo "Diagnóstico gamevideo\n=====================\n" . preflightText(preflight($CFG)); exit; }
    if (isRunning()) { header('Refresh: 5; url=?log=1'); echo "Ya hay una generación en curso. Mostrando el log…\n\n" . tailLog(60); exit; }
    $php = isset($opt['fg']) ? null : phpCli($CFG); $canBg = $php && fnOk('proc_open');
    if (!isset($opt['fg']) && $canBg) {
        header('Refresh: 3; url=?log=1');
        $args = ''; foreach (['game', 'lang', 'wait', 'host', 'scheme'] as $k) if (isset($opt[$k]) && preg_match('/^[A-Za-z0-9.\-]+$/', (string)$opt[$k])) $args .= " --$k=" . escapeshellarg((string)$opt[$k]);
        $cmd = escapeshellarg($php) . ' ' . escapeshellarg(__FILE__) . $args . ' --url-path=' . escapeshellarg($CFG['url_path']);
        $bg = PHP_OS_FAMILY === 'Windows' ? "start /B \"\" $cmd > NUL 2>&1" : "nohup $cmd > /dev/null 2>&1 &";
        $p = proc_open($bg, [], $pipes);
        if (is_resource($p)) { proc_close($p); echo "✔ Generación lanzada en segundo plano.\nEn 3 s se abre el log (?log=1), que se refresca solo.\n"; exit; }
        echo "No se pudo lanzar en segundo plano; ejecuto en primer plano.\n";
    } elseif (!isset($opt['fg'])) echo 'Aviso: ' . ($php ? 'proc_open deshabilitado' : 'no encontré PHP CLI') . "; ejecuto en primer plano.\n";
}

// ===========================================================================
// MAIN
// ===========================================================================
if ($isCli) { $u = getopt('', ['url-path:']); if (!empty($u['url-path'])) $CFG['url_path'] = (string)$u['url-path']; }
if (isset($opt['diag'])) { echo preflightText(preflight($CFG)); exit(0); }

$lock = @fopen(LOCK_FILE, 'c');
if (!$lock) { echo '✖ No se puede crear ' . LOCK_FILE . "\n"; exit(1); }
if (!flock($lock, LOCK_EX | LOCK_NB)) { echo "Ya hay otra ejecución en curso.\n"; exit(0); }

@file_put_contents(LOG_FILE, '');
logm(sprintf('=== gamevideo v1 | PHP %s (%s) | usuario %s | %s', PHP_VERSION, PHP_SAPI, currentUser(), baseUrl($CFG)));
$pf = preflight($CFG);
foreach ($pf as [$l, $w, $d]) if ($l !== 'OK') logm("[$l] $w" . ($d !== '' ? " — $d" : ''));
if (!isset($opt['dry-run']) && array_filter($pf, fn($x) => $x[0] === 'ERROR')) { logm('✖ Abortado: corrige los ERROR anteriores (detalle en ?diag=1 o --diag)'); exit(1); }

$work = STATE_DIR . '/work'; $code = 0;
try {
    rrmdir($work); $t0 = microtime(true);
    $J = generate($CFG, $opt, $TXT);
    if (isset($opt['dry-run'])) {
        $seq = render($CFG, $J, $work, true);
        foreach ($seq as $k => [$f]) copy($f, STATE_DIR . "/preview-$k.png");
        echo json_encode(['game' => $J['id'], 'lang' => $J['lang'], 'seed' => $J['seed'], 'size' => $J['P']['size'], 'steps' => count($J['P']['acts']), 'texts' => $J['texts'],
            'preview' => glob(STATE_DIR . '/preview-*.png')], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
    } else {
        $R = render($CFG, $J, $work);
        logm(sprintf('  %d fotogramas dibujados (%.1f s)', count($R['seq']), microtime(true) - $t0));
        $dir = $CFG['out'] . '/' . trim($CFG['videos_dir'], '/'); @mkdir($dir, 0775, true);
        $file = date('Ymd-His') . '-' . $J['id'] . '-' . $J['num'] . '.mp4'; $tmp = "$work/out.mp4";
        $dur = encode($CFG, $J, $R, $work, $tmp);
        if (!@rename($tmp, "$dir/$file")) { copy($tmp, "$dir/$file"); @unlink($tmp); }
        preg_match_all('/#([\p{L}\p{N}_]+)/u', $J['texts']['description'] . ' ' . $J['texts']['title'], $m);
        $items = is_file(ITEMS_FILE) ? (json_decode((string)file_get_contents(ITEMS_FILE), true) ?: []) : [];
        array_unshift($items, ['file' => $file, 'title' => $J['texts']['title'], 'description' => $J['texts']['description'], 'game' => $J['id'], 'lang' => $J['lang'],
            'date' => time(), 'duration' => $dur, 'bytes' => filesize("$dir/$file"), 'seed' => $J['seed'], 'hashtags' => array_values(array_unique($m[1]))]);
        foreach (array_slice($items, (int)$CFG['rss_items']) as $old) @unlink("$dir/" . basename((string)$old['file']));
        $items = array_slice($items, 0, (int)$CFG['rss_items']);
        file_put_contents(ITEMS_FILE, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        writeRss($CFG, $items);
        logm(sprintf('✔ %s (%.1f s de vídeo, %d KB) en %.0f s', $file, $dur, intdiv(filesize("$dir/$file"), 1024), microtime(true) - $t0));
        logm('  Título: ' . $J['texts']['title']);
        logm('  URL: ' . baseUrl($CFG) . trim($CFG['videos_dir'], '/') . "/$file");
        logm('  RSS: ' . baseUrl($CFG) . 'rss.xml');
    }
} catch (Throwable $e) {
    logm('✖ Error: ' . fmtEx($e)); $code = 1;
} finally {
    if (!isset($opt['keep'])) rrmdir($work);
}
exit($code);
