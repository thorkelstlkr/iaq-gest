import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig } from '../db.ts';
import { HttpError, enter, idParam, notFound, text, textObligatori } from '../util.ts';
import { autor } from './auth.ts';
import { slug, textPla } from '../web/markdown.ts';
import { dataLlarga } from '../web/generador.ts';
import { idiomaDe, tr } from '../i18n.ts';
import { pujaFitxerPublic } from '../web/publica.ts';
import { compteInstagram, paginaFacebook, publicaFacebook, publicaInstagram, refrescaTokenInstagram } from '../xarxes/meta.ts';
import { dataLocal, sumaDies } from '../../shared/dates.ts';
import { registra } from '../auditoria.ts';

export const xarxesRouter = Router();

const XARXES = ['instagram', 'facebook', 'x', 'tiktok', 'youtube'];
const IMATGE_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

// ---------- Publicacions ----------

const SELECT = `
  SELECT p.id, p.text, p.enllac, (p.imatge IS NOT NULL) AS te_imatge, p.activitat_id, p.noticia_id, p.autor, p.creat_el,
         a.nom AS activitat_nom, n.titol AS noticia_titol,
         (SELECT json_group_array(json_object('xarxa', e.xarxa, 'estat', e.estat, 'metode', e.metode, 'url', e.url,
                                              'error', e.error, 'data', e.data, 'autor', e.autor))
            FROM xarxes_enviaments e WHERE e.publicacio_id = p.id) AS enviaments
    FROM xarxes_publicacions p
    LEFT JOIN activitats a ON a.id = p.activitat_id
    LEFT JOIN web_noticies n ON n.id = p.noticia_id`;

const ambEnviaments = (p: Record<string, unknown>) => ({ ...p, enviaments: JSON.parse(String(p.enviaments ?? '[]')) });

xarxesRouter.get('/publicacions', (_req, res) => {
  res.json(all<Record<string, unknown>>(`${SELECT} ORDER BY p.id DESC LIMIT 200`).map(ambEnviaments));
});

xarxesRouter.get('/publicacions/:id', (req, res) => {
  const id = idParam(req);
  const p = get<Record<string, unknown>>(`${SELECT} WHERE p.id = ?`, id) ?? notFound();
  const imatge = get<{ imatge: string | null }>('SELECT imatge FROM xarxes_publicacions WHERE id = ?', id)?.imatge ?? null;
  res.json({ ...ambEnviaments(p), imatge });
});

function llegir(body: Request['body']) {
  const imatge = text(body.imatge);
  if (imatge && (!IMATGE_RE.test(imatge) || imatge.length > 3_000_000)) throw new HttpError(400, 'La imatge no és vàlida o és massa gran.');
  const enllac = text(body.enllac);
  if (enllac && !/^https?:\/\/\S+$/i.test(enllac)) throw new HttpError(400, "L'enllaç ha de començar per https://");
  return {
    text: textObligatori(body.text, 'Text'),
    enllac,
    imatge,
    activitat_id: enter(body.activitat_id, 'Activitat'),
    noticia_id: enter(body.noticia_id, 'Notícia'),
  };
}

xarxesRouter.post('/publicacions', (req, res) => {
  const p = llegir(req.body);
  const { id } = run(
    'INSERT INTO xarxes_publicacions (text, enllac, imatge, activitat_id, noticia_id, autor) VALUES ($text, $enllac, $imatge, $activitat_id, $noticia_id, $autor)',
    { ...p, autor: autor(req) },
  );
  res.status(201).json({ id });
});

xarxesRouter.put('/publicacions/:id', (req, res) => {
  const id = idParam(req);
  const p = llegir(req.body);
  const { changes } = run(
    'UPDATE xarxes_publicacions SET text = $text, enllac = $enllac, imatge = $imatge, activitat_id = $activitat_id, noticia_id = $noticia_id WHERE id = $id',
    { ...p, id },
  );
  if (!changes) notFound();
  res.json({ id });
});

