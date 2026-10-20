import * as socis from './socis.ts';
import * as governanca from './governanca.ts';
import * as tresoreria from './tresoreria.ts';
import * as activitats from './activitats.ts';
import * as operacions from './operacions.ts';
import * as comunitat from './comunitat.ts';
import * as subvencions from './subvencions.ts';
import * as fiscal from './fiscal.ts';
import * as donatius from './donatius.ts';
import * as disseny from './disseny.ts';
import * as agent from './agent.ts';
import * as ajuda from './ajuda.ts';
import * as assistent from './assistent.ts';

const MODULS = [socis, governanca, tresoreria, activitats, operacions, comunitat, subvencions, fiscal, donatius, disseny, agent, ajuda, assistent];
export const modulsEs: Record<string, string> = Object.assign({}, ...MODULS.map((m) => m.es));
export const modulsEn: Record<string, string> = Object.assign({}, ...MODULS.map((m) => m.en));
