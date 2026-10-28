import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '../api';
import { DEMO } from '../mode';
import { Camp } from './ui';
import type { Usuari } from '../../shared/types';
import { canviaIdioma, esIdioma, idioma, opcionsIdioma, t } from '../i18n';
import { IconaApp } from './IconaApp';
import { Assistent } from './assistent/Assistent';

interface Estat {
  configurat: boolean;
  usuari: Usuari | null;
  idioma: string | null;
}

const USUARI_DEMO: Usuari = { id: 0, nom: t("Secretaria (demo)"), usuari: 'demo', rol: 'admin' };

/** Botons per triar l'idioma abans d'entrar. */
export function SelectorIdioma() {
  return (
    <div className="selector-idioma" role="group" aria-label={t("Idioma")}>
      {opcionsIdioma().map((o) => (
        <button key={o.codi} type="button" className={o.codi === idioma() ? 'actiu' : ''} onClick={() => canviaIdioma(o.codi)} lang={o.codi}>
          {o.nom}
        </button>
      ))}
    </div>
  );
}

/** Avís que llança el transport quan el servidor respon 401 (sessió caducada). */
export const SESSIO_CADUCADA = 'sessio-caducada';

/**
 * Mostra la pantalla d'accés si no hi ha sessió, o l'assistent inicial si encara no s'ha
 * creat cap usuari. Quan hi ha sessió, passa l'usuari als fills.
 */
export function Acces({ children }: { children: (usuari: Usuari, surt: () => void) => ReactNode }) {
  const [estat, setEstat] = useState<Estat | null>(DEMO ? { configurat: true, usuari: USUARI_DEMO, idioma: null } : null);
  const [error, setError] = useState<string | null>(null);

  const comprova = useCallback(() => {
    if (DEMO) return;
    api
      .get<Estat>('/auth/estat')
      .then((e) => {
        // L'idioma preferit de l'usuari, o si no en té, el de l'entitat.
        const preferit = e.usuari?.idioma || e.idioma;
        if (esIdioma(preferit) && preferit !== idioma()) canviaIdioma(preferit);
        setEstat(e);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    comprova();
    window.addEventListener(SESSIO_CADUCADA, comprova);
    return () => window.removeEventListener(SESSIO_CADUCADA, comprova);
  }, [comprova]);

  const surt = useCallback(async () => {
    await api.post('/auth/sortir').catch(() => {});
    comprova();
  }, [comprova]);

  if (!estat) return <div className="acces">{error ? <p className="error">{error}</p> : <p className="apagat">{t("Carregant…")}</p>}</div>;
  if (!estat.configurat) return <Assistent onEntrat={comprova} />;
  if (!estat.usuari) return <Entrar onFet={comprova} />;
  return <>{children(estat.usuari, surt)}</>;
}

function Entrar({ onFet }: { onFet: () => void }) {
  const [usuari, setUsuari] = useState('');
  const [contrasenya, setContrasenya] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviant, setEnviant] = useState(false);

  async function envia(e: FormEvent) {
    e.preventDefault();
    setEnviant(true);
    setError(null);
    try {
      await api.post('/auth/entrar', { usuari, contrasenya });
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEnviant(false);
    }
  }

  return (
    <div className="acces">
      <form className="acces-targeta" onSubmit={envia}>
        <SelectorIdioma />
        <IconaApp />
        <h1>{t("Gestió de l'associació")}</h1>
        <p className="apagat">{t("Inicia la sessió per continuar.")}</p>
        <Camp etiqueta={t("Usuari")}>
          <input id="acces-usuari" value={usuari} onChange={(e) => setUsuari(e.target.value)} autoComplete="username" required autoFocus />
        </Camp>
        <Camp etiqueta={t("Contrasenya")}>
          <input
            id="acces-contrasenya"
            type="password"
            value={contrasenya}
            onChange={(e) => setContrasenya(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Camp>
        {error && <p className="error">{error}</p>}
        <button className="boto" disabled={enviant}>
          {enviant ? t("Entrant…") : t("Entra")}
        </button>
      </form>
    </div>
  );
}
