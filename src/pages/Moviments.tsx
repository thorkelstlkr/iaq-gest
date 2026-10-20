import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, useExercici, confirma } from '../components/ui';
import { TIPUS_MOVIMENT, avui, centsAText, data, euros, nomComplet, textACents } from '../format';
import { DEMO } from '../mode';
import type { Activitat, Categoria, Compte, Moviment, SociLlista, TipusMoviment } from '../../shared/types';
import { idioma, t } from '../i18n';
import { Clip, JustificantsMoviment } from '../components/subvencions/Justificants';
import { FormImputacio } from '../components/subvencions/Despeses';
import { PER_JUSTIFICAR, nomSubvencio } from '../components/subvencions/tipus';
import type { Subvencio } from '../components/subvencions/tipus';
import '../styles/tresoreria.css';
import '../styles/subvencions.css';

/** Moviment amb les dades de subvencions i justificants adjunts (vegeu server/routes/comptabilitat.ts). */
type MovimentAmb = Moviment & {
  subvencio_id?: number | null;
  subvencio_nom?: string | null;
  n_justificants?: number;
  imputat_cents?: number;
};

export default function Moviments() {
  const [exercici] = useExercici();
  const [filtres, setFiltres] = useState({ tipus: '', compte_id: '', categoria_id: '', q: '' });
  const qs = new URLSearchParams({ exercici: String(exercici), ...filtres }).toString();
  const { data: moviments, error, reload } = useApi<MovimentAmb[]>(`/comptabilitat/moviments?${qs}`);
  const { data: comptes, reload: reloadComptes } = useApi<Compte[]>('/comptabilitat/comptes');
  const { data: categories } = useApi<Categoria[]>('/comptabilitat/categories');
  const [editant, setEditant] = useState<Partial<MovimentAmb> | null>(null);
  const [adjunts, setAdjunts] = useState<MovimentAmb | null>(null);
  // Exercicis tancats: els seus moviments no es poden modificar (vegeu Tresoreria › Tancament).
  const { data: tancats } = useApi<number[]>('/tresoreria/exercicis-tancats');
  const tancat = Boolean(tancats?.includes(exercici));

  const setF = (k: keyof typeof filtres) => (e: { target: { value: string } }) =>
    setFiltres({ ...filtres, [k]: e.target.value });

  const ingressos = moviments?.filter((m) => m.tipus === 'ingres').reduce((s, m) => s + m.import_cents, 0) ?? 0;
  const despeses = moviments?.filter((m) => m.tipus === 'despesa').reduce((s, m) => s + m.import_cents, 0) ?? 0;

  return (
    <>
      <Capcalera titol={t("Comptabilitat")} subtitol={t("Llibre de caixa i bancs · exercici {0}", exercici)}>
        {!DEMO && (
          <a className="boto boto-secundari" href={`/api/comptabilitat/moviments/export.csv?${qs}&idioma=${idioma()}`}>
            {t("Exporta CSV")}
          </a>
        )}
        <button className="boto" disabled={tancat} onClick={() => setEditant({ tipus: 'despesa', data: avui() })}>
          {t("+ Nou moviment")}
        </button>
      </Capcalera>

      {tancat && (
        <p className="avis-tancat" role="note">
          <span aria-hidden="true" className="cadenat" />
          {t("L'exercici {0} està tancat: els moviments es poden consultar però no modificar.", exercici)}
        </p>
      )}

      {comptes && (
        <section className="xifres xifres-petites">
          {comptes
            .filter((c) => c.actiu)
            .map((c) => (
              <div className="xifra" key={c.id}>
                <span className="xifra-etiqueta">{c.nom}</span>
                <span className={`xifra-valor ${(c.saldo_cents ?? 0) < 0 ? 'negatiu' : ''}`}>
                  {euros(c.saldo_cents ?? 0)}
                </span>
                <span className="xifra-nota">{t("saldo actual")}</span>
              </div>
            ))}
        </section>
      )}

      <div className="filtres">
        <input type="search" placeholder={t("Cerca concepte, justificant…")} value={filtres.q} onChange={setF('q')} />
        <select value={filtres.tipus} onChange={setF('tipus')} aria-label={t("Tipus")}>
          <option value="">{t("Tots els tipus")}</option>
          <option value="ingres">{t("Ingressos")}</option>
          <option value="despesa">{t("Despeses")}</option>
          <option value="traspas">{t("Traspassos")}</option>
        </select>
        <select value={filtres.compte_id} onChange={setF('compte_id')} aria-label={t("Compte")}>
          <option value="">{t("Tots els comptes")}</option>
          {comptes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select value={filtres.categoria_id} onChange={setF('categoria_id')} aria-label={t("Categoria")}>
          <option value="">{t("Totes les categories")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tipus === 'ingres' ? '↑' : '↓'} {c.nom}
            </option>
          ))}
        </select>
      </div>

      {!moviments ? (
        <Carregant error={error} />
      ) : moviments.length === 0 ? (
        <Buit>{t("No hi ha moviments amb aquests criteris.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Concepte")}</th>
                <th>{t("Categoria")}</th>
                <th>{t("Compte")}</th>
                <th aria-label={t("Fitxers adjunts")} />
                <th>{t("Justificant")}</th>
                <th className="num">{t("Import")}</th>
              </tr>
            </thead>
            <tbody>
              {moviments.map((m) => (
                <tr key={m.id} onClick={() => setEditant(m)}>
                  <td className="nowrap">
                    {tancat && <span className="cadenat" title={t("Exercici tancat")} aria-label={t("Exercici tancat")} />}
                    {data(m.data)}
                  </td>
                  <td>
                    {m.concepte}
                    {(m.activitat_nom || m.soci_nom || m.subvencio_nom || Boolean(m.imputat_cents)) && (
                      <div className="apagat petit">
                        {[
                          m.activitat_nom && t("Activitat: {0}", m.activitat_nom),
                          m.soci_nom && t("Soci: {0}", m.soci_nom),
                          m.subvencio_nom && t("Subvenció: {0}", m.subvencio_nom),
                          m.imputat_cents ? t("Imputat a subvencions: {0}", euros(m.imputat_cents)) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td>{m.tipus === 'traspas' ? <em>{t("Traspàs")}</em> : m.categoria_nom}</td>
                  <td>{m.tipus === 'traspas' ? `${m.compte_nom} → ${m.compte_desti_nom}` : m.compte_nom}</td>
                  <td className="nowrap">
                    <Clip n={m.n_justificants ?? 0} onClick={() => setAdjunts(m)} />
                  </td>
                  <td>{m.justificant}</td>
                  <td className={`num nowrap ${m.tipus === 'despesa' ? 'negatiu' : m.tipus === 'ingres' ? 'positiu' : ''}`}>
                    {m.tipus === 'despesa' ? '−' : m.tipus === 'ingres' ? '+' : ''}
                    {euros(m.import_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>
                  {t("Ingressos")} {euros(ingressos)} {t("· Despeses")} {euros(despeses)}
                </td>
                <td className={`num nowrap ${ingressos - despeses < 0 ? 'negatiu' : 'positiu'}`}>
                  {euros(ingressos - despeses)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {adjunts && (
        <JustificantsMoviment
          moviment={adjunts}
          tancat={Boolean(tancats?.includes(Number(adjunts.data.slice(0, 4))))}
          onClose={() => setAdjunts(null)}
          onCanvi={reload}
        />
      )}

      {editant && comptes && categories && (
        <FormMoviment
          inicial={editant}
          comptes={comptes}
          categories={categories}
          tancats={tancats ?? []}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
            reloadComptes();
          }}
        />
      )}
    </>
  );
}

function FormMoviment(props: {
  inicial: Partial<MovimentAmb>;
  comptes: Compte[];
  categories: Categoria[];
  tancats: number[];
  onClose: () => void;
  onFet: () => void;
}) {
  const m = props.inicial;
  const bloquejat = Boolean(m.id && m.data && props.tancats.includes(Number(m.data.slice(0, 4))));
  const { data: activitats } = useApi<Activitat[]>('/activitats?exercici=totes');
  const { data: socis } = useApi<SociLlista[]>('/socis?estat=tots');
  // Subvencions: els ingressos poden ser-ne el cobrament; les despeses s'hi poden imputar.
  const { data: subvencions } = useApi<Subvencio[]>('/subvencions?estats=concedida,cobrada,justificada,tancada,reintegrament');
  const [adjunts, setAdjunts] = useState(false);
  const [f, setF] = useState({
    tipus: (m.tipus ?? 'despesa') as TipusMoviment,
    data: m.data ?? avui(),
    import: m.import_cents ? centsAText(m.import_cents) : '',
    concepte: m.concepte ?? '',
    categoria_id: m.categoria_id ? String(m.categoria_id) : '',
    compte_id: String(m.compte_id ?? props.comptes.find((c) => c.actiu)?.id ?? ''),
    compte_desti_id: m.compte_desti_id ? String(m.compte_desti_id) : '',
    activitat_id: m.activitat_id ? String(m.activitat_id) : '',
    soci_id: m.soci_id ? String(m.soci_id) : '',
    justificant: m.justificant ?? '',
    notes: m.notes ?? '',
    subvencio_id: m.subvencio_id ? String(m.subvencio_id) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const categoriesTipus = props.categories.filter(
    (c) => c.tipus === f.tipus && (c.actiu || String(c.id) === f.categoria_id),
  );
  const comptesActius = props.comptes.filter((c) => c.actiu || [f.compte_id, f.compte_desti_id].includes(String(c.id)));

  async function envia(e: FormEvent) {
    e.preventDefault();
    const import_cents = textACents(f.import);
    if (!import_cents || import_cents <= 0) return setError(t("L'import ha de ser més gran que zero."));
    const cos = { ...f, import_cents, subvencio_id: f.tipus === 'ingres' ? f.subvencio_id : '' };
    try {
      if (m.id) await api.put(`/comptabilitat/moviments/${m.id}`, cos);
      else await api.post('/comptabilitat/moviments', cos);
      avisa(m.id ? t("Moviment actualitzat.") : t("Moviment registrat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquest moviment?")))) return;
    try {
      await api.del(`/comptabilitat/moviments/${m.id}`);
      avisa(t("Moviment eliminat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={bloquejat ? t("Moviment d'un exercici tancat") : m.id ? t("Edita el moviment") : t("Nou moviment")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        {bloquejat && (
          <p className="avis-tancat camp-ample" role="note">
            <span aria-hidden="true" className="cadenat" />
            {t("Aquest moviment és d'un exercici tancat i no es pot modificar ni eliminar.")}
          </p>
        )}
        <fieldset className="fieldset-transparent" disabled={bloquejat}>
        <div className="segmentat camp-ample" role="radiogroup" aria-label={t("Tipus")}>
          {(['ingres', 'despesa', 'traspas'] as const).map((tt) => (
            <button
              key={tt}
              type="button"
              role="radio"
              aria-checked={f.tipus === tt}
              className={f.tipus === tt ? `actiu segment-${tt}` : ''}
              onClick={() => setF({ ...f, tipus: tt, categoria_id: '' })}
            >
              {TIPUS_MOVIMENT[tt]}
            </button>
          ))}
        </div>
        <Camp etiqueta={t("Data")}>
          <input type="date" value={f.data} onChange={set('data')} required />
        </Camp>
        <Camp etiqueta={t("Import (€)")}>
          <input inputMode="decimal" placeholder="0,00" value={f.import} onChange={set('import')} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Concepte")} ample>
          <input value={f.concepte} onChange={set('concepte')} required />
        </Camp>
        {f.tipus !== 'traspas' && (
          <Camp etiqueta={t("Categoria")}>
            <select value={f.categoria_id} onChange={set('categoria_id')} required>
              <option value="">—</option>
              {categoriesTipus.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Camp>
        )}
        <Camp etiqueta={f.tipus === 'traspas' ? t("Des del compte") : t("Compte")}>
          <select value={f.compte_id} onChange={set('compte_id')} required>
            {comptesActius.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        {f.tipus === 'traspas' && (
          <Camp etiqueta={t("Al compte")}>
            <select value={f.compte_desti_id} onChange={set('compte_desti_id')} required>
              <option value="">—</option>
              {comptesActius
                .filter((c) => String(c.id) !== f.compte_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
            </select>
          </Camp>
        )}
        <Camp etiqueta={t("Activitat (opcional)")}>
          <select value={f.activitat_id} onChange={set('activitat_id')}>
            <option value="">—</option>
            {activitats?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom} ({data(a.data_inici)})
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Soci (opcional)")}>
          <select value={f.soci_id} onChange={set('soci_id')}>
            <option value="">—</option>
            {socis?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {nomComplet(s)}
              </option>
            ))}
          </select>
        </Camp>
        {f.tipus === 'ingres' && (
          <Camp etiqueta={t("Cobrament de la subvenció (opcional)")}>
            <select value={f.subvencio_id} onChange={set('subvencio_id')}>
              <option value="">—</option>
              {m.subvencio_id && !subvencions?.some((s) => s.id === m.subvencio_id) && (
                <option value={m.subvencio_id}>{m.subvencio_nom ?? `#${m.subvencio_id}`}</option>
              )}
              {subvencions?.map((s) => (
                <option key={s.id} value={s.id}>
                  {nomSubvencio(s)}
                </option>
              ))}
            </select>
          </Camp>
        )}
        <Camp etiqueta={t("Núm. de factura / justificant")}>
          <input value={f.justificant} onChange={set('justificant')} />
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        </fieldset>
        {m.id && (
          <div className="camp-ample subv-barra">
            <button type="button" className="boto boto-secundari" onClick={() => setAdjunts(true)}>
              {t("Justificants adjunts ({0})", m.n_justificants ?? 0)}
            </button>
          </div>
        )}
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {m.id && !bloquejat && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          {!bloquejat && <button className="boto">{t("Desa")}</button>}
        </div>
      </form>
      {/* Fora del <form>: la drecera obre el seu propi formulari. */}
      {m.id && !bloquejat && m.tipus === 'despesa' && f.tipus === 'despesa' && (
        <ImputacionsMoviment
          moviment={{ id: m.id, data: m.data ?? f.data, concepte: m.concepte ?? f.concepte, import_cents: m.import_cents ?? 0 }}
          subvencions={(subvencions ?? []).filter((s) => PER_JUSTIFICAR.includes(s.estat))}
        />
      )}
      {adjunts && m.id && (
        <JustificantsMoviment
          moviment={{ id: m.id, data: m.data ?? f.data, concepte: m.concepte ?? f.concepte, import_cents: m.import_cents ?? 0 }}
          tancat={bloquejat}
          onClose={() => setAdjunts(false)}
        />
      )}
    </Modal>
  );
}

interface ImputacioMoviment {
  id: number;
  subvencio_id: number;
  import_cents: number;
  creditor: string | null;
  organisme: string;
  convocatoria: string | null;
  exercici: number;
  estat: string;
}

/** Drecera per imputar una despesa a una subvenció des del formulari del moviment. */
function ImputacionsMoviment(props: { moviment: { id: number; data: string; concepte: string; import_cents: number }; subvencions: Subvencio[] }) {
  const { moviment } = props;
  const { data: llista, reload } = useApi<ImputacioMoviment[]>(`/subvencions/moviment/${moviment.id}`);
  const [triada, setTriada] = useState('');
  const [imputant, setImputant] = useState<number | null>(null);
  const imputat = llista?.reduce((x, i) => x + i.import_cents, 0) ?? 0;
  const disponibles = props.subvencions.filter((s) => !llista?.some((i) => i.subvencio_id === s.id));
  return (
    <div className="camp-ample subv-imputacions-moviment">
      <span className="camp-etiqueta">{t("Imputació a subvencions")}</span>
      {llista && llista.length > 0 && (
        <ul>
          {llista.map((i) => (
            <li key={i.id}>
              {nomSubvencio(i)}: <strong>{euros(i.import_cents)}</strong>
            </li>
          ))}
        </ul>
      )}
      {imputat < moviment.import_cents && disponibles.length > 0 && (
        <div className="subv-barra">
          <select value={triada} onChange={(e) => setTriada(e.target.value)} aria-label={t("Subvenció")}>
            <option value="">{t("Tria una subvenció…")}</option>
            {disponibles.map((s) => (
              <option key={s.id} value={s.id}>
                {nomSubvencio(s)}
              </option>
            ))}
          </select>
          <button type="button" className="boto boto-secundari" disabled={!triada} onClick={() => setImputant(Number(triada))}>
            {t("Imputa a la subvenció")}
          </button>
        </div>
      )}
      {llista && llista.length === 0 && disponibles.length === 0 && (
        <p className="apagat petit">{t("No hi ha cap subvenció concedida pendent de justificar.")}</p>
      )}
      {imputant && (
        <FormImputacio
          s={{ id: imputant }}
          moviment={{ ...moviment, imputat_cents: imputat }}
          imputacio={null}
          onClose={() => setImputant(null)}
          onFet={() => {
            setImputant(null);
            setTriada('');
            reload();
          }}
        />
      )}
    </div>
  );
}
