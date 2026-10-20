import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import { avui, data } from '../format';
import { redueixImatge } from '../imatges';
import { EditorText } from '../components/EditorText';
import { AvisDretsImatge } from '../components/AvisDretsImatge';
import { DissenyWeb } from '../components/web/Disseny';
import { DEMO } from '../mode';
import type { Activitat, Noticia, Pagina } from '../../shared/types';
import { locale, opcionsIdioma, t } from '../i18n';

const PESTANYES = [
  { id: 'publicacio', text: t("Publicació") },
  { id: 'noticies', text: t("Notícies") },
  { id: 'pagines', text: t("Pàgines") },
  { id: 'disseny', text: t("Disseny") },
  { id: 'textos', text: t("Textos i xarxes") },
  { id: 'ftp', text: t("Connexió FTP") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

/** Imatge de notícies i activitats: 1200 × 675 (16:9), bona per a la web i per a les xarxes. */
export const IMATGE_WEB = { ample: 1200, alt: 675 };

export default function Web() {
  const [pestanya, setPestanya] = useState<Pestanya>('publicacio');
  return (
    <>
      <Capcalera titol={t("Web")} subtitol={t("La web pública de l'entitat es genera a partir de les dades del programa")} />
      <div className="pestanyes" role="tablist">
        {PESTANYES.filter((p) => !DEMO || p.id !== 'ftp').map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'publicacio' && <Publicacio />}
      {pestanya === 'noticies' && <Noticies />}
      {pestanya === 'pagines' && <Pagines />}
      {pestanya === 'disseny' && <DissenyWeb />}
      {pestanya === 'textos' && <Textos />}
      {pestanya === 'ftp' && <Ftp />}
    </>
  );
}

// ---------- Publicació i previsualització ----------

interface EstatWeb {
  canvis_el: string | null;
  publicada_el: string | null;
  pendent: boolean;
  publicant: boolean;
  error: string | null;
  auto: boolean;
  ftp_configurat: boolean;
  fitxers: number | null;
}

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale(), { dateStyle: 'long', timeStyle: 'short' }) : '—');

