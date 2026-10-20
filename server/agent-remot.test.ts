// Accés remot dels agents: OAuth per als connectors al núvol i port separat només per als agents.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { arrencaServidor } from './agent/prova-servidor.ts';
import type { ServidorProva } from './agent/prova-servidor.ts';

let srv: ServidorProva;
before(async () => {
  srv = await arrencaServidor();
});
after(async () => {
  await srv?.atura();
});

const json = async (r: Response) => (await r.json().catch(() => null)) as any;

/** Fa tot el recorregut OAuth com un connector al núvol i torna el testimoni. */
async function connectaPerOauth(base: string) {
  const reg = await fetch(`${base}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'Claude', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }),
  });
  assert.equal(reg.status, 201);
  const { client_id } = await json(reg);
  const verificador = randomBytes(32).toString('base64url');
  const repte = createHash('sha256').update(verificador).digest('base64url');
  const params = {
    response_type: 'code',
    client_id,
    redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
    code_challenge: repte,
    code_challenge_method: 'S256',
    state: 'estat-123',
  };
  const pagina = await fetch(`${base}/oauth/authorize?${new URLSearchParams(params)}`);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /name="codi"/);

  // Codi equivocat: es torna a mostrar la pàgina amb l'error.
  const dolent = await fetch(`${base}/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, codi: 'AAAA-BBBB' }),
    redirect: 'manual',
  });
  assert.equal(dolent.status, 400);

  // Codi de connexió generat dins del programa (amb la sessió de la persona).
  const { codi } = (await srv.api('POST', '/agent/codis-connexio', { nom: 'Claude.ai', mode: 'complet' })).cos;
  const bo = await fetch(`${base}/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, codi: codi.toLowerCase() }),
    redirect: 'manual',
  });
  assert.equal(bo.status, 302);
  const desti = new URL(bo.headers.get('location')!);
  assert.equal(desti.searchParams.get('state'), 'estat-123');
  const code = desti.searchParams.get('code')!;

  // Un verificador PKCE incorrecte no serveix (i el codi queda gastat).
  const tok = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verificador, client_id, redirect_uri: params.redirect_uri }),
  });
  assert.equal(tok.status, 200);
  const testimoni = await json(tok);
  assert.equal(testimoni.token_type, 'Bearer');
  const repetit = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verificador }),
  });
  assert.equal(repetit.status, 400, 'un codi d’autorització només serveix una vegada');
  // El codi de connexió tampoc no es pot reutilitzar.
  const reus = await fetch(`${base}/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, codi }),
    redirect: 'manual',
  });
  assert.equal(reus.status, 400);
  return testimoni.access_token as string;
}

test('metadades OAuth i pista d’autorització a la resposta 401', async () => {
  const recurs = await json(await fetch(`${srv.base}/.well-known/oauth-protected-resource`));
  assert.match(recurs.resource, /\/api\/agent-ia\/mcp$/);
  const servidor = await json(await fetch(`${srv.base}/.well-known/oauth-authorization-server`));
  assert.deepEqual(servidor.code_challenge_methods_supported, ['S256']);
  const r = await fetch(`${srv.base}/api/agent-ia/mcp`, { method: 'POST', body: '{}' });
  assert.equal(r.status, 401);
  assert.match(r.headers.get('www-authenticate') ?? '', /resource_metadata="[^"]+\/\.well-known\/oauth-protected-resource"/);
});

test('un connector al núvol es connecta per OAuth amb un codi de connexió i pot fer servir les eines', async () => {
  const clau = await connectaPerOauth(srv.base);
  const r = await fetch(`${srv.base}/api/agent-ia/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clau}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.equal(r.status, 200);
  assert.ok((await json(r)).result.tools.length > 10);
  // Queda com una clau més de la persona (revocable).
  const claus = (await srv.api('GET', '/agent/claus')).cos as { nom: string }[];
  assert.ok(claus.some((c) => c.nom.startsWith('Claude.ai')));
});

const portLliure = () =>
  new Promise<number>((resol) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resol(p));
    });
  });

test('el port dels agents només serveix l’entrada dels agents i OAuth', async () => {
  const port = await portLliure();
  const conf = await srv.api('PUT', '/config/acces-remot', { agent_port_actiu: true, agent_port: port });
  assert.equal(conf.status, 200);
  assert.equal(conf.cos.servidor_agents.actiu, true);
  const base = `http://127.0.0.1:${port}`;
  // El programa no hi és.
  assert.equal((await fetch(`${base}/api/socis`)).status, 404);
  assert.equal((await fetch(`${base}/api/auth/estat`)).status, 404);
  assert.equal((await fetch(`${base}/index.html`)).status, 404);
  // L'entrada dels agents i OAuth sí.
  assert.equal((await fetch(`${base}/.well-known/oauth-authorization-server`)).status, 200);
  const clau = await connectaPerOauth(base);
  const r = await fetch(`${base}/api/agent-ia/eines`, { headers: { Authorization: `Bearer ${clau}` } });
  assert.equal(r.status, 200);
  // En desactivar-lo, el port deixa d'escoltar.
  await srv.api('PUT', '/config/acces-remot', { agent_port_actiu: false });
  await assert.rejects(fetch(`${base}/`));
});
