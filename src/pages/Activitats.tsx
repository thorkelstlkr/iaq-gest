import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Link } from 'react-router-dom';
import { Buit, Camp, Capcalera, Carregant, Modal, Objectius, avisa, avisaError, useExercici, confirma } from '../components/ui';
import { avui, centsAText, data, euros, nomComplet, textACents } from '../format';
import { useEntitat } from '../entitat';
import type { SociLlista } from '../../shared/types';
import { redueixImatge } from '../imatges';
import { IMATGE_WEB } from './Web';
import { t } from '../i18n';
import { EditorText } from '../components/EditorText';
import { AvisPromocionats, Participants } from '../components/activitats/Participants';
import { PassarLlista } from '../components/activitats/PassarLlista';
import { DocumentsActivitat } from '../components/activitats/Documents';
import { TasquesActivitat } from '../components/activitats/TasquesActivitat';
import { CollaboradorsActivitat } from '../components/activitats/CollaboradorsActivitat';
import { ESTATS_ACTIVITAT } from '../components/activitats/tipus';
import type { ActivitatPlena, EstatActivitat, Promocionat } from '../components/activitats/tipus';
import '../styles/activitats.css';

export default function Activitats() {
  const [exercici] = useExercici();
  const { data: activitats, error, reload } = useApi<ActivitatPlena[]>(`/activitats?exercici=${exercici}`);
  const [editant, setEditant] = useState<Partial<ActivitatPlena> | null>(null);
  const [promocionats, setPromocionats] = useState<Promocionat[]>([]);

  return (
    <>
      <Capcalera titol={t("Activitats")} subtitol={t("Programa d'activitats {0}, vinculat a les finalitats estatutàries", exercici)}>
        <button className="boto" onClick={() => setEditant({ data_inici: avui(), objectius: '', estat: 'confirmada' })}>
          {t("+ Nova activitat")}
        </button>
      </Capcalera>

      <AvisPromocionats llista={promocionats} onTanca={() => setPromocionats([])} />

      {!activitats ? (
        <Carregant error={error} />
      ) : activitats.length === 0 ? (
        <Buit>{t("No hi ha activitats registrades a")} {exercici}.</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Activitat")}</th>
                <th>{t("Estat")}</th>
                <th>{t("Finalitats")}</th>
                <th className="num">{t("Participants")}</th>
                <th className="num">{t("Balanç")}</th>
              </tr>
            </thead>
            <tbody>
              {activitats.map((a) => {
                const balanc = (a.ingressos_cents ?? 0) - (a.despeses_cents ?? 0);
                return (
                  <tr key={a.id} onClick={() => setEditant(a)} className={a.estat === 'anul·lada' ? 'act-anullada' : ''}>
                    <td className="nowrap">
                      {data(a.data_inici)}
                      {a.data_fi && a.data_fi !== a.data_inici && <> – {data(a.data_fi)}</>}
                    </td>
                    <td>
                      <strong>{a.nom}</strong>
                      {(a.lloc || a.responsable_nom) && (
                        <div className="apagat petit">
                          {[a.lloc, a.responsable_nom && t("Responsable: {0}", a.responsable_nom)].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {a.tasques_pendents > 0 && <div className="apagat petit">{t("{0} tasques pendents", a.tasques_pendents)}</div>}
                    </td>
                    <td>
                      <EstatActivitatInsignia estat={a.estat} />
                    </td>
                    <td>
                      <Objectius codis={a.objectius} />
                    </td>
                    <td className="num nowrap">
                      <ResumParticipants a={a} />
                    </td>
                    <td className={`num nowrap ${balanc < 0 ? 'negatiu' : balanc > 0 ? 'positiu' : ''}`}>
                      {a.ingressos_cents || a.despeses_cents ? euros(balanc) : '—'}
                      {a.pressupost_cents != null && <div className="apagat petit">{t("pressupost {0}", euros(a.pressupost_cents))}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editant && (
        <FitxaActivitat
          inicial={editant}
          onClose={() => {
            setEditant(null);
            reload();
          }}
          onCanvi={reload}
          onFet={(nous) => {
            setEditant(null);
            if (nous.length) setPromocionats((l) => [...l, ...nous]);
            reload();
          }}
        />
      )}
    </>
  );
}

function EstatActivitatInsignia({ estat }: { estat: EstatActivitat }) {
  return <span className={`insignia act-estat act-estat-${estat === 'anul·lada' ? 'anullada' : estat}`}>{ESTATS_ACTIVITAT[estat] ?? estat}</span>;
}

/** Inscrits / places, llista d'espera i assistents (o el recompte manual si no hi ha inscripcions). */
function ResumParticipants({ a }: { a: ActivitatPlena }) {
  if (!a.inscrits && !a.en_espera && !a.assistents_anonims) return <>{a.participants ?? '—'}</>;
  return (
    <>
      <span title={t("Inscrits")}>
        {a.inscrits}
        {a.places != null && ` / ${a.places}`}
      </span>
      {a.en_espera > 0 && <div className="apagat petit">{t("{0} en espera", a.en_espera)}</div>}
      {a.assistents + a.assistents_anonims > 0 && (
        <div className="apagat petit">{t("{0} assistents", a.assistents + a.assistents_anonims)}</div>
      )}
    </>
  );
}

type Pestanya = 'fitxa' | 'inscripcions' | 'llista' | 'tasques' | 'documents' | 'collaboradors';

/** Fitxa d'una activitat: dades i planificació, inscripcions, passar llista, tasques i documents. */
function FitxaActivitat(props: {
  inicial: Partial<ActivitatPlena>;
  onClose: () => void;
  onCanvi: () => void;
  onFet: (promocionats: Promocionat[]) => void;
}) {
  const a = props.inicial;
  const { pot } = useEntitat();
  const [pestanya, setPestanya] = useState<Pestanya>('fitxa');
  const socis = pot('socis');
  const pestanyes: [Pestanya, string][] = a.id
    ? [
        ['fitxa', t("Fitxa")],
        ...(socis ? ([['inscripcions', t("Inscripcions")]] as [Pestanya, string][]) : []),
        ['llista', t("Passar llista")],
        ...(socis
          ? ([
              ['tasques', a.tasques_pendents ? t("Tasques ({0})", a.tasques_pendents) : t("Tasques")],
              ['documents', t("Documents")],
              ['collaboradors', t("Col·laboradors")],
            ] as [Pestanya, string][])
          : []),
      ]
    : [];
  const activitat = a as ActivitatPlena;

  return (
    <Modal titol={a.id ? a.nom ?? t("Edita l’activitat") : t("Nova activitat")} onClose={props.onClose} ample>
      {pestanyes.length > 0 && (
        <div className="pestanyes act-pestanyes" role="tablist">
          {pestanyes.map(([id, text]) => (
            <button key={id} type="button" role="tab" aria-selected={pestanya === id} className={pestanya === id ? 'actiu' : ''} onClick={() => setPestanya(id)}>
              {text}
            </button>
          ))}
        </div>
      )}
      {/* La fitxa es manté muntada (amagada) per no perdre els canvis sense desar en canviar de pestanya. */}
      <div hidden={pestanya !== 'fitxa'}>
        <FormActivitat inicial={a} onClose={props.onClose} onFet={props.onFet} />
      </div>
      {a.id && pestanya === 'inscripcions' && <Participants activitat={activitat} onCanvi={props.onCanvi} />}
      {a.id && pestanya === 'llista' && <PassarLlista activitat={activitat} ambLlista={socis} onCanvi={props.onCanvi} />}
      {a.id && pestanya === 'tasques' && <TasquesActivitat activitatId={a.id} onCanvi={props.onCanvi} />}
      {a.id && pestanya === 'documents' && <DocumentsActivitat activitat={activitat} />}
      {a.id && pestanya === 'collaboradors' && <CollaboradorsActivitat activitatId={a.id} />}
    </Modal>
  );
}

function FormActivitat(props: { inicial: Partial<ActivitatPlena>; onClose: () => void; onFet: (promocionats: Promocionat[]) => void }) {
  const a = props.inicial;
  const [f, setF] = useState({
    nom: a.nom ?? '',
    data_inici: a.data_inici ?? avui(),
    data_fi: a.data_fi ?? '',
    lloc: a.lloc ?? '',
    descripcio: a.descripcio ?? '',
    participants: a.participants == null ? '' : String(a.participants),
    notes: a.notes ?? '',
    web_publica: a.web_publica === undefined ? true : Boolean(a.web_publica),
    estat: (a.estat ?? 'confirmada') as EstatActivitat,
    places: a.places == null ? '' : String(a.places),
    responsable_soci_id: a.responsable_soci_id == null ? '' : String(a.responsable_soci_id),
    pressupost: a.pressupost_cents == null ? '' : centsAText(a.pressupost_cents),
    materials: a.materials ?? '',
    public_objectiu: a.public_objectiu ?? '',
  });
  const { finalitats, pot } = useEntitat();
  const { data: socis } = useApi<SociLlista[]>(pot('socis') ? '/socis?estat=actius' : null);
  // La llista no porta la imatge (ocupa molt): es carrega en obrir una activitat existent.
  // undefined = encara no carregada: no s'envia i el servidor conserva la que hi hagi.
  const [imatge, setImatge] = useState<string | null | undefined>(a.id ? undefined : null);
  useEffect(() => {
    if (a.id) api.get<ActivitatPlena>(`/activitats/${a.id}`).then((x) => setImatge(x.imatge ?? null)).catch(() => {});
  }, [a.id]);
  // Es descarten les finalitats que s'hagin eliminat a Configuració.
  const [objectius, setObjectius] = useState<string[]>(
    (a.objectius ?? '').split(',').filter((c) => finalitats.some((f) => f.codi === c)),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const commuta = (codi: string) =>
    setObjectius((l) => (l.includes(codi) ? l.filter((c) => c !== codi) : [...l, codi]));

  async function envia(e: FormEvent) {
    e.preventDefault();
    const pressupost_cents = f.pressupost.trim() ? textACents(f.pressupost) : null;
    if (f.pressupost.trim() && pressupost_cents === null) {
      setError(t("El pressupost no és un import vàlid."));
      return;
    }
    const { pressupost: _p, ...resta } = f;
    const cos: Record<string, unknown> = { ...resta, pressupost_cents, objectius, imatge };
    // Qui no veu els socis no pot triar el responsable: es conserva el que hi hagi.
    if (!pot('socis')) delete cos.responsable_soci_id;
    try {
      let promocionats: Promocionat[] = [];
      if (a.id) promocionats = (await api.put<ActivitatPlena>(`/activitats/${a.id}`, cos)).promocionats ?? [];
      else await api.post('/activitats', cos);
      avisa(a.id ? t("Activitat actualitzada.") : t("Activitat creada."));
      props.onFet(promocionats);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar aquesta activitat? Els moviments vinculats es conservaran, però sense activitat.")))) return;
    try {
      await api.del(`/activitats/${a.id}`);
      avisa(t("Activitat eliminada."));
      props.onFet([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const pressupost = a.pressupost_cents ?? null;
  const despeses = a.despeses_cents ?? 0;

  return (
    <form className="formulari formulari-modal" onSubmit={envia}>
      <Camp etiqueta={t("Nom de l'activitat")} ample>
        <input value={f.nom} onChange={set('nom')} required autoFocus />
      </Camp>
      <Camp etiqueta={t("Data d'inici")}>
        <input type="date" value={f.data_inici} onChange={set('data_inici')} required />
      </Camp>
      <Camp etiqueta={t("Data de fi (opcional)")}>
        <input type="date" value={f.data_fi} onChange={set('data_fi')} min={f.data_inici} />
      </Camp>
      <Camp etiqueta={t("Lloc")}>
        <input value={f.lloc} onChange={set('lloc')} placeholder={t("p. ex. Claustre de Sant Domingo")} />
      </Camp>
      <Camp etiqueta={t("Estat")}>
        <select value={f.estat} onChange={set('estat')}>
          {Object.entries(ESTATS_ACTIVITAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Camp>
      <Camp etiqueta={t("Descripció")} ample grup>
        <EditorText files={4} senzill valor={f.descripcio ?? ''} onChange={(v) => setF((x) => ({ ...x, descripcio: v }))} />
      </Camp>

      <fieldset className="camp-ample objectius-tria act-planificacio">
        <legend>{t("Planificació")}</legend>
        {pot('socis') ? (
          <Camp etiqueta={t("Persona responsable")}>
            <select value={f.responsable_soci_id} onChange={set('responsable_soci_id')}>
              <option value="">{t("Sense responsable")}</option>
              {socis?.map((s) => (
                <option key={s.id} value={s.id}>
                  {nomComplet(s)}
                </option>
              ))}
            </select>
          </Camp>
        ) : (
          <Camp etiqueta={t("Persona responsable")}>
            <input value={a.responsable_nom ?? ''} disabled />
          </Camp>
        )}
        <Camp etiqueta={t("Places")} ajuda={t("En blanc, sense límit. Quan és ple, les inscripcions van a la llista d'espera.")}>
          <input type="number" min={1} value={f.places} onChange={set('places')} />
        </Camp>
        <Camp etiqueta={t("Pressupost previst (€)")}>
          <input inputMode="decimal" value={f.pressupost} onChange={set('pressupost')} placeholder="0,00" />
        </Camp>
        <Camp etiqueta={t("Públic objectiu")} ample>
          <input value={f.public_objectiu} onChange={set('public_objectiu')} placeholder={t("p. ex. Padrins i padrines amb els nets de 6 a 12 anys")} />
        </Camp>
        <Camp etiqueta={t("Materials i necessitats")} ample>
          <textarea rows={2} value={f.materials} onChange={set('materials')} />
        </Camp>
        {a.id && (
          <p className="camp-ample petit act-pressupost">
            {pressupost != null && (
              <>
                {t("Pressupost:")} <strong>{euros(pressupost)}</strong> ·{' '}
              </>
            )}
            {t("Despeses reals:")}{' '}
            <strong className={pressupost != null && despeses > pressupost ? 'negatiu' : ''}>{euros(despeses)}</strong> · {t("Ingressos:")}{' '}
            <strong>{euros(a.ingressos_cents ?? 0)}</strong> · {t("Balanç:")}{' '}
            <strong>{euros((a.ingressos_cents ?? 0) - despeses)}</strong>
            {pressupost != null && despeses > pressupost && <span className="negatiu"> · {t("S'ha superat el pressupost.")}</span>}
            <span className="apagat"> {t("Vincula moviments des de Comptabilitat.")}</span>
          </p>
        )}
      </fieldset>

      <fieldset className="camp-ample objectius-tria">
        <legend>{t("Finalitats estatutàries a què respon")}</legend>
        {finalitats.length === 0 && (
          <p className="apagat petit">
            {t("Encara no s'han definit les finalitats de l'entitat. Afegeix-les a")} <Link to="/configuracio">{t("Configuració")}</Link>.
          </p>
        )}
        {finalitats.map((o) => (
          <label key={o.codi} className="casella" title={o.text}>
            <input type="checkbox" checked={objectius.includes(o.codi)} onChange={() => commuta(o.codi)} />
            <span>
              <strong>{o.codi})</strong> {o.curt}
            </span>
          </label>
        ))}
      </fieldset>
      <Camp
        etiqueta={t("Participants (recompte manual)")}
        ajuda={t("Només cal si no es fa servir la llista d'inscripcions ni el comptador d'assistents.")}
      >
        <input type="number" min={0} value={f.participants} onChange={set('participants')} />
      </Camp>
      <Camp etiqueta={t("Notes internes")} ample>
        <textarea rows={2} value={f.notes} onChange={set('notes')} />
      </Camp>
      <fieldset className="camp-ample objectius-tria">
        <legend>{t("Web i xarxes")}</legend>
        <label className="casella camp-ample">
          <input type="checkbox" checked={f.web_publica} onChange={(e) => setF({ ...f, web_publica: e.target.checked })} />
          {t("Mostra aquesta activitat a l'agenda de la web")}
        </label>
        <ImatgeActivitat valor={imatge} onChange={setImatge} />
      </fieldset>
      {error && <p className="error camp-ample">{error}</p>}
      <div className="formulari-peu camp-ample">
        {a.id && (
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
  );
}

function ImatgeActivitat({ valor, onChange }: { valor: string | null | undefined; onChange: (v: string | null) => void }) {
  if (valor === undefined) return <p className="apagat petit camp-ample">{t("Carregant la imatge…")}</p>;
  async function tria(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      onChange(await redueixImatge(fitxer, IMATGE_WEB.ample, IMATGE_WEB.alt, 0.85));
    } catch (err) {
      avisaError(err);
    }
  }
  return (
    <div className="camp-imatge-web camp-ample">
      {valor ? <img src={valor} alt="" /> : <div className="imatge-buida">{t("Sense imatge")}</div>}
      <div className="camp-foto-accions">
        <label className="boto boto-petit boto-secundari">
          {valor ? t("Canvia la imatge") : t("Afegeix una imatge")}
          <input type="file" accept="image/*" onChange={tria} hidden />
        </label>
        {valor && (
          <button type="button" className="boto boto-petit boto-perill" onClick={() => onChange(null)}>
            {t("Treu la imatge")}
          </button>
        )}
        <span className="camp-ajuda">{t("Cartell o foto de l'activitat (es retalla en format apaïsat).")}</span>
      </div>
    </div>
  );
}