function Publicacio() {
  const { data: estat, reload } = useApi<EstatWeb>('/web/estat');
  const [publicant, setPublicant] = useState(false);

  async function publica() {
    setPublicant(true);
    try {
      const r = await api.post<{ fitxers: number }>('/web/publica');
      avisa(t("Web publicada ({0} fitxers).", r.fitxers));
    } catch (e) {
      avisaError(e);
    } finally {
      setPublicant(false);
      reload();
    }
  }

  async function auto(valor: boolean) {
    try {
      await api.put('/web/auto', { auto: valor });
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      {estat && !DEMO && (
        <section className="targeta estat-web">
          <div className="estat-web-fila">
            <div>
              <span className={`insignia ${estat.pendent ? 'insignia-pendent' : 'insignia-pagada'}`}>
                {estat.pendent ? t("Hi ha canvis sense publicar") : estat.publicada_el ? t("Web al dia") : t("Encara no publicada")}
              </span>
              <p className="apagat petit">
                {t("Darrera publicació:")} {dataHora(estat.publicada_el)}
                {estat.fitxers ? t(" · {0} fitxers", estat.fitxers) : ''}
                <br />
                {t("Darrer canvi:")} {dataHora(estat.canvis_el)}
              </p>
            </div>
            <div className="accions">
              <button className="boto" onClick={publica} disabled={publicant || !estat.ftp_configurat}>
                {publicant ? t("Publicant…") : t("Publica ara")}
              </button>
            </div>
          </div>
          <label className="casella">
            <input type="checkbox" checked={estat.auto} onChange={(e) => auto(e.target.checked)} disabled={!estat.ftp_configurat} />
            {t("Publica automàticament quan hi hagi canvis (un minut després del darrer canvi)")}
          </label>
          {!estat.ftp_configurat && <p className="apagat petit">{t("Per publicar, configura primer la pestanya «Connexió FTP».")}</p>}
          {estat.error && <p className="error">{t("Darrer error:")} {estat.error}</p>}
        </section>
      )}
      <Previsualitzacio />
    </>
  );
}

// Script que s'afegeix a la pàgina previsualitzada: en lloc de navegar, avisa el programa de
// l'enllaç clicat. Així funciona encara que el marc no comparteixi origen amb el programa
// (com passa dins la demostració), i el marc mai surt de la previsualització.
const SCRIPT_ENLLACOS = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';if(/^#[a-z0-9-]+\\.html$/i.test(h))h=h.slice(1);else if(h.charAt(0)==='#')return;e.preventDefault();parent.postMessage({previsualitzacioWeb:h},'*');});<` + `/script>`; // partit: dins la demo, el codi va en un <script>

/** Prepara l'HTML generat per mostrar-lo dins del marc. */
function htmlPerAlMarc(html: string) {
  // Els enllaços interns passen a ser àncores: si el script no s'executés, no se'n surt.
  const h = html.replace(/href="([a-z0-9-]+\.html)"/gi, 'href="#$1"');
  return h.includes('</body>') ? h.replace('</body>', `${SCRIPT_ENLLACOS}</body>`) : h + SCRIPT_ENLLACOS;
}

/** Mostra la web generada dins d'un marc; els enllaços interns carreguen la pàgina corresponent. */
export function Previsualitzacio({ provisional }: { provisional?: Record<string, unknown> | null } = {}) {
  const [pagina, setPagina] = useState('index.html');
  // Disseny encara no desat (editor de disseny): es previsualitza amb POST.
  const provisionalRef = useRef(provisional);
  provisionalRef.current = provisional;
  const paginaRef = useRef('index.html');
  const [html, setHtml] = useState<string | null>(null);
  const [pagines, setPagines] = useState<{ fitxer: string; titol: string }[]>([]);
  const [versio, setVersio] = useState(0);
  const [mobil, setMobil] = useState(false);
  const marc = useRef<HTMLIFrameElement>(null);

  const carrega = useCallback((p: string) => {
    type Resposta = { pagina: string; html: string; pagines: { fitxer: string; titol: string }[] };
    const prov = provisionalRef.current;
    (prov
      ? api.post<Resposta>('/web/previsualitzacio', { ...prov, pagina: p })
      : api.get<Resposta>(`/web/previsualitzacio?pagina=${encodeURIComponent(p)}`)
    )
      .then((r) => {
        paginaRef.current = r.pagina;
        setPagina(r.pagina);
        setHtml(htmlPerAlMarc(r.html));
        setPagines(r.pagines ?? []);
        setVersio((v) => v + 1); // torna a crear el marc, encara que l'HTML sigui el mateix
      })
      .catch(avisaError);
  }, []);

  useEffect(() => carrega('index.html'), [carrega]);
  // Quan canvia el disseny provisional, es torna a generar la mateixa pàgina.
  useEffect(() => {
    if (provisional) carrega(paginaRef.current);
  }, [provisional, carrega]);

  useEffect(() => {
    function enMissatge(e: MessageEvent) {
      if (!marc.current || e.source !== marc.current.contentWindow) return;
      const href = (e.data as { previsualitzacioWeb?: unknown })?.previsualitzacioWeb;
      if (typeof href !== 'string') return;
      if (/^[a-z0-9-]+\.html$/i.test(href)) carrega(href);
      else if (/^(https?:|mailto:|tel:)/i.test(href)) window.open(href, '_blank', 'noopener');
    }
    window.addEventListener('message', enMissatge);
    return () => window.removeEventListener('message', enMissatge);
  }, [carrega]);

  return (
    <section className="targeta previsualitzacio">
      <div className="targeta-cap">
        <h2>{t("Previsualització")}</h2>
        <div className="accions">
          <select className="selector-pagina" aria-label={t("Pàgina")} value={pagina} onChange={(e) => carrega(e.target.value)}>
            {!pagines.some((p) => p.fitxer === pagina) && <option value={pagina}>{pagina}</option>}
            {pagines.map((p) => (
              <option key={p.fitxer} value={p.fitxer}>
                {p.titol}
              </option>
            ))}
          </select>
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => carrega('index.html')}>
            {t("Inici")}
          </button>
          <button type="button" className="boto boto-petit boto-secundari" aria-pressed={mobil} onClick={() => setMobil(!mobil)}>
            {mobil ? t("Vista ordinador") : t("Vista mòbil")}
          </button>
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => carrega(pagina)}>
            {t("Actualitza")}
          </button>
        </div>
      </div>
      {!html ? (
        <p className="apagat">{t("Generant…")}</p>
      ) : (
        <div className={`marc-web ${mobil ? 'marc-mobil' : ''}`}>
          <iframe key={versio} ref={marc} title={t("Previsualització de la web")} srcDoc={html} sandbox="allow-scripts" />
        </div>
      )}
    </section>
  );
}

