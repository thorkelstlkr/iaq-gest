import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import { data } from '../format';
import { redueixImatge } from '../imatges';
import { DEMO } from '../mode';
import type { Activitat, Noticia } from '../../shared/types';
import { locale, t } from '../i18n';
import { AvisDretsImatge } from '../components/AvisDretsImatge';

type Xarxa = 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube';

interface Enviament {
  xarxa: Xarxa;
  estat: 'publicada' | 'error';
  metode: 'api' | 'manual';
  url: string | null;
  error: string | null;
  data: string;
  autor: string | null;
}

interface Publicacio {
  id: number;
  text: string;
  enllac: string | null;
  te_imatge: number;
  imatge?: string | null;
  activitat_id: number | null;
  noticia_id: number | null;
  activitat_nom: string | null;
  noticia_titol: string | null;
  autor: string | null;
  creat_el: string;
  enviaments: Enviament[];
}

interface Comptes {
  instagram: { usuari: string; caduca: string | null } | null;
  facebook: { pagina: string } | null;
  imatges_a_la_web: boolean;
  hashtags: string;
  perfils: Record<Xarxa, string>;
}

const NOMS: Record<Xarxa, string> = { instagram: t("Instagram"), facebook: t("Facebook"), x: 'X', tiktok: t("TikTok"), youtube: t("YouTube") };

/** Límits de text de cada xarxa (X compta cada enllaç com a 23 caràcters). */
const LIMITS: Record<Xarxa, number> = { instagram: 2200, facebook: 63206, x: 280, tiktok: 2200, youtube: 5000 };

const llargadaX = (tt: string) => tt.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;

