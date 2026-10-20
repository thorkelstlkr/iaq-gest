// Subvencions (Llei 38/2003 General de Subvencions i RD 887/2006): sol·licituds, concessions, cobraments,
// imputació de despeses i compte justificatiu simplificat (art. 75 RD 887/2006).
import { Router } from 'express';
import type { Request } from 'express';
import { all, get, run, tx } from '../db.ts';
import {
  HttpError, centsAEuros, columnesTraduides, data, enter, idParam, notFound, sendCsv, text, textObligatori, toCsv,
} from '../util.ts';
import { registra } from '../auditoria.ts';
import { idiomaDe, tradueix } from '../i18n.ts';
import { ESTATS_SUBVENCIO } from '../esquema/subvencions.ts';

export const subvencionsRouter = Router();

export type EstatSubvencio = (typeof ESTATS_SUBVENCIO)[number];
/** Estats en què ja no es poden tocar les despeses imputades (s'ha presentat la justificació). */
const ESTATS_JUSTIFICATS: EstatSubvencio[] = ['justificada', 'tancada'];

// ---------- Fitxers adjunts (data URI en base64) ----------

/** Mida màxima d'un fitxer adjunt (el límit de les peticions JSON és de 2 MB i el base64 n'ocupa 4/3). */
export const MIDA_MAX_FITXER = Math.round(1.4 * 1024 * 1024);
const MIMES = /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/;

/** Valida un fitxer enviat com a data URI. Torna el tipus i la mida real en bytes. */
export function llegeixFitxer(body: Record<string, unknown>): { nom: string; mime: string; mida: number; dades: string } {
  const dades = typeof body.dades === 'string' ? body.dades : '';
  const m = MIMES.exec(dades);
  if (!m) throw new HttpError(400, 'El fitxer ha de ser una imatge (JPG, PNG, WebP) o un PDF.');
  const b64 = m[2].replace(/\s/g, '');
  const mida = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  if (mida > MIDA_MAX_FITXER) throw new HttpError(413, 'El fitxer és massa gran (màxim 1,4 MB).');
  const nom = (text(body.nom) ?? 'document').slice(0, 200);
  return { nom, mime: m[1], mida, dades: `data:${m[1]};base64,${b64}` };
}

// ---------- Consultes ----------

export interface Subvencio {
  id: number;
  organisme: string;
  convocatoria: string | null;
  linia: string | null;
  expedient: string | null;
  exercici: number;
  import_sollicitat_cents: number;
  import_concedit_cents: number | null;
  pressupost_projecte_cents: number | null;
  data_sollicitud: string | null;
  data_resolucio: string | null;
  periode_inici: string | null;
  periode_fi: string | null;
  termini_justificacio: string | null;
  activitat_id: number | null;
  activitat_nom?: string | null;
  estat: EstatSubvencio;
  requisits: string | null;
  notes: string | null;
  memoria: string | null;
  altres_ingressos: string | null;
  data_justificacio: string | null;
  document_nom: string | null;
  document_mime: string | null;
  document_mida: number | null;
  cobrat_cents: number;
  imputat_cents: number;
  n_imputacions: number;
  n_sense_justificant: number;
}

const SELECT_SUBVENCIONS = `
  SELECT s.id, s.organisme, s.convocatoria, s.linia, s.expedient, s.exercici, s.import_sollicitat_cents,
         s.import_concedit_cents, s.pressupost_projecte_cents, s.data_sollicitud, s.data_resolucio,
         s.periode_inici, s.periode_fi, s.termini_justificacio, s.activitat_id, a.nom AS activitat_nom, s.estat,
         s.requisits, s.notes, s.memoria, s.altres_ingressos, s.data_justificacio,
         s.document_nom, s.document_mime, s.document_mida,
         COALESCE((SELECT SUM(m.import_cents) FROM moviments m WHERE m.subvencio_id = s.id AND m.tipus = 'ingres'), 0) AS cobrat_cents,
         COALESCE((SELECT SUM(i.import_cents) FROM subvencio_imputacions i WHERE i.subvencio_id = s.id), 0) AS imputat_cents,
         (SELECT COUNT(*) FROM subvencio_imputacions i WHERE i.subvencio_id = s.id) AS n_imputacions,
         (SELECT COUNT(*) FROM subvencio_imputacions i WHERE i.subvencio_id = s.id
             AND NOT EXISTS (SELECT 1 FROM justificants j WHERE j.moviment_id = i.moviment_id)) AS n_sense_justificant
    FROM subvencions s
    LEFT JOIN activitats a ON a.id = s.activitat_id`;

