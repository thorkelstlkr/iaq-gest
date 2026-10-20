// Òrgans de govern: reunions, junta directiva, llibre d'actes i certificats.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Camp, Capcalera, Modal, avisa } from '../components/ui';
import { useEntitat } from '../entitat';
import { t } from '../i18n';
import { Reunions } from '../components/governanca/Reunions';
import { Junta } from '../components/governanca/Junta';
import { Actes } from '../components/governanca/Actes';
import { Certificats } from '../components/governanca/Certificats';
import type { ConfigGov } from '../components/governanca/comuns';
import '../styles/governanca.css';

const PESTANYES = [
  { id: 'reunions', text: t("Reunions") },
  { id: 'junta', text: t("Junta directiva") },
  { id: 'actes', text: t("Llibre d'actes") },
  { id: 'certificats', text: t("Certificats") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Governanca() {
  const [pestanya, setPestanya] = useState<Pestanya>('reunions');
  const { data: config, reload } = useApi<ConfigGov>('/governanca/config');
  const [configurant, setConfigurant] = useState(false);
  const { pot } = useEntitat();
  return (
    <>
      <Capcalera titol={t("Òrgans de govern")} subtitol={t("Assemblees, junta directiva, llibre d'actes i certificats")}>
        {pot('socis') && (
          <button className="boto boto-secundari" onClick={() => setConfigurant(true)}>
            {t("Requisits dels estatuts")}
          </button>
        )}
      </Capcalera>
      <div className="pestanyes no-imprimir" role="tablist">
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      <div className="gov-pagina">
        {pestanya === 'reunions' && <Reunions config={config} />}
        {pestanya === 'junta' && <Junta />}
        {pestanya === 'actes' && <Actes />}
        {pestanya === 'certificats' && <Certificats />}
      </div>
      {configurant && config && (
        <FormConfig
          config={config}
          onClose={() => setConfigurant(false)}
          onFet={() => {
            setConfigurant(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function FormConfig({ config, onClose, onFet }: { config: ConfigGov; onClose: () => void; onFet: () => void }) {
  const [f, setF] = useState({ gov_dies_convocatoria: String(config.gov_dies_convocatoria), gov_quorum_1a: String(config.gov_quorum_1a) });
  const [error, setError] = useState<string | null>(null);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put('/governanca/config', f);
      avisa(t("Configuració desada."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Requisits dels estatuts")} onClose={onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="apagat petit camp-ample">{t("Copia aquí el que diuen els estatuts de l'entitat sobre la convocatòria i la constitució de l'assemblea general.")}</p>
        <Camp etiqueta={t("Dies d'antelació de la convocatòria")} ajuda={t("Mínim entre la convocatòria i l'assemblea")}>
          <input type="number" min={0} max={90} value={f.gov_dies_convocatoria} onChange={(e) => setF({ ...f, gov_dies_convocatoria: e.target.value })} required />
        </Camp>
        <Camp etiqueta={t("Quòrum en primera convocatòria (%)")} ajuda={t("En segona convocatòria, qualsevol nombre d'assistents")}>
          <input type="number" min={1} max={100} value={f.gov_quorum_1a} onChange={(e) => setF({ ...f, gov_quorum_1a: e.target.value })} required />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}
