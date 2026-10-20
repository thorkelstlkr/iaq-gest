import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { HttpError, data, dataObligatoria, enter, idParam, notFound, text, textObligatori } from '../util.ts';
import { registra } from '../auditoria.ts';
import { pot } from '../../shared/permisos.ts';
import { usuariDe } from './auth.ts';
import { avui, dataLocal } from '../../shared/dates.ts';

// Protecció de dades (Reglament UE 2016/679 i Llei orgànica 3/2018).

export const rgpdRouter = Router();

const sumaMesos = (iso: string, mesos: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + mesos);
  return dataLocal(d);
};

// ---------- Configuració ----------

const CLAUS = ['rgpd_contacte', 'rgpd_conservacio_anys', 'rgpd_interessats_mesos', 'rgpd_dpd', 'rgpd_destinataris'] as const;

export function configRgpd() {
  return {
    rgpd_contacte: getConfig('rgpd_contacte') || getConfig('email') || '',
    rgpd_conservacio_anys: getConfig('rgpd_conservacio_anys') || '5',
    rgpd_interessats_mesos: getConfig('rgpd_interessats_mesos') || '12',
    rgpd_dpd: getConfig('rgpd_dpd') || '',
    rgpd_destinataris: getConfig('rgpd_destinataris') || '',
  };
}

rgpdRouter.get('/config', (_req, res) => {
  res.json(configRgpd());
});

rgpdRouter.put('/config', (req, res) => {
  if (!pot(usuariDe(req)?.rol, 'config')) throw new HttpError(403, 'Només Administració pot canviar aquesta configuració.');
  const anys = enter(req.body.rgpd_conservacio_anys, 'Anys de conservació');
  if (anys === null || anys < 1 || anys > 30) throw new HttpError(400, 'Els anys de conservació han de ser entre 1 i 30.');
  const mesos = enter(req.body.rgpd_interessats_mesos, 'Mesos');
  if (mesos === null || mesos < 1 || mesos > 60) throw new HttpError(400, 'Els mesos han de ser entre 1 i 60.');
  for (const k of CLAUS) if (k in req.body) setConfig(k, text(req.body[k]) ?? '');
  registra(req, 'modifica', 'rgpd', null, 'Configuració de protecció de dades');
  res.json(configRgpd());
});

// ---------- Dret d'accés i portabilitat ----------

/** Totes les dades personals d'un soci, en format llegible per màquina (art. 15 i 20 RGPD). */
rgpdRouter.get('/socis/:id/dades', (req, res) => {
  const id = idParam(req);
  const soci = get('SELECT * FROM socis WHERE id = ?', id) ?? notFound();
  const dades = {
    generat_el: new Date().toISOString(),
    responsable: getConfig('nom_complet') || getConfig('nom'),
    soci,
    te_foto: Boolean(get('SELECT 1 FROM socis_fotos WHERE soci_id = ?', id)),
    etiquetes: all('SELECT e.nom FROM socis_etiquetes se JOIN etiquetes e ON e.id = se.etiqueta_id WHERE se.soci_id = ?', id).map(
      (e) => (e as { nom: string }).nom,
    ),
    quotes: all('SELECT exercici, import_cents, estat, data_pagament FROM quotes WHERE soci_id = ? ORDER BY exercici', id),
    moviments: all('SELECT data, tipus, import_cents, concepte FROM moviments WHERE soci_id = ? ORDER BY data', id),
    historial_contactes: all('SELECT data, tipus, resum, autor FROM interaccions WHERE soci_id = ? ORDER BY data', id),
    tasques: all('SELECT titol, data_limit, feta FROM tasques WHERE soci_id = ?', id),
    participacio_activitats: all(
      'SELECT a.nom, a.data_inici, p.assistit FROM participacions p JOIN activitats a ON a.id = p.activitat_id WHERE p.soci_id = ? ORDER BY a.data_inici',
      id,
    ),
    sollicituds_drets: all('SELECT tipus, data_sollicitud, estat, data_resolucio FROM drets_rgpd WHERE soci_id = ?', id),
  };
  registra(req, 'exporta', 'soci', id, "Exportació de totes les dades (dret d'accés/portabilitat)");
  res.json(dades);
});

// ---------- Dret de supressió: anonimització ----------

/**
 * Esborra les dades personals del soci però conserva els registres comptables (quotes i moviments),
 * que s'han de guardar per obligació legal, sense res que l'identifiqui.
 */
