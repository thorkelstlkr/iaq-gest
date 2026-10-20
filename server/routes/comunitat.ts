// Comunitat: voluntariat (Llei 45/2015 del voluntariat i Llei 3/1998 del voluntariat de les Illes Balears),
// hores de voluntariat, assegurances, entitats col·laboradores, convenis i col·laboracions a les activitats.

import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import {
  HttpError, bool, centsAEuros, columnesTraduides, data, dataObligatoria, enter, exerciciParam, idParam, notFound, sendCsv, text,
  textObligatori, toCsv,
} from '../util.ts';
import { registra } from '../auditoria.ts';
import { usuariDe } from './auth.ts';
import { juntaActual } from './governanca.ts';
import { pot } from '../../shared/permisos.ts';
import { avui, sumaDies } from '../../shared/dates.ts';

export const comunitatRouter = Router();

// ---------- Constants i utilitats ----------

export const TIPUS_ASSEGURANCA = ['responsabilitat_civil', 'accidents_voluntaris', 'activitats', 'altres'] as const;
export const TIPUS_ENTITAT = ['ajuntament', 'consell', 'govern', 'escola', 'entitat', 'empresa', 'altres'] as const;
export const ESTATS_CONVENI = ['esborrany', 'vigent', 'finalitzat'] as const;
export const ROLS_ACTIVITAT = ['organitzador', 'collaborador', 'patrocinador', 'espai_cedit', 'altres'] as const;

/** Mida màxima dels documents adjunts (el cos de les peticions JSON és de 2 MB com a màxim). */
export const MAX_DOCUMENT = Math.round(1.4 * 1024 * 1024);

const dma = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');
const nomDe = (v: { nom: string; llinatges: string }) => `${v.nom} ${v.llinatges ?? ''}`.trim();
const pad = (n: number) => String(n).padStart(2, '0');

function opcio<T extends string>(v: unknown, valors: readonly T[], camp: string, perDefecte?: T): T {
  const s = text(v);
  if (!s && perDefecte) return perDefecte;
  if (!s || !(valors as readonly string[]).includes(s)) throw new HttpError(400, `El camp «${camp}» no és vàlid.`);
  return s as T;
}

function centsOpcionals(v: unknown, camp: string): number | null {
  const n = enter(v, camp);
  if (n !== null && n < 0) throw new HttpError(400, `L'import «${camp}» no és vàlid.`);
  return n;
}

/** Document adjunt (PDF o imatge) com a data URI. Buit → null. */
export function documentValid(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const m = /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) throw new HttpError(400, 'El document ha de ser un PDF o una imatge (JPG, PNG o WebP).');
  if (Math.floor((m[2].length * 3) / 4) > MAX_DOCUMENT) throw new HttpError(400, 'El document és massa gran (màxim 1,4 MB).');
  return s;
}

/** Les dades personals dels voluntaris només les veuen els perfils amb accés als socis. */
function nomesSocis(req: Request, _res: Response, next: NextFunction) {
  if (!pot(usuariDe(req)?.rol, 'socis')) throw new HttpError(403, 'El teu perfil no té accés a aquesta part del programa.');
  next();
}

// ---------- Configuració ----------

export function configComunitat() {
  const n = (clau: string, perDefecte: number) => {
    const brut = getConfig(clau);
    const v = Number(brut);
    return brut !== null && brut !== '' && Number.isFinite(v) ? v : perDefecte;
  };
  return { vol_validesa_certificat_mesos: n('vol_validesa_certificat_mesos', 12), vol_valor_hora_cents: n('vol_valor_hora_cents', 1000) };
}

comunitatRouter.get('/config', (_req, res) => {
  res.json(configComunitat());
});

comunitatRouter.put('/config', (req, res) => {
  const mesos = enter(req.body.vol_validesa_certificat_mesos, 'Validesa del certificat');
  if (mesos === null || mesos < 1 || mesos > 120) throw new HttpError(400, 'La validesa del certificat ha de ser entre 1 i 120 mesos.');
  const valor = enter(req.body.vol_valor_hora_cents, 'Valor de l’hora');
  if (valor === null || valor < 0 || valor > 100000) throw new HttpError(400, 'El valor de l’hora de voluntariat no és vàlid.');
  setConfig('vol_validesa_certificat_mesos', String(mesos));
  setConfig('vol_valor_hora_cents', String(valor));
  registra(req, 'configura', 'voluntariat', null, `Validesa certificat ${mesos} mesos, valor hora ${centsAEuros(valor)} €`);
  res.json(configComunitat());
});

/** Junta vigent (per a les signatures dels documents). */
comunitatRouter.get('/junta', (_req, res) => {
  const j = juntaActual();
  res.json({ presidencia: j.presidencia, secretaria: j.secretaria });
});

// ---------- Certificat de delictes sexuals (art. 8.4 Llei 45/2015) ----------

/** Suma mesos a una data ISO; si el dia no existeix al mes d'arribada, s'agafa el darrer dia del mes. */
export function sumaMesos(iso: string, mesos: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = m - 1 + mesos;
  const any = y + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const darrer = new Date(any, mes + 1, 0).getDate();
  return `${any}-${pad(mes + 1)}-${pad(Math.min(d, darrer))}`;
}

export type EstatCertificat = 'no_cal' | 'falta' | 'caducat' | 'caduca_aviat' | 'vigent';

/** Estat del certificat negatiu del Registre Central de Delinqüents Sexuals d'una persona voluntària. */
export function estatCertificat(
  v: { treballa_amb_menors: number | boolean; certificat_delictes_data: string | null },
  mesos = configComunitat().vol_validesa_certificat_mesos,
  ara = avui(),
): { estat: EstatCertificat; caduca: string | null } {
  const caduca = v.certificat_delictes_data ? sumaMesos(v.certificat_delictes_data, mesos) : null;
  if (!v.treballa_amb_menors) return { estat: 'no_cal', caduca };
  if (!caduca) return { estat: 'falta', caduca };
  if (caduca <= ara) return { estat: 'caducat', caduca };
  if (caduca <= sumaDies(30, new Date(`${ara}T12:00:00`))) return { estat: 'caduca_aviat', caduca };
  return { estat: 'vigent', caduca };
}

