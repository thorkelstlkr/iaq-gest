// Avisos del tauler del mòdul «donatius»: termini del model 182, donants sense NIF i donacions sense certificat.
import { get, getConfig } from '../db.ts';
import { avui } from '../../shared/dates.ts';
import { marquesManuals } from '../calendari.ts';
import type { Avis } from './tipus.ts';

export function avisos(): Avis[] {
  const llista: Avis[] = [];
  const hui = avui();
  const any = Number(hui.slice(0, 4));
  const mes = Number(hui.slice(5, 7));
  const anterior = any - 1;
  const regim = getConfig('regim_49_2002') === 'si';
  const avis = (text: string, nivell: Avis['nivell'], ...valors: (string | number)[]) =>
    llista.push({ text, valors, enllac: '/donatius', nivell, modul: 'economia' });

  // Model 182 de l'any anterior: es presenta durant el mes de gener.
  if (regim && mes === 1 && !marquesManuals(any).has('model182')) {
    const n = get<{ n: number }>(
      'SELECT COUNT(*) AS n FROM donatius WHERE revocada = 0 AND data BETWEEN ? AND ?',
      `${anterior}-01-01`, `${anterior}-12-31`,
    )!.n;
    if (n) avis('Cal presentar el model 182 (declaració de donatius) de {0} abans del 31 de gener.', 'alerta', anterior);
  }

  // Donants d'enguany sense NIF: no es podran declarar ni tindran dret a deducció.
  if (regim) {
    const senseNif = get<{ n: number }>(
      "SELECT COUNT(DISTINCT LOWER(TRIM(nom))) AS n FROM donatius WHERE revocada = 0 AND (nif IS NULL OR nif = '') AND data BETWEEN ? AND ?",
      `${any}-01-01`, `${any}-12-31`,
    )!.n;
    if (senseNif) avis('{0} donants de {1} no tenen NIF: no es podran declarar al model 182.', 'info', senseNif, any);
  }

  // Donacions d'aquest any i de l'anterior sense certificat (o rebut) emès.
  const senseCert = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM donatius d
      WHERE d.revocada = 0 AND d.data BETWEEN ? AND ?
        AND NOT EXISTS (SELECT 1 FROM certificats_donacio c WHERE c.donatiu_id = d.id)
        AND NOT EXISTS (SELECT 1 FROM certificats_donacio_linies l WHERE l.donatiu_id = d.id)`,
    `${anterior}-01-01`, `${any}-12-31`,
  )!.n;
  if (senseCert) avis(regim ? '{0} donacions sense certificat emès.' : '{0} donacions sense rebut emès.', 'info', senseCert);
  return llista;
}
