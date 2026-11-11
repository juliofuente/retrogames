<?php
// Genera bannergames/<juego>.json (perfiles «playable») para todos los juegos del catálogo menos los educativos:
// el intersticial lleva el juego de verdad, deja jugar un nivel y luego sale el botón para jugar al juego entero.
// Los textos, colores y ajustes que ya haya en cada .json se conservan (solo se rellenan los que falten), así que
// puedes retocarlos a mano y volver a generar sin perderlos.
// Si un juego se llama igual que un perfil de otro tipo (cerillas, balanza, calculo…), su perfil jugable es <juego>-jugable.
// Uso (desde la raíz del repositorio): php herramientas/bannergames_playable.php
$R = dirname(__DIR__);
$db = new PDO("sqlite:$R/data/arcade.sqlite", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$SITE = 'https://juegosboom.com';
$OUT = "$R/bannergames";
$F = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

// primera frase de «cómo se juega», sin HTML, para el aviso del principio
function hint(?string $h): string {
  $t = trim(preg_replace('/\s+/u', ' ', strip_tags(html_entity_decode((string)$h, ENT_QUOTES, 'UTF-8'))));
  if ($t === '') return '';
  $s = preg_split('/(?<=[.!?])\s+/u', $t)[0];
  $s = preg_replace('/\s*\([^)]*\)/u', '', $s);   // sin aclaraciones entre paréntesis
  if (mb_strlen($s) > 110) $s = preg_replace('/[\s,;:]+\S*$/u', '', mb_substr($s, 0, 108)) . '…';
  return '👉 ' . $s;
}
function hexc(?string $c, string $def): string { return preg_match('/^#[0-9a-f]{6}$/i', (string)$c) ? strtolower($c) : $def; }
function merge_keep(array $def, array $cur): array {   // lo que ya hay manda; se añaden las claves nuevas
  foreach ($def as $k => $v) {
    if (!array_key_exists($k, $cur)) $cur[$k] = $v;
    elseif (is_array($v) && is_array($cur[$k]) && array_keys($v) !== range(0, count($v) - 1)) $cur[$k] = merge_keep($v, $cur[$k]);
  }
  return $cur;
}

$games = $db->query("SELECT * FROM games WHERE deleted_at IS NULL AND collection_id <> 'edu' AND file <> '' ORDER BY sort, id")->fetchAll();
$n = 0; $names = [];
foreach ($games as $g) {
  $id = $g['id'];
  $prof = $id;
  $f = "$OUT/$prof.json";
  if (is_file($f) && (json_decode(file_get_contents($f), true)['type'] ?? '') !== 'playable') { $prof = "$id-jugable"; $f = "$OUT/$prof.json"; }
  $lv = ctype_digit((string)$g['levels']) ? (int)$g['levels'] : 0;
  $e = $g['emoji'] ?: '🎮';
  $tes = $g['title_es'] ?: $id; $ten = $g['title_en'] ?: $tes;
  $def = [
    'type' => 'playable',
    'game' => $id,
    'emoji' => $e,
    'levels' => $lv,                                   // 0: juego por récord (sin niveles)
    'level' => 1,                                      // nivel que se juega en el intersticial
    'url' => ['es' => "$SITE/$id", 'en' => "$SITE/$id/en"],                     // el botón: el juego entero
    'play' => ['es' => "$SITE/$id?playable=1", 'en' => "$SITE/$id/en?playable=1"],   // lo que va dentro del intersticial
    'delay' => 3, 'every_hours' => 12, 'closed_hours' => 24, 'hint_seconds' => 7,
    'colors' => ['bg1' => hexc($g['bg1'], '#2b2f36'), 'bg2' => hexc($g['bg2'], '#14161a'), 'accent' => hexc($g['color'], '#ffd43b'), 'cta' => '#ffd43b', 'ctaText' => '#2b1a0e'],
    'texts' => [
      'es' => [
        'brand' => "$e $tes", 'loading' => 'Cargando el juego…', 'hint' => hint($g['help_es']),
        'cta' => $lv > 1 ? "Juega los $lv niveles gratis ▶" : 'Juega gratis ▶', 'later' => 'Seguir leyendo',
        'winTitle' => '¡Nivel superado!', 'winSub' => '¿Te ha gustado? Te quedan {n} niveles más esperándote.', 'winSubEnd' => '¿Te ha gustado? Hay muchos más juegos gratis.',
        'overTitle' => '¡Casi!', 'recordTitle' => '¡Buena partida!', 'overSub' => '¿Lo intentas otra vez o juegas al juego entero?',
        'overSubScore' => 'Has hecho {n} puntos. ¿Superas tu récord en el juego completo?', 'again' => '🔄 Otra vez',
        'mini' => $tes, 'miniPaused' => '⏸ En pausa · ¡sigue jugando!', 'miniEnd' => '¡Juega al juego entero!',
        'bar' => $lv > 1 ? "$e ¿Superas un nivel de $tes?" : "$e ¿Cuántos puntos haces en $tes?", 'barCta' => 'Jugar', 'close' => 'Cerrar', 'expand' => 'Ampliar',
      ],
      'en' => [
        'brand' => "$e $ten", 'loading' => 'Loading the game…', 'hint' => hint($g['help_en']),
        'cta' => $lv > 1 ? "Play all $lv levels free ▶" : 'Play free ▶', 'later' => 'Keep reading',
        'winTitle' => 'Level cleared!', 'winSub' => 'Did you like it? {n} more levels are waiting for you.', 'winSubEnd' => 'Did you like it? There are plenty more free games.',
        'overTitle' => 'So close!', 'recordTitle' => 'Nice game!', 'overSub' => 'Try again, or play the full game?',
        'overSubScore' => 'You scored {n} points. Can you beat it in the full game?', 'again' => '🔄 Again',
        'mini' => $ten, 'miniPaused' => '⏸ Paused · keep playing!', 'miniEnd' => 'Play the full game!',
        'bar' => $lv > 1 ? "$e Can you clear a level of $ten?" : "$e How many points can you score in $ten?", 'barCta' => 'Play', 'close' => 'Close', 'expand' => 'Expand',
      ],
    ],
  ];
  $cur = is_file($f) ? (json_decode(file_get_contents($f), true) ?: []) : [];
  $j = merge_keep($def, $cur);
  $j['levels'] = $lv; $j['game'] = $id;   // del catálogo, siempre al día
  file_put_contents($f, json_encode($j, $F) . "\n");
  $names[] = $prof; $n++;
}
// lista para la página de prueba (bannergames/demo.html)
file_put_contents("$OUT/playable.txt", implode("\n", $names) . "\n");
echo "bannergames: $n perfiles jugables\n";
