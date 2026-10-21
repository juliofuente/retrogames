// Monta el libro «Puzles de cerillas» (6×9 pulgadas, para Kindle Create / KDP) a partir de puzzles.json e img/
const fs = require('fs'), path = require('path');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, PageBreak, HeadingLevel, Footer, PageNumber, Table, TableRow, TableCell, WidthType, BorderStyle, LevelFormat } = D;
const DIR = __dirname, P = JSON.parse(fs.readFileSync(path.join(DIR, 'puzzles.json'), 'utf8'));
const img = (f, scale, max = 420) => { const buf = fs.readFileSync(path.join(DIR, f)); const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); const k = Math.min(scale, max / w); return new ImageRun({ type: 'png', data: buf, transformation: { width: Math.round(w * k), height: Math.round(h * k) }, altText: { title: 'cerillas', description: 'Operación hecha con cerillas', name: f } }); };
const pretty = (e) => e.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − ').replace(/\+/g, ' + ').replace(/=/g, ' = ');
const T = (text, o = {}) => new TextRun({ text, ...o });
const para = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [typeof children === 'string' ? T(children) : children], ...o });
const center = (c, o = {}) => para(c, { alignment: AlignmentType.CENTER, ...o });
const brk = () => new Paragraph({ children: [new PageBreak()] });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [T(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T(t)] });
const bullet = (runs) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: runs.map((r) => (typeof r === 'string' ? T(r) : r)), spacing: { after: 80 } });
const B = (t) => T(t, { bold: true });
const verb = (k, n) => { const c = n === 1 ? '1 cerilla' : n + ' cerillas'; return { m: `Mueve ${c}`, r: `Quita ${c}`, a: `Añade ${c}` }[k]; };
const goal = 'para que la cuenta sea correcta.';
const LEVELS = [
  ['Nivel 1 · Para calentar', 'Retos sencillos para coger el truco. La mayoría se resuelven cambiando un solo número.', 0, 67],
  ['Nivel 2 · Cogiendo práctica', 'Aquí ya hay que mirar toda la operación: a veces cambia el resultado y a veces uno de los números de la izquierda.', 67, 134],
  ['Nivel 3 · Para pensar', 'Llegan los retos de dos cerillas. Prueba primero en tu cabeza qué números pueden convertirse en cuáles.', 134, 201],
  ['Nivel 4 · Para expertos', 'Los más difíciles del libro: dos, tres y hasta cuatro cerillas. ¡Paciencia y lápiz!', 201, P.length],
];

const kids = [];
// ---------- portada interior ----------
kids.push(center(T(''), { spacing: { before: 1800 } }));
kids.push(center(T('PUZLES DE CERILLAS', { bold: true, size: 56 }), { spacing: { after: 200 } }));
kids.push(center(T(`${P.length} retos de lógica e ingenio`, { size: 30 }), { spacing: { after: 120 } }));
kids.push(center(T('Mueve, quita o añade cerillas para que las cuentas salgan bien', { italics: true, size: 24 }), { spacing: { after: 600 } }));
kids.push(center(img('img/ej.png', 0.38)));
kids.push(center(T('Con soluciones al final', { size: 22 }), { spacing: { before: 600 } }));
// ---------- créditos ----------
kids.push(brk());
kids.push(para(T(''), { spacing: { before: 5000 } }));
kids.push(para(T('Puzles de cerillas', { bold: true })));
kids.push(para(`${P.length} retos de lógica e ingenio. Edición en español.`));
kids.push(para(`© ${new Date().getFullYear()}. Todos los derechos reservados.`, { spacing: { before: 200 } }));
kids.push(para('Ninguna parte de este libro puede reproducirse sin permiso por escrito, salvo citas breves en reseñas.'));
kids.push(para('Puedes jugar a estos retos en juegosboom.com.', { spacing: { before: 200 } }));

// ---------- cómo se juega ----------
kids.push(H1('Cómo se juega'));
kids.push(para('Cada reto es una operación hecha con cerillas, como los números de un reloj digital. Tal como está, la cuenta está MAL. Tu misión es arreglarla tocando solo las cerillas que dice el enunciado.', { spacing: { after: 160 } }));
kids.push(bullet([B('Mueve: '), 'coges cerillas y las pones en otro sitio. Al final hay las mismas cerillas que al principio.']));
kids.push(bullet([B('Quita: '), 'retiras cerillas y ya no vuelven.']));
kids.push(bullet([B('Añade: '), 'pones cerillas nuevas donde quieras.']));
kids.push(bullet(['Solo se tocan las cerillas de los ', B('números'), '. Los signos (+, −, ×, ÷, =) se quedan como están.']));
kids.push(bullet(['Al terminar, todos los números tienen que estar bien formados y la cuenta tiene que ser correcta.']));
kids.push(bullet(['Algunos retos tienen más de una solución. En las soluciones las verás todas.']));
kids.push(H2('Un ejemplo'));
kids.push(para([B('Mueve 1 cerilla '), T(goal)]));
kids.push(center(img('img/ej.png', 0.2), { spacing: { before: 80, after: 80 } }));
kids.push(para('7 + 7 no es 9. Pero si quitamos la cerilla de arriba del primer 7, se convierte en 1. Y si ponemos esa misma cerilla abajo a la izquierda del 9, se convierte en 8:'));
kids.push(center(img('img/ejs.png', 0.2), { spacing: { before: 80, after: 80 } }));
kids.push(center(T('1 + 7 = 8  ✔', { bold: true, size: 28 })));

