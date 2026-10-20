import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERFILS } from '../../../shared/permisos';
import { t } from '../../i18n';
import { avisa } from '../ui';
import { nomCarrec } from './estat';
import type { Persona } from './estat';

/** 'pendent', 'ok' o el missatge d'error. */
export type Resultat = string;
const esError = (r: Resultat | undefined) => r !== undefined && r !== 'pendent' && r !== 'ok';

/** Pantalla final: què s'ha creat, contrasenyes inicials per copiar o imprimir, i reintents si alguna cosa ha fallat. */
export function Final(props: {
  titolRef: RefObject<HTMLHeadingElement | null>;
  executant: boolean;
  entitat: string;
  admin: { nom: string; usuari: string };
  configDesada: Resultat;
  persones: Persona[];
  resultats: Record<string, Resultat>;
  onCanviaPersona: (id: string, canvi: Partial<Persona>) => void;
  onReintentaConfig: () => Promise<void>;
  onReintentaPersona: (p: Persona) => Promise<void>;
  onEntrat: () => void;
}) {
  const { executant, persones, resultats } = props;
  const navega = useNavigate();
  const document = useRef<HTMLDivElement>(null);
  const [reintentant, setReintentant] = useState<string | null>(null);
  const creades = persones.filter((p) => resultats[p.id] === 'ok');
  const fallides = persones.filter((p) => esError(resultats[p.id]));
  const hiHaErrors = esError(props.configDesada) || fallides.length > 0;

  function textCredencials() {
    const linies = creades.map(
      (p) => `${p.nom} (${nomCarrec(p.carrec)})\n  ${t("Usuari")}: ${p.usuari}\n  ${t("Contrasenya inicial")}: ${p.contrasenya}\n  ${t("Perfil")}: ${t(PERFILS[p.rol].nom)}`,
    );
    return `${props.entitat}\n${t("Usuaris del programa")}\n\n${linies.join('\n\n')}\n\n${t("Cada persona ha de canviar la contrasenya la primera vegada que entri: Configuració → Usuaris → «La meva contrasenya».")}\n`;
  }

  async function copia() {
    const text = textCredencials();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sense accés al porta-retalls (p. ex. connexió no segura des d'un altre ordinador): mètode antic.
      const area = window.document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      window.document.body.appendChild(area);
      area.select();
      const ok = window.document.execCommand('copy');
      area.remove();
      if (!ok) return avisa(t("No s'ha pogut copiar. Selecciona el text i copia'l a mà."), 'error');
    }
    avisa(t("Copiat al porta-retalls."));
  }

  function imprimeix() {
    const el = document.current;
    if (!el) return;
    el.classList.add('document-actiu');
    window.document.body.classList.add('imprimint-document');
    window.addEventListener(
      'afterprint',
      () => {
        el.classList.remove('document-actiu');
        window.document.body.classList.remove('imprimint-document');
      },
      { once: true },
    );
    window.print();
  }

  async function reintenta(clau: string, accio: () => Promise<void>) {
    setReintentant(clau);
    await accio();
    setReintentant(null);
  }

  const entra = (ruta?: string) => {
    if (ruta) navega(ruta);
    props.onEntrat();
  };

  const estat = (r: Resultat | undefined) =>
    r === 'ok' ? <span className="assistent-ok">✓ {t("Fet")}</span> : r === 'pendent' || r === undefined ? <span className="apagat">{t("En curs…")}</span> : <span className="error">✗ {r}</span>;

  return (
    <div className="acces">
      <div className="acces-targeta assistent">
        <h1 className="assistent-titol" ref={props.titolRef} tabIndex={-1}>
          {executant ? t("Preparant el programa…") : hiHaErrors ? t("Gairebé a punt") : t("Tot a punt!")}
        </h1>

        <ul className="assistent-progres" aria-live="polite">
          <li>
            <span>{t("Administrador: {0}", props.admin.usuari)}</span>
            <span className="assistent-ok">✓ {t("Fet")}</span>
          </li>
          <li>
            <span>{t("Dades de l'entitat i acceptació de la llicència")}</span>
            {estat(props.configDesada)}
          </li>
          {persones.map((p) => (
            <li key={p.id}>
              <span>{t("Usuari de {0}", p.nom)}</span>
              {estat(resultats[p.id])}
            </li>
          ))}
        </ul>

        {!executant && esError(props.configDesada) && (
          <div className="assistent-avis-error">
            <p>{t("L'administrador s'ha creat bé, però les dades de l'entitat no s'han pogut desar. Pots tornar-ho a provar ara o completar-les després a Configuració.")}</p>
            <button type="button" className="boto boto-petit" disabled={reintentant !== null} onClick={() => reintenta('config', props.onReintentaConfig)}>
              {reintentant === 'config' ? t("Desant…") : t("Torna-ho a provar")}
            </button>
          </div>
        )}

        {!executant &&
          fallides.map((p, i) => (
            <fieldset key={p.id} className="assistent-avis-error">
              <legend>{t("No s'ha pogut crear l'usuari de {0}", p.nom)}</legend>
              <p className="camp-ample">{t("Corregeix les dades si cal i torna-ho a provar.")}</p>
              <label className="camp">
                <span className="camp-etiqueta">{t("Nom d'usuari")}</span>
                <input id={`as-r-usuari-${i}`} value={p.usuari} autoCapitalize="none" onChange={(ev) => props.onCanviaPersona(p.id, { usuari: ev.target.value })} />
              </label>
              <label className="camp">
                <span className="camp-etiqueta">{t("Contrasenya inicial")}</span>
                <input id={`as-r-contrasenya-${i}`} value={p.contrasenya} autoComplete="off" spellCheck={false} onChange={(ev) => props.onCanviaPersona(p.id, { contrasenya: ev.target.value })} />
              </label>
              <div className="camp-ample">
                <button type="button" className="boto boto-petit" disabled={reintentant !== null} onClick={() => reintenta(p.id, () => props.onReintentaPersona(p))}>
                  {reintentant === p.id ? t("Creant…") : t("Torna-ho a provar")}
                </button>
              </div>
            </fieldset>
          ))}

        {!executant && creades.length > 0 && (
          <section className="assistent-credencials-bloc">
            <h2>{t("Contrasenyes inicials")}</h2>
            <p>
              <strong>{t("Copia-les o imprimeix-les ara: després no es podran tornar a veure.")}</strong>{' '}
              {t("Dona a cada persona el seu usuari i la seva contrasenya inicial.")}
            </p>
            <div ref={document} className="document assistent-credencials">
              <div className="document-cap">
                <p className="document-entitat">{props.entitat}</p>
                <h2>{t("Usuaris del programa")}</h2>
              </div>
              <div className="taula-contenidor">
                <table className="taula">
                  <thead>
                    <tr>
                      <th>{t("Persona")}</th>
                      <th>{t("Usuari")}</th>
                      <th>{t("Contrasenya inicial")}</th>
                      <th>{t("Perfil")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creades.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.nom}
                          <br />
                          <small className="apagat">{nomCarrec(p.carrec)}</small>
                        </td>
                        <td>
                          <code>{p.usuari}</code>
                        </td>
                        <td>
                          <code>{p.contrasenya}</code>
                        </td>
                        <td>{t(PERFILS[p.rol].nom)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>{t("Cada persona ha de canviar la contrasenya la primera vegada que entri: Configuració → Usuaris → «La meva contrasenya».")}</p>
            </div>
            <div className="assistent-botons no-imprimir">
              <button type="button" className="boto boto-secundari" onClick={copia}>
                {t("Copia")}
              </button>
              <button type="button" className="boto boto-secundari" onClick={imprimeix}>
                {t("Imprimeix")}
              </button>
            </div>
          </section>
        )}

        {!executant && (
          <>
            <section className="assistent-seguents">
              <h2>{t("Per començar")}</h2>
              <ul className="assistent-llista">
                <li>
                  <button type="button" className="enllac" onClick={() => entra('/ajuda/primers-passos-entitat-nova')}>
                    {t("Primers passos amb una entitat nova")}
                  </button>
                </li>
                <li>
                  <button type="button" className="enllac" onClick={() => entra('/ajuda/treballar-des-de-casa')}>
                    {t("Com pot entrar la junta des de casa")}
                  </button>
                </li>
              </ul>
            </section>
            <div className="assistent-botons">
              <span className="espai" />
              <button type="button" className="boto" onClick={() => entra()} autoFocus>
                {t("Entra al programa")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
