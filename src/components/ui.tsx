import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useEntitat } from '../entitat';
import { ESTATS_QUOTA } from '../format';
import { t } from '../i18n';
import { Link, useLocation } from 'react-router-dom';
import { articlePerRuta, tx } from '../ajuda';

// ---------- Exercici (any comptable) seleccionat ----------

export const ExerciciContext = createContext<[number, (e: number) => void]>([new Date().getFullYear(), () => {}]);
export const useExercici = () => useContext(ExerciciContext);

// ---------- Avisos ----------

type Avis = { id: number; text: string; tipus: 'ok' | 'error' };
let emet: ((a: Avis) => void) | null = null;
let seq = 0;

export function avisa(text: string, tipus: Avis['tipus'] = 'ok') {
  emet?.({ id: ++seq, text, tipus });
}
export const avisaError = (e: unknown) => avisa(e instanceof Error ? e.message : String(e), 'error');

export function Avisos() {
  const [avisos, setAvisos] = useState<Avis[]>([]);
  useEffect(() => {
    emet = (a) => {
      setAvisos((l) => [...l, a]);
      setTimeout(() => setAvisos((l) => l.filter((x) => x.id !== a.id)), a.tipus === 'error' ? 6000 : 3000);
    };
    return () => {
      emet = null;
    };
  }, []);
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className={`avis avis-${a.tipus}`}>
          {a.text}
        </div>
      ))}
    </div>
  );
}

// ---------- Confirmacions (substitueix window.confirm) ----------

type Peticio = { text: string; resol: (ok: boolean) => void };
let demana: ((p: Peticio) => void) | null = null;

export function confirma(text: string): Promise<boolean> {
  return new Promise((resol) => (demana ? demana({ text, resol }) : resol(false)));
}

export function Confirmacions() {
  const [peticio, setPeticio] = useState<Peticio | null>(null);
  useEffect(() => {
    demana = setPeticio;
    return () => {
      demana = null;
    };
  }, []);
  if (!peticio) return null;
  const respon = (ok: boolean) => {
    peticio.resol(ok);
    setPeticio(null);
  };
  return (
    <Modal titol={t("Confirmació")} onClose={() => respon(false)}>
      <div className="formulari-modal">
        <p className="camp-ample">{peticio.text}</p>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={() => respon(false)}>
            {t("Cancel·la")}
          </button>
          <button type="button" className="boto" onClick={() => respon(true)} autoFocus>
            {t("D'acord")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Components ----------

export function Modal(props: { titol: string; onClose: () => void; children: ReactNode; ample?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.onClose]);
  return (
    <div className="modal-fons" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={`modal ${props.ample ? 'modal-ample' : ''}`} role="dialog" aria-modal="true" aria-label={props.titol}>
        <header className="modal-cap">
          <h2>{props.titol}</h2>
          <button className="boto-icona" onClick={props.onClose} aria-label={t("Tanca")}>
            ×
          </button>
        </header>
        {props.children}
      </div>
    </div>
  );
}

export function Camp(props: { etiqueta: string; children: ReactNode; ample?: boolean; ajuda?: string; grup?: boolean }) {
  const contingut = (
    <>
      <span className="camp-etiqueta">{props.etiqueta}</span>
      {props.children}
      {props.ajuda && <span className="camp-ajuda">{props.ajuda}</span>}
    </>
  );
  const classe = `camp ${props.ample ? 'camp-ample' : ''}`;
  // «grup»: per a camps amb diversos controls (p. ex. l'editor de text amb la barra de botons),
  // on una <label> faria que un clic a qualsevol lloc premés el primer botó.
  return props.grup ? (
    <div className={classe} role="group" aria-label={props.etiqueta}>
      {contingut}
    </div>
  ) : (
    <label className={classe}>{contingut}</label>
  );
}

export function Capcalera(props: { titol: string; subtitol?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pagina-cap">
      <div>
        <h1>{props.titol}</h1>
        {props.subtitol && <p className="subtitol">{props.subtitol}</p>}
      </div>
      <div className="accions">
        {props.children}
        <AjudaContextual />
      </div>
    </header>
  );
}

/** Botó «?» que obre l'article d'ajuda de la pantalla actual (si n'hi ha). */
function AjudaContextual() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/ajuda')) return null;
  const article = articlePerRuta(pathname);
  if (!article) return null;
  return (
    <Link to={`/ajuda/${article.id}`} className="boto-ajuda" title={t("Ajuda: {0}", tx(article.titol))} aria-label={t("Ajuda: {0}", tx(article.titol))}>
      ?
    </Link>
  );
}

export function EstatQuota({ estat }: { estat: string | null }) {
  if (!estat) return <span className="insignia insignia-buida">{t("Sense quota")}</span>;
  return <span className={`insignia insignia-${estat}`}>{ESTATS_QUOTA[estat]}</span>;
}

export function Objectius({ codis }: { codis: string }) {
  const { finalitats } = useEntitat();
  const objectiuPerCodi = (c: string) => finalitats.find((f) => f.codi === c);
  // Les finalitats eliminades a Configuració ja no es mostren.
  const llista = codis.split(',').filter((c) => c && objectiuPerCodi(c));
  if (!llista.length) return <span className="apagat">—</span>;
  return (
    <span className="objectius">
      {llista.map((c) => (
        <span key={c} className="objectiu" title={objectiuPerCodi(c)?.text}>
          {c}) {objectiuPerCodi(c)?.curt}
        </span>
      ))}
    </span>
  );
}

/** Etiqueta de color (CRM). */
export function Xip({ nom, color }: { nom: string; color: string }) {
  return (
    <span className="xip" style={{ ['--xip' as string]: color }}>
      {nom}
    </span>
  );
}

export function Carregant({ error }: { error?: string | null }) {
  return error ? <p className="error">{error}</p> : <p className="apagat">{t("Carregant…")}</p>;
}

export function Buit({ children }: { children: ReactNode }) {
  return <div className="buit">{children}</div>;
}
