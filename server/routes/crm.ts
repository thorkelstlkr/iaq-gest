import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, tx } from '../db.ts';
import {
  HttpError, bool, data, dataObligatoria, enter, idParam, notFound, text, textObligatori,
} from '../util.ts';
import { autor } from './auth.ts';
import { correuConfigurat, enviaCorreus } from '../correu.ts';
import { registra } from '../auditoria.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import { ESTATS_PARTICIPACIO, estatNovaInscripcio, llistaParticipants, participant, promouEspera } from './activitats.ts';

export const crmRouter = Router();

const ACTIU = "(s.data_baixa IS NULL OR s.data_baixa > date('now', 'localtime'))";

function paramEnter(v: unknown, camp: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${camp} no vàlid.`);
  return n;
}

// ---------- Etiquetes ----------

crmRouter.get('/etiquetes', (_req, res) => {
  res.json(
    all(
      `SELECT e.*, (SELECT COUNT(*) FROM socis_etiquetes se JOIN socis s ON s.id = se.soci_id
                     WHERE se.etiqueta_id = e.id AND ${ACTIU}) AS socis
         FROM etiquetes e ORDER BY e.nom`,
    ),
  );
});

const COLOR_RE = /^#[0-9a-f]{6}$/i;
function color(v: unknown) {
  const c = text(v) ?? '#56662c';
  if (!COLOR_RE.test(c)) throw new HttpError(400, 'Color no vàlid.');
  return c;
}

crmRouter.post('/etiquetes', (req, res) => {
  const { id } = run('INSERT INTO etiquetes (nom, color) VALUES (?, ?)', textObligatori(req.body.nom, 'Nom'), color(req.body.color));
  res.status(201).json(get('SELECT * FROM etiquetes WHERE id = ?', id));
});

crmRouter.put('/etiquetes/:id', (req, res) => {
  const id = idParam(req);
  const { changes } = run('UPDATE etiquetes SET nom = ?, color = ? WHERE id = ?', textObligatori(req.body.nom, 'Nom'), color(req.body.color), id);
  if (!changes) notFound();
  res.json(get('SELECT * FROM etiquetes WHERE id = ?', id));
});

crmRouter.delete('/etiquetes/:id', (req, res) => {
  const { changes } = run('DELETE FROM etiquetes WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

crmRouter.put('/socis/:id/etiquetes', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM socis WHERE id = ?', id)) notFound();
  const ids: number[] = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  tx(() => {
    run('DELETE FROM socis_etiquetes WHERE soci_id = ?', id);
    for (const e of new Set(ids)) run('INSERT INTO socis_etiquetes (soci_id, etiqueta_id) VALUES (?, ?)', id, e);
  });
  res.json({ ids });
});

// ---------- Historial de contactes ----------

const TIPUS_INTERACCIO = ['trucada', 'correu', 'reunio', 'missatge', 'nota'];

crmRouter.get('/interaccions', (req, res) => {
  const soci = enter(req.query.soci_id, 'Soci');
  res.json(
    soci
      ? all('SELECT * FROM interaccions WHERE soci_id = ? ORDER BY data DESC, id DESC', soci)
      : all(
          `SELECT i.*, TRIM(s.nom || ' ' || s.llinatges) AS soci_nom FROM interaccions i
             JOIN socis s ON s.id = i.soci_id ORDER BY i.data DESC, i.id DESC LIMIT 100`,
        ),
  );
});

crmRouter.post('/interaccions', (req, res) => {
  const tipus = String(req.body.tipus);
  if (!TIPUS_INTERACCIO.includes(tipus)) throw new HttpError(400, 'Tipus de contacte no vàlid.');
  const soci = paramEnter(req.body.soci_id, 'Soci');
  const { id } = run(
    'INSERT INTO interaccions (soci_id, data, tipus, resum, autor) VALUES (?, ?, ?, ?, ?)',
    soci, dataObligatoria(req.body.data, 'Data'), tipus, textObligatori(req.body.resum, 'Resum'), autor(req),
  );
  res.status(201).json(get('SELECT * FROM interaccions WHERE id = ?', id));
});

crmRouter.delete('/interaccions/:id', (req, res) => {
  const { changes } = run('DELETE FROM interaccions WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

// ---------- Tasques i seguiments ----------

const SELECT_TASQUES = `SELECT t.*, TRIM(s.nom || ' ' || s.llinatges) AS soci_nom, a.nom AS activitat_nom
  FROM tasques t LEFT JOIN socis s ON s.id = t.soci_id LEFT JOIN activitats a ON a.id = t.activitat_id`;

crmRouter.get('/tasques', (req, res) => {
  const where: string[] = [];
  const params: (string | number)[] = [];
  const estat = String(req.query.estat ?? 'pendents');
  if (estat === 'pendents') where.push('t.feta = 0');
  else if (estat === 'fetes') where.push('t.feta = 1');
  const soci = enter(req.query.soci_id, 'Soci');
  if (soci) { where.push('t.soci_id = ?'); params.push(soci); }
  const activitat = enter(req.query.activitat_id, 'Activitat');
  if (activitat) { where.push('t.activitat_id = ?'); params.push(activitat); }
  res.json(
    all(
      `${SELECT_TASQUES} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY t.feta, t.data_limit IS NULL, t.data_limit, t.id DESC`,
      ...params,
    ),
  );
});

function llegirTasca(body: Request['body'], actual?: { activitat_id: number | null }) {
  // Si la petició no diu res de l'activitat (p. ex. des de la llista general), es conserva.
  const activitat = enter('activitat_id' in body ? body.activitat_id : actual?.activitat_id, 'Activitat');
  if (activitat !== null && !get('SELECT 1 FROM activitats WHERE id = ?', activitat)) throw new HttpError(400, 'Activitat inexistent.');
  return {
    titol: textObligatori(body.titol, 'Tasca'),
    data_limit: data(body.data_limit, 'Data límit'),
    soci_id: enter(body.soci_id, 'Soci'),
    notes: text(body.notes),
    activitat_id: activitat,
  };
}

crmRouter.post('/tasques', (req, res) => {
  const t = llegirTasca(req.body);
  const { id } = run(
    'INSERT INTO tasques (titol, data_limit, soci_id, notes, activitat_id) VALUES ($titol, $data_limit, $soci_id, $notes, $activitat_id)',
    t,
  );
  res.status(201).json(get(`${SELECT_TASQUES} WHERE t.id = ?`, id));
});

crmRouter.put('/tasques/:id', (req, res) => {
  const id = idParam(req);
  const actual = get<{ feta: number; feta_el: string | null; activitat_id: number | null }>(
    'SELECT feta, feta_el, activitat_id FROM tasques WHERE id = ?', id,
  ) ?? notFound();
  const t = llegirTasca(req.body, actual);
  const feta = bool(req.body.feta ?? actual.feta);
  const feta_el = feta ? (actual.feta ? actual.feta_el : avui()) : null;
  run(
    `UPDATE tasques SET titol = $titol, data_limit = $data_limit, soci_id = $soci_id, notes = $notes, activitat_id = $activitat_id,
       feta = $feta, feta_el = $feta_el WHERE id = $id`,
    { ...t, feta, feta_el, id },
  );
  res.json(get(`${SELECT_TASQUES} WHERE t.id = ?`, id));
});

crmRouter.delete('/tasques/:id', (req, res) => {
  const { changes } = run('DELETE FROM tasques WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

// ---------- Persones interessades ----------

const ESTATS_INTERESSAT = ['nou', 'contactat', 'convertit', 'descartat'];

crmRouter.get('/interessats', (req, res) => {
  const estat = text(req.query.estat);
  res.json(
    estat === 'oberts'
      ? all("SELECT * FROM interessats WHERE estat IN ('nou','contactat') ORDER BY data DESC, id DESC")
      : all('SELECT * FROM interessats ORDER BY data DESC, id DESC'),
  );
});

function llegirInteressat(body: Request['body']) {
  const estat = String(body.estat ?? 'nou');
  if (!ESTATS_INTERESSAT.includes(estat)) throw new HttpError(400, 'Estat no vàlid.');
  return {
    nom: textObligatori(body.nom, 'Nom'),
    llinatges: text(body.llinatges) ?? '',
    telefon: text(body.telefon),
    email: text(body.email),
    origen: text(body.origen),
    interessos: text(body.interessos),
    estat,
    notes: text(body.notes),
    data: data(body.data, 'Data') ?? avui(),
    consentiment: bool(body.consentiment),
  };
}

const CAMPS_INTERESSAT = ['nom', 'llinatges', 'telefon', 'email', 'origen', 'interessos', 'estat', 'notes', 'data', 'consentiment'];

crmRouter.post('/interessats', (req, res) => {
  const i = llegirInteressat(req.body);
  const { id } = run(
    `INSERT INTO interessats (${CAMPS_INTERESSAT.join(', ')}) VALUES (${CAMPS_INTERESSAT.map((c) => '$' + c).join(', ')})`,
    i,
  );
  res.status(201).json(get('SELECT * FROM interessats WHERE id = ?', id));
});

crmRouter.put('/interessats/:id', (req, res) => {
  const id = idParam(req);
  const i = llegirInteressat(req.body);
  const { changes } = run(
    `UPDATE interessats SET ${CAMPS_INTERESSAT.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`,
    { ...i, id },
  );
  if (!changes) notFound();
  res.json(get('SELECT * FROM interessats WHERE id = ?', id));
});

crmRouter.delete('/interessats/:id', (req, res) => {
  const { changes } = run('DELETE FROM interessats WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

/** Dona d'alta la persona interessada com a soci, amb les dades que ja tenim. */
crmRouter.post('/interessats/:id/convertir', (req, res) => {
  const id = idParam(req);
  const sociId = tx(() => {
    const i = get<{ nom: string; llinatges: string; telefon: string | null; email: string | null; estat: string; interessos: string | null; notes: string | null }>(
      'SELECT * FROM interessats WHERE id = ?', id,
    ) ?? notFound();
    if (i.estat === 'convertit') throw new HttpError(409, 'Aquesta persona ja és sòcia.');
    const num = get<{ n: number }>('SELECT COALESCE(MAX(num_soci), 0) + 1 AS n FROM socis')!.n;
    const notes = [i.interessos && `Interessos: ${i.interessos}`, i.notes].filter(Boolean).join('\n') || null;
    const { id: sociId } = run(
      `INSERT INTO socis (num_soci, nom, llinatges, telefon, email, data_alta, notes, poblacio, codi_postal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      num, i.nom, i.llinatges, i.telefon, i.email, avui(), notes,
      getConfig('poblacio') || null, getConfig('codi_postal') || null,
    );
    run("UPDATE interessats SET estat = 'convertit', soci_id = ? WHERE id = ?", sociId, id);
    run(
      "INSERT INTO interaccions (soci_id, data, tipus, resum, autor) VALUES (?, ?, 'nota', 'Alta com a soci a partir de la llista de persones interessades.', ?)",
      sociId, avui(), autor(req),
    );
    return sociId;
  });
  res.status(201).json({ soci_id: sociId });
});

