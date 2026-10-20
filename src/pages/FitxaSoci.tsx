import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { Camp, Capcalera, Carregant, EstatQuota, Objectius, Xip, avisa, avisaError, confirma } from '../components/ui';
import { Historial, Tasques } from '../components/Seguiment';
import { useEntitat } from '../entitat';
import { FullInscripcio, Imprimible } from '../components/Rgpd';
import type { ConfigRgpd } from '../components/Rgpd';
import { Modal } from '../components/ui';
import { DEMO } from '../mode';
import { avui, data, edat, euros, nomComplet } from '../format';
import { FOTO, redueixImatge } from '../imatges';
import { imprimeixCarnet } from '../components/Carnet';
import type { Moviment, Quota, Soci, TipusQuota } from '../../shared/types';
import { t } from '../i18n';
import { formataIban, ibanValid } from '../../shared/iban';
import { PeriodesSoci } from '../components/socis/Periodes';
import type { CategoriaSoci, Periode, SociRegistre } from '../components/socis/tipus';
import '../styles/socis.css';

type Form = Record<string, string | boolean>;

const BUIT: Form = {
  num_soci: '', nom: '', llinatges: '', dni: '', data_naixement: '', genere: '', adreca: '',
  codi_postal: '', poblacio: '', telefon: '', email: '', data_alta: '', categoria_id: '',
  tipus_quota_id: '', iban: '', tutor_legal: '', consentiment_dades: false,
  consentiment_data: '', consentiment_signant: '', drets_imatge: false, accepta_comunicacions: true, notes: '',
};

function sociAForm(s: Soci): Form {
  const f: Form = { ...BUIT };
  for (const k of Object.keys(BUIT)) {
    const v = (s as unknown as Record<string, unknown>)[k];
    f[k] = typeof BUIT[k] === 'boolean' ? Boolean(v) : v == null ? '' : String(v);
  }
  if (s.iban) f.iban = formataIban(s.iban);
  return f;
}

