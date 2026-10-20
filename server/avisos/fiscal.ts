// Avisos del tauler del mòdul «fiscal»: models de retencions, model 347 i extractes per conciliar.
import { get } from '../db.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import { LLINDAR_347, model347, resumAnual, resumTrimestral, terminiTrimestral } from '../routes/fiscal.ts';
import type { Avis } from './tipus.ts';

/** Avisos per a una data concreta (per a les proves); per defecte, avui. */
export function avisosA(hui: string): Avis[] {
  const llista: Avis[] = [];
  const any = Number(hui.slice(0, 4));
  const mes = Number(hui.slice(5, 7));
  const avis = (text: string, nivell: Avis['nivell'], enllac: string, ...valors: (string | number)[]) =>
    llista.push({ text, valors, enllac, nivell, modul: 'economia' });

  // Models trimestrals 111 i 115: termini dins dels 15 dies següents i retencions sense ingressar.
  const limit = sumaDies(15, new Date(`${hui}T12:00:00`));
  for (const [exercici, trimestre] of [[any - 1, 4], [any, 1], [any, 2], [any, 3]] as const) {
    const termini = terminiTrimestral(exercici, trimestre);
    if (termini < hui || termini > limit) continue;
    for (const model of ['111', '115'] as const) {
      const r = resumTrimestral(model, exercici)[trimestre - 1];
      if (r.retencio_cents > 0 && !r.pagament)
        avis('Cal presentar el model {0} del {1}T de {2} abans del {3}.', 'alerta', '/tresoreria?pestanya=tercers', model, trimestre, exercici, termini.split('-').reverse().join('/'));
    }
  }

  // Resums anuals 190 i 180: durant el gener (fins al 31).
  if (mes === 1) {
    if (resumAnual('111', any - 1).length)
      avis("Cal presentar el resum anual de retencions (model 190) de {0} abans del 31 de gener.", 'alerta', '/tresoreria?pestanya=tercers', any - 1);
    if (resumAnual('115', any - 1).length)
      avis("Cal presentar el resum anual de retencions per lloguers (model 180) de {0} abans del 31 de gener.", 'alerta', '/tresoreria?pestanya=tercers', any - 1);
  }

  // Model 347 (informatiu): al febrer, si algun tercer supera 3.005,06 €.
  if (mes === 2) {
    const n = model347(any - 1).filter((f) => f.total_cents > LLINDAR_347).length;
    if (n) avis('{0} tercers superen 3.005,06 € el {1}: reviseu si cal presentar el model 347 (fins al 28 de febrer).', 'info', '/tresoreria?pestanya=tercers', n, any - 1);
  }

  // Línies d'extracte pendents de conciliar de fa més de 30 dies.
  const pendents = get<{ n: number }>("SELECT COUNT(*) AS n FROM extracte_linies WHERE estat = 'pendent' AND data < ?", sumaDies(-30, new Date(`${hui}T12:00:00`)))!.n;
  if (pendents) avis("{0} línies d'extractes bancaris fa més de 30 dies que estan pendents de conciliar.", 'info', '/tresoreria?pestanya=extractes', pendents);
  return llista;
}

export function avisos(): Avis[] {
  return avisosA(avui());
}
