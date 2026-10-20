import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { GENERES, avui, data, edat, nomComplet } from '../../format';
import type { Interessat, SociLlista } from '../../../shared/types';
import { t } from '../../i18n';
import { ESTATS_INSCRIPCIO, contacte, senseAutoritzacio } from './tipus';
import type { ActivitatPlena, Participant, Promocionat } from './tipus';

/** Avís persistent: qui ha entrat de la llista d'espera i cal avisar (amb el contacte). */
export function AvisPromocionats({ llista, onTanca }: { llista: Promocionat[]; onTanca: () => void }) {
  if (!llista.length) return null;
  return (
    <div className="act-promocionats" role="alert">
      <div>
        <strong>{t("Han entrat de la llista d'espera. Avisa'ls que ja tenen plaça:")}</strong>
        <ul>
          {llista.map((p) => (
            <li key={p.id}>
              {p.nom}
              {contacte(p) && <span className="apagat"> — {contacte(p)}</span>}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="boto boto-petit boto-secundari" onClick={onTanca}>
        {t("Ja els he avisat")}
      </button>
    </div>
  );
}

/** Icones d'avís d'una inscripció: menor sense autorització i sense consentiment d'imatge. */
export function AvisosParticipant({ p }: { p: Participant }) {
  return (
    <>
      {senseAutoritzacio(p) && (
        <span className="act-avis act-avis-alerta" title={t("Menor sense l'autorització signada del tutor")}>
          ⚠ {t("Autorització")}
        </span>
      )}
      {!p.drets_imatge && (
        <span
          className="act-avis"
          title={p.drets_imatge_consta ? t("No autoritza l'ús de la imatge") : t("No consta el consentiment d'ús de la imatge")}
        >
          ⊘ {t("Imatge")}
        </span>
      )}
    </>
  );
}

const TIPUS_PERSONA = { soci: t("Soci/sòcia"), interessat: t("Persona interessada"), extern: t("Persona de fora") };

/** Inscripcions a l'activitat: comptadors, alta ràpida (soci, persona interessada o de fora) i llista. */
export function Participants({ activitat, onCanvi }: { activitat: ActivitatPlena; onCanvi?: () => void }) {
  const { data: llista, error, reload } = useApi<Participant[]>(`/crm/activitats/${activitat.id}/participants`);
  const [promocionats, setPromocionats] = useState<Promocionat[]>([]);
  const [editant, setEditant] = useState<Participant | null>(null);

  const actius = llista?.filter((p) => p.estat === 'inscrit') ?? [];
  const espera = llista?.filter((p) => p.estat === 'espera') ?? [];
  const cancellats = llista?.filter((p) => p.estat === 'cancel·lat') ?? [];
  const ple = activitat.places !== null && actius.length >= activitat.places;

  function refresca(nous?: Promocionat[]) {
    if (nous?.length) {
      setPromocionats((l) => [...l, ...nous]);
      avisa(t("{0} ha entrat de la llista d'espera: cal avisar-la.", nous.map((p) => p.nom).join(', ')));
    }
    reload();
    onCanvi?.();
  }

  async function canviaEstat(p: Participant, estat: string) {
    try {
      const r = await api.put<{ promocionats: Promocionat[] }>(`/crm/activitats/${activitat.id}/participants/${p.id}`, { estat });
      refresca(r.promocionats);
    } catch (e) {
      avisaError(e);
    }
  }

  async function elimina(p: Participant) {
    if (!(await confirma(t("Esborrar la inscripció de {0}? Si només s'ha donat de baixa, millor cancel·la-la i en quedarà constància.", p.nom))))
      return;
    try {
      const r = await api.del(`/crm/activitats/${activitat.id}/participants/${p.id}`) as unknown as { promocionats?: Promocionat[] };
      refresca(r?.promocionats);
    } catch (e) {
      avisaError(e);
    }
  }

  async function assistit(p: Participant, valor: boolean) {
    try {
      await api.put(`/crm/activitats/${activitat.id}/participants/${p.id}`, { assistit: valor });
      reload();
      onCanvi?.();
    } catch (e) {
      avisaError(e);
    }
  }

  const fila = (p: Participant) => (
    <li key={p.id} className={`act-inscripcio act-estat-${p.estat === 'cancel·lat' ? 'cancellat' : p.estat}`}>
      {p.estat !== 'cancel·lat' && (
        <input
          type="checkbox"
          checked={Boolean(p.assistit)}
          onChange={(e) => assistit(p, e.target.checked)}
          aria-label={t("{0} hi ha assistit", p.nom)}
          title={t("Hi ha assistit")}
        />
      )}
      <div className="act-inscripcio-nom">
        <button type="button" className="enllac" onClick={() => setEditant(p)}>
          {p.nom}
        </button>
        <div className="apagat petit">
          {p.tipus === 'soci' ? t("Soci núm. {0}", p.num_soci) : TIPUS_PERSONA[p.tipus]}
          {p.edat !== null && ` · ${t("{0} anys", p.edat)}`}
          {p.menor && p.tutor && ` · ${t("tutor/a: {0}", p.tutor)}`}
        </div>
      </div>
      <div className="act-inscripcio-avisos">
        <AvisosParticipant p={p} />
      </div>
      <div className="act-inscripcio-accions">
        {p.estat === 'espera' && (
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => canviaEstat(p, 'inscrit')} title={t("Hi entra encara que l'activitat sigui plena")}>
            {t("Dona plaça")}
          </button>
        )}
        {p.estat !== 'cancel·lat' ? (
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => canviaEstat(p, 'cancel·lat')}>
            {t("Cancel·la")}
          </button>
        ) : (
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => canviaEstat(p, 'espera')}>
            {t("Reactiva")}
          </button>
        )}
        <button type="button" className="boto-icona petit" aria-label={t("Esborra {0}", p.nom)} onClick={() => elimina(p)}>
          ×
        </button>
      </div>
    </li>
  );

  return (
    <div className="act-panell">
      <div className="act-comptadors">
        <div className={ple ? 'act-comptador act-ple' : 'act-comptador'}>
          <strong>
            {actius.length}
            {activitat.places !== null && <span className="apagat"> / {activitat.places}</span>}
          </strong>
          <span>{activitat.places !== null ? t("inscrits / places") : t("inscrits (places il·limitades)")}</span>
        </div>
        <div className="act-comptador">
          <strong>{espera.length}</strong>
          <span>{t("en llista d'espera")}</span>
        </div>
        <div className="act-comptador">
          <strong>{llista?.filter((p) => p.assistit && p.estat !== 'cancel·lat').length ?? 0}</strong>
          <span>{t("han assistit")}</span>
        </div>
        <div className="act-comptador">
          <strong>{llista?.filter(senseAutoritzacio).length ?? 0}</strong>
          <span>{t("menors sense autorització")}</span>
        </div>
      </div>
      {ple && <p className="apagat petit">{t("L'activitat és plena: les inscripcions noves van a la llista d'espera.")}</p>}

      <AvisPromocionats llista={promocionats} onTanca={() => setPromocionats([])} />

      <AltaRapida activitat={activitat} inscrits={llista ?? []} onFet={() => refresca()} />

      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <p className="apagat">{t("Encara no hi ha ningú inscrit.")}</p>
      ) : (
        <>
          {actius.length > 0 && <ul className="act-inscripcions">{actius.map(fila)}</ul>}
          {espera.length > 0 && (
            <>
              <h4 className="act-subtitol">{t("Llista d'espera (per ordre d'arribada)")}</h4>
              <ol className="act-inscripcions">{espera.map(fila)}</ol>
            </>
          )}
          {cancellats.length > 0 && (
            <details>
              <summary className="apagat petit">{t("Cancel·lacions ({0})", cancellats.length)}</summary>
              <ul className="act-inscripcions">{cancellats.map(fila)}</ul>
            </details>
          )}
          <p className="apagat petit">{t("Marca la casella de qui hi ha assistit. Clica un nom per editar-ne el tutor, l'autorització o el consentiment d'imatge.")}</p>
        </>
      )}

      {editant && (
        <EditaInscripcio
          activitatId={activitat.id}
          p={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            refresca();
          }}
        />
      )}
    </div>
  );
}

