// Lectura de fulls de càlcul en CSV per importar socis: codificació, delimitador, cometes i
// associació automàtica de columnes (capçaleres en català, castellà o anglès).
import { t } from '../../i18n';

/** Decodifica el fitxer: UTF-8 si és vàlid; si no (caràcters de substitució U+FFFD), Windows-1252 (Excel en castellà/català). */
export function decodifica(bytes: ArrayBuffer): string {
  let text = new TextDecoder('utf-8').decode(bytes);
  if (/\uFFFD/.test(text)) text = new TextDecoder('windows-1252').decode(bytes);
  return text.replace(/^﻿/, '');
}

/** Delimitador més probable segons la primera línia (fora de cometes): «;», «,» o tabulador. */
export function detectaDelimitador(text: string): string {
  const compta: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  let dinsCometes = false;
  for (const c of text) {
    if (c === '"') dinsCometes = !dinsCometes;
    else if (!dinsCometes && (c === '\n' || c === '\r')) break;
    else if (!dinsCometes && c in compta) compta[c]++;
  }
  const [millor, vegades] = Object.entries(compta).sort((a, b) => b[1] - a[1])[0];
  return vegades > 0 ? millor : ';';
}

/** Llegeix el CSV (camps entre cometes, cometes dobles escapades, salts de línia dins de cometes). */
export function llegeixCsv(text: string, delimitador = detectaDelimitador(text)): string[][] {
  const files: string[][] = [];
  let fila: string[] = [];
  let camp = '';
  let cometes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (cometes) {
      if (c === '"' && text[i + 1] === '"') {
        camp += '"';
        i++;
      } else if (c === '"') cometes = false;
      else camp += c;
    } else if (c === '"' && camp.trim() === '') {
      cometes = true;
      camp = '';
    } else if (c === delimitador) {
      fila.push(camp.trim());
      camp = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      fila.push(camp.trim());
      if (fila.some((v) => v !== '')) files.push(fila);
      fila = [];
      camp = '';
    } else camp += c;
  }
  fila.push(camp.trim());
  if (fila.some((v) => v !== '')) files.push(fila);
  return files;
}

export interface CampImport {
  clau: string;
  nom: string;
  alies: string[];
}

/** Camps que es poden importar, amb noms de capçalera habituals en català, castellà i anglès. */
export const campsImport = (): CampImport[] => [
  { clau: 'num_soci', nom: t("Núm. de soci"), alies: ['num', 'numero', 'num soci', 'numero soci', 'n soci', 'socio', 'num socio', 'numero socio', 'member number', 'member no', 'id'] },
  { clau: 'nom', nom: t("Nom"), alies: ['nom', 'nombre', 'name', 'first name', 'given name'] },
  { clau: 'llinatges', nom: t("Llinatges"), alies: ['llinatges', 'cognoms', 'apellidos', 'apellido', 'surname', 'surnames', 'last name', 'family name'] },
  { clau: 'dni', nom: 'DNI / NIE', alies: ['dni', 'nie', 'nif', 'dni nie', 'document', 'documento', 'id number', 'passport'] },
  { clau: 'data_naixement', nom: t("Data de naixement"), alies: ['data naixement', 'data de naixement', 'naixement', 'fecha nacimiento', 'fecha de nacimiento', 'nacimiento', 'birth date', 'date of birth', 'birthdate', 'dob'] },
  { clau: 'genere', nom: t("Gènere"), alies: ['genere', 'sexe', 'genero', 'sexo', 'gender', 'sex'] },
  { clau: 'email', nom: t("Correu electrònic"), alies: ['email', 'e mail', 'correu', 'correu electronic', 'correo', 'correo electronico', 'mail'] },
  { clau: 'telefon', nom: t("Telèfon"), alies: ['telefon', 'mobil', 'telefono', 'movil', 'phone', 'mobile', 'tel'] },
  { clau: 'adreca', nom: t("Adreça"), alies: ['adreca', 'domicili', 'direccion', 'domicilio', 'address', 'street'] },
  { clau: 'codi_postal', nom: t("Codi postal"), alies: ['codi postal', 'cp', 'codigo postal', 'postal code', 'postcode', 'zip'] },
  { clau: 'poblacio', nom: t("Població"), alies: ['poblacio', 'municipi', 'localitat', 'poblacion', 'municipio', 'localidad', 'ciudad', 'town', 'city'] },
  { clau: 'iban', nom: 'IBAN', alies: ['iban', 'compte', 'compte bancari', 'cuenta', 'cuenta bancaria', 'bank account', 'account'] },
  { clau: 'data_alta', nom: t("Data d'alta"), alies: ['data alta', "data d alta", 'alta', 'fecha alta', 'fecha de alta', 'join date', 'joined', 'date joined', 'membership date', 'since'] },
  { clau: 'categoria', nom: t("Categoria"), alies: ['categoria', 'tipus soci', 'tipo socio', 'category', 'member type', 'membership type'] },
  { clau: 'tipus_quota', nom: t("Tipus de quota"), alies: ['tipus quota', 'tipus de quota', 'quota', 'tipo cuota', 'tipo de cuota', 'cuota', 'fee', 'fee type'] },
  { clau: 'tutor_legal', nom: t("Pare, mare o tutor/a legal"), alies: ['tutor', 'tutor legal', 'tutora', 'guardian', 'legal guardian', 'pare mare', 'padre madre'] },
  { clau: 'notes', nom: t("Notes"), alies: ['notes', 'observacions', 'notas', 'observaciones', 'comments', 'remarks'] },
];

const normalitza = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Associa cada camp a la columna amb la capçalera coincident (−1 si no n'hi ha cap). */
export function autoAssocia(capcaleres: string[]): Record<string, number> {
  const norm = capcaleres.map(normalitza);
  const usades = new Set<number>();
  const resultat: Record<string, number> = {};
  for (const camp of campsImport()) {
    const alies = camp.alies.map(normalitza);
    let i = norm.findIndex((c, j) => !usades.has(j) && alies.includes(c));
    // Coincidència parcial («Nom i llinatges» no; «Data naixement (dd/mm/aaaa)» sí).
    if (i < 0) i = norm.findIndex((c, j) => !usades.has(j) && alies.some((a) => a.length > 3 && c.startsWith(a + ' ')));
    resultat[camp.clau] = i;
    if (i >= 0) usades.add(i);
  }
  return resultat;
}
