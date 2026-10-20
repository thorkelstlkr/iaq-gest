// Documents imprimibles del voluntariat: acord d'incorporació (art. 12 Llei 45/2015), certificat de
// voluntariat, registre d'altes i baixes i resum anual d'hores.
import type { Config } from '../../../shared/types';
import { data, edat, euros } from '../../format';
import { t } from '../../i18n';
import { CapEntitat, Signatures, dataLlarga } from '../governanca/Impresos';
import { hores } from './comuns';
import { TIPUS_ASSEGURANCA, nomVoluntari } from './tipus';
import type { ConfigComunitat, FitxaVoluntari, JuntaSignatures, ResumVoluntariat, Voluntari } from './tipus';

const nomEntitat = (config: Config | null) => config?.nom_complet || config?.nom || '';
const lloc = (config: Config | null) => config?.poblacio || '';

function Identitat({ v }: { v: Voluntari }) {
  return (
    <dl className="com-dades">
      <dt>{t("Nom i llinatges")}</dt>
      <dd>{nomVoluntari(v)}</dd>
      <dt>{t("DNI/NIE")}</dt>
      <dd>{v.dni || '—'}</dd>
      {v.data_naixement && (
        <>
          <dt>{t("Data de naixement")}</dt>
          <dd>{data(v.data_naixement)}</dd>
        </>
      )}
      <dt>{t("Adreça")}</dt>
      <dd>{v.adreca || '—'}</dd>
      <dt>{t("Contacte")}</dt>
      <dd>{[v.telefon, v.email].filter(Boolean).join(' · ') || '—'}</dd>
      {v.num_soci && (
        <>
          <dt>{t("Soci/sòcia núm.")}</dt>
          <dd>{v.num_soci}</dd>
        </>
      )}
    </dl>
  );
}

