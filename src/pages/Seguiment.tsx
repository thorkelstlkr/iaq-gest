import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../api';
import { Capcalera } from '../components/ui';
import { TIPUS_INTERACCIO, Tasques } from '../components/Seguiment';
import { data } from '../format';
import type { Interaccio } from '../../shared/types';
import { t } from '../i18n';

export default function Seguiment() {
  const [fetes, setFetes] = useState(false);
  const { data: contactes } = useApi<Interaccio[]>('/crm/interaccions');

  return (
    <>
      <Capcalera titol={t("Seguiment")} subtitol={t("Tasques pendents i darrers contactes amb els socis")} />
      <div className="graella-2">
        <section className="targeta">
          <div className="targeta-cap">
            <h2>{t("Tasques")}</h2>
            <label className="casella petit">
              <input type="checkbox" checked={fetes} onChange={(e) => setFetes(e.target.checked)} />
              {t("Mostra també les fetes")}
            </label>
          </div>
          <Tasques mostraFetes={fetes} />
        </section>
        <section className="targeta">
          <h2>{t("Darrers contactes")}</h2>
          {!contactes ? null : contactes.length === 0 ? (
            <p className="apagat petit">
              {t("Encara no s'ha registrat cap contacte. Afegeix-los des de la fitxa de cada soci (apartat Seguiment).")}
            </p>
          ) : (
            <ul className="historial">
              {contactes.map((i) => (
                <li key={i.id}>
                  <span className={`historial-tipus historial-${i.tipus}`}>{TIPUS_INTERACCIO[i.tipus]}</span>
                  <div>
                    <div>
                      <Link to={`/socis/${i.soci_id}`}>{i.soci_nom}</Link> — {i.resum}
                    </div>
                    <div className="apagat petit">
                      {data(i.data)}
                      {i.autor && ` · ${i.autor}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
