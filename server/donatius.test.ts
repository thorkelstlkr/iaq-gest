// Donatius: recurrència i percentatges de deducció, codi de província, resum del model 182,
// calendari d'obligacions (amb i sense taules opcionals) i amortització de l'inventari.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'donatius-test-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, run, setConfig } = await import('./db.ts');
const d = await import('./routes/donatius.ts');
const { calendari } = await import('./calendari.ts');
const { avisos } = await import('./avisos/donatius.ts');

test('codi de província a partir del codi postal', () => {
  assert.equal(d.codiProvincia('07460'), '07');
  assert.equal(d.codiProvincia(' 08001 '), '08');
  assert.equal(d.codiProvincia('52001'), '52');
  assert.equal(d.codiProvincia('53001'), null);
  assert.equal(d.codiProvincia('00123'), null);
  assert.equal(d.codiProvincia('7460'), null);
  assert.equal(d.codiProvincia(null), null);
});

test('validació del NIF: DNI, NIE i entitats', () => {
  assert.equal(d.validaNif('43.123.456-c'), '43123456C');
  assert.throws(() => d.validaNif('43123456A'));
  assert.equal(d.validaNif('X1234567L'), 'X1234567L');
  assert.equal(d.validaNif('B07123458'), 'B07123458');
  assert.throws(() => d.validaNif('B07123459'));
  assert.equal(d.validaNif('G07000003'), 'G07000003');
  assert.equal(d.validaNif('P0704200E'), 'P0704200E');
  assert.equal(d.validaNif('PASSAPORT1'), 'PASSAPORT1');
});

test('recurrència: dos anys anteriors amb imports iguals o creixents', () => {
  assert.equal(d.esRecurrent({ 2023: 100_00, 2024: 100_00, 2025: 100_00 }, 2025), true);
  assert.equal(d.esRecurrent({ 2023: 100_00, 2024: 150_00, 2025: 200_00 }, 2025), true);
  assert.equal(d.esRecurrent({ 2024: 100_00, 2025: 100_00 }, 2025), false, 'falta l’any -2');
  assert.equal(d.esRecurrent({ 2023: 200_00, 2024: 100_00, 2025: 150_00 }, 2025), false, 'l’any -1 baixa');
  assert.equal(d.esRecurrent({ 2023: 100_00, 2024: 150_00, 2025: 120_00 }, 2025), false, 'enguany baixa');
  assert.equal(d.esRecurrent(new Map([[2023, 50_00], [2024, 50_00], [2025, 80_00]]), 2025), true);
});

test('percentatges i deducció (2024 i posteriors)', () => {
  assert.deepEqual(d.percentatges('fisica', false), { fins_250: 80, resta: 40 });
  assert.deepEqual(d.percentatges('fisica', true), { fins_250: 80, resta: 45 });
  assert.deepEqual(d.percentatges('juridica', false), { fins_250: null, resta: 40 });
  assert.deepEqual(d.percentatges('juridica', true), { fins_250: null, resta: 50 });
  assert.equal(d.deduccio('fisica', 100_00, false), 80_00);
  assert.equal(d.deduccio('fisica', 250_00, false), 200_00);
  assert.equal(d.deduccio('fisica', 350_00, false), 240_00);
  assert.equal(d.deduccio('fisica', 350_00, true), 245_00);
  assert.equal(d.deduccio('juridica', 1000_00, false), 400_00);
  assert.equal(d.deduccio('juridica', 1000_00, true), 500_00);
});

