import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import { ClausulaInformativa, FullInscripcio, Imprimible, RegistreActivitats } from '../components/Rgpd';
import type { ConfigRgpd } from '../components/Rgpd';
import { useEntitat } from '../entitat';
import { avui, data, nomComplet } from '../format';
import type { SociLlista } from '../../shared/types';
import { locale, t } from '../i18n';

const PESTANYES = [
  { id: 'resum', text: t("Resum") },
  { id: 'drets', text: t("Sol·licituds de drets") },
  { id: 'conservacio', text: t("Conservació") },
  { id: 'documents', text: t("Documents") },
  { id: 'auditoria', text: t("Registre d'activitat") },
  { id: 'config', text: t("Configuració") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export const TIPUS_DRET: Record<string, string> = {
  acces: t("Accés"),
  rectificacio: t("Rectificació"),
  supressio: t("Supressió"),
  oposicio: t("Oposició"),
  limitacio: t("Limitació del tractament"),
  portabilitat: t("Portabilitat"),
  retirada_consentiment: t("Retirada del consentiment"),
};

export default function ProteccioDades() {
  const [pestanya, setPestanya] = useState<Pestanya>('resum');
  return (
    <>
      <Capcalera titol={t("Protecció de dades")} subtitol={t("Compliment del Reglament general de protecció de dades i de la Llei orgànica 3/2018")} />
      <div className="pestanyes" role="tablist">
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'resum' && <Resum anar={setPestanya} />}
      {pestanya === 'drets' && <Drets />}
      {pestanya === 'conservacio' && <Conservacio />}
      {pestanya === 'documents' && <Documents />}
      {pestanya === 'auditoria' && <Auditoria />}
      {pestanya === 'config' && <ConfigRgpdForm />}
      <p className="apagat petit nota-legal">
        {t("Els textos i documents d'aquest apartat són models orientatius adaptats a una associació petita. Convé que la Junta els revisi i, en cas de dubte, consulti un professional o la guia de l'AEPD per a associacions.")}
      </p>
    </>
  );
}

// ---------- Resum ----------

interface Resum {
  socis_actius: number;
  sense_consentiment: { id: number; num_soci: number; nom: string }[];
  menors_sense_tutor: { id: number; num_soci: number; nom: string }[];
  sense_comunicacions: number;
  drets_pendents: { id: number; sollicitant: string; tipus: string; data_limit: string }[];
  caducats: { socis: number; interessats: number; anys: number; mesos: number };
}

function Resum({ anar }: { anar: (p: Pestanya) => void }) {
  const { data: r, error } = useApi<Resum>('/rgpd/resum');
  if (!r) return <Carregant error={error} />;
  const ok = (cond: boolean) => <span className={`insignia ${cond ? 'insignia-pagada' : 'insignia-pendent'}`}>{cond ? t("Correcte") : t("Cal revisar")}</span>;
  const llista = (socis: { id: number; num_soci: number; nom: string }[]) => (
    <ul className="llista-noms">
      {socis.slice(0, 10).map((s) => (
        <li key={s.id}>
          <Link to={`/socis/${s.id}`}>
            {s.num_soci} · {s.nom}
          </Link>
        </li>
      ))}
      {socis.length > 10 && <li className="apagat">{t("i")} {socis.length - 10} {t("més…")}</li>}
    </ul>
  );

  return (
    <div className="graella-2">
      <section className="targeta">
        <h2>{t("Fulls d'inscripció signats")} {ok(!r.sense_consentiment.length)}</h2>
        <p>
          {r.socis_actius - r.sense_consentiment.length} {t("de")} {r.socis_actius} {t("socis actius tenen signat el full amb la informació de protecció de dades.")}
        </p>
        {r.sense_consentiment.length > 0 && (
          <>
            <p className="apagat petit">{t("Falten (pots imprimir-los el full des de la seva fitxa):")}</p>
            {llista(r.sense_consentiment)}
          </>
        )}
      </section>
      <section className="targeta">
        <h2>{t("Menors de 14 anys")} {ok(!r.menors_sense_tutor.length)}</h2>
        {r.menors_sense_tutor.length ? (
          <>
            <p>{t("Aquests menors no tenen indicat el pare, la mare o el tutor legal, que és qui ha de donar el consentiment:")}</p>
            {llista(r.menors_sense_tutor)}
          </>
        ) : (
          <p>{t("Tots els menors de 14 anys tenen indicat el seu tutor legal.")}</p>
        )}
      </section>
      <section className="targeta">
        <h2>{t("Sol·licituds de drets")} {ok(!r.drets_pendents.length)}</h2>
        {r.drets_pendents.length ? (
          <ul className="llista-noms">
            {r.drets_pendents.map((d) => (
              <li key={d.id}>
                {TIPUS_DRET[d.tipus]} — {d.sollicitant}:{' '}
                <span className={d.data_limit < avui() ? 'negatiu' : ''}>{t("respondre abans del")} {data(d.data_limit)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("No hi ha cap sol·licitud pendent.")}</p>
        )}
        <button className="boto boto-petit boto-secundari" onClick={() => anar('drets')}>
          {t("Gestiona les sol·licituds")}
        </button>
      </section>
      <section className="targeta">
        <h2>{t("Terminis de conservació")} {ok(!r.caducats.socis && !r.caducats.interessats)}</h2>
        <p>
          {r.caducats.socis} {t("socis donats de baixa fa més de")} {r.caducats.anys} {t("anys i")} {r.caducats.interessats} {t("persones interessades de fa més de")} {r.caducats.mesos} {t("mesos.")}
        </p>
        <p className="apagat petit">{r.sense_comunicacions} {t("socis han demanat no rebre comunicacions (el programa ja els exclou dels enviaments).")}</p>
        <button className="boto boto-petit boto-secundari" onClick={() => anar('conservacio')}>
          {t("Revisa-ho")}
        </button>
      </section>
    </div>
  );
}

// ---------- Sol·licituds de drets ----------

interface Dret {
  id: number;
  soci_id: number | null;
  num_soci?: number | null;
  sollicitant: string;
  tipus: string;
  data_sollicitud: string;
  data_limit: string;
  estat: 'pendent' | 'resolta' | 'denegada';
  data_resolucio: string | null;
  notes: string | null;
}

function Drets() {
  const { data: llista, error, reload } = useApi<Dret[]>('/rgpd/drets');
  const [editant, setEditant] = useState<Partial<Dret> | null>(null);
  return (
    <>
      <p className="apagat petit">
        {t("Qualsevol persona pot demanar accedir a les seves dades, rectificar-les, suprimir-les, oposar-s'hi, limitar-ne el tractament o rebre-les en un fitxer. Cal respondre en")} <strong>{t("un mes")}</strong> {t("com a màxim. Des de la fitxa del soci pots exportar totes les seves dades o suprimir-les.")}
      </p>
      <div className="barra-accions">
        <button className="boto" onClick={() => setEditant({ tipus: 'acces', estat: 'pendent', data_sollicitud: avui() })}>
          {t("+ Nova sol·licitud")}
        </button>
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("No s'ha rebut cap sol·licitud.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Rebuda")}</th>
                <th>{t("Persona")}</th>
                <th>{t("Dret")}</th>
                <th>{t("Termini")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((d) => (
                <tr key={d.id} onClick={() => setEditant(d)}>
                  <td className="nowrap">{data(d.data_sollicitud)}</td>
                  <td>
                    {d.sollicitant}
                    {d.soci_id && (
                      <div className="petit">
                        <Link to={`/socis/${d.soci_id}`} onClick={(e) => e.stopPropagation()}>
                          {t("Fitxa del soci")}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td>{TIPUS_DRET[d.tipus]}</td>
                  <td className={`nowrap ${d.estat === 'pendent' && d.data_limit < avui() ? 'negatiu' : ''}`}>{data(d.data_limit)}</td>
                  <td>
                    <span className={`insignia ${d.estat === 'pendent' ? 'insignia-pendent' : d.estat === 'resolta' ? 'insignia-pagada' : 'insignia-exempta'}`}>
                      {d.estat === 'pendent' ? t("Pendent") : d.estat === 'resolta' ? t("Resolta") : t("Denegada")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormDret
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function FormDret(props: { inicial: Partial<Dret>; onClose: () => void; onFet: () => void }) {
  const d = props.inicial;
  const { data: socis } = useApi<SociLlista[]>('/socis?estat=tots');
  const [f, setF] = useState({
    soci_id: d.soci_id ? String(d.soci_id) : '',
    sollicitant: d.sollicitant ?? '',
    tipus: d.tipus ?? 'acces',
    data_sollicitud: d.data_sollicitud ?? avui(),
    estat: d.estat ?? 'pendent',
    data_resolucio: d.data_resolucio ?? '',
    notes: d.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (d.id) await api.put(`/rgpd/drets/${d.id}`, f);
      else await api.post('/rgpd/drets', f);
      avisa(t("Sol·licitud desada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={d.id ? t("Sol·licitud de drets") : t("Nova sol·licitud de drets")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Soci (si ho és)")}>
          <select
            id="dret-soci"
            value={f.soci_id}
            onChange={(e) => {
              const s = socis?.find((x) => String(x.id) === e.target.value);
              setF({ ...f, soci_id: e.target.value, sollicitant: f.sollicitant || (s ? nomComplet(s) : '') });
            }}
          >
            <option value="">{t("— No és soci / no consta —")}</option>
            {socis?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {nomComplet(s)}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Persona que ho demana")}>
          <input id="dret-sollicitant" value={f.sollicitant} onChange={set('sollicitant')} required />
        </Camp>
        <Camp etiqueta={t("Dret que exerceix")}>
          <select id="dret-tipus" value={f.tipus} onChange={set('tipus')}>
            {Object.entries(TIPUS_DRET).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Data de recepció")} ajuda={t("El termini de resposta (un mes) es calcula sol")}>
          <input id="dret-data" type="date" value={f.data_sollicitud} onChange={set('data_sollicitud')} required />
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select id="dret-estat" value={f.estat} onChange={set('estat')}>
            <option value="pendent">{t("Pendent")}</option>
            <option value="resolta">{t("Resolta")}</option>
            <option value="denegada">{t("Denegada (motivada)")}</option>
          </select>
        </Camp>
        {f.estat !== 'pendent' && (
          <Camp etiqueta={t("Data de resposta")}>
            <input id="dret-resolucio" type="date" value={f.data_resolucio} onChange={set('data_resolucio')} />
          </Camp>
        )}
        <Camp etiqueta={t("Notes (què s'ha fet o per què es denega)")} ample>
          <textarea id="dret-notes" rows={3} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Conservació ----------

interface Caducats {
  anys: number;
  mesos: number;
  socis: { id: number; num_soci: number; nom: string; data_baixa: string }[];
  interessats: { id: number; nom: string; data: string; estat: string }[];
}

function Conservacio() {
  const { data: c, error, reload } = useApi<Caducats>('/rgpd/conservacio');
  if (!c) return <Carregant error={error} />;

  async function aplica() {
    if (!(await confirma(t("S'anonimitzaran {0} socis i s'eliminaran {1} persones interessades. No es pot desfer. Continuar?", c!.socis.length, c!.interessats.length)))) return;
    try {
      const r = await api.post<{ socis: number; interessats: number }>('/rgpd/conservacio/aplica');
      avisa(t("Fet: {0} socis anonimitzats i {1} persones interessades eliminades.", r.socis, r.interessats));
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Dades que ja no cal conservar")}</h2>
      <p className="apagat petit">
        {t("Segons la configuració, les dades dels socis es guarden")} {c.anys} {t("anys després de la baixa i les de les persones interessades que no es fan sòcies,")} {c.mesos} {t("mesos. Passat aquest temps s'han de suprimir. Els registres comptables es mantenen, però sense el nom.")}
      </p>
      {!c.socis.length && !c.interessats.length ? (
        <Buit>{t("No hi ha dades que hagin superat el termini de conservació.")}</Buit>
      ) : (
        <>
          {c.socis.length > 0 && (
            <>
              <h3>{t("Socis per anonimitzar")}</h3>
              <ul className="llista-noms">
                {c.socis.map((s) => (
                  <li key={s.id}>
                    {s.num_soci} · {s.nom} {t("(baixa el")} {data(s.data_baixa)})
                  </li>
                ))}
              </ul>
            </>
          )}
          {c.interessats.length > 0 && (
            <>
              <h3>{t("Persones interessades per eliminar")}</h3>
              <ul className="llista-noms">
                {c.interessats.map((i) => (
                  <li key={i.id}>
                    {i.nom} ({data(i.data)})
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="formulari-peu">
            <span className="espai" />
            <button className="boto boto-perill" onClick={aplica}>
              {t("Aplica la supressió")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ---------- Documents ----------

function Documents() {
  const { config } = useEntitat();
  const { data: rgpd } = useApi<ConfigRgpd>('/rgpd/config');
  const [doc, setDoc] = useState<'full' | 'clausula' | 'rat'>('full');
  return (
    <>
      <div className="filtres">
        <select value={doc} onChange={(e) => setDoc(e.target.value as typeof doc)} aria-label={t("Document")}>
          <option value="full">{t("Full d'inscripció en blanc (amb consentiments)")}</option>
          <option value="clausula">{t("Clàusula informativa (per a formularis i cartells)")}</option>
          <option value="rat">{t("Registre d'activitats de tractament (art. 30 RGPD)")}</option>
        </select>
      </div>
      <Imprimible>
        {doc === 'full' && <FullInscripcio config={config} rgpd={rgpd} />}
        {doc === 'clausula' && (
          <>
            <header className="document-cap">
              <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
              <h2>{t("Informació sobre protecció de dades")}</h2>
            </header>
            <ClausulaInformativa config={config} rgpd={rgpd} />
          </>
        )}
        {doc === 'rat' && <RegistreActivitats config={config} rgpd={rgpd} />}
      </Imprimible>
    </>
  );
}

// ---------- Registre d'activitat ----------

const ACCIONS: Record<string, string> = {
  crea: t("Alta"),
  modifica: t("Modificació"),
  elimina: t("Eliminació"),
  exporta: t("Exportació"),
  anonimitza: t("Anonimització"),
  drets: t("Drets"),
  conservacio: t("Conservació"),
  envia: t("Enviament"),
  entra: t("Entrada"),
  entrada_fallida: t("Entrada fallida"),
  contrasenya: t("Contrasenya"),
  configura: t("Configuració"),
  descarrega: t("Descàrrega"),
  restaura: t("Restauració"),
};

function Auditoria() {
  const { data: llista, error } = useApi<{ id: number; data: string; usuari: string; accio: string; entitat: string; entitat_id: number | null; detall: string | null }[]>(
    '/rgpd/auditoria?limit=300',
  );
  if (!llista) return <Carregant error={error} />;
  return (
    <section className="targeta">
      <p className="apagat petit">
        {t("Qui ha creat, modificat, exportat o suprimit dades personals, i quan. Serveix per demostrar que les dades es tracten correctament (responsabilitat proactiva) i per detectar usos indeguts.")}
      </p>
      {llista.length === 0 ? (
        <Buit>{t("Encara no hi ha cap operació registrada.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Data i hora")}</th>
                <th>{t("Usuari")}</th>
                <th>{t("Acció")}</th>
                <th>{t("Detall")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{new Date(a.data.replace(' ', 'T') + 'Z').toLocaleString(locale())}</td>
                  <td>{a.usuari}</td>
                  <td>{ACCIONS[a.accio] ?? a.accio}</td>
                  <td>
                    {a.entitat === 'soci' && a.entitat_id ? <Link to={`/socis/${a.entitat_id}`}>{a.detall}</Link> : a.detall}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- Configuració ----------

function ConfigRgpdForm() {
  const { pot } = useEntitat();
  const { data: cfg, error } = useApi<ConfigRgpd>('/rgpd/config');
  const [f, setF] = useState<ConfigRgpd | null>(null);
  useEffect(() => setF(cfg), [cfg]);
  if (!f) return <Carregant error={error} />;
  const set = (k: keyof ConfigRgpd) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const potEditar = pot('config');

  async function desa(e: FormEvent) {
    e.preventDefault();
    try {
      setF(await api.put<ConfigRgpd>('/rgpd/config', f));
      avisa(t("Desat."));
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("Configuració de protecció de dades")}</h2>
      {!potEditar && <p className="apagat petit camp-ample">{t("Només un usuari d'Administració pot modificar aquests valors.")}</p>}
      <Camp etiqueta={t("Correu per exercir els drets")} ajuda={t("Si es deixa en blanc, s'usa el correu de l'entitat")}>
        <input id="rgpd-contacte" type="email" value={f.rgpd_contacte} onChange={set('rgpd_contacte')} disabled={!potEditar} />
      </Camp>
      <Camp etiqueta={t("Anys de conservació després de la baixa")} ajuda={t("Habitualment 5 (termini general de prescripció)")}>
        <input id="rgpd-anys" type="number" min={1} max={30} value={f.rgpd_conservacio_anys} onChange={set('rgpd_conservacio_anys')} disabled={!potEditar} />
      </Camp>
      <Camp etiqueta={t("Mesos de conservació de persones interessades")}>
        <input id="rgpd-mesos" type="number" min={1} max={60} value={f.rgpd_interessats_mesos} onChange={set('rgpd_interessats_mesos')} disabled={!potEditar} />
      </Camp>
      <Camp etiqueta={t("Delegat de protecció de dades (opcional)")} ajuda={t("Una associació petita normalment no n'ha de tenir")}>
        <input id="rgpd-dpd" value={f.rgpd_dpd} onChange={set('rgpd_dpd')} disabled={!potEditar} />
      </Camp>
      <Camp etiqueta={t("Destinataris habituals (opcional)")} ample ajuda={t("p. ex. «l'entitat bancària, per al cobrament de les quotes domiciliades»")}>
        <input id="rgpd-destinataris" value={f.rgpd_destinataris} onChange={set('rgpd_destinataris')} disabled={!potEditar} />
      </Camp>
      {potEditar && (
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto">{t("Desa")}</button>
        </div>
      )}
    </form>
  );
}
