// Xifratge dels secrets guardats a la configuració (contrasenyes de correu i FTP, certificat
// digital, testimonis de les xarxes socials…). AES-256-GCM amb una clau de 32 bytes guardada
// al fitxer «clau.key», al costat de la base de dades.
//
// Així, una còpia de la base de dades (o un ordinador perdut amb només el fitxer .db) no
// revela aquests secrets. Per restaurar-los en un altre ordinador cal copiar també clau.key;
// si no, s'han de tornar a escriure.
//
// A la demostració del navegador no hi ha node:crypto ni node:fs: es desa en text pla.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PREFIX_XIFRAT = 'enc:v1:';
export const FITXER_CLAU = 'clau.key';

const CLAUS_SECRETES = new Set(['smtp_contrasenya', 'ftp_contrasenya', 'fac_cert', 'fac_cert_contrasenya']);

/** Claus de configuració que es guarden xifrades. */
export const esSecret = (clau: string) =>
  CLAUS_SECRETES.has(clau) || /^xarxa_.+_token$/.test(clau) || /_(contrasenya|token|secret|clau_api)$/.test(clau);

/** Hi ha node:crypto i node:fs (no som a la demostració)? */
export const xifratgeDisponible = () =>
  typeof crypto?.createCipheriv === 'function' && typeof fs?.readFileSync === 'function';

/** Carpeta on viu la base de dades (i la clau, les còpies, el registre d'errors…). */
export function dirDades(): string | null {
  if (typeof process === 'undefined' || typeof path?.resolve !== 'function') return null;
  return path.dirname(path.resolve(process.env.DB_PATH ?? 'data/iaraque.db'));
}

export const rutaClau = () => {
  const dir = dirDades();
  return dir ? path.join(dir, FITXER_CLAU) : null;
};

let clauEnMemoria: { ruta: string; clau: Buffer } | null = null;
let errorAvisat = false;

function errorUnCop(missatge: string) {
  if (errorAvisat) return;
  errorAvisat = true;
  console.error(missatge);
}

/** Clau de xifratge; si no existeix i `crear` és cert, se'n genera una de nova. */
function clau(crear: boolean): Buffer | null {
  const ruta = rutaClau();
  if (!ruta || !xifratgeDisponible()) return null;
  if (clauEnMemoria?.ruta === ruta) return clauEnMemoria.clau;
  let k: Buffer | null = null;
  if (fs.existsSync(ruta)) {
    const contingut = fs.readFileSync(ruta);
    // 32 bytes binaris, o el mateix en hexadecimal/base64 si algú l'ha copiat com a text.
    const text = contingut.toString('utf8').trim();
    if (contingut.length === 32) k = contingut;
    else if (/^[0-9a-f]{64}$/i.test(text)) k = Buffer.from(text, 'hex');
    else if (Buffer.from(text, 'base64').length === 32) k = Buffer.from(text, 'base64');
    else {
      errorUnCop(`ERROR: el fitxer de clau ${ruta} no és vàlid. Els secrets de la configuració no es poden llegir.`);
      return null;
    }
  } else if (crear) {
    k = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, k, { mode: 0o600, flag: 'wx' });
  } else {
    return null;
  }
  clauEnMemoria = { ruta, clau: k };
  return k;
}

export const esXifrat = (valor: string | null | undefined) => Boolean(valor?.startsWith(PREFIX_XIFRAT));

/** Xifra un valor (els buits i, a la demostració, tots es queden en text pla). */
export function xifra(valor: string): string {
  if (!valor || esXifrat(valor) || !xifratgeDisponible()) return valor;
  const k = clau(true);
  if (!k) return valor;
  const iv = crypto.randomBytes(12);
  const xifrador = crypto.createCipheriv('aes-256-gcm', k, iv);
  const dades = Buffer.concat([xifrador.update(valor, 'utf8'), xifrador.final()]);
  return PREFIX_XIFRAT + Buffer.concat([iv, xifrador.getAuthTag(), dades]).toString('base64');
}

/** Desxifra un valor. Si no es pot (falta la clau o no és la bona), torna null i ho registra. */
export function desxifra(valor: string): string | null {
  if (!esXifrat(valor)) return valor;
  if (!xifratgeDisponible()) return null;
  const k = clau(false);
  if (!k) {
    errorUnCop(
      `ERROR: hi ha contrasenyes xifrades a la configuració però no es troba el fitxer de clau (${rutaClau()}). ` +
        'Copia-hi el fitxer clau.key original o torna a escriure les contrasenyes a Configuració.',
    );
    return null;
  }
  try {
    const cru = Buffer.from(valor.slice(PREFIX_XIFRAT.length), 'base64');
    const desxifrador = crypto.createDecipheriv('aes-256-gcm', k, cru.subarray(0, 12));
    desxifrador.setAuthTag(cru.subarray(12, 28));
    return Buffer.concat([desxifrador.update(cru.subarray(28)), desxifrador.final()]).toString('utf8');
  } catch {
    errorUnCop(
      `ERROR: no s'han pogut desxifrar contrasenyes de la configuració amb la clau ${rutaClau()} ` +
        '(probablement és d’una altra instal·lació). Torna a escriure-les a Configuració.',
    );
    return null;
  }
}

let migrat = false;

/**
 * Xifra una sola vegada els secrets que encara són en text pla (instal·lacions anteriors).
 * Rep les funcions d'accés a la taula per no dependre de db.ts.
 */
export function migraSecretsUnCop(
  llegeix: () => { clau: string; valor: string }[],
  escriu: (clau: string, valor: string) => void,
) {
  if (migrat) return;
  migrat = true;
  if (!xifratgeDisponible()) return;
  try {
    for (const { clau: k, valor } of llegeix()) if (esSecret(k) && valor && !esXifrat(valor)) escriu(k, xifra(valor));
  } catch (e) {
    console.error('No s’han pogut xifrar els secrets de la configuració:', e);
  }
}

/** Només per a les proves: oblida la clau i l'estat de migració. */
export function reiniciaPerProves() {
  clauEnMemoria = null;
  errorAvisat = false;
  migrat = false;
}
