// Tipus de les eines que el programa ofereix als agents d'IA (MCP, OpenAPI).
import type { Modul } from '../../shared/permisos.ts';

/**
 * Nivell de cada eina:
 * - lectura: només consulta.
 * - escriptura: canvis interns i reversibles (queden al registre d'activitat i a l'auditoria).
 * - proposta: accions amb efecte fora del programa o difícils de desfer (enviar correus, publicar,
 *   cobrar, emetre…). L'agent només en deixa la proposta; una persona l'aprova al programa.
 */
export type NivellEina = 'lectura' | 'escriptura' | 'proposta';

/** Client de l'API interna del programa, amb la identitat de qui fa l'acció (l'agent o la persona que aprova). */
export interface ApiInterna {
  get<T = unknown>(cami: string): Promise<T>;
  post<T = unknown>(cami: string, cos?: unknown): Promise<T>;
  put<T = unknown>(cami: string, cos?: unknown): Promise<T>;
  del<T = unknown>(cami: string): Promise<T>;
}

/** Esquema JSON (subconjunt) dels paràmetres d'una eina. */
export interface EsquemaJson {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Eina {
  /** Nom en anglès i snake_case: és el que entenen millor tots els models. */
  nom: string;
  /** Descripció per al model (en anglès): què fa, quan fer-la servir i què torna. */
  descripcio: string;
  parametres: EsquemaJson;
  nivell: NivellEina;
  /** Mòdul de permisos (shared/permisos.ts): la clau de l'agent hi ha de tenir accés. */
  modul: Modul;
  /** Executa l'eina amb l'API interna. El resultat passa pel filtre de dades sensibles. */
  executa: (args: Record<string, any>, api: ApiInterna) => Promise<unknown>;
  /** Només per a les propostes: descripció en català de què es farà, per a la persona que l'ha d'aprovar. */
  resum?: (args: Record<string, any>, api: ApiInterna) => Promise<string> | string;
}

/** Clau personal d'un agent (taula agent_claus): l'agent actua com la persona propietària. */
export interface ClauAgent {
  id: number;
  nom: string;
  usuari_id: number;
  usuari_nom: string;
  rol: string;
  /** Mòduls del perfil de la persona (shared/permisos.ts): l'agent no en pot tenir més. */
  moduls: Modul[];
  mode: 'lectura' | 'complet';
}