// ---------- Participació en activitats ----------

// Inscripcions obertes: socis, persones interessades o persones de fora (p. ex. els nets dels socis).
// Si l'activitat té places limitades i és plena, la inscripció va a la llista d'espera.

const GENERES = ['dona', 'home', 'altre', 'nc'];
function genere(v: unknown): string | null {
  const g = text(v);
  if (g && !GENERES.includes(g)) throw new HttpError(400, 'Gènere no vàlid.');
  return g;
}
/** Consentiment d'imatge: buit = no consta. */
const dretsImatge = (v: unknown) => (v === undefined || v === null || v === '' ? null : bool(v));

crmRouter.get('/activitats/:id/participants', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM activitats WHERE id = ?', id)) notFound();
  res.json(llistaParticipants(id));
});

crmRouter.post('/activitats/:id/participants', (req, res) => {
  const id = idParam(req);
  const act = get<{ nom: string }>('SELECT nom FROM activitats WHERE id = ?', id) ?? notFound();
  const b = req.body;
  const soci = enter(b.soci_id, 'Soci');
  const interessat = enter(b.interessat_id, 'Persona interessada');
  const comuns = {
    assistit: bool(b.assistit),
    autoritzacio_tutor: data(b.autoritzacio_tutor, 'Autorització del tutor'),
    drets_imatge: dretsImatge(b.drets_imatge),
    tutor: text(b.tutor),
    tutor_telefon: text(b.tutor_telefon),
    notes: text(b.notes),
  };
  const pid = tx(() => {
    let persona: Record<string, unknown>;
    let existent: { id: number; estat: string } | undefined;
    if (soci) {
      if (!get('SELECT 1 FROM socis WHERE id = ?', soci)) throw new HttpError(400, 'Soci inexistent.');
      persona = { soci_id: soci, interessat_id: null, nom_extern: null, data_naixement: null, genere: null, telefon: null, email: null };
      existent = get('SELECT id, estat FROM participacions WHERE activitat_id = ? AND soci_id = ?', id, soci);
    } else if (interessat) {
      const i = get<{ nom: string; llinatges: string }>('SELECT nom, llinatges FROM interessats WHERE id = ?', interessat);
      if (!i) throw new HttpError(400, 'Persona interessada inexistent.');
      // Es copia el nom: si un dia s'esborra la fitxa de la persona interessada, la inscripció el conserva.
      persona = {
        soci_id: null, interessat_id: interessat, nom_extern: `${i.nom} ${i.llinatges}`.trim(),
        data_naixement: data(b.data_naixement, 'Data de naixement'), genere: genere(b.genere), telefon: null, email: null,
      };
      existent = get('SELECT id, estat FROM participacions WHERE activitat_id = ? AND interessat_id = ?', id, interessat);
    } else {
      persona = {
        soci_id: null, interessat_id: null, nom_extern: textObligatori(b.nom_extern, 'Nom'),
        data_naixement: data(b.data_naixement, 'Data de naixement'), genere: genere(b.genere),
        telefon: text(b.telefon), email: text(b.email),
      };
    }
    if (existent && existent.estat !== 'cancel·lat') throw new HttpError(409, "Aquesta persona ja està inscrita a l'activitat.");
    // Qui s'apunta a la porta (ja hi és, «assistit») entra encara que l'activitat sigui plena.
    const estat = comuns.assistit ? 'inscrit' : estatNovaInscripcio(id);
    let nova: number;
    if (existent) {
      // Torna a inscriure's algú que s'havia donat de baixa: passa al final de la cua.
      run(
        `UPDATE participacions SET estat = ?, inscrit_el = datetime('now','localtime'), assistit = ?, notes = COALESCE(?, notes)
          WHERE id = ?`,
        estat, comuns.assistit, comuns.notes, existent.id,
      );
      nova = existent.id;
    } else {
      nova = run(
        `INSERT INTO participacions (activitat_id, soci_id, interessat_id, nom_extern, data_naixement, genere, telefon, email,
           tutor, tutor_telefon, estat, assistit, autoritzacio_tutor, drets_imatge, notes)
         VALUES ($activitat_id, $soci_id, $interessat_id, $nom_extern, $data_naixement, $genere, $telefon, $email,
           $tutor, $tutor_telefon, $estat, $assistit, $autoritzacio_tutor, $drets_imatge, $notes)`,
        { activitat_id: id, ...persona, ...comuns, estat },
      ).id;
    }
    const p = participant(nova)!;
    registra(req, 'crea', 'participacio', nova, `${p.nom} a «${act.nom}»${estat === 'espera' ? " (llista d'espera)" : ''}`);
    return nova;
  });
  res.status(201).json(participant(pid));
});