export const llistaSubvencions = (where = '1', ...params: unknown[]) =>
  all<Subvencio>(`${SELECT_SUBVENCIONS} WHERE ${where} ORDER BY s.exercici DESC, COALESCE(s.data_sollicitud, s.creat_el) DESC, s.id DESC`, ...params);

export const subvencio = (id: number) => get<Subvencio>(`${SELECT_SUBVENCIONS} WHERE s.id = ?`, id);

export interface Imputacio {
  id: number;
  subvencio_id: number;
  moviment_id: number;
  import_cents: number;
  creditor: string | null;
  data_emissio: string | null;
  data: string; // data del moviment (pagament)
  concepte: string;
  justificant: string | null;
  moviment_cents: number;
  categoria_nom: string | null;
  activitat_nom: string | null;
  n_justificants: number;
  imputat_altres_cents: number;
}

export const imputacions = (subvencioId: number) =>
  all<Imputacio>(
    `SELECT i.id, i.subvencio_id, i.moviment_id, i.import_cents, i.creditor, i.data_emissio,
            m.data, m.concepte, m.justificant, m.import_cents AS moviment_cents,
            cat.nom AS categoria_nom, a.nom AS activitat_nom,
            (SELECT COUNT(*) FROM justificants j WHERE j.moviment_id = m.id) AS n_justificants,
            COALESCE((SELECT SUM(x.import_cents) FROM subvencio_imputacions x WHERE x.moviment_id = m.id AND x.id <> i.id), 0) AS imputat_altres_cents
       FROM subvencio_imputacions i
       JOIN moviments m ON m.id = i.moviment_id
       LEFT JOIN categories cat ON cat.id = m.categoria_id
       LEFT JOIN activitats a ON a.id = m.activitat_id
      WHERE i.subvencio_id = ?
      ORDER BY cat.nom, m.data, m.id`,
    subvencioId,
  );

export interface Justificacio {
  subvencio: Subvencio;
  despeses: Imputacio[];
  /** Despeses per categoria (relació classificada). */
  per_categoria: { categoria: string; cost_cents: number; imputat_cents: number }[];
  cobraments: { id: number; data: string; concepte: string; import_cents: number }[];
  /** Altres ingressos de l'activitat (no són cobraments d'aquesta subvenció). */
  altres_ingressos: { id: number; data: string; concepte: string; import_cents: number; categoria_nom: string | null }[];
  totals: {
    concedit_cents: number;
    cobrat_cents: number;
    pendent_cobrar_cents: number;
    imputat_cents: number;
    cost_cents: number; // import total de les despeses imputades (cost executat)
    pressupost_cents: number | null;
    desviacio_cents: number | null; // cost executat - pressupost
    desviacio_percent: number | null;
    execucio_percent: number | null;
    falta_imputar_cents: number; // concedit - imputat (si és positiu)
    altres_ingressos_cents: number;
    sense_justificant: number;
  };
}

