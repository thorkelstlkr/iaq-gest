import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { DEMO } from '../mode';
import { data } from '../format';
import { Modal, avisaError, useExercici } from './ui';
import type { Config, Soci } from '../../shared/types';
import { t } from '../i18n';

export interface PlantillaCarnet {
  anvers: string | null;
  revers: string | null;
}

interface Props {
  soci: Pick<Soci, 'num_soci' | 'nom' | 'llinatges' | 'dni' | 'data_alta'>;
  foto: string | null;
  config: Config | null;
  plantilla: PlantillaCarnet | null;
  exercici: number;
}

const inicials = (s: { nom: string; llinatges: string }) =>
  `${s.nom[0] ?? ''}${s.llinatges[0] ?? ''}`.toUpperCase();

/** Carnet de soci en format targeta (85,6 × 54 mm): anvers i revers. */
export function Carnet({ soci, foto, config, plantilla, exercici }: Props) {
  const anvers = plantilla?.anvers;
  const revers = plantilla?.revers;
  return (
    <div className="carnet-parell">
      <div
        className={`carnet ${anvers ? 'carnet-amb-plantilla' : ''}`}
        style={anvers ? { backgroundImage: `url(${anvers})` } : undefined}
      >
        {anvers ? (
          <div className="carnet-cap-buit" />
        ) : (
          <header className="carnet-cap">
            {config?.logo ? (
              <img className="carnet-logo carnet-logo-imatge" src={config.logo} alt="" />
            ) : (
              <span className="carnet-logo">{(config?.nom || '?').trim()[0]?.toUpperCase()}</span>
            )}
            <div>
              <strong>{config?.nom || t("Associació")}</strong>
              <small>{t("Carnet de soci")}{config?.poblacio ? ` · ${config.poblacio}` : ''}</small>
            </div>
          </header>
        )}
        <div className="carnet-cos">
          {foto ? (
            <img className="carnet-foto" src={foto} alt="" />
          ) : (
            <div className="carnet-foto carnet-foto-buida">{inicials(soci)}</div>
          )}
          <div className="carnet-dades">
            <span className="carnet-nom">
              {soci.nom}
              <br />
              {soci.llinatges}
            </span>
            {soci.dni && (
              <span>
                <span className="carnet-etiqueta">{t("DNI")}</span> {soci.dni}
              </span>
            )}
            <span>
              <span className="carnet-etiqueta">{t("Alta")}</span> {data(soci.data_alta)}
            </span>
            <span className="carnet-num">
              <span className="carnet-etiqueta">{t("Núm. soci")}</span> {String(soci.num_soci).padStart(4, '0')}
            </span>
          </div>
        </div>
        <div className="carnet-peu">{t("Exercici")} {exercici}</div>
      </div>

      <div
        className={`carnet carnet-revers ${revers ? 'carnet-amb-plantilla' : ''}`}
        style={revers ? { backgroundImage: `url(${revers})` } : undefined}
      >
        {!revers && (
          <>
            <p className="carnet-entitat">{config?.nom_complet || config?.nom}</p>
            <p className="carnet-petit">
              {[config?.nif && t("NIF {0}", config.nif), config?.adreca, config?.email].filter(Boolean).join(' · ')}
            </p>
            <p className="carnet-petit">
              {t("Aquest carnet és personal i intransferible i acredita la condició de soci o sòcia de l'entitat.")}
            </p>
            <div className="carnet-signatura">{t("La secretaria")}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Impressió des de qualsevol pantalla ----------

let obre: ((sociId: number) => void) | null = null;

/** Obre el diàleg d'impressió amb el carnet del soci (a la demostració, en mostra la previsualització). */
export const imprimeixCarnet = (sociId: number) => obre?.(sociId);

const precarrega = (src: string | null) => {
  if (!src) return Promise.resolve();
  const img = new Image();
  img.src = src;
  // Com a màxim 2 s: si el navegador no la descodifica a temps, s'imprimeix igualment.
  return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 2000))]);
};

export function ImpressioCarnets() {
  const [exercici] = useExercici();
  const [dades, setDades] = useState<Omit<Props, 'exercici'> | null>(null);

  useEffect(() => {
    obre = async (id) => {
      try {
        const [fitxa, config, plantilla] = await Promise.all([
          api.get<{ soci: Soci; foto: string | null }>(`/socis/${id}`),
          api.get<Config>('/config'),
          api.get<PlantillaCarnet>('/config/carnet'),
        ]);
        // Les imatges han d'estar descodificades abans d'obrir el diàleg d'impressió.
        await Promise.all([precarrega(fitxa.foto), precarrega(plantilla.anvers), precarrega(plantilla.revers)]);
        setDades({ soci: fitxa.soci, foto: fitxa.foto, config, plantilla });
      } catch (e) {
        avisaError(e);
      }
    };
    return () => {
      obre = null;
    };
  }, []);

  useEffect(() => {
    if (!dades || DEMO) return;
    document.body.classList.add('imprimint-carnet');
    const acaba = () => {
      document.body.classList.remove('imprimint-carnet');
      setDades(null);
    };
    window.addEventListener('afterprint', acaba, { once: true });
    const tt = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(tt);
      window.removeEventListener('afterprint', acaba);
      document.body.classList.remove('imprimint-carnet');
    };
  }, [dades]);

  if (!dades) return null;
  const carnet = <Carnet {...dades} exercici={exercici} />;
  if (DEMO) {
    return (
      <Modal titol={t("Carnet de soci")} onClose={() => setDades(null)} ample>
        <div className="carnet-previsualitzacio">{carnet}</div>
        <p className="apagat petit carnet-nota">{t("A la versió instal·lada, aquest botó obre directament el diàleg d'impressió.")}</p>
      </Modal>
    );
  }
  return createPortal(<div className="area-impressio">{carnet}</div>, document.body);
}
