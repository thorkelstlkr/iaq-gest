// Peces comunes del mòdul «comunitat»: insígnies d'estat, adjuntar i veure documents (PDF o imatge).
import { useEffect, useMemo, useState } from 'react';
import { redueixImatge } from '../../imatges';
import { locale, t } from '../../i18n';
import { Modal } from '../ui';
import { TO_ESTAT } from './tipus';

export function Estat({ estat, text }: { estat: string; text: string }) {
  return <span className={`insignia com-insignia com-${TO_ESTAT[estat] ?? 'neutre'}`}>{text}</span>;
}

export const hores = (h: number) => (Math.round(h * 100) / 100).toLocaleString(locale(), { maximumFractionDigits: 2 });

/** Mida màxima dels documents adjunts (el servidor accepta peticions de 2 MB com a màxim). */
const MAX_BYTES = Math.round(1.4 * 1024 * 1024);
const COSTAT_MAXIM = 1800;

const midaDataUri = (uri: string) => Math.floor(((uri.length - uri.indexOf(',') - 1) * 3) / 4);

function llegeixComDataUri(fitxer: File): Promise<string> {
  return new Promise((resol, rebutja) => {
    const r = new FileReader();
    r.onload = () => resol(String(r.result));
    r.onerror = () => rebutja(new Error(t("No s'ha pogut llegir el fitxer.")));
    r.readAsDataURL(fitxer);
  });
}

/** Converteix el fitxer triat en data URI: les imatges es redueixen (sense retallar-les); els PDF han de ser petits. */
export async function preparaDocument(fitxer: File): Promise<string> {
  if (fitxer.type === 'application/pdf') {
    if (fitxer.size > MAX_BYTES) throw new Error(t("El PDF fa {0} MB i el màxim és 1,4 MB. Redueix-lo (p. ex. escanejant-lo en blanc i negre) o adjunta'n una foto.", (fitxer.size / 1024 / 1024).toFixed(1)));
    return llegeixComDataUri(fitxer);
  }
  if (!fitxer.type.startsWith('image/')) throw new Error(t("El document ha de ser un PDF o una imatge."));
  const url = URL.createObjectURL(fitxer);
  let ample = 0;
  let alt = 0;
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {
      throw new Error(t("No s'ha pogut llegir la imatge. Prova amb un JPG o PNG."));
    });
    const escala = Math.min(1, COSTAT_MAXIM / Math.max(img.naturalWidth, img.naturalHeight));
    ample = Math.round(img.naturalWidth * escala);
    alt = Math.round(img.naturalHeight * escala);
  } finally {
    URL.revokeObjectURL(url);
  }
  for (const qualitat of [0.82, 0.65, 0.5]) {
    const uri = await redueixImatge(fitxer, ample, alt, qualitat);
    if (midaDataUri(uri) <= MAX_BYTES) return uri;
  }
  throw new Error(t("La imatge és massa gran fins i tot reduïda. Prova amb una foto de menys resolució."));
}

/** Camp per adjuntar, veure o treure un document. `valor`: undefined = sense canvis; null = treure'l. */
export function CampDocument({
  teDocument,
  nom,
  onCanvi,
  onVeure,
}: {
  teDocument: boolean;
  nom: string | null;
  onCanvi: (document: string | null, nom: string | null) => void;
  onVeure?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [preparant, setPreparant] = useState(false);
  async function tria(f: File | undefined) {
    if (!f) return;
    setError(null);
    setPreparant(true);
    try {
      onCanvi(await preparaDocument(f), f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreparant(false);
    }
  }
  return (
    <div className="com-adjunt">
      {teDocument ? (
        <span className="com-adjunt-nom">{nom || t("Document adjunt")}</span>
      ) : (
        <span className="apagat">{t("Cap document adjunt")}</span>
      )}
      <label className="boto boto-secundari boto-petit">
        {teDocument ? t("Canvia") : t("Adjunta PDF o imatge")}
        <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => tria(e.target.files?.[0])} />
      </label>
      {teDocument && onVeure && (
        <button type="button" className="boto boto-secundari boto-petit" onClick={onVeure}>
          {t("Mostra")}
        </button>
      )}
      {teDocument && (
        <button type="button" className="boto boto-perill boto-petit" onClick={() => onCanvi(null, null)}>
          {t("Treu")}
        </button>
      )}
      {preparant && <span className="apagat petit">{t("Preparant el document…")}</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function dataUriABlob(uri: string): Blob {
  const [cap, dades] = uri.split(',');
  const tipus = /data:([^;]+)/.exec(cap)?.[1] ?? 'application/octet-stream';
  const bin = atob(dades);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipus });
}

/** Mostra un document adjunt dins del programa (també funciona on no es poden fer descàrregues). */
export function VisorDocument({ document: doc, nom, onClose }: { document: string; nom: string | null; onClose: () => void }) {
  const esImatge = doc.startsWith('data:image/');
  const url = useMemo(() => (esImatge ? doc : URL.createObjectURL(dataUriABlob(doc))), [doc, esImatge]);
  useEffect(() => () => {
    if (!esImatge) URL.revokeObjectURL(url);
  }, [url, esImatge]);
  return (
    <Modal titol={nom || t("Document")} onClose={onClose} ample>
      <div className="com-visor">
        {esImatge ? <img src={url} alt={nom ?? ''} /> : <iframe src={url} title={nom ?? t("Document")} />}
        <div className="barra-accions">
          <a className="boto boto-secundari boto-petit" href={url} download={nom || 'document'}>
            {t("Descarrega")}
          </a>
          {!esImatge && (
            <a className="boto boto-secundari boto-petit" href={url} target="_blank" rel="noreferrer">
              {t("Obre en una pestanya nova")}
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