// ---------- Notícies ----------

function Noticies() {
  const { data: llista, error, reload } = useApi<(Noticia & { te_imatge: number; activitat_nom: string | null })[]>('/web/noticies');
  const [editant, setEditant] = useState<Partial<Noticia> | null>(null);

  async function obre(id: number) {
    try {
      setEditant(await api.get<Noticia>(`/web/noticies/${id}`));
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <div className="barra-accions">
        <button className="boto" onClick={() => setEditant({ data: avui(), publicada: 1, contingut: '' })}>
          {t("+ Nova notícia")}
        </button>
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("Encara no hi ha notícies. Explica què ha fet l'entitat: una crònica d'una activitat, una convocatòria…")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Títol")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((n) => (
                <tr key={n.id} onClick={() => obre(n.id)}>
                  <td className="nowrap">{data(n.data)}</td>
                  <td>
                    <strong>{n.titol}</strong>
                    {n.activitat_nom && <div className="apagat petit">{t("Activitat:")} {n.activitat_nom}</div>}
                  </td>
                  <td>
                    {!n.publicada ? (
                      <span className="insignia insignia-exempta">{t("Esborrany")}</span>
                    ) : n.data > avui() ? (
                      <span className="insignia insignia-pendent">{t("Programada")}</span>
                    ) : (
                      <span className="insignia insignia-pagada">{t("Publicada")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormNoticia
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function CampImatge({ valor, onChange }: { valor: string | null; onChange: (v: string | null) => void }) {
  async function tria(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      onChange(await redueixImatge(f, IMATGE_WEB.ample, IMATGE_WEB.alt, 0.85));
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <div className="camp-imatge-web camp-ample">
      {valor ? <img src={valor} alt="" /> : <div className="imatge-buida">{t("Sense imatge")}</div>}
      <div className="camp-foto-accions">
        <label className="boto boto-petit boto-secundari">
          {valor ? t("Canvia la imatge") : t("Afegeix una imatge")}
          <input type="file" accept="image/*" onChange={tria} hidden />
        </label>
        {valor && (
          <button type="button" className="boto boto-petit boto-perill" onClick={() => onChange(null)}>
            {t("Treu la imatge")}
          </button>
        )}
        <span className="camp-ajuda">{t("Es retalla en format apaïsat (16:9).")}</span>
      </div>
    </div>
  );
}

function FormNoticia(props: { inicial: Partial<Noticia>; onClose: () => void; onFet: () => void }) {
  const n = props.inicial;
  const { data: activitats } = useApi<Activitat[]>('/activitats?exercici=totes');
  const [f, setF] = useState({
    titol: n.titol ?? '',
    data: n.data ?? avui(),
    resum: n.resum ?? '',
    contingut: n.contingut ?? '',
    activitat_id: n.activitat_id ? String(n.activitat_id) : '',
    publicada: n.publicada === undefined ? true : Boolean(n.publicada),
  });
  const [imatge, setImatge] = useState<string | null>(n.imatge ?? null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      const cos = { ...f, imatge };
      if (n.id) await api.put(`/web/noticies/${n.id}`, cos);
      else await api.post('/web/noticies', cos);
      avisa(t("Notícia desada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta notícia?")))) return;
    try {
      await api.del(`/web/noticies/${n.id}`);
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={n.id ? t("Edita la notícia") : t("Nova notícia")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Títol")} ample>
          <input id="not-titol" value={f.titol} onChange={set('titol')} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Data de publicació")} ajuda={t("Si és futura, sortirà a la web aquell dia")}>
          <input id="not-data" type="date" value={f.data} onChange={set('data')} required />
        </Camp>
        <Camp etiqueta={t("Activitat relacionada (opcional)")}>
          <select id="not-activitat" value={f.activitat_id} onChange={set('activitat_id')}>
            <option value="">—</option>
            {activitats?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom} ({data(a.data_inici)})
              </option>
            ))}
          </select>
        </Camp>
        <AvisDretsImatge activitatId={f.activitat_id} />
        <CampImatge valor={imatge} onChange={setImatge} />
        <Camp etiqueta={t("Resum")} ample ajuda={t("Una o dues frases. Surt a la llista de notícies i quan es comparteix l'enllaç.")}>
          <textarea id="not-resum" rows={2} value={f.resum} onChange={set('resum')} />
        </Camp>
        <Camp etiqueta={t("Text")} ample grup>
          <EditorText id="not-contingut" files={12} valor={f.contingut} onChange={(v) => set('contingut')({ target: { value: v } })} />
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} />
          {t("Publicada (desmarca-ho per desar-la com a esborrany)")}
        </label>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {n.id && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Pàgines pròpies ----------

function Pagines() {
  const { data: llista, error, reload } = useApi<Pagina[]>('/web/pagines');
  const [editant, setEditant] = useState<Partial<Pagina> | null>(null);

  return (
    <>
      <p className="apagat petit">
        {t("La web ja inclou automàticament Inici, Agenda (amb les activitats), Notícies, Qui som (amb les finalitats), Fes-te'n soci (amb les quotes) i Contacte. Aquí pots afegir-hi altres pàgines, com «Projectes», «Arxiu» o «Col·labora».")}
      </p>
      <div className="barra-accions">
        <button className="boto" onClick={() => setEditant({ publicada: 1, ordre: (llista?.length ?? 0) + 1, contingut: '' })}>
          {t("+ Nova pàgina")}
        </button>
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("No hi ha pàgines pròpies.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th className="num">{t("Ordre")}</th>
                <th>{t("Títol")}</th>
                <th>{t("Adreça")}</th>
                <th>{t("Estat")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((p) => (
                <tr key={p.id} onClick={async () => setEditant(await api.get<Pagina>(`/web/pagines/${p.id}`).catch((e) => (avisaError(e), null)))}>
                  <td className="num">{p.ordre}</td>
                  <td>{p.titol}</td>
                  <td className="apagat">{p.slug}{t(".html")}</td>
                  <td>{p.publicada ? <span className="insignia insignia-pagada">{t("Publicada")}</span> : <span className="insignia insignia-exempta">{t("Amagada")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormPagina
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function FormPagina(props: { inicial: Partial<Pagina>; onClose: () => void; onFet: () => void }) {
  const p = props.inicial;
  const [f, setF] = useState({
    titol: p.titol ?? '',
    contingut: p.contingut ?? '',
    ordre: String(p.ordre ?? 1),
    publicada: p.publicada === undefined ? true : Boolean(p.publicada),
  });
  const [error, setError] = useState<string | null>(null);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (p.id) await api.put(`/web/pagines/${p.id}`, { ...f, slug: p.slug });
      else await api.post('/web/pagines', f);
      avisa(t("Pàgina desada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta pàgina?")))) return;
    try {
      await api.del(`/web/pagines/${p.id}`);
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={p.id ? t("Edita la pàgina") : t("Nova pàgina")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Títol")} ample>
          <input id="pag-titol" value={f.titol} onChange={(e) => setF({ ...f, titol: e.target.value })} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Posició al menú")}>
          <input id="pag-ordre" type="number" value={f.ordre} onChange={(e) => setF({ ...f, ordre: e.target.value })} />
        </Camp>
        <Camp etiqueta={t("Text")} ample grup>
          <EditorText id="pag-contingut" files={14} valor={f.contingut} onChange={(v) => setF((x) => ({ ...x, contingut: v }))} />
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} />
          {t("Visible a la web")}
        </label>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {p.id && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Textos i aparença ----------

type ConfigWeb = Record<string, string>;

function Textos() {
  const { data: cfg, error } = useApi<ConfigWeb>('/web/config');
  const [f, setF] = useState<ConfigWeb | null>(null);
  useEffect(() => setF(cfg), [cfg]);
  if (!f) return <Carregant error={error} />;
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function desa(e: FormEvent) {
    e.preventDefault();
    try {
      setF(await api.put<ConfigWeb>('/web/config', f));
      avisa(t("Desat. Ho veuràs a la previsualització."));
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("Dades generals")}</h2>
      <Camp etiqueta={t("Adreça de la web")} ajuda={t("p. ex. https://www.iaraque.cat (per als enllaços compartits)")}>
        <input id="web-url" value={f.web_url} onChange={set('web_url')} placeholder="https://" />
      </Camp>
      <Camp etiqueta={t('Idioma de la web')} ajuda={t('Els textos fixos de la web (menú, avís legal…) surten en aquest idioma')}>
        <select id="web-idioma" value={f.web_idioma || ''} onChange={set('web_idioma')}>
          <option value="">{t('El del programa')}</option>
          {opcionsIdioma().map((o) => (
            <option key={o.codi} value={o.codi}>
              {o.nom}
            </option>
          ))}
        </select>
      </Camp>
      <Camp etiqueta={t("Descripció per als cercadors")} ample ajuda={t("Una frase que resumeixi l'entitat (Google la mostra als resultats)")}>
        <input id="web-descripcio" value={f.web_descripcio} onChange={set('web_descripcio')} />
      </Camp>
      <p className="apagat petit camp-ample">{t("El nom, el lema i les dades de contacte es prenen de Configuració → Entitat. Els colors, les fonts, el logotip i l'ordre dels blocs es trien a la pestanya «Disseny».")}</p>

      <h2 className="camp-ample">{t("Textos de les pàgines")}</h2>
      <Camp etiqueta={t("Presentació a la portada")} ample grup>
        <EditorText id="web-inici" files={4} senzill valor={f.web_text_inici ?? ''} onChange={(v) => set('web_text_inici')({ target: { value: v } })} />
      </Camp>
      <Camp etiqueta={t("Qui som")} ample grup ajuda={t("Es mostra abans de la llista de finalitats")}>
        <EditorText id="web-qui-som" files={6} valor={f.web_text_qui_som ?? ''} onChange={(v) => set('web_text_qui_som')({ target: { value: v } })} />
      </Camp>
      <Camp etiqueta={t("Fes-te'n soci")} ample grup ajuda={t("Es mostra abans de la taula de quotes")}>
        <EditorText id="web-soci" files={4} senzill valor={f.web_text_soci ?? ''} onChange={(v) => set('web_text_soci')({ target: { value: v } })} />
      </Camp>

      <h2 className="camp-ample">{t("Xarxes socials")}</h2>
      <p className="apagat petit camp-ample">{t("Enllaços que surten al peu de la web. Deixa en blanc les que no feu servir.")}</p>
      {[
        ['web_instagram', t("Instagram")],
        ['web_tiktok', t("TikTok")],
        ['web_youtube', t("YouTube")],
        ['web_x', t("X (Twitter)")],
        ['web_facebook', t("Facebook")],
      ].map(([k, nom]) => (
        <Camp key={k} etiqueta={nom}>
          <input id={k} value={f[k]} onChange={set(k)} placeholder="https://" />
        </Camp>
      ))}
      <div className="formulari-peu camp-ample">
        <span className="espai" />
        <button className="boto">{t("Desa")}</button>
      </div>
    </form>
  );
}

// ---------- FTP ----------

interface ConfigFtp {
  ftp_host: string;
  ftp_port: string;
  ftp_usuari: string;
  ftp_carpeta: string;
  ftp_segur: string;
  te_contrasenya: boolean;
}

function Ftp() {
  const { data: cfg, error, reload } = useApi<ConfigFtp>('/web/ftp');
  const [f, setF] = useState<ConfigFtp | null>(null);
  const [contrasenya, setContrasenya] = useState('');
  const [provant, setProvant] = useState(false);
  useEffect(() => setF(cfg), [cfg]);
  if (!f) return <Carregant error={error} />;
  const set = (k: keyof ConfigFtp) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function desa(e?: FormEvent) {
    e?.preventDefault();
    try {
      await api.put('/web/ftp', { ...f, ftp_contrasenya: contrasenya || undefined });
      setContrasenya('');
      reload();
      avisa(t("Connexió FTP desada."));
      return true;
    } catch (err) {
      avisaError(err);
      return false;
    }
  }

  async function prova() {
    if (!(await desa())) return;
    setProvant(true);
    try {
      const r = await api.post<{ missatge: string }>('/web/ftp/prova');
      avisa(r.missatge);
    } catch (err) {
      avisaError(err);
    } finally {
      setProvant(false);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("Connexió amb l'allotjament de la web")}</h2>
      <p className="apagat petit camp-ample">
        {t("Les dades d'accés FTP les dona la vostra empresa d'allotjament (hosting). La web es puja a la carpeta indicada; si hi havia altres fitxers, no s'esborren.")}
      </p>
      <Camp etiqueta={t("Servidor")} ajuda={t("p. ex. ftp.iaraque.cat")}>
        <input id="ftp-host" value={f.ftp_host} onChange={set('ftp_host')} />
      </Camp>
      <Camp etiqueta={t("Port")}>
        <input id="ftp-port" inputMode="numeric" value={f.ftp_port} onChange={set('ftp_port')} />
      </Camp>
      <Camp etiqueta={t("Usuari")}>
        <input id="ftp-usuari" value={f.ftp_usuari} onChange={set('ftp_usuari')} autoComplete="off" />
      </Camp>
      <Camp etiqueta={t("Contrasenya")} ajuda={f.te_contrasenya ? t("Ja n'hi ha una de desada. Deixa-ho en blanc per mantenir-la.") : undefined}>
        <input id="ftp-contrasenya" type="password" value={contrasenya} onChange={(e) => setContrasenya(e.target.value)} autoComplete="new-password" />
      </Camp>
      <Camp etiqueta={t("Carpeta de la web")} ajuda={t("Sovint /public_html, /httpdocs o /www")}>
        <input id="ftp-carpeta" value={f.ftp_carpeta} onChange={set('ftp_carpeta')} />
      </Camp>
      <Camp etiqueta={t("Connexió")}>
        <select id="ftp-segur" value={f.ftp_segur} onChange={set('ftp_segur')}>
          <option value="ftps">{t("Segura (FTPS) — recomanada")}</option>
          <option value="ftps_sense_verificar">{t("Segura, sense verificar el certificat")}</option>
          <option value="ftp">{t("Sense xifrar (FTP) — només si no n'hi ha cap altra")}</option>
        </select>
      </Camp>
      <div className="formulari-peu camp-ample">
        <button type="button" className="boto boto-secundari" onClick={prova} disabled={provant}>
          {provant ? t("Provant…") : t("Desa i prova la connexió")}
        </button>
        <span className="espai" />
        <button className="boto">{t("Desa")}</button>
      </div>
    </form>
  );
}
