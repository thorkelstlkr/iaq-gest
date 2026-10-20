// Avisos del tauler del mòdul «activitats».
import { all } from '../db.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import { edatA, esMenor } from '../routes/activitats.ts';
import type { Avis } from './tipus.ts';

const dataCurta = (iso: string) => iso.split('-').reverse().join('/');

export function avisos(): Avis[] {
  const ara = avui();
  const llista: Avis[] = [];

  // Activitats dels pròxims 7 dies amb menors inscrits sense l'autorització del pare, la mare o el tutor.
  const menors = all<{ id: number; nom: string; data_inici: string; naixement: string | null }>(
    `SELECT a.id, a.nom, a.data_inici, COALESCE(s.data_naixement, p.data_naixement) AS naixement
       FROM activitats a JOIN participacions p ON p.activitat_id = a.id LEFT JOIN socis s ON s.id = p.soci_id
      WHERE a.data_inici BETWEEN ? AND ? AND a.estat <> 'anul·lada'
        AND p.estat = 'inscrit' AND p.autoritzacio_tutor IS NULL`,
    ara, sumaDies(7),
  ).filter((r) => esMenor(edatA(r.naixement, r.data_inici)));
  const perActivitat = new Map<number, { nom: string; data: string; n: number }>();
  for (const r of menors) {
    const a = perActivitat.get(r.id) ?? { nom: r.nom, data: r.data_inici, n: 0 };
    a.n++;
    perActivitat.set(r.id, a);
  }
  for (const a of perActivitat.values()) {
    llista.push({
      text: '«{0}» ({1}): {2} menors inscrits sense l’autorització del tutor.',
      valors: [a.nom, dataCurta(a.data), a.n],
      enllac: '/activitats',
      nivell: 'alerta',
      modul: 'activitats',
    });
  }

  // Activitats dels darrers 30 dies amb inscripcions però sense cap assistència registrada.
  for (const a of all<{ nom: string; data_inici: string }>(
    `SELECT a.nom, a.data_inici FROM activitats a
      WHERE COALESCE(a.data_fi, a.data_inici) < ? AND COALESCE(a.data_fi, a.data_inici) >= ? AND a.estat <> 'anul·lada'
        AND EXISTS (SELECT 1 FROM participacions WHERE activitat_id = a.id AND estat = 'inscrit')
        AND NOT EXISTS (SELECT 1 FROM participacions WHERE activitat_id = a.id AND assistit = 1)
      ORDER BY a.data_inici`,
    ara, sumaDies(-30),
  )) {
    llista.push({
      text: '«{0}» ({1}): té inscripcions però no s’hi ha passat llista d’assistència.',
      valors: [a.nom, dataCurta(a.data_inici)],
      enllac: '/activitats',
      nivell: 'info',
      modul: 'activitats',
    });
  }

  // Activitats pròximes plenes amb gent a la llista d'espera.
  for (const a of all<{ nom: string; data_inici: string; espera: number }>(
    `SELECT a.nom, a.data_inici,
       (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'espera') AS espera
     FROM activitats a
     WHERE COALESCE(a.data_fi, a.data_inici) >= ? AND a.estat <> 'anul·lada' AND a.places IS NOT NULL
       AND (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'inscrit') >= a.places
       AND EXISTS (SELECT 1 FROM participacions WHERE activitat_id = a.id AND estat = 'espera')
     ORDER BY a.data_inici`,
    ara,
  )) {
    llista.push({
      text: '«{0}» ({1}) és plena i té {2} persones en llista d’espera.',
      valors: [a.nom, dataCurta(a.data_inici), a.espera],
      enllac: '/activitats',
      nivell: 'info',
      modul: 'activitats',
    });
  }
  return llista;
}
