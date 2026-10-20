// «Llibre registre de socis» (art. 14 LO 1/2002): tots els socis que hi ha hagut mai, amb els
// períodes d'alta i baixa. Es pot treure tal com estava en una data concreta.
import { useState } from 'react';
import { useApi } from '../../api';
import { Camp, Carregant, Modal } from '../ui';
import { Imprimible } from '../Rgpd';
import { useEntitat } from '../../entitat';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { MOTIUS_BAIXA } from './tipus';
import type { Periode } from './tipus';

interface FilaLlibre {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  dni: string | null;
  categoria_nom: string | null;
  anonimitzat: number;
  periodes: Omit<Periode, 'id' | 'soci_id'>[];
}

export function LlibreRegistre({ onClose }: { onClose: () => void }) {
  const { config } = useEntitat();
  const [aData, setAData] = useState('');
  const { data: llibre, error } = useApi<{ a_data: string | null; generat: string; socis: FilaLlibre[] }>(
    `/socis/llibre-registre${aData ? `?a_data=${aData}` : ''}`,
  );
  const motius = MOTIUS_BAIXA();
  const ref = aData || avui();
  const actius = llibre?.socis.filter((s) => s.periodes.some((p) => !p.data_baixa || p.data_baixa > ref)).length ?? 0;

  return (
    <Modal titol={t("Llibre registre de socis")} onClose={onClose} ample>
      <div className="formulari-modal">
        <Camp etiqueta={t("A data de")} ajuda={t("Deixa-ho en blanc per a la situació actual.")}>
          <input type="date" value={aData} max={avui()} onChange={(e) => setAData(e.target.value)} />
        </Camp>
        <div className="camp-ample">
          {!llibre ? (
            <Carregant error={error} />
          ) : (
            <Imprimible titolBoto={t("Imprimeix el llibre registre")}>
              <header className="document-cap">
                <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
                {(config?.nif || config?.num_registre) && (
                  <p className="apagat petit">
                    {config?.nif && t("NIF {0}", config.nif)}
                    {config?.nif && config?.num_registre && ' · '}
                    {config?.num_registre && t("Núm. de registre {0}", config.num_registre)}
                  </p>
                )}
                <h2>{t("Llibre registre de socis")}</h2>
                <p className="apagat petit">
                  {llibre.a_data ? t("Situació a {0}", data(llibre.a_data)) : t("Situació a {0}", data(llibre.generat))} ·{' '}
                  {t("{0} persones inscrites, {1} sòcies en aquesta data", llibre.socis.length, actius)}
                </p>
              </header>
              {llibre.socis.length === 0 ? (
                <p className="apagat">{t("No hi ha cap soci inscrit en aquesta data.")}</p>
              ) : (
                <table className="taula taula-compacta llibre-registre">
                  <thead>
                    <tr>
                      <th className="num">{t("Núm.")}</th>
                      <th>{t("Nom i llinatges")}</th>
                      <th>DNI / NIE</th>
                      <th>{t("Categoria")}</th>
                      <th>{t("Alta")}</th>
                      <th>{t("Baixa")}</th>
                      <th>{t("Motiu de la baixa")}</th>
                    </tr>
                  </thead>
                  {llibre.socis.map((s) => (
                    <tbody key={s.id} className="llibre-soci">
                      {s.periodes.map((p, i) => (
                        <tr key={i}>
                          {i === 0 && (
                            <>
                              <td className="num" rowSpan={s.periodes.length}>{s.num_soci}</td>
                              <td rowSpan={s.periodes.length}>
                                {s.anonimitzat ? <em>{t("Persona anonimitzada")}</em> : `${s.nom} ${s.llinatges}`.trim()}
                              </td>
                              <td rowSpan={s.periodes.length}>{s.dni ?? ''}</td>
                              <td rowSpan={s.periodes.length}>{s.categoria_nom ?? ''}</td>
                            </>
                          )}
                          <td className="nowrap">
                            {data(p.data_alta)}
                            {p.acord && <div className="apagat petit">{t("Acord: {0}", p.acord)}</div>}
                          </td>
                          <td className="nowrap">{data(p.data_baixa)}</td>
                          <td>
                            {p.motiu_tipus && motius[p.motiu_tipus]}
                            {p.motiu && p.motiu !== motius[p.motiu_tipus ?? 'altres'] && <span className="apagat"> · {p.motiu}</span>}
                            {p.acord_baixa && <div className="apagat petit">{t("Acord: {0}", p.acord_baixa)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              )}
              <p className="petit apagat">
                {t("Llibre registre de socis segons l'article 14 de la Llei orgànica 1/2002, reguladora del dret d'associació. Generat el {0}.", data(llibre.generat))}
              </p>
              <div className="signatures">
                <div>
                  <span>{t("El secretari / La secretària")}</span>
                </div>
                <div>
                  <span>{t("Vist i plau, el president / la presidenta")}</span>
                </div>
              </div>
            </Imprimible>
          )}
        </div>
      </div>
    </Modal>
  );
}
