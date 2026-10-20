import { Router } from 'express';
import type { Request } from 'express';
import { all, get, run, tx } from '../db.ts';
import { marcaCanvisWeb } from '../web/publica.ts';
import { HttpError, bool, data, dataObligatoria, enter, exerciciParam, idParam, notFound, text, textObligatori } from '../util.ts';

export const activitatsRouter = Router();

const codisFinalitats = () => all<{ codi: string }>('SELECT codi FROM finalitats').map((f) => f.codi);

export const ESTATS_ACTIVITAT = ['idea', 'preparacio', 'confirmada', 'feta', 'anul·lada'];
export const ESTATS_PARTICIPACIO = ['inscrit', 'espera', 'cancel·lat'];

// ---------- Edats i franges (les mateixes que la composició de la base social) ----------

export const FRANGES = ['Infants (0-13)', 'Joves (14-29)', 'Adults (30-64)', 'Gent gran (65+)'] as const;
export const SENSE_DATA = 'Sense data';

/** Edat complerta en una data de referència (YYYY-MM-DD). */
export function edatA(naixement: string | null | undefined, ref: string): number | null {
  if (!naixement || !/^\d{4}-\d{2}-\d{2}/.test(naixement)) return null;
  const e = Number(ref.slice(0, 4)) - Number(naixement.slice(0, 4)) - (ref.slice(5, 10) < naixement.slice(5, 10) ? 1 : 0);
  return e >= 0 ? e : null;
}

export function franjaEdat(edat: number | null): string {
  if (edat === null) return SENSE_DATA;
  if (edat < 14) return FRANGES[0];
  if (edat < 30) return FRANGES[1];
  if (edat < 65) return FRANGES[2];
  return FRANGES[3];
}

/** Menor d'edat: cal l'autorització del pare, la mare o el tutor legal. */
export const esMenor = (edat: number | null) => edat !== null && edat < 18;

// ---------- Activitats ----------

// La imatge no es llista (pot ocupar molt): només a la consulta d'una activitat concreta.
export const SELECT_ACTIVITATS = `
  SELECT a.id, a.nom, a.data_inici, a.data_fi, a.lloc, a.descripcio, a.objectius, a.participants, a.notes,
    a.web_publica, (a.imatge IS NOT NULL) AS te_imatge,
    a.estat, a.places, a.assistents_anonims, a.responsable_soci_id, a.pressupost_cents, a.materials, a.public_objectiu,
    (SELECT TRIM(nom || ' ' || llinatges) FROM socis WHERE id = a.responsable_soci_id) AS responsable_nom,
    (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'inscrit') AS inscrits,
    (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'espera') AS en_espera,
    (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat <> 'cancel·lat' AND assistit = 1) AS assistents,
    (SELECT COUNT(*) FROM tasques WHERE activitat_id = a.id AND feta = 0) AS tasques_pendents,
    COALESCE((SELECT SUM(import_cents) FROM moviments WHERE activitat_id = a.id AND tipus = 'ingres'), 0) AS ingressos_cents,
    COALESCE((SELECT SUM(import_cents) FROM moviments WHERE activitat_id = a.id AND tipus = 'despesa'), 0) AS despeses_cents
  FROM activitats a`;

function enterNoNegatiu(v: unknown, camp: string): number | null {
  const n = enter(v, camp);
  if (n !== null && n < 0) throw new HttpError(400, `${camp} no vàlid.`);
  return n;
}

function llegirActivitat(body: Request['body'], actual?: Record<string, unknown>) {
  // Els camps de planificació que no vinguin a la petició (p. ex. d'una altra pantalla) es conserven.
  const v = (k: string) => (k in body ? body[k] : actual?.[k]);
  const objectius: string[] = Array.isArray(body.objectius)
    ? body.objectius.map(String)
    : String(body.objectius ?? '').split(',').filter(Boolean);
  const codis = codisFinalitats();
  if (objectius.some((c) => !codis.includes(c))) throw new HttpError(400, 'Finalitat no vàlida.');
  const participants = enter(body.participants, 'Participants');
  if (participants !== null && participants < 0) throw new HttpError(400, 'Participants no vàlid.');
  const inici = dataObligatoria(body.data_inici, "Data d'inici");
  const fi = data(body.data_fi, 'Data de fi');
  if (fi && fi < inici) throw new HttpError(400, "La data de fi no pot ser anterior a la d'inici.");
  const places = enterNoNegatiu(v('places'), 'Places');
  if (places === 0) throw new HttpError(400, 'Places no vàlid.');
  const estat = String(v('estat') ?? 'confirmada');
  if (!ESTATS_ACTIVITAT.includes(estat)) throw new HttpError(400, "Estat de l'activitat no vàlid.");
  const responsable = enter(v('responsable_soci_id'), 'Responsable');
  if (responsable !== null && !get('SELECT 1 FROM socis WHERE id = ?', responsable)) throw new HttpError(400, 'Responsable no vàlid.');
  return {
    nom: textObligatori(body.nom, 'Nom'),
    data_inici: inici,
    data_fi: fi,
    lloc: text(body.lloc),
    descripcio: text(body.descripcio),
    objectius: [...new Set(objectius)].sort().join(','),
    participants,
    notes: text(body.notes),
    web_publica: bool(body.web_publica ?? 1),
    imatge: imatgeActivitat(body.imatge),
    estat,
    places,
    assistents_anonims: enterNoNegatiu(v('assistents_anonims'), 'Assistents anònims') ?? 0,
    responsable_soci_id: responsable,
    pressupost_cents: enterNoNegatiu(v('pressupost_cents'), 'Pressupost'),
    materials: text(v('materials')),
    public_objectiu: text(v('public_objectiu')),
  };
}

