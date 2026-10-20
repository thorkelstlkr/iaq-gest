// Tipus comuns dels esquemes de cada mòdul (vegeu server/esquema/index.ts).
import type { DatabaseSync } from 'node:sqlite';

export type AfegeixColumna = (taula: string, columna: string, definicio: string) => void;
/** Crea les taules, columnes, índexs i disparadors d'un mòdul. S'executa a cada arrencada: ha de ser idempotent. */
export type Esquema = (db: DatabaseSync, afegeixColumna: AfegeixColumna) => void;
