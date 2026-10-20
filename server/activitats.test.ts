// Activitats: migració de les participacions antigues, llista d'espera, indicadors d'impacte i avisos de menors.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Server } from 'node:http';

const dir = mkdtempSync(join(tmpdir(), 'activitats-'));
const dbPath = join(dir, 'prova.db');

// Base de dades «antiga»: participacions amb clau (activitat, soci), com abans d'aquest mòdul.
{
  const vella = new DatabaseSync(dbPath);
  vella.exec(`
    CREATE TABLE socis (
      id INTEGER PRIMARY KEY, num_soci INTEGER NOT NULL UNIQUE, nom TEXT NOT NULL, llinatges TEXT NOT NULL DEFAULT '',
      dni TEXT, data_naixement TEXT, genere TEXT, adreca TEXT, codi_postal TEXT, poblacio TEXT, telefon TEXT, email TEXT,
      data_alta TEXT NOT NULL, data_baixa TEXT, motiu_baixa TEXT, tipus_quota_id INTEGER, iban TEXT, tutor_legal TEXT,
      consentiment_dades INTEGER NOT NULL DEFAULT 0, drets_imatge INTEGER NOT NULL DEFAULT 0, notes TEXT,
      creat_el TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE activitats (
      id INTEGER PRIMARY KEY, nom TEXT NOT NULL, data_inici TEXT NOT NULL, data_fi TEXT, lloc TEXT, descripcio TEXT,
      objectius TEXT NOT NULL DEFAULT '', participants INTEGER, notes TEXT
    );
    CREATE TABLE participacions (
      activitat_id INTEGER NOT NULL REFERENCES activitats(id) ON DELETE CASCADE,
      soci_id      INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
      assistit     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (activitat_id, soci_id)
    );
    INSERT INTO socis (num_soci, nom, llinatges, data_alta, data_naixement, genere, drets_imatge) VALUES
      (1, 'Margalida', 'Padrina', '2020-01-01', '1948-02-01', 'dona', 1),
      (2, 'Miquel', 'Pare', '2020-01-01', '1980-06-01', 'home', 0),
      (3, 'Biel', 'Net', '2020-01-01', '2016-03-01', 'home', 1);
    INSERT INTO activitats (nom, data_inici, participants) VALUES ('Antiga', '2020-05-01', 30);
    INSERT INTO participacions VALUES (1, 1, 1), (1, 2, 0);
  `);
  vella.close();
}

process.env.DB_PATH = dbPath;
type Db = typeof import('./db.ts');
let D: Db;
let base = '';
let server: Server;

async function crida(metode: string, cami: string, cos?: unknown) {
  const r = await fetch(base + cami, {
    method: metode,
    headers: { 'content-type': 'application/json' },
    body: cos === undefined ? undefined : JSON.stringify(cos),
  });
  const text = await r.text();
  return { status: r.status, cos: text ? JSON.parse(text) : null };
}

before(async () => {
  D = await import('./db.ts');
  const express = (await import('express')).default;
  const { activitatsRouter } = await import('./routes/activitats.ts');
  const { crmRouter } = await import('./routes/crm.ts');
  const { informesRouter } = await import('./routes/informes.ts');
  const { errorHandler } = await import('./util.ts');
  const app = express();
  app.use(express.json());
  app.use('/api/activitats', activitatsRouter);
  app.use('/api/crm', crmRouter);
  app.use('/api/informes', informesRouter);
  app.use(errorHandler);
  await new Promise<void>((resol) => {
    server = app.listen(0, () => resol());
  });
  const adreca = server.address();
  base = `http://127.0.0.1:${typeof adreca === 'object' && adreca ? adreca.port : 0}/api`;
});

