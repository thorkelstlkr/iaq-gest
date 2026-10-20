// Òrgans de govern: reunions (assemblea, junta, comissions), assistència i quòrum, acords,
// llibre d'actes (LO 1/2002, art. 14), junta directiva, convocatòries i certificats.

import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { HttpError, data, dataObligatoria, enter, idParam, notFound, text, textObligatori } from '../util.ts';
import { registra } from '../auditoria.ts';
import { autor } from './auth.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import { correuConfigurat, enviaCorreus } from '../correu.ts';
import { esIdioma, tr } from '../i18n.ts';
import type { Idioma } from '../i18n.ts';

export const governancaRouter = Router();

// ---------- Tipus i constants ----------

export const ORGANS = ['assemblea', 'junta', 'comissio'] as const;
export const TIPUS_REUNIO = ['ordinaria', 'extraordinaria'] as const;
export const ESTATS_REUNIO = ['prevista', 'convocada', 'celebrada', 'anullada'] as const;
export const CARRECS = ['presidencia', 'vicepresidencia', 'secretaria', 'tresoreria', 'vocal'] as const;
const RESULTATS = ['aprovat', 'rebutjat', 'informatiu'] as const;
const TIPUS_CERTIFICAT = ['soci', 'acord', 'junta'] as const;

type Organ = (typeof ORGANS)[number];
type Carrec = (typeof CARRECS)[number];

export interface Reunio {
  id: number;
  organ: Organ;
  tipus: 'ordinaria' | 'extraordinaria';
  titol: string | null;
  data: string;
  hora_1a: string | null;
  hora_2a: string | null;
  lloc: string | null;
  ordre_dia: string;
  estat: (typeof ESTATS_REUNIO)[number];
  data_convocatoria: string | null;
  convocatoria_celebrada: '1a' | '2a' | null;
  notes: string | null;
}

interface SociBasic {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  dni: string | null;
  email: string | null;
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
}

interface Acta {
  id: number;
  reunio_id: number;
  organ: string;
  any: number;
  numero: number;
  text: string;
  data_aprovacio: string | null;
  presidencia: string | null;
  secretaria: string | null;
  tancada: number;
  tancada_el: string | null;
  tancada_per: string | null;
}

const nomDe = (s: { nom: string; llinatges: string }) => `${s.nom} ${s.llinatges}`.trim();
const dma = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');

function opcio<T extends string>(v: unknown, valors: readonly T[], camp: string, perDefecte?: T): T {
  const s = text(v);
  if (!s && perDefecte) return perDefecte;
  if (!s || !(valors as readonly string[]).includes(s)) throw new HttpError(400, `El camp «${camp}» no és vàlid.`);
  return s as T;
}

function hora(v: unknown, camp: string): string | null {
  const s = text(v);
  if (s && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new HttpError(400, `L'hora «${camp}» no és vàlida.`);
  return s;
}

function noNegatiu(v: unknown, camp: string): number | null {
  const n = enter(v, camp);
  if (n !== null && n < 0) throw new HttpError(400, `El camp «${camp}» no pot ser negatiu.`);
  return n;
}

/** Dies naturals entre dues dates (YYYY-MM-DD). */
export function diesEntre(de: string, a: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(a) - ms(de)) / 86400000);
}

// ---------- Configuració ----------

export function configGov() {
  const n = (clau: string, perDefecte: number) => {
    const v = Number(getConfig(clau));
    return getConfig(clau) !== null && Number.isFinite(v) ? v : perDefecte;
  };
  return { gov_dies_convocatoria: n('gov_dies_convocatoria', 15), gov_quorum_1a: n('gov_quorum_1a', 50) };
}

governancaRouter.get('/config', (_req, res) => {
  res.json(configGov());
});

governancaRouter.put('/config', (req, res) => {
  const dies = enter(req.body.gov_dies_convocatoria, 'Dies d\'antelació');
  if (dies === null || dies < 0 || dies > 90) throw new HttpError(400, "Els dies d'antelació han de ser entre 0 i 90.");
  const quorum = enter(req.body.gov_quorum_1a, 'Quòrum');
  if (quorum === null || quorum < 1 || quorum > 100) throw new HttpError(400, 'El quòrum ha de ser entre 1 i 100.');
  setConfig('gov_dies_convocatoria', String(dies));
  setConfig('gov_quorum_1a', String(quorum));
  registra(req, 'modifica', 'governanca', null, `Antelació ${dies} dies, quòrum ${quorum} %`);
  res.json(configGov());
});

// ---------- Socis amb dret a vot i junta vigent ----------

const COLS_SOCI = 's.id, s.num_soci, s.nom, s.llinatges, s.dni, s.email, s.adreca, s.codi_postal, s.poblacio';

/**
 * Condició SQL de soci amb dret a vot en una data (paràmetre repetit tres vegades). Equival a TE_VOT de
 * routes/socis.ts però referida a la data de la reunió: admès, actiu, no anonimitzat, major d'edat i amb categoria amb vot.
 * Les sol·licituds pendents tenen estat_admissio = 'sollicitada' (i data_baixa = data_alta).
 */
const COND_VOT = `s.estat_admissio = 'admesa' AND s.data_alta <= ? AND (s.data_baixa IS NULL OR s.data_baixa > ?) AND s.anonimitzat_el IS NULL
  AND (s.data_naixement IS NULL OR s.data_naixement <= date(?, '-18 years'))
  AND (s.categoria_id IS NULL OR EXISTS (SELECT 1 FROM categories_soci c WHERE c.id = s.categoria_id AND c.te_vot = 1))`;

/** Socis amb dret a vot en una data: actius, majors d'edat (si consta la data de naixement) i d'una categoria amb vot. */
export function votants(dataRef: string = avui()): SociBasic[] {
  return all<SociBasic>(`SELECT ${COLS_SOCI} FROM socis s WHERE ${COND_VOT} ORDER BY s.llinatges, s.nom`, dataRef, dataRef, dataRef);
}

