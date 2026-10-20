// Pestanya «Cobraments»: ingressos vinculats a la subvenció (cobrat respecte del concedit).
import { useState } from 'react';
import { api, useApi } from '../../api';
import { Buit, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { AMB_COBRAMENTS } from './tipus';
import type { Candidat, Subvencio } from './tipus';

interface Cobrament {
  id: number;
  data: string;
  concepte: string;
  import_cents: number;
  justificant: string | null;
  compte_nom: string;
}

export function Cobraments({ s, editable, onCanvi }: { s: Subvencio; editable: boolean; onCanvi: () => void }) {
  const { data: llista, error, reload } = useApi<Cobrament[]>(`/subvencions/${s.id}/cobraments`);
  const [triant, setTriant] = useState(false);
  const concedit = s.import_concedit_cents ?? 0;
  const cobrat = llista?.reduce((x, c) => x + c.import_cents, 0) ?? s.cobrat_cents;
  const percent = concedit ? Math.min(100, Math.round((cobrat / concedit) * 100)) : 0;
  const recarrega = () => {
    reload();
    onCanvi();
  };

  async function desvincula(c: Cobrament) {
    if (!(await confirma(t("Desvincular «{0}» d'aquesta subvenció? El moviment no s'elimina.", c.concepte)))) return;
    try {
      await api.del(`/subvencions/${s.id}/cobraments/${c.id}`);
      avisa(t("Cobrament desvinculat."));
      recarrega();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <div className="subv-barra">
        <div className="subv-progres" aria-label={t("Cobrat {0} de {1}", euros(cobrat), euros(concedit))}>
          <div className="barra-pista">
            <div className="barra-valor" style={{ width: `${percent}%` }} />
          </div>
          <span>
            {t("Cobrat {0} de {1}", euros(cobrat), euros(concedit))}
            {concedit > cobrat && ` · ${t("pendent {0}", euros(concedit - cobrat))}`}
          </span>
        </div>
        <span className="espai" />
        {editable && AMB_COBRAMENTS.includes(s.estat) && (
          <button className="boto boto-secundari" onClick={() => setTriant(true)}>
            {t("Vincula un ingrés")}
          </button>
        )}
      </div>
      <p className="apagat petit">{t("També pots triar la subvenció en registrar l'ingrés a Comptabilitat.")}</p>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("Encara no hi ha cap cobrament d'aquesta subvenció.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Concepte")}</th>
                <th>{t("Compte")}</th>
                <th>{t("Justificant")}</th>
                <th className="num">{t("Import")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {llista.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">{data(c.data)}</td>
                  <td>{c.concepte}</td>
                  <td>{c.compte_nom}</td>
                  <td>{c.justificant}</td>
                  <td className="num nowrap positiu">{euros(c.import_cents)}</td>
                  <td className="accions-fila">
                    {editable && (
                      <button className="boto boto-petit boto-secundari" onClick={() => desvincula(c)}>
                        {t("Desvincula")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {triant && (
        <TriaIngres
          s={s}
          onClose={() => setTriant(false)}
          onFet={() => {
            setTriant(false);
            recarrega();
          }}
        />
      )}
    </>
  );
}

function TriaIngres({ s, onClose, onFet }: { s: Subvencio; onClose: () => void; onFet: () => void }) {
  const [tots, setTots] = useState(false);
  const { data: candidats, error } = useApi<Candidat[]>(`/subvencions/${s.id}/candidats?tipus=ingres${tots ? '&tots=1' : ''}`);
  async function vincula(c: Candidat) {
    try {
      await api.post(`/subvencions/${s.id}/cobraments`, { moviment_id: c.id });
      avisa(t("Cobrament vinculat."));
      onFet();
    } catch (e) {
      avisaError(e);
    }
  }
  return (
    <Modal titol={t("Vincula un ingrés")} onClose={onClose} ample>
      <div className="formulari-modal">
        <label className="casella camp-ample">
          <input type="checkbox" checked={tots} onChange={(e) => setTots(e.target.checked)} />
          {t("Mostra els ingressos de qualsevol data")}
        </label>
        <div className="camp-ample subv-llista-candidats">
          {!candidats ? (
            <Carregant error={error} />
          ) : candidats.length === 0 ? (
            <Buit>{t("No hi ha ingressos per vincular.")}</Buit>
          ) : (
            <table className="taula taula-compacta taula-clicable">
              <thead>
                <tr>
                  <th>{t("Data")}</th>
                  <th>{t("Concepte")}</th>
                  <th>{t("Categoria")}</th>
                  <th className="num">{t("Import")}</th>
                </tr>
              </thead>
              <tbody>
                {candidats.map((c) => (
                  <tr key={c.id} onClick={() => vincula(c)}>
                    <td className="nowrap">{data(c.data)}</td>
                    <td>
                      {c.concepte}
                      {c.subvencio_id && <div className="apagat petit">{t("Ara vinculat a una altra subvenció")}</div>}
                    </td>
                    <td>{c.categoria_nom}</td>
                    <td className="num nowrap">{euros(c.import_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Tanca")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
