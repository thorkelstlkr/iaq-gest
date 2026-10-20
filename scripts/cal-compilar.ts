// Ajuda per a Iniciar.bat i Actualitzar.bat: decideix si cal instal·lar dependències o tornar a
// compilar la interfície, i fa una còpia de seguretat quan canvia la versió del programa.
//
//   node scripts/cal-compilar.ts dependencies        → surt amb 1 si cal «npm install»
//   node scripts/cal-compilar.ts desa-dependencies   → recorda el package-lock.json instal·lat
//   node scripts/cal-compilar.ts interficie          → surt amb 1 si cal «npm run build»
//   node scripts/cal-compilar.ts desa-interficie     → recorda els fonts compilats
//   node scripts/cal-compilar.ts copia-versio        → si la versió ha canviat, còpia de la base de dades

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARREL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ruta = (...p: string[]) => join(ARREL, ...p);
const versio = () => (JSON.parse(readFileSync(ruta('package.json'), 'utf8')) as { version: string }).version;
const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

const MARCA_DEPENDENCIES = ruta('node_modules', '.iaraque-lock');
const MARCA_INTERFICIE = ruta('dist', '.compilat');

function firmaDependencies(): string {
  return existsSync(ruta('package-lock.json')) ? hash(readFileSync(ruta('package-lock.json'))) : hash(readFileSync(ruta('package.json')));
}

/** Firma dels fonts de la interfície: camí, mida i data de modificació de cada fitxer, i la versió. */
function firmaInterficie(): string {
  const linies: string[] = [`versio ${versio()}`];
  const recorre = (rel: string) => {
    const abs = ruta(rel);
    if (!existsSync(abs)) return;
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const f of readdirSync(abs).sort()) recorre(join(rel, f));
    } else {
      linies.push(`${rel} ${st.size} ${Math.floor(st.mtimeMs)}`);
    }
  };
  for (const p of ['src', 'shared', 'public', 'index.html', 'vite.config.ts', 'tsconfig.json', 'package.json']) recorre(p);
  return hash(linies.join('\n'));
}

const llegeix = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

async function copiaSiCanviaVersio() {
  const dbPath = resolve(ARREL, process.env.DB_PATH ?? 'data/iaraque.db');
  const marca = join(dirname(dbPath), 'versio.txt');
  const actual = versio();
  const anterior = llegeix(marca);
  if (anterior === actual) return;
  if (existsSync(dbPath)) {
    const { DatabaseSync } = await import('node:sqlite');
    const dir = join(dirname(dbPath), 'copies');
    mkdirSync(dir, { recursive: true });
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const nom = `abans-actualitzar-${anterior || 'anterior'}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.db`;
    const db = new DatabaseSync(dbPath);
    try {
      db.prepare('VACUUM INTO ?').run(join(dir, nom));
    } finally {
      db.close();
    }
    console.log(`Nova versió ${actual}: s'ha fet una còpia de seguretat a ${join(dir, nom)}`);
  }
  mkdirSync(dirname(marca), { recursive: true });
  writeFileSync(marca, actual);
}

const ordre = process.argv[2];
switch (ordre) {
  case 'dependencies':
    process.exit(existsSync(ruta('node_modules')) && llegeix(MARCA_DEPENDENCIES) === firmaDependencies() ? 0 : 1);
  case 'desa-dependencies':
    writeFileSync(MARCA_DEPENDENCIES, firmaDependencies());
    break;
  case 'interficie':
    process.exit(existsSync(ruta('dist', 'index.html')) && llegeix(MARCA_INTERFICIE) === firmaInterficie() ? 0 : 1);
  case 'desa-interficie':
    writeFileSync(MARCA_INTERFICIE, firmaInterficie());
    break;
  case 'copia-versio':
    try {
      await copiaSiCanviaVersio();
    } catch (e) {
      // Una còpia fallida no ha d'impedir obrir el programa (les còpies diàries continuen).
      console.error("No s'ha pogut fer la còpia de seguretat abans d'actualitzar:", e);
    }
    break;
  default:
    console.error('Ús: node scripts/cal-compilar.ts dependencies|desa-dependencies|interficie|desa-interficie|copia-versio');
    process.exit(2);
}
