// Proves del mòdul de subvencions: límits d'imputació, totals i desviació, avisos, justificants adjunts
// (eliminació en cascada i exercicis tancats).

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

const dir = mkdtempSync(join(tmpdir(), 'subvencions-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, get, run, DB_PATH } = await import('./db.ts');
assert.ok(DB_PATH.startsWith(dir), 'les proves no poden tocar la base de dades real');
const { justificacio } = await import('./routes/subvencions.ts');
const { avisos } = await import('./avisos/subvencions.ts');
const { sumaDies } = await import('../shared/dates.ts');

const express = (await import('express')).default;
const { comptabilitatRouter } = await import('./routes/comptabilitat.ts');
const { subvencionsRouter } = await import('./routes/subvencions.ts');
const { errorHandler } = await import('./util.ts');
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, _res, next) => {
  (req as unknown as { usuari: unknown }).usuari = { id: 1, nom: 'Prova', usuari: 'prova', rol: 'admin' };
  next();
});
app.use('/comptabilitat', comptabilitatRouter);
app.use('/subvencions', subvencionsRouter);
app.use(errorHandler);
const servidor = app.listen(0, '127.0.0.1');
await new Promise((r) => servidor.once('listening', r));
const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
async function crida(method: string, path: string, body?: unknown) {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}

