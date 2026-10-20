// Genera la demostració autònoma en un sol fitxer HTML (dist-demo/iaraque-demo.html):
// crea una base de dades amb dades de prova, compila la interfície en mode demo i ho incrusta tot.

import { execSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-asm.js';
const dbPath = join(tmpdir(), 'iaraque-demo.db');
for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) rmSync(f, { force: true });

const node = `"${process.execPath}" --disable-warning=ExperimentalWarning`;
execSync(`${node} scripts/dades-prova.ts`, { stdio: 'inherit', env: { ...process.env, DB_PATH: dbPath } });

// sql.js no llegeix fitxers en mode WAL: el passem a mode clàssic i compactem.
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = DELETE; VACUUM;');
db.close();

execSync('npx vite build --mode demo', { stdio: 'inherit', env: { ...process.env, DEMO_DB: dbPath } });

const html = readFileSync('dist-demo/index.html', 'utf8');
const asset = (re: RegExp) => {
  const m = html.match(re);
  if (!m) throw new Error(`No s'ha trobat ${re}`);
  return readFileSync(join('dist-demo', m[1]), 'utf8');
};
const js = asset(/<script[^>]*src="\/?([^"]+\.js)"/).replace(/<\/script/gi, '<\\/script');
const css = asset(/<link[^>]*rel="stylesheet"[^>]*href="\/?([^"]+\.css)"/);

const pagina = `<title>I ara qué? · Gestió</title>
<style>
${css}
</style>
<div id="root"></div>
<script src="${SQLJS}"></script>
<script type="module">
${js}
</script>
`;

writeFileSync('dist-demo/iaraque-demo.html', pagina);
rmSync(dbPath, { force: true });
console.log(`Demostració generada: dist-demo/iaraque-demo.html (${Math.round(pagina.length / 1024)} KB)`);
