// Araña|#0d3b2e
// @cartas
(function () {
  const P = Arcade.paciencia;
  let SUITS = 1;
  const V = {
    decks: 2, found: { mode: 'run' }, stock: { to: 'tab', needAll: true },
    tab: { build: 'any', move: 'run', empty: 'any' },
    init(lv) { SUITS = lv < 8 ? 1 : 2; },
    planHint: true, demoBudget: 600,
    piles: () => P.mk([['stock', 1], ['found', 8], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, { suits: SUITS, ds: ['DDDDDU', 'DDDDDU', 'DDDDDU', 'DDDDDU', 'DDDDU', 'DDDDU', 'DDDDU', 'DDDDU', 'DDDDU', 'DDDDU'] }),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: (st, D) => Arcade.T('Escaleras: ', 'Runs: ') + (st.runs || 0) + '/8 · ' + P.autoStatus(st, D),
    demoSay: Arcade.T('Escaleras del mismo palo', 'Same-suit runs'),
    felt: ['#147a52', '#0d3b2e'], back: ['#862e9c', '#5f3dc4'], backEmoji: '🕷️',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Ocho escaleras del K al A', deco: ['🕷️', '🃏', '♠️', '♥️', '🕸️', '👑'], font: 'serif', bg: ['#147a52', '#0d3b2e'],
    music: { mode: 'dorian', bpm: 78, wave: 'sine', style: 'chill', root: 57 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Spider', tag: 'Eight runs from K to A', help: 'Spider solitaire with two decks. Put a card on another one rank higher (a 6 on a 7, any suit). You can move several cards together if they form a <b>run of the same suit</b>. When you complete a run <b>from K down to A of one suit</b>, it leaves the table. Clear the 8 runs. <b>Tap</b> a card and it goes to the best place (or <b>drag</b> it). The deck at the top deals one card to each column (only when there are no empty columns). It starts with one suit (♠) and from level 8 uses two (♠ ♥). 💡 gives a hint, ↩️ undoes and 📖 opens the tutorial.', tvHelp: 'D-pad to a card · OK moves it to the best place.', dict: { 'Escaleras: ': 'Runs: ', 'Escaleras del mismo palo': 'Same-suit runs', 'Mazo: ': 'Stock: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve a su mejor sitio.',
    id: 'arana', title: 'Araña', emoji: '🕷️', color: '#b197fc', origin: 'Spider Solitaire (Lutanho)',
    help: 'El solitario Araña, con dos barajas. Pon una carta sobre otra de un número más (un 6 sobre un 7, de cualquier palo). Puedes mover varias juntas si forman una <b>escalera del mismo palo</b>. Cuando completas una escalera <b>del K al A de un mismo palo</b>, sale de la mesa. Quita las 8 escaleras. <b>Toca</b> una carta y va sola a su mejor sitio (o <b>arrástrala</b>). El mazo de arriba reparte una carta a cada columna (solo si no hay columnas vacías). Empieza con un palo (♠) y desde el nivel 8 con dos (♠ ♥). 💡 te da una pista, ↩️ deshace y 📖 abre el tutorial.',
    lives: 0, levels: 0, cap: 20,
  });
})();
