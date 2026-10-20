// Preparació dels fitxers adjunts (justificants i resolucions): les imatges es redueixen al navegador
// i els PDF han de ser petits, perquè les peticions tenen un límit de 2 MB.
import { redueixImatge } from '../../imatges';
import { t } from '../../i18n';

export const MIDA_MAX = Math.round(1.4 * 1024 * 1024);

export const midaText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

const midaDataUri = (d: string) => Math.floor(((d.length - d.indexOf(',') - 1) * 3) / 4);

function llegeix(fitxer: File): Promise<string> {
  return new Promise((resol, rebutja) => {
    const r = new FileReader();
    r.onload = () => resol(String(r.result));
    r.onerror = () => rebutja(new Error(t("No s'ha pogut llegir el fitxer.")));
    r.readAsDataURL(fitxer);
  });
}

async function midesImatge(fitxer: File): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(fitxer);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    throw new Error(t("No s'ha pogut llegir la imatge. Prova amb un JPG o PNG."));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Converteix el fitxer triat en {nom, dades} (data URI) apte per enviar a l'API. */
export async function preparaFitxer(fitxer: File): Promise<{ nom: string; dades: string; mida: number }> {
  if (fitxer.type === 'application/pdf') {
    if (fitxer.size > MIDA_MAX)
      throw new Error(t("El PDF fa {0} i el màxim és 1,4 MB. Redueix-lo (p. ex. imprimint-lo com a PDF en qualitat baixa) o escaneja'l com a imatge.", midaText(fitxer.size)));
    const dades = await llegeix(fitxer);
    return { nom: fitxer.name, dades, mida: fitxer.size };
  }
  if (!fitxer.type.startsWith('image/')) throw new Error(t("El fitxer ha de ser una imatge (JPG, PNG) o un PDF."));
  const { w, h } = await midesImatge(fitxer);
  // Es manté la proporció (no es retalla) i es redueix fins que ocupa menys del màxim.
  for (const [costat, qualitat] of [[1800, 0.82], [1400, 0.75], [1100, 0.65], [800, 0.6]] as const) {
    const escala = Math.min(1, costat / Math.max(w, h));
    const dades = await redueixImatge(fitxer, Math.max(1, Math.round(w * escala)), Math.max(1, Math.round(h * escala)), qualitat);
    const mida = midaDataUri(dades);
    if (mida <= MIDA_MAX) return { nom: fitxer.name.replace(/\.[^.]+$/, '') + '.jpg', dades, mida };
  }
  throw new Error(t("La imatge és massa gran fins i tot reduïda."));
}

/** Data URI → URL de tipus blob: (els navegadors no deixen obrir PDF en data: dins d'un marc). */
export function urlBlob(dades: string): string {
  const coma = dades.indexOf(',');
  const mime = /^data:([^;,]+)/.exec(dades)?.[1] ?? 'application/octet-stream';
  const bin = atob(dades.slice(coma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}