crmRouter.put('/activitats/:id/participants/:pid', (req, res) => {
  const id = idParam(req);
  const pid = paramEnter(req.params.pid, 'Inscripció');
  const actual = get<Record<string, unknown> & { estat: string; soci_id: number | null; interessat_id: number | null }>(
    'SELECT * FROM participacions WHERE id = ? AND activitat_id = ?', pid, id,
  ) ?? notFound();
  const b = req.body;
  const canvis: Record<string, unknown> = {};
  if ('assistit' in b) canvis.assistit = bool(b.assistit);
  if ('autoritzacio_tutor' in b) canvis.autoritzacio_tutor = data(b.autoritzacio_tutor, 'Autorització del tutor');
  if ('drets_imatge' in b) canvis.drets_imatge = dretsImatge(b.drets_imatge);
  if ('tutor' in b) canvis.tutor = text(b.tutor);
  if ('tutor_telefon' in b) canvis.tutor_telefon = text(b.tutor_telefon);
  if ('notes' in b) canvis.notes = text(b.notes);
  if (!actual.soci_id) {
    // Les dades personals dels socis es mantenen a la seva fitxa.
    if ('data_naixement' in b) canvis.data_naixement = data(b.data_naixement, 'Data de naixement');
    if ('genere' in b) canvis.genere = genere(b.genere);
    if (!actual.interessat_id) {
      if ('nom_extern' in b) canvis.nom_extern = textObligatori(b.nom_extern, 'Nom');
      if ('telefon' in b) canvis.telefon = text(b.telefon);
      if ('email' in b) canvis.email = text(b.email);
    }
  }
  if ('estat' in b) {
    const estat = String(b.estat);
    if (!ESTATS_PARTICIPACIO.includes(estat)) throw new HttpError(400, "Estat de la inscripció no vàlid.");
    if (estat !== actual.estat) {
      canvis.estat = estat;
      if (estat === 'cancel·lat') canvis.assistit = 0;
    }
  }
  const promocionats = tx(() => {
    const claus = Object.keys(canvis);
    if (claus.length) run(`UPDATE participacions SET ${claus.map((k) => `${k} = $${k}`).join(', ')} WHERE id = $id`, { ...canvis, id: pid });
    const personals = claus.filter((k) => k !== 'assistit');
    if (personals.length) registra(req, 'modifica', 'participacio', pid, personals.join(', '));
    // Si queda una plaça lliure (algú cancel·la, o es reactiva una inscripció), entra el primer de la llista d'espera.
    return canvis.estat ? promouEspera(id) : [];
  });
  res.json({ participant: participant(pid), promocionats });
});