export function anonimitzaSoci(req: Request, id: number, motiu: string) {
  const s = get<{ num_soci: number; nom: string; llinatges: string; anonimitzat_el: string | null; data_baixa: string | null }>(
    'SELECT num_soci, nom, llinatges, anonimitzat_el, data_baixa FROM socis WHERE id = ?',
    id,
  );
  if (!s) notFound();
  if (s.anonimitzat_el) throw new HttpError(409, 'Aquest soci ja està anonimitzat.');
  const nomComplet = `${s.nom} ${s.llinatges}`.trim();
  run(
    `UPDATE socis SET nom = 'Soci anonimitzat', llinatges = '', dni = NULL, data_naixement = NULL, genere = NULL,
       adreca = NULL, codi_postal = NULL, poblacio = NULL, telefon = NULL, email = NULL, iban = NULL,
       tutor_legal = NULL, notes = NULL, motiu_baixa = NULL, consentiment_dades = 0, consentiment_data = NULL,
       consentiment_signant = NULL, drets_imatge = 0, accepta_comunicacions = 0,
       data_baixa = COALESCE(data_baixa, ?), anonimitzat_el = ?
     WHERE id = ?`,
    avui(), new Date().toISOString(), id,
  );
  run('DELETE FROM socis_fotos WHERE soci_id = ?', id);
  run('DELETE FROM socis_etiquetes WHERE soci_id = ?', id);
  run('DELETE FROM interaccions WHERE soci_id = ?', id);
  run('DELETE FROM tasques WHERE soci_id = ?', id);
  run(
    `UPDATE interessats SET nom = 'Persona anonimitzada', llinatges = '', telefon = NULL, email = NULL, notes = NULL, interessos = NULL
      WHERE soci_id = ?`,
    id,
  );
  // Els conceptes dels moviments poden contenir el nom (p. ex. «Quota 2026 – soci núm. 7 (Nom Llinatges)»).
  if (nomComplet) run('UPDATE moviments SET concepte = REPLACE(concepte, ?, ?) WHERE soci_id = ?', nomComplet, 'anonimitzat', id);
  registra(req, 'anonimitza', 'soci', id, `Soci núm. ${s.num_soci} anonimitzat. Motiu: ${motiu}`);
}

rgpdRouter.post('/socis/:id/anonimitza', (req, res) => {
  const id = idParam(req);
  tx(() => anonimitzaSoci(req, id, text(req.body.motiu) ?? 'Sol·licitud de supressió'));
  res.json({ ok: true });
});

// ---------- Terminis de conservació ----------

function caducats() {
  const { rgpd_conservacio_anys: anys, rgpd_interessats_mesos: mesos } = configRgpd();
  const limitSocis = sumaMesos(avui(), -12 * Number(anys));
  const limitInteressats = sumaMesos(avui(), -Number(mesos));
  return {
    anys: Number(anys),
    mesos: Number(mesos),
    socis: all<{ id: number; num_soci: number; nom: string; data_baixa: string }>(
      `SELECT id, num_soci, TRIM(nom || ' ' || llinatges) AS nom, data_baixa FROM socis
        WHERE anonimitzat_el IS NULL AND data_baixa IS NOT NULL AND data_baixa < ? ORDER BY data_baixa`,
      limitSocis,
    ),
    interessats: all<{ id: number; nom: string; data: string; estat: string }>(
      `SELECT id, TRIM(nom || ' ' || llinatges) AS nom, data, estat FROM interessats
        WHERE estat IN ('nou','contactat','descartat') AND data < ? ORDER BY data`,
      limitInteressats,
    ),
  };
}

rgpdRouter.get('/conservacio', (_req, res) => {
  res.json(caducats());
});

rgpdRouter.post('/conservacio/aplica', (req, res) => {
  const c = caducats();
  tx(() => {
    for (const s of c.socis) anonimitzaSoci(req, s.id, `Termini de conservació (${c.anys} anys des de la baixa)`);
    for (const i of c.interessats) {
      run('DELETE FROM interessats WHERE id = ?', i.id);
      registra(req, 'conservacio', 'interessat', i.id, `Eliminada per termini de conservació (${c.mesos} mesos)`);
    }
  });
  res.json({ socis: c.socis.length, interessats: c.interessats.length });
});

// ---------- Sol·licituds d'exercici de drets ----------

const TIPUS = ['acces', 'rectificacio', 'supressio', 'oposicio', 'limitacio', 'portabilitat', 'retirada_consentiment'];

