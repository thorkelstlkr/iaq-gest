// Donatius: donacions rebudes, certificats per als donants, resum del model 182 i règim fiscal (Llei 49/2002).
import { useState } from 'react';
import { useApi } from '../api';
import { Capcalera, Carregant, useExercici } from '../components/ui';
import { t } from '../i18n';
import { Donacions } from '../components/donatius/Donacions';
import { Certificats } from '../components/donatius/Certificats';
import { Model182 } from '../components/donatius/Model182';
import { Configuracio } from '../components/donatius/Configuracio';
import type { ConfigDonatius } from '../components/donatius/comuns';
import '../styles/donatius.css';

const PESTANYES = [
  { id: 'donacions', text: t("Donacions") },
  { id: 'certificats', text: t("Certificats") },
  { id: 'model182', text: t("Model 182") },
  { id: 'configuracio', text: t("Configuració") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Donatius() {
  const [pestanya, setPestanya] = useState<Pestanya>('donacions');
  const [exercici] = useExercici();
  const { data: config, error, reload } = useApi<ConfigDonatius>('/donatius/config');
  return (
    <>
      <Capcalera titol={t("Donatius")} subtitol={t("Donacions, certificats per als donants i model 182")} />
      <div className="pestanyes no-imprimir" role="tablist">
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      <div className="don-pagina">
        {!config ? (
          <Carregant error={error} />
        ) : (
          <>
            {pestanya === 'donacions' && <Donacions exercici={exercici} config={config} />}
            {pestanya === 'certificats' && <Certificats exercici={exercici} config={config} />}
            {pestanya === 'model182' && <Model182 exercici={exercici} config={config} />}
            {pestanya === 'configuracio' && <Configuracio config={config} onDesat={reload} />}
          </>
        )}
      </div>
    </>
  );
}