crmRouter.delete('/activitats/:id/participants/:pid', (req, res) => {
  const id = idParam(req);
  const pid = paramEnter(req.params.pid, 'Inscripció');
  const actual = participant(pid);
  if (!actual || actual.activitat_id !== id) notFound();
  const promocionats = tx(() => {
    run('DELETE FROM participacions WHERE id = ?', pid);
    registra(req, 'elimina', 'participacio', pid, actual.nom);
    return actual.estat === 'inscrit' ? promouEspera(id) : [];
  });
  res.json({ promocionats });
});

crmRouter.get('/socis/:id/participacions', (req, res) => {
  res.json(
    all(
      `SELECT a.id, a.nom, a.data_inici, a.objectius, p.assistit, p.estat
         FROM participacions p JOIN activitats a ON a.id = p.activitat_id
        WHERE p.soci_id = ? AND p.estat <> 'cancel·lat' ORDER BY a.data_inici DESC`,
      idParam(req),
    ),
  );
});

// ---------- Recordatoris per al tauler ----------

crmRouter.get('/recordatoris', (_req, res) => {
  const ara = avui();
  const tasques = all(
    `${SELECT_TASQUES} WHERE t.feta = 0 AND t.data_limit IS NOT NULL AND t.data_limit <= ? ORDER BY t.data_limit LIMIT 8`,
    sumaDies(7),
  );
  // Aniversaris dels pròxims 14 dies (es calcula en JavaScript per tractar bé el canvi d'any).
  const anys = new Date().getFullYear();
  const aniversaris = all<{ id: number; nom: string; data_naixement: string }>(
    `SELECT s.id, TRIM(s.nom || ' ' || s.llinatges) AS nom, s.data_naixement FROM socis s
      WHERE ${ACTIU} AND s.data_naixement IS NOT NULL`,
  )
    .map((s) => {
      let dia = `${anys}${s.data_naixement.slice(4)}`;
      if (dia < ara) dia = `${anys + 1}${s.data_naixement.slice(4)}`;
      return { ...s, dia, edat: Number(dia.slice(0, 4)) - Number(s.data_naixement.slice(0, 4)) };
    })
    .filter((s) => s.dia <= sumaDies(14))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const sense_consentiment = all(
    `SELECT s.id, TRIM(s.nom || ' ' || s.llinatges) AS nom FROM socis s
      WHERE ${ACTIU} AND s.consentiment_dades = 0 ORDER BY s.num_soci`,
  );
  const quotes_endarrerides = get<{ n: number; total: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(import_cents), 0) AS total FROM quotes WHERE estat = 'pendent' AND exercici < ?",
    anys,
  )!;
  const interessats = get<{ n: number }>("SELECT COUNT(*) AS n FROM interessats WHERE estat IN ('nou','contactat')")!.n;
  res.json({ tasques, aniversaris, sense_consentiment, quotes_endarrerides, interessats });
});

