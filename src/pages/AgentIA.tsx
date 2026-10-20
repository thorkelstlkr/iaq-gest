// «El meu agent d'IA»: cada persona connecta el seu agent (Claude, ChatGPT, Gemini, Copilot…) al seu compte,
// en revisa i aprova les propostes i en veu l'activitat.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import type { ReactNode } from 'react';
import { useEntitat } from '../entitat';
import { DEMO } from '../mode';
import { t } from '../i18n';
import '../styles/agent.css';

type Pestanya = 'connecta' | 'propostes' | 'activitat' | 'eines';

interface Clau {
  id: number;
  nom: string;
  prefix: string;
  mode: 'lectura' | 'complet';
  caduca_el: string | null;
  creat_el: string;
  darrer_us: string | null;
  revocada_el: string | null;
  usuari_nom: string;
}
interface Proposta {
  id: number;
  agent: string;
  eina: string;
  resum: string;
  motiu: string | null;
  estat: 'pendent' | 'executada' | 'rebutjada' | 'error';
  resultat: string | null;
  creat_el: string;
  decidit_per: string | null;
  decidit_el: string | null;
}
interface Connexio {
  url: string;
  mcp_url: string;
  openapi_url: string;
  carpeta: string;
  node: string;
  /** Adreça des d'altres equips (Tailscale o xarxa local), si el programa hi escolta. */
  url_xarxa: string | null;
  es_tailscale: boolean;
  /** Adreça pública https (túnel cap al port dels agents), si s'ha configurat. */
  url_publica: string | null;
  port_agents: number | null;
  /** Variables extra perquè el programa instal·lat faci de pont (ELECTRON_RUN_AS_NODE). */
  env_extra?: Record<string, string>;
}

/** Etiqueta d'estat (verd, groc, vermell o gris). */
const Estat = ({ to, children }: { to: 'ok' | 'avis' | 'perill' | 'neutre'; children: ReactNode }) => (
  <span className={`agent-estat agent-estat-${to}`}>{children}</span>
);

/** Data i hora locals a partir d'un valor UTC de SQLite («2026-10-18 09:41:45»). */
const quan = (v: string | null) => (v ? new Date(`${v.replace(' ', 'T')}Z`).toLocaleString() : '—');

export default function AgentIA() {
  const [pestanya, setPestanya] = useState<Pestanya>('connecta');
  const { usuari } = useEntitat();
  const admin = usuari?.rol === 'admin';
  const [totes, setTotes] = useState(false);
  const { data: propostes, reload: recarregaPropostes } = useApi<Proposta[]>(DEMO ? null : `/agent/propostes${totes ? '?totes=1' : ''}`);
  const pendents = propostes?.filter((p) => p.estat === 'pendent').length ?? 0;

  if (DEMO) {
    return (
      <>
        <Capcalera titol={t("El meu agent d'IA")} subtitol={t("Connecta el teu assistent d'IA al teu compte")} />
        <Buit>{t("Els agents d'IA es connecten al programa instal·lat a l'ordinador; a la demostració no estan disponibles.")}</Buit>
      </>
    );
  }

  const PESTANYES: [Pestanya, string][] = [
    ['connecta', t("Connecta")],
    ['propostes', pendents ? t("Propostes ({0})", pendents) : t("Propostes")],
    ['activitat', t("Activitat")],
    ['eines', t("Què pot fer")],
  ];

  return (
    <>
      <Capcalera titol={t("El meu agent d'IA")} subtitol={t("Connecta el teu assistent d'IA al teu compte: actua amb els teus permisos i mai no veu dades personals sensibles")} />
      <div className="pestanyes" role="tablist">
        {PESTANYES.map(([id, text]) => (
          <button key={id} role="tab" aria-selected={pestanya === id} className={pestanya === id ? 'actiu' : ''} onClick={() => setPestanya(id)}>
            {text}
          </button>
        ))}
        {admin && (
          <label className="casella agent-totes">
            <input type="checkbox" checked={totes} onChange={(e) => setTotes(e.target.checked)} />
            {t("Mostra els agents de tothom")}
          </label>
        )}
      </div>
      {pestanya === 'connecta' && <Connecta totes={totes} />}
      {pestanya === 'propostes' && <Propostes propostes={propostes} onCanvi={recarregaPropostes} />}
      {pestanya === 'activitat' && <Activitat totes={totes} />}
      {pestanya === 'eines' && <Eines />}
    </>
  );
}

// ---------- Connecta ----------