after(() => {
  servidor.close();
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const compte = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Compte%'")!.id;
const catDespesa = get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'despesa' ORDER BY id")!.id;
const catIngres = get<{ id: number }>("SELECT id FROM categories WHERE nom = 'Subvencions públiques'")!.id;

const despesa = (data: string, cents: number, concepte = 'Despesa de prova') =>
  run("INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id) VALUES (?, 'despesa', ?, ?, ?, ?)", data, cents, concepte, catDespesa, compte).id;

async function novaSubvencio(extra: Record<string, unknown> = {}) {
  const r = await crida('POST', '/subvencions', {
    organisme: 'Consell de Mallorca', convocatoria: 'Cultura popular', exercici: 2026, estat: 'concedida',
    import_sollicitat_cents: 200000, import_concedit_cents: 150000, pressupost_projecte_cents: 200000,
    periode_inici: '2026-01-01', periode_fi: '2026-12-31', ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.id as number;
}

test('imputacions: mai més que l\'import del moviment entre totes les subvencions', async () => {
  const a = await novaSubvencio();
  const b = await novaSubvencio({ organisme: 'Ajuntament de Pollença' });
  const mov = despesa('2026-03-14', 10000);

  let r = await crida('POST', `/subvencions/${a}/imputacions`, { moviment_id: mov, import_cents: 6000 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const impA = r.body.id;
  // A l'altra subvenció només en queden 40 €.
  r = await crida('POST', `/subvencions/${b}/imputacions`, { moviment_id: mov, import_cents: 4001 });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /40,00 €/);
  r = await crida('POST', `/subvencions/${b}/imputacions`, { moviment_id: mov, import_cents: 4000, creditor: 'Impremta Pollença SL' });
  assert.equal(r.status, 201);
  // Modificar-ne una per damunt del disponible tampoc no es pot.
  r = await crida('PUT', `/subvencions/${a}/imputacions/${impA}`, { import_cents: 6500 });
  assert.equal(r.status, 400);
  // Ni duplicar-la a la mateixa subvenció.
  r = await crida('POST', `/subvencions/${a}/imputacions`, { moviment_id: mov, import_cents: 1 });
  assert.equal(r.status, 400);
  // Ni imputar un ingrés.
  const ingres = run("INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id) VALUES ('2026-03-01', 'ingres', 500, 'x', ?, ?)", catIngres, compte).id;
  r = await crida('POST', `/subvencions/${a}/imputacions`, { moviment_id: ingres, import_cents: 100 });
  assert.equal(r.status, 400);

  // El disparador també ho impedeix directament a la base de dades.
  assert.throws(() => run('UPDATE subvencio_imputacions SET import_cents = 7000 WHERE id = ?', impA), /supera/);
  // I el moviment no pot baixar per davall del que té imputat.
  r = await crida('PUT', `/comptabilitat/moviments/${mov}`, {
    data: '2026-03-14', tipus: 'despesa', import_cents: 9000, concepte: 'x', categoria_id: catDespesa, compte_id: compte,
  });
  assert.equal(r.status, 400);
  assert.throws(() => run('UPDATE moviments SET import_cents = 9000 WHERE id = ?', mov), /supera/);
  // Ni deixar de ser una despesa.
  r = await crida('PUT', `/comptabilitat/moviments/${mov}`, {
    data: '2026-03-14', tipus: 'ingres', import_cents: 10000, concepte: 'x', categoria_id: catIngres, compte_id: compte,
  });
  assert.equal(r.status, 400);
});

test('totals, cobraments i desviació respecte del pressupost', async () => {
  const id = await novaSubvencio();
  const m1 = despesa('2026-04-01', 120000, 'Honoraris contadora');
  const m2 = despesa('2026-04-20', 60000, 'Impressió llibret');
  await crida('POST', `/subvencions/${id}/imputacions`, { moviment_id: m1, import_cents: 100000 });
  await crida('POST', `/subvencions/${id}/imputacions`, { moviment_id: m2, import_cents: 40000 });
  // Cobrament: un ingrés vinculat amb subvencio_id des del formulari de moviments.
  const r = await crida('POST', '/comptabilitat/moviments', {
    data: '2026-06-30', tipus: 'ingres', import_cents: 100000, concepte: 'Bestreta', categoria_id: catIngres, compte_id: compte, subvencio_id: id,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.subvencio_id, id);

  const j = justificacio(id)!;
  assert.equal(j.totals.imputat_cents, 140000);
  assert.equal(j.totals.cost_cents, 180000);
  assert.equal(j.totals.cobrat_cents, 100000);
  assert.equal(j.totals.pendent_cobrar_cents, 50000);
  assert.equal(j.totals.falta_imputar_cents, 10000);
  assert.equal(j.totals.desviacio_cents, -20000); // 1.800 € executats sobre 2.000 € pressupostats
  assert.equal(j.totals.desviacio_percent, -10);
  assert.equal(j.totals.execucio_percent, 90);
  assert.equal(j.totals.sense_justificant, 2);

  // Un cop justificada, les imputacions i les despeses queden protegides.
  let s = await crida('POST', `/subvencions/${id}/justifica`, { data: '2026-10-01' });
  assert.equal(s.status, 200);
  assert.equal(s.body.estat, 'justificada');
  s = await crida('POST', `/subvencions/${id}/imputacions`, { moviment_id: despesa('2026-05-01', 1000), import_cents: 1000 });
  assert.equal(s.status, 409);
  s = await crida('DELETE', `/comptabilitat/moviments/${m1}`);
  assert.equal(s.status, 409);
  s = await crida('DELETE', `/subvencions/${id}`);
  assert.equal(s.status, 409);

  // CSV de la relació de despeses.
  const csv = await (await fetch(`${base}/subvencions/${id}/despeses.csv`)).text();
  assert.match(csv, /Honoraris contadora/);
  assert.equal(csv.trim().split('\r\n').length, 3);
});

test('avisos: termini, justificants que falten, cobrament pendent i sol·licitud sense resoldre', async () => {
  run('DELETE FROM subvencions');
  const proper = await novaSubvencio({ convocatoria: 'Rondalles', termini_justificacio: sumaDies(20), estat: 'cobrada' });
  await novaSubvencio({ convocatoria: 'Vençuda', termini_justificacio: sumaDies(-3) });
  await novaSubvencio({ convocatoria: 'Llunyana', termini_justificacio: sumaDies(90) });
  await novaSubvencio({ convocatoria: 'Antiga', data_resolucio: sumaDies(-220) });
  await novaSubvencio({ convocatoria: 'Sense resposta', estat: 'sollicitada', import_concedit_cents: null, data_sollicitud: sumaDies(-200) });
  await novaSubvencio({ convocatoria: 'Recent', estat: 'sollicitada', import_concedit_cents: null, data_sollicitud: sumaDies(-20) });
  const mov = despesa('2026-03-01', 5000);
  await crida('POST', `/subvencions/${proper}/imputacions`, { moviment_id: mov, import_cents: 5000 });

  const textos = avisos().map((a) => `${a.nivell}|${a.text}|${(a.valors ?? []).join('|')}`);
  const hi = (re: RegExp) => textos.some((t) => re.test(t));
  assert.ok(hi(/^alerta\|Cal justificar.*Rondalles/), textos.join('\n'));
  assert.ok(hi(/^alerta\|El termini.*va vèncer.*Vençuda/));
  assert.ok(!hi(/Llunyana/));
  assert.ok(hi(/^alerta\|\{0\} despeses imputades.*\|1\|.*Rondalles/));
  assert.ok(hi(/^info\|.*concedir.*Antiga/));
  assert.ok(hi(/^info\|.*sol·licitud.*Sense resposta/));
  assert.ok(!hi(/Recent/));
  assert.ok(avisos().every((a) => a.modul === 'economia' && a.enllac === '/subvencions'));

  // Amb el justificant adjunt, l'avís desapareix.
  const r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'tiquet.png', dades: PNG });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(!avisos().some((a) => a.text.startsWith('{0} despeses imputades')));
});

test('justificants: llista sense dades, consulta amb dades i eliminació en cascada amb el moviment', async () => {
  const mov = despesa('2026-07-01', 2500);
  let r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'factura.png', dades: PNG });
  assert.equal(r.status, 201);
  assert.equal(r.body.dades, undefined);
  assert.equal(r.body.mida, 70);
  const jid = r.body.id;
  r = await crida('GET', `/comptabilitat/moviments/${mov}/justificants`);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].dades, undefined);
  r = await crida('GET', `/comptabilitat/justificants/${jid}`);
  assert.equal(r.body.dades, PNG);
  r = await crida('GET', `/comptabilitat/moviments?exercici=2026`);
  assert.equal(r.body.find((m: { id: number }) => m.id === mov).n_justificants, 1);
  // Formats no admesos i fitxers massa grans.
  r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'x.txt', dades: 'data:text/plain;base64,aGVsbG8=' });
  assert.equal(r.status, 400);
  r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'gran.pdf', dades: 'data:application/pdf;base64,' + 'A'.repeat(1_960_000) });
  assert.equal(r.status, 413);

  r = await crida('DELETE', `/comptabilitat/moviments/${mov}`);
  assert.equal(r.status, 204);
  assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM justificants WHERE moviment_id = ?', mov)!.n, 0);
});

test('exercici tancat: es poden afegir justificants però no eliminar-los', async () => {
  const mov = despesa('2024-05-10', 3000);
  let r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'abans.png', dades: PNG });
  const abans = r.body.id;
  run("INSERT INTO exercicis_tancats (exercici) VALUES (2024)");
  try {
    r = await crida('POST', `/comptabilitat/moviments/${mov}/justificants`, { nom: 'despres.png', dades: PNG });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    r = await crida('DELETE', `/comptabilitat/justificants/${abans}`);
    assert.equal(r.status, 409);
    assert.match(r.body.error, /tancat/);
    assert.throws(() => run("UPDATE justificants SET nom = 'x' WHERE id = ?", abans), /tancat/);
    // El moviment tampoc no es pot eliminar (i, per tant, no hi ha cascada).
    r = await crida('DELETE', `/comptabilitat/moviments/${mov}`);
    assert.equal(r.status, 409);
    assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM justificants WHERE moviment_id = ?', mov)!.n, 2);
  } finally {
    run('DELETE FROM exercicis_tancats WHERE exercici = 2024');
  }
  r = await crida('DELETE', `/comptabilitat/justificants/${abans}`);
  assert.equal(r.status, 204);
});
