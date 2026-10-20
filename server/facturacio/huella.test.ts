// Comprova la huella amb els tres exemples oficials de l'AEAT (especificació v0.1.2).
// Executa: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { huellaAlta, huellaAnulacio, sha256Hex } from './huella.ts';

test('cas 1: primer registre d’alta', () => {
  assert.equal(
    huellaAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.45',
      HuellaAnterior: '',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:30+01:00',
    }),
    '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60',
  );
});

test('cas 2: alta encadenada', () => {
  assert.equal(
    huellaAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345679/G34',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.45',
      HuellaAnterior: '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:35+01:00',
    }),
    'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97',
  );
});

test('cas 3: anul·lació encadenada', () => {
  assert.equal(
    huellaAnulacio({
      IDEmisorFacturaAnulada: '89890001K',
      NumSerieFacturaAnulada: '12345679/G34',
      FechaExpedicionFacturaAnulada: '01-01-2024',
      HuellaAnterior: 'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:40+01:00',
    }),
    '177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68',
  );
});

test('SHA-256 propi = node:crypto', () => {
  for (const t of ['', 'abc', 'Associació I ara qué? · Pollença', 'x'.repeat(55), 'y'.repeat(64), 'z'.repeat(1000)])
    assert.equal(sha256Hex(t), createHash('sha256').update(t, 'utf8').digest('hex').toUpperCase());
});
