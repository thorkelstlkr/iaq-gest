// Traducció de la interfície.
//
// Els textos s'escriuen en català directament al codi, embolcallats amb t():
//   t('Socis')                       → «Socis» / «Socios» / «Members»
//   t('Factura {0} emesa.', num)     → amb valors posicionals {0}, {1}…
// Els diccionaris (i18n/es.ts, i18n/en.ts) tradueixen del català a cada idioma. Si un text no hi és,
// es mostra en català: res no queda trencat. `npm run i18n` llista els textos pendents de traduir.

import es from './i18n/es';
import en from './i18n/en';

export const IDIOMES = {
  ca: { nom: 'Català', locale: 'ca-ES' },
  es: { nom: 'Castellano', locale: 'es-ES' },
  en: { nom: 'English', locale: 'en-GB' },
} as const;

export type Idioma = keyof typeof IDIOMES;

const DICCIONARIS: Record<Idioma, Record<string, string>> = { ca: {}, es, en };
const CLAU = 'idioma';

export const esIdioma = (v: unknown): v is Idioma => typeof v === 'string' && v in IDIOMES;

function idiomaInicial(): Idioma {
  try {
    const desat = localStorage.getItem(CLAU);
    if (esIdioma(desat)) return desat;
  } catch {
    /* sense emmagatzematge */
  }
  const nav = navigator.language?.slice(0, 2);
  return esIdioma(nav) ? nav : 'ca';
}

let actual: Idioma = idiomaInicial();
document.documentElement.lang = actual;

export const idioma = () => actual;
export const locale = () => IDIOMES[actual].locale;

export function t(text: string, ...valors: unknown[]): string {
  const traduit = DICCIONARIS[actual][text] ?? text;
  return valors.length ? traduit.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < valors.length ? String(valors[Number(i)]) : m)) : traduit;
}

/**
 * Canvia l'idioma de la interfície. Com que alguns textos es calculen en carregar el programa
 * (menús, llistes d'opcions…), es torna a carregar la pàgina perquè tot surti en el nou idioma.
 */
export function canviaIdioma(nou: Idioma) {
  if (nou === actual) return;
  let desat = false;
  try {
    localStorage.setItem(CLAU, nou);
    desat = localStorage.getItem(CLAU) === nou;
  } catch {
    /* sense emmagatzematge */
  }
  // Si el navegador no deixa desar-ho, no es recarrega (es tornaria a l'idioma anterior i entraria en bucle).
  if (desat) location.reload();
}

/** Selector d'idioma reutilitzable: llista d'opcions per a un <select>. */
export const opcionsIdioma = () => Object.entries(IDIOMES).map(([codi, i]) => ({ codi: codi as Idioma, nom: i.nom }));
