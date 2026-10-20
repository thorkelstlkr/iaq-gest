// Substitut de server/db.ts per a la demostració: mateixa interfície, però sobre sql.js
// (SQLite compilat a JavaScript) carregat des del CDN, amb la base de dades de prova incrustada.

import dbBase64 from 'virtual:demo-db';

interface SqlStatement {
  bind(params: unknown): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  run(params?: unknown): void;
  free(): void;
}
interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  exec(sql: string): { values: unknown[][] }[];
  getRowsModified(): number;
}
declare const initSqlJs: () => Promise<{ Database: new (data?: Uint8Array) => SqlDatabase }>;

export const DB_PATH = ':memory:';
export let db: SqlDatabase;

export const preparat = (
  typeof initSqlJs === 'function'
    ? initSqlJs()
    : Promise.reject(new Error("No s'ha pogut carregar el motor de dades de la demostració. Comprova la connexió i torna a carregar la pàgina."))
).then((SQL) => {
  const bytes = Uint8Array.from(atob(dbBase64), (c) => c.charCodeAt(0));
  db = new SQL.Database(bytes);
  db.exec('PRAGMA foreign_keys = ON;');
});

/** node:sqlite accepta claus sense prefix ({ q }); sql.js les vol amb el prefix ({ $q }). */
function params(args: unknown[]): unknown {
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return Object.fromEntries(
      Object.entries(args[0] as Record<string, unknown>).map(([k, v]) => [/^[$:@]/.test(k) ? k : '$' + k, v]),
    );
  }
  return args;
}

type Row = Record<string, unknown>;

export function all<T = Row>(sql: string, ...args: unknown[]): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params(args));
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    return rows;
  } finally {
    stmt.free();
  }
}

export const get = <T = Row>(sql: string, ...args: unknown[]): T | undefined => all<T>(sql, ...args)[0];

export function run(sql: string, ...args: unknown[]) {
  const stmt = db.prepare(sql);
  try {
    stmt.run(params(args));
  } finally {
    stmt.free();
  }
  const changes = db.getRowsModified();
  const id = Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0]);
  return { id, changes };
}

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getConfig(clau: string): string | null {
  return get<{ valor: string }>('SELECT valor FROM config WHERE clau = ?', clau)?.valor ?? null;
}

export function setConfig(clau: string, valor: string) {
  run('INSERT INTO config (clau, valor) VALUES (?, ?) ON CONFLICT(clau) DO UPDATE SET valor = excluded.valor', clau, valor);
}
