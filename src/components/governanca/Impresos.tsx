// Documents imprimibles dels òrgans de govern: actes, llibre d'actes, cartes de convocatòria,
// etiquetes d'adreces i certificats de la secretaria.
import { markdown } from '../../../shared/markdown';
import type { Config } from '../../../shared/types';
import { data } from '../../format';
import { locale, t } from '../../i18n';
import { CARRECS, ORGANS, RESULTATS, adrecaPostal, nomSoci, titolReunio } from './comuns';
import type { ActaCompleta, Carrec, Organ, Quorum, Reunio, SociGov } from './comuns';

export const dataLlarga = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export function CapEntitat({ config, titol, subtitol }: { config: Config | null; titol: string; subtitol?: string }) {
  return (
    <header className="document-cap">
      <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
      <p className="apagat petit">
        {[
          config?.nif && t("NIF {0}", config.nif),
          config?.num_registre && t("Registre d'Associacions núm. {0}", config.num_registre),
          [config?.adreca, [config?.codi_postal, config?.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <h2>{titol}</h2>
      {subtitol && <p className="gov-subtitol">{subtitol}</p>}
    </header>
  );
}

export function Signatures({ secretaria, presidencia }: { secretaria: string | null; presidencia: string | null }) {
  return (
    <div className="signatures gov-signatures">
      <div>
        <span>{t("El secretari / La secretària")}</span>
        <strong>{secretaria || ' '}</strong>
      </div>
      <div>
        <span>{t("Vist i plau del president / de la presidenta")}</span>
        <strong>{presidencia || ' '}</strong>
      </div>
    </div>
  );
}

export function TextQuorum({ q, conv }: { q: Quorum; conv: '1a' | '2a' | null }) {
  return (
    <p>
      {q.cens !== null
        ? t("Hi assisteixen {0} persones amb dret a vot ({1} presents i {2} representades) d'un total de {3} ({4} %).", q.total, q.presents, q.representats, q.cens, q.percentatge ?? 0)
        : t("Hi assisteixen {0} persones.", q.total)}{' '}
      {conv === '1a' && t("La reunió es constitueix vàlidament en primera convocatòria.")}
      {conv === '2a' && t("La reunió es constitueix vàlidament en segona convocatòria.")}
    </p>
  );
}

function Vots({ a }: { a: { vots_favor: number | null; vots_contra: number | null; abstencions: number | null; resultat: string } }) {
  const hiHaVots = a.vots_favor !== null || a.vots_contra !== null || a.abstencions !== null;
  return (
    <p className="gov-vots">
      {hiHaVots && t("Vots a favor: {0} · en contra: {1} · abstencions: {2}.", a.vots_favor ?? 0, a.vots_contra ?? 0, a.abstencions ?? 0)}{' '}
      <strong>{RESULTATS[a.resultat]}</strong>
    </p>
  );
}

/** Acta d'una reunió, a punt per imprimir i signar. */
export function ActaDocument({ a, config, alLlibre }: { a: ActaCompleta; config: Config | null; alLlibre?: boolean }) {
  const r = a.reunio;
  const presents = a.assistents.filter((x) => x.forma === 'present');
  const representats = a.assistents.filter((x) => x.forma === 'representat');
  const hora = r.convocatoria_celebrada === '2a' ? r.hora_2a : r.hora_1a;
  return (
    <section className={`gov-acta ${alLlibre ? 'gov-acta-llibre' : ''}`}>
      {alLlibre ? (
        <header className="gov-acta-cap">
          <h2>{t("Acta núm. {0}/{1}", a.acta.numero, a.acta.any)}</h2>
          <p className="gov-subtitol">{titolReunio(r)}</p>
        </header>
      ) : (
        <CapEntitat config={config} titol={t("Acta núm. {0}/{1}", a.acta.numero, a.acta.any)} subtitol={titolReunio(r)} />
      )}
      {!a.acta.tancada && <p className="gov-esborrany">{t("Esborrany: acta pendent d'aprovació")}</p>}
      <dl className="gov-dades">
        <dt>{t("Data")}</dt>
        <dd>{dataLlarga(r.data)}</dd>
        {hora && (
          <>
            <dt>{t("Hora")}</dt>
            <dd>
              {hora} {r.convocatoria_celebrada === '2a' ? t("(segona convocatòria)") : r.convocatoria_celebrada === '1a' ? t("(primera convocatòria)") : ''}
            </dd>
          </>
        )}
        {r.lloc && (
          <>
            <dt>{t("Lloc")}</dt>
            <dd>{r.lloc}</dd>
          </>
        )}
        <dt>{t("Presideix")}</dt>
        <dd>{a.acta.presidencia || '—'}</dd>
        <dt>{t("Secretari/ària")}</dt>
        <dd>{a.acta.secretaria || '—'}</dd>
      </dl>

      <h3>{t("Assistents")}</h3>
      <p>
        <strong>{t("Presents ({0}):", presents.length)}</strong> {presents.map((x) => x.nom).join(', ') || '—'}.
      </p>
      {representats.length > 0 && (
        <p>
          <strong>{t("Representats ({0}):", representats.length)}</strong>{' '}
          {representats.map((x) => t("{0} (per {1})", x.nom, x.representant ?? '—')).join(', ')}.
        </p>
      )}
      <TextQuorum q={a.quorum} conv={r.convocatoria_celebrada} />

      <h3>{t("Ordre del dia")}</h3>
      <ol>
        {r.ordre_dia.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>

      {a.acta.text.trim() && (
        <>
          <h3>{t("Desenvolupament de la sessió")}</h3>
          <div className="gov-text" dangerouslySetInnerHTML={{ __html: markdown(a.acta.text) }} />
        </>
      )}

      <h3>{t("Acords")}</h3>
      {a.acords.length === 0 ? (
        <p>{t("No s'hi va adoptar cap acord.")}</p>
      ) : (
        <ol className="gov-acords">
          {a.acords.map((x) => (
            <li key={x.id}>
              {x.punt !== null && <span className="apagat">{t("Punt {0}.", x.punt)} </span>}
              {x.text}
              <Vots a={x} />
            </li>
          ))}
        </ol>
      )}
      <p className="gov-tancament">
        {a.acta.tancada && a.acta.data_aprovacio
          ? t("Aquesta acta es va aprovar el {0}.", dataLlarga(a.acta.data_aprovacio))
          : t("Acta pendent d'aprovació.")}
      </p>
      <Signatures secretaria={a.acta.secretaria} presidencia={a.acta.presidencia} />
    </section>
  );
}

/** Llibre d'actes d'un òrgan i any: portada amb índex i cada acta en una pàgina nova (folis numerats). */
export function LlibreActes({ actes, organ, any, config }: { actes: ActaCompleta[]; organ: Organ; any: number; config: Config | null }) {
  return (
    <div className="gov-llibre">
      <section className="gov-llibre-portada">
        <CapEntitat config={config} titol={t("Llibre d'actes")} subtitol={`${ORGANS[organ]} · ${any}`} />
        <p>{t("Llibre d'actes dut d'acord amb l'article 14 de la Llei orgànica 1/2002, reguladora del dret d'associació.")}</p>
        <table className="taula taula-compacta">
          <thead>
            <tr>
              <th>{t("Núm.")}</th>
              <th>{t("Reunió")}</th>
              <th>{t("Data")}</th>
              <th>{t("Aprovada")}</th>
            </tr>
          </thead>
          <tbody>
            {actes.map((a) => (
              <tr key={a.acta.id}>
                <td>
                  {a.acta.numero}/{a.acta.any}
                </td>
                <td>{titolReunio(a.reunio)}</td>
                <td className="nowrap">{data(a.reunio.data)}</td>
                <td className="nowrap">{data(a.acta.data_aprovacio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {actes.map((a) => (
        <ActaDocument key={a.acta.id} a={a} config={config} alLlibre />
      ))}
    </div>
  );
}

/** Contingut de la convocatòria (el mateix que el correu). */
export function CartaConvocatoria({
  r,
  soci,
  config,
  secretaria,
}: {
  r: Reunio;
  soci: SociGov | null;
  config: Config | null;
  secretaria: string | null;
}) {
  const entitat = config?.nom_complet || config?.nom || '';
  return (
    <section className="gov-carta">
      <header className="gov-carta-cap">
        <div>
          <p className="document-entitat">{entitat}</p>
          <p className="apagat petit">{[config?.adreca, [config?.codi_postal, config?.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
        </div>
        {soci && (
          <address className="gov-carta-dest">
            {nomSoci(soci)}
            {adrecaPostal(soci).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </address>
        )}
      </header>
      <p className="gov-carta-data">{[config?.poblacio, dataLlarga(r.data_convocatoria ?? new Date().toLocaleDateString('sv-SE'))].filter(Boolean).join(', ')}</p>
      <h3>{t("Convocatòria: {0}", titolReunio(r))}</h3>
      <p>{t("Benvolgut/da {0},", soci ? soci.nom : '')}</p>
      <p>{t("Et convocam a la {0} de {1}, que se celebrarà el dia {2} a {3}.", titolReunio(r).toLowerCase(), entitat, dataLlarga(r.data), r.lloc || '—')}</p>
      {r.hora_1a && <p className="sense-marge">{t("Primera convocatòria: {0} h.", r.hora_1a)}</p>}
      {r.hora_2a && <p className="sense-marge">{t("Segona convocatòria: {0} h.", r.hora_2a)}</p>}
      <h4>{t("Ordre del dia:")}</h4>
      <ol>
        {r.ordre_dia.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
      {r.organ === 'assemblea' && (
        <>
          <p>{t("Si no hi pots assistir, pots delegar la teva representació en un altre soci o sòcia mitjançant un escrit signat.")}</p>
          <div className="gov-delegacio">
            <p>
              {t("En/Na {0}, soci/sòcia núm. {1}, delego la meva representació a la {2} del {3} en", soci ? nomSoci(soci) : '…………………………', soci ? soci.num_soci : '……', titolReunio(r).toLowerCase(), data(r.data))}{' '}
              <span className="omplir" />.
            </p>
            <p className="petit">{t("Signatura:")}</p>
          </div>
        </>
      )}
      <p>{t("Atentament,")}</p>
      <p className="gov-carta-signa">
        {secretaria ? t("{0}, secretari/ària", secretaria) : t("La secretaria")}
        <br />
        {entitat}
      </p>
    </section>
  );
}

/** Full d'etiquetes d'adreces (A4, 3 × 8 etiquetes de 70 × 37 mm). */
export function FullEtiquetes({ socis }: { socis: SociGov[] }) {
  return (
    <div className="gov-etiquetes">
      {socis.map((s) => (
        <div key={s.id} className="gov-etiqueta">
          <strong>{nomSoci(s)}</strong>
          {adrecaPostal(s).map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Certificats ----------

export interface Certificat {
  id: number;
  any: number;
  numero: number;
  tipus: 'soci' | 'acord' | 'junta';
  data: string;
  finalitat: string | null;
  secretaria: string | null;
  presidencia: string | null;
  emes_per: string | null;
  soci_nom?: string | null;
  soci_llinatges?: string | null;
  contingut: {
    soci?: { nom: string; llinatges: string; dni: string | null; num_soci: number; data_alta: string; data_baixa: string | null; actiu: boolean; categoria: string | null };
    reunio?: Pick<Reunio, 'organ' | 'tipus' | 'titol' | 'data' | 'lloc' | 'convocatoria_celebrada'>;
    acta?: { numero: number; any: number; tancada: number; data_aprovacio: string | null } | null;
    acord?: { punt: number | null; text: string; vots_favor: number | null; vots_contra: number | null; abstencions: number | null; resultat: string };
    quorum?: Quorum;
    junta?: { carrec: Carrec; nom: string; dni: string | null; data_eleccio: string; data_fi_mandat: string | null }[];
  };
}

export const TIPUS_CERTIFICAT: Record<Certificat['tipus'], string> = {
  soci: t("Condició de soci"),
  acord: t("Acord d'un òrgan"),
  junta: t("Composició de la junta directiva"),
};

export function CertificatDocument({ c, config }: { c: Certificat; config: Config | null }) {
  const entitat = config?.nom_complet || config?.nom || '';
  const k = c.contingut;
  return (
    <section className="gov-certificat">
      <CapEntitat config={config} titol={t("Certificat núm. {0}/{1}", c.numero, c.any)} subtitol={TIPUS_CERTIFICAT[c.tipus]} />
      <p>
        {t("{0}, secretari/ària de l'entitat {1}", c.secretaria ?? '—', entitat)}
        {config?.nif && t(", amb NIF {0}", config.nif)}
        {config?.num_registre && t(", inscrita al Registre d'Associacions de les Illes Balears amb el número {0}", config.num_registre)},
      </p>
      <p className="gov-certifica">{t("CERTIFICA:")}</p>
      {k.soci && (
        <p>
          {k.soci.actiu
            ? t("Que {0}, amb DNI {1}, és soci/sòcia d'aquesta entitat amb el número {2} des del {3} i actualment es troba en situació d'alta.", nomSoci(k.soci), k.soci.dni || '—', k.soci.num_soci, dataLlarga(k.soci.data_alta))
            : t("Que {0}, amb DNI {1}, va ser soci/sòcia d'aquesta entitat amb el número {2} des del {3} fins al {4}.", nomSoci(k.soci), k.soci.dni || '—', k.soci.num_soci, dataLlarga(k.soci.data_alta), dataLlarga(k.soci.data_baixa))}
          {k.soci.categoria && ' ' + t("Categoria: {0}.", k.soci.categoria)}
        </p>
      )}
      {k.reunio && k.acord && (
        <>
          <p>
            {t("Que a la {0} celebrada el {1}", titolReunio(k.reunio).toLowerCase(), dataLlarga(k.reunio.data))}
            {k.reunio.lloc && t(" a {0}", k.reunio.lloc)}
            {k.reunio.convocatoria_celebrada === '1a' && t(", en primera convocatòria")}
            {k.reunio.convocatoria_celebrada === '2a' && t(", en segona convocatòria")}
            {k.quorum && k.quorum.cens !== null && t(", amb l'assistència de {0} persones amb dret a vot, presents o representades, d'un total de {1}", k.quorum.total, k.quorum.cens)}
            {t(", es va adoptar, entre d'altres, l'acord següent")}
            {k.acta && t(", que consta a l'acta núm. {0}/{1}", k.acta.numero, k.acta.any)}
            {k.acta?.tancada && k.acta.data_aprovacio ? t(", aprovada el {0}", dataLlarga(k.acta.data_aprovacio)) : ''}:
          </p>
          <blockquote className="gov-cita">
            {k.acord.punt !== null && <span>{t("Punt {0}.", k.acord.punt)} </span>}
            {k.acord.text}
            <Vots a={k.acord} />
          </blockquote>
          {!k.acta?.tancada && <p className="petit">{t("(Sense perjudici de l'aprovació posterior de l'acta.)")}</p>}
        </>
      )}
      {k.junta && (
        <>
          <p>{t("Que la junta directiva de l'entitat està formada actualment per les persones següents:")}</p>
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Càrrec")}</th>
                <th>{t("Nom i llinatges")}</th>
                <th>{t("DNI/NIE")}</th>
                <th>{t("Elecció")}</th>
                <th>{t("Fi del mandat")}</th>
              </tr>
            </thead>
            <tbody>
              {k.junta.map((j, i) => (
                <tr key={i}>
                  <td>{CARRECS[j.carrec]}</td>
                  <td>{j.nom}</td>
                  <td>{j.dni || '—'}</td>
                  <td className="nowrap">{data(j.data_eleccio)}</td>
                  <td className="nowrap">{data(j.data_fi_mandat) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p>
        {c.finalitat
          ? t("I, perquè consti als efectes de {0}, expedeixo aquest certificat amb el vist i plau de la presidència, a {1}, {2}.", c.finalitat, config?.poblacio || '—', dataLlarga(c.data))
          : t("I, perquè així consti, expedeixo aquest certificat amb el vist i plau de la presidència, a {0}, {1}.", config?.poblacio || '—', dataLlarga(c.data))}
      </p>
      <Signatures secretaria={c.secretaria} presidencia={c.presidencia} />
    </section>
  );
}
