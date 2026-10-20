// Pagaments de l'exercici (moviments de despesa) amb el tercer i la retenció d'IRPF assignats.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, useExercici } from '../ui';
import { centsAText, data, euros, textACents } from '../../format';
import { t } from '../../i18n';
import { FormulariTercer } from './Tercers';
import { CLAUS_190, TIPUS_RETENCIO } from './tipus';
import type { MovimentFiscal, Tercer, TipusRetencio } from './tipus';

type Filtre = 'tots' | 'sense' | 'tercer' | 'retencio';

export function Pagaments() {
  const [exercici] = useExercici();
  const { data: moviments, error, reload } = useApi<MovimentFiscal[]>(`/fiscal/moviments?exercici=${exercici}`);
  const [filtre, setFiltre] = useState<Filtre>('tots');
  const [cerca, setCerca] = useState('');
  const [editant, setEditant] = useState<MovimentFiscal | null>(null);

  if (!moviments) return <Carregant error={error} />;
  const q = cerca.trim().toLowerCase();
  const llista = moviments.filter((m) => {
    if (m.es_pagament_model) return false;
    if (filtre === 'sense' && m.tercer_id) return false;
    if (filtre === 'tercer' && !m.tercer_id) return false;
    if (filtre === 'retencio' && !m.retencio_cents) return false;
    return !q || `${m.concepte} ${m.tercer_nom ?? ''} ${m.categoria_nom ?? ''}`.toLowerCase().includes(q);
  });
  const pagaments = moviments.filter((m) => !m.es_pagament_model);
  const ambTercer = pagaments.filter((m) => m.tercer_id).length;

  return (
    <>
      <p className="apagat">
        {t("Assigneu a cada pagament el tercer que l'ha cobrat i, si la factura porta retenció d'IRPF, el tipus i el percentatge. L'import del moviment és el que s'ha pagat de veres (el net); la base és el net més la retenció, que l'entitat ingressa a Hisenda cada trimestre.")}
      </p>
      <div className="filtres fiscal-barra">
        <input type="search" placeholder={t("Cerca per concepte, tercer o categoria")} value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label={t("Cerca pagaments")} />
        <select value={filtre} onChange={(e) => setFiltre(e.target.value as Filtre)} aria-label={t("Filtra els pagaments")}>
          <option value="tots">{t("Tots els pagaments")}</option>
          <option value="sense">{t("Sense tercer")}</option>
          <option value="tercer">{t("Amb tercer")}</option>
          <option value="retencio">{t("Amb retenció")}</option>
        </select>
        <span className="espai" />
        <span className="petit apagat">{t("{0} de {1} pagaments amb tercer", ambTercer, pagaments.length)}</span>
      </div>
      {llista.length === 0 ? (
        <Buit>{t("No hi ha pagaments que coincideixin amb el filtre.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable taula-compacta">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Concepte")}</th>
                <th>{t("Tercer")}</th>
                <th className="num">{t("Pagat (net)")}</th>
                <th className="num">{t("Base")}</th>
                <th className="num">{t("Retenció")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((m) => (
                <tr key={m.id} onClick={() => setEditant(m)}>
                  <td className="nowrap">{data(m.data)}</td>
                  <td>
                    {m.concepte}
                    <div className="petit apagat">{m.categoria_nom ?? t("Sense categoria")} · {m.compte_nom}</div>
                  </td>
                  <td>{m.tercer_nom ?? <span className="apagat">{t("— Assigna —")}</span>}</td>
                  <td className="num">{euros(m.import_cents)}</td>
                  <td className="num">{m.base_cents !== null && m.tercer_id ? euros(m.base_cents) : '—'}</td>
                  <td className="num">
                    {m.retencio_cents ? (
                      <>
                        {euros(m.retencio_cents)}
                        <div className="petit apagat">
                          {m.retencio_pct} % · {m.tipus_retencio === 'arrendament' ? '115' : '111'}
                          {m.clau_190 ? ` · ${m.clau_190}` : ''}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <AssignaFiscal
          moviment={editant}
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

/** Base per defecte a partir del net i el percentatge: net / (1 − %). */
const baseDe = (net: number, pct: number) => (pct > 0 && pct < 100 ? Math.round(net / (1 - pct / 100)) : net);

function AssignaFiscal(props: { moviment: MovimentFiscal; onClose: () => void; onFet: () => void }) {
  const m = props.moviment;
  const { data: tercers, reload } = useApi<Tercer[]>('/fiscal/tercers');
  const [tercerId, setTercerId] = useState(m.tercer_id ? String(m.tercer_id) : '');
  const [tipus, setTipus] = useState<TipusRetencio | ''>(m.tipus_retencio ?? '');
  const [pct, setPct] = useState(m.retencio_pct ? String(m.retencio_pct) : '');
  const [clau, setClau] = useState(m.clau_190 ?? '');
  const [baseText, setBaseText] = useState(m.base_cents && m.tipus_retencio ? centsAText(m.base_cents) : '');
  const [nouTercer, setNouTercer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pctNum = tipus ? Number(pct.replace(',', '.')) || 0 : 0;
  const base = tipus ? (baseText.trim() ? textACents(baseText) : baseDe(m.import_cents, pctNum)) : m.import_cents;
  const retencio = base !== null ? Math.round((base * pctNum) / 100) : null;
  const quadra = base !== null && retencio !== null && Math.abs(base - retencio - m.import_cents) <= 1;

  function triaTipus(nou: TipusRetencio | '') {
    setTipus(nou);
    setBaseText('');
    if (nou === 'arrendament') {
      setPct('19');
      setClau('');
    } else if (nou && !pct) setPct('15');
    if (nou && nou !== 'arrendament' && !clau) setClau('G01');
  }

  async function envia(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tercerId && !tipus) {
      if (m.tercer_id !== null || m.base_cents !== null) await treu();
      else props.onClose();
      return;
    }
    try {
      await api.put(`/fiscal/moviments/${m.id}`, {
        tercer_id: tercerId ? Number(tercerId) : null,
        tipus_retencio: tipus || null,
        retencio_pct: pctNum,
        base_cents: base,
        clau_190: tipus && tipus !== 'arrendament' ? clau || null : null,
      });
      avisa(t("Dades fiscals desades."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function treu() {
    try {
      await api.del(`/fiscal/moviments/${m.id}`);
      avisa(t("Dades fiscals eliminades."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={t("Dades fiscals del pagament")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          <strong>{m.concepte}</strong> · {data(m.data)} · {t("pagat: {0}", euros(m.import_cents))}
        </p>
        <Camp etiqueta={t("Tercer (qui ha cobrat)")} grup>
          <div className="fiscal-fila">
            <select value={tercerId} onChange={(e) => setTercerId(e.target.value)} aria-label={t("Tercer (qui ha cobrat)")}>
              <option value="">{t("— Cap —")}</option>
              {tercers?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nom}
                  {x.nif ? ` (${x.nif})` : ''}
                </option>
              ))}
            </select>
            <button type="button" className="boto boto-secundari boto-petit" onClick={() => setNouTercer(true)}>
              {t("Nou")}
            </button>
          </div>
        </Camp>
        <Camp etiqueta={t("Retenció d'IRPF")}>
          <select value={tipus} onChange={(e) => triaTipus(e.target.value as TipusRetencio | '')}>
            <option value="">{t("Sense retenció")}</option>
            {(Object.keys(TIPUS_RETENCIO) as TipusRetencio[]).map((k) => (
              <option key={k} value={k}>
                {TIPUS_RETENCIO[k]}
              </option>
            ))}
          </select>
        </Camp>
        {tipus && (
          <>
            <Camp etiqueta={t("Percentatge de retenció")} ajuda={tipus === 'arrendament' ? t("Lloguers: 19 %.") : t("Habitualment 15 %; 7 % els primers anys d'activitat.")}>
              <input
                type="number"
                min="0"
                max="99"
                step="0.01"
                value={pct}
                onChange={(e) => {
                  setPct(e.target.value);
                  setBaseText('');
                }}
                required
              />
            </Camp>
            {tipus !== 'arrendament' && (
              <Camp etiqueta={t("Clau del model 190")}>
                <select
                  value={clau}
                  onChange={(e) => {
                    setClau(e.target.value);
                    const c = CLAUS_190.find((x) => x.clau === e.target.value);
                    if (c) {
                      setPct(String(c.pct));
                      setBaseText('');
                    }
                  }}
                >
                  <option value="">{t("— Sense clau —")}</option>
                  {CLAUS_190.map((c) => (
                    <option key={c.clau} value={c.clau}>
                      {c.text}
                    </option>
                  ))}
                </select>
              </Camp>
            )}
            <Camp etiqueta={t("Base (import íntegre de la factura)")} ajuda={t("Es calcula sola: net ÷ (1 − %). Canvieu-la només si la factura diu una altra cosa.")}>
              <input value={baseText} placeholder={base !== null ? centsAText(base) : ''} onChange={(e) => setBaseText(e.target.value)} inputMode="decimal" />
            </Camp>
            <div className={`camp-ample fiscal-calcul ${quadra ? '' : 'fiscal-calcul-error'}`}>
              <span>{t("Base")}: <strong>{base !== null ? euros(base) : '—'}</strong></span>
              <span>− {t("Retenció")}: <strong>{retencio !== null ? euros(retencio) : '—'}</strong></span>
              <span>= {t("Net pagat")}: <strong>{base !== null && retencio !== null ? euros(base - retencio) : '—'}</strong></span>
              {!quadra && <span className="error">{t("No quadra amb l'import del moviment ({0}).", euros(m.import_cents))}</span>}
            </div>
          </>
        )}
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {m.tercer_id !== null && (
            <button type="button" className="boto boto-perill" onClick={treu}>
              {t("Treu les dades fiscals")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto" disabled={Boolean(tipus) && !quadra}>
            {t("Desa")}
          </button>
        </div>
      </form>
      {nouTercer && (
        <FormulariTercer
          tercer={null}
          onClose={() => setNouTercer(false)}
          onFet={(id) => {
            setNouTercer(false);
            reload();
            setTercerId(String(id));
          }}
        />
      )}
    </Modal>
  );
}