/** Totals, desviació respecte del pressupost i dades del compte justificatiu simplificat. */
export function justificacio(id: number): Justificacio | undefined {
  const s = subvencio(id);
  if (!s) return undefined;
  const despeses = imputacions(id);
  const cats = new Map<string, { categoria: string; cost_cents: number; imputat_cents: number }>();
  for (const d of despeses) {
    const k = d.categoria_nom ?? '—';
    const c = cats.get(k) ?? { categoria: k, cost_cents: 0, imputat_cents: 0 };
    c.cost_cents += d.moviment_cents;
    c.imputat_cents += d.import_cents;
    cats.set(k, c);
  }
  const cobraments = all<{ id: number; data: string; concepte: string; import_cents: number }>(
    "SELECT id, data, concepte, import_cents FROM moviments WHERE subvencio_id = ? AND tipus = 'ingres' ORDER BY data, id",
    id,
  );
  const altres = s.activitat_id
    ? all<Justificacio['altres_ingressos'][number]>(
        `SELECT m.id, m.data, m.concepte, m.import_cents, cat.nom AS categoria_nom
           FROM moviments m LEFT JOIN categories cat ON cat.id = m.categoria_id
          WHERE m.tipus = 'ingres' AND m.activitat_id = ? AND (m.subvencio_id IS NULL OR m.subvencio_id <> ?)
          ORDER BY m.data, m.id`,
        s.activitat_id, id,
      )
    : [];
  const imputat = despeses.reduce((t, d) => t + d.import_cents, 0);
  const cost = despeses.reduce((t, d) => t + d.moviment_cents, 0);
  const concedit = s.import_concedit_cents ?? 0;
  const pressupost = s.pressupost_projecte_cents || null;
  const desviacio = pressupost ? cost - pressupost : null;
  return {
    subvencio: s,
    despeses,
    per_categoria: [...cats.values()],
    cobraments,
    altres_ingressos: altres,
    totals: {
      concedit_cents: concedit,
      cobrat_cents: s.cobrat_cents,
      pendent_cobrar_cents: Math.max(0, concedit - s.cobrat_cents),
      imputat_cents: imputat,
      cost_cents: cost,
      pressupost_cents: pressupost,
      desviacio_cents: desviacio,
      desviacio_percent: pressupost && desviacio !== null ? Math.round((desviacio / pressupost) * 1000) / 10 : null,
      execucio_percent: pressupost ? Math.round((cost / pressupost) * 1000) / 10 : null,
      falta_imputar_cents: Math.max(0, concedit - imputat),
      altres_ingressos_cents: altres.reduce((t, m) => t + m.import_cents, 0),
      sense_justificant: despeses.filter((d) => !d.n_justificants).length,
    },
  };
}

// ---------- Subvencions ----------

function estat(v: unknown): EstatSubvencio {
  const e = String(v ?? 'preparacio');
  if (!(ESTATS_SUBVENCIO as readonly string[]).includes(e)) throw new HttpError(400, 'Estat de la subvenció no vàlid.');
  return e as EstatSubvencio;
}

const centsOpcionals = (v: unknown, camp: string) => {
  const n = enter(v, camp);
  if (n !== null && n < 0) throw new HttpError(400, `L'import «${camp}» no és vàlid.`);
  return n;
};

function llegirSubvencio(body: Record<string, unknown>) {
  const s = {
    organisme: textObligatori(body.organisme, 'Organisme'),
    convocatoria: text(body.convocatoria),
    linia: text(body.linia),
    expedient: text(body.expedient),
    exercici: enter(body.exercici, 'Exercici'),
    import_sollicitat_cents: centsOpcionals(body.import_sollicitat_cents, 'Import sol·licitat') ?? 0,
    import_concedit_cents: centsOpcionals(body.import_concedit_cents, 'Import concedit'),
    pressupost_projecte_cents: centsOpcionals(body.pressupost_projecte_cents, 'Pressupost del projecte'),
    data_sollicitud: data(body.data_sollicitud, 'Data de sol·licitud'),
    data_resolucio: data(body.data_resolucio, 'Data de resolució'),
    periode_inici: data(body.periode_inici, "Inici del període d'execució"),
    periode_fi: data(body.periode_fi, "Fi del període d'execució"),
    termini_justificacio: data(body.termini_justificacio, 'Termini de justificació'),
    activitat_id: enter(body.activitat_id, 'Activitat'),
    estat: estat(body.estat),
    requisits: text(body.requisits),
    notes: text(body.notes),
  };
  if (!s.exercici || s.exercici < 1900 || s.exercici > 3000) throw new HttpError(400, 'Exercici no vàlid.');
  if (s.periode_inici && s.periode_fi && s.periode_fi < s.periode_inici)
    throw new HttpError(400, "El període d'execució acaba abans de començar.");
  if (['concedida', 'cobrada', 'justificada', 'tancada'].includes(s.estat) && s.import_concedit_cents === null)
    throw new HttpError(400, "Cal indicar l'import concedit.");
  if (s.activitat_id && !get('SELECT 1 AS x FROM activitats WHERE id = ?', s.activitat_id)) throw new HttpError(400, 'Activitat inexistent.');
  return s;
}

const CAMPS = [
  'organisme', 'convocatoria', 'linia', 'expedient', 'exercici', 'import_sollicitat_cents', 'import_concedit_cents',
  'pressupost_projecte_cents', 'data_sollicitud', 'data_resolucio', 'periode_inici', 'periode_fi', 'termini_justificacio',
  'activitat_id', 'estat', 'requisits', 'notes',
];

