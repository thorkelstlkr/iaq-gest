import { useEffect, useState } from 'react';
import { api, useApi } from '../api';
import { Buit, Capcalera, Carregant, useExercici } from '../components/ui';
import { GENERES, avui, data, euros } from '../format';
import { useEntitat } from '../entitat';
import { DEMO } from '../mode';
import type { Activitat, Config, InformeEconomic } from '../../shared/types';
import { idioma, locale, t } from '../i18n';
import '../styles/activitats.css';

const PESTANYES = [
  { id: 'economic', text: t("Compte de resultats") },
  { id: 'memoria', text: t("Memòria d'activitats") },
  { id: 'registre', text: t("Llibre registre de socis") },
] as const;

type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Informes() {
  const [pestanya, setPestanya] = useState<Pestanya>('economic');
  const { data: config } = useApi<Config>('/config');

  return (
    <>
      <Capcalera titol={t("Informes")} subtitol={t("Documents per a l'Assemblea General i el Registre d'Associacions")}>
        {!DEMO && (
          <button className="boto" onClick={() => window.print()}>
            {t("Imprimeix / desa en PDF")}
          </button>
        )}
      </Capcalera>
      <div className="pestanyes no-imprimir" role="tablist">
        {PESTANYES.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestanya === p.id}
            className={pestanya === p.id ? 'actiu' : ''}
            onClick={() => setPestanya(p.id)}
          >
            {p.text}
          </button>
        ))}
      </div>
      <article className="document">
        {pestanya === 'economic' && <Economic config={config} />}
        {pestanya === 'memoria' && <Memoria config={config} />}
        {pestanya === 'registre' && <Registre config={config} />}
      </article>
    </>
  );
}