/** Acord d'incorporació de la persona voluntària, amb el contingut mínim de l'art. 12.2 de la Llei 45/2015. */
export function AcordIncorporacio({ v, config, junta }: { v: FitxaVoluntari; config: Config | null; junta: JuntaSignatures | null }) {
  const anys = edat(v.data_naixement);
  const menor = anys !== null && anys < 18;
  const polisses = v.assegurances.filter((p) => p.tipus === 'accidents_voluntaris' || p.tipus === 'responsabilitat_civil');
  const presidencia = junta?.presidencia?.nom ?? '';
  return (
    <section className="com-document">
      <CapEntitat config={config} titol={t("Acord d'incorporació de persona voluntària")} subtitol={t("Article 12 de la Llei 45/2015, de 14 d'octubre, del voluntariat")} />
      <h3>{t("Reunits")}</h3>
      <p>
        {t("D'una part, {0}, en nom i representació de l'entitat {1}, en qualitat de president/a.", presidencia || '______________________', nomEntitat(config))}
      </p>
      <p>{t("De l'altra, la persona voluntària:")}</p>
      <Identitat v={v} />
      {menor && <p>{t("Com que la persona voluntària és menor d'edat, aquest acord requereix el consentiment del seu pare, mare o tutor/a legal (art. 8.2 de la Llei 45/2015).")}</p>}
      <p>{t("Ambdues parts es reconeixen capacitat per subscriure aquest acord d'incorporació, que es regeix per la Llei 45/2015, del voluntariat, i per la normativa de voluntariat de les Illes Balears, d'acord amb les clàusules següents.")}</p>

      <h3>{t("1. Caràcter de la relació")}</h3>
      <p>{t("La col·laboració és lliure, altruista i solidària, sense cap contraprestació econòmica ni material, i no constitueix cap relació laboral, funcionarial o mercantil. Només es reemborsaran les despeses degudament justificades derivades de l'activitat voluntària.")}</p>

      <h3>{t("2. Funcions, activitats i temps de dedicació")}</h3>
      <p>
        <strong>{t("Funcions i activitats:")}</strong> {v.funcions || '______________________________________________'}
      </p>
      <p>
        <strong>{t("Temps de dedicació i disponibilitat:")}</strong> {v.disponibilitat || '______________________________________________'}
      </p>
      {v.habilitats && (
        <p>
          <strong>{t("Habilitats que hi aporta:")}</strong> {v.habilitats}
        </p>
      )}

      <h3>{t("3. Drets de la persona voluntària")}</h3>
      <ul>
        <li>{t("Rebre informació, formació, orientació i suport, i els mitjans materials necessaris per exercir les seves funcions.")}</li>
        <li>{t("Ser tractada sense cap discriminació, amb respecte a la seva llibertat, dignitat, intimitat i creences.")}</li>
        <li>{t("Participar activament en l'organització, el disseny i l'avaluació dels programes en què col·labora.")}</li>
        <li>{t("Estar assegurada contra els riscos d'accident i malaltia derivats directament de l'activitat voluntària i per la responsabilitat civil davant de tercers.")}</li>
        <li>{t("Ser reemborsada de les despeses que li ocasioni l'activitat, d'acord amb aquest acord.")}</li>
        <li>{t("Disposar d'una acreditació que la identifiqui i obtenir un certificat de la seva participació.")}</li>
        <li>{t("Fer l'activitat en condicions de seguretat i higiene, i que es respectin les seves dades personals.")}</li>
        <li>{t("Deixar de col·laborar quan ho cregui convenient, comunicant-ho amb antelació suficient.")}</li>
      </ul>

      <h3>{t("4. Deures de la persona voluntària")}</h3>
      <ul>
        <li>{t("Complir els compromisos adquirits amb l'entitat i respectar-ne les finalitats i la normativa interna.")}</li>
        <li>{t("Guardar confidencialitat de la informació rebuda i coneguda en l'exercici de l'activitat.")}</li>
        <li>{t("Rebutjar qualsevol contraprestació econòmica o material per la seva activitat.")}</li>
        <li>{t("Respectar els drets de les persones destinatàries i actuar amb diligència i solidaritat.")}</li>
        <li>{t("Participar en la formació prevista i seguir les instruccions de les persones responsables de l'activitat.")}</li>
        <li>{t("Utilitzar degudament l'acreditació i tenir cura dels recursos materials que se li confiïn.")}</li>
        <li>{t("Complir la normativa de protecció de dades personals.")}</li>
      </ul>

      <h3>{t("5. Compromisos de l'entitat")}</h3>
      <p>{t("L'entitat es compromet a garantir els drets de la persona voluntària, a facilitar-li la formació necessària, a dur un registre d'altes i baixes, a expedir-li el certificat de la seva participació i a mantenir les assegurances obligatòries.")}</p>
      {polisses.length > 0 ? (
        <ul>
          {polisses.map((p) => (
            <li key={p.id}>
              {TIPUS_ASSEGURANCA[p.tipus as keyof typeof TIPUS_ASSEGURANCA] ?? p.tipus}: {p.asseguradora}
              {p.num_polissa && `, ${t("pòlissa {0}", p.num_polissa)}`} ({t("vigent fins al {0}", data(p.data_venciment))})
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("Pòlissa d'accidents i de responsabilitat civil: ______________________________________________")}</p>
      )}

      <h3>{t("6. Formació")}</h3>
      <p>{v.formacio ? t("Formació prevista o acreditada: {0}", v.formacio) : t("L'entitat proporcionarà la formació bàsica necessària per a les funcions encomanades.")}</p>

      {v.treballa_amb_menors ? (
        <>
          <h3>{t("7. Activitat amb menors")}</h3>
          <p>{t("Com que l'activitat implica contacte habitual amb menors, la persona voluntària acredita que no ha estat condemnada per delictes contra la llibertat i la indemnitat sexuals, mitjançant el certificat negatiu del Registre Central de Delinqüents Sexuals (art. 8.4 de la Llei 45/2015), i es compromet a renovar-lo quan l'entitat li ho demani.")}</p>
        </>
      ) : null}

      <h3>{v.treballa_amb_menors ? t("8. Durada i desvinculació") : t("7. Durada i desvinculació")}</h3>
      <p>{t("Aquest acord té efectes a partir del {0} i té durada indefinida. Qualsevol de les parts el pot deixar sense efecte en qualsevol moment, comunicant-ho per escrit a l'altra amb una antelació mínima de quinze dies. També s'extingeix per l'incompliment greu dels compromisos que s'hi recullen.", dataLlarga(v.data_incorporacio))}</p>

      <h3>{v.treballa_amb_menors ? t("9. Resolució de conflictes") : t("8. Resolució de conflictes")}</h3>
      <p>{t("Els conflictes que puguin sorgir entre la persona voluntària i l'entitat es resoldran preferentment pel diàleg i, si no és possible, els resoldrà la junta directiva, després d'escoltar la persona voluntària.")}</p>

      <h3>{v.treballa_amb_menors ? t("10. Protecció de dades") : t("9. Protecció de dades")}</h3>
      <p>{t("Les dades personals de la persona voluntària es tracten per gestionar la seva col·laboració i complir les obligacions legals de l'entitat, i es conserven mentre duri la relació i els terminis legals posteriors. Pot exercir els drets d'accés, rectificació, supressió, oposició, limitació i portabilitat adreçant-se a l'entitat.")}</p>

      <p className="com-lloc-data">{t("{0}, {1}", lloc(config) || '__________', dataLlarga(v.acord_signat_el ?? v.data_incorporacio))}</p>
      <div className="signatures com-signatures">
        <div>
          <span>{t("Per l'entitat")}</span>
          <strong>{presidencia || ' '}</strong>
        </div>
        <div>
          <span>{t("La persona voluntària")}</span>
          <strong>{nomVoluntari(v)}</strong>
        </div>
        {menor && (
          <div>
            <span>{t("Pare, mare o tutor/a legal")}</span>
            <strong> </strong>
          </div>
        )}
      </div>
    </section>
  );
}

export interface DadesCertificat {
  voluntari: FitxaVoluntari;
  de: string;
  a: string;
  hores: number;
  activitats: { activitat_id: number | null; nom: string | null; data_inici: string | null; hores: number }[];
  tasques: string[];
  junta: JuntaSignatures;
}

/** Certificat de voluntariat: la secretaria certifica les hores i activitats, amb el vist i plau de la presidència. */
export function CertificatVoluntariat({ c, config, avui }: { c: DadesCertificat; config: Config | null; avui: string }) {
  const v = c.voluntari;
  const secretaria = c.junta.secretaria?.nom ?? null;
  const presidencia = c.junta.presidencia?.nom ?? null;
  return (
    <section className="com-document">
      <CapEntitat config={config} titol={t("Certificat de voluntariat")} />
      <p>
        {t("{0}, secretari/ària de l'entitat {1}{2},", secretaria || '______________________', nomEntitat(config), config?.nif ? ` (${t("NIF {0}", config.nif)})` : '')}
      </p>
      <p className="com-certifica">{t("CERTIFICA:")}</p>
      <p>
        {v.data_baixa
          ? t("Que {0}{1} ha col·laborat com a persona voluntària d'aquesta entitat des del {2} fins al {3}.", nomVoluntari(v), v.dni ? `, ${t("amb DNI {0}", v.dni)}` : '', dataLlarga(v.data_incorporacio), dataLlarga(v.data_baixa))
          : t("Que {0}{1} col·labora com a persona voluntària d'aquesta entitat des del {2}.", nomVoluntari(v), v.dni ? `, ${t("amb DNI {0}", v.dni)}` : '', dataLlarga(v.data_incorporacio))}
      </p>
      {v.funcions && <p>{t("Que les seves funcions són: {0}.", v.funcions.replace(/\.$/, ''))}</p>}
      <p>{t("Que entre el {0} i el {1} hi ha dedicat un total de {2} hores de voluntariat, en les activitats següents:", dataLlarga(c.de), dataLlarga(c.a), hores(c.hores))}</p>
      {c.activitats.length === 0 ? (
        <p className="apagat">{t("No hi ha hores registrades en aquest període.")}</p>
      ) : (
        <table className="taula taula-compacta com-taula-document">
          <thead>
            <tr>
              <th>{t("Activitat")}</th>
              <th>{t("Data")}</th>
              <th className="num">{t("Hores")}</th>
            </tr>
          </thead>
          <tbody>
            {c.activitats.map((a) => (
              <tr key={a.activitat_id ?? 0}>
                <td>{a.nom ?? t("Tasques de suport a l'entitat")}</td>
                <td className="nowrap">{data(a.data_inici)}</td>
                <td className="num">{hores(a.hores)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {c.tasques.length > 0 && <p>{t("Tasques fetes: {0}.", c.tasques.join('; '))}</p>}
      <p>{t("I, perquè consti, a petició de la persona interessada, expedeixo aquest certificat amb el vist i plau de la presidència.")}</p>
      <p className="com-lloc-data">{t("{0}, {1}", lloc(config) || '__________', dataLlarga(avui))}</p>
      <Signatures secretaria={secretaria} presidencia={presidencia} />
    </section>
  );
}

export interface FilaRegistre {
  id: number;
  voluntari_id: number;
  nom: string;
  llinatges: string;
  num_soci: number | null;
  dni: string | null;
  data_alta: string;
  data_baixa: string | null;
  motiu_baixa: string | null;
}

/** Registre d'altes i baixes de les persones voluntàries (art. 14 de la Llei 45/2015). */
export function RegistreDocument({ files, config, avui }: { files: FilaRegistre[]; config: Config | null; avui: string }) {
  return (
    <section className="com-document">
      <CapEntitat config={config} titol={t("Registre de persones voluntàries")} subtitol={t("Altes i baixes · actualitzat el {0}", data(avui))} />
      <table className="taula taula-compacta com-taula-document">
        <thead>
          <tr>
            <th className="num">{t("Núm.")}</th>
            <th>{t("Nom i llinatges")}</th>
            <th>{t("DNI/NIE")}</th>
            <th>{t("Soci/a")}</th>
            <th>{t("Alta")}</th>
            <th>{t("Baixa")}</th>
            <th>{t("Motiu de la baixa")}</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={f.id}>
              <td className="num">{i + 1}</td>
              <td>{nomVoluntari(f)}</td>
              <td className="nowrap">{f.dni ?? ''}</td>
              <td>{f.num_soci ? t("Sí ({0})", f.num_soci) : t("No")}</td>
              <td className="nowrap">{data(f.data_alta)}</td>
              <td className="nowrap">{data(f.data_baixa)}</td>
              <td>{f.motiu_baixa ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Resum anual d'hores de voluntariat i valoració econòmica (per a la memòria i les subvencions). */
export function ResumHoresDocument({ r, config, cfg }: { r: ResumVoluntariat; config: Config | null; cfg: ConfigComunitat | null }) {
  return (
    <section className="com-document">
      <CapEntitat config={config} titol={t("Voluntariat {0}: hores i valoració", r.exercici)} />
      <p>
        {t("Durant {0}, {1} persones voluntàries han dedicat {2} hores a l'entitat. A {3} l'hora, aquesta aportació en espècie es valora en {4}.", r.exercici, r.persones_amb_hores, hores(r.hores_totals), euros(cfg?.vol_valor_hora_cents ?? r.valor_hora_cents), euros(r.valor_estimat_cents))}
      </p>
      <h3>{t("Per persona")}</h3>
      <table className="taula taula-compacta com-taula-document">
        <thead>
          <tr>
            <th>{t("Persona voluntària")}</th>
            <th className="num">{t("Activitats")}</th>
            <th className="num">{t("Hores")}</th>
            <th className="num">{t("Valoració")}</th>
          </tr>
        </thead>
        <tbody>
          {r.per_persona.map((p) => (
            <tr key={p.voluntari_id}>
              <td>{nomVoluntari(p)}</td>
              <td className="num">{p.activitats}</td>
              <td className="num">{hores(p.hores)}</td>
              <td className="num">{euros(p.valor_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t("Per activitat")}</h3>
      <table className="taula taula-compacta com-taula-document">
        <thead>
          <tr>
            <th>{t("Activitat")}</th>
            <th>{t("Data")}</th>
            <th className="num">{t("Persones")}</th>
            <th className="num">{t("Hores")}</th>
            <th className="num">{t("Valoració")}</th>
          </tr>
        </thead>
        <tbody>
          {r.per_activitat.map((a) => (
            <tr key={a.activitat_id ?? 0}>
              <td>{a.nom ?? t("Tasques de suport a l'entitat")}</td>
              <td className="nowrap">{data(a.data_inici)}</td>
              <td className="num">{a.persones}</td>
              <td className="num">{hores(a.hores)}</td>
              <td className="num">{euros(a.valor_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
