// Arnès de proves de les eines dels agents: arrenca el programa en un procés a part, amb una base de dades
// temporal plena de dades de prova, i hi crea un usuari i una clau d'agent. Mai no toca data/ real.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

export interface ServidorProva {
  base: string;
  /** Clau d'agent de l'usuari de prova (perfil indicat). */
  clau: string;
  /** Cookie de sessió de l'usuari de prova (per aprovar propostes). */
  cookie: string;
  /** Crida una eina com ho faria un agent; torna { status, cos }. */
  eina: (nom: string, args?: Record<string, unknown>) => Promise<{ status: number; cos: any }>;
  /** Crida l'API normal amb la sessió de l'usuari. */
  api: (metode: string, cami: string, cos?: unknown) => Promise<{ status: number; cos: any }>;
  atura: () => Promise<void>;
}

const portLliure = () =>
  new Promise<number>((resol) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resol(p));
    });
  });

export async function arrencaServidor(o: { rol?: 'admin' | 'junta' | 'tresoreria' | 'comunicacio'; mode?: 'lectura' | 'complet' } = {}): Promise<ServidorProva> {
  const dir = mkdtempSync(join(tmpdir(), 'agent-prova-'));
  const dbPath = join(dir, 'prova.db');
  const env = { ...process.env, DB_PATH: dbPath, NODE_TEST_CONTEXT: '' };
  execFileSync(process.execPath, ['scripts/dades-prova.ts'], { env, stdio: 'ignore' });
  const port = await portLliure();
  const proc = spawn(process.execPath, ['server/index.ts'], { env: { ...env, PORT: String(port) }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/api/auth/estat`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  // Administrador inicial i, si cal, un usuari amb el perfil demanat.
  let r = await fetch(`${base}/api/auth/primer-usuari`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entitat: 'Prova', nom: 'Admin Prova', usuari: 'admin', contrasenya: 'prova-1234-x' }),
  });
  let cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  if (o.rol && o.rol !== 'admin') {
    await fetch(`${base}/api/usuaris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ nom: 'Persona Prova', usuari: 'persona', contrasenya: 'prova-1234-x', rol: o.rol }),
    });
    r = await fetch(`${base}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuari: 'persona', contrasenya: 'prova-1234-x' }),
    });
    cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  }
  r = await fetch(`${base}/api/agent/claus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ nom: 'Agent de prova', mode: o.mode ?? 'complet' }),
  });
  const { clau } = (await r.json()) as { clau: string };

  const json = async (resposta: Response) => ({ status: resposta.status, cos: await resposta.json().catch(() => null) });
  return {
    base,
    clau,
    cookie,
    eina: async (nom, args = {}) =>
      json(
        await fetch(`${base}/api/agent-ia/eines/${nom}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clau}` },
          body: JSON.stringify(args),
        }),
      ),
    api: async (metode, cami, cos) =>
      json(
        await fetch(`${base}/api${cami}`, {
          method: metode,
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: cos === undefined ? undefined : JSON.stringify(cos),
        }),
      ),
    atura: async () => {
      proc.kill();
      await new Promise((r) => setTimeout(r, 300));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
