// OAuth 2.1 per als connectors al núvol (Claude.ai, ChatGPT…), segons l'especificació d'autorització de MCP:
// metadades del recurs protegit (RFC 9728) i del servidor d'autorització (RFC 8414), registre dinàmic de
// clients (RFC 7591) i codi d'autorització amb PKCE (S256).
//
// La pàgina d'autorització NO demana la contrasenya del programa: demana un «codi de connexió» d'un sol ús
// que la persona genera dins del programa (El meu agent d'IA). Així la contrasenya mai no passa pel túnel
// d'internet, i el resultat és una clau personal com qualsevol altra (revocable, amb els permisos de la persona).
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { get, getConfig, run } from '../db.ts';
import { registraSistema } from '../auditoria.ts';
import { creaClau } from './executor.ts';

export const oauthRouter = Router();
oauthRouter.use(express.urlencoded({ extended: false, limit: '20kb' }));

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const base64url = (b: Buffer) => b.toString('base64url');
const escapa = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Adreça pública: la configurada o la que arriba pel túnel (capçaleres X-Forwarded-*). */
export function urlPublica(req: Request): string {
  const configurada = (getConfig('agent_url_publica') || '').replace(/\/+$/, '');
  if (configurada) return configurada;
  const proto = String(req.headers['x-forwarded-proto'] ?? req.protocol).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] ?? req.get('host') ?? '').split(',')[0].trim();
  return `${proto}://${host}`;
}

export const urlMetadadesRecurs = (req: Request) => `${urlPublica(req)}/.well-known/oauth-protected-resource`;

// ---------- Codis de connexió (es generen dins del programa) ----------

const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const normalitzaCodi = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function creaCodiConnexio(o: { usuariId: number; nom: string; mode: 'lectura' | 'complet' }) {
  const bytes = randomBytes(8);
  const codi = Array.from(bytes, (b) => ALFABET[b % ALFABET.length]).join('');
  const caduca = new Date(Date.now() + 10 * 60_000).toISOString();
  run('DELETE FROM agent_codis_connexio WHERE caduca < ?', new Date().toISOString());
  run('INSERT INTO agent_codis_connexio (usuari_id, hash, nom, mode, caduca) VALUES (?, ?, ?, ?, ?)', o.usuariId, sha256(codi), o.nom, o.mode, caduca);
  return { codi: `${codi.slice(0, 4)}-${codi.slice(4)}`, caduca };
}

// Límit d'intents a la pàgina d'autorització (per adreça), en memòria.
const intents = new Map<string, { n: number; fins: number }>();
const MAX_INTENTS = 10;
function bloquejat(ip: string) {
  const e = intents.get(ip);
  return Boolean(e && e.n >= MAX_INTENTS && e.fins > Date.now());
}
function intentFallit(ip: string) {
  const e = intents.get(ip);
  const n = e && e.fins > Date.now() ? e.n + 1 : 1;
  intents.set(ip, { n, fins: Date.now() + 15 * 60_000 });
}
export const reiniciaIntentsOauth = () => intents.clear();

// ---------- Metadades ----------