function imatgeActivitat(v: unknown): string | null {
  const i = text(v);
  if (i && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(i) || i.length > 2_000_000))
    throw new HttpError(400, "La imatge no és vàlida o és massa gran.");
  return i;
}

const CAMPS = [
  'nom', 'data_inici', 'data_fi', 'lloc', 'descripcio', 'objectius', 'participants', 'notes', 'web_publica', 'imatge',
  'estat', 'places', 'assistents_anonims', 'responsable_soci_id', 'pressupost_cents', 'materials', 'public_objectiu',
];

activitatsRouter.get('/', (req, res) => {
  if (req.query.exercici === 'totes') {
    res.json(all(`${SELECT_ACTIVITATS} ORDER BY a.data_inici DESC`));
    return;
  }
  const e = exerciciParam(req);
  res.json(
    all(`${SELECT_ACTIVITATS} WHERE a.data_inici BETWEEN ? AND ? ORDER BY a.data_inici DESC`, `${e}-01-01`, `${e}-12-31`),
  );
});

activitatsRouter.get('/:id', (req, res) => {
  const id = idParam(req);
  const a = get(`${SELECT_ACTIVITATS} WHERE a.id = ?`, id) ?? notFound();
  res.json({ ...a, imatge: get<{ imatge: string | null }>('SELECT imatge FROM activitats WHERE id = ?', id)?.imatge ?? null });
});

activitatsRouter.post('/', (req, res) => {
  const a = llegirActivitat(req.body);
  const { id } = run(`INSERT INTO activitats (${CAMPS.join(', ')}) VALUES (${CAMPS.map((c) => '$' + c).join(', ')})`, a);
  marcaCanvisWeb();
  res.status(201).json(get(`${SELECT_ACTIVITATS} WHERE a.id = ?`, id));
});

activitatsRouter.put('/:id', (req, res) => {
  const id = idParam(req);
  const actual = get<Record<string, unknown>>('SELECT * FROM activitats WHERE id = ?', id) ?? notFound();
  const a = llegirActivitat(req.body, actual);
  // Si la petició no porta imatge (la interfície encara no l'havia carregat), es conserva l'actual.
  if (!('imatge' in req.body)) a.imatge = (actual.imatge as string | null) ?? null;
  const promocionats = tx(() => {
    run(`UPDATE activitats SET ${CAMPS.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`, { ...a, id });
    // Si s'han ampliat les places, entren les persones de la llista d'espera.
    return promouEspera(id);
  });
  marcaCanvisWeb();
  res.json({ ...get(`${SELECT_ACTIVITATS} WHERE a.id = ?`, id), promocionats });
});

activitatsRouter.delete('/:id', (req, res) => {
  const { changes } = run('DELETE FROM activitats WHERE id = ?', idParam(req));
  if (!changes) notFound();
  marcaCanvisWeb();
  res.status(204).end();
});

/** Assistents sense inscripció (actes oberts al públic): es compten però no se'n guarden dades. */
activitatsRouter.put('/:id/assistents-anonims', (req, res) => {
  const id = idParam(req);
  const n = enterNoNegatiu(req.body.assistents_anonims, 'Assistents anònims') ?? 0;
  const { changes } = run('UPDATE activitats SET assistents_anonims = ? WHERE id = ?', n, id);
  if (!changes) notFound();
  res.json({ assistents_anonims: n });
});

/**
 * Persones inscrites (o que hi han assistit) sense consentiment d'ús de la imatge.
 * El web i les xarxes ho consulten abans de publicar fotos de l'activitat.
 */
activitatsRouter.get('/:id/sense-drets-imatge', (req, res) => {
  const id = idParam(req);
  const a = get<{ data_inici: string; assistents_anonims: number }>(
    'SELECT data_inici, assistents_anonims FROM activitats WHERE id = ?', id,
  ) ?? notFound();
  const persones = llistaParticipants(id).filter(
    (p) => p.estat !== 'cancel·lat' && (p.estat === 'inscrit' || p.assistit) && !p.drets_imatge,
  );
  res.json({
    total: persones.length,
    menors: persones.filter((p) => p.menor).length,
    noms: persones.map((p) => p.nom),
    assistents_anonims: a.assistents_anonims,
  });
});

// ---------- Inscripcions (participacions) ----------

