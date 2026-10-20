// Publicació de la web per FTP i publicació automàtica quan hi ha canvis.

import { Client } from 'basic-ftp';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { getConfig, setConfig } from '../db.ts';
import { dissenyDesat, generaWeb } from './generador.ts';
import type { Fitxers } from './generador.ts';
import { urlGoogleFonts } from '../../shared/disseny.ts';
import { esAccioAgent } from '../agent/context.ts';

export const ftpConfigurat = () => Boolean(getConfig('ftp_host') && getConfig('ftp_usuari') && getConfig('ftp_contrasenya'));

let publicant = false;
let temporitzador: ReturnType<typeof setTimeout> | null = null;
const ESPERA_AUTO_MS = 60_000;

export interface EstatWeb {
  canvis_el: string | null;
  publicada_el: string | null;
  pendent: boolean;
  publicant: boolean;
  error: string | null;
  auto: boolean;
  ftp_configurat: boolean;
  fitxers: number | null;
}

export function estatWeb(): EstatWeb {
  const canvis = getConfig('web_canvis_el') || null;
  const publicada = getConfig('web_publicada_el') || null;
  return {
    canvis_el: canvis,
    publicada_el: publicada,
    pendent: Boolean(canvis && (!publicada || canvis > publicada)),
    publicant,
    error: getConfig('web_darrer_error') || null,
    auto: getConfig('web_auto') === '1',
    ftp_configurat: ftpConfigurat(),
    fitxers: Number(getConfig('web_fitxers')) || null,
  };
}

/**
 * Cal cridar-la quan canvia qualsevol cosa que surt a la web (notícies, pàgines, activitats,
 * dades de l'entitat…). Si la publicació automàtica està activada, publica al cap d'un minut
 * (així diversos canvis seguits es pugen d'una sola vegada).
 */
export function marcaCanvisWeb() {
  setConfig('web_canvis_el', new Date().toISOString());
  // Els canvis d'un agent d'IA mai no es publiquen sols: publicar és sempre una decisió d'una persona.
  if (esAccioAgent()) return;
  if (getConfig('web_auto') !== '1' || !ftpConfigurat()) return;
  if (temporitzador) clearTimeout(temporitzador);
  temporitzador = setTimeout(() => {
    temporitzador = null;
    publicaWeb().catch(() => {}); // l'error queda desat a web_darrer_error
  }, ESPERA_AUTO_MS);
}

