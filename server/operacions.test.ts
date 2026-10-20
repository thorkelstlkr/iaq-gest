// Proves del mòdul «operacions»: secrets xifrats, còpies de seguretat, errors, sessions i bloqueig.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

const dir = mkdtempSync(join(tmpdir(), 'operacions-'));
process.env.DB_PATH = join(dir, 'prova.db');

const { db, getConfig, setConfig, run, get } = await import('./db.ts');
const secrets = await import('./secrets.ts');
const { seleccionaPerEsborrar, verificaFitxer, ferCopia, llistaCopies, preparaRestauracio, rutaPendent } = await import('./copies.ts');
const { errorHandler, HttpError } = await import('./util.ts');

after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('els secrets es desen xifrats i es llegeixen en clar', () => {
  setConfig('smtp_contrasenya', 'molt-secreta');
  setConfig('xarxa_fb_token', 'EAAB123');
  setConfig('nom', 'Entitat de prova');
  const cru = (k: string) => get<{ valor: string }>('SELECT valor FROM config WHERE clau = ?', k)!.valor;
  assert.ok(cru('smtp_contrasenya').startsWith('enc:v1:'));
  assert.ok(!cru('smtp_contrasenya').includes('molt-secreta'));
  assert.ok(cru('xarxa_fb_token').startsWith('enc:v1:'));
  assert.equal(cru('nom'), 'Entitat de prova');
  assert.equal(getConfig('smtp_contrasenya'), 'molt-secreta');
  assert.equal(getConfig('xarxa_fb_token'), 'EAAB123');
  assert.ok(existsSync(join(dir, 'clau.key')));
  // Els valors buits no es xifren.
  setConfig('ftp_contrasenya', '');
  assert.equal(cru('ftp_contrasenya'), '');
});

test('migració: els secrets antics en text pla es xifren una sola vegada', () => {
  run("INSERT OR REPLACE INTO config (clau, valor) VALUES ('fac_cert_contrasenya', 'antiga')");
  secrets.reiniciaPerProves();
  assert.equal(getConfig('fac_cert_contrasenya'), 'antiga');
  const cru = get<{ valor: string }>("SELECT valor FROM config WHERE clau = 'fac_cert_contrasenya'")!.valor;
  assert.ok(cru.startsWith('enc:v1:'));
});

test('sense el fitxer de clau, els secrets xifrats tornen null (sense petar)', () => {
  const clau = join(dir, 'clau.key');
  const guardada = join(dir, 'clau.key.bak');
  assert.ok(existsSync(clau));
  const { renameSync } = process.getBuiltinModule('node:fs');
  renameSync(clau, guardada);
  secrets.reiniciaPerProves();
  const errorOriginal = console.error;
  const errors: unknown[] = [];
  console.error = (...a: unknown[]) => void errors.push(a);
  try {
    assert.equal(getConfig('smtp_contrasenya'), null);
    assert.equal(errors.length, 1);
  } finally {
    console.error = errorOriginal;
    renameSync(guardada, clau);
    secrets.reiniciaPerProves();
  }
  assert.equal(getConfig('smtp_contrasenya'), 'molt-secreta');
});

test('conservació: 7 còpies diàries i la primera de cada mes dels darrers 12 mesos', () => {
  const noms: string[] = [];
  // Una còpia diària de l'1 de gener de 2025 al 17 d'octubre de 2026.
  for (let d = new Date(2025, 0, 1); d <= new Date(2026, 9, 17); d.setDate(d.getDate() + 1)) {
    const p = (n: number) => String(n).padStart(2, '0');
    noms.push(`entitat-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.db`);
  }
  noms.push('altre-fitxer.txt', 'abans-actualitzar-0.1.0-20261001-1200.db');
  const esborrar = new Set(seleccionaPerEsborrar(noms));
  const conservats = noms.filter((n) => !esborrar.has(n));
  const diaries = ['11', '12', '13', '14', '15', '16', '17'].map((d) => `entitat-2026-10-${d}.db`);
  const mensuals = ['2025-11', '2025-12', ...Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)].map(
    (m) => `entitat-${m}-01.db`,
  );
  assert.deepEqual(
    conservats.sort(),
    [...new Set([...diaries, ...mensuals, 'altre-fitxer.txt', 'abans-actualitzar-0.1.0-20261001-1200.db'])].sort(),
  );
  // Si el mes no té còpia el dia 1, es conserva la primera que hi hagi.
  assert.deepEqual(seleccionaPerEsborrar(['e-2026-03-05.db', 'e-2026-03-09.db'], 1, 12), []);
  assert.deepEqual(seleccionaPerEsborrar(['e-2026-03-05.db', 'e-2026-03-09.db', 'e-2026-03-10.db'], 1, 12), ['e-2026-03-09.db']);
});

