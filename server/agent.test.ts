// Agents d'IA: MCP, permisos segons el perfil de la persona, claus revocades i filtre de dades sensibles.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { filtraSensible } from './agent/filtre.ts';
import { arrencaServidor } from './agent/prova-servidor.ts';
import type { ServidorProva } from './agent/prova-servidor.ts';

test('el filtre treu les dades sensibles i converteix la data de naixement en edat', () => {
  const f = filtraSensible({
    socis: [{ id: 1, nom: 'Aina', dni: '43000000M', iban: 'ES91…', data_naixement: '2000-01-01', email: 'a@b.c', adreca: 'C/ Major', foto: 'data:image/jpeg;base64,AAA', categoria: 'Numerari' }],
  }) as { socis: Record<string, unknown>[] };
  const s = f.socis[0];
  assert.equal(s.nom, 'Aina');
  assert.equal(s.categoria, 'Numerari');
  for (const k of ['dni', 'iban', 'data_naixement', 'email', 'adreca', 'foto']) assert.ok(!(k in s), k);
  assert.equal(typeof s.edat, 'number');
});

let srv: ServidorProva;
before(async () => {
  srv = await arrencaServidor();
});
after(async () => {
  await srv?.atura();
});

const mcp = async (metode: string, params?: unknown, clau = srv.clau) => {
  const r = await fetch(`${srv.base}/api/agent-ia/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clau}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metode, params }),
  });
  return { status: r.status, cos: (await r.json().catch(() => null)) as any };
};

test('MCP: inicialització, llista d’eines i crida', async () => {
  const ini = await mcp('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(ini.cos.result.protocolVersion, '2025-03-26');
  assert.match(ini.cos.result.instructions, /cents/);
  const llista = await mcp('tools/list');
  const noms = llista.cos.result.tools.map((t: { name: string }) => t.name);
  assert.ok(noms.includes('get_overview'));
  const crida = await mcp('tools/call', { name: 'get_overview', arguments: { year: 2026 } });
  assert.equal(crida.cos.result.isError, undefined);
  assert.match(crida.cos.result.content[0].text, /socis_actius/);
  const inexistent = await mcp('tools/call', { name: 'no_existeix', arguments: {} });
  assert.equal(inexistent.cos.result.isError, true);
});

test('la clau només obre les eines: no dona accés a la resta de l’API', async () => {
  const r = await fetch(`${srv.base}/api/socis`, { headers: { Authorization: `Bearer ${srv.clau}` } });
  assert.equal(r.status, 401);
  const fals = await mcp('tools/list', undefined, 'iaq_inventada');
  assert.equal(fals.status, 401);
});

test('OpenAPI per als models amb «function calling»', async () => {
  const r = await fetch(`${srv.base}/api/agent-ia/openapi.json`, { headers: { Authorization: `Bearer ${srv.clau}` } });
  const spec = (await r.json()) as { openapi: string; paths: Record<string, unknown> };
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.paths['/api/agent-ia/eines/get_alerts']);
});

test('una clau revocada deixa de funcionar i l’activitat queda registrada', async () => {
  const nova = await srv.api('POST', '/agent/claus', { nom: 'Temporal' });
  assert.equal(nova.status, 201);
  assert.equal((await mcp('tools/list', undefined, nova.cos.clau)).status, 200);
  assert.equal((await srv.api('DELETE', `/agent/claus/${nova.cos.id}`)).status, 204);
  assert.equal((await mcp('tools/list', undefined, nova.cos.clau)).status, 401);
  const registre = await srv.api('GET', '/agent/registre');
  assert.ok(registre.cos.some((r: { eina: string }) => r.eina === 'get_overview'));
});

test('el perfil limita les eines: comunicació no veu les de tresoreria ni informes', async () => {
  const altre = await arrencaServidor({ rol: 'comunicacio' });
  try {
    const r = await fetch(`${altre.base}/api/agent-ia/eines`, { headers: { Authorization: `Bearer ${altre.clau}` } });
    const eines = (await r.json()) as { name: string }[];
    assert.ok(!eines.some((e) => e.name === 'get_overview'));
    const prohibida = await altre.eina('get_overview', {});
    assert.equal(prohibida.status, 404);
  } finally {
    await altre.atura();
  }
});
