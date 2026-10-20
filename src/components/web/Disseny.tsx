// Editor del disseny de la web: tema, colors, tipografies, logotip i capçalera, portada per blocs,
// menú, peu i CSS propi, amb previsualització en directe del disseny encara no desat.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, useApi } from '../../api';
import { Camp, Carregant, avisa, avisaError, confirma } from '../ui';
import { EditorText } from '../EditorText';
import { escalaImatge, redueixImatge } from '../../imatges';
import { t } from '../../i18n';
import { Previsualitzacio } from '../../pages/Web';
import { LlistaOrdenable } from './LlistaOrdenable';
import { FONTS, TEMES, aplicaTema, bloc, dissenyPerDefecte, font, textSobre } from '../../../shared/disseny';
import type { BlocInici, Disseny as TDisseny, FonsBloc, IdMenu, IdTipusBloc } from '../../../shared/disseny';
import '../../styles/disseny.css';

interface Estat {
  disseny: TDisseny;
  logo: string | null;
  heroi: string | null;
  logo_entitat: boolean;
}

const NOMS_BLOCS = (): Record<IdTipusBloc, string> => ({
  heroi: t("Presentació (capçalera de la portada)"),
  activitats: t("Properes activitats"),
  noticies: t("Últimes notícies"),
  finalitats: t("Què fem (finalitats)"),
  soci: t("Fes-te'n soci"),
  contacte: t("Contacte"),
  xarxes: t("Xarxes socials"),
  text: t("Bloc de text"),
});

const NOMS_MENU = (): Record<IdMenu, string> => ({
  inici: t("Inici"),
  agenda: t("Agenda"),
  noticies: t("Notícies"),
  'qui-som': t("Qui som"),
  pagines: t("Pàgines pròpies"),
  soci: t("Fes-te'n soci"),
  contacte: t("Contacte"),
});

