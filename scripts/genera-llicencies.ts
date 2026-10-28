// Genera els textos de llicència i exempció de responsabilitat per als instal·ladors (build/license_*.txt)
// a partir de shared/llicencia.ts (font única, també la fa servir l'assistent de primera configuració).
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { textLlicencia } from '../shared/llicencia.ts';

mkdirSync('build', { recursive: true });
// El DMG del Mac només accepta text en mac_roman (sense BOM i amb la línia separadora en guionets)
// i no admet el català: allà la llicència surt en castellà i anglès (l'assistent inicial la mostra en català).
const mac = process.argv.includes('--sense-bom');
if (mac) rmSync('build/license_ca.txt', { force: true });
for (const idioma of mac ? (['es', 'en'] as const) : (['ca', 'es', 'en'] as const)) {
  // BOM UTF-8 perquè l'instal·lador de Windows mostri bé els accents.
  writeFileSync(`build/license_${idioma}.txt`, `${mac ? '' : '\uFEFF'}${(mac ? textLlicencia(idioma).replace(/\u2500/g, '-') : textLlicencia(idioma)).replace(/\n/g, '\r\n')}`, 'utf8');
}
console.log('Llicències generades a build/.');
