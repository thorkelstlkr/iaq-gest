import { Router } from 'express';
import type { Request } from 'express';
import { all, get, run, tx } from '../db.ts';
import {
  HttpError, bool, cents, centsAEuros, dataObligatoria, enter, exerciciParam, idParam, notFound, sendCsv, text,
  textObligatori, toCsv, columnesTraduides,
} from '../util.ts';
import type { Compte, Moviment } from '../../shared/types.ts';
import { idiomaDe, tradueix } from '../i18n.ts';
import { registra } from '../auditoria.ts';
import { autor } from './auth.ts';
import { ambTancament, comprovaObert } from '../tresoreria/tancament.ts';
import { llegeixFitxer } from './subvencions.ts';

export const comptabilitatRouter = Router();

// ---------- Saldos ----------

export interface FluxCompte extends Compte {
  entrades_cents: number;
  sortides_cents: number;
}

/** Entrades i sortides de cada compte entre dues dates (incloses). */
export function fluxosComptes(desDe: string | null, finsA: string | null) {
  return all<FluxCompte>(
    `SELECT c.id, c.nom, c.saldo_inicial_cents, c.actiu,
       COALESCE(SUM(CASE WHEN (m.tipus = 'ingres' AND m.compte_id = c.id)
                           OR (m.tipus = 'traspas' AND m.compte_desti_id = c.id) THEN m.import_cents END), 0) AS entrades_cents,
       COALESCE(SUM(CASE WHEN m.tipus IN ('despesa', 'traspas') AND m.compte_id = c.id THEN m.import_cents END), 0) AS sortides_cents
     FROM comptes c
     LEFT JOIN moviments m ON (m.compte_id = c.id OR m.compte_desti_id = c.id) AND m.data >= $des AND m.data <= $fins
     GROUP BY c.id ORDER BY c.id`,
    { des: desDe ?? '0000-01-01', fins: finsA ?? '9999-12-31' },
  );
}

export function saldosActuals(): Compte[] {
  return fluxosComptes(null, null).map((c) => ({
    id: c.id,
    nom: c.nom,
    saldo_inicial_cents: c.saldo_inicial_cents,
    actiu: c.actiu,
    saldo_cents: c.saldo_inicial_cents + c.entrades_cents - c.sortides_cents,
  }));
}

// ---------- Comptes ----------

comptabilitatRouter.get('/comptes', (_req, res) => {
  res.json(saldosActuals());
});

comptabilitatRouter.post('/comptes', (req, res) => {
  const { id } = run(
    'INSERT INTO comptes (nom, saldo_inicial_cents, actiu) VALUES (?, ?, 1)',
    textObligatori(req.body.nom, 'Nom'),
    enter(req.body.saldo_inicial_cents, 'Saldo inicial') ?? 0,
  );
  res.status(201).json(get('SELECT * FROM comptes WHERE id = ?', id));
});

comptabilitatRouter.put('/comptes/:id', (req, res) => {
  const id = idParam(req);
  const saldo = enter(req.body.saldo_inicial_cents, 'Saldo inicial') ?? 0;
  const { changes } = run(
    'UPDATE comptes SET nom = ?, saldo_inicial_cents = ?, actiu = ? WHERE id = ?',
    textObligatori(req.body.nom, 'Nom'), saldo, bool(req.body.actiu ?? 1), id,
  );
  if (!changes) notFound();
  res.json(get('SELECT * FROM comptes WHERE id = ?', id));
});

