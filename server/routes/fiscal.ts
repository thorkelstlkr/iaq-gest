// Mòdul «fiscal»: tercers (proveïdors, professionals, arrendadors), retencions d'IRPF dels pagaments
// (models 111, 115, 180 i 190), operacions amb tercers (model 347) i extractes bancaris (CSV i Norma 43)
// amb la conciliació amb els moviments.
import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import {
  HttpError, columnesTraduides, dataObligatoria, enter, exerciciParam, idParam, notFound, sendCsv, text, textObligatori, toCsv,
} from '../util.ts';
import { registra } from '../auditoria.ts';
import { ibanValid, netejaIban } from '../../shared/iban.ts';

export const fiscalRouter = Router();

// =====================================================================
// Validacions
// =====================================================================

const LLETRES_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Cert si és un NIF espanyol vàlid: DNI, NIE, NIF K/L/M o NIF de persona jurídica (antic CIF). */
export function nifValid(nif: string): boolean {
  const n = nif.replace(/[\s.-]/g, '').toUpperCase();
  // DNI (8 xifres + lletra) i NIE (X/Y/Z + 7 xifres + lletra).
  let m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(n);
  if (m) {
    if (m[1] && m[2].length !== 7) return false;
    if (!m[1] && m[2].length !== 8) return false;
    const prefix = ({ X: '0', Y: '1', Z: '2' } as Record<string, string>)[m[1]] ?? '';
    const num = Number(prefix + m[2]);
    return LLETRES_DNI[num % 23] === m[3];
  }
  // NIF de persones físiques sense DNI (K, L, M): com el DNI amb les 7 xifres.
  m = /^([KLM])(\d{7})([A-Z])$/.exec(n);
  if (m) return LLETRES_DNI[Number(m[2]) % 23] === m[3];
  // Persones jurídiques i entitats: lletra + 7 xifres + caràcter de control (xifra o lletra).
  m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(n);
  if (!m) return false;
  const d = m[2].split('').map(Number);
  let suma = 0;
  d.forEach((x, i) => {
    if (i % 2 === 1) suma += x;
    else {
      const doble = x * 2;
      suma += Math.floor(doble / 10) + (doble % 10);
    }
  });
  const control = (10 - (suma % 10)) % 10;
  const lletra = 'JABCDEFGHI'[control];
  if ('KPQRSNW'.includes(m[1])) return m[3] === lletra; // sempre lletra
  if ('ABEH'.includes(m[1])) return m[3] === String(control); // sempre xifra
  return m[3] === lletra || m[3] === String(control);
}

/** NIF normalitzat (sense espais ni guions, en majúscules). Per als tercers espanyols, es valida. */
export function validaNif(nif: string | null, pais = 'ES'): string | null {
  if (!nif) return null;
  const n = nif.replace(/[\s.-]/g, '').toUpperCase();
  if (pais === 'ES' && !nifValid(n)) throw new HttpError(400, 'El NIF «{0}» no és vàlid: revisa les xifres i la lletra de control.'.replace('{0}', n));
  return n;
}

/** Tipus de persona més probable segons el NIF: els que comencen per lletra (llevat de NIE i K/L/M) són jurídiques. */
export const tipusPersonaDeNif = (nif: string | null): 'fisica' | 'juridica' =>
  nif && /^[ABCDEFGHJNPQRSUVW]/.test(nif) ? 'juridica' : 'fisica';

/** Codi de província (01–52) a partir d'un codi postal espanyol; null si no ho és. */
export function provinciaDeCp(cp: string | null | undefined, pais = 'ES'): string | null {
  if (!cp || pais !== 'ES') return null;
  const net = cp.replace(/\s/g, '');
  if (!/^\d{5}$/.test(net)) return null;
  const p = Number(net.slice(0, 2));
  return p >= 1 && p <= 52 ? net.slice(0, 2) : null;
}

// =====================================================================
// Lectura d'imports i dates dels extractes
// =====================================================================

