// Llista els textos de la interfície (t('…')) que encara no tenen traducció a cada idioma,
// i les traduccions que ja no es fan servir. Ús: npm run i18n

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import es from '../src/i18n/es.ts';
import en from '../src/i18n/en.ts';

const fitxers = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const c = join(d, f);
    if (statSync(c).isDirectory()) return f === 'i18n' || f === 'demo' ? [] : fitxers(c);
    return /\.tsx?$/.test(f) ? [c] : [];
  });

// Literals dins de t(): «t('…')» o «t("…")» (amb escapaments JSON/JS habituals).
const RE = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
const usades = new Set<string>();
for (const f of fitxers('src')) {
  const codi = readFileSync(f, 'utf8');
  for (const m of codi.matchAll(RE)) {
    const literal = m[1] === '"' ? m[2] : m[2].replace(/\\'/g, "'").replace(/"/g, '\\"');
    usades.add(JSON.parse(`"${literal}"`));
  }
}

let errors = 0;
for (const [nom, dic] of [['castellà', es], ['anglès', en]] as const) {
  const falten = [...usades].filter((k) => !(k in dic));
  const sobren = Object.keys(dic).filter((k) => !usades.has(k));
  console.log(`\n${nom}: ${usades.size - falten.length}/${usades.size} traduïts`);
  if (falten.length) console.log('  Falten:\n' + falten.map((k) => `    ${JSON.stringify(k)}`).join('\n'));
  if (sobren.length) console.log(`  (${sobren.length} traduccions ja no es fan servir)`);
  errors += falten.length;
}
process.exit(errors ? 1 : 0);
