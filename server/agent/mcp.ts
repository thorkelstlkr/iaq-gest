// Servidor MCP (Model Context Protocol) del programa: el fa servir Claude, ChatGPT, Gemini, Copilot,
// Cursor, LM Studio… Implementa el mínim del protocol (JSON-RPC 2.0): initialize, tools/list,
// tools/call i ping. El mateix gestor serveix per a HTTP (/api/agent-ia/mcp) i per al pont stdio (scripts/mcp.ts).
import { getConfig } from '../db.ts';
import { versioApp } from '../copies.ts';
import { descripcioPublica, einesPerClau, esquemaPublic, executaEina } from './executor.ts';
import { ErrorApi } from './intern.ts';
import type { ClauAgent } from './tipus.ts';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

interface MissatgeRpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
}

/** Instruccions generals per a l'agent: context de l'entitat i normes de funcionament. */
export function instruccions(): string {
  const nom = getConfig('nom_complet') || getConfig('nom') || 'the association';
  return [
    `You help manage «${nom}», a small non-profit association (Spain). The volunteer board uses this program for members, fees, accounting, activities, website, governance and compliance.`,
    'Rules:',
    '- Answer in the language the user writes in (usually Catalan or Spanish).',
    '- Start with get_overview or get_alerts when you need context about pending work.',
    '- Amounts in fields ending in "_cents" are euro cents: divide by 100 to show euros.',
    '- Dates are YYYY-MM-DD. Members are identified by "id" (internal) and "num_soci" (membership number).',
    '- Sensitive personal data (ID numbers, bank accounts, addresses, birth dates, photos) is never available to you by design; do not ask for it.',
    '- Tools marked as proposals do not act immediately: they wait for human approval. Never claim an email was sent or something was published until its proposal is approved (check with get_proposal_status).',
    '- Prefer searching before creating to avoid duplicates. Confirm with the user before bulk changes.',
  ].join('\n');
}

const resultatOk = (id: MissatgeRpc['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const resultatError = (id: MissatgeRpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** Gestiona un missatge JSON-RPC. Torna la resposta, o null si era una notificació. */
export async function gestionaMcp(m: MissatgeRpc, c: ClauAgent): Promise<object | null> {
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    return resultatError(m?.id ?? null, -32600, 'Invalid request');
  }
  const esNotificacio = m.id === undefined;
  try {
    switch (m.method) {
      case 'initialize': {
        const demanada = String(m.params?.protocolVersion ?? '');
        return resultatOk(m.id, {
          protocolVersion: VERSIONS.includes(demanada) ? demanada : VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'iaraque-gestio', title: getConfig('nom') || 'Gestió', version: versioApp() },
          instructions: instruccions(),
        });
      }
      case 'ping':
        return esNotificacio ? null : resultatOk(m.id, {});
      case 'tools/list':
        return resultatOk(m.id, {
          tools: einesPerClau(c).map((e) => ({
            name: e.nom,
            description: descripcioPublica(e),
            inputSchema: esquemaPublic(e),
            annotations: {
              readOnlyHint: e.nivell === 'lectura',
              destructiveHint: false,
              idempotentHint: e.nivell === 'lectura',
              openWorldHint: e.nivell === 'proposta',
            },
          })),
        });
      case 'tools/call': {
        const nom = String(m.params?.name ?? '');
        const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
        try {
          const r = await executaEina(nom, args, c);
          return resultatOk(m.id, {
            content: [{ type: 'text', text: JSON.stringify(r, null, 1) }],
            ...(r && typeof r === 'object' && !Array.isArray(r) ? { structuredContent: r } : {}),
          });
        } catch (err) {
          // Els errors de l'eina es tornen com a resultat perquè el model els pugui llegir i corregir.
          const missatge = err instanceof Error ? err.message : String(err);
          return resultatOk(m.id, { content: [{ type: 'text', text: `Error: ${missatge}` }], isError: true });
        }
      }
      default:
        if (m.method.startsWith('notifications/')) return null;
        // Recursos i indicacions: el programa no en té; es responen buits per als clients que els demanen.
        if (m.method === 'resources/list') return resultatOk(m.id, { resources: [] });
        if (m.method === 'prompts/list') return resultatOk(m.id, { prompts: [] });
        return esNotificacio ? null : resultatError(m.id, -32601, `Method not found: ${m.method}`);
    }
  } catch (err) {
    const codi = err instanceof ErrorApi && err.status < 500 ? -32602 : -32603;
    return esNotificacio ? null : resultatError(m.id, codi, err instanceof Error ? err.message : String(err));
  }
}
