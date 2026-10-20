// Fitxa d'una reunió: dades, convocatòria, assistència i quòrum, acords i acta.
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { EditorText } from '../EditorText';
import { Imprimible } from '../Rgpd';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { CLASSE_ESTAT, ESTATS_REUNIO, RESULTATS, nomSoci, titolReunio } from './comuns';
import type { Acord, ActaCompleta, ConfigGov, DetallReunio, SociGov } from './comuns';
import { ActaDocument, CartaConvocatoria, FullEtiquetes } from './Impresos';
import { AvisAntelacio, FormReunio } from './Reunions';

export function DetallReunioVista({ id, config, onTorna }: { id: number; config: ConfigGov | null; onTorna: () => void }) {
  const { data: r, error, reload } = useApi<DetallReunio>(`/governanca/reunions/${id}`);
  const { pot } = useEntitat();
  const potEditar = pot('socis');
  const [editant, setEditant] = useState(false);
  const [assistencia, setAssistencia] = useState(false);
  const [acord, setAcord] = useState<Partial<Acord> | null>(null);

  if (!r) return <Carregant error={error} />;
  const tancada = Boolean(r.acta?.tancada);
  const editable = potEditar && !tancada;

  async function esborra() {
    if (!(await confirma(t("Vols esborrar aquesta reunió amb l'assistència i els acords?")))) return;
    try {
      await api.del(`/governanca/reunions/${id}`);
      avisa(t("Reunió esborrada."));
      onTorna();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <div className="barra-accions gov-barra">
        <button className="boto boto-secundari boto-petit" onClick={onTorna}>
          {t("← Totes les reunions")}
        </button>
        <span className="espai" />
        {editable && (
          <>
            <button className="boto boto-petit boto-secundari" onClick={() => setEditant(true)}>
              {t("Modifica")}
            </button>
            {!r.acta && (
              <button className="boto boto-petit boto-perill" onClick={esborra}>
                {t("Esborra")}
              </button>
            )}
          </>
        )}
      </div>
      <section className="targeta gov-fitxa">
        <h2>
          {titolReunio(r)} <span className={`insignia ${CLASSE_ESTAT[r.estat]}`}>{ESTATS_REUNIO[r.estat]}</span>
        </h2>
        <p>
          {data(r.data)}
          {r.hora_1a && ' · ' + t("1a convocatòria: {0} h", r.hora_1a)}
          {r.hora_2a && ' · ' + t("2a convocatòria: {0} h", r.hora_2a)}
          {r.lloc && ' · ' + r.lloc}
        </p>
        {r.data_convocatoria && <p className="apagat petit">{t("Convocada el {0}", data(r.data_convocatoria))}</p>}
        <AvisAntelacio a={r.antelacio} />
        {tancada && <p className="apagat petit">{t("L'acta està aprovada: la reunió, l'assistència i els acords ja no es poden modificar.")}</p>}
        <h3>{t("Ordre del dia")}</h3>
        {r.ordre_dia.length ? (
          <ol>
            {r.ordre_dia.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        ) : (
          <p className="apagat">{t("Encara no s'ha definit l'ordre del dia.")}</p>
        )}
        {r.notes && <p className="apagat petit">{r.notes}</p>}
      </section>

      {r.organ !== 'comissio' && (r.estat === 'prevista' || r.estat === 'convocada' || r.convocats.length > 0) && (
        <Convocatoria r={r} potEditar={potEditar} onCanvi={reload} />
      )}

      <section className="targeta">
        <div className="targeta-cap">
          <h2>{t("Assistència i quòrum")}</h2>
          {editable && r.estat !== 'anullada' && (
            <button className="boto boto-petit boto-secundari" onClick={() => setAssistencia(true)}>
              {t("Passa llista")}
            </button>
          )}
        </div>
        <Quorum r={r} />
        {r.assistents.length > 0 && (
          <ul className="gov-assistents">
            {r.assistents.map((a) => (
              <li key={a.soci_id}>
                {a.nom}
                {a.forma === 'representat' && <span className="apagat petit"> {t("(representat per {0})", a.representant ?? '—')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="targeta">
        <div className="targeta-cap">
          <h2>{t("Acords")}</h2>
          {editable && (
            <button className="boto boto-petit boto-secundari" onClick={() => setAcord({ resultat: 'aprovat', punt: r.acords.length + 1 })}>
              {t("+ Acord")}
            </button>
          )}
        </div>
        {r.acords.length === 0 ? (
          <p className="apagat">{t("Encara no s'ha registrat cap acord.")}</p>
        ) : (
          <div className="taula-contenidor">
            <table className={`taula ${editable ? 'taula-clicable' : ''}`}>
              <thead>
                <tr>
                  <th className="num">{t("Punt")}</th>
                  <th>{t("Acord")}</th>
                  <th className="num">{t("A favor")}</th>
                  <th className="num">{t("En contra")}</th>
                  <th className="num">{t("Abstencions")}</th>
                  <th>{t("Resultat")}</th>
                </tr>
              </thead>
              <tbody>
                {r.acords.map((a) => (
                  <tr key={a.id} onClick={() => editable && setAcord(a)}>
                    <td className="num">{a.punt}</td>
                    <td>{a.text}</td>
                    <td className="num">{a.vots_favor}</td>
                    <td className="num">{a.vots_contra}</td>
                    <td className="num">{a.abstencions}</td>
                    <td>
                      <span className={`insignia ${a.resultat === 'aprovat' ? 'insignia-pagada' : a.resultat === 'rebutjat' ? 'insignia-pendent' : 'insignia-buida'}`}>
                        {RESULTATS[a.resultat]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ActaSeccio r={r} potEditar={potEditar} onCanvi={reload} />

      {editant && (
        <FormReunio
          inicial={r}
          config={config}
          onClose={() => setEditant(false)}
          onFet={() => {
            setEditant(false);
            reload();
          }}
        />
      )}
      {assistencia && (
        <Assistencia
          r={r}
          onClose={() => setAssistencia(false)}
          onFet={() => {
            setAssistencia(false);
            reload();
          }}
        />
      )}
      {acord && (
        <FormAcord
          reunio={r}
          inicial={acord}
          onClose={() => setAcord(null)}
          onFet={() => {
            setAcord(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function Quorum({ r }: { r: DetallReunio }) {
  const q = r.quorum;
  return (
    <div className="xifres xifres-petites">
      <div className="xifra">
        <span className="xifra-etiqueta">{r.organ === 'assemblea' ? t("Socis amb vot") : r.organ === 'junta' ? t("Membres de la junta") : t("Cens")}</span>
        <span className="xifra-valor">{q.cens ?? '—'}</span>
      </div>
      <div className="xifra">
        <span className="xifra-etiqueta">{t("Presents + representats")}</span>
        <span className="xifra-valor">
          {q.presents} + {q.representats}
        </span>
        {q.percentatge !== null && <span className="xifra-nota">{t("{0} % del cens", q.percentatge)}</span>}
      </div>
      {q.necessaris_1a !== null && (
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Quòrum en 1a convocatòria")}</span>
          <span className={`xifra-valor ${q.arriba_1a ? 'positiu' : 'negatiu'}`}>{q.arriba_1a ? t("Sí") : t("No")}</span>
          <span className="xifra-nota">
            {r.organ === 'assemblea' ? t("Cal el {0} %: {1} persones", q.quorum_1a_pct, q.necessaris_1a) : t("Cal la majoria: {0} persones", q.necessaris_1a)}
          </span>
        </div>
      )}
      <div className="xifra">
        <span className="xifra-etiqueta">{t("Quòrum en 2a convocatòria")}</span>
        <span className={`xifra-valor ${q.arriba_2a ? 'positiu' : 'negatiu'}`}>{q.arriba_2a ? t("Sí") : t("No")}</span>
        <span className="xifra-nota">{t("Qualsevol nombre d'assistents")}</span>
      </div>
    </div>
  );
}

// ---------- Assistència ----------

type Forma = 'absent' | 'present' | 'representat';

function Assistencia({ r, onClose, onFet }: { r: DetallReunio; onClose: () => void; onFet: () => void }) {
  const { data: socis } = useApi<SociGov[]>(`/governanca/socis?data=${r.data}`);
  const { data: junta } = useApi<{ presidencia: { soci_id: number } | null; vicepresidencia: { soci_id: number } | null; secretaria: { soci_id: number } | null; tresoreria: { soci_id: number } | null; vocals: { soci_id: number }[] }>(
    `/governanca/junta-actual?data=${r.data}`,
  );
  const [estat, setEstat] = useState<Record<number, { forma: Forma; representant_id: number | null }>>(() =>
    Object.fromEntries(r.assistents.map((a) => [a.soci_id, { forma: a.forma, representant_id: a.representant_id }])),
  );
  const [extra, setExtra] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Llista proposada: socis amb vot (assemblea) o la junta vigent (junta), més els que ja hi consten.
  const idsJunta = useMemo(
    () => (junta ? [junta.presidencia, junta.vicepresidencia, junta.secretaria, junta.tresoreria, ...junta.vocals].filter(Boolean).map((p) => p!.soci_id) : []),
    [junta],
  );
  if (!socis || (r.organ === 'junta' && !junta)) return null;
  const perId = new Map(socis.map((s) => [s.id, s]));
  const proposats = r.organ === 'assemblea' ? socis.filter((s) => s.votant) : r.organ === 'junta' ? socis.filter((s) => idsJunta.includes(s.id)) : [];
  const llista = [...proposats];
  for (const idS of [...r.assistents.map((a) => a.soci_id), ...extra]) {
    if (llista.some((s) => s.id === idS)) continue;
    const s = perId.get(idS);
    if (s) llista.push(s);
    else {
      const a = r.assistents.find((x) => x.soci_id === idS);
      if (a) llista.push({ id: a.soci_id, num_soci: a.num_soci ?? 0, nom: a.nom, llinatges: '', dni: null, email: null, adreca: null, codi_postal: null, poblacio: null });
    }
  }
  const presents = llista.filter((s) => estat[s.id]?.forma === 'present');
  const canvia = (idS: number, forma: Forma, representant_id: number | null = null) => setEstat({ ...estat, [idS]: { forma, representant_id } });

  async function desa(e: FormEvent) {
    e.preventDefault();
    const assistents = Object.entries(estat)
      .filter(([, v]) => v.forma !== 'absent')
      .map(([k, v]) => ({ soci_id: Number(k), forma: v.forma, representant_id: v.representant_id }));
    try {
      await api.put(`/governanca/reunions/${r.id}/assistents`, { assistents });
      avisa(t("Assistència desada."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Llista d'assistència")} onClose={onClose} ample>
      <form className="formulari-modal" onSubmit={desa}>
        <p className="apagat petit camp-ample">
          {r.organ === 'assemblea'
            ? t("Surten els socis amb dret a vot en la data de la reunió. Una persona representada ha de delegar el vot en algú present.")
            : r.organ === 'junta'
              ? t("Surten els membres de la junta vigent en la data de la reunió.")
              : t("Afegeix les persones que hi assisteixen.")}
        </p>
        <div className="camp-ample gov-llista-assistencia">
          {llista.map((s) => {
            const e = estat[s.id] ?? { forma: 'absent', representant_id: null };
            return (
              <div key={s.id} className="gov-fila-assistencia">
                <span>
                  {nomSoci(s)}
                  {s.votant === 0 && <span className="apagat petit"> {t("(sense vot)")}</span>}
                </span>
                <select aria-label={t("Assistència de {0}", nomSoci(s))} value={e.forma} onChange={(ev) => canvia(s.id, ev.target.value as Forma)}>
                  <option value="absent">{t("No hi és")}</option>
                  <option value="present">{t("Present")}</option>
                  {r.organ === 'assemblea' && <option value="representat">{t("Representat")}</option>}
                </select>
                {e.forma === 'representat' ? (
                  <select
                    aria-label={t("Representant de {0}", nomSoci(s))}
                    value={e.representant_id ?? ''}
                    onChange={(ev) => canvia(s.id, 'representat', ev.target.value ? Number(ev.target.value) : null)}
                  >
                    <option value="">{t("— Representant —")}</option>
                    {presents
                      .filter((p) => p.id !== s.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {nomSoci(p)}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
          {llista.length === 0 && <Buit>{t("Encara no hi ha ningú a la llista.")}</Buit>}
        </div>
        <Camp etiqueta={t("Afegeix una altra persona sòcia")} ample>
          <select
            value=""
            onChange={(e) => {
              const idS = Number(e.target.value);
              if (!idS) return;
              setExtra([...extra, idS]);
              canvia(idS, 'present');
            }}
          >
            <option value="">—</option>
            {socis
              .filter((s) => !llista.some((x) => x.id === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.num_soci} · {nomSoci(s)}
                </option>
              ))}
          </select>
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="apagat petit">{t("{0} presents", presents.length)}</span>
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Acords ----------

function FormAcord({ reunio, inicial, onClose, onFet }: { reunio: DetallReunio; inicial: Partial<Acord>; onClose: () => void; onFet: () => void }) {
  const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
  const [f, setF] = useState({
    punt: num(inicial.punt),
    text: inicial.text ?? '',
    vots_favor: num(inicial.vots_favor),
    vots_contra: num(inicial.vots_contra),
    abstencions: num(inicial.abstencions),
    resultat: inicial.resultat ?? 'aprovat',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const vots = [f.vots_favor, f.vots_contra, f.abstencions].reduce((s, v) => s + (Number(v) || 0), 0);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (inicial.id) await api.put(`/governanca/acords/${inicial.id}`, f);
      else await api.post(`/governanca/reunions/${reunio.id}/acords`, f);
      avisa(t("Acord desat."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  async function esborra() {
    if (!(await confirma(t("Vols esborrar aquest acord?")))) return;
    try {
      await api.del(`/governanca/acords/${inicial.id}`);
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={inicial.id ? t("Acord") : t("Nou acord")} onClose={onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Punt de l'ordre del dia")}>
          <select value={f.punt} onChange={set('punt')}>
            <option value="">—</option>
            {reunio.ordre_dia.map((p, i) => (
              <option key={i} value={i + 1}>
                {i + 1}. {p.length > 60 ? p.slice(0, 60) + '…' : p}
              </option>
            ))}
            {f.punt && Number(f.punt) > reunio.ordre_dia.length && <option value={f.punt}>{f.punt}</option>}
          </select>
        </Camp>
        <Camp etiqueta={t("Resultat")}>
          <select value={f.resultat} onChange={set('resultat')}>
            {Object.entries(RESULTATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Text de l'acord")} ample>
          <textarea rows={4} value={f.text} onChange={set('text')} required />
        </Camp>
        {f.resultat !== 'informatiu' && (
          <>
            <Camp etiqueta={t("Vots a favor")}>
              <input type="number" min={0} value={f.vots_favor} onChange={set('vots_favor')} />
            </Camp>
            <Camp etiqueta={t("Vots en contra")}>
              <input type="number" min={0} value={f.vots_contra} onChange={set('vots_contra')} />
            </Camp>
            <Camp etiqueta={t("Abstencions")}>
              <input type="number" min={0} value={f.abstencions} onChange={set('abstencions')} />
            </Camp>
            {vots > 0 && reunio.quorum.total > 0 && vots !== reunio.quorum.total && (
              <p className="gov-avis camp-ample">
                {t("Hi ha {0} vots però consten {1} persones amb vot presents o representades.", vots, reunio.quorum.total)}
              </p>
            )}
          </>
        )}
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {inicial.id && (
            <button type="button" className="boto boto-perill" onClick={esborra}>
              {t("Esborra")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Acta ----------

function ActaSeccio({ r, potEditar, onCanvi }: { r: DetallReunio; potEditar: boolean; onCanvi: () => void }) {
  const { config } = useEntitat();
  const acta = r.acta;
  const [f, setF] = useState(() => ({
    text: acta?.text ?? '',
    presidencia: acta?.presidencia ?? '',
    secretaria: acta?.secretaria ?? '',
    data_aprovacio: acta?.data_aprovacio ?? '',
  }));
  const [veure, setVeure] = useState(false);
  const { data: completa } = useApi<ActaCompleta>(veure && acta ? `/governanca/actes/${acta.id}?v=${acta.tancada}` : null);

  if (r.estat !== 'celebrada' && !acta) return null;

  async function crea() {
    try {
      const a = await api.post<ActaCompleta>(`/governanca/reunions/${r.id}/acta`, {});
      setF({ text: a.acta.text, presidencia: a.acta.presidencia ?? '', secretaria: a.acta.secretaria ?? '', data_aprovacio: '' });
      avisa(t("Acta núm. {0}/{1} creada.", a.acta.numero, a.acta.any));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }
  async function desa() {
    try {
      await api.put(`/governanca/actes/${acta!.id}`, f);
      avisa(t("Acta desada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }
  async function tanca() {
    if (!f.data_aprovacio) {
      avisa(t("Indica la data d'aprovació de l'acta."), 'error');
      return;
    }
    if (!(await confirma(t("Un cop aprovada, ni l'acta ni els acords ni l'assistència es podran modificar. Vols aprovar i tancar l'acta?")))) return;
    try {
      await api.post(`/governanca/actes/${acta!.id}/tanca`, f);
      avisa(t("Acta aprovada i tancada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }
  async function esborra() {
    if (!(await confirma(t("Vols esborrar l'esborrany de l'acta?")))) return;
    try {
      await api.del(`/governanca/actes/${acta!.id}`);
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <section className="targeta">
      <div className="targeta-cap">
        <h2>
          {acta ? t("Acta núm. {0}/{1}", acta.numero, acta.any) : t("Acta")}{' '}
          {acta && (
            <span className={`insignia ${acta.tancada ? 'insignia-pagada' : 'insignia-pendent'}`}>
              {acta.tancada ? t("Aprovada el {0}", data(acta.data_aprovacio)) : t("Esborrany")}
            </span>
          )}
        </h2>
        {acta && (
          <button className="boto boto-petit boto-secundari" onClick={() => setVeure(!veure)}>
            {veure ? t("Amaga el document") : t("Document per imprimir")}
          </button>
        )}
      </div>
      {!acta && (
        <>
          <p className="apagat">{t("Aquesta reunió encara no té acta. El número es dona correlativament per òrgan i any.")}</p>
          {potEditar && (
            <button className="boto" onClick={crea}>
              {t("Redacta l'acta")}
            </button>
          )}
        </>
      )}
      {acta && !acta.tancada && potEditar && (
        <div className="formulari">
          <Camp etiqueta={t("Presideix")}>
            <input value={f.presidencia} onChange={(e) => setF({ ...f, presidencia: e.target.value })} />
          </Camp>
          <Camp etiqueta={t("Secretari/ària")}>
            <input value={f.secretaria} onChange={(e) => setF({ ...f, secretaria: e.target.value })} />
          </Camp>
          <Camp etiqueta={t("Desenvolupament de la sessió")} grup ample ajuda={t("Els assistents, el quòrum, l'ordre del dia i els acords s'afegeixen sols al document.")}>
            <EditorText valor={f.text} onChange={(v) => setF({ ...f, text: v })} files={12} />
          </Camp>
          <Camp etiqueta={t("Data d'aprovació")}>
            <input type="date" value={f.data_aprovacio} max={avui()} onChange={(e) => setF({ ...f, data_aprovacio: e.target.value })} />
          </Camp>
          <div className="formulari-peu camp-ample">
            <button type="button" className="boto boto-perill boto-petit" onClick={esborra}>
              {t("Esborra l'acta")}
            </button>
            <span className="espai" />
            <button type="button" className="boto boto-secundari" onClick={desa}>
              {t("Desa l'esborrany")}
            </button>
            <button type="button" className="boto" onClick={tanca}>
              {t("Aprova i tanca")}
            </button>
          </div>
        </div>
      )}
      {acta?.tancada ? (
        <p className="apagat petit">{t("Tancada el {0} per {1}.", acta.tancada_el ?? '', acta.tancada_per ?? '—')}</p>
      ) : null}
      {veure && (completa ? <Imprimible titolBoto={t("Imprimeix l'acta")}><ActaDocument a={completa} config={config} /></Imprimible> : <Carregant />)}
    </section>
  );
}

// ---------- Convocatòria ----------

interface Destinataris {
  amb_email: SociGov[];
  sense_email: SociGov[];
  correu_configurat: boolean;
}

function Convocatoria({ r, potEditar, onCanvi }: { r: DetallReunio; potEditar: boolean; onCanvi: () => void }) {
  const { data: dest } = useApi<Destinataris>(`/governanca/reunions/${r.id}/destinataris?n=${r.convocats.length}`);
  const [enviant, setEnviant] = useState(false);
  const [cartes, setCartes] = useState(false);
  const convocable = (r.estat === 'prevista' || r.estat === 'convocada') && r.data >= avui();

  async function envia() {
    if (!dest) return;
    if (!(await confirma(t("S'enviarà la convocatòria per correu a {0} persones (tots els socis amb dret a vot amb correu, també els que no volen rebre comunicacions: és una convocatòria estatutària). Continuar?", dest.amb_email.length)))) return;
    setEnviant(true);
    try {
      const res = await api.post<{ enviats: number; errors: number; sense_email: number }>(`/governanca/reunions/${r.id}/convoca`);
      avisa(t("Convocatòria enviada a {0} persones.", res.enviats));
      if (res.errors) avisa(t("{0} correus no s'han pogut enviar.", res.errors), 'error');
      if (res.sense_email) avisa(t("{0} persones no tenen correu: imprimeix-los la carta.", res.sense_email), 'error');
      onCanvi();
    } catch (e) {
      avisaError(e);
    } finally {
      setEnviant(false);
    }
  }

  return (
    <section className="targeta">
      <div className="targeta-cap">
        <h2>{t("Convocatòria")}</h2>
        {potEditar && convocable && dest && (
          <div className="accions-fila">
            <button className="boto boto-petit boto-secundari" onClick={() => setCartes(true)}>
              {t("Cartes i etiquetes")}
            </button>
            <button className="boto boto-petit" onClick={envia} disabled={enviant || !dest.amb_email.length}>
              {enviant ? t("Enviant…") : t("Envia per correu")}
            </button>
          </div>
        )}
      </div>
      {dest && convocable && (
        <p>
          {t("{0} destinataris: {1} amb correu i {2} sense (cal enviar-los carta).", dest.amb_email.length + dest.sense_email.length, dest.amb_email.length, dest.sense_email.length)}
          {!dest.correu_configurat && <span className="negatiu"> {t("El correu no està configurat: només es poden imprimir cartes.")}</span>}
        </p>
      )}
      {r.convocats.length === 0 ? (
        <p className="apagat">{t("Encara no s'ha enviat la convocatòria.")}</p>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Persona")}</th>
                <th>{t("Canal")}</th>
                <th className="opcional">{t("Adreça")}</th>
                <th>{t("Data")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {r.convocats.map((c) => (
                <tr key={c.id}>
                  <td>{c.nom}</td>
                  <td>{c.canal === 'email' ? t("Correu") : t("Carta")}</td>
                  <td className="opcional">{c.adreca}</td>
                  <td className="nowrap">{c.enviat_el.slice(0, 16)}</td>
                  <td>
                    {c.error ? (
                      <span className="insignia insignia-pendent" title={c.error}>
                        {t("Error")}
                      </span>
                    ) : (
                      <span className="insignia insignia-pagada">{c.canal === 'email' ? t("Enviat") : t("Impresa")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cartes && dest && <Cartes r={r} dest={dest} onClose={() => setCartes(false)} onFet={onCanvi} />}
    </section>
  );
}

function Cartes({ r, dest, onClose, onFet }: { r: DetallReunio; dest: Destinataris; onClose: () => void; onFet: () => void }) {
  const { config } = useEntitat();
  const { data: junta } = useApi<{ secretaria: { nom: string } | null }>('/governanca/junta-actual');
  const [tots, setTots] = useState(false);
  const [vista, setVista] = useState<'cartes' | 'etiquetes'>('cartes');
  const llista = tots ? [...dest.sense_email, ...dest.amb_email] : dest.sense_email;

  async function registra() {
    try {
      const res = await api.post<{ cartes: number }>(`/governanca/reunions/${r.id}/cartes`, { soci_ids: llista.map((s) => s.id) });
      avisa(t("S'han registrat {0} cartes.", res.cartes));
      onFet();
      onClose();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <div className="gov-panell">
      <h3>{t("Cartes de convocatòria")}</h3>
      <div className="formulari-modal">
        <div className="camp-ample gov-barra">
          <div className="segmentat" role="radiogroup" aria-label={t("Document")}>
            <button type="button" role="radio" aria-checked={vista === 'cartes'} className={vista === 'cartes' ? 'actiu' : ''} onClick={() => setVista('cartes')}>
              {t("Cartes")}
            </button>
            <button type="button" role="radio" aria-checked={vista === 'etiquetes'} className={vista === 'etiquetes' ? 'actiu' : ''} onClick={() => setVista('etiquetes')}>
              {t("Etiquetes")}
            </button>
          </div>
          <label className="casella">
            <input type="checkbox" checked={tots} onChange={(e) => setTots(e.target.checked)} />
            {t("També per als qui tenen correu")}
          </label>
        </div>
        <p className="apagat petit camp-ample">
          {t("{0} cartes. Després d'imprimir-les i enviar-les, registra-les perquè quedi constància de la convocatòria.", llista.length)}
        </p>
        {llista.length === 0 ? (
          <Buit>{t("Tothom té correu electrònic.")}</Buit>
        ) : (
          <div className="camp-ample">
            <Imprimible titolBoto={vista === 'cartes' ? t("Imprimeix les cartes") : t("Imprimeix les etiquetes")}>
              {vista === 'cartes' ? (
                llista.map((s) => <CartaConvocatoria key={s.id} r={r} soci={s} config={config} secretaria={junta?.secretaria?.nom ?? null} />)
              ) : (
                <FullEtiquetes socis={llista} />
              )}
            </Imprimible>
          </div>
        )}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Tanca")}
          </button>
          <button type="button" className="boto" onClick={registra} disabled={!llista.length}>
            {t("Registra les cartes enviades")}
          </button>
        </div>
      </div>
    </div>
  );
}