/** Genera la web i la puja per FTP a la carpeta configurada. */
export async function publicaWeb(): Promise<{ fitxers: number }> {
  if (!ftpConfigurat()) throw new Error("Falta configurar l'accés FTP (Web → Publicació).");
  if (publicant) throw new Error('Ja s’està publicant la web. Espera uns segons.');
  publicant = true;
  const inici = new Date().toISOString();
  const dir = mkdtempSync(join(tmpdir(), 'web-'));
  const client = new Client(30_000);
  try {
    const fitxers = generaWeb();
    if (fitxers.has('fonts.css')) await incrustaFonts(fitxers);
    for (const [cami, contingut] of fitxers) {
      const desti = join(dir, cami);
      mkdirSync(dirname(desti), { recursive: true });
      writeFileSync(desti, contingut);
    }
    const mode = getConfig('ftp_segur') ?? 'ftps';
    await client.access({
      host: getConfig('ftp_host')!,
      port: Number(getConfig('ftp_port') || 21),
      user: getConfig('ftp_usuari')!,
      password: getConfig('ftp_contrasenya')!,
      secure: mode !== 'ftp',
      // Molts allotjaments compartits fan servir certificats que no coincideixen amb el nom del servidor.
      secureOptions: mode === 'ftps_sense_verificar' ? { rejectUnauthorized: false } : undefined,
    });
    const carpeta = (getConfig('ftp_carpeta') || '/').trim() || '/';
    await client.ensureDir(carpeta);
    await client.uploadFromDir(dir);
    setConfig('web_publicada_el', inici);
    setConfig('web_fitxers', String(fitxers.size));
    setConfig('web_darrer_error', '');
    return { fitxers: fitxers.size };
  } catch (e) {
    const missatge = e instanceof Error ? e.message : String(e);
    setConfig('web_darrer_error', `${new Date().toLocaleString('ca-ES')}: ${missatge}`);
    throw new Error(`No s'ha pogut publicar: ${missatge}`);
  } finally {
    publicant = false;
    client.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Puja un sol fitxer a la web (p. ex. la imatge d'una publicació d'Instagram, que Instagram
 * ha de poder descarregar d'una adreça pública) i en torna l'adreça completa.
 */
export async function pujaFitxerPublic(cami: string, contingut: Buffer): Promise<string> {
  const urlWeb = (getConfig('web_url') || '').replace(/\/+$/, '');
  if (!urlWeb) throw new Error("Cal indicar l'adreça de la web (Web → Textos i aparença).");
  if (!ftpConfigurat()) throw new Error("Cal configurar l'accés FTP de la web (Web → Connexió FTP).");
  const dir = mkdtempSync(join(tmpdir(), 'xarxa-'));
  const local = join(dir, 'fitxer');
  writeFileSync(local, contingut);
  const client = new Client(30_000);
  try {
    const mode = getConfig('ftp_segur') ?? 'ftps';
    await client.access({
      host: getConfig('ftp_host')!,
      port: Number(getConfig('ftp_port') || 21),
      user: getConfig('ftp_usuari')!,
      password: getConfig('ftp_contrasenya')!,
      secure: mode !== 'ftp',
      secureOptions: mode === 'ftps_sense_verificar' ? { rejectUnauthorized: false } : undefined,
    });
    const carpeta = (getConfig('ftp_carpeta') || '/').trim() || '/';
    const parts = cami.split('/');
    const nom = parts.pop()!;
    await client.ensureDir([carpeta.replace(/\/+$/, ''), ...parts].join('/') || '/');
    await client.uploadFrom(local, nom);
    return `${urlWeb}/${cami}`;
  } finally {
    client.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Comprova que l'accés FTP funciona i que la carpeta existeix (o es pot crear). */
export async function provaFtp(): Promise<string> {
  if (!ftpConfigurat()) throw new Error("Falta el servidor, l'usuari o la contrasenya.");
  const client = new Client(20_000);
  try {
    const mode = getConfig('ftp_segur') ?? 'ftps';
    await client.access({
      host: getConfig('ftp_host')!,
      port: Number(getConfig('ftp_port') || 21),
      user: getConfig('ftp_usuari')!,
      password: getConfig('ftp_contrasenya')!,
      secure: mode !== 'ftp',
      secureOptions: mode === 'ftps_sense_verificar' ? { rejectUnauthorized: false } : undefined,
    });
    const carpeta = (getConfig('ftp_carpeta') || '/').trim() || '/';
    await client.ensureDir(carpeta);
    const llista = await client.list();
    return `Connexió correcta. La carpeta «${carpeta}» té ${llista.length} elements.`;
  } finally {
    client.close();
  }
}

/**
 * Descarrega les fonts de Google triades al disseny i les afegeix a la web (fonts.css + fonts/*.woff2),
 * de manera que la web pública no fa cap petició a Google (privacitat dels visitants).
 * Només es baixen els jocs de caràcters llatins (el català necessita «latin-ext» per a la ŀ).
 * Si falla, fonts.css queda buit i la web fa servir les fonts alternatives.
 */
export async function incrustaFonts(fitxers: Fitxers, url = urlGoogleFonts(dissenyDesat())): Promise<void> {
  if (!url) return;
  try {
    // Amb un navegador modern, Google torna fonts en format woff2.
    const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
    const resposta = await fetch(url, { headers: { 'User-Agent': agent } });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const css = await resposta.text();
    const blocs = css.split(/(?=\/\*\s*[a-z0-9-]+\s*\*\/)/i).filter((b) => /^\/\*\s*latin(-ext)?\s*\*\//i.test(b.trim()));
    const sortida: string[] = [];
    let n = 0;
    for (const bloc of blocs) {
      const m = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+?\.woff2)\)/.exec(bloc);
      if (!m) continue;
      const fitxer = await fetch(m[1]);
      if (!fitxer.ok) throw new Error(`HTTP ${fitxer.status}`);
      const cami = `fonts/f${++n}.woff2`;
      fitxers.set(cami, Buffer.from(await fitxer.arrayBuffer()));
      sortida.push(bloc.replace(m[1], cami));
    }
    fitxers.set('fonts.css', sortida.join('\n'));
  } catch (e) {
    console.error("No s'han pogut descarregar les fonts de la web:", e instanceof Error ? e.message : e);
    fitxers.set('fonts.css', '');
  }
}
