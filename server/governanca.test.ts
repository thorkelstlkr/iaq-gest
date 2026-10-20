// Òrgans de govern: quòrum, immutabilitat de les actes aprovades, destinataris de la convocatòria i junta vigent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'gov-test-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, run, get, setConfig } = await import('./db.ts');
const { quorum, destinatarisConvocatoria, juntaActual, votants, antelacio, diesEntre } = await import('./routes/governanca.ts');
const { avisos } = await import('./avisos/governanca.ts');
const { avui, sumaDies } = await import('../shared/dates.ts');

const categoria = (nom: string) => get<{ id: number }>('SELECT id FROM categories_soci WHERE nom = ?', nom)!.id;
let num = 0;
function soci(nom: string, opcions: { email?: string | null; naixement?: string; baixa?: string; categoria?: string; comunicacions?: number; anonimitzat?: boolean } = {}) {
  return run(
    `INSERT INTO socis (num_soci, nom, llinatges, email, data_naixement, data_alta, data_baixa, categoria_id, accepta_comunicacions, anonimitzat_el)
     VALUES (?, ?, 'Prova', ?, ?, '2024-01-01', ?, ?, ?, ?)`,
    ++num, nom, opcions.email === undefined ? `${nom.toLowerCase()}@exemple.cat` : opcions.email, opcions.naixement ?? '1980-01-01',
    opcions.baixa ?? null, opcions.categoria ? categoria(opcions.categoria) : null, opcions.comunicacions ?? 1,
    opcions.anonimitzat ? '2026-01-01' : null,
  ).id;
}

// Cens: 6 socis amb vot (un sense correu i un que no vol rebre comunicacions).
const votantsIds = [
  soci('Aina'),
  soci('Biel'),
  soci('Caterina', { comunicacions: 0 }),
  soci('Damià', { email: null }),
  soci('Elena', { categoria: 'Numerari' }),
  soci('Felip'),
];
// Sense vot: baixa, menor d'edat, categoria sense vot, anonimitzat.
const exclosos = [
  soci('Gori', { baixa: '2025-01-01' }),
  soci('Hug', { naixement: sumaDies(-365 * 10) }),
  soci('Irene', { categoria: "D'honor" }),
  soci('Jaume', { anonimitzat: true }),
];
// Sol·licitud d'admissió pendent: tampoc no vota.
const pendent = soci('Karme');
run("UPDATE socis SET estat_admissio = 'sollicitada', data_baixa = data_alta WHERE id = ?", pendent);
exclosos.push(pendent);

const reunio = (organ: string, data: string, estat = 'prevista') =>
  run("INSERT INTO reunions (organ, tipus, data, estat, ordre_dia) VALUES (?, 'ordinaria', ?, ?, '[\"Comptes\"]')", organ, data, estat).id;

test('socis amb dret a vot', () => {
  const ids = votants().map((s) => s.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [...votantsIds].sort((a, b) => a - b));
});

test('quòrum de l’assemblea: presents i representats sobre el cens', () => {
  setConfig('gov_quorum_1a', '50');
  const r = reunio('assemblea', avui(), 'celebrada');
  const [a, b, c] = votantsIds;
  run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma) VALUES (?, ?, 'A', 'present')", r, a);
  run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma, representant_id) VALUES (?, ?, 'B', 'representat', ?)", r, b, a);
  // Un assistent sense vot no compta per al quòrum.
  run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma) VALUES (?, ?, 'I', 'present')", r, exclosos[2]);
  let q = quorum(r);
  assert.equal(q.cens, 6);
  assert.equal(q.presents, 1);
  assert.equal(q.representats, 1);
  assert.equal(q.total, 2);
  assert.equal(q.percentatge, 33.3);
  assert.equal(q.necessaris_1a, 3);
  assert.equal(q.arriba_1a, false);
  assert.equal(q.arriba_2a, true);
  run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma) VALUES (?, ?, 'C', 'present')", r, c);
  q = quorum(r);
  assert.equal(q.total, 3);
  assert.equal(q.arriba_1a, true);
  setConfig('gov_quorum_1a', '60');
  assert.equal(quorum(r).necessaris_1a, 4);
  assert.equal(quorum(r).arriba_1a, false);
  setConfig('gov_quorum_1a', '50');
});

test('avís d’antelació de la convocatòria', () => {
  setConfig('gov_dies_convocatoria', '15');
  assert.equal(diesEntre('2026-10-01', '2026-10-16'), 15);
  const base = { id: 0, organ: 'assemblea', tipus: 'ordinaria', titol: null, hora_1a: null, hora_2a: null, lloc: null, ordre_dia: '[]', convocatoria_celebrada: null, notes: null } as const;
  assert.equal(antelacio({ ...base, data: '2026-10-16', estat: 'convocada', data_convocatoria: '2026-10-01' }), null);
  assert.deepEqual(antelacio({ ...base, data: '2026-10-16', estat: 'convocada', data_convocatoria: '2026-10-06' }), { dies: 10, minim: 15, convocada: true });
  assert.equal(antelacio({ ...base, organ: 'junta', data: '2026-10-16', estat: 'convocada', data_convocatoria: '2026-10-15' }), null);
});