type Mode = 'soci' | 'interessat' | 'extern';

/** Alta ràpida d'una inscripció. */
function AltaRapida({ activitat, inscrits, onFet }: { activitat: ActivitatPlena; inscrits: Participant[]; onFet: () => void }) {
  const [mode, setMode] = useState<Mode>('soci');
  const { data: socis } = useApi<SociLlista[]>(mode === 'soci' ? '/socis?estat=actius' : null);
  const { data: interessats } = useApi<Interessat[]>(mode === 'interessat' ? '/crm/interessats?estat=oberts' : null);
  const [tria, setTria] = useState('');
  const buit = { nom_extern: '', data_naixement: '', genere: '', telefon: '', email: '', tutor: '', tutor_telefon: '', autoritzacio_tutor: '', drets_imatge: '' };
  const [f, setF] = useState(buit);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const menor = f.data_naixement ? (edat(f.data_naixement) ?? 99) < 18 : false;

  const actius = inscrits.filter((p) => p.estat !== 'cancel·lat');
  const socisDisponibles = socis?.filter((s) => !actius.some((p) => p.soci_id === s.id)) ?? [];
  const interessatsDisponibles = interessats?.filter((i) => !actius.some((p) => p.interessat_id === i.id)) ?? [];

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cos =
      mode === 'soci'
        ? { soci_id: tria }
        : mode === 'interessat'
          ? { interessat_id: tria, data_naixement: f.data_naixement, genere: f.genere, tutor: f.tutor, tutor_telefon: f.tutor_telefon, autoritzacio_tutor: f.autoritzacio_tutor, drets_imatge: f.drets_imatge }
          : f;
    try {
      const p = await api.post<Participant>(`/crm/activitats/${activitat.id}/participants`, cos);
      avisa(
        p.estat === 'espera'
          ? t("L'activitat és plena: {0} queda en llista d'espera.", p.nom)
          : t("{0} s'ha inscrit a l'activitat.", p.nom),
      );
      setTria('');
      setF(buit);
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <form className="act-alta" onSubmit={envia}>
      <div className="act-modes" role="radiogroup" aria-label={t("Qui s'inscriu")}>
        {(['soci', 'interessat', 'extern'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={mode === m ? 'actiu' : ''}
            onClick={() => {
              setMode(m);
              setTria('');
            }}
          >
            {m === 'soci' ? t("Soci/sòcia") : m === 'interessat' ? t("Persona interessada") : t("Persona de fora")}
          </button>
        ))}
      </div>
      {mode === 'soci' && (
        <div className="afegeix-linia">
          <select value={tria} onChange={(e) => setTria(e.target.value)} aria-label={t("Soci a inscriure")} required>
            <option value="">{t("Tria un soci per inscriure'l…")}</option>
            {socisDisponibles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {nomComplet(s)}
              </option>
            ))}
          </select>
          <button className="boto boto-petit" disabled={!tria}>
            {t("Inscriu")}
          </button>
        </div>
      )}
      {mode === 'interessat' && (
        <div className="afegeix-linia">
          <select value={tria} onChange={(e) => setTria(e.target.value)} aria-label={t("Persona interessada a inscriure")} required>
            <option value="">{t("Tria una persona interessada…")}</option>
            {interessatsDisponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {nomComplet(i)}
              </option>
            ))}
          </select>
          <input type="date" value={f.data_naixement} onChange={set('data_naixement')} aria-label={t("Data de naixement")} title={t("Data de naixement")} />
          <button className="boto boto-petit" disabled={!tria}>
            {t("Inscriu")}
          </button>
        </div>
      )}
      {mode === 'extern' && (
        <div className="formulari-modal act-alta-extern">
          <Camp etiqueta={t("Nom i llinatges")}>
            <input value={f.nom_extern} onChange={set('nom_extern')} required />
          </Camp>
          <Camp etiqueta={t("Data de naixement")}>
            <input type="date" value={f.data_naixement} onChange={set('data_naixement')} max={avui()} />
          </Camp>
          <Camp etiqueta={t("Gènere")}>
            <select value={f.genere} onChange={set('genere')}>
              <option value="">—</option>
              {Object.entries(GENERES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Camp>
          <Camp etiqueta={t("Telèfon")}>
            <input type="tel" value={f.telefon} onChange={set('telefon')} />
          </Camp>
          <Camp etiqueta={t("Correu electrònic")}>
            <input type="email" value={f.email} onChange={set('email')} />
          </Camp>
          <Camp etiqueta={t("Drets d'imatge")} ajuda={t("Pregunta-ho: sense consentiment no se'n poden publicar fotos.")}>
            <select value={f.drets_imatge} onChange={set('drets_imatge')}>
              <option value="">{t("No consta")}</option>
              <option value="1">{t("Sí, autoritza l'ús de la imatge")}</option>
              <option value="0">{t("No l'autoritza")}</option>
            </select>
          </Camp>
          {menor && (
            <>
              <Camp etiqueta={t("Pare, mare o tutor/a")}>
                <input value={f.tutor} onChange={set('tutor')} required />
              </Camp>
              <Camp etiqueta={t("Telèfon del tutor/a")}>
                <input type="tel" value={f.tutor_telefon} onChange={set('tutor_telefon')} />
              </Camp>
              <Camp etiqueta={t("Autorització signada el")} ajuda={t("Deixa-ho en blanc si encara no l'ha signada.")}>
                <input type="date" value={f.autoritzacio_tutor} onChange={set('autoritzacio_tutor')} max={avui()} />
              </Camp>
            </>
          )}
          <div className="formulari-peu camp-ample">
            <span className="espai" />
            <button className="boto boto-petit">{t("Inscriu")}</button>
          </div>
        </div>
      )}
    </form>
  );
}

