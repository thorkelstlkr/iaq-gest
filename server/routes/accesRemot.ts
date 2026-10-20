// Configuració de l'accés remot: escoltar a la xarxa (local o Tailscale) i el port separat per als agents d'IA.
import { Router } from 'express';
import os from 'node:os';
import { getConfig, setConfig } from '../db.ts';
import { HttpError, bool, enter, text } from '../util.ts';
import { registra } from '../auditoria.ts';
import { aplicaServidorAgents, estatServidorAgents } from '../agent/servidor-agents.ts';

export const accesRemotRouter = Router();

/** Adreça on escolta ara el programa (la fixa server/index.ts en arrencar). */
let hostActual = '127.0.0.1';
let portActual = 3000;
export const fixaEscolta = (host: string, port: number) => {
  hostActual = host;
  portActual = port;
};

/** Adreces d'aquest ordinador a les xarxes (les de Tailscale són de l'interval 100.64.0.0/10). */
function adreces() {
  if (typeof os?.networkInterfaces !== 'function') return [];
  const llista: { interficie: string; adreca: string; tipus: 'tailscale' | 'local' }[] = [];
  for (const [nom, ifs] of Object.entries(os.networkInterfaces())) {
    for (const i of ifs ?? []) {
      if (i.family !== 'IPv4' || i.internal) continue;
      const [a, b] = i.address.split('.').map(Number);
      llista.push({ interficie: nom, adreca: i.address, tipus: a === 100 && b >= 64 && b <= 127 ? 'tailscale' : 'local' });
    }
  }
  return llista;
}

export function estatAccesRemot() {
  const programaXarxa = getConfig('acces_xarxa') === '1';
  return {
    programa_xarxa: programaXarxa,
    host_actual: hostActual,
    port_programa: portActual,
    // L'adreça HOST de l'entorn mana sobre la configuració.
    host_per_entorn: Boolean(process.env.HOST),
    reinici_necessari: !process.env.HOST && (programaXarxa ? hostActual !== '0.0.0.0' : hostActual !== '127.0.0.1'),
    agent_port_actiu: getConfig('agent_port_actiu') === '1',
    agent_port: Number(getConfig('agent_port')) || 3001,
    agent_port_xarxa: getConfig('agent_port_xarxa') === '1',
    agent_url_publica: getConfig('agent_url_publica') || '',
    servidor_agents: estatServidorAgents(),
    adreces: adreces(),
  };
}

accesRemotRouter.get('/', (_req, res) => {
  res.json(estatAccesRemot());
});

accesRemotRouter.put('/', async (req, res) => {
  const b = req.body ?? {};
  if ('programa_xarxa' in b) setConfig('acces_xarxa', bool(b.programa_xarxa) ? '1' : '0');
  if ('agent_port_actiu' in b) setConfig('agent_port_actiu', bool(b.agent_port_actiu) ? '1' : '0');
  if ('agent_port_xarxa' in b) setConfig('agent_port_xarxa', bool(b.agent_port_xarxa) ? '1' : '0');
  if ('agent_port' in b) {
    const p = enter(b.agent_port, 'Port') ?? 3001;
    if (p < 1024 || p > 65535 || p === portActual) throw new HttpError(400, 'El port no és vàlid (entre 1024 i 65535, i diferent del del programa).');
    setConfig('agent_port', String(p));
  }
  if ('agent_url_publica' in b) {
    const u = text(b.agent_url_publica)?.replace(/\/+$/, '') ?? '';
    if (u && !/^https:\/\/[^\s/]+(\/\S*)?$/i.test(u)) throw new HttpError(400, "L'adreça pública ha de començar per https://");
    setConfig('agent_url_publica', u);
  }
  await aplicaServidorAgents();
  registra(req, 'configura', 'acces_remot', null, `Claus canviades: ${Object.keys(b).join(', ')}`);
  res.json(estatAccesRemot());
});
