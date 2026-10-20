// Calendari d'obligacions legals i fiscals de l'any (assemblea, models de l'AEAT, Registre, assegurances,
// subvencions), agrupat per mesos. Les que el programa no pot comprovar es poden marcar com a fetes.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { useEntitat } from '../entitat';
import { avui, data } from '../format';
import { locale, t } from '../i18n';
import { Carregant, avisaError } from './ui';
import '../styles/donatius.css';

interface ItemCalendari {
  clau: string;
  data: string;
  titol: string;
  descripcio: string | null;
  valors: (string | number)[];
  estat: 'fet' | 'pendent' | 'no_aplica' | 'desconegut';
  enllac: string | null;
  manual: boolean;
}

const ESTATS: Record<ItemCalendari['estat'], string> = {
  fet: t("Fet"),
  pendent: t("Pendent"),
  no_aplica: t("No cal"),
  desconegut: t("Per comprovar"),
};

const nomMes = (iso: string) => {
  const s = new Date(`${iso.slice(0, 7)}-15T12:00:00`).toLocaleDateString(locale(), { month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function CalendariObligacions() {
  const hui = avui();
  const [any, setAny] = useState(Number(hui.slice(0, 4)));
  const [amagaNoAplica, setAmagaNoAplica] = useState(true);
  const { data: items, error, reload } = useApi<ItemCalendari[]>(`/calendari?any=${any}`);
  const { pot } = useEntitat();
  const potMarcar = pot('informes');

  async function marca(i: ItemCalendari, fet: boolean) {
    try {
      await api.post('/calendari/marca', { any, clau: i.clau, fet });
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  const visibles = (items ?? []).filter((i) => !amagaNoAplica || i.estat !== 'no_aplica');
  const mesos = [...new Set(visibles.map((i) => i.data.slice(0, 7)))];

  return (
    <section className="cal-obligacions">
      <div className="cal-cap">
        <button className="boto-icona" onClick={() => setAny(any - 1)} aria-label={t("Any anterior")}>
          ‹
        </button>
        <strong>{t("Obligacions de {0}", any)}</strong>
        <button className="boto-icona" onClick={() => setAny(any + 1)} aria-label={t("Any següent")}>
          ›
        </button>
        <span className="espai" />
        <label className="casella petit">
          <input type="checkbox" checked={amagaNoAplica} onChange={(e) => setAmagaNoAplica(e.target.checked)} />
          {t("Amaga les que no calen")}
        </label>
      </div>
      {!items ? (
        <Carregant error={error} />
      ) : visibles.length === 0 ? (
        <p className="apagat petit">{t("No hi ha obligacions pendents per a aquest any.")}</p>
      ) : (
        mesos.map((mes) => (
          <div key={mes} className="cal-mes">
            <h4>{nomMes(mes)}</h4>
            <ul>
              {visibles
                .filter((i) => i.data.startsWith(mes))
                .map((i) => {
                  const vencut = i.estat === 'pendent' && i.data < hui;
                  const titol = t(i.titol, ...i.valors);
                  return (
                    <li key={i.clau} className={`cal-item cal-${i.estat} ${vencut ? 'cal-vencut' : ''}`}>
                      <span className="cal-data">{data(i.data).slice(0, 5)}</span>
                      <div className="cal-text">
                        {i.enllac ? <Link to={i.enllac}>{titol}</Link> : titol}
                        {i.descripcio && <span className="apagat petit">{t(i.descripcio, ...i.valors)}</span>}
                      </div>
                      <span className={`insignia cal-estat-${i.estat}`}>{vencut ? t("Vençut") : ESTATS[i.estat]}</span>
                      {i.manual && potMarcar && i.estat !== 'no_aplica' && (
                        <label className="casella petit cal-marca" title={t("Marca-ho com a fet")}>
                          <input type="checkbox" checked={i.estat === 'fet'} onChange={(e) => marca(i, e.target.checked)} />
                          <span className="cal-marca-text">{t("Fet")}</span>
                        </label>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))
      )}
      <p className="apagat petit">{t("Terminis generals per a una associació; comproveu-los amb la gestoria.")}</p>
    </section>
  );
}