export default function FitxaSoci() {
  const { id } = useParams();
  const nou = id === 'nou';
  const navigate = useNavigate();
  const { data: tipus } = useApi<TipusQuota[]>('/config/tipus-quota');
  const { data: categories } = useApi<CategoriaSoci[]>('/socis/categories');
  const { data: fitxa, error, reload } = useApi<{
    soci: Soci & SociRegistre; quotes: Quota[]; moviments: Moviment[]; foto: string | null; etiquetes: number[]; periodes: Periode[];
  }>(nou ? null : `/socis/${id}`);
  const { config, usuari, pot } = useEntitat();
  const potEditar = pot('socis');
  const [sollicitud, setSollicitud] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [desant, setDesant] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    if (nou) {
      api.get<{ num_soci: number }>('/socis/seguent-numero').then((r) =>
        setForm({
          ...BUIT,
          num_soci: String(r.num_soci),
          data_alta: avui(),
          poblacio: config?.poblacio ?? '',
          codi_postal: config?.codi_postal ?? '',
        }),
      );
      setFoto(null);
    } else if (fitxa) {
      setForm(sociAForm(fitxa.soci));
      setFoto(fitxa.foto);
    }
  }, [nou, fitxa]);

  if (!form || (!nou && !fitxa)) return <Carregant error={error} />;

  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const check = (k: string) => (e: { target: { checked: boolean } }) => setForm({ ...form, [k]: e.target.checked });
  const anys = edat(String(form.data_naixement) || null);
  const menor = anys !== null && anys < 18;
  const categoria = categories?.find((c) => String(c.id) === form.categoria_id);
  const ibanIncorrecte = Boolean(form.iban) && !ibanValid(String(form.iban));
  const pendent = !nou && fitxa!.soci.estat_admissio !== 'admesa';

  async function desa(e: FormEvent) {
    e.preventDefault();
    setDesant(true);
    setErrorForm(null);
    try {
      if (nou) {
        const s = await api.post<Soci>('/socis', { ...form, foto, sollicitud });
        avisa(sollicitud ? t("Sol·licitud d'admissió registrada.") : t("Soci donat d’alta."));
        navigate(`/socis/${s.id}`, { replace: true });
      } else {
        await api.put(`/socis/${id}`, { ...form, foto });
        avisa(t("Canvis desats."));
        reload();
      }
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : String(err));
    } finally {
      setDesant(false);
    }
  }

  async function elimina() {
    if (!(await confirma(t("Només es pot eliminar un registre fet per error i sense cap historial. Si la persona deixa l'associació, fes servir «Donar de baixa». Vols eliminar-lo?"))))
      return;
    try {
      await api.del(`/socis/${id}`);
      avisa(t("Soci eliminat."));
      navigate('/socis');
    } catch (err) {
      avisaError(err);
    }
  }

  async function triaFoto(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      setFoto(await redueixImatge(fitxer, FOTO.ample, FOTO.alt));
    } catch (err) {
      avisaError(err);
    }
  }

  const titol = nou ? t("Nou soci") : nomComplet(fitxa!.soci);

  return (
    <>
      <Capcalera
        titol={titol}
        subtitol={
          nou ? t("Alta al registre de socis") : pendent ? (
            <>
              {t("Soci núm.")} {fitxa!.soci.num_soci} ·{' '}
              <strong>{fitxa!.soci.estat_admissio === 'sollicitada' ? t("sol·licitud d'admissió pendent") : t("sol·licitud denegada")}</strong>
            </>
          ) : (
            <>
              {t("Soci núm.")} {fitxa!.soci.num_soci} {t("· alta el")} {data(fitxa!.soci.data_alta)}
              {fitxa!.soci.data_baixa && <> · <strong>{t("baixa el")} {data(fitxa!.soci.data_baixa)}</strong></>}
              {fitxa!.soci.categoria_nom && <> · {fitxa!.soci.categoria_nom}</>}
              {!fitxa!.soci.data_baixa && !fitxa!.soci.te_vot && <> <span className="insignia insignia-sense-vot">{t("sense vot")}</span></>}
            </>
          )
        }
      >
        <Link className="boto boto-secundari" to="/socis">
          {t("← Tornar")}
        </Link>
        {!nou && !pendent && (
          <button type="button" className="boto" onClick={() => imprimeixCarnet(Number(id))}>
            {t("Imprimeix carnet")}
          </button>
        )}
      </Capcalera>

      {!nou && fitxa && <PeriodesSoci soci={fitxa.soci} periodes={fitxa.periodes} potEditar={potEditar} onCanvi={reload} />}

      <form className="formulari" onSubmit={desa}>
        <fieldset>
          <legend>{t("Dades personals")}</legend>
          <div className="camp-foto">
            {foto ? (
              <img src={foto} alt={t("Foto del soci")} className="foto-soci" />
            ) : (
              <div className="foto-soci foto-buida">{t("Sense foto")}</div>
            )}
            <div className="camp-foto-accions">
              <label className="boto boto-petit boto-secundari">
                {foto ? t("Canvia la foto") : t("Afegeix una foto")}
                <input type="file" accept="image/*" onChange={triaFoto} hidden />
              </label>
              {foto && (
                <button type="button" className="boto boto-petit boto-perill" onClick={() => setFoto(null)}>
                  {t("Treu la foto")}
                </button>
              )}
              <span className="camp-ajuda">{t("Es retalla en format carnet. Recorda desar els canvis.")}</span>
            </div>
          </div>
          <Camp etiqueta={t("Núm. de soci")}>
            <input type="number" min={1} value={String(form.num_soci)} onChange={set('num_soci')} required />
          </Camp>
          <Camp etiqueta={t("Nom")}>
            <input value={String(form.nom)} onChange={set('nom')} required autoFocus={nou} />
          </Camp>
          <Camp etiqueta={t("Llinatges")}>
            <input value={String(form.llinatges)} onChange={set('llinatges')} />
          </Camp>
          <Camp etiqueta="DNI / NIE">
            <input value={String(form.dni)} onChange={set('dni')} />
          </Camp>
          <Camp etiqueta={t("Data de naixement")} ajuda={anys !== null ? t("{0} anys", anys) : undefined}>
            <input type="date" value={String(form.data_naixement)} onChange={set('data_naixement')} />
          </Camp>
          <Camp etiqueta={t("Gènere")} ajuda={t("Per a les estadístiques d'igualtat")}>
            <select value={String(form.genere)} onChange={set('genere')}>
              <option value="">—</option>
              <option value="dona">{t("Dona")}</option>
              <option value="home">{t("Home")}</option>
              <option value="altre">{t("Altre")}</option>
              <option value="nc">{t("Prefereix no dir-ho")}</option>
            </select>
          </Camp>
          {menor && (
            <Camp etiqueta={t("Pare, mare o tutor/a legal")} ample ajuda={t("Obligatori per a menors d'edat")}>
              <input value={String(form.tutor_legal)} onChange={set('tutor_legal')} />
            </Camp>
          )}
        </fieldset>

        <fieldset>
          <legend>{t("Contacte")}</legend>
          <Camp etiqueta={t("Telèfon")}>
            <input type="tel" value={String(form.telefon)} onChange={set('telefon')} />
          </Camp>
          <Camp etiqueta={t("Correu electrònic")}>
            <input type="email" value={String(form.email)} onChange={set('email')} />
          </Camp>
          <Camp etiqueta={t("Adreça")} ample>
            <input value={String(form.adreca)} onChange={set('adreca')} />
          </Camp>
          <Camp etiqueta={t("Codi postal")}>
            <input value={String(form.codi_postal)} onChange={set('codi_postal')} />
          </Camp>
          <Camp etiqueta={t("Població")}>
            <input value={String(form.poblacio)} onChange={set('poblacio')} />
          </Camp>
        </fieldset>

        <fieldset>
          <legend>{t("Associació i quota")}</legend>
          {nou && (
            <label className="casella camp-ample">
              <input type="checkbox" checked={sollicitud} onChange={(e) => setSollicitud(e.target.checked)} />
              {t("Registra-ho com a sol·licitud d'admissió (la junta l'haurà d'admetre)")}
            </label>
          )}
          <Camp
            etiqueta={(nou && sollicitud) || pendent ? t("Data de la sol·licitud") : t("Data d'alta")}
            ajuda={!nou && !pendent && fitxa!.periodes.length > 1 ? t("Del període actual. Els anteriors són a l'historial d'altes i baixes.") : undefined}
          >
            <input type="date" value={String(form.data_alta)} onChange={set('data_alta')} required />
          </Camp>
          <Camp
            etiqueta={t("Categoria")}
            ajuda={
              menor
                ? t("Menor d'edat: no té dret a vot fins als 18 anys.")
                : categoria
                  ? `${categoria.te_vot ? t("Amb dret a vot") : t("Sense dret a vot")} · ${categoria.paga_quota ? t("paga quota") : t("no paga quota")}`
                  : undefined
            }
          >
            <select value={String(form.categoria_id)} onChange={set('categoria_id')}>
              <option value="">—</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Camp>
          <Camp etiqueta={t("Tipus de quota")}>
            <select value={String(form.tipus_quota_id)} onChange={set('tipus_quota_id')}>
              <option value="">—</option>
              {tipus
                ?.filter((tt) => tt.actiu || String(tt.id) === form.tipus_quota_id)
                .map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.nom} ({euros(tt.import_cents)})
                  </option>
                ))}
            </select>
          </Camp>
          <Camp etiqueta={t("IBAN (domiciliació)")} ample ajuda={ibanIncorrecte ? t("Aquest IBAN no és vàlid: revisa'n els dígits.") : undefined}>
            <input
              value={String(form.iban)}
              onChange={set('iban')}
              onBlur={() => !ibanIncorrecte && form.iban && setForm({ ...form, iban: formataIban(String(form.iban)) })}
              placeholder="ES00 0000 0000 0000 0000 0000"
              aria-invalid={ibanIncorrecte}
            />
          </Camp>
        </fieldset>

        <fieldset>
          <legend>{t("Protecció de dades")}</legend>
          <label className="casella camp-ample">
            <input type="checkbox" checked={Boolean(form.consentiment_dades)} onChange={check('consentiment_dades')} />
            {t("Ha signat el full d'inscripció amb la informació de protecció de dades")}
          </label>
          {Boolean(form.consentiment_dades) && (
            <>
              <Camp etiqueta={t("Data de la signatura")}>
                <input id="soci-consentiment-data" type="date" value={String(form.consentiment_data)} onChange={set('consentiment_data')} />
              </Camp>
              <Camp etiqueta={t("Qui el signa")} ajuda={anys !== null && anys < 14 ? t("Menor de 14 anys: ha de signar el tutor legal") : undefined}>
                <select
                  id="soci-consentiment-signant"
                  value={anys !== null && anys < 14 ? 'tutor' : String(form.consentiment_signant || 'soci')}
                  onChange={set('consentiment_signant')}
                  disabled={anys !== null && anys < 14}
                >
                  <option value="soci">{t("La mateixa persona sòcia")}</option>
                  <option value="tutor">{t("El pare, la mare o el tutor legal")}</option>
                </select>
              </Camp>
            </>
          )}
          <label className="casella camp-ample">
            <input type="checkbox" checked={Boolean(form.drets_imatge)} onChange={check('drets_imatge')} />
            {t("Autoritza l'ús de la seva imatge en fotografies i vídeos de les activitats")}
          </label>
          <label className="casella camp-ample">
            <input type="checkbox" checked={Boolean(form.accepta_comunicacions)} onChange={check('accepta_comunicacions')} />
            {t("Vol rebre comunicacions de l'entitat (si es desmarca, queda fora de tots els enviaments)")}
          </label>
          <Camp etiqueta={t("Notes")} ample>
            <textarea rows={3} value={String(form.notes)} onChange={set('notes')} />
          </Camp>
        </fieldset>

        {errorForm && <p className="error">{errorForm}</p>}
        <div className="formulari-peu">
          {!nou && usuari?.rol === 'admin' && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
            </button>
          )}
          <span className="espai" />
          <button className="boto" disabled={desant}>
            {desant ? t("Desant…") : nou ? (sollicitud ? t("Registra la sol·licitud") : t("Dona d’alta")) : t("Desa els canvis")}
          </button>
        </div>
      </form>

      {!nou && fitxa && <DretsSoci soci={fitxa.soci} onCanvi={reload} />}

      {!nou && fitxa && (
        <>
          <h2 className="titol-seccio">{t("Seguiment")}</h2>
          <div className="graella-2">
            <section className="targeta">
              <h3 className="sense-marge">{t("Etiquetes")}</h3>
              <EtiquetesSoci sociId={fitxa.soci.id} inicials={fitxa.etiquetes} />
              <h3>{t("Tasques")}</h3>
              <Tasques sociId={fitxa.soci.id} />
            </section>
            <section className="targeta">
              <h3 className="sense-marge">{t("Historial de contactes")}</h3>
              <Historial sociId={fitxa.soci.id} />
            </section>
          </div>
          <Participacio sociId={fitxa.soci.id} />
        </>
      )}

      {!nou && fitxa && (
        <div className="graella-2">
          <section className="targeta">
            <h2>{t("Historial de quotes")}</h2>
            {fitxa.quotes.length === 0 ? (
              <p className="apagat">{t("Sense quotes generades.")}</p>
            ) : (
              <table className="taula taula-compacta">
                <tbody>
                  {fitxa.quotes.map((q) => (
                    <tr key={q.id}>
                      <td>{q.exercici}</td>
                      <td className="num">{euros(q.import_cents)}</td>
                      <td>
                        <EstatQuota estat={q.estat} />
                      </td>
                      <td className="apagat">{data(q.data_pagament)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="targeta">
            <h2>{t("Moviments vinculats")}</h2>
            {fitxa.moviments.length === 0 ? (
              <p className="apagat">{t("Cap moviment vinculat.")}</p>
            ) : (
              <table className="taula taula-compacta">
                <tbody>
                  {fitxa.moviments.map((m) => (
                    <tr key={m.id}>
                      <td className="apagat">{data(m.data)}</td>
                      <td>{m.concepte}</td>
                      <td className="num">{euros(m.tipus === 'despesa' ? -m.import_cents : m.import_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function EtiquetesSoci({ sociId, inicials }: { sociId: number; inicials: number[] }) {
  const { etiquetes, recarrega } = useEntitat();
  const [actives, setActives] = useState<number[]>(inicials);
  useEffect(() => setActives(inicials), [inicials]);

  async function commuta(id: number) {
    const noves = actives.includes(id) ? actives.filter((x) => x !== id) : [...actives, id];
    setActives(noves);
    try {
      await api.put(`/crm/socis/${sociId}/etiquetes`, { ids: noves });
      recarrega();
    } catch (e) {
      setActives(actives);
      avisaError(e);
    }
  }

  if (!etiquetes.length)
    return (
      <p className="apagat petit">
        {t("Encara no hi ha etiquetes. Crea-les a")} <Link to="/configuracio">{t("Configuració")}</Link> {t("(p. ex. Junta, Voluntariat, Música, Cuina…).")}
      </p>
    );
  return (
    <div className="tria-etiquetes" role="group" aria-label={t("Etiquetes")}>
      {etiquetes.map((e) => (
        <button
          key={e.id}
          type="button"
          className={`tria-etiqueta ${actives.includes(e.id) ? 'activa' : ''}`}
          aria-pressed={actives.includes(e.id)}
          onClick={() => commuta(e.id)}
        >
          <Xip nom={e.nom} color={e.color} />
        </button>
      ))}
    </div>
  );
}

function Participacio({ sociId }: { sociId: number }) {
  const { data: llista } = useApi<{ id: number; nom: string; data_inici: string; objectius: string; assistit: number }[]>(
    `/crm/socis/${sociId}/participacions`,
  );
  if (!llista) return null;
  return (
    <section className="targeta">
      <h3 className="sense-marge">{t("Participació en activitats")}</h3>
      {llista.length === 0 ? (
        <p className="apagat petit">{t("No consta en cap activitat. Les inscripcions es gestionen des d'Activitats.")}</p>
      ) : (
        <table className="taula taula-compacta">
          <tbody>
            {llista.map((a) => (
              <tr key={a.id}>
                <td className="nowrap apagat">{data(a.data_inici)}</td>
                <td>{a.nom}</td>
                <td>
                  <Objectius codis={a.objectius} />
                </td>
                <td>{a.assistit ? <span className="insignia insignia-pagada">{t("Hi va assistir")}</span> : <span className="insignia insignia-exempta">{t("Inscrit")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Exercici de drets RGPD des de la fitxa: accés/portabilitat, full d'inscripció i supressió. */
function DretsSoci({ soci, onCanvi }: { soci: Soci; onCanvi: () => void }) {
  const { config } = useEntitat();
  const { data: rgpd } = useApi<ConfigRgpd>('/rgpd/config');
  const [full, setFull] = useState(false);
  const anonimitzat = Boolean(soci.anonimitzat_el);

  async function exporta() {
    try {
      const dades = await api.get<unknown>(`/rgpd/socis/${soci.id}/dades`);
      const blob = new Blob([JSON.stringify(dades, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = t("dades-soci-{0}.json", soci.num_soci);
      a.click();
      URL.revokeObjectURL(a.href);
      avisa(t("Dades exportades. Lliura aquest fitxer a la persona que ho ha demanat."));
    } catch (e) {
      avisaError(e);
    }
  }

  async function anonimitza() {
    const ok = await confirma(
      "S'esborraran definitivament totes les dades personals d'aquest soci (nom, contacte, foto, historial…). " +
        'Les quotes i els moviments comptables es conserven sense el nom, perquè la llei obliga a guardar-los. Aquesta acció no es pot desfer.',
    );
    if (!ok) return;
    try {
      await api.post(`/rgpd/socis/${soci.id}/anonimitza`, { motiu: t("Sol·licitud de supressió") });
      avisa(t("Dades anonimitzades."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  if (anonimitzat)
    return <p className="avis-demo">{t("Aquest soci està anonimitzat: les seves dades personals s'han suprimit.")}</p>;

  return (
    <section className="targeta drets-soci">
      <div className="targeta-cap">
        <h3 className="sense-marge">{t("Protecció de dades")}</h3>
        <div className="accions">
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => setFull(true)}>
            {t("Full d'inscripció")}
          </button>
          {!DEMO && (
            <button type="button" className="boto boto-petit boto-secundari" onClick={exporta}>
              {t("Exporta totes les seves dades")}
            </button>
          )}
          <button type="button" className="boto boto-petit boto-perill" onClick={anonimitza}>
            {t("Suprimeix les dades (anonimitza)")}
          </button>
        </div>
      </div>
      <p className="apagat petit">
        {soci.consentiment_dades
          ? t("Full d'inscripció signat{0}{1}.", soci.consentiment_data ? ` el ${data(soci.consentiment_data)}` : '', soci.consentiment_signant === 'tutor' ? ' pel tutor legal' : '')
          : t("Falta el full d'inscripció signat amb la informació de protecció de dades.")}{' '}
        {t("Per a les sol·licituds d'accés, supressió, etc., registra-les a Protecció de dades → Sol·licituds.")}
      </p>
      {full && (
        <Modal titol={t("Full d'inscripció")} onClose={() => setFull(false)} ample>
          <div className="formulari-modal">
            <Imprimible titolBoto={t("Imprimeix el full")}>
              <FullInscripcio config={config} rgpd={rgpd} soci={soci} />
            </Imprimible>
          </div>
        </Modal>
      )}
    </section>
  );
}
