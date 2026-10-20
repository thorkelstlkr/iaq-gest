// Pestanya «Model 182»: resum anual per donant de la declaració informativa de donatius (es presenta al gener).
import { useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { data, euros } from '../../format';
import { idioma, t } from '../../i18n';
import { DEMO } from '../../mode';
import { Imprimible } from '../Rgpd';
import { Buit, Carregant } from '../ui';
import { ExplicacioRegim, VisorCsv, aCsv, eurosCsv } from './comuns';
import type { ConfigDonatius } from './comuns';

interface Fila182 {
  clau_donant: string;
  nif: string | null;
  nom: string;
  naturalesa: 'F' | 'J';
  codi_provincia: string | null;
  clau: 'A';
  total_cents: number;
  donacions: number;
  en_especie: boolean;
  recurrent: boolean;
  percentatge_250: number | null;
  percentatge_resta: number;
  deduccio_cents: number;
  import_anterior_cents: number;
  import_anterior2_cents: number;
  declarable: boolean;
  motius: string[];
}

interface Model182 {
  exercici: number;
  regim: 'si' | 'no';
  termini: string;
  entitat: { nom: string; nif: string };
  donants: Fila182[];
  revocades: number;
  totals: { donants: number; declarables: number; sense_nif: number; import_cents: number; deduccio_cents: number };
}

const percentatge = (f: Fila182) => (f.percentatge_250 !== null ? `${f.percentatge_250} % / ${f.percentatge_resta} %` : `${f.percentatge_resta} %`);

export function Model182({ exercici, config }: { exercici: number; config: ConfigDonatius }) {
  const { data: m, error } = useApi<Model182>(`/donatius/model182?exercici=${exercici}`);
  const { pot } = useEntitat();
  const acollida = config.regim_49_2002 === 'si';
  if (!m) return <Carregant error={error} />;

  const csv = aCsv(
    [t("NIF"), t("Nom o raó social"), t("Codi de província"), t("Clau"), t("Naturalesa (F/J)"), t("Percentatge de deducció"), t("Import (€)"), t("En espècie"), t("Recurrència"), t("Import any anterior (€)"), t("Import fa dos anys (€)"), t("Declarable")],
    m.donants.map((f) => [
      f.nif, f.nom, f.codi_provincia, f.clau, f.naturalesa,
      f.percentatge_250 !== null ? `${f.percentatge_250}/${f.percentatge_resta}` : f.percentatge_resta,
      eurosCsv(f.total_cents), f.en_especie ? 'X' : '', f.recurrent ? '1' : '', eurosCsv(f.import_anterior_cents), eurosCsv(f.import_anterior2_cents),
      f.declarable ? 'X' : '',
    ]),
  );

  return (
    <>
      <ExplicacioRegim acollida={acollida} compacta />
      <p className="apagat petit no-imprimir">
        {t("El model 182 de {0} es presenta entre l'1 de gener i el {1} a la seu electrònica de l'Agència Tributària (o el presenta la gestoria). Aquest resum us ajuda a omplir-lo: no el presenta el programa.", exercici, data(m.termini))}
      </p>
      {m.donants.length === 0 ? (
        <Buit>{t("No hi ha donacions el {0}.", exercici)}</Buit>
      ) : (
        <>
          <div className="barra-accions no-imprimir">
            {!DEMO && pot('economia') && (
              <a className="boto boto-secundari boto-petit" href={`/api/donatius/model182.csv?exercici=${exercici}&idioma=${idioma()}`}>
                {t("Descarrega el CSV")}
              </a>
            )}
            <VisorCsv csv={csv} />
          </div>
          <Imprimible titolBoto={t("Imprimeix el resum")}>
            <header className="document-cap">
              <p className="document-entitat">{m.entitat.nom}</p>
              {m.entitat.nif && <p className="apagat petit">{t("NIF {0}", m.entitat.nif)}</p>}
              <h2>{t("Model 182: resum de donatius de {0}", exercici)}</h2>
            </header>
            {!acollida && <p className="don-avis-rebut">{t("Només informatiu: l'entitat no està acollida al règim de la Llei 49/2002.")}</p>}
            <div className="taula-contenidor">
              <table className="taula taula-compacta">
                <thead>
                  <tr>
                    <th>{t("NIF")}</th>
                    <th>{t("Nom o raó social")}</th>
                    <th title={t("Codi de província")}>{t("Prov.")}</th>
                    <th title={t("Clau A: donatius i aportacions (art. 17 Llei 49/2002)")}>{t("Clau")}</th>
                    <th title={t("F: persona física · J: persona jurídica")}>{t("F/J")}</th>
                    <th>{t("% deducció")}</th>
                    <th className="num">{t("Import")}</th>
                    <th>{t("Espècie")}</th>
                    <th>{t("Recurrent")}</th>
                    <th className="num">{t("Deducció estimada")}</th>
                  </tr>
                </thead>
                <tbody>
                  {m.donants.map((f) => (
                    <tr key={f.clau_donant} className={f.declarable ? '' : 'don-no-declarable'}>
                      <td className="nowrap">{f.nif ?? '—'}</td>
                      <td>
                        {f.nom}
                        {f.motius.map((mo) => (
                          <div key={mo} className="error petit">
                            {t(mo)}
                          </div>
                        ))}
                      </td>
                      <td>{f.codi_provincia ?? '—'}</td>
                      <td>{f.clau}</td>
                      <td>{f.naturalesa}</td>
                      <td className="nowrap">{percentatge(f)}</td>
                      <td className="num nowrap">{euros(f.total_cents)}</td>
                      <td>{f.en_especie ? t("Sí") : ''}</td>
                      <td title={`${exercici - 2}: ${euros(f.import_anterior2_cents)} · ${exercici - 1}: ${euros(f.import_anterior_cents)}`}>
                        {f.recurrent ? t("Sí") : t("No")}
                      </td>
                      <td className="num nowrap">{euros(f.deduccio_cents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={6}>{t("Total declarable ({0} donants)", m.totals.declarables)}</th>
                    <th className="num">{euros(m.totals.import_cents)}</th>
                    <th colSpan={2} />
                    <th className="num">{euros(m.totals.deduccio_cents)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
            <ul className="apagat petit don-notes">
              <li>{t("Persones físiques: 80 % dels primers 250 € i 40 % de la resta (45 % si és recurrent). Persones jurídiques: 40 % (50 % si és recurrent). Percentatges vigents des de 2024.")}</li>
              <li>{t("Recurrent: ha donat a l'entitat els dos anys anteriors, i cada any un import igual o superior a l'anterior.")}</li>
              <li>{t("La deducció és una estimació: no té en compte els límits sobre la base liquidable ni les deduccions autonòmiques.")}</li>
              {m.totals.sense_nif > 0 && <li>{t("{0} donants sense NIF no es poden declarar: demaneu-los el NIF.", m.totals.sense_nif)}</li>}
              {m.revocades > 0 && <li>{t("{0} donacions revocades no s'hi inclouen.", m.revocades)}</li>}
            </ul>
          </Imprimible>
        </>
      )}
    </>
  );
}