const resum = (s: { organisme: string; convocatoria: string | null; exercici: number | null }) =>
  [s.organisme, s.convocatoria, s.exercici].filter(Boolean).join(' · ');

subvencionsRouter.get('/', (req, res) => {
  const ex = text(req.query.exercici);
  const estats = text(req.query.estats)?.split(',').filter((e) => (ESTATS_SUBVENCIO as readonly string[]).includes(e));
  const where: string[] = [];
  const params: unknown[] = [];
  if (ex && ex !== 'totes') {
    const n = Number(ex);
    if (!Number.isInteger(n)) throw new HttpError(400, 'Exercici no vàlid.');
    // Les de l'exercici i les que encara estan vives (pendents de justificar o cobrar).
    where.push("(s.exercici = ? OR s.estat IN ('sollicitada','concedida','cobrada'))");
    params.push(n);
  }
  if (estats?.length) where.push(`s.estat IN (${estats.map(() => '?').join(',')})`), params.push(...estats);
  res.json(llistaSubvencions(where.join(' AND ') || '1', ...params));
});

/** Imputacions d'un moviment (per al formulari de moviments). */
subvencionsRouter.get('/moviment/:id', (req, res) => {
  res.json(
    all(
      `SELECT i.id, i.subvencio_id, i.import_cents, i.creditor, s.organisme, s.convocatoria, s.exercici, s.estat
         FROM subvencio_imputacions i JOIN subvencions s ON s.id = i.subvencio_id
        WHERE i.moviment_id = ? ORDER BY i.id`,
      idParam(req),
    ),
  );
});

/** Justificant adjunt a una despesa imputada (lectura també per al perfil d'informes). */
subvencionsRouter.get('/justificants/:id', (req, res) => {
  const j = get(
    `SELECT j.id, j.moviment_id, j.nom, j.mime, j.mida, j.dades, j.creat_el FROM justificants j
      WHERE j.id = ? AND EXISTS (SELECT 1 FROM subvencio_imputacions i WHERE i.moviment_id = j.moviment_id)`,
    idParam(req),
  );
  res.json(j ?? notFound());
});

subvencionsRouter.get('/justificants-moviment/:id', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 AS x FROM subvencio_imputacions WHERE moviment_id = ?', id)) notFound();
  res.json(all('SELECT id, moviment_id, nom, mime, mida, creat_el FROM justificants WHERE moviment_id = ? ORDER BY id', id));
});

subvencionsRouter.get('/:id', (req, res) => {
  res.json(subvencio(idParam(req)) ?? notFound());
});

subvencionsRouter.post('/', (req, res) => {
  const s = llegirSubvencio(req.body);
  const { id } = run(`INSERT INTO subvencions (${CAMPS.join(', ')}) VALUES (${CAMPS.map((c) => '$' + c).join(', ')})`, s);
  registra(req, 'crea', 'subvencio', id, resum(s));
  res.status(201).json(subvencio(id));
});

subvencionsRouter.put('/:id', (req, res) => {
  const id = idParam(req);
  const actual = subvencio(id) ?? notFound();
  const s = llegirSubvencio(req.body);
  run(`UPDATE subvencions SET ${CAMPS.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`, { ...s, id });
  // Si deixa d'estar justificada, s'esborra la data de justificació.
  if (!ESTATS_JUSTIFICATS.includes(s.estat) && s.estat !== 'reintegrament') run('UPDATE subvencions SET data_justificacio = NULL WHERE id = ?', id);
  registra(req, 'modifica', 'subvencio', id, actual.estat !== s.estat ? `${resum(s)} (${actual.estat} → ${s.estat})` : resum(s));
  res.json(subvencio(id));
});

subvencionsRouter.delete('/:id', (req, res) => {
  const id = idParam(req);
  const actual = subvencio(id) ?? notFound();
  if (ESTATS_JUSTIFICATS.includes(actual.estat))
    throw new HttpError(409, "Una subvenció justificada no es pot eliminar: s'ha de conservar almenys quatre anys.");
  tx(() => {
    run('UPDATE moviments SET subvencio_id = NULL WHERE subvencio_id = ?', id);
    run('DELETE FROM subvencions WHERE id = ?', id);
  });
  registra(req, 'elimina', 'subvencio', id, resum(actual));
  res.status(204).end();
});