test('còpia, verificació i preparació de la restauració', () => {
  setConfig('inicialitzat', getConfig('inicialitzat') || new Date().toISOString());
  const r = ferCopia();
  assert.match(r.nom, /^entitat-de-prova-\d{4}-\d{2}-\d{2}\.db$/);
  assert.equal(llistaCopies().length, 1);
  const v = verificaFitxer(join(dir, 'copies', r.nom));
  assert.equal(v.valida, true);
  assert.equal(v.entitat, 'Entitat de prova');
  assert.ok(v.taules.some((t) => t.taula === 'socis'));
  const bytes = process.getBuiltinModule('node:fs').readFileSync(join(dir, 'copies', r.nom));
  preparaRestauracio(bytes);
  assert.ok(existsSync(rutaPendent()));
  rmSync(rutaPendent());
});

test("la restauració rebutja un fitxer SQLite que no és d'aquest programa", () => {
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const aliena = join(dir, 'aliena.db');
  const d = new DatabaseSync(aliena);
  d.exec("CREATE TABLE config (clau TEXT, valor TEXT); INSERT INTO config VALUES ('x', 'y'); CREATE TABLE altres (a);");
  d.close();
  assert.throws(() => verificaFitxer(aliena), (e: unknown) => e instanceof HttpError && e.status === 400);
  const fs = process.getBuiltinModule('node:fs');
  assert.throws(() => preparaRestauracio(fs.readFileSync(aliena)), (e: unknown) => e instanceof HttpError && e.status === 400);
  assert.throws(() => preparaRestauracio(Buffer.from('no és una base de dades')), (e: unknown) => e instanceof HttpError && e.status === 400);
  assert.ok(!existsSync(rutaPendent()));
});

function respostaFalsa() {
  const r = { codi: 0, cos: undefined as unknown };
  const res = {
    status(s: number) {
      r.codi = s;
      return res;
    },
    json(c: unknown) {
      r.cos = c;
      return res;
    },
  };
  return { r, res };
}

test("errorHandler: 413, JSON incorrecte i missatges de disparadors", () => {
  const crida = (err: unknown) => {
    const { r, res } = respostaFalsa();
    errorHandler(err, { method: 'GET', originalUrl: '/x' } as never, res as never, () => {});
    return r;
  };
  const gran = crida(Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413, limit: 2 * 1024 * 1024 }));
  assert.equal(gran.codi, 413);
  assert.deepEqual(gran.cos, { error: 'El fitxer o les dades són massa grans (màxim 2 MB).' });
  assert.equal(crida(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 })).codi, 400);

  db.exec("CREATE TABLE IF NOT EXISTS prova_bloqueig (a); CREATE TRIGGER IF NOT EXISTS prova_bloqueig_t BEFORE INSERT ON prova_bloqueig BEGIN SELECT RAISE(ABORT, 'Aquest registre està tancat i no es pot modificar.'); END;");
  let err: unknown;
  try {
    db.exec('INSERT INTO prova_bloqueig VALUES (1)');
  } catch (e) {
    err = e;
  }
  const disparador = crida(err);
  assert.equal(disparador.codi, 409);
  assert.deepEqual(disparador.cos, { error: 'Aquest registre està tancat i no es pot modificar.' });
  // Les restriccions UNIQUE continuen igual.
  db.exec('CREATE TABLE IF NOT EXISTS prova_unica (a UNIQUE); INSERT INTO prova_unica VALUES (1);');
  try {
    db.exec('INSERT INTO prova_unica VALUES (1)');
  } catch (e) {
    err = e;
  }
  assert.deepEqual(crida(err), { codi: 409, cos: { error: 'Registre duplicat.' } });
  // Els errors interns van a registre.log.
  const errorOriginal = console.error;
  console.error = () => {};
  try {
    assert.equal(crida(new Error('fallada inesperada')).codi, 500);
  } finally {
    console.error = errorOriginal;
  }
  assert.match(process.getBuiltinModule('node:fs').readFileSync(join(dir, 'registre.log'), 'utf8'), /GET \/x Error: fallada inesperada/);
});

// ---------- Sessions i bloqueig (per HTTP, amb un servidor mínim) ----------

