/* Banco de problemas de matemáticas de 1.º a 6.º de Primaria.
   Cada plantilla es una función (r, k) → problema, donde r() es un aleatorio [0,1) y k (0…1) la dificultad dentro del
   curso (sube con el número de ficha). Un problema es:
     { e: emoji, t: enunciado, res: 'Frase con {} para cada hueco', ans: [respuestas numéricas], datos: [...], ops: [...] }
   Las de 4.º siguen los problemas de la «Colección de problemas 4.º de Primaria» (mismo tipo, números distintos). */
(function () {
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const rnd = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  // números en español: 12.500 (desde 10.000), 3,75 con coma decimal
  const N = (n, d) => {
    if (d == null) d = Number.isInteger(n) ? 0 : 2;
    let [i, f] = Math.abs(n).toFixed(d).split('.');
    if (i.length > 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (f) f = f.replace(/0+$/, '');
    return (n < 0 ? '−' : '') + i + (f ? ',' + f : '');
  };
  const E = (n) => (Number.isInteger(n) ? N(n) : Math.abs(n).toFixed(2).replace('.', ',')) + ' €';   // dinero
  const NAMES = ['Ana', 'Leo', 'Sara', 'Hugo', 'Lucía', 'Pablo', 'Mía', 'Dani', 'Noa', 'Iker', 'Alba', 'Mario', 'Irene', 'Óscar', 'Carla', 'Álvaro', 'Nora', 'Unai', 'Vega', 'Marcos'];
  const two = (r) => { const a = pick(r, NAMES); let b; do b = pick(r, NAMES); while (b === a); return [a, b]; };
  const B = {};

  /* ───────────── 1.º de Primaria: sumas y restas hasta 20 y luego hasta 99, decenas, dobles ───────────── */
  const big1 = (r, k) => (k < 0.4 ? ri(r, 3, 10) : ri(r, 11, 20 + Math.round(k * 50)));
  B[1] = [
    (r, k) => { const [x, y] = two(r), a = big1(r, k), b = ri(r, 2, k < 0.4 ? 9 : 20), it = pick(r, [['cromos', '🃏'], ['canicas', '🔵'], ['lápices', '✏️'], ['caramelos', '🍬']]);
      return { e: it[1], t: `${x} tiene ${a} ${it[0]} y ${y} tiene ${b}. ¿Cuántos ${it[0]} tienen entre los dos?`, res: `Entre los dos tienen {} ${it[0]}.`, ans: [a + b], datos: [`${x}: ${a}`, `${y}: ${b}`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const a = big1(r, k) + 4, b = ri(r, 1, Math.min(a - 1, k < 0.4 ? 5 : 15));
      return { e: '🐦', t: `En un árbol hay ${a} pájaros. Se van volando ${b}. ¿Cuántos pájaros quedan en el árbol?`, res: 'Quedan {} pájaros.', ans: [a - b], datos: [`Había ${a} pájaros`, `Se van ${b}`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const a = big1(r, k), b = ri(r, 2, 9);
      return { e: '🚌', t: `En el autobús van ${a} niños. En la parada suben ${b} niños más. ¿Cuántos niños van ahora en el autobús?`, res: 'Ahora van {} niños.', ans: [a + b], datos: [`Iban ${a}`, `Suben ${b}`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const [x, y] = two(r), b = big1(r, k), a = b + ri(r, 2, 9);
      return { e: '🃏', t: `${x} tiene ${a} cromos y ${y} tiene ${b}. ¿Cuántos cromos más tiene ${x} que ${y}?`, res: `${x} tiene {} cromos más.`, ans: [a - b], datos: [`${x}: ${a}`, `${y}: ${b}`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const d = ri(r, 1, k < 0.4 ? 2 : 9), u = ri(r, 1, 9);
      return { e: '📦', t: `Tengo ${d} ${d === 1 ? 'caja' : 'cajas'} con 10 lápices cada una y ${u} lápices sueltos. ¿Cuántos lápices tengo?`, res: 'Tengo {} lápices.', ans: [d * 10 + u], datos: [`${d} × 10 lápices`, `${u} sueltos`], ops: [`${d * 10} + ${u} = ${d * 10 + u}`] }; },
    (r, k) => { const [x, y] = two(r), a = ri(r, 2, k < 0.5 ? 5 : 10);
      return { e: '🔵', t: `${x} tiene ${a} canicas y ${y} tiene el doble. ¿Cuántas canicas tiene ${y}?`, res: `${y} tiene {} canicas.`, ans: [2 * a], datos: [`${x}: ${a}`, 'El doble = dos veces'], ops: [`${a} + ${a} = ${2 * a}`] }; },
    (r, k) => { const c = big1(r, k) + 5, a = ri(r, 1, c - 2);
      return { e: '🎈', t: `Para la fiesta necesito ${c} globos y ya tengo ${a}. ¿Cuántos globos me faltan?`, res: 'Me faltan {} globos.', ans: [c - a], datos: [`Necesito ${c}`, `Tengo ${a}`], ops: [`${c} − ${a} = ${c - a}`] }; },
    (r, k) => { const a = ri(r, 2, 8), b = ri(r, 1, 6), c = ri(r, 1, k < 0.5 ? 5 : 12);
      return { e: '🐔', t: `En la granja hay ${a} gallinas, ${b} patos y ${c} conejos. ¿Cuántos animales hay en total?`, res: 'Hay {} animales.', ans: [a + b + c], datos: [`${a} gallinas`, `${b} patos`, `${c} conejos`], ops: [`${a} + ${b} + ${c} = ${a + b + c}`] }; },
    (r, k) => { const a = ri(r, 1, 5), b = ri(r, 1, k < 0.5 ? 4 : 9);
      return { e: '🍦', t: `Un helado cuesta ${a} € y un zumo cuesta ${b} €. ¿Cuánto cuestan los dos juntos?`, res: 'Cuestan {} euros.', ans: [a + b], datos: [`Helado: ${a} €`, `Zumo: ${b} €`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const n = ri(r, 2, k < 0.5 ? 5 : 9);
      return { e: '🚲', t: `En el patio hay ${n} bicicletas. Cada bicicleta tiene 2 ruedas. ¿Cuántas ruedas hay?`, res: 'Hay {} ruedas.', ans: [2 * n], datos: [`${n} bicicletas`, '2 ruedas cada una'], ops: [`${Array(n).fill(2).join(' + ')} = ${2 * n}`] }; },
    (r, k) => { const [x] = two(r), a = big1(r, k) + 3, b = ri(r, 1, a - 1);
      return { e: '🍬', t: `${x} tenía ${a} caramelos y le ha dado ${b} a su hermana. ¿Cuántos caramelos le quedan?`, res: 'Le quedan {} caramelos.', ans: [a - b], datos: [`Tenía ${a}`, `Da ${b}`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const a = ri(r, 10, 39) + (k > 0.5 ? 30 : 0), b = ri(r, 1, 3) * 10;   // 1.º: hasta 99
      return { e: '📚', t: `En la estantería hay ${a} cuentos. La profe trae ${b} cuentos nuevos. ¿Cuántos cuentos hay ahora?`, res: 'Ahora hay {} cuentos.', ans: [a + b], datos: [`Había ${a}`, `Trae ${b}`], ops: [`${a} + ${b} = ${a + b}`] }; },
  ];

  /* ───────────── 2.º: hasta 999 con llevadas, tablas, mitad, docenas, dinero, horas ───────────── */
  B[2] = [
    (r, k) => { const [x, y] = two(r), a = ri(r, 25, 60 + Math.round(k * 400)), b = ri(r, 15, 40 + Math.round(k * 300));
      return { e: '💶', t: `${x} ha ahorrado ${a} € y ${y} ha ahorrado ${b} €. ¿Cuánto dinero tienen entre los dos?`, res: 'Entre los dos tienen {} euros.', ans: [a + b], datos: [`${x}: ${a} €`, `${y}: ${b} €`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const a = ri(r, 60, 120 + Math.round(k * 300)), b = ri(r, 15, a - 10);
      return { e: '📖', t: `Un libro tiene ${a} páginas. Ya he leído ${b}. ¿Cuántas páginas me faltan por leer?`, res: 'Me faltan {} páginas.', ans: [a - b], datos: [`Total: ${a} páginas`, `Leídas: ${b}`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const m = pick(r, [2, 3, 4, 5, 6, 10]), n = ri(r, 2, k < 0.5 ? 6 : 10);
      return { e: '🥚', t: `En cada caja hay ${m} huevos. ¿Cuántos huevos hay en ${n} cajas?`, res: 'Hay {} huevos.', ans: [m * n], datos: [`${n} cajas`, `${m} huevos en cada una`], ops: [`${n} × ${m} = ${m * n}`] }; },
    (r, k) => { const n = ri(r, 3, k < 0.5 ? 10 : 25);
      return { e: '🍪', t: `Dos hermanos se reparten ${2 * n} galletas a partes iguales. ¿Cuántas galletas le tocan a cada uno?`, res: 'A cada uno le tocan {} galletas.', ans: [n], datos: [`${2 * n} galletas`, 'Entre 2'], ops: [`La mitad de ${2 * n} = ${n}`] }; },
    (r, k) => { const n = ri(r, 2, k < 0.5 ? 4 : 8);
      return { e: '🥚', t: `Mamá compra ${n} docenas de huevos. Una docena son 12. ¿Cuántos huevos compra?`, res: 'Compra {} huevos.', ans: [12 * n], datos: [`${n} docenas`, '1 docena = 12'], ops: [`${n} × 12 = ${12 * n}`] }; },
    (r, k) => { const a = pick(r, [10, 20, 50]), c = ri(r, 3, a - 2);
      return { e: '🛒', t: `Pago con un billete de ${a} € una compra de ${c} €. ¿Cuánto dinero me devuelven?`, res: 'Me devuelven {} euros.', ans: [a - c], datos: [`Pago: ${a} €`, `Compra: ${c} €`], ops: [`${a} − ${c} = ${a - c}`] }; },
    (r, k) => { const [x] = two(r), a = ri(r, 6, 9), b = ri(r, 22, 35);
      return { e: '🎂', t: `${x} tiene ${a} años y su padre tiene ${b} años más que ${x}. ¿Cuántos años tiene su padre?`, res: 'El padre tiene {} años.', ans: [a + b], datos: [`${x}: ${a} años`, `${b} años más`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const n = ri(r, 2, k < 0.5 ? 5 : 9);
      return { e: '📅', t: `Una semana tiene 7 días. ¿Cuántos días hay en ${n} semanas?`, res: 'Hay {} días.', ans: [7 * n], datos: [`${n} semanas`, '7 días cada una'], ops: [`${n} × 7 = ${7 * n}`] }; },
    (r, k) => { const m = pick(r, [2, 3, 4, 5]), q = ri(r, 2, k < 0.5 ? 5 : 10);
      return { e: '🃏', t: `${pick(r, NAMES)} reparte ${m * q} cromos entre ${m} amigos, a partes iguales. ¿Cuántos cromos recibe cada amigo?`, res: 'Cada amigo recibe {} cromos.', ans: [q], datos: [`${m * q} cromos`, `${m} amigos`], ops: [`${m * q} : ${m} = ${q}`] }; },
    (r, k) => { const b = ri(r, 30, 120), c = ri(r, 20, 90), a = b + c + ri(r, 15, 100 + Math.round(k * 400));
      return { e: '🍎', t: `En la frutería había ${a} manzanas. Por la mañana venden ${b} y por la tarde ${c}. ¿Cuántas manzanas quedan?`, res: 'Quedan {} manzanas.', ans: [a - b - c], datos: [`Había ${a}`, `Venden ${b} y ${c}`], ops: [`${b} + ${c} = ${b + c}`, `${a} − ${b + c} = ${a - b - c}`] }; },
    (r, k) => { const s = ri(r, 1, 8), d = ri(r, 2, 4);
      return { e: '🕐', t: `La película empieza a las ${s} y dura ${d} horas. ¿A qué hora termina?`, res: 'Termina a las {}.', ans: [s + d], datos: [`Empieza a las ${s}`, `Dura ${d} horas`], ops: [`${s} + ${d} = ${s + d}`] }; },
    (r, k) => { const f = ri(r, 3, k < 0.5 ? 5 : 9), c = pick(r, [2, 4, 5, 10]);
      return { e: '🪑', t: `En la clase hay ${f} filas con ${c} sillas en cada fila. ¿Cuántas sillas hay?`, res: 'Hay {} sillas.', ans: [f * c], datos: [`${f} filas`, `${c} sillas por fila`], ops: [`${f} × ${c} = ${f * c}`] }; },
    (r, k) => { const [x, y] = two(r), a = ri(r, 4, 12);
      return { e: '⚽', t: `${x} ha marcado ${a} goles este año y ${y} ha marcado el triple. ¿Cuántos goles ha marcado ${y}?`, res: `${y} ha marcado {} goles.`, ans: [3 * a], datos: [`${x}: ${a} goles`, 'El triple = 3 veces'], ops: [`${a} × 3 = ${3 * a}`] }; },
  ];

  /* ───────────── 3.º: hasta 9.999, multiplicar por una cifra, dividir exacto, dos pasos, euros y céntimos, medidas ───────────── */
  B[3] = [
    (r, k) => { const b = ri(r, 300, 1500), c = ri(r, 200, 900), a = b + c + ri(r, 100, 800 + Math.round(k * 5000));
      return { e: '🧑‍🌾', t: `Un agricultor tenía ${N(a)} kg de patatas. Vende ${N(b)} kg en el mercado y ${N(c)} kg a una tienda. ¿Cuántos kilos le quedan?`, res: 'Le quedan {} kg.', ans: [a - b - c], datos: [`Tenía ${N(a)} kg`, `Vende ${N(b)} y ${N(c)} kg`], ops: [`${N(b)} + ${N(c)} = ${N(b + c)}`, `${N(a)} − ${N(b + c)} = ${N(a - b - c)}`] }; },
    (r, k) => { const p = ri(r, 12, 60 + Math.round(k * 200)), n = ri(r, 3, 9);
      return { e: '🎫', t: `Una entrada del parque cuesta ${p} €. ¿Cuánto pagan ${n} amigos por sus entradas?`, res: 'Pagan {} euros.', ans: [p * n], datos: [`1 entrada: ${p} €`, `${n} amigos`], ops: [`${p} × ${n} = ${p * n}`] }; },
    (r, k) => { const d = ri(r, 3, 9), q = ri(r, 12, 40 + Math.round(k * 60));
      return { e: '🍓', t: `Se reparten ${d * q} fresas en ${d} cestas con el mismo número de fresas. ¿Cuántas fresas hay en cada cesta?`, res: 'En cada cesta hay {} fresas.', ans: [q], datos: [`${d * q} fresas`, `${d} cestas`], ops: [`${d * q} : ${d} = ${q}`] }; },
    (r, k) => { const [x] = two(r), a = ri(r, 2, 6), c = pick(r, [20, 25, 50, 75]), pay = Math.ceil(a + c / 100) + ri(r, 1, 3);
      const cost = rnd(a + c / 100, 2);
      return { e: '📒', t: `${x} compra un cuaderno que cuesta ${E(cost)} y paga con ${pay} €. ¿Cuánto le devuelven?`, res: 'Le devuelven {} euros.', ans: [rnd(pay - cost, 2)], datos: [`Cuesta ${E(cost)}`, `Paga ${pay} €`], ops: [`${N(pay)} − ${N(cost)} = ${N(rnd(pay - cost, 2))}`] }; },
    (r, k) => { const m = ri(r, 2, 9), c = ri(r, 10, 95);
      return { e: '📏', t: `Una cuerda mide ${m} metros y ${c} centímetros. ¿Cuántos centímetros mide en total? (1 m = 100 cm)`, res: 'Mide {} centímetros.', ans: [m * 100 + c], datos: [`${m} m = ${m * 100} cm`, `${c} cm`], ops: [`${m * 100} + ${c} = ${m * 100 + c}`] }; },
    (r, k) => { const l = ri(r, 5, 40 + Math.round(k * 60));
      return { e: '🟩', t: `Un huerto cuadrado mide ${l} metros de lado. ¿Cuántos metros de valla hacen falta para rodearlo?`, res: 'Hacen falta {} metros.', ans: [4 * l], datos: [`Lado: ${l} m`, 'Un cuadrado tiene 4 lados iguales'], ops: [`${l} × 4 = ${4 * l}`] }; },
    (r, k) => { const [x, y] = two(r), a = ri(r, 25, 90), b = ri(r, 8, 30);
      return { e: '👕', t: `Una camiseta cuesta ${a} € y un gorro cuesta ${b} € menos que la camiseta. ¿Cuánto cuestan las dos cosas juntas?`, res: 'Cuestan {} euros.', ans: [a + a - b], datos: [`Camiseta: ${a} €`, `Gorro: ${b} € menos`], ops: [`${a} − ${b} = ${a - b}`, `${a} + ${a - b} = ${2 * a - b}`] }; },
    (r, k) => { const h = ri(r, 2, 6);
      return { e: '⏱️', t: `Una hora tiene 60 minutos. ¿Cuántos minutos hay en ${h} horas y media?`, res: 'Hay {} minutos.', ans: [h * 60 + 30], datos: [`${h} horas = ${h} × 60`, 'Media hora = 30 min'], ops: [`${h} × 60 = ${h * 60}`, `${h * 60} + 30 = ${h * 60 + 30}`] }; },
    (r, k) => { const kg = ri(r, 2, 6), g = pick(r, [250, 500, 750]);
      return { e: '⚖️', t: `Un saco de harina pesa ${kg} kg y ${g} gramos. ¿Cuántos gramos pesa? (1 kg = 1.000 g)`, res: 'Pesa {} gramos.', ans: [kg * 1000 + g], datos: [`${kg} kg = ${kg * 1000} g`, `${g} g`], ops: [`${kg * 1000} + ${g} = ${kg * 1000 + g}`] }; },
    (r, k) => { const c = ri(r, 3, 8), p = ri(r, 6, 12), s = ri(r, 3, 9);
      return { e: '🖍️', t: `Una caja trae ${c} paquetes de ${p} ceras. Se han roto ${s} ceras. ¿Cuántas ceras quedan bien?`, res: 'Quedan bien {} ceras.', ans: [c * p - s], datos: [`${c} paquetes de ${p}`, `Rotas: ${s}`], ops: [`${c} × ${p} = ${c * p}`, `${c * p} − ${s} = ${c * p - s}`] }; },
    (r, k) => { const v = ri(r, 150, 400), s1 = ri(r, 20, 60), b1 = ri(r, 10, 50), s2 = ri(r, 20, 60);
      return { e: '🚆', t: `En un tren viajan ${v} personas. En la primera parada bajan ${s1} y suben ${b1}. En la segunda bajan ${s2}. ¿Cuántas personas siguen en el tren?`, res: 'Siguen {} personas.', ans: [v - s1 + b1 - s2], datos: [`Al principio: ${v}`, `Bajan ${s1}, suben ${b1}`, `Bajan ${s2}`], ops: [`${v} − ${s1} + ${b1} = ${v - s1 + b1}`, `${v - s1 + b1} − ${s2} = ${v - s1 + b1 - s2}`] }; },
    (r, k) => { const [x] = two(r), a = ri(r, 7, 12), b = ri(r, 3, 6);
      return { e: '🎁', t: `${x} tiene ${a} años. Su hermano nació cuando ${x} tenía ${b} años. ¿Cuántos años tiene su hermano?`, res: 'Su hermano tiene {} años.', ans: [a - b], datos: [`${x}: ${a} años`, `Nació cuando tenía ${b}`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const n = ri(r, 4, 9), u = pick(r, [2, 4, 5]);
      return { e: '🍕', t: `Cada pizza se corta en ${u * 2} trozos. ¿Cuántos trozos hay en ${n} pizzas?`, res: 'Hay {} trozos.', ans: [n * u * 2], datos: [`${n} pizzas`, `${u * 2} trozos cada una`], ops: [`${n} × ${u * 2} = ${n * u * 2}`] }; },
  ];

  /* ───────────── 4.º (como la colección del PDF): hasta 5 cifras, multiplicar y dividir por 2 cifras, resto, fracciones, decimales de dinero, tiempo ───────────── */
  B[4] = [
    (r, k) => { const [x, y] = two(r), a = ri(r, 150, 900), b = ri(r, 150, 900);
      return { e: '💶', t: `${x} tiene ${a} € y ${y} tiene ${b} €. ¿Cuántos euros tienen entre los dos?`, res: 'Tienen entre los dos {} euros.', ans: [a + b], datos: [`${x}: ${a} €`, `${y}: ${b} €`], ops: [`${a} + ${b} = ${a + b}`] }; },
    (r, k) => { const [x] = two(r), a = ri(r, 200, 500), b = ri(r, 40, a - 60);
      return { e: '🛍️', t: `${x} va al mercado con ${a} euros y regresa con ${b} euros. ¿Cuánto le cuesta la compra?`, res: 'La compra le cuesta {} euros.', ans: [a - b], datos: [`Lleva ${a} €`, `Vuelve con ${b} €`], ops: [`${a} − ${b} = ${a - b}`] }; },
    (r, k) => { const l = ri(r, 120, 480), n = ri(r, 3, 9);
      return { e: '🛢️', t: `Cada depósito contiene ${l} litros de agua. ¿Cuántos litros de agua hay en total en ${n} depósitos iguales?`, res: 'Hay {} litros.', ans: [l * n], datos: [`${l} litros cada uno`, `${n} depósitos`], ops: [`${l} × ${n} = ${l * n}`] }; },
    (r, k) => { const c = ri(r, 2500, 4800), s = ri(r, 4, 9), w = pick(r, [25, 40, 50]);
      return { e: '🚚', t: `Un camión va cargado con ${N(c)} kg de patatas. En una frutería descarga ${s} sacos de ${w} kg cada uno. ¿Cuánto pesa ahora la carga del camión?`, res: 'La carga pesa {} kg.', ans: [c - s * w], datos: [`Carga: ${N(c)} kg`, `${s} sacos de ${w} kg`], ops: [`${s} × ${w} = ${s * w}`, `${N(c)} − ${s * w} = ${N(c - s * w)}`] }; },
    (r, k) => { const t = pick(r, [10000, 12000, 15000, 20000]), a = ri(r, 15, 45) * 100, b = ri(r, 1200, 4000);
      return { e: '💧', t: `De un depósito que contenía ${N(t)} litros de agua se sacaron primero ${N(a)} litros y después ${N(b)} litros. ¿Cuántos litros quedan?`, res: 'Quedan {} litros.', ans: [t - a - b], datos: [`Había ${N(t)} l`, `Sacan ${N(a)} y ${N(b)} l`], ops: [`${N(a)} + ${N(b)} = ${N(a + b)}`, `${N(t)} − ${N(a + b)} = ${N(t - a - b)}`] }; },
    (r, k) => { const l = ri(r, 70, 95), f = ri(r, 45, 70);
      return { e: '🚐', t: `Una lavadora pesa ${l} kg y un frigorífico ${f} kg. ¿Cuánto peso lleva una furgoneta que transporta dos frigoríficos y una lavadora?`, res: 'Lleva {} kg.', ans: [2 * f + l], datos: [`Lavadora: ${l} kg`, `Frigorífico: ${f} kg`], ops: [`${f} × 2 = ${2 * f}`, `${2 * f} + ${l} = ${2 * f + l}`] }; },
    (r, k) => { const c = ri(r, 2, 6), p = ri(r, 4, 8);
      return { e: '📄', t: `Un paquete de folios tiene 500 folios. ¿Cuántos folios habrá en ${c} cajas si en cada caja hay ${p} paquetes?`, res: 'Habrá {} folios.', ans: [c * p * 500], datos: [`500 folios por paquete`, `${p} paquetes por caja`, `${c} cajas`], ops: [`${c} × ${p} = ${c * p} paquetes`, `${c * p} × 500 = ${N(c * p * 500)}`] }; },
    (r, k) => { const p = ri(r, 25, 45), m = ri(r, 12, 30);
      return { e: '👔', t: `Una camisa cuesta ${m} euros más que un pantalón. Si el pantalón cuesta ${p} euros, ¿cuánto cuestan las dos prendas?`, res: 'Las dos prendas cuestan {} euros.', ans: [2 * p + m], datos: [`Pantalón: ${p} €`, `Camisa: ${m} € más`], ops: [`${p} + ${m} = ${p + m}`, `${p} + ${p + m} = ${2 * p + m}`] }; },
    (r, k) => { const [x] = two(r), a = ri(r, 180, 350), g = ri(r, 12, 25);
      return { e: '🐷', t: `${x} empieza la semana con ${a} euros y gasta ${g} euros cada día. ¿Con cuánto dinero termina la semana?`, res: 'Termina la semana con {} euros.', ans: [a - 7 * g], datos: [`Empieza con ${a} €`, `Gasta ${g} € al día`, '1 semana = 7 días'], ops: [`${g} × 7 = ${7 * g}`, `${a} − ${7 * g} = ${a - 7 * g}`] }; },
    (r, k) => { const d = ri(r, 2, 9);
      return { e: '⏱️', t: `Una hora tiene 60 minutos. ¿Cuántos minutos hay en ${d} días?`, res: 'Hay {} minutos.', ans: [d * 24 * 60], datos: ['1 día = 24 horas', '1 hora = 60 minutos', `${d} días`], ops: [`${d} × 24 = ${d * 24} horas`, `${d * 24} × 60 = ${N(d * 24 * 60)}`] }; },
    (r, k) => { const m = ri(r, 45, 95), c = ri(r, 9, 18);
      return { e: '🔌', t: `Para una instalación eléctrica se han usado ${m} metros de cable. Cada metro cuesta ${c} céntimos. ¿Cuál es el precio total en céntimos?`, res: 'El precio es {} céntimos.', ans: [m * c], datos: [`${m} metros`, `${c} céntimos el metro`], ops: [`${m} × ${c} = ${m * c}`] }; },
    (r, k) => { const t = ri(r, 210, 290), a = ri(r, 60, 95), b = ri(r, 50, 85);
      return { e: '👴', t: `Un abuelo reparte ${t} € entre sus tres nietos. Al primero le da ${a} €, al segundo ${b} € y al tercero el resto. ¿Cuánto recibe el tercero?`, res: 'El tercero recibe {} euros.', ans: [t - a - b], datos: [`Total: ${t} €`, `1.º: ${a} €`, `2.º: ${b} €`], ops: [`${a} + ${b} = ${a + b}`, `${t} − ${a + b} = ${t - a - b}`] }; },
    (r, k) => { const v = ri(r, 15, 30), q = ri(r, 60, 110);
      return { e: '🐑', t: `Para transportar ${N(v * q)} ovejas se han usado ${v} vagones de tren con las mismas ovejas en cada uno. ¿Cuántas ovejas van en cada vagón?`, res: 'En cada vagón van {} ovejas.', ans: [q], datos: [`${N(v * q)} ovejas`, `${v} vagones`], ops: [`${N(v * q)} : ${v} = ${q}`] }; },
    (r, k) => { const c = ri(r, 25, 60), q = ri(r, 18, 40), s = ri(r, 1, c - 1);
      return { e: '📌', t: `Se reparten ${N(c * q + s)} chinchetas entre ${c} cajas. ¿Cuántas chinchetas se ponen en cada caja? ¿Cuántas sobran?`, res: 'En cada caja {} chinchetas y sobran {}.', ans: [q, s], datos: [`${N(c * q + s)} chinchetas`, `${c} cajas`], ops: [`${N(c * q + s)} : ${c} = ${q}, resto ${s}`] }; },
    (r, k) => { const [x, y] = two(r), j = ri(r, 18, 30), m = ri(r, 5, 12), f = ri(r, 5, 15);
      return { e: '🎂', t: `${x} tiene ${m} años menos que ${y}. Si ${y} tiene ${j} años, ¿qué edad tendrá ${x} dentro de ${f} años?`, res: `${x} tendrá {} años.`, ans: [j - m + f], datos: [`${y}: ${j} años`, `${x}: ${m} menos`, `Dentro de ${f} años`], ops: [`${j} − ${m} = ${j - m}`, `${j - m} + ${f} = ${j - m + f}`] }; },
    (r, k) => { const [x] = two(r), q = pick(r, [[3, 4, 'las tres cuartas partes'], [1, 2, 'la mitad'], [2, 5, 'las dos quintas partes'], [1, 4, 'la cuarta parte']]), u = ri(r, 4, 10), t = u * q[1];
      return { e: '👕', t: `${x} tenía ${t} euros y gastó ${q[2]} (${q[0]}/${q[1]}) en una camiseta. ¿Cuánto le costó la camiseta y cuánto le sobró?`, res: 'Le costó {} euros y le sobraron {} euros.', ans: [u * q[0], t - u * q[0]], datos: [`Tenía ${t} €`, `Gasta ${q[0]}/${q[1]}`], ops: [`${t} : ${q[1]} = ${u}`, `${u} × ${q[0]} = ${u * q[0]}`, `${t} − ${u * q[0]} = ${t - u * q[0]}`] }; },
    (r, k) => { const n = ri(r, 150, 260), c = ri(r, 3, 6), v = c + ri(r, 2, 4);
      return { e: '📚', t: `Un librero ha comprado ${n} libros a ${c} € cada uno y los vende a ${v} € la unidad. ¿Cuánto dinero gana?`, res: 'Gana {} euros.', ans: [n * (v - c)], datos: [`${n} libros`, `Compra a ${c} €`, `Vende a ${v} €`], ops: [`${v} − ${c} = ${v - c} € por libro`, `${n} × ${v - c} = ${n * (v - c)}`] }; },
    (r, k) => { const f = ri(r, 12, 25), s = ri(r, 14, 26);
      return { e: '🪑', t: `En el salón de actos han colocado ${f} filas con ${s} sillas en cada fila. ¿Cuántas sillas se han colocado?`, res: 'Se han colocado {} sillas.', ans: [f * s], datos: [`${f} filas`, `${s} sillas por fila`], ops: [`${f} × ${s} = ${f * s}`] }; },
    (r, k) => { const n = ri(r, 2, 4), c = ri(r, 25, 45), pay = 2;
      return { e: '🥖', t: `Álvaro compra ${n} barras de pan a ${c} céntimos cada una y paga con una moneda de 2 euros. ¿Cuántos céntimos le devuelven?`, res: 'Le devuelven {} céntimos.', ans: [200 - n * c], datos: [`${n} barras de ${c} cént.`, '2 € = 200 céntimos'], ops: [`${n} × ${c} = ${n * c}`, `200 − ${n * c} = ${200 - n * c}`] }; },
    (r, k) => { const L = ri(r, 25, 45), q = ri(r, 30, 60);
      return { e: '🪙', t: `Alí Babá reparte ${N(L * q)} monedas a partes iguales entre sus ${L} ladrones. ¿Cuántas monedas le tocan a cada uno?`, res: 'A cada uno le tocan {} monedas.', ans: [q], datos: [`${N(L * q)} monedas`, `${L} ladrones`], ops: [`${N(L * q)} : ${L} = ${q}`] }; },
    (r, k) => { const c1 = ri(r, 10, 20), k1 = ri(r, 12, 20), c2 = ri(r, 15, 25), k2 = ri(r, 15, 25);
      return { e: '🍑', t: `Una furgoneta lleva ${c1} cajas de ciruelas de ${k1} kilos cada una y ${c2} cajas de melocotones de ${k2} kilos cada una. ¿Cuántos kilos de fruta transporta?`, res: 'Transporta {} kg.', ans: [c1 * k1 + c2 * k2], datos: [`${c1} cajas de ${k1} kg`, `${c2} cajas de ${k2} kg`], ops: [`${c1} × ${k1} = ${c1 * k1}`, `${c2} × ${k2} = ${c2 * k2}`, `${c1 * k1} + ${c2 * k2} = ${c1 * k1 + c2 * k2}`] }; },
    (r, k) => { const n = ri(r, 3, 8), cm = pick(r, [50, 60, 75, 80, 90]), L = Math.ceil(n * cm / 100) + ri(r, 2, 6);
      return { e: '🪢', t: `De un rollo de cuerda de ${L} metros se cortan ${n} trozos de ${cm} centímetros cada uno. ¿Cuántos centímetros de cuerda quedan?`, res: 'Quedan {} centímetros.', ans: [L * 100 - n * cm], datos: [`Rollo: ${L} m = ${L * 100} cm`, `${n} trozos de ${cm} cm`], ops: [`${n} × ${cm} = ${n * cm}`, `${L * 100} − ${n * cm} = ${L * 100 - n * cm}`] }; },
    (r, k) => { const t = pick(r, [12, 16, 20, 24, 28, 32]), q = pick(r, [[3, 4], [1, 4], [1, 2]]);
      return { e: '🍫', t: `Juan se ha comido ${q[0]}/${q[1]} de los bombones de una caja de ${t}. ¿Cuántos bombones ha dejado sin comer?`, res: 'Ha dejado {} bombones.', ans: [t - t / q[1] * q[0]], datos: [`Caja de ${t}`, `Come ${q[0]}/${q[1]}`], ops: [`${t} : ${q[1]} = ${t / q[1]}`, `${t / q[1]} × ${q[0]} = ${t / q[1] * q[0]}`, `${t} − ${t / q[1] * q[0]} = ${t - t / q[1] * q[0]}`] }; },
    (r, k) => { const a = ri(r, 80, 99), b = ri(r, 90, 115), p = ri(r, 6, 10), pl = pick(r, [48, 52, 55]);
      const tot = a + b + p, bus = Math.ceil(tot / pl);
      return { e: '🚌', t: `Los ${a} chicos y ${b} chicas del colegio van de excursión con ${p} profesores. ¿Cuántos autocares de ${pl} plazas necesitan?`, res: 'Necesitan {} autocares.', ans: [bus], datos: [`${a} + ${b} alumnos`, `${p} profesores`, `${pl} plazas por autocar`], ops: [`${a} + ${b} + ${p} = ${tot}`, `${tot} : ${pl} = ${Math.floor(tot / pl)}, resto ${tot % pl} → ${bus} autocares`] }; },
    (r, k) => { const f = ri(r, 60, 80), o = ri(r, 40, 55), d = ri(r, 4, 7);
      return { e: '🚗', t: `Alquilar un coche cuesta ${f} euros el primer día y ${o} euros cada uno de los días siguientes. Ángela lo alquila ${d} días. ¿Cuánto paga?`, res: 'Paga {} euros.', ans: [f + (d - 1) * o], datos: [`1.er día: ${f} €`, `Resto: ${o} €/día`, `${d} días`], ops: [`${d} − 1 = ${d - 1}`, `${d - 1} × ${o} = ${(d - 1) * o}`, `${f} + ${(d - 1) * o} = ${f + (d - 1) * o}`] }; },
    (r, k) => { const L = ri(r, 4, 12) * 36, c = pick(r, [24, 30, 36, 40]);
      const tot = c * ri(r, 4, 8);
      return { e: '🚴', t: `Una carrera ciclista de ${tot} km se hace en un circuito de ${c} km. ¿Cuántas vueltas deben dar los corredores?`, res: 'Deben dar {} vueltas.', ans: [tot / c], datos: [`Carrera: ${tot} km`, `Circuito: ${c} km`], ops: [`${tot} : ${c} = ${tot / c}`] }; },
    (r, k) => { const d = ri(r, 8, 20), m = ri(r, 3, 9);
      return { e: '🥚', t: `¿Cuántos huevos son ${d} docenas y ${m} medias docenas?`, res: 'Son {} huevos.', ans: [d * 12 + m * 6], datos: ['1 docena = 12', 'Media docena = 6'], ops: [`${d} × 12 = ${d * 12}`, `${m} × 6 = ${m * 6}`, `${d * 12} + ${m * 6} = ${d * 12 + m * 6}`] }; },
    (r, k) => { const cs = pick(r, [[1.25, '1 € y 25 céntimos'], [1.5, '1 € y 50 céntimos'], [2.2, '2 € y 20 céntimos'], [0.75, '75 céntimos']]);
      return { e: '👫', t: `Mario tiene ${cs[1]} y su hermana tiene el triple. ¿Cuánto dinero tienen entre los dos?`, res: 'Entre los dos tienen {} euros.', ans: [rnd(cs[0] * 4, 2)], datos: [`Mario: ${E(cs[0])}`, 'Hermana: el triple'], ops: [`${N(cs[0])} × 3 = ${N(rnd(cs[0] * 3, 2))}`, `${N(cs[0])} + ${N(rnd(cs[0] * 3, 2))} = ${N(rnd(cs[0] * 4, 2))}`] }; },
    (r, k) => { const f = ri(r, 18, 30), q = ri(r, 25, 45);
      return { e: '🎬', t: `Una sala de cine tiene ${f * q} butacas. Si hay ${f} asientos en cada fila, ¿cuántas filas tiene el cine?`, res: 'Tiene {} filas.', ans: [q], datos: [`${f * q} butacas`, `${f} por fila`], ops: [`${f * q} : ${f} = ${q}`] }; },
    (r, k) => { const h = ri(r, 30, 80), p = ri(r, 10, 14), half = h * p / 2;
      return { e: '🐝', t: `Un apicultor tiene ${h} colmenas con ${p} panales cada una. Si de cada panal saca medio kilo de miel, ¿cuántos kilos obtiene?`, res: 'Obtiene {} kilos.', ans: [half], datos: [`${h} colmenas`, `${p} panales cada una`, 'Medio kilo por panal'], ops: [`${h} × ${p} = ${h * p} panales`, `${h * p} : 2 = ${N(half)}`] }; },
    (r, k) => { const c = ri(r, 12, 30), tot = c * 3;
      return { e: '👖', t: `Un pantalón cuesta el doble que una camisa y por los dos hemos pagado ${tot} euros. ¿Cuánto cuesta el pantalón? ¿Y la camisa?`, res: 'El pantalón cuesta {} euros y la camisa {} euros.', ans: [2 * c, c], datos: [`Total: ${tot} €`, 'Pantalón = 2 camisas'], ops: [`Pantalón + camisa = 3 camisas`, `${tot} : 3 = ${c} (camisa)`, `${c} × 2 = ${2 * c} (pantalón)`] }; },
    (r, k) => { const v = pick(r, [150, 180, 200, 250]), m = pick(r, [15, 20, 30]);
      return { e: '🏃', t: `Una corredora avanza ${v} metros por minuto. ¿Qué distancia recorre en ${m === 15 ? 'un cuarto de hora' : m === 30 ? 'media hora' : '20 minutos'}?`, res: 'Recorre {} metros.', ans: [v * m], datos: [`${v} m por minuto`, `${m} minutos`], ops: [`${v} × ${m} = ${N(v * m)}`] }; },
  ];

  /* ───────────── 5.º: decimales, fracciones, porcentajes sencillos, medias, áreas y unidades ───────────── */
  B[5] = [
    (r, k) => { const p = rnd(ri(r, 120, 480) / 100, 2), kg = pick(r, [1.5, 2.5, 3, 3.5]);
      return { e: '🍈', t: `Un melón se vende a ${E(p)} el kilo. ¿Cuánto se paga por un melón de ${N(kg)} kg?`, res: 'Se pagan {} euros.', ans: [rnd(p * kg, 2)], datos: [`${E(p)} el kilo`, `${N(kg)} kg`], ops: [`${N(p)} × ${N(kg)} = ${N(rnd(p * kg, 2))}`] }; },
    (r, k) => { const t = ri(r, 4, 9) * 20, f = pick(r, [[1, 4], [3, 5], [2, 5], [3, 10], [1, 10]]);
      return { e: '🐑', t: `${f[0] === 1 ? 'La' : 'Los'} ${f[0]}/${f[1]} de las ${t} ovejas de un rebaño son negras. ¿Cuántas ovejas son blancas?`, res: 'Son blancas {} ovejas.', ans: [t - t / f[1] * f[0]], datos: [`${t} ovejas`, `Negras: ${f[0]}/${f[1]}`], ops: [`${t} : ${f[1]} × ${f[0]} = ${t / f[1] * f[0]}`, `${t} − ${t / f[1] * f[0]} = ${t - t / f[1] * f[0]}`] }; },
    (r, k) => { const p = ri(r, 4, 16) * 10, pc = pick(r, [10, 20, 25, 50]);
      return { e: '🏷️', t: `Una mochila cuesta ${p} € y tiene un descuento del ${pc} %. ¿Cuánto hay que pagar?`, res: 'Hay que pagar {} euros.', ans: [p - p * pc / 100], datos: [`Precio: ${p} €`, `Descuento: ${pc} %`], ops: [`${pc} % de ${p} = ${N(p * pc / 100)}`, `${p} − ${N(p * pc / 100)} = ${N(p - p * pc / 100)}`] }; },
    (r, k) => { const n = [ri(r, 5, 9), ri(r, 4, 9), ri(r, 6, 10)]; n.push(ri(r, 5, 9)); const s = n.reduce((a, b) => a + b, 0); const extra = (4 - s % 4) % 4; n[3] += extra > 0 && n[3] + extra <= 10 ? extra : 0;
      const S = n.reduce((a, b) => a + b, 0);
      return { e: '📝', t: `Las notas de ${pick(r, NAMES)} en cuatro exámenes han sido ${n.join(', ')}. ¿Cuál es su nota media?`, res: 'La nota media es {}.', ans: [rnd(S / 4, 2)], datos: [`Notas: ${n.join(', ')}`], ops: [`${n.join(' + ')} = ${S}`, `${S} : 4 = ${N(rnd(S / 4, 2))}`] }; },
    (r, k) => { const l = ri(r, 6, 25), a = ri(r, 4, 18);
      return { e: '🟫', t: `Un salón rectangular mide ${l} m de largo y ${a} m de ancho. ¿Cuántos metros cuadrados de suelo tiene?`, res: 'Tiene {} m².', ans: [l * a], datos: [`Largo: ${l} m`, `Ancho: ${a} m`], ops: [`${l} × ${a} = ${l * a}`] }; },
    (r, k) => { const l = ri(r, 12, 40), a = ri(r, 8, 25);
      return { e: '⚽', t: `Un campo rectangular mide ${l} m de largo y ${a} m de ancho. ¿Cuántos metros tiene la valla que lo rodea?`, res: 'La valla mide {} metros.', ans: [2 * (l + a)], datos: [`Largo: ${l} m`, `Ancho: ${a} m`], ops: [`${l} + ${a} = ${l + a}`, `${l + a} × 2 = ${2 * (l + a)}`] }; },
    (r, k) => { const c = pick(r, [2240, 1850, 3125, 2600, 4500]), v = ri(r, 8, 25);
      return { e: '🚴', t: `Un ciclista ha dado ${v} vueltas a un circuito de ${N(c)} metros. ¿Cuántos kilómetros ha recorrido?`, res: 'Ha recorrido {} km.', ans: [rnd(c * v / 1000, 3)], datos: [`${v} vueltas`, `${N(c)} m cada vuelta`, '1 km = 1.000 m'], ops: [`${v} × ${N(c)} = ${N(c * v)} m`, `${N(c * v)} : 1.000 = ${N(rnd(c * v / 1000, 3), 3)} km`] }; },
    (r, k) => { const m = pick(r, [2, 3, 4]), pm = ri(r, 75, 225) / 50, p = rnd(pm * m, 2), ans = rnd(pm * (m - 0.5), 2);   // precio por metro con céntimos pares: medio metro es exacto
      return { e: '🧵', t: `Sofía compra ${m} metros de tela por ${E(p)}. Gasta medio metro en una cometa y el resto en un disfraz. ¿Cuánto ha costado la tela del disfraz?`, res: 'Ha costado {} euros.', ans: [ans], datos: [`${m} m por ${E(p)}`, 'Cometa: 0,5 m', `Disfraz: ${N(m - 0.5)} m`], ops: [`${N(p)} : ${m} = ${N(pm)} € el metro`, `${N(m - 0.5)} × ${N(pm)} = ${N(ans)}`] }; },
    (r, k) => { const L = ri(r, 150, 400), t = pick(r, [5, 6, 8]), pr = ri(r, 8, 15), n = Math.ceil(L / t);
      return { e: '🚰', t: `Para llevar agua a un depósito que está a ${L} metros se usan tubos de ${t} metros. Cada tubo cuesta ${pr} €. ¿Cuántos tubos hacen falta y cuánto cuesta la instalación?`, res: 'Hacen falta {} tubos y cuesta {} euros.', ans: [n, n * pr], datos: [`Distancia: ${L} m`, `Tubos de ${t} m`, `${pr} € cada tubo`], ops: [`${L} : ${t} = ${Math.floor(L / t)}, resto ${L % t}${L % t ? ` → ${n} tubos` : ''}`, `${n} × ${pr} = ${n * pr}`] }; },
    (r, k) => { const q = ri(r, 30, 80), m = ri(r, 25, 80);
      return { e: '🚿', t: `Un grifo echa ${q} litros de agua por minuto. ¿Cuántos minutos tarda en llenar un depósito de ${N(q * m)} litros?`, res: 'Tarda {} minutos.', ans: [m], datos: [`${q} l por minuto`, `Depósito: ${N(q * m)} l`], ops: [`${N(q * m)} : ${q} = ${m}`] }; },
    (r, k) => { const g = ri(r, 300, 600), p = ri(r, 3, 6), d = 30;
      return { e: '🍞', t: `Una familia come ${g} g de pan cada día. ¿Cuántos kilos de pan come en un mes de 30 días?`, res: 'Come {} kg.', ans: [rnd(g * d / 1000, 3)], datos: [`${g} g al día`, '30 días', '1 kg = 1.000 g'], ops: [`${g} × 30 = ${N(g * 30)} g`, `${N(g * 30)} : 1.000 = ${N(rnd(g * d / 1000, 3), 3)} kg`] }; },
    (r, k) => { const v = rnd(ri(r, 150, 240) / 100, 2), w = rnd(v + ri(r, 15, 70) / 100, 2);
      return { e: '🤸', t: `Carlos salta ${N(v)} m y Pedro salta ${N(w)} m. ¿Cuántos metros salta Pedro más que Carlos?`, res: 'Salta {} m más.', ans: [rnd(w - v, 2)], datos: [`Carlos: ${N(v)} m`, `Pedro: ${N(w)} m`], ops: [`${N(w)} − ${N(v)} = ${N(rnd(w - v, 2))}`] }; },
    (r, k) => { const t = ri(r, 600, 900), i = ri(r, 100, 250), m = pick(r, [12, 18, 24]), rest = t - i - ((t - i) % m);
      const T = i + rest;
      return { e: '🧺', t: `Una familia compra una lavadora de ${T} €. Paga ${i} € al principio y el resto en ${m} meses iguales. ¿Cuánto paga cada mes?`, res: 'Paga {} euros al mes.', ans: [rest / m], datos: [`Precio: ${T} €`, `Entrada: ${i} €`, `${m} meses`], ops: [`${T} − ${i} = ${rest}`, `${rest} : ${m} = ${rest / m}`] }; },
  ];

  /* ───────────── 6.º: porcentajes, proporcionalidad, velocidad, áreas, volumen, negativos, escalas ───────────── */
  B[6] = [
    (r, k) => { const p = ri(r, 4, 30) * 10, iva = 21;
      return { e: '🧾', t: `Un patinete cuesta ${p} € sin IVA. Si el IVA es del ${iva} %, ¿cuánto cuesta con IVA?`, res: 'Cuesta {} euros.', ans: [rnd(p * 1.21, 2)], datos: [`Precio: ${p} €`, `IVA: ${iva} %`], ops: [`${iva} % de ${p} = ${N(rnd(p * 0.21, 2))}`, `${p} + ${N(rnd(p * 0.21, 2))} = ${N(rnd(p * 1.21, 2))}`] }; },
    (r, k) => { const n = ri(r, 3, 6), c = ri(r, 2, 9) * n, m = ri(r, 7, 15);
      return { e: '🍎', t: `${n} kg de manzanas cuestan ${c} €. ¿Cuánto costarán ${m} kg?`, res: 'Costarán {} euros.', ans: [c / n * m], datos: [`${n} kg → ${c} €`, `${m} kg → ?`], ops: [`${c} : ${n} = ${c / n} € el kilo`, `${c / n} × ${m} = ${c / n * m}`] }; },
    (r, k) => { const v = ri(r, 6, 12) * 10, h = pick(r, [1.5, 2, 2.5, 3, 4]);
      return { e: '🚗', t: `Un coche va a ${v} km/h. ¿Cuántos kilómetros recorre en ${N(h)} horas?`, res: 'Recorre {} km.', ans: [v * h], datos: [`Velocidad: ${v} km/h`, `Tiempo: ${N(h)} h`], ops: [`${v} × ${N(h)} = ${N(v * h)}`] }; },
    (r, k) => { const b = ri(r, 6, 20), h = ri(r, 4, 16) * 2;
      return { e: '🔺', t: `Una vela triangular tiene ${b} m de base y ${h} m de altura. ¿Cuál es su área?`, res: 'Su área es {} m².', ans: [b * h / 2], datos: [`Base: ${b} m`, `Altura: ${h} m`, 'Área = base × altura : 2'], ops: [`${b} × ${h} = ${b * h}`, `${b * h} : 2 = ${b * h / 2}`] }; },
    (r, k) => { const rr = ri(r, 2, 10);
      return { e: '⭕', t: `Una mesa redonda tiene ${rr} decímetros de radio. ¿Cuál es su área? (usa π = 3,14)`, res: 'Su área es {} dm².', ans: [rnd(3.14 * rr * rr, 2)], datos: [`Radio: ${rr} dm`, 'Área = π × r × r'], ops: [`${rr} × ${rr} = ${rr * rr}`, `3,14 × ${rr * rr} = ${N(rnd(3.14 * rr * rr, 2))}`] }; },
    (r, k) => { const a = ri(r, 2, 8), b = ri(r, 2, 6), c = ri(r, 2, 5);
      return { e: '📦', t: `Una caja mide ${a} dm de largo, ${b} dm de ancho y ${c} dm de alto. ¿Cuál es su volumen? ¿Cuántos litros caben? (1 dm³ = 1 l)`, res: 'Su volumen es {} dm³ y caben {} litros.', ans: [a * b * c, a * b * c], datos: [`${a} × ${b} × ${c} dm`, '1 dm³ = 1 litro'], ops: [`${a} × ${b} × ${c} = ${a * b * c}`] }; },
    (r, k) => { const m = ri(r, 2, 9), n = ri(r, 3, 12);
      return { e: '🌡️', t: `Por la mañana el termómetro marcaba −${m} °C y a mediodía la temperatura subió ${n} grados. ¿Qué temperatura marcaba a mediodía?`, res: 'Marcaba {} °C.', ans: [n - m], datos: [`Mañana: −${m} °C`, `Sube ${n} °C`], ops: [`−${m} + ${n} = ${N(n - m)}`] }; },
    (r, k) => { const e = pick(r, [10000, 50000, 100000, 200000]), cm = ri(r, 3, 15);
      return { e: '🗺️', t: `En un mapa a escala 1:${N(e)}, dos pueblos están a ${cm} cm. ¿Cuántos kilómetros hay en la realidad?`, res: 'Hay {} km.', ans: [cm * e / 100000], datos: [`Escala 1:${N(e)}`, `${cm} cm en el mapa`, '1 km = 100.000 cm'], ops: [`${cm} × ${N(e)} = ${N(cm * e)} cm`, `${N(cm * e)} : 100.000 = ${N(cm * e / 100000)} km`] }; },
    (r, k) => { const t = ri(r, 20, 30) * 5, pc = pick(r, [20, 40, 60, 80]);
      return { e: '🎒', t: `En un colegio hay ${t} alumnos y el ${pc} % va al comedor. ¿Cuántos alumnos NO van al comedor?`, res: 'No van {} alumnos.', ans: [t - t * pc / 100], datos: [`${t} alumnos`, `${pc} % al comedor`], ops: [`${pc} % de ${t} = ${t * pc / 100}`, `${t} − ${t * pc / 100} = ${t - t * pc / 100}`] }; },
    (r, k) => { const s = ri(r, 2, 6) * 1000, i = pick(r, [2, 3, 4, 5]), y = ri(r, 1, 3);
      return { e: '🏦', t: `Se guardan ${N(s)} € en el banco al ${i} % anual. ¿Cuántos euros de interés se ganan en ${y} ${y === 1 ? 'año' : 'años'}?`, res: 'Se ganan {} euros.', ans: [s * i / 100 * y], datos: [`Capital: ${N(s)} €`, `${i} % al año`, `${y} ${y === 1 ? 'año' : 'años'}`], ops: [`${i} % de ${N(s)} = ${s * i / 100}`, `${s * i / 100} × ${y} = ${s * i / 100 * y}`] }; },
    (r, k) => { const w = ri(r, 3, 8), d = ri(r, 4, 9), w2 = ri(r, 9, 15);
      return { e: '👷', t: `${w} obreros construyen una valla en ${d * w2} días. ¿Cuántos días tardarían ${w2} obreros trabajando al mismo ritmo? (proporción inversa)`, res: 'Tardarían {} días.', ans: [d * w], datos: [`${w} obreros → ${d * w2} días`, `${w2} obreros → ?`], ops: [`${w} × ${d * w2} = ${w * d * w2} días de trabajo`, `${w * d * w2} : ${w2} = ${d * w}`] }; },
    (r, k) => { const t = pick(r, [24, 36, 48, 60]), f1 = pick(r, [[1, 2], [1, 3], [1, 4]]);
      const a = t / f1[1] * f1[0], rest = t - a, d = pick(r, [2, 3].filter((x) => rest % x === 0)), B2 = rest / d;
      return { e: '🍰', t: `De una caja de ${t} pasteles nos comemos ${f1[0]}/${f1[1]} y luego 1/${d} de los que quedan. ¿Cuántos pasteles quedan en la caja?`, res: 'Quedan {} pasteles.', ans: [rest - B2], datos: [`${t} pasteles`, `Primero ${f1[0]}/${f1[1]}`, `Después 1/${d} del resto`], ops: [`${t} : ${f1[1]} = ${a}`, `${t} − ${a} = ${rest}`, `${rest} : ${d} = ${B2}`, `${rest} − ${B2} = ${rest - B2}`] }; },
    (r, k) => { const v = pick(r, [60, 80, 120]), tot = ri(r, 2, 12) * 15, D = v * tot / 60;
      return { e: '🚆', t: `Un tren recorre ${N(D)} km a ${v} km/h. ¿Cuántos minutos tarda?`, res: 'Tarda {} minutos.', ans: [tot], datos: [`Distancia: ${N(D)} km`, `Velocidad: ${v} km/h`], ops: [`${N(D)} : ${v} = ${N(rnd(D / v, 3), 3)} h`, `${N(rnd(D / v, 3), 3)} × 60 = ${tot} min`] }; },
    (r, k) => { const a = ri(r, 9, 14);
      return { e: '🔢', t: `La suma de dos números consecutivos es ${2 * a + 1} y su producto ${a * (a + 1)}. ¿Cuál es el número menor?`, res: 'El número menor es el {}.', ans: [a], datos: [`Suma: ${2 * a + 1}`, `Producto: ${a * (a + 1)}`], ops: [`${2 * a + 1} − 1 = ${2 * a}`, `${2 * a} : 2 = ${a}`, `${a} × ${a + 1} = ${a * (a + 1)} ✔`] }; },
  ];

  window.PROBLEMAS = { B, N, E, grades: [1, 2, 3, 4, 5, 6] };
})();