// ---------- Document de resolució ----------

subvencionsRouter.get('/:id/document', (req, res) => {
  const d = get<{ nom: string | null; mime: string | null; mida: number | null; dades: string | null }>(
    'SELECT document_nom AS nom, document_mime AS mime, document_mida AS mida, document_dades AS dades FROM subvencions WHERE id = ?',
    idParam(req),
  );
  if (!d?.dades) notFound();
  res.json(d);
});

subvencionsRouter.put('/:id/document', (req, res) => {
  const id = idParam(req);
  const f = llegeixFitxer(req.body);
  const { changes } = run(
    'UPDATE subvencions SET document_nom = ?, document_mime = ?, document_mida = ?, document_dades = ? WHERE id = ?',
    f.nom, f.mime, f.mida, f.dades, id,
  );
  if (!changes) notFound();
  registra(req, 'modifica', 'subvencio', id, `Document de resolució: ${f.nom}`);
  res.json(subvencio(id));
});

subvencionsRouter.delete('/:id/document', (req, res) => {
  const id = idParam(req);
  const { changes } = run(
    'UPDATE subvencions SET document_nom = NULL, document_mime = NULL, document_mida = NULL, document_dades = NULL WHERE id = ?',
    id,
  );
  if (!changes) notFound();
  registra(req, 'modifica', 'subvencio', id, 'Document de resolució eliminat');
  res.status(204).end();
});

// ---------- Despeses imputades ----------

subvencionsRouter.get('/:id/imputacions', (req, res) => {
  const id = idParam(req);
  if (!subvencio(id)) notFound();
  res.json(imputacions(id));
});

/**
 * Moviments que es poden vincular: despeses (per imputar) o ingressos (cobraments).
 * Per defecte, només els del període d'execució; ?tots=1 en mostra de qualsevol data.
 */
subvencionsRouter.get('/:id/candidats', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  const tipus = req.query.tipus === 'ingres' ? 'ingres' : 'despesa';
  const where = ['m.tipus = $tipus'];
  const p: Record<string, string | number> = { tipus, sid: s.id };
  if (req.query.tots !== '1') {
    const inici = s.periode_inici ?? `${s.exercici}-01-01`;
    const fi = s.periode_fi ?? `${s.exercici}-12-31`;
    // Els pagaments poden ser posteriors al període (fins al termini de justificació).
    const fiPagament = tipus === 'despesa' && s.termini_justificacio && s.termini_justificacio > fi ? s.termini_justificacio : fi;
    where.push('m.data BETWEEN $inici AND $fi');
    Object.assign(p, { inici, fi: tipus === 'ingres' ? `${Number(fi.slice(0, 4)) + 2}-12-31` : fiPagament });
  }
  const cat = enter(req.query.categoria_id, 'Categoria');
  if (cat) where.push('m.categoria_id = $cat'), (p.cat = cat);
  const act = enter(req.query.activitat_id, 'Activitat');
  if (act) where.push('m.activitat_id = $act'), (p.act = act);
  const q = text(req.query.q);
  if (q) where.push('(m.concepte LIKE $q OR m.justificant LIKE $q)'), (p.q = `%${q}%`);
  if (tipus === 'despesa') {
    where.push('NOT EXISTS (SELECT 1 FROM subvencio_imputacions x WHERE x.moviment_id = m.id AND x.subvencio_id = $sid)');
  } else {
    where.push('(m.subvencio_id IS NULL OR m.subvencio_id <> $sid)');
  }
  res.json(
    all(
      `SELECT m.id, m.data, m.concepte, m.import_cents, m.justificant, m.subvencio_id, cat.nom AS categoria_nom, a.nom AS activitat_nom,
              COALESCE((SELECT SUM(x.import_cents) FROM subvencio_imputacions x WHERE x.moviment_id = m.id), 0) AS imputat_cents,
              (SELECT COUNT(*) FROM justificants j WHERE j.moviment_id = m.id) AS n_justificants
         FROM moviments m
         LEFT JOIN categories cat ON cat.id = m.categoria_id
         LEFT JOIN activitats a ON a.id = m.activitat_id
        WHERE ${where.join(' AND ')}
        ORDER BY m.data DESC, m.id DESC LIMIT 300`,
      p,
    ),
  );
});

