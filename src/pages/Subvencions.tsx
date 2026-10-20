// Subvencions: sol·licituds, concessions, cobraments, despeses imputades i justificació (RD 887/2006).
import { useState } from 'react';
import { useApi } from '../api';
import { Buit, Capcalera, Carregant, Xip, useExercici } from '../components/ui';
import { useEntitat } from '../entitat';
import { avui, data, euros } from '../format';
import { t } from '../i18n';
import { sumaDies } from '../../shared/dates';
import { FormSubvencio } from '../components/subvencions/FormSubvencio';
import { Dades } from '../components/subvencions/Dades';
import { Despeses } from '../components/subvencions/Despeses';
import { Cobraments } from '../components/subvencions/Cobraments';
import { Justificacio } from '../components/subvencions/Justificacio';
import { PER_JUSTIFICAR, estat, nomSubvencio } from '../components/subvencions/tipus';
import type { Subvencio } from '../components/subvencions/tipus';
import '../styles/subvencions.css';

const PESTANYES = [
  { id: 'dades', text: t("Dades") },
  { id: 'despeses', text: t("Despeses imputades") },
  { id: 'cobraments', text: t("Cobraments") },
  { id: 'justificacio', text: t("Justificació") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export function XipEstat({ id }: { id: string }) {
  const e = estat(id);
  return <Xip nom={e.text} color={e.color} />;
}

/** Termini de justificació amb avís si és proper (30 dies) o ha vençut. */
function Termini({ s }: { s: Subvencio }) {
  if (!s.termini_justificacio) return <span className="apagat">—</span>;
  const pendent = PER_JUSTIFICAR.includes(s.estat);
  const vencut = pendent && s.termini_justificacio < avui();
  const proper = pendent && !vencut && s.termini_justificacio <= sumaDies(30);
  return (
    <span className={vencut ? 'subv-termini vencut' : proper ? 'subv-termini proper' : ''}>
      {data(s.termini_justificacio)}
      {vencut && ` · ${t("vençut")}`}
    </span>
  );
}

export default function Subvencions() {
  const [exercici] = useExercici();
  const [totes, setTotes] = useState(false);
  const { data: llista, error, reload } = useApi<Subvencio[]>(`/subvencions?exercici=${totes ? 'totes' : exercici}`);
  const [obertaId, setObertaId] = useState<number | null>(null);
  const [editant, setEditant] = useState<Partial<Subvencio> | null>(null);
  const { pot } = useEntitat();
  const editable = pot('economia');
  const oberta = llista?.find((s) => s.id === obertaId) ?? null;

  const concedit = llista?.reduce((x, s) => x + (s.import_concedit_cents ?? 0), 0) ?? 0;
  const cobrat = llista?.reduce((x, s) => x + s.cobrat_cents, 0) ?? 0;
  const pendents = llista?.filter((s) => s.estat === 'sollicitada').length ?? 0;

  return (
    <>
      {oberta ? (
        <Detall s={oberta} editable={editable} onTorna={() => setObertaId(null)} onEdita={() => setEditant(oberta)} onCanvi={reload} />
      ) : (
        <>
          <Capcalera titol={t("Subvencions")} subtitol={t("Sol·licituds, concessions i justificació de les subvencions")}>
            {editable && (
              <button className="boto" onClick={() => setEditant({ exercici, estat: 'preparacio' })}>
                {t("+ Nova subvenció")}
              </button>
            )}
          </Capcalera>
          <div className="filtres">
            <label className="casella">
              <input type="checkbox" checked={totes} onChange={(e) => setTotes(e.target.checked)} />
              {t("Mostra les de tots els exercicis")}
            </label>
          </div>
          {llista && llista.length > 0 && (
            <section className="xifres xifres-petites">
              <div className="xifra">
                <span className="xifra-etiqueta">{t("Concedit")}</span>
                <span className="xifra-valor">{euros(concedit)}</span>
              </div>
              <div className="xifra">
                <span className="xifra-etiqueta">{t("Cobrat")}</span>
                <span className="xifra-valor">{euros(cobrat)}</span>
                {concedit > cobrat && <span className="xifra-nota">{t("pendent {0}", euros(concedit - cobrat))}</span>}
              </div>
              <div className="xifra">
                <span className="xifra-etiqueta">{t("Sol·licituds pendents")}</span>
                <span className="xifra-valor">{pendents}</span>
              </div>
            </section>
          )}
          {!llista ? (
            <Carregant error={error} />
          ) : llista.length === 0 ? (
            <Buit>{t("No hi ha subvencions en aquest exercici. Registra'n una amb «+ Nova subvenció».")}</Buit>
          ) : (
            <div className="taula-contenidor">
              <table className="taula taula-clicable">
                <thead>
                  <tr>
                    <th>{t("Subvenció")}</th>
                    <th>{t("Estat")}</th>
                    <th className="num">{t("Sol·licitat")}</th>
                    <th className="num">{t("Concedit")}</th>
                    <th className="num">{t("Cobrat")}</th>
                    <th className="num">{t("Imputat")}</th>
                    <th>{t("Termini de justificació")}</th>
                  </tr>
                </thead>
                <tbody>
                  {llista.map((s) => (
                    <tr key={s.id} onClick={() => setObertaId(s.id)}>
                      <td>
                        <strong>{s.organisme}</strong> <span className="apagat">· {s.exercici}</span>
                        <div className="apagat petit">{[s.convocatoria, s.activitat_nom].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>
                        <XipEstat id={s.estat} />
                        {PER_JUSTIFICAR.includes(s.estat) && s.n_sense_justificant > 0 && (
                          <div className="subv-falta">{t("{0} sense justificant", s.n_sense_justificant)}</div>
                        )}
                      </td>
                      <td className="num nowrap">{euros(s.import_sollicitat_cents)}</td>
                      <td className="num nowrap">{s.import_concedit_cents !== null ? euros(s.import_concedit_cents) : '—'}</td>
                      <td className={`num nowrap ${s.import_concedit_cents && s.cobrat_cents < s.import_concedit_cents ? 'apagat' : ''}`}>
                        {euros(s.cobrat_cents)}
                      </td>
                      <td className="num nowrap">{euros(s.imputat_cents)}</td>
                      <td className="nowrap">
                        <Termini s={s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {editant && (
        <FormSubvencio
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={(s) => {
            setEditant(null);
            reload();
            setObertaId(s?.id ?? null);
          }}
        />
      )}
    </>
  );
}

function Detall(props: { s: Subvencio; editable: boolean; onTorna: () => void; onEdita: () => void; onCanvi: () => void }) {
  const { s, editable } = props;
  const [pestanya, setPestanya] = useState<Pestanya>('dades');
  return (
    <>
      <Capcalera
        titol={s.organisme}
        subtitol={
          <>
            {[s.convocatoria, s.exercici].filter(Boolean).join(' · ')} <XipEstat id={s.estat} />
          </>
        }
      >
        <button className="boto boto-secundari" onClick={props.onTorna}>
          {t("← Totes les subvencions")}
        </button>
        {editable && (
          <button className="boto" onClick={props.onEdita}>
            {t("Edita")}
          </button>
        )}
      </Capcalera>
      <div className="pestanyes no-imprimir" role="tablist" aria-label={nomSubvencio(s)}>
        {PESTANYES.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestanya === p.id} className={pestanya === p.id ? 'actiu' : ''} onClick={() => setPestanya(p.id)}>
            {p.text}
            {p.id === 'despeses' && s.n_imputacions > 0 && <span className="subv-compte">{s.n_imputacions}</span>}
          </button>
        ))}
      </div>
      <div className="subv-pagina">
        {pestanya === 'dades' && <Dades s={s} editable={editable} onCanvi={props.onCanvi} />}
        {pestanya === 'despeses' && <Despeses s={s} editable={editable} onCanvi={props.onCanvi} />}
        {pestanya === 'cobraments' && <Cobraments s={s} editable={editable} onCanvi={props.onCanvi} />}
        {pestanya === 'justificacio' && <Justificacio key={s.id} s={s} editable={editable} onCanvi={props.onCanvi} />}
      </div>
    </>
  );
}
