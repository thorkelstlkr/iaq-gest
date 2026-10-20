import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma, useExercici } from '../components/ui';
import { Imprimible } from '../components/Rgpd';
import { avui, centsAText, data, euros, textACents } from '../format';
import { DEMO } from '../mode';
import type { Categoria, Compte } from '../../shared/types';
import { locale, t } from '../i18n';

// ---------- Tipus ----------

interface Client {
  id: number;
  nom: string;
  nif: string | null;
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  pais: string;
  email: string | null;
}

interface Serie {
  id: number;
  codi: string;
  descripcio: string;
  tipus: 'ordinaria' | 'simplificada' | 'rectificativa';
  actiu: number;
}

interface FacturaLlista {
  id: number;
  num_serie: string | null;
  tipus_factura: string;
  data_expedicio: string | null;
  estat: 'esborrany' | 'emesa' | 'anullada';
  total_cents: number;
  cobrada_el: string | null;
  descripcio_operacio: string;
  client_nom: string | null;
}

interface Linia {
  concepte: string;
  quantitat: number;
  preu_cents: number;
  descompte: number;
  qualificacio: string;
  tipus_iva: number;
  causa_exempcio: string | null;
  base_cents?: number;
}

interface FacturaDetall {
  factura: Record<string, unknown> & {
    id: number;
    serie_id: number;
    num_serie: string | null;
    tipus_factura: string;
    estat: string;
    data_expedicio: string | null;
    data_operacio: string | null;
    client_id: number | null;
    dest_nom: string | null;
    dest_nif: string | null;
    dest_adreca: string | null;
    client_nom: string | null;
    client_nif: string | null;
    client_adreca: string | null;
    descripcio_operacio: string;
    observacions: string | null;
    base_cents: number;
    quota_cents: number;
    total_cents: number;
    factura_rectificada_id: number | null;
    rectificada_num_serie: string | null;
    rectificada_data: string | null;
    motiu_rectificacio: string | null;
    cobrada_el: string | null;
  };
  linies: Linia[];
  desglossament: { qualificacio: string; tipus_iva: number; base_cents: number; quota_cents: number }[];
  registres: { id: number; tipus: string; huella: string; data_hora_gen: string; estat_aeat: string; csv_aeat: string | null; error_aeat: string | null }[];
  qr: string | null;
  emissor: { nif: string; nom: string; adreca: string };
  entorn: 'proves' | 'produccio';
}

const TIPUS_FACTURA: Record<string, string> = {
  F1: t("Factura"),
  F2: t("Factura simplificada"),
  R1: t("Factura rectificativa"),
  R4: t("Factura rectificativa"),
  R5: t("Factura rectificativa (simplificada)"),
};

const QUALIFICACIONS: [string, string][] = [
  ['S1', t("Amb IVA")],
  ['E1', t("Exempta (art. 20 Llei IVA)")],
  ['E6', t("Exempta (altres)")],
  ['N1', t("No subjecta (art. 7, 14…)")],
];

const CAUSES_HABITUALS = [
  t("Art. 20.Un.12 Llei 37/1992 (serveis d’entitats sense finalitat lucrativa als seus membres)"),
  t("Art. 20.Un.13 Llei 37/1992 (serveis esportius d’entitats sense finalitat lucrativa)"),
  t("Art. 20.Un.14 Llei 37/1992 (serveis culturals d’entitats de caràcter social)"),
  t("Art. 20.Un.9 Llei 37/1992 (educació i formació)"),
];

const ESTATS_AEAT: Record<string, [string, string]> = {
  pendent: [t("Pendent d'enviar"), 'insignia-pendent'],
  correcte: [t("Acceptat per l’AEAT"), 'insignia-pagada'],
  acceptat_errors: [t("Acceptat amb errors"), 'insignia-pendent'],
  incorrecte: [t("Rebutjat"), 'insignia-pendent'],
  no_aplica: ['—', 'insignia-exempta'],
};

