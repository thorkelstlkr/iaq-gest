// Pestanya «Despeses imputades»: despeses del període d'execució imputades (totalment o en part) a la subvenció.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { centsAText, data, euros, textACents } from '../../format';
import { t } from '../../i18n';
import type { Activitat, Categoria } from '../../../shared/types';
import { Clip, JustificantsMoviment } from './Justificants';
import { PER_JUSTIFICAR } from './tipus';
import type { Candidat, Imputacio, Subvencio } from './tipus';

export function Despeses({ s, editable, onCanvi }: { s: Subvencio; editable: boolean; onCanvi: () => void }) {
  const { data: llista, error, reload } = useApi<Imputacio[]>(`/subvencions/${s.id}/imputacions`);
  const [triant, setTriant] = useState(false);
  const [editant, setEditant] = useState<{ moviment: Candidat | Imputacio; imputacio: Imputacio | null } | null>(null);
  const [adjunts, setAdjunts] = useState<Imputacio | null>(null);
  const pot = editable && PER_JUSTIFICAR.includes(s.estat);
  const recarrega = () => {
    reload();
    onCanvi();
  };

  async function treu(i: Imputacio) {
    if (!(await confirma(t("Treure «{0}» de la subvenció? El moviment no s'elimina.", i.concepte)))) return;
    try {
      await api.del(`/subvencions/${s.id}/imputacions/${i.id}`);
      avisa(t("Despesa desimputada."));
      recarrega();
    } catch (e) {
      avisaError(e);
    }
  }

  const imputat = llista?.reduce((x, i) => x + i.import_cents, 0) ?? 0;
  const concedit = s.import_concedit_cents ?? 0;

  return (
    <>
      <div className="subv-barra">
        <p className="apagat">
          {t("Imputat {0} de {1} concedits.", euros(imputat), euros(concedit))}
          {concedit > imputat && ` ${t("Falten {0}.", euros(concedit - imputat))}`}
        </p>
        <span className="espai" />
        {pot && (
          <button className="boto" onClick={() => setTriant(true)}>
            {t("+ Imputa despeses")}
          </button>
        )}
      </div>
      {editable && !PER_JUSTIFICAR.includes(s.estat) && (
        <p className="apagat petit">{t("Només es poden imputar despeses quan la subvenció està concedida o cobrada.")}</p>
      )}
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("Encara no hi ha despeses imputades a aquesta subvenció.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Concepte / creditor")}</th>
                <th>{t("Categoria")}</th>
                <th>{t("Justificant")}</th>
                <th className="num">{t("Import")}</th>
                <th className="num">{t("Imputat")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {llista.map((i) => (
                <tr key={i.id}>
                  <td className="nowrap">{data(i.data)}</td>
                  <td>
                    {i.concepte}
                    {i.creditor && <div className="apagat petit">{i.creditor}</div>}
                  </td>
                  <td>{i.categoria_nom}</td>
                  <td className="nowrap">
                    <Clip n={i.n_justificants} onClick={() => setAdjunts(i)} />
                    {i.justificant}
                    {!i.n_justificants && <span className="subv-falta">{t("sense justificant")}</span>}
                  </td>
                  <td className="num nowrap">{euros(i.moviment_cents)}</td>
                  <td className="num nowrap">
                    <strong>{euros(i.import_cents)}</strong>
                    {i.import_cents < i.moviment_cents && <div className="apagat petit">{Math.round((i.import_cents / i.moviment_cents) * 100)} %</div>}
                  </td>
                  <td className="accions-fila">
                    {pot && (
                      <>
                        <button className="boto boto-petit boto-secundari" onClick={() => setEditant({ moviment: i, imputacio: i })}>
                          {t("Edita")}
                        </button>
                        <button className="boto boto-petit boto-perill" onClick={() => treu(i)}>
                          {t("Treu")}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>{t("{0} despeses", llista.length)}</td>
                <td className="num nowrap">{euros(llista.reduce((x, i) => x + i.moviment_cents, 0))}</td>
                <td className="num nowrap">{euros(imputat)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {triant && (
        <TriaDespeses
          s={s}
          onClose={() => setTriant(false)}
          onTria={(c) => {
            setTriant(false);
            setEditant({ moviment: c, imputacio: null });
          }}
        />
      )}
      {editant && (
        <FormImputacio
          s={s}
          moviment={editant.moviment}
          imputacio={editant.imputacio}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            recarrega();
          }}
        />
      )}
      {adjunts && (
        <JustificantsMoviment
          moviment={{ id: adjunts.moviment_id, data: adjunts.data, concepte: adjunts.concepte, import_cents: adjunts.moviment_cents }}
          nomesLectura={!editable}
          onClose={() => setAdjunts(null)}
          onCanvi={recarrega}
        />
      )}
    </>
  );
}

/** Llista de despeses que es poden imputar (per defecte, del període d'execució). */
function TriaDespeses({ s, onClose, onTria }: { s: Subvencio; onClose: () => void; onTria: (c: Candidat) => void }) {
  const [filtres, setFiltres] = useState({ categoria_id: '', activitat_id: s.activitat_id ? String(s.activitat_id) : '', q: '', tots: '' });
  const qs = new URLSearchParams({ tipus: 'despesa', ...filtres }).toString();
  const { data: candidats, error } = useApi<Candidat[]>(`/subvencions/${s.id}/candidats?${qs}`);
  const { data: categories } = useApi<Categoria[]>('/comptabilitat/categories');
  const { data: activitats } = useApi<Activitat[]>('/activitats?exercici=totes');
  const setF = (k: keyof typeof filtres) => (e: { target: { value: string } }) => setFiltres({ ...filtres, [k]: e.target.value });

  return (
    <Modal titol={t("Imputa despeses a la subvenció")} onClose={onClose} ample>
      <div className="formulari-modal">
        <div className="filtres camp-ample">
          <input type="search" placeholder={t("Cerca concepte, justificant…")} value={filtres.q} onChange={setF('q')} />
          <select value={filtres.categoria_id} onChange={setF('categoria_id')} aria-label={t("Categoria")}>
            <option value="">{t("Totes les categories")}</option>
            {categories
              ?.filter((c) => c.tipus === 'despesa')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
          </select>
          <select value={filtres.activitat_id} onChange={setF('activitat_id')} aria-label={t("Activitat")}>
            <option value="">{t("Totes les activitats")}</option>
            {activitats?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom} ({data(a.data_inici)})
              </option>
            ))}
          </select>
          <label className="casella">
            <input type="checkbox" checked={filtres.tots === '1'} onChange={(e) => setFiltres({ ...filtres, tots: e.target.checked ? '1' : '' })} />
            {t("També fora del període d'execució")}
          </label>
        </div>
        <div className="camp-ample subv-llista-candidats">
          {!candidats ? (
            <Carregant error={error} />
          ) : candidats.length === 0 ? (
            <Buit>{t("No hi ha despeses amb aquests criteris.")}</Buit>
          ) : (
            <table className="taula taula-compacta taula-clicable">
              <thead>
                <tr>
                  <th>{t("Data")}</th>
                  <th>{t("Concepte")}</th>
                  <th>{t("Categoria")}</th>
                  <th className="num">{t("Import")}</th>
                  <th className="num">{t("Disponible")}</th>
                </tr>
              </thead>
              <tbody>
                {candidats.map((c) => {
                  const disponible = c.import_cents - c.imputat_cents;
                  return (
                    <tr key={c.id} onClick={() => disponible > 0 && onTria(c)} className={disponible > 0 ? '' : 'subv-esgotat'}>
                      <td className="nowrap">{data(c.data)}</td>
                      <td>
                        {c.concepte}
                        <div className="apagat petit">{[c.justificant, c.activitat_nom].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>{c.categoria_nom}</td>
                      <td className="num nowrap">{euros(c.import_cents)}</td>
                      <td className="num nowrap">{disponible > 0 ? euros(disponible) : t("Imputada")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="formulari-peu camp-ample">
          <span className="apagat petit">{t("Tria una despesa per indicar quina part s'imputa a la subvenció.")}</span>
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Tanca")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Import imputat, creditor i data d'emissió d'una despesa. */
export function FormImputacio(props: {
  s: { id: number };
  moviment: { id: number; data: string; concepte: string; import_cents: number; imputat_cents?: number; imputat_altres_cents?: number };
  imputacio: Imputacio | null;
  onClose: () => void;
  onFet: () => void;
}) {
  const { moviment: m, imputacio: i } = props;
  const altres = i ? i.imputat_altres_cents : (m.imputat_cents ?? 0);
  const disponible = m.import_cents - altres;
  const [f, setF] = useState({
    import: centsAText(i ? i.import_cents : disponible),
    creditor: i?.creditor ?? '',
    data_emissio: i?.data_emissio ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    const import_cents = textACents(f.import);
    if (!import_cents || import_cents <= 0) return setError(t("L'import ha de ser més gran que zero."));
    if (import_cents > disponible) return setError(t("Com a màxim es poden imputar {0}.", euros(disponible)));
    const cos = { moviment_id: m.id, import_cents, creditor: f.creditor, data_emissio: f.data_emissio };
    try {
      if (i) await api.put(`/subvencions/${props.s.id}/imputacions/${i.id}`, cos);
      else await api.post(`/subvencions/${props.s.id}/imputacions`, cos);
      avisa(t("Despesa imputada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Imputa la despesa")} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          <strong>{m.concepte}</strong>
          <br />
          <span className="apagat">
            {data(m.data)} · {euros(m.import_cents)}
            {altres > 0 && ` · ${t("{0} ja imputats a altres subvencions", euros(altres))}`}
          </span>
        </p>
        <Camp etiqueta={t("Import imputat (€)")} ajuda={t("Màxim: {0}", euros(disponible))}>
          <input inputMode="decimal" value={f.import} onChange={set('import')} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Data d'emissió de la factura")} ajuda={t("Si és buida, la del moviment.")}>
          <input type="date" value={f.data_emissio} onChange={set('data_emissio')} />
        </Camp>
        <Camp etiqueta={t("Creditor / proveïdor")} ample ajuda={t("Si és buit, el compte justificatiu mostra el concepte del moviment.")}>
          <input value={f.creditor} onChange={set('creditor')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Imputa")}</button>
        </div>
      </form>
    </Modal>
  );
}
