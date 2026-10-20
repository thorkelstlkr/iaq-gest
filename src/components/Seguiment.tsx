import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { avisa, avisaError, confirma } from './ui';
import { avui, data, nomComplet } from '../format';
import type { Interaccio, SociLlista, Tasca, TipusInteraccio } from '../../shared/types';
import { t } from '../i18n';

// Peces de seguiment reutilitzades a la fitxa del soci i a la pàgina Seguiment.

export const TIPUS_INTERACCIO: Record<TipusInteraccio, string> = {
  trucada: t("Trucada"),
  correu: t("Correu"),
  reunio: t("Reunió"),
  missatge: t("Missatge"),
  nota: t("Nota"),
};

/** Historial de contactes d'un soci, amb el formulari per afegir-ne. */
export function Historial({ sociId }: { sociId: number }) {
  const { data: llista, reload } = useApi<Interaccio[]>(`/crm/interaccions?soci_id=${sociId}`);
  const [f, setF] = useState({ tipus: 'trucada', data: avui(), resum: '' });

  async function afegeix(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/crm/interaccions', { ...f, soci_id: sociId });
      setF({ ...f, resum: '' });
      reload();
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina(id: number) {
    if (!(await confirma(t("Eliminar aquest registre de l’historial?")))) return;
    await api.del(`/crm/interaccions/${id}`).catch(avisaError);
    reload();
  }

  return (
    <>
      <form className="afegeix-linia" onSubmit={afegeix}>
        <select id={`hist-tipus-${sociId}`} value={f.tipus} onChange={(e) => setF({ ...f, tipus: e.target.value })} aria-label={t("Tipus")}>
          {Object.entries(TIPUS_INTERACCIO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input id={`hist-data-${sociId}`} type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} aria-label={t("Data")} />
        <input
          id={`hist-resum-${sociId}`}
          value={f.resum}
          onChange={(e) => setF({ ...f, resum: e.target.value })}
          placeholder={t("Què s'ha parlat o fet…")}
          aria-label={t("Resum")}
          required
        />
        <button className="boto boto-petit">{t("Afegeix")}</button>
      </form>
      {!llista ? null : llista.length === 0 ? (
        <p className="apagat petit">{t("Encara no hi ha cap contacte registrat.")}</p>
      ) : (
        <ul className="historial">
          {llista.map((i) => (
            <li key={i.id}>
              <span className={`historial-tipus historial-${i.tipus}`}>{TIPUS_INTERACCIO[i.tipus]}</span>
              <div>
                <div>{i.resum}</div>
                <div className="apagat petit">
                  {data(i.data)}
                  {i.autor && ` · ${i.autor}`}
                </div>
              </div>
              <button type="button" className="boto-icona petit" onClick={() => elimina(i.id)} aria-label={t("Elimina")}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Llista de tasques (d'un soci o generals) amb formulari per afegir-ne. */
export function Tasques({ sociId, mostraFetes = false }: { sociId?: number; mostraFetes?: boolean }) {
  const filtre = `estat=${mostraFetes ? 'totes' : 'pendents'}${sociId ? `&soci_id=${sociId}` : ''}`;
  const { data: llista, reload } = useApi<Tasca[]>(`/crm/tasques?${filtre}`);
  const { data: socis } = useApi<SociLlista[]>(sociId ? null : '/socis?estat=actius');
  const [f, setF] = useState({ titol: '', data_limit: '', soci_id: '' });
  const ara = avui();

  async function afegeix(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/crm/tasques', { ...f, soci_id: sociId ?? f.soci_id });
      setF({ titol: '', data_limit: '', soci_id: '' });
      reload();
    } catch (err) {
      avisaError(err);
    }
  }

  async function commuta(tt: Tasca) {
    try {
      await api.put(`/crm/tasques/${tt.id}`, { ...tt, feta: !tt.feta });
      if (!tt.feta) avisa(t("Tasca feta."));
      reload();
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina(tt: Tasca) {
    if (!(await confirma(t("Eliminar la tasca «{0}»?", tt.titol)))) return;
    await api.del(`/crm/tasques/${tt.id}`).catch(avisaError);
    reload();
  }

  return (
    <>
      <form className="afegeix-linia" onSubmit={afegeix}>
        <input
          id={`tasca-titol-${sociId ?? 'g'}`}
          value={f.titol}
          onChange={(e) => setF({ ...f, titol: e.target.value })}
          placeholder={t("Nova tasca, p. ex. «Trucar per confirmar l'assistència»")}
          aria-label={t("Tasca")}
          required
        />
        <input
          id={`tasca-data-${sociId ?? 'g'}`}
          type="date"
          value={f.data_limit}
          onChange={(e) => setF({ ...f, data_limit: e.target.value })}
          aria-label={t("Data límit")}
        />
        {!sociId && (
          <select id="tasca-soci" value={f.soci_id} onChange={(e) => setF({ ...f, soci_id: e.target.value })} aria-label={t("Soci")}>
            <option value="">{t("Sense soci")}</option>
            {socis?.map((s) => (
              <option key={s.id} value={s.id}>
                {nomComplet(s)}
              </option>
            ))}
          </select>
        )}
        <button className="boto boto-petit">{t("Afegeix")}</button>
      </form>
      {!llista ? null : llista.length === 0 ? (
        <p className="apagat petit">{t("No hi ha tasques")} {mostraFetes ? '' : 'pendents'}.</p>
      ) : (
        <ul className="tasques">
          {llista.map((tt) => {
            const vencuda = !tt.feta && tt.data_limit && tt.data_limit < ara;
            return (
              <li key={tt.id} className={tt.feta ? 'feta' : ''}>
                <input type="checkbox" checked={Boolean(tt.feta)} onChange={() => commuta(tt)} aria-label={t("Marca «{0}» com a feta", tt.titol)} />
                <div>
                  <div className="tasca-titol">{tt.titol}</div>
                  <div className="apagat petit">
                    {tt.data_limit && <span className={vencuda ? 'negatiu' : ''}>{vencuda ? t("Vençuda: ") : t("Abans del ")}{data(tt.data_limit)}</span>}
                    {!sociId && tt.soci_id && (
                      <>
                        {tt.data_limit && ' · '}
                        <Link to={`/socis/${tt.soci_id}`}>{tt.soci_nom}</Link>
                      </>
                    )}
                  </div>
                </div>
                <button type="button" className="boto-icona petit" onClick={() => elimina(tt)} aria-label={t("Elimina")}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
