// Registre de socis: migració dels períodes, baixa i readmissió, protecció de l'eliminació,
// importació des d'un full de càlcul i regles de vot de les categories.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Server } from 'node:http';

const dir = mkdtempSync(join(tmpdir(), 'socis-'));
const dbPath = join(dir, 'prova.db');

// Base de dades «antiga»: socis sense períodes ni categories, com abans d'aquest mòdul.
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
    INSERT INTO socis (num_soci, nom, data_alta, data_baixa, motiu_baixa) VALUES
      (1, 'Antic', '2020-01-01', NULL, NULL),
      (2, 'Difunt', '2020-01-01', '2023-05-01', 'Defunció'),
      (3, 'Morós', '2021-01-01', '2024-01-01', 'Impagament de la quota');
  `);
  vella.close();
}

process.env.DB_PATH = dbPath;
type Db = typeof import('./db.ts');
let D: Db;
let base = '';
let server: Server;

async function crida(metode: string, camí: string, cos?: unknown, rol = 'admin') {
  const r = await fetch(base + camí, {
    method: metode,
    headers: { 'content-type': 'application/json', 'x-rol': rol },
    body: cos === undefined ? undefined : JSON.stringify(cos),
  });
  const text = await r.text();
  return { status: r.status, cos: text ? JSON.parse(text) : null };
}

before(async () => {
  D = await import('./db.ts');
  const express = (await import('express')).default;
  const { socisRouter } = await import('./routes/socis.ts');
  const { errorHandler } = await import('./util.ts');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { usuari: unknown }).usuari = { id: 1, nom: 'Prova', usuari: 'prova', rol: req.headers['x-rol'] };
    next();
  });
  app.use('/api/socis', socisRouter);
  app.use(errorHandler);
  await new Promise<void>((resol) => {
    server = app.listen(0, () => resol());
  });
  const adreca = server.address();
  base = `http://127.0.0.1:${typeof adreca === 'object' && adreca ? adreca.port : 0}/api/socis`;
});