test('la convocatòria va a tots els socis amb vot, encara que no vulguin comunicacions', () => {
  const r = reunio('assemblea', sumaDies(20));
  const d = destinatarisConvocatoria(r);
  const amb = d.amb_email.map((s) => s.nom).sort();
  assert.deepEqual(amb, ['Aina', 'Biel', 'Caterina', 'Elena', 'Felip']);
  assert.deepEqual(d.sense_email.map((s) => s.nom), ['Damià']);
  const tots = [...d.amb_email, ...d.sense_email].map((s) => s.id);
  for (const e of exclosos) assert.ok(!tots.includes(e), 'no hi ha de ser un soci sense vot o inactiu');
});

test('junta actual i convocatòria de la junta', () => {
  const [a, b, c, , e] = votantsIds;
  run("INSERT INTO carrecs (soci_id, carrec, data_eleccio, data_fi_mandat) VALUES (?, 'presidencia', '2025-03-01', '2029-03-01')", a);
  run("INSERT INTO carrecs (soci_id, carrec, data_eleccio, data_cessament) VALUES (?, 'secretaria', '2021-03-01', '2025-03-01')", c);
  run("INSERT INTO carrecs (soci_id, carrec, data_eleccio) VALUES (?, 'secretaria', '2025-03-01')", b);
  run("INSERT INTO carrecs (soci_id, carrec, data_eleccio) VALUES (?, 'vocal', '2025-03-01')", e);
  run("INSERT INTO carrecs (soci_id, carrec, data_eleccio) VALUES (?, 'vocal', ?)", c, sumaDies(10)); // encara no vigent
  const j = juntaActual();
  assert.deepEqual(j.presidencia, { soci_id: a, nom: 'Aina Prova' });
  assert.deepEqual(j.secretaria, { soci_id: b, nom: 'Biel Prova' });
  assert.equal(j.tresoreria, null);
  assert.equal(j.vicepresidencia, null);
  assert.deepEqual(j.vocals, [{ soci_id: e, nom: 'Elena Prova' }]);
  assert.equal(juntaActual('2024-06-01').secretaria?.soci_id, c);

  const r = reunio('junta', sumaDies(5));
  const d = destinatarisConvocatoria(r);
  assert.deepEqual(d.amb_email.map((s) => s.id).sort(), [a, b, e].sort());
  const q = quorum(r);
  assert.equal(q.cens, 3);
  assert.equal(q.necessaris_1a, 2);
});

test('una acta aprovada no es pot modificar ni esborrar, ni tampoc els acords i l’assistència', () => {
  const r = reunio('assemblea', '2026-03-01', 'celebrada');
  run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom) VALUES (?, ?, 'Aina Prova')", r, votantsIds[0]);
  const acord = run("INSERT INTO acords (reunio_id, punt, text) VALUES (?, 1, 'Comptes aprovats')", r).id;
  const acta = run("INSERT INTO actes (reunio_id, organ, any, numero, text) VALUES (?, 'assemblea', 2026, 1, 'Text')", r).id;
  // Mentre és esborrany, sí que es pot canviar.
  run("UPDATE actes SET text = 'Text revisat' WHERE id = ?", acta);
  run("UPDATE acords SET text = 'Comptes de 2025 aprovats' WHERE id = ?", acord);
  run("UPDATE actes SET tancada = 1, data_aprovacio = '2026-03-01' WHERE id = ?", acta);

  const bloquejat = (sql: string, ...params: unknown[]) =>
    assert.throws(() => db.prepare(sql).run(...(params as never[])), /no es pot|no es poden/);
  bloquejat("UPDATE actes SET text = 'Manipulat' WHERE id = ?", acta);
  bloquejat('UPDATE actes SET tancada = 0 WHERE id = ?', acta);
  bloquejat('DELETE FROM actes WHERE id = ?', acta);
  bloquejat("UPDATE acords SET text = 'Manipulat' WHERE id = ?", acord);
  bloquejat('DELETE FROM acords WHERE id = ?', acord);
  bloquejat("INSERT INTO acords (reunio_id, text) VALUES (?, 'Nou')", r);
  bloquejat("UPDATE reunio_assistents SET forma = 'representat' WHERE reunio_id = ?", r);
  bloquejat('DELETE FROM reunio_assistents WHERE reunio_id = ?', r);
  bloquejat("INSERT INTO reunio_assistents (reunio_id, soci_id, nom) VALUES (?, ?, 'Biel')", r, votantsIds[1]);
  bloquejat("UPDATE reunions SET data = '2026-03-02' WHERE id = ?", r);
  bloquejat('DELETE FROM reunions WHERE id = ?', r);
  assert.equal(get<{ text: string }>('SELECT text FROM actes WHERE id = ?', acta)!.text, 'Text revisat');
});

test('avisos: canvis pendents de comunicar al Registre i mandats', () => {
  const textos = avisos().map((a) => a.text);
  assert.ok(textos.some((t) => t.includes('pendents de comunicar')));
  run("UPDATE carrecs SET data_fi_mandat = ? WHERE carrec = 'presidencia'", sumaDies(20));
  assert.ok(avisos().some((a) => a.text.includes('acaba el')));
});

test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
