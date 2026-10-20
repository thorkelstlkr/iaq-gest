// Pestanya «Registre»: registre d'altes i baixes de les persones voluntàries, a punt per imprimir.
import { useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Carregant } from '../ui';
import { RegistreDocument } from './Impresos';
import type { FilaRegistre } from './Impresos';

export function Registre() {
  const { config } = useEntitat();
  const { data: files, error } = useApi<FilaRegistre[]>('/comunitat/registre');
  if (!files) return <Carregant error={error} />;
  if (files.length === 0) return <Buit>{t("El registre és buit: encara no hi ha cap persona voluntària.")}</Buit>;
  return (
    <>
      <p className="apagat petit no-imprimir">
        {t("Cada incorporació i cada baixa queden anotades per ordre de data. Si una persona es reincorpora, hi surt una línia nova.")}
      </p>
      <Imprimible titolBoto={t("Imprimeix el registre")}>
        <RegistreDocument files={files} config={config} avui={avui()} />
      </Imprimible>
    </>
  );
}
