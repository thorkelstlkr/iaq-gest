import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { api, useApi } from '../../api';
import { Carregant } from '../ui';
import { useEntitat } from '../../entitat';
import { DEMO } from '../../mode';
import { avui, data } from '../../format';
import type { ConfigRgpd } from '../Rgpd';
import type { Config } from '../../../shared/types';
import { t } from '../../i18n';
import type { ActivitatPlena, Participant } from './tipus';

/**
 * Imprimeix només el document indicat. Es fa amb una còpia a l'arrel de la pàgina (i no dins la finestra modal,
 * que és fixa i es repetiria a cada full).
 */
function useImpressio() {
  const [document_, setDocument] = useState<ReactNode | null>(null);
  useEffect(() => {
    if (!document_) return;
    document.body.classList.add('imprimint-activitat');
    const acaba = () => {
      document.body.classList.remove('imprimint-activitat');
      setDocument(null);
    };
    window.addEventListener('afterprint', acaba, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', acaba);
  }, [document_]);
  const portal = document_ ? createPortal(<div className="act-impressio document">{document_}</div>, document.body) : null;
  return { imprimeix: (d: ReactNode) => setDocument(d), portal };
}

const rangDates = (a: ActivitatPlena) =>
  a.data_fi && a.data_fi !== a.data_inici ? t("del {0} al {1}", data(a.data_inici), data(a.data_fi)) : data(a.data_inici);

function CapEntitat({ config, titol }: { config: Config | null; titol: string }) {
  return (
    <header className="document-cap">
      <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
      <p className="apagat petit">{[config?.nif && t("NIF {0}", config.nif), config?.adreca].filter(Boolean).join(' · ')}</p>
      <h2>{titol}</h2>
    </header>
  );
}

/** Full de signatures per passar llista en paper. */
export function FullSignatures({ activitat, llista, config, filesBuides = 8 }: { activitat: ActivitatPlena; llista: Participant[]; config: Config | null; filesBuides?: number }) {
  const persones = llista
    .filter((p) => p.estat === 'inscrit')
    .sort((a, b) => a.nom.localeCompare(b.nom));
  return (
    <div className="act-full-signatures">
      <CapEntitat config={config} titol={t("Full d'assistència")} />
      <p>
        <strong>{activitat.nom}</strong> — {rangDates(activitat)}
        {activitat.lloc && `, ${activitat.lloc}`}
        {activitat.responsable_nom && ` · ${t("Responsable: {0}", activitat.responsable_nom)}`}
      </p>
      <table className="act-taula-signatures">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>{t("Nom i llinatges")}</th>
            <th className="num">{t("Edat")}</th>
            <th>{t("Imatge")}</th>
            <th className="act-col-signatura">{t("Signatura")}</th>
          </tr>
        </thead>
        <tbody>
          {persones.map((p, i) => (
            <tr key={p.id}>
              <td className="num">{i + 1}</td>
              <td>
                {p.nom}
                {p.menor && p.tutor && <div className="petit apagat">{t("tutor/a: {0}", p.tutor)}</div>}
              </td>
              <td className="num">{p.edat ?? ''}</td>
              <td>{p.drets_imatge ? t("Sí") : <strong>{t("NO")}</strong>}</td>
              <td />
            </tr>
          ))}
          {Array.from({ length: filesBuides }, (_, i) => (
            <tr key={`b${i}`}>
              <td className="num">{persones.length + i + 1}</td>
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="petit">
        {t("«Imatge: NO» vol dir que no es poden publicar fotos ni vídeos on aparegui aquesta persona.")}
      </p>
      <p>{t("Assistents sense inscripció (recompte):")} <span className="omplir" /></p>
    </div>
  );
}

const Casella = ({ marcada }: { marcada?: boolean }) => <span className="casella-paper">{marcada ? '✕' : ''}</span>;

/** Autorització del pare, la mare o el tutor legal perquè un menor participi en l'activitat (i ús de la imatge). */
export function AutoritzacioMenor({ activitat, p, config, rgpd }: { activitat: ActivitatPlena; p: Participant | null; config: Config | null; rgpd: ConfigRgpd | null }) {
  const v = (x: string | null | undefined) => <span className="omplir">{x ?? ''}</span>;
  const entitat = config?.nom_complet || config?.nom || '';
  return (
    <div className="act-autoritzacio">
      <CapEntitat config={config} titol={t("Autorització per a la participació de menors")} />
      <h3>{t("Activitat")}</h3>
      <div className="camps-paper">
        <p><strong>{activitat.nom}</strong></p>
        <p>{t("Data:")} {rangDates(activitat)} {activitat.lloc && <>&nbsp; {t("Lloc:")} {activitat.lloc}</>}</p>
        {activitat.responsable_nom && <p>{t("Persona responsable:")} {activitat.responsable_nom}</p>}
      </div>
      <h3>{t("Dades del menor")}</h3>
      <div className="camps-paper">
        <p>{t("Nom i llinatges:")} {v(p?.nom)}</p>
        <p>{t('Data de naixement:')} {v(data(p?.data_naixement))}</p>
      </div>
      <h3>{t("Dades del pare, la mare o el tutor/a legal")}</h3>
      <div className="camps-paper">
        <p>{t("Nom i llinatges:")} {v(p?.tutor)} &nbsp; {t('DNI:')} {v('')}</p>
        <p>{t("Telèfon de contacte:")} {v(p?.tutor_telefon ?? (p?.tipus === 'extern' ? p.telefon : null))}</p>
      </div>
      <p className="consentiment">
        <Casella /> {t("Autoritzo el/la menor a participar en aquesta activitat organitzada per {0} i declaro que no té cap circumstància que ho impedeixi (o l'he comunicada a l'organització).", entitat)}
      </p>
      <p className="consentiment">
        <Casella marcada={p ? Boolean(p.drets_imatge_consta && p.drets_imatge) : false} /> {t("Autoritzo l'ús de la imatge del menor en fotografies i vídeos d'aquesta activitat, per difondre-les al web, a les xarxes socials i en publicacions de l'entitat.")}
      </p>
      <table className="clausula">
        <tbody>
          <tr>
            <th>{t("Responsable")}</th>
            <td>
              {entitat}
              {config?.nif && t(", NIF {0}", config.nif)}
              {t(". Contacte:")} {rgpd?.rgpd_contacte || config?.email || '—'}.
            </td>
          </tr>
          <tr>
            <th>{t("Finalitat")}</th>
            <td>{t("Gestionar la inscripció i la participació del menor en l'activitat i, si s'autoritza, difondre'n imatges.")}</td>
          </tr>
          <tr>
            <th>{t("Legitimació")}</th>
            <td>{t("El consentiment del pare, la mare o el tutor/a legal (art. 6.1.a RGPD i art. 7 de la Llei orgànica 3/2018), que es pot retirar en qualsevol moment.")}</td>
          </tr>
          <tr>
            <th>{t("Drets")}</th>
            <td>
              {t("Accés, rectificació, supressió, oposició, limitació del tractament i portabilitat, adreçant-se a")}{' '}
              {rgpd?.rgpd_contacte || config?.email || entitat}{t(". També es pot presentar una reclamació davant l'Agència Espanyola de Protecció de Dades (www.aepd.es).")}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="signatures">
        <div>
          <span>{t("Signatura del pare, la mare o el tutor/a legal")}</span>
        </div>
        <div>
          <span>{t("Lloc i data")}</span>
        </div>
      </div>
    </div>
  );
}

/** Pestanya de documents imprimibles d'una activitat. */
export function DocumentsActivitat({ activitat }: { activitat: ActivitatPlena }) {
  const { config } = useEntitat();
  const { data: llista, error } = useApi<Participant[]>(`/crm/activitats/${activitat.id}/participants`);
  const [rgpd, setRgpd] = useState<ConfigRgpd | null>(null);
  useEffect(() => {
    api.get<ConfigRgpd>('/rgpd/config').then(setRgpd, () => setRgpd(null));
  }, []);
  const { imprimeix, portal } = useImpressio();
  const [vista, setVista] = useState<'signatures' | 'autoritzacions'>('signatures');
  if (!llista) return <Carregant error={error} />;
  const menors = llista.filter((p) => p.menor && p.estat !== 'cancel·lat');

  const signatures = <FullSignatures activitat={activitat} llista={llista} config={config} />;
  const autoritzacions = (
    <>
      {(menors.length ? menors : [null]).map((p, i) => (
        <div key={p?.id ?? 'buit'} className={i > 0 ? 'act-salt-pagina' : ''}>
          <AutoritzacioMenor activitat={activitat} p={p} config={config} rgpd={rgpd} />
        </div>
      ))}
    </>
  );

  return (
    <div className="act-panell">
      <div className="act-modes" role="tablist">
        <button type="button" role="tab" aria-selected={vista === 'signatures'} className={vista === 'signatures' ? 'actiu' : ''} onClick={() => setVista('signatures')}>
          {t("Full d'assistència")}
        </button>
        <button type="button" role="tab" aria-selected={vista === 'autoritzacions'} className={vista === 'autoritzacions' ? 'actiu' : ''} onClick={() => setVista('autoritzacions')}>
          {t("Autoritzacions de menors ({0})", menors.length)}
        </button>
      </div>
      {!DEMO && (
        <div className="barra-accions">
          <button type="button" className="boto boto-secundari" onClick={() => imprimeix(vista === 'signatures' ? signatures : autoritzacions)}>
            {t("Imprimeix")}
          </button>
          {vista === 'autoritzacions' && menors.length > 0 && (
            <button
              type="button"
              className="boto boto-secundari"
              onClick={() => imprimeix(<AutoritzacioMenor activitat={activitat} p={null} config={config} rgpd={rgpd} />)}
            >
              {t("Imprimeix-ne una en blanc")}
            </button>
          )}
        </div>
      )}
      {vista === 'autoritzacions' && (
        <p className="apagat petit">
          {menors.length
            ? t("Un full per a cada menor inscrit, amb les dades ja emplenades. Quan el tornin signat, anota'n la data a la inscripció.")
            : t("No hi ha menors inscrits: aquí tens el model en blanc.")}
        </p>
      )}
      <div className="document act-previsualitzacio">{vista === 'signatures' ? signatures : autoritzacions}</div>
      <p className="apagat petit">{t("Document generat el")} {data(avui())}.</p>
      {portal}
    </div>
  );
}
