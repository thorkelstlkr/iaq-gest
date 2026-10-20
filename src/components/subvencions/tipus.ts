// Tipus i textos comuns del mòdul de subvencions (vegeu server/routes/subvencions.ts).
import { t } from '../../i18n';

export type EstatSubvencio = 'preparacio' | 'sollicitada' | 'concedida' | 'denegada' | 'cobrada' | 'justificada' | 'tancada' | 'reintegrament';

export const ESTATS: { id: EstatSubvencio; text: string; color: string }[] = [
  { id: 'preparacio', text: t("En preparació"), color: '#7a6f66' },
  { id: 'sollicitada', text: t("Sol·licitada"), color: '#b7802a' },
  { id: 'concedida', text: t("Concedida"), color: '#2f6690' },
  { id: 'denegada', text: t("Denegada"), color: '#b42318' },
  { id: 'cobrada', text: t("Cobrada"), color: '#3d6b20' },
  { id: 'justificada', text: t("Justificada"), color: '#56662c' },
  { id: 'tancada', text: t("Tancada"), color: '#2b2521' },
  { id: 'reintegrament', text: t("Reintegrament"), color: '#9a3b25' },
];
export const estat = (id: string) => ESTATS.find((e) => e.id === id) ?? ESTATS[0];

/** Estats en què es poden imputar despeses i justificar. */
export const PER_JUSTIFICAR: EstatSubvencio[] = ['concedida', 'cobrada'];
/** Estats que admeten cobraments. */
export const AMB_COBRAMENTS: EstatSubvencio[] = ['concedida', 'cobrada', 'justificada', 'tancada'];

export interface Subvencio {
  id: number;
  organisme: string;
  convocatoria: string | null;
  linia: string | null;
  expedient: string | null;
  exercici: number;
  import_sollicitat_cents: number;
  import_concedit_cents: number | null;
  pressupost_projecte_cents: number | null;
  data_sollicitud: string | null;
  data_resolucio: string | null;
  periode_inici: string | null;
  periode_fi: string | null;
  termini_justificacio: string | null;
  activitat_id: number | null;
  activitat_nom: string | null;
  estat: EstatSubvencio;
  requisits: string | null;
  notes: string | null;
  memoria: string | null;
  altres_ingressos: string | null;
  data_justificacio: string | null;
  document_nom: string | null;
  document_mime: string | null;
  document_mida: number | null;
  cobrat_cents: number;
  imputat_cents: number;
  n_imputacions: number;
  n_sense_justificant: number;
}

export interface Imputacio {
  id: number;
  subvencio_id: number;
  moviment_id: number;
  import_cents: number;
  creditor: string | null;
  data_emissio: string | null;
  data: string;
  concepte: string;
  justificant: string | null;
  moviment_cents: number;
  categoria_nom: string | null;
  activitat_nom: string | null;
  n_justificants: number;
  imputat_altres_cents: number;
}

export interface Candidat {
  id: number;
  data: string;
  concepte: string;
  import_cents: number;
  justificant: string | null;
  subvencio_id: number | null;
  categoria_nom: string | null;
  activitat_nom: string | null;
  imputat_cents: number;
  n_justificants: number;
}

export interface Justificacio {
  subvencio: Subvencio;
  despeses: Imputacio[];
  per_categoria: { categoria: string; cost_cents: number; imputat_cents: number }[];
  cobraments: { id: number; data: string; concepte: string; import_cents: number }[];
  altres_ingressos: { id: number; data: string; concepte: string; import_cents: number; categoria_nom: string | null }[];
  totals: {
    concedit_cents: number;
    cobrat_cents: number;
    pendent_cobrar_cents: number;
    imputat_cents: number;
    cost_cents: number;
    pressupost_cents: number | null;
    desviacio_cents: number | null;
    desviacio_percent: number | null;
    execucio_percent: number | null;
    falta_imputar_cents: number;
    altres_ingressos_cents: number;
    sense_justificant: number;
  };
}

/** Fitxer adjunt (sense les dades) o amb les dades en data URI. */
export interface Fitxer {
  id?: number;
  nom: string;
  mime: string;
  mida: number;
  dades?: string;
  creat_el?: string;
}

export const nomSubvencio = (s: Pick<Subvencio, 'organisme' | 'convocatoria' | 'exercici'>) =>
  [s.organisme, s.convocatoria].filter(Boolean).join(' · ') + ` (${s.exercici})`;
