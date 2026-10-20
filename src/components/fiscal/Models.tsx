// Resums dels models de retencions (111, 115, 190, 180) i d'operacions amb tercers (347).
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, useExercici } from '../ui';
import { Imprimible } from '../Rgpd';
import { useEntitat } from '../../entitat';
import { DEMO } from '../../mode';
import { avui, data, euros } from '../../format';
import { idioma, t } from '../../i18n';
import type { CompteExtracte, Fila347, Models as DadesModels, ResumAnual, ResumTrimestre } from './tipus';

type Model = '111' | '115' | '190' | '180' | '347';

const TITOLS: Record<Model, string> = {
  '111': t("Model 111 · Retencions de professionals i artistes (trimestral)"),
  '115': t("Model 115 · Retencions de lloguers (trimestral)"),
  '190': t("Model 190 · Resum anual de retencions de professionals i artistes"),
  '180': t("Model 180 · Resum anual de retencions de lloguers"),
  '347': t("Model 347 · Operacions amb tercers de més de 3.005,06 €"),
};

export function Models() {
  const [exercici] = useExercici();
  const { data: d, error, reload } = useApi<DadesModels>(`/fiscal/models?exercici=${exercici}`);
  const [obert, setObert] = useState<Model | null>(null);
  const [pagant, setPagant] = useState<{ model: '111' | '115'; r: ResumTrimestre } | null>(null);

  if (!d || d.exercici !== exercici) return <Carregant error={error} />;
  if (obert) return <DetallModel model={obert} d={d} onTorna={() => setObert(null)} />;

  const supera347 = d.m347.filter((f) => f.supera);
  return (
    <>
      {d.sense_nif > 0 && (
        <p className="fiscal-avis">{t("{0} tercers amb pagaments aquest any no tenen NIF: cal per presentar els models.", d.sense_nif)}</p>
      )}
      <div className="graella-2 fiscal-models">
        {(['111', '115'] as const).map((model) => (
          <section key={model} className="targeta">
            <h2>{TITOLS[model]}</h2>
            <table className="taula taula-compacta">
              <thead>
                <tr>
                  <th>{t("Trim.")}</th>
                  <th className="num">{t("Perceptors")}</th>
                  <th className="num">{t("Base")}</th>
                  <th className="num">{t("Retencions")}</th>
                  <th>{t("Termini")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(model === '111' ? d.m111 : d.m115).map((r) => (
                  <tr key={r.trimestre}>
                    <td>{r.trimestre}T</td>
                    <td className="num">{r.perceptors}</td>
                    <td className="num">{euros(r.base_cents)}</td>
                    <td className="num">{euros(r.retencio_cents)}</td>
                    <td className="nowrap">{data(r.termini)}</td>
                    <td>
                      <EstatTrimestre r={r} onPaga={() => setPagant({ model, r })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="barra-accions">
              <button type="button" className="boto boto-secundari boto-petit" onClick={() => setObert(model)}>
                {t("Detall, impressió i CSV")}
              </button>
            </div>
          </section>
        ))}
        {(['190', '180'] as const).map((model) => {
          const files = model === '190' ? d.m190 : d.m180;
          return (
            <section key={model} className="targeta">
              <h2>{TITOLS[model]}</h2>
              <p className="petit apagat">{t("Es presenta durant el gener de {0}.", exercici + 1)}</p>
              {files.length === 0 ? (
                <p className="apagat">{t("Cap pagament amb retenció aquest any.")}</p>
              ) : (
                <p>
                  {t("{0} perceptors · base {1} · retencions {2}", files.length, euros(files.reduce((s, f) => s + f.base_cents, 0)), euros(files.reduce((s, f) => s + f.retencio_cents, 0)))}
                </p>
              )}
              <div className="barra-accions">
                <button type="button" className="boto boto-secundari boto-petit" onClick={() => setObert(model)}>
                  {t("Detall, impressió i CSV")}
                </button>
              </div>
            </section>
          );
        })}
      </div>
      <section className="targeta fiscal-347">
        <h2>{TITOLS['347']}</h2>
        <p className="petit apagat">
          {t("Informatiu: només l'han de presentar les entitats que fan activitats econòmiques. Es presenta al febrer de {0}. Inclou les despeses amb tercers (sense les que porten retenció, que ja van als models 190 i 180) i les factures emeses als clients vinculats.", exercici + 1)}
        </p>
        {supera347.length === 0 ? (
          <p className="apagat">{t("Cap tercer supera {0} aquest any.", euros(d.llindar_347_cents))}</p>
        ) : (
          <p>{t("{0} tercers superen el llindar.", supera347.length)}</p>
        )}
        <div className="barra-accions">
          <button type="button" className="boto boto-secundari boto-petit" onClick={() => setObert('347')}>
            {t("Detall, impressió i CSV")}
          </button>
        </div>
      </section>
      {pagant && (
        <PagaTrimestre
          model={pagant.model}
          exercici={exercici}
          r={pagant.r}
          onClose={() => setPagant(null)}
          onFet={() => {
            setPagant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function EstatTrimestre({ r, onPaga }: { r: ResumTrimestre; onPaga: () => void }) {
  if (r.pagament) {
    const dif = r.retencio_cents - r.pagament.import_cents;
    return (
      <>
        <span className="insignia insignia-pagada" title={t("Moviment del {0}", data(r.pagament.data))}>{t("Ingressat")}</span>
        {dif !== 0 && <div className="petit negatiu">{t("Les retencions han canviat després de l'ingrés: diferència de {0}.", euros(dif))}</div>}
      </>
    );
  }
  if (!r.retencio_cents) return <span className="apagat petit">{t("Sense retencions")}</span>;
  if (avui() <= r.fins) return <span className="apagat petit">{t("Trimestre en curs")}</span>;
  return (
    <button type="button" className="boto boto-petit" onClick={onPaga} title={t("Comptabilitza el pagament a Hisenda")}>
      {r.termini < avui() ? t("Pendent (fora de termini)") : t("Comptabilitza")}
    </button>
  );
}

function PagaTrimestre(props: { model: '111' | '115'; exercici: number; r: ResumTrimestre; onClose: () => void; onFet: () => void }) {
  const { data: comptes } = useApi<CompteExtracte[]>('/fiscal/extractes/comptes');
  const [dataPagament, setDataPagament] = useState(avui() < props.r.termini ? avui() : props.r.termini);
  const [compte, setCompte] = useState('');
  const [error, setError] = useState<string | null>(null);
  const compteTriat = compte || String(comptes?.find((c) => c.iban)?.id ?? comptes?.[0]?.id ?? '');

  async function envia(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/fiscal/models/${props.model}/pagament`, {
        exercici: props.exercici, trimestre: props.r.trimestre, data: dataPagament, compte_id: Number(compteTriat),
      });
      avisa(t("Pagament comptabilitzat a la categoria «Retencions IRPF ingressades»."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Ingrés del model {0} · {1}T {2}", props.model, props.r.trimestre, props.exercici)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {t("Es crearà un moviment de despesa de {0} (retencions del trimestre) a la categoria «Retencions IRPF ingressades».", euros(props.r.retencio_cents))}
        </p>
        <Camp etiqueta={t("Data del càrrec")}>
          <input type="date" value={dataPagament} onChange={(e) => setDataPagament(e.target.value)} required />
        </Camp>
        <Camp etiqueta={t("Compte")}>
          <select value={compteTriat} onChange={(e) => setCompte(e.target.value)} required>
            {comptes?.filter((c) => c.actiu).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Comptabilitza")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Detall imprimible i CSV ----------

function DetallModel({ model, d, onTorna }: { model: Model; d: DadesModels; onTorna: () => void }) {
  const { config } = useEntitat();
  const { data: csv } = useApi<{ csv: string }>(`/fiscal/models/${model}?exercici=${d.exercici}`);
  const [veureCsv, setVeureCsv] = useState(false);
  const textCsv = (csv?.csv ?? '').replace(/^\uFEFF/, '');

  async function copia() {
    try {
      await navigator.clipboard.writeText(textCsv);
      avisa(t("CSV copiat al porta-retalls."));
    } catch {
      setVeureCsv(true);
      avisa(t("No s'ha pogut copiar: selecciona el text i copia'l a mà."), 'error');
    }
  }

  let cos: ReactNode;
  if (model === '111' || model === '115') cos = <TaulaTrimestral model={model} files={model === '111' ? d.m111 : d.m115} />;
  else if (model === '190' || model === '180') cos = <TaulaAnual model={model} files={model === '190' ? d.m190 : d.m180} />;
  else cos = <Taula347 files={d.m347} />;

  return (
    <>
      <div className="barra-accions fiscal-barra no-imprimir">
        <button type="button" className="boto boto-secundari" onClick={onTorna}>
          {t("← Torna als models")}
        </button>
        <span className="espai" />
        {!DEMO && (
          <a className="boto boto-secundari" href={`/api/fiscal/models/${model}/csv?exercici=${d.exercici}&idioma=${idioma()}`}>
            {t("Descarrega el CSV")}
          </a>
        )}
        <button type="button" className="boto boto-secundari" onClick={copia} disabled={!csv}>
          {t("Copia el CSV")}
        </button>
        <button type="button" className="boto boto-secundari" onClick={() => setVeureCsv(!veureCsv)} disabled={!csv}>
          {veureCsv ? t("Amaga el CSV") : t("Mostra el CSV")}
        </button>
      </div>
      {veureCsv && <textarea className="fiscal-csv no-imprimir" readOnly value={textCsv} rows={10} onFocus={(e) => e.target.select()} />}
      <Imprimible titolBoto={t("Imprimeix")}>
        <h1>{TITOLS[model]}</h1>
        <p>
          {config?.nom_complet || config?.nom}
          {config?.nif && ` · ${t("NIF {0}", config.nif)}`} · {t("Exercici {0}", d.exercici)}
        </p>
        {cos}
        <p className="petit">
          {t("Document de treball per preparar la declaració a partir dels pagaments registrats. No substitueix el model oficial de l'Agència Tributària. Consulteu-ho amb la gestoria.")}
        </p>
      </Imprimible>
    </>
  );
}

function TaulaTrimestral({ model, files }: { model: '111' | '115'; files: ResumTrimestre[] }) {
  const suma = (f: (r: ResumTrimestre) => number) => files.reduce((s, r) => s + f(r), 0);
  return (
    <table className="taula taula-compacta">
      <thead>
        <tr>
          <th>{t("Període")}</th>
          <th>{t("Termini")}</th>
          {model === '111' && (
            <>
              <th className="num">{t("Treball: perceptors")}</th>
              <th className="num">{t("Treball: base")}</th>
              <th className="num">{t("Treball: retencions")}</th>
              <th className="num">{t("Activitats: perceptors")}</th>
              <th className="num">{t("Activitats: base")}</th>
              <th className="num">{t("Activitats: retencions")}</th>
            </>
          )}
          {model === '115' && (
            <>
              <th className="num">{t("Perceptors")}</th>
              <th className="num">{t("Base")}</th>
              <th className="num">{t("Retencions")}</th>
            </>
          )}
          <th className="num">{t("A ingressar")}</th>
        </tr>
      </thead>
      <tbody>
        {files.map((r) => (
          <tr key={r.trimestre}>
            <td>
              {r.trimestre}T ({data(r.des)} – {data(r.fins)})
            </td>
            <td>{data(r.termini)}</td>
            {model === '111' ? (
              <>
                <td className="num">{r.treball.perceptors}</td>
                <td className="num">{euros(r.treball.base_cents)}</td>
                <td className="num">{euros(r.treball.retencio_cents)}</td>
                <td className="num">{r.activitats.perceptors}</td>
                <td className="num">{euros(r.activitats.base_cents)}</td>
                <td className="num">{euros(r.activitats.retencio_cents)}</td>
              </>
            ) : (
              <>
                <td className="num">{r.perceptors}</td>
                <td className="num">{euros(r.base_cents)}</td>
                <td className="num">{euros(r.retencio_cents)}</td>
              </>
            )}
            <td className="num">
              <strong>{euros(r.retencio_cents)}</strong>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={model === '111' ? 8 : 5}>{t("Total de l'any")}</td>
          <td className="num">
            <strong>{euros(suma((r) => r.retencio_cents))}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function TaulaAnual({ model, files }: { model: '190' | '180'; files: ResumAnual[] }) {
  if (!files.length) return <Buit>{t("Cap pagament amb retenció aquest any.")}</Buit>;
  return (
    <table className="taula taula-compacta">
      <thead>
        <tr>
          <th>{t("NIF")}</th>
          <th>{t("Perceptor")}</th>
          <th>{t("Prov.")}</th>
          {model === '190' && <th>{t("Clau")}</th>}
          <th className="num">{t("Pagaments")}</th>
          <th className="num">{t("Base")}</th>
          <th className="num">%</th>
          <th className="num">{t("Retencions")}</th>
        </tr>
      </thead>
      <tbody>
        {files.map((r, i) => (
          <tr key={i}>
            <td className="nowrap">{r.nif ?? <span className="fiscal-falta">{t("Sense NIF")}</span>}</td>
            <td>{r.nom}</td>
            <td>{r.codi_provincia ?? '—'}</td>
            {model === '190' && <td>{r.clau ?? <span className="fiscal-falta">{t("Sense clau")}</span>}</td>}
            <td className="num">{r.pagaments}</td>
            <td className="num">{euros(r.base_cents)}</td>
            <td className="num">{r.retencio_pct}</td>
            <td className="num">{euros(r.retencio_cents)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={model === '190' ? 5 : 4}>{t("Total")}</td>
          <td className="num">{euros(files.reduce((s, r) => s + r.base_cents, 0))}</td>
          <td />
          <td className="num">{euros(files.reduce((s, r) => s + r.retencio_cents, 0))}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Taula347({ files }: { files: Fila347[] }) {
  if (!files.length) return <Buit>{t("No hi ha operacions amb tercers aquest any.")}</Buit>;
  return (
    <>
      <p className="petit">{t("Clau A: compres i despeses. Clau B: vendes i prestacions de serveis. Les files en gris no arriben al llindar i no es declaren.")}</p>
      <table className="taula taula-compacta">
        <thead>
          <tr>
            <th>{t("NIF")}</th>
            <th>{t("Tercer")}</th>
            <th>{t("Prov.")}</th>
            <th>{t("Clau")}</th>
            <th className="num">1T</th>
            <th className="num">2T</th>
            <th className="num">3T</th>
            <th className="num">4T</th>
            <th className="num">{t("Total anual")}</th>
          </tr>
        </thead>
        <tbody>
          {files.map((r) => (
            <tr key={`${r.tercer_id}-${r.clau}`} className={r.supera ? '' : 'apagat'}>
              <td className="nowrap">{r.nif ?? <span className="fiscal-falta">{t("Sense NIF")}</span>}</td>
              <td>{r.nom}</td>
              <td>{r.codi_provincia ?? (r.pais !== 'ES' ? r.pais : '—')}</td>
              <td>{r.clau}</td>
              <td className="num">{euros(r.t1_cents)}</td>
              <td className="num">{euros(r.t2_cents)}</td>
              <td className="num">{euros(r.t3_cents)}</td>
              <td className="num">{euros(r.t4_cents)}</td>
              <td className="num">
                <strong>{euros(r.total_cents)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
