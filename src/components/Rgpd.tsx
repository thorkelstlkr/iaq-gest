import { useRef } from 'react';
import type { ReactNode } from 'react';
import { DEMO } from '../mode';
import { avui, data } from '../format';
import type { Config, Soci } from '../../shared/types';
import { t } from '../i18n';

// Documents de protecció de dades generats amb les dades de l'entitat.
// Són models orientatius: convé que la Junta els revisi (i, si cal, un professional).

export interface ConfigRgpd {
  rgpd_contacte: string;
  rgpd_conservacio_anys: string;
  rgpd_interessats_mesos: string;
  rgpd_dpd: string;
  rgpd_destinataris: string;
}

/** Bloc imprimible: el botó imprimeix només aquest document. */
export function Imprimible({ children, titolBoto = t("Imprimeix") }: { children: ReactNode; titolBoto?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function imprimeix() {
    const el = ref.current;
    if (!el) return;
    el.classList.add('document-actiu');
    document.body.classList.add('imprimint-document');
    const acaba = () => {
      el.classList.remove('document-actiu');
      document.body.classList.remove('imprimint-document');
    };
    window.addEventListener('afterprint', acaba, { once: true });
    window.print();
  }
  return (
    <div className="imprimible">
      {!DEMO && (
        <div className="barra-accions no-imprimir">
          <button type="button" className="boto boto-secundari" onClick={imprimeix}>
            {titolBoto}
          </button>
        </div>
      )}
      <div ref={ref} className="document">
        {children}
      </div>
    </div>
  );
}

function Responsable({ config, rgpd }: { config: Config | null; rgpd: ConfigRgpd | null }) {
  return (
    <>
      {config?.nom_complet || config?.nom}
      {config?.nif && t(", NIF {0}", config.nif)}
      {config?.adreca && `, ${config.adreca}`}{t(". Contacte:")} {rgpd?.rgpd_contacte || config?.email || '—'}.
      {rgpd?.rgpd_dpd && t(" Delegat de protecció de dades: {0}.", rgpd.rgpd_dpd)}
    </>
  );
}

/** Informació bàsica que cal donar a la persona en recollir-ne les dades (art. 13 RGPD i art. 11 LOPDGDD). */
export function ClausulaInformativa({ config, rgpd }: { config: Config | null; rgpd: ConfigRgpd | null }) {
  return (
    <table className="clausula">
      <tbody>
        <tr>
          <th>{t("Responsable")}</th>
          <td>
            <Responsable config={config} rgpd={rgpd} />
          </td>
        </tr>
        <tr>
          <th>{t("Finalitat")}</th>
          <td>
            {t("Gestionar la condició de soci o sòcia: altes i baixes, quotes, participació en activitats, comunicacions de l'entitat i compliment de les obligacions legals i estatutàries.")}
          </td>
        </tr>
        <tr>
          <th>{t("Legitimació")}</th>
          <td>
            {t("La relació associativa (art. 6.1.b RGPD) i el compliment d'obligacions legals (art. 6.1.c RGPD). L'ús de la imatge i l'enviament de comunicacions es basen en el consentiment (art. 6.1.a RGPD), que es pot retirar en qualsevol moment.")}
          </td>
        </tr>
        <tr>
          <th>{t("Destinataris")}</th>
          <td>
            {t("No se cedeixen dades a tercers, excepte per obligació legal")}{rgpd?.rgpd_destinataris ? ` i a: ${rgpd.rgpd_destinataris}` : ''}.
          </td>
        </tr>
        <tr>
          <th>{t("Conservació")}</th>
          <td>
            {t("Mentre duri la relació i, després de la baixa, durant")} {rgpd?.rgpd_conservacio_anys || '5'} {t("anys per atendre possibles responsabilitats legals.")}
          </td>
        </tr>
        <tr>
          <th>{t("Drets")}</th>
          <td>
            {t("Accés, rectificació, supressió, oposició, limitació del tractament i portabilitat, adreçant-se a")}{' '}
            {rgpd?.rgpd_contacte || config?.email || "l'entitat"}{t(". També es pot presentar una reclamació davant l'Agència Espanyola de Protecció de Dades (www.aepd.es).")}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const Casella = ({ marcada }: { marcada?: boolean }) => <span className="casella-paper">{marcada ? '✕' : ''}</span>;

/** Full d'inscripció amb la informació i els consentiments separats, per signar. Pot sortir en blanc o emplenat. */
export function FullInscripcio({ config, rgpd, soci }: { config: Config | null; rgpd: ConfigRgpd | null; soci?: Soci | null }) {
  const v = (x: string | null | undefined) => <span className="omplir">{x ?? ''}</span>;
  return (
    <div className="full-inscripcio">
      <header className="document-cap">
        <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
        <h2>{t("Full d'inscripció de soci/sòcia")}</h2>
      </header>
      <div className="camps-paper">
        <p>{t("Nom i llinatges:")} {v(soci ? `${soci.nom} ${soci.llinatges}` : '')}</p>
        <p>{t("DNI/NIE:")} {v(soci?.dni)} &nbsp; {t('Data de naixement:')} {v(data(soci?.data_naixement))}</p>
        <p>{t("Adreça:")} {v(soci ? [soci.adreca, soci.codi_postal, soci.poblacio].filter(Boolean).join(', ') : '')}</p>
        <p>{t("Telèfon:")} {v(soci?.telefon)} &nbsp; {t('Correu electrònic:')} {v(soci?.email)}</p>
        <p>{t("Si és menor de 14 anys, pare/mare o tutor/a legal:")} {v(soci?.tutor_legal)} &nbsp; {t('DNI:')} {v('')}</p>
      </div>
      <h3>{t("Informació sobre protecció de dades")}</h3>
      <ClausulaInformativa config={config} rgpd={rgpd} />
      <h3>{t("Consentiments (marca els que acceptes)")}</h3>
      <p className="consentiment">
        <Casella marcada={Boolean(soci?.drets_imatge)} /> {t("Autoritzo l'ús de la meva imatge (o la del menor) en fotografies i vídeos de les activitats, per difondre-les al web, a les xarxes socials i en publicacions de l'entitat.")}
      </p>
      <p className="consentiment">
        <Casella marcada={soci ? Boolean(soci.accepta_comunicacions) : false} /> {t("Vull rebre per correu electrònic o missatgeria informació sobre les activitats de l'entitat.")}
      </p>
      <p className="petit">
        {t("Els menors de 14 anys han de tenir la signatura del pare, la mare o el tutor legal (art. 7 de la Llei orgànica 3/2018).")}
      </p>
      <div className="signatures">
        <div>
          <span>{t("Signatura de la persona sòcia o del tutor/a legal")}</span>
        </div>
        <div>
          <span>{t("Lloc i data")}</span>
        </div>
      </div>
    </div>
  );
}

/** Registre de les activitats de tractament (art. 30 RGPD). */
export function RegistreActivitats({ config, rgpd }: { config: Config | null; rgpd: ConfigRgpd | null }) {
  const comuns = {
    responsable: <Responsable config={config} rgpd={rgpd} />,
    seguretat:
      t("Accés al programa amb usuari i contrasenya xifrada, perfils d'accés segons la funció (la persona de comunicació no veu dades personals), registre d'activitat sobre les dades personals, dades guardades en un ordinador de l'entitat (no al núvol) i còpies de seguretat periòdiques."),
  };
  const tractaments = [
    {
      nom: t("Gestió de socis i sòcies"),
      finalitat: t("Altes i baixes, quotes, participació en activitats, carnet de soci i compliment d’obligacions legals i estatutàries."),
      base: t("Relació associativa (art. 6.1.b RGPD) i obligació legal (art. 6.1.c RGPD)."),
      interessats: t("Persones sòcies i, en el cas de menors, els seus representants legals."),
      dades: t("Identificatives (nom, DNI, foto), de contacte, data de naixement, gènere (opcional), dades bancàries per a domiciliacions, participació en activitats i historial de contactes."),
      destinataris: t("Cap, excepte obligació legal{0}.", rgpd?.rgpd_destinataris ? `; ${rgpd.rgpd_destinataris}` : ''),
      conservacio: t("Durant la relació i {0} anys després de la baixa; després s’anonimitzen.", rgpd?.rgpd_conservacio_anys || '5'),
    },
    {
      nom: t("Comunicacions a socis"),
      finalitat: t("Enviament d’informació sobre les activitats de l’entitat."),
      base: t("Consentiment (art. 6.1.a RGPD) i interès legítim en la comunicació amb els propis socis."),
      interessats: t("Persones sòcies que no s’hi han oposat."),
      dades: t("Nom i correu electrònic."),
      destinataris: t("Proveïdor del servei de correu electrònic de l’entitat."),
      conservacio: t("Mentre no se n’oposin o siguin socis."),
    },
    {
      nom: t("Imatges de les activitats"),
      finalitat: t("Difusió de les activitats al web, xarxes socials i publicacions."),
      base: t("Consentiment (art. 6.1.a RGPD)."),
      interessats: t("Persones que participen en les activitats i han donat el consentiment."),
      dades: t("Imatge i veu."),
      destinataris: t("Públic en general (web i xarxes socials)."),
      conservacio: t("Mentre no es revoqui el consentiment."),
    },
    {
      nom: t("Persones interessades"),
      finalitat: t("Atendre les persones que s'interessen per l'entitat i fer-ne el seguiment fins que se'n fan sòcies."),
      base: t("Consentiment (art. 6.1.a RGPD)."),
      interessats: t("Persones que han contactat amb l'entitat."),
      dades: t("Nom, contacte i interessos."),
      destinataris: t("Cap."),
      conservacio: t("{0} mesos si no es fan sòcies.", rgpd?.rgpd_interessats_mesos || '12'),
    },
    {
      nom: t("Usuaris del programa de gestió"),
      finalitat: t("Control d'accés al programa i registre d'activitat."),
      base: t("Interès legítim en la seguretat de les dades (art. 6.1.f RGPD)."),
      interessats: t("Membres de la Junta i col·laboradors amb accés al programa."),
      dades: t("Nom, nom d'usuari i registre d'operacions."),
      destinataris: t("Cap."),
      conservacio: t("Mentre tinguin accés al programa."),
    },
  ];
  return (
    <div className="registre-activitats">
      <header className="document-cap">
        <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
        <h2>{t("Registre d'activitats de tractament (art. 30 RGPD)")}</h2>
        <p className="apagat petit">{t("Actualitzat el")} {data(avui())}</p>
      </header>
      <p>
        <strong>{t("Responsable:")}</strong> {comuns.responsable}
      </p>
      {tractaments.map((tt) => (
        <section key={tt.nom} className="tractament">
          <h3>{tt.nom}</h3>
          <dl>
            <dt>{t("Finalitat")}</dt>
            <dd>{tt.finalitat}</dd>
            <dt>{t("Base jurídica")}</dt>
            <dd>{tt.base}</dd>
            <dt>{t("Persones afectades")}</dt>
            <dd>{tt.interessats}</dd>
            <dt>{t("Categories de dades")}</dt>
            <dd>{tt.dades}</dd>
            <dt>{t("Destinataris")}</dt>
            <dd>{tt.destinataris}</dd>
            <dt>{t("Transferències internacionals")}</dt>
            <dd>
              {t("No previstes. Si el correu s'envia amb un proveïdor de fora de l'Espai Econòmic Europeu (per exemple, Gmail), es fa a l'empara de les garanties que aquest ofereix.")}
            </dd>
            <dt>{t("Termini de conservació")}</dt>
            <dd>{tt.conservacio}</dd>
            <dt>{t("Mesures de seguretat")}</dt>
            <dd>{comuns.seguretat}</dd>
          </dl>
        </section>
      ))}
    </div>
  );
}
