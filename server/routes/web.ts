import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig } from '../db.ts';
import { HttpError, bool, data, enter, idParam, notFound, text, textObligatori } from '../util.ts';
import { slug } from '../web/markdown.ts';
import { esIdioma } from '../i18n.ts';
import { dissenyDesat, generaWeb } from '../web/generador.ts';
import { normalitzaDisseny } from '../../shared/disseny.ts';
import { estatWeb, marcaCanvisWeb, provaFtp, publicaWeb } from '../web/publica.ts';
import { avui } from '../../shared/dates.ts';
import { registra } from '../auditoria.ts';

export const webRouter = Router();

const IMATGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
// Noms de fitxer que ja fa servir la web generada.
const RESERVATS = ['index', 'agenda', 'noticies', 'qui-som', 'fes-te-soci', 'contacte', 'avis-legal', 'privacitat', '404', 'estil', 'imatges', 'sitemap', 'robots'];

function imatge(v: unknown): string | null {
  const i = text(v);
  if (i && (!IMATGE_RE.test(i) || i.length > 2_000_000)) throw new HttpError(400, "La imatge no és vàlida o és massa gran.");
  return i;
}

/** Slug únic dins d'una taula (afegeix -2, -3… si cal). */
function slugUnic(taula: 'web_noticies' | 'web_pagines', base: string, id: number | null) {
  let s = slug(base);
  if (taula === 'web_pagines' && RESERVATS.includes(s)) s = `${s}-pagina`;
  let candidat = s;
  for (let n = 2; get(`SELECT 1 FROM ${taula} WHERE slug = ? AND id IS NOT ?`, candidat, id); n++) candidat = `${s}-${n}`;
  return candidat;
}

// ---------- Notícies ----------

webRouter.get('/noticies', (_req, res) => {
  res.json(
    all(
      `SELECT n.id, n.titol, n.slug, n.data, n.resum, n.publicada, n.activitat_id, (n.imatge IS NOT NULL) AS te_imatge,
              a.nom AS activitat_nom
         FROM web_noticies n LEFT JOIN activitats a ON a.id = n.activitat_id
        ORDER BY n.data DESC, n.id DESC`,
    ),
  );
});

webRouter.get('/noticies/:id', (req, res) => {
  res.json(get('SELECT * FROM web_noticies WHERE id = ?', idParam(req)) ?? notFound());
});

function llegirNoticia(body: Request['body'], id: number | null) {
  const titol = textObligatori(body.titol, 'Títol');
  return {
    titol,
    slug: slugUnic('web_noticies', text(body.slug) ?? titol, id),
    data: data(body.data, 'Data') ?? avui(),
    resum: text(body.resum),
    contingut: text(body.contingut) ?? '',
    imatge: imatge(body.imatge),
    activitat_id: enter(body.activitat_id, 'Activitat'),
    publicada: bool(body.publicada ?? 1),
  };
}
const CAMPS_NOTICIA = ['titol', 'slug', 'data', 'resum', 'contingut', 'imatge', 'activitat_id', 'publicada'];

webRouter.post('/noticies', (req, res) => {
  const n = llegirNoticia(req.body, null);
  const { id } = run(`INSERT INTO web_noticies (${CAMPS_NOTICIA.join(', ')}) VALUES (${CAMPS_NOTICIA.map((c) => '$' + c).join(', ')})`, n);
  marcaCanvisWeb();
  res.status(201).json(get('SELECT * FROM web_noticies WHERE id = ?', id));
});

webRouter.put('/noticies/:id', (req, res) => {
  const id = idParam(req);
  const n = llegirNoticia(req.body, id);
  const { changes } = run(`UPDATE web_noticies SET ${CAMPS_NOTICIA.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`, { ...n, id });
  if (!changes) notFound();
  marcaCanvisWeb();
  res.json(get('SELECT * FROM web_noticies WHERE id = ?', id));
});

webRouter.delete('/noticies/:id', (req, res) => {
  const { changes } = run('DELETE FROM web_noticies WHERE id = ?', idParam(req));
  if (!changes) notFound();
  marcaCanvisWeb();
  res.status(204).end();
});

// ---------- Pàgines pròpies ----------

webRouter.get('/pagines', (_req, res) => {
  res.json(all('SELECT id, titol, slug, ordre, publicada FROM web_pagines ORDER BY ordre, titol'));
});

