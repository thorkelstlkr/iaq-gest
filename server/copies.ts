// Còpies de seguretat automàtiques, carpeta externa, restauració i verificació de còpies.
//
// - Cada dia (en arrencar, al cap d'un minut, i després cada hora es comprova) es fa
//   `VACUUM INTO <carpeta de la BD>/copies/<prefix>-AAAA-MM-DD.db` si encara no n'hi ha cap d'avui.
// - Es conserven les 7 darreres còpies diàries i la primera de cadascun dels 12 darrers mesos.
// - Si hi ha configurada una carpeta externa (llapis USB, OneDrive, Google Drive…), s'hi copia també.
// - Restaurar: la còpia pujada es valida i es desa com a «restaura-pendent.db»; db.ts la posa
//   al lloc de l'actual en la propera arrencada.
//
// A la demostració del navegador no hi ha sistema de fitxers: tot això hi queda desactivat.

import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH, all, db, get, getConfig, setConfig } from './db.ts';
import { avui, dataLocal } from '../shared/dates.ts';
import { HttpError } from './util.ts';
import { registraSistema } from './auditoria.ts';
import { dirDades } from './secrets.ts';

export const CLAU_CARPETA_EXTERNA = 'copia_carpeta_externa';
const DIARIES = 7;
const MENSUALS = 12;
const NOM_RE = /^(.+)-(\d{4}-\d{2}-\d{2})\.db$/;

export const copiesDisponibles = () =>
  typeof fs?.statSync === 'function' && typeof process !== 'undefined' && DB_PATH !== ':memory:';

export const dirCopies = () => path.join(path.dirname(DB_PATH), 'copies');
export const rutaPendent = () => path.join(path.dirname(DB_PATH), 'restaura-pendent.db');

/** «I ara qué?» → «i-ara-que» (per als noms de fitxer). */
export function slug(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const prefixCopies = () => slug(getConfig('nom')) || 'gestio';

/**
 * Quins fitxers de còpia sobren segons la política de conservació: es guarden els fitxers de
 * les `diaries` dates més recents i, per als `mensuals` mesos més recents, els del primer dia
 * del mes amb còpia. Funció pura (sense accés al disc) per poder-la provar.
 */
export function seleccionaPerEsborrar(noms: string[], diaries = DIARIES, mensuals = MENSUALS): string[] {
  const ambData = noms.map((nom) => ({ nom, data: NOM_RE.exec(nom)?.[2] })).filter((f): f is { nom: string; data: string } => !!f.data);
  const dates = [...new Set(ambData.map((f) => f.data))].sort().reverse();
  const conserva = new Set(dates.slice(0, diaries));
  const primerDelMes = new Map<string, string>();
  for (const d of [...dates].reverse()) if (!primerDelMes.has(d.slice(0, 7))) primerDelMes.set(d.slice(0, 7), d);
  const mesos = [...primerDelMes.keys()].sort().reverse().slice(0, mensuals);
  for (const m of mesos) conserva.add(primerDelMes.get(m)!);
  return ambData.filter((f) => !conserva.has(f.data)).map((f) => f.nom);
}

export interface InfoCopia {
  nom: string;
  data: string;
  mida: number;
  modificada: string;
}

export function llistaCopies(): InfoCopia[] {
  if (!copiesDisponibles() || !fs.existsSync(dirCopies())) return [];
  return fs
    .readdirSync(dirCopies())
    .filter((nom) => NOM_RE.test(nom))
    .map((nom) => {
      const st = fs.statSync(path.join(dirCopies(), nom));
      return { nom, data: NOM_RE.exec(nom)![2], mida: st.size, modificada: st.mtime.toISOString() };
    })
    .sort((a, b) => b.modificada.localeCompare(a.modificada));
}

/** Ruta d'una còpia de la llista (valida el nom per no sortir de la carpeta). */
export function rutaCopia(nom: string): string {
  if (!NOM_RE.test(nom) || nom !== path.basename(nom)) throw new HttpError(400, 'Nom de còpia no vàlid.');
  const ruta = path.join(dirCopies(), nom);
  if (!fs.existsSync(ruta)) throw new HttpError(404, 'No trobat.');
  return ruta;
}

/** Fa una còpia consistent de la base de dades en un fitxer (que no ha d'existir). */
export function copiaA(desti: string) {
  fs.rmSync(desti, { force: true });
  db.prepare('VACUUM INTO ?').run(desti);
}

function provaEscriptura(carpeta: string) {
  if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory())
    throw new HttpError(400, `La carpeta «${carpeta}» no existeix o no és accessible.`);
  const prova = path.join(carpeta, `.prova-escriptura-${process.pid}.tmp`);
  fs.writeFileSync(prova, 'ok');
  fs.rmSync(prova, { force: true });
}