function metadadesRecurs(req: Request, res: Response) {
  const base = urlPublica(req);
  res.json({
    resource: `${base}/api/agent-ia/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    scopes_supported: ['agent'],
    resource_name: getConfig('nom') || 'Gestió',
  });
}
oauthRouter.get('/.well-known/oauth-protected-resource', metadadesRecurs);
oauthRouter.get(/^\/\.well-known\/oauth-protected-resource\/.+/, metadadesRecurs);

function metadadesServidor(req: Request, res: Response) {
  const base = urlPublica(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['agent'],
  });
}
oauthRouter.get('/.well-known/oauth-authorization-server', metadadesServidor);
oauthRouter.get(/^\/\.well-known\/oauth-authorization-server\/.+/, metadadesServidor);

// ---------- Registre dinàmic de clients (RFC 7591) ----------

const redireccioValida = (u: unknown): u is string => {
  if (typeof u !== 'string' || u.length > 500) return false;
  try {
    const url = new URL(u);
    // https sempre; http només per a aplicacions del mateix ordinador.
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch {
    return false;
  }
};

oauthRouter.post('/oauth/register', express.json({ limit: '20kb' }), (req, res) => {
  const uris = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  if (!uris.length || !uris.every(redireccioValida)) {
    res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris must be https URLs.' });
    return;
  }
  const clientId = `iaqc_${base64url(randomBytes(16))}`;
  const nom = typeof req.body?.client_name === 'string' ? req.body.client_name.slice(0, 100) : null;
  run('INSERT INTO agent_oauth_clients (client_id, nom, redirect_uris) VALUES (?, ?, ?)', clientId, nom, JSON.stringify(uris));
  res.status(201).json({
    client_id: clientId,
    client_name: nom,
    redirect_uris: uris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  });
});

// ---------- Autorització ----------

interface Peticio {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
}

/** Valida la petició d'autorització; torna l'error (text) o la petició i el nom del client. */
function validaPeticio(q: Record<string, unknown>): { error: string } | { p: Peticio; client: string } {
  const p = {
    client_id: String(q.client_id ?? ''),
    redirect_uri: String(q.redirect_uri ?? ''),
    state: String(q.state ?? ''),
    code_challenge: String(q.code_challenge ?? ''),
  };
  const client = get<{ nom: string | null; redirect_uris: string }>('SELECT nom, redirect_uris FROM agent_oauth_clients WHERE client_id = ?', p.client_id);
  if (!client) return { error: 'Aplicació desconeguda (client_id).' };
  if (!(JSON.parse(client.redirect_uris) as string[]).includes(p.redirect_uri)) return { error: 'Adreça de retorn no registrada.' };
  if ((q.response_type ?? 'code') !== 'code') return { error: 'response_type no admès.' };
  if (q.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(p.code_challenge)) return { error: 'Cal PKCE amb S256.' };
  return { p, client: client.nom || 'Aplicació' };
}

const TEXTOS: Record<string, Record<string, string>> = {
  ca: {
    titol: 'Connectar un agent d’IA',
    intro: '«{0}» vol connectar-se a la gestió de {1} en nom teu.',
    passos: 'Al programa, ves a «El meu agent d’IA» → «Connecta» → «Codi de connexió», genera un codi i escriu-lo aquí. Caduca en 10 minuts.',
    codi: 'Codi de connexió',
    boto: 'Connecta',
    nota: 'L’agent actuarà amb els permisos del teu perfil, mai no veurà dades personals sensibles i el que tingui efectes fora del programa et quedarà pendent d’aprovar. Pots revocar-lo quan vulguis.',
    error: 'El codi no és vàlid o ha caducat.',
    bloquejat: 'Massa intents. Torna-ho a provar d’aquí a 15 minuts.',
  },
  es: {
    titol: 'Conectar un agente de IA',
    intro: '«{0}» quiere conectarse a la gestión de {1} en tu nombre.',
    passos: 'En el programa, ve a «Mi agente de IA» → «Conectar» → «Código de conexión», genera un código y escríbelo aquí. Caduca en 10 minutos.',
    codi: 'Código de conexión',
    boto: 'Conectar',
    nota: 'El agente actuará con los permisos de tu perfil, nunca verá datos personales sensibles y lo que tenga efectos fuera del programa quedará pendiente de tu aprobación. Puedes revocarlo cuando quieras.',
    error: 'El código no es válido o ha caducado.',
    bloquejat: 'Demasiados intentos. Vuelve a probar dentro de 15 minutos.',
  },
  en: {
    titol: 'Connect an AI agent',
    intro: '“{0}” wants to connect to {1}’s management program on your behalf.',
    passos: 'In the program, go to “My AI agent” → “Connect” → “Connection code”, generate a code and type it here. It expires in 10 minutes.',
    codi: 'Connection code',
    boto: 'Connect',
    nota: 'The agent will act with your profile’s permissions, will never see sensitive personal data, and anything with effects outside the program will wait for your approval. You can revoke it at any time.',
    error: 'The code is not valid or has expired.',
    bloquejat: 'Too many attempts. Try again in 15 minutes.',
  },
};

function paginaAutoritzacio(res: Response, o: { p?: Peticio; client?: string; error?: string; fatal?: boolean }) {
  const idioma = ['ca', 'es', 'en'].includes(getConfig('idioma') ?? '') ? getConfig('idioma')! : 'ca';
  const tx = TEXTOS[idioma];
  const entitat = getConfig('nom') || 'Gestió';
  const color = /^#[0-9a-f]{6}$/i.test(getConfig('web_color') ?? '') ? getConfig('web_color')! : '#9a3b25';
  const ocults = o.p
    ? Object.entries(o.p)
        .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapa(v)}">`)
        .join('')
    : '';
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapa(tx.titol)} · ${escapa(entitat)}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f7f2ea;color:#2b2521;display:grid;place-items:center;min-height:100vh}
main{background:#fff;max-width:420px;margin:16px;padding:28px;border-radius:14px;box-shadow:0 8px 30px rgb(0 0 0/.08)}
h1{font-size:1.3rem;margin:0 0 .6rem}p{margin:.5rem 0}.apagat{color:#7a6f66;font-size:.88rem}
label{display:block;font-weight:600;margin-top:1rem}input[type=text]{width:100%;box-sizing:border-box;font:1.4rem ui-monospace,Consolas,monospace;letter-spacing:.15em;text-transform:uppercase;padding:.5rem .7rem;margin-top:.3rem;border:1px solid #d8cfc3;border-radius:8px}
button{margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:${color};color:#fff;font:600 1rem system-ui}.error{color:#b42318;font-weight:600}</style></head>
<body><main><h1>${escapa(tx.titol)}</h1>
${o.client ? `<p>${escapa(tx.intro.replace('{0}', o.client).replace('{1}', entitat))}</p>` : ''}
${o.error ? `<p class="error">${escapa(o.error)}</p>` : ''}
${o.fatal ? '' : `<p class="apagat">${escapa(tx.passos)}</p>
<form method="post" action="/oauth/authorize">${ocults}
<label for="codi">${escapa(tx.codi)}</label><input id="codi" name="codi" type="text" autocomplete="off" autofocus required placeholder="XXXX-XXXX" maxlength="12">
<button type="submit">${escapa(tx.boto)}</button></form>
<p class="apagat">${escapa(tx.nota)}</p>`}
</main></body></html>`);
}

oauthRouter.get('/oauth/authorize', (req, res) => {
  const v = validaPeticio(req.query as Record<string, unknown>);
  if ('error' in v) {
    res.status(400);
    paginaAutoritzacio(res, { error: v.error, fatal: true });
    return;
  }
  paginaAutoritzacio(res, v);
});

oauthRouter.post('/oauth/authorize', (req, res) => {
  const v = validaPeticio({ ...req.body, response_type: 'code', code_challenge_method: 'S256' });
  if ('error' in v) {
    res.status(400);
    paginaAutoritzacio(res, { error: v.error, fatal: true });
    return;
  }
  const idioma = ['ca', 'es', 'en'].includes(getConfig('idioma') ?? '') ? getConfig('idioma')! : 'ca';
  const ip = req.ip ?? '?';
  if (bloquejat(ip)) {
    res.status(429);
    paginaAutoritzacio(res, { ...v, error: TEXTOS[idioma].bloquejat });
    return;
  }
  const codi = normalitzaCodi(String(req.body?.codi ?? ''));
  const fila = get<{ id: number; usuari_id: number; nom: string; mode: string }>(
    `SELECT c.id, c.usuari_id, c.nom, c.mode FROM agent_codis_connexio c JOIN usuaris u ON u.id = c.usuari_id
      WHERE c.hash = ? AND c.usat_el IS NULL AND c.caduca > ? AND u.actiu = 1`,
    sha256(codi),
    new Date().toISOString(),
  );
  if (!fila) {
    intentFallit(ip);
    registraSistema('?', 'entrada_fallida', 'agent_oauth', null, `Codi de connexió incorrecte des de ${ip}`);
    res.status(400);
    paginaAutoritzacio(res, { ...v, error: TEXTOS[idioma].error });
    return;
  }
  run("UPDATE agent_codis_connexio SET usat_el = datetime('now') WHERE id = ?", fila.id);
  const codiAutoritzacio = base64url(randomBytes(32));
  run(
    'INSERT INTO agent_oauth_codis (hash, client_id, redirect_uri, code_challenge, usuari_id, nom, mode, caduca) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    sha256(codiAutoritzacio), v.p.client_id, v.p.redirect_uri, v.p.code_challenge, fila.usuari_id,
    `${fila.nom} (${v.client})`.slice(0, 120), fila.mode, new Date(Date.now() + 5 * 60_000).toISOString(),
  );
  const desti = new URL(v.p.redirect_uri);
  desti.searchParams.set('code', codiAutoritzacio);
  if (v.p.state) desti.searchParams.set('state', v.p.state);
  res.redirect(302, desti.toString());
});

// ---------- Testimoni ----------

oauthRouter.post('/oauth/token', express.json({ limit: '20kb' }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const b = (req.body ?? {}) as Record<string, string>;
  const error = (codi: string, descripcio: string) => res.status(400).json({ error: codi, error_description: descripcio });
  if (b.grant_type !== 'authorization_code') return void error('unsupported_grant_type', 'Only authorization_code is supported.');
  const fila = get<{ hash: string; client_id: string; redirect_uri: string; code_challenge: string; usuari_id: number; nom: string; mode: string }>(
    'SELECT * FROM agent_oauth_codis WHERE hash = ? AND usat_el IS NULL AND caduca > ?',
    sha256(String(b.code ?? '')),
    new Date().toISOString(),
  );
  if (!fila) return void error('invalid_grant', 'Invalid or expired code.');
  // Un codi només serveix una vegada, encara que la resta falli.
  run("UPDATE agent_oauth_codis SET usat_el = datetime('now') WHERE hash = ?", fila.hash);
  if (b.client_id && b.client_id !== fila.client_id) return void error('invalid_grant', 'client_id mismatch.');
  if (b.redirect_uri && b.redirect_uri !== fila.redirect_uri) return void error('invalid_grant', 'redirect_uri mismatch.');
  const verificador = String(b.code_verifier ?? '');
  if (base64url(createHash('sha256').update(verificador).digest()) !== fila.code_challenge) return void error('invalid_grant', 'PKCE verification failed.');
  const { id, clau } = creaClau({ usuariId: fila.usuari_id, nom: fila.nom, mode: fila.mode === 'lectura' ? 'lectura' : 'complet', caducaEl: null });
  registraSistema('sistema', 'crea', 'agent_clau', id, `Clau d'agent creada per OAuth: ${fila.nom}`);
  res.json({ access_token: clau, token_type: 'Bearer', scope: 'agent' });
});