webRouter.get('/pagines/:id', (req, res) => {
  res.json(get('SELECT * FROM web_pagines WHERE id = ?', idParam(req)) ?? notFound());
});

function llegirPagina(body: Request['body'], id: number | null) {
  const titol = textObligatori(body.titol, 'Títol');
  return {
    titol,
    slug: slugUnic('web_pagines', text(body.slug) ?? titol, id),
    contingut: text(body.contingut) ?? '',
    ordre: enter(body.ordre, 'Ordre') ?? 0,
    publicada: bool(body.publicada ?? 1),
  };
}

webRouter.post('/pagines', (req, res) => {
  const p = llegirPagina(req.body, null);
  const { id } = run('INSERT INTO web_pagines (titol, slug, contingut, ordre, publicada) VALUES ($titol, $slug, $contingut, $ordre, $publicada)', p);
  marcaCanvisWeb();
  res.status(201).json(get('SELECT * FROM web_pagines WHERE id = ?', id));
});

webRouter.put('/pagines/:id', (req, res) => {
  const id = idParam(req);
  const p = llegirPagina(req.body, id);
  const { changes } = run(
    'UPDATE web_pagines SET titol = $titol, slug = $slug, contingut = $contingut, ordre = $ordre, publicada = $publicada WHERE id = $id',
    { ...p, id },
  );
  if (!changes) notFound();
  marcaCanvisWeb();
  res.json(get('SELECT * FROM web_pagines WHERE id = ?', id));
});

webRouter.delete('/pagines/:id', (req, res) => {
  const { changes } = run('DELETE FROM web_pagines WHERE id = ?', idParam(req));
  if (!changes) notFound();
  marcaCanvisWeb();
  res.status(204).end();
});

// ---------- Textos, aparença i xarxes ----------

const CLAUS_WEB = [
  'web_idioma', 'web_url', 'web_color', 'web_descripcio', 'web_text_inici', 'web_text_qui_som', 'web_text_soci',
  'web_instagram', 'web_facebook', 'web_tiktok', 'web_youtube', 'web_x',
] as const;

const llegirConfigWeb = () => Object.fromEntries(CLAUS_WEB.map((k) => [k, getConfig(k) ?? '']));

webRouter.get('/config', (_req, res) => {
  res.json(llegirConfigWeb());
});

webRouter.put('/config', (req, res) => {
  if (req.body.web_idioma && !esIdioma(req.body.web_idioma)) throw new HttpError(400, 'Idioma no vàlid.');
  const color = text(req.body.web_color);
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) throw new HttpError(400, 'El color no és vàlid.');
  for (const k of ['web_url', 'web_instagram', 'web_facebook', 'web_tiktok', 'web_youtube', 'web_x']) {
    const v = text(req.body[k]);
    if (v && !/^https?:\/\/\S+$/i.test(v)) throw new HttpError(400, `L'adreça «${v}» ha de començar per https://`);
  }
  for (const k of CLAUS_WEB) if (k in req.body) setConfig(k, text(req.body[k]) ?? '');
  marcaCanvisWeb();
  registra(req, 'configura', 'web', null, `Claus canviades: ${Object.keys(req.body ?? {}).join(', ')}`); // només els noms, mai els valors
  res.json(llegirConfigWeb());
});

// ---------- Disseny (colors, fonts, capçalera, peu, blocs de la portada) ----------

webRouter.get('/disseny', (_req, res) => {
  res.json({ disseny: dissenyDesat(), logo: getConfig('web_logo') || null, heroi: getConfig('web_heroi') || null, logo_entitat: Boolean(getConfig('logo')) });
});

/** Imatges del disseny: undefined = no es toquen, null o '' = es treuen. */
const imatgeDisseny = (v: unknown) => (v === undefined ? undefined : imatge(v));

webRouter.put('/disseny', (req, res) => {
  const d = normalitzaDisseny(req.body?.disseny, getConfig('web_color'));
  const logo = imatgeDisseny(req.body?.logo);
  const heroi = imatgeDisseny(req.body?.heroi);
  setConfig('web_disseny', JSON.stringify(d));
  setConfig('web_color', d.colors.principal); // compatibilitat amb versions anteriors
  if (logo !== undefined) setConfig('web_logo', logo ?? '');
  if (heroi !== undefined) setConfig('web_heroi', heroi ?? '');
  marcaCanvisWeb();
  registra(req, 'configura', 'web', null, 'Disseny de la web');
  res.json({ disseny: d, logo: getConfig('web_logo') || null, heroi: getConfig('web_heroi') || null, logo_entitat: Boolean(getConfig('logo')) });
});

