import { Router } from 'express';
import { all, get, getConfig, run, tx } from '../db.ts';
import { HttpError, cents, dataObligatoria, enter, exerciciParam, idParam, notFound } from '../util.ts';
import type { Quota } from '../../shared/types.ts';
import { ambTancament, comprovaObert } from '../tresoreria/tancament.ts';
import { registra } from '../auditoria.ts';

export const quotesRouter = Router();

const ESTATS = ['pendent', 'pagada', 'exempta'];

quotesRouter.get('/', (req, res) => {
  const exercici = exerciciParam(req);
  res.json(
    all(
      `SELECT q.*, s.num_soci, s.nom || ' ' || s.llinatges AS nom_soci, COALESCE(ms.metode, 'efectiu') AS metode_preferit,
              EXISTS (SELECT 1 FROM remesa_linies l JOIN remeses r ON r.id = l.remesa_id
                       WHERE l.quota_id = q.id AND r.estat = 'generada') AS en_remesa
         FROM quotes q JOIN socis s ON s.id = q.soci_id
         LEFT JOIN mandats_sepa ms ON ms.soci_id = s.id
        WHERE q.exercici = ?
        ORDER BY s.num_soci`,
      exercici,
    ),
  );
});

/** Crea les quotes de l'exercici per a tots els socis actius que encara no en tenen. */
quotesRouter.post('/generar', (req, res) => {
  const exercici = enter(req.body.exercici, 'Exercici');
  if (!exercici) throw new HttpError(400, 'Cal indicar l’exercici.');
  const inici = `${exercici}-01-01`;
  const fi = `${exercici}-12-31`;
  const creades = tx(() => {
    const pendents = all<{ id: number; import_cents: number | null }>(
      `SELECT s.id, t.import_cents
         FROM socis s LEFT JOIN tipus_quota t ON t.id = s.tipus_quota_id
        WHERE s.estat_admissio = 'admesa' AND s.data_alta <= ? AND (s.data_baixa IS NULL OR s.data_baixa >= ?)
          AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.soci_id = s.id AND q.exercici = ?)`,
      fi, inici, exercici,
    );
    for (const s of pendents) {
      const imp = s.import_cents ?? 0;
      run(
        'INSERT INTO quotes (soci_id, exercici, import_cents, estat) VALUES (?, ?, ?, ?)',
        s.id, exercici, imp, imp === 0 ? 'exempta' : 'pendent',
      );
    }
    return pendents.length;
  });
  res.json({ creades });
});

const METODES = ['efectiu', 'transferencia', 'domiciliacio'];

function metodeCobrament(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  const m = String(v);
  if (!METODES.includes(m)) throw new HttpError(400, 'Forma de pagament no vàlida.');
  return m;
}

const quotaEnRemesa = (id: number) =>
  Boolean(get(
    `SELECT 1 AS x FROM remesa_linies l JOIN remeses r ON r.id = l.remesa_id WHERE l.quota_id = ? AND r.estat = 'generada'`,
    id,
  ));

/** Cobra una quota (dins d'una transacció ja oberta): crea el moviment d'ingrés i la marca com a pagada. */
function cobraQuota(id: number, dataPagament: string, compteId: number, metode: string | null) {
  const q = get<Quota & { nom: string; llinatges: string; num_soci: number; metode_preferit: string | null }>(
    `SELECT q.*, s.nom, s.llinatges, s.num_soci, ms.metode AS metode_preferit
       FROM quotes q JOIN socis s ON s.id = q.soci_id LEFT JOIN mandats_sepa ms ON ms.soci_id = s.id WHERE q.id = ?`,
    id,
  ) ?? notFound();
  if (q.estat === 'pagada') throw new HttpError(409, `La quota del soci núm. ${q.num_soci} ja està cobrada.`);
  if (q.import_cents <= 0) throw new HttpError(400, 'La quota no té import; marca-la com a exempta.');
  if (quotaEnRemesa(id)) throw new HttpError(409, `La quota del soci núm. ${q.num_soci} és en una remesa pendent de cobrar.`);
  const categoria = Number(getConfig('categoria_quotes')) || null;
  const mov = run(
    `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id)
     VALUES (?, 'ingres', ?, ?, ?, ?, ?)`,
    dataPagament, q.import_cents,
    `Quota ${q.exercici} – soci núm. ${q.num_soci} (${`${q.nom} ${q.llinatges}`.trim()})`,
    categoria, compteId, q.soci_id,
  );
  // Si no s'indica, la forma de pagament preferida del soci (una domiciliació cobrada a mà es considera transferència).
  const m = metode ?? (q.metode_preferit && q.metode_preferit !== 'domiciliacio' ? q.metode_preferit : 'efectiu');
  run("UPDATE quotes SET estat = 'pagada', data_pagament = ?, moviment_id = ?, metode = ? WHERE id = ?", dataPagament, mov.id, m, id);
}