function CapDocument({ config, titol }: { config: Config | null; titol: string }) {
  return (
    <header className="document-cap">
      <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
      <p className="apagat petit">
        {[config?.nif && t("NIF {0}", config.nif), config?.num_registre && t("Registre núm. {0}", config.num_registre), config?.adreca]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <h2>{titol}</h2>
    </header>
  );
}

interface JuntaActual {
  presidencia: { soci_id: number; nom: string } | null;
  secretaria: { soci_id: number; nom: string } | null;
}

/** Signatures del secretari/ària i del president/a, amb el nom de qui ocupa el càrrec (si se sap). */
function Signatures() {
  const [junta, setJunta] = useState<JuntaActual | null>(null);
  useEffect(() => {
    let viu = true;
    // Si la governança no està disponible (o no hi ha permís), es deixen les línies en blanc.
    api.get<JuntaActual>('/governanca/junta-actual').then(
      (j) => viu && setJunta(j ?? null),
      () => viu && setJunta(null),
    );
    return () => {
      viu = false;
    };
  }, []);
  return (
    <div className="signatures">
      <div>
        <span>{t("El/la secretari/ària")}</span>
        {junta?.secretaria?.nom && <span className="signatura-nom">{junta.secretaria.nom}</span>}
      </div>
      <div>
        <span>{t("Vist i plau, el/la president/a")}</span>
        {junta?.presidencia?.nom && <span className="signatura-nom">{junta.presidencia.nom}</span>}
      </div>
    </div>
  );
}

function Economic({ config }: { config: Config | null }) {
  const [exercici] = useExercici();
  const { data: inf, error } = useApi<InformeEconomic>(`/informes/economic?exercici=${exercici}`);
  if (!inf) return <Carregant error={error} />;
  const resultat = inf.total_ingressos_cents - inf.total_despeses_cents;

  return (
    <>
      <CapDocument config={config} titol={t("Compte de resultats i estat de tresoreria · Exercici {0}", exercici)} />

      <div className="graella-2 graella-document">
        <section>
          <h3>{t("Ingressos")}</h3>
          <table className="taula taula-compacta">
            <tbody>
              {inf.ingressos.map((r) => (
                <tr key={r.categoria}>
                  <td>{r.categoria}</td>
                  <td className="num">{euros(r.total_cents)}</td>
                </tr>
              ))}
              {inf.ingressos.length === 0 && (
                <tr>
                  <td className="apagat">{t("Sense ingressos")}</td>
                  <td />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("Total ingressos")}</td>
                <td className="num">{euros(inf.total_ingressos_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
        <section>
          <h3>{t("Despeses")}</h3>
          <table className="taula taula-compacta">
            <tbody>
              {inf.despeses.map((r) => (
                <tr key={r.categoria}>
                  <td>{r.categoria}</td>
                  <td className="num">{euros(r.total_cents)}</td>
                </tr>
              ))}
              {inf.despeses.length === 0 && (
                <tr>
                  <td className="apagat">{t("Sense despeses")}</td>
                  <td />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("Total despeses")}</td>
                <td className="num">{euros(inf.total_despeses_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>

      <p className={`resultat ${resultat < 0 ? 'negatiu' : 'positiu'}`}>
        {t("Resultat de l'exercici (")}{resultat < 0 ? t("dèficit") : t("superàvit")}): <strong>{euros(resultat)}</strong>
      </p>

      <h3>{t("Estat de tresoreria")}</h3>
      <table className="taula">
        <thead>
          <tr>
            <th>{t("Compte")}</th>
            <th className="num">{t("Saldo a 1/1/")}{exercici}</th>
            <th className="num">{t("Entrades")}</th>
            <th className="num">{t("Sortides")}</th>
            <th className="num">{t("Saldo a 31/12/")}{exercici}</th>
          </tr>
        </thead>
        <tbody>
          {inf.comptes.map((c) => (
            <tr key={c.nom}>
              <td>{c.nom}</td>
              <td className="num">{euros(c.saldo_inicial_cents)}</td>
              <td className="num">{euros(c.entrades_cents)}</td>
              <td className="num">{euros(c.sortides_cents)}</td>
              <td className="num">{euros(c.saldo_final_cents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{t("Total")}</td>
            {(['saldo_inicial_cents', 'entrades_cents', 'sortides_cents', 'saldo_final_cents'] as const).map((k) => (
              <td key={k} className="num">
                {euros(inf.comptes.reduce((s, c) => s + c[k], 0))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p className="apagat petit">{t("Les entrades i sortides inclouen els traspassos entre comptes.")}</p>

      {inf.activitats.length > 0 && (
        <>
          <h3>{t("Resultat per activitat")}</h3>
          <table className="taula">
            <thead>
              <tr>
                <th>{t("Activitat")}</th>
                <th className="num">{t("Ingressos")}</th>
                <th className="num">{t("Despeses")}</th>
                <th className="num">{t("Balanç")}</th>
              </tr>
            </thead>
            <tbody>
              {inf.activitats.map((a) => (
                <tr key={a.nom}>
                  <td>{a.nom}</td>
                  <td className="num">{euros(a.ingressos_cents)}</td>
                  <td className="num">{euros(a.despeses_cents)}</td>
                  <td className="num">{euros(a.ingressos_cents - a.despeses_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="apagat petit">{t("Document generat el")} {data(avui())}.</p>
      <Signatures />
    </>
  );
}

interface Memoria {
  exercici: number;
  socis: {
    total: number;
    per_franja: { franja: string; total: number }[];
    per_genere: { genere: string; total: number }[];
  };
  activitats: Activitat[];
  indicadors?: IndicadorsImpacte;
}

interface IndicadorsActivitat {
  id: number;
  total_assistents: number;
  font: 'assistencia' | 'manual' | 'cap';
  generacions: string[];
  intergeneracional: boolean;
}

interface IndicadorsImpacte {
  activitats: IndicadorsActivitat[];
  totals: {
    activitats: number;
    activitats_amb_assistencia: number;
    activitats_intergeneracionals: number;
    total_assistents: number;
    assistents_inscrits: number;
    assistents_anonims: number;
    assistents_manuals: number;
    persones_uniques: number;
    socis_unics: number;
    no_socis_unics: number;
    assistencies_socis: number;
    assistencies_no_socis: number;
    per_franja: { franja: string; assistencies: number; persones: number }[];
    per_genere: { genere: string; assistencies: number; persones: number }[];
  };
}

/** Indicadors d'impacte a partir de l'assistència real (inscripcions amb llista passada i assistents sense inscripció). */
function Impacte({ ind, exercici }: { ind: IndicadorsImpacte; exercici: number }) {
  const tt = ind.totals;
  return (
    <section className="act-impacte">
      <h3>{t("Impacte de les activitats")}</h3>
      <p>
        {t("Assistències totals: {0}", tt.total_assistents)} (
        {[
          tt.assistents_inscrits > 0 && t("{0} amb inscripció i llista passada", tt.assistents_inscrits),
          tt.assistents_anonims > 0 && t("{0} sense inscripció", tt.assistents_anonims),
          tt.assistents_manuals > 0 && t("{0} de recomptes manuals", tt.assistents_manuals),
        ]
          .filter(Boolean)
          .join('; ') || '—'}
        ).{' '}
        {tt.persones_uniques > 0 &&
          t("Hi han participat {0} persones diferents: {1} sòcies i {2} no sòcies.", tt.persones_uniques, tt.socis_unics, tt.no_socis_unics)}{' '}
        {t("Activitats intergeneracionals (amb dues o més generacions presents): {0} de {1}.", tt.activitats_intergeneracionals, tt.activitats)}
      </p>
      {tt.persones_uniques > 0 && (
        <div className="graella-2 graella-document">
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Franja d'edat")}</th>
                <th className="num">{t("Assistències")}</th>
                <th className="num">{t("Persones")}</th>
              </tr>
            </thead>
            <tbody>
              {tt.per_franja
                .filter((f) => f.assistencies > 0)
                .map((f) => (
                  <tr key={f.franja}>
                    <td>{t(f.franja)}</td>
                    <td className="num">{f.assistencies}</td>
                    <td className="num">{f.persones}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Gènere")}</th>
                <th className="num">{t("Assistències")}</th>
                <th className="num">{t("Persones")}</th>
              </tr>
            </thead>
            <tbody>
              {tt.per_genere
                .filter((g) => g.assistencies > 0)
                .map((g) => (
                  <tr key={g.genere}>
                    <td>{GENERES[g.genere] ?? g.genere}</td>
                    <td className="num">{g.assistencies}</td>
                    <td className="num">{g.persones}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="apagat petit">
        {t("Les franges d'edat i el gènere es compten només de les persones inscrites que hi han assistit.")}{' '}
        {!DEMO && (
          <a className="no-imprimir" href={`/api/informes/indicadors.csv?exercici=${exercici}&idioma=${idioma()}`}>
            {t("Descarrega els indicadors per activitat (CSV)")}
          </a>
        )}
      </p>
    </section>
  );
}

function Memoria({ config }: { config: Config | null }) {
  const { finalitats } = useEntitat();
  const [exercici] = useExercici();
  const { data: m, error } = useApi<Memoria>(`/informes/memoria?exercici=${exercici}`);
  if (!m) return <Carregant error={error} />;
  // Assistència real (inscripcions + anònims); si no n'hi ha, el recompte manual de cada activitat.
  const indicador = (id: number) => m.indicadors?.activitats.find((x) => x.id === id);
  const participants = m.indicadors
    ? m.indicadors.totals.total_assistents
    : m.activitats.reduce((s, a) => s + (a.participants ?? 0), 0);
  const assistents = (a: Activitat) => {
    const i = indicador(a.id);
    return i ? (i.font === 'cap' ? null : i.total_assistents) : a.participants;
  };

  return (
    <>
      <CapDocument config={config} titol={t("Memòria d'activitats · Exercici {0}", exercici)} />

      <h3>{t("Base social")}</h3>
      <p>
        {t("L'associació compta amb")} <strong>{m.socis.total}</strong> {t("persones sòcies:")}{' '}
        {m.socis.per_franja
          .filter((f) => f.total > 0)
          .map((f) => `${t(f.franja).toLowerCase()}: ${f.total}`)
          .join('; ') || '—'}
        .{' '}
        {m.socis.per_genere.length > 0 &&
          t("Per gènere: {0}.", m.socis.per_genere.map((g) => `${(GENERES[g.genere] ?? g.genere).toLowerCase()} ${g.total}`).join(', '))}
      </p>

      <h3>{t("Resum")}</h3>
      <p>
        {t("Durant l'exercici s'han registrat")} <strong>{m.activitats.length}</strong> {t("activitats")}
        {participants > 0 && (
          <>
            {t(", amb un total de")} <strong>{participants}</strong> {t("participacions")}
          </>
        )}
        .
      </p>

      {m.indicadors && m.activitats.length > 0 && <Impacte ind={m.indicadors} exercici={exercici} />}
      <VoluntariatMemoria exercici={exercici} />

      {m.activitats.length === 0 ? (
        <Buit>{t("No hi ha activitats registrades en aquest exercici.")}</Buit>
      ) : (
        finalitats.map((o) => {
          const acts = m.activitats.filter((a) => a.objectius.split(',').includes(o.codi));
          if (!acts.length) return null;
          return (
            <section key={o.codi} className="memoria-objectiu">
              <h3>
                {o.codi}) {o.curt}
              </h3>
              <p className="apagat petit">{o.text}</p>
              <ul>
                {acts.map((a) => (
                  <li key={a.id}>
                    <strong>{a.nom}</strong> — {data(a.data_inici)}
                    {a.data_fi && a.data_fi !== a.data_inici && ` a ${data(a.data_fi)}`}
                    {a.lloc && `, ${a.lloc}`}
                    {assistents(a) != null && t(" ({0} participants)", assistents(a))}
                    {(indicador(a.id)?.generacions.length ?? 0) >= 2 && (
                      <span className="apagat"> · {t("{0} generacions", indicador(a.id)!.generacions.length)}</span>
                    )}
                    {a.descripcio && <div>{a.descripcio}</div>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
      {m.activitats.some((a) => !finalitats.some((f) => a.objectius.split(',').includes(f.codi))) && (
        <section className="memoria-objectiu">
          <h3>{t("Altres activitats")}</h3>
          <ul>
            {m.activitats
              .filter((a) => !finalitats.some((f) => a.objectius.split(',').includes(f.codi)))
              .map((a) => (
                <li key={a.id}>
                  <strong>{a.nom}</strong> — {data(a.data_inici)}
                </li>
              ))}
          </ul>
        </section>
      )}
      <Signatures />
    </>
  );
}

/** Llibre registre de socis amb tots els períodes d'alta i baixa (vegeu també Socis → Llibre registre). */
function Registre({ config }: { config: Config | null }) {
  const { data: llibre, error } = useApi<{
    generat: string;
    socis: {
      id: number;
      num_soci: number;
      nom: string;
      llinatges: string;
      dni: string | null;
      anonimitzat: number;
      periodes: { data_alta: string; data_baixa: string | null }[];
    }[];
  }>('/socis/llibre-registre');
  if (!llibre) return <Carregant error={error} />;
  const actius = llibre.socis.filter((s) => s.periodes.some((p) => !p.data_baixa || p.data_baixa > avui())).length;
  return (
    <>
      <CapDocument config={config} titol={t("Llibre registre de socis · a {0}", data(avui()))} />
      <table className="taula taula-compacta">
        <thead>
          <tr>
            <th className="num">{t("Núm.")}</th>
            <th>{t("Nom i llinatges")}</th>
            <th>{t("DNI / NIE")}</th>
            <th>{t("Data d'alta")}</th>
            <th>{t("Data de baixa")}</th>
          </tr>
        </thead>
        <tbody>
          {llibre.socis.flatMap((s) =>
            s.periodes.map((p, i) => (
              <tr key={`${s.id}-${i}`}>
                <td className="num">{i === 0 ? s.num_soci : ''}</td>
                <td>{i === 0 ? (s.anonimitzat ? <em>{t("Persona anonimitzada")}</em> : `${s.nom} ${s.llinatges}`.trim()) : ''}</td>
                <td>{i === 0 ? s.dni : ''}</td>
                <td>{data(p.data_alta)}</td>
                <td>{data(p.data_baixa)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <p className="apagat petit">
        {t("Total:")} {llibre.socis.length} {t("registres (")}{actius} {t("actius).")}
      </p>
      <Signatures />
    </>
  );
}

/** Voluntariat de l'exercici a la memòria: hores, persones i valor estimat de la seva dedicació. */
function VoluntariatMemoria({ exercici }: { exercici: number }) {
  const { data: r } = useApi<{ hores_totals: number; valor_estimat_cents: number; voluntaris_actius: number; voluntaris_no_socis: number }>(
    `/comunitat/voluntariat/resum?exercici=${exercici}`,
  );
  if (!r || (!r.hores_totals && !r.voluntaris_actius)) return null;
  return (
    <section className="memoria-objectiu">
      <h3>{t("Voluntariat")}</h3>
      <p>
        {t(
          "{0} persones voluntàries ({1} no sòcies) han dedicat {2} hores a les activitats de l'associació, amb un valor estimat de {3}.",
          r.voluntaris_actius,
          r.voluntaris_no_socis,
          r.hores_totals.toLocaleString(locale()),
          euros(r.valor_estimat_cents),
        )}
      </p>
    </section>
  );
}