export interface Participant {
  id: number;
  activitat_id: number;
  soci_id: number | null;
  interessat_id: number | null;
  tipus: 'soci' | 'interessat' | 'extern';
  nom: string;
  num_soci: number | null;
  nom_extern: string | null;
  data_naixement: string | null;
  genere: string | null;
  telefon: string | null;
  email: string | null;
  tutor: string | null;
  tutor_telefon: string | null;
  estat: string;
  inscrit_el: string;
  assistit: number;
  autoritzacio_tutor: string | null;
  drets_imatge: number;
  drets_imatge_consta: number;
  notes: string | null;
  edat: number | null;
  franja: string;
  menor: boolean;
}

// Les dades de contacte i de naixement dels socis i interessats es prenen de la seva fitxa.
const SELECT_PARTICIPANTS = `
  SELECT p.id, p.activitat_id, p.soci_id, p.interessat_id, p.nom_extern, p.estat, p.inscrit_el, p.assistit,
    p.autoritzacio_tutor, p.notes, p.tutor_telefon,
    CASE WHEN p.soci_id IS NOT NULL THEN 'soci' WHEN p.interessat_id IS NOT NULL THEN 'interessat' ELSE 'extern' END AS tipus,
    COALESCE(TRIM(s.nom || ' ' || s.llinatges), TRIM(i.nom || ' ' || i.llinatges), p.nom_extern) AS nom,
    s.num_soci,
    COALESCE(s.data_naixement, p.data_naixement) AS data_naixement,
    COALESCE(s.genere, p.genere) AS genere,
    COALESCE(p.telefon, s.telefon, i.telefon) AS telefon,
    COALESCE(p.email, s.email, i.email) AS email,
    COALESCE(p.tutor, s.tutor_legal) AS tutor,
    COALESCE(p.drets_imatge, 0) AS drets_imatge,
    (p.drets_imatge IS NOT NULL) AS drets_imatge_consta,
    a.data_inici AS data_activitat
  FROM participacions p
  JOIN activitats a ON a.id = p.activitat_id
  LEFT JOIN socis s ON s.id = p.soci_id
  LEFT JOIN interessats i ON i.id = p.interessat_id`;

const ORDRE_ESTAT = "CASE p.estat WHEN 'inscrit' THEN 0 WHEN 'espera' THEN 1 ELSE 2 END";

function completa(r: Participant & { data_activitat: string }): Participant {
  const { data_activitat, ...p } = r;
  const edat = edatA(p.data_naixement, data_activitat);
  return { ...p, edat, franja: franjaEdat(edat), menor: esMenor(edat) };
}

/** Inscripcions d'una activitat: primer les confirmades, després la llista d'espera (per ordre d'arribada). */
export function llistaParticipants(activitatId: number): Participant[] {
  return all<Participant & { data_activitat: string }>(
    `${SELECT_PARTICIPANTS} WHERE p.activitat_id = ?
      ORDER BY ${ORDRE_ESTAT}, CASE WHEN p.estat = 'espera' THEN p.inscrit_el END,
        CASE WHEN p.estat = 'espera' THEN p.id END, nom COLLATE NOCASE`,
    activitatId,
  ).map(completa);
}

export function participant(id: number): Participant | undefined {
  const r = get<Participant & { data_activitat: string }>(`${SELECT_PARTICIPANTS} WHERE p.id = ?`, id);
  return r && completa(r);
}

/** Estat que correspon a una inscripció nova: si l'activitat és plena, va a la llista d'espera. */
export function estatNovaInscripcio(activitatId: number): 'inscrit' | 'espera' {
  const a = get<{ places: number | null; inscrits: number }>(
    `SELECT places, (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'inscrit') AS inscrits
       FROM activitats a WHERE id = ?`,
    activitatId,
  ) ?? notFound();
  return a.places !== null && a.inscrits >= a.places ? 'espera' : 'inscrit';
}

export interface Promocionat {
  id: number;
  nom: string;
  telefon: string | null;
  email: string | null;
  tutor: string | null;
}

/**
 * Omple les places lliures amb la llista d'espera, per ordre d'inscripció.
 * Retorna qui ha entrat, perquè la interfície recordi d'avisar-los. Cal cridar-la dins d'una transacció.
 */
export function promouEspera(activitatId: number): Promocionat[] {
  const promocionats: Promocionat[] = [];
  for (;;) {
    if (estatNovaInscripcio(activitatId) === 'espera') break;
    const seguent = get<{ id: number }>(
      "SELECT id FROM participacions WHERE activitat_id = ? AND estat = 'espera' ORDER BY inscrit_el, id LIMIT 1",
      activitatId,
    );
    if (!seguent) break;
    run("UPDATE participacions SET estat = 'inscrit' WHERE id = ?", seguent.id);
    const p = participant(seguent.id)!;
    promocionats.push({ id: p.id, nom: p.nom, telefon: p.telefon, email: p.email, tutor: p.menor ? p.tutor : null });
  }
  return promocionats;
}
