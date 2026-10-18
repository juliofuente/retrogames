// Buena medida|#5a0f2a
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"any","move":"one","empty":"none"},
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU","UUUUU"],"aces":true,"nBase":2}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#d6336c","#5a0f2a"], back: ["#5f3dc4","#2b1580"], backEmoji: '📏',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Diez montones de cinco, sin huecos', deco: ["🃏","📏","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#d6336c","#5a0f2a"],
    music: { mode: 'dorian', bpm: 74, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Good Measure', tag: 'Ten piles of five, no spaces', help: 'Ten piles of five cards and two aces already on the foundations; empty piles are not refilled. Two aces start on the <b>foundations</b>; build all four from A to K by suit. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. Move <b>one card at a time</b>. Empty spaces are not refilled. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'buenamedida', title: 'Buena medida', emoji: '📏', color: '#faa2c1', origin: 'Good Measure',
    help: 'Diez montones de cinco cartas y dos ases ya en las bases; los montones vacíos no se rellenan. Dos ases empiezan en las <b>bases</b>; completa las cuatro del A a la K por palo. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Se mueve <b>una carta cada vez</b>. Los huecos vacíos no se rellenan. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