/** Càrrecs vigents en una data (inclosos els que tenen el mandat vençut i encara no han estat substituïts). */
export function carrecsVigents(dataRef: string = avui()) {
  return all<SociBasic & { carrec_id: number; soci_id: number; carrec: Carrec; data_eleccio: string; data_fi_mandat: string | null }>(
    `SELECT ${COLS_SOCI}, c.id AS carrec_id, c.soci_id, c.carrec, c.data_eleccio, c.data_fi_mandat
       FROM carrecs c JOIN socis s ON s.id = c.soci_id
      WHERE c.data_eleccio <= ? AND (c.data_cessament IS NULL OR c.data_cessament > ?)
      ORDER BY CASE c.carrec WHEN 'presidencia' THEN 1 WHEN 'vicepresidencia' THEN 2 WHEN 'secretaria' THEN 3
                             WHEN 'tresoreria' THEN 4 ELSE 5 END, c.data_eleccio DESC, s.llinatges`,
    dataRef, dataRef,
  );
}

export interface Persona {
  soci_id: number;
  nom: string;
}
export interface Junta {
  presidencia: Persona | null;
  vicepresidencia: Persona | null;
  secretaria: Persona | null;
  tresoreria: Persona | null;
  vocals: Persona[];
}

/** Composició de la junta directiva en una data (per als blocs de signatura d'altres mòduls). */
export function juntaActual(dataRef: string = avui()): Junta {
  const v = carrecsVigents(dataRef);
  const persona = (r: (typeof v)[number]): Persona => ({ soci_id: r.soci_id, nom: nomDe(r) });
  const un = (c: Carrec) => {
    const r = v.find((x) => x.carrec === c);
    return r ? persona(r) : null;
  };
  return {
    presidencia: un('presidencia'),
    vicepresidencia: un('vicepresidencia'),
    secretaria: un('secretaria'),
    tresoreria: un('tresoreria'),
    vocals: v.filter((x) => x.carrec === 'vocal').map(persona),
  };
}

governancaRouter.get('/junta-actual', (req, res) => {
  res.json(juntaActual(data(req.query.data, 'Data') ?? avui()));
});

/** Socis per triar als formularis (actius en una data, amb indicació del dret a vot). */
governancaRouter.get('/socis', (req, res) => {
  const d = data(req.query.data, 'Data') ?? avui();
  const tots = req.query.tots === '1';
  res.json(
    all(
      `SELECT ${COLS_SOCI}, s.data_alta, s.data_baixa, (CASE WHEN ${COND_VOT} THEN 1 ELSE 0 END) AS votant
         FROM socis s
        WHERE s.anonimitzat_el IS NULL AND s.estat_admissio = 'admesa' ${tots ? '' : 'AND s.data_alta <= ? AND (s.data_baixa IS NULL OR s.data_baixa > ?)'}
        ORDER BY s.llinatges, s.nom`,
      d, d, d, ...(tots ? [] : [d, d]),
    ),
  );
});

// ---------- Quòrum i antelació ----------

export interface Quorum {
  cens: number | null;
  presents: number;
  representats: number;
  total: number;
  percentatge: number | null;
  quorum_1a_pct: number;
  necessaris_1a: number | null;
  arriba_1a: boolean;
  arriba_2a: boolean;
}

/** Cens de la reunió: socis amb vot (assemblea) o membres de la junta (junta). Les comissions no en tenen. */
function cens(r: Pick<Reunio, 'organ' | 'data'>): number[] | null {
  if (r.organ === 'assemblea') return votants(r.data).map((s) => s.id);
  if (r.organ === 'junta') return [...new Set(carrecsVigents(r.data).map((c) => c.soci_id))];
  return null;
}

export function quorum(reunioId: number): Quorum {
  const r = get<Reunio>('SELECT * FROM reunions WHERE id = ?', reunioId) ?? notFound();
  const assistents = all<{ soci_id: number; forma: string }>('SELECT soci_id, forma FROM reunio_assistents WHERE reunio_id = ?', reunioId);
  const ids = cens(r);
  const dinsCens = (a: { soci_id: number }) => !ids || ids.includes(a.soci_id);
  const presents = assistents.filter((a) => a.forma === 'present' && dinsCens(a)).length;
  const representats = assistents.filter((a) => a.forma === 'representat' && dinsCens(a)).length;
  const total = presents + representats;
  // Assemblea: el percentatge configurat. Junta: majoria dels seus membres.
  const pct = r.organ === 'assemblea' ? configGov().gov_quorum_1a : 50;
  let necessaris: number | null = null;
  if (ids) necessaris = r.organ === 'assemblea' ? Math.max(1, Math.ceil((ids.length * pct) / 100)) : Math.floor(ids.length / 2) + 1;
  return {
    cens: ids ? ids.length : null,
    presents,
    representats,
    total,
    percentatge: ids && ids.length ? Math.round((total * 1000) / ids.length) / 10 : null,
    quorum_1a_pct: pct,
    necessaris_1a: necessaris,
    arriba_1a: necessaris !== null ? total >= necessaris : total > 0,
    arriba_2a: total > 0,
  };
}

/** Avís si la convocatòria d'una assemblea no arriba (o no arribarà) als dies d'antelació mínims. */
export function antelacio(r: Reunio): { dies: number; minim: number; convocada: boolean } | null {
  if (r.organ !== 'assemblea' || r.estat === 'anullada') return null;
  const minim = configGov().gov_dies_convocatoria;
  let des = r.data_convocatoria;
  if (!des) {
    if (r.estat !== 'prevista' || r.data < avui()) return null;
    des = avui();
  }
  const dies = diesEntre(des, r.data);
  return dies < minim ? { dies, minim, convocada: Boolean(r.data_convocatoria) } : null;
}

// ---------- Reunions ----------

