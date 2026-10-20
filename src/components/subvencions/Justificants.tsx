// Justificants adjunts als moviments (factures, tiquets, rebuts) i visor de fitxers (imatge o PDF).
import { useEffect, useRef, useState } from 'react';
import { api, useApi } from '../../api';
import { Buit, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { data, euros } from '../../format';
import { DEMO } from '../../mode';
import { t } from '../../i18n';
import { midaText, preparaFitxer, urlBlob } from './fitxers';
import type { Fitxer } from './tipus';

/** Mostra un fitxer (imatge o PDF) en una finestra, amb opció d'obrir-lo, imprimir-lo o desar-lo. */
export function VisorFitxer({ fitxer, onClose }: { fitxer: Fitxer & { dades: string }; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const marc = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let u: string | null = null;
    try {
      u = urlBlob(fitxer.dades);
      setUrl(u);
    } catch {
      setUrl(null);
    }
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [fitxer.dades]);
  const esPdf = fitxer.mime === 'application/pdf';

  function imprimeix() {
    try {
      marc.current?.contentWindow?.print();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <Modal titol={fitxer.nom} onClose={onClose} ample>
      <div className="subv-visor">
        {esPdf ? (
          url ? (
            <iframe ref={marc} src={url} title={fitxer.nom} className="subv-visor-pdf" />
          ) : (
            <object data={fitxer.dades} type="application/pdf" className="subv-visor-pdf" aria-label={fitxer.nom}>
              <p>{t("El navegador no pot mostrar el PDF aquí.")}</p>
            </object>
          )
        ) : (
          <img src={fitxer.dades} alt={fitxer.nom} className="subv-visor-imatge" />
        )}
      </div>
      <div className="formulari-peu">
        <span className="apagat petit">
          {fitxer.mime} · {midaText(fitxer.mida)}
        </span>
        <span className="espai" />
        {url && (
          <a className="boto boto-secundari" href={url} target="_blank" rel="noreferrer">
            {t("Obre en una pestanya nova")}
          </a>
        )}
        {esPdf && url && (
          <button type="button" className="boto boto-secundari" onClick={imprimeix}>
            {t("Imprimeix")}
          </button>
        )}
        {!DEMO && (
          <a className="boto boto-secundari" href={url ?? fitxer.dades} download={fitxer.nom}>
            {t("Desa el fitxer")}
          </a>
        )}
        <button type="button" className="boto" onClick={onClose}>
          {t("Tanca")}
        </button>
      </div>
    </Modal>
  );
}

/** Botó per triar un fitxer i convertir-lo (imatges reduïdes; PDF ≤ 1,4 MB). */
export function TriaFitxer({ onFitxer, text, desactivat }: { onFitxer: (f: { nom: string; dades: string }) => Promise<void>; text: string; desactivat?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [enviant, setEnviant] = useState(false);
  async function tria(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setEnviant(true);
    try {
      await onFitxer(await preparaFitxer(f));
    } catch (err) {
      avisaError(err);
    } finally {
      setEnviant(false);
    }
  }
  return (
    <>
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={tria} />
      <button type="button" className="boto boto-secundari" disabled={desactivat || enviant} onClick={() => input.current?.click()}>
        {enviant ? t("Pujant…") : text}
      </button>
    </>
  );
}

/**
 * Justificants d'un moviment. En un exercici tancat se'n poden afegir però no eliminar.
 * `nomesLectura`: es llegeixen per l'API de subvencions (perfil d'informes) i no es poden modificar.
 */
export function JustificantsMoviment(props: {
  moviment: { id: number; data: string; concepte: string; import_cents: number };
  tancat?: boolean;
  nomesLectura?: boolean;
  onClose: () => void;
  onCanvi?: () => void;
}) {
  const { moviment: m } = props;
  const llista = props.nomesLectura ? `/subvencions/justificants-moviment/${m.id}` : `/comptabilitat/moviments/${m.id}/justificants`;
  const { data: fitxers, error, reload } = useApi<Fitxer[]>(llista);
  const [veient, setVeient] = useState<(Fitxer & { dades: string }) | null>(null);

  async function obre(f: Fitxer) {
    try {
      setVeient(await api.get<Fitxer & { dades: string }>(props.nomesLectura ? `/subvencions/justificants/${f.id}` : `/comptabilitat/justificants/${f.id}`));
    } catch (e) {
      avisaError(e);
    }
  }

  async function puja(f: { nom: string; dades: string }) {
    await api.post(`/comptabilitat/moviments/${m.id}/justificants`, f);
    avisa(t("Justificant adjuntat."));
    reload();
    props.onCanvi?.();
  }

  async function elimina(f: Fitxer) {
    if (!(await confirma(t("Eliminar el justificant «{0}»?", f.nom)))) return;
    try {
      await api.del(`/comptabilitat/justificants/${f.id}`);
      avisa(t("Justificant eliminat."));
      reload();
      props.onCanvi?.();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <Modal titol={t("Justificants")} onClose={props.onClose}>
      <div className="formulari-modal subv-justificants">
        <p className="camp-ample">
          <strong>{m.concepte}</strong>
          <br />
          <span className="apagat">
            {data(m.data)} · {euros(m.import_cents)}
          </span>
        </p>
        {props.tancat && !props.nomesLectura && (
          <p className="avis-tancat camp-ample" role="note">
            <span aria-hidden="true" className="cadenat" />
            {t("Exercici tancat: s'hi poden afegir justificants, però no eliminar-los.")}
          </p>
        )}
        <div className="camp-ample">
          {!fitxers ? (
            <Carregant error={error} />
          ) : fitxers.length === 0 ? (
            <Buit>{t("Aquest moviment encara no té cap justificant adjunt.")}</Buit>
          ) : (
            <ul className="subv-fitxers">
              {fitxers.map((f) => (
                <li key={f.id}>
                  <button type="button" className="enllac" onClick={() => obre(f)}>
                    <span aria-hidden="true" className="subv-icona">{f.mime === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                    {f.nom}
                  </button>
                  <span className="apagat petit">
                    {midaText(f.mida)} · {data(f.creat_el?.slice(0, 10))}
                  </span>
                  {!props.nomesLectura && !props.tancat && (
                    <button type="button" className="boto boto-petit boto-perill" onClick={() => elimina(f)}>
                      {t("Elimina")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="formulari-peu camp-ample">
          {!props.nomesLectura && <TriaFitxer text={t("Adjunta un fitxer…")} onFitxer={puja} />}
          <span className="espai" />
          <button type="button" className="boto" onClick={props.onClose}>
            {t("Tanca")}
          </button>
        </div>
        {!props.nomesLectura && <p className="camp-ample apagat petit">{t("Imatges (es redueixen automàticament) o PDF de 1,4 MB com a màxim.")}</p>}
      </div>
      {veient && <VisorFitxer fitxer={veient} onClose={() => setVeient(null)} />}
    </Modal>
  );
}

/** Clip amb el nombre de justificants (per a les taules de moviments). */
export function Clip({ n, onClick }: { n: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`subv-clip ${n ? 'amb' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={n ? t("{0} justificants adjunts", n) : t("Adjunta un justificant")}
      aria-label={n ? t("{0} justificants adjunts", n) : t("Adjunta un justificant")}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M16.5 6.5v10a4.5 4.5 0 0 1-9 0V5a3 3 0 0 1 6 0v10.5a1.5 1.5 0 0 1-3 0V6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {n > 0 && <span>{n}</span>}
    </button>
  );
}
