// Comprova la traducció dels missatges del servidor i de la web generada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tr, tradueix } from './i18n.ts';

test('missatge fix', () => {
  assert.equal(tradueix('Cal iniciar sessió.', 'es'), 'Hay que iniciar sesión.');
  assert.equal(tradueix('Cal iniciar sessió.', 'en'), 'Please sign in.');
  assert.equal(tradueix('Cal iniciar sessió.', 'ca'), 'Cal iniciar sessió.');
});

test('missatge amb valors: es tradueix la plantilla i el nom del camp', () => {
  assert.equal(tradueix('El camp «Nom» és obligatori.', 'es'), 'El campo «Nombre» es obligatorio.');
  assert.equal(tradueix('El camp «Data de naixement» és obligatori.', 'en'), 'The field “Date of birth” is required.');
  assert.equal(tradueix('Línia 3: preu no vàlid.', 'es'), 'Línea 3: precio no válido.');
});

test('text desconegut: es queda igual', () => {
  assert.equal(tradueix('Un text que no és al diccionari', 'es'), 'Un text que no és al diccionari');
});

test('tr amb valors', () => {
  assert.equal(tr('en', 'Del {0} al {1}', '1 May 2026', '3 May 2026'), 'From 1 May 2026 to 3 May 2026');
});

test('la web es genera en castellà i anglès', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'web-i18n-'));
  process.env.DB_PATH = join(dir, 'prova.db');
  const { setConfig, db } = await import('./db.ts');
  const { generaWeb, dataLlarga } = await import('./web/generador.ts');
  setConfig('nom', 'Entitat de prova');
  setConfig('web_idioma', 'es');
  let index = String(generaWeb({ previsualitzacio: true }).get('index.html'));
  assert.match(index, /<html lang="es">/);
  assert.match(index, />Hazte socio</);
  assert.match(String(generaWeb({ previsualitzacio: true }).get('privacitat.html')), /Política de privacidad/);
  setConfig('web_idioma', 'en');
  index = String(generaWeb({ previsualitzacio: true }).get('index.html'));
  assert.match(index, />Become a member</);
  assert.equal(dataLlarga('2026-10-17', true, 'en'), 'Saturday, 17 October 2026');
  assert.equal(dataLlarga('2026-10-17', true, 'es'), 'sábado, 17 de octubre de 2026');
  assert.equal(dataLlarga('2026-04-17', false, 'ca'), "17 d'abril de 2026");
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("una notícia amb data d'avui surt a la web encara que en UTC sigui ahir", async () => {
  const { dataLocal, sumaDies } = await import('../shared/dates.ts');
  // 17/10 a les 0:30 a Mallorca (UTC+2) són les 22:30 del 16/10 en UTC.
  const mitjanit = new Date(2026, 9, 17, 0, 30);
  assert.equal(dataLocal(mitjanit), '2026-10-17');
  assert.equal(sumaDies(-1, mitjanit), '2026-10-16');
  assert.equal(sumaDies(15, new Date(2026, 9, 20, 12)), '2026-11-04');
});
