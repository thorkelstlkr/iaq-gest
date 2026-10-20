// Importació d'un extracte bancari: CSV (amb associació de columnes, que es recorda per compte) o Norma 43.
import { useMemo, useState } from 'react';
import { api } from '../../api';
import { Camp, Modal, avisa, avisaError } from '../ui';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { decodifica, detectaDelimitador, llegeixCsv } from '../socis/csv';
import { missatge } from './tipus';
import type { CompteExtracte, MapaCsv } from './tipus';

type CampMapa = keyof MapaCsv;

const CAMPS: { clau: CampMapa; nom: string; alies: string[] }[] = [
  { clau: 'data', nom: t("Data d'operació"), alies: ['fecha', 'fecha operacion', 'f operacion', 'fecha contable', 'data', 'data operacio', 'date', 'booking date'] },
  { clau: 'data_valor', nom: t("Data valor"), alies: ['fecha valor', 'f valor', 'data valor', 'value date', 'valor'] },
  { clau: 'concepte', nom: t("Concepte"), alies: ['concepto', 'concepte', 'descripcion', 'descripcio', 'description', 'detalle', 'movimiento', 'concepto comun'] },
  { clau: 'import', nom: t("Import (amb signe)"), alies: ['importe', 'import', 'amount', 'cantidad', 'importe eur', 'importe euros'] },
  { clau: 'carrec', nom: t("Càrrecs (sortides)"), alies: ['cargo', 'cargos', 'debe', 'carrec', 'carrecs', 'debit', 'reintegro'] },
  { clau: 'abonament', nom: t("Abonaments (entrades)"), alies: ['abono', 'abonos', 'haber', 'abonament', 'abonaments', 'credit', 'ingreso'] },
  { clau: 'saldo', nom: t("Saldo"), alies: ['saldo', 'balance', 'saldo eur', 'disponible'] },
  { clau: 'referencia', nom: t("Referència"), alies: ['referencia', 'referencia 1', 'ref', 'reference', 'num documento', 'documento'] },
];

const normalitza = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function autoAssocia(capcaleres: string[]): MapaCsv {
  const norm = capcaleres.map(normalitza);
  const usades = new Set<number>();
  const m: Record<string, number> = {};
  for (const c of CAMPS) {
    const i = norm.findIndex((h, j) => !usades.has(j) && c.alies.includes(h));
    m[c.clau] = i;
    if (i >= 0) usades.add(i);
  }
  return m as unknown as MapaCsv;
}

/** Cert si el text sembla un fitxer Norma 43 (registres de 80 posicions que comencen per 11). */
const esN43 = (text: string) => /^11\d{18}/.test(text.trimStart());

interface Resultat {
  linies: { data: string; concepte: string; import_cents: number; saldo_cents: number | null; duplicada: boolean }[];
  total: number;
  noves: number;
  duplicades: number;
  errors: { fila: number; error: string; valor?: string }[];
  avisos: string[];
  importades: number;
}

