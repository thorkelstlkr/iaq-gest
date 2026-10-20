// Execució de les eines dels agents: clau personal, permisos del perfil, propostes, filtre de dades i registre.
//
// Cada persona connecta el seu propi agent d'IA al seu compte amb una clau personal. L'agent actua com
// aquesta persona: té exactament els permisos del seu perfil (mai més), només pot fer servir les eines
// (no la resta de l'API) i mai no rep dades personals sensibles.
import { createHash, randomBytes } from 'node:crypto';
import { all, get, run } from '../db.ts';
import { registraSistema } from '../auditoria.ts';
import { PERFILS } from '../../shared/permisos.ts';
import type { Modul } from '../../shared/permisos.ts';
import { filtraSensible } from './filtre.ts';
import { ErrorApi, apiInterna, sessioAgent } from './intern.ts';
import { EINES } from './eines/index.ts';
import type { ClauAgent, Eina, EsquemaJson } from './tipus.ts';

// ---------- Claus personals ----------

export const hashClau = (clau: string) => createHash('sha256').update(clau).digest('hex');

/** Crea una clau per a l'agent d'una persona. Només es mostra ara: a la base de dades se'n desa el hash. */
export function creaClau(o: { usuariId: number; nom: string; mode: 'lectura' | 'complet'; caducaEl: string | null }) {
  const clau = `iaq_${randomBytes(24).toString('base64url')}`;
  const { id } = run(
    'INSERT INTO agent_claus (usuari_id, nom, prefix, hash, mode, caduca_el) VALUES (?, ?, ?, ?, ?, ?)',
    o.usuariId, o.nom, clau.slice(0, 10), hashClau(clau), o.mode, o.caducaEl,
  );
  return { id, clau };
}

interface FilaClau {
  id: number;
  nom: string;
  mode: string;
  usuari_id: number;
  usuari_nom: string;
  rol: string;
}

const filaAClau = (f: FilaClau): ClauAgent => ({
  id: f.id,
  nom: f.nom,
  usuari_id: f.usuari_id,
  usuari_nom: f.usuari_nom,
  rol: f.rol,
  moduls: [...((PERFILS as Record<string, { moduls: Modul[] }>)[f.rol]?.moduls ?? [])],
  mode: f.mode === 'lectura' ? 'lectura' : 'complet',
});

/** Clau vàlida: no revocada, no caducada i d'una persona amb el compte actiu. */
export function clauPerValor(valor: string | null | undefined): ClauAgent | null {
  if (!valor || !valor.startsWith('iaq_')) return null;
  const f = get<FilaClau>(
    `SELECT c.id, c.nom, c.mode, c.usuari_id, u.nom AS usuari_nom, u.rol
       FROM agent_claus c JOIN usuaris u ON u.id = c.usuari_id
      WHERE c.hash = ? AND c.revocada_el IS NULL AND u.actiu = 1
        AND (c.caduca_el IS NULL OR c.caduca_el >= date('now', 'localtime'))`,
    hashClau(valor),
  );
  if (!f) return null;
  run("UPDATE agent_claus SET darrer_us = datetime('now') WHERE id = ?", f.id);
  return filaAClau(f);
}

/** Nom amb què surt l'agent als registres: «Maria Vives (agent: Claude de casa)». */
export const nomAgent = (c: ClauAgent) => `${c.usuari_nom} (agent: ${c.nom})`;

// ---------- Eines disponibles ----------

export function einesPerClau(c: ClauAgent): Eina[] {
  return EINES.filter((e) => c.moduls.includes(e.modul) && (c.mode === 'complet' || e.nivell === 'lectura'));
}

/** Esquema que veu l'agent: les propostes porten, a més, el motiu (per a qui l'ha d'aprovar). */
export function esquemaPublic(e: Eina): EsquemaJson {
  const base: EsquemaJson = { additionalProperties: false, ...e.parametres };
  if (e.nivell !== 'proposta') return base;
  return {
    ...base,
    properties: {
      ...base.properties,
      reason: { type: 'string', description: "Short explanation, in the user's language, of why this is proposed. Shown to the person who approves it." },
    },
  };
}

export const descripcioPublica = (e: Eina) =>
  e.nivell === 'proposta'
    ? `${e.descripcio}\n\nThis action is NOT executed immediately: it creates a proposal that the user must approve in the program (menu «El meu agent d'IA» → Proposals). Tell the user it is waiting for approval.`
    : e.descripcio;

function validaArguments(e: Eina, args: Record<string, unknown>) {
  for (const r of e.parametres.required ?? []) {
    if (args[r] === undefined || args[r] === null || args[r] === '') throw new ErrorApi(400, `Missing required parameter "${r}".`);
  }
}

const resumJson = (v: unknown, max = 4000) => {
  const s = JSON.stringify(v);
  return s && s.length > max ? `${s.slice(0, max)}…` : s;
};

