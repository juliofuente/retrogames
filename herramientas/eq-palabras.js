// Copia las «palabras pequeñas» de la Fábrica de Frases (WORDS y WPH) a Emoji Quest (educativos/emoji-quest/palabras.js),
// para que los dos juegos usen exactamente el mismo vocabulario, tarjetas y frases.
// Uso: node herramientas/eq-palabras.js   (vuelve a ejecutarlo cada vez que cambies las palabras de la Fábrica)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'educativos/fabrica-frases/index.html'), 'utf8').split('\n');
const grab = (name) => { const l = src.find((x) => new RegExp('^\\s*(const )?' + name + '=').test(x)); if (!l) throw new Error('No encuentro ' + name);
  return eval('(' + l.replace(new RegExp('^\\s*(const )?' + name + '='), '').replace(/;\s*$/, '') + ')'); };
const W = grab('WORDS'), P = grab('WPH');
const out = '/* Generado por herramientas/eq-palabras.js a partir de la Fábrica de Frases: no lo edites a mano.\n' +
  '   W: palabra → {es, use, ex, tip, r, S: [frase con _, traducción, emoji, explicación?, palabras que también valdrían?]}\n' +
  '   P: las fases de la Fábrica (palabras que se presentan juntas; las de repaso no llevan palabras). */\n' +
  'window.EQW = ' + JSON.stringify({ W, P }) + ';\n';
fs.writeFileSync(path.join(root, 'educativos/emoji-quest/palabras.js'), out);
console.log(Object.keys(W).length, 'palabras,', Object.values(W).reduce((a, w) => a + w.S.length, 0), 'frases,', P.length, 'fases');