comptabilitatRouter.delete('/comptes/:id', (req, res) => {
  const { changes } = run('DELETE FROM comptes WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

// ---------- Categories ----------

comptabilitatRouter.get('/categories', (_req, res) => {
  res.json(all('SELECT * FROM categories ORDER BY tipus DESC, nom'));
});

function tipusCategoria(v: unknown) {
  const t = String(v);
  if (t !== 'ingres' && t !== 'despesa') throw new HttpError(400, 'Tipus de categoria no vàlid.');
  return t;
}

comptabilitatRouter.post('/categories', (req, res) => {
  const { id } = run(
    'INSERT INTO categories (nom, tipus, actiu) VALUES (?, ?, 1)',
    textObligatori(req.body.nom, 'Nom'), tipusCategoria(req.body.tipus),
  );
  res.status(201).json(get('SELECT * FROM categories WHERE id = ?', id));
});

comptabilitatRouter.put('/categories/:id', (req, res) => {
  const id = idParam(req);
  const { changes } = run(
    'UPDATE categories SET nom = ?, actiu = ? WHERE id = ?',
    textObligatori(req.body.nom, 'Nom'), bool(req.body.actiu ?? 1), id,
  );
  if (!changes) notFound();
  res.json(get('SELECT * FROM categories WHERE id = ?', id));
});

comptabilitatRouter.delete('/categories/:id', (req, res) => {
  const { changes } = run('DELETE FROM categories WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

// ---------- Moviments ----------

const SELECT_MOVIMENTS = `
  SELECT m.*, cat.nom AS categoria_nom, c.nom AS compte_nom, cd.nom AS compte_desti_nom,
         a.nom AS activitat_nom, TRIM(s.nom || ' ' || s.llinatges) AS soci_nom,
         TRIM(sv.organisme || COALESCE(' · ' || sv.convocatoria, '') || ' ' || sv.exercici) AS subvencio_nom,
         (SELECT COUNT(*) FROM justificants j WHERE j.moviment_id = m.id) AS n_justificants,
         COALESCE((SELECT SUM(i.import_cents) FROM subvencio_imputacions i WHERE i.moviment_id = m.id), 0) AS imputat_cents
    FROM moviments m
    JOIN comptes c ON c.id = m.compte_id
    LEFT JOIN comptes cd ON cd.id = m.compte_desti_id
    LEFT JOIN categories cat ON cat.id = m.categoria_id
    LEFT JOIN activitats a ON a.id = m.activitat_id
    LEFT JOIN socis s ON s.id = m.soci_id
    LEFT JOIN subvencions sv ON sv.id = m.subvencio_id`;

function llistatMoviments(req: Request) {
  const exercici = exerciciParam(req);
  const where = ['m.data BETWEEN $inici AND $fi'];
  const params: Record<string, string | number> = { inici: `${exercici}-01-01`, fi: `${exercici}-12-31` };
  const tipus = text(req.query.tipus);
  if (tipus) { where.push('m.tipus = $tipus'); params.tipus = tipus; }
  const compte = enter(req.query.compte_id, 'Compte');
  if (compte) { where.push('(m.compte_id = $compte OR m.compte_desti_id = $compte)'); params.compte = compte; }
  const categoria = enter(req.query.categoria_id, 'Categoria');
  if (categoria) { where.push('m.categoria_id = $categoria'); params.categoria = categoria; }
  const activitat = enter(req.query.activitat_id, 'Activitat');
  if (activitat) { where.push('m.activitat_id = $activitat'); params.activitat = activitat; }
  const q = text(req.query.q);
  if (q) { where.push('(m.concepte LIKE $q OR m.justificant LIKE $q OR m.notes LIKE $q)'); params.q = `%${q}%`; }
  return all<Moviment>(`${SELECT_MOVIMENTS} WHERE ${where.join(' AND ')} ORDER BY m.data DESC, m.id DESC`, params);
}

comptabilitatRouter.get('/moviments', (req, res) => {
  res.json(llistatMoviments(req));
});

comptabilitatRouter.get('/moviments/export.csv', (req, res) => {
  const TIPUS: Record<string, string> = { ingres: 'Ingrés', despesa: 'Despesa', traspas: 'Traspàs' };
  const rows = llistatMoviments(req)
    .reverse()
    .map((m) => ({
      ...m,
      tipus: tradueix(TIPUS[m.tipus], idiomaDe(req)),
      import: centsAEuros(m.tipus === 'despesa' ? -m.import_cents : m.import_cents),
    }));
  const csv = toCsv(rows, columnesTraduides(req, [
    ['data', 'Data'], ['tipus', 'Tipus'], ['concepte', 'Concepte'], ['import', 'Import (€)'],
    ['categoria_nom', 'Categoria'], ['compte_nom', 'Compte'], ['compte_desti_nom', 'Compte destí'],
    ['activitat_nom', 'Activitat'], ['soci_nom', 'Soci/a'], ['subvencio_nom', 'Subvenció'], ['justificant', 'Justificant'],
    ['n_justificants', 'Fitxers adjunts'], ['notes', 'Notes'],
  ]));
  sendCsv(res, `moviments-${exerciciParam(req)}.csv`, csv);
});

function llegirMoviment(body: Request['body']) {
  const tipus = String(body.tipus);
  if (!['ingres', 'despesa', 'traspas'].includes(tipus)) throw new HttpError(400, 'Tipus de moviment no vàlid.');
  const compte_id = enter(body.compte_id, 'Compte');
  if (!compte_id) throw new HttpError(400, 'Cal triar un compte.');
  let compte_desti_id: number | null = null;
  let categoria_id: number | null = null;
  if (tipus === 'traspas') {
    compte_desti_id = enter(body.compte_desti_id, 'Compte destí');
    if (!compte_desti_id) throw new HttpError(400, 'Cal triar el compte destí.');
    if (compte_desti_id === compte_id) throw new HttpError(400, 'El compte destí ha de ser diferent.');
  } else {
    categoria_id = enter(body.categoria_id, 'Categoria');
    if (!categoria_id) throw new HttpError(400, 'Cal triar una categoria.');
    const cat = get<{ tipus: string }>('SELECT tipus FROM categories WHERE id = ?', categoria_id);
    if (!cat) throw new HttpError(400, 'Categoria inexistent.');
    if (cat.tipus !== tipus) throw new HttpError(400, 'La categoria no correspon al tipus de moviment.');
  }
  // Cobrament d'una subvenció: només els ingressos.
  const subvencio_id = tipus === 'ingres' ? enter(body.subvencio_id, 'Subvenció') : null;
  if (subvencio_id && !get('SELECT 1 AS x FROM subvencions WHERE id = ?', subvencio_id)) throw new HttpError(400, 'Subvenció inexistent.');
  return {
    data: dataObligatoria(body.data, 'Data'),
    tipus,
    import_cents: cents(body.import_cents, 'Import', { positiu: true }),
    concepte: textObligatori(body.concepte, 'Concepte'),
    categoria_id,
    compte_id,
    compte_desti_id,
    activitat_id: enter(body.activitat_id, 'Activitat'),
    soci_id: enter(body.soci_id, 'Soci'),
    justificant: text(body.justificant),
    notes: text(body.notes),
    subvencio_id,
  };
}

const CAMPS_MOV = [
  'data', 'tipus', 'import_cents', 'concepte', 'categoria_id', 'compte_id', 'compte_desti_id',
  'activitat_id', 'soci_id', 'justificant', 'notes', 'subvencio_id',
];

comptabilitatRouter.get('/moviments/:id', (req, res) => {
  res.json(get(`${SELECT_MOVIMENTS} WHERE m.id = ?`, idParam(req)) ?? notFound());
});

comptabilitatRouter.post('/moviments', (req, res) => {
  const m = llegirMoviment(req.body);
  comprovaObert(m.data);
  const { id } = ambTancament(() =>
    run(`INSERT INTO moviments (${CAMPS_MOV.join(', ')}) VALUES (${CAMPS_MOV.map((c) => '$' + c).join(', ')})`, m),
  );
  registra(req, 'crea', 'moviment', id, `${m.data} ${m.concepte} (${centsAEuros(m.import_cents)} €)`);
  res.status(201).json(get(`${SELECT_MOVIMENTS} WHERE m.id = ?`, id));
});

/** Resum d'un moviment per al registre d'auditoria. */
const resum = (m: { data: string; concepte: string; import_cents: number; tipus: string }) =>
  `${m.data} · ${m.tipus} · ${m.concepte} · ${centsAEuros(m.import_cents)} €`;

comptabilitatRouter.put('/moviments/:id', (req, res) => {
  const id = idParam(req);
  const actual = get<Moviment & { subvencio_id: number | null }>('SELECT * FROM moviments WHERE id = ?', id) ?? notFound();
  const m = llegirMoviment(req.body);
  // Si el formulari no envia la subvenció, es conserva la que tenia (si continua sent un ingrés).
  if (req.body.subvencio_id === undefined && m.tipus === 'ingres') m.subvencio_id = actual.subvencio_id;
  comprovaObert(actual.data, m.data);
  // Despeses imputades a subvencions: no poden deixar de ser despeses ni baixar per davall del que tenen imputat.
  const imputat = get<{ s: number; justificades: number }>(
    `SELECT COALESCE(SUM(i.import_cents), 0) AS s, COALESCE(SUM(sv.estat IN ('justificada','tancada')), 0) AS justificades
       FROM subvencio_imputacions i JOIN subvencions sv ON sv.id = i.subvencio_id WHERE i.moviment_id = ?`,
    id,
  )!;
  if (imputat.s && m.tipus !== 'despesa')
    throw new HttpError(400, "Aquesta despesa està imputada a una subvenció: no se'n pot canviar el tipus.");
  if (imputat.s > m.import_cents)
    throw new HttpError(400, `Aquesta despesa té ${centsAEuros(imputat.s)} € imputats a subvencions: l'import no pot ser inferior.`);
  if (imputat.justificades && (m.import_cents !== actual.import_cents || m.data !== actual.data))
    throw new HttpError(409, "Aquesta despesa forma part d'una subvenció ja justificada: no se'n pot canviar l'import ni la data.");
  const quota = get('SELECT id FROM quotes WHERE moviment_id = ?', id);
  if (quota && (m.import_cents !== actual.import_cents || m.tipus !== actual.tipus))
    throw new HttpError(400, "Aquest moviment és el cobrament d'una quota: canvia'n l'import des de Quotes.");
  tx(() =>
    ambTancament(() => {
      run(`UPDATE moviments SET ${CAMPS_MOV.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`, { ...m, id });
      if (quota) run('UPDATE quotes SET data_pagament = ? WHERE moviment_id = ?', m.data, id);
    }),
  );
  registra(req, 'modifica', 'moviment', id, `Abans: ${resum(actual)} → Ara: ${resum(m)}`);
  res.json(get(`${SELECT_MOVIMENTS} WHERE m.id = ?`, id));
});

comptabilitatRouter.delete('/moviments/:id', (req, res) => {
  const id = idParam(req);
  const actual = get<Moviment>('SELECT * FROM moviments WHERE id = ?', id) ?? notFound();
  comprovaObert(actual.data);
  if (
    get(
      `SELECT 1 AS x FROM subvencio_imputacions i JOIN subvencions sv ON sv.id = i.subvencio_id
        WHERE i.moviment_id = ? AND sv.estat IN ('justificada','tancada')`,
      id,
    )
  )
    throw new HttpError(409, "Aquesta despesa forma part d'una subvenció ja justificada: no es pot eliminar.");
  if (get("SELECT 1 AS x FROM remeses WHERE moviment_id = ? AND estat = 'cobrada'", id))
    throw new HttpError(409, "Aquest moviment és l'abonament d'una remesa de rebuts: no es pot eliminar. Registra les devolucions des de Tresoreria.");
  tx(() =>
    ambTancament(() => {
      // Si era el cobrament d'una quota, la quota torna a quedar pendent.
      run("UPDATE quotes SET estat = 'pendent', data_pagament = NULL, moviment_id = NULL, metode = NULL WHERE moviment_id = ?", id);
      run('DELETE FROM moviments WHERE id = ?', id);
    }),
  );
  registra(req, 'elimina', 'moviment', id, resum(actual));
  res.status(204).end();
});

// ---------- Justificants adjunts (factures, tiquets, rebuts) ----------
// En un exercici tancat se'n poden afegir (completen la documentació sense alterar els comptes),
// però no eliminar-ne: ho impedeix un disparador (server/esquema/subvencions.ts).

const COLS_JUSTIFICANT = 'id, moviment_id, nom, mime, mida, usuari, creat_el';

comptabilitatRouter.get('/moviments/:id/justificants', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 AS x FROM moviments WHERE id = ?', id)) notFound();
  res.json(all(`SELECT ${COLS_JUSTIFICANT} FROM justificants WHERE moviment_id = ? ORDER BY id`, id));
});

comptabilitatRouter.post('/moviments/:id/justificants', (req, res) => {
  const id = idParam(req);
  const mov = get<{ data: string; concepte: string }>('SELECT data, concepte FROM moviments WHERE id = ?', id) ?? notFound();
  const f = llegeixFitxer(req.body);
  const { id: jid } = run(
    'INSERT INTO justificants (moviment_id, nom, mime, mida, dades, usuari) VALUES (?, ?, ?, ?, ?, ?)',
    id, f.nom, f.mime, f.mida, f.dades, autor(req),
  );
  registra(req, 'crea', 'justificant', jid, `${mov.data} ${mov.concepte}: ${f.nom}`);
  res.status(201).json(get(`SELECT ${COLS_JUSTIFICANT} FROM justificants WHERE id = ?`, jid));
});

comptabilitatRouter.get('/justificants/:id', (req, res) => {
  res.json(get(`SELECT ${COLS_JUSTIFICANT}, dades FROM justificants WHERE id = ?`, idParam(req)) ?? notFound());
});

comptabilitatRouter.delete('/justificants/:id', (req, res) => {
  const id = idParam(req);
  const j = get<{ nom: string; moviment_id: number }>('SELECT nom, moviment_id FROM justificants WHERE id = ?', id) ?? notFound();
  run('DELETE FROM justificants WHERE id = ?', id);
  registra(req, 'elimina', 'justificant', id, `Moviment ${j.moviment_id}: ${j.nom}`);
  res.status(204).end();
});