function registra(c: ClauAgent, e: { nom: string; nivell: string }, args: unknown, correcte: boolean, detall?: string) {
  run(
    'INSERT INTO agent_registre (clau_id, usuari_id, agent, eina, nivell, arguments, correcte, detall) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    c.id, c.usuari_id, nomAgent(c), e.nom, e.nivell, resumJson(args, 2000), correcte ? 1 : 0, detall?.slice(0, 2000) ?? null,
  );
}

// ---------- Execució ----------

export async function executaEina(nom: string, args: Record<string, any>, c: ClauAgent): Promise<unknown> {
  const e = einesPerClau(c).find((x) => x.nom === nom);
  if (!e) {
    registra(c, { nom, nivell: '?' }, args, false, 'Eina inexistent o no permesa');
    throw new ErrorApi(404, `Tool "${nom}" does not exist or your profile is not allowed to use it.`);
  }
  try {
    validaArguments(e, args);
    const api = apiInterna(sessioAgent(c.usuari_id), { agent: true });
    if (e.nivell === 'proposta') {
      const { reason, ...resta } = args;
      const resum = e.resum ? await e.resum(resta, api) : e.nom;
      const { id } = run(
        'INSERT INTO agent_propostes (clau_id, usuari_id, agent, eina, arguments, resum, motiu) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c.id, c.usuari_id, nomAgent(c), e.nom, JSON.stringify(resta), resum, typeof reason === 'string' ? reason.slice(0, 1000) : null,
      );
      registra(c, e, resta, true, `Proposta #${id}`);
      return {
        proposal_id: id,
        status: 'pending_approval',
        summary: resum,
        message: "Proposal created. The user must approve it in the program (menu «El meu agent d'IA» → Proposals) before it is executed.",
      };
    }
    const resultat = filtraSensible(await e.executa(args, api));
    registra(c, e, args, true);
    return resultat;
  } catch (err) {
    const missatge = err instanceof Error ? err.message : String(err);
    registra(c, e, args, false, missatge);
    throw err instanceof ErrorApi ? err : new ErrorApi(500, missatge);
  }
}

// ---------- Propostes ----------

export interface Proposta {
  id: number;
  usuari_id: number | null;
  agent: string;
  eina: string;
  arguments: string;
  resum: string;
  motiu: string | null;
  estat: string;
  resultat: string | null;
  creat_el: string;
  decidit_per: string | null;
  decidit_el: string | null;
}

/** Propostes d'una persona (o de tothom, per a l'administració). */
export const llistaPropostes = (usuariId: number | null) =>
  all<Proposta>(
    `SELECT * FROM agent_propostes ${usuariId === null ? '' : 'WHERE usuari_id = ?'}
      ORDER BY estat = 'pendent' DESC, id DESC LIMIT 200`,
    ...(usuariId === null ? [] : [usuariId]),
  );

export const propostaPerId = (id: number) => get<Proposta>('SELECT * FROM agent_propostes WHERE id = ?', id);

/** Executa una proposta amb la sessió (i els permisos) de la persona que l'aprova. */
export async function aprovaProposta(id: number, sessio: string, persona: string): Promise<Proposta> {
  const p = get<Proposta>("SELECT * FROM agent_propostes WHERE id = ? AND estat = 'pendent'", id);
  if (!p) throw new ErrorApi(404, 'Aquesta proposta no existeix o ja està decidida.');
  const e = EINES.find((x) => x.nom === p.eina);
  if (!e) throw new ErrorApi(400, 'Aquesta proposta fa servir una eina que ja no existeix.');
  try {
    const resultat = await e.executa(JSON.parse(p.arguments), apiInterna(sessio));
    run(
      "UPDATE agent_propostes SET estat = 'executada', resultat = ?, decidit_per = ?, decidit_el = datetime('now') WHERE id = ?",
      resumJson(resultat), persona, id,
    );
    registraSistema(persona, 'modifica', 'agent_proposta', id, `Proposta de l'agent aprovada: ${p.resum}`);
  } catch (err) {
    run(
      "UPDATE agent_propostes SET estat = 'error', resultat = ?, decidit_per = ?, decidit_el = datetime('now') WHERE id = ?",
      err instanceof Error ? err.message : String(err), persona, id,
    );
  }
  return propostaPerId(id)!;
}

export function rebutjaProposta(id: number, persona: string, motiu?: string | null): Proposta {
  const p = get<Proposta>("SELECT * FROM agent_propostes WHERE id = ? AND estat = 'pendent'", id);
  if (!p) throw new ErrorApi(404, 'Aquesta proposta no existeix o ja està decidida.');
  run(
    "UPDATE agent_propostes SET estat = 'rebutjada', resultat = ?, decidit_per = ?, decidit_el = datetime('now') WHERE id = ?",
    motiu ?? null, persona, id,
  );
  return propostaPerId(id)!;
}