const ordreDia = (r: { ordre_dia: string }): string[] => {
  try {
    const v = JSON.parse(r.ordre_dia);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

function llegeixReunio(b: Record<string, unknown>) {
  const organ = opcio(b.organ, ORGANS, 'Òrgan');
  const punts = (Array.isArray(b.ordre_dia) ? b.ordre_dia : String(b.ordre_dia ?? '').split('\n'))
    .map((p) => String(p).trim())
    .filter(Boolean);
  const estat = opcio(b.estat, ESTATS_REUNIO, 'Estat', 'prevista');
  let dataConv = data(b.data_convocatoria, 'Data de convocatòria');
  const dataReunio = dataObligatoria(b.data, 'Data');
  if (estat === 'convocada' && !dataConv) dataConv = avui();
  if (dataConv && dataConv > dataReunio) throw new HttpError(400, 'La convocatòria no pot ser posterior a la reunió.');
  const conv = text(b.convocatoria_celebrada);
  if (conv && conv !== '1a' && conv !== '2a') throw new HttpError(400, 'El camp «Convocatòria» no és vàlid.');
  return {
    organ,
    tipus: opcio(b.tipus, TIPUS_REUNIO, 'Tipus', 'ordinaria'),
    titol: text(b.titol),
    data: dataReunio,
    hora_1a: hora(b.hora_1a, 'Hora (1a convocatòria)'),
    hora_2a: hora(b.hora_2a, 'Hora (2a convocatòria)'),
    lloc: text(b.lloc),
    ordre_dia: JSON.stringify(punts),
    estat,
    data_convocatoria: dataConv,
    convocatoria_celebrada: estat === 'celebrada' ? conv : null,
    notes: text(b.notes),
  };
}

const actaDe = (reunioId: number) => get<Acta>('SELECT * FROM actes WHERE reunio_id = ?', reunioId);

function comprovaOberta(reunioId: number) {
  if (actaDe(reunioId)?.tancada) throw new HttpError(409, "La reunió té l'acta aprovada: no es pot modificar.");
}

const reunioDe = (id: number) => get<Reunio>('SELECT * FROM reunions WHERE id = ?', id) ?? notFound();

function assistentsDe(reunioId: number) {
  return all<{ soci_id: number; nom: string; forma: string; representant_id: number | null; representant: string | null; num_soci: number | null }>(
    `SELECT a.soci_id, a.nom, a.forma, a.representant_id, r.nom AS representant, s.num_soci
       FROM reunio_assistents a LEFT JOIN socis s ON s.id = a.soci_id LEFT JOIN reunio_assistents r ON r.reunio_id = a.reunio_id AND r.soci_id = a.representant_id
      WHERE a.reunio_id = ? ORDER BY a.forma, a.nom`,
    reunioId,
  );
}

const acordsDe = (reunioId: number) =>
  all('SELECT * FROM acords WHERE reunio_id = ? ORDER BY COALESCE(punt, 999), id', reunioId);

function detallReunio(id: number) {
  const r = reunioDe(id);
  return {
    ...r,
    ordre_dia: ordreDia(r),
    assistents: assistentsDe(id),
    acords: acordsDe(id),
    acta: actaDe(id) ?? null,
    quorum: quorum(id),
    antelacio: antelacio(r),
    convocats: all('SELECT * FROM reunio_convocats WHERE reunio_id = ? ORDER BY enviat_el DESC, nom', id),
  };
}

governancaRouter.get('/reunions', (req, res) => {
  const any = enter(req.query.any, 'Any');
  const organ = text(req.query.organ);
  const cond: string[] = [];
  const params: unknown[] = [];
  if (any) {
    cond.push("strftime('%Y', r.data) = ?");
    params.push(String(any));
  }
  if (organ) {
    cond.push('r.organ = ?');
    params.push(opcio(organ, ORGANS, 'Òrgan'));
  }
  const files = all<Reunio & Record<string, unknown>>(
    `SELECT r.*, a.id AS acta_id, a.numero AS acta_numero, a.tancada AS acta_tancada,
            (SELECT COUNT(*) FROM reunio_assistents x WHERE x.reunio_id = r.id) AS n_assistents,
            (SELECT COUNT(*) FROM acords x WHERE x.reunio_id = r.id) AS n_acords,
            (SELECT COUNT(*) FROM reunio_convocats x WHERE x.reunio_id = r.id) AS n_convocats
       FROM reunions r LEFT JOIN actes a ON a.reunio_id = r.id
      ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
      ORDER BY r.data DESC, r.hora_1a DESC`,
    ...params,
  );
  res.json(files.map((r) => ({ ...r, ordre_dia: ordreDia(r), antelacio: antelacio(r) })));
});

governancaRouter.get('/reunions/:id', (req, res) => {
  res.json(detallReunio(idParam(req)));
});

governancaRouter.post('/reunions', (req, res) => {
  const r = llegeixReunio(req.body);
  const { id } = run(
    `INSERT INTO reunions (organ, tipus, titol, data, hora_1a, hora_2a, lloc, ordre_dia, estat, data_convocatoria, convocatoria_celebrada, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.organ, r.tipus, r.titol, r.data, r.hora_1a, r.hora_2a, r.lloc, r.ordre_dia, r.estat, r.data_convocatoria, r.convocatoria_celebrada, r.notes,
  );
  res.status(201).json(detallReunio(id));
});

governancaRouter.put('/reunions/:id', (req, res) => {
  const id = idParam(req);
  const abans = reunioDe(id);
  comprovaOberta(id);
  const r = llegeixReunio(req.body);
  const acta = actaDe(id);
  if (acta && (r.organ !== abans.organ || r.data.slice(0, 4) !== abans.data.slice(0, 4)))
    throw new HttpError(409, "La reunió ja té acta numerada: no se'n pot canviar l'òrgan ni l'any.");
  if (acta && r.estat !== 'celebrada') throw new HttpError(409, 'La reunió ja té acta: ha de constar com a celebrada.');
  run(
    `UPDATE reunions SET organ = ?, tipus = ?, titol = ?, data = ?, hora_1a = ?, hora_2a = ?, lloc = ?, ordre_dia = ?, estat = ?,
            data_convocatoria = ?, convocatoria_celebrada = ?, notes = ? WHERE id = ?`,
    r.organ, r.tipus, r.titol, r.data, r.hora_1a, r.hora_2a, r.lloc, r.ordre_dia, r.estat, r.data_convocatoria, r.convocatoria_celebrada, r.notes, id,
  );
  res.json(detallReunio(id));
});

governancaRouter.delete('/reunions/:id', (req, res) => {
  const id = idParam(req);
  reunioDe(id);
  const acta = actaDe(id);
  if (acta?.tancada) throw new HttpError(409, "La reunió té l'acta aprovada: no es pot esborrar.");
  if (acta) throw new HttpError(409, 'La reunió té una acta: esborra-la primer.');
  if (get('SELECT 1 FROM certificats c JOIN acords a ON a.id = c.acord_id WHERE a.reunio_id = ?', id))
    throw new HttpError(409, "S'han emès certificats d'acords d'aquesta reunió: no es pot esborrar.");
  run('DELETE FROM reunions WHERE id = ?', id);
  res.status(204).end();
});

// ---------- Assistència ----------

governancaRouter.put('/reunions/:id/assistents', (req, res) => {
  const id = idParam(req);
  const r = reunioDe(id);
  comprovaOberta(id);
  if (r.estat === 'anullada') throw new HttpError(400, "La reunió està anul·lada.");
  const llista = Array.isArray(req.body.assistents) ? (req.body.assistents as Record<string, unknown>[]) : [];
  const vists = new Set<number>();
  const files = llista.map((a) => {
    const sociId = enter(a.soci_id, 'Soci');
    if (!sociId) throw new HttpError(400, 'El camp «Soci» és obligatori.');
    if (vists.has(sociId)) throw new HttpError(400, 'Un soci surt repetit a la llista d\'assistents.');
    vists.add(sociId);
    const s = get<SociBasic>('SELECT nom, llinatges FROM socis WHERE id = ?', sociId);
    if (!s) throw new HttpError(400, 'Soci no trobat.');
    const forma = opcio(a.forma, ['present', 'representat'] as const, 'Forma', 'present');
    const representant = forma === 'representat' ? enter(a.representant_id, 'Representant') : null;
    return { sociId, nom: nomDe(s), forma, representant };
  });
  for (const f of files) {
    if (f.forma !== 'representat') continue;
    if (!f.representant) throw new HttpError(400, `Cal indicar qui representa ${f.nom}.`);
    if (f.representant === f.sociId) throw new HttpError(400, 'Un soci no es pot representar a si mateix.');
    if (!files.some((x) => x.sociId === f.representant && x.forma === 'present'))
      throw new HttpError(400, `El representant de ${f.nom} ha de ser a la llista com a present.`);
  }
  tx(() => {
    run('DELETE FROM reunio_assistents WHERE reunio_id = ?', id);
    for (const f of files)
      run(
        'INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma, representant_id) VALUES (?, ?, ?, ?, ?)',
        id, f.sociId, f.nom, f.forma, f.representant,
      );
  });
  registra(req, 'modifica', 'reunio', id, `Assistència: ${files.length} persones`);
  res.json(detallReunio(id));
});

// ---------- Acords ----------

function llegeixAcord(b: Record<string, unknown>) {
  return {
    punt: noNegatiu(b.punt, 'Punt'),
    text: textObligatori(b.text, 'Text'),
    vots_favor: noNegatiu(b.vots_favor, 'Vots a favor'),
    vots_contra: noNegatiu(b.vots_contra, 'Vots en contra'),
    abstencions: noNegatiu(b.abstencions, 'Abstencions'),
    resultat: opcio(b.resultat, RESULTATS, 'Resultat', 'aprovat'),
  };
}

governancaRouter.get('/acords', (_req, res) => {
  res.json(
    all(
      `SELECT ac.*, r.organ, r.tipus, r.data AS data_reunio, a.numero AS acta_numero, a.any AS acta_any, a.tancada AS acta_tancada
         FROM acords ac JOIN reunions r ON r.id = ac.reunio_id LEFT JOIN actes a ON a.reunio_id = r.id
        ORDER BY r.data DESC, COALESCE(ac.punt, 999), ac.id`,
    ),
  );
});

governancaRouter.post('/reunions/:id/acords', (req, res) => {
  const id = idParam(req);
  reunioDe(id);
  comprovaOberta(id);
  const a = llegeixAcord(req.body);
  run(
    'INSERT INTO acords (reunio_id, punt, text, vots_favor, vots_contra, abstencions, resultat) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, a.punt, a.text, a.vots_favor, a.vots_contra, a.abstencions, a.resultat,
  );
  res.status(201).json(detallReunio(id));
});

governancaRouter.put('/acords/:id', (req, res) => {
  const id = idParam(req);
  const ac = get<{ reunio_id: number }>('SELECT reunio_id FROM acords WHERE id = ?', id) ?? notFound();
  comprovaOberta(ac.reunio_id);
  const a = llegeixAcord(req.body);
  run(
    'UPDATE acords SET punt = ?, text = ?, vots_favor = ?, vots_contra = ?, abstencions = ?, resultat = ? WHERE id = ?',
    a.punt, a.text, a.vots_favor, a.vots_contra, a.abstencions, a.resultat, id,
  );
  res.json(detallReunio(ac.reunio_id));
});

governancaRouter.delete('/acords/:id', (req, res) => {
  const id = idParam(req);
  const ac = get<{ reunio_id: number }>('SELECT reunio_id FROM acords WHERE id = ?', id) ?? notFound();
  comprovaOberta(ac.reunio_id);
  if (get('SELECT 1 FROM certificats WHERE acord_id = ?', id)) throw new HttpError(409, "S'ha emès un certificat d'aquest acord: no es pot esborrar.");
  run('DELETE FROM acords WHERE id = ?', id);
  res.json(detallReunio(ac.reunio_id));
});

// ---------- Actes ----------

/** Acta amb totes les dades per imprimir-la: reunió, assistents, quòrum, acords i signants. */
export function actaCompleta(actaId: number) {
  const acta = get<Acta>('SELECT * FROM actes WHERE id = ?', actaId) ?? notFound();
  const r = reunioDe(acta.reunio_id);
  return {
    acta,
    reunio: { ...r, ordre_dia: ordreDia(r) },
    assistents: assistentsDe(r.id),
    acords: acordsDe(r.id),
    quorum: quorum(r.id),
  };
}

governancaRouter.get('/actes', (req, res) => {
  const any = enter(req.query.any, 'Any');
  const organ = text(req.query.organ);
  res.json(
    all(
      `SELECT a.id, a.reunio_id, a.organ, a.any, a.numero, a.data_aprovacio, a.tancada, a.tancada_el, a.tancada_per,
              r.tipus, r.data AS data_reunio, r.titol
         FROM actes a JOIN reunions r ON r.id = a.reunio_id
        WHERE (? IS NULL OR a.any = ?) AND (? IS NULL OR a.organ = ?)
        ORDER BY a.any DESC, a.organ, a.numero`,
      any, any, organ, organ,
    ),
  );
});

/** Llibre d'actes d'un òrgan i any (per defecte, només les actes aprovades). */
governancaRouter.get('/llibre', (req, res) => {
  const organ = opcio(req.query.organ, ORGANS, 'Òrgan');
  const any = enter(req.query.any, 'Any') ?? Number(avui().slice(0, 4));
  const totes = req.query.totes === '1';
  const ids = all<{ id: number }>(
    `SELECT id FROM actes WHERE organ = ? AND any = ? ${totes ? '' : 'AND tancada = 1'} ORDER BY numero`,
    organ, any,
  );
  res.json(ids.map((a) => actaCompleta(a.id)));
});

governancaRouter.get('/actes/:id', (req, res) => {
  res.json(actaCompleta(idParam(req)));
});

governancaRouter.post('/reunions/:id/acta', (req, res) => {
  const id = idParam(req);
  const r = reunioDe(id);
  if (r.estat !== 'celebrada') throw new HttpError(400, "Només es pot redactar l'acta d'una reunió celebrada.");
  if (actaDe(id)) throw new HttpError(409, 'Aquesta reunió ja té acta.');
  const any = Number(r.data.slice(0, 4));
  const actaId = tx(() => {
    const numero = get<{ n: number }>('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM actes WHERE organ = ? AND any = ?', r.organ, any)!.n;
    // Per defecte signen qui ocupaven la presidència i la secretaria abans de la reunió (si s'hi elegeix una junta nova, presideix la sortint).
    const junta = juntaActual(sumaDies(-1, new Date(`${r.data}T12:00:00`)));
    return run(
      'INSERT INTO actes (reunio_id, organ, any, numero, text, presidencia, secretaria) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, r.organ, any, numero, text(req.body.text) ?? '', junta.presidencia?.nom ?? null, junta.secretaria?.nom ?? null,
    ).id;
  });
  res.status(201).json(actaCompleta(actaId));
});

const actaPerId = (id: number) => get<Acta>('SELECT * FROM actes WHERE id = ?', id) ?? notFound();

governancaRouter.put('/actes/:id', (req, res) => {
  const id = idParam(req);
  const acta = actaPerId(id);
  if (acta.tancada) throw new HttpError(409, 'Una acta aprovada no es pot modificar.');
  run(
    'UPDATE actes SET text = ?, data_aprovacio = ?, presidencia = ?, secretaria = ? WHERE id = ?',
    String(req.body.text ?? ''), data(req.body.data_aprovacio, "Data d'aprovació"), text(req.body.presidencia), text(req.body.secretaria), id,
  );
  res.json(actaCompleta(id));
});

/** Aprova i tanca l'acta: a partir d'aquí ni l'acta, ni els acords, ni l'assistència es poden canviar. */
governancaRouter.post('/actes/:id/tanca', (req, res) => {
  const id = idParam(req);
  const acta = actaPerId(id);
  if (acta.tancada) throw new HttpError(409, 'Aquesta acta ja està aprovada.');
  const r = reunioDe(acta.reunio_id);
  const dataAprov = dataObligatoria(req.body.data_aprovacio ?? acta.data_aprovacio, "Data d'aprovació");
  if (dataAprov < r.data) throw new HttpError(400, "La data d'aprovació no pot ser anterior a la reunió.");
  if (dataAprov > avui()) throw new HttpError(400, "La data d'aprovació no pot ser futura.");
  const textActa = req.body.text !== undefined ? String(req.body.text) : acta.text;
  if (!textActa.trim()) throw new HttpError(400, "L'acta no té text.");
  run(
    "UPDATE actes SET text = ?, data_aprovacio = ?, tancada = 1, tancada_el = datetime('now','localtime'), tancada_per = ? WHERE id = ?",
    textActa, dataAprov, autor(req), id,
  );
  registra(req, 'modifica', 'acta', id, `Acta ${acta.numero}/${acta.any} (${acta.organ}) aprovada el ${dataAprov}`);
  res.json(actaCompleta(id));
});

governancaRouter.delete('/actes/:id', (req, res) => {
  const id = idParam(req);
  const acta = actaPerId(id);
  if (acta.tancada) throw new HttpError(409, 'Una acta aprovada no es pot esborrar.');
  const darrera = get<{ n: number }>('SELECT MAX(numero) AS n FROM actes WHERE organ = ? AND any = ?', acta.organ, acta.any)!.n;
  if (acta.numero !== darrera)
    throw new HttpError(409, "Només es pot esborrar l'última acta de l'any (la numeració ha de ser correlativa).");
  run('DELETE FROM actes WHERE id = ?', id);
  res.status(204).end();
});

// ---------- Junta directiva (càrrecs) ----------

const UNIPERSONALS: Carrec[] = ['presidencia', 'vicepresidencia', 'secretaria', 'tresoreria'];

function llegeixCarrec(b: Record<string, unknown>) {
  const sociId = enter(b.soci_id, 'Soci');
  if (!sociId) throw new HttpError(400, 'El camp «Soci» és obligatori.');
  if (!get('SELECT 1 FROM socis WHERE id = ?', sociId)) throw new HttpError(400, 'Soci no trobat.');
  const eleccio = dataObligatoria(b.data_eleccio, "Data d'elecció");
  const fi = data(b.data_fi_mandat, 'Fi del mandat');
  const cessament = data(b.data_cessament, 'Data de cessament');
  if (fi && fi < eleccio) throw new HttpError(400, "El mandat no pot acabar abans de l'elecció.");
  if (cessament && cessament < eleccio) throw new HttpError(400, "El cessament no pot ser anterior a l'elecció.");
  const reunioId = enter(b.reunio_id, 'Reunió');
  if (reunioId && !get('SELECT 1 FROM reunions WHERE id = ?', reunioId)) throw new HttpError(400, 'Reunió no trobada.');
  return {
    soci_id: sociId,
    carrec: opcio(b.carrec, CARRECS, 'Càrrec'),
    data_eleccio: eleccio,
    data_fi_mandat: fi,
    reunio_id: reunioId,
    data_cessament: cessament,
    motiu_cessament: cessament ? text(b.motiu_cessament) : null,
    comunicat_registre_el: data(b.comunicat_registre_el, 'Comunicat al Registre'),
    cessament_comunicat_el: cessament ? data(b.cessament_comunicat_el, 'Cessament comunicat') : null,
    notes: text(b.notes),
  };
}

/** Un càrrec unipersonal no pot tenir dues persones alhora (períodes que se solapen). */
function comprovaSolapament(c: ReturnType<typeof llegeixCarrec>, excepte: number | null) {
  if (!UNIPERSONALS.includes(c.carrec)) return;
  const fi = c.data_cessament ?? '9999-12-31';
  const altre = get<{ nom: string; llinatges: string }>(
    `SELECT s.nom, s.llinatges FROM carrecs x JOIN socis s ON s.id = x.soci_id
      WHERE x.carrec = ? AND x.id <> ? AND x.data_eleccio < ? AND COALESCE(x.data_cessament, '9999-12-31') > ?`,
    c.carrec, excepte ?? 0, fi, c.data_eleccio,
  );
  if (altre)
    throw new HttpError(409, `${nomDe(altre)} ja ocupa aquest càrrec en aquestes dates: registra'n primer el cessament.`);
}

governancaRouter.get('/carrecs', (_req, res) => {
  const d = avui();
  res.json(
    all(
      `SELECT c.*, s.nom, s.llinatges, s.num_soci, s.email, s.telefon,
              r.data AS data_reunio, r.organ AS organ_reunio,
              (CASE WHEN c.data_eleccio <= ? AND (c.data_cessament IS NULL OR c.data_cessament > ?) THEN 1 ELSE 0 END) AS vigent
         FROM carrecs c JOIN socis s ON s.id = c.soci_id LEFT JOIN reunions r ON r.id = c.reunio_id
        ORDER BY vigent DESC,
                 CASE c.carrec WHEN 'presidencia' THEN 1 WHEN 'vicepresidencia' THEN 2 WHEN 'secretaria' THEN 3
                               WHEN 'tresoreria' THEN 4 ELSE 5 END,
                 c.data_eleccio DESC`,
      d, d,
    ),
  );
});

governancaRouter.post('/carrecs', (req, res) => {
  const c = llegeixCarrec(req.body);
  comprovaSolapament(c, null);
  const { id } = run(
    `INSERT INTO carrecs (soci_id, carrec, data_eleccio, data_fi_mandat, reunio_id, data_cessament, motiu_cessament,
                          comunicat_registre_el, cessament_comunicat_el, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.soci_id, c.carrec, c.data_eleccio, c.data_fi_mandat, c.reunio_id, c.data_cessament, c.motiu_cessament,
    c.comunicat_registre_el, c.cessament_comunicat_el, c.notes,
  );
  registra(req, 'crea', 'carrec', id, `${c.carrec} (soci ${c.soci_id}) des del ${c.data_eleccio}`);
  res.status(201).json(get('SELECT * FROM carrecs WHERE id = ?', id));
});

governancaRouter.put('/carrecs/:id', (req, res) => {
  const id = idParam(req);
  get('SELECT 1 FROM carrecs WHERE id = ?', id) ?? notFound();
  const c = llegeixCarrec(req.body);
  comprovaSolapament(c, id);
  run(
    `UPDATE carrecs SET soci_id = ?, carrec = ?, data_eleccio = ?, data_fi_mandat = ?, reunio_id = ?, data_cessament = ?,
            motiu_cessament = ?, comunicat_registre_el = ?, cessament_comunicat_el = ?, notes = ? WHERE id = ?`,
    c.soci_id, c.carrec, c.data_eleccio, c.data_fi_mandat, c.reunio_id, c.data_cessament, c.motiu_cessament,
    c.comunicat_registre_el, c.cessament_comunicat_el, c.notes, id,
  );
  registra(req, 'modifica', 'carrec', id, `${c.carrec} (soci ${c.soci_id})${c.data_cessament ? `, cessament ${c.data_cessament}` : ''}`);
  res.json(get('SELECT * FROM carrecs WHERE id = ?', id));
});

governancaRouter.delete('/carrecs/:id', (req, res) => {
  const id = idParam(req);
  const c = get<{ carrec: string; soci_id: number }>('SELECT carrec, soci_id FROM carrecs WHERE id = ?', id) ?? notFound();
  run('DELETE FROM carrecs WHERE id = ?', id);
  registra(req, 'elimina', 'carrec', id, `${c.carrec} (soci ${c.soci_id})`);
  res.status(204).end();
});

// ---------- Convocatòria oficial ----------

/**
 * Destinataris de la convocatòria: tots els socis amb dret a vot (assemblea) o la junta (junta).
 * No es té en compte «accepta_comunicacions»: una convocatòria estatutària no és publicitat.
 */
export function destinatarisConvocatoria(reunioId: number) {
  const r = reunioDe(reunioId);
  let llista: SociBasic[];
  if (r.organ === 'assemblea') llista = votants(r.data);
  else if (r.organ === 'junta') {
    const vistos = new Set<number>();
    llista = carrecsVigents(r.data).filter((c) => !vistos.has(c.soci_id) && vistos.add(c.soci_id));
  } else throw new HttpError(400, "Les convocatòries oficials només són per a l'assemblea i la junta.");
  const ambEmail = llista.filter((s) => s.email && /\S+@\S+/.test(s.email));
  const senseEmail = llista.filter((s) => !(s.email && /\S+@\S+/.test(s.email)));
  return { reunio: r, amb_email: ambEmail, sense_email: senseEmail };
}

governancaRouter.get('/reunions/:id/destinataris', (req, res) => {
  const { amb_email, sense_email } = destinatarisConvocatoria(idParam(req));
  res.json({ amb_email, sense_email, correu_configurat: correuConfigurat() });
});

const idiomaEntitat = (): Idioma => {
  const i = getConfig('idioma');
  return esIdioma(i) ? i : 'ca';
};

export function titolReunio(r: Pick<Reunio, 'organ' | 'tipus' | 'titol'>, idioma: Idioma = 'ca'): string {
  const extra = r.tipus === 'extraordinaria';
  if (r.organ === 'assemblea') return tr(idioma, extra ? 'Assemblea general extraordinària' : 'Assemblea general ordinària');
  if (r.organ === 'junta') return tr(idioma, extra ? 'Reunió extraordinària de la junta directiva' : 'Reunió ordinària de la junta directiva');
  return r.titol ? tr(idioma, 'Comissió: {0}', r.titol) : tr(idioma, 'Reunió de comissió');
}

/** Text de la convocatòria (correu). Les cartes impreses fan servir el mateix contingut a la interfície. */
export function textConvocatoria(r: Reunio, nom: string, idioma: Idioma = idiomaEntitat()) {
  const entitat = getConfig('nom_complet') || getConfig('nom') || '';
  const secretaria = juntaActual().secretaria;
  const punts = ordreDia(r);
  const linies = [
    tr(idioma, 'Benvolgut/da {0},', nom),
    '',
    tr(idioma, 'Et convocam a la {0} de {1}, que se celebrarà el dia {2} a {3}.', titolReunio(r, idioma).toLowerCase(), entitat, dma(r.data), r.lloc ?? '—'),
  ];
  if (r.hora_1a) linies.push(tr(idioma, 'Primera convocatòria: {0} h.', r.hora_1a));
  if (r.hora_2a) linies.push(tr(idioma, 'Segona convocatòria: {0} h.', r.hora_2a));
  linies.push('', tr(idioma, 'Ordre del dia:'), ...punts.map((p, i) => `${i + 1}. ${p}`));
  if (r.organ === 'assemblea')
    linies.push('', tr(idioma, 'Si no hi pots assistir, pots delegar la teva representació en un altre soci o sòcia mitjançant un escrit signat.'));
  linies.push('', tr(idioma, 'Atentament,'), secretaria ? tr(idioma, '{0}, secretari/ària', secretaria.nom) : tr(idioma, 'La secretaria'), entitat);
  return { assumpte: tr(idioma, 'Convocatòria: {0} ({1})', titolReunio(r, idioma), dma(r.data)), text: linies.join('\n') };
}

function comprovaConvocable(r: Reunio) {
  if (r.estat === 'celebrada' || r.estat === 'anullada') throw new HttpError(400, 'Aquesta reunió ja no es pot convocar.');
  if (r.data < avui()) throw new HttpError(400, 'La data de la reunió ja ha passat.');
}

function marcaConvocada(id: number) {
  run("UPDATE reunions SET estat = 'convocada', data_convocatoria = COALESCE(data_convocatoria, ?) WHERE id = ? AND estat = 'prevista'", avui(), id);
}

governancaRouter.post('/reunions/:id/convoca', async (req, res) => {
  const id = idParam(req);
  const { reunio: r, amb_email, sense_email } = destinatarisConvocatoria(id);
  comprovaConvocable(r);
  if (!correuConfigurat())
    throw new HttpError(400, "El correu no està configurat (Configuració → Correu). Pots imprimir les cartes de convocatòria i enviar-les per correu postal.");
  if (!amb_email.length) throw new HttpError(400, 'Cap destinatari no té adreça de correu: imprimeix les cartes.');
  const missatges = amb_email.map((s) => ({ a: s.email!, ...textConvocatoria(r, nomDe(s)) }));
  const resultats = await enviaCorreus(missatges);
  const qui = autor(req);
  tx(() => {
    resultats.forEach((x, i) => {
      const s = amb_email[i];
      run(
        "INSERT INTO reunio_convocats (reunio_id, soci_id, nom, canal, adreca, error, autor) VALUES (?, ?, ?, 'email', ?, ?, ?)",
        id, s.id, nomDe(s), s.email, x.ok ? null : x.error ?? 'Error', qui,
      );
    });
    if (resultats.some((x) => x.ok)) marcaConvocada(id);
  });
  const enviats = resultats.filter((x) => x.ok).length;
  registra(req, 'envia', 'convocatoria', id, `${titolReunio(r)} del ${r.data}: ${enviats} correus, ${resultats.length - enviats} errors`);
  res.json({
    enviats,
    errors: resultats.length - enviats,
    sense_email: sense_email.length,
    antelacio: antelacio(reunioDe(id)),
  });
});

/** Registra les cartes impreses (convocatòria per correu postal) dels socis indicats o de tots els que no tenen correu. */
governancaRouter.post('/reunions/:id/cartes', (req, res) => {
  const id = idParam(req);
  const { reunio: r, amb_email, sense_email } = destinatarisConvocatoria(id);
  comprovaConvocable(r);
  const ids = Array.isArray(req.body.soci_ids) ? (req.body.soci_ids as unknown[]).map(Number) : null;
  const llista = ids ? [...amb_email, ...sense_email].filter((s) => ids.includes(s.id)) : sense_email;
  if (!llista.length) throw new HttpError(400, 'No hi ha cap carta per registrar.');
  const qui = autor(req);
  tx(() => {
    for (const s of llista)
      run(
        "INSERT INTO reunio_convocats (reunio_id, soci_id, nom, canal, adreca, autor) VALUES (?, ?, ?, 'carta', ?, ?)",
        id, s.id, nomDe(s), [s.adreca, [s.codi_postal, s.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', '), qui,
      );
    marcaConvocada(id);
  });
  registra(req, 'envia', 'convocatoria', id, `${titolReunio(r)} del ${r.data}: ${llista.length} cartes`);
  res.json({ cartes: llista.length, antelacio: antelacio(reunioDe(id)) });
});

// ---------- Certificats ----------

function contingutCertificat(req: Request, tipus: (typeof TIPUS_CERTIFICAT)[number]) {
  if (tipus === 'soci') {
    const sociId = enter(req.body.soci_id, 'Soci');
    if (!sociId) throw new HttpError(400, 'El camp «Soci» és obligatori.');
    const s =
      get<Record<string, unknown> & { data_baixa: string | null; anonimitzat_el: string | null }>(
        `SELECT s.id, s.num_soci, s.nom, s.llinatges, s.dni, s.data_alta, s.data_baixa, s.anonimitzat_el, c.nom AS categoria
           FROM socis s LEFT JOIN categories_soci c ON c.id = s.categoria_id WHERE s.id = ?`,
        sociId,
      ) ?? notFound();
    if (s.anonimitzat_el) throw new HttpError(400, "Les dades d'aquest soci s'han anonimitzat.");
    const actiu = !s.data_baixa || s.data_baixa > avui();
    return { soci_id: sociId, acord_id: null, contingut: { soci: { ...s, actiu } } };
  }
  if (tipus === 'acord') {
    const acordId = enter(req.body.acord_id, 'Acord');
    if (!acordId) throw new HttpError(400, 'El camp «Acord» és obligatori.');
    const ac = get<Record<string, unknown> & { reunio_id: number }>('SELECT * FROM acords WHERE id = ?', acordId) ?? notFound();
    const r = reunioDe(ac.reunio_id);
    const acta = actaDe(r.id);
    return {
      soci_id: null,
      acord_id: acordId,
      contingut: {
        reunio: { organ: r.organ, tipus: r.tipus, titol: r.titol, data: r.data, lloc: r.lloc, convocatoria_celebrada: r.convocatoria_celebrada },
        acta: acta ? { numero: acta.numero, any: acta.any, tancada: acta.tancada, data_aprovacio: acta.data_aprovacio } : null,
        acord: ac,
        quorum: quorum(r.id),
      },
    };
  }
  return {
    soci_id: null,
    acord_id: null,
    contingut: {
      junta: carrecsVigents().map((c) => ({
        carrec: c.carrec,
        nom: nomDe(c),
        dni: c.dni,
        data_eleccio: c.data_eleccio,
        data_fi_mandat: c.data_fi_mandat,
      })),
    },
  };
}

const certificat = (id: number) => {
  const c = get<Record<string, unknown> & { numero: number; contingut: string }>('SELECT * FROM certificats WHERE id = ?', id) ?? notFound();
  return { ...c, contingut: JSON.parse(c.contingut) };
};

governancaRouter.get('/certificats', (_req, res) => {
  res.json(
    all<Record<string, unknown> & { contingut: string }>(
      `SELECT c.*, s.nom AS soci_nom, s.llinatges AS soci_llinatges FROM certificats c LEFT JOIN socis s ON s.id = c.soci_id
        ORDER BY c.any DESC, c.numero DESC`,
    ).map((c) => ({ ...c, contingut: JSON.parse(c.contingut) })),
  );
});

governancaRouter.get('/certificats/:id', (req, res) => {
  res.json(certificat(idParam(req)));
});

governancaRouter.post('/certificats', (req, res) => {
  const tipus = opcio(req.body.tipus, TIPUS_CERTIFICAT, 'Tipus');
  const dataCert = data(req.body.data, 'Data') ?? avui();
  const junta = juntaActual(dataCert);
  const secretaria = junta.secretaria;
  if (!secretaria) throw new HttpError(400, 'Per emetre certificats cal tenir registrada la persona que ocupa la secretaria.');
  const { soci_id, acord_id, contingut } = contingutCertificat(req, tipus);
  const any = Number(dataCert.slice(0, 4));
  const id = tx(() => {
    const numero = get<{ n: number }>('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM certificats WHERE any = ?', any)!.n;
    return run(
      `INSERT INTO certificats (any, numero, tipus, data, soci_id, acord_id, finalitat, contingut, secretaria, presidencia, emes_per)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      any, numero, tipus, dataCert, soci_id, acord_id, text(req.body.finalitat), JSON.stringify(contingut),
      secretaria.nom, junta.presidencia?.nom ?? null, autor(req),
    ).id;
  });
  const c = certificat(id);
  registra(req, 'crea', 'certificat', id, `Certificat ${c.numero}/${any} (${tipus})${soci_id ? ` del soci ${soci_id}` : ''}`);
  res.status(201).json(c);
});
