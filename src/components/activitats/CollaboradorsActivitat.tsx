// Entitats que col·laboren en una activitat (Ajuntament, escoles, altres entitats…).
// Les entitats es gestionen a Col·laboradors; aquí només s'hi vinculen amb el seu paper.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../../api';
import { Buit, Carregant, avisa, avisaError } from '../ui';
import { t } from '../../i18n';
import { ROLS_ACTIVITAT, TIPUS_ENTITAT } from '../comunitat/tipus';
import type { RolActivitat, TipusEntitat } from '../comunitat/tipus';

interface Vincle {
  entitat_id: number;
  nom?: string;
  tipus?: TipusEntitat;
  rol: RolActivitat;
  notes: string | null;
}

export function CollaboradorsActivitat({ activitatId }: { activitatId: number }) {
  const { data: actuals, error } = useApi<Vincle[]>(`/comunitat/activitats/${activitatId}/entitats`);
  const { data: entitats } = useApi<{ id: number; nom: string; tipus: TipusEntitat; actiu: number }[]>('/comunitat/entitats');
  const [llista, setLlista] = useState<Vincle[] | null>(null);
  const [nova, setNova] = useState('');
  const [desant, setDesant] = useState(false);

  useEffect(() => {
    if (actuals) setLlista(actuals);
  }, [actuals]);

  if (!llista) return <Carregant error={error} />;
  const disponibles = (entitats ?? []).filter((e) => e.actiu && !llista.some((v) => v.entitat_id === e.id));

  async function desa(nou: Vincle[]) {
    setDesant(true);
    try {
      const r = await api.put<Vincle[]>(`/comunitat/activitats/${activitatId}/entitats`, nou.map(({ entitat_id, rol, notes }) => ({ entitat_id, rol, notes })));
      setLlista(r);
      avisa(t("Col·laboracions desades."));
    } catch (e) {
      avisaError(e);
    } finally {
      setDesant(false);
    }
  }

  return (
    <div className="collaboradors-activitat">
      {llista.length === 0 ? (
        <Buit>{t("Cap entitat col·labora en aquesta activitat.")}</Buit>
      ) : (
        <table className="taula">
          <thead>
            <tr>
              <th>{t("Entitat")}</th>
              <th>{t("Paper")}</th>
              <th>{t("Notes")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {llista.map((v, i) => (
              <tr key={v.entitat_id}>
                <td>
                  {v.nom}
                  {v.tipus && <div className="apagat petit">{TIPUS_ENTITAT[v.tipus]}</div>}
                </td>
                <td>
                  <select
                    value={v.rol}
                    aria-label={t("Paper")}
                    onChange={(e) => setLlista(llista.map((x, j) => (j === i ? { ...x, rol: e.target.value as RolActivitat } : x)))}
                  >
                    {Object.entries(ROLS_ACTIVITAT).map(([k, text]) => (
                      <option key={k} value={k}>
                        {text}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={v.notes ?? ''}
                    aria-label={t("Notes")}
                    onChange={(e) => setLlista(llista.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))}
                  />
                </td>
                <td>
                  <button type="button" className="boto boto-petit boto-secundari" onClick={() => setLlista(llista.filter((_, j) => j !== i))}>
                    {t("Treu")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="accions" style={{ marginTop: '0.8rem' }}>
        <select value={nova} aria-label={t("Afegeix una entitat")} onChange={(e) => setNova(e.target.value)}>
          <option value="">{t("— Afegeix una entitat —")}</option>
          {disponibles.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="boto boto-secundari"
          disabled={!nova}
          onClick={() => {
            const e = disponibles.find((x) => x.id === Number(nova));
            if (e) setLlista([...llista, { entitat_id: e.id, nom: e.nom, tipus: e.tipus, rol: 'collaborador', notes: null }]);
            setNova('');
          }}
        >
          {t("Afegeix")}
        </button>
        <button type="button" className="boto" disabled={desant} onClick={() => desa(llista)}>
          {t("Desa")}
        </button>
        <Link to="/collaboradors" className="petit">
          {t("Gestiona les entitats →")}
        </Link>
      </div>
    </div>
  );
}
