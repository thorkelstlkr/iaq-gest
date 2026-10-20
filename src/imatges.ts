import { t } from './i18n';
/**
 * Retalla i redueix una imatge triada per l'usuari a una mida fixa (omplint-la, com object-fit: cover)
 * i la torna com a data URI JPEG, perquè ocupi poc a la base de dades.
 */
export async function redueixImatge(fitxer: File, ample: number, alt: number, qualitat = 0.85): Promise<string> {
  if (!fitxer.type.startsWith('image/')) throw new Error(t("El fitxer no és una imatge."));
  const url = URL.createObjectURL(fitxer);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {
      throw new Error(t("No s'ha pogut llegir la imatge. Prova amb un JPG o PNG."));
    });
    const canvas = document.createElement('canvas');
    canvas.width = ample;
    canvas.height = alt;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; // les zones transparents dels PNG quedarien negres en JPEG
    ctx.fillRect(0, 0, ample, alt);
    const escala = Math.max(ample / img.naturalWidth, alt / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    ctx.drawImage(img, (ample - w) / 2, (alt - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', qualitat);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Mida de la foto del soci (proporció 4:5, com una foto de carnet). */
export const FOTO = { ample: 360, alt: 450 };
/** Mida de la plantilla del carnet: format targeta CR80 (85,6 × 54 mm) a 300 ppp. */
export const PLANTILLA = { ample: 1012, alt: 638 };

/**
 * Redueix una imatge sense retallar-la (conserva la proporció) fins a cabre en ample × alt.
 * En PNG conserva la transparència (logotips); en JPEG ocupa menys (fotos).
 */
export async function escalaImatge(fitxer: File, maxAmple: number, maxAlt: number, format: 'png' | 'jpeg' = 'png', qualitat = 0.85): Promise<string> {
  if (!fitxer.type.startsWith('image/')) throw new Error(t("El fitxer no és una imatge."));
  const url = URL.createObjectURL(fitxer);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {
      throw new Error(t("No s'ha pogut llegir la imatge. Prova amb un JPG o PNG."));
    });
    const escala = Math.min(1, maxAmple / img.naturalWidth, maxAlt / img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d')!;
    if (format === 'jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(`image/${format}`, qualitat);
  } finally {
    URL.revokeObjectURL(url);
  }
}
