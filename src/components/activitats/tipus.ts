// Tipus i textos compartits de la pantalla d'activitats (inscripcions, assistència i documents).
import type { Activitat } from '../../../shared/types';
import { t } from '../../i18n';

export type EstatActivitat = 'idea' | 'preparacio' | 'confirmada' | 'feta' | 'anul·lada';
export type EstatInscripcio = 'inscrit' | 'espera' | 'cancel·lat';

/** Activitat amb els camps de planificació i els comptadors d'inscripció (GET /activitats). */
export interface ActivitatPlena extends Activitat {
  estat: EstatActivitat;
  places: number | null;
  assistents_anonims: number;
  responsable_soci_id: number | null;
  responsable_nom: string | null;
  pressupost_cents: number | null;
  materials: string | null;
  public_objectiu: string | null;
  inscrits: number;
  en_espera: number;
  assistents: number;
  tasques_pendents: number;
  promocionats?: Promocionat[];
}

/** Inscripció a una activitat (GET /crm/activitats/:id/participants). */
export interface Participant {
  id: number;
  activitat_id: number;
  soci_id: number | null;
  interessat_id: number | null;
  tipus: 'soci' | 'interessat' | 'extern';
  nom: string;
  num_soci: number | null;
  nom_extern: string | null;
  data_naixement: string | null;
  genere: string | null;
  telefon: string | null;
  email: string | null;
  tutor: string | null;
  tutor_telefon: string | null;
  estat: EstatInscripcio;
  inscrit_el: string;
  assistit: number;
  autoritzacio_tutor: string | null;
  drets_imatge: number;
  drets_imatge_consta: number;
  notes: string | null;
  edat: number | null;
  franja: string;
  menor: boolean;
}

/** Persona que ha passat de la llista d'espera a inscrita: cal avisar-la. */
export interface Promocionat {
  id: number;
  nom: string;
  telefon: string | null;
  email: string | null;
  tutor: string | null;
}

export const ESTATS_ACTIVITAT: Record<EstatActivitat, string> = {
  idea: t("Idea"),
  preparacio: t("En preparació"),
  confirmada: t("Confirmada"),
  feta: t("Feta"),
  'anul·lada': t("Anul·lada"),
};

export const ESTATS_INSCRIPCIO: Record<EstatInscripcio, string> = {
  inscrit: t("Inscrit/a"),
  espera: t("En espera"),
  'cancel·lat': t("Cancel·lat/da"),
};

/** Menor sense l'autorització signada del pare, la mare o el tutor legal. */
export const senseAutoritzacio = (p: Participant) => p.menor && !p.autoritzacio_tutor && p.estat !== 'cancel·lat';

/** Text per avisar les persones que han entrat de la llista d'espera. */
export const contacte = (p: Promocionat) =>
  [p.tutor && t("tutor/a: {0}", p.tutor), p.telefon, p.email].filter(Boolean).join(' · ');
