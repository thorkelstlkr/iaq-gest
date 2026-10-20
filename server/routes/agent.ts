// Agents d'IA personals.
//
// - agentConnexioRouter (/api/agent-ia): l'entrada dels agents, amb la clau personal (Authorization: Bearer iaq_…).
//   Només dona accés a les eines (MCP, OpenAPI), mai a la resta de l'API.
// - agentRouter (/api/agent): la gestió per a cada persona amb la seva sessió: claus, propostes i activitat.
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { all, get, run } from '../db.ts';
import { HttpError, idParam, text } from '../util.ts';
import { registra } from '../auditoria.ts';
import { usuariDe } from './auth.ts';
import { versioApp } from '../copies.ts';
import {
  aprovaProposta,
  clauPerValor,
  creaClau,
  descripcioPublica,
  einesPerClau,
  esquemaPublic,
  executaEina,
  llistaPropostes,
  propostaPerId,
  rebutjaProposta,
} from '../agent/executor.ts';
import { gestionaMcp } from '../agent/mcp.ts';
import { ErrorApi } from '../agent/intern.ts';
import { EINES } from '../agent/eines/index.ts';
import { PERFILS } from '../../shared/permisos.ts';
import { creaCodiConnexio, urlMetadadesRecurs } from '../agent/oauth.ts';
import { estatAccesRemot } from './accesRemot.ts';
import type { Modul } from '../../shared/permisos.ts';
import type { ClauAgent } from '../agent/tipus.ts';

// ---------- Entrada dels agents (clau personal) ----------

export const agentConnexioRouter = Router();

const clauDe = (req: Request) => (req as unknown as { clauAgent: ClauAgent }).clauAgent;

agentConnexioRouter.use((req: Request, res: Response, next: NextFunction) => {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
  const clau = clauPerValor(m?.[1]);
  if (!clau) {
    // Els connectors al núvol hi troben on iniciar l'autorització OAuth (especificació MCP).
    res.setHeader('WWW-Authenticate', `Bearer realm="iaraque-gestio", resource_metadata="${urlMetadadesRecurs(req)}"`);
    res.status(401).json({ error: 'Clau d’agent no vàlida, revocada o caducada.' });
    return;
  }
  (req as unknown as { clauAgent: ClauAgent }).clauAgent = clau;
  next();
});

/** MCP per HTTP («Streamable HTTP», respostes JSON). */
agentConnexioRouter.post('/mcp', async (req, res) => {
  const clau = clauDe(req);
  const missatges = Array.isArray(req.body) ? req.body : [req.body];
  const respostes = (await Promise.all(missatges.map((m) => gestionaMcp(m, clau)))).filter(Boolean);
  if (!respostes.length) {
    res.status(202).end();
    return;
  }
  res.json(Array.isArray(req.body) ? respostes : respostes[0]);
});

agentConnexioRouter.get('/mcp', (_req, res) => {
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Fes servir POST (MCP per HTTP sense flux d’esdeveniments).' });
});

/** Eines disponibles (per als agents que fan servir «function calling» sense MCP). */
agentConnexioRouter.get('/eines', (req, res) => {
  res.json(
    einesPerClau(clauDe(req)).map((e) => ({ name: e.nom, description: descripcioPublica(e), parameters: esquemaPublic(e), level: e.nivell })),
  );
});

