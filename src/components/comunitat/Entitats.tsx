// Pestanya «Entitats»: administracions, escoles, entitats i empreses amb què col·laborem; fitxa amb el resum
// de la col·laboració (activitats, convenis i aportacions) i gestió de les activitats en què ha col·laborat.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { VisorDocument } from './comuns';
import { EstatConveniInsignia, FormConveni, vigencia } from './Convenis';
import { ROLS_ACTIVITAT, TIPUS_ENTITAT } from './tipus';
import type { ActivitatBreu, Conveni, Entitat, FitxaEntitat, RolActivitat, TipusEntitat } from './tipus';

export function Entitats() {
  const { pot } = useEntitat();
  const { data: entitats, error, reload } = useApi<Entitat[]>('/comunitat/entitats');
  const [cerca, setCerca] = useState('');
  const [tipus, setTipus] = useState('');
  const [fitxa, setFitxa] = useState<number | null>(null);
  const [editant, setEditant] = useState<Entitat | 'nova' | null>(null);

  const q = cerca.trim().toLowerCase();
  const filtrades = (entitats ?? []).filter(
    (e) => (!tipus || e.tipus === tipus) && (!q || [e.nom, e.persona_contacte, e.email, e.notes].some((x) => x?.toLowerCase().includes(q))),
  );
  return (
    <>
      <div className="filtres">
        <input type="search" placeholder={t("Cerca per nom o persona de contacte…")} value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select value={tipus} onChange={(e) => setTipus(e.target.value)} aria-label={t("Tipus")}>
          <option value="">{t("Tots els tipus")}</option>
          {Object.entries(TIPUS_ENTITAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {pot('socis') && (
          <button className="boto" onClick={() => setEditant('nova')}>
            {t("+ Nova entitat")}
          </button>
        )}
      </div>
      {!entitats ? (
        <Carregant error={error} />
      ) : filtrades.length === 0 ? (
        <Buit>{entitats.length ? t("Cap entitat coincideix amb la cerca.") : t("Encara no hi ha cap entitat col·laboradora.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Entitat")}</th>
                <th>{t("Tipus")}</th>
                <th className="opcional">{t("Contacte")}</th>
                <th className="num">{t("Activitats")}</th>
                <th className="num">{t("Convenis vigents")}</th>
                <th className="num opcional">{t("Aportacions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtrades.map((e) => (
                <tr key={e.id} onClick={() => setFitxa(e.id)} className={e.actiu ? '' : 'com-inactiu'}>
                  <td>
                    <strong>{e.nom}</strong>
                    {!e.actiu && <span className="petit apagat"> · {t("inactiva")}</span>}
                  </td>
                  <td>{TIPUS_ENTITAT[e.tipus]}</td>
                  <td className="opcional">
                    {e.persona_contacte ?? ''}
                    {(e.telefon || e.email) && <div className="petit apagat">{[e.telefon, e.email].filter(Boolean).join(' · ')}</div>}
                  </td>
                  <td className="num">{e.activitats || ''}</td>
                  <td className="num">{e.convenis_vigents || ''}</td>
                  <td className="num opcional">{e.aportacions_cents ? euros(e.aportacions_cents) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fitxa !== null && (
        <Fitxa
          id={fitxa}
          onClose={() => setFitxa(null)}
          onCanvi={reload}
          onEdita={(e) => {
            setFitxa(null);
            setEditant(e);
          }}
        />
      )}
      {editant && (
        <FormEntitat
          e={editant === 'nova' ? null : editant}
          onClose={() => setEditant(null)}
          onFet={(id) => {
            setEditant(null);
            reload();
            if (id) setFitxa(id);
          }}
        />
      )}
    </>
  );
}

function Fitxa({ id, onClose, onCanvi, onEdita }: { id: number; onClose: () => void; onCanvi: () => void; onEdita: (e: FitxaEntitat) => void }) {
  const { pot } = useEntitat();
  const potEditar = pot('socis');
  const { data: e, error, reload } = useApi<FitxaEntitat>(`/comunitat/entitats/${id}`);
  const { data: activitats } = useApi<ActivitatBreu[]>(potEditar ? '/comunitat/activitats' : null);
  const [nova, setNova] = useState({ activitat_id: '', rol: 'collaborador' as RolActivitat, notes: '' });
  const [conveni, setConveni] = useState<Conveni | 'nou' | null>(null);
  const [veient, setVeient] = useState<{ document: string; nom: string | null } | null>(null);
  const canvia = () => {
    reload();
    onCanvi();
  };

  async function vincula(ev: FormEvent) {
    ev.preventDefault();
    try {
      await api.post(`/comunitat/entitats/${id}/activitats`, nova);
      setNova({ activitat_id: '', rol: nova.rol, notes: '' });
      canvia();
    } catch (err) {
      avisaError(err);
    }
  }
  async function desvincula(activitatId: number) {
    try {
      await api.del(`/comunitat/entitats/${id}/activitats/${activitatId}`);
      canvia();
    } catch (err) {
      avisaError(err);
    }
  }
  async function obreConveni(c: Conveni) {
    try {
      setConveni(await api.get<Conveni>(`/comunitat/convenis/${c.id}`));
    } catch (err) {
      avisaError(err);
    }
  }
  async function elimina() {
    if (!e || !(await confirma(t("Vols eliminar {0}? També se'n trauran les col·laboracions a les activitats.", e.nom)))) return;
    try {
      await api.del(`/comunitat/entitats/${id}`);
      avisa(t("Entitat eliminada."));
      onCanvi();
      onClose();
    } catch (err) {
      avisaError(err);
    }
  }

  const jaVinculades = new Set(e?.llista_activitats.map((a) => a.activitat_id));
  return (
    <Modal titol={e?.nom ?? t("Entitat")} onClose={onClose} ample>
      {!e ? (
        <Carregant error={error} />
      ) : (
        <div className="com-fitxa">
          {potEditar && (
            <div className="barra-accions">
              <button className="boto boto-secundari boto-petit" onClick={() => onEdita(e)}>
                {t("Edita")}
              </button>
              <button className="boto boto-secundari boto-petit" onClick={() => setConveni('nou')}>
                {t("+ Conveni")}
              </button>
              <span className="espai" />
              <button className="boto boto-perill boto-petit" onClick={elimina}>
                {t("Elimina")}
              </button>
            </div>
          )}
          <section className="xifres xifres-petites">
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Activitats")}</span>
              <span className="xifra-valor">{e.activitats}</span>
              <span className="xifra-nota">{e.darrera_activitat ? t("darrera: {0}", data(e.darrera_activitat)) : t("cap encara")}</span>
            </div>
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Convenis")}</span>
              <span className="xifra-valor">{e.convenis}</span>
              <span className="xifra-nota">{t("{0} vigents", e.convenis_vigents)}</span>
            </div>
            <div className="xifra">
              <span className="xifra-etiqueta">{t("Aportacions")}</span>
              <span className="xifra-valor">{euros(e.aportacions_cents)}</span>
              <span className="xifra-nota">{t("dels convenis signats")}</span>
            </div>
          </section>

          <dl className="com-dades">
            <dt>{t("Tipus")}</dt>
            <dd>{TIPUS_ENTITAT[e.tipus]}</dd>
            {e.nif && (
              <>
                <dt>{t("NIF")}</dt>
                <dd>{e.nif}</dd>
              </>
            )}
            {e.persona_contacte && (
              <>
                <dt>{t("Contacte")}</dt>
                <dd>
                  {e.persona_contacte}
                  {e.carrec && <span className="apagat"> · {e.carrec}</span>}
                </dd>
              </>
            )}
            {(e.telefon || e.email) && (
              <>
                <dt>{t("Telèfon i correu")}</dt>
                <dd>{[e.telefon, e.email].filter(Boolean).join(' · ')}</dd>
              </>
            )}
            {e.adreca && (
              <>
                <dt>{t("Adreça")}</dt>
                <dd>{e.adreca}</dd>
              </>
            )}
            {e.web && (
              <>
                <dt>{t("Web")}</dt>
                <dd>
                  <a href={e.web} target="_blank" rel="noreferrer">
                    {e.web}
                  </a>
                </dd>
              </>
            )}
            {e.notes && (
              <>
                <dt>{t("Notes")}</dt>
                <dd>{e.notes}</dd>
              </>
            )}
          </dl>

          <h3>{t("Convenis")}</h3>
          {e.llista_convenis.length === 0 ? (
            <p className="apagat">{t("Cap conveni amb aquesta entitat.")}</p>
          ) : (
            <table className="taula taula-compacta taula-clicable">
              <tbody>
                {e.llista_convenis.map((c) => (
                  <tr key={c.id} onClick={() => obreConveni(c)}>
                    <td>{c.titol}</td>
                    <td className="nowrap">{vigencia(c)}</td>
                    <td className="num">{c.import_cents ? euros(c.import_cents) : ''}</td>
                    <td>
                      <EstatConveniInsignia c={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>{t("Activitats en què ha col·laborat")}</h3>
          {e.per_any.length > 1 && <p className="petit apagat">{e.per_any.map((a) => t("{0}: {1}", a.any, a.activitats)).join(' · ')}</p>}
          {e.llista_activitats.length === 0 ? (
            <p className="apagat">{t("Encara no consta en cap activitat.")}</p>
          ) : (
            <table className="taula taula-compacta">
              <tbody>
                {e.llista_activitats.map((a) => (
                  <tr key={a.activitat_id}>
                    <td className="nowrap">{data(a.data_inici)}</td>
                    <td>
                      {a.nom}
                      {a.notes && <span className="apagat"> · {a.notes}</span>}
                    </td>
                    <td>{ROLS_ACTIVITAT[a.rol]}</td>
                    {potEditar && (
                      <td className="num">
                        <button className="boto-icona" onClick={() => desvincula(a.activitat_id)} aria-label={t("Treu")} title={t("Treu")}>
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {potEditar && (
            <form className="com-vincula" onSubmit={vincula}>
              <select value={nova.activitat_id} onChange={(ev) => setNova({ ...nova, activitat_id: ev.target.value })} required aria-label={t("Activitat")}>
                <option value="">{t("Afegeix una activitat…")}</option>
                {activitats
                  ?.filter((a) => !jaVinculades.has(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {data(a.data_inici)} · {a.nom}
                    </option>
                  ))}
              </select>
              <select value={nova.rol} onChange={(ev) => setNova({ ...nova, rol: ev.target.value as RolActivitat })} aria-label={t("Rol")}>
                {Object.entries(ROLS_ACTIVITAT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input value={nova.notes} onChange={(ev) => setNova({ ...nova, notes: ev.target.value })} placeholder={t("Detall (opcional)")} aria-label={t("Detall")} />
              <button className="boto boto-petit">{t("Afegeix")}</button>
            </form>
          )}
        </div>
      )}
      {conveni && (
        <FormConveni
          c={conveni === 'nou' ? null : conveni}
          entitatId={id}
          potEditar={potEditar}
          onVeure={(d, n) => setVeient({ document: d, nom: n })}
          onClose={() => setConveni(null)}
          onFet={() => {
            setConveni(null);
            canvia();
          }}
        />
      )}
      {veient && <VisorDocument document={veient.document} nom={veient.nom} onClose={() => setVeient(null)} />}
    </Modal>
  );
}

function FormEntitat({ e, onClose, onFet }: { e: Entitat | null; onClose: () => void; onFet: (id: number | null) => void }) {
  const [f, setF] = useState({
    nom: e?.nom ?? '',
    tipus: (e?.tipus ?? 'entitat') as TipusEntitat,
    nif: e?.nif ?? '',
    persona_contacte: e?.persona_contacte ?? '',
    carrec: e?.carrec ?? '',
    email: e?.email ?? '',
    telefon: e?.telefon ?? '',
    adreca: e?.adreca ?? '',
    web: e?.web ?? '',
    notes: e?.notes ?? '',
    actiu: e ? Boolean(e.actiu) : true,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value } as typeof f);

  async function envia(ev: FormEvent) {
    ev.preventDefault();
    try {
      const r = e ? await api.put<FitxaEntitat>(`/comunitat/entitats/${e.id}`, f) : await api.post<FitxaEntitat>('/comunitat/entitats', f);
      avisa(t("Entitat desada."));
      onFet(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={e ? t("Edita l'entitat") : t("Nova entitat col·laboradora")} onClose={onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Nom")} ample>
          <input value={f.nom} onChange={set('nom')} required />
        </Camp>
        <Camp etiqueta={t("Tipus")}>
          <select value={f.tipus} onChange={set('tipus')}>
            {Object.entries(TIPUS_ENTITAT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("NIF")}>
          <input value={f.nif} onChange={set('nif')} />
        </Camp>
        <Camp etiqueta={t("Persona de contacte")}>
          <input value={f.persona_contacte} onChange={set('persona_contacte')} />
        </Camp>
        <Camp etiqueta={t("Càrrec")}>
          <input value={f.carrec} onChange={set('carrec')} />
        </Camp>
        <Camp etiqueta={t("Correu electrònic")}>
          <input type="email" value={f.email} onChange={set('email')} />
        </Camp>
        <Camp etiqueta={t("Telèfon")}>
          <input value={f.telefon} onChange={set('telefon')} />
        </Camp>
        <Camp etiqueta={t("Adreça")} ample>
          <input value={f.adreca} onChange={set('adreca')} />
        </Camp>
        <Camp etiqueta={t("Web")} ample>
          <input type="url" value={f.web} onChange={set('web')} placeholder="https://" />
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={3} value={f.notes} onChange={set('notes')} />
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.actiu} onChange={(ev) => setF({ ...f, actiu: ev.target.checked })} />
          {t("Col·laboració activa")}
        </label>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}
