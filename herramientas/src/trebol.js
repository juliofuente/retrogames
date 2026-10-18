// Trébol|#3a0f47
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"suit","move":"one","empty":"none"},
    redeal: P.fanRedeal(2, 3),
    piles: (lv) => P.mk([['found', 4], ['tab', 16, { fan: 'right' }]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU","UUU"],"aces":true}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, { fans: true }),
    status: P.autoStatus,
    felt: ["#862e9c","#3a0f47"], back: ["#1971c2","#0b3f73"], backEmoji: '🍀',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Abanicos con los ases puestos', deco: ["🃏","🍀","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#862e9c","#3a0f47"],
    music: { mode: 'lydian', bpm: 95, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Trefoil', tag: 'Fans with the aces in place', help: 'Like La Belle Lucie, but the aces start on the foundations and there are sixteen fans. The aces are already on the <b>foundations</b>: build them up to K by suit. On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b>. Move <b>one card at a time</b>. Empty spaces are not refilled. When you get stuck, press 🔀: the table cards are gathered, shuffled and dealt again in threes (you can do it twice). <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'trebol', title: 'Trébol', emoji: '🍀', color: '#b197fc', origin: 'Trefoil',
    help: 'Como los Abanicos (La Belle Lucie), pero los ases empiezan en las bases y hay dieciséis abanicos. Los ases ya están en las <b>bases</b>: súbelas hasta la K por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b>. Se mueve <b>una carta cada vez</b>. Los huecos vacíos no se rellenan. Cuando te atasques, pulsa 🔀: se recogen las cartas de la mesa, se barajan y se reparten otra vez de tres en tres (puedes hacerlo 2 veces). <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
