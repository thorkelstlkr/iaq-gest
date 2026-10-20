// Pestanya «Certificats»: certificats i rebuts emesos, i certificats anuals per donant (Llei 49/2002).
import { useState } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Carregant, avisa, avisaError } from '../ui';
import { DocumentCertificat } from './Document';
import { ExplicacioRegim, TIPUS_CERT, TIPUS_PERSONA } from './comuns';
import type { CertificatDonacio, ConfigDonatius } from './comuns';

interface Donant {
  clau: string;
  nom: string;
  nif: string | null;
  tipus_persona: 'fisica' | 'juridica';
  donacions: number;
  total_cents: number;
  certificat_id: number | null;
}

export function Certificats({ exercici, config }: { exercici: number; config: ConfigDonatius }) {
  const { pot } = useEntitat();
  const acollida = config.regim_49_2002 === 'si';
  const { data: llista, error, reload } = useApi<CertificatDonacio[]>(`/donatius/certificats?exercici=${exercici}`);
  const { data: donants, reload: recarregaDonants } = useApi<Donant[]>(acollida ? `/donatius/donants?exercici=${exercici}` : null);
  const [obert, setObert] = useState<CertificatDonacio | null>(null);

  async function emetAnual(d: Donant) {
    try {
      const c = await api.post<CertificatDonacio>('/donatius/certificats', { tipus: 'anual', exercici, nif: d.nif });
      avisa(t("Certificat núm. {0}/{1} emès.", c.numero, c.any));
      reload();
      recarregaDonants();
      setObert(c);
    } catch (e) {
      avisaError(e);
    }
  }

  async function obre(id: number) {
    try {
      setObert(await api.get<CertificatDonacio>(`/donatius/certificats/${id}`));
    } catch (e) {
      avisaError(e);
    }
  }

  if (obert)
    return (
      <>
        <div className="barra-accions no-imprimir">
          <button className="boto boto-secundari boto-petit" onClick={() => setObert(null)}>
            {t("← Tots els certificats")}
          </button>
        </div>
        <Imprimible titolBoto={t("Imprimeix")}>
          <DocumentCertificat c={obert} />
        </Imprimible>
      </>
    );

  return (
    <>
      <ExplicacioRegim acollida={acollida} compacta />
      {acollida && (
        <>
          <h3 className="titol-seccio">{t("Certificats anuals de {0}", exercici)}</h3>
          <p className="apagat petit">
            {t("Un certificat per donant amb totes les donacions de l'any: és el que necessiten per a la declaració de la renda o de l'Impost de Societats.")}
          </p>
          {!donants ? (
            <Carregant />
          ) : donants.length === 0 ? (
            <Buit>{t("No hi ha donacions el {0}.", exercici)}</Buit>
          ) : (
            <div className="taula-contenidor">
              <table className="taula">
                <thead>
                  <tr>
                    <th>{t("Donant")}</th>
                    <th>{t("NIF")}</th>
                    <th className="num">{t("Donacions")}</th>
                    <th className="num">{t("Total")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {donants.map((d) => (
                    <tr key={d.clau}>
                      <td>
                        {d.nom}
                        {d.tipus_persona === 'juridica' && <span className="apagat petit"> · {TIPUS_PERSONA.juridica}</span>}
                      </td>
                      <td>{d.nif ?? <span className="insignia insignia-pendent">{t("Sense NIF")}</span>}</td>
                      <td className="num">{d.donacions}</td>
                      <td className="num">{euros(d.total_cents)}</td>
                      <td className="nowrap">
                        {d.certificat_id ? (
                          <button className="boto boto-petit boto-secundari" onClick={() => obre(d.certificat_id!)}>
                            {t("Mostra")}
                          </button>
                        ) : d.nif && pot('economia') ? (
                          <button className="boto boto-petit" onClick={() => emetAnual(d)}>
                            {t("Emet el certificat")}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <h3 className="titol-seccio">{t("Documents emesos (donacions de {0})", exercici)}</h3>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{acollida ? t("Encara no s'ha emès cap certificat.") : t("Encara no s'ha emès cap rebut. Es fan des de la pestanya «Donacions».")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Núm.")}</th>
                <th>{t("Data")}</th>
                <th>{t("Tipus")}</th>
                <th>{t("Donant")}</th>
                <th className="num">{t("Import")}</th>
                <th className="opcional">{t("Emès per")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((c) => (
                <tr key={c.id} onClick={() => setObert(c)}>
                  <td className="nowrap">
                    {c.numero}/{c.any}
                  </td>
                  <td className="nowrap">{data(c.data)}</td>
                  <td>{TIPUS_CERT[c.tipus]}</td>
                  <td>
                    {c.nom} {c.nif && <span className="apagat petit">· {c.nif}</span>}
                  </td>
                  <td className="num">{euros(c.total_cents)}</td>
                  <td className="opcional">{c.emes_per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
