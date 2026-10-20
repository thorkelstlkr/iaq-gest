// Tipus i textos compartits de les pantalles del registre de socis.
import { t } from '../../i18n';

export interface CategoriaSoci {
  id: number;
  nom: string;
  te_vot: number;
  paga_quota: number;
  descripcio: string | null;
  socis?: number;
  actius?: number;
}

export type MotiuBaixa = 'voluntaria' | 'impagament' | 'expulsio' | 'defuncio' | 'altres';

export interface Periode {
  id: number;
  soci_id: number;
  data_alta: string;
  data_baixa: string | null;
  motiu_tipus: MotiuBaixa | null;
  motiu: string | null;
  /** Acord d'admissió o de readmissió. */
  acord: string | null;
  /** Acord de la baixa (p. ex. l'expulsió). */
  acord_baixa: string | null;
}

export type EstatAdmissio = 'sollicitada' | 'admesa' | 'denegada';

/** Camps del soci que afegeix aquest mòdul (shared/types.ts no els inclou encara). */
export interface SociRegistre {
  categoria_id: number | null;
  categoria_nom?: string | null;
  te_vot?: number;
  estat_admissio: EstatAdmissio;
  data_admissio: string | null;
  acord_admissio: string | null;
}

export const MOTIUS_BAIXA = (): Record<MotiuBaixa, string> => ({
  voluntaria: t("Baixa voluntària"),
  impagament: t("Impagament de quotes"),
  expulsio: t("Expulsió"),
  defuncio: t("Defunció"),
  altres: t("Altres"),
});

export const ESTATS_ADMISSIO = (): Record<EstatAdmissio, string> => ({
  sollicitada: t("Sol·licitud pendent"),
  admesa: t("Admesa"),
  denegada: t("Denegada"),
});
