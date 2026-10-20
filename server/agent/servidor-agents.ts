// Port separat només per als agents d'IA: serveix l'entrada dels agents (/api/agent-ia) i OAuth, i res més.
// És el que s'ha d'exposar a internet amb un túnel (Cloudflare Tunnel, Tailscale Funnel…): des de fora
// mai no es veu el programa, només l'entrada dels agents.
import express from 'express';
import type { Server } from 'node:http';
import { getConfig } from '../db.ts';
import { errorHandler } from '../util.ts';
import { agentConnexioRouter } from '../routes/agent.ts';
import { oauthRouter } from './oauth.ts';

export interface EstatServidorAgents {
  actiu: boolean;
  port: number | null;
  host: string | null;
  error: string | null;
}

let servidor: Server | null = null;
let estat: EstatServidorAgents = { actiu: false, port: null, host: null, error: null };

export const estatServidorAgents = () => estat;

function creaApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(oauthRouter);
  app.use('/api/agent-ia', agentConnexioRouter);
  app.get('/', (_req, res) => {
    res.type('text/plain').send(`${getConfig('nom') || 'Gestió'}: entrada per a agents d'IA (MCP a /api/agent-ia/mcp).`);
  });
  // Qualsevol altra cosa no existeix en aquest port.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);
  return app;
}

const tanca = () =>
  new Promise<void>((resol) => {
    if (!servidor) return resol();
    servidor.close(() => resol());
    servidor.closeAllConnections?.();
    servidor = null;
  });

/** Arrenca, atura o reinicia el port dels agents segons la configuració (agent_port_*). */
export async function aplicaServidorAgents(): Promise<EstatServidorAgents> {
  await tanca();
  if (getConfig('agent_port_actiu') !== '1') {
    estat = { actiu: false, port: null, host: null, error: null };
    return estat;
  }
  const port = Number(getConfig('agent_port')) || 3001;
  const host = getConfig('agent_port_xarxa') === '1' ? '0.0.0.0' : '127.0.0.1';
  estat = await new Promise<EstatServidorAgents>((resol) => {
    const s = creaApp().listen(port, host);
    s.once('listening', () => {
      servidor = s;
      resol({ actiu: true, port, host, error: null });
    });
    s.once('error', (e: NodeJS.ErrnoException) => {
      resol({ actiu: false, port, host, error: e.code === 'EADDRINUSE' ? `El port ${port} ja està en ús.` : e.message });
    });
  });
  if (estat.actiu) console.log(`Entrada per a agents d'IA → http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  return estat;
}
