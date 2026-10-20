// Voluntariat (Llei 45/2015 i normativa balear): persones voluntàries, hores, assegurances i registre.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Camp, Capcalera, Modal, avisa } from '../components/ui';
import { useEntitat } from '../entitat';
import { centsAText, textACents } from '../format';
import { t } from '../i18n';
import { Persones } from '../components/comunitat/Persones';
import { Hores } from '../components/comunitat/Hores';
import { Assegurances } from '../components/comunitat/Assegurances';
import { Registre } from '../components/comunitat/Registre';
import type { ConfigComunitat } from '../components/comunitat/tipus';
import '../styles/comunitat.css';

const PESTANYES = [
  { id: 'persones', text: t("Persones") },
  { id: 'hores', text: t("Hores") },
  { id: 'assegurances', text: t("Assegurances") },
  { id: 'registre', text: t("Registre") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Voluntariat() {
  const { pot } = useEntitat();
  const [pestanya, setPestanya] = useState<Pestanya>('persones');
  const { data: cfg, reload } = useApi<ConfigComunitat>('/comunitat/config');
  const [configurant, setConfigurant] = useState(false);
  // Les dades personals del voluntariat només les veuen els perfils que gestionen els socis.
  const potVeure = pot('socis');
  return (
    <>
      <Capcalera titol={t("Voluntariat")} subtitol={t("Persones voluntàries, acords, assegurança i hores")}>
        {potVeure && (
          <button className="boto boto-secundari" onClick={() => setConfigurant(true)}>
            {t("Paràmetres")}
          </button>
        )}
      </Capcalera>
      {!potVeure ? (
        <div className="com-pagina">
          <Hores cfg={cfg} />
        </div>
      ) : (
        <>
          <div className="pestanyes no-imprimir" role="tablist">
            {PESTANYES.map((p) => (
              <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
                {p.text}
              </button>
            ))}
          </div>
          <div className="com-pagina">
            {pestanya === 'persones' && <Persones />}
            {pestanya === 'hores' && <Hores cfg={cfg} />}
            {pestanya === 'assegurances' && <Assegurances />}
            {pestanya === 'registre' && <Registre />}
          </div>
        </>
      )}
      {configurant && cfg && (
        <FormConfig
          cfg={cfg}
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

function FormConfig({ cfg, onClose, onFet }: { cfg: ConfigComunitat; onClose: () => void; onFet: () => void }) {
  const [f, setF] = useState({ mesos: String(cfg.vol_validesa_certificat_mesos), valor: centsAText(cfg.vol_valor_hora_cents) });
  const [error, setError] = useState<string | null>(null);

  async function envia(e: FormEvent) {
    e.preventDefault();
    const valor = textACents(f.valor);
    if (valor === null) return setError(t("El valor de l'hora no és un import vàlid."));
    try {
      await api.put('/comunitat/config', { vol_validesa_certificat_mesos: f.mesos, vol_valor_hora_cents: valor });
      avisa(t("Configuració desada."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={t("Paràmetres del voluntariat")} onClose={onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp
          etiqueta={t("Validesa del certificat de delictes sexuals (mesos)")}
          ajuda={t("Passat aquest temps des de l'expedició, el programa avisa que cal demanar-ne un de nou.")}
        >
          <input type="number" min={1} max={120} value={f.mesos} onChange={(e) => setF({ ...f, mesos: e.target.value })} required />
        </Camp>
        <Camp etiqueta={t("Valor d'una hora de voluntariat (€)")} ajuda={t("Per valorar l'aportació en espècie a la memòria i a la justificació de subvencions.")}>
          <input className="input-import" inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} required />
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
