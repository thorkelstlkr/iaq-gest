// Detecció de carpetes sincronitzades amb el núvol (Google Drive, OneDrive, Dropbox) per a les còpies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('detecta Google Drive, OneDrive i Dropbox i hi crea la subcarpeta de còpies', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nuvol-'));
  const casa = join(dir, 'casa');
  mkdirSync(join(casa, 'Google Drive', 'My Drive'), { recursive: true });
  mkdirSync(join(casa, 'Dropbox'), { recursive: true });
  mkdirSync(join(dir, 'OneDrive - Associacio'), { recursive: true });
  process.env.DB_PATH = join(dir, 'dades', 'prova.db');
  process.env.USERPROFILE = casa;
  process.env.HOME = casa;
  process.env.OneDrive = join(dir, 'OneDrive - Associacio');
  const { db, setConfig, getConfig } = await import('./db.ts');
  const { detectaCarpetesNuvol, usaCarpetaNuvol } = await import('./copies.ts');
  setConfig('nom', 'I ara qué?');

  // Sense buscar unitats reals (G:, H:…): la prova no ha de tocar mai el Google Drive de l'ordinador.
  const trobades = detectaCarpetesNuvol({ unitats: false });
  assert.ok(trobades.every((c) => c.arrel.startsWith(dir)), 'només carpetes de la prova');
  const serveis = trobades.map((c) => c.servei);
  assert.ok(serveis.includes('Google Drive'));
  assert.ok(serveis.includes('Dropbox'));
  assert.ok(serveis.includes('OneDrive'));

  const drive = trobades.find((c) => c.servei === 'Google Drive')!;
  const carpeta = usaCarpetaNuvol(drive.arrel, { unitats: false });
  assert.ok(existsSync(carpeta), 'crea la subcarpeta de còpies');
  assert.equal(getConfig('copia_carpeta_externa'), carpeta);
  assert.throws(() => usaCarpetaNuvol(join(dir, 'una-altra'), { unitats: false }), /no s'ha trobat/);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});