export function ImportaExtracte(props: { compte: CompteExtracte; onClose: () => void; onFet: () => void }) {
  const [nomFitxer, setNomFitxer] = useState('');
  const [contingut, setContingut] = useState('');
  const [format, setFormat] = useState<'csv' | 'n43'>('csv');
  const [taula, setTaula] = useState<string[][] | null>(null);
  const [salta, setSalta] = useState(0);
  const [capcalera, setCapcalera] = useState(props.compte.mapa?.capcalera ?? true);
  const [mapa, setMapa] = useState<MapaCsv>(props.compte.mapa?.mapa ?? ({ data: -1, concepte: -1 } as MapaCsv));
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [treballant, setTreballant] = useState(false);

  async function triaFitxer(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      const text = decodifica(await fitxer.arrayBuffer());
      setNomFitxer(fitxer.name);
      setContingut(text);
      setResultat(null);
      if (esN43(text)) {
        setFormat('n43');
        setTaula(null);
        return;
      }
      setFormat('csv');
      const files = llegeixCsv(text, detectaDelimitador(text));
      if (!files.length) throw new Error(t("El fitxer és buit."));
      setTaula(files);
      // Si no hi ha associació desada per a aquest compte, es dedueix de la capçalera.
      if (!props.compte.mapa) setMapa(autoAssocia(files[0]));
    } catch (err) {
      avisaError(err);
    }
  }

  const ncol = taula ? Math.max(...taula.map((f) => f.length)) : 0;
  const filesUtils = taula ? taula.slice(salta) : [];
  const capcaleres = Array.from({ length: ncol }, (_, i) => (capcalera && filesUtils[0]?.[i]) || t("Columna {0}", i + 1));
  const dades = capcalera ? filesUtils.slice(1) : filesUtils;
  const exemple = (c: number) => dades.find((f) => f[c])?.[c] ?? '';
  const valid = useMemo(
    () => format === 'n43' ? Boolean(contingut) : mapa.data >= 0 && ((mapa.import ?? -1) >= 0 || (mapa.carrec ?? -1) >= 0 || (mapa.abonament ?? -1) >= 0),
    [format, contingut, mapa],
  );

  async function envia(confirma: boolean) {
    setTreballant(true);
    try {
      const cos =
        format === 'n43'
          ? { compte_id: props.compte.id, format, text: contingut, confirma }
          : { compte_id: props.compte.id, format, files: dades, mapa, capcalera, primera_fila: salta + (capcalera ? 2 : 1), confirma };
      const r = await api.post<Resultat>('/fiscal/extractes/importa', cos);
      if (confirma) {
        avisa(t("S'han importat {0} línies ({1} ja hi eren).", r.importades, r.duplicades));
        props.onFet();
      } else setResultat(r);
    } catch (err) {
      avisaError(err);
    } finally {
      setTreballant(false);
    }
  }

  return (
    <Modal titol={t("Importa un extracte · {0}", props.compte.nom)} onClose={props.onClose} ample>
      <div className="formulari-modal">
        <p className="camp-ample apagat">
          {t("Descarregueu els moviments des de la banca en línia en format CSV (o Excel desat com a CSV) o en Norma 43 (també dit «Cuaderno 43» o «AEB 43»). Les línies que ja s'havien importat no es dupliquen.")}
        </p>
        <Camp etiqueta={t("Fitxer de l'extracte")} ample>
          <input type="file" accept=".csv,.txt,.n43,.aeb,.q43,text/csv,text/plain" onChange={triaFitxer} />
        </Camp>
        {nomFitxer && (
          <p className="camp-ample">
            <strong>{nomFitxer}</strong> · {format === 'n43' ? t("Norma 43") : t("CSV: {0} files", taula?.length ?? 0)}
          </p>
        )}

        {format === 'csv' && taula && (
          <>
            <Camp etiqueta={t("Files a saltar al principi")} ajuda={t("Alguns bancs posen dades del compte abans de la capçalera.")}>
              <input type="number" min="0" max={Math.max(0, taula.length - 1)} value={salta} onChange={(e) => {
                  setSalta(Math.max(0, Number(e.target.value) || 0));
                  setResultat(null);
                }} />
            </Camp>
            <label className="camp fiscal-casella">
              <input type="checkbox" checked={capcalera} onChange={(e) => {
                  setCapcalera(e.target.checked);
                  setResultat(null);
                }} />
              <span>{t("La primera fila és la capçalera")}</span>
            </label>
            <div className="camp-ample">
              <h3>{t("Associació de columnes")}</h3>
              <p className="petit apagat">
                {t("Indiqueu la columna de l'import amb signe (negatiu = sortida) o bé les de càrrecs i abonaments. L'associació es recorda per a aquest compte.")}
              </p>
              <div className="fiscal-mapa">
                {CAMPS.map((c) => (
                  <Camp key={c.clau} etiqueta={c.nom}>
                    <select
                      value={mapa[c.clau] ?? -1}
                      onChange={(e) => {
                        setMapa({ ...mapa, [c.clau]: Number(e.target.value) });
                        setResultat(null);
                      }}
                    >
                      <option value={-1}>{t("— Cap —")}</option>
                      {capcaleres.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                          {exemple(i) ? ` · ${exemple(i).slice(0, 24)}` : ''}
                        </option>
                      ))}
                    </select>
                  </Camp>
                ))}
              </div>
            </div>
          </>
        )}

        {resultat && (
          <div className="camp-ample fiscal-resultat">
            <p>
              <strong>{t("{0} línies noves", resultat.noves)}</strong>
              {resultat.duplicades > 0 && <> · {t("{0} ja importades (s'ometran)", resultat.duplicades)}</>}
              {resultat.errors.length > 0 && <> · <span className="error">{t("{0} files amb errors (s'ometran)", resultat.errors.length)}</span></>}
            </p>
            {resultat.avisos.map((a) => (
              <p key={a} className="fiscal-avis">{missatge(a)}</p>
            ))}
            {resultat.errors.length > 0 && (
              <ul className="petit error">
                {resultat.errors.slice(0, 10).map((e) => (
                  <li key={e.fila}>{t("Fila {0}: {1}", e.fila, missatge(e.error, e.valor))}</li>
                ))}
              </ul>
            )}
            <div className="taula-contenidor">
              <table className="taula taula-compacta">
                <thead>
                  <tr>
                    <th>{t("Data")}</th>
                    <th>{t("Concepte")}</th>
                    <th className="num">{t("Import")}</th>
                    <th className="num">{t("Saldo")}</th>
                  </tr>
                </thead>
                <tbody>
                  {resultat.linies.slice(0, 12).map((l, i) => (
                    <tr key={i} className={l.duplicada ? 'apagat' : ''}>
                      <td className="nowrap">{data(l.data)}</td>
                      <td>{l.concepte}{l.duplicada && <span className="petit"> · {t("ja importada")}</span>}</td>
                      <td className={`num ${l.import_cents < 0 ? 'negatiu' : 'positiu'}`}>{euros(l.import_cents)}</td>
                      <td className="num">{l.saldo_cents !== null ? euros(l.saldo_cents) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {resultat.total > 12 && <p className="petit apagat">{t("… i {0} línies més.", resultat.total - 12)}</p>}
          </div>
        )}

        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          {!resultat ? (
            <button type="button" className="boto" disabled={!valid || treballant} onClick={() => envia(false)}>
              {t("Comprova")}
            </button>
          ) : (
            <button type="button" className="boto" disabled={!resultat.noves || treballant} onClick={() => envia(true)}>
              {t("Importa {0} línies", resultat.noves)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
