// Yukon|#0e2b3d
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
      solvable: true, solveBudget: 2500,
      tab: { build: 'alt', move: 'any', empty: 'K' },
      piles: (lv) => P.mk([['found', 4], ['tab', 7]]),
      init(lv) { this.tab.build = lv >= 16 ? 'suit' : 'alt'; },
      deal(st, D, deck) { const t = P.of(D, 'tab'); let k = 0; t.forEach((i, c) => { for (let n = 0; n < c; n++) st.p[i].push(P.down(deck[k++])); for (let n = 0; n < (c ? 5 : 1); n++) st.p[i].push(deck[k++]); }); },
      place(g, s, D, y0) { const c = P.cols(g, 7); s.cw = c.cw; D.forEach((d) => { if (d.k === 'found') { d.x = c.x(3 + d.n); d.y = y0; } if (d.k === 'tab') { d.x = c.x(d.n); d.y = y0 + c.cw * 1.4 + 14; } }); },
      status: (st, D, g) => g.lv >= 16 ? Arcade.T('Ruso: mismo palo', 'Russian: same suit') : Arcade.T('Bajando y alternando colores', 'Down, alternating colours'),
      demoSay: Arcade.T('Puedes mover montones desordenados', 'You can move unsorted piles'),      felt: ["#2f6f8f","#0e2b3d"], back: ["#1971c2","#0b3f73"], backEmoji: '🐻',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Mueve montones aunque no estén en orden', deco: ["🃏","🐻","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#2f6f8f","#0e2b3d"],
    music: { mode: 'major', bpm: 77, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Yukon', tag: 'Move piles even when they are out of order', help: 'Like classic solitaire but with no stock: every card is on the table. Build the <b>foundations</b> from A to K by suit. On the table, cards go <b>down in alternating colours</b>, but you can move <b>any face-up card with everything on top of it</b>, even if it is not in order. An empty column only takes a K. From level 16 you play <b>Russian Solitaire</b>: you must build down in the <b>same suit</b>. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Ruso: mismo palo': 'Russian: same suit', 'Bajando y alternando colores': 'Down, alternating colours', 'Toca una carta y va sola a su sitio': 'Tap a card and it goes to its place' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'yukon', title: 'Yukon', emoji: '🐻', color: '#74c0fc', origin: 'Yukon / Russian Solitaire',
    help: 'Como el solitario clásico pero sin mazo: todas las cartas están en la mesa. Completa las <b>bases</b> del A a la K por palo. En la mesa, las cartas van <b>bajando y alternando colores</b>, pero puedes mover <b>cualquier carta boca arriba con todas las que tiene encima</b>, aunque no estén en orden. Una columna vacía solo admite una K. Desde el nivel 16 juegas al <b>Solitario Ruso</b>: hay que bajar del <b>mismo palo</b>. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