xarxesRouter.delete('/publicacions/:id', (req, res) => {
  const { changes } = run('DELETE FROM xarxes_publicacions WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

/** Proposta de text i imatge a partir d'una activitat o una notícia (amb l'enllaç a la seva pàgina web). */
xarxesRouter.get('/proposta', (req, res) => {
  const web = (getConfig('web_url') || '').replace(/\/+$/, '');
  const etiquetes = getConfig('xarxes_hashtags') || '';
  const activitatId = enter(req.query.activitat_id, 'Activitat');
  const noticiaId = enter(req.query.noticia_id, 'Notícia');
  if (activitatId) {
    const a = get<{ id: number; nom: string; data_inici: string; data_fi: string | null; lloc: string | null; descripcio: string | null; imatge: string | null; web_publica: number }>(
      'SELECT id, nom, data_inici, data_fi, lloc, descripcio, imatge, web_publica FROM activitats WHERE id = ?',
      activitatId,
    ) ?? notFound();
    const L = idiomaDe(req);
    const quan =
      a.data_fi && a.data_fi !== a.data_inici
        ? tr(L, 'Del {0} al {1}', dataLlarga(a.data_inici, false, L), dataLlarga(a.data_fi, false, L))
        : dataLlarga(a.data_inici, true, L);
    const enllac = web && a.web_publica ? `${web}/activitat-${slug(a.nom)}-${a.id}.html` : null;
    res.json({
      text: [a.nom, `${quan}${a.lloc ? ` · ${a.lloc}` : ''}`, a.descripcio ? textPla(a.descripcio, 400) : '', etiquetes].filter(Boolean).join('\n\n'),
      enllac,
      imatge: a.imatge,
    });
    return;
  }
  if (noticiaId) {
    const n = get<{ titol: string; slug: string; resum: string | null; contingut: string; imatge: string | null }>(
      'SELECT titol, slug, resum, contingut, imatge FROM web_noticies WHERE id = ?',
      noticiaId,
    ) ?? notFound();
    res.json({
      text: [n.titol, n.resum || textPla(n.contingut, 400), etiquetes].filter(Boolean).join('\n\n'),
      enllac: web ? `${web}/noticia-${n.slug}.html` : null,
      imatge: n.imatge,
    });
    return;
  }
  res.json({ text: etiquetes ? `\n\n${etiquetes}` : '', enllac: null, imatge: null });
});

// ---------- Publicar ----------

function registraEnviament(req: Request, publicacioId: number, xarxa: string, o: { estat: string; metode: string; url?: string | null; error?: string | null }) {
  run(
    'INSERT INTO xarxes_enviaments (publicacio_id, xarxa, estat, metode, url, error, autor) VALUES (?, ?, ?, ?, ?, ?, ?)',
    publicacioId, xarxa, o.estat, o.metode, o.url ?? null, o.error ?? null, autor(req),
  );
}

/** Publica ara mateix a Instagram o a la pàgina de Facebook, amb el text que l'usuari ha revisat. */
xarxesRouter.post('/publicacions/:id/publica', async (req, res) => {
  const id = idParam(req);
  const xarxa = String(req.body.xarxa);
  const textFinal = textObligatori(req.body.text, 'Text');
  const p = get<{ imatge: string | null; enllac: string | null }>('SELECT imatge, enllac FROM xarxes_publicacions WHERE id = ?', id) ?? notFound();

  // La imatge es puja a la web perquè Meta la pugui descarregar d'una adreça pública.
  async function urlImatge() {
    const m = IMATGE_RE.exec(p.imatge ?? '');
    if (!m) return null;
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    return pujaFitxerPublic(`xarxes/publicacio-${id}-${Date.now()}.${ext}`, Buffer.from(m[2], 'base64'));
  }

  try {
    let r: { url: string | null };
    if (xarxa === 'instagram') {
      const token = getConfig('xarxa_ig_token');
      const igId = getConfig('xarxa_ig_id');
      if (!token || !igId) throw new Error("Primer connecta el compte d'Instagram (Xarxes → Comptes).");
      if (!p.imatge) throw new Error('Instagram necessita una imatge.');
      r = await publicaInstagram({ token, igId, urlImatge: (await urlImatge())!, text: textFinal });
    } else if (xarxa === 'facebook') {
      const token = getConfig('xarxa_fb_token');
      const pagina = getConfig('xarxa_fb_pagina');
      if (!token || !pagina) throw new Error('Primer connecta la pàgina de Facebook (Xarxes → Comptes).');
      r = await publicaFacebook({ token, paginaId: pagina, text: textFinal, urlImatge: await urlImatge(), enllac: p.enllac });
    } else {
      throw new HttpError(400, 'Aquesta xarxa es publica des de la seva pròpia web.');
    }
    registraEnviament(req, id, xarxa, { estat: 'publicada', metode: 'api', url: r.url });
    res.json({ ok: true, url: r.url });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    const missatge = e instanceof Error ? e.message : String(e);
    registraEnviament(req, id, xarxa, { estat: 'error', metode: 'api', error: missatge });
    throw new HttpError(502, `No s'ha pogut publicar: ${missatge}`);
  }
});

/** L'usuari l'ha publicat ell mateix des de la xarxa: es deixa constància a l'historial. */
xarxesRouter.post('/publicacions/:id/manual', (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 FROM xarxes_publicacions WHERE id = ?', id)) notFound();
  const xarxa = String(req.body.xarxa);
  if (!XARXES.includes(xarxa)) throw new HttpError(400, 'Xarxa no vàlida.');
  const url = text(req.body.url);
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw new HttpError(400, "L'enllaç ha de començar per https://");
  registraEnviament(req, id, xarxa, { estat: 'publicada', metode: 'manual', url });
  res.json({ ok: true });
});

// ---------- Comptes ----------

function estatComptes() {
  return {
    instagram: getConfig('xarxa_ig_token')
      ? { usuari: getConfig('xarxa_ig_usuari'), caduca: getConfig('xarxa_ig_caduca') || null }
      : null,
    facebook: getConfig('xarxa_fb_token') ? { pagina: getConfig('xarxa_fb_nom') || getConfig('xarxa_fb_pagina') } : null,
    imatges_a_la_web: Boolean(getConfig('web_url') && getConfig('ftp_host') && getConfig('ftp_contrasenya')),
    hashtags: getConfig('xarxes_hashtags') || '',
    perfils: {
      instagram: getConfig('web_instagram') || '',
      facebook: getConfig('web_facebook') || '',
      x: getConfig('web_x') || '',
      tiktok: getConfig('web_tiktok') || '',
      youtube: getConfig('web_youtube') || '',
    },
  };
}

xarxesRouter.get('/comptes', (_req, res) => {
  res.json(estatComptes());
});

xarxesRouter.put('/comptes', async (req, res) => {
  const b = req.body;
  if ('hashtags' in b) setConfig('xarxes_hashtags', text(b.hashtags) ?? '');
  try {
    const igToken = text(b.instagram_token);
    if (igToken) {
      const compte = await compteInstagram(igToken);
      setConfig('xarxa_ig_token', igToken);
      setConfig('xarxa_ig_id', compte.user_id);
      setConfig('xarxa_ig_usuari', compte.username);
      // Els tokens de llarga durada valen uns 60 dies; es poden allargar abans que caduquin.
      setConfig('xarxa_ig_caduca', sumaDies(60));
    }
    const fbPagina = text(b.facebook_pagina);
    const fbToken = text(b.facebook_token);
    if (fbPagina && fbToken) {
      const pagina = await paginaFacebook(fbPagina, fbToken);
      setConfig('xarxa_fb_pagina', pagina.id);
      setConfig('xarxa_fb_nom', pagina.name);
      setConfig('xarxa_fb_token', fbToken);
    }
  } catch (e) {
    throw new HttpError(400, `Meta no ha acceptat les dades: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const [xarxa, claus] of [['instagram', ['xarxa_ig_token', 'xarxa_ig_id', 'xarxa_ig_usuari', 'xarxa_ig_caduca']], ['facebook', ['xarxa_fb_token', 'xarxa_fb_pagina', 'xarxa_fb_nom']]] as const)
    if (b.desconnecta === xarxa) for (const k of claus) setConfig(k, '');
  registra(req, 'configura', 'xarxes', null, `Claus canviades: ${Object.keys(req.body ?? {}).join(', ')}`); // només els noms, mai els valors
  res.json(estatComptes());
});

xarxesRouter.post('/comptes/instagram/refresca', async (_req, res) => {
  const token = getConfig('xarxa_ig_token');
  if (!token) throw new HttpError(400, "No hi ha cap compte d'Instagram connectat.");
  try {
    const r = await refrescaTokenInstagram(token);
    setConfig('xarxa_ig_token', r.access_token);
    setConfig('xarxa_ig_caduca', dataLocal(new Date(Date.now() + r.expires_in * 1000)));
    res.json(estatComptes());
  } catch (e) {
    throw new HttpError(502, `No s'ha pogut allargar el token: ${e instanceof Error ? e.message : String(e)}`);
  }
});
