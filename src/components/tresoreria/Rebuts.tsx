import { Modal } from '../ui';
import { Imprimible } from '../Rgpd';
import { useEntitat } from '../../entitat';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { METODES } from './tipus';
import type { QuotaTresoreria } from './tipus';
import '../../styles/tresoreria.css';

/** Número de rebut: R{exercici}-{núm. de soci}. */
export const numRebut = (q: { exercici: number; num_soci?: number }) => `R${q.exercici}-${q.num_soci ?? ''}`;

/** Rebuts imprimibles de quotes cobrades (un per pàgina en imprimir). */
export function Rebuts({ quotes, onClose }: { quotes: QuotaTresoreria[]; onClose: () => void }) {
  const { config } = useEntitat();
  const adreca = [config?.adreca, [config?.codi_postal, config?.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return (
    <Modal titol={quotes.length === 1 ? t("Rebut {0}", numRebut(quotes[0])) : t("{0} rebuts", quotes.length)} onClose={onClose} ample>
      <Imprimible titolBoto={t("Imprimeix / desa en PDF")}>
        {quotes.map((q) => (
          <section className="rebut" key={q.id}>
            <header className="rebut-cap">
              <div>
                <p className="rebut-entitat">{config?.nom_complet || config?.nom}</p>
                <p className="apagat petit">
                  {[config?.nif && t("NIF {0}", config.nif), adreca].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="rebut-num">
                <span className="apagat petit">{t("Rebut núm.")}</span>
                <strong>{numRebut(q)}</strong>
              </div>
            </header>
            <dl className="rebut-dades">
              <dt>{t("Rebut de")}</dt>
              <dd>
                {q.nom_soci} <span className="apagat">({t("soci núm. {0}", q.num_soci)})</span>
              </dd>
              <dt>{t("Concepte")}</dt>
              <dd>{t("Quota de soci de l'exercici {0}", q.exercici)}</dd>
              <dt>{t("Import")}</dt>
              <dd className="rebut-import">{euros(q.import_cents)}</dd>
              <dt>{t("Data de pagament")}</dt>
              <dd>{data(q.data_pagament)}</dd>
              <dt>{t("Forma de pagament")}</dt>
              <dd>{q.metode ? METODES[q.metode] : '—'}</dd>
            </dl>
            <p className="petit apagat">
              {t("L'entitat declara haver rebut l'import indicat en concepte de quota de soci.")}
            </p>
            <div className="rebut-signatura">
              <span>{t("El/la tresorer/a")}</span>
            </div>
          </section>
        ))}
      </Imprimible>
    </Modal>
  );
}
