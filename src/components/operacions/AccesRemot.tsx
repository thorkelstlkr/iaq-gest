// Configuració → Accés remot: escoltar a la xarxa (local o Tailscale), port separat per als agents d'IA
// (el que s'exposa amb un túnel) i adreça pública https.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../../api';
import { Camp, Carregant, avisa, avisaError } from '../ui';
import { t } from '../../i18n';
import '../../styles/operacions.css';

interface Estat {
  programa_xarxa: boolean;
  host_actual: string;
  port_programa: number;
  host_per_entorn: boolean;
  reinici_necessari: boolean;
  agent_port_actiu: boolean;
  agent_port: number;
  agent_port_xarxa: boolean;
  agent_url_publica: string;
  servidor_agents: { actiu: boolean; port: number | null; host: string | null; error: string | null };
  adreces: { interficie: string; adreca: string; tipus: 'tailscale' | 'local' }[];
}

export function AccesRemot() {
  const { data, error, reload } = useApi<Estat>('/config/acces-remot');
  const [f, setF] = useState<Estat | null>(null);
  const [desant, setDesant] = useState(false);
  useEffect(() => setF(data), [data]);
  if (!f) return <Carregant error={error} />;

  async function desa(canvis: Partial<Estat>) {
    setDesant(true);
    try {
      const r = await api.put<Estat>('/config/acces-remot', canvis);
      setF(r);
      reload();
      avisa(t("Desat."));
    } catch (e) {
      avisaError(e);
    } finally {
      setDesant(false);
    }
  }

  const tailscale = f.adreces.filter((a) => a.tipus === 'tailscale');
  const locals = f.adreces.filter((a) => a.tipus === 'local');

  return (
    <div className="acces-remot">
      <section className="targeta">
        <h2>{t("Accés des d'altres equips")}</h2>
        <p className="apagat petit">
          {t("Per defecte el programa només s'obre en aquest ordinador. Si l'activeu, també s'hi podrà entrar (amb usuari i contrasenya) des d'altres equips de la mateixa xarxa o de la vostra xarxa privada Tailscale.")}
        </p>
        <label className="casella">
          <input type="checkbox" checked={f.programa_xarxa} disabled={desant || f.host_per_entorn} onChange={(e) => desa({ programa_xarxa: e.target.checked })} />
          {t("Permetre l'accés des d'altres equips de la xarxa")}
        </label>
        <p className="petit">
          <Link to="/ajuda/treballar-des-de-casa">{t("Guia pas a pas: treballar des de casa amb Tailscale →")}</Link>
        </p>
        {f.host_per_entorn && <p className="apagat petit">{t("L'adreça d'escolta la fixa la variable HOST de l'ordinador ({0}).", f.host_actual)}</p>}
        {f.reinici_necessari && <p className="avis-acces">{t("Tanca i torna a obrir el programa (Iniciar.bat) perquè el canvi tingui efecte.")}</p>}
        {(f.programa_xarxa || f.host_actual === '0.0.0.0') && (
          <>
            {tailscale.length > 0 && (
              <p>
                {t("Adreça a Tailscale (recomanada):")}{' '}
                {tailscale.map((a) => (
                  <code key={a.adreca}>http://{a.adreca}:{f.port_programa}</code>
                ))}
              </p>
            )}
            {locals.length > 0 && (
              <p className="petit">
                {t("Adreces a la xarxa local:")}{' '}
                {locals.map((a) => (
                  <code key={a.adreca} title={a.interficie}>
                    http://{a.adreca}:{f.port_programa}{' '}
                  </code>
                ))}
              </p>
            )}
            <p className="avis-acces">
              {t("A la xarxa local el trànsit no va xifrat: feu-ho només en una xarxa de confiança. Fora de casa, feu servir Tailscale (xifrat) i mai no obriu el port al router.")}
            </p>
          </>
        )}
      </section>

      <section className="targeta">
        <h2>{t("Entrada per als agents d'IA")}</h2>
        <p className="apagat petit">
          {t("Un port a part que només dona accés a l'entrada dels agents d'IA (amb la seva clau) i a l'autorització OAuth, mai al programa. És el que heu d'exposar a internet amb un túnel si voleu fer servir ChatGPT o Claude al web o al mòbil.")}
        </p>
        <label className="casella">
          <input type="checkbox" checked={f.agent_port_actiu} disabled={desant} onChange={(e) => desa({ agent_port_actiu: e.target.checked })} />
          {t("Activa l'entrada per als agents")}
        </label>
        <div className="formulari">
          <Camp etiqueta={t("Port")}>
            <input type="number" min={1024} max={65535} value={f.agent_port} onChange={(e) => setF({ ...f, agent_port: Number(e.target.value) })} onBlur={() => desa({ agent_port: f.agent_port })} />
          </Camp>
          <Camp etiqueta={t("Adreça pública (opcional)")} ajuda={t("La del túnel, p. ex. https://agents.vostraentitat.org. Si la deixeu buida, es dedueix de cada petició.")}>
            <input
              value={f.agent_url_publica}
              placeholder="https://"
              onChange={(e) => setF({ ...f, agent_url_publica: e.target.value })}
              onBlur={() => desa({ agent_url_publica: f.agent_url_publica })}
            />
          </Camp>
        </div>
        <label className="casella">
          <input type="checkbox" checked={f.agent_port_xarxa} disabled={desant} onChange={(e) => desa({ agent_port_xarxa: e.target.checked })} />
          {t("Escolta també a la xarxa (no cal per a un túnel que funcioni en aquest mateix ordinador)")}
        </label>
        {f.servidor_agents.actiu ? (
          <p>
            {t("Funcionant a")} <code>http://{f.servidor_agents.host === '0.0.0.0' ? 'localhost' : f.servidor_agents.host}:{f.servidor_agents.port}</code>
          </p>
        ) : (
          f.servidor_agents.error && <p className="negatiu">{f.servidor_agents.error}</p>
        )}
        <p className="petit">
          <Link to="/ajuda/acces-remot">{t("Com fer servir els agents des de fora: Tailscale i túnels →")}</Link>
        </p>
      </section>
    </div>
  );
}