export function DissenyWeb() {
  const { data: desat, error, reload } = useApi<Estat>('/web/disseny');
  const [e, setE] = useState<Estat | null>(null);
  const [provisional, setProvisional] = useState<Record<string, unknown> | null>(null);
  const [desant, setDesant] = useState(false);

  useEffect(() => {
    if (desat) setE(desat);
  }, [desat]);

  // La previsualització es regenera mig segon després de l'últim canvi.
  useEffect(() => {
    if (!e) return;
    const id = setTimeout(() => setProvisional({ disseny: e.disseny, logo: e.logo, heroi: e.heroi }), 450);
    return () => clearTimeout(id);
  }, [e]);

  const canviat = useMemo(() => Boolean(e && desat && JSON.stringify(e) !== JSON.stringify(desat)), [e, desat]);
  if (!e) return <Carregant error={error} />;
  const d = e.disseny;
  const setD = (canvi: Partial<TDisseny>) => setE({ ...e, disseny: { ...d, ...canvi } });
  const sub = <K extends 'colors' | 'fonts' | 'forma' | 'capcalera' | 'heroi' | 'peu' | 'targetes'>(clau: K, canvi: Partial<TDisseny[K]>) =>
    setD({ [clau]: { ...d[clau], ...canvi } } as Partial<TDisseny>);

  async function desa() {
    setDesant(true);
    try {
      const r = await api.put<Estat>('/web/disseny', { disseny: e!.disseny, logo: e!.logo, heroi: e!.heroi });
      setE(r);
      reload();
      avisa(t("Disseny desat. Es publicarà amb la propera publicació de la web."));
    } catch (err) {
      avisaError(err);
    } finally {
      setDesant(false);
    }
  }

  async function restableix() {
    if (!(await confirma(t("Vols tornar al disseny per defecte? Es perdran els colors, les fonts i l'ordre dels blocs (no les imatges ni els textos de les pàgines)."))))
      return;
    setD(dissenyPerDefecte());
  }

  return (
    <div className="disseny-web">
      <div className="disseny-controls">
        <div className="disseny-barra">
          <span className={canviat ? 'disseny-pendent' : 'apagat petit'}>{canviat ? t("Hi ha canvis sense desar") : t("Tot desat")}</span>
          <span className="espai" />
          <button type="button" className="boto boto-secundari boto-petit" onClick={() => desat && setE(desat)} disabled={!canviat}>
            {t("Descarta")}
          </button>
          <button type="button" className="boto" onClick={desa} disabled={!canviat || desant}>
            {t("Desa el disseny")}
          </button>
        </div>

        <Seccio titol={t("Tema")} obert>
          <p className="apagat petit">{t("Un punt de partida: després pots canviar qualsevol color o font.")}</p>
          <div className="temes">
            {TEMES.map((tema) => (
              <button
                key={tema.id}
                type="button"
                className={`tema${d.tema === tema.id ? ' actiu' : ''}`}
                aria-pressed={d.tema === tema.id}
                onClick={() => setE({ ...e, disseny: aplicaTema(d, tema.id) })}
                style={{ background: tema.colors.fons, color: tema.colors.text, borderColor: tema.colors.vora }}
              >
                <span className="tema-mostres">
                  {[tema.colors.principal, tema.colors.peu_fons || '#2a2420', tema.colors.superficie].map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </span>
                <strong>{t(tema.nom)}</strong>
                <small>
                  {nomFont(tema.fonts.titols)} · {nomFont(tema.fonts.text)}
                </small>
              </button>
            ))}
          </div>
        </Seccio>

        <Seccio titol={t("Colors")}>
          <div className="colors-graella">
            <Color etiqueta={t("Principal")} valor={d.colors.principal} onChange={(v) => sub('colors', { principal: v })} />
            <Color etiqueta={t("Fons de la pàgina")} valor={d.colors.fons} onChange={(v) => sub('colors', { fons: v })} />
            <Color etiqueta={t("Fons de les targetes")} valor={d.colors.superficie} onChange={(v) => sub('colors', { superficie: v })} />
            <Color etiqueta={t("Text")} valor={d.colors.text} onChange={(v) => sub('colors', { text: v })} />
            <Color etiqueta={t("Text secundari")} valor={d.colors.apagat} onChange={(v) => sub('colors', { apagat: v })} />
            <Color etiqueta={t("Línies i vores")} valor={d.colors.vora} onChange={(v) => sub('colors', { vora: v })} />
            <Color etiqueta={t("Fons de la capçalera")} valor={d.colors.capcalera_fons} automatic={d.colors.superficie} onChange={(v) => sub('colors', { capcalera_fons: v })} />
            <Color
              etiqueta={t("Text de la capçalera")}
              valor={d.colors.capcalera_text}
              automatic={d.colors.capcalera_fons ? textSobre(d.colors.capcalera_fons) : d.colors.text}
              onChange={(v) => sub('colors', { capcalera_text: v })}
            />
            <Color etiqueta={t("Fons del peu")} valor={d.colors.peu_fons} automatic="#2a2420" onChange={(v) => sub('colors', { peu_fons: v })} />
            <Color etiqueta={t("Text del peu")} valor={d.colors.peu_text} automatic={textSobre(d.colors.peu_fons || '#2a2420')} onChange={(v) => sub('colors', { peu_text: v })} />
          </div>
        </Seccio>

        <Seccio titol={t("Tipografia")}>
          <Camp etiqueta={t("Font dels títols")}>
            <SelectorFont valor={d.fonts.titols} onChange={(v) => sub('fonts', { titols: v })} />
          </Camp>
          <Camp etiqueta={t("Font del text")}>
            <SelectorFont valor={d.fonts.text} onChange={(v) => sub('fonts', { text: v })} />
          </Camp>
          <Opcions
            etiqueta={t("Mida del text")}
            valor={d.fonts.mida}
            opcions={[
              ['petita', t("Petita")],
              ['normal', t("Normal")],
              ['gran', t("Gran")],
            ]}
            onChange={(v) => sub('fonts', { mida: v })}
          />
          <p className="apagat petit">
            {t("Les fonts es descarreguen i es pugen a la vostra web en publicar-la: els visitants no es connecten a Google.")}
          </p>
        </Seccio>

        <Seccio titol={t("Formes")}>
          <Opcions
            etiqueta={t("Cantonades")}
            valor={d.forma.cantonades}
            opcions={[
              ['rectes', t("Rectes")],
              ['suaus', t("Suaus")],
              ['arrodonides', t("Arrodonides")],
            ]}
            onChange={(v) => sub('forma', { cantonades: v })}
          />
          <Opcions
            etiqueta={t("Botons")}
            valor={d.forma.botons}
            opcions={[
              ['pindola', t("Arrodonits")],
              ['rectangle', t("Rectangulars")],
              ['contorn', t("Només contorn")],
            ]}
            onChange={(v) => sub('forma', { botons: v })}
          />
          <Casella etiqueta={t("Ombres suaus a les targetes")} valor={d.forma.ombres} onChange={(v) => sub('forma', { ombres: v })} />
          <Opcions
            etiqueta={t("Columnes de targetes (activitats i notícies)")}
            valor={String(d.targetes.columnes) as '2' | '3' | '4'}
            opcions={[
              ['2', '2'],
              ['3', '3'],
              ['4', '4'],
            ]}
            onChange={(v) => sub('targetes', { columnes: Number(v) as 2 | 3 | 4 })}
          />
          <Opcions
            etiqueta={t("Estil de les targetes")}
            valor={d.targetes.estil}
            opcions={[
              ['imatge', t("Amb imatge")],
              ['compacta', t("Només text")],
            ]}
            onChange={(v) => sub('targetes', { estil: v })}
          />
        </Seccio>

        <Seccio titol={t("Logotip i capçalera")}>
          <CampImatge
            etiqueta={t("Logotip de la web")}
            ajuda={
              e.logo_entitat
                ? t("Si no en puges cap, es fa servir el de l'entitat (Configuració → Entitat). Millor en PNG amb fons transparent.")
                : t("Millor en PNG amb fons transparent.")
            }
            valor={e.logo}
            forma="logo"
            onChange={(v) => setE({ ...e, logo: v })}
            processa={(f) => escalaImatge(f, 800, 300, 'png')}
          />
          <Opcions
            etiqueta={t("Disposició")}
            valor={d.capcalera.disposicio}
            opcions={[
              ['esquerra', t("Logotip a l'esquerra, menú a la dreta")],
              ['centrada', t("Tot centrat")],
              ['plegada', t("Menú sempre plegat")],
            ]}
            onChange={(v) => sub('capcalera', { disposicio: v })}
          />
          <Opcions
            etiqueta={t("Mida del logotip")}
            valor={d.capcalera.mida_logo}
            opcions={[
              ['petit', t("Petit")],
              ['mitja', t("Mitjà")],
              ['gran', t("Gran")],
            ]}
            onChange={(v) => sub('capcalera', { mida_logo: v })}
          />
          <Opcions
            etiqueta={t("Forma del logotip")}
            valor={d.capcalera.forma_logo}
            opcions={[
              ['original', t("Original")],
              ['rodona', t("Rodona")],
              ['quadrada', t("Quadrada")],
            ]}
            onChange={(v) => sub('capcalera', { forma_logo: v })}
          />
          <Casella etiqueta={t("Mostra el nom de l'entitat al costat del logotip")} valor={d.capcalera.mostra_nom} onChange={(v) => sub('capcalera', { mostra_nom: v })} />
          <Casella etiqueta={t("Capçalera fixa en fer desplaçament")} valor={d.capcalera.fixa} onChange={(v) => sub('capcalera', { fixa: v })} />
          <Casella etiqueta={t("Menú en majúscules")} valor={d.capcalera.menu_majuscules} onChange={(v) => sub('capcalera', { menu_majuscules: v })} />
        </Seccio>

        <Seccio titol={t("Portada")}>
          <CampImatge
            etiqueta={t("Imatge de fons de la presentació")}
            ajuda={t("Opcional. Una foto horitzontal; es mostra enfosquida perquè el text es llegeixi bé.")}
            valor={e.heroi}
            forma="ampla"
            onChange={(v) => setE({ ...e, heroi: v })}
            processa={(f) => redueixImatge(f, 1600, 900, 0.8)}
          />
          {e.heroi && (
            <Camp etiqueta={t("Enfosquiment de la imatge: {0} %", d.heroi.enfosquiment)}>
              <input type="range" min={0} max={80} step={5} value={d.heroi.enfosquiment} onChange={(ev) => sub('heroi', { enfosquiment: Number(ev.target.value) })} />
            </Camp>
          )}
          <Opcions
            etiqueta={t("Alçada de la presentació")}
            valor={d.heroi.alcada}
            opcions={[
              ['baixa', t("Baixa")],
              ['mitjana', t("Mitjana")],
              ['alta', t("Alta")],
            ]}
            onChange={(v) => sub('heroi', { alcada: v })}
          />
          <Opcions
            etiqueta={t("Alineació del text")}
            valor={d.heroi.alineacio}
            opcions={[
              ['esquerra', t("Esquerra")],
              ['centre', t("Centrat")],
            ]}
            onChange={(v) => sub('heroi', { alineacio: v })}
          />
          <Casella etiqueta={t("Botons «Fes-te'n soci» i «Veure l'agenda»")} valor={d.heroi.botons} onChange={(v) => sub('heroi', { botons: v })} />

          <h4>{t("Blocs de la portada")}</h4>
          <p className="apagat petit">{t("Arrossega'ls (o fes servir les fletxes) per canviar-ne l'ordre. Desmarca'ls per amagar-los.")}</p>
          <LlistaOrdenable
            items={d.inici}
            clau={(b) => b.id}
            onChange={(inici) => setD({ inici })}
            render={(b, actualitza, treu) => <EditorBloc bloc={b} onChange={actualitza} onTreu={b.tipus === 'text' ? treu : undefined} />}
          />
          <button type="button" className="boto boto-secundari boto-petit" onClick={() => setD({ inici: [...d.inici, bloc('text', { titol: t("Nou bloc") })] })}>
            {t("+ Afegeix un bloc de text")}
          </button>
        </Seccio>

        <Seccio titol={t("Menú")}>
          <p className="apagat petit">{t("Ordre dels apartats del menú. Els que amaguis es continuen publicant, però no surten al menú.")}</p>
          <LlistaOrdenable
            items={d.menu.ordre}
            clau={(m) => m}
            onChange={(ordre) => setD({ menu: { ...d.menu, ordre } })}
            render={(m) => (
              <label className="casella">
                <input
                  type="checkbox"
                  checked={!d.menu.amagats.includes(m)}
                  disabled={m === 'inici'}
                  onChange={(ev) =>
                    setD({ menu: { ...d.menu, amagats: ev.target.checked ? d.menu.amagats.filter((x) => x !== m) : [...d.menu.amagats, m] } })
                  }
                />
                {NOMS_MENU()[m]}
              </label>
            )}
          />
        </Seccio>

        <Seccio titol={t("Peu de pàgina")}>
          <Camp etiqueta={t("Text del peu")} grup ajuda={t("Opcional: un lema, l'horari d'atenció, agraïments a patrocinadors…")}>
            <EditorText files={3} senzill valor={d.peu.text} onChange={(v) => sub('peu', { text: v })} />
          </Camp>
          <Opcions
            etiqueta={t("Disposició")}
            valor={d.peu.alineacio}
            opcions={[
              ['columnes', t("En columnes")],
              ['centrat', t("Centrat")],
            ]}
            onChange={(v) => sub('peu', { alineacio: v })}
          />
          <Casella etiqueta={t("Dades de contacte")} valor={d.peu.mostra_contacte} onChange={(v) => sub('peu', { mostra_contacte: v })} />
          <Casella etiqueta={t("Enllaços a les xarxes socials")} valor={d.peu.mostra_xarxes} onChange={(v) => sub('peu', { mostra_xarxes: v })} />
          <Casella etiqueta={t("NIF i número de registre")} valor={d.peu.mostra_legal} onChange={(v) => sub('peu', { mostra_legal: v })} />
          <p className="apagat petit">{t("Els enllaços a l'avís legal i a la política de privacitat sempre hi surten (són obligatoris).")}</p>
        </Seccio>

        <Seccio titol={t("Avançat")}>
          <Camp etiqueta={t("CSS propi")} ajuda={t("Per a qui en sàpiga: s'afegeix al final del full d'estil de la web.")}>
            <textarea className="codi" rows={8} spellCheck={false} value={d.css} onChange={(ev) => setD({ css: ev.target.value })} placeholder=".heroi h1 { letter-spacing: -0.02em; }" />
          </Camp>
          <button type="button" className="boto boto-secundari boto-petit" onClick={restableix}>
            {t("Torna al disseny per defecte")}
          </button>
        </Seccio>
      </div>

      <div className="disseny-previsualitzacio">
        <Previsualitzacio provisional={provisional} />
      </div>
    </div>
  );
}

/** Nom de la font per mostrar: les del sistema es tradueixen, les de Google són noms propis. */
const nomFont = (id: string) => {
  const f = font(id);
  return f.google ? f.nom : t(f.nom);
};

// ---------- Peces del formulari ----------

function Seccio({ titol, obert, children }: { titol: string; obert?: boolean; children: ReactNode }) {
  return (
    <details className="disseny-seccio" open={obert}>
      <summary>{titol}</summary>
      <div className="disseny-seccio-cos">{children}</div>
    </details>
  );
}

function Color({ etiqueta, valor, automatic, onChange }: { etiqueta: string; valor: string; automatic?: string; onChange: (v: string) => void }) {
  const auto = automatic !== undefined && !valor;
  return (
    <div className="camp-color">
      <span className="camp-etiqueta">{etiqueta}</span>
      <div className="camp-color-fila">
        <input type="color" value={valor || automatic || '#000000'} aria-label={etiqueta} onChange={(e) => onChange(e.target.value)} className="input-color" />
        <input
          className="codi-color"
          value={auto ? '' : valor}
          placeholder={auto ? t("automàtic") : ''}
          aria-label={etiqueta}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-f]{6}$/i.test(v) || (automatic !== undefined && v === '')) onChange(v);
          }}
        />
        {automatic !== undefined && !auto && (
          <button type="button" className="enllac petit" onClick={() => onChange('')}>
            {t("automàtic")}
          </button>
        )}
      </div>
    </div>
  );
}

