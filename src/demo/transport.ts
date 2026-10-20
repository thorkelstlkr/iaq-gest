// Transport de la demostració: executa les rutes reals del servidor dins del navegador,
// sobre una còpia en memòria de la base de dades de prova (sql.js).

import { preparat } from './db';
import { idioma } from '../i18n';
import { tradueix } from '../../server/i18n.ts';
import { errorHandler } from '../../server/util.ts';
import type { MiniRouter } from './express';
import { socisRouter } from '../../server/routes/socis.ts';
import { quotesRouter } from '../../server/routes/quotes.ts';
import { comptabilitatRouter } from '../../server/routes/comptabilitat.ts';
import { activitatsRouter } from '../../server/routes/activitats.ts';
import { informesRouter } from '../../server/routes/informes.ts';
import { configRouter } from '../../server/routes/config.ts';
import { crmRouter } from '../../server/routes/crm.ts';
import { correuRouter } from '../../server/correu.ts';
import { webRouter } from '../../server/routes/web.ts';
import { rgpdRouter } from '../../server/routes/rgpd.ts';
import { facturacioRouter } from '../../server/routes/facturacio.ts';
import { xarxesRouter } from '../../server/routes/xarxes.ts';
import { governancaRouter } from '../../server/routes/governanca.ts';
import { tresoreriaRouter } from '../../server/routes/tresoreria.ts';
import { avisosRouter } from '../../server/avisos/index.ts';
import { calendariRouter } from '../../server/calendari.ts';
import { ajudaRouter } from '../../server/routes/ajuda.ts';
import { comunitatRouter } from '../../server/routes/comunitat.ts';
import { subvencionsRouter } from '../../server/routes/subvencions.ts';
import { fiscalRouter } from '../../server/routes/fiscal.ts';
import { donatiusRouter } from '../../server/routes/donatius.ts';

const MUNTATGES: [string, MiniRouter][] = [
  ['/socis', socisRouter as unknown as MiniRouter],
  ['/quotes', quotesRouter as unknown as MiniRouter],
  ['/comptabilitat', comptabilitatRouter as unknown as MiniRouter],
  ['/activitats', activitatsRouter as unknown as MiniRouter],
  ['/informes', informesRouter as unknown as MiniRouter],
  ['/crm', crmRouter as unknown as MiniRouter],
  ['/web', webRouter as unknown as MiniRouter],
  ['/rgpd', rgpdRouter as unknown as MiniRouter],
  ['/facturacio', facturacioRouter as unknown as MiniRouter],
  ['/xarxes', xarxesRouter as unknown as MiniRouter],
  ['/governanca', governancaRouter as unknown as MiniRouter],
  ['/tresoreria', tresoreriaRouter as unknown as MiniRouter],
  ['/avisos', avisosRouter as unknown as MiniRouter],
  ['/calendari', calendariRouter as unknown as MiniRouter],
  ['/ajuda', ajudaRouter as unknown as MiniRouter],
  ['/comunitat', comunitatRouter as unknown as MiniRouter],
  ['/subvencions', subvencionsRouter as unknown as MiniRouter],
  ['/fiscal', fiscalRouter as unknown as MiniRouter],
  ['/donatius', donatiusRouter as unknown as MiniRouter],
  ['/config/correu', correuRouter as unknown as MiniRouter],
  ['/config', configRouter as unknown as MiniRouter],
];

function resposta() {
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    status(s: number) {
      r.statusCode = s;
      return r;
    },
    json(b: unknown) {
      r.body = JSON.parse(JSON.stringify(b ?? null));
      return r;
    },
    send(b: unknown) {
      r.body = b;
      return r;
    },
    end() {
      return r;
    },
    setHeader() {},
  };
  return r;
}

export async function transport(method: string, path: string, body?: unknown): Promise<unknown> {
  await preparat;
  const url = new URL(path, 'http://demo');
  const req = {
    method,
    headers: { 'x-idioma': idioma() },
    params: {} as Record<string, string>,
    query: Object.fromEntries(url.searchParams),
    body: JSON.parse(JSON.stringify(body ?? {})),
    // A la demostració s'entra com a administració (per als avisos i l'autoria).
    usuari: { id: 1, nom: 'Demostració', usuari: 'demo', rol: 'admin' },
  };
  const res = resposta();
  try {
    const muntatge = MUNTATGES.find(([pre]) => url.pathname === pre || url.pathname.startsWith(pre + '/'));
    if (!muntatge) throw Object.assign(new Error('Ruta no trobada.'), { status: 404 });
    const sub = url.pathname.slice(muntatge[0].length) || '/';
    const ruta = muntatge[1].trobar(method, sub);
    if (!ruta) {
      res.status(404).json({ error: 'Ruta no trobada.' });
    } else {
      req.params = ruta.params;
      await ruta.handler(req, res);
    }
  } catch (err) {
    errorHandler(err, req as never, res as never, () => {});
  }
  // Petit retard perquè la interfície es comporti com amb un servidor real.
  await new Promise((r) => setTimeout(r, 30));
  if (res.statusCode >= 400) throw new Error(tradueix((res.body as { error?: string })?.error ?? `Error ${res.statusCode}`, idioma()));
  return res.statusCode === 204 ? undefined : res.body;
}
