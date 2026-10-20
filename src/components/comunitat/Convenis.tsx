// Pestanya «Convenis»: acords de col·laboració amb altres entitats i administracions (vigència, aportació,
// obligacions i document signat).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui, centsAText, data, euros, textACents } from '../../format';
import { t } from '../../i18n';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { CampDocument, Estat, VisorDocument } from './comuns';
import { ESTATS_CONVENI } from './tipus';
import type { Conveni, Entitat, EstatConveni } from './tipus';

/** Text de la vigència d'un conveni. */
export function vigencia(c: Conveni) {
  if (c.data_inici && c.data_fi) return t("{0} – {1}", data(c.data_inici), data(c.data_fi));
  if (c.data_inici) return t("des del {0}", data(c.data_inici));
  if (c.data_fi) return t("fins al {0}", data(c.data_fi));
  return '';
}

/** Insígnia d'estat, amb avís si un conveni vigent ja ha acabat o acaba aviat. */
export function EstatConveniInsignia({ c }: { c: Conveni }) {
  const ara = avui();
  if (c.estat === 'vigent' && c.data_fi && !c.renovacio_automatica) {
    if (c.data_fi < ara) return <Estat estat="caducat" text={t("Ha acabat")} />;
    const limit = new Date();
    limit.setDate(limit.getDate() + 60);
    if (c.data_fi <= limit.toLocaleDateString('sv-SE')) return <Estat estat="caduca_aviat" text={t("Acaba aviat")} />;
  }
  return <Estat estat={c.estat} text={ESTATS_CONVENI[c.estat]} />;
}

