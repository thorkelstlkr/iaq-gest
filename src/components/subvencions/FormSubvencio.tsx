// Formulari d'alta i edició d'una subvenció.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Camp, Modal, avisa, confirma } from '../ui';
import { centsAText, data, textACents } from '../../format';
import { t } from '../../i18n';
import type { Activitat } from '../../../shared/types';
import { ESTATS } from './tipus';
import type { Subvencio } from './tipus';

const ORGANISMES = ['Ajuntament de Pollença', 'Consell de Mallorca', 'Govern de les Illes Balears', 'Ministeri de Cultura'];

export function FormSubvencio(props: { inicial: Partial<Subvencio>; onClose: () => void; onFet: (s: Subvencio | null) => void }) {
  const s = props.inicial;
  const { data: activitats } = useApi<Activitat[]>('/activitats?exercici=totes');
  const [f, setF] = useState({
    organisme: s.organisme ?? '',
    convocatoria: s.convocatoria ?? '',
    linia: s.linia ?? '',
    expedient: s.expedient ?? '',
    exercici: String(s.exercici ?? new Date().getFullYear()),
    import_sollicitat: s.import_sollicitat_cents ? centsAText(s.import_sollicitat_cents) : '',
    import_concedit: s.import_concedit_cents != null ? centsAText(s.import_concedit_cents) : '',
    pressupost_projecte: s.pressupost_projecte_cents != null ? centsAText(s.pressupost_projecte_cents) : '',
    data_sollicitud: s.data_sollicitud ?? '',
    data_resolucio: s.data_resolucio ?? '',
    periode_inici: s.periode_inici ?? '',
    periode_fi: s.periode_fi ?? '',
    termini_justificacio: s.termini_justificacio ?? '',
    activitat_id: s.activitat_id ? String(s.activitat_id) : '',
    estat: s.estat ?? 'preparacio',
    requisits: s.requisits ?? '',
    notes: s.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cents = (v: string) => (v.trim() === '' ? null : textACents(v));
    const cos = {
      ...f,
      import_sollicitat_cents: cents(f.import_sollicitat) ?? 0,
      import_concedit_cents: cents(f.import_concedit),
      pressupost_projecte_cents: cents(f.pressupost_projecte),
    };
    try {
      const r = s.id ? await api.put<Subvencio>(`/subvencions/${s.id}`, cos) : await api.post<Subvencio>('/subvencions', cos);
      avisa(s.id ? t("Subvenció actualitzada.") : t("Subvenció registrada."));
      props.onFet(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta subvenció? Els cobraments quedaran desvinculats i s'esborraran les despeses imputades (no els moviments).")))) return;
    try {
      await api.del(`/subvencions/${s.id}`);
      avisa(t("Subvenció eliminada."));
      props.onFet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={s.id ? t("Edita la subvenció") : t("Nova subvenció")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Organisme")}>
          <input value={f.organisme} onChange={set('organisme')} list="subv-organismes" required autoFocus />
          <datalist id="subv-organismes">
            {ORGANISMES.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select value={f.estat} onChange={set('estat')}>
            {ESTATS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.text}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Convocatòria")} ample>
          <input value={f.convocatoria} onChange={set('convocatoria')} />
        </Camp>
        <Camp etiqueta={t("Línia o programa")}>
          <input value={f.linia} onChange={set('linia')} />
        </Camp>
        <Camp etiqueta={t("Núm. d'expedient")}>
          <input value={f.expedient} onChange={set('expedient')} />
        </Camp>
        <Camp etiqueta={t("Exercici")}>
          <input type="number" min={2000} max={2100} value={f.exercici} onChange={set('exercici')} required />
        </Camp>
        <Camp etiqueta={t("Activitat o projecte (opcional)")}>
          <select value={f.activitat_id} onChange={set('activitat_id')}>
            <option value="">—</option>
            {activitats?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom} ({data(a.data_inici)})
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Pressupost del projecte (€)")}>
          <input inputMode="decimal" placeholder="0,00" value={f.pressupost_projecte} onChange={set('pressupost_projecte')} />
        </Camp>
        <Camp etiqueta={t("Import sol·licitat (€)")}>
          <input inputMode="decimal" placeholder="0,00" value={f.import_sollicitat} onChange={set('import_sollicitat')} />
        </Camp>
        <Camp etiqueta={t("Import concedit (€)")}>
          <input inputMode="decimal" placeholder="0,00" value={f.import_concedit} onChange={set('import_concedit')} />
        </Camp>
        <Camp etiqueta={t("Data de sol·licitud")}>
          <input type="date" value={f.data_sollicitud} onChange={set('data_sollicitud')} />
        </Camp>
        <Camp etiqueta={t("Data de resolució")}>
          <input type="date" value={f.data_resolucio} onChange={set('data_resolucio')} />
        </Camp>
        <Camp etiqueta={t("Termini de justificació")}>
          <input type="date" value={f.termini_justificacio} onChange={set('termini_justificacio')} />
        </Camp>
        <Camp etiqueta={t("Inici del període d'execució")}>
          <input type="date" value={f.periode_inici} onChange={set('periode_inici')} />
        </Camp>
        <Camp etiqueta={t("Fi del període d'execució")}>
          <input type="date" value={f.periode_fi} onChange={set('periode_fi')} />
        </Camp>
        <Camp etiqueta={t("Requisits i certificats")} ample ajuda={t("P. ex. certificats d'estar al corrent amb l'AEAT i la Seguretat Social i les seves dates.")}>
          <textarea rows={2} value={f.requisits} onChange={set('requisits')} />
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {s.id && (
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
