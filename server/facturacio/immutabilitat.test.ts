// Comprova que la base de dades impedeix manipular factures emeses i registres de facturació,
// encara que s'hi accedeixi directament (fora del programa).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fac-test-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, run } = await import('../db.ts');

const serie = (db.prepare("SELECT id FROM series_factura WHERE codi = 'A'").get() as { id: number }).id;
const factura = run(
  "INSERT INTO factures (serie_id, tipus_factura, descripcio_operacio, total_cents) VALUES (?, 'F1', 'Prova', 12100)",
  serie,
).id;
run("INSERT INTO factura_linies (factura_id, concepte, preu_cents) VALUES (?, 'Servei', 10000)", factura);
run("UPDATE factures SET estat = 'emesa', num_serie = 'A2026-0001', data_expedicio = '2026-10-16' WHERE id = ?", factura);
run(
  `INSERT INTO registres_facturacio (tipus, factura_id, nif_emissor, num_serie, data_expedicio, data_hora_gen, huella, xml)
   VALUES ('alta', ?, 'G07123456', 'A2026-0001', '16-10-2026', '2026-10-16T10:00:00+02:00', 'ABC', '<x/>')`,
  factura,
);

const bloquejat = (sql: string, ...params: unknown[]) =>
  assert.throws(() => db.prepare(sql).run(...(params as never[])), /no es po(t|den)/);

test('no es pot canviar l’import d’una factura emesa', () => bloquejat('UPDATE factures SET total_cents = 1 WHERE id = ?', factura));
test('no es pot esborrar una factura emesa', () => bloquejat('DELETE FROM factures WHERE id = ?', factura));
test('no es poden afegir línies a una factura emesa', () =>
  bloquejat("INSERT INTO factura_linies (factura_id, concepte, preu_cents) VALUES (?, 'Extra', 100)", factura));
test('no es poden modificar les línies d’una factura emesa', () =>
  bloquejat('UPDATE factura_linies SET preu_cents = 1 WHERE factura_id = ?', factura));
test('no es pot modificar la huella d’un registre', () => bloquejat("UPDATE registres_facturacio SET huella = 'X'"));
test('no es pot esborrar un registre', () => bloquejat('DELETE FROM registres_facturacio'));
test('sí que es pot actualitzar l’estat de la remissió a l’AEAT', () => {
  db.prepare("UPDATE registres_facturacio SET estat_aeat = 'correcte'").run();
});
test('sí que es pot registrar el cobrament', () => {
  db.prepare("UPDATE factures SET cobrada_el = '2026-10-20' WHERE id = ?").run(factura);
});

test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
