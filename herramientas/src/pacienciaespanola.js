// Paciencia española|#3d0a1d
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"any","move":"one","empty":"any"},
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['tab', 13]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#a61e4d","#3d0a1d"], back: ["#e67700","#8a4200"], backEmoji: '💃',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Docena del panadero con huecos útiles', deco: ["🃏","💃","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#a61e4d","#3d0a1d"],
    music: { mode: 'mixo', bpm: 79, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Spanish Patience', tag: 'Baker\'s Dozen with useful spaces', help: 'Like Baker\'s Dozen, but any card can go to an empty pile. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. Move <b>one card at a time</b>. Any card can go into an empty space. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'pacienciaespanola', title: 'Paciencia española', emoji: '💃', color: '#ff8787', origin: 'Spanish Patience',
    help: 'Como la Docena del panadero, pero cualquier carta puede ir a un montón vacío. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Se mueve <b>una carta cada vez</b>. Cualquier carta puede ir a un hueco vacío. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
