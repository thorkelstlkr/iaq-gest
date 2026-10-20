// Esquemes dels mòduls. Cada mòdul té el seu fitxer per poder evolucionar per separat.
import type { Esquema } from './tipus.ts';
import { esquema as socis } from './socis.ts';
import { esquema as governanca } from './governanca.ts';
import { esquema as tresoreria } from './tresoreria.ts';
import { esquema as activitats } from './activitats.ts';
import { esquema as operacions } from './operacions.ts';
import { esquema as comunitat } from './comunitat.ts';
import { esquema as subvencions } from './subvencions.ts';
import { esquema as fiscal } from './fiscal.ts';
import { esquema as donatius } from './donatius.ts';
import { esquema as agent } from './agent.ts';

export const ESQUEMES: Esquema[] = [socis, governanca, tresoreria, activitats, operacions, comunitat, subvencions, fiscal, donatius, agent];
