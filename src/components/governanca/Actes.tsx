// Pestanya «Llibre d'actes»: actes de cada òrgan i any, i el llibre imprimible (només actes aprovades).
import { useState } from 'react';
import { useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { data } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Carregant } from '../ui';
import { ORGANS, titolReunio } from './comuns';
import type { ActaCompleta, Organ } from './comuns';
import { ActaDocument, LlibreActes } from './Impresos';

interface ActaFila {
  id: number;
  reunio_id: number;
  organ: Organ;
  any: number;
  numero: number;
  data_aprovacio: string | null;
  tancada: number;
  tipus: 'ordinaria' | 'extraordinaria';
  data_reunio: string;
  titol: string | null;
}

export function Actes() {
  const { config } = useEntitat();
  const [organ, setOrgan] = useState<Organ>('assemblea');
  const [any, setAny] = useState(String(new Date().getFullYear()));
  const [vista, setVista] = useState<'llista' | 'llibre' | number>('llista');
  const { data: actes, error } = useApi<ActaFila[]>(`/governanca/actes?organ=${organ}&any=${any}`);
  const { data: llibre } = useApi<ActaCompleta[]>(vista === 'llibre' ? `/governanca/llibre?organ=${organ}&any=${any}` : null);
  const { data: una } = useApi<ActaCompleta>(typeof vista === 'number' ? `/governanca/actes/${vista}` : null);

  const anyActual = new Date().getFullYear();
  const anys = Array.from({ length: 8 }, (_, i) => String(anyActual - i));
  const pendents = (actes ?? []).filter((a) => !a.tancada);
  // Continuïtat de la numeració: 1, 2, 3… sense salts.
  const salts = (actes ?? []).map((a) => a.numero).sort((x, y) => x - y).some((n, i) => n !== i + 1);

  return (
    <>
      <div className="filtres">
        <select aria-label={t("Òrgan")} value={organ} onChange={(e) => { setOrgan(e.target.value as Organ); setVista('llista'); }}>
          {Object.entries(ORGANS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label={t("Any")} value={any} onChange={(e) => { setAny(e.target.value); setVista('llista'); }}>
          {anys.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="espai" />
        {vista !== 'llista' ? (
          <button className="boto boto-secundari" onClick={() => setVista('llista')}>
            {t("← Llista d'actes")}
          </button>
        ) : (
          <button className="boto" onClick={() => setVista('llibre')} disabled={!actes?.some((a) => a.tancada)}>
            {t("Llibre d'actes per imprimir")}
          </button>
        )}
      </div>
      {vista === 'llista' &&
        (!actes ? (
          <Carregant error={error} />
        ) : actes.length === 0 ? (
          <Buit>{t("No hi ha actes d'aquest òrgan en aquest any.")}</Buit>
        ) : (
          <>
            {salts && <p className="gov-avis">{t("La numeració de les actes té salts: revisa-la.")}</p>}
            {pendents.length > 0 && <p className="apagat petit">{t("{0} actes pendents d'aprovar no surten al llibre.", pendents.length)}</p>}
            <div className="taula-contenidor">
              <table className="taula taula-clicable">
                <thead>
                  <tr>
                    <th>{t("Núm.")}</th>
                    <th>{t("Reunió")}</th>
                    <th>{t("Data")}</th>
                    <th>{t("Estat")}</th>
                  </tr>
                </thead>
                <tbody>
                  {actes.map((a) => (
                    <tr key={a.id} onClick={() => setVista(a.id)}>
                      <td className="nowrap">
                        {a.numero}/{a.any}
                      </td>
                      <td>{titolReunio({ organ: a.organ, tipus: a.tipus, titol: a.titol })}</td>
                      <td className="nowrap">{data(a.data_reunio)}</td>
                      <td>
                        <span className={`insignia ${a.tancada ? 'insignia-pagada' : 'insignia-pendent'}`}>
                          {a.tancada ? t("Aprovada el {0}", data(a.data_aprovacio)) : t("Esborrany")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
      {vista === 'llibre' &&
        (llibre ? (
          <Imprimible titolBoto={t("Imprimeix el llibre")}>
            <LlibreActes actes={llibre} organ={organ} any={Number(any)} config={config} />
          </Imprimible>
        ) : (
          <Carregant />
        ))}
      {typeof vista === 'number' &&
        (una ? (
          <Imprimible titolBoto={t("Imprimeix l'acta")}>
            <ActaDocument a={una} config={config} />
          </Imprimible>
        ) : (
          <Carregant />
        ))}
    </>
  );
}