// ---------- chuleta ----------
kids.push(H1('Chuleta: los números con cerillas'));
kids.push(para('Así se escribe cada número y cuántas cerillas necesita. Tenla a mano: es la clave de todos los retos.', { spacing: { after: 200 } }));
const COUNT = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6];
const cell = (d) => new TableCell({ width: { size: 1296, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
  children: [center(img(`img/d${d}.png`, 0.14)), center(T(`${d}`, { bold: true, size: 26 })), center(T(`${COUNT[d]} cerillas`, { size: 18 }), { spacing: { after: 100 } })] });
kids.push(new Table({ width: { size: 6480, type: WidthType.DXA }, columnWidths: [1296, 1296, 1296, 1296, 1296], rows: [0, 5].map((s) => new TableRow({ children: [0, 1, 2, 3, 4].map((k) => cell(s + k)) })) }));
kids.push(H2('Trucos de experto'));
kids.push(para([B('Con una cerilla MÁS: '), T('1 → 7 · 3 → 9 · 5 → 6 · 5 → 9 · 6 → 8 · 9 → 8 · 0 → 8')], { spacing: { after: 100 } }));
kids.push(para([B('Con una cerilla MENOS: '), T('7 → 1 · 8 → 0, 6 o 9 · 9 → 3 o 5 · 6 → 5')], { spacing: { after: 100 } }));
kids.push(para([B('Moviendo una cerilla dentro del mismo número: '), T('0 ↔ 6 ↔ 9 · 2 ↔ 3 · 3 ↔ 5')], { spacing: { after: 160 } }));
kids.push(bullet(['Empieza mirando el resultado: muchas veces es el número que hay que cambiar.']));
kids.push(bullet(['Si tienes que mover, piensa a la vez en un número que pierde una cerilla y otro que la gana.']));
kids.push(bullet(['Los números de dos cifras también cuentan: un 17 puede convertirse en 11 o en 77.']));
kids.push(bullet(['Usa lápiz: tacha las cerillas que quitas y dibuja las que pones.']));

// ---------- retos ----------
let n = 0;
for (const [title, intro, a, b] of LEVELS) {
  kids.push(H1(title));
  kids.push(para(intro, { spacing: { after: 200 } }));
  kids.push(para(`Retos ${a + 1} a ${b}.`, { spacing: { after: 200 } }));
  for (let i = a; i < b; i++) {
    const p = P[i]; n = i + 1;
    if ((i - a) % 3 === 0) kids.push(brk());
    kids.push(para([T(`Reto ${n}`, { bold: true, size: 30 })], { spacing: { before: (i - a) % 3 ? 300 : 0, after: 40 }, keepNext: true }));
    kids.push(para([B(verb(p.kind, p.n) + ' '), T(goal)], { keepNext: true, spacing: { after: 160 } }));
    kids.push(center(img(p.img, 0.33), { keepNext: true, spacing: { after: 120 } }));
    kids.push(para(T('Tu respuesta: ________________________________', { color: '555555' }), { spacing: { after: 60 } }));
    kids.push(para(T(`Solución: reto ${n}, al final del libro.`, { italics: true, size: 18, color: '777777' })));
  }
}

// ---------- soluciones ----------
kids.push(H1('Soluciones'));
kids.push(para('En negro, las cerillas que se mueven o se añaden. En línea de puntos, las que se quitan.', { spacing: { after: 200 } }));
P.forEach((p, i) => {
  kids.push(para([T(`Reto ${i + 1}`, { bold: true }), T(`  ·  ${verb(p.kind, p.n)}`)], { keepNext: true, spacing: { before: 200, after: 40 } }));
  kids.push(para([T(pretty(p.eq), { strike: true, color: '777777' }), T('   →   '), T(pretty(p.sols[0]), { bold: true })], { keepNext: true, spacing: { after: 60 } }));
  kids.push(center(img(p.simg, 0.24), { keepNext: p.sols.length > 1 }));
  if (p.sols.length > 1) kids.push(para(T((p.sols.length === 2 ? 'También vale: ' : 'Otras soluciones: ') + p.sols.slice(1).map(pretty).join('   ·   '), { size: 18, italics: true }), { spacing: { after: 80 } }));
});

// ---------- final ----------
kids.push(H1('¿Quieres más?'));
kids.push(para('Estos retos también se pueden jugar en el móvil y en el ordenador, con pistas, deshacer y una demo que te enseña cómo se resuelven.', { spacing: { after: 160 } }));
kids.push(para([T('Busca '), B('Cerillas'), T(' en '), B('juegosboom.com'), T(', junto con cientos de juegos gratis más.')]));

const doc = new Document({
  creator: 'Puzles de cerillas', title: 'Puzles de cerillas', description: `${P.length} retos de cerillas con soluciones`,
  styles: {
    default: { document: { run: { font: 'Georgia', size: 23 }, paragraph: { spacing: { after: 100, line: 276, lineRule: 'auto' } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 36, bold: true }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 26, bold: true }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 8640, height: 12960 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080, gutter: 180 } } },
    footers: { default: new Footer({ children: [center([new TextRun({ children: [PageNumber.CURRENT], size: 18 })])] }) },
    children: kids,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(DIR, 'Puzles_de_cerillas.docx'), b); console.log('ok', (b.length / 1e6).toFixed(1) + ' MB'); });
