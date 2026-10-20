import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Capcalera } from '../components/ui';
import { t } from '../i18n';
import { PressupostAnual } from '../components/tresoreria/Pressupost';
import { Domiciliacions } from '../components/tresoreria/Domiciliacions';
import { Fiscalitat } from '../components/tresoreria/Fiscalitat';
import { Tancaments } from '../components/tresoreria/Tancament';
import { TercersRetencions } from '../components/fiscal/TercersRetencions';
import { Extractes } from '../components/fiscal/Extractes';
import '../styles/tresoreria.css';

const PESTANYES = [
  { id: 'pressupost', text: t("Pressupost") },
  { id: 'domiciliacions', text: t("Domiciliacions") },
  { id: 'fiscalitat', text: t("Fiscalitat") },
  { id: 'tercers', text: t("Tercers i retencions") },
  { id: 'extractes', text: t("Extractes bancaris") },
  { id: 'tancament', text: t("Tancament") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

const esPestanya = (v: string | null): v is Pestanya => PESTANYES.some((p) => p.id === v);

export default function Tresoreria() {
  // Els avisos del tauler poden obrir directament una pestanya (/tresoreria?pestanya=extractes).
  const [params] = useSearchParams();
  const inicial = params.get('pestanya');
  const [pestanya, setPestanya] = useState<Pestanya>(esPestanya(inicial) ? inicial : 'pressupost');
  return (
    <>
      <Capcalera titol={t("Tresoreria")} subtitol={t("Pressupost, domiciliacions, fiscalitat, retencions, extractes bancaris i tancament de l'exercici")} />
      <div className="pestanyes no-imprimir" role="tablist">
        {PESTANYES.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestanya === p.id}
            className={pestanya === p.id ? 'actiu' : ''}
            onClick={() => setPestanya(p.id)}
          >
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'pressupost' && <PressupostAnual />}
      {pestanya === 'domiciliacions' && <Domiciliacions />}
      {pestanya === 'fiscalitat' && <Fiscalitat />}
      {pestanya === 'tercers' && <TercersRetencions />}
      {pestanya === 'extractes' && <Extractes />}
      {pestanya === 'tancament' && <Tancaments />}
    </>
  );
}
