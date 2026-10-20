// Ajuda: manual d'usuari per seccions, cerca, preguntes freqüents, glossari, novetats i informació del programa.
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { Capcalera, Carregant } from '../components/ui';
import { useEntitat } from '../entitat';
import { DEMO } from '../mode';
import { IDIOMES, idioma, locale, t } from '../i18n';
import { markdown } from '../../shared/markdown';
import { ARTICLES, GLOSSARI, PREGUNTES, SECCIONS, articlePerId, cerca, tx } from '../ajuda';
import { NOVETATS } from '../ajuda/novetats';
import { PERFILS } from '../../shared/permisos';
import type { Article, IdSeccio } from '../ajuda/tipus';
import '../styles/ajuda.css';

const NOMS_SECCIONS = (): Record<IdSeccio, string> => ({
  'primers-passos': t("Primers passos"),
  persones: t("Persones"),
  activitats: t("Activitats i difusió"),
  economia: t("Economia"),
  govern: t("Govern i compliment"),
  sistema: t("Eines i configuració"),
});

const ESPECIALS = (): [string, string][] => [
  ['preguntes', t("Preguntes freqüents")],
  ['glossari', t("Glossari")],
  ['novetats', t("Novetats")],
  ['quant-a', t("Quant al programa")],
];

export default function Ajuda() {
  const { article: id } = useParams();
  const [consulta, setConsulta] = useState('');
  const resultats = useMemo(() => (consulta.trim().length > 1 ? cerca(consulta) : null), [consulta]);
  const article = id ? articlePerId(id) : undefined;

  let contingut;
  if (resultats) contingut = <Resultats resultats={resultats.map((r) => r.article)} consulta={consulta} onTria={() => setConsulta('')} />;
  else if (id === 'preguntes') contingut = <Preguntes />;
  else if (id === 'glossari') contingut = <Glossari />;
  else if (id === 'novetats') contingut = <Novetats />;
  else if (id === 'quant-a') contingut = <QuantA />;
  else if (article) contingut = <VistaArticle article={article} />;
  else contingut = <Portada />;

  return (
    <>
      <Capcalera titol={t("Ajuda")} subtitol={t("Manual d'usuari, preguntes freqüents i informació del programa")} />
      <div className="ajuda">
        <aside className="ajuda-index" aria-label={t("Índex de l'ajuda")}>
          <input
            type="search"
            className="ajuda-cerca"
            placeholder={t("Cerca a l'ajuda…")}
            aria-label={t("Cerca a l'ajuda")}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
          />
          <nav>
            <Link to="/ajuda" className={!id ? 'actiu' : ''}>
              {t("Inici de l'ajuda")}
            </Link>
            {SECCIONS.map((s) => {
              const articles = ARTICLES.filter((a) => a.seccio === s);
              if (!articles.length) return null;
              return (
                <details key={s} open={articles.some((a) => a.id === id) || s === 'primers-passos'}>
                  <summary>{NOMS_SECCIONS()[s]}</summary>
                  {articles.map((a) => (
                    <Link key={a.id} to={`/ajuda/${a.id}`} className={a.id === id ? 'actiu' : ''} onClick={() => setConsulta('')}>
                      {tx(a.titol)}
                    </Link>
                  ))}
                </details>
              );
            })}
            <div className="ajuda-especials">
              {ESPECIALS().map(([e, nom]) => (
                <Link key={e} to={`/ajuda/${e}`} className={id === e ? 'actiu' : ''} onClick={() => setConsulta('')}>
                  {nom}
                </Link>
              ))}
            </div>
          </nav>
        </aside>
        <div className="ajuda-cos">{contingut}</div>
      </div>
    </>
  );
}