function llegeixCobrament(body: Record<string, unknown>) {
  const dataPagament = dataObligatoria(body.data, 'Data de pagament');
  const compteId = enter(body.compte_id, 'Compte');
  if (!compteId) throw new HttpError(400, 'Cal triar el compte on s’ingressa.');
  comprovaObert(dataPagament);
  return { dataPagament, compteId, metode: metodeCobrament(body.metode) };
}

/** Registra el cobrament: crea el moviment d'ingrés i marca la quota com a pagada. */
quotesRouter.post('/:id/cobrar', (req, res) => {
  const id = idParam(req);
  const c = llegeixCobrament(req.body);
  tx(() => ambTancament(() => cobraQuota(id, c.dataPagament, c.compteId, c.metode)));
  res.json(get('SELECT * FROM quotes WHERE id = ?', id));
});

/** Cobrament de diverses quotes alhora (un moviment per quota, tot en una sola transacció). */
quotesRouter.post('/cobrar-lot', (req, res) => {
  const ids = [...new Set<number>((Array.isArray(req.body.ids) ? req.body.ids : []).map(Number))].filter(
    (n) => Number.isInteger(n) && n > 0,
  );
  if (!ids.length) throw new HttpError(400, 'Cal triar almenys una quota.');
  const c = llegeixCobrament(req.body);
  tx(() => ambTancament(() => ids.forEach((id) => cobraQuota(id, c.dataPagament, c.compteId, c.metode))));
  registra(req, 'modifica', 'quotes', null, `Cobrament en bloc de ${ids.length} quotes`);
  res.json({ cobrades: ids.length });
});

/** Anul·la un cobrament: elimina el moviment associat i torna la quota a pendent. */
quotesRouter.post('/:id/anullar-cobrament', (req, res) => {
  const id = idParam(req);
  tx(() =>
    ambTancament(() => {
      const q = get<Quota>('SELECT * FROM quotes WHERE id = ?', id) ?? notFound();
      comprovaObert(q.data_pagament);
      if (q.moviment_id) {
        const compartit =
          get<{ n: number }>('SELECT COUNT(*) AS n FROM quotes WHERE moviment_id = ?', q.moviment_id)!.n > 1 ||
          Boolean(get('SELECT 1 AS x FROM remeses WHERE moviment_id = ?', q.moviment_id));
        if (compartit)
          throw new HttpError(409, "Aquesta quota es va cobrar dins d'una remesa: si el banc l'ha retornada, registra'n la devolució a Tresoreria.");
        run('DELETE FROM moviments WHERE id = ?', q.moviment_id);
      }
      run("UPDATE quotes SET estat = 'pendent', data_pagament = NULL, moviment_id = NULL, metode = NULL WHERE id = ?", id);
    }),
  );
  res.json(get('SELECT * FROM quotes WHERE id = ?', id));
});

quotesRouter.put('/:id', (req, res) => {
  const id = idParam(req);
  const q = get<Quota>('SELECT * FROM quotes WHERE id = ?', id) ?? notFound();
  const estat = String(req.body.estat ?? q.estat);
  if (!ESTATS.includes(estat)) throw new HttpError(400, 'Estat no vàlid.');
  if (estat === 'pagada' && q.estat !== 'pagada')
    throw new HttpError(400, 'Per marcar una quota com a pagada usa «Cobrar».');
  if (q.estat === 'pagada' && estat !== 'pagada')
    throw new HttpError(400, 'Primer anul·la el cobrament.');
  const import_cents = req.body.import_cents === undefined ? q.import_cents : cents(req.body.import_cents, 'Import');
  if (q.estat === 'pagada' && import_cents !== q.import_cents)
    throw new HttpError(400, "No es pot canviar l'import d'una quota cobrada.");
  if (quotaEnRemesa(id) && (import_cents !== q.import_cents || estat !== q.estat))
    throw new HttpError(409, 'Aquesta quota és en una remesa pendent de cobrar: elimina primer la remesa.');
  run('UPDATE quotes SET estat = ?, import_cents = ? WHERE id = ?', estat, import_cents, id);
  res.json(get('SELECT * FROM quotes WHERE id = ?', id));
});

quotesRouter.delete('/:id', (req, res) => {
  const id = idParam(req);
  const q = get<Quota>('SELECT * FROM quotes WHERE id = ?', id) ?? notFound();
  if (q.estat === 'pagada') throw new HttpError(409, 'Primer anul·la el cobrament.');
  if (quotaEnRemesa(id)) throw new HttpError(409, 'Aquesta quota és en una remesa pendent de cobrar: elimina primer la remesa.');
  run('DELETE FROM quotes WHERE id = ?', id);
  res.status(204).end();
});
