import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { avisa, avisaError, confirma } from '../ui';
import { avui, data, nomComplet } from '../../format';
import type { SociLlista, Tasca } from '../../../shared/types';
import { t } from '../../i18n';

/** Tasques de preparació d'una activitat (fan servir l'API general de tasques). */
export function TasquesActivitat({ activitatId, onCanvi }: { activitatId: number; onCanvi?: () => void }) {
  const { data: llista, reload } = useApi<Tasca[]>(`/crm/tasques?estat=totes&activitat_id=${activitatId}`);
  const { data: socis } = useApi<SociLlista[]>('/socis?estat=actius');
  const [f, setF] = useState({ titol: '', data_limit: '', soci_id: '' });
  const ara = avui();

  const refresca = () => {
    reload();
    onCanvi?.();
  };

  async function afegeix(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/crm/tasques', { ...f, activitat_id: activitatId });
      setF({ titol: '', data_limit: '', soci_id: '' });
      refresca();
    } catch (err) {
      avisaError(err);
    }
  }

  async function commuta(tt: Tasca) {
    try {
      await api.put(`/crm/tasques/${tt.id}`, { ...tt, feta: !tt.feta });
      if (!tt.feta) avisa(t("Tasca feta."));
      refresca();
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina(tt: Tasca) {
    if (!(await confirma(t("Eliminar la tasca «{0}»?", tt.titol)))) return;
    await api.del(`/crm/tasques/${tt.id}`).catch(avisaError);
    refresca();
  }

  const pendents = llista?.filter((x) => !x.feta).length ?? 0;

  return (
    <div className="act-panell">
      <form className="afegeix-linia" onSubmit={afegeix}>
        <input
          value={f.titol}
          onChange={(e) => setF({ ...f, titol: e.target.value })}
          placeholder={t("Nova tasca, p. ex. «Comprar el material»")}
          aria-label={t("Tasca")}
          required
        />
        <input type="date" value={f.data_limit} onChange={(e) => setF({ ...f, data_limit: e.target.value })} aria-label={t("Data límit")} />
        <select value={f.soci_id} onChange={(e) => setF({ ...f, soci_id: e.target.value })} aria-label={t("Qui se n'encarrega")}>
          <option value="">{t("Sense assignar")}</option>
          {socis?.map((s) => (
            <option key={s.id} value={s.id}>
              {nomComplet(s)}
            </option>
          ))}
        </select>
        <button className="boto boto-petit">{t("Afegeix")}</button>
      </form>
      {!llista ? null : llista.length === 0 ? (
        <p className="apagat petit">{t("Aquesta activitat encara no té tasques.")}</p>
      ) : (
        <>
          <p className="apagat petit">{t("{0} pendents de {1}", pendents, llista.length)}</p>
          <ul className="tasques">
            {llista.map((tt) => {
              const vencuda = !tt.feta && tt.data_limit && tt.data_limit < ara;
              return (
                <li key={tt.id} className={tt.feta ? 'feta' : ''}>
                  <input type="checkbox" checked={Boolean(tt.feta)} onChange={() => commuta(tt)} aria-label={t("Marca «{0}» com a feta", tt.titol)} />
                  <div>
                    <div className="tasca-titol">{tt.titol}</div>
                    <div className="apagat petit">
                      {tt.data_limit && (
                        <span className={vencuda ? 'negatiu' : ''}>
                          {vencuda ? t("Vençuda: ") : t("Abans del ")}
                          {data(tt.data_limit)}
                        </span>
                      )}
                      {tt.soci_nom && (
                        <>
                          {tt.data_limit && ' · '}
                          {tt.soci_nom}
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
        </>
      )}
    </div>
  );
}