function comprovaEditable(s: Subvencio) {
  if (ESTATS_JUSTIFICATS.includes(s.estat))
    throw new HttpError(409, "La subvenció ja està justificada: per canviar les despeses imputades, torna-la a l'estat «Concedida» o «Cobrada».");
}

function llegirImputacio(body: Record<string, unknown>) {
  const import_cents = enter(body.import_cents, 'Import imputat');
  if (!import_cents || import_cents <= 0) throw new HttpError(400, "L'import imputat ha de ser més gran que zero.");
  return { import_cents, creditor: text(body.creditor), data_emissio: data(body.data_emissio, "Data d'emissió") };
}

/** Comprova que l'import cap dins del moviment, tenint en compte les altres subvencions. */
function comprovaLimit(movimentId: number, importCents: number, excepte: number | null) {
  const m = get<{ tipus: string; import_cents: number }>('SELECT tipus, import_cents FROM moviments WHERE id = ?', movimentId);
  if (!m) throw new HttpError(400, 'Moviment inexistent.');
  if (m.tipus !== 'despesa') throw new HttpError(400, 'Només es poden imputar moviments de despesa.');
  const altres = get<{ s: number }>(
    'SELECT COALESCE(SUM(import_cents), 0) AS s FROM subvencio_imputacions WHERE moviment_id = ? AND id <> ?',
    movimentId, excepte ?? 0,
  )!.s;
  if (altres + importCents > m.import_cents)
    throw new HttpError(
      400,
      `No es pot imputar més de l'import del moviment: en queden ${centsAEuros(m.import_cents - altres)} € disponibles.`,
    );
}

subvencionsRouter.post('/:id/imputacions', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  comprovaEditable(s);
  const moviment_id = enter(req.body.moviment_id, 'Moviment');
  if (!moviment_id) throw new HttpError(400, 'Cal triar un moviment.');
  const imp = llegirImputacio(req.body);
  comprovaLimit(moviment_id, imp.import_cents, null);
  if (get('SELECT 1 AS x FROM subvencio_imputacions WHERE subvencio_id = ? AND moviment_id = ?', s.id, moviment_id))
    throw new HttpError(409, "Aquesta despesa ja està imputada a la subvenció: modifica'n l'import.");
  const { id } = run(
    'INSERT INTO subvencio_imputacions (subvencio_id, moviment_id, import_cents, creditor, data_emissio) VALUES (?, ?, ?, ?, ?)',
    s.id, moviment_id, imp.import_cents, imp.creditor, imp.data_emissio,
  );
  registra(req, 'crea', 'subvencio_imputacio', id, `${resum(s)}: moviment ${moviment_id} (${centsAEuros(imp.import_cents)} €)`);
  res.status(201).json(imputacions(s.id).find((i) => i.id === id));
});

subvencionsRouter.put('/:id/imputacions/:imp', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  comprovaEditable(s);
  const impId = Number(req.params.imp);
  const actual = get<{ moviment_id: number }>('SELECT moviment_id FROM subvencio_imputacions WHERE id = ? AND subvencio_id = ?', impId, s.id) ?? notFound();
  const imp = llegirImputacio(req.body);
  comprovaLimit(actual.moviment_id, imp.import_cents, impId);
  run('UPDATE subvencio_imputacions SET import_cents = ?, creditor = ?, data_emissio = ? WHERE id = ?', imp.import_cents, imp.creditor, imp.data_emissio, impId);
  registra(req, 'modifica', 'subvencio_imputacio', impId, `${resum(s)}: moviment ${actual.moviment_id} (${centsAEuros(imp.import_cents)} €)`);
  res.json(imputacions(s.id).find((i) => i.id === impId));
});

subvencionsRouter.delete('/:id/imputacions/:imp', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  comprovaEditable(s);
  const impId = Number(req.params.imp);
  const { changes } = run('DELETE FROM subvencio_imputacions WHERE id = ? AND subvencio_id = ?', impId, s.id);
  if (!changes) notFound();
  registra(req, 'elimina', 'subvencio_imputacio', impId, resum(s));
  res.status(204).end();
});

// ---------- Cobraments ----------

