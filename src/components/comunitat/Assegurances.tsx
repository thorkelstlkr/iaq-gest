// Pestanya «Assegurances»: pòlisses de l'entitat (art. 10 Llei 45/2015: accidents i responsabilitat civil
// de les persones voluntàries), venciments, document de la pòlissa i qui en queda cobert.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { centsAText, data, euros, textACents } from '../../format';
import { t } from '../../i18n';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { CampDocument, Estat, VisorDocument } from './comuns';
import { ESTATS_POLISSA, TIPUS_ASSEGURANCA, nomVoluntari } from './tipus';
import type { Polissa, TipusAsseguranca, Voluntari } from './tipus';

export function Assegurances() {
  const { pot } = useEntitat();
  const { data: polisses, error, reload } = useApi<Polissa[]>('/comunitat/assegurances');
  const { data: voluntaris, reload: recarregaVol } = useApi<Voluntari[]>('/comunitat/voluntaris');
  const [editant, setEditant] = useState<Polissa | 'nova' | null>(null);
  const [veient, setVeient] = useState<{ document: string; nom: string | null } | null>(null);

  async function obre(p: Polissa) {
    try {
      const completa = await api.get<Polissa>(`/comunitat/assegurances/${p.id}`);
      setEditant(completa);
    } catch (e) {
      avisaError(e);
    }
  }
  async function mostra(p: Polissa) {
    try {
      const completa = await api.get<Polissa>(`/comunitat/assegurances/${p.id}`);
      if (completa.document) setVeient({ document: completa.document, nom: completa.document_nom });
    } catch (e) {
      avisaError(e);
    }
  }

  const actius = voluntaris ?? [];
  const senseAccidents = actius.filter((v) => !v.cobertura.accidents);
  return (
    <>
      <p className="apagat petit">
        {t("La Llei 45/2015 del voluntariat (art. 10) obliga a assegurar les persones voluntàries contra els accidents i la malaltia derivats de l'activitat i per la responsabilitat civil davant de tercers.")}
      </p>
      {pot('socis') && (
        <div className="barra-accions">
          <button className="boto" onClick={() => setEditant('nova')}>
            {t("+ Nova pòlissa")}
          </button>
        </div>
      )}
      {!polisses ? (
        <Carregant error={error} />
      ) : polisses.length === 0 ? (
        <Buit>{t("Encara no hi ha cap pòlissa registrada.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Asseguradora")}</th>
                <th>{t("Tipus")}</th>
                <th className="opcional">{t("Pòlissa")}</th>
                <th>{t("Venciment")}</th>
                <th className="num opcional">{t("Prima")}</th>
                <th>{t("Estat")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {polisses.map((p) => (
                <tr key={p.id} onClick={() => pot('socis') && obre(p)}>
                  <td>
                    <strong>{p.asseguradora}</strong>
                    {p.mediador && <div className="petit apagat">{p.mediador}</div>}
                  </td>
                  <td>
                    {TIPUS_ASSEGURANCA[p.tipus]}
                    {p.nominativa ? <div className="petit apagat">{t("Nominativa: {0} persones", p.voluntaris.length)}</div> : null}
                  </td>
                  <td className="opcional nowrap">{p.num_polissa ?? ''}</td>
                  <td className="nowrap">{data(p.data_venciment)}</td>
                  <td className="num opcional">{p.prima_cents !== null ? euros(p.prima_cents) : ''}</td>
                  <td>
                    <Estat estat={p.no_renovar && p.estat === 'vencuda' ? 'finalitzat' : p.estat} text={ESTATS_POLISSA[p.estat]} />
                  </td>
                  <td>
                    {p.te_document ? (
                      <button
                        className="boto boto-secundari boto-petit"
                        onClick={(e) => {
                          e.stopPropagation();
                          mostra(p);
                        }}
                      >
                        {t("Document")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="targeta">
        <h3>{t("Cobertura de les persones voluntàries actives")}</h3>
        {!voluntaris ? (
          <Carregant />
        ) : actius.length === 0 ? (
          <p className="apagat">{t("No hi ha persones voluntàries actives.")}</p>
        ) : (
          <>
            <p className={senseAccidents.length ? 'com-alerta' : 'apagat'}>
              {senseAccidents.length
                ? t("{0} de {1} persones actives no estan cobertes per cap assegurança d'accidents vigent.", senseAccidents.length, actius.length)
                : t("Totes les persones voluntàries actives estan cobertes per una assegurança d'accidents vigent.")}
            </p>
            <table className="taula taula-compacta">
              <thead>
                <tr>
                  <th>{t("Persona")}</th>
                  <th>{t("Accidents")}</th>
                  <th>{t("Responsabilitat civil")}</th>
                </tr>
              </thead>
              <tbody>
                {actius.map((v) => (
                  <tr key={v.id}>
                    <td>{nomVoluntari(v)}</td>
                    <td>
                      <Estat estat={v.cobertura.accidents ? 'vigent' : 'falta'} text={v.cobertura.accidents ? t("Coberta") : t("No")} />
                    </td>
                    <td>
                      <Estat estat={v.cobertura.rc ? 'vigent' : 'falta'} text={v.cobertura.rc ? t("Coberta") : t("No")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {editant && (
        <FormPolissa
          p={editant === 'nova' ? null : editant}
          voluntaris={actius}
          onVeure={(d, n) => setVeient({ document: d, nom: n })}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
            recarregaVol();
          }}
        />
      )}
      {veient && <VisorDocument document={veient.document} nom={veient.nom} onClose={() => setVeient(null)} />}
    </>
  );
}

function FormPolissa(props: {
  p: Polissa | null;
  voluntaris: Voluntari[];
  onVeure: (document: string, nom: string | null) => void;
  onClose: () => void;
  onFet: () => void;
}) {
  const p = props.p;
  const [f, setF] = useState({
    asseguradora: p?.asseguradora ?? '',
    num_polissa: p?.num_polissa ?? '',
    tipus: (p?.tipus ?? 'accidents_voluntaris') as TipusAsseguranca,
    cobertura: p?.cobertura ?? '',
    data_inici: p?.data_inici ?? '',
    data_venciment: p?.data_venciment ?? '',
    prima: p?.prima_cents != null ? centsAText(p.prima_cents) : '',
    mediador: p?.mediador ?? '',
    contacte: p?.contacte ?? '',
    nominativa: Boolean(p?.nominativa),
    no_renovar: Boolean(p?.no_renovar),
    notes: p?.notes ?? '',
  });
  const [voluntaris, setVoluntaris] = useState<number[]>(p?.voluntaris ?? []);
  // undefined: el document no canvia; null: es treu; text: document nou.
  const [document, setDocument] = useState<{ valor: string | null; nom: string | null } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value } as typeof f);
  const teDocument = document === undefined ? Boolean(p?.te_document) : Boolean(document.valor);
  const valorDocument = document === undefined ? (p?.document ?? null) : document.valor;
  const nomDocument = document === undefined ? (p?.document_nom ?? null) : document.nom;

  async function envia(e: FormEvent) {
    e.preventDefault();
    const prima = f.prima.trim() ? textACents(f.prima) : null;
    if (f.prima.trim() && prima === null) return setError(t("La prima no és un import vàlid."));
    const cos = {
      ...f,
      prima_cents: prima,
      voluntaris,
      ...(document !== undefined ? { document: document.valor, document_nom: document.nom } : {}),
    };
    try {
      if (p) await api.put(`/comunitat/assegurances/${p.id}`, cos);
      else await api.post('/comunitat/assegurances', cos);
      avisa(t("Pòlissa desada."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!p || !(await confirma(t("Vols eliminar la pòlissa de {0}?", p.asseguradora)))) return;
    try {
      await api.del(`/comunitat/assegurances/${p.id}`);
      avisa(t("Pòlissa eliminada."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={p ? t("Pòlissa d'assegurança") : t("Nova pòlissa")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Asseguradora")}>
          <input value={f.asseguradora} onChange={set('asseguradora')} required />
        </Camp>
        <Camp etiqueta={t("Núm. de pòlissa")}>
          <input value={f.num_polissa} onChange={set('num_polissa')} />
        </Camp>
        <Camp etiqueta={t("Tipus")}>
          <select value={f.tipus} onChange={set('tipus')}>
            {Object.entries(TIPUS_ASSEGURANCA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Prima anual (€)")}>
          <input className="input-import" value={f.prima} onChange={set('prima')} inputMode="decimal" />
        </Camp>
        <Camp etiqueta={t("Data d'inici")}>
          <input type="date" value={f.data_inici} onChange={set('data_inici')} />
        </Camp>
        <Camp etiqueta={t("Data de venciment")}>
          <input type="date" value={f.data_venciment} onChange={set('data_venciment')} required />
        </Camp>
        <Camp etiqueta={t("Cobertura")} ample>
          <textarea rows={2} value={f.cobertura} onChange={set('cobertura')} placeholder={t("Capitals assegurats, garanties, franquícies…")} />
        </Camp>
        <Camp etiqueta={t("Mediador o corredoria")}>
          <input value={f.mediador} onChange={set('mediador')} />
        </Camp>
        <Camp etiqueta={t("Contacte (telèfon, correu)")}>
          <input value={f.contacte} onChange={set('contacte')} />
        </Camp>
        <Camp etiqueta={t("Document de la pòlissa")} ample grup>
          <CampDocument
            teDocument={teDocument}
            nom={nomDocument}
            onCanvi={(valor, nom) => setDocument({ valor, nom })}
            onVeure={valorDocument ? () => props.onVeure(valorDocument, nomDocument) : undefined}
          />
        </Camp>
        {(f.tipus === 'accidents_voluntaris' || f.tipus === 'responsabilitat_civil') && (
          <label className="casella camp-ample">
            <input type="checkbox" checked={f.nominativa} onChange={(e) => setF({ ...f, nominativa: e.target.checked })} />
            {t("Pòlissa nominativa: només cobreix les persones indicades (si no, cobreix totes les persones voluntàries)")}
          </label>
        )}
        {f.nominativa && (
          <Camp etiqueta={t("Persones cobertes")} ample grup>
            <div className="com-tria-persones">
              {props.voluntaris.map((v) => (
                <label key={v.id} className={`com-persona ${voluntaris.includes(v.id) ? 'actiu' : ''}`}>
                  <input
                    type="checkbox"
                    checked={voluntaris.includes(v.id)}
                    onChange={() => setVoluntaris((l) => (l.includes(v.id) ? l.filter((x) => x !== v.id) : [...l, v.id]))}
                  />
                  {nomVoluntari(v)}
                </label>
              ))}
            </div>
          </Camp>
        )}
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.no_renovar} onChange={(e) => setF({ ...f, no_renovar: e.target.checked })} />
          {t("No es renovarà (no avisis del venciment)")}
        </label>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {p && (
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