agentConnexioRouter.post('/eines/:nom', async (req, res) => {
  try {
    res.json({ result: await executaEina(String(req.params.nom), (req.body ?? {}) as Record<string, unknown>, clauDe(req)) });
  } catch (e) {
    res.status(e instanceof ErrorApi ? e.status : 500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Descripció OpenAPI 3.1 de les eines (ChatGPT «Actions», Gemini, agents propis…). */
agentConnexioRouter.get('/openapi.json', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const paths: Record<string, unknown> = {};
  for (const e of einesPerClau(clauDe(req))) {
    paths[`/api/agent-ia/eines/${e.nom}`] = {
      post: {
        operationId: e.nom,
        summary: e.descripcio.split('. ')[0].slice(0, 120),
        description: descripcioPublica(e),
        requestBody: { required: true, content: { 'application/json': { schema: esquemaPublic(e) } } },
        responses: {
          200: { description: 'Result', content: { 'application/json': { schema: { type: 'object', properties: { result: {} } } } } },
          400: { description: 'Invalid parameters' },
          403: { description: 'Not allowed for this profile' },
        },
      },
    };
  }
  res.json({
    openapi: '3.1.0',
    info: { title: 'Gestió de l’associació: eines per a agents d’IA', version: versioApp() },
    servers: [{ url: base }],
    components: { securitySchemes: { clau: { type: 'http', scheme: 'bearer' } } },
    security: [{ clau: [] }],
    paths,
  });
});

// ---------- Gestió per a cada persona (amb la seva sessió) ----------

export const agentRouter = Router();

const esAdmin = (req: Request) => usuariDe(req)?.rol === 'admin';

/** Cookie de sessió de la petició: les propostes s'executen amb la sessió de qui les aprova. */
function sessioDe(req: Request): string {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'sessio') return decodeURIComponent(v.join('='));
  }
  throw new HttpError(401, 'Cal iniciar sessió.');
}

agentRouter.get('/claus', (req, res) => {
  const totes = esAdmin(req) && req.query.totes === '1';
  res.json(
    all(
      `SELECT c.id, c.nom, c.prefix, c.mode, c.caduca_el, c.creat_el, c.darrer_us, c.revocada_el, c.usuari_id, u.nom AS usuari_nom, u.rol
         FROM agent_claus c JOIN usuaris u ON u.id = c.usuari_id
        ${totes ? '' : 'WHERE c.usuari_id = ?'} ORDER BY c.revocada_el IS NOT NULL, c.id DESC`,
      ...(totes ? [] : [usuariDe(req)!.id]),
    ),
  );
});

agentRouter.post('/claus', (req, res) => {
  const u = usuariDe(req)!;
  const nom = text(req.body?.nom);
  if (!nom) throw new HttpError(400, 'El camp «Nom» és obligatori.');
  const mode = req.body?.mode === 'lectura' ? 'lectura' : 'complet';
  const caducaEl = text(req.body?.caduca_el);
  if (caducaEl && !/^\d{4}-\d{2}-\d{2}$/.test(caducaEl)) throw new HttpError(400, 'La data no és vàlida.');
  const { id, clau } = creaClau({ usuariId: u.id, nom, mode, caducaEl });
  registra(req, 'crea', 'agent_clau', id, `Clau d'agent creada: ${nom} (${mode})`);
  res.status(201).json({ id, clau });
});

/** Codi d'un sol ús per connectar una aplicació al núvol (Claude.ai, ChatGPT…) per OAuth. Caduca en 10 minuts. */
agentRouter.post('/codis-connexio', (req, res) => {
  const u = usuariDe(req)!;
  const nom = text(req.body?.nom) ?? 'Connector';
  const mode = req.body?.mode === 'lectura' ? 'lectura' : 'complet';
  const r = creaCodiConnexio({ usuariId: u.id, nom, mode });
  registra(req, 'crea', 'agent_codi', null, `Codi de connexió generat: ${nom} (${mode})`);
  res.status(201).json(r);
});

agentRouter.delete('/claus/:id', (req, res) => {
  const id = idParam(req);
  const c = get<{ usuari_id: number; nom: string }>('SELECT usuari_id, nom FROM agent_claus WHERE id = ? AND revocada_el IS NULL', id);
  if (!c || (c.usuari_id !== usuariDe(req)!.id && !esAdmin(req))) throw new HttpError(404, 'Aquesta clau no existeix.');
  run("UPDATE agent_claus SET revocada_el = datetime('now') WHERE id = ?", id);
  registra(req, 'elimina', 'agent_clau', id, `Clau d'agent revocada: ${c.nom}`);
  res.status(204).end();
});

agentRouter.get('/propostes', (req, res) => {
  res.json(llistaPropostes(esAdmin(req) && req.query.totes === '1' ? null : usuariDe(req)!.id));
});

/** Només la persona propietària de l'agent (o l'administració) pot decidir les seves propostes. */
function propostaPropia(req: Request) {
  const p = propostaPerId(idParam(req));
  if (!p || (p.usuari_id !== usuariDe(req)!.id && !esAdmin(req))) throw new HttpError(404, 'Aquesta proposta no existeix.');
  return p;
}

agentRouter.post('/propostes/:id/aprova', async (req, res) => {
  const p = propostaPropia(req);
  try {
    res.json(await aprovaProposta(p.id, sessioDe(req), usuariDe(req)!.nom));
  } catch (e) {
    throw e instanceof ErrorApi ? new HttpError(e.status, e.message) : e;
  }
});

agentRouter.post('/propostes/:id/rebutja', (req, res) => {
  const p = propostaPropia(req);
  try {
    res.json(rebutjaProposta(p.id, usuariDe(req)!.nom, text(req.body?.motiu)));
  } catch (e) {
    throw e instanceof ErrorApi ? new HttpError(e.status, e.message) : e;
  }
});

agentRouter.get('/registre', (req, res) => {
  const totes = esAdmin(req) && req.query.totes === '1';
  res.json(
    all(
      `SELECT id, agent, eina, nivell, arguments, correcte, detall, data FROM agent_registre
        ${totes ? '' : 'WHERE usuari_id = ?'} ORDER BY id DESC LIMIT 300`,
      ...(totes ? [] : [usuariDe(req)!.id]),
    ),
  );
});

/** Catàleg d'eines segons el perfil de qui pregunta (per a la pàgina d'ajuda). */
agentRouter.get('/eines', (req, res) => {
  const moduls = (PERFILS as Record<string, { moduls: Modul[] }>)[usuariDe(req)!.rol]?.moduls ?? [];
  res.json(EINES.filter((e) => moduls.includes(e.modul)).map((e) => ({ nom: e.nom, descripcio: e.descripcio, nivell: e.nivell, modul: e.modul })));
});

/** Dades per configurar els clients (Claude, ChatGPT, Gemini…), també des d'altres equips o del núvol. */
agentRouter.get('/connexio', (req, res) => {
  const local = `${req.protocol}://${req.get('host')}`;
  const ac = estatAccesRemot();
  const port = ac.port_programa;
  const tailscale = ac.adreces.find((a) => a.tipus === 'tailscale')?.adreca ?? null;
  const xarxa = ac.host_actual === '0.0.0.0';
  const publica = ac.agent_url_publica || null;
  res.json({
    url: local,
    mcp_url: `${local}/api/agent-ia/mcp`,
    openapi_url: `${local}/api/agent-ia/openapi.json`,
    carpeta: process.cwd(),
    node: process.execPath,
    // Programa instal·lat (Electron): el mateix executable fa de Node amb aquesta variable; no cal instal·lar Node.
    env_extra: process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {},
    // Des d'altres equips (xarxa privada Tailscale o xarxa local), si el programa hi escolta.
    url_xarxa: xarxa ? `http://${tailscale ?? ac.adreces[0]?.adreca ?? 'IP-DE-L-ORDINADOR'}:${port}` : null,
    es_tailscale: Boolean(xarxa && tailscale),
    // Des del núvol (Claude.ai, ChatGPT): adreça pública https del túnel cap al port dels agents.
    url_publica: publica,
    port_agents: ac.agent_port_actiu ? ac.agent_port : null,
  });
});
