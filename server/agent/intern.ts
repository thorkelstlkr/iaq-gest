// Crides internes a l'API del programa des de les eines dels agents.
//
// Les eines no tenen accés directe a la base de dades: fan les mateixes peticions que la interfície,
// amb una sessió normal, de manera que passen per les mateixes validacions, permisos i auditoria.
// - L'agent actua amb el compte d'usuari propi de la seva clau (perfil Junta, Tresoreria o Comunicació).
// - Quan una persona aprova una proposta, s'executa amb la sessió d'aquesta persona.
import { randomBytes } from 'node:crypto';
import { get, getConfig, run } from '../db.ts';
import type { ApiInterna } from './tipus.ts';

let port = Number(process.env.PORT ?? 3000);

/** El servidor indica el port real quan comença a escoltar. */
export const fixaPortIntern = (p: number) => {
  port = p;
};

export class ErrorApi extends Error {
  status: number;
  constructor(status: number, missatge: string) {
    super(missatge);
    this.status = status;
  }
}

const MINUTS_SESSIO_AGENT = 30;

/**
 * Sessió del compte d'usuari d'un agent (com si hagués iniciat sessió). Es reaprofita mentre és vàlida
 * i caduca aviat: si es revoca la clau, el compte es desactiva i la sessió deixa de servir.
 */
export function sessioAgent(usuariId: number): string {
  const ara = new Date();
  const vigent = get<{ token: string }>(
    'SELECT token FROM sessions WHERE usuari_id = ? AND caduca > ? ORDER BY caduca DESC LIMIT 1',
    usuariId,
    new Date(ara.getTime() + 60_000).toISOString(),
  );
  if (vigent) return vigent.token;
  const token = randomBytes(32).toString('hex');
  run('DELETE FROM sessions WHERE usuari_id = ? AND caduca < ?', usuariId, ara.toISOString());
  run('INSERT INTO sessions (token, usuari_id, caduca) VALUES (?, ?, ?)', token, usuariId, new Date(ara.getTime() + MINUTS_SESSIO_AGENT * 60_000).toISOString());
  return token;
}

/** Client de l'API amb una sessió concreta; «agent» marca les peticions fetes per un agent d'IA. */
export function apiInterna(sessio: string, { agent = false } = {}): ApiInterna {
  const crida = async <T>(metode: string, cami: string, cos?: unknown): Promise<T> => {
    const capcaleres: Record<string, string> = {
      Cookie: `sessio=${encodeURIComponent(sessio)}`,
      'X-Idioma': getConfig('idioma') || 'ca',
      ...(agent ? { 'X-Origen': 'agent' } : {}),
    };
    if (cos !== undefined) capcaleres['Content-Type'] = 'application/json';
    const r = await fetch(`http://127.0.0.1:${port}/api${cami}`, {
      method: metode,
      headers: capcaleres,
      body: cos === undefined ? undefined : JSON.stringify(cos),
    });
    const tipus = r.headers.get('content-type') ?? '';
    const dades = tipus.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok) throw new ErrorApi(r.status, (dades as { error?: string })?.error ?? `HTTP ${r.status}`);
    return dades as T;
  };
  return {
    get: (c) => crida('GET', c),
    post: (c, b) => crida('POST', c, b ?? {}),
    put: (c, b) => crida('PUT', c, b ?? {}),
    del: (c) => crida('DELETE', c),
  };
}
