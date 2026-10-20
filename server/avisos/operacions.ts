// Avisos del tauler del mòdul «operacions»: còpies de seguretat.
import type { Avis } from './tipus.ts';
import { getConfig } from '../db.ts';
import { CLAU_CARPETA_EXTERNA, copiesDisponibles, dataDarreraCopia } from '../copies.ts';
import { sumaDies } from '../../shared/dates.ts';

const ENLLAC = '/configuracio';

export function avisos(): Avis[] {
  // A la demostració no hi ha còpies (ni sistema de fitxers).
  if (!copiesDisponibles() || !getConfig('inicialitzat')) return [];
  const llista: Avis[] = [];
  const darrera = dataDarreraCopia();
  if (!darrera) {
    llista.push({ text: 'Encara no s’ha fet cap còpia de seguretat.', enllac: ENLLAC, nivell: 'alerta', modul: 'config' });
  } else if (darrera < sumaDies(-7)) {
    llista.push({ text: 'Fa més de 7 dies que no es fa cap còpia de seguretat (la darrera és del {0}).', valors: [darrera.split('-').reverse().join('/')],enllac: ENLLAC, nivell: 'alerta', modul: 'config' });
  }
  const externa = getConfig(CLAU_CARPETA_EXTERNA);
  const errorExterna = getConfig('copia_externa_error');
  if (externa && errorExterna) {
    llista.push({ text: 'No s’ha pogut desar la còpia de seguretat a la carpeta externa {0}.', valors: [externa], enllac: ENLLAC, nivell: 'alerta', modul: 'config' });
  } else if (!externa && darrera) {
    llista.push({
      text: 'Les còpies de seguretat només es guarden en aquest ordinador. Configura una carpeta externa (llapis USB o núvol).',
      enllac: ENLLAC, nivell: 'info', modul: 'config',
    });
  }
  return llista;
}