subvencionsRouter.get('/:id/cobraments', (req, res) => {
  const id = idParam(req);
  if (!subvencio(id)) notFound();
  res.json(
    all(
      `SELECT m.id, m.data, m.concepte, m.import_cents, m.justificant, c.nom AS compte_nom
         FROM moviments m JOIN comptes c ON c.id = m.compte_id
        WHERE m.subvencio_id = ? AND m.tipus = 'ingres' ORDER BY m.data, m.id`,
      id,
    ),
  );
});

subvencionsRouter.post('/:id/cobraments', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  const movId = enter(req.body.moviment_id, 'Moviment');
  const m = movId ? get<{ tipus: string }>('SELECT tipus FROM moviments WHERE id = ?', movId) : undefined;
  if (!m) throw new HttpError(400, 'Moviment inexistent.');
  if (m.tipus !== 'ingres') throw new HttpError(400, "Els cobraments han de ser moviments d'ingrés.");
  run('UPDATE moviments SET subvencio_id = ? WHERE id = ?', s.id, movId);
  registra(req, 'modifica', 'moviment', movId, `Cobrament de la subvenció ${resum(s)}`);
  res.json(subvencio(s.id));
});

subvencionsRouter.delete('/:id/cobraments/:mov', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  const movId = Number(req.params.mov);
  const { changes } = run('UPDATE moviments SET subvencio_id = NULL WHERE id = ? AND subvencio_id = ?', movId, s.id);
  if (!changes) notFound();
  registra(req, 'modifica', 'moviment', movId, `Desvinculat de la subvenció ${resum(s)}`);
  res.status(204).end();
});

// ---------- Justificació ----------

subvencionsRouter.get('/:id/justificacio', (req, res) => {
  res.json(justificacio(idParam(req)) ?? notFound());
});

/** Memòria d'actuació i altres fonts de finançament (text del compte justificatiu). */
subvencionsRouter.put('/:id/justificacio', (req, res) => {
  const id = idParam(req);
  const { changes } = run(
    'UPDATE subvencions SET memoria = ?, altres_ingressos = ? WHERE id = ?',
    text(req.body.memoria), text(req.body.altres_ingressos), id,
  );
  if (!changes) notFound();
  res.json(justificacio(id));
});

/** Marca la subvenció com a justificada (presentada a l'organisme) en una data. */
subvencionsRouter.post('/:id/justifica', (req, res) => {
  const s = subvencio(idParam(req)) ?? notFound();
  if (!['concedida', 'cobrada'].includes(s.estat))
    throw new HttpError(409, 'Només es poden justificar subvencions concedides o cobrades.');
  if (!s.n_imputacions) throw new HttpError(400, 'Cal imputar alguna despesa abans de justificar la subvenció.');
  const d = data(req.body.data, 'Data de justificació');
  if (!d) throw new HttpError(400, 'La data «Data de justificació» és obligatòria.');
  run("UPDATE subvencions SET estat = 'justificada', data_justificacio = ? WHERE id = ?", d, s.id);
  registra(req, 'modifica', 'subvencio', s.id, `${resum(s)}: justificada el ${d}`);
  res.json(subvencio(s.id));
});

function csvDespeses(req: Request, id: number) {
  const j = justificacio(id) ?? notFound();
  const rows = j.despeses.map((d, i) => ({
    num: i + 1,
    categoria: d.categoria_nom ?? '',
    creditor: d.creditor ?? d.concepte,
    concepte: d.concepte,
    justificant: d.justificant ?? '',
    data_emissio: d.data_emissio ?? d.data,
    data_pagament: d.data,
    import: centsAEuros(d.moviment_cents),
    imputat: centsAEuros(d.import_cents),
    adjunt: tradueix(d.n_justificants ? 'Sí' : 'No', idiomaDe(req)),
  }));
  return toCsv(rows, columnesTraduides(req, [
    ['num', 'Núm.'], ['categoria', 'Categoria'], ['creditor', 'Creditor'], ['concepte', 'Concepte'],
    ['justificant', 'Núm. de factura / justificant'], ['data_emissio', "Data d'emissió"], ['data_pagament', 'Data de pagament'],
    ['import', 'Import (€)'], ['imputat', 'Import imputat (€)'], ['adjunt', 'Justificant adjunt'],
  ]));
}

subvencionsRouter.get('/:id/despeses.csv', (req, res) => {
  const id = idParam(req);
  sendCsv(res, `subvencio-${id}-despeses.csv`, csvDespeses(req, id));
});