// ---------- FTP ----------

const llegirFtp = () => ({
  ftp_host: getConfig('ftp_host') ?? '',
  ftp_port: getConfig('ftp_port') ?? '21',
  ftp_usuari: getConfig('ftp_usuari') ?? '',
  ftp_carpeta: getConfig('ftp_carpeta') ?? '/',
  ftp_segur: getConfig('ftp_segur') ?? 'ftps',
  te_contrasenya: Boolean(getConfig('ftp_contrasenya')),
});

webRouter.get('/ftp', (_req, res) => {
  res.json(llegirFtp());
});

webRouter.put('/ftp', (req, res) => {
  const port = enter(req.body.ftp_port, 'Port') ?? 21;
  if (port < 1 || port > 65535) throw new HttpError(400, 'El port no és vàlid.');
  const segur = String(req.body.ftp_segur ?? 'ftps');
  if (!['ftps', 'ftps_sense_verificar', 'ftp'].includes(segur)) throw new HttpError(400, 'Tipus de connexió no vàlid.');
  setConfig('ftp_host', text(req.body.ftp_host)?.replace(/^ftps?:\/\//i, '') ?? '');
  setConfig('ftp_port', String(port));
  setConfig('ftp_usuari', text(req.body.ftp_usuari) ?? '');
  setConfig('ftp_carpeta', text(req.body.ftp_carpeta) ?? '/');
  setConfig('ftp_segur', segur);
  const contrasenya = text(req.body.ftp_contrasenya);
  if (contrasenya) setConfig('ftp_contrasenya', contrasenya);
  registra(req, 'configura', 'ftp', null, `Claus canviades: ${Object.keys(req.body ?? {}).join(', ')}`); // només els noms, mai els valors
  res.json(llegirFtp());
});

webRouter.post('/ftp/prova', async (_req, res) => {
  try {
    res.json({ missatge: await provaFtp() });
  } catch (e) {
    throw new HttpError(502, `No s'ha pogut connectar: ${e instanceof Error ? e.message : String(e)}`);
  }
});

// ---------- Estat, previsualització i publicació ----------

webRouter.get('/estat', (_req, res) => {
  res.json(estatWeb());
});

webRouter.put('/auto', (req, res) => {
  setConfig('web_auto', bool(req.body.auto) ? '1' : '0');
  res.json(estatWeb());
});

/** Torna una pàgina de la web amb l'estil i les imatges incrustats, per veure-la dins del programa. */
webRouter.get('/previsualitzacio', (req, res) => {
  res.json(previsualitza(String(req.query.pagina ?? 'index.html')));
});

/** Previsualització amb un disseny encara no desat (editor de disseny). */
webRouter.post('/previsualitzacio', (req, res) => {
  const b = req.body ?? {};
  res.json(
    previsualitza(String(b.pagina ?? 'index.html'), {
      disseny: b.disseny,
      imatges: { logo: imatgeDisseny(b.logo), heroi: imatgeDisseny(b.heroi) },
    }),
  );
});

function previsualitza(pagina: string, opcions: { disseny?: unknown; imatges?: { logo?: string | null; heroi?: string | null } } = {}) {
  const fitxers = generaWeb({ previsualitzacio: true, ...opcions });
  const html = fitxers.get(pagina) ?? fitxers.get('404.html');
  // Llista de pàgines per al selector de la previsualització (amb el títol de cada una).
  const pagines = [...fitxers.keys()]
    .filter((f) => f.endsWith('.html') && f !== '404.html')
    .map((fitxer) => ({ fitxer, titol: /<title>([^<]*)<\/title>/.exec(String(fitxers.get(fitxer)))?.[1]?.split(' · ')[0] ?? fitxer }));
  return { pagina: fitxers.has(pagina) ? pagina : '404.html', html: String(html), pagines };
}

webRouter.post('/publica', async (_req, res) => {
  try {
    const r = await publicaWeb();
    res.json({ ...r, estat: estatWeb() });
  } catch (e) {
    throw new HttpError(502, e instanceof Error ? e.message : String(e));
  }
});
