import { useState } from 'react';
import { api } from '../../api';
import { useEntitat } from '../../entitat';
import { DEMO } from '../../mode';
import { t } from '../../i18n';
import { TextLlicencia } from './TextLlicencia';
import '../../styles/assistent.css';

/**
 * Instal·lacions configurades abans que l'assistent demanàs acceptar la llicència: la primera
 * vegada que hi entra un administrador, se li demana que l'accepti. La resta de perfils no ho veuen.
 */
export function AvisLlicencia() {
  const { config, usuari, recarrega } = useEntitat();
  const [enviant, setEnviant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tancat, setTancat] = useState(false);

  if (DEMO || tancat || !config || usuari?.rol !== 'admin' || config.llicencia_acceptada_el) return null;

  async function accepta() {
    if (!config || !usuari) return;
    setEnviant(true);
    setError(null);
    try {
      await api.put('/config', { nom: config.nom, llicencia_acceptada_el: new Date().toISOString(), llicencia_acceptada_per: usuari.nom });
      setTancat(true);
      recarrega();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEnviant(false);
    }
  }

  return (
    <div className="modal-fons">
      <div className="modal modal-ample avis-llicencia" role="dialog" aria-modal="true" aria-labelledby="avis-llicencia-titol">
        <header className="modal-cap">
          <h2 id="avis-llicencia-titol">{t("Llicència i exempció de responsabilitat")}</h2>
        </header>
        <div className="avis-llicencia-cos">
          <p>{t("Abans de continuar, llegeix les condicions d'ús del programa. Només cal acceptar-les una vegada per a tota l'entitat.")}</p>
          <TextLlicencia />
          {error && <p className="error">{error}</p>}
          <div className="assistent-botons">
            {error && (
              <button type="button" className="boto boto-secundari" onClick={() => setTancat(true)}>
                {t("Més tard")}
              </button>
            )}
            <span className="espai" />
            <button type="button" className="boto" onClick={accepta} disabled={enviant} autoFocus>
              {enviant ? t("Desant…") : t("Accepto")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
