// Pont MCP per «stdio»: el que arrenquen Claude Desktop, Claude Code, Gemini CLI, GitHub Copilot (VS Code),
// Cursor, LM Studio… Llegeix missatges JSON-RPC de l'entrada estàndard (un per línia), els passa al programa
// (que ha d'estar obert) amb la clau personal de l'agent i n'escriu la resposta a la sortida estàndard.
//
// Configuració (variables d'entorn):
//   IARAQUE_CLAU  clau personal de l'agent (es crea al programa: «El meu agent d'IA»)
//   IARAQUE_URL   adreça del programa (per defecte http://127.0.0.1:3000)
//
// Ús: node scripts/mcp.ts   (tots els missatges de diagnòstic van a stderr: stdout és només per al protocol)

import { createInterface } from 'node:readline';

const URL_PROGRAMA = (process.env.IARAQUE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const CLAU = process.env.IARAQUE_CLAU || '';

const escriu = (m: unknown) => process.stdout.write(`${JSON.stringify(m)}\n`);
const errorRpc = (id: unknown, message: string) => escriu({ jsonrpc: '2.0', id: id ?? null, error: { code: -32000, message } });

if (!CLAU) console.error("Falta la variable IARAQUE_CLAU amb la clau personal de l'agent (es crea al programa: «El meu agent d'IA»).");

async function envia(missatge: { id?: unknown }) {
  try {
    const r = await fetch(`${URL_PROGRAMA}/api/agent-ia/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CLAU}` },
      body: JSON.stringify(missatge),
    });
    if (r.status === 202) return; // notificació: no hi ha resposta
    const cos = await r.json().catch(() => null);
    if (!r.ok) {
      if (missatge.id !== undefined) errorRpc(missatge.id, (cos as { error?: string })?.error ?? `HTTP ${r.status}`);
      return;
    }
    escriu(cos);
  } catch {
    if (missatge.id !== undefined) {
      errorRpc(missatge.id, `No s'ha pogut connectar amb el programa a ${URL_PROGRAMA}. Obre'l (Iniciar.bat) i torna-ho a provar.`);
    }
  }
}

const linies = createInterface({ input: process.stdin });
const pendents = new Set<Promise<void>>();
linies.on('line', (linia) => {
  if (!linia.trim()) return;
  let missatge: { id?: unknown };
  try {
    missatge = JSON.parse(linia);
  } catch {
    errorRpc(null, 'JSON no vàlid');
    return;
  }
  const p = envia(missatge).finally(() => pendents.delete(p));
  pendents.add(p);
});
// Quan el client tanca l'entrada, s'acaben les peticions pendents i el procés surt sol
// (sense process.exit, que a Windows pot fallar mentre es tanquen les connexions).
linies.on('close', () => {
  void Promise.all(pendents).then(() => {
    process.exitCode = 0;
    process.stdin.unref?.();
  });
});
