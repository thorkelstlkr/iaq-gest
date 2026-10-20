// Pestanya «Justificació»: compte justificatiu simplificat (art. 75 RD 887/2006), exportació de la relació
// de despeses i marca de subvenció justificada.
import { useEffect, useState } from 'react';
import { api, useApi } from '../../api';
import { Camp, Carregant, Modal, avisa, avisaError } from '../ui';
import { Imprimible } from '../Rgpd';
import { EditorText } from '../EditorText';
import { CapEntitat, dataLlarga } from '../governanca/Impresos';
import { useEntitat } from '../../entitat';
import { avui, data, euros } from '../../format';
import { DEMO } from '../../mode';
import { idioma, t } from '../../i18n';
import { markdown } from '../../../shared/markdown';
import { JustificantsMoviment } from './Justificants';
import { PER_JUSTIFICAR, estat } from './tipus';
import type { Imputacio, Justificacio as Dades, Subvencio } from './tipus';

interface Persona {
  soci_id: number;
  nom: string;
}
interface Junta {
  presidencia: Persona | null;
  secretaria: Persona | null;
  tresoreria?: Persona | null;
}

export function Justificacio({ s, editable, onCanvi }: { s: Subvencio; editable: boolean; onCanvi: () => void }) {
  const { data: j, error, reload } = useApi<Dades>(`/subvencions/${s.id}/justificacio`);
  const [junta, setJunta] = useState<Junta | null>(null);
  const [text, setText] = useState({ memoria: s.memoria ?? '', altres_ingressos: s.altres_ingressos ?? '' });
  const [canviat, setCanviat] = useState(false);
  const [justificant, setJustificant] = useState(false);
  const [adjunts, setAdjunts] = useState<Imputacio | null>(null);

  useEffect(() => {
    // La junta pot no ser visible per a tots els perfils: si falla, les signatures queden en blanc.
    api.get<Junta>('/governanca/junta-actual').then(setJunta).catch(() => setJunta(null));
  }, []);

  async function desa() {
    try {
      await api.put(`/subvencions/${s.id}/justificacio`, text);
      setCanviat(false);
      avisa(t("Memòria desada."));
      reload();
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  if (!j) return <Carregant error={error} />;
  const sense = j.despeses.filter((d) => !d.n_justificants);

  return (
    <div className="subv-justificacio">
      <section className="targeta no-imprimir">
        <div className="subv-barra">
          <div>
            <strong>{t("Estat:")}</strong> {estat(s.estat).text}
            {s.data_justificacio && ` · ${t("justificada el {0}", data(s.data_justificacio))}`}
            {s.termini_justificacio && !s.data_justificacio && ` · ${t("termini: {0}", data(s.termini_justificacio))}`}
          </div>
          <span className="espai" />
          {!DEMO && (
            <a className="boto boto-secundari" href={`/api/subvencions/${s.id}/despeses.csv?idioma=${idioma()}`}>
              {t("Exporta les despeses (CSV)")}
            </a>
          )}
          {editable && PER_JUSTIFICAR.includes(s.estat) && (
            <button className="boto" onClick={() => setJustificant(true)} disabled={!j.despeses.length}>
              {t("Marca com a justificada")}
            </button>
          )}
        </div>
        {sense.length > 0 && (
          <div className="subv-avis" role="note">
            <strong>{t("{0} despeses imputades no tenen el justificant adjunt:", sense.length)}</strong>
            <ul>
              {sense.map((d) => (
                <li key={d.id}>
                  <button type="button" className="enllac" onClick={() => setAdjunts(d)}>
                    {data(d.data)} · {d.concepte} · {euros(d.import_cents)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {j.totals.falta_imputar_cents > 0 && (
          <div className="subv-avis" role="note">
            {t("Les despeses imputades no arriben a l'import concedit: en falten {0}. Si no es justifiquen, pot caldre reintegrar-los.", euros(j.totals.falta_imputar_cents))}
          </div>
        )}
        <Camp etiqueta={t("Memòria d'actuació (activitats fetes i resultats obtinguts)")} ample grup>
          {editable ? (
            <EditorText valor={text.memoria} onChange={(v) => (setText((x) => ({ ...x, memoria: v })), setCanviat(true))} files={6} senzill />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: markdown(text.memoria) }} />
          )}
        </Camp>
        <Camp etiqueta={t("Altres ingressos o subvencions que han finançat l'activitat")} ample ajuda={t("Es llisten automàticament els ingressos vinculats a l'activitat; aquí pots afegir-hi els que no consten a la comptabilitat.")}>
          <textarea
            rows={2}
            value={text.altres_ingressos}
            readOnly={!editable}
            onChange={(e) => (setText({ ...text, altres_ingressos: e.target.value }), setCanviat(true))}
          />
        </Camp>
        {editable && (
          <div className="formulari-peu">
            <span className="espai" />
            <button className="boto" onClick={desa} disabled={!canviat}>
              {t("Desa la memòria")}
            </button>
          </div>
        )}
      </section>

      <Imprimible>
        <CompteJustificatiu j={j} junta={junta} memoria={text.memoria} altres={text.altres_ingressos} />
      </Imprimible>

      {justificant && (
        <MarcaJustificada
          s={s}
          onClose={() => setJustificant(false)}
          onFet={() => {
            setJustificant(false);
            reload();
            onCanvi();
          }}
        />
      )}
      {adjunts && (
        <JustificantsMoviment
          moviment={{ id: adjunts.moviment_id, data: adjunts.data, concepte: adjunts.concepte, import_cents: adjunts.moviment_cents }}
          nomesLectura={!editable}
          onClose={() => setAdjunts(null)}
          onCanvi={() => {
            reload();
            onCanvi();
          }}
        />
      )}
    </div>
  );
}

function MarcaJustificada({ s, onClose, onFet }: { s: Subvencio; onClose: () => void; onFet: () => void }) {
  const [d, setD] = useState(avui());
  const [error, setError] = useState<string | null>(null);
  async function envia(e: { preventDefault: () => void }) {
    e.preventDefault();
    try {
      await api.post(`/subvencions/${s.id}/justifica`, { data: d });
      avisa(t("Subvenció marcada com a justificada."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  return (
    <Modal titol={t("Marca com a justificada")} onClose={onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">
          {t("Indica la data en què s'ha presentat el compte justificatiu a l'organisme. Després, les despeses imputades ja no es podran modificar.")}
        </p>
        <Camp etiqueta={t("Data de presentació")}>
          <input type="date" value={d} onChange={(e) => setD(e.target.value)} required />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Marca com a justificada")}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Document imprimible: compte justificatiu simplificat (art. 75 RD 887/2006). */
function CompteJustificatiu({ j, junta, memoria, altres }: { j: Dades; junta: Junta | null; memoria: string; altres: string }) {
  const { config } = useEntitat();
  const s = j.subvencio;
  const tt = j.totals;
  const entitat = config?.nom_complet || config?.nom || '';
  const president = junta?.presidencia?.nom ?? null;
  const fonsPropis = Math.max(0, tt.cost_cents - tt.imputat_cents - tt.altres_ingressos_cents);
  let num = 0;

  return (
    <>
      <CapEntitat config={config} titol={t("Compte justificatiu simplificat")} subtitol={t("Article 75 del Reglament de la Llei general de subvencions (RD 887/2006)")} />
      <table className="subv-dades">
        <tbody>
          <tr>
            <th>{t("Organisme concedent")}</th>
            <td>{s.organisme}</td>
          </tr>
          {s.convocatoria && (
            <tr>
              <th>{t("Convocatòria")}</th>
              <td>
                {s.convocatoria}
                {s.linia && ` · ${s.linia}`}
              </td>
            </tr>
          )}
          {s.expedient && (
            <tr>
              <th>{t("Expedient")}</th>
              <td>{s.expedient}</td>
            </tr>
          )}
          <tr>
            <th>{t("Projecte o activitat")}</th>
            <td>{s.activitat_nom || s.convocatoria || '—'}</td>
          </tr>
          <tr>
            <th>{t("Import concedit")}</th>
            <td>
              {euros(tt.concedit_cents)}
              {s.data_resolucio && ` · ${t("resolució de {0}", data(s.data_resolucio))}`}
            </td>
          </tr>
          {(s.periode_inici || s.periode_fi) && (
            <tr>
              <th>{t("Període d'execució")}</th>
              <td>{t("Del {0} al {1}", data(s.periode_inici) || '—', data(s.periode_fi) || '—')}</td>
            </tr>
          )}
          <tr>
            <th>{t("Entitat beneficiària")}</th>
            <td>
              {entitat}
              {config?.nif && ` · ${t("NIF {0}", config.nif)}`}
            </td>
          </tr>
        </tbody>
      </table>

      <h3>{t("1. Memòria d'actuació")}</h3>
      {memoria.trim() ? (
        <div className="subv-memoria" dangerouslySetInnerHTML={{ __html: markdown(memoria) }} />
      ) : (
        <p className="apagat">{t("(Cal redactar la memòria de les activitats fetes i dels resultats obtinguts.)")}</p>
      )}

      <h3>{t("2. Relació classificada de les despeses")}</h3>
      <table className="taula taula-compacta subv-relacio">
        <thead>
          <tr>
            <th>{t("Núm.")}</th>
            <th>{t("Creditor")}</th>
            <th>{t("Concepte")}</th>
            <th>{t("Factura / justificant")}</th>
            <th>{t("Data d'emissió")}</th>
            <th>{t("Data de pagament")}</th>
            <th className="num">{t("Import")}</th>
            <th className="num">{t("Imputat")}</th>
          </tr>
        </thead>
        {j.per_categoria.map((c) => (
          <tbody key={c.categoria}>
            <tr className="subv-categoria">
              <th colSpan={8}>{c.categoria}</th>
            </tr>
            {j.despeses
              .filter((d) => (d.categoria_nom ?? '—') === c.categoria)
              .map((d) => (
                <tr key={d.id}>
                  <td>{++num}</td>
                  <td>{d.creditor || d.concepte}</td>
                  <td>{d.creditor ? d.concepte : ''}</td>
                  <td>
                    {d.justificant}
                    {!d.n_justificants && <span className="subv-falta no-imprimir">{t("sense justificant")}</span>}
                  </td>
                  <td className="nowrap">{data(d.data_emissio ?? d.data)}</td>
                  <td className="nowrap">{data(d.data)}</td>
                  <td className="num nowrap">{euros(d.moviment_cents)}</td>
                  <td className="num nowrap">{euros(d.import_cents)}</td>
                </tr>
              ))}
            <tr className="subv-subtotal">
              <td colSpan={6}>{t("Subtotal {0}", c.categoria)}</td>
              <td className="num nowrap">{euros(c.cost_cents)}</td>
              <td className="num nowrap">{euros(c.imputat_cents)}</td>
            </tr>
          </tbody>
        ))}
        <tfoot>
          <tr>
            <td colSpan={6}>{t("Total")}</td>
            <td className="num nowrap">{euros(tt.cost_cents)}</td>
            <td className="num nowrap">{euros(tt.imputat_cents)}</td>
          </tr>
        </tfoot>
      </table>

      <h3>{t("3. Altres ingressos o subvencions que han finançat l'activitat")}</h3>
      {j.altres_ingressos.length === 0 && !altres.trim() ? (
        <p>{t("No s'han rebut altres ingressos ni subvencions per a aquesta activitat.")}</p>
      ) : (
        <>
          {j.altres_ingressos.length > 0 && (
            <table className="taula taula-compacta">
              <tbody>
                {j.altres_ingressos.map((m) => (
                  <tr key={m.id}>
                    <td className="nowrap">{data(m.data)}</td>
                    <td>{m.concepte}</td>
                    <td>{m.categoria_nom}</td>
                    <td className="num nowrap">{euros(m.import_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {altres.trim() && <p className="subv-pre">{altres}</p>}
        </>
      )}

      <h3>{t("4. Finançament i desviacions respecte del pressupost")}</h3>
      <table className="taula taula-compacta subv-resum">
        <tbody>
          <tr>
            <th>{t("Pressupost presentat")}</th>
            <td className="num">{tt.pressupost_cents !== null ? euros(tt.pressupost_cents) : '—'}</td>
          </tr>
          <tr>
            <th>{t("Cost total executat")}</th>
            <td className="num">{euros(tt.cost_cents)}</td>
          </tr>
          {tt.desviacio_cents !== null && (
            <tr>
              <th>{t("Desviació")}</th>
              <td className={`num ${tt.desviacio_cents < 0 ? 'negatiu' : ''}`}>
                {euros(tt.desviacio_cents)} ({(tt.desviacio_percent ?? 0).toLocaleString()} %)
              </td>
            </tr>
          )}
          <tr>
            <th>{t("Finançat amb aquesta subvenció")}</th>
            <td className="num">{euros(tt.imputat_cents)}</td>
          </tr>
          <tr>
            <th>{t("Finançat amb altres ingressos")}</th>
            <td className="num">{euros(tt.altres_ingressos_cents)}</td>
          </tr>
          <tr>
            <th>{t("Finançat amb fons propis")}</th>
            <td className="num">{euros(fonsPropis)}</td>
          </tr>
          <tr>
            <th>{t("Import cobrat de la subvenció")}</th>
            <td className="num">{euros(tt.cobrat_cents)}</td>
          </tr>
        </tbody>
      </table>
      {tt.execucio_percent !== null && tt.execucio_percent < 100 && (
        <p className="petit">
          {t("S'ha executat el {0} % del pressupost presentat. Si les bases ho preveuen, la subvenció es pot reduir proporcionalment.", tt.execucio_percent.toLocaleString())}
        </p>
      )}

      <h3>{t("5. Declaració responsable")}</h3>
      <p>
        {t("{0}, en representació de {1}, declara sota la seva responsabilitat:", president || '______________________', entitat)}
      </p>
      <ul className="subv-declaracio">
        <li>{t("Que s'ha complert la finalitat per a la qual es va concedir la subvenció i s'han fet les activitats descrites a la memòria.")}</li>
        <li>{t("Que les despeses relacionades s'han destinat a l'activitat subvencionada i s'han pagat dins el termini.")}</li>
        <li>{t("Que l'import de les subvencions i ingressos rebuts no supera el cost de l'activitat i que no se n'han rebut d'altres que els indicats.")}</li>
        <li>{t("Que els justificants originals es conserven a disposició de l'organisme concedent i dels òrgans de control durant almenys quatre anys.")}</li>
      </ul>
      <p>
        {[config?.poblacio, dataLlarga(avui())].filter(Boolean).join(', ')}
      </p>
      <div className="signatures">
        <div>
          <span>{t("El president / La presidenta")}</span>
          <br />
          <strong>{president || ' '}</strong>
        </div>
        <div>
          <span>{t("El tresorer / La tresorera")}</span>
          <br />
          <strong>{junta?.tresoreria?.nom || ' '}</strong>
        </div>
      </div>
    </>
  );
}
