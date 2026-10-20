// Totes les eines que el programa ofereix als agents d'IA, per dominis.
import type { Eina } from '../tipus.ts';
import { EINES_GENERALS } from './general.ts';
import { EINES as persones } from './persones.ts';
import { EINES as economia } from './economia.ts';
import { EINES as programa } from './programa.ts';

export const EINES: Eina[] = [...EINES_GENERALS, ...persones, ...economia, ...programa];

// Els noms han de ser únics (els models els fan servir com a identificador).
const repetits = EINES.map((e) => e.nom).filter((n, i, t) => t.indexOf(n) !== i);
if (repetits.length) throw new Error(`Eines d'agent amb el nom repetit: ${repetits.join(', ')}`);
