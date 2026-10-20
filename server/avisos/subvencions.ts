// Avisos del tauler del mòdul «subvencions».
import { all } from '../db.ts';
import { avui, dataLocal, sumaDies } from '../../shared/dates.ts';
import type { Avis } from './tipus.ts';

/** Data local de fa `mesos` mesos. */
function faMesos(mesos: number, des = new Date()): string {
  const d = new Date(des);
  d.setMonth(d.getMonth() - mesos);
  return dataLocal(d);
}

const dma = (iso: string) => iso.split('-').reverse().join('/');

interface Fila {
  id: number;
  organisme: string;
  convocatoria: string | null;
  exercici: number;
  termini_justificacio: string | null;
  data_resolucio: string | null;
  data_sollicitud: string | null;
  import_concedit_cents: number | null;
  cobrat_cents: number;
  sense_justificant: number;
}

export function avisos(): Avis[] {
  const llista: Avis[] = [];
  const hui = avui();
  const avis = (text: string, nivell: Avis['nivell'], ...valors: (string | number)[]) =>
    llista.push({ text, valors, enllac: '/subvencions', nivell, modul: 'economia' });
  const nom = (s: Fila) => [s.organisme, s.convocatoria].filter(Boolean).join(' · ');

  const files = all<Fila & { estat: string }>(
    `SELECT s.id, s.organisme, s.convocatoria, s.exercici, s.termini_justificacio, s.data_resolucio, s.data_sollicitud,
            s.import_concedit_cents, s.estat,
            COALESCE((SELECT SUM(m.import_cents) FROM moviments m WHERE m.subvencio_id = s.id AND m.tipus = 'ingres'), 0) AS cobrat_cents,
            (SELECT COUNT(*) FROM subvencio_imputacions i WHERE i.subvencio_id = s.id
                AND NOT EXISTS (SELECT 1 FROM justificants j WHERE j.moviment_id = i.moviment_id)) AS sense_justificant
       FROM subvencions s
      WHERE s.estat IN ('sollicitada', 'concedida', 'cobrada', 'justificada')
      ORDER BY s.termini_justificacio, s.id`,
  );
  const limit30 = sumaDies(30);
  const fa6Mesos = faMesos(6);

  for (const s of files) {
    const perJustificar = s.estat === 'concedida' || s.estat === 'cobrada';
    // Termini de justificació proper (30 dies) o vençut sense haver justificat.
    if (perJustificar && s.termini_justificacio) {
      if (s.termini_justificacio < hui)
        avis("El termini per justificar la subvenció «{0}» ({1}) va vèncer el {2}.", 'alerta', nom(s), s.exercici, dma(s.termini_justificacio));
      else if (s.termini_justificacio <= limit30)
        avis("Cal justificar la subvenció «{0}» ({1}) abans del {2}.", 'alerta', nom(s), s.exercici, dma(s.termini_justificacio));
    }
    // Despeses imputades sense el justificant adjunt (s'han de presentar i conservar).
    if (perJustificar && s.sense_justificant > 0)
      avis("{0} despeses imputades a la subvenció «{1}» no tenen el justificant adjunt.", 'alerta', s.sense_justificant, nom(s));
    // Concedida però no cobrada del tot sis mesos després de la resolució.
    if (
      ['concedida', 'cobrada', 'justificada'].includes(s.estat) && s.data_resolucio && s.data_resolucio <= fa6Mesos &&
      (s.import_concedit_cents ?? 0) > s.cobrat_cents
    )
      avis("La subvenció «{0}» es va concedir el {1} i encara no s'ha cobrat del tot.", 'info', nom(s), dma(s.data_resolucio));
    // Sol·licituds sense resolució passats sis mesos.
    if (s.estat === 'sollicitada' && !s.data_resolucio && s.data_sollicitud && s.data_sollicitud <= fa6Mesos)
      avis("La sol·licitud de subvenció «{0}» es va presentar el {1} i encara no està resolta.", 'info', nom(s), dma(s.data_sollicitud));
  }
  return llista;
}
