import { Link } from 'react-router-dom';
import { useApi } from '../api';
import { Buit, Capcalera, Carregant, Objectius, useExercici } from '../components/ui';
import { GENERES, avui as dataAvui, data, euros } from '../format';
import type { Tauler as TTauler } from '../../shared/types';
import { t } from '../i18n';
import { CalendariObligacions } from '../components/CalendariObligacions';

export default function Tauler() {
  const [exercici] = useExercici();
  const { data: tt, error } = useApi<TTauler>(`/informes/tauler?exercici=${exercici}`);
  if (!tt) return <Carregant error={error} />;

  const saldoTotal = tt.comptes.reduce((s, c) => s + (c.saldo_cents ?? 0), 0);
  const resultat = tt.ingressos_cents - tt.despeses_cents;
  const maxFranja = Math.max(1, ...tt.per_franja.map((f) => f.total));
  const pctQuotes = tt.quotes.previst_cents ? Math.round((tt.quotes.cobrat_cents / tt.quotes.previst_cents) * 100) : 0;

  return (
    <>
      <Capcalera titol={t("Tauler")} subtitol={t("Resum de l'exercici {0}", exercici)} />

      <section className="xifres">
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Socis actius")}</span>
          <span className="xifra-valor">{tt.socis_actius}</span>
          <span className="xifra-nota">
            +{tt.altes_exercici} {t("altes · −")}{tt.baixes_exercici} {t("baixes")}
          </span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Saldo disponible")}</span>
          <span className={`xifra-valor ${saldoTotal < 0 ? 'negatiu' : ''}`}>{euros(saldoTotal)}</span>
          <span className="xifra-nota">{t("a tots els comptes, avui")}</span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Ingressos")} {exercici}</span>
          <span className="xifra-valor positiu">{euros(tt.ingressos_cents)}</span>
          <span className="xifra-nota">{t("Despeses:")} {euros(tt.despeses_cents)}</span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Resultat")} {exercici}</span>
          <span className={`xifra-valor ${resultat < 0 ? 'negatiu' : 'positiu'}`}>{euros(resultat)}</span>
          <span className="xifra-nota">{resultat < 0 ? t("Dèficit") : t("Superàvit")}</span>
        </div>
      </section>

      <Avisos />
      <Recordatoris />
      <CalendariObligacions />

      <div className="graella-2">
        <section className="targeta">
          <h2>{t("Composició intergeneracional")}</h2>
          <p className="apagat petit">{t("Socis actius per franja d'edat")}</p>
          <div className="barres">
            {tt.per_franja.map((f) => (
              <div key={f.franja} className="barra-fila">
                <span className="barra-etiqueta">{t(f.franja)}</span>
                <span className="barra-pista">
                  <span className="barra" style={{ width: `${(f.total / maxFranja) * 100}%` }} />
                </span>
                <span className="barra-valor">{f.total}</span>
              </div>
            ))}
          </div>
          <p className="apagat petit" style={{ marginTop: '1rem' }}>
            {t("Per gènere:")}{' '}
            {tt.per_genere.length
              ? tt.per_genere.map((g) => `${GENERES[g.genere] ?? g.genere} ${g.total}`).join(' · ')
              : '—'}
          </p>
        </section>

        <section className="targeta">
          <h2>{t("Quotes")} {exercici}</h2>
          {tt.quotes.previst_cents === 0 ? (
            <Buit>
              {t("Encara no s'han generat les quotes d'aquest exercici.")} <Link to="/quotes">{t("Ves a Quotes")}</Link>
            </Buit>
          ) : (
            <>
              <div className="progres">
                <span style={{ width: `${pctQuotes}%` }} />
              </div>
              <p>
                {t("Cobrat")} <strong>{euros(tt.quotes.cobrat_cents)}</strong> {t("de")} {euros(tt.quotes.previst_cents)} ({pctQuotes}%)
              </p>
              <p>
                {tt.quotes.pendents > 0 ? (
                  <Link to="/quotes">
                    {tt.quotes.pendents} {t("quotes pendents ·")} {euros(tt.quotes.pendent_cents)}
                  </Link>
                ) : (
                  t("Totes les quotes estan cobrades.")
                )}
              </p>
            </>
          )}
          <h2 style={{ marginTop: '1.5rem' }}>{t("Saldos per compte")}</h2>
          <table className="taula taula-compacta">
            <tbody>
              {tt.comptes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nom}</td>
                  <td className={`num ${(c.saldo_cents ?? 0) < 0 ? 'negatiu' : ''}`}>{euros(c.saldo_cents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="targeta">
          <h2>{t("Darrers moviments")}</h2>
          {tt.darrers_moviments.length === 0 ? (
            <Buit>{t("Encara no hi ha moviments.")}</Buit>
          ) : (
            <table className="taula taula-compacta">
              <tbody>
                {tt.darrers_moviments.map((m) => (
                  <tr key={m.id}>
                    <td className="apagat">{data(m.data)}</td>
                    <td>{m.concepte}</td>
                    <td className={`num ${m.tipus === 'despesa' ? 'negatiu' : m.tipus === 'ingres' ? 'positiu' : ''}`}>
                      {m.tipus === 'despesa' ? '−' : m.tipus === 'ingres' ? '+' : '⇄ '}
                      {euros(m.import_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <Link to="/moviments">{t("Tots els moviments →")}</Link>
          </p>
        </section>

        <section className="targeta">
          <h2>{t("Properes activitats")}</h2>
          {tt.properes_activitats.length === 0 ? (
            <Buit>
              {t("No hi ha activitats programades.")} <Link to="/activitats">{t("Afegeix-ne una")}</Link>
            </Buit>
          ) : (
            <ul className="llista-activitats">
              {tt.properes_activitats.map((a) => (
                <li key={a.id}>
                  <span className="data-gran">{data(a.data_inici)}</span>
                  <div>
                    <strong>{a.nom}</strong>
                    {a.lloc && <span className="apagat"> · {a.lloc}</span>}
                    <div>
                      <Objectius codis={a.objectius} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

interface TRecordatoris {
  tasques: { id: number; titol: string; data_limit: string; soci_id: number | null; soci_nom: string | null }[];
  aniversaris: { id: number; nom: string; dia: string; edat: number }[];
  sense_consentiment: { id: number; nom: string }[];
  quotes_endarrerides: { n: number; total: number };
  interessats: number;
}

/** Coses que demanen atenció: tasques, aniversaris, consentiments, quotes antigues i interessats. */
function Recordatoris() {
  const { data: r } = useApi<TRecordatoris>('/crm/recordatoris');
  if (!r) return null;
  const avui = dataAvui();
  const res =
    !r.tasques.length && !r.aniversaris.length && !r.sense_consentiment.length && !r.quotes_endarrerides.n && !r.interessats;
  if (res) return null;
  return (
    <section className="targeta recordatoris">
      <h2>{t("Per fer")}</h2>
      <div className="recordatoris-graella">
        {r.tasques.length > 0 && (
          <div>
            <h3>{t("Tasques properes")}</h3>
            <ul>
              {r.tasques.map((tt) => (
                <li key={tt.id}>
                  <span className={tt.data_limit < avui ? 'negatiu' : 'apagat'}>{data(tt.data_limit)}</span> {tt.titol}
                  {tt.soci_id && (
                    <>
                      {' · '}
                      <Link to={`/socis/${tt.soci_id}`}>{tt.soci_nom}</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <Link to="/seguiment" className="petit">{t("Totes les tasques →")}</Link>
          </div>
        )}
        {r.aniversaris.length > 0 && (
          <div>
            <h3>{t("Aniversaris (14 dies)")}</h3>
            <ul>
              {r.aniversaris.map((a) => (
                <li key={a.id}>
                  <span className="apagat">{data(a.dia).slice(0, 5)}</span> <Link to={`/socis/${a.id}`}>{a.nom}</Link> {t("fa")} {a.edat} {t("anys")}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3>{t("Avisos")}</h3>
          <ul>
            {r.interessats > 0 && (
              <li>
                <Link to="/interessats">{r.interessats} {t("persones interessades")}</Link> {t("pendents de seguiment")}
              </li>
            )}
            {r.quotes_endarrerides.n > 0 && (
              <li>
                {r.quotes_endarrerides.n} {t("quotes d'anys anteriors sense cobrar (")}{euros(r.quotes_endarrerides.total)})
              </li>
            )}
            {r.sense_consentiment.length > 0 && (
              <li>
                {r.sense_consentiment.length} {t("socis sense el consentiment RGPD signat:")}{' '}
                {r.sense_consentiment.slice(0, 5).map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ', '}
                    <Link to={`/socis/${s.id}`}>{s.nom}</Link>
                  </span>
                ))}
                {r.sense_consentiment.length > 5 && '…'}
              </li>
            )}
            {!r.interessats && !r.quotes_endarrerides.n && !r.sense_consentiment.length && <li className="apagat">{t("Cap avís.")}</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface Avis {
  text: string;
  valors?: (string | number)[];
  enllac: string;
  nivell: 'alerta' | 'info';
}

/** Avisos dels mòduls: terminis legals, còpies de seguretat, mandats que acaben… (GET /avisos). */
function Avisos() {
  const { data: avisos } = useApi<Avis[]>('/avisos');
  if (!avisos?.length) return null;
  return (
    <section className="targeta avisos-tauler">
      <h2>{t("Avisos")}</h2>
      <ul>
        {avisos.map((a, i) => (
          <li key={i} className={a.nivell === 'alerta' ? 'avis-alerta' : 'avis-info'}>
            <Link to={a.enllac}>{t(a.text, ...(a.valors ?? []))}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
