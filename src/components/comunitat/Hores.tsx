// Pestanya «Hores»: entrada ràpida d'hores (diverses persones alhora), totals anuals per persona i per
// activitat i valoració econòmica de l'aportació en espècie (per a la memòria i les subvencions).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui, data, euros } from '../../format';
import { idioma, t } from '../../i18n';
import { DEMO } from '../../mode';
import { Imprimible } from '../Rgpd';
import { Buit, Camp, Carregant, avisa, avisaError, confirma, useExercici } from '../ui';
import { hores } from './comuns';
import { ResumHoresDocument } from './Impresos';
import { nomVoluntari } from './tipus';
import type { ActivitatBreu, ConfigComunitat, Hora, ResumVoluntariat, Voluntari } from './tipus';

export function Hores({ cfg }: { cfg: ConfigComunitat | null }) {
  const { config, pot } = useEntitat();
  const [exercici] = useExercici();
  const { data: resum, error, reload: recarregaResum } = useApi<ResumVoluntariat>(`/comunitat/voluntariat/resum?exercici=${exercici}`);
  const { data: registres, reload: recarregaHores } = useApi<Hora[]>(`/comunitat/hores?exercici=${exercici}`);
  const [imprimint, setImprimint] = useState(false);
  const [totes, setTotes] = useState(false);
  const recarrega = () => {
    recarregaResum();
    recarregaHores();
  };

  if (imprimint && resum)
    return (
      <>
        <div className="barra-accions com-barra no-imprimir">
          <button className="boto boto-secundari boto-petit" onClick={() => setImprimint(false)}>
            {t("← Tornar a les hores")}
          </button>
        </div>
        <Imprimible titolBoto={t("Imprimeix el resum")}>
          <ResumHoresDocument r={resum} config={config} cfg={cfg} />
        </Imprimible>
      </>
    );

  async function esborra(h: Hora) {
    if (!(await confirma(t("Vols esborrar les {0} hores de {1} del {2}?", hores(h.hores), nomVoluntari(h), data(h.data))))) return;
    try {
      await api.del(`/comunitat/hores/${h.id}`);
      recarrega();
    } catch (e) {
      avisaError(e);
    }
  }

  const llista = registres ?? [];
  return (
    <>
      {pot('socis') && <EntradaRapida onFet={recarrega} />}

      {!resum ? (
        <Carregant error={error} />
      ) : (
        <>
          <section className="xifres xifres-petites">
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Hores {0}", exercici)}</span>
              <span className="xifra-valor">{hores(resum.hores_totals)}</span>
              <span className="xifra-nota">{t("{0} persones hi han participat", resum.persones_amb_hores)}</span>
            </div>
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Valoració en espècie")}</span>
              <span className="xifra-valor">{euros(resum.valor_estimat_cents)}</span>
              <span className="xifra-nota">{t("a {0} l'hora", euros(resum.valor_hora_cents))}</span>
            </div>
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Persones voluntàries actives")}</span>
              <span className="xifra-valor">{resum.voluntaris_actius}</span>
              <span className="xifra-nota">{t("{0} no sòcies · +{1} altes · −{2} baixes", resum.voluntaris_no_socis, resum.altes, resum.baixes)}</span>
            </div>
          </section>

          <div className="barra-accions">
            <button className="boto boto-secundari boto-petit" onClick={() => setImprimint(true)}>
              {t("Resum per imprimir")}
            </button>
            {!DEMO && (
              <a className="boto boto-secundari boto-petit" href={`/api/comunitat/hores/export?exercici=${exercici}&idioma=${idioma()}`}>
                {t("Descarrega CSV")}
              </a>
            )}
          </div>

          {resum.per_persona.length === 0 ? (
            <Buit>{t("Encara no hi ha hores registrades el {0}.", exercici)}</Buit>
          ) : (
            <div className="graella-2">
              <section className="targeta">
                <h3>{t("Per persona")}</h3>
                <table className="taula taula-compacta">
                  <thead>
                    <tr>
                      <th>{t("Persona")}</th>
                      <th className="num">{t("Dies")}</th>
                      <th className="num">{t("Hores")}</th>
                      <th className="num opcional">{t("Valoració")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resum.per_persona.map((p) => (
                      <tr key={p.voluntari_id}>
                        <td>
                          {nomVoluntari(p)}
                          {!p.soci && <span className="petit apagat"> · {t("no sòcia")}</span>}
                        </td>
                        <td className="num">{p.dies}</td>
                        <td className="num">{hores(p.hores)}</td>
                        <td className="num opcional">{euros(p.valor_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="targeta">
                <h3>{t("Per activitat")}</h3>
                <table className="taula taula-compacta">
                  <thead>
                    <tr>
                      <th>{t("Activitat")}</th>
                      <th className="num">{t("Persones")}</th>
                      <th className="num">{t("Hores")}</th>
                      <th className="num opcional">{t("Valoració")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resum.per_activitat.map((a) => (
                      <tr key={a.activitat_id ?? 0}>
                        <td>
                          {a.nom ?? <span className="apagat">{t("Sense activitat (suport a l'entitat)")}</span>}
                          {a.data_inici && <span className="petit apagat"> · {data(a.data_inici)}</span>}
                        </td>
                        <td className="num">{a.persones}</td>
                        <td className="num">{hores(a.hores)}</td>
                        <td className="num opcional">{euros(a.valor_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </>
      )}

      {llista.length > 0 && (
        <section className="targeta">
          <h3>{t("Registres d'hores")}</h3>
          <div className="taula-contenidor">
            <table className="taula taula-compacta">
              <thead>
                <tr>
                  <th>{t("Data")}</th>
                  <th>{t("Persona")}</th>
                  <th>{t("Activitat o tasca")}</th>
                  <th className="num">{t("Hores")}</th>
                  {pot('socis') && <th />}
                </tr>
              </thead>
              <tbody>
                {(totes ? llista : llista.slice(0, 15)).map((h) => (
                  <tr key={h.id}>
                    <td className="nowrap">{data(h.data)}</td>
                    <td>{nomVoluntari(h)}</td>
                    <td>
                      {h.activitat ?? ''}
                      {h.activitat && h.tasca ? ' · ' : ''}
                      {h.tasca && <span className="apagat">{h.tasca}</span>}
                    </td>
                    <td className="num">{hores(h.hores)}</td>
                    {pot('socis') && (
                      <td className="num">
                        <button className="boto-icona" onClick={() => esborra(h)} aria-label={t("Esborra")} title={t("Esborra")}>
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {llista.length > 15 && !totes && (
            <button className="boto boto-secundari boto-petit" onClick={() => setTotes(true)}>
              {t("Mostra'ls tots ({0})", llista.length)}
            </button>
          )}
        </section>
      )}
    </>
  );
}

/** Entrada ràpida: una activitat (o tasca), una data, unes hores i les persones que hi han participat. */
function EntradaRapida({ onFet }: { onFet: () => void }) {
  const { data: voluntaris } = useApi<Voluntari[]>('/comunitat/voluntaris');
  const { data: activitats } = useApi<ActivitatBreu[]>('/comunitat/activitats');
  const [f, setF] = useState({ data: avui(), activitat_id: '', hores: '2', tasca: '' });
  const [triats, setTriats] = useState<number[]>([]);
  const [desant, setDesant] = useState(false);

  function triaActivitat(id: string) {
    const a = activitats?.find((x) => String(x.id) === id);
    // En triar una activitat passada, la data per defecte és la de l'activitat.
    setF({ ...f, activitat_id: id, data: a && a.data_inici <= avui() ? a.data_inici : f.data });
  }

  async function envia(e: FormEvent) {
    e.preventDefault();
    setDesant(true);
    try {
      const r = await api.post<{ ids: number[] }>('/comunitat/hores', { ...f, voluntari_ids: triats });
      avisa(t("S'han registrat les hores de {0} persones.", r.ids.length));
      setTriats([]);
      setF({ ...f, tasca: '' });
      onFet();
    } catch (err) {
      avisaError(err);
    } finally {
      setDesant(false);
    }
  }

  const commuta = (id: number) => setTriats((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <form className="formulari targeta com-entrada" onSubmit={envia}>
      <h3 className="camp-ample">{t("Registra hores")}</h3>
      <Camp etiqueta={t("Activitat")}>
        <select value={f.activitat_id} onChange={(e) => triaActivitat(e.target.value)}>
          <option value="">{t("— Cap (tasca de suport a l'entitat) —")}</option>
          {activitats?.map((a) => (
            <option key={a.id} value={a.id}>
              {data(a.data_inici)} · {a.nom}
            </option>
          ))}
        </select>
      </Camp>
      <Camp etiqueta={t("Data")}>
        <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required />
      </Camp>
      <Camp etiqueta={t("Hores per persona")}>
        <input type="number" min={0.25} max={24} step={0.25} value={f.hores} onChange={(e) => setF({ ...f, hores: e.target.value })} required />
      </Camp>
      <Camp etiqueta={t("Tasca")}>
        <input value={f.tasca} onChange={(e) => setF({ ...f, tasca: e.target.value })} placeholder={t("P. ex.: muntatge, acollida, monitoratge")} />
      </Camp>
      <Camp etiqueta={t("Persones ({0} triades)", triats.length)} ample grup>
        {!voluntaris ? (
          <Carregant />
        ) : voluntaris.length === 0 ? (
          <span className="apagat">{t("No hi ha persones voluntàries actives.")}</span>
        ) : (
          <div className="com-tria-persones">
            {voluntaris.map((v) => (
              <label key={v.id} className={`com-persona ${triats.includes(v.id) ? 'actiu' : ''}`}>
                <input type="checkbox" checked={triats.includes(v.id)} onChange={() => commuta(v.id)} />
                {nomVoluntari(v)}
              </label>
            ))}
          </div>
        )}
      </Camp>
      <div className="formulari-peu camp-ample">
        <span className="espai" />
        <button className="boto" disabled={!triats.length || desant}>
          {t("Registra les hores")}
        </button>
      </div>
    </form>
  );
}
