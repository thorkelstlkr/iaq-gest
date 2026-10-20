import type { Rol } from './permisos.ts';

// Tipus compartits entre el servidor i la interfície.
// Tots els imports monetaris van en cèntims (enters) per evitar errors d'arrodoniment.

export type Genere = 'dona' | 'home' | 'altre' | 'nc';

export interface Soci {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  dni: string | null;
  data_naixement: string | null;
  genere: Genere | null;
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  telefon: string | null;
  email: string | null;
  data_alta: string;
  data_baixa: string | null;
  motiu_baixa: string | null;
  tipus_quota_id: number | null;
  iban: string | null;
  tutor_legal: string | null;
  consentiment_dades: number;
  consentiment_data: string | null;
  consentiment_signant: 'soci' | 'tutor' | null;
  drets_imatge: number;
  accepta_comunicacions: number;
  anonimitzat_el: string | null;
  notes: string | null;
}

export interface SociLlista extends Soci {
  tipus_quota_nom: string | null;
  quota_estat: EstatQuota | null;
  etiquetes: string | null; // ids separats per comes
}

export interface TipusQuota {
  id: number;
  nom: string;
  import_cents: number;
  descripcio: string | null;
  actiu: number;
}

export type EstatQuota = 'pendent' | 'pagada' | 'exempta';

export interface Quota {
  id: number;
  soci_id: number;
  exercici: number;
  import_cents: number;
  estat: EstatQuota;
  data_pagament: string | null;
  moviment_id: number | null;
  num_soci?: number;
  nom_soci?: string;
}

export interface Compte {
  id: number;
  nom: string;
  saldo_inicial_cents: number;
  actiu: number;
  saldo_cents?: number;
}

export type TipusCategoria = 'ingres' | 'despesa';

export interface Categoria {
  id: number;
  nom: string;
  tipus: TipusCategoria;
  actiu: number;
}

export type TipusMoviment = 'ingres' | 'despesa' | 'traspas';

export interface Moviment {
  id: number;
  data: string;
  tipus: TipusMoviment;
  import_cents: number;
  concepte: string;
  categoria_id: number | null;
  compte_id: number;
  compte_desti_id: number | null;
  activitat_id: number | null;
  soci_id: number | null;
  justificant: string | null;
  notes: string | null;
  categoria_nom?: string | null;
  compte_nom?: string;
  compte_desti_nom?: string | null;
  activitat_nom?: string | null;
  soci_nom?: string | null;
}

export interface Activitat {
  id: number;
  nom: string;
  data_inici: string;
  data_fi: string | null;
  lloc: string | null;
  descripcio: string | null;
  objectius: string; // codis separats per comes, p. ex. "a,c,e"
  participants: number | null;
  notes: string | null;
  web_publica?: number;
  imatge?: string | null;
  ingressos_cents?: number;
  despeses_cents?: number;
}

export interface Config {
  nom: string;
  nom_complet: string;
  lema: string;
  nif: string;
  num_registre: string;
  adreca: string;
  poblacio: string;
  codi_postal: string;
  email: string;
  telefon: string;
  web: string;
  iban: string;
  logo: string; // data URI o buit
  idioma: string; // idioma per defecte del programa: ca, es, en
  llicencia_acceptada_el: string; // data i hora ISO en què s'ha acceptat la llicència (buit = pendent)
  llicencia_acceptada_per: string; // nom de qui l'ha acceptada
}

export interface Finalitat {
  codi: string;
  curt: string;
  text: string;
}

export interface Etiqueta {
  id: number;
  nom: string;
  color: string;
  socis?: number;
}

export type TipusInteraccio = 'trucada' | 'correu' | 'reunio' | 'missatge' | 'nota';

export interface Interaccio {
  id: number;
  soci_id: number;
  data: string;
  tipus: TipusInteraccio;
  resum: string;
  autor: string | null;
  soci_nom?: string;
}

export interface Tasca {
  id: number;
  titol: string;
  data_limit: string | null;
  soci_id: number | null;
  soci_nom: string | null;
  feta: number;
  feta_el: string | null;
  notes: string | null;
}

export type EstatInteressat = 'nou' | 'contactat' | 'convertit' | 'descartat';

export interface Interessat {
  id: number;
  nom: string;
  llinatges: string;
  telefon: string | null;
  email: string | null;
  origen: string | null;
  interessos: string | null;
  estat: EstatInteressat;
  soci_id: number | null;
  notes: string | null;
  data: string;
}

export interface Usuari {
  id: number;
  nom: string;
  usuari: string;
  rol: Rol;
  actiu?: number;
  idioma?: string | null;
}

export interface Tauler {
  exercici: number;
  socis_actius: number;
  altes_exercici: number;
  baixes_exercici: number;
  per_franja: { franja: string; total: number }[];
  per_genere: { genere: string; total: number }[];
  quotes: { pendents: number; pendent_cents: number; cobrat_cents: number; previst_cents: number };
  ingressos_cents: number;
  despeses_cents: number;
  comptes: Compte[];
  darrers_moviments: Moviment[];
  properes_activitats: Activitat[];
}

export interface InformeEconomic {
  exercici: number;
  ingressos: { categoria: string; total_cents: number }[];
  despeses: { categoria: string; total_cents: number }[];
  total_ingressos_cents: number;
  total_despeses_cents: number;
  comptes: {
    nom: string;
    saldo_inicial_cents: number;
    entrades_cents: number;
    sortides_cents: number;
    saldo_final_cents: number;
  }[];
  activitats: { nom: string; ingressos_cents: number; despeses_cents: number }[];
}

export interface Noticia {
  id: number;
  titol: string;
  slug: string;
  data: string;
  resum: string | null;
  contingut: string;
  imatge: string | null;
  activitat_id: number | null;
  publicada: number;
}

export interface Pagina {
  id: number;
  titol: string;
  slug: string;
  contingut: string;
  ordre: number;
  publicada: number;
}
