import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, EstatQuota, Modal, avisa, avisaError, useExercici, confirma } from '../components/ui';
import { avui, centsAText, data, euros, textACents } from '../format';
import type { Compte, Quota } from '../../shared/types';
import { t } from '../i18n';
import { METODES } from '../components/tresoreria/tipus';
import type { Metode, QuotaTresoreria } from '../components/tresoreria/tipus';
import { Rebuts } from '../components/tresoreria/Rebuts';

export default function Quotes() {
  const [exercici] = useExercici();
  const [filtre, setFiltre] = useState('');
  const { data: quotes, error, reload: recarrega } = useApi<QuotaTresoreria[]>(`/quotes?exercici=${exercici}`);
  const { data: comptes } = useApi<Compte[]>('/comptabilitat/comptes');
  const [cobrant, setCobrant] = useState<QuotaTresoreria[] | null>(null);
  const [editant, setEditant] = useState<Quota | null>(null);
  const [rebuts, setRebuts] = useState<QuotaTresoreria[] | null>(null);
  const [triades, setTriades] = useState<Set<number>>(new Set());
  const reload = () => {
    setTriades(new Set());
    recarrega();
  };

  async function genera() {
    try {
      const r = await api.post<{ creades: number }>('/quotes/generar', { exercici });
      avisa(r.creades ? t("S'han generat {0} quotes.", r.creades) : t("Tots els socis actius ja tenen la quota generada."));
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  async function accio(fn: () => Promise<unknown>, missatge: string) {
    try {
      await fn();
      avisa(missatge);
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  const visibles = quotes?.filter((q) => !filtre || q.estat === filtre) ?? [];
  const seleccio = visibles.filter((q) => triades.has(q.id));
  const pendentsTriades = seleccio.filter((q) => q.estat === 'pendent' && !q.en_remesa);
  const pagadesTriades = seleccio.filter((q) => q.estat === 'pagada');
  const totes = visibles.length > 0 && seleccio.length === visibles.length;
  const commuta = (id: number) =>
    setTriades((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const suma = (estat: string) =>
    (quotes ?? []).filter((q) => q.estat === estat).reduce((s, q) => s + q.import_cents, 0);

  return (
    <>
      <Capcalera titol={t("Quotes {0}", exercici)} subtitol={t("Quotes anuals dels socis")}>
        <button className="boto" onClick={genera}>
          {t("Genera les quotes de")} {exercici}
        </button>
      </Capcalera>

      {quotes && quotes.length > 0 && (
        <section className="xifres xifres-petites">
          <div className="xifra">
            <span className="xifra-etiqueta">{t("Previst")}</span>
            <span className="xifra-valor">{euros(suma('pendent') + suma('pagada'))}</span>
          </div>
          <div className="xifra">
            <span className="xifra-etiqueta">{t("Cobrat")}</span>
            <span className="xifra-valor positiu">{euros(suma('pagada'))}</span>
          </div>
          <div className="xifra">
            <span className="xifra-etiqueta">{t("Pendent")}</span>
            <span className="xifra-valor negatiu">{euros(suma('pendent'))}</span>
          </div>
          <div className="xifra">
            <span className="xifra-etiqueta">{t("Exemptes")}</span>
            <span className="xifra-valor">{quotes.filter((q) => q.estat === 'exempta').length}</span>
          </div>
        </section>
      )}

      <div className="filtres">
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label={t("Estat")}>
          <option value="">{t("Tots els estats")}</option>
          <option value="pendent">{t("Pendents")}</option>
          <option value="pagada">{t("Pagades")}</option>
          <option value="exempta">{t("Exemptes")}</option>
        </select>
        {seleccio.length > 0 && (
          <>
            <span className="apagat">{t("{0} seleccionades", seleccio.length)}</span>
            <button className="boto" disabled={!pendentsTriades.length} onClick={() => setCobrant(pendentsTriades)}>
              {t("Cobra les seleccionades ({0})", pendentsTriades.length)}
            </button>
            <button className="boto boto-secundari" disabled={!pagadesTriades.length} onClick={() => setRebuts(pagadesTriades)}>
              {t("Rebuts ({0})", pagadesTriades.length)}
            </button>
          </>
        )}
      </div>

      {!quotes ? (
        <Carregant error={error} />
      ) : quotes.length === 0 ? (
        <Buit>
          {t("No hi ha quotes per a")} {exercici}{t(". Prem «Genera les quotes» per crear-les a partir dels socis actius i el seu tipus de quota.")}
        </Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula">
            <thead>
              <tr>
                <th className="casella-taula">
                  <input
                    type="checkbox"
                    checked={totes}
                    onChange={() => setTriades(totes ? new Set() : new Set(visibles.map((q) => q.id)))}
                    aria-label={t("Selecciona-les totes")}
                  />
                </th>
                <th className="num">{t("Núm.")}</th>
                <th>{t("Soci")}</th>
                <th className="num">{t("Import")}</th>
                <th>{t("Estat")}</th>
                <th>{t("Data de pagament")}</th>
                <th>{t("Forma de pagament")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((q) => (
                <tr key={q.id}>
                  <td className="casella-taula">
                    <input
                      type="checkbox"
                      checked={triades.has(q.id)}
                      onChange={() => commuta(q.id)}
                      aria-label={t("Selecciona la quota de {0}", q.nom_soci)}
                    />
                  </td>
                  <td className="num">{q.num_soci}</td>
                  <td>
                    <Link to={`/socis/${q.soci_id}`}>{q.nom_soci}</Link>
                  </td>
                  <td className="num">{euros(q.import_cents)}</td>
                  <td>
                    <EstatQuota estat={q.estat} />
                  </td>
                  <td>{data(q.data_pagament)}</td>
                  <td>
                    {q.metode ? (
                      METODES[q.metode]
                    ) : q.en_remesa ? (
                      <span className="insignia insignia-pendent">{t("En remesa")}</span>
                    ) : (
                      <span className="apagat">{q.metode_preferit ? METODES[q.metode_preferit] : ''}</span>
                    )}
                  </td>
                  <td className="accions-fila">
                    {q.estat === 'pendent' && !q.en_remesa && (
                      <button className="boto boto-petit" onClick={() => setCobrant([q])}>
                        {t("Cobra")}
                      </button>
                    )}
                    {q.estat === 'pagada' && (
                      <button className="boto boto-petit boto-secundari" onClick={() => setRebuts([q])}>
                        {t("Rebut")}
                      </button>
                    )}
                    {q.estat === 'pagada' ? (
                      <button
                        className="boto boto-petit boto-secundari"
                        onClick={async () =>
                          (await confirma(t("Anul·lar el cobrament? S’eliminarà el moviment d’ingrés associat."))) &&
                          accio(() => api.post(`/quotes/${q.id}/anullar-cobrament`), t("Cobrament anul·lat."))
                        }
                      >
                        {t("Anul·la cobrament")}
                      </button>
                    ) : (
                      <button className="boto boto-petit boto-secundari" onClick={() => setEditant(q)}>
                        {t("Edita")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cobrant && comptes && (
        <CobraQuotes
          quotes={cobrant}
          comptes={comptes.filter((c) => c.actiu)}
          onClose={() => setCobrant(null)}
          onFet={() => {
            setCobrant(null);
            reload();
          }}
        />
      )}
      {rebuts && <Rebuts quotes={rebuts} onClose={() => setRebuts(null)} />}
      {editant && (
        <EditaQuota
          quota={editant}
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

function CobraQuotes(props: { quotes: QuotaTresoreria[]; comptes: Compte[]; onClose: () => void; onFet: () => void }) {
  const una = props.quotes.length === 1 ? props.quotes[0] : null;
  const preferit = una?.metode_preferit && una.metode_preferit !== 'domiciliacio' ? una.metode_preferit : 'efectiu';
  const [dataPag, setDataPag] = useState(avui());
  const [metode, setMetode] = useState<Metode>(preferit);
  const [compte, setCompte] = useState(String(props.comptes[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const total = props.quotes.reduce((s, q) => s + q.import_cents, 0);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (una) {
        await api.post(`/quotes/${una.id}/cobrar`, { data: dataPag, compte_id: compte, metode });
        avisa(t("Quota cobrada i ingrés registrat."));
      } else {
        const r = await api.post<{ cobrades: number }>('/quotes/cobrar-lot', {
          ids: props.quotes.map((q) => q.id),
          data: dataPag,
          compte_id: compte,
          metode,
        });
        avisa(t("{0} quotes cobrades i ingressos registrats.", r.cobrades));
      }
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={una ? t("Cobra la quota de {0}", una.nom_soci) : t("Cobra {0} quotes", props.quotes.length)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {una ? t("Import:") : t("Import total:")} <strong>{euros(total)}</strong>
          {una
            ? t(". Es crearà automàticament un ingrés a la categoria «Quotes de socis».")
            : t(". Es crearà un ingrés per a cada quota a la categoria «Quotes de socis».")}
        </p>
        <Camp etiqueta={t("Data de cobrament")}>
          <input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} required />
        </Camp>
        <Camp etiqueta={t("Forma de pagament")}>
          <select value={metode} onChange={(e) => setMetode(e.target.value as Metode)}>
            {(Object.keys(METODES) as Metode[]).map((m) => (
              <option key={m} value={m}>
                {METODES[m]}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Compte")}>
          <select value={compte} onChange={(e) => setCompte(e.target.value)} required>
            {props.comptes.map((c) => (
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
          <button className="boto">{t("Registra el cobrament")}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditaQuota(props: { quota: Quota; onClose: () => void; onFet: () => void }) {
  const [imp, setImp] = useState(centsAText(props.quota.import_cents));
  const [estat, setEstat] = useState(props.quota.estat);
  const [error, setError] = useState<string | null>(null);

  async function envia(e: FormEvent) {
    e.preventDefault();
    const c = textACents(imp);
    if (c === null || c < 0) return setError(t("L'import no és vàlid."));
    try {
      await api.put(`/quotes/${props.quota.id}`, { import_cents: c, estat });
      avisa(t("Quota actualitzada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta quota?")))) return;
    try {
      await api.del(`/quotes/${props.quota.id}`);
      avisa(t("Quota eliminada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Quota {0} · {1}", props.quota.exercici, props.quota.nom_soci)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Import (€)")}>
          <input inputMode="decimal" value={imp} onChange={(e) => setImp(e.target.value)} required />
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select value={estat} onChange={(e) => setEstat(e.target.value as Quota['estat'])}>
            <option value="pendent">{t("Pendent")}</option>
            <option value="exempta">{t("Exempta")}</option>
          </select>
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <button type="button" className="boto boto-perill" onClick={elimina}>
            {t("Elimina")}
          </button>
          <span className="espai" />
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}
