// Finalitats estatutàries de l'Associació I ara qué? (Pollença).
// Ja no s'usen directament: cada entitat edita les seves a Configuració. Aquesta llista
// serveix per migrar les instal·lacions antigues i per a les dades de prova.

export interface Objectiu {
  codi: string;
  curt: string;
  text: string;
}

export const OBJECTIUS: Objectiu[] = [
  {
    codi: 'a',
    curt: 'Patrimoni i tradicions',
    text: "Preservar, documentar, difondre i transmetre de manera intergeneracional el patrimoni cultural, immaterial i material, les tradicions, els costums, la llengua, la música, la gastronomia, l'artesania i els usos i costums propis del municipi de Pollença i del seu terme.",
  },
  {
    codi: 'b',
    curt: 'Festes, oficis i identitat',
    text: "Fomentar el coneixement, l'estima i la continuïtat de les festes, celebracions, oficis tradicionals i formes de vida vinculades a la identitat pollencina, especialment entre la infantesa i la joventut.",
  },
  {
    codi: 'c',
    curt: 'Trobada intergeneracional',
    text: 'Promoure espais i activitats de trobada i transmissió de sabers entre persones de diferents generacions (dites, receptes, oficis, jocs i memòria oral), amb especial atenció al paper de la gent gran com a dipositària de la tradició.',
  },
  {
    codi: 'd',
    curt: 'Recuperació i catalogació',
    text: 'Recuperar, catalogar i posar en valor el patrimoni material i immaterial (arxius, fotografies, indumentària, eines, cançons i rondalles) relacionat amb Pollença, mitjançant la investigació, la recollida de testimonis i la creació de fons documentals.',
  },
  {
    codi: 'e',
    curt: 'Activitats culturals i formatives',
    text: 'Organitzar i participar en activitats culturals, formatives, festives i divulgatives (xerrades, tallers, exposicions, publicacions, itineraris i actes commemoratius) obertes a la ciutadania.',
  },
  {
    codi: 'f',
    curt: 'Col·laboració amb entitats',
    text: 'Col·laborar amb altres entitats, institucions públiques i privades, centres educatius i mitjans de comunicació de Mallorca i de les Illes Balears que comparteixin objectius similars de preservació del patrimoni cultural i identitari.',
  },
  {
    codi: 'g',
    curt: 'Perspectiva de gènere',
    text: "Vetllar per la incorporació d'una perspectiva de gènere i d'igualtat en la recuperació i la transmissió de la memòria i la cultura popular.",
  },
  {
    codi: 'h',
    curt: 'Altres finalitats',
    text: "Qualssevol altres finalitats lícites, compatibles amb les anteriors, que l'Assemblea General acordi incorporar mitjançant la modificació d'aquests Estatuts.",
  },
];

