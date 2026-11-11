<?php
// Genera (o actualiza) bannergames/cerillas.json con los retos del juego de cerillas.
// Los textos, colores y ajustes que ya haya en el .json se conservan: solo se reemplaza la lista de retos.
// Uso (desde la raíz del repositorio): php herramientas/bannergames_json.php
$R = dirname(__DIR__);
$src = file_get_contents("$R/herramientas/src/cerillas.js");
if (!preg_match('#/\*PUZ\*/(\[.*?\]\]\])#s', $src, $m)) exit("No encuentro la lista de retos en cerillas.js\n");
$puz = json_decode($m[1], true);
$out = "$R/bannergames/cerillas.json";
$cur = is_file($out) ? (json_decode(file_get_contents($out), true) ?: []) : [];
$def = [
    'type' => 'cerillas',
    'url' => 'https://juegosboom.com/cerillas',
    'delay' => 3,              // segundos hasta que sale el intersticial
    'every_hours' => 12,       // cada cuántas horas puede volver a salir a pantalla completa (antes, sale ya minimizado)
    'closed_hours' => 24,      // si lo cierran del todo (✕ del minimizado), cuántas horas no vuelve a salir
    'wait' => 8,               // segundos para pensar en cada reto
    'max_count' => 2,          // solo retos de hasta tantas cerillas (los de 3-4 son largos para un banner)
    'colors' => ['bg1' => '#4a2c17', 'bg2' => '#1f130a', 'accent' => '#ff922b', 'cta' => '#ffd43b', 'ctaText' => '#2b1a0e'],
    'texts' => [
        'es' => ['brand' => '🔥 Reto de cerillas', 'hook' => '¿Lo resuelves?', 'move' => 'Mueve', 'remove' => 'Quita', 'add' => 'Añade', 'one' => 'cerilla', 'many' => 'cerillas',
            'fix' => 'y arregla la cuenta', 'think' => '¡Piensa!', 'solution' => 'Solución', 'solved' => '¿Lo has conseguido?', 'cta' => 'Juega gratis ▶', 'later' => 'Seguir leyendo',
            'mini' => 'Reto de cerillas', 'bar' => '🔥 ¿Resuelves este reto de cerillas?', 'barCta' => 'Jugar', 'close' => 'Cerrar', 'expand' => 'Ampliar'],
        'en' => ['brand' => '🔥 Matchstick puzzle', 'hook' => 'Can you solve it?', 'move' => 'Move', 'remove' => 'Remove', 'add' => 'Add', 'one' => 'match', 'many' => 'matches',
            'fix' => 'to fix the sum', 'think' => 'Think!', 'solution' => 'Solution', 'solved' => 'Did you get it?', 'cta' => 'Play free ▶', 'later' => 'Keep reading',
            'mini' => 'Matchstick puzzle', 'bar' => '🔥 Can you solve this matchstick puzzle?', 'barCta' => 'Play', 'close' => 'Close', 'expand' => 'Expand'],
    ],
];
$j = array_replace_recursive($def, $cur);
$j['puzzles'] = '@@PUZ@@';   // [ecuación, acción (m/r/a), cuántas cerillas, soluciones] — un reto por línea
$F = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
$lines = array_map(fn($p) => '    ' . json_encode($p, $F), $puz);
$txt = str_replace('"@@PUZ@@"', "[\n" . implode(",\n", $lines) . "\n  ]", json_encode($j, JSON_PRETTY_PRINT | $F));
file_put_contents($out, $txt . "\n");
echo "bannergames/cerillas.json: " . count($puz) . " retos\n";
