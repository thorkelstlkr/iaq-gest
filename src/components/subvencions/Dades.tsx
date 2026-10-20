// Pestanya «Dades» d'una subvenció: imports, dates, requisits i document de resolució.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../api';
import { avisa, avisaError, confirma } from '../ui';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import { midaText } from './fitxers';
import { TriaFitxer, VisorFitxer } from './Justificants';
import type { Fitxer, Subvencio } from './tipus';

export function Dades({ s, editable, onCanvi }: { s: Subvencio; editable: boolean; onCanvi: () => void }) {
  const [veient, setVeient] = useState<(Fitxer & { dades: string }) | null>(null);
  const concedit = s.import_concedit_cents ?? 0;

  async function obre() {
    try {
      setVeient(await api.get<Fitxer & { dades: string }>(`/subvencions/${s.id}/document`));
    } catch (e) {
      avisaError(e);
    }
  }
  async function puja(f: { nom: string; dades: string }) {
    await api.put(`/subvencions/${s.id}/document`, f);
    avisa(t("Document desat."));
    onCanvi();
  }
  async function treu() {
    if (!(await confirma(t("Eliminar el document de resolució?")))) return;
    try {
      await api.del(`/subvencions/${s.id}/document`);
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  const fila = (etiqueta: string, valor: ReactNode) =>
    valor ? (
      <>
        <dt>{etiqueta}</dt>
        <dd>{valor}</dd>
      </>
    ) : null;

  return (
    <>
      <section className="xifres xifres-petites">
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Sol·licitat")}</span>
          <span className="xifra-valor">{euros(s.import_sollicitat_cents)}</span>
          {s.pressupost_projecte_cents ? <span className="xifra-nota">{t("pressupost {0}", euros(s.pressupost_projecte_cents))}</span> : null}
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Concedit")}</span>
          <span className="xifra-valor">{s.import_concedit_cents !== null ? euros(concedit) : '—'}</span>
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Cobrat")}</span>
          <span className="xifra-valor">{euros(s.cobrat_cents)}</span>
          {concedit > s.cobrat_cents && <span className="xifra-nota">{t("pendent {0}", euros(concedit - s.cobrat_cents))}</span>}
        </div>
        <div className="xifra">
          <span className="xifra-etiqueta">{t("Despeses imputades")}</span>
          <span className="xifra-valor">{euros(s.imputat_cents)}</span>
          <span className="xifra-nota">{t("{0} despeses", s.n_imputacions)}</span>
        </div>
      </section>

      <section className="targeta">
        <dl className="subv-fitxa">
          {fila(t("Organisme"), s.organisme)}
          {fila(t("Convocatòria"), s.convocatoria)}
          {fila(t("Línia o programa"), s.linia)}
          {fila(t("Núm. d'expedient"), s.expedient)}
          {fila(t("Exercici"), s.exercici)}
          {fila(t("Activitat o projecte"), s.activitat_nom)}
          {fila(t("Data de sol·licitud"), data(s.data_sollicitud))}
          {fila(t("Data de resolució"), data(s.data_resolucio))}
          {fila(t("Període d'execució"), (s.periode_inici || s.periode_fi) && t("Del {0} al {1}", data(s.periode_inici) || '—', data(s.periode_fi) || '—'))}
          {fila(t("Termini de justificació"), data(s.termini_justificacio))}
          {fila(t("Data de justificació"), data(s.data_justificacio))}
          {fila(t("Requisits i certificats"), s.requisits && <span className="subv-pre">{s.requisits}</span>)}
          {fila(t("Notes"), s.notes && <span className="subv-pre">{s.notes}</span>)}
        </dl>
      </section>

      <section className="targeta">
        <h3 className="titol-seccio">{t("Resolució de concessió")}</h3>
        <div className="subv-barra">
          {s.document_nom ? (
            <>
              <button type="button" className="enllac" onClick={obre}>
                {s.document_nom}
              </button>
              <span className="apagat petit">{s.document_mida ? midaText(s.document_mida) : ''}</span>
            </>
          ) : (
            <span className="apagat">{t("No s'ha adjuntat el document de resolució.")}</span>
          )}
          <span className="espai" />
          {editable && <TriaFitxer text={s.document_nom ? t("Substitueix…") : t("Adjunta la resolució…")} onFitxer={puja} />}
          {editable && s.document_nom && (
            <button type="button" className="boto boto-secundari" onClick={treu}>
              {t("Elimina")}
            </button>
          )}
        </div>
      </section>
      {veient && <VisorFitxer fitxer={veient} onClose={() => setVeient(null)} />}
    </>
  );
}
