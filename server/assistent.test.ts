// Assistent de primera configuració: reprodueix la mateixa seqüència de crides a l'API que fa
// src/components/assistent/Assistent.tsx, contra un servidor real amb una base de dades temporal buida.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const dir = mkdtempSync(join(tmpdir(), 'assistent-prova-'));
const DB_PATH = join(dir, 'prova.db');
let proc: ChildProcess;
let base = '';

const portLliure = () =>
  new Promise<number>((resol) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resol(p));
    });
  });

async function crida(metode: string, cami: string, cos?: unknown, cookie = '') {
  const r = await fetch(base + '/api' + cami, {
    method: metode,
    headers: { ...(cos === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    body: cos === undefined ? undefined : JSON.stringify(cos),
  });
  const dades = r.status === 204 ? null : await r.json().catch(() => null);
  return { status: r.status, dades, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0] };
}

before(async () => {
  const port = await portLliure();
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.ts'], {
    env: { ...process.env, DB_PATH, PORT: String(port), HOST: '127.0.0.1', NODE_TEST_CONTEXT: '' },
    stdio: 'ignore',
  });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(`${base}/api/auth/estat`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("El servidor de prova no s'ha engegat.");
});

after(async () => {
  if (proc && proc.exitCode === null) {
    const acabat = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await acabat;
  }
  rmSync(dir, { recursive: true, force: true });
});

test("l'assistent configura una instal·lació nova de cap a peus", async () => {
  // Instal·lació nova: encara no hi ha usuaris.
  let r = await crida('GET', '/auth/estat');
  assert.equal(r.dades.configurat, false);

  // 1. Administrador i nom de l'entitat.
  r = await crida('POST', '/auth/primer-usuari', {
    entitat: 'Entitat de Prova', entitat_completa: 'Associació Entitat de Prova', nom: 'Anna Admin', usuari: 'anna', contrasenya: 'contrasenya-llarga',
  });
  assert.equal(r.status, 201);
  assert.equal(r.dades.rol, 'admin');
  const admin = r.cookie;
  assert.ok(admin.startsWith('sessio='));

  // Ja no es pot tornar a fer: l'administrador inicial no es crea mai dues vegades.
  r = await crida('POST', '/auth/primer-usuari', { entitat: 'X', nom: 'Y', usuari: 'y', contrasenya: 'contrasenya-llarga' });
  assert.equal(r.status, 409);

  // 2. Dades de l'entitat i acceptació de la llicència.
  const acceptada = new Date().toISOString();
  r = await crida('PUT', '/config', {
    nom: 'Entitat de Prova', nom_complet: 'Associació Entitat de Prova', nif: 'G12345678', adreca: 'Plaça Major, 1', poblacio: 'Pollença',
    codi_postal: '07460', email: 'info@exemple.org', telefon: '971000000', web: 'https://exemple.org', logo: '', idioma: 'es',
    llicencia_acceptada_el: acceptada, llicencia_acceptada_per: 'Anna Admin',
  }, admin);
  assert.equal(r.status, 200, JSON.stringify(r.dades));
  assert.equal(r.dades.llicencia_acceptada_el, acceptada);
  assert.equal(r.dades.llicencia_acceptada_per, 'Anna Admin');
  assert.equal(r.dades.idioma, 'es');

  // Una data mal formada es rebutja.
  r = await crida('PUT', '/config', { nom: 'Entitat de Prova', llicencia_acceptada_el: 'ahir' }, admin);
  assert.equal(r.status, 400);

  // 3. Usuaris de les persones clau, amb perfils diferents.
  const persones = [
    { nom: 'Pere President', usuari: 'pere.president', contrasenya: 'Bakuneto-4827', rol: 'junta' },
    { nom: 'Tina Tresorera', usuari: 'tina.tresorera', contrasenya: 'Rolimaso-1234', rol: 'tresoreria' },
    { nom: 'Carla Comunicació', usuari: 'carla.comunicacio', contrasenya: 'Venutido-9876', rol: 'comunicacio' },
  ];
  for (const p of persones) {
    r = await crida('POST', '/usuaris', p, admin);
    assert.equal(r.status, 201, JSON.stringify(r.dades));
    assert.equal(r.dades.rol, p.rol);
  }
  // Un nom d'usuari repetit falla (l'assistent ho mostra i deixa tornar-ho a provar).
  r = await crida('POST', '/usuaris', { ...persones[0], nom: 'Una altra' }, admin);
  assert.ok(r.status >= 400);

  // 4. Una de les persones pot entrar amb la contrasenya inicial i veu la llicència acceptada.
  r = await crida('POST', '/auth/entrar', { usuari: 'tina.tresorera', contrasenya: 'Rolimaso-1234' });
  assert.equal(r.status, 200);
  assert.equal(r.dades.rol, 'tresoreria');
  const tina = r.cookie;
  r = await crida('GET', '/config', undefined, tina);
  assert.equal(r.status, 200);
  assert.equal(r.dades.llicencia_acceptada_el, acceptada);
  assert.equal(r.dades.nom, 'Entitat de Prova');

  // Els perfils que no són d'administració no poden canviar la configuració (ni l'acceptació).
  r = await crida('PUT', '/config', { nom: 'Altre', llicencia_acceptada_el: acceptada }, tina);
  assert.equal(r.status, 403);

  r = await crida('GET', '/auth/estat');
  assert.equal(r.dades.configurat, true);
});
