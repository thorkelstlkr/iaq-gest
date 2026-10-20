// Traducció dels missatges del servidor (errors, avisos, capçaleres de CSV…).
//
// El codi escriu els missatges en català; aquí es tradueixen a l'idioma de qui fa la petició
// (capçalera «X-Idioma», o el paràmetre «idioma» per als enllaços de descàrrega).
// Els missatges amb valors variables es reconeixen per plantilla: «El camp «{0}» és obligatori.»

import type { Request } from 'express';
import es from './i18n/es.ts';
import en from './i18n/en.ts';
import { webEn, webEs } from './i18n/web.ts';
import { modulsEn, modulsEs } from './i18n/moduls/index.ts';

export type Idioma = 'ca' | 'es' | 'en';
export const IDIOMES: Idioma[] = ['ca', 'es', 'en'];
const DICCIONARIS: Record<Idioma, Record<string, string>> = { ca: {}, es: { ...webEs, ...es, ...modulsEs }, en: { ...webEn, ...en, ...modulsEn } };

export const esIdioma = (v: unknown): v is Idioma => typeof v === 'string' && (IDIOMES as string[]).includes(v);

export function idiomaDe(req: Request): Idioma {
  const v = (req.query?.idioma as string) || req.headers?.['x-idioma'];
  return esIdioma(v) ? v : 'ca';
}

// Plantilles amb {0}, {1}… convertides en expressions regulars (es calculen una sola vegada).
const plantilles = new Map<Idioma, { re: RegExp; desti: string }[]>();
function plantillesDe(idioma: Idioma) {
  let p = plantilles.get(idioma);
  if (!p) {
    p = Object.entries(DICCIONARIS[idioma])
      .filter(([clau]) => /\{\d+\}/.test(clau))
      .map(([clau, desti]) => ({
        re: new RegExp(`^${clau.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\d+)\\\}/g, '(?<v$1>[\\s\\S]*?)')}$`),
        desti,
      }));
    plantilles.set(idioma, p);
  }
  return p;
}

/** Tradueix un text (o un missatge ja composat a partir d'una plantilla). */
export function tradueix(text: string, idioma: Idioma): string {
  if (idioma === 'ca' || !text) return text;
  const dic = DICCIONARIS[idioma];
  if (dic[text]) return dic[text];
  for (const { re, desti } of plantillesDe(idioma)) {
    const m = re.exec(text);
    if (m) return desti.replace(/\{(\d+)\}/g, (_, i) => tradueix(m.groups?.[`v${i}`] ?? '', idioma));
  }
  return text;
}

/** t() per al servidor: tradueix i substitueix {0}, {1}… */
export const tr = (idioma: Idioma, text: string, ...valors: unknown[]) =>
  tradueix(text, idioma).replace(/\{(\d+)\}/g, (m, i) => (Number(i) < valors.length ? String(valors[Number(i)]) : m));
