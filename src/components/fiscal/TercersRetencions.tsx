// Pestanya «Tercers i retencions»: pagaments amb retenció, tercers i resums dels models.
import { useState } from 'react';
import { t } from '../../i18n';
import { Models } from './Models';
import { Pagaments } from './Pagaments';
import { Tercers } from './Tercers';
import '../../styles/fiscal.css';

const SECCIONS = [
  { id: 'pagaments', text: t("Pagaments i retencions") },
  { id: 'models', text: t("Models 111, 115, 190, 180 i 347") },
  { id: 'tercers', text: t("Tercers") },
] as const;
type Seccio = (typeof SECCIONS)[number]['id'];

export function TercersRetencions() {
  const [seccio, setSeccio] = useState<Seccio>('pagaments');
  return (
    <>
      <div className="fiscal-seccions no-imprimir" role="tablist" aria-label={t("Tercers i retencions")}>
        {SECCIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={seccio === s.id} className={seccio === s.id ? 'actiu' : ''} onClick={() => setSeccio(s.id)}>
            {s.text}
          </button>
        ))}
      </div>
      {seccio === 'pagaments' && <Pagaments />}
      {seccio === 'models' && <Models />}
      {seccio === 'tercers' && <Tercers />}
      <p className="petit apagat fiscal-avis-legal no-imprimir">
        {t("Pagaments a professionals, artistes i ponents: retenció habitual del 15 % (7 % els primers anys d'activitat), models 111 (trimestral: fins al 20 d'abril, 20 de juliol, 20 d'octubre i 30 de gener) i 190 (anual, al gener). Lloguers de locals: retenció del 19 %, models 115 i 180. El model 347 només afecta les entitats amb activitats econòmiques. Són càlculs orientatius a partir dels pagaments registrats: consulteu-ho amb la gestoria abans de presentar cap declaració.")}
      </p>
    </>
  );
}
