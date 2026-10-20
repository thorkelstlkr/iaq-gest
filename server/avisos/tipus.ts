// Avisos del tauler: cada mòdul indica què cal atendre (terminis, documents que falten…).
import type { Modul } from '../../shared/permisos.ts';

export interface Avis {
  /** Text en català amb {0}, {1}…; la interfície el tradueix amb t(text, ...valors). */
  text: string;
  valors?: (string | number)[];
  /** Ruta de la interfície on es resol (p. ex. '/governanca'). */
  enllac: string;
  nivell: 'alerta' | 'info';
  /** Només el veuen els perfils amb accés a aquest mòdul. */
  modul: Modul;
}
export type FontAvisos = () => Avis[];
