// Pestanya «Extractes bancaris»: importació d'extractes i conciliació de les línies amb els moviments.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { TIPUS_MOVIMENT, data, euros } from '../../format';
import { t } from '../../i18n';
import { formataIban } from '../../../shared/iban';
import { ImportaExtracte } from './ImportaExtracte';
import { ESTATS_LINIA } from './tipus';
import type { Categoria, CompteExtracte, EstatLinia, LiniaExtracte, Suggeriment } from './tipus';
import '../../styles/fiscal.css';

export function Extractes() {
  const { data: comptes, error, reload: recarregaComptes } = useApi<CompteExtracte[]>('/fiscal/extractes/comptes');
  const [triat, setTriat] = useState<number | null>(null);
  const [estat, setEstat] = useState<EstatLinia | ''>('pendent');
  const [important, setImportant] = useState(false);
  const [versio, setVersio] = useState(0);

  if (!comptes) return <Carregant error={error} />;
  const actius = comptes.filter((c) => c.actiu || c.total);
  const compte = actius.find((c) => c.id === triat) ?? actius.find((c) => c.iban && c.total) ?? actius.find((c) => c.total) ?? actius.find((c) => c.iban) ?? actius[0];
  if (!compte) return <Buit>{t("No hi ha cap compte. Creeu-ne un a Moviments.")}</Buit>;

  return (
    <>
      <div className="barra-accions fiscal-barra">
        <Camp etiqueta={t("Compte")}>
          <select value={compte.id} onChange={(e) => setTriat(Number(e.target.value))}>
            {actius.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
                {c.pendents ? ` (${t("{0} pendents", c.pendents)})` : ''}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Línies")}>
          <select value={estat} onChange={(e) => setEstat(e.target.value as EstatLinia | '')}>
            <option value="pendent">{t("Pendents de conciliar")}</option>
            <option value="conciliat">{t("Conciliades")}</option>
            <option value="ignorat">{t("Ignorades")}</option>
            <option value="">{t("Totes")}</option>
          </select>
        </Camp>
        <span className="espai" />
        <button type="button" className="boto" onClick={() => setImportant(true)}>
          {t("Importa un extracte")}
        </button>
      </div>
      <ResumCompte compte={compte} />
      <Linies key={`${compte.id}-${estat}-${versio}`} compteId={compte.id} estat={estat} onCanvi={recarregaComptes} />
      {important && (
        <ImportaExtracte
          compte={compte}
          onClose={() => setImportant(false)}
          onFet={() => {
            setImportant(false);
            recarregaComptes();
            setTriat(compte.id);
            setVersio((v) => v + 1); // torna a carregar les línies
          }}
        />
      )}
    </>
  );
}

function ResumCompte({ compte }: { compte: CompteExtracte }) {
  const dif = compte.saldo_extracte_cents !== null && compte.saldo_aplicacio_cents !== null ? compte.saldo_extracte_cents - compte.saldo_aplicacio_cents : null;
  return (
    <section className="xifres xifres-petites">
      <div className="xifra">
        <span className="xifra-etiqueta">{t("Línies importades")}</span>
        <span className="xifra-valor">{compte.total}</span>
        <span className="xifra-nota">{compte.iban ? formataIban(compte.iban) : t("Compte sense IBAN")}</span>
      </div>
      <div className="xifra">
        <span className="xifra-etiqueta">{t("Pendents de conciliar")}</span>
        <span className={`xifra-valor ${compte.pendents ? 'negatiu' : 'positiu'}`}>{compte.pendents}</span>
        <span className="xifra-nota">{t("{0} conciliades", compte.conciliades)}</span>
      </div>
      <div className="xifra">
        <span className="xifra-etiqueta">{compte.ultima_data ? t("Saldo del banc a {0}", data(compte.ultima_data)) : t("Saldo del banc")}</span>
        <span className="xifra-valor">{compte.saldo_extracte_cents !== null ? euros(compte.saldo_extracte_cents) : '—'}</span>
        <span className="xifra-nota">{t("segons l'últim extracte")}</span>
      </div>
      <div className="xifra">
        <span className="xifra-etiqueta">{t("Saldo a l'aplicació")}</span>
        <span className="xifra-valor">{compte.saldo_aplicacio_cents !== null ? euros(compte.saldo_aplicacio_cents) : '—'}</span>
        <span className={`xifra-nota ${dif ? 'negatiu' : ''}`}>
          {dif === null ? t("sense saldo a l'extracte") : dif === 0 ? t("quadra amb el banc") : t("diferència: {0}", euros(dif))}
        </span>
      </div>
    </section>
  );
}

function Linies({ compteId, estat, onCanvi }: { compteId: number; estat: EstatLinia | ''; onCanvi: () => void }) {
  const { data: linies, error, reload } = useApi<LiniaExtracte[]>(`/fiscal/extractes/linies?compte_id=${compteId}${estat ? `&estat=${estat}` : ''}`);
  const [conciliant, setConciliant] = useState<LiniaExtracte | null>(null);
  const canvi = () => {
    reload();
    onCanvi();
  };

  async function accio(l: LiniaExtracte, que: 'desfes' | 'ignora') {
    try {
      await api.post(`/fiscal/extractes/linies/${l.id}/${que}`);
      canvi();
    } catch (e) {
      avisaError(e);
    }
  }

  async function elimina(l: LiniaExtracte) {
    if (!(await confirma(t("Eliminar la línia «{0}» de l'extracte? Si torneu a importar el fitxer, hi tornarà a ser.", l.concepte)))) return;
    try {
      await api.del(`/fiscal/extractes/linies/${l.id}`);
      canvi();
    } catch (e) {
      avisaError(e);
    }
  }

  if (!linies) return <Carregant error={error} />;
  if (!linies.length)
    return <Buit>{estat === 'pendent' ? t("No hi ha cap línia pendent de conciliar. Importeu un extracte del banc per començar.") : t("No hi ha cap línia.")}</Buit>;

  return (
    <>
      <div className="taula-contenidor">
        <table className="taula taula-compacta fiscal-linies">
          <thead>
            <tr>
              <th>{t("Data")}</th>
              <th>{t("Concepte del banc")}</th>
              <th className="num">{t("Import")}</th>
              <th className="num">{t("Saldo")}</th>
              <th>{t("Estat")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linies.map((l) => (
              <tr key={l.id}>
                <td className="nowrap">{data(l.data)}</td>
                <td>
                  {l.concepte}
                  {l.referencia && <div className="petit apagat">{t("Ref. {0}", l.referencia)}</div>}
                  {l.moviment_id && (
                    <div className="petit apagat">
                      ↔ {data(l.moviment_data)} · {l.moviment_concepte}
                      {l.moviment_import_cents !== null && Math.abs(l.import_cents) !== l.moviment_import_cents && (
                        <span className="negatiu"> ({t("import a l'aplicació: {0}", euros(l.moviment_import_cents))})</span>
                      )}
                    </div>
                  )}
                </td>
                <td className={`num nowrap ${l.import_cents < 0 ? 'negatiu' : 'positiu'}`}>{euros(l.import_cents)}</td>
                <td className="num nowrap">{l.saldo_cents !== null ? euros(l.saldo_cents) : '—'}</td>
                <td>
                  <span className={`insignia fiscal-estat-${l.estat}`}>{ESTATS_LINIA[l.estat]}</span>
                  {l.estat === 'pendent' && l.suggeriments > 0 && <div className="petit positiu">{t("{0} coincidències", l.suggeriments)}</div>}
                </td>
                <td className="nowrap fiscal-accions">
                  {l.estat === 'pendent' ? (
                    <>
                      <button type="button" className="boto boto-petit" onClick={() => setConciliant(l)}>
                        {t("Concilia")}
                      </button>
                      <button type="button" className="boto boto-secundari boto-petit" onClick={() => accio(l, 'ignora')}>
                        {t("Ignora")}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="boto boto-secundari boto-petit" onClick={() => accio(l, 'desfes')}>
                      {t("Desfés")}
                    </button>
                  )}
                  {l.estat !== 'conciliat' && (
                    <button type="button" className="boto-icona" onClick={() => elimina(l)} aria-label={t("Elimina la línia")} title={t("Elimina la línia")}>
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {conciliant && (
        <Concilia
          linia={conciliant}
          onClose={() => setConciliant(null)}
          onFet={() => {
            setConciliant(null);
            canvi();
          }}
        />
      )}
    </>
  );
}

function Concilia(props: { linia: LiniaExtracte; onClose: () => void; onFet: () => void }) {
  const l = props.linia;
  const [amplia, setAmplia] = useState(false);
  const { data: suggeriments, error } = useApi<Suggeriment[]>(`/fiscal/extractes/linies/${l.id}/suggeriments${amplia ? '?amplia=1' : ''}`);
  const { data: categories } = useApi<Categoria[]>('/fiscal/categories');
  const tipus = l.import_cents > 0 ? 'ingres' : 'despesa';
  const [categoria, setCategoria] = useState('');
  const [concepte, setConcepte] = useState(l.concepte);
  const [errorCrea, setErrorCrea] = useState<string | null>(null);

  async function vincula(m: Suggeriment) {
    try {
      await api.post(`/fiscal/extractes/linies/${l.id}/vincula`, { moviment_id: m.id });
      avisa(t("Línia conciliada."));
      props.onFet();
    } catch (e) {
      avisaError(e);
    }
  }

  async function crea(e: FormEvent) {
    e.preventDefault();
    setErrorCrea(null);
    try {
      await api.post(`/fiscal/extractes/linies/${l.id}/crea`, { categoria_id: categoria ? Number(categoria) : null, concepte });
      avisa(t("Moviment creat i línia conciliada."));
      props.onFet();
    } catch (err) {
      // P. ex. «Exercici tancat…» (disparadors de la base de dades).
      setErrorCrea(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Concilia la línia de l'extracte")} onClose={props.onClose} ample>
      <div className="formulari-modal">
        <p className="camp-ample fiscal-linia-triada">
          <span>{data(l.data)}</span>
          <strong>{l.concepte}</strong>
          <span className={l.import_cents < 0 ? 'negatiu' : 'positiu'}>{euros(l.import_cents)}</span>
        </p>

        <h3 className="camp-ample">{amplia ? t("Moviments del compte (±15 dies, qualsevol import)") : t("Moviments amb el mateix import (±5 dies)")}</h3>
        {!suggeriments ? (
          <div className="camp-ample">
            <Carregant error={error} />
          </div>
        ) : suggeriments.length === 0 ? (
          <p className="camp-ample apagat">{t("No hi ha cap moviment que hi coincideixi.")}</p>
        ) : (
          <div className="taula-contenidor camp-ample">
            <table className="taula taula-compacta">
              <tbody>
                {suggeriments.map((m) => (
                  <tr key={m.id}>
                    <td className="nowrap">
                      {data(m.data)}
                      {m.dies > 0 && <div className="petit apagat">{t("{0} dies", m.dies)}</div>}
                    </td>
                    <td>
                      {m.concepte}
                      <div className="petit apagat">
                        {TIPUS_MOVIMENT[m.tipus]}
                        {m.categoria_nom ? ` · ${m.categoria_nom}` : ''}
                      </div>
                    </td>
                    <td className={`num nowrap ${m.import_cents !== Math.abs(l.import_cents) ? 'negatiu' : ''}`}>{euros(m.import_cents)}</td>
                    <td>
                      <button type="button" className="boto boto-petit" onClick={() => vincula(m)}>
                        {t("Vincula")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!amplia && (
          <p className="camp-ample">
            <button type="button" className="boto boto-secundari boto-petit" onClick={() => setAmplia(true)}>
              {t("Mostra més moviments")}
            </button>
          </p>
        )}

        <form className="camp-ample fiscal-crea" onSubmit={crea}>
          <h3>{tipus === 'ingres' ? t("O bé crea un ingrés nou") : t("O bé crea una despesa nova")}</h3>
          <div className="fiscal-crea-camps">
            <Camp etiqueta={t("Categoria")}>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
                <option value="">{t("— Tria —")}</option>
                {categories
                  ?.filter((c) => c.tipus === tipus)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
              </select>
            </Camp>
            <Camp etiqueta={t("Concepte")}>
              <input value={concepte} onChange={(e) => setConcepte(e.target.value)} required />
            </Camp>
          </div>
          {errorCrea && <p className="error">{errorCrea}</p>}
          <div className="formulari-peu">
            <span className="espai" />
            <button type="button" className="boto boto-secundari" onClick={props.onClose}>
              {t("Tanca")}
            </button>
            <button className="boto">{t("Crea el moviment ({0})", euros(Math.abs(l.import_cents)))}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
