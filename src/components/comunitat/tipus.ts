// Tipus i etiquetes comuns del mòdul «comunitat» (voluntariat i col·laboradors).
import { t } from '../../i18n';

export type EstatCertificat = 'no_cal' | 'falta' | 'caducat' | 'caduca_aviat' | 'vigent';

export interface Voluntari {
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
  hores_exercici: number;
  hores_totals: number;
  actiu: boolean;
  certificat: { estat: EstatCertificat; caduca: string | null };
  cobertura: { accidents: boolean; rc: boolean };
}

export interface FitxaVoluntari extends Voluntari {
  periodes: { id: number; data_alta: string; data_baixa: string | null; motiu_baixa: string | null }[];
  hores: { id: number; data: string; hores: number; tasca: string | null; activitat_id: number | null; activitat: string | null }[];
  per_any: { any: string; hores: number }[];
  assegurances: { id: number; asseguradora: string; num_polissa: string | null; tipus: string; data_venciment: string }[];
}

export interface Persona {
  soci_id: number;
  nom: string;
}
export interface JuntaSignatures {
  presidencia: Persona | null;
  secretaria: Persona | null;
}

export interface ConfigComunitat {
  vol_validesa_certificat_mesos: number;
  vol_valor_hora_cents: number;
}

export interface ActivitatBreu {
  id: number;
  nom: string;
  data_inici: string;
  data_fi: string | null;
}

export interface Hora {
  id: number;
  voluntari_id: number;
  nom: string;
  llinatges: string;
  activitat_id: number | null;
  activitat: string | null;
  data: string;
  hores: number;
  tasca: string | null;
}

export interface ResumVoluntariat {
  exercici: number;
  voluntaris_actius: number;
  voluntaris_no_socis: number;
  altes: number;
  baixes: number;
  persones_amb_hores: number;
  hores_totals: number;
  valor_hora_cents: number;
  valor_estimat_cents: number;
  per_persona: { voluntari_id: number; nom: string; llinatges: string; soci: number; hores: number; activitats: number; dies: number; valor_cents: number }[];
  per_activitat: { activitat_id: number | null; nom: string | null; data_inici: string | null; hores: number; persones: number; valor_cents: number }[];
  per_mes: { mes: string; hores: number }[];
}

export type TipusAsseguranca = 'responsabilitat_civil' | 'accidents_voluntaris' | 'activitats' | 'altres';
export type EstatPolissa = 'futura' | 'vencuda' | 'venc_aviat' | 'vigent';

export interface Polissa {
  id: number;
  asseguradora: string;
  num_polissa: string | null;
  tipus: TipusAsseguranca;
  cobertura: string | null;
  data_inici: string | null;
  data_venciment: string;
  prima_cents: number | null;
  mediador: string | null;
  contacte: string | null;
  nominativa: number;
  no_renovar: number;
  document_nom: string | null;
  te_document: number;
  document?: string | null;
  notes: string | null;
  estat: EstatPolissa;
  voluntaris: number[];
}

export type TipusEntitat = 'ajuntament' | 'consell' | 'govern' | 'escola' | 'entitat' | 'empresa' | 'altres';
export type RolActivitat = 'organitzador' | 'collaborador' | 'patrocinador' | 'espai_cedit' | 'altres';
export type EstatConveni = 'esborrany' | 'vigent' | 'finalitzat';

export interface Entitat {
  id: number;
  nom: string;
  tipus: TipusEntitat;
  nif: string | null;
  persona_contacte: string | null;
  carrec: string | null;
  email: string | null;
  telefon: string | null;
  adreca: string | null;
  web: string | null;
  notes: string | null;
  actiu: number;
  activitats: number;
  darrera_activitat: string | null;
  convenis: number;
  convenis_vigents: number;
  aportacions_cents: number;
}

export interface Conveni {
  id: number;
  entitat_id: number;
  entitat?: string;
  titol: string;
  objecte: string | null;
  data_signatura: string | null;
  data_inici: string | null;
  data_fi: string | null;
  renovacio_automatica: number;
  import_cents: number | null;
  obligacions: string | null;
  estat: EstatConveni;
  notes: string | null;
  document_nom: string | null;
  te_document: number;
  document?: string | null;
}

export interface FitxaEntitat extends Entitat {
  llista_convenis: Conveni[];
  llista_activitats: { activitat_id: number; nom: string; data_inici: string; rol: RolActivitat; notes: string | null }[];
  per_any: { any: string; activitats: number }[];
}

export const TIPUS_ASSEGURANCA: Record<TipusAsseguranca, string> = {
  accidents_voluntaris: t("Accidents de les persones voluntàries"),
  responsabilitat_civil: t("Responsabilitat civil"),
  activitats: t("Activitats"),
  altres: t("Altres"),
};

export const ESTATS_POLISSA: Record<EstatPolissa, string> = {
  vigent: t("Vigent"),
  venc_aviat: t("Venç aviat"),
  vencuda: t("Vençuda"),
  futura: t("Encara no ha començat"),
};

export const ESTATS_CERTIFICAT: Record<EstatCertificat, string> = {
  no_cal: t("No cal"),
  falta: t("Falta"),
  caducat: t("Caducat"),
  caduca_aviat: t("Caduca aviat"),
  vigent: t("Vigent"),
};

export const TIPUS_ENTITAT: Record<TipusEntitat, string> = {
  ajuntament: t("Ajuntament"),
  consell: t("Consell insular"),
  govern: t("Govern"),
  escola: t("Centre educatiu"),
  entitat: t("Entitat o associació"),
  empresa: t("Empresa"),
  altres: t("Altres"),
};

export const ROLS_ACTIVITAT: Record<RolActivitat, string> = {
  organitzador: t("Coorganitzador"),
  collaborador: t("Col·laborador"),
  patrocinador: t("Patrocinador"),
  espai_cedit: t("Cedeix l'espai"),
  altres: t("Altres"),
};

export const ESTATS_CONVENI: Record<EstatConveni, string> = {
  esborrany: t("Esborrany"),
  vigent: t("Vigent"),
  finalitzat: t("Finalitzat"),
};

/** Color de les insígnies d'estat (verd: correcte; ocre: atenció; vermell: cal actuar; gris: neutre). */
export const TO_ESTAT: Record<string, 'ok' | 'avis' | 'perill' | 'neutre'> = {
  vigent: 'ok',
  no_cal: 'neutre',
  falta: 'perill',
  caducat: 'perill',
  vencuda: 'perill',
  caduca_aviat: 'avis',
  venc_aviat: 'avis',
  futura: 'neutre',
  esborrany: 'neutre',
  finalitzat: 'neutre',
};

export const nomVoluntari = (v: { nom: string; llinatges: string }) => `${v.nom} ${v.llinatges ?? ''}`.trim();