test('resum del model 182: agregació per donant, recurrència, espècie, sense NIF i revocades', () => {
  const base = { tipus_persona: 'fisica' as const, codi_provincia: '07', import_cents: 0, en_especie: 0, valoracio_cents: null, revocada: 0 };
  const files = d.resum182(
    [
      { ...base, nom: 'Aina Llompart', nif: '43123456C', data: '2023-05-01', import_cents: 50_00 },
      { ...base, nom: 'Aina Llompart', nif: '43123456C', data: '2024-05-01', import_cents: 60_00 },
      { ...base, nom: 'Aina Llompart', nif: '43123456C', data: '2025-03-01', import_cents: 40_00 },
      { ...base, nom: 'Aina Llompart', nif: '43123456c', data: '2025-12-01', import_cents: 30_00 },
      { ...base, nom: 'Forn Can Biel SL', nif: 'B07123458', tipus_persona: 'juridica', data: '2025-06-01', import_cents: 500_00 },
      { ...base, nom: 'Joan Pons', nif: null, codi_provincia: null, codi_postal: '07460', data: '2025-07-01', import_cents: 20_00 },
      { ...base, nom: 'Joan Pons', nif: null, codi_provincia: null, data: '2025-08-01', en_especie: 1, valoracio_cents: 300_00 },
      { ...base, nom: 'Revocat', nif: '12345678Z', data: '2025-02-01', import_cents: 100_00, revocada: 1 },
      { ...base, nom: 'Antic', nif: '87654321X', data: '2022-02-01', import_cents: 100_00 },
    ],
    2025,
  );
  assert.equal(files.length, 3);
  const aina = files.find((f) => f.nif?.toUpperCase() === '43123456C')!;
  assert.equal(aina.total_cents, 70_00);
  assert.equal(aina.donacions, 2);
  assert.equal(aina.recurrent, true);
  assert.equal(aina.percentatge_resta, 45);
  assert.equal(aina.import_anterior_cents, 60_00);
  const forn = files.find((f) => f.nif === 'B07123458')!;
  assert.equal(forn.naturalesa, 'J');
  assert.equal(forn.recurrent, false);
  assert.equal(forn.deduccio_cents, 200_00);
  const joan = files.find((f) => f.nom === 'Joan Pons')!;
  assert.equal(joan.declarable, false);
  assert.equal(joan.en_especie, true);
  assert.equal(joan.total_cents, 320_00);
  assert.equal(joan.codi_provincia, '07', 'derivat del codi postal');
});

test('amortització lineal i valor net comptable', () => {
  const be = { valor_adquisicio_cents: 1200_00, data_adquisicio: '2024-01-01', vida_util_anys: 4 };
  assert.deepEqual(d.amortitzacio(be, '2024-12-31'), { anual_cents: 300_00, acumulada_cents: 300_00, net_cents: 900_00, de_baixa: false });
  assert.equal(d.amortitzacio(be, '2024-06-30').acumulada_cents, 150_00);
  assert.equal(d.amortitzacio(be, '2030-01-01').net_cents, 0);
  assert.equal(d.amortitzacio(be, '2023-01-01').net_cents, 0, 'abans de l’adquisició');
  assert.equal(d.amortitzacioAny({ ...be, data_adquisicio: '2024-07-01' }, 2024), 150_00);
  assert.equal(d.amortitzacioAny({ ...be, data_adquisicio: '2024-07-01' }, 2025), 300_00);
  assert.equal(d.amortitzacioAny({ ...be, data_adquisicio: '2024-07-01' }, 2028), 150_00);
  assert.equal(d.amortitzacioAny({ ...be, data_adquisicio: '2024-07-01' }, 2029), 0);
  const baixa = d.amortitzacio({ ...be, data_baixa: '2025-03-31' }, '2026-01-01');
  assert.equal(baixa.de_baixa, true);
  assert.equal(baixa.net_cents, 0);
  assert.equal(baixa.acumulada_cents, 375_00);
  // Sense vida útil (p. ex. vestuari tradicional): no s'amortitza.
  assert.equal(d.amortitzacio({ ...be, vida_util_anys: null }, '2030-01-01').net_cents, 1200_00);
});

const estatDe = (items: { clau: string; estat: string }[], clau: string) => items.find((i) => i.clau === clau)?.estat;

