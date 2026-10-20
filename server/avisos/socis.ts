// Avisos del tauler del mòdul «socis».
import { get } from '../db.ts';
import type { Avis } from './tipus.ts';

export function avisos(): Avis[] {
  const llista: Avis[] = [];
  const pendents = get<{ n: number; antigues: number }>(
    `SELECT COUNT(*) AS n, COUNT(CASE WHEN data_alta < date('now', 'localtime', '-60 days') THEN 1 END) AS antigues
       FROM socis WHERE estat_admissio = 'sollicitada'`,
  )!;
  if (pendents.n === 1) {
    llista.push({ text: "Hi ha 1 sol·licitud d'admissió de soci pendent de resoldre.", enllac: '/socis?estat=sollicituds', nivell: pendents.antigues ? 'alerta' : 'info', modul: 'socis' });
  } else if (pendents.n > 1) {
    llista.push({
      text: "Hi ha {0} sol·licituds d'admissió de soci pendents de resoldre.",
      valors: [pendents.n],
      enllac: '/socis?estat=sollicituds',
      nivell: pendents.antigues ? 'alerta' : 'info',
      modul: 'socis',
    });
  }
  return llista;
}