async function servidor() {
  const express = (await import('express')).default;
  const { authRouter, requereixSessio, usuarisRouter } = await import('./routes/auth.ts');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api', requereixSessio);
  app.use('/api/usuaris', usuarisRouter);
  app.use(errorHandler);
  const srv = app.listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api`;
  const crida = async (metode: string, ruta: string, cos?: unknown, galeta?: string) => {
    const res = await fetch(base + ruta, {
      method: metode,
      headers: { 'Content-Type': 'application/json', ...(galeta ? { Cookie: galeta } : {}) },
      body: cos === undefined ? undefined : JSON.stringify(cos),
    });
    const setCookie = res.headers.get('set-cookie');
    return { status: res.status, galeta: setCookie?.split(';')[0] ?? null, cos: res.status === 204 ? null : await res.json().catch(() => null) };
  };
  return { srv, crida };
}

test('canviar la contrasenya tanca les altres sessions; bloqueig després de 5 intents', async () => {
  const { srv, crida } = await servidor();
  try {
    const primer = await crida('POST', '/auth/primer-usuari', { entitat: 'Prova', nom: 'Admin', usuari: 'admin', contrasenya: 'contrasenya-1' });
    assert.equal(primer.status, 201);
    const a = primer.galeta!;
    const b = (await crida('POST', '/auth/entrar', { usuari: 'admin', contrasenya: 'contrasenya-1' })).galeta!;
    assert.equal((await crida('GET', '/usuaris', undefined, b)).status, 200);

    // Canvi de la pròpia contrasenya des de la sessió A: la B queda tancada, la A continua.
    assert.equal((await crida('PUT', '/usuaris/jo/contrasenya', { actual: 'contrasenya-1', nova: 'contrasenya-2' }, a)).status, 204);
    assert.equal((await crida('GET', '/usuaris', undefined, b)).status, 401);
    assert.equal((await crida('GET', '/usuaris', undefined, a)).status, 200);

    // Restabliment per l'administració: es tanquen les sessions de l'altre usuari.
    const nou = await crida('POST', '/usuaris', { nom: 'Tresorera', usuari: 'tresorera', contrasenya: 'tresorera-1', rol: 'tresoreria' }, a);
    assert.equal(nou.status, 201);
    const c = (await crida('POST', '/auth/entrar', { usuari: 'tresorera', contrasenya: 'tresorera-1' })).galeta!;
    assert.equal((await crida('GET', '/usuaris', undefined, c)).status, 403); // sessió vàlida, però no és admin
    assert.equal(
      (await crida('PUT', `/usuaris/${nou.cos.id}`, { nom: 'Tresorera', rol: 'tresoreria', actiu: 1, contrasenya: 'tresorera-2' }, a)).status,
      200,
    );
    assert.equal((await crida('GET', '/usuaris', undefined, c)).status, 401);

    // Bloqueig: 5 intents fallits → 429, encara que després la contrasenya sigui correcta.
    for (let i = 0; i < 5; i++) assert.equal((await crida('POST', '/auth/entrar', { usuari: 'tresorera', contrasenya: 'dolenta' })).status, 401);
    const bloquejat = await crida('POST', '/auth/entrar', { usuari: 'tresorera', contrasenya: 'tresorera-2' });
    assert.equal(bloquejat.status, 429);
    assert.match(bloquejat.cos.error, /Massa intents fallits/);

    // L'auditoria registra entrades, intents fallits i canvis de contrasenya (sense valors).
    const accions = new Set(
      db.prepare('SELECT accio FROM auditoria').all().map((r) => (r as { accio: string }).accio),
    );
    for (const a of ['entra', 'entrada_fallida', 'contrasenya', 'crea']) assert.ok(accions.has(a), a);
    const detalls = db.prepare('SELECT detall FROM auditoria').all().map((r) => String((r as { detall: string }).detall)).join('\n');
    assert.ok(!detalls.includes('tresorera-2'));
  } finally {
    srv.close();
    (await import('./routes/auth.ts')).reiniciaBloquejos();
  }
});

test('funcions de bloqueig: per usuari i per IP, i caducitat', async () => {
  const { minutsBloqueig, registraIntentFallit, reiniciaBloquejos, MAX_INTENTS, MINUTS_BLOQUEIG } = await import('./routes/auth.ts');
  reiniciaBloquejos();
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_INTENTS - 1; i++) registraIntentFallit('Joan', '10.0.0.1', t0);
  assert.equal(minutsBloqueig('joan', '10.0.0.2', t0), 0);
  registraIntentFallit('joan', '10.0.0.1', t0);
  assert.equal(minutsBloqueig('JOAN', '10.0.0.9', t0), MINUTS_BLOQUEIG);
  assert.equal(minutsBloqueig('joan', '10.0.0.9', t0 + MINUTS_BLOQUEIG * 60_000 + 1), 0);
  reiniciaBloquejos();
});
