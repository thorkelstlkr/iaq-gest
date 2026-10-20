// Eines generals: visió de conjunt, avisos, calendari d'obligacions i estat de les propostes.
import { get } from '../../db.ts';
import type { Eina } from '../tipus.ts';

const any = { type: 'integer', description: 'Financial year (e.g. 2026). Defaults to the current year.' };
const anyActual = () => new Date().getFullYear();

export const EINES_GENERALS: Eina[] = [
  {
    nom: 'get_overview',
    descripcio:
      'Summary of the association for a financial year: active members, joins and leavings, account balances, income and expenses, fee collection status, recent movements and upcoming activities. Good starting point.',
    parametres: { type: 'object', properties: { year: any } },
    nivell: 'lectura',
    modul: 'informes',
    executa: (a, api) => api.get(`/informes/tauler?exercici=${a.year ?? anyActual()}`),
  },
  {
    nom: 'get_alerts',
    descripcio:
      'Current alerts that need attention (legal deadlines, expiring board terms, pending approvals, unpaid fees, backups, minors without authorisation…). Each alert has a text with {0} placeholders filled by "valors" and a link to the screen where it is solved.',
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'informes',
    executa: (_a, api) => api.get('/avisos'),
  },
  {
    nom: 'get_obligations_calendar',
    descripcio:
      'Yearly calendar of legal and tax obligations (general assembly, tax forms 111/115/190/180/347/182/200, registry notifications, insurance renewals, grant justifications) with due dates and status (fet = done, pendent = pending, no_aplica = not applicable).',
    parametres: { type: 'object', properties: { year: any } },
    nivell: 'lectura',
    modul: 'informes',
    executa: (a, api) => api.get(`/calendari?any=${a.year ?? anyActual()}`),
  },
  {
    nom: 'get_proposal_status',
    descripcio: 'Status of a proposal created earlier by an AI agent: pendent (waiting for approval), executada (approved and done), rebutjada (rejected) or error.',
    parametres: { type: 'object', properties: { proposal_id: { type: 'integer' } }, required: ['proposal_id'] },
    nivell: 'lectura',
    modul: 'informes',
    executa: async (a) => {
      const p = get<{ result: string | null } & Record<string, unknown>>(
        'SELECT id, eina AS tool, resum AS summary, estat AS status, resultat AS result, decidit_per AS decided_by, decidit_el AS decided_at FROM agent_propostes WHERE id = ?',
        Number(a.proposal_id),
      );
      if (!p) return { error: 'Proposal not found' };
      // El resultat es desa com a JSON: es torna com a objecte perquè el filtre de dades sensibles hi pugui entrar.
      let result: unknown = p.result;
      try {
        result = p.result ? JSON.parse(p.result) : null;
      } catch {
        result = p.result;
      }
      return { ...p, result };
    },
  },
];
