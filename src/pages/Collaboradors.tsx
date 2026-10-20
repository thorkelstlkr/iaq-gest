// Col·laboradors: entitats, administracions i escoles amb què col·laborem, i convenis.
import { useState } from 'react';
import { Capcalera } from '../components/ui';
import { t } from '../i18n';
import { Entitats } from '../components/comunitat/Entitats';
import { Convenis } from '../components/comunitat/Convenis';
import '../styles/comunitat.css';

const PESTANYES = [
  { id: 'entitats', text: t("Entitats") },
  { id: 'convenis', text: t("Convenis") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Collaboradors() {
  const [pestanya, setPestanya] = useState<Pestanya>('entitats');
  return (
    <>
      <Capcalera titol={t("Col·laboradors")} subtitol={t("Entitats, administracions i escoles amb què col·laborem, i convenis")} />
      <div className="pestanyes no-imprimir" role="tablist">
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      <div className="com-pagina">
        {pestanya === 'entitats' && <Entitats />}
        {pestanya === 'convenis' && <Convenis />}
      </div>
    </>
  );
}
