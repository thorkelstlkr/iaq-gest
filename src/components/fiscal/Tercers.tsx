// Tercers: proveïdors, professionals, artistes i arrendadors amb qui l'entitat té operacions.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma, useExercici } from '../ui';
import { euros } from '../../format';
import { t } from '../../i18n';
import type { ClientFacturacio, Tercer } from './tipus';

const PROVINCIES: Record<string, string> = {
  '01': 'Araba/Álava', '02': 'Albacete', '03': 'Alacant', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz', '07': 'Illes Balears',
  '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castelló', '13': 'Ciudad Real', '14': 'Córdoba',
  '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa', '21': 'Huelva',
  '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga',
  '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra',
  '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria',
  '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo', '46': 'València', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora',
  '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

/** Província a partir del codi postal (dues primeres xifres), com fa el servidor. */
export function provincia(cp: string | null | undefined, pais = 'ES') {
  if (!cp || pais !== 'ES' || !/^\d{5}$/.test(cp.trim())) return null;
  const codi = cp.trim().slice(0, 2);
  return PROVINCIES[codi] ? { codi, nom: PROVINCIES[codi] } : null;
}

export function Tercers() {
  const [exercici] = useExercici();
  const { data: tercers, error, reload } = useApi<Tercer[]>(`/fiscal/tercers?exercici=${exercici}`);
  const [editant, setEditant] = useState<Tercer | 'nou' | null>(null);
  const [filtre, setFiltre] = useState('');

  async function importaClients() {
    try {
      const r = await api.post<{ creats: number; vinculats: number; nif_dubtosos: number }>('/fiscal/tercers/importa-clients');
      if (!r.creats && !r.vinculats) avisa(t("Tots els clients de facturació ja tenen un tercer."));
      else avisa(t("Tercers creats: {0}. Clients vinculats a un tercer existent: {1}.", r.creats, r.vinculats));
      if (r.nif_dubtosos) avisa(t("{0} clients tenen un NIF que no sembla vàlid: reviseu-los.", r.nif_dubtosos), 'error');
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  if (!tercers) return <Carregant error={error} />;
  const q = filtre.trim().toLowerCase();
  const llista = q ? tercers.filter((x) => `${x.nom} ${x.nif ?? ''} ${x.poblacio ?? ''}`.toLowerCase().includes(q)) : tercers;

  return (
    <>
      <div className="barra-accions fiscal-barra">
        <input
          type="search"
          placeholder={t("Cerca per nom, NIF o població")}
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          aria-label={t("Cerca tercers")}
        />
        <span className="espai" />
        <button type="button" className="boto boto-secundari" onClick={importaClients}>
          {t("Importa des dels clients de facturació")}
        </button>
        <button type="button" className="boto" onClick={() => setEditant('nou')}>
          {t("Nou tercer")}
        </button>
      </div>
      {tercers.length === 0 ? (
        <Buit>
          {t("Encara no hi ha tercers. Afegiu-hi els professionals, artistes, arrendadors i proveïdors als quals pagueu, o importeu els clients de facturació.")}
        </Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Nom")}</th>
                <th>{t("NIF")}</th>
                <th>{t("Població")}</th>
                <th>{t("Client de facturació")}</th>
                <th className="num">{t("Pagaments {0}", exercici)}</th>
                <th className="num">{t("Pagat {0}", exercici)}</th>
                <th className="num">{t("Retencions {0}", exercici)}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((x) => (
                <tr key={x.id} onClick={() => setEditant(x)}>
                  <td>
                    {x.nom}
                    <div className="petit apagat">{x.tipus_persona === 'juridica' ? t("Persona jurídica") : t("Persona física")}</div>
                  </td>
                  <td className="nowrap">{x.nif ?? <span className="fiscal-falta">{t("Sense NIF")}</span>}</td>
                  <td>
                    {x.poblacio ?? '—'}
                    {x.codi_provincia && <span className="petit apagat"> ({x.codi_provincia})</span>}
                  </td>
                  <td>{x.client_nom ?? '—'}</td>
                  <td className="num">{x.moviments || '—'}</td>
                  <td className="num">{x.pagat_cents ? euros(x.pagat_cents) : '—'}</td>
                  <td className="num">{x.retencio_cents ? euros(x.retencio_cents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormulariTercer
          tercer={editant === 'nou' ? null : editant}
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

export function FormulariTercer(props: { tercer: Tercer | null; onClose: () => void; onFet: (id: number) => void }) {
  const x = props.tercer;
  const { data: clients } = useApi<ClientFacturacio[]>('/fiscal/clients');
  const [f, setF] = useState({
    nom: x?.nom ?? '',
    nif: x?.nif ?? '',
    tipus_persona: x?.tipus_persona ?? 'fisica',
    adreca: x?.adreca ?? '',
    codi_postal: x?.codi_postal ?? '',
    poblacio: x?.poblacio ?? '',
    pais: x?.pais ?? 'ES',
    email: x?.email ?? '',
    telefon: x?.telefon ?? '',
    iban: x?.iban ?? '',
    notes: x?.notes ?? '',
    client_id: x?.client_id ? String(x.client_id) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const canvia = (camp: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [camp]: e.target.value });
  const prov = provincia(f.codi_postal, f.pais.toUpperCase());

  async function envia(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cos = { ...f, client_id: f.client_id ? Number(f.client_id) : null };
    try {
      if (x) {
        await api.put(`/fiscal/tercers/${x.id}`, cos);
        avisa(t("Tercer desat."));
        props.onFet(x.id);
      } else {
        const r = await api.post<{ id: number }>('/fiscal/tercers', cos);
        avisa(t("Tercer creat."));
        props.onFet(r.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!x || !(await confirma(t("Eliminar el tercer {0}?", x.nom)))) return;
    try {
      await api.del(`/fiscal/tercers/${x.id}`);
      avisa(t("Tercer eliminat."));
      props.onFet(x.id);
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={x ? x.nom : t("Nou tercer")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Nom o raó social")} ample>
          <input value={f.nom} onChange={canvia('nom')} required autoFocus />
        </Camp>
        <Camp etiqueta={t("NIF")} ajuda={f.pais.toUpperCase() === 'ES' ? t("Es comprova la lletra o xifra de control.") : t("Número d'identificació fiscal del país.")}>
          <input value={f.nif} onChange={canvia('nif')} />
        </Camp>
        <Camp etiqueta={t("Tipus de persona")}>
          <select value={f.tipus_persona} onChange={canvia('tipus_persona')}>
            <option value="fisica">{t("Persona física")}</option>
            <option value="juridica">{t("Persona jurídica o entitat")}</option>
          </select>
        </Camp>
        <Camp etiqueta={t("Adreça")} ample>
          <input value={f.adreca} onChange={canvia('adreca')} />
        </Camp>
        <Camp etiqueta={t("Codi postal")} ajuda={prov ? t("Província: {0} ({1})", prov.nom, prov.codi) : undefined}>
          <input value={f.codi_postal} onChange={canvia('codi_postal')} inputMode="numeric" />
        </Camp>
        <Camp etiqueta={t("Població")}>
          <input value={f.poblacio} onChange={canvia('poblacio')} />
        </Camp>
        <Camp etiqueta={t("País")} ajuda={t("Codi de dues lletres (ES, FR, DE…).")}>
          <input value={f.pais} onChange={canvia('pais')} maxLength={2} />
        </Camp>
        <Camp etiqueta={t("Correu electrònic")}>
          <input type="email" value={f.email} onChange={canvia('email')} />
        </Camp>
        <Camp etiqueta={t("Telèfon")}>
          <input value={f.telefon} onChange={canvia('telefon')} />
        </Camp>
        <Camp etiqueta="IBAN">
          <input value={f.iban} onChange={canvia('iban')} />
        </Camp>
        <Camp etiqueta={t("Client de facturació")} ajuda={t("Les factures emeses a aquest client compten per al model 347 del tercer.")}>
          <select value={f.client_id} onChange={canvia('client_id')}>
            <option value="">{t("— Cap —")}</option>
            {clients
              ?.filter((c) => !c.tercer_id || c.tercer_id === x?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                  {c.nif ? ` (${c.nif})` : ''}
                </option>
              ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea value={f.notes} onChange={canvia('notes')} rows={2} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {x && (
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