// ---------- Comunicacions a grups de socis ----------

type Segment =
  | { tipus: 'tots' }
  | { tipus: 'etiqueta'; id: number }
  | { tipus: 'franja'; valor: 'infants' | 'joves' | 'adults' | 'gent_gran' }
  | { tipus: 'quota_pendent'; exercici: number }
  | { tipus: 'activitat'; id: number };

const FRANGES: Record<string, [number, number, string]> = {
  infants: [0, 13, 'Infants (0-13)'],
  joves: [14, 29, 'Joves (14-29)'],
  adults: [30, 64, 'Adults (30-64)'],
  gent_gran: [65, 200, 'Gent gran (65+)'],
};

function edat(naixement: string | null) {
  if (!naixement) return null;
  const [a, m, d] = naixement.split('-').map(Number);
  const ara = new Date();
  return ara.getFullYear() - a - (ara.getMonth() + 1 < m || (ara.getMonth() + 1 === m && ara.getDate() < d) ? 1 : 0);
}

interface Destinatari {
  id: number;
  nom: string;
  llinatges: string;
  email: string | null;
  data_naixement: string | null;
  tutor_legal: string | null;
  accepta_comunicacions: number;
}

/**
 * Socis d'un grup. Els que han dit que no volen rebre comunicacions (dret d'oposició)
 * queden fora i es retornen a part, perquè la interfície ho pugui indicar.
 */
