// Pestanya «Persones» del voluntariat: llista, fitxa, alta (sòcies o no), baixa i reincorporació,
// acord d'incorporació i certificat de voluntariat imprimibles.
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma, useExercici } from '../ui';
import { Estat, hores } from './comuns';
import { AcordIncorporacio, CertificatVoluntariat } from './Impresos';
import type { DadesCertificat } from './Impresos';
import { ESTATS_CERTIFICAT, TIPUS_ASSEGURANCA, nomVoluntari } from './tipus';
import type { FitxaVoluntari, JuntaSignatures, Voluntari } from './tipus';

export function Persones() {
  const { config, pot } = useEntitat();
  const [exercici] = useExercici();
  const [tots, setTots] = useState(false);
  const [cerca, setCerca] = useState('');
  const { data: llista, error, reload } = useApi<Voluntari[]>(`/comunitat/voluntaris?exercici=${exercici}${tots ? '&tots=1' : ''}`);
  const { data: junta } = useApi<JuntaSignatures>('/comunitat/junta');
  const [fitxa, setFitxa] = useState<number | null>(null);
  const [editant, setEditant] = useState<FitxaVoluntari | 'nou' | null>(null);
  const [document, setDocument] = useState<{ titol: string; contingut: ReactNode } | null>(null);
  const potEditar = pot('socis');

  if (document)
    return (
      <>
        <div className="barra-accions com-barra no-imprimir">
          <button className="boto boto-secundari boto-petit" onClick={() => setDocument(null)}>
            {t("← Tornar a les persones voluntàries")}
          </button>
        </div>
        <Imprimible titolBoto={document.titol}>{document.contingut}</Imprimible>
      </>
    );

  const q = cerca.trim().toLowerCase();
  const filtrats = (llista ?? []).filter(
    (v) => !q || [nomVoluntari(v), v.dni, v.email, v.telefon, v.funcions, v.habilitats].some((x) => x?.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="filtres">
        <input type="search" placeholder={t("Cerca per nom, DNI, funcions o habilitats…")} value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select value={tots ? '1' : ''} onChange={(e) => setTots(e.target.value === '1')} aria-label={t("Mostra")}>
          <option value="">{t("Persones actives")}</option>
          <option value="1">{t("Totes (també les de baixa)")}</option>
        </select>
        {potEditar && (
          <button className="boto" onClick={() => setEditant('nou')}>
            {t("+ Nova persona voluntària")}
          </button>
        )}
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : filtrats.length === 0 ? (
        <Buit>{llista.length ? t("Cap persona coincideix amb la cerca.") : t("Encara no hi ha cap persona voluntària registrada.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Nom")}</th>
                <th className="opcional">{t("Funcions")}</th>
                <th>{t("Incorporació")}</th>
                <th>{t("Acord")}</th>
                <th>{t("Certificat (menors)")}</th>
                <th>{t("Assegurança")}</th>
                <th className="num">{t("Hores {0}", exercici)}</th>
              </tr>
            </thead>
            <tbody>
              {filtrats.map((v) => (
                <tr key={v.id} onClick={() => setFitxa(v.id)} className={v.actiu ? '' : 'com-inactiu'}>
                  <td>
                    <strong>{nomVoluntari(v)}</strong>
                    <div className="petit apagat">
                      {v.soci_id ? t("Soci/a núm. {0}", v.num_soci ?? '') : t("No sòcia")}
                      {v.data_baixa && ` · ${t("baixa el {0}", data(v.data_baixa))}`}
                    </div>
                  </td>
                  <td className="opcional com-retall">{v.funcions ?? ''}</td>
                  <td className="nowrap">{data(v.data_incorporacio)}</td>
                  <td>{v.acord_signat_el ? <Estat estat="vigent" text={data(v.acord_signat_el)} /> : <Estat estat="falta" text={t("Pendent")} />}</td>
                  <td>
                    <Estat estat={v.certificat.estat} text={ESTATS_CERTIFICAT[v.certificat.estat]} />
                  </td>
                  <td>{v.actiu ? <Estat estat={v.cobertura.accidents ? 'vigent' : 'falta'} text={v.cobertura.accidents ? t("Coberta") : t("Sense cobertura")} /> : '—'}</td>
                  <td className="num">{hores(v.hores_exercici)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fitxa !== null && (
        <Fitxa
          id={fitxa}
          potEditar={potEditar}
          onClose={() => setFitxa(null)}
          onCanvi={reload}
          onEdita={(v) => {
            setFitxa(null);
            setEditant(v);
          }}
          onAcord={(v) => {
            setFitxa(null);
            setDocument({ titol: t("Imprimeix l'acord"), contingut: <AcordIncorporacio v={v} config={config} junta={junta} /> });
          }}
          onCertificat={(c) => {
            setFitxa(null);
            setDocument({ titol: t("Imprimeix el certificat"), contingut: <CertificatVoluntariat c={c} config={config} avui={avui()} /> });
          }}
        />
      )}
      {editant && (
        <FormVoluntari
          v={editant === 'nou' ? null : editant}
          onClose={() => setEditant(null)}
          onFet={(v) => {
            setEditant(null);
            reload();
            setFitxa(v.id);
          }}
        />
      )}
    </>
  );
}

function Dada({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Fitxa(props: {
  id: number;
  potEditar: boolean;
  onClose: () => void;
  onCanvi: () => void;
  onEdita: (v: FitxaVoluntari) => void;
  onAcord: (v: FitxaVoluntari) => void;
  onCertificat: (c: DadesCertificat) => void;
}) {
  const { data: v, error, reload } = useApi<FitxaVoluntari>(`/comunitat/voluntaris/${props.id}`);
  const [accio, setAccio] = useState<'baixa' | 'reincorpora' | 'certificat' | null>(null);
  const [f, setF] = useState({ data: avui(), motiu: '', de: `${avui().slice(0, 4)}-01-01`, a: avui() });

  async function executa(e: FormEvent) {
    e.preventDefault();
    if (!v) return;
    try {
      if (accio === 'certificat') {
        const c = await api.get<DadesCertificat>(`/comunitat/voluntaris/${v.id}/certificat?de=${f.de}&a=${f.a}`);
        props.onCertificat(c);
        return;
      }
      await api.post(`/comunitat/voluntaris/${v.id}/${accio}`, { data: f.data, motiu: f.motiu });
      avisa(accio === 'baixa' ? t("Baixa registrada.") : t("Reincorporació registrada. Cal signar un acord d'incorporació nou."));
      setAccio(null);
      reload();
      props.onCanvi();
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina() {
    if (!v) return;
    if (!(await confirma(t("Vols eliminar {0} del voluntariat? També se n'eliminaran les hores i el registre d'altes i baixes. Si només ha deixat de col·laborar, registra'n la baixa.", nomVoluntari(v))))) return;
    try {
      await api.del(`/comunitat/voluntaris/${v.id}`);
      avisa(t("Persona voluntària eliminada."));
      props.onCanvi();
      props.onClose();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={v ? nomVoluntari(v) : t("Persona voluntària")} onClose={props.onClose} ample>
      {!v ? (
        <Carregant error={error} />
      ) : (
        <div className="com-fitxa">
          <div className="barra-accions">
            {props.potEditar && (
              <button className="boto boto-secundari boto-petit" onClick={() => props.onEdita(v)}>
                {t("Edita")}
              </button>
            )}
            <button className="boto boto-secundari boto-petit" onClick={() => props.onAcord(v)}>
              {t("Acord d'incorporació")}
            </button>
            <button className="boto boto-secundari boto-petit" onClick={() => setAccio('certificat')}>
              {t("Certificat de voluntariat")}
            </button>
            {props.potEditar &&
              (v.data_baixa ? (
                <button className="boto boto-secundari boto-petit" onClick={() => setAccio('reincorpora')}>
                  {t("Reincorpora")}
                </button>
              ) : (
                <button className="boto boto-secundari boto-petit" onClick={() => setAccio('baixa')}>
                  {t("Registra la baixa")}
                </button>
              ))}
            <span className="espai" />
            {props.potEditar && (
              <button className="boto boto-perill boto-petit" onClick={elimina}>
                {t("Elimina")}
              </button>
            )}
          </div>

          {accio && (
            <form className="formulari targeta com-accio" onSubmit={executa}>
              {accio === 'certificat' ? (
                <>
                  <Camp etiqueta={t("Hores des del")}>
                    <input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} required />
                  </Camp>
                  <Camp etiqueta={t("fins al")}>
                    <input type="date" value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} required />
                  </Camp>
                </>
              ) : (
                <>
                  <Camp etiqueta={accio === 'baixa' ? t("Data de baixa") : t("Data de reincorporació")}>
                    <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required />
                  </Camp>
                  {accio === 'baixa' && (
                    <Camp etiqueta={t("Motiu")}>
                      <input value={f.motiu} onChange={(e) => setF({ ...f, motiu: e.target.value })} placeholder={t("P. ex.: a petició pròpia")} />
                    </Camp>
                  )}
                </>
              )}
              <div className="formulari-peu camp-ample">
                <span className="espai" />
                <button type="button" className="boto boto-secundari" onClick={() => setAccio(null)}>
                  {t("Cancel·la")}
                </button>
                <button className="boto">{accio === 'certificat' ? t("Prepara el certificat") : t("Desa")}</button>
              </div>
            </form>
          )}

          <div className="graella-2">
            <section>
              <h3>{t("Dades personals")}</h3>
              <dl className="com-dades">
                <Dada etiqueta={t("Condició")}>{v.soci_id ? t("Soci/a núm. {0}", v.num_soci ?? '') : t("No sòcia")}</Dada>
                <Dada etiqueta={t("DNI/NIE")}>{v.dni}</Dada>
                <Dada etiqueta={t("Naixement")}>{data(v.data_naixement)}</Dada>
                <Dada etiqueta={t("Telèfon")}>{v.telefon}</Dada>
                <Dada etiqueta={t("Correu")}>{v.email}</Dada>
                <Dada etiqueta={t("Adreça")}>{v.adreca}</Dada>
              </dl>
              {v.soci_id && <p className="petit apagat">{t("Les dades personals es mantenen a la fitxa del soci.")}</p>}
              <h3>{t("Col·laboració")}</h3>
              <dl className="com-dades">
                <Dada etiqueta={t("Incorporació")}>{data(v.data_incorporacio)}</Dada>
                <Dada etiqueta={t("Baixa")}>{v.data_baixa ? `${data(v.data_baixa)}${v.motiu_baixa ? ` · ${v.motiu_baixa}` : ''}` : null}</Dada>
                <Dada etiqueta={t("Funcions")}>{v.funcions}</Dada>
                <Dada etiqueta={t("Habilitats")}>{v.habilitats}</Dada>
                <Dada etiqueta={t("Disponibilitat")}>{v.disponibilitat}</Dada>
                <Dada etiqueta={t("Formació")}>{v.formacio}</Dada>
                <Dada etiqueta={t("Notes")}>{v.notes}</Dada>
              </dl>
            </section>
            <section>
              <h3>{t("Requisits legals")}</h3>
              <ul className="com-requisits">
                <li>
                  {v.acord_signat_el ? <Estat estat="vigent" text={t("Signat")} /> : <Estat estat="falta" text={t("Pendent")} />}{' '}
                  {t("Acord d'incorporació per escrit (art. 12)")}
                  {v.acord_signat_el && <span className="apagat"> · {data(v.acord_signat_el)}</span>}
                </li>
                <li>
                  <Estat estat={v.certificat.estat} text={ESTATS_CERTIFICAT[v.certificat.estat]} />{' '}
                  {t("Certificat del Registre Central de Delinqüents Sexuals (art. 8.4)")}
                  {v.treballa_amb_menors && v.certificat.caduca ? (
                    <span className="apagat"> · {t("del {0}, vàlid fins al {1}", data(v.certificat_delictes_data), data(v.certificat.caduca))}</span>
                  ) : !v.treballa_amb_menors ? (
                    <span className="apagat"> · {t("no treballa amb menors")}</span>
                  ) : null}
                </li>
                <li>
                  <Estat estat={v.cobertura.accidents ? 'vigent' : 'falta'} text={v.cobertura.accidents ? t("Sí") : t("No")} /> {t("Assegurança d'accidents (art. 10)")}
                </li>
                <li>
                  <Estat estat={v.cobertura.rc ? 'vigent' : 'falta'} text={v.cobertura.rc ? t("Sí") : t("No")} /> {t("Assegurança de responsabilitat civil (art. 10)")}
                </li>
              </ul>
              {v.assegurances.length > 0 && (
                <p className="petit apagat">
                  {v.assegurances.map((p) => `${TIPUS_ASSEGURANCA[p.tipus as keyof typeof TIPUS_ASSEGURANCA] ?? p.tipus}: ${p.asseguradora}${p.num_polissa ? ` (${p.num_polissa})` : ''}`).join(' · ')}
                </p>
              )}
              <h3>{t("Hores de voluntariat")}</h3>
              {v.per_any.length === 0 ? (
                <p className="apagat">{t("Encara no té hores registrades.")}</p>
              ) : (
                <p>
                  {v.per_any.map((a) => t("{0}: {1} h", a.any, hores(a.hores))).join(' · ')} · <strong>{t("Total: {0} h", hores(v.hores_totals))}</strong>
                </p>
              )}
              {v.hores.length > 0 && (
                <table className="taula taula-compacta">
                  <tbody>
                    {v.hores.slice(0, 8).map((h) => (
                      <tr key={h.id}>
                        <td className="nowrap">{data(h.data)}</td>
                        <td>{h.activitat ?? h.tasca ?? '—'}</td>
                        <td className="num">{hores(h.hores)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {v.periodes.length > 1 && (
                <>
                  <h3>{t("Historial al registre")}</h3>
                  <ul className="com-requisits">
                    {v.periodes.map((p) => (
                      <li key={p.id}>
                        {t("Incorporació el {0}", data(p.data_alta))}
                        {p.data_baixa && ` → ${t("baixa {0}", data(p.data_baixa))}`}
                        {p.motiu_baixa && <span className="apagat"> · {p.motiu_baixa}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface SociTria {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  voluntari_id: number | null;
}

function FormVoluntari({ v, onClose, onFet }: { v: FitxaVoluntari | null; onClose: () => void; onFet: (v: FitxaVoluntari) => void }) {
  const [esSoci, setEsSoci] = useState(v ? Boolean(v.soci_id) : true);
  const { data: socis } = useApi<SociTria[]>(esSoci ? '/comunitat/socis' : null);
  const [f, setF] = useState({
    soci_id: v?.soci_id ? String(v.soci_id) : '',
    nom: v && !v.soci_id ? v.nom : '',
    llinatges: v && !v.soci_id ? v.llinatges : '',
    dni: v && !v.soci_id ? (v.dni ?? '') : '',
    data_naixement: v && !v.soci_id ? (v.data_naixement ?? '') : '',
    email: v && !v.soci_id ? (v.email ?? '') : '',
    telefon: v && !v.soci_id ? (v.telefon ?? '') : '',
    adreca: v && !v.soci_id ? (v.adreca ?? '') : '',
    data_incorporacio: v?.data_incorporacio ?? avui(),
    data_baixa: v?.data_baixa ?? '',
    motiu_baixa: v?.motiu_baixa ?? '',
    funcions: v?.funcions ?? '',
    habilitats: v?.habilitats ?? '',
    disponibilitat: v?.disponibilitat ?? '',
    formacio: v?.formacio ?? '',
    acord_signat_el: v?.acord_signat_el ?? '',
    treballa_amb_menors: Boolean(v?.treballa_amb_menors),
    certificat_delictes_data: v?.certificat_delictes_data ?? '',
    notes: v?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cos = { ...f, soci_id: esSoci ? f.soci_id : null };
    try {
      const r = v ? await api.put<FitxaVoluntari>(`/comunitat/voluntaris/${v.id}`, cos) : await api.post<FitxaVoluntari>('/comunitat/voluntaris', cos);
      avisa(v ? t("Dades desades.") : t("Persona voluntària registrada."));
      onFet(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={v ? t("Edita la persona voluntària") : t("Nova persona voluntària")} onClose={onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <div className="segmentat camp-ample" role="radiogroup" aria-label={t("Condició")}>
          <button type="button" role="radio" aria-checked={esSoci} className={esSoci ? 'actiu' : ''} onClick={() => setEsSoci(true)}>
            {t("És soci/sòcia")}
          </button>
          <button type="button" role="radio" aria-checked={!esSoci} className={!esSoci ? 'actiu' : ''} onClick={() => setEsSoci(false)}>
            {t("No és soci/sòcia")}
          </button>
        </div>
        {esSoci ? (
          <Camp etiqueta={t("Soci/sòcia")} ample ajuda={t("Les dades personals es prenen de la fitxa del soci.")}>
            <select value={f.soci_id} onChange={set('soci_id')} required>
              <option value="">—</option>
              {socis
                ?.filter((s) => !s.voluntari_id || s.voluntari_id === v?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.num_soci} · {s.nom} {s.llinatges}
                  </option>
                ))}
            </select>
          </Camp>
        ) : (
          <>
            <Camp etiqueta={t("Nom")}>
              <input value={f.nom} onChange={set('nom')} required />
            </Camp>
            <Camp etiqueta={t("Llinatges")}>
              <input value={f.llinatges} onChange={set('llinatges')} />
            </Camp>
            <Camp etiqueta={t("DNI/NIE")}>
              <input value={f.dni} onChange={set('dni')} />
            </Camp>
            <Camp etiqueta={t("Data de naixement")}>
              <input type="date" value={f.data_naixement} onChange={set('data_naixement')} />
            </Camp>
            <Camp etiqueta={t("Telèfon")}>
              <input value={f.telefon} onChange={set('telefon')} />
            </Camp>
            <Camp etiqueta={t("Correu electrònic")}>
              <input type="email" value={f.email} onChange={set('email')} />
            </Camp>
            <Camp etiqueta={t("Adreça")} ample>
              <input value={f.adreca} onChange={set('adreca')} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Data d'incorporació")}>
          <input type="date" value={f.data_incorporacio} onChange={set('data_incorporacio')} required />
        </Camp>
        <Camp etiqueta={t("Acord d'incorporació signat el")} ajuda={t("Deixa-ho en blanc mentre no estigui signat")}>
          <input type="date" value={f.acord_signat_el} onChange={set('acord_signat_el')} />
        </Camp>
        {v?.data_baixa && (
          <>
            <Camp etiqueta={t("Data de baixa")}>
              <input type="date" value={f.data_baixa} onChange={set('data_baixa')} />
            </Camp>
            <Camp etiqueta={t("Motiu de la baixa")}>
              <input value={f.motiu_baixa} onChange={set('motiu_baixa')} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Funcions i activitats")} ample>
          <textarea rows={2} value={f.funcions} onChange={set('funcions')} />
        </Camp>
        <Camp etiqueta={t("Disponibilitat i temps de dedicació")} ample>
          <input value={f.disponibilitat} onChange={set('disponibilitat')} placeholder={t("P. ex.: dissabtes al matí, unes 4 hores al mes")} />
        </Camp>
        <Camp etiqueta={t("Habilitats")}>
          <input value={f.habilitats} onChange={set('habilitats')} />
        </Camp>
        <Camp etiqueta={t("Formació")}>
          <input value={f.formacio} onChange={set('formacio')} />
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.treballa_amb_menors} onChange={(e) => setF({ ...f, treballa_amb_menors: e.target.checked })} />
          {t("Treballa habitualment amb menors (cal el certificat negatiu del Registre Central de Delinqüents Sexuals)")}
        </label>
        {f.treballa_amb_menors && (
          <Camp etiqueta={t("Data del certificat")} ajuda={t("Data d'expedició del certificat negatiu")}>
            <input type="date" value={f.certificat_delictes_data} onChange={set('certificat_delictes_data')} />
          </Camp>
        )}
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
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
