// Tipus i textos compartits de les pantalles de tresoreria (respostes de /api/tresoreria).
import type { Quota } from '../../../shared/types';
import { t } from '../../i18n';

export type Metode = 'efectiu' | 'transferencia' | 'domiciliacio';
export type Sequencia = 'FRST' | 'RCUR';

export const METODES: Record<Metode, string> = {
  efectiu: t("Efectiu"),
  transferencia: t("Transferència"),
  domiciliacio: t("Domiciliació"),
};

export interface QuotaTresoreria extends Quota {
  metode?: Metode | null;
  metode_preferit?: Metode;
  en_remesa?: number;
}

export interface CategoriaPressupost {
  id: number;
  nom: string;
  tipus: 'ingres' | 'despesa';
  actiu: number;
  pressupost_cents: number;
  real_cents: number;
  anterior_pressupost_cents: number;
  anterior_real_cents: number;
}

export interface Pressupost {
  exercici: number;
  aprovat_el: string | null;
  te_pressupost: boolean;
  categories: CategoriaPressupost[];
}

export interface Tancament {
  exercici: number;
  tancat: boolean;
  tancat_el: string | null;
  usuari: string | null;
  notes: string | null;
  moviments: number;
  ingressos_cents: number;
  despeses_cents: number;
  quotes_pendents: number;
  remeses_pendents: number;
}

export interface CategoriaFiscal {
  id: number;
  nom: string;
  actiu: number;
  renda_exempta: number;
  subjecta_retencio: number;
  import_cents: number;
}

export interface InformeFiscal {
  exercici: number;
  categories: CategoriaFiscal[];
  devolucions_cents: number;
  exempts_cents: number;
  total_cents: number;
  no_exempts_cents: number;
  no_exempts_sense_retencio_cents: number;
  obligat: boolean;
  motius: string[];
  termini: string;
}

export interface ConfigSepa {
  nom: string;
  nif: string;
  identificador: string;
  suggeriment: string;
  compte_id: number | null;
  iban: string | null;
  bic: string | null;
  prefix: string;
  comptes: { id: number; nom: string; iban: string | null; bic: string | null; actiu: number }[];
}

export interface Mandat {
  soci_id: number;
  num_soci: number;
  nom: string;
  iban: string | null;
  iban_valid: boolean;
  data_baixa: string | null;
  metode: Metode;
  referencia: string | null;
  data_signatura: string | null;
  sequencia: Sequencia;
  actiu: number;
  te_fila: number;
  referencia_suggerida: string;
}

export interface QuotaDomiciliada {
  id: number;
  exercici: number;
  import_cents: number;
  soci_id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  iban: string | null;
  sequencia: Sequencia | null;
  motiu: string | null;
}

export interface RemesaResum {
  id: number;
  referencia: string;
  data_cobrament: string;
  compte_nom: string;
  num_operacions: number;
  total_cents: number;
  estat: 'generada' | 'cobrada';
  cobrada_el: string | null;
  usuari: string | null;
  creat_el: string;
  retornats: number;
}

export interface LiniaRemesa {
  id: number;
  quota_id: number | null;
  soci_id: number | null;
  num_soci: number | null;
  exercici: number | null;
  estat_quota: string | null;
  nom_deutor: string;
  iban: string;
  mandat_referencia: string;
  mandat_data: string;
  sequencia: Sequencia;
  import_cents: number;
  end_to_end: string;
  concepte: string;
  estat: 'inclosa' | 'retornada';
  data_devolucio: string | null;
  motiu_devolucio: string | null;
  comissio_cents: number;
}

export interface Remesa extends RemesaResum {
  xml: string;
  linies: LiniaRemesa[];
}

/** Codis de devolució SEPA més habituals. */
export const MOTIUS_DEVOLUCIO: [string, string][] = [
  ['AM04', t("Fons insuficients")],
  ['MD06', t("Devolució a petició del deutor")],
  ['MS02', t("Refusada pel deutor")],
  ['AC04', t("Compte cancel·lat")],
  ['AC01', t("Compte incorrecte")],
  ['AC06', t("Compte bloquejat")],
  ['MD01', t("Sense mandat")],
  ['AG01', t("Operació no permesa en aquest compte")],
  ['MD07', t("Deutor mort")],
  ['MS03', t("Motiu no especificat")],
  ['SL01', t("Servei específic del banc del deutor")],
];