function destinataris(seg: Segment): { llista: Destinatari[]; descripcio: string; exclosos: number } {
  const r = destinatarisSenseFiltrar(seg);
  const llista = r.llista.filter((d) => d.accepta_comunicacions);
  return { llista, descripcio: r.descripcio, exclosos: r.llista.length - llista.length };
}

function destinatarisSenseFiltrar(seg: Segment): { llista: Destinatari[]; descripcio: string } {
  const base = `SELECT s.id, s.nom, s.llinatges, s.email, s.data_naixement, s.tutor_legal, s.accepta_comunicacions FROM socis s`;
  switch (seg?.tipus) {
    case 'tots':
      return { llista: all(`${base} WHERE ${ACTIU} ORDER BY s.num_soci`), descripcio: 'Tots els socis actius' };
    case 'etiqueta': {
      const e = get<{ nom: string }>('SELECT nom FROM etiquetes WHERE id = ?', Number(seg.id));
      if (!e) throw new HttpError(400, 'Etiqueta inexistent.');
      return {
        llista: all(`${base} JOIN socis_etiquetes se ON se.soci_id = s.id WHERE se.etiqueta_id = ? AND ${ACTIU} ORDER BY s.num_soci`, Number(seg.id)),
        descripcio: `Etiqueta «${e.nom}»`,
      };
    }
    case 'franja': {
      const f = FRANGES[seg.valor];
      if (!f) throw new HttpError(400, "Franja d'edat no vàlida.");
      const llista = all<Destinatari>(`${base} WHERE ${ACTIU} ORDER BY s.num_soci`).filter((s) => {
        const e = edat(s.data_naixement);
        return e !== null && e >= f[0] && e <= f[1];
      });
      return { llista, descripcio: f[2] };
    }
    case 'quota_pendent':
      return {
        llista: all(
          `${base} JOIN quotes q ON q.soci_id = s.id WHERE q.estat = 'pendent' AND q.exercici = ? ORDER BY s.num_soci`,
          Number(seg.exercici),
        ),
        descripcio: `Quota ${seg.exercici} pendent`,
      };
    case 'activitat': {
      const a = get<{ nom: string }>('SELECT nom FROM activitats WHERE id = ?', Number(seg.id));
      if (!a) throw new HttpError(400, 'Activitat inexistent.');
      return {
        llista: all(`${base} JOIN participacions p ON p.soci_id = s.id WHERE p.activitat_id = ? AND p.estat <> 'cancel·lat' ORDER BY s.num_soci`, Number(seg.id)),
        descripcio: `Inscrits a «${a.nom}»`,
      };
    }
    default:
      throw new HttpError(400, 'Cal triar a qui va dirigit.');
  }
}

