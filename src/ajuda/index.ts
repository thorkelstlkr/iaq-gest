// Tot el contingut de l'ajuda i les funcions per trobar-lo (índex, cerca i ajuda contextual).
import { idioma } from '../i18n';
import type { Article, IdSeccio, Pregunta, Terme, Text3 } from './tipus';
import * as persones from './contingut/persones';
import * as economia from './contingut/economia';
import * as programa from './contingut/programa';

const PARTS = [programa, persones, economia];

export const ARTICLES: Article[] = PARTS.flatMap((p) => p.ARTICLES);
export const PREGUNTES: Pregunta[] = PARTS.flatMap((p) => p.PREGUNTES);
export const GLOSSARI: Terme[] = PARTS.flatMap((p) => p.GLOSSARI);

export const SECCIONS: IdSeccio[] = ['primers-passos', 'persones', 'activitats', 'economia', 'govern', 'sistema'];

/** Text en l'idioma actual (amb el català de reserva). */
export const tx = (t: Text3) => t[idioma()] || t.ca;

export const articlePerId = (id: string) => ARTICLES.find((a) => a.id === id);

/** Article d'ajuda de la pantalla actual: el de la ruta més llarga que hi coincideix. */
export function articlePerRuta(cami: string): Article | undefined {
  let millor: Article | undefined;
  let llargada = -1;
  for (const a of ARTICLES) {
    for (const r of a.rutes ?? []) {
      const coincideix = r === '/' ? cami === '/' : cami === r || cami.startsWith(`${r}/`);
      if (coincideix && r.length > llargada) {
        millor = a;
        llargada = r.length;
      }
    }
  }
  return millor;
}

const normalitza = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9·]+/g, ' ');

/** Cerca en títols, resums, cos i paraules clau; els resultats amb més coincidències (i al títol) primer. */
export function cerca(consulta: string): { article: Article; punts: number }[] {
  const paraules = normalitza(consulta).split(' ').filter((p) => p.length > 1);
  if (!paraules.length) return [];
  return ARTICLES.map((article) => {
    const titol = normalitza(tx(article.titol));
    const resta = normalitza(`${tx(article.resum)} ${tx(article.cos)} ${(article.paraules ?? []).join(' ')}`);
    let punts = 0;
    for (const p of paraules) {
      if (titol.includes(p)) punts += 5;
      if (resta.includes(p)) punts += 1 + Math.min(3, resta.split(p).length - 2);
    }
    // Només si hi són totes les paraules.
    const totes = paraules.every((p) => titol.includes(p) || resta.includes(p));
    return { article, punts: totes ? punts : 0 };
  })
    .filter((r) => r.punts > 0)
    .sort((a, b) => b.punts - a.punts);
}