rgpdRouter.get('/drets', (_req, res) => {
  res.json(
    all(
      `SELECT d.*, s.num_soci FROM drets_rgpd d LEFT JOIN socis s ON s.id = d.soci_id
        ORDER BY d.estat = 'pendent' DESC, d.data_limit, d.id DESC`,
    ),
  );
});

function llegirDret(body: Request['body']) {
  const tipus = String(body.tipus);
  if (!TIPUS.includes(tipus)) throw new HttpError(400, 'Tipus de dret no vàlid.');
  const estat = String(body.estat ?? 'pendent');
  if (!['pendent', 'resolta', 'denegada'].includes(estat)) throw new HttpError(400, 'Estat no vàlid.');
  const dataS = dataObligatoria(body.data_sollicitud, 'Data de la sol·licitud');
  return {
    soci_id: enter(body.soci_id, 'Soci'),
    sollicitant: textObligatori(body.sollicitant, 'Persona sol·licitant'),
    tipus,
    data_sollicitud: dataS,
    // Termini legal de resposta: un mes (art. 12.3 RGPD).
    data_limit: data(body.data_limit, 'Data límit') ?? sumaMesos(dataS, 1),
    estat,
    data_resolucio: estat === 'pendent' ? null : (data(body.data_resolucio, 'Data de resolució') ?? avui()),
    notes: text(body.notes),
  };
}

rgpdRouter.post('/drets', (req, res) => {
  const d = llegirDret(req.body);
  const { id } = run(
    `INSERT INTO drets_rgpd (soci_id, sollicitant, tipus, data_sollicitud, data_limit, estat, data_resolucio, notes)
     VALUES ($soci_id, $sollicitant, $tipus, $data_sollicitud, $data_limit, $estat, $data_resolucio, $notes)`,
    d,
  );
  registra(req, 'drets', 'sollicitud', id, `Nova sol·licitud: ${d.tipus}`);
  res.status(201).json(get('SELECT * FROM drets_rgpd WHERE id = ?', id));
});

rgpdRouter.put('/drets/:id', (req, res) => {
  const id = idParam(req);
  const d = llegirDret(req.body);
  const { changes } = run(
    `UPDATE drets_rgpd SET soci_id = $soci_id, sollicitant = $sollicitant, tipus = $tipus, data_sollicitud = $data_sollicitud,
       data_limit = $data_limit, estat = $estat, data_resolucio = $data_resolucio, notes = $notes WHERE id = $id`,
    { ...d, id },
  );
  if (!changes) notFound();
  registra(req, 'drets', 'sollicitud', id, `Sol·licitud ${d.tipus}: ${d.estat}`);
  res.json(get('SELECT * FROM drets_rgpd WHERE id = ?', id));
});

// ---------- Registre d'activitat i resum ----------

rgpdRouter.get('/auditoria', (req, res) => {
  const limit = Math.min(enter(req.query.limit, 'Límit') ?? 200, 1000);
  res.json(all('SELECT * FROM auditoria ORDER BY id DESC LIMIT ?', limit));
});

rgpdRouter.get('/resum', (_req, res) => {
  const ACTIU = "(data_baixa IS NULL OR data_baixa > date('now', 'localtime')) AND anonimitzat_el IS NULL";
  const c = caducats();
  res.json({
    socis_actius: get<{ n: number }>(`SELECT COUNT(*) AS n FROM socis WHERE ${ACTIU}`)!.n,
    sense_consentiment: all(`SELECT id, num_soci, TRIM(nom || ' ' || llinatges) AS nom FROM socis WHERE ${ACTIU} AND consentiment_dades = 0 ORDER BY num_soci`),
    menors_sense_tutor: all(
      `SELECT id, num_soci, TRIM(nom || ' ' || llinatges) AS nom FROM socis
        WHERE ${ACTIU} AND data_naixement > date('now', 'localtime', '-14 years') AND (tutor_legal IS NULL OR tutor_legal = '') ORDER BY num_soci`,
    ),
    sense_comunicacions: get<{ n: number }>(`SELECT COUNT(*) AS n FROM socis WHERE ${ACTIU} AND accepta_comunicacions = 0`)!.n,
    drets_pendents: all("SELECT id, sollicitant, tipus, data_limit FROM drets_rgpd WHERE estat = 'pendent' ORDER BY data_limit"),
    caducats: { socis: c.socis.length, interessats: c.interessats.length, anys: c.anys, mesos: c.mesos },
  });
});
