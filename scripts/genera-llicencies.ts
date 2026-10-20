// Genera els textos de llicència i exempció de responsabilitat per als instal·ladors (build/license_*.txt)
// a partir de shared/llicencia.ts (font única, també la fa servir l'assistent de primera configuració).
import { writeFileSync, mkdirSync } from 'node:fs';
import { textLlicencia } from '../shared/llicencia.ts';

mkdirSync('build', { recursive: true });
for (const idioma of ['ca', 'es', 'en'] as const) {
  // BOM UTF-8 perquè l'instal·lador de Windows mostri bé els accents.
  writeFileSync(`build/license_${idioma}.txt`, `\uFEFF${textLlicencia(idioma).replace(/\n/g, '\r\n')}`, 'utf8');
}
console.log('Llicències generades a build/.');
