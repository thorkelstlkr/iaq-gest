// Avís abans de publicar fotos d'una activitat: hi ha participants sense consentiment de drets d'imatge?
import { useApi } from '../api';
import { t } from '../i18n';

export function AvisDretsImatge({ activitatId }: { activitatId: number | string | null | undefined }) {
  const id = Number(activitatId) || null;
  const { data: r } = useApi<{ total: number; menors: number; noms: string[] }>(id ? `/activitats/${id}/sense-drets-imatge` : null);
  if (!id || !r || !r.total) return null;
  return (
    <p className="avis-drets-imatge camp-ample" role="alert">
      ⚠️{' '}
      {r.menors
        ? t("{0} participants d'aquesta activitat no han autoritzat l'ús de la seva imatge ({1} menors): {2}. No publiquis fotos on se'ls reconegui.", r.total, r.menors, r.noms.join(', '))
        : t("{0} participants d'aquesta activitat no han autoritzat l'ús de la seva imatge: {1}. No publiquis fotos on se'ls reconegui.", r.total, r.noms.join(', '))}
    </p>
  );
}