/** Import escrit pel banc → cèntims amb signe. Accepta «1.234,56», «-12,50», «12,50-», «(12,50)», «1,234.56», «12.5 €». */
export function llegeixImport(v: string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).replace(/[\s €]/g, '').replace(/EUR$/i, '');
  if (!s) return null;
  let negatiu = false;
  if (/^\(.*\)$/.test(s)) {
    negatiu = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    negatiu = !negatiu;
    s = s.slice(0, -1);
  } else if (s.endsWith('+')) s = s.slice(0, -1);
  if (s.startsWith('-')) {
    negatiu = !negatiu;
    s = s.slice(1);
  } else if (s.startsWith('+')) s = s.slice(1);
  const coma = s.lastIndexOf(',');
  const punt = s.lastIndexOf('.');
  if (coma >= 0 && punt >= 0) {
    // El separador que va darrere és el decimal.
    s = coma > punt ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma >= 0) {
    s = /^\d{1,3}(,\d{3}){2,}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (punt >= 0) {
    // Un punt amb tres xifres darrere és de milers (format espanyol: «1.234»).
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return negatiu ? -cents : cents;
}

const dataValida = (a: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(a, m, 0).getDate();
};

/** Data de l'extracte → AAAA-MM-DD. Accepta dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa, aaaa-mm-dd i aaaammdd. */
export function llegeixData(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  let a: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(s);
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?: .*)?$/.exec(s))) {
    [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
    if (r[3].length === 2) a += a > 79 ? 1900 : 2000;
  } else if ((r = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else return null;
  if (!dataValida(a, m, d)) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// =====================================================================
// Norma 43 (AEB, Cuaderno 43): registres de 80 posicions
// =====================================================================
//   11 Capçalera de compte: entitat 3-6, oficina 7-10, compte 11-20, data inicial 21-26 (AAMMDD), data final 27-32,
//      clau deure/haver del saldo inicial 33 (1 = deutor, 2 = creditor), saldo inicial 34-47 (12 enters + 2 decimals),
//      divisa 48-50, modalitat 51, nom abreujat 52-77.
//   22 Moviment: oficina d'origen 7-10, data d'operació 11-16 (AAMMDD), data valor 17-22, concepte comú 23-24,
//      concepte propi 25-27, clau deure/haver 28 (1 = càrrec, 2 = abonament), import 29-42, núm. de document 43-52,
//      referència 1 53-64, referència 2 65-80.
//   23 Complementari de concepte: codi de dada 3-4, concepte 5-42 i 43-80 (fins a 5 per moviment).
//   24 Equivalència de divisa (s'ignora).
//   33 Final de compte: apunts deure 21-25, total deure 26-39, apunts haver 40-44, total haver 45-58,
//      clau del saldo final 59, saldo final 60-73, divisa 74-76.
//   88 Final de fitxer: nombre de registres 21-25.

/** Conceptes comuns AEB (posicions 23-24 del registre 22), per quan el banc no envia text. */
const CONCEPTES_COMUNS: Record<string, string> = {
  '01': 'Talons - reintegraments',
  '02': 'Ingressos - abonaments',
  '03': 'Rebuts domiciliats - pagaments',
  '04': 'Transferències - traspassos',
  '05': 'Amortitzacions de préstecs',
  '06': 'Remeses d’efectes',
  '07': 'Subscripcions - dividends',
  '08': 'Xecs - despeses - interessos',
  '09': 'Operacions de borsa',
  '10': 'Combustible',
  '11': 'Caixers automàtics',
  '12': 'Targetes',
  '13': 'Operacions amb l’estranger',
  '14': 'Devolucions i impagats',
  '15': 'Nòmines - assegurances socials',
  '16': 'Timbres - corretatge - pòlissa',
  '17': 'Interessos - comissions - custòdia',
  '98': 'Anul·lacions - correccions',
  '99': 'Diversos',
};

export interface LiniaExtracte {
  data: string;
  data_valor: string | null;
  concepte: string;
  import_cents: number;
  saldo_cents: number | null;
  referencia: string | null;
}

export interface CompteN43 {
  entitat: string;
  oficina: string;
  compte: string;
  data_inici: string | null;
  data_fi: string | null;
  saldo_inicial_cents: number;
  saldo_final_cents: number | null;
  divisa: string;
  nom: string;
  linies: LiniaExtracte[];
  avisos: string[];
}

const dataN43 = (s: string) => {
  if (!/^\d{6}$/.test(s)) return null;
  const a = Number(s.slice(0, 2));
  return llegeixData(`${a > 79 ? 1900 + a : 2000 + a}${s.slice(2)}`);
};
const importN43 = (s: string) => (/^\d{14}$/.test(s) ? Number(s) : null);
const senseZeros = (s: string) => (/^0*$/.test(s.trim()) ? '' : s.trim());

/** Llegeix un fitxer Norma 43. Llança HttpError si l'estructura no és vàlida. */
export function llegeixN43(contingut: string): CompteN43[] {
  const registres = contingut.split(/\r?\n|\r/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '');
  if (!registres.length) throw new HttpError(400, 'El fitxer és buit.');
  const comptes: CompteN43[] = [];
  let actual: CompteN43 | null = null;
  let ultima: (LiniaExtracte & { complements: string[]; comu: string; ref2: string }) | null = null;
  let saldo = 0;
  const tancaLinia = () => {
    if (!ultima || !actual) return;
    const textComplements = ultima.complements.join(' ').replace(/\s+/g, ' ').trim();
    ultima.concepte = textComplements || ultima.ref2 || CONCEPTES_COMUNS[ultima.comu] || 'Moviment';
    const { complements: _c, comu: _m, ref2: _r, ...linia } = ultima;
    actual.linies.push(linia);
    ultima = null;
  };
  registres.forEach((brut, i) => {
    const r = brut.padEnd(80, ' ');
    const camp = (des: number, fins: number) => r.slice(des - 1, fins);
    const codi = camp(1, 2);
    const fila = i + 1;
    if (codi === '11') {
      tancaLinia();
      const clau = camp(33, 33);
      const imp = importN43(camp(34, 47));
      if (imp === null) throw new HttpError(400, 'Norma 43: el saldo inicial de la línia {0} no és vàlid.'.replace('{0}', String(fila)));
      saldo = clau === '1' ? -imp : imp;
      actual = {
        entitat: camp(3, 6), oficina: camp(7, 10), compte: camp(11, 20),
        data_inici: dataN43(camp(21, 26)), data_fi: dataN43(camp(27, 32)),
        saldo_inicial_cents: saldo, saldo_final_cents: null, divisa: camp(48, 50), nom: camp(52, 77).trim(),
        linies: [], avisos: [],
      };
      comptes.push(actual);
    } else if (codi === '22') {
      tancaLinia();
      if (!actual) throw new HttpError(400, 'Norma 43: hi ha un moviment (línia {0}) abans de la capçalera del compte.'.replace('{0}', String(fila)));
      const data = dataN43(camp(11, 16));
      const imp = importN43(camp(29, 42));
      const clau = camp(28, 28);
      if (!data || imp === null || (clau !== '1' && clau !== '2'))
        throw new HttpError(400, 'Norma 43: el moviment de la línia {0} no és vàlid.'.replace('{0}', String(fila)));
      const import_cents = clau === '1' ? -imp : imp;
      saldo += import_cents;
      const ref1 = senseZeros(camp(53, 64));
      const doc = senseZeros(camp(43, 52));
      ultima = {
        data, data_valor: dataN43(camp(17, 22)), concepte: '', import_cents, saldo_cents: saldo,
        referencia: [doc, ref1].filter(Boolean).join(' / ') || null,
        complements: [], comu: camp(23, 24), ref2: senseZeros(camp(65, 80)),
      };
    } else if (codi === '23') {
      if (ultima) ultima.complements.push(camp(5, 42).trim(), camp(43, 80).trim());
    } else if (codi === '33') {
      tancaLinia();
      if (!actual) return;
      const c: CompteN43 = actual;
      const nDeure = Number(camp(21, 25));
      const tDeure = importN43(camp(26, 39));
      const nHaver = Number(camp(40, 44));
      const tHaver = importN43(camp(45, 58));
      const fin = importN43(camp(60, 73));
      if (fin !== null) c.saldo_final_cents = camp(59, 59) === '1' ? -fin : fin;
      const deure = c.linies.filter((l) => l.import_cents < 0);
      const haver = c.linies.filter((l) => l.import_cents > 0);
      const suma = (ls: LiniaExtracte[]) => ls.reduce((s, l) => s + Math.abs(l.import_cents), 0);
      if (nDeure !== deure.length || nHaver !== haver.length || tDeure !== suma(deure) || tHaver !== suma(haver))
        c.avisos.push('Els totals del registre final del compte no coincideixen amb els moviments llegits.');
      if (c.saldo_final_cents !== null && c.saldo_final_cents !== saldo)
        c.avisos.push('El saldo final del fitxer no coincideix amb el saldo inicial més els moviments.');
      actual = null;
    } else if (codi === '88') {
      tancaLinia();
    }
    // 24 (divisa) i altres codis: s'ignoren.
  });
  tancaLinia();
  if (!comptes.length) throw new HttpError(400, 'El fitxer no sembla Norma 43: no hi ha cap capçalera de compte (registre 11).');
  return comptes;
}

/** Entitat, oficina i número de compte (CCC sense dígits de control) d'un IBAN espanyol. */
export function cccDeIban(iban: string | null): { entitat: string; oficina: string; compte: string } | null {
  if (!iban) return null;
  const i = netejaIban(iban);
  if (!/^ES\d{22}$/.test(i)) return null;
  return { entitat: i.slice(4, 8), oficina: i.slice(8, 12), compte: i.slice(14, 24) };
}

// =====================================================================
// CSV dels extractes: files ja separades a la interfície + associació de columnes
// =====================================================================

export interface MapaCsv {
  data: number;
  data_valor?: number;
  concepte: number;
  import?: number;
  carrec?: number;
  abonament?: number;
  saldo?: number;
  referencia?: number;
}

export interface FilaLlegida {
  fila: number;
  linia: LiniaExtracte | null;
  /** Text en català amb {0} (la interfície el tradueix amb el valor). */
  error: string | null;
  valor?: string;
}

const col = (f: string[], i: number | undefined) => (i !== undefined && i !== null && i >= 0 ? (f[i] ?? '').trim() : '');

/** Converteix les files del CSV en línies d'extracte segons l'associació de columnes. */
export function llegeixFilesCsv(files: string[][], mapa: MapaCsv, primeraFila = 1): FilaLlegida[] {
  const usaImport = mapa.import !== undefined && mapa.import >= 0;
  const usaCarrec = (mapa.carrec ?? -1) >= 0 || (mapa.abonament ?? -1) >= 0;
  if (!(mapa.data >= 0)) throw new HttpError(400, 'Cal indicar la columna de la data.');
  if (!usaImport && !usaCarrec) throw new HttpError(400, "Cal indicar la columna de l'import o les de càrrecs i abonaments.");
  return files.map((f, i) => {
    const fila = i + primeraFila;
    const data = llegeixData(col(f, mapa.data));
    if (!data) return { fila, linia: null, error: 'Data no vàlida: «{0}».', valor: col(f, mapa.data) };
    let import_cents: number | null;
    if (usaImport) import_cents = llegeixImport(col(f, mapa.import));
    else {
      const c = llegeixImport(col(f, mapa.carrec));
      const a = llegeixImport(col(f, mapa.abonament));
      import_cents = c === null && a === null ? null : (a ? Math.abs(a) : 0) - (c ? Math.abs(c) : 0);
    }
    if (import_cents === null || import_cents === 0)
      return { fila, linia: null, error: 'Import no vàlid o zero.' };
    const saldoText = col(f, mapa.saldo);
    const saldo_cents = saldoText ? llegeixImport(saldoText) : null;
    if (saldoText && saldo_cents === null) return { fila, linia: null, error: 'Saldo no vàlid: «{0}».', valor: saldoText };
    const dv = col(f, mapa.data_valor);
    return {
      fila,
      error: null,
      linia: {
        data,
        data_valor: dv ? llegeixData(dv) : null,
        concepte: col(f, mapa.concepte).replace(/\s+/g, ' ') || 'Moviment',
        import_cents,
        saldo_cents,
        referencia: col(f, mapa.referencia) || null,
      },
    };
  });
}

/** Empremta de cada línia (compte, data, import, saldo, concepte, referència i ordre entre les idèntiques). */
export function empremtes(compteId: number, linies: LiniaExtracte[]): string[] {
  const vistes = new Map<string, number>();
  return linies.map((l) => {
    const base = [compteId, l.data, l.import_cents, l.saldo_cents ?? '', l.concepte.toLowerCase(), l.referencia ?? ''].join('|');
    const n = (vistes.get(base) ?? 0) + 1;
    vistes.set(base, n);
    return `${base}|${n}`;
  });
}

// =====================================================================
// Trimestres i terminis
// =====================================================================

export const LLINDAR_347 = 300506; // 3.005,06 €

export const trimestreDe = (data: string) => Math.floor((Number(data.slice(5, 7)) - 1) / 3) + 1;

export function limitsTrimestre(exercici: number, t: number): [string, string] {
  const mesInici = (t - 1) * 3 + 1;
  const mesFi = mesInici + 2;
  const p = (n: number) => String(n).padStart(2, '0');
  return [`${exercici}-${p(mesInici)}-01`, `${exercici}-${p(mesFi)}-${new Date(exercici, mesFi, 0).getDate()}`];
}

/** Termini de presentació dels models trimestrals 111 i 115 (si cau en festiu, s'allarga al dia hàbil següent). */
export const terminiTrimestral = (exercici: number, t: number) =>
  t === 4 ? `${exercici + 1}-01-30` : `${exercici}-${['04', '07', '10'][t - 1]}-20`;

export type ModelTrimestral = '111' | '115';
const TIPUS_MODEL: Record<ModelTrimestral, string> = {
  '111': "mf.tipus_retencio IN ('professional','altres')",
  '115': "mf.tipus_retencio = 'arrendament'",
};

/** Claus del model 190 que són rendiments del treball (la resta, d'activitats econòmiques). */
const esClauTreball = (clau: string | null) => /^[ABCDEF]/.test(clau ?? '');

export interface ResumTrimestre {
  trimestre: number;
  des: string;
  fins: string;
  termini: string;
  perceptors: number;
  base_cents: number;
  retencio_cents: number;
  treball: { perceptors: number; base_cents: number; retencio_cents: number };
  activitats: { perceptors: number; base_cents: number; retencio_cents: number };
  pagament: { moviment_id: number; data: string; import_cents: number } | null;
}

interface FilaRetencio {
  moviment_id: number;
  data: string;
  import_cents: number;
  concepte: string;
  tercer_id: number | null;
  tercer_nom: string | null;
  nif: string | null;
  codi_provincia: string | null;
  base_cents: number;
  retencio_pct: number;
  retencio_cents: number;
  tipus_retencio: string;
  clau_190: string | null;
}

function retencions(model: ModelTrimestral, des: string, fins: string) {
  return all<FilaRetencio>(
    `SELECT m.id AS moviment_id, m.data, m.import_cents, m.concepte, mf.tercer_id, t.nom AS tercer_nom, t.nif, t.codi_provincia,
            mf.base_cents, mf.retencio_pct, mf.retencio_cents, mf.tipus_retencio, mf.clau_190
       FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id LEFT JOIN tercers t ON t.id = mf.tercer_id
      WHERE ${TIPUS_MODEL[model]} AND m.tipus = 'despesa' AND m.data BETWEEN ? AND ?
      ORDER BY m.data, m.id`,
    des, fins,
  );
}

const agrega = (files: FilaRetencio[]) => ({
  perceptors: new Set(files.map((f) => f.tercer_id ?? `m${f.moviment_id}`)).size,
  base_cents: files.reduce((s, f) => s + f.base_cents, 0),
  retencio_cents: files.reduce((s, f) => s + f.retencio_cents, 0),
});

export function resumTrimestral(model: ModelTrimestral, exercici: number): ResumTrimestre[] {
  return [1, 2, 3, 4].map((t) => {
    const [des, fins] = limitsTrimestre(exercici, t);
    const files = retencions(model, des, fins);
    const pagament = get<{ moviment_id: number; data: string; import_cents: number }>(
      `SELECT p.moviment_id, m.data, m.import_cents FROM fiscal_pagaments p JOIN moviments m ON m.id = p.moviment_id
        WHERE p.model = ? AND p.exercici = ? AND p.trimestre = ?`,
      model, exercici, t,
    ) ?? null;
    return {
      trimestre: t, des, fins, termini: terminiTrimestral(exercici, t),
      ...agrega(files),
      treball: agrega(files.filter((f) => esClauTreball(f.clau_190))),
      activitats: agrega(files.filter((f) => !esClauTreball(f.clau_190))),
      pagament,
    };
  });
}

/** Resum anual per perceptor (model 190 per al 111; model 180 per al 115). */
export function resumAnual(model: ModelTrimestral, exercici: number) {
  const files = retencions(model, `${exercici}-01-01`, `${exercici}-12-31`);
  const grups = new Map<string, { tercer_id: number | null; nom: string; nif: string | null; codi_provincia: string | null; clau: string | null; pagaments: number; base_cents: number; retencio_cents: number; retencio_pct: number }>();
  for (const f of files) {
    const clau = model === '111' ? f.clau_190 : null;
    const k = `${f.tercer_id ?? 'm' + f.moviment_id}|${clau ?? ''}`;
    const g = grups.get(k) ?? {
      tercer_id: f.tercer_id, nom: f.tercer_nom ?? f.concepte, nif: f.nif, codi_provincia: f.codi_provincia,
      clau, pagaments: 0, base_cents: 0, retencio_cents: 0, retencio_pct: f.retencio_pct,
    };
    g.pagaments++;
    g.base_cents += f.base_cents;
    g.retencio_cents += f.retencio_cents;
    grups.set(k, g);
  }
  return [...grups.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}

export interface Fila347 {
  tercer_id: number;
  nom: string;
  nif: string | null;
  codi_provincia: string | null;
  pais: string;
  clau: 'A' | 'B';
  t1_cents: number;
  t2_cents: number;
  t3_cents: number;
  t4_cents: number;
  total_cents: number;
  supera: boolean;
}

/**
 * Model 347: per tercer i clau, A = compres i despeses (moviments de despesa amb el tercer, excloses les
 * operacions subjectes a retenció, que ja es declaren als models 190 i 180) i B = vendes (factures emeses
 * als clients vinculats al tercer). Només es declaren els que superen 3.005,06 € l'any.
 */
export function model347(exercici: number): Fila347[] {
  const files = all<{ tercer_id: number; clau: 'A' | 'B'; trimestre: number; s: number }>(
    `SELECT mf.tercer_id, 'A' AS clau, (CAST(substr(m.data, 6, 2) AS INTEGER) + 2) / 3 AS trimestre, SUM(m.import_cents) AS s
       FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id
      WHERE mf.tercer_id IS NOT NULL AND mf.tipus_retencio IS NULL AND m.tipus = 'despesa' AND substr(m.data, 1, 4) = ?
      GROUP BY mf.tercer_id, trimestre
     UNION ALL
     SELECT t.id, 'B', (CAST(substr(f.data_expedicio, 6, 2) AS INTEGER) + 2) / 3, SUM(f.total_cents)
       FROM factures f JOIN tercers t ON t.client_id = f.client_id
      WHERE f.estat = 'emesa' AND substr(f.data_expedicio, 1, 4) = ?
      GROUP BY t.id, 3`,
    String(exercici), String(exercici),
  );
  const tercers = new Map(
    all<{ id: number; nom: string; nif: string | null; codi_provincia: string | null; pais: string }>(
      'SELECT id, nom, nif, codi_provincia, pais FROM tercers',
    ).map((t) => [t.id, t]),
  );
  const grups = new Map<string, Fila347>();
  for (const f of files) {
    const t = tercers.get(f.tercer_id);
    if (!t) continue;
    const k = `${f.tercer_id}|${f.clau}`;
    const g = grups.get(k) ?? {
      tercer_id: t.id, nom: t.nom, nif: t.nif, codi_provincia: t.codi_provincia, pais: t.pais, clau: f.clau,
      t1_cents: 0, t2_cents: 0, t3_cents: 0, t4_cents: 0, total_cents: 0, supera: false,
    };
    const camp = `t${f.trimestre}_cents` as 't1_cents';
    g[camp] += f.s;
    g.total_cents += f.s;
    grups.set(k, g);
  }
  return [...grups.values()]
    .map((g) => ({ ...g, supera: g.total_cents > LLINDAR_347 }))
    .sort((a, b) => b.total_cents - a.total_cents);
}

// =====================================================================
// Tercers
// =====================================================================

function dadesTercer(body: Record<string, unknown>, id: number | null) {
  const pais = (text(body.pais) ?? 'ES').toUpperCase();
  if (!/^[A-Z]{2}$/.test(pais)) throw new HttpError(400, 'El país ha de ser un codi de dues lletres (ES, FR…).');
  const nif = validaNif(text(body.nif), pais);
  const codi_postal = text(body.codi_postal);
  if (pais === 'ES' && codi_postal && !provinciaDeCp(codi_postal)) throw new HttpError(400, 'El codi postal no és vàlid.');
  const tipus = text(body.tipus_persona) ?? tipusPersonaDeNif(nif);
  if (tipus !== 'fisica' && tipus !== 'juridica') throw new HttpError(400, 'Tipus de persona no vàlid.');
  const ibanText = text(body.iban);
  if (ibanText && !ibanValid(ibanText)) throw new HttpError(400, "L'IBAN no és vàlid: revisa'n els dígits (el codi de control no quadra).");
  const client_id = enter(body.client_id, 'Client');
  if (client_id !== null) {
    if (!get('SELECT 1 AS x FROM clients WHERE id = ?', client_id)) throw new HttpError(400, 'El client de facturació no existeix.');
    if (get('SELECT 1 AS x FROM tercers WHERE client_id = ? AND id IS NOT ?', client_id, id))
      throw new HttpError(409, 'Aquest client de facturació ja està vinculat a un altre tercer.');
  }
  if (nif && get('SELECT 1 AS x FROM tercers WHERE nif = ? AND id IS NOT ?', nif, id))
    throw new HttpError(409, 'Ja hi ha un tercer amb el NIF {0}.'.replace('{0}', nif));
  return {
    nom: textObligatori(body.nom, 'Nom'),
    nif,
    tipus_persona: tipus,
    adreca: text(body.adreca),
    codi_postal,
    poblacio: text(body.poblacio),
    codi_provincia: provinciaDeCp(codi_postal, pais),
    pais,
    email: text(body.email),
    telefon: text(body.telefon),
    iban: ibanText ? netejaIban(ibanText) : null,
    notes: text(body.notes),
    client_id,
  };
}

fiscalRouter.get('/tercers', (req, res) => {
  const exercici = exerciciParam(req);
  res.json(
    all(
      `SELECT t.*, c.nom AS client_nom,
              (SELECT COUNT(*) FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id
                WHERE mf.tercer_id = t.id AND substr(m.data, 1, 4) = ?) AS moviments,
              (SELECT COALESCE(SUM(m.import_cents), 0) FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id
                WHERE mf.tercer_id = t.id AND substr(m.data, 1, 4) = ?) AS pagat_cents,
              (SELECT COALESCE(SUM(mf.retencio_cents), 0) FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id
                WHERE mf.tercer_id = t.id AND substr(m.data, 1, 4) = ?) AS retencio_cents
         FROM tercers t LEFT JOIN clients c ON c.id = t.client_id
        ORDER BY t.nom COLLATE NOCASE`,
      String(exercici), String(exercici), String(exercici),
    ),
  );
});

/** Clients de facturació, per vincular-los a un tercer. */
fiscalRouter.get('/clients', (_req, res) => {
  res.json(
    all(
      `SELECT c.id, c.nom, c.nif, t.id AS tercer_id FROM clients c LEFT JOIN tercers t ON t.client_id = c.id
        ORDER BY c.nom COLLATE NOCASE`,
    ),
  );
});

fiscalRouter.post('/tercers', (req, res) => {
  const d = dadesTercer(req.body ?? {}, null);
  const { id } = run(
    `INSERT INTO tercers (nom, nif, tipus_persona, adreca, codi_postal, poblacio, codi_provincia, pais, email, telefon, iban, notes, client_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.nom, d.nif, d.tipus_persona, d.adreca, d.codi_postal, d.poblacio, d.codi_provincia, d.pais, d.email, d.telefon, d.iban, d.notes, d.client_id,
  );
  registra(req, 'crea', 'tercer', id, d.nom);
  res.status(201).json({ id });
});

fiscalRouter.put('/tercers/:id', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 AS x FROM tercers WHERE id = ?', id)) notFound();
  const d = dadesTercer(req.body ?? {}, id);
  run(
    `UPDATE tercers SET nom = ?, nif = ?, tipus_persona = ?, adreca = ?, codi_postal = ?, poblacio = ?, codi_provincia = ?, pais = ?,
            email = ?, telefon = ?, iban = ?, notes = ?, client_id = ? WHERE id = ?`,
    d.nom, d.nif, d.tipus_persona, d.adreca, d.codi_postal, d.poblacio, d.codi_provincia, d.pais, d.email, d.telefon, d.iban, d.notes, d.client_id, id,
  );
  registra(req, 'modifica', 'tercer', id, d.nom);
  res.json({ ok: true });
});

fiscalRouter.delete('/tercers/:id', (req, res) => {
  const id = idParam(req);
  const t = get<{ nom: string }>('SELECT nom FROM tercers WHERE id = ?', id) ?? notFound();
  if (get('SELECT 1 AS x FROM moviments_fiscal WHERE tercer_id = ?', id))
    throw new HttpError(409, 'No es pot eliminar: el tercer té moviments assignats. Treu-ne primer les dades fiscals.');
  run('DELETE FROM tercers WHERE id = ?', id);
  registra(req, 'elimina', 'tercer', id, t.nom);
  res.status(204).end();
});

/** Crea un tercer per a cada client de facturació que encara no en té (vinculat al client). */
export function importaClients() {
  const clients = all<{ id: number; nom: string; nif: string | null; adreca: string | null; codi_postal: string | null; poblacio: string | null; pais: string | null; email: string | null }>(
    'SELECT * FROM clients WHERE id NOT IN (SELECT client_id FROM tercers WHERE client_id IS NOT NULL) ORDER BY id',
  );
  let creats = 0;
  let vinculats = 0;
  let nifDubtosos = 0;
  tx(() => {
    for (const c of clients) {
      const pais = (c.pais || 'ES').toUpperCase();
      const nif = c.nif ? c.nif.replace(/[\s.-]/g, '').toUpperCase() : null;
      if (nif && pais === 'ES' && !nifValid(nif)) nifDubtosos++;
      // Si ja hi ha un tercer amb el mateix NIF, només s'hi vincula el client.
      const existent = nif ? get<{ id: number; client_id: number | null }>('SELECT id, client_id FROM tercers WHERE nif = ?', nif) : undefined;
      if (existent) {
        if (existent.client_id === null) {
          run('UPDATE tercers SET client_id = ? WHERE id = ?', c.id, existent.id);
          vinculats++;
        }
        continue;
      }
      run(
        `INSERT INTO tercers (nom, nif, tipus_persona, adreca, codi_postal, poblacio, codi_provincia, pais, email, client_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.nom, nif, tipusPersonaDeNif(nif), c.adreca, c.codi_postal, c.poblacio, provinciaDeCp(c.codi_postal, pais), pais, c.email, c.id,
      );
      creats++;
    }
  });
  return { creats, vinculats, nif_dubtosos: nifDubtosos };
}

fiscalRouter.post('/tercers/importa-clients', (req, res) => {
  const r = importaClients();
  if (r.creats || r.vinculats) registra(req, 'crea', 'tercer', null, `Importats ${r.creats} clients de facturació (${r.vinculats} vinculats)`);
  res.json(r);
});

// =====================================================================
// Dades fiscals dels moviments de despesa
// =====================================================================

fiscalRouter.get('/moviments', (req, res) => {
  const exercici = exerciciParam(req);
  res.json(
    all(
      `SELECT m.id, m.data, m.import_cents, m.concepte, cat.nom AS categoria_nom, co.nom AS compte_nom,
              mf.tercer_id, t.nom AS tercer_nom, t.nif AS tercer_nif, mf.base_cents, mf.retencio_pct, mf.retencio_cents,
              mf.tipus_retencio, mf.clau_190,
              EXISTS (SELECT 1 FROM fiscal_pagaments p WHERE p.moviment_id = m.id) AS es_pagament_model
         FROM moviments m
         LEFT JOIN moviments_fiscal mf ON mf.moviment_id = m.id
         LEFT JOIN tercers t ON t.id = mf.tercer_id
         LEFT JOIN categories cat ON cat.id = m.categoria_id
         LEFT JOIN comptes co ON co.id = m.compte_id
        WHERE m.tipus = 'despesa' AND m.data BETWEEN ? AND ?
        ORDER BY m.data DESC, m.id DESC`,
      `${exercici}-01-01`, `${exercici}-12-31`,
    ),
  );
});

export const TIPUS_RETENCIO = ['professional', 'arrendament', 'altres'] as const;

/**
 * Valida les dades fiscals d'un pagament. L'import del moviment és el net pagat; la base és net + retenció
 * i la retenció és base × percentatge (s'admet 1 cèntim de diferència per arrodoniment).
 */
export function calculaFiscal(netCents: number, body: Record<string, unknown>) {
  const tercer_id = enter(body.tercer_id, 'Tercer');
  if (tercer_id !== null && !get('SELECT 1 AS x FROM tercers WHERE id = ?', tercer_id)) throw new HttpError(400, 'El tercer no existeix.');
  const pct = body.retencio_pct === undefined || body.retencio_pct === null || body.retencio_pct === '' ? 0 : Number(body.retencio_pct);
  if (!Number.isFinite(pct) || pct < 0 || pct >= 100) throw new HttpError(400, 'El percentatge de retenció no és vàlid.');
  const tipus = text(body.tipus_retencio);
  if (tipus !== null && !(TIPUS_RETENCIO as readonly string[]).includes(tipus)) throw new HttpError(400, 'Tipus de retenció no vàlid.');
  if (pct > 0 && !tipus) throw new HttpError(400, 'Indica el tipus de retenció (professional, arrendament o altres).');
  if (tipus && tercer_id === null) throw new HttpError(400, 'Un pagament amb retenció ha de tenir un tercer (perceptor).');
  let base = enter(body.base_cents, 'Base');
  if (base === null) base = pct > 0 ? Math.round(netCents / (1 - pct / 100)) : netCents;
  if (base <= 0) throw new HttpError(400, "La base ha de ser més gran que zero.");
  const retencio = Math.round((base * pct) / 100);
  if (Math.abs(base - retencio - netCents) > 1)
    throw new HttpError(
      400,
      "La base menys la retenció ({0}) no quadra amb l'import pagat del moviment ({1}). Recorda: l'import del moviment és el net pagat i la base és el net més la retenció."
        .replace('{0}', (Math.round(base - retencio) / 100).toFixed(2).replace('.', ','))
        .replace('{1}', (netCents / 100).toFixed(2).replace('.', ',')),
    );
  const clau = text(body.clau_190);
  return {
    tercer_id,
    base_cents: base,
    retencio_pct: pct,
    retencio_cents: retencio,
    tipus_retencio: tipus,
    clau_190: tipus && tipus !== 'arrendament' ? (clau ?? null) : null,
  };
}

fiscalRouter.put('/moviments/:id', (req, res) => {
  const id = idParam(req);
  const m = get<{ tipus: string; import_cents: number; concepte: string }>('SELECT tipus, import_cents, concepte FROM moviments WHERE id = ?', id) ?? notFound();
  if (m.tipus !== 'despesa') throw new HttpError(400, 'Només es poden assignar dades fiscals als moviments de despesa.');
  const d = calculaFiscal(m.import_cents, req.body ?? {});
  run(
    `INSERT INTO moviments_fiscal (moviment_id, tercer_id, base_cents, retencio_pct, retencio_cents, tipus_retencio, clau_190)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(moviment_id) DO UPDATE SET tercer_id = excluded.tercer_id, base_cents = excluded.base_cents,
       retencio_pct = excluded.retencio_pct, retencio_cents = excluded.retencio_cents,
       tipus_retencio = excluded.tipus_retencio, clau_190 = excluded.clau_190`,
    id, d.tercer_id, d.base_cents, d.retencio_pct, d.retencio_cents, d.tipus_retencio, d.clau_190,
  );
  registra(req, 'modifica', 'moviment_fiscal', id, m.concepte);
  res.json(d);
});

fiscalRouter.delete('/moviments/:id', (req, res) => {
  const id = idParam(req);
  run('DELETE FROM moviments_fiscal WHERE moviment_id = ?', id);
  registra(req, 'elimina', 'moviment_fiscal', id);
  res.status(204).end();
});

// =====================================================================
// Models 111, 115, 180, 190 i 347
// =====================================================================

const MODELS = ['111', '115', '180', '190', '347'] as const;
type Model = (typeof MODELS)[number];

const fmt = (c: number) => (c / 100).toFixed(2).replace('.', ',');

function dadesModel(req: Request) {
  const model = String(req.params.model) as Model;
  if (!(MODELS as readonly string[]).includes(model)) notFound();
  const exercici = exerciciParam(req);
  let files: Record<string, unknown>[];
  let columnes: [string, string][];
  if (model === '111' || model === '115') {
    const tr = resumTrimestral(model, exercici);
    files = tr.map((t) => ({
      ...t, periode: `${t.trimestre}T`, base: fmt(t.base_cents), retencio: fmt(t.retencio_cents),
      treball_perceptors: t.treball.perceptors, treball_base: fmt(t.treball.base_cents), treball_retencio: fmt(t.treball.retencio_cents),
      activitats_perceptors: t.activitats.perceptors, activitats_base: fmt(t.activitats.base_cents), activitats_retencio: fmt(t.activitats.retencio_cents),
    }));
    columnes = [['periode', 'Període'], ['termini', 'Termini'], ['perceptors', 'Perceptors'], ['base', 'Base'], ['retencio', 'Retencions']];
    if (model === '111')
      columnes.push(
        ['treball_perceptors', 'Treball: perceptors'], ['treball_base', 'Treball: base'], ['treball_retencio', 'Treball: retencions'],
        ['activitats_perceptors', 'Activitats econòmiques: perceptors'], ['activitats_base', 'Activitats econòmiques: base'],
        ['activitats_retencio', 'Activitats econòmiques: retencions'],
      );
  } else if (model === '190' || model === '180') {
    files = resumAnual(model === '190' ? '111' : '115', exercici).map((r) => ({
      ...r, base: fmt(r.base_cents), retencio: fmt(r.retencio_cents),
    }));
    columnes = [['nif', 'NIF'], ['nom', 'Nom'], ['codi_provincia', 'Província']];
    if (model === '190') columnes.push(['clau', 'Clau']);
    columnes.push(['pagaments', 'Pagaments'], ['base', 'Base'], ['retencio_pct', '% retenció'], ['retencio', 'Retencions']);
  } else {
    files = model347(exercici).filter((r) => r.supera).map((r) => ({
      ...r, t1: fmt(r.t1_cents), t2: fmt(r.t2_cents), t3: fmt(r.t3_cents), t4: fmt(r.t4_cents), total: fmt(r.total_cents),
    }));
    columnes = [
      ['nif', 'NIF'], ['nom', 'Nom'], ['codi_provincia', 'Província'], ['pais', 'País'], ['clau', 'Clau'],
      ['t1', '1T'], ['t2', '2T'], ['t3', '3T'], ['t4', '4T'], ['total', 'Total anual'],
    ];
  }
  return { model, exercici, files, columnes };
}

fiscalRouter.get('/models', (req, res) => {
  const exercici = exerciciParam(req);
  const r347 = model347(exercici);
  res.json({
    exercici,
    m111: resumTrimestral('111', exercici),
    m115: resumTrimestral('115', exercici),
    m190: resumAnual('111', exercici),
    m180: resumAnual('115', exercici),
    m347: r347,
    llindar_347_cents: LLINDAR_347,
    sense_nif: get<{ n: number }>(
      `SELECT COUNT(DISTINCT t.id) AS n FROM moviments_fiscal mf JOIN moviments m ON m.id = mf.moviment_id
         JOIN tercers t ON t.id = mf.tercer_id WHERE t.nif IS NULL AND substr(m.data, 1, 4) = ?`,
      String(exercici),
    )!.n,
  });
});

/** Dades d'un model en JSON, amb el CSV inclòs (per copiar-lo o veure'l on no es pot descarregar). */
fiscalRouter.get('/models/:model', (req, res) => {
  const { model, exercici, files, columnes } = dadesModel(req);
  res.json({ model, exercici, files, csv: toCsv(files, columnesTraduides(req, columnes)) });
});

fiscalRouter.get('/models/:model/csv', (req, res) => {
  const { model, exercici, files, columnes } = dadesModel(req);
  sendCsv(res, `model-${model}-${exercici}.csv`, toCsv(files, columnesTraduides(req, columnes)));
});

export const NOM_CATEGORIA_RETENCIONS = 'Retencions IRPF ingressades';

/** Comptabilitza l'ingrés trimestral de les retencions (model 111 o 115) com a moviment de despesa. */
export function registraPagament(model: ModelTrimestral, exercici: number, trimestre: number, dataPagament: string, compteId: number) {
  const resum = resumTrimestral(model, exercici)[trimestre - 1];
  if (!resum) throw new HttpError(400, 'Trimestre no vàlid.');
  if (resum.pagament) throw new HttpError(409, 'Aquest trimestre ja té el pagament comptabilitzat.');
  if (resum.retencio_cents <= 0) throw new HttpError(400, 'Aquest trimestre no té retencions per ingressar.');
  if (!get('SELECT 1 AS x FROM comptes WHERE id = ?', compteId)) throw new HttpError(400, 'El compte no existeix.');
  return tx(() => {
    let cat = get<{ id: number }>("SELECT id FROM categories WHERE nom = ? AND tipus = 'despesa'", NOM_CATEGORIA_RETENCIONS)?.id;
    if (!cat) cat = run("INSERT INTO categories (nom, tipus) VALUES (?, 'despesa')", NOM_CATEGORIA_RETENCIONS).id;
    const { id } = run(
      `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id) VALUES (?, 'despesa', ?, ?, ?, ?)`,
      dataPagament, resum.retencio_cents, `Model ${model} – ${trimestre}T ${exercici} (retencions IRPF)`, cat, compteId,
    );
    run('INSERT INTO fiscal_pagaments (model, exercici, trimestre, moviment_id) VALUES (?, ?, ?, ?)', model, exercici, trimestre, id);
    return { moviment_id: id, import_cents: resum.retencio_cents };
  });
}

fiscalRouter.post('/models/:model/pagament', (req, res) => {
  const model = String(req.params.model);
  if (model !== '111' && model !== '115') notFound();
  const exercici = enter(req.body?.exercici, 'Exercici');
  const trimestre = enter(req.body?.trimestre, 'Trimestre');
  if (!exercici || !trimestre || trimestre < 1 || trimestre > 4) throw new HttpError(400, 'Trimestre no vàlid.');
  const compte = enter(req.body?.compte_id, 'Compte');
  if (!compte) throw new HttpError(400, 'El camp «{0}» és obligatori.'.replace('{0}', 'Compte'));
  const r = registraPagament(model, exercici, trimestre, dataObligatoria(req.body?.data, 'Data'), compte);
  registra(req, 'crea', 'moviment', r.moviment_id, `Pagament model ${model} ${trimestre}T ${exercici}`);
  res.status(201).json(r);
});

// =====================================================================
// Extractes bancaris
// =====================================================================

const clauMapa = (compteId: number) => `fiscal_extracte_mapa_${compteId}`;

/** Saldo d'un compte segons els moviments de l'aplicació al final d'un dia. */
export function saldoAplicacio(compteId: number, finsA: string): number {
  return get<{ s: number }>(
    `SELECT c.saldo_inicial_cents
            + COALESCE((SELECT SUM(import_cents) FROM moviments WHERE data <= $d AND
                ((tipus = 'ingres' AND compte_id = c.id) OR (tipus = 'traspas' AND compte_desti_id = c.id))), 0)
            - COALESCE((SELECT SUM(import_cents) FROM moviments WHERE data <= $d AND tipus IN ('despesa','traspas') AND compte_id = c.id), 0) AS s
       FROM comptes c WHERE c.id = $c`,
    { d: finsA, c: compteId },
  )?.s ?? 0;
}

fiscalRouter.get('/extractes/comptes', (_req, res) => {
  const comptes = all<{ id: number; nom: string; iban: string | null; actiu: number }>('SELECT id, nom, iban, actiu FROM comptes ORDER BY id');
  res.json(
    comptes.map((c) => {
      const recompte = get<{ pendents: number; total: number; conciliades: number }>(
        `SELECT COUNT(*) AS total, COALESCE(SUM(estat = 'pendent'), 0) AS pendents, COALESCE(SUM(estat = 'conciliat'), 0) AS conciliades
           FROM extracte_linies WHERE compte_id = ?`,
        c.id,
      )!;
      const ultima = get<{ data: string; saldo_cents: number }>(
        'SELECT data, saldo_cents FROM extracte_linies WHERE compte_id = ? AND saldo_cents IS NOT NULL ORDER BY data DESC, id DESC LIMIT 1',
        c.id,
      );
      let mapa: unknown = null;
      try {
        const v = getConfig(clauMapa(c.id));
        mapa = v ? JSON.parse(v) : null;
      } catch {
        mapa = null;
      }
      return {
        ...c,
        ...recompte,
        ultima_data: ultima?.data ?? null,
        saldo_extracte_cents: ultima?.saldo_cents ?? null,
        saldo_aplicacio_cents: ultima ? saldoAplicacio(c.id, ultima.data) : null,
        mapa,
      };
    }),
  );
});

/** Categories actives (per crear moviments des de l'extracte). */
fiscalRouter.get('/categories', (_req, res) => {
  res.json(all("SELECT id, nom, tipus FROM categories WHERE actiu = 1 ORDER BY tipus, nom COLLATE NOCASE"));
});

/** Compara les línies amb les ja importades: torna les noves (sense duplicats) amb la seva empremta. */
export function preparaImportacio(compteId: number, linies: LiniaExtracte[]) {
  const ems = empremtes(compteId, linies);
  const existeix = (e: string) => Boolean(get('SELECT 1 AS x FROM extracte_linies WHERE empremta = ?', e));
  return linies.map((l, i) => ({ ...l, empremta: ems[i], duplicada: existeix(ems[i]) }));
}

export function desaLinies(compteId: number, linies: ReturnType<typeof preparaImportacio>, origen: 'csv' | 'n43') {
  let n = 0;
  tx(() => {
    for (const l of linies) {
      if (l.duplicada) continue;
      const r = run(
        `INSERT OR IGNORE INTO extracte_linies (compte_id, data, data_valor, concepte, import_cents, saldo_cents, referencia, empremta, origen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        compteId, l.data, l.data_valor, l.concepte, l.import_cents, l.saldo_cents, l.referencia, l.empremta, origen,
      );
      n += r.changes;
    }
  });
  return n;
}

fiscalRouter.post('/extractes/importa', (req, res) => {
  const body = req.body ?? {};
  const compteId = enter(body.compte_id, 'Compte');
  const compte = compteId ? get<{ id: number; nom: string; iban: string | null }>('SELECT id, nom, iban FROM comptes WHERE id = ?', compteId) : undefined;
  if (!compte) throw new HttpError(400, 'Tria el compte bancari.');
  const format = body.format === 'n43' ? 'n43' : 'csv';
  const avisos: string[] = [];
  let errors: { fila: number; error: string; valor?: string }[] = [];
  let linies: LiniaExtracte[];
  if (format === 'n43') {
    const contingut = typeof body.text === 'string' ? body.text : '';
    const comptes = llegeixN43(contingut);
    const ccc = cccDeIban(compte.iban);
    const coincideix = (c: CompteN43) => ccc && c.entitat === ccc.entitat && c.oficina === ccc.oficina && c.compte === ccc.compte;
    let triat = comptes.find(coincideix);
    if (!triat) {
      if (comptes.length > 1)
        throw new HttpError(400, "El fitxer conté {0} comptes i cap no coincideix amb l'IBAN del compte triat.".replace('{0}', String(comptes.length)));
      triat = comptes[0];
      avisos.push(ccc ? "El compte del fitxer no coincideix amb l'IBAN del compte triat." : "El compte triat no té IBAN: no s'ha pogut comprovar que el fitxer sigui d'aquest compte.");
    }
    if (triat.divisa !== '978') avisos.push('El fitxer no està en euros.');
    avisos.push(...triat.avisos);
    linies = triat.linies;
  } else {
    const files = Array.isArray(body.files) ? (body.files as unknown[]).filter(Array.isArray).map((f) => (f as unknown[]).map((v) => String(v ?? ''))) : [];
    if (!files.length) throw new HttpError(400, 'El fitxer és buit.');
    const mapa = (body.mapa ?? {}) as MapaCsv;
    const llegides = llegeixFilesCsv(files, mapa, enter(body.primera_fila, 'Fila') ?? 1);
    errors = llegides.filter((f) => f.error).map((f) => ({ fila: f.fila, error: f.error!, valor: f.valor }));
    linies = llegides.flatMap((f) => (f.linia ? [f.linia] : []));
    // Molts bancs exporten primer el moviment més recent: es desa en ordre cronològic.
    if (linies.length > 1 && linies[0].data > linies[linies.length - 1].data) linies.reverse();
  }
  const preparades = preparaImportacio(compte.id, linies);
  const duplicades = preparades.filter((l) => l.duplicada).length;
  let importades = 0;
  if (body.confirma) {
    importades = desaLinies(compte.id, preparades, format);
    if (format === 'csv' && body.mapa) setConfig(clauMapa(compte.id), JSON.stringify({ mapa: body.mapa, capcalera: body.capcalera ?? true }));
    registra(req, 'crea', 'extracte', compte.id, `Importades ${importades} línies (${format.toUpperCase()}) al compte ${compte.nom}`);
  }
  res.json({
    linies: preparades.slice(0, 500).map(({ empremta: _e, ...l }) => l),
    total: preparades.length,
    noves: preparades.length - duplicades,
    duplicades,
    errors,
    avisos,
    importades,
  });
});

fiscalRouter.get('/extractes/linies', (req, res) => {
  const compteId = enter(req.query.compte_id, 'Compte');
  if (!compteId) throw new HttpError(400, 'Tria el compte bancari.');
  const estat = text(req.query.estat);
  const where = ['l.compte_id = ?'];
  const params: unknown[] = [compteId];
  if (estat && ['pendent', 'conciliat', 'ignorat'].includes(estat)) {
    where.push('l.estat = ?');
    params.push(estat);
  }
  res.json(
    all(
      `SELECT l.id, l.data, l.data_valor, l.concepte, l.import_cents, l.saldo_cents, l.referencia, l.estat, l.moviment_id, l.origen,
              m.data AS moviment_data, m.concepte AS moviment_concepte, m.import_cents AS moviment_import_cents, m.tipus AS moviment_tipus,
              (SELECT COUNT(*) FROM moviments s
                WHERE l.estat = 'pendent' AND s.import_cents = abs(l.import_cents)
                  AND s.data BETWEEN date(l.data, '-5 days') AND date(l.data, '+5 days')
                  AND (CASE WHEN l.import_cents > 0
                        THEN (s.tipus = 'ingres' AND s.compte_id = l.compte_id) OR (s.tipus = 'traspas' AND s.compte_desti_id = l.compte_id)
                        ELSE s.tipus IN ('despesa','traspas') AND s.compte_id = l.compte_id END)
                  AND s.id NOT IN (SELECT moviment_id FROM extracte_linies x WHERE x.compte_id = l.compte_id AND x.moviment_id IS NOT NULL)
              ) AS suggeriments
         FROM extracte_linies l LEFT JOIN moviments m ON m.id = l.moviment_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.data DESC, l.id DESC
        LIMIT 1000`,
      ...params,
    ),
  );
});

interface LiniaDb {
  id: number;
  compte_id: number;
  data: string;
  concepte: string;
  import_cents: number;
  estat: string;
  moviment_id: number | null;
}

const liniaDe = (id: number) => get<LiniaDb>('SELECT * FROM extracte_linies WHERE id = ?', id) ?? notFound();

/** Condició SQL de moviments compatibles amb la direcció de la línia (ingrés/despesa/traspàs). */
const SQL_DIRECCIO = `(CASE WHEN $import > 0
   THEN (m.tipus = 'ingres' AND m.compte_id = $compte) OR (m.tipus = 'traspas' AND m.compte_desti_id = $compte)
   ELSE m.tipus IN ('despesa','traspas') AND m.compte_id = $compte END)`;

/**
 * Moviments que poden correspondre a una línia: mateix compte, mateix import i direcció, ±5 dies, no conciliats
 * encara amb cap altra línia del compte. Amb `amplia`, ±15 dies i qualsevol import.
 */
export function suggeriments(liniaId: number, amplia = false) {
  const l = liniaDe(liniaId);
  const dies = amplia ? 15 : 5;
  return all<{ id: number; data: string; tipus: string; import_cents: number; concepte: string; categoria_nom: string | null; dies: number }>(
    `SELECT m.id, m.data, m.tipus, m.import_cents, m.concepte, c.nom AS categoria_nom,
            CAST(abs(julianday(m.data) - julianday($data)) AS INTEGER) AS dies
       FROM moviments m LEFT JOIN categories c ON c.id = m.categoria_id
      WHERE m.data BETWEEN date($data, '-${dies} days') AND date($data, '+${dies} days')
        AND ${amplia ? '1' : 'm.import_cents = abs($import)'}
        AND ${SQL_DIRECCIO}
        AND m.id NOT IN (SELECT moviment_id FROM extracte_linies WHERE compte_id = $compte AND moviment_id IS NOT NULL)
      ORDER BY m.import_cents = abs($import) DESC, abs(julianday(m.data) - julianday($data)), m.id
      LIMIT 30`,
    { data: l.data, import: l.import_cents, compte: l.compte_id },
  );
}

fiscalRouter.get('/extractes/linies/:id/suggeriments', (req, res) => {
  res.json(suggeriments(idParam(req), req.query.amplia === '1'));
});

export function vincula(liniaId: number, movimentId: number) {
  const l = liniaDe(liniaId);
  if (l.estat === 'conciliat') throw new HttpError(409, 'Aquesta línia ja està conciliada.');
  const ok = get(
    `SELECT 1 AS x FROM moviments m WHERE m.id = $mov AND ${SQL_DIRECCIO}`,
    { mov: movimentId, import: l.import_cents, compte: l.compte_id },
  );
  if (!ok) throw new HttpError(400, "El moviment no és d'aquest compte o no va en la mateixa direcció (entrada/sortida).");
  if (get('SELECT 1 AS x FROM extracte_linies WHERE compte_id = ? AND moviment_id = ? AND id <> ?', l.compte_id, movimentId, l.id))
    throw new HttpError(409, 'Aquest moviment ja està conciliat amb una altra línia de l’extracte.');
  run("UPDATE extracte_linies SET estat = 'conciliat', moviment_id = ? WHERE id = ?", movimentId, l.id);
}

fiscalRouter.post('/extractes/linies/:id/vincula', (req, res) => {
  const id = idParam(req);
  const mov = enter(req.body?.moviment_id, 'Moviment');
  if (!mov) throw new HttpError(400, 'Tria el moviment.');
  vincula(id, mov);
  res.json({ ok: true });
});

/** Crea el moviment corresponent a una línia de l'extracte (ingrés o despesa) i la deixa conciliada. */
export function creaMoviment(liniaId: number, categoriaId: number | null, concepte: string) {
  const l = liniaDe(liniaId);
  if (l.estat === 'conciliat') throw new HttpError(409, 'Aquesta línia ja està conciliada.');
  const tipus = l.import_cents > 0 ? 'ingres' : 'despesa';
  if (categoriaId !== null) {
    const cat = get<{ tipus: string }>('SELECT tipus FROM categories WHERE id = ?', categoriaId);
    if (!cat) throw new HttpError(400, 'La categoria no existeix.');
    if (cat.tipus !== tipus) throw new HttpError(400, tipus === 'ingres' ? "La categoria ha de ser d'ingrés." : 'La categoria ha de ser de despesa.');
  }
  return tx(() => {
    // Els disparadors dels exercicis tancats poden aturar la inserció: l'error arriba a la interfície (409).
    const { id } = run(
      'INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      l.data, tipus, Math.abs(l.import_cents), concepte, categoriaId, l.compte_id, 'Creat des de l’extracte bancari',
    );
    run("UPDATE extracte_linies SET estat = 'conciliat', moviment_id = ? WHERE id = ?", id, l.id);
    return id;
  });
}

fiscalRouter.post('/extractes/linies/:id/crea', (req, res) => {
  const id = idParam(req);
  const mov = creaMoviment(id, enter(req.body?.categoria_id, 'Categoria'), textObligatori(req.body?.concepte, 'Concepte'));
  registra(req, 'crea', 'moviment', mov, "Des de l'extracte bancari");
  res.status(201).json({ moviment_id: mov });
});

fiscalRouter.post('/extractes/linies/:id/ignora', (req, res) => {
  const l = liniaDe(idParam(req));
  if (l.estat === 'conciliat') throw new HttpError(409, 'Aquesta línia ja està conciliada.');
  run("UPDATE extracte_linies SET estat = 'ignorat', moviment_id = NULL WHERE id = ?", l.id);
  res.json({ ok: true });
});

/** Torna una línia a «pendent» (desfà la conciliació o el «ignora»; el moviment no s'esborra). */
fiscalRouter.post('/extractes/linies/:id/desfes', (req, res) => {
  const l = liniaDe(idParam(req));
  run("UPDATE extracte_linies SET estat = 'pendent', moviment_id = NULL WHERE id = ?", l.id);
  res.json({ ok: true });
});

fiscalRouter.delete('/extractes/linies/:id', (req, res) => {
  const l = liniaDe(idParam(req));
  if (l.estat === 'conciliat') throw new HttpError(409, 'Aquesta línia ja està conciliada: desfés-ne primer la conciliació.');
  run('DELETE FROM extracte_linies WHERE id = ?', l.id);
  registra(req, 'elimina', 'extracte', l.id, `${l.data} ${l.concepte}`);
  res.status(204).end();
});