// ---------- Assegurances: cobertura ----------

interface PolissaVigent {
  id: number;
  tipus: string;
  nominativa: number;
}

export function polissesVigents(ara = avui()): PolissaVigent[] {
  return all<PolissaVigent>(
    'SELECT id, tipus, nominativa FROM assegurances WHERE (data_inici IS NULL OR data_inici <= ?) AND data_venciment >= ?',
    ara, ara,
  );
}

/** Per a cada persona voluntària: si la cobreix una pòlissa vigent d'accidents i una de responsabilitat civil. */
export function cobertura(ara = avui()): Map<number, { accidents: boolean; rc: boolean }> {
  const pols = polissesVigents(ara);
  const nominals = new Set(
    all<{ a: number; v: number }>('SELECT asseguranca_id AS a, voluntari_id AS v FROM assegurances_voluntaris').map((r) => `${r.a}:${r.v}`),
  );
  const cobreix = (tipus: string, vid: number) => pols.some((p) => p.tipus === tipus && (!p.nominativa || nominals.has(`${p.id}:${vid}`)));
  const res = new Map<number, { accidents: boolean; rc: boolean }>();
  for (const { id } of all<{ id: number }>('SELECT id FROM voluntaris'))
    res.set(id, { accidents: cobreix('accidents_voluntaris', id), rc: cobreix('responsabilitat_civil', id) });
  return res;
}

// ---------- Persones voluntàries ----------

/** Condició SQL de persona voluntària activa en una data (paràmetre repetit dues vegades). */
const ACTIU = 'v.data_incorporacio <= ? AND (v.data_baixa IS NULL OR v.data_baixa > ?)';

interface VoluntariFila {
  id: number;
  soci_id: number | null;
  num_soci: number | null;
  nom: string;
  llinatges: string;
  dni: string | null;
  data_naixement: string | null;
  email: string | null;
  telefon: string | null;
  adreca: string | null;
  data_incorporacio: string;
  data_baixa: string | null;
  motiu_baixa: string | null;
  funcions: string | null;
  habilitats: string | null;
  disponibilitat: string | null;
  formacio: string | null;
  acord_signat_el: string | null;
  treballa_amb_menors: number;
  certificat_delictes_data: string | null;
  notes: string | null;
}

const SELECT_VOLUNTARI = `
  SELECT v.id, v.soci_id, s.num_soci, v.nom, v.llinatges,
         CASE WHEN s.id IS NOT NULL THEN s.dni ELSE v.dni END AS dni,
         CASE WHEN s.id IS NOT NULL THEN s.data_naixement ELSE v.data_naixement END AS data_naixement,
         CASE WHEN s.id IS NOT NULL THEN s.email ELSE v.email END AS email,
         CASE WHEN s.id IS NOT NULL THEN s.telefon ELSE v.telefon END AS telefon,
         CASE WHEN s.id IS NOT NULL THEN NULLIF(TRIM(COALESCE(s.adreca, '') || ' ' || COALESCE(s.codi_postal, '') || ' ' || COALESCE(s.poblacio, '')), '')
              ELSE v.adreca END AS adreca,
         v.data_incorporacio, v.data_baixa, v.motiu_baixa, v.funcions, v.habilitats, v.disponibilitat, v.formacio,
         v.acord_signat_el, v.treballa_amb_menors, v.certificat_delictes_data, v.notes
    FROM voluntaris v LEFT JOIN socis s ON s.id = v.soci_id`;

/** Llista de persones voluntàries amb l'estat del certificat, la cobertura i les hores de l'exercici. */
export function llistaVoluntaris(opcions: { tots?: boolean; exercici?: number; ara?: string } = {}) {
  const ara = opcions.ara ?? avui();
  const exercici = opcions.exercici ?? Number(ara.slice(0, 4));
  const files = all<VoluntariFila & { hores_exercici: number; hores_totals: number }>(
    `${SELECT_VOLUNTARI.replace(
      'FROM voluntaris v',
      `, (SELECT COALESCE(SUM(h.hores), 0) FROM hores_voluntariat h WHERE h.voluntari_id = v.id AND h.data BETWEEN ? AND ?) AS hores_exercici,
         (SELECT COALESCE(SUM(h.hores), 0) FROM hores_voluntariat h WHERE h.voluntari_id = v.id) AS hores_totals
       FROM voluntaris v`,
    )}
     ${opcions.tots ? '' : 'WHERE v.data_baixa IS NULL OR v.data_baixa > ?'}
     ORDER BY v.llinatges, v.nom`,
    `${exercici}-01-01`, `${exercici}-12-31`, ...(opcions.tots ? [] : [ara]),
  );
  const mesos = configComunitat().vol_validesa_certificat_mesos;
  const cob = cobertura(ara);
  return files.map((v) => ({
    ...v,
    hores_exercici: Math.round(v.hores_exercici * 100) / 100,
    hores_totals: Math.round(v.hores_totals * 100) / 100,
    actiu: v.data_incorporacio <= ara && (!v.data_baixa || v.data_baixa > ara),
    certificat: estatCertificat(v, mesos, ara),
    cobertura: cob.get(v.id) ?? { accidents: false, rc: false },
  }));
}

export function voluntariActius(ara = avui()) {
  return all<{ id: number; nom: string; llinatges: string; treballa_amb_menors: number; certificat_delictes_data: string | null; acord_signat_el: string | null }>(
    `SELECT v.id, v.nom, v.llinatges, v.treballa_amb_menors, v.certificat_delictes_data, v.acord_signat_el
       FROM voluntaris v WHERE ${ACTIU} ORDER BY v.llinatges, v.nom`,
    ara, ara,
  );
}

interface DadesVoluntari {
  soci_id: number | null;
  nom: string;
  llinatges: string;
  dni: string | null;
  data_naixement: string | null;
  email: string | null;
  telefon: string | null;
  adreca: string | null;
  data_incorporacio: string;
  data_baixa: string | null;
  motiu_baixa: string | null;
  funcions: string | null;
  habilitats: string | null;
  disponibilitat: string | null;
  formacio: string | null;
  acord_signat_el: string | null;
  treballa_amb_menors: number;
  certificat_delictes_data: string | null;
  notes: string | null;
}

