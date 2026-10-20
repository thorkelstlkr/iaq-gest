// Origen de la petició en curs: si l'ha fet un agent d'IA (a través de les seves eines).
// Serveix per a regles que només restringeixen (p. ex. no publicar la web automàticament pels canvis
// d'un agent): una capçalera falsa només podria fer que algú es restringís a si mateix.
import { AsyncLocalStorage } from 'node:async_hooks';

const context = typeof AsyncLocalStorage === 'function' ? new AsyncLocalStorage<{ agent: boolean }>() : null;

export const CAPCALERA_ORIGEN = 'x-origen';

/** Executa la resta de la petició sabent-ne l'origen. */
export const ambOrigen = (agent: boolean, fn: () => void) => (context ? context.run({ agent }, fn) : fn());

/** Cert si la petició en curs la fa un agent d'IA. */
export const esAccioAgent = () => context?.getStore()?.agent ?? false;
