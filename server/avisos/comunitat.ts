// Avisos del tauler del mòdul «comunitat»: assegurances que vencen, voluntariat sense assegurança d'accidents,
// certificats de delictes sexuals (art. 8.4 Llei 45/2015), acords d'incorporació pendents i convenis que acaben.
import { all } from '../db.ts';
import { avui, sumaDies } from '../../shared/dates.ts';
import { cobertura, configComunitat, estatCertificat, polissesVigents, voluntariActius } from '../routes/comunitat.ts';
import type { Avis } from './tipus.ts';

const dma = (iso: string) => iso.split('-').reverse().join('/');

export function avisos(ara = avui()): Avis[] {
  const llista: Avis[] = [];
  const vol = { enllac: '/voluntariat', modul: 'socis' as const };
  const d30 = sumaDies(30, new Date(`${ara}T12:00:00`));
  const d60 = sumaDies(60, new Date(`${ara}T12:00:00`));

  // Pòlisses vençudes o que vencen dins de 30 dies, si no n'hi ha cap altra del mateix tipus que vengui més tard.
  const pols = all<{ id: number; asseguradora: string; num_polissa: string | null; tipus: string; data_venciment: string; no_renovar: number }>(
    'SELECT id, asseguradora, num_polissa, tipus, data_venciment, no_renovar FROM assegurances ORDER BY data_venciment',
  );
  for (const p of pols) {
    if (p.no_renovar || p.data_venciment > d30) continue;
    if (pols.some((q) => q.id !== p.id && q.tipus === p.tipus && q.data_venciment > p.data_venciment)) continue;
    const venc = p.data_venciment < ara;
    if (p.num_polissa)
      llista.push({
        ...vol,
        nivell: 'alerta',
        text: venc ? "L'assegurança {0} (pòlissa {1}) va vèncer el {2}." : "L'assegurança {0} (pòlissa {1}) venç el {2}.",
        valors: [p.asseguradora, p.num_polissa, dma(p.data_venciment)],
      });
    else
      llista.push({
        ...vol,
        nivell: 'alerta',
        text: venc ? "L'assegurança {0} va vèncer el {1}." : "L'assegurança {0} venç el {1}.",
        valors: [p.asseguradora, dma(p.data_venciment)],
      });
  }

  const actius = voluntariActius(ara);
  if (actius.length) {
    // Assegurança d'accidents i responsabilitat civil obligatòria (art. 10 Llei 45/2015).
    const hiHaPolissa = polissesVigents(ara).some((p) => p.tipus === 'accidents_voluntaris');
    const cob = cobertura(ara);
    const sense = actius.filter((v) => !cob.get(v.id)?.accidents);
    if (!hiHaPolissa)
      llista.push({
        ...vol,
        nivell: 'alerta',
        text: "Hi ha {0} persones voluntàries actives i cap assegurança d'accidents vigent (art. 10 de la Llei 45/2015).",
        valors: [actius.length],
      });
    else if (sense.length)
      llista.push({ ...vol, nivell: 'alerta', text: "{0} persones voluntàries actives no estan cobertes per l'assegurança d'accidents.", valors: [sense.length] });

    // Certificat negatiu del Registre Central de Delinqüents Sexuals per a qui treballa amb menors.
    const mesos = configComunitat().vol_validesa_certificat_mesos;
    for (const v of actius) {
      const c = estatCertificat(v, mesos, ara);
      const nom = `${v.nom} ${v.llinatges}`.trim();
      if (c.estat === 'falta')
        llista.push({ ...vol, nivell: 'alerta', text: '{0} treballa amb menors i no té el certificat negatiu del Registre Central de Delinqüents Sexuals.', valors: [nom] });
      else if (c.estat === 'caducat')
        llista.push({ ...vol, nivell: 'alerta', text: 'El certificat de delictes sexuals de {0} va caducar el {1}.', valors: [nom, dma(c.caduca!)] });
      else if (c.estat === 'caduca_aviat')
        llista.push({ ...vol, nivell: 'info', text: 'El certificat de delictes sexuals de {0} caduca el {1}.', valors: [nom, dma(c.caduca!)] });
    }

    // Acord d'incorporació per escrit (art. 12 Llei 45/2015).
    const senseAcord = actius.filter((v) => !v.acord_signat_el).length;
    if (senseAcord)
      llista.push({ ...vol, nivell: 'alerta', text: "{0} persones voluntàries actives no tenen signat l'acord d'incorporació.", valors: [senseAcord] });
  }

  // Convenis vigents que acaben (sense renovació automàtica).
  const convenis = all<{ titol: string; entitat: string; data_fi: string }>(
    `SELECT c.titol, e.nom AS entitat, c.data_fi FROM convenis c JOIN entitats_collaboradores e ON e.id = c.entitat_id
      WHERE c.estat = 'vigent' AND c.renovacio_automatica = 0 AND c.data_fi IS NOT NULL AND c.data_fi <= ?
      ORDER BY c.data_fi`,
    d60,
  );
  for (const c of convenis) {
    const base = { enllac: '/collaboradors', modul: 'socis' as const };
    if (c.data_fi < ara)
      llista.push({ ...base, nivell: 'alerta', text: 'El conveni «{0}» amb {1} va acabar el {2}.', valors: [c.titol, c.entitat, dma(c.data_fi)] });
    else llista.push({ ...base, nivell: 'info', text: 'El conveni «{0}» amb {1} acaba el {2}.', valors: [c.titol, c.entitat, dma(c.data_fi)] });
  }

  return llista;
}