test('calendari sense taules opcionals', () => {
  db.exec('DROP TABLE IF EXISTS assegurances_voluntaris; DROP TABLE IF EXISTS assegurances; DROP TABLE IF EXISTS subvencio_imputacions; DROP TABLE IF EXISTS subvencions;');
  setConfig('regim_49_2002', 'no');
  const items = calendari(2026, '2026-03-01');
  assert.ok(items.length >= 9);
  assert.deepEqual([...items].map((i) => i.data), [...items].map((i) => i.data).sort());
  assert.equal(estatDe(items, 'assemblea'), 'pendent');
  assert.equal(estatDe(items, 'model182'), 'no_aplica');
  assert.equal(items.find((i) => i.clau === 'model347')?.data, '2026-02-28');
  assert.equal(calendari(2028, '2028-03-01').find((i) => i.clau === 'model347')?.data, '2028-02-29');
  assert.ok(!items.some((i) => i.clau.startsWith('asseguranca_') || i.clau.startsWith('subvencio_')));
});

test('calendari amb assemblea, règim 49/2002, assegurances i subvencions', () => {
  run("INSERT INTO reunions (organ, tipus, data, estat) VALUES ('assemblea', 'ordinaria', '2026-04-11', 'celebrada')");
  setConfig('regim_49_2002', 'si');
  run("INSERT INTO donatius (nom, nif, data, import_cents) VALUES ('Aina', '43123456C', '2025-05-01', 5000)");
  db.exec(`
    CREATE TABLE assegurances (id INTEGER PRIMARY KEY, asseguradora TEXT NOT NULL, tipus TEXT, data_venciment TEXT NOT NULL, no_renovar INTEGER NOT NULL DEFAULT 0);
    INSERT INTO assegurances (asseguradora, tipus, data_venciment) VALUES ('Mútua Balear', 'responsabilitat_civil', '2026-05-31');
    INSERT INTO assegurances (asseguradora, tipus, data_venciment) VALUES ('Mútua Balear', 'responsabilitat_civil', '2027-05-31');
    INSERT INTO assegurances (asseguradora, tipus, data_venciment) VALUES ('Caser', 'accidents_voluntaris', '2026-09-30');
    CREATE TABLE subvencions (id INTEGER PRIMARY KEY, organisme TEXT NOT NULL, convocatoria TEXT, termini_justificacio TEXT, estat TEXT, data_justificacio TEXT);
    INSERT INTO subvencions (organisme, convocatoria, termini_justificacio, estat) VALUES ('Consell de Mallorca', 'Cultura 2026', '2026-11-30', 'concedida');
    INSERT INTO subvencions (organisme, termini_justificacio, estat, data_justificacio) VALUES ('Ajuntament de Pollença', '2026-03-31', 'justificada', '2026-03-20');
    INSERT INTO subvencions (organisme, termini_justificacio, estat) VALUES ('Govern', '2026-06-30', 'denegada');
  `);
  const items = calendari(2026, '2026-03-01');
  assert.equal(estatDe(items, 'assemblea'), 'fet');
  assert.equal(estatDe(items, 'model182'), 'pendent');
  const asseg = items.filter((i) => i.clau.startsWith('asseguranca_'));
  assert.equal(asseg.length, 2);
  assert.deepEqual(asseg.map((a) => a.estat).sort(), ['fet', 'pendent']);
  const subv = items.filter((i) => i.clau.startsWith('subvencio_'));
  assert.equal(subv.length, 2);
  assert.deepEqual(subv.map((s) => s.estat), ['fet', 'pendent']);
  // Marca manual del 182.
  setConfig('calendari_fets_2026', JSON.stringify(['model182']));
  assert.equal(estatDe(calendari(2026, '2026-03-01'), 'model182'), 'fet');
});

test('avisos: donacions sense certificat', () => {
  const llista = avisos();
  assert.ok(llista.every((a) => a.modul === 'economia' && a.enllac === '/donatius'));
});
