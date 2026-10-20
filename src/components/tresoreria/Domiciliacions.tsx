import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma, useExercici } from '../ui';
import { DEMO } from '../../mode';
import { avui, data, euros, textACents } from '../../format';
import { formataIban, ibanValid } from '../../../shared/iban';
import { t } from '../../i18n';
import { METODES, MOTIUS_DEVOLUCIO } from './tipus';
import type { ConfigSepa, Mandat, Metode, QuotaDomiciliada, Remesa, RemesaResum } from './tipus';

// Motius d'exclusió que torna el servidor (en català): es tradueixen aquí.
const MOTIUS_EXCLUSIO: Record<string, string> = {
  'La quota no està pendent.': t("La quota no està pendent."),
  'El soci no paga per domiciliació.': t("El soci no paga per domiciliació."),
  'Sense mandat SEPA actiu.': t("Sense mandat SEPA actiu."),
  'IBAN absent o no vàlid.': t("IBAN absent o no vàlid."),
  'Ja és en una remesa pendent de cobrar.': t("Ja és en una remesa pendent de cobrar."),
};

export function Domiciliacions() {
  const { data: cfg, reload: reloadCfg } = useApi<ConfigSepa>('/tresoreria/sepa');
  const { data: remeses, error, reload } = useApi<RemesaResum[]>('/tresoreria/remeses');
  const [novaRemesa, setNovaRemesa] = useState(false);
  const [oberta, setOberta] = useState<number | null>(null);
  const configurat = Boolean(cfg && cfg.compte_id && cfg.iban && (cfg.identificador || cfg.suggeriment));

  return (
    <>
      <h2 className="titol-seccio sense-marge">{t("Remeses de rebuts")}</h2>
      <div className="barra-accions barra-tresoreria">
        <span className="apagat">
          {t("Fitxer SEPA de domiciliacions (esquema Core, pain.008) per pujar a la banca electrònica.")}
        </span>
        <span className="espai" />
        <button className="boto" onClick={() => setNovaRemesa(true)} disabled={!configurat}>
          {t("+ Nova remesa")}
        </button>
      </div>
      {cfg && !configurat && <p className="error">{t("Abans de generar remeses, configura les dades del creditor més avall.")}</p>}
      {!remeses ? (
        <Carregant error={error} />
      ) : remeses.length === 0 ? (
        <Buit>{t("Encara no s'ha generat cap remesa.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Referència")}</th>
                <th>{t("Data de cobrament")}</th>
                <th>{t("Compte")}</th>
                <th className="num">{t("Rebuts")}</th>
                <th className="num">{t("Import")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {remeses.map((r) => (
                <tr key={r.id} onClick={() => setOberta(r.id)}>
                  <td>{r.referencia}</td>
                  <td>{data(r.data_cobrament)}</td>
                  <td>{r.compte_nom}</td>
                  <td className="num">{r.num_operacions}</td>
                  <td className="num">{euros(r.total_cents)}</td>
                  <td>
                    <EstatRemesa r={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Mandats />
      {cfg && <ConfiguracioSepa cfg={cfg} onFet={reloadCfg} />}

      {novaRemesa && (
        <NovaRemesa
          onClose={() => setNovaRemesa(false)}
          onFet={(id) => {
            setNovaRemesa(false);
            reload();
            setOberta(id);
          }}
        />
      )}
      {oberta && (
        <DetallRemesa
          id={oberta}
          onClose={() => setOberta(null)}
          onCanvi={reload}
        />
      )}
    </>
  );
}

function EstatRemesa({ r }: { r: RemesaResum }) {
  if (r.estat === 'generada') return <span className="insignia insignia-pendent">{t("Pendent de cobrar")}</span>;
  return (
    <>
      <span className="insignia insignia-pagada">{t("Cobrada el {0}", data(r.cobrada_el))}</span>{' '}
      {r.retornats > 0 && <span className="insignia insignia-buida">{t("{0} retornats", r.retornats)}</span>}
    </>
  );
}

// ---------- Nova remesa ----------

function NovaRemesa(props: { onClose: () => void; onFet: (id: number) => void }) {
  const [exercici] = useExercici();
  const { data: d, error: errorCarrega } = useApi<{ quotes: QuotaDomiciliada[]; data_minima: string }>(
    `/tresoreria/remeses/quotes?exercici=${exercici}`,
  );
  const [triades, setTriades] = useState<Set<number>>(new Set());
  const [dataCobrament, setDataCobrament] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!d) return;
    setTriades(new Set(d.quotes.filter((q) => !q.motiu).map((q) => q.id)));
    setDataCobrament((v) => v || d.data_minima);
  }, [d]);

  const total = d?.quotes.filter((q) => triades.has(q.id)).reduce((s, q) => s + q.import_cents, 0) ?? 0;

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api.post<{ id: number }>('/tresoreria/remeses', { quota_ids: [...triades], data_cobrament: dataCobrament });
      avisa(t("Remesa generada."));
      props.onFet(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Nova remesa · quotes {0}", exercici)} onClose={props.onClose} ample>
      {!d ? (
        <Carregant error={errorCarrega} />
      ) : (
        <form className="formulari formulari-modal" onSubmit={envia}>
          {d.quotes.length === 0 ? (
            <p className="camp-ample">
              {t("No hi ha quotes pendents de {0} de socis que paguin per domiciliació.", exercici)}
            </p>
          ) : (
            <div className="taula-contenidor camp-ample">
              <table className="taula taula-compacta">
                <thead>
                  <tr>
                    <th />
                    <th className="num">{t("Núm.")}</th>
                    <th>{t("Soci")}</th>
                    <th>{t("IBAN")}</th>
                    <th>{t("Seqüència")}</th>
                    <th className="num">{t("Import")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.quotes.map((q) => (
                    <tr key={q.id} className={q.motiu ? 'apagat' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={Boolean(q.motiu)}
                          checked={triades.has(q.id)}
                          onChange={() =>
                            setTriades((s) => {
                              const n = new Set(s);
                              if (n.has(q.id)) n.delete(q.id);
                              else n.add(q.id);
                              return n;
                            })
                          }
                          aria-label={t("Inclou {0}", `${q.nom} ${q.llinatges}`)}
                        />
                      </td>
                      <td className="num">{q.num_soci}</td>
                      <td>
                        {q.nom} {q.llinatges}
                        {q.motiu && <div className="petit error">{MOTIUS_EXCLUSIO[q.motiu] ?? q.motiu}</div>}
                      </td>
                      <td className="nowrap petit">{q.iban ? formataIban(q.iban) : '—'}</td>
                      <td>{q.sequencia ?? 'FRST'}</td>
                      <td className="num">{euros(q.import_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Camp etiqueta={t("Data de cobrament")} ajuda={t("Data en què el banc carregarà els rebuts. Envia el fitxer al banc amb uns dies d'antelació.")}>
            <input type="date" min={d.data_minima} value={dataCobrament} onChange={(e) => setDataCobrament(e.target.value)} required />
          </Camp>
          <p className="camp">
            <span className="camp-etiqueta">{t("Total")}</span>
            <strong>{t("{0} rebuts · {1}", triades.size, euros(total))}</strong>
          </p>
          {error && <p className="error camp-ample">{error}</p>}
          <div className="formulari-peu camp-ample">
            <span className="espai" />
            <button type="button" className="boto boto-secundari" onClick={props.onClose}>
              {t("Cancel·la")}
            </button>
            <button className="boto" disabled={!triades.size}>
              {t("Genera la remesa")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ---------- Detall de la remesa ----------

function DetallRemesa(props: { id: number; onClose: () => void; onCanvi: () => void }) {
  const { data: r, error, reload } = useApi<Remesa>(`/tresoreria/remeses/${props.id}`);
  const [veureXml, setVeureXml] = useState(false);
  const [cobrant, setCobrant] = useState(false);
  const [retornant, setRetornant] = useState<Remesa['linies'][number] | null>(null);
  const canvi = () => {
    reload();
    props.onCanvi();
  };

  async function copia() {
    try {
      await navigator.clipboard.writeText(r!.xml);
      avisa(t("XML copiat al porta-retalls."));
    } catch {
      setVeureXml(true);
      avisa(t("No s'ha pogut copiar: selecciona el text i copia'l a mà."), 'error');
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar la remesa {0}? Les quotes tornaran a estar disponibles.", r!.referencia)))) return;
    try {
      await api.del(`/tresoreria/remeses/${props.id}`);
      avisa(t("Remesa eliminada."));
      props.onCanvi();
      props.onClose();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <Modal titol={r ? t("Remesa {0}", r.referencia) : t("Remesa")} onClose={props.onClose} ample>
      {!r ? (
        <Carregant error={error} />
      ) : (
        <div className="formulari-modal remesa-detall">
          <p>
            <EstatRemesa r={r} /> · {t("Cobrament: {0}", data(r.data_cobrament))} · {r.compte_nom} ·{' '}
            <strong>{t("{0} rebuts · {1}", r.num_operacions, euros(r.total_cents))}</strong>
          </p>
          <div className="barra-accions barra-tresoreria">
            {!DEMO && (
              <a className="boto boto-secundari" href={`/api/tresoreria/remeses/${r.id}/xml`} download={`${r.referencia}.xml`}>
                {t("Descarrega el fitxer XML")}
              </a>
            )}
            <button type="button" className="boto boto-secundari" onClick={copia}>
              {t("Copia l'XML")}
            </button>
            <button type="button" className="boto boto-secundari" onClick={() => setVeureXml(!veureXml)}>
              {veureXml ? t("Amaga l'XML") : t("Mostra l'XML")}
            </button>
            <span className="espai" />
            {r.estat === 'generada' && (
              <>
                <button type="button" className="boto boto-perill" onClick={elimina}>
                  {t("Elimina")}
                </button>
                <button type="button" className="boto" onClick={() => setCobrant(true)}>
                  {t("Marca-la com a cobrada")}
                </button>
              </>
            )}
          </div>
          {veureXml && <textarea className="xml-remesa" readOnly value={r.xml} rows={14} onFocus={(e) => e.target.select()} />}
          <div className="taula-contenidor">
            <table className="taula taula-compacta">
              <thead>
                <tr>
                  <th className="num">{t("Núm.")}</th>
                  <th>{t("Deutor")}</th>
                  <th>{t("Mandat")}</th>
                  <th>{t("Seqüència")}</th>
                  <th className="num">{t("Import")}</th>
                  <th>{t("Estat")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.linies.map((l) => (
                  <tr key={l.id}>
                    <td className="num">{l.num_soci ?? '—'}</td>
                    <td>
                      {l.nom_deutor}
                      <div className="petit apagat nowrap">{formataIban(l.iban)}</div>
                    </td>
                    <td className="petit">
                      {l.mandat_referencia}
                      <div className="apagat">{data(l.mandat_data)}</div>
                    </td>
                    <td>{l.sequencia}</td>
                    <td className="num">{euros(l.import_cents)}</td>
                    <td>
                      {l.estat === 'retornada' ? (
                        <span className="insignia insignia-pendent" title={l.motiu_devolucio ?? ''}>
                          {t("Retornat el {0}", data(l.data_devolucio))}
                        </span>
                      ) : r.estat === 'cobrada' ? (
                        <span className="insignia insignia-pagada">{t("Cobrat")}</span>
                      ) : (
                        <span className="insignia insignia-buida">{t("Inclòs")}</span>
                      )}
                      {l.estat === 'retornada' && <div className="petit apagat">{l.motiu_devolucio}</div>}
                    </td>
                    <td className="accions-fila">
                      {r.estat === 'cobrada' && l.estat === 'inclosa' && (
                        <button type="button" className="boto boto-petit boto-secundari" onClick={() => setRetornant(l)}>
                          {t("Devolució")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {cobrant && r && (
        <CobraRemesa
          r={r}
          onClose={() => setCobrant(false)}
          onFet={() => {
            setCobrant(false);
            canvi();
          }}
        />
      )}
      {retornant && (
        <Devolucio
          linia={retornant}
          onClose={() => setRetornant(null)}
          onFet={() => {
            setRetornant(null);
            canvi();
          }}
        />
      )}
    </Modal>
  );
}

function CobraRemesa(props: { r: Remesa; onClose: () => void; onFet: () => void }) {
  const [dataAbon, setDataAbon] = useState(props.r.data_cobrament <= avui() ? props.r.data_cobrament : avui());
  const [error, setError] = useState<string | null>(null);
  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/tresoreria/remeses/${props.r.id}/cobra`, { data: dataAbon });
      avisa(t("Remesa cobrada: s'ha registrat l'ingrés i les quotes consten com a pagades."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  return (
    <Modal titol={t("El banc ha abonat la remesa")} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {t("Es registrarà un sol ingrés de {0} al compte {1} i les {2} quotes quedaran pagades per domiciliació.", euros(props.r.total_cents), props.r.compte_nom, props.r.num_operacions)}
        </p>
        <Camp etiqueta={t("Data de l'abonament")}>
          <input type="date" value={dataAbon} onChange={(e) => setDataAbon(e.target.value)} required />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Registra el cobrament")}</button>
        </div>
      </form>
    </Modal>
  );
}

function Devolucio(props: { linia: Remesa['linies'][number]; onClose: () => void; onFet: () => void }) {
  const [dataDev, setDataDev] = useState(avui());
  const [motiu, setMotiu] = useState('AM04');
  const [comissio, setComissio] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function envia(e: FormEvent) {
    e.preventDefault();
    const c = comissio ? textACents(comissio) : 0;
    if (c === null || c < 0) return setError(t("L'import no és vàlid."));
    try {
      await api.post(`/tresoreria/remeses/linies/${props.linia.id}/devolucio`, { data: dataDev, motiu, comissio_cents: c });
      avisa(t("Devolució registrada: la quota torna a estar pendent."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  return (
    <Modal titol={t("Devolució del rebut de {0}", props.linia.nom_deutor)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {t("Es registrarà una despesa de {0} (rebut retornat) i, si n'hi ha, la comissió del banc. La quota tornarà a estar pendent i el pròxim cobrament per domiciliació serà FRST.", euros(props.linia.import_cents))}
        </p>
        <Camp etiqueta={t("Data de la devolució")}>
          <input type="date" value={dataDev} onChange={(e) => setDataDev(e.target.value)} required />
        </Camp>
        <Camp etiqueta={t("Motiu")}>
          <select value={motiu} onChange={(e) => setMotiu(e.target.value)}>
            {MOTIUS_DEVOLUCIO.map(([codi, text]) => (
              <option key={codi} value={codi}>
                {codi} · {text}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Comissió del banc (€)")}>
          <input inputMode="decimal" placeholder="0,00" value={comissio} onChange={(e) => setComissio(e.target.value)} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Registra la devolució")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Mandats i forma de pagament dels socis ----------

function Mandats() {
  const { data: mandats, error, reload } = useApi<Mandat[]>('/tresoreria/mandats');
  const [filtre, setFiltre] = useState<'domiciliacio' | 'tots'>('domiciliacio');
  const [q, setQ] = useState('');
  const [editant, setEditant] = useState<Mandat | null>(null);
  const visibles =
    mandats?.filter(
      (m) =>
        (filtre === 'tots' || m.metode === 'domiciliacio') &&
        (!q || `${m.num_soci} ${m.nom}`.toLowerCase().includes(q.toLowerCase())),
    ) ?? [];

  return (
    <>
      <h2 className="titol-seccio">{t("Forma de pagament i mandats SEPA")}</h2>
      <div className="filtres">
        <input type="search" placeholder={t("Cerca un soci…")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filtre} onChange={(e) => setFiltre(e.target.value as 'domiciliacio' | 'tots')} aria-label={t("Filtre")}>
          <option value="domiciliacio">{t("Només els domiciliats")}</option>
          <option value="tots">{t("Tots els socis")}</option>
        </select>
      </div>
      {!mandats ? (
        <Carregant error={error} />
      ) : visibles.length === 0 ? (
        <Buit>
          {filtre === 'domiciliacio'
            ? t("Cap soci no paga per domiciliació. Tria «Tots els socis» per canviar-ne la forma de pagament.")
            : t("No hi ha socis amb aquests criteris.")}
        </Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th className="num">{t("Núm.")}</th>
                <th>{t("Soci")}</th>
                <th>{t("Forma de pagament")}</th>
                <th>{t("IBAN")}</th>
                <th>{t("Mandat")}</th>
                <th>{t("Pròxim cobrament")}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => {
                const domiciliat = m.metode === 'domiciliacio';
                const senseMandat = domiciliat && (!m.referencia || !m.data_signatura || !m.actiu);
                return (
                  <tr key={m.soci_id} onClick={() => setEditant(m)}>
                    <td className="num">{m.num_soci}</td>
                    <td>{m.nom}</td>
                    <td>{METODES[m.metode]}</td>
                    <td className={`nowrap petit ${domiciliat && !m.iban_valid ? 'error' : ''}`}>
                      {m.iban ? formataIban(m.iban) : domiciliat ? t("Falta l'IBAN") : '—'}
                      {m.iban && !m.iban_valid && ` · ${t("no vàlid")}`}
                    </td>
                    <td className={senseMandat ? 'error' : ''}>
                      {m.referencia ? (
                        <>
                          {m.referencia} <span className="apagat petit">{data(m.data_signatura)}</span>
                          {!m.actiu && <span className="apagat petit"> · {t("inactiu")}</span>}
                        </>
                      ) : domiciliat ? (
                        t("Sense mandat")
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{domiciliat ? m.sequencia : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <EditaMandat
          m={editant}
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

function EditaMandat(props: { m: Mandat; onClose: () => void; onFet: () => void }) {
  const { m } = props;
  const [f, setF] = useState({
    metode: m.metode,
    iban: m.iban ? formataIban(m.iban) : '',
    referencia: m.referencia ?? '',
    data_signatura: m.data_signatura ?? '',
    sequencia: m.sequencia,
    actiu: m.te_fila ? Boolean(m.actiu) : true,
  });
  const [error, setError] = useState<string | null>(null);
  const domiciliat = f.metode === 'domiciliacio';
  const ibanDolent = f.iban !== '' && !ibanValid(f.iban);

  async function envia(e: FormEvent) {
    e.preventDefault();
    if (ibanDolent) return setError(t("L'IBAN no és vàlid."));
    try {
      await api.put(`/tresoreria/mandats/${m.soci_id}`, { ...f, actiu: f.actiu ? 1 : 0 });
      avisa(t("Forma de pagament desada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Forma de pagament · {0}", m.nom)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Forma de pagament habitual")}>
          <select value={f.metode} onChange={(e) => setF({ ...f, metode: e.target.value as Metode })}>
            {(Object.keys(METODES) as Metode[]).map((k) => (
              <option key={k} value={k}>
                {METODES[k]}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("IBAN")} ajuda={ibanDolent ? t("L'IBAN no és vàlid.") : undefined}>
          <input
            value={f.iban}
            onChange={(e) => setF({ ...f, iban: e.target.value })}
            required={domiciliat}
            aria-invalid={ibanDolent}
            placeholder="ES00 0000 0000 0000 0000 0000"
          />
        </Camp>
        {domiciliat && (
          <>
            <Camp etiqueta={t("Referència del mandat")} ajuda={t("Única per a cada soci. Suggerida: {0}", m.referencia_suggerida)}>
              <input
                value={f.referencia}
                onChange={(e) => setF({ ...f, referencia: e.target.value.toUpperCase() })}
                placeholder={m.referencia_suggerida}
                maxLength={35}
                required
                onFocus={() => !f.referencia && setF({ ...f, referencia: m.referencia_suggerida })}
              />
            </Camp>
            <Camp etiqueta={t("Data de signatura del mandat")}>
              <input type="date" max={avui()} value={f.data_signatura} onChange={(e) => setF({ ...f, data_signatura: e.target.value })} required />
            </Camp>
            <Camp etiqueta={t("Pròxim cobrament")} ajuda={t("FRST per al primer rebut o després d'una devolució; RCUR per als següents.")}>
              <select value={f.sequencia} onChange={(e) => setF({ ...f, sequencia: e.target.value as Mandat['sequencia'] })}>
                <option value="FRST">{t("FRST (primer)")}</option>
                <option value="RCUR">{t("RCUR (recurrent)")}</option>
              </select>
            </Camp>
            <label className="casella camp-ample">
              <input type="checkbox" checked={f.actiu} onChange={(e) => setF({ ...f, actiu: e.target.checked })} />
              <span>{t("Mandat actiu (desmarca-ho si el soci l'ha revocat)")}</span>
            </label>
          </>
        )}
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

// ---------- Configuració del creditor ----------

function ConfiguracioSepa({ cfg, onFet }: { cfg: ConfigSepa; onFet: () => void }) {
  const compteInicial = cfg.compte_id ?? cfg.comptes.find((c) => c.actiu && c.iban)?.id ?? cfg.comptes.find((c) => c.actiu)?.id ?? '';
  const [f, setF] = useState({
    identificador: cfg.identificador,
    compte_id: String(compteInicial),
    iban: cfg.iban ? formataIban(cfg.iban) : '',
    bic: cfg.bic ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  function triaCompte(id: string) {
    const c = cfg.comptes.find((x) => String(x.id) === id);
    setF({ ...f, compte_id: id, iban: c?.iban ? formataIban(c.iban) : '', bic: c?.bic ?? '' });
  }

  async function envia(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/tresoreria/sepa', f);
      avisa(t("Dades del creditor desades."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <h2 className="titol-seccio">{t("Dades del creditor (l'entitat)")}</h2>
      <form className="formulari targeta" onSubmit={envia}>
        <Camp
          etiqueta={t("Identificador de creditor SEPA")}
          ajuda={
            cfg.suggeriment
              ? t("Calculat a partir del NIF {0}: {1}. Confirma'l amb el banc.", cfg.nif, cfg.suggeriment)
              : t("Indica el NIF de l'entitat a Configuració per calcular-lo.")
          }
          grup
        >
          <div className="fila-camp">
            <input
              value={f.identificador}
              placeholder={cfg.suggeriment}
              onChange={(e) => setF({ ...f, identificador: e.target.value.toUpperCase() })}
              aria-label={t("Identificador de creditor SEPA")}
            />
            {cfg.suggeriment && f.identificador !== cfg.suggeriment && (
              <button type="button" className="boto boto-petit boto-secundari" onClick={() => setF({ ...f, identificador: cfg.suggeriment })}>
                {t("Usa el suggerit")}
              </button>
            )}
          </div>
        </Camp>
        <Camp etiqueta={t("Compte on s'abonen els rebuts")}>
          <select value={f.compte_id} onChange={(e) => triaCompte(e.target.value)} required>
            <option value="">—</option>
            {cfg.comptes
              .filter((c) => c.actiu || String(c.id) === f.compte_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
          </select>
        </Camp>
        <Camp etiqueta={t("IBAN del compte")}>
          <input value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value })} required />
        </Camp>
        <Camp etiqueta={t("BIC (opcional)")}>
          <input value={f.bic} onChange={(e) => setF({ ...f, bic: e.target.value.toUpperCase() })} maxLength={11} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </>
  );
}
