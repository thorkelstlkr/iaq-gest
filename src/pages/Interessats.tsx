import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import { avui, data, nomComplet } from '../format';
import type { EstatInteressat, Interessat } from '../../shared/types';
import { t } from '../i18n';

const ESTATS: Record<EstatInteressat, string> = {
  nou: t("Nou"),
  contactat: t("Contactat"),
  convertit: t("Ja és soci"),
  descartat: t("Descartat"),
};

export default function Interessats() {
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState('oberts');
  const { data: llista, error, reload } = useApi<Interessat[]>(`/crm/interessats?estat=${filtre}`);
  const [editant, setEditant] = useState<Partial<Interessat> | null>(null);

  async function converteix(i: Interessat) {
    if (!(await confirma(t("Donar d'alta {0} com a soci? Després podràs completar la fitxa.", nomComplet(i))))) return;
    try {
      const r = await api.post<{ soci_id: number }>(`/crm/interessats/${i.id}/convertir`);
      avisa(t("Alta feta. Completa ara la fitxa del soci."));
      navigate(`/socis/${r.soci_id}`);
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <Capcalera titol={t("Persones interessades")} subtitol={t("Gent que s'ha interessat per l'entitat i encara no n'és sòcia")}>
        <button className="boto" onClick={() => setEditant({ estat: 'nou', data: avui() })}>
          {t("+ Nova persona")}
        </button>
      </Capcalera>

      <div className="filtres">
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label={t("Estat")}>
          <option value="oberts">{t("Pendents de seguiment")}</option>
          <option value="tots">{t("Totes")}</option>
        </select>
      </div>

      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>
          {t("No hi ha ningú pendent. Quan algú pregunti per l'entitat (en una activitat, per xarxes, pel carrer…), apunta'l aquí per fer-ne el seguiment.")}
        </Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Nom")}</th>
                <th className="opcional">{t("Contacte")}</th>
                <th>{t("Interessos")}</th>
                <th>{t("Estat")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {llista.map((i) => (
                <tr key={i.id} onClick={() => setEditant(i)}>
                  <td className="nowrap">{data(i.data)}</td>
                  <td>
                    <strong>{nomComplet(i)}</strong>
                    {i.origen && <div className="apagat petit">{t("Via:")} {i.origen}</div>}
                  </td>
                  <td className="opcional">{[i.telefon, i.email].filter(Boolean).join(' · ')}</td>
                  <td>{i.interessos}</td>
                  <td>
                    <span className={`insignia insignia-int-${i.estat}`}>{ESTATS[i.estat]}</span>
                  </td>
                  <td className="accions-fila">
                    {i.estat === 'convertit' && i.soci_id ? (
                      <button
                        className="boto boto-petit boto-secundari"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/socis/${i.soci_id}`);
                        }}
                      >
                        {t("Fitxa")}
                      </button>
                    ) : i.estat !== 'descartat' ? (
                      <button
                        className="boto boto-petit"
                        onClick={(e) => {
                          e.stopPropagation();
                          converteix(i);
                        }}
                      >
                        {t("Fes-lo soci")}
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
        <FormInteressat
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function FormInteressat(props: { inicial: Partial<Interessat>; onClose: () => void; onFet: () => void }) {
  const i = props.inicial;
  const [f, setF] = useState({
    nom: i.nom ?? '',
    llinatges: i.llinatges ?? '',
    telefon: i.telefon ?? '',
    email: i.email ?? '',
    origen: i.origen ?? '',
    interessos: i.interessos ?? '',
    estat: i.estat ?? 'nou',
    notes: i.notes ?? '',
    data: i.data ?? avui(),
    consentiment: Boolean((i as Interessat & { consentiment?: number }).consentiment),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (i.id) await api.put(`/crm/interessats/${i.id}`, f);
      else await api.post('/crm/interessats', f);
      avisa(t("Desat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta persona de la llista?")))) return;
    try {
      await api.del(`/crm/interessats/${i.id}`);
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={i.id ? t("Persona interessada") : t("Nova persona interessada")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Nom")}>
          <input id="int-nom" value={f.nom} onChange={set('nom')} required autoFocus />
        </Camp>
        <Camp etiqueta={t("Llinatges")}>
          <input id="int-llinatges" value={f.llinatges} onChange={set('llinatges')} />
        </Camp>
        <Camp etiqueta={t("Telèfon")}>
          <input id="int-telefon" type="tel" value={f.telefon} onChange={set('telefon')} />
        </Camp>
        <Camp etiqueta={t("Correu electrònic")}>
          <input id="int-email" type="email" value={f.email} onChange={set('email')} />
        </Camp>
        <Camp etiqueta={t("Com ens ha conegut")} ajuda={t("Activitat, xarxes, un altre soci…")}>
          <input id="int-origen" value={f.origen} onChange={set('origen')} />
        </Camp>
        <Camp etiqueta={t("Data")}>
          <input id="int-data" type="date" value={f.data} onChange={set('data')} />
        </Camp>
        <Camp etiqueta={t("Interessos")} ample>
          <input id="int-interessos" value={f.interessos} onChange={set('interessos')} placeholder={t("p. ex. música tradicional, cuina, fotografia")} />
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select id="int-estat" value={f.estat} onChange={set('estat')} disabled={f.estat === 'convertit'}>
            <option value="nou">{t("Nou")}</option>
            <option value="contactat">{t("Contactat")}</option>
            <option value="descartat">{t("Descartat")}</option>
            {f.estat === 'convertit' && <option value="convertit">{t("Ja és soci")}</option>}
          </select>
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.consentiment} onChange={(e) => setF({ ...f, consentiment: e.target.checked })} />
          {t("Ha donat el consentiment perquè guardem les seves dades i la contactem (s'ha d'informar de la clàusula de protecció de dades)")}
        </label>
        <Camp etiqueta={t("Notes")} ample>
          <textarea id="int-notes" rows={3} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {i.id && (
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