function llegeixVoluntari(b: Record<string, unknown>, id: number | null): DadesVoluntari {
  const soci_id = enter(b.soci_id, 'Soci');
  let identitat: Pick<DadesVoluntari, 'nom' | 'llinatges' | 'dni' | 'data_naixement' | 'email' | 'telefon' | 'adreca'>;
  if (soci_id) {
    const s = get<{ nom: string; llinatges: string; anonimitzat_el: string | null }>(
      'SELECT nom, llinatges, anonimitzat_el FROM socis WHERE id = ?',
      soci_id,
    );
    if (!s || s.anonimitzat_el) throw new HttpError(400, 'El soci indicat no existeix.');
    const repetit = get<{ id: number }>('SELECT id FROM voluntaris WHERE soci_id = ? AND id <> ?', soci_id, id ?? 0);
    if (repetit) throw new HttpError(409, 'Aquest soci ja consta com a persona voluntària.');
    // De les persones sòcies, les dades de contacte són les de la fitxa del soci.
    identitat = { nom: s.nom, llinatges: s.llinatges, dni: null, data_naixement: null, email: null, telefon: null, adreca: null };
  } else {
    identitat = {
      nom: textObligatori(b.nom, 'Nom'),
      llinatges: text(b.llinatges) ?? '',
      dni: text(b.dni)?.toUpperCase() ?? null,
      data_naixement: data(b.data_naixement, 'Data de naixement'),
      email: text(b.email),
      telefon: text(b.telefon),
      adreca: text(b.adreca),
    };
  }
  const data_incorporacio = dataObligatoria(b.data_incorporacio, "Data d'incorporació");
  const data_baixa = data(b.data_baixa, 'Data de baixa');
  if (data_baixa && data_baixa < data_incorporacio)
    throw new HttpError(400, "La data de baixa no pot ser anterior a la d'incorporació.");
  return {
    soci_id: soci_id || null,
    ...identitat,
    data_incorporacio,
    data_baixa,
    motiu_baixa: data_baixa ? text(b.motiu_baixa) : null,
    funcions: text(b.funcions),
    habilitats: text(b.habilitats),
    disponibilitat: text(b.disponibilitat),
    formacio: text(b.formacio),
    acord_signat_el: data(b.acord_signat_el, "Data de signatura de l'acord"),
    treballa_amb_menors: bool(b.treballa_amb_menors),
    certificat_delictes_data: data(b.certificat_delictes_data, 'Data del certificat'),
    notes: text(b.notes),
  };
}

const COLS_VOLUNTARI = [
  'soci_id', 'nom', 'llinatges', 'dni', 'data_naixement', 'email', 'telefon', 'adreca', 'data_incorporacio', 'data_baixa', 'motiu_baixa',
  'funcions', 'habilitats', 'disponibilitat', 'formacio', 'acord_signat_el', 'treballa_amb_menors', 'certificat_delictes_data', 'notes',
] as const;

/** Dona d'alta una persona voluntària (sòcia o no). */
export function creaVoluntari(b: Record<string, unknown>): number {
  const d = llegeixVoluntari(b, null);
  return run(
    `INSERT INTO voluntaris (${COLS_VOLUNTARI.join(', ')}) VALUES (${COLS_VOLUNTARI.map(() => '?').join(', ')})`,
    ...COLS_VOLUNTARI.map((c) => d[c]),
  ).id;
}

