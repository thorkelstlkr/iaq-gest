// Avisos del tauler del mòdul «governanca»: mandats que acaben, canvis de la junta pendents de comunicar
// al Registre d'Associacions, assemblea ordinària anual i actes pendents d'aprovar.
import { all, get } from '../db.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import type { Avis } from './tipus.ts';

const dma = (iso: string) => iso.split('-').reverse().join('/');

export function avisos(): Avis[] {
  const llista: Avis[] = [];
  const ara = avui();
  const base = { enllac: '/governanca', modul: 'socis' as const };

  // Mandats vençuts o que acaben dins dels pròxims 60 dies (càrrecs vigents).
  const mandats = all<{ nom: string; llinatges: string; data_fi_mandat: string }>(
    `SELECT s.nom, s.llinatges, c.data_fi_mandat FROM carrecs c JOIN socis s ON s.id = c.soci_id
      WHERE c.data_eleccio <= ? AND (c.data_cessament IS NULL OR c.data_cessament > ?)
        AND c.data_fi_mandat IS NOT NULL AND c.data_fi_mandat <= ?
      ORDER BY c.data_fi_mandat`,
    ara, ara, sumaDies(60),
  );
  for (const m of mandats) {
    const nom = `${m.nom} ${m.llinatges}`.trim();
    if (m.data_fi_mandat < ara)
      llista.push({ ...base, nivell: 'alerta', text: 'El mandat de {0} a la junta directiva va vèncer el {1}.', valors: [nom, dma(m.data_fi_mandat)] });
    else llista.push({ ...base, nivell: 'info', text: 'El mandat de {0} a la junta directiva acaba el {1}.', valors: [nom, dma(m.data_fi_mandat)] });
  }

  // Canvis de la junta (nomenaments i cessaments ja efectius) pendents de comunicar al Registre.
  const pendents = get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM carrecs WHERE comunicat_registre_el IS NULL AND data_eleccio <= ?)
          + (SELECT COUNT(*) FROM carrecs WHERE data_cessament IS NOT NULL AND data_cessament <= ? AND cessament_comunicat_el IS NULL) AS n`,
    ara, ara,
  )!.n;
  if (pendents)
    llista.push({
      ...base,
      nivell: 'alerta',
      text: "{0} canvis de la junta directiva pendents de comunicar al Registre d'Associacions.",
      valors: [pendents],
    });

  // Assemblea general ordinària de l'any (aprovació de comptes i pressupost) a partir de l'1 de juliol.
  const any = ara.slice(0, 4);
  if (ara > `${any}-06-30`) {
    const feta = get(
      "SELECT 1 FROM reunions WHERE organ = 'assemblea' AND tipus = 'ordinaria' AND estat = 'celebrada' AND strftime('%Y', data) = ?",
      any,
    );
    if (!feta)
      llista.push({
        ...base,
        nivell: 'alerta',
        text: "Encara no s'ha celebrat l'assemblea general ordinària de {0} (aprovació de comptes i pressupost).",
        valors: [any],
      });
  }

  // Reunions celebrades fa més de 30 dies sense acta aprovada.
  const senseActa = all<{ data: string }>(
    `SELECT r.data FROM reunions r LEFT JOIN actes a ON a.reunio_id = r.id
      WHERE r.estat = 'celebrada' AND r.data < ? AND (a.id IS NULL OR a.tancada = 0)
      ORDER BY r.data`,
    sumaDies(-30),
  );
  for (const r of senseActa)
    llista.push({ ...base, nivell: 'info', text: "L'acta de la reunió del {0} encara no està aprovada.", valors: [dma(r.data)] });

  return llista;
}