/** Comprova que es pot escriure a la carpeta externa. Llança un HttpError si no. */
export function provaCarpetaExterna(carpeta: string) {
  if (!path.isAbsolute(carpeta)) throw new HttpError(400, 'Indica la ruta completa de la carpeta (per exemple, E:\\Copies).');
  try {
    provaEscriptura(carpeta);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, `No es pot escriure a la carpeta «${carpeta}».`);
  }
}

export interface ResultatCopia {
  nom: string;
  mida: number;
  externa: { carpeta: string; ok: boolean; error?: string } | null;
}

/** Fa la còpia d'avui (si ja n'hi ha una, la substitueix), aplica la conservació i la copia a fora. */
export function ferCopia(): ResultatCopia {
  if (!copiesDisponibles()) throw new HttpError(400, 'No disponible a la demostració.');
  const dir = dirCopies();
  fs.mkdirSync(dir, { recursive: true });
  const nom = `${prefixCopies()}-${avui()}.db`;
  const desti = path.join(dir, nom);
  const temporal = desti + '.tmp';
  copiaA(temporal);
  fs.renameSync(temporal, desti);
  const mida = fs.statSync(desti).size;
  setConfig('copia_darrera', new Date().toISOString());
  setConfig('copia_darrera_fitxer', nom);
  setConfig('copia_error', '');

  for (const sobrer of seleccionaPerEsborrar(fs.readdirSync(dir))) {
    try {
      fs.rmSync(path.join(dir, sobrer), { force: true });
    } catch (e) {
      console.error(`No s'ha pogut esborrar la còpia antiga ${sobrer}:`, e);
    }
  }

  let externa: ResultatCopia['externa'] = null;
  const carpeta = getConfig(CLAU_CARPETA_EXTERNA);
  if (carpeta) {
    try {
      provaEscriptura(carpeta);
      fs.copyFileSync(desti, path.join(carpeta, nom));
      // També a la carpeta externa es conserven només les còpies segons la mateixa política.
      for (const sobrer of seleccionaPerEsborrar(fs.readdirSync(carpeta).filter((f) => f.startsWith(prefixCopies() + '-'))))
        fs.rmSync(path.join(carpeta, sobrer), { force: true });
      setConfig('copia_externa_darrera', new Date().toISOString());
      setConfig('copia_externa_error', '');
      externa = { carpeta, ok: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      setConfig('copia_externa_error', error.slice(0, 300));
      console.error(`No s'ha pogut copiar la còpia de seguretat a ${carpeta}:`, error);
      externa = { carpeta, ok: false, error };
    }
  }
  return { nom, mida, externa };
}

/** Fa la còpia d'avui si encara no n'hi ha. No llança mai: els errors van al registre. */
export function copiaSiCal() {
  try {
    if (!getConfig('inicialitzat')) return;
    const avuiNom = `-${avui()}.db`;
    if (llistaCopies().some((c) => c.nom.endsWith(avuiNom))) return;
    const r = ferCopia();
    console.log(`Còpia de seguretat feta: ${path.join(dirCopies(), r.nom)}`);
  } catch (e) {
    setConfig('copia_error', (e instanceof Error ? e.message : String(e)).slice(0, 300));
    console.error('ERROR fent la còpia de seguretat automàtica:', e);
  }
}

/** Registra a l'auditoria una restauració aplicada en arrencar (marca deixada per db.ts). */
function registraRestauracioFeta() {
  const marca = path.join(path.dirname(DB_PATH), 'restauracio-feta.json');
  if (!fs.existsSync(marca)) return;
  try {
    const info = JSON.parse(fs.readFileSync(marca, 'utf8')) as { anterior?: string };
    registraSistema('sistema', 'restaura', 'copia_seguretat', null, `Còpia restaurada en arrencar. Base de dades anterior: ${info.anterior ?? '?'}`);
  } catch (e) {
    console.error(e);
  }
  fs.rmSync(marca, { force: true });
}

/** Comença les còpies automàtiques: al cap d'un minut d'arrencar i després cada hora es comprova si cal. */
export function iniciaCopiesAutomatiques(retardMs = 60_000) {
  if (!copiesDisponibles()) return;
  registraRestauracioFeta();
  setTimeout(copiaSiCal, retardMs).unref();
  setInterval(copiaSiCal, 3600_000).unref();
}

// ---------- Validació i restauració ----------

const TAULES_RESUM = [
  'socis', 'interessats', 'quotes', 'moviments', 'activitats', 'factures', 'reunions', 'web_noticies', 'usuaris', 'auditoria',
];

export interface ResultatVerificacio {
  valida: true;
  entitat: string | null;
  inicialitzat: string | null;
  taules: { taula: string; files: number }[];
}

const CAPCALERA_SQLITE = 'SQLite format 3\0';
let seqVerificacio = 0;

/**
 * Comprova que un fitxer és una còpia d'aquest programa (integritat i taula «config» inicialitzada)
 * i en compta les files de les taules principals. Si `desaA` s'indica, en fa una còpia neta allà.
 */
export function verificaFitxer(ruta: string, desaA?: string): ResultatVerificacio {
  const capcalera = Buffer.alloc(16);
  const fd = fs.openSync(ruta, 'r');
  try {
    fs.readSync(fd, capcalera, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (capcalera.toString('latin1') !== CAPCALERA_SQLITE) throw new HttpError(400, 'El fitxer no és una còpia de seguretat vàlida (no és una base de dades).');
  const esquema = `verif${++seqVerificacio}`;
  db.prepare(`ATTACH DATABASE ? AS ${esquema}`).run(ruta);
  try {
    let integritat: string;
    try {
      integritat = all<{ integrity_check: string }>(`PRAGMA ${esquema}.integrity_check`).map((r) => r.integrity_check).join('; ');
    } catch {
      throw new HttpError(400, 'El fitxer no és una còpia de seguretat vàlida (no és una base de dades).');
    }
    if (integritat !== 'ok') throw new HttpError(400, `La còpia de seguretat està malmesa: ${integritat.slice(0, 200)}`);
    const taules = new Set(all<{ name: string }>(`SELECT name FROM ${esquema}.sqlite_master WHERE type = 'table'`).map((r) => r.name));
    const config = (clau: string) =>
      taules.has('config') ? (get<{ valor: string }>(`SELECT valor FROM ${esquema}.config WHERE clau = ?`, clau)?.valor ?? null) : null;
    const inicialitzat = config('inicialitzat');
    if (!taules.has('config') || !inicialitzat || !taules.has('socis'))
      throw new HttpError(400, 'El fitxer no és una còpia de seguretat d’aquest programa.');
    const resultat: ResultatVerificacio = {
      valida: true,
      entitat: config('nom'),
      inicialitzat,
      taules: TAULES_RESUM.filter((t) => taules.has(t)).map((taula) => ({
        taula,
        files: get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${esquema}."${taula}"`)!.n,
      })),
    };
    if (desaA) {
      fs.rmSync(desaA, { force: true });
      db.prepare(`VACUUM ${esquema} INTO ?`).run(desaA);
    }
    return resultat;
  } finally {
    db.exec(`DETACH DATABASE ${esquema}`);
  }
}

/** Desa uns bytes pujats en un fitxer temporal de la carpeta de dades i hi aplica `fn`. */
export function ambFitxerPujat<T>(bytes: Buffer, fn: (ruta: string) => T): T {
  if (!copiesDisponibles()) throw new HttpError(400, 'No disponible a la demostració.');
  if (!bytes.length) throw new HttpError(400, 'No s’ha rebut cap fitxer.');
  const temporal = path.join(path.dirname(DB_PATH), `pujada-${Date.now()}-${process.pid}.tmp`);
  fs.writeFileSync(temporal, bytes);
  try {
    return fn(temporal);
  } finally {
    fs.rmSync(temporal, { force: true });
  }
}

/** Valida la còpia pujada i la deixa preparada per restaurar-la en la propera arrencada. */
export function preparaRestauracio(bytes: Buffer): ResultatVerificacio {
  return ambFitxerPujat(bytes, (ruta) => verificaFitxer(ruta, rutaPendent()));
}

export const hiHaRestauracioPendent = () => copiesDisponibles() && fs.existsSync(rutaPendent());

export function cancellaRestauracio() {
  if (copiesDisponibles()) fs.rmSync(rutaPendent(), { force: true });
}

// ---------- Estat (per a la interfície i els avisos) ----------

export function estatCopies() {
  const disponible = copiesDisponibles();
  const copies = disponible ? llistaCopies() : [];
  const darrera = copies[0] ?? null;
  return {
    disponible,
    carpeta: disponible ? dirCopies() : null,
    carpeta_dades: disponible ? dirDades() : null,
    darrera,
    copies,
    error: getConfig('copia_error') || null,
    externa: {
      carpeta: getConfig(CLAU_CARPETA_EXTERNA) || null,
      darrera: getConfig('copia_externa_darrera') || null,
      error: getConfig('copia_externa_error') || null,
    },
    restauracio_pendent: disponible ? hiHaRestauracioPendent() : false,
  };
}

/** Data (AAAA-MM-DD, local) de la darrera còpia, o null. */
export function dataDarreraCopia(): string | null {
  const c = llistaCopies()[0];
  return c ? dataLocal(new Date(c.modificada)) : null;
}

/** Versió del programa (package.json), o null si no es pot llegir (demostració). */
export function versioApp(): string | null {
  try {
    if (typeof fs?.readFileSync !== 'function') return null;
    return (JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

// ---------- Carpetes sincronitzades amb el núvol ----------

export interface CarpetaNuvol {
  servei: 'Google Drive' | 'OneDrive' | 'Dropbox';
  /** Arrel de la carpeta sincronitzada (p. ex. «G:\Mi unidad»). */
  arrel: string;
  /** Subcarpeta que es proposa per a les còpies. */
  proposta: string;
}

/**
 * Busca les carpetes que les aplicacions d'escriptori de Google Drive, OneDrive i Dropbox mantenen
 * sincronitzades amb el núvol. Desar-hi les còpies equival a tenir-les a Drive/OneDrive/Dropbox.
 */
export function detectaCarpetesNuvol({ unitats: buscaUnitats = true } = {}): CarpetaNuvol[] {
  if (!copiesDisponibles()) return [];
  const existeix = (r: string) => {
    try {
      return fs.existsSync(r) && fs.statSync(r).isDirectory();
    } catch {
      return false;
    }
  };
  const subcarpeta = `Còpies de seguretat - ${prefixCopies()}`;
  const trobades: CarpetaNuvol[] = [];
  const afegeix = (servei: CarpetaNuvol['servei'], arrel: string) => {
    if (existeix(arrel) && !trobades.some((c) => c.arrel.toLowerCase() === arrel.toLowerCase())) {
      trobades.push({ servei, arrel, proposta: path.join(arrel, subcarpeta) });
    }
  };
  // Google Drive per a ordinadors: una unitat (normalment G:) amb «Mi unidad», «La meva unitat» o «My Drive».
  const unitats = ['Mi unidad', 'La meva unitat', 'My Drive', 'Mon disque', 'Meine Ablage'];
  if (process.platform === 'win32' && buscaUnitats) {
    for (const lletra of 'DEFGHIJKLMNOPQRSTUVWXYZ') for (const u of unitats) afegeix('Google Drive', `${lletra}:\\${u}`);
  }
  const casa = process.env.USERPROFILE || process.env.HOME || '';
  if (casa) {
    for (const u of unitats) afegeix('Google Drive', path.join(casa, 'Google Drive', u));
    afegeix('Google Drive', path.join(casa, 'Google Drive'));
    afegeix('Dropbox', path.join(casa, 'Dropbox'));
  }
  for (const v of [process.env.OneDriveCommercial, process.env.OneDriveConsumer, process.env.OneDrive]) if (v) afegeix('OneDrive', v);
  if (casa) afegeix('OneDrive', path.join(casa, 'OneDrive'));
  return trobades;
}

/** Fa servir una carpeta del núvol detectada: hi crea la subcarpeta de còpies i la desa com a carpeta externa. */
export function usaCarpetaNuvol(arrel: string, opcions: { unitats?: boolean } = {}): string {
  const c = detectaCarpetesNuvol(opcions).find((x) => x.arrel.toLowerCase() === arrel.toLowerCase());
  if (!c) throw new HttpError(400, "Aquesta carpeta del núvol no s'ha trobat en aquest ordinador.");
  fs.mkdirSync(c.proposta, { recursive: true });
  provaCarpetaExterna(c.proposta);
  setConfig(CLAU_CARPETA_EXTERNA, c.proposta);
  return c.proposta;
}
