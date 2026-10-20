import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { idiomaDe, tradueix } from './i18n.ts';
import { dirDades } from './secrets.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Text opcional: buit → null. */
export function text(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function textObligatori(v: unknown, camp: string): string {
  const s = text(v);
  if (!s) throw new HttpError(400, `El camp «${camp}» és obligatori.`);
  return s;
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function data(v: unknown, camp: string): string | null {
  const s = text(v);
  if (s && !DATA_RE.test(s)) throw new HttpError(400, `La data «${camp}» no és vàlida.`);
  return s;
}

export function dataObligatoria(v: unknown, camp: string): string {
  const s = data(v, camp);
  if (!s) throw new HttpError(400, `La data «${camp}» és obligatòria.`);
  return s;
}

export function enter(v: unknown, camp: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new HttpError(400, `El camp «${camp}» ha de ser un nombre enter.`);
  return n;
}

export function cents(v: unknown, camp: string, { positiu = false } = {}): number {
  const n = enter(v, camp);
  if (n === null || n < 0 || (positiu && n === 0))
    throw new HttpError(400, `L'import «${camp}» no és vàlid.`);
  return n;
}

export const bool = (v: unknown) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

export function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador no vàlid.');
  return id;
}

export function exerciciParam(req: Request): number {
  const e = Number(req.query.exercici ?? new Date().getFullYear());
  if (!Number.isInteger(e) || e < 1900 || e > 3000) throw new HttpError(400, 'Exercici no vàlid.');
  return e;
}

export function notFound(): never {
  throw new HttpError(404, 'No trobat.');
}

export function toCsv(rows: Record<string, unknown>[], columns: [string, string][]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(([, label]) => esc(label)).join(';');
  const body = rows.map((r) => columns.map(([key]) => esc(r[key])).join(';'));
  // BOM perquè Excel obri correctament els accents.
  return '﻿' + [header, ...body].join('\r\n');
}

/** Capçaleres del CSV en l'idioma de la petició. */
export const columnesTraduides = (req: Request, columnes: [string, string][]): [string, string][] =>
  columnes.map(([k, nom]) => [k, tradueix(nom, idiomaDe(req))]);

/** Tradueix el camp «error» de totes les respostes a l'idioma de qui fa la petició. */
export function traduccioErrors(req: Request, res: Response, next: NextFunction) {
  const idioma = idiomaDe(req);
  const json = res.json.bind(res);
  res.json = (cos: unknown) => {
    const c = cos as { error?: unknown };
    return json(c && typeof c.error === 'string' ? { ...c, error: tradueix(c.error, idioma) } : cos);
  };
  next();
}

export function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export const centsAEuros = (c: number) => (c / 100).toFixed(2).replace('.', ',');

// ---------- Gestió d'errors ----------

const MAX_REGISTRE = 1024 * 1024;
const FITXERS_REGISTRE = 3;

/** Afegeix una línia a <carpeta de la BD>/registre.log (rota a 1 MB i en conserva 3). No llança mai. */
export function registraError(err: unknown, context = '') {
  try {
    const dir = dirDades();
    if (!dir || typeof fs?.appendFileSync !== 'function') return;
    const fitxer = path.join(dir, 'registre.log');
    if (fs.existsSync(fitxer) && fs.statSync(fitxer).size > MAX_REGISTRE) {
      for (let i = FITXERS_REGISTRE - 1; i >= 1; i--) {
        const de = i === 1 ? fitxer : `${fitxer}.${i - 1}`;
        if (fs.existsSync(de)) fs.renameSync(de, `${fitxer}.${i}`);
      }
    }
    const detall = err instanceof Error ? (err.stack ?? err.message) : String(err);
    fs.appendFileSync(fitxer, `[${new Date().toISOString()}] ${context}${context ? ' ' : ''}${detall}
`);
  } catch {
    // Si no es pot escriure el registre, ja s'ha mostrat a la consola.
  }
}

const mida = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${Math.round(bytes / 1024 / 1024)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Es tradueix aquí: si l'error ve d'express.json, el middleware traduccioErrors encara no s'ha executat.
  const envia = (status: number, error: string) => res.status(status).json({ error: tradueix(error, idiomaDe(req)) });
  if (err instanceof HttpError) {
    envia(err.status, err.message);
    return;
  }
  const e = (err ?? {}) as { type?: string; status?: number; limit?: number; errcode?: number; code?: string };
  // Errors del lector del cos de la petició (express.json): conserven el seu codi.
  if (e.type === 'entity.too.large' || e.status === 413) {
    envia(413, `El fitxer o les dades són massa grans (màxim ${mida(e.limit ?? 0)}).`);
    return;
  }
  if (e.type === 'entity.parse.failed') {
    envia(400, 'Les dades enviades no tenen un format vàlid (JSON incorrecte).');
    return;
  }
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500 && typeof e.type === 'string') {
    envia(e.status, 'Petició no vàlida.');
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  // Disparadors de SQLite amb RAISE(ABORT, 'missatge'): el missatge (en català) és per a l'usuari.
  // node:sqlite indica SQLITE_CONSTRAINT_TRIGGER (1811); a la demostració (sql.js) només hi ha el missatge.
  const esDemo = typeof process === 'undefined';
  if (e.errcode === 1811 || (esDemo && err instanceof Error && err.constructor === Error && esMissatgeDisparador(msg))) {
    envia(409, msg);
    return;
  }
  if (msg.includes('FOREIGN KEY constraint failed')) {
    envia(409, "No es pot eliminar: hi ha altres registres que en depenen.");
    return;
  }
  if (msg.includes('UNIQUE constraint failed: socis.num_soci')) {
    envia(409, 'Ja existeix un soci amb aquest número.');
    return;
  }
  if (msg.includes('UNIQUE constraint failed')) {
    envia(409, 'Registre duplicat.');
    return;
  }
  console.error(err);
  registraError(err, req?.method && req.originalUrl ? `${req.method} ${req.originalUrl}` : '');
  envia(500, 'Error intern del servidor.');
}

/** A sql.js, els errors dels RAISE no es distingeixen: s'accepten els textos «humans» que acaben en punt. */
const esMissatgeDisparador = (msg: string) =>
  /[.!]$/.test(msg) && !/constraint failed|no such|syntax error|SQLITE|datatype mismatch|database|not an error|out of memory/i.test(msg);
