import { textLlicencia } from '../../../shared/llicencia';
import { idioma } from '../../i18n';
import { t } from '../../i18n';

/** Text de la llicència i l'exempció de responsabilitat, en un quadre amb desplaçament. */
export function TextLlicencia() {
  return (
    <div className="assistent-llicencia" tabIndex={0} role="document" aria-label={t("Text de la llicència")} lang={idioma()}>
      {textLlicencia(idioma())}
    </div>
  );
}
