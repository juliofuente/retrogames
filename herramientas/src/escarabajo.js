// Escarabajo|#0a3d24
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    found: {"mode":"run"},
    tab: {"build":"any","move":"run","empty":"any"},
    stock: { to: 'tab' },
    planHint: true, demoBudget: 600,
    piles: (lv) => P.mk([['stock', 1], ['found', 8], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUUUU","UUUUUU","UUUUUU","UUUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#1b8a4c","#0a3d24"], back: ["#862e9c","#45115a"], backEmoji: '🪲',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'La Araña con todo a la vista', deco: ["🃏","🪲","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#1b8a4c","#0a3d24"],
    music: { mode: 'mixo', bpm: 95, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Beetle', tag: 'Spider with everything face up', help: 'Four-suit Spider, but with every table card face up. Played with <b>two decks</b>. Make <b>complete runs from K down to A in the same suit</b>: each one you finish goes up to the foundations by itself. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. Only <b>same-suit runs</b> move together. Any card can go into an empty space. Tap the stock to deal one card to each column. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'escarabajo', title: 'Escarabajo', emoji: '🪲', color: '#ff6b6b', origin: 'Beetle',
    help: 'La Araña de cuatro palos, pero con todas las cartas de la mesa boca arriba. Se juega con <b>dos barajas</b>. Forma <b>escaleras completas de la K al A del mismo palo</b>: cada una que termines sube sola a las bases. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Solo se mueven juntas las <b>escaleras del mismo palo</b>. Cualquier carta puede ir a un hueco vacío. Toca el mazo para repartir una carta a cada columna. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