/** Text Markdown de l'ajuda; els enllaços interns («/quotes», «/ajuda/…») naveguen dins del programa. */
function TextAjuda({ md }: { md: string }) {
  const navega = useNavigate();
  const html = useMemo(() => markdown(md), [md]);
  function clic(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (href && href.startsWith('/')) {
      e.preventDefault();
      navega(href);
    }
  }
  return <div className="ajuda-text" onClick={clic} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Portada() {
  const { usuari } = useEntitat();
  const primers = ARTICLES.filter((a) => a.seccio === 'primers-passos');
  return (
    <div className="ajuda-portada">
      <section className="targeta">
        <h2>{t("Benvinguda")}</h2>
        <p>
          {t("Aquí trobaràs com funciona cada part del programa. Fes servir el cercador, l'índex de l'esquerra o el botó «?» que hi ha a dalt de cada pantalla.")}
        </p>
        {usuari && (
          <p className="apagat petit">
            {t("El teu perfil és «{0}»: veuràs al menú només les parts on tens accés.", t((PERFILS as Record<string, { nom: string }>)[usuari.rol]?.nom ?? ''))}
          </p>
        )}
      </section>
      {primers.length > 0 && (
        <section>
          <h2>{t("Per començar")}</h2>
          <div className="ajuda-targetes">
            {primers.map((a) => (
              <Link key={a.id} to={`/ajuda/${a.id}`} className="ajuda-targeta">
                <strong>{tx(a.titol)}</strong>
                <span>{tx(a.resum)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>{t("Per seccions")}</h2>
        <div className="ajuda-seccions">
          {SECCIONS.filter((s) => s !== 'primers-passos').map((s) => {
            const articles = ARTICLES.filter((a) => a.seccio === s);
            if (!articles.length) return null;
            return (
              <div key={s} className="targeta">
                <h3>{NOMS_SECCIONS()[s]}</h3>
                <ul>
                  {articles.map((a) => (
                    <li key={a.id}>
                      <Link to={`/ajuda/${a.id}`}>{tx(a.titol)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function VistaArticle({ article }: { article: Article }) {
  const relacionats = ARTICLES.filter((a) => a.seccio === article.seccio && a.id !== article.id).slice(0, 6);
  const preguntes = PREGUNTES.filter((p) => p.article === article.id);
  return (
    <article className="targeta ajuda-article">
      <p className="apagat petit">{NOMS_SECCIONS()[article.seccio]}</p>
      <h2>{tx(article.titol)}</h2>
      <p className="ajuda-resum">{tx(article.resum)}</p>
      <TextAjuda md={tx(article.cos)} />
      {article.rutes?.[0] && (
        <p>
          <Link className="boto boto-secundari boto-petit" to={article.rutes[0]}>
            {t("Ves a aquesta pantalla →")}
          </Link>
        </p>
      )}
      {preguntes.length > 0 && (
        <section className="ajuda-relacionats">
          <h3>{t("Preguntes freqüents")}</h3>
          {preguntes.map((p, i) => (
            <details key={i}>
              <summary>{tx(p.pregunta)}</summary>
              <TextAjuda md={tx(p.resposta)} />
            </details>
          ))}
        </section>
      )}
      {relacionats.length > 0 && (
        <section className="ajuda-relacionats">
          <h3>{t("També et pot interessar")}</h3>
          <ul>
            {relacionats.map((a) => (
              <li key={a.id}>
                <Link to={`/ajuda/${a.id}`}>{tx(a.titol)}</Link> — <span className="apagat">{tx(a.resum)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Resultats({ resultats, consulta, onTria }: { resultats: Article[]; consulta: string; onTria: () => void }) {
  return (
    <section className="targeta">
      <h2>{t("Resultats per a «{0}»", consulta)}</h2>
      {resultats.length === 0 ? (
        <p className="apagat">{t("No hem trobat res. Prova amb altres paraules o mira les preguntes freqüents.")}</p>
      ) : (
        <ul className="ajuda-resultats">
          {resultats.map((a) => (
            <li key={a.id}>
              <Link to={`/ajuda/${a.id}`} onClick={onTria}>
                {tx(a.titol)}
              </Link>
              <span className="apagat petit">{NOMS_SECCIONS()[a.seccio]}</span>
              <p>{tx(a.resum)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Preguntes() {
  return (
    <section className="targeta">
      <h2>{t("Preguntes freqüents")}</h2>
      {PREGUNTES.map((p, i) => (
        <details key={i} className="ajuda-pregunta">
          <summary>{tx(p.pregunta)}</summary>
          <TextAjuda md={tx(p.resposta)} />
          {p.article && articlePerId(p.article) && (
            <p className="petit">
              <Link to={`/ajuda/${p.article}`}>{t("Més informació: {0}", tx(articlePerId(p.article)!.titol))}</Link>
            </p>
          )}
        </details>
      ))}
    </section>
  );
}

function Glossari() {
  const termes = [...GLOSSARI].sort((a, b) => tx(a.terme).localeCompare(tx(b.terme), locale()));
  return (
    <section className="targeta">
      <h2>{t("Glossari")}</h2>
      <p className="apagat petit">{t("Termes legals, fiscals i del programa que surten sovint.")}</p>
      <dl className="ajuda-glossari">
        {termes.map((g, i) => (
          <div key={i}>
            <dt>{tx(g.terme)}</dt>
            <dd>{tx(g.definicio)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Novetats() {
  return (
    <section className="targeta">
      <h2>{t("Novetats")}</h2>
      <ol className="ajuda-novetats">
        {NOVETATS.map((n, i) => (
          <li key={i}>
            <p className="apagat petit">{new Date(`${n.data}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h3>{tx(n.titol)}</h3>
            <ul>
              {n.punts.map((p, j) => (
                <li key={j}>{tx(p)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface Sistema {
  versio: string | null;
  entitat: string | null;
  instal_lat_el: string | null;
  node: string | null;
  plataforma: string | null;
  base_dades: string | null;
  darrera_copia: string | null;
  copies: number;
  dades: Record<string, number | null>;
}

function QuantA() {
  const { usuari } = useEntitat();
  const { data: s, error } = useApi<Sistema>('/ajuda/sistema');
  if (!s) return <Carregant error={error} />;
  const files: [string, string | null][] = [
    [t("Versió"), s.versio],
    [t("Entitat"), s.entitat],
    [t("Instal·lat el"), s.instal_lat_el ? new Date(s.instal_lat_el).toLocaleDateString(locale()) : null],
    [t("Idioma"), IDIOMES[idioma()].nom],
    [t("Usuari"), usuari ? `${usuari.nom} (${t((PERFILS as Record<string, { nom: string }>)[usuari.rol]?.nom ?? '')})` : null],
    [t("Darrera còpia de seguretat"), DEMO ? t("No disponible a la demostració") : s.darrera_copia ? new Date(s.darrera_copia).toLocaleString(locale()) : t("Encara no n'hi ha cap")],
    [t("Base de dades"), s.base_dades],
    [t("Node.js"), s.node],
    [t("Sistema"), s.plataforma],
  ];
  const suport = files
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .concat(Object.entries(s.dades).map(([k, v]) => `${k}: ${v ?? '—'}`))
    .join('\n');
  return (
    <div className="ajuda-quant-a">
      <section className="targeta">
        <h2>{t("Quant al programa")}</h2>
        <p>
          {t("Programa de gestió per a associacions sense ànim de lucre: socis, economia, activitats, web, òrgans de govern i compliment legal. Funciona a l'ordinador de l'entitat i les dades no surten d'aquí si no ho decidiu vosaltres.")}
        </p>
        <table className="taula taula-compacta">
          <tbody>
            {files
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
      <section className="targeta">
        <h3>{t("Dades guardades")}</h3>
        <table className="taula taula-compacta">
          <tbody>
            {[
              [t("Socis"), s.dades.socis],
              [t("Activitats"), s.dades.activitats],
              [t("Moviments"), s.dades.moviments],
              [t("Factures"), s.dades.factures],
              [t("Usuaris actius"), s.dades.usuaris],
            ].map(([k, v]) => (
              <tr key={String(k)}>
                <th>{k}</th>
                <td className="num">{v ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="targeta">
        <h3>{t("Demanar ajuda tècnica")}</h3>
        <p className="apagat petit">{t("Si has de demanar ajuda a algú, copia aquesta informació (no conté dades personals ni contrasenyes):")}</p>
        <pre className="ajuda-suport">{suport}</pre>
      </section>
      <section className="targeta">
        <h3>{t("Tecnologia i llicències")}</h3>
        <p className="petit">
          {t("Fet amb programari lliure: Node.js, SQLite, Express, React, Vite, sql.js (demostració), Nodemailer (correu), basic-ftp (publicació de la web) i qrcode (factures). Les fonts de la web es descarreguen de Google Fonts en publicar-la, amb les seves llicències obertes.")}
        </p>
      </section>
    </div>
  );
}
