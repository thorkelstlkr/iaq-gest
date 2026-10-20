// GET /api/avisos: avisos de tots els mòduls que l'usuari pot veure.
import { Router } from 'express';
import { pot } from '../../shared/permisos.ts';
import { usuariDe } from '../routes/auth.ts';
import type { FontAvisos } from './tipus.ts';
import { avisos as socis } from './socis.ts';
import { avisos as governanca } from './governanca.ts';
import { avisos as tresoreria } from './tresoreria.ts';
import { avisos as activitats } from './activitats.ts';
import { avisos as operacions } from './operacions.ts';
import { avisos as comunitat } from './comunitat.ts';
import { avisos as subvencions } from './subvencions.ts';
import { avisos as fiscal } from './fiscal.ts';
import { avisos as donatius } from './donatius.ts';

const FONTS: FontAvisos[] = [operacions, governanca, socis, tresoreria, activitats, comunitat, subvencions, fiscal, donatius];

export const avisosRouter = Router();

avisosRouter.get('/', (req, res) => {
  const rol = usuariDe(req)?.rol;
  const llista = FONTS.flatMap((f) => {
    try {
      return f();
    } catch (e) {
      console.error('Avisos:', e);
      return [];
    }
  }).filter((a) => pot(rol, a.modul));
  llista.sort((a, b) => (a.nivell === b.nivell ? 0 : a.nivell === 'alerta' ? -1 : 1));
  res.json(llista);
});
