// Genera la web pública de l'entitat (HTML estàtic) a partir de les dades del programa.
// El resultat és un mapa «camí del fitxer → contingut» que es pot previsualitzar o pujar per FTP.

import { all, getConfig } from '../db.ts';
import { escapa, markdown, slug, textPla } from './markdown.ts';
import { esIdioma, tr } from '../i18n.ts';
import type { Idioma } from '../i18n.ts';
import { avui } from '../../shared/dates.ts';
import { font, normalitzaDisseny, textSobre, urlGoogleFonts } from '../../shared/disseny.ts';
import type { BlocInici, Disseny, IdMenu } from '../../shared/disseny.ts';

export type Fitxers = Map<string, string | Buffer>;

interface ActivitatWeb {
  id: number;
  nom: string;
  data_inici: string;
  data_fi: string | null;
  lloc: string | null;
  descripcio: string | null;
  objectius: string;
  imatge: string | null;
}

interface NoticiaWeb {
  id: number;
  titol: string;
  slug: string;
  data: string;
  resum: string | null;
  contingut: string;
  imatge: string | null;
}

const MESOS: Record<Idioma, string[]> = {
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DIES: Record<Idioma, string[]> = {
  ca: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const LOCALES: Record<Idioma, string> = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

/** «2026-10-17» → «17 d'octubre de 2026» / «17 de octubre de 2026» / «17 October 2026» */
export function dataLlarga(iso: string, ambDia = false, idioma: Idioma = 'ca'): string {
  const [a, m, d] = iso.split('-').map(Number);
  const mes = MESOS[idioma][m - 1];
  const nomDia = ambDia ? DIES[idioma][new Date(a, m - 1, d).getDay()] : '';
  if (idioma === 'en') return `${nomDia ? `${nomDia}, ` : ''}${d} ${mes} ${a}`;
  const de = idioma === 'ca' && /^[aeiou]/.test(mes) ? "d'" : 'de ';
  return `${nomDia ? `${nomDia}, ` : ''}${d} ${de}${mes} de ${a}`;
}

/** Idioma de la web pública (pot ser diferent del del programa). */
export const idiomaWeb = (): Idioma => {
  const v = getConfig('web_idioma') || getConfig('idioma');
  return esIdioma(v) ? v : 'ca';
};

const XARXES: [string, string][] = [
  ['web_instagram', 'Instagram'],
  ['web_facebook', 'Facebook'],
  ['web_tiktok', 'TikTok'],
  ['web_youtube', 'YouTube'],
  ['web_x', 'X'],
];

/**
 * Converteix un data URI en fitxer i en torna el camí relatiu (o null si no hi ha imatge).
 * En mode previsualització no crea fitxers: torna el mateix data URI per incrustar-lo.
 */
function desaImatge(fitxers: Fitxers, dataUri: string | null | undefined, nom: string, previsualitzacio = false): string | null {
  const m = /^data:image\/(jpeg|png|webp|svg\+xml);base64,(.+)$/.exec(dataUri ?? '');
  if (!m) return null;
  if (previsualitzacio) return dataUri!;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'svg+xml' ? 'svg' : m[1];
  const cami = `imatges/${nom}.${ext}`;
  fitxers.set(cami, Buffer.from(m[2], 'base64'));
  return cami;
}


/**
 * previsualitzacio = true: cada pàgina porta l'estil i les imatges incrustats, perquè es pugui
 * mostrar dins del programa sense pujar res (i sense Buffer, que no existeix a la demo).
 */
export interface OpcionsWeb {
  previsualitzacio?: boolean;
  /** Disseny sense desar (editor de disseny): si no s'indica, el desat a config.web_disseny. */
  disseny?: unknown;
  /** Imatges sense desar: undefined = les desades; null = cap. */
  imatges?: { logo?: string | null; heroi?: string | null };
}

/** Disseny desat (o el per defecte, amb el color principal antic si n'hi havia). */
export function dissenyDesat(): Disseny {
  let brut: unknown = null;
  try {
    brut = JSON.parse(getConfig('web_disseny') || 'null');
  } catch {
    brut = null;
  }
  return normalitzaDisseny(brut, getConfig('web_color'));
}

export function generaWeb({ previsualitzacio = false, disseny, imatges = {} }: OpcionsWeb = {}): Fitxers {
  const fitxers: Fitxers = new Map();
  const L = idiomaWeb();
  const w = (text: string, ...valors: unknown[]) => tr(L, text, ...valors);
  const c = (k: string) => getConfig(k) ?? '';
  const nom = c('nom') || w('Associació');
  const urlBase = c('web_url').replace(/\/+$/, '');
  const d = disseny === undefined ? dissenyDesat() : normalitzaDisseny(disseny, c('web_color'));

  const estilCss = estil(d);
  const googleFonts = urlGoogleFonts(d);
  const img = (dataUri: string | null | undefined, nomFitxer: string) => desaImatge(fitxers, dataUri, nomFitxer, previsualitzacio);
  // Logotip de la web (si no n'hi ha cap de propi, el de l'entitat) i imatge de fons de la portada.
  const logo = img(imatges.logo !== undefined ? imatges.logo : c('web_logo') || c('logo'), 'logo');
  const heroiImg = img(imatges.heroi !== undefined ? imatges.heroi : c('web_heroi'), 'portada');
  const finalitats = all<{ codi: string; curt: string; text: string }>('SELECT codi, curt, text FROM finalitats ORDER BY ordre, codi');
  const activitats = all<ActivitatWeb>(
    `SELECT id, nom, data_inici, data_fi, lloc, descripcio, objectius, imatge FROM activitats
      WHERE web_publica = 1 AND COALESCE(estat, '') <> 'anul·lada' ORDER BY data_inici DESC`,
  );
  const noticies = all<NoticiaWeb>(
    'SELECT id, titol, slug, data, resum, contingut, imatge FROM web_noticies WHERE publicada = 1 AND data <= ? ORDER BY data DESC, id DESC',
    avui(),
  );
  const pagines = all<{ titol: string; slug: string; contingut: string }>(
    'SELECT titol, slug, contingut FROM web_pagines WHERE publicada = 1 ORDER BY ordre, titol',
  );
  const quotes = all<{ nom: string; import_cents: number; descripcio: string | null }>(
    'SELECT nom, import_cents, descripcio FROM tipus_quota WHERE actiu = 1 ORDER BY import_cents DESC, nom',
  );

  const fitxerActivitat = (a: ActivitatWeb) => `activitat-${slug(a.nom)}-${a.id}.html`;
  const fitxerNoticia = (n: NoticiaWeb) => `noticia-${n.slug}.html`;
  const imatgesActivitat = new Map(activitats.map((a) => [a.id, img(a.imatge, `activitat-${a.id}`)]));
  const imatgesNoticia = new Map(noticies.map((n) => [n.id, img(n.imatge, `noticia-${n.id}`)]));
  const finalitat = (codi: string) => finalitats.find((f) => f.codi === codi);

  // Menú en l'ordre triat al disseny; les pàgines amagades del menú es continuen generant.
  const ELEMENTS_MENU: Record<IdMenu, [string, string][]> = {
    inici: [['index.html', w('Inici')]],
    agenda: [['agenda.html', w('Agenda')]],
    noticies: [['noticies.html', w('Notícies')]],
    'qui-som': [['qui-som.html', w('Qui som')]],
    pagines: pagines.map((p): [string, string] => [`${p.slug}.html`, p.titol]),
    soci: [['fes-te-soci.html', w("Fes-te'n soci")]],
    contacte: [['contacte.html', w('Contacte')]],
  };
  const menu = d.menu.ordre.filter((m) => !d.menu.amagats.includes(m)).flatMap((m) => ELEMENTS_MENU[m]);

  const xarxes = XARXES.filter(([k]) => /^https?:\/\//.test(c(k))).map(([k, n]) => ({ url: c(k), nom: n }));

  function pagina(o: { fitxer: string; titol: string; descripcio?: string; cos: string; imatge?: string | null; esInici?: boolean }) {
    const titolComplet = o.esInici ? `${nom}${c('lema') ? ` · ${c('lema')}` : ''}` : `${o.titol} · ${nom}`;
    const descripcio = o.descripcio || c('web_descripcio') || c('lema') || nom;
    const og = o.imatge ?? logo;
    const enllacos = menu.map(([f, t]) => `<a href="${f}"${f === o.fitxer ? ' aria-current="page"' : ''}>${escapa(t)}</a>`).join('');
    const html = `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapa(titolComplet)}</title>
<meta name="description" content="${escapa(descripcio)}">
<meta property="og:title" content="${escapa(o.esInici ? nom : o.titol)}">
<meta property="og:description" content="${escapa(descripcio)}">
<meta property="og:type" content="${o.esInici ? 'website' : 'article'}">
${urlBase ? `<meta property="og:url" content="${escapa(`${urlBase}/${o.fitxer === 'index.html' ? '' : o.fitxer}`)}">\n` : ''}${og && urlBase && !previsualitzacio ? `<meta property="og:image" content="${escapa(`${urlBase}/${og}`)}">\n` : ''}${logo ? `<link rel="icon" href="${logo}">\n` : ''}${googleFonts ? `<link rel="stylesheet" href="${previsualitzacio ? googleFonts : 'fonts.css'}">\n` : ''}${previsualitzacio ? `<style>${estilCss}</style>` : '<link rel="stylesheet" href="estil.css">'}
</head>
<body class="${d.targetes.estil === 'compacta' ? 'targetes-compactes' : ''}">
<a class="salta" href="#contingut">${w('Salta al contingut')}</a>
<header class="cap cap-${d.capcalera.disposicio}${d.capcalera.fixa ? ' cap-fixa' : ''}">
  <div class="ample cap-dins">
    <a class="marca" href="index.html">${logo ? `<img src="${logo}" alt="${escapa(nom)}">` : `<span class="marca-inicial">${escapa(nom[0] ?? '')}</span>`}${d.capcalera.mostra_nom || !logo ? `<span>${escapa(nom)}</span>` : ''}</a>
    <nav class="menu" aria-label="${w('Menú principal')}">${enllacos}</nav>
    <details class="menu-mobil">
      <summary>${w('Menú')}</summary>
      <nav aria-label="${w('Menú')}">${enllacos}</nav>
    </details>
  </div>
</header>
<main id="contingut">
${o.cos}
</main>
<footer class="peu peu-${d.peu.alineacio}">
  <div class="ample peu-dins">
    ${d.peu.mostra_contacte ? `<div>
      <strong>${escapa(c('nom_complet') || nom)}</strong>
      ${c('adreca') ? `<p>${escapa(c('adreca'))}</p>` : ''}
      ${c('email') ? `<p><a href="mailto:${escapa(c('email'))}">${escapa(c('email'))}</a></p>` : ''}
      ${c('telefon') ? `<p>${escapa(c('telefon'))}</p>` : ''}
    </div>` : ''}
    ${d.peu.text ? `<div class="peu-text">${markdown(d.peu.text)}</div>` : ''}
    ${d.peu.mostra_xarxes && xarxes.length ? `<ul class="xarxes">${xarxes.map((x) => `<li><a href="${escapa(x.url)}" rel="noopener" target="_blank">${x.nom}</a></li>`).join('')}</ul>` : ''}
  </div>
  <div class="ample peu-legal">${d.peu.mostra_legal && c('nif') ? `${w('NIF')} ${escapa(c('nif'))} · ` : ''}${d.peu.mostra_legal && c('num_registre') ? `${w("Registre d'associacions núm. {0}", escapa(c('num_registre')))} · ` : ''}© ${new Date().getFullYear()} ${escapa(nom)} · <a href="avis-legal.html">${w('Avís legal')}</a> · <a href="privacitat.html">${w('Privacitat')}</a></div>
</footer>
</body>
</html>
`;
    fitxers.set(o.fitxer, html);
  }

  // ---------- Blocs reutilitzables ----------

  const dates = (a: ActivitatWeb) =>
    a.data_fi && a.data_fi !== a.data_inici
      ? w('Del {0} al {1}', dataLlarga(a.data_inici, false, L), dataLlarga(a.data_fi, false, L))
      : dataLlarga(a.data_inici, true, L);

  const targetaActivitat = (a: ActivitatWeb) => {
    const foto = imatgesActivitat.get(a.id);
    const [, m, d] = a.data_inici.split('-').map(Number);
    return `<article class="targeta">
  ${foto ? `<img class="targeta-img" src="${foto}" alt="" loading="lazy">` : `<div class="targeta-data" aria-hidden="true"><span>${d}</span>${MESOS[L][m - 1].slice(0, 3)}</div>`}
  <div class="targeta-cos">
    <p class="meta">${escapa(dates(a))}${a.lloc ? ` · ${escapa(a.lloc)}` : ''}</p>
    <h3><a href="${fitxerActivitat(a)}">${escapa(a.nom)}</a></h3>
    ${a.descripcio ? `<p>${escapa(textPla(a.descripcio, 160))}</p>` : ''}
  </div>
</article>`;
  };

  const targetaNoticia = (n: NoticiaWeb) => {
    const foto = imatgesNoticia.get(n.id);
    return `<article class="targeta">
  ${foto ? `<img class="targeta-img" src="${foto}" alt="" loading="lazy">` : ''}
  <div class="targeta-cos">
    <p class="meta">${escapa(dataLlarga(n.data, false, L))}</p>
    <h3><a href="${fitxerNoticia(n)}">${escapa(n.titol)}</a></h3>
    <p>${escapa(n.resum || textPla(n.contingut, 180))}</p>
  </div>
</article>`;
  };

  const properes = activitats.filter((a) => (a.data_fi ?? a.data_inici) >= avui()).reverse();
  const passades = activitats.filter((a) => (a.data_fi ?? a.data_inici) < avui());

  // ---------- Inici (per blocs, en l'ordre del disseny) ----------

  const titolBloc = (b: BlocInici, defecte: string) => escapa(b.titol || defecte);
  const seccio = (b: BlocInici, contingut: string) =>
    `<section class="bloc${b.fons === 'color' ? ' bloc-color' : b.fons === 'suau' ? ' bloc-suau' : ''}" id="bloc-${escapa(b.id)}">
  <div class="ample">
${contingut}
  </div>
</section>`;

  function blocInici(b: BlocInici): string {
    switch (b.tipus) {
      case 'heroi': {
        const estilHeroi = heroiImg ? ` style="--heroi-img: url('${heroiImg}'); --heroi-fosc: ${d.heroi.enfosquiment / 100}"` : '';
        return `<section class="heroi heroi-${d.heroi.alcada} heroi-${d.heroi.alineacio}${heroiImg ? ' heroi-amb-imatge' : ''}" id="bloc-heroi"${estilHeroi}>
  <div class="ample">
    <h1>${escapa(b.titol || nom)}</h1>
    ${c('lema') ? `<p class="lema">${escapa(c('lema'))}</p>` : ''}
    ${c('web_text_inici') ? `<div class="text">${markdown(c('web_text_inici'))}</div>` : ''}
    ${d.heroi.botons ? `<p class="botons"><a class="boto" href="fes-te-soci.html">${w("Fes-te'n soci")}</a> <a class="boto boto-clar" href="agenda.html">${w("Veure l'agenda")}</a></p>` : ''}
  </div>
</section>`;
      }
      case 'activitats':
        return properes.length
          ? seccio(b, `    <h2>${titolBloc(b, w('Properes activitats'))}</h2>
    <div class="graella">${properes.slice(0, b.quantitat).map(targetaActivitat).join('\n')}</div>
    <p><a href="agenda.html">${w("Tota l'agenda →")}</a></p>`)
          : '';
      case 'noticies':
        return noticies.length
          ? seccio(b, `    <h2>${titolBloc(b, w('Notícies'))}</h2>
    <div class="graella">${noticies.slice(0, b.quantitat).map(targetaNoticia).join('\n')}</div>
    <p><a href="noticies.html">${w('Totes les notícies →')}</a></p>`)
          : '';
      case 'finalitats':
        return finalitats.length
          ? seccio(b, `    <h2>${titolBloc(b, w('Què fem'))}</h2>
    <ul class="finalitats">${finalitats.slice(0, 6).map((f) => `<li>${escapa(f.curt)}</li>`).join('')}</ul>
    <p><a href="qui-som.html">${w("Coneix l'entitat →")}</a></p>`)
          : '';
      case 'soci':
        return seccio(b, `    <h2>${titolBloc(b, w("Fes-te'n soci"))}</h2>
    ${c('web_text_soci') ? `<div class="text">${markdown(c('web_text_soci'))}</div>` : `<p>${w("Fer-te'n soci és la millor manera de donar suport a {0} i participar en totes les seves activitats.", escapa(nom))}</p>`}
    <p class="botons"><a class="boto" href="fes-te-soci.html">${w("Fes-te'n soci")}</a></p>`);
      case 'contacte':
        return c('email') || c('telefon') || c('adreca')
          ? seccio(b, `    <h2>${titolBloc(b, w('Contacte'))}</h2>
    <dl class="contacte">
      ${c('email') ? `<dt>${w('Correu electrònic')}</dt><dd><a href="mailto:${escapa(c('email'))}">${escapa(c('email'))}</a></dd>` : ''}
      ${c('telefon') ? `<dt>${w('Telèfon')}</dt><dd>${escapa(c('telefon'))}</dd>` : ''}
      ${c('adreca') ? `<dt>${w('Adreça')}</dt><dd>${escapa(c('adreca'))}</dd>` : ''}
    </dl>`)
          : '';
      case 'xarxes':
        return xarxes.length
          ? seccio(b, `    <h2>${titolBloc(b, w('Segueix-nos'))}</h2>
    <p class="botons">${xarxes.map((x) => `<a class="boto boto-clar" href="${escapa(x.url)}" rel="noopener" target="_blank">${x.nom}</a>`).join(' ')}</p>`)
          : '';
      case 'text':
        return b.titol || b.text
          ? seccio(b, `    ${b.titol ? `<h2>${escapa(b.titol)}</h2>` : ''}
    ${b.text ? `<div class="text">${markdown(b.text)}</div>` : ''}`)
          : '';
    }
  }

  pagina({
    fitxer: 'index.html',
    titol: w('Inici'),
    esInici: true,
    imatge: heroiImg,
    cos: d.inici.filter((b) => b.visible).map(blocInici).filter(Boolean).join('\n'),
  });

  // ---------- Agenda i activitats ----------

  pagina({
    fitxer: 'agenda.html',
    titol: w('Agenda'),
    descripcio: w('Activitats de {0}', nom),
    cos: `<div class="ample bloc">
  <h1>${w('Agenda')}</h1>
  <h2>${w('Properes activitats')}</h2>
  ${properes.length ? `<div class="graella">${properes.map(targetaActivitat).join('\n')}</div>` : `<p class="buit">${w('Aviat anunciarem noves activitats.')}</p>`}
  ${passades.length ? `<h2>${w('Activitats fetes')}</h2><div class="graella">${passades.slice(0, 24).map(targetaActivitat).join('\n')}</div>` : ''}
</div>`,
  });

  for (const a of activitats) {
    const foto = imatgesActivitat.get(a.id);
    const fins = a.objectius.split(',').map(finalitat).filter(Boolean);
    pagina({
      fitxer: fitxerActivitat(a),
      titol: a.nom,
      descripcio: a.descripcio ? textPla(a.descripcio, 160) : `${dates(a)}${a.lloc ? ` · ${a.lloc}` : ''}`,
      imatge: foto,
      cos: `<article class="ample estret bloc">
  <p class="meta"><a href="agenda.html">${w('Agenda')}</a></p>
  <h1>${escapa(a.nom)}</h1>
  <p class="destacat">${escapa(dates(a))}${a.lloc ? `<br>${escapa(a.lloc)}` : ''}</p>
  ${foto ? `<img class="imatge-principal" src="${foto}" alt="">` : ''}
  ${a.descripcio ? `<div class="text">${markdown(a.descripcio)}</div>` : ''}
  ${fins.length ? `<p class="etiquetes">${fins.map((f) => `<span>${escapa(f!.curt)}</span>`).join('')}</p>` : ''}
</article>`,
    });
  }

  // ---------- Notícies ----------

  pagina({
    fitxer: 'noticies.html',
    titol: w('Notícies'),
    cos: `<div class="ample bloc">
  <h1>${w('Notícies')}</h1>
  ${noticies.length ? `<div class="graella">${noticies.map(targetaNoticia).join('\n')}</div>` : `<p class="buit">${w('Encara no hi ha notícies.')}</p>`}
</div>`,
  });

  for (const n of noticies) {
    const foto = imatgesNoticia.get(n.id);
    pagina({
      fitxer: fitxerNoticia(n),
      titol: n.titol,
      descripcio: n.resum || textPla(n.contingut, 160),
      imatge: foto,
      cos: `<article class="ample estret bloc">
  <p class="meta"><a href="noticies.html">${w('Notícies')}</a> · ${escapa(dataLlarga(n.data, false, L))}</p>
  <h1>${escapa(n.titol)}</h1>
  ${n.resum ? `<p class="destacat">${escapa(n.resum)}</p>` : ''}
  ${foto ? `<img class="imatge-principal" src="${foto}" alt="">` : ''}
  <div class="text">${markdown(n.contingut)}</div>
</article>`,
    });
  }

  // ---------- Qui som ----------

  pagina({
    fitxer: 'qui-som.html',
    titol: w('Qui som'),
    cos: `<div class="ample estret bloc">
  <h1>${w('Qui som')}</h1>
  ${c('nom_complet') ? `<p class="destacat">${escapa(c('nom_complet'))}</p>` : ''}
  ${c('web_text_qui_som') ? `<div class="text">${markdown(c('web_text_qui_som'))}</div>` : ''}
  ${finalitats.length ? `<h2>${w('Les nostres finalitats')}</h2>
  <ol class="llista-finalitats">${finalitats.map((f) => `<li><strong>${escapa(f.curt)}.</strong> ${escapa(f.text)}</li>`).join('')}</ol>` : ''}
</div>`,
  });

  // ---------- Fes-te'n soci ----------

  const eur = (cents: number) => (cents / 100).toLocaleString(LOCALES[L], { style: 'currency', currency: 'EUR' });
  pagina({
    fitxer: 'fes-te-soci.html',
    titol: w("Fes-te'n soci"),
    cos: `<div class="ample estret bloc">
  <h1>${w("Fes-te'n soci")}</h1>
  ${c('web_text_soci') ? `<div class="text">${markdown(c('web_text_soci'))}</div>` : `<p>${w("Fer-te'n soci és la millor manera de donar suport a {0} i participar en totes les seves activitats.", escapa(nom))}</p>`}
  ${quotes.length ? `<h2>${w('Quotes anuals')}</h2>
  <table class="quotes">${quotes.map((q) => `<tr><th>${escapa(q.nom)}${q.descripcio ? `<small>${escapa(q.descripcio)}</small>` : ''}</th><td>${q.import_cents ? eur(q.import_cents) : w('Gratuïta')}</td></tr>`).join('')}</table>` : ''}
  <h2>${w('Com fer-ho')}</h2>
  <p>${c('email') || c('telefon')
    ? w(
        "Escriu-nos{0}{1} i et farem arribar el full d'inscripció.",
        c('email') ? w(' a {0}', `<a href="mailto:${escapa(c('email'))}?subject=${encodeURIComponent(w("Vull fer-me'n soci"))}">${escapa(c('email'))}</a>`) : '',
        c('telefon') ? w(' o truca al {0}', escapa(c('telefon'))) : '',
      )
    : w("Demana'ns el full d'inscripció en qualsevol de les nostres activitats.")}</p>
</div>`,
  });

  // ---------- Contacte ----------

  pagina({
    fitxer: 'contacte.html',
    titol: w('Contacte'),
    cos: `<div class="ample estret bloc">
  <h1>${w('Contacte')}</h1>
  <dl class="contacte">
    ${c('email') ? `<dt>${w('Correu electrònic')}</dt><dd><a href="mailto:${escapa(c('email'))}">${escapa(c('email'))}</a></dd>` : ''}
    ${c('telefon') ? `<dt>${w('Telèfon')}</dt><dd>${escapa(c('telefon'))}</dd>` : ''}
    ${c('adreca') ? `<dt>${w('Adreça')}</dt><dd>${escapa(c('adreca'))}</dd>` : ''}
    ${xarxes.length ? `<dt>${w('Xarxes socials')}</dt><dd>${xarxes.map((x) => `<a href="${escapa(x.url)}" rel="noopener" target="_blank">${x.nom}</a>`).join(' · ')}</dd>` : ''}
  </dl>
</div>`,
  });

  // ---------- Pàgines pròpies ----------

  for (const p of pagines) {
    pagina({
      fitxer: `${p.slug}.html`,
      titol: p.titol,
      descripcio: textPla(p.contingut, 160),
      cos: `<div class="ample estret bloc">
  <h1>${escapa(p.titol)}</h1>
  <div class="text">${markdown(p.contingut)}</div>
</div>`,
    });
  }

  // ---------- Avís legal (art. 10 LSSI-CE) i política de privacitat (art. 13 RGPD) ----------

  const titular = c('nom_complet') || nom;
  const contacteRgpd = c('rgpd_contacte') || c('email');
  const dadesTitular = [
    `<strong>${escapa(titular)}</strong>`,
    c('nif') && `${w('NIF')}: ${escapa(c('nif'))}`,
    c('adreca') && `${w('Domicili')}: ${escapa(c('adreca'))}`,
    c('email') && `${w('Correu electrònic')}: <a href="mailto:${escapa(c('email'))}">${escapa(c('email'))}</a>`,
    c('telefon') && `${w('Telèfon')}: ${escapa(c('telefon'))}`,
    c('num_registre') && w("Inscrita al registre d'associacions amb el número {0}", escapa(c('num_registre'))),
  ]
    .filter(Boolean)
    .join('<br>');

  pagina({
    fitxer: 'avis-legal.html',
    titol: w('Avís legal'),
    cos: `<div class="ample estret bloc text">
  <h1>${w('Avís legal')}</h1>
  <h2>${w('Titular del lloc web')}</h2>
  <p>${dadesTitular}</p>
  <h2>${w("Condicions d'ús")}</h2>
  <p>${w("Aquest lloc web té per objecte informar sobre l'entitat i les seves activitats. L'accés és gratuït i no requereix registre. Els continguts (textos, fotografies i logotips) són de {0} o s'hi publiquen amb autorització; no es poden reproduir amb finalitats comercials sense permís.", escapa(nom))}</p>
  <p>${w("{0} no es fa responsable del contingut dels llocs web externs enllaçats des d'aquesta pàgina.", escapa(nom))}</p>
  <h2>${w('Galetes (cookies)')}</h2>
  <p>${w("Aquest lloc web no fa servir galetes ni cap eina d'analítica o seguiment.")}</p>
</div>`,
  });

  pagina({
    fitxer: 'privacitat.html',
    titol: w('Política de privacitat'),
    cos: `<div class="ample estret bloc text">
  <h1>${w('Política de privacitat')}</h1>
  <h2>${w('Responsable del tractament')}</h2>
  <p>${dadesTitular}</p>
  ${c('rgpd_dpd') ? `<p>${w('Delegat de protecció de dades: {0}', escapa(c('rgpd_dpd')))}</p>` : ''}
  <h2>${w('Quines dades tractem i per a què')}</h2>
  <p>${w("Aquest lloc web no recull dades personals: no té formularis, no fa servir galetes ni eines d'analítica. Si ens escrius per correu electrònic, farem servir les teves dades només per respondre't i, si ho demanes, per gestionar la teva incorporació com a soci o sòcia.")}</p>
  <p>${w("Les dades de les persones sòcies es tracten per gestionar la relació associativa (altes, quotes, activitats i comunicacions de l'entitat), amb base en la mateixa relació associativa i en el compliment d'obligacions legals (art. 6.1.b i 6.1.c del Reglament general de protecció de dades). La publicació d'imatges i l'enviament de comunicacions es basen en el consentiment, que es pot retirar en qualsevol moment.")}</p>
  <h2>${w('Destinataris')}</h2>
  <p>${w('No cedim dades a tercers, excepte quan hi ha una obligació legal{0}.', c('rgpd_destinataris') ? w(' i, si escau, a: {0}', escapa(c('rgpd_destinataris'))) : '')}</p>
  <h2>${w('Conservació')}</h2>
  <p>${w("Les dades de les persones sòcies es conserven mentre dura la relació i, després de la baixa, durant {0} anys per atendre possibles responsabilitats legals. Passat aquest termini se suprimeixen o s'anonimitzen.", escapa(c('rgpd_conservacio_anys') || '5'))}</p>
  <h2>${w('Els teus drets')}</h2>
  <p>${w("Pots exercir els drets d'accés, rectificació, supressió, oposició, limitació del tractament i portabilitat{0}. Et respondrem en el termini màxim d'un mes. Si consideres que no hem atès correctament la teva sol·licitud, pots presentar una reclamació davant l'Agència Espanyola de Protecció de Dades ({1}).", contacteRgpd ? w(' escrivint a {0}', `<a href="mailto:${escapa(contacteRgpd)}">${escapa(contacteRgpd)}</a>`) : '', '<a href="https://www.aepd.es" rel="noopener" target="_blank">www.aepd.es</a>')}</p>
</div>`,
  });

  pagina({
    fitxer: '404.html',
    titol: w('Pàgina no trobada'),
    cos: `<div class="ample estret bloc"><h1>${w('No hem trobat aquesta pàgina')}</h1><p><a href="index.html">${w("Torna a l'inici")}</a></p></div>`,
  });

  if (previsualitzacio) return fitxers;
  fitxers.set('estil.css', estilCss);
  // Les fonts de Google s'allotgen a la mateixa web (privacitat: cap petició a Google des de la web pública).
  // publica.ts les descarrega i substitueix aquest fitxer; si no pot, queda buit i s'usen les alternatives.
  if (googleFonts) fitxers.set('fonts.css', '');
  fitxers.set('robots.txt', `User-agent: *\nAllow: /\n${urlBase ? `Sitemap: ${urlBase}/sitemap.xml\n` : ''}`);
  if (urlBase) {
    const htmls = [...fitxers.keys()].filter((f) => f.endsWith('.html') && f !== '404.html');
    fitxers.set(
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${htmls
        .map((f) => `  <url><loc>${escapa(`${urlBase}/${f === 'index.html' ? '' : f}`)}</loc></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  }
  return fitxers;
}

/** Full d'estil de la web a partir del disseny (colors, fonts, formes, capçalera, portada i peu). */
function estil(d: Disseny): string {
  const k = d.colors;
  const fonsFosc = textSobre(k.fons) === '#ffffff';
  const capFons = k.capcalera_fons || k.superficie;
  const capText = k.capcalera_text || (k.capcalera_fons ? textSobre(k.capcalera_fons) : k.text);
  const peuFons = k.peu_fons || '#2a2420';
  const peuText = k.peu_text || textSobre(peuFons);
  const radi = { rectes: '0px', suaus: '10px', arrodonides: '18px' }[d.forma.cantonades];
  const radiBoto = d.forma.botons === 'pindola' ? '999px' : radi;
  const midaLogo = { petit: '36px', mitja: '48px', gran: '76px' }[d.capcalera.mida_logo];
  const radiLogo = { original: '0', rodona: '50%', quadrada: radi }[d.capcalera.forma_logo];
  const alcadaHeroi = { baixa: 'clamp(2rem, 5vw, 3.5rem)', mitjana: 'clamp(3rem, 8vw, 6rem)', alta: 'clamp(5rem, 16vw, 11rem)' }[d.heroi.alcada];
  return `:root {
  --color: ${k.principal};
  --color-fosc: ${fonsFosc ? `color-mix(in srgb, ${k.principal} 75%, white)` : `color-mix(in srgb, ${k.principal} 78%, black)`};
  --color-suau: color-mix(in srgb, ${k.principal} 12%, ${k.fons});
  --sobre-color: ${textSobre(k.principal)};
  --fons: ${k.fons};
  --superficie: ${k.superficie};
  --text: ${k.text};
  --apagat: ${k.apagat};
  --vora: ${k.vora};
  --cap-fons: ${capFons};
  --cap-text: ${capText};
  --peu-fons: ${peuFons};
  --peu-text: ${peuText};
  --titols: ${font(d.fonts.titols).familia};
  --cos: ${font(d.fonts.text).familia};
  --mida: ${{ petita: '15px', normal: '17px', gran: '19px' }[d.fonts.mida]};
  --radi: ${radi};
  --radi-boto: ${radiBoto};
  --ombra: ${d.forma.ombres ? '0 8px 28px rgb(0 0 0 / 0.09)' : 'none'};
  --logo: ${midaLogo};
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--fons); color: var(--text); font: var(--mida)/1.6 var(--cos); }
img { max-width: 100%; height: auto; }
a { color: var(--color-fosc); }
h1, h2, h3 { font-family: var(--titols); line-height: 1.2; text-wrap: balance; }
h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 1rem; }
h2 { font-size: 1.6rem; margin: 0 0 1rem; }
h3 { font-size: 1.2rem; margin: 0 0 0.4rem; }
.ample { max-width: 1120px; margin: 0 auto; padding-inline: 20px; }
.estret { max-width: 760px; }
.bloc { padding-block: 2.5rem; }
.bloc h1 + h2, .bloc .graella + h2 { margin-top: 2.5rem; }
.salta { position: absolute; left: -999px; }
.salta:focus { left: 1rem; top: 1rem; background: #fff; color: #000; padding: 0.5rem 1rem; z-index: 10; }
:focus-visible { outline: 3px solid var(--color); outline-offset: 2px; }

/* Capçalera */
.cap { background: var(--cap-fons); color: var(--cap-text); border-bottom: 1px solid color-mix(in srgb, var(--cap-text) 14%, transparent); z-index: 5; }
.cap-fixa { position: sticky; top: 0; }
.cap-dins { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 72px; }
.marca { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--cap-text); font: 600 1.25rem var(--titols); }
.marca img { width: auto; height: var(--logo); max-width: calc(var(--logo) * 4); border-radius: ${radiLogo}; object-fit: contain; }
.marca-inicial { width: var(--logo); height: var(--logo); border-radius: ${radiLogo === '0' ? radi : radiLogo}; background: var(--color); color: var(--sobre-color); display: grid; place-items: center; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--cap-text) 35%, transparent); }
.menu { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.2rem; }
.menu a, .menu-mobil nav a { text-decoration: none; color: var(--cap-text); padding: 0.45rem 0.7rem; border-radius: min(var(--radi), 8px); font-size: 0.95rem;${d.capcalera.menu_majuscules ? ' text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.82rem;' : ''} }
.menu a:hover, .menu a[aria-current] { background: color-mix(in srgb, var(--cap-text) 10%, transparent); }
.menu-mobil { display: none; position: relative; }
.menu-mobil summary { display: block; cursor: pointer; list-style: none; padding: 0.5rem 0.9rem; border: 1px solid color-mix(in srgb, var(--cap-text) 25%, transparent); border-radius: min(var(--radi), 8px); font-weight: 600; }
.menu-mobil summary::-webkit-details-marker { display: none; }
.menu-mobil nav { position: absolute; right: 0; top: calc(100% + 0.5rem); background: var(--superficie); border: 1px solid var(--vora); border-radius: var(--radi); padding: 0.5rem; display: flex; flex-direction: column; min-width: 220px; box-shadow: 0 10px 30px rgb(0 0 0 / 0.14); }
.menu-mobil nav a { color: var(--text); }
.menu-mobil nav a:hover, .menu-mobil nav a[aria-current] { background: var(--color-suau); color: var(--color-fosc); }
.cap-centrada .cap-dins { flex-direction: column; justify-content: center; padding-block: 1rem 0.6rem; gap: 0.5rem; }
.cap-centrada .menu { justify-content: center; }
.cap-plegada .menu { display: none; }
.cap-plegada .menu-mobil { display: block; }

/* Portada */
.heroi { background: var(--color-suau); padding-block: ${alcadaHeroi}; }
.heroi h1 { font-size: clamp(2.4rem, 7vw, 4.2rem); margin-bottom: 0.4rem; }
.lema { font: italic 1.35rem/1.4 var(--titols); color: var(--color-fosc); margin: 0 0 1.5rem; }
.heroi .text { max-width: 65ch; font-size: 1.1rem; }
.heroi-centre { text-align: center; }
.heroi-centre .text { margin-inline: auto; }
.heroi-centre .botons { justify-content: center; }
.heroi-amb-imatge { background: linear-gradient(rgb(0 0 0 / var(--heroi-fosc, 0.45)), rgb(0 0 0 / var(--heroi-fosc, 0.45))), var(--heroi-img) center / cover no-repeat; color: #fff; }
.heroi-amb-imatge h1, .heroi-amb-imatge .lema { color: #fff; text-shadow: 0 2px 12px rgb(0 0 0 / 0.35); }
.heroi-amb-imatge .boto-clar { color: #fff; box-shadow: inset 0 0 0 2px #fff; }
.botons { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.8rem; }
.boto { display: inline-block; background: var(--color); color: var(--sobre-color); text-decoration: none; padding: 0.75rem 1.4rem; border-radius: var(--radi-boto); font-weight: 600; }
.boto:hover { background: var(--color-fosc); }
.boto-clar { background: transparent; color: var(--color-fosc); box-shadow: inset 0 0 0 2px var(--color); }
.boto-clar:hover { background: var(--color-suau); }
${d.forma.botons === 'contorn' ? `.boto:not(.boto-clar) { background: transparent; color: var(--color-fosc); box-shadow: inset 0 0 0 2px var(--color); }
.boto:not(.boto-clar):hover { background: var(--color); color: var(--sobre-color); }
.heroi-amb-imatge .boto:not(.boto-clar) { color: #fff; box-shadow: inset 0 0 0 2px #fff; }` : ''}

/* Targetes */
.graella { display: grid; grid-template-columns: repeat(${d.targetes.columnes}, minmax(0, 1fr)); gap: 1.25rem; }
.targeta { background: var(--superficie); border: 1px solid var(--vora); border-radius: var(--radi); box-shadow: var(--ombra); overflow: hidden; display: flex; flex-direction: column; }
.targeta-img { aspect-ratio: 16 / 9; width: 100%; object-fit: cover; }
.targeta-data { aspect-ratio: 16 / 9; background: var(--color); color: var(--sobre-color); display: flex; flex-direction: column; align-items: center; justify-content: center; font: 600 1.1rem var(--titols); text-transform: uppercase; letter-spacing: 0.08em; }
.targeta-data span { font-size: 3.2rem; line-height: 1; }
.targetes-compactes .targeta-img, .targetes-compactes .targeta-data { display: none; }
.targeta-cos { padding: 1.1rem 1.2rem 1.3rem; }
.targeta-cos p { margin: 0.3rem 0 0; color: var(--apagat); font-size: 0.95rem; }
.targeta h3 a { color: var(--text); text-decoration: none; }
.targeta h3 a:hover { color: var(--color-fosc); text-decoration: underline; }
.meta { color: var(--apagat); font-size: 0.88rem; margin: 0 0 0.4rem; }
.destacat { font-size: 1.2rem; color: var(--apagat); }
.imatge-principal { border-radius: var(--radi); margin: 1rem 0 1.5rem; width: 100%; }
.text { max-width: 68ch; }
.text blockquote { margin: 1.5rem 0; padding-left: 1rem; border-left: 4px solid var(--color); font-style: italic; }
.etiquetes { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 2rem; }
.etiquetes span { background: var(--color-suau); color: var(--color-fosc); border-radius: 999px; padding: 0.2rem 0.8rem; font-size: 0.85rem; }
.buit { color: var(--apagat); font-style: italic; }

/* Blocs de color */
.bloc-suau { background: var(--color-suau); }
.bloc-color { background: var(--color); color: var(--sobre-color); }
.bloc-color a { color: var(--sobre-color); }
.bloc-color .boto { background: var(--sobre-color); color: var(--color); }
.bloc-color .boto-clar { background: transparent; color: var(--sobre-color); box-shadow: inset 0 0 0 2px var(--sobre-color); }
.finalitats { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.8rem; }
.finalitats li { background: color-mix(in srgb, currentColor 10%, transparent); border-radius: var(--radi); padding: 0.9rem 1rem; font-weight: 600; }
.llista-finalitats li { margin-bottom: 0.8rem; }

.quotes { border-collapse: collapse; width: 100%; max-width: 520px; }
.quotes th, .quotes td { text-align: left; padding: 0.7rem 0; border-bottom: 1px solid var(--vora); vertical-align: top; }
.quotes td { text-align: right; font-weight: 600; white-space: nowrap; }
.quotes small { display: block; font-weight: 400; color: var(--apagat); font-size: 0.85rem; }
.contacte dt { font-weight: 600; margin-top: 1rem; }
.contacte dd { margin: 0.2rem 0 0; }

/* Peu */
.peu { background: var(--peu-fons); color: var(--peu-text); margin-top: 3rem; padding-block: 2.5rem 1.5rem; font-size: 0.95rem; }
.peu a { color: inherit; }
.peu-dins { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1.5rem; }
.peu-text { max-width: 46ch; }
.peu-text p:first-child { margin-top: 0; }
.peu p { margin: 0.25rem 0; }
.xarxes { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
.peu-legal { margin-top: 2rem; font-size: 0.82rem; opacity: 0.75; }
.peu-centrat .peu-dins { flex-direction: column; align-items: center; text-align: center; }
.peu-centrat .peu-text { margin-inline: auto; }
.peu-centrat .xarxes { justify-content: center; }
.peu-centrat .peu-legal { text-align: center; }

@media (max-width: 900px) {
  .graella { grid-template-columns: repeat(${Math.min(d.targetes.columnes, 2)}, minmax(0, 1fr)); }
}
@media (max-width: 820px) {
  .menu { display: none; }
  .menu-mobil { display: block; }
}
@media (max-width: 600px) {
  .graella { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
${d.css ? `\n/* CSS propi */\n${d.css}\n` : ''}`;
}
