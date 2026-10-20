import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { avisa, avisaError } from '../ui';
import { t } from '../../i18n';
import { AvisosParticipant } from './Participants';
import type { ActivitatPlena, Participant } from './tipus';

/**
 * Mode ràpid per passar llista a la porta: botons grans per marcar qui arriba,
 * comptador d'assistents sense inscripció (actes oberts) i alta de qui es presenta sense inscriure's.
 */
export function PassarLlista({ activitat, ambLlista, onCanvi }: { activitat: ActivitatPlena; ambLlista: boolean; onCanvi?: () => void }) {
  const { data: llista, reload } = useApi<Participant[]>(ambLlista ? `/crm/activitats/${activitat.id}/participants` : null);
  const [cerca, setCerca] = useState('');
  const [anonims, setAnonims] = useState(activitat.assistents_anonims ?? 0);
  const [nou, setNou] = useState('');
  const desaAnonims = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Es desa el comptador poc després de l'últim toc (per no fer una petició a cada clic).
  function canviaAnonims(n: number) {
    const valor = Math.max(0, n);
    setAnonims(valor);
    if (desaAnonims.current) clearTimeout(desaAnonims.current);
    desaAnonims.current = setTimeout(() => {
      api.put(`/activitats/${activitat.id}/assistents-anonims`, { assistents_anonims: valor }).then(() => onCanvi?.(), avisaError);
    }, 600);
  }
  useEffect(() => () => {
    if (desaAnonims.current) clearTimeout(desaAnonims.current);
  }, []);

  const presents = (llista ?? []).filter((p) => p.estat !== 'cancel·lat');
  const filtre = cerca.trim().toLowerCase();
  const visibles = presents.filter((p) => !filtre || p.nom.toLowerCase().includes(filtre));
  const arribats = presents.filter((p) => p.assistit).length;

  async function marca(p: Participant) {
    try {
      await api.put(`/crm/activitats/${activitat.id}/participants/${p.id}`, { assistit: !p.assistit });
      reload();
      onCanvi?.();
    } catch (e) {
      avisaError(e);
    }
  }

  async function afegeix(e: FormEvent) {
    e.preventDefault();
    if (!nou.trim()) return;
    try {
      await api.post(`/crm/activitats/${activitat.id}/participants`, { nom_extern: nou, assistit: true });
      avisa(t("{0} afegit/da com a assistent.", nou.trim()));
      setNou('');
      reload();
      onCanvi?.();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <div className="act-panell act-passar-llista">
      <div className="act-anonims">
        <span className="act-anonims-etiqueta">{t("Assistents sense inscripció")}</span>
        <button type="button" className="act-boto-gran" onClick={() => canviaAnonims(anonims - 1)} aria-label={t("Un menys")}>
          −
        </button>
        <input
          type="number"
          min={0}
          value={anonims}
          onChange={(e) => canviaAnonims(Number(e.target.value) || 0)}
          aria-label={t("Assistents sense inscripció")}
        />
        <button type="button" className="act-boto-gran" onClick={() => canviaAnonims(anonims + 1)} aria-label={t("Un més")}>
          +
        </button>
      </div>

      {ambLlista && (
        <>
          <div className="act-passar-cap">
            <strong>{t("Han arribat {0} de {1}", arribats, presents.length)}</strong>
            <input
              type="search"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder={t("Cerca un nom…")}
              aria-label={t("Cerca un nom…")}
            />
          </div>
          {!llista ? null : presents.length === 0 ? (
            <p className="apagat">{t("No hi ha ningú inscrit. Pots comptar els assistents amb el comptador de dalt.")}</p>
          ) : (
            <div className="act-graella-llista">
              {visibles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`act-fitxa-persona ${p.assistit ? 'act-arribat' : ''}`}
                  aria-pressed={Boolean(p.assistit)}
                  onClick={() => marca(p)}
                >
                  <span className="act-marca" aria-hidden="true">{p.assistit ? '✓' : ''}</span>
                  <span className="act-fitxa-nom">{p.nom}</span>
                  <span className="act-fitxa-detall">
                    {p.estat === 'espera' && <span className="act-avis">{t("En espera")}</span>}
                    {p.edat !== null && <span>{t("{0} anys", p.edat)}</span>}
                    <AvisosParticipant p={p} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <form className="afegeix-linia act-nou-assistent" onSubmit={afegeix}>
            <input
              value={nou}
              onChange={(e) => setNou(e.target.value)}
              placeholder={t("Algú que no s'havia inscrit: nom i llinatges")}
              aria-label={t("Nom de la persona que no s'havia inscrit")}
            />
            <button className="boto boto-petit" disabled={!nou.trim()}>
              {t("Afegeix com a assistent")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
