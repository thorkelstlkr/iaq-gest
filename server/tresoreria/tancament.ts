// Exercicis tancats: comprovacions abans de tocar moviments i traducció de l'error dels disparadors.
import { all, get } from '../db.ts';
import { HttpError } from '../util.ts';
import { MISSATGE_TANCAT } from '../esquema/tresoreria.ts';

export const exercicisTancats = (): number[] =>
  all<{ exercici: number }>('SELECT exercici FROM exercicis_tancats ORDER BY exercici').map((r) => r.exercici);

export const exerciciTancat = (exercici: number) =>
  Boolean(get('SELECT 1 AS x FROM exercicis_tancats WHERE exercici = ?', exercici));

/** Llança un error 409 si alguna de les dates (YYYY-MM-DD) cau en un exercici tancat. */
export function comprovaObert(...dates: (string | null | undefined)[]) {
  for (const d of dates) {
    if (!d) continue;
    const any = Number(d.slice(0, 4));
    if (exerciciTancat(any)) throw new HttpError(409, `L'exercici ${any} està tancat: no es poden afegir, modificar ni eliminar els seus moviments.`);
  }
}

/** Executa fn i converteix l'error dels disparadors d'exercici tancat en un error 409 llegible. */
export function ambTancament<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Error && e.message.includes(MISSATGE_TANCAT.slice(0, 20))) throw new HttpError(409, MISSATGE_TANCAT);
    throw e;
  }
}