function SelectorFont({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const grups: [string, typeof FONTS][] = [
    [t("Amb gràcia (serif)"), FONTS.filter((f) => f.tipus === 'serif')],
    [t("Sense gràcia (sans)"), FONTS.filter((f) => f.tipus === 'sans')],
    [t("Decoratives"), FONTS.filter((f) => f.tipus === 'display')],
  ];
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}>
      {grups.map(([nom, fonts]) => (
        <optgroup key={nom} label={nom}>
          {fonts.map((f) => (
            <option key={f.id} value={f.id}>
              {nomFont(f.id)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Opcions<T extends string>({ etiqueta, valor, opcions, onChange }: { etiqueta: string; valor: T; opcions: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="camp-opcions" role="radiogroup" aria-label={etiqueta}>
      <span className="camp-etiqueta">{etiqueta}</span>
      <div className="opcions-botons">
        {opcions.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={valor === v} className={valor === v ? 'actiu' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Casella({ etiqueta, valor, onChange }: { etiqueta: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="casella">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      {etiqueta}
    </label>
  );
}

function CampImatge(props: {
  etiqueta: string;
  ajuda: string;
  valor: string | null;
  forma: 'logo' | 'ampla';
  onChange: (v: string | null) => void;
  processa: (f: File) => Promise<string>;
}) {
  async function tria(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      props.onChange(await props.processa(f));
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <div className="disseny-imatge">
      <span className="camp-etiqueta">{props.etiqueta}</span>
      <div className={`disseny-imatge-mostra disseny-imatge-${props.forma}`}>
        {props.valor ? <img src={props.valor} alt="" /> : <span className="apagat petit">{t("Sense imatge")}</span>}
      </div>
      <div className="accions">
        <label className="boto boto-secundari boto-petit">
          {props.valor ? t("Canvia la imatge") : t("Puja una imatge")}
          <input type="file" accept="image/*" hidden onChange={tria} />
        </label>
        {props.valor && (
          <button type="button" className="boto boto-secundari boto-petit" onClick={() => props.onChange(null)}>
            {t("Treu la imatge")}
          </button>
        )}
      </div>
      <p className="apagat petit">{props.ajuda}</p>
    </div>
  );
}

function EditorBloc({ bloc: b, onChange, onTreu }: { bloc: BlocInici; onChange: (b: BlocInici) => void; onTreu?: () => void }) {
  const [obert, setObert] = useState(false);
  const noms = NOMS_BLOCS();
  return (
    <div className={`editor-bloc${b.visible ? '' : ' amagat'}`}>
      <div className="editor-bloc-cap">
        <label className="casella">
          <input type="checkbox" checked={b.visible} onChange={(e) => onChange({ ...b, visible: e.target.checked })} aria-label={t("Visible")} />
          <strong>{b.tipus === 'text' && b.titol ? b.titol : noms[b.tipus]}</strong>
        </label>
        {b.tipus !== 'heroi' && (
          <button type="button" className="enllac petit" onClick={() => setObert(!obert)} aria-expanded={obert}>
            {obert ? t("Tanca") : t("Opcions")}
          </button>
        )}
        {onTreu && (
          <button type="button" className="enllac petit perill" onClick={onTreu}>
            {t("Elimina")}
          </button>
        )}
      </div>
      {obert && (
        <div className="editor-bloc-cos">
          <Camp etiqueta={b.tipus === 'text' ? t("Títol") : t("Títol (en blanc, el per defecte)")}>
            <input value={b.titol} onChange={(e) => onChange({ ...b, titol: e.target.value })} placeholder={b.tipus === 'text' ? '' : noms[b.tipus]} />
          </Camp>
          {(b.tipus === 'activitats' || b.tipus === 'noticies') && (
            <Camp etiqueta={t("Quantes se'n mostren")}>
              <select value={b.quantitat} onChange={(e) => onChange({ ...b, quantitat: Number(e.target.value) })}>
                {[2, 3, 4, 6, 8, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Camp>
          )}
          <Opcions<FonsBloc>
            etiqueta={t("Fons del bloc")}
            valor={b.fons}
            opcions={[
              ['normal', t("Normal")],
              ['suau', t("Color suau")],
              ['color', t("Color principal")],
            ]}
            onChange={(fons) => onChange({ ...b, fons })}
          />
          {b.tipus === 'text' && (
            <Camp etiqueta={t("Text")} grup>
              <EditorText files={5} valor={b.text} onChange={(text) => onChange({ ...b, text })} />
            </Camp>
          )}
        </div>
      )}
    </div>
  );
}
