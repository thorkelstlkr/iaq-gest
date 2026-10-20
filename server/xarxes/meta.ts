// Publicació a Instagram (API d'Instagram amb inici de sessió d'Instagram) i a una pàgina de Facebook.
// Les dues fan servir tokens d'accés generats al panell de desenvolupadors de Meta per als comptes propis.

const IG = 'https://graph.instagram.com';
const FB = 'https://graph.facebook.com';

async function crida<T>(url: string, cos?: Record<string, string>): Promise<T> {
  const res = await fetch(url, cos ? { method: 'POST', body: new URLSearchParams(cos) } : undefined);
  const dades = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || dades.error) throw new Error(dades.error?.message ?? `Error ${res.status} de Meta`);
  return dades;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Instagram ----------

/** Comprova el token i torna el compte professional al qual pertany. */
export function compteInstagram(token: string) {
  return crida<{ user_id: string; username: string }>(`${IG}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`);
}

/** Allarga el token de llarga durada (n'hi ha per a uns 60 dies). */
export function refrescaTokenInstagram(token: string) {
  return crida<{ access_token: string; expires_in: number }>(
    `${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
}

/**
 * Publica una imatge amb el seu text. Instagram descarrega la imatge des de l'adreça pública
 * (per això primer es puja a la web de l'entitat). Torna l'enllaç a la publicació.
 */
export async function publicaInstagram(o: { token: string; igId: string; urlImatge: string; text: string }) {
  const contenidor = await crida<{ id: string }>(`${IG}/${o.igId}/media`, {
    image_url: o.urlImatge,
    caption: o.text,
    access_token: o.token,
  });
  // Cal esperar que Instagram hagi processat la imatge abans de publicar-la.
  for (let i = 0; i < 20; i++) {
    const estat = await crida<{ status_code: string }>(
      `${IG}/${contenidor.id}?fields=status_code&access_token=${encodeURIComponent(o.token)}`,
    );
    if (estat.status_code === 'FINISHED') break;
    if (estat.status_code === 'ERROR' || estat.status_code === 'EXPIRED')
      throw new Error("Instagram no ha pogut processar la imatge (comprova que és un JPG accessible des d'internet).");
    await espera(1500);
  }
  const publicada = await crida<{ id: string }>(`${IG}/${o.igId}/media_publish`, {
    creation_id: contenidor.id,
    access_token: o.token,
  });
  const info = await crida<{ permalink?: string }>(
    `${IG}/${publicada.id}?fields=permalink&access_token=${encodeURIComponent(o.token)}`,
  ).catch(() => ({ permalink: undefined }));
  return { id: publicada.id, url: info.permalink ?? null };
}

// ---------- Pàgina de Facebook ----------

export function paginaFacebook(paginaId: string, token: string) {
  return crida<{ id: string; name: string }>(`${FB}/${encodeURIComponent(paginaId)}?fields=id,name&access_token=${encodeURIComponent(token)}`);
}

export async function publicaFacebook(o: { token: string; paginaId: string; text: string; urlImatge: string | null; enllac: string | null }) {
  const r = o.urlImatge
    ? await crida<{ id: string; post_id?: string }>(`${FB}/${o.paginaId}/photos`, {
        url: o.urlImatge,
        message: o.enllac && !o.text.includes(o.enllac) ? `${o.text}\n\n${o.enllac}` : o.text,
        access_token: o.token,
      })
    : await crida<{ id: string }>(`${FB}/${o.paginaId}/feed`, {
        message: o.text,
        ...(o.enllac ? { link: o.enllac } : {}),
        access_token: o.token,
      });
  const id = (r as { post_id?: string }).post_id ?? r.id;
  return { id, url: `https://www.facebook.com/${id}` };
}