export function Convenis() {
  const { pot } = useEntitat();
  const { data: convenis, error, reload } = useApi<Conveni[]>('/comunitat/convenis');
  const [editant, setEditant] = useState<Conveni | 'nou' | null>(null);
  const [veient, setVeient] = useState<{ document: string; nom: string | null } | null>(null);

  async function obre(c: Conveni) {
    try {
      setEditant(await api.get<Conveni>(`/comunitat/convenis/${c.id}`));
    } catch (e) {
      avisaError(e);
    }
  }
  async function mostra(c: Conveni) {
    try {
      const complet = await api.get<Conveni>(`/comunitat/convenis/${c.id}`);
      if (complet.document) setVeient({ document: complet.document, nom: complet.document_nom });
    } catch (e) {
      avisaError(e);
    }
  }

  const total = (convenis ?? []).filter((c) => c.estat === 'vigent').reduce((s, c) => s + (c.import_cents ?? 0), 0);
  return (
    <>
      {pot('socis') && (
        <div className="barra-accions">
          <button className="boto" onClick={() => setEditant('nou')}>
            {t("+ Nou conveni")}
          </button>
          {total > 0 && <span className="apagat petit">{t("Aportacions dels convenis vigents: {0}", euros(total))}</span>}
        </div>
      )}
      {!convenis ? (
        <Carregant error={error} />
      ) : convenis.length === 0 ? (
        <Buit>{t("Encara no hi ha cap conveni registrat.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Conveni")}</th>
                <th>{t("Entitat")}</th>
                <th>{t("Vigència")}</th>
                <th className="num">{t("Aportació")}</th>
                <th>{t("Estat")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {convenis.map((c) => (
                <tr key={c.id} onClick={() => obre(c)}>
                  <td>
                    <strong>{c.titol}</strong>
                    {c.renovacio_automatica ? <div className="petit apagat">{t("Renovació automàtica")}</div> : null}
                  </td>
                  <td>{c.entitat}</td>
                  <td className="nowrap">{vigencia(c)}</td>
                  <td className="num">{c.import_cents ? euros(c.import_cents) : ''}</td>
                  <td>
                    <EstatConveniInsignia c={c} />
                  </td>
                  <td>
                    {c.te_document ? (
                      <button
                        className="boto boto-secundari boto-petit"
                        onClick={(e) => {
                          e.stopPropagation();
                          mostra(c);
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
      {editant && (
        <FormConveni
          c={editant === 'nou' ? null : editant}
          potEditar={pot('socis')}
          onVeure={(d, n) => setVeient({ document: d, nom: n })}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
      {veient && <VisorDocument document={veient.document} nom={veient.nom} onClose={() => setVeient(null)} />}
    </>
  );
}

export function FormConveni(props: {
  c: Conveni | null;
  entitatId?: number;
  potEditar: boolean;
  onVeure: (document: string, nom: string | null) => void;
  onClose: () => void;
  onFet: () => void;
}) {
  const c = props.c;
  const { data: entitats } = useApi<Entitat[]>('/comunitat/entitats');
  const [f, setF] = useState({
    entitat_id: String(c?.entitat_id ?? props.entitatId ?? ''),
    titol: c?.titol ?? '',
    objecte: c?.objecte ?? '',
    data_signatura: c?.data_signatura ?? '',
    data_inici: c?.data_inici ?? '',
    data_fi: c?.data_fi ?? '',
    renovacio_automatica: Boolean(c?.renovacio_automatica),
    aportacio: c?.import_cents != null ? centsAText(c.import_cents) : '',
    obligacions: c?.obligacions ?? '',
    estat: (c?.estat ?? 'esborrany') as EstatConveni,
    notes: c?.notes ?? '',
  });
  const [document, setDocument] = useState<{ valor: string | null; nom: string | null } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value } as typeof f);
  const teDocument = document === undefined ? Boolean(c?.te_document) : Boolean(document.valor);
  const valorDocument = document === undefined ? (c?.document ?? null) : document.valor;
  const nomDocument = document === undefined ? (c?.document_nom ?? null) : document.nom;

  async function envia(e: FormEvent) {
    e.preventDefault();
    const aportacio = f.aportacio.trim() ? textACents(f.aportacio) : null;
    if (f.aportacio.trim() && aportacio === null) return setError(t("L'aportació no és un import vàlid."));
    const cos = { ...f, import_cents: aportacio, ...(document !== undefined ? { document: document.valor, document_nom: document.nom } : {}) };
    try {
      if (c) await api.put(`/comunitat/convenis/${c.id}`, cos);
      else await api.post('/comunitat/convenis', cos);
      avisa(t("Conveni desat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!c || !(await confirma(t("Vols eliminar el conveni «{0}»?", c.titol)))) return;
    try {
      await api.del(`/comunitat/convenis/${c.id}`);
      avisa(t("Conveni eliminat."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={c ? c.titol : t("Nou conveni")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Entitat")}>
          <select value={f.entitat_id} onChange={set('entitat_id')} required>
            <option value="">—</option>
            {entitats?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select value={f.estat} onChange={set('estat')}>
            {Object.entries(ESTATS_CONVENI).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Títol")} ample>
          <input value={f.titol} onChange={set('titol')} required />
        </Camp>
        <Camp etiqueta={t("Objecte")} ample>
          <textarea rows={2} value={f.objecte} onChange={set('objecte')} />
        </Camp>
        <Camp etiqueta={t("Data de signatura")}>
          <input type="date" value={f.data_signatura} onChange={set('data_signatura')} />
        </Camp>
        <Camp etiqueta={t("Aportació econòmica (€)")} ajuda={t("Si el conveni inclou diners per a l'entitat")}>
          <input className="input-import" inputMode="decimal" value={f.aportacio} onChange={set('aportacio')} />
        </Camp>
        <Camp etiqueta={t("Inici")}>
          <input type="date" value={f.data_inici} onChange={set('data_inici')} />
        </Camp>
        <Camp etiqueta={t("Final")}>
          <input type="date" value={f.data_fi} onChange={set('data_fi')} />
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.renovacio_automatica} onChange={(e) => setF({ ...f, renovacio_automatica: e.target.checked })} />
          {t("Es renova automàticament (no avisis del final)")}
        </label>
        <Camp etiqueta={t("Obligacions de l'entitat")} ample>
          <textarea rows={3} value={f.obligacions} onChange={set('obligacions')} placeholder={t("Justificació, difusió amb el logotip, memòria…")} />
        </Camp>
        <Camp etiqueta={t("Document signat")} ample grup>
          <CampDocument
            teDocument={teDocument}
            nom={nomDocument}
            onCanvi={(valor, nom) => setDocument({ valor, nom })}
            onVeure={valorDocument ? () => props.onVeure(valorDocument, nomDocument) : undefined}
          />
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {c && props.potEditar && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {props.potEditar ? t("Cancel·la") : t("Tanca")}
          </button>
          {props.potEditar && <button className="boto">{t("Desa")}</button>}
        </div>
      </form>
    </Modal>
  );
}
