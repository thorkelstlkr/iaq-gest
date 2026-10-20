import { api, useApi } from '../../api';
import { Carregant, avisaError, useExercici } from '../ui';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import type { CategoriaFiscal, InformeFiscal } from './tipus';

// Motius que torna el servidor (en català): es tradueixen aquí.
const MOTIUS: Record<string, string> = {
  'Els ingressos totals superen 75.000 €.': t("Els ingressos totals superen 75.000 €."),
  'Les rendes no exemptes superen 2.000 €.': t("Les rendes no exemptes superen 2.000 €."),
  'Hi ha rendes no exemptes que no estan sotmeses a retenció.': t("Hi ha rendes no exemptes que no estan sotmeses a retenció."),
};

export function Fiscalitat() {
  const [exercici] = useExercici();
  const { data: f, error, reload } = useApi<InformeFiscal>(`/tresoreria/fiscalitat?exercici=${exercici}`);

  if (!f || f.exercici !== exercici) return <Carregant error={error} />;

  async function canvia(c: CategoriaFiscal, canvis: Partial<CategoriaFiscal>) {
    try {
      const nou = { ...c, ...canvis };
      await api.put(`/tresoreria/fiscalitat/categories/${c.id}`, {
        renda_exempta: nou.renda_exempta,
        subjecta_retencio: nou.renda_exempta ? 0 : nou.subjecta_retencio,
      });
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <section className="xifres xifres-petites">
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Ingressos totals")}</span>
          <span className="xifra-valor">{euros(f.total_cents)}</span>
          <span className="xifra-nota">{t("límit: {0}", euros(75_000_00))}</span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Rendes exemptes")}</span>
          <span className="xifra-valor positiu">{euros(f.exempts_cents)}</span>
          {f.devolucions_cents > 0 && <span className="xifra-nota">{t("descomptats {0} de rebuts retornats", euros(f.devolucions_cents))}</span>}
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Rendes no exemptes")}</span>
          <span className="xifra-valor">{euros(f.no_exempts_cents)}</span>
          <span className="xifra-nota">{t("límit: {0}", euros(2_000_00))}</span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("No exemptes sense retenció")}</span>
          <span className={`xifra-valor ${f.no_exempts_sense_retencio_cents ? 'negatiu' : ''}`}>{euros(f.no_exempts_sense_retencio_cents)}</span>
        </div>
      </section>

      <div className={`targeta veredicte ${f.obligat ? 'veredicte-obligat' : 'veredicte-exempt'}`}>
        <h2>
          {f.obligat
            ? t("Cal presentar l'Impost de Societats (model 200) de {0}", exercici)
            : t("Sembla que no cal presentar el model 200 de {0}", exercici)}
        </h2>
        {f.obligat ? (
          <>
            <ul>
              {f.motius.map((m) => (
                <li key={m}>{MOTIUS[m] ?? m}</li>
              ))}
            </ul>
            <p>
              {t("Termini de presentació: fins al {0} (25 dies naturals després dels sis mesos posteriors al tancament de l'exercici).", data(f.termini))}
            </p>
          </>
        ) : (
          <p>
            {t("Es compleixen les tres condicions de l'art. 124.3 de la Llei 27/2014: ingressos totals fins a 75.000 €, rendes no exemptes fins a 2.000 € i totes sotmeses a retenció.")}
          </p>
        )}
        <p className="petit apagat">
          {t("Càlcul orientatiu per a entitats parcialment exemptes (art. 9.3 i 110 a 112 LIS) a partir dels moviments comptabilitzats i de la classificació de les categories. Consulteu-ho amb la gestoria abans de presentar o deixar de presentar cap declaració.")}
        </p>
      </div>

      <h2 className="titol-seccio">{t("Classificació fiscal de les categories d'ingrés")}</h2>
      <p className="apagat">
        {t("Són rendes exemptes les quotes de socis, les subvencions i les donacions que no són contraprestació d'una activitat econòmica. Les vendes, les inscripcions a activitats, els patrocinis i els interessos no ho són.")}
      </p>
      <div className="taula-contenidor">
        <table className="taula">
          <thead>
            <tr>
              <th>{t("Categoria")}</th>
              <th>{t("Renda exempta")}</th>
              <th>{t("Subjecta a retenció")}</th>
              <th className="num">{t("Ingressos {0}", exercici)}</th>
            </tr>
          </thead>
          <tbody>
            {f.categories
              .filter((c) => c.actiu || c.import_cents)
              .map((c) => (
                <tr key={c.id}>
                  <td>{c.nom}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(c.renda_exempta)}
                      onChange={(e) => canvia(c, { renda_exempta: e.target.checked ? 1 : 0 })}
                      aria-label={t("{0}: renda exempta", c.nom)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(c.subjecta_retencio)}
                      disabled={Boolean(c.renda_exempta)}
                      onChange={(e) => canvia(c, { subjecta_retencio: e.target.checked ? 1 : 0 })}
                      aria-label={t("{0}: subjecta a retenció", c.nom)}
                    />
                  </td>
                  <td className="num">{euros(c.import_cents)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
