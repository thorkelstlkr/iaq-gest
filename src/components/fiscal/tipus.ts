// Tipus i textos compartits de les pantalles del mòdul fiscal (respostes de /api/fiscal).
import { t } from '../../i18n';

export type TipusRetencio = 'professional' | 'arrendament' | 'altres';

export const TIPUS_RETENCIO: Record<TipusRetencio, string> = {
  professional: t("Professionals i artistes (model 111)"),
  arrendament: t("Lloguer d'immobles (model 115)"),
  altres: t("Altres rendiments (model 111)"),
};

/** Claus més habituals del model 190 per a una entitat petita. */
export const CLAUS_190: { clau: string; text: string; pct: number }[] = [
  { clau: 'G01', text: t("G01 · Activitats professionals (15 %)"), pct: 15 },
  { clau: 'G02', text: t("G02 · Professionals en els primers anys d'activitat (7 %)"), pct: 7 },
  { clau: 'F01', text: t("F01 · Cursos, conferències i seminaris (15 %)"), pct: 15 },
  { clau: 'F02', text: t("F02 · Elaboració d'obres literàries, artístiques o científiques (15 %)"), pct: 15 },
];

export interface Tercer {
  id: number;
  nom: string;
  nif: string | null;
  tipus_persona: 'fisica' | 'juridica';
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  codi_provincia: string | null;
  pais: string;
  email: string | null;
  telefon: string | null;
  iban: string | null;
  notes: string | null;
  client_id: number | null;
  client_nom: string | null;
  moviments: number;
  pagat_cents: number;
  retencio_cents: number;
}

export interface ClientFacturacio {
  id: number;
  nom: string;
  nif: string | null;
  tercer_id: number | null;
}

export interface MovimentFiscal {
  id: number;
  data: string;
  import_cents: number;
  concepte: string;
  categoria_nom: string | null;
  compte_nom: string | null;
  tercer_id: number | null;
  tercer_nom: string | null;
  tercer_nif: string | null;
  base_cents: number | null;
  retencio_pct: number | null;
  retencio_cents: number | null;
  tipus_retencio: TipusRetencio | null;
  clau_190: string | null;
  es_pagament_model: number;
}

export interface Agregat {
  perceptors: number;
  base_cents: number;
  retencio_cents: number;
}

export interface ResumTrimestre extends Agregat {
  trimestre: number;
  des: string;
  fins: string;
  termini: string;
  treball: Agregat;
  activitats: Agregat;
  pagament: { moviment_id: number; data: string; import_cents: number } | null;
}

export interface ResumAnual {
  tercer_id: number | null;
  nom: string;
  nif: string | null;
  codi_provincia: string | null;
  clau: string | null;
  pagaments: number;
  base_cents: number;
  retencio_cents: number;
  retencio_pct: number;
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

export interface Models {
  exercici: number;
  m111: ResumTrimestre[];
  m115: ResumTrimestre[];
  m190: ResumAnual[];
  m180: ResumAnual[];
  m347: Fila347[];
  llindar_347_cents: number;
  sense_nif: number;
}

export interface CompteExtracte {
  id: number;
  nom: string;
  iban: string | null;
  actiu: number;
  total: number;
  pendents: number;
  conciliades: number;
  ultima_data: string | null;
  saldo_extracte_cents: number | null;
  saldo_aplicacio_cents: number | null;
  mapa: { mapa: MapaCsv; capcalera?: boolean } | null;
}

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

export type EstatLinia = 'pendent' | 'conciliat' | 'ignorat';

export const ESTATS_LINIA: Record<EstatLinia, string> = {
  pendent: t("Pendent"),
  conciliat: t("Conciliada"),
  ignorat: t("Ignorada"),
};

export interface LiniaExtracte {
  id: number;
  data: string;
  data_valor: string | null;
  concepte: string;
  import_cents: number;
  saldo_cents: number | null;
  referencia: string | null;
  estat: EstatLinia;
  moviment_id: number | null;
  origen: 'csv' | 'n43';
  moviment_data: string | null;
  moviment_concepte: string | null;
  moviment_import_cents: number | null;
  moviment_tipus: string | null;
  suggeriments: number;
}

export interface Suggeriment {
  id: number;
  data: string;
  tipus: 'ingres' | 'despesa' | 'traspas';
  import_cents: number;
  concepte: string;
  categoria_nom: string | null;
  dies: number;
}

export interface Categoria {
  id: number;
  nom: string;
  tipus: 'ingres' | 'despesa';
}

/** Missatges que torna el servidor en català dins de les respostes (no com a error): es tradueixen aquí. */
export const MISSATGES_SERVIDOR: Record<string, string> = {
  'Data no vàlida: «{0}».': t("Data no vàlida: «{0}»."),
  'Saldo no vàlid: «{0}».': t("Saldo no vàlid: «{0}»."),
  'Import no vàlid o zero.': t("Import no vàlid o zero."),
  'Els totals del registre final del compte no coincideixen amb els moviments llegits.': t("Els totals del registre final del compte no coincideixen amb els moviments llegits."),
  'El saldo final del fitxer no coincideix amb el saldo inicial més els moviments.': t("El saldo final del fitxer no coincideix amb el saldo inicial més els moviments."),
  "El compte del fitxer no coincideix amb l'IBAN del compte triat.": t("El compte del fitxer no coincideix amb l'IBAN del compte triat."),
  "El compte triat no té IBAN: no s'ha pogut comprovar que el fitxer sigui d'aquest compte.": t("El compte triat no té IBAN: no s'ha pogut comprovar que el fitxer sigui d'aquest compte."),
  'El fitxer no està en euros.': t("El fitxer no està en euros."),
};

/** Tradueix un missatge del servidor amb {0}. */
export const missatge = (text: string, valor?: string) => (MISSATGES_SERVIDOR[text] ?? text).replace('{0}', valor ?? '');