const PESTANYES = [
  { id: 'nova', text: t("Publicació") },
  { id: 'historial', text: t("Historial") },
  { id: 'comptes', text: t("Comptes") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Xarxes() {
  const [pestanya, setPestanya] = useState<Pestanya>('nova');
  const [obrir, setObrir] = useState<number | null>(null);
  return (
    <>
      <Capcalera titol={t("Xarxes socials")} subtitol={t("Prepara una publicació una vegada i publica-la a cada xarxa")} />
      <div className="pestanyes" role="tablist">
        {PESTANYES.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestanya === p.id}
            className={pestanya === p.id ? 'actiu' : ''}
            onClick={() => {
              setPestanya(p.id);
              if (p.id === 'nova') setObrir(null);
            }}
          >
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'nova' && <Editor key={obrir ?? 'nova'} id={obrir} />}
      {pestanya === 'historial' && (
        <Historial
          onObre={(id) => {
            setObrir(id);
            setPestanya('nova');
          }}
        />
      )}
      {pestanya === 'comptes' && <ComptesXarxes />}
    </>
  );
}

// ---------- Editor ----------

const FORMATS = {
  quadrat: { ample: 1080, alt: 1080, nom: t("Quadrat (1080 × 1080)") },
  vertical: { ample: 1080, alt: 1350, nom: t("Vertical (1080 × 1350)") },
  horitzontal: { ample: 1200, alt: 675, nom: t("Horitzontal (1200 × 675)") },
};

function Editor({ id }: { id: number | null }) {
  const { data: comptes } = useApi<Comptes>('/xarxes/comptes');
  const { data: activitats } = useApi<Activitat[]>('/activitats?exercici=totes');
  const { data: noticies } = useApi<Noticia[]>('/web/noticies');
  const [pub, setPub] = useState<Publicacio | null>(null);
  const [f, setF] = useState({ text: '', enllac: '', origen: '' });
  const [imatge, setImatge] = useState<string | null>(null);
  const [format, setFormat] = useState<keyof typeof FORMATS>('quadrat');
  const [desant, setDesant] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Publicacio>(`/xarxes/publicacions/${id}`)
      .then((p) => {
        setPub(p);
        setF({ text: p.text, enllac: p.enllac ?? '', origen: p.activitat_id ? `a:${p.activitat_id}` : p.noticia_id ? `n:${p.noticia_id}` : '' });
        setImatge(p.imatge ?? null);
      })
      .catch(avisaError);
  }, [id]);

  async function triaOrigen(valor: string) {
    setF((x) => ({ ...x, origen: valor }));
    if (!valor) return;
    const [tipus, oid] = valor.split(':');
    try {
      const p = await api.get<{ text: string; enllac: string | null; imatge: string | null }>(
        `/xarxes/proposta?${tipus === 'a' ? 'activitat_id' : 'noticia_id'}=${oid}`,
      );
      setF({ text: p.text, enllac: p.enllac ?? '', origen: valor });
      if (p.imatge) setImatge(p.imatge);
    } catch (e) {
      avisaError(e);
    }
  }

  async function triaImatge(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      const fm = FORMATS[format];
      setImatge(await redueixImatge(fitxer, fm.ample, fm.alt, 0.88));
    } catch (err) {
      avisaError(err);
    }
  }

  async function desa(e?: FormEvent) {
    e?.preventDefault();
    setDesant(true);
    const [tipus, oid] = f.origen.split(':');
    const cos = {
      text: f.text,
      enllac: f.enllac,
      imatge,
      activitat_id: tipus === 'a' ? oid : null,
      noticia_id: tipus === 'n' ? oid : null,
    };
    try {
      const pid = pub ? (await api.put<{ id: number }>(`/xarxes/publicacions/${pub.id}`, cos)).id : (await api.post<{ id: number }>('/xarxes/publicacions', cos)).id;
      setPub(await api.get<Publicacio>(`/xarxes/publicacions/${pid}`));
      avisa(t("Publicació desada. Ara la pots publicar a cada xarxa."));
    } catch (err) {
      avisaError(err);
    } finally {
      setDesant(false);
    }
  }

  const recarrega = async () => pub && setPub(await api.get<Publicacio>(`/xarxes/publicacions/${pub.id}`));
  const canviat = pub && (pub.text !== f.text || (pub.enllac ?? '') !== f.enllac || (pub.imatge ?? null) !== imatge);

  return (
    <>
      <form className="formulari targeta" onSubmit={desa}>
        <Camp etiqueta={t("A partir de (opcional)")} ample ajuda={t("Omple el text, l'enllaç a la web i la imatge")}>
          <select id="xa-origen" value={f.origen} onChange={(e) => triaOrigen(e.target.value)}>
            <option value="">{t("— Publicació lliure —")}</option>
            {activitats && activitats.length > 0 && (
              <optgroup label="Activitats">
                {activitats.slice(0, 40).map((a) => (
                  <option key={a.id} value={`a:${a.id}`}>
                    {data(a.data_inici)} · {a.nom}
                  </option>
                ))}
              </optgroup>
            )}
            {noticies && noticies.length > 0 && (
              <optgroup label="Notícies de la web">
                {noticies.slice(0, 40).map((n) => (
                  <option key={n.id} value={`n:${n.id}`}>
                    {data(n.data)} · {n.titol}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Camp>
        <AvisDretsImatge activitatId={f.origen.startsWith('a:') ? f.origen.slice(2) : null} />
        <Camp etiqueta={t("Text")} ample ajuda={t("Després el pots ajustar per a cada xarxa")}>
          <textarea id="xa-text" rows={7} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required />
        </Camp>
        <Camp etiqueta={t("Enllaç (opcional)")} ample ajuda={t("Per exemple, la pàgina de l'activitat a la web")}>
          <input id="xa-enllac" value={f.enllac} onChange={(e) => setF({ ...f, enllac: e.target.value })} placeholder="https://" />
        </Camp>
        <div className="camp-ample camp-imatge-xarxa">
          {imatge ? <img src={imatge} alt="" /> : <div className="imatge-buida">{t("Sense imatge")}</div>}
          <div className="camp-foto-accions">
            <select value={format} onChange={(e) => setFormat(e.target.value as keyof typeof FORMATS)} aria-label={t("Format de la imatge")}>
              {Object.entries(FORMATS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nom}
                </option>
              ))}
            </select>
            <label className="boto boto-petit boto-secundari">
              {imatge ? t("Canvia la imatge") : t("Afegeix una imatge")}
              <input type="file" accept="image/*" onChange={triaImatge} hidden />
            </label>
            {imatge && (
              <button type="button" className="boto boto-petit boto-perill" onClick={() => setImatge(null)}>
                {t("Treu la imatge")}
              </button>
            )}
            <span className="camp-ajuda">{t("Per a vídeos (TikTok, YouTube, Reels), el vídeo es tria directament a la xarxa.")}</span>
          </div>
        </div>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto" disabled={desant || !f.text.trim()}>
            {pub ? (canviat ? t("Desa els canvis") : t("Desada")) : t("Desa i prepara per a les xarxes")}
          </button>
        </div>
      </form>

      {pub && comptes && (
        <div className="graella-xarxes">
          {(['instagram', 'facebook', 'x', 'tiktok', 'youtube'] as Xarxa[]).map((x) => (
            <TargetaXarxa
              key={x}
              xarxa={x}
              pub={{ ...pub, text: f.text, enllac: f.enllac || null }}
              imatge={imatge}
              comptes={comptes}
              desada={!canviat}
              onCanvi={recarrega}
            />
          ))}
        </div>
      )}
    </>
  );
}

function textInicial(x: Xarxa, text: string, enllac: string | null) {
  if (x === 'x' || x === 'facebook') return enllac && !text.includes(enllac) ? `${text}\n\n${enllac}` : text;
  if (x === 'instagram' || x === 'tiktok') return enllac ? t("{0}\n\nMés informació: enllaç a la biografia", text) : text;
  return enllac ? `${text}\n\n${enllac}` : text; // YouTube: la descripció admet enllaços
}

const PAGINA_PUBLICAR: Record<Xarxa, (text: string) => string> = {
  instagram: () => 'https://www.instagram.com/',
  facebook: () => 'https://www.facebook.com/',
  x: (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
  tiktok: () => 'https://www.tiktok.com/tiktokstudio/upload',
  youtube: () => 'https://studio.youtube.com/',
};

async function copia(text: string, que = t("Text copiat")) {
  try {
    await navigator.clipboard.writeText(text);
    avisa(t("{0}. Enganxa'l a la xarxa.", que));
  } catch {
    window.prompt(t("Copia el text:"), text);
  }
}

/** Copia la imatge al porta-retalls (en PNG, el format que accepten els navegadors) per enganxar-la a la xarxa. */
async function copiaImatge(dataUri: string) {
  try {
    const img = new Image();
    img.src = dataUri;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    const png = await new Promise<Blob>((resol, rebutja) => canvas.toBlob((b) => (b ? resol(b) : rebutja(new Error())), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    avisa(t("Imatge copiada. Enganxa-la a la xarxa (Ctrl+V)."));
  } catch {
    avisa(t("Aquest navegador no permet copiar imatges: fes servir «Descarrega la imatge»."), 'error');
  }
}

const etiquetesDe = (text: string) => text.match(/#[\p{L}\p{N}_]+/gu) ?? [];

/** Divideix un text llarg en un fil de publicacions d'X (màx. 280 caràcters cadascuna, numerades). */
export function filX(text: string): string[] {
  if (llargadaX(text) <= 280) return [text];
  const MAX = 280 - 8; // espai per a « (12/12)»
  const trossos = text.split(/(\s+)/);
  const parts: string[] = [];
  let actual = '';
  for (const tt of trossos) {
    if (actual && llargadaX(actual + tt) > MAX) {
      parts.push(actual.trim());
      actual = /^\s+$/.test(tt) ? '' : tt;
    } else {
      actual += tt;
    }
  }
  if (actual.trim()) parts.push(actual.trim());
  return parts.map((p, i) => `${p} (${i + 1}/${parts.length})`);
}

/** Camps a punt per copiar i enganxar, tal com els demana cada xarxa. */
function fragments(x: Xarxa, text: string): { etiqueta: string; valor: string; ajuda?: string }[] {
  if (x === 'youtube') {
    const linies = text.split('\n');
    const primera = linies.findIndex((l) => l.trim());
    const titol = (linies[primera] ?? '').trim().slice(0, 100);
    const descripcio = linies.slice(primera + 1).join('\n').trim();
    const tags = etiquetesDe(text).map((e) => e.slice(1)).join(', ').slice(0, 500);
    return [
      { etiqueta: t("Títol"), valor: titol, ajuda: t("Camp «Títol» de YouTube Studio") },
      { etiqueta: t("Descripció"), valor: descripcio, ajuda: t("Camp «Descripció»") },
      ...(tags ? [{ etiqueta: t("Etiquetes"), valor: tags, ajuda: t("Camp «Etiquetes» (a «Mostra'n més»)") }] : []),
    ];
  }
  if (x === 'x') {
    const fil = filX(text);
    return fil.length === 1
      ? [{ etiqueta: t("Publicació"), valor: fil[0] }]
      : fil.map((v, i) => ({ etiqueta: t("Fil {0}/{1}", i + 1, fil.length), valor: v, ajuda: i ? t("Respon a la publicació anterior") : t("Primera publicació") }));
  }
  if (x === 'tiktok') return [{ etiqueta: t("Descripció del vídeo"), valor: text }];
  if (x === 'instagram') return [{ etiqueta: t("Text de la publicació"), valor: text }];
  return [{ etiqueta: t("Publicació"), valor: text }];
}

function TargetaXarxa(props: { xarxa: Xarxa; pub: Publicacio; imatge: string | null; comptes: Comptes; desada: boolean; onCanvi: () => void }) {
  const { xarxa: x, pub, comptes } = props;
  const [text, setText] = useState(() => textInicial(x, pub.text, pub.enllac));
  const [publicant, setPublicant] = useState(false);
  const [marcant, setMarcant] = useState(false);
  useEffect(() => setText(textInicial(x, pub.text, pub.enllac)), [x, pub.text, pub.enllac]);

  const fetes = pub.enviaments.filter((e) => e.xarxa === x);
  const publicada = fetes.find((e) => e.estat === 'publicada');
  const llarg = x === 'x' ? llargadaX(text) : text.length;
  // A X, un text llarg es publica com a fil: no cal bloquejar-lo.
  const massaLlarg = x !== 'x' && llarg > LIMITS[x];
  const hashtags = (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  const viaApi =
    !DEMO &&
    ((x === 'instagram' && comptes.instagram && comptes.imatges_a_la_web) || (x === 'facebook' && comptes.facebook && (comptes.imatges_a_la_web || !props.imatge)));

  async function publicaApi() {
    if (!(await confirma(t("Es publicarà ara mateix a {0}{1}. Continuar?", NOMS[x], x === 'instagram' ? ` (@${comptes.instagram?.usuari})` : '')))) return;
    setPublicant(true);
    try {
      const r = await api.post<{ url: string | null }>(`/xarxes/publicacions/${pub.id}/publica`, { xarxa: x, text });
      avisa(t("Publicat a {0}.", NOMS[x]));
      if (r.url) window.open(r.url, '_blank', 'noopener');
    } catch (e) {
      avisaError(e);
    } finally {
      setPublicant(false);
      props.onCanvi();
    }
  }

  function descarregaImatge() {
    if (!props.imatge) return;
    const a = document.createElement('a');
    a.href = props.imatge;
    a.download = t("publicacio-{0}.jpg", pub.id);
    a.click();
  }

  return (
    <section className={`targeta targeta-xarxa xarxa-${x}`}>
      <div className="targeta-cap">
        <h3 className="sense-marge">{NOMS[x]}</h3>
        {publicada ? (
          <span className="insignia insignia-pagada">{t("Publicada")} {data(publicada.data.slice(0, 10))}</span>
        ) : fetes.some((e) => e.estat === 'error') ? (
          <span className="insignia insignia-pendent" title={fetes.find((e) => e.estat === 'error')?.error ?? undefined}>
            {t("Error")}
          </span>
        ) : null}
      </div>
      {x === 'youtube' && <p className="apagat petit">{t("La primera línia serveix de títol del vídeo (màx. 100 caràcters).")}</p>}
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Text per a {0}", NOMS[x])} />
      <p className={`petit ${massaLlarg ? 'negatiu' : 'apagat'}`}>
        {llarg.toLocaleString(locale())} / {LIMITS[x].toLocaleString(locale())} {t("caràcters")}
        {x === 'x' && llarg > 280 && t(" · es dividirà en un fil de {0}", filX(text).length)}
        {x === 'instagram' && t(" · {0}/30 etiquetes", hashtags)}
        {x === 'youtube' && text.split('\n')[0].length > 100 && t(" · el títol passa de 100")}
      </p>
      {x === 'instagram' && !props.imatge && <p className="petit negatiu">{t("Instagram necessita una imatge.")}</p>}
      {!viaApi && (
        <div className="a-punt">
          <div className="a-punt-titol">{t("A punt per copiar i enganxar")}</div>
          {fragments(x, text).map((fr) => (
            <div key={fr.etiqueta} className="fragment">
              <div className="fragment-cap">
                <span>
                  <strong>{fr.etiqueta}</strong>
                  {fr.ajuda && <span className="apagat"> · {fr.ajuda}</span>}
                </span>
                <button type="button" className="boto boto-petit" onClick={() => copia(fr.valor, t("{0} copiat", fr.etiqueta))} disabled={!fr.valor}>
                  {t("Copia")}
                </button>
              </div>
              <pre className="fragment-text">{fr.valor || '—'}</pre>
            </div>
          ))}
          {props.imatge && (
            <div className="fragment-cap">
              <strong>{t("Imatge")}</strong>
              <span className="accions">
                <button type="button" className="boto boto-petit" onClick={() => copiaImatge(props.imatge!)}>
                  {t("Copia la imatge")}
                </button>
                {!DEMO && (
                  <button type="button" className="boto boto-petit boto-secundari" onClick={descarregaImatge}>
                    {t("Descarrega-la")}
                  </button>
                )}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="accions">
        {viaApi ? (
          <button className="boto boto-petit" disabled={!props.desada || publicant || massaLlarg || (x === 'instagram' && !props.imatge)} onClick={publicaApi} title={!props.desada ? t("Desa primer els canvis") : undefined}>
            {publicant ? t("Publicant…") : t("Publica a {0}", NOMS[x])}
          </button>
        ) : (
          <>
            <a className="boto boto-petit" href={PAGINA_PUBLICAR[x](filX(text)[0])} target="_blank" rel="noopener">
              {x === 'x' ? (filX(text).length > 1 ? t("Obre X amb la primera") : t("Obre X amb el text")) : t("Obre {0}", NOMS[x])}
            </a>
          </>
        )}
        {!viaApi && (
          <button className="boto boto-petit boto-secundari" onClick={() => setMarcant(true)} disabled={!props.desada}>
            {t("Ja l'he publicada")}
          </button>
        )}
      </div>
      {!viaApi && x === 'instagram' && !DEMO && (
        <p className="apagat petit">
          {comptes.instagram ? t("Per publicar des d'aquí cal configurar la web (adreça i FTP): hi es puja la imatge.") : t("Connecta el compte a la pestanya Comptes per publicar des d’aquí.")}
        </p>
      )}
      {publicada?.url && (
        <p className="petit">
          <a href={publicada.url} target="_blank" rel="noopener">
            {t("Veure la publicació")}
          </a>
        </p>
      )}
      {marcant && <MarcaPublicada xarxa={x} id={pub.id} onClose={() => setMarcant(false)} onFet={() => { setMarcant(false); props.onCanvi(); }} />}
    </section>
  );
}

function MarcaPublicada(props: { xarxa: Xarxa; id: number; onClose: () => void; onFet: () => void }) {
  const [url, setUrl] = useState('');
  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/xarxes/publicacions/${props.id}/manual`, { xarxa: props.xarxa, url });
      avisa(t("Anotat a l’historial."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <Modal titol={t("Publicada a {0}", NOMS[props.xarxa])} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Enllaç a la publicació (opcional)")} ample>
          <input id="xa-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus />
        </Camp>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button className="boto">{t("Anota-ho")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Historial ----------

function Historial({ onObre }: { onObre: (id: number) => void }) {
  const { data: llista, error, reload } = useApi<Publicacio[]>('/xarxes/publicacions');
  if (!llista) return <Carregant error={error} />;
  if (!llista.length) return <Buit>{t("Encara no s'ha preparat cap publicació.")}</Buit>;
  return (
    <div className="taula-contenidor">
      <table className="taula taula-clicable">
        <thead>
          <tr>
            <th>{t("Data")}</th>
            <th>{t("Publicació")}</th>
            <th>{t("Xarxes")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {llista.map((p) => (
            <tr key={p.id} onClick={() => onObre(p.id)}>
              <td className="nowrap">{data(p.creat_el.slice(0, 10))}</td>
              <td>
                {p.text.split('\n')[0].slice(0, 90)}
                <div className="apagat petit">
                  {[p.activitat_nom && t("Activitat: {0}", p.activitat_nom), p.noticia_titol && t("Notícia: {0}", p.noticia_titol), p.autor].filter(Boolean).join(' · ')}
                </div>
              </td>
              <td>
                <span className="xips">
                  {p.enviaments
                    .filter((e) => e.estat === 'publicada')
                    .map((e, i) =>
                      e.url ? (
                        <a key={i} className={`xip-xarxa xarxa-${e.xarxa}`} href={e.url} target="_blank" rel="noopener" onClick={(ev) => ev.stopPropagation()}>
                          {NOMS[e.xarxa]}
                        </a>
                      ) : (
                        <span key={i} className={`xip-xarxa xarxa-${e.xarxa}`}>
                          {NOMS[e.xarxa]}
                        </span>
                      ),
                    )}
                  {!p.enviaments.some((e) => e.estat === 'publicada') && <span className="apagat petit">{t("Sense publicar")}</span>}
                </span>
              </td>
              <td className="accions-fila">
                <button
                  className="boto boto-petit boto-secundari"
                  onClick={async (ev) => {
                    ev.stopPropagation();
                    if (!(await confirma(t("Eliminar aquesta publicació del programa? (No s’esborra de les xarxes.)")))) return;
                    await api.del(`/xarxes/publicacions/${p.id}`).catch(avisaError);
                    reload();
                  }}
                >
                  {t("Elimina")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Comptes ----------

function ComptesXarxes() {
  const { data: c, error, reload } = useApi<Comptes>('/xarxes/comptes');
  const [ig, setIg] = useState('');
  const [fb, setFb] = useState({ pagina: '', token: '' });
  const [hashtags, setHashtags] = useState<string | null>(null);
  useEffect(() => {
    if (c && hashtags === null) setHashtags(c.hashtags);
  }, [c, hashtags]);
  if (!c) return <Carregant error={error} />;

  async function desa(cos: Record<string, unknown>, missatge: string) {
    try {
      await api.put('/xarxes/comptes', cos);
      avisa(missatge);
      setIg('');
      setFb({ pagina: '', token: '' });
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  async function refresca() {
    try {
      await api.post('/xarxes/comptes/instagram/refresca');
      avisa(t("Connexió allargada."));
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  const caducaAviat = c.instagram?.caduca && c.instagram.caduca < new Date(Date.now() + 10 * 86400_000).toLocaleDateString('sv-SE');

  return (
    <>
      <section className="targeta">
        <h2>{t("Com funciona cada xarxa")}</h2>
        <ul className="com-funciona">
          <li>
            <strong>{t("Instagram i Facebook:")}</strong> {t("es poden publicar directament des del programa, connectant els comptes de l'entitat. La imatge es puja a la vostra web perquè Meta la pugui llegir.")}
          </li>
          <li>
            <strong>{t("X:")}</strong> {t("el programa obre X amb el text ja escrit i hi afegeixes la imatge. (Publicar des de l'API d'X és de pagament per cada publicació des del 2026.)")}
          </li>
          <li>
            <strong>{t("TikTok i YouTube:")}</strong> {t("el programa prepara el text i obre la pàgina de pujada; el vídeo el tries allà. (Les seves API només permeten publicar en privat si l'aplicació no ha passat una auditoria.)")}
          </li>
        </ul>
      </section>

      <section className="targeta">
        <h2>{t("Instagram")}</h2>
        {c.instagram ? (
          <>
            <p>
              {t("Connectat com a")} <strong>@{c.instagram.usuari}</strong>
              {c.instagram.caduca && <> {t("· la connexió caduca el")} {data(c.instagram.caduca)}</>}
            </p>
            {caducaAviat && <p className="negatiu petit">{t("Caduca aviat: allarga-la ara.")}</p>}
            <div className="accions">
              {!DEMO && (
                <button className="boto boto-petit boto-secundari" onClick={refresca}>
                  {t("Allarga la connexió (60 dies més)")}
                </button>
              )}
              <button className="boto boto-petit boto-perill" onClick={() => desa({ desconnecta: 'instagram' }, t("Instagram desconnectat."))}>
                {t("Desconnecta")}
              </button>
            </div>
          </>
        ) : (
          <>
            <details className="ajuda-format">
              <summary>{t("Com obtenir el token d'accés (una sola vegada)")}</summary>
              <ol className="petit">
                <li>{t("El compte d'Instagram de l'entitat ha de ser professional (empresa o creador).")}</li>
                <li>
                  {t("Entra a")} <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">{t("developers.facebook.com/apps")}</a> {t("amb un compte de Facebook i crea una aplicació de tipus «Empresa».")}
                </li>
                <li>{t("Afegeix-hi el producte «Instagram» → «API amb inici de sessió d'Instagram».")}</li>
                <li>{t("A «Genera tokens d'accés», afegeix el compte d'Instagram de l'entitat i genera el token amb el permís de publicar contingut.")}</li>
                <li>{t("Copia el token i enganxa'l aquí.")}</li>
              </ol>
            </details>
            <div className="afegeix-linia">
              <input id="xa-ig-token" type="password" value={ig} onChange={(e) => setIg(e.target.value)} placeholder={t("Token d'accés d'Instagram")} aria-label={t("Token d'accés d'Instagram")} autoComplete="off" />
              <button className="boto boto-petit" disabled={!ig || DEMO} onClick={() => desa({ instagram_token: ig }, t("Instagram connectat."))}>
                {t("Connecta")}
              </button>
            </div>
          </>
        )}
        {!c.imatges_a_la_web && (
          <p className="apagat petit">
            {t("Per publicar a Instagram des d'aquí també cal tenir configurades l'adreça de la web i la connexió FTP (Web).")}
          </p>
        )}
      </section>

      <section className="targeta">
        <h2>{t("Pàgina de Facebook")}</h2>
        {c.facebook ? (
          <>
            <p>
              {t("Connectat a la pàgina")} <strong>{c.facebook.pagina}</strong>
            </p>
            <button className="boto boto-petit boto-perill" onClick={() => desa({ desconnecta: 'facebook' }, t("Facebook desconnectat."))}>
              {t("Desconnecta")}
            </button>
          </>
        ) : (
          <>
            <p className="apagat petit">
              {t("Quan tingueu la pàgina: a la mateixa aplicació de Meta, genera un token d'accés de la pàgina (amb permís per publicar) i copia l'identificador de la pàgina.")}
            </p>
            <div className="afegeix-linia">
              <input id="xa-fb-pagina" value={fb.pagina} onChange={(e) => setFb({ ...fb, pagina: e.target.value })} placeholder={t("Identificador de la pàgina")} aria-label={t("Identificador de la pàgina")} />
              <input id="xa-fb-token" type="password" value={fb.token} onChange={(e) => setFb({ ...fb, token: e.target.value })} placeholder={t("Token de la pàgina")} aria-label={t("Token de la pàgina")} autoComplete="off" />
              <button className="boto boto-petit" disabled={!fb.pagina || !fb.token || DEMO} onClick={() => desa({ facebook_pagina: fb.pagina, facebook_token: fb.token }, t("Facebook connectat."))}>
                {t("Connecta")}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="targeta">
        <h2>{t("Etiquetes habituals")}</h2>
        <p className="apagat petit">{t("S'afegeixen al final del text proposat a partir d'una activitat o notícia.")}</p>
        <div className="afegeix-linia">
          <input id="xa-hashtags" value={hashtags ?? ''} onChange={(e) => setHashtags(e.target.value)} placeholder={t("#Pollença #CulturaPopular")} aria-label={t("Etiquetes")} />
          <button className="boto boto-petit" onClick={() => desa({ hashtags }, t("Etiquetes desades."))}>
            {t("Desa")}
          </button>
        </div>
      </section>
    </>
  );
}
