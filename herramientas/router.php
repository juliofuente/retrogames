<?php
// Router de pruebas para el servidor de PHP: imita el .htaccess.
// Uso (desde la raíz del repositorio): php -S 127.0.0.1:8080 -t . herramientas/router.php
$R = dirname(__DIR__);
$u = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $qs = $_SERVER['QUERY_STRING'] ?? '';
$go = function ($to) use ($qs) { header('Location: ' . $to . ($qs !== '' && strpos($to, '?') === false ? '?' . $qs : ''), true, 301); exit; };
if (preg_match('#^/pwa/(?!index)[a-z0-9]+(\.html)?$#', $u)) goto php;
if (preg_match('#^/pwa/(index(pro|tv)?(\.html)?)?$#', $u)) goto php;
if (preg_match('#^/educativos/?$#', $u) || preg_match('#^/educativos/index(\.html)?$#', $u)) $go('/coleccion/educativos');
if (preg_match('#^/(data|herramientas|autonomos)(/|$)#', $u) && $u !== '/data/julkadmin.php') { http_response_code(403); exit('403'); }
if ($u === '/index.html') goto php;
if (preg_match('#^/((?:.*/)?)index\.html$#', $u, $m)) $go('/' . $m[1]);
if (!preg_match('#^/educativos/brain-academy/games/#', $u) && preg_match('#^/(.+)\.html$#', $u, $m)) $go('/' . $m[1]);
if ($u !== '/' && is_file($R . $u)) return false;
if (is_dir($R . $u)) { if (is_file($R . rtrim($u, '/') . '/index.html')) { if (substr($u, -1) !== '/') $go($u . '/'); return false; } }
if (is_file($R . $u . '.html')) { readfile($R . $u . '.html'); exit; }
php:
$_SERVER['SCRIPT_NAME'] = '/index.php'; chdir($R); require $R . '/index.php';
