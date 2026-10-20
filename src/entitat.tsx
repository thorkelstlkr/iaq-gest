import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { Config, Etiqueta, Finalitat, Usuari } from '../shared/types';
import { pot as potRol } from '../shared/permisos';
import type { Modul } from '../shared/permisos';
import { t } from './i18n';

// Dades de l'entitat que fan servir moltes pantalles: es carreguen una vegada i
// es tornen a llegir quan es modifiquen a Configuració (recarrega()).

interface Entitat {
  config: Config | null;
  finalitats: Finalitat[];
  etiquetes: Etiqueta[];
  usuari: Usuari | null;
  recarrega: () => void;
  /** Si el perfil de l'usuari té accés al mòdul. */
  pot: (modul: Modul) => boolean;
}

const EntitatContext = createContext<Entitat>({
  config: null,
  finalitats: [],
  etiquetes: [],
  usuari: null,
  recarrega: () => {},
  pot: () => false,
});

export const useEntitat = () => useContext(EntitatContext);

export function EntitatProvider({ usuari, children }: { usuari: Usuari | null; children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [finalitats, setFinalitats] = useState<Finalitat[]>([]);
  const [etiquetes, setEtiquetes] = useState<Etiqueta[]>([]);
  const [tick, setTick] = useState(0);
  const recarrega = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    Promise.all([
      api.get<Config>('/config'),
      api.get<Finalitat[]>('/config/finalitats'),
      potRol(usuari?.rol, 'socis') ? api.get<Etiqueta[]>('/crm/etiquetes') : Promise.resolve([]),
    ])
      .then(([c, f, e]) => {
        setConfig(c);
        setFinalitats(f);
        setEtiquetes(e);
      })
      .catch(() => {});
  }, [tick, usuari?.rol]);

  useEffect(() => {
    if (config?.nom) document.title = t("{0} · Gestió", config.nom);
  }, [config?.nom]);

  return (
    <EntitatContext.Provider value={{ config, finalitats, etiquetes, usuari, recarrega, pot: (m) => potRol(usuari?.rol, m) }}>
      {children}
    </EntitatContext.Provider>
  );
}

/** Logotip de l'entitat: la imatge pujada a Configuració o la inicial del nom. */
export function Logo({ className = 'marca-logo' }: { className?: string }) {
  const { config } = useEntitat();
  if (config?.logo) return <img src={config.logo} alt="" className={`${className} logo-imatge`} />;
  const inicial = (config?.nom || '?').trim()[0]?.toUpperCase() ?? '?';
  return <span className={className}>{inicial}</span>;
}