function Connecta({ totes }: { totes: boolean }) {
  const { data: claus, error, reload } = useApi<Clau[]>(`/agent/claus${totes ? '?totes=1' : ''}`);
  const { data: connexio } = useApi<Connexio>('/agent/connexio');
  const [nova, setNova] = useState(false);
  const [creada, setCreada] = useState<{ clau: string; nom: string } | null>(null);
  const [codi, setCodi] = useState(false);

  async function revoca(c: Clau) {
    if (!(await confirma(t("Vols revocar la clau «{0}»? L'agent que la fa servir deixarà de tenir accés immediatament.", c.nom)))) return;
    try {
      await api.del(`/agent/claus/${c.id}`);
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <div className="agent-connecta">
      <section className="targeta">
        <div className="targeta-cap">
          <h2>{t("Les meves claus")}</h2>
          <div className="accions">
            <button className="boto boto-secundari" onClick={() => setCodi(true)} title={t("Per connectar Claude (web o mòbil) o ChatGPT")}>
              {t("Codi de connexió")}
            </button>
            <button className="boto" onClick={() => setNova(true)}>
              {t("+ Nova clau")}
            </button>
          </div>
        </div>
        <p className="apagat petit">
          {t("Cada clau connecta un agent (per exemple, Claude a l'ordinador de casa o ChatGPT al mòbil). L'agent fa les coses en nom teu, amb els permisos del teu perfil; el que té efectes fora del programa (enviar correus, publicar, cobrar, facturar…) et queda pendent d'aprovar a «Propostes».")}
        </p>
        {!claus ? (
          <Carregant error={error} />
        ) : claus.length === 0 ? (
          <Buit>{t("Encara no has connectat cap agent.")}</Buit>
        ) : (
          <table className="taula">
            <thead>
              <tr>
                <th>{t("Nom")}</th>
                {totes && <th>{t("Persona")}</th>}
                <th>{t("Permisos")}</th>
                <th>{t("Darrer ús")}</th>
                <th>{t("Estat")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {claus.map((c) => (
                <tr key={c.id} className={c.revocada_el ? 'apagat' : ''}>
                  <td>
                    {c.nom}
                    <div className="apagat petit codi">{c.prefix}…</div>
                  </td>
                  {totes && <td>{c.usuari_nom}</td>}
                  <td>{c.mode === 'lectura' ? t("Només consultar") : t("Consultar i gestionar")}</td>
                  <td className="petit">{quan(c.darrer_us)}</td>
                  <td>
                    {c.revocada_el ? (
                      <Estat to="neutre">{t("Revocada")}</Estat>
                    ) : c.caduca_el ? (
                      <Estat to="avis">{t("Fins al {0}", c.caduca_el)}</Estat>
                    ) : (
                      <Estat to="ok">{t("Activa")}</Estat>
                    )}
                  </td>
                  <td>
                    {!c.revocada_el && (
                      <button className="boto boto-petit boto-secundari" onClick={() => revoca(c)}>
                        {t("Revoca")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {connexio && <Instruccions connexio={connexio} clau={creada?.clau ?? null} />}

      {nova && (
        <NovaClau
          onClose={() => setNova(false)}
          onCreada={(clau, nom) => {
            setNova(false);
            setCreada({ clau, nom });
            reload();
          }}
        />
      )}
      {codi && <CodiConnexio onClose={() => setCodi(false)} />}
      {creada && (
        <Modal titol={t("Clau creada: {0}", creada.nom)} onClose={() => setCreada(null)}>
          <p>{t("Copia-la ara: per seguretat no es tornarà a mostrar. Si la perds, revoca-la i crea'n una de nova.")}</p>
          <Copiable text={creada.clau} />
          <p className="apagat petit">{t("Les instruccions de sota ja porten aquesta clau posada mentre no tanquis la pàgina.")}</p>
        </Modal>
      )}
    </div>
  );
}

/** Codi d'un sol ús per connectar una aplicació al núvol per OAuth (Claude.ai, ChatGPT…). */
function CodiConnexio({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ nom: 'Claude.ai', mode: 'complet' });
  const [codi, setCodi] = useState<{ codi: string; caduca: string } | null>(null);
  async function genera(e: FormEvent) {
    e.preventDefault();
    try {
      setCodi(await api.post<{ codi: string; caduca: string }>('/agent/codis-connexio', f));
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <Modal titol={t("Codi de connexió")} onClose={onClose}>
      {!codi ? (
        <form className="formulari" onSubmit={genera}>
          <p className="camp-ample apagat petit">
            {t("Quan connectis Claude (web o mòbil) o ChatGPT, et demanaran aquest codi en una pàgina del programa. Serveix una sola vegada i caduca en 10 minuts. La teva contrasenya no surt mai d'aquí.")}
          </p>
          <Camp etiqueta={t("Per a quina aplicació")} ample>
            <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          </Camp>
          <Camp etiqueta={t("Què pot fer l'agent")} ample>
            <select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
              <option value="complet">{t("Consultar i gestionar (el que té efectes fora del programa, amb la teva aprovació)")}</option>
              <option value="lectura">{t("Només consultar")}</option>
            </select>
          </Camp>
          <div className="formulari-peu camp-ample">
            <span className="espai" />
            <button className="boto">{t("Genera el codi")}</button>
          </div>
        </form>
      ) : (
        <div className="agent-codi">
          <p>{t("Escriu aquest codi a la pàgina de connexió que t'obrirà l'aplicació:")}</p>
          <p className="agent-codi-valor">{codi.codi}</p>
          <p className="apagat petit">{t("Caduca a les {0}. Si caduca, genera'n un altre.", new Date(codi.caduca).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</p>
        </div>
      )}
    </Modal>
  );
}

function NovaClau({ onClose, onCreada }: { onClose: () => void; onCreada: (clau: string, nom: string) => void }) {
  const [f, setF] = useState({ nom: '', mode: 'complet', caduca_el: '' });
  async function crea(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api.post<{ clau: string }>('/agent/claus', { nom: f.nom, mode: f.mode, caduca_el: f.caduca_el || null });
      avisa(t("Clau creada."));
      onCreada(r.clau, f.nom);
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <Modal titol={t("Nova clau per a un agent")} onClose={onClose}>
      <form className="formulari" onSubmit={crea}>
        <Camp etiqueta={t("Nom")} ample ajuda={t("Per reconèixer-la: p. ex. «Claude de casa» o «ChatGPT del mòbil»")}>
          <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Què pot fer l'agent")} ample>
          <select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="complet">{t("Consultar i gestionar (el que té efectes fora del programa, amb la teva aprovació)")}</option>
            <option value="lectura">{t("Només consultar")}</option>
          </select>
        </Camp>
        <Camp etiqueta={t("Caduca (opcional)")}>
          <input type="date" value={f.caduca_el} onChange={(e) => setF({ ...f, caduca_el: e.target.value })} />
        </Camp>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Crea la clau")}</button>
        </div>
      </form>
    </Modal>
  );
}

function Copiable({ text }: { text: string }) {
  return (
    <div className="agent-copiable">
      <pre>{text}</pre>
      <button
        type="button"
        className="boto boto-petit boto-secundari"
        onClick={() =>
          navigator.clipboard.writeText(text).then(
            () => avisa(t("Copiat.")),
            () => avisaError(new Error(t("No s'ha pogut copiar: selecciona el text i copia'l a mà."))),
          )
        }
      >
        {t("Copia")}
      </button>
    </div>
  );
}

/** Instruccions per connectar els clients més habituals, amb la configuració a punt per copiar. */
function Instruccions({ connexio, clau }: { connexio: Connexio; clau: string | null }) {
  const [client, setClient] = useState('claude');
  const CLAU = clau ?? 'LA_TEVA_CLAU';
  const script = `${connexio.carpeta}${connexio.carpeta.includes('\\') ? '\\' : '/'}scripts${connexio.carpeta.includes('\\') ? '\\' : '/'}mcp.ts`;
  const servidor = { command: connexio.node, args: [script], env: { ...(connexio.env_extra ?? {}), IARAQUE_CLAU: CLAU, IARAQUE_URL: connexio.url } };
  const json = (v: unknown) => JSON.stringify(v, null, 2);

  const remot = connexio.url_xarxa;
  const CLIENTS: { id: string; nom: string; fitxer?: string; config?: string; passos: string[] }[] = [
    {
      id: 'claude',
      nom: 'Claude Desktop',
      fitxer: '%APPDATA%\\Claude\\claude_desktop_config.json',
      config: json({ mcpServers: { iaraque: servidor } }),
      passos: [
        t("Obre Claude Desktop → Configuració → Desenvolupador → «Edita la configuració»."),
        t("Enganxa-hi aquesta configuració (si ja n'hi ha d'altres, afegeix «iaraque» dins de «mcpServers»)."),
        t("Tanca i torna a obrir Claude. Ja pots demanar-li coses com «Què tenim pendent aquest mes?»."),
      ],
    },
    {
      id: 'claude-code',
      nom: 'Claude Code',
      config: `claude mcp add iaraque${Object.entries(connexio.env_extra ?? {}).map(([k, v]) => ` --env ${k}=${v}`).join('')} --env IARAQUE_CLAU=${CLAU} --env IARAQUE_URL=${connexio.url} -- "${connexio.node}" "${script}"`,
      passos: [t("Executa aquesta ordre al terminal.")],
    },
    {
      id: 'gemini',
      nom: 'Gemini CLI',
      fitxer: '%USERPROFILE%\\.gemini\\settings.json',
      config: json({ mcpServers: { iaraque: servidor } }),
      passos: [t("Afegeix «iaraque» a «mcpServers» del fitxer de configuració de Gemini CLI i torna'l a obrir.")],
    },
    {
      id: 'copilot',
      nom: 'GitHub Copilot (VS Code)',
      fitxer: '.vscode/mcp.json',
      config: json({ servers: { iaraque: { type: 'stdio', ...servidor } } }),
      passos: [t("A VS Code: ordre «MCP: Add Server» o crea aquest fitxer; després activa les eines al xat de Copilot en mode agent.")],
    },
    {
      id: 'cursor',
      nom: 'Cursor / Windsurf',
      fitxer: '%USERPROFILE%\\.cursor\\mcp.json',
      config: json({ mcpServers: { iaraque: servidor } }),
      passos: [t("Afegeix-ho a la configuració MCP de l'editor (a Windsurf: ~/.codeium/windsurf/mcp_config.json).")],
    },
    {
      id: 'lmstudio',
      nom: t("LM Studio (models locals)"),
      fitxer: 'mcp.json',
      config: json({ mcpServers: { iaraque: servidor } }),
      passos: [
        t("LM Studio → Program → Install → Edit mcp.json, i enganxa-hi aquesta configuració."),
        t("Amb un model local les dades no surten de l'ordinador. Fes servir un model que admeti eines (tool use)."),
      ],
    },
    {
      id: 'remot',
      nom: t("Des d'un altre ordinador"),
      config: remot
        ? json({
            'Claude Code': `claude mcp add --transport http iaraque ${remot}/api/agent-ia/mcp --header "Authorization: Bearer ${CLAU}"`,
            'Gemini CLI (settings.json)': { mcpServers: { iaraque: { httpUrl: `${remot}/api/agent-ia/mcp`, headers: { Authorization: `Bearer ${CLAU}` } } } },
            'VS Code / Copilot (mcp.json)': { servers: { iaraque: { type: 'http', url: `${remot}/api/agent-ia/mcp`, headers: { Authorization: `Bearer ${CLAU}` } } } },
            'Cursor (mcp.json)': { mcpServers: { iaraque: { url: `${remot}/api/agent-ia/mcp`, headers: { Authorization: `Bearer ${CLAU}` } } } },
            // Al Windows de l'altre ordinador, amb el programa instal·lat (sense configurar): el seu executable fa de pont.
            'Claude Desktop': {
              mcpServers: {
                iaraque: {
                  command: '%LOCALAPPDATA%\\Programs\\I ara qué Gestió\\I ara qué Gestió.exe',
                  args: ['%LOCALAPPDATA%\\Programs\\I ara qué Gestió\\resources\\app\\scripts\\mcp.ts'],
                  env: { ELECTRON_RUN_AS_NODE: '1', IARAQUE_CLAU: CLAU, IARAQUE_URL: remot },
                },
              },
            },
          })
        : undefined,
      passos: remot
        ? [
            connexio.es_tailscale
              ? t("El programa és accessible a la vostra xarxa privada Tailscale. A l'altre ordinador, instal·la Tailscale amb el mateix compte.")
              : t("El programa és accessible a la xarxa local: fes-ho només en una xarxa de confiança, o millor amb Tailscale."),
            t("Claude Code, Gemini CLI, VS Code i Cursor s'hi connecten directament amb l'adreça i la clau (tens la configuració a sota)."),
            t("Claude Desktop necessita el pont: instal·la també el programa en aquell ordinador (no cal configurar-lo ni obrir-lo) i fes servir la configuració de «Claude Desktop». Si l'has instal·lat en una altra carpeta, canvia'n les rutes."),
          ]
        : [
            t("Ara el programa només s'obre en aquest ordinador. Per fer-lo servir des d'un altre, l'administració ho ha d'activar a Configuració → Accés remot (recomanat amb Tailscale)."),
          ],
    },
    {
      id: 'claude-web',
      nom: t("Claude (web i mòbil)"),
      config: connexio.url_publica ? `${connexio.url_publica}/api/agent-ia/mcp` : undefined,
      passos: connexio.url_publica
        ? [
            t("A Claude (claude.ai o l'aplicació del mòbil): Configuració → Connectors → «Afegeix un connector personalitzat», i enganxa-hi aquesta adreça."),
            t("Prem «Connecta»: s'obrirà una pàgina del programa que et demanarà un codi. Genera'l aquí amb el botó «Codi de connexió» i escriu-lo."),
            t("Fet: el connector queda a la llista de claus com qualsevol altra i el pots revocar quan vulguis."),
          ]
        : [
            t("Claude al web i al mòbil funcionen al núvol: cal que l'entrada per als agents tingui una adreça pública https (un túnel). L'administració ho configura a Configuració → Accés remot; tens els passos a l'ajuda."),
          ],
    },
    {
      id: 'chatgpt',
      nom: 'ChatGPT',
      config: connexio.url_publica
        ? json({ connector_mcp: `${connexio.url_publica}/api/agent-ia/mcp`, openapi: `${connexio.url_publica}/api/agent-ia/openapi.json`, autenticacio_accions: `Bearer ${CLAU}` })
        : undefined,
      passos: connexio.url_publica
        ? [
            t("Opció 1 (connectors, mode desenvolupador): afegeix un connector amb l'adreça MCP. Quan et demani autoritzar, genera aquí un «Codi de connexió» i escriu-lo a la pàgina del programa."),
            t("Opció 2 (GPT personalitzat amb accions): importa l'esquema OpenAPI i configura l'autenticació «API key» de tipus Bearer amb la clau."),
          ]
        : [
            t("ChatGPT funciona al núvol: cal que l'entrada per als agents tingui una adreça pública https (un túnel). L'administració ho configura a Configuració → Accés remot; tens els passos a l'ajuda."),
          ],
    },
    {
      id: 'api',
      nom: t("Altres (API)"),
      config: json({ eines: `${connexio.url}/api/agent-ia/eines`, crida: `POST ${connexio.url}/api/agent-ia/eines/<nom>`, mcp: connexio.mcp_url, openapi: connexio.openapi_url, capcalera: `Authorization: Bearer ${CLAU}` }),
      passos: [t("Per a programes propis o automatitzacions locals: llista d'eines en format JSON Schema, crida per POST, MCP per HTTP i esquema OpenAPI.")],
    },
  ];
  const c = CLIENTS.find((x) => x.id === client)!;

  return (
    <section className="targeta">
      <h2>{t("Com connectar-lo")}</h2>
      {!clau && <p className="apagat petit">{t("Crea una clau i les instruccions sortiran amb la clau posada. Si ja en tens una, substitueix LA_TEVA_CLAU per la teva clau.")}</p>}
      <p className="apagat petit">
        {t("El programa ha d'estar obert (Iniciar.bat) perquè l'agent hi pugui accedir.")}{' '}
        <Link to="/ajuda/acces-remot">{t("Com fer-lo servir des de fora →")}</Link>
      </p>
      <div className="agent-clients" role="tablist">
        {CLIENTS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={client === x.id} className={client === x.id ? 'actiu' : ''} onClick={() => setClient(x.id)}>
            {x.nom}
          </button>
        ))}
      </div>
      <ol className="agent-passos">
        {c.passos.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
      {c.fitxer && (
        <p className="petit">
          {t("Fitxer:")} <code>{c.fitxer}</code>
        </p>
      )}
      {c.config && <Copiable text={c.config} />}
    </section>
  );
}

// ---------- Propostes ----------

function Propostes({ propostes, onCanvi }: { propostes: Proposta[] | null; onCanvi: () => void }) {
  const [decidint, setDecidint] = useState<number | null>(null);
  if (!propostes) return <Carregant />;

  async function decideix(p: Proposta, aprova: boolean) {
    if (aprova && !(await confirma(t("Aprovar i executar ara: «{0}»?", p.resum)))) return;
    setDecidint(p.id);
    try {
      const r = await api.post<Proposta>(`/agent/propostes/${p.id}/${aprova ? 'aprova' : 'rebutja'}`, {});
      if (r.estat === 'error') avisaError(new Error(t("No s'ha pogut executar: {0}", r.resultat ?? '')));
      else avisa(aprova ? t("Fet.") : t("Proposta rebutjada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    } finally {
      setDecidint(null);
    }
  }

  const pendents = propostes.filter((p) => p.estat === 'pendent');
  const decidides = propostes.filter((p) => p.estat !== 'pendent');
  return (
    <div className="agent-propostes">
      <section className="targeta">
        <h2>{t("Pendents d'aprovar")}</h2>
        {pendents.length === 0 ? (
          <Buit>{t("No hi ha cap proposta pendent.")}</Buit>
        ) : (
          <ul className="agent-llista-propostes">
            {pendents.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.resum}</strong>
                  {p.motiu && <p className="apagat">{p.motiu}</p>}
                  <p className="apagat petit">
                    {p.agent} · {quan(p.creat_el)}
                  </p>
                </div>
                <div className="accions">
                  <button className="boto boto-secundari" disabled={decidint === p.id} onClick={() => decideix(p, false)}>
                    {t("Rebutja")}
                  </button>
                  <button className="boto" disabled={decidint === p.id} onClick={() => decideix(p, true)}>
                    {t("Aprova i executa")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {decidides.length > 0 && (
        <section className="targeta">
          <h2>{t("Decidides")}</h2>
          <table className="taula taula-compacta">
            <tbody>
              {decidides.map((p) => (
                <tr key={p.id}>
                  <td>{p.resum}</td>
                  <td>
                    <Estat to={p.estat === 'executada' ? 'ok' : p.estat === 'error' ? 'perill' : 'neutre'}>
                      {p.estat === 'executada' ? t("Executada") : p.estat === 'error' ? t("Error") : t("Rebutjada")}
                    </Estat>
                    {p.estat === 'error' && p.resultat && <div className="petit negatiu">{p.resultat}</div>}
                  </td>
                  <td className="petit apagat">
                    {p.decidit_per} · {quan(p.decidit_el)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ---------- Activitat ----------

function Activitat({ totes }: { totes: boolean }) {
  const { data, error } = useApi<{ id: number; agent: string; eina: string; nivell: string; arguments: string | null; correcte: number; detall: string | null; data: string }[]>(
    `/agent/registre${totes ? '?totes=1' : ''}`,
  );
  if (!data) return <Carregant error={error} />;
  if (!data.length) return <Buit>{t("El teu agent encara no ha fet res.")}</Buit>;
  return (
    <section className="targeta">
      <p className="apagat petit">{t("Tot el que ha fet o intentat fer el teu agent. Les accions també queden al registre d'auditoria amb el teu nom.")}</p>
      <table className="taula taula-compacta">
        <thead>
          <tr>
            <th>{t("Quan")}</th>
            <th>{t("Agent")}</th>
            <th>{t("Eina")}</th>
            <th>{t("Resultat")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="petit nowrap">{quan(r.data)}</td>
              <td className="petit">{r.agent}</td>
              <td>
                <code>{r.eina}</code>
                {r.arguments && r.arguments !== '{}' && <div className="apagat petit agent-args">{r.arguments}</div>}
              </td>
              <td>{r.correcte ? <Estat to="ok">{r.detall || t("Correcte")}</Estat> : <span className="negatiu petit">{r.detall}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- Eines ----------

function Eines() {
  const { data, error } = useApi<{ nom: string; descripcio: string; nivell: 'lectura' | 'escriptura' | 'proposta' }[]>('/agent/eines');
  if (!data) return <Carregant error={error} />;
  const NIVELLS = {
    lectura: [t("Consulta"), 'neutre'],
    escriptura: [t("Gestiona"), 'ok'],
    proposta: [t("Amb la teva aprovació"), 'avis'],
  } as const;
  return (
    <section className="targeta">
      <p className="apagat petit">
        {t("Accions que el teu agent pot fer segons el teu perfil ({0}). Els noms i les descripcions són en anglès perquè els models d'IA els entenen millor; l'agent et respondrà en el teu idioma.", data.length)}
      </p>
      <table className="taula taula-compacta">
        <tbody>
          {data.map((e) => (
            <tr key={e.nom}>
              <td>
                <code>{e.nom}</code>
              </td>
              <td className="petit">{e.descripcio}</td>
              <td>
                <Estat to={NIVELLS[e.nivell][1]}>{NIVELLS[e.nivell][0]}</Estat>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