after(() => {
  server?.close();
  D?.db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('la migració crea un període per soci amb el motiu deduït', () => {
  const p = D.all<{ num_soci: number; data_alta: string; data_baixa: string | null; motiu_tipus: string | null }>(
    'SELECT s.num_soci, p.data_alta, p.data_baixa, p.motiu_tipus FROM socis_periodes p JOIN socis s ON s.id = p.soci_id ORDER BY s.num_soci',
  );
  assert.deepEqual(p.map((x) => ({ ...x })), [
    { num_soci: 1, data_alta: '2020-01-01', data_baixa: null, motiu_tipus: null },
    { num_soci: 2, data_alta: '2020-01-01', data_baixa: '2023-05-01', motiu_tipus: 'defuncio' },
    { num_soci: 3, data_alta: '2021-01-01', data_baixa: '2024-01-01', motiu_tipus: 'impagament' },
  ]);
  assert.equal(D.get<{ e: string }>('SELECT estat_admissio AS e FROM socis WHERE num_soci = 1')!.e, 'admesa');
});

test('la migració és idempotent', async () => {
  const { esquema } = await import('./esquema/socis.ts');
  esquema(D.db, () => {});
  assert.equal(D.get<{ n: number }>('SELECT COUNT(*) AS n FROM socis_periodes')!.n, 3);
});

test('baixa i readmissió conserven l’historial', async () => {
  const { cos: s } = await crida('POST', '/', { nom: 'Joana', llinatges: 'Prova', data_alta: '2024-01-10' });
  let r = await crida('POST', `/${s.id}/baixa`, { data_baixa: '2025-03-01', motiu_tipus: 'voluntaria', motiu: 'Canvi de residència' });
  assert.equal(r.status, 200);
  assert.equal(r.cos.data_baixa, '2025-03-01');
  r = await crida('POST', `/${s.id}/baixa`, { data_baixa: '2025-03-01', motiu_tipus: 'expulsio' });
  assert.equal(r.status, 400, "una expulsió demana l'acord");
  r = await crida('POST', `/${s.id}/readmissio`, { data_alta: '2025-01-01' });
  assert.equal(r.status, 400, 'no es pot readmetre abans de la baixa');
  r = await crida('POST', `/${s.id}/readmissio`, { data_alta: '2026-02-01', acord: 'Junta 2026-01-28' });
  assert.equal(r.status, 200);
  assert.equal(r.cos.data_alta, '2026-02-01');
  assert.equal(r.cos.data_baixa, null);
  const { cos: fitxa } = await crida('GET', `/${s.id}`);
  assert.equal(fitxa.periodes.length, 2);
  assert.equal(fitxa.periodes[0].data_alta, '2024-01-10');
  assert.equal(fitxa.periodes[0].data_baixa, '2025-03-01');
  assert.equal(fitxa.periodes[0].motiu_tipus, 'voluntaria');
  assert.equal(fitxa.periodes[1].data_alta, '2026-02-01');
  assert.equal(fitxa.periodes[1].acord, 'Junta 2026-01-28');
  r = await crida('POST', `/${s.id}/readmissio`, { data_alta: '2026-03-01' });
  assert.equal(r.status, 409, 'ja és actiu');
  // L'acord de la baixa no esborra el de la readmissió; una defunció no es pot readmetre.
  r = await crida('POST', `/${s.id}/baixa`, { data_baixa: '2026-09-01', motiu_tipus: 'defuncio', acord: 'Certificat' });
  const darrer = D.get<{ acord: string; acord_baixa: string }>('SELECT acord, acord_baixa FROM socis_periodes WHERE soci_id = ? ORDER BY id DESC', s.id)!;
  assert.deepEqual({ ...darrer }, { acord: 'Junta 2026-01-28', acord_baixa: 'Certificat' });
  assert.equal((await crida('POST', `/${s.id}/readmissio`, { data_alta: '2026-10-01' })).status, 409);

  // El llibre registre a una data passada mostra la situació d'aleshores.
  const { cos: llibre } = await crida('GET', '/llibre-registre?a_data=2025-01-01');
  const joana = llibre.socis.find((x: { id: number }) => x.id === s.id);
  assert.equal(joana.periodes.length, 1);
  assert.equal(joana.periodes[0].acord_baixa, null);
  assert.equal(joana.periodes[0].data_baixa, null);
  const auditoria = D.get<{ n: number }>("SELECT COUNT(*) AS n FROM auditoria WHERE entitat = 'soci' AND entitat_id = ?", s.id)!.n;
  assert.equal(auditoria, 4); // alta, baixa, readmissió i baixa
});

test("l'anonimització tanca el període i el llibre no mostra el nom", async () => {
  const { cos: s } = await crida('POST', '/', { nom: 'Secret', llinatges: 'Persona', dni: '12345678Z', data_alta: '2024-01-01' });
  D.run("UPDATE socis SET nom = 'Soci anonimitzat', dni = NULL, data_baixa = '2026-01-01', anonimitzat_el = '2026-01-01' WHERE id = ?", s.id);
  const { cos: llibre } = await crida('GET', '/llibre-registre');
  const fila = llibre.socis.find((x: { id: number }) => x.id === s.id);
  assert.equal(fila.nom, 'Persona anonimitzada');
  assert.equal(fila.dni, null);
  assert.equal(fila.periodes[0].data_baixa, '2026-01-01');
});

test("eliminar: només l'administració i només sense historial", async () => {
  const { cos: s } = await crida('POST', '/', { nom: 'Error', data_alta: '2026-01-01' });
  let r = await crida('DELETE', `/${s.id}`, undefined, 'junta');
  assert.equal(r.status, 403);
  D.run("INSERT INTO interaccions (soci_id, data, tipus, resum) VALUES (?, '2026-01-02', 'nota', 'x')", s.id);
  r = await crida('DELETE', `/${s.id}`);
  assert.equal(r.status, 409);
  assert.match(r.cos.error, /Donar de baixa/);
  D.run('DELETE FROM interaccions WHERE soci_id = ?', s.id);
  r = await crida('DELETE', `/${s.id}`);
  assert.equal(r.status, 204);
  // Un soci amb una baixa registrada (historial al llibre) tampoc no es pot eliminar.
  const { cos: s2 } = await crida('POST', '/', { nom: 'Amb baixa', data_alta: '2025-01-01' });
  await crida('POST', `/${s2.id}/baixa`, { data_baixa: '2025-06-01', motiu_tipus: 'altres' });
  r = await crida('DELETE', `/${s2.id}`);
  assert.equal(r.status, 409);
});

test("IBAN: es valida i es desa normalitzat", async () => {
  let r = await crida('POST', '/', { nom: 'Banc', data_alta: '2026-01-01', iban: 'ES91 2100 0418 4502 0005 1333' });
  assert.equal(r.status, 400);
  r = await crida('POST', '/', { nom: 'Banc', data_alta: '2026-01-01', iban: 'es91 2100-0418 4502 0005 1332' });
  assert.equal(r.status, 201);
  assert.equal(r.cos.iban, 'ES9121000418450200051332');
});

test("sol·licitud d'admissió: no compta com a activa fins que s'admet", async () => {
  const { cos: s } = await crida('POST', '/', { nom: 'Candidata', data_alta: '2026-09-01', sollicitud: true });
  assert.equal(s.estat_admissio, 'sollicitada');
  let { cos: actius } = await crida('GET', '/?estat=actius');
  assert.ok(!actius.some((x: { id: number }) => x.id === s.id));
  const { cos: pendents } = await crida('GET', '/?estat=sollicituds');
  assert.ok(pendents.some((x: { id: number }) => x.id === s.id));
  const r = await crida('POST', `/${s.id}/admet`, { data: '2026-10-01', acord: 'Junta 2026-09-30' });
  assert.equal(r.cos.estat_admissio, 'admesa');
  assert.equal(r.cos.data_alta, '2026-10-01');
  ({ cos: actius } = await crida('GET', '/?estat=actius'));
  assert.ok(actius.some((x: { id: number }) => x.id === s.id));
  assert.equal(D.get<{ n: number }>('SELECT COUNT(*) AS n FROM socis_periodes WHERE soci_id = ?', s.id)!.n, 1);
  const { avisos } = await import('./avisos/socis.ts');
  const { cos: s2 } = await crida('POST', '/', { nom: 'Altra', data_alta: '2026-09-01', sollicitud: true });
  assert.equal(avisos().length, 1);
  await crida('POST', `/${s2.id}/denega`, {});
  assert.equal(avisos().length, 0);
});

test('regles de vot: categoria sense vot i menors d’edat', async () => {
  const honor = D.get<{ id: number }>("SELECT id FROM categories_soci WHERE nom = 'D''honor'")!.id;
  const numerari = D.get<{ id: number }>("SELECT id FROM categories_soci WHERE nom = 'Numerari'")!.id;
  const { cos: a } = await crida('POST', '/', { nom: 'Vota', data_alta: '2026-01-01', categoria_id: numerari, data_naixement: '1980-01-01' });
  const { cos: b } = await crida('POST', '/', { nom: 'Honor', data_alta: '2026-01-01', categoria_id: honor, data_naixement: '1950-01-01' });
  const { cos: c } = await crida('POST', '/', { nom: 'Menor', data_alta: '2026-01-01', categoria_id: numerari, data_naixement: '2015-01-01' });
  const vot = async (id: number) => (await crida('GET', `/${id}`)).cos.soci.te_vot;
  assert.equal(await vot(a.id), 1);
  assert.equal(await vot(b.id), 0);
  assert.equal(await vot(c.id), 0);
  // No es pot eliminar una categoria en ús.
  assert.equal((await crida('DELETE', `/categories/${honor}`)).status, 409);
  const { cos: nova } = await crida('POST', '/categories', { nom: 'Col·laborador', te_vot: false, paga_quota: true });
  assert.equal((await crida('DELETE', `/categories/${nova.id}`)).status, 204);
});

test('importació: valida dates, duplicats i IBAN', async () => {
  const files = [
    { nom: 'Bona', llinatges: 'Fila', data_naixement: '05/03/1970', data_alta: '2026-01-15', dni: '00000001R', categoria: 'fundador', iban: 'ES9121000418450200051332' },
    { nom: 'Data', data_naixement: '31/02/1970' },
    { nom: 'Duplicada', dni: '00000001-R' },
    { nom: 'Banc', iban: 'ES00 1234' },
    { llinatges: 'Sense nom' },
    { nom: 'Ja existent', dni: '12345678Z' },
    { nom: 'Número', num_soci: '1' },
    { nom: 'Correu', email: 'no-es-un-correu' },
    { nom: 'Sense alta', genere: 'Mujer' },
  ];
  let r = await crida('POST', '/importa', { files, confirma: false });
  assert.equal(r.status, 200);
  const errors = r.cos.files.map((f: { errors: string[] }) => f.errors.length);
  assert.deepEqual(errors, [0, 1, 1, 1, 1, 0, 1, 1, 0]);
  // El DNI 12345678Z era d'un soci que s'ha anonimitzat (dni esborrat): ja no hi és.
  assert.equal(r.cos.valides, 3);
  assert.equal(r.cos.importats, 0);
  assert.match(r.cos.files[2].errors[0], /repetit al fitxer/);
  const abans = D.get<{ n: number }>('SELECT COUNT(*) AS n FROM socis')!.n;
  r = await crida('POST', '/importa', { files, confirma: true });
  assert.equal(r.cos.importats, 3);
  assert.equal(D.get<{ n: number }>('SELECT COUNT(*) AS n FROM socis')!.n, abans + 3);
  const bona = D.get<{ data_naixement: string; iban: string; consentiment_data: string | null; categoria: string }>(
    "SELECT s.data_naixement, s.iban, s.consentiment_data, c.nom AS categoria FROM socis s JOIN categories_soci c ON c.id = s.categoria_id WHERE s.nom = 'Bona'",
  )!;
  assert.deepEqual({ ...bona }, { data_naixement: '1970-03-05', iban: 'ES9121000418450200051332', consentiment_data: null, categoria: 'Fundador' });
  assert.equal(D.get<{ g: string }>("SELECT genere AS g FROM socis WHERE nom = 'Sense alta'")!.g, 'dona');
  assert.equal(D.get<{ n: number }>("SELECT COUNT(*) AS n FROM socis_periodes p JOIN socis s ON s.id = p.soci_id WHERE s.nom IN ('Bona','Ja existent','Sense alta')")!.n, 3);
  // Si es torna a importar, ara tot són duplicats per DNI.
  r = await crida('POST', '/importa', { files: [files[0]], confirma: false });
  assert.match(r.cos.files[0].errors[0], /Ja hi ha un soci amb el DNI/);
});
