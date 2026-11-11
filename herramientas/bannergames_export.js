// Exporta los retos de los vídeos educativos (educativos/video-retos.html) a bannergames/<pack>.json para el banner.
// Abre la página de cada pack en un Chromium sin ventana, le pide muchas preguntas sueltas (window.__bgExport) y las
// guarda con los textos del banner. Conserva lo que hayas cambiado a mano en el .json (textos, colores, ajustes).
//
// Uso (desde la raíz del repositorio, con el servidor de pruebas en marcha):
//   php -S 127.0.0.1:8080 -t . herramientas/router.php
//   node herramientas/bannergames_export.js [http://127.0.0.1:8080] [preguntas por idioma=80]
// Necesita Node y Playwright (npm i playwright; npx playwright install chromium).
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const BASE = process.argv[2] || 'http://127.0.0.1:8080', COUNT = +(process.argv[3] || 80), SITE = 'educativos.juegosboom.com';
const PACKS = ['secuencias', 'policubos', 'quienfue', 'escondido', 'alien', 'intrusa', 'relampago', 'problemas', 'emojimates', 'calculo', 'balanza', 'ortografia', 'spelling', 'ingles'];
const OUT = path.join(__dirname, '..', 'bannergames');
const T = {
  es: { think: '¡Piensa!', solved: '¿Lo has acertado?', answer: 'Respuesta', cta: 'Juega gratis ▶', later: 'Seguir leyendo', barCta: 'Jugar', close: 'Cerrar', expand: 'Ampliar' },
  en: { think: 'Think!', solved: 'Did you get it?', answer: 'Answer', cta: 'Play free ▶', later: 'Keep reading', barCta: 'Play', close: 'Close', expand: 'Expand' },
};
const merge = (a, b) => { if (Array.isArray(b) || typeof b !== 'object' || b === null) return b === undefined ? a : b; const o = Object.assign({}, a); for (const k in b) o[k] = merge(a ? a[k] : undefined, b[k]); return o; };

(async () => {
  const b = await chromium.launch();
  for (const pk of PACKS) {
    const items = {}, texts = {}; let url = '', wait = 10;
    for (const lang of ['es', 'en']) {
      const p = await b.newPage();
      await p.goto(`${BASE}/educativos/video-retos?pack=${pk}&lang=${lang}&rec=1&site=${SITE}`);
      await p.waitForFunction(() => window.arcadeRec && window.arcadeRec.ready, null, { timeout: 30000 }).catch(() => {});
      const unsupported = await p.evaluate(() => !window.arcadeRec || window.arcadeRec.unsupported).catch(() => true);
      if (!unsupported) {
        const X = await p.evaluate((n) => window.__bgExport(n), COUNT);
        items[lang] = X.items; url = url || X.url; wait = X.wait;
        const brand = X.icon + ' ' + X.title;
        texts[lang] = Object.assign({}, T[lang], { brand, mini: X.title, question: X.question, bar: X.icon + ' ' + (X.teaser || X.question) });
      }
      await p.close();
    }
    if (!Object.keys(items).length) { console.log(pk + ': sin preguntas'); continue; }
    const file = path.join(OUT, pk + '.json'), cur = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const def = { type: 'quiz', url, delay: 3, every_hours: 12, closed_hours: 24, wait, reveal: 4,
      colors: { bg1: '#3b2a7a', bg2: '#140c33', accent: '#7048e8', cta: '#ffd43b', ctaText: '#2b1a0e' }, texts };
    const J = merge(def, cur); delete J.items;
    J.items = items;   // las preguntas siempre se reemplazan
    fs.writeFileSync(file, JSON.stringify(J, null, 1) + '\n');
    console.log(pk + ': ' + Object.entries(items).map(([l, a]) => l + ' ' + a.length).join(', '));
  }
  await b.close();
})();
