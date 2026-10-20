// Contingut de l'ajuda: manual d'usuari per articles, preguntes freqüents i glossari, en tres idiomes.
import type { Idioma } from '../i18n';

export type Text3 = Record<Idioma, string>;

export type IdSeccio = 'primers-passos' | 'persones' | 'activitats' | 'economia' | 'govern' | 'sistema';

export interface Article {
  /** Identificador estable: forma part de l'adreça (/ajuda/<id>). */
  id: string;
  seccio: IdSeccio;
  titol: Text3;
  /** Una frase: surt a l'índex i als resultats de la cerca. */
  resum: Text3;
  /** Cos en Markdown (shared/markdown.ts): # Títol, ## Subtítol, **negreta**, llistes, [enllaç](/ruta). */
  cos: Text3;
  /** Pantalles del programa on aquest article és l'ajuda contextual (botó «?»): p. ex. ['/quotes']. */
  rutes?: string[];
  /** Paraules extra per a la cerca (en qualsevol idioma). */
  paraules?: string[];
}

export interface Pregunta {
  pregunta: Text3;
  resposta: Text3;
  /** Article on s'amplia la resposta. */
  article?: string;
}

export interface Terme {
  terme: Text3;
  definicio: Text3;
}

export interface Contingut {
  ARTICLES: Article[];
  PREGUNTES: Pregunta[];
  GLOSSARI: Terme[];
}
