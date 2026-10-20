import type { Request } from 'express';
import { run } from './db.ts';
import { autor } from './routes/auth.ts';

// Registre d'activitat sobre dades personals (art. 5.2 i 32 RGPD: responsabilitat proactiva i seguretat).
// Es registren les altes, modificacions, eliminacions, exportacions i anonimitzacions, amb l'usuari i l'hora;
// i també els accessos (entrades i intents fallits), els canvis d'usuaris i contrasenyes, els canvis
// de configuració (només el nom de les claus, mai els valors) i les còpies de seguretat.

export type Accio =
  | 'crea' | 'modifica' | 'elimina' | 'exporta' | 'anonimitza' | 'drets' | 'conservacio' | 'envia'
  | 'entra' | 'entrada_fallida' | 'contrasenya' | 'configura' | 'descarrega' | 'restaura';

export function registra(req: Request, accio: Accio, entitat: string, entitatId: number | null, detall?: string) {
  registraSistema(autor(req) ?? 'sistema', accio, entitat, entitatId, detall);
}

/** Registre sense petició (tasques automàtiques, consola) o amb un autor explícit. */
export function registraSistema(usuari: string, accio: Accio, entitat: string, entitatId: number | null, detall?: string) {
  run(
    'INSERT INTO auditoria (usuari, accio, entitat, entitat_id, detall) VALUES (?, ?, ?, ?, ?)',
    usuari,
    accio,
    entitat,
    entitatId,
    detall ?? null,
  );
}
