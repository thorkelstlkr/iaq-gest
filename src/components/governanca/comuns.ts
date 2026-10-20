// Tipus i textos compartits pel mòdul d'òrgans de govern.
import { t } from '../../i18n';

export type Organ = 'assemblea' | 'junta' | 'comissio';
export type EstatReunio = 'prevista' | 'convocada' | 'celebrada' | 'anullada';
export type Carrec = 'presidencia' | 'vicepresidencia' | 'secretaria' | 'tresoreria' | 'vocal';

export const ORGANS: Record<Organ, string> = {
  assemblea: t("Assemblea general"),
  junta: t("Junta directiva"),
  comissio: t("Comissió"),
};
export const TIPUS_REUNIO: Record<string, string> = { ordinaria: t("Ordinària"), extraordinaria: t("Extraordinària") };
export const ESTATS_REUNIO: Record<EstatReunio, string> = {
  prevista: t("Prevista"),
  convocada: t("Convocada"),
  celebrada: t("Celebrada"),
  anullada: t("Anul·lada"),
};
export const CLASSE_ESTAT: Record<EstatReunio, string> = {
  prevista: 'insignia-buida',
  convocada: 'insignia-pendent',
  celebrada: 'insignia-pagada',
  anullada: 'insignia-exempta',
};
export const CARRECS: Record<Carrec, string> = {
  presidencia: t("Presidència"),
  vicepresidencia: t("Vicepresidència"),
  secretaria: t("Secretaria"),
  tresoreria: t("Tresoreria"),
  vocal: t("Vocal"),
};
export const RESULTATS: Record<string, string> = { aprovat: t("Aprovat"), rebutjat: t("Rebutjat"), informatiu: t("Informatiu") };

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

export interface Antelacio {
  dies: number;
  minim: number;
  convocada: boolean;
}

export interface Reunio {
  id: number;
  organ: Organ;
  tipus: 'ordinaria' | 'extraordinaria';
  titol: string | null;
  data: string;
  hora_1a: string | null;
  hora_2a: string | null;
  lloc: string | null;
  ordre_dia: string[];
  estat: EstatReunio;
  data_convocatoria: string | null;
  convocatoria_celebrada: '1a' | '2a' | null;
  notes: string | null;
  antelacio: Antelacio | null;
}

export interface ReunioLlista extends Reunio {
  acta_id: number | null;
  acta_numero: number | null;
  acta_tancada: number | null;
  n_assistents: number;
  n_acords: number;
  n_convocats: number;
}

export interface Assistent {
  soci_id: number;
  nom: string;
  forma: 'present' | 'representat';
  representant_id: number | null;
  representant: string | null;
  num_soci: number | null;
}

export interface Acord {
  id: number;
  reunio_id: number;
  punt: number | null;
  text: string;
  vots_favor: number | null;
  vots_contra: number | null;
  abstencions: number | null;
  resultat: 'aprovat' | 'rebutjat' | 'informatiu';
}

export interface Acta {
  id: number;
  reunio_id: number;
  organ: Organ;
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

export interface Convocat {
  id: number;
  soci_id: number | null;
  nom: string;
  canal: 'email' | 'carta';
  adreca: string | null;
  enviat_el: string;
  error: string | null;
  autor: string | null;
}

export interface DetallReunio extends Reunio {
  assistents: Assistent[];
  acords: Acord[];
  acta: Acta | null;
  quorum: Quorum;
  convocats: Convocat[];
}

export interface ActaCompleta {
  acta: Acta;
  reunio: Reunio;
  assistents: Assistent[];
  acords: Acord[];
  quorum: Quorum;
}

export interface SociGov {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  dni: string | null;
  email: string | null;
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  data_alta?: string;
  data_baixa?: string | null;
  votant?: number;
}

export interface ConfigGov {
  gov_dies_convocatoria: number;
  gov_quorum_1a: number;
}

/** Nom de la reunió: «Assemblea general ordinària», «Reunió ordinària de la junta directiva»… */
export function titolReunio(r: Pick<Reunio, 'organ' | 'tipus' | 'titol'>): string {
  const extra = r.tipus === 'extraordinaria';
  if (r.organ === 'assemblea') return extra ? t("Assemblea general extraordinària") : t("Assemblea general ordinària");
  if (r.organ === 'junta') return extra ? t("Reunió extraordinària de la junta directiva") : t("Reunió ordinària de la junta directiva");
  return r.titol ? t("Comissió: {0}", r.titol) : t("Reunió de comissió");
}

export const nomSoci = (s: { nom: string; llinatges: string }) => `${s.nom} ${s.llinatges}`.trim();

export const adrecaPostal = (s: SociGov) => [s.adreca, [s.codi_postal, s.poblacio].filter(Boolean).join(' ')].filter(Boolean);