const personalitza = (t: string, d: Destinatari) =>
  t.replaceAll('{nom}', d.nom).replaceAll('{nom_complet}', `${d.nom} ${d.llinatges}`.trim());

crmRouter.post('/comunicacions/destinataris', (req, res) => {
  const { llista, descripcio, exclosos } = destinataris(req.body.segment);
  res.json({
    descripcio,
    total: llista.length,
    exclosos,
    amb_correu: llista.filter((d) => d.email).map((d) => ({ id: d.id, nom: `${d.nom} ${d.llinatges}`.trim(), email: d.email })),
    sense_correu: llista.filter((d) => !d.email).map((d) => ({ id: d.id, nom: `${d.nom} ${d.llinatges}`.trim() })),
    correu_configurat: correuConfigurat(),
  });
});

crmRouter.get('/comunicacions', (_req, res) => {
  res.json(all('SELECT * FROM comunicacions ORDER BY data DESC LIMIT 50'));
});

/**
 * Registra (i, si es demana, envia per correu) una comunicació a un grup.
 * metode = 'correu': l'envia el programa; 'manual': només la registra (s'ha enviat per altres vies).
 */
crmRouter.post('/comunicacions', async (req, res) => {
  const assumpte = textObligatori(req.body.assumpte, 'Assumpte');
  const cos = textObligatori(req.body.cos, 'Missatge');
  const metode = req.body.metode === 'manual' ? 'manual' : 'correu';
  const { llista, descripcio } = destinataris(req.body.segment);
  const amb = llista.filter((d) => d.email);
  if (!llista.length) throw new HttpError(400, 'Aquest grup no té cap soci.');

  let enviats = 0;
  let errors: { a: string; error?: string }[] = [];
  let destinats = llista;
  if (metode === 'correu') {
    if (!amb.length) throw new HttpError(400, 'Cap soci del grup té correu electrònic.');
    const resultats = await enviaCorreus(
      amb.map((d) => ({ a: d.email!, assumpte: personalitza(assumpte, d), text: personalitza(cos, d) })),
    );
    const okAdreces = new Set(resultats.filter((r) => r.ok).map((r) => r.a));
    errors = resultats.filter((r) => !r.ok);
    enviats = okAdreces.size;
    destinats = amb.filter((d) => okAdreces.has(d.email!));
  }

  tx(() => {
    run(
      'INSERT INTO comunicacions (assumpte, cos, segment, destinataris, enviats, metode, autor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      assumpte, cos, descripcio, llista.length, enviats, metode, autor(req),
    );
    registra(req, 'envia', 'comunicacio', null, `«${assumpte}» a ${descripcio} (${metode === 'correu' ? `${enviats} correus` : 'registrada'})`);
    for (const d of destinats) {
      run(
        "INSERT INTO interaccions (soci_id, data, tipus, resum, autor) VALUES (?, ?, 'correu', ?, ?)",
        d.id, avui(), `${metode === 'correu' ? 'Correu enviat' : 'Comunicació'}: ${personalitza(assumpte, d)}`, autor(req),
      );
    }
  });
  res.status(201).json({ destinataris: llista.length, enviats, errors });
});