const PESTANYES = [
  { id: 'factures', text: t("Factures") },
  { id: 'clients', text: t("Clients") },
  { id: 'registre', text: t("Registre VERI*FACTU") },
  { id: 'config', text: t("Configuració") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Facturacio() {
  const [pestanya, setPestanya] = useState<Pestanya>('factures');
  return (
    <>
      <Capcalera titol={t("Facturació")} subtitol={t("Factures conformes al Reglament de facturació i al sistema VERI*FACTU")} />
      <div className="pestanyes" role="tablist">
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'factures' && <Factures />}
      {pestanya === 'clients' && <Clients />}
      {pestanya === 'registre' && <Registre />}
      {pestanya === 'config' && <ConfigFacturacio />}
    </>
  );
}

// ---------- Llista de factures ----------

function Factures() {
  const [exercici] = useExercici();
  const { data: factures, error, reload } = useApi<FacturaLlista[]>(`/facturacio/factures?exercici=${exercici}`);
  const [obert, setObert] = useState<number | 'nova' | null>(null);
  const tancar = () => {
    setObert(null);
    reload();
  };

  return (
    <>
      <div className="barra-accions">
        <button className="boto" onClick={() => setObert('nova')}>
          {t("+ Nova factura")}
        </button>
      </div>
      {!factures ? (
        <Carregant error={error} />
      ) : factures.length === 0 ? (
        <Buit>{t("No hi ha factures en aquest exercici.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Número")}</th>
                <th>{t("Data")}</th>
                <th>{t("Client")}</th>
                <th>{t("Concepte")}</th>
                <th className="num">{t("Total")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} onClick={() => setObert(f.id)}>
                  <td className="nowrap">{f.num_serie ?? <em className="apagat">{t("Esborrany")}</em>}</td>
                  <td className="nowrap">{data(f.data_expedicio)}</td>
                  <td>{f.client_nom ?? <span className="apagat">—</span>}</td>
                  <td>{f.descripcio_operacio}</td>
                  <td className={`num nowrap ${f.total_cents < 0 ? 'negatiu' : ''}`}>{euros(f.total_cents)}</td>
                  <td>
                    {f.estat === 'esborrany' ? (
                      <span className="insignia insignia-exempta">{t("Esborrany")}</span>
                    ) : f.estat === 'anullada' ? (
                      <span className="insignia insignia-exempta">{t("Anul·lada")}</span>
                    ) : f.cobrada_el || f.total_cents <= 0 ? (
                      <span className="insignia insignia-pagada">{f.total_cents <= 0 ? t("Emesa") : t("Cobrada")}</span>
                    ) : (
                      <span className="insignia insignia-pendent">{t("Pendent de cobrar")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {obert === 'nova' && <EditorFactura id={null} onClose={tancar} onObre={(id) => setObert(id)} />}
      {typeof obert === 'number' && <ObreFactura id={obert} onClose={tancar} onObre={(id) => setObert(id)} />}
    </>
  );
}

/** Obre l'editor (esborrany) o la vista de la factura emesa. */
function ObreFactura({ id, onClose, onObre }: { id: number; onClose: () => void; onObre: (id: number) => void }) {
  const { data: d, error, reload } = useApi<FacturaDetall>(`/facturacio/factures/${id}`);
  if (!d) return <Modal titol={t("Factura")} onClose={onClose}>{<div className="formulari-modal"><Carregant error={error} /></div>}</Modal>;
  if (d.factura.estat === 'esborrany') return <EditorFactura id={id} inicial={d} onClose={onClose} onObre={onObre} />;
  return <VistaFactura d={d} onClose={onClose} onCanvi={reload} onObre={onObre} />;
}

// ---------- Editor d'esborranys ----------

const LINIA_BUIDA: Linia = { concepte: '', quantitat: 1, preu_cents: 0, descompte: 0, qualificacio: 'S1', tipus_iva: 21, causa_exempcio: null };

function EditorFactura({ id, inicial, onClose, onObre }: { id: number | null; inicial?: FacturaDetall; onClose: () => void; onObre: (id: number) => void }) {
  const { data: series } = useApi<Serie[]>('/facturacio/series');
  const { data: clients, reload: recarregaClients } = useApi<Client[]>('/facturacio/clients');
  const f0 = inicial?.factura;
  const [capcalera, setCapcalera] = useState({
    serie_id: f0 ? String(f0.serie_id) : '',
    client_id: f0?.client_id ? String(f0.client_id) : '',
    descripcio_operacio: f0?.descripcio_operacio ?? '',
    data_operacio: f0?.data_operacio ?? '',
    observacions: f0?.observacions ?? '',
    motiu_rectificacio: f0?.motiu_rectificacio ?? '',
  });
  const [linies, setLinies] = useState<(Linia & { preu: string })[]>(
    (inicial?.linies.length ? inicial.linies : [LINIA_BUIDA]).map((l) => ({ ...l, preu: centsAText(l.preu_cents) })),
  );
  const [nouClient, setNouClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serie = series?.find((s) => String(s.id) === capcalera.serie_id);
  const rectificativa = Boolean(f0?.factura_rectificada_id);

  useEffect(() => {
    if (!capcalera.serie_id && series?.length) {
      const per = series.find((s) => s.actiu && s.tipus === (rectificativa ? 'rectificativa' : 'ordinaria'));
      if (per) setCapcalera((c) => ({ ...c, serie_id: String(per.id) }));
    }
  }, [series, capcalera.serie_id, rectificativa]);

  // Càlcul en viu (el definitiu el fa el servidor en emetre).
  const totals = useMemo(() => {
    const grups = new Map<string, { base: number; tipus: number; qual: string }>();
    for (const l of linies) {
      const preu = textACents(l.preu) ?? 0;
      const v = l.quantitat * preu * (1 - (l.descompte || 0) / 100);
      const base = Math.sign(v) * Math.round(Math.abs(v));
      const clau = `${l.qualificacio}|${l.qualificacio === 'S1' ? l.tipus_iva : 0}`;
      const g = grups.get(clau) ?? { base: 0, tipus: l.qualificacio === 'S1' ? l.tipus_iva : 0, qual: l.qualificacio };
      g.base += base;
      grups.set(clau, g);
    }
    let base = 0;
    let quota = 0;
    for (const g of grups.values()) {
      base += g.base;
      if (g.qual === 'S1') {
        const q = (g.base * g.tipus) / 100;
        quota += Math.sign(q) * Math.round(Math.abs(q));
      }
    }
    return { base, quota, total: base + quota };
  }, [linies]);

  const setL = (i: number, canvis: Partial<Linia & { preu: string }>) => setLinies(linies.map((l, j) => (j === i ? { ...l, ...canvis } : l)));

  function cos() {
    return {
      ...capcalera,
      tipus_factura: f0?.tipus_factura,
      factura_rectificada_id: f0?.factura_rectificada_id,
      linies: linies.map((l) => ({ ...l, preu_cents: textACents(l.preu) ?? NaN })),
    };
  }

  async function desa(): Promise<number | null> {
    setError(null);
    try {
      if (id) {
        await api.put(`/facturacio/factures/${id}`, cos());
        return id;
      }
      const r = await api.post<{ id: number }>('/facturacio/factures', cos());
      return r.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function desaEsborrany(e: FormEvent) {
    e.preventDefault();
    if (await desa()) {
      avisa(t("Esborrany desat."));
      onClose();
    }
  }

  async function emet() {
    const nouId = await desa();
    if (!nouId) return;
    const ok = await confirma(
      t("Un cop emesa, la factura rep un número correlatiu i es genera el registre VERI*FACTU encadenat. Ja no es podrà modificar ni esborrar: per corregir-la caldrà fer una factura rectificativa. Emetre-la?"),
    );
    if (!ok) {
      if (!id) onObre(nouId);
      return;
    }
    try {
      const r = await api.post<{ num_serie: string }>(`/facturacio/factures/${nouId}/emet`);
      avisa(t("Factura {0} emesa.", r.num_serie));
      onObre(nouId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      if (!id) onObre(nouId);
    }
  }

  async function elimina() {
    if (!id || !(await confirma(t("Eliminar aquest esborrany?")))) return;
    try {
      await api.del(`/facturacio/factures/${id}`);
      onClose();
    } catch (e) {
      avisaError(e);
    }
  }

  const series_ = series?.filter((s) => s.actiu && (rectificativa ? s.tipus === 'rectificativa' : s.tipus !== 'rectificativa')) ?? [];

  return (
    <Modal titol={rectificativa ? t("Factura rectificativa de {0}", f0?.rectificada_num_serie) : id ? t("Esborrany de factura") : t("Nova factura")} onClose={onClose} ample>
      <form className="formulari formulari-modal" onSubmit={desaEsborrany}>
        <Camp etiqueta={t("Sèrie")}>
          <select id="fac-serie" value={capcalera.serie_id} onChange={(e) => setCapcalera({ ...capcalera, serie_id: e.target.value })} required>
            {series_.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codi} · {s.descripcio}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={serie?.tipus === 'simplificada' ? t("Client (opcional)") : t("Client")}>
          <div className="fila-client">
            <select id="fac-client" value={capcalera.client_id} onChange={(e) => setCapcalera({ ...capcalera, client_id: e.target.value })}>
              <option value="">—</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                  {c.nif ? ` (${c.nif})` : ''}
                </option>
              ))}
            </select>
            <button type="button" className="boto boto-petit boto-secundari" onClick={() => setNouClient(true)}>
              {t("Nou")}
            </button>
          </div>
        </Camp>
        <Camp etiqueta={t("Descripció de l'operació")} ample ajuda={t("Resum breu (surt al registre de l'AEAT)")}>
          <input id="fac-descripcio" value={capcalera.descripcio_operacio} onChange={(e) => setCapcalera({ ...capcalera, descripcio_operacio: e.target.value })} />
        </Camp>
        <Camp etiqueta={t("Data de l'operació (si és diferent)")} ajuda={t("La data d'expedició és la del dia que s'emet")}>
          <input id="fac-data-op" type="date" value={capcalera.data_operacio} onChange={(e) => setCapcalera({ ...capcalera, data_operacio: e.target.value })} />
        </Camp>
        {rectificativa && (
          <Camp etiqueta={t("Motiu de la rectificació")} ample>
            <input id="fac-motiu" value={capcalera.motiu_rectificacio} onChange={(e) => setCapcalera({ ...capcalera, motiu_rectificacio: e.target.value })} required />
          </Camp>
        )}

        <div className="camp-ample linies-factura">
          <div className="linia-factura linia-cap" aria-hidden="true">
            <span>{t("Concepte")}</span>
            <span>{t("Quant.")}</span>
            <span>{t("Preu (€, sense IVA)")}</span>
            <span>{t("Dte. %")}</span>
            <span>{t("IVA")}</span>
            <span />
          </div>
          {linies.map((l, i) => (
            <div key={i} className="linia-factura">
              <input aria-label={t("Concepte")} value={l.concepte} onChange={(e) => setL(i, { concepte: e.target.value })} required />
              <input aria-label={t("Quantitat")} type="number" step="any" value={l.quantitat} onChange={(e) => setL(i, { quantitat: Number(e.target.value) })} />
              <input aria-label={t("Preu")} inputMode="decimal" value={l.preu} onChange={(e) => setL(i, { preu: e.target.value })} className="input-import" />
              <input aria-label={t("Descompte")} type="number" min={0} max={100} step="any" value={l.descompte} onChange={(e) => setL(i, { descompte: Number(e.target.value) })} />
              <select
                aria-label="IVA"
                value={l.qualificacio === 'S1' ? `S1:${l.tipus_iva}` : l.qualificacio}
                onChange={(e) => {
                  const [q, tt] = e.target.value.split(':');
                  setL(i, { qualificacio: q, tipus_iva: Number(tt ?? 0), causa_exempcio: q === 'S1' ? null : l.causa_exempcio ?? CAUSES_HABITUALS[2] });
                }}
              >
                {[21, 10, 4, 0].map((tt) => (
                  <option key={tt} value={`S1:${tt}`}>
                    {tt} %
                  </option>
                ))}
                {QUALIFICACIONS.filter(([k]) => k !== 'S1').map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="button" className="boto-icona" aria-label={t("Treu la línia")} onClick={() => setLinies(linies.filter((_, j) => j !== i))} disabled={linies.length === 1}>
                ×
              </button>
              {l.qualificacio !== 'S1' && (
                <input
                  className="linia-causa"
                  aria-label={t("Motiu legal de l'exempció")}
                  list="causes-exempcio"
                  value={l.causa_exempcio ?? ''}
                  onChange={(e) => setL(i, { causa_exempcio: e.target.value })}
                  placeholder={t("Motiu legal (obligatori a la factura)")}
                  required
                />
              )}
            </div>
          ))}
          <datalist id="causes-exempcio">
            {CAUSES_HABITUALS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => setLinies([...linies, { ...LINIA_BUIDA, preu: '' } as Linia & { preu: string }])}>
            {t("+ Afegeix una línia")}
          </button>
        </div>

        <div className="camp-ample totals-factura">
          <span>{t("Base:")} {euros(totals.base)}</span>
          <span>{t("IVA:")} {euros(totals.quota)}</span>
          <strong>{t("Total:")} {euros(totals.total)}</strong>
        </div>
        <Camp etiqueta={t("Observacions (surten a la factura)")} ample>
          <textarea id="fac-obs" rows={2} value={capcalera.observacions} onChange={(e) => setCapcalera({ ...capcalera, observacions: e.target.value })} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {id && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina l'esborrany")}
            </button>
          )}
          <span className="espai" />
          <button className="boto boto-secundari">{t("Desa l'esborrany")}</button>
          <button type="button" className="boto" onClick={emet}>
            {t("Emet la factura")}
          </button>
        </div>
      </form>
      {nouClient && (
        <FormClient
          inicial={{}}
          onClose={() => setNouClient(false)}
          onFet={(c) => {
            setNouClient(false);
            recarregaClients();
            if (c) setCapcalera((x) => ({ ...x, client_id: String(c.id) }));
          }}
        />
      )}
    </Modal>
  );
}

// ---------- Vista d'una factura emesa ----------

function VistaFactura({ d, onClose, onCanvi, onObre }: { d: FacturaDetall; onClose: () => void; onCanvi: () => void; onObre: (id: number) => void }) {
  const f = d.factura;
  const [cobrant, setCobrant] = useState(false);
  const reg = d.registres.find((r) => r.tipus === 'alta');

  async function rectifica() {
    try {
      const r = await api.post<{ id: number }>(`/facturacio/factures/${f.id}/rectifica`, {});
      avisa(t("S'ha creat l'esborrany de la rectificativa. Ajusta'n les línies i el motiu."));
      onObre(r.id);
    } catch (e) {
      avisaError(e);
    }
  }

  async function anulla() {
    const ok = await confirma(
      t("L'anul·lació només és per a factures emeses per error, que no corresponen a cap operació real. Si l'operació existeix però hi ha un error, fes una factura rectificativa. Anul·lar-la?"),
    );
    if (!ok) return;
    try {
      await api.post(`/facturacio/factures/${f.id}/anulla`, { motiu: t("Factura emesa per error") });
      avisa(t("Factura anul·lada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <Modal titol={`${TIPUS_FACTURA[f.tipus_factura]} ${f.num_serie}`} onClose={onClose} ample>
      <div className="formulari-modal vista-factura">
        <div className="accions camp-ample">
          {f.estat === 'emesa' && !f.cobrada_el && f.total_cents > 0 && (
            <button className="boto boto-petit" onClick={() => setCobrant(true)}>
              {t("Registra el cobrament")}
            </button>
          )}
          {f.estat === 'emesa' && !f.tipus_factura.startsWith('R') && (
            <button className="boto boto-petit boto-secundari" onClick={rectifica}>
              {t("Fes una rectificativa")}
            </button>
          )}
          {f.estat === 'emesa' && (
            <button className="boto boto-petit boto-perill" onClick={anulla}>
              {t("Anul·la")}
            </button>
          )}
          {reg && (
            <span className={`insignia ${ESTATS_AEAT[reg.estat_aeat]?.[1]}`} title={reg.error_aeat ?? undefined}>
              {t("AEAT:")} {ESTATS_AEAT[reg.estat_aeat]?.[0]}
            </span>
          )}
        </div>
        {reg?.error_aeat && <p className="error camp-ample">{t("Resposta de l'AEAT:")} {reg.error_aeat}</p>}
        <div className="camp-ample">
          <Imprimible titolBoto={t("Imprimeix la factura")}>
            <DocumentFactura d={d} />
          </Imprimible>
        </div>
      </div>
      {cobrant && (
        <CobraFactura
          id={f.id}
          total={f.total_cents}
          onClose={() => setCobrant(false)}
          onFet={() => {
            setCobrant(false);
            onCanvi();
          }}
        />
      )}
    </Modal>
  );
}

/** La factura tal com s'imprimeix: QR tributari a dalt i totes les dades de l'art. 6 del RD 1619/2012. */
function DocumentFactura({ d }: { d: FacturaDetall }) {
  const f = d.factura;
  const exempcions = [...new Set(d.linies.filter((l) => l.qualificacio !== 'S1').map((l) => l.causa_exempcio))].filter(Boolean);
  return (
    <div className={`factura ${f.estat === 'anullada' ? 'factura-anullada' : ''}`}>
      {d.qr && (
        <div className="factura-qr">
          <div>{t("QR tributari:")}</div>
          <div className="qr" dangerouslySetInnerHTML={{ __html: d.qr }} />
          <div>{t("VERI*FACTU")}</div>
        </div>
      )}
      {d.entorn === 'proves' && <p className="factura-avis">{t("Entorn de proves de l'AEAT: aquesta factura no té validesa fiscal.")}</p>}
      {f.estat === 'anullada' && <p className="factura-avis">{t("FACTURA ANUL·LADA")}</p>}
      <header className="factura-cap">
        <div>
          <strong>{d.emissor.nom}</strong>
          <div>{t("NIF:")} {d.emissor.nif}</div>
          <div>{d.emissor.adreca}</div>
        </div>
        <div className="factura-num">
          <div className="factura-tipus">{TIPUS_FACTURA[f.tipus_factura]}</div>
          <div>
            {t("Núm.")} <strong>{f.num_serie}</strong>
          </div>
          <div>{t("Data d'expedició:")} {data(f.data_expedicio)}</div>
          {f.data_operacio && f.data_operacio !== f.data_expedicio && <div>{t("Data de l'operació:")} {data(f.data_operacio)}</div>}
        </div>
      </header>
      {(f.dest_nom || f.dest_nif) && (
        <section className="factura-dest">
          <div className="apagat petit">{t("Destinatari")}</div>
          <strong>{f.dest_nom}</strong>
          {f.dest_nif && <div>{t("NIF:")} {f.dest_nif}</div>}
          {f.dest_adreca && <div>{f.dest_adreca}</div>}
        </section>
      )}
      {f.rectificada_num_serie && (
        <p className="factura-rect">
          {t("Rectifica la factura núm.")} {f.rectificada_num_serie} {t("del")} {data(f.rectificada_data)}{t(". Motiu:")} {f.motiu_rectificacio}
        </p>
      )}
      <table className="factura-linies">
        <thead>
          <tr>
            <th>{t("Concepte")}</th>
            <th className="num">{t("Quantitat")}</th>
            <th className="num">{t("Preu")}</th>
            <th className="num">{t("Dte.")}</th>
            <th className="num">{t("IVA")}</th>
            <th className="num">{t("Import")}</th>
          </tr>
        </thead>
        <tbody>
          {d.linies.map((l, i) => (
            <tr key={i}>
              <td>{l.concepte}</td>
              <td className="num">{l.quantitat.toLocaleString(locale())}</td>
              <td className="num">{euros(l.preu_cents)}</td>
              <td className="num">{l.descompte ? `${l.descompte} %` : ''}</td>
              <td className="num">{l.qualificacio === 'S1' ? `${l.tipus_iva} %` : l.qualificacio.startsWith('E') ? t("Exempt") : t("No subj.")}</td>
              <td className="num">{euros(l.base_cents ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="factura-desglos">
        <thead>
          <tr>
            <th>{t("Base imposable")}</th>
            <th className="num">{t("Tipus")}</th>
            <th className="num">{t("Quota")}</th>
          </tr>
        </thead>
        <tbody>
          {d.desglossament.map((g, i) => (
            <tr key={i}>
              <td>{euros(g.base_cents)}</td>
              <td className="num">{g.qualificacio === 'S1' ? `${g.tipus_iva} %` : g.qualificacio.startsWith('E') ? t("Exempta") : t("No subjecta")}</td>
              <td className="num">{euros(g.quota_cents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{t("Total base")} {euros(f.base_cents)}</td>
            <td className="num">{t("Total IVA")}</td>
            <td className="num">{euros(f.quota_cents)}</td>
          </tr>
          <tr className="factura-total">
            <td colSpan={2}>{t("TOTAL FACTURA")}</td>
            <td className="num">{euros(f.total_cents)}</td>
          </tr>
        </tfoot>
      </table>
      {exempcions.length > 0 && (
        <p className="factura-mencio">
          {exempcions.map((c) => (
            <span key={c}>{t("Operació exempta o no subjecta a l'IVA:")} {c}. </span>
          ))}
        </p>
      )}
      {f.observacions && <p className="factura-mencio">{f.observacions}</p>}
    </div>
  );
}

function CobraFactura(props: { id: number; total: number; onClose: () => void; onFet: () => void }) {
  const { data: comptes } = useApi<Compte[]>('/comptabilitat/comptes');
  const { data: categories } = useApi<Categoria[]>('/comptabilitat/categories');
  const [f, setF] = useState({ data: avui(), compte_id: '', categoria_id: '' });
  const ingressos = categories?.filter((c) => c.tipus === 'ingres' && c.actiu) ?? [];
  useEffect(() => {
    setF((x) => ({
      ...x,
      compte_id: x.compte_id || String(comptes?.find((c) => c.actiu)?.id ?? ''),
      categoria_id: x.categoria_id || String(ingressos.find((c) => /vendes|activitats/i.test(c.nom))?.id ?? ingressos[0]?.id ?? ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comptes, categories]);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/facturacio/factures/${props.id}/cobra`, f);
      avisa(t("Cobrament registrat a comptabilitat."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={t("Registra el cobrament")} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {t("Import:")} <strong>{euros(props.total)}</strong>{t(". Es crearà l'ingrés a comptabilitat.")}
        </p>
        <Camp etiqueta={t("Data")}>
          <input id="cob-data" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required />
        </Camp>
        <Camp etiqueta={t("Compte")}>
          <select id="cob-compte" value={f.compte_id} onChange={(e) => setF({ ...f, compte_id: e.target.value })} required>
            {comptes?.filter((c) => c.actiu).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Categoria d'ingrés")} ample>
          <select id="cob-categoria" value={f.categoria_id} onChange={(e) => setF({ ...f, categoria_id: e.target.value })} required>
            {ingressos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto">{t("Registra")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Clients ----------

function Clients() {
  const { data: clients, error, reload } = useApi<Client[]>('/facturacio/clients');
  const [editant, setEditant] = useState<Partial<Client> | null>(null);
  return (
    <>
      <div className="barra-accions">
        <button className="boto" onClick={() => setEditant({ pais: 'ES' })}>
          {t("+ Nou client")}
        </button>
      </div>
      {!clients ? (
        <Carregant error={error} />
      ) : clients.length === 0 ? (
        <Buit>{t("No hi ha clients. Afegeix-los aquí o directament en fer una factura.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Nom o raó social")}</th>
                <th>{t("NIF")}</th>
                <th>{t("Població")}</th>
                <th>{t("Correu")}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} onClick={() => setEditant(c)}>
                  <td>{c.nom}</td>
                  <td>{c.nif}</td>
                  <td>{c.poblacio}</td>
                  <td>{c.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormClient
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

function FormClient(props: { inicial: Partial<Client>; onClose: () => void; onFet: (c?: Client) => void }) {
  const c = props.inicial;
  const [f, setF] = useState({
    nom: c.nom ?? '',
    nif: c.nif ?? '',
    adreca: c.adreca ?? '',
    codi_postal: c.codi_postal ?? '',
    poblacio: c.poblacio ?? '',
    email: c.email ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const r = c.id ? await api.put<Client>(`/facturacio/clients/${c.id}`, f) : await api.post<Client>('/facturacio/clients', f);
      avisa(t("Client desat."));
      props.onFet(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquest client?")))) return;
    try {
      await api.del(`/facturacio/clients/${c.id}`);
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={c.id ? t("Client") : t("Nou client")} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Nom o raó social")} ample>
          <input id="cli-nom" value={f.nom} onChange={set('nom')} required autoFocus />
        </Camp>
        <Camp etiqueta="NIF">
          <input id="cli-nif" value={f.nif} onChange={set('nif')} />
        </Camp>
        <Camp etiqueta={t("Correu electrònic")}>
          <input id="cli-email" type="email" value={f.email} onChange={set('email')} />
        </Camp>
        <Camp etiqueta={t("Adreça")} ample>
          <input id="cli-adreca" value={f.adreca} onChange={set('adreca')} />
        </Camp>
        <Camp etiqueta={t("Codi postal")}>
          <input id="cli-cp" value={f.codi_postal} onChange={set('codi_postal')} />
        </Camp>
        <Camp etiqueta={t("Població")}>
          <input id="cli-poblacio" value={f.poblacio} onChange={set('poblacio')} />
        </Camp>
        <p className="apagat petit camp-ample">{t("Per a les factures completes calen el nom, el NIF i l'adreça del destinatari.")}</p>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {c.id && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Registre VERI*FACTU ----------

interface Registre {
  id: number;
  tipus: 'alta' | 'anulacio';
  num_serie: string;
  data_expedicio: string;
  tipus_factura: string | null;
  import_total: string | null;
  huella: string;
  data_hora_gen: string;
  estat_aeat: string;
  csv_aeat: string | null;
  error_aeat: string | null;
}

function Registre() {
  const { data: registres, error, reload } = useApi<Registre[]>('/facturacio/registres');
  const [verificacio, setVerificacio] = useState<string | null>(null);
  const [enviant, setEnviant] = useState(false);
  const [xml, setXml] = useState<string | null>(null);

  async function verifica() {
    try {
      const r = await api.get<{ ok: boolean; registres?: number; motiu?: string; id?: number }>('/facturacio/registres/verifica');
      setVerificacio(r.ok ? t("Cadena íntegra: {0} registres comprovats.", r.registres) : t("ERROR al registre {0}: {1}", r.id, r.motiu));
    } catch (e) {
      avisaError(e);
    }
  }

  async function envia() {
    setEnviant(true);
    try {
      const r = await api.post<{ missatge: string }>('/facturacio/registres/envia');
      avisa(r.missatge);
      reload();
    } catch (e) {
      avisaError(e);
    } finally {
      setEnviant(false);
    }
  }

  const pendents = registres?.filter((r) => r.estat_aeat === 'pendent').length ?? 0;

  return (
    <>
      <section className="targeta">
        <p className="apagat petit">
          {t("Cada factura emesa o anul·lada genera un registre amb una «huella» (SHA-256) que inclou la del registre anterior: si algú en modifiqués un, la cadena es trencaria. Els registres s'envien a l'AEAT (sistema VERI*FACTU) amb el certificat electrònic de l'entitat.")}
        </p>
        <div className="accions">
          <button className="boto boto-secundari" onClick={verifica}>
            {t("Verifica la integritat de la cadena")}
          </button>
          {!DEMO && (
            <button className="boto" onClick={envia} disabled={enviant || !pendents}>
              {enviant ? t("Enviant…") : t("Envia a l'AEAT ({0} pendents)", pendents)}
            </button>
          )}
        </div>
        {verificacio && <p className={verificacio.startsWith('ERROR') ? 'error' : 'apagat'}>{verificacio}</p>}
      </section>
      {!registres ? (
        <Carregant error={error} />
      ) : registres.length === 0 ? (
        <Buit>{t("Encara no s'ha emès cap factura.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Generat")}</th>
                <th>{t("Tipus")}</th>
                <th>{t("Factura")}</th>
                <th className="num">{t("Import")}</th>
                <th>{t("Huella")}</th>
                <th>{t("AEAT")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {registres.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{r.data_hora_gen.replace('T', ' ').slice(0, 16)}</td>
                  <td>{r.tipus === 'alta' ? t("Alta {0}", r.tipus_factura) : t("Anul·lació")}</td>
                  <td className="nowrap">{r.num_serie}</td>
                  <td className="num">{r.import_total ? euros(Math.round(Number(r.import_total) * 100)) : ''}</td>
                  <td>
                    <code className="huella" title={r.huella}>
                      {r.huella.slice(0, 12)}…
                    </code>
                  </td>
                  <td>
                    <span className={`insignia ${ESTATS_AEAT[r.estat_aeat]?.[1]}`} title={r.error_aeat ?? r.csv_aeat ?? undefined}>
                      {ESTATS_AEAT[r.estat_aeat]?.[0]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="boto boto-petit boto-secundari"
                      onClick={async () => setXml((await api.get<{ xml: string }>(`/facturacio/registres/${r.id}/xml`)).xml)}
                    >
                      {t("XML")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {xml && (
        <Modal titol={t("Registre de facturació (XML)")} onClose={() => setXml(null)} ample>
          <pre className="xml">{xml.replace(/></g, '>\n<')}</pre>
        </Modal>
      )}
    </>
  );
}

// ---------- Configuració ----------

interface ConfigFac {
  fac_nif: string;
  fac_nom: string;
  fac_adreca: string;
  fac_entorn: 'proves' | 'produccio';
  fac_productor_nom: string;
  fac_productor_nif: string;
  fac_num_installacio: string;
  fac_enviament_auto: boolean;
  te_certificat: boolean;
  darrer_error: string | null;
  pendents: number;
  sistema: { nom: string; id: string; versio: string };
}

function ConfigFacturacio() {
  const { data: cfg, error, reload } = useApi<ConfigFac>('/facturacio/config');
  const { data: series, reload: recarregaSeries } = useApi<Serie[]>('/facturacio/series');
  const [f, setF] = useState<ConfigFac | null>(null);
  const [cert, setCert] = useState<{ nom: string; b64: string } | null>(null);
  const [contrasenya, setContrasenya] = useState('');
  useEffect(() => setF(cfg), [cfg]);
  if (!f) return <Carregant error={error} />;
  const set = (k: keyof ConfigFac) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function triaCert(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    const buf = new Uint8Array(await fitxer.arrayBuffer());
    let bin = '';
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    setCert({ nom: fitxer.name, b64: btoa(bin) });
  }

  async function desa(e: FormEvent) {
    e.preventDefault();
    if (f!.fac_entorn === 'produccio' && cfg?.fac_entorn !== 'produccio') {
      const ok = await confirma(
        t("En l'entorn de producció, les factures es comuniquen a l'AEAT amb plens efectes fiscals. Fes-ho només quan ho hàgiu provat a l'entorn de proves. Continuar?"),
      );
      if (!ok) return;
    }
    try {
      await api.put('/facturacio/config', {
        ...f,
        fac_cert: cert?.b64,
        fac_cert_contrasenya: contrasenya || undefined,
      });
      setCert(null);
      setContrasenya('');
      reload();
      avisa(t("Configuració desada."));
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <>
      <form className="formulari targeta" onSubmit={desa}>
        <h2 className="camp-ample">{t("Dades de l'emissor")}</h2>
        <Camp etiqueta={t("NIF de l'entitat")}>
          <input id="fc-nif" value={f.fac_nif} onChange={set('fac_nif')} placeholder="G00000000" required />
        </Camp>
        <Camp etiqueta={t("Nom o raó social")} ample>
          <input id="fc-nom" value={f.fac_nom} onChange={set('fac_nom')} required />
        </Camp>
        <Camp etiqueta={t("Domicili fiscal")} ample>
          <input id="fc-adreca" value={f.fac_adreca} onChange={set('fac_adreca')} required />
        </Camp>

        <h2 className="camp-ample">{t("Remissió a l'AEAT (VERI*FACTU)")}</h2>
        <Camp etiqueta={t("Entorn")}>
          <select id="fc-entorn" value={f.fac_entorn} onChange={set('fac_entorn')}>
            <option value="proves">{t("Proves (sense efectes fiscals)")}</option>
            <option value="produccio">{t("Producció (real)")}</option>
          </select>
        </Camp>
        <label className="casella">
          <input type="checkbox" checked={f.fac_enviament_auto} onChange={(e) => setF({ ...f, fac_enviament_auto: e.target.checked })} />
          {t("Envia automàticament després d'emetre")}
        </label>
        <div className="camp camp-ample">
          <span className="camp-etiqueta">{t("Certificat electrònic de l'entitat (.p12 o .pfx)")}</span>
          <div className="accions">
            <span className={`insignia ${f.te_certificat ? 'insignia-pagada' : 'insignia-pendent'}`}>
              {cert ? t("Nou: {0}", cert.nom) : f.te_certificat ? t("Certificat desat") : t("Sense certificat")}
            </span>
            <label className="boto boto-petit boto-secundari">
              {f.te_certificat ? t("Canvia el certificat") : t("Puja el certificat")}
              <input type="file" accept=".p12,.pfx" onChange={triaCert} hidden />
            </label>
          </div>
          <span className="camp-ajuda">
            {t("És el certificat de representant de l'entitat (o d'una persona apoderada). Es desa només en aquest ordinador.")}
          </span>
        </div>
        <Camp etiqueta={t("Contrasenya del certificat")} ajuda={f.te_certificat ? t("Deixa-ho en blanc per mantenir la desada") : undefined}>
          <input id="fc-cert-pass" type="password" value={contrasenya} onChange={(e) => setContrasenya(e.target.value)} autoComplete="off" />
        </Camp>
        {f.darrer_error && <p className="error camp-ample">{t("Darrer error d'enviament:")} {f.darrer_error}</p>}

        <h2 className="camp-ample">{t("Sistema informàtic de facturació")}</h2>
        <p className="apagat petit camp-ample">
          {t("Programa «")}{f.sistema.nom}{t("» (identificador")} {f.sistema.id}{t(", versió")} {f.sistema.versio}{t("), instal·lació")} {f.fac_num_installacio}{t(". La llei exigeix que qui produeix o distribueix el programa en signi una declaració responsable: indica aquí qui és.")}
        </p>
        <Camp etiqueta={t("Productor del programa (nom)")}>
          <input id="fc-prod-nom" value={f.fac_productor_nom} onChange={set('fac_productor_nom')} />
        </Camp>
        <Camp etiqueta={t("NIF del productor")}>
          <input id="fc-prod-nif" value={f.fac_productor_nif} onChange={set('fac_productor_nif')} />
        </Camp>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>

      <section className="targeta">
        <h2>{t("Sèries de facturació")}</h2>
        <p className="apagat petit">
          {t("Cada sèrie té numeració correlativa pròpia per any (p. ex. A2026-0001). Les rectificatives i les simplificades han d'anar en sèries separades.")}
        </p>
        <table className="taula taula-compacta">
          <tbody>
            {series?.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.codi}</strong>
                </td>
                <td>{s.descripcio}</td>
                <td className="apagat">{s.tipus}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <NovaSerie onFet={recarregaSeries} />
      </section>
    </>
  );
}

function NovaSerie({ onFet }: { onFet: () => void }) {
  const [f, setF] = useState({ codi: '', descripcio: '', tipus: 'ordinaria' });
  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/facturacio/series', f);
      setF({ codi: '', descripcio: '', tipus: 'ordinaria' });
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <form className="afegeix-linia" onSubmit={envia}>
      <input id="ns-codi" value={f.codi} onChange={(e) => setF({ ...f, codi: e.target.value })} placeholder={t("Codi (p. ex. B)")} aria-label={t("Codi")} required maxLength={6} />
      <input id="ns-desc" value={f.descripcio} onChange={(e) => setF({ ...f, descripcio: e.target.value })} placeholder={t("Descripció")} aria-label={t("Descripció")} required />
      <select id="ns-tipus" value={f.tipus} onChange={(e) => setF({ ...f, tipus: e.target.value })} aria-label={t("Tipus")}>
        <option value="ordinaria">{t("Ordinària")}</option>
        <option value="simplificada">{t("Simplificada")}</option>
        <option value="rectificativa">{t("Rectificativa")}</option>
      </select>
      <button className="boto boto-petit">{t("Afegeix")}</button>
    </form>
  );
}