after(() => {
  server?.close();
  D?.db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('la migració dona identificador a les participacions antigues i conserva les dades', async () => {
  const files = D.all<{ id: number; soci_id: number; assistit: number; estat: string; drets_imatge: number }>(
    'SELECT id, soci_id, assistit, estat, drets_imatge FROM participacions ORDER BY soci_id',
  ).map((r) => ({ ...r }));
  assert.equal(files.length, 2);
  assert.ok(files.every((f) => Number.isInteger(f.id)));
  assert.deepEqual(files.map(({ soci_id, assistit, estat, drets_imatge }) => ({ soci_id, assistit, estat, drets_imatge })), [
    { soci_id: 1, assistit: 1, estat: 'inscrit', drets_imatge: 1 },
    { soci_id: 2, assistit: 0, estat: 'inscrit', drets_imatge: 0 },
  ]);
  // Les activitats que ja havien passat es donen per fetes.
  assert.equal(D.get<{ estat: string }>('SELECT estat FROM activitats WHERE id = 1')!.estat, 'feta');
  // Idempotent: tornar a executar l'esquema no canvia res.
  const { esquema } = await import('./esquema/activitats.ts');
  esquema(D.db, () => {});
  assert.equal(D.get<{ n: number }>('SELECT COUNT(*) AS n FROM participacions')!.n, 2);
  // Un soci no es pot inscriure dues vegades a la mateixa activitat.
  assert.equal((await crida('POST', '/crm/activitats/1/participants', { soci_id: 1 })).status, 409);
});

test("llista d'espera: quan és ple s'hi va a la cua i, en cancel·lar, entra el primer", async () => {
  const a = (await crida('POST', '/activitats', { nom: 'Taller', data_inici: '2030-01-10', places: 2, objectius: '' })).cos;
  assert.equal(a.places, 2);
  const url = `/crm/activitats/${a.id}/participants`;
  const p1 = (await crida('POST', url, { soci_id: 1 })).cos;
  const p2 = (await crida('POST', url, { soci_id: 2 })).cos;
  const e1 = (await crida('POST', url, { nom_extern: 'Primer en espera', data_naixement: '2015-01-01', tutor: 'Mare' })).cos;
  const e2 = (await crida('POST', url, { nom_extern: 'Segon en espera' })).cos;
  assert.deepEqual([p1.estat, p2.estat, e1.estat, e2.estat], ['inscrit', 'inscrit', 'espera', 'espera']);
  assert.equal(p1.drets_imatge, 1, "els drets d'imatge del soci s'hi copien");
  assert.equal(e1.drets_imatge_consta, 0);
  assert.equal(e1.menor, true);

  const r = (await crida('PUT', `${url}/${p1.id}`, { estat: 'cancel·lat' })).cos;
  assert.deepEqual(r.promocionats.map((p: { nom: string }) => p.nom), ['Primer en espera']);
  assert.equal(r.promocionats[0].tutor, 'Mare');

  const d = (await crida('DELETE', `${url}/${p2.id}`)).cos;
  assert.deepEqual(d.promocionats.map((p: { nom: string }) => p.nom), ['Segon en espera']);

  // Torna a inscriure's qui havia cancel·lat: l'activitat és plena, va a la cua.
  assert.equal((await crida('POST', url, { soci_id: 1 })).cos.estat, 'espera');
  // Si s'amplien les places, entra automàticament.
  const amp = (await crida('PUT', `/activitats/${a.id}`, { nom: 'Taller', data_inici: '2030-01-10', objectius: '', places: 3 })).cos;
  assert.equal(amp.promocionats.length, 1);
  assert.equal(amp.inscrits, 3);
  assert.equal(amp.en_espera, 0);
});

test("indicadors d'impacte: franges, generacions, persones úniques i recompte manual", async () => {
  const nova = async (nom: string, data_inici: string, extra = {}) =>
    (await crida('POST', '/activitats', { nom, data_inici, objectius: '', ...extra })).cos.id as number;
  const a1 = await nova('Rondalles', '2029-03-01');
  const a2 = await nova('Cançons', '2029-04-01');
  const a3 = await nova('Xerrada antiga', '2029-05-01', { participants: 25 });
  const a4 = await nova('Anul·lada', '2029-06-01', { participants: 99, estat: 'anul·lada' });
  const inscriu = async (a: number, cos: object) => {
    const p = (await crida('POST', `/crm/activitats/${a}/participants`, cos)).cos;
    await crida('PUT', `/crm/activitats/${a}/participants/${p.id}`, { assistit: true });
    return p;
  };
  await inscriu(a1, { soci_id: 1 }); // gent gran, sòcia
  await inscriu(a1, { soci_id: 3 }); // infant, soci
  await inscriu(a1, { nom_extern: 'Neta de fora', data_naixement: '2018-01-01', genere: 'dona' }); // infant, no sòcia
  await crida('POST', `/crm/activitats/${a1}/participants`, { soci_id: 2 }); // inscrit però no hi va anar
  await crida('PUT', `/activitats/${a1}/assistents-anonims`, { assistents_anonims: 10 });
  await inscriu(a2, { soci_id: 1 });
  await inscriu(a2, { nom_extern: 'Neta de fora', data_naixement: '2018-01-01', genere: 'dona' });

  const { activitats, totals } = (await crida('GET', '/informes/indicadors?exercici=2029')).cos;
  assert.equal(activitats.some((a: { id: number }) => a.id === a4), false, 'les anul·lades no compten');
  const r1 = activitats.find((a: { id: number }) => a.id === a1);
  assert.equal(r1.assistents_inscrits, 3);
  assert.equal(r1.total_assistents, 13);
  assert.equal(r1.per_franja['Infants (0-13)'], 2);
  assert.equal(r1.per_franja['Gent gran (65+)'], 1);
  assert.deepEqual(r1.generacions, ['Infants (0-13)', 'Gent gran (65+)']);
  assert.equal(r1.intergeneracional, true);
  assert.deepEqual([r1.socis, r1.no_socis], [2, 1]);
  const r3 = activitats.find((a: { id: number }) => a.id === a3);
  assert.deepEqual([r3.font, r3.total_assistents, r3.intergeneracional], ['manual', 25, false]);

  assert.equal(totals.activitats, 3);
  assert.equal(totals.activitats_intergeneracionals, 2);
  assert.equal(totals.total_assistents, 13 + 2 + 25);
  assert.equal(totals.persones_uniques, 3, 'la neta i la padrina compten una sola vegada');
  assert.deepEqual([totals.socis_unics, totals.no_socis_unics], [2, 1]);
  assert.equal(totals.per_genere.find((g: { genere: string }) => g.genere === 'dona').persones, 2);

  const csv = await fetch(`${base}/informes/indicadors.csv?exercici=2029&idioma=es`).then((r) => r.text());
  assert.match(csv, /Rondalles/);
  assert.match(csv.split('\r\n')[0], /Asistentes/);
});

test("avisos i drets d'imatge: menors sense autorització del tutor", async () => {
  const { sumaDies } = await import('../shared/dates.ts');
  const { avisos } = await import('./avisos/activitats.ts');
  const id = (await crida('POST', '/activitats', { nom: 'Taller proper', data_inici: sumaDies(3), objectius: '' })).cos.id;
  const url = `/crm/activitats/${id}/participants`;
  const nen = (await crida('POST', url, { nom_extern: 'Nen sense paper', data_naixement: '2017-01-01', tutor: 'Pare' })).cos;
  await crida('POST', url, { nom_extern: 'Nena amb paper', data_naixement: '2016-01-01', autoritzacio_tutor: sumaDies(-1), drets_imatge: 1 });
  await crida('POST', url, { soci_id: 1 });
  const meus = () => avisos().filter((a) => a.valors?.[0] === 'Taller proper');
  assert.equal(meus().length, 1);
  assert.equal(meus()[0].nivell, 'alerta');
  assert.equal(meus()[0].valors?.[2], 1);

  const sense = (await crida('GET', `/activitats/${id}/sense-drets-imatge`)).cos;
  assert.deepEqual([sense.total, sense.menors, sense.noms], [1, 1, ['Nen sense paper']]);

  await crida('PUT', `${url}/${nen.id}`, { autoritzacio_tutor: sumaDies(0), drets_imatge: true });
  assert.equal(meus().length, 0);
  assert.equal((await crida('GET', `/activitats/${id}/sense-drets-imatge`)).cos.total, 0);
});