export function actualitzaVoluntari(id: number, b: Record<string, unknown>) {
  if (!get('SELECT 1 FROM voluntaris WHERE id = ?', id)) notFound();
  const d = llegeixVoluntari(b, id);
  run(`UPDATE voluntaris SET ${COLS_VOLUNTARI.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...COLS_VOLUNTARI.map((c) => d[c]), id);
}

/** Fitxa completa: dades, períodes (registre), hores recents i resum per any. */
export function fitxaVoluntari(id: number) {
  const v = llistaVoluntaris({ tots: true }).find((x) => x.id === id);
  if (!v) notFound();
  const periodes = all('SELECT id, data_alta, data_baixa, motiu_baixa FROM voluntaris_periodes WHERE voluntari_id = ? ORDER BY data_alta, id', id);
  const hores = all(
    `SELECT h.id, h.data, h.hores, h.tasca, h.activitat_id, a.nom AS activitat
       FROM hores_voluntariat h LEFT JOIN activitats a ON a.id = h.activitat_id
      WHERE h.voluntari_id = ? ORDER BY h.data DESC, h.id DESC LIMIT 50`,
    id,
  );
  const perAny = all<{ any: string; hores: number }>(
    `SELECT substr(data, 1, 4) AS any, ROUND(SUM(hores), 2) AS hores FROM hores_voluntariat WHERE voluntari_id = ? GROUP BY any ORDER BY any DESC`,
    id,
  );
  const assegurances = all(
    `SELECT a.id, a.asseguradora, a.num_polissa, a.tipus, a.data_venciment FROM assegurances a
      WHERE (a.data_inici IS NULL OR a.data_inici <= ?) AND a.data_venciment >= ?
        AND (a.nominativa = 0 OR EXISTS (SELECT 1 FROM assegurances_voluntaris av WHERE av.asseguranca_id = a.id AND av.voluntari_id = ?))
      ORDER BY a.tipus`,
    avui(), avui(), id,
  );
  return { ...v, periodes, hores, per_any: perAny, assegurances };
}

comunitatRouter.get('/socis', nomesSocis, (_req, res) => {
  const ara = avui();
  res.json(
    all(
      `SELECT s.id, s.num_soci, s.nom, s.llinatges, s.data_naixement,
              (SELECT v.id FROM voluntaris v WHERE v.soci_id = s.id) AS voluntari_id
         FROM socis s
        WHERE s.anonimitzat_el IS NULL AND s.estat_admissio = 'admesa' AND s.data_alta <= ? AND (s.data_baixa IS NULL OR s.data_baixa > ?)
        ORDER BY s.llinatges, s.nom`,
      ara, ara,
    ),
  );
});

comunitatRouter.get('/voluntaris', nomesSocis, (req, res) => {
  res.json(llistaVoluntaris({ tots: req.query.tots === '1', exercici: exerciciParam(req) }));
});

comunitatRouter.get('/voluntaris/:id', nomesSocis, (req, res) => {
  res.json(fitxaVoluntari(idParam(req)));
});

comunitatRouter.post('/voluntaris', (req, res) => {
  const id = creaVoluntari(req.body ?? {});
  registra(req, 'crea', 'voluntari', id);
  res.status(201).json(fitxaVoluntari(id));
});

comunitatRouter.put('/voluntaris/:id', (req, res) => {
  const id = idParam(req);
  actualitzaVoluntari(id, req.body ?? {});
  registra(req, 'modifica', 'voluntari', id);
  res.json(fitxaVoluntari(id));
});

/** Baixa del voluntariat (queda al registre). */
export function baixaVoluntari(id: number, dataBaixa: string, motiu: string | null) {
  const v = get<{ data_incorporacio: string; data_baixa: string | null }>('SELECT data_incorporacio, data_baixa FROM voluntaris WHERE id = ?', id);
  if (!v) notFound();
  if (v.data_baixa) throw new HttpError(409, 'Aquesta persona ja és de baixa del voluntariat.');
  if (dataBaixa < v.data_incorporacio) throw new HttpError(400, "La data de baixa no pot ser anterior a la d'incorporació.");
  run('UPDATE voluntaris SET data_baixa = ?, motiu_baixa = ? WHERE id = ?', dataBaixa, motiu, id);
}

/** Reincorporació: obre un període nou al registre; cal signar un acord nou. */
export function reincorporaVoluntari(id: number, dataAlta: string) {
  const v = get<{ data_baixa: string | null }>('SELECT data_baixa FROM voluntaris WHERE id = ?', id);
  if (!v) notFound();
  if (!v.data_baixa) throw new HttpError(409, 'Aquesta persona ja és voluntària activa.');
  if (dataAlta < v.data_baixa) throw new HttpError(400, 'La data de reincorporació no pot ser anterior a la de la baixa.');
  tx(() => {
    // Primer el període nou: el disparador de sincronització actualitza sempre el darrer període.
    run('INSERT INTO voluntaris_periodes (voluntari_id, data_alta) VALUES (?, ?)', id, dataAlta);
    run('UPDATE voluntaris SET data_incorporacio = ?, data_baixa = NULL, motiu_baixa = NULL, acord_signat_el = NULL WHERE id = ?', dataAlta, id);
  });
}

comunitatRouter.post('/voluntaris/:id/baixa', (req, res) => {
  const id = idParam(req);
  baixaVoluntari(id, dataObligatoria(req.body?.data, 'Data de baixa'), text(req.body?.motiu));
  registra(req, 'modifica', 'voluntari', id, 'Baixa del voluntariat');
  res.json(fitxaVoluntari(id));
});

comunitatRouter.post('/voluntaris/:id/reincorpora', (req, res) => {
  const id = idParam(req);
  reincorporaVoluntari(id, dataObligatoria(req.body?.data, "Data d'incorporació"));
  registra(req, 'modifica', 'voluntari', id, 'Reincorporació al voluntariat');
  res.json(fitxaVoluntari(id));
});

comunitatRouter.delete('/voluntaris/:id', (req, res) => {
  const id = idParam(req);
  const v = get<{ nom: string; llinatges: string }>('SELECT nom, llinatges FROM voluntaris WHERE id = ?', id);
  if (!v) notFound();
  run('DELETE FROM voluntaris WHERE id = ?', id);
  registra(req, 'elimina', 'voluntari', id, nomDe(v));
  res.status(204).end();
});

/** Dades per al certificat de voluntariat: hores i activitats d'un període. */
export function dadesCertificat(id: number, de: string, a: string) {
  if (de > a) throw new HttpError(400, 'La data inicial no pot ser posterior a la final.');
  const v = fitxaVoluntari(id);
  const activitats = all<{ activitat_id: number | null; nom: string | null; data_inici: string | null; hores: number }>(
    `SELECT h.activitat_id, a.nom, a.data_inici, ROUND(SUM(h.hores), 2) AS hores
       FROM hores_voluntariat h LEFT JOIN activitats a ON a.id = h.activitat_id
      WHERE h.voluntari_id = ? AND h.data BETWEEN ? AND ?
      GROUP BY h.activitat_id ORDER BY a.data_inici IS NULL, a.data_inici`,
    id, de, a,
  );
  const tasques = all<{ tasca: string }>(
    `SELECT DISTINCT tasca FROM hores_voluntariat WHERE voluntari_id = ? AND data BETWEEN ? AND ? AND tasca IS NOT NULL ORDER BY tasca`,
    id, de, a,
  ).map((r) => r.tasca);
  const hores = Math.round(activitats.reduce((s, x) => s + x.hores, 0) * 100) / 100;
  const j = juntaActual();
  return { voluntari: v, de, a, hores, activitats, tasques, junta: { presidencia: j.presidencia, secretaria: j.secretaria } };
}

comunitatRouter.get('/voluntaris/:id/certificat', nomesSocis, (req, res) => {
  const id = idParam(req);
  const ara = avui();
  const de = data(req.query.de, 'Des de') ?? `${ara.slice(0, 4)}-01-01`;
  const a = data(req.query.a, 'Fins a') ?? ara;
  res.json(dadesCertificat(id, de, a));
});

/** Registre d'altes i baixes de persones voluntàries (un període per fila). */
export function registreVoluntaris() {
  return all(
    `SELECT p.id, p.voluntari_id, v.nom, v.llinatges, s.num_soci,
            CASE WHEN s.id IS NOT NULL THEN s.dni ELSE v.dni END AS dni,
            p.data_alta, p.data_baixa, p.motiu_baixa
       FROM voluntaris_periodes p JOIN voluntaris v ON v.id = p.voluntari_id LEFT JOIN socis s ON s.id = v.soci_id
      ORDER BY p.data_alta, p.id`,
  );
}

comunitatRouter.get('/registre', nomesSocis, (_req, res) => {
  res.json(registreVoluntaris());
});

// ---------- Hores de voluntariat ----------

function hores(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 24) throw new HttpError(400, 'Les hores han de ser un nombre entre 0 i 24.');
  return Math.round(n * 100) / 100;
}

function activitatOpcional(v: unknown): number | null {
  const id = enter(v, 'Activitat');
  if (!id) return null;
  if (!get('SELECT 1 FROM activitats WHERE id = ?', id)) throw new HttpError(400, "L'activitat indicada no existeix.");
  return id;
}

/** Registra hores per a una o diverses persones (entrada ràpida d'una activitat). Torna els identificadors creats. */
export function afegeixHores(b: Record<string, unknown>): number[] {
  const ids = (Array.isArray(b.voluntari_ids) ? b.voluntari_ids : [b.voluntari_id]).map((x) => enter(x, 'Persona voluntària')).filter((x): x is number => Boolean(x));
  if (!ids.length) throw new HttpError(400, 'Cal triar almenys una persona voluntària.');
  const d = dataObligatoria(b.data, 'Data');
  const h = hores(b.hores);
  const activitat = activitatOpcional(b.activitat_id);
  const tasca = text(b.tasca);
  return tx(() =>
    [...new Set(ids)].map((vid) => {
      if (!get('SELECT 1 FROM voluntaris WHERE id = ?', vid)) throw new HttpError(400, 'La persona voluntària indicada no existeix.');
      return run('INSERT INTO hores_voluntariat (voluntari_id, activitat_id, data, hores, tasca) VALUES (?, ?, ?, ?, ?)', vid, activitat, d, h, tasca).id;
    }),
  );
}

const SELECT_HORES = `
  SELECT h.id, h.voluntari_id, v.nom, v.llinatges, h.activitat_id, a.nom AS activitat, h.data, h.hores, h.tasca
    FROM hores_voluntariat h JOIN voluntaris v ON v.id = h.voluntari_id LEFT JOIN activitats a ON a.id = h.activitat_id`;

comunitatRouter.get('/hores', nomesSocis, (req, res) => {
  const e = exerciciParam(req);
  const vid = enter(req.query.voluntari_id, 'Persona voluntària');
  res.json(
    all(
      `${SELECT_HORES} WHERE h.data BETWEEN ? AND ? ${vid ? 'AND h.voluntari_id = ?' : ''} ORDER BY h.data DESC, h.id DESC`,
      `${e}-01-01`, `${e}-12-31`, ...(vid ? [vid] : []),
    ),
  );
});

comunitatRouter.get('/hores/export', nomesSocis, (req, res) => {
  const e = exerciciParam(req);
  const files = all<Record<string, unknown> & { nom: string; llinatges: string; hores: number }>(
    `${SELECT_HORES} WHERE h.data BETWEEN ? AND ? ORDER BY h.data, v.llinatges, v.nom`,
    `${e}-01-01`, `${e}-12-31`,
  ).map((r) => ({ ...r, persona: nomDe(r), data: dma(r.data as string), hores: String(r.hores).replace('.', ',') }));
  registra(req, 'exporta', 'voluntariat', null, `Hores de voluntariat ${e}`);
  sendCsv(
    res,
    `hores-voluntariat-${e}.csv`,
    toCsv(files, columnesTraduides(req, [['data', 'Data'], ['persona', 'Persona voluntària'], ['activitat', 'Activitat'], ['tasca', 'Tasca'], ['hores', 'Hores']])),
  );
});

comunitatRouter.post('/hores', (req, res) => {
  const ids = afegeixHores(req.body ?? {});
  registra(req, 'crea', 'hores_voluntariat', ids[0] ?? null, `${ids.length} registres`);
  res.status(201).json({ ids });
});

comunitatRouter.put('/hores/:id', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM hores_voluntariat WHERE id = ?', id)) notFound();
  const b = req.body ?? {};
  run(
    'UPDATE hores_voluntariat SET data = ?, hores = ?, activitat_id = ?, tasca = ? WHERE id = ?',
    dataObligatoria(b.data, 'Data'), hores(b.hores), activitatOpcional(b.activitat_id), text(b.tasca), id,
  );
  res.json(get(`${SELECT_HORES} WHERE h.id = ?`, id));
});

comunitatRouter.delete('/hores/:id', (req, res) => {
  const id = idParam(req);
  if (!run('DELETE FROM hores_voluntariat WHERE id = ?', id).changes) notFound();
  res.status(204).end();
});

/** Totals anuals de voluntariat (per a la memòria anual i la justificació de subvencions). */
export function resumVoluntariat(exercici: number) {
  const de = `${exercici}-01-01`;
  const fins = `${exercici}-12-31`;
  const { vol_valor_hora_cents: valorHora } = configComunitat();
  const arrodoneix = (n: number) => Math.round(n * 100) / 100;
  const perPersona = all<{ voluntari_id: number; nom: string; llinatges: string; soci: number; hores: number; activitats: number; dies: number }>(
    `SELECT v.id AS voluntari_id, v.nom, v.llinatges, (v.soci_id IS NOT NULL) AS soci, SUM(h.hores) AS hores,
            COUNT(DISTINCT h.activitat_id) AS activitats, COUNT(DISTINCT h.data) AS dies
       FROM hores_voluntariat h JOIN voluntaris v ON v.id = h.voluntari_id
      WHERE h.data BETWEEN ? AND ? GROUP BY v.id ORDER BY hores DESC, v.llinatges, v.nom`,
    de, fins,
  ).map((r) => ({ ...r, hores: arrodoneix(r.hores), valor_cents: Math.round(r.hores * valorHora) }));
  const perActivitat = all<{ activitat_id: number | null; nom: string | null; data_inici: string | null; hores: number; persones: number }>(
    `SELECT h.activitat_id, a.nom, a.data_inici, SUM(h.hores) AS hores, COUNT(DISTINCT h.voluntari_id) AS persones
       FROM hores_voluntariat h LEFT JOIN activitats a ON a.id = h.activitat_id
      WHERE h.data BETWEEN ? AND ? GROUP BY h.activitat_id ORDER BY hores DESC`,
    de, fins,
  ).map((r) => ({ ...r, hores: arrodoneix(r.hores), valor_cents: Math.round(r.hores * valorHora) }));
  const perMes = all<{ mes: string; hores: number }>(
    `SELECT substr(data, 1, 7) AS mes, SUM(hores) AS hores FROM hores_voluntariat WHERE data BETWEEN ? AND ? GROUP BY mes ORDER BY mes`,
    de, fins,
  ).map((r) => ({ ...r, hores: arrodoneix(r.hores) }));
  const total = arrodoneix(perPersona.reduce((s, r) => s + r.hores, 0));
  // Persones actives a final d'any (o avui, si l'any no ha acabat).
  const ref = fins < avui() ? fins : avui();
  const moviments = get<{ actius: number; externs: number; altes: number; baixes: number }>(
    `SELECT (SELECT COUNT(*) FROM voluntaris v WHERE ${ACTIU}) AS actius,
            (SELECT COUNT(*) FROM voluntaris v WHERE v.soci_id IS NULL AND ${ACTIU}) AS externs,
            (SELECT COUNT(*) FROM voluntaris_periodes WHERE data_alta BETWEEN ? AND ?) AS altes,
            (SELECT COUNT(*) FROM voluntaris_periodes WHERE data_baixa BETWEEN ? AND ?) AS baixes`,
    ref, ref, ref, ref, de, fins, de, fins,
  )!;
  return {
    exercici,
    voluntaris_actius: moviments.actius,
    voluntaris_no_socis: moviments.externs,
    altes: moviments.altes,
    baixes: moviments.baixes,
    persones_amb_hores: perPersona.length,
    hores_totals: total,
    valor_hora_cents: valorHora,
    valor_estimat_cents: Math.round(total * valorHora),
    per_persona: perPersona,
    per_activitat: perActivitat,
    per_mes: perMes,
  };
}

comunitatRouter.get('/voluntariat/resum', (req, res) => {
  res.json(resumVoluntariat(exerciciParam(req)));
});

/** Activitats per triar als formularis (hores i col·laboracions). */
comunitatRouter.get('/activitats', (req, res) => {
  const e = req.query.exercici ? exerciciParam(req) : null;
  res.json(
    all(
      `SELECT id, nom, data_inici, data_fi FROM activitats ${e ? "WHERE substr(data_inici, 1, 4) = ?" : ''} ORDER BY data_inici DESC, id DESC`,
      ...(e ? [String(e)] : []),
    ),
  );
});

// ---------- Assegurances ----------

interface Polissa {
  id: number;
  asseguradora: string;
  num_polissa: string | null;
  tipus: string;
  data_inici: string | null;
  data_venciment: string;
  nominativa: number;
  no_renovar: number;
}

export function estatPolissa(p: { data_inici: string | null; data_venciment: string }, ara = avui()) {
  if (p.data_inici && p.data_inici > ara) return 'futura';
  if (p.data_venciment < ara) return 'vencuda';
  if (p.data_venciment <= sumaDies(30, new Date(`${ara}T12:00:00`))) return 'venc_aviat';
  return 'vigent';
}

const COLS_POLISSA =
  'id, asseguradora, num_polissa, tipus, cobertura, data_inici, data_venciment, prima_cents, mediador, contacte, nominativa, no_renovar, document_nom, notes, (document IS NOT NULL) AS te_document';

function polissa(id: number, ambDocument = false) {
  const p = get<Polissa & Record<string, unknown>>(`SELECT ${COLS_POLISSA}${ambDocument ? ', document' : ''} FROM assegurances WHERE id = ?`, id);
  if (!p) notFound();
  const voluntaris = all<{ voluntari_id: number }>('SELECT voluntari_id FROM assegurances_voluntaris WHERE asseguranca_id = ?', id).map((r) => r.voluntari_id);
  return { ...p, estat: estatPolissa(p), voluntaris };
}

comunitatRouter.get('/assegurances', nomesSocis, (_req, res) => {
  const pols = all<Polissa & Record<string, unknown>>(`SELECT ${COLS_POLISSA} FROM assegurances ORDER BY data_venciment DESC, id DESC`);
  const nominals = all<{ a: number; v: number }>('SELECT asseguranca_id AS a, voluntari_id AS v FROM assegurances_voluntaris');
  res.json(pols.map((p) => ({ ...p, estat: estatPolissa(p), voluntaris: nominals.filter((n) => n.a === p.id).map((n) => n.v) })));
});

comunitatRouter.get('/assegurances/:id', nomesSocis, (req, res) => {
  res.json(polissa(idParam(req), true));
});

function desaPolissa(req: Request, idExistent: number | null): number {
  const b = req.body ?? {};
  const d = {
    asseguradora: textObligatori(b.asseguradora, 'Asseguradora'),
    num_polissa: text(b.num_polissa),
    tipus: opcio(b.tipus, TIPUS_ASSEGURANCA, 'Tipus'),
    cobertura: text(b.cobertura),
    data_inici: data(b.data_inici, "Data d'inici"),
    data_venciment: dataObligatoria(b.data_venciment, 'Data de venciment'),
    prima_cents: centsOpcionals(b.prima_cents, 'Prima'),
    mediador: text(b.mediador),
    contacte: text(b.contacte),
    nominativa: bool(b.nominativa),
    no_renovar: bool(b.no_renovar),
    notes: text(b.notes),
  };
  if (d.data_inici && d.data_venciment < d.data_inici) throw new HttpError(400, "La data de venciment no pot ser anterior a la d'inici.");
  const voluntaris = d.nominativa && Array.isArray(b.voluntaris) ? b.voluntaris.map((x: unknown) => enter(x, 'Persona voluntària')).filter(Boolean) : [];
  const canviaDocument = b.document !== undefined;
  const document = canviaDocument ? documentValid(b.document) : null;
  const documentNom = document ? text(b.document_nom) : null;
  return tx(() => {
    const cols = Object.keys(d) as (keyof typeof d)[];
    let id: number;
    if (idExistent === null) {
      id = run(
        `INSERT INTO assegurances (${cols.join(', ')}, document, document_nom) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
        ...cols.map((c) => d[c]), document, documentNom,
      ).id;
    } else {
      id = idExistent;
      if (!get('SELECT 1 FROM assegurances WHERE id = ?', id)) notFound();
      run(`UPDATE assegurances SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => d[c]), id);
      if (canviaDocument) run('UPDATE assegurances SET document = ?, document_nom = ? WHERE id = ?', document, documentNom, id);
      run('DELETE FROM assegurances_voluntaris WHERE asseguranca_id = ?', id);
    }
    for (const v of voluntaris) run('INSERT OR IGNORE INTO assegurances_voluntaris (asseguranca_id, voluntari_id) SELECT ?, id FROM voluntaris WHERE id = ?', id, v);
    return id;
  });
}

comunitatRouter.post('/assegurances', (req, res) => {
  const id = desaPolissa(req, null);
  registra(req, 'crea', 'assegurança', id);
  res.status(201).json(polissa(id));
});

comunitatRouter.put('/assegurances/:id', (req, res) => {
  const id = desaPolissa(req, idParam(req));
  registra(req, 'modifica', 'assegurança', id);
  res.json(polissa(id));
});

comunitatRouter.delete('/assegurances/:id', (req, res) => {
  const id = idParam(req);
  if (!run('DELETE FROM assegurances WHERE id = ?', id).changes) notFound();
  registra(req, 'elimina', 'assegurança', id);
  res.status(204).end();
});

// ---------- Entitats col·laboradores ----------

const RESUM_ENTITAT = `
  (SELECT COUNT(*) FROM activitats_entitats ae WHERE ae.entitat_id = e.id) AS activitats,
  (SELECT MAX(a.data_inici) FROM activitats_entitats ae JOIN activitats a ON a.id = ae.activitat_id WHERE ae.entitat_id = e.id) AS darrera_activitat,
  (SELECT COUNT(*) FROM convenis c WHERE c.entitat_id = e.id) AS convenis,
  (SELECT COUNT(*) FROM convenis c WHERE c.entitat_id = e.id AND c.estat = 'vigent') AS convenis_vigents,
  (SELECT COALESCE(SUM(c.import_cents), 0) FROM convenis c WHERE c.entitat_id = e.id AND c.estat <> 'esborrany') AS aportacions_cents`;

export function llistaEntitats() {
  return all(`SELECT e.*, ${RESUM_ENTITAT} FROM entitats_collaboradores e ORDER BY e.actiu DESC, e.nom`);
}

export function fitxaEntitat(id: number) {
  const e = get(`SELECT e.*, ${RESUM_ENTITAT} FROM entitats_collaboradores e WHERE e.id = ?`, id);
  if (!e) notFound();
  const convenis = all(`SELECT ${COLS_CONVENI} FROM convenis c WHERE c.entitat_id = ? ORDER BY COALESCE(c.data_inici, c.data_signatura) DESC, c.id DESC`, id);
  const activitats = all(
    `SELECT ae.activitat_id, a.nom, a.data_inici, ae.rol, ae.notes
       FROM activitats_entitats ae JOIN activitats a ON a.id = ae.activitat_id
      WHERE ae.entitat_id = ? ORDER BY a.data_inici DESC`,
    id,
  );
  const perAny = all(
    `SELECT substr(a.data_inici, 1, 4) AS any, COUNT(*) AS activitats
       FROM activitats_entitats ae JOIN activitats a ON a.id = ae.activitat_id
      WHERE ae.entitat_id = ? GROUP BY any ORDER BY any DESC`,
    id,
  );
  return { ...e, llista_convenis: convenis, llista_activitats: activitats, per_any: perAny };
}

comunitatRouter.get('/entitats', (_req, res) => {
  res.json(llistaEntitats());
});

comunitatRouter.get('/entitats/:id', (req, res) => {
  res.json(fitxaEntitat(idParam(req)));
});

function llegeixEntitat(b: Record<string, unknown>) {
  return {
    nom: textObligatori(b.nom, 'Nom'),
    tipus: opcio(b.tipus, TIPUS_ENTITAT, 'Tipus', 'entitat'),
    nif: text(b.nif)?.toUpperCase() ?? null,
    persona_contacte: text(b.persona_contacte),
    carrec: text(b.carrec),
    email: text(b.email),
    telefon: text(b.telefon),
    adreca: text(b.adreca),
    web: text(b.web),
    notes: text(b.notes),
    actiu: b.actiu === undefined ? 1 : bool(b.actiu),
  };
}

export function creaEntitat(b: Record<string, unknown>): number {
  const d = llegeixEntitat(b);
  const cols = Object.keys(d) as (keyof typeof d)[];
  return run(`INSERT INTO entitats_collaboradores (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, ...cols.map((c) => d[c])).id;
}

comunitatRouter.post('/entitats', (req, res) => {
  const id = creaEntitat(req.body ?? {});
  registra(req, 'crea', 'entitat_collaboradora', id);
  res.status(201).json(fitxaEntitat(id));
});

comunitatRouter.put('/entitats/:id', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM entitats_collaboradores WHERE id = ?', id)) notFound();
  const d = llegeixEntitat(req.body ?? {});
  const cols = Object.keys(d) as (keyof typeof d)[];
  run(`UPDATE entitats_collaboradores SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => d[c]), id);
  registra(req, 'modifica', 'entitat_collaboradora', id);
  res.json(fitxaEntitat(id));
});

comunitatRouter.delete('/entitats/:id', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM entitats_collaboradores WHERE id = ?', id)) notFound();
  if (get('SELECT 1 FROM convenis WHERE entitat_id = ?', id))
    throw new HttpError(409, "No es pot eliminar una entitat amb convenis: elimina'ls abans o marca-la com a inactiva.");
  run('DELETE FROM entitats_collaboradores WHERE id = ?', id);
  registra(req, 'elimina', 'entitat_collaboradora', id);
  res.status(204).end();
});

// ---------- Col·laboracions a les activitats ----------

export function vinculaActivitat(entitatId: number, activitatId: number, rol: unknown, notes: unknown) {
  if (!get('SELECT 1 FROM entitats_collaboradores WHERE id = ?', entitatId)) notFound();
  if (!get('SELECT 1 FROM activitats WHERE id = ?', activitatId)) throw new HttpError(400, "L'activitat indicada no existeix.");
  run(
    `INSERT INTO activitats_entitats (activitat_id, entitat_id, rol, notes) VALUES (?, ?, ?, ?)
     ON CONFLICT (activitat_id, entitat_id) DO UPDATE SET rol = excluded.rol, notes = excluded.notes`,
    activitatId, entitatId, opcio(rol, ROLS_ACTIVITAT, 'Rol', 'collaborador'), text(notes),
  );
}

export function entitatsActivitat(activitatId: number) {
  return all(
    `SELECT ae.entitat_id, e.nom, e.tipus, ae.rol, ae.notes
       FROM activitats_entitats ae JOIN entitats_collaboradores e ON e.id = ae.entitat_id
      WHERE ae.activitat_id = ? ORDER BY e.nom`,
    activitatId,
  );
}

comunitatRouter.post('/entitats/:id/activitats', (req, res) => {
  const id = idParam(req);
  const activitat = enter(req.body?.activitat_id, 'Activitat');
  if (!activitat) throw new HttpError(400, 'El camp «Activitat» és obligatori.');
  vinculaActivitat(id, activitat, req.body?.rol, req.body?.notes);
  res.status(201).json(fitxaEntitat(id));
});

comunitatRouter.delete('/entitats/:id/activitats/:activitat', (req, res) => {
  const id = idParam(req);
  const activitat = Number(req.params.activitat);
  run('DELETE FROM activitats_entitats WHERE entitat_id = ? AND activitat_id = ?', id, activitat);
  res.json(fitxaEntitat(id));
});

/** Entitats que col·laboren en una activitat (per al formulari de l'activitat). */
comunitatRouter.get('/activitats/:id/entitats', (req, res) => {
  res.json(entitatsActivitat(idParam(req)));
});

/** Substitueix les col·laboracions d'una activitat: [{ entitat_id, rol, notes }]. */
comunitatRouter.put('/activitats/:id/entitats', (req, res) => {
  const activitat = idParam(req);
  if (!get('SELECT 1 FROM activitats WHERE id = ?', activitat)) notFound();
  const llista = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.entitats) ? req.body.entitats : [];
  tx(() => {
    run('DELETE FROM activitats_entitats WHERE activitat_id = ?', activitat);
    for (const x of llista as Record<string, unknown>[]) {
      const e = enter(x.entitat_id, 'Entitat');
      if (e) vinculaActivitat(e, activitat, x.rol, x.notes);
    }
  });
  res.json(entitatsActivitat(activitat));
});

// ---------- Convenis ----------

const COLS_CONVENI = `c.id, c.entitat_id, c.titol, c.objecte, c.data_signatura, c.data_inici, c.data_fi, c.renovacio_automatica,
  c.import_cents, c.obligacions, c.estat, c.notes, c.document_nom, (c.document IS NOT NULL) AS te_document`;

function conveni(id: number, ambDocument = false) {
  const c = get(
    `SELECT ${COLS_CONVENI}${ambDocument ? ', c.document' : ''}, e.nom AS entitat FROM convenis c JOIN entitats_collaboradores e ON e.id = c.entitat_id WHERE c.id = ?`,
    id,
  );
  if (!c) notFound();
  return c;
}

comunitatRouter.get('/convenis', (_req, res) => {
  res.json(
    all(
      `SELECT ${COLS_CONVENI}, e.nom AS entitat FROM convenis c JOIN entitats_collaboradores e ON e.id = c.entitat_id
        ORDER BY CASE c.estat WHEN 'vigent' THEN 0 WHEN 'esborrany' THEN 1 ELSE 2 END, c.data_fi IS NULL, c.data_fi, c.id DESC`,
    ),
  );
});

comunitatRouter.get('/convenis/:id', (req, res) => {
  res.json(conveni(idParam(req), true));
});

export function desaConveni(b: Record<string, unknown>, id: number | null): number {
  const entitat = enter(b.entitat_id, 'Entitat');
  if (!entitat || !get('SELECT 1 FROM entitats_collaboradores WHERE id = ?', entitat)) throw new HttpError(400, "L'entitat indicada no existeix.");
  const d = {
    entitat_id: entitat,
    titol: textObligatori(b.titol, 'Títol'),
    objecte: text(b.objecte),
    data_signatura: data(b.data_signatura, 'Data de signatura'),
    data_inici: data(b.data_inici, "Data d'inici"),
    data_fi: data(b.data_fi, 'Data de finalització'),
    renovacio_automatica: bool(b.renovacio_automatica),
    import_cents: centsOpcionals(b.import_cents, 'Aportació'),
    obligacions: text(b.obligacions),
    estat: opcio(b.estat, ESTATS_CONVENI, 'Estat', 'esborrany'),
    notes: text(b.notes),
  };
  if (d.data_inici && d.data_fi && d.data_fi < d.data_inici) throw new HttpError(400, "La data de finalització no pot ser anterior a la d'inici.");
  const canviaDocument = b.document !== undefined;
  const document = canviaDocument ? documentValid(b.document) : null;
  const documentNom = document ? text(b.document_nom) : null;
  const cols = Object.keys(d) as (keyof typeof d)[];
  if (id === null)
    return run(
      `INSERT INTO convenis (${cols.join(', ')}, document, document_nom) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
      ...cols.map((c) => d[c]), document, documentNom,
    ).id;
  if (!get('SELECT 1 FROM convenis WHERE id = ?', id)) notFound();
  tx(() => {
    run(`UPDATE convenis SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => d[c]), id);
    if (canviaDocument) run('UPDATE convenis SET document = ?, document_nom = ? WHERE id = ?', document, documentNom, id);
  });
  return id;
}

comunitatRouter.post('/convenis', (req, res) => {
  const id = desaConveni(req.body ?? {}, null);
  registra(req, 'crea', 'conveni', id);
  res.status(201).json(conveni(id));
});

comunitatRouter.put('/convenis/:id', (req, res) => {
  const id = desaConveni(req.body ?? {}, idParam(req));
  registra(req, 'modifica', 'conveni', id);
  res.json(conveni(id));
});

comunitatRouter.delete('/convenis/:id', (req, res) => {
  const id = idParam(req);
  if (!run('DELETE FROM convenis WHERE id = ?', id).changes) notFound();
  registra(req, 'elimina', 'conveni', id);
  res.status(204).end();
});
