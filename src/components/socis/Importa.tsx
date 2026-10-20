// Importació de socis des d'un full de càlcul (CSV): tria del fitxer, associació de columnes,
// comprovació al servidor (errors i avisos per fila) i importació de les files vàlides.
import { useMemo, useState } from 'react';
import { api } from '../../api';
import { Modal, avisa, avisaError } from '../ui';
import { t } from '../../i18n';
import { autoAssocia, campsImport, decodifica, detectaDelimitador, llegeixCsv } from './csv';

interface ResultatFila {
  fila: number;
  nom: string;
  num_soci: number | null;
  errors: string[];
  avisos: string[];
}
interface Resultat {
  files: ResultatFila[];
  valides: number;
  amb_errors: number;
  importats: number;
}

export function ImportaSocis({ onClose, onFet }: { onClose: () => void; onFet: () => void }) {
  const [nomFitxer, setNomFitxer] = useState('');
  const [taula, setTaula] = useState<string[][] | null>(null);
  const [delimitador, setDelimitador] = useState(';');
  const [capcalera, setCapcalera] = useState(true);
  const [assoc, setAssoc] = useState<Record<string, number>>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [treballant, setTreballant] = useState(false);
  const [nomesProblemes, setNomesProblemes] = useState(true);
  const camps = useMemo(campsImport, []);

  async function triaFitxer(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      const text = decodifica(await fitxer.arrayBuffer());
      const delim = detectaDelimitador(text);
      const files = llegeixCsv(text, delim);
      if (files.length < 1) throw new Error(t("El fitxer és buit."));
      setNomFitxer(fitxer.name);
      setDelimitador(delim);
      setTaula(files);
      setAssoc(autoAssocia(files[0]));
      setResultat(null);
    } catch (err) {
      avisaError(err);
    }
  }

  const ncol = taula ? Math.max(...taula.map((f) => f.length)) : 0;
  const capcaleres = taula ? Array.from({ length: ncol }, (_, i) => (capcalera ? taula[0][i] || t("Columna {0}", i + 1) : t("Columna {0}", i + 1))) : [];
  const dades = taula ? (capcalera ? taula.slice(1) : taula) : [];
  const exemple = (col: number) => dades.find((f) => f[col])?.[col] ?? '';

  function files() {
    const desplacament = capcalera ? 2 : 1;
    return dades.map((f, i) => {
      const o: Record<string, string | number> = { _fila: i + desplacament };
      for (const c of camps) if (assoc[c.clau] >= 0) o[c.clau] = f[assoc[c.clau]] ?? '';
      return o;
    });
  }

  async function envia(confirma: boolean) {
    if (assoc.nom === undefined || assoc.nom < 0) {
      avisa(t("Cal associar almenys la columna del nom."), 'error');
      return;
    }
    setTreballant(true);
    try {
      const r = await api.post<Resultat>('/socis/importa', { files: files(), confirma });
      if (confirma) {
        avisa(t("S'han importat {0} socis.", r.importats));
        onFet();
        onClose();
      } else setResultat(r);
    } catch (err) {
      avisaError(err);
    } finally {
      setTreballant(false);
    }
  }

  const visibles = resultat ? resultat.files.filter((f) => !nomesProblemes || f.errors.length || f.avisos.length) : [];

  return (
    <Modal titol={t("Importa socis")} onClose={onClose} ample>
      <div className="formulari-modal importa-socis">
        <p className="camp-ample apagat petit">
          {t("Desa el full de càlcul com a CSV (Excel: «Desa com a» → CSV UTF-8 o CSV delimitat per punt i coma). La primera fila hauria de tenir els noms de les columnes. Les dates poden anar en format DD/MM/AAAA o AAAA-MM-DD.")}
        </p>
        <div className="camp-ample">
          <label className="boto boto-secundari">
            {taula ? t("Tria un altre fitxer") : t("Tria el fitxer CSV")}
            <input type="file" accept=".csv,.txt,text/csv" onChange={triaFitxer} hidden />
          </label>{' '}
          {nomFitxer && (
            <span className="petit">
              {nomFitxer} · {t("{0} files", dades.length)} · {t("separador «{0}»", delimitador === '\t' ? 'TAB' : delimitador)}
            </span>
          )}
        </div>

        {taula && !resultat && (
          <>
            <label className="casella camp-ample">
              <input type="checkbox" checked={capcalera} onChange={(e) => setCapcalera(e.target.checked)} />
              {t("La primera fila és la capçalera (noms de les columnes)")}
            </label>
            <div className="camp-ample">
              <h3 className="sense-marge">{t("Associació de columnes")}</h3>
              <p className="apagat petit">{t("Indica de quina columna del fitxer surt cada dada. S'han associat automàticament les que tenen un nom conegut.")}</p>
              <table className="taula taula-compacta">
                <thead>
                  <tr>
                    <th>{t("Dada del soci")}</th>
                    <th>{t("Columna del fitxer")}</th>
                    <th className="opcional">{t("Exemple")}</th>
                  </tr>
                </thead>
                <tbody>
                  {camps.map((c) => (
                    <tr key={c.clau}>
                      <td>
                        {c.nom}
                        {c.clau === 'nom' && ' *'}
                      </td>
                      <td>
                        <select
                          aria-label={c.nom}
                          value={assoc[c.clau] ?? -1}
                          onChange={(e) => setAssoc({ ...assoc, [c.clau]: Number(e.target.value) })}
                        >
                          <option value={-1}>{t("— no s'importa —")}</option>
                          {capcaleres.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="opcional apagat">{assoc[c.clau] >= 0 ? exemple(assoc[c.clau]) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="formulari-peu camp-ample">
              <span className="espai" />
              <button type="button" className="boto boto-secundari" onClick={onClose}>
                {t("Cancel·la")}
              </button>
              <button type="button" className="boto" disabled={treballant || dades.length === 0} onClick={() => envia(false)}>
                {treballant ? t("Comprovant…") : t("Comprova les dades")}
              </button>
            </div>
          </>
        )}

        {resultat && (
          <>
            <div className="camp-ample">
              <p>
                <strong>{t("{0} files es poden importar", resultat.valides)}</strong>
                {resultat.amb_errors > 0 && <> · <span className="error-inline">{t("{0} files amb errors no s'importaran", resultat.amb_errors)}</span></>}
              </p>
              <p className="avis-demo petit">
                {t("No consta el consentiment de protecció de dades de les persones importades: quedaran com a «sense consentiment» i el programa us recordarà que els feu signar el full d'inscripció.")}
              </p>
              <label className="casella">
                <input type="checkbox" checked={nomesProblemes} onChange={(e) => setNomesProblemes(e.target.checked)} />
                {t("Mostra només les files amb errors o avisos")}
              </label>
              {visibles.length > 0 ? (
                <div className="importa-resultat">
                  <table className="taula taula-compacta">
                    <thead>
                      <tr>
                        <th className="num">{t("Fila")}</th>
                        <th>{t("Nom")}</th>
                        <th className="num">{t("Núm.")}</th>
                        <th>{t("Resultat")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((f) => (
                        <tr key={f.fila} className={f.errors.length ? 'fila-error' : ''}>
                          <td className="num">{f.fila}</td>
                          <td>{f.nom || '—'}</td>
                          <td className="num">{f.num_soci ?? ''}</td>
                          <td>
                            {f.errors.map((e, i) => (
                              <div key={'e' + i} className="error-inline">✕ {e}</div>
                            ))}
                            {f.avisos.map((a, i) => (
                              <div key={'a' + i} className="apagat">! {a}</div>
                            ))}
                            {!f.errors.length && !f.avisos.length && <span className="apagat">{t("Correcta")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="apagat petit">{t("Totes les files són correctes.")}</p>
              )}
            </div>
            <div className="formulari-peu camp-ample">
              <button type="button" className="boto boto-secundari" onClick={() => setResultat(null)}>
                {t("← Torna a l'associació de columnes")}
              </button>
              <span className="espai" />
              <button type="button" className="boto" disabled={treballant || resultat.valides === 0} onClick={() => envia(true)}>
                {treballant ? t("Important…") : t("Importa {0} socis", resultat.valides)}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