/** Dades d'una inscripció: tutor, autorització, consentiment d'imatge i (si no és soci) dades personals. */
function EditaInscripcio(props: { activitatId: number; p: Participant; onClose: () => void; onFet: () => void }) {
  const { p } = props;
  const [f, setF] = useState({
    nom_extern: p.nom_extern ?? '',
    data_naixement: p.data_naixement ?? '',
    genere: p.genere ?? '',
    telefon: p.telefon ?? '',
    email: p.email ?? '',
    tutor: p.tutor ?? '',
    tutor_telefon: p.tutor_telefon ?? '',
    autoritzacio_tutor: p.autoritzacio_tutor ?? '',
    drets_imatge: p.drets_imatge_consta ? String(p.drets_imatge) : '',
    notes: p.notes ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const esSoci = p.tipus === 'soci';
  const esExtern = p.tipus === 'extern';

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cos: Record<string, string> = {
      tutor: f.tutor, tutor_telefon: f.tutor_telefon, autoritzacio_tutor: f.autoritzacio_tutor, drets_imatge: f.drets_imatge, notes: f.notes,
    };
    if (!esSoci) Object.assign(cos, { data_naixement: f.data_naixement, genere: f.genere });
    if (esExtern) Object.assign(cos, { nom_extern: f.nom_extern, telefon: f.telefon, email: f.email });
    try {
      await api.put(`/crm/activitats/${props.activitatId}/participants/${p.id}`, cos);
      avisa(t("Inscripció actualitzada."));
      props.onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={p.nom} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample apagat petit">
          {ESTATS_INSCRIPCIO[p.estat]} · {t("des del {0}", data(p.inscrit_el.slice(0, 10)))}
          {esSoci && ` · ${t("Les dades personals es canvien a la fitxa del soci.")}`}
        </p>
        {esExtern && (
          <Camp etiqueta={t("Nom i llinatges")} ample>
            <input value={f.nom_extern} onChange={set('nom_extern')} required />
          </Camp>
        )}
        {!esSoci && (
          <>
            <Camp etiqueta={t("Data de naixement")}>
              <input type="date" value={f.data_naixement} onChange={set('data_naixement')} />
            </Camp>
            <Camp etiqueta={t("Gènere")}>
              <select value={f.genere} onChange={set('genere')}>
                <option value="">—</option>
                {Object.entries(GENERES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Camp>
          </>
        )}
        {esExtern && (
          <>
            <Camp etiqueta={t("Telèfon")}>
              <input type="tel" value={f.telefon} onChange={set('telefon')} />
            </Camp>
            <Camp etiqueta={t("Correu electrònic")}>
              <input type="email" value={f.email} onChange={set('email')} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Pare, mare o tutor/a")}>
          <input value={f.tutor} onChange={set('tutor')} />
        </Camp>
        <Camp etiqueta={t("Telèfon del tutor/a")}>
          <input type="tel" value={f.tutor_telefon} onChange={set('tutor_telefon')} />
        </Camp>
        <Camp etiqueta={t("Autorització signada el")}>
          <input type="date" value={f.autoritzacio_tutor} onChange={set('autoritzacio_tutor')} />
        </Camp>
        <Camp etiqueta={t("Drets d'imatge en aquesta activitat")}>
          <select value={f.drets_imatge} onChange={set('drets_imatge')}>
            <option value="">{t("No consta")}</option>
            <option value="1">{t("Sí, autoritza l'ús de la imatge")}</option>
            <option value="0">{t("No l'autoritza")}</option>
          </select>
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        <div className="formulari-peu camp-ample">
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
