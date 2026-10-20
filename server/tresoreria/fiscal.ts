// Impost de Societats de les entitats parcialment exemptes (art. 9.3, 110 a 112 i 124.3 de la Llei 27/2014, LIS).
import { all, db, getConfig } from '../db.ts';
import { SQL_VALORS_FISCALS } from '../esquema/tresoreria.ts';

export const LIMIT_INGRESSOS_CENTS = 75_000_00;
export const LIMIT_NO_EXEMPTES_CENTS = 2_000_00;

export interface DadesModel200 {
  total_cents: number;
  no_exempts_cents: number;
  /** Rendes no exemptes que NO estan sotmeses a retenció. */
  no_exempts_sense_retencio_cents: number;
}

/**
 * Art. 124.3 LIS: no cal presentar la declaració si (a) els ingressos totals no superen 75.000 €,
 * (b) els ingressos de rendes no exemptes no superen 2.000 € i (c) totes les rendes no exemptes estan sotmeses a retenció.
 */
export function obligacioModel200(d: DadesModel200): { obligat: boolean; motius: string[] } {
  const motius: string[] = [];
  if (d.total_cents > LIMIT_INGRESSOS_CENTS) motius.push('Els ingressos totals superen 75.000 €.');
  if (d.no_exempts_cents > LIMIT_NO_EXEMPTES_CENTS) motius.push('Les rendes no exemptes superen 2.000 €.');
  if (d.no_exempts_sense_retencio_cents > 0) motius.push('Hi ha rendes no exemptes que no estan sotmeses a retenció.');
  return { obligat: motius.length > 0, motius };
}

/** Termini de presentació del model 200 (exercici natural): 25 de juliol de l'any següent. */
export const terminiModel200 = (exercici: number) => `${exercici + 1}-07-25`;

export interface CategoriaFiscal {
  id: number;
  nom: string;
  tipus: 'ingres' | 'despesa';
  actiu: number;
  renda_exempta: number;
  subjecta_retencio: number;
  import_cents: number;
}

export function informeFiscal(exercici: number) {
  db.exec(SQL_VALORS_FISCALS); // categories creades després de l'arrencada
  const categories = all<CategoriaFiscal>(
    `SELECT c.id, c.nom, c.tipus, c.actiu, COALESCE(c.renda_exempta, 0) AS renda_exempta, c.subjecta_retencio,
            COALESCE((SELECT SUM(m.import_cents) FROM moviments m
                       WHERE m.categoria_id = c.id AND m.tipus = 'ingres' AND m.data BETWEEN ? AND ?), 0) AS import_cents
       FROM categories c WHERE c.tipus = 'ingres' ORDER BY c.nom`,
    `${exercici}-01-01`, `${exercici}-12-31`,
  );
  // Els rebuts retornats es resten dels ingressos per quotes (exempts).
  const catDev = Number(getConfig('categoria_devolucions')) || 0;
  const devolucions = catDev
    ? all<{ s: number }>(
        "SELECT COALESCE(SUM(import_cents), 0) AS s FROM moviments WHERE categoria_id = ? AND tipus = 'despesa' AND data BETWEEN ? AND ?",
        catDev, `${exercici}-01-01`, `${exercici}-12-31`,
      )[0].s
    : 0;
  const suma = (f: (c: CategoriaFiscal) => boolean) => categories.filter(f).reduce((s, c) => s + c.import_cents, 0);
  const exempts = Math.max(0, suma((c) => Boolean(c.renda_exempta)) - devolucions);
  const no_exempts_cents = suma((c) => !c.renda_exempta);
  const dades: DadesModel200 = {
    total_cents: exempts + no_exempts_cents,
    no_exempts_cents,
    no_exempts_sense_retencio_cents: suma((c) => !c.renda_exempta && !c.subjecta_retencio),
  };
  return {
    exercici,
    categories,
    devolucions_cents: devolucions,
    exempts_cents: exempts,
    ...dades,
    ...obligacioModel200(dades),
    termini: terminiModel200(exercici),
  };
}
