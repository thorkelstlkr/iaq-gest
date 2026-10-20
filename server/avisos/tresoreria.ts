// Avisos del tauler del mòdul «tresoreria».
import { all, get, getConfig } from '../db.ts';
import { avui } from '../../shared/dates.ts';
import { ibanValid } from '../../shared/iban.ts';
import { informeFiscal } from '../tresoreria/fiscal.ts';
import type { Avis } from './tipus.ts';

export function avisos(): Avis[] {
  const llista: Avis[] = [];
  const hui = avui();
  const any = Number(hui.slice(0, 4));
  const mes = Number(hui.slice(5, 7));
  const avis = (text: string, nivell: Avis['nivell'], ...valors: (string | number)[]) =>
    llista.push({ text, valors, enllac: '/tresoreria', nivell, modul: 'economia' });

  // Pressupost de l'any en curs.
  const tePressupost = Boolean(get('SELECT 1 AS x FROM pressupost WHERE exercici = ?', any));
  if (!tePressupost && mes > 1) avis('Encara no hi ha pressupost per a {0}.', 'alerta', any);
  else if (tePressupost && !getConfig(`pressupost_aprovat_${any}`)) avis("El pressupost de {0} encara no està aprovat per l'assemblea.", 'info', any);

  // Exercici anterior sense tancar passat el 30 de juny.
  const anterior = any - 1;
  const hiHaMoviments = Boolean(get('SELECT 1 AS x FROM moviments WHERE data BETWEEN ? AND ?', `${anterior}-01-01`, `${anterior}-12-31`));
  if (hiHaMoviments && mes > 6 && !get('SELECT 1 AS x FROM exercicis_tancats WHERE exercici = ?', anterior))
    avis("L'exercici {0} encara no està tancat.", 'alerta', anterior);

  // Socis que paguen per domiciliació sense mandat o amb un IBAN no vàlid.
  const domiciliats = all<{ iban: string | null; referencia: string | null; data_signatura: string | null; actiu: number }>(
    `SELECT s.iban, m.referencia, m.data_signatura, m.actiu FROM mandats_sepa m JOIN socis s ON s.id = m.soci_id
      WHERE m.metode = 'domiciliacio' AND (s.data_baixa IS NULL OR s.data_baixa >= ?)`,
    hui,
  );
  const senseMandat = domiciliats.filter((d) => !d.referencia || !d.data_signatura || !d.actiu).length;
  const ibanDolent = domiciliats.filter((d) => !d.iban || !ibanValid(d.iban)).length;
  if (senseMandat) avis('{0} socis paguen per domiciliació però no tenen mandat SEPA.', 'alerta', senseMandat);
  if (ibanDolent) avis('{0} socis paguen per domiciliació però no tenen un IBAN vàlid.', 'alerta', ibanDolent);

  // Rebuts retornats que encara no s'han tornat a cobrar.
  const retornats = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM remesa_linies l JOIN quotes q ON q.id = l.quota_id
      WHERE l.estat = 'retornada' AND q.estat = 'pendent'`,
  )!.n;
  if (retornats) avis('{0} rebuts domiciliats retornats pendents de cobrar.', 'info', retornats);

  // Model 200 (Impost de Societats) de l'exercici anterior: es presenta fins al 25 de juliol.
  if ((mes === 6 || mes === 7) && hui <= `${any}-07-25` && hiHaMoviments) {
    const f = informeFiscal(anterior);
    if (f.obligat) avis("Cal presentar l'Impost de Societats (model 200) de {0} abans del 25 de juliol.", 'alerta', anterior);
  }
  return llista;
}
